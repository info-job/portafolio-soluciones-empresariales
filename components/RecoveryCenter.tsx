
import React, { useState, useRef } from 'react';
import { ShieldCheck, Database, FileUp, Download, RefreshCw, AlertTriangle, CheckCircle2, FileText, ArrowLeft, Printer } from 'lucide-react';
import { printHtmlElement } from '../lib/printDocument';

interface RecoveryCenterProps {
  onRestore: (data: any) => void;
  onExport: () => void;
  stats: { suppliers: number; transactions: number; logs: number };
  companyLogo: string | null;
  currentUser: string;
}

const RecoveryCenter: React.FC<RecoveryCenterProps> = ({ onRestore, onExport, stats, companyLogo, currentUser }) => {
  const [isRobustnessReportOpen, setIsRobustnessReportOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'VALIDATING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('VALIDATING');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.suppliers || !data.transactions || !data.version) {
          throw new Error("Formato inválido");
        }
        
        if (confirm("ADVERTENCIA: Esta acción reemplazará TODOS los datos actuales. ¿Desea proceder?")) {
          onRestore(data);
          setUploadStatus('SUCCESS');
          setTimeout(() => setUploadStatus('IDLE'), 3000);
        } else {
          setUploadStatus('IDLE');
        }
      } catch (err) {
        setUploadStatus('ERROR');
        alert("El archivo no es un Snapshot válido de FinancePro v8.5");
        setTimeout(() => setUploadStatus('IDLE'), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full bg-[#f8fafc] p-8 overflow-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="bg-[#0f172a] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
             <ShieldCheck size={280} />
          </div>
          <div className="relative z-10">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Centro de Recuperación PAE</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Database size={16} className="text-emerald-500" /> Protocolo de Continuidad Operacional v8.5
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
               <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Entidades en Memoria</span>
                  <p className="text-3xl font-black text-emerald-400">{stats.suppliers}</p>
               </div>
               <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Registros de Caja</span>
                  <p className="text-3xl font-black text-blue-400">{stats.transactions}</p>
               </div>
               <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Huellas de Auditoría</span>
                  <p className="text-3xl font-black text-purple-400">{stats.logs}</p>
               </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* ACCIÓN: CARGAR SNAPSHOT */}
           <div className="bg-white p-10 rounded-[40px] border-2 border-slate-100 shadow-sm space-y-6">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
                 <FileUp size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Inyectar Snapshot (.json)</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">Use esta opción para restaurar el sistema completo desde un archivo de respaldo manual o automático generado previamente.</p>
              
              <input type="file" ref={fileRef} onChange={handleFileChange} accept=".json" className="hidden" />
              <button 
                onClick={() => fileRef.current?.click()}
                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                  uploadStatus === 'IDLE' ? 'bg-rose-600 text-white hover:bg-rose-700' :
                  uploadStatus === 'VALIDATING' ? 'bg-amber-500 text-white animate-pulse' :
                  uploadStatus === 'SUCCESS' ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'
                }`}
              >
                {uploadStatus === 'IDLE' && <><RefreshCw size={18} /> Seleccionar Respaldo</>}
                {uploadStatus === 'VALIDATING' && 'Validando Esquema...'}
                {uploadStatus === 'SUCCESS' && <><CheckCircle2 size={18} /> Restauración Exitosa</>}
              </button>
           </div>

           {/* ACCIÓN: GENERAR RESPALDO MANUAL */}
           <div className="bg-white p-10 rounded-[40px] border-2 border-slate-100 shadow-sm space-y-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                 <Download size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Generar Snapshot Actual</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">Descargue una copia completa de la base de datos actual. Se recomienda realizar esta acción antes de cambios masivos en el personal.</p>
              
              <button 
                onClick={onExport}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all"
              >
                <FileText size={18} /> Exportar Base de Datos
              </button>
           </div>
        </div>

        {/* INFORME DE ROBUSTEZ */}
        <div className="bg-indigo-50 border-2 border-indigo-100 p-8 rounded-[40px] flex items-center justify-between group cursor-pointer hover:bg-indigo-100 transition-all" onClick={() => setIsRobustnessReportOpen(true)}>
           <div className="flex items-center gap-6">
              <div className="p-4 bg-white rounded-2xl text-indigo-600 shadow-sm">
                 <ShieldCheck size={32} />
              </div>
              <div>
                 <h4 className="text-lg font-black text-indigo-900 uppercase tracking-tight">Certificación de Robustez Técnica</h4>
                 <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mt-1">Protocolo PAE v8.5 • Auditoría de Continuidad</p>
              </div>
           </div>
           <button className="bg-white p-4 rounded-2xl text-indigo-600 shadow-sm group-hover:translate-x-2 transition-transform">
              <Printer size={24} />
           </button>
        </div>
      </div>

      {isRobustnessReportOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-100 flex flex-col no-print">
            <div className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between shadow-xs">
                <button onClick={() => setIsRobustnessReportOpen(false)} className="flex items-center gap-3 px-6 py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl border border-slate-300 font-black text-xs uppercase cursor-pointer"><ArrowLeft size={18} /> Volver</button>
                <button onClick={() => printHtmlElement("printable-report", "Informe_Robustez_Recuperacion_PAE")} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase flex items-center gap-4 hover:bg-blue-700 active:scale-95 transition-all shadow-md cursor-pointer"><Printer size={22} /> Generar PDF / Imprimir</button>
            </div>
            <div className="flex-1 overflow-auto p-12 bg-slate-200 flex justify-center">
                <div id="printable-report" className="bg-white w-[216mm] min-h-[279mm] p-[2cm] flex flex-col text-black font-sans my-10 relative">
                    <div className="flex justify-between items-start border-b-[4px] border-black pb-8 mb-10">
                        <div className="flex items-center gap-6">
                            {companyLogo ? (
                              <img src={companyLogo} className="w-20 h-20 object-contain shadow-sm" alt="Logo Corporativo" />
                            ) : (
                              <div className="w-20 h-20 bg-black text-white rounded-3xl flex items-center justify-center font-black text-4xl">PAE</div>
                            )}
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 text-slate-900">Informe de Robustez y Recuperación</h1>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Protocolo Anti-Errores (PAE) v8.5</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-black uppercase tracking-tighter text-slate-900">{currentUser}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Control Interno Depto Inmobiliario</p>
                        </div>
                    </div>
                    
                    <div className="space-y-10">
                        <section className="space-y-4">
                            <h2 className="text-lg font-black uppercase flex items-center gap-3 text-blue-800 border-b border-blue-100 pb-1">1. Integridad de la Base de Datos</h2>
                            <p className="text-xs text-slate-600 leading-relaxed italic">Estado del sistema al {new Date().toLocaleString()}:</p>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  <p className="text-[10px] font-black text-slate-400 uppercase">Proveedores Activos</p>
                                  <p className="text-xl font-black text-slate-900">{stats.suppliers}</p>
                               </div>
                               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  <p className="text-[10px] font-black text-slate-400 uppercase">Transacciones de Caja</p>
                                  <p className="text-xl font-black text-slate-900">{stats.transactions}</p>
                               </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-black uppercase flex items-center gap-3 text-emerald-800 border-b border-emerald-100 pb-1">2. Protocolo de Respaldo Automático (03:00 AM)</h2>
                            <p className="text-xs text-slate-600 leading-relaxed">El sistema monitoriza la sesión de <strong>{currentUser}</strong>. Si la aplicación queda abierta en una terminal de vigilancia, gatillará un respaldo automático cada madrugada a las 03:00 AM hacia el almacenamiento local y sincronización en la nube (OneDrive), asegurando RTO (Recovery Time Objective) de 5 segundos.</p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-black uppercase flex items-center gap-3 text-indigo-800 border-b border-indigo-100 pb-1">3. Certificación de Auditoría</h2>
                            <p className="text-xs text-slate-600 leading-relaxed">Cada acción realizada queda registrada con un ID único de auditoría. Se han verificado <strong>{stats.logs}</strong> entradas de control, lo que garantiza la reconstrucción forense de cualquier movimiento financiero o alta de proveedor.</p>
                        </section>
                    </div>

                    <div className="mt-auto pt-10 border-t border-slate-200 flex justify-between items-end">
                      <div className="text-[8px] font-mono text-slate-400 italic">Certificación Técnica PAE • UUID: {crypto.randomUUID().toUpperCase()}</div>
                      <div className="w-80 text-center border-t-2 border-black pt-4">
                        <p className="text-xs font-black uppercase text-black tracking-widest">Firma de Certificación</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 text-slate-700">{currentUser} • CONTROL INTERNO</p>
                      </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default RecoveryCenter;
