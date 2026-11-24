
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { DEFAULT_ASSETFLOW_SVG, getSvgAsPngBase64 } from './defaultLogo';

export const notifyAuditExport = (fileName: string, recordCount?: number, details?: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('assetflow:action', {
      detail: {
        action: 'EXPORT',
        entityType: 'EXCEL_EXPORT',
        entityId: `EXP-${Date.now()}`,
        entityName: fileName,
        details: details || `Exportación de planilla Excel generada: ${fileName} ${recordCount !== undefined ? `(${recordCount} registros)` : ''}`
      }
    }));
  }
};

export const exportToExcel = async (data: any[], fileName: string, sheetName: string = 'Datos', extension: 'xlsx' | 'xls' = 'xlsx') => {
  try {
    if (!data || data.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    notifyAuditExport(fileName, data.length);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Title rows
    const companyTitle = 'ASSETFLOW - CORPORACIÓN DE SEGUROS';
    const reportTitle = sheetName.toUpperCase();
    const generationDate = `Fecha de Generación: ${new Date().toLocaleString()}`;

    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = companyTitle;
    titleCell.font = { name: 'Arial Black', size: 14, color: { argb: 'FF4F46E5' } }; // Indigo-600

    worksheet.mergeCells('A2:D2');
    const subTitleCell = worksheet.getCell('A2');
    subTitleCell.value = reportTitle;
    subTitleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1E293B' } }; // Slate-800

    worksheet.mergeCells('A3:D3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = generationDate;
    dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } }; // Slate-500

    // Leave a row empty
    worksheet.addRow([]);

    // Add headers and format them
    const headers = Object.keys(data[0]);
    const headerRow = worksheet.addRow(headers);
    
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Slate-800
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' }, // White
        size: 10
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Helper to format epoch timestamps into short time (HH:mm) for Excel
    const formatCellValueForExcel = (item: any, key: string, rawVal: any) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'timestamp' || lowerKey.endsWith('timestamp')) {
        if (typeof item?.releaseTime === 'string' && /^\d{2}:\d{2}/.test(item.releaseTime.trim())) {
          return item.releaseTime.trim().slice(0, 5);
        }
        if (typeof rawVal === 'number' && rawVal > 1000000000) {
          const d = new Date(rawVal);
          if (!isNaN(d.getTime())) {
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
          }
        }
        if (typeof rawVal === 'string' && /^\d{10,14}$/.test(rawVal.trim())) {
          const d = new Date(Number(rawVal.trim()));
          if (!isNaN(d.getTime())) {
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
          }
        }
      }
      return rawVal;
    };

    // Add data
    data.forEach((item) => {
      const formattedValues = headers.map((key) => formatCellValueForExcel(item, key, item[key]));
      const row = worksheet.addRow(formattedValues);
      row.eachCell((cell, colNumber) => {
        const colKey = (headers[colNumber - 1] || '').toLowerCase();
        cell.font = { size: 10 };
        if (colKey === 'timestamp' || colKey.endsWith('timestamp') || colKey === 'releasetime') {
          cell.numFmt = 'hh:mm';
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFF1F5F9' } }, // Slate-100
          left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
          bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
          right: { style: 'thin', color: { argb: 'FFF1F5F9' } }
        };
      });
    });

    // Auto-calculate column widths
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 12), 60);
    });

    // Freeze panes: Freeze the header row (row 5)
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 5, activeCell: 'A6' }
    ];

    // Filter
    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: headers.length }
    };

    // Buffer and save
    const buffer = await workbook.xlsx.writeBuffer();
    const mimeType = extension === 'xls' ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    saveAs(new Blob([buffer], { type: mimeType }), `${fileName}.${extension}`);
    
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Ocurrió un error al intentar exportar los datos.');
  }
};

export const exportHelpDeskToExcel = async (tickets: any[], fileName: string) => {
  const safeDateString = (dateVal: any, fallback = 'N/A'): string => {
    if (!dateVal) return fallback;
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CL');
    }
    return String(dateVal);
  };

  try {
    if (!tickets || tickets.length === 0) {
      alert('No hay tickets para exportar.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Helpdesk y Subtareas');

    // Title rows
    const companyTitle = 'ASSETFLOW - CONTROL DE OPERACIONES Y TECNOLOGÍA';
    const reportTitle = 'REPORTE DE SOLICITUDES HECHAS A TI, HELP DESK';
    const generationDate = `Fecha de Generación: ${new Date().toLocaleString('es-CL')}`;

    worksheet.mergeCells('A1:L1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = companyTitle;
    titleCell.font = { name: 'Arial Black', size: 14, color: { argb: 'FF4F46E5' } };

    worksheet.mergeCells('A2:L2');
    const subTitleCell = worksheet.getCell('A2');
    subTitleCell.value = reportTitle;
    subTitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };

    worksheet.mergeCells('A3:L3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = generationDate;
    dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };

    worksheet.addRow([]); // Blank row
    
    // Header row
    const headers = [
      'Folio',
      'Nivel de Fila',
      'Título / Actividad',
      'Descripción / Detalle',
      'Categoría',
      'Prioridad',
      'Estado',
      'Solicitante / Límite',
      'Asignado a',
      'Fecha Creación',
      'Días Transcurridos',
      'Fecha Fin / Resolución'
    ];
    
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF312E81' } // Dark Indigo/Navy blue
      };
      cell.font = {
        name: 'Arial',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 9.5
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1E1B4B' } },
        left: { style: 'thin', color: { argb: 'FF1E1B4B' } },
        bottom: { style: 'medium', color: { argb: 'FF1E1B4B' } },
        right: { style: 'thin', color: { argb: 'FF1E1B4B' } }
      };
    });

    // Add hierarchical rows
    tickets.forEach((t) => {
      let diffDaysText = '0 días';
      if (t.createdAt) {
        const initDate = new Date(t.createdAt);
        if (!isNaN(initDate.getTime())) {
          const diffMs = Math.max(0, Date.now() - initDate.getTime());
          const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          diffDaysText = `${d} ${d === 1 ? 'día' : 'días'}`;
        }
      }

      const ticketRowData = [
        t.folio,
        'TICKET PRINCIPAL',
        t.title,
        t.description || '',
        t.category,
        t.priority,
        t.status,
        t.requester || t.userCreator,
        t.assignedTo || 'Sin asignar',
        safeDateString(t.createdAt),
        diffDaysText,
        t.resolution || 'N/A'
      ];
      
      const tRow = worksheet.addRow(ticketRowData);
      tRow.height = 22;
      tRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' } // Light slate for ticket header row
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
        
        // Colors for Status and Priority
        if (colNumber === 7) { 
          if (t.status === 'RESUELTO' || t.status === 'CERRADO') {
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF15803D' } }; 
          } else if (t.status === 'EN_PROCESO') {
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB45309' } }; 
          } else {
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1D4ED8' } }; 
          }
        }
        if (colNumber === 6) { 
          if (t.priority === 'CRÍTICA' || t.priority === 'ALTA') {
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } }; 
          }
        }
      });

      // Subtasks rows
      const subtasks = t.subtasks || [];
      subtasks.forEach((st: any) => {
        const subtaskRowData = [
          '', 
          '↳ SUB-TAREA',
          `    ↳ ${st.title}`,
          st.description || 'Sin descripción adicional',
          '', 
          '', 
          st.status,
          st.dueDate ? `Límite: ${safeDateString(st.dueDate)}` : 'Sin límite',
          '', 
          '', 
          '',
          st.completedAt ? `Completada: ${safeDateString(st.completedAt)}` : 'Incompleta'
        ];

        const stRow = worksheet.addRow(subtaskRowData);
        stRow.height = 18;
        stRow.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF475569' } }; 
          
          if (st.status === 'FINALIZADA') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF0FDF4' } 
            };
            if (colNumber === 3) {
              cell.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF15803D' }, strike: true };
            }
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFBEB' } 
            };
          }

          cell.border = {
            top: { style: 'hair', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };

          if (colNumber === 7) { 
            if (st.status === 'FINALIZADA') {
              cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF16A34A' } };
            } else {
              cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FFD97706' } };
            }
          }
        });
      });
    });

    // Auto calculate width
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 12), 50);
    });

    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 5, activeCell: 'A6' }
    ];

    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: headers.length }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${fileName}.xlsx`);
    
  } catch (error) {
    console.error('Error exporting hierarchical HelpDesk to Excel:', error);
    alert('Ocurrió un error al intentar exportar los datos jerárquicos.');
  }
};

export const exportWorkOrdersToExcel = async (workOrders: any[], fileName: string) => {
  const safeDateString = (dateVal: any, fallback = 'N/A'): string => {
    if (!dateVal) return fallback;
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CL');
    }
    return String(dateVal);
  };
  
  const formatMoney = (val: any) => {
    if (val === undefined || val === null || val === '') return '';
    const num = Number(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(num);
  };

  try {
    if (!workOrders || workOrders.length === 0) {
      alert('No hay órdenes de trabajo para exportar.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ordenes e Hitos de OTs');

    // Title rows
    const companyTitle = 'ASSETFLOW - GERENCIA INMOBILIARIA Y MANTENCIONES';
    const reportTitle = 'REPORTE CONSOLIDADO DE ORDENES DE TRABAJO (OT) Y HITOS DE SEGUIMIENTO SEMANAL';
    const generationDate = `Fecha de Generación: ${new Date().toLocaleString('es-CL')}`;

    worksheet.mergeCells('A1:N1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = companyTitle;
    titleCell.font = { name: 'Arial Black', size: 14, color: { argb: 'FF047857' } }; // Emerald-700

    worksheet.mergeCells('A2:N2');
    const subTitleCell = worksheet.getCell('A2');
    subTitleCell.value = reportTitle;
    subTitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };

    worksheet.mergeCells('A3:N3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = generationDate;
    dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };

    worksheet.addRow([]); // Blank row
    
    // Header row
    const headers = [
      'Folio OT',
      'Tipo de Registro',
      'Acción / Detalle de Hito',
      'Categoría del Trabajo',
      'Especialidad / Rubro',
      'Factura / Docto Asociado',
      'Proveedor de la OT',
      'Ubicación Propiedad / Ejecutor de Hito',
      'Fecha Emisión / Registro',
      'Fecha Límite / Plazo',
      'Responsable de Seguimiento',
      'Registrado Por',
      'Monto Total OT',
      'Estado General / Estado Hito'
    ];
    
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF047857' } // Emerald-700
      };
      cell.font = {
        name: 'Arial',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 9.5
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF064E3B' } },
        left: { style: 'thin', color: { argb: 'FF064E3B' } },
        bottom: { style: 'medium', color: { argb: 'FF064E3B' } },
        right: { style: 'thin', color: { argb: 'FF064E3B' } }
      };
    });

    workOrders.forEach((o) => {
      // Main OT Row
      const otRowData = [
        o.folio,
        `OT PRINCIPAL - ${o.folio}`,
        o.specialInstructions || 'SIN INSTRUCCIONES ESPECIALES',
        o.category || 'MANTENCIÓN PREVENTIVA',
        o.specialty || 'TECHUMBRES',
        o.associatedInvoice || '-',
        o.supplierName,
        o.propertyLabel || 'S/I',
        safeDateString(o.issueDate),
        safeDateString(o.deliveryDate),
        o.trackingResponsible || 'SIN DESIGNAR',
        o.preparedBy || 'N/A',
        formatMoney(o.total),
        o.status
      ];
      
      const otRow = worksheet.addRow(otRowData);
      otRow.height = 22;
      otRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2F0D9' } // Very soft emerald tint
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFA1A1AA' } },
          bottom: { style: 'thin', color: { argb: 'FFA1A1AA' } },
          left: { style: 'thin', color: { argb: 'FFA1A1AA' } },
          right: { style: 'thin', color: { argb: 'FFA1A1AA' } }
        };
        
        // Custom aligned for money
        if (colNumber === 13) {
          cell.alignment = { horizontal: 'right' };
        }

        // Data Validations
        if (colNumber === 4) {
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"MANTENCIÓN PREVENTIVA,MANTENCIÓN CORRECTIVA,REPARACIÓN EXTRAORDINARIA,CERTIFICACIÓN / SELLO,EMERGENCIA,MEJORA / INSTALACIÓN,SANITIZACIÓN / FUMIGACIÓN,OTROS"']
          };
        }

        if (colNumber === 5) {
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"TECHUMBRES,PLOMERÍA / GASFITERÍA,ALFOMBRAS / PISOS,PINTURA,ELECTRICIDAD,CLIMATIZACIÓN,ASCENSORES,SEGURIDAD,OBRA GRUESA / ALBAÑILERÍA,SANITIZACIÓN / FUMIGACIÓN,JARDINERÍA / PAISAJISMO,OTROS"']
          };
        }

        if (colNumber === 14) {
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"BORRADOR,PENDIENTE_VB,APROBADA,RECEPCIONADA_PARCIAL,RECEPCIONADA,TERMINADA,PAGADA,ANULADA"']
          };
        }
      });

      // Actions/Milestones Rows (Hitos)
      const actions = o.trackingActions || [];
      actions.forEach((act: any) => {
        const actionEntryDate = act.entryDate || (act.date ? act.date.split('T')[0] : '');
        const actRowData = [
          '',
          '↳ HITO DE SEGUIMIENTO',
          act.description,
          '',
          '',
          '',
          act.actionResponsible || 'SIN ASIGNAR',
          safeDateString(actionEntryDate),
          safeDateString(act.deadline),
          act.trackingResponsible || o.trackingResponsible || 'SIN DESIGNAR',
          act.user || 'N/A',
          '',
          '',
          act.type || 'PENDIENTE'
        ];

        const actRow = worksheet.addRow(actRowData);
        actRow.height = 18;
        actRow.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF334155' } };
          
          if (act.type === 'REALIZADA' || act.type === 'COMPLETADO') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF0FDF4' } // very soft light green
            };
            if (colNumber === 3) {
              cell.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF16A34A' }, strike: true };
            }
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFBEB' } // very soft yellow
            };
          }

          cell.border = {
            top: { style: 'hair', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };

          if (colNumber === 14) {
            cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: act.type === 'REALIZADA' ? 'FF16A34A' : 'FFD97706' } };
            cell.dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: ['"REALIZADA,PENDIENTE,ATRASADA,COMPLETADO"']
            };
          }
        });
      });
    });

    // Auto calculate column width
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 3, 12), 45);
    });

    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 5, activeCell: 'A6' }
    ];

    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: headers.length }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${fileName}.xlsx`);
    
  } catch (error) {
    console.error('Error exporting hierarchical WorkOrders to Excel:', error);
    alert('Ocurrió un error al intentar exportar los datos jerárquicos de Ordenes de Trabajo.');
  }
};

export const exportSolicitudesToExcel = async (
  solicitudes: any[],
  properties: any[],
  workOrders: any[],
  fileName: string
) => {
  const safeDateString = (dateVal: any, fallback = 'N/A'): string => {
    if (!dateVal) return fallback;
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CL');
    }
    return String(dateVal);
  };

  try {
    if (!solicitudes || solicitudes.length === 0) {
      alert('No hay solicitudes para exportar.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Solicitudes y Subtareas');

    // Title rows
    const companyTitle = 'ASSETFLOW - DEPARTAMENTO INMOBILIARIO';
    const reportTitle = 'REPORTE CONSOLIDADO DE SOLICITUDES, TAREAS Y SUB-TAREAS';
    const generationDate = `Fecha de Generación: ${new Date().toLocaleString('es-CL')}`;

    worksheet.mergeCells('A1:P1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = companyTitle;
    titleCell.font = { name: 'Arial Black', size: 14, color: { argb: 'FFE11D48' } }; // Rose-600

    worksheet.mergeCells('A2:P2');
    const subTitleCell = worksheet.getCell('A2');
    subTitleCell.value = reportTitle;
    subTitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } }; // Slate-800

    worksheet.mergeCells('A3:P3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = generationDate;
    dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } }; // Slate-400

    worksheet.addRow([]); // Blank row

    // Headers list - 16 columns (A to P)
    const headers = [
      'Seq.',
      'Nivel de Fila',
      'ID Solicitud',
      'Título / Detalle de Subtarea',
      'Estado',
      'Prioridad',
      'Categoría',
      'Conjunto / Edificio',
      'Comuna',
      'Región',
      'Dirección',
      'Fecha Registro / Plazo',
      'Solicitante / Asignado',
      'Folio OT',
      'Última Modificación / Término',
      'Autor Modificación'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.fill = {
         type: 'pattern',
         pattern: 'solid',
         fgColor: { argb: 'FF9F1239' } // Deep Crimson / Rose-800
      };
      cell.font = {
        name: 'Arial',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 9.5
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF4C0519' } },
        left: { style: 'thin', color: { argb: 'FF4C0519' } },
        bottom: { style: 'medium', color: { argb: 'FF4C0519' } },
        right: { style: 'thin', color: { argb: 'FF4C0519' } }
      };
    });

    // Populate rows
    solicitudes.forEach((sol, index) => {
      const prop = properties.find(p => p.id === sol.propertyId);
      const region = prop?.region || 'METROPOLITANA';
      const commune = prop?.commune || 'SANTIAGO';
      const conjunto = prop?.conjunto || prop?.building || 'GENERAL';
      const address = prop?.address || '';

      // Main Solicitud Row data
      const solicitudRowData = [
        (index + 1).toString(), // Seq
        'SOLICITUD PRINCIPAL',   // Nivel de Fila
        sol.id.split('-')[0],    // ID Solicitud
        sol.title.toUpperCase(), // Título / Glosa
        sol.status,              // Estado
        sol.priority,            // Prioridad
        sol.category,            // Categoría
        conjunto,                // Conjunto
        commune,                 // Comuna
        region,                  // Región
        address,                 // Dirección
        safeDateString(sol.requestDate), // Fecha Registro / Plazo
        sol.applicantName || 'SISTEMA',  // Solicitante / Asignado
        sol.workOrderFolio || 'SIN ASIGNAR', // Folio OT
        safeDateString(sol.lastModifiedAt || sol.requestDate), // Última Modificación / Término
        sol.lastModifiedBy || sol.userCreator || 'SISTEMA' // Autor Modificación
      ];

      const parentRow = worksheet.addRow(solicitudRowData);
      parentRow.height = 24;
      parentRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF1F2' } // Soft Rose-50 for Parent row
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFFDA4AF' } },
          bottom: { style: 'thin', color: { argb: 'FFFDA4AF' } },
          left: { style: 'thin', color: { argb: 'FFFDA4AF' } },
          right: { style: 'thin', color: { argb: 'FFFDA4AF' } }
        };

        // Alignments
        if (
          colNumber === 1 || colNumber === 2 || colNumber === 3 || colNumber === 5 || 
          colNumber === 6 || colNumber === 7 || colNumber === 12 || colNumber === 14 || 
          colNumber === 15 || colNumber === 16
        ) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }

        // Color status & priority
        if (colNumber === 5) { // Estado
          if (sol.status === 'APROBADA_JEFATURA' || sol.status === 'FINALIZADA') {
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF15803D' } }; // Green-700
          } else if (sol.status === 'EN_PROCESO') {
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0369A1' } }; // Sky-700
          } else if (sol.status === 'DETENIDA') {
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } }; // Red-700
          } else {
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB45309' } }; // Amber-700
          }
        }

        if (colNumber === 6) { // Prioridad
          if (sol.priority === 'CRÍTICA' || sol.priority === 'ALTA') {
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFBE123C' } }; // Rose-700
          }
        }
      });

      // Child Subtask rows
      const subtasks = sol.subtasks || [];
      subtasks.forEach((st: any, stIndex: number) => {
        const subSeq = `${index + 1}.${stIndex + 1}`;
        
        const subtaskRowData = [
          subSeq,                  // Seq
          '↳ SUBTAREA DE CASO',     // Nivel de Fila
          sol.id.split('-')[0],    // ID Solicitud (for filtering)
          `    ↳ ${st.title} ${st.description ? `(${st.description})` : ''}`, // Title indented
          st.status,               // Subtask status
          '-',                     // Prioridad placeholder
          'SUBTAREA',              // Categoría
          '',                      // Conjunto (empty to clean hierarchy)
          '',                      // Comuna
          '',                      // Región
          '',                      // Dirección
          st.dueDate ? `Vcto: ${safeDateString(st.dueDate)}` : '-', // Due Date / Fecha Registro / Plazo
          st.assignedTo ? `Asig: ${st.assignedTo}` : 'SIN ASIGNAR', // Assigned To / Solicitante / Asignado
          '',                      // Folio OT placeholder
          st.completedAt ? `Fin: ${safeDateString(st.completedAt)}` : '-', // Completed At / Última Modificación / Término
          ''                       // Autor modificacion placeholder
        ];

        const childRow = worksheet.addRow(subtaskRowData);
        childRow.height = 20;
        childRow.eachCell((cell, colNumber) => {
          const isDone = st.status === 'FINALIZADA';
          
          cell.font = { 
            name: 'Arial', 
            size: 8.5, 
            italic: true, 
            color: isDone ? { argb: 'FF15803D' } : { argb: 'FF475569' } // Slate-600
          };

          // Soft green background for completed, and soft yellow for pending subtasks
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: isDone ? { argb: 'FFF0FDF4' } : { argb: 'FFFFFBEB' } 
          };

          cell.border = {
            top: { style: 'hair', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };

          // Strike-through content on completed subtareas title
          if (colNumber === 4 && isDone) {
            cell.font = { 
              name: 'Arial', 
              size: 8.5, 
              italic: true, 
              color: { argb: 'FF15803D' },
              strike: true 
            };
          }

          // Alignments
          if (
            colNumber === 1 || colNumber === 2 || colNumber === 3 || colNumber === 5 || 
            colNumber === 6 || colNumber === 7 || colNumber === 12 || colNumber === 13 ||
            colNumber === 14 || colNumber === 15 || colNumber === 16
          ) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }

          // Status colors for subtasks
          if (colNumber === 5) {
            if (isDone) {
              cell.font = { name: 'Arial', size: 8.5, bold: true, italic: true, color: { argb: 'FF16A34A' } };
            } else if (st.status === 'EN_PROCESO') {
              cell.font = { name: 'Arial', size: 8.5, bold: true, italic: true, color: { argb: 'FF0284C7' } };
            } else {
              cell.font = { name: 'Arial', size: 8.5, bold: true, italic: true, color: { argb: 'FFD97706' } };
            }
          }
        });
      });
    });

    // Auto calculate column width
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 3, 12), 48);
    });

    // Freeze headers on row 5
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 5, activeCell: 'A6' }
    ];

    // Auto filter from row 5 on headers
    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: headers.length }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${fileName}.xlsx`);

  } catch (error) {
    console.error('Error exporting hierarchical Solicitudes to Excel:', error);
    alert('Ocurrió un error al intentar exportar los datos jerárquicos de Solicitudes y Subtareas.');
  }
};

export const exportDelinquencyTemplateToExcel = async (fileName: string = 'Template_Reporte_Morosidad_Mensual') => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Control de Morosidad');

    // Attempt to fetch and add the PNG logo base64 as worksheet header
    let imageId: number | null = null;
    try {
      const pngBase64 = await getSvgAsPngBase64(DEFAULT_ASSETFLOW_SVG);
      const base64Data = pngBase64.replace(/^data:image\/\w+;base64,/, "");
      imageId = workbook.addImage({
        base64: base64Data,
        extension: 'png',
      });
    } catch (logoError) {
      console.warn('Could not add the company logo to the Excel workbook:', logoError);
    }

    // Title Block background fill - Row 1 to 4 with a soft corporate light green theme
    for (let r = 1; r <= 4; r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= 10; c++) {
        const cell = row.getCell(c);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2F0D9' } // Classic Excel Soft Olive Green
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFA9D08E' } }
        };
      }
    }

    // Logo layout placement
    if (imageId !== null) {
      worksheet.mergeCells('A1:B3');
      worksheet.addImage(imageId, {
        tl: { col: 0.1, row: 0.1 } as any,
        br: { col: 1.9, row: 2.9 } as any,
        editAs: 'oneCell'
      });
    } else {
      worksheet.mergeCells('A1:B3');
      const logoCell = worksheet.getCell('A1');
      logoCell.value = 'ASSETFLOW INMOBILIARIA';
      logoCell.font = { name: 'Arial Black', size: 12, bold: true, color: { argb: 'FF375623' } };
      logoCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // Title rows with DEPARTAMENTO INMOBILIARIO branding
    const companyTitle = 'ASSETFLOW • DEPARTAMENTO INMOBILIARIO';
    const reportTitle = 'REPORTE MENSUAL DE CARTERA MOROSA';
    const issueDate = `Fecha de Emisión: ${new Date().toLocaleDateString('es-CL')} (Inmutable)`;
    const instructions = 'INSTRUCTIVO: El ejecutivo debe registrar en esta planilla todos los arrendatarios que presenten saldos y rentas devengadas vencidas. Asegúrese de ingresar días de mora e importes con precisión para las auditorías de control.';

    worksheet.mergeCells('C1:J1');
    const titleCell = worksheet.getCell('C1');
    titleCell.value = companyTitle;
    titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF375623' } }; // Deep Green
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

    worksheet.mergeCells('C2:J2');
    const subTitleCell = worksheet.getCell('C2');
    subTitleCell.value = reportTitle;
    subTitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1F385C' } }; // Deep Blue
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

    worksheet.mergeCells('C3:J3');
    const dateCell = worksheet.getCell('C3');
    dateCell.value = issueDate;
    dateCell.font = { name: 'Arial', size: 9, italic: true, bold: true, color: { argb: 'FF595959' } };
    dateCell.alignment = { vertical: 'middle', horizontal: 'left' };

    worksheet.mergeCells('A4:J4');
    const instCell = worksheet.getCell('A4');
    instCell.value = instructions;
    instCell.font = { name: 'Arial', size: 8.5, italic: true, bold: true, color: { argb: 'FFC00000' } }; // Highlighted instruction text in corporate red
    instCell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };

    worksheet.getRow(1).height = 20;
    worksheet.getRow(2).height = 18;
    worksheet.getRow(3).height = 16;
    worksheet.getRow(4).height = 24;

    worksheet.addRow([]); // Blank Row 5

    // Header Row (Row 6)
    const headers = [
      'RUT Arrendatario',
      'Nombre del Arrendatario',
      'Número de Vivienda',
      'Conjunto y Dirección Completa',
      'Comuna',
      'Periodo Corresponde Mora',
      'Monto en Mora ($)',
      'Días de Mora',
      'Estado Cobranza',
      'Observaciones y Compromisos de Pago'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF375623' } // Dark Green matching the company logo theme
      };
      cell.font = {
        name: 'Arial',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 9.5
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1F385C' } },
        left: { style: 'thin', color: { argb: 'FF1F385C' } },
        bottom: { style: 'medium', color: { argb: 'FF1F385C' } },
        right: { style: 'thin', color: { argb: 'FF1F385C' } }
      };
    });

    // Pre-populate with realistic samples to avoid any confusion or mistake by executives
    const sampleRows = [
      [
        '76.123.456-7',
        'MUNICIPALIDAD DE SANTIAGO (DEPT. SOCIALES)',
        'Oficina 302',
        'Edificio Centenario, Av. Libertador Bernardo O\'Higgins 815',
        'Santiago',
        'Mayo 2026',
        1850000,
        38,
        'COBRO ADMINISTRATIVO',
        'Se envió la segunda notificación formal por correo institucional.'
      ],
      [
        '77.922.340-K',
        'SOCIEDAD MAESTRA GASTRONÓMICA CHILE LTDA',
        'Local 1',
        'Edificio Centenario, Av. Libertador Bernardo O\'Higgins 815',
        'Santiago',
        'Abril 2026',
        3200000,
        68,
        'COBRO ADMINISTRATIVO',
        'Se coordinó reunión con encargado de finanzas para definir calendario de abonos.'
      ],
      [
        '14.331.425-2',
        'CARLA SOFÍA VALENZUELA ROJAS',
        'Depto 1204',
        'Condominio Las Camelias, Av. El Prado 1500',
        'Maipú',
        'Junio 2026',
        450000,
        8,
        'COBRO ADMINISTRATIVO',
        'Notificación amistosa enviada vía mail. Indica retraso por desajuste transitorio de su flujo de caja.'
      ]
    ];

    sampleRows.forEach((rowValues) => {
      const row = worksheet.addRow(rowValues);
      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9, bold: false, color: { argb: 'FF334155' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Alignments & Formats
        if (colNumber === 6 || colNumber === 9) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 7) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '$#,##0';
        } else if (colNumber === 8) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        // Add validation to the Estado Cobranza column (Column 9)
        if (colNumber === 9) {
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"COBRO ADMINISTRATIVO"']
          };
        }

        // Light background fill for demonstration samples
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' } // Soft slate-100 to show these are demo rows
        };
      });
    });

    // Add 15 blank structured rows with borders so executive can input data with formulas if needed
    for (let i = 0; i < 15; i++) {
      const blankRowValues = ['', '', '', '', '', '', '', '', '', ''];
      const row = worksheet.addRow(blankRowValues);
      row.height = 22;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
          left: { style: 'thin', color: { argb: 'FF94A3B8' } },
          right: { style: 'thin', color: { argb: 'FF94A3B8' } }
        };

        // Custom formulations of numbers in input cells
        if (colNumber === 7) {
          cell.numFmt = '$#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (colNumber === 8) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 6 || colNumber === 9) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        // Data validation for column 9
        if (colNumber === 9) {
          cell.value = 'COBRO ADMINISTRATIVO';
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"COBRO ADMINISTRATIVO"']
          };
        }
      });
    }

    // Auto calculate columns width nicely
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 4, 14), 48);
    });

    // Freeze headers on row 6
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 6, activeCell: 'A7' }
    ];

    // Auto filter across header columns from row 6
    worksheet.autoFilter = {
      from: { row: 6, column: 1 },
      to: { row: 6, column: headers.length }
    };

    // ============== BUILD SECOND WORKSHEET (PASO A PASO) ==============
    const instSheet = workbook.addWorksheet('Paso a Paso de Uso');
    
    // Title row styling
    for (let r = 1; r <= 3; r++) {
      const row = instSheet.getRow(r);
      for (let c = 1; c <= 4; c++) {
        const cell = row.getCell(c);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9E1F2' } // Corporate Soft Steel Blue
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FF8EA9DB' } },
          right: { style: 'thin', color: { argb: 'FF8EA9DB' } }
        };
      }
    }
    
    instSheet.mergeCells('A1:D1');
    const stepTitle = instSheet.getCell('A1');
    stepTitle.value = 'MANUAL INTEGRAL DE LLENADO DE PLANTILLA DE MOROSIDAD';
    stepTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1F4E79' } };
    stepTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    
    instSheet.mergeCells('A2:D2');
    const stepSubTitle = instSheet.getCell('A2');
    stepSubTitle.value = 'MÉTODO DE INGRESO PASO A PASO EXTREMADAMENTE DIRECTO Y SIMPLIFICADO';
    stepSubTitle.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF2F5597' } };
    stepSubTitle.alignment = { vertical: 'middle', horizontal: 'center' };

    instSheet.mergeCells('A3:D3');
    const stepHintTitle = instSheet.getCell('A3');
    stepHintTitle.value = 'Siga estas instrucciones al pie de la letra. Cada fila debe completarse con precisión absoluta para evitar reproches en la auditoría.';
    stepHintTitle.font = { name: 'Arial', size: 8.5, italic: true, bold: true, color: { argb: 'FFC00000' } };
    stepHintTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    
    instSheet.getRow(1).height = 24;
    instSheet.getRow(2).height = 18;
    instSheet.getRow(3).height = 18;
    
    instSheet.addRow([]); // Blank Row 4
    
    const instHeaders = [
      'Paso',
      'Acción Requerida',
      'Cómo se Hace (Instrucción Sencilla)',
      'Ejemplo / Evidencia Visual Requerida'
    ];
    
    const instHeaderRow = instSheet.addRow(instHeaders);
    instHeaderRow.height = 26;
    instHeaderRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F5597' } // Darker Steel Blue for table headers
      };
      cell.font = {
        name: 'Arial',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 9.5
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1F4E79' } },
        left: { style: 'thin', color: { argb: 'FF1F4E79' } },
        bottom: { style: 'medium', color: { argb: 'FF1F4E79' } },
        right: { style: 'thin', color: { argb: 'FF1F4E79' } }
      };
    });
    
    const stepsData = [
      [
        'Paso 1',
        'Ingresar a la hoja principal',
        'Haga clic en la pestaña inferior izquierda que dice "Control de Morosidad".',
        'Usted verá una tabla configurada en color verde oliva listo con columnas.'
      ],
      [
        'Paso 2',
        'Escribir el RUT del arrendatario',
        'Escriba el RUT sin omitir puntos ni guiones.',
        'Ejemplo exacto: 76.123.456-7'
      ],
      [
        'Paso 3',
        'Digitar el Nombre del deudor',
        'Registre el nombre o razón social completa. Es vital escribirlo en mayúsculas.',
        'Ejemplo: SOCIEDAD MAESTRA GASTRONÓMICA CHILE LTDA'
      ],
      [
        'Paso 4',
        'Escribir el Número de Vivienda',
        'Coloque el número identificador de la casa, departamento, oficina o local.',
        'Ejemplo: Depto 1204 / local 1'
      ],
      [
        'Paso 5',
        'Registrar Conjunto y Dirección',
        'Indique el nombre del edificio o condominio seguido de la dirección completa.',
        'Ejemplo: Edificio Centenario, Av. Libertador Bernardo O\'Higgins 815'
      ],
      [
        'Paso 6',
        'Ingresar Comuna',
        'Coloque la comuna correspondiente de ubicación geográfica del activo.',
        'Ejemplo: Santiago / Maipú / Providencia'
      ],
      [
        'Paso 7',
        'Escribir el Periodo del retraso',
        'Escriba el mes y el año correspondientes de la cuota impaga.',
        'Ejemplo: Mayo 2026'
      ],
      [
        'Paso 8',
        'Indicar el Monto en Mora',
        'Escriba solo los deudores sin signos de pesos ni puntos.',
        'Digite "1850000" y el sistema le pondrá automáticamente "$ 1.850.000"'
      ],
      [
        'Paso 9',
        'Escribir los Días de Mora vencidos',
        'Calcule el número total de días transcurridos desde que venció la obligación y digítelos.',
        'Digite "38" (el Excel aplicará formato numérico para deudores)'
      ],
      [
        'Paso 10',
        'Estado de Cobranza',
        'Esta columna viene con lista desplegable pre-validada para admitir únicamente "COBRO ADMINISTRATIVO". Cualquier otro valor generará error.',
        'Selección con validación de datos: COBRO ADMINISTRATIVO'
      ],
      [
        'Paso 11',
        'Comentarios y Compromisos de Pago',
        'Anote un breve resumen de lo que el deudor indicó o el estado de la gestión de cobro.',
        'Ejemplo: "Indica retraso transitorio de caja; compromete abono para el 15."'
      ],
      [
        'Guía Extra',
        'Requisitos de Seguridad de Datos',
        'No borre filas de encabezado ni modifique los anchos ni colores, ya que el importador automático requiere esta estructura exacta.',
        'Cualquier error de digitación será reportado inmediatamente por la validación del panel de control de ASSETFLOW.'
      ]
    ];
    
    stepsData.forEach((rowVal) => {
      const row = instSheet.addRow(rowVal);
      row.height = 28;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
        };
        
        if (colNumber === 1) {
          cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1F4E79' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };
        } else if (colNumber === 4) {
          cell.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF595959' } };
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }
      });
    });
    
    // Auto calculate columns width for instructions
    instSheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 4, 15), 55);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${fileName}.xlsx`);

  } catch (error) {
    console.error('Error exporting Delinquency Template to Excel:', error);
    alert('Ocurrió un error al intentar exportar la plantilla de morosos.');
  }
};

export interface TenantReportMetadata {
  tenantName?: string;
  tenantTaxId?: string; // RUT
  propertyLabel?: string;
  contractStartDate?: string; // Fecha Inicio Contrato
  nextRenewalDate?: string;   // Próxima Renovación
  complianceStatus?: string;  // Estado de Cumplimiento
  emissionDate?: string;      // Fecha y hora de emisión
  contractId?: string;
}

export const exportPaymentsToExcel = async (
  payments: any[],
  fileName: string,
  isTenantPortal: boolean = false,
  metadata?: TenantReportMetadata
) => {
  try {
    if (!payments || payments.length === 0) {
      alert('No hay información de pagos para exportar.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheetName = isTenantPortal ? 'Cartola Arrendatario' : 'Reporte Pagos Empresa';
    const worksheet = workbook.addWorksheet(sheetName);

    const now = new Date();
    const formattedNow = metadata?.emissionDate || `${now.toLocaleDateString('es-CL')} ${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs`;

    if (isTenantPortal) {
      // -------------------------------------------------------------
      // TENANT PORTAL EXCEL WITH OFFICIAL ENCABEZADO
      // -------------------------------------------------------------
      const tName = (metadata?.tenantName || 'ARRENDATARIO REGISTRADO').toUpperCase();
      const tRut = metadata?.tenantTaxId || 'RUT NO REGISTRADO';
      const propLabel = (metadata?.propertyLabel || 'PROPIEDAD 1822').toUpperCase();
      const startDate = metadata?.contractStartDate || '01 de Mayo de 2024';
      const renewalDate = metadata?.nextRenewalDate || '01 de Mayo de 2027';
      const contractId = metadata?.contractId || 'CTR-2024-1822';

      // Calculate total pending to infer compliance if not provided
      let totalCharged = 0;
      let totalPaid = 0;
      payments.forEach(p => {
        totalCharged += (p.chargedAmount ?? p.amount ?? 0);
        totalPaid += (p.amount ?? 0);
      });
      const totalPending = Math.max(0, totalCharged - totalPaid);
      const defaultCompliance = totalPending === 0 
        ? 'AL DÍA CON SUS OBLIGACIONES CONTRACTUALES' 
        : `CON SALDO PENDIENTE ($${totalPending.toLocaleString('es-CL')})`;
      const compliance = metadata?.complianceStatus || defaultCompliance;

      // Title Banner
      worksheet.mergeCells('A1:J1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'ASSETFLOW S.A. - CORPORACIÓN DE SEGUROS | PORTAL ARRENDATARIO';
      titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002D62' } }; // Navy ERP
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 28;

      worksheet.mergeCells('A2:J2');
      const subTitleCell = worksheet.getCell('A2');
      subTitleCell.value = 'CARTOLA HISTÓRICA DE PAGOS Y FICHA DE CUMPLIMIENTO CONTRACTUAL';
      subTitleCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF002D62' } };
      subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECEFF1' } };
      worksheet.getRow(2).height = 20;

      // Header Rows metadata
      const metaDataRows = [
        ['ARRENDATARIO:', tName, '', 'RUT:', tRut, '', 'CONTRATO:', contractId, '', ''],
        ['PROPIEDAD:', propLabel, '', 'INICIO CONTRATO:', startDate, '', 'PRÓX. RENOVACIÓN:', renewalDate, '', ''],
        ['CUMPLIMIENTO:', compliance, '', '', '', 'FECHA EMISIÓN:', formattedNow, '', '', '']
      ];

      metaDataRows.forEach((rowVals, idx) => {
        const rowNum = 3 + idx;
        const row = worksheet.getRow(rowNum);
        row.height = 19;

        if (rowNum === 3) {
          worksheet.mergeCells('B3:C3');
          worksheet.mergeCells('E3:F3');
          worksheet.mergeCells('H3:J3');
        } else if (rowNum === 4) {
          worksheet.mergeCells('B4:C4');
          worksheet.mergeCells('E4:F4');
          worksheet.mergeCells('H4:J4');
        } else if (rowNum === 5) {
          worksheet.mergeCells('B5:E5');
          worksheet.mergeCells('G5:J5');
        }

        rowVals.forEach((val, colIdx) => {
          if (val) {
            const cell = row.getCell(colIdx + 1);
            cell.value = val;
            if (val.endsWith(':')) {
              cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF334155' } };
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
            } else {
              cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF0F172A' } };
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }
          }
        });
      });

      worksheet.addRow([]); // Blank row
    } else {
      // -------------------------------------------------------------
      // COMPANY USERS EXCEL
      // -------------------------------------------------------------
      worksheet.mergeCells('A1:J1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'ASSETFLOW S.A. - CONTROL FINANCIERO Y GESTIÓN DE COBROS (USO EMPRESA)';
      titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 28;

      worksheet.mergeCells('A2:J2');
      const subTitleCell = worksheet.getCell('A2');
      subTitleCell.value = `REPORTE CONSOLIDADO TABULADO DE PAGOS | EMISIÓN: ${formattedNow}`;
      subTitleCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF334155' } };
      subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      worksheet.getRow(2).height = 20;

      worksheet.addRow([]);
    }

    // -------------------------------------------------------------
    // TABULATED PAYMENTS TABLE HEADERS
    // -------------------------------------------------------------
    const headers = [
      'PROPIEDAD',
      'TIPO / CONCEPTO',
      'MONTO COBRADO ($)',
      'MONTO PAGADO ($)',
      'POR PAGAR ($)',
      'ESTADO',
      'FECHA PAGO / REGISTRO',
      'CANAL DE RECAUDACIÓN',
      'N° COMPROBANTE / ERP',
      'PERIODO IMPUTABLE'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isTenantPortal ? 'FF002D62' : 'FF1E293B' }
      };
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 8.5 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    let totalChargedSum = 0;
    let totalPaidSum = 0;
    let totalPendingSum = 0;

    payments.forEach((item) => {
      const charged = item.chargedAmount ?? item.amount ?? 0;
      const paid = item.amount ?? 0;
      const pending = charged - paid;

      totalChargedSum += charged;
      totalPaidSum += paid;
      totalPendingSum += pending;

      let statusText = item.status || 'Pagado';
      if (pending > 0 && paid > 0) statusText = 'Pago Parcial';
      else if (pending > 0 && paid === 0) statusText = 'Pendiente de pago';
      else if (pending === 0) statusText = 'Pagado';
      else if (pending < 0) statusText = 'Abono a Favor';

      const dataRowVals = [
        item.property,
        item.type,
        charged,
        paid,
        pending,
        statusText,
        item.date,
        item.channel,
        item.referenceNumber || item.id,
        item.period || 'GENERAL'
      ];

      const row = worksheet.addRow(dataRowVals);
      row.height = 19;

      row.eachCell((cell, colIdx) => {
        cell.font = { name: 'Arial', size: 8.5 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        if (colIdx === 3 || colIdx === 4 || colIdx === 5) {
          cell.numFmt = '$#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (colIdx === 5) {
            if (pending > 0) {
              cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FFBE123C' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
            } else {
              cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF15803D' } };
            }
          }
        } else if (colIdx === 6) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { name: 'Arial', size: 8.5, bold: true };
        } else if (colIdx === 1 || colIdx === 7 || colIdx === 8 || colIdx === 9 || colIdx === 10) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // Totals Row
    const totalsRowVals = [
      'TOTALES',
      '',
      totalChargedSum,
      totalPaidSum,
      totalPendingSum,
      '',
      '',
      '',
      '',
      ''
    ];

    const totalsRow = worksheet.addRow(totalsRowVals);
    totalsRow.height = 22;
    totalsRow.eachCell((cell, colIdx) => {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = {
        top: { style: 'double', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      if (colIdx === 3 || colIdx === 4 || colIdx === 5) {
        cell.numFmt = '$#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (colIdx === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    // Calculate column widths
    worksheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(Math.max(maxLen + 3, 14), 45);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileName}.xlsx`);

  } catch (error) {
    console.error('Error exporting payments to Excel:', error);
    alert('Ocurrió un error al intentar generar la planilla Excel.');
  }
};

/**
 * Exportador de Libro Diario / Diario General (ERP P0911 / F0911 y P0411 / F0411)
 * Genera una planilla Excel (.xlsx) tabulada profesionalmente con formato contable, sumatorias y auto-filtros.
 */
export const exportJDELedgerToExcel = async (
  transactions: any[],
  activeProgram: 'P0911' | 'P0411' = 'P0911',
  customFileName?: string
) => {
  try {
    if (!transactions || transactions.length === 0) {
      alert('No hay registros en la grilla del Libro Diario para exportar.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheetTitle = activeProgram === 'P0911' ? 'Diario General F0911' : 'Ledger Proveedores F0411';
    const worksheet = workbook.addWorksheet(sheetTitle);

    const nowStr = new Date().toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const isP0911 = activeProgram === 'P0911';

    // Headers & Title Setup
    const companyTitle = 'ASSETFLOW - GESTIÓN INTEGRADA CORPORATIVA DE FINANZAS';
    const reportTitle = isP0911
      ? 'F0911_REVISIÓN_DIARIO_GENERAL • TABLA TABULADA DE LIBRO MAYOR'
      : 'F0411_CONSULTA_LEDGER_PROVEEDORES • TABLA TABULADA DE CUENTAS POR PAGAR';
    const subTitle = `FECHA DE EXPORTACIÓN: ${nowStr} | TOTAL REGISTROS: ${transactions.length}`;

    const maxCols = isP0911 ? 21 : 14;
    const colLetterEnd = isP0911 ? 'U' : 'N';

    // Title Block Rows
    worksheet.mergeCells(`A1:${colLetterEnd}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = companyTitle;
    titleCell.font = { name: 'Arial Black', size: 13, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2027' } }; // Dark Corporate Cyan/Blue
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(1).height = 28;

    worksheet.mergeCells(`A2:${colLetterEnd}2`);
    const subTitleCell = worksheet.getCell('A2');
    subTitleCell.value = reportTitle;
    subTitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0B3C5D' } };
    subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF2F7' } };
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(2).height = 22;

    worksheet.mergeCells(`A3:${colLetterEnd}3`);
    const dateCell = worksheet.getCell('A3');
    dateCell.value = subTitle;
    dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } };
    dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF2F7' } };
    dateCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(3).height = 18;

    worksheet.addRow([]); // Blank row 4

    // Header Row Definition
    const headersP0911 = [
      'Nº',
      'Tipo Doc',
      'Nº Documento',
      'Cía Doc',
      'Fecha LM',
      'Fecha Factura',
      'Explicación Concepto / Glosa',
      'Monto Mon Nac (CLP)',
      'Débito / Gasto (CLP)',
      'Crédito / Ingreso (CLP)',
      'Moneda',
      'Nº Lote Batch',
      'Cuenta Contable',
      'Cuenta Contrapartida',
      'Categoría',
      'Cía Seguro',
      'Propiedad / UN',
      'Proveedor',
      'OT Asociada',
      'Programa',
      'Usuario Registro'
    ];

    const headersP0411 = [
      'Nº',
      'Cía',
      'Nombre Compañía',
      'ID / Nombre Proveedor',
      'Tipo Doc',
      'Nº Documento',
      'Detalle / Glosa Concepto',
      'Importe Bruto (CLP)',
      'Importe Pendiente (CLP)',
      'Estado Pago',
      'Fecha Factura',
      'Fecha Vencimiento',
      'Unidad Negocio',
      'Nº Lote Batch'
    ];

    const headers = isP0911 ? headersP0911 : headersP0411;
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0B3C5D' } // Deep ERP Blue
      };
      cell.font = {
        name: 'Arial',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 9.5
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0284C7' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'medium', color: { argb: 'FF0284C7' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      };
    });

    // Populate Data Rows
    const dataStartRow = 6;

    transactions.forEach((t, idx) => {
      const rowIdx = idx + 1;
      let rowVals: any[] = [];

      if (isP0911) {
        const isExpense = t.type === 'EXPENSE';
        const amt = Number(t.amount) || 0;
        const debitAmt = isExpense ? amt : 0;
        const creditAmt = !isExpense ? amt : 0;

        const docTypeStr = t.documentType === 'FACTURA' ? 'PV' : (t.documentType === 'DEPÓSITO' ? 'DP' : (t.documentType || 'JE'));
        const docNumStr = t.documentNumber || `191024${idx}`;
        const formattedDate = t.date ? (t.date.includes('T') ? t.date.split('T')[0] : t.date) : '';
        const formattedInvoiceDate = t.invoiceDate ? (t.invoiceDate.includes('T') ? t.invoiceDate.split('T')[0] : t.invoiceDate) : formattedDate;

        let mainAcc = t.accountCode || (isExpense ? '5110.02.001 (Gastos Operacionales)' : '4110.01.002 (Ingresos Rentas)');
        let offsetAcc = isExpense ? '2110.05.001 (CxP Proveedores)' : '1120.04.015 (CxC Arriendos)';
        const matchManual = (t.description || '').match(/\((.*?)\s*<->\s*(.*?)\)/);
        if (matchManual && matchManual[1] && matchManual[2]) {
          mainAcc = matchManual[1].trim();
          offsetAcc = matchManual[2].trim();
        } else if (isExpense) {
          if (t.category === 'CAJA CHICA' || (t.description || '').toLowerCase().includes('caja')) {
            offsetAcc = '1110.01.003 (Caja Chica)';
          } else if (t.category === 'HONORARIOS' || (t.description || '').toLowerCase().includes('honorario')) {
            offsetAcc = '2110.08.002 (Retenciones CxP)';
          } else if (!t.supplierName) {
            offsetAcc = '1110.01.002 (Caja/Banco General)';
          }
        }

        rowVals = [
          rowIdx,
          docTypeStr,
          docNumStr,
          '00001',
          formattedDate,
          formattedInvoiceDate,
          t.description || 'ASIENTO LIBRO MAYOR',
          amt,
          debitAmt,
          creditAmt,
          'CLP',
          t.batchNumber || '12845669',
          mainAcc,
          offsetAcc,
          t.category || 'CONTABILIDAD',
          t.insuranceCompany || 'GENERALES',
          t.propertyId || 'GLOBAL',
          t.supplierName || t.supplierTaxId || '',
          t.workOrderId || '',
          t.programId || 'P0911',
          t.user || 'SISTEMA'
        ];
      } else {
        const grossAmt = Number(t.amount) || 0;
        const pendingAmt = t.status === 'PENDIENTE' ? grossAmt : 0;
        const formattedInvoiceDate = t.invoiceDate ? (t.invoiceDate.includes('T') ? t.invoiceDate.split('T')[0] : t.invoiceDate) : (t.date || '');
        const formattedDueDate = t.date ? (t.date.includes('T') ? t.date.split('T')[0] : t.date) : '';

        rowVals = [
          rowIdx,
          '00045',
          'Financial Solutions',
          t.supplierName || t.supplierTaxId || t.supplierId || 'Proveedor General',
          t.documentType === 'FACTURA' ? 'PV' : (t.documentType || 'PV'),
          t.documentNumber || `FAC-${rowIdx + 100}`,
          t.description || 'CUENTA POR PAGAR PROVEEDOR',
          grossAmt,
          pendingAmt,
          t.status || 'COMPLETADA',
          formattedInvoiceDate,
          formattedDueDate,
          t.propertyId || 'GLOBAL',
          t.batchNumber || '12845669'
        ];
      }

      const row = worksheet.addRow(rowVals);
      row.height = 20;

      const isEven = idx % 2 === 0;
      const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // White vs Slate-50

      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Arial', size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Alignments & Number formatting
        if (isP0911) {
          if (colNum === 8 || colNum === 9 || colNum === 10) {
            cell.numFmt = '$#,##0';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            if (colNum === 9 && Number(cell.value) > 0) {
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E293B' } };
            } else if (colNum === 10 && Number(cell.value) > 0) {
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF047857' } }; // Emerald-700
            }
          } else if ([1, 2, 3, 4, 5, 6, 11, 12, 13, 15, 18, 19].includes(colNum)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        } else {
          if (colNum === 8 || colNum === 9) {
            cell.numFmt = '$#,##0';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.font = { name: 'Arial', size: 9, bold: true };
          } else if ([1, 2, 5, 6, 10, 11, 12, 13, 14].includes(colNum)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        }
      });
    });

    const lastDataRow = dataStartRow + transactions.length - 1;

    // Totals / Summary Row
    const totalsRowVals = new Array(maxCols).fill('');
    totalsRowVals[0] = 'TOTALES:';

    if (isP0911) {
      totalsRowVals[6] = 'RESUMEN BALANCE GENERAL:';
      totalsRowVals[7] = { formula: `SUM(H${dataStartRow}:H${lastDataRow})` };
      totalsRowVals[8] = { formula: `SUM(I${dataStartRow}:I${lastDataRow})` };
      totalsRowVals[9] = { formula: `SUM(J${dataStartRow}:J${lastDataRow})` };
    } else {
      totalsRowVals[6] = 'TOTAL CUENTAS POR PAGAR:';
      totalsRowVals[7] = { formula: `SUM(H${dataStartRow}:H${lastDataRow})` };
      totalsRowVals[8] = { formula: `SUM(I${dataStartRow}:I${lastDataRow})` };
    }

    const totalsRow = worksheet.addRow(totalsRowVals);
    totalsRow.height = 24;

    totalsRow.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate-900
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'double', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      };

      if ((isP0911 && [8, 9, 10].includes(colNum)) || (!isP0911 && [8, 9].includes(colNum))) {
        cell.numFmt = '$#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    // Auto Column Widths
    worksheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const valStr = cell.value ? (typeof cell.value === 'object' && 'formula' in cell.value ? '12345678' : String(cell.value)) : '';
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      });
      col.width = Math.min(Math.max(maxLen + 3, 12), 48);
    });

    // Freeze top header rows
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 5, activeCell: 'A6' }
    ];

    // Auto Filter on Table Headers
    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: maxCols }
    };

    // Write File Buffer
    const defaultFileName = customFileName || (isP0911
      ? `ERP_P0911_Libro_Diario_General_${new Date().toISOString().split('T')[0]}`
      : `JDE_P0411_Ledger_Proveedores_${new Date().toISOString().split('T')[0]}`);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${defaultFileName}.xlsx`);

  } catch (error) {
    console.error('Error al exportar el Libro Diario a Excel:', error);
    alert('Ocurrió un error al intentar generar el archivo Excel del Libro Diario.');
  }
};

/**
 * Exportador de Flujo de Caja Proyectado a 10 Períodos
 * para Empresa de Soluciones Tecnológicas (Protocolizada / SaaS B2B)
 */
export const exportTech10PeriodCashFlowToExcel = async (customFileName?: string) => {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // =========================================================================
    // HOJA 1: FLUJO DE CAJA PROYECTADO 10 PERÍODOS
    // =========================================================================
    const sheet = workbook.addWorksheet('Flujo Caja 10 Periodos');

    // Title Banner
    sheet.mergeCells('A1:L1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'ASSETFLOW TECH SOLUTIONS S.A. • EMPRESA DE SOLUCIONES TECNOLÓGICAS PROTOCOLIZADA';
    titleCell.font = { name: 'Arial Black', size: 13, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } }; // Indigo-950
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    sheet.getRow(1).height = 30;

    sheet.mergeCells('A2:L2');
    const subTitleCell = sheet.getCell('A2');
    subTitleCell.value = 'MODELO DE FLUJO DE CAJA PROYECTADO A 10 PERÍODOS (PROYECCIÓN TÉCNICA Y OPERATIVA CON PROTOCOLIZACIÓN)';
    subTitleCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF312E81' } };
    subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }; // Indigo-100
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    sheet.getRow(2).height = 22;

    sheet.mergeCells('A3:L3');
    const dateCell = sheet.getCell('A3');
    dateCell.value = `FECHA DE PROTOCOLIZACIÓN Y EMISIÓN: ${new Date().toLocaleDateString('es-CL')} | ESTADO: PROTOCOLIZADO VIGENTE | MONEDA: CLP ($)`;
    dateCell.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF4338CA' } };
    dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
    dateCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    sheet.getRow(3).height = 18;

    sheet.addRow([]); // Blank Row 4

    // Table Headers
    const headers = [
      'CONCEPTO / ESTRUCTURA FINANCIERA',
      'Periodo 1',
      'Periodo 2',
      'Periodo 3',
      'Periodo 4',
      'Periodo 5',
      'Periodo 6',
      'Periodo 7',
      'Periodo 8',
      'Periodo 9',
      'Periodo 10',
      'TOTAL ACUMULADO'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3730A3' } // Indigo-800
      };
      cell.font = {
        name: 'Arial',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 9.5
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1E1B4B' } },
        left: { style: 'thin', color: { argb: 'FF312E81' } },
        bottom: { style: 'medium', color: { argb: 'FF1E1B4B' } },
        right: { style: 'thin', color: { argb: 'FF312E81' } }
      };
    });

    // Helper row builders
    const formatCategoryRow = (title: string) => {
      const r = sheet.addRow([title, '', '', '', '', '', '', '', '', '', '', '']);
      r.height = 20;
      r.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF312E81' } };
      });
    };

    const addDataRow = (
      concept: string, 
      vals: number[], 
      isFormula: boolean = false,
      formulaGen?: (rowNum: number) => any
    ) => {
      const rowNum = sheet.rowCount + 1;
      const rowValues: any[] = [concept];

      if (isFormula && formulaGen) {
        for (let col = 1; col <= 10; col++) {
          const colLetter = String.fromCharCode(65 + col); // B to K
          rowValues.push({ formula: formulaGen(rowNum).replace(/COL/g, colLetter) });
        }
        rowValues.push({ formula: `SUM(B${rowNum}:K${rowNum})` });
      } else {
        rowValues.push(...vals);
        rowValues.push({ formula: `SUM(B${rowNum}:K${rowNum})` });
      }

      const row = sheet.addRow(rowValues);
      row.height = 19;
      
      row.eachCell((cell, colIdx) => {
        cell.font = { name: 'Arial', size: 9 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        if (colIdx === 1) {
          cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        } else {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '$#,##0';
        }
      });
      return row;
    };

    const addTotalRow = (
      concept: string, 
      startRow: number, 
      endRow: number, 
      bgColor: string = 'FFEEF2FF',
      textColor: string = 'FF1E1B4B'
    ) => {
      const rowNum = sheet.rowCount + 1;
      const rowValues: any[] = [concept];

      for (let col = 1; col <= 10; col++) {
        const colLetter = String.fromCharCode(65 + col);
        rowValues.push({ formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})` });
      }
      rowValues.push({ formula: `SUM(B${rowNum}:K${rowNum})` });

      const row = sheet.addRow(rowValues);
      row.height = 22;

      row.eachCell((cell, colIdx) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: textColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF6366F1' } },
          bottom: { style: 'double', color: { argb: 'FF312E81' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        if (colIdx === 1) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '$#,##0';
        }
      });
      return rowNum;
    };

    // -------------------------------------------------------------------------
    // 1. INGRESOS OPERACIONALES (FLUJOS DE ENTRADA)
    // -------------------------------------------------------------------------
    formatCategoryRow('1. INGRESOS OPERACIONALES (TECNOLÓGICOS & SAAS B2B)');
    const incStartRow = sheet.rowCount + 1;

    addDataRow('Suscripciones SaaS Recurrentes (MRR)', [8500000, 9800000, 11500000, 13200000, 15500000, 18000000, 21000000, 24500000, 28000000, 32500000]);
    addDataRow('Servicios de Implementación & Onboarding', [6000000, 7500000, 6000000, 9000000, 8000000, 10500000, 12000000, 11000000, 14000000, 15000000]);
    addDataRow('Soporte Técnico Especializado & SLA', [2200000, 2500000, 2900000, 3400000, 4000000, 4600000, 5300000, 6100000, 7000000, 8000000]);
    addDataRow('Consultoría de Integración ERP / API ERP', [3500000, 4000000, 4500000, 5000000, 5500000, 6000000, 6500000, 7000000, 7500000, 8500000]);

    const incEndRow = sheet.rowCount;
    const totalIncRow = addTotalRow('TOTAL INGRESOS OPERACIONALES (A)', incStartRow, incEndRow, 'FFECFDF5', 'FF065F46');

    sheet.addRow([]); // Blank row

    // -------------------------------------------------------------------------
    // 2. EGRESOS OPERACIONALES (COSTOS Y GASTOS DE ESTRUCTURA)
    // -------------------------------------------------------------------------
    formatCategoryRow('2. EGRESOS OPERACIONALES (COSTOS DIRECTOS & GASTOS)');
    const expStartRow = sheet.rowCount + 1;

    addDataRow('Infraestructura Cloud (Google Cloud / AWS / DB)', [1200000, 1350000, 1550000, 1800000, 2100000, 2450000, 2800000, 3100000, 3500000, 3800000]);
    addDataRow('Remuneraciones Equipo Desarrolladores & Tech', [9500000, 10500000, 11800000, 13000000, 14500000, 16000000, 17500000, 19000000, 20500000, 22000000]);
    addDataRow('Licencias de Software Dev & Herramientas Ops', [800000, 900000, 1050000, 1200000, 1350000, 1500000, 1650000, 1800000, 1950000, 2100000]);
    addDataRow('Adquisición de Clientes (CAC, Marketing & B2B Sales)', [2500000, 2800000, 3200000, 3600000, 4000000, 4500000, 5000000, 5500000, 6000000, 6500000]);
    addDataRow('Gastos Administrativos & Arriendo Oficinas', [1800000, 1900000, 2000000, 2100000, 2200000, 2400000, 2600000, 2800000, 3000000, 3200000]);
    addDataRow('Protocolización Legal, Contabilidad & Cumplimiento UAF', [1500000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000]);

    const expEndRow = sheet.rowCount;
    const totalExpRow = addTotalRow('TOTAL EGRESOS OPERACIONALES (B)', expStartRow, expEndRow, 'FFFEF2F2', 'FF991B1B');

    sheet.addRow([]); // Blank row

    // -------------------------------------------------------------------------
    // 3. FLUJO NETO OPERACIONAL (EBITDA EN EFECTIVO)
    // -------------------------------------------------------------------------
    formatCategoryRow('3. FLUJO NETO OPERACIONAL (A - B)');
    const netOpRow = sheet.rowCount + 1;
    const netOpValues: any[] = ['Flujo Neto Operacional (EBITDA Caja)'];

    for (let col = 1; col <= 10; col++) {
      const colLetter = String.fromCharCode(65 + col);
      netOpValues.push({ formula: `${colLetter}${totalIncRow}-${colLetter}${totalExpRow}` });
    }
    netOpValues.push({ formula: `SUM(B${netOpRow}:K${netOpRow})` });

    const netOpRowAdded = sheet.addRow(netOpValues);
    netOpRowAdded.height = 22;
    netOpRowAdded.eachCell((cell, colIdx) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF3B82F6' } },
        bottom: { style: 'thin', color: { argb: 'FF3B82F6' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (colIdx === 1) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '$#,##0';
      }
    });

    sheet.addRow([]); // Blank row

    // -------------------------------------------------------------------------
    // 4. FLUJO DE INVERSIÓN Y FINANCIAMIENTO (CAPEX & CAPITAL PROTOCOLIZADO)
    // -------------------------------------------------------------------------
    formatCategoryRow('4. INVERSIÓN Y FINANCIAMIENTO (CAPEX / PROTOCOLIZACIÓN)');
    const invStartRow = sheet.rowCount + 1;

    addDataRow('Inversión I+D Nuevos Módulos & Arquitectura AI (CapEx)', [-2500000, -2000000, -3000000, -2000000, -2500000, -3000000, -2000000, -2500000, -3000000, -2000000]);
    addDataRow('Aporte de Capital Social / Inyección Inicial Protocolizada', [25000000, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    const invEndRow = sheet.rowCount;
    const totalInvRow = addTotalRow('TOTAL INVERSIÓN Y FINANCIAMIENTO (C)', invStartRow, invEndRow, 'FFF5F3FF', 'FF5B21B6');

    sheet.addRow([]); // Blank row

    // -------------------------------------------------------------------------
    // 5. RESUMEN DE CAJA Y BALANCE FINAL POR PERÍODO
    // -------------------------------------------------------------------------
    formatCategoryRow('5. CONCILIACIÓN DE CAJA & SALDOS ACUMULADOS');

    // Row: Saldo Inicial
    const initCashRow = sheet.rowCount + 1;
    const initCashVals: any[] = ['Saldo Inicial de Caja'];
    initCashVals.push(0); // P1 starts with 0 (before capital injection)
    for (let col = 2; col <= 10; col++) {
      const prevColLetter = String.fromCharCode(65 + col - 1);
      const endCashRowRef = initCashRow + 2; // Saldo Final Row
      initCashVals.push({ formula: `${prevColLetter}${endCashRowRef}` });
    }
    initCashVals.push(0); // Total

    const rInit = sheet.addRow(initCashVals);
    rInit.height = 20;
    rInit.eachCell((cell, colIdx) => {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      if (colIdx > 1) cell.numFmt = '$#,##0';
    });

    // Row: Flujo Neto Total del Periodo (EBITDA Caja + Inv/Fin)
    const netTotalRow = sheet.rowCount + 1;
    const netTotalVals: any[] = ['Flujo Neto del Período (Operacional + Inv/Fin)'];
    for (let col = 1; col <= 10; col++) {
      const colLetter = String.fromCharCode(65 + col);
      netTotalVals.push({ formula: `${colLetter}${netOpRow}+${colLetter}${totalInvRow}` });
    }
    netTotalVals.push({ formula: `SUM(B${netTotalRow}:K${netTotalRow})` });

    const rNetTot = sheet.addRow(netTotalVals);
    rNetTot.height = 20;
    rNetTot.eachCell((cell, colIdx) => {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
      cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      if (colIdx > 1) cell.numFmt = '$#,##0';
    });

    // Row: Saldo Final de Caja
    const finalCashRow = sheet.rowCount + 1;
    const finalCashVals: any[] = ['SALDO FINAL ACUMULADO DE CAJA'];
    for (let col = 1; col <= 10; col++) {
      const colLetter = String.fromCharCode(65 + col);
      finalCashVals.push({ formula: `${colLetter}${initCashRow}+${colLetter}${netTotalRow}` });
    }
    finalCashVals.push({ formula: `K${finalCashRow}` });

    const rFinal = sheet.addRow(finalCashVals);
    rFinal.height = 24;
    rFinal.eachCell((cell, colIdx) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } }; // Dark Indigo
      cell.font = { name: 'Arial Black', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF4338CA' } },
        bottom: { style: 'double', color: { argb: 'FF4338CA' } }
      };
      if (colIdx === 1) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '$#,##0';
      }
    });

    // Auto Column Widths
    sheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const valStr = cell.value ? (typeof cell.value === 'object' && 'formula' in cell.value ? '123456789' : String(cell.value)) : '';
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      });
      col.width = Math.min(Math.max(maxLen + 3, 14), 50);
    });

    // Freeze panes
    sheet.views = [
      { state: 'frozen', xSplit: 1, ySplit: 4, activeCell: 'B5' }
    ];

    // =========================================================================
    // HOJA 2: MÉTRICAS Y SUPUESTOS DE PROTOCOLIZACIÓN
    // =========================================================================
    const metaSheet = workbook.addWorksheet('Métricas SaaS & Protocolización');

    metaSheet.mergeCells('A1:E1');
    const metaTitle = metaSheet.getCell('A1');
    metaTitle.value = 'MÉTRICAS CLAVE DE NEGOCIO Y DATOS DE PROTOCOLIZACIÓN EMISION';
    metaTitle.font = { name: 'Arial Black', size: 12, color: { argb: 'FFFFFFFF' } };
    metaTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
    metaTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    metaSheet.getRow(1).height = 28;

    metaSheet.addRow([]);

    const metricsData = [
      ['KPI / Parámetro Tecnológico', 'Valor Proyectado', 'Unidad de Medida', 'Descripción y Benchmark'],
      ['MRR Inicial (Monthly Recurring Revenue)', '$ 8.500.000', 'CLP / mes', 'Suscripciones B2B contratadas al inicio de la operación protocolizada'],
      ['MRR Final (Periodo 10)', '$ 32.500.000', 'CLP / mes', 'Suscripciones B2B acumuladas proyectadas al Periodo 10'],
      ['ARR Proyectado (Annualized Revenue)', '$ 390.000.000', 'CLP / año', 'Tasa anualizada de ingresos recurrentes al Periodo 10'],
      ['Margen Bruto Tecnológico', '82.5%', 'Porcentaje (%)', 'Margen directo deduciendo costo de servidores e infraestructura Cloud'],
      ['CAC (Customer Acquisition Cost)', '$ 450.000', 'CLP / cliente', 'Costo promedio de adquisición de clientes enterprise B2B'],
      ['LTV (Lifetime Value Estimado)', '$ 4.800.000', 'CLP / cliente', 'Valor acumulado por contrato promedio a 24 meses'],
      ['Ratio LTV / CAC', '10.67x', 'Múltiplo', 'Métrica de eficiencia de crecimiento (Objetivo SaaS > 3.0x)'],
      ['Churn Rate Mensual Estimado', '1.2%', 'Porcentaje (%)', 'Tasa proyectada de cancelación voluntaria de licencias'],
      ['Runway Financiero Proyectado', '+10 Períodos', 'Supervivencia', 'Caja positiva continua apalancada con inyección inicial y flujo operacional']
    ];

    metricsData.forEach((r, idx) => {
      const row = metaSheet.addRow(r);
      row.height = 22;
      row.eachCell((cell, colIdx) => {
        if (idx === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } };
          cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.font = { name: 'Arial', size: 9 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
          if (colIdx === 1) cell.font = { name: 'Arial', bold: true, color: { argb: 'FF1E1B4B' } };
          if (colIdx === 2) {
            cell.font = { name: 'Arial Black', size: 9, color: { argb: 'FF047857' } };
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          }
        }
      });
    });

    metaSheet.addRow([]);

    // Legal / Protocolization Block
    metaSheet.mergeCells('A14:E14');
    const legalHeader = metaSheet.getCell('A14');
    legalHeader.value = 'ANTECEDENTES LEGALES DE LA PROTOCOLIZACIÓN E INSTITUCIONALIZACIÓN';
    legalHeader.font = { name: 'Arial Black', size: 10, color: { argb: 'FF1E1B4B' } };
    legalHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
    metaSheet.getRow(14).height = 24;

    const legalData = [
      ['Razón Social Protocolizada:', 'AssetFlow Tech Solutions S.A.'],
      ['RUT de la Sociedad:', '77.892.110-K'],
      ['Repertorio Notarial:', 'N° 18.492 / 2026 - Notaría de Santiago'],
      ['Inscripción Registro de Comercio:', 'Foja 14.820 N° 8.912 del CBR de Santiago'],
      ['Giro Comercial DII-SII:', 'Desarrollo de Software, Consultoría de Sistemas ERP / ERP, Soluciones Tecnológicas'],
      ['Representante Legal:', 'Cristián Muñoz / Directiva Propietario'],
      ['Moneda del Modelo:', 'Pesos Chilenos (CLP) - Convertible a USD']
    ];

    legalData.forEach((lr) => {
      const row = metaSheet.addRow([lr[0], lr[1], '', '', '']);
      row.height = 20;
      row.eachCell((cell, colIdx) => {
        cell.font = { name: 'Arial', size: 9 };
        if (colIdx === 1) cell.font = { name: 'Arial', bold: true, color: { argb: 'FF334155' } };
        if (colIdx === 2) cell.font = { name: 'Arial', bold: true, color: { argb: 'FF0F172A' } };
      });
    });

    metaSheet.columns.forEach((col) => {
      let maxLen = 15;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const valStr = cell.value ? String(cell.value) : '';
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      col.width = Math.min(Math.max(maxLen + 3, 16), 65);
    });

    // Write File Buffer
    const fileName = customFileName || `Flujo_de_Caja_Proyectado_10_Periodos_Tech_Solutions_${new Date().toISOString().split('T')[0]}`;
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileName}.xlsx`);

  } catch (error) {
    console.error('Error al exportar el Flujo de Caja a Excel:', error);
    alert('Ocurrió un error al intentar generar el archivo Excel de Flujo de Caja.');
  }
};




