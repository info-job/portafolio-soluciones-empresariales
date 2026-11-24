import React, { useEffect, useRef, useState } from 'react';
import { 
  Eye, Edit3, Trash2, Copy, Paperclip, FileSpreadsheet, 
  Printer, RefreshCw, FilterX, BookOpen, X, CheckSquare, 
  Database, Check, Key, ChevronRight, Calculator, Activity
} from 'lucide-react';

export interface JDEContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  dividerAfter?: boolean;
  sectionHeader?: string;
  subItems?: JDEContextMenuItem[]; // Authentic ERP cascading flyout
  onClick?: () => void;
}

export interface JDEGridContextMenuProps {
  isOpen?: boolean;
  x: number;
  y: number;
  programCode?: string;      // e.g. "P0911", "P0411", "P950000", "P1501", "P48201", "P4210"
  programTitle?: string;     // e.g. "Customer Service Inquiry", "Work With Work Orders"
  collectionName?: string;   // e.g. "work_orders", "transactions", "suppliers", "audit_logs"
  recordKey?: string;        // e.g. "OT #10243" or document number
  recordData?: any;          // raw object for real-time inspection
  items?: JDEContextMenuItem[];
  rowExits?: JDEContextMenuItem[]; // Authentic ERP Row Exits (Salidas de Fila)
  currentStatus?: string;
  statusOptions?: { label: string; value: string; color?: string }[];
  onUpdateStatus?: (newStatus: string) => void | Promise<void>;
  onClose: () => void;
  // Default action shortcuts
  onSelectRow?: () => void;
  onViewDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onAttachments?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
  onRefresh?: () => void;
  onClearQBE?: () => void;
  onTraceability?: () => void;
  onTallyRows?: () => void;
  onOpenSortSequence?: () => void;
  onSetRowHeight?: (height: number) => void;
  onResetColumns?: () => void;
  onResetRows?: () => void;
  onResetGridDimensions?: () => void;
}

export const JDEGridContextMenu: React.FC<JDEGridContextMenuProps> = ({
  isOpen = true,
  x,
  y,
  programCode = 'P4210',
  programTitle = 'Customer Service Inquiry',
  collectionName = 'base_de_datos',
  recordKey,
  recordData,
  items,
  rowExits,
  currentStatus,
  statusOptions,
  onUpdateStatus,
  onClose,
  onSelectRow,
  onViewDetails,
  onEdit,
  onDelete,
  onCopy,
  onAttachments,
  onExportExcel,
  onPrint,
  onRefresh,
  onClearQBE,
  onTraceability,
  onTallyRows,
  onOpenSortSequence,
  onSetRowHeight,
  onResetColumns,
  onResetRows,
  onResetGridDimensions
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showRealTimeInspector, setShowRealTimeInspector] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [syncPulse, setSyncPulse] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Active flyout submenu tracking
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
  const closeSubmenuTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Viewport bounding calculation for classic ERP context menu
  const menuWidth = 195;
  const menuEstimatedHeight = 280;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  const posX = x + menuWidth > viewportWidth ? Math.max(10, x - menuWidth) : Math.max(10, x);
  const posY = y + menuEstimatedHeight > viewportHeight ? Math.max(10, y - menuEstimatedHeight) : Math.max(10, y);

  const isNearRightEdge = posX + menuWidth + 180 > viewportWidth;

  const handleTriggerRefresh = () => {
    setSyncPulse(true);
    setTimeout(() => setSyncPulse(false), 1200);
    if (onRefresh) onRefresh();
    onClose();
  };

  const handleCopyKey = () => {
    if (recordKey) {
      navigator.clipboard?.writeText(recordKey);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        onClose();
      }, 700);
    }
  };

  const handleStatusChange = async (newVal: string) => {
    if (!onUpdateStatus) return;
    setStatusUpdating(newVal);
    try {
      await onUpdateStatus(newVal);
      setSyncPulse(true);
      setTimeout(() => {
        setSyncPulse(false);
        setStatusUpdating(null);
        onClose();
      }, 500);
    } catch {
      setStatusUpdating(null);
    }
  };

  // Submenu hover handlers with small debounce tolerance for fluid mouse movement
  const handleItemMouseEnter = (id: string, hasChildren: boolean) => {
    if (closeSubmenuTimerRef.current) {
      clearTimeout(closeSubmenuTimerRef.current);
      closeSubmenuTimerRef.current = null;
    }
    if (hasChildren) {
      setActiveSubmenuId(id);
    } else {
      setActiveSubmenuId(null);
    }
  };

  const handleSubmenuMouseEnter = () => {
    if (closeSubmenuTimerRef.current) {
      clearTimeout(closeSubmenuTimerRef.current);
      closeSubmenuTimerRef.current = null;
    }
  };

  const handleMenuMouseLeave = () => {
    closeSubmenuTimerRef.current = setTimeout(() => {
      setActiveSubmenuId(null);
    }, 200);
  };

  // =========================================================================
  // BUILD AUTHENTIC ASSETFLOW ENTERPRISE CONTEXT MENU STRUCTURE
  // (Matches AssetFlow Enterprise exactly as in official UI)
  // =========================================================================

  interface JDESection {
    header: string;
    items: JDEContextMenuItem[];
  }

  const sections: JDESection[] = [];

  if (items && items.length > 0) {
    // When custom items are passed by callers (e.g. AuditLog, DueDiligence)
    // Structure them cleanly under Row and Tools while honoring section headers
    const rowItems: JDEContextMenuItem[] = [];
    const toolItems: JDEContextMenuItem[] = [];

    items.forEach((item) => {
      if (item.sectionHeader?.toLowerCase().includes('grid') || item.sectionHeader?.toLowerCase().includes('herramienta')) {
        toolItems.push(item);
      } else {
        rowItems.push(item);
      }
    });

    sections.push({
      header: 'Favorites',
      items: [
        ...(onSelectRow ? [{
          id: 'fav_select',
          label: 'Select / Fila Activa',
          shortcut: 'Enter',
          onClick: () => { onSelectRow(); onClose(); }
        }] : []),
        ...(onViewDetails ? [{
          id: 'fav_details',
          label: 'View / Detalle',
          shortcut: 'F4',
          onClick: () => { onViewDetails(); onClose(); }
        }] : []),
        ...(onEdit ? [{
          id: 'fav_edit',
          label: 'Edit / Modificar',
          shortcut: 'Ctrl+E',
          onClick: () => { onEdit(); onClose(); }
        }] : [])
      ]
    });

    if (rowItems.length > 0) {
      sections.push({
        header: 'Row',
        items: rowItems
      });
    }

    if (toolItems.length > 0 || onExportExcel || onClearQBE || onPrint) {
      const gridToolsSubmenu: JDEContextMenuItem[] = [
        ...(onExportExcel ? [{
          id: 'export_excel',
          label: 'Export to Excel (.xlsx)',
          shortcut: 'Ctrl+X',
          onClick: () => { onExportExcel(); onClose(); }
        }] : []),
        ...(onPrint ? [{
          id: 'print_grid',
          label: 'Print Grid',
          shortcut: 'Ctrl+P',
          onClick: () => { onPrint(); onClose(); }
        }] : []),
        ...(onClearQBE ? [{
          id: 'clear_qbe',
          label: 'Clear QBE Filters',
          onClick: () => { onClearQBE(); onClose(); }
        }] : []),
        ...(onTallyRows ? [{
          id: 'tally_rows',
          label: 'Row Tally / Totalizar',
          onClick: () => { onTallyRows(); onClose(); }
        }] : [])
      ];

      const dbToolsSubmenu: JDEContextMenuItem[] = [
        {
          id: 're_query',
          label: 'Re-Query from Database',
          shortcut: 'F5',
          onClick: handleTriggerRefresh
        },
        ...(recordData ? [{
          id: 'inspect_raw',
          label: 'Inspect Record [F980011D]',
          shortcut: 'F4',
          onClick: () => { setShowRealTimeInspector(true); }
        }] : []),
        ...(recordKey ? [{
          id: 'copy_key',
          label: copySuccess ? 'Copied to Clipboard!' : `Copy Key [${recordKey.slice(0, 14)}]`,
          onClick: handleCopyKey
        }] : [])
      ];

      sections.push({
        header: 'Tools',
        items: [
          ...toolItems,
          ...(gridToolsSubmenu.length > 0 ? [{
            id: 'menu_grid_tools',
            label: 'Grid Tools',
            subItems: gridToolsSubmenu
          }] : []),
          {
            id: 'menu_db_sync',
            label: 'Real-Time Database',
            subItems: dbToolsSubmenu
          }
        ]
      });
    }
  } else {
    // Standard authentic ERP Menu (Row & Tools with Cascading Flyouts)
    
    // 1. Favorites Section (Direct primary actions)
    const favoriteItems: JDEContextMenuItem[] = [
      ...(onSelectRow ? [{
        id: 'select_row',
        label: 'Select / Fila Activa',
        shortcut: 'Enter',
        onClick: () => { onSelectRow(); onClose(); }
      }] : []),
      ...(onViewDetails ? [{
        id: 'view_details',
        label: 'View / Detalle',
        shortcut: 'F4',
        onClick: () => { onViewDetails(); onClose(); }
      }] : []),
      ...(onEdit ? [{
        id: 'edit_row',
        label: 'Edit / Modificar',
        shortcut: 'Ctrl+E',
        onClick: () => { onEdit(); onClose(); }
      }] : [])
    ];

    if (favoriteItems.length > 0) {
      sections.push({
        header: 'Favorites',
        items: favoriteItems
      });
    }

    // 2. Row Section (Authentic Row Exits / Salidas de Fila)
    const rowSectionItems: JDEContextMenuItem[] = [];

    // Real-Time Status Transition Submenu
    if (statusOptions && statusOptions.length > 0 && onUpdateStatus) {
      rowSectionItems.push({
        id: 'status_submenu',
        label: `Status (${currentStatus || 'Update'})`,
        subItems: statusOptions.map(opt => ({
          id: `status_${opt.value}`,
          label: opt.value === currentStatus ? `✓ ${opt.label}` : `   ${opt.label}`,
          disabled: opt.value === currentStatus || statusUpdating === opt.value,
          onClick: () => handleStatusChange(opt.value)
        }))
      });
    }

    // Traceability One View
    if (onTraceability) {
      rowSectionItems.push({
        id: 'traceability',
        label: 'One View Traceability',
        shortcut: 'F8',
        onClick: () => { onTraceability(); onClose(); }
      });
    }

    // Specific caller Row Exits
    if (rowExits && rowExits.length > 0) {
      rowExits.forEach(exit => {
        rowSectionItems.push({
          ...exit,
          onClick: () => { exit.onClick?.(); onClose(); }
        });
      });
    }

    // Media Objects / Attachments
    if (onAttachments) {
      rowSectionItems.push({
        id: 'attachments',
        label: 'Media Objects (Attachments)',
        shortcut: 'F6',
        onClick: () => { onAttachments(); onClose(); }
      });
    }

    // Copy Row
    if (onCopy) {
      rowSectionItems.push({
        id: 'copy_row',
        label: 'Copy Row / Replicate',
        shortcut: 'Ctrl+C',
        onClick: () => { onCopy(); onClose(); }
      });
    }

    // Delete Row (danger)
    if (onDelete) {
      rowSectionItems.push({
        id: 'delete_row',
        label: 'Delete Row',
        shortcut: 'Del',
        danger: true,
        onClick: () => { onDelete(); onClose(); }
      });
    }

    sections.push({
      header: 'Row',
      items: rowSectionItems
    });

    // 3. Grid & Tools Section (Cascading Flyouts for Grid & Database)
    const gridDimensionsSubmenu: JDEContextMenuItem[] = [
      ...(onSetRowHeight ? [
        { id: 'dim_row_compact', label: 'Alto Fila: Compacto (26px)', onClick: () => { onSetRowHeight(26); onClose(); } },
        { id: 'dim_row_normal', label: 'Alto Fila: Normal (36px)', onClick: () => { onSetRowHeight(36); onClose(); } },
        { id: 'dim_row_comfy', label: 'Alto Fila: Cómodo (48px)', onClick: () => { onSetRowHeight(48); onClose(); } },
        { id: 'dim_row_spacious', label: 'Alto Fila: Amplio (62px)', onClick: () => { onSetRowHeight(62); onClose(); } },
      ] : []),
      ...(onResetColumns ? [
        { id: 'dim_reset_cols', label: 'Restablecer Ancho Columnas', onClick: () => { onResetColumns(); onClose(); } }
      ] : []),
      ...(onResetRows ? [
        { id: 'dim_reset_rows', label: 'Restablecer Alto Filas', onClick: () => { onResetRows(); onClose(); } }
      ] : []),
      ...(onResetGridDimensions ? [
        { id: 'dim_reset_all', label: 'Restablecer Todas las Dimensiones', onClick: () => { onResetGridDimensions(); onClose(); } }
      ] : [])
    ];

    const gridToolsSubmenu: JDEContextMenuItem[] = [
      ...(onOpenSortSequence ? [{
        id: 'sort_sequence_dialog',
        label: 'Secuencia de Ordenamiento JDE (P986110S)',
        shortcut: 'Ctrl+S',
        onClick: () => { onOpenSortSequence(); onClose(); }
      }] : []),
      ...(gridDimensionsSubmenu.length > 0 ? [{
        id: 'grid_dimensions_menu',
        label: 'Grid Dimensions (Alto/Ancho)',
        subItems: gridDimensionsSubmenu
      }] : []),
      ...(onExportExcel ? [{
        id: 'export_excel',
        label: 'Export to Excel (.xlsx)',
        shortcut: 'Ctrl+X',
        onClick: () => { onExportExcel(); onClose(); }
      }] : []),
      ...(onPrint ? [{
        id: 'print_grid',
        label: 'Print Grid',
        shortcut: 'Ctrl+P',
        onClick: () => { onPrint(); onClose(); }
      }] : []),
      ...(onClearQBE ? [{
        id: 'clear_qbe',
        label: 'Clear QBE Filters',
        onClick: () => { onClearQBE(); onClose(); }
      }] : []),
      ...(onTallyRows ? [{
        id: 'tally_rows',
        label: 'Row Tally / Totalizar',
        onClick: () => { onTallyRows(); onClose(); }
      }] : [])
    ];

    const dbToolsSubmenu: JDEContextMenuItem[] = [
      {
        id: 're_query',
        label: 'Re-Query from Database',
        shortcut: 'F5',
        onClick: handleTriggerRefresh
      },
      ...(recordData ? [{
        id: 'inspect_raw',
        label: 'Inspect Record [F980011D]',
        shortcut: 'F4',
        onClick: () => { setShowRealTimeInspector(true); }
      }] : []),
      ...(recordKey ? [{
        id: 'copy_key',
        label: copySuccess ? 'Copied to Clipboard!' : `Copy Key [${recordKey.slice(0, 14)}]`,
        onClick: handleCopyKey
      }] : [])
    ];

    sections.push({
      header: 'Tools',
      items: [
        ...(gridToolsSubmenu.length > 0 ? [{
          id: 'menu_grid_tools',
          label: 'Grid Tools',
          subItems: gridToolsSubmenu
        }] : []),
        {
          id: 'menu_db_sync',
          label: 'Real-Time Database',
          subItems: dbToolsSubmenu
        }
      ]
    });
  }

  return (
    <>
      <div
        ref={menuRef}
        role="menu"
        aria-label="AssetFlow Enterprise Context Menu"
        className="fixed z-[999999] select-none text-black animate-in fade-in duration-75"
        style={{
          top: `${posY}px`,
          left: `${posX}px`,
          minWidth: `${menuWidth}px`,
          backgroundColor: '#FFFFFF',
          border: '1px solid #7F9DB9',
          boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
          fontFamily: 'Tahoma, Arial, "Segoe UI", sans-serif',
          fontSize: '11px',
          lineHeight: '1.4',
          borderRadius: '0px'
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        onMouseLeave={handleMenuMouseLeave}
      >
        {/* ERP Menu Sections */}
        {sections.map((section, sIdx) => {
          if (section.items.length === 0) return null;

          return (
            <div key={`sec_${sIdx}`}>
              {/* Section Header (Authentic ERP italic header) */}
              <div 
                className="select-none px-4 pt-1 pb-0.5"
                style={{
                  fontStyle: 'italic',
                  fontWeight: 'normal',
                  color: '#222222',
                  fontSize: '11px'
                }}
              >
                {section.header}
              </div>

              {/* Items List */}
              <div className="py-0.5">
                {section.items.map((item) => {
                  const hasSubItems = !!(item.subItems && item.subItems.length > 0);
                  const isSubmenuOpen = activeSubmenuId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="relative"
                      onMouseEnter={() => handleItemMouseEnter(item.id, hasSubItems)}
                    >
                      <button
                        type="button"
                        disabled={item.disabled}
                        onClick={() => {
                          if (item.disabled) return;
                          if (hasSubItems) {
                            setActiveSubmenuId(prev => prev === item.id ? null : item.id);
                          } else if (item.onClick) {
                            item.onClick();
                          }
                        }}
                        className={`w-full flex items-center justify-between text-left transition-none cursor-pointer ${
                          item.disabled ? 'opacity-40 cursor-default' : ''
                        }`}
                        style={{
                          padding: '3px 14px',
                          color: isSubmenuOpen ? '#FFFFFF' : item.danger ? '#A80000' : '#000000',
                          backgroundColor: isSubmenuOpen ? '#0A246A' : 'transparent',
                          fontFamily: 'inherit',
                          fontSize: '11px'
                        }}
                        onMouseEnter={(e) => {
                          if (!item.disabled) {
                            e.currentTarget.style.backgroundColor = '#0A246A';
                            e.currentTarget.style.color = '#FFFFFF';
                            const arrow = e.currentTarget.querySelector('.jde-arrow');
                            if (arrow) (arrow as HTMLElement).style.color = '#FFFFFF';
                            const sc = e.currentTarget.querySelector('.jde-shortcut');
                            if (sc) (sc as HTMLElement).style.color = '#E0E8FF';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSubmenuOpen) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = item.danger ? '#A80000' : '#000000';
                            const arrow = e.currentTarget.querySelector('.jde-arrow');
                            if (arrow) (arrow as HTMLElement).style.color = '#000000';
                            const sc = e.currentTarget.querySelector('.jde-shortcut');
                            if (sc) (sc as HTMLElement).style.color = '#555555';
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          {item.shortcut && (
                            <span 
                              className="jde-shortcut text-[10px]"
                              style={{ color: isSubmenuOpen ? '#E0E8FF' : '#555555' }}
                            >
                              {item.shortcut}
                            </span>
                          )}
                          {hasSubItems && (
                            <span 
                              className="jde-arrow text-[10px]"
                              style={{ 
                                color: isSubmenuOpen ? '#FFFFFF' : '#000000',
                                transform: 'scaleY(0.9)'
                              }}
                            >
                              ▶
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Cascading Submenu Flyout (Authentic ERP Flyout) */}
                      {hasSubItems && isSubmenuOpen && (
                        <div
                          className="absolute z-[1000000] select-none text-black animate-in fade-in duration-75"
                          style={{
                            top: '-1px',
                            [isNearRightEdge ? 'right' : 'left']: 'calc(100% - 2px)',
                            minWidth: '160px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #7F9DB9',
                            boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
                            fontFamily: 'Tahoma, Arial, "Segoe UI", sans-serif',
                            fontSize: '11px',
                            padding: '2px 0',
                            borderRadius: '0px'
                          }}
                          onMouseEnter={handleSubmenuMouseEnter}
                        >
                          {item.subItems!.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              disabled={sub.disabled}
                              onClick={() => {
                                if (sub.disabled) return;
                                if (sub.onClick) sub.onClick();
                              }}
                              className={`w-full flex items-center justify-between text-left transition-none cursor-pointer ${
                                sub.disabled ? 'opacity-40 cursor-default' : ''
                              }`}
                              style={{
                                padding: '3px 14px',
                                color: sub.danger ? '#A80000' : '#000000',
                                backgroundColor: 'transparent',
                                fontSize: '11px',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => {
                                if (!sub.disabled) {
                                  e.currentTarget.style.backgroundColor = '#0A246A';
                                  e.currentTarget.style.color = '#FFFFFF';
                                  const sc = e.currentTarget.querySelector('.jde-shortcut');
                                  if (sc) (sc as HTMLElement).style.color = '#E0E8FF';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = sub.danger ? '#A80000' : '#000000';
                                const sc = e.currentTarget.querySelector('.jde-shortcut');
                                if (sc) (sc as HTMLElement).style.color = '#555555';
                              }}
                            >
                              <span className="truncate">{sub.label}</span>
                              {sub.shortcut && (
                                <span 
                                  className="jde-shortcut text-[10px] ml-3"
                                  style={{ color: '#555555' }}
                                >
                                  {sub.shortcut}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Horizontal Divider between sections */}
              {sIdx < sections.length - 1 && (
                <div 
                  className="mx-1 my-0.5"
                  style={{
                    height: '1px',
                    backgroundColor: '#D6D6D6'
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Discreet ERP System Footer (Status Reference) */}
        <div 
          className="px-4 py-1 text-[9.5px] border-t border-[#E0E0E0] text-[#666666] flex items-center justify-between select-none"
          style={{ backgroundColor: '#F8F9FA' }}
        >
          <span className="font-mono">[{programCode}]</span>
          <span className="truncate ml-1">{collectionName}</span>
        </div>
      </div>

      {/* ERP F980011D Real-Time Document Inspector Modal */}
      {showRealTimeInspector && recordData && (
        <div 
          className="fixed inset-0 z-[1000000] bg-slate-900/60 flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setShowRealTimeInspector(false)}
        >
          <div 
            className="bg-white border border-[#7F9DB9] shadow-2xl w-full max-w-2xl overflow-hidden font-sans text-xs select-text"
            style={{ borderRadius: '0px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#0A246A] text-white px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-[#FFD15C]" />
                <span className="font-mono text-[#FFD15C] font-bold">[F980011D]</span>
                <span className="font-bold uppercase tracking-wide">AssetFlow Enterprise Document Inspector</span>
              </div>
              <button 
                onClick={() => setShowRealTimeInspector(false)}
                className="text-slate-300 hover:text-white p-1 hover:bg-white/10 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Connection Banner */}
            <div className="bg-[#F0F4F8] border-b border-[#D0D8E0] px-4 py-1.5 flex items-center justify-between font-mono text-[10px]">
              <div className="flex items-center gap-2 text-[#0A246A]">
                <Activity size={12} className="text-emerald-700 animate-pulse" />
                <span>Program: <strong>{programCode}</strong> | Table: <strong>{collectionName}</strong></span>
              </div>
              <span className="bg-emerald-700 text-white font-bold px-2 py-0.5 text-[9px]">
                ON-SNAPSHOT LIVE
              </span>
            </div>

            {/* Content: Form Fields & Raw JSON */}
            <div className="p-4 max-h-[60vh] overflow-y-auto custom-audit-scroll space-y-4">
              <div className="bg-[#FAFBFD] border border-[#CCD6E0] p-3">
                <div className="text-[10px] font-bold text-[#0A246A] font-mono uppercase mb-2 border-b border-[#CCD6E0] pb-1">
                  Primary Record Attributes (F980011D Master Schema)
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block text-[9.5px]">Record Key:</span>
                    <strong className="text-[#0A246A] select-all">{recordData.id || recordData.folio || recordKey || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9.5px]">Collection:</span>
                    <strong className="text-emerald-800">{collectionName}</strong>
                  </div>
                  {recordData.folio && (
                    <div>
                      <span className="text-slate-500 block text-[9.5px]">Document Folio:</span>
                      <strong className="text-indigo-900">#{recordData.folio}</strong>
                    </div>
                  )}
                  {recordData.status && (
                    <div>
                      <span className="text-slate-500 block text-[9.5px]">Current Status:</span>
                      <span className="bg-slate-200 px-1 py-0.2 font-bold">{recordData.status}</span>
                    </div>
                  )}
                  {recordData.total !== undefined && (
                    <div>
                      <span className="text-slate-500 block text-[9.5px]">Amount / Total:</span>
                      <strong className="text-emerald-700">${Number(recordData.total).toLocaleString('es-CL')}</strong>
                    </div>
                  )}
                  {recordData.amount !== undefined && (
                    <div>
                      <span className="text-slate-500 block text-[9.5px]">Transaction Amount:</span>
                      <strong className="text-emerald-700">${Number(recordData.amount).toLocaleString('es-CL')}</strong>
                    </div>
                  )}
                  {recordData.updatedAt && (
                    <div>
                      <span className="text-slate-500 block text-[9.5px]">Last Updated:</span>
                      <span className="text-slate-700">{String(recordData.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Raw JSON inspection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-bold text-slate-700 uppercase">Live JSON Document:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(recordData, null, 2));
                      alert("JSON del documento copiado al portapapeles.");
                    }}
                    className="text-[9.5px] font-mono text-[#0A246A] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <Copy size={11} /> Copy JSON
                  </button>
                </div>
                <pre className="bg-[#1E293B] text-emerald-400 p-3 text-[10px] font-mono overflow-x-auto max-h-56 leading-relaxed select-all">
                  {JSON.stringify(recordData, null, 2)}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#F0F4F8] border-t border-[#D0D8E0] p-3 flex justify-between items-center font-mono text-[10px]">
              <span className="text-slate-600">AssetFlow Enterprise Integration</span>
              <button 
                onClick={() => setShowRealTimeInspector(false)}
                className="bg-[#0A246A] hover:bg-[#081C52] text-white px-4 py-1.5 font-bold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
