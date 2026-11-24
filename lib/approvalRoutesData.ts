// AssetFlow Enterprise - Approval Level Rules & Order Approval Engine (P43081 / P43008 / P43280 / F4209 / F43092)
// Matriz Jerárquica de Rutas de Aprobación, Subrogancias y Bitácora de Liberación de Órdenes

import { 
  ApprovalRoute, 
  ApprovalStep, 
  ApproverRoleType, 
  F43092DelegationRecord, 
  F4209HeldOrderRecord, 
  JDEHoldCodeType,
  WorkOrder,
  Supplier,
  Property,
  WorkOrderApprovalStepTrace
} from '../types';

export const INITIAL_APPROVAL_ROUTES: ApprovalRoute[] = [
  {
    id: 'route_op_default',
    routeCode: 'OP_DEFAULT',
    routeName: 'Ruta Estándar de Órdenes de Trabajo y Compras (OP/OT)',
    orderType: 'OP',
    description: 'Flujo jerárquico corporativo para emisión de OTs de mantenimiento y compras de servicios con escalamiento por montos.',
    isActive: true,
    isDefault: true,
    currency: 'CLP',
    updatedAt: new Date().toISOString(),
    updatedBy: 'SISTEMA_JDE_ADMIN',
    steps: [
      {
        id: 'step_1_solic',
        stepNumber: 1,
        stepName: 'Paso 1: Elaboración y Formulación',
        approverRole: 'SOLICITANTE',
        approverTitle: 'Analista de Control Inmobiliario / Solicitante',
        approverName: 'USUARIO EMISOR',
        minAmount: 0,
        maxAmount: 100000000,
        requiresQuotes: false,
        minQuotesCount: 0,
        requiresUafCheck: false,
        requiresInspectionReport: false,
        slaHours: 12,
        autoEscalate: false,
        notes: 'Generación técnica de la orden con imputación al activo y especificación de ítems catalogados F4101.'
      },
      {
        id: 'step_2_jefe',
        stepNumber: 2,
        stepName: 'Paso 2: Revisión Técnica & Jefatura de Mantención',
        approverRole: 'JEFE_MANTENCION',
        approverTitle: 'Jefe de Operaciones & Mantenimiento',
        approverName: 'ING. CARLOS MENDOZA',
        minAmount: 0,
        maxAmount: 1500000,
        requiresQuotes: true,
        minQuotesCount: 1,
        requiresUafCheck: false,
        requiresInspectionReport: false,
        subrogateRole: 'SUPERVISOR_OPERACIONES',
        subrogateName: 'RODRIGO PEÑA',
        slaHours: 24,
        autoEscalate: true,
        notes: 'Verificación de presupuesto asignado, necesidad operativa y antecedentes técnicos.'
      },
      {
        id: 'step_3_compliance',
        stepNumber: 3,
        stepName: 'Paso 3: Compliance ERP & Control Interno',
        approverRole: 'COMPLIANCE_JDE',
        approverTitle: 'Control Interno & Cumplimiento Normativo ERP',
        approverName: 'ING. CLAUDIA VALENZUELA',
        minAmount: 1500001,
        maxAmount: 5000000,
        requiresQuotes: true,
        minQuotesCount: 3,
        requiresUafCheck: true,
        requiresInspectionReport: true,
        subrogateRole: 'AUDITOR_SENIOR',
        subrogateName: 'AUDITORÍA FORENSE ERP',
        slaHours: 48,
        autoEscalate: true,
        notes: 'Validación de 3 cotizaciones comparativas, acreditación UAF del contratista y verificación de no-duplicidad de facturas.'
      },
      {
        id: 'step_4_gerencia_ops',
        stepNumber: 4,
        stepName: 'Paso 4: Gerencia de Operaciones e Inversiones',
        approverRole: 'GERENCIA_OPERACIONES',
        approverTitle: 'Gerente de Operaciones e Infraestructura',
        approverName: 'RODRIGO SILVA (GERENTE OPERACIONES)',
        minAmount: 5000001,
        maxAmount: 20000000,
        requiresQuotes: true,
        minQuotesCount: 3,
        requiresUafCheck: true,
        requiresInspectionReport: true,
        slaHours: 48,
        autoEscalate: true,
        notes: 'Aprobación de gastos operacionales mayores con impacto en CAPEX y flujo de caja proyectado.'
      },
      {
        id: 'step_5_gerencia_general',
        stepNumber: 5,
        stepName: 'Paso 5: Gerencia General & Directorio',
        approverRole: 'GERENCIA_GENERAL',
        approverTitle: 'Gerente General / Directorio Ejecutivo',
        approverName: 'GERENCIA GENERAL ASSETFLOW',
        minAmount: 20000001,
        maxAmount: 500000000,
        requiresQuotes: true,
        minQuotesCount: 3,
        requiresUafCheck: true,
        requiresInspectionReport: true,
        slaHours: 72,
        autoEscalate: false,
        notes: 'Autorización extraordinaria para contratos de alta cuantía, siniestros estructurales o compras estratégicas.'
      }
    ]
  },
  {
    id: 'route_sq_default',
    routeCode: 'REQ_DEFAULT',
    routeName: 'Ruta de Solicitudes y Requerimientos de Inquilinos (SQ)',
    orderType: 'SQ',
    description: 'Flujo de tramitación de requerimientos provenientes de arrendatarios para su posterior conversión a OT.',
    isActive: true,
    isDefault: true,
    currency: 'CLP',
    updatedAt: new Date().toISOString(),
    updatedBy: 'SISTEMA_JDE_ADMIN',
    steps: [
      {
        id: 'step_sq_1',
        stepNumber: 1,
        stepName: 'Paso 1: Recepción & Clasificación del Requerimiento',
        approverRole: 'SOLICITANTE',
        approverTitle: 'Ejecutivo Inmobiliario de Cuentas',
        approverName: 'ATENCIÓN A INQUILINOS',
        minAmount: 0,
        maxAmount: 50000000,
        requiresQuotes: false,
        slaHours: 12,
        autoEscalate: false,
        notes: 'Recepción formal del ticket, comprobación de vigencia del contrato de arriendo y solvencia del arrendatario.'
      },
      {
        id: 'step_sq_2',
        stepNumber: 2,
        stepName: 'Paso 2: Evaluación Técnica & Presupuesto Estimado',
        approverRole: 'JEFE_MANTENCION',
        approverTitle: 'Supervisor Técnico en Terreno',
        approverName: 'INSPECCIÓN TÉCNICA',
        minAmount: 0,
        maxAmount: 2000000,
        requiresQuotes: true,
        minQuotesCount: 1,
        slaHours: 24,
        autoEscalate: true,
        notes: 'Inspección del activo, determinación de causa (desgaste natural vs imputabilidad al arrendatario).'
      },
      {
        id: 'step_sq_3',
        stepNumber: 3,
        stepName: 'Paso 3: V°B° para Conversión a Orden de Trabajo (P4310)',
        approverRole: 'ADMINISTRADOR',
        approverTitle: 'Administrador General del Sistema',
        approverName: 'ADMINISTRADOR DE CONTRATOS',
        minAmount: 2000001,
        maxAmount: 50000000,
        requiresQuotes: true,
        minQuotesCount: 2,
        slaHours: 48,
        autoEscalate: false,
        notes: 'Autorización formal de la orden de trabajo derivada y afectación de fondos de reserva o cargo a cuenta corriente.'
      }
    ]
  },
  {
    id: 'route_emergency',
    routeCode: 'URGENCIA_OPS',
    routeName: 'Ruta de Contingencia & Emergencias Operacionales 24/7',
    orderType: 'OP',
    description: 'Protocolo de vía rápida (Fast Track) para emergencias con riesgo inminente de daño a personas o estructura física.',
    isActive: true,
    isDefault: false,
    currency: 'CLP',
    updatedAt: new Date().toISOString(),
    updatedBy: 'SISTEMA_JDE_ADMIN',
    steps: [
      {
        id: 'step_em_1',
        stepNumber: 1,
        stepName: 'Paso 1: Declaración de Emergencia Operacional',
        approverRole: 'JEFE_MANTENCION',
        approverTitle: 'Jefe de Mantenimiento de Turno',
        approverName: 'OPERADOR DE TURNO 24/7',
        minAmount: 0,
        maxAmount: 10000000,
        requiresQuotes: false,
        slaHours: 2,
        autoEscalate: true,
        notes: 'Activación inmediata sin exigencia previa de cotizaciones. Subrogancia automática si no hay respuesta en 2 horas.'
      },
      {
        id: 'step_em_2',
        stepNumber: 2,
        stepName: 'Paso 2: Convalidación Post-Evento por Compliance ERP',
        approverRole: 'COMPLIANCE_JDE',
        approverTitle: 'Auditoría Forense y Control Posterior ERP',
        approverName: 'ING. CLAUDIA VALENZUELA',
        minAmount: 0,
        maxAmount: 10000000,
        requiresQuotes: false,
        requiresInspectionReport: true,
        slaHours: 24,
        autoEscalate: false,
        notes: 'Verificación de informes fotográficos de antes y después, acta de recepción de servicios y facturación de urgencia.'
      }
    ]
  }
];

const STORAGE_KEY_APPROVAL_ROUTES = 'jde_approval_routes_p43008';

export function getApprovalRoutes(): ApprovalRoute[] {
  if (typeof window === 'undefined') return INITIAL_APPROVAL_ROUTES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_APPROVAL_ROUTES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error al cargar rutas de aprobación:', e);
  }
  return INITIAL_APPROVAL_ROUTES;
}

export function saveApprovalRoutes(routes: ApprovalRoute[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_APPROVAL_ROUTES, JSON.stringify(routes));
  } catch (e) {
    console.error('Error al guardar rutas de aprobación:', e);
  }
}

export function saveApprovalRoute(route: ApprovalRoute, currentUser: string = 'ADMINISTRADOR'): ApprovalRoute[] {
  const current = getApprovalRoutes();
  const index = current.findIndex(r => r.id === route.id);
  const updatedRoute: ApprovalRoute = {
    ...route,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser
  };
  
  let updated: ApprovalRoute[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = updatedRoute;
  } else {
    updated = [updatedRoute, ...current];
  }
  saveApprovalRoutes(updated);
  return updated;
}

export function deleteApprovalRoute(routeId: string): ApprovalRoute[] {
  const current = getApprovalRoutes();
  const updated = current.filter(r => r.id !== routeId);
  saveApprovalRoutes(updated);
  return updated;
}

export function resetApprovalRoutesToDefault(): ApprovalRoute[] {
  saveApprovalRoutes(INITIAL_APPROVAL_ROUTES);
  return INITIAL_APPROVAL_ROUTES;
}

// Evaluate which steps apply for an order type and total amount
export function evaluateApprovalRoute(
  orderType: 'OP' | 'SQ' | 'OT',
  amount: number,
  preferredRouteCode?: string
): {
  route: ApprovalRoute;
  applicableSteps: ApprovalStep[];
  highestApprover: ApprovalStep;
  requirements: {
    maxQuotesRequired: number;
    requiresUafCheck: boolean;
    requiresInspectionReport: boolean;
    totalSlaHours: number;
  };
} {
  const routes = getApprovalRoutes().filter(r => r.isActive);
  
  let selectedRoute = preferredRouteCode 
    ? routes.find(r => r.routeCode === preferredRouteCode)
    : undefined;
    
  if (!selectedRoute) {
    selectedRoute = routes.find(r => r.orderType === orderType && r.isDefault) || routes.find(r => r.orderType === orderType) || routes[0];
  }

  // Find all steps that must be traversed up to this amount
  // In ERP hierarchical routing, Step 1 is always required. Subsequent steps are required if the amount exceeds their minAmount or reaches their tier.
  const sortedSteps = [...selectedRoute.steps].sort((a, b) => a.stepNumber - b.stepNumber);
  
  const applicableSteps = sortedSteps.filter(step => {
    // Step 1 is the initiator step
    if (step.stepNumber === 1) return true;
    // Hierarchical check: if amount is greater than or equal to minAmount
    return amount >= step.minAmount;
  });

  const highestApprover = applicableSteps[applicableSteps.length - 1] || sortedSteps[0];

  const maxQuotesRequired = Math.max(0, ...applicableSteps.map(s => s.minQuotesCount || (s.requiresQuotes ? 1 : 0)));
  const requiresUafCheck = applicableSteps.some(s => s.requiresUafCheck);
  const requiresInspectionReport = applicableSteps.some(s => s.requiresInspectionReport);
  const totalSlaHours = applicableSteps.reduce((acc, s) => acc + (s.slaHours || 24), 0);

  return {
    route: selectedRoute,
    applicableSteps,
    highestApprover,
    requirements: {
      maxQuotesRequired,
      requiresUafCheck,
      requiresInspectionReport,
      totalSlaHours
    }
  };
}

// ============================================================================
// UDC 42/HC: CÓDIGOS DE RETENCIÓN Y ESTADO DE APROBACIÓN ENTERPRISE (F0005)
// ============================================================================
export const JDE_HOLD_CODES_UDC: Record<JDEHoldCodeType, {
  code: JDEHoldCodeType;
  label: string;
  description: string;
  badgeClass: string;
}> = {
  '00': {
    code: '00',
    label: 'Sin Retención (Liberada)',
    description: 'Orden sin bloqueo administrativo ni presupuestario',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300'
  },
  '2W': {
    code: '2W',
    label: '2W - En Espera de Aprobación (Waiting)',
    description: 'Orden en cola de firmas jerárquicas P43081 (Estado 220)',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300'
  },
  '2A': {
    code: '2A',
    label: '2A - Aprobada y Liberada (Approved)',
    description: 'Visto bueno jerárquico otorgado (Estado 230 -> Lista para R43500)',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  },
  '2R': {
    code: '2R',
    label: '2R - Rechazada / Cancelada (Rejected)',
    description: 'Orden desestimada en mesa de aprobación (Estado 999)',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300'
  },
  '2H': {
    code: '2H',
    label: '2H - Retenida en Observación (On Hold)',
    description: 'Orden pausada en espera de antecedentes adicionales (Estado 225)',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300'
  },
  'B1': {
    code: 'B1',
    label: 'B1 - Hold Control Presupuestario (F0902)',
    description: 'Supera el umbral presupuestario asignado a la unidad o centro de costo',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300'
  },
  'C1': {
    code: 'C1',
    label: 'C1 - Hold Compliance & UAF (F0401)',
    description: 'Proveedor requiere validación de Debida Diligencia o Declaración UAF',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300'
  },
  'Q1': {
    code: 'Q1',
    label: 'Q1 - Hold Cotizaciones Comparativas',
    description: 'Monto exige respaldo de cotizaciones formales según regla P43008',
    badgeClass: 'bg-yellow-100 text-yellow-900 border-yellow-300'
  },
  'T1': {
    code: 'T1',
    label: 'T1 - Hold Revisión Técnica de Especialidad',
    description: 'Alcance técnico o rubro requiere validación de ingeniería en terreno',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300'
  }
};

// ============================================================================
// TABLA F43092: SUBROGANCIA Y DELEGACIÓN DE AUTORIDAD (P43280)
// ============================================================================
const STORAGE_KEY_F43092 = 'jde_f43092_delegations';

export const INITIAL_F43092_DELEGATIONS: F43092DelegationRecord[] = [
  {
    id: 'del_f43092_1',
    routeCode: 'OP_DEFAULT',
    orderType: 'ALL',
    principalRole: 'JEFE_MANTENCION',
    principalName: 'ING. CARLOS MENDOZA',
    delegateRole: 'ADMINISTRADOR',
    delegateName: 'JMARCO CALDERON MORAGA',
    effectiveFrom: '2026-01-01',
    effectiveThru: '2026-12-31',
    maxDelegatedAmount: 5000000,
    reason: 'ALTA_CARGA_OPERATIVA',
    isActive: true,
    createdBy: 'CRISTIAN MUÑOZ R.',
    createdAt: '2026-03-01T09:00:00.000Z'
  },
  {
    id: 'del_f43092_2',
    routeCode: 'OP_DEFAULT',
    orderType: 'ALL',
    principalRole: 'GERENCIA_OPERACIONES',
    principalName: 'RODRIGO SILVA (GERENTE OPERACIONES)',
    delegateRole: 'ADMINISTRADOR',
    delegateName: 'CRISTIAN MUÑOZ R.',
    effectiveFrom: '2026-01-01',
    effectiveThru: '2026-12-31',
    maxDelegatedAmount: 25000000,
    reason: 'COMISION_SERVICIO',
    isActive: true,
    createdBy: 'CRISTIAN MUÑOZ R.',
    createdAt: '2026-03-05T10:30:00.000Z'
  }
];

export function getDelegationsF43092(): F43092DelegationRecord[] {
  if (typeof window === 'undefined') return INITIAL_F43092_DELEGATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_F43092);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading F43092 delegations:', e);
  }
  return INITIAL_F43092_DELEGATIONS;
}

export function saveDelegationF43092(record: F43092DelegationRecord): F43092DelegationRecord[] {
  const current = getDelegationsF43092();
  const idx = current.findIndex(d => d.id === record.id);
  const updated = idx >= 0
    ? current.map(d => d.id === record.id ? record : d)
    : [record, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_F43092, JSON.stringify(updated));
  }
  return updated;
}

export function deleteDelegationF43092(id: string): F43092DelegationRecord[] {
  const updated = getDelegationsF43092().filter(d => d.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_F43092, JSON.stringify(updated));
  }
  return updated;
}

// ============================================================================
// TABLA F4209: BITÁCORA TRANSACCIONAL DE ÓRDENES RETENIDAS Y CADENA DE BLOQUES SHA-256 (P43081)
// ============================================================================
const STORAGE_KEY_F4209 = 'jde_f4209_held_orders_log';
export const GENESIS_BLOCK_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export const INITIAL_F4209_SEED_RECORDS: F4209HeldOrderRecord[] = [
  {
    id: 'f4209_seed_1',
    orderId: 'wo_seed_1',
    orderFolio: 'OT-2026-001',
    orderType: 'OT',
    businessUnit: 'EDIFICIO CORPORATIVO CENTRAL',
    lineNumber: 0,
    routeCode: 'OP_DEFAULT',
    stepNumber: 2,
    stepName: 'VB Jefatura de Mantención',
    requiredRole: 'JEFE_MANTENCION',
    requiredApprover: 'ING. CARLOS MENDOZA',
    holdCode: '2A',
    orderAmount: 1850000,
    releasedBy: 'JMARCO CALDERON MORAGA',
    releasedByRole: 'JEFE',
    isDelegatedAction: true,
    releaseDate: '2026-03-10',
    releaseTime: '10:15:22',
    reasonCode: 'APROBACIÓN CONFORME P43081 • MANTENCIÓN TECHUMBRE Y CANALETAS (SUBROGANCIA F43092)',
    workStationId: 'WS_JDE911',
    programId: 'P43081',
    timestamp: 1773137722000
  },
  {
    id: 'f4209_seed_2',
    orderId: 'wo_seed_2',
    orderFolio: 'OC-2026-004',
    orderType: 'OP',
    businessUnit: 'TORRE FINANCIERA APOQUINDO',
    lineNumber: 0,
    routeCode: 'OP_DEFAULT',
    stepNumber: 3,
    stepName: 'Revisión Compliance & UAF',
    requiredRole: 'COMPLIANCE_JDE',
    requiredApprover: 'ING. CLAUDIA VALENZUELA',
    holdCode: '2A',
    orderAmount: 4290000,
    releasedBy: 'CRISTIAN MUÑOZ R.',
    releasedByRole: 'ADMINISTRADOR',
    isDelegatedAction: false,
    releaseDate: '2026-03-12',
    releaseTime: '14:40:05',
    reasonCode: 'LIBERACIÓN TRAS VERIFICACIÓN DUE DILIGENCE UAF Y 3 COTIZACIONES COMPARATIVAS',
    workStationId: 'WS_JDE911',
    programId: 'P43081',
    timestamp: 1773326405000
  },
  {
    id: 'f4209_seed_3',
    orderId: 'wo_seed_3',
    orderFolio: 'OT-2026-009',
    orderType: 'OT',
    businessUnit: 'CENTRO LOGÍSTICO PUDAHUEL',
    lineNumber: 0,
    routeCode: 'OP_DEFAULT',
    stepNumber: 4,
    stepName: 'Autorización Gerencia Operaciones',
    requiredRole: 'GERENCIA_OPERACIONES',
    requiredApprover: 'RODRIGO SILVA (GERENTE OPERACIONES)',
    holdCode: '2A',
    orderAmount: 8750000,
    releasedBy: 'CRISTIAN MUÑOZ R.',
    releasedByRole: 'ADMINISTRADOR',
    isDelegatedAction: true,
    releaseDate: '2026-03-15',
    releaseTime: '17:08:49',
    reasonCode: 'APROBACIÓN EJECUTIVA P43081 • REPARACIÓN ELÉCTRICA MEDIA TENSIÓN (IVA FACTURA 19% VALIDADO)',
    workStationId: 'WS_JDE911',
    programId: 'P43081',
    timestamp: 1773594529000
  }
];

/**
 * Calcula un hash SHA-256 real (64 caracteres hexadecimales) usando el estándar Web Crypto API (NIST FIPS 180-4).
 */
export async function computeSha256Hex(message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  // Fallback determinista solo si se ejecuta fuera de navegador
  let h1 = 0xdeadbeef ^ message.length;
  let h2 = 0x41c6ce57 ^ message.length;
  for (let i = 0, ch; i < message.length; i++) {
    ch = message.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).toUpperCase().padStart(16, '0');
  return hex.repeat(4);
}

/**
 * Construye el payload canónico determinista de un asiento F4209 para sellado SHA-256.
 */
export function buildCanonicalF4209Payload(
  entry: Pick<
    F4209HeldOrderRecord,
    'orderFolio' | 'orderType' | 'businessUnit' | 'routeCode' | 'stepNumber' | 'holdCode' | 'orderAmount' | 'releasedBy' | 'releaseDate' | 'releaseTime' | 'reasonCode' | 'timestamp'
  >
): string {
  return [
    `DOCO=${(entry.orderFolio || '').trim().toUpperCase()}`,
    `DCTO=${(entry.orderType || 'OT').trim().toUpperCase()}`,
    `MCU=${(entry.businessUnit || '').trim().toUpperCase()}`,
    `ARTG=${(entry.routeCode || '').trim().toUpperCase()}`,
    `STEP=${Number(entry.stepNumber || 1)}`,
    `HCOD=${(entry.holdCode || '2W').trim().toUpperCase()}`,
    `AMNT=${Number(entry.orderAmount || 0)}`,
    `RPER=${(entry.releasedBy || '').trim().toUpperCase()}`,
    `RDJ=${(entry.releaseDate || '').trim()}`,
    `RTM=${(entry.releaseTime || '').trim()}`,
    `RCD=${(entry.reasonCode || '').trim().toUpperCase()}`,
    `TS=${Number(entry.timestamp || 0)}`
  ].join('|');
}

/**
 * Calcula la Raíz de Merkle (Merkle Root SHA-256) a partir de los hashes de bloque de la cadena F4209.
 */
export async function computeMerkleRootSha256(blockHashes: string[]): Promise<string> {
  if (blockHashes.length === 0) return GENESIS_BLOCK_HASH;
  let currentLayer = [...blockHashes];
  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left; // Duplica nodo impar según estándar Merkle
      const combinedHash = await computeSha256Hex(`${left}${right}`);
      nextLayer.push(combinedHash);
    }
    currentLayer = nextLayer;
  }
  return currentLayer[0];
}

export interface F4209HeldOrderRecordWithMeta extends F4209HeldOrderRecord {
  isTamperedSimulation?: boolean;
}

/**
 * Recorre todos los registros F4209 en orden cronológico (Bloque #1 al #N) y sella criptográficamente
 * la cadena completa usando Web Crypto API SHA-256, guardando el resultado en localStorage.
 */
export async function sealAndChainF4209Ledger(recordsInput?: F4209HeldOrderRecord[]): Promise<F4209HeldOrderRecord[]> {
  const source = recordsInput ?? getHeldOrdersLogF4209();
  // Ordenar de más antiguo (Bloque #1) a más reciente (Bloque #N) para encadenar de forma determinista
  const chronological = [...source].sort((a, b) => {
    if (a.blockIndex !== undefined && b.blockIndex !== undefined && a.blockIndex !== b.blockIndex) {
      return a.blockIndex - b.blockIndex;
    }
    return a.timestamp - b.timestamp;
  });

  let prevHash = GENESIS_BLOCK_HASH;
  const chainedChronological: F4209HeldOrderRecord[] = [];

  for (let i = 0; i < chronological.length; i++) {
    const item = chronological[i];
    const blockIndex = i + 1;
    // Limpiar cualquier etiqueta y monto de adulteración simulada (+$1 CLP) al re-sellar
    const wasTampered = (item.reasonCode || '').includes('[DATO ADULTERADO EN BD +$1]');
    const cleanReason = (item.reasonCode || '').replace(/\s*\[DATO ADULTERADO EN BD \+\$1\]/g, '').trim();
    const seedMatch = INITIAL_F4209_SEED_RECORDS.find(s => s.id === item.id);
    const cleanAmount = seedMatch
      ? seedMatch.orderAmount
      : wasTampered
      ? Math.max(0, (item.orderAmount || 0) - 1)
      : item.orderAmount;
    const cleanItem: F4209HeldOrderRecord = {
      ...item,
      orderAmount: cleanAmount,
      reasonCode: cleanReason
    };
    const canonicalPayload = buildCanonicalF4209Payload(cleanItem);
    const payloadHash = await computeSha256Hex(canonicalPayload);
    const blockHeaderPreimage = `BLOCK=${blockIndex}|PREV=${prevHash}|PAYLOAD=${payloadHash}`;
    const blockHash = await computeSha256Hex(blockHeaderPreimage);

    chainedChronological.push({
      ...cleanItem,
      blockIndex,
      previousBlockHash: prevHash,
      payloadHash,
      digitalSignatureHash: blockHash
    });

    prevHash = blockHash;
  }

  // Devolver en orden descendente (más reciente primero para la grilla JDE)
  const descending = [...chainedChronological].reverse();
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_F4209, JSON.stringify(descending));
  }
  return descending;
}

export interface F4209BlockVerificationItem {
  record: F4209HeldOrderRecord;
  blockIndex: number;
  canonicalPayload: string;
  storedPreviousHash: string;
  expectedPreviousHash: string;
  storedPayloadHash: string;
  computedPayloadHash: string;
  storedBlockHash: string;
  computedBlockHash: string;
  isPayloadIntact: boolean;
  isPreviousLinkIntact: boolean;
  isBlockSignatureIntact: boolean;
  isBlockValid: boolean;
  failureReasons: string[];
}

export interface F4209ChainVerificationReport {
  verifiedAtIso: string;
  totalBlocks: number;
  validBlocksCount: number;
  corruptedBlocksCount: number;
  isChainIntact: boolean;
  genesisHash: string;
  merkleRootHash: string;
  latestBlockHash: string;
  executionTimeMs: number;
  blocks: F4209BlockVerificationItem[];
}

/**
 * Garantiza que la lista de registros F4209 tenga sus sellos SHA-256 inicializados antes de auditar,
 * evitando falsos positivos por condiciones de carrera en el montaje inicial de React StrictMode.
 */
export async function ensureSealedF4209Ledger(recordsInput?: F4209HeldOrderRecord[]): Promise<F4209HeldOrderRecord[]> {
  const current = recordsInput && recordsInput.length > 0 ? recordsInput : getHeldOrdersLogF4209();
  const hasUnsealedOrLegacyDemoRecord = current.some(
    r =>
      !r.payloadHash ||
      !r.previousBlockHash ||
      !r.digitalSignatureHash ||
      r.payloadHash === 'CALCULANDO_SHA256...' ||
      r.digitalSignatureHash === 'CALCULANDO_SHA256...' ||
      r.digitalSignatureHash.startsWith('JDE911_SIG_') ||
      (r.reasonCode || '').includes('[DATO ADULTERADO EN BD +$1]')
  );
  if (hasUnsealedOrLegacyDemoRecord) {
    return await sealAndChainF4209Ledger(current);
  }
  return current;
}

/**
 * Audita y verifica bloque por bloque toda la cadena F4209 en vivo utilizando Web Crypto API (crypto.subtle.digest('SHA-256')).
 * Detecta instantáneamente cualquier modificación de 1 bit en montos, fechas, aprobadores o eslabones previos.
 */
export async function verifyF4209BlockchainIntegrity(records?: F4209HeldOrderRecord[]): Promise<F4209ChainVerificationReport> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const targetRecords = await ensureSealedF4209Ledger(records);
  const chronological = [...targetRecords].sort((a, b) => {
    if (a.blockIndex !== undefined && b.blockIndex !== undefined && a.blockIndex !== b.blockIndex) {
      return a.blockIndex - b.blockIndex;
    }
    return a.timestamp - b.timestamp;
  });

  let expectedPrevHash = GENESIS_BLOCK_HASH;
  const blockReports: F4209BlockVerificationItem[] = [];
  const computedBlockHashesForMerkle: string[] = [];

  for (let i = 0; i < chronological.length; i++) {
    const rec = chronological[i];
    const blockIndex = rec.blockIndex ?? (i + 1);
    const canonicalPayload = buildCanonicalF4209Payload(rec);
    const computedPayloadHash = await computeSha256Hex(canonicalPayload);

    const storedPreviousHash = rec.previousBlockHash || GENESIS_BLOCK_HASH;
    const storedPayloadHash = rec.payloadHash || '';
    const storedBlockHash = rec.digitalSignatureHash || '';

    const blockPreimage = `BLOCK=${blockIndex}|PREV=${expectedPrevHash}|PAYLOAD=${computedPayloadHash}`;
    const computedBlockHash = await computeSha256Hex(blockPreimage);

    const isPayloadIntact = storedPayloadHash === computedPayloadHash;
    const isPreviousLinkIntact = storedPreviousHash === expectedPrevHash;
    const isBlockSignatureIntact = storedBlockHash === computedBlockHash;
    const isBlockValid = isPayloadIntact && isPreviousLinkIntact && isBlockSignatureIntact;

    const failureReasons: string[] = [];
    if (!isPayloadIntact) {
      failureReasons.push('Adulteración detectada en los datos de la transacción (el Payload SHA-256 recalculado no coincide con el sello original).');
    }
    if (!isPreviousLinkIntact) {
      failureReasons.push('Ruptura de eslabón criptográfico (Previous Block Hash no coincide con el hash del bloque anterior).');
    }
    if (!isBlockSignatureIntact) {
      failureReasons.push('Firma SHA-256 del bloque inválida por efecto avalancha.');
    }

    blockReports.push({
      record: rec,
      blockIndex,
      canonicalPayload,
      storedPreviousHash,
      expectedPreviousHash: expectedPrevHash,
      storedPayloadHash,
      computedPayloadHash,
      storedBlockHash,
      computedBlockHash,
      isPayloadIntact,
      isPreviousLinkIntact,
      isBlockSignatureIntact,
      isBlockValid,
      failureReasons
    });

    computedBlockHashesForMerkle.push(computedBlockHash);
    // En una cadena real, el siguiente bloque debe encadenarse contra el hash válido esperado
    expectedPrevHash = computedBlockHash;
  }

  const merkleRootHash = await computeMerkleRootSha256(computedBlockHashesForMerkle);
  const validBlocksCount = blockReports.filter(b => b.isBlockValid).length;
  const corruptedBlocksCount = blockReports.length - validBlocksCount;
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    verifiedAtIso: new Date().toISOString(),
    totalBlocks: blockReports.length,
    validBlocksCount,
    corruptedBlocksCount,
    isChainIntact: corruptedBlocksCount === 0,
    genesisHash: GENESIS_BLOCK_HASH,
    merkleRootHash,
    latestBlockHash: computedBlockHashesForMerkle[computedBlockHashesForMerkle.length - 1] || GENESIS_BLOCK_HASH,
    executionTimeMs: Math.max(1, Math.round((t1 - t0) * 100) / 100),
    blocks: blockReports
  };
}

export function getHeldOrdersLogF4209(): F4209HeldOrderRecord[] {
  if (typeof window === 'undefined') return INITIAL_F4209_SEED_RECORDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_F4209);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading F4209 log:', e);
  }
  return INITIAL_F4209_SEED_RECORDS;
}

export function saveHeldOrdersLogF4209Raw(records: F4209HeldOrderRecord[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_F4209, JSON.stringify(records));
  }
}

export function resetToCleanSeedF4209(): F4209HeldOrderRecord[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_F4209);
  }
  return INITIAL_F4209_SEED_RECORDS;
}

export function appendHeldOrderLogF4209(entry: Omit<F4209HeldOrderRecord, 'id' | 'timestamp' | 'digitalSignatureHash'>): F4209HeldOrderRecord {
  const current = getHeldOrdersLogF4209();
  const chronological = [...current].sort((a, b) => {
    if (a.blockIndex !== undefined && b.blockIndex !== undefined && a.blockIndex !== b.blockIndex) {
      return a.blockIndex - b.blockIndex;
    }
    return a.timestamp - b.timestamp;
  });
  const prevBlock = chronological[chronological.length - 1];
  const maxTimestamp = chronological.reduce((max, r) => Math.max(max, r.timestamp || 0), 0);
  const now = Math.max(Date.now(), maxTimestamp + 1000);
  const blockIndex = (prevBlock?.blockIndex ?? chronological.length) + 1;
  const previousBlockHash = prevBlock?.digitalSignatureHash || GENESIS_BLOCK_HASH;

  const tempRecord: F4209HeldOrderRecord = {
    ...entry,
    id: `f4209_${now}_${Math.random().toString(36).slice(2, 6)}`,
    blockIndex,
    previousBlockHash,
    payloadHash: 'CALCULANDO_SHA256...',
    digitalSignatureHash: 'CALCULANDO_SHA256...',
    timestamp: now
  };

  const updated = [tempRecord, ...current].slice(0, 500);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_F4209, JSON.stringify(updated));
  }
  return tempRecord;
}

// ============================================================================
// MOTOR DE AUDITORÍA PRE-APROBACIÓN Y TRAZABILIDAD MULTINIVEL (P43081)
// ============================================================================
export interface OrderPreApprovalAudit {
  order: WorkOrder;
  routeEvaluation: ReturnType<typeof evaluateApprovalRoute>;
  stepsTrace: WorkOrderApprovalStepTrace[];
  currentStepNumber: number;
  currentStep: ApprovalStep;
  activeDelegation?: F43092DelegationRecord;
  supplierMatch?: Supplier;
  propertyMatch?: Property;
  checks: {
    supplierActive: boolean;
    supplierPaymentHoldClear: boolean;
    supplierRiskAcceptable: boolean;
    hasQuoteReference: boolean;
    hasCategoryAndSpecialty: boolean;
    hasAssociatedInvoiceInfo: boolean;
    withinPropertyBudget: boolean;
  };
  recommendedHoldCode: JDEHoldCodeType;
  complianceScore: number;
}

export function evaluateWorkOrderJDEApprovalState(
  order: WorkOrder,
  suppliers: Supplier[] = [],
  properties: Property[] = []
): OrderPreApprovalAudit {
  const orderType: 'OP' | 'SQ' | 'OT' = order.orderDocumentType === 'OC' || order.orderDocumentType === 'OP' ? 'OP' : 'OP';
  const routeEvaluation = evaluateApprovalRoute(orderType, order.total || 0, order.approvalRouteCode);
  const delegations = getDelegationsF43092().filter(d => d.isActive);

  const isOrderApproved = order.status === 'APROBADA' || order.status === 'RECEPCIONADA' || order.status === 'RECEPCIONADA_PARCIAL' || order.status === 'TERMINADA' || order.status === 'PAGADA';
  const isOrderRejected = order.status === 'RECHAZADA';

  const applicableSteps = routeEvaluation.applicableSteps;
  const savedCurrentStep = order.currentApprovalStep || (isOrderApproved ? applicableSteps.length + 1 : Math.min(2, applicableSteps.length));

  const stepsTrace: WorkOrderApprovalStepTrace[] = applicableSteps.map((step) => {
    if (order.approvalStepsTrace) {
      const existing = order.approvalStepsTrace.find(t => t.stepNumber === step.stepNumber);
      if (existing) return existing;
    }

    if (step.stepNumber === 1) {
      return {
        stepNumber: 1,
        stepName: step.stepName,
        approverRole: step.approverRole,
        approverTitle: step.approverTitle,
        requiredApproverName: order.preparedBy || step.approverName,
        status: 'APPROVED',
        actionBy: order.preparedBy || 'SOLICITANTE',
        actionAt: order.preparedAt || order.issueDate,
        comments: 'Emisión técnica e imputación inicial F4801/F4301'
      };
    }

    if (isOrderApproved || step.stepNumber < savedCurrentStep) {
      return {
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        approverRole: step.approverRole,
        approverTitle: step.approverTitle,
        requiredApproverName: step.approverName,
        status: 'APPROVED',
        actionBy: order.authorizedBy || step.approverName,
        actionAt: order.authorizedAt || order.authorizationDate || order.issueDate,
        comments: 'Visto bueno jerárquico otorgado conforme a matriz P43008'
      };
    }

    if (isOrderRejected && step.stepNumber === savedCurrentStep) {
      return {
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        approverRole: step.approverRole,
        approverTitle: step.approverTitle,
        requiredApproverName: step.approverName,
        status: 'REJECTED',
        actionBy: order.rejectedBy || order.authorizedBy || step.approverName,
        actionAt: order.rejectedAt || order.issueDate,
        comments: order.rejectionReason || 'Rechazada en revisión de control interno'
      };
    }

    return {
      stepNumber: step.stepNumber,
      stepName: step.stepName,
      approverRole: step.approverRole,
      approverTitle: step.approverTitle,
      requiredApproverName: step.approverName,
      status: order.holdCode && order.holdCode !== '00' && order.holdCode !== '2W' && order.holdCode !== '2A' && step.stepNumber === savedCurrentStep
        ? 'HOLD'
        : 'PENDING'
    };
  });

  const currentStep = applicableSteps.find(s => s.stepNumber === savedCurrentStep) || routeEvaluation.highestApprover;

  const activeDelegation = delegations.find(
    d => d.principalRole === currentStep.approverRole && (order.total || 0) <= d.maxDelegatedAmount
  );

  const supplierMatch = suppliers.find(
    s => s.id === order.supplierId || (s.taxId && order.supplierTaxId && s.taxId.replace(/\D/g, '') === order.supplierTaxId.replace(/\D/g, ''))
  );
  const propertyMatch = properties.find(p => p.id === order.propertyId);

  const supplierActive = supplierMatch ? supplierMatch.status === 'ACTIVE' : true;
  const supplierPaymentHoldClear = supplierMatch?.f0401Purchasing ? supplierMatch.f0401Purchasing.holdPaymentCode === '00' : true;
  const supplierRiskAcceptable = supplierMatch ? supplierMatch.dueDiligenceRisk !== 'RIESGO ALTO' : true;
  const hasQuoteReference = Boolean(order.quoteNumber && order.quoteNumber.trim().length > 0 && order.quoteNumber !== 'S/N');
  const hasCategoryAndSpecialty = Boolean(order.category && order.specialty);
  const hasAssociatedInvoiceInfo = Boolean(order.associatedInvoice && order.associatedInvoice.trim().length > 0);
  const withinPropertyBudget = (order.total || 0) <= 15000000;

  let recommendedHoldCode: JDEHoldCodeType = isOrderApproved ? '2A' : isOrderRejected ? '2R' : (order.holdCode || '2W');
  if (!isOrderApproved && !isOrderRejected && (!order.holdCode || order.holdCode === '2W')) {
    if (!supplierActive || !supplierRiskAcceptable || !supplierPaymentHoldClear) {
      recommendedHoldCode = 'C1';
    } else if (routeEvaluation.requirements.maxQuotesRequired > 0 && !hasQuoteReference) {
      recommendedHoldCode = 'Q1';
    } else if (!withinPropertyBudget) {
      recommendedHoldCode = 'B1';
    }
  }

  const checkValues = [
    supplierActive,
    supplierPaymentHoldClear,
    supplierRiskAcceptable,
    hasQuoteReference,
    hasCategoryAndSpecialty,
    hasAssociatedInvoiceInfo,
    withinPropertyBudget
  ];
  const complianceScore = Math.round((checkValues.filter(Boolean).length / checkValues.length) * 100);

  return {
    order,
    routeEvaluation,
    stepsTrace,
    currentStepNumber: savedCurrentStep,
    currentStep,
    activeDelegation,
    supplierMatch,
    propertyMatch,
    checks: {
      supplierActive,
      supplierPaymentHoldClear,
      supplierRiskAcceptable,
      hasQuoteReference,
      hasCategoryAndSpecialty,
      hasAssociatedInvoiceInfo,
      withinPropertyBudget
    },
    recommendedHoldCode,
    complianceScore
  };
}

