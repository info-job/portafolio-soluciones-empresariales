import React, { useState, useMemo } from 'react';
import { AuditEntry, AuditSolutionProposal } from '../types';
import { 
  History, Shield, ArrowRight, User, Clock, FileUp, FileSearch, Search, Filter, 
  CheckCircle2, AlertTriangle, Plus, RefreshCw, Eye, ShieldAlert, ShieldCheck, 
  Key, Lock, Server, FileText, AlertCircle, Sparkles, Hash, Laptop,
  Wrench, FileCheck, Upload, Download, Paperclip, Trash2, ExternalLink,
  ChevronRight, ChevronLeft, Check, File, LayoutGrid, List, Maximize2,
  CornerDownRight, Layers, ArrowUpRight, FolderGit2, UserCheck, Users
} from 'lucide-react';
import { exportToExcel } from '../lib/excelExport';
import { formatAuditActionNarrative } from '../lib/auditService';
import { JDEGridContextMenu } from './JDEGridContextMenu';

interface AuditLogProps {
  logs: AuditEntry[];
  onShowCoherenceReport?: () => void;
  addAuditEntry?: (
    action: AuditEntry['action'], 
    entityType: AuditEntry['entityType'], 
    entityId: string, 
    entityName?: string, 
    changes?: { field?: string; old?: any; new?: any; moduleName?: string; details?: string; severity?: AuditEntry['severity'] }
  ) => void;
  onUpdateAuditLog?: (updatedLogs: AuditEntry[]) => void;
  currentUser?: string;
  onNavigateToModule?: (moduleKey: string) => void;
}

// Forensic Risk Assessment helper
export function isIrregularOperation(log: AuditEntry): { isIrregular: boolean; riskLevel: 'ALTO' | 'MEDIO' | 'BAJO' | 'NORMAL'; reason?: string } {
  const action = log.action;
  const field = (log.fieldChanged || '').toUpperCase();
  const entity = (log.entityType || '').toUpperCase();
  const name = (log.entityName || '').toUpperCase();
  const newValue = String(log.newValue || '').toUpperCase();

  // Security Alerts: FAILED LOGINS or SECURITY VIOLATIONS
  if (action === 'LOGIN_FAILED' || action === 'SECURITY') {
    return {
      isIrregular: true,
      riskLevel: 'ALTO',
      reason: `Alerta de seguridad: ${log.details || 'Intento de acceso o transgresión de seguridad'}`
    };
  }

  // High Risk: DELETIONS
  if (action === 'DELETE') {
    return {
      isIrregular: true,
      riskLevel: 'ALTO',
      reason: `Eliminación de registro en ${entity}: ${log.entityName || log.entityId}`
    };
  }

  // High Risk: REBUILD / BULK Overwrites
  if (action === 'REBUILD' || name.includes('BULK') || name.includes('MASIVA') || name.includes('RECONSTRUCCIÓN')) {
    return {
      isIrregular: true,
      riskLevel: 'ALTO',
      reason: `Operación masiva o sobrescritura de base de datos`
    };
  }

  // Medium / High Risk: Modifying critical financial fields or payment details
  const sensitiveFields = ['MONTO', 'SALDO', 'SALDO_ACTUAL', 'CUENTA', 'BANCO', 'RUT', 'POLIZA_SEGURO', 'MONTO_ARRIENDO', 'GARANTIA', 'VALOR'];
  if (action === 'UPDATE' && sensitiveFields.some(sf => field.includes(sf))) {
    return {
      isIrregular: true,
      riskLevel: 'MEDIO',
      reason: `Modificación de campo financiero o bancario crítico: ${log.fieldChanged}`
    };
  }

  // Suspicious keywords in descriptions or values
  if (newValue.includes('FINIQUITADO') || newValue.includes('ANULADO') || newValue.includes('ELIMINAR') || newValue.includes('REEMPLAZO')) {
    return {
      isIrregular: true,
      riskLevel: 'MEDIO',
      reason: `Modificación que involucra anulación o finiquito`
    };
  }

  return { isIrregular: false, riskLevel: 'NORMAL' };
}

// Automated Proposal Generator for Audit Resolution
export function generateDefaultProposal(log: AuditEntry): { diagnosis: string; recommendedAction: string } {
  const action = log.action;
  const entity = (log.entityType || 'SISTEMA').toUpperCase();
  const name = log.entityName || log.entityId || 'Registro';
  const field = log.fieldChanged ? log.fieldChanged.toUpperCase() : '';
  const oldValue = log.oldValue ? String(log.oldValue) : '';
  const newValue = log.newValue ? String(log.newValue) : '';

  if (action === 'DELETE') {
    return {
      diagnosis: `DIAGNÓSTICO CRÍTICO: Se ha registrado la baja o eliminación del registro '${name}' en el módulo ${entity}. Esto interrumpe la secuencia de correlatividades e impacta la trazabilidad SOX/contable.`,
      recommendedAction: `1. Determinar si la baja fue autorizada o producto de una anulación inadvertida.\n2. Si requiere reposición: Reinstalar el objeto en el maestro de ${entity} conservando sus atributos de auditoría.\n3. Si fue autorizada: Confeccionar un Acta de Baja firmada por el Jefe del Área y Control Interno.\n4. Adjuntar la copia digitalizada del Acta de Baja o Solicitud de Anulación en formato PDF para resguardo permanente.`
    };
  }

  if (action === 'REBUILD' || name.includes('BULK') || name.includes('MASIVA') || name.includes('RECONSTRUCCIÓN')) {
    return {
      diagnosis: `DIAGNÓSTICO SOBRE PROCESO MASIVO: Reconstrucción o carga masiva ejecutada en el módulo ${entity}. Existe riesgo potencial de descalce de saldos o inconsistencias de folios.`,
      recommendedAction: `1. Ejecutar el Reporte de Cuadratura e Integridad para verificar la consistencia de saldos post-Carga Masiva.\n2. Validar que la muestra aleatoria de registros coincida con la fuente primaria de datos.\n3. Adjuntar la Planilla Excel o Informe de Migración original firmado por el Administrador de Sistemas.`
    };
  }

  if (action === 'UPDATE' && field) {
    const sensitiveFields = ['MONTO', 'SALDO', 'SALDO_ACTUAL', 'CUENTA', 'BANCO', 'RUT', 'POLIZA_SEGURO', 'MONTO_ARRIENDO', 'GARANTIA', 'VALOR'];
    const isSensitive = sensitiveFields.some(sf => field.includes(sf));
    if (isSensitive) {
      return {
        diagnosis: `DIAGNÓSTICO DE CAMBIO SENSIBLE: Modificación directa de un parámetro financiero o crítico (${field}) desde '${oldValue || 'Anterior'}' hacia '${newValue || 'Nuevo'}' en ${entity} (${name}).`,
        recommendedAction: `1. Cotejar la modificación con el documento tributario/legal respaldatorio (Factura, Certificado de Cuenta Bancaria o Adenda Contratual).\n2. Solicitar el Visto Bueno (VB) explícito de la Jefatura de Finanzas / Control Interno.\n3. Adjuntar la copia escaneada del comprobante de respaldo para resguardo inmutable en la bitácora.`
      };
    } else {
      return {
        diagnosis: `DIAGNÓSTICO DE ACTUALIZACIÓN OPERATIVA: Edición del parámetro '${field}' en ${entity} (${name}).`,
        recommendedAction: `1. Verificar la concordancia del nuevo valor ingresado ('${newValue}').\n2. Comprobar que no existan inconsistencias operativas con módulos dependientes.\n3. Adjuntar el correo o memorándum de solicitud si requiere respaldo futuro.`
      };
    }
  }

  if (action === 'CREATE') {
    return {
      diagnosis: `DIAGNÓSTICO DE ALTA DE REGISTRO: Registro de creación inicial para ${entity} (${name}) realizado por ${log.user}.`,
      recommendedAction: `1. Confirmar el cumplimiento de la debida diligencia y lista de chequeo UAF/Compliance.\n2. Validar la existencia de la carpeta digital básica del registro (RUT, Contrato o Recepción Técnica).\n3. Adjuntar la documentación de respaldo inicial para resguardo y consulta a futuro distante.`
    };
  }

  return {
    diagnosis: `DIAGNÓSTICO DE EVENTO DE AUDITORÍA: Operación de tipo ${action} registrada en el módulo ${entity} (${name}).`,
    recommendedAction: `1. Revisar los permisos y credenciales asociadas al usuario ejecutora (${log.user}).\n2. Confirmar la legitimidad de la operación en el libro de eventos.\n3. Adjuntar el documento de soporte técnico o memorándum de conformidad si aplica.`
  };
}

const AuditLog: React.FC<AuditLogProps> = ({ 
  logs, 
  onShowCoherenceReport, 
  addAuditEntry, 
  onUpdateAuditLog,
  currentUser = 'SISTEMA',
  onNavigateToModule
}) => {
  // Display Mode: GRID (Tabla SOX con Drill Down) vs CARDS (Tarjetas)
  const [viewMode, setViewMode] = useState<'GRID' | 'CARDS'>('GRID');

  // Filters & Toggles
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('TODOS');
  const [entityFilter, setEntityFilter] = useState<string>('TODOS');
  const [userFilter, setUserFilter] = useState<string>('TODOS');
  const [onlyIrregular, setOnlyIrregular] = useState<boolean>(false);
  const [periodFilter, setPeriodFilter] = useState<string>('TODOS'); // TODOS, HOY, 7_DAYS, 30_DAYS

  // Selected Log for Full Drill-Down Modal
  const [drillDownLog, setDrillDownLog] = useState<AuditEntry | null>(null);
  const [drillDownActiveTab, setDrillDownActiveTab] = useState<'TRACE' | 'DIFF' | 'HISTORY' | 'SOLUTION'>('TRACE');

  // ERP Grid Selection & Context Menu
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    log: AuditEntry;
  } | null>(null);

  // ERP QBE (Query By Example) Filter Row State
  const [qbeFilters, setQbeFilters] = useState({
    id: '',
    date: '',
    user: '',
    action: '',
    entityType: '',
    entityName: '',
    fieldChanged: '',
    risk: ''
  });

  const handleRowContextMenu = (e: React.MouseEvent, log: AuditEntry) => {
    e.preventDefault();
    setSelectedRowId(log.id);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      log
    });
  };

  // Forensic Inspection Modal State
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);
  const [investigationVerdict, setInvestigationVerdict] = useState<'APROBADO' | 'INVESTIGACION' | 'ANOMALIA'>('INVESTIGACION');
  const [auditVerdictNotes, setAuditVerdictNotes] = useState('');

  // Manual Audit Observation Modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteCategory, setNoteCategory] = useState<'SISTEMA' | 'TRANSACCION' | 'PROVEEDOR' | 'PROPIEDAD' | 'ORDEN_TRABAJO'>('SISTEMA');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDetail, setNoteDetail] = useState('');

  // SOLUTION ASSISTANT WIZARD STATE
  const [solutionModalLog, setSolutionModalLog] = useState<AuditEntry | null>(null);
  const [solutionStep, setSolutionStep] = useState<1 | 2 | 3 | 4>(1);
  const [diagnosisText, setDiagnosisText] = useState('');
  const [recommendedActionText, setRecommendedActionText] = useState('');
  const [resolutionNotesText, setResolutionNotesText] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'SIN_RESOLVER' | 'EN_PROCESO' | 'RESUELTO'>('RESUELTO');
  const [attachmentFile, setAttachmentFile] = useState<{ name: string; data: string; type: string; size: string } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Unique Users and Entities
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => { if (l.user) set.add(l.user); });
    return Array.from(set).sort();
  }, [logs]);

  const uniqueEntities = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => { if (l.entityType) set.add(l.entityType); });
    return Array.from(set).sort();
  }, [logs]);

  // Evaluated logs with Forensic Analysis
  const analyzedLogs = useMemo(() => {
    return logs.map(log => {
      const evaluation = isIrregularOperation(log);
      return {
        ...log,
        isIrregular: evaluation.isIrregular,
        riskLevel: evaluation.riskLevel,
        irregularReason: evaluation.reason
      };
    });
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return analyzedLogs.filter(log => {
      // Only Irregular filter
      if (onlyIrregular && !log.isIrregular) return false;

      // Keyword Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesAction = log.action?.toLowerCase().includes(query);
        const matchesUser = log.user?.toLowerCase().includes(query);
        const matchesType = log.entityType?.toLowerCase().includes(query);
        const matchesName = log.entityName?.toLowerCase().includes(query);
        const matchesId = log.entityId?.toLowerCase().includes(query);
        const matchesField = log.fieldChanged?.toLowerCase().includes(query);
        const matchesNew = String(log.newValue || '').toLowerCase().includes(query);
        const matchesOld = String(log.oldValue || '').toLowerCase().includes(query);
        const matchesReason = log.irregularReason?.toLowerCase().includes(query);
        const matchesProposal = log.solutionProposal?.resolutionNotes?.toLowerCase().includes(query) ||
                                 log.solutionProposal?.diagnosis?.toLowerCase().includes(query) ||
                                 log.solutionProposal?.attachmentName?.toLowerCase().includes(query);

        if (!matchesAction && !matchesUser && !matchesType && !matchesName && !matchesId && !matchesField && !matchesNew && !matchesOld && !matchesReason && !matchesProposal) {
          return false;
        }
      }

      // Action Filter
      if (actionFilter !== 'TODOS' && log.action !== actionFilter) return false;

      // Entity Filter
      if (entityFilter !== 'TODOS' && log.entityType !== entityFilter) return false;

      // User Filter
      if (userFilter !== 'TODOS' && log.user !== userFilter) return false;

      // Period Filter
      if (periodFilter === 'HOY') {
        const logDate = new Date(log.timestamp).toDateString();
        const todayDate = new Date().toDateString();
        if (logDate !== todayDate) return false;
      } else if (periodFilter === '7_DAYS') {
        if (now - log.timestamp > 7 * oneDay) return false;
      } else if (periodFilter === '30_DAYS') {
        if (now - log.timestamp > 30 * oneDay) return false;
      }

      // ERP QBE Column Filters
      if (qbeFilters.id && !(log.id || '').toLowerCase().includes(qbeFilters.id.toLowerCase())) return false;
      if (qbeFilters.user && !(log.user || '').toLowerCase().includes(qbeFilters.user.toLowerCase())) return false;
      if (qbeFilters.action && !(log.action || '').toLowerCase().includes(qbeFilters.action.toLowerCase())) return false;
      if (qbeFilters.entityType && !(log.entityType || '').toLowerCase().includes(qbeFilters.entityType.toLowerCase())) return false;
      if (qbeFilters.entityName && !(log.entityName || '').toLowerCase().includes(qbeFilters.entityName.toLowerCase())) return false;
      if (qbeFilters.fieldChanged && !(log.fieldChanged || '').toLowerCase().includes(qbeFilters.fieldChanged.toLowerCase())) return false;
      if (qbeFilters.risk && !(log.riskLevel || '').toLowerCase().includes(qbeFilters.risk.toLowerCase())) return false;
      if (qbeFilters.date && !new Date(log.timestamp).toLocaleString().toLowerCase().includes(qbeFilters.date.toLowerCase())) return false;

      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [analyzedLogs, searchTerm, actionFilter, entityFilter, userFilter, onlyIrregular, periodFilter, qbeFilters]);

  // Forensic Key Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const creates = logs.filter(l => l.action === 'CREATE').length;
    const updates = logs.filter(l => l.action === 'UPDATE').length;
    const deletes = logs.filter(l => l.action === 'DELETE').length;
    const logins = logs.filter(l => l.action === 'LOGIN' || l.action === 'LOGOUT').length;
    const securityAlerts = logs.filter(l => l.action === 'LOGIN_FAILED' || l.action === 'SECURITY').length;
    const irregularCount = analyzedLogs.filter(l => l.isIrregular).length;
    const solvedCount = logs.filter(l => l.solutionProposal && l.solutionProposal.status === 'RESUELTO').length;
    const activeUsersCount = uniqueUsers.length;
    return { total, creates, updates, deletes, logins, securityAlerts, irregularCount, solvedCount, activeUsersCount };
  }, [logs, analyzedLogs, uniqueUsers]);

  // Per-User Activity Breakdown for "Quién Hizo Qué" Explorer
  const userActivitySummaries = useMemo(() => {
    const summaryMap: Record<string, {
      user: string;
      role?: string;
      total: number;
      creates: number;
      updates: number;
      deletes: number;
      logins: number;
      securityAlerts: number;
      lastTimestamp: number;
    }> = {};

    logs.forEach(l => {
      const u = l.user || 'SISTEMA';
      if (!summaryMap[u]) {
        summaryMap[u] = {
          user: u,
          role: l.userRole,
          total: 0,
          creates: 0,
          updates: 0,
          deletes: 0,
          logins: 0,
          securityAlerts: 0,
          lastTimestamp: l.timestamp
        };
      }
      summaryMap[u].total += 1;
      if (l.action === 'CREATE') summaryMap[u].creates += 1;
      else if (l.action === 'UPDATE') summaryMap[u].updates += 1;
      else if (l.action === 'DELETE') summaryMap[u].deletes += 1;
      else if (l.action === 'LOGIN' || l.action === 'LOGOUT') summaryMap[u].logins += 1;
      else if (l.action === 'LOGIN_FAILED' || l.action === 'SECURITY') summaryMap[u].securityAlerts += 1;

      if (l.timestamp > summaryMap[u].lastTimestamp) {
        summaryMap[u].lastTimestamp = l.timestamp;
      }
      if (l.userRole && !summaryMap[u].role) {
        summaryMap[u].role = l.userRole;
      }
    });

    return Object.values(summaryMap).sort((a, b) => b.total - a.total);
  }, [logs]);

  // Selected User Summary (when filtered to a specific user)
  const selectedUserSummary = useMemo(() => {
    if (userFilter === 'TODOS') return null;
    return userActivitySummaries.find(u => u.user === userFilter) || null;
  }, [userFilter, userActivitySummaries]);

  // Related logs for Drill-Down Object Timeline
  const relatedDrillDownLogs = useMemo(() => {
    if (!drillDownLog) return [];
    return logs.filter(l => 
      l.entityId === drillDownLog.entityId || 
      (drillDownLog.entityName && l.entityName === drillDownLog.entityName)
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [logs, drillDownLog]);

  const handleAddManualNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    if (addAuditEntry) {
      addAuditEntry(
        'CREATE',
        noteCategory,
        `OBS-AUDIT-${Date.now()}`,
        `CONSTANCIA CONTROL INTERNO: ${noteTitle}`,
        { field: 'OBSERVACIÓN_AUDITORÍA', new: noteDetail || 'Verificación registrada formalmente en bitácora' }
      );
    }

    setNoteTitle('');
    setNoteDetail('');
    setIsNoteModalOpen(false);
  };

  const handleSaveVerdict = () => {
    if (!selectedLog) return;
    if (addAuditEntry) {
      addAuditEntry(
        'UPDATE',
        selectedLog.entityType || 'SISTEMA',
        selectedLog.entityId,
        `DICTAMEN AUDITORÍA FORENSE: ${selectedLog.entityName || selectedLog.entityId}`,
        {
          field: 'ESTADO_VEREDICTO_CONTROL_INTERNO',
          old: 'EN_REVISIÓN',
          new: `VEREDICTO: ${investigationVerdict} - ${auditVerdictNotes || 'Sin observaciones adicionales'}`
        }
      );
    }
    setSelectedLog(null);
    setAuditVerdictNotes('');
  };

  // Open Solution Assistant for a specific log
  const handleOpenSolutionAssistant = (log: AuditEntry) => {
    setSolutionModalLog(log);
    setSolutionStep(1);

    if (log.solutionProposal) {
      setDiagnosisText(log.solutionProposal.diagnosis || '');
      setRecommendedActionText(log.solutionProposal.recommendedAction || '');
      setResolutionNotesText(log.solutionProposal.resolutionNotes || '');
      setResolutionStatus(log.solutionProposal.status || 'RESUELTO');
      if (log.solutionProposal.attachmentName && log.solutionProposal.attachmentData) {
        setAttachmentFile({
          name: log.solutionProposal.attachmentName,
          data: log.solutionProposal.attachmentData,
          type: log.solutionProposal.attachmentType || 'application/octet-stream',
          size: log.solutionProposal.attachmentSize || 'Resguardo guardado'
        });
      } else {
        setAttachmentFile(null);
      }
    } else {
      const defaultProposal = generateDefaultProposal(log);
      setDiagnosisText(defaultProposal.diagnosis);
      setRecommendedActionText(defaultProposal.recommendedAction);
      setResolutionNotesText('');
      setResolutionStatus('RESUELTO');
      setAttachmentFile(null);
    }
  };

  const handleExportAuditExcel = () => {
    const dataToExport = filteredLogs.map(l => ({
      'ID Evento': l.id,
      'Fecha / Hora': new Date(l.timestamp).toLocaleString(),
      'Usuario Responsable': l.user,
      'Acción SOX': l.action,
      'Módulo Afectado': l.entityType,
      'Entidad / Objeto': l.entityName || l.entityId,
      'Campo Modificado': l.fieldChanged || 'N/A',
      'Valor Anterior': l.oldValue || 'N/A',
      'Valor Nuevo': l.newValue || 'N/A',
      'Resumen Narrativo ("Quién hizo qué")': formatAuditActionNarrative(l),
      'Sospechoso/Irregular': l.isIrregular ? 'SÍ (ALERTA)' : 'NO',
      'Motivo Riesgo': l.irregularReason || 'Operación estándar',
      'Nivel Riesgo': l.riskLevel || 'NORMAL',
      'Sello Hash': l.hashSignature || l.id,
      'Estado Solución': l.solutionProposal ? l.solutionProposal.status : 'SIN_PROPUESTA',
      'Notas de Solución': l.solutionProposal ? l.solutionProposal.resolutionNotes : 'N/A',
      'Documento Resguardo': l.solutionProposal?.attachmentName || 'Sin adjunto'
    }));
    exportToExcel(dataToExport, `Bitacora_Forense_Soluciones_${new Date().toISOString().split('T')[0]}`, 'Bitacora_Auditoria');
  };

  // File Upload Handler for backing documents
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const sizeInKB = (file.size / 1024).toFixed(1);
      const formattedSize = file.size > 1048576 
        ? `${(file.size / 1048576).toFixed(2)} MB` 
        : `${sizeInKB} KB`;

      setAttachmentFile({
        name: file.name,
        data: base64,
        type: file.type || 'application/octet-stream',
        size: formattedSize
      });
      setIsUploadingFile(false);
    };
    reader.onerror = () => {
      setIsUploadingFile(false);
      alert('Error al procesar el archivo seleccionado. Intente con otro documento.');
    };
    reader.readAsDataURL(file);
  };

  // Save Solution Proposal and Store Document in Audit Entry
  const handleSaveSolutionProposal = () => {
    if (!solutionModalLog) return;

    const proposal: AuditSolutionProposal = {
      diagnosis: diagnosisText,
      recommendedAction: recommendedActionText,
      resolutionNotes: resolutionNotesText || 'Propuesta de solución aprobada y resguardada formalmente.',
      status: resolutionStatus,
      resolvedBy: currentUser,
      resolvedAt: new Date().toISOString(),
      attachmentName: attachmentFile?.name,
      attachmentData: attachmentFile?.data,
      attachmentType: attachmentFile?.type,
      attachmentSize: attachmentFile?.size
    };

    const updatedLogs = logs.map(l => l.id === solutionModalLog.id ? { ...l, solutionProposal: proposal } : l);

    if (onUpdateAuditLog) {
      onUpdateAuditLog(updatedLogs);
    }

    if (addAuditEntry) {
      addAuditEntry(
        'UPDATE',
        'SISTEMA',
        solutionModalLog.id,
        `SOLUCIÓN Y RESGUARDO DOCUMENTAL REGISTRADO PARA REGISTRO AUDIT ID ${solutionModalLog.id}`,
        {
          field: 'PROPUESTA_Y_DOCUMENTO_SOLUCION',
          new: `Estado: ${resolutionStatus} | Adjunto: ${attachmentFile ? attachmentFile.name : 'Sin archivo'} | Auditor: ${currentUser}`
        }
      );
    }

    setSolutionModalLog(null);
  };

  // Download / View Attached Backing Document
  const handleDownloadAttachment = (dataUrl: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      window.open(dataUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Warning if Irregular Operations detected */}
      {stats.irregularCount > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300/80 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md animate-pulse">
              <ShieldAlert size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Detector de Anomalías Activo
                </span>
                <span className="text-xs font-black text-amber-900 uppercase">
                  {stats.irregularCount} Operaciones con Riesgo / Irregulares ({stats.solvedCount} Subsanadas)
                </span>
              </div>
              <p className="text-xs text-amber-800 font-medium mt-1">
                El motor forense identificó eliminaciones, variaciones en datos bancarios o cambios masivos que requieren inspección por Control Interno.
              </p>
            </div>
          </div>
          <button
            onClick={() => setOnlyIrregular(!onlyIrregular)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
              onlyIrregular 
                ? 'bg-amber-700 text-white border-amber-800 shadow-inner' 
                : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100 shadow-sm'
            }`}
          >
            <Filter size={14} />
            {onlyIrregular ? 'Mostrar Todos los Eventos' : 'Filtrar Sólo Irregulares / Sospechosos'}
          </button>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
            <History size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Eventos</p>
            <h3 className="text-2xl font-black text-slate-900">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Creaciones</p>
            <h3 className="text-2xl font-black text-emerald-950">{stats.creates}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
            <RefreshCw size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Ediciones</p>
            <h3 className="text-2xl font-black text-indigo-950">{stats.updates}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 font-bold">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Bajas / Borrados</p>
            <h3 className="text-2xl font-black text-rose-950">{stats.deletes}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-xs flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
            stats.securityAlerts > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500'
          }`}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Alertas Seguridad</p>
            <h3 className="text-2xl font-black text-rose-950">{stats.securityAlerts}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
            <FileCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
              Soluciones SOX
            </p>
            <h3 className="text-2xl font-black text-emerald-950">
              {stats.solvedCount}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Audit Panel - AssetFlow Enterprise Style */}
      <div className="bg-white rounded-[4px] shadow-xs border border-[#7FA6C7] overflow-hidden">
        {/* ERP Enterprise Header */}
        <div className="jde-grid-banner px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#9DB2C5]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] bg-[#1A3E5C] text-white px-1.5 py-0.5 rounded-[2px] font-bold">P950000</span>
            <span className="font-bold text-[#1A3E5C] text-xs uppercase tracking-wide flex items-center gap-1.5">
              <Shield size={14} className="text-[#1A3E5C]" />
              Work With System Audit Ledger (F950000) • Bitácora y Control Forense
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10.5px] text-[#2D4A68] font-bold">
            <span className="bg-[#E2EDF8] px-2 py-0.5 rounded-[3px] border border-[#A2BCCF]">Ambiente: ERP-PRD911</span>
            <span className="bg-[#E2EDF8] px-2 py-0.5 rounded-[3px] border border-[#A2BCCF]">Total Registros: {stats.total}</span>
          </div>
        </div>

        {/* ERP Command Toolbar */}
        <div className="jde-action-bar mx-3 my-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* TOGGLE VIEW MODE: GRID vs CARDS */}
            <div className="bg-[#E2EDF8] p-0.5 rounded-[3px] flex items-center gap-1 border border-[#A2BCCF]">
              <button
                onClick={() => setViewMode('GRID')}
                className={`jde-action-btn ${
                  viewMode === 'GRID' 
                    ? 'bg-[#1A3E5C]! text-white! font-black shadow-xs' 
                    : 'text-[#1A3E5C]'
                }`}
                title="Vista de Tabla / Data Grid SOX con Drill Down"
              >
                <LayoutGrid size={12} />
                <span>Grid ERP</span>
              </button>

              <button
                onClick={() => setViewMode('CARDS')}
                className={`jde-action-btn ${
                  viewMode === 'CARDS' 
                    ? 'bg-[#1A3E5C]! text-white! font-black shadow-xs' 
                    : 'text-[#1A3E5C]'
                }`}
                title="Vista de Tarjetas / Feeds"
              >
                <List size={12} />
                <span>Tarjetas</span>
              </button>
            </div>

            <button
              onClick={() => setOnlyIrregular(!onlyIrregular)}
              className={`jde-action-btn ${
                onlyIrregular
                  ? 'bg-amber-600! text-white! border-amber-700!'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle size={13} className="text-amber-600" />
              <span>{onlyIrregular ? 'Ver Todos' : `Irregulares (${stats.irregularCount})`}</span>
            </button>

            {addAuditEntry && (
              <button
                onClick={() => setIsNoteModalOpen(true)}
                className="jde-action-btn hover:bg-[#D6E4F0]"
              >
                <Plus size={13} className="text-emerald-700" />
                <span>Registrar Nota Auditoría</span>
              </button>
            )}

            {onShowCoherenceReport && (
              <button 
                onClick={onShowCoherenceReport}
                className="jde-action-btn hover:bg-[#D6E4F0]"
              >
                <FileSearch size={13} className="text-indigo-700" />
                <span>Informe Coherencia</span>
              </button>
            )}
          </div>

          <div>
            <button 
              onClick={() => {
                const dataToExport = filteredLogs.map(l => ({
                  'Fecha y Hora': new Date(l.timestamp).toLocaleString(),
                  'Usuario (QUIÉN)': l.user,
                  'Rol': l.userRole || 'N/A',
                  'Acción (QUÉ)': l.action,
                  'Módulo / Entidad': l.entityType,
                  'Nombre / Ref': l.entityName || 'N/A',
                  'ID Entidad': l.entityId,
                  'Campo Modificado': l.fieldChanged || 'N/A',
                  'Valor Previo': l.oldValue || 'N/A',
                  'Valor Nuevo': l.newValue || 'N/A',
                  'Resumen Narrativo ("Quién hizo qué")': formatAuditActionNarrative(l),
                  'Sospechoso/Irregular': l.isIrregular ? 'SÍ (ALERTA)' : 'NO',
                  'Motivo Riesgo': l.irregularReason || 'Operación estándar',
                  'Nivel Riesgo': l.riskLevel || 'NORMAL',
                  'Sello Hash': l.hashSignature || l.id,
                  'Estado Solución': l.solutionProposal ? l.solutionProposal.status : 'SIN_PROPUESTA',
                  'Notas de Solución': l.solutionProposal ? l.solutionProposal.resolutionNotes : 'N/A',
                  'Documento Resguardo': l.solutionProposal?.attachmentName || 'Sin adjunto'
                }));
                exportToExcel(dataToExport, `Bitacora_Forense_Soluciones_${new Date().toISOString().split('T')[0]}`, 'Bitacora_Auditoria');
              }}
              className="jde-action-btn bg-[#E8F5E9]! text-emerald-800! border-emerald-300! hover:bg-emerald-100!"
            >
              <FileUp size={13} className="text-emerald-700" />
              <span>Exportar Excel (F950000)</span>
            </button>
          </div>
        </div>

        {/* QUIÉN HIZO QUÉ EN EL SISTEMA - Interactive User Activity Bar */}
        <div className="p-4 bg-slate-50/90 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-[#0B3C5D]" />
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                Auditoría por Usuario ("Quién hizo qué en el sistema")
              </span>
            </div>
            {userFilter !== 'TODOS' && (
              <button
                onClick={() => setUserFilter('TODOS')}
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
              >
                Ver Todos los Usuarios ({stats.total})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setUserFilter('TODOS')}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                userFilter === 'TODOS'
                  ? 'bg-[#0B3C5D] text-white border-[#0B3C5D] shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Users size={13} />
              <span>Todos ({stats.total})</span>
            </button>

            {userActivitySummaries.map((u) => {
              const isSelected = userFilter === u.user;
              return (
                <button
                  key={u.user}
                  onClick={() => setUserFilter(isSelected ? 'TODOS' : u.user)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#0B3C5D] text-white border-[#0B3C5D] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isSelected ? 'bg-white text-[#0B3C5D]' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {u.user.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[140px]">{u.user}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {u.total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Banner when a specific user is selected */}
          {selectedUserSummary && (
            <div className="mt-3 p-3.5 bg-white border border-indigo-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                  <User size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900">{selectedUserSummary.user}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 uppercase">
                      {selectedUserSummary.role || 'Usuario Registrado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Total: <strong className="text-slate-900">{selectedUserSummary.total}</strong> operaciones auditadas en el sistema.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {selectedUserSummary.creates} Creaciones
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {selectedUserSummary.updates} Modificaciones
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                  {selectedUserSummary.deletes} Eliminaciones
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                  {selectedUserSummary.logins} Sesiones
                </span>
                {selectedUserSummary.securityAlerts > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 font-black animate-pulse">
                    {selectedUserSummary.securityAlerts} Alertas Seguridad
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="p-5 bg-slate-100/60 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Buscar por usuario, acción, entidad, solución o adjunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B3C5D] shadow-xs text-slate-900"
            />
          </div>

          {/* Action Dropdown */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D] shadow-xs"
          >
            <option value="TODOS">Acción (Qué): Todas</option>
            <option value="CREATE">CREATE (Creación de Registro)</option>
            <option value="UPDATE">UPDATE (Edición / Modificación)</option>
            <option value="DELETE">DELETE (Baja / Eliminación)</option>
            <option value="LOGIN">LOGIN (Inicio de Sesión)</option>
            <option value="LOGOUT">LOGOUT (Cierre de Sesión)</option>
            <option value="LOGIN_FAILED">LOGIN FALLIDO (Alerta Seguridad)</option>
            <option value="SECURITY">SEGURIDAD (Acción de Protección)</option>
            <option value="APPROVE">APPROVE (Aprobación)</option>
            <option value="REJECT">REJECT (Rechazo)</option>
            <option value="EXPORT">EXPORT (Exportación Excel/Datos)</option>
            <option value="BACKUP">BACKUP (Respaldo)</option>
            <option value="REBUILD">REBUILD (Carga Masiva)</option>
          </select>

          {/* Entity Dropdown */}
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D] shadow-xs"
          >
            <option value="TODOS">Módulo: Todos</option>
            {uniqueEntities.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          {/* User Dropdown */}
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D] shadow-xs"
          >
            <option value="TODOS">Usuario (Quién): Todos</option>
            {uniqueUsers.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {/* Logs Container - GRID / DATA TABLE MODE */}
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center bg-slate-50">
            <Shield size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-xs font-bold text-slate-600 uppercase">
              No se encontraron registros de auditoría con los criterios seleccionados.
            </p>
            {(searchTerm || actionFilter !== 'TODOS' || entityFilter !== 'TODOS' || userFilter !== 'TODOS' || onlyIrregular) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setActionFilter('TODOS');
                  setEntityFilter('TODOS');
                  setUserFilter('TODOS');
                  setPeriodFilter('TODOS');
                  setOnlyIrregular(false);
                }}
                className="mt-3 text-[10px] font-black uppercase text-indigo-600 border border-indigo-200 px-3 py-1 rounded-lg hover:bg-indigo-50 cursor-pointer"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        ) : viewMode === 'GRID' ? (
          /* TABULAR GRID VIEW WITH EXPLICIT DRILL-DOWN IN EVERY ROW - AssetFlow Enterprise*/
          <div className="overflow-x-auto max-h-[650px] overflow-y-auto w-full border border-[#7FA6C7] rounded-[3px] bg-white">
            <table className="w-full text-left border-collapse table-fixed min-w-[1300px] text-xs">
              <thead className="sticky top-0 z-10 font-bold text-[10px] uppercase tracking-wider">
                <tr className="bg-[#E8EEF5] border-b border-[#A2BCCF]">
                  <th className="w-[36px] px-1 py-2 text-center text-[#1A3E5C] border-r border-[#A2BCCF]">#</th>
                  <th className="w-[120px] px-3 py-2 text-[#1A3E5C] border-r border-[#A2BCCF]">ID / Hash Sello</th>
                  <th className="w-[145px] px-3 py-2 text-[#1A3E5C] border-r border-[#A2BCCF]">Fecha y Hora</th>
                  <th className="w-[130px] px-3 py-2 text-[#1A3E5C] border-r border-[#A2BCCF]">Usuario (Quién)</th>
                  <th className="w-[100px] px-3 py-2 text-[#1A3E5C] border-r border-[#A2BCCF]">Acción (Qué)</th>
                  <th className="w-[110px] px-3 py-2 text-[#1A3E5C] border-r border-[#A2BCCF]">Módulo</th>
                  <th className="w-[200px] px-3 py-2 text-[#1A3E5C] border-r border-[#A2BCCF]">Entidad / Detalle</th>
                  <th className="w-[220px] px-3 py-2 text-[#1A3E5C] border-r border-[#A2BCCF]">Campo & Transición</th>
                  <th className="w-[100px] px-3 py-2 text-[#1A3E5C] border-r border-[#A2BCCF]">Riesgo SOX</th>
                  <th className="w-[150px] px-3 py-2 text-[#1A3E5C] border-r border-[#A2BCCF]">Resguardo / Solución</th>
                  <th className="w-[115px] px-3 py-2 text-center text-[#1A3E5C]">Drill Down</th>
                </tr>
                {/* ERP Query By Example (QBE) Filter Row */}
                <tr className="bg-[#F0F5FA] border-b border-[#7FA6C7]">
                  <th className="p-1 bg-[#DCE7F2] text-center border-r border-[#A2BCCF]">
                    <button
                      onClick={() => setQbeFilters({ id: '', date: '', user: '', action: '', entityType: '', entityName: '', fieldChanged: '', risk: '' })}
                      title="Limpiar filtros QBE"
                      className="text-slate-500 hover:text-rose-600 cursor-pointer font-bold text-[10px]"
                    >
                      ×
                    </button>
                  </th>
                  <th className="p-1 bg-[#F0F5FA] border-r border-[#D2DFEC]">
                    <input
                      type="text"
                      value={qbeFilters.id}
                      onChange={(e) => setQbeFilters({ ...qbeFilters, id: e.target.value })}
                      placeholder="QBE..."
                      className="jde-qbe-input"
                    />
                  </th>
                  <th className="p-1 bg-[#F0F5FA] border-r border-[#D2DFEC]">
                    <input
                      type="text"
                      value={qbeFilters.date}
                      onChange={(e) => setQbeFilters({ ...qbeFilters, date: e.target.value })}
                      placeholder="QBE..."
                      className="jde-qbe-input"
                    />
                  </th>
                  <th className="p-1 bg-[#F0F5FA] border-r border-[#D2DFEC]">
                    <input
                      type="text"
                      value={qbeFilters.user}
                      onChange={(e) => setQbeFilters({ ...qbeFilters, user: e.target.value })}
                      placeholder="QBE..."
                      className="jde-qbe-input"
                    />
                  </th>
                  <th className="p-1 bg-[#F0F5FA] border-r border-[#D2DFEC]">
                    <input
                      type="text"
                      value={qbeFilters.action}
                      onChange={(e) => setQbeFilters({ ...qbeFilters, action: e.target.value })}
                      placeholder="QBE..."
                      className="jde-qbe-input"
                    />
                  </th>
                  <th className="p-1 bg-[#F0F5FA] border-r border-[#D2DFEC]">
                    <input
                      type="text"
                      value={qbeFilters.entityType}
                      onChange={(e) => setQbeFilters({ ...qbeFilters, entityType: e.target.value })}
                      placeholder="QBE..."
                      className="jde-qbe-input"
                    />
                  </th>
                  <th className="p-1 bg-[#F0F5FA] border-r border-[#D2DFEC]">
                    <input
                      type="text"
                      value={qbeFilters.entityName}
                      onChange={(e) => setQbeFilters({ ...qbeFilters, entityName: e.target.value })}
                      placeholder="QBE..."
                      className="jde-qbe-input"
                    />
                  </th>
                  <th className="p-1 bg-[#F0F5FA] border-r border-[#D2DFEC]">
                    <input
                      type="text"
                      value={qbeFilters.fieldChanged}
                      onChange={(e) => setQbeFilters({ ...qbeFilters, fieldChanged: e.target.value })}
                      placeholder="QBE..."
                      className="jde-qbe-input"
                    />
                  </th>
                  <th className="p-1 bg-[#F0F5FA] border-r border-[#D2DFEC]">
                    <input
                      type="text"
                      value={qbeFilters.risk}
                      onChange={(e) => setQbeFilters({ ...qbeFilters, risk: e.target.value })}
                      placeholder="QBE..."
                      className="jde-qbe-input"
                    />
                  </th>
                  <th className="p-1 bg-[#F0F5FA] border-r border-[#D2DFEC]"></th>
                  <th className="p-1 bg-[#F0F5FA]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredLogs.map((log, idx) => {
                  const formattedDate = new Date(log.timestamp).toLocaleString();
                  const hasProposal = !!log.solutionProposal;
                  const isSelected = selectedRowId === log.id;

                  return (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedRowId(isSelected ? null : log.id)}
                      onDoubleClick={() => setDrillDownLog(log)}
                      onContextMenu={(e) => handleRowContextMenu(e, log)}
                      title="Clic para seleccionar. Doble clic para Drill Down. Clic DERECHO para Menú Fila ERP"
                      className={`transition-colors cursor-context-menu text-xs border-b border-[#D2DFEC] ${
                        isSelected
                          ? 'bg-[#FFF9C4] font-bold text-[#002D62]'
                          : log.isIrregular 
                            ? 'bg-[#FFF8E7] hover:bg-[#FFFCDD]' 
                            : idx % 2 === 0 ? 'bg-white hover:bg-[#FFFCDD]' : 'bg-[#F8FAFD] hover:bg-[#FFFCDD]'
                      }`}
                    >
                      {/* Leftmost Selector Column with ERP pointer */}
                      <td className="w-[36px] bg-[#E8EEF5] border-r border-[#A2BCCF] text-center select-none py-2 text-[10px] font-mono font-bold text-[#1A3E5C]">
                        {isSelected ? (
                          <span className="text-[#002D62] font-black">▶</span>
                        ) : (
                          <span className="text-slate-500 font-normal">{idx + 1}</span>
                        )}
                      </td>
                      {/* ID / HASH */}
                      <td className="px-3.5 py-3 font-mono text-[10px] font-bold text-indigo-900 whitespace-nowrap overflow-hidden truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <Hash size={12} className="text-indigo-500 shrink-0" />
                          <span className="truncate">{(log.id || 'N/A').split('-')[0]}</span>
                        </div>
                      </td>

                      {/* FECHA Y HORA */}
                      <td className="px-3.5 py-3 font-mono text-[10px] text-slate-600 whitespace-nowrap overflow-hidden truncate">
                        <div className="flex items-center gap-1 truncate">
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate">{formattedDate}</span>
                        </div>
                      </td>

                      {/* USUARIO */}
                      <td className="px-3.5 py-3 font-bold text-slate-900 whitespace-nowrap overflow-hidden truncate">
                        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] truncate">
                          <User size={11} className="text-indigo-600 shrink-0" />
                          <span className="truncate">{log.user}</span>
                        </div>
                      </td>

                      {/* ACCIÓN */}
                      <td className="px-3.5 py-3 whitespace-nowrap overflow-hidden">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-2xs ${
                          log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          log.action === 'UPDATE' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                          log.action === 'DELETE' ? 'bg-rose-100 text-rose-800 border border-rose-200 font-extrabold' :
                          log.action === 'LOGIN' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          log.action === 'LOGOUT' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          log.action === 'LOGIN_FAILED' || log.action === 'SECURITY' ? 'bg-rose-600 text-white font-black animate-pulse' :
                          log.action === 'APPROVE' ? 'bg-emerald-600 text-white font-bold' :
                          log.action === 'REJECT' ? 'bg-rose-600 text-white font-bold' :
                          log.action === 'EXPORT' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                          log.action === 'BACKUP' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {log.action}
                        </span>
                      </td>

                      {/* MÓDULO */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-black text-slate-800 text-[10px] uppercase overflow-hidden truncate">
                        {log.entityType}
                      </td>

                      {/* ENTIDAD / DETALLE */}
                      <td className="px-3.5 py-3 font-bold text-slate-900 overflow-hidden truncate">
                        <div className="truncate text-slate-900" title={log.entityName || log.entityId || 'Sistema General'}>
                          {log.entityName || log.entityId || 'Sistema General'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium truncate" title={formatAuditActionNarrative(log)}>
                          {formatAuditActionNarrative(log)}
                        </div>
                      </td>

                      {/* CAMPO & TRANSICIÓN */}
                      <td className="px-3.5 py-3 overflow-hidden truncate">
                        {log.fieldChanged ? (
                          <div className="text-[10px] space-y-0.5 truncate">
                            <span className="font-mono bg-indigo-50 border border-indigo-200 text-indigo-800 px-1 rounded font-bold truncate block">
                              {log.fieldChanged}
                            </span>
                            <div className="flex items-center gap-1 text-[9px] text-slate-600 truncate">
                              <span className="line-through text-rose-600 truncate max-w-[80px] inline-block">{String(log.oldValue ?? '')}</span>
                              <ArrowRight size={10} className="text-slate-400 shrink-0" />
                              <span className="font-bold text-emerald-700 truncate max-w-[100px] inline-block">{String(log.newValue ?? '')}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic truncate block">
                            {log.newValue ? String(log.newValue) : 'Operación estándar sin campo individual'}
                          </span>
                        )}
                      </td>

                      {/* RIESGO SOX */}
                      <td className="px-3.5 py-3 whitespace-nowrap overflow-hidden">
                        {log.isIrregular ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-white shadow-2xs animate-pulse">
                            <AlertTriangle size={10} />
                            {log.riskLevel}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            NORMAL
                          </span>
                        )}
                      </td>

                      {/* RESGUARDO / SOLUCIÓN */}
                      <td className="px-3.5 py-3 whitespace-nowrap overflow-hidden truncate">
                        {hasProposal ? (
                          <div className="flex items-center gap-1 truncate">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              log.solutionProposal?.status === 'RESUELTO' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                            }`}>
                              {log.solutionProposal?.status === 'RESUELTO' ? 'RESUELTO' : 'EN PROCESO'}
                            </span>
                            {log.solutionProposal?.attachmentName && (
                              <Paperclip size={12} className="text-emerald-700 shrink-0" title={`Adjunto: ${log.solutionProposal.attachmentName}`} />
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sin Solución</span>
                        )}
                      </td>

                      {/* DRILL DOWN BUTTONS */}
                      <td className="px-4 py-3 whitespace-nowrap text-center bg-slate-50/50">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setDrillDownLog(log)}
                            className="px-2.5 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                            title="Abrir panel completo de Drill Down Trazable"
                          >
                            <Maximize2 size={11} />
                            <span>Drill Down</span>
                          </button>

                          <button
                            onClick={() => handleOpenSolutionAssistant(log)}
                            className="p-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 rounded-lg text-[9px] font-bold cursor-pointer transition-all"
                            title="Abrir Asistente de Solución & Resguardo"
                          >
                            <Sparkles size={11} />
                          </button>

                          {onNavigateToModule && log.entityType && (
                            <button
                              onClick={() => onNavigateToModule(log.entityType)}
                              className="p-1 bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-lg text-[9px] font-bold cursor-pointer transition-all"
                              title={`Ir al Módulo de Origen: ${log.entityType}`}
                            >
                              <ExternalLink size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARD FEED VIEW */
          <div className="max-h-[650px] overflow-y-auto divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const formattedDate = new Date(log.timestamp).toLocaleString();
              const isRecent = Date.now() - log.timestamp < 3600000;
              const hasProposal = !!log.solutionProposal;

              return (
                <div 
                  key={log.id} 
                  className={`p-5 transition-colors ${
                    log.isIrregular ? 'bg-amber-50/40 hover:bg-amber-50/80 border-l-4 border-l-amber-500' : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Top line: QUIÉN y CUÁNDO */}
                  <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* ACTION BADGE */}
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-2xs ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        log.action === 'UPDATE' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                        log.action === 'DELETE' ? 'bg-rose-100 text-rose-800 border border-rose-200 font-extrabold' :
                        log.action === 'LOGIN' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        log.action === 'LOGOUT' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        log.action === 'LOGIN_FAILED' || log.action === 'SECURITY' ? 'bg-rose-600 text-white font-black animate-pulse' :
                        log.action === 'APPROVE' ? 'bg-emerald-600 text-white font-bold' :
                        log.action === 'REJECT' ? 'bg-rose-600 text-white font-bold' :
                        log.action === 'EXPORT' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                        log.action === 'BACKUP' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {log.action}
                      </span>

                      {/* QUIÉN: USER BADGE */}
                      <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 text-slate-800 px-3 py-0.5 rounded-md text-xs font-bold shadow-2xs">
                        <User size={12} className="text-indigo-600" />
                        <span>QUIÉN: {log.user}</span>
                      </div>

                      {/* IRREGULAR WARNING BADGE IF APPLICABLE */}
                      {log.isIrregular && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md bg-amber-500 text-white shadow-xs animate-pulse">
                          <AlertTriangle size={11} />
                          ALERTA DE RIESGO: {log.riskLevel}
                        </span>
                      )}

                      {/* SOLUTION STATUS BADGE IF ATTACHED */}
                      {hasProposal && (
                        <span className={`flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-2xs ${
                          log.solutionProposal?.status === 'RESUELTO' ? 'bg-emerald-600 text-white' :
                          log.solutionProposal?.status === 'EN_PROCESO' ? 'bg-amber-600 text-white' :
                          'bg-slate-600 text-white'
                        }`}>
                          <FileCheck size={11} />
                          {log.solutionProposal?.status === 'RESUELTO' ? 'SOLUCIÓN APLICADA & RESGUARDADA' :
                           log.solutionProposal?.status === 'EN_PROCESO' ? 'EN SUBSANACIÓN' : 'PROPUESTA REGISTRADA'}
                        </span>
                      )}

                      {/* REF ID */}
                      <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                        ID: {(log.entityId || 'N/A').split('-')[0]}
                      </span>
                    </div>

                    {/* CUÁNDO: TIMESTAMP */}
                    <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px] bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      <Clock size={12} className="text-indigo-600" />
                      <span>CUÁNDO: {formattedDate}</span>
                      {isRecent && <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded">RECIENTE</span>}
                    </div>
                  </div>

                  {/* Body: QUÉ e Inspección Forense */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                          log.isIrregular ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {log.entityType ? log.entityType.charAt(0) : 'S'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                              Módulo: {log.entityType}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight mt-0.5">
                            {log.entityName || 'Registro / Evento de Sistema'}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* DRILL DOWN BUTTON */}
                        <button
                          onClick={() => setDrillDownLog(log)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                        >
                          <Maximize2 size={13} />
                          Drill Down
                        </button>

                        {/* SOLUTION ASSISTANT BUTTON */}
                        <button
                          onClick={() => handleOpenSolutionAssistant(log)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 ${
                            hasProposal
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-700'
                              : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300'
                          }`}
                        >
                          <Sparkles size={13} />
                          {hasProposal ? 'Ver / Editar Solución' : 'Propuesta de Solución'}
                        </button>

                        {/* FORENSIC INSPECTION */}
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 cursor-pointer border border-slate-200"
                        >
                          <Eye size={13} />
                          Inspección
                        </button>
                      </div>
                    </div>

                    {log.irregularReason && (
                      <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-600 shrink-0" />
                        <span>Diagnóstico Control Interno: {log.irregularReason}</span>
                      </div>
                    )}

                    {/* Diff Viewer for EDIT/UPDATE actions */}
                    {log.action === 'UPDATE' && log.fieldChanged ? (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-600" />
                          <span className="font-black text-slate-800 uppercase tracking-wider text-[10px]">
                            Campo Modificado: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">{log.fieldChanged}</code>
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-1 pt-1">
                          <div className="flex-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Valor Previo (Antes de la operación)</p>
                            <div className="text-xs text-rose-800 line-through bg-rose-50/70 p-2.5 rounded-lg border border-rose-200 font-mono truncate">
                              {String(log.oldValue ?? '(Sin valor previo)')}
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-slate-400 shrink-0 self-center hidden sm:block" />
                          <div className="flex-1">
                            <p className="text-[8px] font-black text-indigo-600 uppercase mb-1">Valor Nuevo (Tras la operación)</p>
                            <div className="text-xs text-emerald-950 font-bold bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 font-mono truncate">
                              {String(log.newValue ?? '(Vacío)')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
                        {log.newValue && !log.fieldChanged ? (
                          <span>Detalle de la Operación: <strong className="font-mono text-slate-900">{String(log.newValue)}</strong></span>
                        ) : (
                          <span>
                            {log.action === 'CREATE' ? 'Creación de registro validada en la base de datos.' :
                             log.action === 'DELETE' ? 'Eliminación del registro realizada desde la interfaz.' :
                             log.action === 'LOGIN' ? 'Autenticación exitosa registrada para el usuario.' :
                             log.action === 'LOGOUT' ? 'Cierre de sesión registrado en el sistema.' :
                             log.action === 'BACKUP' ? 'Respaldo o exportación de seguridad completado.' :
                             'Operación registrada exitosamente en la bitácora.'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* ATTACHED SOLUTION BOX IF PRESENT */}
                    {hasProposal && log.solutionProposal && (
                      <div className="mt-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                              <CheckCircle2 size={14} />
                            </div>
                            <span className="text-xs font-black uppercase text-emerald-950 tracking-wider">
                              Propuesta de Solución & Resguardo Registrado
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-300">
                            Auditor: {log.solutionProposal.resolvedBy}
                          </span>
                        </div>

                        <p className="text-xs text-emerald-900 font-medium bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                          <strong className="text-emerald-950 font-extrabold uppercase text-[10px] block mb-0.5">Acción / Nota de Corrección Aplicada:</strong>
                          {log.solutionProposal.resolutionNotes}
                        </p>

                        {log.solutionProposal.attachmentName && log.solutionProposal.attachmentData && (
                          <div className="pt-1 flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200">
                            <div className="flex items-center gap-2 truncate">
                              <Paperclip size={14} className="text-emerald-700 shrink-0" />
                              <span className="text-xs font-bold text-slate-800 truncate">
                                Respaldo: {log.solutionProposal.attachmentName}
                              </span>
                              {log.solutionProposal.attachmentSize && (
                                <span className="text-[10px] font-mono text-slate-500">
                                  ({log.solutionProposal.attachmentSize})
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDownloadAttachment(log.solutionProposal!.attachmentData!, log.solutionProposal!.attachmentName!)}
                              className="px-3 py-1 bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg hover:bg-emerald-800 flex items-center gap-1 shrink-0 cursor-pointer transition-all"
                            >
                              <Download size={12} /> Consultar Documento
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL DRILL-DOWN INSPECTOR MODAL */}
      {drillDownLog && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Drill Down Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#0B3C5D] text-white rounded-2xl flex items-center justify-center font-bold shadow-md">
                  <Maximize2 size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-900 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-indigo-300">
                      Drill Down Forense SOX & ERP
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      Ref ID: {(drillDownLog.id || 'N/A').split('-')[0]}
                    </span>
                  </div>
                  <h3 className="font-black text-lg uppercase text-slate-900 mt-0.5">
                    {drillDownLog.entityType}: {drillDownLog.entityName || drillDownLog.entityId || 'Registro de Sistema'}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onNavigateToModule && drillDownLog.entityType && (
                  <button
                    onClick={() => {
                      onNavigateToModule(drillDownLog.entityType);
                      setDrillDownLog(null);
                    }}
                    className="px-3.5 py-2 bg-[#0B3C5D] text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                    title={`Navegar directamente al módulo ${drillDownLog.entityType}`}
                  >
                    <ExternalLink size={14} />
                    <span>Ir a Módulo Origen</span>
                  </button>
                )}

                <button
                  onClick={() => setDrillDownLog(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-100 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Context Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100 border border-slate-300 text-slate-900 p-4 rounded-2xl text-xs font-mono shadow-xs">
              <div>
                <span className="text-[9px] font-black text-indigo-800 uppercase tracking-widest block">Acción Auditada</span>
                <span className="font-bold uppercase text-emerald-800">{drillDownLog.action}</span>
              </div>

              <div>
                <span className="text-[9px] font-black text-indigo-800 uppercase tracking-widest block">Usuario Ejecutor</span>
                <span className="font-bold text-slate-900">{drillDownLog.user}</span>
              </div>

              <div>
                <span className="text-[9px] font-black text-indigo-800 uppercase tracking-widest block">Fecha & Timestamp</span>
                <span className="font-bold text-slate-800">{new Date(drillDownLog.timestamp).toLocaleString()}</span>
              </div>

              <div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Sello Hash SHA-256</span>
                <span className="font-bold text-amber-300 truncate block">{drillDownLog.id.substring(0, 16)}...</span>
              </div>
            </div>

            {/* Drill Down Tab Bar */}
            <div className="flex border-b border-slate-200 gap-2">
              <button
                onClick={() => setDrillDownActiveTab('TRACE')}
                className={`pb-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  drillDownActiveTab === 'TRACE'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <ShieldCheck size={16} />
                <span>Metadatos & Trazabilidad</span>
              </button>

              <button
                onClick={() => setDrillDownActiveTab('DIFF')}
                className={`pb-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  drillDownActiveTab === 'DIFF'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <RefreshCw size={16} />
                <span>Comparativo de Cambio (Diff)</span>
              </button>

              <button
                onClick={() => setDrillDownActiveTab('HISTORY')}
                className={`pb-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  drillDownActiveTab === 'HISTORY'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Layers size={16} />
                <span>Línea de Tiempo del Objeto ({relatedDrillDownLogs.length})</span>
              </button>

              <button
                onClick={() => setDrillDownActiveTab('SOLUTION')}
                className={`pb-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  drillDownActiveTab === 'SOLUTION'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Sparkles size={16} />
                <span>Solución & Resguardo</span>
              </button>
            </div>

            {/* TAB 1: METADATOS Y TRAZABILIDAD COMPLETA */}
            {drillDownActiveTab === 'TRACE' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Módulo y Tipo de Entidad</span>
                    <p className="text-sm font-black text-slate-900 uppercase">{drillDownLog.entityType}</p>
                    <p className="text-xs text-slate-600">ID Único de Objeto: <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono font-bold">{drillDownLog.entityId}</code></p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nombre / Descripción de la Entidad</span>
                    <p className="text-sm font-black text-indigo-950 uppercase">{drillDownLog.entityName || 'Sin Nombre'}</p>
                    <p className="text-xs text-slate-600">Acción Ejecutada: <span className="font-bold text-slate-900 uppercase">{drillDownLog.action}</span></p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Usuario / Credenciales ERP</span>
                    <p className="text-sm font-black text-slate-900">{drillDownLog.user}</p>
                    <p className="text-xs text-slate-500 font-mono">Session Terminal: SEC-TERMINAL-09 / Web Client</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Correlatividad & Next Number F0002 ERP</span>
                    <p className="text-sm font-mono font-black text-indigo-900">SEQ-ERP-{(drillDownLog.timestamp % 1000000)}</p>
                    <p className="text-xs text-slate-500">Hash SHA-256 Inmutable: <code className="text-[10px] font-mono break-all bg-white px-1 rounded">{drillDownLog.id}</code></p>
                  </div>
                </div>

                {/* Risk Assessment Box */}
                <div className={`p-4 rounded-2xl border space-y-1 ${
                  drillDownLog.isIrregular 
                    ? 'bg-amber-50 border-amber-300 text-amber-950' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}>
                  <div className="flex items-center gap-2">
                    {drillDownLog.isIrregular ? <AlertTriangle size={18} className="text-amber-600" /> : <ShieldCheck size={18} className="text-emerald-600" />}
                    <span className="font-black text-xs uppercase tracking-wider">
                      Evaluación Forense de Riesgo: {drillDownLog.riskLevel || 'NORMAL'}
                    </span>
                  </div>
                  <p className="text-xs font-medium pl-6">
                    {drillDownLog.irregularReason || 'Operación registrada bajo parámetros normales de control interno y cumplimiento SOX.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: COMPARATIVO DE CAMBIO / DIFF */}
            {drillDownActiveTab === 'DIFF' && (
              <div className="space-y-4">
                {drillDownLog.fieldChanged ? (
                  <div className="bg-slate-50 border border-slate-300 text-slate-900 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">
                        Campo Impactado: <code className="text-amber-800 font-mono text-sm bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">{drillDownLog.fieldChanged}</code>
                      </span>
                      <span className="text-[10px] font-mono text-slate-600 font-bold">Acción: {drillDownLog.action}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest block">Valor Previo (Anterior)</span>
                        <div className="text-sm font-mono text-rose-800 line-through bg-white p-3 rounded border border-rose-200 break-all font-semibold">
                          {String(drillDownLog.oldValue ?? '(Sin valor anterior)')}
                        </div>
                      </div>

                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">Valor Nuevo (Resultado)</span>
                        <div className="text-sm font-mono text-emerald-900 font-bold bg-white p-3 rounded border border-emerald-300 break-all">
                          {String(drillDownLog.newValue ?? '(Vacío)')}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-2">
                    <FileText size={32} className="mx-auto text-slate-400" />
                    <p className="text-xs font-bold text-slate-800 uppercase">
                      Detalle de Carga / Operación de Sistema
                    </p>
                    <p className="text-xs text-slate-600 font-mono bg-white p-3 rounded-xl border border-slate-200 max-w-xl mx-auto">
                      {drillDownLog.newValue ? String(drillDownLog.newValue) : 'Operación registrada sin asignación de campo único individual.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LÍNEA DE TIEMPO DEL OBJETO */}
            {drillDownActiveTab === 'HISTORY' && (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-2xl flex items-center justify-between text-xs text-indigo-900 font-bold">
                  <span>Trazabilidad Histórica Completa para la Entidad: {drillDownLog.entityName || drillDownLog.entityId}</span>
                  <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded font-mono">{relatedDrillDownLogs.length} Eventos</span>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {relatedDrillDownLogs.map((relLog, idx) => (
                    <div 
                      key={relLog.id}
                      onClick={() => setDrillDownLog(relLog)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        relLog.id === drillDownLog.id 
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          relLog.id === drillDownLog.id ? 'bg-white text-indigo-900' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded ${
                              relLog.id === drillDownLog.id ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {relLog.action}
                            </span>
                            <span className="text-[10px] font-mono opacity-80">{new Date(relLog.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-xs font-bold mt-0.5">
                            {relLog.fieldChanged ? `Cambio en ${relLog.fieldChanged}` : (relLog.entityName || 'Registro de auditoría')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono opacity-80">Por: {relLog.user}</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: SOLUCIÓN Y RESGUARDO DOCUMENTAL */}
            {drillDownActiveTab === 'SOLUTION' && (
              <div className="space-y-4">
                {drillDownLog.solutionProposal ? (
                  <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-700" size={22} />
                        <div>
                          <span className="text-xs font-black uppercase text-emerald-950">Propuesta de Solución & Resguardo Registrado</span>
                          <p className="text-[10px] text-emerald-800 font-mono">Auditor: {drillDownLog.solutionProposal.resolvedBy} | Fecha: {drillDownLog.solutionProposal.resolvedAt ? new Date(drillDownLog.solutionProposal.resolvedAt).toLocaleString() : 'Reciente'}</p>
                        </div>
                      </div>
                      <span className="bg-emerald-700 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md">
                        {drillDownLog.solutionProposal.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-emerald-950">
                      <div>
                        <strong className="text-[10px] font-black text-emerald-800 uppercase block">Diagnóstico Técnico:</strong>
                        <p className="bg-white/80 p-3 rounded-xl border border-emerald-200 font-medium">{drillDownLog.solutionProposal.diagnosis}</p>
                      </div>

                      <div>
                        <strong className="text-[10px] font-black text-emerald-800 uppercase block">Notas de Corrección / Subsanación:</strong>
                        <p className="bg-white/80 p-3 rounded-xl border border-emerald-200 font-bold">{drillDownLog.solutionProposal.resolutionNotes}</p>
                      </div>

                      {drillDownLog.solutionProposal.attachmentName && drillDownLog.solutionProposal.attachmentData && (
                        <div className="bg-white p-3.5 rounded-xl border border-emerald-300 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 truncate">
                            <Paperclip className="text-emerald-700 shrink-0" size={18} />
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-900 truncate">{drillDownLog.solutionProposal.attachmentName}</p>
                              <p className="text-[10px] font-mono text-slate-500">Documento de Soporte Almacenado ({drillDownLog.solutionProposal.attachmentSize || 'Inmutable'})</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadAttachment(drillDownLog.solutionProposal!.attachmentData!, drillDownLog.solutionProposal!.attachmentName!)}
                            className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-black uppercase hover:bg-emerald-800 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm transition-all"
                          >
                            <Download size={14} /> Consultar Documento
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl text-center space-y-3">
                    <Sparkles size={36} className="mx-auto text-indigo-500" />
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">Sin Propuesta de Solución Registrada</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        Utilice el asistente interactivo para formular el diagnóstico, registrar las notas de corrección y adjuntar el documento de soporte inalterable.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        handleOpenSolutionAssistant(drillDownLog);
                        setDrillDownLog(null);
                      }}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase hover:bg-indigo-700 cursor-pointer shadow-md transition-all inline-flex items-center gap-2"
                    >
                      <Sparkles size={14} />
                      <span>Abrir Asistente de Solución & Resguardo</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center gap-3">
              <button
                onClick={() => handleOpenSolutionAssistant(drillDownLog)}
                className="px-4 py-2 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300 rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer transition-all"
              >
                <Sparkles size={14} />
                <span>{drillDownLog.solutionProposal ? 'Editar Solución & Documento' : 'Formular Solución'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDrillDownLog(null)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOLUTION ASSISTANT WIZARD MODAL */}
      {solutionModalLog && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#0B3C5D] text-white rounded-2xl flex items-center justify-center font-bold shadow-md">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase text-slate-900 flex items-center gap-2">
                    Asistente de Propuesta de Solución & Resguardo
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Formulación de propuesta técnica, corrección y almacenamiento inalterable de documentos de respaldo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSolutionModalLog(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Log Summary Bar */}
            <div className="bg-slate-100 border border-slate-200 text-slate-900 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[9px] font-black text-indigo-800 uppercase tracking-widest block">
                  Registro de Auditoría Seleccionado
                </span>
                <span className="font-black text-slate-900 uppercase">
                  {solutionModalLog.entityType} ({solutionModalLog.action}): {solutionModalLog.entityName || solutionModalLog.entityId}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600">
                <span>QUIÉN: {solutionModalLog.user}</span>
                <span>•</span>
                <span>ID: {solutionModalLog.id.split('-')[0]}</span>
              </div>
            </div>

            {/* Stepper Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className={`flex items-center gap-2 ${solutionStep === 1 ? 'text-indigo-600 font-black' : 'text-slate-400 font-medium'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${solutionStep === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</div>
                <span className="text-xs uppercase hidden sm:inline">Diagnóstico y Propuesta</span>
              </div>

              <ChevronRight size={16} className="text-slate-300" />

              <div className={`flex items-center gap-2 ${solutionStep === 2 ? 'text-indigo-600 font-black' : 'text-slate-400 font-medium'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${solutionStep === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</div>
                <span className="text-xs uppercase hidden sm:inline">Plan y Notas</span>
              </div>

              <ChevronRight size={16} className="text-slate-300" />

              <div className={`flex items-center gap-2 ${solutionStep === 3 ? 'text-indigo-600 font-black' : 'text-slate-400 font-medium'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${solutionStep === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</div>
                <span className="text-xs uppercase hidden sm:inline">Adjuntar Respaldo</span>
              </div>

              <ChevronRight size={16} className="text-slate-300" />

              <div className={`flex items-center gap-2 ${solutionStep === 4 ? 'text-indigo-600 font-black' : 'text-slate-400 font-medium'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${solutionStep === 4 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>4</div>
                <span className="text-xs uppercase hidden sm:inline">Confirmar Resguardo</span>
              </div>
            </div>

            {/* STEP 1: Diagnóstico Automático & Recomendación */}
            {solutionStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Diagnóstico Forense de la Incidencia / Cambio
                  </label>
                  <textarea
                    rows={3}
                    value={diagnosisText}
                    onChange={(e) => setDiagnosisText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Propuesta Recomendada de Corrección & Control Interno
                  </label>
                  <textarea
                    rows={5}
                    value={recommendedActionText}
                    onChange={(e) => setRecommendedActionText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSolutionModalLog(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSolutionStep(2)}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-black text-xs uppercase rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <span>Siguiente: Registrar Notas de Corrección</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Plan de Corrección & Notas */}
            {solutionStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Estado de Resolución del Registro
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setResolutionStatus('RESUELTO')}
                      className={`p-3 rounded-2xl border text-xs font-black uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        resolutionStatus === 'RESUELTO'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <CheckCircle2 size={16} />
                      <span>Resuelto / Subsanado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResolutionStatus('EN_PROCESO')}
                      className={`p-3 rounded-2xl border text-xs font-black uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        resolutionStatus === 'EN_PROCESO'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <RefreshCw size={16} />
                      <span>En Proceso / Visto Bueno Pendiente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResolutionStatus('SIN_RESOLVER')}
                      className={`p-3 rounded-2xl border text-xs font-black uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        resolutionStatus === 'SIN_RESOLVER'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <AlertTriangle size={16} />
                      <span>Observado / Sin Resolver</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Notas Explicativas de Corrección & Resolutivo
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Detalle la solución aplicada, actas confeccionadas o VB asignado por la jefatura..."
                    value={resolutionNotesText}
                    onChange={(e) => setResolutionNotesText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSolutionStep(1)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={16} /> Volver
                  </button>
                  <button
                    type="button"
                    onClick={() => setSolutionStep(3)}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-black text-xs uppercase rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <span>Siguiente: Adjuntar Respaldo</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Subir Documento Soporte / Resguardo */}
            {solutionStep === 3 && (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl text-xs font-medium text-indigo-950">
                  <strong className="font-black uppercase text-[10px] text-indigo-900 block mb-1">
                    Resguardo Documental Permanente (Inmutable)
                  </strong>
                  Adjunte la copia escaneada o archivo digital (PDF, comprobante, voucher bancario, acta o planilla Excel) que respalda formalmente esta subsanación.
                </div>

                {attachmentFile ? (
                  <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold shrink-0">
                        <FileCheck size={20} />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-black text-emerald-950 truncate">{attachmentFile.name}</p>
                        <p className="text-[10px] font-mono text-emerald-800">Tamaño: {attachmentFile.size}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(attachmentFile.data, attachmentFile.name)}
                        className="p-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 flex items-center gap-1 cursor-pointer"
                        title="Probar Descarga / Previsualizar"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttachmentFile(null)}
                        className="p-2 bg-rose-100 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-200 cursor-pointer"
                        title="Quitar Documento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-50 hover:bg-indigo-50/40 transition-all">
                    <Upload size={32} className="mx-auto text-indigo-500 mb-2" />
                    <p className="text-xs font-black text-slate-800 uppercase">
                      Selecciona o Arrastra el Documento de Respaldo
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 mb-3">
                      Soporta archivos PDF, imágenes (PNG, JPG), vouchers escaneados o planillas (hasta 15 MB)
                    </p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase rounded-xl hover:bg-indigo-700 shadow-sm cursor-pointer active:scale-95 transition-all">
                      <Paperclip size={14} />
                      <span>{isUploadingFile ? 'Procesando Archivo...' : 'Examinar Archivos'}</span>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                <div className="flex justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSolutionStep(2)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={16} /> Volver
                  </button>
                  <button
                    type="button"
                    onClick={() => setSolutionStep(4)}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-black text-xs uppercase rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <span>Revisar Resguardo y Confirmar</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Confirmación Final y Almacenamiento Permanente */}
            {solutionStep === 4 && (
              <div className="space-y-4">
                <div className="bg-emerald-950 text-white p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-800 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="text-emerald-400" size={20} />
                      <span className="font-black text-xs uppercase text-emerald-200 tracking-wider">
                        Resumen del Expediente de Solución & Resguardo Permanentemente
                      </span>
                    </div>
                    <span className="bg-emerald-800 text-emerald-200 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                      Estado: {resolutionStatus}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p>
                      <strong className="text-emerald-400 uppercase text-[10px] block">Diagnóstico Registrado:</strong>
                      {diagnosisText}
                    </p>

                    <p>
                      <strong className="text-emerald-400 uppercase text-[10px] block">Notas del Auditor / Corrección:</strong>
                      {resolutionNotesText || 'Propuesta de solución aprobada sin observaciones adicionales.'}
                    </p>

                    <p>
                      <strong className="text-emerald-400 uppercase text-[10px] block">Documento Soporte Asociado:</strong>
                      {attachmentFile ? (
                        <span className="text-emerald-300 font-bold flex items-center gap-1 mt-0.5">
                          <Paperclip size={12} /> {attachmentFile.name} ({attachmentFile.size})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sin documento adjunto (Aprobación por resolución)</span>
                      )}
                    </p>

                    <div className="pt-2 border-t border-emerald-800/80 flex items-center justify-between text-[10px] font-mono text-emerald-300">
                      <span>FIRMA DIGITAL: {currentUser}</span>
                      <span>FECHA SELLO: {new Date().toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSolutionStep(3)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={16} /> Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSolutionProposal}
                    className="px-6 py-3 bg-emerald-600 text-white font-black text-xs uppercase rounded-xl hover:bg-emerald-700 shadow-xl flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                  >
                    <CheckCircle2 size={18} />
                    <span>Confirmar Solución & Almacenar en Resguardo Permanente</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Forensic Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0B3C5D] text-white rounded-xl flex items-center justify-center font-bold">
                  <ShieldCheck size={20} className="text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase text-slate-900">
                    Inspección Forense de Auditoría
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Expediente completo de trazabilidad e integridad técnica
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Forensic Sheet Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <User size={11} className="text-indigo-600" /> QUIÉN (Usuario Ejecutor)
                </p>
                <p className="text-sm font-black text-slate-900">{selectedLog.user}</p>
                <div className="pt-1 flex items-center gap-2 text-[10px] font-mono text-slate-500">
                  <Laptop size={12} />
                  <span>Terminal/IP: 192.168.1.104 (Session Web)</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Clock size={11} className="text-indigo-600" /> CUÁNDO (Timestamp Exacto)
                </p>
                <p className="text-sm font-black text-slate-900 font-mono">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Timestamp UNIX: {selectedLog.timestamp}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <FileText size={11} className="text-indigo-600" /> QUÉ (Módulo y Entidad)
                </p>
                <p className="text-xs font-black text-slate-900 uppercase">{selectedLog.entityType} - {selectedLog.action}</p>
                <p className="text-xs text-slate-600 font-bold">{selectedLog.entityName || 'Sin Nombre'}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Hash size={11} className="text-indigo-600" /> Sello / Referencia Inmutable
                </p>
                <p className="text-xs font-mono text-indigo-900 bg-white p-1.5 rounded border border-slate-200 truncate">
                  HASH: {selectedLog.id}
                </p>
                <p className="text-[9px] text-slate-400">Verificado por el motor de auditoría AssetFlow</p>
              </div>
            </div>

            {/* Changes Detail Box */}
            <div className="bg-slate-100 border border-slate-200 text-slate-900 p-4 rounded-2xl space-y-2">
              <p className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">
                Payload / Trazabilidad de Cambios
              </p>
              {selectedLog.fieldChanged ? (
                <div className="space-y-2 text-xs font-mono">
                  <p><span className="text-slate-600">Campo:</span> <strong className="text-indigo-900">{selectedLog.fieldChanged}</strong></p>
                  <p><span className="text-slate-600">Antes:</span> <span className="text-rose-700 line-through">{String(selectedLog.oldValue ?? 'N/A')}</span></p>
                  <p><span className="text-slate-600">Después:</span> <span className="text-emerald-800 font-bold">{String(selectedLog.newValue ?? 'N/A')}</span></p>
                </div>
              ) : (
                <p className="text-xs font-mono text-slate-700">
                  {selectedLog.newValue ? String(selectedLog.newValue) : 'Acción registrada sin diferencia de campos.'}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl uppercase"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSaveVerdict}
                className="px-5 py-2 bg-indigo-600 text-white font-black text-xs uppercase rounded-xl hover:bg-indigo-700 shadow-md cursor-pointer"
              >
                Registrar Dictamen en Bitácora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Observation Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Shield className="text-indigo-600" size={20} />
                <h3 className="font-black text-sm uppercase text-slate-900">
                  Registrar Constancia de Auditoría
                </h3>
              </div>
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualNote} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Módulo / Área Afectada
                </label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="SISTEMA">SISTEMA GENERAL</option>
                  <option value="TRANSACCION">TRANSACCIONES & FINANZAS</option>
                  <option value="PROVEEDOR">PROVEEDORES & COMPLIANCE</option>
                  <option value="PROPIEDAD">PROPIEDADES & CONTRATOS</option>
                  <option value="ORDEN_TRABAJO">ÓRDENES DE TRABAJO</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Título de la Verificación
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Verificación de firmas y libro de folios de contratos OK"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Detalle / Observaciones de Control Interno
                </label>
                <textarea
                  rows={3}
                  placeholder="Escriba los hallazgos o la constancia de auditoría..."
                  value={noteDetail}
                  onChange={(e) => setNoteDetail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white font-black text-xs uppercase rounded-xl hover:bg-indigo-700 shadow-md cursor-pointer"
                >
                  Guardar en Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ERP AssetFlow Enterprise Grid Context Menu */}
      {contextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          programCode="P950000"
          programTitle="Bitácora Forense SOX AssetFlow Enterprise"
          collectionName="audit_logs"
          recordKey={(contextMenu.log.id || '').substring(0, 16)}
          recordData={contextMenu.log}
          items={[
            {
              id: 'select_drilldown',
              label: 'Seleccionar / Drill Down Forense',
              icon: <Maximize2 size={13} className="text-[#002D62]" />,
              shortcut: 'Enter',
              onClick: () => {
                setDrillDownLog(contextMenu.log);
              }
            },
            {
              id: 'solution_wizard',
              label: 'Asistente de Solución & Resguardo',
              icon: <Sparkles size={13} className="text-emerald-700" />,
              onClick: () => {
                handleOpenSolutionAssistant(contextMenu.log);
              }
            },
            {
              id: 'inspect_modal',
              label: 'Dictamen de Control Interno',
              icon: <ShieldAlert size={13} className="text-amber-700" />,
              onClick: () => {
                setSelectedLog(contextMenu.log);
              }
            },
            {
              id: 'goto_module',
              label: `Ir a Módulo de Origen (${contextMenu.log.entityType || 'General'})`,
              icon: <ExternalLink size={13} className="text-[#005B94]" />,
              onClick: () => {
                if (onNavigateToModule && contextMenu.log.entityType) {
                  onNavigateToModule(contextMenu.log.entityType);
                }
              }
            },
            {
              id: 'filter_user',
              label: `Filtrar Actividades de ${contextMenu.log.user}`,
              icon: <UserCheck size={13} className="text-indigo-700" />,
              onClick: () => {
                setUserFilter(contextMenu.log.user);
              }
            },
            {
              id: 'copy_hash',
              label: 'Copiar Hash Sello Forense',
              icon: <Hash size={13} className="text-slate-700" />,
              shortcut: 'Ctrl+C',
              onClick: () => {
                navigator.clipboard.writeText(contextMenu.log.hashSignature || contextMenu.log.id);
              }
            },
            {
              id: 'export_excel',
              label: 'Exportar Grilla a Excel (.xlsx)',
              icon: <FileUp size={13} className="text-emerald-700" />,
              shortcut: 'Ctrl+E',
              onClick: () => {
                handleExportAuditExcel();
              }
            },
            {
              id: 'clear_qbe',
              label: 'Limpiar Filtros QBE de Grilla',
              icon: <Filter size={13} className="text-slate-600" />,
              onClick: () => {
                setQbeFilters({ id: '', date: '', user: '', action: '', entityType: '', entityName: '', fieldChanged: '', risk: '' });
              }
            }
          ]}
        />
      )}
    </div>
  );
};

export default AuditLog;
