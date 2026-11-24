import React, { useState } from 'react';
import { Columns, MoveVertical, RotateCcw, Sliders, ChevronDown } from 'lucide-react';

export interface GridDimensionControlsProps {
  defaultRowHeight: number;
  onSetRowHeight: (height: number) => void;
  onResetColumns?: () => void;
  onResetRows?: () => void;
  onResetAll?: () => void;
  compact?: boolean;
}

export const GridDimensionControls: React.FC<GridDimensionControlsProps> = ({
  defaultRowHeight,
  onSetRowHeight,
  onResetColumns,
  onResetRows,
  onResetAll,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { label: 'Compacto', height: 26, desc: '26px' },
    { label: 'Normal', height: 36, desc: '36px' },
    { label: 'Cómodo', height: 48, desc: '48px' },
    { label: 'Amplio', height: 62, desc: '62px' }
  ];

  return (
    <div className="relative inline-block text-left select-none">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F0F5FA] hover:bg-[#E1EDF7] text-[#0B3C5D] border border-[#B1C3D3] rounded text-[10px] font-bold tracking-wider uppercase transition-colors shadow-xs"
        title="Configurar dimensiones de filas y columnas del grid"
      >
        <Sliders size={12} className="text-[#0B3C5D]" />
        <span>Dimensiones</span>
        <span className="text-[9px] font-mono px-1 py-0.2 bg-[#D8E4F1] rounded text-[#0B3C5D]">
          {defaultRowHeight}px
        </span>
        <ChevronDown size={10} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-1 w-64 bg-white border border-[#7FA6C7] rounded-md shadow-xl z-50 p-2.5 font-sans animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D8E4F1]">
              <span className="text-[10px] font-bold text-[#0B3C5D] uppercase tracking-wider flex items-center gap-1.5">
                <MoveVertical size={13} /> Alto de Filas (ERP Grid)
              </span>
              <span className="text-[10px] font-mono font-bold text-[#0B3C5D] bg-[#E1EDF7] px-1.5 py-0.5 rounded">
                {defaultRowHeight}px
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-2 gap-1.5 mb-2.5">
              {presets.map(p => {
                const isActive = Math.abs(defaultRowHeight - p.height) < 4;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      onSetRowHeight(p.height);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between px-2 py-1.5 rounded text-[10px] font-medium border transition-all ${
                      isActive 
                        ? 'bg-[#0B3C5D] text-white border-[#0B3C5D] font-bold shadow-xs' 
                        : 'bg-[#F8FAFD] text-slate-700 border-[#D2DFEC] hover:bg-[#E1EDF7] hover:text-[#0B3C5D]'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="text-[8px] font-mono opacity-80">{p.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Manual Slider */}
            <div className="mb-3 px-1">
              <div className="flex justify-between text-[9px] text-slate-500 font-bold mb-1">
                <span>22px</span>
                <span>Ajuste fino</span>
                <span>120px</span>
              </div>
              <input
                type="range"
                min="22"
                max="120"
                value={defaultRowHeight}
                onChange={(e) => onSetRowHeight(Number(e.target.value))}
                className="w-full accent-[#0B3C5D] cursor-pointer"
              />
            </div>

            {/* Actions / Resets */}
            <div className="pt-2 border-t border-[#D8E4F1] flex flex-col gap-1">
              {onResetColumns && (
                <button
                  type="button"
                  onClick={() => {
                    onResetColumns();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 text-left text-[9px] font-semibold text-slate-600 hover:text-[#0B3C5D] hover:bg-[#F0F5FA] rounded transition-colors"
                >
                  <Columns size={11} className="text-slate-500" />
                  <span>Restablecer anchos de columnas</span>
                </button>
              )}
              {onResetRows && (
                <button
                  type="button"
                  onClick={() => {
                    onResetRows();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 text-left text-[9px] font-semibold text-slate-600 hover:text-[#0B3C5D] hover:bg-[#F0F5FA] rounded transition-colors"
                >
                  <MoveVertical size={11} className="text-slate-500" />
                  <span>Restablecer altos de filas</span>
                </button>
              )}
              {onResetAll && (
                <button
                  type="button"
                  onClick={() => {
                    onResetAll();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 text-left text-[9px] font-bold text-amber-700 hover:bg-amber-50 rounded transition-colors"
                >
                  <RotateCcw size={11} className="text-amber-600" />
                  <span>Restablecer todas las dimensiones</span>
                </button>
              )}
            </div>

            {/* Helpful tip */}
            <div className="mt-2 pt-1.5 border-t border-slate-100 text-[8.5px] text-slate-500 leading-tight">
              💡 <em>Arrastre el borde derecho de las cabeceras para columnas o el borde inferior del número (#) para filas. Presione Shift para aplicar a todas.</em>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
