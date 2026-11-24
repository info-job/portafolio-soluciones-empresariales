import React, { useState } from 'react';
import { WorkOrder, WorkOrderLineItem } from '../types';
import { 
  JDE_LINE_STATUS_UDC, 
  evaluateWorkOrderStatusFromLines, 
  approveWorkOrderLine, 
  rejectWorkOrderLine, 
  holdWorkOrderLine, 
  approveAllPendingLines 
} from '../lib/jdeLineApprovalService';
import { formatCLP } from '../lib/chileanUtils';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  Clock, 
  X, 
  Info, 
  Layers, 
  Building2, 
  FileText,
  UserCheck,
  CheckCheck
} from 'lucide-react';

interface JDELineApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: WorkOrder;
  currentUser: string;
  onSaveOrder: (updatedOrder: WorkOrder) => void;
  isManager?: boolean;
}

export const JDELineApprovalModal: React.FC<JDELineApprovalModalProps> = ({
  isOpen,
  onClose,
  order,
  currentUser,
  onSaveOrder,
  isManager = true,
}) => {
  const [currentOrder, setCurrentOrder] = useState<WorkOrder>(order);
  const [rejectionModalLineId, setRejectionModalLineId] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [holdModalLineId, setHoldModalLineId] = useState<string | null>(null);
  const [holdNoteText, setHoldNoteText] = useState('');

  if (!isOpen) return null;

  const evaluation = evaluateWorkOrderStatusFromLines(currentOrder.items || []);

  const handleApproveSingle = (lineId: string) => {
    const updated = approveWorkOrderLine(currentOrder, lineId, currentUser);
    setCurrentOrder(updated);
    onSaveOrder(updated);
  };

  const handleOpenReject = (lineId: string) => {
    setRejectionModalLineId(lineId);
    setRejectionReasonText('No cumple especificaciones técnicas requeridas / fuera de marco presupuestario');
  };

  const handleConfirmReject = () => {
    if (!rejectionModalLineId) return;
    const updated = rejectWorkOrderLine(currentOrder, rejectionModalLineId, currentUser, rejectionReasonText);
    setCurrentOrder(updated);
    onSaveOrder(updated);
    setRejectionModalLineId(null);
    setRejectionReasonText('');
  };

  const handleOpenHold = (lineId: string) => {
    setHoldModalLineId(lineId);
    setHoldNoteText('En espera de confirmación de disponibilidad técnica por contratista');
  };

  const handleConfirmHold = () => {
    if (!holdModalLineId) return;
    const updated = holdWorkOrderLine(currentOrder, holdModalLineId, currentUser, holdNoteText);
    setCurrentOrder(updated);
    onSaveOrder(updated);
    setHoldModalLineId(null);
    setHoldNoteText('');
  };

  const handleApproveAll = () => {
    const updated = approveAllPendingLines(currentOrder, currentUser);
    setCurrentOrder(updated);
    onSaveOrder(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-300">
        
        {/* TOP HEADER - ASSETFLOW ENTERPRISE STYLE */}
        <div className="bg-[#0B3C5D] text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg border border-white/20">
              <Layers className="text-amber-300 h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold tracking-wider text-amber-300 uppercase bg-black/30 px-2 py-0.5 rounded">
                  ERP P43081 / Flujo de Aprobación por Líneas
                </span>
                <span className="text-xs text-slate-300 font-mono">EDO {currentOrder.jdeLastStatus || '220'} → {currentOrder.jdeNextStatus || '230'}</span>
              </div>
              <h2 className="text-base font-black uppercase tracking-tight flex items-center gap-2 mt-0.5">
                Mesa de Aprobación y Dictamen Técnico: <span className="text-amber-200">{currentOrder.folio}</span>
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* ORDER SUMMARY STRIP */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-500 block">Proveedor Adjudicado</span>
            <span className="font-black text-slate-800 uppercase truncate block" title={currentOrder.supplierName}>
              {currentOrder.supplierName}
            </span>
            <span className="text-[10px] font-mono text-slate-600 block">{currentOrder.supplierTaxId}</span>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase text-slate-500 block">Inmueble / Unidad</span>
            <span className="font-bold text-slate-800 uppercase truncate block" title={currentOrder.propertyLabel}>
              {currentOrder.propertyLabel || 'UNIDAD CORPORATIVA'}
            </span>
            <span className="text-[10px] text-slate-500">Categoría: {currentOrder.category || 'MANTENCIÓN'}</span>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase text-slate-500 block">Solicitado Por</span>
            <span className="font-bold text-slate-800 uppercase block">{currentOrder.preparedBy}</span>
            <span className="text-[10px] text-slate-500">{currentOrder.preparedByDept} • {currentOrder.requestDate || currentOrder.issueDate}</span>
          </div>

          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-center text-[10px] font-black uppercase">
              <span className="text-slate-500">Monto Total OT:</span>
              <span className="text-emerald-700 font-mono font-bold text-xs">{formatCLP(currentOrder.total)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold mt-1">
              <span className="text-slate-500">Monto Aprobado:</span>
              <span className="text-indigo-700 font-mono">{formatCLP(evaluation.approvedTotal)}</span>
            </div>
          </div>
        </div>

        {/* STATUS COUNTERS & BATCH ACTIONS BAR */}
        <div className="px-6 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black uppercase text-indigo-900 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-indigo-600" /> Avance por Línea:
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              {evaluation.approvedLines} Aprobadas
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
              {evaluation.pendingLines} Pendientes
            </span>
            {evaluation.observationLines > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                {evaluation.observationLines} En Observación
              </span>
            )}
            {evaluation.rejectedLines > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                {evaluation.rejectedLines} Rechazadas
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {evaluation.pendingLines > 0 && isManager && (
              <button
                onClick={handleApproveAll}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Aprobar todas las líneas pendientes con un solo clic"
              >
                <CheckCheck size={14} /> Aprobar Todas las Líneas Pendientes
              </button>
            )}
            <div className="text-[11px] font-bold text-slate-600 font-mono">
              Dictamen Global: <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                currentOrder.status === 'APROBADA' ? 'bg-emerald-600 text-white' :
                currentOrder.status === 'RECHAZADA' ? 'bg-rose-600 text-white' :
                'bg-amber-500 text-slate-900'
              }`}>
                {currentOrder.status} {evaluation.isPartiallyApproved ? '(PARCIAL)' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* LINES TABLE */}
        <div className="flex-1 overflow-auto p-6 bg-slate-100">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0B3C5D] text-white font-bold text-[10.5px] uppercase">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">Línea</th>
                  <th className="py-2.5 px-3">Descripción Técnica del Servicio / Suministro</th>
                  <th className="py-2.5 px-3 text-center w-16">Cant.</th>
                  <th className="py-2.5 px-3 text-right w-28">P. Unitario</th>
                  <th className="py-2.5 px-3 text-right w-28">Total Línea</th>
                  <th className="py-2.5 px-3 text-center w-36">Estado ERP (UDC)</th>
                  <th className="py-2.5 px-3 w-44">Trazabilidad Aprobador</th>
                  <th className="py-2.5 px-3 text-center w-48">Acción de Aprobación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentOrder.items && currentOrder.items.length > 0 ? (
                  currentOrder.items.map((item, idx) => {
                    const statusInfo = JDE_LINE_STATUS_UDC[item.lineStatusCode || (item.status === 'APROBADA' ? '230' : item.status === 'RECHAZADA' ? '999' : '220')] || JDE_LINE_STATUS_UDC['220'];
                    const isApproved = item.status === 'APROBADA';
                    const isRejected = item.status === 'RECHAZADA';
                    const isHold = item.status === 'EN_OBSERVACION';
                    const isPending = !isApproved && !isRejected && !isHold;

                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${
                          isApproved ? 'bg-emerald-50/40 hover:bg-emerald-50/70' :
                          isRejected ? 'bg-rose-50/40 hover:bg-rose-50/70' :
                          isHold ? 'bg-purple-50/40 hover:bg-purple-50/70' :
                          'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-mono font-black text-slate-600">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-800 uppercase text-[11.5px]">{item.description}</p>
                          {item.rejectionReason && (
                            <p className="text-[10px] text-rose-700 font-bold mt-1 bg-rose-100/80 px-2 py-0.5 rounded border border-rose-200 inline-block">
                              Observación: {item.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {formatCLP(item.unitPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                          {formatCLP(item.total)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black border ${statusInfo.badgeBg} ${statusInfo.badgeText}`}>
                            [{statusInfo.code}] {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[10px]">
                          {item.approvedBy ? (
                            <div className="space-y-0.5">
                              <p className="font-black text-slate-800 uppercase flex items-center gap-1">
                                <UserCheck size={11} className={isApproved ? "text-emerald-600" : "text-rose-600"} />
                                {item.approvedBy}
                              </p>
                              {item.approvalDate && (
                                <p className="font-mono text-slate-500">
                                  {new Date(item.approvalDate).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Pendiente de firma</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isManager ? (
                            <div className="flex items-center justify-center gap-1">
                              {!isApproved && (
                                <button
                                  onClick={() => handleApproveSingle(item.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[10.5px] font-black uppercase flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                  title="Aprobar esta línea (ERP 230)"
                                >
                                  <CheckCircle2 size={13} /> Aprobar
                                </button>
                              )}
                              {!isRejected && (
                                <button
                                  onClick={() => handleOpenReject(item.id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded text-[10.5px] font-black uppercase flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                  title="Rechazar esta línea con motivo técnico"
                                >
                                  <XCircle size={13} /> Rechazar
                                </button>
                              )}
                              {!isHold && !isApproved && (
                                <button
                                  onClick={() => handleOpenHold(item.id)}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-[10.5px] font-black uppercase flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                  title="Poner en observación / retención (Hold)"
                                >
                                  <Clock size={13} /> Hold
                                </button>
                              )}
                              {isApproved && (
                                <span className="text-[10px] font-black text-emerald-700 uppercase flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded">
                                  <CheckCircle2 size={12} /> Aprobada Conforme
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">Solo Aprobadores</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                      No se encontraron líneas de detalle para esta orden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* EXPLANATORY NOTE - ERP STANDARD BEHAVIOR */}
          <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black uppercase tracking-wide">
                Protocolo de Aprobación por Líneas AssetFlow Enterprise:
              </p>
              <p className="text-[11px] leading-relaxed">
                Cada ítem de la orden de compra o servicio cuenta con su propio estatus de avance independiente (F4311).
                Al rechazar una línea individual, las demás líneas aprobadas pueden ser formalmente emitidas (R43500) y recepcionadas en bodega (P4312).
                La orden quedará en estado general <strong>APROBADA (PARCIAL)</strong> sin detener el abastecimiento de los ítems válidos.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600 font-mono">
            Registrado por: <strong className="text-slate-800">{currentUser}</strong> • Control de firmas inmutable
          </div>
          <button
            onClick={onClose}
            className="bg-[#0B3C5D] hover:bg-[#07283e] text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Guardar y Volver
          </button>
        </div>

      </div>

      {/* REJECTION REASON MODAL */}
      {rejectionModalLineId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-300 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-black uppercase text-rose-700 flex items-center gap-2 mb-2">
              <XCircle size={18} /> Motivo del Rechazo de Línea
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Indique la justificación técnica o presupuestaria del rechazo. Esta observación quedará registrada en el historial auditable de la transacción:
            </p>
            <textarea
              value={rejectionReasonText}
              onChange={(e) => setRejectionReasonText(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-rose-500 outline-none uppercase"
              rows={3}
              placeholder="Ingrese el motivo del rechazo..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRejectionModalLineId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-lg text-xs font-black uppercase bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOLD NOTE MODAL */}
      {holdModalLineId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-300 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-black uppercase text-purple-700 flex items-center gap-2 mb-2">
              <Clock size={18} /> Poner Línea en Observación (Hold)
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Especifique la duda técnica, cotización pendiente o motivo de la retención preventiva:
            </p>
            <textarea
              value={holdNoteText}
              onChange={(e) => setHoldNoteText(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-purple-500 outline-none uppercase"
              rows={3}
              placeholder="Ingrese la nota de observación..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setHoldModalLineId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmHold}
                className="px-4 py-1.5 rounded-lg text-xs font-black uppercase bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
              >
                Registrar Observación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
