
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { ModuleType, Supplier, AuditEntry, USER_CREDENTIALS, Transaction, UserAccount, parseFullName, WorkOrder, Property, Contract, OfficialDocument, DueDiligenceReport, MaintenanceExpediente, Solicitud, PropertyImportDraft, INCOME_CATEGORIES, EXPENSE_CATEGORIES, Appraisal, Applicant, ReversalRequest, PropertyInspection, TaxDeclaration } from './types';
import { storage } from './lib/storageEngine';
import {
  prepareRecordForFirestore,
  hydrateRecordFromFirestore,
  isQuotaError,
  isFirestoreQuotaExceeded,
  markFirestoreQuotaExceeded,
  registerFirestoreUnsubscribers
} from './lib/storage';
import { hydrateSupplierRelationalTables, syncSupplierRelationalTablesToDatabase } from './lib/supplierMasterDatabase';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, writeBatch, doc, setDoc, onSnapshot, query, orderBy, limit, getDocFromServer } from 'firebase/firestore';
import { auth, isConfigValid } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User as FirebaseUser, signOut, signInAnonymously } from 'firebase/auth';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider, useNotification } from './components/NotificationProvider';
const UserSessionModal = lazy(() => import('./components/UserSessionModal'));

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  if (isQuotaError(error)) {
    markFirestoreQuotaExceeded();
    return;
  }
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('the client is offline') || msg.includes('Failed to get document because the client is offline')) {
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: msg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.warn('[Firestore Notice]', JSON.stringify(errInfo));
};

// Resilient lazy-load helper with retry logic for network drops or dev server restarts
const safeLazy = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | { [key: string]: any }>,
  namedExport?: string
) => {
  return lazy(async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const mod = await factory();
        if (namedExport && mod[namedExport]) {
          return { default: mod[namedExport] };
        }
        return mod as { default: T };
      } catch (err: any) {
        if (attempt === 3) throw err;
        await new Promise(r => setTimeout(r, attempt * 250));
      }
    }
    return factory() as Promise<{ default: T }>;
  });
};

// Lazy load modules for better initial performance
const Dashboard = lazy(() => import('./components/Dashboard'));
const SpreadsheetSheet = lazy(() => import('./components/SpreadsheetSheet'));
const TaskCenter = lazy(() => import('./components/TaskCenter'));
const TaskAssistantIAModule = lazy(() => import('./components/TaskAssistantIAModule').then(m => ({ default: m.TaskAssistantIAModule })));
const WorkOrderCenter = lazy(() => import('./components/WorkOrderCenter'));
const WorkOrderReception = lazy(() => import('./components/WorkOrderReception'));
const PropertyPoolSheet = lazy(() => import('./components/PropertyPoolSheet'));
const OfficialDocumentsCenter = lazy(() => import('./components/OfficialDocumentsCenter'));
const SupplierDirectory = lazy(() => import('./components/SupplierDirectory'));
const HelpDeskCenter = lazy(() => import('./components/HelpDeskCenter'));
const SecuritySheet = lazy(() => import('./components/SecuritySheet'));
const AuditLog = lazy(() => import('./components/AuditLog'));
const DevelopmentLog = lazy(() => import('./components/DevelopmentLog'));
const TechnicalReviewReport = lazy(() => import('./components/TechnicalReviewReport'));
const DocumentDetailModal = lazy(() => import('./components/DocumentDetailModal'));
const ManualModal = lazy(() => import('./components/ManualModal'));
const LogicAuditReport = lazy(() => import('./components/LogicAuditReport'));
const LeaseContractModule = lazy(() => import('./components/LeaseContractModule'));
const B13ReportModule = lazy(() => import('./components/B13ReportModule'));
const B4ReportModule = lazy(() => import('./components/B4ReportModule'));
const Note14ReportModule = lazy(() => import('./components/Note14ReportModule'));
const AccountingReconciliationModule = lazy(() => import('./components/AccountingReconciliationModule'));
const PettyCashModule = lazy(() => import('./components/PettyCashModule'));
const TaxComplianceModule = lazy(() => import('./components/TaxComplianceModule'));
const DueDiligenceModule = lazy(() => import('./components/DueDiligenceModule'));
const DueDiligenceConsultation = lazy(() => import('./components/DueDiligenceConsultation'));
const ChartOfAccountsModule = lazy(() => import('./components/ChartOfAccountsModule'));
const SecurityDepositModule = lazy(() => import('./components/SecurityDepositModule'));
const SystemHealthDashboard = lazy(() => import('./components/SystemHealthDashboard'));
const PropertyInsuranceModule = lazy(() => import('./components/PropertyInsuranceModule'));
const MaintenanceModule = lazy(() => import('./components/MaintenanceModule'));
const SolicitudesModule = safeLazy(() => import('./components/SolicitudesModule'));
const UAFComplianceModule = lazy(() => import('./components/UAFComplianceModule'));
const TransactionForm = lazy(() => import('./components/TransactionForm'));
const DeveloperConsole = lazy(() => import('./components/DeveloperConsole'));
const AppraisalModule = lazy(() => import('./components/AppraisalModule'));
const DigitalVault = lazy(() => import('./components/DigitalVault'));
const ApplicantEvaluationModule = lazy(() => import('./components/ApplicantEvaluationModule'));
const ReportReviewModule = lazy(() => import('./components/ReportReviewModule'));
const BrochureModule = lazy(() => import('./components/BrochureModule'));
const JDEControllingModule = lazy(() => import('./components/JDEControllingModule').then(m => ({ default: m.JDEControllingModule })));
const ClassicJDELedger = lazy(() => import('./components/ClassicJDELedger').then(m => ({ default: m.ClassicJDELedger })));
const TransactionalAuditCenter = lazy(() => import('./components/TransactionalAuditCenter').then(m => ({ default: m.TransactionalAuditCenter })));
const WeeklyPaymentReviewModule = lazy(() => import('./components/WeeklyPaymentReviewModule').then(m => ({ default: m.WeeklyPaymentReviewModule })));
const MonthlyExpenseReportModule = lazy(() => import('./components/MonthlyExpenseReportModule').then(m => ({ default: m.MonthlyExpenseReportModule })));
const ProjectAssessmentReport = lazy(() => import('./components/ProjectAssessmentReport'));
const CurriculumVitae = lazy(() => import('./components/CurriculumVitae'));
const JobSearchModule = lazy(() => import('./components/JobSearchModule').then(m => ({ default: m.JobSearchModule })));
const CertificadosDominioModule = lazy(() => import('./components/CertificadosDominioModule').then(m => ({ default: m.CertificadosDominioModule })));
const PersonalDataMapModule = lazy(() => import('./components/PersonalDataMapModule').then(m => ({ default: m.PersonalDataMapModule })));
const CashFlowRunwayModule = lazy(() => import('./components/CashFlowRunwayModule').then(m => ({ default: m.CashFlowRunwayModule })));
const AuxiliaryLedgersModule = lazy(() => import('./components/AuxiliaryLedgersModule').then(m => ({ default: m.AuxiliaryLedgersModule })));
const BenfordAnalysisModule = lazy(() => import('./components/BenfordAnalysisModule').then(m => ({ default: m.BenfordAnalysisModule })));
const PropertyInspectionModule = lazy(() => import('./components/PropertyInspectionModule'));
const CicloVidaModule = lazy(() => import('./components/CicloVidaModule'));
const TenantPaymentHistoryModule = lazy(() => import('./components/TenantPaymentHistoryModule').then(m => ({ default: m.TenantPaymentHistoryModule })));
const PaymentRegistrationModule = lazy(() => import('./components/PaymentRegistrationModule').then(m => ({ default: m.PaymentRegistrationModule })));
const TenantPortal = lazy(() => import('./components/TenantPortal'));
const TenantVerificationForm = lazy(() => import('./components/TenantVerificationForm'));
const MarketingCampaignsModule = lazy(() => import('./components/MarketingCampaignsModule').then(m => ({ default: m.MarketingCampaignsModule })));
const SystemLaunchModule = lazy(() => import('./components/SystemLaunchModule').then(m => ({ default: m.SystemLaunchModule })));
const SystemLandingPageModule = lazy(() => import('./components/SystemLandingPageModule').then(m => ({ default: m.SystemLandingPageModule })));
const FacturacionDTEModule = lazy(() => import('./components/FacturacionDTEModule').then(m => ({ default: m.FacturacionDTEModule })));
const ApprovalRoutesModule = lazy(() => import('./components/ApprovalRoutesModule').then(m => ({ default: m.ApprovalRoutesModule })));
const JDEP4310OrderEntryModal = lazy(() => import('./components/JDEP4310OrderEntryModal').then(m => ({ default: m.JDEP4310OrderEntryModal })));
const JDERecentReportsModal = lazy(() => import('./components/JDERecentReportsModal').then(m => ({ default: m.JDERecentReportsModal })));
const JDEInquiryModule = lazy(() => import('./components/JDEInquiryModule').then(m => ({ default: m.JDEInquiryModule })));
const JDEAccountingModule = lazy(() => import('./components/JDEAccountingModule').then(m => ({ default: m.JDEAccountingModule })));
const JDEOrderApprovalModule = lazy(() => import('./components/JDEOrderApprovalModule').then(m => ({ default: m.JDEOrderApprovalModule })));
const SupplierForm = lazy(() => import('./components/SupplierForm'));
const EmailCenter = lazy(() => import('./components/EmailCenter'));
const LogisticsWmsModule = lazy(() => import('./components/LogisticsWmsModule'));

import { dataService, EntityType } from './lib/data-service';
import { createInitialWmsWorkspace } from './lib/wmsService';
import { ITTicket, B13Report, B4Report, Note14Report, AccountingReconciliation, PettyCash, PettyCashExpense, LeaseContract, SecurityDeposit, ReportTemplate, ReportReview, WmsWorkspaceState } from './types';
// Fix: Added ChevronRight to imports from lucide-react
import { 
  Wallet, LogOut, RefreshCw, Hammer, Mail, ShieldCheck, CloudCheck, Loader2, FileText, Layout, Cloud, Wifi, WifiOff, Users, PlusCircle, Link, Info, X, ChevronRight, Building2, LifeBuoy, Settings, History, BookOpen, Database, FileSpreadsheet, Calculator, Download, Printer, AlertTriangle, SlidersHorizontal
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { JDEFormContainer, JDE_FORM_REGISTRY } from './components/JDEFormContainer';
import { DEFAULT_ASSETFLOW_SVG, getSvgAsPngBase64 } from './lib/defaultLogo';
import { getUserEffectiveAllowedModules } from './lib/modulePermissions';
import { buildAuditEntry, formatAuditActionNarrative } from './lib/auditService';
import { 
  emitTransactionVoucher, 
  emitWorkOrderVoucher, 
  emitRentPaymentVoucher, 
  emitClaimVoucher, 
  emitPettyCashVoucher, 
  emitSecurityDepositVoucher, 
  emitReconciliationVoucher 
} from './lib/voucherService';

const RESTORED_DUE_DILIGENCE_REPORTS: DueDiligenceReport[] = [
  {
    id: 'DD-001',
    supplierId: 'sup-1',
    supplierName: 'CONSTRUCTORA SAN JOSÉ S.A.',
    supplierTaxId: '76.124.580-K',
    date: '2026-05-10',
    riskLevel: 'RIESGO BAJO',
    analyst: 'ANALOGÍA COMPLIANCE ERP',
    summary: 'La evaluación arrojó un perfil de cumplimiento robusto sin hallazgos de listas de sanción ni deudas fiscales relevantes.',
    backgroundCheck: 'Se revisó boletín comercial, antecedentes tributarios SII y consultas de personería jurídica en CBR. Todo se encuentra vigente y regularizado.',
    financialAnalysis: 'Solvencia confirmada con ratios adecuados de endeudamiento y capital de trabajo positivo. Capacidad para ejecutar obras civiles media-alta.',
    legalStatus: 'Sociedad anónima regularizada inscrita en el Conservador de Bienes Raíces. Poderes otorgados en regla.',
    reputationCheck: 'Referencias comerciales positivas de 4 grandes inmobiliarias nacionales sin denuncias de subcontratación.',
    findings: ['Discrepancia leve en glosa de dirección comercial de sucursales.', 'No presenta deudas previsionales vigentes (F30-1 al 100%) ni juicios laborales pendientes.'],
    recommendations: 'Aprobar para participar en licitaciones de mantenimiento y obras menores de unidades inmobiliarias.',
    status: 'FINALIZADO',
    attachments: [],
    timestamp: Date.now() - 3600000 * 24 * 12
  },
  {
    id: 'DD-002',
    supplierId: 'sup-2',
    supplierName: 'SERVICIOS INTEGRALES AMBIENTALES LTDA',
    supplierTaxId: '77.925.430-6',
    date: '2026-05-18',
    riskLevel: 'RIESGO MEDIO',
    analyst: 'AUDITORÍA LOG CORPO',
    summary: 'Presenta una multa tributaria menor liquidada en 2025 y un juicio civil cerrado sin impacto patrimonial.',
    backgroundCheck: 'Antecedentes en ChileCompra indican comportamiento de calidad regular. Se registraron dos reclamos administrativos cerrados por deudas menores.',
    financialAnalysis: 'Liquidez ajustada para la escala comercial, pero respaldada por sus socios fundadores.',
    legalStatus: 'Vigencia mercantil impecable. Representación legal vigente y poderes en orden.',
    reputationCheck: 'Ausencia en Listas OFAC, ONU o de la Unidad de Análisis Financiero (Lista Negra UAF).',
    findings: ['Multa tributaria menor ya cerrada en la Tesorería General de la República.', 'Ratio de deuda de corto plazo levemente elevado para el rubro.'],
    recommendations: 'Aprobar con monitoreo trimestral de deudas previsionales dadas las condiciones de liquidez.',
    status: 'FINALIZADO',
    attachments: [],
    timestamp: Date.now() - 3600000 * 24 * 8
  },
  {
    id: 'DD-003',
    supplierId: 'sup-3',
    supplierName: 'INMOBILIARIA Y MANTENCIONES VALPARAÍSO SPA',
    supplierTaxId: '76.882.110-4',
    date: '2026-06-02',
    riskLevel: 'RIESGO BAJO',
    analyst: 'CRISTIAN MUÑOZ - S&OP / CONTROL INTERNO',
    summary: 'Informe de debida diligencia totalmente favorable para contratos de mantención preventiva y correctiva de infraestructura.',
    backgroundCheck: 'Verificación completa de estatutos en Diario Legal y Conservador de Bienes Raíces.',
    financialAnalysis: 'Flujo de caja operacional positivo con bajo nivel de apalancamiento financiero.',
    legalStatus: 'SpA en regla, sin litigios comerciales ni demandas laborales pendientes en Juzgados del Trabajo.',
    reputationCheck: 'Evaluación UAF sin alertas ni Reportes de Operaciones Sospechosas (ROS).',
    findings: ['Estructura societaria transparente', 'Políticas internas de prevención de delitos Ley 20.393 e integridad implementadas.'],
    recommendations: 'Aprobación total para adjudicación de contratos marco de servicios generales.',
    status: 'FINALIZADO',
    attachments: [],
    timestamp: Date.now() - 3600000 * 24 * 5
  },
  {
    id: 'DD-004',
    supplierId: 'sup-4',
    supplierName: 'ELEVADORES & ASCENSORES SCHLOSS SPA',
    supplierTaxId: '76.491.220-3',
    date: '2026-06-15',
    riskLevel: 'RIESGO ALTO',
    analyst: 'ENCARGADO DE CUMPLIMIENTO UAF',
    summary: 'Se detectaron boletines comerciales morosos por $18.500.000 y 2 demandas de subcontratación laboral activas.',
    backgroundCheck: 'Múltiples protestos de cheques en el sistema financiero durante los últimos 6 meses.',
    financialAnalysis: 'Liquidez comprometida y capital de trabajo negativo. Alto riesgo de discontinuidad en la prestación del servicio.',
    legalStatus: 'Litigio laboral pendiente con extrabajadores en Juzgado del Trabajo de Santiago.',
    reputationCheck: 'Sin marcas en OFAC/ONU, pero con alerta de alto riesgo financiero en Equifax/DICOM.',
    findings: ['Deuda previsional vencida en Previred', 'Infracción laboral de la Inspección del Trabajo activa', 'Protestos vigentes en boletín comercial'],
    recommendations: 'SUSPENDER asignación de nuevas Órdenes de Trabajo hasta la acreditación de pago de deudas previsionales y regularización en Previred.',
    status: 'FINALIZADO',
    attachments: [],
    timestamp: Date.now() - 3600000 * 24 * 3
  },
  {
    id: 'DD-005',
    supplierId: 'sup-5',
    supplierName: 'CLIMATIZACIÓN Y SEGURIDAD CENTRAL LTDA',
    supplierTaxId: '77.104.990-2',
    date: '2026-06-20',
    riskLevel: 'RIESGO MEDIO',
    analyst: 'SILVIA TOBAR - COMPLIANCE',
    summary: 'Empresa apta para mantención de sistemas HVAC pero requiere boleta de garantía por fiel cumplimiento de contrato.',
    backgroundCheck: '5 años de antigüedad en el mercado sin observaciones de personería jurídica.',
    financialAnalysis: 'Solvencia razonable, margen operativo adecuado con nivel de deuda aceptable.',
    legalStatus: 'Constitución sin observaciones. Representante legal sin inhabilidades bajo Ley 21.595 de Delitos Económicos.',
    reputationCheck: 'Verificación negativa en listas de PEPs y sanciones administrativas de la CMF.',
    findings: ['Falta actualización del Certificado de Afiliación Mutual de Seguridad', 'Póliza de Responsabilidad Civil por vencer en 30 días'],
    recommendations: 'Solicitar renovación inmediata de Póliza de Responsabilidad Civil de daño a terceros antes de firmar contrato.',
    status: 'FINALIZADO',
    attachments: [],
    timestamp: Date.now() - 3600000 * 24 * 2
  },
  {
    id: 'DD-006',
    supplierId: 'sup-6',
    supplierName: 'SEGURIDAD PRIVADA Y VIGILANCIA ASSET SPA',
    supplierTaxId: '76.991.330-1',
    date: '2026-07-01',
    riskLevel: 'RIESGO BAJO',
    analyst: 'CRISTIAN MUÑOZ - S&OP / CONTROL',
    summary: 'Acreditación OS-10 de Carabineros de Chile vigente para todo el personal de guardias y conserjes.',
    backgroundCheck: 'Certificaciones de seguridad privada en regla emitidas por la Prefectura OS-10 de Carabineros.',
    financialAnalysis: 'Estados financieros auditados con solvencia comprobada y respaldo patrimonio neto.',
    legalStatus: 'SpA inscrita correctamente con poderes notariales vigentes.',
    reputationCheck: 'Sin hallazgos de lavado de activos (LA/FT) ni sanciones administrativas de la UAF.',
    findings: ['Certificación OS-10 al 100% al día', 'Seguros de vida y accidentes personales contratados para todo el personal de vigilantes'],
    recommendations: 'Proveedor recomendado con máxima calificación para edificios corporativos y residenciales.',
    status: 'FINALIZADO',
    attachments: [],
    timestamp: Date.now() - 3600000 * 24 * 1
  }
];

const INITIAL_AUDIT_LOGS: AuditEntry[] = [
  {
    id: 'log-101',
    timestamp: Date.now() - 3600000 * 1,
    user: 'samaheim@gmail.com',
    action: 'LOGIN',
    entityType: 'SISTEMA',
    entityId: 'SYS-AUTH-001',
    entityName: 'Sesión Iniciada por Administrador Principal',
    newValue: 'Acceso autenticado con perfil de Control Interno'
  },
  {
    id: 'log-102',
    timestamp: Date.now() - 3600000 * 3,
    user: 'finanzas@empresa.cl',
    action: 'UPDATE',
    entityType: 'TRANSACCION',
    entityId: 'TX-2026-0812',
    entityName: 'Factura Mantención Clima Central',
    fieldChanged: 'MONTO_TOTAL',
    oldValue: '$450.000',
    newValue: '$520.000'
  },
  {
    id: 'log-103',
    timestamp: Date.now() - 3600000 * 8,
    user: 'admin@empresa.cl',
    action: 'DELETE',
    entityType: 'ORDEN_TRABAJO',
    entityId: 'OT-2026-004',
    entityName: 'Reparación Techumbre Depto 401',
    oldValue: 'Borrador de orden duplicada sin aprobación de presupuesto'
  },
  {
    id: 'log-104',
    timestamp: Date.now() - 3600000 * 14,
    user: 'operaciones@empresa.cl',
    action: 'CREATE',
    entityType: 'PROVEEDOR',
    entityId: 'PROV-7712',
    entityName: 'Servicios Integrales Clima SpA',
    newValue: 'Proveedor creado en Registro Principal con RUT 76.543.210-K'
  },
  {
    id: 'log-105',
    timestamp: Date.now() - 3600000 * 22,
    user: 'comercial@empresa.cl',
    action: 'CREATE',
    entityType: 'CONTRATO',
    entityId: 'CON-2026-881',
    entityName: 'Contrato Arriendo Depto 401 - Edificio Vista Hermosa',
    newValue: 'Contrato registrado por $750.000 (Arrendatario: Carlos Mendoza)'
  },
  {
    id: 'log-106',
    timestamp: Date.now() - 3600000 * 30,
    user: 'finanzas@empresa.cl',
    action: 'UPDATE',
    entityType: 'PROVEEDOR',
    entityId: 'PROV-3310',
    entityName: 'Pinturas & Remodelaciones del Sur',
    fieldChanged: 'CUENTA_BANCARIA',
    oldValue: 'Banco de Chile N° 00-12345-01',
    newValue: 'Banco BCI N° 99-87654-02'
  },
  {
    id: 'log-107',
    timestamp: Date.now() - 3600000 * 48,
    user: 'SISTEMA',
    action: 'REBUILD',
    entityType: 'SISTEMA',
    entityId: 'SYS-REBUILD-01',
    entityName: 'Verificación de Integridad y Reconstrucción de Índices',
    newValue: 'Consistencia de datos validada correctamente'
  },
  {
    id: 'log-108',
    timestamp: Date.now() - 3600000 * 64,
    user: 'legal@empresa.cl',
    action: 'CREATE',
    entityType: 'OFICIO',
    entityId: 'OF-2026-019',
    entityName: 'Notificación Cobranza Morosa Depto 905',
    newValue: 'Documento legal enviado a despacho'
  },
  {
    id: 'log-109',
    timestamp: Date.now() - 3600000 * 80,
    user: 'caja@empresa.cl',
    action: 'CREATE',
    entityType: 'TRANSACCION',
    entityId: 'PETTY-091',
    entityName: 'Gasto Caja Chica: Compra Insumos de Oficina',
    newValue: 'Comprobante registrado por $45.000'
  },
  {
    id: 'log-110',
    timestamp: Date.now() - 3600000 * 96,
    user: 'operaciones@empresa.cl',
    action: 'UPDATE',
    entityType: 'PROPIEDAD',
    entityId: 'prop-test-2',
    entityName: 'Condominio Los Robles - Depto 102',
    fieldChanged: 'ESTADO_DISPONIBILIDAD',
    oldValue: 'DISPONIBLE',
    newValue: 'ARRENDADA'
  }
];

const App: React.FC = () => {
  // JDE JAS FastBoot Kernel: Instant UI paint (Tier-0) while IndexedDB & CallObject kernels hydrate in background
  const [dbStatus, setDbStatus] = useState<'LOADING' | 'READY'>('READY');
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const portal = params.get('portal')?.toLowerCase();
      const modulo = (params.get('modulo') || params.get('module') || params.get('p') || params.get('mode') || '').toLowerCase();
      if (
        portal === 'cliente' || portal === 'demo' ||
        modulo === 'cliente' || modulo === 'demo' ||
        params.has('cliente') || params.has('demo')
      ) {
        const demoUser = 'CLIENTE DEMO';
        sessionStorage.setItem('active_user', demoUser);
        return demoUser;
      }
      if (
        portal === 'empleo' || portal === 'job' || 
        modulo === 'empleo' || modulo === 'busqueda_empleo' || modulo === 'p09owjob' || 
        params.has('empleo') || params.has('job')
      ) {
        const jobUser = 'JUAN ANDRÉS PIÑA';
        sessionStorage.setItem('active_user', jobUser);
        return jobUser;
      }
      const savedUser = sessionStorage.getItem('active_user');
      if (savedUser) {
        return savedUser;
      }
      return null;
    }
    return null;
  });
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [qrAccessParams, setQrAccessParams] = useState<{
    portal: string;
    token: string;
    taxId: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portal = params.get('portal')?.toLowerCase();
    const token = params.get('token');
    const taxId = params.get('taxId');
    const mode = params.get('mode')?.toLowerCase();
    const modulo = (params.get('modulo') || params.get('module') || params.get('p') || '').toLowerCase();

    if (portal === 'tenant' && token) {
      setQrAccessParams({ portal, token, taxId: taxId || '' });
    } else if (
      portal === 'cliente' || portal === 'demo' ||
      mode === 'cliente' || mode === 'demo' ||
      modulo === 'cliente' || modulo === 'demo' ||
      params.has('cliente') || params.has('demo')
    ) {
      const demoUser = 'CLIENTE DEMO';
      sessionStorage.setItem('active_user', demoUser);
      setCurrentUser(demoUser);
      const vista = (params.get('vista') || '').toLowerCase();
      if (vista === 'wms' || vista === 'logistica') {
        setActiveModule('LOGISTICA_WMS');
      } else if (vista === 'dashboard' || vista === 'panel') {
        setActiveModule('DASHBOARD');
      } else if (vista === 'propiedades' || vista === 'activos') {
        setActiveModule('PROPIEDADES');
      } else if (vista === 'contratos') {
        setActiveModule('CONTRATOS_ARRIENDO');
      } else if (vista === 'ordenes' || vista === 'ot') {
        setActiveModule('ORDENES');
      } else if (vista === 'brochure') {
        setActiveModule('BROCHURE');
      } else {
        setActiveModule('SYSTEM_LANDING');
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else if (
      portal === 'empleo' || portal === 'job' || 
      mode === 'empleo' || modulo === 'empleo' || 
      modulo === 'busqueda_empleo' || modulo === 'p09owjob' || 
      params.has('empleo') || params.has('job')
    ) {
      const currentStored = sessionStorage.getItem('active_user');
      if (!currentStored || currentStored.includes('PIÑA') || currentStored.includes('PINA')) {
        const jobUser = 'JUAN ANDRÉS PIÑA';
        sessionStorage.setItem('active_user', jobUser);
        setCurrentUser(jobUser);
      }
      setActiveModule('BUSQUEDA_EMPLEO');
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const checkAndSetLogo = async (logoToUse: string | null) => {
    if (logoToUse && logoToUse.startsWith('data:')) {
      setCompanyLogo(logoToUse);
    } else {
      const fallback = await getSvgAsPngBase64(DEFAULT_ASSETFLOW_SVG);
      setCompanyLogo(fallback);
      // Also update IndexedDB
      await storage.save('settings_logo', fallback);
    }
  };
  const [lastSaveStatus, setLastSaveStatus] = useState<'OK' | 'BUSY'>('OK');
  const [isConsistencyReportOpen, setIsConsistencyReportOpen] = useState(false);
  const [isLogicAuditOpen, setIsLogicAuditOpen] = useState(false);
  const [isRecentReportsOpen, setIsRecentReportsOpen] = useState(false);

  // Global listener to open Recent Reports modal (WSJ - P986110B) from any module
  useEffect(() => {
    const handleOpenReports = () => setIsRecentReportsOpen(true);
    window.addEventListener('jde:open-recent-reports', handleOpenReports);
    return () => window.removeEventListener('jde:open-recent-reports', handleOpenReports);
  }, []);
  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<Transaction | null>(null);
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showSyncOptions, setShowSyncOptions] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const hydrationComplete = useRef(false);
  const hasCheckedCoherence = useRef(false);
  const lastPersistedStateRef = useRef<Record<string, any>>({});

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [officialDocs, setOfficialDocs] = useState<OfficialDocument[]>([]);
  const [tickets, setTickets] = useState<ITTicket[]>([]);
  const [b13Reports, setB13Reports] = useState<B13Report[]>([]);
  const [b4Reports, setB4Reports] = useState<B4Report[]>([]);
  const [note14Reports, setNote14Reports] = useState<Note14Report[]>([]);
  const [accountingReconciliations, setAccountingReconciliations] = useState<AccountingReconciliation[]>([]);
  const [pettyCashFunds, setPettyCashFunds] = useState<PettyCash[]>([]);
  const [pettyCashExpenses, setPettyCashExpenses] = useState<PettyCashExpense[]>([]);
  const [taxDeclarations, setTaxDeclarations] = useState<TaxDeclaration[]>([]);
  const [dueDiligenceReports, setDueDiligenceReports] = useState<DueDiligenceReport[]>([]);
  const [leaseContracts, setLeaseContracts] = useState<LeaseContract[]>([]);
  const [maintenanceExpedientes, setMaintenanceExpedientes] = useState<MaintenanceExpediente[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [isP4310GlobalModalOpen, setIsP4310GlobalModalOpen] = useState(false);
  const [securityDeposits, setSecurityDeposits] = useState<SecurityDeposit[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [reportReviews, setReportReviews] = useState<ReportReview[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [reversalRequests, setReversalRequests] = useState<ReversalRequest[]>([]);
  const [propertyInspections, setPropertyInspections] = useState<PropertyInspection[]>([]);
  const [wmsWorkspace, setWmsWorkspace] = useState<WmsWorkspaceState>(() => createInitialWmsWorkspace('SISTEMA'));
  const [credentials, setCredentials] = useState<Record<string, UserAccount>>(() => {
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem('assetflow_deleted_users') || '[]');
      const initial = { ...USER_CREDENTIALS };
      deletedList
        .filter(u => !u.includes('PIÑA') && !u.includes('PINA') && u !== 'CRISTIAN MUÑOZ R.' && u !== 'DEVELOPER' && u !== 'CLIENTE DEMO')
        .forEach(u => delete initial[u]);
      return initial;
    } catch {
      return USER_CREDENTIALS;
    }
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const nextVal = !prev;
      localStorage.setItem('sidebar_collapsed', String(nextVal));
      return nextVal;
    });
  };

  const [dataShowMode, setDataShowMode] = useState<'ALL' | 'REAL_ONLY' | 'TEST_ONLY'>('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const filteredPropertyInspections = React.useMemo(() => {
    return propertyInspections.filter(i => {
      if (dataShowMode === 'REAL_ONLY') return !i.isTest;
      if (dataShowMode === 'TEST_ONLY') return !!i.isTest;
      return true;
    });
  }, [propertyInspections, dataShowMode]);

  // Filter core datasets based on dataShowMode (distinguishing test data from real user data)
  const filteredProperties = React.useMemo(() => {
    return properties.filter(p => {
      if (dataShowMode === 'REAL_ONLY') return !p.isTest;
      if (dataShowMode === 'TEST_ONLY') return !!p.isTest;
      return true;
    });
  }, [properties, dataShowMode]);

  const filteredSuppliers = React.useMemo(() => {
    return suppliers.filter(s => {
      if (dataShowMode === 'REAL_ONLY') return !s.isTest;
      if (dataShowMode === 'TEST_ONLY') return !!s.isTest;
      return true;
    });
  }, [suppliers, dataShowMode]);

  const filteredWorkOrders = React.useMemo(() => {
    return workOrders.filter(w => {
      if (dataShowMode === 'REAL_ONLY') return !w.isTest;
      if (dataShowMode === 'TEST_ONLY') return !!w.isTest;
      return true;
    });
  }, [workOrders, dataShowMode]);

  const filteredSolicitudes = React.useMemo(() => {
    return solicitudes.filter(s => {
      if (dataShowMode === 'REAL_ONLY') return !s.isTest;
      if (dataShowMode === 'TEST_ONLY') return !!s.isTest;
      return true;
    });
  }, [solicitudes, dataShowMode]);

  const filteredLeaseContracts = React.useMemo(() => {
    return leaseContracts.filter(c => {
      if (dataShowMode === 'REAL_ONLY') return !c.isTest;
      if (dataShowMode === 'TEST_ONLY') return !!c.isTest;
      return true;
    });
  }, [leaseContracts, dataShowMode]);

  const filteredApplicants = React.useMemo(() => {
    return applicants.filter(a => {
      if (dataShowMode === 'REAL_ONLY') return !a.isTest;
      if (dataShowMode === 'TEST_ONLY') return !!a.isTest;
      return true;
    });
  }, [applicants, dataShowMode]);

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      if (dataShowMode === 'REAL_ONLY') return !t.isTest;
      if (dataShowMode === 'TEST_ONLY') return !!t.isTest;
      return true;
    });
  }, [transactions, dataShowMode]);

  const filteredSecurityDeposits = React.useMemo(() => {
    return securityDeposits.filter(d => {
      const isDemo = d.id.startsWith('sd-demo-');
      if (dataShowMode === 'REAL_ONLY') return !isDemo;
      if (dataShowMode === 'TEST_ONLY') return isDemo;
      return true;
    });
  }, [securityDeposits, dataShowMode]);

  const [activeModule, setActiveModule] = useState<ModuleType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const portal = (params.get('portal') || '').toLowerCase();
      const modulo = (params.get('modulo') || params.get('module') || params.get('p') || params.get('mode') || '').toLowerCase();
      const vista = (params.get('vista') || '').toLowerCase();
      if (
        portal === 'cliente' || portal === 'demo' ||
        modulo === 'cliente' || modulo === 'demo' ||
        params.has('cliente') || params.has('demo')
      ) {
        if (vista === 'wms' || vista === 'logistica') return 'LOGISTICA_WMS';
        if (vista === 'dashboard' || vista === 'panel') return 'DASHBOARD';
        if (vista === 'propiedades' || vista === 'activos') return 'PROPIEDADES';
        if (vista === 'contratos') return 'CONTRATOS_ARRIENDO';
        if (vista === 'ordenes' || vista === 'ot') return 'ORDENES';
        if (vista === 'brochure') return 'BROCHURE';
        return 'SYSTEM_LANDING';
      }
      if (
        portal === 'empleo' || portal === 'job' || 
        modulo === 'empleo' || modulo === 'busqueda_empleo' || modulo === 'p09owjob' || 
        params.has('empleo') || params.has('job')
      ) {
        return 'BUSQUEDA_EMPLEO';
      }
      const savedUser = sessionStorage.getItem('active_user');
      if (savedUser === 'CLIENTE DEMO') {
        return 'SYSTEM_LANDING';
      }
      if (savedUser && (savedUser.includes('PIÑA') || savedUser.includes('PINA'))) {
        return 'BUSQUEDA_EMPLEO';
      }
    }
    return 'DASHBOARD';
  });

  // JDE EnterpriseOne Multi-Form MDI Tab Manager
  const [openTabs, setOpenTabs] = useState<Array<{ id: ModuleType; code: string; title: string; formCode?: string }>>(() => {
    const def = JDE_FORM_REGISTRY[activeModule];
    return [{
      id: activeModule,
      code: def ? def.code : 'P0000',
      title: def ? def.title.replace(/^Work with /, '') : activeModule,
      formCode: def ? def.formCode : 'W0000A'
    }];
  });

  useEffect(() => {
    if (!activeModule) return;
    setOpenTabs(prev => {
      if (prev.some(t => t.id === activeModule)) {
        return prev;
      }
      const def = JDE_FORM_REGISTRY[activeModule];
      const newTab = {
        id: activeModule,
        code: def ? def.code : 'P0000',
        title: def ? def.title.replace(/^Work with /, '') : activeModule,
        formCode: def ? def.formCode : 'W0000A'
      };
      return [...prev, newTab];
    });
  }, [activeModule]);

  const handleSelectAppTab = (id: ModuleType) => {
    setActiveModule(id);
  };

  const handleCloseAppTab = (id: ModuleType) => {
    setOpenTabs(prev => {
      const nextTabs = prev.filter(t => t.id !== id);
      if (nextTabs.length === 0) {
        const defaultTab = { id: 'DASHBOARD' as ModuleType, code: 'P0000', title: 'Dashboard Principal', formCode: 'W0000A' };
        if (activeModule === id) setActiveModule('DASHBOARD');
        return [defaultTab];
      }
      if (activeModule === id) {
        setActiveModule(nextTabs[nextTabs.length - 1].id);
      }
      return nextTabs;
    });
  };

  // Strict RBAC isolation for SOLO_EMPLEO role
  useEffect(() => {
    if (currentUser && (credentials[currentUser]?.role === 'SOLO_EMPLEO' || currentUser.includes('PIÑA') || currentUser.includes('PINA'))) {
      if (activeModule !== 'BUSQUEDA_EMPLEO') {
        setActiveModule('BUSQUEDA_EMPLEO');
      }
    }
  }, [currentUser, credentials, activeModule]);

  const [workOrderSubTab, setWorkOrderSubTab] = useState<'MAESTRO' | 'APROBACIONES' | 'RECEPCION'>('MAESTRO');
  const [auditActiveTab, setAuditActiveTab] = useState<'TRANSACTO' | 'LOGS'>('LOGS');
  const [auditResetKey, setAuditResetKey] = useState<number>(0);

  const isInternalControlUser = React.useMemo(() => {
    if (!currentUser) return false;
    if (currentUser === 'DEVELOPER' || firebaseUser?.email === 'samaheim@gmail.com' || currentUser === 'CRISTIAN MUÑOZ R.') return true;
    const userAcc = credentials[currentUser];
    if (userAcc) {
      if (userAcc.role === 'ADMINISTRADOR' || userAcc.role === 'JEFE') return true;
      if (userAcc.deptTitle?.toUpperCase().includes('CONTROL INTERNO') || userAcc.deptTitle?.toUpperCase().includes('AUDITOR')) return true;
    }
    return false;
  }, [currentUser, firebaseUser, credentials]);

  // Granular allowed modules calculation for current active user
  const effectiveAllowedModules = React.useMemo(() => {
    const userAcc = currentUser ? credentials[currentUser] : undefined;
    return getUserEffectiveAllowedModules(userAcc, firebaseUser?.email, currentUser || undefined);
  }, [currentUser, credentials, firebaseUser]);

  const isDemoClient = React.useMemo(() => {
    if (!currentUser) return false;
    return credentials[currentUser]?.role === 'CLIENTE_DEMO' || currentUser === 'CLIENTE DEMO';
  }, [currentUser, credentials]);

  // Enforce module isolation for allowed modules
  useEffect(() => {
    if (!currentUser) return;
    if (isDemoClient && activeModule === 'BUSQUEDA_EMPLEO') {
      setActiveModule('SYSTEM_LANDING');
      return;
    }
    // Solo si el usuario está autenticado y tiene módulos definidos
    if (effectiveAllowedModules && effectiveAllowedModules.length > 0) {
      if (!effectiveAllowedModules.includes(activeModule)) {
        const fallback = effectiveAllowedModules.includes('SYSTEM_LANDING') && isDemoClient
          ? 'SYSTEM_LANDING'
          : effectiveAllowedModules.includes('DASHBOARD')
            ? 'DASHBOARD'
            : (effectiveAllowedModules[0] || 'SYSTEM_LANDING');
        setActiveModule(fallback);
      }
    }
  }, [currentUser, credentials, activeModule, effectiveAllowedModules, isDemoClient]);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isGlobalSupplierModalOpen, setIsGlobalSupplierModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const { notify, dismiss } = useNotification();

  const handleAddNewSupplier = (data: any) => {
    const normalizedRut = (data.taxId || '').replace(/[^0-9kK]/g, '').toUpperCase();
    const exists = suppliers.some(s => (s.taxId || '').replace(/[^0-9kK]/g, '').toUpperCase() === normalizedRut);
    if (exists) {
      notify(`El proveedor con RUT ${data.taxId} ya existe en el Libro de Direcciones (F0101).`, 'warning');
      return;
    }
    const newId = data.id || crypto.randomUUID();
    const rawNewSupplier: Supplier = {
      ...data,
      id: newId,
      timestamp: data.timestamp || Date.now(),
      userCreator: data.userCreator || currentUser || 'SISTEMA',
      status: data.status || 'PENDING_APPROVAL',
      folio: data.folio || `PROV-${String(suppliers.length + 1).padStart(4, '0')}`
    };
    const { enrichedSupplier } = hydrateSupplierRelationalTables(rawNewSupplier, 0, suppliers);
    const updatedList = [enrichedSupplier, ...suppliers];
    setSuppliers(updatedList);
    storage.save('suppliers', updatedList);
    syncToFirestore('suppliers', newId, enrichedSupplier);
    syncSupplierRelationalTablesToDatabase(updatedList, enrichedSupplier);
    addAuditEntry(
      'CREATE',
      'PROVEEDOR',
      newId,
      `${enrichedSupplier.name} (AN8 #${enrichedSupplier.addressNumber} · 5 Tablas JDE)`
    );
    notify(
      `Proveedor ${enrichedSupplier.name} registrado en las 5 tablas maestras (AN8 #${enrichedSupplier.addressNumber}).`,
      'success'
    );
  };

  const isFirebaseConnected = isAuthReady && isConfigValid;

  const consolidatedTransactions = React.useMemo(() => {
    // Filter out auto-generated transactions from direct if we are going to map them from work orders
    // OR (better) use the auto-generated ones and don't map them manually here.
    // Let's use the auto-generated ones as the source of truth for paid work orders.
    
    const direct = filteredTransactions.map(t => ({ 
      ...t, 
      source: (t as any).isAutoGenerated ? 'ORDEN_TRABAJO' : 'DIRECTO' 
    }));
    
    const pettyCash = pettyCashExpenses.map(pce => ({
      id: pce.id,
      description: `[CAJA CHICA] ${pce.description}`,
      amount: pce.amount,
      category: pce.category,
      type: 'EXPENSE' as const,
      documentType: pce.documentType,
      documentNumber: pce.documentNumber || 'S/N',
      date: pce.date,
      invoiceDate: pce.date,
      user: pce.userCreator,
      timestamp: pce.timestamp,
      supplierName: pce.supplierName,
      supplierTaxId: pce.supplierTaxId,
      insuranceCompany: 'GENERALES' as const, // Default for petty cash
      source: 'CAJA_CHICA'
    }));

    // We don't need to map paidWorkOrders here anymore because the useEffect 
    // ensures they exist in the 'transactions' state as auto-generated entries.
    
    return [...direct, ...pettyCash].sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredTransactions, pettyCashExpenses]);

  useEffect(() => {
    // Fix existing "RIESGO BAGO" typo in suppliers
    if (suppliers.length > 0) {
      const hasTypo = suppliers.some(s => s.dueDiligenceRisk === 'RIESGO BAGO');
      if (hasTypo) {
        setSuppliers(prev => prev.map(s => 
          s.dueDiligenceRisk === 'RIESGO BAGO' 
            ? { ...s, dueDiligenceRisk: 'RIESGO BAJO' } 
            : s
        ));
      }
    }
  }, [suppliers]);

  useEffect(() => {
    // Load cached data-URI logo from local storage immediately without forcing SVG->PNG canvas rasterization
    const savedLogo = localStorage.getItem('settings_logo');
    if (savedLogo && savedLogo.startsWith('data:')) {
      setCompanyLogo(savedLogo);
    }

    let unsubscribe: (() => void) | undefined;
    
    // Fallback timer to ensure isAuthReady is set to true even if onAuthStateChanged hangs
    // or is blocked by third-party storage restrictions in the sandbox iframe.
    const fallbackTimer = setTimeout(() => {
      console.log("[Firebase] Auth initialization fallback triggered (ensuring online status is active).");
      setIsAuthReady(true);
    }, 200);

    try {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        clearTimeout(fallbackTimer);
        setFirebaseUser(user);
        setIsAuthReady(true);
        if (user) {
          console.log("Firebase Auth: User connected", user.email);
        }
      }, (error) => {
        console.warn("[Firebase] onAuthStateChanged error caught gracefully:", error);
        clearTimeout(fallbackTimer);
        setIsAuthReady(true); // Fallback to allow online state
      });
    } catch (err) {
      console.error("[Firebase] Fatal auth listener error caught:", err);
      clearTimeout(fallbackTimer);
      setIsAuthReady(true); // Fallback to allow online state
    }

    return () => {
      clearTimeout(fallbackTimer);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Intentar autenticación anidada/anónima si hay un usuario local ingresado con contraseña
  // pero aún no tenemos sesión de Firebase, para permitir sincronización multiusuario en la nube.
  useEffect(() => {
    if (isConfigValid && isAuthReady && currentUser && !firebaseUser) {
      console.log("[Firebase] Usuario local activo pero sin sesión Firebase. Intentando autenticación anónima para sincronizar en la nube...");
      signInAnonymously(auth)
        .then((cred) => {
          console.log("[Firebase] Autenticación anónima exitosa para:", currentUser, cred.user.uid);
        })
        .catch((error) => {
          console.warn("[Firebase] Autenticación anónima falló (puede estar desactivada en la consola de Firebase):", error);
        });
    }
  }, [isConfigValid, isAuthReady, currentUser, firebaseUser]);

  // Helper para fusionar documentos de la nube sin perder adjuntos locales ni registros pendientes de sincronizar
  const mergeCloudWithLocal = <T extends { id: string }>(cloudItems: T[], localItems: T[]): T[] => {
    const cloudIds = new Set(cloudItems.map(item => item.id));
    const localMap = new Map(localItems.map(item => [item.id, item]));

    const mergedCloud = cloudItems.map(cloudItem => {
      const localItem = localMap.get(cloudItem.id) as any;
      const cItem = cloudItem as any;
      if (!localItem) return cloudItem;

      // Si el registro local es más reciente o tiene adjuntos que aún no están hidratados en la nube, preservarlos
      const resolvedDocUrl =
        (cItem.documentUrl && !String(cItem.documentUrl).startsWith('assetflow-chunk://'))
          ? cItem.documentUrl
          : (localItem.documentUrl || cItem.documentUrl);

      const resolvedAttachments =
        (Array.isArray(cItem.attachments) && cItem.attachments.length > 0 && !String(cItem.attachments[0]).startsWith('assetflow-chunk://'))
          ? cItem.attachments
          : (Array.isArray(localItem.attachments) && localItem.attachments.length > 0 ? localItem.attachments : cItem.attachments);

      return {
        ...localItem,
        ...cloudItem,
        ...(resolvedDocUrl !== undefined ? { documentUrl: resolvedDocUrl } : {}),
        ...(resolvedAttachments !== undefined ? { attachments: resolvedAttachments } : {}),
      } as T;
    });

    const localOnly = localItems.filter(local => !cloudIds.has(local.id));
    return [...mergedCloud, ...localOnly];
  };

  // Real-time synchronization from Firestore - JDE Two-Tier Staggered Kernel Queue
  useEffect(() => {
    if (!isAuthReady || !isConfigValid || isFirestoreQuotaExceeded()) return;

    const activeUnsubs: (() => void)[] = [];
    let tier2Timer: ReturnType<typeof setTimeout> | null = null;

    // TIER 1: Critical Operational Tables (F0101/F0401, F4801/F4301, F1501, F0911, F0092)
    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Supplier);
      if (data.length > 0) setSuppliers(prev => mergeCloudWithLocal(data, prev));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'suppliers'));

    const unsubWorkOrders = onSnapshot(collection(db, 'work_orders'), async (snapshot) => {
      const rawData = snapshot.docs.map(doc => doc.data() as WorkOrder);
      if (rawData.length > 0) {
        const data = await Promise.all(rawData.map(item => hydrateRecordFromFirestore(item)));
        setWorkOrders(prev => mergeCloudWithLocal(data, prev));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'work_orders'));

    const unsubProperties = onSnapshot(collection(db, 'properties'), async (snapshot) => {
      const rawData = snapshot.docs.map(doc => doc.data() as Property);
      if (rawData.length > 0) {
        const data = await Promise.all(rawData.map(item => hydrateRecordFromFirestore(item)));
        setProperties(prev => mergeCloudWithLocal(data, prev));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'properties'));

    const unsubTransactions = onSnapshot(collection(db, 'transactions'), async (snapshot) => {
      const rawData = snapshot.docs.map(doc => doc.data() as Transaction);
      if (rawData.length > 0) {
        const cloudData = await Promise.all(rawData.map(item => hydrateRecordFromFirestore(item)));
        setTransactions(prev => mergeCloudWithLocal(cloudData, prev));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'transactions'));

    const unsubSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
      snapshot.docs.forEach(doc => {
        if (doc.id === 'global_config') {
          const data = doc.data();
          checkAndSetLogo(data.logo || null);
          const remoteDeleted: string[] = Array.isArray(data.deletedUsers) ? data.deletedUsers : [];
          if (remoteDeleted.length > 0) {
            try {
              const localDeleted: string[] = JSON.parse(localStorage.getItem('assetflow_deleted_users') || '[]');
              const combined = Array.from(new Set([...localDeleted, ...remoteDeleted]));
              localStorage.setItem('assetflow_deleted_users', JSON.stringify(combined));
            } catch (e) {}
          }
          if (data.credentials && typeof data.credentials === 'object' && Object.keys(data.credentials).length > 0) {
            let deletedList: string[] = [];
            try {
              deletedList = JSON.parse(localStorage.getItem('assetflow_deleted_users') || '[]');
            } catch (e) {}
            setCredentials(prev => {
              const merged = { ...USER_CREDENTIALS, ...prev, ...data.credentials };
              deletedList
                .filter(u => !u.includes('PIÑA') && !u.includes('PINA') && u !== 'CRISTIAN MUÑOZ R.' && u !== 'DEVELOPER' && u !== 'CLIENTE DEMO')
                .forEach(u => delete merged[u]);
              if (!merged['CLIENTE DEMO']) {
                merged['CLIENTE DEMO'] = USER_CREDENTIALS['CLIENTE DEMO'];
              }
              Object.entries(merged).forEach(([u, acc]) => {
                const userAcc = acc as UserAccount;
                if (userAcc && typeof userAcc === 'object' && !userAcc.firstName && !userAcc.paternalSurname) {
                  const parsed = parseFullName(u);
                  userAcc.firstName = parsed.firstName;
                  userAcc.paternalSurname = parsed.paternalSurname;
                  userAcc.maternalSurname = parsed.maternalSurname;
                }
              });
              return merged;
            });
          }
        }
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings'));

    activeUnsubs.push(unsubSuppliers, unsubWorkOrders, unsubProperties, unsubTransactions, unsubSettings);
    registerFirestoreUnsubscribers(activeUnsubs);

    // TIER 2A: High-Priority Operational Ledgers (staggered 500ms)
    let tier2BTimer: any = null;
    tier2Timer = setTimeout(() => {
      if (isFirestoreQuotaExceeded()) return;

      const unsubAudit = onSnapshot(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100)), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as AuditEntry);
        if (data.length > 0) setAuditLog(prev => mergeCloudWithLocal(data, prev));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'audit_logs'));

      const unsubMaintenance = onSnapshot(collection(db, 'maintenance_expedientes'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as MaintenanceExpediente);
        if (data.length > 0) setMaintenanceExpedientes(prev => mergeCloudWithLocal(data, prev));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'maintenance_expedientes'));

      const unsubSolicitudes = onSnapshot(collection(db, 'solicitudes'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as Solicitud);
        if (data.length > 0) setSolicitudes(prev => mergeCloudWithLocal(data, prev));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'solicitudes'));

      const unsubContracts = onSnapshot(collection(db, 'contracts'), async (snapshot) => {
        const rawData = snapshot.docs.map(doc => doc.data() as Contract);
        if (rawData.length > 0) {
          const data = await Promise.all(rawData.map(item => hydrateRecordFromFirestore(item)));
          setContracts(prev => mergeCloudWithLocal(data, prev));
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'contracts'));

      const unsubLeaseContracts = onSnapshot(collection(db, 'lease_contracts'), async (snapshot) => {
        const rawData = snapshot.docs.map(doc => doc.data() as LeaseContract);
        if (rawData.length > 0) {
          const data = await Promise.all(rawData.map(item => hydrateRecordFromFirestore(item)));
          setLeaseContracts(prev => mergeCloudWithLocal(data, prev));
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'lease_contracts'));

      const unsubReversals = onSnapshot(collection(db, 'reversal_requests'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as ReversalRequest);
        setReversalRequests(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'reversal_requests'));

      activeUnsubs.push(
        unsubAudit,
        unsubMaintenance,
        unsubSolicitudes,
        unsubContracts,
        unsubLeaseContracts,
        unsubReversals
      );
      registerFirestoreUnsubscribers(activeUnsubs);
    }, 500);

    // TIER 2B: Compliance, Reports & Archive Ledgers (staggered 1400ms after paint & main interaction)
    tier2BTimer = setTimeout(() => {
      if (isFirestoreQuotaExceeded()) return;

      const unsubDueDiligence = onSnapshot(collection(db, 'due_diligence'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as DueDiligenceReport);
        if (data.length > 0) {
          setDueDiligenceReports(data);
          storage.save('dueDiligenceReports', data);
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'due_diligence'));

      const unsubAppraisals = onSnapshot(collection(db, 'appraisals'), async (snapshot) => {
        const rawData = snapshot.docs.map(doc => doc.data() as Appraisal);
        if (rawData.length > 0) {
          const data = await Promise.all(rawData.map(item => hydrateRecordFromFirestore(item)));
          setAppraisals(prev => mergeCloudWithLocal(data, prev));
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'appraisals'));

      const unsubOfficialDocs = onSnapshot(collection(db, 'official_docs'), async (snapshot) => {
        const rawData = snapshot.docs.map(doc => doc.data() as OfficialDocument);
        if (rawData.length > 0) {
          const data = await Promise.all(rawData.map(item => hydrateRecordFromFirestore(item)));
          setOfficialDocs(prev => mergeCloudWithLocal(data, prev));
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'official_docs'));

      const unsubTickets = onSnapshot(collection(db, 'tickets'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ITTicket));
        if (data.length > 0) setTickets(prev => mergeCloudWithLocal(data, prev));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'tickets'));

      const unsubB13 = onSnapshot(collection(db, 'b13_reports'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as B13Report);
        if (data.length > 0) setB13Reports(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'b13_reports'));

      const unsubB4 = onSnapshot(collection(db, 'b4_reports'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as B4Report);
        if (data.length > 0) setB4Reports(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'b4_reports'));

      const unsubNote14 = onSnapshot(collection(db, 'note14_reports'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as Note14Report);
        if (data.length > 0) setNote14Reports(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'note14_reports'));

      const unsubReconciliations = onSnapshot(collection(db, 'accounting_reconciliations'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as AccountingReconciliation);
        if (data.length > 0) setAccountingReconciliations(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'accounting_reconciliations'));

      const unsubPettyCashFunds = onSnapshot(collection(db, 'petty_cash_funds'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as PettyCash);
        if (data.length > 0) setPettyCashFunds(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'petty_cash_funds'));

      const unsubPettyCashExpenses = onSnapshot(collection(db, 'petty_cash_expenses'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as PettyCashExpense);
        if (data.length > 0) setPettyCashExpenses(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'petty_cash_expenses'));

      const unsubTaxDeclarations = onSnapshot(collection(db, 'tax_declarations'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as TaxDeclaration);
        if (data.length > 0) setTaxDeclarations(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'tax_declarations'));

      const unsubSecurityDeposits = onSnapshot(collection(db, 'security_deposits'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as SecurityDeposit);
        if (data.length > 0) setSecurityDeposits(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'security_deposits'));

      const unsubTemplates = onSnapshot(collection(db, 'report_templates'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as ReportTemplate);
        if (data.length > 0) setReportTemplates(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'report_templates'));

      const unsubReviews = onSnapshot(collection(db, 'report_reviews'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as ReportReview);
        if (data.length > 0) setReportReviews(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'report_reviews'));

      const unsubApplicants = onSnapshot(collection(db, 'applicants'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as Applicant);
        if (data.length > 0) setApplicants(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'applicants'));

      const unsubInspections = onSnapshot(collection(db, 'property_inspections'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as PropertyInspection);
        if (data.length > 0) setPropertyInspections(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'property_inspections'));

      const unsubWmsLogistics = onSnapshot(collection(db, 'wms_logistics'), (snapshot) => {
        if (snapshot.empty) return;
        const partitionMap: Partial<Record<'items' | 'locations' | 'balances' | 'tasks' | 'movements' | 'shipments', { records: any[]; updatedAt: number; updatedBy?: string }>> = {};
        let maxUpdatedAt = 0;
        let lastUpdater = '';
        snapshot.docs.forEach(d => {
          const data = d.data() as any;
          if (data && data.section && Array.isArray(data.records)) {
            partitionMap[data.section as keyof typeof partitionMap] = {
              records: data.records,
              updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
              updatedBy: data.updatedBy
            };
            if ((data.updatedAt || 0) > maxUpdatedAt) {
              maxUpdatedAt = data.updatedAt || 0;
              if (data.updatedBy) lastUpdater = data.updatedBy;
            }
          }
        });
        if (Object.keys(partitionMap).length === 0) return;
        setWmsWorkspace(prev => {
          const prevTs = prev.updatedAt || 0;
          if (maxUpdatedAt > 0 && prevTs >= maxUpdatedAt) return prev;
          const next: WmsWorkspaceState = {
            items: partitionMap.items?.records || prev.items,
            locations: partitionMap.locations?.records || prev.locations,
            balances: partitionMap.balances?.records || prev.balances,
            tasks: partitionMap.tasks?.records || prev.tasks,
            movements: partitionMap.movements?.records || prev.movements,
            shipments: partitionMap.shipments?.records || prev.shipments,
            updatedAt: maxUpdatedAt || prev.updatedAt
          };
          storage.save('wmsLogistics', next);
          lastPersistedStateRef.current.wmsLogistics = next;
          return next;
        });
      }, (error) => handleFirestoreError(error, OperationType.GET, 'wms_logistics'));

      activeUnsubs.push(
        unsubWmsLogistics,
        unsubInspections,
        unsubDueDiligence,
        unsubAppraisals,
        unsubOfficialDocs,
        unsubTickets,
        unsubB13,
        unsubB4,
        unsubNote14,
        unsubReconciliations,
        unsubPettyCashFunds,
        unsubPettyCashExpenses,
        unsubTaxDeclarations,
        unsubSecurityDeposits,
        unsubTemplates,
        unsubReviews,
        unsubApplicants
      );
      registerFirestoreUnsubscribers(activeUnsubs);
    }, 1400);

    return () => {
      if (tier2Timer) clearTimeout(tier2Timer);
      if (tier2BTimer) clearTimeout(tier2BTimer);
      registerFirestoreUnsubscribers([]);
      activeUnsubs.forEach(u => {
        try {
          u();
        } catch {}
      });
    };
  }, [isAuthReady, firebaseUser]);

  useEffect(() => {
    const handleShowPrintModal = () => {
      setIsPrintModalOpen(true);
    };
    window.addEventListener('show-iframe-print-modal', handleShowPrintModal);

    return () => {
      window.removeEventListener('show-iframe-print-modal', handleShowPrintModal);
    };
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during Google Login:", error);
      alert("Error al iniciar sesión con Google.");
    }
  };

  useEffect(() => {
    // Check if storage is linked to a file
    const checkDb = async () => {
      const isLinked = await storage.isLinked();
      setIsDbConnected(isLinked);
    };
    checkDb();
    const interval = setInterval(checkDb, 60000);
    return () => clearInterval(interval);
  }, []);

  const restoreDueDiligenceReports = async (force = false) => {
    setDueDiligenceReports(RESTORED_DUE_DILIGENCE_REPORTS);
    await storage.save('dueDiligenceReports', RESTORED_DUE_DILIGENCE_REPORTS);
    bulkSyncToFirestore('due_diligence', RESTORED_DUE_DILIGENCE_REPORTS.map(rep => ({ id: rep.id, data: rep })));
    addAuditEntry('SYNC', 'SISTEMA', 'DD_SEED', `Restaurados ${RESTORED_DUE_DILIGENCE_REPORTS.length} informes de debida diligencia`);
  };

  const refreshAppData = async () => {
    // JDE JDBJ Two-Phase Hydration: Load Tier-1 Operational Stores first (< 10ms)
    const tier1Stores = [
      'suppliers',
      'workOrders',
      'properties',
      'transactions',
      'leaseContracts',
      'settings',
      'settings_logo'
    ];
    const coreData = await storage.loadStoresSubset(tier1Stores);

    let deletedList: string[] = [];
    try {
      deletedList = JSON.parse(localStorage.getItem('assetflow_deleted_users') || '[]');
    } catch (e) {}
    const cred: Record<string, UserAccount> = { ...USER_CREDENTIALS };
    deletedList
      .filter(u => !u.includes('PIÑA') && !u.includes('PINA') && u !== 'CRISTIAN MUÑOZ R.' && u !== 'DEVELOPER' && u !== 'CLIENTE DEMO')
      .forEach(u => delete cred[u]);
    if (coreData.settings && typeof coreData.settings === 'object') {
      Object.entries(coreData.settings).forEach(([k, v]) => {
        if (!deletedList.includes(k) && v && typeof v === 'object' && 'password' in v && typeof (v as any).password === 'string') {
          const userAcc = { ...(v as UserAccount) };
          if (!userAcc.firstName && !userAcc.paternalSurname) {
            const parsed = parseFullName(k);
            userAcc.firstName = parsed.firstName;
            userAcc.paternalSurname = parsed.paternalSurname;
            userAcc.maternalSurname = parsed.maternalSurname;
          }
          cred[k] = userAcc;
        }
      });
    }

    const s = coreData.suppliers || [];
    const t = coreData.transactions || [];
    const w = coreData.workOrders || [];
    const p = coreData.properties || [];
    const lc = coreData.leaseContracts || [];
    const logo = coreData.settings_logo || null;

    setSuppliers(prev => prev.length > 0 && s.length === 0 ? prev : s);
    setTransactions(prev => prev.length > 0 && t.length === 0 ? prev : t);
    setWorkOrders(prev => prev.length > 0 && w.length === 0 ? prev : w);
    setProperties(prev => prev.length > 0 && p.length === 0 ? prev : p);
    setLeaseContracts(prev => prev.length > 0 && lc.length === 0 ? prev : lc);
    setCredentials(cred);
    Object.assign(lastPersistedStateRef.current, {
      suppliers: s,
      transactions: t,
      workOrders: w,
      properties: p,
      leaseContracts: lc,
      settings: cred
    });

    const cachedLocalLogo = typeof localStorage !== 'undefined' ? localStorage.getItem('settings_logo') : null;
    const effectiveLogo = (typeof logo === 'string' && logo.startsWith('data:')) ? logo : cachedLocalLogo;
    checkAndSetLogo(effectiveLogo);

    if (t.length > 0) {
      setTimeout(() => {
        fetch('/api/transactions?limit=1')
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.pagination && data.pagination.totalRecords === 0) {
              fetch('/api/transactions/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: t })
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }, 600);
    }

    // Phase 2: Hydrate Auxiliary & Archive Ledgers in next non-blocking tick
    setTimeout(async () => {
      const tier2Stores = [
        'auditLog',
        'contracts',
        'officialDocs',
        'tickets',
        'b13Reports',
        'b4Reports',
        'note14Reports',
        'accountingReconciliations',
        'pettyCashFunds',
        'pettyCashExpenses',
        'dueDiligenceReports',
        'maintenanceExpedientes',
        'solicitudes',
        'appraisals',
        'securityDeposits',
        'reportTemplates',
        'reportReviews',
        'applicants',
        'propertyInspections',
        'wmsLogistics'
      ];
      const auxData = await storage.loadStoresSubset(tier2Stores);

      const a = auxData.auditLog || [];
      if (!a || a.length < INITIAL_AUDIT_LOGS.length) {
        const existingIds = new Set((a || []).map((x: any) => x.id));
        const merged = [...(a || []), ...INITIAL_AUDIT_LOGS.filter(x => !existingIds.has(x.id))];
        setAuditLog(merged);
      } else {
        setAuditLog(a);
      }

      setContracts(auxData.contracts || []);
      setOfficialDocs(auxData.officialDocs || []);
      setTickets(auxData.tickets || []);
      setB13Reports(auxData.b13Reports || []);
      setB4Reports(auxData.b4Reports || []);
      setNote14Reports(auxData.note14Reports || []);
      setAccountingReconciliations(auxData.accountingReconciliations || []);
      setMaintenanceExpedientes(auxData.maintenanceExpedientes || []);
      setSolicitudes(auxData.solicitudes || []);
      setAppraisals(auxData.appraisals || []);
      setSecurityDeposits(auxData.securityDeposits || []);
      setReportTemplates(auxData.reportTemplates || []);
      setReportReviews(auxData.reportReviews || []);
      setApplicants(auxData.applicants || []);
      setPropertyInspections(auxData.propertyInspections || []);

      const rawWms = auxData.wmsLogistics;
      const hasValidWms =
        rawWms &&
        typeof rawWms === 'object' &&
        !Array.isArray(rawWms) &&
        Array.isArray((rawWms as WmsWorkspaceState).items) &&
        (rawWms as WmsWorkspaceState).items.length > 0;
      if (hasValidWms) {
        setWmsWorkspace(rawWms as WmsWorkspaceState);
      }

      const ddr = auxData.dueDiligenceReports || [];
      const resolvedDdr = ddr.length === 0 ? RESTORED_DUE_DILIGENCE_REPORTS : ddr;
      if (ddr.length === 0) {
        setDueDiligenceReports(RESTORED_DUE_DILIGENCE_REPORTS);
      } else {
        setDueDiligenceReports(ddr);
      }

      const pcf = auxData.pettyCashFunds || [];
      let resolvedPcf = pcf;
      if (pcf.length === 0) {
        resolvedPcf = [
          { id: 'fund-inmobiliaria', name: 'OFICINA INMOBILIARIA', responsible: 'ADMINISTRACIÓN', initialBalance: 500000, currentBalance: 500000, status: 'OPEN', createdAt: new Date().toISOString(), timestamp: Date.now() },
          { id: 'fund-centenario', name: 'EDIFICIO CENTENARIO', responsible: 'OPERACIONES', initialBalance: 500000, currentBalance: 500000, status: 'OPEN', createdAt: new Date().toISOString(), timestamp: Date.now() }
        ];
        setPettyCashFunds(resolvedPcf);
      } else {
        setPettyCashFunds(pcf);
      }

      setPettyCashExpenses(auxData.pettyCashExpenses || []);
      Object.assign(lastPersistedStateRef.current, {
        auditLog: (!a || a.length < INITIAL_AUDIT_LOGS.length) ? a : a,
        contracts: auxData.contracts || [],
        officialDocs: auxData.officialDocs || [],
        tickets: auxData.tickets || [],
        b13Reports: auxData.b13Reports || [],
        b4Reports: auxData.b4Reports || [],
        note14Reports: auxData.note14Reports || [],
        accountingReconciliations: auxData.accountingReconciliations || [],
        maintenanceExpedientes: auxData.maintenanceExpedientes || [],
        solicitudes: auxData.solicitudes || [],
        appraisals: auxData.appraisals || [],
        securityDeposits: auxData.securityDeposits || [],
        reportTemplates: auxData.reportTemplates || [],
        reportReviews: auxData.reportReviews || [],
        applicants: auxData.applicants || [],
        propertyInspections: auxData.propertyInspections || [],
        ...(hasValidWms ? { wmsLogistics: rawWms } : {}),
        dueDiligenceReports: resolvedDdr,
        pettyCashFunds: resolvedPcf,
        pettyCashExpenses: auxData.pettyCashExpenses || []
      });
      setLastSyncTime(Date.now());
    }, 10);
  };

  const seedMasterProperties = async (force = false) => {
    // Only import if properties are empty or forced
    if (!force && properties.length > 5) return;

    try {
      const { MASTER_PROPERTIES_SEED } = await import('./lib/masterDataSeed');
      let currentProperties = [...properties];
      let addedCount = 0;

      MASTER_PROPERTIES_SEED.forEach(seedProp => {
        // Check if property already exists by code or role to avoid duplicates
        const exists = currentProperties.some(p => p.code === seedProp.code || p.propertyRole === seedProp.propertyRole);
        if (!exists) {
          currentProperties.push({
            ...seedProp,
            id: `prop-${crypto.randomUUID().substring(0, 8)}`,
            timestamp: Date.now(),
            isTest: true
          } as Property);
          addedCount++;
        }
      });

      // Explicitly inject security deposit properties with correct IDs for interconnectivity
      const demoProps = [
        {
          id: 'p-demo-8',
          code: 'HUER-1402',
          building: 'EDIFICIO HUERFANOS',
          floor: '14',
          address: 'Huérfanos 1400, Depto 1402',
          commune: 'Santiago',
          type: 'DEPARTAMENTO',
          propertyRole: '124-1402',
          appraisalValue: 125000000,
          isTest: true,
          timestamp: Date.now()
        },
        {
          id: 'p-demo-9',
          code: 'GOLF-604',
          building: 'AV. EL GOLF',
          floor: '6',
          address: 'Av. El Golf 99, Depto 604',
          commune: 'Las Condes',
          type: 'DEPARTAMENTO',
          propertyRole: '512-604',
          appraisalValue: 310000000,
          isTest: true,
          timestamp: Date.now()
        },
        {
          id: 'p-demo-10',
          code: 'MARIN-403',
          building: 'EDIFICIO MARIN 450',
          floor: '4',
          address: 'Marin 450, Depto 403',
          commune: 'Santiago',
          type: 'DEPARTAMENTO',
          propertyRole: '315-403',
          appraisalValue: 85000000,
          isTest: true,
          timestamp: Date.now()
        }
      ];

      demoProps.forEach(dp => {
        if (!currentProperties.some(p => p.id === dp.id)) {
          currentProperties.push(dp as Property);
          addedCount++;
        }
      });

      if (addedCount > 0) {
        setProperties(currentProperties);
        await storage.save('properties', currentProperties);
        const testProps = currentProperties.filter(p => p.isTest).map(p => ({ id: p.id, data: p }));
        bulkSyncToFirestore('properties', testProps);
        console.log(`[App] Seeded ${addedCount} master properties from seed file.`);
      }
    } catch (e) {
      console.error("[App] Error seeding master properties:", e);
    }
  };

  const seedSolicitudes = async () => {
    if (solicitudes.length > 0) return;
    const activeProps = properties.slice(0, 4);
    if (activeProps.length === 0) return;

    const sampleRequests = [
      {
        title: "FILTRACIÓN CRÍTICA EN DUCHA PRINCIPAL",
        description: "Se reporta filtración constante desde el piso superior dañando el cielo falso del baño. Requiere gasfitería de urgencia integral.",
        category: "REQUERIMIENTO",
        priority: "CRÍTICA",
        status: "EN_PROCESO",
        applicantName: "ALEXIS CLARO",
        applicantEmail: "aclaro@gmail.com",
        assignedTo: "CONSTRUCTORA ALPHA SPA [TEST]",
        requestDate: "2026-06-01",
        subtasks: [
          { id: crypto.randomUUID(), title: "Inspección técnica", description: "Verificar origen de humedad", status: "COMPLETED", dueDate: "2026-06-02", assignedTo: "Gasfitería Alpha" },
          { id: crypto.randomUUID(), title: "Reparación de matriz", description: "Efectuar cambio de codo", status: "PENDING", dueDate: "2026-06-06", assignedTo: "Gasfitería Alpha" }
        ],
        updates: [
          { id: crypto.randomUUID(), date: "2026-06-02", content: "El proveedor constató rotura en codo de PVC de la descarga superior.", user: "ADMINISTRADOR", timestamp: Date.now() - 86400000 }
        ]
      },
      {
        title: "AJUSTE DE VENTANALES Y TERMOPANELES",
        description: "Ventanal principal del living no cierra correctamente. Se pasa el aire de forma constante afectando la climatización del espacio.",
        category: "MEJORA",
        priority: "MEDIA",
        status: "PENDIENTE",
        applicantName: "CARMEN GLORIA GÓMEZ",
        applicantEmail: "cgomez@outlook.cl",
        requestDate: "2026-06-03",
        subtasks: [],
        updates: []
      },
      {
        title: "MANTENIMIENTO PREVENTIVO DE CLIMATIZACIÓN",
        description: "Limpieza anual de filtros, revisión de gas refrigerante y termostatos del sistema centralizado de calefacción y climatización.",
        category: "SERVICIOS",
        priority: "BAJA",
        status: "FINALIZADA",
        applicantName: "FERNANDO SOLER",
        applicantEmail: "fsoler@inmobiliaria.cl",
        assignedTo: "SERVICIOS TÉCNICOS BETA [TEST]",
        requestDate: "2026-05-28",
        subtasks: [
          { id: crypto.randomUUID(), title: "Servicio de limpieza", description: "Filtros de aire principal", status: "COMPLETED", dueDate: "2026-05-29" }
        ],
        updates: [
          { id: crypto.randomUUID(), date: "2026-05-29", content: "Trabajos culminados satisfactoriamente. Se envía informe de mantención.", user: "OPERACIONES", timestamp: Date.now() - 172800000 }
        ]
      },
      {
        title: "FALLO DE CÉSPED Y RIEGO AUTOMÁTICO",
        description: "Fuga detectada en la válvula número 3 del jardín lateral. Algunas zonas se encuentran secas debido al fallo de presión.",
        category: "REQUERIMIENTO",
        priority: "ALTA",
        status: "DETENIDA",
        applicantName: "ROBERTO SANDOVAL",
        applicantEmail: "rsandoval@jardines.cl",
        requestDate: "2026-06-02",
        subtasks: [],
        updates: [
          { id: crypto.randomUUID(), date: "2026-06-03", content: "Se detuvieron las obras en espera de repuesto de manifold de 3 vías.", user: "OPERACIONES", timestamp: Date.now() - 40000000 }
        ]
      },
      {
        title: "CERTIFICACIÓN DE ASCENSOR NÚMERO 2",
        description: "Revisión técnica semestral obligatoria de seguridad del elevador principal según normativa vigente chilena de transporte vertical.",
        category: "DOCUMENTACIÓN",
        priority: "ALTA",
        status: "APROBADA_JEFATURA",
        applicantName: "JUANA DE ARCO",
        applicantEmail: "jarco@edificios.cl",
        assignedTo: "SERVICIOS TÉCNICOS BETA [TEST]",
        requestDate: "2026-05-25",
        subtasks: [
          { id: crypto.randomUUID(), title: "Inspección técnica de cables", description: "Evaluar cables de tracción", status: "COMPLETED", dueDate: "2026-05-26" }
        ],
        updates: [
          { id: crypto.randomUUID(), date: "2026-05-26", content: "Aprobada inspección técnica. Certificado ERP-Elevadores 2026 recibido y subido en bóveda digital.", user: "JEFE MANTENCIÓN", timestamp: Date.now() - 300000000 }
        ]
      },
      {
        title: "REPARACIÓN CHAPA DE ENTRADA (CERRADURA ACCESO)",
        description: "El arrendatario reporta que la cerradura del acceso principal está trabada y no permite girar la llave de forma segura. Requiere cambio urgente de cilindro/chapa.",
        category: "REQUERIMIENTO",
        priority: "ALTA",
        status: "FINALIZADA",
        applicantName: "Felipe Ignacio Carrasco",
        applicantEmail: "felipe.carrasco@gmail.com",
        assignedTo: "CERRAJERÍA MARÍN",
        requestDate: "2026-06-09",
        propertyId: "p-demo-10",
        propertyLabel: "EDIFICIO MARIN 450 - Depto 403",
        subtasks: [
          { id: crypto.randomUUID(), title: "Cambio de cilindro y manilla", description: "Cambiar cerradura completa por modelo Multipunto de seguridad", status: "COMPLETED", dueDate: "2026-06-12" }
        ],
        updates: [
          { id: crypto.randomUUID(), date: "2026-06-12", content: "Trabajos terminados por Cerrajero Marín. Se entregaron copias nuevas al arrendatario.", user: "OPERACIONES", timestamp: Date.now() - 15 * 24 * 3600 * 1000 }
        ]
      },
      {
        id: "sol-demo-1",
        title: "FILTRACIÓN EN LLAVE DE PASO BAÑO PRINCIPAL",
        description: "Se reporta goteo constante en la llave de paso de agua caliente del baño de la suite principal. Se está acumulando humedad en la tabiquería de yeso-cartón colindante.",
        category: "REQUERIMIENTO",
        priority: "MEDIA",
        status: "EN_PROCESO",
        applicantName: "ARRENDATARIO DEMO",
        applicantEmail: "arrendatario@demo.com",
        userCreator: "ARRENDATARIO DEMO",
        assignedTo: "CONSTRUCTORA ALPHA SPA [TEST]",
        requestDate: "2026-06-15",
        subtasks: [],
        updates: [
          { id: crypto.randomUUID(), date: "2026-06-16", content: "Solicitud de inspección ingresada. Se asigna prioridad media para envío de técnico sanitario a revisar empaquetadura y cañería.", user: "ADMINISTRADOR", timestamp: Date.now() - 3 * 86400000 }
        ]
      },
      {
        id: "sol-demo-2",
        title: "MANTENCIÓN PREVENTIVA DE CALEFONT ELÉCTRICO",
        description: "El termo eléctrico emite ruidos de vibración al encenderse y la temperatura del agua presenta variaciones bruscas de frío-calor. Se solicita revisión técnica preventiva del termostato y resistencia.",
        category: "SERVICIOS",
        priority: "BAJA",
        status: "PENDIENTE",
        applicantName: "ARRENDATARIO DEMO",
        applicantEmail: "arrendatario@demo.com",
        userCreator: "ARRENDATARIO DEMO",
        requestDate: "2026-06-18",
        subtasks: [],
        updates: []
      },
      {
        id: "sol-demo-3",
        title: "REEMBOLSO POR CAMBIO DE INTERRUPTOR AUTOMÁTICO",
        description: "El interruptor automático (breaker) del sector cocina falló cortando el suministro completo del refrigerador. Ante la emergencia, se contrató servicio autorizado certificado de urgencia para el cambio de la pieza de 16A de la marca Legrand. Se adjunta boleta del electricista para su reembolso.",
        category: "DOCUMENTACIÓN",
        priority: "ALTA",
        status: "FINALIZADA",
        applicantName: "ARRENDATARIO DEMO",
        applicantEmail: "arrendatario@demo.com",
        userCreator: "ARRENDATARIO DEMO",
        assignedTo: "MANTENCIÓN EXPRESS CHILE",
        requestDate: "2026-06-05",
        subtasks: [
          { id: crypto.randomUUID(), title: "Revisión de boleta y respaldo técnico", description: "Verificar boleta de electricista SEC autorizado", status: "COMPLETED", dueDate: "2026-06-06" },
          { id: crypto.randomUUID(), title: "Transferencia de fondos", description: "Abonar $45.000 de reembolso según contrato", status: "COMPLETED", dueDate: "2026-06-07" }
        ],
        updates: [
          { id: crypto.randomUUID(), date: "2026-06-06", content: "Recepción de boleta conforme. Se aprueba reembolso por emergencia técnica comprobada en sector de alimentos refrigerados.", user: "OPERACIONES", timestamp: Date.now() - 13 * 86400000 },
          { id: crypto.randomUUID(), date: "2026-06-07", content: "Transferencia realizada exitosamente a la cuenta del arrendatario. Se da por concluido el caso de reembolso.", user: "OPERACIONES", timestamp: Date.now() - 12 * 86400000 }
        ]
      }
    ];

    const seededSolicitudes = sampleRequests.map((req, index) => {
      const propSelected = req.propertyId 
        ? (properties.find(p => p.id === req.propertyId) || activeProps[index % activeProps.length])
        : activeProps[index % activeProps.length];
      const solId = req.id || `sol-${crypto.randomUUID().substring(0, 8)}`;
      return {
        id: solId,
        propertyId: propSelected.id,
        propertyLabel: req.propertyLabel || `${propSelected.building || 'PROPIEDAD'} - ${propSelected.code}`,
        title: req.title,
        description: req.description,
        status: req.status as any,
        priority: req.priority as any,
        category: req.category as any,
        requestDate: req.requestDate,
        updates: req.updates,
        subtasks: req.subtasks,
        userCreator: req.userCreator || "SISTEMA",
        timestamp: Date.now() - (index * 86400000),
        assignedTo: req.assignedTo,
        applicantName: req.applicantName,
        applicantEmail: req.applicantEmail,
        lastModifiedAt: req.requestDate + " 12:00",
        lastModifiedBy: "SISTEMA",
        statusHistory: [
          { status: "PENDIENTE", date: req.requestDate + " 09:00", user: "SISTEMA", timestamp: Date.now() - (index * 86400000) - 10000 }
        ],
        isTest: true
      };
    });

    setSolicitudes(seededSolicitudes);
    await storage.save('solicitudes', seededSolicitudes);
    bulkSyncToFirestore('solicitudes', seededSolicitudes.map(sol => ({ id: sol.id, data: sol })));
    console.log(`[App] Seeded ${seededSolicitudes.length} sample solicitudes.`);
  };

  const seedWorkOrders = async (force = false) => {
    // Check if we already have test data to avoid duplicates unless forced
    if (!force && workOrders.some(wo => wo.isTest)) return;

    let currentSuppliers = [...suppliers];
    let currentProperties = [...properties];

    // Ensure we have at least 2 suppliers for the OTs
    if (currentSuppliers.length < 2) {
      const testSuppliers = [
        { 
          id: 'sup-1', folio: 'PROV-001 [TEST]', taxId: '76.123.456-7', name: 'CONSTRUCTORA ALPHA SPA [TEST]', category: 'CONSTRUCCIÓN Y OBRAS', 
          taxDocumentType: 'FACTURA', requestDate: '2026-01-10', contactName: 'JUAN PEREZ', email: 'jperez@alpha.cl', 
          phone: '+56911223344', bankName: 'BANCO DE CHILE', accountType: 'CUENTA CORRIENTE', accountNumber: '123456789', 
          status: 'ACTIVE', userCreator: 'SISTEMA', timestamp: Date.now(), dueDiligenceDate: '2026-01-10', dueDiligenceRisk: 'RIESGO BAJO',
          complianceMaster: { conflictThirdParty: false, conflictExecutive: false, beneficiariesUAF: true, dueDiligenceCert: true },
          lockedBy: null, lockedAt: null,
          isTest: true
        },
        { 
          id: 'sup-2', folio: 'PROV-002 [TEST]', taxId: '77.987.654-3', name: 'SERVICIOS TÉCNICOS BETA [TEST]', category: 'MANTENCIÓN TÉCNICA', 
          taxDocumentType: 'FACTURA', requestDate: '2026-02-15', contactName: 'MARIA SOTO', email: 'msoto@beta.cl', 
          phone: '+56999887766', bankName: 'SANTANDER', accountType: 'CUENTA CORRIENTE', accountNumber: '987654321', 
          status: 'ACTIVE', userCreator: 'SISTEMA', timestamp: Date.now(), dueDiligenceDate: '2026-02-15', dueDiligenceRisk: 'RIESGO BAJO',
          complianceMaster: { conflictThirdParty: false, conflictExecutive: false, beneficiariesUAF: true, dueDiligenceCert: true },
          lockedBy: null, lockedAt: null,
          isTest: true
        },
        {
          id: 'sup-cerrajero', 
          folio: 'PROV-010 [TEST]', 
          taxId: '77.223.344-K', 
          name: 'CERRAJERÍA MARÍN', 
          category: 'MANTENCIÓN TÉCNICA', 
          taxDocumentType: 'BOLETA_HONORARIOS' as const, 
          requestDate: '2026-05-01', 
          contactName: 'HECTOR MARÍN', 
          email: 'hmarin@cerrajeriamarin.cl', 
          phone: '+56988776655', 
          bankName: 'BANCO ESTADO', 
          accountType: 'CUENTA RUT', 
          accountNumber: '12344556', 
          status: 'ACTIVE', 
          userCreator: 'SISTEMA', 
          timestamp: Date.now(), 
          dueDiligenceDate: '2026-05-01', 
          dueDiligenceRisk: 'RIESGO BAJO',
          complianceMaster: { conflictThirdParty: false, conflictExecutive: false, beneficiariesUAF: true, dueDiligenceCert: true },
          lockedBy: null, lockedAt: null,
          isTest: true
        }
      ];
      
      // Only add if they don't exist by name/taxId to avoid duplicates if partially seeded
      testSuppliers.forEach(ts => {
        if (!currentSuppliers.some(s => s.taxId === ts.taxId)) {
          currentSuppliers.push(ts);
        }
      });
      
      setSuppliers(currentSuppliers);
      await storage.save('suppliers', currentSuppliers);
      bulkSyncToFirestore('suppliers', testSuppliers.map(ts => ({ id: ts.id, data: ts })));
    }

    // Ensure we have at least 2 properties
    if (currentProperties.length < 2) {
      const testProperties = [
        { id: 'prop-1', code: 'CENT-101', building: 'EDIFICIO CENTENARIO', floor: '10', address: 'Catedral 1337', commune: 'Santiago', type: 'OFICINA', isTest: true },
        { id: 'prop-2', code: 'HUER-505', building: 'EDIFICIO HUERFANOS', floor: '5', address: 'Huérfanos 1160', commune: 'Santiago', type: 'OFICINA', isTest: true }
      ];

      testProperties.forEach(tp => {
        if (!currentProperties.some(p => p.code === tp.code)) {
          currentProperties.push(tp);
        }
      });

      setProperties(currentProperties);
      await storage.save('properties', currentProperties);
    }

    // Now we definitely have at least 2 of each (unless something went very wrong)
    const s1 = currentSuppliers[0];
    const s2 = currentSuppliers[1] || s1;
    const p1 = currentProperties[0];
    const p2 = currentProperties[1] || p1;

    if (!s1 || !p1) {
      console.error("No se pudieron cargar proveedores o propiedades para las OTs de prueba.");
      return;
    }

    const testWorkOrders: WorkOrder[] = [
      {
        id: 'ot-ex-1',
        folio: 'OT-2026-001 [TEST]',
        issueDate: '2026-03-01',
        preparedBy: 'CRISTIAN MUÑOZ R.',
        preparedByDept: 'CONTROL INTERNO',
        preparedByPhone: '56998204277',
        preparedByEmail: 'cristian.munoz@inmobiliariapro.cl',
        preparedAt: new Date().toISOString(),
        supplierId: s1.id,
        supplierName: s1.name,
        supplierTaxId: s1.taxId,
        supplierTaxDocumentType: s1.taxDocumentType,
        supplierAddress: s1.address || 'Santiago',
        supplierContact: s1.contactName,
        supplierPhone: s1.phone,
        supplierEmail: s1.email,
        quoteNumber: 'Q-1020',
        requestDate: '2026-03-01',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-03-15',
        paymentTerms: '30 DÍAS FECHA FACTURA',
        deliveryAddress: p1.address,
        items: [{ id: 'it-1', description: 'MANTENCIÓN PREVENTIVA ASCENSORES', quantity: 1, receivedQuantity: 0, unitPrice: 450000, total: 450000, status: 'PENDIENTE' }],
        subtotal: 450000, iva: 85500, total: 535500,
        specialInstructions: 'Realizar fuera de horario de oficina',
        category: 'MANTENCIÓN PREVENTIVA',
        status: 'APROBADA',
        propertyId: p1.id,
        propertyLabel: `${p1.building} - ${p1.code}`,
        timestamp: Date.now(),
        trackingResponsible: 'CRISTIAN MUÑOZ R.',
        trackingActions: [
          { id: 'act-1', date: new Date().toISOString(), description: 'COORDINACIÓN CON PROVEEDOR EXITOSA', user: 'CRISTIAN MUÑOZ R.', type: 'REALIZADA', actionResponsible: 'CRISTIAN MUÑOZ R.' },
          { id: 'act-2', date: new Date().toISOString(), deadline: '2026-03-20', description: 'PENDIENTE RECEPCIÓN DE MATERIALES', user: 'CRISTIAN MUÑOZ R.', type: 'PENDIENTE', actionResponsible: 'CRISTIAN MUÑOZ R.' }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      },
      {
        id: 'ot-ex-2',
        folio: 'OT-2026-002 [TEST]',
        issueDate: '2026-03-05',
        preparedBy: 'DIEGO DIAZ',
        preparedByDept: 'ANALISTA INMOBILIARIO',
        preparedByPhone: '56955443322',
        preparedByEmail: 'd.diaz@inmobiliariapro.cl',
        preparedAt: new Date().toISOString(),
        supplierId: s2.id,
        supplierName: s2.name,
        supplierTaxId: s2.taxId,
        supplierTaxDocumentType: s2.taxDocumentType,
        supplierAddress: s2.address || 'Santiago',
        supplierContact: s2.contactName,
        supplierPhone: s2.phone,
        supplierEmail: s2.email,
        quoteNumber: 'Q-5544',
        requestDate: '2026-03-05',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-03-20',
        paymentTerms: 'CONTRA RECEPCIÓN CONFORME',
        deliveryAddress: p2.address,
        items: [{ id: 'it-2', description: 'REPARACIÓN FILTRACIÓN PISO 5', quantity: 1, receivedQuantity: 0, unitPrice: 120000, total: 120000, status: 'PENDIENTE' }],
        subtotal: 120000, iva: 22800, total: 142800,
        specialInstructions: 'Urgente por filtración activa',
        category: 'EMERGENCIA',
        status: 'PENDIENTE_VB',
        propertyId: p2.id,
        propertyLabel: `${p2.building} - ${p2.code}`,
        timestamp: Date.now(),
        trackingResponsible: 'DIEGO DIAZ',
        trackingActions: [
          { id: 'act-3', date: new Date().toISOString(), description: 'VISITA TÉCNICA REALIZADA', user: 'DIEGO DIAZ', type: 'REALIZADA', actionResponsible: 'DIEGO DIAZ' },
          { id: 'act-4', date: new Date().toISOString(), deadline: '2026-03-15', description: 'PRESENTAR PRESUPUESTO REPARACIÓN', user: 'DIEGO DIAZ', type: 'PENDIENTE', actionResponsible: 'DIEGO DIAZ' }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      },
      {
        id: 'ot-ex-3',
        folio: 'OT-2026-003 [TEST]',
        issueDate: '2026-03-10',
        preparedBy: 'CARLOS ULLOA',
        preparedByDept: 'ADMINISTRACIÓN CENTENARIO',
        preparedByPhone: '56998204277',
        preparedByEmail: 'c.ulloa@inmobiliariapro.cl',
        preparedAt: new Date().toISOString(),
        supplierId: s1.id,
        supplierName: s1.name,
        supplierTaxId: s1.taxId,
        supplierTaxDocumentType: s1.taxDocumentType,
        supplierAddress: s1.address || 'Santiago',
        supplierContact: s1.contactName,
        supplierPhone: s1.phone,
        supplierEmail: s1.email,
        quoteNumber: 'Q-7788',
        requestDate: '2026-03-10',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-04-01',
        paymentTerms: '60 DÍAS FECHA FACTURA',
        deliveryAddress: p1.address,
        items: [{ id: 'it-3', description: 'PINTURA FACHADA NORTE', quantity: 1, receivedQuantity: 0, unitPrice: 2500000, total: 2500000, status: 'PENDIENTE' }],
        subtotal: 2500000, iva: 475000, total: 2975000,
        specialInstructions: 'Requiere andamios certificados',
        category: 'REPARACIÓN EXTRAORDINARIA',
        status: 'BORRADOR',
        propertyId: p1.id,
        propertyLabel: `${p1.building} - ${p1.code}`,
        timestamp: Date.now(),
        trackingResponsible: 'CARLOS ULLOA',
        trackingActions: [
          { id: 'act-5', date: new Date().toISOString(), deadline: '2026-03-25', description: 'REVISIÓN DE ANDAMIOS', user: 'CARLOS ULLOA', type: 'PENDIENTE', actionResponsible: 'CARLOS ULLOA' }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      },
      {
        id: 'ot-ex-4',
        folio: 'OT-2026-004 [TEST]',
        issueDate: '2026-03-12',
        preparedBy: 'DIEGO DIAZ',
        preparedByDept: 'ANALISTA INMOBILIARIO',
        preparedByPhone: '56955443322',
        preparedByEmail: 'd.diaz@inmobiliariapro.cl',
        preparedAt: new Date().toISOString(),
        supplierId: s2.id,
        supplierName: s2.name,
        supplierTaxId: s2.taxId,
        supplierTaxDocumentType: s2.taxDocumentType,
        supplierAddress: s2.address || 'Santiago',
        supplierContact: s2.contactName,
        supplierPhone: s2.phone,
        supplierEmail: s2.email,
        quoteNumber: 'Q-9911',
        requestDate: '2026-03-12',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-03-28',
        paymentTerms: '30 DÍAS FECHA FACTURA',
        deliveryAddress: p2.address,
        items: [{ id: 'it-4', description: 'CERTIFICACIÓN DE RED DE GAS SELLO VERDE', quantity: 1, receivedQuantity: 0, unitPrice: 380000, total: 380000, status: 'PENDIENTE' }],
        subtotal: 380000, iva: 72200, total: 452200,
        specialInstructions: 'Inspeccionar todas las conexiones de cocinas',
        category: 'CERTIFICACIÓN / SELLO',
        status: 'APROBADA',
        propertyId: p2.id,
        propertyLabel: `${p2.building} - ${p2.code}`,
        timestamp: Date.now(),
        trackingResponsible: 'DIEGO DIAZ',
        trackingActions: [
          { id: 'act-6', date: new Date().toISOString(), description: 'PRUEBA DE ESTANQUEIDAD APROBADA', user: 'DIEGO DIAZ', type: 'REALIZADA', actionResponsible: 'DIEGO DIAZ' },
          { id: 'act-7', date: new Date().toISOString(), deadline: '2026-03-26', description: 'GESTIÓN DE SELLO ANTE LA SEC', user: 'DIEGO DIAZ', type: 'PENDIENTE', actionResponsible: 'DIEGO DIAZ' }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      },
      {
        id: 'ot-ex-5',
        folio: 'OT-2026-005 [TEST]',
        issueDate: '2026-03-15',
        preparedBy: 'CRISTIAN MUÑOZ R.',
        preparedByDept: 'CONTROL INTERNO',
        preparedByPhone: '56998204277',
        preparedByEmail: 'cristian.munoz@inmobiliariapro.cl',
        preparedAt: new Date().toISOString(),
        supplierId: s1.id,
        supplierName: s1.name,
        supplierTaxId: s1.taxId,
        supplierTaxDocumentType: s1.taxDocumentType,
        supplierAddress: s1.address || 'Santiago',
        supplierContact: s1.contactName,
        supplierPhone: s1.phone,
        supplierEmail: s1.email,
        quoteNumber: 'Q-2200',
        requestDate: '2026-03-15',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-03-30',
        paymentTerms: '30 DÍAS FECHA FACTURA',
        deliveryAddress: p1.address,
        items: [{ id: 'it-5', description: 'MANTENCIÓN DE BOMBAS DE AGUA POTABLE', quantity: 1, receivedQuantity: 0, unitPrice: 850000, total: 850000, status: 'PENDIENTE' }],
        subtotal: 850000, iva: 161500, total: 1011500,
        specialInstructions: 'Coordinar cortes de agua programados con residentes',
        category: 'MANTENCIÓN PREVENTIVA',
        status: 'APROBADA',
        propertyId: p1.id,
        propertyLabel: `${p1.building} - ${p1.code}`,
        timestamp: Date.now(),
        trackingResponsible: 'CRISTIAN MUÑOZ R.',
        trackingActions: [
          { id: 'act-8', date: new Date().toISOString(), description: 'LIMPIEZA DE ESTANQUES REALIZADA', user: 'CRISTIAN MUÑOZ R.', type: 'REALIZADA', actionResponsible: 'CRISTIAN MUÑOZ R.' },
          { id: 'act-9', date: new Date().toISOString(), deadline: '2026-03-28', description: 'CAMBIO DE VALVULAS DE RETENCIÓN', user: 'CRISTIAN MUÑOZ R.', type: 'PENDIENTE', actionResponsible: 'CRISTIAN MUÑOZ R.' }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      },
      {
        id: 'ot-ex-6',
        folio: 'OT-2026-006 [TEST]',
        issueDate: '2026-03-18',
        preparedBy: 'DIEGO DIAZ',
        preparedByDept: 'ANALISTA INMOBILIARIO',
        preparedByPhone: '56955443322',
        preparedByEmail: 'd.diaz@inmobiliariapro.cl',
        preparedAt: new Date().toISOString(),
        supplierId: s2.id,
        supplierName: s2.name,
        supplierTaxId: s2.taxId,
        supplierTaxDocumentType: s2.taxDocumentType,
        supplierAddress: s2.address || 'Santiago',
        supplierContact: s2.contactName,
        supplierPhone: s2.phone,
        supplierEmail: s2.email,
        quoteNumber: 'Q-3411',
        requestDate: '2026-03-18',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-04-05',
        paymentTerms: 'CONTRA RECEPCIÓN CONFORME',
        deliveryAddress: p2.address,
        items: [{ id: 'it-6', description: 'REPOSICIÓN DE LUMINARIAS LED PASILLOS Y EMERGENCIAS', quantity: 1, receivedQuantity: 0, unitPrice: 620000, total: 620000, status: 'PENDIENTE' }],
        subtotal: 620000, iva: 117800, total: 737800,
        specialInstructions: 'Utilizar focos led de bajo consumo marca Philips',
        category: 'MANTENCIÓN CORRECTIVA',
        status: 'APROBADA',
        propertyId: p2.id,
        propertyLabel: `${p2.building} - ${p2.code}`,
        timestamp: Date.now(),
        trackingResponsible: 'DIEGO DIAZ',
        trackingActions: [
          { id: 'act-10', date: new Date().toISOString(), description: 'RETIRO DE EQUIPOS ANTIGUOS', user: 'DIEGO DIAZ', type: 'REALIZADA', actionResponsible: 'DIEGO DIAZ' },
          { id: 'act-11', date: new Date().toISOString(), deadline: '2026-04-02', description: 'MONTAJE DE NUEVOS EQUIPOS LED', user: 'DIEGO DIAZ', type: 'PENDIENTE', actionResponsible: 'DIEGO DIAZ' }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      },
      {
        id: 'ot-ex-7',
        folio: 'OT-2026-007 [TEST]',
        issueDate: '2026-03-22',
        preparedBy: 'CARLOS ULLOA',
        preparedByDept: 'ADMINISTRACIÓN CENTENARIO',
        preparedByPhone: '56998204277',
        preparedByEmail: 'c.ulloa@inmobiliariapro.cl',
        preparedAt: new Date().toISOString(),
        supplierId: s1.id,
        supplierName: s1.name,
        supplierTaxId: s1.taxId,
        supplierTaxDocumentType: s1.taxDocumentType,
        supplierAddress: s1.address || 'Santiago',
        supplierContact: s1.contactName,
        supplierPhone: s1.phone,
        supplierEmail: s1.email,
        quoteNumber: 'Q-4455',
        requestDate: '2026-03-22',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-04-10',
        paymentTerms: '60 DÍAS FECHA FACTURA',
        deliveryAddress: p1.address,
        items: [{ id: 'it-7', description: 'MANTENCIÓN DE GRUPO ELECTRÓGENO DE EMERGENCIA', quantity: 1, receivedQuantity: 0, unitPrice: 450000, total: 450000, status: 'PENDIENTE' }],
        subtotal: 450000, iva: 85500, total: 535500,
        specialInstructions: 'Incluir reporte de estado de baterías y nivel de petróleo',
        category: 'MANTENCIÓN PREVENTIVA',
        status: 'BORRADOR',
        propertyId: p1.id,
        propertyLabel: `${p1.building} - ${p1.code}`,
        timestamp: Date.now(),
        trackingResponsible: 'CARLOS ULLOA',
        trackingActions: [
          { id: 'act-12', date: new Date().toISOString(), deadline: '2026-04-08', description: 'PRUEBA DE ARRANQUE CON CARGA', user: 'CARLOS ULLOA', type: 'PENDIENTE', actionResponsible: 'CARLOS ULLOA' }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      },
      {
        id: 'ot-ex-8',
        folio: 'OT-2026-008 [TEST]',
        issueDate: '2026-03-25',
        preparedBy: 'DIEGO DIAZ',
        preparedByDept: 'ANALISTA INMOBILIARIO',
        preparedByPhone: '56955443322',
        preparedByEmail: 'd.diaz@inmobiliariapro.cl',
        preparedAt: new Date().toISOString(),
        supplierId: s2.id,
        supplierName: s2.name,
        supplierTaxId: s2.taxId,
        supplierTaxDocumentType: s2.taxDocumentType,
        supplierAddress: s2.address || 'Santiago',
        supplierContact: s2.contactName,
        supplierPhone: s2.phone,
        supplierEmail: s2.email,
        quoteNumber: 'Q-8855',
        requestDate: '2026-03-25',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-04-08',
        paymentTerms: 'CONTRA RECEPCIÓN CONFORME',
        deliveryAddress: p2.address,
        items: [{ id: 'it-8', description: 'SANETIZACIÓN Y FUMIGACIÓN DE SUBTERRÁNEOS', quantity: 1, receivedQuantity: 0, unitPrice: 180000, total: 180000, status: 'PENDIENTE' }],
        subtotal: 180000, iva: 34200, total: 214200,
        specialInstructions: 'Aplicar productos no tóxicos para mascotas',
        category: 'SANITIZACIÓN / FUMIGACIÓN',
        status: 'PENDIENTE_VB',
        propertyId: p2.id,
        propertyLabel: `${p2.building} - ${p2.code}`,
        timestamp: Date.now(),
        trackingResponsible: 'DIEGO DIAZ',
        trackingActions: [
          { id: 'act-13', date: new Date().toISOString(), description: 'DESRATIZACIÓN PERIMETRAL', user: 'DIEGO DIAZ', type: 'REALIZADA', actionResponsible: 'DIEGO DIAZ' },
          { id: 'act-14', date: new Date().toISOString(), deadline: '2026-04-05', description: 'FUMIGACIÓN QUÍMICA DE DUCTOS', user: 'DIEGO DIAZ', type: 'PENDIENTE', actionResponsible: 'DIEGO DIAZ' }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      },
      {
        id: 'ot-ex-9',
        folio: 'OT-2026-009 [TEST]',
        issueDate: '2026-03-28',
        preparedBy: 'CRISTIAN MUÑOZ R.',
        preparedByDept: 'CONTROL INTERNO',
        preparedByPhone: '56998204277',
        preparedByEmail: 'cristian.munoz@inmobiliariapro.cl',
        preparedAt: new Date().toISOString(),
        supplierId: s1.id,
        supplierName: s1.name,
        supplierTaxId: s1.taxId,
        supplierTaxDocumentType: s1.taxDocumentType,
        supplierAddress: s1.address || 'Santiago',
        supplierContact: s1.contactName,
        supplierPhone: s1.phone,
        supplierEmail: s1.email,
        quoteNumber: 'Q-1199',
        requestDate: '2026-03-28',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-04-12',
        paymentTerms: '30 DÍAS FECHA FACTURA',
        deliveryAddress: p1.address,
        items: [{ id: 'it-9', description: 'REPARACIÓN DE PORTÓN AUTOMÁTICO DE VEHÍCULOS', quantity: 1, receivedQuantity: 0, unitPrice: 290000, total: 290000, status: 'PENDIENTE' }],
        subtotal: 290000, iva: 55100, total: 345100,
        specialInstructions: 'Dejar operativo antes del fin de semana',
        category: 'MANTENCIÓN CORRECTIVA',
        status: 'APROBADA',
        propertyId: p1.id,
        propertyLabel: `${p1.building} - ${p1.code}`,
        timestamp: Date.now(),
        trackingResponsible: 'CRISTIAN MUÑOZ R.',
        trackingActions: [
          { id: 'act-15', date: new Date().toISOString(), description: 'CAMBIO DE PIÑÓN DE ARRASTRE', user: 'CRISTIAN MUÑOZ R.', type: 'REALIZADA', actionResponsible: 'CRISTIAN MUÑOZ R.' },
          { id: 'act-16', date: new Date().toISOString(), deadline: '2026-04-10', description: 'REPROGRAMACIÓN DE CONTROLES REMOTOS', user: 'CRISTIAN MUÑOZ R.', type: 'PENDIENTE', actionResponsible: 'CRISTIAN MUÑOZ R.' }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      },
      {
        id: 'ot-ex-10',
        folio: 'OT-2026-010 [TEST]',
        issueDate: '2026-04-02',
        preparedBy: 'DIEGO DIAZ',
        preparedByDept: 'ANALISTA INMOBILIARIO',
        preparedByPhone: '56955443322',
        preparedByEmail: 'd.diaz@inmobiliariapro.cl',
        preparedAt: new Date().toISOString(),
        supplierId: s2.id,
        supplierName: s2.name,
        supplierTaxId: s2.taxId,
        supplierTaxDocumentType: s2.taxDocumentType,
        supplierAddress: s2.address || 'Santiago',
        supplierContact: s2.contactName,
        supplierPhone: s2.phone,
        supplierEmail: s2.email,
        quoteNumber: 'Q-6022',
        requestDate: '2026-04-02',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-04-20',
        paymentTerms: 'CONTRA RECEPCIÓN CONFORME',
        deliveryAddress: p2.address,
        items: [{ id: 'it-10', description: 'REVISIÓN E INSTALACIÓN DE SENSORES DE HUMO', quantity: 1, receivedQuantity: 0, unitPrice: 950000, total: 950000, status: 'PENDIENTE' }],
        subtotal: 950000, iva: 180500, total: 1130500,
        specialInstructions: 'Probar funcionamiento de la central de alarmas',
        category: 'MEJORA / INSTALACIÓN',
        status: 'BORRADOR',
        propertyId: p2.id,
        propertyLabel: `${p2.building} - ${p2.code}`,
        timestamp: Date.now(),
        trackingResponsible: 'DIEGO DIAZ',
        trackingActions: [
          { id: 'act-17', date: new Date().toISOString(), deadline: '2026-04-15', description: 'LEVANTAMIENTO DE CENTRAL DE ALARMAS', user: 'DIEGO DIAZ', type: 'PENDIENTE', actionResponsible: 'DIEGO DIAZ' }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      },
      {
        id: 'ot-ex-11',
        folio: 'OT-2026-011 [TEST]',
        issueDate: '2026-04-05',
        preparedBy: 'CARLOS ULLOA',
        preparedByDept: 'ADMINISTRACIÓN CENTENARIO',
        preparedByPhone: '56998204277',
        preparedByEmail: 'c.ulloa@inmobiliariapro.cl',
        preparedAt: new Date().toISOString(),
        supplierId: s1.id,
        supplierName: s1.name,
        supplierTaxId: s1.taxId,
        supplierTaxDocumentType: s1.taxDocumentType,
        supplierAddress: s1.address || 'Santiago',
        supplierContact: s1.contactName,
        supplierPhone: s1.phone,
        supplierEmail: s1.email,
        quoteNumber: 'Q-7011',
        requestDate: '2026-04-05',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-04-25',
        paymentTerms: '60 DÍAS FECHA FACTURA',
        deliveryAddress: p1.address,
        items: [{ id: 'it-11', description: 'MANTENCIÓN EXTINTORES DE INCENDIO MULTIPROPÓSITO', quantity: 1, receivedQuantity: 0, unitPrice: 320000, total: 320000, status: 'PENDIENTE' }],
        subtotal: 320000, iva: 60800, total: 380800,
        specialInstructions: 'Dejar extintores de reemplazo provisorios mientras se recargan',
        category: 'MANTENCIÓN PREVENTIVA',
        status: 'PENDIENTE_VB',
        propertyId: p1.id,
        propertyLabel: `${p1.building} - ${p1.code}`,
        timestamp: Date.now(),
        trackingResponsible: 'CARLOS ULLOA',
        trackingActions: [
          { id: 'act-18', date: new Date().toISOString(), description: 'RETIRO DE EXTINTORES CADUCADOS', user: 'CARLOS ULLOA', type: 'REALIZADA', actionResponsible: 'CARLOS ULLOA' },
          { id: 'act-19', date: new Date().toISOString(), deadline: '2026-04-20', description: 'RECARGA DE PQS Y PRUEBAS CERTIFICADAS', user: 'CARLOS ULLOA', type: 'PENDIENTE', actionResponsible: 'CARLOS ULLOA' }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      },
      {
        id: 'ot-ex-12',
        folio: 'OT-2026-012 [TEST]',
        issueDate: '2026-04-08',
        preparedBy: 'DIEGO DIAZ',
        preparedByDept: 'ANALISTA INMOBILIARIO',
        preparedByPhone: '56955443322',
        preparedByEmail: 'd.diaz@inmobiliariapro.cl',
        preparedAt: new Date().toISOString(),
        supplierId: s2.id,
        supplierName: s2.name,
        supplierTaxId: s2.taxId,
        supplierTaxDocumentType: s2.taxDocumentType,
        supplierAddress: s2.address || 'Santiago',
        supplierContact: s2.contactName,
        supplierPhone: s2.phone,
        supplierEmail: s2.email,
        quoteNumber: 'Q-8099',
        requestDate: '2026-04-08',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-04-28',
        paymentTerms: 'CONTRA RECEPCIÓN CONFORME',
        deliveryAddress: p2.address,
        items: [{ id: 'it-12', description: 'REPARACIÓN TECHO Y CANALETAS DE AGUA LLUVIA', quantity: 1, receivedQuantity: 0, unitPrice: 1250000, total: 1250000, status: 'PENDIENTE' }],
        subtotal: 1250000, iva: 237500, total: 1487500,
        specialInstructions: 'Asegurar sellados antes de temporada invernal',
        category: 'REPARACIÓN EXTRAORDINARIA',
        status: 'APROBADA',
        propertyId: p2.id,
        propertyLabel: `${p2.building} - ${p2.code}`,
        timestamp: Date.now(),
        trackingResponsible: 'DIEGO DIAZ',
        trackingActions: [
          { id: 'act-20', date: new Date().toISOString(), description: 'LIMPIEZA DE HOJARASCA Y BASURA', user: 'DIEGO DIAZ', type: 'REALIZADA', actionResponsible: 'DIEGO DIAZ' },
          { id: 'act-21', date: new Date().toISOString(), deadline: '2026-04-25', description: 'SELLADO CON MEMBRANA ASFÁLTICA', user: 'DIEGO DIAZ', type: 'PENDIENTE', actionResponsible: 'DIEGO DIAZ' }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      },
      {
        id: 'ot-cerrajero-marin',
        folio: 'OT-2026-5561 [TEST]',
        issueDate: '2026-06-10',
        preparedBy: 'DIEGO DIAZ',
        preparedByDept: 'ANALISTA INMOBILIARIO',
        preparedByPhone: '56955443322',
        preparedByEmail: 'd.diaz@inmobiliariapro.cl',
        preparedAt: '2026-06-10T14:30:00.000Z',
        supplierId: 'sup-cerrajero',
        supplierName: 'CERRAJERÍA MARÍN',
        supplierTaxId: '77.223.344-K',
        supplierTaxDocumentType: 'BOLETA_HONORARIOS' as const,
        supplierAddress: 'Calle Marín 410, Santiago Centro',
        supplierContact: 'HECTOR MARÍN',
        supplierPhone: '+56988776655',
        supplierEmail: 'hmarin@cerrajeriamarin.cl',
        quoteNumber: 'Q-5561',
        requestDate: '2026-06-10',
        reqDept: 'Inmobiliario',
        deliveryDate: '2026-06-12',
        paymentTerms: 'CONTRA RECEPCIÓN CONFORME',
        deliveryAddress: 'Marin 450, Depto 403, Santiago',
        items: [{ 
          id: 'it-cer-1', 
          description: 'Reparación Chapa de Entrada - Cambio de cerradura de acceso principal dañada', 
          quantity: 1, 
          receivedQuantity: 1, 
          unitPrice: 55000, 
          total: 55000, 
          status: 'RECIBIDO' as const 
        }],
        subtotal: 55000, 
        iva: 0, 
        total: 55000,
        specialInstructions: 'Coordinar ingreso con arrendatario Felipe Carrasco (+56911223344)',
        category: 'MANTENCIÓN CORRECTIVA',
        specialty: 'Cerrajería',
        associatedInvoice: 'Boleta de Honorarios N° 5561',
        status: 'RECEPCIONADA' as const,
        propertyId: 'p-demo-10',
        propertyLabel: 'EDIFICIO MARIN 450 - Depto 403',
        timestamp: Date.now() - 15 * 24 * 3600 * 1000,
        trackingResponsible: 'DIEGO DIAZ',
        trackingActions: [
          { 
            id: 'act-cer-1', 
            date: '2026-06-10T15:00:00.000Z', 
            description: 'OT GENERADA Y ENVIADA A PROVEEDOR', 
            user: 'DIEGO DIAZ', 
            type: 'REALIZADA' as const, 
            actionResponsible: 'DIEGO DIAZ' 
          },
          { 
            id: 'act-cer-2', 
            date: '2026-06-12T11:00:00.000Z', 
            description: 'TRABAJO TERMINADO Y PROBADO CON ARRENDATARIO', 
            user: 'HECTOR MARÍN', 
            type: 'REALIZADA' as const, 
            actionResponsible: 'HECTOR MARÍN' 
          },
          { 
            id: 'act-cer-3', 
            date: '2026-06-12T16:00:00.000Z', 
            description: 'RECEPCIÓN TÉCNICA CONFORME - BOLETA PRESENTADA', 
            user: 'DIEGO DIAZ', 
            type: 'REALIZADA' as const, 
            actionResponsible: 'DIEGO DIAZ' 
          }
        ],
        isTest: true,
        lockedBy: null, lockedAt: null
      }
    ];

    setWorkOrders(prev => {
      // If force is active, we clear old test records to avoid mixing
      const base = force ? prev.filter(o => !o.isTest && !o.id.startsWith('ot-ex-')) : prev;
      const existingIds = new Set(base.map(o => o.id));
      const newOnes = testWorkOrders.filter(o => !existingIds.has(o.id));
      const updated = [...newOnes, ...base];
      storage.save('workOrders', updated);
      
      // Also sync each seeded item to Firestore
      bulkSyncToFirestore('work_orders', newOnes.map(wo => ({ id: wo.id, data: wo })));
      
      return updated;
    });
  };

  const seedMaintenanceExpedientes = async () => {
    if (maintenanceExpedientes.length > 0) return;

    const sampleExpedientes: MaintenanceExpediente[] = [
      {
        id: 'me-demo-10',
        propertyId: 'p-demo-10',
        propertyLabel: 'EDIFICIO MARIN 450 - Depto 403',
        title: 'REPARACIÓN DE CERRADURA PRINCIPAL',
        description: 'Cambio de cerradura de acceso principal dañada, cargado a la garantía de arriendo del departamento (boleta_cerrajero_marin.pdf).',
        status: 'FINALIZADO',
        priority: 'ALTA',
        category: 'REPARACIÓN',
        requestDate: '2026-06-10',
        userCreator: 'SISTEMA',
        timestamp: Date.now() - 15 * 24 * 3600 * 1000,
        assignedTo: 'CERRAJERÍA MARÍN',
        estimatedCost: 55000,
        actualCost: 55000,
        updates: [
          {
            id: 'upd-me-1',
            date: '2026-06-12',
            content: 'Chapa principal cambiada a modelo Multipunto de alta seguridad por Cerrajero Marín.',
            user: 'SISTEMA',
            timestamp: Date.now() - 15 * 24 * 3600 * 1000
          }
        ],
        subtasks: [
          {
            id: 'sub-me-1',
            title: 'Visita de cerrajero e instalación',
            status: 'FINALIZADA',
            completedAt: '2026-06-12'
          }
        ]
      },
      {
        id: 'me-demo-8',
        propertyId: 'p-demo-8',
        propertyLabel: 'EDIFICIO HUERFANOS - Depto 1402',
        title: 'REPARACIÓN PISO FLOTANTE',
        description: 'Reparación por daños severos al piso flotante del departamento de Huérfanos, descontado de la garantía de arriendo.',
        status: 'FINALIZADO',
        priority: 'MEDIA',
        category: 'REPARACIÓN',
        requestDate: '2026-06-18',
        userCreator: 'SISTEMA',
        timestamp: Date.now() - 10 * 24 * 3600 * 1000,
        assignedTo: 'CONSTRUCTORA ALPHA SPA [TEST]',
        estimatedCost: 450000,
        actualCost: 450000,
        updates: [
          {
            id: 'upd-me-2',
            date: '2026-06-20',
            content: 'Instalación de tablas de piso flotante nuevas finalizada y aprobada por inspección.',
            user: 'SISTEMA',
            timestamp: Date.now() - 10 * 24 * 3600 * 1000
          }
        ],
        subtasks: [
          {
            id: 'sub-me-2',
            title: 'Remoción de tablas dañadas por humedad',
            status: 'FINALIZADA',
            completedAt: '2026-06-19'
          },
          {
            id: 'sub-me-3',
            title: 'Instalación de piso flotante nuevo 8mm',
            status: 'FINALIZADA',
            completedAt: '2026-06-20'
          }
        ]
      }
    ];

    setMaintenanceExpedientes(sampleExpedientes);
    await storage.save('maintenanceExpedientes', sampleExpedientes);
    bulkSyncToFirestore('maintenance_expedientes', sampleExpedientes.map(exp => ({ id: exp.id, data: exp })));
    console.log(`[App] Seeded ${sampleExpedientes.length} sample maintenance expedientes.`);
  };

  const seedHelpDeskTickets = async () => {
    if (localStorage.getItem('helpdesk_seeded') === 'true') {
      return;
    }
    const defaultTickets: ITTicket[] = [
      {
        id: 'tk-1001',
        folio: 'FI-0402',
        title: 'BLOQUEO DE USUARIO EN MAESTRO DE DIRECCIONES F0101 ERP',
        description: 'Usuario de Finanzas reporta bloqueo en maestro de direcciones tras tres intentos fallidos de login en el ERP.',
        category: 'ACCESOS',
        priority: 'CRÍTICA',
        status: 'ABIERTO',
        userCreator: 'CRISTIAN MUÑOZ R.',
        requester: 'SILVIA TOBAR - CONTABILIDAD',
        assignedTo: 'SOPORTE TI ERP',
        createdAt: '2026-06-01T09:15:00.000Z',
        updatedAt: '2026-06-01T09:15:00.000Z',
        timestamp: Date.now() - 7 * 86400000,
        subtasks: [
          { id: 'sub-t1', title: 'VERIFICAR BLOQUEO EN MAESTRO DE DIRECCIONES', description: 'Revisar estado en tabla F0101 de ERP', status: 'PENDIENTE' }
        ],
        updates: []
      },
      {
        id: 'tk-1002',
        folio: 'FI-0403',
        title: 'ERROR DE CONEXIÓN CON SERVIDOR ERP INTEGRACIÓN API EXCEL',
        description: 'No se pueden importar los cobros mensuales masivos de arriendo a través del conector ERP. Intermitencia en puerto 3000.',
        category: 'SOFTWARE',
        priority: 'ALTA',
        status: 'EN_PROCESO',
        userCreator: 'CRISTIAN MUÑOZ R.',
        requester: 'OPERACIONES INMOBILIARIAS ASSETFLOW',
        assignedTo: 'DESARROLLO INTEGRACIONES',
        createdAt: '2026-06-02T10:30:00.000Z',
        updatedAt: '2026-06-03T11:45:00.000Z',
        timestamp: Date.now() - 6 * 86400000,
        subtasks: [
          { id: 'sub-t2', title: 'REVISAR BITÁCORA DEL PROTOCOLO TLS EN SERVIDOR', description: 'Auditar certificados SSL/TLS actualizados', status: 'FINALIZADA', completedAt: '2026-06-03T11:45:00.000Z' },
          { id: 'sub-t3', title: 'PROBAR CONECTOR BATCH R15132 EN ENTORNO DE PRUEBAS', description: 'Realizar simulación de envío masivo para inquilinos', status: 'PENDIENTE' }
        ],
        updates: [
          { id: 'upd-1', date: '2026-06-03T11:45:00.000Z', user: 'DESARROLLO INTEGRACIONES', content: 'Se revisó la bitácora técnica de TLS. Se detectó intermitencia en el handshaking.', timestamp: Date.now() - 6 * 86400000 }
        ]
      },
      {
        id: 'tk-1003',
        folio: 'FI-0404',
        title: 'ERROR EN LIQUIDACIÓN DE GARANTÍA EXENTA R15132',
        description: 'La liquidación de garantía para el inquilino Municipalidad de Santiago arrojó un error de cálculo de IVA (exento por ley).',
        category: 'SOFTWARE',
        priority: 'MEDIA',
        status: 'RESUELTO',
        userCreator: 'CRISTIAN MUÑOZ R.',
        requester: 'MUNICIPALIDAD LOTE INQUILINO',
        assignedTo: 'SOPORTE COMPLIANCE ERP',
        createdAt: '2026-06-03T08:00:00.000Z',
        updatedAt: '2026-06-04T16:20:50.000Z',
        timestamp: Date.now() - 5 * 86400000,
        subtasks: [
          { id: 'sub-t4', title: 'APLICAR EXCEPCIÓN DE LIQUIDACIÓN DE GARANTÍA', description: 'Configurar flag exento de impuestos para este contrato en ERP', status: 'FINALIZADA', completedAt: '2026-06-04T16:20:50.000Z' }
        ],
        updates: [
          { id: 'upd-2', date: '2026-06-04T16:20:50.000Z', user: 'SOPORTE COMPLIANCE ERP', content: 'Se configuró la exención tributaria en el maestro de contratos de arriendo asociados a la Municipalidad.', timestamp: Date.now() - 5 * 86400000 }
        ]
      },
      {
        id: 'tk-1004',
        folio: 'FI-0405',
        title: 'MANTENIMIENTO PREVENTIVO ROUTER OFICINA CENTENARIO',
        description: 'Planificación trimestral para la actualización estacional del firmware del router perimetral en edificio Centenario.',
        category: 'HARDWARE',
        priority: 'BAJA',
        status: 'ABIERTO',
        userCreator: 'CRISTIAN MUÑOZ R.',
        requester: 'ADMINISTRACIÓN GENERAL ASSETFLOW',
        assignedTo: 'OPERACIONES TI',
        createdAt: '2026-06-04T14:00:00.000Z',
        updatedAt: '2026-06-04T14:00:00.000Z',
        timestamp: Date.now() - 4 * 86400000,
        subtasks: [],
        updates: []
      }
    ];

    setTickets(defaultTickets);
    await storage.save('tickets', defaultTickets);
    bulkSyncToFirestore('tickets', defaultTickets.map(tk => ({ id: tk.id, data: tk })));
    localStorage.setItem('helpdesk_seeded', 'true');
    console.log(`[App] Seeded ${defaultTickets.length} sample Help Desk tickets.`);
  };

  const seedLeaseContracts = async () => {
    if (leaseContracts.length > 0) return;
    const defaultContracts: LeaseContract[] = [
      {
        id: "con-demo-tenant",
        propertyId: "p-demo-10",
        propertyLabel: "EDIFICIO MARIN 450 - Depto 403",
        tenantName: "ARRENDATARIO DEMO",
        tenantTaxId: "18.234.567-K",
        startDate: "2025-03-01",
        endDate: "2027-03-01",
        renewalDate: "2026-03-01",
        monthlyAmount: 450000,
        currency: "CLP",
        status: "VIGENTE" as any,
        userCreator: "SISTEMA",
        timestamp: Date.now(),
        observations: "EL REAJUSTE SE REALIZA ANUALMENTE SEGÚN LA VARIACIÓN DEL IPC.",
        isTest: true,
        payments: []
      }
    ];

    setLeaseContracts(defaultContracts);
    await storage.save('leaseContracts', defaultContracts);
    bulkSyncToFirestore('lease_contracts', defaultContracts.map(c => ({ id: c.id, data: c })));
    console.log(`[App] Seeded ${defaultContracts.length} lease contracts.`);
  };

  const hasExecutedBootstrapSeeding = useRef(false);

  useEffect(() => {
    if (!hydrationComplete.current || hasExecutedBootstrapSeeding.current) return;
    hasExecutedBootstrapSeeding.current = true;

    // AssetFlow Enterprise Background Table Integrity Initialization (deferred non-blocking queue)
    const runDeferredSeeds = async () => {
      try {
        if (workOrders.length === 0) {
          await seedWorkOrders();
        }
        if (properties.length === 0) {
          await seedMasterProperties();
        }
        if (solicitudes.length === 0) {
          await seedSolicitudes();
        }
        if (maintenanceExpedientes.length === 0) {
          await seedMaintenanceExpedientes();
        }
        if (tickets.length === 0) {
          await seedHelpDeskTickets();
        }
        if (leaseContracts.length === 0) {
          await seedLeaseContracts();
        }
      } catch (err) {
        console.warn("[ERP Engine] Deferred master tables validation warning:", err);
      }
    };

    const deferTimer = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => runDeferredSeeds());
      } else {
        runDeferredSeeds();
      }
    }, 100);

    return () => clearTimeout(deferTimer);
  }, [hydrationComplete.current]);

  useEffect(() => {
    let isBootstrapped = false;

    const finishBoot = () => {
      if (isBootstrapped) return;
      isBootstrapped = true;
      hydrationComplete.current = true;
      storage.setHydrationComplete();
      setIsSyncActive(storage.isSyncActive());
      setDbStatus('READY');

      // JDE JAS OMW Chunk Pre-warmer: Preload core interactive modules during browser idle time
      const warmCoreModules = () => {
        import('./components/Dashboard').catch(() => {});
        import('./components/WorkOrderCenter').catch(() => {});
        import('./components/JDEOrderApprovalModule').catch(() => {});
        import('./components/SupplierDirectory').catch(() => {});
      };
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(warmCoreModules, { timeout: 1500 });
      } else {
        setTimeout(warmCoreModules, 400);
      }
    };

    // FastBoot Watchdog: Guarantee UI paint within 2500ms max under any storage constraint
    const bootWatchdog = setTimeout(() => {
      if (!isBootstrapped) {
        console.warn("[JDE FastBoot Kernel] Storage hydration watchdog reached. Force unlocking interface.");
        finishBoot();
      }
    }, 2500);

    const bootstrap = async () => {
      try {
        await storage.init();
        await refreshAppData();
      } catch (error) {
        console.error("[JDE FastBoot Kernel] Error initializing storage data:", error);
      } finally {
        clearTimeout(bootWatchdog);
        finishBoot();
      }
    };
    bootstrap();

    const handleBeforeUnload = () => {
      if (hydrationComplete.current) {
        console.log("App closing, final save attempt...");
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleManualBackup = async () => {
    const allData: any = {
      _metadata: { 
        backupDate: new Date().toISOString(),
        user: currentUser,
        version: 'v24'
      },
      suppliers,
      transactions,
      auditLog,
      workOrders,
      properties,
      contracts,
      officialDocs,
      tickets,
      b13Reports,
      b4Reports,
      note14Reports,
      accountingReconciliations,
      pettyCashFunds,
      pettyCashExpenses,
      leaseContracts,
      appraisals,
      settings: credentials
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Respaldo_AssetFlow_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addAuditEntry('UPDATE', 'SISTEMA', 'SISTEMA', 'MANUAL_BACKUP_CREATED', { field: 'BACKUP', new: 'MANUAL_BACKUP_CREATED' });
  };

  useEffect(() => {
    if (!isSyncActive) return;
    const interval = setInterval(async () => {
      const remoteData = await storage.checkForRemoteChanges();
      if (remoteData) await refreshAppData();
    }, 30000);
    return () => clearInterval(interval);
  }, [isSyncActive]);

  useEffect(() => {
    if (!hydrationComplete.current) return;

    const candidateStores: { storeName: string; data: any }[] = [
      { storeName: 'suppliers', data: suppliers },
      { storeName: 'transactions', data: transactions },
      { storeName: 'auditLog', data: auditLog },
      { storeName: 'workOrders', data: workOrders },
      { storeName: 'properties', data: properties },
      { storeName: 'contracts', data: contracts },
      { storeName: 'officialDocs', data: officialDocs },
      { storeName: 'tickets', data: tickets },
      { storeName: 'b13Reports', data: b13Reports },
      { storeName: 'b4Reports', data: b4Reports },
      { storeName: 'note14Reports', data: note14Reports },
      { storeName: 'accountingReconciliations', data: accountingReconciliations },
      { storeName: 'dueDiligenceReports', data: dueDiligenceReports },
      { storeName: 'leaseContracts', data: leaseContracts },
      { storeName: 'securityDeposits', data: securityDeposits },
      { storeName: 'reportTemplates', data: reportTemplates },
      { storeName: 'reportReviews', data: reportReviews },
      { storeName: 'pettyCashFunds', data: pettyCashFunds },
      { storeName: 'pettyCashExpenses', data: pettyCashExpenses },
      { storeName: 'appraisals', data: appraisals },
      { storeName: 'applicants', data: applicants },
      { storeName: 'settings', data: credentials },
      { storeName: 'settings_logo', data: companyLogo },
      { storeName: 'solicitudes', data: solicitudes },
      { storeName: 'maintenanceExpedientes', data: maintenanceExpedientes },
      { storeName: 'propertyInspections', data: propertyInspections },
      { storeName: 'wmsLogistics', data: wmsWorkspace }
    ];

    const dirtyEntries = candidateStores.filter(
      entry => lastPersistedStateRef.current[entry.storeName] !== entry.data
    );
    if (dirtyEntries.length === 0) return;

    const sync = async () => {
      setLastSaveStatus('BUSY');
      try {
        await storage.saveMultiple(dirtyEntries);
        dirtyEntries.forEach(e => {
          lastPersistedStateRef.current[e.storeName] = e.data;
        });
        setLastSyncTime(Date.now());
      } finally {
        setLastSaveStatus('OK');
      }
    };

    const timer = setTimeout(sync, 6000); // 6s differential debounce prevents UI main-thread locking
    return () => clearTimeout(timer);
  }, [suppliers, transactions, auditLog, workOrders, properties, contracts, officialDocs, tickets, b13Reports, b4Reports, note14Reports, accountingReconciliations, dueDiligenceReports, leaseContracts, securityDeposits, reportTemplates, reportReviews, pettyCashFunds, pettyCashExpenses, appraisals, applicants, credentials, companyLogo, solicitudes, maintenanceExpedientes, propertyInspections, wmsWorkspace]);

  const [isProcessingSync, setIsProcessingSync] = useState(false);

  const handleCreateFile = async () => {
    setIsProcessingSync(true);
    try {
      const success = await storage.createNewDatabaseFile();
      if (success) {
        setIsSyncActive(true);
        setIsDbConnected(true);
        setShowSyncOptions(false);
        alert("¡Archivo creado con éxito! Guárdelo en su OneDrive compartido para que otros puedan vincularse.");
      }
    } finally {
      setIsProcessingSync(false);
    }
  };

  const handleLinkFile = async () => {
    setIsProcessingSync(true);
    try {
      const success = await storage.linkExistingFile();
      if (success) {
        setIsSyncActive(true);
        setIsDbConnected(true);
        setShowSyncOptions(false);
        await refreshAppData();
      }
    } finally {
      setIsProcessingSync(false);
    }
  };

  const handleUnlink = async () => {
    if (confirm("¿Está seguro de que desea desvincular el equipo? Los datos seguirán guardados localmente pero no se sincronizarán con el archivo compartido.")) {
      await storage.clearHandle();
      setIsSyncActive(false);
      setIsDbConnected(false);
    }
  };

  const removeUndefinedDeep = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (Array.isArray(obj)) {
      return obj.map(item => removeUndefinedDeep(item));
    }
    if (typeof obj === 'object') {
      if (obj instanceof Date) return obj.toISOString();
      if (obj && typeof obj.isEqual === 'function') return obj;
      if (obj && obj.constructor && obj.constructor.name === 'FieldValue') return obj;
      
      const cleaned: any = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = removeUndefinedDeep(val);
        } else {
          cleaned[key] = null;
        }
      }
      return cleaned;
    }
    return obj;
  };

  const syncToFirestore = async (collectionName: string, id: string, data: any) => {
    if (isDemoClient) return;
    try {
      const preparedData = await prepareRecordForFirestore(data, collectionName, id);
      if (!isConfigValid || isFirestoreQuotaExceeded()) return;
      const docRef = doc(db, collectionName, id);
      const cleanedData = removeUndefinedDeep(preparedData);
      await setDoc(docRef, { ...cleanedData, syncedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
    }
  };

  const handleUpdateWmsWorkspace = (next: WmsWorkspaceState) => {
    const nowTs = Date.now();
    const enriched: WmsWorkspaceState = {
      ...next,
      updatedAt: nowTs
    };
    setWmsWorkspace(enriched);
    storage.save('wmsLogistics', enriched);
    lastPersistedStateRef.current.wmsLogistics = enriched;

    const partitions: Array<{
      docId: string;
      section: 'items' | 'locations' | 'balances' | 'tasks' | 'movements' | 'shipments';
      records: any[];
    }> = [
      { docId: 'wms_items', section: 'items', records: enriched.items },
      { docId: 'wms_locations', section: 'locations', records: enriched.locations },
      { docId: 'wms_balances', section: 'balances', records: enriched.balances },
      { docId: 'wms_tasks', section: 'tasks', records: enriched.tasks },
      { docId: 'wms_movements', section: 'movements', records: enriched.movements },
      { docId: 'wms_shipments', section: 'shipments', records: enriched.shipments }
    ];

    partitions.forEach(part => {
      syncToFirestore('wms_logistics', part.docId, {
        id: part.docId,
        section: part.section,
        records: part.records,
        updatedAt: nowTs,
        updatedBy: currentUser || 'SISTEMA'
      });
    });
  };

  const deleteFromFirestore = async (collectionName: string, id: string) => {
    if (isDemoClient || !isConfigValid || isFirestoreQuotaExceeded()) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  const bulkSyncToFirestore = async (collectionName: string, items: { id: string, data: any }[]) => {
    if (isDemoClient || items.length === 0) return;
    try {
      const preparedItems = await Promise.all(
        items.map(async (item) => ({
          id: item.id,
          data: removeUndefinedDeep(await prepareRecordForFirestore(item.data, collectionName, item.id))
        }))
      );
      if (!isConfigValid || isFirestoreQuotaExceeded()) return;
      const chunkSize = 50; // Smaller batch size to stay well below Firestore 10MB batch payload limit
      for (let i = 0; i < preparedItems.length; i += chunkSize) {
        if (isFirestoreQuotaExceeded()) break;
        const chunk = preparedItems.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const docRef = doc(db, collectionName, item.id);
          batch.set(docRef, { ...item.data, syncedAt: serverTimestamp() }, { merge: true });
        });
        
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/BULK`);
    }
  };

  const bulkDeleteFromFirestore = async (collectionName: string, ids: string[]) => {
    if (!isConfigValid || isFirestoreQuotaExceeded() || ids.length === 0) return;
    try {
      const chunkSize = 400;
      for (let i = 0; i < ids.length; i += chunkSize) {
        if (isFirestoreQuotaExceeded()) break;
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          const docRef = doc(db, collectionName, id);
          batch.delete(docRef);
        });
        
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/BULK`);
    }
  };

  const addAuditEntry = (
    action: AuditEntry['action'], 
    entityType: AuditEntry['entityType'],
    entityId: string, 
    entityName?: string,
    details?: { field?: string, old?: any, new?: any, moduleName?: string, details?: string, severity?: AuditEntry['severity'], user?: string }
  ) => {
    const activeUserName = details?.user || currentUser || 'SISTEMA';
    const userRole = credentials[activeUserName]?.role || (activeUserName.includes('CRISTIAN') || activeUserName === 'DEVELOPER' ? 'ADMINISTRADOR' : 'USUARIO');
    
    const newEntry = buildAuditEntry({
      action,
      entityType,
      entityId,
      entityName,
      user: activeUserName,
      userRole,
      moduleName: details?.moduleName || activeModule,
      details: details?.details,
      fieldChanged: details?.field,
      oldValue: details?.old,
      newValue: details?.new,
      severity: details?.severity
    });

    setAuditLog(prev => {
      const updated = [newEntry, ...prev];
      storage.save('auditLog', updated);
      return updated;
    });
    syncToFirestore('audit_logs', newEntry.id, newEntry);
  };

  // Registra una nueva transacción exitosa en el sistema y genera automáticamente su voucher PDF descargable
  const handleAddNewTransaction = (newTx: Transaction, autoDownloadVoucher: boolean = true) => {
    setTransactions(prev => {
      const updated = [newTx, ...prev];
      storage.save('transactions', updated);
      return updated;
    });
    syncToFirestore('transactions', newTx.id, newTx);
    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx)
    }).catch(() => {});
    addAuditEntry('CREATE', 'TRANSACCION', newTx.id, `TRANSACCIÓN: ${newTx.description || 'Sin descripción'}`, { field: 'MONTO', new: newTx.amount });
    if (autoDownloadVoucher) {
      emitTransactionVoucher(newTx, companyLogo, currentUser || 'SISTEMA', true);
    }
  };

  // Trazabilidad global automática de navegación de módulos
  const prevAuditModuleRef = useRef<ModuleType | null>(null);
  useEffect(() => {
    if (currentUser) {
      if (prevAuditModuleRef.current && prevAuditModuleRef.current !== activeModule) {
        addAuditEntry('UPDATE', 'SISTEMA', activeModule, `Navegación al módulo: ${activeModule}`, {
          moduleName: activeModule,
          field: 'MODULO_ACTIVO',
          old: prevAuditModuleRef.current,
          new: activeModule,
          details: `Usuario ${currentUser} ingresó al módulo ${activeModule} desde ${prevAuditModuleRef.current}`
        });
      }
      prevAuditModuleRef.current = activeModule;
    }
  }, [activeModule, currentUser]);

  // Escucha universal de acciones operativas (exportaciones Excel, impresiones, reportes)
  useEffect(() => {
    const handleGlobalAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { action, entityType, entityId, entityName, details, field, oldValue, newValue, severity } = customEvent.detail;
        addAuditEntry(action || 'UPDATE', entityType || 'SISTEMA', entityId || `ACT-${Date.now()}`, entityName, {
          moduleName: activeModule,
          details: details || `Operación del sistema registrada: ${entityName || entityId}`,
          field,
          old: oldValue,
          new: newValue,
          severity
        });
      }
    };
    window.addEventListener('assetflow:action', handleGlobalAction);
    return () => {
      window.removeEventListener('assetflow:action', handleGlobalAction);
    };
  }, [activeModule, currentUser]);

  const handleAddReversalRequest = async (reversalData: {
    transactionId: string;
    transactionDescription: string;
    transactionAmount: number;
    transactionType: 'INCOME' | 'EXPENSE';
    transactionDate: string;
    requesterUser: string;
    requesterEmail: string;
    reason: string;
  }) => {
    const newId = `REV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullRequest: ReversalRequest = {
      ...reversalData,
      id: newId,
      status: 'PENDIENTE',
      createdAt: Date.now(),
      controlInternoStatus: 'PENDIENTE',
      analistaStatus: 'PENDIENTE',
      jefeStatus: 'PENDIENTE',
    };

    setReversalRequests(prev => [fullRequest, ...prev]);
    await syncToFirestore('reversal_requests', newId, fullRequest);
    addAuditEntry('CREATE', 'TRANSACCION', newId, `Solicitud de reversa para transacción: ${reversalData.transactionDescription}`);
  };

  const handleApproveReversalRequest = async (requestId: string, approvalRole: 'CONTROL_INTERNO' | 'ANALISTA' | 'JEFE', action: 'APROBADO' | 'RECHAZADO') => {
    const req = reversalRequests.find(r => r.id === requestId);
    if (!req) return;

    let updatedReq = { ...req };
    const now = Date.now();

    if (approvalRole === 'CONTROL_INTERNO') {
      updatedReq.controlInternoStatus = action;
      updatedReq.controlInternoUser = currentUser || 'CONTROL INTERNO';
      updatedReq.controlInternoAt = now;
    } else if (approvalRole === 'ANALISTA') {
      updatedReq.analistaStatus = action;
      updatedReq.analistaUser = currentUser || 'ANALISTA';
      updatedReq.analistaAt = now;
    } else if (approvalRole === 'JEFE') {
      updatedReq.jefeStatus = action;
      updatedReq.jefeUser = currentUser || 'JEFE DE DEPARTAMENTO';
      updatedReq.jefeAt = now;
    }

    // If any role rejects, the whole request is rejected
    if (updatedReq.controlInternoStatus === 'RECHAZADO' || 
        updatedReq.analistaStatus === 'RECHAZADO' || 
        updatedReq.jefeStatus === 'RECHAZADO') {
      updatedReq.status = 'RECHAZADO';
    } 
    // If all three approve, the request is approved and the transaction is deleted
    else if (updatedReq.controlInternoStatus === 'APROBADO' && 
             updatedReq.analistaStatus === 'APROBADO' && 
             updatedReq.jefeStatus === 'APROBADO') {
      updatedReq.status = 'APROBADO';
      
      const tId = updatedReq.transactionId;
      const t = transactions.find(x => x.id === tId);
      if (t) {
        setTransactions(p => p.filter(x => x.id !== tId));
        await deleteFromFirestore('transactions', tId);
        addAuditEntry('DELETE', 'TRANSACCION', tId, `REVERSADA AUTO TRIPLE APROBADA: ${t.description}`);
      }
    }

    setReversalRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    await syncToFirestore('reversal_requests', requestId, updatedReq);
    addAuditEntry('UPDATE', 'TRANSACCION', requestId, `Aprobación ${approvalRole} como ${action} por ${currentUser}`);
  };

  const fixJdeStamps = () => {
    let nextJe = dataService.getNextNumber('je');
    const workstation = dataService.getWorkStationId();
    const transProgram = dataService.getProgramId('TRANSACCION');
    
    const updatedTrans = transactions.map(t => {
      if (!t.programId || !t.workStationId || !t.nextNumberSeq) {
        const enriched = {
          ...t,
          programId: t.programId || transProgram,
          workStationId: t.workStationId || workstation,
          nextNumberSeq: t.nextNumberSeq || nextJe++,
          batchNumber: t.batchNumber || `BAT-FIX-${Date.now().toString().slice(-4)}`
        };
        (enriched as any).hashSignature = dataService.generateHashSignature(enriched);
        syncToFirestore('transactions', t.id, enriched);
        return enriched;
      }
      return t;
    });
    
    setTransactions(updatedTrans);
    addAuditEntry('REBUILD', 'SISTEMA', 'DATABASE_AUDIT', 'Sellado y regularización masiva de marcas de auditoría ERP F0911');
  };

  // Coherence Check Effect (Runs once on hydration to avoid render-loop CPU exhaustion)
  useEffect(() => {
    if (!hasCheckedCoherence.current && hydrationComplete.current && currentUser) {
      hasCheckedCoherence.current = true;
      const result = dataService.checkCoherence({
        transactions,
        workOrders,
        suppliers,
        pettyCashExpenses,
        pettyCashFunds,
        contracts,
        properties,
        leaseContracts
      });

      if (!result.valid) {
        console.warn("Coherence issues detected:", result.errors);
      }

      // Auto-generate missing transactions for paid work orders
      const autoTransactions = dataService.generateCoherentTransactions(workOrders, transactions);
      if (autoTransactions.length > 0) {
        setTransactions(prev => [...prev, ...autoTransactions]);
        autoTransactions.forEach(t => {
          syncToFirestore('transactions', t.id, t);
          addAuditEntry('CREATE', 'TRANSACCION', t.id, t.description, { field: 'AUTO_GENERATED', new: true });
        });
      }
    }
  }, [currentUser]);

  const handleUpdateEntity = <T extends { id: string }>(
    entityType: EntityType,
    id: string,
    field: keyof T,
    value: any,
    stateSetter: React.Dispatch<React.SetStateAction<T[]>>,
    collectionName: string,
    entityName?: string
  ) => {
    stateSetter(prev => {
      const oldEntity = prev.find(e => e.id === id);
      if (!oldEntity) return prev;
      
      const updatedEntity = { ...oldEntity, [field]: value };
      
      // Sync to Firestore
      syncToFirestore(collectionName, id, updatedEntity);
      
      // Audit
      addAuditEntry(
        'UPDATE', 
        entityType as any, 
        id, 
        entityName || (oldEntity as any).name || (oldEntity as any).description || (oldEntity as any).folio || id, 
        { field: String(field).toUpperCase(), old: (oldEntity as any)[field], new: value }
      );
      
      return prev.map(e => e.id === id ? updatedEntity : e);
    });
  };

  const handleUpdateTransaction = (id: string, field: keyof Transaction, value: any) => {
    handleUpdateEntity<Transaction>(
      EntityType.TRANSACCION,
      id,
      field,
      value,
      setTransactions,
      'transactions'
    );
  };

  const handleReGrantPermission = async () => {
    const success = await storage.linkExistingFile(); // This will trigger the picker/permission request
    if (success) {
      setIsSyncActive(true);
      setIsDbConnected(true);
      await refreshAppData();
    }
  };

  if (dbStatus === 'LOADING') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#071727] text-slate-100 font-sans select-none relative overflow-hidden">
        {/* ERP Grid Matrix Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"></div>
        
        <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6">
          {/* ERP / AssetFlow Brand Header */}
          <div className="flex items-center gap-3 mb-6 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#006D3D] via-[#0B3C5D] to-[#071727] flex items-center justify-center border border-emerald-400/40 shadow-inner">
              <Building2 className="text-emerald-300" size={19} />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-widest text-white uppercase font-mono">ASSETFLOW ENTERPRISE</h1>
              <p className="text-[9px] font-bold text-sky-300 tracking-wider font-mono">ASSETFLOW ENTERPRISE • JAS 9.2</p>
            </div>
          </div>

          {/* High-Tech ERP Loading Ring & Pulse */}
          <div className="relative mb-6">
            <div className="w-14 h-14 rounded-full border-2 border-sky-500/20 border-t-emerald-400 border-r-sky-400 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Database className="text-sky-400/80 animate-pulse" size={18} />
            </div>
          </div>

          <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white text-center mb-1.5 font-mono">
            INICIANDO RUNTIME ENTERPRISE ERP
          </h2>
          <p className="text-[10px] text-slate-400 font-mono text-center tracking-wide mb-5">
            Cargando Objetos FDA, Caché Local & Maestro de Direcciones F0101
          </p>

          {/* Fast Progress Indicator */}
          <div className="w-60 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 shadow-inner">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-sky-400 to-[#FFCC00] animate-[pulse_1s_infinite] w-full origin-left"></div>
          </div>

          <div className="mt-4 flex items-center gap-3 text-[9px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              JAS FastBoot
            </span>
            <span>•</span>
            <span>Heap Optimizado</span>
            <span>•</span>
            <span>Port 3000</span>
          </div>
        </div>
      </div>
    );
  }

  const handleVerifyQRAccess = (tenantName: string, tenantEmail: string, tenantPhone?: string) => {
    // Log them in dynamically by injecting their credential profile
    const updatedCredentials = {
      ...credentials,
      [tenantName]: {
        password: "token_login",
        role: "ARRENDATARIO" as const,
        deptTitle: "INQUILINO RESIDENCIAL",
        email: tenantEmail,
        phone: tenantPhone || ''
      }
    };
    setCredentials(updatedCredentials);
    sessionStorage.setItem('active_user', tenantName);
    setCurrentUser(tenantName);
    addAuditEntry('LOGIN', 'SISTEMA', 'SESSION', `VERIFICACIÓN QR EXITOSA: ${tenantName}`);
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
    setQrAccessParams(null);
  };

  // Render Verification Screen if QR code scanned
  if (qrAccessParams && !currentUser) {
    const matchedContract = leaseContracts.find(c => c.id === qrAccessParams.token);
    
    return (
      <div className="h-screen w-screen bg-[#0F172A] flex items-center justify-center font-sans p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-md p-8 shadow-2xl relative text-white">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-[180px] h-[55px] bg-white rounded-xl p-2 border border-slate-800 flex items-center justify-center shadow-md select-none"
                 dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} />
            <div className="text-center">
              <h2 className="text-xl font-black uppercase tracking-[0.2em] text-emerald-500">Inmobiliaria Pro</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Portal de Arrendatario Seguro</p>
            </div>
          </div>

          {!matchedContract ? (
            <div className="text-center space-y-4">
              <div className="bg-rose-950/40 border border-rose-900/50 p-4 rounded-2xl text-rose-300 text-xs">
                <AlertTriangle className="mx-auto mb-2 text-rose-500 animate-pulse" size={24} />
                <p className="font-bold uppercase tracking-wider">Error de Enlace</p>
                <p className="mt-1 leading-normal text-slate-400 font-normal">
                  El código QR escaneado no coincide con ningún contrato activo en nuestros servidores. 
                  Por favor, verifique el documento físico o contacte a soporte técnico.
                </p>
              </div>
              <button
                onClick={() => {
                  window.history.replaceState({}, document.title, window.location.pathname);
                  setQrAccessParams(null);
                }}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Volver al Acceso General
              </button>
            </div>
          ) : (
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="animate-spin text-emerald-500 mb-2" size={32} />
                <p className="text-xs text-slate-400">Cargando verificación...</p>
              </div>
            }>
              <TenantVerificationForm 
                contract={matchedContract} 
                onSuccess={(name, email, phone) => handleVerifyQRAccess(name, email, phone)}
                onCancel={() => {
                  window.history.replaceState({}, document.title, window.location.pathname);
                  setQrAccessParams(null);
                }}
              />
            </Suspense>
          )}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#002D62] flex flex-col items-center justify-center text-white font-mono text-xs gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span>Cargando Terminal de Acceso Enterprise...</span>
        </div>
      }>
        <UserSessionModal 
          onConfirm={(name) => { 
            if (typeof window !== 'undefined' && window.location.search) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            sessionStorage.setItem('active_user', name); 
            setCurrentUser(name);
            const isSoloEmpleo = credentials[name]?.role === 'SOLO_EMPLEO' || name.includes('PIÑA') || name.includes('PINA');
            const isClienteDemo = credentials[name]?.role === 'CLIENTE_DEMO' || name === 'CLIENTE DEMO';
            if (isSoloEmpleo) {
              setActiveModule('BUSQUEDA_EMPLEO');
            } else if (isClienteDemo) {
              setActiveModule('SYSTEM_LANDING');
            } else {
              setActiveModule('DASHBOARD');
            }
            addAuditEntry('LOGIN', 'SISTEMA', 'SESSION', name, {
              user: name,
              moduleName: 'CONTROL_ACCESO',
              details: `Inicio de sesión exitoso del usuario ${name}`
            });
          }} 
          onFailedAttempt={(name) => {
            addAuditEntry('LOGIN_FAILED', 'SEGURIDAD', `SEC-${Date.now()}`, name, {
              user: name || 'DESCONOCIDO',
              moduleName: 'CONTROL_ACCESO',
              severity: 'SEGURIDAD',
              details: `Intento de acceso fallido con contraseña incorrecta para la cuenta: ${name}`
            });
          }}
          currentCredentials={credentials} 
          onGoogleLogin={handleGoogleLogin}
          isFirebaseConfigured={isConfigValid}
          isFirebaseAuthenticated={!!firebaseUser}
          companyLogo={companyLogo}
          onExit={() => {
            try {
              sessionStorage.clear();
            } catch (e) {
              // ignore
            }
            addAuditEntry('SECURITY', 'SEGURIDAD', `TERM-${Date.now()}`, 'ANÓNIMO', {
              user: 'ANÓNIMO',
              moduleName: 'CONTROL_ACCESO',
              severity: 'SEGURIDAD',
              details: 'Desconexión y cierre voluntario de terminal desde la pantalla de login'
            });
          }}
        />
      </Suspense>
    );
  }

  const handleLogout = () => {
    addAuditEntry('LOGOUT', 'SISTEMA', 'SESSION', currentUser || 'SISTEMA', {
      user: currentUser || 'SISTEMA',
      moduleName: 'CONTROL_ACCESO',
      details: `Cierre voluntario de sesión del usuario ${currentUser}`
    });
    sessionStorage.removeItem('active_user');
    setCurrentUser(null);
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (isConfigValid) {
      signOut(auth).catch((error) => console.error("Error signing out from Firebase:", error));
    }
  };

  // Gate for tenant user - completely isolates access to Tenant Portal
  if (currentUser && credentials[currentUser]?.role === 'ARRENDATARIO') {
    return (
      <ErrorBoundary>
        <Suspense fallback={
          <div className="h-screen flex flex-col items-center justify-center bg-[#0F172A] text-white font-sans">
            <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Iniciando Portal de Arrendatario...</h3>
          </div>
        }>
          <TenantPortal 
            solicitudes={solicitudes}
            properties={properties}
            leaseContracts={leaseContracts}
            currentUser={currentUser}
            transactions={transactions}
            onSaveTransaction={(tx) => {
              setTransactions(prev => {
                const exists = prev.some(t => t.id === tx.id);
                const updated = exists ? prev.map(t => t.id === tx.id ? tx : t) : [tx, ...prev];
                storage.save('transactions', updated);
                return updated;
              });
              syncToFirestore('transactions', tx.id, tx);
              addAuditEntry('CREATE', 'TRANSACCION', tx.id, `PAGO EN LÍNEA RECIBIDO EN PORTAL ARRENDATARIO: $${tx.amount.toLocaleString('es-CL')}`);
            }}
            onSaveSolicitud={(sol) => {
              setSolicitudes(prev => {
                const exists = prev.some(s => s.id === sol.id);
                const updated = exists ? prev.map(s => s.id === sol.id ? sol : s) : [sol, ...prev];
                storage.save('solicitudes', updated);
                return updated;
              });
              syncToFirestore('solicitudes', sol.id, sol);
              addAuditEntry('CREATE', 'SISTEMA', sol.id, `SOLICITUD DE REPARACIÓN REGISTRADA POR ARRENDATARIO: ${sol.title}`);
            }}
            onLogout={handleLogout}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  const handleForceSync = async () => {
    setLastSaveStatus('BUSY');
    try {
      await storage.saveMultiple([
        { storeName: 'suppliers', data: suppliers },
        { storeName: 'transactions', data: transactions },
        { storeName: 'auditLog', data: auditLog },
        { storeName: 'workOrders', data: workOrders },
        { storeName: 'properties', data: properties },
        { storeName: 'contracts', data: contracts },
        { storeName: 'officialDocs', data: officialDocs },
        { storeName: 'tickets', data: tickets },
        { storeName: 'b13Reports', data: b13Reports },
        { storeName: 'b4Reports', data: b4Reports },
        { storeName: 'note14Reports', data: note14Reports },
        { storeName: 'accountingReconciliations', data: accountingReconciliations },
        { storeName: 'dueDiligenceReports', data: dueDiligenceReports },
        { storeName: 'pettyCashFunds', data: pettyCashFunds },
        { storeName: 'pettyCashExpenses', data: pettyCashExpenses },
        { storeName: 'appraisals', data: appraisals },
        { storeName: 'applicants', data: applicants },
        { storeName: 'settings', data: credentials },
        { storeName: 'settings_logo', data: companyLogo },
        { storeName: 'leaseContracts', data: leaseContracts },
        { storeName: 'securityDeposits', data: securityDeposits },
        { storeName: 'reportTemplates', data: reportTemplates },
        { storeName: 'reportReviews', data: reportReviews },
        { storeName: 'solicitudes', data: solicitudes },
        { storeName: 'maintenanceExpedientes', data: maintenanceExpedientes },
        { storeName: 'propertyInspections', data: propertyInspections }
      ]);
      setLastSyncTime(Date.now());
    } finally {
      setLastSaveStatus('OK');
    }
  };

  const handleSyncAllToCloud = async () => {
    setIsCloudSyncing(true);
    setSyncProgress(15);
    await handleForceSync();

    if (!isConfigValid || isFirestoreQuotaExceeded()) {
      setSyncProgress(100);
      setTimeout(() => {
        setIsCloudSyncing(false);
        setSyncProgress(0);
        notify("¡Guardado Permanente completado! Todos los registros y documentos quedaron respaldados en la Bóveda Local IndexedDB.", 'success');
      }, 300);
      return;
    }

    const failedCollections: string[] = [];
    const successfulCollections: string[] = [];
    
    try {
      const collections = [
        { name: 'transactions', label: 'Transacciones ERP F0911', data: transactions.map(t => ({ id: t.id, data: t })) },
        { name: 'suppliers', label: 'Maestro de Proveedores', data: suppliers.map(s => ({ id: s.id, data: s })) },
        { name: 'due_diligence', label: 'Informes Due Diligence', data: dueDiligenceReports.map(r => ({ id: r.id, data: r })) },
        { name: 'audit_logs', label: 'Bitácoras de Auditoría', data: auditLog.slice(0, 500).map(a => ({ id: a.id, data: a })) },
        { name: 'work_orders', label: 'Órdenes de Trabajo', data: workOrders.map(w => ({ id: w.id, data: w })) },
        { name: 'properties', label: 'Unidades Inmobiliarias', data: properties.map(p => ({ id: p.id, data: p })) },
        { name: 'contracts', label: 'Contratos Corporativos', data: contracts.map(c => ({ id: c.id, data: c })) },
        { name: 'official_docs', label: 'Oficios y Documentos', data: officialDocs.map(d => ({ id: d.id, data: d })) },
        { name: 'tickets', label: 'Tickets Help Desk', data: tickets.map(t => ({ id: t.id, data: t })) },
        { name: 'b13_reports', label: 'Reportes B13 (Auditoría)', data: b13Reports.map(r => ({ id: r.id, data: r })) },
        { name: 'b4_reports', label: 'Reportes B4 (CMF)', data: b4Reports.map(r => ({ id: r.id, data: r })) },
        { name: 'note14_reports', label: 'Reportes Nota 14 (CMF)', data: note14Reports.map(r => ({ id: r.id, data: r })) },
        { name: 'accounting_reconciliations', label: 'Conciliaciones Contables', data: accountingReconciliations.map(r => ({ id: r.id, data: r })) },
        { name: 'petty_cash_funds', label: 'Fondos de Caja Chica', data: pettyCashFunds.map(f => ({ id: f.id, data: f })) },
        { name: 'petty_cash_expenses', label: 'Rendición de Gastos', data: pettyCashExpenses.map(e => ({ id: e.id, data: e })) },
        { name: 'lease_contracts', label: 'Contratos de Arriendo', data: leaseContracts.map(c => ({ id: c.id, data: c })) },
        { name: 'maintenance_expedientes', label: 'Expedientes de Mantención', data: maintenanceExpedientes.map(m => ({ id: m.id, data: m })) },
        { name: 'solicitudes', label: 'Solicitudes y Subtareas', data: solicitudes.map(s => ({ id: s.id, data: s })) },
        { name: 'appraisals', label: 'Tasaciones de Activos', data: appraisals.map(a => ({ id: a.id, data: a })) }
      ];

      for (let i = 0; i < collections.length; i++) {
        const col = collections[i];
        if (col.data.length === 0) {
          setSyncProgress(Math.round(((i + 1) / collections.length) * 100));
          continue;
        }
        try {
          await bulkSyncToFirestore(col.name, col.data);
          successfulCollections.push(col.label);
        } catch (colErr) {
          console.error(`Error de sincronización en colección ${col.name}:`, colErr);
          failedCollections.push(col.label);
        }
        setSyncProgress(Math.round(((i + 1) / collections.length) * 100));
      }
      
      if (failedCollections.length === 0) {
        addAuditEntry('SYNC', 'SISTEMA', 'CLOUD', 'Sincronización completa a la nube exitosa');
        notify("¡Sincronización completa! Todos los datos están respaldados en la nube.", 'success');
      } else {
        const errorMsg = `Sincronización parcial. Se respaldaron ${successfulCollections.length} de ${collections.filter(c => c.data.length > 0).length} módulos activos. No fue posible sincronizar: ${failedCollections.join(', ')}.`;
        addAuditEntry('SYNC', 'SISTEMA', 'CLOUD', errorMsg);
        notify(errorMsg, 'warning');
      }
    } catch (error) {
      console.error("Error en sincronización de nube:", error);
      notify("Error al sincronizar con la nube. Verifique su conexión.", 'error');
    } finally {
      setIsCloudSyncing(false);
      setSyncProgress(0);
    }
  };

  const handleSavePropertyImportDraft = async (draft: any) => {
    try {
      const draftId = crypto.randomUUID();
      const fullDraft: PropertyImportDraft = {
        ...draft,
        id: draftId,
        userCreator: currentUser || 'SISTEMA',
        timestamp: Date.now(),
        status: 'PENDING'
      };
      
      await syncToFirestore('property_import_drafts', draftId, fullDraft);
      addAuditEntry('CREATE', 'PROPIEDAD', draftId, `BORRADOR DE IMPORTACIÓN: ${draft.fileName}`);
      return draftId;
    } catch (error) {
      console.error('Error saving property import draft:', error);
      throw error;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen select-none bg-[#EBF0F5] font-sans overflow-hidden">
        {isCloudSyncing && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-white rounded-[40px] p-12 shadow-2xl max-w-md w-full text-center space-y-8 animate-in zoom-in-95 border border-slate-100">
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 border-8 border-slate-50 rounded-full"></div>
              <div 
                className="absolute inset-0 border-8 border-emerald-500 rounded-full transition-all duration-500 ease-out"
                style={{ clipPath: `inset(0 ${100 - syncProgress}% 0 0)` }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CloudCheck className="text-emerald-600 animate-pulse" size={40} />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-950 uppercase tracking-tight">Sincronización Permanente</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Respaldando datos en la nube... {syncProgress}%</p>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${syncProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <Sidebar 
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          currentUser={currentUser || ''}
          userEmail={firebaseUser?.email || ''}
          userRole={currentUser ? credentials[currentUser]?.role : undefined}
          allowedModules={effectiveAllowedModules}
          companyLogo={companyLogo}
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-[#EBF0F5]">
          <TopBar 
            currentUser={currentUser || ''}
            onLogout={handleLogout}
            isSyncActive={isSyncActive}
            isDbConnected={isDbConnected}
            onShowSync={() => setShowSyncOptions(true)}
            onUnlink={handleUnlink}
            onReGrant={handleReGrantPermission}
            onConsistency={() => setIsConsistencyReportOpen(true)}
            onAudit={() => setIsLogicAuditOpen(true)}
            onBackup={handleManualBackup}
            onCloudSync={handleSyncAllToCloud}
            isCloudSyncing={isCloudSyncing}
            isFirebaseConnected={isFirebaseConnected}
            firebaseUserEmail={firebaseUser?.email || null}
            dataShowMode={dataShowMode}
            onChangeDataShowMode={setDataShowMode}
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            userRole={currentUser ? credentials[currentUser]?.role : undefined}
            allowedModules={effectiveAllowedModules}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
            onOpenRecentReports={() => setIsRecentReportsOpen(true)}
            onOpenP4310={isDemoClient ? undefined : () => setIsP4310GlobalModalOpen(true)}
            onOpenNewSupplier={isDemoClient ? undefined : () => setIsGlobalSupplierModalOpen(true)}
            openTabs={openTabs}
            onSelectTab={handleSelectAppTab}
            onCloseTab={handleCloseAppTab}
          />

        {/* MODAL DE OPCIONES DE SINCRONIZACIÓN */}
        {showSyncOptions && (
          <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-slate-950 p-8 text-white flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tighter">Sincronización de Equipo</h2>
                <button onClick={() => setShowSyncOptions(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
              </div>
              <div className="p-10 space-y-8">
                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex gap-4">
                  <Info className="text-indigo-600 shrink-0" size={20} />
                  <p className="text-[10px] font-bold text-indigo-800 uppercase leading-relaxed">
                    Para que la planilla sea compartida, cree un archivo dentro de su carpeta de **OneDrive** o **Dropbox**. Luego, sus compañeros deberán elegir ese mismo archivo usando la opción "Vincular".
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-4 relative">
                  {isProcessingSync && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-3xl animate-in fade-in duration-300">
                      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Procesando Sincronización...</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-2">Por favor, siga las instrucciones del navegador</p>
                    </div>
                  )}
                  
                  <button onClick={handleCreateFile} disabled={isProcessingSync} className="flex items-center justify-between p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-slate-950 group transition-all disabled:opacity-50">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-slate-950 group-hover:text-white transition-all"><PlusCircle size={24}/></div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-900 uppercase leading-none">Soy el primero</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Crear nueva base de datos (.json)</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-300" />
                  </button>

                  <button onClick={handleLinkFile} disabled={isProcessingSync} className="flex items-center justify-between p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-slate-950 group transition-all disabled:opacity-50">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-slate-950 group-hover:text-white transition-all"><Link size={24}/></div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-900 uppercase leading-none">Vincular a mi equipo</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Elegir un archivo compartido existente</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-300" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isConsistencyReportOpen && <TechnicalReviewReport onClose={() => setIsConsistencyReportOpen(false)} currentUser={currentUser || 'SISTEMA'} companyLogo={companyLogo} />}
        {isRecentReportsOpen && (
          <Suspense fallback={null}>
            <JDERecentReportsModal
              isOpen={isRecentReportsOpen}
              onClose={() => setIsRecentReportsOpen(false)}
              currentUser={currentUser || 'CRISTIAN MUÑOZ R.'}
              transactions={filteredTransactions}
              workOrders={filteredWorkOrders}
              properties={filteredProperties}
              suppliers={filteredSuppliers}
              onOpenApp={(code) => {
                setIsRecentReportsOpen(false);
                if (code === 'P0911' || code === 'P0411') {
                  setActiveModule('CLASSIC_JDE_LEDGER');
                } else if (code === 'P4801' || code === 'P48201') {
                  setActiveModule('ORDENES');
                } else if (code === 'P1501') {
                  setActiveModule('PROPIEDADES');
                } else if (code === 'P04012') {
                  setActiveModule('PROVEEDORES');
                } else if (code === 'P01012B') {
                  setActiveModule('DUE_DILIGENCIA_CONSULTA');
                }
              }}
            />
          </Suspense>
        )}
        {isLogicAuditOpen && (
          <LogicAuditReport 
            onClose={() => setIsLogicAuditOpen(false)} 
            currentUser={currentUser || 'SISTEMA'} 
            companyLogo={companyLogo}
            data={{
              suppliers,
              transactions,
              workOrders,
              properties,
              contracts,
              officialDocs,
              b13Reports,
              b4Reports,
              note14Reports,
              accountingReconciliations,
              dueDiligenceReports,
              pettyCashFunds,
              pettyCashExpenses,
              securityDeposits,
              leaseContracts,
              maintenanceExpedientes,
              appraisals
            }}
          />
        )}
        {selectedTransactionForDetail && (
          <DocumentDetailModal 
            transaction={selectedTransactionForDetail} 
            onClose={() => setSelectedTransactionForDetail(null)} 
            allTransactions={transactions || []}
          />
        )}

        {isPrintModalOpen && (
          <div className="fixed inset-0 z-[500] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-250">
            <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden border-[10px] border-[#f3f2f1] animate-in zoom-in-95 duration-250">
              <div className="bg-[#002D62] p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Printer size={20} className="text-[#00C853]" />
                  <h2 className="text-xs font-black uppercase tracking-widest">CONTROL DE IMPRESIÓN</h2>
                </div>
                <button 
                  onClick={() => setIsPrintModalOpen(false)} 
                  className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
                >
                  <X size={18}/>
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex gap-4 bg-amber-50 p-5 rounded-3xl border border-amber-200/50">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-[10px] font-black text-amber-950 uppercase tracking-wider mb-1">Guía de Impresión del Sistema</h4>
                    <p className="text-[9.5px] font-bold text-amber-900 uppercase leading-normal">
                      Para asegurar una experiencia de impresión fluida y conforme en todos los navegadores, dispone de las siguientes opciones:
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-slate-100">
                    <span className="w-6 h-6 shrink-0 bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center rounded-full mt-0.5">1</span>
                    <div>
                      <h4 className="text-[10.5px] font-extrabold text-slate-900 uppercase tracking-wide">Abrir en Nueva Pestaña (Recomendado)</h4>
                      <p className="text-[9.5px] font-medium text-slate-500 mt-1">
                        Haga clic en el botón <strong className="text-slate-900">"Abrir en una nueva pestaña"</strong> (icono de flecha diagonal) ubicado en la esquina superior derecha de la barra de previsualización de AI Studio. En la nueva pestaña, todos los botones "Imprimir" abrirán directamente el diálogo nativo de su sistema operativo.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-slate-100">
                    <span className="w-6 h-6 shrink-0 bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center rounded-full mt-0.5">2</span>
                    <div>
                      <h4 className="text-[10.5px] font-extrabold text-slate-900 uppercase tracking-wide">Descarga de Documentos Digitales</h4>
                      <p className="text-[9.5px] font-medium text-slate-500 mt-1">
                        Utilice las opciones de exportación directa que hemos habilitado en cada módulo para descargar copias en formato <strong className="text-slate-900">PDF Foliado</strong> (como comprobantes de liquidación de garantías, informes técnicos) o <strong className="text-slate-900">Excel ERP</strong> para auditorías inmediatas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button 
                    onClick={() => setIsPrintModalOpen(false)} 
                    className="px-6 py-3 bg-[#002D62] hover:bg-[#001D3B] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Entendido, Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 min-h-0 flex flex-col p-1 md:p-2 min-w-0 w-full max-w-full overflow-hidden bg-[#EBF0F5]" id="main-content-scroll-container">
          <JDEFormContainer
            activeModule={activeModule}
            currentUser={currentUser || 'SISTEMA'}
            userRole={currentUser ? credentials[currentUser]?.role : '*ALL'}
            onClose={() => handleCloseAppTab(activeModule)}
          >
            <Suspense fallback={
              <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-sm min-h-[400px]">
                <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-950 rounded-full animate-spin mb-6"></div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 animate-pulse">Cargando Formulario EnterpriseOne...</h2>
              </div>
            }>
        {activeModule === 'DASHBOARD' && (
          <Dashboard 
            transactions={consolidatedTransactions}
            properties={filteredProperties}
            workOrders={filteredWorkOrders}
            suppliers={filteredSuppliers}
            appraisals={appraisals}
            leaseContracts={filteredLeaseContracts}
            currentUser={currentUser || 'SISTEMA'}
            allowedModules={effectiveAllowedModules}
            onNavigate={(module) => setActiveModule(module)}
          />
        )}
        {activeModule === 'TAREAS' && (
           <TaskCenter 
             pendingSuppliers={filteredSuppliers.filter(s => s.status === 'PENDING_APPROVAL')} 
             onApprove={(id) => {
               const s = suppliers.find(x => x.id === id);
               if (s) {
                 const updated = {...s, status: 'ACTIVE'};
                 setSuppliers(p => p.map(x => x.id === id ? updated : x));
                 syncToFirestore('suppliers', id, updated);
                 addAuditEntry('UPDATE', 'PROVEEDOR', id, s.name, { field: 'ESTADO', old: 'PENDING_APPROVAL', new: 'ACTIVE' });
               }
             }} 
             onReject={(id, r) => {
               const s = suppliers.find(x => x.id === id);
               if (s) {
                 const updated = {...s, status: 'REJECTED', rejectionReason: r};
                 setSuppliers(p => p.map(x => x.id === id ? updated : x));
                 syncToFirestore('suppliers', id, updated);
                 addAuditEntry('UPDATE', 'PROVEEDOR', id, s.name, { field: 'ESTADO', old: 'PENDING_APPROVAL', new: 'REJECTED' });
               }
             }} 
             transactions={filteredTransactions} 
             contracts={contracts} 
             currentUser={currentUser} 
             allowedModules={effectiveAllowedModules}
             setActiveModule={setActiveModule}
/>
        )}
        {activeModule === 'OFICIOS' && (
           <OfficialDocumentsCenter 
             documents={officialDocs} 
             onManualSync={handleSyncAllToCloud}
             onSave={(doc) => {
               const isUpdate = officialDocs.some(d => d.id === doc.id);
               setOfficialDocs(prev => { 
                 const idx = prev.findIndex(d => d.id === doc.id); 
                 let updated: OfficialDocument[];
                 if (idx >= 0) { 
                   updated = [...prev]; 
                   updated[idx] = doc; 
                 } else {
                   updated = [doc, ...prev];
                 }
                 storage.save('officialDocs', updated);
                 return updated; 
               });
               syncToFirestore('official_docs', doc.id, doc);
               addAuditEntry(isUpdate ? 'UPDATE' : 'CREATE', 'OFICIO', doc.id, doc.subject, isUpdate ? { field: 'OFICIO', new: doc.subject } : undefined);
             }} 
             onBulkSave={(docs) => {
               setOfficialDocs(prev => {
                 const updated = [...docs, ...prev];
                 storage.save('officialDocs', updated);
                 return updated;
               });
               bulkSyncToFirestore('official_docs', docs.map(d => ({ id: d.id, data: d })));
               addAuditEntry('CREATE', 'OFICIO', 'BULK_OFICIOS', 'CARGA MASIVA', { new: `${docs.length} documentos` });
             }} 
             onDelete={(id) => {
               const doc = officialDocs.find(d => d.id === id);
               setOfficialDocs(p => {
                 const updated = p.filter(d => d.id !== id);
                 storage.save('officialDocs', updated);
                 return updated;
               });
               deleteFromFirestore('official_docs', id);
               addAuditEntry('DELETE', 'OFICIO', id, doc?.subject);
             }} 
             currentUser={currentUser} 
             companyLogo={companyLogo} 
           />
        )}
        {activeModule === 'INGRESOS' && (
           <SpreadsheetSheet 
             data={filteredTransactions.filter(t => t.type === 'INCOME')} 
             suppliers={filteredSuppliers}
             title="GESTIÓN DE INGRESOS" 
             accentColor="emerald"
             categories={INCOME_CATEGORIES}
             onEdit={(t) => setSelectedTransactionForDetail(t)} 
             onDelete={(id) => {
               const t = transactions.find(x => x.id === id);
               setTransactions(p => p.filter(x => x.id !== id));
               deleteFromFirestore('transactions', id);
               addAuditEntry('DELETE', 'TRANSACCION', id, t?.description);
             }} 
             onAdd={() => { setTransactionType('INCOME'); setIsTransactionFormOpen(true); }}
             onUpdate={handleUpdateTransaction}
             onRowClick={(t) => setSelectedTransactionForDetail(t)}
             onSync={handleSyncAllToCloud}
             onBulkAdd={(newDocs) => {
               setTransactions(prev => [...prev, ...newDocs]);
               bulkSyncToFirestore('transactions', newDocs.map(d => ({ id: d.id, data: d })));
               addAuditEntry('CREATE', 'TRANSACCION', 'BULK_LOAD', 'CARGA MASIVA IA', { new: `${newDocs.length} registros` });
             }}
             onAddSuppliers={(newSuppliers) => {
               setSuppliers(prev => [...prev, ...newSuppliers]);
               newSuppliers.forEach(s => {
                 syncToFirestore('suppliers', s.id, s);
                 addAuditEntry('CREATE', 'PROVEEDOR', s.id, s.name, { new: 'CARGA MASIVA DESDE INGRESOS' });
               });
             }}
             companyLogo={companyLogo} 
             currentUser={currentUser} 
             workOrders={filteredWorkOrders}
             properties={filteredProperties}
              reversalRequests={reversalRequests}
              onAddReversalRequest={handleAddReversalRequest}
              onApproveReversalRequest={handleApproveReversalRequest}
                           onAddTransaction={(tx) => handleAddNewTransaction(tx)}
            />
         )}
         {activeModule === 'EGRESOS' && (
            <SpreadsheetSheet 
              data={filteredTransactions.filter(t => t.type === 'EXPENSE')}
              suppliers={filteredSuppliers}
              title="GESTIÓN DE EGRESOS"
              accentColor="orange"
              categories={EXPENSE_CATEGORIES}
              onEdit={(t) => setSelectedTransactionForDetail(t)} 
              onDelete={(id) => {
                const t = transactions.find(x => x.id === id);
                setTransactions(p => p.filter(x => x.id !== id));
                deleteFromFirestore('transactions', id);
                addAuditEntry('DELETE', 'TRANSACCION', id, t?.description);
              }} 
              onAdd={() => { setTransactionType('EXPENSE'); setIsTransactionFormOpen(true); }}
              onUpdate={handleUpdateTransaction}
              onRowClick={(t) => setSelectedTransactionForDetail(t)}
              onSync={handleSyncAllToCloud}
              onBulkAdd={(newDocs) => {
                setTransactions(prev => [...prev, ...newDocs]);
                bulkSyncToFirestore('transactions', newDocs.map(d => ({ id: d.id, data: d })));
                addAuditEntry('CREATE', 'TRANSACCION', 'BULK_LOAD', 'CARGA MASIVA IA', { new: `${newDocs.length} registros` });
              }}
              onAddSuppliers={(newSuppliers) => {
                setSuppliers(prev => [...prev, ...newSuppliers]);
                newSuppliers.forEach(s => {
                  syncToFirestore('suppliers', s.id, s);
                  addAuditEntry('CREATE', 'PROVEEDOR', s.id, s.name, { new: 'CARGA MASIVA DESDE EGRESOS' });
                });
              }}
              companyLogo={companyLogo} 
              currentUser={currentUser} 
              workOrders={filteredWorkOrders}
              properties={filteredProperties}
              reversalRequests={reversalRequests}
              onAddReversalRequest={handleAddReversalRequest}
              onApproveReversalRequest={handleApproveReversalRequest}
              onAddTransaction={(tx) => handleAddNewTransaction(tx)}
            />
         )}
         {activeModule === 'ORDENES' && (
            <div className="h-full flex flex-col overflow-hidden bg-[#EBF0F5]">
              <div className="bg-white border-b border-slate-200 px-8 flex justify-between items-center shrink-0">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setWorkOrderSubTab('MAESTRO')}
                    className={`py-4 text-[10px] font-black tracking-widest border-b-2 uppercase transition-all cursor-pointer ${
                      workOrderSubTab === 'MAESTRO' ? 'border-slate-950 text-slate-950 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Maestro de Órdenes (P48201)
                  </button>
                  <button 
                    onClick={() => setWorkOrderSubTab('APROBACIONES')}
                    className={`py-4 text-[10px] font-black tracking-widest border-b-2 uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                      workOrderSubTab === 'APROBACIONES' ? 'border-emerald-600 text-emerald-700 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span>Aprobaciones OT / OC (JDE P43081)</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-mono text-[9px]">
                      {filteredWorkOrders.filter(w => w.status === 'PENDIENTE_VB' || w.status === 'BORRADOR').length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setWorkOrderSubTab('RECEPCION')}
                    className={`py-4 text-[10px] font-black tracking-widest border-b-2 uppercase transition-all cursor-pointer ${
                      workOrderSubTab === 'RECEPCION' ? 'border-slate-950 text-slate-950 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Recepción de Obras / Servicios (P4312)
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {workOrderSubTab === 'MAESTRO' ? (
                  <WorkOrderCenter 
                    workOrders={filteredWorkOrders}
                    properties={filteredProperties}
                    suppliers={filteredSuppliers}
                    currentUser={currentUser || 'SISTEMA'}
                    onSeed={() => seedWorkOrders(true)}
                    onSave={(wo) => {
                      setWorkOrders(prev => {
                        const idx = prev.findIndex(item => item.id === wo.id);
                        if (idx >= 0) {
                          const n = [...prev];
                          n[idx] = wo;
                          return n;
                        }
                        return [wo, ...prev];
                      });
                      syncToFirestore('work_orders', wo.id, wo);
                      addAuditEntry(workOrders.some(x => x.id === wo.id) ? 'UPDATE' : 'CREATE', 'ORDEN_TRABAJO', wo.id, `OT ${wo.folio}`);
                      emitWorkOrderVoucher(wo, companyLogo, currentUser || 'SISTEMA', true);
                    }}
                    onDelete={(id) => {
                      setWorkOrders(prev => prev.filter(o => o.id !== id));
                      deleteFromFirestore('work_orders', id);
                      addAuditEntry('DELETE', 'ORDEN_TRABAJO', id, `OT eliminada`);
                    }}
                    companyLogo={companyLogo}
                    onSync={handleSyncAllToCloud}
                    transactions={filteredTransactions}
                    onAddTransaction={(tx) => handleAddNewTransaction(tx)}
                  />
                ) : workOrderSubTab === 'APROBACIONES' ? (
                  <Suspense fallback={<div className="p-8 text-center text-slate-500 uppercase font-bold">Cargando Workbench de Aprobaciones JDE 9.11 (P43081)...</div>}>
                    <JDEOrderApprovalModule
                      workOrders={filteredWorkOrders}
                      suppliers={filteredSuppliers}
                      properties={filteredProperties}
                      currentUser={currentUser || 'SISTEMA'}
                      userRole={currentUser ? credentials[currentUser]?.role : 'ADMINISTRADOR'}
                      companyLogo={companyLogo}
                      onSaveWorkOrder={(wo) => {
                        setWorkOrders(prev => {
                          const idx = prev.findIndex(item => item.id === wo.id);
                          if (idx >= 0) {
                            const n = [...prev];
                            n[idx] = wo;
                            return n;
                          }
                          return [wo, ...prev];
                        });
                        syncToFirestore('work_orders', wo.id, wo);
                        addAuditEntry('UPDATE', 'ORDEN_TRABAJO', wo.id, `Dictamen Aprobación JDE P43081 - OT ${wo.folio} (${wo.status})`);
                        emitWorkOrderVoucher(wo, companyLogo, currentUser || 'SISTEMA', true);
                      }}
                      onOpenRoutesMatrix={() => setActiveModule('RUTAS_APROBACION')}
                      onOpenReception={() => setWorkOrderSubTab('RECEPCION')}
                      onAuditLog={(action, details) => {
                        addAuditEntry('APPROVE', 'ORDEN_TRABAJO', 'P43081', `${action}: ${details}`);
                      }}
                    />
                  </Suspense>
                ) : (
                  <Suspense fallback={<div className="p-8 text-center text-slate-500 uppercase font-bold text-slate-400">Cargando Módulo Recepción Especial...</div>}>
                    <WorkOrderReception 
                      workOrders={filteredWorkOrders}
                      currentUser={currentUser || 'SISTEMA'}
                      onUpdateOT={(ot) => {
                        setWorkOrders(prev => prev.map(o => o.id === ot.id ? ot : o));
                        addAuditEntry('UPDATE', 'ORDEN_TRABAJO', ot.id, `Recepción OT ${ot.folio}`);
                        syncToFirestore('work_orders', ot.id, ot);
                        emitWorkOrderVoucher(ot, companyLogo, currentUser || 'SISTEMA', true);
                      }}
                      companyLogo={companyLogo}
                    />
                  </Suspense>
               )}
             </div>
           </div>
         )}
        {activeModule === 'APROBACIONES_JDE' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-[#002D62] bg-white border border-slate-200 rounded-lg">
              Cargando Centro de Aprobaciones de OT / OC (P43081 / P43280 / F4209)...
            </div>
          }>
            <JDEOrderApprovalModule
              workOrders={filteredWorkOrders}
              suppliers={filteredSuppliers}
              properties={filteredProperties}
              currentUser={currentUser || 'SISTEMA'}
              userRole={currentUser ? credentials[currentUser]?.role : 'ADMINISTRADOR'}
              companyLogo={companyLogo}
              onSaveWorkOrder={(wo) => {
                setWorkOrders(prev => {
                  const idx = prev.findIndex(item => item.id === wo.id);
                  if (idx >= 0) {
                    const n = [...prev];
                    n[idx] = wo;
                    return n;
                  }
                  return [wo, ...prev];
                });
                syncToFirestore('work_orders', wo.id, wo);
                addAuditEntry('UPDATE', 'ORDEN_TRABAJO', wo.id, `Dictamen Aprobación JDE P43081 - OT ${wo.folio} (${wo.status})`);
                emitWorkOrderVoucher(wo, companyLogo, currentUser || 'SISTEMA', true);
              }}
              onOpenRoutesMatrix={() => setActiveModule('RUTAS_APROBACION')}
              onOpenReception={() => setActiveModule('RECEPCION_OT')}
              onAuditLog={(action, details) => {
                addAuditEntry('APPROVE', 'ORDEN_TRABAJO', 'P43081', `${action}: ${details}`);
              }}
            />
          </Suspense>
        )}
        {activeModule === 'CONSULTAS_JDE' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-lg">
              Cargando Centro Integral de Consultas AssetFlow Enterprise (P43214 / P43081)...
            </div>
          }>
            <JDEInquiryModule 
              workOrders={filteredWorkOrders}
              suppliers={filteredSuppliers}
              properties={filteredProperties}
              transactions={transactions}
              currentUser={currentUser || "SISTEMA"}
              userRole={currentUser ? credentials[currentUser]?.role : 'ADMINISTRADOR'}
              onSaveWorkOrder={(wo) => {
                setWorkOrders(prev => {
                  const idx = prev.findIndex(item => item.id === wo.id);
                  if (idx >= 0) {
                    const n = [...prev];
                    n[idx] = wo;
                    return n;
                  }
                  return [wo, ...prev];
                });
                syncToFirestore("work_orders", wo.id, wo);
                addAuditEntry("UPDATE", "ORDEN_TRABAJO", wo.id, `Actualización Estado OT ${wo.folio} desde Consultas ERP`);
              }}
              onViewOrderDetail={() => {
                setActiveModule("ORDENES");
              }}
              onOpenReception={() => {
                setActiveModule("RECEPCION_OT");
              }}
              onAddSupplier={handleAddNewSupplier}
            />
          </Suspense>
        )}
        {activeModule === 'RECEPCION_OT' && (
          <div className="h-full flex flex-col overflow-hidden bg-[#EBF0F5]">
            <div className="flex-1 overflow-hidden">
              <Suspense fallback={<div className="p-8 text-center text-slate-500 uppercase font-bold text-slate-400">Cargando Módulo Recepción Especial...</div>}>
                <WorkOrderReception 
                  workOrders={filteredWorkOrders}
                  currentUser={currentUser || 'SISTEMA'}
                  onUpdateOT={(ot) => {
                    setWorkOrders(prev => prev.map(o => o.id === ot.id ? ot : o));
                    addAuditEntry('UPDATE', 'ORDEN_TRABAJO', ot.id, `Recepción OT ${ot.folio}`);
                    syncToFirestore('work_orders', ot.id, ot);
                        emitWorkOrderVoucher(ot, companyLogo, currentUser || 'SISTEMA', true);
                      }}
                      companyLogo={companyLogo}
                />
              </Suspense>
            </div>
          </div>
        )}
        {activeModule === 'PROVEEDORES' && (
           <SupplierDirectory 
             suppliers={filteredSuppliers} 
             onSave={(data) => {
               handleAddNewSupplier(data);
             }} 
             onUpdate={(supplier) => {
               const oldSupplier = suppliers.find(s => s.id === supplier.id);
               const { enrichedSupplier } = hydrateSupplierRelationalTables(supplier, 0, suppliers);
               const updatedList = suppliers.map(s => s.id === enrichedSupplier.id ? enrichedSupplier : s);
               setSuppliers(updatedList);
               storage.save('suppliers', updatedList);
               syncToFirestore('suppliers', enrichedSupplier.id, enrichedSupplier);
               syncSupplierRelationalTablesToDatabase(updatedList, enrichedSupplier);
               addAuditEntry(
                 'UPDATE',
                 'PROVEEDOR',
                 enrichedSupplier.id,
                 `${enrichedSupplier.name} (AN8 #${enrichedSupplier.addressNumber})`,
                 { field: 'MAESTRO_5_TABLAS', old: oldSupplier?.status, new: enrichedSupplier.status }
               );
               notify(
                 `Maestro actualizado en las 5 tablas JDE para ${enrichedSupplier.name} (AN8 #${enrichedSupplier.addressNumber}).`,
                 'success'
               );
             }}
             onDelete={(id) => {
               if (confirm('¿Está seguro de que desea eliminar este proveedor y sus registros asociados?')) {
                 const supplier = suppliers.find(s => s.id === id);
                 const updatedList = suppliers.filter(s => s.id !== id);
                 setSuppliers(updatedList);
                 storage.save('suppliers', updatedList);
                 deleteFromFirestore('suppliers', id);
                 syncSupplierRelationalTablesToDatabase(updatedList);
                 addAuditEntry('DELETE', 'PROVEEDOR', id, supplier?.name);
               }
             }}
             currentUser={currentUser} 
             companyLogo={companyLogo} 
           />
        )}
        {activeModule === 'CERTIFICADOS_DOMINIO' && (
          <CertificadosDominioModule 
            properties={properties} 
            currentUser={currentUser || 'samaheim@gmail.com'}
          />
        )}
        {(activeModule === 'PROPIEDADES' || activeModule === 'CARGA_INTELIGENTE') && (
          <PropertyPoolSheet 
            properties={filteredProperties} 
            autoOpenImport={activeModule === 'CARGA_INTELIGENTE'}
            onSync={handleSyncAllToCloud}
            onSaveDraft={handleSavePropertyImportDraft}
            onAdd={(p) => {
              const newId = crypto.randomUUID();
              const newProp = {...p, id: newId};
              setProperties(prev => [...prev, newProp]);
              syncToFirestore('properties', newId, newProp);
              addAuditEntry('CREATE', 'PROPIEDAD', newId, `${p.building} - ${p.floor} (${p.unitNumber || 'S/N'})`);
            }} 
            onUpdate={(p) => {
              setProperties(prev => prev.map(x => x.id === p.id ? p : x));
              syncToFirestore('properties', p.id, p);
              addAuditEntry('UPDATE', 'PROPIEDAD', p.id, `${p.building} - ${p.floor} (${p.unitNumber || 'S/N'})`);
            }}
            onBulkAdd={async (list) => {
              const newList = list.map(l => ({...l, id: crypto.randomUUID()}));
              setProperties(prev => [...prev, ...newList]);
              
              await bulkSyncToFirestore('properties', newList.map(p => ({ id: p.id, data: p })));
              
              addAuditEntry('CREATE', 'PROPIEDAD', 'BULK_PROPIEDADES', 'CARGA MASIVA DE PROPIEDADES', { new: `${list.length} propiedades registradas` });
            }} 
            onBulkUpdate={async (list) => {
              setProperties(prev => {
                const updated = [...prev];
                list.forEach(p => {
                  const idx = updated.findIndex(x => x.id === p.id);
                  if (idx !== -1) updated[idx] = p;
                });
                return updated;
              });
              
              await bulkSyncToFirestore('properties', list.map(p => ({ id: p.id, data: p })));
              
              addAuditEntry('UPDATE', 'PROPIEDAD', 'BULK_UPDATE', 'ACTUALIZACIÓN MASIVA DE PROPIEDADES', { new: `${list.length} propiedades actualizadas` });
            }}
            onRebuild={async (list) => {
              // 1. Clear existing in Firestore
              await bulkDeleteFromFirestore('properties', properties.map(p => p.id));
              
              // 2. Prepare new list
              const newList = list.map(l => ({...l, id: crypto.randomUUID()}));
              
              // 3. Update state
              setProperties(newList);
              
              // Save to offline fallback storage
              await storage.save('properties', newList);
              
              // 4. Sync new list to Firestore
              await bulkSyncToFirestore('properties', newList.map(p => ({ id: p.id, data: p })));
              
              addAuditEntry('REBUILD', 'PROPIEDAD', 'REBUILD_PROPIEDADES', 'RECONSTRUCCIÓN TOTAL DE BASE DE DATOS', { new: `${list.length} propiedades cargadas` });
            }}
            onDelete={(id) => {
              const p = properties.find(x => x.id === id);
              setProperties(prev => prev.filter(x => x.id !== id));
              deleteFromFirestore('properties', id);
              addAuditEntry('DELETE', 'PROPIEDAD', id, p ? `${p.building} - ${p.floor} (${p.unitNumber || 'S/N'})` : 'Propiedad Desconocida');
            }} 
            companyLogo={companyLogo} 
            currentUser={currentUser} 
          />
        )}
        {activeModule === 'TASACIONES' && (
          <AppraisalModule 
            appraisals={appraisals}
            properties={filteredProperties}
            currentUser={currentUser || 'SISTEMA'}
            onSave={(appraisal) => {
              const exists = appraisals.find(a => a.id === appraisal.id);
              if (exists) {
                addAuditEntry('UPDATE', 'TASACION', appraisal.id, appraisal.address);
              } else {
                addAuditEntry('CREATE', 'TASACION', appraisal.id, appraisal.address);
              }
              syncToFirestore('appraisals', appraisal.id, appraisal);
              setAppraisals(prev => {
                const updated = exists ? prev.map(a => a.id === appraisal.id ? appraisal : a) : [appraisal, ...prev];
                storage.save('appraisals', updated);
                return updated;
              });
            }}
            onDelete={(id) => {
              const a = appraisals.find(x => x.id === id);
              setAppraisals(prev => {
                const updated = prev.filter(x => x.id !== id);
                storage.save('appraisals', updated);
                return updated;
              });
              deleteFromFirestore('appraisals', id);
              addAuditEntry('DELETE', 'TASACION', id, a?.address);
            }}
            onUpdateProperty={(p) => {
              const exists = properties.find(x => x.id === p.id);
              if (exists) {
                setProperties(prev => {
                  const updated = prev.map(x => x.id === p.id ? p : x);
                  storage.save('properties', updated);
                  return updated;
                });
                syncToFirestore('properties', p.id, p);
                addAuditEntry('UPDATE', 'PROPIEDAD', p.id, `${p.building} - ${p.floor}`);
              } else {
                setProperties(prev => {
                  const updated = [...prev, p];
                  storage.save('properties', updated);
                  return updated;
                });
                syncToFirestore('properties', p.id, p);
                addAuditEntry('CREATE', 'PROPIEDAD', p.id, `${p.building} - ${p.floor}`);
              }
            }}
          />
        )}
        {activeModule === 'BOVEDA_DIGITAL' && (
          <DigitalVault 
            appraisals={appraisals}
            transactions={transactions}
            officialDocs={officialDocs}
            leaseContracts={leaseContracts}
            properties={properties}
            setActiveModule={setActiveModule}
            setAppraisals={setAppraisals}
            setTransactions={setTransactions}
            setOfficialDocs={setOfficialDocs}
            setLeaseContracts={setLeaseContracts}
          />
        )}
        {activeModule === 'CONTRATOS_ARRIENDO' && (
          <LeaseContractModule 
            contracts={leaseContracts}
            properties={filteredProperties}
            applicants={filteredApplicants}
            inspections={propertyInspections}
            currentUser={currentUser || 'SISTEMA'}
            setOfficialDocs={setOfficialDocs}
            onSync={handleSyncAllToCloud}
            onSave={async (newContract) => {
              const isUpdate = leaseContracts.some(c => c.id === newContract.id);
              const updated = isUpdate
                ? leaseContracts.map(c => c.id === newContract.id ? newContract : c)
                : [newContract, ...leaseContracts];
              setLeaseContracts(updated);
              await storage.save('leaseContracts', updated);
              
              syncToFirestore('lease_contracts', newContract.id, newContract);

              // Add to audit log
              addAuditEntry(
                isUpdate ? 'UPDATE' : 'CREATE',
                'CONTRATO',
                newContract.id,
                newContract.tenantName
              );
            }}
            onDelete={async (id) => {
              const contract = leaseContracts.find(c => c.id === id);
              const updated = leaseContracts.filter(c => c.id !== id);
              setLeaseContracts(updated);
              await storage.save('leaseContracts', updated);
              deleteFromFirestore('lease_contracts', id);
              addAuditEntry('DELETE', 'CONTRATO', id, contract?.tenantName);
            }}
          />
        )}
        {activeModule === 'REGISTRO_PAGOS' && (
          <Suspense fallback={<div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-emerald-600 bg-white border border-slate-200 rounded-lg">Cargando Módulo de Registro de Pagos & Tesorería...</div>}>
            <PaymentRegistrationModule
              leaseContracts={leaseContracts}
              properties={filteredProperties}
              workOrders={workOrders}
              officialDocs={officialDocs}
              currentUser={currentUser || 'SISTEMA CAJA'}
              companyLogo={companyLogo}
              setOfficialDocs={setOfficialDocs}
              setActiveModule={setActiveModule}
              onSaveLeaseContract={async (newContract) => {
                const isUpdate = leaseContracts.some(c => c.id === newContract.id);
                const updated = isUpdate
                  ? leaseContracts.map(c => c.id === newContract.id ? newContract : c)
                  : [newContract, ...leaseContracts];
                setLeaseContracts(updated);
                await storage.save('leaseContracts', updated);
                syncToFirestore('lease_contracts', newContract.id, newContract);
                addAuditEntry(
                  isUpdate ? 'UPDATE' : 'CREATE',
                  'CONTRATO',
                  newContract.id,
                  `Abono de Arriendo: ${newContract.tenantName}`
                );
              }}
            />
          </Suspense>
        )}
        {activeModule === 'EVALUACION_POSTULANTES' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-emerald-600 bg-white border border-slate-200 rounded-lg">
              Cargando Módulo de Evaluación de Postulantes (P15013)...
            </div>
          }>
            <ApplicantEvaluationModule
              applicants={filteredApplicants}
              properties={filteredProperties}
              contracts={leaseContracts}
              currentUser={currentUser || 'SISTEMA'}
              companyLogo={companyLogo}
              onSave={async (newApplicant) => {
                const soccerApplicant = applicants.some(a => a.id === newApplicant.id);
                const updated = soccerApplicant
                  ? applicants.map(a => a.id === newApplicant.id ? newApplicant : a)
                  : [newApplicant, ...applicants];
                setApplicants(updated);
                await storage.save('applicants', updated);
                syncToFirestore('applicants', newApplicant.id, newApplicant);
                addAuditEntry(
                  soccerApplicant ? 'UPDATE' : 'CREATE',
                  'POSTULANTE',
                  newApplicant.id,
                  `${newApplicant.name} - Score: ${newApplicant.score}`
                );
              }}
              onBatchSave={async (newBatch) => {
                const map = new Map(applicants.map(a => [a.id, a]));
                newBatch.forEach(a => map.set(a.id, a));
                const updated = Array.from(map.values());
                setApplicants(updated);
                await storage.save('applicants', updated);
                await bulkSyncToFirestore('applicants', newBatch.map(a => ({ id: a.id, data: a })));
                addAuditEntry('CREATE', 'POSTULANTE', 'BULK_APPLICANTS', `Generación masiva de ${newBatch.length} postulantes`);
              }}
              onDelete={async (id) => {
                const app = applicants.find(a => a.id === id);
                const updated = applicants.filter(a => a.id !== id);
                setApplicants(updated);
                await storage.save('applicants', updated);
                deleteFromFirestore('applicants', id);
                addAuditEntry('DELETE', 'POSTULANTE', id, app?.name);
              }}
            />
          </Suspense>
        )}
        {activeModule === 'GARANTIAS' && (
          <SecurityDepositModule 
            deposits={filteredSecurityDeposits}
            contracts={filteredLeaseContracts}
            properties={filteredProperties}
            currentUser={currentUser || 'SISTEMA'}
            companyLogo={companyLogo}
            onAddLeaseContract={async (c) => {
              const updated = [c, ...leaseContracts];
              setLeaseContracts(updated);
              await storage.save('leaseContracts', updated);
              syncToFirestore('lease_contracts', c.id, c);
            }}
            onAddProperty={async (p) => {
              const updated = [p, ...properties];
              setProperties(updated);
              await storage.save('properties', updated);
              syncToFirestore('properties', p.id, p);
            }}
            onSave={async (newDeposit) => {
              const isUpdate = securityDeposits.some(d => d.id === newDeposit.id);
              const updated = isUpdate
                ? securityDeposits.map(d => d.id === newDeposit.id ? newDeposit : d)
                : [newDeposit, ...securityDeposits];
              setSecurityDeposits(updated);
              await storage.save('securityDeposits', updated);
              syncToFirestore('security_deposits', newDeposit.id, newDeposit);
              addAuditEntry(isUpdate ? 'UPDATE' : 'CREATE', 'TRANSACCION', newDeposit.id, `Garantía: ${newDeposit.tenantName}`);
              emitSecurityDepositVoucher(newDeposit, companyLogo, currentUser || 'SISTEMA GARANTÍAS', true);

              // If the security deposit has been liquidated, handle contract and property status updates
              if (newDeposit.status === 'LIQUIDADA' && newDeposit.contractId) {
                const associatedContract = leaseContracts.find(c => c.id === newDeposit.contractId);
                if (associatedContract) {
                  // 1. Update Contract Status to 'FINIQUITADO'
                  const updatedContract: LeaseContract = {
                    ...associatedContract,
                    status: 'FINIQUITADO'
                  };
                  
                  const updatedContracts = leaseContracts.map(c => c.id === updatedContract.id ? updatedContract : c);
                  setLeaseContracts(updatedContracts);
                  await storage.save('leaseContracts', updatedContracts);
                  syncToFirestore('lease_contracts', updatedContract.id, updatedContract);
                  addAuditEntry('UPDATE', 'CONTRATO', updatedContract.id, `Contrato finiquitado por liquidación de garantía: ${updatedContract.tenantName}`);

                  // 2. Update Property Status (requires Acta de Restitución)
                  const associatedProperty = properties.find(p => p.id === associatedContract.propertyId);
                  if (associatedProperty) {
                    const hasRestitucion = propertyInspections.some(ins => 
                      ins.propertyId === associatedProperty.id && 
                      ins.type === 'RESTITUCION' && 
                      (ins.status === 'ACTA_ENVIADA' || ins.status === 'ACEPTADO')
                    );

                    const nextStatus = hasRestitucion ? 'DISPONIBLE' : 'PENDIENTE_RESTITUCION';

                    const updatedProperty: Property = {
                      ...associatedProperty,
                      status: nextStatus
                    };
                    
                    const updatedProperties = properties.map(p => p.id === updatedProperty.id ? updatedProperty : p);
                    setProperties(updatedProperties);
                    await storage.save('properties', updatedProperties);
                    syncToFirestore('properties', updatedProperty.id, updatedProperty);

                    if (hasRestitucion) {
                      addAuditEntry('UPDATE', 'PROPIEDAD', updatedProperty.id, `Propiedad liberada y disponible: ${updatedProperty.code}`);
                    } else {
                      addAuditEntry('UPDATE', 'PROPIEDAD', updatedProperty.id, `Propiedad liquidada pero retenida como PENDIENTE_RESTITUCION a la espera de Acta de Restitución: ${updatedProperty.code}`);
                    }

                    // 3. Trigger and Notify the responsible executive and the operator
                    const executiveName = associatedContract.userCreator || 'ALFREDO COVARRUBIAS';
                    const executiveEmail = credentials[executiveName]?.email || 'a.covarrubias@inmobiliariapro.cl';
                    const operatorEmail = credentials[currentUser]?.email || 'samaheim@gmail.com';
                    const safeTenantName = associatedContract?.tenantName || 'arrendatario';
                    const tenantEmail = `${safeTenantName.toLowerCase().replace(/\s+/g, '')}@inmobiliariapro.cl`;

                    const emailId = `email-lg-${Date.now()}`;
                    const emailNotification = {
                      id: emailId,
                      depositId: newDeposit.id,
                      folio: newDeposit.settlement?.folio || `LG-${Date.now().toString().slice(-4)}`,
                      sender: 'sistema.erp@inmobiliariapro.cl',
                      recipients: [operatorEmail, tenantEmail, executiveEmail],
                      subject: `[LIQUIDACIÓN COMPLETA] Cierre del Proceso de Garantía - Folio ${newDeposit.settlement?.folio || 'S/N'} - ${newDeposit.tenantName}`,
                      body: `Confirmamos formalmente que el proceso de liquidación para el arrendatario ${newDeposit.tenantName} de la propiedad ${associatedProperty.code} ha sido completado y finalizado en el sistema.\n\nMonto Inicial de Garantía: ${newDeposit.initialAmount.toLocaleString()} CLP\nDescuentos Totales: ${newDeposit.settlement?.totalDeductions.toLocaleString()} CLP\nMonto Neto Reembolsado: ${newDeposit.settlement?.refundAmount.toLocaleString()} CLP\nFolio: ${newDeposit.settlement?.folio}\nOperador Responsable: ${currentUser}`,
                      status: 'ENTREGADO',
                      smtpResponse: '250 OK - Message accepted for delivery',
                      timestamp: Date.now(),
                      messageId: `SMTP-MSG-LG-${newDeposit.settlement?.folio || 'S/N'}-${Date.now().toString().slice(-4)}`
                    };

                    syncToFirestore('email_notifications', emailId, emailNotification);

                    notify(
                      `📧 NOTIFICACIÓN SMTP EXITOSA: Se ha enviado el correo formal de cierre a ${executiveEmail} con copia a ${operatorEmail} indicando el término del proceso de liquidación para ${newDeposit.tenantName}.`, 
                      'success', 
                      10000
                    );

                    // 4. Generate automated operations task / ticket for property re-entry
                    const newTicketId = `tk-auto-${Date.now()}`;
                    const automatedTicket: ITTicket = {
                      id: newTicketId,
                      folio: `TK-OP-${Math.floor(1000 + Math.random() * 9000)}`,
                      title: `RE-INSPECCIÓN Y PUBLICACIÓN: ${associatedProperty.building} - ${associatedProperty.code}`,
                      description: `OPERACIÓN DE TRANSICIÓN: Contrato de ${newDeposit.tenantName} ha sido FINIQUITADO tras la liquidación de la garantía folio ${newDeposit.settlement?.folio || 'S/N'}. Se solicita al ejecutivo responsable ${executiveName} coordinar:\n1. Acta de Recepción e inventario físico de la unidad.\n2. Envío de novedades técnicas o daños a Plomería/Techumbre si aplica.\n3. Coordinación de publicación y visitas para nuevo arriendo de la propiedad.`,
                      category: 'OTROS',
                      priority: 'ALTA',
                      status: 'ABIERTO',
                      userCreator: 'SISTEMA',
                      requester: executiveName,
                      assignedTo: executiveName,
                      createdAt: new Date().toISOString().slice(0, 10),
                      updatedAt: new Date().toISOString().slice(0, 10),
                      timestamp: Date.now(),
                      subtasks: [
                        { id: 'sub-1', title: 'Realizar inspección física de salida', status: 'PENDIENTE' },
                        { id: 'sub-2', title: 'Registrar inventario en acta de entrega', status: 'PENDIENTE' },
                        { id: 'sub-3', title: 'Coordinar reparaciones menores con proveedores autorizados', status: 'PENDIENTE' },
                        { id: 'sub-4', title: 'Actualizar publicación de arriendo', status: 'PENDIENTE' }
                      ]
                    };

                    setTickets(prev => [automatedTicket, ...prev]);
                    await storage.save('tickets', [automatedTicket, ...tickets]);
                    syncToFirestore('tickets', newTicketId, automatedTicket);
                    addAuditEntry('CREATE', 'SISTEMA', newTicketId, `Ticket de re-inspección generado: ${automatedTicket.title}`);
                  }
                }
              }
            }}
            onDelete={async (id) => {
              const deposit = securityDeposits.find(d => d.id === id);
              const updated = securityDeposits.filter(d => d.id !== id);
              setSecurityDeposits(updated);
              await storage.save('securityDeposits', updated);
              deleteFromFirestore('security_deposits', id);
              addAuditEntry('DELETE', 'TRANSACCION', id, `Garantía: ${deposit?.tenantName}`);
            }}
            onAddTransaction={(tx) => handleAddNewTransaction(tx)}
            onAddBulkDemoData={async (newDeposits, newContracts, newProperties, newTransactions) => {
              // 1. Remove existing demo data to avoid duplicates/residue
              const cleanDeposits = securityDeposits.filter(d => !d.id.startsWith('sd-demo-'));
              const cleanContracts = leaseContracts.filter(c => !c.id.startsWith('c-demo-'));
              const cleanProperties = properties.filter(p => !p.id.startsWith('p-demo-'));
              const cleanTransactions = transactions.filter(t => !t.id.startsWith('t-sd-') && !t.id.startsWith('t-refund-sd-'));

              // 2. Concatenate the new demo data
              const finalDeposits = [...newDeposits, ...cleanDeposits];
              const finalContracts = [...newContracts, ...cleanContracts];
              const finalProperties = [...newProperties, ...cleanProperties];
              const finalTransactions = [...newTransactions, ...cleanTransactions];

              // 3. Update React States
              setSecurityDeposits(finalDeposits);
              setLeaseContracts(finalContracts);
              setProperties(finalProperties);
              setTransactions(finalTransactions);

              // 4. Save to Storage
              await storage.save('securityDeposits', finalDeposits);
              await storage.save('leaseContracts', finalContracts);
              await storage.save('properties', finalProperties);
              await storage.save('transactions', finalTransactions);

              // 5. Sync each demo item to Firestore (safe background sync)
              newDeposits.forEach(d => syncToFirestore('security_deposits', d.id, d));
              newContracts.forEach(c => syncToFirestore('lease_contracts', c.id, c));
              newProperties.forEach(p => syncToFirestore('properties', p.id, p));
              newTransactions.forEach(t => syncToFirestore('transactions', t.id, t));

              // 6. Log audit entry for the batch generation
              addAuditEntry('CREATE', 'SISTEMA', `demo-bulk-${Date.now()}`, `Generación masiva de 10 datos demo para liquidación de garantías`);
            }}
            onAddOfficialDocument={async (doc) => {
              setOfficialDocs(prev => {
                const updated = [doc, ...prev];
                storage.save('officialDocs', updated);
                return updated;
              });
              syncToFirestore('official_docs', doc.id, doc);
              addAuditEntry('CREATE', 'OFICIO', doc.id, `Dossier de Liquidación: ${doc.subject}`);
            }}
          />
        )}
        {activeModule === 'SEGUROS' && (
          <PropertyInsuranceModule 
            properties={filteredProperties}
            onUpdateProperty={(p) => {
              setProperties(prev => prev.map(x => x.id === p.id ? p : x));
              syncToFirestore('properties', p.id, p);
              addAuditEntry('UPDATE', 'PROPIEDAD', p.id, `${p.building} - ${p.code}`, { field: 'POLIZA_SEGURO', new: p.insurancePolicy?.policyNumber });
            }}
            onAddProperty={(p) => {
              setProperties(prev => [p, ...prev]);
              syncToFirestore('properties', p.id, p);
              addAuditEntry('CREATE', 'PROPIEDAD', p.id, `${p.building} - ${p.code}`);
            }}
            currentUser={currentUser || ''}
          />
        )}
        {activeModule === 'HELPDESK' && (
           <HelpDeskCenter 
             tickets={tickets} 
             onSync={handleSyncAllToCloud}
             onSave={(tk) => {
              const isUpdate = tickets.some(t => t.id === tk.id);
              setTickets(prev => {
                const idx = prev.findIndex(t => t.id === tk.id);
                if (idx >= 0) {
                  const n = [...prev];
                  n[idx] = tk;
                  return n;
                }
                return [tk, ...prev];
              });
              syncToFirestore('tickets', tk.id, tk);
              addAuditEntry(isUpdate ? 'UPDATE' : 'CREATE', 'SISTEMA', tk.id, tk.title, isUpdate ? { field: 'TICKET', new: tk.status } : undefined);
            }} 
            onDelete={(id) => {
              const tk = tickets.find(t => t.id === id);
              setTickets(p => p.filter(t => t.id !== id));
              deleteFromFirestore('tickets', id);
              addAuditEntry('DELETE', 'SISTEMA', id, tk?.title);
            }} 
            currentUser={currentUser} 
          />
        )}
        {activeModule === 'REPORTE_B13' && (
          <B13ReportModule 
            reports={b13Reports} 
            b4Reports={b4Reports}
            reconciliations={accountingReconciliations}
            properties={properties}
            leaseContracts={leaseContracts}
            onSync={handleSyncAllToCloud}
            onSave={async (report) => {
              try {
                const updated = [report, ...b13Reports.filter(r => r.id !== report.id)];
                setB13Reports(updated);
                await storage.save('b13Reports', updated);
                await syncToFirestore('b13_reports', report.id, report);
                await addAuditEntry('CREATE', 'SISTEMA', report.id, `REPORTE B13 - ${report.period}`);
              } catch (error) {
                console.error("Error saving B13 report:", error);
                alert("Error al guardar el reporte: " + (error instanceof Error ? error.message : "Error desconocido"));
              }
            }} 
            onDelete={async (id) => {
              try {
                const r = b13Reports.find(x => x.id === id);
                const updated = b13Reports.filter(x => x.id !== id);
                setB13Reports(updated);
                await storage.save('b13Reports', updated);
                await deleteFromFirestore('b13_reports', id);
                await addAuditEntry('DELETE', 'SISTEMA', id, r ? `REPORTE B13 - ${r.period}` : undefined);
              } catch (error) {
                console.error("Error deleting B13 report:", error);
                alert("Error al eliminar el reporte: " + (error instanceof Error ? error.message : "Error desconocido"));
              }
            }} 
            currentUser={currentUser} 
            companyLogo={companyLogo}
          />
        )}
        {activeModule === 'REPORTE_B4' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-emerald-600 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Iniciando Informe B.4 CMF (R09322) • Cartera y Desglose NCG 316...</span>
              </div>
            </div>
          }>
            <ErrorBoundary>
              <B4ReportModule 
                reports={b4Reports} 
                b13Reports={b13Reports}
                reconciliations={accountingReconciliations}
                properties={filteredProperties}
                leaseContracts={filteredLeaseContracts}
                onSync={handleSyncAllToCloud}
                onSave={async (report) => {
                  try {
                    const updated = [report, ...b4Reports.filter(r => r.id !== report.id)];
                    setB4Reports(updated);
                    await storage.save('b4Reports', updated);
                    await syncToFirestore('b4_reports', report.id, report);
                    await addAuditEntry('CREATE', 'SISTEMA', report.id, `REPORTE B4 - ${report.period}`);
                  } catch (error) {
                    console.error("Error saving B4 report:", error);
                    alert("Error al guardar el reporte: " + (error instanceof Error ? error.message : "Error desconocido"));
                  }
                }} 
                onDelete={async (id) => {
                  try {
                    const r = b4Reports.find(x => x.id === id);
                    const updated = b4Reports.filter(x => x.id !== id);
                    setB4Reports(updated);
                    await storage.save('b4Reports', updated);
                    await deleteFromFirestore('b4_reports', id);
                    await addAuditEntry('DELETE', 'SISTEMA', id, r ? `REPORTE B4 - ${r.period}` : undefined);
                  } catch (error) {
                    console.error("Error deleting B4 report:", error);
                    alert("Error al eliminar el reporte: " + (error instanceof Error ? error.message : "Error desconocido"));
                  }
                }} 
                currentUser={currentUser || 'SISTEMA'} 
                companyLogo={companyLogo}
              />
            </ErrorBoundary>
          </Suspense>
        )}
         {activeModule === 'REPOSTERA_PLACEHOLDER_NO_MATCH' ? null : null}
        {(activeModule === 'REVISION_REPORTES' || activeModule === 'PROPIEDADES_INVERSION') && (
          <ReportReviewModule 
            b13Reports={b13Reports}
            b4Reports={b4Reports}
            templates={reportTemplates}
            reviews={reportReviews}
            onSaveTemplate={(t) => {
              setReportTemplates(prev => [t, ...prev]);
              syncToFirestore('report_templates', t.id, t);
              addAuditEntry('CREATE', 'SISTEMA', t.id, `TEMPLATE REPORTE: ${t.name}`);
            }}
            onSaveReview={(r) => {
              setReportReviews(prev => [r, ...prev]);
              syncToFirestore('report_reviews', r.id, r);
              addAuditEntry('UPDATE', 'SISTEMA', r.id, `REVISIÓN TERMINADA: ${r.reportType} - ${r.period}`);
            }}
            onDeleteTemplate={(id) => {
              if (confirm('¿Eliminar esta referencia?')) {
                setReportTemplates(prev => prev.filter(t => t.id !== id));
                deleteFromFirestore('report_templates', id);
                addAuditEntry('DELETE', 'SISTEMA', id, 'TEMPLATE REPORTE');
              }
            }}
            currentUser={currentUser || ''}
            transactions={filteredTransactions}
            suppliers={filteredSuppliers}
            workOrders={filteredWorkOrders}
            properties={filteredProperties}
            leaseContracts={filteredLeaseContracts}
            initialTab={activeModule === 'PROPIEDADES_INVERSION' ? 'AUXILIARY_AUDIT' : undefined}
          />
        )}
        {activeModule === 'NOTA_14' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Iniciando Módulo Nota 14 NIC 40 (R09323) • Conciliación CMF y Roll-Forward...</span>
              </div>
            </div>
          }>
            <ErrorBoundary>
              <Note14ReportModule 
                reports={note14Reports} 
                properties={filteredProperties}
                leaseContracts={filteredLeaseContracts}
                transactions={filteredTransactions}
                workOrders={filteredWorkOrders}
                onSave={async (report) => {
                  try {
                    const updated = [report, ...note14Reports.filter(r => r.id !== report.id)];
                    setNote14Reports(updated);
                    await storage.save('note14Reports', updated);
                    await syncToFirestore('note14_reports', report.id, report);
                    await addAuditEntry('CREATE', 'SISTEMA', report.id, `NOTA 14 - ${report.period}`);
                  } catch (error) {
                    console.error("Error saving Note 14 report:", error);
                    alert("Error al guardar la nota 14: " + (error instanceof Error ? error.message : "Error desconocido"));
                  }
                }} 
                onDelete={async (id) => {
                  try {
                    const r = note14Reports.find(x => x.id === id);
                    const updated = note14Reports.filter(x => x.id !== id);
                    setNote14Reports(updated);
                    await storage.save('note14Reports', updated);
                    await deleteFromFirestore('note14_reports', id);
                    await addAuditEntry('DELETE', 'SISTEMA', id, r ? `NOTA 14 - ${r.period}` : undefined);
                  } catch (error) {
                    console.error("Error deleting Note 14 report:", error);
                    alert("Error al eliminar el reporte: " + (error instanceof Error ? error.message : "Error desconocido"));
                  }
                }} 
                currentUser={currentUser} 
                companyLogo={companyLogo}
              />
            </ErrorBoundary>
          </Suspense>
        )}
        {activeModule === 'CONCILIACION' && (
          <AccountingReconciliationModule 
            reconciliations={accountingReconciliations} 
            properties={filteredProperties}
            transactions={filteredTransactions}
            onSave={(rec) => {
              setAccountingReconciliations(prev => [rec, ...prev]);
              syncToFirestore('accounting_reconciliations', rec.id, rec);
              addAuditEntry('CREATE', 'SISTEMA', rec.id, `CONCILIACION - ${rec.period}`);
              emitReconciliationVoucher(rec, companyLogo, currentUser || 'SISTEMA AUDITOR', true);
            }} 
            onDelete={(id) => {
              const r = accountingReconciliations.find(x => x.id === id);
              setAccountingReconciliations(p => p.filter(x => x.id !== id));
              deleteFromFirestore('accounting_reconciliations', id);
              addAuditEntry('DELETE', 'SISTEMA', id, r ? `CONCILIACION - ${r.period}` : undefined);
            }} 
            currentUser={currentUser} 
            companyLogo={companyLogo}
          />
        )}
        {activeModule === 'CAJA_CHICA' && (
          <PettyCashModule 
            pettyCashFunds={pettyCashFunds}
            expenses={pettyCashExpenses}
            onSaveExpense={(exp) => {
              setPettyCashExpenses(prev => [exp, ...prev]);
              syncToFirestore('petty_cash_expenses', exp.id, exp);
              const fund = pettyCashFunds.find(f => f.id === exp.pettyCashId);
              addAuditEntry('CREATE', 'TRANSACCION', exp.id, `GASTO CAJA CHICA: ${exp.description} (${fund?.name || 'S/N'})`, { field: 'MONTO', new: exp.amount });
              emitPettyCashVoucher(exp, fund?.name, companyLogo, currentUser || 'SISTEMA CAJA', true);
            }}
            onDeleteExpense={(id) => {
              const exp = pettyCashExpenses.find(e => e.id === id);
              setPettyCashExpenses(p => p.filter(e => e.id !== id));
              deleteFromFirestore('petty_cash_expenses', id);
              addAuditEntry('DELETE', 'TRANSACCION', id, `ELIMINACIÓN GASTO: ${exp?.description || 'S/N'}`);
            }}
            onUpdateFund={(fund) => {
              const oldFund = pettyCashFunds.find(f => f.id === fund.id);
              setPettyCashFunds(p => {
                const exists = p.some(f => f.id === fund.id);
                if (exists) return p.map(f => f.id === fund.id ? fund : f);
                return [...p, fund];
              });
              syncToFirestore('petty_cash_funds', fund.id, fund);
              if (oldFund) {
                addAuditEntry('UPDATE', 'SISTEMA', fund.id, `FONDO CAJA CHICA: ${fund.name}`, { field: 'SALDO_ACTUAL', old: oldFund.currentBalance, new: fund.currentBalance });
              } else {
                addAuditEntry('CREATE', 'SISTEMA', fund.id, `NUEVO FONDO CAJA CHICA: ${fund.name}`);
              }
            }}
            currentUser={currentUser}
          />
        )}
        {activeModule === 'IMPUESTOS_F29_F22' && (
          <TaxComplianceModule
            transactions={filteredTransactions}
            workOrders={filteredWorkOrders}
            pettyCashExpenses={pettyCashExpenses}
            leaseContracts={filteredLeaseContracts}
            declarations={taxDeclarations}
            currentUser={currentUser || 'samaheim@gmail.com'}
            onSaveDeclaration={async (declaration) => {
              try {
                const updated = [declaration, ...taxDeclarations.filter(d => d.id !== declaration.id)];
                setTaxDeclarations(updated);
                await storage.save('taxDeclarations', updated);
                await syncToFirestore('tax_declarations', declaration.id, declaration);
                await addAuditEntry('CREATE', 'SISTEMA', declaration.id, `DECLARACIÓN TRIBUTARIA - ${declaration.periodLabel} (Folio: ${declaration.folio})`);
              } catch (error) {
                console.error("Error saving tax declaration:", error);
                alert("Error al guardar la declaración tributaria: " + (error instanceof Error ? error.message : "Error desconocido"));
              }
            }}
            onSyncCloud={handleSyncAllToCloud}
          />
        )}
        {(activeModule === 'LIBROS_AUXILIARES' || activeModule === 'FINANZAS') && (
          <AuxiliaryLedgersModule 
            transactions={filteredTransactions}
            leaseContracts={filteredLeaseContracts}
            pettyCashExpenses={pettyCashExpenses}
            properties={properties}
            suppliers={suppliers}
            currentUser={currentUser || 'samaheim@gmail.com'}
            companyLogo={companyLogo}
            workOrders={filteredWorkOrders}
            onUpdateTransaction={handleUpdateTransaction}
            onAddTransaction={(newTx) => {
              setTransactions(prev => {
                const next = [newTx, ...prev];
                storage.save('transactions', next);
                syncToFirestore('transactions', newTx.id, newTx);
                return next;
              });
              addAuditEntry('CREATE', 'TRANSACCION', newTx.id, newTx.description);
            }}
            onAddSupplier={handleAddNewSupplier}
          />
        )}
        {activeModule === 'MANTENCIONES' && (
          <MaintenanceModule 
            expedientes={maintenanceExpedientes}
            properties={filteredProperties}
            currentUser={currentUser || 'SISTEMA'}
            onSave={(exp) => {
              const isUpdate = maintenanceExpedientes.some(e => e.id === exp.id);
              setMaintenanceExpedientes(prev => {
                const exists = prev.some(e => e.id === exp.id);
                if (exists) return prev.map(e => e.id === exp.id ? exp : e);
                return [exp, ...prev];
              });
              syncToFirestore('maintenance_expedientes', exp.id, exp);
              addAuditEntry(isUpdate ? 'UPDATE' : 'CREATE', 'SISTEMA', exp.id, `EXPEDIENTE MANTENCIÓN: ${exp.title}`);
            }}
            onDelete={(id) => {
              if (confirm('¿Está seguro de que desea eliminar este expediente?')) {
                setMaintenanceExpedientes(prev => prev.filter(e => e.id !== id));
                deleteFromFirestore('maintenance_expedientes', id);
                addAuditEntry('DELETE', 'SISTEMA', id, `EXPEDIENTE MANTENCIÓN ELIMINADO`);
              }
            }}
          />
        )}
        {activeModule === 'SOLICITUDES' && (
          <SolicitudesModule 
            solicitudes={filteredSolicitudes}
            properties={filteredProperties}
            suppliers={filteredSuppliers}
            workOrders={filteredWorkOrders}
            leaseContracts={filteredLeaseContracts}
            currentUser={currentUser || 'SISTEMA'}
            onSave={(sol) => {
              const isUpdate = solicitudes.some(s => s.id === sol.id);
              setSolicitudes(prev => {
                const exists = prev.some(s => s.id === sol.id);
                const updated = exists ? prev.map(s => s.id === sol.id ? sol : s) : [sol, ...prev];
                storage.save('solicitudes', updated);
                return updated;
              });
              syncToFirestore('solicitudes', sol.id, sol);
              addAuditEntry(isUpdate ? 'UPDATE' : 'CREATE', 'SISTEMA', sol.id, `SOLICITUD REGISTRADA: ${sol.title}`);
              const targetProp = properties.find(p => p.id === sol.propertyId);
              emitClaimVoucher(sol, targetProp, companyLogo, currentUser || 'SISTEMA', true);
            }}
            onDelete={(id) => {
              setSolicitudes(prev => {
                const updated = prev.filter(s => s.id !== id);
                storage.save('solicitudes', updated);
                return updated;
              });
              deleteFromFirestore('solicitudes', id);
              addAuditEntry('DELETE', 'SISTEMA', id, `SOLICITUD ELIMINADA`);
            }}
            onAddWorkOrder={(wo) => {
              setWorkOrders(prev => [wo, ...prev]);
              syncToFirestore('work_orders', wo.id, wo);
              addAuditEntry('CREATE', 'ORDEN_TRABAJO', wo.id, `OT ${wo.folio} EMITIDA DESDE SOLICITUD DE MANTENCION`);
              emitWorkOrderVoucher(wo, companyLogo, currentUser || 'SISTEMA', true);
            }}
            onAddProperty={(newProp) => {
              setProperties(prev => [newProp, ...prev]);
              syncToFirestore('properties', newProp.id, newProp);
              addAuditEntry('CREATE', 'SISTEMA', newProp.id, `PROPIEDAD GENERADA DESDE SOLICITUD DE MANTENCION: ${newProp.building}`);
            }}
            onUpdateProperty={(updatedProp) => {
              setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
              syncToFirestore('properties', updatedProp.id, updatedProp);
              addAuditEntry('UPDATE', 'SISTEMA', updatedProp.id, `PROPIEDAD MODIFICADA DESDE EL ASISTENTE: ${updatedProp.building}`);
            }}
            onUpdateSupplier={(updatedSupp) => {
              setSuppliers(prev => prev.map(s => s.id === updatedSupp.id ? updatedSupp : s));
              syncToFirestore('suppliers', updatedSupp.id, updatedSupp);
              addAuditEntry('UPDATE', 'PROVEEDOR', updatedSupp.id, `PROVEEDOR MODIFICADO DESDE EL ASISTENTE: ${updatedSupp.name}`);
            }}
            onUpdateWorkOrder={(updatedWO) => {
              setWorkOrders(prev => prev.map(w => w.id === updatedWO.id ? updatedWO : w));
              syncToFirestore('work_orders', updatedWO.id, updatedWO);
              addAuditEntry('UPDATE', 'ORDEN_TRABAJO', updatedWO.id, `OT ${updatedWO.folio} MODIFICADA DESDE EL ASISTENTE`);
            }}
            onNavigateToModule={(mod) => setActiveModule(mod)}
          />
        )}
        {activeModule === 'UAF_COMPLIANCE' && (
          <UAFComplianceModule 
            suppliers={filteredSuppliers}
            currentUser={currentUser || 'SISTEMA'}
            onUpdateSupplier={(supplier) => {
              setSuppliers(prev => {
                const exists = prev.some(s => s.id === supplier.id);
                if (exists) {
                  return prev.map(s => s.id === supplier.id ? supplier : s);
                } else {
                  return [supplier, ...prev];
                }
              });
              syncToFirestore('suppliers', supplier.id, supplier);
              const existsInState = suppliers.some(s => s.id === supplier.id);
              addAuditEntry(existsInState ? 'UPDATE' : 'CREATE', 'PROVEEDOR', supplier.id, `CUMPLIMIENTO UAF: ${supplier.name}`);
            }}
          />
        )}
        {activeModule === 'CENTRO_DESPACHO' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-[#0B3C5D] bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-[#0B3C5D] border-t-transparent rounded-full animate-spin"></div>
                <span>Iniciando Centro de Despacho Automatizado Gmail API (P0115M)...</span>
              </div>
            </div>
          }>
            <EmailCenter 
              transactions={filteredTransactions}
              auditLog={auditLog}
              suppliers={filteredSuppliers}
              workOrders={filteredWorkOrders}
              currentUser={currentUser || 'samaheim@gmail.com'}
              onAuditLog={(action, entityId, details) => {
                addAuditEntry(action as any, 'SISTEMA', entityId, details);
              }}
            />
          </Suspense>
        )}
        {(activeModule === 'CONFIG' || activeModule === 'CISO_REPORT') && (
           <SecuritySheet 
             credentials={credentials}
             companyLogo={companyLogo}
             currentUser={currentUser || ''}
             onUpdateLogo={setCompanyLogo}
             onUpdatePassword={async (user, pass) => {
               const nextCredentials = {
                 ...credentials,
                 [user]: { ...credentials[user], password: pass }
               };
               setCredentials(nextCredentials);
               try { await storage.save('settings', nextCredentials); } catch (e) {}
               try {
                 const deletedList: string[] = JSON.parse(localStorage.getItem('assetflow_deleted_users') || '[]');
                 syncToFirestore('settings', 'global_config', {
                   credentials: nextCredentials,
                   deletedUsers: deletedList,
                   logo: companyLogo
                 });
               } catch (e) {}
               addAuditEntry('UPDATE', 'SISTEMA', user, `ACTUALIZACIÓN DE CLAVE DE ACCESO: ${user}`);
             }}
             onAddUser={async (name, pass, role, title, email, extraData) => {
               try {
                 const localDeleted: string[] = JSON.parse(localStorage.getItem('assetflow_deleted_users') || '[]');
                 const filtered = localDeleted.filter(u => u !== name);
                 localStorage.setItem('assetflow_deleted_users', JSON.stringify(filtered));
               } catch (e) {}
               const nextCredentials = {
                 ...credentials,
                 [name]: { 
                   password: pass, 
                   role, 
                   deptTitle: title, 
                   email: email || '',
                   ...(extraData || {})
                 }
               };
               setCredentials(nextCredentials);
               try { await storage.save('settings', nextCredentials); } catch (e) {}
               try {
                 const deletedList: string[] = JSON.parse(localStorage.getItem('assetflow_deleted_users') || '[]');
                 syncToFirestore('settings', 'global_config', {
                   credentials: nextCredentials,
                   deletedUsers: deletedList,
                   logo: companyLogo
                 });
               } catch (e) {}
               addAuditEntry('CREATE', 'SISTEMA', name, `ALTA DE USUARIO Y ASIGNACIÓN DE PERMISOS: ${name} (${role})`);
             }}
             onUpdateUser={async (name, updates, newNameKey) => {
               const targetKey = (newNameKey && newNameKey.trim() !== name) ? newNameKey.trim() : name;
               const nextCredentials = { ...credentials };
               const currentData = nextCredentials[name] || { password: 'user123', role: 'EJECUTIVO', deptTitle: 'OPERACIONES', email: '' };
               if (targetKey !== name) {
                 delete nextCredentials[name];
               }
               nextCredentials[targetKey] = {
                 ...currentData,
                 ...updates
               };
               setCredentials(nextCredentials);
               if (currentUser === name && targetKey !== name) {
                 setCurrentUser(targetKey);
               }
               try { await storage.save('settings', nextCredentials); } catch (e) {}
               try {
                 const deletedList: string[] = JSON.parse(localStorage.getItem('assetflow_deleted_users') || '[]');
                 syncToFirestore('settings', 'global_config', {
                   credentials: nextCredentials,
                   deletedUsers: deletedList,
                   logo: companyLogo
                 });
               } catch (e) {}
               addAuditEntry('UPDATE', 'SISTEMA', targetKey, `MODIFICACIÓN DE PERMISOS Y ATRIBUCIONES: ${name}${targetKey !== name ? ` -> RENOMBRADO A: ${targetKey}` : ''} (ROL: ${updates.role || currentData.role})`);
             }}
             onDeleteUser={async (name) => {
               // 1. Add to deleted users
               let updatedDeleted: string[] = [];
               try {
                 const localDeleted: string[] = JSON.parse(localStorage.getItem('assetflow_deleted_users') || '[]');
                 if (!localDeleted.includes(name)) {
                   localDeleted.push(name);
                 }
                 localStorage.setItem('assetflow_deleted_users', JSON.stringify(localDeleted));
                 updatedDeleted = localDeleted;
               } catch (e) {
                 updatedDeleted = [name];
               }

               // 2. Remove from credentials state
               const nextCredentials = { ...credentials };
               delete nextCredentials[name];
               setCredentials(nextCredentials);

               // 3. Immediately persist to storage
               try {
                 await storage.save('settings', nextCredentials);
               } catch (e) {}

               // 4. Immediately sync to Firestore
               try {
                 syncToFirestore('settings', 'global_config', {
                   credentials: nextCredentials,
                   deletedUsers: updatedDeleted,
                   logo: companyLogo
                 });
               } catch (e) {}

               // 5. If current user was deleted, reset
               if (currentUser === name) {
                 setCurrentUser('');
               }

               // 6. Audit log
               addAuditEntry('DELETE', 'SISTEMA', name, `REVOCACIÓN DE ACCESO Y ELIMINACIÓN DE USUARIO: ${name}`);
             }}
             initialTab={activeModule === 'CISO_REPORT' ? 'CISO_AUDIT' : 'PERSONAL'}
             autoOpenCisoReport={activeModule === 'CISO_REPORT'}
           />
        )}
        {activeModule === 'PROJECTS_REPORT' && (
          <ProjectAssessmentReport 
            onClose={() => setActiveModule('TAREAS')}
            companyName="ASSETFLOW PRO"
            companyLogo={companyLogo}
            currentUser={currentUser || 'SISTEMA'}
          />
        )}
        {activeModule === 'SALUD_SISTEMA' && (
           <SystemHealthDashboard currentUser={currentUser} addAuditEntry={addAuditEntry} 
             transactions={filteredTransactions}
             workOrders={filteredWorkOrders}
             suppliers={filteredSuppliers}
             properties={filteredProperties}
             contracts={contracts}
             leaseContracts={filteredLeaseContracts}
             auditLog={auditLog}
             pettyCashExpenses={pettyCashExpenses}
             pettyCashFunds={pettyCashFunds}
             isDbConnected={isDbConnected}
             onFixJdeStamps={fixJdeStamps}
           />
        )}
        {activeModule === 'AUDITORIA' && (
          !isInternalControlUser ? (
            <div className="h-full p-8 flex items-center justify-center bg-slate-100/80">
              <div className="max-w-lg w-full bg-white p-8 rounded-3xl border border-rose-200 shadow-xl text-center space-y-4">
                <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mx-auto border border-rose-200">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    Acceso Exclusivo de Control Interno
                  </h2>
                  <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mt-1">
                    Módulo e Historial de Auditoría Reservado (P950000)
                  </p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                  Este módulo contiene el registro inmutable de trazabilidad y la consola transaccional del sistema AssetFlow. Su acceso está restringido únicamente a usuarios pertenecientes al <strong>Departamento de Control Interno</strong> y <strong>Auditores Administradores</strong>.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveModule('DASHBOARD')}
                    className="w-full py-3 bg-[#0B3C5D] text-white text-xs font-black uppercase rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Volver al Dashboard Principal
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full p-8 overflow-auto bg-slate-50/50">
              <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 gap-4">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                      <History size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Centro de Auditoría y Control (Control Interno)</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Monitoreo de integridad y trazabilidad del sistema</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsLogicAuditOpen(true)}
                    className="flex items-center gap-3 px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <ShieldCheck size={16} /> Generar Informe de Coherencia
                  </button>
                </div>

                {/* Submodule Tab Bar */}
                <div className="flex flex-col sm:flex-row bg-slate-200/80 p-1.5 rounded-2xl gap-2 select-none border border-slate-300/70 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuditActiveTab('LOGS');
                      setAuditResetKey(prev => prev + 1);
                    }}
                    className={`flex-1 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2.5 ${
                      auditActiveTab === 'LOGS' 
                        ? 'bg-white text-indigo-700 shadow-md border border-slate-200/90 font-extrabold scale-[1.01]' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    <History size={16} className={auditActiveTab === 'LOGS' ? 'text-indigo-600' : 'text-slate-500'} />
                    <span>Historial de Trazabilidad Operativa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditActiveTab('TRANSACTO')}
                    className={`flex-1 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2.5 ${
                      auditActiveTab === 'TRANSACTO' 
                        ? 'bg-white text-indigo-700 shadow-md border border-slate-200/90 font-extrabold scale-[1.01]' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    <SlidersHorizontal size={16} className={auditActiveTab === 'TRANSACTO' ? 'text-indigo-600' : 'text-slate-500'} />
                    <span>Consola de Ajustes & Correcciones Transaccionales</span>
                  </button>
                </div>

                {/* Submodule view display */}
                <Suspense fallback={
                  <div className="p-12 text-center text-slate-400 text-xs font-bold animate-pulse">
                    Cargando consola de auditoría e integridad transaccional...
                  </div>
                }>
                  {auditActiveTab === 'LOGS' ? (
                    <AuditLog 
                      key={`audit-log-view-${auditResetKey}`}
                      logs={auditLog} 
                      onShowCoherenceReport={() => setIsLogicAuditOpen(true)}
                      addAuditEntry={addAuditEntry}
                      onUpdateAuditLog={(updatedLogs) => {
                        setAuditLog(updatedLogs);
                        storage.save('auditLog', updatedLogs);
                      }}
                      currentUser={currentUser || 'SISTEMA'}
                      onNavigateToModule={(modKey) => {
                        const moduleMap: Record<string, any> = {
                          'PROVEEDOR': 'SUPPLIERS',
                          'TRANSACCION': 'TRANSACTIONS',
                          'ORDEN_TRABAJO': 'WORK_ORDERS',
                          'PROPIEDAD': 'PROPERTIES',
                          'CONTRATO': 'CONTRACTS',
                          'TASACION': 'APPRAISALS',
                          'POSTULANTE': 'APPLICANTS',
                          'OFICIO': 'OFFICIAL_DOCS',
                          'IT_TICKET': 'HELPDESK',
                          'CAJA_CHICA': 'PETTY_CASH',
                        };
                        const targetModule = moduleMap[modKey.toUpperCase()];
                        if (targetModule) {
                          setActiveModule(targetModule);
                        }
                      }}
                    />
                  ) : (
                    <TransactionalAuditCenter
                      transactions={filteredTransactions}
                      suppliers={filteredSuppliers}
                      properties={filteredProperties}
                      workOrders={filteredWorkOrders}
                      leaseContracts={filteredLeaseContracts}
                      currentUser={currentUser || 'SISTEMA'}
                      onUpdateTransaction={handleUpdateTransaction}
                      addAuditEntry={addAuditEntry}
                    />
                  )}
                </Suspense>
              </div>
            </div>
          )
        )}
        {activeModule === 'DUE_DILIGENCIA_CONSULTA' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-lg">
              Cargando Consulta Interconectada de Debida Diligencia...
            </div>
          }>
            <DueDiligenceConsultation 
              suppliers={suppliers}
              transactions={transactions}
              workOrders={workOrders}
              properties={properties}
              contracts={contracts}
              leaseContracts={leaseContracts}
              companyLogo={companyLogo} 
              currentUser={currentUser || 'SISTEMA'} 
              setActiveModule={setActiveModule}
              onAddSupplier={handleAddNewSupplier}
            />
          </Suspense>
        )}
        {activeModule === 'CUENTAS' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-[#002D62] bg-white border border-slate-200 rounded-lg">
              Iniciando Consulta de Plan de Cuentas y Balances en Tiempo Real (JDE P0901 / P09216)...
            </div>
          }>
            <ChartOfAccountsModule 
              transactions={filteredTransactions}
              properties={filteredProperties}
              workOrders={filteredWorkOrders}
              leaseContracts={filteredLeaseContracts}
              pettyCashExpenses={pettyCashExpenses}
              currentUser={currentUser || 'SISTEMA'}
            />
          </Suspense>
        )}
        {activeModule === 'REVISION_PAGOS_SEMANALES' && (
          <Suspense fallback={<div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-lg">Cargando Módulo de Auditoría Semanal...</div>}>
            <WeeklyPaymentReviewModule
              transactions={filteredTransactions}
              suppliers={filteredSuppliers}
              contracts={contracts}
              properties={filteredProperties}
              currentUser={currentUser || 'SISTEMA'}
              onUpdateTransaction={(updatedTx) => {
                setTransactions(prev => {
                  const next = prev.map(t => t.id === updatedTx.id ? updatedTx : t);
                  storage.save('transactions', next);
                  return next;
                });
              }}
              onAddSupplier={(supplier) => {
                setSuppliers(prev => {
                  const next = [supplier, ...prev];
                  storage.save('suppliers', next);
                  syncToFirestore('suppliers', supplier.id, supplier);
                  return next;
                });
              }}
            />
          </Suspense>
        )}
        {activeModule === 'REPORTE_MENSUAL_GASTOS' && (
          <Suspense fallback={<div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-emerald-600 bg-white border border-slate-200 rounded-lg">Cargando Módulo de Reportes de Gasto Mensual...</div>}>
            <MonthlyExpenseReportModule
              transactions={filteredTransactions}
              suppliers={filteredSuppliers}
              currentUser={currentUser || 'SISTEMA'}
              companyLogo={companyLogo}
            />
          </Suspense>
        )}
        {activeModule === 'CONTROLLING' && (
          <Suspense fallback={<div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-lg">Cargando Módulo Libro Diario & Controlling ASSETFLOW...</div>}>
            <JDEControllingModule
              transactions={filteredTransactions}
              workOrders={filteredWorkOrders}
              properties={filteredProperties}
              suppliers={filteredSuppliers}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={(id) => {
                setTransactions(prev => {
                  const next = prev.filter(t => t.id !== id);
                  storage.save('transactions', next);
                  deleteFromFirestore('transactions', id);
                  return next;
                });
                addAuditEntry('DELETE', 'TRANSACCION', id, 'Eliminar transacción desde Controlling ASSETFLOW');
              }}
              onAddTransaction={(newTx) => {
                setTransactions(prev => {
                  const next = [newTx, ...prev];
                  storage.save('transactions', next);
                  syncToFirestore('transactions', newTx.id, newTx);
                  return next;
                });
                addAuditEntry('CREATE', 'TRANSACCION', newTx.id, newTx.description);
              }}
              currentUser={currentUser || 'SISTEMA'}
            />
          </Suspense>
        )}
        {activeModule === 'CASH_FLOW_RUNWAY' && (
          <Suspense fallback={<div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-lg">Cargando Módulo Cash Flow Runway Consolidador...</div>}>
            <CashFlowRunwayModule
              transactions={filteredTransactions}
              leaseContracts={leaseContracts}
              workOrders={filteredWorkOrders}
              properties={filteredProperties}
            />
          </Suspense>
        )}
        {activeModule === 'BITACORA' && (
          <Suspense fallback={<div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-[#002D62] bg-white border border-slate-200 rounded-lg">Iniciando Aplicación ERP P0911_Revisión_Diario...</div>}>
            <ClassicJDELedger
              transactions={filteredTransactions}
              workOrders={filteredWorkOrders}
              properties={filteredProperties}
              suppliers={filteredSuppliers}
              leaseContracts={leaseContracts}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={(id) => {
                setTransactions(prev => {
                  const next = prev.filter(t => t.id !== id);
                  storage.save('transactions', next);
                  deleteFromFirestore('transactions', id);
                  return next;
                });
                addAuditEntry('DELETE', 'TRANSACCION', id, 'Eliminar asiento ERP Ledger F0911');
              }}
              onAddTransaction={(newTx) => {
                setTransactions(prev => {
                  const next = [newTx, ...prev];
                  storage.save('transactions', next);
                  syncToFirestore('transactions', newTx.id, newTx);
                  return next;
                });
                addAuditEntry('CREATE', 'TRANSACCION', newTx.id, newTx.description);
              }}
              onAddSupplier={handleAddNewSupplier}
              currentUser={currentUser || 'SISTEMA'}
            />
          </Suspense>
        )}
        {activeModule === 'CONTABILIDAD_JDE' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-emerald-600 bg-white border border-slate-200 rounded-lg">
              Iniciando Contabilidad General AssetFlow Enterprise (P0911 / P09216 / P09801)...
            </div>
          }>
            <JDEAccountingModule
              transactions={filteredTransactions}
              workOrders={filteredWorkOrders}
              properties={filteredProperties}
              suppliers={filteredSuppliers}
              leaseContracts={leaseContracts}
              currentUser={currentUser || 'SISTEMA'}
              userRole={currentUser ? credentials[currentUser]?.role : 'ADMINISTRADOR'}
              onAddTransaction={(tx) => handleAddNewTransaction(tx, false)}
              onUpdateTransaction={(updatedTx) => {
                setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
                syncToFirestore('transactions', updatedTx.id, updatedTx);
                addAuditEntry('UPDATE', 'TRANSACCION', updatedTx.id, `Actualizar Asiento ${updatedTx.documentNumber}`);
              }}
              onDeleteTransaction={(id) => {
                setTransactions(prev => {
                  const next = prev.filter(t => t.id !== id);
                  storage.save('transactions', next);
                  deleteFromFirestore('transactions', id);
                  return next;
                });
                addAuditEntry('DELETE', 'TRANSACCION', id, 'Anular Asiento ERP F0911');
              }}
            />
          </Suspense>
        )}
        {activeModule === 'DUE_DILIGENCIA' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-lg">
              Cargando Módulo de Debida Diligencia para Compras y Proveedores...
            </div>
          }>
            <DueDiligenceModule 
              reports={dueDiligenceReports}
              suppliers={filteredSuppliers}
              onRestoreDefaultReports={() => restoreDueDiligenceReports(true)}
              onSave={(report) => {
                const isUpdate = dueDiligenceReports.some(r => r.id === report.id);
                setDueDiligenceReports(prev => {
                  const exists = prev.some(r => r.id === report.id);
                  const next = exists ? prev.map(r => r.id === report.id ? report : r) : [report, ...prev];
                  storage.save('dueDiligenceReports', next);
                  return next;
                });
                syncToFirestore('due_diligence', report.id, report);
                addAuditEntry(isUpdate ? 'UPDATE' : 'CREATE', 'SISTEMA', report.id, `INFORME DD: ${report.supplierName}`);
              }}
              onSync={handleSyncAllToCloud}
              onDelete={(id) => {
                const ids = Array.isArray(id) ? id : [id];
                const isBulk = Array.isArray(id);
                const message = isBulk 
                  ? `¿Está seguro de que desea eliminar permanentemente estos ${ids.length} informes?` 
                  : '¿Está seguro de que desea eliminar este informe?';
                
                if (confirm(message)) {
                  setDueDiligenceReports(prev => {
                    let updated = [...prev];
                    ids.forEach(currentId => {
                      const r = updated.find(x => x.id === currentId);
                      updated = updated.filter(x => x.id !== currentId);
                      deleteFromFirestore('due_diligence', currentId);
                      if (r) {
                        addAuditEntry('DELETE', 'SISTEMA', currentId, `INFORME DD: ${r.supplierName}`);
                      }
                    });
                    storage.save('dueDiligenceReports', updated);
                    return updated;
                  });
                }
              }}
              onSaveSupplier={(supplier) => {
                const exists = suppliers.find(s => s.taxId === supplier.taxId);
                if (!exists) {
                  setSuppliers(prev => [supplier, ...prev]);
                  addAuditEntry('CREATE', 'PROVEEDOR', supplier.id, supplier.name);
                }
              }}
            />
          </Suspense>
        )}
        {activeModule === 'DEVELOPER_CONSOLE' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-slate-600 bg-white border border-slate-200 rounded-lg">
              Cargando Consola de Desarrollador...
            </div>
          }>
            <DeveloperConsole 
              data={{
                suppliers,
                workOrders,
                transactions,
                properties,
                contracts,
                officialDocs,
                tickets,
                dueDiligenceReports,
                leaseContracts,
                maintenanceExpedientes
              }}
              companyLogo={companyLogo}
              onUpdateLogo={setCompanyLogo}
              onUpdate={(collection, item) => {
                // Generic update handler for developer console
                const setters: Record<string, any> = {
                  suppliers: setSuppliers,
                  work_orders: setWorkOrders,
                  transactions: setTransactions,
                  properties: setProperties,
                  contracts: setContracts,
                  official_docs: setOfficialDocs,
                  tickets: setTickets,
                  due_diligence: setDueDiligenceReports,
                  lease_contracts: setLeaseContracts,
                  maintenance_expedientes: setMaintenanceExpedientes,
                  solicitudes: setSolicitudes
                };
                
                if (collection === 'settings') {
                  if (item.id === 'global_config') {
                    if (item.logo !== undefined) setCompanyLogo(item.logo);
                    if (item.credentials !== undefined && typeof item.credentials === 'object' && Object.keys(item.credentials).length > 0) {
                      setCredentials(prev => ({ ...USER_CREDENTIALS, ...prev, ...item.credentials }));
                    }
                  }
                  syncToFirestore(collection, item.id, item);
                } else if (setters[collection]) {
                  setters[collection]((prev: any[]) => prev.map(i => i.id === item.id ? item : i));
                  syncToFirestore(collection, item.id, item);
                }
              }}
              onDelete={(collection, id) => {
                // Generic delete handler for developer console
                const setters: Record<string, any> = {
                  suppliers: setSuppliers,
                  work_orders: setWorkOrders,
                  transactions: setTransactions,
                  properties: setProperties,
                  contracts: setContracts,
                  official_docs: setOfficialDocs,
                  tickets: setTickets,
                  due_diligence: setDueDiligenceReports,
                  lease_contracts: setLeaseContracts,
                  maintenance_expedientes: setMaintenanceExpedientes,
                  solicitudes: setSolicitudes
                };

                if (setters[collection]) {
                  setters[collection]((prev: any[]) => prev.filter(i => i.id !== id));
                  deleteFromFirestore(collection, id);
                }
              }}
              addAuditEntry={addAuditEntry}
              currentUser={currentUser || 'SISTEMA'}
            />
          </Suspense>
        )}

        {activeModule === 'BROCHURE' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-lg">
              Cargando Brochure Comercial PDF...
            </div>
          }>
            <BrochureModule currentUser={currentUser || ''} />
          </Suspense>
        )}

        {activeModule === 'CURRICULUM_CV' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-lg">
              Cargando Currículum Profesional...
            </div>
          }>
            <CurriculumVitae currentUser={currentUser || ''} onClose={() => setActiveModule('TAREAS')} />
          </Suspense>
        )}

        {activeModule === 'BUSQUEDA_EMPLEO' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-amber-600 bg-white border border-slate-200 rounded-lg">
              Cargando Búsqueda de Empleo & Match CV Chile...
            </div>
          }>
            <JobSearchModule 
              currentUser={currentUser || ''} 
              onClose={credentials[currentUser || '']?.role === 'SOLO_EMPLEO' ? undefined : () => setActiveModule('TAREAS')} 
              onLogout={handleLogout}
            />
          </Suspense>
        )}

        {activeModule === 'MANUAL_USUARIO' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-lg">
              Cargando Manual de Usuario...
            </div>
          }>
            <ManualModal onClose={() => setActiveModule('TAREAS')} initialTab="GUIA" />
          </Suspense>
        )}

        {activeModule === 'MAPA_DATOS_LEGAL' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-emerald-600 bg-white border border-slate-200 rounded-lg">
              Iniciando Módulo de Protección de Datos Personales (Ley N° 21.719 Chile)...
            </div>
          }>
            <PersonalDataMapModule companyLogo={companyLogo} />
          </Suspense>
        )}

        {activeModule === 'BENFORD_ANALYSIS' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-lg">
              Iniciando Módulo de Análisis de Ley de Benford (Control Interno)...
            </div>
          }>
            <BenfordAnalysisModule 
              transactions={transactions || []} 
              currentUser={currentUser || 'SISTEMA'} 
              companyLogo={companyLogo}
              onRowClick={(tx) => setSelectedTransactionForDetail(tx)}
            />
          </Suspense>
        )}

        {activeModule === 'REVISION_PROPIEDADES' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-lg">
              Iniciando Módulo de Revisión Física y Actas...
            </div>
          }>
            <PropertyInspectionModule 
              inspections={filteredPropertyInspections}
              properties={filteredProperties}
              contracts={leaseContracts}
              currentUser={currentUser || 'SISTEMA'}
              applicants={applicants}
              companyLogo={companyLogo}
              onSave={async (inspection) => {
                setPropertyInspections(prev => {
                  const idx = prev.findIndex(i => i.id === inspection.id);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = inspection;
                    return next;
                  } else {
                    return [inspection, ...prev];
                  }
                });
                syncToFirestore('property_inspections', inspection.id, inspection);

                // Auto-transition Property status to DISPONIBLE when Acta de Restitución is issued (sent/accepted)
                if (inspection.type === 'RESTITUCION' && (inspection.status === 'ACTA_ENVIADA' || inspection.status === 'ACEPTADO')) {
                  const prop = properties.find(p => p.id === inspection.propertyId);
                  if (prop) {
                    const updatedProp = { ...prop, status: 'DISPONIBLE' };
                    setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
                    const nextProps = properties.map(p => p.id === updatedProp.id ? updatedProp : p);
                    await storage.save('properties', nextProps);
                    syncToFirestore('properties', updatedProp.id, updatedProp);
                    addAuditEntry('UPDATE', 'PROPIEDAD', updatedProp.id, `Propiedad habilitada como DISPONIBLE tras emisión de Acta de Restitución.`);
                  }
                }
              }}
              onDelete={(id) => {
                setPropertyInspections(prev => prev.filter(i => i.id !== id));
                deleteFromFirestore('property_inspections', id);
              }}
              onSync={() => {
                refreshAppData();
              }}
              onSeedTestData={async () => {
                const newProps: Property[] = [
                  {
                    id: 'prop-test-1',
                    code: 'VISTA-401',
                    propertyRole: '999-401',
                    building: 'Edificio Vista Hermosa',
                    address: 'Av. El Condor 1230, Depto 401',
                    floor: '4',
                    commune: 'Las Condes',
                    type: 'DEPARTAMENTO',
                    rentalAmount: 750000,
                    status: 'DISPONIBLE',
                    appraisalValue: 2450
                  },
                  {
                    id: 'prop-test-2',
                    code: 'ROBLES-102',
                    propertyRole: '999-102',
                    building: 'Condominio Los Robles',
                    address: 'Calle Los Alerces 450, Depto 102',
                    floor: '1',
                    commune: 'Providencia',
                    type: 'DEPARTAMENTO',
                    rentalAmount: 620000,
                    status: 'ARRENDADA',
                    appraisalValue: 1890
                  },
                  {
                    id: 'prop-test-3',
                    code: 'SF-905',
                    propertyRole: '999-905',
                    building: 'Torre San Francisco',
                    address: "Av. Libertador Bernardo O'Higgins 890, Depto 905",
                    floor: '9',
                    commune: 'Santiago',
                    type: 'DEPARTAMENTO',
                    rentalAmount: 510000,
                    status: 'ARRENDADA',
                    appraisalValue: 1520
                  }
                ];

                const newApplicants: Applicant[] = [
                  {
                    id: 'app-test-1',
                    name: 'Carlos Mendoza',
                    taxId: '15.678.901-2',
                    email: 'carlos.mendoza@correo.cl',
                    phone: '+56 9 8765 4321',
                    monthlyIncome: 2500000,
                    employmentStatus: 'DEPENDIENTE',
                    propertyId: 'prop-test-1',
                    propertyLabel: 'Edificio Vista Hermosa - Depto 401',
                    score: 85,
                    status: 'APROBADO',
                    userCreator: currentUser || 'SISTEMA',
                    timestamp: Date.now()
                  },
                  {
                    id: 'app-test-2',
                    name: 'Sofía Valenzuela',
                    taxId: '18.234.567-8',
                    email: 'sofia.valenzuela@correo.cl',
                    phone: '+56 9 1234 5678',
                    monthlyIncome: 1800000,
                    employmentStatus: 'INDEPENDIENTE',
                    propertyId: 'prop-test-2',
                    propertyLabel: 'Condominio Los Robles - Depto 102',
                    score: 72,
                    status: 'APROBADO',
                    userCreator: currentUser || 'SISTEMA',
                    timestamp: Date.now()
                  },
                  {
                    id: 'app-test-3',
                    name: 'Lucas Benítez',
                    taxId: '19.456.123-K',
                    email: 'lucas.benitez@correo.cl',
                    phone: '+56 9 9988 7766',
                    monthlyIncome: 1400000,
                    employmentStatus: 'DEPENDIENTE',
                    propertyId: 'prop-test-3',
                    propertyLabel: 'Torre San Francisco - Depto 905',
                    score: 55,
                    status: 'PENDIENTE',
                    userCreator: currentUser || 'SISTEMA',
                    timestamp: Date.now()
                  }
                ];

                const newLeaseContracts: LeaseContract[] = [
                  {
                    id: 'lc-test-1',
                    tenantName: 'Roberto Muñoz',
                    tenantTaxId: '12.345.678-9',
                    propertyId: 'prop-test-2',
                    propertyLabel: 'Condominio Los Robles - Depto 102',
                    monthlyAmount: 620000,
                    currency: 'CLP',
                    startDate: '2025-06-01',
                    endDate: '2026-06-01',
                    status: 'VIGENTE',
                    userCreator: currentUser || 'SISTEMA',
                    timestamp: Date.now(),
                    isTest: true
                  },
                  {
                    id: 'lc-test-2',
                    tenantName: 'María Ignacia Prado',
                    tenantTaxId: '14.987.654-3',
                    propertyId: 'prop-test-3',
                    propertyLabel: 'Torre San Francisco - Depto 905',
                    monthlyAmount: 510000,
                    currency: 'CLP',
                    startDate: '2025-03-15',
                    endDate: '2026-03-15',
                    status: 'VIGENTE',
                    userCreator: currentUser || 'SISTEMA',
                    timestamp: Date.now(),
                    isTest: true
                  }
                ];

                const newInspections: PropertyInspection[] = [
                  {
                    id: 'rev-test-1',
                    type: 'ENTRANTE',
                    propertyId: 'prop-test-1',
                    propertyLabel: 'Edificio Vista Hermosa - Depto 401',
                    contractId: '',
                    tenantName: 'Carlos Mendoza',
                    tenantEmail: 'carlos.mendoza@correo.cl',
                    executiveName: currentUser || 'SISTEMA',
                    executiveEmail: 'ejecutivo@inmobiliariapro.cl',
                    inspectionDate: '2026-07-06',
                    status: 'BORRADOR',
                    items: [
                      { id: 'item-1', area: 'LIVING / COMEDOR', element: 'Puerta Principal', state: 'BUENO', observation: 'Sin detalles.' },
                      { id: 'item-2', area: 'COCINA', element: 'Grifería', state: 'BUENO', observation: 'Presión excelente.' },
                      { id: 'item-3', area: 'COCINA', element: 'Muros / Pintura', state: 'REGULAR', observation: 'Rayas leves tras amoblado.' }
                    ],
                    photos: [],
                    signatureTenant: '',
                    signatureExecutive: '',
                    userCreator: currentUser || 'SISTEMA',
                    timestamp: Date.now()
                  },
                  {
                    id: 'rev-test-2',
                    type: 'RESTITUCION',
                    propertyId: 'prop-test-2',
                    propertyLabel: 'Condominio Los Robles - Depto 102',
                    contractId: 'lc-test-1',
                    tenantName: 'Roberto Muñoz',
                    tenantEmail: 'roberto.munoz@arrendatario.cl',
                    executiveName: currentUser || 'SISTEMA',
                    executiveEmail: 'ejecutivo@inmobiliariapro.cl',
                    inspectionDate: '2026-07-05',
                    status: 'ACTA_ENVIADA',
                    items: [
                      { id: 'item-4', area: 'COCINA', element: 'Muebles de Cocina', state: 'MALO', observation: 'Bisagra rota en puerta superior.' },
                      { id: 'item-5', area: 'DORMITORIO 1', element: 'Pintura', state: 'REGULAR', observation: 'Marcas de cuadros en pared.' }
                    ],
                    photos: [],
                    signatureTenant: '',
                    signatureExecutive: 'Firma Ejecutiva',
                    userCreator: currentUser || 'SISTEMA',
                    timestamp: Date.now() - 3600000 * 24
                  }
                ];

                // Merge and save properties
                const mergedProperties = [...properties.filter(p => !p.id.startsWith('prop-test-')), ...newProps];
                setProperties(mergedProperties);
                await storage.save('properties', mergedProperties);
                for (const p of newProps) {
                  syncToFirestore('properties', p.id, p);
                }

                // Merge and save applicants
                const mergedApplicants = [...applicants.filter(a => !a.id.startsWith('app-test-')), ...newApplicants];
                setApplicants(mergedApplicants);
                await storage.save('applicants', mergedApplicants);
                for (const a of newApplicants) {
                  syncToFirestore('applicants', a.id, a);
                }

                // Merge and save contracts
                const mergedContracts = [...leaseContracts.filter(c => !c.id.startsWith('lc-test-')), ...newLeaseContracts];
                setLeaseContracts(mergedContracts);
                await storage.save('leaseContracts', mergedContracts);
                for (const c of newLeaseContracts) {
                  syncToFirestore('lease_contracts', c.id, c);
                }

                // Merge and save inspections
                const mergedInspections = [...propertyInspections.filter(i => !i.id.startsWith('rev-test-')), ...newInspections];
                setPropertyInspections(mergedInspections);
                await storage.save('propertyInspections', mergedInspections);
                for (const i of newInspections) {
                  syncToFirestore('property_inspections', i.id, i);
                }

                addAuditEntry('CREATE', 'SISTEMA', 'test-data-suite', 'Carga de set integrado de 10 datos de prueba.');
                alert('🎉 ¡Set de 10 datos de prueba cargado con éxito!\n\nSe han registrado:\n- 3 Propiedades de Prueba (1 disponible, 2 arrendadas)\n- 3 Postulantes (2 aprobados listos para Check-In, 1 pendiente)\n- 2 Contratos de Arriendo Vigentes (listos para Check-Out)\n- 2 Actas de Revisión Física (1 borrador de Check-In, 1 enviada de Check-Out)');
              }}
            />
          </Suspense>
        )}

        {activeModule === 'CICLO_VIDA' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-indigo-600 bg-white border border-slate-200 rounded-lg">
              Cargando Ciclo de Vida y Manual del Arriendo...
            </div>
          }>
            <CicloVidaModule currentUser={currentUser || 'SISTEMA'} />
          </Suspense>
        )}

        {activeModule === 'ASISTENTE_TAREAS_IA' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-[#0B3C5D] bg-white border border-slate-200 rounded-lg">
              Iniciando Asistente de Tareas IA (P0001IA) — Priorización Cognitiva con Gemini...
            </div>
          }>
            <TaskAssistantIAModule
              workOrders={workOrders}
              pendingSuppliers={suppliers.filter(s => s.status === 'PENDIENTE_JEFE')}
              contracts={contracts}
              solicitudes={solicitudes}
              currentUser={currentUser || 'SISTEMA'}
              onNavigateToModule={(mod) => setActiveModule(mod)}
            />
          </Suspense>
        )}

        {activeModule === 'HISTORIAL_ARRIENDOS' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-[#002D62] bg-white border border-slate-200 rounded-lg">
              Iniciando Módulo de Consulta e Historial de Arriendo y Comportamiento de Pago...
            </div>
          }>
            <TenantPaymentHistoryModule
              leaseContracts={leaseContracts}
              properties={properties}
              transactions={transactions}
              b13Reports={b13Reports}
              securityDeposits={securityDeposits}
              propertyInspections={propertyInspections}
              currentUser={currentUser || 'SISTEMA'}
              onUpdateContracts={async (updated) => {
                setLeaseContracts(updated);
                await storage.save('leaseContracts', updated);
              }}
            />
          </Suspense>
        )}

        {activeModule === 'MARKETING_CAMPAIGNS' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-emerald-600 bg-white border border-slate-200 rounded-lg">
              Cargando Centro de Campañas Publicitarias & Marketing B2B...
            </div>
          }>
            <MarketingCampaignsModule
              currentUser={currentUser || 'SISTEMA'}
              userEmail={firebaseUser?.email || currentUser || undefined}
              companyLogo={companyLogo}
            />
          </Suspense>
        )}

        {activeModule === 'SYSTEM_LAUNCH' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-emerald-600 bg-white border border-slate-200 rounded-lg">
              Cargando Centro de Lanzamiento Global a Producción...
            </div>
          }>
            <SystemLaunchModule
              currentUser={currentUser || 'SISTEMA'}
              userEmail={firebaseUser?.email || currentUser || undefined}
              onNavigateToModule={(mod) => setActiveModule(mod)}
            />
          </Suspense>
        )}

        {activeModule === 'SYSTEM_LANDING' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-amber-500 bg-slate-900 border border-slate-800 rounded-lg">
              Cargando Página Explicativa de Ventas AssetFlow Enterprise...
            </div>
          }>
            <SystemLandingPageModule
              onNavigateToModule={(mod) => setActiveModule(mod)}
            />
          </Suspense>
        )}

        {activeModule === 'FACTURACION_DTE' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-emerald-600 bg-white border border-slate-200 rounded-lg">
              Cargando Módulo de Facturación Electrónica DTE & Exenciones D.L. 825 Art. 8g...
            </div>
          }>
            <FacturacionDTEModule
              properties={properties}
              contracts={leaseContracts}
              currentUser={currentUser || 'SISTEMA FACTURACIÓN'}
              companyLogo={companyLogo}
              onSyncFirestore={syncToFirestore}
              onAuditEntry={addAuditEntry}
            />
          </Suspense>
        )}

        {activeModule === 'RUTAS_APROBACION' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-[#002D62] bg-white border border-slate-200 rounded-lg">
              Cargando Módulo P43008 de Rutas de Aprobación Jerárquica ERP...
            </div>
          }>
            <ApprovalRoutesModule
              currentUser={currentUser || 'ADMINISTRADOR'}
              userRole={currentUser ? credentials[currentUser]?.role : 'ADMINISTRADOR'}
              onAuditLog={(action, details) => {
                addAuditEntry('UPDATE', 'SISTEMA', 'P43008', `${action}: ${details}`);
              }}
            />
          </Suspense>
        )}

        {activeModule === 'LOGISTICA_WMS' && (
          <Suspense fallback={
            <div className="p-12 text-center text-xs font-bold font-mono animate-pulse text-[#002D62] bg-white border border-slate-200 rounded-lg">
              Cargando Módulo Extra Item Logística & WMS JD Edwards (P4600 / F41021 / F4611)...
            </div>
          }>
            <LogisticsWmsModule
              workspace={wmsWorkspace}
              onUpdateWorkspace={handleUpdateWmsWorkspace}
              currentUser={currentUser || 'SISTEMA'}
              onAuditLog={(action, entityId, details) => {
                addAuditEntry(
                  (action === 'CREATE' || action === 'UPDATE' || action === 'DELETE' ? action : 'UPDATE') as any,
                  'SISTEMA',
                  entityId,
                  details,
                  { moduleName: 'LOGISTICA_WMS', details }
                );
              }}
            />
          </Suspense>
        )}

      {/* MODAL GLOBAL ERP P4310 EMISIÓN DE ÓRDENES Y SOLICITUDES */}
      {isP4310GlobalModalOpen && (
        <Suspense fallback={null}>
          <JDEP4310OrderEntryModal
            isOpen={isP4310GlobalModalOpen}
            onClose={() => setIsP4310GlobalModalOpen(false)}
            mode="WORK_ORDER"
            suppliers={filteredSuppliers}
            properties={filteredProperties}
            existingOrders={workOrders}
            currentUser={currentUser || 'ADMINISTRADOR'}
            userRole={currentUser ? credentials[currentUser]?.role : 'ADMINISTRADOR'}
            onSaveWorkOrder={(wo) => {
              setWorkOrders(prev => {
                const idx = prev.findIndex(item => item.id === wo.id);
                if (idx >= 0) {
                  const n = [...prev];
                  n[idx] = wo;
                  return n;
                }
                return [wo, ...prev];
              });
              syncToFirestore('work_orders', wo.id, wo);
              addAuditEntry(workOrders.some(x => x.id === wo.id) ? 'UPDATE' : 'CREATE', 'ORDEN_TRABAJO', wo.id, `OT ${wo.folio} (P4310 ERP)`);
              emitWorkOrderVoucher(wo, companyLogo, currentUser || 'SISTEMA', true);
              setIsP4310GlobalModalOpen(false);
            }}
            onSaveSolicitud={(sol) => {
              setSolicitudes(prev => {
                const idx = prev.findIndex(s => s.id === sol.id);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = sol;
                  return updated;
                }
                return [sol, ...prev];
              });
              syncToFirestore('solicitudes', sol.id, sol);
              addAuditEntry('CREATE', 'SOLICITUD', sol.id, `Solicitud ${sol.code} emitida en P4310`);
              setIsP4310GlobalModalOpen(false);
            }}
          />
        </Suspense>
      )}

      {/* MODAL GLOBAL DE ALTA DE PROVEEDORES (P01012 / P04012 - 5 TABLAS JDE) */}
      {isGlobalSupplierModalOpen && (
        <Suspense fallback={null}>
          <SupplierForm
            onClose={() => setIsGlobalSupplierModalOpen(false)}
            onSave={(data) => {
              handleAddNewSupplier(data);
              setIsGlobalSupplierModalOpen(false);
            }}
            currentUser={currentUser || 'SISTEMA'}
            companyLogo={companyLogo}
            nextFolio={`PROV-${String(suppliers.length + 1).padStart(4, '0')}`}
            existingSuppliers={suppliers}
          />
        </Suspense>
      )}

      {isTransactionFormOpen && (
        <TransactionForm 
          onClose={() => setIsTransactionFormOpen(false)}
          onSave={(data: any) => {
            let finalData = { ...data };
            
            // Si es un proveedor nuevo, lo creamos en el maestro
            if (data.supplierId === 'NEW') {
              const newSupplierId = `sup-${Date.now()}`;
              const newSupplier: Supplier = {
                id: newSupplierId,
                folio: `PROV-${Date.now().toString().slice(-4)}`,
                taxId: data.supplierTaxId || '',
                name: data.supplierName || '',
                category: data.category || 'OTROS',
                taxDocumentType: 'FACTURA',
                requestDate: new Date().toISOString().split('T')[0],
                contactName: 'REGISTRO DIRECTO',
                email: '',
                phone: '',
                bankName: '',
                accountType: 'CUENTA CORRIENTE',
                accountNumber: '',
                status: 'ACTIVE',
                userCreator: currentUser || 'SISTEMA',
                timestamp: Date.now(),
                dueDiligenceDate: new Date().toISOString().split('T')[0],
                dueDiligenceRisk: 'RIESGO BAJO',
                complianceMaster: {
                  conflictThirdParty: false,
                  conflictExecutive: false,
                  beneficiariesUAF: false,
                  dueDiligenceCert: false,
                  paymentVoucher: false,
                  invoice: false,
                  receptionCertificate: false,
                  photoSet: false
                },
                lockedBy: null,
                lockedAt: null
              };
              setSuppliers(prev => [newSupplier, ...prev]);
              syncToFirestore('suppliers', newSupplierId, newSupplier);
              addAuditEntry('CREATE', 'PROVEEDOR', newSupplierId, newSupplier.name);
              finalData.supplierId = newSupplierId;
            }

            const newId = crypto.randomUUID();
            const nextVal = dataService.getNextNumber(finalData.type === 'INCOME' ? 'rc' : 'pv');
            const workstation = dataService.getWorkStationId();
            const programCode = dataService.getProgramId('TRANSACCION');
            const bchNo = `BAT-${Date.now().toString().slice(-6)}`;

            const transactionData = {
              ...finalData, 
              id: newId, 
              timestamp: Date.now(), 
              user: currentUser,
              nextNumberSeq: nextVal,
              workStationId: workstation,
              programId: programCode,
              batchNumber: bchNo
            };
            (transactionData as any).hashSignature = dataService.generateHashSignature(transactionData);

            setTransactions(prev => [transactionData, ...prev]);
            syncToFirestore('transactions', newId, transactionData);
            addAuditEntry('CREATE', 'TRANSACCION', newId, `TRANSACCIÓN: ${finalData.description || 'Sin descripción'}`, { field: 'MONTO', new: finalData.amount });
            setIsTransactionFormOpen(false);
            emitTransactionVoucher(transactionData, companyLogo, currentUser || 'SISTEMA', true);
          }}
          defaultType={transactionType}
          activeSuppliers={suppliers.filter(s => s.status === 'ACTIVE')}
          properties={filteredProperties}
          contracts={contracts}
        />
      )}
          </Suspense>
          </JDEFormContainer>
        </main>

        {/* 
          ======================================================================
          ASSETFLOW ENTERPRISE STATUS BAR (HIGH FIDELITY ALTA FOOTER)
          ======================================================================
        */}
        <footer className="h-7 bg-[#EAEEF3] border-t border-[#9DB2C3] flex items-center px-3 md:px-4 justify-between no-print text-[10px] font-sans text-slate-700 shrink-0 select-none">
           {/* Left Segment: Form Status and Security */}
           <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1.5 font-mono text-[#002D62] font-bold">
                 <span className="bg-[#FFCC00] text-[#002D62] px-1 py-0.2 rounded-xs border border-[#B89600] text-[8.5px] uppercase">
                   W{String(activeModule || '0000').substring(0, 6)}A
                 </span>
                 <span className="hidden sm:inline font-sans text-slate-600 font-normal">|</span>
                 <span className="text-emerald-800 hidden sm:inline">Listo (Ready)</span>
              </div>

              <span className="text-slate-300 hidden md:inline">|</span>

              <div className="hidden md:flex items-center gap-1 text-[9.5px] text-slate-600">
                 <ShieldCheck size={12} className="text-emerald-700 shrink-0" />
                 <span>ISO 27001 / OWSEC</span>
              </div>
           </div>

           {/* Center Segment: Database Node & Sync Status */}
           <div className="hidden lg:flex items-center gap-3 text-[9.5px] font-mono text-slate-600">
              <div className="flex items-center gap-1.5">
                 <Database size={11} className={(isFirebaseConnected || isDbConnected) ? "text-emerald-700" : "text-amber-600"} />
                 <span className="text-[#002D62] font-bold">
                   AIS NODO: {isDbConnected ? 'VINCULADO' : isFirebaseConnected ? 'CLOUD (FIRESTORE)' : 'STANDALONE'}
                 </span>
              </div>

              <span className="text-slate-300">|</span>

              <div>
                 <span>WS: </span>
                 <strong className="text-slate-700 font-mono">WS_CLNT01</strong>
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1">
                 <RefreshCw size={10} className="text-[#005B94]" />
                 <span>SYNC: {new Date(lastSyncTime).toLocaleTimeString()}</span>
              </div>
           </div>

           {/* Right Segment: Environment, User & Online Mode */}
           <div className="flex items-center gap-2.5 shrink-0 ml-auto font-mono text-[9.5px]">
              <div className="hidden xl:flex items-center gap-1.5 text-slate-600">
                 <span>ENTORNO:</span>
                 <strong className="text-[#002D62] font-bold">JD910_PD</strong>
              </div>

              <span className="text-slate-300 hidden xl:inline">|</span>

              {isFirebaseConnected ? (
                 <div className="flex items-center gap-1 text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-1.5 py-0.2 rounded-xs text-[8.5px] font-bold uppercase tracking-wider">
                    <Wifi size={10} className="text-emerald-700" />
                    <span>En Línea (Cloud)</span>
                 </div>
              ) : isSyncActive ? (
                 <div className="flex items-center gap-1 text-indigo-800 bg-indigo-100/70 border border-indigo-300 px-1.5 py-0.2 rounded-xs text-[8.5px] font-bold uppercase tracking-wider">
                    <FileText size={10} className="text-indigo-700" />
                    <span>Sync Archivo</span>
                 </div>
              ) : (
                 <div className="flex items-center gap-1 text-slate-700 bg-slate-200 border border-slate-300 px-1.5 py-0.2 rounded-xs text-[8.5px] font-bold uppercase tracking-wider">
                    <WifiOff size={10} className="text-slate-500" />
                    <span>Standalone</span>
                 </div>
              )}
           </div>
        </footer>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default App;
