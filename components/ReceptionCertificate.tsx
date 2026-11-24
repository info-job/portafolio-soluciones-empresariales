import React from 'react';
import { WorkOrder } from '../types';
import { ShieldCheck, Calendar, User, FileText, CheckCircle2, Lock, Image as ImageIcon, File } from 'lucide-react';
import { DEFAULT_ASSETFLOW_SVG } from '../lib/defaultLogo';

interface ReceptionCertificateProps {
  data: WorkOrder;
  companyLogo: string | null;
}

const ReceptionCertificate: React.FC<ReceptionCertificateProps> = ({ data, companyLogo }) => {
  const now = new Date();
  const receptionDate = data.receptionDate || now.toISOString().split('T')[0];
  
  return (
    <div id="printable-report" className="bg-white w-[216mm] min-h-[279mm] shadow-2xl p-[1.5cm] flex flex-col text-black font-sans relative border border-slate-300 overflow-hidden">
        
        {/* HEADER INSTITUCIONAL */}
        <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-slate-900">
           <div className="text-[10px] font-bold uppercase space-y-1">
              <p className="text-[12px] font-black">DEPARTAMENTO INMOBILIARIO</p>
              <p>Unidad de Control Interno y Activos</p>
              <p>Paseo Bulnes N°157, Piso 1°</p>
           </div>
           <div className="w-48 h-20 flex items-center justify-end">
              {companyLogo ? (
                <img src={companyLogo} className="max-h-full max-w-full object-contain" alt="Logo" referrerPolicy="no-referrer" />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} className="w-full h-full flex items-center justify-end [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:object-contain" />
              )}
           </div>
        </div>

        <div className="text-center space-y-2 mb-10">
           <h1 className="text-3xl font-black uppercase tracking-tighter">Acta de Recepción Conforme</h1>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Certificado de Cumplimiento Técnico y Documental</p>
        </div>

        {/* CUADRO DE REFERENCIAS CRUZADAS */}
        <div className="grid grid-cols-2 gap-0 border-2 border-black mb-10">
           <div className="p-4 border-r border-b border-black bg-slate-50">
              <span className="text-[10px] font-black text-slate-500 uppercase block">Folio Orden de Trabajo</span>
              <p className="text-lg font-black">{data.folio}</p>
           </div>
           <div className="p-4 border-b border-black bg-emerald-50">
              <span className="text-[10px] font-black text-emerald-600 uppercase block">N° Factura / Boleta (Respaldo)</span>
              <p className="text-lg font-black text-emerald-900">#{data.receptionInvoiceNumber || 'NINGUNO'}</p>
           </div>
           <div className="p-4 border-r border-black">
              <span className="text-[10px] font-black text-slate-500 uppercase block">Fecha de Recepción</span>
              <p className="text-sm font-bold">{receptionDate}</p>
           </div>
           <div className="p-4">
              <span className="text-[10px] font-black text-slate-500 uppercase block">Usuario Responsable</span>
              <p className="text-sm font-bold uppercase">{data.receptionUser}</p>
           </div>
        </div>

        {/* CUERPO DEL ACTA */}
        <div className="space-y-6 flex-1">
           <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
              <p className="text-xs leading-relaxed text-justify italic">
                "Por intermedio de la presente, el Departamento Inmobiliario de la Corporación Inmobiliaria de Chile, certifica que con fecha <strong>{receptionDate}</strong>, se ha procedido a la recepción a entera conformidad de los servicios/suministros detallados a continuación, prestados por el proveedor <strong>{data.supplierName}</strong> (RUT: {data.supplierTaxId}). Los trabajos cumplen con las especificaciones técnicas requeridas y los estándares de calidad de la corporación."
              </p>
           </div>

           <h3 className="text-xs font-black uppercase tracking-widest border-b border-black pb-1">Detalle de Bienes / Servicios Recepcionados</h3>
           <table className="w-full border-collapse">
              <thead>
                 <tr className="bg-slate-50 border-y border-black">
                    <th className="p-2 text-left text-[10px] font-black uppercase">Descripción Técnica</th>
                    <th className="p-2 text-center text-[10px] font-black uppercase w-24">Cantidad</th>
                    <th className="p-2 text-center text-[10px] font-black uppercase w-32">Estado</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                 {data.items.map((item) => (
                    <tr key={item.id}>
                       <td className="p-2 text-[10px] uppercase font-bold text-slate-700">{item.description}</td>
                       <td className="p-2 text-center text-[10px] font-mono">{item.receivedQuantity}</td>
                       <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-[9px] font-black text-emerald-600">
                             <CheckCircle2 size={12} /> CONFORME
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>

           <div className="mt-8 space-y-2">
              <h4 className="text-[10px] font-black uppercase text-slate-500">Ubicación del Activo:</h4>
              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 text-[10px] font-bold uppercase">
                 {data.propertyLabel} - {data.deliveryAddress}
              </div>
           </div>

           {/* SECCIÓN DE RESPALDOS ADJUNTOS EN LA RECEPCIÓN */}
           {((data.receptionPhotos && data.receptionPhotos.length > 0) || (data.receptionDocuments && data.receptionDocuments.length > 0)) && (
              <div className="mt-8 space-y-4 pt-4 border-t-2 border-dashed border-slate-300">
                 <h3 className="text-xs font-black uppercase tracking-widest border-b border-black pb-1 font-bold">Respaldos de Recepción Conforme</h3>
                 
                 {data.receptionPhotos && data.receptionPhotos.length > 0 && (
                    <div className="space-y-2">
                       <h4 className="text-[9px] font-black uppercase text-slate-500 font-bold flex items-center gap-1">
                          <ImageIcon size={12} /> Registros Fotográficos de Terreno:
                       </h4>
                       <div className="grid grid-cols-2 gap-4">
                          {data.receptionPhotos.map((photo, i) => (
                             <div key={i} className="border-2 border-black rounded-lg overflow-hidden h-36 bg-slate-100 flex items-center justify-center relative">
                                <img src={photo} alt={`Fotografía ${i+1}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[8px] px-2 py-0.5 rounded font-mono">FOTO {i+1}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {data.receptionDocuments && data.receptionDocuments.length > 0 && (
                    <div className="space-y-2">
                       <h4 className="text-[9px] font-black uppercase text-slate-500 font-bold flex items-center gap-1">
                          <File size={12} /> Documentación Técnica de Respaldo:
                       </h4>
                       <div className="grid grid-cols-2 gap-2">
                          {data.receptionDocuments.map((doc, i) => (
                             <div key={i} className="border border-slate-300 p-2.5 rounded-lg bg-slate-50 flex items-center justify-between text-[10px]">
                                <div className="truncate pr-2">
                                   <p className="font-bold uppercase truncate text-slate-800">{doc.name}</p>
                                   <p className="text-[8px] font-mono text-slate-400">TAMAÑO: {doc.size || 'N/A'}</p>
                                </div>
                                <span className="bg-black text-white text-[8px] font-bold px-2 py-1 rounded shrink-0">ADJUNTO</span>
                             </div>
                          ))}
                        </div>
                     </div>
                 )}
              </div>
           )}
        </div>

        {/* FIRMAS REFORZADAS */}
        <div className="mt-20 grid grid-cols-2 gap-20">
           <div className="text-center space-y-2">
              <div className="h-24 border-b border-black"></div>
              <p className="text-[10px] font-black uppercase">{data.receptionUser}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Receptor Técnico Inmobiliario</p>
              <p className="text-[8px] text-slate-400">Firma y Timbre</p>
           </div>
           <div className="text-center space-y-2">
              <div className="h-24 border-b border-black"></div>
              <p className="text-[10px] font-black uppercase">VB JEFATURA / CONTABILIDAD</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Validación de Legajo para Pago</p>
              <p className="text-[8px] text-slate-400">Fecha de Validación</p>
           </div>
        </div>

        <div className="mt-auto pt-10 border-t border-slate-200 flex justify-between items-center opacity-50">
           <div className="flex items-center gap-2 text-[8px] font-mono text-slate-400 uppercase italic">
              <Lock size={10} /> Hash_Cert_ID: {data.folio}_RECEP_{data.receptionInvoiceNumber || 'S-N'}
           </div>
           <p className="text-[8px] font-black uppercase text-slate-400 italic">AssetFlow Finance v8.5 • Control de Integridad Patrimonial</p>
        </div>
    </div>
  );
};

export default ReceptionCertificate;
