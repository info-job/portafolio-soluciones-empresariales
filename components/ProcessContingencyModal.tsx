import React, { useState } from 'react';
import { 
  ShieldAlert, AlertTriangle, UserCheck, Calendar, FileText, 
  CheckCircle2, X, Lock, Unlock, Clock, Send, Info, FileSignature, ArrowRight
} from 'lucide-react';

export type ContingencyReasonType = 
  | 'VACACIONES_TITULAR'
  | 'EMERGENCIA_OPERACIONAL'
  | 'AUTORIZACION_GERENCIAL_DIRECTA'
  | 'FUERZA_MAYOR_SISTEMA_EXTERNO'
  | 'SUBROGANCIA_DESIGNADA'
  | 'OTRO';

export interface ContingencyBypassPayload {
  processName: string;
  processCode: string;
  recordId: string;
  recordTitle: string;
  originArea: string;
  blockedByArea: string;
  reasonType: ContingencyReasonType;
  customReason: string;
  subrogateUser: string;
  regularizationDeadline: string;
  authorizationDocRef?: string;
  timestamp: string;
}

interface ProcessContingencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  processName: string;
  processCode: string;
  recordId: string;
  recordTitle: string;
  originArea: string;
  blockedByArea: string;
  currentUser: string;
  onConfirmBypass: (payload: ContingencyBypassPayload) => void;
}

export const ProcessContingencyModal: React.FC<ProcessContingencyModalProps> = ({
  isOpen,
  onClose,
  processName,
  processCode,
  recordId,
  recordTitle,
  originArea,
  blockedByArea,
  currentUser,
  onConfirmBypass
}) => {
  const [reasonType, setReasonType] = useState<ContingencyReasonType>('VACACIONES_TITULAR');
  const [customReason, setCustomReason] = useState('');
  const [authorizationDocRef, setAuthorizationDocRef] = useState('');
  
  // Default regularization deadline: 5 business days from now
  const defaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };
  const [regularizationDeadline, setRegularizationDeadline] = useState(defaultDeadline());

  if (!isOpen) return null;

  const reasonDescriptions: Record<ContingencyReasonType, string> = {
    VACACIONES_TITULAR: 'Ausencia temporal o feriado legal / vacaciones del titular del área',
    EMERGENCIA_OPERACIONAL: 'Emergencia operacional impostergable que compromete la continuidad del servicio',
    AUTORIZACION_GERENCIAL_DIRECTA: 'Autorización expresa extraordinaria de Gerencia General / Directorio',
    FUERZA_MAYOR_SISTEMA_EXTERNO: 'Caída o indisponibilidad técnica de entidad externa (SII, DT, Cía. Seguros, Bancos)',
    SUBROGANCIA_DESIGNADA: 'Ejercicio formal de cargo subrogante según decreto o mandato interno',
    OTRO: 'Otra justificación operacional justificada y documentada'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customReason.trim()) {
      alert('Por favor ingrese una justificación técnica o motivo de la contingencia para el registro de auditoría.');
      return;
    }

    const payload: ContingencyBypassPayload = {
      processName,
      processCode,
      recordId,
      recordTitle,
      originArea,
      blockedByArea,
      reasonType,
      customReason: customReason.trim(),
      subrogateUser: currentUser,
      regularizationDeadline,
      authorizationDocRef: authorizationDocRef.trim() || undefined,
      timestamp: new Date().toISOString()
    };

    onConfirmBypass(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-[#0B3C5D] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Protocolo de Subrogancia y Contingencia Operacional
                </h3>
                <span className="bg-amber-400/20 text-amber-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-amber-400/30">
                  {processCode}
                </span>
              </div>
              <p className="text-xs text-blue-100/80 mt-0.5">
                Mecanismo de continuidad ante vacaciones, licencias o ausencias del personal titular.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY FORM */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 custom-audit-scroll flex-1">
          
          {/* CONTEXT CALLOUT */}
          <div className="bg-amber-50/80 border-2 border-amber-300/70 p-4 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase text-[10px]">PROCESO AFECTADO</span>
              <span className="font-mono font-black text-[#0B3C5D]">{processName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase text-[10px]">REGISTRO / DOCUMENTO</span>
              <span className="font-mono font-black text-slate-900 truncate max-w-sm">{recordTitle}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200 text-[11px]">
              <span className="text-amber-900 font-bold">Área Bloqueante Titular:</span>
              <span className="bg-amber-200/70 text-amber-950 font-bold px-2 py-0.5 rounded font-mono">
                {blockedByArea}
              </span>
            </div>
            <p className="text-[10px] text-amber-950/80 italic pt-1 leading-relaxed">
              ⚠️ La activación de este protocolo permite continuar con el flujo hacia la siguiente área sin esperar la resolución del titular, registrando un hito de auditoría indeleble con su identidad.
            </p>
          </div>

          {/* MOTIVO DE CONTINGENCIA */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
              <Clock size={13} className="text-[#0B3C5D]" /> Motivo de la Activación Extraordinaria:
            </label>
            <select
              value={reasonType}
              onChange={(e) => setReasonType(e.target.value as ContingencyReasonType)}
              className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
            >
              <option value="VACACIONES_TITULAR">🏖️ Ausencia por Vacaciones o Feriado Legal del Titular</option>
              <option value="SUBROGANCIA_DESIGNADA">📋 Ejercicio de Cargo Subrogante Formal</option>
              <option value="EMERGENCIA_OPERACIONAL">🚨 Emergencia Operacional / Continuidad de Negocio</option>
              <option value="AUTORIZACION_GERENCIAL_DIRECTA">👔 Autorización Expresa Extraordinaria de Gerencia</option>
              <option value="FUERZA_MAYOR_SISTEMA_EXTERNO">⚡ Fuerza Mayor / Caída de Sistema Externo (SII, DT, Bancos)</option>
              <option value="OTRO">✏️ Otro Motivo Documentado</option>
            </select>
            <p className="text-[10px] text-slate-500 font-medium">
              {reasonDescriptions[reasonType]}
            </p>
          </div>

          {/* JUSTIFICACIÓN TÉCNICA */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
              <FileSignature size={13} className="text-[#0B3C5D]" /> Justificación Técnica Obligatoria:
            </label>
            <textarea
              rows={3}
              required
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Describa el contexto de la contingencia, quién autorizó la subrogancia o el acuerdo alcanzado para no frenar la operación..."
              className="w-full text-xs font-medium text-slate-800 p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
            />
          </div>

          {/* METADATOS DE SUBROGANTE Y REGULARIZACIÓN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase">
                Usuario Responsable / Subrogante:
              </label>
              <div className="p-2.5 bg-slate-100 rounded-xl font-mono font-black text-slate-800 border border-slate-200 flex items-center gap-2">
                <UserCheck size={14} className="text-indigo-600" />
                {currentUser}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase">
                Plazo Límite de Regularización:
              </label>
              <input
                type="date"
                value={regularizationDeadline}
                onChange={(e) => setRegularizationDeadline(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* REFERENCIA DOCUMENTAL OPCIONAL */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-600 uppercase">
              Referencia / Folio del Respaldo (Opcional):
            </label>
            <input
              type="text"
              value={authorizationDocRef}
              onChange={(e) => setAuthorizationDocRef(e.target.value)}
              placeholder="Ej: Correo Gerencial del 24/09, Oficio N°458, WhatsApp Directorio"
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
            />
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors uppercase cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Unlock size={14} />
              Liberar Proceso por Subrogancia (Auditable)
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default ProcessContingencyModal;
