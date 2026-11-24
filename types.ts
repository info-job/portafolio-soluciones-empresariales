
export type ModuleType = 'DASHBOARD' | 'TAREAS' | 'ASISTENTE_TAREAS_IA' | 'OFICIOS' | 'INGRESOS' | 'EGRESOS' | 'FINANZAS' | 'ORDENES' | 'RECEPCION_OT' | 'PROPIEDADES' | 'SEGUROS' | 'PROVEEDORES' | 'HELPDESK' | 'REPORTE_B13' | 'REPORTE_B4' | 'NOTA_14' | 'CONCILIACION' | 'CAJA_CHICA' | 'CONFIG' | 'AUDITORIA' | 'BITACORA' | 'CUENTAS' | 'DUE_DILIGENCIA' | 'CONTRATOS_ARRIENDO' | 'GARANTIAS' | 'MANTENCIONES' | 'UAF_COMPLIANCE' | 'DEVELOPER_CONSOLE' | 'SALUD_SISTEMA' | 'DUE_DILIGENCIA_CONSULTA' | 'TASACIONES' | 'BOVEDA_DIGITAL' | 'CARGA_INTELIGENTE' | 'REVISION_REPORTES' | 'PROPIEDADES_INVERSION' | 'BROCHURE' | 'EVALUACION_POSTULANTES' | 'CONTROLLING' | 'REVISION_PAGOS_SEMANALES' | 'REPORTE_MENSUAL_GASTOS' | 'CISO_REPORT' | 'PROJECTS_REPORT' | 'SOLICITUDES' | 'MANUAL_USUARIO' | 'CERTIFICADOS_DOMINIO' | 'MAPA_DATOS_LEGAL' | 'CASH_FLOW_RUNWAY' | 'LIBROS_AUXILIARES' | 'BENFORD_ANALYSIS' | 'REVISION_PROPIEDADES' | 'CICLO_VIDA' | 'HISTORIAL_ARRIENDOS' | 'BUSQUEDA_EMPLEO' | 'REGISTRO_PAGOS' | 'IMPUESTOS_F29_F22' | 'FACTURACION_DTE' | 'MARKETING_CAMPAIGNS' | 'SYSTEM_LAUNCH' | 'SYSTEM_LANDING' | 'RUTAS_APROBACION' | 'APROBACIONES_JDE' | 'CONSULTAS_JDE' | 'CONTABILIDAD_JDE' | 'CENTRO_DESPACHO' | 'LOGISTICA_WMS';

// ==========================================
// ERP APPROVAL ROUTING (P43008)
// ==========================================
export type ApproverRoleType = 
  | 'SOLICITANTE' 
  | 'JEFE_MANTENCION' 
  | 'COMPLIANCE_JDE' 
  | 'GERENCIA_OPERACIONES' 
  | 'GERENCIA_GENERAL' 
  | 'AUDITOR_SENIOR'
  | 'ADMINISTRADOR';

export interface ApprovalStep {
  id: string;
  stepNumber: number;
  stepName: string;
  approverRole: ApproverRoleType;
  approverTitle: string;
  approverName: string;
  minAmount: number; // Monto Desde (CLP)
  maxAmount: number; // Monto Hasta (CLP)
  requiresQuotes: boolean;
  minQuotesCount?: number;
  requiresUafCheck?: boolean;
  requiresInspectionReport?: boolean;
  subrogateRole?: string;
  subrogateName?: string;
  slaHours: number;
  autoEscalate: boolean;
  notes?: string;
}

export interface ApprovalRoute {
  id: string;
  routeCode: string; // ej: OPROUTE, REQROUTE, CAPEX_HIGH, URGENCIA_OPS
  routeName: string;
  orderType: 'OP' | 'SQ' | 'OT'; // OP = Orden de Compra/OT, SQ = Solicitud Inquilino, OT = Mantención
  description: string;
  isActive: boolean;
  isDefault: boolean;
  currency: 'CLP' | 'UF';
  steps: ApprovalStep[];
  updatedAt: string;
  updatedBy: string;
}

// ==========================================
// TABLAS RELACIONALES DE APROBACIÓN ENTERPRISE 9.11 (P43081 / P43280 / F4209 / F43092 / F43199)
// ==========================================

export type JDEHoldCodeType = '00' | '2W' | '2A' | '2R' | '2H' | 'B1' | 'C1' | 'Q1' | 'T1';

export interface F43092DelegationRecord {
  id: string;
  routeCode: string;              // ARTG - Ruta o 'ALL'
  orderType: 'OP' | 'OT' | 'SQ' | 'ALL'; // DCTO
  principalRole: ApproverRoleType;
  principalName: string;          // APPR - Titular que delega
  delegateRole: ApproverRoleType;
  delegateName: string;           // DLGT - Subrogante autorizado
  effectiveFrom: string;          // EFTJ - Fecha inicio vigencia (YYYY-MM-DD)
  effectiveThru: string;          // EXDJ - Fecha término vigencia (YYYY-MM-DD)
  maxDelegatedAmount: number;     // ALIM - Tope máximo autorizado en subrogancia (CLP)
  reason: 'VACACIONES' | 'LICENCIA_MEDICA' | 'COMISION_SERVICIO' | 'ALTA_CARGA_OPERATIVA' | 'CONTINGENCIA';
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface F4209HeldOrderRecord {
  id: string;
  orderId: string;
  orderFolio: string;             // DOCO - Número de Orden OT/OC
  orderType: 'OT' | 'OP' | 'SQ';  // DCTO - Tipo de Orden
  businessUnit: string;           // MCU - Unidad de Negocio / Propiedad
  lineNumber: number;             // LNID - 0 para cabecera, >0 para línea específica
  routeCode: string;              // ARTG - Código Ruta Aprobación P43008
  stepNumber: number;             // Nivel Jerárquico (1..5)
  stepName: string;
  requiredRole: ApproverRoleType;
  requiredApprover: string;       // APPR - Aprobador requerido
  holdCode: JDEHoldCodeType;      // HCOD - 2W=Pendiente, 2A=Aprobado, 2R=Rechazado, 2H=En Observación, B1=Hold Presupuesto, C1=Hold Compliance
  orderAmount: number;            // Monto sujeto a aprobación
  releasedBy?: string;            // RPER - Usuario que aprobó/rechazó/liberó
  releasedByRole?: string;
  isDelegatedAction?: boolean;    // Si actuó por subrogancia F43092
  releaseDate?: string;           // RDJ - Fecha liberación (YYYY-MM-DD)
  releaseTime?: string;           // RTM - Hora liberación (HH:mm:ss)
  reasonCode?: string;            // RCD - Motivo técnico o glosa de dictamen
  digitalSignatureHash?: string;  // Hash SHA-256 del Bloque Encadenado (Web Crypto API FIPS 180-4)
  blockIndex?: number;            // Índice secuencial del bloque en la cadena F4209 (#1, #2, ...)
  previousBlockHash?: string;     // Hash SHA-256 (64 hex) del bloque inmediatamente anterior
  payloadHash?: string;           // Hash SHA-256 (64 hex) del payload canónico transaccional
  workStationId: string;          // JOBN
  programId: string;              // PID (P43081)
  timestamp: number;
}

export interface WorkOrderApprovalStepTrace {
  stepNumber: number;
  stepName: string;
  approverRole: ApproverRoleType;
  approverTitle: string;
  requiredApproverName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HOLD' | 'SKIPPED';
  actionBy?: string;
  actionAt?: string;
  isSubrogated?: boolean;
  comments?: string;
  signatureHash?: string;
}


export interface JobOffer {
  id: string;
  title: string;
  company: string;
  portal: 'Empleos Públicos' | 'Servicio Civil / ADP' | 'Mercado Público' | 'BNE Chile' | 'Laborum' | 'Chiletrabajos' | 'Computrabajo' | 'Get on Board' | 'LinkedIn' | 'Trabajando.com' | 'FirstJob' | string;
  portalUrl: string;
  location: string;
  modality: 'Remoto' | 'Híbrido' | 'Presencial';
  salaryMin: number;
  salaryMax: number;
  currency: 'CLP' | 'UF';
  category: 'Control Interno & Auditoría' | 'Supply Chain & Logística' | 'Operaciones & Inmobiliario' | 'Transformación Digital & IT' | 'Gerencia & Dirección' | 'Sector Público & Gobierno';
  description: string;
  requiredSkills: string[];
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  postedDate: string;
  status?: 'POR_POSTULAR' | 'POSTULADO' | 'EN_ENTREVISTA' | 'OFERTA_RECIBIDA' | 'DESCARTADO';
  applicationNotes?: string;
  interviewDate?: string;
  linkStatus?: 'ACTIVO' | 'INACTIVO' | 'VERIFICANDO' | 'PENDIENTE';
  linkCheckedAt?: string;
  lastInspectedAt?: string;
  linkErrorDetails?: string;
  isDisabilityInclusive?: boolean; // Ley N° 21.015 Inclusión Laboral Personas con Discapacidad
  directApplyUrl?: string; // Enlace directo a la sección Trabaja con Nosotros / Portal de Postulación Directa
  companyCareerUrl?: string; // Página oficial de empleos de la empresa
}

export interface CvProfile {
  id?: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  candidateName: string;
  candidateTitle: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  yearsOfExperience?: number;
  extractedSkills: string[];
  suggestedSalaryMin?: number;
  suggestedSalaryMax?: number;
  rawTextPreview?: string;
  source: 'UPLOADED_PDF' | 'MODEL_DEMO_PDF';
  rarityScore?: number;
  rarityTag?: string;
  rarityPillars?: { title: string; subtitle: string; description: string }[];
}

export interface Applicant {
  id: string;
  name: string;
  taxId: string; // RUT
  email: string;
  phone: string;
  monthlyIncome: number;
  employmentStatus: string;
  propertyId: string; // ID of property they want to rent
  propertyLabel: string;
  score: number; // calculated score (0-100) or manual evaluation
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  evaluatorObservations?: string;
  userCreator: string;
  timestamp: number;
  isTest?: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  reportType: 'B13' | 'B4';
  description?: string;
  records: any[];
  headers: string[];
  userCreator: string;
  timestamp: number;
}

export interface ReportReview {
  id: string;
  period: string;
  reportType: 'B13' | 'B4';
  insuranceCompany: InsuranceCompany;
  status: 'PENDING' | 'REVIEWED' | 'APPROVED';
  anomaliesCount: number;
  correctionsCount: number;
  templateId?: string;
  reportId: string; // ID of the B13Report or B4Report being reviewed
  userReviewer: string;
  timestamp: number;
}

export interface LeasePayment {
  id: string;
  period: string;
  amountPaid: number;
  date: string;
  paymentMethod: string;
  referenceNumber?: string;
  registeredBy: string;
  timestamp: number;
}

export interface LeaseContract {
  id: string;
  propertyId: string;
  propertyLabel: string;
  tenantName: string;
  tenantTaxId: string;
  tenantDocNumber?: string;
  startDate: string;
  endDate: string;
  renewalDate?: string;
  monthlyAmount: number;
  currency: 'CLP' | 'UF';
  status: ContractStatus;
  documentUrl?: string;
  documentName?: string;
  extractedData?: {
    tenantName?: string;
    tenantTaxId?: string;
    amount?: number;
    startDate?: string;
    endDate?: string;
    renewalDate?: string;
    confidence?: number;
  };
  userCreator: string;
  timestamp: number;
  observations?: string;
  isTest?: boolean;
  payments?: LeasePayment[];
}

export interface AccountingSheetData {
  sheetName: string;
  totalAmount: number;
  rowCount: number;
  columns: string[];
  sampleData: any[];
  valueColIdx?: number;
}

export interface AccountingReconciliationResult {
  concept: string;
  caratulaValue: number;
  detailValue: number;
  as400Value?: number;
  difference: number;
  as400Difference?: number;
  status: 'MATCH' | 'MISMATCH' | 'NOT_FOUND';
  detailSheetName?: string;
  as400SheetName?: string;
  suggestedAction?: string;
  confidenceScore?: number; // 0-100
}

export interface RowReconciliationResult {
  id: string;
  date?: string;
  reference: string; // Número de egreso/ingreso
  description?: string;
  controlValue: number;
  detailValue: number;
  difference: number;
  status: 'MATCH' | 'MISMATCH' | 'NOT_FOUND_IN_DETAIL' | 'NOT_FOUND_IN_CONTROL';
}

export interface AccountingReconciliation {
  id: string;
  period: string; // YYYY-MM
  uploadDate: string;
  fileName: string;
  title?: string;
  caratulaSheetName?: string;
  sheets: AccountingSheetData[];
  results: AccountingReconciliationResult[];
  rowResults?: RowReconciliationResult[];
  userCreator: string;
  timestamp: number;
}

export type SupplierStatus = 'ACTIVE' | 'BLOCKED' | 'PENDING_APPROVAL' | 'REJECTED';
export type InsuranceCompany = 'VIDA' | 'GENERALES';
export type UserRole = 'ADMINISTRADOR' | 'JEFE' | 'EJECUTIVO' | 'CLIENTE_DEMO' | 'ARRENDATARIO' | 'SOLO_EMPLEO';
export type RequestStage = 'SOLICITUD' | 'ORDEN_TRABAJO' | 'FACTURACION' | 'CERRADO';
export type WorkOrderStatus = 'BORRADOR' | 'PENDIENTE_VB' | 'APROBADA' | 'EMITIDA_IMPRESA' | 'RECHAZADA' | 'RECEPCIONADA_PARCIAL' | 'RECEPCIONADA' | 'TERMINADA' | 'PAGADA' | 'ANULADA';
export type ContractStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'RESUCINDIDO' | 'FINIQUITADO';
export type RiskLevel = 'RIESGO BAJO' | 'RIESGO MEDIO' | 'RIESGO ALTO';
export type TaxDocumentType = 'FACTURA' | 'BOLETA_HONORARIOS';
export type LineItemStatus = 'PENDIENTE' | 'PENDIENTE_VB' | 'APROBADA' | 'RECHAZADA' | 'RECIBIDO' | 'EN_OBSERVACION' | 'CANCELADA';

export type OfficialDocType = 'ENTRANTE' | 'SALIENTE';
export type OfficialDocStatus = 'RECIBIDO' | 'EN_PROCESO' | 'RESPONDIDO' | 'DESPACHADO' | 'ARCHIVADO' | 'RESPONDIDO_CON_OFICIO' | 'BORRADOR' | 'EN_FIRMA';
export type OfficialDocManagementType = 'TOMA_CONOCIMIENTO_JEFE' | 'DERIVADO_A' | 'OTRO' | 'PENDIENTE';

export type TicketPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA';
export type TicketStatus = 'ABIERTO' | 'EN_PROCESO' | 'ESPERANDO_USUARIO' | 'RESUELTO' | 'CERRADO' | 'RECHAZADO';
export type TicketCategory = 'HARDWARE' | 'SOFTWARE' | 'REDES' | 'ACCESOS' | 'OTROS';

export interface Note14SummaryItem {
  concept: string;
  land: number;
  buildings: number;
  others: number;
  total: number;
}

export interface Note14Record {
  id: string;
  lineNumber?: number;
  propertyRole?: string;
  address?: string;
  classification?: 'INVERSION' | 'USO_PROPIO';
  fairValue: number;
  bookValue: number;
  rentalIncome?: number;
  operatingExpenses?: number;
  restrictions?: string;
  
  // For summary items
  isSummary?: boolean;
  concept?: string;
  landValue?: number;
  buildingsValue?: number;
  othersValue?: number;

  validationErrors?: string[];
  riskScore?: number;
  riskCategory?: 'PROCESOS' | 'PERSONAS' | 'SISTEMAS' | 'INTEGRIDAD';
  [key: string]: any;
}

export interface Note14Report {
  id: string;
  period: string; // YYYY-QX (Quarterly)
  insuranceCompany: InsuranceCompany;
  uploadDate: string;
  records: Note14Record[];
  summary?: Note14SummaryItem[];
  userCreator: string;
  timestamp: number;
}

export interface B4Record {
  id: string;
  lineNumber?: number;
  rut: string;
  propertyRole: string;
  propertyType: {
    local?: boolean;
    office?: boolean;
    warehouse?: boolean;
    parking?: boolean;
    land?: boolean;
    house?: boolean;
    building?: boolean;
    floor?: boolean;
    apartment?: boolean;
    underConstruction?: boolean;
    others?: boolean;
  };
  urbanRural: 'URBANO' | 'NO_URBANO';
  destination: 'HABITACIONAL' | 'NO_HABITACIONAL';
  use: 'ARRIENDO' | 'PROPIO' | 'MIXTO';
  ownUsePercentage?: number;
  address: string;
  commune: string;
  city: string;
  purchaseDate: string;

  // Valoración Contable Desglosada NCG 316 (CMF)
  updatedCost: number;                    // Costo Total = Terreno + Construcción
  landUpdatedCost?: number;               // Costo Terreno (No depreciable NCG 316)
  buildingUpdatedCost?: number;           // Costo Construcción (Depreciable)
  accumulatedDepreciation: number;        // Depreciación Total = Depreciación Construcción
  landAccumulatedDepreciation?: number;   // $0 según Norma de Carácter General N° 316
  buildingAccumulatedDepreciation?: number; // Depreciación Acumulada Construcción
  buildingNetCost?: number;               // Costo Neto Construcción (buildingUpdatedCost - buildingAccumulatedDepreciation)
  remainingLifeMonths: number;
  correctedDepreciatedCost: number;       // Costo Terreno + Costo Neto Construcción

  // Tasación Pericial Desglosada
  appraisal1: number;                     // Tasación Total 1
  appraisal2: number;
  appraisalLand1?: number;                // Tasación Pericial Terreno
  appraisalBuilding1?: number;            // Tasación Pericial Construcción
  appraiser1: string;
  appraiser2: string;
  appraisalDate1: string;
  appraisalDate2: string;
  totalM2Land: number;
  totalM2Built: number;
  appraisalM2Land: number;                // $/M2 Terreno (Truncado)
  appraisalM2Built: number;               // $/M2 Construcción (Truncado)
  deterioration: number;
  finalValue: number;
  ownershipPercentage: number;
  hasProhibition: boolean;
  backsReserve: boolean;
  ncg316Compliant?: boolean;              // Indicador de cumplimiento NCG 316 CMF
  
  validationErrors?: string[];
  riskScore?: number;
  riskCategory?: 'PROCESOS' | 'PERSONAS' | 'SISTEMAS' | 'INTEGRIDAD';
  [key: string]: any;
}

export interface B4Report {
  id: string;
  period: string; // YYYY-MM
  insuranceCompany: InsuranceCompany;
  uploadDate: string;
  records: B4Record[];
  userCreator: string;
  timestamp: number;
}

export interface B13Record {
  id: string;
  lineNumber?: number;
  
  // CMF B13 Mandatory Fields
  propertyRole: string;        // ROL (must match B4)
  communeCode: string;         // COMUNA
  tenantName: string;          // NOMBRE_ARRENDATARIO_DEUDOR
  tenantRut: string;           // RUT_ARRENDATARIO_DEUDOR
  economicActivityCode: string; // CÓDIGO_ACTIVIDAD_ECONOMICA
  relatedParty: 'RE' | 'NR' | 'NA'; // RELACION
  contractExpirationDate: string; // FECHA_VENCIMIENTO_CONTRATO (AAAAMMDD)
  mnemonicCode: string;        // CODIGO_IDENTIFICACION (Anexo 1)
  
  // Financials (M$)
  billedMonth: number;         // FACTURACION_MES
  collectedCurrent: number;    // RECAUDACION_MES_ACTUAL
  collectedPrevious: number;   // RECAUDACION_MESES_ANTERIORES
  collectedTotal: number;      // RECAUDACION_MES_TOTAL
  pendingNoMorosity: number;   // MONTO_SIN_MOROSIDAD
  
  // Morosity Buckets (M$)
  morosityBuckets: {
    m30: number;   // < 30 días
    m60: number;   // 30 - 60 días
    m90: number;   // 60 - 90 días
    m180: number;  // 90 - 180 días
    m365: number;  // 180 - 1 año
    m2y: number;   // 1 - 2 años
    m3y: number;   // 2 - 3 años
    m4y: number;   // 3 - 4 años
    plus4y: number; // > 4 años
  };
  morosityTotal: number;       // MOROSIDAD_TOTAL
  badDebtProvision: number;    // PROVISION_INCOBRABILIDAD
  
  // Property Details
  propertyType: 'OFICINA' | 'LOCAL' | 'HABITACIONAL' | 'BODEGA' | 'OTROS'; // TIPO_BIEN_RAIZ
  overdueInstallments: number; // NUMERO_CUOTAS_VENCIDAS
  reprogrammingType: 'PDC' | 'PFC' | 'RMP' | 'RCA' | 'N/A'; // CARACTERISTICA_DE_REPROGRAMACION
  reprogrammingAmount: number; // MONTO_TOTAL_REPROGRAMACION
  
  // Surface & Contract
  m2Available: number;         // TOTAL_M2_DISPONIBLES_ARRIENDO
  m2Rented: number;            // TOTAL_M2_EN_ARRIENDO
  m2Vacant: number;            // TOTAL_M2_NO_ARRENDADOS
  contractType: 'FI' | 'VA' | 'MX'; // TIPO_CONTRATO
  rentValueUF: number;         // VALOR_M2_ARRIENDO (UF)
  expectedRentValueUF: number; // VALOR_M2_ESPERADO (UF)
  
  // Debt Details
  debtOriginalCurrency: number; // DEUDA_CAPITAL_INTERESES_DEVENGADOS_UM
  debtCLP: number;              // DEUDA_CAPITAL_INTERESES_DEVENGADOS_M$
  
  invoiceNumber?: string;
  issueDate?: string;
  
  validationErrors?: string[];
  riskScore?: number; // 0-100
  riskCategory?: 'PROCESOS' | 'PERSONAS' | 'SISTEMAS' | 'INTEGRIDAD';
  [key: string]: any;
}

export interface B13Report {
  id: string;
  period: string; // YYYY-MM
  insuranceCompany: InsuranceCompany;
  uploadDate: string;
  records: B13Record[];
  userCreator: string;
  timestamp: number;
}

export interface B13ComparisonResult {
  accountCode: string;
  accountName: string;
  currentAmount: number;
  previousAmount: number;
  difference: number;
  percentageChange: number;
  currentSquareMeters?: number;
  previousSquareMeters?: number;
  propertyRole?: string;
  isAnomaly: boolean;
  anomalyReason?: string;
}

export interface B4ComparisonResult {
  propertyRole: string;
  address: string;
  currentValue: number;
  previousValue: number;
  difference: number;
  percentageChange: number;
  currentM2Land?: number;
  previousM2Land?: number;
  currentM2Built?: number;
  previousM2Built?: number;
  isAnomaly: boolean;
  anomalyReason?: string;
}

export interface B13Task {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string;
  assignedTo?: string;
  reportId?: string;
  recordId?: string;
  createdAt: string;
}

export interface ITTicketSubtask {
  id: string;
  title: string;
  description?: string;
  status: 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADA';
  dueDate?: string;
  completedAt?: string;
}

export interface ITTicketUpdate {
  id: string;
  date: string;
  content: string;
  user: string;
  timestamp: number;
  attachmentName?: string;
  attachmentData?: string;
}

export interface ITTicket {
  id: string;
  folio: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  userCreator: string;
  requester: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolution?: string;
  timestamp: number;
  subtasks?: ITTicketSubtask[];
  updates?: ITTicketUpdate[];
  attachmentName?: string;
  attachmentData?: string;
}

export const INSURANCE_COMPANIES: InsuranceCompany[] = ['VIDA', 'GENERALES'];

export const PAYMENT_TERMS_CHILE = [
  "CONTRA FACTURA 100%",
  "ANTICIPO 30% / SALDO 70% CONTRA RECEPCIÓN",
  "ANTICIPO 50% / SALDO 50% CONTRA RECEPCIÓN",
  "30 DÍAS FECHA FACTURA",
  "60 DÍAS FECHA FACTURA",
  "PAGO CONTADO / CONTRA ENTREGA",
  "CONTRA RECEPCIÓN CONFORME"
];

export interface Contact {
  id: string;
  name: string;
  email: string;
  entity: string;
  position: string;
}

export interface PropertyInsurancePolicy {
  id: string;
  policyNumber: string;
  insuranceCompany: string;
  startDate: string;
  endDate: string;
  documentUrl?: string;
  coverageAmount?: number;
  status: 'VIGENTE' | 'VENCIDA' | 'PENDIENTE';
  observations?: string;
}

export interface PropertyClaim {
  id: string;
  claimNumber: string;       // Número de Siniestro (de la Compañía)
  incidentDate: string;      // Fecha del Siniestro
  reportDate: string;        // Fecha de Reporte a la Cía.
  type: 'INUNDACIÓN' | 'INCENDIO' | 'ROBO' | 'DAÑO_ESTRUCTURAL' | 'SISMO' | 'FRACTURA_CRISTAL' | 'SABOTAJE' | 'OTRO';
  severity: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA';
  status: 'REPORTE_INICIAL' | 'EN_LIQUIDACION' | 'REPARACION' | 'LIQUIDADO' | 'RECHAZADO';
  description: string;
  estimatedCost: number;     // Costo Estimado Daños CLP
  deductibleAmount: number;  // Deducible (UF/CLP)
  coveredAmount?: number;    // Monto Indemnizado / Cubierto CLP
  adjusterName?: string;     // Nombre del Liquidador/Ajustador
  adjusterEmail?: string;    // Contacto del Ajustador
  documentUrl?: string;      // Comprobante de denuncia u orden de liquidación (base64 o URL)
  history?: {
    id: string;
    date: string;
    action: string;
    user: string;
    notes?: string;
  }[];
}

export interface PropertyImportDraft {
  id: string;
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: any[];
  mapping: Record<string, string>;
  userCreator: string;
  timestamp: number;
  status: 'PENDING' | 'COMPLETED';
}

export type ChileanUtilityType = 'LUZ' | 'AGUA' | 'GAS' | 'INTERNET' | 'GASTO_COMUN' | 'SEGURIDAD' | 'OTRO';

export interface PropertyBasicServiceAccount {
  id: string;
  serviceType: ChileanUtilityType;
  providerName: string;
  clientNumber: string; // Número de Cliente / N° de Cuenta / ID Suministro
  meterNumber?: string; // N° de Medidor Físico
  notes?: string;
  isAutomaticDebit?: boolean; // Pago Automático (PAT/PAC)
}

export interface Property {
  id: string;
  code: string; 
  building: string; 
  floor: string; 
  address: string; 
  commune: string;
  region?: string;
  conjunto?: string;
  towerOrPhase?: string; // Torre, Etapa o Bloque
  type: 'DEPARTAMENTO' | 'CASA' | 'BODEGA' | 'ESTACIONAMIENTO' | 'LOCAL' | 'OFICINA';
  owner?: string;
  ownerTaxId?: string; // RUT del Propietario
  insurancePolicy?: PropertyInsurancePolicy;
  claims?: PropertyClaim[];
  isTest?: boolean;
  status?: string;
  
  // Detailed fields for property pool
  surfaceAreaLand?: number;
  surfaceAreaBuilt?: number;
  constructionYear?: number;
  destination?: 'HABITACIONAL' | 'NO_HABITACIONAL';
  useType?: 'ARRIENDO' | 'PROPIO' | 'MIXTO';
  propertyRole?: string; // ROL de la propiedad
  appraisalValue?: number; // Valor de tasación
  rentalAmount?: number; // Canon de arriendo base
  rentalCurrency?: 'CLP' | 'UF';
  rentalPaymentDay?: number; // Día del mes para pago (1-31)
  depositMonths?: number; // Meses de garantía requeridos
  occupancyStatus?: 'DISPONIBLE' | 'ARRENDADO' | 'EN_MANTENCION' | 'EN_RESERVA' | 'USO_PROPIO';
  basicServices?: PropertyBasicServiceAccount[];
  notes?: string;
  lastAppraisalDate?: string;
  appraisalDocumentUrl?: string; // Copia digital de la tasación
  appraisalDocumentName?: string;
  validationErrors?: string[];
  rawMetadata?: Record<string, any>; // Para preservar columnas no mapeadas del Excel original
  surchargeCalculated?: {
    ownerTotalAppraisal: number;
    surchargeBaseUTA: number;
    surchargeTotalAmount: number;
    proportionalSurcharge: number; // Sobretasa asignada proporcionalmente a esta propiedad
    calculatedAt: string;
    exceedsThreshold: boolean;
  };
  
  // Financial & Accounting Data for Subsidiary Review
  financialData?: {
    acquisitionCostCLP: number;
    acquisitionCostUF: number;
    acquisitionDate: string;
    usefulLifeMonths: number;
    residualValueCLP: number;
    accumulatedDepreciationCLP: number;
    landAcquisitionCostCLP?: number;
    buildingAcquisitionCostCLP?: number;
    buildingAccumulatedDepreciationCLP?: number;
    landAccumulatedDepreciationCLP?: number;
    lastDepreciationDate?: string;
    currentBookValueCLP: number;
    ufAtAcquisition: number;
  };
}

export interface OfficialDocument {
  id: string;
  type: OfficialDocType;
  docNumber: string;
  date: string;            // Fecha de Emisión (Documento)
  arrivalDate: string;     // Fecha de Ingreso (Físico)
  systemLoadDate: string;  // Fecha de Carga (Inmutable)
  subject: string;
  synthesis: string;
  repairAddress?: string;
  status: OfficialDocStatus;
  statusUpdatedAt: number; // TIMESTAMP del último cambio de estado
  managementType?: OfficialDocManagementType;
  assignedTo?: string; 
  responseDocNumber?: string; 
  responseDate?: string;   // Fecha de Respuesta (Salida)
  sender: string;
  recipient: string;
  relatedDocId?: string; 
  attachments: string[]; 
  userCreator: string;
  timestamp: number;
  confidenceScore?: number; // 0-100 (IA extraction confidence)
  accountCode?: string;
  documentUrl?: string;
  documentName?: string;
  hashSignature?: string;
  signedBy?: string;
  signedAt?: string;
}

export interface Contract {
  id: string;
  supplierId: string;
  supplierName: string;
  building: string;
  floor: string;
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  summary: string; 
  status: ContractStatus;
  timestamp: number;
  accountCode?: string;
}

export interface ComplianceChecklist {
  conflictThirdParty: boolean;
  conflictExecutive: boolean;
  beneficiariesUAF: boolean;
  dueDiligenceCert: boolean;
  paymentVoucher: boolean;
  invoice: boolean;
  receptionCertificate: boolean;
  photoSet: boolean;
  isExempt: boolean;
}

export interface UserAccount {
  password: string;
  role: UserRole;
  deptTitle: string; 
  email: string;
  phone?: string;
  allowedModules?: ModuleType[];
  firstName?: string;         // Nombres de pila (ej: Juan Andrés)
  paternalSurname?: string;   // Apellido Paterno (ej: Pérez)
  maternalSurname?: string;   // Apellido Materno (ej: González)
}

export const parseFullName = (fullName: string): { firstName: string; paternalSurname: string; maternalSurname: string } => {
  const clean = (fullName || '').trim();
  if (!clean) return { firstName: '', paternalSurname: '', maternalSurname: '' };
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], paternalSurname: '', maternalSurname: '' };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], paternalSurname: parts[1], maternalSurname: '' };
  }
  if (parts.length === 3) {
    return { firstName: parts[0], paternalSurname: parts[1], maternalSurname: parts[2] };
  }
  const maternalSurname = parts[parts.length - 1];
  const paternalSurname = parts[parts.length - 2];
  const firstName = parts.slice(0, parts.length - 2).join(' ');
  return { firstName, paternalSurname, maternalSurname };
};

export const USER_CREDENTIALS: Record<string, UserAccount> = {
  "CRISTIAN MUÑOZ R.": { password: "admin123", role: "ADMINISTRADOR", deptTitle: "CONTROL INTERNO DEPTO INMOBILIARIO", email: "cristian.munoz@inmobiliariapro.cl", phone: "56998204277", firstName: "CRISTIAN", paternalSurname: "MUÑOZ", maternalSurname: "R." },
  "ADMINISTRADOR PRINCIPAL": { password: "admin123", role: "ADMINISTRADOR", deptTitle: "CONTROL INTERNO DEPTO INMOBILIARIO", email: "cristian.munoz@inmobiliariapro.cl", phone: "56998204277", firstName: "ADMINISTRADOR", paternalSurname: "PRINCIPAL", maternalSurname: "" },
  "DEVELOPER": { password: "dev123", role: "ADMINISTRADOR", deptTitle: "DESARROLLO", email: "samaheim@gmail.com", firstName: "DEVELOPER", paternalSurname: "", maternalSurname: "" },
  "JMARCO CALDERON MORAGA": { password: "jefe123", role: "JEFE", deptTitle: "JEFE DE DEPARTAMENTO", email: "j.calderon@inmobiliariapro.cl", phone: "56988223344", firstName: "JMARCO", paternalSurname: "CALDERON", maternalSurname: "MORAGA" },
  "LUIS GUTIERREZ SEVERINO": { password: "jefe123", role: "JEFE", deptTitle: "JEFE DE OFICINA", email: "l.gutierrez@inmobiliariapro.cl", phone: "56911223344", firstName: "LUIS", paternalSurname: "GUTIERREZ", maternalSurname: "SEVERINO" },
  "DIEGO DIAZ": { password: "diego123", role: "EJECUTIVO", deptTitle: "ANALISTA INMOBILIARIO", email: "d.diaz@inmobiliariapro.cl", phone: "56955443322", firstName: "DIEGO", paternalSurname: "DIAZ", maternalSurname: "" },
  "ALFREDO COVARRUBIAS": { password: "ejecutivo123", role: "EJECUTIVO", deptTitle: "EJECUTIVO INMOBILIARIO ARRIENDOS", email: "a.covarrubias@inmobiliariapro.cl", firstName: "ALFREDO", paternalSurname: "COVARRUBIAS", maternalSurname: "" },
  "FRANCISCO MARDONES": { password: "ejecutivo123", role: "EJECUTIVO", deptTitle: "EJECUTIVO INMOBILIARIO ASUNTOS PDI", email: "f.mardones@inmobiliariapro.cl", firstName: "FRANCISCO", paternalSurname: "MARDONES", maternalSurname: "" },
  "CARLOS ULLOA": { password: "ejecutivo123", role: "EJECUTIVO", deptTitle: "ADMINISTRACIÓN CENTENARIO", email: "c.ulloa@inmobiliariapro.cl", phone: "56998204277", firstName: "CARLOS", paternalSurname: "ULLOA", maternalSurname: "" },
  "JUAN ANDRÉS PIÑA": { password: "juan123", role: "SOLO_EMPLEO", deptTitle: "POSTULANTE / CANDIDATO LABORAL", email: "juan.pina@assetflow.cl", phone: "56987654321", firstName: "JUAN ANDRÉS", paternalSurname: "PIÑA", maternalSurname: "", allowedModules: ["BUSQUEDA_EMPLEO"] },
  "CLIENTE DEMO": { password: "demo123", role: "CLIENTE_DEMO", deptTitle: "USUARIO BÁSICO / DEMOSTRACIÓN COMERCIAL", email: "demo.cliente@assetflow.cl", phone: "56900000000", firstName: "CLIENTE", paternalSurname: "DEMO", maternalSurname: "" },
  "ARRENDATARIO DEMO": { password: "tenant123", role: "ARRENDATARIO", deptTitle: "INQUILINO RESIDENCIAL", email: "arrendatario@demo.com", phone: "56912345678", firstName: "ARRENDATARIO", paternalSurname: "DEMO", maternalSurname: "" }
};

export type ComplianceRequirementStatus = 'PENDING' | 'VALID' | 'EXPIRED' | 'NOT_APPLICABLE' | 'ERROR';

export type ComplianceRequirementType = 
  | 'CONFLICT_INTEREST_THIRD' 
  | 'CONFLICT_INTEREST_EXEC' 
  | 'UBO_DECLARATION' 
  | 'TAX_CERTIFICATE' 
  | 'DUE_DILIGENCE' 
  | 'LEGAL_REPRESENTATIVE'
  | 'ASSIGNMENT_CERTIFICATE'
  | 'WORK_REPORT'
  | 'PHOTO_SET'
  | 'PAYMENT_VOUCHER'
  | 'INVOICE'
  | 'OTHER';

export interface SupplierComplianceRequirement {
  id: string;
  type: ComplianceRequirementType;
  name: string;
  status: ComplianceRequirementStatus;
  lastUpdate?: string;
  emissionDate?: string;
  expiryDate?: string;
  documentUrl?: string;
  documentName?: string;
  extractedData?: any;
  observations?: string;
  amount?: number;
  invoiceNumber?: string;
}

export interface DueDiligenceReport {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierTaxId: string;
  date: string;
  riskLevel: RiskLevel;
  analyst: string;
  summary: string;
  backgroundCheck: string;
  financialAnalysis: string;
  legalStatus: string;
  reputationCheck: string;
  findings: string[];
  recommendations: string;
  status: 'BORRADOR' | 'FINALIZADO';
  attachments: string[];
  timestamp: number;
}

// ==========================================
// ARQUITECTURA RELACIONAL MAESTRO DE PROVEEDORES (5 TABLAS: F0101 / F0116 / F0111 / F0401 / F0030)
// ==========================================

export type AddressBookSearchType = 'V' | 'VC' | 'VH' | 'VF' | 'VE'; // V=Proveedor Nac, VC=Contratista Obras, VH=Honorarios, VF=Factoring, VE=Extranjero

export interface AddressBookMasterRecord {
  id: string;                 // Vinculado a supplier.id
  addressNumber: number;      // AN8 - Número Único Libro de Direcciones (ej: 800101)
  taxId: string;              // TAX - RUT validado Módulo 11
  alphaName: string;          // ALPH - Nombre Alfabético / Nombre Corto de Búsqueda
  mailingName: string;        // MLNM - Razón Social Legal Completa
  searchType: AddressBookSearchType; // AT1 - Tipo de Búsqueda
  industryClassification: string;    // SIC - Giro Comercial SII / Rubro
  businessUnit: string;       // MCU - Unidad de Negocio / Centro de Costo Responsable
  payablesFlag: 'Y' | 'N' | 'H';     // ATP - Habilitado Cuentas por Pagar (Y=Sí, N=No, H=Hold)
  receivablesFlag: 'Y' | 'N';        // ATR - Habilitado Cuentas por Cobrar
  employeeFlag: 'Y' | 'N';           // ATE - Relacionado / Funcionario (Alerta Conflicto Interés)
  catCode01: string;          // AC01 - Zona / Región Operativa
  catCode02: string;          // AC02 - Especialidad Técnica
  catCode03: string;          // AC03 - Segmento Tamaño (GRAN_EMPRESA | PYME | MICRO | PROFESIONAL)
  catCode04: string;          // AC04 - Criticidad Operacional (CRITICO | ESTANDAR | EVENTUAL)
  catCode05: string;          // AC05 - Nivel Riesgo UAF (BAJO | MEDIO | ALTO)
  userId: string;             // USER - Usuario creador/modificador
  programId: string;          // PID - P01012
  workStationId: string;      // JOBN - Terminal
  updatedDate: string;        // UPMJ - Fecha actualización
  updatedTime: string;        // UPMT - Hora actualización
}

export interface AddressByDateRecord {
  id: string;
  supplierId: string;
  addressNumber: number;      // AN8
  effectiveDate: string;      // EFTB - Fecha de Inicio de Vigencia (YYYY-MM-DD)
  addressType: 'CASA_MATRIZ' | 'SUCURSAL_OPERATIVA' | 'BODEGA_DESPACHO' | 'DOMICILIO_TRIBUTARIO';
  addressLine1: string;       // ADD1 - Calle y Número
  addressLine2?: string;      // ADD2 - Oficina / Piso / Edificio / Resto
  commune: string;            // CTY1 - Comuna
  city: string;               // COUN - Ciudad / Provincia
  region: string;             // ADDS - Región
  postalCode?: string;        // ADDZ - Código Postal
  country: string;            // CTR - País (CL)
  isPrimary: boolean;
}

export interface SupplierContactRecord {
  id: string;
  supplierId: string;
  addressNumber: number;      // AN8
  lineId: number;             // IDLN - Secuencia de Contacto (0, 1, 2...)
  contactType: 'REP_LEGAL' | 'COMERCIAL' | 'TESORERIA' | 'OPERACIONES'; // TYC
  fullName: string;           // MLNM - Nombre Completo
  contactTaxId?: string;      // RUT del Contacto / Representante Legal
  jobTitle: string;           // ATTL - Cargo
  phonePrimary: string;       // PH1 - Teléfono Móvil / Directo
  phoneSecondary?: string;    // Teléfono Fijo / Anexo
  electronicAddress: string;  // EMAL - Correo Electrónico (F01151)
  canSignContracts: boolean;  // Facultad de firma legal verificada
  isPrimary: boolean;
}

export interface SupplierMasterF0401Record {
  id: string;                 // Vinculado a supplier.id
  addressNumber: number;      // AN8
  glClassCode: 'PCNAC' | 'PCHON' | 'PCFAC' | 'PCGAR'; // APC - Clase Contable AAI
  defaultExpenseAccount: string; // Cuenta Contable de Gasto/Activo por Defecto
  paymentTermsCode: string;   // TRAP - Condición de Pago
  paymentInstrument: 'T' | 'V' | 'C' | 'P'; // PYIN - T=Transferencia TEF, V=Vale Vista, C=Cheque, P=PAC
  taxExplanationCode: 'IVA' | 'EXE' | 'BH' | 'CON'; // EXR1 - IVA 19%, Exento, Boleta Honorarios, Construcción
  withholdingTaxPct: number;  // % Retención (0, 13.75, 19)
  currencyCode: 'CLP' | 'UF' | 'USD'; // CRRP - Moneda Base
  minOrderAmount: number;     // MINO - Monto Mínimo OT (CLP)
  maxOrderAmount: number;     // MAXO - Monto Máximo OT sin Doble Firma (CLP)
  holdPaymentCode: '00' | '01' | '02' | '03'; // HDPY - 00=Liberado, 01=Hold Compliance, 02=Hold Garantía, 03=Hold Factoring
  threeWayMatchRequired: boolean; // Exigir Cotejo de 3 Vías (OT + Recepción + Factura)
  voucherPerInvoice: boolean;
  factoringAllowed: boolean;
  defaultFactoringEntity?: string;
  defaultFactoringTaxId?: string;
  updatedAt: number;
}

export interface BankTransitMasterRecord {
  id: string;
  supplierId: string;
  addressNumber: number;      // AN8
  recordType: 'V' | 'S' | 'F'; // BKTP - V=Principal Proveedor, S=Secundaria, F=Factoring
  bankCode: string;           // TNST - Código SBIF/CMF (001, 012, 037, 016, etc.)
  bankName: string;
  accountType: string;
  accountNumber: string;      // CBNK - N° de Cuenta Bancaria
  holderRut: string;          // RUT Titular Cuenta
  holderName: string;         // Nombre Titular Cuenta
  remittanceEmail: string;    // Correo para comprobante TEF
  swiftBic?: string;
  prenoteStatus: 'P' | 'A' | 'B'; // PREN - P=Pre-nota en Validación, A=Activa/Verificada, B=Bloqueada
  isDefault: boolean;
  bankCertUrl?: string;       // Certificado de Titularidad Bancaria (Base64 / URL)
  bankCertName?: string;
}

export interface Supplier extends LockMetadata {
  id: string;
  addressNumber?: number;     // AN8 - Número Único Libro de Direcciones F0101
  folio: string;
  taxId: string;
  name: string;
  alphaName?: string;         // Nombre corto / Fantasía F0101
  searchType?: AddressBookSearchType;
  businessUnit?: string;
  industryClassification?: string;
  category: string;
  taxDocumentType: TaxDocumentType;
  requestDate: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  commune?: string;
  city?: string;
  region?: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  status: SupplierStatus;
  rejectionReason?: string;
  userCreator: string;
  approver?: string;
  timestamp: number;
  dueDiligenceDate: string;
  dueDiligenceRisk: RiskLevel;
  complianceMaster: Omit<ComplianceChecklist, 'isExempt'>;
  complianceRequirements?: SupplierComplianceRequirement[];
  folderUrl?: string; 
  isAssigned?: boolean; // Factura Cedida (Factoring)
  assignedToEntity?: string; // Entidad de Factoring
  confidenceScore?: number; // 0-100 (Data completeness)
  latestDocumentDate?: string; // Fecha del documento más reciente
  lastProcessingDate?: string; // Fecha del último procesamiento de IA
  isTest?: boolean;

  // Tablas Relacionales vinculadas (F0101 / F0116 / F0111 / F0401 / F0030)
  f0101AddressBook?: AddressBookMasterRecord;
  f0116Addresses?: AddressByDateRecord[];
  f0111Contacts?: SupplierContactRecord[];
  f0401Purchasing?: SupplierMasterF0401Record;
  f0030BankAccounts?: BankTransitMasterRecord[];
}

export interface WorkOrderLineItem {
  id: string;
  description: string;
  quantity: number;
  receivedQuantity: number; 
  rejectedQuantity?: number;
  discrepancyReason?: string;
  discrepancyStatus?: 'NINGUNA' | 'CUARENTENA' | 'RECHAZADO' | 'ACEPTADO_CONDICIONADO';
  unitPrice: number;
  total: number;
  status: LineItemStatus; 
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
  lineStatusCode?: string; // ERP UDC code e.g. "280", "380", "999"
}

export interface ContingencyOverride {
  enabled: boolean;
  type: 'VACACIONES' | 'LICENCIA_MEDICA' | 'EMERGENCIA_OPERACIONAL' | 'PROVEEDOR_UNICO' | 'SUBROGANTE_AUTORIZADO' | 'OTRO';
  reason: string;
  authorizedBy: string;
  date: string;
  timestamp: number;
}

export interface WorkOrderAction {
  id: string;
  date: string; // Timestamp de registro
  entryDate?: string; // Fecha de ingreso estructurada (YYYY-MM-DD)
  deadline?: string; // Plazo para hacerlo
  description: string; // Qué se debe hacer
  user: string; // Usuario que registra
  actionResponsible?: string; // Quién debe hacer la acción
  trackingResponsible?: string; // Responsable de dar seguimiento a esa acción
  type: 'REALIZADA' | 'PENDIENTE';
  actionCategory?: 'INTER_AREA_REQUIREMENT' | 'STATUS_CHANGE' | 'APPROVAL' | 'EMISSION' | 'RECEPTION' | 'PAYMENT' | 'NOTE' | 'CONTINGENCY_BYPASS';
  sourceArea?: string;
  targetArea?: string;
}

export interface WorkOrder extends LockMetadata {
  id: string;
  folio: string;
  issueDate: string;
  
  preparedBy: string;
  preparedByDept: string;
  preparedByPhone: string;
  preparedByEmail: string;
  preparedAt?: string; 

  supplierId: string;
  supplierName: string;
  supplierTaxId: string;
  supplierTaxDocumentType: TaxDocumentType;
  supplierAddress: string;
  supplierContact: string;
  supplierPhone: string;
  supplierEmail: string;

  quoteNumber: string;
  requestDate: string;

  reqDept: string;
  deliveryDate: string;
  paymentTerms: string;
  deliveryAddress: string;

  items: WorkOrderLineItem[];
  subtotal: number;
  iva: number;
  total: number;

  specialInstructions: string;
  category?: string;
  specialty?: string;
  associatedInvoice?: string;

  status: WorkOrderStatus;
  authorizedBy?: string;
  authorizationDate?: string;
  authorizedAt?: string; 
  complianceApprovedBy?: string;
  complianceApprovedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  evaluationNotes?: string;
  
  receptionDate?: string;
  receptionUser?: string;
  receptionInvoiceNumber?: string; 
  timestamp: number;
  propertyId: string;
  propertyLabel: string;
  accountCode?: string;
  confidenceScore?: number; // 0-100
  trackingResponsible?: string;
  trackingActions?: WorkOrderAction[];
  isTest?: boolean;
  receptionPhotos?: string[];
  receptionDocuments?: { name: string; url: string; size?: string }[];
  printedAt?: string;
  printedBy?: string;
  printCount?: number;
  emissionChannel?: 'IMPRESION_FISICA' | 'ENVIO_DIGITAL' | 'PORTAL_PROVEEDOR';
  jdeLastStatus?: string;
  jdeNextStatus?: string;
  orderDocumentType?: 'OT' | 'OC' | 'OP' | 'OS'; // DCTO: OT=Orden de Trabajo (F4801), OC/OP=Orden de Compra (F4301), OS=Orden de Servicio
  approvalRouteCode?: string;                    // ARTG: Código de Ruta P43008 asignada
  currentApprovalStep?: number;                  // Nivel actual en la ruta jerárquica (1..5)
  holdCode?: JDEHoldCodeType;                    // HCOD: Código de Retención JDE F4209
  approvalStepsTrace?: WorkOrderApprovalStepTrace[]; // Trazabilidad multinivel F4209/F43199
  contingency3Way?: ContingencyOverride;
  contingencyQuotes?: ContingencyOverride;
  contingencyQuality?: ContingencyOverride;
  contingencyPeriodFreeze?: ContingencyOverride;
  contingencyInventory?: ContingencyOverride;
}

export interface AuditSolutionProposal {
  diagnosis: string;
  recommendedAction: string;
  resolutionNotes: string;
  status: 'SIN_RESOLVER' | 'EN_PROCESO' | 'RESUELTO';
  resolvedBy: string;
  resolvedAt: string;
  attachmentName?: string;
  attachmentData?: string; // Base64 representation of backing document
  attachmentType?: string;
  attachmentSize?: string;
}

export interface AuditEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'EXPORT' | 'SECURITY' | 'BACKUP' | 'SYNC' | 'REBUILD' | 'APPROVE' | 'REJECT';
  user: string;
  userRole?: string;
  entityType: 'PROVEEDOR' | 'TRANSACCION' | 'ORDEN_TRABAJO' | 'OFICIO' | 'PROPIEDAD' | 'CONTRATO' | 'SISTEMA' | 'CUENTA_CONTABLE' | 'TASACION' | 'POSTULANTE' | 'SEGURIDAD' | 'REPORTE' | 'CAJA_CHICA' | 'SOLICITUD' | 'EXPEDIENTE';
  entityId: string;
  entityName?: string;
  newValue?: string;
  oldValue?: string;
  fieldChanged?: string;
  timestamp: number;
  programId?: string;     // ERP standard Program code (e.g. P0911, P0411, R09321)
  workStationId?: string; // Client machine/terminal ID (MKEY equivalent)
  nextNumberSeq?: number; // Sequence tracker index from F0002 Next Numbers
  hashSignature?: string; // Security verification signature hash
  solutionProposal?: AuditSolutionProposal;
  details?: string;
  moduleName?: string;
  severity?: 'NORMAL' | 'MEDIO' | 'ALTO' | 'CRITICO' | 'SEGURIDAD';
  status?: 'EXITO' | 'FALLO' | 'ADVERTENCIA';
}

export interface LockMetadata {
  lockedBy: string | null;
  lockedAt: number | null;
}

export interface Transaction extends LockMetadata {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  documentType: string;
  documentNumber: string;
  date: string; 
  invoiceDate: string; 
  user: string;
  timestamp: number;
  supplierId?: string;
  supplierName?: string;
  supplierTaxId?: string;
  propertyId?: string; 
  accountCode?: string;
  insuranceCompany: InsuranceCompany;
  compliance?: ComplianceChecklist;
  workOrderId?: string; 
  status?: 'PENDIENTE' | 'COMPLETADA' | 'ANULADA';
  relatedEntityId?: string;
  relatedEntityType?: string;
  isAutoGenerated?: boolean;
  subCategory?: string;
  metadata?: any;
  syncedAt?: any;
  documentUrl?: string;
  documentName?: string;
  programId?: string;     // ERP Program code responsible for creation (P0911 or P0411)
  workStationId?: string; // Client terminal ID (MKEY equivalent)
  nextNumberSeq?: number; // ERP sequence tracking index
  hashSignature?: string; // Traceability validation hash
  batchNumber?: string;   // ERP ledger Batch identifier for double-entry balancing
  isTest?: boolean;
}

export type TransactionType = 'INCOME' | 'EXPENSE';
export const INCOME_CATEGORIES = ["ARRIENDOS", "LIQUIDACIÓN DE SINIESTROS", "VENTAS", "SERVICIOS", "HONORARIOS", "SERVICIO DE TASACIONES", "OTROS"];
export const EXPENSE_CATEGORIES = ["PAGO A PROVEEDOR", "REEMBOLSO", "LIQUIDACIÓN DE GARANTÍA", "COMPRAS", "GASTOS GENERALES", "PERSONAL", "IMPUESTOS", "PAGO FACTURA DE SEGURO DE PROPIEDADES", "OTROS"];
export const DOCUMENT_TYPES = ["DEPÓSITO", "REEMBOLSO", "LIQUIDACIÓN DE SINIESTROS", "LIQUIDACIÓN DE GARANTÍA", "FACTURA", "BOLETA", "CONTRATO DE ARRIENDO", "COMPROBANTE", "OTRO"];
export const SUPPLIER_CATEGORIES = [
  "SERVICIOS BÁSICOS", "CONSTRUCCIÓN Y OBRAS", "INSUMOS DE OFICINA", 
  "MANTENCIÓN TÉCNICA", "CONSULTORÍAS", "GESTIÓN INMOBILIARIA", "SERVICIO DE TASACIONES", "OTROS"
];
export const BANK_LIST = [
  "BANCO DE CHILE", "BANCO ESTADO", "SANTANDER", "BCI", "SCOTIABANK", "ITAU", "OTRO / INTERNACIONAL"
];
export const ACCOUNT_TYPES = [
  "CUENTA CORRIENTE", "CUENTA VISTA / RUT", "CUENTA de AHORRO", "OTRA"
];

export interface PettyCash {
  id: string;
  name: string;
  responsible: string;
  initialBalance: number;
  currentBalance: number;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  timestamp: number;
}

export interface PettyCashExpense {
  id: string;
  pettyCashId: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  supplierName?: string;
  supplierTaxId?: string;
  documentNumber?: string;
  documentType: 'BOLETA' | 'FACTURA' | 'COMPROBANTE' | 'OTRO';
  accountCode?: string;
  attachmentUrl?: string;
  attachmentType?: 'IMAGE' | 'PDF';
  userCreator: string;
  timestamp: number;
  extractedData?: {
    date?: string;
    amount?: number;
    supplierTaxId?: string;
    documentNumber?: string;
    confidence?: number;
  };
}

export interface MaintenanceUpdate {
  id: string;
  date: string;
  content: string;
  user: string;
  photos?: string[];
  timestamp: number;
}

export interface MaintenanceSubtask {
  id: string;
  title: string;
  description?: string;
  status: 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADA';
  dueDate?: string;
  assignedTo?: string;
  completedAt?: string;
}

export interface MaintenanceExpediente {
  id: string;
  propertyId: string;
  propertyLabel: string;
  title: string;
  description: string;
  status: 'PENDIENTE' | 'EN_PROCESO' | 'DETENIDO' | 'FINALIZADO';
  priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA';
  category: 'REPARACIÓN' | 'MANTENCIÓN' | 'EMERGENCIA';
  requestDate: string;
  updates: MaintenanceUpdate[];
  subtasks?: MaintenanceSubtask[];
  userCreator: string;
  timestamp: number;
  assignedTo?: string;
  estimatedCost?: number;
  actualCost?: number;
}

export interface AppraisalRole {
  role: string;
  valueCLP?: number;
  valueUF?: number;
  landValueCLP?: number;
  landValueUF?: number;
  builtValueCLP?: number;
  builtValueUF?: number;
  surfaceAreaLand?: number;
  surfaceAreaBuilt?: number;
}

export interface Appraisal {
  id: string;
  propertyId?: string;
  propertyRole?: string; // Main ROL or "Varios"
  roles?: AppraisalRole[]; // List of all ROLs involved
  address: string;
  commune: string;
  appraiserName: string;
  appraisalDate: string;
  marketValueCLP: number;
  marketValueUF: number;
  landValueCLP?: number;
  builtValueCLP?: number;
  surfaceAreaLand?: number;
  surfaceAreaBuilt?: number;
  documentUrl?: string;
  documentName?: string;
  status: 'VIGENTE' | 'VENCIDA' | 'OBSOLETA' | 'PENDIENTE';
  userCreator: string;
  timestamp: number;
  confidenceScore?: number;
  ufValue?: number; // Valor de la UF utilizado
  ufDate?: string;  // Fecha del valor de la UF utilizado
  extractedData?: {
    propertyRole?: string;
    roles?: AppraisalRole[];
    address?: string;
    commune?: string;
    appraiserName?: string;
    appraisalDate?: string;
    marketValueCLP?: number;
    marketValueUF?: number;
    surfaceAreaLand?: number;
    surfaceAreaBuilt?: number;
    confidence?: number;
  };
}

export interface AccountingAccount {
  id: string;
  code: string;
  name: string;
  type: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESOS' | 'EGRESOS';
  subType: string;
  level: number;
  parentCode?: string;
  description?: string;
}

export interface SecurityDeposit {
  id: string;
  contractId: string;
  propertyId: string;
  propertyLabel: string;
  tenantName: string;
  initialAmount: number;
  currency: 'CLP' | 'UF';
  depositDate: string;
  status: 'RESGUARDADA' | 'EN_LIQUIDACION' | 'LIQUIDADA' | 'DEVUELTA';
  documentUrl?: string;
  settlement?: SecurityDepositSettlement;
  userCreator: string;
  timestamp: number;
}

export interface SettlementDeduction {
  id: string;
  concept: string;
  amount: number;
  description?: string;
  attachmentName?: string;
  attachmentData?: string;
}

export interface SecurityDepositSettlement {
  id: string;
  depositId: string;
  settlementDate: string;
  originalAmount: number;
  deductions: SettlementDeduction[];
  totalDeductions: number;
  refundAmount: number;
  status: 'BORRADOR' | 'FINALIZADA';
  userCreator: string;
  timestamp: number;
  observations?: string;
  folio?: string;
  documentSetUrl?: string;
  documentSetName?: string;
  documentSetCount?: number;
}

export interface SolicitudUpdate {
  id: string;
  date: string;
  content: string;
  user: string;
  timestamp: number;
}

export interface SolicitudSubtask {
  id: string;
  title: string;
  description?: string;
  status: 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADA';
  dueDate?: string;
  assignedTo?: string;
  completedAt?: string;
}

export interface Solicitud {
  id: string;
  propertyId: string;
  propertyLabel: string;
  title: string;
  description: string;
  status: 'PENDIENTE' | 'EN_PROCESO' | 'DETENIDA' | 'FINALIZADA' | 'APROBADA_JEFATURA';
  priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA';
  category: 'REQUERIMIENTO' | 'MEJORA' | 'CONSULTA' | 'DOCUMENTACIÓN' | 'SERVICIOS' | 'REEMBOLSO';
  requestDate: string;
  updates: SolicitudUpdate[];
  subtasks?: SolicitudSubtask[];
  userCreator: string;
  timestamp: number;
  assignedTo?: string;
  applicantName?: string;
  applicantEmail?: string;
  workOrderId?: string;
  workOrderFolio?: string;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  statusHistory?: {
    status: 'PENDIENTE' | 'EN_PROCESO' | 'DETENIDA' | 'FINALIZADA' | 'APROBADA_JEFATURA';
    date: string;
    user: string;
    timestamp: number;
  }[];
  isTest?: boolean;
  images?: string[];
  exactLocation?: string;
  phone?: string;
  reimbursementAmount?: number;
  reimbursementReceipts?: string[];
  reimbursementBankInfo?: {
    bankName: string;
    accountType: string;
    accountNumber: string;
    rut: string;
    holderName: string;
  };
}

export interface ReversalRequest {
  id: string;
  transactionId: string;
  transactionDescription: string;
  transactionAmount: number;
  transactionType: 'INCOME' | 'EXPENSE';
  transactionDate: string;
  requesterUser: string;
  requesterEmail: string;
  reason: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  createdAt: number;
  
  controlInternoStatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  controlInternoUser?: string;
  controlInternoAt?: number;
  
  analistaStatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  analistaUser?: string;
  analistaAt?: number;
  
  jefeStatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  jefeUser?: string;
  jefeAt?: number;
}

export interface F980011D {
  id: string; // registryId
  registryId: string;
  entityType: string; // e.g. 'SUPPLIER', 'PROPERTY', 'TRANSACTION', etc.
  programId: string; // origin program (e.g. P0411, P1201, P0911)
  workStationId: string; // workstation
  nextNumberSeq: number; // sequential sequence
  userCreator: string; // user Creator
  timestamp: number; // created timestamp
  hashSignature: string; // cryptographic hash signature
  lockedBy: string | null; // user who locked it
  lockedAt: number | null; // locked timestamp
  isTest: string; // tipo de ledger or test status
  attributes: Record<string, string>; // custom key-value attributes list
}

export interface DomainCertificate {
  id: string; // unique firesore id
  registryId: string; // ERP registry attribute master ID
  propertyId: string;
  propertyName?: string;
  region: string;
  commune: string;
  folderPath: string; // dynamic physical or virtual directory path grouped by region
  documentName: string;
  documentUrl: string; // stored base64 or storage url
  fojas: string;
  numero: string;
  ano: number;
  conservador: string;
  issueDate?: string;
  ownerName?: string;
  ownerTaxId?: string;
  status: 'VIGENTE' | 'EXPIRADO' | 'PENDIENTE_REVISION';
  userCreator: string;
  timestamp: number;
}

export interface PropertyInspectionItem {
  id: string;
  area: string;
  element: string;
  state: 'EXCELENTE' | 'BUENO' | 'REGULAR' | 'MALO';
  observation: string;
}

export interface PropertyInspection {
  id: string;
  propertyId: string;
  propertyLabel: string;
  contractId?: string;
  tenantName: string;
  tenantEmail: string;
  executiveName: string;
  executiveEmail: string;
  type: 'ENTRANTE' | 'RESTITUCION';
  status: 'BORRADOR' | 'ACTA_ENVIADA' | 'ACEPTADO' | 'RECHAZADO';
  inspectionDate: string;
  items: PropertyInspectionItem[];
  photos: string[]; // Base64 strings or URLs
  rejectionReason?: string;
  signatureTenant?: string;
  signatureTenantRut?: string;
  signatureTenantDocNumber?: string;
  signatureExecutive?: string;
  userCreator: string;
  timestamp: number;
  isTest?: boolean;
}

export interface TaxF29Data {
  period: string; // YYYY-MM
  regime: '14D3' | '14D8' | '14A';
  ppmRate: number; // percentage (e.g. 1.25)
  ventasAfectasNeto: number;
  ventasExentas: number;
  debitoFiscalIVA: number; // Código 501 / 538
  comprasAfectasNeto: number;
  creditoFiscalIVA: number; // Código 520 / 521
  remanenteMesAnterior: number; // Código 504 del mes anterior
  remanenteActual: number; // Código 504 de este mes si Crédito > Débito
  impuestoDeterminadoIVA: number; // Código 91 si Débito > Crédito
  ppmNetoAmount: number; // Código 115 / 142
  retenciones2aCat: number; // Código 151 (13.75% a 17% Honorarios)
  totalAPagarNeto: number; // Monto Líquido a Pagar en Banco / Tesorería
  includedTransactionIds: string[];
  retencionRate?: number; // Tasa de retención honorarios Ley 21.133 (ej. 15.25% en 2026)
  factorProrrataIva?: number; // Factor de proporcionalidad Art. 23 N° 3 DL 825 (%)
  creditoFiscalBruto?: number; // Crédito fiscal bruto antes de factor de prorrata
  dueDateSiiGeneral?: string; // Fecha de vencimiento general (Día 12)
  dueDateSiiElectronic?: string; // Fecha de vencimiento electrónico RCV (Día 20)
}

export interface TaxF22Data {
  taxYear: number; // e.g. 2026 (Commercial year 2025)
  commercialYear: number;
  regime: '14D3' | '14D8' | '14A';
  idpcRate: number; // e.g. 12.5 or 25 or 27
  totalIngresosBrutos: number; // Ingresos Percibidos / Devengados
  totalGastosDeducibles: number; // Gastos Necesarios para Producir Renta (Art. 31)
  gastosRechazadosArt21: number;
  rentaLiquidaImponible: number; // RLI Base IDPC
  impuestoIDPCDeterminado: number; // Código 18 / 140
  menosPPMAnual: number; // Total PPM pagados en F29s
  menosRetencionesAnuales: number;
  saldoFinalAnual: number; // Positive = A Pagar, Negative = Devolución
  includedTransactionIds: string[];
}

export interface TaxDeclaration {
  id: string;
  type: 'F29' | 'F22';
  periodLabel: string; // e.g. "2026-07" or "AT 2026 (Ejercicio 2025)"
  status: 'BORRADOR' | 'OFICIAL_EMITIDO' | 'EMITIDO';
  f29Data?: TaxF29Data;
  f22Data?: TaxF22Data;
  folio: string;
  hashSignature?: string;
  issuedAt?: number;
  issuedBy?: string;
  userCreator: string;
  timestamp: number;
  notes?: string;
}

export interface AdCampaign {
  id: string;
  name: string;
  objective: 'CAPTACION_LEADS_B2B' | 'POSICIONAMIENTO_MARCA' | 'RETENCION_CLIENTES' | 'VENTA_DIRECTA_LICENCIAS' | 'HIGH_TICKET_PROPERTY';
  channel: 'LINKEDIN_ADS' | 'GOOGLE_SEARCH_B2B' | 'EMAIL_OUTREACH' | 'WEBINAR_EJECUTIVO' | 'META_BUSINESS' | 'PRENSA_EVENTOS';
  targetAudience: string; // e.g. "CFOs, Gerentes de Operaciones Inmobiliarias & Corredoras"
  segmentRegion: string; // e.g. "Región Metropolitana, Valparaíso, Concepción"
  budget: number; // Presupuesto asignado en CLP
  spent: number; // Gasto real ejecutado en CLP
  startDate: string;
  endDate: string;
  status: 'BORRADOR' | 'EN_REVISION' | 'ACTIVA' | 'PAUSADA' | 'COMPLETADA';
  
  // Métricas de Impacto
  impressions: number;
  clicks: number;
  leadsMql: number; // Marketing Qualified Leads
  leadsSql: number; // Sales Qualified Leads
  closedDeals: number; // Clientes adjudicados
  generatedRevenue: number; // Ingreso total / MRR anualizado adjudicado en CLP
  
  // Contenido & Personalización del Anuncio
  adTitle: string;
  adCopyText: string;
  callToAction: string;
  landingUrl: string;
  keyValueProp: string; // Propuesta de valor clave
  
  // Datos de Contacto y Responsable Comercial
  contactEmail?: string; // e.g. cristian.munoz0223@gmail.com
  contactPhone?: string; // e.g. +56 9 8765 4321
  contactPerson?: string; // e.g. Cristián Muñoz - Ejecutivo Comercial B2B

  userCreator: string;
  timestamp: number;
  isTest?: boolean;
}

// ==============================================================================
// FACTURACIÓN ELECTRÓNICA CHILENA (DTE) Y CUMPLIMIENTO D.L. 825 ART. 8° LETRA G
// ==============================================================================

export type DTEType = '33' | '34' | '39' | '41' | '61';

export type DTEExemptionReason = 
  | 'DL_825_ART_8_G_NO_AMOBLADO' 
  | 'DL_825_ART_8_G_SIN_INSTALACIONES' 
  | 'DL_825_ART_12_HABITACIONAL' 
  | 'AFECTO_AMOBLADO_ART_17' 
  | 'AFECTO_INSTALACIONES' 
  | 'NO_APLICA';

export interface DTEInvoiceLineItem {
  id: string;
  lineNumber: number;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isExempt: boolean;
  exemptionReason?: DTEExemptionReason;
  exemptionLegalCitation?: string;
  discountPercent?: number;
  exemptAmount: number;
  taxableAmount: number;
  totalAmount: number;
}

export interface DTEInvoice {
  id: string;
  folio: number;
  dteType: DTEType;
  dteTypeName: string; // ej: 'Factura No Afecta o Exenta Electrónica' o 'Factura Electrónica'
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  paymentMethod: 'CONTADO' | 'CREDITO_30' | 'CREDITO_60' | 'TRANSFERENCIA';
  
  // Emisor DTE
  issuerTaxId: string; // RUT
  issuerName: string;
  issuerBusiness: string; // Giro
  issuerAddress: string;
  issuerCommune: string;
  issuerCity: string;
  siiOffice: string; // ej: 'S.I.I. - SANTIAGO CENTRO'
  issuerPhone?: string;
  issuerEmail?: string;
  
  // Receptor / Arrendatario / Cliente
  receiverTaxId: string;
  receiverName: string;
  receiverBusiness: string;
  receiverAddress: string;
  receiverCommune: string;
  receiverCity: string;
  receiverEmail?: string;
  receiverPhone?: string;
  
  // Vínculo Inmobiliario & Análisis DL 825 Art. 8g
  propertyId?: string;
  propertyAddress?: string;
  propertyRole?: string; // Rol SII ej: 01420-0089
  contractId?: string;
  periodBilled?: string; // ej: 'Septiembre 2026'
  isFurnished: boolean; // Amoblado (determina gravamen Art. 8g)
  hasCommercialFacilities: boolean; // Instalaciones industriales/comerciales
  propertyDestination: 'HABITACIONAL' | 'OFICINA' | 'COMERCIAL' | 'BODEGA' | 'INDUSTRIAL';
  fiscalAppraisalValue?: number; // Avalúo fiscal vigente (para Art. 17 inc. 2)
  monthlyFiscalDeduction?: number; // Deducción 11% anual / 12 meses
  
  // Ítems y Totales
  items: DTEInvoiceLineItem[];
  subtotal: number;
  exemptTotal: number; // Monto Exento Art. 8 letra g
  netTaxableTotal: number; // Monto Neto Afecto
  fiscalDeductionApplied: number; // Deducción Art. 17 DL 825
  taxableBase: number; // Base Imponible sobre la cual se calcula IVA
  ivaRate: number; // 0.19
  ivaAmount: number; // IVA (19%)
  totalAmount: number; // Total a Pagar en CLP
  
  // Cumplimiento Legal y Timbres SII
  legalExemptionNote: string; // Glosa legal obligatoria
  siiTedSignature: string; // Firma digital del TED (CAF)
  status: 'EMITIDA' | 'ENVIADA_SII' | 'ACEPTADA_SII' | 'ANULADA';
  pdfUrl?: string;
  userCreator: string;
  timestamp: number;
  isSample?: boolean; // Para facturas de ejemplo y prueba
}

// ==============================================================================
// ASSETFLOW ENTERPRISE LOCALIZACIÓN CHILE (ARQUITECTURA 76H & SII)
// Documentación Oficial Corporativo E39564-01 & E12294-01
// ==============================================================================

export interface JdeChileUDCItem {
  code: string;
  description: string;
  specialHandlingCode?: string; // Código de Manejo Especial ERP
  hardcoded: boolean;
  isActive: boolean;
  siiMapping?: string;
  notes?: string;
}

export interface JdeChileUDCGroup {
  systemCode: string; // "76H"
  userDefinedCode: string; // "TO", "LT", "CC", "CR", "VA", "WH", "LE"
  title: string;
  description: string;
  items: JdeChileUDCItem[];
}

// F76H001: Configuración de Tipos de Documentos Legales de Chile
export interface F76H001Record {
  id: string;
  company: string; // Ej: "00001"
  legalDocType: string; // UDC 76H/LT (ej: "33", "34", "61", "52")
  legalDocGroup: string; // UDC 76H/TO (ej: "FAC", "FACEX", "NCF", "GUI")
  jdeDocType: string; // Tipo Doc Estándar ERP (ej: "RI", "RM", "PV", "PO", "WO")
  description: string;
  discriminateTaxes: boolean; // Discrimina IVA
  requiresCAF: boolean; // Requiere Código Autorización Folios SII
  issueMode: 'E' | 'M'; // UDC 76H/LE: Electrónico / Manual
  siiElectronicType: string;
}

// F76H002: Control de Folios Legales y Autorización CAF del SII
export interface F76H002Record {
  id: string;
  company: string;
  legalDocType: string; // UDC 76H/LT
  series: string; // Ej: "E1" o "SNT"
  rangeFrom: number;
  rangeTo: number;
  nextNumber: number; // Siguiente folio disponible
  cafAuthCode: string; // Código CAF entregado por SII
  cafExpirationDate: string; // Fecha vencimiento CAF
  active: boolean;
  userCreator: string;
  lastAssignedAt?: string;
}

// F76H401: Libro de Compras Legal de Chile (Chilean Purchase Ledger)
export interface F76H401PurchaseRecord {
  id: string;
  company: string;
  period: string; // YYYY-MM
  accountingDate: string;
  issueDate: string;
  supplierTaxId: string; // RUT Proveedor
  supplierName: string;
  legalDocType: string; // UDC 76H/LT (33, 34, 46, 61, etc.)
  legalDocTypeName: string;
  legalFolio: number;
  exemptAmount: number; // Monto Exento
  netTaxableAmount: number; // Monto Neto Afecto a IVA
  recoverableIvaAmount: number; // IVA Crédito Fiscal Recuperable
  commonUseIvaAmount: number; // IVA de Uso Común (Sujeto a Prorrata Art. 23 N° 3)
  nonRecoverableIvaAmount: number; // IVA No Recuperable (Gasto Rechazado o Inmuebles Exentos)
  totalAmount: number; // Monto Total en CLP
  retentionSecondCatAmount: number; // Retención 2da Categoría si aplica
  workOrderId?: string;
  jdeVoucherNumber?: string; // Número de Comprobante ERP F0411
  status: 'VIGENTE' | 'ANULADO';
  cancellationCode?: string; // UDC 76H/CC
}

// F76H402: Libro de Ventas Legal de Chile (Chilean Sales Ledger)
export interface F76H402SalesRecord {
  id: string;
  company: string;
  period: string; // YYYY-MM
  accountingDate: string;
  issueDate: string;
  customerTaxId: string; // RUT Cliente / Arrendatario
  customerName: string;
  legalDocType: string; // UDC 76H/LT (33, 34, 39, 41, 61, etc.)
  legalDocTypeName: string;
  legalFolio: number;
  exemptAmount: number; // Monto Exento (Arriendo No Amoblado DL 825 Art. 8g)
  netTaxableAmount: number; // Monto Neto Afecto
  fiscalDeductionApplied: number; // Deducción Avalúo Fiscal Art. 17 inc. 2
  taxableBase: number;
  ivaDebitAmount: number; // Débito Fiscal IVA 19%
  totalAmount: number;
  contractId?: string;
  propertyAddress?: string;
  jdeInvoiceNumber?: string; // Número de Factura ERP F03B11
  status: 'VIGENTE' | 'ANULADO';
  cancellationCode?: string; // UDC 76H/CC
}

// F76H403: Libro de Retenciones de Honorarios (Chilean Withholding Tax Ledger)
export interface F76H403WithholdingRecord {
  id: string;
  period: string; // YYYY-MM
  issueDate: string;
  beneficiaryTaxId: string; // RUT Profesional / Técnico
  beneficiaryName: string;
  boletaFolio: number;
  grossAmount: number; // Monto Bruto Honorarios
  retentionRatePercent: number; // Tasa según Ley 21.133 (ej: 14.5% o 15.25%)
  retentionAmount: number; // Monto Retenido a declarar en F29 Línea 150/151
  netPaidAmount: number; // Monto Líquido Pagado
  workOrderId?: string;
  expenseCategory: string; // Ej: "Mantenimiento Eléctrico", "Asesoría Legal"
  status: 'DECLARADO_F29' | 'PENDIENTE' | 'ANULADO';
}

// F76H801: Balance Tributario de 8 Columnas (Chilean Statutory 8-Column Balance)
export interface F76H801BalanceItem {
  accountNumber: string; // Cuenta Mayor ERP
  accountDescription: string;
  accountType: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'PERDIDA' | 'GANANCIA';
  debit: number; // Débitos acumulados
  credit: number; // Créditos acumulados
  debtorBalance: number; // Saldo Deudor
  creditorBalance: number; // Saldo Acreedor
  assetBalance: number; // Inventario Activo
  liabilityBalance: number; // Inventario Pasivo
  lossBalance: number; // Resultados Pérdida
  profitBalance: number; // Resultados Ganancia
}

// ============================================================================
// EXTRA ITEM APART: LOGÍSTICA & WAREHOUSE MANAGEMENT SYSTEM (WMS G41 / G46 / G49)
// Independiente del rubro inmobiliario (Supply Chain / Distribución / Bodegaje)
// ============================================================================

export type WmsUomType = 'UN' | 'CJ' | 'PLT' | 'KG' | 'LT' | 'MT' | 'KIT';
export type WmsAbcClass = 'A' | 'B' | 'C';
export type WmsZoneType = 'RECEIVING' | 'PUTAWAY_STORAGE' | 'PICKING' | 'PACKING' | 'DISPATCH_DOCK' | 'QUARANTINE';
export type WmsTaskType = 'PUTAWAY' | 'PICKING' | 'REPLENISHMENT' | 'CYCLE_COUNT' | 'TRANSFER';
export type WmsTaskStatus = 'SUGGESTED' | 'IN_PROGRESS' | 'CONFIRMED' | 'CANCELLED';
export type WmsDocType = 'OV' | 'IA' | 'IT' | 'SO' | 'PI';
export type WmsShipmentStatus = 'PLANIFICADO' | 'EN_PICKING' | 'EMPACADO' | 'EN_RUTA' | 'ENTREGADO' | 'INCIDENCIA';

// F4101 / F4102: Maestro de Artículos Logísticos & Branch/Plant
export interface WmsItemMaster {
  id: string;
  sku: string; // LITM - Código SKU
  description: string; // DSC1
  category: string; // SRP1 (Embalaje, Repuestos, EPPs, Insumos, Carga General, Electrónica)
  uom: WmsUomType; // UOM1
  abcClass: WmsAbcClass; // ABC Classification
  stockStatus: 'AVAILABLE' | 'QUARANTINE' | 'INSPECTION' | 'BLOCKED';
  minStock: number;
  reorderPoint: number;
  unitCost: number; // CLP
  weightKg: number;
  volumeM3: number;
  lotControl: boolean;
  defaultWarehouse: string; // MCU (ej: CD-SCL-01)
  preferredPutawayZone: WmsZoneType;
  barcode?: string;
  userCreator: string;
  createdAt: string;
  updatedAt: string;
}

// F4100 / F4602: Maestro de Bodegas & Ubicaciones / Bins
export interface WmsLocation {
  id: string;
  warehouseCode: string; // MCU
  warehouseName: string;
  locationCode: string; // LOCN (ej: A01-R01-N1)
  aisle: string;
  rack: string;
  level: string;
  zoneType: WmsZoneType;
  maxWeightKg: number;
  maxPallets: number;
  temperatureControl: 'AMBIENTE' | 'REFRIGERADO' | 'CONTROLADO';
  status: 'ACTIVE' | 'FULL' | 'HOLD';
}

// F41021 / F4108: Saldos por Ubicación, Lote y LPN (License Plate Number)
export interface WmsStockBalance {
  id: string;
  itemId: string;
  sku: string;
  itemDescription: string;
  warehouseCode: string; // MCU
  locationCode: string; // LOCN
  lotNumber: string; // LOTN
  lpn: string; // Pallet / Container ID
  expirationDate?: string;
  qtyOnHand: number; // PQOH
  qtyCommitted: number; // HCOM
  qtyInTransit: number; // QTRN
  lotStatus: 'APPROVED' | 'HOLD' | 'EXPIRED';
  lastMovementDate: string;
}

// F4600 / F4611: Órdenes y Tareas WMS (Putaway, Picking, Reposición, Conteo Cíclico)
export interface WmsWarehouseTask {
  id: string;
  taskNumber: string; // TSKID (ej: WT-4611-0001)
  taskType: WmsTaskType;
  priority: '1-CRÍTICA' | '2-ALTA' | '3-NORMAL';
  waveNumber?: string; // WAVE
  referenceOrder?: string; // DOCO (OC / OV / ASN / EMB)
  itemId: string;
  sku: string;
  itemDescription: string;
  lotNumber: string;
  lpn: string;
  qtyRequested: number;
  qtyConfirmed: number;
  uom: WmsUomType;
  fromWarehouse: string;
  fromLocation: string;
  toWarehouse: string;
  toLocation: string;
  assignedOperator: string;
  status: WmsTaskStatus;
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
  userCreator: string;
  hashSignature?: string;
}

// F4111: Cardex / Libro Mayor de Movimientos de Inventario (Inmutable)
export interface WmsMovementLedger {
  id: string;
  movementNumber: string; // DOC (KDX-4111-XXXX)
  docType: WmsDocType; // OV=Recepción, IA=Ajuste, IT=Transferencia, SO=Despacho, PI=Conteo Cíclico
  referenceDoc: string;
  itemId: string;
  sku: string;
  itemDescription: string;
  warehouseCode: string;
  locationCode: string;
  lotNumber: string;
  lpn: string;
  qtyDelta: number;
  unitCost: number;
  totalCost: number;
  previousStock: number;
  newStock: number;
  reasonCode: string;
  operator: string;
  timestamp: number;
  dateStr: string;
  hashSignature: string;
}

// F4201 / F4915: Órdenes de Despacho, Packing & Gestión de Transporte
export interface WmsShipmentLine {
  itemId: string;
  sku: string;
  description: string;
  qty: number;
  pickedQty: number;
  uom: WmsUomType;
  lotNumber: string;
  fromLocation: string;
}

export interface WmsShipmentOrder {
  id: string;
  shipmentNumber: string; // SHPN (EMB-4915-XXXX)
  orderType: 'OUTBOUND_DESPACHO' | 'INTER_WAREHOUSE' | 'INBOUND_ASN';
  customerOrSupplier: string;
  destinationAddress: string;
  city: string;
  carrierName: string;
  vehiclePlate: string;
  driverName: string;
  driverRut: string;
  warehouseCode: string;
  waveNumber: string;
  lines: WmsShipmentLine[];
  totalPackages: number;
  totalWeightKg: number;
  guideNumber?: string; // Guía de Despacho DTE 52
  scheduledDate: string;
  status: WmsShipmentStatus;
  notes?: string;
  userCreator: string;
  createdAt: string;
  deliveredAt?: string;
}

export interface WmsWorkspaceState {
  items: WmsItemMaster[];
  locations: WmsLocation[];
  balances: WmsStockBalance[];
  tasks: WmsWarehouseTask[];
  movements: WmsMovementLedger[];
  shipments: WmsShipmentOrder[];
  updatedAt: number;
}
