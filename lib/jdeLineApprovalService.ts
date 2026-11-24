import { WorkOrder, WorkOrderLineItem, WorkOrderAction, WorkOrderStatus, LineItemStatus } from '../types';

export interface JDELineStatusInfo {
  code: string;
  label: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

export const JDE_LINE_STATUS_UDC: Record<string, JDELineStatusInfo> = {
  '110': {
    code: '110',
    label: 'Borrador / Solicitud',
    badgeBg: 'bg-slate-100 border-slate-300',
    badgeText: 'text-slate-700',
    description: 'Línea en formulación inicial sin tramitación aún',
  },
  '220': {
    code: '220',
    label: 'Pendiente VoBo Jefatura',
    badgeBg: 'bg-amber-100 border-amber-300',
    badgeText: 'text-amber-800',
    description: 'En espera de revisión técnica y aprobación presupuestaria',
  },
  '225': {
    code: '225',
    label: 'En Observación (Hold)',
    badgeBg: 'bg-purple-100 border-purple-300',
    badgeText: 'text-purple-800',
    description: 'Línea retenida temporalmente para clarificación de costos o alcance',
  },
  '230': {
    code: '230',
    label: 'Aprobada por Jefatura',
    badgeBg: 'bg-emerald-100 border-emerald-300',
    badgeText: 'text-emerald-800',
    description: 'Visto bueno otorgado. Lista para emisión formal por Compras',
  },
  '280': {
    code: '280',
    label: 'Emitida / Impresa (R43500)',
    badgeBg: 'bg-indigo-100 border-indigo-300',
    badgeText: 'text-indigo-800',
    description: 'Orden transmitida al contratista. Habilitada para recepción en Bodega',
  },
  '400': {
    code: '400',
    label: 'Recepcionada en Bodega (P4312)',
    badgeBg: 'bg-cyan-100 border-cyan-300',
    badgeText: 'text-cyan-800',
    description: 'Mercadería o servicio recibido físicamente y verificado en terreno',
  },
  '999': {
    code: '999',
    label: 'Rechazada / Cancelada',
    badgeBg: 'bg-rose-100 border-rose-300',
    badgeText: 'text-rose-800',
    description: 'Línea desestimada técnicamente o fuera de marco presupuestario',
  },
};

export interface LineEvaluationResult {
  headerStatus: WorkOrderStatus;
  jdeLastStatus: string;
  jdeNextStatus: string;
  isPartiallyApproved: boolean;
  totalLines: number;
  approvedLines: number;
  rejectedLines: number;
  pendingLines: number;
  observationLines: number;
  receivedLines: number;
  approvedTotal: number;
  rejectedTotal: number;
  pendingTotal: number;
  grandTotal: number;
}

/**
 * Evaluates the overall document status based on the status of each individual line item,
 * following the AssetFlow Enterprise line-status logic.
 */
export function evaluateWorkOrderStatusFromLines(items: WorkOrderLineItem[] = []): LineEvaluationResult {
  const totalLines = items.length;
  if (totalLines === 0) {
    return {
      headerStatus: 'BORRADOR',
      jdeLastStatus: '110',
      jdeNextStatus: '220',
      isPartiallyApproved: false,
      totalLines: 0,
      approvedLines: 0,
      rejectedLines: 0,
      pendingLines: 0,
      observationLines: 0,
      receivedLines: 0,
      approvedTotal: 0,
      rejectedTotal: 0,
      pendingTotal: 0,
      grandTotal: 0,
    };
  }

  let approvedLines = 0;
  let rejectedLines = 0;
  let pendingLines = 0;
  let observationLines = 0;
  let receivedLines = 0;

  let approvedTotal = 0;
  let rejectedTotal = 0;
  let pendingTotal = 0;
  let grandTotal = 0;

  for (const item of items) {
    grandTotal += item.total || 0;
    const st = item.status || 'PENDIENTE';
    if (st === 'APROBADA') {
      approvedLines++;
      approvedTotal += item.total || 0;
    } else if (st === 'RECHAZADA' || st === 'CANCELADA') {
      rejectedLines++;
      rejectedTotal += item.total || 0;
    } else if (st === 'RECIBIDO') {
      receivedLines++;
      approvedLines++;
      approvedTotal += item.total || 0;
    } else if (st === 'EN_OBSERVACION') {
      observationLines++;
      pendingTotal += item.total || 0;
    } else {
      pendingLines++;
      pendingTotal += item.total || 0;
    }
  }

  const isPartiallyApproved = approvedLines > 0 && rejectedLines > 0 && pendingLines === 0 && observationLines === 0;

  let headerStatus: WorkOrderStatus = 'PENDIENTE_VB';
  let jdeLastStatus = '110';
  let jdeNextStatus = '220';

  if (totalLines > 0 && rejectedLines === totalLines) {
    // All lines rejected
    headerStatus = 'RECHAZADA';
    jdeLastStatus = '220';
    jdeNextStatus = '999';
  } else if (totalLines > 0 && pendingLines === 0 && observationLines === 0 && approvedLines > 0) {
    // All evaluated: at least one approved, rest rejected (or all approved)
    headerStatus = 'APROBADA';
    jdeLastStatus = '220';
    jdeNextStatus = '230';
  } else if (observationLines > 0 || pendingLines > 0) {
    headerStatus = 'PENDIENTE_VB';
    jdeLastStatus = '110';
    jdeNextStatus = '220';
  }

  return {
    headerStatus,
    jdeLastStatus,
    jdeNextStatus,
    isPartiallyApproved,
    totalLines,
    approvedLines,
    rejectedLines,
    pendingLines,
    observationLines,
    receivedLines,
    approvedTotal,
    rejectedTotal,
    pendingTotal,
    grandTotal,
  };
}

/**
 * Approves a single line item of a WorkOrder and records an immutable audit tracking action.
 */
export function approveWorkOrderLine(
  ot: WorkOrder,
  lineId: string,
  approverUser: string,
  notes?: string
): WorkOrder {
  const now = new Date();
  const targetItem = ot.items.find((i) => i.id === lineId);
  if (!targetItem) return ot;

  const lineIndex = ot.items.findIndex((i) => i.id === lineId);
  const updatedItems: WorkOrderLineItem[] = ot.items.map((item, idx) => {
    if (item.id === lineId) {
      return {
        ...item,
        status: 'APROBADA' as LineItemStatus,
        lineStatusCode: '230',
        approvedBy: approverUser,
        approvalDate: now.toISOString(),
        rejectionReason: undefined,
      };
    }
    return item;
  });

  const evaluation = evaluateWorkOrderStatusFromLines(updatedItems);

  const trackingAction: WorkOrderAction = {
    id: crypto.randomUUID(),
    date: now.toISOString(),
    entryDate: now.toISOString().split('T')[0],
    type: 'REALIZADA',
    user: approverUser,
    actionResponsible: `JEFATURA (${approverUser})`,
    trackingResponsible: 'ADQUISICIONES & COMPRAS',
    actionCategory: 'APPROVAL',
    sourceArea: `JEFATURA (${approverUser})`,
    targetArea: 'COMPRAS & BODEGA',
    description: `APROBACIÓN DE LÍNEA #${lineIndex + 1} (ERP 220 -> 230): "${targetItem.description}" - Monto: $${(targetItem.total || 0).toLocaleString('es-CL')} CLP.${notes ? ` Observación: ${notes}` : ''}`,
  };

  const updatedOT: WorkOrder = {
    ...ot,
    items: updatedItems,
    status: evaluation.headerStatus,
    jdeLastStatus: evaluation.jdeLastStatus,
    jdeNextStatus: evaluation.jdeNextStatus,
    authorizedBy: evaluation.headerStatus === 'APROBADA' ? approverUser : ot.authorizedBy,
    authorizationDate: evaluation.headerStatus === 'APROBADA' ? now.toISOString().split('T')[0] : ot.authorizationDate,
    authorizedAt: evaluation.headerStatus === 'APROBADA' ? now.toISOString() : ot.authorizedAt,
    trackingActions: [trackingAction, ...(ot.trackingActions || [])],
  };

  return updatedOT;
}

/**
 * Rejects a single line item of a WorkOrder with mandatory technical rationale.
 */
export function rejectWorkOrderLine(
  ot: WorkOrder,
  lineId: string,
  rejectorUser: string,
  reason: string
): WorkOrder {
  const now = new Date();
  const targetItem = ot.items.find((i) => i.id === lineId);
  if (!targetItem) return ot;

  const lineIndex = ot.items.findIndex((i) => i.id === lineId);
  const cleanReason = reason.trim() || 'Desestimada en revisión técnica presupuestaria';

  const updatedItems: WorkOrderLineItem[] = ot.items.map((item) => {
    if (item.id === lineId) {
      return {
        ...item,
        status: 'RECHAZADA' as LineItemStatus,
        lineStatusCode: '999',
        approvedBy: rejectorUser,
        approvalDate: now.toISOString(),
        rejectionReason: cleanReason,
      };
    }
    return item;
  });

  const evaluation = evaluateWorkOrderStatusFromLines(updatedItems);

  const trackingAction: WorkOrderAction = {
    id: crypto.randomUUID(),
    date: now.toISOString(),
    entryDate: now.toISOString().split('T')[0],
    type: 'REALIZADA',
    user: rejectorUser,
    actionResponsible: `JEFATURA (${rejectorUser})`,
    trackingResponsible: 'ÁREA SOLICITANTE',
    actionCategory: 'STATUS_CHANGE',
    sourceArea: `JEFATURA (${rejectorUser})`,
    targetArea: 'SOLICITANTE',
    description: `RECHAZO DE LÍNEA #${lineIndex + 1} (ERP 220 -> 999): "${targetItem.description}". Motivo: ${cleanReason.toUpperCase()}`,
  };

  const updatedOT: WorkOrder = {
    ...ot,
    items: updatedItems,
    status: evaluation.headerStatus,
    jdeLastStatus: evaluation.jdeLastStatus,
    jdeNextStatus: evaluation.jdeNextStatus,
    rejectionReason: evaluation.headerStatus === 'RECHAZADA' ? cleanReason : ot.rejectionReason,
    rejectedBy: evaluation.headerStatus === 'RECHAZADA' ? rejectorUser : ot.rejectedBy,
    rejectedAt: evaluation.headerStatus === 'RECHAZADA' ? now.toISOString() : ot.rejectedAt,
    trackingActions: [trackingAction, ...(ot.trackingActions || [])],
  };

  return updatedOT;
}

/**
 * Puts a single line item on hold / observation.
 */
export function holdWorkOrderLine(
  ot: WorkOrder,
  lineId: string,
  user: string,
  observation: string
): WorkOrder {
  const now = new Date();
  const targetItem = ot.items.find((i) => i.id === lineId);
  if (!targetItem) return ot;

  const lineIndex = ot.items.findIndex((i) => i.id === lineId);
  const cleanObs = observation.trim() || 'Línea retenida para consulta técnica o confirmación de cotización';

  const updatedItems: WorkOrderLineItem[] = ot.items.map((item) => {
    if (item.id === lineId) {
      return {
        ...item,
        status: 'EN_OBSERVACION' as LineItemStatus,
        lineStatusCode: '225',
        rejectionReason: cleanObs,
      };
    }
    return item;
  });

  const evaluation = evaluateWorkOrderStatusFromLines(updatedItems);

  const trackingAction: WorkOrderAction = {
    id: crypto.randomUUID(),
    date: now.toISOString(),
    entryDate: now.toISOString().split('T')[0],
    type: 'REALIZADA',
    user,
    actionResponsible: user,
    trackingResponsible: 'ÁREA SOLICITANTE',
    actionCategory: 'NOTE',
    sourceArea: `REVISIÓN (${user})`,
    targetArea: 'SOLICITANTE',
    description: `OBSERVACIÓN / HOLD EN LÍNEA #${lineIndex + 1} (ERP 220 -> 225): "${targetItem.description}". Detalle: ${cleanObs}`,
  };

  return {
    ...ot,
    items: updatedItems,
    status: evaluation.headerStatus,
    jdeLastStatus: evaluation.jdeLastStatus,
    jdeNextStatus: evaluation.jdeNextStatus,
    trackingActions: [trackingAction, ...(ot.trackingActions || [])],
  };
}

/**
 * Approves all currently pending lines at once.
 */
export function approveAllPendingLines(ot: WorkOrder, approverUser: string): WorkOrder {
  const now = new Date();
  let modifiedCount = 0;

  const updatedItems: WorkOrderLineItem[] = ot.items.map((item) => {
    if (item.status === 'PENDIENTE_VB' || item.status === 'PENDIENTE' || item.status === 'EN_OBSERVACION') {
      modifiedCount++;
      return {
        ...item,
        status: 'APROBADA' as LineItemStatus,
        lineStatusCode: '230',
        approvedBy: approverUser,
        approvalDate: now.toISOString(),
        rejectionReason: undefined,
      };
    }
    return item;
  });

  if (modifiedCount === 0) return ot;

  const evaluation = evaluateWorkOrderStatusFromLines(updatedItems);

  const trackingAction: WorkOrderAction = {
    id: crypto.randomUUID(),
    date: now.toISOString(),
    entryDate: now.toISOString().split('T')[0],
    type: 'REALIZADA',
    user: approverUser,
    actionResponsible: `JEFATURA (${approverUser})`,
    trackingResponsible: 'ADQUISICIONES & COMPRAS',
    actionCategory: 'APPROVAL',
    sourceArea: `JEFATURA (${approverUser})`,
    targetArea: 'COMPRAS & BODEGA',
    description: `APROBACIÓN MASIVA DE LÍNEAS (P43081 / ERP 220 -> 230): Se aprobaron las ${modifiedCount} línea(s) pendientes de la OT ${ot.folio} por un monto de $${evaluation.approvedTotal.toLocaleString('es-CL')} CLP.`,
  };

  return {
    ...ot,
    items: updatedItems,
    status: evaluation.headerStatus,
    jdeLastStatus: evaluation.jdeLastStatus,
    jdeNextStatus: evaluation.jdeNextStatus,
    authorizedBy: evaluation.headerStatus === 'APROBADA' ? approverUser : ot.authorizedBy,
    authorizationDate: evaluation.headerStatus === 'APROBADA' ? now.toISOString().split('T')[0] : ot.authorizationDate,
    authorizedAt: evaluation.headerStatus === 'APROBADA' ? now.toISOString() : ot.authorizedAt,
    trackingActions: [trackingAction, ...(ot.trackingActions || [])],
  };
}
