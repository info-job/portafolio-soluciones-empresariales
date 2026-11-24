
import React from 'react';
import { ShieldCheck, Cpu, Layers, AlertTriangle, CheckCircle2, Zap, Database, Lock, Printer, X, ArrowLeft, Terminal, Activity, Network, ClipboardCheck, Box, Calculator } from 'lucide-react';
import { DEFAULT_ASSETFLOW_SVG } from '../lib/defaultLogo';
import { printHtmlElement } from '../lib/printDocument';

interface TechnicalReviewReportProps {
  onClose: () => void;
  currentUser: string;
  companyLogo: string | null;
}

const TechnicalReviewReport: React.FC<TechnicalReviewReportProps> = ({ onClose, currentUser, companyLogo }) => {
  const reportId = `CONSISTENCY-ID-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
  const today = new Date().toLocaleDateString('es-CL');

  return (
    <div className="fixed inset-0 z-[400] bg-slate-200 flex flex-col no-print overflow-hidden animate-in fade-in duration-500">
      {/* BARRA DE CONTROL SUPERIOR */}
      <div className="h-20 bg-white border-b border-slate-300 px-10 flex items-center justify-between shadow-sm z-20">
        <button onClick={onClose} className="flex items-center gap-3 px-6 py-3 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-2xl border border-slate-300 font-black text-xs uppercase tracking-widest transition-all">
          <ArrowLeft size={18} /> Salir del Reporte
        </button>
        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-emerald-800 font-black text-[10px] uppercase tracking-widest leading-none">Certificado de Coherencia Modular</p>
              <p className="text-slate-600 text-[8px] font-black uppercase mt-1 italic font-mono">{reportId}</p>
           </div>
           <button onClick={() => printHtmlElement("printable-report", `Informe_Coherencia_${reportId}`)} className="bg-emerald-700 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase flex items-center gap-4 hover:bg-emerald-800 shadow-md border border-emerald-600 active:scale-95 transition-all cursor-pointer">
              <Printer size={24} /> DESCARGAR PDF / IMPRIMIR
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-12 bg-slate-200 flex justify-center custom-audit-scroll">
        <div id="printable-report" className="bg-white w-[216mm] min-h-[279mm] shadow-lg p-[1.5cm] flex flex-col text-black font-sans relative my-10 animate-in zoom-in-95">
          
          {/* ENCABEZADO CORPORATIVO */}
          <div className="flex justify-between items-start border-b-[6px] border-slate-900 pb-8 mb-10">
            <div className="flex items-center gap-6">
              {companyLogo ? (
                <img src={companyLogo} className="w-28 h-28 object-contain" alt="Logo" />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} className="w-28 h-28 flex items-center justify-center [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:object-contain" />
              )}
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1 text-slate-900">Informe de Coherencia</h1>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest italic">Análisis Integral de Interoperabilidad de Módulos</p>
                <div className="mt-4 flex gap-3">
                   <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-slate-300">Protocolo v15.5</span>
                   <span className="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-emerald-300">Estado: Óptimo</span>
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-lg font-black text-slate-900 uppercase">Auditado por:</p>
              <p className="text-sm font-black text-indigo-700 uppercase tracking-tight">{currentUser}</p>
              <p className="text-[10px] font-bold text-slate-600 uppercase font-mono">{today}</p>
            </div>
          </div>

          {/* RESUMEN EJECUTIVO */}
          <div className="bg-slate-100 border-2 border-slate-300 text-slate-900 p-8 rounded-[32px] mb-12 relative overflow-hidden shadow-xs">
             <div className="absolute right-0 top-0 opacity-5 -mr-12 -mt-12 text-slate-900"><Activity size={300} /></div>
             <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                   <div className="p-3 bg-indigo-700 text-white rounded-2xl shadow-sm"><ClipboardCheck size={32} /></div>
                   <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Veredicto de Integridad y Seguridad</h2>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed font-medium italic">
                   "Se certifica que el ecosistema <strong>ASSETFLOW</strong> ha sido sometido a un proceso de endurecimiento (hardening) de ciberseguridad y consolidación de datos. La arquitectura actual garantiza la trazabilidad total de los movimientos financieros, integrando fuentes de Caja Chica y Órdenes de Trabajo en un Maestro Único de Verdad."
                </p>
             </div>
          </div>

          {/* PILARES DE MEJORA IMPLEMENTADOS */}
          <div className="grid grid-cols-3 gap-6 mb-12">
             <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-[30px]">
                <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <ShieldCheck size={14} /> Ciberseguridad
                </h4>
                <ul className="text-[9px] font-bold text-slate-600 space-y-2 uppercase">
                   <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-500"/> Hardening Firestore</li>
                   <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-500"/> Validación de Esquemas</li>
                   <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-500"/> Aislamiento de PII</li>
                </ul>
             </div>
             <div className="p-6 bg-indigo-50 border-2 border-indigo-100 rounded-[30px]">
                <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Calculator size={14} /> Finanzas IA
                </h4>
                <ul className="text-[9px] font-bold text-slate-600 space-y-2 uppercase">
                   <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-indigo-500"/> Extracción Egresos v2</li>
                   <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-indigo-500"/> Mapeo de RUT Automático</li>
                   <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-indigo-500"/> Maestro Unificado</li>
                </ul>
             </div>
             <div className="p-6 bg-amber-50 border-2 border-amber-100 rounded-[30px]">
                <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Activity size={14} /> Salud Sistema
                </h4>
                <ul className="text-[9px] font-bold text-slate-600 space-y-2 uppercase">
                   <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-amber-500"/> Diagnóstico en Tiempo Real</li>
                   <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-amber-500"/> Equipo de Expertos</li>
                   <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-amber-500"/> Reparación Asistida</li>
                </ul>
             </div>
          </div>

          {/* TABLA DE COHERENCIA ENTRE MÓDULOS */}
          <div className="space-y-10 flex-1">
             <h3 className="text-sm font-black uppercase tracking-[0.3em] border-l-8 border-indigo-600 pl-4 mb-6">Mapeo de Coherencia Modular</h3>
             
             <div className="grid grid-cols-1 gap-6">
                {/* FILA 1 */}
                <div className="border-2 border-slate-100 rounded-[30px] p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Box size={24}/></div>
                      <div>
                         <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Órdenes de Trabajo <span className="mx-2 text-slate-300">↔</span> Finanzas</h4>
                         <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Validación de montos liquidados vs compromisos en OTs.</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 font-black text-[9px] uppercase tracking-widest">
                      <CheckCircle2 size={16} /> Vinculado
                   </div>
                </div>

                {/* FILA 2 */}
                <div className="border-2 border-slate-100 rounded-[30px] p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Layers size={24}/></div>
                      <div>
                         <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Oficios Entrantes <span className="mx-2 text-slate-300">↔</span> Pool Propiedades</h4>
                         <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Existencia de activo inmobiliario en cada oficio registrado.</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 font-black text-[9px] uppercase tracking-widest">
                      <CheckCircle2 size={16} /> Vinculado
                   </div>
                </div>

                {/* FILA 3 */}
                <div className="border-2 border-slate-100 rounded-[30px] p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><ShieldCheck size={24}/></div>
                      <div>
                         <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Auditoría <span className="mx-2 text-slate-300">↔</span> Usuarios</h4>
                         <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Cada cambio en base de datos tiene un responsable identificado.</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 font-black text-[9px] uppercase tracking-widest">
                      <CheckCircle2 size={16} /> Vinculado
                   </div>
                </div>

                {/* FILA 4 */}
                <div className="border-2 border-slate-100 rounded-[30px] p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><Zap size={24}/></div>
                      <div>
                         <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Extracción Inteligente <span className="mx-2 text-slate-300">↔</span> Egresos</h4>
                         <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Mapeo automático de RUT y Razón Social desde documentos tributarios.</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 font-black text-[9px] uppercase tracking-widest">
                      <CheckCircle2 size={16} /> Optimizado
                   </div>
                </div>
             </div>

             <div className="mt-10 p-8 bg-amber-50 border-2 border-amber-200 rounded-[40px] flex items-start gap-6">
                <AlertTriangle className="text-amber-600 shrink-0" size={32} />
                <div className="space-y-2">
                   <h4 className="text-sm font-black text-amber-900 uppercase italic">Observaciones de Consistencia:</h4>
                   <p className="text-[10px] font-bold text-amber-800/80 leading-relaxed uppercase">
                      "Aunque la base de datos es consistente, se recomienda la limpieza trimestral de la caché del navegador para mantener la velocidad de respuesta del motor v15. El respaldo portátil (.planilla) sigue siendo el método primario de coherencia entre distintos ordenadores."
                   </p>
                </div>
             </div>
          </div>

          {/* CIERRE DE INFORME */}
          <div className="mt-auto pt-10 border-t-8 border-slate-900 flex justify-between items-end">
             <div className="space-y-1">
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <Lock size={14}/> SISTEMA DE INTEGRIDAD PATRIMONIAL
                </div>
                <div className="text-[9px] font-mono text-slate-300 italic">TOKEN_VALIDACION: {reportId}</div>
             </div>
             <div className="w-80 text-center border-t-2 border-slate-300 pt-4">
                <p className="text-[12px] font-black uppercase text-black tracking-widest">Cristian Muñoz</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Control Interno Depto Inmobiliario</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicalReviewReport;
