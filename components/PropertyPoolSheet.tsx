
import React, { useState, useMemo, useRef } from 'react';
import { Property } from '../types';
import { useResizableColumns } from '../lib/useResizableColumns';
import { 
  Building2, Search, Plus, Trash2, X, LayoutGrid, List, Filter, 
  ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Layers, FileUp, Database, CheckCircle2, AlertTriangle, 
  Loader2, ArrowRight, Table, Settings2, ShieldCheck, Save, Printer,
  Sparkles, Eye, FileSpreadsheet
} from 'lucide-react';
import { exportToExcel } from '../lib/excelExport';
import { mapPropertyExcelHeaders } from '../geminiService';
import { useNotification } from './NotificationProvider';
import PropertyImportModule from './PropertyImportModule';
import { MASTER_PROPERTIES_SEED } from '../lib/masterDataSeed';
import { calculateSurchargeByOwner, formatCLP } from '../lib/chileanUtils';
import { F980011DModal } from './F980011DModal';
import { DEFAULT_ASSETFLOW_SVG } from '../lib/defaultLogo';
import { printHtmlElement } from '../lib/printDocument';
import { PropertyFormModal } from './PropertyFormModal';
import { GridDimensionControls } from './common/GridDimensionControls';
import { JDEGridContextMenu } from './JDEGridContextMenu';

declare const XLSX: any;

interface PropertyPoolSheetProps {
  properties: Property[];
  onAdd: (p: Omit<Property, 'id'>) => void;
  onUpdate: (p: Property) => void | Promise<void>;
  onBulkAdd: (p: Omit<Property, 'id'>[]) => void | Promise<void>;
  onBulkUpdate: (p: Property[]) => void | Promise<void>;
  onRebuild: (p: Omit<Property, 'id'>[]) => void | Promise<void>;
  onDelete: (id: string) => void;
  onSaveDraft?: (draft: any) => Promise<string>;
  onSync?: () => Promise<void>;
  companyLogo: string | null;
  currentUser: string;
  autoOpenImport?: boolean;
}

const PropertyPoolSheet: React.FC<PropertyPoolSheetProps> = ({ properties, onAdd, onUpdate, onBulkAdd, onBulkUpdate, onRebuild, onDelete, onSaveDraft, onSync, companyLogo, currentUser, autoOpenImport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectTarget, setInspectTarget] = useState<Property | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isIntelligentImportOpen, setIsIntelligentImportOpen] = useState(false);
  const [isPreviewReportOpen, setIsPreviewReportOpen] = useState(false);
  const [viewingAppraisal, setViewingAppraisal] = useState<Property | null>(null);
  const appraisalInputRef = useRef<HTMLInputElement>(null);
  const [tempAppraisalFile, setTempAppraisalFile] = useState<{ url: string, name: string } | null>(null);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any | null>(null);
  const { notify } = useNotification();
  const [isSurchargeAuditOpen, setIsSurchargeAuditOpen] = useState(false);
  const [utaAuditValue, setUtaAuditValue] = useState(800000);
  const [isRebuilding, setIsRebuilding] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Visual Assist / Search & Select Master values lookup modal (UDC)
  const [activeLookupField, setActiveLookupField] = useState<'commune' | 'useType' | 'type' | 'destination' | null>(null);
  const [lookupSearchTerm, setLookupSearchTerm] = useState('');

  // Auto-open import if requested via prop
  React.useEffect(() => {
    if (autoOpenImport) {
      setIsIntelligentImportOpen(true);
    }
  }, [autoOpenImport]);

  const [gridContextMenu, setGridContextMenu] = useState<{ x: number; y: number; prop: Property } | null>(null);

  const { 
    widths, 
    onMouseDown, 
    onColumnDoubleClick,
    onRowMouseDown, 
    onRowDoubleClick, 
    getRowHeight, 
    defaultRowHeight, 
    setDefaultRowHeight, 
    resetWidths, 
    resetHeights, 
    resetAll 
  } = useResizableColumns({
    initialWidths: {
      building: 150,
      code: 100,
      address: 200,
      commune: 120,
      owner: 150,
      type: 100,
      landArea: 80,
      builtArea: 80,
      year: 80,
      dest: 100,
      use: 100,
      role: 120,
      rental: 120,
      value: 120,
      surcharge: 120,
      lastAppraisal: 120,
      status: 100,
      policy: 120,
      insCompany: 150,
      insVigency: 150,
    },
    initialRowHeight: 40,
    storageKey: 'property_pool_sheet'
  });

  const validatePropertyConsistency = (p: Partial<Property>): string[] => {
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
    if (type === 'ESTACIONAMIENTO' && (fullText.includes('DEP') || fullText.includes('DEPARTAMENTO'))) {
      errors.push('Inconsistencia: El tipo es ESTACIONAMIENTO pero la descripción indica DEPARTAMENTO');
    }
    if (type === 'DEPARTAMENTO' && (fullText.includes('EST') || fullText.includes('ESTACIONAMIENTO'))) {
      errors.push('Inconsistencia: El tipo es DEPARTAMENTO pero la descripción indica ESTACIONAMIENTO');
    }

    return errors;
  };

  const [viewMode, setViewMode] = useState<'LIST' | 'BUILDING'>('LIST');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('CENTENARIO');

  const reportFolio = useMemo(() => `REP-POOL-${Date.now()}`, [isPreviewReportOpen]);

  const buildings = useMemo(() => {
    const set = new Set(properties.map(p => p.building));
    return Array.from(set).sort();
  }, [properties]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    if (dateStr.includes('/')) return dateStr;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const [colSearchEdificio, setColSearchEdificio] = useState('');
  const [colSearchUnidad, setColSearchUnidad] = useState('');
  const [colSearchDireccion, setColSearchDireccion] = useState('');
  const [colSearchComuna, setColSearchComuna] = useState('');
  const [colSearchPropietario, setColSearchPropietario] = useState('');
  const [colSearchTipo, setColSearchTipo] = useState('');
  const [colSearchRol, setColSearchRol] = useState('');
  const [colSearchEstado, setColSearchEstado] = useState('');
  const [colSearchUso, setColSearchUso] = useState('');
  const [colSearchDestino, setColSearchDestino] = useState('');

  const filtered = useMemo(() => {
    return properties.filter(p => {
      // Global Search
      const matchesGlobal = !searchTerm || 
        p.address.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.building.toLowerCase().includes(searchTerm.toLowerCase());

      // ERP QBE Attribute searches
      const matchesEdificio = !colSearchEdificio || p.building.toLowerCase().includes(colSearchEdificio.toLowerCase());
      const matchesUnidad = !colSearchUnidad || p.code.toLowerCase().includes(colSearchUnidad.toLowerCase());
      const matchesDireccion = !colSearchDireccion || p.address.toLowerCase().includes(colSearchDireccion.toLowerCase());
      const matchesComuna = !colSearchComuna || (p.commune || '').toLowerCase().includes(colSearchComuna.toLowerCase());
      const matchesPropietario = !colSearchPropietario || (p.owner || '').toLowerCase().includes(colSearchPropietario.toLowerCase());
      const matchesTipo = !colSearchTipo || p.type.toLowerCase().includes(colSearchTipo.toLowerCase());
      const matchesRol = !colSearchRol || (p.propertyRole || '').toLowerCase().includes(colSearchRol.toLowerCase());
      const matchesEstado = !colSearchEstado || (p.status || '').toLowerCase().includes(colSearchEstado.toLowerCase());
      const matchesUso = !colSearchUso || (p.useType || '').toLowerCase().includes(colSearchUso.toLowerCase());
      const matchesDestino = !colSearchDestino || (p.destination || '').toLowerCase().includes(colSearchDestino.toLowerCase());

      return matchesGlobal && matchesEdificio && matchesUnidad && matchesDireccion && matchesComuna && matchesPropietario && matchesTipo && matchesRol && matchesEstado && matchesUso && matchesDestino;
    });
  }, [properties, searchTerm, colSearchEdificio, colSearchUnidad, colSearchDireccion, colSearchComuna, colSearchPropietario, colSearchTipo, colSearchRol, colSearchEstado, colSearchUso, colSearchDestino]);

  const paginatedFiltered = useMemo(() => {
    return filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(filtered.length / pageSize);
  }, [filtered, pageSize]);

  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, colSearchEdificio, colSearchUnidad, colSearchDireccion, colSearchComuna, colSearchPropietario, colSearchTipo, colSearchRol, colSearchEstado, colSearchUso, colSearchDestino, viewMode]);

  const groupedByFloor = useMemo(() => {
    if (viewMode !== 'BUILDING') return {};
    const buildingProps = properties.filter(p => p.building === selectedBuilding);
    const floors: Record<string, Property[]> = {};
    buildingProps.forEach(p => {
      if (!floors[p.floor]) floors[p.floor] = [];
      floors[p.floor].push(p);
    });
    return Object.fromEntries(
      Object.entries(floors).sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }))
    );
  }, [properties, viewMode, selectedBuilding]);

  const dbSurchargeResults = useMemo(() => {
    return calculateSurchargeByOwner(properties, utaAuditValue);
  }, [properties, utaAuditValue]);

  const lookupOptions = useMemo(() => {
    if (!activeLookupField) return [];
    const uniqueValues = new Set<string>();
    
    // Add real existing values
    properties.forEach(p => {
      let val = '';
      if (activeLookupField === 'commune') val = p.commune || '';
      else if (activeLookupField === 'useType') val = p.useType || '';
      else if (activeLookupField === 'type') val = p.type || '';
      else if (activeLookupField === 'destination') val = p.destination || '';
      
      val = val.trim().toUpperCase();
      if (val) uniqueValues.add(val);
    });
    
    // Supplement with industry standard Chilean master values so it is rich & highly professional
    if (activeLookupField === 'commune') {
      ['SANTIAGO', 'PROVIDENCIA', 'LAS CONDES', 'VITACURA', 'LO BARNECHEA', 'ÑUÑOA', 'LA REINA', 'MACUL', 'SAN MIGUEL', 'VALPARAÍSO', 'VIÑA DEL MAR', 'CONCEPCIÓN', 'CHILLÁN', 'TEMUCO', 'PUERTO MONTT', 'ANTOFAGASTA', 'IQUIQUE', 'SERENA', 'COQUIMBO', 'RANCAGUA'].forEach(c => uniqueValues.add(c));
    } else if (activeLookupField === 'useType') {
      ['COMERCIAL', 'HABITACIONAL', 'PARTICULAR', 'ESTACIONAMIENTO', 'BODEGAJE', 'OFICINA COMPAÑÍA', 'SUCURSAL BANCARIA', 'GARAJE', 'TERRENO ERIAZO', 'INDUSTRIAL'].forEach(u => uniqueValues.add(u));
    } else if (activeLookupField === 'type') {
      ['DEPARTAMENTO', 'OFICINA', 'LOCAL', 'BODEGA', 'ESTACIONAMIENTO', 'CASA', 'TERRENO', 'EDIFICIO COMPLETO', 'SALA REUNIONES'].forEach(t => uniqueValues.add(t));
    } else if (activeLookupField === 'destination') {
      ['HABITACIONAL', 'NO HABITACIONAL', 'COMERCIAL', 'INDUSTRIAL', 'EQUIPAMIENTO', 'OFICINAS', 'LOGÍSTICA', 'RECREACIÓN'].forEach(d => uniqueValues.add(d));
    }

    const searchLower = lookupSearchTerm.toLowerCase();
    return Array.from(uniqueValues)
      .sort()
      .map(val => {
        // Calculate count of active matches in database
        let matchCount = 0;
        properties.forEach(p => {
          let pVal = '';
          if (activeLookupField === 'commune') pVal = p.commune || '';
          else if (activeLookupField === 'useType') pVal = p.useType || '';
          else if (activeLookupField === 'type') pVal = p.type || '';
          else if (activeLookupField === 'destination') pVal = p.destination || '';
          
          if (pVal.trim().toUpperCase() === val) {
            matchCount++;
          }
        });

        // Add typical description text based on the code/value
        let desc = 'Código de Parámetro Maestro (UDC)';
        if (activeLookupField === 'commune') desc = `Comuna de la República de Chile`;
        else if (activeLookupField === 'useType') desc = `Uso Autorizado u Operacional`;
        else if (activeLookupField === 'type') desc = `Tipo Físico de Estructura Inmobiliaria`;
        else if (activeLookupField === 'destination') desc = `Destino Tributario SII (Servicio de Impuestos Internos)`;

        return { value: val, description: desc, count: matchCount };
      })
      .filter(opt => 
        opt.value.toLowerCase().includes(searchLower) || 
        opt.description.toLowerCase().includes(searchLower)
      );
  }, [properties, activeLookupField, lookupSearchTerm]);

  const handleExportExcel = () => {
    const dataToExport = (filtered.length > 0 ? filtered : properties).map(p => {
      const row: any = {
        'Edificio': p.building,
        'Piso': p.floor,
        'Código': p.code,
        'Dirección': p.address,
        'Comuna': p.commune || '',
        'Tipo': p.type,
        'Propietario': p.owner || 'N/A',
        'Sup. Terreno': p.surfaceAreaLand || 0,
        'Sup. Construida': p.surfaceAreaBuilt || 0,
        'Año Const.': p.constructionYear || '',
        'Destino': p.destination || '',
        'Uso': p.useType || '',
        'ROL': p.propertyRole || '',
        'Canon Arriendo': p.rentalValue || 0,
        'Avalúo Fiscal Total': p.fiscalValue || 0,
        'Sobretasa Ley 21.210': p.hasSurcharge ? 'APLICA SOBRETASA' : 'EXENTO',
        'Última Tasación': p.appraisalDate ? `${p.appraisalDate} ($${(p.appraisalValueCLP || 0).toLocaleString('es-CL')})` : 'SIN TASACIÓN',
        'Póliza Vigente': p.insurancePolicyNumber || 'SIN PÓLIZA',
        'Compañía Seguros': p.insuranceCompany || '---',
        'Vigencia Seguro': p.insuranceEndDate || '---',
        'Estado Ocupación': p.status
      };
      return row;
    });
    exportToExcel(dataToExport, `Maestro_Activos_${new Date().toISOString().split('T')[0]}`, 'Maestro_Propiedades', 'xlsx');
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#f3f2f1] overflow-auto">
      {/* TOOLBAR */}
      <div className="min-h-14 py-1.5 bg-white border-b border-slate-300 flex flex-wrap items-center px-4 justify-between gap-2 shadow-sm z-30 no-print overflow-x-auto min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="bg-slate-800 p-1.5 rounded text-white mr-1.5 shrink-0">
            <Building2 size={18} />
          </div>
          <h2 className="text-xs font-black text-slate-700 uppercase tracking-tighter shrink-0">Pool_Maestro_Activos.xlsx</h2>
          
          <div className="h-8 w-[1px] bg-slate-300 mx-3 shrink-0"></div>

          {/* Unified Utility Ribbon - ERP Aesthetic */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-lg">
            {/* Registro de Nueva Propiedad P15012 */}
            <button 
              onClick={() => {
                setEditingProperty(null);
                setTempAppraisalFile(null);
                setIsFormOpen(true);
              }} 
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-md transition-all shadow-md hover:shadow-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border border-emerald-900 ring-2 ring-emerald-600/30 shrink-0"
              title="Registrar nueva propiedad en la base de datos con jerarquía y servicios básicos estandarizados (P15012)"
            >
              <Plus size={13} className="text-white" />
              <span>NUEVA PROPIEDAD (P15012)</span>
            </button>

            {/* Carga e Importación */}
            <button 
              onClick={() => setIsIntelligentImportOpen(true)} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all shadow-sm shrink-0 text-[10px] font-black uppercase cursor-pointer animate-none"
              title="Cargar y procesar archivos Excel o PDF de propiedades de forma inteligente con IA"
            >
              <Sparkles size={13} className="animate-pulse" />
              <span>Carga Inteligente</span>
            </button>

            {/* EXPORTAR EXCEL DIRECTAMENTE EN EL RECUADRO IZQUIERDO PRINCIPAL PARA MÁXIMA VISIBILIDAD */}
            <button 
              onClick={() => {
                const dataToExport = (filtered.length > 0 ? filtered : properties).map(p => {
                  const row: any = {
                    'Edificio': p.building,
                    'Piso': p.floor,
                    'Código': p.code,
                    'Dirección': p.address,
                    'Comuna': p.commune || '',
                    'Tipo': p.type,
                    'Propietario': p.owner || 'N/A',
                    'Sup. Terreno': p.surfaceAreaLand || 0,
                    'Sup. Construida': p.surfaceAreaBuilt || 0,
                    'Año Const.': p.constructionYear || '',
                    'Destino': p.destination || '',
                    'Uso': p.useType || '',
                    'ROL': p.propertyRole || '',
                    'Canon Arriendo': p.rentalAmount || 0,
                    'Valor Tasación': p.appraisalValue || 0,
                    'Fecha Tasación': p.lastAppraisalDate || ''
                  };

                  if (p.financialData) {
                    row['Costo Adquisición CLP'] = p.financialData.acquisitionCostCLP || 0;
                    row['Costo Adquisición UF'] = p.financialData.acquisitionCostUF || 0;
                    row['Fecha Adquisición'] = p.financialData.acquisitionDate || '';
                    row['Vida Útil (Meses)'] = p.financialData.usefulLifeMonths || 0;
                    row['Valor Residual'] = p.financialData.residualValueCLP || 0;
                    row['Depreciación Acumulada'] = p.financialData.accumulatedDepreciationCLP || 0;
                    row['Valor Libros Actual'] = p.financialData.currentBookValueCLP || 0;
                  }

                  if (p.insurancePolicy) {
                    row['Nº Póliza'] = p.insurancePolicy.policyNumber || '';
                    row['Compañía Seguro'] = p.insurancePolicy.company || '';
                    row['Cobertura'] = p.insurancePolicy.coverageAmount || 0;
                    row['Vigencia Inicio'] = p.insurancePolicy.startDate || '';
                    row['Vigencia Fin'] = p.insurancePolicy.endDate || '';
                  }

                  if (p.rawMetadata) {
                    Object.entries(p.rawMetadata).forEach(([key, value]) => {
                      if (row[key] === undefined) {
                        row[key] = value;
                      }
                    });
                  }

                  return row;
                });
                exportToExcel(dataToExport, `Maestro_Activos_${new Date().toISOString().split('T')[0]}`, 'Maestro_Propiedades', 'xlsx');
              }} 
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#107c41] hover:bg-[#0b592e] text-white rounded-md transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 text-[10px] font-black uppercase tracking-wider cursor-pointer border border-[#0d6132] ring-2 ring-[#107c41]/20 shrink-0"
              title="Exportar todas las unidades del grid actual a una planilla Excel (.xlsx) real"
            >
              <FileSpreadsheet size={13} className="text-white" />
              <span>EXPORTAR GRID EXCEL (XLSX)</span>
            </button>

            <button 
              onClick={async () => {
                setIsLoadingDrafts(true);
                setIsDraftsModalOpen(true);
                try {
                  const { collection, getDocs, query, where, orderBy } = await import('firebase/firestore');
                  const { db } = await import('../firebase');
                  const q = query(collection(db, 'property_import_drafts'), where('status', '==', 'PENDING'), orderBy('timestamp', 'desc'));
                  const snapshot = await getDocs(q);
                  const draftsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                  setDrafts(draftsList);
                } catch (error) {
                  console.error('Error loading drafts:', error);
                } finally {
                  setIsLoadingDrafts(false);
                }
              }} 
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-200 text-slate-700 rounded-md transition-colors shrink-0 text-[10px] font-bold uppercase cursor-pointer"
              title="Ver borradores guardados"
            >
              <Database size={13} className="text-slate-600" />
              <span>Borradores</span>
            </button>

            {/* Divider */}
            <div className="h-5 w-[1px] bg-slate-300 mx-1.5 shrink-0"></div>

            {/* Auditoría y Control */}
            <button 
              onClick={() => setIsSurchargeAuditOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-indigo-50 text-indigo-700 rounded-md transition-colors shrink-0 text-[10px] font-black uppercase cursor-pointer"
              title="Auditoría de sobretasas e inconsistencias fiscales"
            >
              <Sparkles size={13} className="text-indigo-600" />
              <span>Auditoría Sobretasas</span>
            </button>

            {onSync && (
              <button 
                onClick={onSync}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-emerald-50 text-emerald-800 rounded-md transition-colors shrink-0 text-[10px] font-black uppercase cursor-pointer"
                title="Sincronizar permanentemente todos los cambios a la base de datos de Firebase"
              >
                <Save size={13} className="text-emerald-600" />
                <span>Guardar</span>
              </button>
            )}

            {/* Divider */}
            <div className="h-5 w-[1px] bg-slate-300 mx-1.5 shrink-0"></div>

            {/* Mantenimiento Crítico */}
            <button 
              disabled={isRebuilding}
              onClick={async () => {
                if (confirm('¿Desea RECONSTRUIR la base de datos con la información maestra predefinida? Esto borrará todos los datos actuales.')) {
                  try {
                     setIsRebuilding(true);
                     await onRebuild(MASTER_PROPERTIES_SEED);
                     notify('Base de Datos RECONSTRUIDA Correctamente con la información maestra.', 'success');
                  } catch (error) {
                     console.error('Error rebuilding master database:', error);
                     notify('Error al reconstruir la base de datos con la información maestra.', 'error');
                  } finally {
                     setIsRebuilding(false);
                  }
                }
              }} 
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-amber-150 hover:text-amber-900 text-amber-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 text-[10px] font-bold uppercase cursor-pointer"
              title="Restaurar base de datos maestra a su estado predeterminado de fábrica"
            >
              <Settings2 size={13} className={`text-amber-700 ${isRebuilding ? 'animate-spin' : ''}`} />
              <span>{isRebuilding ? 'Cargando...' : 'Restaurar'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ACCIONES DE EXPORTACIÓN (XLSX & XLS) */}
          <div className="flex items-center bg-slate-50 border border-slate-200 p-1 rounded-lg gap-1.5">
            <button 
              onClick={() => {
                const dataToExport = (filtered.length > 0 ? filtered : properties).map(p => {
                  const row: any = {
                    'Edificio': p.building,
                    'Piso': p.floor,
                    'Código': p.code,
                    'Dirección': p.address,
                    'Comuna': p.commune || '',
                    'Tipo': p.type,
                    'Propietario': p.owner || 'N/A',
                    'Sup. Terreno': p.surfaceAreaLand || 0,
                    'Sup. Construida': p.surfaceAreaBuilt || 0,
                    'Año Const.': p.constructionYear || '',
                    'Destino': p.destination || '',
                    'Uso': p.useType || '',
                    'ROL': p.propertyRole || '',
                    'Canon Arriendo': p.rentalAmount || 0,
                    'Valor Tasación': p.appraisalValue || 0,
                    'Fecha Tasación': p.lastAppraisalDate || ''
                  };

                  if (p.financialData) {
                    row['Costo Adquisición CLP'] = p.financialData.acquisitionCostCLP || 0;
                    row['Costo Adquisición UF'] = p.financialData.acquisitionCostUF || 0;
                    row['Fecha Adquisición'] = p.financialData.acquisitionDate || '';
                    row['Vida Útil (Meses)'] = p.financialData.usefulLifeMonths || 0;
                    row['Valor Residual'] = p.financialData.residualValueCLP || 0;
                    row['Depreciación Acumulada'] = p.financialData.accumulatedDepreciationCLP || 0;
                    row['Valor Libros Actual'] = p.financialData.currentBookValueCLP || 0;
                  }

                  if (p.insurancePolicy) {
                    row['Nº Póliza'] = p.insurancePolicy.policyNumber || '';
                    row['Compañía Seguro'] = p.insurancePolicy.company || '';
                    row['Cobertura'] = p.insurancePolicy.coverageAmount || 0;
                    row['Vigencia Inicio'] = p.insurancePolicy.startDate || '';
                    row['Vigencia Fin'] = p.insurancePolicy.endDate || '';
                  }

                  if (p.rawMetadata) {
                    Object.entries(p.rawMetadata).forEach(([key, value]) => {
                      if (row[key] === undefined) {
                        row[key] = value;
                      }
                    });
                  }

                  return row;
                });
                exportToExcel(dataToExport, `Maestro_Activos_${new Date().toISOString().split('T')[0]}`, 'Maestro_Propiedades', 'xlsx');
              }} 
              className="flex items-center gap-1 px-3 py-1.5 bg-[#107c41] hover:bg-[#0b592e] text-white rounded transition-all shadow-sm shrink-0 text-[10px] font-black uppercase cursor-pointer"
              title="Exportar todas las unidades del grid actual a una planilla Excel (.xlsx) real"
            >
              <FileSpreadsheet size={13} />
              <span>Exportar XLSX</span>
            </button>

            <button 
              onClick={() => {
                const dataToExport = (filtered.length > 0 ? filtered : properties).map(p => {
                  const row: any = {
                    'Edificio': p.building,
                    'Piso': p.floor,
                    'Código': p.code,
                    'Dirección': p.address,
                    'Comuna': p.commune || '',
                    'Tipo': p.type,
                    'Propietario': p.owner || 'N/A',
                    'Sup. Terreno': p.surfaceAreaLand || 0,
                    'Sup. Construida': p.surfaceAreaBuilt || 0,
                    'Año Const.': p.constructionYear || '',
                    'Destino': p.destination || '',
                    'Uso': p.useType || '',
                    'ROL': p.propertyRole || '',
                    'Canon Arriendo': p.rentalAmount || 0,
                    'Valor Tasación': p.appraisalValue || 0,
                    'Fecha Tasación': p.lastAppraisalDate || ''
                  };

                  if (p.financialData) {
                    row['Costo Adquisición CLP'] = p.financialData.acquisitionCostCLP || 0;
                    row['Costo Adquisición UF'] = p.financialData.acquisitionCostUF || 0;
                    row['Fecha Adquisición'] = p.financialData.acquisitionDate || '';
                    row['Vida Útil (Meses)'] = p.financialData.usefulLifeMonths || 0;
                    row['Valor Residual'] = p.financialData.residualValueCLP || 0;
                    row['Depreciación Acumulada'] = p.financialData.accumulatedDepreciationCLP || 0;
                    row['Valor Libros Actual'] = p.financialData.currentBookValueCLP || 0;
                  }

                  if (p.insurancePolicy) {
                    row['Nº Póliza'] = p.insurancePolicy.policyNumber || '';
                    row['Compañía Seguro'] = p.insurancePolicy.company || '';
                    row['Cobertura'] = p.insurancePolicy.coverageAmount || 0;
                    row['Vigencia Inicio'] = p.insurancePolicy.startDate || '';
                    row['Vigencia Fin'] = p.insurancePolicy.endDate || '';
                  }

                  if (p.rawMetadata) {
                    Object.entries(p.rawMetadata).forEach(([key, value]) => {
                      if (row[key] === undefined) {
                        row[key] = value;
                      }
                    });
                  }

                  return row;
                });
                exportToExcel(dataToExport, `Maestro_Activos_${new Date().toISOString().split('T')[0]}`, 'Maestro_Propiedades', 'xls');
              }} 
              className="flex items-center gap-1 px-3 py-1.5 bg-[#107c41]/90 hover:bg-[#0b592e] text-white rounded transition-all shadow-sm shrink-0 text-[10px] font-black uppercase cursor-pointer"
              title="Exportar todas las unidades del grid actual a una planilla Excel compatible (.xls)"
            >
              <FileSpreadsheet size={13} />
              <span>Exportar XLS</span>
            </button>
          </div>

          <button 
            onClick={() => setIsPreviewReportOpen(true)} 
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded transition-colors shrink-0 text-[10px] font-bold uppercase cursor-pointer"
            title="Generar inventario y reporte físico en PDF para impresión"
          >
            <Printer size={13} className="text-slate-600" />
            <span>PDF</span>
          </button>

          <GridDimensionControls
            defaultRowHeight={defaultRowHeight}
            onSetRowHeight={setDefaultRowHeight}
            onResetColumns={resetWidths}
            onResetRows={resetHeights}
            onResetAll={resetAll}
          />

          <div className="relative shrink-0">
            <input 
              type="text" placeholder="Buscar..." 
              className="bg-slate-50 border border-slate-300 rounded px-8 py-1.5 text-[10px] font-bold uppercase w-32 outline-none focus:border-indigo-500 focus:bg-white transition-all"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white no-print overflow-auto min-h-0">
         {/* ... Contenido de la vista Planta/Lista ... */}
         {viewMode === 'LIST' ? (
            <div className="flex-1 flex flex-col min-h-0">
               <div className="flex-1 overflow-auto excel-grid">
                  <table className="w-full text-left border-collapse table-fixed">
               <thead className="sticky top-0 bg-[#f3f2f1] z-10">
                  <tr className="h-10">
                     <th style={{ width: widths.building }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Edificio
                        <div onMouseDown={(e) => onMouseDown(e, 'building')} className="resizer" />
                     </th>
                     <th style={{ width: widths.code }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Unidad
                        <div onMouseDown={(e) => onMouseDown(e, 'code')} className="resizer" />
                     </th>
                     <th style={{ width: widths.address }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Dirección
                        <div onMouseDown={(e) => onMouseDown(e, 'address')} className="resizer" />
                     </th>
                     <th style={{ width: widths.commune }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Comuna
                        <div onMouseDown={(e) => onMouseDown(e, 'commune')} className="resizer" />
                     </th>
                     <th style={{ width: widths.owner }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Propietario
                        <div onMouseDown={(e) => onMouseDown(e, 'owner')} className="resizer" />
                     </th>
                     <th style={{ width: widths.type }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Tipo
                        <div onMouseDown={(e) => onMouseDown(e, 'type')} className="resizer" />
                     </th>
                     <th style={{ width: widths.landArea }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Sup. Terr.
                        <div onMouseDown={(e) => onMouseDown(e, 'landArea')} className="resizer" />
                     </th>
                     <th style={{ width: widths.builtArea }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Sup. Const.
                        <div onMouseDown={(e) => onMouseDown(e, 'builtArea')} className="resizer" />
                     </th>
                     <th style={{ width: widths.year }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Año
                        <div onMouseDown={(e) => onMouseDown(e, 'year')} className="resizer" />
                     </th>
                     <th style={{ width: widths.dest }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Destino
                        <div onMouseDown={(e) => onMouseDown(e, 'dest')} className="resizer" />
                     </th>
                     <th style={{ width: widths.use }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Uso
                        <div onMouseDown={(e) => onMouseDown(e, 'use')} className="resizer" />
                     </th>
                     <th style={{ width: widths.role }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        ROL
                        <div onMouseDown={(e) => onMouseDown(e, 'role')} className="resizer" />
                     </th>
                     <th style={{ width: widths.rental }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Canon Arriendo
                        <div onMouseDown={(e) => onMouseDown(e, 'rental')} className="resizer" />
                     </th>
                     <th style={{ width: widths.value }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black">
                        Tasación
                        <div onMouseDown={(e) => onMouseDown(e, 'value')} className="resizer" />
                     </th>
                     <th style={{ width: widths.surcharge }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black text-rose-700 bg-rose-50/40 text-center">
                        Sobretasa CLP
                        <div onMouseDown={(e) => onMouseDown(e, 'surcharge')} className="resizer" />
                     </th>
                     <th style={{ width: widths.lastAppraisal }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black text-center">
                        Últ. Tasación
                        <div onMouseDown={(e) => onMouseDown(e, 'lastAppraisal')} className="resizer" />
                     </th>
                     <th style={{ width: widths.policy }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black text-center">
                        Póliza Seguro
                        <div onMouseDown={(e) => onMouseDown(e, 'policy')} className="resizer" />
                     </th>
                     <th style={{ width: widths.insCompany }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black text-center">
                        Cía. Seguro
                        <div onMouseDown={(e) => onMouseDown(e, 'insCompany')} className="resizer" />
                     </th>
                     <th style={{ width: widths.insVigency }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black text-center">
                        Vigencia Seguro
                        <div onMouseDown={(e) => onMouseDown(e, 'insVigency')} className="resizer" />
                     </th>
                     <th style={{ width: widths.status }} className="relative excel-cell-header font-black text-[9px] uppercase border border-black text-center">
                        Estado
                        <div onMouseDown={(e) => onMouseDown(e, 'status')} className="resizer" />
                     </th>
                     <th style={{ width: 80 }} className="excel-cell-header font-black text-[9px] uppercase border border-black text-center">
                        Acciones
                     </th>
                  </tr>
                  <tr className="bg-slate-100/80 h-8">
                     <td className="p-1 border border-black bg-white">
                        <input 
                           type="text" 
                           placeholder="Buscar..."
                           value={colSearchEdificio}
                           onChange={e => setColSearchEdificio(e.target.value)}
                           onClick={e => e.stopPropagation()}
                           className="w-full px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 border border-slate-200 rounded outline-none"
                        />
                     </td>
                     <td className="p-1 border border-black bg-white">
                        <input 
                           type="text" 
                           placeholder="Buscar..."
                           value={colSearchUnidad}
                           onChange={e => setColSearchUnidad(e.target.value)}
                           onClick={e => e.stopPropagation()}
                           className="w-full px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 border border-slate-200 rounded outline-none"
                        />
                     </td>
                     <td className="p-1 border border-black bg-white">
                        <input 
                           type="text" 
                           placeholder="Buscar..."
                           value={colSearchDireccion}
                           onChange={e => setColSearchDireccion(e.target.value)}
                           onClick={e => e.stopPropagation()}
                           className="w-full px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 border border-slate-200 rounded outline-none"
                        />
                     </td>
                     <td className="p-1 border border-black bg-white">
                        <div className="relative flex items-center group">
                           <input 
                              type="text" 
                              placeholder="Buscar..."
                              value={colSearchComuna}
                              onChange={e => setColSearchComuna(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="w-full pr-5 px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 border border-slate-200 rounded outline-none uppercase"
                           />
                           <button
                              type="button"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setActiveLookupField('commune');
                              }}
                              className="absolute right-1 text-[#107c41] hover:text-[#0b592e] transition-colors cursor-pointer p-0.5"
                              title="Consultar Maestro de Comunas"
                           >
                              <Database size={9} />
                           </button>
                        </div>
                     </td>
                     <td className="p-1 border border-black bg-white">
                        <input 
                           type="text" 
                           placeholder="Buscar..."
                           value={colSearchPropietario}
                           onChange={e => setColSearchPropietario(e.target.value)}
                           onClick={e => e.stopPropagation()}
                           className="w-full px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 border border-slate-200 rounded outline-none"
                        />
                     </td>
                     <td className="p-1 border border-black bg-white">
                        <div className="relative flex items-center group">
                           <input 
                              type="text" 
                              placeholder="Buscar..."
                              value={colSearchTipo}
                              onChange={e => setColSearchTipo(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="w-full pr-5 px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 border border-slate-200 rounded outline-none uppercase"
                           />
                           <button
                              type="button"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setActiveLookupField('type');
                              }}
                              className="absolute right-1 text-[#107c41] hover:text-[#0b592e] transition-colors cursor-pointer p-0.5"
                              title="Consultar Maestro de Tipos de Activos"
                           >
                              <Database size={9} />
                           </button>
                        </div>
                     </td>
                     <td className="p-1 border border-black bg-slate-50 text-center text-[8px] text-slate-400 font-bold">-</td>
                     <td className="p-1 border border-black bg-slate-50 text-center text-[8px] text-slate-400 font-bold">-</td>
                     <td className="p-1 border border-black bg-slate-50 text-center text-[8px] text-slate-400 font-bold">-</td>
                     <td className="p-1 border border-black bg-white">
                        <div className="relative flex items-center group">
                           <input 
                              type="text" 
                              placeholder="Buscar..."
                              value={colSearchDestino}
                              onChange={e => setColSearchDestino(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="w-full pr-5 px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 border border-slate-200 rounded outline-none uppercase"
                           />
                           <button
                              type="button"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setActiveLookupField('destination');
                              }}
                              className="absolute right-1 text-[#107c41] hover:text-[#0b592e] transition-colors cursor-pointer p-0.5"
                              title="Consultar Maestro de Destinos"
                           >
                              <Database size={9} />
                           </button>
                        </div>
                     </td>
                     <td className="p-1 border border-black bg-white">
                        <div className="relative flex items-center group">
                           <input 
                              type="text" 
                              placeholder="Buscar..."
                              value={colSearchUso}
                              onChange={e => setColSearchUso(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="w-full pr-5 px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 border border-slate-200 rounded outline-none uppercase"
                           />
                           <button
                              type="button"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setActiveLookupField('useType');
                              }}
                              className="absolute right-1 text-[#107c41] hover:text-[#0b592e] transition-colors cursor-pointer p-0.5"
                              title="Consultar Maestro de Usos"
                           >
                              <Database size={9} />
                           </button>
                        </div>
                     </td>
                     <td className="p-1 border border-black bg-white">
                        <input 
                           type="text" 
                           placeholder="Buscar..."
                           value={colSearchRol}
                           onChange={e => setColSearchRol(e.target.value)}
                           onClick={e => e.stopPropagation()}
                           className="w-full px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 border border-slate-200 rounded outline-none"
                        />
                     </td>
                     <td className="p-1 border border-black bg-slate-50 text-center text-[8px] text-slate-400 font-bold">-</td>
                     <td className="p-1 border border-black bg-slate-50 text-center text-[8px] text-slate-400 font-bold">-</td>
                     <td className="p-1 border border-black bg-slate-50 text-center text-[8px] text-slate-400 font-bold">-</td>
                     <td className="p-1 border border-black bg-slate-50 text-center text-[8px] text-slate-400 font-bold">-</td>
                     <td className="p-1 border border-black bg-slate-50 text-center text-[8px] text-slate-400 font-bold">-</td>
                     <td className="p-1 border border-black bg-slate-50 text-center text-[8px] text-slate-400 font-bold">-</td>
                     <td className="p-1 border border-black bg-slate-50 text-center text-[8px] text-slate-400 font-bold">-</td>
                     <td className="p-1 border border-black bg-white">
                        <input 
                           type="text" 
                           placeholder="Buscar..."
                           value={colSearchEstado}
                           onChange={e => setColSearchEstado(e.target.value)}
                           onClick={e => e.stopPropagation()}
                           className="w-full px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 border border-slate-200 rounded outline-none text-center"
                        />
                     </td>
                     <td className="p-1 border border-black bg-slate-50 text-center text-[8px] text-slate-400 font-bold">-</td>
                  </tr>
               </thead>
               <tbody>
                  {paginatedFiltered.map(p => (
                     <tr 
                        key={p.id}
                        onDoubleClick={(e) => {
                           e.stopPropagation();
                           setInspectTarget(p);
                        }} 
                        className="h-10 hover:bg-indigo-50/30 border-b cursor-pointer transition-colors group"
                        style={{ height: `${getRowHeight(p.id)}px` }}
                        onClick={() => {
                          setEditingProperty(p);
                          setTempAppraisalFile(p.appraisalDocumentUrl ? { url: p.appraisalDocumentUrl, name: p.appraisalDocumentName || 'Tasación' } : null);
                          setIsFormOpen(true);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setGridContextMenu({ x: e.clientX, y: e.clientY, prop: p });
                        }}
                     >
                        <td className="relative px-4 text-[10px] font-black uppercase border border-black">
                           {p.building}
                           <div
                              onMouseDown={(e) => onRowMouseDown(e, p.id)}
                              onDoubleClick={(e) => {
                                 e.stopPropagation();
                                 onRowDoubleClick(p.id);
                              }}
                              className="row-resizer"
                              title="Arrastrar para cambiar alto de fila (Shift para todas). Doble clic para restablecer."
                           />
                        </td>
                        <td className="px-4 text-[10px] font-mono font-black text-indigo-600 border border-black">
                           <div className="flex items-center gap-1">
                              {p.isTest && (
                                 <span className="px-1 py-0.5 rounded text-[7px] font-black tracking-widest uppercase bg-amber-100 text-amber-800 border border-amber-300 mr-1">
                                    TEST
                                 </span>
                              )}
                              <span>{p.code}</span>
                           </div>
                        </td>
                        <td className="px-4 text-[10px] font-bold uppercase border border-black truncate">{p.address}</td>
                        <td className="px-4 text-[10px] font-bold uppercase border border-black">{p.commune || '-'}</td>
                        <td className="px-4 text-[10px] font-bold uppercase border border-black truncate">{p.owner || '-'}</td>
                        <td className="px-4 text-[8px] font-black uppercase border border-black">
                           <div className="flex items-center gap-2">
                              {p.type === 'DEPARTAMENTO' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                              {p.type === 'OFICINA' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                              {p.type === 'LOCAL' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                              {p.type === 'BODEGA' && <div className="w-2 h-2 rounded-full bg-slate-500" />}
                              {p.type === 'ESTACIONAMIENTO' && <div className="w-2 h-2 rounded-full bg-sky-500" />}
                              {p.type === 'CASA' && <div className="w-2 h-2 rounded-full bg-rose-500" />}
                              <span className="text-slate-700">{p.type}</span>
                              {p.validationErrors && p.validationErrors.length > 0 && (
                                 <div className="group relative ml-auto">
                                    <AlertTriangle size={12} className="text-amber-500 animate-pulse" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[8px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                       {p.validationErrors.map((err, idx) => (
                                          <p key={idx}>{err}</p>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </div>
                        </td>
                        <td className="px-4 text-[10px] border border-black">{p.surfaceAreaLand || '-'}</td>
                        <td className="px-4 text-[10px] border border-black">{p.surfaceAreaBuilt || '-'}</td>
                        <td className="px-4 text-[10px] border border-black">{p.constructionYear || '-'}</td>
                        <td className="px-4 text-[8px] font-bold border border-black">{p.destination || '-'}</td>
                        <td className="px-4 text-[8px] font-bold border border-black">{p.useType || '-'}</td>
                        <td className="px-4 text-[10px] font-mono border border-black">{p.propertyRole || '-'}</td>
                        <td className="px-4 text-[10px] font-mono border border-black">
                           {p.insurancePolicy?.policyNumber || '-'}
                        </td>
                        <td className="px-4 text-[10px] border border-black truncate">
                           {p.insurancePolicy?.company || '-'}
                        </td>
                        <td className="px-4 text-[9px] border border-black whitespace-nowrap">
                           {p.insurancePolicy ? `${formatDate(p.insurancePolicy.startDate)} al ${formatDate(p.insurancePolicy.endDate)}` : '-'}
                        </td>
                        <td className="px-4 text-[10px] font-black text-emerald-700 border border-black">
                           {p.rentalAmount ? `$${p.rentalAmount.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 text-[10px] font-bold border border-black">
                           {p.appraisalValue ? `$${p.appraisalValue.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 text-[10px] font-black text-rose-700 border border-black bg-rose-50/20 font-mono text-center">
                           {p.surchargeCalculated?.proportionalSurcharge ? `$${p.surchargeCalculated.proportionalSurcharge.toLocaleString()}` : '$0'}
                        </td>
                        <td className="px-4 text-[10px] font-bold border border-black">
                           {formatDate(p.lastAppraisalDate)}
                        </td>
                        <td className="px-4 border border-black">
                           <div className="flex justify-center">
                              {p.status === 'DISPONIBLE' ? (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[8px] font-black rounded-full uppercase border border-emerald-300">Disponible</span>
                              ) : p.status === 'ARRENDADA' ? (
                                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-[8px] font-black rounded-full uppercase border border-indigo-300">Arrendada</span>
                              ) : p.validationErrors && p.validationErrors.length > 0 ? (
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[8px] font-black rounded-full uppercase">Con Errores</span>
                              ) : (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded-full uppercase">{p.status || 'Vigente'}</span>
                              )}
                           </div>
                        </td>
                        <td className="px-4 border border-black" onClick={(e) => e.stopPropagation()}>
                           <div className="flex items-center gap-2">
                              <button 
                                 onClick={() => {
                                    setEditingProperty(p);
                                    setTempAppraisalFile(p.appraisalDocumentUrl ? { url: p.appraisalDocumentUrl, name: p.appraisalDocumentName || 'Tasación' } : null);
                                    setIsFormOpen(true);
                                 }}
                                 className="p-1 hover:bg-indigo-50 text-indigo-600 rounded transition-colors"
                              >
                                 <Settings2 size={14} />
                               </button>
                               <button 
                                  onClick={() => setInspectTarget(p)}
                                  className="p-1 hover:bg-amber-100 text-[#0B3C5D] rounded transition-colors"
                                  title="F980011D: Consultar Maestro de Atributos"
                               >
                                  <Database size={14} />
                              </button>
                              {p.appraisalDocumentUrl && (
                                <button 
                                   onClick={() => setViewingAppraisal(p)}
                                   className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-colors"
                                   title="Ver Copia Digital de Tasación"
                                >
                                   <Eye size={14} />
                                </button>
                              )}
                              <button 
                                 onClick={() => {
                                    if (confirm('¿Eliminar esta propiedad?')) onDelete(p.id);
                                 }}
                                 className="p-1 hover:bg-rose-50 text-rose-600 rounded transition-colors"
                              >
                                 <Trash2 size={14} />
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Pagination bar */}
         <div className="bg-[#DCE7F2] border-t border-[#6B8095] px-3 py-1.5 shrink-0 flex flex-col md:flex-row items-center justify-between font-mono text-[10px] text-slate-800 select-none gap-2 z-10">
            <div className="flex flex-wrap items-center gap-3">
               <span className="font-bold text-[#1C4E75] uppercase">Cuadrícula Registros:</span>
               <span className="bg-white border border-[#A2BCCF] px-2 py-0.5 font-bold">
                  {filtered.length === 0 ? 0 : currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, filtered.length)} de {filtered.length}
               </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
               <span className="font-bold text-[#1C4E75]">Tamaño Página:</span>
               <select
                  value={pageSize}
                  onChange={(e) => {
                     setPageSize(Number(e.target.value));
                     setCurrentPage(0);
                  }}
                  className="bg-white border border-[#9DB2C3] px-1.5 py-0.5 text-[9.5px] font-bold focus:outline-none focus:border-[#0B3C5D]"
               >
                  <option value={10}>10 por pág</option>
                  <option value={20}>20 por pág</option>
                  <option value={50}>50 por pág</option>
                  <option value={100}>100 por pág</option>
                  <option value={200}>200 por pág</option>
               </select>

               <div className="flex items-center gap-1 ml-0 md:ml-4 border-l border-[#A2BCCF] pl-3">
                  <button
                     onClick={() => setCurrentPage(0)}
                     disabled={currentPage === 0}
                     className={`p-1 border rounded-xs ${
                        currentPage === 0 
                           ? 'bg-slate-150 text-slate-350 border-slate-200 cursor-not-allowed' 
                           : 'bg-white text-slate-800 border-[#A2BCCF] hover:bg-slate-50 cursor-pointer'
                     }`}
                     title="Primera página"
                  >
                     <ChevronsLeft size={11} />
                  </button>
                  <button
                     onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                     disabled={currentPage === 0}
                     className={`p-1 border rounded-xs ${
                        currentPage === 0 
                           ? 'bg-slate-150 text-slate-350 border-slate-200 cursor-not-allowed' 
                           : 'bg-white text-slate-800 border-[#A2BCCF] hover:bg-slate-50 cursor-pointer'
                     }`}
                     title="Página anterior"
                  >
                     <ChevronLeft size={11} />
                  </button>

                  <span className="px-2.5 py-0.5 bg-white border border-[#9DB2C3] font-bold text-[#1C4E75]">
                     Pág. {totalPages === 0 ? 0 : currentPage + 1} de {totalPages}
                  </span>

                  <button
                     onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                     disabled={currentPage >= totalPages - 1}
                     className={`p-1 border rounded-xs ${
                        currentPage >= totalPages - 1 
                           ? 'bg-slate-150 text-slate-350 border-slate-200 cursor-not-allowed' 
                           : 'bg-white text-slate-800 border-[#A2BCCF] hover:bg-slate-50 cursor-pointer'
                     }`}
                     title="Siguiente página"
                  >
                     <ChevronRight size={11} />
                  </button>
                  <button
                     onClick={() => setCurrentPage(totalPages - 1)}
                     disabled={currentPage >= totalPages - 1}
                     className={`p-1 border rounded-xs ${
                        currentPage >= totalPages - 1 
                           ? 'bg-slate-150 text-slate-350 border-slate-200 cursor-not-allowed' 
                           : 'bg-white text-slate-800 border-[#A2BCCF] hover:bg-slate-50 cursor-pointer'
                     }`}
                     title="Última página"
                  >
                     <ChevronsRight size={11} />
                  </button>
               </div>
            </div>
         </div>
      </div>
         ) : (
            <div className="flex-1 overflow-auto p-8">
               <div className="max-w-4xl mx-auto space-y-6">
                  {buildings.length === 0 ? (
                    <div className="bg-white rounded-[32px] border border-dashed border-slate-300 p-20 text-center">
                      <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 size={40} />
                      </div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No hay activos registrados en el pool</p>
                      <button 
                        onClick={() => setIsIntelligentImportOpen(true)}
                        className="mt-6 flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-sm hover:bg-indigo-700 transition-all shadow-xl hover:scale-105"
                      >
                        <Sparkles size={24} />
                        Iniciar Carga Inteligente
                      </button>
                      <p className="text-[10px] text-slate-400 mt-4 italic">O importe manualmente el inventario desde un archivo Excel externo</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {buildings.map(b => {
                        const buildingProps = properties.filter(p => p.building === b);
                        const totalValue = buildingProps.reduce((sum, p) => sum + (p.appraisalValue || 0), 0);
                        const totalRental = buildingProps.reduce((sum, p) => sum + (p.rentalAmount || 0), 0);
                        
                        return (
                          <div 
                            key={b} 
                            onClick={() => {
                              setSelectedBuilding(b);
                              setViewMode('LIST');
                            }}
                            className={`p-6 bg-white border-2 rounded-[32px] transition-all cursor-pointer hover:shadow-xl hover:border-indigo-300 group ${selectedBuilding === b ? 'border-indigo-600 shadow-lg' : 'border-slate-100'}`}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-black text-xl uppercase text-slate-900 group-hover:text-indigo-600 transition-colors">{b}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Layers size={14} className="text-slate-400" />
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {buildingProps.length} Unidades Registradas
                                  </p>
                                </div>
                              </div>
                              <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <Building2 size={24} />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                              <div className="bg-slate-50 p-4 rounded-2xl">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Valor Cartera</p>
                                <p className="text-sm font-black text-slate-900">${totalValue.toLocaleString()}</p>
                              </div>
                              <div className="bg-emerald-50 p-4 rounded-2xl">
                                <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Renta Mensual</p>
                                <p className="text-sm font-black text-emerald-700">${totalRental.toLocaleString()}</p>
                              </div>
                            </div>
                            
                            <div className="mt-6 flex items-center justify-between">
                              <div className="flex -space-x-2">
                                {Array.from(new Set(buildingProps.map(p => p.type))).slice(0, 3).map((type, idx) => (
                                  <div key={idx} className="w-8 h-8 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400 uppercase shadow-sm">
                                    {(type as string).substring(0, 3)}
                                  </div>
                                ))}
                                {new Set(buildingProps.map(p => p.type)).size > 3 && (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-500">
                                    +{new Set(buildingProps.map(p => p.type)).size - 3}
                                  </div>
                                )}
                              </div>
                              <button className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase group-hover:translate-x-1 transition-transform">
                                Ver Detalle <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
               </div>
            </div>
         )}
      </div>

      {isRebuilding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-sm text-center border border-slate-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 animate-bounce">
              <Sparkles size={32} />
            </div>
            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Reconstruyendo Base Maestra</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
              Por favor espere mientras procesamos la carga de {MASTER_PROPERTIES_SEED.length} registros principales y reconstruimos la base de datos de activos. Esto puede tomar unos segundos...
            </p>
            <div className="flex items-center gap-3 text-indigo-600 font-bold text-xs uppercase animate-pulse">
              <Loader2 className="animate-spin" size={16} /> Espere por favor
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN/CREACIÓN */}
      {isIntelligentImportOpen && (
        <PropertyImportModule 
          existingProperties={properties}
          onSaveDraft={onSaveDraft}
          initialDraft={selectedDraft}
          onSync={async (newProps, updatedProps, isRebuild) => {
            if (isRebuild) {
              await onRebuild(newProps as Property[]);
            } else {
              if (newProps.length > 0) await onBulkAdd(newProps);
              if (updatedProps.length > 0) await onBulkUpdate(updatedProps);
            }
            
            // If we were working on a draft, mark it as completed
            if (selectedDraft) {
              try {
                const { doc, updateDoc } = await import('firebase/firestore');
                const { db } = await import('../firebase');
                await updateDoc(doc(db, 'property_import_drafts', selectedDraft.id), {
                  status: 'COMPLETED'
                });
              } catch (error) {
                console.error('Error updating draft status:', error);
              }
            }
            
            // More descriptive success message
            const total = newProps.length + updatedProps.length;
            const message = isRebuild 
              ? `Base de Datos RECONSTRUIDA: ${newProps.length} propiedades cargadas.`
              : `Base de Datos Actualizada: ${newProps.length} nuevas, ${updatedProps.length} corregidas. Total: ${total}`;
            
            notify(message, 'success');
            setIsIntelligentImportOpen(false);
            setSelectedDraft(null);
          }}
          onClose={() => {
            setIsIntelligentImportOpen(false);
            setSelectedDraft(null);
          }}
        />
      )}

      {isFormOpen && (
        <PropertyFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingProperty(null);
            setTempAppraisalFile(null);
          }}
          onSave={async (propData) => {
            if (editingProperty) {
              await onUpdate(propData as Property);
              notify('Propiedad Actualizada', `Se ha actualizado con éxito la propiedad ${propData.code || propData.building}`, 'success');
            } else {
              await onAdd(propData as Omit<Property, 'id'>);
              notify('Propiedad Registrada', `Se ha registrado con éxito la propiedad ${propData.code || propData.building}`, 'success');
            }
            setIsFormOpen(false);
            setEditingProperty(null);
            setTempAppraisalFile(null);
          }}
          initialProperty={editingProperty}
          existingProperties={properties}
          currentUser={currentUser}
          companyLogo={companyLogo}
        />
      )}

      {/* MODAL REPORTE INVENTARIO FOLIADO */}
      {isPreviewReportOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-100 flex flex-col no-print overflow-hidden">
            <div className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between shadow-sm">
                <button onClick={() => setIsPreviewReportOpen(false)} className="flex items-center gap-3 px-6 py-3 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 rounded-2xl font-black text-xs uppercase"><X size={18} /> Cerrar</button>
                <div className="text-right">
                   <p className="text-emerald-700 font-black text-[10px] uppercase">Folio: {reportFolio}</p>
                   <button onClick={() => printHtmlElement("printable-report", `Inventario_Activos_${reportFolio}`)} className="mt-1 bg-indigo-700 text-white px-8 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-indigo-800 active:scale-95 transition-all shadow-md cursor-pointer"><Printer size={16} /> Imprimir Inventario</button>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-12 bg-slate-200 flex justify-center custom-audit-scroll">
                <div id="printable-report" className="bg-white w-[216mm] min-h-[279mm] shadow-xl border border-slate-300 p-[1.5cm] flex flex-col text-black font-sans relative my-10 animate-in zoom-in-95">
                    <div className="flex justify-between items-start border-b-[4px] border-slate-900 pb-6 mb-8">
                        <div className="flex items-center gap-6">
                            {companyLogo ? (
                               <img src={companyLogo} className="w-24 h-24 object-contain" alt="Logo Corporativo" />
                            ) : (
                               <div dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} className="w-20 h-20 flex items-center justify-center [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:object-contain" />
                            )}
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 text-slate-900">Inventario Maestro de Activos</h1>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Catastro de Unidades e Inmuebles AssetFlow</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-black uppercase">Foliado: {reportFolio}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase">Corte: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-10">
                        <div className="bg-slate-50 p-6 border-l-4 border-slate-900">
                           <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Activos</p>
                           <p className="text-3xl font-black">{properties.length}</p>
                        </div>
                        <div className="bg-slate-50 p-6 border-l-4 border-slate-900">
                           <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Edificios</p>
                           <p className="text-3xl font-black">{buildings.length}</p>
                        </div>
                        <div className="bg-slate-50 p-6 border-l-4 border-slate-900">
                           <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Departamentos</p>
                           <p className="text-3xl font-black">{properties.filter(p => p.type === 'DEPARTAMENTO').length}</p>
                        </div>
                    </div>

                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-slate-100 border-y border-black">
                             <th className="p-2 text-[10px] font-black uppercase">Edificio</th>
                             <th className="p-2 text-[10px] font-black uppercase">Piso</th>
                             <th className="p-2 text-[10px] font-black uppercase">Unidad</th>
                             <th className="p-2 text-[10px] font-black uppercase">Dirección</th>
                             <th className="p-2 text-[10px] font-black uppercase text-center">Tipo</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-200">
                          {properties.map(p => (
                             <tr key={p.id} className="text-[9px]">
                                <td className="p-2 font-black uppercase">{p.building}</td>
                                <td className="p-2 text-center">{p.floor}</td>
                                <td className="p-2 font-mono font-bold">{p.code}</td>
                                <td className="p-2 uppercase">{p.address}</td>
                                <td className="p-2 text-center font-bold text-slate-500">{p.type}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>

                    <div className="mt-auto pt-10 border-t border-slate-200 flex justify-between items-end">
                        <div className="text-[8px] font-mono text-slate-400 italic">ID_REPORTE: {reportFolio}</div>
                        <div className="w-64 text-center border-t border-black pt-4">
                            <p className="text-[10px] font-black uppercase text-black">{currentUser}</p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Control Interno</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
      {/* DRAFTS MODAL */}
      {isDraftsModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Borradores de Importación</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestión de cargas pendientes</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDraftsModalOpen(false)}
                className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {isLoadingDrafts ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 size={40} className="text-indigo-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando borradores...</p>
                </div>
              ) : drafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <Database size={32} />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay borradores pendientes</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {drafts.map((draft) => (
                    <div 
                      key={draft.id}
                      className="p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group cursor-pointer flex items-center justify-between"
                      onClick={() => {
                        setSelectedDraft(draft);
                        setIsDraftsModalOpen(false);
                        setIsIntelligentImportOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                          <FileSpreadsheet size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{draft.fileName}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(draft.timestamp).toLocaleString()}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className="text-[10px] font-bold text-indigo-600 uppercase">{draft.rows?.length || 0} filas</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {viewingAppraisal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-6xl h-full rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <FileUp size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Copia Digital de Tasación</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{viewingAppraisal.building} - {viewingAppraisal.code}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingAppraisal(null)}
                className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 bg-slate-800 p-4">
              {viewingAppraisal.appraisalDocumentUrl ? (
                <iframe 
                  src={viewingAppraisal.appraisalDocumentUrl} 
                  className="w-full h-full rounded-2xl border-none"
                  title="Documento de Tasación"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <AlertTriangle size={48} className="mb-4" />
                  <p className="font-bold uppercase tracking-widest">No hay copia digital disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SURCHARGE AUDIT MODAL */}
      {isSurchargeAuditOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm border border-rose-100">
                  <Sparkles size={24} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                    Auditoría de Sobretasa Territorial
                    <span className="px-2 py-0.5 text-[8px] font-black bg-rose-100 text-rose-700 rounded-full tracking-widest uppercase">Ley 21.210 Art. 7 bis</span>
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Simulación y prorrateo progresivo sobre avalúos fiscales acumulados por propietario</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSurchargeAuditOpen(false)}
                className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50 space-y-8 animate-in fade-in duration-200">
              {/* PARAMETERS & INSTRUCTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200/60 p-6 rounded-[24px] shadow-sm space-y-4">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Parámetros de Simulación</h4>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 block">Valor UTA Estimada (CLP)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">$</span>
                      <input 
                        type="number" 
                        value={utaAuditValue} 
                        onChange={(e) => setUtaAuditValue(Math.max(1, Number(e.target.value)))} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Mínimo Exento Territorial</span>
                    </div>
                    <p className="text-[10px] font-bold text-amber-700 leading-normal">
                      Surtax applies starting when cumulative territorial appraisal exceeds 670 UTA (approx. {formatCLP(670 * utaAuditValue)}). Proportional distribution is automatically calculated in real-time.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/60 p-6 rounded-[24px] shadow-sm lg:col-span-2 space-y-4">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Tramo de Impuesto Progresivo (Tasa Anual Marginal)</h4>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-50/70 p-4 border border-slate-100 rounded-xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Tramo 1 (Exento)</p>
                      <p className="text-xs font-black text-slate-700 mt-1">≤ 670 UTA</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">Exento (0%)</p>
                    </div>
                    <div className="bg-rose-50/30 p-4 border border-rose-100/50 rounded-xl">
                      <p className="text-[8px] font-black text-rose-500 uppercase">Tramo 2</p>
                      <p className="text-xs font-black text-slate-700 mt-1">&gt; 670 a 1.340 UTA</p>
                      <p className="text-[9px] font-bold text-rose-600 mt-1">0.075% anual</p>
                    </div>
                    <div className="bg-rose-50/50 p-4 border border-rose-100/70 rounded-xl">
                      <p className="text-[8px] font-black text-rose-500 uppercase">Tramo 3</p>
                      <p className="text-xs font-black text-slate-700 mt-1">&gt; 1.340 a 2.010 UTA</p>
                      <p className="text-[9px] font-bold text-rose-600 mt-1">0.150% anual</p>
                    </div>
                    <div className="bg-rose-50/75 p-4 border border-rose-200 rounded-xl">
                      <p className="text-[8px] font-black text-rose-600 uppercase">Tramo 4</p>
                      <p className="text-xs font-black text-slate-700 mt-1">&gt; 2.010 UTA</p>
                      <p className="text-[9px] font-bold text-rose-700 mt-1">0.275% anual</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    * La sobretasa se calcula en base a la sumatoria de avalúos de los bienes raíces de un mismo contribuyente en territorio nacional chileno (Art. 7 bis Ley 21.210). El sistema consolida y distribuye matemáticamente los montos de sobretasa a cada activo inmobiliario registrado.
                  </div>
                </div>
              </div>

              {/* STATS OVERVIEW */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/50 p-5 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Activos de Cartera</span>
                  <span className="text-xl font-black text-slate-800">{properties.length} u.</span>
                </div>
                <div className="bg-white border border-slate-200/50 p-5 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Avalúo Fiscal Consolidado</span>
                  <span className="text-xl font-black text-slate-800">{formatCLP(properties.reduce((acc, p) => acc + (p.appraisalValue || 0), 0))}</span>
                </div>
                <div className="bg-white border border-slate-200/50 p-5 rounded-2xl">
                  <span className="text-[9px] font-bold text-rose-600 uppercase tracking-widest block">Excedente Exento de Cartera</span>
                  <span className="text-xl font-black text-rose-700">
                    {formatCLP(dbSurchargeResults.reduce((acc, r) => acc + r.taxableAppraisal, 0))}
                  </span>
                </div>
                <div className="bg-white border border-rose-200 p-5 rounded-2xl bg-rose-50/10">
                  <span className="text-[9px] font-bold text-rose-700 uppercase tracking-widest block">Sobretasa Total Anual SIMULADA</span>
                  <span className="text-xl font-black text-rose-700">
                    {formatCLP(dbSurchargeResults.reduce((acc, r) => acc + r.totalSurcharge, 0))}
                  </span>
                </div>
              </div>

              {/* MAIN AUDIT TABLE */}
              <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Consolidado por Propietario Tributario</h4>
                  <button 
                    onClick={() => {
                      const data = dbSurchargeResults.map(r => ({
                        'Propietario': r.ownerName,
                        'Activos Propios': r.propertiesBreakdown.length,
                        'Avalúo Acumulado CLP': r.totalAppraisal,
                        'Tramo Exento (670 UTA)': r.exemptAmount,
                        'Monto Gravable CLP': r.taxableAppraisal,
                        'Sobretasa Total Anual CLP': r.totalSurcharge
                      }));
                      exportToExcel(data, `Auditoria_Sobretasas_Ley21210_${new Date().toISOString().split('T')[0]}`, 'Auditoria_Consolidado');
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all font-black text-[9px] text-emerald-800 uppercase"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-700" />
                    Exportar Informe de Auditoría
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[9px] text-slate-500 font-bold uppercase">
                        <th className="p-4">Propietario</th>
                        <th className="p-4 text-center">Unidades</th>
                        <th className="p-4">Avalúo Consolidado</th>
                        <th className="p-4">Exento Deductible (670 UTA)</th>
                        <th className="p-4">Avalúo Base Tasa</th>
                        <th className="p-4 text-emerald-700">Tasa Equivalente Efectiva</th>
                        <th className="p-4 text-right text-rose-700">Sobretasa Total CLP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {dbSurchargeResults.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-400 uppercase tracking-wider font-bold text-[10px]">No hay propietarios ni avalúos configurados para realizar la auditoría</td>
                        </tr>
                      ) : dbSurchargeResults.map((r, index) => {
                        const rate = r.totalAppraisal > 0 ? (r.totalSurcharge / r.totalAppraisal) * 100 : 0;
                        return (
                          <React.Fragment key={index}>
                            <tr className="hover:bg-slate-50/50">
                              <td className="p-4 font-black text-slate-800 uppercase select-all">{r.ownerName}</td>
                              <td className="p-4 text-center font-bold">{r.propertiesBreakdown.length} u.</td>
                              <td className="p-4 font-bold">{formatCLP(r.totalAppraisal)}</td>
                              <td className="p-4 text-slate-500 font-mono">{formatCLP(r.exemptAmount)}</td>
                              <td className="p-4 font-mono">{formatCLP(r.taxableAppraisal)}</td>
                              <td className="p-4 text-emerald-700 font-black font-mono">
                                {rate > 0 ? `${rate.toFixed(4)}%` : '0.00%'}
                              </td>
                              <td className="p-4 text-right font-black text-rose-700 font-mono select-all">
                                {formatCLP(r.totalSurcharge)}
                              </td>
                            </tr>
                            {/* Properties breakdown under key */}
                            {r.propertiesBreakdown.length > 0 && (
                              <tr className="bg-rose-50/5">
                                <td colSpan={7} className="px-8 py-3 bg-slate-50/30">
                                  <div className="rounded-xl border border-dashed border-slate-200 overflow-hidden">
                                    <table className="w-full text-left text-[10px]">
                                      <thead>
                                        <tr className="bg-slate-100/50 text-[8px] font-bold text-slate-400 uppercase">
                                          <th className="px-4 py-2">Inmueble ID/Código</th>
                                          <th className="px-4 py-2">Dirección Completa</th>
                                          <th className="px-4 py-2">Avalúo Individual</th>
                                          <th className="px-4 py-2 text-right text-rose-500">Prorrateo Sobretasa CLP</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-medium">
                                        {r.propertiesBreakdown.map((prop, px) => (
                                          <tr key={px} className="hover:bg-white transition-all text-[9.5px]">
                                            <td className="px-4 py-2 font-black text-slate-700">{prop.code}</td>
                                            <td className="px-4 py-2 text-slate-500 uppercase">{prop.address}</td>
                                            <td className="px-4 py-2 font-mono">{formatCLP(prop.appraisalValue)}</td>
                                            <td className="px-4 py-2 text-right font-black text-rose-600 font-mono">
                                              {formatCLP(prop.proportionalSurcharge)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-10 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 animate-in slide-in-from-bottom duration-150">
              <button 
                onClick={() => setIsSurchargeAuditOpen(false)}
                className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all shadow-sm"
              >
                Cerrar Auditoría
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MASTER LOOKUP / VISUAL ASSIST MODAL */}
      {activeLookupField && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0B3C5D] to-[#104470] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-emerald-400" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    CONSULTA DE MAESTROS DE ATRIBUTOS (F980011-UDC)
                  </h3>
                  <p className="text-[9px] font-bold text-slate-200 uppercase tracking-widest mt-0.5">
                    {activeLookupField === 'commune' && 'Maestro de Comunas y Jurisdicciones'}
                    {activeLookupField === 'useType' && 'Maestro de Usos Permitidos'}
                    {activeLookupField === 'type' && 'Maestro de Clasificación de Estructuras'}
                    {activeLookupField === 'destination' && 'Maestro de Destinos Tributarios'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveLookupField(null);
                  setLookupSearchTerm('');
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Escriba para buscar o filtrar valores..."
                  value={lookupSearchTerm}
                  onChange={e => setLookupSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0B3C5D] transition-all"
                  autoFocus
                />
                <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
              </div>
            </div>

            {/* Modal Body / Selection Table */}
            <div className="flex-1 overflow-y-auto max-h-[50vh]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[9px] text-slate-500 font-black uppercase">
                    <th className="p-3 pl-6">Valor / Código</th>
                    <th className="p-3">Descripción / Categoría</th>
                    <th className="p-3 pr-6 text-center">Activos Vinculados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {lookupOptions.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                        No se encontraron registros en el maestro
                      </td>
                    </tr>
                  ) : (
                    lookupOptions.map((opt, index) => (
                      <tr 
                        key={index}
                        onClick={() => {
                          if (activeLookupField === 'commune') setColSearchComuna(opt.value);
                          else if (activeLookupField === 'useType') setColSearchUso(opt.value);
                          else if (activeLookupField === 'type') setColSearchTipo(opt.value);
                          else if (activeLookupField === 'destination') setColSearchDestino(opt.value);
                          
                          setActiveLookupField(null);
                          setLookupSearchTerm('');
                          notify('Filtrado Exitoso', `Filtro de maestro aplicado: ${opt.value}`, 'success');
                        }}
                        className="hover:bg-emerald-50/40 cursor-pointer transition-colors group"
                      >
                        <td className="p-3 pl-6 font-black text-[#0B3C5D] uppercase tracking-wider group-hover:text-emerald-700">
                          {opt.value}
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {opt.description}
                        </td>
                        <td className="p-3 pr-6 text-center">
                          {opt.count > 0 ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[8px] uppercase tracking-widest">
                              {opt.count} unidades
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-400 font-medium rounded-full text-[8px] uppercase tracking-widest">
                              0 unidades
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-bold">
              <span>Haga clic en una fila para seleccionarla e insertarla en el filtro de columna.</span>
              <button
                type="button"
                onClick={() => {
                  setActiveLookupField(null);
                  setLookupSearchTerm('');
                }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors uppercase font-black tracking-wider text-[9px] shadow-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {inspectTarget && (
        <F980011DModal
          isOpen={!!inspectTarget}
          onClose={() => setInspectTarget(null)}
          registryId={inspectTarget.id || ''}
          entityType="PROPERTY"
          originalData={inspectTarget}
          currentUser={currentUser}
        />
      )}

      {/* ERP CONTEXT MENU */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={!!gridContextMenu}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P1501"
          programTitle="Maestro de Unidades Inmobiliarias"
          collectionName="properties"
          recordId={gridContextMenu.prop.id}
          recordFolio={gridContextMenu.prop.code || gridContextMenu.prop.building}
          onClose={() => setGridContextMenu(null)}
          onViewDetail={() => {
            setEditingProperty(gridContextMenu.prop);
            setTempAppraisalFile(gridContextMenu.prop.appraisalDocumentUrl ? { url: gridContextMenu.prop.appraisalDocumentUrl, name: gridContextMenu.prop.appraisalDocumentName || 'Tasación' } : null);
            setIsFormOpen(true);
            setGridContextMenu(null);
          }}
          onExportExcel={() => {
            handleExportExcel();
            setGridContextMenu(null);
          }}
          onSetRowHeight={setDefaultRowHeight}
          onResetColumns={resetWidths}
          onResetRows={resetHeights}
          onResetGridDimensions={resetAll}
        />
      )}
    </div>
  );
};

export default PropertyPoolSheet;
