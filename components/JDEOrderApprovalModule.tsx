import React, { useState, useMemo, useEffect } from 'react';
import {
  WorkOrder,
  Supplier,
  Property,
  JDEHoldCodeType,
  F43092DelegationRecord,
  F4209HeldOrderRecord,
  ApproverRoleType,
  WorkOrderAction,
  WorkOrderApprovalStepTrace
} from '../types';
import {
  evaluateWorkOrderJDEApprovalState,
  JDE_HOLD_CODES_UDC,
  getDelegationsF43092,
  saveDelegationF43092,
  deleteDelegationF43092,
  getHeldOrdersLogF4209,
  appendHeldOrderLogF4209,
  sealAndChainF4209Ledger,
  ensureSealedF4209Ledger,
  verifyF4209BlockchainIntegrity,
  saveHeldOrdersLogF4209Raw,
  F4209ChainVerificationReport,
  GENESIS_BLOCK_HASH
} from '../lib/approvalRoutesData';
import { formatCLP, formatRUT } from '../lib/chileanUtils';
import { exportWorkOrdersToExcel, exportToExcel } from '../lib/excelExport';
import { downloadJDEWorkOrderVoucher } from '../lib/pdfGenerator';
import { JDELineApprovalModal } from './JDELineApprovalModal';
import WorkOrderDocument from './WorkOrderDocument';
import ApprovalRoutesModule from './ApprovalRoutesModule';
import { JDEGridContextMenu, JDEContextMenuItem } from './JDEGridContextMenu';
import { useResizableColumns } from '../lib/useResizableColumns';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Eye,
  Check,
  X,
  Lock,
  Layers,
  GitMerge,
  UserCheck,
  Users,
  ArrowRight,
  Building2,
  Hammer,
  CheckCheck,
  RotateCcw,
  Plus,
  Trash2,
  Printer,
  History,
  Sliders,
  DollarSign,
  Award,
  MoreVertical,
  Copy,
  RefreshCw
} from 'lucide-react';

interface JDEOrderApprovalModuleProps {
  workOrders: WorkOrder[];
  suppliers: Supplier[];
  properties: Property[];
  currentUser: string;
  userRole?: string;
  companyLogo: string | null;
  onSaveWorkOrder: (updatedOrder: WorkOrder) => void;
  onAuditLog?: (action: 'APPROVE' | 'REJECT' | 'UPDATE', details: string, orderId?: string) => void;
}

export const JDEOrderApprovalModule: React.FC<JDEOrderApprovalModuleProps> = ({
  workOrders,
  suppliers,
  properties,
  currentUser,
  userRole = 'ADMINISTRADOR',
  companyLogo,
  onSaveWorkOrder,
  onAuditLog
}) => {
  // Active JDE Program Tab
  const [activeTab, setActiveTab] = useState<'W43081A_QUEUE' | 'W43081C_INSPECTOR' | 'P43280_DELEGATION' | 'F4209_LEDGER' | 'P43008_ROUTES'>('W43081A_QUEUE');

  // Resizable Grid Columns & Row Heights for W43081A
  const {
    widths: colWidths,
    onColumnMouseDown,
    onColumnDoubleClick,
    getRowHeight,
    setDefaultRowHeight,
    onRowMouseDown,
    onRowDoubleClick,
    resetWidths,
    resetHeights,
    resetAll: resetDimensions
  } = useResizableColumns({
    initialWidths: {
      col_0: 68,
      col_1: 130,
      col_2: 200,
      col_3: 155,
      col_4: 135,
      col_5: 155,
      col_6: 110,
      col_7: 145,
      col_8: 115,
      col_9: 185,
      col_10: 135,
      col_11: 250
    },
    storageKey: 'jde_approval_queue_p43081'
  });

  // Filters & QBE
  const [statusFilter, setStatusFilter] = useState<'PENDING_ONLY' | 'HOLD_ONLY' | 'APPROVED_ONLY' | 'REJECTED_ONLY' | 'ALL'>('PENDING_ONLY');
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | 'OT' | 'OC'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [qbeFolio, setQbeFolio] = useState('');
  const [qbeSupplier, setQbeSupplier] = useState('');
  const [qbeCategory, setQbeCategory] = useState('');
  const [qbeSpecialty, setQbeSpecialty] = useState('');
  const [qbeInvoice, setQbeInvoice] = useState('');

  // Selection & Modals
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [inspectedOrderId, setInspectedOrderId] = useState<string>(() => workOrders[0]?.id || '');
  const [lineApprovalOrder, setLineApprovalOrder] = useState<WorkOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<WorkOrder | null>(null);

  // JDE Enterprise Grid Context Menu State (Right Click / F4 / [⋮] Selector across all grids)
  const [gridContextMenu, setGridContextMenu] = useState<
    | { kind: 'ORDER'; x: number; y: number; evaluation: ReturnType<typeof evaluateWorkOrderJDEApprovalState> }
    | { kind: 'DELEGATION'; x: number; y: number; delegation: F43092DelegationRecord }
    | { kind: 'LEDGER'; x: number; y: number; entry: F4209HeldOrderRecord }
    | null
  >(null);

  // Action Modal (Approve / Hold / Reject with comments & Hold Code)
  const [actionModal, setActionModal] = useState<{
    mode: 'APPROVE' | 'HOLD' | 'REJECT';
    order: WorkOrder;
  } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [selectedHoldCode, setSelectedHoldCode] = useState<JDEHoldCodeType>('2H');

  // F43092 Delegations & F4209 Log state
  const [delegations, setDelegations] = useState<F43092DelegationRecord[]>(() => getDelegationsF43092());
  const [heldOrdersLog, setHeldOrdersLog] = useState<F4209HeldOrderRecord[]>(() => getHeldOrdersLogF4209());
  const [isChainVerifierOpen, setIsChainVerifierOpen] = useState(false);
  const [chainVerificationReport, setChainVerificationReport] = useState<F4209ChainVerificationReport | null>(null);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [isTamperSimulated, setIsTamperSimulated] = useState(false);
  const [preTamperBackup, setPreTamperBackup] = useState<F4209HeldOrderRecord[] | null>(null);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [verificationRunCounter, setVerificationRunCounter] = useState(0);

  const [isNewDelegationOpen, setIsNewDelegationOpen] = useState(false);
  const [delPrincipalRole, setDelPrincipalRole] = useState<ApproverRoleType>('JEFE_MANTENCION');
  const [delPrincipalName, setDelPrincipalName] = useState('ING. CARLOS MENDOZA');
  const [delDelegateRole, setDelDelegateRole] = useState<ApproverRoleType>('ADMINISTRADOR');
  const [delDelegateName, setDelDelegateName] = useState(currentUser || 'JMARCO CALDERON MORAGA');
  const [delFrom, setDelFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [delThru, setDelThru] = useState('2026-12-31');
  const [delMaxAmount, setDelMaxAmount] = useState(10000000);
  const [delReason, setDelReason] = useState<F43092DelegationRecord['reason']>('VACACIONES');

  const [bannerFeedback, setBannerFeedback] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setBannerFeedback({ text, type });
    setTimeout(() => setBannerFeedback(null), 5000);
  };

  // Inicializar y sellar criptográficamente la cadena F4209 con Web Crypto API (SHA-256) al montar
  useEffect(() => {
    let mounted = true;
    const initCryptographicChain = async () => {
      try {
        const rawCurrent = getHeldOrdersLogF4209();
        const activeList = await ensureSealedF4209Ledger(rawCurrent);
        if (!mounted) return;
        setHeldOrdersLog(activeList);
        const report = await verifyF4209BlockchainIntegrity(activeList);
        if (!mounted) return;
        setChainVerificationReport(report);
        setIsTamperSimulated(!report.isChainIntact);
      } catch (err) {
        console.error('Error initializing F4209 SHA-256 chain:', err);
      }
    };
    initCryptographicChain();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRunLiveChainVerification = async (
    customRecords?: F4209HeldOrderRecord[],
    focusBlockId?: string,
    silentNotice?: boolean
  ) => {
    setIsVerifyingChain(true);
    try {
      const baseRecords = customRecords && customRecords.length > 0 ? customRecords : getHeldOrdersLogF4209();
      const sealedOrCurrent = await ensureSealedF4209Ledger(baseRecords);
      setHeldOrdersLog(sealedOrCurrent);
      const report = await verifyF4209BlockchainIntegrity(sealedOrCurrent);
      setChainVerificationReport(report);
      setIsTamperSimulated(!report.isChainIntact);
      setVerificationRunCounter(prev => prev + 1);
      if (focusBlockId) {
        setHighlightedBlockId(focusBlockId);
      }
      setIsChainVerifierOpen(true);
      if (!silentNotice) {
        if (report.isChainIntact) {
          showNotice(
            `VERIFICACIÓN SHA-256 EXITOSA: ${report.validBlocksCount}/${report.totalBlocks} bloques íntegros (${report.executionTimeMs} ms) • Merkle Root: ${report.merkleRootHash.slice(0, 16)}...`,
            'success'
          );
        } else {
          showNotice(
            `ALERTA CRIPTOGRÁFICA FORENSE: Se detectó corrupción en ${report.corruptedBlocksCount} de ${report.totalBlocks} bloques de la cadena F4209.`,
            'error'
          );
        }
      }
    } finally {
      setIsVerifyingChain(false);
    }
  };

  // Simulador Forense para Defensa de Tesis: altera 1 peso en el Bloque #1 sin permiso para demostrar Efecto Avalancha SHA-256
  const handleSimulateTamperAttack = async () => {
    const currentClean = await ensureSealedF4209Ledger(heldOrdersLog);
    if (!isTamperSimulated) {
      setPreTamperBackup(JSON.parse(JSON.stringify(currentClean)));
    }
    const chronological = [...currentClean].sort((a, b) => (a.blockIndex ?? a.timestamp) - (b.blockIndex ?? b.timestamp));
    if (chronological.length === 0) return;

    const cleanReason = (chronological[0].reasonCode || '').replace(/\s*\[DATO ADULTERADO EN BD \+\$1\]/g, '').trim();
    // Adulteramos maliciosamente el Bloque #1 sumando $1 CLP al monto aprobado sin recalcular los sellos criptográficos
    chronological[0] = {
      ...chronological[0],
      orderAmount: (chronological[0].orderAmount || 0) + 1,
      reasonCode: `${cleanReason} [DATO ADULTERADO EN BD +$1]`
    };

    const tamperedDescending = [...chronological].reverse();
    setHeldOrdersLog(tamperedDescending);
    saveHeldOrdersLogF4209Raw(tamperedDescending);
    setIsTamperSimulated(true);
    await handleRunLiveChainVerification(tamperedDescending, chronological[0].id, true);
    showNotice('ALERTA FORENSE: Se simuló la alteración de +$1 CLP en el Bloque #1. Web Crypto SHA-256 detectó ruptura en cascada.', 'error');
  };

  const handleRestoreAndResealChain = async () => {
    const baseToRestore = preTamperBackup || getHeldOrdersLogF4209();
    const resealed = await sealAndChainF4209Ledger(baseToRestore);
    setHeldOrdersLog(resealed);
    setIsTamperSimulated(false);
    setPreTamperBackup(null);
    setHighlightedBlockId(null);
    const report = await verifyF4209BlockchainIntegrity(resealed);
    setChainVerificationReport(report);
    setVerificationRunCounter(prev => prev + 1);
    showNotice('Cadena de bloques F4209 restaurada y re-sellada criptográficamente (100% SHA-256 Íntegra).', 'success');
  };

  // Pre-evaluate all orders with the Enterprise Approval Engine
  const evaluatedOrders = useMemo(() => {
    return workOrders.map(wo => evaluateWorkOrderJDEApprovalState(wo, suppliers, properties));
  }, [workOrders, suppliers, properties]);

  // Helper to detect Boleta de Honorarios vs Factura
  const getTaxBreakdown = (wo: WorkOrder) => {
    const docAssocUpper = String(wo.associatedInvoice || '').toUpperCase();
    const taxTypeUpper = String(wo.supplierTaxDocumentType || '').toUpperCase();
    const isHonorarios =
      taxTypeUpper.includes('HONORARIO') ||
      taxTypeUpper.includes('BOLETA') ||
      taxTypeUpper === 'BH' ||
      docAssocUpper.includes('HONORARIO') ||
      docAssocUpper.includes('BOLETA') ||
      docAssocUpper.startsWith('BH');

    const baseAmount = wo.subtotal && wo.subtotal > 0 ? wo.subtotal : (wo.total || 0);
    const taxAmount = wo.iva && wo.iva > 0
      ? wo.iva
      : (isHonorarios ? Math.round(baseAmount * 0.1375) : Math.round(baseAmount * 0.19));
    const totalAmount = isHonorarios
      ? Math.max(0, baseAmount - taxAmount)
      : baseAmount + taxAmount;

    return {
      isHonorarios,
      taxLabel: isHonorarios ? 'RETENCIÓN BH (13.75%)' : 'IVA FACTURA (19%)',
      baseAmount,
      taxAmount,
      totalAmount
    };
  };

  // Filtered Orders for W43081A Grid
  const filteredEvaluations = useMemo(() => {
    return evaluatedOrders.filter(({ order, recommendedHoldCode }) => {
      const isPending = order.status === 'PENDIENTE_VB' || order.status === 'BORRADOR';
      const isHold = (order.holdCode && ['2H', 'B1', 'C1', 'Q1', 'T1'].includes(order.holdCode)) ||
        (order.items || []).some(i => i.status === 'EN_OBSERVACION');
      const isApproved = order.status === 'APROBADA' || order.status === 'RECEPCIONADA' || order.status === 'RECEPCIONADA_PARCIAL' || order.status === 'TERMINADA' || order.status === 'PAGADA';
      const isRejected = order.status === 'RECHAZADA';

      if (statusFilter === 'PENDING_ONLY' && !isPending && !isHold) return false;
      if (statusFilter === 'HOLD_ONLY' && !isHold && !['B1', 'C1', 'Q1', 'T1', '2H'].includes(recommendedHoldCode)) return false;
      if (statusFilter === 'APPROVED_ONLY' && !isApproved) return false;
      if (statusFilter === 'REJECTED_ONLY' && !isRejected) return false;

      const docType = order.orderDocumentType || (order.folio?.startsWith('OC') ? 'OC' : 'OT');
      if (docTypeFilter !== 'ALL' && docType !== docTypeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchGlobal =
          (order.folio || '').toLowerCase().includes(q) ||
          (order.supplierName || '').toLowerCase().includes(q) ||
          (order.propertyLabel || '').toLowerCase().includes(q) ||
          (order.category || '').toLowerCase().includes(q) ||
          (order.specialty || '').toLowerCase().includes(q) ||
          (order.associatedInvoice || '').toLowerCase().includes(q) ||
          (order.items?.[0]?.description || '').toLowerCase().includes(q);
        if (!matchGlobal) return false;
      }

      if (qbeFolio && !(order.folio || '').toLowerCase().includes(qbeFolio.toLowerCase())) return false;
      if (qbeSupplier && !(order.supplierName || '').toLowerCase().includes(qbeSupplier.toLowerCase())) return false;
      if (qbeCategory && !(order.category || '').toLowerCase().includes(qbeCategory.toLowerCase())) return false;
      if (qbeSpecialty && !(order.specialty || '').toLowerCase().includes(qbeSpecialty.toLowerCase())) return false;
      if (qbeInvoice && !(order.associatedInvoice || '').toLowerCase().includes(qbeInvoice.toLowerCase())) return false;

      return true;
    });
  }, [evaluatedOrders, statusFilter, docTypeFilter, searchQuery, qbeFolio, qbeSupplier, qbeCategory, qbeSpecialty, qbeInvoice]);

  // Currently Inspected Evaluation
  const inspectedEvaluation = useMemo(() => {
    return evaluatedOrders.find(e => e.order.id === inspectedOrderId) || filteredEvaluations[0] || evaluatedOrders[0];
  }, [evaluatedOrders, filteredEvaluations, inspectedOrderId]);

  // KPI Counters
  const kpis = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let holdCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    evaluatedOrders.forEach(({ order, recommendedHoldCode }) => {
      const isPending = order.status === 'PENDIENTE_VB' || order.status === 'BORRADOR';
      const isApproved = order.status === 'APROBADA' || order.status === 'RECEPCIONADA' || order.status === 'RECEPCIONADA_PARCIAL' || order.status === 'TERMINADA' || order.status === 'PAGADA';
      const isRejected = order.status === 'RECHAZADA';

      if (isPending) {
        pendingCount++;
        pendingAmount += order.total || 0;
      }
      if (['2H', 'B1', 'C1', 'Q1', 'T1'].includes(order.holdCode || recommendedHoldCode) && !isApproved && !isRejected) {
        holdCount++;
      }
      if (isApproved) approvedCount++;
      if (isRejected) rejectedCount++;
    });

    return { pendingCount, pendingAmount, holdCount, approvedCount, rejectedCount };
  }, [evaluatedOrders]);

  // Execute Single Order Approval (P43081 Release -> Status 230)
  const executeApproveOrder = (order: WorkOrder, notes?: string) => {
    const now = new Date();
    const evalState = evaluateWorkOrderJDEApprovalState(order, suppliers, properties);
    const totalSteps = evalState.routeEvaluation.applicableSteps.length;

    const updatedStepsTrace: WorkOrderApprovalStepTrace[] = evalState.stepsTrace.map(st => ({
      ...st,
      status: 'APPROVED',
      actionBy: st.status === 'APPROVED' ? st.actionBy : currentUser,
      actionAt: st.status === 'APPROVED' ? st.actionAt : now.toISOString(),
      isSubrogated: Boolean(evalState.activeDelegation),
      comments: notes || st.comments || 'Aprobado en mesa central P43081'
    }));

    const updatedItems = (order.items || []).map(item => ({
      ...item,
      status: (item.status === 'RECHAZADA' ? 'RECHAZADA' : 'APROBADA') as any,
      lineStatusCode: item.status === 'RECHAZADA' ? '999' : '230',
      approvedBy: currentUser,
      approvalDate: now.toISOString()
    }));

    const approvalAction: WorkOrderAction = {
      id: crypto.randomUUID(),
      date: now.toISOString(),
      entryDate: now.toISOString().split('T')[0],
      type: 'REALIZADA',
      user: currentUser,
      actionResponsible: `APROBADOR JDE P43081 (${currentUser})`,
      trackingResponsible: 'ADQUISICIONES & COMPRAS (R43500)',
      actionCategory: 'APPROVAL',
      sourceArea: 'MESA DE APROBACIONES P43081',
      targetArea: 'COMPRAS & RECEPCIÓN P4312',
      description: `APROBACIÓN OFICIAL ENTERPRISE P43081 (Ruta ${evalState.routeEvaluation.route.routeCode} • Nivel ${evalState.currentStepNumber}/${totalSteps} • Estado 220 -> 230 • Hold 2W -> 2A). ${notes ? `Dictamen: ${notes}` : 'Autorización presupuestaria y técnica conforme.'}`
    };

    const updatedOrder: WorkOrder = {
      ...order,
      items: updatedItems,
      status: 'APROBADA',
      jdeLastStatus: '220',
      jdeNextStatus: '230',
      holdCode: '2A',
      approvalRouteCode: evalState.routeEvaluation.route.routeCode,
      currentApprovalStep: totalSteps + 1,
      approvalStepsTrace: updatedStepsTrace,
      authorizedBy: currentUser,
      authorizationDate: now.toISOString().split('T')[0],
      authorizedAt: now.toISOString(),
      complianceApprovedBy: order.complianceApprovedBy || 'ING. CLAUDIA VALENZUELA (COMPLIANCE JDE)',
      complianceApprovedAt: order.complianceApprovedAt || now.toISOString(),
      evaluationNotes: notes || 'Orden liberada y aprobada conforme en P43081.',
      trackingActions: [approvalAction, ...(order.trackingActions || [])]
    };

    onSaveWorkOrder(updatedOrder);

    const logEntry = appendHeldOrderLogF4209({
      orderId: order.id,
      orderFolio: order.folio,
      orderType: order.orderDocumentType === 'OC' ? 'OP' : 'OT',
      businessUnit: order.propertyLabel || 'UNIDAD CENTRAL',
      lineNumber: 0,
      routeCode: evalState.routeEvaluation.route.routeCode,
      stepNumber: evalState.currentStepNumber,
      stepName: evalState.currentStep.stepName,
      requiredRole: evalState.currentStep.approverRole,
      requiredApprover: evalState.currentStep.approverName,
      holdCode: '2A',
      orderAmount: order.total || 0,
      releasedBy: currentUser,
      releasedByRole: userRole,
      isDelegatedAction: Boolean(evalState.activeDelegation),
      releaseDate: now.toISOString().split('T')[0],
      releaseTime: now.toLocaleTimeString('es-CL'),
      reasonCode: notes || 'APROBACIÓN CONFORME P43081',
      workStationId: 'WS_JDE911',
      programId: 'P43081'
    });
    sealAndChainF4209Ledger([logEntry, ...heldOrdersLog]).then(async (chained) => {
      setHeldOrdersLog(chained);
      const rep = await verifyF4209BlockchainIntegrity(chained);
      setChainVerificationReport(rep);
    });

    if (onAuditLog) {
      onAuditLog('APPROVE', `Orden ${order.folio} aprobada en P43081 (${formatCLP(order.total || 0)})`, order.id);
    }
    showNotice(`Orden ${order.folio} APROBADA (Estado JDE 230 / Hold 2A) y encadenada con SHA-256 en F4209.`, 'success');
  };

  // Execute Hold / Observation (P43081 Hold -> Status 225)
  const executeHoldOrder = (order: WorkOrder, holdCode: JDEHoldCodeType, reason: string) => {
    const now = new Date();
    const evalState = evaluateWorkOrderJDEApprovalState(order, suppliers, properties);
    const holdInfo = JDE_HOLD_CODES_UDC[holdCode] || JDE_HOLD_CODES_UDC['2H'];

    const updatedItems = (order.items || []).map(item => ({
      ...item,
      status: (item.status === 'PENDIENTE' ? 'EN_OBSERVACION' : item.status) as any,
      lineStatusCode: item.status === 'PENDIENTE' ? '225' : item.lineStatusCode,
      rejectionReason: reason
    }));

    const holdAction: WorkOrderAction = {
      id: crypto.randomUUID(),
      date: now.toISOString(),
      entryDate: now.toISOString().split('T')[0],
      type: 'PENDIENTE',
      user: currentUser,
      actionResponsible: order.preparedBy || 'SOLICITANTE',
      trackingResponsible: currentUser,
      actionCategory: 'INTER_AREA_REQUIREMENT',
      sourceArea: 'MESA DE APROBACIONES P43081',
      targetArea: order.preparedByDept || 'OPERACIONES',
      description: `RETENCIÓN / OBSERVACIÓN JDE P43081 [${holdInfo.label}] (Estado 220 -> 225): ${reason}`
    };

    const updatedOrder: WorkOrder = {
      ...order,
      items: updatedItems,
      status: 'PENDIENTE_VB',
      jdeLastStatus: '220',
      jdeNextStatus: '225',
      holdCode,
      evaluationNotes: `[HOLD ${holdCode}] ${reason}`,
      trackingActions: [holdAction, ...(order.trackingActions || [])]
    };

    onSaveWorkOrder(updatedOrder);

    const logEntry = appendHeldOrderLogF4209({
      orderId: order.id,
      orderFolio: order.folio,
      orderType: order.orderDocumentType === 'OC' ? 'OP' : 'OT',
      businessUnit: order.propertyLabel || 'UNIDAD CENTRAL',
      lineNumber: 0,
      routeCode: evalState.routeEvaluation.route.routeCode,
      stepNumber: evalState.currentStepNumber,
      stepName: evalState.currentStep.stepName,
      requiredRole: evalState.currentStep.approverRole,
      requiredApprover: evalState.currentStep.approverName,
      holdCode,
      orderAmount: order.total || 0,
      releasedBy: currentUser,
      releasedByRole: userRole,
      releaseDate: now.toISOString().split('T')[0],
      releaseTime: now.toLocaleTimeString('es-CL'),
      reasonCode: reason,
      workStationId: 'WS_JDE911',
      programId: 'P43081'
    });
    sealAndChainF4209Ledger([logEntry, ...heldOrdersLog]).then(async (chained) => {
      setHeldOrdersLog(chained);
      const rep = await verifyF4209BlockchainIntegrity(chained);
      setChainVerificationReport(rep);
    });

    if (onAuditLog) {
      onAuditLog('UPDATE', `Orden ${order.folio} retenida con código ${holdCode}: ${reason}`, order.id);
    }
    showNotice(`Orden ${order.folio} puesta en retención [${holdCode}] y encadenada con SHA-256 en F4209.`, 'warning');
  };

  // Execute Reject Order (P43081 Reject -> Status 999)
  const executeRejectOrder = (order: WorkOrder, reason: string) => {
    const now = new Date();
    const evalState = evaluateWorkOrderJDEApprovalState(order, suppliers, properties);

    const updatedItems = (order.items || []).map(item => ({
      ...item,
      status: 'RECHAZADA' as any,
      lineStatusCode: '999',
      rejectionReason: reason
    }));

    const rejectAction: WorkOrderAction = {
      id: crypto.randomUUID(),
      date: now.toISOString(),
      entryDate: now.toISOString().split('T')[0],
      type: 'REALIZADA',
      user: currentUser,
      actionResponsible: currentUser,
      trackingResponsible: order.preparedBy || 'SOLICITANTE',
      actionCategory: 'STATUS_CHANGE',
      sourceArea: 'MESA DE APROBACIONES P43081',
      targetArea: order.preparedByDept || 'OPERACIONES',
      description: `RECHAZO DEFINITIVO JDE P43081 (Estado 220 -> 999 • Hold 2R): ${reason}`
    };

    const updatedOrder: WorkOrder = {
      ...order,
      items: updatedItems,
      status: 'RECHAZADA',
      jdeLastStatus: '220',
      jdeNextStatus: '999',
      holdCode: '2R',
      rejectedBy: currentUser,
      rejectedAt: now.toISOString(),
      rejectionReason: reason,
      trackingActions: [rejectAction, ...(order.trackingActions || [])]
    };

    onSaveWorkOrder(updatedOrder);

    const logEntry = appendHeldOrderLogF4209({
      orderId: order.id,
      orderFolio: order.folio,
      orderType: order.orderDocumentType === 'OC' ? 'OP' : 'OT',
      businessUnit: order.propertyLabel || 'UNIDAD CENTRAL',
      lineNumber: 0,
      routeCode: evalState.routeEvaluation.route.routeCode,
      stepNumber: evalState.currentStepNumber,
      stepName: evalState.currentStep.stepName,
      requiredRole: evalState.currentStep.approverRole,
      requiredApprover: evalState.currentStep.approverName,
      holdCode: '2R',
      orderAmount: order.total || 0,
      releasedBy: currentUser,
      releasedByRole: userRole,
      releaseDate: now.toISOString().split('T')[0],
      releaseTime: now.toLocaleTimeString('es-CL'),
      reasonCode: reason,
      workStationId: 'WS_JDE911',
      programId: 'P43081'
    });
    sealAndChainF4209Ledger([logEntry, ...heldOrdersLog]).then(async (chained) => {
      setHeldOrdersLog(chained);
      const rep = await verifyF4209BlockchainIntegrity(chained);
      setChainVerificationReport(rep);
    });

    if (onAuditLog) {
      onAuditLog('REJECT', `Orden ${order.folio} rechazada en P43081: ${reason}`, order.id);
    }
    showNotice(`Orden ${order.folio} RECHAZADA (Estado JDE 999 / Hold 2R) y encadenada en F4209.`, 'error');
  };

  // Batch Approve Selected Orders
  const handleBatchApprove = () => {
    if (selectedOrderIds.length === 0) return;
    const targets = workOrders.filter(w => selectedOrderIds.includes(w.id));
    targets.forEach(order => {
      executeApproveOrder(order, `Liberación por lote (Batch Approval P43081) ejecutada por ${currentUser}`);
    });
    setSelectedOrderIds([]);
    showNotice(`${targets.length} órdenes aprobadas y liberadas exitosamente en lote (P43081).`, 'success');
  };

  // Create New F43092 Delegation
  const handleCreateDelegation = (e: React.FormEvent) => {
    e.preventDefault();
    const newDel: F43092DelegationRecord = {
      id: `del_f43092_${Date.now()}`,
      routeCode: 'OP_DEFAULT',
      orderType: 'ALL',
      principalRole: delPrincipalRole,
      principalName: delPrincipalName.toUpperCase(),
      delegateRole: delDelegateRole,
      delegateName: delDelegateName.toUpperCase(),
      effectiveFrom: delFrom,
      effectiveThru: delThru,
      maxDelegatedAmount: Number(delMaxAmount) || 5000000,
      reason: delReason,
      isActive: true,
      createdBy: currentUser,
      createdAt: new Date().toISOString()
    };
    const updated = saveDelegationF43092(newDel);
    setDelegations(updated);
    setIsNewDelegationOpen(false);
    showNotice(`Regla de subrogancia F43092 activada: ${newDel.principalName} → ${newDel.delegateName}.`, 'success');
  };

  // Toggle F43092 Delegation Active Status
  const handleToggleDelegationStatus = (del: F43092DelegationRecord) => {
    const updatedRecord: F43092DelegationRecord = {
      ...del,
      isActive: !del.isActive
    };
    const updatedList = saveDelegationF43092(updatedRecord);
    setDelegations(updatedList);
    showNotice(
      `Subrogancia F43092 (${del.principalName} → ${del.delegateName}) marcada como ${updatedRecord.isActive ? 'VIGENTE' : 'INACTIVA'}.`,
      updatedRecord.isActive ? 'success' : 'warning'
    );
  };

  // Context Menu Trigger Handlers (Right-Click or [⋮] Button)
  const handleOrderRowContextMenu = (
    e: React.MouseEvent,
    evaluation: ReturnType<typeof evaluateWorkOrderJDEApprovalState>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setInspectedOrderId(evaluation.order.id);
    setGridContextMenu({
      kind: 'ORDER',
      x: e.clientX || window.innerWidth / 2,
      y: e.clientY || window.innerHeight / 2,
      evaluation
    });
  };

  const handleDelegationRowContextMenu = (e: React.MouseEvent, delegation: F43092DelegationRecord) => {
    e.preventDefault();
    e.stopPropagation();
    setGridContextMenu({
      kind: 'DELEGATION',
      x: e.clientX || window.innerWidth / 2,
      y: e.clientY || window.innerHeight / 2,
      delegation
    });
  };

  const handleLedgerRowContextMenu = (e: React.MouseEvent, entry: F4209HeldOrderRecord) => {
    e.preventDefault();
    e.stopPropagation();
    setGridContextMenu({
      kind: 'LEDGER',
      x: e.clientX || window.innerWidth / 2,
      y: e.clientY || window.innerHeight / 2,
      entry
    });
  };

  // Keyboard F4 shortcut to open JDE Context Menu on currently inspected row
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4' && activeTab === 'W43081A_QUEUE' && inspectedEvaluation) {
        e.preventDefault();
        setGridContextMenu({
          kind: 'ORDER',
          x: Math.round(window.innerWidth / 2 - 140),
          y: Math.round(window.innerHeight / 3),
          evaluation: inspectedEvaluation
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, inspectedEvaluation]);

  return (
    <div className="h-full flex flex-col bg-[#f0f3f6] select-none overflow-hidden font-sans">
      {/* ==================================================================== */}
      {/* 1. ASSETFLOW 9.11 ENTERPRISE HEADER BAR (P43081 / P43280 / F4209)   */}
      {/* ==================================================================== */}
      <div className="bg-gradient-to-r from-[#002D62] via-[#0B3C5D] to-[#002D62] text-white px-5 py-3 border-b border-[#001D42] shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 border border-emerald-400/40 rounded-lg text-emerald-300">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                ERP 9.11 • P43081 / P48201
              </span>
              <h1 className="text-base font-black uppercase tracking-wide">
                Central de Aprobaciones de Órdenes de Trabajo (OT) y Órdenes de Compra (OC)
              </h1>
              <span className="text-[10px] font-mono bg-white/10 border border-white/20 px-2 py-0.5 rounded text-blue-200">
                Tablas: F4801 • F4301 • F4311 • F4209 • F43008 • F43092
              </span>
            </div>
            <p className="text-[11px] text-blue-100 font-medium mt-0.5">
              Liberación Jerárquica por Niveles, Aprobación por Línea (W43081B), Control de Retenciones (Hold Codes 42/HC) y Subrogancia de Firmas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleRunLiveChainVerification()}
            disabled={isVerifyingChain}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-black uppercase transition-all shadow-md cursor-pointer border ${
              chainVerificationReport && !chainVerificationReport.isChainIntact
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-300 animate-pulse'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-200'
            }`}
            title="Ejecutar verificación criptográfica SHA-256 bloque por bloque con Web Crypto API (crypto.subtle)"
          >
            {isVerifyingChain ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
            <span>
              Verificar Integridad de la Cadena de Bloques ({chainVerificationReport ? `${chainVerificationReport.validBlocksCount}/${chainVerificationReport.totalBlocks} SHA-256` : 'SHA-256'})
            </span>
          </button>
          {selectedOrderIds.length > 0 && (
            <button
              type="button"
              onClick={handleBatchApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded text-xs font-black uppercase transition-all shadow-md cursor-pointer"
            >
              <CheckCheck size={15} />
              <span>Aprobar Lote ({selectedOrderIds.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => exportWorkOrdersToExcel(filteredEvaluations.map(e => e.order), 'Cola_Aprobaciones_JDE_P43081')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 border border-emerald-400/40 text-white rounded text-xs font-bold uppercase transition-colors shadow-xs cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>Exportar Excel P43081</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {bannerFeedback && (
        <div className={`px-5 py-2 text-xs font-black flex items-center justify-between border-b shrink-0 ${
          bannerFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
          bannerFeedback.type === 'warning' ? 'bg-amber-50 text-amber-900 border-amber-300' :
          'bg-rose-50 text-rose-900 border-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {bannerFeedback.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            <span>{bannerFeedback.text}</span>
          </div>
          <button onClick={() => setBannerFeedback(null)} className="text-slate-500 hover:text-slate-800 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. EXECUTIVE KPI STRIP & NAVIGATION TABS                             */}
      {/* ==================================================================== */}
      <div className="bg-white border-b border-slate-300 px-5 pt-3 pb-0 shrink-0 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div
            onClick={() => { setActiveTab('W43081A_QUEUE'); setStatusFilter('PENDING_ONLY'); }}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
              statusFilter === 'PENDING_ONLY' && activeTab === 'W43081A_QUEUE'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-900">
              <span>En Espera de Firma (220 / 2W)</span>
              <Clock size={14} className="text-amber-600" />
            </div>
            <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{kpis.pendingCount} Órdenes</div>
            <div className="text-[10px] font-bold text-amber-800 font-mono">Cola: {formatCLP(kpis.pendingAmount)}</div>
          </div>

          <div
            onClick={() => { setActiveTab('W43081A_QUEUE'); setStatusFilter('HOLD_ONLY'); }}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
              statusFilter === 'HOLD_ONLY' && activeTab === 'W43081A_QUEUE'
                ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-purple-900">
              <span>Retenidas / Hold (225 / 42-HC)</span>
              <AlertTriangle size={14} className="text-purple-600" />
            </div>
            <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{kpis.holdCount} En Hold</div>
            <div className="text-[10px] font-semibold text-purple-700">Códigos B1, C1, Q1, T1, 2H</div>
          </div>

          <div
            onClick={() => { setActiveTab('W43081A_QUEUE'); setStatusFilter('APPROVED_ONLY'); }}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
              statusFilter === 'APPROVED_ONLY' && activeTab === 'W43081A_QUEUE'
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-emerald-900">
              <span>Aprobadas y Liberadas (230 / 2A)</span>
              <CheckCircle2 size={14} className="text-emerald-600" />
            </div>
            <div className="text-lg font-black text-emerald-900 font-mono mt-0.5">{kpis.approvedCount} Liberadas</div>
            <div className="text-[10px] font-semibold text-emerald-700">Habilitadas para R43500 / P4312</div>
          </div>

          <div
            onClick={() => { setActiveTab('W43081A_QUEUE'); setStatusFilter('REJECTED_ONLY'); }}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
              statusFilter === 'REJECTED_ONLY' && activeTab === 'W43081A_QUEUE'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-rose-900">
              <span>Rechazadas / Anuladas (999 / 2R)</span>
              <XCircle size={14} className="text-rose-600" />
            </div>
            <div className="text-lg font-black text-rose-900 font-mono mt-0.5">{kpis.rejectedCount} Rechazadas</div>
            <div className="text-[10px] font-semibold text-rose-700">Bloqueo de emisión y pago</div>
          </div>

          <div
            onClick={() => setActiveTab('P43280_DELEGATION')}
            className="p-2.5 rounded-lg border bg-indigo-50/60 border-indigo-200 hover:bg-indigo-50 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-indigo-900">
              <span>Subrogancias Activas (F43092)</span>
              <UserCheck size={14} className="text-indigo-600" />
            </div>
            <div className="text-lg font-black text-indigo-950 font-mono mt-0.5">
              {delegations.filter(d => d.isActive).length} Delegaciones
            </div>
            <div className="text-[10px] font-semibold text-indigo-700">Aprobador Activo: {currentUser}</div>
          </div>
        </div>

        {/* JDE APPLICATION TABS */}
        <div className="flex items-center gap-1 overflow-x-auto pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('W43081A_QUEUE')}
            className={`px-3.5 py-2 text-[11px] font-black uppercase tracking-tight border-t border-x rounded-t-lg flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
              activeTab === 'W43081A_QUEUE'
                ? 'bg-[#002D62] text-white border-[#002D62]'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck size={14} />
            <span>W43081A • Bandeja de Aprobación OTs / OCs (P43081)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('W43081C_INSPECTOR')}
            className={`px-3.5 py-2 text-[11px] font-black uppercase tracking-tight border-t border-x rounded-t-lg flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
              activeTab === 'W43081C_INSPECTOR'
                ? 'bg-[#002D62] text-white border-[#002D62]'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            <GitMerge size={14} />
            <span>W43081C • Inspector Jerárquico & Auditoría 3-Way</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('P43280_DELEGATION')}
            className={`px-3.5 py-2 text-[11px] font-black uppercase tracking-tight border-t border-x rounded-t-lg flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
              activeTab === 'P43280_DELEGATION'
                ? 'bg-[#002D62] text-white border-[#002D62]'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            <UserCheck size={14} />
            <span>P43280 • Subrogancia y Delegación (F43092)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('F4209_LEDGER')}
            className={`px-3.5 py-2 text-[11px] font-black uppercase tracking-tight border-t border-x rounded-t-lg flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
              activeTab === 'F4209_LEDGER'
                ? 'bg-[#002D62] text-white border-[#002D62]'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            <History size={14} />
            <span>F4209 / F43199 • Bitácora Forense de Firmas ({heldOrdersLog.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('P43008_ROUTES')}
            className={`px-3.5 py-2 text-[11px] font-black uppercase tracking-tight border-t border-x rounded-t-lg flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
              activeTab === 'P43008_ROUTES'
                ? 'bg-[#002D62] text-white border-[#002D62]'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            <Sliders size={14} />
            <span>P43008 • Reglas y Umbrales de Ruta (F43008)</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. TAB CONTENT AREA                                                  */}
      {/* ==================================================================== */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: W43081A - WORK WITH ORDERS AWAITING APPROVAL                */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'W43081A_QUEUE' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden flex flex-col">
            {/* FILTER & QBE TOOLBAR */}
            <div className="bg-[#EBF1F5] px-4 py-2.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-[240px]">
                  <Search size={13} className="absolute left-2.5 top-2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar OT/OC, Proveedor, Especialidad, Factura..."
                    className="w-full bg-white border border-slate-300 rounded pl-8 pr-3 py-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#002D62]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-bold uppercase text-slate-800"
                >
                  <option value="PENDING_ONLY">Cola Pendientes V°B° (220 / 2W)</option>
                  <option value="HOLD_ONLY">Retenidas en Observación (225 / Hold)</option>
                  <option value="APPROVED_ONLY">Aprobadas y Liberadas (230 / 2A)</option>
                  <option value="REJECTED_ONLY">Rechazadas (999 / 2R)</option>
                  <option value="ALL">Todas las Órdenes (F4801 / F4301)</option>
                </select>

                <select
                  value={docTypeFilter}
                  onChange={e => setDocTypeFilter(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-bold uppercase text-slate-800"
                >
                  <option value="ALL">Tipo Doc: OT + OC (Todos)</option>
                  <option value="OT">OT - Orden de Trabajo (F4801)</option>
                  <option value="OC">OC/OP - Orden de Compra (F4301)</option>
                </select>

                {(searchQuery || qbeFolio || qbeSupplier || qbeCategory || qbeSpecialty || qbeInvoice) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setQbeFolio('');
                      setQbeSupplier('');
                      setQbeCategory('');
                      setQbeSpecialty('');
                      setQbeInvoice('');
                    }}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} /> Limpiar QBE
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-2.5 py-1 rounded bg-[#002D62]/10 border border-[#002D62]/25 text-[#002D62] text-[10px] font-mono font-bold">
                  Clic derecho o botón [⋮] en cualquier fila → Menú Contextual JDE Row Exit (F4)
                </span>
                <button
                  type="button"
                  onClick={resetDimensions}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700 cursor-pointer"
                  title="Restaurar ancho de columnas y alto de filas predeterminado"
                >
                  Restaurar Grilla
                </button>
                <div className="text-[11px] font-mono text-slate-600">
                  Mostrando <strong className="text-[#002D62]">{filteredEvaluations.length}</strong> de <strong>{evaluatedOrders.length}</strong> órdenes
                </div>
              </div>
            </div>

            {/* MAIN JDE P43081 GRID */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-[#002D62] text-white font-bold text-[10px] uppercase tracking-tight select-none">
                  <tr>
                    {[
                      { label: 'Sel / JDE', align: 'text-center', defaultW: 68 },
                      { label: 'Folio / Tipo', align: 'text-left', defaultW: 130 },
                      { label: 'Proveedor & Activo', align: 'text-left', defaultW: 200 },
                      { label: 'Categoría (category)', align: 'text-left', defaultW: 155 },
                      { label: 'Especialidad (specialty)', align: 'text-left', defaultW: 135 },
                      { label: 'Doc. Asociado (associatedInvoice)', align: 'text-left', defaultW: 155 },
                      { label: 'Neto / Bruto', align: 'text-right', defaultW: 110 },
                      { label: 'IVA (19%) / Retención BH', align: 'text-right', defaultW: 145 },
                      { label: 'Total Orden', align: 'text-right', defaultW: 115 },
                      { label: 'Ruta P43008 & Nivel Firma', align: 'text-left', defaultW: 185 },
                      { label: 'Hold / Estado JDE', align: 'text-center', defaultW: 135 },
                      { label: 'Dictamen & Acciones P43081', align: 'text-center', defaultW: 250 }
                    ].map((col, cIdx) => {
                      const colKey = `col_${cIdx}`;
                      return (
                        <th
                          key={colKey}
                          style={{ width: colWidths[colKey] || col.defaultW, minWidth: 60 }}
                          onDoubleClick={() => onColumnDoubleClick(colKey)}
                          className={`relative py-2.5 px-2.5 ${col.align} border-r border-white/15`}
                        >
                          {cIdx === 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="checkbox"
                                checked={filteredEvaluations.length > 0 && selectedOrderIds.length === filteredEvaluations.length}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedOrderIds(filteredEvaluations.map(x => x.order.id));
                                  } else {
                                    setSelectedOrderIds([]);
                                  }
                                }}
                                className="cursor-pointer"
                                title="Seleccionar todas para aprobación por lote"
                              />
                              <span className="text-[9px] font-mono text-amber-300">[⋮]</span>
                            </div>
                          ) : (
                            col.label
                          )}
                          <div
                            onMouseDown={e => onColumnMouseDown(e, colKey)}
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400/70 transition-colors"
                          />
                        </th>
                      );
                    })}
                  </tr>
                  {/* QBE ROW */}
                  <tr className="bg-[#FFFFE1] text-slate-900 border-b border-slate-300">
                    <th className="p-1 text-center font-mono text-[9px] text-slate-500">QBE</th>
                    <th className="p-1">
                      <input
                        type="text"
                        value={qbeFolio}
                        onChange={e => setQbeFolio(e.target.value)}
                        placeholder="*Folio..."
                        className="w-full bg-white border border-slate-300 px-1.5 py-0.5 text-[10px] font-mono"
                      />
                    </th>
                    <th className="p-1">
                      <input
                        type="text"
                        value={qbeSupplier}
                        onChange={e => setQbeSupplier(e.target.value)}
                        placeholder="*Proveedor..."
                        className="w-full bg-white border border-slate-300 px-1.5 py-0.5 text-[10px] font-mono"
                      />
                    </th>
                    <th className="p-1">
                      <input
                        type="text"
                        value={qbeCategory}
                        onChange={e => setQbeCategory(e.target.value)}
                        placeholder="*Categoría..."
                        className="w-full bg-white border border-slate-300 px-1.5 py-0.5 text-[10px] font-mono"
                      />
                    </th>
                    <th className="p-1">
                      <input
                        type="text"
                        value={qbeSpecialty}
                        onChange={e => setQbeSpecialty(e.target.value)}
                        placeholder="*Especialidad..."
                        className="w-full bg-white border border-slate-300 px-1.5 py-0.5 text-[10px] font-mono"
                      />
                    </th>
                    <th className="p-1">
                      <input
                        type="text"
                        value={qbeInvoice}
                        onChange={e => setQbeInvoice(e.target.value)}
                        placeholder="*Factura / Boleta..."
                        className="w-full bg-white border border-slate-300 px-1.5 py-0.5 text-[10px] font-mono"
                      />
                    </th>
                    <th colSpan={6} className="p-1 text-right text-[9.5px] font-mono text-slate-500 pr-3">
                      Preservación íntegra F4801: category • specialty • associatedInvoice • IVA / Retención BH
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEvaluations.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-slate-500 font-mono text-xs">
                        No hay órdenes que coincidan con los filtros seleccionados en la bandeja P43081.
                      </td>
                    </tr>
                  ) : (
                    filteredEvaluations.map((ev, rIdx) => {
                      const { order, routeEvaluation, currentStep, recommendedHoldCode, activeDelegation } = ev;
                      const tax = getTaxBreakdown(order);
                      const holdInfo = JDE_HOLD_CODES_UDC[order.holdCode || recommendedHoldCode] || JDE_HOLD_CODES_UDC['2W'];
                      const isApproved = order.status === 'APROBADA' || order.status === 'RECEPCIONADA' || order.status === 'RECEPCIONADA_PARCIAL' || order.status === 'TERMINADA' || order.status === 'PAGADA';
                      const isRejected = order.status === 'RECHAZADA';

                      return (
                        <tr
                          key={order.id}
                          style={{ height: getRowHeight(order.id) }}
                          onClick={() => setInspectedOrderId(order.id)}
                          onContextMenu={e => handleOrderRowContextMenu(e, ev)}
                          title="Clic derecho para abrir el Menú Contextual Row Exit (P43081)"
                          className={`relative transition-colors cursor-pointer ${
                            inspectedOrderId === order.id
                              ? 'bg-[#FFFCDD] border-l-4 border-[#002D62]'
                              : isApproved
                              ? 'bg-emerald-50/20 hover:bg-emerald-50/50'
                              : isRejected
                              ? 'bg-rose-50/20 hover:bg-rose-50/50'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-1.5 text-center border-r border-slate-200 relative" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.includes(order.id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedOrderIds(prev => [...prev, order.id]);
                                  } else {
                                    setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                                  }
                                }}
                                className="cursor-pointer"
                              />
                              <button
                                type="button"
                                onClick={e => handleOrderRowContextMenu(e, ev)}
                                className="p-1 rounded hover:bg-[#002D62] hover:text-white text-slate-600 transition-colors cursor-pointer"
                                title="Abrir Menú Contextual JDE Row Exit (Clic derecho / F4)"
                              >
                                <MoreVertical size={13} />
                              </button>
                            </div>
                            <div
                              onMouseDown={e => onRowMouseDown(e, order.id)}
                              onDoubleClick={() => onRowDoubleClick(order.id)}
                              className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-amber-400/60"
                            />
                          </td>

                          {/* FOLIO / TIPO */}
                          <td className="py-2.5 px-2.5 border-r border-slate-200 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-[#002D62] border border-blue-300">
                                {order.orderDocumentType || (order.folio?.startsWith('OC') ? 'OC' : 'OT')}
                              </span>
                              <span className="font-black text-slate-900">{order.folio}</span>
                            </div>
                            <div className="text-[9.5px] text-slate-500 mt-0.5">{order.issueDate}</div>
                          </td>

                          {/* PROVEEDOR & ACTIVO */}
                          <td className="py-2.5 px-2.5 border-r border-slate-200">
                            <div className="font-black text-slate-900 uppercase truncate max-w-[200px]" title={order.supplierName}>
                              {order.supplierName}
                            </div>
                            <div className="text-[9.5px] text-slate-600 truncate max-w-[200px]" title={order.propertyLabel}>
                              {order.propertyLabel || 'UNIDAD CENTRAL'}
                            </div>
                          </td>

                          {/* CATEGORY */}
                          <td className="py-2.5 px-2.5 border-r border-slate-200">
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-emerald-50 text-emerald-900 border border-emerald-300 uppercase">
                              {order.category || 'MANTENCIÓN CORRECTIVA'}
                            </span>
                          </td>

                          {/* SPECIALTY */}
                          <td className="py-2.5 px-2.5 border-r border-slate-200">
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 text-slate-800 border border-slate-300 uppercase">
                              {order.specialty || 'GENERAL'}
                            </span>
                          </td>

                          {/* ASSOCIATED INVOICE */}
                          <td className="py-2.5 px-2.5 border-r border-slate-200 font-mono">
                            <div className="font-bold text-indigo-900 text-[10.5px]">
                              {order.associatedInvoice || 'PENDIENTE S/F'}
                            </div>
                            <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded uppercase ${
                              tax.isHonorarios ? 'bg-amber-100 text-amber-900' : 'bg-indigo-100 text-indigo-900'
                            }`}>
                              {tax.isHonorarios ? 'BOLETA HONORARIOS' : 'FACTURA AFECTA'}
                            </span>
                          </td>

                          {/* SUBTOTAL NETO / BRUTO */}
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                            {formatCLP(tax.baseAmount)}
                          </td>

                          {/* IVA O RETENCIÓN */}
                          <td className="py-2.5 px-2.5 text-right font-mono border-r border-slate-200">
                            <div className={`font-black ${tax.isHonorarios ? 'text-amber-800' : 'text-indigo-800'}`}>
                              {tax.isHonorarios ? `-${formatCLP(tax.taxAmount)}` : `+${formatCLP(tax.taxAmount)}`}
                            </div>
                            <div className="text-[8.5px] font-bold text-slate-500 uppercase">
                              {tax.taxLabel}
                            </div>
                          </td>

                          {/* TOTAL ORDEN */}
                          <td className="py-2.5 px-2.5 text-right font-mono font-black text-[#002D62] border-r border-slate-200 text-xs">
                            {formatCLP(tax.totalAmount)}
                          </td>

                          {/* RUTA P43008 & NIVEL ACTUAL */}
                          <td className="py-2.5 px-2.5 border-r border-slate-200">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[9.5px] font-black bg-slate-100 border border-slate-300 px-1.5 py-0.2 rounded text-[#002D62]">
                                {routeEvaluation.route.routeCode}
                              </span>
                              <span className="text-[9.5px] font-bold text-slate-600">
                                ({routeEvaluation.applicableSteps.length} Niv.)
                              </span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-800 truncate max-w-[180px] mt-0.5" title={currentStep.approverTitle}>
                              Firma: {currentStep.approverTitle}
                            </div>
                            {activeDelegation && (
                              <div className="text-[8.5px] font-black text-indigo-700">
                                Subroga F43092: {activeDelegation.delegateName}
                              </div>
                            )}
                          </td>

                          {/* HOLD / ESTADO JDE */}
                          <td className="py-2.5 px-2.5 text-center border-r border-slate-200">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black border uppercase ${holdInfo.badgeClass}`}>
                              {holdInfo.label}
                            </span>
                            <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                              EDO: {order.jdeLastStatus || '110'} → {order.jdeNextStatus || (isApproved ? '230' : isRejected ? '999' : '220')}
                            </div>
                          </td>

                          {/* ACCIONES P43081 */}
                          <td className="py-2.5 px-2 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {!isApproved && !isRejected && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionModal({ mode: 'APPROVE', order });
                                      setActionComment('Aprobación presupuestaria y técnica conforme a matriz P43008.');
                                    }}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9.5px] font-black uppercase flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Aprobar y Liberar Orden (P43081 -> 230)"
                                  >
                                    <Check size={11} /> Aprobar
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionModal({ mode: 'HOLD', order });
                                      setSelectedHoldCode(recommendedHoldCode !== '2W' && recommendedHoldCode !== '2A' ? recommendedHoldCode : '2H');
                                      setActionComment('En espera de respaldo de cotizaciones o aclaración de alcance técnico.');
                                    }}
                                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[9.5px] font-black uppercase flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Retener Orden con Código Hold (42/HC -> 225)"
                                  >
                                    <Clock size={11} /> Hold
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionModal({ mode: 'REJECT', order });
                                      setActionComment('Rechazada por exceder marco presupuestario o incumplir especificaciones técnicas.');
                                    }}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9.5px] font-black uppercase flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Rechazar Orden (P43081 -> 999)"
                                  >
                                    <X size={11} /> Rechazar
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => setLineApprovalOrder(order)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded text-[9.5px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Aprobación por Línea Individual (W43081B)"
                              >
                                <Layers size={11} /> Líneas ({order.items?.length || 0})
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setInspectedOrderId(order.id);
                                  setActiveTab('W43081C_INSPECTOR');
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9.5px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Inspeccionar Cadena de Firmas y Auditoría 3-Way"
                              >
                                <GitMerge size={11} /> Ruta
                              </button>

                              <button
                                type="button"
                                onClick={() => setPreviewOrder(order)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-[9.5px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Ver Documento Oficial OT/OC"
                              >
                                <Eye size={11} /> Doc
                              </button>

                              <button
                                type="button"
                                onClick={() => downloadJDEWorkOrderVoucher({ workOrder: order, companyLogo, currentUser })}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[9.5px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Descargar Voucher PDF Desglose F4801 (con IVA o Retención BH)"
                              >
                                <FileText size={11} /> PDF
                              </button>

                              <button
                                type="button"
                                onClick={e => handleOrderRowContextMenu(e, ev)}
                                className="px-1.5 py-1 bg-[#002D62] hover:bg-[#0A4B82] text-amber-300 rounded text-[9.5px] font-black flex items-center gap-0.5 cursor-pointer"
                                title="Menú Contextual Row Exit"
                              >
                                <MoreVertical size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: W43081C - HIERARCHICAL ROUTE INSPECTOR & 3-WAY AUDIT         */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'W43081C_INSPECTOR' && inspectedEvaluation && (
          <div className="space-y-4">
            {/* ORDER SELECTOR BAR */}
            <div className="bg-white rounded-lg border border-slate-300 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase text-[#002D62]">
                  Orden Inspeccionada en W43081C:
                </span>
                <select
                  value={inspectedEvaluation.order.id}
                  onChange={e => setInspectedOrderId(e.target.value)}
                  className="bg-[#FFFFE1] border border-slate-400 rounded px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                >
                  {evaluatedOrders.map(({ order }) => (
                    <option key={order.id} value={order.id}>
                      {order.folio} — {order.supplierName} ({formatCLP(order.total || 0)}) [{order.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLineApprovalOrder(inspectedEvaluation.order)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers size={14} /> Aprobar Líneas F4311
                </button>
                <button
                  type="button"
                  onClick={() => executeApproveOrder(inspectedEvaluation.order, 'Aprobada desde Inspector Jerárquico W43081C')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={14} /> Otorgar Firma y Liberar Orden
                </button>
              </div>
            </div>

            {/* HIERARCHICAL WORKFLOW PIPELINE */}
            <div className="bg-white rounded-lg border border-slate-300 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="text-xs font-black uppercase text-[#002D62] flex items-center gap-2">
                    <GitMerge size={15} />
                    Flujo Jerárquico Multinivel Activo: {inspectedEvaluation.routeEvaluation.route.routeName} ({inspectedEvaluation.routeEvaluation.route.routeCode})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Determinado automáticamente según el monto de la orden ({formatCLP(inspectedEvaluation.order.total || 0)}) y reglas F43008
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 font-mono text-xs font-black">
                  Puntaje Control Pre-Firma: {inspectedEvaluation.complianceScore}%
                </span>
              </div>

              <div className="flex items-stretch gap-2 overflow-x-auto py-2">
                {inspectedEvaluation.stepsTrace.map((step, idx) => (
                  <div key={step.stepNumber} className="flex items-center gap-2 shrink-0">
                    <div className={`w-64 rounded-lg border-2 p-3 flex flex-col justify-between space-y-2 ${
                      step.status === 'APPROVED' ? 'bg-emerald-50/50 border-emerald-500' :
                      step.status === 'REJECTED' ? 'bg-rose-50/50 border-rose-500' :
                      step.status === 'HOLD' ? 'bg-purple-50/50 border-purple-500' :
                      'bg-amber-50/50 border-amber-400'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-white border border-slate-300">
                            NIVEL {step.stepNumber}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            step.status === 'APPROVED' ? 'bg-emerald-600 text-white' :
                            step.status === 'REJECTED' ? 'bg-rose-600 text-white' :
                            step.status === 'HOLD' ? 'bg-purple-600 text-white' :
                            'bg-amber-400 text-slate-950'
                          }`}>
                            {step.status === 'APPROVED' ? 'FIRMADO' : step.status === 'REJECTED' ? 'RECHAZADO' : step.status === 'HOLD' ? 'EN HOLD' : 'PENDIENTE FIRMA'}
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-900 mt-1.5">{step.stepName}</p>
                        <p className="text-[10px] font-bold text-slate-600">{step.approverTitle}</p>
                        <p className="text-[10px] font-mono text-[#002D62] font-bold mt-0.5">
                          Titular: {step.requiredApproverName}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 text-[9.5px] font-mono text-slate-600 space-y-0.5">
                        {step.actionBy && <div>Ejecutor: <strong>{step.actionBy}</strong></div>}
                        {step.actionAt && <div>Fecha: {step.actionAt.split('T')[0]}</div>}
                        {step.comments && <div className="italic text-slate-500 truncate" title={step.comments}>{step.comments}</div>}
                      </div>
                    </div>
                    {idx < inspectedEvaluation.stepsTrace.length - 1 && (
                      <ArrowRight size={18} className="text-slate-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 7-POINT PRE-APPROVAL AUDIT & TAX SUMMARY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-slate-300 p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-[#002D62] border-b border-slate-200 pb-2 flex items-center gap-2">
                  <ShieldCheck size={15} />
                  Lista de Chequeo Automática Pre-Aprobación (Control Interno JDE)
                </h4>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Proveedor Activo en Libro de Direcciones (F0101)', ok: inspectedEvaluation.checks.supplierActive },
                    { label: 'Proveedor sin Bloqueo de Pago en Maestro AP (F0401 Hold = 00)', ok: inspectedEvaluation.checks.supplierPaymentHoldClear },
                    { label: 'Evaluación de Debida Diligencia y Riesgo UAF Aceptable', ok: inspectedEvaluation.checks.supplierRiskAcceptable },
                    { label: 'Referencia de Cotización Formal Registrada (N° Cotización)', ok: inspectedEvaluation.checks.hasQuoteReference },
                    { label: 'Clasificación Técnica Completa (category & specialty)', ok: inspectedEvaluation.checks.hasCategoryAndSpecialty },
                    { label: 'Documento Tributario Asociado Identificado (associatedInvoice)', ok: inspectedEvaluation.checks.hasAssociatedInvoiceInfo },
                    { label: 'Dentro del Marco Presupuestario Operativo de la Unidad (F0902)', ok: inspectedEvaluation.checks.withinPropertyBudget }
                  ].map((chk, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="font-semibold text-slate-800">{chk.label}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        chk.ok ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {chk.ok ? 'CONFORME' : 'OBSERVACIÓN'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-300 p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-[#002D62] border-b border-slate-200 pb-2 flex items-center gap-2">
                  <DollarSign size={15} />
                  Ficha Financiera y Tributaria de la Orden (F4801 / F4301)
                </h4>
                {(() => {
                  const o = inspectedEvaluation.order;
                  const tax = getTaxBreakdown(o);
                  return (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Categoría (category)</span>
                          <span className="font-black text-emerald-900 uppercase">{o.category || 'MANTENCIÓN CORRECTIVA'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Especialidad (specialty)</span>
                          <span className="font-black text-slate-900 uppercase">{o.specialty || 'GENERAL'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Doc. Asociado (associatedInvoice)</span>
                          <span className="font-mono font-black text-indigo-900 uppercase">{o.associatedInvoice || 'PENDIENTE'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Régimen Tributario</span>
                          <span className="font-black text-slate-900 uppercase">
                            {tax.isHonorarios ? 'BOLETA DE HONORARIOS (LEY 21.133)' : 'FACTURA AFECTA IVA (D.L. 825)'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#EBF3FB] border border-[#002D62]/30 rounded p-3 space-y-1.5 font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-700 font-bold">
                            {tax.isHonorarios ? 'Subtotal Honorario Bruto:' : 'Subtotal Neto Factura:'}
                          </span>
                          <span className="font-black text-slate-900">{formatCLP(tax.baseAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-700 font-bold">
                            {tax.isHonorarios ? 'Ítem Retención Boleta Honorarios (13.75%):' : 'Ítem IVA Factura Electrónica (19%):'}
                          </span>
                          <span className={`font-black ${tax.isHonorarios ? 'text-amber-800' : 'text-indigo-800'}`}>
                            {tax.isHonorarios ? `-${formatCLP(tax.taxAmount)}` : `+${formatCLP(tax.taxAmount)}`}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-[#002D62]/20 pt-1.5 text-sm">
                          <span className="font-black text-[#002D62]">
                            {tax.isHonorarios ? 'MONTO LÍQUIDO A PAGAR:' : 'MONTO TOTAL CON IVA:'}
                          </span>
                          <span className="font-black text-[#002D62]">{formatCLP(tax.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: P43280 - APPROVAL DELEGATION & SUBROGATION (F43092)          */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'P43280_DELEGATION' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
            <div className="bg-[#EBF1F5] px-4 py-3 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black uppercase text-[#002D62]">
                  P43280 • Maestro de Delegación de Autoridad y Subrogancia de Firmas (Tabla F43092)
                </h3>
                <p className="text-[11px] text-slate-600">
                  Permite redirigir temporalmente la facultad de aprobación de OTs y OCs a un aprobador subrogante sin detener la operación (Clic derecho o [⋮] para Menú Contextual JDE)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewDelegationOpen(true)}
                className="px-3 py-1.5 bg-[#002D62] hover:bg-[#0A4B82] text-white rounded text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Nueva Delegación F43092
              </button>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#002D62] text-white text-[10px] font-black uppercase">
                <tr>
                  <th className="p-2.5 text-center w-12">JDE [⋮]</th>
                  <th className="p-2.5">Ruta (ARTG)</th>
                  <th className="p-2.5">Aprobador Titular (APPR)</th>
                  <th className="p-2.5">Subrogante Autorizado (DLGT)</th>
                  <th className="p-2.5">Vigencia (EFTJ - EXDJ)</th>
                  <th className="p-2.5 text-right">Monto Tope Delegado (ALIM)</th>
                  <th className="p-2.5">Causal</th>
                  <th className="p-2.5 text-center">Estado</th>
                  <th className="p-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {delegations.map(del => (
                  <tr
                    key={del.id}
                    onContextMenu={e => handleDelegationRowContextMenu(e, del)}
                    className="hover:bg-slate-50 cursor-pointer"
                    title="Clic derecho para abrir el Menú Contextual JDE (P43280)"
                  >
                    <td className="p-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={e => handleDelegationRowContextMenu(e, del)}
                        className="p-1 rounded hover:bg-[#002D62] hover:text-white text-slate-600 cursor-pointer"
                        title="Abrir Menú Contextual JDE (P43280)"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </td>
                    <td className="p-2.5 font-mono font-black text-[#002D62]">{del.routeCode}</td>
                    <td className="p-2.5">
                      <div className="font-black text-slate-900">{del.principalName}</div>
                      <div className="text-[10px] text-slate-500">{del.principalRole}</div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-black text-emerald-800">{del.delegateName}</div>
                      <div className="text-[10px] text-slate-500">{del.delegateRole}</div>
                    </td>
                    <td className="p-2.5 font-mono text-[11px]">{del.effectiveFrom} → {del.effectiveThru}</td>
                    <td className="p-2.5 text-right font-mono font-black text-slate-900">{formatCLP(del.maxDelegatedAmount)}</td>
                    <td className="p-2.5 font-bold text-slate-700">{del.reason.replace(/_/g, ' ')}</td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleDelegationStatus(del);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase cursor-pointer ${
                          del.isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {del.isActive ? 'VIGENTE' : 'INACTIVA'}
                      </button>
                    </td>
                    <td className="p-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setDelegations(deleteDelegationF43092(del.id))}
                        className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                        title="Eliminar delegación"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: F4209 / F43199 - FORENSIC APPROVAL LEDGER & HASH-CHAIN      */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'F4209_LEDGER' && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden space-y-0">
            <div className="bg-[#EBF1F5] px-4 py-3 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black uppercase text-[#002D62]">
                    Archivo Transaccional F4209 / F43199 • Cadena de Bloques Criptográfica de Aprobaciones (SHA-256)
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase ${
                    chainVerificationReport && !chainVerificationReport.isChainIntact
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {chainVerificationReport && !chainVerificationReport.isChainIntact
                      ? 'ALERTA: RUPTURA DE CADENA DETECTADA'
                      : 'HASH-CHAIN FIPS 180-4 ÍNTEGRA'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Cada liberación, retención o rechazo se encadena criptográficamente con el hash SHA-256 del bloque anterior mediante Web Crypto API (<code className="font-mono text-[#002D62]">crypto.subtle.digest(&apos;SHA-256&apos;)</code>) • Clic derecho o [⋮] en cualquier bloque para Menú Forense JDE
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRunLiveChainVerification()}
                  className="px-3.5 py-1.5 bg-[#002D62] hover:bg-[#001D42] text-amber-300 border border-blue-900 rounded text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Lock size={14} /> Verificar Integridad de la Cadena de Bloques
                </button>
                <button
                  type="button"
                  onClick={() => exportToExcel(heldOrdersLog, 'Bitacora_Aprobaciones_F4209_JDE')}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={14} /> Exportar F4209
                </button>
              </div>
            </div>

            {chainVerificationReport && (
              <div className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono ${
                chainVerificationReport.isChainIntact
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}>
                <div className="flex flex-wrap items-center gap-4">
                  <span><strong>MERKLE ROOT (SHA-256):</strong> {chainVerificationReport.merkleRootHash.slice(0, 24)}...{chainVerificationReport.merkleRootHash.slice(-12)}</span>
                  <span><strong>BLOQUES VERIFICADOS:</strong> {chainVerificationReport.validBlocksCount}/{chainVerificationReport.totalBlocks}</span>
                  <span><strong>TIEMPO WEB CRYPTO:</strong> {chainVerificationReport.executionTimeMs} ms</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRunLiveChainVerification()}
                  className="underline font-sans font-black uppercase text-[10px] text-[#002D62] hover:text-indigo-800 cursor-pointer"
                >
                  Abrir Inspector Criptográfico Bloque por Bloque →
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-[#002D62] text-white text-[10px] font-black uppercase">
                  <tr>
                    <th className="p-2.5 text-center w-12">JDE [⋮]</th>
                    <th className="p-2.5 text-center">Bloque #</th>
                    <th className="p-2.5">Fecha / Hora (RDJ/RTM)</th>
                    <th className="p-2.5">Folio Orden (DOCO)</th>
                    <th className="p-2.5">Ruta / Paso</th>
                    <th className="p-2.5">Código Hold (HCOD)</th>
                    <th className="p-2.5 text-right">Monto Orden</th>
                    <th className="p-2.5">Firmante / Liberador (RPER)</th>
                    <th className="p-2.5">Hash Bloque Anterior (Prev SHA-256)</th>
                    <th className="p-2.5">Hash Sello del Bloque (Block SHA-256)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {heldOrdersLog.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500 font-mono">
                        Aún no se han registrado liberaciones en F4209.
                      </td>
                    </tr>
                  ) : (
                    heldOrdersLog.map(entry => {
                      const hInfo = JDE_HOLD_CODES_UDC[entry.holdCode] || JDE_HOLD_CODES_UDC['2W'];
                      const blockCheck = chainVerificationReport?.blocks.find(b => b.record.id === entry.id);
                      const isInvalid = blockCheck && !blockCheck.isBlockValid;
                      return (
                        <tr
                          key={entry.id}
                          onContextMenu={e => handleLedgerRowContextMenu(e, entry)}
                          onClick={() => handleRunLiveChainVerification(undefined, entry.id, true)}
                          title="Clic para inspeccionar bloque o clic derecho para Menú Contextual Forense JDE (F4209)"
                          className={`cursor-pointer ${isInvalid ? 'bg-rose-50/90 hover:bg-rose-100/70' : 'hover:bg-slate-50'}`}
                        >
                          <td className="p-2.5 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={e => handleLedgerRowContextMenu(e, entry)}
                              className="p-1 rounded hover:bg-[#002D62] hover:text-white text-slate-600 cursor-pointer"
                              title="Abrir Menú Contextual Forense F4209"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </td>
                          <td className="p-2.5 text-center font-mono font-black">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              isInvalid ? 'bg-rose-600 text-white' : 'bg-slate-900 text-amber-300'
                            }`}>
                              #{entry.blockIndex || 1}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-700">{entry.releaseDate} {entry.releaseTime}</td>
                          <td className="p-2.5 font-mono font-black text-[#002D62]">{entry.orderFolio}</td>
                          <td className="p-2.5 font-bold text-slate-800">{entry.routeCode} • Paso {entry.stepNumber}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-black border uppercase ${hInfo.badgeClass}`}>
                              {hInfo.label}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-slate-900">{formatCLP(entry.orderAmount)}</td>
                          <td className="p-2.5 font-bold text-slate-900">
                            {entry.releasedBy}
                            {entry.isDelegatedAction && (
                              <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-800 px-1 rounded">SUBROGANTE F43092</span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-[9.5px] text-slate-600" title={entry.previousBlockHash}>
                            {(entry.previousBlockHash || GENESIS_BLOCK_HASH).slice(0, 14)}...{(entry.previousBlockHash || GENESIS_BLOCK_HASH).slice(-6)}
                          </td>
                          <td className="p-2.5 font-mono text-[9.5px]" title={entry.digitalSignatureHash}>
                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                              isInvalid
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                            }`}>
                              {(entry.digitalSignatureHash || '').slice(0, 16)}...{(entry.digitalSignatureHash || '').slice(-8)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: P43008 - EMBEDDED APPROVAL LEVEL RULES                       */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'P43008_ROUTES' && (
          <div className="bg-white rounded-lg border border-slate-300 overflow-hidden min-h-[620px]">
            <ApprovalRoutesModule
              currentUser={currentUser}
              userRole="ADMINISTRADOR"
              onAuditLog={(act, det) => onAuditLog && onAuditLog('UPDATE', `${act}: ${det}`)}
            />
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* ASSETFLOW ENTERPRISE GRID CONTEXT MENU (W43081A / P43280 / F4209)    */}
      {/* ==================================================================== */}
      {gridContextMenu && gridContextMenu.kind === 'ORDER' && (() => {
        const { order, recommendedHoldCode } = gridContextMenu.evaluation;
        const isApproved = order.status === 'APROBADA' || order.status === 'RECEPCIONADA' || order.status === 'RECEPCIONADA_PARCIAL' || order.status === 'TERMINADA' || order.status === 'PAGADA';
        const isRejected = order.status === 'RECHAZADA';
        const isSelected = selectedOrderIds.includes(order.id);

        const rowExits: JDEContextMenuItem[] = [
          {
            id: 'jde_approve_release',
            label: 'Aprobar y Liberar Orden (Estado 220 → 230 / Hold 2A)',
            shortcut: 'P43081-REL',
            icon: <CheckCircle2 size={14} className="text-emerald-600" />,
            disabled: isApproved,
            onClick: () => {
              setActionModal({ mode: 'APPROVE', order });
              setActionComment('Aprobación presupuestaria y técnica conforme a matriz P43008.');
            }
          },
          {
            id: 'jde_hold_order',
            label: 'Poner Orden en Retención / Hold (Estado 220 → 225 / 42-HC)',
            shortcut: 'P43081-HLD',
            icon: <Clock size={14} className="text-purple-600" />,
            disabled: isApproved || isRejected,
            onClick: () => {
              setActionModal({ mode: 'HOLD', order });
              setSelectedHoldCode(recommendedHoldCode !== '2W' && recommendedHoldCode !== '2A' ? recommendedHoldCode : '2H');
              setActionComment('En espera de respaldo de cotizaciones o aclaración de alcance técnico.');
            }
          },
          {
            id: 'jde_reject_order',
            label: 'Rechazar / Anular Orden (Estado 220 → 999 / Hold 2R)',
            shortcut: 'P43081-REJ',
            icon: <XCircle size={14} className="text-rose-600" />,
            disabled: isApproved || isRejected,
            danger: true,
            dividerAfter: true,
            onClick: () => {
              setActionModal({ mode: 'REJECT', order });
              setActionComment('Rechazada por exceder marco presupuestario o incumplir especificaciones técnicas.');
            }
          },
          {
            id: 'jde_line_approval_w43081b',
            label: `Aprobación por Línea Individual (${order.items?.length || 0} Ítems F4311)`,
            shortcut: 'W43081B',
            icon: <Layers size={14} className="text-indigo-600" />,
            onClick: () => setLineApprovalOrder(order)
          },
          {
            id: 'jde_route_inspector_w43081c',
            label: 'Inspeccionar Ruta Jerárquica y Auditoría 3-Way',
            shortcut: 'W43081C',
            icon: <GitMerge size={14} className="text-blue-600" />,
            onClick: () => {
              setInspectedOrderId(order.id);
              setActiveTab('W43081C_INSPECTOR');
            }
          },
          {
            id: 'jde_blockchain_verify_f4209',
            label: 'Verificar Cadena de Bloques SHA-256 en Vivo (F4209)',
            shortcut: 'SHA-256',
            icon: <Lock size={14} className="text-amber-600" />,
            dividerAfter: true,
            onClick: () => handleRunLiveChainVerification()
          },
          {
            id: 'jde_view_official_doc',
            label: 'Ver Documento Oficial OT / OC en Pantalla',
            shortcut: 'R43500',
            icon: <Eye size={14} className="text-slate-700" />,
            onClick: () => setPreviewOrder(order)
          },
          {
            id: 'jde_download_pdf_f4801',
            label: 'Descargar Voucher PDF Oficial (Desglose IVA / Retención BH)',
            shortcut: 'PDF F4801',
            icon: <FileText size={14} className="text-emerald-700" />,
            onClick: () => downloadJDEWorkOrderVoucher({ workOrder: order, companyLogo, currentUser })
          },
          {
            id: 'jde_batch_select_toggle',
            label: isSelected ? 'Quitar de Selección de Aprobación por Lote' : 'Marcar para Aprobación por Lote (Batch Release)',
            shortcut: 'BATCH',
            icon: <CheckCheck size={14} className="text-indigo-700" />,
            onClick: () => {
              if (isSelected) {
                setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
              } else {
                setSelectedOrderIds(prev => [...prev, order.id]);
              }
            }
          }
        ];

        return (
          <JDEGridContextMenu
            x={gridContextMenu.x}
            y={gridContextMenu.y}
            programCode="P43081"
            programTitle="Order Approval & Release Workbench (W43081A)"
            collectionName="work_orders (F4801 / F4301)"
            recordKey={order.folio}
            recordData={order}
            currentStatus={order.status}
            statusOptions={[
              { label: 'APROBADA (Estado JDE 230 / Hold 2A)', value: 'APROBADA', color: 'emerald' },
              { label: 'EN OBSERVACIÓN / HOLD (Estado JDE 225 / 2H)', value: 'HOLD_2H', color: 'amber' },
              { label: 'RECHAZADA (Estado JDE 999 / Hold 2R)', value: 'RECHAZADA', color: 'rose' }
            ]}
            onUpdateStatus={(newSt) => {
              if (newSt === 'APROBADA') {
                executeApproveOrder(order, 'Aprobada mediante cambio rápido en Menú Contextual JDE P43081');
              } else if (newSt === 'HOLD_2H') {
                executeHoldOrder(order, '2H', 'Retenida en observación desde Menú Contextual JDE P43081');
              } else if (newSt === 'RECHAZADA') {
                executeRejectOrder(order, 'Rechazada desde Menú Contextual JDE P43081');
              }
            }}
            onClose={() => setGridContextMenu(null)}
            onSelectRow={() => {
              if (isSelected) {
                setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
              } else {
                setSelectedOrderIds(prev => [...prev, order.id]);
              }
            }}
            onViewDetails={() => {
              setInspectedOrderId(order.id);
              setActiveTab('W43081C_INSPECTOR');
            }}
            onEdit={() => setLineApprovalOrder(order)}
            onPrint={() => downloadJDEWorkOrderVoucher({ workOrder: order, companyLogo, currentUser })}
            onExportExcel={() => exportWorkOrdersToExcel([order], `Orden_${order.folio}_P43081`)}
            onClearQBE={() => {
              setSearchQuery('');
              setQbeFolio('');
              setQbeSupplier('');
              setQbeCategory('');
              setQbeSpecialty('');
              setQbeInvoice('');
            }}
            onTraceability={() => handleRunLiveChainVerification()}
            onSetRowHeight={h => setDefaultRowHeight(h)}
            onResetColumns={resetWidths}
            onResetRows={resetHeights}
            onResetGridDimensions={resetDimensions}
            rowExits={rowExits}
          />
        );
      })()}

      {gridContextMenu && gridContextMenu.kind === 'DELEGATION' && (() => {
        const del = gridContextMenu.delegation;
        const delExits: JDEContextMenuItem[] = [
          {
            id: 'del_toggle_active',
            label: del.isActive ? 'Pausar / Desactivar Vigencia de Subrogancia' : 'Activar Vigencia de Subrogancia F43092',
            shortcut: 'F43092-ST',
            icon: <UserCheck size={14} className="text-emerald-600" />,
            onClick: () => handleToggleDelegationStatus(del)
          },
          {
            id: 'del_new_rule',
            label: 'Crear Nueva Regla de Subrogancia (P43280)',
            shortcut: 'P43280-ADD',
            icon: <Plus size={14} className="text-indigo-600" />,
            onClick: () => setIsNewDelegationOpen(true)
          }
        ];

        return (
          <JDEGridContextMenu
            x={gridContextMenu.x}
            y={gridContextMenu.y}
            programCode="P43280"
            programTitle="Approval Delegation & Subrogation Master (F43092)"
            collectionName="f43092_delegations"
            recordKey={`${del.routeCode} • ${del.principalName}`}
            recordData={del}
            onClose={() => setGridContextMenu(null)}
            onEdit={() => handleToggleDelegationStatus(del)}
            onCopy={() => {
              setDelPrincipalName(del.principalName);
              setDelPrincipalRole(del.principalRole);
              setDelDelegateName(del.delegateName);
              setDelDelegateRole(del.delegateRole);
              setDelMaxAmount(del.maxDelegatedAmount);
              setIsNewDelegationOpen(true);
            }}
            onExportExcel={() => exportToExcel(delegations, 'Maestro_Subrogancias_F43092')}
            onDelete={() => {
              setDelegations(deleteDelegationF43092(del.id));
              showNotice(`Regla de subrogancia F43092 eliminada.`, 'warning');
            }}
            rowExits={delExits}
          />
        );
      })()}

      {gridContextMenu && gridContextMenu.kind === 'LEDGER' && (() => {
        const entry = gridContextMenu.entry;
        const matchedEval = evaluatedOrders.find(e => e.order.id === entry.orderId || e.order.folio === entry.orderFolio);

        const ledgerExits: JDEContextMenuItem[] = [
          {
            id: 'ledger_inspect_block',
            label: `Inspeccionar Bloque #${entry.blockIndex || 1} en Verificador Web Crypto SHA-256`,
            shortcut: 'SHA-256',
            icon: <Lock size={14} className="text-amber-600" />,
            onClick: () => handleRunLiveChainVerification(undefined, entry.id)
          },
          {
            id: 'ledger_copy_hash',
            label: 'Copiar Hash SHA-256 del Bloque al Portapapeles',
            shortcut: 'CTRL+C',
            icon: <Copy size={14} className="text-emerald-600" />,
            dividerAfter: true,
            onClick: () => {
              if (navigator.clipboard && entry.digitalSignatureHash) {
                navigator.clipboard.writeText(entry.digitalSignatureHash);
                showNotice(`Hash SHA-256 del Bloque #${entry.blockIndex || 1} copiado al portapapeles.`, 'success');
              }
            }
          }
        ];

        if (matchedEval) {
          ledgerExits.push({
            id: 'ledger_open_w43081c',
            label: `Abrir Orden ${matchedEval.order.folio} en Inspector Jerárquico W43081C`,
            shortcut: 'W43081C',
            icon: <GitMerge size={14} className="text-indigo-600" />,
            onClick: () => {
              setInspectedOrderId(matchedEval.order.id);
              setActiveTab('W43081C_INSPECTOR');
            }
          });
        }

        return (
          <JDEGridContextMenu
            x={gridContextMenu.x}
            y={gridContextMenu.y}
            programCode="F4209 / P43081"
            programTitle="Cryptographic Approval Ledger & Hash-Chain"
            collectionName="f4209_blockchain_ledger"
            recordKey={`BLOQUE #${entry.blockIndex || 1} • ${entry.orderFolio}`}
            recordData={entry}
            onClose={() => setGridContextMenu(null)}
            onViewDetails={() => handleRunLiveChainVerification(undefined, entry.id)}
            onTraceability={() => handleRunLiveChainVerification(undefined, entry.id)}
            onExportExcel={() => exportToExcel(heldOrdersLog, 'Bitacora_Blockchain_F4209')}
            rowExits={ledgerExits}
          />
        );
      })()}

      {/* ==================================================================== */}
      {/* MODAL: DICTAMEN DE APROBACIÓN / HOLD / RECHAZO (P43081)              */}
      {/* ==================================================================== */}
      {actionModal && (
        <div className="fixed inset-0 z-[260] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border-2 border-[#002D62] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className={`px-5 py-3 text-white flex items-center justify-between ${
              actionModal.mode === 'APPROVE' ? 'bg-emerald-700' :
              actionModal.mode === 'HOLD' ? 'bg-purple-700' :
              'bg-rose-700'
            }`}>
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} />
                {actionModal.mode === 'APPROVE' && `Aprobar y Liberar Orden ${actionModal.order.folio} (P43081 -> 230)`}
                {actionModal.mode === 'HOLD' && `Retener Orden ${actionModal.order.folio} en Observación (F4209 Hold)`}
                {actionModal.mode === 'REJECT' && `Rechazar Orden ${actionModal.order.folio} (P43081 -> 999)`}
              </h3>
              <button onClick={() => setActionModal(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Proveedor:</span>
                  <span className="font-black text-slate-900">{actionModal.order.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Categoría / Especialidad:</span>
                  <span className="font-bold text-emerald-800">{actionModal.order.category} • {actionModal.order.specialty || 'GENERAL'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Documento Asociado:</span>
                  <span className="font-mono font-bold text-indigo-800">{actionModal.order.associatedInvoice || 'PENDIENTE'}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                  <span className="text-slate-700 font-black">Monto Total Orden:</span>
                  <span className="font-mono font-black text-[#002D62] text-sm">{formatCLP(actionModal.order.total || 0)}</span>
                </div>
              </div>

              {actionModal.mode === 'HOLD' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-700 block">
                    Código de Retención (UDC 42/HC) *
                  </label>
                  <select
                    value={selectedHoldCode}
                    onChange={e => setSelectedHoldCode(e.target.value as JDEHoldCodeType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="2H">2H - Retenida en Observación General (On Hold)</option>
                    <option value="B1">B1 - Hold Control Presupuestario (Exceso Partida F0902)</option>
                    <option value="C1">C1 - Hold Compliance & UAF (Verificación Proveedor F0401)</option>
                    <option value="Q1">Q1 - Hold Cotizaciones Comparativas (Regla P43008)</option>
                    <option value="T1">T1 - Hold Revisión Técnica de Especialidad en Terreno</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-700 block">
                  Dictamen / Observación de Auditoría F4209 *
                </label>
                <textarea
                  rows={3}
                  value={actionComment}
                  onChange={e => setActionComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  placeholder="Ingrese la fundamentación técnica o presupuestaria..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (actionModal.mode === 'APPROVE') {
                      executeApproveOrder(actionModal.order, actionComment);
                    } else if (actionModal.mode === 'HOLD') {
                      executeHoldOrder(actionModal.order, selectedHoldCode, actionComment);
                    } else {
                      executeRejectOrder(actionModal.order, actionComment);
                    }
                    setActionModal(null);
                  }}
                  className={`px-4 py-1.5 text-white rounded text-xs font-black uppercase shadow-md cursor-pointer ${
                    actionModal.mode === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    actionModal.mode === 'HOLD' ? 'bg-purple-600 hover:bg-purple-700' :
                    'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirmar y Registrar en F4209
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: NUEVA SUBROGANCIA F43092 (P43280)                             */}
      {/* ==================================================================== */}
      {isNewDelegationOpen && (
        <div className="fixed inset-0 z-[260] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border-2 border-[#002D62] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#002D62] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <UserCheck size={15} />
                P43280 • Nueva Regla de Subrogancia (Tabla F43092)
              </h3>
              <button onClick={() => setIsNewDelegationOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateDelegation} className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 block">Aprobador Titular que Delega (APPR)</label>
                <input
                  type="text"
                  value={delPrincipalName}
                  onChange={e => setDelPrincipalName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold uppercase mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 block">Rol del Titular</label>
                <select
                  value={delPrincipalRole}
                  onChange={e => setDelPrincipalRole(e.target.value as ApproverRoleType)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold uppercase mt-1"
                >
                  <option value="JEFE_MANTENCIÓN">JEFE DE MANTENCIÓN</option>
                  <option value="COMPLIANCE_JDE">COMPLIANCE ERP</option>
                  <option value="GERENCIA_OPERACIONES">GERENCIA DE OPERACIONES</option>
                  <option value="GERENCIA_GENERAL">GERENCIA GENERAL</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 block">Subrogante Habilitado (DLGT)</label>
                <input
                  type="text"
                  value={delDelegateName}
                  onChange={e => setDelDelegateName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold uppercase mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-700 block">Desde (EFTJ)</label>
                  <input
                    type="date"
                    value={delFrom}
                    onChange={e => setDelFrom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-700 block">Hasta (EXDJ)</label>
                  <input
                    type="date"
                    value={delThru}
                    onChange={e => setDelThru(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono mt-1"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-700 block">Monto Máximo ($ CLP)</label>
                  <input
                    type="number"
                    value={delMaxAmount}
                    onChange={e => setDelMaxAmount(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono font-bold mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-700 block">Causal</label>
                  <select
                    value={delReason}
                    onChange={e => setDelReason(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-bold mt-1"
                  >
                    <option value="VACACIONES">VACACIONES</option>
                    <option value="LICENCIA_MEDICA">LICENCIA MÉDICA</option>
                    <option value="COMISION_SERVICIO">COMISIÓN DE SERVICIO</option>
                    <option value="ALTA_CARGA_OPERATIVA">ALTA CARGA OPERATIVA</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewDelegationOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded font-bold uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#002D62] text-white rounded font-black uppercase cursor-pointer"
                >
                  Guardar F43092
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: LINE-BY-LINE APPROVAL (W43081B)                               */}
      {/* ==================================================================== */}
      {lineApprovalOrder && (
        <JDELineApprovalModal
          isOpen={!!lineApprovalOrder}
          onClose={() => setLineApprovalOrder(null)}
          order={lineApprovalOrder}
          currentUser={currentUser}
          onSaveOrder={(updated) => {
            onSaveWorkOrder(updated);
            setLineApprovalOrder(updated);
            showNotice(`Líneas de la orden ${updated.folio} actualizadas en W43081B.`, 'success');
          }}
          isManager={true}
        />
      )}

      {/* ==================================================================== */}
      {/* MODAL: OFFICIAL WORK ORDER DOCUMENT PREVIEW                          */}
      {/* ==================================================================== */}
      {previewOrder && (
        <div className="fixed inset-0 z-[270] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden">
            <div className="bg-[#002D62] text-white px-5 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-amber-300" />
                <span className="text-xs font-black uppercase">
                  Vista Previa Documento Oficial OT/OC: {previewOrder.folio}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadJDEWorkOrderVoucher({ workOrder: previewOrder, companyLogo, currentUser })}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-black uppercase flex items-center gap-1 cursor-pointer"
                >
                  <FileText size={13} /> Descargar PDF (F4801)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOrder(null)}
                  className="text-white/80 hover:text-white p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-800">
              <WorkOrderDocument data={previewOrder} companyLogo={companyLogo} />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: VERIFICADOR CRIPTOGRÁFICO DE CADENA DE BLOQUES (SHA-256)      */}
      {/* ==================================================================== */}
      {isChainVerifierOpen && chainVerificationReport && (
        <div className="fixed inset-0 z-[280] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border-2 border-[#002D62] shadow-2xl max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-4 text-white flex flex-wrap items-center justify-between gap-4 shrink-0 border-b-4 ${
              chainVerificationReport.isChainIntact
                ? 'bg-gradient-to-r from-slate-950 via-[#002D62] to-slate-950 border-emerald-400'
                : 'bg-gradient-to-r from-rose-950 via-rose-900 to-slate-950 border-rose-400'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  chainVerificationReport.isChainIntact
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-rose-500/30 border-rose-300 text-rose-200 animate-bounce'
                }`}>
                  <Lock size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                      WEB CRYPTO API • NIST FIPS 180-4 (SHA-256)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 font-bold">
                      window.crypto.subtle.digest(&apos;SHA-256&apos;) • Ejecución #{verificationRunCounter} ({new Date(chainVerificationReport.verifiedAtIso).toLocaleTimeString('es-CL')})
                    </span>
                  </div>
                  <h2 className="text-base md:text-lg font-black uppercase tracking-wide mt-0.5">
                    Verificador en Vivo de Integridad de la Cadena de Bloques de Aprobaciones (Tabla F4209)
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRunLiveChainVerification()}
                  disabled={isVerifyingChain}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <RotateCcw size={14} className={isVerifyingChain ? 'animate-spin' : ''} />
                  <span>Recalcular Hashes SHA-256 Ahora</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChainVerifierOpen(false);
                    setHighlightedBlockId(null);
                  }}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 bg-slate-100 flex-1">
              {/* Top Cryptographic Status Banner & Demo Tribunal Controls */}
              <div className={`p-5 rounded-xl border-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                chainVerificationReport.isChainIntact
                  ? 'bg-emerald-950 text-white border-emerald-400'
                  : 'bg-rose-950 text-white border-rose-400'
              }`}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {chainVerificationReport.isChainIntact ? (
                      <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle size={20} className="text-rose-400 shrink-0" />
                    )}
                    <span className="text-sm md:text-base font-black uppercase tracking-wide">
                      {chainVerificationReport.isChainIntact
                        ? `CADENA DE BLOQUES 100% ÍNTEGRA Y VERIFICADA (${chainVerificationReport.validBlocksCount} DE ${chainVerificationReport.totalBlocks} BLOQUES VÁLIDOS)`
                        : `ALERTA CRIPTOGRÁFICA FORENSE: SE DETECTÓ CORRUPCIÓN EN ${chainVerificationReport.corruptedBlocksCount} DE ${chainVerificationReport.totalBlocks} BLOQUES`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed max-w-3xl">
                    {chainVerificationReport.isChainIntact
                      ? 'Cada aprobación jerárquica conserva intacto su Payload canónico y su enlace criptográfico (Previous Block Hash) hasta el Bloque Génesis #0. Ningún monto, fecha ni aprobador ha sido modificado tras la firma.'
                      : 'El motor Web Crypto API detectó que un registro histórico fue modificado directamente en el almacenamiento sin autorización. Por efecto avalancha de SHA-256, el hash del bloque adulterado cambió y rompió en cascada los eslabones de todos los bloques posteriores.'}
                  </p>
                </div>

                {/* Sello de Gobernanza Append-Only e Inmutabilidad */}
                <div className="flex flex-col items-end gap-2 shrink-0 bg-black/30 p-3.5 rounded-xl border border-white/15">
                  <div className="text-[10px] font-mono uppercase text-amber-300 font-bold flex items-center gap-1.5">
                    <ShieldCheck size={13} />
                    <span>Gobernanza Append-Only (Solo Lectura • No-Repudio)</span>
                  </div>
                  <p className="text-[10px] text-slate-300 max-w-xs text-right leading-snug">
                    Por principio de inmutabilidad criptográfica, el verificador opera en modo estricto de auditoría pasiva sin funciones de re-sellado ni reescritura histórica.
                  </p>
                  <button
                    type="button"
                    onClick={() => exportToExcel(heldOrdersLog, 'Bitacora_Aprobaciones_F4209_JDE')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Exportar Evidencia F4209 (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Cryptographic Summary Cards (Genesis, Merkle Root, Head Block) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs">
                  <div className="text-[10px] font-black uppercase text-slate-500">Bloque Génesis (#0 Anchor)</div>
                  <div className="font-mono text-[10.5px] font-bold text-slate-800 break-all mt-1 bg-slate-50 p-2 rounded border border-slate-200">
                    {chainVerificationReport.genesisHash}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Semilla inmutable de origen de la tabla F4209</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-indigo-300 shadow-2xs">
                  <div className="text-[10px] font-black uppercase text-indigo-800">Raíz de Merkle Calculada (Merkle Root SHA-256)</div>
                  <div className="font-mono text-[10.5px] font-bold text-indigo-950 break-all mt-1 bg-indigo-50/60 p-2 rounded border border-indigo-200">
                    {chainVerificationReport.merkleRootHash}
                  </div>
                  <div className="text-[10px] text-indigo-700 mt-1">Resumen binario único de todos los bloques F4209</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-emerald-300 shadow-2xs">
                  <div className="text-[10px] font-black uppercase text-emerald-800">Último Bloque Sellado (Head Block #{chainVerificationReport.totalBlocks})</div>
                  <div className="font-mono text-[10.5px] font-bold text-emerald-950 break-all mt-1 bg-emerald-50/60 p-2 rounded border border-emerald-200">
                    {chainVerificationReport.latestBlockHash}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-1">
                    Tiempo de cómputo Web Crypto API: {chainVerificationReport.executionTimeMs} ms • Verificado: {new Date(chainVerificationReport.verifiedAtIso).toLocaleTimeString('es-CL')}
                  </div>
                </div>
              </div>

              {/* Block-by-Block Chain Inspection */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Layers size={16} className="text-[#002D62]" />
                  <span>Inspección Secuencial de Eslabones Criptográficos (Desde Bloque #1 hasta Bloque #{chainVerificationReport.totalBlocks})</span>
                </h3>

                {chainVerificationReport.blocks.map((b) => {
                  const isFocused = highlightedBlockId === b.record.id;
                  return (
                    <div
                      key={b.record.id}
                      className={`rounded-xl border-2 overflow-hidden bg-white shadow-xs transition-all ${
                        isFocused
                          ? 'border-amber-500 ring-4 ring-amber-400/40'
                          : b.isBlockValid
                          ? 'border-emerald-500/70'
                          : 'border-rose-600 ring-2 ring-rose-500/20'
                      }`}
                    >
                      <div className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold ${
                        b.isBlockValid ? 'bg-emerald-900 text-white' : 'bg-rose-800 text-white'
                      }`}>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded bg-black/30 font-mono text-amber-300 font-black">
                            BLOQUE #{b.blockIndex}
                          </span>
                          <span className="font-mono font-black">{b.record.orderFolio}</span>
                          <span>•</span>
                          <span>{b.record.businessUnit}</span>
                          <span>•</span>
                          <span className="font-mono text-emerald-200">{formatCLP(b.record.orderAmount)}</span>
                          <span>•</span>
                          <span>Firmado por: {b.record.releasedBy} ({b.record.releaseDate} {b.record.releaseTime})</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase ${
                          b.isBlockValid ? 'bg-emerald-400 text-slate-950' : 'bg-amber-300 text-rose-950'
                        }`}>
                          {b.isBlockValid ? '✓ ESLABÓN SHA-256 VERIFICADO' : '✗ CORRUPCIÓN CRIPTOGRÁFICA DETECTADA'}
                        </span>
                      </div>

                      <div className="p-4 space-y-3 text-[11px]">
                        {!b.isBlockValid && (
                          <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-rose-900 space-y-1">
                            <div className="font-black uppercase text-[10px] text-rose-800">Diagnóstico Forense de Ruptura:</div>
                            {b.failureReasons.map((reason, rIdx) => (
                              <div key={rIdx} className="flex items-center gap-1.5 font-semibold">
                                <XCircle size={13} className="text-rose-600 shrink-0" />
                                <span>{reason}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div>
                          <div className="text-[10px] font-black uppercase text-slate-500 mb-1">
                            1. Payload Transaccional Canónico (Pre-imagen serializada de los campos F4209):
                          </div>
                          <div className="font-mono text-[10px] bg-slate-900 text-emerald-300 p-2.5 rounded-lg break-all">
                            {b.canonicalPayload}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 font-mono text-[10px]">
                          <div className={`p-2.5 rounded-lg border ${
                            b.isPreviousLinkIntact ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-300'
                          }`}>
                            <div className="font-sans font-black uppercase text-[9.5px] text-slate-600 mb-1 flex items-center justify-between">
                              <span>2. Hash Bloque Anterior (Prev Hash)</span>
                              <span className={b.isPreviousLinkIntact ? 'text-emerald-700' : 'text-rose-700'}>
                                {b.isPreviousLinkIntact ? 'ENLACE OK' : 'ROTO'}
                              </span>
                            </div>
                            <div className="text-slate-500">Almacenado:</div>
                            <div className="font-bold text-slate-900 break-all">{b.storedPreviousHash}</div>
                            {!b.isPreviousLinkIntact && (
                              <>
                                <div className="text-rose-700 mt-1">Esperado (Bloque #{b.blockIndex - 1}):</div>
                                <div className="font-bold text-rose-900 break-all">{b.expectedPreviousHash}</div>
                              </>
                            )}
                          </div>

                          <div className={`p-2.5 rounded-lg border ${
                            b.isPayloadIntact ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-300'
                          }`}>
                            <div className="font-sans font-black uppercase text-[9.5px] text-slate-600 mb-1 flex items-center justify-between">
                              <span>3. Hash del Payload (SHA-256 Datos)</span>
                              <span className={b.isPayloadIntact ? 'text-emerald-700' : 'text-rose-700'}>
                                {b.isPayloadIntact ? 'DATOS ÍNTEGROS' : 'DATOS ALTERADOS'}
                              </span>
                            </div>
                            <div className="text-slate-500">Sello Original:</div>
                            <div className="font-bold text-slate-900 break-all">{b.storedPayloadHash}</div>
                            <div className="text-slate-500 mt-1">Recalculado (crypto.subtle):</div>
                            <div className={`font-bold break-all ${b.isPayloadIntact ? 'text-emerald-800' : 'text-rose-700'}`}>
                              {b.computedPayloadHash}
                            </div>
                          </div>

                          <div className={`p-2.5 rounded-lg border ${
                            b.isBlockSignatureIntact ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50 border-rose-300'
                          }`}>
                            <div className="font-sans font-black uppercase text-[9.5px] text-slate-600 mb-1 flex items-center justify-between">
                              <span>4. Firma del Bloque Encadenado</span>
                              <span className={b.isBlockSignatureIntact ? 'text-emerald-700' : 'text-rose-700'}>
                                {b.isBlockSignatureIntact ? 'FIRMA VÁLIDA' : 'INVÁLIDA'}
                              </span>
                            </div>
                            <div className="text-slate-500">Sello Almacenado:</div>
                            <div className="font-bold text-slate-900 break-all">{b.storedBlockHash}</div>
                            <div className="text-slate-500 mt-1">Recalculado SHA256(Idx|Prev|Payload):</div>
                            <div className={`font-bold break-all ${b.isBlockSignatureIntact ? 'text-emerald-900' : 'text-rose-700'}`}>
                              {b.computedBlockHash}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JDEOrderApprovalModule;

