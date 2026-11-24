
import React from 'react';
import { OfficialDocument } from '../types';
import { Printer, X, ArrowLeft, Mail, MapPin, Calendar, Clock, ShieldCheck } from 'lucide-react';
import { DEFAULT_ASSETFLOW_SVG } from '../lib/defaultLogo';
import { printHtmlElement } from '../lib/printDocument';

interface OfficialDocumentsReportProps {
  documents: OfficialDocument[];
  onClose: () => void;
  currentUser: string;
  companyLogo: string | null;
}

const OfficialDocumentsReport: React.FC<OfficialDocumentsReportProps> = ({ documents, onClose, currentUser, companyLogo }) => {
  const reportId = `OFICIOS-REP-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
  const today = new Date().toLocaleDateString('es-CL');

  const incomingCount = documents.filter(d => d.type === 'ENTRANTE').length;
  const outgoingCount = documents.filter(d => d.type === 'SALIENTE').length;

  return (
    <div className="fixed inset-0 z-[400] bg-slate-100 flex flex-col no-print overflow-hidden animate-in fade-in duration-500">
      {/* BARRA DE CONTROL SUPERIOR */}
      <div className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between shadow-sm z-20">
        <button onClick={onClose} className="flex items-center gap-3 px-6 py-3 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-2xl border border-slate-300 font-black text-xs uppercase tracking-widest transition-all">
          <ArrowLeft size={18} /> Volver al Centro de Oficios
        </button>
        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-indigo-900 font-black text-[10px] uppercase tracking-widest leading-none">Reporte de Gestión de Oficios</p>
              <p className="text-slate-500 text-[8px] font-black uppercase mt-1 italic font-mono">{reportId}</p>
           </div>
           <button onClick={() => printHtmlElement("printable-report", `Reporte_Gestion_Oficios_${reportId}`)} className="bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase flex items-center gap-4 hover:bg-indigo-800 shadow-md border border-indigo-300 active:scale-95 transition-all cursor-pointer">
              <Printer size={24} /> IMPRIMIR REPORTE
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-12 bg-slate-200 flex justify-center custom-audit-scroll">
        <div id="printable-report" className="bg-white w-[216mm] min-h-[279mm] shadow-xl border border-slate-300 p-[1.5cm] flex flex-col text-black font-sans relative my-10 animate-in zoom-in-95">
          
          {/* ENCABEZADO CORPORATIVO */}
          <div className="flex justify-between items-start border-b-[6px] border-slate-900 pb-8 mb-10">
            <div className="flex items-center gap-6">
              {companyLogo ? (
                <img src={companyLogo} className="w-28 h-28 object-contain" alt="Logo" />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} className="w-28 h-28 flex items-center justify-center [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:object-contain" />
              )}
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1 text-slate-900">Reporte de Oficios</h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">Departamento Inmobiliario • AssetFlow</p>
                <div className="mt-4 flex gap-3">
                   <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-slate-200">Documentación Registrada</span>
                   <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-indigo-200">{documents.length} Registros</span>
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-lg font-black text-slate-900 uppercase">Generado por:</p>
              <p className="text-sm font-black text-indigo-600 uppercase tracking-tight">{currentUser}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">{today}</p>
            </div>
          </div>

          {/* RESUMEN DE ESTADÍSTICAS */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Documentos</p>
              <p className="text-3xl font-black text-slate-900">{documents.length}</p>
            </div>
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
              <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">Oficios Entrantes</p>
              <p className="text-3xl font-black text-indigo-700">{incomingCount}</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-400 uppercase mb-2">Oficios Salientes</p>
              <p className="text-3xl font-black text-emerald-700">{outgoingCount}</p>
            </div>
          </div>

          {/* TABLA DE REGISTROS */}
          <div className="flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-3 px-2 text-[10px] font-black uppercase text-slate-900 w-24 border border-black">Fecha</th>
                  <th className="py-3 px-2 text-[10px] font-black uppercase text-slate-900 w-24 border border-black">Número</th>
                  <th className="py-3 px-2 text-[10px] font-black uppercase text-slate-900 w-16 border border-black">Tipo</th>
                  <th className="py-3 px-2 text-[10px] font-black uppercase text-slate-900 border border-black">Materia / Asunto</th>
                  <th className="py-3 px-2 text-[10px] font-black uppercase text-slate-900 w-32 border border-black">Gestión</th>
                  <th className="py-3 px-2 text-[10px] font-black uppercase text-slate-900 w-32 border border-black">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="h-12">
                    <td className="py-2 px-2 text-[10px] font-mono text-slate-600 border border-black">{doc.arrivalDate}</td>
                    <td className="py-2 px-2 text-[10px] font-black text-indigo-700 border border-black">#{doc.docNumber}</td>
                    <td className="py-2 px-2 text-[9px] font-black border border-black">
                      <span className={doc.type === 'ENTRANTE' ? 'text-indigo-600' : 'text-emerald-600'}>
                        {doc.type}
                      </span>
                    </td>
                    <td className="py-2 px-2 border border-black">
                      <p className="text-[10px] font-bold text-slate-800 uppercase leading-tight">{doc.subject}</p>
                      {doc.repairAddress && (
                        <p className="text-[8px] text-slate-400 uppercase mt-0.5 flex items-center gap-1">
                          <MapPin size={8} /> {doc.repairAddress}
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-2 border border-black">
                      <p className="text-[9px] font-black uppercase text-slate-700">{doc.managementType?.replace(/_/g, ' ') || 'PENDIENTE'}</p>
                      {doc.assignedTo && <p className="text-[8px] font-bold text-indigo-500 uppercase mt-0.5">{doc.assignedTo}</p>}
                    </td>
                    <td className="py-2 px-2 border border-black">
                      <span className="text-[9px] font-black uppercase bg-slate-100 px-2 py-1 rounded-md text-slate-600 border border-slate-200">
                        {doc.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CIERRE DE INFORME */}
          <div className="mt-10 pt-10 border-t-4 border-slate-900 flex justify-between items-end">
             <div className="space-y-1">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <ShieldCheck size={14}/> CONTROL DOCUMENTAL INMOBILIARIO
                </div>
                <div className="text-[8px] font-mono text-slate-300 italic">ID_REPORTE: {reportId}</div>
             </div>
             <div className="w-64 text-center border-t border-slate-300 pt-4">
                <p className="text-[10px] font-black uppercase text-black tracking-widest">{currentUser}</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 italic">Firma Responsable</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficialDocumentsReport;
