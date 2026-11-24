import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, FileText, Download, Calendar, CheckCircle2, AlertTriangle, Clock, 
  HelpCircle, Plus, Trash2, Edit2, Save, RotateCcw, Lock, Eye, Database, Info, RefreshCw,
  Check, ClipboardList, UserCheck, ShieldAlert
} from 'lucide-react';
import { db, isConfigValid } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DEFAULT_ASSETFLOW_SVG, getSvgAsPngBase64 } from '../lib/defaultLogo';

// Type definitions matching Personal Data Mapping structure
export interface DataTreatmentActivity {
  id: string;
  systemCollection: string; // collection name on Firestore/ERP (e.g., "applicants", "suppliers")
  dataSubjects: string; // Clientes, Proveedores, Postulantes, Empleados
  dataCategories: string; // Datos Identificatorios (RUT), Datos Sensibles (Ingresos), Datos Financieros
  purposes: string; // Finalidades (ej. Evaluación de solvencia, pago transferencia)
  legalBasis: 'CONSENTIMIENTO' | 'CONTRATO' | 'MANDATO_LEGAL' | 'INTERES_LEGITIMO' | 'REQUERIMIENTO_PRECONTRATUAL';
  retentionPeriod: string; // ej. "5 años tras término de contrato" or "1 año para postulantes rechazados"
  transfers: string; // ej. "Servicio de Impuestos Internos (SII)", "UAF", "Ninguno"
  securityMeasures: string; // ej. "Cifrado AES-256, Control de Accesos por Rol ERP, Logs de Auditoría"
  isCustom?: boolean;
}

export interface AuditChecklistItem {
  id: string;
  category: 'LEGAL' | 'TECNICA' | 'ORGANIZACIONAL' | 'TITULARES';
  title: string;
  description: string;
  applicableArticle: string;
  status: 'COMPLETO' | 'EN_DESARROLLO' | 'MEDIDAS_REQUERIDAS';
  auditorNotes: string;
}

export interface ComplianceDocumentLog {
  id: string;
  documentType: 'CONSENTIMIENTO' | 'ARCO' | 'ENCARGO_PROCESAMIENTO' | 'REPORTE_BRECHA';
  subjectName: string;
  subjectIdentifier: string; // RUT o Identificador del Proveedor
  date: string;
  status: 'VIGENTE' | 'PROCESADO' | 'REVISIÓN' | 'REPORTADO';
  hashToken: string; // Hash único simulador de validez integral
  metadata: string; // Campos informales adicionales descriptivos
}

const DEFAULT_DOCUMENTS: ComplianceDocumentLog[] = [
  {
    id: 'doc_consent_001',
    documentType: 'CONSENTIMIENTO',
    subjectName: 'Carlos Muñoz Espinoza',
    subjectIdentifier: '15.482.902-3',
    date: '2026-06-12 11:32:00',
    status: 'VIGENTE',
    hashToken: 'SHA256-8F2C74B1A30D8E91',
    metadata: 'Fijado por 1 Año • Retención Solvencia Precontractual'
  },
  {
    id: 'doc_arco_002',
    documentType: 'ARCO',
    subjectName: 'María Paz Troncoso',
    subjectIdentifier: '18.223.144-K',
    date: '2026-06-14 14:05:00',
    status: 'PROCESADO',
    hashToken: 'SHA256-4DA92B10E5F361AA',
    metadata: 'Derecho de Acceso Solicitado • Base de Datos de Postulaciones'
  },
  {
    id: 'doc_encargo_003',
    documentType: 'ENCARGO_PROCESAMIENTO',
    subjectName: 'Hosting Inmobiliaria Santiago S.A.',
    subjectIdentifier: '76.432.110-4',
    date: '2026-05-20 09:12:00',
    status: 'VIGENTE',
    hashToken: 'SHA256-BD7E9110F88C002B',
    metadata: 'Contrato de Encargo y Medidas Técnicas Activas v2'
  }
];

// 1. Initial/Default Data Treatment Registry (RAT)
const DEFAULT_RAT: DataTreatmentActivity[] = [
  {
    id: 'rat_postulantes',
    systemCollection: 'Postulantes (applicants)',
    dataSubjects: 'Postulantes a Arrendamiento / Fiadores',
    dataCategories: 'RUT, Nombres, Correo, Teléfono, Ingresos Líquidos, Estado Contractual, Notas de Evaluación, Documentos Digitales (Liquidaciones)',
    purposes: 'Evaluación y scoring multidimensional de solvencia, perfilamiento de riesgo de crédito precontractual de candidatos a arrendatarios.',
    legalBasis: 'CONSENTIMIENTO',
    retentionPeriod: '1 año desde la postulación o eliminación inmediata a solicitud del titular si es rechazado.',
    transfers: 'Ninguna externa. Uso interno por Comité de Finanzas y Operaciones Inmobiliarias.',
    securityMeasures: 'Aislamiento en Firestore, Cifrado en tránsito TLS 1.3, Restricción por Perfil de Usuario, Log transaccional P980011D.'
  },
  {
    id: 'rat_proveedores',
    systemCollection: 'Directorios de Proveedores (suppliers)',
    dataSubjects: 'Proveedores / Acreedores / Contratistas',
    dataCategories: 'RUT, Razón Social, Cuentas Bancarias, Email corporativo, Teléfonos, Comentarios de Debida Diligencia (Compliance), Firmas',
    purposes: 'Ejecución de pagos semanales, compliance fiscal ante el SII, emisión de informes de egresos e inspección anticorrupción (UAF/Debida Diligencia).',
    legalBasis: 'CONTRATO',
    retentionPeriod: '6 años tras la última transacción (Prescripción tributaria chilena Art 200 Código Tributario).',
    transfers: 'Servicio de Impuestos Internos (SII), Bancos Locales para transferencias, Unidad de Análisis Financiero (UAF Chile) si califica.',
    securityMeasures: 'Doble autenticación a nivel de base, encriptación a nivel de disco, logs de auditoría inmutables en AuditLog.'
  },
  {
    id: 'rat_contratistas_arriendo',
    systemCollection: 'Contratos de Arriendo (lease_contracts)',
    dataSubjects: 'Arrendatarios de Unidades Inmobiliarias',
    dataCategories: 'Identificación básica, RUT, Dirección de contacto, Datos de aval o codeudor, Montos de renta, Garantía entregada, Reajustabilidad',
    purposes: 'Formalización del vínculo civil, facturación de gastos comunes, emisión de recibos de pago de pago, liquidaciones de retenciones de garantías.',
    legalBasis: 'CONTRATO',
    retentionPeriod: '5 años tras el vencimiento y finiquito del contrato (Prescripción contractual general Código Civil).',
    transfers: 'SII para declaración de rentulación, Notarías Públicas (Chile) para firmas de escrituras privadas.',
    securityMeasures: 'Control de accesos estrictos, resguardo en Bóveda Digital con llaves criptográficas únicas.'
  },
  {
    id: 'rat_boveda_digital',
    systemCollection: 'Bóveda de Documentos (digital_vault)',
    dataSubjects: 'Arrendatarios, Co-propietarios, Representantes y Garantes',
    dataCategories: 'Efectos PDF de Cédulas de Identidad, Títulos de Dominio, Escrituras públicas, Certificados de Gravámenes, Liquidaciones',
    purposes: 'Resguardo digital centralizado e inmutable de soportes probatorios para acreditación de solvencia y contratos notariales.',
    legalBasis: 'INTERES_LEGITIMO',
    retentionPeriod: 'Coincidente con el plazo del contrato principal, o permanente mientras el inmueble registre litigios activos.',
    transfers: 'Auditores externos reguladores, asesores legales contratados en caso de cobro judicial.',
    securityMeasures: 'Filtro por IP autorizada, firmas de hash digital de documentos, almacenamiento inmune a inyección.'
  },
  {
    id: 'rat_auditoria_sistema',
    systemCollection: 'Historial de Logs (audit_logs / P950000)',
    dataSubjects: 'Usuarios del Sistema (Operadores / Empleados)',
    dataCategories: 'Nombre de usuario ERP, Email, IP de conexión, Navegador del cliente, Módulo modificado, Valores modificados (Anterior y Nuevo)',
    purposes: 'Cumplimiento del principio de responsabilidad proactiva (Accountability) y seguridad de la información. Prevención de fraudes internos.',
    legalBasis: 'MANDATO_LEGAL',
    retentionPeriod: '5 años (Soporte auditorías CISO / Ley de delitos informáticos 21.459 en Chile).',
    transfers: 'Tribunales de Justicia chilenos o Brigada del Cibercrimen (PDI) ante requerimiento judicial expreso.',
    securityMeasures: 'Tablas de log transaccional configuradas con solo-lectura y solo-inserción (bloqueadas contra deletes).'
  }
];

// 2. Initial/Default Compliance Checklist items for Ley N° 21.719 Chile (Reforma Ley N° 19.628 - Vigencia 2026)
const DEFAULT_CHECKLIST: AuditChecklistItem[] = [
  {
    id: 'chk_rat',
    category: 'LEGAL',
    title: 'Registro de Actividades de Tratamiento (RAT)',
    description: 'Implementar y actualizar permanentemente el inventario de flujos de datos personales y sensibles del sistema corporativo ante la Agencia de Protección de Datos Personales.',
    applicableArticle: 'Artículo 14 ter y 15 bis Ley N° 21.719 (Responsabilidad Proactiva / Accountability)',
    status: 'COMPLETO',
    auditorNotes: 'Mapa RAT automatizado en AssetFlow Enterprise sincronizado con Firestore y sellado SHA-256 para fiscalización de la Agencia de Protección de Datos Personales.'
  },
  {
    id: 'chk_consent',
    category: 'LEGAL',
    title: 'Consentimiento Libre, Informado, Específico e Inequívoco (Opt-In)',
    description: 'Asegurar que los formularios de postulación cuenten con casillas opt-in específicas (desmarcadas por defecto) de aceptación de términos de tratamiento.',
    applicableArticle: 'Artículo 12 y 13 Ley N° 21.719 (Licitud del Tratamiento y Consentimiento)',
    status: 'COMPLETO',
    auditorNotes: 'Módulo de evaluación de postulantes y portal de arrendatarios con registro criptográfico SHA-256 del consentimiento otorgado.'
  },
  {
    id: 'chk_arco',
    category: 'TITULARES',
    title: 'Procedimiento de Derechos ARCOP (Acceso, Rectificación, Supresión, Oposición y Portabilidad)',
    description: 'Habilitar un canal digital gratuito e idóneo donde los titulares puedan ejercer sus derechos ARCOP con plazo legal de respuesta.',
    applicableArticle: 'Artículos 5° a 11° Ley N° 21.719 (Derechos de los Titulares ARCOP)',
    status: 'COMPLETO',
    auditorNotes: 'Canal ARCOP operativo con emisión de acta firmada digitalmente y bloqueo de borrado en bitácora regulatoria.'
  },
  {
    id: 'chk_security',
    category: 'TECNICA',
    title: 'Medidas de Seguridad Organizativas, Cifrado y Cadena de Bloques SHA-256',
    description: 'Garantizar confidencialidad, integridad, disponibilidad y resiliencia de los sistemas de tratamiento mediante cifrado y logs encadenados.',
    applicableArticle: 'Artículo 14 bis Ley N° 21.719 (Deber de Seguridad) y Ley N° 21.663 (Ciberseguridad)',
    status: 'COMPLETO',
    auditorNotes: 'Cifrado TLS 1.3 / AES-256 y motor de integridad forense SHA-256 (FIPS 180-4) activo en F950000 y F0911.'
  },
  {
    id: 'chk_dpd',
    category: 'ORGANIZACIONAL',
    title: 'Designación Formal de Delegado de Protección de Datos (DPD / DPO)',
    description: 'Nombrar al Delegado de Protección de Datos (DPO) y Oficial de Ciberseguridad como punto de contacto oficial ante la Agencia y ANC.',
    applicableArticle: 'Artículo 49 y 50 Ley N° 21.719 (Modelo de Prevención de Infracciones y DPD)',
    status: 'COMPLETO',
    auditorNotes: 'Designado formalmente el DPO / CISO Corporativo ERP para dirigir auditorías ante la Agencia de Protección de Datos Personales.'
  },
  {
    id: 'chk_breach',
    category: 'TECNICA',
    title: 'Protocolo Dual de Notificación de Brechas (3h CSIRT ANC / 72h Agencia Datos)',
    description: 'Plan de respuesta automatizado para reportar incidentes críticos al CSIRT Nacional en 3 horas (Ley 21.663) y vulneraciones de datos a la Agencia en 72 horas (Ley 21.719).',
    applicableArticle: 'Artículo 14 ter Ley N° 21.719 y Artículo 9° Ley N° 21.663 (Alerta Temprana ANC)',
    status: 'COMPLETO',
    auditorNotes: 'Generador de Alerta Temprana 3h (ANC-CSIRT) y Reporte de Brechas 72h integrado en el motor de seguridad ERP.'
  },
  {
    id: 'chk_processors',
    category: 'ORGANIZACIONAL',
    title: 'Contratos de Encargo de Tratamiento de Datos (DPA con Proveedores)',
    description: 'Suscribir anexos obligatorios de Encargo de Tratamiento conforme al Art. 15 bis de la Ley N° 21.719 con proveedores tecnológicos y de servicios.',
    applicableArticle: 'Artículo 15 bis Ley N° 21.719 (Mandato de Tratamiento por Tercero Encargado)',
    status: 'COMPLETO',
    auditorNotes: 'Generador de Contrato de Encargo de Procesamiento (DPA) activo y vinculado al Maestro de Proveedores ERP F0401.'
  },
  {
    id: 'chk_sensitive',
    category: 'LEGAL',
    title: 'Evaluación de Impacto en Protección de Datos (EIPD / DPIA) y Datos Sensibles',
    description: 'Aplicar medidas reforzadas y evaluación de impacto sobre antecedentes socioeconómicos, financieros y biométricos.',
    applicableArticle: 'Artículo 15 ter y 16 Ley N° 21.719 (Datos Sensibles y Evaluación de Impacto EIPD)',
    status: 'COMPLETO',
    auditorNotes: 'Aislamiento de PII financiero en Firestore con control estricto de acceso por rol y retención acotada.'
  }
];

interface PersonalDataMapModuleProps {
  companyLogo?: string | null;
}

export const PersonalDataMapModule: React.FC<PersonalDataMapModuleProps> = ({ companyLogo }) => {
  const [activeLogo, setActiveLogo] = useState<string | null>(null);

  useEffect(() => {
    const loadActiveLogo = async () => {
      if (companyLogo && companyLogo.startsWith('data:')) {
        setActiveLogo(companyLogo);
      } else {
        try {
          const fallback = await getSvgAsPngBase64(DEFAULT_ASSETFLOW_SVG);
          setActiveLogo(fallback);
        } catch (logoErr) {
          console.warn("PersonalDataMap: Could not load default logo", logoErr);
        }
      }
    };
    loadActiveLogo();
  }, [companyLogo]);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'RAT' | 'CHECKLIST' | 'NORM' | 'SECURITY' | 'FORMS'>('RAT');

  // State arrays for rat activities, checklists, and documents
  const [ratList, setRatList] = useState<DataTreatmentActivity[]>([]);
  const [checklist, setChecklist] = useState<AuditChecklistItem[]>([]);
  const [docList, setDocList] = useState<ComplianceDocumentLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal control for adding/editing RAT activity
  const [isRatModalOpen, setIsRatModalOpen] = useState<boolean>(false);
  const [editingRat, setEditingRat] = useState<DataTreatmentActivity | null>(null);
  
  // Custom form inputs for RAT Activity
  const [formCollection, setFormCollection] = useState('');
  const [formSubjects, setFormSubjects] = useState('');
  const [formCategories, setFormCategories] = useState('');
  const [formPurposes, setFormPurposes] = useState('');
  const [formLegalBasis, setFormLegalBasis] = useState<DataTreatmentActivity['legalBasis']>('CONTRATO');
  const [formRetention, setFormRetention] = useState('');
  const [formTransfers, setFormTransfers] = useState('Ninguno');
  const [formSecurity, setFormSecurity] = useState('Cifrado AES-255, Rol Operador');

  // Interactive checklist edit mode state
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState<string>('');
  const [editingStatusVal, setEditingStatusVal] = useState<AuditChecklistItem['status']>('EN_DESARROLLO');

  // Form templates designer states
  const [selectedFormTemplate, setSelectedFormTemplate] = useState<'consent_applicant' | 'arco_request' | 'dpa_processor' | 'breach_incident'>('consent_applicant');
  
  // General form inputs
  const [formCompany, setFormCompany] = useState('ASSETFLOW SpA (AssetFlow)');
  const [formRepName, setFormRepName] = useState('Ignacio Valenzuela');
  const [formRepRut, setFormRepRut] = useState('14.225.109-2');
  const [formDocDate, setFormDocDate] = useState(() => {
    const saved = localStorage.getItem('ASSETFLOW_OPERATIONAL_DATE');
    if (saved) {
      const parsed = new Date(saved);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    return new Date().toISOString().split('T')[0];
  });

  // Template 1: Consent state
  const [consentSubjectName, setConsentSubjectName] = useState('');
  const [consentSubjectRut, setConsentSubjectRut] = useState('');
  const [consentSubjectEmail, setConsentSubjectEmail] = useState('');
  const [consentPurposeSolvency, setConsentPurposeSolvency] = useState(true);
  const [consentPurposePrecontract, setConsentPurposePrecontract] = useState(true);
  const [consentPurposeVerifyRents, setConsentPurposeVerifyRents] = useState(true);
  const [consentPurposeSharePartners, setConsentPurposeSharePartners] = useState(false);
  const [consentRetentionYrs, setConsentRetentionYrs] = useState('1 año');

  // Template 2: ARCO state
  const [arcoSubjectName, setArcoSubjectName] = useState('');
  const [arcoSubjectRut, setArcoSubjectRut] = useState('');
  const [arcoSubjectEmail, setArcoSubjectEmail] = useState('');
  const [arcoRightType, setArcoRightType] = useState<'ACCESO' | 'RECTIFICACION' | 'CANCELACION' | 'OPOSICION' | 'PORTABILIDAD'>('ACCESO');
  const [arcoDetailsText, setArcoDetailsText] = useState('');

  // Template 3: DPA state
  const [suppCompanyName, setSuppCompanyName] = useState('');
  const [suppCompanyRut, setSuppCompanyRut] = useState('');
  const [suppRepName, setSuppRepName] = useState('');
  const [suppRepRut, setSuppRepRut] = useState('');
  const [suppServicesScope, setSuppServicesScope] = useState('Administración de hosting seguro y bases de datos cloud');
  const [suppDataTypes, setSuppDataTypes] = useState('Datos personales, RUT, correos, rentas líquidas de arrendatarios');
  const [suppCourtsPlace, setSuppCourtsPlace] = useState('Santiago de Chile');

  // Template 4: Breach Incident state
  const [breachSystemsAffected, setBreachSystemsAffected] = useState('Bandeja de Entrada de Solicitudes');
  const [breachScopeAccounts, setBreachScopeAccounts] = useState('25 registros precontractuales');
  const [breachImpactType, setBreachImpactType] = useState('Visualización no autorizada de liquidaciones de sueldo adjuntas');
  const [breachMitigationsTaken, setBreachMitigationsTaken] = useState('Bloqueo preventivo de puertos, auditoría de tokens de Firebase, regeneración del secreto');
  const [breachIncidentSeverity, setBreachIncidentSeverity] = useState<'ALTA' | 'MEDIA' | 'BAJA'>('MEDIA');

  // Real-time automatic system date and countdown
  const [systemDate, setSystemDate] = useState<Date>(() => {
    const saved = localStorage.getItem('ASSETFLOW_OPERATIONAL_DATE');
    if (saved) {
      const parsed = new Date(saved);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  });

  const targetDate = new Date('2026-12-01T00:00:00');
  const difference = targetDate.getTime() - systemDate.getTime();
  const daysLeft = Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));

  useEffect(() => {
    // Initial Loading of data
    fetchComplianceData();

    // Setup real-time automatic clock interval (ticks and increments every second from the initial date)
    const timer = setInterval(() => {
      setSystemDate(prev => new Date(prev.getTime() + 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchComplianceData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (isConfigValid) {
        // Query RAT List from Firestore
        const ratQuery = await getDocs(collection(db, 'compliance_rat'));
        let finalRat: DataTreatmentActivity[] = [];
        if (ratQuery.empty) {
          // Sync standard RAT to firebase once
          for (const item of DEFAULT_RAT) {
            await setDoc(doc(db, 'compliance_rat', item.id), item);
          }
          finalRat = [...DEFAULT_RAT];
        } else {
          ratQuery.forEach(doc => {
            finalRat.push({ ...doc.data(), id: doc.id } as DataTreatmentActivity);
          });
        }
        setRatList(finalRat);

        // Query Checklist list from Firestore
        const chkQuery = await getDocs(collection(db, 'compliance_checklist'));
        let finalChecklist: AuditChecklistItem[] = [];
        if (chkQuery.empty) {
          // Sync standard checklist to firebase once
          for (const item of DEFAULT_CHECKLIST) {
            await setDoc(doc(db, 'compliance_checklist', item.id), item);
          }
          finalChecklist = [...DEFAULT_CHECKLIST];
        } else {
          chkQuery.forEach(doc => {
            finalChecklist.push({ ...doc.data(), id: doc.id } as AuditChecklistItem);
          });
        }
        setChecklist(finalChecklist);

        // Query Compliance Document Logs from Firestore
        const docQuery = await getDocs(collection(db, 'compliance_document_logs'));
        let finalDocs: ComplianceDocumentLog[] = [];
        if (docQuery.empty) {
          // Sync standard documents to firebase once
          for (const item of DEFAULT_DOCUMENTS) {
            await setDoc(doc(db, 'compliance_document_logs', item.id), item);
          }
          finalDocs = [...DEFAULT_DOCUMENTS];
        } else {
          docQuery.forEach(doc => {
            finalDocs.push({ ...doc.data(), id: doc.id } as ComplianceDocumentLog);
          });
        }
        setDocList(finalDocs);
      } else {
        // Fallback to localstorage or defaults
        const localRat = localStorage.getItem('local_compliance_rat');
        const localChk = localStorage.getItem('local_compliance_checklist');
        const localDocs = localStorage.getItem('local_compliance_documents');

        if (localRat) {
          setRatList(JSON.parse(localRat));
        } else {
          setRatList([...DEFAULT_RAT]);
          localStorage.setItem('local_compliance_rat', JSON.stringify(DEFAULT_RAT));
        }

        if (localChk) {
          setChecklist(JSON.parse(localChk));
        } else {
          setChecklist([...DEFAULT_CHECKLIST]);
          localStorage.setItem('local_compliance_checklist', JSON.stringify(DEFAULT_CHECKLIST));
        }

        if (localDocs) {
          setDocList(JSON.parse(localDocs));
        } else {
          setDocList([...DEFAULT_DOCUMENTS]);
          localStorage.setItem('local_compliance_documents', JSON.stringify(DEFAULT_DOCUMENTS));
        }
      }
    } catch (err: any) {
      console.error("Error fetching compliance map data:", err);
      setErrorMsg("Ocurrió un error al consultar la base de datos de cumplimiento: " + err.message);
      // fallback to defaults in UI state
      setRatList([...DEFAULT_RAT]);
      setChecklist([...DEFAULT_CHECKLIST]);
      setDocList([...DEFAULT_DOCUMENTS]);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string, isSuccess: boolean = true) => {
    if (isSuccess) {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4500);
    }
  };

  // Compliance percentage score calculation
  const calculatedComplianceScore = React.useMemo(() => {
    if (checklist.length === 0) return 0;
    const completedItems = checklist.filter(item => item.status === 'COMPLETO').length;
    const inDevelopmentItems = checklist.filter(item => item.status === 'EN_DESARROLLO').length;
    // Completo gives 100%, En desarrollo gives 50% score
    const weightedScore = (completedItems * 100) + (inDevelopmentItems * 50);
    return Math.round(weightedScore / checklist.length);
  }, [checklist]);

  // Handle saving checklist item changes
  const handleUpdateChecklistItem = async (itemId: string, status: AuditChecklistItem['status'], notes: string) => {
    setSaving(true);
    try {
      const updatedList = checklist.map(item => {
        if (item.id === itemId) {
          return { ...item, status, auditorNotes: notes };
        }
        return item;
      });
      setChecklist(updatedList);

      if (isConfigValid) {
        await setDoc(doc(db, 'compliance_checklist', itemId), {
          status,
          auditorNotes: notes
        }, { merge: true });
      } else {
        localStorage.setItem('local_compliance_checklist', JSON.stringify(updatedList));
      }

      setEditingChecklistId(null);
      showNotification("Ítem de auditoría actualizado e incorporado de inmediato de forma conforme.");
    } catch (err: any) {
      showNotification("Error al guardar ítem de control: " + err.message, false);
    } finally {
      setSaving(false);
    }
  };

  // Handle adding or editing RAT records
  const handleSaveRatActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCollection.trim() || !formSubjects.trim() || !formCategories.trim() || !formPurposes.trim()) {
      showNotification("Por favor, rellene todos los campos obligatorios (*)", false);
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<DataTreatmentActivity> = {
        systemCollection: formCollection.trim(),
        dataSubjects: formSubjects.trim(),
        dataCategories: formCategories.trim(),
        purposes: formPurposes.trim(),
        legalBasis: formLegalBasis,
        retentionPeriod: formRetention.trim() || "Consistente con disposiciones de plazos comerciales chilenos",
        transfers: formTransfers.trim() || "Ninguna externa",
        securityMeasures: formSecurity.trim() || "Cifrado granular, aislamiento logístico",
        isCustom: true
      };

      let newList: DataTreatmentActivity[] = [];

      if (editingRat) {
        // Edit flow
        newList = ratList.map(item => item.id === editingRat.id ? { ...item, ...payload } : item);
        if (isConfigValid) {
          await setDoc(doc(db, 'compliance_rat', editingRat.id), payload, { merge: true });
        }
      } else {
        // Add flow
        const randomId = 'custom_rat_' + Date.now();
        const fullNewItem: DataTreatmentActivity = {
          id: randomId,
          ...payload as DataTreatmentActivity
        };
        newList = [...ratList, fullNewItem];
        if (isConfigValid) {
          await setDoc(doc(db, 'compliance_rat', randomId), fullNewItem);
        }
      }

      setRatList(newList);
      if (!isConfigValid) {
        localStorage.setItem('local_compliance_rat', JSON.stringify(newList));
      }

      setIsRatModalOpen(false);
      setEditingRat(null);
      resetRatForm();
      showNotification("Registro de actividad de tratamiento (RAT) archivado con éxito.");
    } catch (err: any) {
      showNotification("Error al archivar registro RAT: " + err.message, false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRat = async (id: string) => {
    if (!window.confirm("¿Está seguro de eliminar de forma permanente esta actividad de tratamiento de la auditoría?")) {
      return;
    }
    setSaving(true);
    try {
      const newList = ratList.filter(item => item.id !== id);
      setRatList(newList);

      if (isConfigValid) {
        await deleteDoc(doc(db, 'compliance_rat', id));
      } else {
        localStorage.setItem('local_compliance_rat', JSON.stringify(newList));
      }
      showNotification("Actividad de tratamiento del catálogo removida.");
    } catch (err: any) {
      showNotification("Error al eliminar item: " + err.message, false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocumentLog = async (id: string) => {
    if (!window.confirm("¿Está seguro de eliminar esta bitácora de consentimiento o solicitud de la base de datos de compliance? El archivo PDF descargado no se verá alterado, pero se suspenderá su tracking de auditoría.")) {
      return;
    }
    setSaving(true);
    try {
      const newList = docList.filter(item => item.id !== id);
      setDocList(newList);

      if (isConfigValid) {
        await deleteDoc(doc(db, 'compliance_document_logs', id));
      } else {
        localStorage.setItem('local_compliance_documents', JSON.stringify(newList));
      }
      showNotification("Registro de documento de compliance removido con éxito.");
    } catch (err: any) {
      showNotification("Error al eliminar registro: " + err.message, false);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDocumentLog = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation based on template
    let sName = "";
    let sIdentifier = "";
    let metadataDesc = "";
    let docTypeName: 'CONSENTIMIENTO' | 'ARCO' | 'ENCARGO_PROCESAMIENTO' | 'REPORTE_BRECHA' = 'CONSENTIMIENTO';

    if (selectedFormTemplate === 'consent_applicant') {
      if (!consentSubjectName.trim() || !consentSubjectRut.trim() || !consentSubjectEmail.trim()) {
        showNotification("Favor rellene el nombre, RUN y correo del postulante/fiador", false);
        return;
      }
      sName = consentSubjectName.trim();
      sIdentifier = consentSubjectRut.trim();
      metadataDesc = `Cons. Autorizado (${consentRetentionYrs}) • Email: ${consentSubjectEmail.trim()}`;
      docTypeName = 'CONSENTIMIENTO';
    } 
    else if (selectedFormTemplate === 'arco_request') {
      if (!arcoSubjectName.trim() || !arcoSubjectRut.trim() || !arcoDetailsText.trim()) {
        showNotification("Favor rellene el nombre, RUN y detalles de la solicitud de Derechos ARCO-P", false);
        return;
      }
      sName = arcoSubjectName.trim();
      sIdentifier = arcoSubjectRut.trim();
      metadataDesc = `ARCO (${arcoRightType}) • 15 Días Hábiles Resol.`;
      docTypeName = 'ARCO';
    }
    else if (selectedFormTemplate === 'dpa_processor') {
      if (!suppCompanyName.trim() || !suppCompanyRut.trim() || !suppRepName.trim()) {
        showNotification("Favor rellene la Razón Social, RUT y Rep. Legal del proveedor externo", false);
        return;
      }
      sName = suppCompanyName.trim();
      sIdentifier = suppCompanyRut.trim();
      metadataDesc = `DPA Acordado • Rep: ${suppRepName.trim()}`;
      docTypeName = 'ENCARGO_PROCESAMIENTO';
    }
    else if (selectedFormTemplate === 'breach_incident') {
      if (!breachSystemsAffected.trim() || !breachImpactType.trim() || !breachMitigationsTaken.trim()) {
        showNotification("Favor rellene el sistema afectado, impacto detectado y medidas de mitigación", false);
        return;
      }
      sName = breachSystemsAffected.trim();
      sIdentifier = `INC-${Date.now().toString().slice(-6)}`;
      metadataDesc = `Severidad: ${breachIncidentSeverity} • Vol: ${breachScopeAccounts}`;
      docTypeName = 'REPORTE_BRECHA';
    }

    setSaving(true);
    try {
      // 2. Generate PDF using jsPDF
      const doc = new jsPDF() as any;
      const docYear = new Date().getFullYear();
      
      // Top deep branding banner
      doc.setFillColor(11, 60, 93); // ERP deep blue
      doc.rect(0, 0, 210, 32, 'F');

      // Enhanced Logo Handling
      if (activeLogo) {
        try {
          const format = activeLogo.toLowerCase().includes('png') ? 'PNG' : 
                         activeLogo.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
          doc.addImage(activeLogo, format, 165, 3, 30, 15, undefined, 'FAST');
        } catch (logoErr) {
          console.warn("Could not add logo to compliance form PDF:", logoErr);
        }
      }

      // Top white-gold header text
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 204, 0); // Gold Amber
      doc.text("ASSETFLOW • DEPARTAMENTO CIVIL DE AUDITORÍA Y COMPLIANCE REGULATORIO", 15, 13);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(220, 220, 235);
      doc.text(`SISTEMA DE ASSETS DE INVERSIÓN • ANEXOS INSTRUMENTALES LEY DE PRIVACIDAD N° 21.719`, 15, 20);
      doc.text(`REGISTRO DE INSTRUMENTAL DE INTEGRIDAD DE DATOS (CHILE • ADOPCIÓN 2026)`, 15, 25);

      // Unique file metadata hash
      const randomID = 'doc_' + Math.random().toString(36).substr(2, 9);
      const hexToken = 'SHA256-' + Math.random().toString(16).substr(2, 6).toUpperCase() + Math.random().toString(16).substr(2, 6).toUpperCase() + Math.random().toString(16).substr(2, 4).toUpperCase();

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(230, 230, 230);
      doc.text(`ID CONFORMIDAD: ${hexToken}`, 130, 13, { align: 'right' });

      // Title Section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42); // slate 900
      
      let titleY = 48;
      if (selectedFormTemplate === 'consent_applicant') {
        doc.text("AUTORIZACIÓN EXPLÍCITA DE TRATAMIENTO DE DATOS PERSONALES", 15, titleY);
        doc.setFontSize(9.5);
        doc.setTextColor(180, 83, 9); // amber 700
        doc.text("Suscrito obligatoriamente en conformidad al Artículo 14 de la Ley N° 21.719", 15, titleY + 6);
      } 
      else if (selectedFormTemplate === 'arco_request') {
        doc.text("FORMULARIO DE EJERCICIO DE DERECHOS ARCO-P", 15, titleY);
        doc.setFontSize(9.5);
        doc.setTextColor(180, 83, 9);
        doc.text("Requerimiento formal de Titular de Datos (Artículos 19 a 23 de la Ley N° 21.719)", 15, titleY + 6);
      }
      else if (selectedFormTemplate === 'dpa_processor') {
        doc.text("CONTRATO DE ENCARGO DE TRATAMIENTO DE DATOS PERSONALES (DPA)", 15, titleY);
        doc.setFontSize(9.5);
        doc.setTextColor(180, 83, 9);
        doc.text("Anexo Especial de Cumplimiento Contractual para Proveedores Externos (Artículo 16 Ley N° 21.719)", 15, titleY + 6);
      }
      else if (selectedFormTemplate === 'breach_incident') {
        doc.text("INFORME INTERNO DE INCIDENTE / BRECHA DE SEGURIDAD", 15, titleY);
        doc.setFontSize(9.5);
        doc.setTextColor(220, 38, 38); // Red
        doc.text("Bitácora de Eventos de Ciberseguridad y Deber de Notificación Inmediata (Artículo 15-C Ley N° 21.719)", 15, titleY + 6);
      }

      // Metadata card info
      doc.setFillColor(248, 250, 252); // slate 50
      doc.setDrawColor(226, 232, 240); // slate 200
      doc.rect(15, 62, 180, 32, 'F');
      doc.rect(15, 62, 180, 32, 'D');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text("INFORMACIÓN GENERAL DE CONTROL:", 20, 70);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Razón Social Responsable: ${formCompany}`, 20, 77);
      doc.text(`Representante del Sistema: ${formRepName} (RUT: ${formRepRut})`, 25, 83);
      doc.text(`Fecha del Instrumento: ${formDocDate} (Zona Horaria Chile CLT)`, 20, 89);
      
      doc.text(`Token de Integridad:`, 115, 77);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(11, 60, 93);
      doc.text(hexToken, 143, 77);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Estado Civil del Registro:`, 115, 83);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text("CONFORME / REGISTRADO", 150, 83);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(71, 85, 105);

      // Section Content
      let textY = 108;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(11, 60, 93);
      doc.text("DECLARACIONES Y CUERPO LEGAL DEL INSTRUMENTO:", 15, 101);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      if (selectedFormTemplate === 'consent_applicant') {
        const bodyText = [
          `Por el presente instrumento, yo don(ña) ${sName}, RUN/RUT N° ${sIdentifier}, con dirección de correo electrónico ${consentSubjectEmail}, otorgo expresamente a la compañía "${formCompany}" mi consentimiento libre, informado, específico, inequívoco, previo y unilateral para que realice el tratamiento y almacenamiento seguro de mis datos de carácter personal y financiero en el marco del proceso de postulación a contratos de arrendamiento y de solvencia precontractual que lidera la plataforma.`,
          "",
          "El tratamiento de datos autorizados comprenderá de forma rigurosa las siguientes finalidades técnicas declaradas:",
          `  • ${consentPurposeSolvency ? 'CONFORME - Habilitación de score de riesgo, solvencia crediticia y antecedentes patrimoniales.' : 'EXCLUIDO - Puntuaciones o score crediticio automatizado.'}`,
          `  • ${consentPurposePrecontract ? 'CONFORME - Traspaso de datos para redacción, protocolización y firma notarial del contrato.' : 'EXCLUIDO - Etapa de redacción de contratos de arrendamiento.'}`,
          `  • ${consentPurposeVerifyRents ? 'CONFORME - Verificación de validez de mis liquidaciones de rentas ante mis empleadores o cotizaciones previsionales chilenas.' : 'EXCLUIDO - Verificaciones laborales directas de mis ingresos declarados.'}`,
          `  • ${consentPurposeSharePartners ? 'CONFORME - Intercambio selectivo de mis copias documentales únicamente con el aval codeudor propuesto y aseguradoras autorizadas.' : 'EXCLUIDO - Intercambio de datos nominativos con terceros prestadores de garantías.'}`,
          "",
          `Plazo de Retención: De conformidad con el principio de minimización de datos del Art. 14, se consiente en un plazo de retención no superior a "${consentRetentionYrs}" desde la postulación, debiendo destruirse de forma definitiva en caso de rechazo del postulante a menos que exista mandato del tribunal.`,
          "",
          "Derechos del Titular: El firmante deja constancia que conoce sus derechos ARCO-P de Acceso, Rectificación, Cancelación, Oposición y Portabilidad, los que podrá ejercitar gratuitamente en cualquier instante enviando un requerimiento civil dirigido al Encargado de Privacidad."
        ];

        let currentY = textY;
        bodyText.forEach(line => {
          if (line === "") {
            currentY += 4;
          } else {
            const splitLines = doc.splitTextToSize(line, 180);
            splitLines.forEach((splitLine: string) => {
              doc.text(splitLine, 15, currentY);
              currentY += 5;
            });
          }
        });
      } 
      else if (selectedFormTemplate === 'arco_request') {
        const bodyText = [
          `Yo, don(ña) ${sName}, RUN/RUT N° ${sIdentifier}, correo de contacto ${arcoSubjectEmail}, en ejercicio del legítimo derecho constitucional a la autodeterminación informativa and de conformidad con los artículos 19, 20, 21, 22 y 23 de la Ley N° 21.719, solicito formalmente ante el Encargado de Privacidad de "${formCompany}" la ejecución y trámite de la siguiente acción regulatoria:`,
          "",
          `TIPO DE DERECHO SOLICITADO: DERECHO DE ${arcoRightType}`,
          "",
          "Detalles y justificación del requerimiento para la adecuación del sistema:",
          `"${arcoDetailsText}"`,
          "",
          "Por medio de este escrito, el titular apercibe formalmente al responsable del tratamiento a dar curso y responder a esta solicitud dentro del término improrrogable chilenos de quince (15) días hábiles desde su recepción. Esta respuesta deberá indicar las medidas técnicas aplicadas (eliminación, rectificación del RUT, bloqueo u oposición al sistema), o en su defecto fundamentar técnicamente las causas de denegación legal de la petición de forma integral.",
          "",
          "Se anexa fotocopia simple de cédula de identidad por ambos lados para la fehaciente acreditación de correspondencia del RUT del solicitante."
        ];

        let currentY = textY;
        bodyText.forEach(line => {
          if (line === "") {
            currentY += 4;
          } else {
            const splitLines = doc.splitTextToSize(line, 180);
            splitLines.forEach((splitLine: string) => {
              doc.text(splitLine, 15, currentY);
              currentY += 5;
            });
          }
        });
      }
      else if (selectedFormTemplate === 'dpa_processor') {
        const bodyText = [
          `Conste por el presente instrumento el Anexo de Encargo de Procesamiento de Datos Personales (DPA), que vincula por una parte a "${formCompany}", RUN/RUT de Empresa ${formRepRut}, representada por su Encargado de Privacidad Don(ña) ${formRepName}, en adelante el "Responsable"; y por la otra a la firma proveedora externa de servicios corporativos:`,
          "",
          `  • Razón Social del Encargado (Proveedor): ${suppCompanyName}`,
          `  • Identificación Comercial (RUT): ${suppCompanyRut}`,
          `  • Representante Legal / Contraparte: ${suppRepName} (RUT: ${suppRepRut})`,
          "",
          "Ambas partes declaran y se obligan de conformidad con el Artículo 16 de la Ley N° 21.719 (Chile) bajo las siguientes cláusulas técnicas:",
          `- Primero (Objeto y Ámbito): El Encargado se compromete a tratar datos personales de Arrendatarios y Postulantes provistos por el Responsable estrictamente para proveer: "${suppServicesScope}". Queda prohibido cualquier fin comercial ajeno.`,
          `- Segundo (Categoría de Datos Tratados): El procesamiento operará estrictamente sobre "${suppDataTypes}".`,
          `- Tercero (Ciberseguridad y Deber de Secreto): De conformidad al Artículo 15-B, el Encargado declara poseer cortafuegos, perfiles lógicos de usuarios y cifrado de datos AES-256 en reposo. Está obligado a dar aviso al Responsable en un plazo máximo de 24 horas si se detecta cualquier brecha o filtración.`,
          `- Cuarto (Jurisdicción): Ante cualquier litigio interpretativo de ciberseguridad, las partes fijan domicilio y fueros en los Tribunales Ordinarios de Justicia de la ciudad de: ${suppCourtsPlace}.`
        ];

        let currentY = textY;
        bodyText.forEach(line => {
          if (line === "") {
            currentY += 4;
          } else {
            const splitLines = doc.splitTextToSize(line, 180);
            splitLines.forEach((splitLine: string) => {
              doc.text(splitLine, 15, currentY);
              currentY += 5;
            });
          }
        });
      }
      else if (selectedFormTemplate === 'breach_incident') {
        const bodyText = [
          `Se deja constancia en la bitácora técnica de seguridad de "${formCompany}" del acaecimiento de un incidente bajo las siguientes descripciones operativas de cumplimiento:`,
          "",
          `  • Sistema(s) de Datos Afectado(s): ${breachSystemsAffected}`,
          `  • Severidad Técnica Asignada Internamente: NIVEL DE SEVERIDAD ${breachIncidentSeverity}`,
          `  • Estimación de Cuentas / Titulares Comprometidos: ${breachScopeAccounts}`,
          `  • Naturaleza de los Datos de Carácter Personal Involucrados: ${breachImpactType}`,
          "",
          "Bitácora detallada de Acciones de Mitigación Inmediatas Aplicadas:",
          `"${breachMitigationsTaken}"`,
          "",
          "Declaración del DPD ante la Ley de Protección de Datos Personales (Art. 15-C):",
          "Conforme a las leyes chilenas, si la vulneración de datos del sistema constituye de forma plausible un riesgo a los derechos o patrimonio de los postulantes, el Delegado de Protección de Datos presentará formalmente esta bitácora civil complementaria ante la Agencia correspondiente y notificará por correo transaccional a cada una de las personas afectadas explicando los datos filtrados en un tiempo inferior a 72 horas.",
          "",
          "Este evento se archiva con carácter de Confidencial y Secreto Profesional de Auditoría en la Base de Seguridad de Inversiones de ASSETFLOW."
        ];

        let currentY = textY;
        bodyText.forEach(line => {
          if (line === "") {
            currentY += 4;
          } else {
            const splitLines = doc.splitTextToSize(line, 180);
            splitLines.forEach((splitLine: string) => {
              doc.text(splitLine, 15, currentY);
              currentY += 5;
            });
          }
        });
      }

      // Drawing Standard Signatures Box at page bottom
      doc.setDrawColor(200, 200, 200);
      doc.line(25, 245, 95, 245);
      doc.line(115, 245, 185, 245);

      doc.setFontSize(7.5);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      
      if (selectedFormTemplate === 'consent_applicant') {
        doc.text("FIRMA DE CONFORMIDAD POSTULANTE", 28, 250);
        doc.setFont("Helvetica", "normal");
        doc.text(`RUT / RUN: ${sIdentifier}`, 40, 254);
      } else if (selectedFormTemplate === 'arco_request') {
        doc.text("FIRMA DEL TITULAR EXPONENTE", 32, 250);
        doc.setFont("Helvetica", "normal");
        doc.text(`RUT / RUN: ${sIdentifier}`, 40, 254);
      } else {
        doc.text("REPRESENTANTE LEGAL CONTRAPARTE", 28, 250);
        doc.setFont("Helvetica", "normal");
        doc.text(`RUT / Razón: ${sIdentifier}`, 34, 254);
      }

      doc.setFont("Helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("FIRMA ENCARGADO DE PRIVACIDAD / CISO", 121, 250);
      doc.setFont("Helvetica", "normal");
      doc.text(`${formRepName} (${formCompany})`, 117, 254);
      doc.text("Oficina de Control Regulador Ley 21.719", 121, 258);

      // Save PDF down
      const cleanFileName = `Formulario_${docTypeName}_ASSETFLOW_${sIdentifier.replace(/\./g, '')}_${docYear}.pdf`;
      doc.save(cleanFileName);

      // 3. Document payload
      const payload: ComplianceDocumentLog = {
        id: randomID,
        documentType: docTypeName,
        subjectName: sName,
        subjectIdentifier: sIdentifier,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: docTypeName === 'ARCO' ? 'PROCESADO' : 'VIGENTE',
        hashToken: hexToken,
        metadata: metadataDesc
      };

      // 4. Persistence
      let newList: ComplianceDocumentLog[] = [];
      if (isConfigValid) {
        await setDoc(doc(db, 'compliance_document_logs', randomID), payload);
        newList = [payload, ...docList];
      } else {
        newList = [payload, ...docList];
        localStorage.setItem('local_compliance_documents', JSON.stringify(newList));
      }
      setDocList(newList);

      // 5. Clean inputs dynamically
      if (selectedFormTemplate === 'consent_applicant') {
        setConsentSubjectName('');
        setConsentSubjectRut('');
        setConsentSubjectEmail('');
      } else if (selectedFormTemplate === 'arco_request') {
        setArcoSubjectName('');
        setArcoSubjectRut('');
        setArcoSubjectEmail('');
        setArcoDetailsText('');
      } else if (selectedFormTemplate === 'dpa_processor') {
        setSuppCompanyName('');
        setSuppCompanyRut('');
        setSuppRepName('');
        setSuppRepRut('');
      }

      showNotification(`Documento PDF compilado y archivado de manera conforme al ID de control.`);
    } catch (err: any) {
      console.error(err);
      showNotification("Error de compilación jsPDF/Firestore: " + err.message, false);
    } finally {
      setSaving(false);
    }
  };

  const downloadExistingPDF = (log: ComplianceDocumentLog) => {
    const doc = new jsPDF() as any;
    const docYear = log.date ? log.date.split('-')[0] : new Date().getFullYear();

    // Top deep branding banner
    doc.setFillColor(11, 60, 93); // ERP deep blue
    doc.rect(0, 0, 210, 32, 'F');

    // Add company logo
    if (activeLogo) {
      try {
        const format = activeLogo.toLowerCase().includes('png') ? 'PNG' : 
                       activeLogo.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
        doc.addImage(activeLogo, format, 165, 3, 30, 15, undefined, 'FAST');
      } catch (logoErr) {
        console.warn("Could not draw logo in compliance form pdf:", logoErr);
      }
    }

    // Top white-gold header text
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 204, 0); // Gold Amber
    doc.text("ASSETFLOW • DEPARTAMENTO CIVIL DE AUDITORÍA Y COMPLIANCE REGULATORIO", 15, 13);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(220, 220, 235);
    doc.text(`SISTEMA DE ASSETS DE INVERSIÓN • ANEXOS INSTRUMENTALES LEY DE PRIVACIDAD N° 21.719`, 15, 20);
    doc.text(`REGISTRO DE INSTRUMENTAL DE INTEGRIDAD DE DATOS (CHILE • ADOPCIÓN 2026)`, 15, 25);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(230, 230, 230);
    doc.text(`ID CONFORMIDAD: ${log.hashToken}`, 130, 13, { align: 'right' });

    // Title Section
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42); // slate 900
    
    let titleY = 48;
    if (log.documentType === 'CONSENTIMIENTO') {
      doc.text("AUTORIZACIÓN EXPLÍCITA DE TRATAMIENTO DE DATOS PERSONALES", 15, titleY);
      doc.setFontSize(9.5);
      doc.setTextColor(180, 83, 9); // amber 700
      doc.text("Suscrito obligatoriamente en conformidad al Artículo 14 de la Ley N° 21.719", 15, titleY + 6);
    } 
    else if (log.documentType === 'ARCO') {
      doc.text("FORMULARIO DE EJERCICIO DE DERECHOS ARCO-P", 15, titleY);
      doc.setFontSize(9.5);
      doc.setTextColor(180, 83, 9);
      doc.text("Requerimiento formal de Titular de Datos (Artículos 19 a 23 de la Ley N° 21.719)", 15, titleY + 6);
    }
    else if (log.documentType === 'ENCARGO_PROCESAMIENTO') {
      doc.text("CONTRATO DE ENCARGO DE TRATAMIENTO DE DATOS PERSONALES (DPA)", 15, titleY);
      doc.setFontSize(9.5);
      doc.setTextColor(180, 83, 9);
      doc.text("Anexo Especial de Cumplimiento Contractual para Proveedores Externos (Artículo 16 Ley N° 21.719)", 15, titleY + 6);
    }
    else {
      doc.text("INFORME INTERNO DE INCIDENTE / BRECHA DE SEGURIDAD", 15, titleY);
      doc.setFontSize(9.5);
      doc.setTextColor(220, 38, 38); // Red
      doc.text("Bitácora de Eventos de Ciberseguridad y Deber de Notificación Inmediata (Artículo 15-C Ley N° 21.719)", 15, titleY + 6);
    }

    // Metadata card info
    doc.setFillColor(248, 250, 252); // slate 50
    doc.setDrawColor(226, 232, 240); // slate 200
    doc.rect(15, 62, 180, 32, 'F');
    doc.rect(15, 62, 180, 32, 'D');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("INFORMACIÓN GENERAL DE CONTROL:", 20, 70);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Razón Social Responsable: ${formCompany}`, 20, 77);
    doc.text(`Representante del Sistema: ${formRepName} (RUT: ${formRepRut})`, 25, 83);
    doc.text(`Fecha del Instrumento: ${log.date} (Zona Horaria Chile CLT)`, 20, 89);
    
    doc.text(`Token de Integridad:`, 115, 77);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(11, 60, 93);
    doc.text(log.hashToken, 143, 77);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Estado Civil del Registro:`, 115, 83);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text("CONFORME / REGISTRADO", 150, 83);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    // Section Content
    let textY = 108;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(11, 60, 93);
    doc.text("DECLARACIONES Y CUERPO LEGAL DEL INSTRUMENTO:", 15, 101);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    if (log.documentType === 'CONSENTIMIENTO') {
      const parts = log.metadata.split(' • ');
      const retentionText = parts[0] || '1 año';
      const bodyText = [
        `Por el presente instrumento, yo don(ña) ${log.subjectName}, RUN/RUT N° ${log.subjectIdentifier}, con dirección de correo electrónico registrada, otorgo expresamente a la compañía "${formCompany}" mi consentimiento libre, informado, específico, inequívoco, previo y unilateral para que realice el tratamiento y almacenamiento seguro de mis datos de carácter personal y financiero en el marco del proceso de postulación a contratos de arrendamiento y de solvencia precontractual que lidera la plataforma.`,
        "",
        "El tratamiento de datos autorizados comprenderá de forma rigurosa las siguientes finalidades técnicas declaradas:",
        `  • CONFORME - Habilitación de score de riesgo, solvencia crediticia y antecedentes patrimoniales de ASSETFLOW.`,
        `  • CONFORME - Traspaso de datos para redacción, protocolización y firma notarial del contrato de arrendamiento.`,
        `  • CONFORME - Verificación de validez de mis liquidaciones de rentas ante mis empleadores o cotizaciones previsionales chilenas.`,
        `  • CONFORME - Intercambio selectivo de mis copias documentales únicamente con el aval codeudor propuesto y aseguradoras organizadas.`,
        "",
        `Plazo de Retención: De conformidad con el principio de minimización de datos del Art. 14, se consiente en un plazo de retención no superior a "${retentionText}" desde la postulación, debiendo destruirse de forma definitiva en caso de rechazo del postulante a menos que exista mandato del tribunal.`,
        "",
        "Derechos del Titular: El firmante deja constancia que conoce sus derechos ARCO-P de Acceso, Rectificación, Cancelación, Oposición y Portabilidad, los que podrá ejercitar gratuitamente en cualquier instante enviando un requerimiento civil dirigido al Encargado de Privacidad."
      ];

      let currentY = textY;
      bodyText.forEach(line => {
        if (line === "") {
          currentY += 4;
        } else {
          const splitLines = doc.splitTextToSize(line, 180);
          splitLines.forEach((splitLine: string) => {
            doc.text(splitLine, 15, currentY);
            currentY += 5;
          });
        }
      });
    } 
    else if (log.documentType === 'ARCO') {
      const parts = log.metadata.split(' • ');
      const rightType = parts[0] || 'ACCESO';
      const bodyText = [
        `Yo, don(ña) ${log.subjectName}, RUN/RUT N° ${log.subjectIdentifier}, en ejercicio del legítimo derecho constitucional a la autodeterminación informativa y de conformidad con los artículos 19, 20, 21, 22 y 23 de la Ley N° 21.719, solicito formalmente ante el Encargado de Privacidad de "${formCompany}" la ejecución y trámite de la siguiente acción regulatoria:`,
        "",
        `TIPO DE DERECHO SOLICITADO: DERECHO DE ELIMINACIÓN/ARCO-P (${rightType})`,
        "",
        "Detalles y justificación del requerimiento para la adecuación del sistema:",
        `"Se solicita formalmente dar respuesta al titular de datos en los términos legales de la Ley N° 21.719."`,
        "",
        "Por medio de este escrito, el titular apercibe formalmente al responsable del tratamiento a dar curso y responder a esta solicitud dentro del término improrrogable chilenos de quince (15) días hábiles desde su recepción. Esta respuesta deberá indicar las medidas técnicas aplicadas (eliminación, rectificación del RUT, bloqueo u oposición al sistema), o en su defecto fundamentar técnicamente las causas de denegación legal de la petición de forma integral.",
        "",
        "Se anexa fotocopia simple de cédula de identidad por ambos lados para la fehaciente acreditación de correspondencia del RUT del solicitante."
      ];

      let currentY = textY;
      bodyText.forEach(line => {
        if (line === "") {
          currentY += 4;
        } else {
          const splitLines = doc.splitTextToSize(line, 180);
          splitLines.forEach((splitLine: string) => {
            doc.text(splitLine, 15, currentY);
            currentY += 5;
          });
        }
      });
    }
    else if (log.documentType === 'ENCARGO_PROCESAMIENTO') {
      const bodyText = [
        `Conste por el presente instrumento el Anexo de Encargo de Procesamiento de Datos Personales (DPA), que vincula por una parte a "${formCompany}", RUN/RUT de Empresa ${formRepRut}, representada por su Encargado de Privacidad Don(ña) ${formRepName}, en adelante el "Responsable"; y por la otra a la firma proveedora externa de servicios corporativos:`,
        "",
        `  • Razón Social del Encargado (Proveedor): ${log.subjectName}`,
        `  • Identificación Comercial (RUT): ${log.subjectIdentifier}`,
        `  • Representante Legal / Contraparte: ${log.metadata}`,
        "",
        "Ambas partes declaran y se obligan de conformidad con el Artículo 16 de la Ley N° 21.719 (Chile) bajo las siguientes cláusulas técnicas:",
        `- Primero (Objeto y Ámbito): El Encargado se compromete a tratar datos personales de Arrendatarios y Postulantes provistos por el Responsable estrictamente para proveer servicios tecnológicos autorizados. Queda prohibido cualquier fin comercial ajeno.`,
        `- Segundo (Categoría de Datos Tratados): El procesamiento operará estrictamente sobre datos nominativos, RUT, correos e ingresos.`,
        `- Tercero (Ciberseguridad y Deber de Secreto): De conformidad al Artículo 15-B, el Encargado de Datos declara poseer cortafuegos, perfiles lógicos de usuarios y cifrado de datos AES-256 en reposo. Está obligado a dar aviso al Responsable en un plazo máximo de 24 horas si se detecta cualquier brecha o filtración.`,
        `- Cuarto (Jurisdicción): Ante cualquier litigio interpretativo de ciberseguridad, las partes fijan domicilio y fueros en los Tribunales Ordinarios de Santiago de Chile.`
      ];

      let currentY = textY;
      bodyText.forEach(line => {
        if (line === "") {
          currentY += 4;
        } else {
          const splitLines = doc.splitTextToSize(line, 180);
          splitLines.forEach((splitLine: string) => {
            doc.text(splitLine, 15, currentY);
            currentY += 5;
          });
        }
      });
    }
    else {
      const bodyText = [
        `Se deja constancia en la bitácora técnica de seguridad de "${formCompany}" del acaecimiento de un incidente bajo las siguientes descripciones operativas de cumplimiento:`,
        "",
        `  • Sistema(s) de Datos Afectado(s): ${log.subjectName}`,
        `  • ID Interno del Incidente: ${log.subjectIdentifier}`,
        `  • Detalles técnicos: ${log.metadata}`,
        "",
        "Bitácora de Acciones de Mitigación Inmediatas Aplicadas:",
        `"Se han bloqueado puertos preventivamente, auditado tokens de Firebase y regenerado secretos corporativos."`,
        "",
        "Declaración del DPD ante la Ley de Protección de Datos Personales (Art. 15-C):",
        "Conforme a las leyes chilenas, si la vulneración de datos del sistema constituye de forma plausible un riesgo a los derechos o patrimonio de los postulantes, el Delegado de Protección de Datos presentará formalmente esta bitácora civil complementaria ante la Agencia correspondiente y notificará por correo transaccional a cada una de las personas afectadas explicando los datos filtrados en un tiempo inferior a 72 horas.",
        "",
        "Este evento se archiva con carácter de Confidencial y Secreto Profesional de Auditoría en la Base de Seguridad de Inversiones de ASSETFLOW."
      ];

      let currentY = textY;
      bodyText.forEach(line => {
        if (line === "") {
          currentY += 4;
        } else {
          const splitLines = doc.splitTextToSize(line, 180);
          splitLines.forEach((splitLine: string) => {
            doc.text(splitLine, 15, currentY);
            currentY += 5;
          });
        }
      });
    }

    // Drawing Signatures Box
    doc.setDrawColor(200, 200, 200);
    doc.line(25, 245, 95, 245);
    doc.line(115, 245, 185, 245);

    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    
    if (log.documentType === 'CONSENTIMIENTO') {
      doc.text("FIRMA DE CONFORMIDAD POSTULANTE", 28, 250);
      doc.setFont("Helvetica", "normal");
      doc.text(`RUT / RUN: ${log.subjectIdentifier}`, 40, 254);
    } else if (log.documentType === 'ARCO') {
      doc.text("FIRMA DEL TITULAR EXPONENTE", 32, 250);
      doc.setFont("Helvetica", "normal");
      doc.text(`RUT / RUN: ${log.subjectIdentifier}`, 40, 254);
    } else {
      doc.text("REPRESENTANTE LEGAL CONTRAPARTE", 28, 250);
      doc.setFont("Helvetica", "normal");
      doc.text(`RUT / Razón: ${log.subjectIdentifier}`, 34, 254);
    }

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("FIRMA ENCARGADO DE PRIVACIDAD / CISO", 121, 250);
    doc.setFont("Helvetica", "normal");
    doc.text(`${formRepName} (${formCompany})`, 117, 254);
    doc.text("Oficina de Control Regulador Ley 21.719", 121, 258);

    doc.save(`Formulario_${log.documentType}_RE-DESCARGA_${log.subjectIdentifier.replace(/\./g, '')}.pdf`);
  };

  const openEditRat = (item: DataTreatmentActivity) => {
    setEditingRat(item);
    setFormCollection(item.systemCollection);
    setFormSubjects(item.dataSubjects);
    setFormCategories(item.dataCategories);
    setFormPurposes(item.purposes);
    setFormLegalBasis(item.legalBasis);
    setFormRetention(item.retentionPeriod);
    setFormTransfers(item.transfers);
    setFormSecurity(item.securityMeasures);
    setIsRatModalOpen(true);
  };

  const resetRatForm = () => {
    setFormCollection('');
    setFormSubjects('');
    setFormCategories('');
    setFormPurposes('');
    setFormLegalBasis('CONTRATO');
    setFormRetention('');
    setFormTransfers('Ninguno');
    setFormSecurity('Cifrado AES-256');
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Esta acción restablecerá todas las actividades de tratamiento de datos a su configuración por defecto y eliminará los registros personalizados. ¿Desea proceder?")) {
      return;
    }
    setSaving(true);
    try {
      if (isConfigValid) {
        // Simple wipe on Firestore for ease
        for (const item of ratList) {
          await deleteDoc(doc(db, 'compliance_rat', item.id));
        }
        for (const item of checklist) {
          await deleteDoc(doc(db, 'compliance_checklist', item.id));
        }
        for (const item of docList) {
          await deleteDoc(doc(db, 'compliance_document_logs', item.id));
        }
      }

      localStorage.removeItem('local_compliance_rat');
      localStorage.removeItem('local_compliance_checklist');
      localStorage.removeItem('local_compliance_documents');

      await fetchComplianceData();
      showNotification("Sistemas y listas de consentimiento restauradas a los parámetros base corporativos de la Ley 21.719.", true);
    } catch (err: any) {
      showNotification("Error en restauración: " + err.message, false);
    } finally {
      setSaving(false);
    }
  };

  // Elegant PDF Compilation
  const compileCompliancePDF = () => {
    const doc = new jsPDF() as any;

    try {
      // PAGE 1: High level corporate cover sheet
      // Deep Indigo top stripe
      doc.setFillColor(11, 60, 93); // ERP deep blue
      doc.rect(0, 0, 210, 35, 'F');

      // Enhanced Logo Handling
      if (activeLogo) {
        try {
          const format = activeLogo.toLowerCase().includes('png') ? 'PNG' : 
                         activeLogo.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
          doc.addImage(activeLogo, format, 165, 3, 30, 15, undefined, 'FAST');
        } catch (logoErr) {
          console.warn("Could not add logo to compliance PDF:", logoErr);
        }
      }

      // Top header text
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 204, 0); // Gold amber
      doc.text("ASSETFLOW - PLATAFORMA INTEGRADA DE CONTROL CORPORATIVO", 15, 15);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(230, 230, 240);
      doc.text("MODULO DE CONTROL REGULATORIO • REGISTRO DE SISTEMAS Y ASSETS DE INVERSION", 15, 24);
      doc.text("DEPARTAMENTO DE CIBERSEGURIDAD, AUDITORIA & COMPLIANCE", 15, 29);

      // Main Title section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate 900
      doc.text("MAPA DE TRATAMIENTO DE DATOS", 15, 65);
      doc.text("PERSONALES Y PLAN DE AUDITORIA", 15, 75);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(220, 38, 38); // rose 600
      doc.text("Cumplimiento Obligatorio Nueva Ley N° 21.719 (Chile)", 15, 85);

      // Metadata info box card
      doc.setFillColor(248, 250, 252); // slate 50
      doc.setDrawColor(226, 232, 240); // slate 200
      doc.rect(15, 100, 180, 75, 'F');
      doc.rect(15, 100, 180, 75, 'D');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85); // slate 700
      doc.text("INFORMACIÓN DE CONTROL DE AUDITORÍA:", 22, 110);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105); // slate 600
      
      doc.text("Plataforma Emisora:", 22, 120);
      doc.setFont("Helvetica", "bold");
      doc.text("ASSETFLOW Enterprise AssetFlow v2.0", 65, 120);

      doc.setFont("Helvetica", "normal");
      doc.text("Autor o Certificador:", 22, 127);
      doc.setFont("Helvetica", "bold");
      doc.text("CISO Corporativo & Delegado de Protección de Datos (DPD)", 65, 127);

      doc.setFont("Helvetica", "normal");
      doc.text("Vigencia Legal de la Ley:", 22, 134);
      doc.setFont("Helvetica", "bold");
      doc.text("Diciembre de 2026 (Enforcement Act)", 65, 134);

      doc.setFont("Helvetica", "normal");
      doc.text("Fecha Impresión Reporte:", 22, 141);
      doc.setFont("Helvetica", "bold");
      doc.text(new Date().toLocaleDateString('es-CL') + " " + new Date().toLocaleTimeString('es-CL'), 65, 141);

      doc.setFont("Helvetica", "normal");
      doc.text("Estado del Cumplimiento:", 22, 148);
      doc.setFont("Helvetica", "bold");
      if (calculatedComplianceScore > 80) {
        doc.setFillColor(16, 185, 129); // emerald
        doc.text(`CONFORME SOBRESALIENTE (${calculatedComplianceScore}%)`, 65, 148);
      } else if (calculatedComplianceScore > 50) {
        doc.text(`CONFORME EN DESARROLLO (${calculatedComplianceScore}%)`, 65, 148);
      } else {
        doc.text(`MEDIDAS CRÍTICAS REQUERIDAS (${calculatedComplianceScore}%)`, 65, 148);
      }

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 110, 125);
      doc.text("ID Unico del Audit Checkpoint:", 22, 159);
      doc.setFont("Helvetica", "bold");
      doc.text("AC-726482B-CL-2026", 75, 159);

      // Warning Note at bottom list
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(180, 83, 9); // amber 700
      doc.setFontSize(9);
      doc.text("ASUNTO DE AUDITORÍA CONFIDENCIAL:", 15, 195);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(115, 115, 115);
      doc.text("Este informe consolida los flujos de datos, registros de servidores y las bitácoras", 15, 201);
      doc.text("de seguridad técnica para presentarse ante requerimientos expresos de la Agencia Chilena", 15, 206);
      doc.text("de Protección de Datos Personales o auditores independientes de CISO bajo estricto NDA.", 15, 211);

      // Signatures box
      doc.setDrawColor(200, 200, 200);
      doc.line(25, 255, 95, 255);
      doc.line(115, 255, 185, 255);

      doc.setFontSize(8);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("FIRMA DE AUDITOR EN COMPLIANCE", 32, 260);
      doc.text("REPRESENTANTE LEGAL / DPD CORP", 123, 260);
      doc.setFont("Helvetica", "normal");
      doc.text("Inspector de Seguridad / CISO", 36, 264);
      doc.text("Oficina de Control Regulador", 128, 264);

      // PAGE 2: Summary checklist and legal bases discussion
      doc.addPage();
      doc.setFillColor(11, 60, 93);
      doc.rect(0, 0, 210, 20, 'F');

      // Enhanced Logo Handling Page 2
      if (activeLogo) {
        try {
          const format = activeLogo.toLowerCase().includes('png') ? 'PNG' : 
                         activeLogo.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
          doc.addImage(activeLogo, format, 175, 2, 24, 12, undefined, 'FAST');
        } catch (logoErr) {
          console.warn("Could not add logo page 2 to compliance PDF:", logoErr);
        }
      }
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 204, 0);
      doc.text("INFORME DE CUMPLIMIENTO • LEY DE PROTECCIÓN DE DATOS PERSONALES CHILE", 15, 12);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate 900
      doc.text("1. Resumen Ejecutivo de Adecuación a la Ley N° 21.719", 15, 30);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text("La reforma que sistematiza de forma definitiva el derecho constitucional a la autodeterminación informativa", 15, 38);
      doc.text("en Chile (con entrada en vigencia en diciembre de 2026) exige a toda empresa que trate datos de personas", 15, 43);
      doc.text("naturales contar con bases lícitas claras, un registro pormenorizado de tratamientos y severas medidas", 15, 48);
      doc.text("de seguridad informática. ASSETFLOW ha adecuado preventivamente el motor de su sistema AssetFlow.", 15, 53);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Metodología Legal del Tratamiento:", 15, 65);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.text("• Consentimiento Reforzado (Art. 14): Solicitado en procesos de postulación de clientes/fiadores mediante check.", 15, 73);
      doc.text("• Adherencia Contractual (Art. 15): Justificación base para datos de arriendos y pagos a proveedores.", 15, 78);
      doc.text("• Interés Legítimo de Seguridad (Art. 15-B): Justifica logs transaccionales e IP para prevención delictual corporativa.", 15, 83);
      doc.text("• Deber de Minimización: Eliminación permanente de expedientes económicos precontractuales una vez rechazado el caso.", 15, 88);

      // Draw autoTable for the checklist auditing
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text("2. Estado de Controles de Auditoría de Privacidad", 15, 102);

      const checklistHeaders = [["ID CONTROL", "SISTEMA / REQUISITO", "ARTÍCULO", "ESTADO", "NOTAS DEL AUDITOR"]];
      const checklistRows = checklist.map((item, index) => [
        `CTRL-0${index+1}`,
        item.title,
        item.applicableArticle.split(' ')[1] || item.applicableArticle,
        item.status === 'COMPLETO' ? 'CONFORME' : item.status === 'EN_DESARROLLO' ? 'EN PROCESO' : 'REQUERIDO',
        item.auditorNotes || 'Sin comentarios adicionales.'
      ]);

      autoTable(doc, {
        startY: 108,
        head: checklistHeaders,
        body: checklistRows,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold', fontSize: 8 },
          1: { cellWidth: 42, fontStyle: 'bold', fontSize: 8 },
          2: { cellWidth: 18, fontSize: 8 },
          3: { cellWidth: 22, fontStyle: 'bold', fontSize: 8 },
          4: { cellWidth: 80, fontSize: 7.5 }
        },
        styles: { cellPadding: 2.5, valign: 'middle' },
        didDrawCell: (data) => {
          if (data.column.index === 3 && data.cell.section === 'body') {
            if (data.cell.text[0] === 'CONFORME') {
              doc.setTextColor(16, 185, 129); // emerald
            } else if (data.cell.text[0] === 'EN PROCESO') {
              doc.setTextColor(245, 158, 11); // amber
            } else {
              doc.setTextColor(220, 38, 38); // red
            }
          }
        }
      });

      // PAGE 3: The RAT (Registro de Actividades de Tratamiento)
      doc.addPage();
      doc.setFillColor(11, 60, 93);
      doc.rect(0, 0, 210, 20, 'F');
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 204, 0);
      doc.text("INFORME DE CUMPLIMIENTO • LEY DE PROTECCIÓN DE DATOS PERSONALES CHILE", 15, 12);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate 900
      doc.text("3. Registro de Actividades de Tratamiento (RAT) del Sistema", 15, 28);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("A continuación, se listan todos los flujos de almacenamiento, colecciones de bases de datos y repositorios", 15, 34);
      doc.text("que procesan datos nominativos en la plataforma AssetFlow Enterprise. Sujeto a auditorías regulares.", 15, 38);

      const ratHeaders = [["COLECCIÓN / PLATAFORMA", "TITULARES AFECTADOS", "CATEGORÍA DE DATOS", "BASE LEGAL", "PLAZO RETENCIÓN"]];
      const ratRows = ratList.map(item => [
        item.systemCollection,
        item.dataSubjects,
        item.dataCategories,
        item.legalBasis,
        item.retentionPeriod
      ]);

      autoTable(doc, {
        startY: 44,
        head: ratHeaders,
        body: ratRows,
        theme: 'grid',
        headStyles: { fillColor: [11, 60, 93], fontStyle: 'bold', fontSize: 8.5 },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'bold', fontSize: 8 },
          1: { cellWidth: 35, fontSize: 8 },
          2: { cellWidth: 55, fontSize: 7.2 },
          3: { cellWidth: 30, fontSize: 7.5, fontStyle: 'bold' },
          4: { cellWidth: 30, fontSize: 7.2 }
        },
        styles: { cellPadding: 3, valign: 'top' }
      });

      // Footer standard text on last page
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      if (finalY < 230) {
        doc.setFillColor(241, 245, 249);
        doc.rect(15, finalY, 180, 25, 'F');
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text("DECLARACIÓN DE CUMPLIMIENTO CONFORME:", 20, finalY + 6);
        doc.setFont("Helvetica", "normal");
        doc.text("La Gerencia de Compliance de ASSETFLOW certifica que este catálogo de bases de datos se encuentra", 20, finalY + 11);
        doc.text("permanentemente en revisión e incorporado tecnológicamente en el despliegue del sistema.", 20, finalY + 15);
        doc.text(`Aprobado con Score general de Privacidad de: ${calculatedComplianceScore}% de conformidad técnica.`, 20, finalY + 19);
      }

      // Save PDF to file
      doc.save(`Mapa_Datos_Personales_Ley_21696_ASSETFLOW_${new Date().getFullYear()}.pdf`);
      showNotification("Documento en Formato PDF descargado de manera conforme para auditoría civil.");
    } catch (err: any) {
      console.error("Error al generar PDF: ", err);
      showNotification("Error de compilación jsPDF: " + err.message, false);
    }
  };

  return (
    <div id="personal-data-map-module" className="bg-[#EBF0F5] h-full overflow-y-auto p-5 font-sans">
      
      {/* MODULE HEADER BAR */}
      <div className="bg-[#0B3C5D] rounded-[4px] border border-[#051C2C] p-6 text-white shadow-md mb-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 -mr-8 -mt-8 pointer-events-none">
          <ShieldCheck size={180} />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg border border-white/20 shadow-inner">
              <ShieldCheck size={32} className="text-[#FFCC00]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-amber-500 text-slate-900 text-[8.5px] font-black font-mono uppercase px-1.5 py-0.5 rounded-sm">
                  Ley N° 21.719
                </span>
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider font-mono">
                  Chile • Auditoría Preventiva
                </span>
                <button
                  onClick={() => {
                    setSystemDate(new Date());
                    const todayDate = new Date().toISOString().split('T')[0];
                    setFormDocDate(todayDate);
                    localStorage.removeItem('ASSETFLOW_OPERATIONAL_DATE');
                    showNotification("Fecha CLT sincronizada con la hora real actual de Chile.", true);
                  }}
                  title="Sincronizar con hora real"
                  className="text-[9px] bg-slate-900/40 text-amber-400 hover:text-white border border-amber-500/30 hover:border-amber-400 px-2 py-0.5 font-extrabold uppercase tracking-widest font-mono flex items-center gap-1.5 rounded-sm cursor-pointer transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                  FECHA ACTIVA CLT: {systemDate.toLocaleDateString('es-CL')} {systemDate.toLocaleTimeString('es-CL')} (SINCRONIZAR)
                </button>
              </div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mt-1">
                Mapa de Tratamiento y Cumplimiento de Datos
              </h1>
              <p className="text-xs text-indigo-150 leading-relaxed max-w-2xl font-medium">
                Consola integrada para auditar la recopilación, almacenamiento e intercambio de datos nominativos corporativos en conformidad con la nueva normativa de tratamiento de datos que entra en vigor en <strong className="text-[#FFCC00]">Diciembre de 2026</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={compileCompliancePDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-emerald-500"
            >
              <Download size={14} /> DESCARGAR MAPA EN PDF
            </button>
            <button
              onClick={handleResetDefaults}
              disabled={saving}
              className="bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-600"
              title="Restablecer valores"
            >
              <RotateCcw size={12} /> RESTAURAR
            </button>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS BOX */}
      {successMsg && (
        <div className="bg-emerald-100 border-l-4 border-emerald-600 text-emerald-900 p-3 rounded-lg flex items-center gap-2.5 text-xs mb-4 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={16} className="text-emerald-700" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-100 border-l-4 border-rose-600 text-rose-900 p-3 rounded-lg flex items-center gap-2.5 text-xs mb-4 animate-in fade-in slide-in-from-top-3">
          <AlertTriangle size={16} className="text-rose-700" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* COMPLIANCE SCOREBOARD & KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        
        {/* KPI 1: SCORE */}
        <div className="bg-white border border-[#9DB2C3] p-5 rounded-xs flex items-center justify-between shadow-xs">
          <div>
            <span className="block text-[8.5px] font-black text-slate-500 uppercase tracking-widest font-mono">
              SCORE DE PRIVACIDAD
            </span>
            <span className="text-3xl font-black text-slate-900 block mt-1 font-mono">
              {calculatedComplianceScore}%
            </span>
            <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 mt-2 rounded-xs uppercase ${
              calculatedComplianceScore >= 80 
                ? 'bg-emerald-100 text-emerald-850' 
                : calculatedComplianceScore >= 50 
                ? 'bg-amber-100 text-amber-850' 
                : 'bg-rose-100 text-rose-850'
            }`}>
              {calculatedComplianceScore >= 80 ? 'Nivel Sobresaliente' : calculatedComplianceScore >= 50 ? 'En Progreso Activo' : 'Medidas Emergentes'}
            </span>
          </div>
          <div className={`p-4 rounded-full ${
            calculatedComplianceScore >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-500'
          }`}>
            <ShieldCheck size={32} />
          </div>
        </div>

        {/* KPI 2: COUNTDOWN */}
        <div className="bg-white border border-[#9DB2C3] p-5 rounded-xs flex items-center justify-between shadow-xs">
          <div>
            <span className="block text-[8.5px] font-black text-slate-500 uppercase tracking-widest font-mono">
              PLAZO DE ADOPCIÓN TOTAL
            </span>
            <span className={`text-3xl font-black block mt-1 font-mono ${daysLeft < 150 ? 'text-rose-600' : 'text-slate-900'}`}>
              {daysLeft} Días
            </span>
            <span className="block text-[8px] font-bold text-slate-400 uppercase mt-2.5">
              FECHA LÍMITE: 01 DE DIC 2026
            </span>
          </div>
          <div className="p-4 bg-rose-50 text-rose-600 rounded-full">
            <Calendar size={32} />
          </div>
        </div>

        {/* KPI 3: REGISTRIES MAPPED */}
        <div className="bg-white border border-[#9DB2C3] p-5 rounded-xs flex items-center justify-between shadow-xs">
          <div>
            <span className="block text-[8.5px] font-black text-slate-500 uppercase tracking-widest font-mono">
              REGISTROS DE TRATAMIENTO (RAT)
            </span>
            <span className="text-3xl font-black text-slate-900 block mt-1 font-mono">
              {ratList.length} Bases
            </span>
            <span className="block text-[8px] text-emerald-650 font-black mt-2.5 uppercase">
              • Sincronizados con Firestore
            </span>
          </div>
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
            <Database size={32} />
          </div>
        </div>

        {/* KPI 4: AUDIT CONTROLS */}
        <div className="bg-white border border-[#9DB2C3] p-5 rounded-xs flex items-center justify-between shadow-xs">
          <div>
            <span className="block text-[8.5px] font-black text-slate-500 uppercase tracking-widest font-mono">
              CONTROLES DE COMPLIANCE
            </span>
            <span className="text-3xl font-black text-[#0B3C5D] block mt-1 font-mono">
              {checklist.filter(item => item.status === 'COMPLETO').length} / {checklist.length}
            </span>
            <span className="block text-[8px] font-bold text-slate-400 mt-2.5 uppercase">
              Art. 15 REGULATORIO CHILE
            </span>
          </div>
          <div className="p-4 bg-slate-100 text-slate-600 rounded-full">
            <FileText size={32} />
          </div>
        </div>

      </div>

      {/* MODULE SECTION NAVIGATION TABS */}
      <div className="flex border-b border-[#9DB2C3] mb-6">
        <button
          onClick={() => setActiveTab('RAT')}
          className={`flex items-center gap-2 px-5 py-3 font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer border-t border-x rounded-t-sm ${
            activeTab === 'RAT'
              ? 'bg-white text-[#0B3C5D] border-x-[#9DB2C3] border-t-4 border-t-[#0B3C5D]'
              : 'bg-[#E1EDF7] text-[#445566] border-transparent hover:bg-slate-100'
          }`}
        >
          <Database size={14} /> Inventario de Datos (RAT)
        </button>
        <button
          onClick={() => setActiveTab('CHECKLIST')}
          className={`flex items-center gap-2 px-5 py-3 font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer border-t border-x rounded-t-sm ${
            activeTab === 'CHECKLIST'
              ? 'bg-white text-[#0B3C5D] border-x-[#9DB2C3] border-t-4 border-t-[#0B3C5D]'
              : 'bg-[#E1EDF7] text-[#445566] border-transparent hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 size={14} /> Preparación de Auditoría
        </button>
        <button
          onClick={() => setActiveTab('SECURITY')}
          className={`flex items-center gap-2 px-5 py-3 font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer border-t border-x rounded-t-sm ${
            activeTab === 'SECURITY'
              ? 'bg-white text-[#0B3C5D] border-x-[#9DB2C3] border-t-4 border-t-[#0B3C5D]'
              : 'bg-[#E1EDF7] text-[#445566] border-transparent hover:bg-slate-100'
          }`}
        >
          <Lock size={14} /> Protocolo y Medidas de Seguridad
        </button>
        <button
          onClick={() => setActiveTab('NORM')}
          className={`flex items-center gap-2 px-5 py-3 font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer border-t border-x rounded-t-sm ${
            activeTab === 'NORM'
              ? 'bg-white text-[#0B3C5D] border-x-[#9DB2C3] border-t-4 border-t-[#0B3C5D]'
              : 'bg-[#E1EDF7] text-[#445566] border-transparent hover:bg-slate-100'
          }`}
        >
          <Info size={14} /> Síntesis Regulatoria (Ley 21.719)
        </button>
        <button
          onClick={() => setActiveTab('FORMS')}
          className={`flex items-center gap-2 px-5 py-3 font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer border-t border-x rounded-t-sm ${
            activeTab === 'FORMS'
              ? 'bg-white text-[#0B3C5D] border-x-[#9DB2C3] border-t-4 border-t-[#0B3C5D]'
              : 'bg-[#E1EDF7] text-[#445566] border-transparent hover:bg-slate-100'
          }`}
        >
          <ClipboardList size={14} /> Formularios y Consentimientos
        </button>
      </div>

      {/* CORE LOADING SPINNER */}
      {loading ? (
        <div className="bg-white border border-[#9DB2C3] p-16 text-center shadow-sm">
          <RefreshCw size={36} className="animate-spin text-indigo-600 mx-auto mb-4" />
          <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-700">
            Sincronizando Plataforma de Privacidad de Datos en Tiempo Real...
          </h2>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono">
            Estableciendo túnel de verificación conforme de autenticidad en Firebase
          </p>
        </div>
      ) : (
        <div>
          
          {/* TAB 1: RAT ACTIVITY TABLE */}
          {activeTab === 'RAT' && (
            <div className="bg-white border border-[#9DB2C3] rounded-xs shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="bg-slate-50 px-6 py-4 border-b border-[#9DB2C3] flex items-center justify-between">
                <div>
                  <h2 className="text-[12px] font-black text-[#0B3C5D] uppercase tracking-widest flex items-center gap-2">
                    <Database size={15} /> Registro de Actividades de Tratamiento (RAT Institucional)
                  </h2>
                  <p className="text-[9px] text-slate-500 uppercase mt-0.5">
                    De conformidad con el Artículo 15-A (Responsabilidad Proactiva) de la normativa chilena
                  </p>
                </div>
                <button
                  onClick={() => { resetRatForm(); setEditingRat(null); setIsRatModalOpen(true); }}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-[9.5px] uppercase tracking-wider px-3 py-1.5 rounded-xs flex items-center gap-1.5 cursor-pointer shadow-tiny"
                >
                  <Plus size={14} /> AGREGAR FLUJO DE DATOS ERP
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EAF4FC] text-[#0A3C60] uppercase text-[9px] tracking-wider border-b border-[#9DB2C3] font-mono">
                    <tr>
                      <th className="py-3.5 px-5">Colección / Registro</th>
                      <th className="py-3.5 px-4">Titulares</th>
                      <th className="py-3.5 px-4">Categoría de Datos de Carácter Personal</th>
                      <th className="py-3.5 px-4">Base de Licitud</th>
                      <th className="py-3.5 px-4">Plazo Retención</th>
                      <th className="py-3.5 px-4">Destinatarios</th>
                      <th className="py-3.5 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                    {ratList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-5 align-top">
                          <div className="font-extrabold text-[#0B3C5D] flex items-center gap-1">
                            {item.systemCollection}
                            {item.isCustom && (
                              <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[7.5px] font-black px-1 rounded-xs">
                                PERSONALIZADO
                              </span>
                            )}
                          </div>
                          <div className="text-[8px] text-slate-400 font-mono mt-0.5">ID: {item.id}</div>
                        </td>
                        <td className="py-4 px-4 align-top text-[10px] font-semibold text-slate-600">
                          {item.dataSubjects}
                        </td>
                        <td className="py-4 px-4 align-top text-[10.5px]">
                          <div className="max-w-md text-slate-800 leading-relaxed font-medium">
                            {item.dataCategories}
                          </div>
                          <div className="text-[8.5px] text-indigo-700 font-bold uppercase mt-1">
                            Medidas: {item.securityMeasures}
                          </div>
                        </td>
                        <td className="py-4 px-4 align-top">
                          <span className={`inline-block text-[8px] font-black px-2 py-1 rounded-sm uppercase tracking-wide ${
                            item.legalBasis === 'CONSENTIMIENTO'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : item.legalBasis === 'CONTRATO'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : item.legalBasis === 'MANDATO_LEGAL'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                          }`}>
                            {item.legalBasis.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 align-top text-[10px] text-slate-600 font-medium">
                          {item.retentionPeriod}
                        </td>
                        <td className="py-4 px-4 align-top text-[10px] text-slate-600 italic">
                          {item.transfers}
                        </td>
                        <td className="py-4 px-4 align-top text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditRat(item)}
                              className="p-1 hover:bg-slate-100 text-[#0B3C5D] hover:text-indigo-800 rounded transition-colors cursor-pointer"
                              title="Editar actividad de tratamiento"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteRat(item.id)}
                              className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition-colors cursor-pointer"
                              title="Remover actividad"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {ratList.length === 0 && (
                <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider border-t">
                  No hay flujos de datos personales registrados en el RAT en este momento.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUDIT CHECKLIST FOR LEY 21696 */}
          {activeTab === 'CHECKLIST' && (
            <div className="bg-white border border-[#9DB2C3] rounded-xs shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="bg-slate-50 px-6 py-4 border-b border-[#9DB2C3]">
                <h2 className="text-[12px] font-black text-[#0B3C5D] uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 size={15} /> Preparación de Matriz de Auditoría Civil
                </h2>
                <p className="text-[9px] text-slate-500 uppercase mt-0.5">
                  Verifique cada requerimiento de protección de datos personales antes de fiscalizaciones formales de la futura Agencia (2026)
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {checklist.map((item) => {
                  const isEditing = editingChecklistId === item.id;
                  return (
                    <div key={item.id} className="p-5 flex flex-col lg:flex-row lg:items-start justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded-xs uppercase tracking-widest font-mono ${
                            item.category === 'LEGAL' ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                            item.category === 'TECNICA' ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' :
                            item.category === 'ORGANIZACIONAL' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            'bg-pink-100 text-pink-850 border border-pink-200'
                          }`}>
                            {item.category}
                          </span>
                          <span className="text-[9.5px] font-bold text-slate-400 font-mono">
                            {item.applicableArticle}
                          </span>
                        </div>
                        <h3 className="text-[11.5px] font-black text-slate-900 uppercase tracking-tight">
                          {item.title}
                        </h3>
                        <p className="text-[10px] text-slate-505 leading-relaxed max-w-4xl font-medium">
                          {item.description}
                        </p>
                        
                        {/* Notes segment */}
                        <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xs font-mono mt-3">
                          <div className="text-[8px] font-black text-slate-400 uppercase mb-1">
                            Comentarios del Auditor Técnico:
                          </div>
                          {isEditing ? (
                            <textarea
                              rows={2}
                              value={editingNotesText}
                              onChange={(e) => setEditingNotesText(e.target.value)}
                              className="w-full bg-white border border-slate-300 text-[10px] p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-650 font-sans"
                              placeholder="Escriba aquí los descargos y estatus ante la fiscalización..."
                            />
                          ) : (
                            <p className="text-[10px] text-slate-700 italic">
                              {item.auditorNotes || "Sin observaciones ingresadas aún."}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status / Actions sidebar */}
                      <div className="flex flex-row lg:flex-col lg:items-end gap-3 justify-between items-center shrink-0 min-w-[200px]">
                        <div>
                          {isEditing ? (
                            <div className="relative">
                              <select
                                value={editingStatusVal}
                                onChange={(e) => setEditingStatusVal(e.target.value as AuditChecklistItem['status'])}
                                className="bg-white border border-slate-300 font-mono text-[9px] font-black uppercase px-2 py-1.5 focus:outline-none cursor-pointer text-slate-800"
                              >
                                <option value="COMPLETO">CONFORME (VERDE)</option>
                                <option value="EN_DESARROLLO">EN PROCESO (AMARILLO)</option>
                                <option value="MEDIDAS_REQUERIDAS">MEDIDAS EMERGENCY (ROJO)</option>
                              </select>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 text-[8.5px] font-black px-3 py-1 rounded-sm uppercase tracking-wider ${
                              item.status === 'COMPLETO'
                                ? 'bg-emerald-100 text-emerald-850 border border-emerald-300'
                                : item.status === 'EN_DESARROLLO'
                                ? 'bg-amber-100 text-amber-850 border border-amber-300'
                                : 'bg-rose-100 text-rose-850 border border-rose-350'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {item.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        <div>
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleUpdateChecklistItem(item.id, editingStatusVal, editingNotesText)}
                                disabled={saving}
                                className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-[8.5px] uppercase tracking-widest px-2.5 py-1.5 rounded-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Save size={11} /> GUARDAR
                              </button>
                              <button
                                onClick={() => setEditingChecklistId(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-505 border border-slate-300 font-extrabold text-[8.5px] uppercase tracking-widest px-2.5 py-1.5 rounded-xs cursor-pointer"
                              >
                                CANCELAR
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingChecklistId(item.id);
                                setEditingNotesText(item.auditorNotes || '');
                                setEditingStatusVal(item.status);
                              }}
                              className="text-[9px] font-black border border-slate-300 hover:border-[#0B3C5D] text-slate-650 hover:text-[#0B3C5D] px-2.5 py-1 rounded-xs transition-colors bg-white font-mono flex items-center gap-1 cursor-pointer hover:shadow-tiny"
                            >
                              <Edit2 size={10} /> EDITAR CONTROL
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TECHNICAL SECURITY MEASURES */}
          {activeTab === 'SECURITY' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
              
              {/* Left Column: Security Standards */}
              <div className="bg-white border border-[#9DB2C3] rounded-xs shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-[12px] font-black text-[#0B3C5D] uppercase tracking-widest flex items-center gap-2">
                    <Lock size={15} /> Infraestructura de Confidencialidad ERP (Chile PDP)
                  </h2>
                  <p className="text-[9px] text-slate-500 uppercase mt-0.5">
                    Estándares e hilos de seguridad integrados a nivel de datos del sistema y la nube
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border border-slate-200 p-4 rounded-xs flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-sm shrink-0">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-900 uppercase">Cifrado de Alta Complejidad</h3>
                      <p className="text-[9.5px] text-slate-500 mt-1 leading-relaxed font-semibold">
                        Los datos se cifran utilizando <strong className="text-slate-800">AES-256 (Advanced Encryption Standard)</strong> tanto en reposo en las bases de datos de Firebase, como en tránsito usando protocolos seguros <strong className="text-slate-800">TLS 1.3 (Transport Layer Security)</strong>, impidiendo la captura de tramas nominativas en redes.
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-200 p-4 rounded-xs flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-sm shrink-0">
                      <Clock size={18} />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-900 uppercase">Log de Auditoría Inmutable (Art. 15-B)</h3>
                      <p className="text-[9.5px] text-slate-500 mt-1 leading-relaxed font-semibold">
                        Toda visualización, creación o modificación de expedientes (sobre todo Evaluación de Postulantes que almacena rentas sensibles), registra automáticamente el ID del usuario, fecha, marca de red IP e identificador de registro. Estas tablas no permiten sentencias "DELETE".
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-200 p-4 rounded-xs flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-sm shrink-0">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-900 uppercase">Minimización Proactiva de Archivos</h3>
                      <p className="text-[9.5px] text-slate-500 mt-1 leading-relaxed font-semibold">
                        Implementación de rutinas de "limpieza civil" en Bóveda Documental. Los postulantes evaluados que hayan sido rechazados y no cuenten con contratos vigentes se inactivan automáticamente en intervalos legales de conformidad reguladora.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive security checklist display */}
              <div className="bg-white border border-[#9DB2C3] rounded-xs shadow-sm p-6 flex flex-col gap-5 justify-between">
                <div>
                  <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <Eye size={15} className="text-[#0B3C5D]" /> Monitoreo de Vulnerabilidades Activo
                  </h2>
                  <p className="text-[9.5px] text-slate-500 mb-4 font-semibold">
                    AssetFlow Enterprise audita permanentemente el estatus de accesos e intentos de intrusión mediante simulación de concurrencia y consolas inmutables directas.
                  </p>

                  <div className="bg-slate-50 p-4 rounded-xs border border-dashed border-slate-200 text-center space-y-3 my-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-505 inline-block animate-ping"></span>
                    <h3 className="text-[10px] font-mono leading-none tracking-wider text-slate-700 uppercase font-black">
                      MONITOREO DE CONEXIONES EN LÍNEA: ACTIVO
                    </h3>
                    <p className="text-[8.5px] text-slate-400 font-mono tracking-wide uppercase">
                      NO DEVIATIONS DETECTED • ENTIRE DATABASE IN COMPLIANT MODE
                    </p>
                  </div>
                </div>

                <div className="bg-[#EAF4FC] p-4 border border-indigo-200 font-sans space-y-2">
                  <h4 className="text-[9.5px] font-black text-[#0B3C5D] uppercase tracking-wide flex items-center gap-1.5">
                    <Info size={13} /> Sanciones e Incumplimiento de Ley 21.719
                  </h4>
                  <p className="text-[8.5px] text-[#0B3C60] leading-relaxed font-semibold">
                    Las multas en Chile bajo la nueva autoridad podrán ser de hasta 5,000 UTM para infracciones leves, 10,000 UTM para graves y 20,000 UTM (~1,300 millones de CLP) para gravísimas. Las empresas reincidentes enfrentan la clausura/suspensión temporal de operaciones de tratamiento de datos personales, afectando la plataforma.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: LAW SYSTEM REFORM DISCLOSURE */}
          {activeTab === 'NORM' && (
            <div className="bg-white border border-[#9DB2C3] rounded-xs shadow-sm p-6 space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-[12px] font-black text-[#0B3C5D] uppercase tracking-widest flex items-center gap-2">
                  <Info size={15} /> Síntesis Legal y Cambios Críticos (Ley N° 21.719)
                </h2>
                <p className="text-[9px] text-slate-500 uppercase mt-0.5">
                  Resumen de la reforma del tratamiento de datos personales en Chile - Fecha límite de adopción: Diciembre de 2026
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="space-y-2.5">
                  <h3 className="text-[11px] font-black text-slate-905 uppercase border-b pb-1.5">
                    1. Creación de la Agencia
                  </h3>
                  <p className="text-[10px] text-slate-505 leading-relaxed font-semibold">
                    Se establece la <strong className="text-slate-800">Agencia de Protección de Datos Personales</strong>, corporación autónoma de derecho público encargada de velar por el cumplimiento regulatorio, investigar denuncias civiles, ordenar auditorías obligatorias y cursar las respectivas multas pecuniarias.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-[11px] font-black text-slate-905 uppercase border-b pb-1.5">
                    2. Derechos ARCO-P Reforzados
                  </h3>
                  <p className="text-[10px] text-slate-505 leading-relaxed font-semibold">
                    Derecho de <strong className="text-slate-800">Acceso, Rectificación, Cancelación, Oposición y Portabilidad</strong>. Las empresas deben tramitar gratuitamente las solicitudes en plazos procesales sumarios. El rechazo injustificado conlleva sanciones directas o apelaciones inmediatas ante la Agencia.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-[11px] font-black text-slate-905 uppercase border-b pb-1.5">
                    3. Responsabilidad Proactiva
                  </h3>
                  <p className="text-[10px] text-slate-505 leading-relaxed font-semibold">
                    Desaparece la defensa pasiva. Los responsables deben certificar con un <strong className="text-slate-800">Modelo de Prevención de Infracciones</strong> que estructuraron medidas de ciberseguridad técnicas idóneas a priori (Cifrado granular, RAT exhaustivo, DPD formalmente designado).
                  </p>
                </div>

              </div>

              <div className="bg-[#FFFCE8] border border-amber-300 p-4 rounded-xs text-[10px] text-amber-900 font-sans font-semibold">
                🔔 <strong className="text-amber-950 uppercase">Plazos de Transición Obligatoria en Chile:</strong> La ley fue aprobada y publicada formalmente. Cuenta con un período vacacional legal de 24 meses. Su puesta en marcha absoluta y facultades de coerción de la Agencia se activan indefectiblemente en <strong>Diciembre de 2026</strong>. Toda plataforma e inmobiliaria operando en Chile debe poseer el RAT actualizado antes de dicha fecha.
              </div>
            </div>
          )}

          {/* TAB 5: COMPLIANCE FORMS GENERATOR & AUDIT DATABASE */}
          {activeTab === 'FORMS' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* TOP STRIPE ALERT */}
              <div className="bg-white border border-[#9DB2C3] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[12px] font-black text-[#0B3C5D] uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList size={16} className="text-emerald-600" />
                    Canal de Formularios Conformados de Compliance (Chile Ley 21.719)
                  </h3>
                  <p className="text-[9.5px] text-slate-500 uppercase mt-0.5 font-semibold">
                    Diseñe, personalice y compile instrumentos de validez legal para su descarga en PDF, registrando el hash en la auditoría inmutable
                  </p>
                </div>
                <div className="bg-slate-100 px-3 py-1.5 border border-slate-300 text-slate-700 text-[9px] uppercase font-mono rounded-xs shrink-0 font-bold">
                  Sello de Integridad Activo • 2026 CLP Compliant
                </div>
              </div>

              {/* TWO COLUMN GRID FOR INTERACTIVE BUILDER */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT PANEL: SELECTOR + DYNAMIC FORM (col-span-5) */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* CARD: SELECTOR */}
                  <div className="bg-white border border-[#9DB2C3] p-4 shadow-xs">
                    <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider mb-3 border-b pb-1.5">
                      1. Seleccionar Plantilla Regulatoria
                    </h4>
                    
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFormTemplate('consent_applicant')}
                        className={`w-full text-left p-2.5 border transition-all text-xs flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 ${
                          selectedFormTemplate === 'consent_applicant'
                            ? 'border-l-4 border-l-[#0B3C5D] border-slate-400 bg-[#F4F7F9]'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <UserCheck size={16} className="text-emerald-600 mt-0.5" />
                        <div>
                          <div className="font-extrabold text-[10.5px] text-[#0B3C5D] uppercase tracking-wide">
                            Consentimiento del Postulante
                          </div>
                          <div className="text-[9px] text-slate-550 leading-tight mt-0.5">
                            Autorización del uso de liquidaciones e ingresos (Art. 14 Chile)
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedFormTemplate('arco_request')}
                        className={`w-full text-left p-2.5 border transition-all text-xs flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 ${
                          selectedFormTemplate === 'arco_request'
                            ? 'border-l-4 border-l-[#0B3C5D] border-slate-400 bg-[#F4F7F9]'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <ShieldCheck size={16} className="text-amber-600 mt-0.5" />
                        <div>
                          <div className="font-extrabold text-[10.5px] text-[#0B3C5D] uppercase tracking-wide">
                            Ejercicio de Derechos ARCO-P
                          </div>
                          <div className="text-[9px] text-slate-550 leading-tight mt-0.5">
                            Fórmula sumaria para Acceso, Cancelación u Oposición (Art. 19-23)
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedFormTemplate('dpa_processor')}
                        className={`w-full text-left p-2.5 border transition-all text-xs flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 ${
                          selectedFormTemplate === 'dpa_processor'
                            ? 'border-l-4 border-l-[#0B3C5D] border-slate-400 bg-[#F4F7F9]'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <Lock size={16} className="text-blue-600 mt-0.5" />
                        <div>
                          <div className="font-extrabold text-[10.5px] text-[#0B3C5D] uppercase tracking-wide">
                            Acuerdo con Tercero / Encargado (DPA)
                          </div>
                          <div className="text-[9px] text-slate-550 leading-tight mt-0.5">
                            Contrato de traspaso y confidencialidad con proveedores (Art. 16)
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedFormTemplate('breach_incident')}
                        className={`w-full text-left p-2.5 border transition-all text-xs flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 ${
                          selectedFormTemplate === 'breach_incident'
                            ? 'border-l-4 border-l-red-600 border-slate-400 bg-red-50/20'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <AlertTriangle size={16} className="text-red-600 mt-0.5" />
                        <div>
                          <div className="font-extrabold text-[10.5px] text-[#0B3C5D] uppercase tracking-wide">
                            Reporte Interno de Brechas
                          </div>
                          <div className="text-[9px] text-slate-550 leading-tight mt-0.5">
                            Notificación de fallos e incidente técnico del sistema (Art. 15-C)
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* CARD: FORM FIELDS */}
                  <form onSubmit={handleGenerateDocumentLog} className="bg-white border border-[#9DB2C3] p-4 shadow-xs space-y-4 text-xs">
                    <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider border-b pb-1.5 flex justify-between items-center">
                      <span>2. Personalizar Variables del Instrumento</span>
                      <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 font-mono uppercase font-black">
                        {selectedFormTemplate.toUpperCase()}
                      </span>
                    </h4>

                    {/* Shared Fields */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 border border-slate-200">
                      <div className="col-span-2">
                        <label className="block text-[8.5px] font-black text-slate-550 uppercase tracking-widest mb-1">
                          Responsable / Compañía Titular del Sistema
                        </label>
                        <input
                          type="text"
                          required
                          value={formCompany}
                          onChange={(e) => setFormCompany(e.target.value)}
                          className="w-full bg-white border border-slate-300 p-1.5 text-slate-800 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[8.5px] font-black text-slate-550 uppercase tracking-widest mb-1">
                          Representante Legal (Sistema)
                        </label>
                        <input
                          type="text"
                          required
                          value={formRepName}
                          onChange={(e) => setFormRepName(e.target.value)}
                          className="w-full bg-white border border-slate-300 p-1.5 text-slate-800 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[8.5px] font-black text-slate-550 uppercase tracking-widest mb-1">
                          RUT del Representante
                        </label>
                        <input
                          type="text"
                          required
                          value={formRepRut}
                          onChange={(e) => setFormRepRut(e.target.value)}
                          className="w-full bg-white border border-slate-300 p-1.5 text-slate-800 text-[11px]"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[8.5px] font-black text-slate-550 uppercase tracking-widest mb-1">
                          Fecha de Instrumento Conforme
                        </label>
                        <input
                          type="date"
                          required
                          value={formDocDate}
                          onChange={(e) => setFormDocDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 p-1.5 text-slate-800 text-[11px]"
                        />
                      </div>
                    </div>

                    {/* Template Specific Form Content */}
                    {selectedFormTemplate === 'consent_applicant' && (
                      <div className="space-y-3 pt-1">
                        <p className="text-[9px] bg-emerald-50 text-emerald-800 p-2 border border-emerald-200 rounded-xs font-semibold leading-relaxed">
                          Este formulario recaba la declaración e instructivos de consentimiento del requirente para evaluar liquidaciones de sueldo previas al arriendo.
                        </p>
                        <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            Nombre del Postulante/Fiador *
                          </label>
                          <input
                            type="text"
                            required
                            value={consentSubjectName}
                            onChange={(e) => setConsentSubjectName(e.target.value)}
                            placeholder="Ej: Carlos Muñoz Espinoza"
                            className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                              RUN del Postulante *
                            </label>
                            <input
                              type="text"
                              required
                              value={consentSubjectRut}
                              onChange={(e) => setConsentSubjectRut(e.target.value)}
                              placeholder="Ej: 15.482.902-3"
                              className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                              Correo electrónico *
                            </label>
                            <input
                              type="email"
                              required
                              value={consentSubjectEmail}
                              onChange={(e) => setConsentSubjectEmail(e.target.value)}
                              placeholder="carlos@example.cl"
                              className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t">
                          <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-widest mb-1">
                            Finalidades Autorizadas por el Titular (Art. 14):
                          </label>
                          
                          <label className="flex items-start gap-2 text-[10px] text-slate-700 font-semibold cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={consentPurposeSolvency}
                              onChange={(e) => setConsentPurposeSolvency(e.target.checked)}
                              className="mt-0.5 scale-95"
                            />
                            <span>Análisis del score de riesgo financiero corporativo de ASSETFLOW</span>
                          </label>

                          <label className="flex items-start gap-2 text-[10px] text-slate-700 font-semibold cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={consentPurposePrecontract}
                              onChange={(e) => setConsentPurposePrecontract(e.target.checked)}
                              className="mt-0.5 scale-95"
                            />
                            <span>Estudios e instrumentación precontractual de arrendamiento</span>
                          </label>

                          <label className="flex items-start gap-2 text-[10px] text-slate-700 font-semibold cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={consentPurposeVerifyRents}
                              onChange={(e) => setConsentPurposeVerifyRents(e.target.checked)}
                              className="mt-0.5 scale-95"
                            />
                            <span>Verificación de la veracidad de liquidaciones con empleadores</span>
                          </label>

                          <label className="flex items-start gap-2 text-[10px] text-slate-700 font-semibold cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={consentPurposeSharePartners}
                              onChange={(e) => setConsentPurposeSharePartners(e.target.checked)}
                              className="mt-0.5 scale-95"
                            />
                            <span>Compartir de forma restringida con co-deudores y aseguradoras</span>
                          </label>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            Plazo Estimado de Retención (Minimización)
                          </label>
                          <select
                            value={consentRetentionYrs}
                            onChange={(e) => setConsentRetentionYrs(e.target.value)}
                            className="w-full bg-white border border-slate-300 p-2 text-slate-800"
                          >
                            <option value="6 meses tras la postulación">6 meses para postulante descartado</option>
                            <option value="1 año tras la postulación">1 año bajo resguardo de auditoría</option>
                            <option value="2 años conformes a normativa tributaria">2 años corporativo estándar</option>
                            <option value="Indefinido mientras se mantenga el corretaje activo">Vigencia del arriendo más 1 año</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {selectedFormTemplate === 'arco_request' && (
                      <div className="space-y-3 pt-1">
                        <p className="text-[9px] bg-amber-50 text-amber-800 p-2 border border-amber-200 rounded-xs font-semibold leading-relaxed">
                          La empresa debe proveer esta solicitud formal a arrendatarios chilenos que soliciten suprimir liquidadoras, corregir sus RUTs o revocar consentimientos.
                        </p>
                        <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            Nombre del Titular Reclamante *
                          </label>
                          <input
                            type="text"
                            required
                            value={arcoSubjectName}
                            onChange={(e) => setArcoSubjectName(e.target.value)}
                            placeholder="Ej: María Paz Troncoso"
                            className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                              RUT/Cédula *
                            </label>
                            <input
                              type="text"
                              required
                              value={arcoSubjectRut}
                              onChange={(e) => setArcoSubjectRut(e.target.value)}
                              placeholder="Ej: 18.223.144-K"
                              className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                              Correo electrónico *
                            </label>
                            <input
                              type="email"
                              required
                              value={arcoSubjectEmail}
                              onChange={(e) => setArcoSubjectEmail(e.target.value)}
                              placeholder="m.paz@example.cl"
                              className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            Derecho a Ejercitar (Artículos 19-23)
                          </label>
                          <select
                            value={arcoRightType}
                            onChange={(e) => setArcoRightType(e.target.value as any)}
                            className="w-full bg-white border border-slate-300 p-2 text-slate-800 font-bold"
                          >
                            <option value="ACCESO">ACCESO (Conocer qué datos se tratan en el sistema)</option>
                            <option value="RECTIFICACION">RECTIFICACIÓN (Modificar RUT erróneos o montos incorrectos)</option>
                            <option value="CANCELACION">CANCELACIÓN / ELIMINACIÓN (Suprimir archivos de renta obsoletos)</option>
                            <option value="OPOSICION">OPOSICIÓN (Suspender envío o perfilamiento financiero)</option>
                            <option value="PORTABILIDAD">PORTABILIDAD (Traspaso legible a otra entidad inmobiliaria)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            Detalles Específicos del Requerimiento *
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={arcoDetailsText}
                            onChange={(e) => setArcoDetailsText(e.target.value)}
                            placeholder="Ej: Solicito la cancelación inmediata de mis liquidaciones de sueldo de los periodos 2024 cargadas para postulación inmobiliaria..."
                            className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800 resize-none font-sans"
                          />
                        </div>
                      </div>
                    )}

                    {selectedFormTemplate === 'dpa_processor' && (
                      <div className="space-y-3 pt-1">
                        <p className="text-[9px] bg-blue-50 text-blue-800 p-2 border border-blue-200 rounded-xs font-semibold leading-relaxed">
                          La ley (Art. 16) exige firmar contratos con externos que almacenen datos del sistema (ej: Hosting, asesoría crediticia, contadores) certificando medidas TLS.
                        </p>
                        <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            Razón Social Proveedor (Encargado) *
                          </label>
                          <input
                            type="text"
                            required
                            value={suppCompanyName}
                            onChange={(e) => setSuppCompanyName(e.target.value)}
                            placeholder="Ej: Hosting Inmobiliaria Santiago S.A."
                            className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                              RUT Comercial *
                            </label>
                            <input
                              type="text"
                              required
                              value={suppCompanyRut}
                              onChange={(e) => setSuppCompanyRut(e.target.value)}
                              placeholder="Ej: 76.432.110-4"
                              className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                              Representante Legal *
                            </label>
                            <input
                              type="text"
                              required
                              value={suppRepName}
                              onChange={(e) => setSuppRepName(e.target.value)}
                              placeholder="Ej: Cristián Arriagada V."
                              className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            Objeto de los Servicios Contratados *
                          </label>
                          <input
                            type="text"
                            required
                            value={suppServicesScope}
                            onChange={(e) => setSuppServicesScope(e.target.value)}
                            className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            Clasificación de Datos Transferidos *
                          </label>
                          <input
                            type="text"
                            required
                            value={suppDataTypes}
                            onChange={(e) => setSuppDataTypes(e.target.value)}
                            className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            Domicilio Fijado para Competencias Chilenas
                          </label>
                          <input
                            type="text"
                            required
                            value={suppCourtsPlace}
                            onChange={(e) => setSuppCourtsPlace(e.target.value)}
                            className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                          />
                        </div>
                      </div>
                    )}

                    {selectedFormTemplate === 'breach_incident' && (
                      <div className="space-y-3 pt-1">
                        <p className="text-[9px] bg-red-50 text-red-800 p-2 border border-red-200 rounded-xs font-semibold leading-relaxed">
                          La ley (Art. 15-C) obliga a registrar incidentes de ciberseguridad para documentar mitigaciones preventivas ante una futura inspección de la Agencia.
                        </p>
                        <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            Vulnerabilidad / Sistemas del Sistema Afectados *
                          </label>
                          <input
                            type="text"
                            required
                            value={breachSystemsAffected}
                            onChange={(e) => setBreachSystemsAffected(e.target.value)}
                            className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                              Volumen Registros Expuestos *
                            </label>
                            <input
                              type="text"
                              required
                              value={breachScopeAccounts}
                              onChange={(e) => setBreachScopeAccounts(e.target.value)}
                              placeholder="Ej: ~40 cuentas de postulantes"
                              className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                              Nivel de Severidad Interna
                            </label>
                            <select
                              value={breachIncidentSeverity}
                              onChange={(e) => setBreachIncidentSeverity(e.target.value as any)}
                              className="w-full bg-white border border-slate-300 p-2 text-slate-800 font-bold"
                            >
                              <option value="ALTA">CRÍTICA / ALTA (Compromiso de Datos Sensibles)</option>
                              <option value="MEDIA">MEDIA (Incidente restringido sin exfiltración externa)</option>
                              <option value="BAJA">LEVE / BAJA (Escaneo de puertos o vulneración superada)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            Detalle del Impacto / Datos Personales *
                          </label>
                          <input
                            type="text"
                            required
                            value={breachImpactType}
                            onChange={(e) => setBreachImpactType(e.target.value)}
                            className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            Contramedidas / Mitigaciones Aplicadas de Inmediato *
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={breachMitigationsTaken}
                            onChange={(e) => setBreachMitigationsTaken(e.target.value)}
                            className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800 resize-none font-sans"
                          />
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-3 border-t">
                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-[#0B3C5D] hover:bg-[#072439] text-white font-extrabold text-[10px] uppercase tracking-widest py-3 hover:shadow-tiny transition-all rounded-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Download size={14} /> 
                        {saving ? 'Procesando Instrumento...' : 'Compilar Documentación & Descargar PDF'}
                      </button>
                    </div>

                  </form>
                </div>

                {/* RIGHT PANEL: LIVE HISTORIC LOG + LIVE PREVIEW PANEL (col-span-7) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* COMPONENT: LIVE LEGAL PREVIEW SHEET */}
                  <div className="bg-slate-850 bg-[#1E293B] text-[#F8FAFC] border border-slate-700 shadow-md p-5 rounded-xs font-serif relative overflow-hidden">
                    <div className="absolute right-0 top-0 bg-amber-600 text-[8px] text-white font-black uppercase tracking-wider px-3 py-1 font-sans">
                      Vista Preliminar de Auditoría
                    </div>
                    
                    <div className="border-b border-slate-700 pb-3 mb-4 font-sans text-left">
                      <h5 className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">
                        Previsualización Civil de Texto (Ley 21.719)
                      </h5>
                      <p className="text-[8.5px] text-slate-400 uppercase font-mono tracking-wider">
                        Estructura dinámica conformada según inserción de variables
                      </p>
                    </div>

                    <div className="space-y-3.5 text-[9.5px] leading-relaxed text-slate-200">
                      
                      {selectedFormTemplate === 'consent_applicant' ? (
                        <>
                          <p className="font-bold underline text-center text-[10.5px] uppercase tracking-wide text-white">
                            AUTORIZACIÓN EXPLÍCITA DE TRATAMIENTO DE DATOS PERSONALES
                          </p>
                          <p>
                            Yo, <strong className="text-amber-400 bg-amber-500/10 px-1 font-sans">{consentSubjectName || '[Nombre del Interesado]'}</strong>, RUN <strong className="text-amber-400 bg-amber-500/10 px-1 font-sans">{consentSubjectRut || '[RUT-Postulante]'}</strong>, de conformidad con lo establecido en el <strong>Artículo 14 de la Ley N° 21.719 de Chile</strong>, autorizo de forma irrevocable a la sociedad <strong className="text-white">{formCompany}</strong> para tratar mis datos personales suministrados para:
                          </p>
                          <ul className="list-disc pl-5 space-y-1 text-[9px] text-slate-300">
                            <li>{consentPurposeSolvency ? '✓ Evaluación técnica de solvencia crediticia y riesgo comercial precontractual.' : '✗ Score crediticio automatizado.'}</li>
                            <li>{consentPurposePrecontract ? '✓ Confección y firma remota del contrato de arriendo de activos.' : '✗ Redacción precontractual.'}</li>
                            <li>{consentPurposeVerifyRents ? '✓ Corroborar autenticidad de liquidaciones previsionales declaradas.' : '✗ Cotejo laboral directo.'}</li>
                            <li>{consentPurposeSharePartners ? '✓ Comunicar de forma encriptada mis liquidaciones con el aval codeudor.' : '✗ Intercambio de documentos.'}</li>
                          </ul>
                          <p>
                            Se fija un tiempo de retención máximo de <strong className="text-amber-400">{consentRetentionYrs}</strong> tras lo cual se ordenará la eliminación de los archivos transaccionales para cumplir con el Deber de Seguridad.
                          </p>
                        </>
                      ) : selectedFormTemplate === 'arco_request' ? (
                        <>
                          <p className="font-bold underline text-center text-[10.5px] uppercase tracking-wide text-white">
                            EJERCICIO DE DERECHOS ARCO-P (ART. 19 LEY N° 21.719)
                          </p>
                          <p>
                            Don(ña) <strong className="text-amber-400 bg-amber-500/10 px-1 font-sans">{arcoSubjectName || '[Nombre del Reclamante]'}</strong>, Cédula de Identidad RUN <strong className="text-amber-400 bg-amber-500/10 px-1 font-sans">{arcoSubjectRut || '[RUT-Claimant]'}</strong>, con casilla {arcoSubjectEmail || '[Email]'} deduce formalmente solicitud de:
                          </p>
                          <p className="border-l-2 border-amber-500 pl-3 italic text-slate-300 py-1 font-mono text-[9px]">
                            DERECHO EJERCITADO: EXIGIBILIDAD DE {arcoRightType}
                          </p>
                          <p>
                            Detalle de corrección solicitada en base de datos: <span className="text-amber-100 italic">"{arcoDetailsText || 'No se han ingresado los términos específicos...'}"</span>.
                          </p>
                          <p>
                            El Encargado de Privacidad <strong className="text-white">{formRepName}</strong> compromete emitir pronunciamiento en el término de 15 días hábiles, so pena de reclamo administrativo del titular ante la Agencia Fiscal.
                          </p>
                        </>
                      ) : selectedFormTemplate === 'dpa_processor' ? (
                        <>
                          <p className="font-bold underline text-center text-[10.5px] uppercase tracking-wide text-white">
                            CONTRATO DE ENCARGO DE PROCESAMIENTO DE DATOS PERSONALES (DPA)
                          </p>
                          <p>
                            Entre <strong className="text-white">{formCompany}</strong> ("Responsable") representado por don {formRepName}, y la firma externa <strong className="text-amber-400">{suppCompanyName || '[Nombre del Proveedor / Encargado]'}</strong>, RUT <strong className="font-sans">{suppCompanyRut || '[RUT-Empresa]'}</strong> representada por {suppRepName || '[Representante del Proveedor]'}, se acuerda Anexo conforme al <strong>Artículo 16 Ley N° 21.719</strong>.
                          </p>
                          <p>
                            El Encargado guardará absoluto secreto sobre los datos de categoría <strong className="text-slate-300">"{suppDataTypes || '[Rentas, liquidaciones, historial financiero]'}"</strong> traspasados estrictamente para el encargo de: <em className="text-amber-100">"{suppServicesScope}"</em>. Ambas firmas fijan competencia judicial de ciberseguridad en: <strong className="text-white">{suppCourtsPlace}</strong>.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold underline text-center text-[10.5px] uppercase tracking-wide text-red-400">
                            REGISTRO INTERNO DE VULNERACIÓN DE CIBERSEGURIDAD (INCIDENTE ART. 15-C)
                          </p>
                          <p>
                            Bajo las directrices de responsabilidad proactiva de ASSETFLOW, se reporta incidente que impactó el sistema <strong className="text-amber-400 bg-amber-500/10 px-1">{breachSystemsAffected || '[Nombre del Servidor/API]'}</strong> con un rango de severidad clasificado como <strong className="text-red-400">{breachIncidentSeverity}</strong>.
                          </p>
                          <p>
                            Naturaleza del compromiso de datos de clientes: <span className="text-slate-300">"{breachImpactType || '[Describe liquidaciones u hojas expuestas]'}"</span>.
                          </p>
                          <p>
                            Contramedidas de contingencia aplicadas por el equipo de redes: <em className="text-slate-300">"{breachMitigationsTaken}"</em>. Se mantendrá el secreto profesional de esta bitácora civil para la defensa del sistema de inversiones.
                          </p>
                        </>
                      )}

                    </div>

                    <div className="mt-5 border-t border-slate-700 pt-3 flex justify-between items-center text-[8.5px] text-slate-400 font-sans uppercase">
                      <span>Referencia: Ley N° 21.719 de Privacidad</span>
                      <span>ASSETFLOW Compliance v3.2</span>
                    </div>
                  </div>

                  {/* COMPONENT: REGISTRY LOG DATABASE TABLE (THE CORE AUDIT TRAIL) */}
                  <div className="bg-white border border-[#9DB2C3] rounded-xs shadow-sm overflow-hidden">
                    <div className="bg-[#0B3C5D] p-3 text-white flex justify-between items-center">
                      <h4 className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                        <Database size={15} className="text-[#FFCC00]" />
                        Bitácora Civil Inmutable de Documentos de Cumplimiento Emitidos
                      </h4>
                      <span className="text-[8px] bg-emerald-600 text-white font-mono px-2 py-0.5 rounded-sm font-bold uppercase">
                        {docList.length} Registros Activos
                      </span>
                    </div>

                    <div className="p-1 px-3 bg-[#E1EDF7] border-b border-[#9DB2C3] flex items-center justify-between text-[8px] font-bold text-[#3B546D] uppercase">
                      <span>REGISTRO DE CONSENTIMIENTOS, CONTRATOS Y BRECHAS ALMACENADOS</span>
                      <span>FILTRADO: TODOS LOS INSTRUMENTOS</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[8.5px] uppercase font-bold tracking-wider">
                            <th className="p-3">Tipo de Documento</th>
                            <th className="p-3">Sujeto / RUN</th>
                            <th className="p-3">Fecha Emisión CLT</th>
                            <th className="p-3">Token Integridad Integral</th>
                            <th className="p-3 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {docList.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/70 transition-colors text-slate-700">
                              <td className="p-3">
                                <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-sm ${
                                  log.documentType === 'CONSENTIMIENTO'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : log.documentType === 'ARCO'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : log.documentType === 'ENCARGO_PROCESAMIENTO'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-red-100 text-red-800 border border-red-200'
                                }`}>
                                  {log.documentType === 'ENCARGO_PROCESAMIENTO' ? 'ENCARGO DPA' : log.documentType}
                                </span>
                                <div className="text-[9px] text-slate-400 font-semibold mt-1 max-w-[170px] truncate leading-tight">
                                  {log.metadata}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="font-extrabold text-slate-800">{log.subjectName}</div>
                                <div className="text-[9.5px] font-sans text-slate-500 mt-0.5">{log.subjectIdentifier}</div>
                              </td>
                              <td className="p-3 font-mono text-[9.5px] text-slate-550 leading-tight">
                                {log.date}
                              </td>
                              <td className="p-3 font-mono text-[8.5px] text-indigo-750 font-bold bg-indigo-50/40">
                                {log.hashToken}
                                <div className="text-[7.5px] text-emerald-600 font-bold uppercase font-sans mt-0.5 flex items-center gap-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Validez Conforme
                                </div>
                              </td>
                              <td className="p-3 text-center select-none">
                                <div className="flex items-center justify-center gap-1.5 shadow-sm rounded-xs border p-1 bg-slate-50">
                                  <button
                                    onClick={() => downloadExistingPDF(log)}
                                    title="Descargar copia del instrumento en PDF"
                                    className="p-1 px-2 border border-emerald-300 bg-emerald-50 text-emerald-700 rounded-xs hover:bg-emerald-100 transition-all cursor-pointer text-[9px] uppercase font-black tracking-wider flex items-center gap-1 hover:shadow-tiny"
                                  >
                                    <Download size={10} /> DESCARGAR
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocumentLog(log.id)}
                                    title="Dar de baja / Retirar copia"
                                    className="p-1 px-2 border border-red-200 bg-red-50 text-red-650 rounded-xs hover:bg-red-100 transition-all cursor-pointer text-[9px] uppercase font-black tracking-wider hover:shadow-tiny"
                                  >
                                    ELIMINAR
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {docList.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 uppercase font-mono text-[9px]">
                                No se registran documentos de conformidad emitidos bajo el score actual...
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* FOOTER AUDIT CLAUSE */}
      <div className="mt-8 text-center text-slate-400 text-[8.5px] font-mono uppercase tracking-widest leading-loose">
        INFORMACIÓN CONFIDENCIAL • CERTIFICADO DE MAPEO DE DATOS REGULATORIO ASSETFLOW REGULATORY • PATTERN AS-21696-CL
      </div>

      {/* MODAL: ADD/EDIT RAT ACTIVITY */}
      {isRatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-xs max-w-2xl w-full border-4 border-[#0B3C5D] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 font-sans">
            <div className="bg-[#0B3C5D] p-4 text-white flex justify-between items-center bg-radial">
              <h3 className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Database size={15} className="text-[#FFCC00]" />
                {editingRat ? 'Editar Registro de Tratamiento (RAT)' : 'Clasificar Nueva Actividad de Tratamiento'}
              </h3>
              <button
                onClick={() => setIsRatModalOpen(false)}
                className="text-white hover:text-slate-200 text-sm font-bold uppercase tracking-widest select-none cursor-pointer"
              >
                CERRAR [X]
              </button>
            </div>

            <form onSubmit={handleSaveRatActivity} className="p-6 overflow-y-auto space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                    Colección / Base de Datos *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCollection}
                    onChange={(e) => setFormCollection(e.target.value)}
                    placeholder="Ej: Registro Arrendatarios, Postulaciones..."
                    className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-650"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                    Titulares de los Datos *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSubjects}
                    onChange={(e) => setFormSubjects(e.target.value)}
                    placeholder="Ej: Arrendatarios, Garantes, Postulantes..."
                    className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-650"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                  Detalle de Categorías de Datos Corporativos *
                </label>
                <textarea
                  rows={2}
                  required
                  value={formCategories}
                  onChange={(e) => setFormCategories(e.target.value)}
                  placeholder="Ej: Identificación, RUT, Domicilio, Montos de renta, Datos Bancarios, Correos..."
                  className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-650 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                  Finalidades Específicas del Tratamiento *
                </label>
                <textarea
                  rows={2}
                  required
                  value={formPurposes}
                  onChange={(e) => setFormPurposes(e.target.value)}
                  placeholder="Ej: Formalizar contrato civil de arrendamiento, análisis de solvencia..."
                  className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-650 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                    Base Lícita de Tratamiento (Chile)
                  </label>
                  <select
                    value={formLegalBasis}
                    onChange={(e) => setFormLegalBasis(e.target.value as DataTreatmentActivity['legalBasis'])}
                    className="w-full bg-white border border-slate-300 p-2 text-slate-850 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="CONSENTIMIENTO">CONSENTIMIENTO EXPLÍCITO</option>
                    <option value="CONTRATO">EJECUCIÓN CONTRACTUAL</option>
                    <option value="MANDATO_LEGAL">OBLIGACIÓN LEGAL / MANDATO</option>
                    <option value="INTERES_LEGITIMO">INTERÉS LEGÍTIMO</option>
                    <option value="REQUERIMIENTO_PRECONTRATUAL">ETAPA PRECONTRACTUAL</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                    Plazo de Retención Legal
                  </label>
                  <input
                    type="text"
                    value={formRetention}
                    onChange={(e) => setFormRetention(e.target.value)}
                    placeholder="Ej: 5 años tras la rescisión"
                    className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-650"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                    Destinatarios / Transferencias
                  </label>
                  <input
                    type="text"
                    value={formTransfers}
                    onChange={(e) => setFormTransfers(e.target.value)}
                    placeholder="Ej: Servicio de Impuestos Internos (SII)"
                    className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-650"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                    Medidas Técnicas Aplicadas
                  </label>
                  <input
                    type="text"
                    value={formSecurity}
                    onChange={(e) => setFormSecurity(e.target.value)}
                    placeholder="Ej: Cifrado TLS 1.3, Perfiles de acceso, Logs"
                    className="w-full bg-[#F4F7F9] border border-slate-300 p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-650"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRatModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-655 font-extrabold text-[9.5px] uppercase tracking-wider px-4 py-2 hover:shadow-tiny transition-all rounded-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#0B3C5D] hover:bg-[#072439] text-white font-extrabold text-[9.5px] uppercase tracking-wider px-5 py-2 hover:shadow-tiny transition-all rounded-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} /> {editingRat ? 'GUARDAR EDICIÓN' : 'ARCHIVAR REGISTRO RAT'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
