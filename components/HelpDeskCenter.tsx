
import React, { useState, useMemo, useEffect } from 'react';
import { useNotification } from './NotificationProvider';
import { ITTicket, TicketPriority, TicketStatus, TicketCategory } from '../types';
import { 
  LifeBuoy, Search, Plus, FileUp, Clock, CheckCircle2, 
  AlertCircle, XCircle, ChevronRight, MessageSquare, 
  User, Calendar, Tag, AlertTriangle, Filter, Trash2, Edit3, RefreshCw,
  CheckSquare, Square, History, ClipboardList, Upload, FileSpreadsheet,
  Info, Eye, ShieldCheck, Download, Layers, Briefcase, ShieldAlert, Paperclip
} from 'lucide-react';
import { exportHelpDeskToExcel } from '../lib/excelExport';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface HelpDeskCenterProps {
  tickets: ITTicket[];
  onSave: (ticket: ITTicket) => void;
  onDelete: (id: string) => void;
  onSync?: () => Promise<void>;
  currentUser: string;
}

const HelpDeskCenter: React.FC<HelpDeskCenterProps> = ({ tickets, onSave, onDelete, onSync, currentUser }) => {
  const { notify } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'TODOS'>('TODOS');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<ITTicket | null>(null);
  
  // ==========================================
  // ERP QBE (Query By Example) Column Filters
  // ==========================================
  const [qbeFolio, setQbeFolio] = useState('');
  const [qbePriority, setQbePriority] = useState('');
  const [qbeCategory, setQbeCategory] = useState('');
  const [qbeTitle, setQbeTitle] = useState('');
  const [qbeDescription, setQbeDescription] = useState('');
  const [qbeRequester, setQbeRequester] = useState('');
  const [qbeAssignedTo, setQbeAssignedTo] = useState('');
  const [qbeInactivity, setQbeInactivity] = useState('');
  const [qbeStatus, setQbeStatus] = useState('');
  const [qbeDate, setQbeDate] = useState('');
  const [qbeElapsed, setQbeElapsed] = useState('');

  // ERP F980011D Inspector targets state
  const [inspectTicket, setInspectTicket] = useState<ITTicket | null>(null);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; ticket: ITTicket } | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const handleRowContextMenu = (e: React.MouseEvent, ticket: ITTicket) => {
    e.preventDefault();
    setContextMenu({
      // Offset slightly to prevent cursor overlap blocking hover states
      x: e.clientX,
      y: e.clientY - 2,
      ticket
    });
  };

  const resetAllQbeFilters = () => {
    setSearchTerm('');
    setStatusFilter('TODOS');
    setQbeFolio('');
    setQbePriority('');
    setQbeCategory('');
    setQbeTitle('');
    setQbeDescription('');
    setQbeRequester('');
    setQbeAssignedTo('');
    setQbeInactivity('');
    setQbeStatus('');
    setQbeDate('');
  };

  // Drill down detail and operations
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const selectedTicket = useMemo(() => {
    return tickets.find(t => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  const setSelectedTicket = (t: ITTicket | null) => {
    setSelectedTicketId(t ? t.id : null);
  };

  const [editDraft, setEditDraft] = useState<ITTicket | null>(null);

  useEffect(() => {
    if (selectedTicket) {
      setEditDraft(prev => {
        if (prev && prev.id === selectedTicket.id) {
          return {
            ...prev,
            subtasks: selectedTicket.subtasks,
            updates: selectedTicket.updates
          };
        }
        return JSON.parse(JSON.stringify(selectedTicket));
      });
    } else {
      setEditDraft(null);
    }
  }, [selectedTicket]);

  const handleSaveChanges = () => {
    if (!editDraft) return;
    const updatedTicket: ITTicket = {
      ...editDraft,
      updatedAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    onSave(updatedTicket);
    notify('¡Cambios guardados con éxito!', 'success');
    setSelectedTicket(null);
  };

  const getDraftDateString = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const handleDraftDateChange = (val: string) => {
    if (!val || !editDraft) return;
    try {
      const [year, month, day] = val.split('-').map(Number);
      const originalDate = new Date(editDraft.createdAt);
      if (!isNaN(originalDate.getTime())) {
        originalDate.setFullYear(year);
        originalDate.setMonth(month - 1);
        originalDate.setDate(day);
        setEditDraft({ ...editDraft, createdAt: originalDate.toISOString() });
      } else {
        const newD = new Date(year, month - 1, day, 12, 0, 0);
        setEditDraft({ ...editDraft, createdAt: newD.toISOString() });
      }
    } catch {
      setEditDraft({ ...editDraft, createdAt: new Date(val).toISOString() });
    }
  };

  const [isSubtaskFormOpen, setIsSubtaskFormOpen] = useState(false);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [newSubDue, setNewSubDue] = useState('');
  const [newUpdateTxt, setNewUpdateTxt] = useState('');
  const [newUpdateDate, setNewUpdateDate] = useState(new Date().toISOString().split('T')[0]);
  const [newUpdateFile, setNewUpdateFile] = useState<{ name: string; data: string } | null>(null);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [formFile, setFormFile] = useState<{ name: string; data: string } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'HARDWARE' as TicketCategory,
    priority: 'MEDIA' as TicketPriority,
    status: 'ABIERTO' as TicketStatus,
    assignedTo: '',
    requester: '',
    createdAt: new Date().toISOString().split('T')[0],
  });

  // Excel Import States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parsedTickets, setParsedTickets] = useState<ITTicket[]>([]);
  const [importReport, setImportReport] = useState<{ ticketsCount: number; subtasksCount: number; updatedCount: number } | null>(null);
  const [importingState, setImportingState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileImport(e.dataTransfer.files[0]);
    }
  };

  const handleFileImport = async (file: File) => {
    setImportingState('processing');
    setImportError(null);
    setImportReport(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          
          if (workbook.worksheets.length === 0) {
            throw new Error('El archivo Excel no contiene hojas de trabajo.');
          }
          
          const worksheet = workbook.worksheets[0];
          let headerRowIndex = -1;
          
          const colIndices = {
            folio: 1,
            rowLevel: 2,
            title: 3,
            description: 4,
            category: 5,
            priority: 6,
            status: 7,
            requesterLimit: 8,
            assignedTo: 9,
            createdAt: 10,
            resolution: 11
          };

          const getCellValue = (cell: any): string => {
            if (!cell || cell.value === null || cell.value === undefined) return '';
            if (cell.value instanceof Date) {
              return cell.value.toISOString();
            }
            if (typeof cell.value === 'object') {
              if ('richText' in cell.value && Array.isArray(cell.value.richText)) {
                return cell.value.richText.map((rt: any) => rt.text || '').join('').trim();
              }
              if ('text' in cell.value) {
                return String(cell.value.text || '').trim();
              }
              if ('result' in cell.value) {
                return String(cell.value.result || '').trim();
              }
              return String(cell.value).trim();
            }
            return String(cell.value).trim();
          };

          const parseExcelDate = (val: string): string => {
            if (!val) return new Date().toISOString();
            
            // Try direct Date construction
            const d1 = new Date(val);
            if (!isNaN(d1.getTime())) {
              return d1.toISOString();
            }
            
            // Try clean common formats, e.g. "03/06/2026" or "03-06-2026"
            const parts = val.split(/[\/\-\s:]/);
            if (parts.length >= 3) {
              let day = parseInt(parts[0], 10);
              let month = parseInt(parts[1], 10);
              let year = parseInt(parts[2], 10);
              
              if (day > 1000) { // e.g. 2026-06-03
                year = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                day = parseInt(parts[2], 10);
              }
              
              if (year > 100 && year < 1000) year += 2000;
              if (year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                const d2 = new Date(year, month - 1, day, 12, 0, 0);
                if (!isNaN(d2.getTime())) {
                  return d2.toISOString();
                }
              }
            }
            
            // Fallback to today
            return new Date().toISOString();
          };

          // Find header row dynamically
          for (let r = 1; r <= 30; r++) {
            const row = worksheet.getRow(r);
            let hasTitle = false;
            let hasFolio = false;
            let hasStatus = false;
            
            for (let c = 1; c <= 20; c++) {
              const val = getCellValue(row.getCell(c)).toUpperCase();
              if (val.includes('TÍTULO') || val.includes('TITULO') || val.includes('ACTIVIDAD')) {
                hasTitle = true;
              }
              if (val.includes('FOLIO') || val === 'ID' || val.includes('CÓDIGO') || val.includes('CODIGO')) {
                hasFolio = true;
              }
              if (val.includes('ESTADO') || val.includes('STATUS')) {
                hasStatus = true;
              }
            }
            if (hasTitle || (hasFolio && hasStatus)) {
              headerRowIndex = r;
              // Map index column configuration dynamically
              for (let c = 1; c <= 20; c++) {
                const val = getCellValue(row.getCell(c)).toUpperCase();
                if (val.includes('FOLIO') || val === 'ID' || val.includes('CÓDIGO') || val.includes('CODIGO')) {
                  colIndices.folio = c;
                } else if (val.includes('NIVEL') || val.includes('FILA') || val.includes('TIPO')) {
                  colIndices.rowLevel = c;
                } else if (val.includes('TÍTULO') || val.includes('TITULO') || val.includes('ACTIVIDAD')) {
                  colIndices.title = c;
                } else if (val.includes('DESCRIPCIÓN') || val.includes('DESCRIPCION') || val.includes('DETALLE')) {
                  colIndices.description = c;
                } else if (val.includes('CATEGORÍA') || val.includes('CATEGORIA')) {
                  colIndices.category = c;
                } else if (val.includes('PRIORIDAD')) {
                  colIndices.priority = c;
                } else if (val.includes('ESTADO') || val.includes('STATUS')) {
                  colIndices.status = c;
                } else if (val.includes('SOLICITANTE') || val.includes('LÍMITE') || val.includes('LIMITE') || val.includes('SOLICITA')) {
                  colIndices.requesterLimit = c;
                } else if (val.includes('ASIGNADO') || val.includes('TECNICO') || val.includes('TÉCNICO')) {
                  colIndices.assignedTo = c;
                } else if (val.includes('CREACIÓN') || val.includes('CREACION') || val.includes('EMISIÓN') || val.includes('FECHA')) {
                  colIndices.createdAt = c;
                } else if (val.includes('RESOLUCIÓN') || val.includes('RESOLU') || val.includes('FIN') || val.includes('CIERRE')) {
                  colIndices.resolution = c;
                }
              }
              break;
            }
          }

          if (headerRowIndex === -1) {
            headerRowIndex = 5;
          }

          const parsedList: ITTicket[] = [];
          let lastTicket: ITTicket | null = null;
          let subtasksCount = 0;
          let updatedCount = 0;

          for (let i = headerRowIndex + 1; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const titleVal = getCellValue(row.getCell(colIndices.title));
            if (!titleVal) continue;

            const folioVal = getCellValue(row.getCell(colIndices.folio)).toUpperCase();
            const levelVal = getCellValue(row.getCell(colIndices.rowLevel)).toUpperCase();
            const descVal = getCellValue(row.getCell(colIndices.description));
            const categoryVal = getCellValue(row.getCell(colIndices.category)).toUpperCase();
            const priorityVal = getCellValue(row.getCell(colIndices.priority)).toUpperCase();
            const statusVal = getCellValue(row.getCell(colIndices.status)).toUpperCase();
            const reqLimitVal = getCellValue(row.getCell(colIndices.requesterLimit));
            const assignedVal = getCellValue(row.getCell(colIndices.assignedTo));
            const createdVal = getCellValue(row.getCell(colIndices.createdAt));

            const isSubtask = levelVal.includes('SUB') || levelVal.includes('HIJO') || levelVal.includes('↳') || 
                              (lastTicket !== null && !folioVal && !categoryVal);

            if (isSubtask && lastTicket) {
              if (!lastTicket.subtasks) lastTicket.subtasks = [];
              const cleanedSubTitle = titleVal.replace(/^[↳\s]+/, '').trim().toUpperCase();
              
              const subtaskStatus: 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADA' = 
                statusVal.includes('FIN') || statusVal.includes('COMPL') || statusVal.includes('HECHO') || statusVal.includes('DONE')
                  ? 'FINALIZADA'
                  : statusVal.includes('PROC') || statusVal.includes('ACT') 
                    ? 'EN_PROCESO'
                    : 'PENDIENTE';

              const subtask: any = {
                id: crypto.randomUUID(),
                title: cleanedSubTitle,
                description: descVal || undefined,
                status: subtaskStatus,
                dueDate: reqLimitVal || undefined
              };
              if (subtaskStatus === 'FINALIZADA') {
                subtask.completedAt = new Date().toISOString();
              }
              lastTicket.subtasks.push(subtask);
              subtasksCount++;
            } else {
              if (lastTicket) {
                parsedList.push(lastTicket);
              }

              const existingTicket = tickets.find(t => t.folio.replace(/\s+/g, '').toUpperCase() === folioVal.replace(/\s+/g, '').toUpperCase() && folioVal !== '');
              
              const currentFolio = folioVal || `TK-${String(tickets.length + parsedList.length + 1).padStart(4, '0')}`;

              if (existingTicket) {
                updatedCount++;
                lastTicket = {
                  ...existingTicket,
                  title: titleVal.toUpperCase(),
                  description: descVal,
                  category: ['HARDWARE', 'SOFTWARE', 'REDES', 'ACCESOS', 'OTROS'].includes(categoryVal) ? categoryVal as any : existingTicket.category,
                  priority: ['BAJA', 'MEDIA', 'ALTA', 'CRÍTICA'].includes(priorityVal) ? priorityVal as any : existingTicket.priority,
                  status: ['ABIERTO', 'EN_PROCESO', 'ESPERANDO_USUARIO', 'RESUELTO', 'CERRADO', 'RECHAZADO'].includes(statusVal) ? statusVal as any : existingTicket.status,
                  requester: reqLimitVal || existingTicket.requester,
                  assignedTo: assignedVal || existingTicket.assignedTo,
                  updatedAt: new Date().toISOString(),
                  timestamp: Date.now(),
                  subtasks: []
                };
              } else {
                lastTicket = {
                  id: crypto.randomUUID(),
                  folio: currentFolio,
                  title: titleVal.toUpperCase(),
                  description: descVal,
                  category: ['HARDWARE', 'SOFTWARE', 'REDES', 'ACCESOS', 'OTROS'].includes(categoryVal) ? categoryVal as any : 'OTROS',
                  priority: ['BAJA', 'MEDIA', 'ALTA', 'CRÍTICA'].includes(priorityVal) ? priorityVal as any : 'MEDIA',
                  status: ['ABIERTO', 'EN_PROCESO', 'ESPERANDO_USUARIO', 'RESUELTO', 'CERRADO', 'RECHAZADO'].includes(statusVal) ? statusVal as any : 'ABIERTO',
                  userCreator: currentUser,
                  requester: reqLimitVal || 'SOLICITANTE GENERAL',
                  assignedTo: assignedVal || undefined,
                  createdAt: parseExcelDate(createdVal),
                  updatedAt: new Date().toISOString(),
                  timestamp: Date.now(),
                  subtasks: []
                };
              }
            }
          }

          if (lastTicket) {
            parsedList.push(lastTicket);
          }

          if (parsedList.length === 0) {
            throw new Error('No se detectaron tickets válidos en el archivo Excel.');
          }

          setParsedTickets(parsedList);
          setImportReport({
            ticketsCount: parsedList.length,
            subtasksCount,
            updatedCount
          });
          setImportingState('success');
        } catch (err: any) {
          console.error(err);
          setImportError(err?.message || 'Error al procesar el archivo Excel. Asegúrese de que sea formato .xlsx válido.');
          setImportingState('error');
        }
      };
      
      reader.onerror = () => {
        setImportError('Error de lectura del archivo local.');
        setImportingState('error');
      };

      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      console.error(err);
      setImportError(err?.message || 'Error de lectura de archivo.');
      setImportingState('error');
    }
  };

  const handleConfirmImport = () => {
    if (parsedTickets.length === 0) return;
    parsedTickets.forEach(ticket => {
      onSave(ticket);
    });
    setIsImportOpen(false);
    setParsedTickets([]);
    setImportReport(null);
    setImportingState('idle');
    alert('Importación realizada exitosamente en la base de datos central.');
  };

  const calculateInactivity = (updatedAt: string) => {
    const lastUpdate = new Date(updatedAt).getTime();
    const now = Date.now();
    const diffMs = now - lastUpdate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d ${diffHours}h sin movimiento`;
    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m sin movimiento`;
    return `${diffMinutes}m sin movimiento`;
  };

  const calculateElapsedDays = (createdAtStr?: string) => {
    if (!createdAtStr) return 0;
    const initDate = new Date(createdAtStr);
    if (isNaN(initDate.getTime())) return 0;
    const diffTime = Math.max(0, Date.now() - initDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Global Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        t.title.toLowerCase().includes(searchLower) || 
        t.folio.toLowerCase().includes(searchLower) ||
        t.userCreator.toLowerCase().includes(searchLower) ||
        t.requester.toLowerCase().includes(searchLower) ||
        (t.assignedTo && t.assignedTo.toLowerCase().includes(searchLower)) ||
        t.description.toLowerCase().includes(searchLower);

      // Status Toolbar Filter
      const matchesStatusToolbar = statusFilter === 'TODOS' || t.status === statusFilter;

      // QBE Columns Filters
      const matchesQbeFolio = !qbeFolio || t.folio.toLowerCase().includes(qbeFolio.toLowerCase());
      const matchesQbePriority = !qbePriority || t.priority.toLowerCase().includes(qbePriority.toLowerCase());
      const matchesQbeCategory = !qbeCategory || t.category.toLowerCase().includes(qbeCategory.toLowerCase());
      const matchesQbeTitle = !qbeTitle || t.title.toLowerCase().includes(qbeTitle.toLowerCase());
      const matchesQbeDescription = !qbeDescription || t.description.toLowerCase().includes(qbeDescription.toLowerCase());
      const matchesQbeRequester = !qbeRequester || t.requester.toLowerCase().includes(qbeRequester.toLowerCase());
      const matchesQbeAssignedTo = !qbeAssignedTo || (t.assignedTo && t.assignedTo.toLowerCase().includes(qbeAssignedTo.toLowerCase()));
      const matchesQbeStatus = !qbeStatus || t.status.toLowerCase().replace('_', ' ').replace('esperando usuario', 'esperando').includes(qbeStatus.toLowerCase());
      
      // Inactivity status text search
      const inactivityText = calculateInactivity(t.updatedAt).toLowerCase();
      const matchesQbeInactivity = !qbeInactivity || inactivityText.includes(qbeInactivity.toLowerCase());

      // Created date of ticket
      const createdDateText = new Date(t.createdAt).toLocaleDateString().toLowerCase();
      const matchesQbeDate = !qbeDate || createdDateText.includes(qbeDate.toLowerCase()) || t.createdAt.split('T')[0].includes(qbeDate);

      // Elapsed Days of ticket
      const elDays = calculateElapsedDays(t.createdAt);
      const matchesQbeElapsed = !qbeElapsed || String(elDays).includes(qbeElapsed) || `${elDays} días`.toLowerCase().includes(qbeElapsed.toLowerCase());

      return matchesSearch && 
             matchesStatusToolbar && 
             matchesQbeFolio && 
             matchesQbePriority && 
             matchesQbeCategory && 
             matchesQbeTitle && 
             matchesQbeDescription && 
             matchesQbeRequester && 
             matchesQbeAssignedTo && 
             matchesQbeStatus && 
             matchesQbeInactivity && 
             matchesQbeDate &&
             matchesQbeElapsed;
    });
  }, [
    tickets, 
    searchTerm, 
    statusFilter, 
    qbeFolio, 
    qbePriority, 
    qbeCategory, 
    qbeTitle, 
    qbeDescription, 
    qbeRequester, 
    qbeAssignedTo, 
    qbeStatus, 
    qbeInactivity, 
    qbeDate,
    qbeElapsed
  ]);

  const handleExportExcel = () => {
    exportHelpDeskToExcel(filteredTickets, `Tickets_TI_y_Subtareas_${new Date().toISOString().split('T')[0]}`);
  };

  const handlePrintPDF = () => {
    const doc = new jsPDF('l', 'mm', 'letter');
    doc.setFillColor(11, 60, 93); // ERP dark slate
    doc.rect(0, 0, 297, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSETFLOW HELP DESK TI - CONSULTA CONTROL DE SINDICACIÓN DE INCIDENCIAS', 15, 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('REPORTE DE ESTADOS DE SOPORTE - CONTROL DE COMPLIANCE P48201', 15, 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Impreso por: ${currentUser || 'SISTEMA'} - ${new Date().toLocaleString()}`, 220, 11);

    const title = "DIARIO GENERAL DE INCIDENCIAS TI Y ÓRDENES DE DESPLIEGUE SOPORTE";
    const headers = ['Folio', 'Prioridad', 'Categoría', 'Título', 'Solicitante', 'Asignado a', 'Última Actividad', 'Estado', 'Fecha Creación'];
    
    const rows = filteredTickets.map(t => [
      t.folio || 'N/A',
      t.priority || 'MEDIA',
      t.category || 'OTROS',
      t.title || '',
      t.requester || '',
      t.assignedTo || '-',
      calculateInactivity(t.updatedAt),
      t.status || 'ABIERTO',
      new Date(t.createdAt).toLocaleDateString('es-CL')
    ]);

    doc.setTextColor(11, 60, 93);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, 15, 33);

    (doc as any).autoTable({
      startY: 37,
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [210, 220, 230] },
      headStyles: { fillColor: [11, 60, 93], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [244, 247, 249] }
    });

    doc.save(`Inquiry_HelpDesk_P48201_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    
    if (editingTicket) {
      onSave({
        ...editingTicket,
        ...formData,
        createdAt: formData.createdAt.includes('T') ? formData.createdAt : new Date(formData.createdAt).toISOString(),
        updatedAt: now,
        timestamp: Date.now(),
        attachmentName: formFile ? formFile.name : undefined,
        attachmentData: formFile ? formFile.data : undefined
      });
    } else {
      const newTicket: ITTicket = {
        id: crypto.randomUUID(),
        folio: `TK-${String(tickets.length + 1).padStart(4, '0')}`,
        ...formData,
        createdAt: new Date(formData.createdAt).toISOString(),
        userCreator: currentUser,
        updatedAt: now,
        timestamp: Date.now(),
        attachmentName: formFile ? formFile.name : undefined,
        attachmentData: formFile ? formFile.data : undefined
      };
      onSave(newTicket);
    }
    
    setIsFormOpen(false);
    setEditingTicket(null);
    setFormFile(null);
    setFormData({ 
      title: '', 
      description: '', 
      category: 'HARDWARE', 
      priority: 'MEDIA', 
      status: 'ABIERTO', 
      assignedTo: '', 
      requester: '',
      createdAt: new Date().toISOString().split('T')[0] 
    });
  };

  const handleToggleSubtask = (ticket: ITTicket, subtaskId: string) => {
    const currentSubs = ticket.subtasks || [];
    const updatedSubs = currentSubs.map(sub => {
      if (sub.id === subtaskId) {
        const nextStatus = sub.status === 'FINALIZADA' ? 'PENDIENTE' : 'FINALIZADA';
        return {
          ...sub,
          status: nextStatus as any,
          completedAt: nextStatus === 'FINALIZADA' ? new Date().toISOString() : undefined
        };
      }
      return sub;
    });

    const base = (editDraft && editDraft.id === ticket.id) ? editDraft : ticket;
    const updatedTicket: ITTicket = {
      ...base,
      subtasks: updatedSubs,
      updatedAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    onSave(updatedTicket);
    if (selectedTicket?.id === ticket.id) {
      setSelectedTicket(updatedTicket);
    }
  };

  const handleDeleteSubtask = (ticket: ITTicket, subtaskId: string) => {
    const currentSubs = ticket.subtasks || [];
    const updatedSubs = currentSubs.filter(sub => sub.id !== subtaskId);

    const base = (editDraft && editDraft.id === ticket.id) ? editDraft : ticket;
    const updatedTicket: ITTicket = {
      ...base,
      subtasks: updatedSubs,
      updatedAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    onSave(updatedTicket);
    if (selectedTicket?.id === ticket.id) {
      setSelectedTicket(updatedTicket);
    }
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newSubTitle.trim()) return;

    const newSub = {
      id: crypto.randomUUID(),
      title: newSubTitle.trim().toUpperCase(),
      description: newSubDesc.trim() || undefined,
      status: 'PENDIENTE' as const,
      dueDate: newSubDue || undefined
    };

    const base = (editDraft && editDraft.id === selectedTicket.id) ? editDraft : selectedTicket;
    const updatedTicket: ITTicket = {
      ...base,
      subtasks: [...(base.subtasks || []), newSub],
      updatedAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    onSave(updatedTicket);
    setSelectedTicket(updatedTicket);

    // Reset Form
    setNewSubTitle('');
    setNewSubDesc('');
    setNewSubDue('');
    setIsSubtaskFormOpen(false);
  };

  const handleAddTicketUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newUpdateTxt.trim()) return;

    const base = (editDraft && editDraft.id === selectedTicket.id) ? editDraft : selectedTicket;
    let updatedUpdates = [];

    if (editingUpdateId) {
      // Edit mode
      updatedUpdates = (base.updates || []).map(u => {
        if (u.id === editingUpdateId) {
          return {
            ...u,
            date: newUpdateDate || new Date().toISOString().split('T')[0],
            content: newUpdateTxt.trim(),
            timestamp: newUpdateDate ? new Date(newUpdateDate + 'T12:00:00Z').getTime() : Date.now(),
            attachmentName: newUpdateFile ? newUpdateFile.name : undefined,
            attachmentData: newUpdateFile ? newUpdateFile.data : undefined
          };
        }
        return u;
      });
      setEditingUpdateId(null);
      notify('Comentario/Avance modificado con éxito', 'success');
    } else {
      // Create mode
      const newUp = {
        id: crypto.randomUUID(),
        date: newUpdateDate || new Date().toISOString().split('T')[0],
        content: newUpdateTxt.trim(),
        user: currentUser || 'SISTEMA',
        timestamp: newUpdateDate ? new Date(newUpdateDate + 'T12:00:00Z').getTime() : Date.now(),
        attachmentName: newUpdateFile ? newUpdateFile.name : undefined,
        attachmentData: newUpdateFile ? newUpdateFile.data : undefined
      };
      updatedUpdates = [newUp, ...(base.updates || [])];
      notify('Comentario/Avance registrado con éxito', 'success');
    }

    const updatedTicket: ITTicket = {
      ...base,
      updates: updatedUpdates,
      updatedAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    onSave(updatedTicket);
    setSelectedTicket(updatedTicket);
    setNewUpdateTxt('');
    setNewUpdateDate(new Date().toISOString().split('T')[0]);
    setNewUpdateFile(null);
  };

  const handleDeleteTicketUpdate = (updateId: string) => {
    if (!selectedTicket) return;

    const base = (editDraft && editDraft.id === selectedTicket.id) ? editDraft : selectedTicket;
    const updatedUpdates = (base.updates || []).filter(u => u.id !== updateId);

    const updatedTicket: ITTicket = {
      ...base,
      updates: updatedUpdates,
      updatedAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    onSave(updatedTicket);
    setSelectedTicket(updatedTicket);
    notify('Comentario/Avance de soporte eliminado con éxito', 'success');

    if (editingUpdateId === updateId) {
      setEditingUpdateId(null);
      setNewUpdateTxt('');
      setNewUpdateDate(new Date().toISOString().split('T')[0]);
      setNewUpdateFile(null);
    }
  };

  const handleDownloadAttachments = (t: ITTicket) => {
    const list: { name: string; data: string; src: string }[] = [];
    if (t.attachmentName && t.attachmentData) {
      list.push({ name: t.attachmentName, data: t.attachmentData, src: 'TICKET' });
    }
    if (t.updates) {
      t.updates.forEach(u => {
        if (u.attachmentName && u.attachmentData) {
          list.push({ name: u.attachmentName, data: u.attachmentData, src: `AVANCE (${u.date})` });
        }
      });
    }

    if (list.length === 0) {
      notify('No hay documentos adjuntos en este registro.', 'info');
      return;
    }

    if (list.length === 1) {
      const link = document.createElement('a');
      link.href = list[0].data;
      link.download = list[0].name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify(`Descargando: ${list[0].name}`, 'success');
    } else {
      list.forEach(item => {
        const link = document.createElement('a');
        link.href = item.data;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      notify(`Descargando ${list.length} documentos adjuntos detectados.`, 'success');
    }
  };

  const generateRut = (name: string) => {
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    const baseNum = 12000000 + (sum % 7000000);
    // Chilean RUT Digit verifier calculation
    let temp = baseNum;
    let multiplier = 2;
    let sumDigits = 0;
    while (temp > 0) {
      sumDigits += (temp % 10) * multiplier;
      temp = Math.floor(temp / 10);
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const rem = 11 - (sumDigits % 11);
    const dv = rem === 11 ? '0' : rem === 10 ? 'K' : String(rem);
    
    // Format RUT like 12.345.678-K
    const formattedNum = baseNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formattedNum}-${dv}`;
  };

  const calculatePercent = (subs: any[]) => {
    if (!subs || subs.length === 0) return 100;
    const completed = subs.filter(s => s.status === 'FINALIZADA').length;
    return Math.round((completed / subs.length) * 100);
  };

  const getSLATime = (priority: TicketPriority) => {
    switch (priority) {
      case 'BAJA': return '72 HORAS DE ATENCIÓN SLA';
      case 'MEDIA': return '24 HORAS DE ATENCIÓN SLA';
      case 'ALTA': return '4 HORAS TIEMPO COMPROMETIDO';
      case 'CRÍTICA': return '1 HORA MÁXIMA PARA RESOLUCIÓN / ESCALADO';
      default: return '48 HORAS ESTÁNDAR';
    }
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'ABIERTO': return <AlertCircle size={14} className="text-blue-500" />;
      case 'EN_PROCESO': return <Clock size={14} className="text-amber-500" />;
      case 'ESPERANDO_USUARIO': return <MessageSquare size={14} className="text-purple-500" />;
      case 'RESUELTO': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'CERRADO': return <XCircle size={14} className="text-slate-400" />;
      case 'RECHAZADO': return <XCircle size={14} className="text-rose-600 font-bold" />;
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case 'BAJA': return 'bg-slate-100 text-slate-600';
      case 'MEDIA': return 'bg-blue-100 text-blue-700';
      case 'ALTA': return 'bg-orange-100 text-orange-700';
      case 'CRÍTICA': return 'bg-rose-100 text-rose-700 animate-pulse';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F4F7F9] overflow-hidden font-sans">
      {/* ERP TOOLBAR / PROGRAM HEADER */}
      <div className="bg-[#0B3C5D] text-white px-4 py-3 shrink-0 flex flex-wrap md:flex-nowrap justify-between items-center shadow-md select-none border-b border-[#082C45]">
        <div className="flex items-center gap-3">
          <div className="bg-[#FFCC00] text-[#0B3C5D] font-mono font-black text-xs px-2.5 py-1 rounded shadow-inner uppercase tracking-wider" title="Application ID / Control Program">
            P48201
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-1.5">
              <span>Soporte Desk TI - Control de Incidencias y Bitácoras</span>
            </h2>
            <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest flex items-center gap-2">
              <span>ERP SYSTEM v2.0</span>
              <span>•</span>
              <span>Doble click para examinar F980011D (Sujeciones y SLAs)</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
          <button 
            onClick={resetAllQbeFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1D2731] hover:bg-[#328CC1] text-[10px] font-black uppercase text-white rounded border border-[#328CC1] transition-all"
            title="Borrar todos los parámetros de búsqueda QBE"
          >
            <RefreshCw size={12} />
            <span>Limpiar QBE</span>
          </button>
          {onSync && (
            <button 
              onClick={onSync}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4F9D69] hover:bg-[#3E7C53] text-[10px] font-black uppercase text-white rounded border border-[#3E7C53] transition-all"
              title="Guardar base de datos de manera permanente"
            >
              <RefreshCw size={12} className="animate-spin-slow" />
              <span>Guardar Permanente</span>
            </button>
          )}
          <button 
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#328CC1] hover:bg-[#0B3C5D] text-[10px] font-black uppercase text-white rounded border border-blue-400 transition-all"
            title="Exportar listado actual a archivo PDF de auditoría"
          >
            <FileUp size={12} />
            <span>Reporte PDF</span>
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#127C56] hover:bg-[#0B5C3C] text-[10px] font-black uppercase text-white rounded border border-emerald-500 transition-all"
            title="Exportar planilla Excel interactiva"
          >
            <FileSpreadsheet size={12} />
            <span>Exportar Excel</span>
          </button>
          <button 
            onClick={() => {
              setParsedTickets([]);
              setImportReport(null);
              setImportingState('idle');
              setImportError(null);
              setIsImportOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[10px] font-black uppercase rounded border border-emerald-250 transition-all"
            title="Importar masivamente desde archivo Excel"
          >
            <Upload size={12} />
            <span>Importar Excel</span>
          </button>
          <button 
            onClick={() => {
              setEditingTicket(null);
              setFormFile(null);
              setFormData({ 
                title: '', 
                description: '', 
                category: 'HARDWARE', 
                priority: 'MEDIA', 
                status: 'ABIERTO', 
                assignedTo: '', 
                requester: '',
                createdAt: new Date().toISOString().split('T')[0]
              });
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFCC00] hover:bg-[#E6B800] text-[#0B3C5D] font-black uppercase rounded border border-[#E6B800] tracking-tight transition-all"
            title="Registrar una nueva solicitud de servicio"
          >
            <Plus size={12} />
            <span>Registrar Ticket</span>
          </button>
        </div>
      </div>

      {/* ERP FILTER TABS / SUBHEADER TOOLBAR */}
      <div className="bg-[#ECEFF4] border-b border-[#D2D9E2] px-4 py-2 flex flex-wrap justify-between items-center shrink-0 text-slate-750">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado Filtro Rápido ERP:</span>
          <div className="flex bg-white rounded border border-slate-300 p-0.5 shadow-inner">
            {(['TODOS', 'ABIERTO', 'EN_PROCESO', 'RESUELTO', 'RECHAZADO', 'CERRADO'] as const).map(status => (
              <button 
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${statusFilter === status ? 'bg-[#0B3C5D] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {status === 'TODOS' ? 'TODOS LOS REGISTROS' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 xl:mt-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Búsqueda General Unificada:</span>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar coincidencia..." 
              className="bg-white border border-slate-350 rounded pl-7 pr-2.5 py-1 text-[10px] font-bold uppercase w-48 sm:w-64 outline-none focus:border-[#0B3C5D]"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Search size={10} className="absolute left-2.5 top-2 text-slate-405" />
          </div>
        </div>
      </div>

      {/* ERP INTERACTIVE GRID CONTAINER */}
      <div className="flex-1 overflow-auto p-4 bg-[#F0F4F8]">
        <div className="bg-white rounded border border-[#B8C6D6] overflow-x-auto shadow-sm">
          <table className="w-full min-w-[1650px] table-fixed border-collapse text-xs select-none">
            {/* TABLE HEADER HEADINGS */}
            <thead>
              <tr className="bg-[#0B3C5D] text-white font-bold uppercase tracking-wide border-b border-[#082C45] h-9">
                <th className="px-1 border-r border-[#1D4F72] text-center font-black w-[45px]" title="Archivos Adjuntos">📎</th>
                <th className="px-2 border-r border-[#1D4F72] text-center font-black w-[95px]">Folio ID</th>
                <th className="px-2 border-r border-[#1D4F72] text-center font-black w-[95px]">Prioridad</th>
                <th className="px-2 border-r border-[#1D4F72] text-center font-black w-[130px]">Categoría</th>
                <th className="px-3 border-r border-[#1D4F72] text-left font-black w-[240px]">Título de Solicitud</th>
                <th className="px-3 border-r border-[#1D4F72] text-left font-black w-[350px]">Detalle / Descripción</th>
                <th className="px-3 border-r border-[#1D4F72] text-left font-black w-[170px]">Solicitante</th>
                <th className="px-3 border-r border-[#1D4F72] text-left font-black w-[150px]">Téc. Asignado</th>
                <th className="px-2 border-r border-[#1D4F72] text-center font-black w-[140px]">Inactividad / Edad</th>
                <th className="px-2 border-r border-[#1D4F72] text-center font-black w-[120px]">Estado</th>
                <th className="px-2 border-r border-[#1D4F72] text-center font-black w-[100px]">F. Creación</th>
                <th className="px-2 border-r border-[#1D4F72] text-center font-black w-[100px]">Días Transcurridos</th>
                <th className="px-2 text-center font-black w-[115px]">Operaciones ERP</th>
              </tr>

              {/* ERP QBE (Query by Example) COLUMN FILTERS ROW */}
              <tr className="bg-[#E4ECEF] border-b border-[#B8C6D6] h-8 shadow-inner">
                <td className="px-1 py-0.5 border-r border-[#B8C6D6] text-center text-[9px] font-black text-slate-450">-</td>
                <td className="px-1 py-0.5 border-r border-[#B8C6D6]">
                  <input 
                    type="text" 
                    value={qbeFolio}
                    onChange={e => setQbeFolio(e.target.value)}
                    placeholder="Filtrar..." 
                    className="w-full h-6 text-[10px] font-mono px-1 border border-slate-300 rounded uppercase outline-none focus:border-blue-500 text-center" 
                  />
                </td>
                <td className="px-1 py-0.5 border-r border-[#B8C6D6]">
                  <input 
                    type="text" 
                    value={qbePriority}
                    onChange={e => setQbePriority(e.target.value)}
                    placeholder="Filtrar..." 
                    className="w-full h-6 text-[10px] px-1 border border-slate-300 rounded uppercase outline-none focus:border-blue-500 text-center" 
                  />
                </td>
                <td className="px-1 py-0.5 border-r border-[#B8C6D6]">
                  <input 
                    type="text" 
                    value={qbeCategory}
                    onChange={e => setQbeCategory(e.target.value)}
                    placeholder="Filtrar..." 
                    className="w-full h-6 text-[10px] px-1 border border-slate-300 rounded uppercase outline-none focus:border-blue-500 text-center" 
                  />
                </td>
                <td className="px-1 py-0.5 border-r border-[#B8C6D6]">
                  <input 
                    type="text" 
                    value={qbeTitle}
                    onChange={e => setQbeTitle(e.target.value)}
                    placeholder="Filtrar..." 
                    className="w-full h-6 text-[10px] px-1.5 border border-slate-300 rounded uppercase outline-none focus:border-blue-500" 
                  />
                </td>
                <td className="px-1 py-0.5 border-r border-[#B8C6D6]">
                  <input 
                    type="text" 
                    value={qbeDescription}
                    onChange={e => setQbeDescription(e.target.value)}
                    placeholder="Filtrar..." 
                    className="w-full h-6 text-[10px] px-1.5 border border-slate-300 rounded uppercase outline-none focus:border-blue-500" 
                  />
                </td>
                <td className="px-1 py-0.5 border-r border-[#B8C6D6]">
                  <input 
                    type="text" 
                    value={qbeRequester}
                    onChange={e => setQbeRequester(e.target.value)}
                    placeholder="Filtrar..." 
                    className="w-full h-6 text-[10px] px-1.5 border border-slate-300 rounded uppercase outline-none focus:border-blue-500" 
                  />
                </td>
                <td className="px-1 py-0.5 border-r border-[#B8C6D6]">
                  <input 
                    type="text" 
                    value={qbeAssignedTo}
                    onChange={e => setQbeAssignedTo(e.target.value)}
                    placeholder="Filtrar..." 
                    className="w-full h-6 text-[10px] px-1.5 border border-slate-300 rounded uppercase outline-none focus:border-blue-500" 
                  />
                </td>
                <td className="px-1 py-0.5 border-r border-[#B8C6D6]">
                  <input 
                    type="text" 
                    value={qbeInactivity}
                    onChange={e => setQbeInactivity(e.target.value)}
                    placeholder="Filtrar..." 
                    className="w-full h-6 text-[10px] px-1 border border-slate-300 rounded uppercase outline-none focus:border-blue-500 text-center" 
                  />
                </td>
                <td className="px-1 py-0.5 border-r border-[#B8C6D6]">
                  <select 
                    value={qbeStatus}
                    onChange={e => setQbeStatus(e.target.value)}
                    className="w-full h-6 text-[10px] px-1 border border-slate-300 rounded uppercase outline-none focus:border-blue-500 text-center font-bold text-slate-750 bg-white"
                  >
                    <option value="">FILTRAR...</option>
                    <option value="ABIERTO">ABIERTO</option>
                    <option value="EN_PROCESO">EN PROCESO</option>
                    <option value="ESPERANDO_USUARIO">ESPERANDO U.</option>
                    <option value="RESUELTO">RESUELTO</option>
                    <option value="RECHAZADO">RECHAZADO</option>
                    <option value="CERRADO">CERRADO</option>
                  </select>
                </td>
                <td className="px-1 py-0.5 border-r border-[#B8C6D6]">
                  <input 
                    type="text" 
                    value={qbeDate}
                    onChange={e => setQbeDate(e.target.value)}
                    placeholder="DD/MM/AAAA..." 
                    className="w-full h-6 text-[10px] px-1 border border-slate-300 rounded uppercase outline-none focus:border-blue-500 text-center" 
                  />
                </td>
                <td className="px-1 py-0.5 border-r border-[#B8C6D6]">
                  <input 
                    type="text" 
                    value={qbeElapsed}
                    onChange={e => setQbeElapsed(e.target.value)}
                    placeholder="Filtrar..." 
                    className="w-full h-6 text-[10px] px-1 border border-slate-300 rounded uppercase outline-none focus:border-blue-500 text-center" 
                  />
                </td>
                <td className="px-1 py-0.5 text-center text-[10px] font-bold text-slate-400 select-none">QBE Control</td>
              </tr>
            </thead>

            {/* TABLE ROWS */}
            <tbody className="divide-y divide-[#D2D9E2]">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-20 text-center text-slate-400 font-black uppercase tracking-widest bg-[#F9FAFB]">
                    <div className="w-16 h-16 bg-[#F4F7F9] text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#B8C6D6]">
                      <LifeBuoy size={32} />
                    </div>
                    No se encontraron registros de incidencias para QBE ingresado
                  </td>
                </tr>
              ) : (
                filteredTickets.map(t => {
                  const hasTicketAttachment = !!(t.attachmentName && t.attachmentData);
                  const hasUpdateAttachment = !!(t.updates?.some(u => u.attachmentName && u.attachmentData));
                  const hasAnyAttachment = hasTicketAttachment || hasUpdateAttachment;

                  return (
                    <tr 
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      onDoubleClick={() => setInspectTicket(t)}
                      onContextMenu={(e) => handleRowContextMenu(e, t)}
                      className={`hover:bg-[#EAF3FC] cursor-pointer transition-all h-9 group select-none relative ${
                        selectedTicket?.id === t.id 
                          ? 'bg-[#CBE0F5] font-semibold text-slate-900 border-y-2 border-[#0B3C5D]' 
                          : 'odd:bg-[#FAFBFD] text-slate-800'
                      }`}
                      title="Click para ver detalle/bitácora. Doble-click para Inspector ERP. Click derecho para opciones rápidas."
                    >
                      {/* Attachments Column */}
                      <td className="px-1 border-r border-[#D2D9E2] text-center" onClick={(e) => { e.stopPropagation(); if (hasAnyAttachment) handleDownloadAttachments(t); }}>
                        {hasAnyAttachment ? (
                          <button 
                            className="p-1 hover:bg-slate-200 text-indigo-600 rounded transition-all duration-150 inline-flex items-center justify-center"
                            title={`Tiene ${[hasTicketAttachment ? '1 Doc Principal' : '', hasUpdateAttachment ? 'Doc(s) en Bitácora' : ''].filter(Boolean).join(' y ')}. Haga clic para descargar.`}
                          >
                            <Paperclip size={12} className="stroke-[2.5]" />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px] font-black opacity-30">-</span>
                        )}
                      </td>

                      {/* Folio */}
                      <td className="px-2 border-r border-[#D2D9E2] text-center font-mono font-black text-slate-705">
                        {t.folio}
                      </td>

                    {/* Priority */}
                    <td className="px-2 border-r border-[#D2D9E2] text-center font-black">
                      <span className={`px-2 py-0.5 text-[8.5px] rounded-full uppercase leading-none ${getPriorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-2 border-r border-[#D2D9E2] text-center font-bold text-slate-500 uppercase">
                      {t.category}
                    </td>

                    {/* Title */}
                    <td className="px-3 border-r border-[#D2D9E2] text-left font-black uppercase text-slate-900 group-hover:text-indigo-800 transition-all">
                      {t.title}
                    </td>

                    {/* Description */}
                    <td className="px-3 border-r border-[#D2D9E2] text-left font-medium text-slate-500 truncate max-w-[280px]" title={t.description}>
                      {t.description}
                    </td>

                    {/* Requester / Operator */}
                    <td className="px-3 border-r border-[#D2D9E2] text-left font-bold text-slate-600 uppercase">
                      <div>{t.requester}</div>
                      <div className="text-[8px] font-bold text-slate-400 mt-0.5 normal-case">Registrado por: {t.userCreator}</div>
                    </td>

                    {/* Assigned To */}
                    <td className="px-3 border-r border-[#D2D9E2] text-left font-black text-slate-700 uppercase">
                      {t.assignedTo ? (
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                          <span>{t.assignedTo}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-bold italic">- SIN ASIGNAR -</span>
                      )}
                    </td>

                    {/* Inactivity Tracker */}
                    <td className="px-2 border-r border-[#D2D9E2] text-center font-mono font-black text-amber-600 uppercase">
                      {calculateInactivity(t.updatedAt)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-2 border-r border-[#D2D9E2] text-center font-bold">
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 py-0.5 px-2.5 rounded-full shadow-sm text-slate-750 uppercase">
                        {getStatusIcon(t.status)}
                        <span className="text-[9px] font-black">{t.status.replace('_', ' ')}</span>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="px-2 border-r border-[#D2D9E2] text-center font-bold text-slate-500 uppercase">
                      {new Date(t.createdAt).toLocaleDateString('es-CL')}
                    </td>

                    {/* Días Transcurridos */}
                    <td className="px-2 border-r border-[#D2D9E2] text-center font-mono font-black text-indigo-750">
                      {calculateElapsedDays(t.createdAt)} días
                    </td>

                    {/* ERP Row Administrative Actions */}
                    <td className="px-2 text-center" onClick={(e) => { e.stopPropagation(); setContextMenu(null); }}>
                      <div className="flex justify-center items-center gap-1">
                        {/* Bitácora / Subtareas */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(t);
                          }}
                          className="p-1 hover:bg-[#D2E3F4] text-indigo-600 rounded transition"
                          title="Acceder a bitácoras de avance y subtareas (Drill Down TI)"
                        >
                          <ClipboardList size={13} />
                        </button>
                        
                        {/* F980011D Inspector */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectTicket(t);
                          }}
                          className="p-1 hover:bg-[#D2E3F4] text-emerald-600 rounded transition"
                          title="Ver F980011D Inspector de Integridad, Atributos y SLAs"
                        >
                          <ShieldCheck size={13} />
                        </button>

                        {/* Edit Param */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTicket(t);
                            setFormFile(t.attachmentName ? { name: t.attachmentName, data: t.attachmentData || '' } : null);
                            setFormData({
                              title: t.title,
                              description: t.description,
                              category: t.category,
                              priority: t.priority,
                              status: t.status,
                              assignedTo: t.assignedTo || '',
                              requester: t.requester || '',
                              createdAt: t.createdAt.split('T')[0]
                            });
                            setIsFormOpen(true);
                          }}
                          className="p-1 hover:bg-[#D2E3F4] text-amber-600 rounded transition"
                          title="Editar propiedades generales del ticket"
                        >
                          <Edit3 size={13} />
                        </button>

                        {/* Delete Permanently */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('¿Está absolutamente seguro de eliminar permanentemente esta orden de soporte/ticket?')) {
                              onDelete(t.id);
                              notify('Ticket / orden de soporte eliminado exitosamente', 'success');
                            }
                          }}
                          className="p-1 hover:bg-rose-50 text-rose-600 rounded transition"
                          title="Eliminar registro"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[400] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl border-[6px] border-indigo-600 overflow-hidden animate-in zoom-in-95">
            <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <LifeBuoy size={28} />
                <h2 className="text-xl font-black uppercase tracking-tighter">{editingTicket ? 'Editar Ticket' : 'Nueva Solicitud TI'}</h2>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><XCircle size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Nombre del Solicitante</label>
                  <input 
                    required 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-black uppercase outline-none focus:border-indigo-600"
                    value={formData.requester}
                    onChange={e => setFormData(p => ({ ...p, requester: e.target.value.toUpperCase() }))}
                    placeholder="QUIEN SOLICITA..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Asunto / Título</label>
                  <input 
                    required 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-black uppercase outline-none focus:border-indigo-600"
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value.toUpperCase() }))}
                    placeholder="EJ: PROBLEMA CON IMPRESORA..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Descripción Detallada</label>
                <textarea 
                  required 
                  rows={4}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:border-indigo-600 resize-none"
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describa el problema o requerimiento..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Fecha de Solicitud</label>
                  <input 
                    type="date"
                    required 
                    onClick={(e) => { try { e.currentTarget.showPicker(); } catch (error) {} }}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-black outline-none focus:border-indigo-600 cursor-pointer hover:bg-slate-100/50 transition-all"
                    value={formData.createdAt}
                    onChange={e => setFormData(p => ({ ...p, createdAt: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Asignado a (TI)</label>
                  <input 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-black uppercase outline-none focus:border-indigo-600"
                    value={formData.assignedTo}
                    onChange={e => setFormData(p => ({ ...p, assignedTo: e.target.value.toUpperCase() }))}
                    placeholder="NOMBRE INTEGRANTE TI..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Categoría</label>
                  <select 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-black uppercase outline-none focus:border-indigo-600"
                    value={formData.category}
                    onChange={e => setFormData(p => ({ ...p, category: e.target.value as TicketCategory }))}
                  >
                    <option value="HARDWARE">HARDWARE</option>
                    <option value="SOFTWARE">SOFTWARE</option>
                    <option value="REDES">REDES</option>
                    <option value="ACCESOS">ACCESOS</option>
                    <option value="OTROS">OTROS</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Prioridad</label>
                  <select 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-black uppercase outline-none focus:border-indigo-600"
                    value={formData.priority}
                    onChange={e => setFormData(p => ({ ...p, priority: e.target.value as TicketPriority }))}
                  >
                    <option value="BAJA">BAJA</option>
                    <option value="MEDIA">MEDIA</option>
                    <option value="ALTA">ALTA</option>
                    <option value="CRÍTICA">CRÍTICA</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-700 uppercase px-1">Estado del Ticket</label>
                <select 
                  className="w-full bg-slate-50 text-slate-900 border-2 border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-black uppercase outline-none focus:border-indigo-600 focus:bg-white"
                  value={formData.status}
                  onChange={e => setFormData(p => ({ ...p, status: e.target.value as TicketStatus }))}
                >
                  <option value="ABIERTO">ABIERTO</option>
                  <option value="EN_PROCESO">EN PROCESO</option>
                  <option value="ESPERANDO_USUARIO">ESPERANDO USUARIO</option>
                  <option value="RESUELTO">RESUELTO</option>
                  <option value="RECHAZADO">RECHAZADO</option>
                  <option value="CERRADO">CERRADO</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Comprobante de Entrega / Documento (PDF)</label>
                <div className="flex items-center gap-3 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5">
                  <input 
                    type="file" 
                    accept="application/pdf"
                    id="ticket-pdf-file"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const r = new FileReader();
                        r.onload = (event) => {
                          setFormFile({
                            name: file.name,
                            data: event.target?.result as string
                          });
                        };
                        r.readAsDataURL(file);
                      }
                    }}
                  />
                  <label 
                    htmlFor="ticket-pdf-file" 
                    className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] uppercase rounded-xl cursor-pointer border border-indigo-200 transition-all flex items-center gap-1.5"
                  >
                    <Upload size={12} />
                    {formFile ? 'Cambiar PDF' : 'Subir PDF'}
                  </label>
                  {formFile && (
                    <div className="flex-1 flex items-center justify-between text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg max-w-xs truncate">
                      <span className="truncate flex items-center gap-1">
                        <Paperclip size={12} className="text-indigo-600 shrink-0" />
                        {formFile.name}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setFormFile(null)} 
                        className="text-rose-600 hover:text-rose-800 font-extrabold text-xs ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all border-b-8 border-indigo-800 active:translate-y-1 active:border-b-0"
              >
                {editingTicket ? 'Actualizar Ticket' : 'Enviar Solicitud'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-[400] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl border-[6px] border-emerald-600 overflow-hidden animate-in zoom-in-95">
            <div className="bg-emerald-600 p-8 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <FileSpreadsheet size={28} />
                <h2 className="text-xl font-black uppercase tracking-tighter">Importar Tickets de Excel</h2>
              </div>
              <button 
                onClick={() => {
                  setIsImportOpen(false);
                  setParsedTickets([]);
                  setImportReport(null);
                  setImportingState('idle');
                }} 
                className="p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <XCircle size={24}/>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {/* DESCRIPTION & DOWNLOAD TEMPLATE */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-[11px] text-slate-600 space-y-2">
                <p className="font-bold uppercase text-slate-800 flex items-center gap-1.5 font-sans">
                  <AlertTriangle size={14} className="text-amber-500" />
                  Instrucciones para Importación Orgánica:
                </p>
                <ul className="list-disc pl-4 space-y-1 font-sans font-medium">
                  <li>El sistema detectará automáticamente las columnas basadas en los nombres de las cabeceras (como <strong>Folio, Título, Descripción, Categoría, Prioridad, Estado, Solicitante</strong>).</li>
                  <li>Si el folio ingresado ya existe, los parámetros generales del ticket se actualizarán de forma orgánica reuniéndose con sus bitácoras históricas.</li>
                  <li>Soporta jerarquías: filas marcadas como <strong>↳ SUB-TAREA</strong> o que no posean folio ni categoría bajo un ticket se incorporarán automáticamente como tareas internas de resolución de dicho ticket.</li>
                </ul>
              </div>

              {/* UPLOAD BOX */}
              {importingState === 'idle' && (
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-4 border-dashed rounded-3xl p-10 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                    dragActive 
                      ? 'border-emerald-600 bg-emerald-50/10' 
                      : 'border-slate-200 hover:border-emerald-500 bg-slate-50/15'
                  }`}
                  onClick={() => document.getElementById('excelFileInput')?.click()}
                >
                  <Upload size={48} className="text-slate-400 mb-3 animate-bounce" />
                  <p className="text-xs font-black text-slate-700 uppercase mb-1">Arrastre su planilla Excel aquí</p>
                  <p className="text-[10px] text-slate-405 font-bold uppercase mb-4">o haga clic para seleccionar archivo desde su computador (.xlsx, .xls)</p>
                  
                  <input 
                    type="file"
                    id="excelFileInput"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileImport(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              )}

              {/* PROCESSING LOADER */}
              {importingState === 'processing' && (
                <div className="py-12 text-center space-y-4">
                  <RefreshCw className="animate-spin text-emerald-600 mx-auto" size={40} />
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase">Analizando Estructura de Planilla...</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Sincronizando modelos jerárquicos y buscando cabeceras</p>
                  </div>
                </div>
              )}

              {/* ERROR STATE */}
              {importingState === 'error' && (
                <div className="border border-rose-200 bg-rose-50/10 rounded-2xl p-6 text-center space-y-3">
                  <AlertCircle size={32} className="text-rose-500 mx-auto" />
                  <div>
                    <h4 className="text-xs font-black text-rose-800 uppercase">Fallo en el Análisis del Archivo</h4>
                    <p className="text-xs text-rose-600 mt-1 font-semibold">{importError}</p>
                  </div>
                  <button 
                    onClick={() => setImportingState('idle')}
                    className="px-4 py-2 bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-xl hover:bg-rose-200 transition-colors"
                  >
                    Reintentar con otro Archivo
                  </button>
                </div>
              )}

              {/* SUCCESS / PREVIEW TABLE */}
              {importingState === 'success' && importReport && (
                <div className="space-y-4">
                  {/* METRIC BADGES */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
                      <span className="block text-[9px] font-black text-emerald-600 uppercase">Leídos del Excel</span>
                      <strong className="text-xl font-black text-emerald-800">{importReport.ticketsCount}</strong>
                      <span className="block text-[8px] font-black text-emerald-400 uppercase mt-0.5">Tickets</span>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl text-center">
                      <span className="block text-[9px] font-black text-indigo-600 uppercase">Tareas de Resolución</span>
                      <strong className="text-xl font-black text-indigo-800">{importReport.subtasksCount}</strong>
                      <span className="block text-[8px] font-black text-indigo-400 uppercase mt-0.5">Anidadas</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center">
                      <span className="block text-[9px] font-black text-amber-600 uppercase">Actualizaciones</span>
                      <strong className="text-xl font-black text-amber-800">{importReport.updatedCount}</strong>
                      <span className="block text-[8px] font-black text-amber-400 uppercase mt-0.5">Existentes</span>
                    </div>
                  </div>

                  {/* MINI PREVIEW */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vista Previa de Importación</span>
                    <div className="max-h-40 overflow-y-auto border border-slate-200/60 rounded-2xl bg-slate-50 divide-y divide-slate-100">
                      {parsedTickets.map((t, idx) => (
                        <div key={idx} className="p-3 flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono font-black text-indigo-600">{t.folio}</span>
                              <span className="font-black text-slate-800 uppercase line-clamp-1">{t.title}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                              <span>Solicita: {t.requester}</span>
                              <span>•</span>
                              <span>Prioridad: {t.priority}</span>
                              {t.subtasks && t.subtasks.length > 0 && (
                                <span className="text-indigo-500 font-black">• {t.subtasks.length} Subtareas</span>
                              )}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            tickets.some(cur => cur.folio === t.folio) 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {tickets.some(cur => cur.folio === t.folio) ? 'Actualizar' : 'Nuevo'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* BUTTONS BAR */}
                  <div className="flex gap-3 justify-end pt-2">
                    <button 
                      onClick={() => setImportingState('idle')}
                      className="px-5 py-3 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-55 transition-colors"
                    >
                      Cambiar Archivo
                    </button>
                    <button 
                      onClick={handleConfirmImport}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-[20px] text-[10px] font-black uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-colors border-b-4 border-emerald-75 active:translate-y-0.5 active:border-b-0"
                    >
                      Procesar e Integrar en Sistema
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DRILL DOWN DRAWER / SLIDE PANEL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[400] bg-slate-950/65 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-50 w-full max-w-4xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-305">
            {/* DRAWER HEADER */}
            <div className="bg-indigo-700 text-white p-6 flex justify-between items-center shrink-0 shadow-md">
              <div className="flex items-center gap-4 w-full mr-4">
                <div className="bg-white/10 p-2 rounded-xl shrink-0">
                  <LifeBuoy size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-black text-indigo-200">{editDraft?.folio}</span>
                    <select
                      value={editDraft?.priority || 'MEDIA'}
                      onChange={e => setEditDraft(prev => prev ? { ...prev, priority: e.target.value as TicketPriority } : null)}
                      className="px-2 py-0.5 rounded text-[8px] font-black uppercase border border-white/20 text-white outline-none cursor-pointer bg-indigo-800 focus:bg-indigo-900 transition-all"
                    >
                      <option value="BAJA" className="bg-slate-800 text-white">Prioridad BAJA</option>
                      <option value="MEDIA" className="bg-slate-800 text-white">Prioridad MEDIA</option>
                      <option value="ALTA" className="bg-slate-800 text-white">Prioridad ALTA</option>
                      <option value="CRÍTICA" className="bg-slate-800 text-rose-400 font-bold">Prioridad CRÍTICA</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={editDraft?.title || ''}
                    onChange={e => setEditDraft(prev => prev ? { ...prev, title: e.target.value.toUpperCase() } : null)}
                    className="text-base font-black uppercase tracking-tight leading-tight mt-1 bg-transparent border-b border-indigo-400 focus:border-white outline-none w-full text-white placeholder-indigo-200"
                    placeholder="TÍTULO DE LA SOLICITUD"
                  />
                </div>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)} 
                className="text-white hover:bg-white/10 p-2.5 rounded-full transition-all shrink-0"
                title="Cerrar detalles del ticket"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* DRAWER SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-auto p-6 md:p-8 space-y-8 custom-audit-scroll">
              {/* TICKET DETAILS CARD */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b border-slate-100 text-xs font-semibold">
                  <div>
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Solicitante</span>
                    <input
                      type="text"
                      value={editDraft?.requester || ''}
                      onChange={e => setEditDraft(prev => prev ? { ...prev, requester: e.target.value.toUpperCase() } : null)}
                      className="w-full text-xs font-black uppercase text-slate-800 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Creado Por</span>
                    <div className="text-slate-500 px-3 py-2 bg-slate-100/70 border border-slate-150 rounded-xl text-xs font-semibold uppercase">
                      {editDraft?.userCreator || 'SISTEMA'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Categoría</span>
                    <select
                      value={editDraft?.category || 'OTROS'}
                      onChange={e => setEditDraft(prev => prev ? { ...prev, category: e.target.value as TicketCategory } : null)}
                      className="w-full text-xs font-black text-indigo-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer shadow-inner"
                    >
                      <option value="HARDWARE">HARDWARE</option>
                      <option value="SOFTWARE">SOFTWARE</option>
                      <option value="REDES">REDES</option>
                      <option value="ACCESOS">ACCESOS</option>
                      <option value="OTROS">OTROS</option>
                    </select>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha Apertura</span>
                    <input
                      type="date"
                      onClick={(e) => { try { e.currentTarget.showPicker(); } catch (error) {} }}
                      value={editDraft ? getDraftDateString(editDraft.createdAt) : ''}
                      onChange={e => handleDraftDateChange(e.target.value)}
                      className="w-full text-xs font-black uppercase text-slate-800 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner cursor-pointer hover:bg-slate-100/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs font-semibold">
                  <div>
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Asignado a TI</span>
                    <input
                      type="text"
                      value={editDraft?.assignedTo || ''}
                      onChange={e => setEditDraft(prev => prev ? { ...prev, assignedTo: e.target.value.toUpperCase() } : null)}
                      placeholder="SIN ASIGNAR..."
                      className="w-full text-xs font-black uppercase text-slate-800 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado de Atención</span>
                    <div className="relative">
                      <select
                        value={editDraft?.status || 'ABIERTO'}
                        onChange={e => {
                          const nextStatus = e.target.value as TicketStatus;
                          setEditDraft(prev => {
                            if (!prev) return null;
                            let nextRes = prev.resolution;
                            if (['RESUELTO', 'CERRADO', 'RECHAZADO'].includes(nextStatus)) {
                              if (!prev.resolution) {
                                nextRes = new Date().toISOString().split('T')[0];
                              }
                            } else {
                              nextRes = undefined;
                            }
                            return {
                              ...prev,
                              status: nextStatus,
                              resolution: nextRes
                            };
                          });
                        }}
                        className="w-full text-xs font-black uppercase text-slate-800 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer shadow-inner appearance-none"
                      >
                        <option value="ABIERTO">🔓 ABIERTO</option>
                        <option value="EN_PROCESO">⚙️ EN PROCESO</option>
                        <option value="ESPERANDO_USUARIO">💬 ESPERANDO USUARIO</option>
                        <option value="RESUELTO">✅ RESUELTO</option>
                        <option value="RECHAZADO">❌ RECHAZADO</option>
                        <option value="CERRADO">🔒 CERRADO</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold">&#9662;</div>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha de Cambio de Estado / Cierre</span>
                    <input
                      type="date"
                      onClick={(e) => { try { e.currentTarget.showPicker(); } catch (error) {} }}
                      value={editDraft?.resolution ? editDraft.resolution.split('T')[0] : ''}
                      onChange={e => setEditDraft(prev => prev ? { ...prev, resolution: e.target.value } : null)}
                      className="w-full text-xs font-black uppercase text-slate-800 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner cursor-pointer hover:bg-slate-100/50"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descripción de la Solicitud</span>
                  <textarea
                    value={editDraft?.description || ''}
                    onChange={e => setEditDraft(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={4}
                    className="w-full text-xs text-slate-700 font-semibold leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                    placeholder="Descripción detallada de la solicitud..."
                  />
                </div>
              </div>

              {/* TWO COLS: SUBTASKS & ADVANCES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* SUBTASKS CONTAINER */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                        <ClipboardList className="text-indigo-600" size={18} />
                        Tareas Internas de Resolución
                      </h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        {selectedTicket.subtasks && selectedTicket.subtasks.length > 0
                          ? `${selectedTicket.subtasks.filter(s => s.status === 'FINALIZADA').length} de ${selectedTicket.subtasks.length} ejecutadas`
                          : "Sin subtareas asignadas de resolución"}
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsSubtaskFormOpen(!isSubtaskFormOpen)}
                      className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[9px] font-black uppercase transition-colors"
                    >
                      {isSubtaskFormOpen ? "Cerrar Caja" : "Añadir Tarea"}
                    </button>
                  </div>

                  {/* PROGRESS BAR */}
                  {selectedTicket.subtasks && selectedTicket.subtasks.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase">
                        <span>Avance de resolución técnica</span>
                        <span className="text-indigo-600">
                          {Math.round(
                            (selectedTicket.subtasks.filter(s => s.status === 'FINALIZADA').length / selectedTicket.subtasks.length) * 100
                          )}%
                        </span>
                      </div>
                      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-650 transition-all duration-300 rounded-full" 
                          style={{
                            width: `${Math.round(
                              (selectedTicket.subtasks.filter(s => s.status === 'FINALIZADA').length / selectedTicket.subtasks.length) * 100
                            )}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* INLINE NEW SUBTASK FORM */}
                  {isSubtaskFormOpen && (
                    <form onSubmit={handleAddSubtask} className="bg-slate-50 border border-[#9DB2C3] p-4 rounded-2xl space-y-4 animate-in slide-in-from-top-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase px-1">Título de la Tarea</label>
                        <input 
                          type="text" 
                          required
                          value={newSubTitle}
                          onChange={e => setNewSubTitle(e.target.value.toUpperCase())}
                          placeholder="EJ: VERIFICAR DIRECCIÓN IP / ACTUALIZAR CONTROLADORES"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black uppercase outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase px-1">Notas (Opcional)</label>
                        <textarea 
                          rows={2}
                          value={newSubDesc}
                          onChange={e => setNewSubDesc(e.target.value)}
                          placeholder="Notas opcionales..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600 resize-none animate-in duration-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase px-1">Fecha Límite (Opcional)</label>
                        <input 
                          type="date"
                          onClick={(e) => { try { e.currentTarget.showPicker(); } catch (error) {} }}
                          value={newSubDue}
                          onChange={e => setNewSubDue(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 cursor-pointer hover:bg-slate-50 transition-colors"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-2 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase hover:bg-indigo-700 transition-all shadow-sm"
                      >
                        Crear Tarea Técnica
                      </button>
                    </form>
                  )}

                  {/* SUBTASKS LIST */}
                  <div className="space-y-3">
                    {!selectedTicket.subtasks || selectedTicket.subtasks.length === 0 ? (
                      <div className="py-6 text-center text-slate-400">
                        <ClipboardList size={24} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Sin tareas añadidas aún</p>
                      </div>
                    ) : (
                      selectedTicket.subtasks.map(sub => {
                        const isDone = sub.status === 'FINALIZADA';
                        return (
                          <div 
                            key={sub.id}
                            className={`flex items-start justify-between p-3 rounded-xl border-2 transition-all ${
                              isDone ? 'bg-emerald-50/15 border-emerald-100 text-slate-400 shadow-none' : 'bg-slate-50/40 border-slate-150/60 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <button 
                                type="button" 
                                onClick={() => handleToggleSubtask(selectedTicket, sub.id)}
                                className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                              >
                                {isDone ? <CheckSquare size={16} className="text-emerald-500 fill-emerald-50" /> : <Square size={16} />}
                              </button>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-black uppercase break-words ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                  {sub.title}
                                </p>
                                {sub.description && (
                                  <p className="text-[9px] text-slate-500 mt-0.5 font-medium whitespace-pre-wrap">{sub.description}</p>
                                )}
                                {sub.dueDate && (
                                  <span className="inline-flex items-center gap-1 text-[8px] font-black text-slate-450 uppercase mt-1">
                                    <Calendar size={10} /> Plazo: {sub.dueDate}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleDeleteSubtask(selectedTicket, sub.id)}
                              className="text-slate-350 hover:text-rose-500 p-1 rounded hover:bg-rose-50 shrink-0 ml-1.5 transition-colors"
                              title="Eliminar tarea"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ADVANCES/UPDATES TIMELINE */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                      <History className="text-indigo-600" size={18} />
                      Bitácora de Avances de Soporte
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      Historial público de comentarios y resoluciones
                    </p>
                  </div>

                  {/* ACTIVE EDIT MODE BANNER */}
                  {editingUpdateId && (
                    <div className="bg-indigo-50 border border-indigo-150 p-3 rounded-xl flex justify-between items-center text-xs text-indigo-800 font-bold uppercase tracking-wider animate-in slide-in-from-top-2 duration-200">
                      <span className="flex items-center gap-1.5 text-[10px]">
                        <Edit3 size={12} className="text-indigo-600 animate-pulse" />
                        Modo Edición: Modificando comentario seleccionado
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUpdateId(null);
                          setNewUpdateTxt('');
                          setNewUpdateDate(new Date().toISOString().split('T')[0]);
                          setNewUpdateFile(null);
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-150 text-slate-700 border border-slate-200 rounded-lg text-[9px] font-black uppercase transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {/* UPDATE FORM */}
                  <form onSubmit={handleAddTicketUpdate} className="space-y-3 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-1">
                        <label className="text-[9px] font-black text-slate-400 block uppercase tracking-wider mb-1">Fecha del Avance</label>
                        <input 
                          type="date"
                          required
                          onClick={(e) => { try { e.currentTarget.showPicker(); } catch (error) {} }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black uppercase outline-none focus:border-indigo-600 cursor-pointer shadow-inner"
                          value={newUpdateDate}
                          onChange={e => setNewUpdateDate(e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-black text-slate-400 block uppercase tracking-wider mb-1">Registro de Trabajo / Comentario</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            required
                            placeholder="ESCRIBA EL REGISTRO DE TRABAJO O AVANCE..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium outline-none focus:border-indigo-600 uppercase h-[38px] shadow-inner"
                            value={newUpdateTxt}
                            onChange={e => setNewUpdateTxt(e.target.value)}
                          />
                          <button 
                            type="submit"
                            className={`px-4 text-white font-black text-[10px] uppercase rounded-xl transition-all shadow-sm h-[38px] min-w-[90px] ${
                              editingUpdateId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                          >
                            {editingUpdateId ? 'Actualizar' : 'Registrar'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-dashed border-slate-200 flex flex-wrap items-center gap-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">¿Adjuntar Comprobante/PDF en esta nota?</span>
                      <input 
                        type="file" 
                        accept="application/pdf"
                        id="update-pdf-file"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const r = new FileReader();
                            r.onload = (event) => {
                              setNewUpdateFile({
                                name: file.name,
                                data: event.target?.result as string
                              });
                            };
                            r.readAsDataURL(file);
                          }
                        }}
                      />
                      <label 
                        htmlFor="update-pdf-file" 
                        className="px-3 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold text-[9px] uppercase rounded-lg cursor-pointer border border-slate-300 transition-all flex items-center gap-1"
                      >
                        <Upload size={10} />
                        {newUpdateFile ? 'Cambiar PDF' : 'Seleccionar PDF...'}
                      </label>
                      {newUpdateFile && (
                        <div className="flex items-center justify-between text-[10px] font-bold text-indigo-750 bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-lg max-w-sm truncate animate-in zoom-in-95 duration-150">
                          <span className="truncate flex items-center gap-1">
                            <Paperclip size={10} className="text-indigo-650 shrink-0" />
                            {newUpdateFile.name}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setNewUpdateFile(null)} 
                            className="text-rose-650 hover:text-rose-800 font-black text-[10px] ml-2"
                            title="Eliminar Adjunto"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </form>

                  {/* TIMELINE LIST */}
                  <div className="relative pl-4 space-y-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {!selectedTicket.updates || selectedTicket.updates.length === 0 ? (
                      <div className="py-4 text-center text-slate-350 text-[10px] font-bold uppercase">
                        Sin avances o notas aún
                      </div>
                    ) : (
                      selectedTicket.updates.map((update, idx) => (
                        <div key={update.id} className="relative pl-6 animate-in slide-in-from-left-2">
                          <div className={`absolute left-[-15px] top-1.5 w-2 h-2 rounded-full border-2 border-white shadow-sm transition-all ${editingUpdateId === update.id ? 'bg-emerald-500 scale-125' : 'bg-indigo-600'}`} />
                          <div className={`rounded-2xl p-4 border space-y-1 transition-all ${
                            editingUpdateId === update.id 
                              ? 'bg-indigo-50/30 border-indigo-400 shadow-md ring-1 ring-indigo-400/30' 
                              : 'bg-slate-50/50 border-slate-100'
                          }`}>
                            <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase">
                              <span>Por: {update.user}</span>
                              <div className="flex items-center gap-2">
                                <span>{update.date}</span>
                                <div className="flex items-center gap-1 ml-1.5 border-l border-slate-200 pl-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingUpdateId(update.id);
                                      setNewUpdateTxt(update.content);
                                      setNewUpdateDate(update.date);
                                      setNewUpdateFile(update.attachmentName && update.attachmentData ? { name: update.attachmentName, data: update.attachmentData } : null);
                                    }}
                                    className={`p-1 rounded transition-colors ${editingUpdateId === update.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                                    title="Editar avance / comentario"
                                  >
                                    <Edit3 size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTicketUpdate(update.id)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-650 hover:bg-rose-50 transition-colors"
                                    title="Eliminar avance / comentario"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 font-semibold leading-relaxed break-words">{update.content}</p>
                            {update.attachmentName && update.attachmentData && (
                              <div className="pt-2 flex items-center justify-between border-t border-slate-100/50 mt-1.5">
                                <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 truncate max-w-[70%]">
                                  <Paperclip size={10} className="shrink-0" />
                                  {update.attachmentName}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={update.attachmentData}
                                    download={update.attachmentName}
                                    className="text-[8.5px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 font-black uppercase flex items-center gap-1 transition-all"
                                    title="Descargar Comprobante"
                                  >
                                    <Download size={9} /> Descargar PDF
                                  </a>
                                  {/* Allow removing just the attachment if editing this item */}
                                  {editingUpdateId === update.id && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewUpdateFile(null);
                                        notify('Removiendo adjunto... Guarde los cambios para confirmar la eliminación.', 'info');
                                      }}
                                      className="text-[8.5px] text-rose-700 hover:text-rose-950 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 font-black uppercase transition-all"
                                      title="Eliminar Adjunto"
                                    >
                                      Eliminar Adjunto
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
            
            {/* FOOTER */}
            <div className="bg-white border-t border-slate-100 p-6 flex justify-end items-center shrink-0">
              <div className="flex items-center gap-3 border-none">
                <button 
                  type="button" 
                  onClick={handleSaveChanges}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 active:translate-y-0.5 transition-all shadow-md active:shadow-sm"
                >
                  Guardar Cambios
                </button>
                <button 
                  type="button" 
                  onClick={() => setSelectedTicket(null)}
                  className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-300 transition-colors"
                >
                  Cerrar Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* ERP F980011D AUDIT MASTER ATTRIBUTES INSPECTOR MODAL     */}
      {/* ======================================================= */}
      {inspectTicket && (
        <div className="fixed inset-0 z-[500] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-4xl shadow-2xl border-[6px] border-[#0B3C5D] overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-[#0B3C5D] p-5 text-white flex justify-between items-center border-b-2 border-[#FFCC00]">
              <div className="flex items-center gap-3">
                <div className="bg-[#FFCC00] text-[#0B3C5D] font-mono font-black text-[10px] px-2 py-0.5 rounded shadow">
                  F980011D
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight">Auditoría de Integridad y Consulta Maestro de Atributos</h2>
                  <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">AssetFlow Enterprise ERP Application Module Auditor</p>
                </div>
              </div>
              <button 
                onClick={() => setInspectTicket(null)} 
                className="p-1.5 hover:bg-white/10 rounded-full transition text-blue-250 hover:text-white"
              >
                <XCircle size={22}/>
              </button>
            </div>

            {/* Audit Content Grid */}
            <div className="p-6 bg-[#F4F7F9] grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
              {/* LEFT COLUMN: SYSTEM AUDITING PARAMETERS */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm select-text">
                <div className="border-b border-slate-100 pb-2 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Sistemas Adscritos</span>
                  <h3 className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-1.5">
                    <Layers size={14} className="text-[#0B3C5D]" />
                    Parámetros de Auditoría Central ERP
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px] font-sans">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 block uppercase">Código de Registro</label>
                    <span className="font-mono font-black text-slate-700">{inspectTicket.id}</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 block uppercase">Folio de Referencia</label>
                    <span className="font-mono font-black text-indigo-700">{inspectTicket.folio}</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 block uppercase">Programa Inspector</label>
                    <span className="font-bold text-slate-800">P48201 / P15012B</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 block uppercase">Workstation Origen</label>
                    <span className="font-mono font-black text-slate-600">MKEY_CH_TI_MERCED_09</span>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-slate-400 block uppercase">Sello de Tiempo de Incidencia</label>
                    <span className="font-bold text-slate-800">{new Date(inspectTicket.createdAt).toLocaleDateString('es-CL')} - {new Date(inspectTicket.createdAt).toLocaleTimeString('es-CL')}</span>
                  </div>
                  {inspectTicket.resolution && (
                    <div className="col-span-2">
                      <label className="text-[9px] font-black text-rose-600 block uppercase">Fecha de Resolución / Cierre Registrada</label>
                      <span className="font-bold text-rose-750">
                        {new Date(inspectTicket.resolution + 'T12:00:00Z').toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-slate-400 block uppercase">Operador Responsable Creador</label>
                    <span className="font-black text-slate-700 uppercase">{inspectTicket.userCreator || 'SISTEMA'}</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 block uppercase">Nivel de Bloqueo de Folicación</label>
                    <span className="text-xs font-black text-emerald-600 uppercase">REGISTRO LIBRE NO COMBATIDO</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 block uppercase">Canal Sindicado</label>
                    <span className="font-bold text-slate-800 uppercase">ASSETFLOW_INTRANET</span>
                  </div>
                </div>

                {/* SHA Checksum box */}
                <div className="bg-[#F0F4F8] p-3 rounded-lg border border-slate-200 font-mono text-[10px] space-y-1">
                  <span className="text-[8px] font-black text-slate-400 block uppercase">Firma de Integridad Checksum SHA-256</span>
                  <div className="text-slate-600 break-all font-black select-all">
                    HEX: {`77A4CD391B32${inspectTicket.folio?.replace('-', '')}0FA12590`.padEnd(64, 'E').substring(0, 64).toUpperCase()}
                  </div>
                </div>

                {/* Subtask KPI */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex justify-between items-center">
                  <div>
                    <span className="block text-[8px] font-black text-[#0B3C5D] uppercase">SLA de Subtareas Internas</span>
                    <strong className="text-sm font-black text-slate-800">
                      {inspectTicket.subtasks?.filter(s => s.status === 'FINALIZADA').length || 0} de {inspectTicket.subtasks?.length || 0} completas
                    </strong>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700 uppercase">
                    {calculatePercent(inspectTicket.subtasks || [])}% KPI
                  </span>
                </div>
              </div>

              {/* RIGHT COLUMN: RECOGNIZED MASTER TABLES LOOKUP */}
              <div className="space-y-4">
                {/* 1. Address Book lookup (Solicitante) */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
                  <div className="border-b border-slate-100 pb-1.5 flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                      <User size={14} className="text-indigo-600" />
                      F0101 Maestro Solicitante (Address Book)
                    </h4>
                    <span className="text-[8px] font-mono font-black text-slate-400 uppercase">Base: AssetFlow_Pers_F0101</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">Nombre de Referencia</span>
                      <strong className="text-slate-800 uppercase block">{inspectTicket.requester}</strong>
                    </div>
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">RUT / Identificador Tributario</span>
                      <strong className="text-slate-700 block font-mono">
                        {generateRut(inspectTicket.requester || 'Anonimo')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">Unidad Orgánica Central</span>
                      <span className="text-slate-600 block">Departamentos de Operaciones Mutuaria</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">Canal de Configuración</span>
                      <span className="text-emerald-700 font-bold block">ASSETFLOW COMMON MEMBER</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">Correo Electrónico de Contacto</span>
                      <span className="text-blue-600 font-mono hover:underline">{inspectTicket.requester?.toLowerCase().replace(/\s+/g, '') || 'usuario'}@inmobiliariapro.cl</span>
                    </div>
                  </div>
                </div>

                {/* 2. Vendor / Special Assigned Service */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
                  <div className="border-b border-slate-100 pb-1.5 flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                      <Briefcase size={14} className="text-amber-600" />
                      F0401 Perfil Técnico Soporte (Vendor Directory)
                    </h4>
                    <span className="text-[8px] font-mono font-black text-slate-400 uppercase">Base: AssetFlow_Vend_F0401</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">Técnico TI Responsable</span>
                      <strong className="text-slate-800 uppercase block">{inspectTicket.assignedTo || '- SIN ASIGNAR EN ESTE FOLIO -'}</strong>
                    </div>
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">Nivel de Soporte</span>
                      <span className="text-slate-600 block">
                        {inspectTicket.assignedTo ? 'Especialista TI Nivel II' : 'Ingeniero de Guardia General'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">Estado Disponibilidad</span>
                      <span className="text-emerald-600 font-bold block">● ONLINE / DISPONIBLE</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">SLA Activo Operando</span>
                      <span className="text-indigo-605 font-bold block">3 tickets en cola</span>
                    </div>
                  </div>
                </div>

                {/* 3. SLA parameters lookup */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
                  <div className="border-b border-slate-100 pb-1.5 flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-rose-600" />
                      F48011 Parámetros de Acuerdos de Niveles de Servicio (SLA)
                    </h4>
                    <span className="text-[8px] font-mono font-black text-slate-400 uppercase">Norma: SLA_TI_ASSETFLOW_V4</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">Resolución Límite Comprometido</span>
                      <strong className="text-rose-700 uppercase block">{getSLATime(inspectTicket.priority)}</strong>
                    </div>
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">Rango de Escalamiento</span>
                      <span className="text-slate-600 block">
                        {inspectTicket.priority === 'CRÍTICA' ? 'Soporte Nivel III + Supervisor' : 'Asignación Estándar Nivel I/II'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">Supervisión Notificada</span>
                      <span className="text-slate-800 block">control.interno@inmobiliariapro.cl</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] font-black text-slate-400 uppercase block">Validación de Desvío SLA</span>
                      <span className="text-emerald-700 font-mono font-bold block">0 DESVIACIONES REGISTRADAS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="bg-[#EDEDED] border-t border-slate-200 p-4 shrink-0 flex justify-end gap-3.5 shadow-inner">
              <button 
                type="button"
                onClick={() => {
                  setInspectTicket(null);
                  setSelectedTicket(inspectTicket);
                }}
                className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border border-indigo-200 rounded font-black text-[10px] uppercase tracking-wider transition"
                title="Abrir panel detallado de subtareas y actualizaciones de este ticket"
              >
                Ir a Bitácora / Subtareas
              </button>
              <button 
                type="button" 
                onClick={() => setInspectTicket(null)}
                className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded font-black text-[10px] uppercase tracking-wider transition shadow"
              >
                Cerrar Visio de Auditoría
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* ERP CONTEXT MENU (RIGHT CLICK)                          */}
      {/* ======================================================= */}
      {contextMenu && (
        <div 
          className="fixed z-[999] bg-white border-2 border-[#0B3C5D] shadow-xl rounded-lg py-1.5 min-w-[245px] text-xs font-sans text-slate-800 animate-in fade-in zoom-in-95 duration-100 select-none"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header/Title resembling a ERP Row Action */}
          <div className="bg-[#0B3C5D] px-3 py-1 mb-1.5 text-[9px] font-black uppercase text-[#FFCC00] tracking-widest flex justify-between items-center border-b border-[#FFCC00]">
            <span>Menú de Fila - ERP V2.0</span>
            <span className="font-mono bg-white/20 px-1 rounded text-white">{contextMenu.ticket.folio}</span>
          </div>

          {/* Option: Consultar Bitácora */}
          <button
            onClick={() => {
              setSelectedTicket(contextMenu.ticket);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-indigo-50 text-slate-750 font-bold transition-all text-[11px]"
          >
            <ClipboardList size={14} className="text-[#0B3C5D]" />
            <span>Consultar Bitácora y Avances</span>
          </button>

          {/* Option: Inspector F980511D */}
          <button
            onClick={() => {
              setInspectTicket(contextMenu.ticket);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#EAF3FC] text-slate-750 font-bold transition-all text-[11px]"
          >
            <ShieldCheck size={14} className="text-[#0B3C5D]" />
            <span>Examinar Atributos (F980011D)</span>
          </button>

          {/* Option: Editar */}
          <button
            onClick={() => {
              const t = contextMenu.ticket;
              setEditingTicket(t);
              setFormData({
                title: t.title,
                description: t.description,
                category: t.category,
                priority: t.priority,
                status: t.status,
                assignedTo: t.assignedTo || '',
                requester: t.requester || '',
                createdAt: t.createdAt.split('T')[0]
              });
              setIsFormOpen(true);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-amber-50 text-slate-750 font-bold transition-all text-[11px]"
          >
            <Edit3 size={14} className="text-amber-600" />
            <span>Editar Propiedades Generales</span>
          </button>

          <div className="border-t border-slate-100 my-1"></div>

          {/* Option: Eliminar */}
          <button
            onClick={() => {
              if (window.confirm('¿Está absolutamente seguro de eliminar permanentemente esta orden de soporte/ticket?')) {
                onDelete(contextMenu.ticket.id);
                notify('Ticket / orden de soporte eliminado exitosamente', 'success');
                setContextMenu(null);
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-rose-50 text-rose-600 font-extrabold transition-all text-[11px]"
          >
            <Trash2 size={14} className="text-rose-600" />
            <span>Eliminar Registro Permanente</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default HelpDeskCenter;
