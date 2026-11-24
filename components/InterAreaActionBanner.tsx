import React, { useState } from 'react';
import { WorkOrder, WorkOrderAction, ContingencyOverride } from '../types';
import { 
  AlertTriangle, ShieldAlert, Lock, Unlock, CheckCircle2, 
  Send, Clock, ArrowRight, UserCheck, PackageCheck, 
  DollarSign, FileText, Bell, Sparkles, X, ChevronDown, ChevronUp,
  LifeBuoy, ShieldCheck, UserCog
} from 'lucide-react';

interface InterAreaActionBannerProps {
  order: WorkOrder;
  currentUser: string;
  onSaveOrder: (updatedOrder: WorkOrder) => void;
  onQuickAction?: () => void;
  compact?: boolean;
}

export const InterAreaActionBanner: React.FC<InterAreaActionBannerProps> = ({
  order,
  currentUser,
  onSaveOrder,
  onQuickAction,
  compact = false
}) => {
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showContingencyModal, setShowContingencyModal] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Contingency form state
  const [contingencyType, setContingencyType] = useState<ContingencyOverride['type']>('VACACIONES');
  const [contingencyReason, setContingencyReason] = useState('');
  const [contingencySubrogante, setContingencySubrogante] = useState(currentUser || 'SUBROGANTE OPERACIONAL');

  // Analyze the current inter-area bottleneck
  const getInterAreaStatus = () => {
    switch (order.status) {
      case 'BORRADOR':
      case 'PENDIENTE_VB':
        return {
          step: 2,
          currentArea: 'Área Solicitante / Formulación',
          targetArea: 'Jefatura & Control Financiero',
          jdeProgram: 'P43081 (Purchase Order Approvals)',
          jdeRule: 'F40203: Estado 110/220 → 230',
          title: 'ACCIÓN REQUERIDA: VISTO BUENO / APROBACIÓN POR JEFATURA',
          badgeText: 'ESPERA APROBACIÓN JEFATURA',
          compactBadgeText: 'VoBo Jefatura',
          severity: 'warning',
          summary: 'La orden está formulada pero requiere la aprobación financiera y técnica de Jefatura.',
          details: 'En AssetFlow Enterprise, ninguna orden puede avanzar hacia Adquisiciones/Compras ni generar compromiso presupuestario hasta contar con el visto bueno de la jefatura o gerencia facultada.',
          nextActionName: 'Aprobar Orden (VoBo)',
          notifyPrompt: 'Estimada Jefatura, se requiere su VoBo en la OT #' + order.folio + ' para proceder a la gestión de compras.',
          theme: 'amber'
        };
      case 'APROBADA':
        return {
          step: 3,
          currentArea: 'Jefatura (Aprobación Concedida)',
          targetArea: 'Adquisiciones & Compras',
          jdeProgram: 'R43500 (Print Purchase Orders UBE)',
          jdeRule: 'F40203: Estado 230 → 280 (Emisión Obligatoria)',
          title: 'BLOQUEO INTER-ÁREA: REQUIERE EMISIÓN E IMPRESIÓN POR COMPRAS',
          badgeText: 'ESPERA EMISIÓN COMPRAS (R43500)',
          compactBadgeText: 'Emisión Compras',
          severity: 'danger',
          summary: 'Aprobada por Jefatura, pero BODEGA TIENE BLOQUEADA la recepción técnica.',
          details: 'Regla de Oro ERP: Bodega tiene prohibido recibir mercadería sin la previa emisión formal (impresión/envío digital R43500) ejecutada por el Encargado de Compras. Hasta que Compras emita la orden formal, el inventario no puede ingresar.',
          nextActionName: 'Emitir e Imprimir OT (R43500)',
          notifyPrompt: 'Estimado equipo de Compras, la OT #' + order.folio + ' cuenta con VoBo de Jefatura. Favor emitir formalmente (R43500) para habilitar la recepción en Bodega.',
          theme: 'rose'
        };
      case 'EMITIDA_IMPRESA':
        return {
          step: 4,
          currentArea: 'Adquisiciones & Compras (Emitida)',
          targetArea: 'Bodega, Almacén & Operaciones',
          jdeProgram: 'P4312 (Purchase Order Receipts)',
          jdeRule: 'F40203: Estado 280 → 400 (Recepción Técnica)',
          title: 'ACCIÓN REQUERIDA: RECEPCIÓN FÍSICA Y GUÍA EN BODEGA',
          badgeText: 'ESPERA RECEPCIÓN BODEGA',
          compactBadgeText: 'Recepción Bodega',
          severity: 'info',
          summary: 'Orden emitida al proveedor. Bodega debe registrar la recepción conforme de materiales o servicios.',
          details: 'El recepcionista de Bodega debe contrastar la Guía de Despacho física, cargar fotos de evidencia técnica y firmar el acta conforme (P4312). Sin este paso, Cuentas por Pagar no puede procesar el pago.',
          nextActionName: 'Recepcionar en Bodega (P4312)',
          notifyPrompt: 'Estimado Jefe de Bodega, la OT #' + order.folio + ' se encuentra emitida formalmente. Favor registrar recepción conforme y guía al arribo de los insumos.',
          theme: 'indigo'
        };
      case 'RECEPCIONADA':
      case 'RECEPCIONADA_PARCIAL':
        return {
          step: 5,
          currentArea: 'Bodega & Almacén (Recepción Certificada)',
          targetArea: 'Contabilidad & Cuentas por Pagar',
          jdeProgram: 'P0411 / P4314 (3-Way Matching & Voucher)',
          jdeRule: 'F40203: Estado 400 → 999 (Cotejo de 3 Vías)',
          title: 'ACCIÓN REQUERIDA: COTEJO DE 3 VÍAS & PROGRAMACIÓN DE PAGO',
          badgeText: 'ESPERA 3-WAY MATCH FINANZAS',
          compactBadgeText: '3-Way Match',
          severity: 'purple',
          summary: 'Recepción técnica completada en Bodega. Cuentas por Pagar debe calzar Factura vs Guía vs OC.',
          details: 'Contabilidad debe verificar que el monto facturado por el proveedor coincida con las cantidades certificadas por Bodega y los precios pactados por Compras (Cotejo de 3 Vías ERP P0411) antes de autorizar la transferencia bancaria.',
          nextActionName: 'Validar 3-Way Match',
          notifyPrompt: 'Estimado equipo de Finanzas/Cuentas por Pagar, la OT #' + order.folio + ' cuenta con recepción técnica conforme en Bodega. Favor procesar Cotejo de 3 Vías y programación de pago.',
          theme: 'purple'
        };
      case 'PAGADA':
      case 'CONCLUIDA':
        return {
          step: 6,
          currentArea: 'Contabilidad & Tesorería',
          targetArea: 'Archivo & Auditoría Permanente',
          jdeProgram: 'ERP 999 (Closed Order)',
          jdeRule: 'F40203: Estado 999 (Ciclo Completo)',
          title: 'CICLO INTER-ÁREAS COMPLETADO SATISFACTORIAMENTE',
          badgeText: 'CICLO ERP COMPLETADO (999)',
          compactBadgeText: 'Concluida 999',
          severity: 'success',
          summary: 'Todos los hitos inter-área han sido ejecutados conforme a las reglas de actividad ERP.',
          details: 'La transacción cuenta con Requisición, Aprobación de Gasto, Emisión Formal, Recepción Técnica en Bodega y Liquidación en Cuentas por Pagar.',
          nextActionName: 'Ver Auditoría Completa',
          notifyPrompt: '',
          theme: 'emerald'
        };
      case 'RECHAZADA':
        return {
          step: 0,
          currentArea: 'Jefatura / Compliance ERP',
          targetArea: 'Área Solicitante',
          jdeProgram: 'P43081 / Rechazo Formal',
          jdeRule: 'Rechazo: Requiere Reformulación',
          title: 'ORDEN RECHAZADA POR JEFATURA / CONTROL INTERNO',
          badgeText: 'RECHAZADA',
          compactBadgeText: 'Rechazada',
          severity: 'danger',
          summary: `Motivo: ${order.rejectionReason || 'No cumple con especificaciones técnicas o marco de gasto.'}`,
          details: 'El solicitante debe corregir las observaciones o anular la orden para liberar el compromiso presupuestario.',
          nextActionName: 'Corregir y Reformular',
          notifyPrompt: 'Estimado solicitante, favor revisar observaciones del rechazo de la OT #' + order.folio,
          theme: 'rose'
        };
      default:
        return null;
    }
  };

  const statusInfo = getInterAreaStatus();
  if (!statusInfo) return null;

  // Handles recording the inter-area requirement notification into the transaction history
  const handleSendNotification = () => {
    const noteText = customNote.trim() || statusInfo.notifyPrompt;
    const now = new Date();

    const newAction: WorkOrderAction = {
      id: crypto.randomUUID(),
      date: now.toISOString(),
      entryDate: now.toISOString().split('T')[0],
      type: 'PENDIENTE',
      user: currentUser,
      actionResponsible: statusInfo.targetArea,
      trackingResponsible: currentUser,
      actionCategory: 'INTER_AREA_REQUIREMENT',
      sourceArea: `${currentUser} (${order.preparedByDept || 'OPERACIONES'})`,
      targetArea: statusInfo.targetArea,
      description: `🔔 SOLICITUD INTER-ÁREAS A ${statusInfo.targetArea.toUpperCase()}: ${noteText} [Ref ERP: ${statusInfo.jdeRule}]`
    };

    const updatedOT: WorkOrder = {
      ...order,
      trackingActions: [newAction, ...(order.trackingActions || [])]
    };

    onSaveOrder(updatedOT);
    setShowNotifyModal(false);
    setCustomNote('');
    alert(
      `✅ SOLICITUD INTER-ÁREAS REGISTRADA EN EL HISTORIAL\n\n` +
      `Área Notificada: ${statusInfo.targetArea}\n` +
      `Regla ERP: ${statusInfo.jdeRule}\n` +
      `Registrado por: ${currentUser}\n\n` +
      `La acción ha quedado asentada de forma indeleble en la bitácora de seguimiento de la OT #${order.folio}.`
    );
  };

  // Handles executing contingency / vacation bypass to prevent process paralyzation
  const handleExecuteContingency = () => {
    const reasonText = contingencyReason.trim() || `Subrogancia por ${contingencyType.replace('_', ' ')} del encargado titular.`;
    const now = new Date();
    const dateIso = now.toISOString();
    const dateStr = dateIso.split('T')[0];

    const overrideObj: ContingencyOverride = {
      enabled: true,
      type: contingencyType,
      reason: reasonText,
      authorizedBy: contingencySubrogante,
      date: dateIso,
      timestamp: Date.now()
    };

    let nextStatus = order.status;
    let extraFields: Partial<WorkOrder> = {};

    if (order.status === 'BORRADOR' || order.status === 'PENDIENTE_VB') {
      nextStatus = 'APROBADA';
      extraFields = {
        authorizedBy: contingencySubrogante,
        authorizationDate: dateStr,
        authorizedAt: dateIso,
        contingencyQuotes: overrideObj
      };
    } else if (order.status === 'APROBADA') {
      nextStatus = 'EMITIDA_IMPRESA';
      extraFields = {
        printedAt: dateIso,
        printedBy: contingencySubrogante,
        printCount: (order.printCount || 0) + 1,
        emissionChannel: 'IMPRESION_FISICA',
        jdeLastStatus: '280',
        jdeNextStatus: '400',
        contingencyQuotes: overrideObj
      };
    } else if (order.status === 'EMITIDA_IMPRESA') {
      nextStatus = 'RECEPCIONADA';
      extraFields = {
        receptionDate: dateStr,
        receptionUser: contingencySubrogante,
        jdeLastStatus: '400',
        jdeNextStatus: '999',
        contingencyQuality: overrideObj
      };
    } else if (order.status === 'RECEPCIONADA' || order.status === 'RECEPCIONADA_PARCIAL') {
      nextStatus = 'PAGADA';
      extraFields = {
        jdeLastStatus: '999',
        contingency3Way: overrideObj
      };
    }

    const contingencyAction: WorkOrderAction = {
      id: crypto.randomUUID(),
      date: dateIso,
      entryDate: dateStr,
      type: 'REALIZADA',
      user: contingencySubrogante,
      actionResponsible: statusInfo.targetArea,
      trackingResponsible: contingencySubrogante,
      actionCategory: 'CONTINGENCY_BYPASS',
      sourceArea: `SUBROGANTE CONTINGENCIA (${contingencySubrogante})`,
      targetArea: statusInfo.targetArea,
      description: `🛡️ BYPASS DE CONTINGENCIA / VACACIONES [${contingencyType}]: Autorizado por ${contingencySubrogante}. Motivo: ${reasonText}. Se avanza el proceso de forma extraordinaria (Estado: ${nextStatus}) para garantizar la continuidad operativa sin detener la empresa.`
    };

    const updatedOT: WorkOrder = {
      ...order,
      ...extraFields,
      status: nextStatus,
      trackingActions: [contingencyAction, ...(order.trackingActions || [])]
    };

    onSaveOrder(updatedOT);
    setShowContingencyModal(false);
    setContingencyReason('');
    alert(
      `✅ BYPASS DE CONTINGENCIA / VACACIONES EJECUTADO CON ÉXITO\n\n` +
      `Estado Avanzado: ${nextStatus}\n` +
      `Causa: ${contingencyType}\n` +
      `Subrogante / Autorizador: ${contingencySubrogante}\n` +
      `Motivo: ${reasonText}\n\n` +
      `El proceso ha continuado sin interrupciones y el hito quedó registrado con validez legal y de auditoría en la OT #${order.folio}.`
    );
  };

  // Compact inline badge for table view or condensed cards
  if (compact) {
    const bgColors: Record<string, string> = {
      amber: 'bg-amber-50 text-amber-800 border-amber-300',
      rose: 'bg-rose-50 text-rose-800 border-rose-300',
      indigo: 'bg-indigo-50 text-indigo-800 border-indigo-300',
      purple: 'bg-purple-50 text-purple-800 border-purple-300',
      emerald: 'bg-emerald-50 text-emerald-800 border-emerald-300'
    };

    return (
      <div 
        className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase border max-w-full overflow-hidden shrink-0 shadow-3xs ${bgColors[statusInfo.theme] || 'bg-slate-50 text-slate-700 border-slate-200'}`}
        title={`${statusInfo.title}\n${statusInfo.summary}\nRegla ERP: ${statusInfo.jdeRule}`}
      >
        {statusInfo.severity === 'danger' ? (
          <Lock size={9} className="shrink-0 text-rose-600" />
        ) : statusInfo.severity === 'warning' ? (
          <AlertTriangle size={9} className="shrink-0 text-amber-600" />
        ) : (
          <Clock size={9} className="shrink-0 text-indigo-600" />
        )}
        <span className="truncate max-w-[125px]">{statusInfo.compactBadgeText || statusInfo.badgeText}</span>
      </div>
    );
  }

  // Full detailed banner with contextual guidance, history recording, and inter-area notification
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm transition-all ${
      statusInfo.theme === 'rose' 
        ? 'bg-rose-50/80 border-rose-300 text-rose-950'
        : statusInfo.theme === 'amber'
          ? 'bg-amber-50/80 border-amber-300 text-amber-950'
          : statusInfo.theme === 'indigo'
            ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950'
            : statusInfo.theme === 'purple'
              ? 'bg-purple-50/80 border-purple-300 text-purple-950'
              : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
    }`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* ICON & MAIN MESSAGE */}
        <div className="flex items-start gap-3.5 flex-1">
          <div className={`p-3 rounded-xl text-white shadow shrink-0 ${
            statusInfo.theme === 'rose'
              ? 'bg-rose-600'
              : statusInfo.theme === 'amber'
                ? 'bg-amber-600'
                : statusInfo.theme === 'indigo'
                  ? 'bg-indigo-600'
                  : statusInfo.theme === 'purple'
                    ? 'bg-purple-600'
                    : 'bg-emerald-600'
          }`}>
            {statusInfo.severity === 'danger' ? <Lock size={22} /> : <AlertTriangle size={22} />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono shadow-3xs ${
                statusInfo.theme === 'rose'
                  ? 'bg-rose-200 text-rose-900 border border-rose-300'
                  : statusInfo.theme === 'amber'
                    ? 'bg-amber-200 text-amber-900 border border-amber-300'
                    : statusInfo.theme === 'indigo'
                      ? 'bg-indigo-200 text-indigo-900 border border-indigo-300'
                      : statusInfo.theme === 'purple'
                        ? 'bg-purple-200 text-purple-900 border border-purple-300'
                        : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
              }`}>
                {statusInfo.jdeRule}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Programa ERP: {statusInfo.jdeProgram}
              </span>
            </div>
            
            <h4 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              {statusInfo.title}
            </h4>
            
            <p className="text-xs font-semibold mt-1 leading-relaxed opacity-90">
              {statusInfo.summary}
            </p>

            {isExpanded && (
              <p className="text-[11px] mt-2 leading-relaxed opacity-80 border-t border-black/10 pt-2 font-medium">
                {statusInfo.details}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-2 text-[10px] font-bold uppercase rounded-lg border border-black/10 hover:bg-black/5 transition-colors flex items-center gap-1"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? 'Menos Detalle' : 'Regla ERP'}
          </button>

          {statusInfo.step < 6 && (
            <>
              <button
                type="button"
                onClick={() => setShowNotifyModal(true)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Registrar requerimiento formal y notificar al área responsable en el historial de la transacción"
              >
                <Bell size={14} className="text-indigo-600" />
                Solicitar Acción a {statusInfo.targetArea.split(' ')[0]}
              </button>

              <button
                type="button"
                onClick={() => setShowContingencyModal(true)}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-black text-xs uppercase flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Alternativa de Contingencia o Vacaciones: Desbloquear o subrogar con causa auditada"
              >
                <LifeBuoy size={14} className="text-amber-700" />
                <span>Contingencia / Vacaciones</span>
              </button>
            </>
          )}

          {onQuickAction && statusInfo.step < 6 && (
            <button
              type="button"
              onClick={onQuickAction}
              className={`px-4 py-2 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer ${
                statusInfo.theme === 'rose'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : statusInfo.theme === 'amber'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : statusInfo.theme === 'indigo'
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <ArrowRight size={14} />
              {statusInfo.nextActionName}
            </button>
          )}
        </div>
      </div>

      {/* NOTIFY AREA MODAL & HISTORY RECORDER */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#0B3C5D]">
                <Send size={18} />
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Requerimiento Inter-Áreas & Trazabilidad
                </h3>
              </div>
              <button 
                onClick={() => setShowNotifyModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900 space-y-1">
              <p className="font-bold">
                Destinatario: <span className="text-[#0B3C5D] uppercase">{statusInfo.targetArea}</span>
              </p>
              <p className="text-[11px] text-indigo-700">
                Regla de Actividad: <span className="font-mono font-bold">{statusInfo.jdeRule} ({statusInfo.jdeProgram})</span>
              </p>
              <p className="text-[10px] text-slate-500 italic mt-1">
                ℹ️ Esta solicitud quedará registrada de forma indeleble en el historial de la OT #{order.folio} con fecha, hora, usuario emisor y plazo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">
                Mensaje / Instrucción Específica para {statusInfo.targetArea}:
              </label>
              <textarea
                rows={3}
                value={customNote || statusInfo.notifyPrompt}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full text-xs font-medium text-slate-800 p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                placeholder="Escriba la instrucción o requerimiento para el área..."
              />
            </div>

            <div className="flex justify-end items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNotifyModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendNotification}
                className="px-6 py-2.5 bg-[#0B3C5D] hover:bg-[#082d47] text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Send size={14} />
                Registrar Solicitud en Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTINGENCY & VACATION BYPASS MODAL */}
      {showContingencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border-2 border-amber-300 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2.5 text-amber-900">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <LifeBuoy size={20} className="text-amber-800" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">
                    Protocolo de Contingencia / Vacaciones
                  </h3>
                  <p className="text-[10px] text-amber-700 font-bold">
                    Alternativa para continuidad de procesos - OT #{order.folio}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowContingencyModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-2 font-black text-amber-900 uppercase">
                <ShieldAlert size={15} /> Bloqueo Actual a Desbloquear:
              </div>
              <p className="text-[11px] font-medium">
                {statusInfo.title} ({statusInfo.targetArea}).
              </p>
              <p className="text-[10px] text-amber-800 font-semibold border-t border-amber-200/60 pt-1.5 mt-1">
                💡 Este mecanismo permite subrogar las funciones del titular en caso de vacaciones, licencias o urgencias impostergables, registrando la firma del suplente de forma transparente y sin detener las operaciones.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">
                  Motivo o Tipo de Contingencia:
                </label>
                <select
                  value={contingencyType}
                  onChange={(e) => setContingencyType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                >
                  <option value="VACACIONES">🏖️ Vacaciones del Titular / Aprobador Previo (Subrogancia)</option>
                  <option value="EMERGENCIA_OPERACIONAL">🚨 Emergencia Operacional Impostergable (Falla Crítica)</option>
                  <option value="LICENCIA_MEDICA">🏥 Licencia Médica o Ausencia Temporal Justificada</option>
                  <option value="SUBROGANTE_AUTORIZADO">👔 Subrogante Formal Facultado por Gerencia</option>
                  <option value="PROVEEDOR_UNICO">⭐ Proveedor Único / Distribuidor Exclusivo</option>
                  <option value="OTRO">📋 Otra Contingencia Operativa Auditada</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">
                  Funcionario Subrogante o Autorizante:
                </label>
                <input
                  type="text"
                  value={contingencySubrogante}
                  onChange={(e) => setContingencySubrogante(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans uppercase"
                  placeholder="Nombre y cargo del subrogante..."
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">
                  Justificación Auditada para Continuar el Trámite:
                </label>
                <textarea
                  rows={2}
                  value={contingencyReason}
                  onChange={(e) => setContingencyReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                  placeholder={`Ej: Subrogancia autorizada por feriado legal del titular de ${statusInfo.targetArea}...`}
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowContingencyModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteContingency}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <ShieldCheck size={16} />
                Autorizar y Continuar Proceso (Bypass Auditado)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
