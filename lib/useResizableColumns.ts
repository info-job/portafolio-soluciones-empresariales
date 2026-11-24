import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface ColumnWidths {
  [key: string]: number;
}

export interface RowHeights {
  [key: string]: number;
}

export interface ResizableGridOptions {
  initialWidths: ColumnWidths;
  initialRowHeight?: number;
  initialRowHeights?: RowHeights;
  storageKey?: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export function useResizableGrid(options: ResizableGridOptions | ColumnWidths) {
  // Normalize parameters: either options object or initialWidths map (backward compatible)
  const opts = ('initialWidths' in options && typeof (options as any).initialWidths === 'object') ? (options as ResizableGridOptions) : null;
  const initialWidths: ColumnWidths = opts ? opts.initialWidths : (options as ColumnWidths);
  const initialRowHeight: number = (opts && opts.initialRowHeight) ? opts.initialRowHeight : 38;
  const initialRowHeights: RowHeights = (opts && opts.initialRowHeights) ? opts.initialRowHeights : {};
  const storageKey: string | undefined = opts?.storageKey;
  const minWidth = opts?.minWidth ?? 35;
  const maxWidth = opts?.maxWidth ?? 1200;
  const minHeight = opts?.minHeight ?? 22;
  const maxHeight = opts?.maxHeight ?? 250;

  // Initialize column widths from localStorage if available
  const [widths, setWidths] = useState<ColumnWidths>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`grid_widths_${storageKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...initialWidths, ...parsed };
        }
      } catch (e) {
        // ignore
      }
    }
    return initialWidths;
  });

  // Default row height for all rows in this grid
  const [defaultRowHeight, setDefaultRowHeightState] = useState<number>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`grid_default_height_${storageKey}`);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= minHeight && parsed <= maxHeight) {
            return parsed;
          }
        }
      } catch (e) {
        // ignore
      }
    }
    return initialRowHeight;
  });

  // Specific per-row height overrides (keyed by row id or index)
  const [rowHeights, setRowHeights] = useState<RowHeights>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`grid_row_heights_${storageKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...initialRowHeights, ...parsed };
        }
      } catch (e) {
        // ignore
      }
    }
    return initialRowHeights;
  });

  // Save to localStorage when changed
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`grid_widths_${storageKey}`, JSON.stringify(widths));
      } catch (e) {
        // ignore
      }
    }
  }, [widths, storageKey]);

  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`grid_default_height_${storageKey}`, String(defaultRowHeight));
        localStorage.setItem(`grid_row_heights_${storageKey}`, JSON.stringify(rowHeights));
      } catch (e) {
        // ignore
      }
    }
  }, [defaultRowHeight, rowHeights, storageKey]);

  // COLUMN RESIZING REFS
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  // ROW RESIZING REFS
  const resizingRow = useRef<string | number | null>(null);
  const startY = useRef<number>(0);
  const startHeight = useRef<number>(0);
  const resizeAllRows = useRef<boolean>(false);

  // Active resizing state for UI indicator
  const [isResizing, setIsResizing] = useState(false);

  // Handle column mouse move & up
  const onColMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;
    const delta = e.pageX - startX.current;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + delta));
    setWidths(prev => ({
      ...prev,
      [resizingColumn.current!]: newWidth
    }));
  }, [minWidth, maxWidth]);

  const onColMouseUp = useCallback(() => {
    resizingColumn.current = null;
    setIsResizing(false);
    document.removeEventListener('mousemove', onColMouseMove);
    document.removeEventListener('mouseup', onColMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [onColMouseMove]);

  const onMouseDown = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColumn.current = columnId;
    startX.current = e.pageX;
    startWidth.current = widths[columnId] || 150;
    setIsResizing(true);

    document.addEventListener('mousemove', onColMouseMove);
    document.addEventListener('mouseup', onColMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [widths, onColMouseMove, onColMouseUp]);

  // Double click on column to reset to initial width
  const onColumnDoubleClick = useCallback((columnId: string) => {
    if (initialWidths[columnId]) {
      setWidths(prev => ({
        ...prev,
        [columnId]: initialWidths[columnId]
      }));
    }
  }, [initialWidths]);

  // Handle row mouse move & up
  const onRowMouseMove = useCallback((e: MouseEvent) => {
    if (resizingRow.current === null) return;
    const delta = e.pageY - startY.current;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight.current + delta));

    if (resizeAllRows.current) {
      setDefaultRowHeightState(newHeight);
    } else {
      const key = String(resizingRow.current);
      setRowHeights(prev => ({
        ...prev,
        [key]: newHeight
      }));
    }
  }, [minHeight, maxHeight]);

  const onRowMouseUp = useCallback(() => {
    resizingRow.current = null;
    resizeAllRows.current = false;
    setIsResizing(false);
    document.removeEventListener('mousemove', onRowMouseMove);
    document.removeEventListener('mouseup', onRowMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [onRowMouseMove]);

  const onRowMouseDown = useCallback((e: React.MouseEvent, rowId: string | number, applyToAll: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRow.current = rowId;
    startY.current = e.pageY;
    resizeAllRows.current = applyToAll || e.shiftKey;

    const key = String(rowId);
    startHeight.current = rowHeights[key] || defaultRowHeight;
    setIsResizing(true);

    document.addEventListener('mousemove', onRowMouseMove);
    document.addEventListener('mouseup', onRowMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [rowHeights, defaultRowHeight, onRowMouseMove, onRowMouseUp]);

  // Double click on row resizer to reset that row to defaultRowHeight
  const onRowDoubleClick = useCallback((rowId: string | number) => {
    const key = String(rowId);
    setRowHeights(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Helper to get row height
  const getRowHeight = useCallback((rowId?: string | number): number => {
    if (rowId !== undefined && rowId !== null) {
      const key = String(rowId);
      if (rowHeights[key] !== undefined) {
        return rowHeights[key];
      }
    }
    return defaultRowHeight;
  }, [rowHeights, defaultRowHeight]);

  // Set default height for all rows
  const setDefaultRowHeight = useCallback((height: number) => {
    const clamped = Math.max(minHeight, Math.min(maxHeight, height));
    setDefaultRowHeightState(clamped);
    // clear individual overrides so grid adopts uniform height
    setRowHeights({});
  }, [minHeight, maxHeight]);

  // Reset actions
  const resetWidths = useCallback(() => {
    setWidths(initialWidths);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`grid_widths_${storageKey}`);
      } catch (e) {}
    }
  }, [initialWidths, storageKey]);

  const resetHeights = useCallback(() => {
    setDefaultRowHeightState(initialRowHeight);
    setRowHeights(initialRowHeights);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`grid_default_height_${storageKey}`);
        localStorage.removeItem(`grid_row_heights_${storageKey}`);
      } catch (e) {}
    }
  }, [initialRowHeight, initialRowHeights, storageKey]);

  const resetAll = useCallback(() => {
    resetWidths();
    resetHeights();
  }, [resetWidths, resetHeights]);

  return {
    widths,
    setWidths,
    onMouseDown, // backward compatible for column resizing
    onColumnMouseDown: onMouseDown,
    onColumnDoubleClick,
    rowHeights,
    setRowHeights,
    defaultRowHeight,
    setDefaultRowHeight,
    getRowHeight,
    onRowMouseDown,
    onRowDoubleClick,
    resetWidths,
    resetHeights,
    resetAll,
    isResizing
  };
}

// Export both names for backwards compatibility
export const useResizableColumns = useResizableGrid;
