/**
 * ============================================================================
 * ASSETFLOW ENTERPRISE - MOTOR UNIVERSAL DE ORDENAMIENTO ENTERPRISE
 * Arquitectura Estándar FDA (Form Design Aid) Grid Sorting Engine (P986110S / W0001S)
 * ============================================================================
 * 
 * Implementa el protocolo de ordenamiento oficial Enterprise FDA:
 *  1. Comportamiento Tri-State interactivo en cabeceras de columna:
 *     - Clic 1: Ascendente (▲ / ASC)
 *     - Clic 2: Descendente (▼ / DESC)
 *     - Clic 3: Restablecer / Orden Natural inicial (NULL)
 *  2. Ordenamiento multi-columna (Clave Primaria + Clave Secundaria).
 *  3. Comparador inteligente y tipado seguro:
 *     - Monedas y Cifras (CLP $, UF, %, comas y puntos chilenos).
 *     - Fechas (ISO, DD/MM/AAAA, DD-MM-AAAA, timestamps).
 *     - Textos (insensible a mayúsculas/minúsculas y acentos con locale 'es-CL').
 *     - Manejo de valores vacíos o nulos (siempre al final).
 */

import { useState, useMemo, useCallback } from 'react';

export type JDESortDirection = 'asc' | 'desc';

export interface JDESortConfig<T = any> {
  column: string;
  direction: JDESortDirection;
  label?: string;
  extractor?: (item: T) => any;
  type?: 'auto' | 'string' | 'number' | 'date';
}

export interface JDESortColumnOption {
  key: string;
  label: string;
  type?: 'auto' | 'string' | 'number' | 'date';
}

/**
 * Normaliza valores para comparación inteligente tipo ERP
 */
export function normalizeJDEValue(raw: any, explicitType?: 'auto' | 'string' | 'number' | 'date'): {
  val: any;
  type: 'number' | 'date' | 'string' | 'empty';
} {
  if (raw === null || raw === undefined) {
    return { val: null, type: 'empty' };
  }

  // Si ya es número nativo
  if (typeof raw === 'number') {
    return isNaN(raw) ? { val: null, type: 'empty' } : { val: raw, type: 'number' };
  }

  // Si ya es Date nativo
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? { val: null, type: 'empty' } : { val: raw.getTime(), type: 'date' };
  }

  const str = String(raw).trim();
  if (str === '' || str === '-' || str === 'S/I' || str === 'N/A' || str === 'Sin designar') {
    return { val: null, type: 'empty' };
  }

  // Forzar tipo numérico si se especificó explícitamente
  if (explicitType === 'number') {
    const cleanNum = str.replace(/[$UF%\s]/gi, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleanNum);
    return isNaN(n) ? { val: 0, type: 'number' } : { val: n, type: 'number' };
  }

  // Forzar tipo fecha si se especificó explícitamente
  if (explicitType === 'date') {
    const parsedDate = parseDateToTimestamp(str);
    return parsedDate !== null ? { val: parsedDate, type: 'date' } : { val: 0, type: 'date' };
  }

  // Detección automática (auto)
  // 1. Detectar patrón de moneda / cifra (ej: $1.250.000, -12500, 35.4 UF, 19%)
  if (/^[-+]?[$UF€US\s]*[0-9]{1,3}(\.[0-9]{3})*(,[0-9]+)?[$UF%\s]*$/i.test(str) ||
      /^[-+]?[0-9]+(\.[0-9]+)?$/.test(str)) {
    const cleanNum = str.replace(/[$UF€US%\s]/gi, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleanNum);
    if (!isNaN(n)) {
      return { val: n, type: 'number' };
    }
  }

  // 2. Detectar fechas comunes en ERP (ISO 2026-10-22, 22-10-2026, 22/10/2026)
  const timestamp = parseDateToTimestamp(str);
  if (timestamp !== null) {
    return { val: timestamp, type: 'date' };
  }

  // 3. Cadena de texto estándar
  return { val: str.toLowerCase(), type: 'string' };
}

/**
 * Parser seguro de fechas para formatos habituales en Chile y ERP
 */
function parseDateToTimestamp(str: string): number | null {
  // ISO: YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const t = new Date(str).getTime();
    if (!isNaN(t)) return t;
  }

  // Formato chileno: DD/MM/YYYY o DD-MM-YYYY
  const matchCl = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (matchCl) {
    const day = parseInt(matchCl[1], 10);
    const month = parseInt(matchCl[2], 10) - 1;
    const year = parseInt(matchCl[3], 10);
    const hour = matchCl[4] ? parseInt(matchCl[4], 10) : 0;
    const min = matchCl[5] ? parseInt(matchCl[5], 10) : 0;
    const sec = matchCl[6] ? parseInt(matchCl[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  return null;
}

/**
 * Comparador universal Enterprise
 */
export function compareJDEValues(aRaw: any, bRaw: any, direction: JDESortDirection, type?: 'auto' | 'string' | 'number' | 'date'): number {
  const normA = normalizeJDEValue(aRaw, type);
  const normB = normalizeJDEValue(bRaw, type);

  // Valores vacíos siempre al final en cualquier sentido
  if (normA.type === 'empty' && normB.type === 'empty') return 0;
  if (normA.type === 'empty') return 1;
  if (normB.type === 'empty') return -1;

  let comp = 0;
  if (normA.type === 'number' && normB.type === 'number') {
    comp = normA.val - normB.val;
  } else if (normA.type === 'date' && normB.type === 'date') {
    comp = normA.val - normB.val;
  } else {
    const strA = String(normA.val);
    const strB = String(normB.val);
    comp = strA.localeCompare(strB, 'es', { numeric: true, sensitivity: 'base' });
  }

  return direction === 'asc' ? comp : -comp;
}

/**
 * Ordena un conjunto de datos según configuración Primaria y Secundaria
 */
export function sortJDEData<T>(
  data: T[],
  primarySort: JDESortConfig<T> | null,
  secondarySort?: JDESortConfig<T> | null
): T[] {
  if (!primarySort && !secondarySort) {
    return data;
  }

  const copy = [...data];
  return copy.sort((itemA, itemB) => {
    // 1. Criterio Primario
    if (primarySort) {
      const valA = primarySort.extractor ? primarySort.extractor(itemA) : (itemA as any)?.[primarySort.column];
      const valB = primarySort.extractor ? primarySort.extractor(itemB) : (itemB as any)?.[primarySort.column];
      const res = compareJDEValues(valA, valB, primarySort.direction, primarySort.type);
      if (res !== 0) return res;
    }

    // 2. Criterio Secundario (Desempate)
    if (secondarySort) {
      const valA = secondarySort.extractor ? secondarySort.extractor(itemA) : (itemA as any)?.[secondarySort.column];
      const valB = secondarySort.extractor ? secondarySort.extractor(itemB) : (itemB as any)?.[secondarySort.column];
      return compareJDEValues(valA, valB, secondarySort.direction, secondarySort.type);
    }

    return 0;
  });
}

/**
 * Hook oficial de React para implementar ordenamiento Enterprise en cualquier Grid
 */
export function useJDESort<T>(
  data: T[],
  defaultPrimarySort?: JDESortConfig<T> | null,
  defaultSecondarySort?: JDESortConfig<T> | null
) {
  const [primarySort, setPrimarySort] = useState<JDESortConfig<T> | null>(defaultPrimarySort || null);
  const [secondarySort, setSecondarySort] = useState<JDESortConfig<T> | null>(defaultSecondarySort || null);

  /**
   * Ciclo Enterprise FDA:
   *  - Primer Clic: Descendente ('desc') -> De mayor a menor / Del más reciente al más antiguo.
   *  - Segundo Clic: Ascendente ('asc') -> De menor a mayor / Del más antiguo al más reciente.
   *  - Tercer Clic: null -> Restablece el orden original / natural del grid.
   */
  const requestSort = useCallback((
    columnKey: string,
    options?: {
      label?: string;
      extractor?: (item: T) => any;
      type?: 'auto' | 'string' | 'number' | 'date';
      multiSort?: boolean; // si se presiona Shift o se invoca modo multi
    }
  ) => {
    if (options?.multiSort && primarySort && primarySort.column !== columnKey) {
      // Configurar como secundario
      setSecondarySort(prev => {
        if (!prev || prev.column !== columnKey) {
          return { column: columnKey, direction: 'desc', ...options };
        }
        if (prev.direction === 'desc') {
          return { column: columnKey, direction: 'asc', ...options };
        }
        return null;
      });
      return;
    }

    setPrimarySort(prev => {
      // 1. Primer clic: De mayor a menor / Más reciente a más antiguo ('desc')
      if (!prev || prev.column !== columnKey) {
        return {
          column: columnKey,
          direction: 'desc',
          label: options?.label,
          extractor: options?.extractor,
          type: options?.type
        };
      }
      // 2. Segundo clic: De menor a mayor / Más antiguo a más reciente ('asc')
      if (prev.direction === 'desc') {
        return {
          ...prev,
          direction: 'asc'
        };
      }
      // 3. Tercer clic: Restablece el orden natural
      return null;
    });
  }, [primarySort]);

  const clearSort = useCallback(() => {
    setPrimarySort(null);
    setSecondarySort(null);
  }, []);

  const setManualMultiSort = useCallback((
    newPrimary: JDESortConfig<T> | null,
    newSecondary: JDESortConfig<T> | null = null
  ) => {
    setPrimarySort(newPrimary);
    setSecondarySort(newSecondary);
  }, []);

  const sortedData = useMemo(() => {
    return sortJDEData(data, primarySort, secondarySort);
  }, [data, primarySort, secondarySort]);

  const getSortState = useCallback((columnKey: string) => {
    const isPrimary = primarySort?.column === columnKey;
    const isSecondary = secondarySort?.column === columnKey;
    const isSorted = isPrimary || isSecondary;
    const direction = isPrimary ? primarySort?.direction : isSecondary ? secondarySort?.direction : null;
    const rank = isPrimary ? 1 : isSecondary ? 2 : 0;

    return {
      isSorted,
      isPrimary,
      isSecondary,
      direction: direction || null,
      rank,
      tooltip: isSorted 
        ? `Ordenado por ${columnKey} (${direction === 'asc' ? 'Ascendente ▲' : 'Descendente ▼'}) - Clic para ${direction === 'asc' ? 'Descendente' : 'Quitar orden'}`
        : `Clic para ordenar por ${columnKey} (P0001)`
    };
  }, [primarySort, secondarySort]);

  return {
    sortedData,
    primarySort,
    secondarySort,
    requestSort,
    clearSort,
    setManualMultiSort,
    getSortState,
    isSorted: Boolean(primarySort || secondarySort)
  };
}
