import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, AuditEntry, Supplier, Contact, WorkOrder } from '../types';
import { 
  Mail, Send, FileText, Users, ShieldAlert, CheckCircle2, 
  Loader2, Sparkles, Layout, XCircle, ChevronDown, 
  Download, FileSpreadsheet, Paperclip, AlertTriangle, ShieldCheck,
  Check, Info, RefreshCw, ExternalLink, Briefcase, Building2,
  Clock, ArrowRight, UserCheck, Inbox
} from 'lucide-react';
import { generateEmailDraft } from '../geminiService';
import { 
  googleSignInGmail, 
  getGmailAccessToken, 
  sendAutomatedEmail, 
  buildPresentationEmailTemplate, 
  EmailAttachment 
} from '../lib/gmailService';
import { auth } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { GmailSignatureModal } from './GmailSignatureModal';

declare var XLSX: any; // SheetJS global

interface EmailCenterProps {
  transactions: Transaction[];
  auditLog: AuditEntry[];
  suppliers: Supplier[];
  contacts?: Contact[];
  workOrders?: WorkOrder[];
  currentUser: string;
  onAuditLog?: (action: string, entityId: string, details?: string) => void;
}

interface DispatchedEmailRecord {
  id: string;
  timestamp: string;
  recipient: string;
  cc?: string;
  subject: string;
  reportType: string;
  hasAttachment: boolean;
  attachmentName?: string;
  status: 'EXITOSO' | 'ERROR';
  messageId?: string;
}

type ReportTypeOption = 'PROPUESTA_COMERCIAL' | 'FINANZAS' | 'ORDENES_TRABAJO' | 'AUDITORIA' | 'PROVEEDORES' | 'LIBRE';

const DEFAULT_CONTACTS: Contact[] = [
  { id: 'c-owner', name: 'Cristian Muñoz (Propietario)', email: 'samaheim@gmail.com', position: 'DIRECTOR', entity: 'AssetFlow Solutions' },
  { id: 'c-1', name: 'Gerencia de Finanzas & Inversiones', email: 'finanzas@inmobiliariapro.cl', position: 'GERENTE', entity: 'Inmobiliaria Pro' },
  { id: 'c-2', name: 'Departamento de Control Interno', email: 'auditoria@inmobiliariapro.cl', position: 'AUDITOR', entity: 'Corporación Inmobiliaria' },
  { id: 'c-3', name: 'Jefatura de Operaciones & Mantención', email: 'operaciones@inmobiliariapro.cl', position: 'OPERACIONES', entity: 'Asset Operations' },
  { id: 'c-4', name: 'Supervisión Contable & Cumplimiento CMF', email: 'cumplimiento.cmf@inmobiliariapro.cl', position: 'COMPLIANCE', entity: 'Auditoría Externa' },
  { id: 'c-5', name: 'Comité de Dirección y Nuevos Negocios', email: 'directorio@holding-industrial.cl', position: 'CLIENTE_POTENCIAL', entity: 'Holding Industrial & Retail' }
];

export const EmailCenter: React.FC<EmailCenterProps> = ({ 
  transactions = [], 
  auditLog = [], 
  suppliers = [], 
  contacts = DEFAULT_CONTACTS, 
  workOrders = [], 
  currentUser,
  onAuditLog 
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportTypeOption>('PROPUESTA_COMERCIAL');
  const [recipientEmail, setRecipientEmail] = useState<string>('samaheim@gmail.com');
  const [recipientName, setRecipientName] = useState<string>('Cristian Muñoz');
  const [ccEmail, setCcEmail] = useState<string>('samaheim@gmail.com');
  const [includeCcOwner, setIncludeCcOwner] = useState<boolean>(true);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachExcel, setAttachExcel] = useState(true);
  
  // Google Workspace / Gmail OAuth state
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [hasGmailToken, setHasGmailToken] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Mandatory confirmation dialog modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Dispatch history state
  const [dispatchHistory, setDispatchHistory] = useState<DispatchedEmailRecord[]>(() => {
    try {
      const saved = localStorage.getItem('assetflow_email_dispatches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setGoogleUser(user);
      const token = getGmailAccessToken();
      setHasGmailToken(!!token);
    });
    return () => unsub();
  }, []);

  // Update CC automatically based on toggle
  useEffect(() => {
    if (includeCcOwner) {
      if (!ccEmail.includes('samaheim@gmail.com')) {
        setCcEmail(prev => prev ? `${prev}, samaheim@gmail.com` : 'samaheim@gmail.com');
      }
    } else {
      setCcEmail(prev => prev.replace('samaheim@gmail.com', '').replace(/,\s*,/g, ',').replace(/^,\s*|\s*,$/g, ''));
    }
  }, [includeCcOwner]);

  // Initial load or when template changes
  useEffect(() => {
    loadTemplateForReport(selectedReport);
  }, [selectedReport]);

  const loadTemplateForReport = (type: ReportTypeOption) => {
    setFeedbackMessage(null);
    if (type === 'PROPUESTA_COMERCIAL') {
      const t = buildPresentationEmailTemplate(recipientName || 'Estimado/a');
      setSubject(t.subject);
      setBody(t.bodyText);
    } else if (type === 'FINANZAS') {
      setSubject(`[INFORME FINANCIERO] Balance General y Ejecución de Gastos - ${new Date().toLocaleDateString('es-CL')}`);
      setBody(`Estimado equipo,\n\nAdjunto enviamos el balance financiero actualizado al día de hoy, conteniendo el detalle de ingresos, egresos operacionales y conciliación contable.\n\nTotal de transacciones procesadas: ${transactions.length}\nOperador responsable: ${currentUser}\n\nQuedamos a su disposición ante cualquier consulta.`);
    } else if (type === 'ORDENES_TRABAJO') {
      setSubject(`[ESTADO DE OPERACIONES] Consolidado de Órdenes de Trabajo (OT) y Proveedores`);
      setBody(`Estimada Gerencia de Operaciones,\n\nRemitimos el consolidado formal de Órdenes de Trabajo (OT) registradas en el sistema, incluyendo clasificación por categoría técnica, especialidad y factura tributaria asociada conforme a las normas de auditoría interna.\n\nTotal Órdenes registradas: ${workOrders.length}\nGenerado por: ${currentUser}`);
    } else if (type === 'AUDITORIA') {
      setSubject(`[CONTROL INTERNO] Registro de Trazabilidad y Bitácora de Auditoría Forense`);
      setBody(`Estimado Comité de Auditoría y Control Interno,\n\nSe adjunta la bitácora de trazabilidad inmutable con los últimos eventos de creación, actualización y eliminación transaccional registrados en la base de datos.\n\nRegistros auditados: ${auditLog.length}\nFecha de corte: ${new Date().toLocaleString('es-CL')}`);
    } else if (type === 'PROVEEDORES') {
      setSubject(`[MAESTRO PROVEEDORES] Directorio y Cumplimiento UAF / Debida Diligencia`);
      setBody(`Estimado equipo de Compras y Contratos,\n\nSe envía el informe consolidado del maestro de proveedores con su estado de homologación, categoría de servicio y cuenta bancaria acreditada.\n\nProveedores activos: ${suppliers.length}`);
    } else {
      setSubject(`Comunicado Oficial - AssetFlow Solution`);
      setBody(`Estimados,\n\nEscriba aquí el contenido del correo...`);
    }
  };

  /**
   * Builds Excel binary array for attachment
   */
  const buildExcelAttachment = (): EmailAttachment | null => {
    if (!attachExcel || typeof XLSX === 'undefined') return null;

    let dataToExport: any[] = [];
    let fileName = '';

    if (selectedReport === 'FINANZAS') {
      dataToExport = transactions.map(t => ({
        Fecha_Registro: t.date,
        Fecha_Emision: t.invoiceDate || t.date,
        Descripcion: t.description,
        Monto: t.amount,
        Tipo: t.type,
        Categoria: t.category,
        Compania: t.insuranceCompany,
        Usuario: t.user,
        Documento: t.documentNumber
      }));
      fileName = `Reporte_Finanzas_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (selectedReport === 'ORDENES_TRABAJO') {
      dataToExport = workOrders.map(w => ({
        Folio: w.folio,
        Fecha: w.date,
        Estado: w.status,
        Categoria: w.category || 'GENERAL',
        Especialidad: w.specialty || 'GENERAL',
        Factura_Asociada: w.associatedInvoice || 'S/N',
        Proveedor: w.supplierName,
        Propiedad: w.propertyCode,
        Monto_Estimado: w.estimatedAmount,
        Monto_Final: w.finalAmount,
        Responsable: w.responsible
      }));
      fileName = `Consolidado_OT_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (selectedReport === 'AUDITORIA') {
      dataToExport = auditLog.map(l => ({
        Fecha: new Date(l.timestamp).toLocaleString(),
        Accion: l.action,
        Usuario: l.user,
        ID_Entidad: l.entityId,
        Campo: l.fieldChanged || 'N/A',
        Anterior: l.oldValue || 'N/A',
        Nuevo: l.newValue || 'N/A'
      }));
      fileName = `Log_Auditoria_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (selectedReport === 'PROVEEDORES') {
      dataToExport = suppliers.map(s => ({
        RUT: s.taxId,
        Nombre: s.name,
        Categoria: s.category,
        Estado: s.status,
        Banco: s.bankName,
        Cuenta: s.accountNumber
      }));
      fileName = `Maestro_Proveedores_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (selectedReport === 'PROPUESTA_COMERCIAL') {
      dataToExport = [
        { Modulo: 'Gestión de Órdenes de Trabajo (OT)', Estado: 'Operativo', Alcance: 'Techumbres, Plomería, Obras, Factura Asociada' },
        { Modulo: 'Reportes CMF (B.4 y B.13)', Estado: 'Operativo', Alcance: 'NCG 316, Cuadratura Exacta y Cartera de Activos' },
        { Modulo: 'Nota 14 NIC 40 IFRS', Estado: 'Operativo', Alcance: 'Roll-Forward Trimestral de Inversiones Inmobiliarias' },
        { Modulo: 'Workbench Aprobaciones JDE', Estado: 'Operativo', Alcance: 'Flujos Jerárquicos Multinivel P43081 / F4209' },
        { Modulo: 'Auditoría Forense Ley de Benford', Estado: 'Operativo', Alcance: 'Control Interno & Detección de Anomalías' },
        { Modulo: 'Envío Automatizado Gmail API', Estado: 'Activo', Alcance: 'Despacho directo 100% automatizado con adjuntos' }
      ];
      fileName = `Ficha_Tecnica_Solucion_Modular_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    if (dataToExport.length === 0) return null;

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    const base64Content = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    return {
      filename: fileName,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dataBase64: base64Content
    };
  };

  /**
   * Downloads Excel file locally on client machine
   */
  const handleDownloadLocalExcel = () => {
    const att = buildExcelAttachment();
    if (!att || typeof XLSX === 'undefined') {
      alert('No hay datos disponibles para exportar en este módulo.');
      return;
    }
    const link = document.createElement('a');
    link.href = `data:${att.contentType};base64,${att.dataBase64}`;
    link.download = att.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Connect with Google via OAuth
   */
  const handleConnectGoogle = async () => {
    setIsAuthenticating(true);
    setFeedbackMessage(null);
    try {
      const result = await googleSignInGmail();
      setGoogleUser(result.user);
      setHasGmailToken(true);
      setFeedbackMessage({
        type: 'success',
        text: `Conectado exitosamente con Google Workspace (${result.user.email}). Permisos de envío Gmail activos.`
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Error de autenticación con Google: ${err?.message || 'Permiso denegado'}`
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  /**
   * AI Draft Enhancement using Gemini
   */
  const handleAIEnhanceDraft = async () => {
    setIsGenerating(true);
    setFeedbackMessage(null);
    try {
      let dataToSummarize: any[] = [];
      if (selectedReport === 'FINANZAS') dataToSummarize = transactions.slice(0, 50);
      else if (selectedReport === 'ORDENES_TRABAJO') dataToSummarize = workOrders.slice(0, 50);
      else if (selectedReport === 'AUDITORIA') dataToSummarize = auditLog.slice(0, 50);
      else if (selectedReport === 'PROVEEDORES') dataToSummarize = suppliers.slice(0, 50);

      const emailDraft = await generateEmailDraft(selectedReport as any, dataToSummarize, currentUser);
      setSubject(emailDraft.subject);
      setBody(emailDraft.body);
      setFeedbackMessage({
        type: 'info',
        text: 'Borrador perfeccionado con Inteligencia Artificial. Revise el contenido antes del envío.'
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: 'No se pudo generar la redacción IA. Se conserva el borrador actual.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Pre-flight check before opening Mandatory Confirmation Dialog
   */
  const handleRequestSend = () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      alert('Por favor ingrese una dirección de correo válida para el destinatario.');
      return;
    }
    if (!subject.trim()) {
      alert('Por favor ingrese un asunto para el correo.');
      return;
    }
    if (!body.trim()) {
      alert('El cuerpo del correo no puede estar vacío.');
      return;
    }

    if (!hasGmailToken) {
      handleConnectGoogle();
      return;
    }

    setShowConfirmModal(true);
  };

  /**
   * Execute automated email dispatch via Gmail API
   */
  const handleConfirmAndSend = async () => {
    setShowConfirmModal(false);
    setIsSending(true);
    setFeedbackMessage(null);

    try {
      const attachments: EmailAttachment[] = [];
      const excelAtt = buildExcelAttachment();
      if (excelAtt) {
        attachments.push(excelAtt);
      }

      const result = await sendAutomatedEmail({
        to: recipientEmail,
        cc: ccEmail || undefined,
        subject,
        bodyText: body,
        attachments
      });

      const newRecord: DispatchedEmailRecord = {
        id: `email-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }),
        recipient: recipientEmail,
        cc: ccEmail || undefined,
        subject,
        reportType: selectedReport,
        hasAttachment: attachments.length > 0,
        attachmentName: excelAtt?.filename,
        status: 'EXITOSO',
        messageId: result.messageId
      };

      const updatedHistory = [newRecord, ...dispatchHistory];
      setDispatchHistory(updatedHistory);
      localStorage.setItem('assetflow_email_dispatches', JSON.stringify(updatedHistory.slice(0, 50)));

      if (onAuditLog) {
        onAuditLog('SEND', newRecord.id, `Envío automático correo: ${subject} -> ${recipientEmail}`);
      }

      setFeedbackMessage({
        type: 'success',
        text: `¡Correo despachado exitosamente vía Gmail API! Message ID: ${result.messageId}. Se envió copia a ${ccEmail || 'ninguno'}.`
      });
    } catch (err: any) {
      console.error('[Send Error]', err);
      const isExpired = err.message?.includes('expirado') || err.message?.includes('401');
      if (isExpired) {
        setHasGmailToken(false);
      }
      setFeedbackMessage({
        type: 'error',
        text: `Fallo en el despacho automático: ${err?.message || 'Error desconocido'}. Puede intentar reconectar su cuenta de Google o usar el botón de cliente local.`
      });
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Fallback mailto link
   */
  const handleOpenLocalEmailClient = () => {
    const mailto = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}${ccEmail ? `&cc=${encodeURIComponent(ccEmail)}` : ''}`;
    window.location.href = mailto;
  };

  return (
    <div className="h-full bg-slate-50 p-6 md:p-10 overflow-auto custom-audit-scroll">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-6 gap-4">
           <div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#0B3C5D] text-white rounded-2xl shadow-md">
                  <Mail size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                     Centro de Despacho Automatizado
                  </h1>
                  <p className="text-[#0B3C5D] font-bold text-xs uppercase tracking-widest mt-0.5">
                     Integración Nativa Google Workspace & Gmail API (OAuth 2.0)
                  </p>
                </div>
              </div>
           </div>

           {/* HEADER ACTIONS: GMAIL SIGNATURE + GOOGLE WORKSPACE CONNECTION */}
           <div className="flex flex-wrap items-center gap-3">
             <button
               type="button"
               onClick={() => setIsSignatureModalOpen(true)}
               className="flex items-center gap-2 px-4 py-3 bg-[#0B2545] hover:bg-[#133A6B] text-white border border-[#C9A227]/60 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
               title="Abrir generador y descargador de Pie de Firma profesional compatible con Gmail"
             >
               <Sparkles size={15} className="text-[#F5D77A]" />
               <span>Pie de Firma Gmail</span>
             </button>

             <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
               {hasGmailToken ? (
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                     <Check size={16} />
                   </div>
                   <div className="text-left">
                     <div className="text-[10px] font-black text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                       Gmail API Vinculado
                     </div>
                     <div className="text-xs font-semibold text-slate-700">
                       {googleUser?.email || 'samaheim@gmail.com'}
                     </div>
                   </div>
                   <button
                     onClick={handleConnectGoogle}
                     title="Renovar token de Gmail"
                     className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors ml-1"
                   >
                     <RefreshCw size={14} />
                   </button>
                 </div>
               ) : (
                 <button
                   onClick={handleConnectGoogle}
                   disabled={isAuthenticating}
                   className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                 >
                   {isAuthenticating ? (
                     <Loader2 size={16} className="animate-spin text-indigo-600" />
                   ) : (
                     <svg className="w-4 h-4" viewBox="0 0 24 24">
                       <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                       <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.33 24 12 24z"/>
                       <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                       <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                     </svg>
                   )}
                   <span>Conectar con Google Workspace</span>
                 </button>
               )}
             </div>
           </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackMessage && (
          <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
            feedbackMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
              : feedbackMessage.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-indigo-50 border-indigo-300 text-indigo-900'
          }`}>
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : feedbackMessage.type === 'error' ? (
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {feedbackMessage.text}
            </div>
            <button 
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <XCircle size={16} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* LEFT COLUMN: TEMPLATES & RECIPIENTS (4 cols) */}
           <div className="lg:col-span-4 space-y-6">
              
              {/* PRESETS SELECTION */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
                 <div>
                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                       <Layout size={15} className="text-[#0B3C5D]" /> 1. Tipo de Comunicado o Reporte
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1">Seleccione la plantilla temática o cree un correo libre:</p>
                 </div>

                 <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={() => setSelectedReport('PROPUESTA_COMERCIAL')} 
                      className={`p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                        selectedReport === 'PROPUESTA_COMERCIAL' 
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-bold shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tight text-indigo-700">
                        <Briefcase size={14} /> Propuesta Comercial a Clientes
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        Presentación de plataforma adaptable a cualquier industria (enfoque inmobiliario y CMF).
                      </div>
                    </button>

                    <button 
                      onClick={() => setSelectedReport('FINANZAS')} 
                      className={`p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                        selectedReport === 'FINANZAS' 
                          ? 'bg-cyan-50 border-cyan-600 text-cyan-950 font-bold shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tight text-cyan-800">
                        <FileSpreadsheet size={14} /> Balance Financiero (.xlsx)
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        Consolidado de ingresos, egresos y movimientos de mayor contable.
                      </div>
                    </button>

                    <button 
                      onClick={() => setSelectedReport('ORDENES_TRABAJO')} 
                      className={`p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                        selectedReport === 'ORDENES_TRABAJO' 
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tight text-emerald-800">
                        <Building2 size={14} /> Órdenes de Trabajo & Facturas (.xlsx)
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        Trazabilidad por Categoría, Especialidad y Factura Asociada.
                      </div>
                    </button>

                    <button 
                      onClick={() => setSelectedReport('AUDITORIA')} 
                      className={`p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                        selectedReport === 'AUDITORIA' 
                          ? 'bg-purple-50 border-purple-600 text-purple-950 font-bold shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tight text-purple-800">
                        <ShieldAlert size={14} /> Trazabilidad de Auditoría (.xlsx)
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        Bitácora forense de eventos y cambios transaccionales inmutables.
                      </div>
                    </button>

                    <button 
                      onClick={() => setSelectedReport('PROVEEDORES')} 
                      className={`p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                        selectedReport === 'PROVEEDORES' 
                          ? 'bg-amber-50 border-amber-600 text-amber-950 font-bold shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tight text-amber-800">
                        <Users size={14} /> Maestro de Proveedores (.xlsx)
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        Directorio de empresas, estado de homologación y cuentas bancarias.
                      </div>
                    </button>
                 </div>
              </div>

              {/* RECIPIENT CONFIGURATION */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
                 <div>
                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                       <Users size={15} className="text-[#0B3C5D]" /> 2. Destinatario & Copia
                    </label>
                 </div>

                 {/* Quick contact picker */}
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-600 uppercase">Directorio Rápido:</label>
                   <div className="relative">
                     <select
                       onChange={(e) => {
                         const found = contacts.find(c => c.id === e.target.value);
                         if (found) {
                           setRecipientEmail(found.email);
                           setRecipientName(found.name);
                         }
                       }}
                       className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600 appearance-none uppercase"
                     >
                       <option value="">Seleccionar del directorio...</option>
                       {contacts.map(c => (
                         <option key={c.id} value={c.id}>
                           {c.name} — {c.entity} ({c.email})
                         </option>
                       ))}
                     </select>
                     <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                   </div>
                 </div>

                 {/* Custom email input */}
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-600 uppercase">Para (Email Destinatario):</label>
                   <input
                     type="email"
                     value={recipientEmail}
                     onChange={(e) => setRecipientEmail(e.target.value)}
                     placeholder="ejemplo@empresa.com"
                     className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
                   />
                 </div>

                 {/* CC input */}
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-600 uppercase">Con Copia (CC):</label>
                   <input
                     type="text"
                     value={ccEmail}
                     onChange={(e) => setCcEmail(e.target.value)}
                     placeholder="correo1@empresa.com, correo2@empresa.com"
                     className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
                   />
                 </div>

                 {/* Toggle CC to Owner */}
                 <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                   <input
                     type="checkbox"
                     checked={includeCcOwner}
                     onChange={(e) => setIncludeCcOwner(e.target.checked)}
                     className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                   />
                   <span className="text-[11px] font-bold text-slate-700">
                     Reenviar copia automática a <span className="text-indigo-700">samaheim@gmail.com</span>
                   </span>
                 </label>

                 {/* Attach Excel toggle */}
                 <div className="pt-2 border-t border-slate-200">
                   <label className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200 cursor-pointer select-none">
                     <div className="flex items-center gap-2.5">
                       <FileSpreadsheet size={18} className="text-emerald-700" />
                       <div>
                         <div className="text-[11px] font-black text-emerald-950 uppercase">Adjuntar Archivo Excel (.xlsx)</div>
                         <div className="text-[9px] text-emerald-700">Se generará y adjuntará automáticamente al correo</div>
                       </div>
                     </div>
                     <input
                       type="checkbox"
                       checked={attachExcel}
                       onChange={(e) => setAttachExcel(e.target.checked)}
                       className="w-4 h-4 rounded text-emerald-600 border-emerald-300 focus:ring-emerald-500"
                     />
                   </label>
                 </div>
              </div>

              {/* ACTION: AI POLISH & DOWNLOAD PREVIEW */}
              <div className="flex gap-2">
                <button
                  onClick={handleAIEnhanceDraft}
                  disabled={isGenerating}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-amber-300" />}
                  <span>Perfeccionar con IA</span>
                </button>

                {attachExcel && (
                  <button
                    onClick={handleDownloadLocalExcel}
                    title="Descargar copia del Excel ahora"
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border border-slate-300 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Ver Excel</span>
                  </button>
                )}
              </div>
           </div>

           {/* RIGHT COLUMN: EMAIL EDITOR & DISPATCH ACTIONS (8 cols) */}
           <div className="lg:col-span-8 space-y-6">
              
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[580px]">
                 
                 {/* EDITOR HEADER */}
                 <div className="bg-slate-100/90 p-5 border-b border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                         <Inbox size={14} className="text-[#0B3C5D]" /> Vista Previa del Despacho
                       </span>
                       <span className="text-[9px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 uppercase">
                         Canal: {hasGmailToken ? 'Gmail API Directo' : 'Pendiente Conexión Google'}
                       </span>
                    </div>

                    <div className="space-y-2">
                       <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-500 uppercase w-16">Para:</span>
                          <span className="text-xs font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">
                             {recipientEmail || '(Sin destinatario)'}
                          </span>
                          {ccEmail && (
                            <span className="text-[10px] font-semibold text-slate-500">
                              CC: {ccEmail}
                            </span>
                          )}
                       </div>

                       <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-500 uppercase w-16">Asunto:</span>
                          <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-600"
                          />
                       </div>
                    </div>
                 </div>

                 {/* ATTACHMENT BADGE IF ENABLED */}
                 {attachExcel && (
                   <div className="bg-emerald-50/70 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Paperclip size={14} className="text-emerald-700" />
                       <span className="text-[10px] font-bold text-emerald-900 uppercase">
                         Adjunto automatizado: Reporte_{selectedReport.toLowerCase()}.xlsx
                       </span>
                     </div>
                     <span className="text-[9px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                       Generado en Memoria
                     </span>
                   </div>
                 )}

                 {/* EDITOR BODY */}
                 <div className="flex-1 p-6 bg-white min-h-[320px]">
                    <textarea 
                       value={body}
                       onChange={(e) => setBody(e.target.value)}
                       placeholder="Redacte aquí el contenido del correo..."
                       className="w-full h-full text-xs font-medium text-slate-800 leading-relaxed outline-none resize-none custom-audit-scroll font-mono"
                       rows={15}
                    />
                 </div>

                 {/* EDITOR FOOTER / ACTION BUTTONS */}
                 <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-[9px] font-medium text-slate-500 max-w-sm leading-tight">
                      <ShieldCheck size={12} className="inline mr-1 text-emerald-600" />
                      Los correos se envían de forma segura utilizando la API oficial de Google Workspace bajo protocolo OAuth 2.0.
                    </p>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                       {/* Local client fallback */}
                       <button
                         onClick={handleOpenLocalEmailClient}
                         className="px-4 py-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                         title="Abrir en Outlook o cliente predeterminado"
                       >
                         <ExternalLink size={13} /> Cliente Local
                       </button>

                       {/* Direct automated Gmail send */}
                       <button 
                          onClick={handleRequestSend}
                          disabled={isSending}
                          className="flex-1 sm:flex-none px-6 py-3 bg-[#0B3C5D] hover:bg-[#07273C] text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                       >
                          {isSending ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Despachando...</span>
                            </>
                          ) : (
                            <>
                              <Send size={15} />
                              <span>Enviar Automáticamente con Gmail</span>
                            </>
                          )}
                       </button>
                    </div>
                 </div>
              </div>

              {/* DISPATCH HISTORY TABLE */}
              {dispatchHistory.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                   <div className="flex justify-between items-center">
                     <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                       <Clock size={14} className="text-[#0B3C5D]" /> Historial de Correos Despachados en esta Sesión
                     </h3>
                     <span className="text-[10px] font-bold text-slate-500">
                       {dispatchHistory.length} envíos registrados
                     </span>
                   </div>

                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                           <th className="py-2 px-3">Hora</th>
                           <th className="py-2 px-3">Destinatario</th>
                           <th className="py-2 px-3">Asunto</th>
                           <th className="py-2 px-3">Adjunto</th>
                           <th className="py-2 px-3">Estado</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                         {dispatchHistory.map((item) => (
                           <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                             <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{item.timestamp}</td>
                             <td className="py-2 px-3 text-slate-900 font-bold">{item.recipient}</td>
                             <td className="py-2 px-3 text-slate-800 truncate max-w-xs">{item.subject}</td>
                             <td className="py-2 px-3">
                               {item.hasAttachment ? (
                                 <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                   <FileSpreadsheet size={10} /> .XLSX
                                 </span>
                               ) : (
                                 <span className="text-[9px] text-slate-400">Sin adjunto</span>
                               )}
                             </td>
                             <td className="py-2 px-3">
                               <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                                 <Check size={10} /> Despachado
                               </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
              )}
           </div>

        </div>
      </div>

      {/* MANDATORY USER CONFIRMATION MODAL BEFORE MUTATING API CALL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[600] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            
            <div className="bg-[#0B3C5D] p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Send size={18} className="text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Confirmación de Despacho Automatizado
                </h3>
              </div>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="text-white/70 hover:text-white"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  <strong>Atención:</strong> Esta acción enviará un correo electrónico real de forma 100% automatizada a través de la API oficial de Gmail desde la cuenta autorizada (<strong>{googleUser?.email || 'samaheim@gmail.com'}</strong>).
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Para:</span>
                  <span className="font-bold text-slate-900">{recipientEmail}</span>
                </div>
                {ccEmail && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Con Copia (CC):</span>
                    <span className="font-semibold text-slate-800">{ccEmail}</span>
                  </div>
                )}
                <div className="flex flex-col gap-1 border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Asunto:</span>
                  <span className="font-bold text-indigo-900">{subject}</span>
                </div>
                {attachExcel && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Archivo Adjunto:</span>
                    <span className="font-bold text-emerald-800 flex items-center gap-1 text-[11px]">
                      <Paperclip size={12} /> Reporte_{selectedReport.toLowerCase()}.xlsx
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold uppercase hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSend}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Send size={14} /> Confirmar y Despachar Correo
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      <GmailSignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
      />

    </div>
  );
};

export default EmailCenter;
