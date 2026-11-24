import React, { useState, useMemo } from 'react';
import { 
  X, TrendingUp, CheckCircle2, Download, AlertCircle, FileSpreadsheet,
  Calculator, RefreshCw, Save, DollarSign, Building2, Calendar, ShieldCheck
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { LeaseContract, Property } from '../types';
import { formatCLP } from '../lib/chileanUtils';

interface RentReadjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: LeaseContract[];
  properties: Property[];
  onApplyReadjustment: (results: ReadjustmentItem[]) => Promise<void> | void;
  currentUser: string;
}

export interface ReadjustmentItem {
  contractId: string;
  contractFolio: string;
  propertyId: string;
  propertyLabel: string;
  commune: string;
  region: string;
  tenantName: string;
  tenantRut: string;
  currency: 'CLP' | 'UF';
  initialRent: number;
  readjustmentPercent: number;
  rentIncrement: number;
  finalRent: number;
  isSelected: boolean;
  anniversaryMonths: number;
  startDate: string;
}

export const RentReadjustmentModal: React.FC<RentReadjustmentModalProps> = ({
  isOpen,
  onClose,
  contracts,
  properties,
  onApplyReadjustment,
  currentUser
}) => {
  // Parámetro de IPC del INE sugerido (ej: 4.2% acumulado anual)
  const [defaultIpcPercent, setDefaultIpcPercent] = useState<number>(4.2);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [executionSuccess, setExecutionSuccess] = useState<boolean>(false);
  const [lastExecutedReport, setLastExecutedReport] = useState<ReadjustmentItem[]>([]);

  // 1. Calcular los contratos elegibles y sus simulaciones sin error de coma flotante
  const initialItems: ReadjustmentItem[] = useMemo(() => {
    const today = new Date();
    
    return contracts
      .filter(c => c.status === 'VIGENTE' || c.status === 'POR_VENCER')
      .map(c => {
        // Encontrar propiedad vinculada
        const prop = properties.find(p => p.id === c.propertyId || p.address.toLowerCase() === c.propertyLabel.toLowerCase());
        
        // Calcular antigüedad en meses
        let anniversaryMonths = 12;
        if (c.startDate) {
          const start = new Date(c.startDate);
          if (!isNaN(start.getTime())) {
            const diffMonths = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
            anniversaryMonths = Math.max(1, diffMonths);
          }
        }

        const currency = (c.currency as 'CLP' | 'UF') || 'CLP';
        const initialRent = currency === 'CLP' ? Math.round(Number(c.monthlyAmount) || 0) : Number(c.monthlyAmount) || 0;

        // Mitigación de errores de punto flotante IEEE-754:
        // En CLP redondeamos al entero Math.round. En UF a 2 decimales.
        let finalRent = initialRent;
        let rentIncrement = 0;

        if (currency === 'CLP') {
          finalRent = Math.round(initialRent * (1 + defaultIpcPercent / 100));
          rentIncrement = finalRent - initialRent;
        } else {
          finalRent = Number((initialRent * (1 + defaultIpcPercent / 100)).toFixed(2));
          rentIncrement = Number((finalRent - initialRent).toFixed(2));
        }

        return {
          contractId: c.id,
          contractFolio: c.contractNumber || c.id.slice(0, 8),
          propertyId: c.propertyId || prop?.id || '',
          propertyLabel: c.propertyLabel || prop?.address || 'Inmueble sin rotular',
          commune: prop?.commune || 'SANTIAGO',
          region: prop?.region || 'RM',
          tenantName: c.tenantName || 'ARRENDATARIO NO ASIGNADO',
          tenantRut: c.tenantRut || 'S/I',
          currency,
          initialRent,
          readjustmentPercent: defaultIpcPercent,
          rentIncrement,
          finalRent,
          isSelected: true, // Seleccionado por defecto para revisión
          anniversaryMonths,
          startDate: c.startDate || ''
        };
      });
  }, [contracts, properties, defaultIpcPercent]);

  const [items, setItems] = useState<ReadjustmentItem[]>(initialItems);

  // Sincronizar items al cambiar el porcentaje global de IPC
  const handleIpcChange = (newPercent: number) => {
    setDefaultIpcPercent(newPercent);
    setItems(prev => prev.map(item => {
      let finalRent = item.initialRent;
      let rentIncrement = 0;
      if (item.currency === 'CLP') {
        finalRent = Math.round(item.initialRent * (1 + newPercent / 100));
        rentIncrement = finalRent - item.initialRent;
      } else {
        finalRent = Number((item.initialRent * (1 + newPercent / 100)).toFixed(2));
        rentIncrement = Number((finalRent - item.initialRent).toFixed(2));
      }
      return {
        ...item,
        readjustmentPercent: newPercent,
        rentIncrement,
        finalRent
      };
    }));
  };

  const toggleSelectAll = (select: boolean) => {
    setItems(prev => prev.map(it => ({ ...it, isSelected: select })));
  };

  const toggleSelectItem = (contractId: string) => {
    setItems(prev => prev.map(it => it.contractId === contractId ? { ...it, isSelected: !it.isSelected } : it));
  };

  // Generador de Excel (.xlsx) estructurado y profesional con ExcelJS
  const generateExcelReport = async (processedItems: ReadjustmentItem[]) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AssetFlow ERP Enterprise';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Auditoría_Reajuste_Anual', {
      views: [{ showGridLines: true }]
    });

    // 1. Título y Encabezado Corporativo
    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'ASSETFLOW ERP · REPORTE OFICIAL DE REAJUSTE ANUAL DE CÁNONES (IPC/INE)';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002D62' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 30;

    sheet.mergeCells('A2:J2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Proceso por Lote R15130 · Fecha de Ejecución: ${new Date().toLocaleDateString('es-CL')} · Responsable: ${currentUser} · Módulo RE-15 (AssetFlow Enterprise)`;
    subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF334155' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 20;

    sheet.addRow([]); // Fila vacía

    // 2. Encabezados de Columna
    const headers = [
      'Folio Contrato',
      'Inmueble / Dirección',
      'Comuna',
      'Región',
      'Arrendatario',
      'RUT Arrendatario',
      'Moneda',
      'Canon Inicial ($/UF)',
      '% Reajuste',
      'Canon Final Reajustado'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6132' } }; // Verde institucional
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });

    // 3. Filas de Datos (Valores formateados sin errores de punto flotante)
    let totalInitialCLP = 0;
    let totalFinalCLP = 0;

    processedItems.forEach((it) => {
      if (it.currency === 'CLP') {
        totalInitialCLP += it.initialRent;
        totalFinalCLP += it.finalRent;
      }

      const row = sheet.addRow([
        it.contractFolio,
        it.propertyLabel,
        it.commune,
        it.region,
        it.tenantName,
        it.tenantRut,
        it.currency,
        it.initialRent,
        `${it.readjustmentPercent.toFixed(1)}%`,
        it.finalRent
      ]);

      row.height = 20;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(7).alignment = { horizontal: 'center' };
      row.getCell(8).numFmt = it.currency === 'CLP' ? '$#,##0' : '0.00';
      row.getCell(9).alignment = { horizontal: 'center' };
      row.getCell(10).numFmt = it.currency === 'CLP' ? '$#,##0' : '0.00';

      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 9 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // Fila de Totales en CLP
    const totalRow = sheet.addRow([
      'TOTAL GENERAL (CLP)',
      '',
      '',
      '',
      '',
      '',
      'CLP',
      totalInitialCLP,
      '',
      totalFinalCLP
    ]);
    totalRow.height = 22;
    totalRow.font = { name: 'Arial', size: 9, bold: true };
    totalRow.getCell(8).numFmt = '$#,##0';
    totalRow.getCell(10).numFmt = '$#,##0';
    totalRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'double', color: { argb: 'FF000000' } }
      };
    });

    // Ajustar anchos de columnas
    sheet.columns = [
      { width: 16 }, // Folio
      { width: 34 }, // Inmueble
      { width: 16 }, // Comuna
      { width: 10 }, // Región
      { width: 28 }, // Arrendatario
      { width: 16 }, // RUT
      { width: 10 }, // Moneda
      { width: 18 }, // Canon Inicial
      { width: 14 }, // % Reajuste
      { width: 20 }  // Canon Final
    ];

    // Descargar archivo Excel real .xlsx
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Auditoria_Reajuste_Anual_Canones_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, fileName);
  };

  // Ejecutar el reajuste en lote
  const handleExecute = async () => {
    const selected = items.filter(it => it.isSelected);
    if (selected.length === 0) {
      alert('Debe seleccionar al menos una propiedad para aplicar el reajuste anual.');
      return;
    }

    try {
      setIsProcessing(true);
      // Aplicar cambios en base de datos
      await onApplyReadjustment(selected);
      
      // Emitir y descargar el reporte oficial en Excel .xlsx
      await generateExcelReport(selected);

      setLastExecutedReport(selected);
      setExecutionSuccess(true);
    } catch (err) {
      console.error('Error aplicando reajustes:', err);
      alert('Ocurrió un error al guardar los reajustes en la base de datos.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150 font-sans">
      <div className="bg-[#f8fafc] w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* HEADER MODAL JDE */}
        <div className="bg-[#002D62] text-white px-6 py-4 flex flex-wrap items-center justify-between border-b-2 border-emerald-500 shadow-md gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-xl">
              <Calculator size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded font-mono">
                  R15130 · BATCH INDEXATION
                </span>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                  AssetFlow RE-15 Real Estate Indexation
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                Reajuste Anual de Cánones de Arriendo (IPC / INE)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* BARRA DE PARÁMETROS Y CONTROL */}
        <div className="bg-white border-b border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1.5">
                <TrendingUp size={14} className="text-emerald-600" />
                <span>Tasa de Reajuste IPC Acumulada Anual (%)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={defaultIpcPercent}
                  onChange={e => handleIpcChange(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-slate-50 border-2 border-emerald-600 rounded-lg px-3 py-1.5 text-sm font-black font-mono text-emerald-800 text-center focus:bg-white outline-none"
                />
                <span className="text-xs font-bold text-slate-500 font-mono">% INE Últimos 12 Meses</span>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-slate-200 hidden sm:block"></div>

            <div className="text-xs text-slate-600 max-w-md">
              <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-0.5">Control de Precisión Numérica (Sin Error de Coma Flotante)</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Los cánones en pesos se redondearán estrictamente a enteros mediante <code>Math.round</code>, garantizando sumatorias exactas para el Reporte CMF B.13 y facturación contable.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleSelectAll(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase transition-colors"
            >
              Marcar Todos
            </button>
            <button
              type="button"
              onClick={() => toggleSelectAll(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase transition-colors"
            >
              Desmarcar
            </button>
          </div>
        </div>

        {/* TABLA DE SIMULACIÓN Y AUDITORÍA PREVIA */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="p-3 pl-4 text-center w-12">Sel.</th>
                  <th className="p-3">Folio / Inmueble</th>
                  <th className="p-3">Comuna / Región</th>
                  <th className="p-3">Arrendatario</th>
                  <th className="p-3 text-right">Canon Inicial</th>
                  <th className="p-3 text-center">% IPC</th>
                  <th className="p-3 text-right">Incremento</th>
                  <th className="p-3 text-right pr-4 text-emerald-400">Nuevo Canon Reajustado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold uppercase text-[11px]">
                      No se encontraron contratos vigentes disponibles para reajustar.
                    </td>
                  </tr>
                ) : (
                  items.map(it => (
                    <tr
                      key={it.contractId}
                      className={`hover:bg-emerald-50/40 transition-colors ${it.isSelected ? 'bg-white' : 'bg-slate-50 opacity-60'}`}
                    >
                      <td className="p-3 pl-4 text-center">
                        <input
                          type="checkbox"
                          checked={it.isSelected}
                          onChange={() => toggleSelectItem(it.contractId)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        <span className="font-mono text-emerald-700 mr-1.5 font-black">[{it.contractFolio}]</span>
                        <span>{it.propertyLabel}</span>
                      </td>
                      <td className="p-3 text-slate-600">
                        <span className="font-bold text-slate-800">{it.commune}</span> ({it.region})
                      </td>
                      <td className="p-3 text-slate-700 font-medium">
                        <p className="font-bold">{it.tenantName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{it.tenantRut}</p>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-700">
                        {it.currency === 'CLP' ? formatCLP(it.initialRent) : `${it.initialRent} UF`}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-indigo-700">
                        +{it.readjustmentPercent.toFixed(1)}%
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-bold">
                        +{it.currency === 'CLP' ? formatCLP(it.rentIncrement) : `${it.rentIncrement} UF`}
                      </td>
                      <td className="p-3 text-right pr-4 font-mono font-black text-slate-900 bg-emerald-50/50">
                        <span className="text-emerald-800 text-sm">
                          {it.currency === 'CLP' ? formatCLP(it.finalRent) : `${it.finalRent} UF`}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER CON BOTÓN DE ACCIÓN Y GENERACIÓN DE EXCEL */}
        <div className="bg-white border-t border-slate-300 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span className="font-bold">
              Seleccionados: {items.filter(i => i.isSelected).length} de {items.length} contratos
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase transition-colors"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleExecute}
              disabled={isProcessing || items.filter(i => i.isSelected).length === 0}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-xs uppercase rounded-lg shadow-md transition-all flex items-center gap-2 border border-emerald-900 disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              <span>{isProcessing ? 'Procesando Reajuste...' : 'Ejecutar Reajustes Masivos & Descargar Excel (XLSX)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
