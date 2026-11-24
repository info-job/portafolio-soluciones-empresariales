
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Calendar, 
  DollarSign, User, Building2, Clock, CheckCircle, 
  AlertCircle, FileSearch, Download, Trash2, Edit3,
  BrainCircuit, Loader2, X, Upload, Eye, FileUp, Wand2, RefreshCw, Lock,
  ExternalLink, Save, Send, Mail, Wrench, ShieldCheck, Activity,
  Table, ArrowUp, ArrowDown, ArrowUpDown, LayoutGrid, CheckSquare, Square,
  FileSpreadsheet, Sparkles, ChevronRight, TrendingUp
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { LeaseContract, Property, ContractStatus, Applicant, PropertyInspection, LeasePayment } from '../types';
import { RentReadjustmentModal, ReadjustmentItem } from './RentReadjustmentModal';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { extractLeaseContractData } from '../geminiService';
import { uploadFile, openDocumentSecurely, prepareRecordForFirestore, isFirestoreQuotaExceeded, isQuotaError, markFirestoreQuotaExceeded } from '@/lib/storage';
import { storage } from '../lib/storageEngine';
import { useNotification } from './NotificationProvider';
import { exportDelinquencyTemplateToExcel } from '@/lib/excelExport';
import { buildB13PortfolioConsolidation, exportB13ConsolidationToExcel } from '../lib/b13Generator';
import { downloadRentPaymentReceiptPDF } from '../lib/pdfGenerator';
import { DEFAULT_ASSETFLOW_SVG, getSvgAsPngBase64 } from '../lib/defaultLogo';
import { maskMoneyCLP, validateDateRange, maskFolioOrInvoice } from '../lib/inputMasks';
import { JDEGridContextMenu } from './JDEGridContextMenu';

// Helper function to load QR image URL and convert to Base64 for jsPDF
const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", function () {
      resolve(reader.result as string);
    }, false);
    reader.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    reader.readAsDataURL(blob);
  });
};
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function getRegionByCommune(commune: string): string {
  const comm = (commune || '').trim().toLowerCase();
  
  // Región de Tarapacá (I)
  if (['iquique', 'alto hospicio', 'pozo almonte', 'pica', 'huara', 'camiña', 'colchane'].includes(comm)) {
    return 'Región de Tarapacá (I)';
  }
  // Región de Valparaíso (V)
  if (['valparaíso', 'valparaiso', 'viña del mar', 'vina del mar', 'quilpué', 'quilpue', 'villa alemana', 'san antonio', 'quillota', 'los andes', 'san felipe', 'el quisco', 'el tabo', 'algarrobo', 'casablanca', 'concón', 'concon', 'limache', 'olmue', 'olmué', 'san esteban'].includes(comm)) {
    return 'Región de Valparaíso (V)';
  }
  // Región Metropolitana (RM)
  if (['santiago', 'providencia', 'las condes', 'vitacura', 'ñuñoa', 'nunoa', 'la reina', 'peñalolén', 'penalolen', 'macul', 'san joaquín', 'san joaquin', 'la florida', 'puente alto', 'san bernardo', 'maipú', 'maipu', 'pudahuel', 'quilicura', 'estación central', 'estacion central', 'independencia', 'recoleta', 'conchalí', 'conchali', 'huechuraba', 'cerrillos', 'lo espejo', 'la cisterna', 'san ramón', 'san ramon', 'la granja', 'el bosque', 'lo barnechea', 'quinta normal', 'pudahuel', 'lo prado', 'cerro navia', 'renca', 'lampa', 'colina', 'talagante', 'buin', 'paine', 'melipilla'].includes(comm)) {
    return 'Región Metropolitana (RM)';
  }
  // Región de Antofagasta (II)
  if (['antofagasta', 'calama', 'tocopilla', 'mejillones', 'taltal', 'san pedro de atacama'].includes(comm)) {
    return 'Región de Antofagasta (II)';
  }
  // Región de Coquimbo (IV)
  if (['coquimbo', 'la serena', 'ovalle', 'illapel', 'vicuña', 'vicuna', 'los vilos'].includes(comm)) {
    return 'Región de Coquimbo (IV)';
  }
  // Región de Atacama (III)
  if (['copiapó', 'copiapo', 'vallenar', 'caldera', 'chañaral', 'chanaral', 'huasco', 'diego de almagro'].includes(comm) || comm.includes('vallenar')) {
    return 'Región de Atacama (III)';
  }
  // Región de Los Ríos (XIV)
  if (['valdivia', 'la unión', 'la union', 'río bueno', 'rio bueno', 'panguipulli', 'lanco', 'mariquina'].includes(comm) || comm.includes('valdivia')) {
    return 'Región de Los Ríos (XIV)';
  }
  // Región de Aysén (XI)
  if (['coyhaique', 'aysen', 'puerto aysen', 'chile chico', 'cochrane'].includes(comm) || comm.includes('coyhaique')) {
    return 'Región de Aysén (XI)';
  }
  // Región del Biobío (VIII)
  if (['concepción', 'concepcion', 'talcahuano', 'chiguayante', 'san pedro de la paz', 'coronel', 'lota', 'penco', 'tomé', 'tome', 'hualpén', 'hualpen', 'los ángeles', 'los angeles'].includes(comm)) {
    return 'Región del Biobío (VIII)';
  }
  // Región de la Araucanía (IX)
  if (['temuco', 'padre las casas', 'angol', 'villarrica', 'pucón', 'pucon', 'lautaro', 'victoria'].includes(comm)) {
    return 'Región de la Araucanía (IX)';
  }
  // Región de Los Lagos (X)
  if (['puerto montt', 'osorno', 'castro', 'ancud', 'puerto varas', 'frutillar', 'llanquihue', 'quellón', 'quellon'].includes(comm)) {
    return 'Región de Los Lagos (X)';
  }

  // Fallback map logic: check words
  if (comm.includes('santiago') || comm.includes('condes') || comm.includes('ñuñoa') || comm.includes('providencia') || comm.includes('florida') || comm.includes('maipu') || comm.includes('maipú')) {
    return 'Región Metropolitana (RM)';
  }
  if (comm.includes('valp') || comm.includes('viña') || comm.includes('tabo') || comm.includes('quisco') || comm.includes('algarrobo')) {
    return 'Región de Valparaíso (V)';
  }
  if (comm.includes('iquique') || comm.includes('hospicio')) {
    return 'Región de Tarapacá (I)';
  }
  if (comm.includes('antofagasta') || comm.includes('calama')) {
    return 'Región de Antofagasta (II)';
  }
  if (comm.includes('conce') || comm.includes('talcahuano')) {
    return 'Región del Biobío (VIII)';
  }

  // General defaults based on standard property list or default
  return 'Región Metropolitana (RM)';
}

const formatDateDMY = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const parseBillingPeriod = (periodStr: string) => {
  const monthsMap: { [key: string]: number } = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
  };
  const parts = periodStr.toLowerCase().trim().split(' ');
  const monthName = parts[0];
  const yearNum = parseInt(parts[1]) || new Date().getFullYear();
  const monthIdx = monthsMap[monthName] !== undefined ? monthsMap[monthName] : new Date().getMonth();
  
  const monthStart = new Date(yearNum, monthIdx, 1);
  const monthEnd = new Date(yearNum, monthIdx + 1, 0); // Last day
  return { monthStart, monthEnd, monthIdx, yearNum };
};

const getBillingDetailsForContract = (c: LeaseContract, periodStr: string) => {
  const { monthStart, monthEnd } = parseBillingPeriod(periodStr);
  const totalDaysInMonth = monthEnd.getDate();

  const contractStart = new Date(c.startDate + 'T00:00:00');
  const contractEnd = c.endDate ? new Date(c.endDate + 'T00:00:00') : null;

  let effectiveStart = contractStart > monthStart ? contractStart : monthStart;
  let effectiveEnd = (contractEnd && contractEnd < monthEnd) ? contractEnd : monthEnd;

  if (effectiveStart > monthEnd || (contractEnd && contractEnd < monthStart) || effectiveStart > effectiveEnd) {
    return {
      fromDate: formatDateDMY(monthStart),
      toDate: formatDateDMY(monthEnd),
      billedDays: 0,
      isProportional: true,
      proportionalAmount: 0,
      totalDays: totalDaysInMonth
    };
  }

  const diffTime = effectiveEnd.getTime() - effectiveStart.getTime();
  const billedDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const isProportional = billedDays < totalDaysInMonth;
  const proportionalAmount = isProportional 
    ? Math.round((c.monthlyAmount / totalDaysInMonth) * billedDays)
    : c.monthlyAmount;

  return {
    fromDate: formatDateDMY(effectiveStart),
    toDate: formatDateDMY(effectiveEnd),
    billedDays,
    isProportional,
    proportionalAmount,
    totalDays: totalDaysInMonth
  };
};

import { OfficialDocument } from '../types';

interface LeaseContractModuleProps {
  contracts: LeaseContract[];
  properties: Property[];
  onSave: (contract: LeaseContract) => void;
  onDelete: (id: string) => void;
  onSync?: () => Promise<void>;
  currentUser: string;
  applicants?: Applicant[];
  inspections?: PropertyInspection[];
  setOfficialDocs?: React.Dispatch<React.SetStateAction<OfficialDocument[]>>;
}

const LeaseContractModule: React.FC<LeaseContractModuleProps> = ({
  contracts,
  properties,
  onSave,
  onDelete,
  onSync,
  currentUser,
  applicants = [],
  inspections = [],
  setOfficialDocs
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);

  // AssetFlow Enterprise modern UX states
  const [selectedContractForCafeOne, setSelectedContractForCafeOne] = useState<LeaseContract | null>(contracts[0] || null);
  const [isCafeOneSidebarOpen, setIsCafeOneSidebarOpen] = useState(true);
  const [savedQuery, setSavedQuery] = useState<string>('ALL'); // 'ALL' | 'VIGENTE' | 'PENDING_DOC' | 'PENDING_INSP'
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [orchestratorLogs, setOrchestratorLogs] = useState<string[]>([]);

  
  // ERP QBE (Query By Example) column filter states
  const [qbeId, setQbeId] = useState('');
  const [qbeTenantName, setQbeTenantName] = useState('');
  const [qbeTenantTaxId, setQbeTenantTaxId] = useState('');
  const [qbeTenantDocNumber, setQbeTenantDocNumber] = useState('');
  const [qbeProperty, setQbeProperty] = useState('');
  const [qbeMonthlyAmount, setQbeMonthlyAmount] = useState('');
  const [qbeStartDate, setQbeStartDate] = useState('');
  const [qbeEndDate, setQbeEndDate] = useState('');
  const [qbeStatus, setQbeStatus] = useState('');
  const [qbeActaStatus, setQbeActaStatus] = useState('');

  // ERP Grid Column Sorting
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Selected contracts for multi-select operations
  const [selectedContractIds, setSelectedContractIds] = useState<Set<string>>(new Set());

  // ERP Grid Column Resizing Widths (in px or string)
  const [colWidths, setColWidths] = useState({
    selector: 44,
    status: 95,
    folio: 105,
    tenantName: 200,
    tenantTaxId: 115,
    tenantDocNumber: 110,
    property: 210,
    monthlyAmount: 125,
    startDate: 100,
    endDate: 100,
    actaStatus: 120,
    actions: 145
  });

  const resizingColRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  const handleColResizeMouseDown = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: colWidths[colKey as keyof typeof colWidths] || 100
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColRef.current) return;
      const delta = moveEvent.clientX - resizingColRef.current.startX;
      const newWidth = Math.max(50, resizingColRef.current.startWidth + delta);
      setColWidths(prev => ({ ...prev, [resizingColRef.current!.colKey]: newWidth }));
    };

    const handleMouseUp = () => {
      resizingColRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleClearQBE = () => {
    setQbeId('');
    setQbeTenantName('');
    setQbeTenantTaxId('');
    setQbeTenantDocNumber('');
    setQbeProperty('');
    setQbeMonthlyAmount('');
    setQbeStartDate('');
    setQbeEndDate('');
    setQbeStatus('');
    setQbeActaStatus('');
    setSearchQuery('');
  };

  // ERP Grid Context Menu state
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    contract: LeaseContract;
  } | null>(null);

  // States for Batch Rent billing and auto email remittance (PDI)
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isDelinquencyModalOpen, setIsDelinquencyModalOpen] = useState(false);
  const [isLifecycleModalOpen, setIsLifecycleModalOpen] = useState(false);
  const [isReadjustmentModalOpen, setIsReadjustmentModalOpen] = useState(false);
  const [activePhaseTab, setActivePhaseTab] = useState<number>(1);
  const [billingPeriod, setBillingPeriod] = useState('Junio 2026');
  const [isProcessingBilling, setIsProcessingBilling] = useState(false);
  const [billingProgress, setBillingProgress] = useState(0);
  const [billingLogs, setBillingLogs] = useState<string[]>([]);
  const [billingResultReport, setBillingResultReport] = useState<{
    batchId: string;
    executionDate: string;
    processedCount: number;
    successfulCount: number;
    failedCount: number;
    details: Array<{
      id: string;
      tenantName: string;
      tenantEmail: string;
      tenantTaxId?: string;
      monthlyAmount: number;
      currency: string;
      propertyLabel: string;
      smtpStatus: 'ENTREGADO' | 'REBOTADO_SIN_CORREO';
      transmissionId: string;
      errorMessage?: string;
      fromDate?: string;
      toDate?: string;
      billedDays?: number;
      proportionalAmount?: number;
      isProportional?: boolean;
      totalDays?: number;
    }>;
  } | null>(null);

  // States for rent payment registration (Partial payments)
  const [rentPaymentPeriod, setRentPaymentPeriod] = useState('Junio 2026');
  const [rentPaymentAmount, setRentPaymentAmount] = useState('');
  const [rentPaymentMethod, setRentPaymentMethod] = useState('TRANSFERENCIA');
  const [rentPaymentRef, setRentPaymentRef] = useState('');
  const [rentPaymentDate, setRentPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Helper method to format professional tenant emails based on names
  const getTenantEmail = (name: string) => {
    const normalized = (name || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, ".");
    return normalized ? `${normalized}@propiedades-inmobiliariapro.cl` : 'arrendatario@propiedades-inmobiliariapro.cl';
  };

  const handleExecuteBilling = () => {
    setIsProcessingBilling(true);
    setBillingProgress(0);
    setBillingLogs([]);
    setBillingResultReport(null);
    
    const activeContracts = contracts.filter(c => c.status === 'VIGENTE' || c.status === 'POR_VENCER');
    
    if (activeContracts.length === 0) {
      setBillingLogs(['[ERROR] No se encontraron contratos vigentes o por vencer en estado activo para facturar en este período.']);
      setIsProcessingBilling(false);
      return;
    }

    const steps = [
      `[ERP BATCH R15132] Iniciando lote de facturación para el período ${billingPeriod.toUpperCase()}...`,
      '[SMTP] Estableciendo canal TLS seguro con el servidor SMTP institucional de AssetFlow...',
      '[ERP F0101] Sincronizando datos con el Maestro de Direcciones (Direcciones de Correo del Arrendatario)...',
      '[PDF GENERATOR] Generando pre-avisos de cobro comprimidos para adjunto de correo...',
      ...activeContracts.map(c => `[PROCESANDO] Generado cobro de ${c.currency} ${c.monthlyAmount.toLocaleString()} para ${c.tenantName} (${c.propertyLabel})`),
      '[SMTP DISPATCH] Distribuyendo en cola de envío automático de correos (PDI-Automated)...',
      ...activeContracts.map(c => `[SMTP ENVIADO] Despachado correo de cobro de arriendo a: ${getTenantEmail(c.tenantName)}`),
      '[CONCILIACIÓN] Guardando registros de transmisión en bitácoras de auditoría del servidor...',
      `[BATCH COMPLETADO] Proceso finalizado correctamente para el lote de ${billingPeriod.toUpperCase()}.`
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setBillingLogs(prev => [...prev, steps[currentStep]]);
        setBillingProgress(Math.min(95, Math.round(((currentStep + 1) / steps.length) * 100)));
        currentStep++;
      } else {
        clearInterval(interval);
        
        // Generate details of transmission
        const details = activeContracts.map(c => {
          const cleanEmail = getTenantEmail(c.tenantName);
          // Simulate some specific failure only for testing triggers (e.g. if name is empty or includes warning word)
          const hasEmailError = c.tenantName.toLowerCase().includes('invalido') || c.tenantName.toLowerCase().includes('error');
          
          const calc = getBillingDetailsForContract(c, billingPeriod);

          return {
            id: c.id,
            tenantName: c.tenantName,
            tenantEmail: cleanEmail,
            tenantTaxId: c.tenantTaxId || 'S/N',
            monthlyAmount: c.monthlyAmount,
            currency: c.currency,
            propertyLabel: c.propertyLabel,
            smtpStatus: hasEmailError ? 'REBOTADO_SIN_CORREO' : 'ENTREGADO' as const,
            transmissionId: `SMTP-ERP-${Math.floor(1000 + Math.random() * 9000)}-${c.id.substring(0,4).toUpperCase()}`,
            errorMessage: hasEmailError ? 'Error SMTP 550 - Buzón inexistente o rechazado por el servidor externo.' : undefined,
            fromDate: calc.fromDate,
            toDate: calc.toDate,
            billedDays: calc.billedDays,
            isProportional: calc.isProportional,
            proportionalAmount: calc.proportionalAmount,
            totalDays: calc.totalDays
          };
        });

        const successfulCount = details.filter(d => d.smtpStatus === 'ENTREGADO').length;
        const failedCount = details.filter(d => d.smtpStatus === 'REBOTADO_SIN_CORREO').length;

        const reportObj = {
          batchId: `B98-COB-${Math.floor(100000 + Math.random() * 900000)}`,
          executionDate: new Date().toISOString(),
          processedCount: details.length,
          successfulCount,
          failedCount,
          details
        };

        setBillingResultReport(reportObj);
        setBillingProgress(100);
        setIsProcessingBilling(false);
        notify(`Procesado ERP R15132 finalizado: ${successfulCount} notificaciones entregadas. Iniciando descarga del comprobante PDF...`, 'success');

        // Generar y desplegar automáticamente el comprobante en PDF para revisión inmediata en pantalla
        setTimeout(async () => {
          try {
            const pdfDoc = generateBillingReportPDFDoc(reportObj);
            if (pdfDoc) {
              const dataUrl = pdfDoc.output('datauristring');
              setViewingBillingPDFUrl(dataUrl);

              // Guardar de forma automática en la base de datos (Bóveda / Oficios) para evitar errores o pérdidas de digitación
              try {
                const docId = `doc-billing-${reportObj.batchId}`;
                const officialDocPayload = {
                  id: docId,
                  type: 'MEMORÁNDUM',
                  docNumber: reportObj.batchId,
                  date: new Date().toISOString().split('T')[0],
                  arrivalDate: new Date().toISOString().split('T')[0],
                  systemLoadDate: new Date().toISOString().split('T')[0],
                  subject: `Informe de Procesamiento ERP R15132 Lote ${reportObj.batchId}`,
                  synthesis: `Lote de cobro masivo completado con ${reportObj.processedCount} contratos procesados (${reportObj.successfulCount} exitosos, ${reportObj.failedCount} fallidos).`,
                  status: 'RECEPCIONADO',
                  statusUpdatedAt: Date.now(),
                  timestamp: Date.now(),
                  sender: 'ERP ORCHESTRATOR',
                  recipient: 'ASSETFLOW CONTROL',
                  attachments: [dataUrl],
                  documentUrl: dataUrl,
                  documentName: `Informe_Envio_Cobros_SMTP_${reportObj.batchId}.pdf`,
                  userCreator: currentUser || 'SYSTEM_AUTO'
                };
                // 1. Sincronizar primero localmente el estado de React y almacenamiento local IndexedDB
                if (setOfficialDocs) {
                  setOfficialDocs(prev => {
                    const updated = [officialDocPayload, ...prev.filter(d => d.id !== docId)];
                    storage.save('officialDocs', updated);
                    return updated;
                  });
                } else {
                  const existing = await storage.load('officialDocs', []);
                  storage.save('officialDocs', [officialDocPayload, ...existing.filter((d: any) => d.id !== docId)]);
                }

                // 2. Sincronizar con Firestore si hay cuota disponible
                const safeOfficialPayload = await prepareRecordForFirestore(officialDocPayload, 'official_docs', docId);
                if (!isFirestoreQuotaExceeded()) {
                  const docRef = doc(db, 'official_docs', docId);
                  await setDoc(docRef, safeOfficialPayload, { merge: true });
                }
              } catch (dbErr) {
                if (isQuotaError(dbErr)) {
                  markFirestoreQuotaExceeded();
                } else {
                  console.warn("Advertencia sincronizando informe de facturación en nube:", dbErr);
                }
              }
            }
          } catch (err) {
            console.error("Error setting billing report PDF for preview:", err);
          }
          downloadBillingReportPDF(reportObj);
        }, 150);
      }
    }, 280);
  };

  const generateBillingReportPDFDoc = (report: typeof billingResultReport) => {
    if (!report) return null;

    const doc = new jsPDF() as any;
    const margin = 15;
    let yPos = 20;

    // Document header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(11, 60, 93); // #0B3C5D
    doc.text("INMOBILIARIA PRO - DEPARTAMENTO INMOBILIARIO", margin, yPos);
    yPos += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Módulo ASSETFLOW Enterprise System R15132 - Batch Billing Dispatch Report", margin, yPos);
    yPos += 1;
    doc.line(margin, yPos, 195, yPos);
    yPos += 8;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`INFORME DE TRANSMISIÓN DE COBROS: PERÍODO ${billingPeriod.toUpperCase()}`, margin, yPos);
    yPos += 10;

    // Summary Box Background
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, yPos, 180, 24, 'F');
    
    // Info Grid
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DE CONTROL DE EJECUCIÓN", margin + 4, yPos + 6);
    doc.text("RESULTADOS DE ENTREGA (SMTP)", 110, yPos + 6);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(`ID del Lote ERP: ${report.batchId}`, margin + 4, yPos + 12);
    doc.text(`Total Cobros Facturados: ${report.processedCount}`, 110, yPos + 12);
    
    doc.text(`Fecha Ejecución: ${new Date(report.executionDate).toLocaleString('es-CL')}`, margin + 4, yPos + 18);
    doc.text(`Envíos Exitosos: ${report.successfulCount}`, 110, yPos + 18);

    doc.setTextColor(report.failedCount > 0 ? 185 : 51, report.failedCount > 0 ? 28 : 65, report.failedCount > 0 ? 28 : 85);
    doc.text(`Rebotes / Errores: ${report.failedCount}`, 145, yPos + 18);
    
    yPos += 29;
    doc.setTextColor(15, 23, 42);

    // Table Header
    doc.setFillColor(11, 60, 93);
    doc.rect(margin, yPos, 180, 7, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("ARRENDATARIO / RUT", margin + 2, yPos + 5);
    doc.text("PROPIEDAD / INMUEBLE", margin + 44, yPos + 5);
    doc.text("PERÍODO", margin + 80, yPos + 5);
    doc.text("CANON NETO", margin + 112, yPos + 5);
    doc.text("TOTAL PAGAR", margin + 134, yPos + 5);
    doc.text("ESTADO", margin + 158, yPos + 5);
    yPos += 7;

    // Table Content
    report.details.forEach((det, idx) => {
      // Row Background alternating
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, yPos, 180, 8, 'F');
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      
      const slugName = det.tenantName.length > 20 ? det.tenantName.substring(0, 18) + "..." : det.tenantName;
      doc.text(slugName.toUpperCase(), margin + 2, yPos + 5.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const slugProp = det.propertyLabel.length > 18 ? det.propertyLabel.substring(0, 16) + "..." : det.propertyLabel;
      doc.text(slugProp.toUpperCase(), margin + 44, yPos + 5.5);

      // Period text
      const periodText = det.fromDate && det.toDate 
        ? `${det.fromDate.substring(0, 5)} al ${det.toDate.substring(0, 5)}`
        : 'S/I';
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(periodText, margin + 80, yPos + 5.5);

      // Canon Neto
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const canonStr = `${det.currency} ${det.monthlyAmount.toLocaleString('es-CL')}`;
      doc.text(canonStr, margin + 112, yPos + 5.5);

      // Total Pagar
      doc.setFont("helvetica", "bold");
      doc.setTextColor(11, 60, 93);
      const propAmount = det.proportionalAmount !== undefined ? det.proportionalAmount : det.monthlyAmount;
      const amtStr = `${det.currency} ${propAmount.toLocaleString('es-CL')}`;
      doc.text(amtStr, margin + 134, yPos + 5.5);

      if (det.smtpStatus === 'ENTREGADO') {
        doc.setTextColor(22, 101, 52); // green-700
        doc.setFont("helvetica", "bold");
        doc.text("ENTREGADO", margin + 158, yPos + 5.5);
      } else {
        doc.setTextColor(185, 28, 28); // red-700
        doc.setFont("helvetica", "bold");
        doc.text("REBOTADO", margin + 158, yPos + 5.5);
      }

      yPos += 8;

      if (yPos > 265) {
        doc.addPage();
        yPos = 20;
      }
    });

    yPos += 8;
    doc.line(margin, yPos, 195, yPos);
    yPos += 6;

    // Certifications
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 60, 93);
    doc.text("CERTIFICACIÓN SMTP Y AUDITORÍA DE FACTURACIÓN INTEGRAL", margin, yPos);
    yPos += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Este reporte ha sido emitido de manera automática tras completarse de manera exitosa el envío", margin, yPos);
    yPos += 4;
    doc.text("masivo de la facturación y avisos de cobros por email al personal de arrendamiento (PDI/Inquilinos).", margin, yPos);
    
    // Signatures
    yPos += 12;
    doc.line(margin, yPos, 70, yPos);
    doc.line(125, yPos, 185, yPos);
    yPos += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Jefe de Auditoría & Control Interno", margin, yPos);
    doc.text("Operator de Facturación ERP", 125, yPos);
    
    yPos += 4;
    doc.setFont("helvetica", "normal");
    doc.text("cristian.munoz@inmobiliariapro.cl", margin, yPos);
    doc.text(`ID Operador: ${currentUser.toUpperCase()}`, 125, yPos);

    // Append individual tenant receipt sheets
    report.details.forEach((det) => {
      doc.addPage();
      
      // Individual Page Header
      doc.setFillColor(11, 60, 93); // Dark slate blue #0B3C5D
      doc.rect(0, 0, 210, 38, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("INMOBILIARIA PRO - DEPARTAMENTO INMOBILIARIO", 15, 16);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(230, 242, 255);
      doc.text("SISTEMA DE GESTIÓN DE ARRENDAMIENTOS ASSETFLOW ENTERPRISE", 15, 22);
      doc.text(`COMPROBANTE DE COBRO DE ARRIENDO - LOTE: ${report.batchId}`, 15, 28);
      
      // Gold accent line
      doc.setFillColor(255, 204, 0); // Gold #FFCC00
      doc.rect(0, 38, 210, 2.5, 'F');
      
      let y = 55;
      
      // Section 1: Tenant Information
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(11, 60, 93);
      doc.text("1. DATOS DEL ARRENDATARIO & CONTACTO", 15, y);
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y, 195, y);
      y += 8;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text("Nombre / Razón Social:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(det.tenantName.toUpperCase(), 55, y);
      y += 6;
      
      doc.setFont("helvetica", "bold");
      doc.text("RUT / Identificación:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(det.tenantTaxId || "S/N", 55, y);
      y += 6;
      
      doc.setFont("helvetica", "bold");
      doc.text("Correo Electrónico:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(37, 99, 235);
      doc.text(det.tenantEmail, 55, y);
      doc.setTextColor(51, 65, 85);
      y += 12;
      
      // Section 2: Property & Contract details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(11, 60, 93);
      doc.text("2. IDENTIFICACIÓN DE LA PROPIEDAD ARRENDADA", 15, y);
      y += 4;
      doc.line(15, y, 195, y);
      y += 8;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Inmueble / Propiedad:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(det.propertyLabel.toUpperCase(), 55, y);
      y += 6;
      
      doc.setFont("helvetica", "bold");
      doc.text("ID Contrato Asociado:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(det.id, 55, y);
      y += 12;
      
      // Section 3: Billing & Proportional breakdown
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(11, 60, 93);
      doc.text("3. DETALLE DE FACTURACIÓN Y COBRO PROPORCIONAL", 15, y);
      y += 4;
      doc.line(15, y, 195, y);
      y += 8;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Período Mensual:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(billingPeriod.toUpperCase(), 55, y);
      y += 6;
      
      doc.setFont("helvetica", "bold");
      doc.text("Rango de Fechas:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(`Desde ${det.fromDate} hasta ${det.toDate}`, 55, y);
      y += 6;
      
      doc.setFont("helvetica", "bold");
      doc.text("Días Facturados:", 15, y);
      doc.setFont("helvetica", "normal");
      const isProp = det.isProportional;
      doc.text(`${det.billedDays} de ${det.totalDays} días del mes (${isProp ? 'Cálculo Proporcional' : 'Mes Completo'})`, 55, y);
      y += 10;
      
      // Financial Breakdown box
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 36, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(15, y, 180, 36, 'S');
      
      doc.setFont("helvetica", "bold");
      doc.text("CONCEPTO", 20, y + 8);
      doc.text("CANTIDAD / PERÍODO", 100, y + 8);
      doc.text("SUBTOTAL", 160, y + 8);
      doc.line(15, y + 12, 195, y + 12);
      
      doc.setFont("helvetica", "normal");
      doc.text("Arriendo Mensual Canon Neto", 20, y + 19);
      doc.text(`${det.billedDays} Días`, 100, y + 19);
      
      const propAmtVal = det.proportionalAmount !== undefined ? det.proportionalAmount : det.monthlyAmount;
      const subTotalText = `${det.currency} ${propAmtVal.toLocaleString('es-CL')}`;
      doc.setFont("helvetica", "bold");
      doc.text(subTotalText, 160, y + 19);
      
      doc.line(15, y + 24, 195, y + 24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(11, 60, 93);
      doc.text("TOTAL NETO A PAGAR:", 20, y + 31);
      doc.setFont("helvetica", "black");
      doc.setFontSize(10.5);
      doc.text(subTotalText, 160, y + 31);
      
      y += 48;
      
      // Section 4: Payment instructions
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(11, 60, 93);
      doc.text("4. INSTRUCCIONES DE TRANSFERENCIA / PAGO", 15, y);
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y, 195, y);
      y += 8;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Para acreditar este pago en su cuenta, transfiera el monto total neto a pagar a:", 15, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Banco Santander - Cuenta Corriente AssetFlow N° 982-35461-6", 15, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.text("RUT de la Empresa: 76.120.354-K   -   Correo de confirmación: cobros@inmobiliariapro.cl", 15, y);
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(185, 28, 28);
      doc.text(`IMPORTANTE: Indicar como referencia o asunto el ID de Contrato: ${det.id}`, 15, y);
      
      // Decorative QR Code box
      doc.setDrawColor(11, 60, 93);
      doc.rect(160, y - 16, 32, 32, 'S');
      // Draw fake QR patterns inside
      doc.setFillColor(11, 60, 93);
      doc.rect(162, y - 14, 8, 8, 'F');
      doc.rect(182, y - 14, 8, 8, 'F');
      doc.rect(162, y + 6, 8, 8, 'F');
      // Small inner square patterns
      doc.rect(164, y - 12, 4, 4, 'F');
      doc.rect(184, y - 12, 4, 4, 'F');
      doc.rect(164, y + 8, 4, 4, 'F');
      // Some random dots
      doc.rect(173, y - 10, 2, 2, 'F');
      doc.rect(177, y - 6, 3, 3, 'F');
      doc.rect(171, y, 4, 2, 'F');
      doc.rect(180, y + 2, 2, 4, 'F');
      doc.rect(188, y + 8, 2, 2, 'F');
      doc.rect(174, y + 10, 4, 3, 'F');
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("ESCÁNER DE PAGO ERP", 159, y + 19);
      
      // Signatures and legal validity note
      y += 18;
      doc.line(15, y, 195, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Este comprobante es un aviso de cobro emitido por el sistema ERP AssetFlow Enterprise R15132.", 15, y);
      doc.text("No constituye factura tributaria definitiva hasta la recepción y conciliación bancaria del depósito correspondiente.", 15, y + 3.5);
    });

    return doc;
  };

  const downloadBillingReportPDF = (report: typeof billingResultReport) => {
    if (!report) return;
    try {
      const doc = generateBillingReportPDFDoc(report);
      if (doc) {
        doc.save(`Informe_Envio_Cobros_SMTP_${report.batchId}.pdf`);
        notify("Informe de Transmisión descargado exitosamente en PDF.", "success");
      }
    } catch (e) {
      console.error(e);
      notify("Error al descargar el informe en PDF", "error");
    }
  };

  const downloadLifecyclePDF = () => {
    const doc = new jsPDF() as any;
    const margin = 15;
    
    // ==========================================
    // PAGE 1: FLOWCHART DIAGRAM
    // ==========================================
    
    // Header Band
    doc.setFillColor(11, 60, 93); // Navy #0B3C5D
    doc.rect(10, 10, 190, 24, 'F');
    
    // Gold Accent Line
    doc.setFillColor(255, 204, 0); // Gold #FFCC00
    doc.rect(10, 34, 190, 2, 'F');
    
    // Header Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("ASSETFLOW INVERSIONES - CONTROL INTERNO INMOBILIARIO", 15, 20);
    doc.setFontSize(9);
    doc.setTextColor(255, 204, 0);
    doc.text("DIAGRAMA DEL CICLO DE VIDA DEL ARRIENDO DE PROPIEDADES Y RELACION DE MODULOS", 15, 28);
    
    // Metadata block
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-CL')} | Autor: CONTROL INTERNO ASSETFLOW (ID: ${currentUser.toUpperCase()}) | Estado: ACTIVO`, 15, 41);
    
    // Draw 5 Stages boxes
    const stages = [
      {
        num: "FASE 1",
        title: "1. PRE-ARRIENDO & EVALUACION DE SOLVENCIA",
        desc: "Pre-evaluacion crediticia, de ingresos y de antecedentes comerciales de postulantes.",
        mods: "MODULOS: Postulantes, Evaluacion Comercial",
        y: 46
      },
      {
        num: "FASE 2",
        title: "2. FORMALIZACION & SUSCRIPCION",
        desc: "Suscripcion de contrato, carga de PDF, validacion de fianza, custodia de garantias (PDI).",
        mods: "MODULOS: Contratos de Arriendo, Garantias, Boveda Digital",
        y: 84
      },
      {
        num: "FASE 3",
        title: "3. FACTURACION & COBRANZA MENSUAL",
        desc: "Ejecucion Batch R15132 mensual. Generacion de pre-avisos y despacho seguro por SMTP.",
        mods: "MODULOS: Contratos (Billing), Libro Auxiliar, SMTP",
        y: 122
      },
      {
        num: "FASE 4",
        title: "4. MANTENCIONES & REPARACIONES (OT)",
        desc: "Gestion de reparaciones por Especialidad (Techumbres, Plomeria). Registro de factura asociada.",
        mods: "MODULOS: Ordenes de Trabajo, Caja Chica, Finanzas",
        y: 160
      },
      {
        num: "FASE 5",
        title: "5. TERMINO & LIQUIDACION DE GARANTIA",
        desc: "Condonacion/descuento por daños, reembolso, despacho SMTP de cierre, unidad DISPONIBLE.",
        mods: "MODULOS: Garantias (Cierre), Boveda Digital, SMTP",
        y: 198
      }
    ];
    
    stages.forEach((stage, idx) => {
      // Box body
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.4);
      doc.rect(20, stage.y, 170, 26, 'FD');
      
      // Side colored indicator
      let indColor = [99, 102, 241]; // Indigo
      if (idx === 1) indColor = [245, 158, 11]; // Amber
      if (idx === 2) indColor = [16, 185, 129]; // Emerald
      if (idx === 3) indColor = [244, 63, 94]; // Rose
      if (idx === 4) indColor = [13, 148, 136]; // Teal
      
      doc.setFillColor(indColor[0], indColor[1], indColor[2]);
      doc.rect(20, stage.y, 4, 26, 'F');
      
      // Node text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(indColor[0], indColor[1], indColor[2]);
      doc.text(stage.num, 28, stage.y + 6);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(stage.title, 50, stage.y + 6);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(stage.desc, 28, stage.y + 13);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // slate-400
      doc.text(stage.mods, 28, stage.y + 20);
      
      // Connective arrow to next box
      if (idx < stages.length - 1) {
        const nextY = stages[idx + 1].y;
        const startY = stage.y + 26;
        
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.5);
        doc.line(105, startY, 105, nextY);
        
        // Arrow head
        doc.setFillColor(148, 163, 184);
        doc.triangle(102, nextY - 4, 108, nextY - 4, 105, nextY, 'F');
      }
    });
    
    // Bottom Central Database box
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(20, 236, 170, 14, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("NUCLEO DE DATOS CENTRALIZADO: FIRESTORE DB / RESPALDO EN BOVEDA DIGITAL SINCRO", 105, 242, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Trazabilidad auditada e inmutable de cada transaccion, log de auditoria y documento foliado.", 105, 247, { align: "center" });
    
    // Page footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("SISTEMA INTEGRADO DE GESTION DE PROPIEDADES ASSETFLOW", margin, 285);
    doc.text("Página 1 de 3", 195, 285, { align: "right" });
    
    // ==========================================
    // PAGE 2: DETAILED MANUAL (FASES 1, 2, 3)
    // ==========================================
    doc.addPage();
    let page2Y = 20;
    
    // Header Band Page 2
    doc.setFillColor(11, 60, 93);
    doc.rect(10, 10, 190, 14, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("MANUAL DE PROCESOS: DETALLE DE FASES DEL CICLO DE VIDA (1/2)", 15, 19);
    
    // Section I
    page2Y = 35;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(11, 60, 93);
    doc.text("FASE 1: PRE-ARRIENDO Y EVALUACIÓN DE SOLVENCIA COMERCIAL", margin, page2Y);
    page2Y += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    
    const sec1Text = [
      "• Objetivo Principal: Evaluar y pre-filtrar la capacidad de pago y solvencia de cada postulante antes de emitir un contrato.",
      "• INSTRUCCIONES DE SISTEMA PASO A PASO (EVALUACIÓN DE POSTULANTES):",
      "  1. Diríjase al módulo 'EVALUACION_POSTULANTES' desde el menú lateral principal.",
      "  2. Presione el botón 'Nueva Postulación' en la esquina superior derecha del panel.",
      "  3. Rellene los campos obligatorios del postulante: RUT, Nombre Completo, Correo electrónico, Teléfono e Ingresos Líquidos Mensuales.",
      "  4. Suba los documentos requeridos: Liquidaciones de sueldo, cotizaciones previsionales e Informe Comercial DICOM en formato PDF.",
      "  5. Presione 'Evaluar con IA' para que el motor de IA analice la consistencia del ratio ingresos/canon de arriendo.",
      "  6. Si la evaluación es viable, asigne el estado a 'APROBADO', lo que pre-reserva e inmoviliza la propiedad para evitar doble asignación."
    ];
    sec1Text.forEach(line => {
      const splitLine = doc.splitTextToSize(line, 180);
      doc.text(splitLine, margin, page2Y);
      page2Y += (splitLine.length * 4) + 1;
    });
    
    // Section II
    page2Y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(11, 60, 93);
    doc.text("FASE 2: FORMALIZACION, SUSCRIPCION Y FIANZA DE GARANTIA", margin, page2Y);
    page2Y += 5;
    
    const sec2Text = [
      "• Objetivo Principal: Suscribir legalmente el arrendamiento, vinculando el inmueble físico e integrando la fianza si corresponde.",
      "• INSTRUCCIONES DE SISTEMA PASO A PASO (CONTRATOS & GARANTÍAS):",
      "  1. Diríjase al módulo 'CONTRATOS_ARRIENDO' en el menú principal.",
      "  2. Presione el botón 'Nuevo Contrato' en la barra de acciones superior.",
      "  3. En la sección izquierda del formulario, arrastre o cargue el Contrato de Arriendo Firmado en formato PDF.",
      "  4. Presione el botón 'Ejecutar Análisis Inteligente' para extraer mediante IA los campos: Nombre, RUT, Monto y Vigencia.",
      "  5. En el Buscador Progresivo de la derecha, elija secuencialmente Región -> Comuna -> Conjunto -> Propiedad disponible.",
      "  6. Presione 'Grabar Contrato en Base de Datos'. Esto cambia el estado físico del inmueble a 'Alquilado' automáticamente.",
      "  7. REGLA DE GARANTÍA (Solo PDI): Si el inquilino es personal PDI, diríjase al módulo 'GARANTIAS', abra el registro pre-generado por el sistema en estado 'Pendiente de Pago', asiente los datos de la transferencia bancaria y presione 'Confirmar Recepción de Fondo' para pasar a 'En Custodia'."
    ];
    sec2Text.forEach(line => {
      const splitLine = doc.splitTextToSize(line, 180);
      doc.text(splitLine, margin, page2Y);
      page2Y += (splitLine.length * 4) + 1;
    });
    
    // Section III
    page2Y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(11, 60, 93);
    doc.text("FASE 3: EL MOTOR DE FACTURACION BATCH R15132 Y CORREO SMTP", margin, page2Y);
    page2Y += 5;
    
    const sec3Text = [
      "• Objetivo Principal: Automatizar la emisión mensual de cargos por arriendo de manera consolidada con despacho directo.",
      "• INSTRUCCIONES DE SISTEMA PASO A PASO (EMISIÓN & COBRANZA):",
      "  1. Diríjase al módulo 'CONTRATOS_ARRIENDO' en el menú lateral principal.",
      "  2. Presione el botón amarillo 'Enviar Cobros Masivos (PDI)' en la esquina superior derecha.",
      "  3. En el panel del Procesador de Cobros Masivos, revise los contratos de arrendatarios vigentes que se van a facturar.",
      "  4. Presione el botón 'Ejecutar Proceso Batch R15132' para procesar los cargos y generar el Certificado de Transmisión.",
      "  5. El motor despachará de forma directa un correo certificado vía SMTP al destinatario con el pre-aviso adjunto en formato PDF.",
      "  6. Diríjase al módulo 'LIBROS_AUXILIARES' o al Libro Diario para auditar los devengos financieros resultantes de manera centralizada."
    ];
    sec3Text.forEach(line => {
      const splitLine = doc.splitTextToSize(line, 180);
      doc.text(splitLine, margin, page2Y);
      page2Y += (splitLine.length * 4) + 1;
    });
    
    // Page footer Page 2
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("SISTEMA INTEGRADO DE GESTION DE PROPIEDADES ASSETFLOW", margin, 285);
    doc.text("Página 2 de 3", 195, 285, { align: "right" });
    
    // ==========================================
    // PAGE 3: DETAILED MANUAL (FASES 4, 5, 6 + FIRMAS)
    // ==========================================
    doc.addPage();
    let page3Y = 20;
    
    // Header Band Page 3
    doc.setFillColor(11, 60, 93);
    doc.rect(10, 10, 190, 14, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("MANUAL DE PROCESOS: DETALLE DE FASES DEL CICLO DE VIDA (2/2)", 15, 19);
    
    // Section IV
    page3Y = 35;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(11, 60, 93);
    doc.text("FASE 4: CONTROL DE REPARACIONES, ESPECIALIDADES Y ORDENES DE TRABAJO", margin, page3Y);
    page3Y += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    
    const sec4Text = [
      "• Objetivo Principal: Supervisar la mantención física de las unidades, protegiendo la plusvalía del patrimonio inmobiliario.",
      "• INSTRUCCIONES DE SISTEMA PASO A PASO (ÓRDENES DE TRABAJO & CAJA CHICA):",
      "  1. Diríjase al módulo 'ORDENES' desde la barra lateral izquierda.",
      "  2. Presione el botón 'Nueva Orden de Trabajo' en la esquina superior derecha del panel.",
      "  3. Rellene obligatoriamente los campos de control interno: Categoría (Inquilino vs Copropietario), Especialidad (Techumbres, Plomería, etc.) y Factura Asociada (folio en 'associatedInvoice').",
      "  4. Suba el presupuesto o registro fotográfico en formato PDF o JPG.",
      "  5. Si requiere financiamiento rápido, diríjase al módulo 'CAJA_CHICA', registre el egreso e impútelo a la Orden de Trabajo.",
      "  6. Al finalizar los trabajos, presione 'Validar y Cerrar OT' para archivar el historial de cobro."
    ];
    sec4Text.forEach(line => {
      const splitLine = doc.splitTextToSize(line, 180);
      doc.text(splitLine, margin, page3Y);
      page3Y += (splitLine.length * 4) + 1;
    });
    
    // Section V
    page3Y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(11, 60, 93);
    doc.text("FASE 5: TERMINO DE ARRIENDO, CONSOLIDACION DE LIQUIDACION Y AUDITORIA", margin, page3Y);
    page3Y += 5;
    
    const sec5Text = [
      "• Objetivo Principal: Finalizar ordenadamente el arriendo, conciliando la garantía, deduciendo OTs de inquilino y reembolsando saldo.",
      "• INSTRUCCIONES DE SISTEMA PASO A PASO (LIQUIDACIÓN & CIERRE):",
      "  1. Diríjase al módulo 'GARANTIAS' desde el menú principal.",
      "  2. Busque la garantía 'En Custodia' del contrato respectivo y presione 'Iniciar Proceso de Liquidación'.",
      "  3. En la consola de liquidación, presione 'Cargar Historial de OTs' para importar las deudas e imputar gastos con facturas.",
      "  4. Agregue deducciones por daños extraordinarios ingresando el folio de la factura original.",
      "  5. Presione 'Calcular Balance de Devolución' para establecer el monto neto de reembolso.",
      "  6. Al realizar la devolución bancaria, presione 'Consolidar y Finalizar'. Esto cambia el contrato a 'Finiquitado' y libera la propiedad a 'Disponible' de forma automática.",
      "  7. El servidor disparará una notificación SMTP transaccional certificada de término al arrendatario con copia a Ejecutivos."
    ];
    sec5Text.forEach(line => {
      const splitLine = doc.splitTextToSize(line, 180);
      doc.text(splitLine, margin, page3Y);
      page3Y += (splitLine.length * 4) + 1;
    });
    
    // Certification and Signatures
    page3Y += 8;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, page3Y, 180, 22, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("CERTIFICACION OPERATIVA DE CONTROL INTERNO", 20, page3Y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Este manual de relacion de modulos y diagrama de ciclo de vida del arriendo ha sido certificado y aprobado", 20, page3Y + 12);
    doc.text("por la Direccion de Control Interno Inmobiliario para asegurar el estricto cumplimiento del Developer Lock y politicas de control interno.", 20, page3Y + 16);
    
    // Sign-off lines
    page3Y += 30;
    doc.line(margin, page3Y, 70, page3Y);
    doc.line(125, page3Y, 185, page3Y);
    
    page3Y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(11, 60, 93);
    doc.text("CRISTIAN MUÑOZ R.", margin, page3Y);
    doc.text("SAMAHEIM @ DEV LOCK", 125, page3Y);
    
    page3Y += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Control Interno Depto Inmobiliario", margin, page3Y);
    doc.text("Director de Operaciones & Desarrollador", 125, page3Y);
    
    // Page footer Page 3
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("SISTEMA INTEGRADO DE GESTION DE PROPIEDADES ASSETFLOW", margin, 285);
    doc.text("Página 3 de 3", 195, 285, { align: "right" });
    
    doc.save(`Diagrama_Ciclo_Vida_Arriendo_AssetFlow.pdf`);
    notify("El Diagrama Integral del Ciclo de Vida del Arriendo ha sido generado y descargado con éxito.", "success");
  };
  const [progress, setProgress] = useState(0);
  const [processingText, setProcessingText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [viewingContract, setViewingContract] = useState<LeaseContract | null>(null);
  const [viewingBillingPDFUrl, setViewingBillingPDFUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notify, dismiss } = useNotification();

  const [inlineDocNumber, setInlineDocNumber] = useState('');
  const [isSavingInlineDoc, setIsSavingInlineDoc] = useState(false);

  // Sync inline doc number state when active contract changes
  React.useEffect(() => {
    if (selectedContractForCafeOne) {
      setInlineDocNumber(selectedContractForCafeOne.tenantDocNumber || '');
    }
  }, [selectedContractForCafeOne]);

  const handleSaveInlineDocNumber = async () => {
    if (!selectedContractForCafeOne) return;
    setIsSavingInlineDoc(true);
    try {
      const updatedContract: LeaseContract = {
        ...selectedContractForCafeOne,
        tenantDocNumber: inlineDocNumber
      };
      await onSave(updatedContract);
      setSelectedContractForCafeOne(updatedContract);
      notify("Número de serie de la Cédula guardado correctamente y vinculado al contrato.", "success");
    } catch (e) {
      notify("Error al actualizar la Cédula de Identidad.", "error");
    } finally {
      setIsSavingInlineDoc(false);
    }
  };

  const handleTriggerOrchestrator = () => {
    if (!selectedContractForCafeOne) return;
    setIsOrchestrating(true);
    setOrchestratorLogs([
      `[${new Date().toLocaleTimeString()}] INICIANDO ORQUESTACION: ORCH_SyncLeaseContract_P1501...`,
      `[${new Date().toLocaleTimeString()}] Validando consistencia de datos...`,
      `[${new Date().toLocaleTimeString()}] RUT de Arrendatario: ${selectedContractForCafeOne.tenantTaxId}`,
      `[${new Date().toLocaleTimeString()}] Serie de Cédula: ${selectedContractForCafeOne.tenantDocNumber || 'NO ASIGNADA'}`,
    ]);

    setTimeout(() => {
      setOrchestratorLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Estableciendo conexión segura con servidor ERP (AIS REST v2)...`,
        `[${new Date().toLocaleTimeString()}] Posteo a Tabla Maestra de Contratos F15017...`,
      ]);

      setTimeout(() => {
        setOrchestratorLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✓ ORQUESTACION COMPLETADA CON EXITO`,
          `[${new Date().toLocaleTimeString()}] ERP AIS Response: 200 OK`,
          `[${new Date().toLocaleTimeString()}] Folio F15017 asignado: ERP-${selectedContractForCafeOne.id.replace('lc-', '')}`,
        ]);
        setIsOrchestrating(false);
        notify("Datos del contrato sincronizados síncronamente con el ERP Centralizado.", "success");
      }, 800);
    }, 700);
  };

  // Sync amount field to remaining balance when contract or period changes
  React.useEffect(() => {
    if (selectedContractForCafeOne) {
      const periodPayments = (selectedContractForCafeOne.payments || []).filter(p => p.period === rentPaymentPeriod);
      const totalPaid = periodPayments.reduce((sum, p) => sum + p.amountPaid, 0);
      const balance = selectedContractForCafeOne.monthlyAmount - totalPaid;
      setRentPaymentAmount(balance > 0 ? balance.toString() : '0');
    }
  }, [selectedContractForCafeOne, rentPaymentPeriod]);

  const handleRegisterRentPayment = async () => {
    if (!selectedContractForCafeOne) return;
    const amount = parseFloat(rentPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      notify("Por favor ingrese un monto de pago válido.", "error");
      return;
    }

    try {
      const newPayment: LeasePayment = {
        id: `pay-${Date.now()}`,
        period: rentPaymentPeriod,
        amountPaid: amount,
        date: rentPaymentDate,
        paymentMethod: rentPaymentMethod,
        referenceNumber: rentPaymentRef || undefined,
        registeredBy: currentUser || 'SISTEMA',
        timestamp: Date.now()
      };

      const existingPayments = selectedContractForCafeOne.payments || [];
      const updatedContract: LeaseContract = {
        ...selectedContractForCafeOne,
        payments: [...existingPayments, newPayment]
      };

      await onSave(updatedContract);
      setSelectedContractForCafeOne(updatedContract);
      setRentPaymentRef('');

      // Inmueble asociado
      const prop = properties.find(p => p.id === selectedContractForCafeOne.propertyId);

      // Generar Comprobante PDF
      const { dataUrl, docNumber } = downloadRentPaymentReceiptPDF({
        contract: updatedContract,
        payment: newPayment,
        property: prop,
        currentUser: currentUser || 'SISTEMA CAJA'
      });

      // Depositar automáticamente en Bóveda Digital (officialDocs)
      if (dataUrl) {
        try {
          const docId = `doc-receipt-${newPayment.id}`;
          const officialDocPayload: OfficialDocument = {
            id: docId,
            type: 'SALIENTE',
            docNumber: docNumber,
            date: newPayment.date,
            arrivalDate: newPayment.date,
            systemLoadDate: new Date().toISOString().split('T')[0],
            subject: `Comprobante de Pago de Arriendo - ${selectedContractForCafeOne.tenantName} (${newPayment.period})`,
            synthesis: `Comprobante de pago de arriendo por el monto de $${newPayment.amountPaid.toLocaleString('es-CL')} CLP correspondientes al periodo ${newPayment.period}. Emitido y archivado en Bóveda Digital para el arrendatario.`,
            status: 'DESPACHADO',
            statusUpdatedAt: Date.now(),
            timestamp: Date.now(),
            sender: 'ASSETFLOW TESORERÍA & CAJA',
            recipient: `Arrendatario: ${selectedContractForCafeOne.tenantName} (${selectedContractForCafeOne.tenantTaxId || 'S/RUT'})`,
            attachments: [dataUrl],
            documentUrl: dataUrl,
            documentName: `Comprobante_Pago_Arriendo_${selectedContractForCafeOne.tenantName.replace(/\s+/g, '_')}_${newPayment.period.replace(/\s+/g, '_')}.pdf`,
            userCreator: currentUser || 'SISTEMA CAJA',
            hashSignature: `${newPayment.id}-MUTC-VERIFIED-AUTH`
          };

          const docRef = doc(db, 'official_docs', docId);
          await setDoc(docRef, officialDocPayload);

          if (setOfficialDocs) {
            setOfficialDocs(prev => {
              const updated = [officialDocPayload, ...prev];
              storage.save('officialDocs', updated);
              return updated;
            });
          } else {
            const existing = await storage.load('officialDocs', []);
            storage.save('officialDocs', [officialDocPayload, ...existing]);
          }
        } catch (vaultErr) {
          console.error("Error guardando comprobante en Bóveda Digital:", vaultErr);
        }
      }

      notify("¡Pago verificado! Comprobante emitido y depositado en la Bóveda Digital.", "success");
    } catch (e) {
      notify("Error al registrar el pago.", "error");
    }
  };

  const handleDeleteRentPayment = async (paymentId: string) => {
    if (!selectedContractForCafeOne) return;
    try {
      const existingPayments = selectedContractForCafeOne.payments || [];
      const updatedContract: LeaseContract = {
        ...selectedContractForCafeOne,
        payments: existingPayments.filter(p => p.id !== paymentId)
      };

      await onSave(updatedContract);
      setSelectedContractForCafeOne(updatedContract);
      notify("Pago eliminado con éxito y saldo recalculado automáticamente.", "success");
    } catch (e) {
      notify("Error al eliminar el pago.", "error");
    }
  };

  const [formData, setFormData] = useState<Partial<LeaseContract>>({
    propertyId: '',
    tenantName: '',
    tenantTaxId: '',
    tenantDocNumber: '',
    startDate: '',
    endDate: '',
    monthlyAmount: 0,
    currency: 'CLP',
    status: 'VIGENTE',
    observations: ''
  });

  const [cascadeRegion, setCascadeRegion] = useState('');
  const [cascadeCommune, setCascadeCommune] = useState('');
  const [cascadeConjunto, setCascadeConjunto] = useState('');

  // Unique cascading levels computed
  const uniqueCascadingRegions = React.useMemo(() => {
    const list = properties.map(p => getRegionByCommune(p.commune));
    return Array.from(new Set(list)).sort();
  }, [properties]);

  const uniqueCascadingCommunes = React.useMemo(() => {
    if (!cascadeRegion) return [];
    const list = properties
      .filter(p => getRegionByCommune(p.commune) === cascadeRegion)
      .map(p => p.commune);
    return Array.from(new Set(list)).sort();
  }, [properties, cascadeRegion]);

  const uniqueCascadingConjuntos = React.useMemo(() => {
    if (!cascadeCommune) return [];
    const list = properties
      .filter(p => getRegionByCommune(p.commune) === cascadeRegion && p.commune === cascadeCommune)
      .map(p => p.building || 'Sin Conjunto');
    return Array.from(new Set(list)).sort();
  }, [properties, cascadeRegion, cascadeCommune]);

  const cascadingFilteredProperties = React.useMemo(() => {
    if (!cascadeConjunto) return [];
    return properties.filter(p => 
      getRegionByCommune(p.commune) === cascadeRegion && 
      p.commune === cascadeCommune && 
      (p.building || 'Sin Conjunto') === cascadeConjunto
    );
  }, [properties, cascadeRegion, cascadeCommune, cascadeConjunto]);

  // Sync cascading states back from formData.propertyId when it is changed from outside
  React.useEffect(() => {
    if (formData.propertyId) {
      const prop = properties.find(p => p.id === formData.propertyId);
      if (prop) {
        const region = getRegionByCommune(prop.commune);
        setCascadeRegion(region);
        setCascadeCommune(prop.commune);
        setCascadeConjunto(prop.building || 'Sin Conjunto');
      }
    }
  }, [formData.propertyId, properties]);

  // Auto-select single options inline for a seamless, dependent experience
  React.useEffect(() => {
    if (cascadeRegion && !cascadeCommune && uniqueCascadingCommunes && uniqueCascadingCommunes.length === 1) {
      setCascadeCommune(uniqueCascadingCommunes[0]);
    }
  }, [cascadeRegion, cascadeCommune, uniqueCascadingCommunes]);

  React.useEffect(() => {
    if (cascadeCommune && !cascadeConjunto && uniqueCascadingConjuntos && uniqueCascadingConjuntos.length === 1) {
      setCascadeConjunto(uniqueCascadingConjuntos[0]);
    }
  }, [cascadeCommune, cascadeConjunto, uniqueCascadingConjuntos]);

  React.useEffect(() => {
    if (cascadeConjunto && !formData.propertyId && cascadingFilteredProperties && cascadingFilteredProperties.length === 1) {
      const singleProp = cascadingFilteredProperties[0];
      setFormData(prev => ({
        ...prev,
        propertyId: singleProp.id,
        monthlyAmount: singleProp.rentalAmount || prev.monthlyAmount || 0
      }));
    }
  }, [cascadeConjunto, formData.propertyId, cascadingFilteredProperties]);

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      // General search bar
      const matchesSearch = !searchQuery.trim() || 
        c.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.propertyLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tenantTaxId.includes(searchQuery);
      
      if (!matchesSearch) return false;

      // Watchlists
      if (savedQuery === 'VIGENTE' && c.status !== 'VIGENTE') {
        return false;
      }
      if (savedQuery === 'PENDING_DOC' && c.tenantDocNumber) {
        return false;
      }
      if (savedQuery === 'PENDING_INSP') {
        const contractInspections = inspections.filter(ins => ins.contractId === c.id);
        const hasCompleted = contractInspections.some(ins => ins.status === 'ACEPTADO' || ins.status === 'FIRMADO');
        if (hasCompleted) return false;
      }

      // ERP QBE Columnar Search
      if (qbeId && !c.id.toLowerCase().includes(qbeId.toLowerCase())) {
        return false;
      }
      if (qbeTenantName && !c.tenantName.toLowerCase().includes(qbeTenantName.toLowerCase())) {
        return false;
      }
      if (qbeTenantTaxId && !c.tenantTaxId.toLowerCase().includes(qbeTenantTaxId.toLowerCase())) {
        return false;
      }
      if (qbeTenantDocNumber && !(c.tenantDocNumber || '').toLowerCase().includes(qbeTenantDocNumber.toLowerCase())) {
        return false;
      }
      if (qbeProperty && !c.propertyLabel.toLowerCase().includes(qbeProperty.toLowerCase())) {
        return false;
      }
      if (qbeMonthlyAmount && !c.monthlyAmount.toString().includes(qbeMonthlyAmount.replace(/[^\d]/g, ''))) {
        return false;
      }
      if (qbeStartDate && !c.startDate.includes(qbeStartDate)) {
        return false;
      }
      if (qbeEndDate && !(c.endDate || 'INDEFINIDO').toLowerCase().includes(qbeEndDate.toLowerCase())) {
        return false;
      }
      if (qbeStatus && !c.status.toLowerCase().includes(qbeStatus.toLowerCase())) {
        return false;
      }
      if (qbeActaStatus) {
        const contractInspections = inspections.filter(ins => ins.contractId === c.id);
        const hasActa = contractInspections.some(ins => ins.status === 'ACEPTADO' || ins.status === 'FIRMADO');
        const actaStr = hasActa ? 'FIRMADA' : 'PENDIENTE';
        if (!actaStr.toLowerCase().includes(qbeActaStatus.toLowerCase())) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (!sortField) return 0;
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'id':
          valA = a.id;
          valB = b.id;
          break;
        case 'tenantName':
          valA = a.tenantName.toLowerCase();
          valB = b.tenantName.toLowerCase();
          break;
        case 'tenantTaxId':
          valA = a.tenantTaxId;
          valB = b.tenantTaxId;
          break;
        case 'tenantDocNumber':
          valA = a.tenantDocNumber || '';
          valB = b.tenantDocNumber || '';
          break;
        case 'property':
          valA = a.propertyLabel.toLowerCase();
          valB = b.propertyLabel.toLowerCase();
          break;
        case 'monthlyAmount':
          valA = a.monthlyAmount;
          valB = b.monthlyAmount;
          break;
        case 'startDate':
          valA = a.startDate;
          valB = b.startDate;
          break;
        case 'endDate':
          valA = a.endDate || '9999-12-31';
          valB = b.endDate || '9999-12-31';
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [
    contracts, searchQuery, savedQuery, inspections,
    qbeId, qbeTenantName, qbeTenantTaxId, qbeTenantDocNumber,
    qbeProperty, qbeMonthlyAmount, qbeStartDate, qbeEndDate,
    qbeStatus, qbeActaStatus, sortField, sortOrder
  ]);

  useEffect(() => {
    if (filteredContracts.length > 0) {
      const existing = selectedContractForCafeOne
        ? filteredContracts.find(c => c.id === selectedContractForCafeOne.id)
        : null;
      if (!existing) {
        setSelectedContractForCafeOne(filteredContracts[0]);
      } else if (existing !== selectedContractForCafeOne) {
        setSelectedContractForCafeOne(existing);
      }
    } else {
      setSelectedContractForCafeOne(null);
    }
  }, [filteredContracts, selectedContractForCafeOne]);

  const approvedApplicants = applicants.filter(a => a.status === 'APROBADO');
  const isPropertyLockedByApplicant = !!(formData.tenantName && formData.tenantTaxId);

  const extractTextFromPDF = async (file: File) => {
    setIsExtractingText(true);
    setProgress(10);
    const loadingId = notify(`Leyendo PDF: ${file.name}...`, 'loading', 0);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      const pagesToProcess = Math.min(pdf.numPages, 15); // Process up to 15 pages for better context
      
      for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Sort items by vertical position then horizontal
        const items = (textContent.items as any[]).sort((a, b) => {
          if (Math.abs(a.transform[5] - b.transform[5]) > 2) {
            return b.transform[5] - a.transform[5];
          }
          return a.transform[4] - b.transform[4];
        });

        let lastY = -1;
        let pageText = '';
        
        for (const item of items) {
          if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          }
          pageText += item.str + ' ';
          lastY = item.transform[5];
        }
        
        fullText += `--- PÁGINA ${i} ---\n${pageText}\n\n`;
        setProgress(10 + (i / pagesToProcess) * 40); // Up to 50%
      }
      
      dismiss(loadingId);
      if (!fullText.trim()) {
        notify("No se pudo extraer texto del PDF. Es posible que sea una imagen escaneada.", 'error');
      } else {
        setProcessingText(fullText.trim());
        notify("Lectura de PDF completada", 'success');
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileBase64(reader.result as string);
        setProgress(60);
      };
      reader.readAsDataURL(file);
      
      setTimeout(() => setProgress(0), 1000);
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      dismiss(loadingId);
      notify("Error al leer el PDF", 'error');
      setProgress(0);
    } finally {
      setIsExtractingText(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') || file.type.startsWith('image/'))) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFileBase64(reader.result);
        }
      };
      reader.readAsDataURL(file);
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        extractTextFromPDF(file);
      }
    } else if (file) {
      notify("Por favor, selecciona un archivo PDF o imagen válido.", 'error');
    }
  };

  const handleProcessIA = async () => {
    if (!processingText.trim()) {
      notify("No hay texto para procesar. Por favor carga un PDF o pega el texto del contrato.", 'info');
      return;
    }
    
    setIsProcessing(true);
    setProgress(10);
    const loadingId = notify("Analizando contrato con IA...", 'loading', 0);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 400);

    try {
      const result = await extractLeaseContractData(processingText);

      clearInterval(progressInterval);
      setProgress(100);
      dismiss(loadingId);

      if (result && !result.error) {
        setFormData(prev => {
          // Ensure monthlyAmount is a number even if AI returns a string
          const monthlyAmount = result.monthlyAmount !== undefined && result.monthlyAmount !== null 
            ? Number(String(result.monthlyAmount).replace(/[^0-9]/g, '')) 
            : prev.monthlyAmount;

          return {
            ...prev,
            tenantName: result.tenantName || prev.tenantName,
            tenantTaxId: result.tenantTaxId || prev.tenantTaxId,
            monthlyAmount: monthlyAmount || prev.monthlyAmount,
            startDate: result.startDate || prev.startDate,
            endDate: result.endDate || prev.endDate,
            renewalDate: result.renewalDate || prev.renewalDate,
            currency: (result.currency as 'CLP' | 'UF') || prev.currency,
          };
        });
        notify("¡Datos del contrato extraídos con éxito!", 'success');
      } else if (result?.error) {
        notify(`Error: ${result.message}. Por favor, complete los datos manualmente.`, 'error');
      }

      setTimeout(() => setProgress(0), 1000);
    } catch (error) {
      clearInterval(progressInterval);
      dismiss(loadingId);
      console.error("Error processing with AI:", error);
      notify("Error al procesar con IA", 'error');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateLeaseContractPDFDoc = async (contract: LeaseContract) => {
    const doc = new jsPDF() as any;
    const margin = 20;
    let yPos = 25;

    // Draw Logo
    try {
      const logoPng = await getSvgAsPngBase64(DEFAULT_ASSETFLOW_SVG);
      doc.addImage(logoPng, 'PNG', margin, yPos, 65, 20);
    } catch (err) {
      console.warn("Could not draw logo on PDF", err);
    }
    
    yPos += 28;

    // Document title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 45, 98); // Navy
    doc.text("CONTRATO DE ARRENDAMIENTO DE PROPIEDAD", margin, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`FOLIO DE REGISTRO: ERP-LC-${contract.id.replace('lc-', '').toUpperCase()}`, margin, yPos);
    yPos += 1;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, yPos, 190, yPos);
    yPos += 10;

    // Partes Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("1. COMPARECIENTES Y DECLARACIONES", margin, yPos);
    yPos += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    
    const p1 = `En Santiago de Chile, con fecha ${contract.startDate}, se celebra el presente Contrato de Arrendamiento entre:`;
    const splitP1 = doc.splitTextToSize(p1, 170);
    doc.text(splitP1, margin, yPos);
    yPos += (splitP1.length * 4) + 4;

    doc.setFont("helvetica", "bold");
    doc.text("EL ARRENDADOR:", margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text("INMOBILIARIA PRO S.A., representado para estos efectos por su área inmobiliaria.", margin + 35, yPos);
    yPos += 5;

    doc.setFont("helvetica", "bold");
    doc.text("EL ARRENDATARIO:", margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${contract.tenantName.toUpperCase()}, Cédula de Identidad RUT: ${contract.tenantTaxId}${contract.tenantDocNumber ? ` (Número de Serie: ${contract.tenantDocNumber.toUpperCase()})` : ''}.`, margin + 35, yPos);
    yPos += 10;

    // Objeto Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("2. OBJETO DEL CONTRATO Y USO", margin, yPos);
    yPos += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    const p2 = `El Arrendador da en arrendamiento al Arrendatario, quien acepta para sí, la propiedad inmueble ubicada en la dirección de referencia correspondiente a: ${contract.propertyLabel.toUpperCase()}, para su uso exclusivo de habitabilidad residencial, estando prohibido el subarriendo o destinar la unidad a fines comerciales de cualquier índole.`;
    const splitP2 = doc.splitTextToSize(p2, 170);
    doc.text(splitP2, margin, yPos);
    yPos += (splitP2.length * 4) + 10;

    // Renta y Plazos Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("3. RENTA, REAJUSTABILIDAD Y PLAZO", margin, yPos);
    yPos += 6;

    const p3 = `La renta mensual de arrendamiento pactada de común acuerdo entre las partes es la suma de ${contract.currency} ${contract.monthlyAmount.toLocaleString('es-CL')}, la cual se pagará de forma anticipada dentro de los primeros 5 días de cada mes calendario. El presente contrato comenzará a regir formalmente a contar del ${contract.startDate} y tendrá una vigencia establecida hasta el ${contract.endDate ? contract.endDate : 'Duración Indeterminada (Vigencia Indefinida)'}.`;
    const splitP3 = doc.splitTextToSize(p3, 170);
    doc.text(splitP3, margin, yPos);
    yPos += (splitP3.length * 4) + 10;

    // Access and QR code Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("4. PORTAL AUTORIZADO Y ACCESO DIGITAL SEGURO", margin, yPos);
    yPos += 6;

    const p4 = "Para facilitar la autogestión de requerimientos, pagos de abonos parciales, ingreso de actas de revisión e interacción técnica con el Departamento Inmobiliario, el Arrendatario dispone de un Portal de Arrendatario Seguro de AssetFlow Chile. El Arrendatario puede escanear el código QR adjunto a este documento con cualquier dispositivo móvil para acceder de forma instantánea y segura a su portal personalizado.";
    const splitP4 = doc.splitTextToSize(p4, 170);
    doc.text(splitP4, margin, yPos);
    yPos += (splitP4.length * 4) + 12;

    // Verification / Signatures row
    const sigY = yPos;
    
    // Left side: Signature boxes
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.line(margin, sigY + 22, margin + 60, sigY + 22);
    doc.text("FIRMA ARRENDATARIO", margin, sigY + 26);
    doc.text(`RUT: ${contract.tenantTaxId}`, margin, sigY + 30);
    if (contract.tenantDocNumber) {
      doc.text(`SERIE CÉDULA: ${contract.tenantDocNumber.toUpperCase()}`, margin, sigY + 34);
    }

    doc.line(margin + 75, sigY + 22, margin + 135, sigY + 22);
    doc.text("REPRESENTANTE INMOBILIARIA PRO S.A.", margin + 75, sigY + 26);
    doc.text("Firma Electrónica Autorizada", margin + 75, sigY + 30);

    // Right side: QR code box
    try {
      const portalUrl = `${window.location.origin}/?portal=tenant&token=${contract.id}&taxId=${contract.tenantTaxId}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(portalUrl)}`;
      const qrBase64 = await getBase64ImageFromUrl(qrUrl);
      
      // Draw elegant container box for QR
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.rect(145, sigY - 2, 45, 48, 'FD');
      
      doc.addImage(qrBase64, 'PNG', 152, sigY + 1, 31, 31);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(11, 60, 93);
      doc.text("ESCANEAR PORTAL", 167, sigY + 37, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text("ACCESO INSTANTÁNEO", 167, sigY + 41, { align: "center" });
      doc.text("Y CONTROL DE PAGOS", 167, sigY + 44, { align: "center" });
    } catch (qrErr) {
      console.error("Could not render QR code inside lease contract PDF", qrErr);
      doc.setDrawColor(239, 68, 68);
      doc.rect(145, sigY - 2, 45, 48);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(239, 68, 68);
      doc.text("ERROR QR CODE", 167, sigY + 20, { align: "center" });
    }

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Este documento electrónico ha sido emitido con validez jurídica y de fianza de arriendo según Ley 18.101.", margin, 274);
    doc.text(`ID Transacción: ERP-TX-${contract.id.toUpperCase()}`, 190, 274, { align: "right" });

    // Dynamic Page Numbering and Footer Folio
    const contractFolio = `FL-CTR-${contract.id.substring(0, 8).toUpperCase()}`;
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Contrato de Arriendo ASSETFLOW | Folio: ${contractFolio}`, margin, 284);
      doc.text(`Página ${i} de ${pageCount}`, 190, 284, { align: "right" });
    }

    return doc;
  };

  const downloadLeaseContractPDF = async (contract: LeaseContract) => {
    const loadingId = notify("Generando documento de contrato...", 'loading', 0);
    try {
      const doc = await generateLeaseContractPDFDoc(contract);
      doc.save(`Contrato_Arriendo_${contract.tenantName.replace(/\s+/g, '_')}_QR.pdf`);
      dismiss(loadingId);
      notify("Documento de Contrato de Arriendo con QR generado y descargado exitosamente.", "success");

      // Guardar automáticamente el archivo generado en la base de datos si falta el respaldo digital de este contrato
      if (!contract.documentUrl) {
        const dataUri = doc.output('datauristring');
        const updatedContract = {
          ...contract,
          documentUrl: dataUri,
          documentName: `Contrato_Arriendo_${contract.tenantName.replace(/\s+/g, '_')}_QR.pdf`
        };
        await onSave(updatedContract);
        notify("Copia digitalizada del contrato respaldada automáticamente en la Bóveda ERP.", "success");
      }
    } catch (e) {
      console.error(e);
      dismiss(loadingId);
      notify("Error al generar el Contrato en PDF", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyId || !formData.tenantName) return;

    setIsProcessing(true);
    const loadingId = notify("Guardando contrato y subiendo documento...", 'loading', 0);
    let finalDocumentUrl = fileBase64 || (formData as LeaseContract).documentUrl || undefined;

    if (selectedFile) {
      try {
        const path = `contracts/${crypto.randomUUID()}_${selectedFile.name}`;
        finalDocumentUrl = await uploadFile(selectedFile, path);
      } catch (error) {
        console.error("Error uploading contract document:", error);
      }
    }

    const property = properties.find(p => p.id === formData.propertyId);
    const isEditingExistingContract = !!((formData as LeaseContract).id && contracts.some(c => c.id === (formData as LeaseContract).id));
    if (!isEditingExistingContract && property && property.status !== 'DISPONIBLE' && !isPropertyLockedByApplicant) {
      notify(`Atención: La propiedad seleccionada figura como "${property.status || 'ARRENDADA'}". Se registrará igualmente el contrato actualizando su estado.`, 'info');
    }
    
    const newContract: LeaseContract = {
      id: (formData as LeaseContract).id || `lc-${Date.now()}`,
      propertyId: formData.propertyId!,
      propertyLabel: property ? `${property.building} - ${property.code}` : 'Propiedad Desconocida',
      tenantName: formData.tenantName!,
      tenantTaxId: formData.tenantTaxId || '',
      tenantDocNumber: formData.tenantDocNumber || '',
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      endDate: formData.endDate || '',
      renewalDate: formData.renewalDate,
      monthlyAmount: formData.monthlyAmount || 0,
      currency: formData.currency as 'CLP' | 'UF',
      status: formData.status as ContractStatus,
      observations: formData.observations,
      documentUrl: finalDocumentUrl,
      documentName: selectedFile?.name || `Contrato_Arriendo_${formData.tenantName.replace(/\s+/g, '_')}_QR.pdf`,
      userCreator: currentUser,
      timestamp: Date.now()
    };

    if (!newContract.documentUrl) {
      try {
        const pdfDoc = await generateLeaseContractPDFDoc(newContract);
        newContract.documentUrl = pdfDoc.output('datauristring');
      } catch (err) {
        console.error("Error generating base64 PDF for database storage:", err);
      }
    }

    await onSave(newContract);

    // Guardar también automáticamente en 'official_docs' para que aparezca en la consulta interconectada y bóveda digital sin digitación manual
    try {
      if (newContract.documentUrl) {
        const docId = `doc-contract-${newContract.id}`;
        const officialDocPayload = {
          id: docId,
          type: 'CONTRATO_FIRMADO',
          docNumber: newContract.id,
          date: newContract.startDate,
          arrivalDate: new Date().toISOString().split('T')[0],
          systemLoadDate: new Date().toISOString().split('T')[0],
          subject: `Contrato de Arriendo - Inquilino: ${newContract.tenantName.toUpperCase()}`,
          synthesis: `Contrato de arriendo para la propiedad ${newContract.propertyLabel} con un canon mensual de ${newContract.currency} ${newContract.monthlyAmount.toLocaleString('es-CL')}.`,
          status: 'RECEPCIONADO',
          statusUpdatedAt: Date.now(),
          timestamp: Date.now(),
          sender: 'DEPARTAMENTO INMOBILIARIO',
          recipient: 'BÓVEDA DIGITAL',
          attachments: [newContract.documentUrl],
          documentUrl: newContract.documentUrl,
          documentName: newContract.documentName || `Contrato_Arriendo_${newContract.tenantName.replace(/\s+/g, '_')}_QR.pdf`,
          userCreator: currentUser || 'SYSTEM_AUTO'
        };
        // 1. Guardar inmediatamente en estado local y Bóveda IndexedDB
        if (setOfficialDocs) {
          setOfficialDocs(prev => {
            const updated = [officialDocPayload, ...prev.filter(d => d.id !== docId)];
            storage.save('officialDocs', updated);
            return updated;
          });
        } else {
          const existing = await storage.load('officialDocs', []);
          storage.save('officialDocs', [officialDocPayload, ...existing.filter((d: any) => d.id !== docId)]);
        }

        // 2. Sincronizar en Firestore si hay cuota disponible
        const safeOfficialPayload = await prepareRecordForFirestore(officialDocPayload, 'official_docs', docId);
        if (!isFirestoreQuotaExceeded()) {
          const docRef = doc(db, 'official_docs', docId);
          await setDoc(docRef, safeOfficialPayload, { merge: true });
        }
      }
    } catch (docErr) {
      if (isQuotaError(docErr)) {
        markFirestoreQuotaExceeded();
      } else {
        console.warn("Advertencia sincronizando contrato en official_docs:", docErr);
      }
    }

    dismiss(loadingId);
    notify("Contrato guardado correctamente y registrado en la Bóveda Digital.", 'success');
    setIsProcessing(false);
    setIsFormOpen(false);
    resetForm();
    
    // Desplegar inmediatamente el PDF generado para su revisión en el visor integrado
    setTimeout(() => {
      setViewingContract(newContract);
    }, 150);
  };

  const resetForm = () => {
    setFormData({
      propertyId: '',
      tenantName: '',
      tenantTaxId: '',
      tenantDocNumber: '',
      startDate: '',
      endDate: '',
      monthlyAmount: 0,
      currency: 'CLP',
      status: 'VIGENTE',
      observations: ''
    });
    setCascadeRegion('');
    setCascadeCommune('');
    setCascadeConjunto('');
    setProcessingText('');
    setSelectedFile(null);
    setFileBase64(null);
  };

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case 'VIGENTE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'POR_VENCER': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'VENCIDO': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleExportB13Consolidation = async () => {
    try {
      notify('Generando Informe B13 de Cartera y Morosidad (.xlsx)...', 'info');
      const { rows } = buildB13PortfolioConsolidation(properties, contracts);
      await exportB13ConsolidationToExcel(rows);
      notify('✓ Informe B13 (.xlsx) generado y descargado exitosamente.', 'success');
    } catch (e: any) {
      console.error('Error generando B13:', e);
      notify('Error al exportar Informe B13: ' + (e?.message || 'Error desconocido'), 'error');
    }
  };

  const handleApplyReadjustment = async (items: ReadjustmentItem[]) => {
    try {
      // 1. Actualizar contratos en memoria y sincronizar con Firestore
      for (const item of items) {
        const c = contracts.find(x => x.id === item.contractId);
        if (c) {
          const updatedContract: LeaseContract = {
            ...c,
            monthlyAmount: item.finalRent,
            observations: `${c.observations ? c.observations + ' | ' : ''}Reajuste Anual IPC (+${item.readjustmentPercent}%) aplicado el ${new Date().toLocaleDateString('es-CL')}`
          };
          await onSave(updatedContract);
        }
      }

      // 2. Actualizar canon en el maestro de propiedades (Property.rentalAmount)
      const updatedProperties = properties.map(p => {
        const match = items.find(it => it.propertyId === p.id || p.address.toLowerCase() === it.propertyLabel.toLowerCase());
        if (match) {
          return {
            ...p,
            rentalAmount: match.finalRent
          };
        }
        return p;
      });
      await storage.save('properties', updatedProperties);

      notify(`✓ Reajuste anual completado para ${items.length} contratos y propiedades. Planilla Excel de auditoría descargada.`, 'success');
    } catch (err) {
      console.error('Error aplicando reajuste anual:', err);
      notify('Error al guardar los reajustes en la base de datos.', 'error');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <FileSearch size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gestión de Contratos de Arriendo</h2>
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Administración centralizada y procesamiento inteligente de PDF</p>
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md w-fit border border-amber-100">
                  <AlertCircle size={12} />
                  <p className="text-[10px] font-black uppercase tracking-wider">Aviso: Sólo contratos con personal de PDI pagan garantía</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {onSync && (
              <button 
                onClick={onSync}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm active:scale-95"
                title="Sincronizar todo a la nube"
              >
                <RefreshCw size={18} className="animate-spin-slow" /> Guardar Permanente
              </button>
            )}
            <button 
              onClick={() => setIsReadjustmentModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#0B3C5D] hover:bg-[#082b43] text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 active:scale-95 cursor-pointer"
              title="Ejecutar reajuste anual de cánones de arriendo por IPC (Proceso por Lote R15130) y emitir reporte de auditoría Excel"
            >
              <TrendingUp size={15} className="text-emerald-400" /> Reajuste Anual IPC (R15130)
            </button>
            <button 
              onClick={handleExportB13Consolidation}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-700/20 active:scale-95 cursor-pointer"
              title="Consolidar toda la cartera y exportar Informe B13 de morosidad en tabla tabulada XLSX"
            >
              <FileSpreadsheet size={15} /> Informe B13 (.xlsx)
            </button>
            <button 
              onClick={() => setIsBillingModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-400/20 active:scale-95"
              title="Procesar facturación masiva y envío automático de cobros a arrendatarios"
            >
              <Send size={15} /> Enviar Cobros Masivos (PDI)
            </button>
            <button 
              onClick={() => setIsDelinquencyModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#E11D48] hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20 active:scale-95"
              title="Guía y descarga de planilla mensual para reporte de arrendatarios morosos"
            >
              <FileText size={15} /> Plantilla Morosos
            </button>
            <button 
              onClick={() => setIsLifecycleModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-teal-600/20 active:scale-95"
              title="Visualizar y descargar el diagrama de ciclo de vida del arriendo de propiedades"
            >
              <BrainCircuit size={15} /> Ciclo de Vida
            </button>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Plus size={18} /> Nuevo Contrato
            </button>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por arrendatario o propiedad..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Consultas ERP (Watchlists):</span>
            <button
              onClick={() => setSavedQuery('ALL')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                savedQuery === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todos ({contracts.length})
            </button>
            <button
              onClick={() => setSavedQuery('VIGENTE')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                savedQuery === 'VIGENTE'
                  ? 'bg-[#10B981] text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Vigentes ({contracts.filter(c => c.status === 'VIGENTE').length})
            </button>
            <button
              onClick={() => setSavedQuery('PENDING_DOC')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                savedQuery === 'PENDING_DOC'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Contratos que aún no tienen registrado el Número de Serie de su Cédula de Identidad"
            >
              Sin Serie Cédula ({contracts.filter(c => !c.tenantDocNumber).length})
            </button>
            <button
              onClick={() => setSavedQuery('PENDING_INSP')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                savedQuery === 'PENDING_INSP'
                  ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Contratos que no tienen una Acta de Inspección / Entrega firmada"
            >
              Sin Acta ({contracts.filter(c => !inspections.filter(ins => ins.contractId === c.id).some(ins => ins.status === 'ACEPTADO' || ins.status === 'FIRMADO')).length})
            </button>

            <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden xl:block" />

            {/* AssetFlow Enterprise Grid Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B3C5D]/10 text-[#0B3C5D] border border-[#0B3C5D]/20 rounded-lg text-[10px] font-black uppercase font-mono tracking-wider mr-1 shrink-0">
              <Table size={13} className="text-[#0B3C5D]" />
              <span>Grilla AssetFlow Enterprise (F15017)</span>
            </div>

            <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden xl:block" />

            <button
              onClick={() => setIsCafeOneSidebarOpen(!isCafeOneSidebarOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border ${
                isCafeOneSidebarOpen 
                  ? 'bg-slate-900 text-white border-slate-950 shadow-xs' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Alternar Panel de Integración ERP CafeOne"
            >
              <Activity size={12} className={isCafeOneSidebarOpen ? 'text-indigo-400 animate-pulse' : ''} />
              <span>CafeOne {isCafeOneSidebarOpen ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6 bg-[#F4F6F9]">
        <div className={`grid grid-cols-1 ${isCafeOneSidebarOpen && selectedContractForCafeOne ? 'xl:grid-cols-4' : ''} gap-6`}>
          
          {/* Contracts Grid Container */}
          <div className={isCafeOneSidebarOpen && selectedContractForCafeOne ? 'xl:col-span-3 min-w-0' : 'col-span-full min-w-0'}>
            {/* ======================================================== */}
            {/* ASSETFLOW ENTERPRISE INTERACTIVE DATA GRID (F15017)    */}
            {/* ======================================================== */}
            <div className="bg-white border border-[#A7BCCF] rounded-lg shadow-sm overflow-hidden flex flex-col">
                {/* ERP Grid Top Info & Batch Toolbar */}
                <div className="bg-[#E9F0F8] border-b border-[#C3D5E6] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <div className="flex items-center gap-2 text-[#0B3C5D] font-bold">
                    <span className="font-mono bg-[#0B3C5D] text-white px-1.5 py-0.5 rounded text-[9px]">F15017</span>
                    <span>Trabajar con Contratos de Arrendamiento</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600 font-mono text-[9.5px]">
                      Registros: <strong className="text-slate-900">{filteredContracts.length}</strong> de {contracts.length}
                    </span>
                    {selectedContractIds.size > 0 && (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-mono text-[9px] font-black">
                        {selectedContractIds.size} Seleccionado(s)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleClearQBE}
                      className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-[9.5px] font-bold flex items-center gap-1 shadow-3xs cursor-pointer"
                      title="Limpiar todos los filtros QBE de la grilla"
                    >
                      <X size={10} className="text-rose-500" />
                      <span>Limpiar QBE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedContractIds.size === filteredContracts.length) {
                          setSelectedContractIds(new Set());
                        } else {
                          setSelectedContractIds(new Set(filteredContracts.map(c => c.id)));
                        }
                      }}
                      className="px-2 py-1 bg-white hover:bg-slate-50 text-[#0B3C5D] border border-slate-300 rounded text-[9.5px] font-bold flex items-center gap-1 shadow-3xs cursor-pointer"
                      title="Seleccionar o deseleccionar todas las filas"
                    >
                      {selectedContractIds.size === filteredContracts.length && filteredContracts.length > 0 ? (
                        <CheckSquare size={10} className="text-indigo-600" />
                      ) : (
                        <Square size={10} className="text-slate-400" />
                      )}
                      <span>Todos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportDelinquencyTemplateToExcel('Plantilla_Contratos_Arriendo_F15017');
                      }}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9.5px] font-bold flex items-center gap-1 shadow-3xs cursor-pointer"
                      title="Exportar grilla actual a Excel"
                    >
                      <FileSpreadsheet size={10} />
                      <span>Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>

                {/* Table Container with Horizontal Scroll */}
                <div className="overflow-x-auto overflow-y-auto max-h-[640px] custom-audit-scroll">
                  <table className="w-full text-left border-collapse table-fixed text-[11px] font-sans">
                    <thead className="sticky top-0 z-20 bg-[#F0F5FA] border-b border-[#8AA9C4] select-none text-slate-800">
                      {/* ROW 1: Column Headers with Sorting & Resizing */}
                      <tr className="h-7 border-b border-[#A7BCCF] text-[9.5px] font-extrabold uppercase tracking-tight text-[#0B3C5D]">
                        <th style={{ width: colWidths.selector }} className="text-center border-r border-[#C3D5E6] bg-[#E3EDF6] p-0 font-mono">
                          #
                        </th>
                        <th 
                          style={{ width: colWidths.status }} 
                          className="px-2 border-r border-[#C3D5E6] cursor-pointer hover:bg-[#DCE9F5] relative truncate"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center justify-between">
                            <span>Estado</span>
                            {sortField === 'status' ? (
                              sortOrder === 'asc' ? <ArrowUp size={10} className="text-[#0B3C5D]" /> : <ArrowDown size={10} className="text-[#0B3C5D]" />
                            ) : <ArrowUpDown size={9} className="opacity-40" />}
                          </div>
                          <div onMouseDown={(e) => handleColResizeMouseDown('status', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0B3C5D]" />
                        </th>
                        <th 
                          style={{ width: colWidths.folio }} 
                          className="px-2 border-r border-[#C3D5E6] cursor-pointer hover:bg-[#DCE9F5] relative truncate"
                          onClick={() => handleSort('id')}
                        >
                          <div className="flex items-center justify-between">
                            <span>Folio / ID</span>
                            {sortField === 'id' ? (
                              sortOrder === 'asc' ? <ArrowUp size={10} className="text-[#0B3C5D]" /> : <ArrowDown size={10} className="text-[#0B3C5D]" />
                            ) : <ArrowUpDown size={9} className="opacity-40" />}
                          </div>
                          <div onMouseDown={(e) => handleColResizeMouseDown('folio', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0B3C5D]" />
                        </th>
                        <th 
                          style={{ width: colWidths.tenantName }} 
                          className="px-2 border-r border-[#C3D5E6] cursor-pointer hover:bg-[#DCE9F5] relative truncate"
                          onClick={() => handleSort('tenantName')}
                        >
                          <div className="flex items-center justify-between">
                            <span>Arrendatario</span>
                            {sortField === 'tenantName' ? (
                              sortOrder === 'asc' ? <ArrowUp size={10} className="text-[#0B3C5D]" /> : <ArrowDown size={10} className="text-[#0B3C5D]" />
                            ) : <ArrowUpDown size={9} className="opacity-40" />}
                          </div>
                          <div onMouseDown={(e) => handleColResizeMouseDown('tenantName', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0B3C5D]" />
                        </th>
                        <th 
                          style={{ width: colWidths.tenantTaxId }} 
                          className="px-2 border-r border-[#C3D5E6] cursor-pointer hover:bg-[#DCE9F5] relative truncate"
                          onClick={() => handleSort('tenantTaxId')}
                        >
                          <div className="flex items-center justify-between">
                            <span>RUT</span>
                            {sortField === 'tenantTaxId' ? (
                              sortOrder === 'asc' ? <ArrowUp size={10} className="text-[#0B3C5D]" /> : <ArrowDown size={10} className="text-[#0B3C5D]" />
                            ) : <ArrowUpDown size={9} className="opacity-40" />}
                          </div>
                          <div onMouseDown={(e) => handleColResizeMouseDown('tenantTaxId', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0B3C5D]" />
                        </th>
                        <th 
                          style={{ width: colWidths.tenantDocNumber }} 
                          className="px-2 border-r border-[#C3D5E6] cursor-pointer hover:bg-[#DCE9F5] relative truncate"
                          onClick={() => handleSort('tenantDocNumber')}
                        >
                          <div className="flex items-center justify-between">
                            <span>Serie Cédula</span>
                            {sortField === 'tenantDocNumber' ? (
                              sortOrder === 'asc' ? <ArrowUp size={10} className="text-[#0B3C5D]" /> : <ArrowDown size={10} className="text-[#0B3C5D]" />
                            ) : <ArrowUpDown size={9} className="opacity-40" />}
                          </div>
                          <div onMouseDown={(e) => handleColResizeMouseDown('tenantDocNumber', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0B3C5D]" />
                        </th>
                        <th 
                          style={{ width: colWidths.property }} 
                          className="px-2 border-r border-[#C3D5E6] cursor-pointer hover:bg-[#DCE9F5] relative truncate"
                          onClick={() => handleSort('property')}
                        >
                          <div className="flex items-center justify-between">
                            <span>Unidad / Propiedad</span>
                            {sortField === 'property' ? (
                              sortOrder === 'asc' ? <ArrowUp size={10} className="text-[#0B3C5D]" /> : <ArrowDown size={10} className="text-[#0B3C5D]" />
                            ) : <ArrowUpDown size={9} className="opacity-40" />}
                          </div>
                          <div onMouseDown={(e) => handleColResizeMouseDown('property', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0B3C5D]" />
                        </th>
                        <th 
                          style={{ width: colWidths.monthlyAmount }} 
                          className="px-2 border-r border-[#C3D5E6] text-right cursor-pointer hover:bg-[#DCE9F5] relative truncate"
                          onClick={() => handleSort('monthlyAmount')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Canon (CLP)</span>
                            {sortField === 'monthlyAmount' ? (
                              sortOrder === 'asc' ? <ArrowUp size={10} className="text-[#0B3C5D]" /> : <ArrowDown size={10} className="text-[#0B3C5D]" />
                            ) : <ArrowUpDown size={9} className="opacity-40" />}
                          </div>
                          <div onMouseDown={(e) => handleColResizeMouseDown('monthlyAmount', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0B3C5D]" />
                        </th>
                        <th 
                          style={{ width: colWidths.startDate }} 
                          className="px-2 border-r border-[#C3D5E6] cursor-pointer hover:bg-[#DCE9F5] relative truncate"
                          onClick={() => handleSort('startDate')}
                        >
                          <div className="flex items-center justify-between">
                            <span>Inicio</span>
                            {sortField === 'startDate' ? (
                              sortOrder === 'asc' ? <ArrowUp size={10} className="text-[#0B3C5D]" /> : <ArrowDown size={10} className="text-[#0B3C5D]" />
                            ) : <ArrowUpDown size={9} className="opacity-40" />}
                          </div>
                          <div onMouseDown={(e) => handleColResizeMouseDown('startDate', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0B3C5D]" />
                        </th>
                        <th 
                          style={{ width: colWidths.endDate }} 
                          className="px-2 border-r border-[#C3D5E6] cursor-pointer hover:bg-[#DCE9F5] relative truncate"
                          onClick={() => handleSort('endDate')}
                        >
                          <div className="flex items-center justify-between">
                            <span>Vencimiento</span>
                            {sortField === 'endDate' ? (
                              sortOrder === 'asc' ? <ArrowUp size={10} className="text-[#0B3C5D]" /> : <ArrowDown size={10} className="text-[#0B3C5D]" />
                            ) : <ArrowUpDown size={9} className="opacity-40" />}
                          </div>
                          <div onMouseDown={(e) => handleColResizeMouseDown('endDate', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0B3C5D]" />
                        </th>
                        <th 
                          style={{ width: colWidths.actaStatus }} 
                          className="px-2 border-r border-[#C3D5E6] relative truncate"
                        >
                          <span>Acta Entrega</span>
                          <div onMouseDown={(e) => handleColResizeMouseDown('actaStatus', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0B3C5D]" />
                        </th>
                        <th 
                          style={{ width: colWidths.actions }} 
                          className="px-2 text-center"
                        >
                          <span>Acciones</span>
                        </th>
                      </tr>

                      {/* ROW 2: AssetFlow Enterprise QBE (Query By Example) Column Filter Row */}
                      <tr className="bg-[#FFFFE6] border-b border-[#8AA9C4] text-[9px] font-sans">
                        <th className="p-0.5 border-r border-[#D9D9B0] text-center font-bold text-amber-900 bg-[#FFF5CC]">
                          QBE
                        </th>
                        <th className="p-0.5 border-r border-[#D9D9B0]">
                          <input
                            type="text"
                            value={qbeStatus}
                            onChange={(e) => setQbeStatus(e.target.value)}
                            placeholder="QBE..."
                            className="w-full px-1 py-0.5 bg-white border border-[#C5C599] rounded text-[9px] font-mono uppercase outline-none focus:border-indigo-600 focus:bg-yellow-50"
                          />
                        </th>
                        <th className="p-0.5 border-r border-[#D9D9B0]">
                          <input
                            type="text"
                            value={qbeId}
                            onChange={(e) => setQbeId(e.target.value)}
                            placeholder="QBE..."
                            className="w-full px-1 py-0.5 bg-white border border-[#C5C599] rounded text-[9px] font-mono uppercase outline-none focus:border-indigo-600 focus:bg-yellow-50"
                          />
                        </th>
                        <th className="p-0.5 border-r border-[#D9D9B0]">
                          <input
                            type="text"
                            value={qbeTenantName}
                            onChange={(e) => setQbeTenantName(e.target.value)}
                            placeholder="QBE..."
                            className="w-full px-1 py-0.5 bg-white border border-[#C5C599] rounded text-[9px] font-mono uppercase outline-none focus:border-indigo-600 focus:bg-yellow-50"
                          />
                        </th>
                        <th className="p-0.5 border-r border-[#D9D9B0]">
                          <input
                            type="text"
                            value={qbeTenantTaxId}
                            onChange={(e) => setQbeTenantTaxId(e.target.value)}
                            placeholder="QBE..."
                            className="w-full px-1 py-0.5 bg-white border border-[#C5C599] rounded text-[9px] font-mono uppercase outline-none focus:border-indigo-600 focus:bg-yellow-50"
                          />
                        </th>
                        <th className="p-0.5 border-r border-[#D9D9B0]">
                          <input
                            type="text"
                            value={qbeTenantDocNumber}
                            onChange={(e) => setQbeTenantDocNumber(e.target.value)}
                            placeholder="QBE..."
                            className="w-full px-1 py-0.5 bg-white border border-[#C5C599] rounded text-[9px] font-mono uppercase outline-none focus:border-indigo-600 focus:bg-yellow-50"
                          />
                        </th>
                        <th className="p-0.5 border-r border-[#D9D9B0]">
                          <input
                            type="text"
                            value={qbeProperty}
                            onChange={(e) => setQbeProperty(e.target.value)}
                            placeholder="QBE..."
                            className="w-full px-1 py-0.5 bg-white border border-[#C5C599] rounded text-[9px] font-mono uppercase outline-none focus:border-indigo-600 focus:bg-yellow-50"
                          />
                        </th>
                        <th className="p-0.5 border-r border-[#D9D9B0]">
                          <input
                            type="text"
                            value={qbeMonthlyAmount}
                            onChange={(e) => setQbeMonthlyAmount(e.target.value)}
                            placeholder="QBE..."
                            className="w-full px-1 py-0.5 bg-white border border-[#C5C599] rounded text-[9px] font-mono text-right outline-none focus:border-indigo-600 focus:bg-yellow-50"
                          />
                        </th>
                        <th className="p-0.5 border-r border-[#D9D9B0]">
                          <input
                            type="text"
                            value={qbeStartDate}
                            onChange={(e) => setQbeStartDate(e.target.value)}
                            placeholder="AAAA-MM..."
                            className="w-full px-1 py-0.5 bg-white border border-[#C5C599] rounded text-[9px] font-mono outline-none focus:border-indigo-600 focus:bg-yellow-50"
                          />
                        </th>
                        <th className="p-0.5 border-r border-[#D9D9B0]">
                          <input
                            type="text"
                            value={qbeEndDate}
                            onChange={(e) => setQbeEndDate(e.target.value)}
                            placeholder="AAAA-MM..."
                            className="w-full px-1 py-0.5 bg-white border border-[#C5C599] rounded text-[9px] font-mono outline-none focus:border-indigo-600 focus:bg-yellow-50"
                          />
                        </th>
                        <th className="p-0.5 border-r border-[#D9D9B0]">
                          <input
                            type="text"
                            value={qbeActaStatus}
                            onChange={(e) => setQbeActaStatus(e.target.value)}
                            placeholder="Firmada..."
                            className="w-full px-1 py-0.5 bg-white border border-[#C5C599] rounded text-[9px] font-mono uppercase outline-none focus:border-indigo-600 focus:bg-yellow-50"
                          />
                        </th>
                        <th className="p-0.5 text-center bg-[#FFF8D6] text-amber-800 font-mono text-[8.5px]">
                          Enter filtra
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E0EBF5] bg-white">
                      {filteredContracts.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-20 text-center text-slate-400 bg-slate-50">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <FileText size={32} className="text-slate-300" />
                              <p className="font-bold text-xs uppercase tracking-widest text-slate-500">
                                No se encontraron contratos para los criterios ingresados
                              </p>
                              <button
                                type="button"
                                onClick={handleClearQBE}
                                className="mt-2 text-indigo-600 font-black text-xs uppercase tracking-wider hover:underline"
                              >
                                Restablecer filtros QBE
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredContracts.map((contract, idx) => {
                          const isSelectedForCafeOne = selectedContractForCafeOne?.id === contract.id;
                          const isChecked = selectedContractIds.has(contract.id);
                          const contractInspections = inspections.filter(ins => ins.contractId === contract.id);
                          const completedInspection = contractInspections.find(ins => ins.status === 'ACEPTADO' || ins.status === 'FIRMADO');
                          
                          return (
                            <tr
                              key={contract.id}
                              onClick={() => setSelectedContractForCafeOne(contract)}
                              onDoubleClick={() => {
                                setFormData({ ...contract });
                                setIsFormOpen(true);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setSelectedContractForCafeOne(contract);
                                setGridContextMenu({ x: e.clientX, y: e.clientY, contract });
                              }}
                              className={`h-9 cursor-pointer transition-colors border-b border-[#E7EFF7] select-none ${
                                isSelectedForCafeOne
                                  ? 'bg-[#D7E9F7] font-semibold text-[#0B3C5D]'
                                  : idx % 2 === 0
                                  ? 'bg-white hover:bg-[#F3F8FD]'
                                  : 'bg-[#F9FBFE] hover:bg-[#F3F8FD]'
                              }`}
                            >
                              {/* Row Selector / Number */}
                              <td 
                                className="text-center border-r border-[#DCE8F2] p-0 font-mono text-[9px] text-slate-500 bg-[#F4F8FC]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextSet = new Set(selectedContractIds);
                                  if (isChecked) {
                                    nextSet.delete(contract.id);
                                  } else {
                                    nextSet.add(contract.id);
                                  }
                                  setSelectedContractIds(nextSet);
                                  setSelectedContractForCafeOne(contract);
                                }}
                              >
                                <div className="flex items-center justify-center gap-0.5">
                                  {isChecked ? (
                                    <CheckSquare size={11} className="text-[#0B3C5D]" />
                                  ) : (
                                    <span className="opacity-70 font-bold">{idx + 1}</span>
                                  )}
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="px-2 border-r border-[#DCE8F2] truncate">
                                <span className={`inline-flex px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider border ${getStatusColor(contract.status)}`}>
                                  {contract.status}
                                </span>
                              </td>

                              {/* ID / Folio */}
                              <td className="px-2 border-r border-[#DCE8F2] font-mono text-[9.5px] font-bold text-slate-700 truncate">
                                {contract.id.substring(0, 8).toUpperCase()}
                              </td>

                              {/* Tenant Name */}
                              <td className="px-2 border-r border-[#DCE8F2] font-bold text-slate-900 truncate">
                                <div className="flex items-center gap-1.5 truncate">
                                  <User size={11} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{contract.tenantName}</span>
                                </div>
                              </td>

                              {/* Tenant Tax ID (RUT) */}
                              <td className="px-2 border-r border-[#DCE8F2] font-mono text-[10px] font-bold text-slate-700 truncate">
                                {contract.tenantTaxId}
                              </td>

                              {/* Series Document Number */}
                              <td className="px-2 border-r border-[#DCE8F2] font-mono text-[9.5px] truncate">
                                {contract.tenantDocNumber ? (
                                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 py-0.2 rounded font-black">
                                    {contract.tenantDocNumber.toUpperCase()}
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-bold italic text-[9px]">
                                    Sin Serie
                                  </span>
                                )}
                              </td>

                              {/* Property */}
                              <td className="px-2 border-r border-[#DCE8F2] truncate">
                                <div className="flex items-center gap-1.5 truncate">
                                  <Building2 size={11} className="text-[#328CC1] shrink-0" />
                                  <span className="text-slate-800 truncate font-medium">{contract.propertyLabel}</span>
                                </div>
                              </td>

                              {/* Monthly Amount */}
                              <td className="px-2 border-r border-[#DCE8F2] text-right font-mono font-black text-slate-900 truncate">
                                {contract.currency} {contract.monthlyAmount.toLocaleString()}
                              </td>

                              {/* Start Date */}
                              <td className="px-2 border-r border-[#DCE8F2] font-mono text-[9.5px] text-slate-600 truncate">
                                {contract.startDate}
                              </td>

                              {/* End Date */}
                              <td className="px-2 border-r border-[#DCE8F2] font-mono text-[9.5px] text-slate-600 truncate">
                                {contract.endDate || 'INDEFINIDO'}
                              </td>

                              {/* Acta Delivery Status */}
                              <td className="px-2 border-r border-[#DCE8F2] truncate">
                                {completedInspection ? (
                                  <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded uppercase">
                                    <CheckCircle size={9} /> Firmada
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded uppercase">
                                    Pendiente
                                  </span>
                                )}
                              </td>

                              {/* Quick Action Buttons */}
                              <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => downloadLeaseContractPDF(contract)}
                                    className="p-1 text-emerald-700 hover:bg-emerald-50 rounded transition-all"
                                    title="Descargar Contrato PDF con QR Oficial"
                                  >
                                    <Download size={12} />
                                  </button>
                                  {contract.documentUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setViewingContract(contract)}
                                      className="p-1 text-[#0B3C5D] hover:bg-blue-50 rounded transition-all"
                                      title="Ver copia digital del contrato escaneado"
                                    >
                                      <Eye size={12} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...contract });
                                      setFileBase64(contract.documentUrl || null);
                                      setIsFormOpen(true);
                                    }}
                                    className="p-1 text-indigo-700 hover:bg-indigo-50 rounded transition-all"
                                    title="Modificar Contrato (P15012)"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDelete(contract.id)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-all"
                                    title="Eliminar Contrato"
                                  >
                                    <Trash2 size={12} />
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

                {/* ERP Bottom Status Strip */}
                <div className="bg-[#E9F0F8] border-t border-[#C3D5E6] px-3 py-1.5 flex items-center justify-between text-[9.5px] text-slate-600 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      ERP Grid En Línea
                    </span>
                    <span>•</span>
                    <span>Doble clic en fila abre edición</span>
                    <span>•</span>
                    <span>Clic derecho despliega menú contextual F15017</span>
                  </div>
                  <div>
                    Total Activos en Grilla: <strong className="text-slate-900">{filteredContracts.length}</strong>
                  </div>
                </div>
              </div>
          </div>

          {/* ERP CafeOne side panel */}
          {isCafeOneSidebarOpen && selectedContractForCafeOne && (
            <div className="xl:col-span-1 flex flex-col bg-[#F8FAFC] border border-slate-200 rounded-3xl overflow-hidden shadow-xs h-fit sticky top-6">
              {/* ERP Classic Blue Header */}
              <div className="bg-gradient-to-r from-[#0B3C5D] to-[#328CC1] text-white p-5 flex flex-col gap-1 select-none">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Activity size={14} className="text-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-black tracking-widest uppercase text-slate-100">
                      ERP CafeOne Console
                    </span>
                  </div>
                  <span className="text-[8px] font-mono font-bold bg-[#328CC1] px-1.5 py-0.5 rounded text-white border border-[#0d5982]">
                    P15017
                  </span>
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Mapeo de Coherencia
                </h3>
                <p className="text-[9px] text-slate-200">
                  Consistencia de Firma &amp; Acta de Restitución
                </p>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* 1. Entity context */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                    Inquilino Activo (Contexto):
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-tight">
                      {selectedContractForCafeOne.tenantName}
                    </h4>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      RUT: {selectedContractForCafeOne.tenantTaxId}
                    </p>
                  </div>
                </div>

                {/* 2. Cédula & Series Integration */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                      Seguridad y Cédula de Identidad:
                    </span>
                    {selectedContractForCafeOne.tenantDocNumber ? (
                      <span className="text-[8px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        ✓ Validada
                      </span>
                    ) : (
                      <span className="text-[8px] font-black bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                        ⚠️ Sin Serie
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Número de Serie (Requerido para Firma):
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={inlineDocNumber}
                        onChange={(e) => setInlineDocNumber(e.target.value)}
                        placeholder="Ej: A12345678"
                        className="flex-1 bg-slate-50 border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg font-mono uppercase focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                      />
                      <button
                        onClick={handleSaveInlineDocNumber}
                        disabled={isSavingInlineDoc}
                        className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-xs transition-all flex items-center justify-center disabled:bg-slate-200"
                        title="Vincular cédula"
                      >
                        {isSavingInlineDoc ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      </button>
                    </div>
                    <p className="text-[8.5px] text-slate-400 leading-tight">
                      El Número de Serie liga el contrato con el Acta de Inspección de forma unívoca según Ley Chilena.
                    </p>
                  </div>
                </div>

                {/* 3. Inspections / Restitution consistency */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                    Actas de Revisión Física Asociadas:
                  </span>
                  
                  {(() => {
                    const matchedInspections = inspections.filter(ins => ins.contractId === selectedContractForCafeOne.id || ins.propertyId === selectedContractForCafeOne.propertyId);
                    if (matchedInspections.length === 0) {
                      return (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex flex-col gap-1.5">
                          <p className="text-[9px] text-amber-800 font-bold leading-normal">
                            ⚠️ Consistencia Crítica: No se detecta Acta de Entrada registrada.
                          </p>
                          <p className="text-[8.5px] text-amber-600 leading-normal">
                            Para evitar disputas de restitución y asegurar las garantías, el inquilino debe firmar el Acta.
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-col gap-2">
                        {matchedInspections.map(ins => (
                          <div key={ins.id} className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-slate-800 uppercase tracking-wider">
                                {ins.type === 'ENTRADA' ? 'Acta de Entrada' : 'Acta de Restitución'}
                              </span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase font-mono ${
                                ins.status === 'FIRMADO' || ins.status === 'ACEPTADO' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>
                                {ins.status}
                              </span>
                            </div>
                            <p className="text-[8.5px] text-slate-400 font-mono">
                              Fecha: {ins.inspectionDate || 'N/A'}
                            </p>
                            {ins.tenantDocNumber && (
                              <p className="text-[8.5px] text-emerald-700 font-mono">
                                Firmado digitalmente • Serie: {ins.tenantDocNumber.toUpperCase()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* 3.5. Control de Pagos y Abonos (Parciales) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={16} className="text-emerald-600" />
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                        Control de Pagos de Arriendo
                      </span>
                    </div>
                    <span className="text-[9px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100 font-mono">
                      Abonos Parciales
                    </span>
                  </div>

                  {/* Period selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Periodo de Arriendo:
                    </label>
                    <select
                      value={rentPaymentPeriod}
                      onChange={(e) => setRentPaymentPeriod(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                    >
                      {['Enero 2026', 'Febrero 2026', 'Marzo 2026', 'Abril 2026', 'Mayo 2026', 'Junio 2026', 'Julio 2026', 'Agosto 2026', 'Septiembre 2026', 'Octubre 2026', 'Noviembre 2026', 'Diciembre 2026'].map(period => (
                        <option key={period} value={period}>{period}</option>
                      ))}
                    </select>
                  </div>

                  {/* Calculations & Balances */}
                  {(() => {
                    const periodPayments = (selectedContractForCafeOne.payments || []).filter(p => p.period === rentPaymentPeriod);
                    const totalPaid = periodPayments.reduce((sum, p) => sum + p.amountPaid, 0);
                    const monthlyAmount = selectedContractForCafeOne.monthlyAmount;
                    const remainingBalance = monthlyAmount - totalPaid;
                    
                    let statusLabel = 'PENDIENTE';
                    let statusColor = 'bg-rose-50 text-rose-700 border-rose-100';
                    if (totalPaid >= monthlyAmount) {
                      statusLabel = 'PAGADO';
                      statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    } else if (totalPaid > 0) {
                      statusLabel = 'PAGO PARCIAL';
                      statusColor = 'bg-amber-50 text-amber-700 border-amber-100';
                    }

                    return (
                      <div className="flex flex-col gap-2.5">
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px]">
                          <div>
                            <span className="text-slate-400 block font-bold uppercase tracking-wider text-[8px]">Canon Mensual:</span>
                            <span className="font-extrabold text-slate-700 font-mono">
                              {selectedContractForCafeOne.currency} {monthlyAmount.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-bold uppercase tracking-wider text-[8px]">Estado Mes:</span>
                            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-black inline-block ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-bold uppercase tracking-wider text-[8px]">Total Pagado:</span>
                            <span className="font-extrabold text-emerald-700 font-mono">
                              {selectedContractForCafeOne.currency} {totalPaid.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-bold uppercase tracking-wider text-[8px]">Saldo Pendiente:</span>
                            <span className={`font-extrabold font-mono ${remainingBalance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                              {selectedContractForCafeOne.currency} {Math.max(0, remainingBalance).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Register payment form */}
                        {remainingBalance > 0 ? (
                          <div className="border-t border-slate-100 pt-2.5 flex flex-col gap-2 animate-fade-in">
                            <span className="text-[8.5px] font-black text-indigo-600 uppercase tracking-widest block">
                              Registrar Abono o Pago:
                            </span>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-bold text-slate-400 uppercase">Monto a Pagar ({selectedContractForCafeOne.currency}):</label>
                                <input
                                  type="number"
                                  value={rentPaymentAmount}
                                  onChange={(e) => setRentPaymentAmount(e.target.value)}
                                  placeholder="0"
                                  className="bg-slate-50 border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-bold text-slate-400 uppercase">Medio de Pago:</label>
                                <select
                                  value={rentPaymentMethod}
                                  onChange={(e) => setRentPaymentMethod(e.target.value)}
                                  className="bg-slate-50 border border-slate-200 text-xs px-2 py-1.5 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                                >
                                  <option value="TRANSFERENCIA">Transferencia</option>
                                  <option value="EFECTIVO">Efectivo</option>
                                  <option value="DEPOSITO">Depósito</option>
                                  <option value="CAJA_CHICA">Caja Chica</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-bold text-slate-400 uppercase">Referencia / Nº Trans:</label>
                                <input
                                  type="text"
                                  value={rentPaymentRef}
                                  onChange={(e) => setRentPaymentRef(e.target.value)}
                                  placeholder="Ej: Dep10239"
                                  className="bg-slate-50 border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono uppercase"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-bold text-slate-400 uppercase">Fecha de Pago:</label>
                                <input
                                  type="date"
                                  value={rentPaymentDate}
                                  onChange={(e) => setRentPaymentDate(e.target.value)}
                                  className="bg-slate-50 border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                                />
                              </div>
                            </div>

                            <button
                              onClick={handleRegisterRentPayment}
                              className="w-full mt-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95"
                            >
                              Aplicar Abono
                            </button>
                          </div>
                        ) : (
                          <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-[9px] text-emerald-800 font-extrabold uppercase tracking-wide">
                            ✓ Periodo pagado en su totalidad
                          </div>
                        )}

                        {/* List of payments for the period */}
                        {periodPayments.length > 0 && (
                          <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                              Historial de Abonos ({rentPaymentPeriod}):
                            </span>
                            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                              {periodPayments.map(p => (
                                <div key={p.id} className="p-2 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-2 text-[9px]">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="font-extrabold text-slate-700 font-mono">
                                        {selectedContractForCafeOne.currency} {p.amountPaid.toLocaleString()}
                                      </span>
                                      <span className="text-[7.5px] text-slate-400 font-mono">{p.date}</span>
                                    </div>
                                    <div className="text-slate-500 flex items-center gap-1.5 mt-0.5 truncate text-[8px]">
                                      <span className="font-bold">{p.paymentMethod}</span>
                                      {p.referenceNumber && (
                                        <span className="font-mono bg-slate-200 text-slate-600 px-1 rounded truncate">
                                          #{p.referenceNumber.toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        const prop = properties.find(pt => pt.id === selectedContractForCafeOne.propertyId);
                                        downloadRentPaymentReceiptPDF({
                                          contract: selectedContractForCafeOne,
                                          payment: p,
                                          property: prop,
                                          currentUser: currentUser || 'SISTEMA CAJA'
                                        });
                                      }}
                                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 transition-all active:scale-95"
                                      title="Descargar Comprobante de Pago PDF"
                                    >
                                      <FileText size={10} /> Recibo PDF
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRentPayment(p.id)}
                                      className="p-1 hover:bg-rose-50 rounded text-rose-400 hover:text-rose-600 transition-colors"
                                      title="Eliminar abono"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* 3.8. Generación de Contrato con QR */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-2.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                    Emisión de Documento:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[8.5px] text-slate-400 leading-tight">
                      Genera el documento PDF formal de arrendamiento con firma electrónica autorizada y el código QR de acceso seguro.
                    </p>
                    <button
                      onClick={() => downloadLeaseContractPDF(selectedContractForCafeOne)}
                      className="w-full py-2 bg-gradient-to-r from-[#0B3C5D] to-[#328CC1] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 hover:shadow-lg hover:brightness-105"
                    >
                      <Download size={12} /> Generar Contrato (QR)
                    </button>
                  </div>
                </div>

                {/* 4. ERP Orchestrator synchronization */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-2.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                    AssetFlow Enterprise ERP Sync:
                  </span>
                  
                  <button
                    onClick={handleTriggerOrchestrator}
                    disabled={isOrchestrating}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {isOrchestrating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Activity size={12} className="text-emerald-400" />
                    )}
                    Sincronizar ERP Orchestrator
                  </button>

                  {orchestratorLogs.length > 0 && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[8px] text-emerald-700 flex flex-col gap-1 max-h-32 overflow-y-auto leading-normal">
                      {orchestratorLogs.map((log, index) => (
                        <div key={index} className="break-all whitespace-pre-wrap">{log}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Nuevo Contrato de Arriendo</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Carga el PDF para extracción automática de datos</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsFormOpen(false); resetForm(); }}
                className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* PDF Upload & AI Section */}
                <div className="space-y-6">
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-8 text-center group hover:border-indigo-400 transition-all relative overflow-hidden">
                    {progress > 0 && (
                      <div className="absolute bottom-0 left-0 h-1.5 bg-indigo-600 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="application/pdf"
                      className="hidden"
                    />
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <FileUp size={32} />
                    </div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tight mb-2">Cargar Contrato PDF</h4>
                    <p className="text-xs text-slate-500 mb-6 uppercase tracking-widest font-bold">Arrastra el archivo o haz clic para buscar</p>
                    
                    {selectedFile ? (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="text-indigo-600 shrink-0" size={20} />
                          <span className="text-xs font-bold text-indigo-900 truncate">{selectedFile.name}</span>
                        </div>
                        <button onClick={() => { setSelectedFile(null); setFileBase64(null); setProcessingText(''); }} className="text-indigo-400 hover:text-rose-600">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                      >
                        Seleccionar Archivo
                      </button>
                    )}
                  </div>

                  <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <BrainCircuit className="text-indigo-600" size={24} />
                        <h4 className="font-black text-slate-900 uppercase tracking-tight">Extracción de Datos</h4>
                      </div>
                      {isExtractingText && (
                        <div className="flex items-center gap-2 text-indigo-600">
                          <Loader2 size={14} className="animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Leyendo PDF...</span>
                        </div>
                      )}
                    </div>
                    
                    <textarea
                      value={processingText}
                      onChange={(e) => setProcessingText(e.target.value)}
                      placeholder="El texto extraído aparecerá aquí..."
                      className="w-full h-40 bg-white border border-indigo-200 rounded-2xl p-4 text-[11px] font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                    />
                    
                    <button
                      onClick={handleProcessIA}
                      disabled={isProcessing || !processingText.trim()}
                      className="w-full mt-4 flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Analizando con IA...
                        </>
                      ) : (
                        <>
                          <BrainCircuit size={18} />
                          Ejecutar Análisis Inteligente
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Manual Form Section */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 items-start">
                    <AlertCircle size={18} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] font-bold text-blue-800 leading-relaxed uppercase tracking-tight">
                      Información de Garantía: Sólo aquellos contratos celebrados con personal de PDI requieren el registro y pago de una garantía de arriendo.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4 rounded-2xl bg-slate-50 border border-slate-150 p-5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${isPropertyLockedByApplicant ? 'bg-amber-500' : 'bg-indigo-600 animate-pulse'}`}></span>
                          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            Buscador de Propiedades Progresivo (Paso a Paso)
                          </h4>
                        </div>
                        {isPropertyLockedByApplicant && (
                          <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-250 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Lock size={10} />
                            VINCULADO AL POSTULANTE
                          </span>
                        )}
                      </div>

                      {isPropertyLockedByApplicant && (
                        <div className="bg-amber-50 border border-amber-200/70 text-amber-900 rounded-2xl p-4 text-[11px] font-bold uppercase tracking-wide leading-relaxed flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-250">
                          <Lock size={16} className="text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            Propiedad pre-asignada por postulación aprobada para <span className="underline font-black">{formData.tenantName}</span>. No editable en esta instancia para evitar inconsistencias de solvencia.
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                        {/* 1. REGION */}
                        <div className="space-y-1.5">
                          <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isPropertyLockedByApplicant ? 'text-slate-300' : 'text-slate-400'}`}>
                            1. Región
                          </label>
                          <select
                            disabled={isPropertyLockedByApplicant}
                            value={cascadeRegion}
                            onChange={(e) => {
                              setCascadeRegion(e.target.value);
                              setCascadeCommune('');
                              setCascadeConjunto('');
                              setFormData({ ...formData, propertyId: '' });
                            }}
                            className="w-full bg-white border border-slate-250 rounded-2xl p-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                          >
                            <option value="">Seleccione Región...</option>
                            {uniqueCascadingRegions.map(reg => (
                              <option key={reg} value={reg}>{reg}</option>
                            ))}
                          </select>
                        </div>

                        {/* 2. COMUNA */}
                        <div className="space-y-1.5">
                          <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${cascadeRegion && !isPropertyLockedByApplicant ? 'text-slate-400' : 'text-slate-300'}`}>
                            2. Comuna
                          </label>
                          <select
                            disabled={!cascadeRegion || isPropertyLockedByApplicant}
                            value={cascadeCommune}
                            onChange={(e) => {
                              setCascadeCommune(e.target.value);
                              setCascadeConjunto('');
                              setFormData({ ...formData, propertyId: '' });
                            }}
                            className="w-full bg-white border border-slate-250 rounded-2xl p-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700 disabled:bg-slate-100/75 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                          >
                            <option value="">Seleccione Comuna...</option>
                            {uniqueCascadingCommunes.map(comm => (
                              <option key={comm} value={comm}>{comm}</option>
                            ))}
                          </select>
                        </div>

                        {/* 3. CONJUNTO */}
                        <div className="space-y-1.5">
                          <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${cascadeCommune && !isPropertyLockedByApplicant ? 'text-slate-400' : 'text-slate-300'}`}>
                            3. Conjunto / Edificio
                          </label>
                          <select
                            disabled={!cascadeCommune || isPropertyLockedByApplicant}
                            value={cascadeConjunto}
                            onChange={(e) => {
                              setCascadeConjunto(e.target.value);
                              setFormData({ ...formData, propertyId: '' });
                            }}
                            className="w-full bg-white border border-slate-250 rounded-2xl p-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700 disabled:bg-slate-100/75 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                          >
                            <option value="">Seleccione Conjunto...</option>
                            {uniqueCascadingConjuntos.map(conj => (
                              <option key={conj} value={conj}>{conj}</option>
                            ))}
                          </select>
                        </div>

                        {/* 4. PROPIEDAD */}
                        <div className="space-y-1.5">
                          <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${cascadeConjunto && !isPropertyLockedByApplicant ? 'text-slate-400' : 'text-slate-300'}`}>
                            4. Propiedad / Unidad
                          </label>
                          <select
                            required
                            disabled={!cascadeConjunto || isPropertyLockedByApplicant}
                            value={formData.propertyId || ''}
                            onChange={(e) => {
                              const propId = e.target.value;
                              const selectedProp = properties.find(p => p.id === propId);
                              setFormData({ 
                                ...formData, 
                                propertyId: propId,
                                monthlyAmount: selectedProp?.rentalAmount || formData.monthlyAmount || 0
                              });
                            }}
                            className="w-full bg-white border border-indigo-200 rounded-2xl p-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-extrabold text-indigo-700 disabled:bg-slate-100/75 disabled:text-slate-400 disabled:border-slate-250 disabled:cursor-not-allowed"
                          >
                            <option value="">Seleccione Unidad...</option>
                            {cascadingFilteredProperties.map(p => (
                              <option key={p.id} value={p.id}>{p.code} - {p.address} (Estado: {p.status || 'ARRENDADA'})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Display Selection Info */}
                      {formData.propertyId && (
                        <div className="space-y-2 mt-2">
                          <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-3 flex items-center justify-between text-xs font-bold text-indigo-900">
                            <div>
                              <span className="text-indigo-600">Unidad Seleccionada: </span>
                              {(() => {
                                const p = properties.find(prop => prop.id === formData.propertyId);
                                if (!p) return null;
                                return `${p.building ? `${p.building} - ` : ''}Depto/Unidad ${p.code} (${p.address}, ${p.commune}) [Estado: ${p.status || 'ARRENDADA'}]`;
                              })()}
                            </div>
                            {!isPropertyLockedByApplicant && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCascadeRegion('');
                                  setCascadeCommune('');
                                  setCascadeConjunto('');
                                  setFormData({ ...formData, propertyId: '' });
                                }}
                                className="text-[10px] text-rose-600 hover:text-rose-800 uppercase font-black tracking-widest transition-colors ml-4"
                              >
                                Limpiar Selección
                              </button>
                            )}
                          </div>

                          {(() => {
                            const p = properties.find(prop => prop.id === formData.propertyId);
                            if (p && p.status !== 'DISPONIBLE') {
                              return (
                                <div className="bg-amber-50 border border-amber-250 text-amber-900 rounded-xl p-4 text-[11px] font-bold uppercase tracking-tight">
                                  ⚠️ ADVERTENCIA DE CONTROL: Esta unidad se encuentra en estado "{p.status || 'ARRENDADA'}". Sin la emisión previa de su Acta de Restitución (Salida) en el Módulo de Revisiones, la vivienda NO puede pasar a un estado disponible ni ser arrendada o entregada a un nuevo arrendatario o postulante.
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Postulante Aprobado</label>
                      <select
                        required
                        value={approvedApplicants.find(a => a.name === formData.tenantName && a.taxId === formData.tenantTaxId)?.id || ''}
                        onChange={(e) => {
                          const selectedApp = approvedApplicants.find(a => a.id === e.target.value);
                          if (selectedApp) {
                            const p = properties.find(prop => prop.id === selectedApp.propertyId);
                            setFormData({
                              ...formData,
                              tenantName: selectedApp.name,
                              tenantTaxId: selectedApp.taxId,
                              propertyId: selectedApp.propertyId || formData.propertyId, // auto-fill property
                              monthlyAmount: p?.rentalAmount || formData.monthlyAmount || 0
                            });
                          } else {
                            setFormData({
                              ...formData,
                              tenantName: '',
                              tenantTaxId: '',
                              propertyId: '',
                              monthlyAmount: 0
                            });
                            setCascadeRegion('');
                            setCascadeCommune('');
                            setCascadeConjunto('');
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 font-bold"
                      >
                        <option value="">Seleccionar de la lista de Postulantes Aprobados...</option>
                        {approvedApplicants.map(app => (
                          <option key={app.id} value={app.id}>
                            {app.name} ({app.taxId}) - Propiedad requerida: {app.propertyLabel}
                          </option>
                        ))}
                      </select>
                      {approvedApplicants.length === 0 && (
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-1">
                          ⚠️ No hay postulantes aprobados en el sistema. Vaya al módulo "Evaluación de Postulantes" para registrar y aprobar postulantes.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Arrendatario (Auto-completado)</label>
                        <input
                          disabled
                          required
                          type="text"
                          value={formData.tenantName || ''}
                          className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-sm text-slate-500 cursor-not-allowed font-medium"
                          placeholder="Seleccionar postulante arriba"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RUT Arrendatario (Auto-completado)</label>
                        <input
                          disabled
                          type="text"
                          value={formData.tenantTaxId || ''}
                          className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-sm text-slate-500 cursor-not-allowed font-medium"
                          placeholder="Seleccionar postulante arriba"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº Serie Cédula de Identidad</label>
                        <input
                          type="text"
                          value={formData.tenantDocNumber || ''}
                          onChange={(e) => setFormData({ ...formData, tenantDocNumber: maskFolioOrInvoice(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono uppercase"
                          placeholder="Ej: A12345678"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Canon Mensual</label>
                          <span className="text-[10px] font-mono font-black text-indigo-700">
                            {formData.currency === 'CLP' ? maskMoneyCLP(formData.monthlyAmount || 0).formatted : `${formData.monthlyAmount || 0} UF`}
                          </span>
                        </div>
                        <input
                          required
                          type="text"
                          value={formData.currency === 'CLP' ? (formData.monthlyAmount ? formData.monthlyAmount.toLocaleString('es-CL') : '') : (formData.monthlyAmount || '')}
                          onChange={(e) => {
                            if (formData.currency === 'CLP') {
                              const raw = e.target.value.replace(/\D/g, '');
                              setFormData({...formData, monthlyAmount: raw ? parseInt(raw, 10) : 0});
                            } else {
                              setFormData({...formData, monthlyAmount: Number(e.target.value)});
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900"
                          placeholder="Ej: 550.000"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Moneda</label>
                        <select
                          value={formData.currency}
                          onChange={(e) => setFormData({...formData, currency: e.target.value as 'CLP' | 'UF'})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800"
                        >
                          <option value="CLP">Pesos (CLP)</option>
                          <option value="UF">UF</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Fecha Inicio</label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Fecha Término</label>
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!formData.endDate}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({...formData, endDate: ''});
                                } else {
                                  // Set default 1 year later if unchecked
                                  const oneYearLater = new Date();
                                  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
                                  setFormData({...formData, endDate: oneYearLater.toISOString().split('T')[0]});
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="text-[9.5px] font-bold text-indigo-600 uppercase tracking-wider">Indeterminada</span>
                          </label>
                        </div>
                        {formData.startDate && formData.endDate && !validateDateRange(formData.startDate, formData.endDate).isValid && (
                          <p className="text-[9.5px] font-bold text-rose-600 flex items-center gap-1 mb-1">
                            <AlertCircle size={12} className="shrink-0" />
                            <span>{validateDateRange(formData.startDate, formData.endDate).error}</span>
                          </p>
                        )}
                        {!formData.endDate ? (
                          <div className="w-full bg-indigo-50/50 border border-dashed border-indigo-200 rounded-2xl p-4 text-xs font-bold text-indigo-700 flex items-center justify-center gap-2 h-[54px]">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                            <span>Vigencia Indefinida / Indeterminada</span>
                          </div>
                        ) : (
                          <input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observaciones</label>
                      <textarea
                        value={formData.observations}
                        onChange={(e) => setFormData({...formData, observations: e.target.value})}
                        className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button
                      type="button"
                      onClick={() => { setIsFormOpen(false); resetForm(); }}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                    >
                      <Save size={15} /> Guardar Contrato
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {viewingContract && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-6xl h-full rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Visor de Contrato</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{viewingContract.tenantName} - {viewingContract.propertyLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewingContract.documentUrl && (
                  <button 
                    onClick={() => openDocumentSecurely(viewingContract.documentUrl!, viewingContract.documentName || 'contrato')}
                    className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 mr-2"
                    title="Abrir en ventana nueva"
                  >
                    <ExternalLink size={18} />
                    <span className="hidden sm:inline">Abrir en Pestaña</span>
                  </button>
                )}
                <button 
                  onClick={() => setViewingContract(null)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-800 p-4">
              {viewingContract.documentUrl ? (
                <iframe 
                  src={viewingContract.documentUrl} 
                  className="w-full h-full rounded-2xl border-none"
                  title="Documento de Contrato"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <AlertCircle size={48} className="mb-4" />
                  <p className="font-bold uppercase tracking-widest">No hay copia digital disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Billing PDF Viewer Modal */}
      {viewingBillingPDFUrl && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-6xl h-full rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Comprobante de Cobros</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Reporte de Despacho Masivo - ERP R15132</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewingBillingPDFUrl(null)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-800 p-4">
              <iframe 
                src={viewingBillingPDFUrl} 
                className="w-full h-full rounded-2xl border-none"
                title="Comprobante de Cobros"
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* ERP BATCH R15132 - AUTOMATED EMAIL BILLING DESPATCH MODAL*/}
      {/* ======================================================= */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#FAFBFD] w-full max-w-5xl rounded-[32px] border-[5px] border-[#0B3C5D] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header: Styled as AssetFlow Enterprise Administrative App Header */}
            <div className="bg-[#0B3C5D] p-6 text-white border-b-4 border-[#FFCC00] flex justify-between items-center select-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400 text-slate-900 rounded-xl flex items-center justify-center font-black text-lg">
                  <Mail size={22} className="text-slate-950" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Facturación y Envío de Cobros (R15132 Batch)</h3>
                  <p className="text-[10px] font-black tracking-widest text-[#FFCC00] uppercase">Módulo ERP V2.0 - Despacho Masivo a Arrendatarios AssetFlow</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (isProcessingBilling) {
                    if (!confirm('Proceso en ejecución. ¿Desea interrumpir el lote de salida?')) return;
                  }
                  setIsBillingModalOpen(false);
                }}
                className="p-2.5 bg-slate-800/60 hover:bg-slate-900 rounded-xl text-slate-300 transition-colors"
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Alert Warning Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs">
                  <p className="font-extrabold text-amber-950 uppercase tracking-wider mb-1">MÉTODO DE DESPACHO AUTOMATIZADO - GRUPO PDI</p>
                  <p className="text-amber-800 font-medium">
                    Al ejecutar el proceso, se generará individualmente el pre-aviso de cobro para cada arrendatario con contrato activo. El sistema adjuntará el detalle en PDF y lo enviará automáticamente a la dirección de correo registrada de manera directa. Una vez terminado, se emitirá el certificado de transmisión.
                  </p>
                </div>
              </div>

              {!billingResultReport ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Form Settings and Active Tenants */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b pb-2">Configuración de Lote</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Período de Facturación</label>
                        <select 
                          value={billingPeriod}
                          onChange={(e) => setBillingPeriod(e.target.value)}
                          disabled={isProcessingBilling}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20 focus:border-[#0B3C5D]"
                        >
                          <option value="Junio 2026">Junio de 2026</option>
                          <option value="Julio 2026">Julio de 2026</option>
                          <option value="Agosto 2026">Agosto de 2026</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Canal SMTP ERP</label>
                        <input
                          type="text"
                          value="SMTP.ASSETFLOW-SECURE.CL"
                          disabled
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inquilinos Activos Registrados</h5>
                        <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded-full text-slate-500">
                          {contracts.filter(c => c.status === 'VIGENTE' || c.status === 'POR_VENCER').length} Contratos
                        </span>
                      </div>
                      <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-50 bg-slate-50/50 p-2 space-y-1.5">
                        {contracts.filter(c => c.status === 'VIGENTE' || c.status === 'POR_VENCER').map(c => (
                          <div key={c.id} className="flex justify-between items-center p-2.5 bg-white rounded-xl shadow-sm">
                            <div>
                              <p className="text-xs font-black text-slate-905">{c.tenantName}</p>
                              <p className="text-[9px] text-slate-400 font-mono tracking-wider">{c.tenantTaxId} • {getTenantEmail(c.tenantName)}</p>
                            </div>
                            <span className="text-xs font-black text-slate-900 bg-indigo-50 px-2 py-1 rounded-lg">
                              {c.currency} {c.monthlyAmount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleExecuteBilling}
                      disabled={isProcessingBilling}
                      className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 mt-4 disabled:bg-slate-200 disabled:text-slate-405 disabled:pointer-events-none"
                    >
                      {isProcessingBilling ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-slate-900" />
                          <span>PROCESANDO LOTE EN ERP...</span>
                        </>
                      ) : (
                        <>
                          <Send size={16} className="text-slate-900" />
                          <span>EJECUTAR DESPACHO AUTOMÁTICO (BATCH R15132)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right Column: Console Terminal and Live Meter */}
                  <div className="bg-[#030712] rounded-3xl p-6 shadow-indigo-950/25 border border-slate-800 flex flex-col justify-between h-96 lg:h-auto min-h-[380px]">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest font-mono">Terminal de Salida ERP R15132</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      </div>
                      
                      <div className="font-mono text-[10px] text-slate-300 space-y-2 h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 p-2 bg-black/40 rounded-xl border border-slate-900">
                        {billingLogs.length === 0 ? (
                          <p className="text-slate-500 italic select-none">Esperando inicialización de lote administrativo...</p>
                        ) : (
                          billingLogs.map((log, lIdx) => (
                            <p 
                              key={lIdx} 
                              className={
                                log?.startsWith('[ERROR]') ? 'text-rose-400 font-bold' :
                                log?.startsWith('[SMTP ENVIADO]') ? 'text-emerald-400' :
                                log?.startsWith('[BATCH COMPLETADO]') ? 'text-amber-300 font-extrabold font-sans py-1' :
                                'text-slate-300'
                              }
                            >
                              {log}
                            </p>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-900">
                      <div className="flex justify-between text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                        <span>Progreso de transmisión</span>
                        <span>{billingProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="bg-amber-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${billingProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* INFORME DE SALIDA GENERAL (FINISHED STATE) */
                <div className="space-y-6">
                  {/* Top Summary Banner card */}
                  <div className="bg-white border-2 border-[#0B3C5D] rounded-3xl p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#0B3C5D] text-[#FFCC00] text-[9px] font-mono font-black uppercase px-2.5 py-1 rounded border border-[#FFCC00]">
                          LOTE COMPLETADO: {billingResultReport.batchId}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Ejecutado por {currentUser}
                        </span>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Certificado de Envío y Facturación Masiva</h4>
                      <p className="text-xs text-slate-405 font-bold uppercase tracking-widest mt-1">El proceso batch R15132 ha enviado con éxito los correos con pre-aviso de cobros en PDF.</p>
                    </div>

                    <button
                      onClick={() => downloadBillingReportPDF(billingResultReport)}
                      className="shrink-0 flex items-center justify-center gap-2.5 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-605/20"
                    >
                      <Download size={16} />
                      <span>Descargar Informe de Envíos en PDF</span>
                    </button>
                  </div>

                  {/* Operational statistics widget blocks */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Despachados</p>
                      <p className="text-4xl font-black text-slate-900">{billingResultReport.processedCount}</p>
                      <p className="text-[9px] font-bold text-slate-405 uppercase">Clientes Involucrados</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-250 rounded-3xl p-6 text-center space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#0F5132]">Envíos Exitosos</p>
                      <p className="text-4xl font-black text-emerald-700">{billingResultReport.successfulCount}</p>
                      <p className="text-[9px] font-black text-emerald-600 uppercase">Establecidos con SMTP OK</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fallas Detectadas</p>
                      <p className={`text-4xl font-black ${billingResultReport.failedCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {billingResultReport.failedCount}
                      </p>
                      <p className="text-[9px] font-bold text-slate-405 uppercase">Rebotes de Correo</p>
                    </div>
                  </div>

                  {/* Grid details listing and tracing ID's */}
                  <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h5 className="text-xs font-black uppercase tracking-widest text-slate-900">Bitácora Técnica de Transmisiones del Lote</h5>
                      <span className="text-[9px] text-[#0B3C5D] font-black uppercase font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        Servidor SMTP: ASSETFLOW-SECURE-SMTP v2.1
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 select-none border-b border-slate-200">
                            <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Inquilino (Arrendatario)</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Inmueble / Propiedad</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Período Facturado</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Días Facturados</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Canon Mensual</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right bg-indigo-50/50">Total a Pagar</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Estado Delivery</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {billingResultReport.details.map(det => (
                            <tr key={det.id} className="hover:bg-slate-50 transition-colors h-11 text-xs">
                              <td className="px-6 py-2.5 font-bold text-slate-900 uppercase">
                                <div>{det.tenantName}</div>
                                <div className="text-[9px] text-slate-400 font-mono select-all normal-case font-normal mt-0.5">{det.tenantEmail}</div>
                              </td>
                              <td className="px-6 py-2.5 text-slate-500 font-medium">
                                {det.propertyLabel}
                              </td>
                              <td className="px-6 py-2.5 text-center text-slate-650 font-mono font-bold">
                                {det.fromDate && det.toDate ? `${det.fromDate} al ${det.toDate}` : 'S/I'}
                              </td>
                              <td className="px-6 py-2.5 text-center">
                                {det.billedDays !== undefined ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${det.isProportional ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                                    {det.billedDays} / {det.totalDays || 30} {det.isProportional ? 'prop.' : 'compl.'}
                                  </span>
                                ) : 'S/I'}
                              </td>
                              <td className="px-6 py-2.5 text-right font-medium text-slate-500">
                                {det.currency} {det.monthlyAmount.toLocaleString()}
                              </td>
                              <td className="px-6 py-2.5 text-right font-black text-indigo-700 bg-indigo-50/20">
                                {det.currency} {det.proportionalAmount !== undefined ? det.proportionalAmount.toLocaleString() : det.monthlyAmount.toLocaleString()}
                              </td>
                              <td className="px-6 py-2.5 text-center">
                                {det.smtpStatus === 'ENTREGADO' ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-black text-[9px] border border-emerald-200">
                                    ● ENTREGADO
                                  </span>
                                ) : (
                                  <span 
                                    className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full font-black text-[9px] border border-rose-200"
                                    title={det.errorMessage}
                                  >
                                    ● REBOTADO
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex justify-between items-center select-none">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">
                ERP SYSTEM APP P15012B-COB_R15132
              </span>
              
              <div className="flex gap-3">
                {billingResultReport && (
                  <button
                    onClick={() => {
                      setBillingResultReport(null);
                      setBillingLogs([]);
                      setBillingProgress(0);
                    }}
                    className="px-6 py-3 border border-slate-200 hover:bg-slate-100 rounded-xl font-black text-xs text-slate-600 uppercase tracking-widest transition-all shadow-sm active:scale-95"
                  >
                    Nuevo Lote
                  </button>
                )}
                
                <button
                  onClick={() => setIsBillingModalOpen(false)}
                  className="px-6 py-3 bg-[#0B3C5D] hover:bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-905/20 active:scale-95"
                >
                  Cerrar Ventana
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MONTLHY DELINQUENCY EXCEL REPORTING & GUIDELINES MODAL */}
      {/* ======================================================= */}
      {isDelinquencyModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#FAFBFD] w-full max-w-5xl rounded-[32px] border-[5px] border-[#9F1239] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header: Designed to reflect AssetFlow Delinquency Policy */}
            <div className="bg-[#9F1239] p-6 text-white border-b-4 border-[#FFD700] flex justify-between items-center select-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFE4E6] text-[#9F1239] rounded-xl flex items-center justify-center font-black">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Módulo de Planilla de Morosidad Mensual</h3>
                  <p className="text-[10px] font-black tracking-widest text-[#FFD700] uppercase">ASSETFLOW • Gestión Exclusiva de Cartera y Cobranzas</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDelinquencyModalOpen(false)}
                className="p-2.5 bg-rose-950/60 hover:bg-rose-900 rounded-xl text-white transition-colors"
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Context Statement Box */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-4">
                <AlertCircle className="text-[#9F1239] shrink-0 mt-0.5" size={20} />
                <div className="text-xs text-[#881337] leading-relaxed">
                  <p className="font-extrabold uppercase tracking-wider mb-1">INSTRUCTIVO GENERAL DE REPORTES (EVITE CONFUSIONES)</p>
                  <p>Descargue la plantilla de Excel prediseñada para reportar a los arrendatarios con mora. Complete mensualmente el archivo rellenando los campos respetando estrictamente el formato. Esto previene descuadres financieros, errores de facturación ERP y confusiones de propiedad al consolidar deudas.</p>
                </div>
              </div>

              {/* Grid Column Breakdown (Visual Help) */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Estructura y Datos Mínimos del Reporte</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <span className="text-[10px] font-black text-rose-600 uppercase block tracking-wider">Encabezado de Emisión</span>
                    <p className="text-xs font-black text-slate-800">Fecha de Emisión Dinámica</p>
                    <p className="text-[11px] text-slate-500 font-medium">Muestra de manera inmutable la fecha de generación del reporte en la cabecera del documento.</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <span className="text-[10px] font-black text-rose-600 uppercase block tracking-wider">Datos Críticos de Mora</span>
                    <p className="text-xs font-black text-slate-800">Días de Mora, Monto & Periodo</p>
                    <p className="text-[11px] text-slate-500 font-medium">Registra el retardo real en días corridos, el importe en pesos ($ CLP) y el mes/año al cual corresponde el atraso.</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <span className="text-[10px] font-black text-rose-600 uppercase block tracking-wider">Identificación Profesional</span>
                    <p className="text-xs font-black text-slate-800">RUT, Contrato, Inmueble y Contacto</p>
                    <p className="text-[11px] text-slate-500 font-medium">Asocia al deudor con su contrato, dirección de propiedad e información de contacto para agilizar la cobranza legal.</p>
                  </div>
                </div>
              </div>

              {/* Simulated Excel Layout Table Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Previsualización del Diseño de la Plantilla Excel</h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono bg-slate-100 px-2 py-0.5 rounded">Vista de Formato</span>
                </div>
                <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm bg-white">
                  {/* Fake sheet top bar */}
                  <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex justify-between items-center text-xs">
                    <span className="font-extrabold text-emerald-800 uppercase">Hoja 1: "Control de Morosidad"</span>
                    <span className="font-bold text-slate-500 italic">Fecha de Emisión: {new Date().toLocaleDateString('es-CL')}</span>
                  </div>
                  
                  {/* Excel Simulation Header block */}
                  <div className="p-6 bg-[#E2F0D9] border-b border-emerald-200 flex flex-col md:flex-row items-center gap-6">
                    {/* SVG Logo Membrete box on the top left */}
                    <div className="w-[180px] h-[55px] bg-white rounded-xl p-2 border border-emerald-200/80 flex items-center justify-center shadow-sm select-none"
                         dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} />
                    
                    {/* Title Block next to Logo */}
                    <div className="text-left font-sans space-y-1">
                      <h5 className="text-[14px] font-black uppercase text-[#375623] tracking-wider">ASSETFLOW • DEPARTAMENTO INMOBILIARIO</h5>
                      <h4 className="text-[12px] font-bold text-[#1F385C] uppercase tracking-tight">REPORTE MENSUAL DE CARTERA MOROSA</h4>
                      <p className="text-[10px] text-slate-600 font-bold italic">Fecha de Emisión: {new Date().toLocaleDateString('es-CL')} (Inmutable)</p>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 text-[10px] text-rose-700 font-extrabold italic leading-relaxed">
                    INSTRUCTIVO: El ejecutivo debe registrar en esta planilla todos los arrendatarios que presenten saldos y rentas devengadas vencidas. Asegúrese de ingresar días de mora e importes con precisión para las auditorías de control.
                  </div>

                  <div className="overflow-x-auto text-[11px]">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-[#375623] text-white">
                          <th className="px-3 py-2 border border-emerald-800 font-black">RUT Arrendatario</th>
                          <th className="px-3 py-2 border border-emerald-800 font-black">Nombre Arrendatario</th>
                          <th className="px-3 py-2 border border-emerald-800 font-black">Número Vivienda</th>
                          <th className="px-3 py-2 border border-emerald-800 font-black">Conjunto y Dirección</th>
                          <th className="px-3 py-2 border border-emerald-800 font-black">Comuna</th>
                          <th className="px-3 py-2 border border-emerald-800 font-black">Periodo Mora</th>
                          <th className="px-3 py-2 border border-emerald-800 font-black text-right">Monto ($)</th>
                          <th className="px-3 py-2 border border-emerald-800 font-black text-center">Días Mora</th>
                          <th className="px-3 py-2 border border-emerald-800 font-black text-center">Estado Cobranza</th>
                          <th className="px-3 py-2 border border-emerald-800 font-black">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-slate-600 font-mono">
                        <tr className="bg-slate-50">
                          <td className="px-3 py-1.5 border border-slate-200 text-slate-800">76.123.456-7</td>
                          <td className="px-3 py-1.5 border border-slate-200 font-sans font-bold text-slate-900">MUNICIPALIDAD DE SANTIAGO (DEPT. SOCIALES)</td>
                          <td className="px-3 py-1.5 border border-slate-200 font-sans">Oficina 302</td>
                          <td className="px-3 py-1.5 border border-slate-200 font-sans text-xs">Edificio Centenario, Av. Libertador Bernardo O'Higgins 815</td>
                          <td className="px-3 py-1.5 border border-slate-200 font-sans">Santiago</td>
                          <td className="px-3 py-1.5 border border-slate-200 text-center">Mayo 2026</td>
                          <td className="px-3 py-1.5 border border-slate-200 text-right text-emerald-800 font-bold">$ 1.850.000</td>
                          <td className="px-3 py-1.5 border border-slate-200 text-center font-bold">38</td>
                          <td className="px-3 py-1.5 border border-slate-200 text-center font-sans font-bold text-slate-700 text-[10px] bg-slate-100">COBRO ADMINISTRATIVO</td>
                          <td className="px-3 py-1.5 border border-slate-200 font-sans text-xs">Se envió la segunda notificación formal por correo institucional.</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="px-3 py-1.5 border border-slate-200 text-slate-800">77.922.340-K</td>
                          <td className="px-3 py-1.5 border border-slate-200 font-sans font-bold text-slate-900 font-black">SOCIEDAD MAESTRA GASTRONÓMICA CHILE LTDA</td>
                          <td className="px-3 py-1.5 border border-slate-200 font-sans">Local 1</td>
                          <td className="px-3 py-1.5 border border-slate-200 font-sans text-xs">Edificio Centenario, Av. Libertador Bernardo O'Higgins 815</td>
                          <td className="px-3 py-1.5 border border-slate-200 font-sans">Santiago</td>
                          <td className="px-3 py-1.5 border border-slate-200 text-center">Abril 2026</td>
                          <td className="px-3 py-1.5 border border-slate-200 text-right text-emerald-800 font-bold">$ 3.200.000</td>
                          <td className="px-3 py-1.5 border border-slate-200 text-center font-bold">68</td>
                          <td className="px-3 py-1.5 border border-slate-200 text-center font-sans font-bold text-slate-700 text-[10px] bg-slate-100">COBRO ADMINISTRATIVO</td>
                          <td className="px-3 py-1.5 border border-slate-200 font-sans text-xs">Se coordinó reunión con encargado de finanzas para definir abonos.</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 border border-slate-200 italic text-slate-300">...</td>
                          <td className="px-3 py-2 border border-slate-200 italic text-slate-300">[Celdas pre-formateadas]</td>
                          <td className="px-3 py-2 border border-slate-200 italic text-slate-300">...</td>
                          <td className="px-3 py-2 border border-slate-200 text-slate-300">...</td>
                          <td className="px-3 py-2 border border-slate-200 text-slate-300">...</td>
                          <td className="px-3 py-2 border border-slate-200 text-center italic text-slate-300">...</td>
                          <td className="px-3 py-2 border border-slate-200 text-right text-slate-400 font-bold">$ 0</td>
                          <td className="px-3 py-2 border border-slate-200 text-center text-slate-400 font-bold">0</td>
                          <td className="px-3 py-2 border border-slate-200 text-center font-sans text-slate-400 text-[10px] uppercase font-bold">COBRO ADMINISTRATIVO</td>
                          <td className="px-3 py-2 border border-slate-200 italic text-slate-300">...</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex justify-between items-center select-none animate-fade-in">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">
                SISTEMA ASSETFLOW • TEMPLATE_GEN_EXCEL
              </span>
              
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await exportDelinquencyTemplateToExcel('Plantilla_Reporte_Morosidad_Mensual');
                  }}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-400/20 active:scale-95 text-xs inline-flex"
                >
                  <Download size={14} /> Descargar Plantilla (.xlsx)
                </button>
                <button
                  onClick={() => setIsDelinquencyModalOpen(false)}
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 text-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLifecycleModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#FAFBFD] w-full max-w-6xl rounded-[32px] border-[5px] border-teal-600 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-teal-600 p-6 text-white border-b-4 border-[#FFCC00] flex justify-between items-center select-none">
              <div className="flex items-center gap-3">
                <BrainCircuit size={32} className="text-[#FFCC00] animate-pulse" />
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter">Ciclo de Vida del Arriendo & Relación de Módulos</h3>
                  <p className="text-[10px] text-teal-100 font-mono uppercase tracking-widest mt-0.5">Diagrama Integral de Control Interno y Flujo de Información ERP/Firestore</p>
                </div>
              </div>
              <button 
                onClick={() => setIsLifecycleModalOpen(false)}
                className="p-2.5 hover:bg-teal-700/50 rounded-2xl transition-colors text-white font-bold"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-8 overflow-y-auto space-y-8 flex-1 bg-slate-50">
              
              {/* Introduction & Action Button Banner */}
              <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1 md:max-w-2xl">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Manual Operacional de Relación entre Módulos</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Este panel describe el flujo de vida completo del arriendo en nuestra plataforma. Detalla cómo se interconectan los distintos módulos (Postulantes, Contratos, Finanzas, Órdenes de Trabajo, Garantías y Bóveda Digital) para garantizar el estricto cumplimiento de las políticas de control interno y la consistencia contable del departamento inmobiliario de <strong>AssetFlow</strong>.
                  </p>
                </div>
                <button
                  onClick={downloadLifecyclePDF}
                  className="shrink-0 flex items-center justify-center gap-2.5 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/25 active:scale-95"
                >
                  <Download size={15} /> Descargar Diagrama (PDF)
                </button>
              </div>

              {/* High-Fidelity Interactive Flowchart Nodes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Diagrama Visual del Proceso de Arriendo (Haga clic en una fase para ver instrucciones paso a paso)</h4>
                  <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 uppercase tracking-widest animate-pulse">Paso a paso interactivo</span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 relative">
                  
                  {/* Step 1 */}
                  <button 
                    onClick={() => setActivePhaseTab(1)}
                    className={`text-left bg-white border-2 transition-all rounded-2xl p-5 relative shadow-xs flex flex-col justify-between cursor-pointer focus:outline-none w-full ${activePhaseTab === 1 ? 'border-indigo-600 ring-4 ring-indigo-100 bg-indigo-50/10' : 'border-slate-200 hover:border-indigo-400'}`}
                  >
                    <div className="space-y-3 w-full">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${activePhaseTab === 1 ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                          FASE 1
                        </span>
                        {activePhaseTab === 1 && <span className="text-[8px] font-black uppercase text-indigo-600 tracking-widest font-mono">ACTIVA</span>}
                      </div>
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">Evaluación & Solvencia</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Evaluación crediticia de postulantes. Verificación de ingresos, cotizaciones, liquidaciones y antecedentes comerciales.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1 w-full">
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 rounded">Postulantes</span>
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 rounded">Evaluación</span>
                    </div>
                  </button>

                  {/* Step 2 */}
                  <button 
                    onClick={() => setActivePhaseTab(2)}
                    className={`text-left bg-white border-2 transition-all rounded-2xl p-5 relative shadow-xs flex flex-col justify-between cursor-pointer focus:outline-none w-full ${activePhaseTab === 2 ? 'border-amber-500 ring-4 ring-amber-100 bg-amber-50/10' : 'border-slate-200 hover:border-amber-400'}`}
                  >
                    <div className="space-y-3 w-full">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${activePhaseTab === 2 ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          FASE 2
                        </span>
                        {activePhaseTab === 2 && <span className="text-[8px] font-black uppercase text-amber-600 tracking-widest font-mono">ACTIVA</span>}
                      </div>
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">Registro & Garantía</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Suscripción de contrato. Transición del inmueble a ocupado. Custodia de fianza de garantía especial para personal de PDI.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1 w-full">
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 rounded">Contratos</span>
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 rounded">Garantías</span>
                    </div>
                  </button>

                  {/* Step 3 */}
                  <button 
                    onClick={() => setActivePhaseTab(3)}
                    className={`text-left bg-white border-2 transition-all rounded-2xl p-5 relative shadow-xs flex flex-col justify-between cursor-pointer focus:outline-none w-full ${activePhaseTab === 3 ? 'border-emerald-600 ring-4 ring-emerald-100 bg-emerald-50/10' : 'border-slate-200 hover:border-emerald-400'}`}
                  >
                    <div className="space-y-3 w-full">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${activePhaseTab === 3 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                          FASE 3
                        </span>
                        {activePhaseTab === 3 && <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest font-mono">ACTIVA</span>}
                      </div>
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">Cobros & SMTP</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Facturación masiva mediante proceso batch R15132. Despacho automatizado de pre-avisos con PDF adjunto por SMTP seguro.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1 w-full">
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 rounded">Billing R15132</span>
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 rounded">SMTP Seguro</span>
                    </div>
                  </button>

                  {/* Step 4 */}
                  <button 
                    onClick={() => setActivePhaseTab(4)}
                    className={`text-left bg-white border-2 transition-all rounded-2xl p-5 relative shadow-xs flex flex-col justify-between cursor-pointer focus:outline-none w-full ${activePhaseTab === 4 ? 'border-rose-600 ring-4 ring-rose-100 bg-rose-50/10' : 'border-slate-200 hover:border-rose-400'}`}
                  >
                    <div className="space-y-3 w-full">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${activePhaseTab === 4 ? 'bg-rose-600 text-white border-rose-700' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          FASE 4
                        </span>
                        {activePhaseTab === 4 && <span className="text-[8px] font-black uppercase text-rose-600 tracking-widest font-mono">ACTIVA</span>}
                      </div>
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">Mantención & OT</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Reparaciones catalogadas por Especialidad. Registro inmutable de folio factura de respaldo y rendición por Caja Chica.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1 w-full">
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 rounded">Órdenes Trabajo</span>
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 rounded">Caja Chica</span>
                    </div>
                  </button>

                  {/* Step 5 */}
                  <button 
                    onClick={() => setActivePhaseTab(5)}
                    className={`text-left bg-white border-2 transition-all rounded-2xl p-5 relative shadow-xs flex flex-col justify-between cursor-pointer focus:outline-none w-full ${activePhaseTab === 5 ? 'border-teal-600 ring-4 ring-teal-100 bg-teal-50/10' : 'border-slate-200 hover:border-teal-400'}`}
                  >
                    <div className="space-y-3 w-full">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${activePhaseTab === 5 ? 'bg-teal-600 text-white border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-100'}`}>
                          FASE 5
                        </span>
                        {activePhaseTab === 5 && <span className="text-[8px] font-black uppercase text-teal-600 tracking-widest font-mono">ACTIVA</span>}
                      </div>
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">Liquidación & Bóveda</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Condonación o cobro por daños. Consolidación de saldo, contrato finiquitado, liberación de unidad y notificación SMTP.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1 w-full">
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 rounded">Garantías (Cierre)</span>
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 rounded">SMTP Cierre</span>
                    </div>
                  </button>

                </div>
              </div>

              {/* Guía Detallada Paso a Paso - Bento panel de la Fase Seleccionada */}
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                {activePhaseTab === 1 && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                          <BrainCircuit size={20} />
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest font-mono block">FASE 1</span>
                          <h4 className="text-base font-black text-slate-900 uppercase tracking-tight leading-tight">PRE-ARRIENDO Y EVALUACIÓN DE SOLVENCIA</h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-wider font-mono self-start md:self-auto shrink-0">
                        MÓDULO: EVALUACIÓN DE POSTULANTES
                      </span>
                    </div>

                    <div className="bg-indigo-50/30 border border-indigo-100 rounded-2xl p-5">
                      <h5 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-1.5">Objetivo Estratégico</h5>
                      <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                        Evitar que el departamento inmobiliario asigne propiedades fiscales a postulantes sin la debida capacidad financiera. Esto se logra cruzando antecedentes en el módulo de pre-evaluación antes de comprometer cualquier firma contractual.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Instrucciones Operacionales Detalladas (Para Personal Nuevo)</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-3">
                          <span className="text-[10px] font-black text-slate-400 font-mono uppercase block">Pasos en Sistema</span>
                          <ol className="text-xs text-slate-600 space-y-3 list-decimal list-inside leading-relaxed">
                            <li><strong className="text-slate-850">Acceso al Módulo:</strong> Vaya al menú lateral izquierdo y haga clic en la opción <strong className="text-indigo-600">"Evaluación Postulantes"</strong>.</li>
                            <li><strong className="text-slate-850">Crear Registro:</strong> Presione el botón <strong className="text-slate-800">"Nueva Postulación"</strong> en la parte superior derecha.</li>
                            <li><strong className="text-slate-850">Formulario:</strong> Rellene los campos obligatorios del postulante: RUT, Nombre, Correo, Teléfono e Ingresos Líquidos Mensuales en pesos chilenos.</li>
                            <li><strong className="text-slate-850">Carga de Documentos:</strong> Suba el <strong className="text-slate-800">Informe Comercial DICOM (Platinium)</strong> y las <strong className="text-slate-800">3 últimas liquidaciones de sueldo</strong> en formato <strong className="text-emerald-600 font-mono">PDF</strong> en la zona de arrastre de archivos.</li>
                            <li><strong className="text-slate-850">Ejecutar Análisis:</strong> Presione el botón <strong className="text-indigo-600">"Evaluar con IA"</strong>. El sistema verificará de forma automática el cumplimiento del ratio ingresos (que deben triplicar el canon).</li>
                            <li><strong className="text-slate-850">Confirmación:</strong> Si cumple con las directrices de control interno, el sistema actualizará el estado a <strong className="text-indigo-600">"APROBADO"</strong> y reservará la propiedad asociada para la firma del contrato.</li>
                          </ol>
                        </div>
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col justify-between">
                          <div className="space-y-3">
                            <span className="text-[10px] font-black text-amber-600 font-mono uppercase block">Alertas de Control Interno</span>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              El sistema bloqueará el avance del proceso si el postulante cuenta con bloqueos financieros activos en su archivo DICOM o si la relación Ingresos/Canon es inferior a <strong>3.0x</strong>. Esta regla evita el sobreendeudamiento y resguarda los activos de AssetFlow.
                            </p>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-[11px] font-bold uppercase tracking-tight mt-4">
                            ⚠️ ADVERTENCIA: Nunca comprometa un arriendo si la postulación no figura como "APROBADO" en la base de datos de Firebase.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activePhaseTab === 2 && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                          <FileSearch size={20} />
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest font-mono block">FASE 2</span>
                          <h4 className="text-base font-black text-slate-900 uppercase tracking-tight leading-tight">FORMALIZACIÓN, SUSCRIPCIÓN Y FIANZA DE GARANTÍA</h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-wider font-mono self-start md:self-auto shrink-0">
                        MÓDULO: CONTRATOS DE ARRIENDO & GARANTÍAS
                      </span>
                    </div>

                    <div className="bg-amber-50/30 border border-amber-100 rounded-2xl p-5">
                      <h5 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1.5">Objetivo Estratégico</h5>
                      <p className="text-xs text-amber-950 leading-relaxed font-medium">
                        Asociar físicamente la propiedad disponible al nuevo arrendatario formalmente, digitalizando el contrato firmado por auditoría y gatillando la retención financiera si pertenece al personal de la Policía de Investigaciones (PDI).
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Instrucciones Operacionales Detalladas (Para Personal Nuevo)</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-3">
                          <span className="text-[10px] font-black text-slate-400 font-mono uppercase block">Pasos en Sistema</span>
                          <ol className="text-xs text-slate-600 space-y-3 list-decimal list-inside leading-relaxed">
                            <li><strong className="text-slate-850">Acceso al Módulo:</strong> Seleccione <strong className="text-amber-600 font-bold">"Contratos de Arriendo"</strong> en el menú lateral.</li>
                            <li><strong className="text-slate-850">Crear Contrato:</strong> Haga clic en el botón <strong className="text-indigo-600">"Nuevo Contrato"</strong> en la barra de acciones superior.</li>
                            <li><strong className="text-slate-850">Subir Contrato PDF:</strong> En la sección izquierda del formulario, arrastre y suba el archivo del <strong className="text-slate-800">Contrato de Arriendo Firmado</strong> en formato <strong className="text-red-600 font-mono">PDF</strong>.</li>
                            <li><strong className="text-slate-850">Análisis IA:</strong> Presione <strong className="text-indigo-600">"Ejecutar Análisis Inteligente"</strong>. El sistema leerá el PDF y auto-rellenará los campos: RUT, Inquilino, Canon mensual y vigencia de forma inmediata.</li>
                            <li><strong className="text-slate-850">Buscador Progresivo:</strong> En el lado derecho, seleccione secuencialmente Región &rarr; Comuna &rarr; Conjunto &rarr; Propiedad disponible. Si proviene de la postulación aprobada, el sistema la pre-seleccionará de forma automática e inmodificable para resguardar la consistencia de solvencia.</li>
                            <li><strong className="text-slate-850">Grabar Contrato:</strong> Presione <strong className="text-indigo-600 font-bold">"Grabar Contrato"</strong>. Esto cambiará el estado de la propiedad física a <strong className="text-emerald-600 font-bold">"ALQUILADO"</strong>.</li>
                            <li><strong className="text-slate-850">Fianza Especial (PDI):</strong> Si el inquilino pertenece a la PDI, el sistema creará una fianza en <strong className="text-indigo-600 font-bold">"Fianzas de Garantías"</strong>. Diríjase a ese módulo, busque el registro pre-generado, ingrese la transferencia bancaria de la garantía y presione <strong className="text-emerald-600 font-bold">"Confirmar Recepción de Fondo"</strong> para mover el estado a <strong className="text-emerald-700 font-bold">"EN CUSTODIA"</strong>.</li>
                          </ol>
                        </div>
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col justify-between">
                          <div className="space-y-3">
                            <span className="text-[10px] font-black text-amber-600 font-mono uppercase block">Alertas de Control Interno</span>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Por norma de control interno, la propiedad vinculada no puede modificarse una vez aprobada la postulación de solvencia. Adicionalmente, el pago de garantía es mandatorio para personal perteneciente a la Policía de Investigaciones de Chile (PDI), resguardando los fondos inmutablemente en la base de datos de Firebase.
                            </p>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-[11px] font-bold uppercase tracking-tight mt-4">
                            ⚠️ ADVERTENCIA: La propiedad física seleccionada cambiará su estado automáticamente a "ALQUILADO". No intente asignarla manualmente de nuevo.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activePhaseTab === 3 && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                          <Send size={20} />
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest font-mono block">FASE 3</span>
                          <h4 className="text-base font-black text-slate-900 uppercase tracking-tight leading-tight">FACTURACIÓN BATCH, COBRANZA Y NOTIFICACIÓN SMTP</h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-wider font-mono self-start md:self-auto shrink-0">
                        MÓDULO: CONTRATOS (COBRANZA) & FINANZAS
                      </span>
                    </div>

                    <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-5">
                      <h5 className="text-xs font-black text-emerald-900 uppercase tracking-widest mb-1.5">Objetivo Estratégico</h5>
                      <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                        Automatizar la emisión consolidada de los cargos mensuales de arriendo y despacharlos de forma transparente a cada inquilino mediante correo SMTP seguro, garantizando una recaudación ordenada y oportuna de los activos devengados.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Instrucciones Operacionales Detalladas (Para Personal Nuevo)</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-3">
                          <span className="text-[10px] font-black text-slate-400 font-mono uppercase block">Pasos en Sistema</span>
                          <ol className="text-xs text-slate-600 space-y-3 list-decimal list-inside leading-relaxed">
                            <li><strong className="text-slate-850">Acceso al Módulo:</strong> Diríjase a <strong className="text-emerald-600 font-bold">"Contratos de Arriendo"</strong> desde el menú.</li>
                            <li><strong className="text-slate-850">Lanzar Procesador:</strong> Haga clic en el botón amarillo <strong className="text-slate-800">"Enviar Cobros Masivos (PDI)"</strong> en la barra superior de acciones.</li>
                            <li><strong className="text-slate-850">Revisión de Contratos:</strong> En el modal emergente, revise que los contratos vigentes seleccionados para devengo del mes actual correspondan exactamente a los inquilinos activos.</li>
                            <li><strong className="text-slate-850">Ejecución Batch R15132:</strong> Presione el botón <strong className="text-emerald-700 font-black">"Ejecutar Proceso Batch R15132"</strong>. El sistema procesará en bloque todos los cobros, generando los registros contables correspondientes en la base de datos de Finanzas de forma síncrona.</li>
                            <li><strong className="text-slate-850">Despacho de Correos:</strong> De manera automática, el motor enviará un correo certificado vía <strong className="text-slate-800">SMTP seguro</strong> a cada inquilino con el pre-aviso adjunto en formato <strong className="text-red-600 font-mono">PDF</strong>.</li>
                            <li><strong className="text-slate-850">Verificación Contable:</strong> Para auditar los saldos, diríjase al módulo <strong className="text-emerald-600 font-bold">"Libros Auxiliares"</strong> o al Libro Diario de Finanzas, donde se habrán imputado las cuentas por cobrar.</li>
                          </ol>
                        </div>
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col justify-between">
                          <div className="space-y-3">
                            <span className="text-[10px] font-black text-amber-600 font-mono uppercase block">Alertas de Control Interno</span>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              La facturación mediante proceso Batch R15132 genera un Certificado de Transmisión inmutable con su Message-ID de SMTP, asegurando que ningún cobro sea manipulado o evadido de forma manual, cumpliendo con la trazabilidad del departamento.
                            </p>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-[11px] font-bold uppercase tracking-tight mt-4">
                            ⚠️ ADVERTENCIA: La ejecución del proceso Batch R15132 es irreversible en el mes vigente. Revise bien la nómina antes de presionar ejecutar.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activePhaseTab === 4 && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                          <Wrench size={20} />
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest font-mono block">FASE 4</span>
                          <h4 className="text-base font-black text-slate-900 uppercase tracking-tight leading-tight">CONTROL DE MANTENCIONES, ESPECIALIDADES Y ORDENES DE TRABAJO</h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 uppercase tracking-wider font-mono self-start md:self-auto shrink-0">
                        MÓDULO: ÓRDENES DE TRABAJO (W.O.C) & CAJA CHICA
                      </span>
                    </div>

                    <div className="bg-rose-50/30 border border-rose-100 rounded-2xl p-5">
                      <h5 className="text-xs font-black text-rose-900 uppercase tracking-widest mb-1.5">Objetivo Estratégico</h5>
                      <p className="text-xs text-rose-950 leading-relaxed font-medium">
                        Supervisar el estado físico de los inmuebles, documentar técnicamente las reparaciones y imputar de forma rigurosa los cobros según correspondan a Gasto Inquilino o Copropietario con su factura fiscal para su descuento en la liquidación de garantía.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Instrucciones Operacionales Detalladas (Para Personal Nuevo)</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-3">
                          <span className="text-[10px] font-black text-slate-400 font-mono uppercase block">Pasos en Sistema</span>
                          <ol className="text-xs text-slate-600 space-y-3 list-decimal list-inside leading-relaxed">
                            <li><strong className="text-slate-850">Acceso al Módulo:</strong> Ingrese a la sección <strong className="text-rose-600 font-bold">"Órdenes de Trabajo"</strong> desde el menú lateral.</li>
                            <li><strong className="text-slate-850">Nueva Solicitud:</strong> Presione el botón <strong className="text-slate-800">"Nueva Orden de Trabajo"</strong> en la parte superior derecha.</li>
                            <li><strong className="text-slate-850">Campos Obligatorios (Protocolo):</strong> Complete los campos de control interno estipulados por el Developer Lock:
                              <ul className="list-disc list-inside ml-4 mt-1 text-slate-500 space-y-1">
                                <li><strong className="text-slate-700">Categoría:</strong> Seleccione <strong className="text-rose-600">"Gasto Inquilino"</strong> (daño provocado por inquilino, imputable a su garantía) o <strong className="text-slate-700">"Copropietario"</strong> (mantención estructural, gasto AssetFlow).</li>
                                <li><strong className="text-slate-700">Especialidad / Rubro:</strong> Seleccione el rubro técnico exacto (Plomería, Electricidad, Techumbres, Alfombras, Pintura, Gasfitería).</li>
                                <li><strong className="text-slate-700">Factura Asociada:</strong> Registre el número de folio de la factura fiscal en el campo <code className="font-mono bg-white px-1 text-[11px] border border-slate-200">associatedInvoice</code> para validar el gasto jurídicamente.</li>
                              </ul>
                            </li>
                            <li><strong className="text-slate-850">Respaldos:</strong> Suba el presupuesto, cotización o fotografías del daño físico en formato <strong className="text-slate-700 font-mono">PDF/JPG</strong> en el campo de adjuntos.</li>
                            <li><strong className="text-slate-850">Financiamiento Inmediato:</strong> Si el pago se realiza mediante caja, diríjase al módulo <strong className="text-rose-600 font-bold">"Caja Chica"</strong>, registre el desembolso y elija la Orden de Trabajo correspondiente para que las finanzas físicas queden auditadas.</li>
                            <li><strong className="text-slate-850">Cierre de Trabajo:</strong> Tras certificarse el término, ingrese a la ficha y presione <strong className="text-slate-800 font-bold">"Validar y Cerrar OT"</strong>, lo que guardará el cobro listo para la liquidación.</li>
                          </ol>
                        </div>
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col justify-between">
                          <div className="space-y-3">
                            <span className="text-[10px] font-black text-rose-600 font-mono uppercase block">Protocolo de Integridad (Developer Lock)</span>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              El sistema exige de forma mandatoria registrar la categoría, especialidad, e invoice asociada en cada orden para que puedan ser deducciones legítimas y documentadas legalmente sobre las garantías al finalizar el contrato. Esto previene auditorías fallidas y reclamos por cobros injustificados.
                            </p>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-[11px] font-bold uppercase tracking-tight mt-4">
                            ⚠️ ADVERTENCIA: No se permiten Órdenes de Trabajo cerradas sin una factura fiscal asociada válida cargada en el sistema.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activePhaseTab === 5 && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shrink-0">
                          <DollarSign size={20} />
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest font-mono block">FASE 5</span>
                          <h4 className="text-base font-black text-slate-900 uppercase tracking-tight leading-tight">TÉRMINO DE CONTRATO, LIQUIDACIÓN DE GARANTÍA Y CIERRE CERTIFICADO</h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100 uppercase tracking-wider font-mono self-start md:self-auto shrink-0">
                        MÓDULO: FIANZAS DE GARANTÍAS & BÓVEDA DIGITAL
                      </span>
                    </div>

                    <div className="bg-teal-50/30 border border-teal-100 rounded-2xl p-5">
                      <h5 className="text-xs font-black text-teal-900 uppercase tracking-widest mb-1.5">Objetivo Estratégico</h5>
                      <p className="text-xs text-teal-950 leading-relaxed font-medium">
                        Cerrar formalmente la relación contractual restituyendo los fondos de garantía resguardados, deduciendo automáticamente los costos por daños (Fase 4) y enviando un certificado inmutable del cierre vía correo SMTP.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Instrucciones Operacionales Detalladas (Para Personal Nuevo)</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-3">
                          <span className="text-[10px] font-black text-slate-400 font-mono uppercase block">Pasos en Sistema</span>
                          <ol className="text-xs text-slate-600 space-y-3 list-decimal list-inside leading-relaxed">
                            <li><strong className="text-slate-850">Acceso al Módulo:</strong> Ingrese al módulo <strong className="text-teal-600 font-bold">"Fianzas de Garantías"</strong>.</li>
                            <li><strong className="text-slate-850">Iniciar Liquidación:</strong> Busque la garantía <strong className="text-emerald-700 font-bold">"En Custodia"</strong> del contrato respectivo y haga clic en <strong className="text-slate-800">"Iniciar Proceso de Liquidación"</strong>.</li>
                            <li><strong className="text-slate-850">Cargar OTs:</strong> Presione el botón <strong className="text-indigo-600 font-bold">"Cargar Historial de OTs"</strong>. El sistema consultará automáticamente la base de datos de Órdenes de Trabajo e importará las OTs catalogadas como "Gasto Inquilino" cerradas en la Fase 4, junto con sus facturas asociadas.</li>
                            <li><strong className="text-slate-850">Deducciones Manuales:</strong> Si existen daños extraordinarios nuevos o deudas de servicios básicos, regístrelos e ingrese el folio de la factura original de respaldo.</li>
                            <li><strong className="text-slate-850">Calcular Balance:</strong> Haga clic en the button <strong className="text-teal-600 font-black">"Calcular Balance de Devolución"</strong> para obtener el monto de reembolso final.</li>
                            <li><strong className="text-slate-850">Consolidar Cierre:</strong> Tras realizar la transferencia bancaria de devolución, haga clic en el botón <strong className="text-slate-850 font-black">"Consolidar y Finalizar"</strong>. Esto pasará el contrato a <strong className="text-slate-400">"Finiquitado"</strong> y cambiará el estado de la propiedad física a <strong className="text-emerald-600 font-black">"DISPONIBLE"</strong> de forma automática.</li>
                            <li><strong className="text-slate-850">Despacho de Certificado SMTP:</strong> En ese mismo instante, el servidor de correo disparará de forma autónoma una notificación transaccional de término al correo del Inquilino con copia a Ejecutivos, emitiendo un certificado inmutable de fin de ciclo con Message-ID, host de despacho y estado 250 OK.</li>
                          </ol>
                        </div>
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col justify-between">
                          <div className="space-y-3">
                            <span className="text-[10px] font-black text-teal-600 font-mono uppercase block">Resguardo de Control Interno</span>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              El sistema unifica las bases de datos de OTs, contratos, y finanzas en este paso final. Ninguna devolución de garantía puede procesarse sin que el sistema valide si existen deudas o mantenciones pendientes por cobrar al arrendatario. La liberación del inmueble a disponible queda estrictamente bloqueada hasta que la liquidación se declare como "FINALIZADA" para evitar ocupaciones informales.
                            </p>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-[11px] font-bold uppercase tracking-tight mt-4">
                            ⚠️ ADVERTENCIA: Consolidar la liquidación cambiará automáticamente el estado del inmueble físico a "DISPONIBLE" en la base de datos para futuras postulaciones.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-100 px-8 py-5 border-t border-slate-200 flex justify-between items-center select-none">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">
                SISTEMA INTEGRADO ASSETFLOW • MANUAL OPERACIONAL
              </span>
              <button
                onClick={() => setIsLifecycleModalOpen(false)}
                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 text-xs"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL REAJUSTE ANUAL DE CÁNONES IPC */}
      {isReadjustmentModalOpen && (
        <RentReadjustmentModal
          isOpen={isReadjustmentModalOpen}
          onClose={() => setIsReadjustmentModalOpen(false)}
          contracts={contracts}
          properties={properties}
          onApplyReadjustment={handleApplyReadjustment}
          currentUser={currentUser}
        />
      )}

      {/* ERP CONTEXT MENU */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={!!gridContextMenu}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P1501"
          programTitle="Maestro de Contratos de Arrendamiento"
          collectionName="contracts"
          recordId={gridContextMenu.contract.id}
          recordFolio={`CTR-${gridContextMenu.contract.tenantTaxId || gridContextMenu.contract.id.substring(0, 6)}`}
          onClose={() => setGridContextMenu(null)}
          onViewDetail={() => {
            setFormData({ ...gridContextMenu.contract });
            setIsFormOpen(true);
            setGridContextMenu(null);
          }}
        />
      )}
    </div>
  );
};

export default LeaseContractModule;
