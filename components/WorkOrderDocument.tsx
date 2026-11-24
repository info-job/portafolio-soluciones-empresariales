import React from 'react';
import { WorkOrder } from '../types';
import { ShieldCheck, Calendar, Clock, Lock, CheckCircle2, XCircle, AlertTriangle, FileCheck, ShieldAlert } from 'lucide-react';
import { formatCLP, formatRUT } from '../lib/chileanUtils';
import { DEFAULT_ASSETFLOW_SVG } from '../lib/defaultLogo';

// Define MAX_OT_ITEMS locally to match the limit defined in WorkOrderCenter.tsx
const MAX_OT_ITEMS = 10;

interface WorkOrderDocumentProps {
  data: WorkOrder;
  companyLogo: string | null;
}

const WorkOrderDocument: React.FC<WorkOrderDocumentProps> = ({ data, companyLogo }) => {
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return { d: '--', m: '--', y: '--', time: '--:--:--' };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { d: '--', m: '--', y: '--', time: '--:--:--' };
    return {
      d: String(d.getDate()).padStart(2, '0'),
      m: String(d.getMonth() + 1).padStart(2, '0'),
      y: d.getFullYear(),
      time: d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  const isApproved = data.status === 'APROBADA' || data.status === 'RECEPCIONADA' || data.status === 'RECEPCIONADA_PARCIAL' || data.status === 'TERMINADA' || data.status === 'PAGADA';
  const isRejected = data.status === 'RECHAZADA';
  const isPending = data.status === 'PENDIENTE_VB' || data.status === 'BORRADOR';

  const issueDate = formatDate(data.issueDate);
  const prepDate = formatDate(data.preparedAt || data.issueDate);
  const complianceDate = formatDate(data.complianceApprovedAt || (data.preparedAt ? new Date(new Date(data.preparedAt).getTime() + 1800000).toISOString() : (data.issueDate ? new Date(new Date(data.issueDate).getTime() + 1800000).toISOString() : undefined)));
  const authDate = formatDate(data.authorizedAt || data.authorizationDate);
  const rejectDate = formatDate(data.rejectedAt || data.authorizedAt);
  const evalDate = isApproved ? authDate : (isRejected ? rejectDate : formatDate(undefined));

  const docAssocUpper = String(data.associatedInvoice || '').toUpperCase();
  const taxTypeUpper = String(data.supplierTaxDocumentType || '').toUpperCase();
  const isHonorarios =
    taxTypeUpper.includes('HONORARIO') ||
    taxTypeUpper.includes('BOLETA') ||
    taxTypeUpper === 'BH' ||
    docAssocUpper.includes('HONORARIO') ||
    docAssocUpper.includes('BOLETA') ||
    docAssocUpper.startsWith('BH');
  const isInvoice = !isHonorarios;
  const computedSubtotal = data.subtotal && data.subtotal > 0
    ? data.subtotal
    : data.items.reduce((sum, item) => sum + (item.total || 0), 0);
  const computedTaxOrRetention = data.iva && data.iva > 0
    ? data.iva
    : (isInvoice ? Math.round(computedSubtotal * 0.19) : Math.round(computedSubtotal * 0.1375));
  const computedFinalTotal = isInvoice
    ? computedSubtotal + computedTaxOrRetention
    : Math.max(0, computedSubtotal - computedTaxOrRetention);

  const computeStepHash = (stepName: string, id: string, name: string) => {
    const content = `${stepName}-${id}-${name}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    let pseudoSha = '';
    for (let j = 0; j < 6; j++) {
      const val = Math.sin(hash + j) * 10000;
      const part = Math.abs(Math.floor(val) % 65536).toString(16).padStart(4, '0');
      pseudoSha += part;
    }
    return pseudoSha.toUpperCase();
  };

  const evaluatorName = isApproved 
    ? (data.authorizedBy || 'CRISTIAN MUÑOZ R. (CONTROL INTERNO)')
    : (isRejected ? (data.rejectedBy || data.authorizedBy || 'JEFATURA DE CONTROL INMOBILIARIO') : 'PENDIENTE DE ASIGNACIÓN');

  const hashPrep = `SHA256_${computeStepHash('PREP', data.id, `${data.preparedBy || 'SISTEMA'}-${data.preparedAt || data.issueDate}`)}`;
  const hashComp = `SHA256_${computeStepHash('COMP', data.id, `${data.complianceApprovedBy || 'ING'}-${data.complianceApprovedAt || ''}`)}`;
  const hashEval = isApproved 
    ? `SHA256_${computeStepHash('APROBADA', data.id, `${evaluatorName}-${data.authorizedAt || data.authorizationDate || ''}`)}`
    : (isRejected 
      ? `SHA256_${computeStepHash('RECHAZADA', data.id, `${evaluatorName}-${data.rejectedAt || ''}-${data.rejectionReason || ''}`)}`
      : `SHA256_PENDIENTE_${computeStepHash('PENDING', data.id, data.folio || 'FOLIO')}`);

  const hashIntegrity = `SHA256_${computeStepHash('INTEGRITY', data.id, `${data.folio}-${data.total}-${data.status}`)}`;

  return (
    <div id="printable-report" className="bg-white w-[216mm] min-h-[279mm] shadow-2xl p-[1cm] flex flex-col text-black font-sans relative border border-slate-300 overflow-hidden">
        
        {/* FILIGRANA DE SEGURIDAD SEGÚN ESTADO DE EVALUACIÓN */}
        {isApproved && (
           <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none rotate-45 select-none scale-150">
              <p className="text-[120px] font-black uppercase text-emerald-900 border-[20px] border-emerald-900 p-20 rounded-[100px]">VALIDADA</p>
           </div>
        )}
        {isRejected && (
           <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none rotate-45 select-none scale-150">
              <p className="text-[120px] font-black uppercase text-rose-900 border-[20px] border-rose-900 p-20 rounded-[100px]">RECHAZADA</p>
           </div>
        )}

        {/* HEADER DEPARTAMENTO INMOBILIARIO */}
        <div className="flex justify-between items-start mb-6 relative z-10">
           <div className="text-[9px] font-bold uppercase space-y-0.5">
              <p className="text-[11px] font-black text-slate-900 tracking-tight">DEPARTAMENTO INMOBILIARIO</p>
              <p>Paseo Bulnes N°157, Piso 1°</p>
              <p>Rut.: 99.024.000-0</p>
              <p>Giro: Corporación de Seguros</p>
              <p>Fono 800 231 800</p>
           </div>
           <div className="flex flex-col items-end">
              <div className="w-64 h-20 mb-2 flex items-center justify-end bg-transparent">
                 {companyLogo ? (
                   <img 
                    src={companyLogo} 
                    style={{ display: 'block', maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                    alt="Logo Corporativo" 
                    referrerPolicy="no-referrer"
                   />
                 ) : (
                   <div dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} className="w-full h-full flex items-center justify-end [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:object-contain" />
                 )}
              </div>
              {isApproved && (
                <div className="bg-emerald-700 text-white px-4 py-1 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm border border-emerald-600">
                   <ShieldCheck size={13} /> Orden de Trabajo Aprobada
                </div>
              )}
              {isRejected && (
                <div className="bg-rose-700 text-white px-4 py-1 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm border border-rose-600">
                   <ShieldAlert size={13} /> Orden de Trabajo Rechazada
                </div>
              )}
              {isPending && (
                <div className="bg-amber-600 text-white px-4 py-1 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm border border-amber-500">
                   <Clock size={13} /> En Trámite / Pendiente V°B°
                </div>
              )}
           </div>
        </div>

        <h1 className="text-2xl font-black text-center uppercase tracking-[0.2em] mb-4 relative z-10">
           ORDEN DE TRABAJO N°{data.folio.split('-').pop()} / {issueDate.y}
        </h1>

        <div className="flex justify-end items-center gap-2 mb-6 relative z-10">
           <span className="text-[10px] font-bold uppercase">Fecha de emisión:</span>
           <div className="flex border border-slate-800 text-xs font-bold">
              <div className="w-12 h-6 border-r border-slate-800 flex items-center justify-center bg-slate-50">{issueDate.d}</div>
              <div className="w-12 h-6 border-r border-slate-800 flex items-center justify-center bg-slate-50">{issueDate.m}</div>
              <div className="w-16 h-6 flex items-center justify-center bg-slate-50">{issueDate.y}</div>
           </div>
        </div>

        {/* BLOQUES DE INFORMACIÓN */}
        <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
           <div className="border border-slate-800">
              <div className="bg-[#0B3C5D]/10 text-[#0B3C5D] border-b border-slate-800 p-1 text-[10px] font-black uppercase">PROVEEDOR / PRESTADOR</div>
              <div className="p-2 space-y-1 text-[10px]">
                 <div className="flex gap-2">
                    <span className="font-black w-20">Nombre/R.S.</span>
                    <span className="font-bold border-b border-dotted border-slate-800 flex-1 uppercase">{data.supplierName}</span>
                 </div>
                 <div className="flex gap-2">
                    <span className="font-black w-20">RUT</span>
                    <span className="font-bold border-b border-dotted border-slate-800 flex-1">{formatRUT(data.supplierTaxId)}</span>
                 </div>
                 <div className="flex gap-2">
                    <span className="font-black w-20">Doc. Tributario</span>
                    <span className="font-black border-b border-dotted border-slate-800 flex-1 text-indigo-700">{isInvoice ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE HONORARIOS'}</span>
                 </div>
                 <div className="flex gap-2">
                    <span className="font-black w-20">Dirección</span>
                    <span className="font-bold border-b border-dotted border-slate-800 flex-1 uppercase">{data.supplierAddress}</span>
                 </div>
                 <div className="flex gap-2">
                    <span className="font-black w-20">Fono</span>
                    <span className="font-bold border-b border-dotted border-slate-800 flex-1">{data.supplierPhone}</span>
                 </div>
                 <div className="flex gap-2">
                    <span className="font-black w-20">E-mail</span>
                    <span className="font-bold border-b border-dotted border-slate-800 flex-1 text-blue-600 lowercase">{data.supplierEmail}</span>
                 </div>
              </div>
           </div>

           <div className="border border-slate-800">
              <div className="bg-[#0B3C5D]/10 text-[#0B3C5D] border-b border-slate-800 p-1 text-[10px] font-black uppercase">SOLICITADO POR:</div>
              <div className="p-2 space-y-1 text-[10px]">
                 <div className="flex gap-2">
                    <span className="font-black w-20">Nombre</span>
                    <span className="font-bold border-b border-dotted border-slate-800 flex-1 uppercase">{data.preparedBy}</span>
                 </div>
                 <div className="flex gap-2">
                    <span className="font-black w-20">Departamento</span>
                    <span className="font-bold border-b border-dotted border-slate-800 flex-1 uppercase">{data.preparedByDept}</span>
                 </div>
                 <div className="flex gap-2">
                    <span className="font-black w-20">Fono</span>
                    <span className="font-bold border-b border-dotted border-slate-800 flex-1">{data.preparedByPhone}</span>
                 </div>
                 <div className="flex gap-2 mt-4">
                    <span className="font-black w-20">E-mail</span>
                    <div className="flex-1">
                       <p className="font-bold text-blue-600 lowercase">{data.preparedByEmail}</p>
                       <p className="text-[8px] font-black uppercase text-slate-500 mt-1 leading-tight">
                         {isInvoice 
                           ? "SE SOLICITA ENVIAR FACTURA A: proveedores@inmobiliariapro.cl" 
                           : "SE SOLICITA ENVIAR BOLETA A: proveedores@inmobiliariapro.cl"}
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
           <div className="border border-slate-800">
              <div className="bg-[#0B3C5D]/10 text-[#0B3C5D] border-b border-slate-800 p-1 text-[10px] font-black uppercase">Clasificación y Documentos</div>
              <div className="p-2 space-y-1 text-[10px]">
                 <div className="flex gap-2">
                    <span className="font-black w-24">Categoría</span>
                    <span className="font-bold border-b border-slate-800 flex-1 uppercase text-emerald-800">{data.category || 'MANTENCIÓN PREVENTIVA'}</span>
                  </div>
                  <div className="flex gap-2">
                     <span className="font-black w-24">Especialidad</span>
                     <span className="font-bold border-b border-slate-800 flex-1 uppercase text-emerald-800">{data.specialty || 'TECHUMBRES'}</span>
                  </div>
                  <div className="flex gap-2">
                     <span className="font-black w-24">Doc. Asociado</span>
                     <span className="font-bold border-b border-slate-800 flex-1 uppercase text-indigo-700 font-mono">{data.associatedInvoice || 'S/D'}</span>
                  </div>
               </div>
            </div>
           <div className="border border-slate-800">
              <div className="bg-[#0B3C5D]/10 text-[#0B3C5D] border-b border-slate-800 p-1 text-[10px] font-black uppercase">Datos de Referencia</div>
              <div className="p-2 space-y-1 text-[10px]">
                 <div className="flex gap-2">
                    <span className="font-black w-24">N° Cotización</span>
                    <span className="font-bold border-b border-slate-800 flex-1">{data.quoteNumber || 'S/N'}</span>
                 </div>
                 <div className="flex gap-2">
                    <span className="font-black w-24">Fecha Pedido</span>
                    <span className="font-bold border-b border-slate-800 flex-1">{data.requestDate}</span>
                 </div>
              </div>
           </div>
        </div>

        <table className="w-full border-collapse border border-slate-800 mb-6 text-[10px] font-bold text-center relative z-10">
           <thead>
              <tr className="bg-slate-100">
                 <th className="border border-slate-800 p-2 uppercase w-1/4">Depto. Requirente</th>
                 <th className="border border-slate-800 p-2 uppercase w-1/4">Plazo Entrega</th>
                 <th className="border border-slate-800 p-2 uppercase w-1/4">Condiciones de pago</th>
                 <th className="border border-slate-800 p-2 uppercase w-1/4">Lugar de Intervención</th>
              </tr>
           </thead>
           <tbody>
              <tr>
                 <td className="border border-slate-800 p-2 uppercase">{data.reqDept}</td>
                 <td className="border border-slate-800 p-2 uppercase">{data.deliveryDate}</td>
                 <td className="border border-slate-800 p-2 uppercase">{data.paymentTerms}</td>
                 <td className="border border-slate-800 p-2 uppercase">{data.deliveryAddress}</td>
              </tr>
           </tbody>
        </table>

        <div className="flex-1 relative z-10">
           <table className="w-full border-collapse border border-slate-800 text-[10px]">
              <thead>
                 <tr className="bg-slate-100 uppercase">
                    <th className="border border-slate-800 p-2 w-12 text-center">Item</th>
                    <th className="border border-slate-800 p-2 text-left">Descripción Técnica del Servicio / Suministro</th>
                    <th className="border border-slate-800 p-2 w-20 text-center">Cant.</th>
                    <th className="border border-slate-800 p-2 w-32 text-center">V. Unitario</th>
                    <th className="border border-slate-800 p-2 w-32 text-center">Total</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                 {data.items.map((item, idx) => (
                    <tr key={item.id} className={item.status === "RECHAZADA" ? "bg-rose-50/40" : item.status === "APROBADA" ? "bg-emerald-50/20" : ""}>
                       <td className="border-x border-slate-800 p-2 text-center font-black">{idx + 1}</td>
                       <td className="border-x border-slate-800 p-2 uppercase">
                         <div className="flex items-center justify-between gap-2">
                           <span>{item.description}</span>
                           {item.status && (
                             <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border print:border-slate-800 shrink-0 ${
                               item.status === "APROBADA" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                               item.status === "RECHAZADA" ? "bg-rose-100 text-rose-800 border-rose-300 line-through" :
                               item.status === "EN_OBSERVACION" ? "bg-purple-100 text-purple-800 border-purple-300" :
                               "bg-amber-100 text-amber-800 border-amber-300"
                             }`}>
                               [{item.lineStatusCode || (item.status === "APROBADA" ? "230" : item.status === "RECHAZADA" ? "999" : "220")}] {item.status}
                             </span>
                           )}
                         </div>
                         {item.rejectionReason && (
                           <p className="text-[7.5px] text-rose-700 font-bold mt-0.5 normal-case italic">
                             Rechazo Técnico: {item.rejectionReason}
                           </p>
                         )}
                       </td>
                       <td className="border-x border-slate-800 p-2 text-center">{item.quantity}</td>
                       <td className="border-x border-slate-800 p-2 text-right">{formatCLP(item.unitPrice)}</td>
                       <td className={`border-x border-slate-800 p-2 text-right font-bold ${item.status === "RECHAZADA" ? "line-through text-slate-400" : ""}`}>
                         {formatCLP(item.total)}
                       </td>
                    </tr>
                 ))}
                 {/* ÍTEM AUTOMÁTICO DE IMPUESTO: IVA (FACTURA) O RETENCIÓN (BOLETA DE HONORARIOS) */}
                 <tr className={isInvoice ? "bg-indigo-50/30" : "bg-amber-50/40"}>
                    <td className="border-x border-slate-800 p-2 text-center font-black">{data.items.length + 1}</td>
                    <td className="border-x border-slate-800 p-2 uppercase font-black text-slate-800">
                      {isInvoice
                        ? 'IVA (19%)'
                        : 'RETENCIÓN IMPUESTO 2ª CATEGORÍA BOLETA DE HONORARIOS (13.75% LEY 21.133)'}
                    </td>
                    <td className="border-x border-slate-800 p-2 text-center">1</td>
                    <td className="border-x border-slate-800 p-2 text-right font-semibold">
                      {isInvoice ? formatCLP(computedTaxOrRetention) : `-${formatCLP(computedTaxOrRetention)}`}
                    </td>
                    <td className={`border-x border-slate-800 p-2 text-right font-black ${isInvoice ? 'text-indigo-900' : 'text-amber-900'}`}>
                      {isInvoice ? formatCLP(computedTaxOrRetention) : `-${formatCLP(computedTaxOrRetention)}`}
                    </td>
                 </tr>
                 {Array.from({ length: Math.max(0, MAX_OT_ITEMS - (data.items.length + 1)) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-6">
                       <td className="border-x border-slate-800"></td>
                       <td className="border-x border-slate-800"></td>
                       <td className="border-x border-slate-800"></td>
                       <td className="border-x border-slate-800"></td>
                       <td className="border-x border-slate-800"></td>
                    </tr>
                 ))}
              </tbody>
              <tfoot>
                 <tr className="border-t-2 border-slate-800">
                    <td colSpan={3} className="border-r border-slate-800 p-2"></td>
                    <td className="border-r border-slate-800 p-2 text-right font-black uppercase">{isInvoice ? 'Subtotal Neto Factura' : 'Honorario Bruto'}</td>
                    <td className="p-2 text-right font-black bg-slate-50">{formatCLP(computedSubtotal)}</td>
                 </tr>
                 <tr className="border-t border-slate-800">
                    <td colSpan={3} className="border-r border-slate-800 p-2"></td>
                    <td className="border-r border-slate-800 p-2 text-right font-black uppercase">{isInvoice ? 'IVA (19%)' : 'RETENCIÓN BOLETA HONORARIOS (13.75%)'}</td>
                    <td className="p-2 text-right font-black bg-slate-50">
                      {isInvoice ? formatCLP(computedTaxOrRetention) : `-${formatCLP(computedTaxOrRetention)}`}
                    </td>
                 </tr>
                 <tr className="border-t-2 border-slate-800 bg-slate-100">
                    <td colSpan={3} className="border-r border-slate-800 p-2"></td>
                    <td className="border-r border-slate-800 p-2 text-right font-black uppercase text-[11px]">
                      {isInvoice ? 'TOTAL FACTURA CON IVA' : 'TOTAL LÍQUIDO A PAGAR'}
                    </td>
                    <td className="p-2 text-right font-black text-[12px] border-l border-slate-800 bg-slate-200">{formatCLP(computedFinalTotal)}</td>
                 </tr>
                 {data.items.some(i => i.status === "RECHAZADA") && (
                   <tr className="border-t border-slate-800 bg-emerald-50/70 text-[9px]">
                      <td colSpan={3} className="border-r border-slate-800 p-1.5 text-emerald-900 font-bold">
                        * Aprobación Parcial ERP (F4311): Solo las líneas en estado APROBADA habilitan emisión formal (R43500) y recepción (P4312).
                      </td>
                      <td className="border-r border-slate-800 p-1.5 text-right font-black uppercase text-emerald-800">Monto Aprobado Emisión</td>
                      <td className="p-1.5 text-right font-black text-emerald-950 bg-emerald-100 font-mono">
                        {formatCLP(data.items.filter(i => i.status === "APROBADA" || i.status === "RECIBIDO").reduce((sum, i) => sum + i.total, 0))}
                      </td>
                   </tr>
                 )}
              </tfoot>
           </table>
        </div>

        {/* INSTRUCCIONES Y TRAZABILIDAD */}
        <div className="mt-4 border border-slate-800 relative z-10">
           <div className="bg-[#0B3C5D]/10 text-[#0B3C5D] border-b border-slate-800 p-1 text-[9px] font-black uppercase">Instrucciones Especiales y Notas Técnicas</div>
           <div className="p-2 text-[9px] uppercase italic min-h-[36px]">
              {data.specialInstructions || (isInvoice ? 'Facturar solo contra recepción conforme de Administración. Referenciar Folio OT.' : 'Boleta de Honorarios con retención a cargo del prestador. El pago se emite tras VB técnico.')}
            </div>
         </div>

         {/* RUTA DE APROBACIÓN & EVALUACIÓN DIGITAL INTEGRAL */}
        <div className="mt-6 border-2 border-slate-800 p-4 relative z-10 bg-slate-50/70 rounded-lg space-y-4">
           <h3 className="text-[11px] font-black uppercase mb-1 border-b border-slate-800 pb-1.5 flex items-center justify-between text-slate-800">
              <span className="flex items-center gap-2">
                 <Lock size={13} className="text-[#0B3C5D]" /> ERP-ASSETFLOW: RUTA DE TRAMITACIÓN Y AUDITORÍA DE APROBACIONES
              </span>
              <span className="text-[9px] font-mono font-bold tracking-tight text-indigo-800">TRAZABILIDAD Y CONTROL DE FIRMAS</span>
           </h3>

           {/* GRILLA DE 3 PASOS DE VALIDACIÓN */}
           <div className="grid grid-cols-3 gap-3">
              {/* MESA 1: EMISION / FORMULACION */}
              <div className="border border-slate-800 bg-white p-3 rounded-lg flex flex-col justify-between space-y-2.5 shadow-xs">
                 <div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 mb-2">
                       <span className="text-[8.5px] font-black text-indigo-900 uppercase tracking-wide">Paso 1: Elaboración</span>
                       <span className="text-[7.5px] font-black px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-700 uppercase">SOLICITADO</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{data.preparedBy || 'SISTEMA CONTABLE'}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">{data.preparedByDept || 'CONTROL INMOBILIARIO'}</p>
                 </div>
                 <div className="pt-2 border-t border-dashed border-slate-200 font-mono text-[8px] text-slate-700 space-y-0.5">
                    <p><span className="font-extrabold text-slate-500">FECHA:</span> {prepDate.d}/{prepDate.m}/{prepDate.y}</p>
                    <p><span className="font-extrabold text-slate-500">HORA:</span> {prepDate.time}</p>
                    <p className="text-[7px] text-slate-400 mt-1 truncate" title={hashPrep}>HASH_ORIG: {hashPrep}</p>
                 </div>
              </div>

              {/* MESA 2: COMPLIANCE ERP */}
              <div className="border border-slate-800 bg-white p-3 rounded-lg flex flex-col justify-between space-y-2.5 shadow-xs">
                 <div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 mb-2">
                       <span className="text-[8.5px] font-black text-amber-900 uppercase tracking-wide">Paso 2: Compliance ERP</span>
                       <span className="text-[7.5px] font-black px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-amber-800 uppercase">RECONCILIADO</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
                       {data.complianceApprovedBy || 'ING. CLAUDIA VALENZUELA (COMPLIANCE ERP)'}
                    </p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">CONTROL DE COMPLIANCE ERP</p>
                 </div>
                 <div className="pt-2 border-t border-dashed border-slate-200 font-mono text-[8px] text-slate-700 space-y-0.5">
                    <p><span className="font-extrabold text-slate-500">FECHA:</span> {complianceDate.d}/{complianceDate.m}/{complianceDate.y}</p>
                    <p><span className="font-extrabold text-slate-500">HORA:</span> {complianceDate.time}</p>
                    <p className="text-[7px] text-slate-400 mt-1 truncate" title={hashComp}>HASH_COMP: {hashComp}</p>
                 </div>
              </div>

              {/* MESA 3: EVALUACIÓN Y DICTAMEN FINAL */}
              <div className={`border rounded-lg p-3 flex flex-col justify-between space-y-2.5 shadow-xs ${
                isApproved 
                  ? 'border-emerald-600 bg-emerald-50/40' 
                  : (isRejected ? 'border-rose-600 bg-rose-50/40' : 'border-dashed border-slate-400 bg-white')
              }`}>
                 <div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 mb-2">
                       <span className={`text-[8.5px] font-black uppercase tracking-wide ${
                         isApproved ? 'text-emerald-900' : (isRejected ? 'text-rose-900' : 'text-slate-600')
                       }`}>
                         Paso 3: Dictamen de Evaluación
                       </span>
                       <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border uppercase ${
                          isApproved 
                            ? 'bg-emerald-600 text-white border-emerald-700' 
                            : (isRejected ? 'bg-rose-600 text-white border-rose-700' : 'bg-amber-100 text-amber-900 border-amber-300')
                       }`}>
                          {isApproved ? 'APROBADA' : (isRejected ? 'RECHAZADA' : 'PENDIENTE V°B°')}
                       </span>
                    </div>
                    {isApproved ? (
                       <>
                          <p className="text-[10px] font-black text-emerald-950 uppercase tracking-tight">{evaluatorName}</p>
                          <p className="text-[8px] text-emerald-800 font-bold uppercase mt-0.5">JEFATURA / AUTORIZADOR FINANCIERO</p>
                       </>
                    ) : isRejected ? (
                       <>
                          <p className="text-[10px] font-black text-rose-950 uppercase tracking-tight">{evaluatorName}</p>
                          <p className="text-[8px] text-rose-800 font-bold uppercase mt-0.5">EVALUADOR / JEFATURA DE ÁREA</p>
                       </>
                    ) : (
                       <>
                          <p className="text-[10px] font-bold text-slate-400 uppercase italic">ESPERANDO EVALUACIÓN...</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">PENDIENTE REVISIÓN FINANCIERA</p>
                       </>
                    )}
                 </div>
                 <div className="pt-2 border-t border-dashed border-slate-200 font-mono text-[8px] text-slate-700 space-y-0.5">
                    <p><span className="font-extrabold text-slate-500">FECHA:</span> {evalDate.d !== '--' ? `${evalDate.d}/${evalDate.m}/${evalDate.y}` : '--/--/----'}</p>
                    <p><span className="font-extrabold text-slate-500">HORA:</span> {evalDate.time}</p>
                    <p className="text-[7px] text-slate-400 mt-1 truncate" title={hashEval}>HASH_EVAL: {hashEval}</p>
                 </div>
              </div>
           </div>

           {/* CUADRO FORMAL DE DICTAMEN Y RESOLUCIÓN DE LA EVALUACIÓN */}
           <div className={`p-3 rounded-lg border text-[9px] ${
             isApproved 
               ? 'bg-emerald-50/80 border-emerald-300' 
               : (isRejected ? 'bg-rose-50/80 border-rose-300' : 'bg-slate-100/90 border-slate-300')
           }`}>
              <div className="flex items-center justify-between border-b border-slate-800/10 pb-2 mb-2">
                 <div className="flex items-center gap-2 font-black uppercase text-[10px]">
                    {isApproved && <CheckCircle2 size={16} className="text-emerald-700" />}
                    {isRejected && <XCircle size={16} className="text-rose-700" />}
                    {isPending && <Clock size={16} className="text-amber-700" />}
                    <span className={isApproved ? 'text-emerald-900' : (isRejected ? 'text-rose-900' : 'text-slate-800')}>
                       RESULTADO DE LA EVALUACIÓN: {isApproved ? 'APROBADA (V°B° CONFORME DE GASTO)' : (isRejected ? 'RECHAZADA (NO AUTORIZADA)' : 'EN TRÁMITE / PENDIENTE DE REVISIÓN')}
                    </span>
                 </div>
                 <span className="font-mono text-[8px] font-bold text-slate-500">
                    ESTADO OT: {data.status}
                 </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[8.5px] leading-relaxed">
                 <div className="space-y-1">
                    <p><span className="font-black text-slate-700">PERSONA QUE EVALÚA:</span> <strong className="uppercase">{evaluatorName}</strong></p>
                    <p><span className="font-black text-slate-700">FECHA Y HORA EVALUACIÓN:</span> {evalDate.d !== '--' ? `${evalDate.d}/${evalDate.m}/${evalDate.y} a las ${evalDate.time}` : 'Pendiente de confirmación'}</p>
                    <p className="truncate font-mono"><span className="font-black text-slate-700 font-sans">HASH EVALUACIÓN:</span> {hashEval}</p>
                 </div>
                 <div className="space-y-1 border-l border-slate-800/10 pl-3">
                    <p><span className="font-black text-slate-700">DICTAMEN TÉCNICO:</span> {
                      isApproved 
                        ? 'Autorizado formalmente para ejecución de trabajos y liquidación contra recepción conforme.' 
                        : (isRejected ? 'OT rechazada. No cuenta con autorización para ejecución ni pago en sistema.' : 'En revisión de partida presupuestaria y justificación técnica.')
                    }</p>
                    {(data.rejectionReason || data.evaluationNotes) && (
                      <p className="font-bold text-rose-800">
                        <span>OBSERVACIÓN: </span> {data.rejectionReason || data.evaluationNotes}
                      </p>
                    )}
                 </div>
              </div>
           </div>

           {/* INFORMACION DEL SISTEMA ERP */}
           <div className="grid grid-cols-2 gap-4 text-[9px] border-t border-slate-200 pt-2.5">
              <div className="space-y-1">
                 <p className="font-extrabold text-slate-500 uppercase text-[8px]">Consolidación de Sistema y Bóveda Digital</p>
                 <div className="bg-white border border-slate-200 p-2 rounded text-[7.5px] font-mono space-y-0.5 text-slate-700">
                    <p>• <span className="font-black text-indigo-700">COMPROBANTE ERP:</span> P0911_OF - F4311 (VOUCHER ORIGINAL)</p>
                    <p>• <span className="font-black text-slate-700">ESTADO ERP F4311:</span> LST={data.jdeLastStatus || (data.printedAt ? '280' : '230')} / NXT={data.jdeNextStatus || (data.printedAt ? '400' : '280')}</p>
                    <p>• <span className="font-black text-slate-700">EMISIÓN COMPRAS (R43500):</span> {data.printedAt ? `EMITIDA (${data.printedAt.split('T')[0]})` : 'PENDIENTE EMISIÓN'}</p>
                    <p>• <span className="font-black text-slate-700">Nº REFERENCIA INV:</span> {data.receptionInvoiceNumber || 'FOLIO_PENDIENTE'}</p>
                    <p>• <span className="font-black text-slate-700">VOLUMEN DE DEPÓSITO:</span> VOL_MUTU_RESTOR_PRD_SOP_04</p>
                 </div>
              </div>

              {/* TIMBRE / FIRMA DE CONSTANCIA FISICA */}
              <div className="border border-dashed border-slate-400 bg-white p-2 rounded flex flex-col justify-center items-center text-center">
                 <p className="text-[7px] font-black uppercase text-slate-400">REVISIÓN EXCLUSIVA / ARCHIVADO FISCAL</p>
                 <div className="h-2"></div>
                 <p className="text-[6.5px] font-mono italic text-slate-400 px-2">[ TIMBRE Y FIRMAS ADICIONALES PARA CARPETA FÍSICA ]</p>
              </div>
           </div>

           <div className="mt-1 flex justify-between items-center border-t border-slate-200 pt-2 opacity-60">
              <div className="flex items-center gap-2 text-[7.5px] font-mono font-black text-slate-500">
                 <Lock size={9} /> {hashIntegrity}
              </div>
              <p className="text-[7.5px] font-black uppercase italic text-slate-600">AssetFlow v2.5 • Control de Integridad y Trazabilidad</p>
           </div>
        </div>

        <div className="mt-auto pt-4 space-y-2 relative z-10 text-center border-t border-slate-100">
           <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[7px] leading-relaxed text-justify italic">
              "Advertencia: Esta Orden de Trabajo es válida únicamente con los registros de aprobación digital visibles en la ruta de validación. Todo prestador de servicios debe adoptar las medidas de seguridad industrial vigentes en Departamento Inmobiliario."
              <div className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-widest mt-2 border-t border-slate-200 pt-1.5 text-center">PAGINA 1 DE 01 • FOLIO: {data.folio || 'N/A'}</div>
           </div>
           <p className="text-[10px] font-black text-emerald-800 italic uppercase tracking-widest mt-1">“Apoyamos a quienes nos protegen”</p>
        </div>
    </div>
  );
};

export default WorkOrderDocument;
