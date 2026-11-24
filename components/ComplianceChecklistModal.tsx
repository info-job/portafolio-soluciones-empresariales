
import React from 'react';
import { Transaction, ComplianceChecklist } from '../types';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, FileSignature, Users, UserCheck, FileText, Camera, Info } from 'lucide-react';

interface ComplianceChecklistModalProps {
  transaction: Transaction;
  onClose: () => void;
  onUpdate: (checklist: ComplianceChecklist) => void;
}

const ComplianceChecklistModal: React.FC<ComplianceChecklistModalProps> = ({ transaction, onClose, onUpdate }) => {
  const checklist = transaction.compliance || {
    conflictThirdParty: false,
    conflictExecutive: false,
    beneficiariesUAF: false,
    dueDiligenceCert: false,
    paymentVoucher: false,
    invoice: false,
    receptionCertificate: false,
    photoSet: false,
    isExempt: false
  };

  const toggleItem = (key: keyof ComplianceChecklist) => {
    onUpdate({
      ...checklist,
      [key]: !checklist[key]
    });
  };

  const items = [
    {
      key: 'conflictThirdParty',
      label: 'Declaración Conflicto Interés (Terceros)',
      description: 'Declaración firmada por el proveedor sobre posibles conflictos de interés.',
      icon: Users,
      color: 'blue'
    },
    {
      key: 'conflictExecutive',
      label: 'Ausencia Conflicto Interés (Ejecutivo)',
      description: 'Declaración del ejecutivo responsable sobre la ausencia de conflictos.',
      icon: UserCheck,
      color: 'indigo'
    },
    {
      key: 'beneficiariesUAF',
      label: 'Declaración Beneficiarios Finales (UAF)',
      description: 'Formulario UAF que identifica a los beneficiarios finales del proveedor.',
      icon: ShieldCheck,
      color: 'emerald'
    },
    {
      key: 'dueDiligenceCert',
      label: 'Certificado Due Diligence',
      description: 'Certificado que acredita el proceso de debida diligencia realizado.',
      icon: FileSignature,
      color: 'amber'
    },
    {
      key: 'invoice',
      label: 'Factura / Boleta',
      description: 'Documento tributario que respalda el egreso.',
      icon: FileText,
      color: 'slate'
    },
    {
      key: 'paymentVoucher',
      label: 'Comprobante de Pago',
      description: 'Respaldo de la transferencia o pago realizado.',
      icon: FileText,
      color: 'slate'
    },
    {
      key: 'receptionCertificate',
      label: 'Acta de Recepción',
      description: 'Documento que acredita la recepción conforme del servicio o producto.',
      icon: CheckCircle2,
      color: 'emerald'
    },
    {
      key: 'photoSet',
      label: 'Set Fotográfico',
      description: 'Evidencia visual del trabajo o producto recibido.',
      icon: Camera,
      color: 'purple'
    }
  ];

  const completedCount = Object.entries(checklist)
    .filter(([key, value]) => key !== 'isExempt' && value === true)
    .length;
  
  const totalCount = items.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Checklist de Cumplimiento</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                Egreso #{transaction.documentNumber} • {transaction.supplierName || 'SIN PROVEEDOR'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Progreso de Documentación</span>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">{completedCount} de {totalCount} Completados</span>
            </div>
            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {items.map((item) => {
              const Icon = item.icon;
              const isChecked = checklist[item.key as keyof ComplianceChecklist];
              
              return (
                <button
                  key={item.key}
                  onClick={() => toggleItem(item.key as keyof ComplianceChecklist)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group ${
                    isChecked 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-colors ${
                    isChecked ? 'bg-emerald-200 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-black uppercase tracking-tight ${
                        isChecked ? 'text-emerald-700' : 'text-slate-700'
                      }`}>
                        {item.label}
                      </span>
                      {isChecked && <CheckCircle2 size={14} className="text-emerald-500" />}
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold leading-tight mt-1">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <Info size={18} />
            </div>
            <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
              Toda la documentación marcada aquí debe estar físicamente o digitalmente disponible en la carpeta del egreso para auditorías futuras.
            </p>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
          >
            Cerrar y Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplianceChecklistModal;
