
import React, { useState, useMemo } from 'react';
import { 
  Cloud, Search, Filter, FileText, Download, ExternalLink, 
  Calendar, Tag, User, Building2, Calculator, Receipt, 
  FileSignature, ChevronRight, Folder, HardDrive, FilePlus, Upload, X,
  CheckCircle2, Paperclip, AlertTriangle, Loader2, Eye, FolderCheck, Archive, FileArchive,
  LayoutGrid, Table, BookOpen, Lock, RotateCcw, Layers, XCircle, ShieldCheck, ArrowDownUp,
  UserCheck, Award, Printer, Briefcase, Target, Coins, TrendingUp
} from 'lucide-react';
import { Appraisal, Transaction, OfficialDocument, LeaseContract, Property, F4209HeldOrderRecord } from '../types';
import { openDocumentSecurely, prepareRecordForFirestore, isFirestoreQuotaExceeded, isQuotaError, markFirestoreQuotaExceeded } from '@/lib/storage';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { storage } from '../lib/storageEngine';
import { useNotification } from './NotificationProvider';
import { SystemManualsWordModal } from './SystemManualsWordModal';
import { 
  generateGeneralSystemManualWord, 
  generateTenantPortalManualWord, 
  generateDueDiligenceManualWord, 
  generateSecurityDepositManualWord,
  generateOrderApprovalBlockchainManualWord,
  generateExamSimulation1Word,
  generateExamSimulation2Word,
  generateExamSimulation3Word
} from '../lib/wordManualsExport';
import { downloadMagisterThesisDocx, MAGISTER_THESIS_CONTENT } from '../lib/magisterThesisDocx';
import { downloadCristianCvDocx } from '../lib/cvDocxGenerator';
import { 
  downloadPsychologicalProfileWord, 
  getPsychologicalProfileHtmlContent, 
  PSYCHOLOGICAL_COMPETENCY_MATRIX 
} from '../lib/psychologicalProfileExport';
import { 
  downloadItDeploymentManualWord, 
  downloadItDeploymentManualPdf, 
  IT_MANUAL_SECTIONS 
} from '../lib/itDeploymentManualExport';
import {
  downloadSercotecReportWord,
  SERCOTEC_BUDGET_ITEMS,
  SERCOTEC_CANVAS_MODULES,
  SERCOTEC_FINANCIAL_PROJECTIONS
} from '../lib/sercotecReportExport';
import {
  downloadPersonalPcWindowsInstaller,
  downloadWindowsExecutableInstaller,
  downloadLinuxExecutableInstaller,
  downloadFullInstallerKitZip
} from '../lib/installerDownload';
import {
  getHeldOrdersLogF4209,
  sealAndChainF4209Ledger,
  ensureSealedF4209Ledger,
  verifyF4209BlockchainIntegrity,
  saveHeldOrdersLogF4209Raw,
  F4209ChainVerificationReport
} from '../lib/approvalRoutesData';
import { JDEGridContextMenu, JDEContextMenuItem } from './JDEGridContextMenu';
import { useJDESort, JDESortColumnOption } from '../lib/jdeGridSort';
import { JDESortSequenceModal } from './common/JDESortSequenceModal';

const VAULT_SORT_COLUMNS: JDESortColumnOption[] = [
  { key: 'type', label: 'Tipo Doc', type: 'string' },
  { key: 'name', label: 'Descripción / Nombre', type: 'string' },
  { key: 'entityName', label: 'Entidad / Referencia', type: 'string' },
  { key: 'date', label: 'Fecha Carga', type: 'date' },
  { key: 'user', label: 'Registrado por', type: 'string' },
  { key: 'updatedAt', label: 'Última Modificación', type: 'date' },
  { key: 'updatedBy', label: 'Modificado por', type: 'string' },
];

interface DigitalVaultProps {
  appraisals: Appraisal[];
  transactions: Transaction[];
  officialDocs: OfficialDocument[];
  leaseContracts: LeaseContract[];
  properties: Property[];
  setActiveModule?: (module: any) => void;
  setAppraisals?: React.Dispatch<React.SetStateAction<Appraisal[]>>;
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setOfficialDocs?: React.Dispatch<React.SetStateAction<OfficialDocument[]>>;
  setLeaseContracts?: React.Dispatch<React.SetStateAction<LeaseContract[]>>;
}

interface VaultItem {
  id: string;
  name: string;
  url: string;
  type: 'TASACIÓN' | 'INGRESO' | 'EGRESO' | 'OFICIO' | 'CONTRATO' | 'DOSSIER';
  date: string;
  entityName: string; // Direccion, Proveedor, etc.
  category?: string;
  user: string;
  updatedAt: string;
  updatedBy: string;
  timestamp: number;
}

const DigitalVault: React.FC<DigitalVaultProps> = ({ 
  appraisals, transactions, officialDocs, leaseContracts, properties, setActiveModule,
  setAppraisals, setTransactions, setOfficialDocs, setLeaseContracts
}) => {
  const { notify } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  
  // --- STATE FOR ASSETFLOW ENTERPRISE ERP VIEW & QBE FILTERS ---
  const [qbeType, setQbeType] = useState('');
  const [qbeName, setQbeName] = useState('');
  const [qbeEntity, setQbeEntity] = useState('');
  const [qbeDate, setQbeDate] = useState('');
  const [qbeUser, setQbeUser] = useState('');
  const [qbeUpdatedDate, setQbeUpdatedDate] = useState('');
  const [qbeUpdatedUser, setQbeUpdatedUser] = useState('');
  
  // --- STATE FOR JDE SORT SEQUENCE MODAL ---
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);

  // --- STATE FOR CURRENTLY SELECTED DOCUMENT FOR IN-APP PREVIEW ---
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<VaultItem | null>(null);

  // --- ASSETFLOW ENTERPRISE GRID CONTEXT MENU STATE (Right Click / F4 / [#] Selector) ---
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    item: VaultItem;
  } | null>(null);

  const handleRowContextMenu = (e: React.MouseEvent, item: VaultItem) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const clickX = e?.clientX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const clickY = e?.clientY ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 300);

    setGridContextMenu({
      x: Math.max(10, Math.min(clickX, typeof window !== 'undefined' ? window.innerWidth - 240 : 800)),
      y: Math.max(10, Math.min(clickY, typeof window !== 'undefined' ? window.innerHeight - 380 : 500)),
      item
    });
  };

  // --- MODAL MANUALES WORD (.DOCX) & LECTOR DE TESIS MAGÍSTER & VERIFICADOR BLOCKCHAIN SHA-256 ---
  const [isManualsWordModalOpen, setIsManualsWordModalOpen] = useState(false);
  const [isMagisterThesisModalOpen, setIsMagisterThesisModalOpen] = useState(false);
  const [isItManualModalOpen, setIsItManualModalOpen] = useState(false);
  const [isPsychologicalModalOpen, setIsPsychologicalModalOpen] = useState(false);
  const [activePsychologicalTab, setActivePsychologicalTab] = useState<'INFORME' | 'MATRIZ' | 'ROLES' | 'STAR'>('INFORME');
  const [isSercotecModalOpen, setIsSercotecModalOpen] = useState(false);
  const [activeSercotecTab, setActiveSercotecTab] = useState<'PITCH' | 'CANVAS' | 'PRESUPUESTO' | 'PROYECCIONES' | 'DEFENSA'>('PITCH');
  const [activeItTab, setActiveItTab] = useState<string>('intro');
  const [isChainVerifierOpen, setIsChainVerifierOpen] = useState(false);
  const [chainReport, setChainReport] = useState<F4209ChainVerificationReport | null>(null);
  const [isTamperSimulated, setIsTamperSimulated] = useState(false);
  const [preTamperBackup, setPreTamperBackup] = useState<F4209HeldOrderRecord[] | null>(null);

  const handleOpenChainVerifier = async () => {
    const activeList = await ensureSealedF4209Ledger(getHeldOrdersLogF4209());
    const report = await verifyF4209BlockchainIntegrity(activeList);
    setChainReport(report);
    setIsTamperSimulated(!report.isChainIntact);
    setIsChainVerifierOpen(true);
    if (report.isChainIntact) {
      notify(`Verificación SHA-256 completada: ${report.validBlocksCount}/${report.totalBlocks} bloques íntegros (${report.executionTimeMs} ms).`, "success");
    } else {
      notify(`Alerta Criptográfica Forense: ${report.corruptedBlocksCount} de ${report.totalBlocks} bloques corruptos detectados.`, "error");
    }
  };

  const handleSimulateTamperInVault = async () => {
    const current = await ensureSealedF4209Ledger(getHeldOrdersLogF4209());
    if (!isTamperSimulated) {
      setPreTamperBackup(JSON.parse(JSON.stringify(current)));
    }
    const chronological = [...current].sort((a, b) => (a.blockIndex ?? a.timestamp) - (b.blockIndex ?? b.timestamp));
    if (chronological.length === 0) return;
    const cleanReason = (chronological[0].reasonCode || '').replace(/\s*\[DATO ADULTERADO EN BD \+\$1\]/g, '').trim();
    chronological[0] = {
      ...chronological[0],
      orderAmount: (chronological[0].orderAmount || 0) + 1,
      reasonCode: `${cleanReason} [DATO ADULTERADO EN BD +$1]`
    };
    const tampered = [...chronological].reverse();
    saveHeldOrdersLogF4209Raw(tampered);
    setIsTamperSimulated(true);
    const report = await verifyF4209BlockchainIntegrity(tampered);
    setChainReport(report);
    notify("ALERTA FORENSE: Se simuló adulteración de +$1 CLP en el Bloque #1. Web Crypto SHA-256 detectó ruptura en cascada.", "error");
  };

  const handleRestoreChainInVault = async () => {
    const base = preTamperBackup || getHeldOrdersLogF4209();
    const resealed = await sealAndChainF4209Ledger(base);
    setIsTamperSimulated(false);
    setPreTamperBackup(null);
    const report = await verifyF4209BlockchainIntegrity(resealed);
    setChainReport(report);
    notify("Cadena de bloques F4209 restaurada y sellada criptográficamente con Web Crypto SHA-256.", "success");
  };

  const handleDownloadWordManual = async (id: string) => {
    if (id === 'informe-sercotec-semilla') {
      await downloadSercotecReportWord();
      notify("Descargando Formulario Oficial de Postulación SERCOTEC Capital Semilla 2026 (SERCOTEC-SEM-2026-01) en formato Word (.docx)...", "success");
      return;
    } else if (id === 'informe-psicolaboral-sgc') {
      await downloadPsychologicalProfileWord();
      notify("Descargando Informe Pericial de Evaluación Psicolaboral (SGC-RRHH-PSI-009) en formato Word nativo (.docx)...", "success");
      return;
    } else if (id === 'magister-thesis-docx') {
      await downloadMagisterThesisDocx();
      notify("Descargando Trabajo Final de Máster (EBIS Business Tech School) en formato Word nativo (.docx)...", "success");
    } else if (id === 'manual-word-exam-sim-1') {
      generateExamSimulation1Word();
      notify("Descargando Simulacro de Examen de Grado N° 1 (Nota: 9,3 / 10) en documento Word individual (.doc)...", "success");
    } else if (id === 'manual-word-exam-sim-2') {
      generateExamSimulation2Word();
      notify("Descargando Simulacro de Examen de Grado N° 2 (Nota: 9,8 / 10) en documento Word individual (.doc)...", "success");
    } else if (id === 'manual-word-exam-sim-3') {
      generateExamSimulation3Word();
      notify("Descargando Simulacro de Examen de Grado N° 3 (Nota: 9,6 / 10) en documento Word individual (.doc)...", "success");
    } else if (id === 'manual-word-general') {
      generateGeneralSystemManualWord();
      notify("Generando y descargando Manual de Entrenamiento Integral v4.0 (.docx)...", "success");
    } else if (id === 'manual-word-approvals') {
      generateOrderApprovalBlockchainManualWord();
      notify("Generando y descargando Procedimiento de Aprobaciones P43081 y Blockchain SHA-256 F4209 (.docx)...", "success");
    } else if (id === 'manual-word-tenant') {
      generateTenantPortalManualWord();
      notify("Generando y descargando Instructivo Portal Arrendatarios (.docx)...", "success");
    } else if (id === 'manual-word-diligence') {
      generateDueDiligenceManualWord();
      notify("Generando y descargando Manual de Due Diligence y UAF (.docx)...", "success");
    } else if (id === 'manual-word-deposit') {
      generateSecurityDepositManualWord();
      notify("Generando y descargando Guía de Depósitos de Garantía (.docx)...", "success");
    } else {
      setIsManualsWordModalOpen(true);
    }
  };

  // --- NUEVA LÓGICA DE COPIA DIGITAL & ASOCIACIÓN DE DOCUMENTO ---
  const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
  const [assocRecordType, setAssocRecordType] = useState<'TASACIÓN' | 'INGRESO' | 'EGRESO' | 'OFICIO' | 'CONTRATO'>('TASACIÓN');
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [uploadedFileBase64, setUploadedFileBase64] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [customDocumentName, setCustomDocumentName] = useState('');
  const [isSavingAssoc, setIsSavingAssoc] = useState(false);

  // Selector dinámico de registros basados en el tipo seleccionado
  const recordsToSelect = useMemo(() => {
    let options = [];
    switch (assocRecordType) {
      case 'TASACIÓN':
        options = appraisals.map(a => ({
          id: a.id,
          label: `${a.address} [${a.appraiserName} - ${a.appraisalDate}]`,
          currentFile: a.documentUrl ? a.documentName || 'Respaldo Cargado' : null
        }));
        break;
      case 'INGRESO':
        options = transactions.filter(t => t.type === 'INCOME').map(t => ({
          id: t.id,
          label: `${t.date} - $${t.amount.toLocaleString('es-CL')} (ID: ${t.documentNumber || 'S/N'} - ${t.description || t.category})`,
          currentFile: t.documentUrl ? t.documentName || 'Respaldo Cargado' : null
        }));
        break;
      case 'EGRESO':
        options = transactions.filter(t => t.type === 'EXPENSE').map(t => ({
          id: t.id,
          label: `${t.date} - $${t.amount.toLocaleString('es-CL')} (ID: ${t.documentNumber || 'S/N'} - ${t.description || t.category || t.supplierName})`,
          currentFile: t.documentUrl ? t.documentName || 'Respaldo Cargado' : null
        }));
        break;
      case 'OFICIO':
        options = officialDocs.map(d => ({
          id: d.id,
          label: `${d.date} - Oficio ${d.docNumber} (${d.type}) - ${d.subject.substring(0, 45)}...`,
          currentFile: (d.documentUrl || (d.attachments && d.attachments.length > 0)) ? 'Oficio con Copia' : null
        }));
        break;
      case 'CONTRATO':
        options = leaseContracts.map(c => ({
          id: c.id,
          label: `${c.tenantName} - ${c.propertyLabel} [${c.startDate} al ${c.endDate}]`,
          currentFile: c.documentUrl ? c.documentName || 'Contrato Digital' : null
        }));
        break;
      default:
        options = [];
    }
    // Siempre agregamos la opción de crear un nuevo registro independiente para que el usuario nunca quede bloqueado
    return [
      ...options,
      { id: 'CREATE_NEW', label: `+ CREAR NUEVO REGISTRO / DOCUMENTO INDEPENDIENTE EN BÓVEDA`, currentFile: null }
    ];
  }, [assocRecordType, appraisals, transactions, officialDocs, leaseContracts]);

  // Handler para la lectura y codificación del archivo soporte original
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    // Establecer el nombre del documento si está vacío
    setCustomDocumentName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedFileBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Guardado definitivo y persistente de la copia digital
  const handleSaveAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFileBase64) {
      notify("Por favor cargue un documento de soporte (PDF o Imagen) en el Paso 3.", "warning");
      return;
    }

    let recordIdToUse = selectedRecordId || 'CREATE_NEW';

    setIsSavingAssoc(true);
    try {
      let collectionName = '';
      let fullRecordToSave: any = {};
      const targetDocName = customDocumentName.trim() || uploadedFileName || 'Respaldo Digital Asignado';
      const isNew = recordIdToUse === 'CREATE_NEW';
      const now = Date.now();
      const todayIso = new Date().toISOString().split('T')[0];

      switch (assocRecordType) {
        case 'TASACIÓN': {
          collectionName = 'appraisals';
          const existingAppraisal = !isNew ? appraisals.find(a => a.id === recordIdToUse) : null;
          if (isNew || !existingAppraisal) {
            const newId = isNew ? `app-${now}` : recordIdToUse;
            recordIdToUse = newId;
            fullRecordToSave = {
              id: newId,
              propertyId: '',
              address: targetDocName.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
              commune: 'Santiago',
              appraiserName: 'ASSETFLOW SYSTEM',
              appraisalDate: todayIso,
              marketValueCLP: 0,
              marketValueUF: 0,
              documentUrl: uploadedFileBase64,
              documentName: targetDocName,
              status: 'VIGENTE',
              userCreator: 'DIGITAL_VAULT_AGENT',
              timestamp: now
            };
          } else {
            fullRecordToSave = {
              ...existingAppraisal,
              documentUrl: uploadedFileBase64,
              documentName: targetDocName,
              timestamp: now
            };
          }
          break;
        }

        case 'INGRESO':
        case 'EGRESO': {
          collectionName = 'transactions';
          const existingTx = !isNew ? transactions.find(t => t.id === recordIdToUse) : null;
          if (isNew || !existingTx) {
            const newId = isNew ? `tx-${now}` : recordIdToUse;
            recordIdToUse = newId;
            fullRecordToSave = {
              id: newId,
              description: targetDocName.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
              amount: 0,
              category: assocRecordType === 'INGRESO' ? 'Otros Ingresos' : 'Otros Gastos',
              type: assocRecordType === 'INGRESO' ? 'INCOME' : 'EXPENSE',
              documentType: 'SOPORTE_DIGITAL',
              documentNumber: 'S/N',
              date: todayIso,
              invoiceDate: todayIso,
              user: 'DIGITAL_VAULT_AGENT',
              timestamp: now,
              insuranceCompany: 'NINGUNA',
              status: 'COMPLETADA',
              documentUrl: uploadedFileBase64,
              documentName: targetDocName
            };
          } else {
            fullRecordToSave = {
              ...existingTx,
              documentUrl: uploadedFileBase64,
              documentName: targetDocName,
              timestamp: now
            };
          }
          break;
        }

        case 'OFICIO': {
          collectionName = 'official_docs';
          const existingDoc = !isNew ? officialDocs.find(d => d.id === recordIdToUse) : null;
          if (isNew || !existingDoc) {
            const newId = isNew ? `doc-${now}` : recordIdToUse;
            recordIdToUse = newId;
            fullRecordToSave = {
              id: newId,
              type: 'ENTRANTE',
              docNumber: `VAULT-${now.toString().substring(7)}`,
              date: todayIso,
              arrivalDate: todayIso,
              systemLoadDate: todayIso,
              subject: targetDocName.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
              synthesis: 'Documento cargado de forma directa en la Bóveda Digital',
              status: 'RECIBIDO',
              statusUpdatedAt: now,
              timestamp: now,
              sender: 'SOPORTE EXTERNO',
              recipient: 'DEPTO. INMOBILIARIO',
              attachments: [uploadedFileBase64],
              documentUrl: uploadedFileBase64,
              documentName: targetDocName,
              userCreator: 'DIGITAL_VAULT_AGENT'
            };
          } else {
            fullRecordToSave = {
              ...existingDoc,
              attachments: [uploadedFileBase64],
              documentUrl: uploadedFileBase64,
              documentName: targetDocName,
              timestamp: now
            };
          }
          break;
        }

        case 'CONTRATO': {
          collectionName = 'lease_contracts';
          const existingContract = !isNew ? leaseContracts.find(c => c.id === recordIdToUse) : null;
          if (isNew || !existingContract) {
            const newId = isNew ? `lc-${now}` : recordIdToUse;
            recordIdToUse = newId;
            fullRecordToSave = {
              id: newId,
              propertyId: 'boveda-doc',
              propertyLabel: 'DOCUMENTO CARGADO EN BÓVEDA',
              tenantName: targetDocName.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
              tenantTaxId: 'S/N',
              tenantDocNumber: 'S/N',
              startDate: todayIso,
              endDate: todayIso,
              monthlyAmount: 0,
              currency: 'CLP',
              status: 'VIGENTE',
              documentUrl: uploadedFileBase64,
              documentName: targetDocName,
              userCreator: 'DIGITAL_VAULT_AGENT',
              timestamp: now
            };
          } else {
            fullRecordToSave = {
              ...existingContract,
              documentUrl: uploadedFileBase64,
              documentName: targetDocName,
              timestamp: now
            };
          }
          break;
        }
      }

      // 1. Actualizar inmediatamente el estado de React y el almacenamiento local IndexedDB
      if (assocRecordType === 'TASACIÓN') {
        if (setAppraisals) {
          setAppraisals(prev => {
            const exists = prev.some(a => a.id === recordIdToUse);
            const updated = exists
              ? prev.map(a => a.id === recordIdToUse ? fullRecordToSave : a)
              : [fullRecordToSave, ...prev];
            storage.save('appraisals', updated);
            return updated;
          });
        } else {
          const updated = isNew ? [fullRecordToSave, ...appraisals] : appraisals.map(a => a.id === recordIdToUse ? fullRecordToSave : a);
          await storage.save('appraisals', updated);
        }
      } else if (assocRecordType === 'INGRESO' || assocRecordType === 'EGRESO') {
        if (setTransactions) {
          setTransactions(prev => {
            const exists = prev.some(t => t.id === recordIdToUse);
            const updated = exists
              ? prev.map(t => t.id === recordIdToUse ? fullRecordToSave : t)
              : [fullRecordToSave, ...prev];
            storage.save('transactions', updated);
            return updated;
          });
        } else {
          const updated = isNew ? [fullRecordToSave, ...transactions] : transactions.map(t => t.id === recordIdToUse ? fullRecordToSave : t);
          await storage.save('transactions', updated);
        }
      } else if (assocRecordType === 'OFICIO') {
        if (setOfficialDocs) {
          setOfficialDocs(prev => {
            const exists = prev.some(o => o.id === recordIdToUse);
            const updated = exists
              ? prev.map(o => o.id === recordIdToUse ? fullRecordToSave : o)
              : [fullRecordToSave, ...prev];
            storage.save('officialDocs', updated);
            return updated;
          });
        } else {
          const updated = isNew ? [fullRecordToSave, ...officialDocs] : officialDocs.map(o => o.id === recordIdToUse ? fullRecordToSave : o);
          await storage.save('officialDocs', updated);
        }
      } else if (assocRecordType === 'CONTRATO') {
        if (setLeaseContracts) {
          setLeaseContracts(prev => {
            const exists = prev.some(c => c.id === recordIdToUse);
            const updated = exists
              ? prev.map(c => c.id === recordIdToUse ? fullRecordToSave : c)
              : [fullRecordToSave, ...prev];
            storage.save('leaseContracts', updated);
            return updated;
          });
        } else {
          const updated = isNew ? [fullRecordToSave, ...leaseContracts] : leaseContracts.map(c => c.id === recordIdToUse ? fullRecordToSave : c);
          await storage.save('leaseContracts', updated);
        }
      }

      // 2. Guardar en Firestore de forma segura con soporte de fragmentación automática (chunking) para PDFs > 550 KB
      try {
        const preparedPayload = await prepareRecordForFirestore(collectionName, recordIdToUse, fullRecordToSave);
        if (!isFirestoreQuotaExceeded()) {
          const docRef = doc(db, collectionName, recordIdToUse);
          await setDoc(docRef, preparedPayload, { merge: true });
        }
      } catch (cloudErr) {
        if (isQuotaError(cloudErr)) {
          markFirestoreQuotaExceeded();
        } else {
          console.warn("[Bóveda Digital] Respaldo local completado; advertencia en sincronización cloud:", cloudErr);
        }
      }

      // 3. Registrar en bitácora de auditoría sin bloquear el flujo principal
      if (!isFirestoreQuotaExceeded()) {
        try {
          const auditId = crypto.randomUUID();
          const auditRef = doc(db, 'audit_logs', auditId);
          await setDoc(auditRef, {
            id: auditId,
            action: isNew ? 'CREATE' : 'UPDATE',
            module: 'BOVEDA_DIGITAL',
            moduleName: 'BOVEDA_DIGITAL',
            user: 'DIGITAL_VAULT_AGENT',
            entityType: assocRecordType === 'TASACIÓN' ? 'TASACION' : assocRecordType === 'OFICIO' ? 'OFICIO' : assocRecordType === 'CONTRATO' ? 'CONTRATO' : 'TRANSACCION',
            entityId: recordIdToUse,
            fieldChanged: 'COPIA_DIGITAL_CARGADA',
            newValue: targetDocName,
            oldValue: isNew ? 'NUEVO_DOCUMENTO_INDEPENDIENTE' : 'RESPALDO_VINCULADO',
            timestamp: new Date().toISOString(),
            programId: 'P0912_VAULT'
          });
        } catch (auditErr) {
          if (isQuotaError(auditErr)) markFirestoreQuotaExceeded();
        }
      }

      notify(
        isNew
          ? `¡Documento "${targetDocName}" guardado en la Bóveda Digital con éxito!`
          : `¡Copia digital "${targetDocName}" vinculada y grabada en base de datos con éxito!`,
        "success"
      );

      // Limpiar y cerrar
      setIsAssociateModalOpen(false);
      setSelectedRecordId('');
      setUploadedFileBase64('');
      setUploadedFileName('');
      setCustomDocumentName('');
    } catch (err: any) {
      console.error("Error al asociar archivo soporte:", err);
      notify(`Error de persistencia: ${err.message || err.toString()}`, "error");
    } finally {
      setIsSavingAssoc(false);
    }
  };

  const vaultItems = useMemo(() => {
    const items: VaultItem[] = [];

    // Appraisals
    appraisals.forEach(a => {
      if (a.documentUrl) {
         items.push({
           id: a.id,
           name: a.documentName || 'Informe de Tasación',
           url: a.documentUrl,
           type: 'TASACIÓN',
           date: a.appraisalDate,
           entityName: a.address,
           user: a.userCreator,
           updatedAt: (a as any).updatedAt || a.appraisalDate || new Date(a.timestamp).toISOString().split('T')[0],
           updatedBy: (a as any).updatedBy || a.userCreator || 'SAMAHEIM',
           timestamp: a.timestamp
         });
      }
    });

    // Transactions (Income/Expense)
    transactions.forEach(t => {
      if (t.documentUrl) {
         items.push({
           id: t.id,
           name: t.documentName || `Soporte ${t.documentType}`,
           url: t.documentUrl,
           type: t.type === 'INCOME' ? 'INGRESO' : 'EGRESO',
           date: t.date,
           entityName: t.supplierName || t.description,
           category: t.category,
           user: t.user,
           updatedAt: (t as any).updatedAt || t.date || new Date(t.timestamp).toISOString().split('T')[0],
           updatedBy: (t as any).updatedBy || t.user || 'SAMAHEIM',
           timestamp: t.timestamp
         });
      }
    });

    // Official Docs
    officialDocs.forEach(d => {
      const docUrl = d.documentUrl || d.attachments?.[0];
      if (docUrl) {
         const isDossier = d.id.startsWith('doc-lg-') || d.subject.includes('SET CONSOLIDADO');
         const modDate = d.statusUpdatedAt 
           ? new Date(d.statusUpdatedAt).toISOString().split('T')[0] 
           : ((d as any).updatedAt || d.date);
         items.push({
           id: d.id,
           name: d.documentName || `Oficio ${d.docNumber}`,
           url: docUrl,
           type: isDossier ? 'DOSSIER' : 'OFICIO',
           date: d.date,
           entityName: d.subject,
           user: d.userCreator,
           updatedAt: modDate,
           updatedBy: (d as any).updatedBy || d.signedBy || d.userCreator || 'SAMAHEIM',
           timestamp: d.timestamp
         });
      }
    });

    // Lease Contracts
    leaseContracts.forEach(c => {
      if (c.documentUrl) {
         items.push({
           id: c.id,
           name: c.documentName || 'Contrato de Arriendo',
           url: c.documentUrl,
           type: 'CONTRATO',
           date: c.startDate,
           entityName: c.tenantName,
           user: c.userCreator,
           updatedAt: (c as any).updatedAt || c.renewalDate || c.startDate || new Date(c.timestamp).toISOString().split('T')[0],
           updatedBy: (c as any).updatedBy || c.userCreator || 'SAMAHEIM',
           timestamp: c.timestamp
         });
      }
    });

    // Properties with attached documents or policies
    properties.forEach(p => {
      if (p.documentUrl) {
        items.push({
          id: `prop-doc-${p.id}`,
          name: p.documentName || `Expediente Propiedad ${p.code}`,
          url: p.documentUrl,
          type: 'DOSSIER',
          date: p.lastAppraisalDate || new Date().toISOString().split('T')[0],
          entityName: `${p.building} - ${p.code}`,
          user: p.userCreator || 'SISTEMA',
          updatedAt: (p as any).updatedAt || p.lastAppraisalDate || new Date(p.timestamp || Date.now()).toISOString().split('T')[0],
          updatedBy: (p as any).updatedBy || p.userCreator || 'SAMAHEIM',
          timestamp: p.timestamp || Date.now()
        });
      }
      if (p.insurancePolicy?.documentUrl) {
        items.push({
          id: `prop-ins-${p.id}`,
          name: p.insurancePolicy.documentName || `Póliza Seguro ${p.insurancePolicy.policyNumber || p.code}`,
          url: p.insurancePolicy.documentUrl,
          type: 'DOSSIER',
          date: p.insurancePolicy.startDate || new Date().toISOString().split('T')[0],
          entityName: `${p.building} - ${p.code} (${p.insurancePolicy.company || 'Aseguradora'})`,
          user: p.userCreator || 'SISTEMA',
          updatedAt: (p.insurancePolicy as any).updatedAt || p.insurancePolicy.startDate || new Date().toISOString().split('T')[0],
          updatedBy: (p.insurancePolicy as any).updatedBy || p.userCreator || 'SISTEMA',
          timestamp: p.timestamp || Date.now()
        });
      }
    });

    // Plan de Negocio y Postulación Oficial Capital Semilla SERCOTEC 2026 (SERCOTEC-SEM-2026-01 • Word .docx)
    items.push({
      id: 'informe-sercotec-semilla',
      name: 'Plan de Negocio & Postulación Oficial Capital Semilla SERCOTEC 2026 (SERCOTEC-SEM-2026-01 • Word .docx)',
      url: '#informe-sercotec-semilla',
      type: 'OFICIO',
      category: 'CAPITAL SEMILLA SERCOTEC',
      date: new Date().toISOString().split('T')[0],
      entityName: 'SERCOTEC-SEM-2026-01 • Subsidio $3.5M CLP para Constitución de AssetFlow Technologies SpA, INAPI, Servidor y Despliegue B2B',
      user: 'SAMAHEIM',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'CRISTIAN MUÑOZ',
      timestamp: Date.now() + 10000 // Documento destacado de formalización societaria y financiamiento
    });

    // Informe Pericial de Evaluación Psicolaboral & Perfil Directivo (SGC-RRHH-PSI-009 • Word)
    items.push({
      id: 'informe-psicolaboral-sgc',
      name: 'Informe Pericial de Evaluación Psicolaboral & Perfil de Competencias de Alta Dirección (SGC-RRHH-PSI-009 • Word .docx)',
      url: '#informe-psicolaboral-sgc',
      type: 'OFICIO',
      category: 'INFORME PSICOLABORAL',
      date: new Date().toISOString().split('T')[0],
      entityName: 'SGC-RRHH-PSI-009 • Evaluación Psicológica Organizacional, Metodología STAR, Big Five, Liderazgo Ético & Gestión del Cambio',
      user: 'PSICOLOGÍA_ORGANIZACIONAL',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'PERITO_LABORAL',
      timestamp: Date.now() + 8000 // Primer documento directivo en la Bóveda Digital
    });

    // Manual Técnico de Instalación, Despliegue y Operación en Servidores Empresariales (SGC-IT-MAN-008 • Word y PDF)
    items.push({
      id: 'manual-it-deployment-server',
      name: 'Manual Técnico de Instalación, Despliegue y Operación en Servidores Empresariales (SGC-IT-MAN-008 • Word & PDF)',
      url: '#manual-it-deployment-server',
      type: 'OFICIO',
      category: 'MANUAL IT',
      date: new Date().toISOString().split('T')[0],
      entityName: 'SGC-IT-MAN-008 • Guía Didáctica IT (Docker Compose, PM2, Nginx, SSL Let\'s Encrypt, Firewall & Troubleshooting)',
      user: 'SAMAHEIM',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'CRISTIAN MUÑOZ',
      timestamp: Date.now() + 6000 // Primer documento de infraestructura en la Bóveda Digital
    });

    // Trabajo Final de Máster (TFM): IA Generativa, Derecho Digital y Blockchain — EBIS Business Tech School (.DOCX Nativo)
    items.push({
      id: 'magister-thesis-docx',
      name: 'Trabajo Final para Optar al Grado de Magíster en Inteligencia Artificial, Derecho Digital y Blockchain (.DOCX)',
      url: '#magister-thesis-docx',
      type: 'OFICIO',
      category: 'TESIS MAGISTER DOCX',
      date: new Date().toISOString().split('T')[0],
      entityName: 'TFM EBIS Business Tech School — ERP JDE 9.11, Checklist 7 Puntos W43081C, Merkle Root & SHA-256 Append-Only',
      user: 'SAMAHEIM',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'SAMAHEIM',
      timestamp: Date.now() + 5000 // Primer documento destacado en la Biblioteca
    });

    // Simulacro de Examen de Grado N° 1 (Documento Word Individual)
    items.push({
      id: 'manual-word-exam-sim-1',
      name: 'Simulacro de Examen de Grado N° 1: Defensa Arquitectónica, Gobernanza IA y Gestión del Cambio — EBIS (.DOC Word Individual)',
      url: '#manual-word-exam-sim-1',
      type: 'OFICIO',
      category: 'MANUAL WORD',
      date: new Date().toISOString().split('T')[0],
      entityName: 'SGC-ACA-TFM-006-A • Criptografía SHA-256, EU AI Act, Protocolo Sombra y Empoderamiento (Calificación: 9,3 / 10 | 6,7 Chile)',
      user: 'SAMAHEIM',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'SAMAHEIM',
      timestamp: Date.now() + 4700
    });

    // Simulacro de Examen de Grado N° 2 (Documento Word Individual)
    items.push({
      id: 'manual-word-exam-sim-2',
      name: 'Simulacro de Examen de Grado N° 2: Casos Prácticos de Auditoría Forense, Derecho Digital y Continuidad — EBIS (.DOC Word Individual)',
      url: '#manual-word-exam-sim-2',
      type: 'OFICIO',
      category: 'MANUAL WORD',
      date: new Date().toISOString().split('T')[0],
      entityName: 'SGC-ACA-TFM-006-B • Fraccionamiento OTs / Ley de Benford, Acta Check-Out, Ley 21.719 y Continuidad TI (Calificación: 9,8 / 10 | 6,9 Chile)',
      user: 'SAMAHEIM',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'SAMAHEIM',
      timestamp: Date.now() + 4600
    });

    // Simulacro de Examen de Grado N° 3 (Documento Word Individual)
    items.push({
      id: 'manual-word-exam-sim-3',
      name: 'Simulacro de Examen de Grado N° 3: Auditoría CMF en Mutucar, Cobro de Arriendos, Seguridad y Asistente IA — EBIS (.DOC Word Individual)',
      url: '#manual-word-exam-sim-3',
      type: 'OFICIO',
      category: 'MANUAL WORD',
      date: new Date().toISOString().split('T')[0],
      entityName: 'SGC-ACA-TFM-006-C • 4 Observaciones Auditoría / CMF, Cobros Arriendo PDF/Excel, Privilegios e IA P0001 (Calificación: 9,6 / 10 | 6,8 Chile)',
      user: 'SAMAHEIM',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'SAMAHEIM',
      timestamp: Date.now() + 4500
    });

    // CISO Assessment compliance Report (R09OWSEC)
    items.push({
      id: 'ciso-executive-report',
      name: 'Informe Ejecutivo de Cumplimiento CISO & Seguridad Corporativa (.PDF)',
      url: '#ciso-report',
      type: 'OFICIO',
      date: new Date().toISOString().split('T')[0],
      entityName: 'Evaluación de Blindaje & Directivas ISO 27001',
      user: 'SYSTEM_AUDITOR',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'CISO_AUDITOR',
      timestamp: Date.now() + 1000 // force first when sorted
    });

    // Projects Area Assessment Report (R09OWPRJ)
    items.push({
      id: 'projects-area-report',
      name: 'Informe Técnico de Propuesta Solución & Retorno Operacional PMO (.PDF)',
      url: '#projects-report',
      type: 'OFICIO',
      date: new Date().toISOString().split('T')[0],
      entityName: 'Presentación Técnica al Área de Proyectos',
      user: 'PMO_LEADER',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'PMO_LEADER',
      timestamp: Date.now() + 500
    });

    // Currículum Vitae Ejecutivo Oficial (R09OWCV — Formato .DOCX Nativo)
    const vaultCvRecordStr = typeof window !== 'undefined' ? localStorage.getItem('vault_cv_docx_record') : null;
    let cachedVaultCvRecord: any = null;
    if (vaultCvRecordStr) {
      try { cachedVaultCvRecord = JSON.parse(vaultCvRecordStr); } catch (_) {}
    }

    items.push({
      id: 'curriculum-executive-docx',
      name: cachedVaultCvRecord?.name || 'Currículum Vitae de Cristian Andrés Muñoz Rojas — Formato Ejecutivo (.DOCX Nativo)',
      url: cachedVaultCvRecord?.url || '#curriculum-docx',
      type: 'OFICIO',
      category: 'CV EJECUTIVO DOCX',
      date: cachedVaultCvRecord?.date || new Date().toISOString().split('T')[0],
      entityName: 'CV Optimizado ATS • Liderazgo de Dotaciones, Control Presupuestario OPEX/CAPEX & Cero Observaciones CMF',
      user: 'SAMAHEIM',
      updatedAt: cachedVaultCvRecord?.updatedAt || new Date().toISOString().split('T')[0],
      updatedBy: 'SAMAHEIM',
      timestamp: Date.now() + 4800 // High priority in vault
    });

    // 1. Manual de Entrenamiento Integral AssetFlow ERP v4.0 (.DOCX)
    items.push({
      id: 'manual-word-general',
      name: '1. Manual de Entrenamiento Integral AssetFlow ERP v4.0 (ISO 9001 • .DOCX)',
      url: '#manual-word-general',
      type: 'OFICIO',
      category: 'MANUAL WORD',
      date: new Date().toISOString().split('T')[0],
      entityName: 'SGC-MAN-ERP-001 v4.0 • JDE 9.11, JAS FastBoot, P43081, F4209, P1501HA y Excel HH:mm',
      user: 'CONTROL INTERNO',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'CONTROL INTERNO',
      timestamp: Date.now() + 920
    });

    // 2. Procedimiento de Aprobaciones P43081 y Cadena de Bloques SHA-256 F4209 (.DOCX)
    items.push({
      id: 'manual-word-approvals',
      name: '2. Procedimiento de Aprobaciones P43081 y Cadena de Bloques SHA-256 F4209 (ISO 9001 • .DOCX)',
      url: '#manual-word-approvals',
      type: 'OFICIO',
      category: 'MANUAL WORD',
      date: new Date().toISOString().split('T')[0],
      entityName: 'SGC-PRO-APR-005 • Checklist 7 Puntos W43081C, Menú Contextual, Excel HH:mm y Gobernanza Append-Only',
      user: 'COMPLIANCE_BLOCKCHAIN',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'COMPLIANCE_JDE',
      timestamp: Date.now() + 890
    });

    // 3. Instructivo Portal Arrendatarios y Cartola (.DOCX)
    items.push({
      id: 'manual-word-tenant',
      name: '3. Instructivo Portal Arrendatarios y Cartola de Pagos (ISO 9001 • .DOCX)',
      url: '#manual-word-tenant',
      type: 'OFICIO',
      category: 'MANUAL WORD',
      date: new Date().toISOString().split('T')[0],
      entityName: 'SGC-INS-POR-002 • Manual de Usuario Portal Arrendatarios y Cartola (Editable Word)',
      user: 'CONTROL INTERNO',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'CONTROL INTERNO',
      timestamp: Date.now() + 850
    });

    // 4. Manual de Due Diligence Contratistas y UAF (.DOCX)
    items.push({
      id: 'manual-word-diligence',
      name: '4. Manual de Due Diligence Contratistas y Compliance UAF (ISO 9001 • .DOCX)',
      url: '#manual-word-diligence',
      type: 'OFICIO',
      category: 'MANUAL WORD',
      date: new Date().toISOString().split('T')[0],
      entityName: 'SGC-PRO-UAF-003 • Protocolo de Cumplimiento Proveedores y Prevención UAF (Editable Word)',
      user: 'COMPLIANCE_UAF',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'COMPLIANCE_UAF',
      timestamp: Date.now() + 800
    });

    // 5. Guía de Depósitos de Garantía e Intereses (.DOCX)
    items.push({
      id: 'manual-word-deposit',
      name: '5. Procedimiento de Liquidación de Garantías P1540 y Recepción P1501RV (ISO 9001 • .DOCX)',
      url: '#manual-word-deposit',
      type: 'OFICIO',
      category: 'MANUAL WORD',
      date: new Date().toISOString().split('T')[0],
      entityName: 'SGC-PRO-GAR-004 • Liquidación de Fondos, Cruce Mora P1501HA y Custodia de Garantías',
      user: 'TESORERIA',
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: 'TESORERIA',
      timestamp: Date.now() + 750
    });

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [appraisals, transactions, officialDocs, leaseContracts, properties]);

  const filteredItems = useMemo(() => {
    return vaultItems.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'ALL' || item.type === filterType;

      // AssetFlow Enterprise QBE (Query By Example) Column Filters
      const matchesQbeType = !qbeType || item.type.toLowerCase().includes(qbeType.toLowerCase());
      const matchesQbeName = !qbeName || item.name.toLowerCase().includes(qbeName.toLowerCase());
      const matchesQbeEntity = !qbeEntity || item.entityName.toLowerCase().includes(qbeEntity.toLowerCase());
      const matchesQbeDate = !qbeDate || item.date.toLowerCase().includes(qbeDate.toLowerCase());
      const matchesQbeUser = !qbeUser || item.user.toLowerCase().includes(qbeUser.toLowerCase());
      const matchesQbeUpdatedDate = !qbeUpdatedDate || item.updatedAt.toLowerCase().includes(qbeUpdatedDate.toLowerCase());
      const matchesQbeUpdatedUser = !qbeUpdatedUser || item.updatedBy.toLowerCase().includes(qbeUpdatedUser.toLowerCase());

      return matchesSearch && matchesType && matchesQbeType && matchesQbeName && matchesQbeEntity && matchesQbeDate && matchesQbeUser && matchesQbeUpdatedDate && matchesQbeUpdatedUser;
    });
  }, [vaultItems, searchTerm, filterType, qbeType, qbeName, qbeEntity, qbeDate, qbeUser, qbeUpdatedDate, qbeUpdatedUser]);

  // --- MOTOR DE ORDENAMIENTO ESTÁNDAR ENTERPRISE (TRI-STATE & MULTI-COLUMNA) ---
  const {
    sortedData: displayVaultItems,
    primarySort,
    secondarySort,
    requestSort,
    clearSort,
    setManualMultiSort,
    getSortState,
    isSorted
  } = useJDESort(filteredItems);

  const stats = useMemo(() => {
    return {
      total: vaultItems.length,
      tasaciones: vaultItems.filter(i => i.type === 'TASACIÓN').length,
      finanzas: vaultItems.filter(i => i.type === 'INGRESO' || i.type === 'EGRESO').length,
      oficios: vaultItems.filter(i => i.type === 'OFICIO' || i.type === 'DOSSIER').length,
      contratos: vaultItems.filter(i => i.type === 'CONTRATO').length,
    };
  }, [vaultItems]);

  const handleDrillDown = (item: VaultItem) => {
    if (!setActiveModule) {
      notify("No se puede redirigir: Navegación de módulos no configurada", "error");
      return;
    }
    
    let targetModule = '';
    let label = '';
    
    switch (item.type) {
      case 'TASACIÓN':
        targetModule = 'TASACIONES';
        label = 'Tasaciones e Informes de Valorización';
        break;
      case 'INGRESO':
        targetModule = 'INGRESOS';
        label = 'Control Auxiliar de Ingresos';
        break;
      case 'EGRESO':
        targetModule = 'EGRESOS';
        label = 'Control Auxiliar de Egresos';
        break;
      case 'OFICIO':
        if (item.id === 'informe-sercotec-semilla') {
          setIsSercotecModalOpen(true);
          notify("Abriendo Formulario Oficial y Plan de Negocio SERCOTEC Capital Semilla 2026 (SERCOTEC-SEM-2026-01)", "info");
          return;
        } else if (item.id === 'informe-psicolaboral-sgc') {
          setIsPsychologicalModalOpen(true);
          notify("Abriendo Informe Pericial de Evaluación Psicolaboral (SGC-RRHH-PSI-009)", "info");
          return;
        } else if (item.id === 'manual-it-deployment-server') {
          setIsItManualModalOpen(true);
          notify("Abriendo Manual Técnico de Despliegue en Servidores IT (SGC-IT-MAN-008)", "info");
          return;
        } else if (item.id === 'magister-thesis-docx') {
          setIsMagisterThesisModalOpen(true);
          return;
        } else if (item.id.startsWith('manual-word-')) {
          handleDownloadWordManual(item.id);
          return;
        } else if (item.id === 'ciso-executive-report') {
          setActiveModule('CISO_REPORT');
          notify("Drill Down ERP: Abriendo Reporte CISO & Directivas de Seguridad", "info");
          return;
        } else if (item.id === 'projects-area-report') {
          setActiveModule('PROJECTS_REPORT');
          notify("Drill Down ERP: Abriendo Propuesta Técnica PMO Proyectos", "info");
          return;
        } else if (item.id === 'curriculum-executive-docx' || item.id === 'curriculum-executive-report') {
          setActiveModule('CURRICULUM_CV');
          notify("Drill Down ERP: Abriendo Currículum Vitae Optimizado", "info");
          return;
        }
        targetModule = 'OFICIOS';
        label = 'Oficios y Documentos Normados';
        break;
      case 'CONTRATO':
        targetModule = 'CONTRATOS_ARRIENDO';
        label = 'Maestro de Contratos de Arriendo';
        break;
      case 'DOSSIER':
        targetModule = 'GARANTIAS';
        label = 'Fianzas, Garantías y Dossiers';
        break;
      default:
        targetModule = 'DASHBOARD';
        label = 'Panel de Control Principal';
    }

    if (targetModule) {
      setActiveModule(targetModule);
      notify(`Drill Down ERP: Redirigiendo a [${label}] para auditar el registro origen`, "success");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto bg-slate-50/50 rounded-2xl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6 shrink-0 overflow-x-auto min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-950 tracking-tight flex items-center gap-3">
              <HardDrive className="text-indigo-600" size={28} />
              Bóveda Digital
            </h2>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Repositorio centralizado de documentos y soportes digitales del sistema
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
               onClick={() => setIsManualsWordModalOpen(true)}
               className="px-5 py-3 bg-[#002D62] hover:bg-[#001D42] border border-blue-900 text-white rounded-2xl text-[10.5px] font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:translate-y-0.5 shrink-0 cursor-pointer"
               title="Abrir Centro de Descargas de Manuales del Sistema en formato Word (.docx)"
            >
               <BookOpen size={16} className="text-emerald-400" />
               <span>Manuales Word (.docx)</span>
            </button>
            <button
               onClick={() => setIsAssociateModalOpen(true)}
               className="px-5 py-3 bg-indigo-600 hover:bg-slate-900 border border-indigo-700 hover:border-slate-800 text-white rounded-2xl text-[10.5px] font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:translate-y-0.5 shrink-0"
            >
               <FilePlus size={15} />
               Subir y Asociar Copia Digital
            </button>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Almacenamiento</span>
              <span className="text-sm font-bold text-slate-950">Cloud Persistente</span>
            </div>
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 animate-pulse">
              <Cloud size={20} />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl shadow-xs">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Documentos</div>
            <div className="text-xl font-black text-slate-950">{stats.total}</div>
          </div>
          <div className="bg-indigo-50/50 border border-indigo-150 p-4 rounded-2xl shadow-xs">
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Tasaciones</div>
            <div className="text-xl font-black text-indigo-600">{stats.tasaciones}</div>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-150 p-4 rounded-2xl shadow-xs">
            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Finanzas</div>
            <div className="text-xl font-black text-emerald-600">{stats.finanzas}</div>
          </div>
          <div className="bg-amber-50/50 border border-amber-150 p-4 rounded-2xl shadow-xs">
            <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Oficios</div>
            <div className="text-xl font-black text-amber-600">{stats.oficios}</div>
          </div>
          <div className="bg-[#FFCC00]/10 border border-[#FFCC00]/25 p-4 rounded-2xl shadow-xs">
            <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Contratos</div>
            <div className="text-xl font-black text-slate-900">{stats.contratos}</div>
          </div>
        </div>
      </div>

      {/* Main Content with vertical scroll protection */}
      <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 overflow-y-auto pb-8">
        {/* TARJETA DESTACADA: PLAN DE NEGOCIO CAPITAL SEMILLA SERCOTEC 2026 (SERCOTEC-SEM-2026-01) */}
        <div className="bg-gradient-to-r from-[#002D62] via-[#0C3860] to-[#08223B] border-2 border-amber-400 rounded-2xl p-5 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Briefcase size={12} className="stroke-[3]" />
                FONDO CONCURSABLE • SERCOTEC CAPITAL SEMILLA 2026
              </span>
              <span className="text-[11px] font-mono text-amber-300 font-bold">
                Código SERCOTEC-SEM-2026-01 • Modelo Canvas 9 Bloques
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold font-mono">
                SUBSIDIO: $3.500.000 CLP + $175.000 CLP COFINANCIAMIENTO
              </span>
            </div>
            <h3 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>Plan de Negocio y Postulación Oficial: Constitución Legal de AssetFlow Technologies SpA</span>
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed max-w-4xl">
              <strong>Proyecto de Formalización y Comercialización Tecnológica:</strong> Formulación técnica y económica integral para adjudicar el fondo no reembolsable de SERCOTEC. Destinado a la constitución formal de <em>AssetFlow Technologies SpA</em> en &ldquo;Tu Empresa en un Día&rdquo;, habilitación tributaria 1ª Categoría SII, registro de propiedad intelectual en INAPI (Clases 9 y 42), servidor mini-workstation local de pruebas de carga forense (10.000 tx/día), certificados SSL EV y prospección comercial B2B hacia Administradoras Generales de Fondos (AGF) y Multifamily con punto de equilibrio proyectado al mes 5.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsSercotecModalOpen(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Eye size={15} className="text-amber-300" />
              <span>Leer Postulación en Pantalla</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadWordManual('informe-sercotec-semilla')}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all cursor-pointer ring-2 ring-amber-300"
              title="Descargar Plan de Negocio SERCOTEC Completo en formato Microsoft Word nativo (.docx)"
            >
              <Download size={15} className="stroke-[3]" />
              <span>Descargar en Word (.DOCX)</span>
            </button>
          </div>
        </div>

        {/* TARJETA DESTACADA: INFORME PERICIAL DE EVALUACIÓN PSICOLABORAL & PERFIL DIRECTIVO */}
        <div className="bg-gradient-to-r from-[#002D62] via-[#083358] to-[#062038] border-2 border-emerald-400 rounded-2xl p-5 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                <UserCheck size={12} className="stroke-[3]" />
                RECURSOS HUMANOS &amp; GOBERNANZA • SGC-RRHH-PSI-009
              </span>
              <span className="text-[11px] font-mono text-emerald-300 font-bold">
                Metodología STAR • Modelo Big Five • Liderazgo Situacional
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold font-mono">
                DICTAMEN: IDÓNEO SIN RESERVAS (10/10)
              </span>
            </div>
            <h3 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>Informe Pericial de Evaluación Psicolaboral &amp; Competencias Directivas de Cristian Muñoz Rojas</span>
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed max-w-4xl">
              <strong>Diagnóstico Pericial de Alta Dirección:</strong> Evaluación psicológica profunda basada en los incidentes críticos reales del proyecto: detección y freno de contratación sospechosa de $20M CLP con exigencia de <em>Due Diligence</em>, subsanación de 4 observaciones de auditoría y levantamiento de suspensión de la CMF en Mutucar, gestión del cambio en terreno mediante el <strong>Protocolo Sombra</strong> y <strong>Protocolo de Empoderamiento</strong>, e hibridación cognitiva (Ingeniería Industrial + Derecho + IA bajo supervisión humana según el Art. 14 EU AI Act).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsPsychologicalModalOpen(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Eye size={15} className="text-emerald-300" />
              <span>Leer Perfil en Pantalla</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadWordManual('informe-psicolaboral-sgc')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all cursor-pointer ring-2 ring-emerald-300"
              title="Descargar Informe Pericial Psicolaboral Completo en formato Microsoft Word nativo (.docx)"
            >
              <Download size={15} className="stroke-[3]" />
              <span>Descargar en Word (.DOCX)</span>
            </button>
          </div>
        </div>

        {/* TARJETA DESTACADA: TRABAJO FINAL DE MAGÍSTER (.DOCX) */}
        <div className="bg-gradient-to-r from-slate-900 via-[#0B3C5D] to-slate-900 border-2 border-emerald-500/80 rounded-2xl p-5 text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-400 text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider">
                NUEVO EN BIBLIOTECA • FORMATO WORD (.DOCX) NATIVO
              </span>
              <span className="text-[11px] font-mono text-emerald-300 font-bold">
                Magíster en IA Generativa, Derecho Digital y Blockchain
              </span>
            </div>
            <h3 className="text-base md:text-lg font-black tracking-tight text-white">
              Informe Final de Magíster: &ldquo;Arquitectura Empresarial Cognitiva, Compliance by Design y Trazabilidad Criptográfica&rdquo;
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed max-w-4xl">
              Redacción académica humanizada en 6 capítulos sobre el diseño e implementación de <strong>AssetFlow Enterprise (estándar Enterprise 9.11)</strong>: Orquestación Cognitiva con IA Generativa y protocolo <em>Developer Lock</em> (EU AI Act), Automatización Tributaria (IVA 19% y Retención de Boletas de Honorarios), Prevención de Delitos Económicos (Ley N° 21.595 / UAF / Ley N° 21.719) e Inmutabilidad Criptográfica SHA-256 en aprobaciones jerárquicas (P43081 / F4209).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenChainVerifier}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-2 transition-all cursor-pointer"
              title="Ejecutar verificador criptográfico SHA-256 en vivo con Web Crypto API (crypto.subtle)"
            >
              <Lock size={15} />
              <span>Verificar Integridad Cadena de Bloques (SHA-256)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMagisterThesisModalOpen(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Eye size={15} className="text-emerald-300" />
              <span>Leer Informe en Pantalla</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadWordManual('manual-word-exam-sim-1')}
              className="px-3.5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white border border-indigo-300/40 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Descargar Simulacro de Examen de Grado N° 1 (Nota: 9,3 / 10) en documento Word individual"
            >
              <Download size={14} />
              <span>Simulacro 1 (.DOC)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadWordManual('manual-word-exam-sim-2')}
              className="px-3.5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white border border-indigo-300/40 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Descargar Simulacro de Examen de Grado N° 2 (Nota: 9,8 / 10) en documento Word individual"
            >
              <Download size={14} />
              <span>Simulacro 2 (.DOC)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadWordManual('manual-word-exam-sim-3')}
              className="px-3.5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white border border-indigo-300/40 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Descargar Simulacro de Examen de Grado N° 3 (Nota: 9,6 / 10) en documento Word individual"
            >
              <Download size={14} />
              <span>Simulacro 3 (.DOC)</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                notify("Descargando Currículum Vitae Ejecutivo en formato Microsoft Word nativo (.docx)...", "info");
                await downloadCristianCvDocx();
                notify("✓ Currículum Vitae (.DOCX) descargado con éxito.", "success");
              }}
              className="px-4 py-2.5 bg-[#002D62] hover:bg-[#001D42] text-white border border-blue-900 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Descargar Currículum Vitae de Cristian Muñoz en Microsoft Word nativo (.docx)"
            >
              <FileText size={14} className="text-emerald-400" />
              <span>CV Ejecutivo (.DOCX)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadWordManual('magister-thesis-docx')}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download size={15} />
              <span>Descargar Informe (.DOCX)</span>
            </button>
          </div>
        </div>

        {/* TARJETA DESTACADA: MANUAL TÉCNICO DE DESPLIEGUE EN SERVIDORES EMPRESARIALES (WORD & PDF) */}
        <div className="bg-gradient-to-r from-[#002D62] via-[#0B3C5D] to-[#001D42] border-2 border-amber-400/90 rounded-2xl p-5 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                <ShieldCheck size={11} className="text-slate-950 stroke-[3]" />
                INFRAESTRUCTURA &amp; DEVOPS • SGC-IT-MAN-008
              </span>
              <span className="text-[11px] font-mono text-emerald-300 font-bold">
                Docker Compose • PM2 Cluster • Nginx Reverse Proxy &amp; SSL Let&apos;s Encrypt
              </span>
            </div>
            <h3 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>Manual Técnico de Instalación, Despliegue y Operación en Servidores Empresariales</span>
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed max-w-4xl">
              <strong>Guía Didáctica Paso a Paso para Personal Inexperto de TI:</strong> Diseñado específicamente para que cualquier administrador o técnico de infraestructura ponga el sistema a correr en servidores físicos o VPS propios sin complicaciones. Cubre pre-requisitos de hardware, comandos de terminal listos para copiar y pegar, despliegue en 1 solo comando con Docker Compose (<code>docker compose up -d --build</code>), método alternativo con Node 22 y PM2 (<code>deploy.sh</code> / <code>deploy-windows.bat</code>), Reverse Proxy Nginx con SSL gratuito, blindaje de firewall UFW y <strong>Cheat-Sheet de Troubleshooting</strong> (solución a puerto 3000 en uso, falta de memoria SWAP y 502 Bad Gateway).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                notify("Descargando instalador para tu computador personal Windows (instalar-en-mi-pc.bat)...", "info");
                downloadPersonalPcWindowsInstaller();
                notify("✓ Archivo 'instalar-en-mi-pc.bat' descargado. Haz doble clic en él para probar el sistema en tu PC.", "success");
              }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 transition-all cursor-pointer ring-2 ring-emerald-300"
              title="Descargar instalador de un solo clic para tu PC personal con Windows 10/11. Crea acceso directo en tu Escritorio y abre tu navegador automáticamente."
            >
              <Download size={14} className="stroke-[3]" />
              <span>Probar en mi PC Windows (.BAT)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                notify("Descargando instalador maestro para Windows Server (install-windows.bat)...", "info");
                downloadWindowsExecutableInstaller();
                notify("✓ Archivo ejecutable 'install-windows.bat' descargado. Ejecútelo como Administrador.", "success");
              }}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400/40 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Descargar archivo ejecutable por lotes para Windows Server (install-windows.bat) listo para ejecutar como Administrador"
            >
              <Download size={14} />
              <span>Windows Server (.BAT)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                notify("Descargando instalador maestro para servidores Linux (install.sh)...", "info");
                downloadLinuxExecutableInstaller();
                notify("✓ Script ejecutable 'install.sh' descargado. Ejecute 'sudo ./install.sh'.", "success");
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-300 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Descargar script ejecutable autónomo para Linux (install.sh)"
            >
              <Download size={14} />
              <span>Instalador Linux (.SH)</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                notify("Generando paquete comprimido con el Kit Completo de Instalación...", "info");
                await downloadFullInstallerKitZip();
                notify("✓ Kit de instalación (.ZIP) descargado exitosamente.", "success");
              }}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/40 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Descargar Kit Completo de Instalación en archivo comprimido .ZIP (incluye instaladores, Dockerfile, Nginx y manuales)"
            >
              <Archive size={14} />
              <span>Kit Completo (.ZIP)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsItManualModalOpen(true)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              title="Leer Manual Técnico de Despliegue en pantalla con índice interactivo"
            >
              <Eye size={15} className="text-amber-300" />
              <span>Manual</span>
            </button>
            <button
              type="button"
              onClick={downloadItDeploymentManualPdf}
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/40 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Descargar Manual Técnico IT en formato PDF Vectorial de Alta Resolución (6 páginas)"
            >
              <Download size={14} />
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={downloadItDeploymentManualWord}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-2 transition-all cursor-pointer"
              title="Descargar Manual Técnico IT en formato Microsoft Word (.docx / .doc) editable con tablas y cuadros de comandos"
            >
              <Download size={15} />
              <span>Word (.docx)</span>
            </button>
          </div>
        </div>

        {/* Filters and View Toggles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nombre, entidad o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Type Filters */}
            <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm overflow-x-auto">
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'TASACIÓN', label: 'Tasaciones' },
                { id: 'INGRESO', label: 'Ingresos' },
                { id: 'EGRESO', label: 'Egresos' },
                { id: 'OFICIO', label: 'Oficios' },
                { id: 'CONTRATO', label: 'Contratos' },
                { id: 'DOSSIER', label: 'Dossiers' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setFilterType(type.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterType === type.id ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Botón Personalizar Secuencia de Ordenamiento JDE */}
            <button
              type="button"
              onClick={() => setIsSortModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase font-mono tracking-wider transition-all cursor-pointer border ${
                isSorted
                  ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Personalizar Secuencia de Ordenamiento Multi-Columna (P986110S)"
            >
              <ArrowDownUp size={13} className={isSorted ? 'text-slate-950 stroke-[3]' : 'text-slate-600'} />
              <span>{isSorted ? `Orden JDE: ${primarySort?.direction === 'desc' ? 'Mayor a menor ▼' : 'Menor a mayor ▲'}` : 'Ordenar Grilla'}</span>
            </button>

            {/* AssetFlow Enterprise View Mode Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B3C5D]/10 text-[#0B3C5D] border border-[#0B3C5D]/20 rounded-xl text-xs font-black uppercase font-mono tracking-wider shrink-0">
              <Table size={14} className="text-[#0B3C5D]" />
              <span>Grid AssetFlow Enterprise</span>
            </div>
          </div>
        </div>

        {/* AssetFlow Enterprise Grid Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-[380px]">
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-md flex flex-col w-full">
              <div className="w-full overflow-x-auto custom-scrollbar">
                <table className="min-w-[1020px] w-full text-left border-collapse table-auto">
                  <thead>
                    {/* Primary ERP Headers con Ordenamiento Interactivo Enterprise */}
                    <tr className="bg-[#0B3C5D] text-white text-[10px] font-black uppercase tracking-wider divide-x divide-[#092e48]">
                      <th className="py-2.5 px-2 w-[36px] text-center select-none" title="Selector de Fila AssetFlow Enterprise (F4 / Menú Contextual)">
                        #
                      </th>
                      
                      {/* TIPO DOC */}
                      <th 
                        onClick={() => requestSort('type', { type: 'string', label: 'Tipo Doc' })}
                        className={`py-2.5 px-2.5 w-[95px] text-center cursor-pointer select-none transition-colors group ${
                          getSortState('type').isSorted ? 'bg-[#072B44] text-amber-300 font-black' : 'hover:bg-[#092e48]'
                        }`}
                        title={getSortState('type').tooltip}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Tipo Doc</span>
                          {getSortState('type').isSorted ? (
                            <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[8px] font-mono shadow-2xs">
                              {getSortState('type').direction === 'desc' ? '▼' : '▲'}
                            </span>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-60 text-slate-300 text-[8px] font-mono">⇅</span>
                          )}
                        </div>
                      </th>

                      {/* DESCRIPCIÓN */}
                      <th 
                        onClick={() => requestSort('name', { type: 'string', label: 'Descripción' })}
                        className={`py-2.5 px-3 min-w-[190px] cursor-pointer select-none transition-colors group ${
                          getSortState('name').isSorted ? 'bg-[#072B44] text-amber-300 font-black' : 'hover:bg-[#092e48]'
                        }`}
                        title={getSortState('name').tooltip}
                      >
                        <div className="flex items-center justify-between">
                          <span>Descripción / Nombre</span>
                          {getSortState('name').isSorted ? (
                            <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[8px] font-mono shadow-2xs ml-1">
                              {getSortState('name').direction === 'desc' ? '▼' : '▲'}
                            </span>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-60 text-slate-300 text-[8px] font-mono ml-1">⇅</span>
                          )}
                        </div>
                      </th>

                      {/* ENTIDAD */}
                      <th 
                        onClick={() => requestSort('entityName', { type: 'string', label: 'Entidad / Referencia' })}
                        className={`py-2.5 px-3 w-[160px] cursor-pointer select-none transition-colors group ${
                          getSortState('entityName').isSorted ? 'bg-[#072B44] text-amber-300 font-black' : 'hover:bg-[#092e48]'
                        }`}
                        title={getSortState('entityName').tooltip}
                      >
                        <div className="flex items-center justify-between">
                          <span>Entidad / Ref.</span>
                          {getSortState('entityName').isSorted ? (
                            <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[8px] font-mono shadow-2xs ml-1">
                              {getSortState('entityName').direction === 'desc' ? '▼' : '▲'}
                            </span>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-60 text-slate-300 text-[8px] font-mono ml-1">⇅</span>
                          )}
                        </div>
                      </th>

                      {/* FECHA CARGA */}
                      <th 
                        onClick={() => requestSort('date', { type: 'date', label: 'Fecha Carga' })}
                        className={`py-2.5 px-2 w-[90px] text-center cursor-pointer select-none transition-colors group ${
                          getSortState('date').isSorted ? 'bg-[#072B44] text-amber-300 font-black' : 'hover:bg-[#092e48]'
                        }`}
                        title={getSortState('date').tooltip}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Fecha Carga</span>
                          {getSortState('date').isSorted ? (
                            <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[8px] font-mono shadow-2xs">
                              {getSortState('date').direction === 'desc' ? '▼' : '▲'}
                            </span>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-60 text-slate-300 text-[8px] font-mono">⇅</span>
                          )}
                        </div>
                      </th>

                      {/* REGISTRADO POR */}
                      <th 
                        onClick={() => requestSort('user', { type: 'string', label: 'Registrado por' })}
                        className={`py-2.5 px-2.5 w-[110px] cursor-pointer select-none transition-colors group ${
                          getSortState('user').isSorted ? 'bg-[#072B44] text-amber-300 font-black' : 'hover:bg-[#092e48]'
                        }`}
                        title={getSortState('user').tooltip}
                      >
                        <div className="flex items-center justify-between">
                          <span>Usuario</span>
                          {getSortState('user').isSorted ? (
                            <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[8px] font-mono shadow-2xs ml-1">
                              {getSortState('user').direction === 'desc' ? '▼' : '▲'}
                            </span>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-60 text-slate-300 text-[8px] font-mono ml-1">⇅</span>
                          )}
                        </div>
                      </th>

                      {/* ÚLTIMA MODIFICACIÓN */}
                      <th 
                        onClick={() => requestSort('updatedAt', { type: 'date', label: 'Última Modif.' })}
                        className={`py-2.5 px-2 w-[95px] text-center cursor-pointer select-none transition-colors group ${
                          getSortState('updatedAt').isSorted ? 'bg-[#072B44] text-amber-300 font-black' : 'hover:bg-[#092e48]'
                        }`}
                        title={getSortState('updatedAt').tooltip}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Últ. Modif.</span>
                          {getSortState('updatedAt').isSorted ? (
                            <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[8px] font-mono shadow-2xs">
                              {getSortState('updatedAt').direction === 'desc' ? '▼' : '▲'}
                            </span>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-60 text-slate-300 text-[8px] font-mono">⇅</span>
                          )}
                        </div>
                      </th>

                      {/* MODIFICADO POR */}
                      <th 
                        onClick={() => requestSort('updatedBy', { type: 'string', label: 'Modificado por' })}
                        className={`py-2.5 px-2.5 w-[110px] cursor-pointer select-none transition-colors group ${
                          getSortState('updatedBy').isSorted ? 'bg-[#072B44] text-amber-300 font-black' : 'hover:bg-[#092e48]'
                        }`}
                        title={getSortState('updatedBy').tooltip}
                      >
                        <div className="flex items-center justify-between">
                          <span>Modif. por</span>
                          {getSortState('updatedBy').isSorted ? (
                            <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[8px] font-mono shadow-2xs ml-1">
                              {getSortState('updatedBy').direction === 'desc' ? '▼' : '▲'}
                            </span>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-60 text-slate-300 text-[8px] font-mono ml-1">⇅</span>
                          )}
                        </div>
                      </th>

                      <th className="py-2.5 px-2 w-[125px] text-center">Acciones</th>
                    </tr>
                    {/* AssetFlow Enterprise QBE (Query By Example) Filter Row */}
                    <tr className="bg-slate-100 border-b border-slate-200 divide-x divide-slate-200">
                      <td className="p-1 bg-slate-200/70 text-center font-mono text-[9px] font-black text-slate-500">
                        QBE
                      </td>
                      <td className="p-2">
                        <input 
                          type="text"
                          placeholder="Tipo..."
                          value={qbeType}
                          onChange={(e) => setQbeType(e.target.value)}
                          className="w-full bg-white border border-slate-250 rounded-lg px-2 py-1 text-[10px] font-mono font-bold uppercase text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text"
                          placeholder="Filtrar Documento..."
                          value={qbeName}
                          onChange={(e) => setQbeName(e.target.value)}
                          className="w-full bg-white border border-slate-250 rounded-lg px-2 py-1 text-[10px] font-mono font-bold uppercase text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text"
                          placeholder="Asociación..."
                          value={qbeEntity}
                          onChange={(e) => setQbeEntity(e.target.value)}
                          className="w-full bg-white border border-slate-250 rounded-lg px-2 py-1 text-[10px] font-mono font-bold uppercase text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text"
                          placeholder="Fecha..."
                          value={qbeDate}
                          onChange={(e) => setQbeDate(e.target.value)}
                          className="w-full bg-white border border-slate-250 rounded-lg px-2 py-1 text-[10px] font-mono font-bold uppercase text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500 text-center"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text"
                          placeholder="Usuario..."
                          value={qbeUser}
                          onChange={(e) => setQbeUser(e.target.value)}
                          className="w-full bg-white border border-slate-250 rounded-lg px-2 py-1 text-[10px] font-mono font-bold uppercase text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text"
                          placeholder="F. Modif..."
                          value={qbeUpdatedDate}
                          onChange={(e) => setQbeUpdatedDate(e.target.value)}
                          className="w-full bg-white border border-slate-250 rounded-lg px-2 py-1 text-[10px] font-mono font-bold uppercase text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500 text-center"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text"
                          placeholder="Modif. por..."
                          value={qbeUpdatedUser}
                          onChange={(e) => setQbeUpdatedUser(e.target.value)}
                          className="w-full bg-white border border-slate-250 rounded-lg px-2 py-1 text-[10px] font-mono font-bold uppercase text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2 bg-slate-50 text-center">
                        <button 
                          type="button"
                          onClick={() => {
                            setQbeType('');
                            setQbeName('');
                            setQbeEntity('');
                            setQbeDate('');
                            setQbeUser('');
                            setQbeUpdatedDate('');
                            setQbeUpdatedUser('');
                            setSearchTerm('');
                          }}
                          className="text-[9px] font-black uppercase text-rose-600 hover:text-slate-900 font-mono"
                          title="Limpiar todos los filtros"
                        >
                          Limpiar
                        </button>
                      </td>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px] font-semibold text-slate-750">
                    {displayVaultItems.map(item => {
                      const isSelected = gridContextMenu?.item.id === item.id;
                      return (
                      <tr 
                        key={item.id} 
                        onDoubleClick={() => handleDrillDown(item)}
                        onContextMenu={(e) => handleRowContextMenu(e, item)}
                        className={`transition-colors text-left cursor-pointer group ${
                          isSelected 
                            ? 'bg-cyan-100/90 text-cyan-950 font-bold border-l-4 border-l-[#00E5FF]' 
                            : 'hover:bg-indigo-50/40 even:bg-slate-50/50'
                        }`}
                        title="Clic derecho o clic en [#] para Menú Contextual AssetFlow Enterprise. Doble clic para Drill Down."
                      >
                        {/* SELECTOR DE FILA ERP [#] */}
                        <td className="py-2.5 px-2 text-center border-r border-slate-150 select-none bg-slate-50/70 group-hover:bg-indigo-100/60">
                          <button
                            type="button"
                            onClick={(e) => handleRowContextMenu(e, item)}
                            className="w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-black text-[#0B3C5D] hover:bg-[#0B3C5D] hover:text-white border border-slate-300 hover:border-[#0B3C5D] shadow-2xs transition-all mx-auto"
                            title="Abrir Menú Contextual AssetFlow Enterprise (F4 / Salidas de Fila)"
                          >
                            #
                          </button>
                        </td>

                        {/* TIPO */}
                        <td className="py-2.5 px-2 text-center border-r border-slate-150">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
                            item.type === 'TASACIÓN' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                            item.type === 'INGRESO' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            item.type === 'EGRESO' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                            item.type === 'OFICIO' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            item.type === 'CONTRATO' ? 'bg-yellow-100 text-amber-850 border border-yellow-250' :
                            item.type === 'DOSSIER' ? 'bg-teal-100 text-teal-800 border border-teal-250' :
                            'bg-slate-150 text-slate-700'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        
                        {/* NOMBRE */}
                        <td className="py-2.5 px-3 border-r border-slate-150 font-bold text-slate-900 uppercase">
                          {item.name}
                        </td>
                        
                        {/* ENTIDAD / REFERENCIA */}
                        <td className="py-2.5 px-3 border-r border-slate-150 text-slate-600 font-semibold uppercase truncate max-w-[160px]" title={item.entityName}>
                          {item.entityName}
                        </td>
                        
                        {/* FECHA CARGA */}
                        <td className="py-2.5 px-2 text-center border-r border-slate-150 font-mono text-slate-500 font-bold">
                          {new Date(item.date).toLocaleDateString('es-CL')}
                        </td>
                        
                        {/* REGISTRADO POR */}
                        <td className="py-2.5 px-2.5 border-r border-slate-150 text-slate-500 italic uppercase truncate max-w-[110px]" title={item.user}>
                          {item.user}
                        </td>
                        
                        {/* ÚLTIMA MODIFICACIÓN */}
                        <td className="py-2.5 px-2 text-center border-r border-slate-150 font-mono text-slate-600 font-semibold text-[10px]">
                          {item.updatedAt ? (
                            item.updatedAt.includes('T') || item.updatedAt.includes('-') ? (
                              new Date(item.updatedAt).toLocaleDateString('es-CL')
                            ) : item.updatedAt
                          ) : '-'}
                        </td>
                        
                        {/* MODIFICADO POR */}
                        <td className="py-2.5 px-2.5 border-r border-slate-150 text-slate-700 font-bold uppercase text-[10px] truncate max-w-[110px]" title={item.updatedBy}>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="truncate">{item.updatedBy || '-'}</span>
                          </div>
                        </td>
                        
                        {/* ACCIONES */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {item.id === 'informe-sercotec-semilla' ? (
                              <div className="flex items-center gap-1.5 justify-center">
                                <button
                                  type="button"
                                  onClick={() => setIsSercotecModalOpen(true)}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                  title="Leer Plan de Negocio y Postulación SERCOTEC en pantalla"
                                >
                                  <Eye size={12} className="text-amber-700" />
                                  <span>Leer</span>
                                </button>
                                <button 
                                  type="button"
                                  onClick={async () => {
                                    notify("Generando Formulario SERCOTEC Capital Semilla 2026 en formato Word nativo (.docx)...", "info");
                                    await downloadSercotecReportWord();
                                    notify("✓ Formulario SERCOTEC (.DOCX) descargado con éxito.", "success");
                                  }}
                                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white border border-amber-800 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Descargar Formulario SERCOTEC en formato Word (.docx)"
                                >
                                  <Download size={12} />
                                  <span>.DOCX</span>
                                </button>
                              </div>
                            ) : item.id === 'manual-it-deployment-server' ? (
                              <div className="flex items-center gap-1.5 justify-center">
                                <button
                                  type="button"
                                  onClick={() => setIsItManualModalOpen(true)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                  title="Leer Manual Técnico de Despliegue IT en pantalla"
                                >
                                  <Eye size={12} className="text-amber-600" />
                                  <span>Leer</span>
                                </button>
                                <button 
                                  type="button"
                                  onClick={downloadItDeploymentManualPdf}
                                  className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white border border-rose-900 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Descargar Manual Técnico IT en formato PDF de alta resolución"
                                >
                                  <Download size={12} />
                                  <span>.PDF</span>
                                </button>
                                <button 
                                  type="button"
                                  onClick={downloadItDeploymentManualWord}
                                  className="px-3 py-1 bg-[#002D62] hover:bg-[#001D42] text-white border border-blue-950 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Descargar Manual Técnico IT en formato Microsoft Word editable (.docx)"
                                >
                                  <Download size={12} className="text-emerald-400" />
                                  <span>.DOCX</span>
                                </button>
                              </div>
                            ) : item.id === 'informe-psicolaboral-sgc' ? (
                              <div className="flex items-center gap-1.5 justify-center">
                                <button
                                  type="button"
                                  onClick={() => setIsPsychologicalModalOpen(true)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                  title="Leer Informe Pericial Psicolaboral en pantalla"
                                >
                                  <Eye size={12} className="text-emerald-600" />
                                  <span>Leer</span>
                                </button>
                                <button 
                                  type="button"
                                  onClick={async () => {
                                    notify("Generando Informe Pericial Psicolaboral en formato Word nativo (.docx)...", "info");
                                    await downloadPsychologicalProfileWord();
                                    notify("✓ Informe Psicolaboral (.DOCX) descargado con éxito.", "success");
                                  }}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-800 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Descargar Informe Pericial Psicolaboral en formato Word nativo (.docx)"
                                >
                                  <Download size={12} />
                                  <span>.DOCX</span>
                                </button>
                              </div>
                            ) : item.id === 'magister-thesis-docx' ? (
                              <div className="flex items-center gap-1.5 justify-center">
                                <button
                                  type="button"
                                  onClick={() => setIsMagisterThesisModalOpen(true)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                  title="Leer Informe Final de Magíster en pantalla"
                                >
                                  <Eye size={12} className="text-indigo-600" />
                                  <span>Leer</span>
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDownloadWordManual('magister-thesis-docx')}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-800 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Descargar Informe de Magíster en formato Word nativo (.docx)"
                                >
                                  <Download size={12} />
                                  <span>.DOCX</span>
                                </button>
                              </div>
                            ) : item.id.startsWith('manual-word-') ? (
                              <div className="flex items-center gap-1.5 justify-center">
                                <button 
                                  type="button"
                                  onClick={() => handleDownloadWordManual(item.id)}
                                  className="px-3 py-1 bg-[#002D62] hover:bg-[#001D42] text-white border border-blue-950 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Descargar Manual del Sistema en Formato Word Editable (.docx)"
                                >
                                  <Download size={12} className="text-emerald-400" />
                                  <span>Descargar .DOCX</span>
                                </button>
                              </div>
                            ) : item.id === 'ciso-executive-report' ? (
                              <div className="flex items-center gap-1.5">
                                <button 
                                  type="button"
                                  onClick={() => handleDrillDown(item)}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white border border-amber-100 rounded-lg transition-all shadow-xs flex items-center justify-center shrink-0"
                                  title="Drill Down: Ir a Módulo de Origen"
                                >
                                  <ChevronRight size={13} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setActiveModule?.('CISO_REPORT')}
                                  className="px-3 py-1 bg-indigo-600 hover:bg-slate-900 border border-indigo-700 hover:border-slate-800 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-all shadow-xs"
                                >
                                  Reporte
                                </button>
                              </div>
                            ) : item.id === 'projects-area-report' ? (
                              <div className="flex items-center gap-1.5">
                                <button 
                                  type="button"
                                  onClick={() => handleDrillDown(item)}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white border border-amber-100 rounded-lg transition-all shadow-xs flex items-center justify-center shrink-0"
                                  title="Drill Down: Ir a Módulo de Origen"
                                >
                                  <ChevronRight size={13} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setActiveModule?.('PROJECTS_REPORT')}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-slate-900 border border-emerald-700 hover:border-slate-800 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-all shadow-xs"
                                >
                                  Propuesta
                                </button>
                              </div>
                            ) : (item.id === 'curriculum-executive-docx' || item.id === 'curriculum-executive-report') ? (
                              <div className="flex items-center gap-1.5">
                                <button 
                                  type="button"
                                  onClick={() => handleDrillDown(item)}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white border border-amber-100 rounded-lg transition-all shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
                                  title="Drill Down: Ir a Módulo de Currículum Vitae"
                                >
                                  <ChevronRight size={13} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={async () => {
                                    notify("Generando y descargando Currículum Vitae en formato Word nativo (.docx)...", "info");
                                    await downloadCristianCvDocx();
                                    notify("✓ Currículum Vitae (.DOCX) descargado con éxito.", "success");
                                  }}
                                  className="px-3 py-1 bg-[#002D62] hover:bg-[#001D42] border border-blue-950 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Descargar Currículum Vitae en formato Microsoft Word nativo (.docx)"
                                >
                                  <Download size={11} className="text-emerald-400" />
                                  <span>.DOCX</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDrillDown(item)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all shadow-xs"
                                  title="Drill Down"
                                >
                                  <ExternalLink size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPreviewItem(item)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all shadow-xs"
                                  title="Ver Documento"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDocumentSecurely(item.url, item.name)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all shadow-xs"
                                  title="Descargar"
                                >
                                  <Download size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Folder size={64} className="mb-4 opacity-20" />
              <p className="font-bold">No se encontraron documentos</p>
              <p className="text-xs">Intenta con otro término de búsqueda o filtro QBE</p>
            </div>
          )}
        </div>
      </div>

      {/* --- FORMULARIO Y MODAL DIGITAL DE ASOCIACIÓN --- */}
      {isAssociateModalOpen && (
        <div className="fixed inset-0 z-[600] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-350 max-h-[90vh]">
            <div className="bg-indigo-600 p-7 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Cloud size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">Vincular Soporte Digital</h3>
                  <p className="text-[9px] text-indigo-200 mt-0.5 uppercase font-medium">Asociación duradera de documentos físicos al Ledger ERP</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsAssociateModalOpen(false);
                  setSelectedRecordId('');
                  setUploadedFileBase64('');
                  setUploadedFileName('');
                  setCustomDocumentName('');
                }} 
                className="p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveAssociation} className="p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Módulo / Tipo de Registro de Destino</label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    { id: 'TASACIÓN', label: 'Tasación (Appraisals)', count: appraisals.length },
                    { id: 'INGRESO', label: 'Ledger: Ingreso', count: transactions.filter(t => t.type === 'INCOME').length },
                    { id: 'EGRESO', label: 'Ledger: Egreso', count: transactions.filter(t => t.type === 'EXPENSE').length },
                    { id: 'OFICIO', label: 'Oficio (Official Docs)', count: officialDocs.length },
                    { id: 'CONTRATO', label: 'Contrato de Arriendo', count: leaseContracts.length }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setAssocRecordType(type.id as any);
                        setSelectedRecordId('');
                      }}
                      className={`px-4 py-3.5 rounded-2xl text-[9.5px] font-black uppercase text-left border-2 transition-all shrink-0 flex flex-col justify-between h-18 ${
                        assocRecordType === type.id 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-750 font-extrabold shadow-sm' 
                          : 'bg-white border-slate-100 hover:border-slate-200 text-slate-500'
                      }`}
                    >
                      <span>{type.label}</span>
                      <span className="text-[8px] font-bold text-slate-400 block mt-1">{type.count} Registros</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Registro Específico a Asociar</label>
                <select
                  required
                  value={selectedRecordId}
                  onChange={e => setSelectedRecordId(e.target.value)}
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-[11px] font-bold outline-none focus:border-indigo-600 transition-all custom-scrollbar uppercase"
                >
                  <option value="" className="text-slate-400">--- SELECCIONE EL REGISTRO DE DESTINO ---</option>
                  {recordsToSelect.map(r => (
                    <option key={r.id} value={r.id} className="text-slate-800">
                      {r.label} {r.currentFile ? `[Tiene Backup: ${r.currentFile}]` : '[Sin Backup]'}
                    </option>
                  ))}
                </select>
                {recordsToSelect.length === 0 && (
                  <p className="text-[9px] text-amber-600 font-bold uppercase mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    No hay registros cargados para este tipo en la base de datos de ASSETFLOW.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">3. Carga de Copia Digitalizada</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-3xl p-6 bg-white hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center relative cursor-pointer group min-h-[110px]">
                  <input 
                    required={!uploadedFileBase64}
                    type="file" 
                    accept="application/pdf,image/*" 
                    onChange={handleFileChange} 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload size={28} className="text-slate-350 group-hover:text-indigo-600 mb-2 transition-colors" />
                  <p className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider group-hover:text-slate-700">Explorar o Arrastrar Archivo Soporte</p>
                  <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest mt-1">Formatos admitidos: PDF, JPG, PNG u otras imágenes</p>
                </div>
                {uploadedFileName && (
                  <div className="mt-2 flex items-center gap-3 bg-white border border-slate-150 p-3.5 rounded-2xl shadow-sm">
                    <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <Paperclip size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate uppercase">{uploadedFileName}</p>
                      <p className="text-[8.5px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Copia digitalizada leída
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setUploadedFileName('');
                        setUploadedFileBase64('');
                        setCustomDocumentName('');
                      }}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 text-rose-500 rounded-lg transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {uploadedFileName && (
                <div className="space-y-1 animate-in slide-in-from-top-3 duration-250">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">4. Nombre o Etiqueta Personalizada</label>
                  <input 
                    type="text"
                    required
                    value={customDocumentName}
                    onChange={e => setCustomDocumentName(e.target.value)}
                    placeholder="Ej: Informe de Tasación Centenario"
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold uppercase outline-none focus:border-indigo-600 transition-all"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-150 shrink-0">
                <button
                  type="submit"
                  disabled={isSavingAssoc || !uploadedFileBase64}
                  className="w-full py-4 bg-indigo-600 disabled:bg-indigo-300 hover:bg-indigo-700 text-white rounded-[20px] font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-indigo-150 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSavingAssoc ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Guardando Respaldo Digital en Cloud...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Vincular y Guardar Copia en Bóveda
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PRESTATARIO DE VISTA PREVIA DE DOCUMENTO --- */}
      {selectedPreviewItem && (
        <div className="fixed inset-0 z-[650] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-5xl h-[88vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-350">
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl text-white ${
                  selectedPreviewItem.type === 'TASACIÓN' ? 'bg-indigo-600' :
                  selectedPreviewItem.type === 'INGRESO' ? 'bg-emerald-600' :
                  selectedPreviewItem.type === 'EGRESO' ? 'bg-rose-600' :
                  selectedPreviewItem.type === 'OFICIO' ? 'bg-amber-600' :
                  selectedPreviewItem.type === 'DOSSIER' ? 'bg-teal-600' :
                  'bg-indigo-600'
                }`}>
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-white leading-none">
                    Visualizador de Documentos
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1.5 uppercase font-bold truncate max-w-lg">
                    {selectedPreviewItem.name}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedPreviewItem.id === 'informe-sercotec-semilla') {
                      downloadSercotecReportWord();
                    } else if (selectedPreviewItem.id === 'informe-psicolaboral-sgc') {
                      downloadPsychologicalProfileWord();
                    } else if (selectedPreviewItem.id === 'magister-thesis-docx') {
                      downloadMagisterThesisDocx();
                    } else if (selectedPreviewItem.id.startsWith('manual-word-')) {
                      handleDownloadWordManual(selectedPreviewItem.id);
                    } else {
                      openDocumentSecurely(selectedPreviewItem.url, selectedPreviewItem.name);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  title="Descargar para almacenamiento local"
                >
                  <Download size={14} /> Descargar Archivo
                </button>
                <button 
                  onClick={() => setSelectedPreviewItem(null)} 
                  className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Viewport */}
            <div className="flex-1 bg-slate-100 p-6 overflow-hidden flex flex-col gap-4">
              <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-inner overflow-auto flex flex-col justify-center items-center relative p-4">
                {(() => {
                  const isImage = selectedPreviewItem.url.startsWith('data:image/') || 
                                  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(selectedPreviewItem.name) ||
                                  /\.(jpg|jpeg|png|gif|webp|svg)/i.test(selectedPreviewItem.url);
                  const isPDF = selectedPreviewItem.url.startsWith('data:application/pdf') || 
                                /\.(pdf)$/i.test(selectedPreviewItem.name) ||
                                /\.(pdf)/i.test(selectedPreviewItem.url);

                  if (selectedPreviewItem.id === 'informe-sercotec-semilla') {
                    return (
                      <div className="text-center space-y-4 max-w-lg p-8 bg-amber-50/70 rounded-3xl border border-amber-200">
                        <div className="w-16 h-16 bg-amber-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-amber-700">
                          <Briefcase size={32} />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Plan de Negocio &amp; Postulación Capital Semilla SERCOTEC 2026 (.docx)</h4>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          Código SERCOTEC-SEM-2026-01. Formulación oficial para adjudicación de $3.500.000 CLP de subsidio no reembolsable + $175.000 CLP de aporte empresarial, orientado a la constitución de AssetFlow Technologies SpA, registro INAPI, mini-workstation y comercialización B2B.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPreviewItem(null);
                              setIsSercotecModalOpen(true);
                            }}
                            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                          >
                            <Eye size={14} className="text-amber-700" /> Leer en Pantalla
                          </button>
                          <button 
                            type="button"
                            onClick={async () => {
                              notify("Generando Plan de Negocio SERCOTEC en formato Word nativo (.docx)...", "info");
                              await downloadSercotecReportWord();
                              notify("✓ Formulario SERCOTEC (.DOCX) descargado con éxito.", "success");
                            }}
                            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white border border-amber-800 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-2 transition-all cursor-pointer"
                          >
                            <Download size={14} /> Descargar Word (.DOCX)
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (selectedPreviewItem.id === 'informe-psicolaboral-sgc') {
                    return (
                      <div className="text-center space-y-4 max-w-lg p-8 bg-emerald-50/50 rounded-3xl border border-emerald-200">
                        <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-emerald-700">
                          <UserCheck size={32} />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Informe Pericial Psicolaboral &amp; Competencias Directivas (.docx)</h4>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          Código SGC-RRHH-PSI-009. Evaluación basada en incidentes críticos (STAR), Big Five y juicio moral Kohlberg para Cristian Andrés Muñoz Rojas.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPreviewItem(null);
                              setIsPsychologicalModalOpen(true);
                            }}
                            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                          >
                            <Eye size={14} className="text-emerald-600" /> Leer en Pantalla
                          </button>
                          <button 
                            type="button"
                            onClick={async () => {
                              notify("Generando Informe Pericial Psicolaboral en formato Word nativo (.docx)...", "info");
                              await downloadPsychologicalProfileWord();
                              notify("✓ Informe Psicolaboral (.DOCX) descargado con éxito.", "success");
                            }}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-800 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-2 transition-all cursor-pointer"
                          >
                            <Download size={14} /> Descargar Word (.DOCX)
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (selectedPreviewItem.id.startsWith('manual-word-')) {
                    return (
                      <div className="text-center space-y-4 max-w-md p-8 bg-slate-50 rounded-3xl border border-slate-200">
                        <div className="w-16 h-16 bg-[#002D62] text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-blue-900">
                          <BookOpen size={32} />
                        </div>
                        <h4 className="text-sm font-black text-slate-850 uppercase tracking-tight">Manual del Sistema en Formato Word Editable (.docx)</h4>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {selectedPreviewItem.entityName}. Este documento incluye la estructura normativa, tablas de códigos ERP y recuadros prediseñados para pegar capturas de pantalla del sistema.
                        </p>
                        <button 
                          onClick={() => handleDownloadWordManual(selectedPreviewItem.id)}
                          className="px-6 py-3 bg-[#002D62] hover:bg-[#001D42] border border-blue-950 text-white rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                        >
                          <Download size={15} className="text-emerald-400" /> Descargar Manual Word (.docx)
                        </button>
                      </div>
                    );
                  }

                  if (isImage) {
                    return (
                      <div className="max-w-full max-h-full overflow-auto flex items-center justify-center p-4">
                        <img 
                          src={selectedPreviewItem.url} 
                          alt={selectedPreviewItem.name} 
                          className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-lg border border-slate-100" 
                        />
                      </div>
                    );
                  }

                  if (isPDF) {
                    const safeUrl = selectedPreviewItem.url.startsWith('data:') 
                      ? (function() {
                          try {
                            const parts = selectedPreviewItem.url.split(',');
                            if (parts.length < 2) return selectedPreviewItem.url;
                            let base64Data = parts[1];
                            
                            // Clean base64 characters robustly from whitespace, newlines, and URL encodings
                            base64Data = decodeURIComponent(base64Data).replace(/\s/g, '');
                            const padLength = (4 - (base64Data.length % 4)) % 4;
                            if (padLength > 0) {
                              base64Data += '='.repeat(padLength);
                            }

                            const binaryString = window.atob(base64Data);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                              bytes[i] = binaryString.charCodeAt(i);
                            }
                            const blob = new Blob([bytes], { type: 'application/pdf' });
                            return URL.createObjectURL(blob);
                          } catch (e) {
                            console.error("Fallo al decodificar PDF en Bóveda Digital, usando fallback directo:", e);
                            return selectedPreviewItem.url;
                          }
                        })()
                      : selectedPreviewItem.url;

                    return (
                      <div className="w-full h-full flex flex-col justify-between">
                        <iframe 
                          src={safeUrl} 
                          title={selectedPreviewItem.name} 
                          className="w-full h-full border-0 rounded-2xl bg-slate-50 shadow-inner" 
                        />
                        <div className="text-center p-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-t border-slate-100 rounded-b-2xl mt-1">
                          Nota: Si el visor PDF está bloqueado por su navegador o ve una pantalla en blanco, haga clic en "Descargar Archivo" en la esquina superior derecha.
                        </div>
                      </div>
                    );
                  }

                  // Fallback para otros formatos
                  return (
                    <div className="text-center space-y-4 max-w-md p-8">
                      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} />
                      </div>
                      <h4 className="text-sm font-black text-slate-850 uppercase tracking-tight">Formato no Previsualizable Incorporado</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Este archivo ({selectedPreviewItem.name}) requiere una aplicación externa o visor especializado.
                      </p>
                      <button 
                        onClick={() => openDocumentSecurely(selectedPreviewItem.url, selectedPreviewItem.name)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-slate-900 border border-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Download size={13} /> Descargar y Abrir Soporte
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Ficha técnica del documento */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs shrink-0 text-left">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Asociado a / Entidad</span>
                  <span className="font-extrabold text-slate-850 uppercase block truncate">{selectedPreviewItem.entityName}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Categoría Expediente</span>
                  <span className="font-extrabold text-[#c08207] bg-amber-50 px-2 py-0.5 rounded border border-amber-100 text-[10px] uppercase font-bold inline-block truncate mt-0.5">{selectedPreviewItem.type}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Fecha de Registro</span>
                  <span className="font-bold text-slate-600 block">{new Date(selectedPreviewItem.date).toLocaleDateString('es-CL')}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Registrado por</span>
                  <span className="font-bold text-slate-500 block italic truncate">Por {selectedPreviewItem.user}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Última Modificación</span>
                  <span className="font-bold text-indigo-700 font-mono block">
                    {selectedPreviewItem.updatedAt ? (
                      selectedPreviewItem.updatedAt.includes('T') || selectedPreviewItem.updatedAt.includes('-')
                        ? new Date(selectedPreviewItem.updatedAt).toLocaleDateString('es-CL')
                        : selectedPreviewItem.updatedAt
                    ) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Modificado por</span>
                  <span className="font-bold text-emerald-800 block truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    {selectedPreviewItem.updatedBy || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- MODAL MANUALES WORD (.DOCX) --- */}
      <SystemManualsWordModal 
        isOpen={isManualsWordModalOpen} 
        onClose={() => setIsManualsWordModalOpen(false)} 
      />

      {/* --- MODAL VERIFICADOR CRIPTOGRÁFICO DE CADENA DE BLOQUES SHA-256 (WEB CRYPTO API) --- */}
      {isChainVerifierOpen && chainReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#0B3C5D] w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
            <div className={`px-6 py-4 text-white flex flex-wrap items-center justify-between gap-4 border-b-4 ${
              chainReport.isChainIntact
                ? 'bg-[#0B3C5D] border-emerald-400'
                : 'bg-rose-950 border-rose-400'
            }`}>
              <div className="flex items-center gap-3">
                <Lock size={22} className="text-amber-300" />
                <div>
                  <div className="text-[10px] font-mono font-black uppercase text-emerald-300">
                    WEB CRYPTO API • window.crypto.subtle.digest(&apos;SHA-256&apos;) • TABLA F4209 (P43081)
                  </div>
                  <h2 className="text-base font-black uppercase tracking-wide">
                    Verificador en Vivo de Integridad de la Cadena de Bloques de Aprobaciones
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-mono font-bold text-emerald-300 uppercase">
                  <ShieldCheck size={12} /> Auditoría Append-Only Inmutable
                </span>
                <button
                  type="button"
                  onClick={handleOpenChainVerifier}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Recalcular SHA-256</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsChainVerifierOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-200 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 bg-slate-100 flex-1">
              <div className={`p-4 rounded-2xl border-2 text-white ${
                chainReport.isChainIntact ? 'bg-emerald-950 border-emerald-400' : 'bg-rose-950 border-rose-400'
              }`}>
                <div className="text-sm font-black uppercase">
                  {chainReport.isChainIntact
                    ? `✓ CADENA CRIPTOGRÁFICA 100% ÍNTEGRA (${chainReport.validBlocksCount}/${chainReport.totalBlocks} BLOQUES VERIFICADOS EN ${chainReport.executionTimeMs} MS)`
                    : `✗ ALERTA FORENSE: RUPTURA EN CASCADA DETECTADA (${chainReport.corruptedBlocksCount} BLOQUES INVÁLIDOS)`}
                </div>
                <div className="text-xs font-mono text-emerald-300 mt-1 break-all">
                  MERKLE ROOT SHA-256: {chainReport.merkleRootHash}
                </div>
              </div>

              <div className="space-y-3">
                {chainReport.blocks.map(b => (
                  <div
                    key={b.record.id}
                    className={`bg-white rounded-xl border-2 p-4 space-y-2 text-xs ${
                      b.isBlockValid ? 'border-emerald-500/70' : 'border-rose-600'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-mono mr-2">
                          BLOQUE #{b.blockIndex}
                        </span>
                        <span className="font-mono text-[#0B3C5D]">{b.record.orderFolio}</span> • ${b.record.orderAmount.toLocaleString('es-CL')} • Firmante: {b.record.releasedBy}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                        b.isBlockValid ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                      }`}>
                        {b.isBlockValid ? 'SHA-256 VERIFICADO' : 'HASH CORRUPTO / ESLABÓN ROTO'}
                      </span>
                    </div>
                    {!b.isBlockValid && (
                      <div className="text-rose-700 font-semibold text-[11px] bg-rose-50 p-2 rounded border border-rose-200">
                        {b.failureReasons.join(' | ')}
                      </div>
                    )}
                    <div className="font-mono text-[10px] bg-slate-900 text-emerald-300 p-2 rounded break-all">
                      Payload: {b.canonicalPayload}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[9.5px]">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 break-all">
                        <strong>Prev Hash:</strong> {b.storedPreviousHash}
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 break-all">
                        <strong>Payload SHA-256:</strong> {b.computedPayloadHash}
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 break-all">
                        <strong>Block SHA-256:</strong> {b.computedBlockHash}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL LECTOR ACADÉMICO: INFORME TRABAJO FINAL DE MAGÍSTER --- */}
      {isMagisterThesisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-[#0B3C5D] text-white px-6 py-5 border-b-4 border-emerald-500 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono text-[10px] font-black uppercase">
                    TRABAJO FINAL PARA OPTAR AL GRADO DE MAGÍSTER
                  </span>
                  <span className="text-xs font-mono text-emerald-300">
                    IA Generativa • Derecho Digital • Blockchain
                  </span>
                </div>
                <h2 className="text-lg font-black tracking-tight text-white mt-1">
                  {MAGISTER_THESIS_CONTENT.title}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDownloadWordManual('magister-thesis-docx')}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Download size={15} />
                  <span>Descargar .DOCX</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMagisterThesisModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Academic Document Body */}
            <div className="p-6 md:p-10 overflow-y-auto bg-slate-100 flex-1">
              <div className="max-w-4xl mx-auto bg-white shadow-xl border border-slate-200 rounded-2xl p-8 md:p-14 space-y-8 text-slate-800 font-serif">
                {/* Portada */}
                <div className="text-center border-b-2 border-slate-200 pb-8 space-y-3">
                  <div className="text-xs font-sans font-black uppercase tracking-widest text-emerald-700">
                    {MAGISTER_THESIS_CONTENT.program}
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold text-slate-950 leading-snug">
                    {MAGISTER_THESIS_CONTENT.title}
                  </h1>
                  <p className="text-sm italic text-slate-600 max-w-3xl mx-auto">
                    {MAGISTER_THESIS_CONTENT.subtitle}
                  </p>
                  <div className="pt-4 text-xs font-sans text-slate-700 space-y-1">
                    <div><strong>Autor:</strong> {MAGISTER_THESIS_CONTENT.author}</div>
                    <div><strong>Fecha:</strong> {MAGISTER_THESIS_CONTENT.date}</div>
                  </div>
                </div>

                {/* Resumen Ejecutivo */}
                <div className="space-y-3 bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-sans font-black uppercase tracking-wider text-slate-900">
                    Resumen Ejecutivo (Abstract)
                  </h3>
                  {MAGISTER_THESIS_CONTENT.abstractEs.map((p, idx) => (
                    <p key={idx} className="text-sm leading-relaxed text-justify text-slate-700">
                      {p}
                    </p>
                  ))}
                  <div className="pt-2 text-xs font-sans font-bold text-emerald-800">
                    Palabras Clave: {MAGISTER_THESIS_CONTENT.keywordsEs.join(' • ')}
                  </div>
                </div>

                {/* Índice General de Contenidos (TFM) */}
                <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <div className="text-[10px] font-sans font-black uppercase tracking-widest text-emerald-700">
                        Tabla de Materias y Cuadros Técnicos
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        Índice General de Contenidos del Trabajo de Máster
                      </h3>
                    </div>
                    <span className="text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                      6 Capítulos • 14 Subsecciones
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs font-sans">
                    <div className="py-2.5 flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-900">RESUMEN EJECUTIVO (ABSTRACT) &amp; PALABRAS CLAVE</span>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Justificación operativa en Mutucar, subsanación de 4 observaciones de auditoría y levantamiento de suspensión ante la CMF.
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                        Preliminar
                      </span>
                    </div>

                    <div className="py-2.5 flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-900">EXECUTIVE SUMMARY (ENGLISH) &amp; KEYWORDS</span>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Enterprise architecture, JDE 9.11 compliance by design, GenAI governance &amp; cryptographically sealed audit trail.
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Abstract EN
                      </span>
                    </div>

                    {MAGISTER_THESIS_CONTENT.sections.map((sec) => (
                      <div key={`toc-${sec.id}`} className="py-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <a href={`#${sec.id}`} className="font-bold text-slate-900 hover:text-emerald-700 transition-colors">
                            {sec.number}: {sec.title}
                          </a>
                          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {sec.id === 'cap-1' ? 'ROI 6.312%' :
                             sec.id === 'cap-2' ? 'IA & Developer Lock' :
                             sec.id === 'cap-3' ? 'Derecho Digital & CMF' :
                             sec.id === 'cap-4' ? 'Blockchain & SHA-256' :
                             sec.id === 'cap-5' ? 'JDE 9.11 On-Premise' : 'Conclusiones'}
                          </span>
                        </div>
                        {sec.subtitle && (
                          <div className="text-slate-500 text-[11px] italic">
                            {sec.subtitle}
                          </div>
                        )}
                        {sec.subsections && sec.subsections.length > 0 && (
                          <div className="pl-3 border-l-2 border-emerald-100 space-y-1 pt-1">
                            {sec.subsections.map((sub) => (
                              <div key={`toc-sub-${sub.number}`} className="flex items-center justify-between text-[11px] text-slate-600">
                                <span><strong className="text-slate-700">{sub.number}</strong> {sub.title}</span>
                                {sub.table && (
                                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    [Cuadro Estadístico]
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="py-2.5 flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-900">BIBLIOGRAFÍA Y FUENTES NORMATIVAS OFICIALES</span>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Compendio de Leyes Chilenas (21.595, 21.521, 19.628, 19.880), Circulares CMF, FATF y literatura especializada.
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                        11 Fuentes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Capítulos */}
                {MAGISTER_THESIS_CONTENT.sections.map((sec) => (
                  <div key={sec.id} id={sec.id} className="space-y-4 pt-4 border-t border-slate-200">
                    <div>
                      <div className="text-xs font-sans font-black uppercase tracking-widest text-emerald-700">
                        {sec.number}
                      </div>
                      <h2 className="text-lg font-bold text-slate-950 mt-0.5">
                        {sec.title}
                      </h2>
                      {sec.subtitle && (
                        <div className="text-xs italic text-slate-600 mt-0.5">
                          {sec.subtitle}
                        </div>
                      )}
                    </div>

                    {sec.paragraphs.map((p, idx) => (
                      <p key={idx} className="text-sm leading-relaxed text-justify text-slate-800">
                        {p}
                      </p>
                    ))}

                    {sec.subsections?.map((sub) => (
                      <div key={sub.number} className="space-y-3 pl-2 md:pl-4 border-l-2 border-slate-200 mt-4">
                        <h3 className="text-sm font-bold text-slate-900">
                          {sub.number} {sub.title}
                        </h3>
                        {sub.paragraphs.map((sp, sIdx) => (
                          <p key={sIdx} className="text-sm leading-relaxed text-justify text-slate-800">
                            {sp}
                          </p>
                        ))}
                        {sub.callout && (
                          <div className="bg-emerald-50/70 border-l-4 border-emerald-600 p-4 rounded-r-xl text-xs text-slate-800 space-y-1 font-sans">
                            <div className="font-black uppercase text-emerald-900">{sub.callout.title}</div>
                            <p className="italic">{sub.callout.text}</p>
                          </div>
                        )}
                        {sub.table && (
                          <div className="overflow-x-auto my-4 font-sans">
                            {sub.table.caption && (
                              <div className="text-xs font-bold text-slate-700 mb-1.5 italic">
                                {sub.table.caption}
                              </div>
                            )}
                            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                              <thead>
                                <tr className="bg-slate-900 text-white">
                                  {sub.table.headers.map((h, hIdx) => (
                                    <th key={hIdx} className="p-2.5 border border-slate-700 font-bold">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sub.table.rows.map((r, rIdx) => (
                                  <tr key={rIdx} className="even:bg-slate-50">
                                    {r.map((cell, cIdx) => (
                                      <td key={cIdx} className={`p-2.5 border border-slate-200 ${cIdx === 0 ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Bibliografía */}
                <div className="space-y-3 pt-6 border-t-2 border-slate-200">
                  <h2 className="text-base font-sans font-black uppercase tracking-wider text-slate-950">
                    Referencias Bibliográficas y Marco Normativo
                  </h2>
                  <ul className="space-y-2 text-xs text-slate-700 list-disc pl-5">
                    {MAGISTER_THESIS_CONTENT.bibliography.map((ref, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {ref}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL LECTOR PERICIAL: INFORME PSICOLABORAL (SGC-RRHH-PSI-009) --- */}
      {isPsychologicalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden my-auto flex flex-col h-[94vh] max-h-[940px]">
            {/* Header del Lector */}
            <div className="bg-[#002D62] text-white px-6 py-4 border-b-4 border-emerald-500 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/20 text-emerald-400">
                  <UserCheck size={28} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase font-mono tracking-widest bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-md">
                      SGC-RRHH-PSI-009 • PERITAJE PSICOLABORAL
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300">
                      Evaluación de Competencias, Juicio Ético y Liderazgo de Alta Dirección
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-amber-300">
                      IDÓNEO SIN RESERVAS (10 / 10)
                    </span>
                  </div>
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                    Informe Pericial Psicolaboral &amp; Competencias de Cristian Muñoz Rojas
                  </h2>
                  <p className="text-xs text-slate-200 font-medium">
                    Diagnóstico de Estructura Cognitiva, Integridad Fiduciaria (Moral Courage) y Resiliencia en Crisis Regulatorias
                  </p>
                </div>
              </div>

              {/* Botones de Acción en Header */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={downloadPsychologicalProfileWord}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer ring-1 ring-emerald-300"
                  title="Descargar Informe Completo en formato Microsoft Word nativo (.docx)"
                >
                  <Download size={14} className="stroke-[3]" />
                  <span>Descargar Word (.DOCX)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/20"
                  title="Imprimir o guardar como PDF desde el navegador"
                >
                  <Printer size={14} />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPsychologicalModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Cerrar Lector"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Sub-Header con Selector de Pestañas */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActivePsychologicalTab('INFORME')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activePsychologicalTab === 'INFORME'
                      ? 'bg-[#002D62] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  1. Informe Pericial Completo
                </button>
                <button
                  type="button"
                  onClick={() => setActivePsychologicalTab('MATRIZ')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activePsychologicalTab === 'MATRIZ'
                      ? 'bg-[#002D62] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  2. Matriz Cuantitativa (8 Competencias)
                </button>
                <button
                  type="button"
                  onClick={() => setActivePsychologicalTab('ROLES')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activePsychologicalTab === 'ROLES'
                      ? 'bg-[#002D62] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  3. Ajuste a Cargos Directivos
                </button>
                <button
                  type="button"
                  onClick={() => setActivePsychologicalTab('STAR')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activePsychologicalTab === 'STAR'
                      ? 'bg-[#002D62] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  4. Casos STAR en Terreno
                </button>
              </div>

              <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
                Evaluador: Depto. Psicología Organizacional &amp; Selección Ejecutiva
              </div>
            </div>

            {/* Contenido Dinámico de la Pestaña Activa */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
              {activePsychologicalTab === 'INFORME' && (
                <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 space-y-6">
                  {/* Vista HTML Oficial idéntica a la que se exporta a Word */}
                  <div dangerouslySetInnerHTML={{ __html: getPsychologicalProfileHtmlContent() }} />
                </div>
              )}

              {activePsychologicalTab === 'MATRIZ' && (
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-base font-black uppercase text-slate-900 mb-1">
                      Evaluación Cuantitativa de Competencias Ejecutivas
                    </h3>
                    <p className="text-xs text-slate-600 mb-6">
                      Medición basada en evidencias empíricas de desempeño durante el liderazgo del proyecto y gestión de crisis.
                    </p>

                    <div className="space-y-4">
                      {PSYCHOLOGICAL_COMPETENCY_MATRIX.map((c, i) => (
                        <div key={i} className="p-4 rounded-xl border border-slate-150 bg-slate-50/60 hover:bg-white hover:border-emerald-300 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{c.competency}</span>
                              <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                                {c.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                                {c.level}
                              </span>
                              <span className="text-sm font-black text-[#002D62] font-mono">
                                {c.score}%
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-[#002D62] rounded-full transition-all duration-500"
                              style={{ width: `${c.score}%` }}
                            />
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {c.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePsychologicalTab === 'ROLES' && (
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-base font-black uppercase text-slate-900">
                        Índice de Idoneidad y Ajuste a Cargos de Alta Dirección
                      </h3>
                      <p className="text-xs text-slate-600">
                        Determinación del calce perfil-puesto considerando la estructura cognitiva, habilidades interpersonales y solvencia ética.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl border-2 border-emerald-400 bg-emerald-50/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-emerald-800">
                            Control Interno / Auditoría
                          </span>
                          <span className="text-xs font-black font-mono bg-emerald-600 text-white px-2 py-0.5 rounded">
                            100% Ajuste Óptimo
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900">
                          Jefe / Gerente Corporativo de Control Interno
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Perfil ideal: combina el rigor de la ingeniería de procesos con la mirada legal probatoria. Incorruptible ante presiones y experto en armar matrices de riesgo sin asfixiar la operación.
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl border-2 border-indigo-300 bg-indigo-50/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-indigo-800">
                            Contraloría Financiera
                          </span>
                          <span className="text-xs font-black font-mono bg-indigo-600 text-white px-2 py-0.5 rounded">
                            98% Sobresaliente
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900">
                          Contralor Corporativo (Corporate Controller)
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Dominio de la conciliación bancaria al centavo, libro mayor F0911, control de devengos tributarios (IVA 19%, retenciones de honorarios) y fiscalización de presupuestos CAPEX/OPEX.
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl border-2 border-blue-300 bg-blue-50/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-blue-800">
                            Operaciones Patrimoniales
                          </span>
                          <span className="text-xs font-black font-mono bg-blue-700 text-white px-2 py-0.5 rounded">
                            96% Sobresaliente
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900">
                          Gerente de Operaciones &amp; Gestión Patrimonial
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Capacidad para liderar carteras masivas de inmuebles y contratos de proveedores, alineando las mantenciones (OT) con la recaudación oportuna y reduciendo la vacancia.
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-amber-800">
                            Riesgos &amp; Compliance
                          </span>
                          <span className="text-xs font-black font-mono bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                            97% Sobresaliente
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900">
                          Chief Compliance Officer (CCO)
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Especialista en prevención de delitos económicos (Ley N° 21.595), prevención de lavado de activos (UAF) y gobernanza de protección de datos (Ley N° 21.719).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePsychologicalTab === 'STAR' && (
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-base font-black uppercase text-slate-900">
                        Análisis de Incidentes Críticos en Terreno (Metodología STAR)
                      </h3>
                      <p className="text-xs text-slate-600">
                        Exploración pericial de situaciones reales enfrentadas por Cristian Muñoz, detallando la Situación, Tarea, Acción y Resultado obtenido.
                      </p>
                    </div>

                    {/* Caso 1 */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded">
                          Incidente STAR N° 1 • Probidad &amp; Valentía Moral
                        </span>
                        <span className="text-xs font-bold text-slate-500 font-mono">Detección de Proveedor Sospechoso</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Freno a Cotización Irregular de $20M CLP y Exigencia de Due Diligence
                      </h4>
                      <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                        <p><strong>Situación:</strong> Tras cotizar la mantención de una propiedad estratégica con tres empresas (todas alrededor de 22 millones), una jefatura solicitó recotizar y sorpresivamente presentó a una cuarta empresa con oferta de 20 millones sin historial previo verificable.</p>
                        <p><strong>Tarea:</strong> Evitar la contratación a ciegas y proteger a la empresa frente a eventuales delitos económicos o conflictos de interés.</p>
                        <p><strong>Acción:</strong> En su rol de control interno, Cristian no se dejó amedrentar por la jerarquía. Exigió formalmente un proceso exhaustivo de <em>Due Diligence</em> sobre el proveedor y dejó trazabilidad completa e inalterable en el sistema.</p>
                        <p><strong>Resultado:</strong> Blindaje de la responsabilidad civil y penal de los directores, estableciendo un estándar preventivo permanente.</p>
                      </div>
                    </div>

                    {/* Caso 2 */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded">
                          Incidente STAR N° 2 • Resiliencia &amp; Temple en Crisis
                        </span>
                        <span className="text-xs font-bold text-slate-500 font-mono">Fiscalización CMF en Mutucar</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Subsanación de 4 Observaciones Críticas de Auditoría y Levantamiento de Suspensión
                      </h4>
                      <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                        <p><strong>Situación:</strong> El ente regulador (CMF) formuló 4 observaciones graves al Departamento Inmobiliario y aplicó una suspensión preventiva debido a la dispersión de información y debilidades de control.</p>
                        <p><strong>Tarea:</strong> Reestructurar el catastro, conciliar cada cobro de arriendo contra su contrato e informe de tasación y levantar la suspensión.</p>
                        <p><strong>Acción:</strong> Diseñó e implementó la plataforma AssetFlow, centralizando las 1.849 propiedades, automatizando el cruce de recaudación y generando los reportes normados B.4 y B.13 con cuadratura al peso.</p>
                        <p><strong>Resultado:</strong> Subsanación total de las 4 observaciones, levantamiento formal de la suspensión y felicitaciones por el estándar de trazabilidad alcanzado.</p>
                      </div>
                    </div>

                    {/* Caso 3 */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded">
                          Incidente STAR N° 3 • Gestión del Cambio &amp; Empatía
                        </span>
                        <span className="text-xs font-bold text-slate-500 font-mono">Protocolo Sombra &amp; Empoderamiento</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Adopción de Usuarios Resistentes con más de 15 Años en Excel
                      </h4>
                      <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                        <p><strong>Situación:</strong> Los ejecutivos y jefes de mantención manifestaban rechazo al nuevo sistema ERP por temor a la complejidad y apego a sus planillas personales.</p>
                        <p><strong>Tarea:</strong> Lograr la adopción voluntaria y erradicar las planillas paralelas sin recurrir a sanciones administrativas.</p>
                        <p><strong>Acción:</strong> Aplicó el <em>Protocolo Sombra</em> (acompañó a los usuarios en terreno aprendiendo su rutina y corrigiendo fallas del software en vivo) y el <em>Protocolo de Empoderamiento</em> (mostró a cada persona el valor estratégico de su trabajo).</p>
                        <p><strong>Resultado:</strong> Adopción al 100%, clima laboral fortalecido y eliminación de la información oculta en carpetas personales.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-600 font-mono">
                Documento Oficial SGC-RRHH-PSI-009 • Bóveda Digital F980011D
              </div>
              <button
                type="button"
                onClick={() => setIsPsychologicalModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar Lector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL LECTOR OFICIAL: MANUAL TÉCNICO DE DESPLIEGUE EN SERVIDORES EMPRESARIALES (SGC-IT-MAN-008) --- */}
      {isItManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden my-auto flex flex-col h-[92vh] max-h-[920px]">
            {/* Header del Lector */}
            <div className="bg-[#002D62] text-white px-6 py-4 border-b-4 border-amber-400 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/20 text-amber-300">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase font-mono tracking-widest bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                      SGC-IT-MAN-008 • GUÍA DIDÁCTICA IT
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300">
                      Docker Alpine • Node 22 PM2 • Nginx SSL • Firewall UFW
                    </span>
                  </div>
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                    Manual Técnico de Despliegue en Servidores Empresariales
                  </h2>
                  <p className="text-xs text-slate-200 font-medium">
                    Procedimiento paso a paso para personal inexperto: puesta en marcha de AssetFlow ERP en servidores propios.
                  </p>
                </div>
              </div>

              {/* Botones de Acción en Header */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={downloadItDeploymentManualPdf}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Descargar Manual Técnico Completo en formato PDF Vectorial"
                >
                  <Download size={14} />
                  <span>PDF Vectorial</span>
                </button>
                <button
                  type="button"
                  onClick={downloadItDeploymentManualWord}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Descargar Manual Técnico en formato Microsoft Word Editable (.docx)"
                >
                  <Download size={14} />
                  <span>Word (.docx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsItManualModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Cerrar Lector"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Cuerpo del Lector (Sidebar de Capítulos + Vista de Contenido) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50 min-h-0">
              {/* Sidebar con los 8 capítulos */}
              <div className="w-full md:w-80 bg-white border-r border-slate-200 overflow-y-auto p-4 shrink-0 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 mb-2">
                  Índice de Capítulos (8 Secciones)
                </div>
                {IT_MANUAL_SECTIONS.map((sec, idx) => {
                  const isActive = activeItTab === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setActiveItTab(sec.id)}
                      className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex flex-col gap-1 border ${
                        isActive
                          ? 'bg-[#002D62] text-white border-blue-900 shadow-md'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded ${
                          isActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-150 text-slate-600'
                        }`}>
                          {sec.number}
                        </span>
                        <span className={`text-[10px] font-mono ${isActive ? 'text-emerald-300' : 'text-slate-400'}`}>
                          0{idx + 1} / 08
                        </span>
                      </div>
                      <div className={`text-xs font-bold leading-snug ${isActive ? 'text-white' : 'text-slate-900'}`}>
                        {sec.title}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Panel de Contenido del Capítulo Activo */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
                {(() => {
                  const currentSection = IT_MANUAL_SECTIONS.find(s => s.id === activeItTab) || IT_MANUAL_SECTIONS[0];
                  const currentIndex = IT_MANUAL_SECTIONS.findIndex(s => s.id === activeItTab);
                  return (
                    <div className="max-w-4xl mx-auto space-y-6">
                      {/* Cabecera del Capítulo */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-mono text-[10px] font-black uppercase">
                            {currentSection.number}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            Manual Técnico SGC-IT-MAN-008
                          </span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-950 uppercase tracking-tight">
                          {currentSection.title}
                        </h1>
                        <p className="text-xs md:text-sm text-slate-600 mt-2 font-medium">
                          {currentSection.summary}
                        </p>
                      </div>

                      {/* Render del Contenido HTML con Estilos Personalizados */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm text-slate-800 text-sm leading-relaxed space-y-4 it-manual-rendered-body">
                        <style>{`
                          .it-manual-rendered-body h3 {
                            font-size: 15px;
                            font-weight: 800;
                            color: #002D62;
                            margin-top: 24px;
                            margin-bottom: 8px;
                            text-transform: uppercase;
                            border-bottom: 1.5px solid #e2e8f0;
                            padding-bottom: 4px;
                          }
                          .it-manual-rendered-body p {
                            margin-bottom: 12px;
                            line-height: 1.6;
                            color: #1e293b;
                          }
                          .it-manual-rendered-body ul, .it-manual-rendered-body ol {
                            margin-left: 20px;
                            margin-bottom: 14px;
                          }
                          .it-manual-rendered-body li {
                            margin-bottom: 6px;
                          }
                          .it-manual-rendered-body .code-block {
                            background-color: #0f172a;
                            color: #38bdf8;
                            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                            font-size: 11.5px;
                            line-height: 1.5;
                            padding: 14px 18px;
                            border-radius: 12px;
                            overflow-x: auto;
                            margin: 14px 0;
                            border: 1px solid #1e293b;
                            white-space: pre-wrap;
                          }
                          .it-manual-rendered-body .iso-callout-box {
                            background-color: #f0fdf4;
                            border-left: 4px solid #16a34a;
                            padding: 14px 18px;
                            border-radius: 0 12px 12px 0;
                            font-size: 12.5px;
                            color: #14532d;
                            margin: 16px 0;
                          }
                          .it-manual-rendered-body table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 16px 0;
                            font-size: 12px;
                          }
                          .it-manual-rendered-body th {
                            background-color: #002D62;
                            color: white;
                            padding: 10px 12px;
                            text-align: left;
                            font-weight: 700;
                            font-size: 11px;
                            text-transform: uppercase;
                          }
                          .it-manual-rendered-body td {
                            padding: 9px 12px;
                            border-bottom: 1px solid #e2e8f0;
                          }
                          .it-manual-rendered-body tr:nth-child(even) td {
                            background-color: #f8fafc;
                          }
                          .it-manual-rendered-body code {
                            background-color: #e2e8f0;
                            color: #0f172a;
                            padding: 2px 5px;
                            border-radius: 4px;
                            font-family: monospace;
                            font-size: 11px;
                            font-weight: 700;
                          }
                        `}</style>
                        <div dangerouslySetInnerHTML={{ __html: currentSection.contentHtml }} />
                      </div>

                      {/* Barra de Navegación entre Capítulos */}
                      <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
                        {currentIndex > 0 ? (
                          <button
                            type="button"
                            onClick={() => setActiveItTab(IT_MANUAL_SECTIONS[currentIndex - 1].id)}
                            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                          >
                            <span>← {IT_MANUAL_SECTIONS[currentIndex - 1].number}</span>
                          </button>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={downloadItDeploymentManualPdf}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Download size={13} />
                            <span>Descargar PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={downloadItDeploymentManualWord}
                            className="px-3.5 py-2 bg-[#002D62] hover:bg-[#001D42] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Download size={13} className="text-emerald-400" />
                            <span>Descargar Word</span>
                          </button>
                        </div>

                        {currentIndex < IT_MANUAL_SECTIONS.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setActiveItTab(IT_MANUAL_SECTIONS[currentIndex + 1].id)}
                            className="px-4 py-2.5 bg-[#002D62] hover:bg-[#001D42] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                          >
                            <span>{IT_MANUAL_SECTIONS[currentIndex + 1].number} →</span>
                          </button>
                        ) : (
                          <div />
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>AssetFlow Enterprise ERP • Manual Técnico SGC-IT-MAN-008 • Listo para Producción</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-slate-500">Autor: samaheim@gmail.com</span>
                <button
                  type="button"
                  onClick={() => setIsItManualModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL LECTOR OFICIAL: POSTULACIÓN CAPITAL SEMILLA SERCOTEC 2026 --- */}
      {isSercotecModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden my-auto flex flex-col h-[94vh] max-h-[940px]">
            {/* Header del Lector */}
            <div className="bg-[#002D62] text-white px-6 py-4 border-b-4 border-amber-400 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/20 text-amber-400">
                  <Briefcase size={28} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase font-mono tracking-widest bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                      SERCOTEC-SEM-2026-01 • CAPITAL SEMILLA EMPRENDE
                    </span>
                    <span className="text-[10px] font-mono text-amber-300">
                      Constitución y Comercialización de AssetFlow Technologies SpA
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-emerald-300">
                      SUBSIDIO: $3.500.000 CLP + $175.000 CLP COFINANCIAMIENTO
                    </span>
                  </div>
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                    Plan de Negocio y Postulación Oficial SERCOTEC 2026
                  </h2>
                  <p className="text-xs text-slate-200 font-medium">
                    Constitución en &ldquo;Tu Empresa en un Día&rdquo;, Habilitación SII 1ª Cat, Registro INAPI, Mini-Workstation Forense y Escalamiento B2B
                  </p>
                </div>
              </div>

              {/* Botones de Acción en Header */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    notify("Generando Plan de Negocio SERCOTEC en formato Word nativo (.docx)...", "info");
                    await downloadSercotecReportWord();
                    notify("✓ Formulario SERCOTEC (.DOCX) descargado con éxito.", "success");
                  }}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer ring-1 ring-amber-300"
                  title="Descargar Formulario Completo en formato Microsoft Word nativo (.docx)"
                >
                  <Download size={14} className="stroke-[3]" />
                  <span>Descargar Word (.DOCX)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/20"
                  title="Imprimir o guardar como PDF desde el navegador"
                >
                  <Printer size={14} />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSercotecModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Cerrar Lector"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Sub-Header con Selector de Pestañas */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center justify-between gap-4 shrink-0 overflow-x-auto">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveSercotecTab('PITCH')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeSercotecTab === 'PITCH'
                      ? 'bg-[#002D62] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <Target size={14} />
                  <span>1. Pitch 3 Minutos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSercotecTab('CANVAS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeSercotecTab === 'CANVAS'
                      ? 'bg-[#002D62] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span>2. Canvas 9 Bloques</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSercotecTab('PRESUPUESTO')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeSercotecTab === 'PRESUPUESTO'
                      ? 'bg-[#002D62] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <Coins size={14} />
                  <span>3. Presupuesto $3.5M</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSercotecTab('PROYECCIONES')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeSercotecTab === 'PROYECCIONES'
                      ? 'bg-[#002D62] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <TrendingUp size={14} />
                  <span>4. Proyecciones Financieras</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSercotecTab('DEFENSA')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeSercotecTab === 'DEFENSA'
                      ? 'bg-[#002D62] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>5. Defensa ante Jurado</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-500 font-bold shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Postulación Lista para Envío</span>
              </div>
            </div>

            {/* Contenedor Principal del Lector */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
              {/* PESTAÑA 1: PITCH 3 MINUTOS */}
              {activeSercotecTab === 'PITCH' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-gradient-to-br from-[#002D62] to-[#0A3D62] text-white p-6 rounded-3xl shadow-lg border border-blue-900">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider">
                        Estructura Oficial para Video Pitch de 3 Minutos (180 Segundos)
                      </span>
                      <span className="text-xs font-mono text-amber-300 font-bold">Tiempo Total: 3:00 min</span>
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-white">
                      Guion Técnico y Emocional de Presentación ante Evaluadores SERCOTEC
                    </h3>
                    <p className="text-xs text-slate-200 mt-1">
                      Diseñado para transmitir solvencia técnica, validación empírica real en terreno y claridad absoluta sobre el destino de cada peso del subsidio.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-lg">
                          00:00 - 00:35 • Bloque 1: El Dolor y la Oportunidad Crítica
                        </span>
                        <span className="text-xs text-slate-400 font-mono font-bold">35 segundos</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">
                        &ldquo;¿Sabían que en Chile se administran miles de millones de dólares en propiedades con simples hojas de Excel?&rdquo;
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Cada mes, Administradoras de Fondos y comités de vivienda sufren fraudes, colusión de contratistas en presupuestos inflados y graves multas de la CMF y la Ley N° 21.595 de Delitos Económicos porque no tienen cómo probar quién autorizó un gasto ni si los trabajos de pintura o techumbre realmente se ejecutaron.
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-lg">
                          00:35 - 01:15 • Bloque 2: La Solución (AssetFlow Enterprise)
                        </span>
                        <span className="text-xs text-slate-400 font-mono font-bold">40 segundos</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">
                        &ldquo;Para resolver esta crisis creamos AssetFlow Enterprise: un ERP con partida doble y trazabilidad criptográfica.&rdquo;
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        A diferencia de los portales comerciales convencionales, AssetFlow no es un software liviano. Implementa contabilidad estricta de partida doble F0911, control forense de cotizaciones y un sellado de bloques SHA-256 en las aprobaciones de órdenes de trabajo (F4209). Cada aprobación queda sellada matemáticamente, impidiendo pagos duplicados o adulteraciones posteriores.
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-lg">
                          01:15 - 01:55 • Bloque 3: Validación Real en Terreno y Capacidad Técnica
                        </span>
                        <span className="text-xs text-slate-400 font-mono font-bold">40 segundos</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">
                        &ldquo;Esto no es una idea en un papel: es un sistema ya probado en 19 condominios y más de 22.000 unidades.&rdquo;
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        El sistema fue probado y afinado en el Departamento Inmobiliario de Mutucar, resolviendo 4 observaciones complejas de auditoría y logrando el levantamiento de una suspensión regulatoria de la CMF. Además, adaptamos su arquitectura relacional particionada en PostgreSQL 16 para procesar más de 10.000 transacciones diarias por más de 10 años continuos.
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-lg">
                          01:55 - 02:30 • Bloque 4: Modelo de Negocio y Tracción B2B
                        </span>
                        <span className="text-xs text-slate-400 font-mono font-bold">35 segundos</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">
                        &ldquo;Monetizamos vía SaaS B2B recurrente y licencias on-premise soberanas para previsión y defensa.&rdquo;
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Cobramos entre 0,08 y 0,15 UF por unidad administrada al mes a Administradoras Generales de Fondos (AGF) y Multifamily, y vendemos licencias on-premise con mantenimiento anual a entidades de previsión y defensa que requieren servidores locales sin internet. Proyectamos un ingreso recurrente de $18,7 millones CLP mensuales en el primer año y punto de equilibrio financiero al mes 5.
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-lg">
                          02:30 - 03:00 • Bloque 5: Destino del Subsidio SERCOTEC y Equipo
                        </span>
                        <span className="text-xs text-slate-400 font-mono font-bold">30 segundos</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">
                        &ldquo;Con los $3.500.000 de Capital Semilla constituiremos formalmente AssetFlow Technologies SpA.&rdquo;
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        El subsidio financiará la constitución legal en &lsquo;Tu Empresa en un Día&rsquo;, la habilitación en el SII, el registro de marca en INAPI (Clases 9 y 42), un servidor mini-workstation para pruebas de carga forense, certificados de seguridad bancaria y la campaña B2B inicial. Lidero este proyecto con formación híbrida en Ingeniería Civil Industrial, Técnico Jurídico y Máster en IA, Derecho Digital y Blockchain. ¡Apóyennos a construir la tecnología que blindará el patrimonio inmobiliario de Chile!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: CANVAS 9 BLOQUES */}
              {activeSercotecTab === 'CANVAS' && (
                <div className="max-w-5xl mx-auto space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Metodología Alexander Osterwalder</span>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                        Modelo de Negocio Canvas Integral — AssetFlow Technologies SpA
                      </h3>
                      <p className="text-xs text-slate-600">
                        Estructura modular con análisis profundo de clientes, propuesta de valor blindada, gobernanza y márgenes operacionales.
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold text-center shrink-0">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-600">Margen EBITDA</div>
                      <div className="text-base font-black">38% - 55%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SERCOTEC_CANVAS_MODULES.map((module, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-colors">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#002D62] text-white text-[11px] font-mono font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                              {module.title}
                            </h4>
                          </div>
                          <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium pt-1">
                            {module.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: PRESUPUESTO $3.5M */}
              {activeSercotecTab === 'PRESUPUESTO' && (
                <div className="max-w-5xl mx-auto space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-amber-500 text-slate-950 p-5 rounded-2xl shadow-sm border border-amber-600">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">Subsidio SERCOTEC</span>
                      <div className="text-2xl font-black mt-1">$3.500.000 CLP</div>
                      <p className="text-[11px] text-slate-900 font-medium mt-1">Fondo estatal no reembolsable (95,2%)</p>
                    </div>
                    <div className="bg-[#002D62] text-white p-5 rounded-2xl shadow-sm border border-blue-900">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Aporte Emprendedor</span>
                      <div className="text-2xl font-black mt-1">$175.000 CLP</div>
                      <p className="text-[11px] text-slate-300 font-medium mt-1">Cofinanciamiento en efectivo (4,8%)</p>
                    </div>
                    <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">Presupuesto Total de Inversión</span>
                      <div className="text-2xl font-black mt-1">$3.675.000 CLP</div>
                      <p className="text-[11px] text-slate-400 font-medium mt-1">100% de ejecución validada en cotizaciones</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        Plan de Inversiones Detallado (SERCOTEC-SEM-2026-01)
                      </h4>
                      <span className="text-xs font-mono text-slate-500 font-bold">7 Ítems Presupuestarios</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                            <th className="py-3 px-4">Ítem / Categoría</th>
                            <th className="py-3 px-4">Descripción y Proveedor Cotizado</th>
                            <th className="py-3 px-3 text-right">SERCOTEC</th>
                            <th className="py-3 px-3 text-right">Emprendedor</th>
                            <th className="py-3 px-3 text-right">Total</th>
                            <th className="py-3 px-4">Justificación Técnica</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {SERCOTEC_BUDGET_ITEMS.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900 align-top">
                                <div className="text-slate-900">{item.item}</div>
                                <div className="text-[10px] font-mono text-indigo-600 font-normal">{item.category}</div>
                              </td>
                              <td className="py-3 px-4 text-slate-600 align-top leading-relaxed max-w-xs">
                                {item.supplierDescription}
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-emerald-700 text-right align-top whitespace-nowrap">
                                ${item.sercotecAmount.toLocaleString('es-CL')}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-600 text-right align-top whitespace-nowrap">
                                ${item.entrepreneurAmount.toLocaleString('es-CL')}
                              </td>
                              <td className="py-3 px-3 font-mono font-black text-slate-900 text-right align-top whitespace-nowrap">
                                ${item.totalAmount.toLocaleString('es-CL')}
                              </td>
                              <td className="py-3 px-4 text-slate-600 align-top text-[11px] leading-relaxed max-w-xs">
                                {item.justification}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                            <td className="py-3.5 px-4 uppercase" colSpan={2}>Totales Consolidados</td>
                            <td className="py-3.5 px-3 font-mono text-emerald-800 text-right whitespace-nowrap">
                              $3.500.000
                            </td>
                            <td className="py-3.5 px-3 font-mono text-slate-700 text-right whitespace-nowrap">
                              $175.000
                            </td>
                            <td className="py-3.5 px-3 font-mono text-slate-950 text-right whitespace-nowrap text-sm">
                              $3.675.000
                            </td>
                            <td className="py-3.5 px-4 text-[11px] text-slate-500 font-normal">
                              Cuadratura presupuestaria exacta sin saldos pendientes
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 4: PROYECCIONES FINANCIERAS */}
              {activeSercotecTab === 'PROYECCIONES' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Horizonte Operativo 2026 - 2028</span>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                          Proyecciones Financieras y Retorno de Inversión
                        </h3>
                      </div>
                      <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-xl text-xs font-black uppercase tracking-wider">
                        Break-even: Mes 5
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                            <th className="py-3 px-4">Periodo</th>
                            <th className="py-3 px-3 text-center">Clientes B2B</th>
                            <th className="py-3 px-3 text-center">Unidades Administradas</th>
                            <th className="py-3 px-4 text-right">MRR (Mensual)</th>
                            <th className="py-3 px-4 text-right">ARR (Anual)</th>
                            <th className="py-3 px-3 text-center">Margen EBITDA</th>
                            <th className="py-3 px-3 text-center">Equilibrio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {SERCOTEC_FINANCIAL_PROJECTIONS.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-bold text-slate-900">{row.year}</td>
                              <td className="py-3 px-3 text-center font-mono font-bold">{row.clients}</td>
                              <td className="py-3 px-3 text-center font-mono">{row.managedUnits.toLocaleString('es-CL')}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                                ${row.mrrCLP.toLocaleString('es-CL')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-black text-slate-950">
                                ${row.arrCLP.toLocaleString('es-CL')}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">{row.ebitdaMargin}</td>
                              <td className="py-3 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  {row.breakEvenMonth}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <h4 className="text-xs font-black text-slate-900 uppercase">Indicadores Económicos del Proyecto</h4>
                      <ul className="text-xs text-slate-600 space-y-1.5 font-medium">
                        <li>• <strong>Tasa Interna de Retorno (TIR):</strong> 142% anual gracias a la base tecnológica ya construida (no se gasta en I+D desde cero).</li>
                        <li>• <strong>Valor Actual Neto (VAN 3 años):</strong> $184.500.000 CLP a una tasa de descuento del 12%.</li>
                        <li>• <strong>Costo de Adquisición de Clientes (CAC):</strong> $650.000 CLP por AGF / operador institucional.</li>
                        <li>• <strong>Lifetime Value (LTV):</strong> $44.800.000 CLP considerando permanencia mínima promedio de 36 meses.</li>
                      </ul>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <h4 className="text-xs font-black text-slate-900 uppercase">Impacto Social, Laboral y Tributario</h4>
                      <ul className="text-xs text-slate-600 space-y-1.5 font-medium">
                        <li>• <strong>Formalización de Empleos:</strong> Creación de 3 empleos técnicos directos en el Año 1 (ingeniería de software y soporte).</li>
                        <li>• <strong>Aporte Tributario:</strong> Pago proyectado de más de $42.000.000 CLP en IVA y PPM en los primeros 24 meses.</li>
                        <li>• <strong>Prevención de Delitos:</strong> Blindaje fiduciario que protege los fondos de pensiones y ahorros de miles de copropietarios en Chile.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 5: DEFENSA ANTE JURADO */}
              {activeSercotecTab === 'DEFENSA' && (
                <div className="max-w-4xl mx-auto space-y-5">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Banco de Respuestas Técnicas</span>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                      Guía de Defensa para Entrevista con Jurado Evaluador SERCOTEC
                    </h3>
                    <p className="text-xs text-slate-600">
                      Argumentos contundentes para responder a las preguntas más incisivas del comité evaluador sin vacilaciones.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                      <h4 className="text-xs font-black text-slate-900 uppercase text-indigo-700">
                        1. &ldquo;¿Por qué necesitan financiamiento de SERCOTEC si el software ya está funcionando?&rdquo;
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        <strong>Respuesta:</strong> Porque un desarrollo tecnológico sin persona jurídica formal no puede facturar legalmente con IVA ni celebrar contratos con fondos de inversión fiscalizados por la CMF. El subsidio de SERCOTEC es el puente habilitador indispensable para constituir <em>AssetFlow Technologies SpA</em>, inscribir la marca en INAPI, equipar el servidor local de pruebas de carga forense y generar los primeros contratos comerciales recurrentes.
                      </p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                      <h4 className="text-xs font-black text-slate-900 uppercase text-indigo-700">
                        2. &ldquo;¿Por qué constituir una Sociedad por Acciones (SpA) y no operar como Persona Natural con Giro?&rdquo;
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        <strong>Respuesta:</strong> En el mercado corporativo B2B y financiero de las AGFs, la limitación de responsabilidad fiduciaria es un requisito innegociable. La SpA permite emitir series de acciones para futuros inversionistas de capital de riesgo (CORFO Semilla Expansión o Venture Capital), separar el patrimonio personal del societario y licitar formalmente en Mercado Público y contratos privados de alta cuantía.
                      </p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                      <h4 className="text-xs font-black text-slate-900 uppercase text-indigo-700">
                        3. &ldquo;¿Por qué comprar un servidor físico mini-workstation en vez de usar todo en la nube?&rdquo;
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        <strong>Respuesta:</strong> Por soberanía de datos y economía operativa. Nuestros clientes de defensa (fuerzas armadas y previsión) exigen pruebas de seguridad en entornos desconectados (Air-Gapped). Además, simular 10.000 transacciones diarias y ataques de denegación de servicio en la nube pública generaría costos en dólares inasumibles para una startup; la estación de trabajo física local permite ejecutar millones de pruebas de estrés con costo marginal cero.
                      </p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                      <h4 className="text-xs font-black text-slate-900 uppercase text-indigo-700">
                        4. &ldquo;¿Cómo competirán contra software establecidos como ComunidadFeliz o Kastor?&rdquo;
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        <strong>Respuesta:</strong> ComunidadFeliz y Kastor son aplicaciones orientadas al administrador de edificio residencial común para enviar gastos comunes. AssetFlow Enterprise ataca un segmento superior desatendido: el mercado institucional de Administradoras de Fondos y Multifamily, que exige contabilidad formal de partida doble F0911, control forense anti-colusión en obras, sellado criptográfico SHA-256 y cumplimiento probatorio de la Ley N° 21.595 de Delitos Económicos.
                      </p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                      <h4 className="text-xs font-black text-slate-900 uppercase text-indigo-700">
                        5. &ldquo;¿Cuál es la garantía de que el emprendimiento sobrevivirá más allá del subsidio?&rdquo;
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        <strong>Respuesta:</strong> Nuestro modelo SaaS B2B tiene un punto de equilibrio ultra rápido (Mes 5 con solo 3 clientes corporativos). No dependemos de quemar dinero en captación masiva ni de subsidios continuos: con apenas 5 fondos inmobiliarios alcanzamos $18.700.000 CLP de ingresos mensuales, asegurando un margen operacional superior al 38% y sostenibilidad financiera perpetua.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>AssetFlow Technologies SpA • Propuesta SERCOTEC Capital Semilla 2026 • Lista para Adjudicación</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-slate-500">Postulante: Cristian Andrés Muñoz Rojas (samaheim@gmail.com)</span>
                <button
                  type="button"
                  onClick={() => setIsSercotecModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ASSETFLOW ENTERPRISE FLOATING GRID CONTEXT MENU (P986110D) --- */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P986110D"
          programTitle="Bóveda Digital de Expedientes y Soportes (F986110D)"
          collectionName="digital_vault"
          recordKey={`[${gridContextMenu.item.type}] ${gridContextMenu.item.name}`}
          recordData={gridContextMenu.item}
          currentStatus="ACTIVO"
          statusOptions={[
            { label: 'ACTIVO (Vigente / Custodia)', value: 'ACTIVO', color: 'bg-emerald-600' },
            { label: 'EN REVISIÓN (Auditoría)', value: 'REVISION', color: 'bg-amber-600' },
            { label: 'ARCHIVADO (Bóveda Histórica)', value: 'ARCHIVADO', color: 'bg-slate-600' }
          ]}
          onClose={() => setGridContextMenu(null)}
          onViewDetails={() => {
            if (gridContextMenu.item.id === 'informe-sercotec-semilla') {
              setIsSercotecModalOpen(true);
            } else if (gridContextMenu.item.id === 'informe-psicolaboral-sgc') {
              setIsPsychologicalModalOpen(true);
            } else if (gridContextMenu.item.id === 'manual-it-deployment-server') {
              setIsItManualModalOpen(true);
            } else if (gridContextMenu.item.id === 'magister-thesis-docx') {
              setIsMagisterThesisModalOpen(true);
            } else {
              setSelectedPreviewItem(gridContextMenu.item);
            }
            setGridContextMenu(null);
          }}
          onSelectRow={() => {
            handleDrillDown(gridContextMenu.item);
            setGridContextMenu(null);
          }}
          onAttachments={() => {
            if (gridContextMenu.item.id === 'informe-sercotec-semilla') {
              handleDownloadWordManual('informe-sercotec-semilla');
            } else if (gridContextMenu.item.id === 'informe-psicolaboral-sgc') {
              handleDownloadWordManual('informe-psicolaboral-sgc');
            } else if (gridContextMenu.item.id === 'manual-it-deployment-server') {
              downloadItDeploymentManualPdf();
            } else if (gridContextMenu.item.id === 'magister-thesis-docx') {
              handleDownloadWordManual('magister-thesis-docx');
            } else if (gridContextMenu.item.url) {
              openDocumentSecurely(gridContextMenu.item.url, gridContextMenu.item.name);
            }
            setGridContextMenu(null);
          }}
          rowExits={[
            {
              label: 'Drill Down: Ir a Módulo de Origen / Lector',
              shortcut: 'Alt+D',
              onClick: () => {
                handleDrillDown(gridContextMenu.item);
                setGridContextMenu(null);
              }
            },
            {
              label: 'Visualizar Soporte en Pantalla',
              shortcut: 'Enter',
              onClick: () => {
                if (gridContextMenu.item.id === 'informe-sercotec-semilla') {
                  setIsSercotecModalOpen(true);
                } else if (gridContextMenu.item.id === 'informe-psicolaboral-sgc') {
                  setIsPsychologicalModalOpen(true);
                } else if (gridContextMenu.item.id === 'manual-it-deployment-server') {
                  setIsItManualModalOpen(true);
                } else if (gridContextMenu.item.id === 'magister-thesis-docx') {
                  setIsMagisterThesisModalOpen(true);
                } else {
                  setSelectedPreviewItem(gridContextMenu.item);
                }
                setGridContextMenu(null);
              }
            },
            {
              label: 'Descargar / Abrir Archivo Seguro (.DOCX / .PDF)',
              shortcut: 'Ctrl+O',
              onClick: () => {
                if (gridContextMenu.item.id === 'informe-sercotec-semilla') {
                  handleDownloadWordManual('informe-sercotec-semilla');
                } else if (gridContextMenu.item.id === 'informe-psicolaboral-sgc') {
                  handleDownloadWordManual('informe-psicolaboral-sgc');
                } else if (gridContextMenu.item.id === 'manual-it-deployment-server') {
                  downloadItDeploymentManualWord();
                } else if (gridContextMenu.item.id === 'magister-thesis-docx') {
                  handleDownloadWordManual('magister-thesis-docx');
                } else {
                  openDocumentSecurely(gridContextMenu.item.url, gridContextMenu.item.name);
                }
                setGridContextMenu(null);
              }
            },
            {
              label: 'Asociar Nuevo Respaldo a Este Expediente',
              shortcut: 'Ctrl+U',
              onClick: () => {
                setAssocRecordType(
                  gridContextMenu.item.type === 'DOSSIER' ? 'TASACIÓN' : gridContextMenu.item.type as any
                );
                setIsAssociateModalOpen(true);
                setGridContextMenu(null);
              }
            },
            {
              label: 'Secuencia de Ordenamiento (JDE Sort)',
              shortcut: 'Ctrl+S',
              onClick: () => {
                setIsSortModalOpen(true);
                setGridContextMenu(null);
              }
            }
          ]}
        />
      )}

      {/* --- DIÁLOGO OFICIAL DE SECUENCIA DE ORDENAMIENTO ENTERPRISE (P986110S) --- */}
      <JDESortSequenceModal
        isOpen={isSortModalOpen}
        programCode="P986110S"
        gridTitle="Bóveda Digital de Expedientes y Soportes (F986110D)"
        availableColumns={VAULT_SORT_COLUMNS}
        currentPrimarySort={primarySort}
        currentSecondarySort={secondarySort}
        onApply={(p, s) => setManualMultiSort(p, s)}
        onClose={() => setIsSortModalOpen(false)}
      />
    </div>
  );
};

export default DigitalVault;
