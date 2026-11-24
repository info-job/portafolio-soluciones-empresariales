/**
 * ============================================================================
 * JDESortColumnHeader.tsx - Cabecera de Columna Ordenable Estándar Enterprise
 * ============================================================================
 * 
 * Renderiza la cabecera interactiva con:
 *  - Clic interactivo Tri-State (Ascendente ▲, Descendente ▼, Quitar).
 *  - Distintivo visual auténtico Enterprise (#1 / #2 en orden multi-columna).
 *  - Integración opcional con Lupa Visual Assist (F0004A / F0101) para maestros.
 *  - Tooltip explicativo de ordenamiento.
 */

import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';
import { JDESortDirection } from '../../lib/jdeGridSort';

export interface JDESortColumnHeaderProps {
  columnKey: string;
  title: string;
  direction?: JDESortDirection | null;
  rank?: number; // 1 para primario, 2 para secundario
  align?: 'left' | 'center' | 'right';
  className?: string;
  style?: React.CSSProperties;
  onSort?: (columnKey: string) => void;
  visualAssistKey?: string;
  onVisualAssist?: (key: string) => void;
  visualAssistTooltip?: string;
  children?: React.ReactNode;
}

export const JDESortColumnHeader: React.FC<JDESortColumnHeaderProps> = ({
  columnKey,
  title,
  direction,
  rank,
  align = 'left',
  className = '',
  style,
  onSort,
  visualAssistKey,
  onVisualAssist,
  visualAssistTooltip = 'Visual Assist ERP: Consultar Catálogo Maestro'
}) => {
  const isSorted = direction === 'asc' || direction === 'desc';

  const handleClick = (e: React.MouseEvent) => {
    // Si se hizo clic en la lupa de Visual Assist, no disparar ordenamiento
    if ((e.target as HTMLElement).closest('.visual-assist-trigger')) {
      return;
    }
    if (onSort) {
      onSort(columnKey);
    }
  };

  const justifyClass = 
    align === 'center' ? 'justify-center' :
    align === 'right' ? 'justify-end' : 'justify-between';

  return (
    <div
      onClick={handleClick}
      style={style}
      className={`group/jde-header select-none cursor-pointer transition-all flex items-center gap-1.5 ${justifyClass} ${
        isSorted 
          ? 'bg-black/15 text-white font-black' 
          : 'hover:bg-white/10'
      } ${className}`}
      title={`Clic para ordenar por "${title}" (P0001: Tri-State Asc/Desc/Reset)`}
    >
      {/* Título de Columna */}
      <span className="truncate flex items-center gap-1">
        {title}
        {rank && rank > 0 && isSorted && (
          <span className="text-[7.5px] px-1 py-0.2 rounded bg-amber-400 text-[#002D62] font-mono font-black" title={`Prioridad de orden #${rank}`}>
            #{rank}
          </span>
        )}
      </span>

      {/* Iconos de Ordenamiento y Visual Assist */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Lupa Visual Assist (si aplica) */}
        {visualAssistKey && onVisualAssist && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVisualAssist(visualAssistKey);
            }}
            className="visual-assist-trigger p-0.5 text-white/70 hover:text-white hover:bg-white/20 rounded transition-all cursor-pointer"
            title={visualAssistTooltip}
          >
            <Search size={9} className="stroke-[3]" />
          </button>
        )}

        {/* Glifo de Ordenamiento Enterprise */}
        <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded transition-all ${
          isSorted 
            ? 'bg-amber-400 text-[#002D62] shadow-2xs font-bold' 
            : 'text-white/40 group-hover/jde-header:text-white group-hover/jde-header:bg-white/10'
        }`}>
          {direction === 'asc' ? (
            <ArrowUp size={10} className="stroke-[3]" />
          ) : direction === 'desc' ? (
            <ArrowDown size={10} className="stroke-[3]" />
          ) : (
            <ArrowUpDown size={9} className="opacity-40 group-hover/jde-header:opacity-100" />
          )}
        </span>
      </div>
    </div>
  );
};

export default JDESortColumnHeader;
