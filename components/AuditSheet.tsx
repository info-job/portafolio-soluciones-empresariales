
import React, { useState } from 'react';
import { AuditEntry } from '../types';
import { ShieldAlert, Terminal, CheckCircle2, XCircle, Plus, Edit3, Trash2, Printer, ShieldCheck, FileText, X, ChevronRight, Download, ArrowLeft, HardHat, Users, AlertTriangle, Bug, BookOpen } from 'lucide-react';
import ManualModal from './ManualModal';
import { printHtmlElement } from '../lib/printDocument';

const AuditSheet: React.FC<{ logs: AuditEntry[], companyLogo: string | null }> = ({ logs, companyLogo }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isErrorReportOpen, setIsErrorReportOpen] = useState(false);
  const [isGlosarioOpen, setIsGlosarioOpen] = useState(false);

  const getIcon = (action: string) => {
    switch (action) {
      case 'APPROVE': return <CheckCircle2 className="text-green-400" size={14} />;
      case 'REJECT': return <XCircle className="text-rose-400" size={14} />;
      case 'CREATE': return <Plus className="text-indigo-400" size={14} />;
      case 'UPDATE': return <Edit3 className="text-amber-400" size={14} />;
      case 'DELETE': return <Trash2 className="text-slate-400" size={14} />;
      default: return <ShieldAlert size={14} />;
    }
  };

  const handlePrint = () => {
    printHtmlElement("printable-report", "Informe_Maestro_Incidencias_ERR-v8");
  };

  const errorLogs = logs.filter(l => ['REJECT', 'DELETE', 'RESTORE', 'ERROR'].includes(l.action));

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#020617] text-emerald-400 font-mono text-[10px] overflow-auto relative">
      
      {/* BARRA DE COMANDO SUPERIOR */}
      <div className="p-4 md:p-5 border-b border-white/5 bg-black/40 flex flex-wrap items-center justify-between gap-3 no-print z-10 overflow-x-auto min-w-0">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
            <Terminal size={18} />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Audit_Engine_v8.bin</h2>
            <p className="text-[8px] text-emerald-300 font-black tracking-wider uppercase">CONSOLA DE MONITOREO ACTIVA • PROPIEDAD: CRISTIAN MUÑOZ</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsGlosarioOpen(true)}
                className="bg-indigo-600/20 text-indigo-300 border border-indigo-400/40 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer shadow-xs"
            >
                <BookOpen size={16} /> Glosario de Errores
            </button>
            <button 
                onClick={() => setIsErrorReportOpen(true)}
                className="bg-rose-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-rose-700 transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] border border-rose-400 cursor-pointer relative"
            >
                <AlertTriangle size={16} /> 
                Reporte Incidencias
                {errorLogs.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-rose-600 px-1.5 py-0.5 rounded-full text-[9px] font-black animate-bounce shadow-md">
                    {errorLogs.length}
                  </span>
                )}
            </button>
            <button 
                onClick={() => setIsPreviewOpen(true)}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-700 transition-all border border-indigo-400/50 cursor-pointer shadow-xs"
            >
                <FileText size={16} /> Reporte Auditoría
            </button>
        </div>
      </div>

      {/* TERMINAL DE LOGS */}
      <div className="flex-1 overflow-auto p-8 space-y-4 custom-audit-scroll no-print">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-emerald-300">
             <ShieldCheck size={64} className="mb-6" />
             <p className="text-sm font-black uppercase tracking-widest">Esperando flujo de datos del sistema...</p>
          </div>
        ) : (
          logs.map(log => (
              <div key={log.id} className="border-l border-emerald-500/30 pl-8 py-4 hover:bg-white/5 transition-all group rounded-r-2xl">
                <div className="flex items-center gap-4">
                    <span className="text-emerald-300 font-bold font-mono">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-lg text-[9px] text-white font-black uppercase border border-slate-700">
                        {getIcon(log.action)}
                        {log.action}
                    </div>
                    <span className="text-indigo-300 font-black tracking-widest font-mono">USER: {log.user}</span>
                </div>
                <div className="mt-3 text-slate-300 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-black font-mono">REF_ID:</span>
                        <span className="text-emerald-200 font-mono tracking-tighter">{log.entityId}</span>
                    </div>
                </div>
              </div>
          ))
        )}
      </div>

      {/* MODAL INFORME DE ERRORES */}
      {isErrorReportOpen && (
        <div className="fixed inset-0 z-[250] bg-slate-100 flex flex-col no-print overflow-hidden">
            <div className="h-24 bg-white border-b border-slate-200 px-10 flex items-center justify-between shadow-xs z-20">
                <button onClick={() => setIsErrorReportOpen(false)} className="flex items-center gap-3 px-6 py-4 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-2xl border border-slate-300 font-black text-xs uppercase tracking-widest cursor-pointer shadow-xs"><ArrowLeft size={18} /> Volver a Consola</button>
                <div className="flex items-center gap-4">
                   <div className="text-right">
                      <p className="text-rose-700 font-black text-[10px] uppercase tracking-widest">Incidencias Filtradas</p>
                      <p className="text-slate-900 font-black font-mono text-xs">{errorLogs.length} Alertas Críticas</p>
                   </div>
                   <button onClick={handlePrint} className="bg-rose-600 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase flex items-center gap-4 hover:bg-rose-700 shadow-md border border-rose-700/20 cursor-pointer active:scale-95"><Printer size={22} /> Descargar Reporte ERR-v8</button>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-12 bg-slate-200 flex justify-center custom-audit-scroll">
                <div id="printable-report" className="bg-white w-[216mm] min-h-[279mm] shadow-2xl p-[1.5cm] flex flex-col text-slate-900 font-sans relative my-10 animate-in zoom-in-95">
                    
                    <div className="flex justify-between items-start border-b-[4px] border-rose-600 pb-8 mb-10">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-rose-600 text-white rounded-3xl flex items-center justify-center font-black text-4xl shadow-lg">ERR</div>
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 text-slate-900">Informe Maestro de Incidencias</h1>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Depto. Inmobiliario • Auditoría de Excepciones</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-slate-950 uppercase tracking-tighter">Cristian Muñoz</p>
                            <p className="text-[10px] font-bold text-slate-600 uppercase">Control Interno Depto Inmobiliario</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-10">
                       <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200">
                          <p className="text-[9px] font-black text-rose-700 uppercase mb-1">Rechazos de Gestión</p>
                          <p className="text-2xl font-black text-rose-700">{errorLogs.filter(l => l.action === 'REJECT').length}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-300">
                          <p className="text-[9px] font-black text-slate-700 uppercase mb-1">Eliminaciones de Datos</p>
                          <p className="text-2xl font-black text-slate-900">{errorLogs.filter(l => l.action === 'DELETE').length}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-300">
                          <p className="text-[9px] font-black text-slate-700 uppercase mb-1">Total Excepciones</p>
                          <p className="text-2xl font-black text-slate-900">{errorLogs.length}</p>
                       </div>
                    </div>

                    <div className="flex-1">
                       <table className="w-full text-left">
                          <thead className="bg-slate-100 border-b border-slate-300">
                             <tr>
                                <th className="p-3 text-[10px] font-black uppercase text-slate-800">Fecha/Hora</th>
                                <th className="p-3 text-[10px] font-black uppercase text-slate-800">Operación</th>
                                <th className="p-3 text-[10px] font-black uppercase text-slate-800">Responsable</th>
                                <th className="p-3 text-[10px] font-black uppercase text-slate-800">Descripción Técnica</th>
                             </tr>
                          </thead>
                          <tbody>
                             {errorLogs.length === 0 ? (
                                <tr><td colSpan={4} className="p-10 text-center text-xs font-bold text-slate-600 italic">No se han registrado incidencias críticas en el periodo actual.</td></tr>
                             ) : (
                                errorLogs.map(log => (
                                   <tr key={`err-print-${log.id}`} className="border-b border-slate-200">
                                      <td className="p-3 text-[9px] font-mono text-slate-800">{new Date(log.timestamp).toLocaleString()}</td>
                                      <td className="p-3 text-center">
                                         <span className="text-[8px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 uppercase">{log.action}</span>
                                      </td>
                                      <td className="p-3 text-[9px] font-black uppercase text-slate-900">{log.user}</td>
                                      <td className="p-3 text-[9px] text-slate-800 uppercase italic">
                                         Ref: {log.entityId.substring(0,8)}... • {log.newValue || 'Excepción documentada'}
                                      </td>
                                   </tr>
                                ))
                             )}
                          </tbody>
                       </table>
                    </div>

                    <div className="mt-16 flex justify-between items-end border-t border-slate-300 pt-10">
                        <div className="text-[8px] font-mono text-slate-600 italic">Sello: {crypto.randomUUID().toUpperCase()}</div>
                        <div className="w-80 text-center border-t-2 border-slate-900 pt-4">
                            <p className="text-xs font-black uppercase text-slate-950 tracking-widest">Cristian Muñoz</p>
                            <p className="text-[10px] font-bold text-slate-600 uppercase mt-1">Control Interno Depto Inmobiliario</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL GLOSARIO ACCESIBLE DESDE AUDITORÍA */}
      {isGlosarioOpen && <ManualModal onClose={() => setIsGlosarioOpen(false)} />}

      <div className="p-3 bg-black/90 text-[8px] text-emerald-400 text-center font-bold tracking-[0.5em] border-t border-white/10 uppercase no-print">
        MONITOREO DE ACTIVIDAD • PROPIEDAD: CONTROL INTERNO DEPTO INMOBILIARIO
      </div>
    </div>
  );
};

export default AuditSheet;
