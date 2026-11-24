/**
 * ============================================================================
 * JDESortSequenceModal.tsx - Diálogo Oficial de Secuencia de Ordenamiento
 * AssetFlow Enterprise FDA Grid Sort Sequence (P986110S / W0001S)
 * ============================================================================
 * 
 * Permite al usuario configurar visualmente:
 *  - Columna de Orden Primaria (Primary Key) + Dirección (Ascendente / Descendente).
 *  - Columna de Orden Secundaria (Secondary Key) + Dirección (Ascendente / Descendente).
 *  - Presets rápidos de ordenamiento ERP (Fecha Reciente, Importe Mayor, Alfabético).
 *  - Restablecimiento al Orden Natural de Base de Datos.
 */

import React, { useState } from 'react';
import { 
  ArrowDownUp, ArrowUp, ArrowDown, Check, X, RotateCcw, 
  Layers, Database, Sparkles 
} from 'lucide-react';
import { JDESortConfig, JDESortColumnOption } from '../../lib/jdeGridSort';

export interface JDESortSequenceModalProps {
  isOpen: boolean;
  programCode?: string;      // ej: "P0901", "P48201", "P986110D"
  gridTitle?: string;        // ej: "Plan de Cuentas y Balances", "Bóveda Digital"
  availableColumns: JDESortColumnOption[];
  currentPrimarySort: JDESortConfig | null;
  currentSecondarySort: JDESortConfig | null;
  onApply: (primary: JDESortConfig | null, secondary: JDESortConfig | null) => void;
  onClose: () => void;
}

export const JDESortSequenceModal: React.FC<JDESortSequenceModalProps> = ({
  isOpen,
  programCode = 'P986110S',
  gridTitle = 'Grid AssetFlow Enterprise',
  availableColumns,
  currentPrimarySort,
  currentSecondarySort,
  onApply,
  onClose
}) => {
  const [primaryCol, setPrimaryCol] = useState<string>(currentPrimarySort?.column || '');
  const [primaryDir, setPrimaryDir] = useState<'asc' | 'desc'>(currentPrimarySort?.direction || 'asc');
  
  const [secondaryCol, setSecondaryCol] = useState<string>(currentSecondarySort?.column || '');
  const [secondaryDir, setSecondaryDir] = useState<'asc' | 'desc'>(currentSecondarySort?.direction || 'asc');

  if (!isOpen) return null;

  const handleApply = () => {
    const selectedPrimaryColObj = availableColumns.find(c => c.key === primaryCol);
    const selectedSecondaryColObj = availableColumns.find(c => c.key === secondaryCol);

    const primary: JDESortConfig | null = primaryCol ? {
      column: primaryCol,
      direction: primaryDir,
      label: selectedPrimaryColObj?.label || primaryCol,
      type: selectedPrimaryColObj?.type
    } : null;

    const secondary: JDESortConfig | null = secondaryCol && secondaryCol !== primaryCol ? {
      column: secondaryCol,
      direction: secondaryDir,
      label: selectedSecondaryColObj?.label || secondaryCol,
      type: selectedSecondaryColObj?.type
    } : null;

    onApply(primary, secondary);
    onClose();
  };

  const handleReset = () => {
    setPrimaryCol('');
    setPrimaryDir('asc');
    setSecondaryCol('');
    setSecondaryDir('asc');
    onApply(null, null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[700] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-[#002D62] w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col font-sans">
        
        {/* Header Estilo AssetFlow Enterprise */}
        <div className="bg-gradient-to-r from-[#002D62] via-[#004B7B] to-[#002D62] px-5 py-3.5 text-white flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-400 text-[#002D62] rounded font-mono font-black text-xs shadow-xs">
              {programCode}
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <ArrowDownUp size={15} className="text-amber-300" />
                Personalizar Secuencia de Ordenamiento de Grilla
              </h3>
              <p className="text-[10px] text-blue-100 font-mono">
                {gridTitle} • AssetFlow Enterprise Grid Sort Specification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del formulario */}
        <div className="p-5 space-y-4 bg-slate-50 overflow-y-auto max-h-[75vh]">
          
          {/* Instrucciones Breves */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
            <Database size={16} className="text-blue-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Defina las columnas de ordenamiento primario y secundario. Las cifras monetarias, códigos y fechas se ordenarán automáticamente según su tipo nativo.
            </p>
          </div>

          {/* 1. Columna Primaria */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#002D62] flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-[#002D62] text-white flex items-center justify-center text-[9px] font-mono font-bold">1</span>
                Columna de Orden Principal (Primary Sort Column)
              </label>
              {primaryCol && (
                <button
                  type="button"
                  onClick={() => setPrimaryCol('')}
                  className="text-[9px] text-rose-600 hover:underline font-bold"
                >
                  Quitar orden
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <select
                  value={primaryCol}
                  onChange={(e) => setPrimaryCol(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#002D62] uppercase"
                >
                  <option value="">-- SELECCIONE COLUMNA PRINCIPAL --</option>
                  {availableColumns.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label} {col.type ? `[${col.type.toUpperCase()}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex rounded-lg border-2 border-slate-200 overflow-hidden bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setPrimaryDir('asc')}
                  disabled={!primaryCol}
                  className={`flex-1 py-1.5 px-2 text-[10px] font-black uppercase rounded flex items-center justify-center gap-1 transition-all ${
                    primaryDir === 'asc' && primaryCol
                      ? 'bg-[#002D62] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-40'
                  }`}
                >
                  <ArrowUp size={11} className="stroke-[3]" /> Ascendente
                </button>
                <button
                  type="button"
                  onClick={() => setPrimaryDir('desc')}
                  disabled={!primaryCol}
                  className={`flex-1 py-1.5 px-2 text-[10px] font-black uppercase rounded flex items-center justify-center gap-1 transition-all ${
                    primaryDir === 'desc' && primaryCol
                      ? 'bg-[#002D62] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-40'
                  }`}
                >
                  <ArrowDown size={11} className="stroke-[3]" /> Descendente
                </button>
              </div>
            </div>
          </div>

          {/* 2. Columna Secundaria (Desempate) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-slate-600 text-white flex items-center justify-center text-[9px] font-mono font-bold">2</span>
                Columna Secundaria / Desempate (Secondary Sort Column)
              </label>
              {secondaryCol && (
                <button
                  type="button"
                  onClick={() => setSecondaryCol('')}
                  className="text-[9px] text-rose-600 hover:underline font-bold"
                >
                  Quitar orden
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <select
                  value={secondaryCol}
                  disabled={!primaryCol}
                  onChange={(e) => setSecondaryCol(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#002D62] uppercase disabled:opacity-50"
                >
                  <option value="">-- NINGUNA (SIN DESEMPATE) --</option>
                  {availableColumns
                    .filter(col => col.key !== primaryCol)
                    .map((col) => (
                      <option key={col.key} value={col.key}>
                        {col.label} {col.type ? `[${col.type.toUpperCase()}]` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex rounded-lg border-2 border-slate-200 overflow-hidden bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setSecondaryDir('asc')}
                  disabled={!secondaryCol}
                  className={`flex-1 py-1.5 px-2 text-[10px] font-black uppercase rounded flex items-center justify-center gap-1 transition-all ${
                    secondaryDir === 'asc' && secondaryCol
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-40'
                  }`}
                >
                  <ArrowUp size={11} className="stroke-[3]" /> Ascendente
                </button>
                <button
                  type="button"
                  onClick={() => setSecondaryDir('desc')}
                  disabled={!secondaryCol}
                  className={`flex-1 py-1.5 px-2 text-[10px] font-black uppercase rounded flex items-center justify-center gap-1 transition-all ${
                    secondaryDir === 'desc' && secondaryCol
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-40'
                  }`}
                >
                  <ArrowDown size={11} className="stroke-[3]" /> Descendente
                </button>
              </div>
            </div>
          </div>

          {/* Atajos Rápidos */}
          <div className="bg-slate-100 p-3 rounded-xl border border-slate-250 space-y-1.5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" />
              Presets Rápidos de Ordenamiento ERP
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availableColumns.some(c => c.type === 'date' || c.key.toLowerCase().includes('date') || c.key.toLowerCase().includes('fecha')) && (
                <button
                  type="button"
                  onClick={() => {
                    const dateCol = availableColumns.find(c => c.type === 'date' || c.key.toLowerCase().includes('date') || c.key.toLowerCase().includes('fecha'));
                    if (dateCol) {
                      setPrimaryCol(dateCol.key);
                      setPrimaryDir('desc');
                    }
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded text-[9.5px] font-bold text-slate-700"
                >
                  Más recientes primero
                </button>
              )}
              {availableColumns.some(c => c.type === 'number' || c.key.toLowerCase().includes('amount') || c.key.toLowerCase().includes('total') || c.key.toLowerCase().includes('balance') || c.key.toLowerCase().includes('saldo')) && (
                <button
                  type="button"
                  onClick={() => {
                    const numCol = availableColumns.find(c => c.type === 'number' || c.key.toLowerCase().includes('amount') || c.key.toLowerCase().includes('total') || c.key.toLowerCase().includes('balance') || c.key.toLowerCase().includes('saldo'));
                    if (numCol) {
                      setPrimaryCol(numCol.key);
                      setPrimaryDir('desc');
                    }
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded text-[9.5px] font-bold text-slate-700"
                >
                  Mayor monto / saldo
                </button>
              )}
              {availableColumns.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPrimaryCol(availableColumns[0].key);
                    setPrimaryDir('asc');
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded text-[9.5px] font-bold text-slate-700"
                >
                  Por código / clave (A-Z)
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Footer de Acciones JDE */}
        <div className="bg-[#EAF1F8] px-5 py-3 border-t border-[#9DB2C3] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 hover:text-rose-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Restablecer al orden original de la base de datos"
          >
            <RotateCcw size={13} />
            <span>Restablecer Orden Inicial</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-[#002D62] hover:bg-[#001D42] text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Check size={14} className="stroke-[3]" />
              <span>Aplicar Ordenamiento</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default JDESortSequenceModal;
