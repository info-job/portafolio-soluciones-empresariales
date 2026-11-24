
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Property } from '../types';
import { 
  FileUp, Table, CheckCircle2, AlertTriangle, Loader2, 
  Save, X, Database, Search, ArrowRight, ArrowLeft, RefreshCw,
  Building2, DollarSign, Download, Info, List, Sparkles, FileSpreadsheet
} from 'lucide-react';
import { mapPropertyExcelHeaders } from '../geminiService';
import { useNotification } from './NotificationProvider';
import * as XLSX from 'xlsx';
import { downloadPropertyTemplate } from '../lib/excelTemplate';
import { MappingMemory } from '../lib/mappingMemory';
import { calculateSurchargeByOwner, formatCLP } from '../lib/chileanUtils';

interface PropertyImportModuleProps {
  existingProperties: Property[];
  onSync: (newProperties: Omit<Property, 'id'>[], updatedProperties: Property[], isRebuild: boolean) => void | Promise<void>;
  onSaveDraft?: (draft: { fileName: string; sheetName: string; headers: string[]; rows: any[][]; mapping: Record<string, string> }) => Promise<void>;
  onClose: () => void;
  initialDraft?: any;
}

const PropertyImportModule: React.FC<PropertyImportModuleProps> = ({ existingProperties, onSync, onSaveDraft, onClose, initialDraft }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiMapping, setIsAiMapping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [view, setView] = useState<'UPLOAD' | 'MAPPING' | 'PREVIEW' | 'RAW_DATA'>('UPLOAD');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<any[][]>([]);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [currentSheetName, setCurrentSheetName] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [workbook, setWorkbook] = useState<any>(null);
  const [isRebuildMode, setIsRebuildMode] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [syncStats, setSyncStats] = useState<{ new: number; update: number; errors: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [rawSearch, setRawSearch] = useState('');
  const { notify, dismiss } = useNotification();
  const [isDragging, setIsDragging] = useState(false);
  const [previewSubTab, setPreviewSubTab] = useState<'TABLE' | 'SURCHARGES'>('TABLE');
  const [utaOverride, setUtaOverride] = useState<number>(800000);
  const [uploadSubTab, setUploadSubTab] = useState<'FILE' | 'PASTE'>('FILE');
  const [pastedText, setPastedText] = useState<string>('');
  const [mappingViewMode, setMappingViewMode] = useState<'LIST' | 'GRID'>('LIST');
  const [editingCell, setEditingCell] = useState<{ rIdx: number; cIdx: number } | null>(null);
  const [tempCellValue, setTempCellValue] = useState<string>('');
  const [gridSearch, setGridSearch] = useState<string>('');

  // Foolproof validation helper under "Simplicidad Radical"
  const getCellValidationError = (mapField: string, cellValue: any) => {
    if (!mapField) return null;
    const strVal = String(cellValue === undefined || cellValue === null ? '' : cellValue).trim();
    
    if (['code', 'building'].includes(mapField)) {
      if (strVal === '') {
        return { type: 'ERROR', message: `Falta ${mapField === 'code' ? 'Código / Unidad' : 'Edificio / Proyecto'}` };
      }
    }
    
    if (['appraisalValue', 'rentalAmount', 'acquisitionCostCLP', 'acquisitionCostUF'].includes(mapField)) {
      if (strVal !== '') {
        // Remove CLP / sign characters and check if valid number
        const cleaned = strVal.replace(/[$\s.]/g, '').replace(/,/g, '.');
        const numVal = Number(cleaned);
        if (isNaN(numVal)) {
          return { type: 'WARNING', message: 'No es un número válido' };
        }
      }
    }
    
    if (mapField === 'propertyRole') {
      if (strVal !== '') {
        const rolRegex = /^\d+\s*-\s*\d+$/;
        if (!rolRegex.test(strVal)) {
          return { type: 'WARNING', message: 'Formato ROL sugerido: XXX-YY (ej: 1234-5)' };
        }
      }
    }
    
    return null;
  };

  useEffect(() => {
    if (initialDraft) {
      setFileName(initialDraft.fileName || '');
      setCurrentSheetName(initialDraft.sheetName || '');
      setExcelHeaders(initialDraft.headers || []);
      setExcelRows(initialDraft.rows || []);
      setMapping(initialDraft.mapping || {});
      setView('RAW_DATA');
    }
  }, [initialDraft]);

  const filteredRows = useMemo(() => {
    if (!rawSearch) return excelRows;
    const search = rawSearch.toLowerCase();
    return excelRows.filter(row => 
      row.some(cell => String(cell).toLowerCase().includes(search))
    );
  }, [excelRows, rawSearch]);

  const gridFilteredRows = useMemo(() => {
    if (!gridSearch) return excelRows;
    const search = gridSearch.toLowerCase();
    return excelRows.filter(row => 
      row.some(cell => String(cell).toLowerCase().includes(search))
    );
  }, [excelRows, gridSearch]);

  const computedSurcharges = useMemo(() => {
    if (importPreview.length === 0) return {};
    return calculateSurchargeByOwner(importPreview.map((d, index) => ({
      id: d.id || `temp-${index}`,
      code: d.code || '',
      building: d.building || '',
      owner: d.owner || 'SIN PROPIETARIO',
      appraisalValue: d.appraisalValue || 0
    })), utaOverride);
  }, [importPreview, utaOverride]);

  const MAPPABLE_FIELDS = [
    { id: 'building', label: 'Edificio / Proyecto' },
    { id: 'code', label: 'Código / Unidad' },
    { id: 'floor', label: 'Piso' },
    { id: 'address', label: 'Dirección' },
    { id: 'commune', label: 'Comuna' },
    { id: 'type', label: 'Tipo de Inmueble' },
    { id: 'owner', label: 'Propietario' },
    { id: 'surfaceAreaLand', label: 'Superficie Terreno' },
    { id: 'surfaceAreaBuilt', label: 'Superficie Construida' },
    { id: 'constructionYear', label: 'Año Construcción' },
    { id: 'destination', label: 'Destino' },
    { id: 'useType', label: 'Uso' },
    { id: 'propertyRole', label: 'ROL Propiedad' },
    { id: 'appraisalValue', label: 'Valor Tasación' },
    { id: 'lastAppraisalDate', label: 'Fecha Tasación / Emisión' },
    { id: 'rentalAmount', label: 'Canon Arriendo' },
    { id: 'acquisitionCostCLP', label: 'Costo Adquisición (CLP)' },
    { id: 'acquisitionCostUF', label: 'Costo Adquisición (UF)' },
    { id: 'acquisitionDate', label: 'Fecha de Adquisición' },
    { id: 'usefulLifeMonths', label: 'Vida Útil (Meses)' },
    { id: 'residualValueCLP', label: 'Valor Residual (CLP)' },
    { id: 'accumulatedDepreciationCLP', label: 'Depreciación Acumulada' },
    { id: 'insurancePolicyNumber', label: 'Nº Póliza Seguro' },
    { id: 'insuranceCompany', label: 'Compañía Seguro' },
    { id: 'insuranceCoverageAmount', label: 'Monto Cobertura' },
    { id: 'insuranceStartDate', label: 'Inicio Vigencia Seguro' },
    { id: 'insuranceEndDate', label: 'Fin Vigencia Seguro' },
  ];

  const validatePropertyConsistency = (p: any): string[] => {
    const errors: string[] = [];
    const type = p.type || '';
    const address = (p.address || '').toUpperCase();
    const building = (p.building || '').toUpperCase();
    const code = (p.code || '').toUpperCase();

    const fullText = `${building} ${address} ${code}`;

    if (type === 'OFICINA' && (fullText.includes('BOD') || fullText.includes('BODEGA'))) {
      errors.push('Inconsistencia: El tipo es OFICINA pero la descripción indica BODEGA');
    }
    if (type === 'BODEGA' && (fullText.includes('OFI') || fullText.includes('OFICINA'))) {
      errors.push('Inconsistencia: El tipo es BODEGA pero la descripción indica OFICINA');
    }
    
    return errors;
  };

  const excelDateToISO = (val: any): string => {
    if (!val) return '';
    
    // If it's already a string that looks like ISO, return it
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      return val.split('T')[0];
    }

    if (val instanceof Date) return val.toISOString().split('T')[0];
    
    // Check if it's a number (Excel serial date)
    const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 20000 && num < 100000) {
      // Excel serial dates are days since 1899-12-30
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // If it's a string that looks like DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    if (typeof val === 'string') {
      const cleaned = val.trim().replace(/\s+/g, ' ');
      // Handle cases like "23 de Abril 2023" using simple regex if possible, 
      // but let's stick to numeric ones first.
      const parts = cleaned.split(/[/\-.]/);
      if (parts.length === 3) {
        let d, m, y;
        
        if (parts[0].length === 4) {
          y = parts[0];
          m = parts[1].padStart(2, '0');
          d = parts[2].padStart(2, '0');
        } else {
          d = parts[0].padStart(2, '0');
          m = parts[1].padStart(2, '0');
          y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        }
        
        if (parseInt(d) > 0 && parseInt(d) <= 31 && parseInt(m) > 0 && parseInt(m) <= 12 && y.length === 4) {
          return `${y}-${m}-${d}`;
        }
      }
    }

    return String(val);
  };

  const cleanNumeric = (val: any, field?: string): number => {
    if (val === undefined || val === null || val === '') return 0;
    
    // If it's already a number, return it
    if (typeof val === 'number') return val;

    // Chilean specific: often use '.' as thousands and ',' as decimal.
    // Example: "1.250.000,50" -> "1250000.50"
    // But some systems use '.' for decimal.
    
    let strVal = String(val).trim().replace(/[^\d,.-]/g, '');
    
    // Heuristic: if there's a comma near the end (2 digits after), it's likely a decimal comma.
    // If there's multiple dots, they are definitely thousand separators.
    const dotCount = (strVal.match(/\./g) || []).length;
    const commaCount = (strVal.match(/,/g) || []).length;

    if (commaCount === 1 && dotCount >= 1) {
      // Format like 1.250.000,50
      strVal = strVal.replace(/\./g, '').replace(',', '.');
    } else if (commaCount === 1 && dotCount === 0) {
      // Format like 1250000,50
      strVal = strVal.replace(',', '.');
    } else if (dotCount > 1) {
      // Format like 1.250.000
      strVal = strVal.replace(/\./g, '');
    }
    // If only one dot, it might be decimal or thousands. 
    // Usually in Chilean accounting, if it's a large number, it's thousands.
    else if (dotCount === 1 && strVal.split('.')[1].length === 3) {
      // Likely 1.250
      strVal = strVal.replace('.', '');
    }

    let num = parseFloat(strVal);
    if (isNaN(num)) return 0;
    
    return num;
  };

  const formatCellValue = (val: any): string => {
    if (val === undefined || val === null || val === '') return '-';
    if (val instanceof Date) return val.toLocaleDateString();
    
    const num = typeof val === 'number' ? val : Number(val);
    if (!isNaN(num) && num > 30000 && num < 60000 && String(val).length >= 5) {
       // Likely an Excel date serial
       const date = new Date(Math.round((num - 25569) * 86400 * 1000));
       if (!isNaN(date.getTime())) return date.toLocaleDateString();
    }
    
    return String(val);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setProgress(10);
    const loadingId = notify(`Procesando archivo: ${file.name}...`, 'loading', 0);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setProgress(25);
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        setAvailableSheets(wb.SheetNames);
        
        // Try to find a sheet that looks like it contains property/rental data
        let wsname = wb.SheetNames.find((n: string) => 
          n.toLowerCase().includes('arriendo') || 
          n.toLowerCase().includes('propiedad') || 
          n.toLowerCase().includes('activo') ||
          n.toLowerCase().includes('unidad') ||
          n.toLowerCase().includes('base') ||
          n.toLowerCase().includes('maestro') ||
          n.toLowerCase().includes('lista')
        );
        
        // Fallback to the first sheet if no matching name is found
        if (!wsname && wb.SheetNames.length > 0) {
          // Try to find the first sheet that actually has data (rows > 1)
          for (const name of wb.SheetNames) {
            const sheet = wb.Sheets[name];
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
            if (range.e.r > 0) {
              wsname = name;
              break;
            }
          }
          
          if (!wsname) wsname = wb.SheetNames[0];
          console.log(`No se encontró hoja por palabras clave, usando: ${wsname}`);
        }
        
        if (!wsname) {
          throw new Error("El archivo Excel no contiene ninguna hoja con datos válidos.");
        }

        setCurrentSheetName(wsname);
        await processSheet(wb, wsname);
        dismiss(loadingId);
        notify("Excel cargado correctamente", 'success');
      } catch (err) {
        console.error(err);
        dismiss(loadingId);
        notify(err instanceof Error ? err.message : "Error al procesar el archivo Excel.", 'error');
        setIsProcessing(false);
        setProgress(0);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      dismiss(loadingId);
      notify("Error al leer el archivo", 'error');
      setIsProcessing(false);
      setProgress(0);
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePastedText = async () => {
    if (!pastedText.trim()) {
      notify("Por favor, pegue datos válidos desde Excel antes de continuar.", 'error');
      return;
    }

    setFileName("Pegado_Directo_Excel.txt");
    setIsProcessing(true);
    setProgress(15);
    const loadingId = notify("Procesando datos pegados de Excel...", 'loading', 0);

    try {
      // Split pasted text into lines and cells
      const lines = pastedText.split(/\r?\n/);
      const rows = lines
        .map(line => {
          if (line.includes('\t')) {
            return line.split('\t').map(cell => cell.trim());
          }
          if (line.includes('  ')) {
            return line.split(/ {2,}/).map(cell => cell.trim());
          }
          return [line.trim()];
        })
        .filter(row => row.length > 0 && row.some(cell => cell !== ''));

      if (rows.length === 0) {
        throw new Error("No se pudo detectar ninguna fila o columna en el texto pegado.");
      }

      setProgress(40);
      
      // Convert Array of Arrays (AOA) to a worksheet
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Datos Pegados');

      setWorkbook(wb);
      setAvailableSheets(['Datos Pegados']);
      setCurrentSheetName('Datos Pegados');

      // Now process this just like a loaded sheet
      setProgress(50);
      await processSheet(wb, 'Datos Pegados');
      
      dismiss(loadingId);
      notify("Datos pegados importados exitosamente. Configure el mapeo de columnas.", 'success');
    } catch (err) {
      console.error(err);
      dismiss(loadingId);
      notify(err instanceof Error ? err.message : "Error al procesar los datos pegados.", 'error');
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const hasRequiredMapping = useMemo(() => {
    const mappedFields = Object.values(mapping);
    return mappedFields.includes('building') && mappedFields.includes('code');
  }, [mapping]);

  const runSmartMapping = async (headers: string[]) => {
    try {
      setIsAiMapping(true);
      
      // Use a strict 6-second timeout to prevent background threads/API calls from hanging forever
      const mappingPromise = mapPropertyExcelHeaders(headers);
      const timeoutPromise = new Promise<Record<string, string>>((_, reject) => 
        setTimeout(() => reject(new Error("AI mapping timeout")), 6000)
      );
      
      const aiMapping = await Promise.race([mappingPromise, timeoutPromise]);
      if (aiMapping && Object.keys(aiMapping).length > 0) {
        setMapping(prev => ({ ...prev, ...aiMapping }));
        notify("Asistente IA: Sugerencias de columnas aplicadas correctamente.", 'success');
      }
    } catch (e) {
      console.warn("Mapeo por Inteligencia Artificial omitido o agotó el tiempo de espera:", e);
    } finally {
      setIsAiMapping(false);
    }
  };

  const processSheet = async (wb: any, wsname: string) => {
    try {
      setIsProcessing(true);
      setProgress(30);
      const ws = wb.Sheets[wsname];
      // Use raw: false to get formatted strings for dates/numbers if possible, 
      // but we'll handle cleaning ourselves anyway.
      const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
      
      if (jsonData.length === 0) {
        throw new Error(`La hoja '${wsname}' está vacía.`);
      }

      // Find the first row that looks like a header row
      // A header row usually has multiple strings and at least one property-related keyword
      const propertyKeywords = [
        'edificio', 'unidad', 'depto', 'código', 'codigo', 'dirección', 'direccion', 
        'rol', 'canon', 'renta', 'monto', 'propietario', 'dueño', 'comuna', 'piso',
        'superficie', 'terreno', 'construido', 'tasación', 'avalúo', 'n°', 'nro',
        'folio', 'manzana', 'lote', 'sector', 'valor', 'precio', 'uf', 'clp',
        'proyecto', 'torre', 'póliza', 'poliza', 'aseguradora', 'vigencia'
      ];
      
      let headerRowIndex = -1;
      let maxKeywordMatches = 0;
      
      // Scan first 150 rows for headers and pick the one with most matches
      for (let i = 0; i < Math.min(jsonData.length, 150); i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length < 2) continue;
        
        const rowText = row.map(c => String(c || '').toLowerCase()).join(' ');
        const keywordMatches = propertyKeywords.filter(k => rowText.includes(k)).length;
        
        // A header row usually has many strings and few numbers
        const stringCells = row.filter(c => typeof c === 'string' && c.trim().length > 1).length;
        const numberCells = row.filter(c => typeof c === 'number').length;
        
        if (keywordMatches > maxKeywordMatches && keywordMatches >= 2 && stringCells > numberCells) {
          maxKeywordMatches = keywordMatches;
          headerRowIndex = i;
        }
      }

      // Fallback: first row with at least 3 non-empty cells if no keywords found
      if (headerRowIndex === -1) {
        for (let i = 0; i < Math.min(jsonData.length, 50); i++) {
          const row = jsonData[i] as any[];
          if (row && row.filter(cell => String(cell).trim() !== '').length >= 3) {
            headerRowIndex = i;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        throw new Error(`No se pudo identificar una fila de encabezados válida en la hoja '${wsname}'.`);
      }

      setProgress(40);
      
      // Get headers and handle empty cells between headers
      const rawHeaders = jsonData[headerRowIndex] as any[];
      const headers: string[] = [];
      const headerIndices: number[] = [];
      
      rawHeaders.forEach((h, idx) => {
        const headerStr = String(h || '').trim();
        if (headerStr !== '') {
          headers.push(headerStr);
          headerIndices.push(idx);
        }
      });

      // Filter rows to only include columns that have headers
      const rows = jsonData.slice(headerRowIndex + 1).map(row => {
        return headerIndices.map(idx => row[idx] === undefined ? '' : row[idx]);
      }) as any[][];

      if (rows.length === 0) {
        throw new Error("No se encontraron registros de datos después de la fila de encabezados.");
      }

      // Initial heuristic mapping + Memory
      let initialMapping: Record<string, string> = {};
      headers.forEach(h => {
        // 1. Check Memory first (Machine Learning)
        const rememberedField = MappingMemory.getMapping(h);
        if (rememberedField) {
          initialMapping[h] = rememberedField;
          return;
        }

        // 2. Fallback to heuristics
        const lowerH = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents
        if (lowerH.includes('edificio') || lowerH.includes('proyecto') || lowerH.includes('torre') || lowerH.includes('comunidad') || lowerH.includes('condominio') || lowerH.includes('inmueble')) initialMapping[h] = 'building';
        else if (lowerH.includes('codigo') || lowerH.includes('unidad') || lowerH.includes('depto') || lowerH.includes('nro') || lowerH === 'n' || lowerH === 'no' || lowerH.includes('numero')) initialMapping[h] = 'code';
        else if (lowerH.includes('direccion') || lowerH.includes('calle') || lowerH.includes('ubicacion')) initialMapping[h] = 'address';
        else if (lowerH.includes('comuna') || lowerH.includes('localidad') || lowerH.includes('sector')) initialMapping[h] = 'commune';
        else if (lowerH.includes('rol') || lowerH.includes('folio') || lowerH.includes('manzana')) initialMapping[h] = 'propertyRole';
        else if (lowerH.includes('canon') || lowerH.includes('renta') || lowerH.includes('arriendo')) initialMapping[h] = 'rentalAmount';
        else if (lowerH.includes('propietario') || lowerH.includes('dueno') || lowerH.includes('titular') || lowerH.includes('dueño')) initialMapping[h] = 'owner';
        else if (lowerH.includes('tipo') || lowerH.includes('categoria')) initialMapping[h] = 'type';
        else if (lowerH.includes('destino')) initialMapping[h] = 'destination';
        else if (lowerH.includes('uso')) initialMapping[h] = 'useType';
        else if (lowerH.includes('piso') || lowerH.includes('nivel')) initialMapping[h] = 'floor';
        else if (lowerH.includes('terreno') || lowerH.includes('sitio')) initialMapping[h] = 'surfaceAreaLand';
        else if (lowerH.includes('construido') || lowerH.includes('util') || (lowerH.includes('superficie') && !lowerH.includes('terreno'))) initialMapping[h] = 'surfaceAreaBuilt';
        else if (lowerH.includes('año') || lowerH.includes('construccion')) initialMapping[h] = 'constructionYear';
        else if (lowerH.includes('tasacion') || lowerH.includes('avaluo') || lowerH.includes('valor comercial')) {
          if (lowerH.includes('fecha') || lowerH.includes('emision')) initialMapping[h] = 'lastAppraisalDate';
          else initialMapping[h] = 'appraisalValue';
        }
        else if (lowerH.includes('poliza') || lowerH.includes('seguro')) initialMapping[h] = 'insurancePolicyNumber';
        else if (lowerH.includes('compañia') || lowerH.includes('aseguradora')) initialMapping[h] = 'insuranceCompany';
        else if (lowerH.includes('inicio') && lowerH.includes('seguro')) initialMapping[h] = 'insuranceStartDate';
        else if (lowerH.includes('termino') && lowerH.includes('seguro')) initialMapping[h] = 'insuranceEndDate';
        else if (lowerH.includes('cobertura') || lowerH.includes('monto asegurado')) initialMapping[h] = 'insuranceCoverageAmount';
        else if (lowerH.includes('fecha') && (lowerH.includes('tasacion') || lowerH.includes('avaluo') || lowerH.includes('emision'))) initialMapping[h] = 'lastAppraisalDate';
        else if (lowerH.includes('poliza') || lowerH.includes('seguro')) initialMapping[h] = 'insurancePolicyNumber';
        else if (lowerH.includes('compania') || lowerH.includes('aseguradora')) initialMapping[h] = 'insuranceCompany';
        else if (lowerH.includes('emision') || lowerH.includes('inicio')) initialMapping[h] = 'insuranceStartDate';
        else if (lowerH.includes('vencimiento') || lowerH.includes('fin')) initialMapping[h] = 'insuranceEndDate';
        else if (lowerH.includes('prima') || lowerH.includes('cobertura')) initialMapping[h] = 'insuranceCoverageAmount';
      });

      // Run AI mapping in background to refine
      runSmartMapping(headers);

      setExcelHeaders(headers);
      setExcelRows(rows);
      setMapping(initialMapping);
      setView('RAW_DATA');
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error al procesar la hoja.", 'error');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    setIsProcessing(true);
    setProgress(10);
    const loadingId = notify("Guardando borrador...", 'loading', 0);
    try {
      const sanitizedRows = excelRows.map(row => 
        (row || []).map(cell => cell === undefined ? '' : cell)
      );
      await onSaveDraft({
        fileName,
        sheetName: currentSheetName,
        headers: excelHeaders,
        rows: sanitizedRows,
        mapping
      });
      dismiss(loadingId);
      notify("Borrador guardado correctamente", 'success');
    } catch (err) {
      console.error(err);
      dismiss(loadingId);
      
      const errMsg = err instanceof Error ? err.message : String(err);
      let errorCode = "ERP-0004_WRITE_FAIL";
      let errorTitle = "ERROR AL GUARDAR BORRADOR EN BASE DE DATOS CENTRAL";
      let errorCause = "No fue posible persistir el estado del borrador en la colección 'property_import_drafts'.";
      
      if (errMsg.toLowerCase().includes("permission") || errMsg.toLowerCase().includes("insufficient")) {
        errorCode = "ERP-011Y_PERM_DENIED";
        errorTitle = "PERMISOS INSUFICIENTES / RESTRICCIÓN DE ACCESO";
        errorCause = "La política de reglas de seguridad de nube (Firestore Rules) rechazó la operación de escritura.";
      } else if (errMsg.toLowerCase().includes("validation") || errMsg.toLowerCase().includes("rules") || errMsg.toLowerCase().includes("invalid")) {
        errorCode = "ERP-1082_SCHEMA_INVALID";
        errorTitle = "VALIDACIÓN DE ESQUEMA RECHAZADO";
        errorCause = "El objeto borrador estructurado no cumple con las directivas de integridad obligatorias.";
      }
      
      notify(
        `[CÓDIGO: ${errorCode}] ${errorTitle} - ${errorCause} (Detalle Técnico: ${errMsg})`,
        'error'
      );
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const processDataWithMapping = async (skipViewChange = false) => {
    setIsProcessing(true);
    setProgress(10);
    
    try {
      // Critical check: if mapping is empty or doesn't have building/code, we can't proceed
      const mappedFields = Object.values(mapping);
      if (!mappedFields.includes('building') || !mappedFields.includes('code')) {
        throw new Error("Debe mapear obligatoriamente las columnas de 'Edificio' y 'Unidad' para continuar.");
      }

      setProgress(30);
      
      // OPTIMIZATION: Create a lookup map for existing properties
      const existingMap = new Map<string, Property>();
      existingProperties.forEach(ep => {
        const key = `${(ep.building || '').toLowerCase()}|${(ep.code || '').toLowerCase()}`;
        existingMap.set(key, ep);
      });

      const mappedData: any[] = [];
      const chunkSize = 100;
      
      for (let i = 0; i < excelRows.length; i += chunkSize) {
        const chunk = excelRows.slice(i, i + chunkSize);
        
        const processedChunk = chunk.map(row => {
          const obj: any = {
            rawMetadata: {} // Container for preservation
          };
          
          excelHeaders.forEach((header, index) => {
            const field = mapping[header];
            const val = row[index] === undefined || row[index] === null ? '' : row[index];
            
            if (field) {
              // Handle numeric fields
              if (['surfaceAreaLand', 'surfaceAreaBuilt', 'constructionYear', 'appraisalValue', 'rentalAmount', 
                   'insuranceCoverageAmount', 'acquisitionCostCLP', 'acquisitionCostUF', 'usefulLifeMonths', 
                   'residualValueCLP', 'accumulatedDepreciationCLP'].includes(field)) {
                obj[field] = cleanNumeric(val, field);
              } else if (['lastAppraisalDate', 'insuranceStartDate', 'insuranceEndDate', 'acquisitionDate'].includes(field)) {
                // Handle date fields
                obj[field] = excelDateToISO(val);
              } else if (field === 'propertyRole') {
                // Handle Rol (Tax ID) - Clean dots and ensure format XXX-YYY
                let cleanRol = String(val).trim().replace(/\s/g, '');
                obj[field] = cleanRol;
              } else {
                obj[field] = String(val).trim();
              }
            } else {
              // PRESERVATION: Map unassigned columns to metadata
              // We use the header name as key
              const sanitizedKey = header.replace(/\./g, '_').replace(/\$/g, '');
              obj.rawMetadata[sanitizedKey] = val;
            }
          });
          
          // Cleanup rawMetadata if empty
          if (Object.keys(obj.rawMetadata).length === 0) {
            delete obj.rawMetadata;
          }
          
          // RECONSTRUCTION: If address is missing, try to build it
          if (!obj.address && obj.building && obj.code) {
            // Check if building already looks like an address (starts with number or has street indicators)
            const buildingUpper = obj.building.toUpperCase();
            const hasStreetIndicator = ['CALLE', 'AVENIDA', 'AV.', 'PASAJE', 'CAMINO'].some(ind => buildingUpper.includes(ind));
            const startsWithNumber = /^\d+/.test(obj.building);
            
            if (hasStreetIndicator || startsWithNumber) {
              obj.address = `${obj.building} # ${obj.code}`;
            } else {
              obj.address = `${obj.building}, ${obj.code}`;
            }
            
            if (!obj.validationErrors) obj.validationErrors = [];
            obj.validationErrors.push('Dirección reconstruida automáticamente');
          }

          // RECONSTRUCTION: If commune is missing, try to extract from address or building
          if (!obj.commune) {
            const communes = [
              'SANTIAGO', 'PROVIDENCIA', 'LAS CONDES', 'VITACURA', 'LO BARNECHEA', 'ÑUÑOA', 'LA REINA', 
              'MACUL', 'PEÑALOLÉN', 'LA FLORIDA', 'PUENTE ALTO', 'SAN BERNARDO', 'MAIPÚ', 'PUDAHUEL', 
              'QUILICURA', 'RECOLETA', 'INDEPENDENCIA', 'QUINTA NORMAL', 'CERRO NAVIA', 'LO PRADO', 
              'ESTACIÓN CENTRAL', 'CERRILLOS', 'PEDRO AGUIRRE CERDA', 'SAN MIGUEL', 'LA CISTERNA', 
              'EL BOSQUE', 'LO ESPEJO', 'SAN RAMÓN', 'LA GRANJA', 'CONCHALÍ', 'HUECHURABA', 'COLINA',
              'LAMPA', 'TILTIL', 'PIRQUE', 'SAN JOSÉ DE MAIPO', 'BUIN', 'PAINE', 'CALERA DE TANGO',
              'MELIPILLA', 'CURACAVÍ', 'MARÍA PINTO', 'SAN PEDRO', 'ALHUÉ', 'TALAGANTE', 'PEÑAFLOR',
              'ISLA DE MAIPO', 'EL MONTE', 'PADRE HURTADO'
            ];
            
            const searchIn = `${obj.address || ''} ${obj.building || ''} ${obj.commune || ''}`.toUpperCase();
            const found = communes.find(c => searchIn.includes(c));
            if (found) {
              obj.commune = found;
            }
          }

          // Nest insurance policy fields
          if (obj.insurancePolicyNumber || obj.insuranceCompany) {
            obj.insurancePolicy = {
              policyNumber: obj.insurancePolicyNumber || 'S/N',
              company: obj.insuranceCompany || 'GENÉRICA',
              startDate: obj.insuranceStartDate || new Date().toISOString().split('T')[0],
              endDate: obj.insuranceEndDate || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
              coverageAmount: obj.insuranceCoverageAmount || 0,
              status: 'VIGENTE'
            };
            // Clean up temporary fields
            delete obj.insurancePolicyNumber;
            delete obj.insuranceCompany;
            delete obj.insuranceStartDate;
            delete obj.insuranceEndDate;
            delete obj.insuranceCoverageAmount;
          }

          // Skip rows that are completely empty
          const isRowEmpty = Object.values(obj).every(v => v === '' || v === 0);
          if (isRowEmpty) return null;
          
          // Mark errors for missing critical data but DON'T skip
          if (!obj.code || !obj.building) {
            if (!obj.validationErrors) obj.validationErrors = [];
            obj.validationErrors.push('Falta Edificio o Unidad (Requerido para Sincronización)');
          }

          // RECONSTRUCTION: If type is missing, try to guess from building/code/address
          if (!obj.type && (obj.building || obj.code || obj.address)) {
            const fullText = `${obj.building || ''} ${obj.code || ''} ${obj.address || ''}`.toUpperCase();
            if (fullText.includes('BOD') || fullText.includes('ALMACEN')) obj.type = 'BODEGA';
            else if (fullText.includes('EST') || fullText.includes('PARK') || fullText.includes('COCHER')) obj.type = 'ESTACIONAMIENTO';
            else if (fullText.includes('LOC') || fullText.includes('TIENDA')) obj.type = 'LOCAL';
            else if (fullText.includes('OFI') || fullText.includes('DESPACHO')) obj.type = 'OFICINA';
            else if (fullText.includes('CASA') || fullText.includes('CHALET')) obj.type = 'CASA';
            else if (fullText.includes('DEP') || fullText.includes('APTO') || fullText.includes('UNIDAD')) obj.type = 'DEPARTAMENTO';
            else obj.type = 'DEPARTAMENTO';
            
            if (!obj.validationErrors) obj.validationErrors = [];
            obj.validationErrors.push('Tipo de inmueble inferido automáticamente');
          }

          // Type normalization
          if (obj.type) {
            const t = obj.type.toUpperCase();
            if (t.includes('DEP') || t.includes('APTO')) obj.type = 'DEPARTAMENTO';
            else if (t.includes('CAS')) obj.type = 'CASA';
            else if (t.includes('BOD') || t.includes('ALM')) obj.type = 'BODEGA';
            else if (t.includes('EST') || t.includes('PARK')) obj.type = 'ESTACIONAMIENTO';
            else if (t.includes('LOC')) obj.type = 'LOCAL';
            else if (t.includes('OFI')) obj.type = 'OFICINA';
            else obj.type = 'DEPARTAMENTO';
          } else {
            obj.type = 'DEPARTAMENTO';
          }

          // Destination normalization
          if (obj.destination) {
            const d = obj.destination.toUpperCase();
            if (d.includes('HAB') && !d.includes('NO')) obj.destination = 'HABITACIONAL';
            else if (d.includes('NO')) obj.destination = 'NO_HABITACIONAL';
            else obj.destination = 'HABITACIONAL';
          }

          // UseType normalization
          if (obj.useType) {
            const u = obj.useType.toUpperCase();
            if (u.includes('ARR')) obj.useType = 'ARRIENDO';
            else if (u.includes('PRO')) obj.useType = 'PROPIO';
            else if (u.includes('MIX')) obj.useType = 'MIXTO';
            else obj.useType = 'ARRIENDO';
          }

          // Consistency check
          const errors = validatePropertyConsistency(obj);
          if (errors.length > 0) {
            obj.validationErrors = errors;
          }

          // Optimized lookup using Map
          const buildingKey = (obj.building || '').toLowerCase().trim();
          const codeKey = (obj.code || '').toLowerCase().trim().replace(/^unidad\s+/i, '');
          const key = `${buildingKey}|${codeKey}`;
          const existing = existingMap.get(key);

          if (existing) {
            obj.isUpdate = true;
            obj.existingId = existing.id;
            obj.originalData = existing;
            
            // Check for changes to show in UI
            const changes: string[] = [];
            if (obj.rentalAmount !== undefined && obj.rentalAmount !== existing.rentalAmount) {
              changes.push(`Canon: $${existing.rentalAmount || 0} -> $${obj.rentalAmount}`);
            }
            if (obj.address && obj.address !== existing.address) {
              changes.push('Dirección actualizada');
            }
            obj.detectedChanges = changes;
          } else {
            obj.isNew = true;
          }

          return obj;
        }).filter(Boolean);

        mappedData.push(...processedChunk);
        
        // Update progress
        const currentProgress = 30 + Math.floor((i / excelRows.length) * 70);
        setProgress(currentProgress);
        
        // Yield to UI thread
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (mappedData.length === 0) {
        throw new Error(`No se encontraron registros válidos con Edificio y Unidad en la hoja seleccionada. Por favor, verifique el mapeo de columnas.`);
      }

      // INTEGRACIÓN: Calcular la sobretasa del impuesto territorial (Chile) en base a los datos a importar
      try {
        const surchargeResults = calculateSurchargeByOwner(mappedData.map((d, index) => ({
          id: d.id || `temp-${index}`,
          code: d.code || '',
          building: d.building || '',
          owner: d.owner || 'SIN PROPIETARIO',
          appraisalValue: d.appraisalValue || 0
        })));

        mappedData.forEach((d) => {
          const ownerName = d.owner?.trim() || 'SIN PROPIETARIO';
          const ownerCalc = surchargeResults[ownerName];
          if (ownerCalc) {
            const propAlloc = ownerCalc.allocatedProperties.find(ap => ap.propertyCode === d.code && ap.propertyBuilding === d.building);
            d.surchargeCalculated = {
              ownerTotalAppraisal: ownerCalc.totalAppraisal,
              surchargeBaseUTA: 800000,
              surchargeTotalAmount: ownerCalc.surchargeTotalAmount,
              proportionalSurcharge: propAlloc ? propAlloc.proportionalSurcharge : 0,
              calculatedAt: new Date().toISOString().split('T')[0],
              exceedsThreshold: ownerCalc.exceedsThreshold
            };
          }
        });
      } catch (e) {
        console.error("Error al pre-calcular sobretasas en la importación:", e);
      }

      setImportPreview(mappedData);
      const newCount = mappedData.filter(d => d.isNew && !d.validationErrors?.length).length;
      const updateCount = mappedData.filter(d => d.isUpdate && !d.validationErrors?.length).length;
      const errorCount = mappedData.filter(d => d.validationErrors?.length > 0).length;
      setSyncStats({ new: newCount, update: updateCount, errors: errorCount, total: mappedData.length });
      
      if (!skipViewChange) setView('PREVIEW');
      return mappedData;

    } catch (err) {
      console.error(err);
      notify(err instanceof Error ? err.message : "Error al procesar los datos.", 'error');
      return null;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleSync = async (previewData?: any[]) => {
    const dataToSync = previewData || importPreview;
    if (dataToSync.length === 0) return;

    // Save mappings to memory (Learning)
    MappingMemory.saveBulkMappings(mapping);

    setIsProcessing(true);
    setProgress(0);
    const loadingId = notify("Sincronizando con base de datos...", 'loading', 0);

    try {
      const newProps: Omit<Property, 'id'>[] = [];
      const updatedProps: Property[] = [];

      dataToSync.forEach(item => {
        const { isNew, isUpdate, existingId, originalData, detectedChanges, isRebuild, validationErrors, ...cleanData } = item;
        
        // Skip items with validation errors unless user explicitly wants them (not implemented here for safety)
        if (validationErrors?.length > 0) return;

        // ASIGNACIÓN DE SOBRETASA: Inyectar sobretasa calculada dinámicamente con el valor de UTA override actual
        const ownerName = cleanData.owner?.trim() || 'SIN PROPIETARIO';
        const ownerCalc = computedSurcharges[ownerName];
        if (ownerCalc) {
          const propAlloc = ownerCalc.allocatedProperties.find(ap => ap.propertyCode === cleanData.code && ap.propertyBuilding === cleanData.building);
          cleanData.surchargeCalculated = {
            ownerTotalAppraisal: ownerCalc.totalAppraisal,
            surchargeBaseUTA: utaOverride,
            surchargeTotalAmount: ownerCalc.surchargeTotalAmount,
            proportionalSurcharge: propAlloc ? propAlloc.proportionalSurcharge : 0,
            calculatedAt: new Date().toISOString().split('T')[0],
            exceedsThreshold: ownerCalc.exceedsThreshold
          };
        }

        // Group financial data if mapped
        const financialFields = [
          'acquisitionCostCLP', 'acquisitionCostUF', 'acquisitionDate', 
          'usefulLifeMonths', 'residualValueCLP', 'accumulatedDepreciationCLP'
        ];
        
        const hasFinancialData = financialFields.some(f => cleanData[f] !== undefined);
        if (hasFinancialData) {
          cleanData.financialData = {
            acquisitionCostCLP: cleanData.acquisitionCostCLP || 0,
            acquisitionCostUF: cleanData.acquisitionCostUF || 0,
            acquisitionDate: cleanData.acquisitionDate || '',
            usefulLifeMonths: cleanData.usefulLifeMonths || 0,
            residualValueCLP: cleanData.residualValueCLP || 0,
            accumulatedDepreciationCLP: cleanData.accumulatedDepreciationCLP || 0,
            currentBookValueCLP: (cleanData.acquisitionCostCLP || 0) - (cleanData.accumulatedDepreciationCLP || 0),
            ufAtAcquisition: 0 // Will need to be filled or imported
          };
          
          // Clean up temporary fields
          financialFields.forEach(f => delete cleanData[f]);
        }

        if (isRebuildMode || isNew) {
          newProps.push(cleanData as Omit<Property, 'id'>);
        } else if (isUpdate && existingId) {
          updatedProps.push({ ...originalData, ...cleanData, id: existingId });
        }
      });

      if (newProps.length === 0 && updatedProps.length === 0) {
        throw new Error("No hay datos válidos para sincronizar.");
      }

      await onSync(newProps, updatedProps, isRebuildMode);
      dismiss(loadingId);
      // Success notification is handled by parent or here? 
      // The parent currently has an alert. I'll let the parent handle the final success message but I'll add one here just in case.
      onClose();
    } catch (err) {
      console.error(err);
      dismiss(loadingId);
      notify("Error durante la sincronización", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickSync = async () => {
    const mappedFields = Object.values(mapping);
    const hasRequired = mappedFields.includes('building') && mappedFields.includes('code');
    
    if (!hasRequired) {
      notify("Faltan columnas obligatorias: Edificio y Unidad.", 'error');
      setView('MAPPING');
      return;
    }

    const confirmSync = window.confirm("¿Está seguro de que desea sincronizar los datos directamente? Se utilizará el mapeo automático detectado.");
    if (!confirmSync) return;

    // Save mappings to memory (Learning)
    MappingMemory.saveBulkMappings(mapping);

    const processedData = await processDataWithMapping(true);
    if (processedData) {
      await handleSync(processedData);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-6">
      <div className="bg-white rounded-[40px] w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* HEADER */}
        <div className="p-6 md:p-8 border-b border-slate-105 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 select-none">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-tr from-indigo-650 to-indigo-500 p-3.5 rounded-[22px] text-white shadow-xl shadow-indigo-100 flex-shrink-0 animate-pulse">
              <Database size={22} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Carga Inteligente de Activos</h3>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Área de Auditoría e Ingesta de Información
              </p>
            </div>
          </div>

          {/* DYNAMIC PROGRESS TIMELINE (RADICAL SIMPLICITY) */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {[
              { id: 'UPLOAD', label: '1. Carga' },
              { id: 'RAW_DATA', label: '2. Selección' },
              { id: 'MAPPING', label: '3. Mapeo y Edición' },
              { id: 'PREVIEW', label: '4. Sincronizar' }
            ].map((step, idx) => {
              const isActive = view === step.id;
              const isCompleted = ['UPLOAD', 'RAW_DATA', 'MAPPING', 'PREVIEW'].indexOf(view) > idx;
              const isDisabled = excelRows.length === 0 && step.id !== 'UPLOAD';

              return (
                <button
                  key={step.id}
                  disabled={isDisabled}
                  onClick={() => setView(step.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-black tracking-wider transition-all rounded-xl border flex-shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-102 font-black'
                      : isCompleted
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-150 hover:bg-emerald-100 font-bold'
                        : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50 font-medium'
                  }`}
                >
                  {isCompleted && <CheckCircle2 size={12} className="text-emerald-650" />}
                  {step.label}
                </button>
              );
            })}
          </div>

          <button onClick={onClose} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-full transition-all self-end md:self-auto shadow-sm">
            <X size={18} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {/* GLOBAL PROGRESS BAR */}
          {isProcessing && view !== 'UPLOAD' && (
            <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-white/80 backdrop-blur-sm border-b border-indigo-100 flex flex-col items-center justify-center animate-in slide-in-from-top">
              <div className="w-full max-w-2xl space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-indigo-600">
                  <span className="flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    {progress < 40 ? 'Procesando Excel' : progress < 70 ? 'Mapeando con IA' : 'Sincronizando con Base de Datos'}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-indigo-50 rounded-full overflow-hidden border border-indigo-100">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {view === 'UPLOAD' && (
            <div 
              className={`flex-1 overflow-y-auto flex flex-col items-center justify-start py-8 px-12 text-center relative transition-colors ${isDragging && uploadSubTab === 'FILE' ? 'bg-indigo-50/50' : ''}`}
              onDragOver={(e) => {
                if (uploadSubTab !== 'FILE') return;
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                if (uploadSubTab !== 'FILE') return;
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                  handleFileUpload(file);
                } else {
                  notify("Por favor use un archivo Excel válido (.xlsx, .xls)", 'error');
                }
              }}
            >
              {/* TABS SELECTOR FOR UPLOAD MODE */}
              {!isProcessing && (
                <div className="flex bg-slate-100 p-1.5 rounded-[20px] mb-8 select-none border border-slate-200/50 shadow-sm">
                  <button
                    onClick={() => setUploadSubTab('FILE')}
                    className={`px-6 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      uploadSubTab === 'FILE'
                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/20'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <FileUp size={14} />
                    Cargar Archivo Excel
                  </button>
                  <button
                    onClick={() => setUploadSubTab('PASTE')}
                    className={`px-6 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      uploadSubTab === 'PASTE'
                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/20'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <FileSpreadsheet size={14} />
                    Copiar y Pegar Celdas
                  </button>
                </div>
              )}

              {uploadSubTab === 'FILE' ? (
                <>
                  <div className={`w-28 h-28 bg-indigo-50 text-indigo-600 rounded-[40px] flex items-center justify-center mb-8 shadow-inner transition-transform ${isDragging ? 'scale-110' : ''} ${isProcessing ? 'animate-bounce' : ''}`}>
                    {isProcessing ? <Loader2 size={56} className="animate-spin" /> : <FileUp size={56} />}
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 uppercase mb-3 tracking-tighter">
                    {isProcessing ? 'Procesando Información' : 'Arrastre su Inventario Aquí'}
                  </h4>
                  <p className="text-sm text-slate-500 max-w-md mb-10 font-medium">
                    {isProcessing 
                      ? 'Nuestra IA está analizando los encabezados y preparando el mapeo inteligente...' 
                      : 'Suba su archivo .xlsx. El sistema buscará automáticamente la hoja con datos de activos y normalizará los campos de Edificio, Unidad, ROL y Canon.'}
                  </p>
                  
                  {isProcessing && (
                    <div className="w-full max-w-md space-y-3">
                      <div className="flex justify-between text-[11px] font-black uppercase text-indigo-600">
                        <span className="flex items-center gap-2">
                           <Loader2 size={12} className="animate-spin" />
                           {progress < 40 ? 'Leyendo Excel' : progress < 70 ? 'Mapeando con IA' : 'Validando Datos'}
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-3 w-full bg-indigo-50 rounded-full overflow-hidden border border-indigo-100 shadow-inner">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {!isProcessing && (
                    <div className="flex flex-col items-center gap-6">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-12 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm uppercase shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center gap-4 active:scale-95"
                      >
                        <Table size={24} />
                        Seleccionar Archivo Local
                      </button>
                      
                      <div className="flex items-center gap-8">
                        <button 
                          onClick={downloadPropertyTemplate}
                          className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase hover:text-indigo-600 transition-colors group"
                        >
                          <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                          Descargar Plantilla Maestra
                        </button>
                        <div className="w-[1px] h-4 bg-slate-200"></div>
                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-300 uppercase">
                           <Info size={16} />
                           Soporta .xlsx y .xls
                        </div>
                      </div>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls" className="hidden" />
                  
                  {isDragging && (
                    <div className="absolute inset-4 border-4 border-dashed border-indigo-200 rounded-[48px] pointer-events-none animate-pulse flex items-center justify-center bg-indigo-50/20">
                       <div className="bg-white px-8 py-4 rounded-3xl shadow-xl flex items-center gap-3">
                          <FileUp className="text-indigo-600" />
                          <span className="text-sm font-black text-indigo-600 uppercase">Suelta para cargar</span>
                       </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full max-w-4xl space-y-6 flex flex-col items-center">
                  <div className="text-center">
                    <h5 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Pegar Celdas desde Excel</h5>
                    <p className="text-xs text-slate-500 max-w-xl mx-auto">
                      Copie el rango de celdas directamente de su planilla Excel (puedes seleccionar y copiar las columnas completas incluyendo la fila de títulos/encabezados) y péguelas en el cuadro inferior. El sistema procesará las líneas de inmediato y lo guiará para mapear las columnas.
                    </p>
                  </div>
                  
                  {isProcessing ? (
                    <div className="w-full max-w-md py-12 space-y-3">
                      <div className="flex justify-between text-[11px] font-black uppercase text-indigo-600">
                        <span className="flex items-center gap-2">
                           <Loader2 size={12} className="animate-spin" />
                           {progress < 40 ? 'Procesando Texto' : progress < 70 ? 'Mapeando con IA' : 'Validando Datos'}
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-3 w-full bg-indigo-50 rounded-full overflow-hidden border border-indigo-100 shadow-inner">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Pegue aquí el contenido copiado de su planilla Excel..."
                        className="w-full h-64 p-5 bg-slate-50 border border-slate-200 rounded-[24px] font-mono text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner resize-none placeholder:text-slate-300"
                        id="excel-pasted-data-textarea"
                      />
                      
                      <div className="flex gap-4">
                        <button
                          onClick={handlePastedText}
                          disabled={!pastedText.trim() || isProcessing}
                          className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <Sparkles size={16} />
                          Procesar Datos Pegados ({pastedText.split('\n').filter(line => line.trim()).length} Líneas)
                        </button>
                        
                        {pastedText.trim() && (
                          <button
                            onClick={() => setPastedText('')}
                            className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[20px] font-black text-xs uppercase transition-all"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {view === 'RAW_DATA' && (
            <div className="flex-1 flex flex-col overflow-hidden p-8 animate-in slide-in-from-right-4">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-black text-slate-800 uppercase">Datos Brutos Detectados</h4>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Verificación completa de filas detectadas en la hoja: <span className="text-indigo-600">{currentSheetName}</span></p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView('UPLOAD')}
                    className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all"
                  >
                    Cargar Otro Archivo
                  </button>
                  <div className="bg-slate-100 px-4 py-2 rounded-xl flex items-center gap-2">
                    <List size={14} className="text-slate-500" />
                    <span className="text-[10px] font-black uppercase text-slate-600">{excelRows.length} Filas Detectadas</span>
                  </div>
                  {onSaveDraft && (
                    <button 
                      onClick={handleSaveDraft}
                      disabled={isProcessing}
                      className="px-6 py-3 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl font-black text-xs uppercase hover:bg-indigo-100 transition-all flex items-center gap-2"
                    >
                      <Database size={16} /> Guardar Borrador
                    </button>
                  )}
                  <button 
                    onClick={handleQuickSync}
                    className={`px-8 py-3 ${hasRequiredMapping ? 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700' : 'bg-slate-400 shadow-slate-200 hover:bg-slate-500'} text-white rounded-2xl font-black text-xs uppercase shadow-xl transition-all flex items-center gap-2`}
                  >
                    <Save size={16} /> {hasRequiredMapping ? 'Sincronizar Ahora' : 'Mapeo Incompleto'}
                  </button>
                  <button 
                    onClick={() => setView('MAPPING')}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    Siguiente: Mapear Columnas <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden border border-slate-100 rounded-3xl bg-slate-50/30">
                <div className="p-4 border-b border-slate-100 bg-white/50 flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Buscar en datos brutos..."
                      value={rawSearch}
                      onChange={(e) => setRawSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-indigo-500" />
                    <p className="text-[10px] font-black uppercase text-slate-400">
                      Mostrando {filteredRows.length} de {excelRows.length} filas • Haz clic en una fila para ver detalles
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-auto custom-audit-scroll">
                  <table className="w-full text-left border-collapse table-auto">
                    <thead className="sticky top-0 bg-white z-20 border-b border-slate-200 shadow-sm">
                      <tr>
                        <th className="sticky left-0 z-30 bg-white py-3 px-4 text-[9px] font-black uppercase text-slate-400 w-12 border-r border-b">#</th>
                        {excelHeaders.map((h, i) => (
                          <th key={i} className="py-3 px-6 text-[9px] font-black uppercase text-slate-500 border-r border-b min-w-[200px] whitespace-nowrap bg-slate-50/50">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row, rIdx) => (
                        <tr 
                          key={rIdx} 
                          className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                          onClick={() => setSelectedRowIndex(rIdx)}
                        >
                          <td className="sticky left-0 z-10 bg-slate-50 group-hover:bg-indigo-50 py-2 px-4 text-[9px] font-mono text-slate-400 border-r text-center">
                            {rIdx + 1}
                          </td>
                          {excelHeaders.map((_, cIdx) => (
                            <td key={cIdx} className="py-2 px-6 text-[10px] font-mono text-slate-600 border-r max-w-[400px] truncate">
                              {formatCellValue(row[cIdx])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'MAPPING' && (
            <div className="flex-1 flex flex-col overflow-hidden p-8 animate-in slide-in-from-right-4">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-black text-slate-800 uppercase">Confirmar Mapeo de Columnas</h4>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Hoja actual: <span className="text-indigo-600">{currentSheetName}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setView('RAW_DATA')}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase hover:bg-slate-50 transition-all"
                  >
                    Ver Datos Brutos
                  </button>
                  <button 
                    onClick={() => runSmartMapping(excelHeaders)}
                    disabled={isProcessing || isAiMapping}
                    className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl font-black text-[10px] uppercase hover:bg-indigo-100 transition-all flex items-center gap-2"
                  >
                    {isAiMapping ? (
                      <Loader2 size={12} className="animate-spin text-indigo-600" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    {isAiMapping ? 'Analizando...' : 'Sugerir Mapeo (IA)'}
                  </button>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Cambiar Hoja:</label>
                  <select 
                    value={currentSheetName}
                    onChange={(e) => {
                      setCurrentSheetName(e.target.value);
                      processSheet(workbook, e.target.value);
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase outline-none focus:border-indigo-500"
                  >
                    {availableSheets.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              
              {/* RADICAL SIMPLICITY: FOOLPROOF MANDATORY COLUMNS BANNER */}
              {!hasRequiredMapping && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-805 rounded-[20px] flex items-start gap-3.5 animate-pulse shadow-sm">
                  <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold leading-relaxed">
                    <p className="font-black uppercase text-amber-900 mb-1 flex items-center gap-1.5">
                      ⚠️ Atención Obligatoria (Evitar Errores de Sincronización)
                    </p>
                    Para poder sincronizar este inventario, debe mapear al menos las columnas obligatorias de 
                    <strong className="text-indigo-650"> Edificio / Proyecto</strong> y <strong className="text-indigo-650">Código / Unidad</strong>. 
                    Por favor, selecciónelos en la lista de abajo o en el encabezado de la planilla interactiva. Las columnas sin mapear serán ignoradas.
                  </div>
                </div>
              )}

              {/* SELECTOR DE VISTA DE MAPEO */}
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-200/60 rounded-2xl gap-3">
                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                  <button 
                    onClick={() => setMappingViewMode('LIST')}
                    className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 ${mappingViewMode === 'LIST' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-705'}`}
                  >
                    <List size={14} />
                    Lista de Columnas ({excelHeaders.length})
                  </button>
                  <button 
                    onClick={() => setMappingViewMode('GRID')}
                    className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 ${mappingViewMode === 'GRID' ? 'bg-white text-indigo-600 shadow-sm shadow-indigo-100' : 'text-slate-400 hover:text-slate-705'}`}
                  >
                    <Table size={14} />
                    Grid de Planilla Excel (Edición Directa)
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 justify-between sm:justify-end w-full sm:w-auto">
                  {mappingViewMode === 'GRID' && (
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Buscar en el grid..."
                        value={gridSearch}
                        onChange={(e) => setGridSearch(e.target.value)}
                        className="pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all w-48 font-sans"
                      />
                    </div>
                  )}
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Mapeadas: <span className="text-indigo-600 font-extrabold">{Object.values(mapping).filter(Boolean).length}</span> de <span className="font-extrabold">{excelHeaders.length}</span> columnas
                  </div>
                </div>
              </div>

              {/* CONTENEDOR SEGUN MODO SELECCIONADO */}
              {mappingViewMode === 'LIST' ? (
                <div className="flex-1 overflow-auto custom-audit-scroll border border-slate-100 rounded-3xl bg-slate-50/30">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400">Columna en Excel</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400">Ejemplo de Dato</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400 text-center w-16"></th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400">Campo en Sistema</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {excelHeaders.map((header, idx) => (
                        <tr key={idx} className="hover:bg-white transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-mono text-xs">
                                {String.fromCharCode(65 + (idx % 26))}
                              </div>
                              <span className="text-sm font-black text-slate-700 uppercase">{header}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              {excelRows.slice(0, 3).map((row, rIdx) => (
                                <span key={rIdx} className="text-[10px] font-mono text-slate-400 truncate max-w-[150px] block">
                                  {row[idx] || '-'}
                                </span>
                              ))}
                              {excelRows.length > 3 && <span className="text-[9px] text-slate-300 italic">... y {excelRows.length - 3} filas más</span>}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <ArrowRight size={16} className="text-slate-300 mx-auto" />
                          </td>
                          <td className="py-4 px-6">
                            <select 
                              value={mapping[header] || ''} 
                              onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                              className={`w-full bg-white border-2 rounded-xl px-4 py-2 text-xs font-bold uppercase transition-all outline-none ${
                                mapping[header] 
                                  ? 'border-indigo-100 text-indigo-600 focus:border-indigo-500' 
                                  : 'border-slate-100 text-slate-400 focus:border-slate-300'
                              }`}
                            >
                              <option value="">-- Ignorar Columna --</option>
                              {MAPPABLE_FIELDS.map(field => (
                                <option key={field.id} value={field.id}>
                                  {field.label} {['code', 'building'].includes(field.id) ? '*' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 overflow-auto custom-audit-scroll border border-slate-100 rounded-3xl bg-white/70 shadow-inner p-1">
                  <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl mb-4 flex items-start gap-3">
                    <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-700 uppercase">✨ Planilla Interactiva / Grid de Edición Directa</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-semibold mt-1 font-sans">
                        Mapea las columnas del excel en la fila superior. 
                        <strong> ¿Hay errores de tipeo en las filas?</strong> Haz clic en cualquier celda para corregirla en el momento antes de continuar con la revisión final.
                      </p>
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse table-fixed min-w-max">
                    <thead className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
                      {/* TR 1: MAPPING SELECTION */}
                      <tr>
                        <th className="sticky left-0 z-40 bg-slate-150 border-r border-b font-black text-[9px] uppercase text-slate-500 w-16 text-center py-2 bg-slate-100">
                          Mapeo
                        </th>
                        {excelHeaders.map((header, cIdx) => (
                          <th key={cIdx} className="p-3 border-r border-b bg-indigo-50/55 min-w-[220px] max-w-[220px]">
                            <select 
                              value={mapping[header] || ''} 
                              onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                              className={`w-full bg-white border-2 rounded-xl px-2 py-1.5 text-[10px] font-black uppercase transition-all outline-none ${
                                mapping[header] 
                                  ? 'border-indigo-300 text-indigo-700 focus:border-indigo-500' 
                                  : 'border-slate-200 text-slate-400 focus:border-slate-350'
                              }`}
                            >
                              <option value="">-- Ignorar Columna --</option>
                              {MAPPABLE_FIELDS.map(field => (
                                <option key={field.id} value={field.id}>
                                  {field.label} {['code', 'building'].includes(field.id) ? '*' : ''}
                                </option>
                              ))}
                            </select>
                          </th>
                        ))}
                      </tr>
                      {/* TR 2: COLUMN LETTER & EXCEL HEADER NAME */}
                      <tr>
                        <th className="sticky left-0 z-40 bg-slate-100 border-r py-3 px-4 text-[9px] font-black text-slate-550 text-center uppercase border-b shadow-sm">
                          Celda
                        </th>
                        {excelHeaders.map((header, cIdx) => {
                          const isMapped = !!mapping[header];
                          const mapField = mapping[header];
                          const isRequired = ['code', 'building'].includes(mapField);
                          return (
                            <th 
                              key={cIdx} 
                              className={`p-3 border-r border-b text-left min-w-[220px] max-w-[220px] shadow-inner font-sans ${
                                isMapped 
                                  ? isRequired 
                                    ? 'bg-blue-100/70 border-b-blue-300' 
                                    : 'bg-emerald-100/70 border-b-emerald-300'
                                  : 'bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`text-[9px] h-5 w-5 flex items-center justify-center font-mono rounded font-black border uppercase shadow-sm shrink-0 ${
                                    isMapped 
                                      ? isRequired ? 'bg-blue-600 text-white border-blue-600' : 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-slate-200 text-slate-600 border-slate-300'
                                  }`}>
                                    {String.fromCharCode(65 + (cIdx % 26))}
                                  </span>
                                  <span className="text-xs font-black text-slate-800 truncate uppercase" title={header}>{header}</span>
                                </div>
                                {isMapped && (
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    isRequired ? 'bg-blue-205 bg-blue-200 text-blue-900' : 'bg-emerald-205 bg-emerald-200 text-emerald-900'
                                  }`}>
                                    Mapeado
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {gridFilteredRows.map((row, rIdx) => {
                        const originalRowIdx = excelRows.indexOf(row);
                        return (
                          <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="sticky left-0 z-20 bg-slate-50 border-r py-2.5 px-4 text-[10px] font-mono text-slate-400 text-center font-black border-collapse">
                              {originalRowIdx + 1}
                            </td>
                            {excelHeaders.map((header, cIdx) => {
                              const isMapped = !!mapping[header];
                              const mapField = mapping[header];
                              const isRequired = ['code', 'building'].includes(mapField);
                              const cellValue = row[cIdx];
                              const isEditing = editingCell?.rIdx === originalRowIdx && editingCell?.cIdx === cIdx;

                              const cellError = isMapped ? getCellValidationError(mapField, cellValue) : null;
                              const cellBgClass = cellError
                                ? cellError.type === 'ERROR'
                                  ? 'bg-rose-50/40 hover:bg-rose-100/60 border-l-[3px] border-l-rose-500'
                                  : 'bg-amber-50/40 hover:bg-amber-100/60 border-l-[3px] border-l-amber-500'
                                : isMapped
                                  ? isRequired 
                                    ? 'bg-blue-50/15 group-hover:bg-blue-50/30' 
                                    : 'bg-emerald-50/15 group-hover:bg-emerald-50/30'
                                  : '';

                              return (
                                <td 
                                  key={cIdx} 
                                  className={`p-0 border-r min-w-[220px] max-w-[220px] truncate relative group transition-all duration-100 ${cellBgClass}`}
                                >
                                  {isEditing ? (
                                    <input 
                                      type="text"
                                      value={tempCellValue}
                                      onChange={(e) => setTempCellValue(e.target.value)}
                                      onBlur={() => {
                                        if (originalRowIdx !== -1) {
                                          const updatedRows = [...excelRows];
                                          updatedRows[originalRowIdx] = [...updatedRows[originalRowIdx]];
                                          updatedRows[originalRowIdx][cIdx] = tempCellValue;
                                          setExcelRows(updatedRows);
                                        }
                                        setEditingCell(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          if (originalRowIdx !== -1) {
                                            const updatedRows = [...excelRows];
                                            updatedRows[originalRowIdx] = [...updatedRows[originalRowIdx]];
                                            updatedRows[originalRowIdx][cIdx] = tempCellValue;
                                            setExcelRows(updatedRows);
                                          }
                                          setEditingCell(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingCell(null);
                                        }
                                      }}
                                      autoFocus
                                      className="w-full bg-yellow-50 border-2 border-amber-400 p-2 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-0 leading-none h-[38px] block"
                                    />
                                  ) : (
                                    <div 
                                      onClick={() => {
                                        setEditingCell({ rIdx: originalRowIdx, cIdx });
                                        setTempCellValue(String(cellValue === undefined || cellValue === null ? '' : cellValue));
                                      }}
                                      className={`w-full h-full px-4 py-2.5 font-mono text-[11px] ${cellError ? cellError.type === 'ERROR' ? 'text-rose-800 font-bold' : 'text-amber-800 font-bold' : 'text-slate-600'} truncate cursor-pointer hover:bg-yellow-50/40 relative group min-h-[38px] flex items-center justify-between gap-1`}
                                    >
                                      <span className="truncate flex-1" title={cellError?.message || undefined}>
                                        {cellValue === undefined || cellValue === null || String(cellValue).trim() === '' ? (
                                          <span className="opacity-25 italic text-[10px]">Vacío</span>
                                        ) : (
                                          String(cellValue)
                                        )}
                                      </span>
                                      
                                      {cellError ? (
                                        <span className={`text-[8px] font-black tracking-tighter uppercase px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                                          cellError.type === 'ERROR' ? 'bg-rose-200 text-rose-900 border border-rose-300' : 'bg-amber-200 text-amber-900 border border-amber-300'
                                        }`} title={cellError.message}>
                                          <AlertTriangle size={10} />
                                          {cellError.type === 'ERROR' ? 'Falta' : 'Revisar'}
                                        </span>
                                      ) : (
                                        <span className="opacity-0 group-hover:opacity-100 absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] bg-indigo-50 text-indigo-600 font-sans font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all">
                                          Editar
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-indigo-600">
                    <AlertTriangle size={20} />
                    <p className="text-[10px] font-black uppercase tracking-tight">
                      * Los campos marcados con asterisco son obligatorios para identificar la propiedad.
                    </p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group mt-2">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isRebuildMode}
                        onChange={(e) => setIsRebuildMode(e.target.checked)}
                      />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-rose-500 transition-all"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-all"></div>
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-rose-600 transition-colors">
                      Modo Reconstrucción Total (Sobrescribir Base de Datos Actual)
                    </span>
                  </label>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleQuickSync}
                    disabled={isProcessing || !hasRequiredMapping}
                    className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    <Save size={18} /> Sincronizar Ahora
                  </button>
                  <button 
                    onClick={() => processDataWithMapping()}
                    disabled={isProcessing || !hasRequiredMapping}
                    className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    Confirmar y Revisar
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'PREVIEW' && (
            <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4">
              <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                    {isRebuildMode ? 'Reconstrucción de Base Maestra' : 'Sincronización de Activos'}
                  </h4>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-1">
                    {isRebuildMode 
                      ? 'Se generará una nueva base de datos principal con los siguientes registros' 
                      : 'Revise los cambios detectados antes de actualizar la base de datos'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView('MAPPING')}
                    className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all"
                  >
                    Volver al Mapeo
                  </button>
                  <button 
                    onClick={handleSync}
                    className={`px-10 py-3 ${isRebuildMode ? 'bg-rose-600' : 'bg-emerald-600'} text-white rounded-2xl font-black text-xs uppercase shadow-xl transition-all flex items-center gap-2 hover:scale-105 active:scale-95`}
                  >
                    <RefreshCw size={18} /> {isRebuildMode ? 'Ejecutar Reconstrucción' : 'Sincronizar Ahora'}
                  </button>
                </div>
              </div>

              {/* STATS BAR */}
              <div className="px-8 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-black uppercase text-slate-600">{syncStats?.new} Nuevos Registros</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] font-black uppercase text-slate-600">{syncStats?.update} Actualizaciones</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <span className="text-[10px] font-black uppercase text-slate-600">{syncStats?.errors || 0} Errores/Alertas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  <span className="text-[10px] font-black uppercase text-slate-600">{syncStats?.total} Total Procesados</span>
                </div>
              </div>

              {syncStats?.errors > 0 && (
                <div className="mx-8 mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-700">
                  <AlertTriangle size={24} />
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">Atención: Se detectaron {syncStats.errors} registros con errores o información incompleta.</p>
                    <p className="text-[10px] font-bold uppercase opacity-80">Se procesarán todos los registros, pero se recomienda corregir los datos críticos después de la importación.</p>
                  </div>
                </div>
              )}

              {/* SUB-TABS */}
              <div className="mx-8 mt-6 border-b border-slate-200 flex items-center justify-between">
                <div className="flex gap-6">
                  <button 
                    onClick={() => setPreviewSubTab('TABLE')}
                    className={`pb-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${previewSubTab === 'TABLE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-655'}`}
                  >
                    Tabla de Activos ({importPreview.length})
                  </button>
                  <button 
                    onClick={() => setPreviewSubTab('SURCHARGES')}
                    className={`pb-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${previewSubTab === 'SURCHARGES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-655'}`}
                  >
                    <Sparkles size={14} className="animate-pulse text-indigo-600" />
                    Cálculo de Sobretasas Proyectadas (Impuesto Territorial)
                  </button>
                </div>
                <div className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                  * Integración con Ley de Impuesto Territorial N° 21.210
                </div>
              </div>

              {/* CONTENIDO SEGÚN SUB-TAB */}
              {previewSubTab === 'SURCHARGES' ? (
                <div className="flex-1 overflow-auto p-8 space-y-8 custom-audit-scroll bg-slate-50/40">
                  {/* TAX PARAMETERS AND EXPLANATION */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                      <div className="flex items-center gap-3 text-indigo-400">
                        <Sparkles size={20} className="animate-pulse" />
                        <h5 className="font-black text-xs uppercase tracking-wider">Parámetro de Simulación</h5>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Ajuste el valor de la UTA para proyección en tiempo real:</p>
                      
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase">Valor UTA (CLP)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">$</span>
                          <input 
                            type="number" 
                            value={utaOverride}
                            onChange={(e) => setUtaOverride(Number(e.target.value) || 0)}
                            className="w-full bg-slate-800 border border-slate-750 pl-8 pr-4 py-2 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-800 text-[9px] text-slate-400 font-bold uppercase leading-relaxed">
                        Límite Exento Actual (670 UTA): <span className="text-white font-mono">{formatCLP(670 * utaOverride)}</span>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-150 col-span-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 text-slate-700 mb-2">
                          <Info size={18} className="text-slate-400" />
                          <h5 className="font-black text-[11px] uppercase tracking-wider text-slate-800">Ley 21.210 Art. 7 bis — Impuesto Territorial Chileno</h5>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                          La sobretasa aplica a la suma de avalúos fiscales de propiedades acumuladas bajo un mismo RUT/Propietario. Es progresiva en tramos incrementales calculados en UTA.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                          <div className="text-[9px] font-black text-slate-400 uppercase">Tramo 1 (Exento)</div>
                          <div className="text-[10px] font-mono text-slate-500 font-bold mt-1">0 a 670 UTA</div>
                          <div className="text-xs font-black text-slate-700 mt-1">0.00%</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                          <div className="text-[9px] font-black text-blue-500 uppercase">Tramo 2</div>
                          <div className="text-[10px] font-mono text-slate-500 font-bold mt-1">670 a 1340 UTA</div>
                          <div className="text-xs font-black text-blue-600 mt-1">0.075%</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                          <div className="text-[9px] font-black text-amber-500 uppercase">Tramo 3</div>
                          <div className="text-[10px] font-mono text-slate-500 font-bold mt-1">1340 a 2010 UTA</div>
                          <div className="text-xs font-black text-amber-600 mt-1">0.150%</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                          <div className="text-[9px] font-black text-rose-500 uppercase">Tramo 4</div>
                          <div className="text-[10px] font-mono text-slate-500 font-bold mt-1">&gt; 2010 UTA</div>
                          <div className="text-xs font-black text-rose-600 mt-1">0.275%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PROPRIETARIOS ANALYSIS */}
                  <div className="space-y-4">
                    <h5 className="font-black text-sm uppercase text-slate-800 tracking-tight flex items-center gap-2">
                      <Building2 size={16} /> Consolidador por Propietario en el Archivo Excel
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.values(computedSurcharges).map((osc: any, oIdx) => (
                        <div key={oIdx} className={`bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col ${osc.exceedsThreshold ? 'border-rose-100 shadow-rose-50/50' : 'border-slate-150'}`}>
                          {/* Owner Card Header */}
                          <div className={`p-6 border-b flex items-start justify-between ${osc.exceedsThreshold ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50/50 border-slate-150'}`}>
                            <div>
                              <h6 className="font-black text-sm uppercase text-slate-800 leading-tight">{osc.owner}</h6>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{osc.propertyCount} Propiedades a importar</p>
                            </div>
                            {osc.exceedsThreshold ? (
                              <span className="px-3 py-1 bg-rose-100 text-rose-700 text-[9px] font-black uppercase rounded-full tracking-wide">
                                Excede Límite Exento (670 UTA)
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-full tracking-wide">
                                Exento de Sobretasa
                              </span>
                            )}
                          </div>
                          
                          {/* Owner Card Body (KPIs) */}
                          <div className="p-6 grid grid-cols-2 gap-4 border-b border-slate-100 bg-white">
                            <div>
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Avalúo Fiscal Acumulado</div>
                              <div className="text-lg font-black text-slate-850 mt-1 font-mono">{formatCLP(osc.totalAppraisal)}</div>
                              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tight mt-0.5">
                                Equivalente a {(osc.totalAppraisal / utaOverride).toFixed(1)} UTAs
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Sobretasa Total Estimada</div>
                              <div className={`text-lg font-black mt-1 font-mono ${osc.exceedsThreshold ? 'text-rose-600' : 'text-slate-400'}`}>
                                {formatCLP(osc.surchargeTotalAmount)}
                              </div>
                              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tight mt-0.5">
                                {osc.exceedsThreshold ? 'Cálculo marginal progresivo' : 'Bajo el mínimo gravado'}
                              </div>
                            </div>
                          </div>

                          {/* Owner Properties Proportional Breakdown */}
                          <div className={`p-6 flex-1 flex flex-col justify-between ${osc.exceedsThreshold ? 'bg-rose-50/20' : 'bg-slate-50/30'}`}>
                            <div className="space-y-3">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Desglose y Asignación Proporcional</p>
                              
                              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                {osc.allocatedProperties.map((ap: any, apIdx: number) => (
                                  <div key={apIdx} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                                    <div className="min-w-0 pr-2">
                                      <div className="text-[10px] font-black text-slate-800 uppercase leading-snug truncate">{ap.propertyBuilding} - Uni {ap.propertyCode}</div>
                                      <div className="text-[9px] font-mono text-slate-400 font-bold mt-0.5">Avalúo: {formatCLP(ap.appraisalValue)}</div>
                                    </div>
                                    <div className="text-right whitespace-nowrap shrink-0">
                                      <div className="text-[10px] font-mono font-black text-indigo-600">{(ap.proportionalShare * 100).toFixed(1)}% / canasta</div>
                                      <div className={`text-[10px] font-mono font-black ${osc.exceedsThreshold ? 'text-rose-600' : 'text-slate-400'}`}>
                                        +{formatCLP(ap.proportionalSurcharge)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* PREVIEW TABLE */
                <div className="flex-1 overflow-auto p-8 custom-audit-scroll">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b-2 border-slate-200">
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">Estado</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">Edificio</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">Unidad</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">Tipo</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">ROL</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">Canon Arriendo</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">Valor Tasación</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">Póliza Seguro</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">Comuna</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">Dirección</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">Errores/Alertas</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">Cambios Detectados</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreview.map((p, i) => (
                        <tr key={i} className={`hover:bg-slate-50/50 transition-colors ${p.validationErrors?.length ? 'bg-rose-50/30' : ''}`}>
                          <td className="py-3 px-4">
                            {p.validationErrors?.length ? (
                              <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[8px] font-black rounded-full uppercase flex items-center gap-1 w-fit">
                                <AlertTriangle size={8} /> Error
                              </span>
                            ) : p.isNew ? (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded-full uppercase">Nuevo</span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[8px] font-black rounded-full uppercase">Actualizar</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs font-black uppercase text-slate-700">{p.building || '-'}</td>
                          <td className="py-3 px-4 text-xs font-mono font-black text-indigo-600">{p.code || '-'}</td>
                          <td className="py-3 px-4 text-[10px] font-black uppercase text-slate-400">{p.type || '-'}</td>
                          <td className="py-3 px-4 text-xs font-mono font-black text-slate-500">{p.propertyRole || '-'}</td>
                          <td className="py-3 px-4 text-xs font-black text-emerald-700">
                            {p.rentalAmount ? `$${p.rentalAmount.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-xs font-black text-blue-700">
                            {p.appraisalValue ? `$${p.appraisalValue.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono font-black text-slate-500">
                            {p.insurancePolicy?.policyNumber || '-'}
                          </td>
                          <td className="py-3 px-4 text-[10px] font-bold uppercase text-slate-500">{p.commune || '-'}</td>
                          <td className="py-3 px-4 text-xs font-bold uppercase text-slate-600 truncate max-w-[150px]">{p.address || '-'}</td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {p.validationErrors && p.validationErrors.map((err: string, idx: number) => (
                                <div key={idx} className="text-[8px] font-bold text-rose-600 uppercase flex items-center gap-1">
                                  <AlertTriangle size={8} /> {err}
                                </div>
                              ))}
                              {!p.validationErrors?.length && (
                                <span className="text-[8px] font-bold text-emerald-600 uppercase italic">Válido</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {p.detectedChanges && p.detectedChanges.map((change: string, idx: number) => (
                                <div key={idx} className="text-[8px] font-bold text-blue-600 uppercase flex items-center gap-1">
                                  <RefreshCw size={8} /> {change}
                                </div>
                              ))}
                              {!p.detectedChanges?.length && !p.validationErrors?.length && p.isUpdate && (
                                <span className="text-[8px] font-bold text-slate-300 uppercase italic">Sin cambios</span>
                              )}
                              {p.isNew && (
                                <span className="text-[8px] font-bold text-emerald-600 uppercase italic">Registro Maestro</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-500">
            <RefreshCw size={18} className={isProcessing ? 'animate-spin' : ''} />
            <span className="text-[10px] font-black uppercase">
              {isProcessing ? 'Procesando información...' : importPreview.length > 0 ? 'Revise los datos antes de sincronizar' : 'Esperando archivo...'}
            </span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSync}
              disabled={importPreview.length === 0 || isProcessing}
              className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} /> Sincronizar Base de Datos
            </button>
          </div>
        </div>
        {/* ROW DETAILS MODAL */}
        {selectedRowIndex !== null && filteredRows[selectedRowIndex] && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <List size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase leading-tight">Detalles de Fila #{selectedRowIndex + 1}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Datos brutos extraídos del Excel</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={selectedRowIndex === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRowIndex(selectedRowIndex - 1);
                    }}
                    className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-30"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <button 
                    disabled={selectedRowIndex === filteredRows.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRowIndex(selectedRowIndex + 1);
                    }}
                    className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-30"
                  >
                    <ArrowRight size={20} />
                  </button>
                  <button 
                    onClick={() => setSelectedRowIndex(null)}
                    className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm ml-2"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-8 custom-audit-scroll">
                <div className="grid grid-cols-1 gap-3">
                  {excelHeaders.map((header, idx) => (
                    <div key={idx} className="group flex items-start gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 transition-all">
                      <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 font-mono text-[10px] shrink-0">
                        {String.fromCharCode(65 + (idx % 26))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 group-hover:text-indigo-500 transition-colors">{header}</p>
                        <p className="text-sm font-bold text-slate-700 break-words">
                          {filteredRows[selectedRowIndex][idx] !== undefined && filteredRows[selectedRowIndex][idx] !== null 
                            ? String(filteredRows[selectedRowIndex][idx]) 
                            : <span className="text-slate-300 italic">Vacío</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setSelectedRowIndex(null)}
                  className="px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all"
                >
                  Cerrar Detalles
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyImportModule;
