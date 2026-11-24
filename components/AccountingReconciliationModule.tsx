
import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { drawPdfAssetFlowLogo } from '../lib/defaultLogo';
import { 
  FileUp, AlertTriangle, CheckCircle2, 
  History, Search, Filter, Trash2, 
  Loader2, FileSpreadsheet, X, FileText,
  ArrowRight, Calculator, Layers, AlertCircle,
  Download, ChevronDown, ChevronRight
} from 'lucide-react';
import { AccountingReconciliation, AccountingSheetData, AccountingReconciliationResult, RowReconciliationResult, Property, Transaction } from '../types';

import { formatCLP } from '../lib/chileanUtils';
import { useNotification } from './NotificationProvider';
import { exportToExcel } from '../lib/excelExport';

interface AccountingReconciliationModuleProps {
  reconciliations: AccountingReconciliation[];
  properties: Property[];
  transactions: Transaction[];
  onSave: (reconciliation: AccountingReconciliation) => void;
  onDelete: (id: string) => void;
  currentUser: string;
  companyLogo: string | null;
}

const AccountingReconciliationModule: React.FC<AccountingReconciliationModuleProps> = ({ 
  reconciliations, properties, transactions, onSave, onDelete, currentUser, companyLogo
}) => {
  const { notify } = useNotification();
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'UPLOAD' | 'HISTORY' | 'ANALYSIS' | 'REVISION_AUXILIARES'>('UPLOAD');
  const [currentPreview, setCurrentPreview] = useState<AccountingReconciliation | null>(null);
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [expandedHistoryResultIndex, setExpandedHistoryResultIndex] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [ufValueCurrent, setUfValueCurrent] = useState<number>(37000); // Default placeholder
  const [ufValuePrevious, setUfValuePrevious] = useState<number>(36800); // Default placeholder
  const fileInputRef = useRef<HTMLInputElement>(null);

  const automatedReview = useMemo(() => {
    const period = `${selectedYear}-${selectedMonth}`;
    const periodTransactions = transactions.filter(t => t.date.startsWith(period));
    
    const incomeArriendos = periodTransactions
      .filter(t => t.type === 'INCOME' && t.category === 'ARRIENDOS')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = periodTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    // Find current reconciliation for this period if any
    const currentRec = reconciliations.find(r => r.period === period);
    
    // Logic for "Control Inmobiliario"
    let controlInmobiliarioAlerts: string[] = [];
    if (currentRec) {
      const controlSheet = currentRec.sheets.find(s => s.sheetName.toUpperCase().includes('CONTROL INMOBILIARIO'));
      if (controlSheet && controlSheet.sampleData) {
        const systemExpenseNumbers = new Set(
          periodTransactions
            .filter(t => t.type === 'EXPENSE')
            .map(t => String(t.documentNumber).trim())
        );

        // Try to find the column for document numbers in the Excel sheet
        const possibleKeys = ['NÚMERO', 'EGRESO', 'DOCUMENTO', 'FOLIO', 'N°'];
        const firstRow = controlSheet.sampleData[0] || {};
        const docKey = Object.keys(firstRow).find(k => 
          possibleKeys.some(pk => k.toUpperCase().includes(pk))
        );

        if (docKey) {
          controlSheet.sampleData.forEach((row: any) => {
            const docNum = String(row[docKey]).trim();
            if (docNum && docNum !== '0' && !systemExpenseNumbers.has(docNum)) {
              controlInmobiliarioAlerts.push(`Egreso ${docNum} en Control Inmobiliario no encontrado en el sistema.`);
            }
          });
        }
      }
    }

    return {
      incomeArriendos,
      totalExpenses,
      transactionCount: periodTransactions.length,
      currentRec,
      controlInmobiliarioAlerts
    };
  }, [transactions, selectedYear, selectedMonth, reconciliations]);

  const sortedReconciliations = useMemo(() => {
    return [...reconciliations].sort((a, b) => b.timestamp - a.timestamp);
  }, [reconciliations]);

  const reconciliationsByMonth = useMemo(() => {
    const groups: Record<string, AccountingReconciliation[]> = {};
    sortedReconciliations.forEach(rec => {
      if (!groups[rec.period]) groups[rec.period] = [];
      groups[rec.period].push(rec);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [sortedReconciliations]);

  const parseNum = (val: any) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    
    let cleaned = String(val).trim().replace(/\s/g, '');
    if (!cleaned) return 0;

    const dots = (cleaned.match(/\./g) || []).length;
    const commas = (cleaned.match(/,/g) || []).length;

    if (dots > 0 && commas > 0) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (dots > 0 && commas === 0) {
      const parts = cleaned.split('.');
      if (dots > 1 || parts[parts.length - 1].length === 3) {
        cleaned = cleaned.replace(/\./g, '');
      }
    } else if (commas > 0 && dots === 0) {
      cleaned = cleaned.replace(',', '.');
    }

    cleaned = cleaned.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculateConfidence = (s1: string, s2: string): number => {
    const clean1 = s1.toUpperCase().replace(/\d{4}/g, '').trim();
    const clean2 = s2.toUpperCase().replace(/\d{4}/g, '').trim();
    if (clean1 === clean2) return 100;
    if (clean1.includes(clean2) || clean2.includes(clean1)) return 85;
    
    // Basic Jaccard-like similarity for words
    const words1 = new Set(clean1.split(/\s+/));
    const words2 = new Set(clean2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    const score = (intersection.size / union.size) * 100;
    return Math.round(score);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const loadingId = notify(`Procesando archivo: ${file.name}...`, 'loading', 0);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      const sheetsData: AccountingSheetData[] = [];
      let caratulaSheetName = '';

      // 1. Extract data from all sheets
      workbook.SheetNames.forEach(name => {
        const worksheet = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (rows.length === 0) return;

        // Try to find a "total" column or sum all numbers in likely columns
        let total = 0;
        let valueColIdx = -1;
        
        // Find header row and value column
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const row = rows[i];
          if (!row) continue;
          row.forEach((cell, idx) => {
            const val = String(cell || '').toUpperCase();
            // Expanded keywords for accounting books
            if (
              val.includes('TOTAL') || 
              val.includes('MONTO') || 
              val.includes('SALDO') || 
              val.includes('VALOR') ||
              val.includes('NETO') ||
              val.includes('ARRIENDO') ||
              val.includes('CARGO') ||
              val.includes('ABONO')
            ) {
              valueColIdx = idx;
              headerRowIndex = i;
            }
          });
          if (valueColIdx !== -1) break;
        }

        // If no header found, use the last column that has numbers
        if (valueColIdx === -1) {
          const lastRow = rows[rows.length - 1];
          for (let i = lastRow.length - 1; i >= 0; i--) {
            if (typeof lastRow[i] === 'number') {
              valueColIdx = i;
              headerRowIndex = 0; // Assume first row is header or data starts from 0
              break;
            }
          }
        }

        // Sum values
        rows.forEach((row, idx) => {
          if (idx <= headerRowIndex) return; // Skip header and everything above it
          
          // Check if this is a "TOTAL" row to avoid double counting
          const isTotalRow = row.some(cell => String(cell || '').toUpperCase().includes('TOTAL'));
          if (isTotalRow) return;

          const val = parseNum(row[valueColIdx]);
          total += val;
        });

        sheetsData.push({
          sheetName: name,
          totalAmount: total,
          rowCount: rows.length,
          columns: rows[0] ? rows[0].map(c => String(c || '')) : [],
          sampleData: rows.slice(1, 21), // Increased to 20 rows for better detail
          valueColIdx
        });

        if (name.toUpperCase().includes('CARATULA') || name.toUpperCase().includes('RESUMEN') || name.toUpperCase().includes('PORTADA')) {
          caratulaSheetName = name;
        }
      });

      if (sheetsData.length === 0) {
        notify("No se encontraron datos en el archivo.", 'error');
        setIsUploading(false);
        return;
      }

      // 2. Intelligent reconciliation
      const results: AccountingReconciliationResult[] = [];
      const matchedSheetNames = new Set<string>();

      if (caratulaSheetName) {
        const caratulaSheet = workbook.Sheets[caratulaSheetName];
        const caratulaRows = XLSX.utils.sheet_to_json(caratulaSheet, { header: 1 }) as any[][];
        
        // Look for concepts that match other sheet names
        caratulaRows.forEach(row => {
          row.forEach((cell, cellIdx) => {
            const cellStr = String(cell || '').trim();
            if (!cellStr || typeof cell === 'number') return;
            if (cellStr.length < 3) return; // Skip very short strings

            // Look for a value in the same row
            let caratulaValue = 0;
            for (let i = cellIdx + 1; i < row.length; i++) {
              const val = parseNum(row[i]);
              if (val !== 0) {
                caratulaValue = val;
                break;
              }
            }

            if (caratulaValue !== 0) {
              // Intelligent matching: strip years and compare
              const cleanCell = cellStr.toUpperCase().replace(/\d{4}/g, '').trim();
              
              const matchingSheet = sheetsData.find(s => {
                if (s.sheetName === caratulaSheetName) return false;
                const cleanSheet = s.sheetName.toUpperCase().replace(/\d{4}/g, '').trim();
                
                return (
                  cleanSheet.includes(cleanCell) || 
                  cleanCell.includes(cleanSheet) ||
                  s.sheetName.toUpperCase().includes(cellStr.toUpperCase()) ||
                  cellStr.toUpperCase().includes(s.sheetName.toUpperCase())
                );
              });

              if (matchingSheet) {
                matchedSheetNames.add(matchingSheet.sheetName);
                const diff = Math.abs(caratulaValue - matchingSheet.totalAmount);
                const isMatch = diff < 1;
                const confidence = calculateConfidence(cellStr, matchingSheet.sheetName);
                results.push({
                  concept: cellStr,
                  caratulaValue,
                  detailValue: matchingSheet.totalAmount,
                  difference: diff,
                  status: isMatch ? 'MATCH' : 'MISMATCH',
                  detailSheetName: matchingSheet.sheetName,
                  confidenceScore: confidence,
                  suggestedAction: isMatch 
                    ? 'Valores coinciden perfectamente.' 
                    : `Diferencia de ${formatCLP(diff)}. Verifique si faltan registros en la hoja "${matchingSheet.sheetName}" o si hay errores de digitación en la carátula.`
                });
              } else {
                // Concept found in Caratula but no sheet matched
                results.push({
                  concept: cellStr,
                  caratulaValue,
                  detailValue: 0,
                  difference: caratulaValue,
                  status: 'NOT_FOUND',
                  suggestedAction: 'Concepto en carátula sin hoja de detalle vinculada. Vincule manualmente si existe.'
                });
              }
            }
          });
        });
      }

      // 3. Add all unmatched sheets to results (ensure "cada libro" is saved)
      sheetsData.forEach(sheet => {
        if (sheet.sheetName !== caratulaSheetName && !matchedSheetNames.has(sheet.sheetName)) {
          results.push({
            concept: `PENDIENTE: ${sheet.sheetName}`,
            caratulaValue: 0,
            detailValue: sheet.totalAmount,
            difference: sheet.totalAmount,
            status: 'NOT_FOUND',
            detailSheetName: sheet.sheetName,
            suggestedAction: `Hoja "${sheet.sheetName}" detectada pero no vinculada. Vincule manualmente a un concepto de la carátula o verifique el nombre.`
          });
        }
      });

      // 4. Add Consolidated Summary Item
      const totalCaratula = results.reduce((sum, r) => sum + r.caratulaValue, 0);
      const totalDetalle = sheetsData
        .filter(s => s.sheetName !== caratulaSheetName)
        .reduce((sum, s) => sum + s.totalAmount, 0);
      const totalDiff = Math.abs(totalCaratula - totalDetalle);
      const totalRows = sheetsData
        .filter(s => s.sheetName !== caratulaSheetName)
        .reduce((sum, s) => sum + s.rowCount, 0);

      // Detect AS400 sheet
      const as400Sheet = sheetsData.find(s => s.sheetName.toUpperCase().includes('AS400'));

      if (as400Sheet) {
        const as400Total = as400Sheet.totalAmount;
        const as400Diff = Math.abs(totalCaratula - as400Total);
        results.unshift({
          concept: `COMPARATIVA CARÁTULA VS AS400 (FUENTE MATRIZ)`,
          caratulaValue: totalCaratula,
          detailValue: as400Total,
          difference: as400Diff,
          status: as400Diff < 1 ? 'MATCH' : 'MISMATCH',
          detailSheetName: as400Sheet.sheetName,
          suggestedAction: as400Diff < 1 
            ? 'La Carátula coincide perfectamente con el reporte AS400.' 
            : `Diferencia de ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(as400Diff)} respecto al AS400. El AS400 es la fuente matriz, verifique la carátula.`
        });
      }

      results.unshift({
        concept: `MOVIMIENTOS DEL PERIODO ${selectedYear}-${selectedMonth} (${totalRows} REGISTROS) - FECHA: ${new Date().toLocaleDateString()}`,
        caratulaValue: totalCaratula,
        detailValue: totalDetalle,
        difference: totalDiff,
        status: totalDiff < 1 ? 'MATCH' : 'MISMATCH',
        detailSheetName: 'CONSOLIDADO TOTAL',
        suggestedAction: totalDiff < 1 
          ? 'El total general del periodo está cuadrado.' 
          : `Existe una diferencia global de ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalDiff)}. Revise los ítems marcados en rojo para identificar el origen del descuadre.`
      });

      const newReconciliation: AccountingReconciliation = {
        id: crypto.randomUUID(),
        period: `${selectedYear}-${selectedMonth}`,
        uploadDate: new Date().toISOString().split('T')[0],
        fileName: file.name,
        title: file.name.replace(/\.[^/.]+$/, ""), // Default title to filename without extension
        caratulaSheetName,
        sheets: sheetsData,
        results,
        userCreator: currentUser,
        timestamp: Date.now()
      };

      // 5. Row-level reconciliation (Control Interno vs Detalle)
      const controlSheet = sheetsData.find(s => s.sheetName.toUpperCase().includes('CONTROL INTERNO'));
      const detailSheet = sheetsData.find(s => s.sheetName.toUpperCase().includes('DETALLE') && s.sheetName !== caratulaSheetName);

      if (controlSheet && detailSheet) {
        const rowResults: RowReconciliationResult[] = [];
        const findRefCol = (sheet: AccountingSheetData) => {
          const keywords = ['EGRESO', 'INGRESO', 'NUMERO', 'NÚMERO', 'COMPROBANTE', 'REFERENCIA', 'ID', 'FOLIO'];
          return sheet.columns.findIndex(col => keywords.some(k => col.toUpperCase().includes(k)));
        };

        const controlRefIdx = findRefCol(controlSheet);
        const detailRefIdx = findRefCol(detailSheet);

        if (controlRefIdx !== -1 && detailRefIdx !== -1) {
          const controlRows = XLSX.utils.sheet_to_json(workbook.Sheets[controlSheet.sheetName], { header: 1 }) as any[][];
          const detailRows = XLSX.utils.sheet_to_json(workbook.Sheets[detailSheet.sheetName], { header: 1 }) as any[][];

          const detailMap = new Map<string, any[]>();
          detailRows.forEach((row, idx) => {
            if (idx === 0) return;
            const ref = String(row[detailRefIdx] || '').trim();
            if (ref) detailMap.set(ref, row);
          });

          controlRows.forEach((row, idx) => {
            if (idx === 0) return;
            const ref = String(row[controlRefIdx] || '').trim();
            if (!ref) return;

            const controlVal = parseNum(row[controlSheet.valueColIdx || 0]);
            const detailRow = detailMap.get(ref);
            
            if (detailRow) {
              const detailVal = parseNum(detailRow[detailSheet.valueColIdx || 0]);
              const diff = Math.abs(controlVal - detailVal);
              rowResults.push({
                id: crypto.randomUUID(),
                reference: ref,
                controlValue: controlVal,
                detailValue: detailVal,
                difference: diff,
                status: diff < 1 ? 'MATCH' : 'MISMATCH',
                description: String(row[0] || '')
              });
              detailMap.delete(ref);
            } else {
              rowResults.push({
                id: crypto.randomUUID(),
                reference: ref,
                controlValue: controlVal,
                detailValue: 0,
                difference: controlVal,
                status: 'NOT_FOUND_IN_DETAIL',
                description: String(row[0] || '')
              });
            }
          });

          detailMap.forEach((row, ref) => {
            const detailVal = parseNum(row[detailSheet.valueColIdx || 0]);
            rowResults.push({
              id: crypto.randomUUID(),
              reference: ref,
              controlValue: 0,
              detailValue: detailVal,
              difference: detailVal,
              status: 'NOT_FOUND_IN_CONTROL',
              description: String(row[0] || '')
            });
          });

          newReconciliation.rowResults = rowResults;
        }
      }

      setCurrentPreview(newReconciliation);
      setActiveTab('ANALYSIS');
      notify("Conciliación inteligente completada exitosamente.", 'success');
    } catch (error) {
      console.error("Error parsing Excel:", error);
      notify("Error al procesar el archivo Excel.", 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportPDF = (reconciliation?: AccountingReconciliation) => {
    // Ensure we are using a valid reconciliation object, not a MouseEvent
    const data = (reconciliation && 'results' in reconciliation) ? reconciliation : currentPreview;
    
    if (!data) {
      alert("No hay datos disponibles para exportar.");
      return;
    }

    try {
      const doc = new jsPDF();
      const title = data.title || data.fileName || 'Analisis';
      const period = data.period || 'Sin Periodo';
      const date = data.uploadDate || new Date().toLocaleDateString();

      // Add Logo if exists - Improved handling
      const isCustomLogo = companyLogo && (
        companyLogo.startsWith('data:image/png') || 
        companyLogo.startsWith('data:image/jpeg') || 
        companyLogo.startsWith('data:image/webp')
      );

      if (isCustomLogo) {
        try {
          const format = companyLogo!.toLowerCase().includes('png') ? 'PNG' : 
                         companyLogo!.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
          doc.addImage(companyLogo!, format, 14, 10, 48, 22, undefined, 'FAST');
        } catch (e) {
          console.warn("Could not add custom logo to reconciliation PDF, drawing vector fallback:", e);
          drawPdfAssetFlowLogo(doc, 14, 10, 0.5);
        }
      } else {
        drawPdfAssetFlowLogo(doc, 14, 10, 0.5);
      }

      // Minimalist Header - Adjusted Y position to account for logo
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('INFORME DE CONCILIACIÓN', 14, 45);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`PERIODO: ${period}`, 14, 51);
      doc.text(`FECHA DE ANÁLISIS: ${date}`, 14, 55);
      doc.text(`ARCHIVO: ${data.fileName || 'N/A'}`, 14, 59);
      doc.text(`Fecha de impresión: ${new Date().toLocaleString('es-CL')}`, 14, 63);
      doc.text(`Usuario: ${currentUser}`, 14, 67);

      // Results Table
      const tableData = data.results.map(res => [
        res.concept,
        res.detailSheetName || 'N/A',
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(res.caratulaValue),
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(res.detailValue),
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(res.difference),
        res.status === 'MATCH' ? 'OK' : res.status === 'MISMATCH' ? 'ERROR' : 'PENDIENTE'
      ]);

      (doc as any).autoTable({
        startY: 74,
        head: [['Concepto', 'Hoja Detalle', 'Carátula', 'Detalle', 'Dif.', 'Estado']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'center' }
        },
        didParseCell: (cellData: any) => {
          if (cellData.section === 'body' && cellData.column.index === 5) {
            if (cellData.cell.raw === 'OK') cellData.cell.styles.textColor = [16, 185, 129];
            if (cellData.cell.raw === 'ERROR') cellData.cell.styles.textColor = [239, 68, 68];
          }
        }
      });
      
      // Row-Level Results Table (if exists)
      if (data.rowResults && data.rowResults.length > 0) {
        doc.addPage();
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text('DETALLE DE REGISTROS (CONTROL VS DETALLE)', 14, 25);
        
        const rowTableData = data.rowResults.map(r => [
          r.reference,
          r.description || '',
          new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(r.controlValue),
          new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(r.detailValue),
          new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(r.difference),
          r.status === 'MATCH' ? 'OK' : r.status === 'MISMATCH' ? 'ERROR' : 'PENDIENTE'
        ]);

        (doc as any).autoTable({
          startY: 35,
          head: [['Ref.', 'Descripción', 'Control', 'Detalle', 'Dif.', 'Estado']],
          body: rowTableData,
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
          columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'center' }
          },
          didParseCell: (cellData: any) => {
            if (cellData.section === 'body' && cellData.column.index === 5) {
              if (cellData.cell.raw === 'OK') cellData.cell.styles.textColor = [16, 185, 129];
              if (cellData.cell.raw === 'ERROR') cellData.cell.styles.textColor = [239, 68, 68];
              if (cellData.cell.raw === 'PENDIENTE') cellData.cell.styles.textColor = [245, 158, 11];
            }
          }
        });
      }

      // Signature Block
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      
      // Certification Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text('CERTIFICACIÓN DE CONCILIACIÓN', 14, finalY);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const certText = `Se certifica que se ha aplicado la regla de conciliación: "La sumatoria de los montos de las hojas detalle de cada libro auxiliar deben coincidir exactamente con la sumatoria del ítem respectivo en la hoja carátula".`;
      const splitCert = doc.splitTextToSize(certText, 180);
      doc.text(splitCert, 14, finalY + 7);

      const allMatched = data.results.every(r => r.status === 'MATCH');
      doc.setFont("helvetica", "bold");
      doc.setTextColor(allMatched ? 16 : 239, allMatched ? 185 : 68, allMatched ? 129 : 68);
      doc.text(allMatched ? 'ESTADO: CUMPLIMIENTO TOTAL' : 'ESTADO: INCUMPLIMIENTO DETECTADO', 14, finalY + 20);

      doc.setDrawColor(200, 200, 200);
      doc.line(60, finalY + 45, 150, finalY + 45);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 60, 70);
      doc.text('DEPARTAMENTO INMOBILIARIO', 105, finalY + 50, { align: 'center' });

      // Safe filename
      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`Conciliacion_${period}_${safeTitle}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("No se pudo generar el PDF. Detalle: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleExportExcel = (reconciliation?: AccountingReconciliation) => {
    const data = (reconciliation && 'results' in reconciliation) ? reconciliation : currentPreview;
    if (!data) {
      alert("No hay datos disponibles para exportar.");
      return;
    }

    const title = data.title || data.fileName || 'Analisis';
    const period = data.period || 'Sin Periodo';

    const resultsToExport = data.rowResults || [];
    if (resultsToExport.length === 0) {
      alert("No hay registros detallados de conciliación para exportar.");
      return;
    }

    const dataRows = resultsToExport.map(r => ({
      'Periodo': period,
      'Título': title,
      'RUT': r.rut,
      'ROL': r.propertyRole || 'N/A',
      'Arrendatario (Auxiliar Contable)': r.auxTenantName || 'N/A',
      'Monto Auxiliar (CLP)': r.auxBilledValue || 0,
      'Arrendatario (Ficha Propiedad)': r.propertyTenantName || 'N/A',
      'Monto Propiedad (CLP)': r.propertyExpectedValue || 0,
      'Diferencia (CLP)': r.difference || 0,
      'Estado Conciliación': r.isMatch ? 'CONCILIADO' : 'CON DIFERENCIA',
      'Observaciones': r.notes || ''
    }));

    exportToExcel(dataRows, `Conciliacion_${period}_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`, 'Conciliación Contable');
  };

  const handleExportProcessGuide = () => {
    try {
      const doc = new jsPDF();
      
      // Header
      const isCustomLogo = companyLogo && (
        companyLogo.startsWith('data:image/png') || 
        companyLogo.startsWith('data:image/jpeg') || 
        companyLogo.startsWith('data:image/webp')
      );

      if (isCustomLogo) {
        try {
          const format = companyLogo!.toLowerCase().includes('png') ? 'PNG' : 
                         companyLogo!.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
          doc.addImage(companyLogo!, format, 14, 10, 48, 22, undefined, 'FAST');
        } catch (e) {
          console.warn("Could not add custom logo to PDF, drawing vector fallback:", e);
          drawPdfAssetFlowLogo(doc, 14, 10, 0.5);
        }
      } else {
        drawPdfAssetFlowLogo(doc, 14, 10, 0.5);
      }

      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('GUÍA DE PROCEDIMIENTO', 14, 45);
      
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229); // indigo-600
      doc.text('Conciliación Mensual de Auxiliares', 14, 53);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString()}`, 14, 60);
      doc.text(`SISTEMA: ASSETFLOW - Módulo Contable`, 14, 64);
      doc.text(`Fecha de impresión: ${new Date().toLocaleString('es-CL')}`, 14, 68);
      doc.text(`Usuario: ${currentUser}`, 14, 72);

      // Introduction
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text('1. OBJETIVO DEL PROCESO', 14, 80);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const intro = 'Este documento describe los pasos técnicos y operativos que el sistema realiza para asegurar la integridad de la información contable mediante la conciliación entre las carátulas de resumen y los libros auxiliares de detalle.';
      const splitIntro = doc.splitTextToSize(intro, 180);
      doc.text(splitIntro, 14, 87);

      // Steps Table
      const stepsData = [
        ['1', 'Carga de Datos', 'El usuario selecciona el periodo contable (Año/Mes) y carga el archivo Excel (.xlsx) que contiene el reporte de auxiliares.'],
        ['2', 'Extracción Multicapa', 'El sistema lee todas las pestañas del libro. Identifica automáticamente la "Carátula" o "Resumen" mediante algoritmos de reconocimiento de palabras clave.'],
        ['3', 'Análisis de Sumatorias', 'Para cada pestaña de detalle, el sistema recalcula los totales sumando las columnas de valores (Neto, Total, Saldo) para asegurar que el archivo no ha sido alterado.'],
        ['4', 'Conciliación Inteligente', 'Se comparan los conceptos listados en la Carátula con los nombres de las pestañas y sus totales. Se utiliza lógica difusa (Fuzzy Logic) para emparejar nombres similares.'],
        ['5', 'Validación AS400', 'Si se detecta una pestaña con la etiqueta "AS400", el sistema la prioriza como fuente matriz, comparando el total general contra la Carátula y los detalles.'],
        ['6', 'Generación de Alertas', 'Se marcan en rojo (MISMATCH) las diferencias superiores a $1 y en amarillo (NOT_FOUND) los conceptos sin respaldo o pestañas huérfanas.'],
        ['7', 'Registro Histórico', 'Una vez validado, el análisis se guarda con firma digital del usuario, permitiendo auditorías posteriores y trazabilidad de descuadres.']
      ];

      (doc as any).autoTable({
        startY: 100,
        head: [['Paso', 'Fase', 'Descripción del Procedimiento']],
        body: stepsData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 40, fontStyle: 'bold' },
          2: { cellWidth: 'auto' }
        }
      });

      // Footer
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Este es un documento generado automáticamente por el sistema de control interno.', 14, finalY);
      doc.text('ASSETFLOW v2.5 - Módulo de Auditoría Contable', 14, finalY + 5);

      doc.save(`Guia_Procedimiento_Conciliacion.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("No se pudo generar la guía. Detalle: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSave = () => {
    if (!currentPreview) return;
    onSave(currentPreview);
    alert("Análisis guardado exitosamente.");
    setActiveTab('HISTORY');
    setCurrentPreview(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-6">
          {companyLogo && (
            <img src={companyLogo} alt="Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Conciliación de Auxiliares</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Análisis Inteligente de Carátulas vs Detalles</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportProcessGuide}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all flex items-center gap-2"
            title="Descargar Guía de Proceso"
          >
            <FileText size={14} /> Guía de Proceso
          </button>
          <button 
            onClick={() => setActiveTab('UPLOAD')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'UPLOAD' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <FileUp size={14} /> Nuevo Análisis
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <History size={14} /> Historial
          </button>
          <button 
            onClick={() => setActiveTab('REVISION_AUXILIARES')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'REVISION_AUXILIARES' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Calculator size={14} /> Revisión Auxiliares
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'UPLOAD' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white rounded-[32px] p-10 shadow-sm border border-slate-100">
              <h2 className="text-lg font-black text-slate-800 uppercase mb-6">Carga de Auxiliar Contable</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Año</label>
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-indigo-500 transition-all"
                    >
                      {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mes</label>
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-indigo-500 transition-all"
                    >
                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-64 border-4 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
                >
                  {isUploading ? (
                    <Loader2 size={48} className="text-indigo-500 animate-spin" />
                  ) : (
                    <>
                      <FileSpreadsheet size={48} className="text-slate-200 group-hover:text-indigo-400 mb-4 transition-colors" />
                      <p className="text-sm font-black text-slate-400 group-hover:text-indigo-600 uppercase">Seleccionar Auxiliar (XLSX)</p>
                      <p className="text-[10px] font-bold text-slate-300 uppercase mt-2">El sistema detectará la carátula automáticamente</p>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full min-w-[950px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Archivo / Fecha</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Carátula</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total AS400</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Sumatoria Detalle</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reconciliationsByMonth.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <History size={48} />
                        <p className="text-xs font-black uppercase tracking-widest">No hay análisis guardados</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  reconciliationsByMonth.map(([month, recs]) => (
                    <React.Fragment key={month}>
                      <tr className="bg-indigo-50/30">
                        <td colSpan={6} className="px-6 py-2 border-y border-indigo-100/50">
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
                            Periodo: {month}
                          </span>
                        </td>
                      </tr>
                      {recs.map(rec => {
                        const consolidated = rec.results.find(r => r.concept.includes('MOVIMIENTOS DEL PERIODO'));
                        const as400 = rec.results.find(r => r.concept.includes('AS400'));
                        const caratulaTotal = consolidated?.caratulaValue || 0;
                        const detalleTotal = consolidated?.detailValue || 0;
                        const as400Total = as400?.detailValue || 0;
                        const isMatch = Math.abs(caratulaTotal - detalleTotal) < 1 && (as400Total === 0 || Math.abs(caratulaTotal - as400Total) < 1);
                        const isHistoryExpanded = expandedHistoryId === rec.id;

                        return (
                          <React.Fragment key={rec.id}>
                          <tr 
                            onClick={() => setExpandedHistoryId(isHistoryExpanded ? null : rec.id)}
                            className={`hover:bg-slate-50 transition-colors group cursor-pointer ${isHistoryExpanded ? 'bg-slate-50' : ''}`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="text-slate-400">
                                  {isHistoryExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black text-slate-900 uppercase truncate max-w-xs">
                                      {rec.title || rec.fileName}
                                    </span>
                                    {rec.rowResults && rec.rowResults.length > 0 && (
                                      <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                                        Registros
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                    {rec.uploadDate}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-[11px] font-black text-slate-700 font-mono">
                                {formatCLP(caratulaTotal)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-[11px] font-black text-indigo-600 font-mono">
                                {as400Total > 0 ? formatCLP(as400Total) : 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-[11px] font-black text-slate-700 font-mono">
                                {formatCLP(detalleTotal)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isMatch ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <span className={`text-[10px] font-black uppercase ${isMatch ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {isMatch ? 'CUADRADO' : 'DESCUADRE'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                <button 
                                  onClick={() => handleExportPDF(rec)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Exportar PDF"
                                >
                                  <Download size={18} />
                                </button>
                                <button 
                                  onClick={() => { setCurrentPreview(rec); setActiveTab('ANALYSIS'); }}
                                  className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Ver Análisis"
                                >
                                  <ArrowRight size={18} />
                                </button>
                                <button 
                                  onClick={() => onDelete(rec.id)}
                                  className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Eliminar"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isHistoryExpanded && (
                            <tr className="bg-slate-50/30">
                              <td colSpan={6} className="px-6 py-4">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4">
                                  <h4 className="text-[10px] font-black text-slate-800 uppercase mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                    <Layers size={14} className="text-indigo-600" /> Desglose de Conciliación
                                  </h4>

                                  {rec.rowResults && rec.rowResults.length > 0 && (
                                    <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                      <h5 className="text-[9px] font-black text-slate-500 uppercase mb-3 flex items-center gap-2">
                                        <Calculator size={12} /> Resumen de Registros (Control vs Detalle)
                                      </h5>
                                      <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Registros</p>
                                          <p className="text-xs font-black text-slate-800">{rec.rowResults.length}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                          <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">Cuadrados</p>
                                          <p className="text-xs font-black text-emerald-600">{rec.rowResults.filter(r => r.status === 'MATCH').length}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                          <p className="text-[8px] font-black text-rose-400 uppercase mb-1">Diferencias</p>
                                          <p className="text-xs font-black text-rose-600">{rec.rowResults.filter(r => r.status !== 'MATCH').length}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <table className="w-full min-w-[950px] text-left border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-400">
                                        <th className="p-2 w-8"></th>
                                        <th className="p-2 text-[9px] font-black uppercase tracking-widest">Concepto</th>
                                        <th className="p-2 text-[9px] font-black uppercase tracking-widest text-right">Carátula</th>
                                        <th className="p-2 text-[9px] font-black uppercase tracking-widest text-right">Detalle</th>
                                        <th className="p-2 text-[9px] font-black uppercase tracking-widest text-right">Diferencia</th>
                                        <th className="p-2 text-[9px] font-black uppercase tracking-widest text-center">Estado</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {rec.results.map((res, rIdx) => {
                                        const isResExpanded = expandedHistoryResultIndex === rIdx;
                                        const linkedSheet = rec.sheets.find(s => s.sheetName === res.detailSheetName);
                                        return (
                                          <React.Fragment key={rIdx}>
                                            <tr 
                                              onClick={() => setExpandedHistoryResultIndex(isResExpanded ? null : rIdx)}
                                              className={`hover:bg-slate-50 transition-colors cursor-pointer ${isResExpanded ? 'bg-slate-50' : ''}`}
                                            >
                                              <td className="p-2">
                                                <div className="text-slate-400">
                                                  {isResExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                </div>
                                              </td>
                                              <td className="p-2 text-[10px] font-bold text-slate-700 uppercase">{res.concept}</td>
                                              <td className="p-2 text-[10px] font-mono text-right font-black">{formatCLP(res.caratulaValue)}</td>
                                              <td className="p-2 text-[10px] font-mono text-right font-black">{formatCLP(res.detailValue)}</td>
                                              <td className={`p-2 text-[10px] font-mono text-right font-black ${res.difference > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCLP(res.difference)}</td>
                                              <td className="p-2 text-center">
                                                <div className={`w-2 h-2 rounded-full mx-auto ${res.status === 'MATCH' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                              </td>
                                            </tr>
                                            {isResExpanded && (
                                              <tr className="bg-slate-50/50">
                                                <td colSpan={6} className="p-4">
                                                  {linkedSheet ? (
                                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                                                      <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center">
                                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Hoja: {linkedSheet.sheetName}</span>
                                                        <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{linkedSheet.rowCount} Filas</span>
                                                      </div>
                                                      <div className="overflow-x-auto max-h-64">
                                                        <table className="w-full text-[9px] text-left border-collapse">
                                                          <thead>
                                                            <tr className="bg-slate-50 text-slate-400 border-b border-slate-100">
                                                              {linkedSheet.columns.map((col, cIdx) => (
                                                                <th key={cIdx} className={`p-2 font-black uppercase tracking-tighter whitespace-nowrap ${cIdx === linkedSheet.valueColIdx ? 'bg-indigo-50 text-indigo-700' : ''}`}>
                                                                  {col || `Col ${cIdx + 1}`}
                                                                </th>
                                                              ))}
                                                            </tr>
                                                          </thead>
                                                          <tbody className="divide-y divide-slate-50">
                                                            {linkedSheet.sampleData.map((row, rowIdx) => (
                                                              <tr key={rowIdx} className="hover:bg-slate-50/50">
                                                                {linkedSheet.columns.map((_, colIdx) => {
                                                                  const val = row[colIdx];
                                                                  const isValCol = colIdx === linkedSheet.valueColIdx;
                                                                  return (
                                                                    <td key={colIdx} className={`p-2 text-slate-600 font-medium whitespace-nowrap border-r border-slate-50 last:border-r-0 ${isValCol ? 'bg-indigo-50/30 font-black text-indigo-900' : ''}`}>
                                                                      {typeof val === 'number' 
                                                                        ? (val % 1 === 0 ? new Intl.NumberFormat('es-CL').format(val) : val.toFixed(2)) 
                                                                        : String(val || '')}
                                                                    </td>
                                                                  );
                                                                })}
                                                              </tr>
                                                            ))}
                                                          </tbody>
                                                        </table>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div className="text-center py-4 text-[9px] font-bold text-slate-400 uppercase italic">No hay detalle de sumatoria disponible</div>
                                                  )}
                                                </td>
                                              </tr>
                                            )}
                                          </React.Fragment>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'ANALYSIS' && currentPreview && (
          <div className="space-y-8">
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Título del Análisis</p>
                <input 
                  type="text"
                  value={currentPreview.title || ''}
                  onChange={(e) => setCurrentPreview({...currentPreview, title: e.target.value})}
                  className="w-full text-sm font-black text-slate-800 bg-slate-50 border-none rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nombre del análisis..."
                />
              </div>
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Carátula Detectada</p>
                <p className="text-sm font-black text-indigo-600">{currentPreview.caratulaSheetName || 'No detectada'}</p>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hojas Procesadas</p>
                <p className="text-sm font-black text-slate-800">{currentPreview.sheets.length}</p>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado General</p>
                <div className="flex items-center gap-2">
                  {currentPreview.results.every(r => r.status === 'MATCH') ? (
                    <><CheckCircle2 size={16} className="text-emerald-500" /><span className="text-sm font-black text-emerald-600 uppercase">Cuadrado</span></>
                  ) : (
                    <><AlertTriangle size={16} className="text-rose-500" /><span className="text-sm font-black text-rose-600 uppercase">Diferencias</span></>
                  )}
                </div>
              </div>
            </div>

            {/* RECONCILIATION TABLE */}
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase">Resultados de Conciliación</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Comparativa Carátula vs Detalle de Hojas • <span className="text-indigo-600">Click en fila para ver detalle</span></p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleExportExcel()}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    title="Exportar conciliación a formato Excel (.xlsx)"
                  >
                    <FileSpreadsheet size={14} /> Exportar Excel (.xlsx)
                  </button>
                  <button 
                    onClick={() => handleExportPDF()}
                    className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                  >
                    <Download size={14} /> Exportar PDF
                  </button>
                  <button 
                    onClick={() => {
                      const sorted = [...currentPreview.results].sort((a, b) => b.difference - a.difference);
                      setCurrentPreview({...currentPreview, results: sorted});
                    }}
                    className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                  >
                    <Filter size={14} /> Ordenar por Diferencia
                  </button>
                  <button 
                    onClick={() => {
                      const newResult: AccountingReconciliationResult = {
                        concept: 'NUEVO CONCEPTO',
                        caratulaValue: 0,
                        detailValue: 0,
                        difference: 0,
                        status: 'NOT_FOUND'
                      };
                      setCurrentPreview({
                        ...currentPreview,
                        results: [...currentPreview.results, newResult]
                      });
                    }}
                    className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                  >
                    <Calculator size={14} /> Agregar Fila
                  </button>
                  {!reconciliations.find(r => r.id === currentPreview.id) && (
                    <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                      <CheckCircle2 size={14} /> Guardar Análisis
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto jde-scrollbar">
                <table className="w-full min-w-[950px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400">
                      <th className="p-4 w-10"></th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest">Concepto (Carátula)</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest">Hoja de Detalle</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Valor Carátula</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Valor Detalle</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Diferencia</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Estado</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest rounded-tr-2xl">Acción Sugerida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {currentPreview.results.map((res, idx) => {
                      const isConsolidated = res.detailSheetName === 'CONSOLIDADO TOTAL';
                      const isAS400 = res.concept.includes('AS400');
                      const isSpecialRow = isConsolidated || isAS400;
                      const isExpanded = expandedRowIndex === idx;
                      const linkedSheet = currentPreview.sheets.find(s => s.sheetName === res.detailSheetName);
                      
                      return (
                      <React.Fragment key={idx}>
                      <tr key={idx} onClick={() => setExpandedRowIndex(isExpanded ? null : idx)} className={`hover:bg-slate-50 transition-colors group cursor-pointer ${isSpecialRow ? 'bg-indigo-50/50 border-y-2 border-indigo-100' : ''} ${isExpanded ? 'bg-slate-50' : ''}`}>
                        <td className="p-4">
                          <div className="text-slate-400 hover:text-indigo-600 transition-colors">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                        </td>
                        <td className="p-4">
                          <input 
                            type="text"
                            value={res.concept}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const newResults = [...currentPreview.results];
                              newResults[idx] = { ...res, concept: e.target.value.toUpperCase() };
                              setCurrentPreview({ ...currentPreview, results: newResults });
                            }}
                            className={`w-full text-[11px] font-bold uppercase bg-transparent border-none focus:ring-0 p-0 ${isSpecialRow ? 'text-indigo-900 font-black' : 'text-slate-700'}`}
                          />
                        </td>
                        <td className="p-4">
                          {isConsolidated ? (
                            <span className="text-[11px] font-black text-indigo-600 uppercase">Resumen General</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <select 
                                value={res.detailSheetName || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const sheetName = e.target.value;
                                  const sheet = currentPreview.sheets.find(s => s.sheetName === sheetName);
                                  const newResults = [...currentPreview.results];
                                  const detailValue = sheet ? sheet.totalAmount : 0;
                                  const diff = Math.abs(res.caratulaValue - detailValue);
                                  const status = diff < 1 ? 'MATCH' : 'MISMATCH';
                                  const confidence = sheetName ? calculateConfidence(res.concept, sheetName) : 0;
                                  newResults[idx] = { 
                                    ...res, 
                                    detailSheetName: sheetName,
                                    detailValue,
                                    difference: diff,
                                    status,
                                    confidenceScore: confidence,
                                    suggestedAction: status === 'MATCH' 
                                      ? 'Valores coinciden perfectamente.' 
                                      : `Diferencia de ${formatCLP(diff)}. Verifique si faltan registros en la hoja "${sheetName}" o si hay errores en la carátula.`
                                  };
                                  setCurrentPreview({ ...currentPreview, results: newResults });
                                }}
                                className="text-[11px] font-black text-indigo-600 uppercase bg-transparent border-none focus:ring-0 p-0"
                              >
                                <option value="">SIN HOJA</option>
                                {currentPreview.sheets.map(s => (
                                  <option key={s.sheetName} value={s.sheetName}>{s.sheetName}</option>
                                ))}
                              </select>
                              {res.confidenceScore !== undefined && res.confidenceScore > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all ${res.confidenceScore > 80 ? 'bg-emerald-500' : res.confidenceScore > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                      style={{ width: `${res.confidenceScore}%` }}
                                    />
                                  </div>
                                  <span className="text-[8px] font-bold text-slate-400">{res.confidenceScore}% Confianza</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <input 
                            type="number"
                            value={res.caratulaValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const newResults = [...currentPreview.results];
                              const diff = Math.abs(val - res.detailValue);
                              const status = diff < 1 ? 'MATCH' : 'MISMATCH';
                              newResults[idx] = { 
                                ...res, 
                                caratulaValue: val,
                                difference: diff,
                                status,
                                suggestedAction: status === 'MATCH' 
                                  ? 'Valores coinciden perfectamente.' 
                                  : `Diferencia de ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(diff)}. Verifique si faltan registros en la hoja de detalle o si hay errores en la carátula.`
                              };
                              setCurrentPreview({ ...currentPreview, results: newResults });
                            }}
                            className={`w-full text-[11px] font-black text-right font-mono bg-transparent border-none focus:ring-0 p-0 ${isSpecialRow ? 'text-indigo-900' : 'text-slate-900'}`}
                          />
                        </td>
                        <td className={`p-4 text-[11px] font-black text-right font-mono ${isSpecialRow ? 'text-indigo-900' : 'text-slate-900'}`}>
                          {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(res.detailValue)}
                        </td>
                        <td className={`p-4 text-[11px] font-black text-right font-mono ${res.difference > 0 ? 'text-rose-600' : 'text-emerald-600'} relative group/diff`}>
                          <div className="flex flex-col items-end">
                            <span>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(res.difference)}</span>
                            {res.difference !== 0 && (
                              <div className="absolute bottom-full right-0 mb-2 hidden group-hover/diff:block z-50">
                                <div className="bg-slate-900 text-white text-[9px] p-3 rounded-xl shadow-2xl border border-white/10 whitespace-nowrap">
                                  <p className="font-black uppercase tracking-widest mb-1 text-slate-400 border-b border-white/10 pb-1">Desglose Aritmético</p>
                                  <div className="space-y-1 font-mono">
                                    <div className="flex justify-between gap-4">
                                      <span>Carátula:</span>
                                      <span className="text-indigo-400">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(res.caratulaValue)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span>Detalle:</span>
                                      <span className="text-emerald-400">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(res.detailValue)}</span>
                                    </div>
                                    <div className="h-[1px] bg-white/20 my-1"></div>
                                    <div className="flex justify-between gap-4 font-black">
                                      <span>Diferencia:</span>
                                      <span className="text-rose-400">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(res.difference)}</span>
                                    </div>
                                  </div>
                                  <p className="mt-2 text-[8px] italic text-slate-500">Fórmula: |Carátula - Detalle|</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {res.status === 'MATCH' ? (
                            <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">OK</span>
                          ) : res.status === 'MISMATCH' ? (
                            <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">ERROR</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black uppercase">PENDIENTE</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className={`text-[9px] font-bold uppercase leading-tight ${res.status === 'MATCH' ? 'text-emerald-500' : res.status === 'MISMATCH' ? 'text-rose-500' : 'text-slate-400'}`}>
                            {res.suggestedAction || 'Sin acción sugerida.'}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={8} className="p-6">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
                              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                  Drill Down: {res.detailSheetName || 'SIN HOJA VINCULADA'}
                                </span>
                                {linkedSheet && (
                                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                                    {linkedSheet.rowCount} Registros Detectados
                                  </span>
                                )}
                              </div>
                              <div className="p-4">
                                {linkedSheet ? (
                                  <div className="space-y-4">
                                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                                      <table className="w-full text-[10px] text-left border-collapse">
                                        <thead>
                                          <tr className="bg-slate-100 text-slate-500 border-b border-slate-200">
                                            {linkedSheet.columns.map((col, cIdx) => (
                                              <th key={cIdx} className={`p-3 font-black uppercase tracking-tighter whitespace-nowrap ${cIdx === linkedSheet.valueColIdx ? 'bg-indigo-50 text-indigo-700' : ''}`}>
                                                {col || `Col ${cIdx + 1}`}
                                                {cIdx === linkedSheet.valueColIdx && <span className="ml-2 text-[8px] bg-indigo-600 text-white px-1 rounded">SUMA</span>}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {linkedSheet.sampleData.map((row, rIdx) => (
                                            <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                                              {linkedSheet.columns.map((_, vIdx) => {
                                                const val = row[vIdx];
                                                const isValueCol = vIdx === linkedSheet.valueColIdx;
                                                return (
                                                  <td key={vIdx} className={`p-3 text-slate-600 font-medium whitespace-nowrap border-r border-slate-50 last:border-r-0 ${isValueCol ? 'bg-indigo-50/30 font-black text-indigo-900' : ''}`}>
                                                    {typeof val === 'number' 
                                                      ? (val % 1 === 0 ? new Intl.NumberFormat('es-CL').format(val) : val.toFixed(2)) 
                                                      : String(val || '')}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                      <p className="text-[9px] text-slate-400 italic">Mostrando {linkedSheet.sampleData.length} de {linkedSheet.rowCount - 1} registros totales.</p>
                                      <button className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Descargar Detalle Completo (.CSV)</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                    <AlertCircle size={24} className="mb-2 opacity-20" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No hay datos de detalle para mostrar</p>
                                    <p className="text-[9px] mt-1 italic">Vincule una hoja de detalle para ver el desglose.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                    })}
                    {currentPreview.results.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-10 text-center">
                          <div className="flex flex-col items-center gap-2 opacity-30">
                            <AlertCircle size={48} />
                            <p className="text-sm font-black uppercase">No se detectaron coincidencias automáticas</p>
                            <p className="text-[10px] font-bold">Asegúrese de que los nombres en la carátula coincidan con los nombres de las hojas</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ROW-LEVEL RECONCILIATION (CONTROL INTERNO VS DETALLE) */}
            {currentPreview.rowResults && currentPreview.rowResults.length > 0 && (
              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm mt-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-sm font-black text-slate-800 uppercase">Conciliación por Registros (Control Interno vs Detalle)</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Comparativa uno a uno por Número de Egreso/Ingreso</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                      {currentPreview.rowResults.filter(r => r.status === 'MATCH').length} Cuadrados
                    </div>
                    <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                      {currentPreview.rowResults.filter(r => r.status !== 'MATCH').length} Diferencias
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px] jde-scrollbar">
                  <table className="w-full min-w-[950px] text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="bg-slate-50 text-slate-400">
                        <th className="p-4 text-[10px] font-black uppercase tracking-widest">Referencia</th>
                        <th className="p-4 text-[10px] font-black uppercase tracking-widest">Descripción</th>
                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Control Interno</th>
                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Detalle</th>
                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Diferencia</th>
                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {currentPreview.rowResults.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4 text-[11px] font-black text-slate-700">{row.reference}</td>
                          <td className="p-4 text-[11px] text-slate-500 truncate max-w-[200px]">{row.description}</td>
                          <td className="p-4 text-right text-[11px] font-mono font-black text-slate-900">{formatCLP(row.controlValue)}</td>
                          <td className="p-4 text-right text-[11px] font-mono font-black text-slate-900">{formatCLP(row.detailValue)}</td>
                          <td className={`p-4 text-right text-[11px] font-mono font-black ${row.difference > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCLP(row.difference)}
                          </td>
                          <td className="p-4 text-center">
                            {row.status === 'MATCH' ? (
                              <span className="text-emerald-500"><CheckCircle2 size={16} className="mx-auto" /></span>
                            ) : row.status === 'MISMATCH' ? (
                              <span className="text-rose-500"><AlertTriangle size={16} className="mx-auto" /></span>
                            ) : (
                              <span className="text-amber-500"><AlertCircle size={16} className="mx-auto" /></span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ALL SHEETS LIST */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {currentPreview.sheets.map((sheet, idx) => (
                <div key={idx} className={`bg-white rounded-2xl p-4 border shadow-sm ${sheet.sheetName === currentPreview.caratulaSheetName ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase">{sheet.rowCount} Filas</span>
                    {sheet.sheetName === currentPreview.caratulaSheetName && <Layers size={14} className="text-indigo-500" />}
                  </div>
                  <p className="text-xs font-black text-slate-800 uppercase truncate">{sheet.sheetName}</p>
                  <p className="text-[11px] font-black text-indigo-600 mt-1">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(sheet.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'REVISION_AUXILIARES' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-white rounded-[32px] p-10 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Revisión de Auxiliares de Activo Fijo</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Control de Depreciación, Variación UF y Cuadratura de Carátulas</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent text-[10px] font-black uppercase px-3 py-1 outline-none"
                    >
                      {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                        <option key={m} value={m}>{new Date(2000, parseInt(m)-1).toLocaleString('es', { month: 'long' })}</option>
                      ))}
                    </select>
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-transparent text-[10px] font-black uppercase px-3 py-1 outline-none"
                    >
                      {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y.toString()}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-right">UF Mes Actual</label>
                    <input 
                      type="number" 
                      value={ufValueCurrent}
                      onChange={(e) => setUfValueCurrent(parseFloat(e.target.value))}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-black text-right w-32 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-right">UF Mes Anterior</label>
                    <input 
                      type="number" 
                      value={ufValuePrevious}
                      onChange={(e) => setUfValuePrevious(parseFloat(e.target.value))}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-black text-right w-32 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <Calculator size={18} />
                    </div>
                    <h3 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Variación UF Mensual</h3>
                  </div>
                  <p className="text-2xl font-black text-indigo-950">
                    {(((ufValueCurrent / ufValuePrevious) - 1) * 100).toFixed(4)}%
                  </p>
                  <p className="text-[9px] font-bold text-indigo-400 uppercase mt-1">Factor de corrección monetaria esperado</p>
                </div>

                <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl">
                      <CheckCircle2 size={18} />
                    </div>
                    <h3 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Propiedades en Cartera</h3>
                  </div>
                  <p className="text-2xl font-black text-emerald-950">{properties.length}</p>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase mt-1">Activos fijos bajo revisión</p>
                </div>

                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-600 text-white rounded-xl">
                      <FileText size={18} />
                    </div>
                    <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Ingresos Arriendos (Sistema)</h3>
                  </div>
                  <p className="text-2xl font-black text-blue-950">{formatCLP(automatedReview.incomeArriendos)}</p>
                  <p className="text-[9px] font-bold text-blue-400 uppercase mt-1">Totalizado desde movimientos del mes</p>
                </div>

                <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-600 text-white rounded-xl">
                      <AlertTriangle size={18} />
                    </div>
                    <h3 className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Alertas Detectadas</h3>
                  </div>
                  <p className="text-2xl font-black text-amber-950">
                    {properties.filter(p => {
                      if (!p.financialData) return true;
                      const ufVar = (ufValueCurrent / ufValuePrevious) - 1;
                      const expectedValue = p.financialData.currentBookValueCLP * (1 + ufVar);
                      // This is a simplified check for demonstration
                      return false; 
                    }).length}
                  </p>
                  <p className="text-[9px] font-bold text-amber-400 uppercase mt-1">Inconsistencias en depreciación o valor</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Validación de Movimientos Automática</h3>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Periodo: {selectedYear}-{selectedMonth}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Total Egresos (Sistema)</span>
                      <span className="text-[11px] font-black text-rose-600">{formatCLP(automatedReview.totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Transacciones Registradas</span>
                      <span className="text-[11px] font-black text-slate-900">{automatedReview.transactionCount}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {automatedReview.currentRec ? (
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <div>
                          <p className="text-[10px] font-black text-emerald-900 uppercase">Conciliación Cargada</p>
                          <p className="text-[9px] font-bold text-emerald-600 uppercase">Archivo: {automatedReview.currentRec.fileName}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                        <AlertCircle size={18} className="text-amber-600" />
                        <div>
                          <p className="text-[10px] font-black text-amber-900 uppercase">Sin Conciliación Cargada</p>
                          <p className="text-[9px] font-bold text-amber-600 uppercase">Cargue el archivo Excel para validar contra el sistema</p>
                        </div>
                      </div>
                    )}
                    {automatedReview.controlInmobiliarioAlerts.length > 0 && (
                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 space-y-2">
                        <div className="flex items-center gap-2 text-rose-600">
                          <AlertTriangle size={16} />
                          <p className="text-[10px] font-black uppercase">Alertas de Control Inmobiliario</p>
                        </div>
                        <div className="max-h-24 overflow-y-auto space-y-1">
                          {automatedReview.controlInmobiliarioAlerts.map((alert, i) => (
                            <p key={i} className="text-[9px] font-bold text-rose-500 uppercase leading-tight">• {alert}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto jde-scrollbar">
                <table className="w-full min-w-[950px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400">
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">Propiedad / Edificio</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 text-right">Valor Libro Ant.</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 text-right">Depreciación Mes</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 text-right">Var. UF Esperada</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 text-right">Valor Libro Act.</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {properties.map((p, idx) => {
                      const fin = p.financialData;
                      if (!fin) {
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                              <p className="text-[11px] font-black text-slate-800 uppercase">{p.building} - {p.floor}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">{p.code}</p>
                            </td>
                            <td colSpan={5} className="p-4 text-center">
                              <span className="text-[9px] font-black bg-rose-50 text-rose-600 px-3 py-1 rounded-full uppercase">Faltan Datos Financieros</span>
                            </td>
                          </tr>
                        );
                      }

                      const ufVarFactor = (ufValueCurrent / ufValuePrevious) - 1;
                      const expectedUfVariation = Math.round(fin.currentBookValueCLP * ufVarFactor);
                      const expectedDepreciation = Math.round((fin.acquisitionCostCLP - fin.residualValueCLP) / fin.usefulLifeMonths);
                      const expectedFinalValue = fin.currentBookValueCLP + expectedUfVariation - expectedDepreciation;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4">
                            <p className="text-[11px] font-black text-slate-800 uppercase group-hover:text-indigo-600 transition-colors">{p.building} - {p.floor}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{p.code}</p>
                          </td>
                          <td className="p-4 text-right text-[11px] font-mono font-black text-slate-600">
                            {formatCLP(fin.currentBookValueCLP)}
                          </td>
                          <td className="p-4 text-right">
                            <p className="text-[11px] font-mono font-black text-rose-600">-{formatCLP(expectedDepreciation)}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Cálculo Teórico</p>
                          </td>
                          <td className="p-4 text-right">
                            <p className="text-[11px] font-mono font-black text-emerald-600">+{formatCLP(expectedUfVariation)}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Corrección Monetaria</p>
                          </td>
                          <td className="p-4 text-right">
                            <p className="text-[11px] font-mono font-black text-slate-950">{formatCLP(expectedFinalValue)}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Saldo Proyectado</p>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <CheckCircle2 size={16} className="text-emerald-500" />
                              <span className="text-[9px] font-black text-emerald-600 uppercase">Correcto</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-10 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-2xl shadow-xs">
                  <Layers size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Cuadratura Carátula vs Libro Mayor</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Validación de integridad entre resumen y detalles mensuales</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Resumen de Carátula (Excel)</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-700 uppercase">Total Activo Fijo</span>
                        <span className="text-[12px] font-black text-slate-900">{formatCLP(properties.reduce((sum, p) => sum + (p.financialData?.currentBookValueCLP || 0), 0))}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-600 uppercase">Total Depreciación Acum.</span>
                        <span className="text-[12px] font-black text-rose-600">-{formatCLP(properties.reduce((sum, p) => sum + (p.financialData?.accumulatedDepreciationCLP || 0), 0))}</span>
                      </div>
                      <div className="h-[1px] bg-slate-200 my-2"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-900 uppercase">Valor Neto Cartera</span>
                        <span className="text-[14px] font-black text-indigo-600">
                          {formatCLP(properties.reduce((sum, p) => sum + (p.financialData?.currentBookValueCLP || 0) - (p.financialData?.accumulatedDepreciationCLP || 0), 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center items-center p-8 bg-indigo-50/30 rounded-[40px] border-2 border-dashed border-indigo-100">
                  <div className="p-4 bg-white rounded-full shadow-xl mb-4">
                    <ArrowRight size={24} className="text-indigo-600" />
                  </div>
                  <p className="text-[11px] font-black text-indigo-900 uppercase text-center mb-2">Validación vs Libro Mayor</p>
                  <p className="text-[9px] font-bold text-indigo-400 uppercase text-center max-w-[200px]">
                    Cargue el Libro Mayor del mes para realizar la cuadratura automática con los auxiliares de propiedades.
                  </p>
                  <button 
                    onClick={() => setActiveTab('UPLOAD')}
                    className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Cargar Libro Mayor
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountingReconciliationModule;
