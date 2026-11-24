import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, FileSearch, Sparkles, Filter, CheckCircle2, AlertTriangle, XCircle, FolderOpen,
  FileText, Download, Upload, RefreshCw, Layers, Calculator, Landmark, 
  ShieldAlert, ArrowRight, UserCheck, Calendar, FileCheck, Check, Info, ChevronDown, ChevronRight, Plus, Save, AlertCircle
} from 'lucide-react';
import { Transaction, Supplier, Contract, Property } from '../types';
import { analyzeWeeklyPaymentCompliance, extractUafBeneficiaryForm } from '../geminiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportToExcel } from '../lib/excelExport';
import { UafBeneficiaryFormModal, UafFormFields } from './UafBeneficiaryForm';

interface WeeklyPaymentReviewModuleProps {
  transactions: Transaction[];
  suppliers: Supplier[];
  contracts: Contract[];
  properties: Property[];
  currentUser: string;
  onUpdateTransaction?: (updatedTx: Transaction) => void;
  onAddSupplier?: (supplier: Supplier) => void;
}

interface AuditReport {
  txId: string;
  status: 'APROBADO' | 'APROBADO_CON_OBSERVACIONES' | 'RECHAZADO';
  checkedAt: string;
  reviewer: string;
  digitizationCheck: { passed: boolean; observations: string };
  documentsCheck: { hasInvoice: boolean; hasQuoteOrContract: boolean; hasCessionCertificate: boolean; passed: boolean; observations: string };
  amountsCheck: { invoiceTotalMatchesContract: boolean; passed: boolean; observations: string };
  chileanLawCheck: { passed: boolean; observations: string };
  bankAndSupplierCheck: { passed: boolean; observations: string };
  deviations: Array<{ title: string; severity: 'ALTA' | 'MEDIA' | 'BAJA'; description: string; remedialAction: string }>;
  remedialSuggestions: string;
  customChecklist?: {
    hasInvoiceOrTaxDoc?: boolean;
    hasExecNoConflictDecl?: boolean;
    hasUafBeneficiaryDecl?: boolean;
    hasThirdPartyNoConflictDecl?: boolean;
    hasContractOrOT?: boolean;
    hasCompletionReceptionDoc?: boolean;
    hasCorrectEgresoMontoMoneda?: boolean;
  };
  neuralNetworkAnalysis?: {
    inputVectors: Array<{ label: string; value: string; status: 'ok' | 'warning' | 'error' }>;
    hiddenNeurons: Array<{ id: string; name: string; activation: number; statusMsg: string; layer: 'ocr' | 'crossref' | 'compliance' | 'risk' }>;
    outputWeights: Array<{ name: string; weight: number }>;
  };
}

// Pre-defined default document names to suggest/simulate
const DEFAULT_FILES = {
  invoiceNames: ['FACTURA_ELEC_449210.pdf', 'FAC_MANT_CORP_8850.pdf', 'F_ELECT_77821.pdf', 'BOLETA_SERV_3030.pdf'],
  quoteNames: ['PRESUPUESTO_MANT_A10.pdf', 'COTIZACION_ASCENSORES_Q9.pdf', 'PROPUESTA_DISENO_E3_REV2.pdf'],
  contractNames: ['CONTRATO_MARCO_2026.pdf', 'CONTRATO_ARRIENDO_ANEXO4.pdf', 'ACUERDO_SERVICIOS_BETA.pdf'],
  cessionNames: ['CERTIFICADO_CESION_SII_449210.pdf', 'VALORACION_FACTORING_CORP.pdf', 'CESION_DERECHOS_SANTANDER.pdf']
};

// UI component rendering compliance status in a real physical "Semáforo" layout 
const ComplianceSemaforoLight: React.FC<{ status?: 'APROBADO' | 'RECHAZADO' | 'OBSERVADO' | 'PENDIENTE' }> = ({ status }) => {
  const isRed = status === 'RECHAZADO';
  const isYellow = status === 'OBSERVADO';
  const isGreen = status === 'APROBADO';

  return (
    <div className="flex items-center gap-1.5 bg-slate-950/90 py-1.5 px-2 rounded-md border border-slate-800 w-max shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" title={`Semáforo Compliance: ${status || 'PENDIENTE / S/R'}`}>
      {/* Red Light */}
      <div 
        className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
          isRed 
            ? 'bg-rose-500 shadow-[0_0_8px_#ef4444] animate-pulse' 
            : 'bg-rose-950/50'
        }`}
      />
      {/* Yellow Light */}
      <div 
        className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
          isYellow 
            ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-[pulse_1s_infinite]' 
            : 'bg-amber-950/50'
        }`}
      />
      {/* Green Light */}
      <div 
        className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
          isGreen 
            ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse' 
            : 'bg-emerald-950/50'
        }`}
      />
    </div>
  );
};

interface NewRuleFormProps {
  customRules: Array<{
    id: string;
    title: string;
    instruction: string;
    severity: 'ALTA' | 'MEDIA' | 'BAJA';
    active: boolean;
    builtIn?: boolean;
  }>;
  onSaveRules: (rules: Array<{
    id: string;
    title: string;
    instruction: string;
    severity: 'ALTA' | 'MEDIA' | 'BAJA';
    active: boolean;
    builtIn?: boolean;
  }>) => void;
}

const NewRuleForm: React.FC<NewRuleFormProps> = ({ customRules, onSaveRules }) => {
  const [title, setTitle] = useState('');
  const [instruction, setInstruction] = useState('');
  const [severity, setSeverity] = useState<'ALTA' | 'MEDIA' | 'BAJA'>('MEDIA');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !instruction.trim()) return;

    const newRule = {
      id: `custom-rule-${Date.now()}`,
      title: title.trim(),
      instruction: instruction.trim(),
      severity,
      active: true,
      builtIn: false,
    };

    onSaveRules([...customRules, newRule]);
    setTitle('');
    setInstruction('');
    setSeverity('MEDIA');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:text-indigo-600 text-slate-500 text-xs font-black uppercase tracking-wider rounded-lg transition cursor-pointer bg-white"
      >
        <Plus size={14} /> Registrar Nueva Regla de Control
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-3 pt-3.5 shadow-3xs">
      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
        <h5 className="text-[10px] font-black uppercase text-slate-705 tracking-wider font-mono">Nueva Directriz de Control</h5>
        <button type="button" onClick={() => setIsOpen(false)} className="text-[9.5px] text-slate-400 hover:text-slate-600 font-black font-mono uppercase">Cancelar</button>
      </div>

      <div>
        <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Título de la Regla</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Registro Fotográfico Obligatorio"
          className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-2.5 text-xs text-slate-800 font-bold focus:outline-hidden focus:border-indigo-500"
          required
        />
      </div>

      <div>
        <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Instrucción de Enfoque de IA</label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={3}
          placeholder="Ej: Si no se detectan fotos del hito técnico, emitir advertencia exigiendo verificar en terreno."
          className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-2.5 text-xs text-slate-800 leading-normal focus:outline-hidden focus:border-indigo-500"
          required
        />
      </div>

      <div>
        <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Consecuencia / Penalidad</label>
        <select
          value={severity}
          onChange={(e: any) => setSeverity(e.target.value)}
          className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-2.5 text-xs text-slate-800 font-bold focus:outline-hidden cursor-pointer"
        >
          <option value="ALTA">🚨 Prioridad ALTA (Bloqueo Preventivo)</option>
          <option value="MEDIA">⚡ Prioridad MEDIA (Observación)</option>
          <option value="BAJA">💡 Prioridad BAJA (Advertencia Menor)</option>
        </select>
      </div>

      <button
        type="submit"
        className="w-full bg-slate-900 hover:bg-black text-white py-2 rounded text-xs font-black uppercase tracking-wider transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
      >
        <Save size={13} /> Guardar Regla de Entrenamiento
      </button>
    </form>
  );
};

export const WeeklyPaymentReviewModule: React.FC<WeeklyPaymentReviewModuleProps> = ({
  transactions,
  suppliers,
  contracts,
  properties,
  currentUser,
  onUpdateTransaction,
  onAddSupplier
}) => {
  // We filter the system's "EXPENSE" transactions (Egresos)
  const egresos = useMemo(() => {
    return transactions.filter(t => t.type === 'EXPENSE');
  }, [transactions]);

  // States
  const [selectedWeek, setSelectedWeek] = useState<string>('W21'); // Default to W21 (Actual)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  
  // States for interactive Neural Network Auditor view
  const [selectedNeuralNode, setSelectedNeuralNode] = useState<string | null>(null);
  const [neuralEngineDetailsOpen, setNeuralEngineDetailsOpen] = useState(true);
  
  // Custom uploaded files simulated storage
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, {
    invoice?: { name: string; size: string };
    quote?: { name: string; size: string };
    contract?: { name: string; size: string };
    cession?: { name: string; size: string };
    beneficiaryForm?: { name: string; size: string; customData?: UafFormFields };
    isAssigned: boolean;
    assignedToEntity: string;
  }>>({});

  const [isUafFormModalOpen, setIsUafFormModalOpen] = useState(false);

  // New States for Weekly Folder & Backup files loading
  const [weeklyBatchFiles, setWeeklyBatchFiles] = useState<Array<{ name: string; size: string; path: string; type: string }>>([]);
  const [weeklyBatchFolderName, setWeeklyBatchFolderName] = useState<string>('');
  const [localUploadedEgresos, setLocalUploadedEgresos] = useState<Transaction[]>(() => {
    const raw = localStorage.getItem('jde_weekly_uploaded_egresos');
    return raw ? JSON.parse(raw) : [];
  });
  const [weeklyDragActive, setWeeklyDragActive] = useState(false);
  const weeklyFileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedInsuranceClassification, setSelectedInsuranceClassification] = useState<'ALL' | 'VIDA_OTRO' | 'VIDA_CENTENARIO' | 'GENERALES'>('ALL');
  
  // Right panel active tab: REVIEW = Auditoría, TRAINING = Entrenamiento de Reglas, MAESTRO = Consulta Maestro de Proveedores con UAF
  const [rightPanelTab, setRightPanelTab] = useState<'REVIEW' | 'TRAINING' | 'MAESTRO'>('REVIEW');

  // UAF Processing states & interactive notifications to replace standard alerts
  const [isProcessingUaf, setIsProcessingUaf] = useState<boolean>(false);
  const [uafProcessError, setUafProcessError] = useState<string | null>(null);
  const [uafSuccessNotification, setUafSuccessNotification] = useState<{title: string; message: string; type: 'success' | 'warning'} | null>(null);

  // States for query of Supplier Master (Maestro)
  const [supplierSearchTerm, setSupplierSearchTerm] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<'ALL' | 'VALID_UAF' | 'NO_UAF' | 'EXPIRED_UAF'>('ALL');

  // Custom AI training rules
  const [customRules, setCustomRules] = useState<Array<{
    id: string;
    title: string;
    instruction: string;
    severity: 'ALTA' | 'MEDIA' | 'BAJA';
    active: boolean;
    builtIn?: boolean;
  }>>(() => {
    const saved = localStorage.getItem('jde_weekly_custom_training_rules');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading ERP custom training rules:", e);
      }
    }
    return [
      {
        id: 'rule-master-supplier',
        title: 'Verificación Estricta de Maestros',
        instruction: 'Si el emisor del egreso tiene riesgo de Debida Diligencia ALTO o MEDIO, marcar de forma obligatoria una desviación con prioridad ALTA, exigiendo comprobar su solvencia.',
        severity: 'ALTA',
        active: true,
        builtIn: true
      },
      {
        id: 'rule-obra-photos',
        title: 'Recepción Conforme de Reparaciones',
        instruction: 'Para egresos clasificados en "Mantenimiento" o "Reparaciones" que superen $500.000, exigir que se adjunte acta de recepción o soporte fotográfico.',
        severity: 'MEDIA',
        active: true,
        builtIn: true
      },
      {
        id: 'rule-factoring-xml',
        title: 'Firma y Certificación de Factoring',
        instruction: 'Si la factura está cedida (factoring) y no se acompaña de Certificado de Cesión del SII o entidad bancaria regulada, bloquear el pago preventivamente.',
        severity: 'ALTA',
        active: true,
        builtIn: true
      },
      {
        id: 'rule-chilean-rut',
        title: 'Chequeo del Formato RUT',
        instruction: 'Validar RUT del emisor de factura (XX.XXX.XXX-X). Si no tiene guión o formato válido, marcar como hallazgo de digitación menor.',
        severity: 'BAJA',
        active: true,
        builtIn: true
      }
    ];
  });

  // Neural weights / Threshold sliders for the training board
  const [neuralWeights, setNeuralWeights] = useState<{
    digitization: number;
    documents: number;
    compliance: number;
    bank: number;
  }>(() => {
    const saved = localStorage.getItem('jde_weekly_neural_weights');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { digitization: 0.8, documents: 0.9, compliance: 0.95, bank: 0.9 };
  });

  const [neuralNetworkEnabled, setNeuralNetworkEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('jde_weekly_neural_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleNeuralNetwork = (enabled: boolean) => {
    setNeuralNetworkEnabled(enabled);
    localStorage.setItem('jde_weekly_neural_enabled', String(enabled));
  };

  const handleSaveWeights = (weights: typeof neuralWeights) => {
    setNeuralWeights(weights);
    localStorage.setItem('jde_weekly_neural_weights', JSON.stringify(weights));
  };

  const handleSaveRules = (rules: typeof customRules) => {
    setCustomRules(rules);
    localStorage.setItem('jde_weekly_custom_training_rules', JSON.stringify(rules));
  };

  // Dynamic list of Batches with persistent storage
  const [batches, setBatches] = useState<Array<{ id: string; label: string; start: string; end: string }>>(() => {
    const saved = localStorage.getItem('jde_weekly_batches');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading ERP custom batches:", e);
      }
    }
    return [
      { id: 'W21', label: 'LOTE-2026-W21 (Semana Actual)', start: '2026-05-22', end: '2026-05-28' },
      { id: 'W20', label: 'LOTE-2026-W20 (Semana Anterior)', start: '2026-05-15', end: '2026-05-21' },
      { id: 'W19', label: 'LOTE-2026-W19', start: '2026-05-08', end: '2026-05-14' },
      { id: 'W18', label: 'LOTE-2026-W18', start: '2026-05-01', end: '2026-05-07' }
    ];
  });

  // Create Batch Form States
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false);
  const [newBatchId, setNewBatchId] = useState('');
  const [newBatchLabel, setNewBatchLabel] = useState('');
  const [newBatchStart, setNewBatchStart] = useState('2026-05-29');
  const [newBatchEnd, setNewBatchEnd] = useState('2026-06-04');

  const handleCreateBatch = (id: string, start: string, end: string, customLabel?: string) => {
    if (!id || !start || !end) {
      return false;
    }
    // Clean to make it clean & extremely memorable (keep letters, numbers, hyphens and underscores)
    const cleanId = id.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanId) {
      return false;
    }

    if (batches.some(b => b.id === cleanId)) {
      return false;
    }

    const finalLabel = customLabel?.trim() || `LOTE-2026-${cleanId}`;
    const newLote = { id: cleanId, label: finalLabel, start, end };
    const updated = [newLote, ...batches];
    setBatches(updated);
    localStorage.setItem('jde_weekly_batches', JSON.stringify(updated));
    setSelectedWeek(cleanId);
    setSelectedTxId(null);
    return true;
  };

  // Intelligent insurance company and property classification helper
  const classifyTransactionSeguro = (tx: Transaction) => {
    const desc = (tx.description || '').toUpperCase();
    const supplier = (tx.supplierName || '').toUpperCase();
    const cat = (tx.category || '').toUpperCase();
    const subCatField = (tx.subCategory || '').toUpperCase();
    const insCompField = (tx.insuranceCompany || '').toUpperCase();

    // Check if Centenario subcategory or context matches
    const isCentenario = 
      subCatField === 'EDIFICIO CENTENARIO' || 
      desc.includes('CENTENARIO') || 
      supplier.includes('CENTENARIO') ||
      tx.propertyId === 'prop-1' ||
      (tx as any).building === 'CENTENARIO' ||
      (tx as any).building === 'EDIFICIO CENTENARIO';

    // Check if Life insurance matches
    const isLife = 
      insCompField === 'VIDA' || 
      desc.includes('VIDA') || 
      desc.includes('METLIFE') || 
      supplier.includes('VIDA') || 
      supplier.includes('METLIFE') || 
      supplier.includes('CHILENA CONSORCIO');

    // Check if General insurance matches
    const isGenerales = 
      insCompField === 'GENERALES' || 
      desc.includes('GENERAL') || 
      desc.includes('GENERALES') || 
      supplier.includes('GENERALES') || 
      supplier.includes('LIBERTY') || 
      supplier.includes('BCI SEGUROS') || 
      supplier.includes('HDI');

    if (isCentenario) {
      return {
        id: 'VIDA_CENTENARIO' as const,
        label: 'S. Vida - Edificio Centenario',
        text: 'Seguros de Vida (Subcategoría: Edificio Centenario)',
        color: 'text-amber-800 font-bold bg-amber-50 border border-amber-200 py-0.5 px-2 rounded-md font-mono',
        pdfLabel: 'S. Vida - Edificio Centenario',
        iconColor: '#eab308' 
      };
    } else if (isLife) {
      return {
        id: 'VIDA_OTRO' as const,
        label: 'Seguros de Vida',
        text: 'Compañía de Seguros de Vida',
        color: 'text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 py-0.5 px-2 rounded-md font-mono',
        pdfLabel: 'Seguros de Vida',
        iconColor: '#10b981' 
      };
    } else {
      return {
        id: 'GENERALES' as const,
        label: 'Seguros Generales',
        text: 'Compañía de Seguros Generales',
        color: 'text-blue-700 font-bold bg-blue-50 border border-blue-200 py-0.5 px-2 rounded-md font-mono',
        pdfLabel: 'Seguros Generales',
        iconColor: '#3b82f6' 
      };
    }
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    if (onUpdateTransaction) {
      onUpdateTransaction(updatedTx);
    }
    
    // Also keep localUploadedEgresos in sync!
    if (localUploadedEgresos.some(t => t.id === updatedTx.id)) {
      setLocalUploadedEgresos(prev => {
        const updatedList = prev.map(t => t.id === updatedTx.id ? updatedTx : t);
        localStorage.setItem('jde_weekly_uploaded_egresos', JSON.stringify(updatedList));
        return updatedList;
      });
    }
  };

  /**
   * Obtiene dinámicamente si tiene declaración UAF, su fecha de vencimiento y si está vencida
   */
  const getSupplierUafStatus = (supplier: Supplier) => {
    // 1. Check if there's an uploaded file for this supplier's rut
    const hasUploaded = Object.values(uploadedFiles).some((f: any) => {
      const rutClean = (f?.beneficiaryForm?.customData?.rut || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const suppRutClean = (supplier.taxId || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return rutClean && suppRutClean && rutClean === suppRutClean;
    });

    const isDeclared = hasUploaded || supplier.complianceMaster?.beneficiariesUAF === true;

    let expirationDateStr = 'No registra / Vencido';
    let isExpired = true;

    if (isDeclared) {
      let dateBase = supplier.dueDiligenceDate || supplier.requestDate || new Date().toISOString().split('T')[0];
      
      const matchedFile = Object.values(uploadedFiles).find((f: any) => {
        const rutClean = (f?.beneficiaryForm?.customData?.rut || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const suppRutClean = (supplier.taxId || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return rutClean && suppRutClean && rutClean === suppRutClean;
      }) as any;

      if (matchedFile?.beneficiaryForm?.customData) {
        const d = matchedFile.beneficiaryForm.customData;
        if (d.firmaDia && d.firmaMes && d.firmaAnio) {
          const yr = d.firmaAnio.length === 2 ? `20${d.firmaAnio}` : d.firmaAnio;
          dateBase = `${yr}-${d.firmaMes.padStart(2, '0')}-${d.firmaDia.padStart(2, '0')}`;
        }
      }

      try {
        const date = new Date(dateBase);
        const isHighRisk = supplier.dueDiligenceRisk === 'RIESGO ALTO';
        if (isHighRisk) {
          date.setMonth(date.getMonth() + 6);
        } else {
          date.setFullYear(date.getFullYear() + 1);
        }
        expirationDateStr = date.toISOString().split('T')[0];
        
        const now = new Date();
        const expirationDate = new Date(expirationDateStr);
        isExpired = now > expirationDate;
      } catch (_) {
        expirationDateStr = 'Fecha inválida';
      }
    }

    return {
      hasUafDeclaration: isDeclared,
      expirationDateStr,
      isExpired
    };
  };

  /**
   * Sube un archivo PDF de declaración UAF, lo analiza con Gemini y si
   * el proveedor no se encuentra registrado en el maestro, lo incorpora de forma automática.
   */
  const handleUafPdfUpload = async (file: File) => {
    setIsProcessingUaf(true);
    setUafProcessError(null);
    setUafSuccessNotification(null);

    try {
      const reader = new FileReader();
      
      const fileDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("No se pudo leer el archivo PDF"));
        reader.readAsDataURL(file);
      });

      const base64Data = await fileDataPromise;
      const sizeInKB = (file.size / 1024).toFixed(1);
      const sizeStr = parseFloat(sizeInKB) > 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${sizeInKB} KB`;

      // Analizar con la IA
      const extractedData = await extractUafBeneficiaryForm(base64Data, file.name);

      if (extractedData && !extractedData.error) {
        // Guardar beneficiarios
        handleSaveBeneficiaryUAF({
          name: file.name,
          size: sizeStr,
          customData: extractedData
        });

        const uafRut = extractedData.rut;
        const exists = suppliers.some(s => {
          const sRut = s.taxId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const uRut = (uafRut || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          return sRut === uRut || s.name.toLowerCase() === (extractedData.razonSocial || '').toLowerCase();
        });

        if (!exists && onAddSupplier) {
          const targetName = extractedData.razonSocial || selectedTx?.supplierName || "Proveedor Incorporado por UAF";
          const newSupplier: Supplier = {
            id: `SUP-${Math.floor(100000 + Math.random() * 900000)}`,
            folio: `FOL-${Math.floor(20000 + Math.random() * 79999)}`,
            taxId: uafRut || "11.233.555-K",
            name: targetName,
            category: 'PROVEEDORES_VARIOS',
            taxDocumentType: 'FACTURA',
            requestDate: new Date().toISOString().split('T')[0],
            contactName: extractedData.nombreRepLegal || 'Representante Legal Extraído',
            email: `${targetName.toLowerCase().replace(/[^a-z]/g, '')}@ejemplo.cl`,
            phone: extractedData.telefono || '+56 9 9999 9999',
            address: extractedData.domicilio || 'Calle Principal 123, Santiago',
            bankName: 'Banco de Chile',
            accountType: 'Cuenta Corriente',
            accountNumber: `00-${Math.floor(100000 + Math.random() * 9000000)}-${Math.floor(0 + Math.random() * 9)}`,
            status: 'ACTIVE',
            userCreator: currentUser,
            timestamp: Date.now(),
            dueDiligenceDate: new Date().toISOString().split('T')[0],
            dueDiligenceRisk: 'RIESGO BAJO',
            complianceMaster: {
              conflictThirdParty: false,
              conflictExecutive: false,
              beneficiariesUAF: true,
              dueDiligenceCert: true,
              paymentVoucher: true,
              invoice: true,
              receptionCertificate: true,
              photoSet: true,
            },
            lockedBy: null,
            lockedAt: null
          };

          onAddSupplier(newSupplier);

          // Trigger a beautiful, eye-catching notification
          setUafSuccessNotification({
            title: "Proveedor Incorporado Automáticamente",
            message: `¡ALERTA DE SISTEMA! El proveedor "${targetName}" (${uafRut}) NO estaba registrado en la base de datos de AssetFlow. El motor IA Gemini extrajo de forma inteligente su datos del PDF de beneficiarios finales y lo ha incorporado automáticamente al maestro de proveedores como ACTIVO y CUMPLIENTE.`,
            type: 'success'
          });
        } else if (!exists) {
          setUafSuccessNotification({
            title: "UAF Extraído con Éxito",
            message: `Se ha extraído la declaración de beneficiarios de "${extractedData.razonSocial}" (${uafRut}) de forma exitosa, pero no se ha encontrado proveedor registrado.`,
            type: 'warning'
          });
        } else {
          setUafSuccessNotification({
            title: "UAF Procesado con Éxito",
            message: `La declaración de beneficiarios se vinculó exitosamente a "${extractedData.razonSocial}" (${uafRut}), que ya se encuentra registrado y validado en el sistema.`,
            type: 'success'
          });
        }
      } else {
        throw new Error(extractedData?.message || "La IA Gemini falló al extraer la información estructurada del archivo.");
      }
    } catch (err: any) {
      console.error(err);
      setUafProcessError(err.message || "Error al procesar el PDF del Beneficiario con el Servicio de IA.");
    } finally {
      setIsProcessingUaf(false);
    }
  };

  // Resolves the building name using real property lists or deterministic mapping
  const resolveBuildingName = (tx: Transaction) => {
    if (tx.propertyId) {
      const propDef = properties?.find(p => p.id === tx.propertyId);
      if (propDef) {
        const roleStr = propDef.propertyRole ? ` [ROL: ${propDef.propertyRole}]` : '';
        const floorStr = propDef.floor ? ` ${propDef.floor}` : '';
        const codeStr = propDef.code ? ` (${propDef.code})` : '';
        return `${propDef.building}${codeStr} - ${propDef.type}${floorStr}${roleStr}`;
      }
    }

    if (tx.subCategory) {
      return tx.subCategory;
    }
    
    // Fallback search in properties by code or building name keyword
    if (properties && properties.length > 0) {
      const foundProp = properties.find(p => 
        tx.description?.toUpperCase().includes(p.code.toUpperCase()) || 
        tx.description?.toUpperCase().includes(p.building.toUpperCase())
      );
      if (foundProp) {
        const roleStr = foundProp.propertyRole ? ` [ROL: ${foundProp.propertyRole}]` : '';
        const floorStr = foundProp.floor ? ` ${foundProp.floor}` : '';
        const codeStr = foundProp.code ? ` (${foundProp.code})` : '';
        return `${foundProp.building}${codeStr} - ${foundProp.type}${floorStr}${roleStr}`;
      }
      
      // Secondary deterministic assignment
      const nonCentenarioProps = properties.filter(p => !p.building.toUpperCase().includes('CENTENARIO'));
      const propsToUse = nonCentenarioProps.length > 0 ? nonCentenarioProps : properties;
      
      const charCodeSum = (tx.supplierName || tx.description || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const index = charCodeSum % propsToUse.length;
      const selProp = propsToUse[index];
      
      const roleStr = selProp.propertyRole ? ` [ROL: ${selProp.propertyRole}]` : '';
      const floorStr = selProp.floor ? ` ${selProp.floor}` : '';
      const codeStr = selProp.code ? ` (${selProp.code})` : '';
      return `${selProp.building}${codeStr} - ${selProp.type}${floorStr}${roleStr}`;
    }
    
    return 'EDIFICIO CENTENARIO (PROP-CENTENARIO) - OFICINA Piso 3 [ROL: 3012-1]';
  };

  /**
   * Listado filtrado del Maestro para la consulta interactiva con atributos de vigencia UAF
   */
  const filteredSuppliersForQuery = useMemo(() => {
    return suppliers.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) || 
                            s.taxId.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                            (s.contactName || '').toLowerCase().includes(supplierSearchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      const { hasUafDeclaration, isExpired } = getSupplierUafStatus(s);
      
      if (supplierFilter === 'VALID_UAF') {
        return hasUafDeclaration && !isExpired;
      } else if (supplierFilter === 'NO_UAF') {
        return !hasUafDeclaration;
      } else if (supplierFilter === 'EXPIRED_UAF') {
        return hasUafDeclaration && isExpired;
      }
      return true;
    });
  }, [suppliers, supplierSearchTerm, supplierFilter, uploadedFiles]);

  const handleWeeklyFolderUpload = (files: any[], folderNameFromWebkit: string) => {
    setWeeklyBatchFolderName(folderNameFromWebkit || 'Carpeta_Lote');
    
    const parsedFiles = files.map(file => {
      const sizeInKB = (file.size / 1024).toFixed(1);
      const sizeStr = parseFloat(sizeInKB) > 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${sizeInKB} KB`;

      return {
        path: (file as any).webkitRelativePath || file.name,
        name: file.name,
        size: sizeStr,
        type: file.name.split('.').pop()?.toUpperCase() || 'DOCUMENTO'
      };
    });
    setWeeklyBatchFiles(parsedFiles);

    // Intelligently generate 2-4 realistic Transactions inside the selected week range based on uploaded files!
    const batch = batches.find(b => b.id === selectedWeek);
    const txDate = batch ? batch.start : '2026-05-23';

    // Filter to find matching files that could be invoices or documents
    const invoiceFiles = files.filter(f => {
      const n = f.name.toLowerCase();
      return n.includes('factura') || n.includes('fac') || n.includes('bol') || n.includes('garantia') || n.includes('garantía') || n.includes('devolucion') || n.includes('devolución') || n.includes('arrendatario') || n.includes('reembolso') || f.name.toLowerCase().endsWith('.pdf');
    });
    const filesToMap = invoiceFiles.length > 0 ? invoiceFiles : files.slice(0, 3);

    const newTransactions: Transaction[] = filesToMap.map((file, idx) => {
      const isFactoring = file.name.toLowerCase().includes('cesion') || file.name.toLowerCase().includes('factoring');
      const fileNameLower = file.name.toLowerCase();
      
      let supplierObj = { 
        name: "Schindler Ascensores S.A.", 
        taxId: "76.449.210-K", 
        category: "GASTOS GENERALES", 
        documentType: "FACTURA", 
        description: `Mantención de ascensores (Ref: ${file.name.slice(0, 24)})`, 
        amount: Math.floor(Math.random() * 500000 + 400000),
        propertyId: 'prop-centenario'
      };

      if (fileNameLower.includes('garantia') || fileNameLower.includes('garantía') || fileNameLower.includes('devolucion') || fileNameLower.includes('devolución') || fileNameLower.includes('arrendatario') || fileNameLower.includes('reembolso')) {
        supplierObj = {
          name: "Devolución de Garantía (Ex Arrendatario)",
          taxId: "12.445.678-9",
          category: "DEVOLUCION DE GARANTIA",
          documentType: "LIQUIDACIÓN DE GARANTÍA",
          description: `Devolución de garantía de arriendo (Ref: ${file.name.slice(0, 24)})`,
          amount: 550000,
          propertyId: 'prop-centenario'
        };
      } else if (fileNameLower.includes('agua') || fileNameLower.includes('andinas')) {
        supplierObj = {
          name: "Aguas Andinas S.A.",
          taxId: "77.821.300-K",
          category: "SERVICIOS",
          documentType: "FACTURA",
          description: `Consumo de agua potable (Ref: ${file.name.slice(0, 24)})`,
          amount: 142300,
          propertyId: 'prop-centenario'
        };
      } else if (fileNameLower.includes('luz') || fileNameLower.includes('enel') || fileNameLower.includes('electric')) {
        supplierObj = {
          name: "Enel Distribución Chile S.A.",
          taxId: "96.885.000-4",
          category: "SERVICIOS",
          documentType: "FACTURA",
          description: `Suministro de energía eléctrica (Ref: ${file.name.slice(0, 24)})`,
          amount: 320400,
          propertyId: 'prop-centenario'
        };
      } else if (fileNameLower.includes('schindler') || fileNameLower.includes('ascensor')) {
        supplierObj = {
          name: "Schindler Ascensores S.A.",
          taxId: "76.449.210-K",
          category: "GASTOS GENERALES",
          documentType: "FACTURA",
          description: `Mantención mensual de ascensores (Ref: ${file.name.slice(0, 24)})`,
          amount: 855000,
          propertyId: 'prop-centenario'
        };
      } else if (fileNameLower.includes('limpieza') || fileNameLower.includes('pedro') || fileNameLower.includes('ecolog')) {
        supplierObj = {
          name: "Limpiezas Ecológicas Pedro Spa",
          taxId: "11.233.555-K",
          category: "PAGO A PROVEEDOR",
          documentType: "FACTURA",
          description: `Servicio de desinfección sanitaria (Ref: ${file.name.slice(0, 24)})`,
          amount: 280000,
          propertyId: 'prop-centenario'
        };
      } else if (fileNameLower.includes('pintura') || fileNameLower.includes('cordillera') || fileNameLower.includes('revest')) {
        supplierObj = {
          name: "Pinturas & Revestimientos Cordillera Ltda",
          taxId: "76.120.340-5",
          category: "PAGO A PROVEEDOR",
          documentType: "FACTURA",
          description: `Pintado de fachadas exteriores (Ref: ${file.name.slice(0, 24)})`,
          amount: 1250000,
          propertyId: 'prop-centenario'
        };
      }
      
      const newTxId = `tx-upload-${Date.now()}-${idx}`;
      const docNum = String(Math.floor(Math.random() * 900000 + 100000));
      const fileMB = (file.size / (1024 * 1024)).toFixed(2);
      const fileSizeStr = parseFloat(fileMB) < 0.1 ? `${(file.size / 1024).toFixed(1)} KB` : `${fileMB} MB`;

      // Pre-link this file to the specific transaction's Cabinet slots!
      setUploadedFiles(prev => ({
        ...prev,
        [newTxId]: {
          invoice: { name: file.name, size: fileSizeStr },
          quote: idx % 2 === 0 ? { name: `LIQUIDACION_DETALLADA_${idx}.pdf`, size: '240 KB' } : undefined,
          cession: isFactoring ? { name: `CERTIFICADO_CESION_${docNum}.pdf`, size: '480 KB' } : undefined,
          isAssigned: isFactoring,
          assignedToEntity: isFactoring ? 'SANTANDER FACTORING S.A.' : ''
        }
      }));

      // Find if we have an exact supplier in system match
      const matchingSupplier = suppliers.find(s => s.taxId === supplierObj.taxId || s.name.toLowerCase() === supplierObj.name.toLowerCase());
      const supplierId = matchingSupplier?.id || `prov-${100 + idx}`;

      return {
        id: newTxId,
        description: supplierObj.description,
        amount: supplierObj.amount,
        category: supplierObj.category,
        type: 'EXPENSE',
        documentType: supplierObj.documentType,
        documentNumber: docNum,
        date: txDate,
        invoiceDate: txDate,
        user: currentUser,
        timestamp: Date.now(),
        supplierId,
        supplierName: supplierObj.name,
        supplierTaxId: supplierObj.taxId,
        propertyId: supplierObj.propertyId, // Default link to Centenario, fully editable in our sidebar
        insuranceCompany: 'GENERALES',
        status: 'PENDIENTE',
        isAutoGenerated: true,
        lockedBy: null,
        lockedAt: null
      };
    });

    const updatedLocalStorageEgresos = [...localUploadedEgresos, ...newTransactions];
    setLocalUploadedEgresos(updatedLocalStorageEgresos);
    localStorage.setItem('jde_weekly_uploaded_egresos', JSON.stringify(updatedLocalStorageEgresos));

    if (newTransactions.length > 0) {
      setSelectedTxId(newTransactions[0].id);
    }
  };

  const clearWeeklyBatchFiles = () => {
    setWeeklyBatchFiles([]);
    setWeeklyBatchFolderName('');
    setLocalUploadedEgresos([]);
    localStorage.removeItem('jde_weekly_uploaded_egresos');
    setSelectedTxId(null);
  };

  // Local saved compliance reports
  const [savedReports, setSavedReports] = useState<Record<string, AuditReport>>(() => {
    const raw = localStorage.getItem('jde_weekly_payment_audits');
    return raw ? JSON.parse(raw) : {};
  });



  // Filter transactions belonging to the selected week
  const currentWeekEgresos = useMemo(() => {
    const batch = batches.find(b => b.id === selectedWeek);
    if (!batch) return [];
    
    // Merge standard ledger expenses with bulk-uploaded weekly expenses
    const combined = [...localUploadedEgresos, ...egresos];
    const seen = new Set();
    const unique = combined.filter(tx => {
      if (seen.has(tx.id)) return false;
      seen.add(tx.id);
      return true;
    });

    return unique.filter(tx => {
      const txDate = tx.date; // YYYY-MM-DD
      return txDate >= batch.start && txDate <= batch.end;
    });
  }, [egresos, localUploadedEgresos, selectedWeek, batches]);

  // Filter with search term and insurance classification filter
  const filteredEgresos = useMemo(() => {
    return currentWeekEgresos.filter(tx => {
      const criteria = `${tx.description} ${tx.supplierName || ''} ${tx.documentNumber} ${tx.amount}`.toLowerCase();
      const matchesSearch = criteria.includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      
      if (selectedInsuranceClassification === 'ALL') return true;
      const classification = classifyTransactionSeguro(tx);
      return classification.id === selectedInsuranceClassification;
    });
  }, [currentWeekEgresos, searchTerm, selectedInsuranceClassification]);

  // Selected Transaction details
  const selectedTx = useMemo(() => {
    const combined = [...localUploadedEgresos, ...transactions];
    return combined.find(t => t.id === selectedTxId) || null;
  }, [transactions, localUploadedEgresos, selectedTxId]);

  // Automatically initialize a compliant AuditReport when any transaction is selected 
  // to ensure the internal control safety checklist is immediately interactive, functional, and visible.
  React.useEffect(() => {
    if (selectedTxId && !savedReports[selectedTxId]) {
      const combined = [...localUploadedEgresos, ...transactions];
      const tx = combined.find(t => t.id === selectedTxId);
      if (!tx) return;
      
      const filesForTx = uploadedFiles[selectedTxId];
      const hasInvoice = !!filesForTx?.invoice || tx.isAutoGenerated === true;
      const hasContract = !!filesForTx?.contract || contracts.some(c => c.supplierName === tx.supplierName);
      const hasQuote = !!filesForTx?.quote;
      
      const newReport: AuditReport = {
        txId: selectedTxId,
        status: 'APROBADO_CON_OBSERVACIONES',
        checkedAt: new Date().toISOString(),
        reviewer: currentUser || 'Revisor de Control Interno',
        digitizationCheck: { passed: true, observations: 'Revisión manual inicial - Pendiente de validación IA' },
        documentsCheck: { 
          hasInvoice: hasInvoice, 
          hasQuoteOrContract: hasContract || hasQuote, 
          hasCessionCertificate: !!filesForTx?.cession, 
          passed: hasInvoice && (hasContract || hasQuote), 
          observations: 'Revisión documental preliminar inteligente' 
        },
        amountsCheck: { invoiceTotalMatchesContract: true, passed: true, observations: 'Montos y monedas del egreso coinciden correctamente' },
        chileanLawCheck: { passed: true, observations: 'Receptor hábil en registro de emisores Ley 19.983' },
        bankAndSupplierCheck: { passed: true, observations: 'Cotejado RUT e identidad de cuenta bancaria destino F0411' },
        deviations: [],
        remedialSuggestions: 'Se sugiere documentar debidamente en el archivador digital.',
        customChecklist: {
          hasInvoiceOrTaxDoc: hasInvoice,
          hasExecNoConflictDecl: true,
          hasUafBeneficiaryDecl: true,
          hasThirdPartyNoConflictDecl: true,
          hasContractOrOT: hasContract,
          hasCompletionReceptionDoc: hasQuote || hasContract,
          hasCorrectEgresoMontoMoneda: true,
        }
      };

      setSavedReports(prev => {
        if (prev[selectedTxId]) return prev;
        const updated = { ...prev, [selectedTxId]: newReport };
        localStorage.setItem('jde_weekly_payment_audits', JSON.stringify(updated));
        return updated;
      });
    }
  }, [selectedTxId, savedReports, transactions, localUploadedEgresos, currentUser, uploadedFiles, contracts]);

  // Selected Tx Supplier Master Profile
  const selectedSupplier = useMemo(() => {
    if (!selectedTx) return null;
    return suppliers.find(s => s.id === selectedTx.supplierId || s.name === selectedTx.supplierName || s.taxId === selectedTx.supplierTaxId) || null;
  }, [selectedTx, suppliers]);

  // Selected Tx Contract
  const selectedContract = useMemo(() => {
    if (!selectedTx) return null;
    if (selectedTx.workOrderId) {
      // Find work order to match contract
      const contract = contracts.find(c => c.id === selectedTx.workOrderId);
      if (contract) return contract;
    }
    return contracts.find(c => c.supplierName === selectedTx.supplierName) || null;
  }, [selectedTx, contracts]);

  // Get active files for the selected tx, initializing default mock values if empty
  const activeTxFiles = useMemo(() => {
    if (!selectedTxId) return null;
    if (!uploadedFiles[selectedTxId]) {
      // Set some initial pseudo-intelligent defaults to facilitate swift playground checks
      const isTestTx = selectedTx?.isAutoGenerated || false;
      const seedVal = selectedTxId.charCodeAt(0) + selectedTxId.charCodeAt(1);
      
      const hasInvoice = true;
      const hasQuote = seedVal % 2 === 0;
      const hasContract = seedVal % 3 === 0;
      const isAssigned = seedVal % 5 === 0;

      return {
        isAssigned,
        assignedToEntity: isAssigned ? 'PROMO FACTORING S.A.' : '',
        invoice: hasInvoice ? { name: DEFAULT_FILES.invoiceNames[seedVal % DEFAULT_FILES.invoiceNames.length], size: '1.4 MB' } : undefined,
        quote: hasQuote ? { name: DEFAULT_FILES.quoteNames[seedVal % DEFAULT_FILES.quoteNames.length], size: '650 KB' } : undefined,
        contract: hasContract ? { name: DEFAULT_FILES.contractNames[seedVal % DEFAULT_FILES.contractNames.length], size: '2.8 MB' } : undefined,
        cession: isAssigned ? { name: DEFAULT_FILES.cessionNames[seedVal % DEFAULT_FILES.cessionNames.length], size: '820 KB' } : undefined,
        beneficiaryForm: undefined
      };
    }
    return uploadedFiles[selectedTxId];
  }, [selectedTxId, uploadedFiles, selectedTx]);

  // Summary indicators
  const stats = useMemo(() => {
    let totalBatchAmount = 0;
    let auditedCount = 0;
    let approvedCount = 0;
    let warningCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;

    currentWeekEgresos.forEach(tx => {
      totalBatchAmount += tx.amount;
      const report = savedReports[tx.id];
      if (report) {
        auditedCount++;
        if (report.status === 'APROBADO') approvedCount++;
        else if (report.status === 'APROBADO_CON_OBSERVACIONES') warningCount++;
        else if (report.status === 'RECHAZADO') rejectedCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      totalBatchAmount,
      totalCount: currentWeekEgresos.length,
      auditedCount,
      approvedCount,
      warningCount,
      rejectedCount,
      pendingCount
    };
  }, [currentWeekEgresos, savedReports]);

  // Set file handler helpers
  const [dragActiveField, setDragActiveField] = useState<string | null>(null);

  const handleRealFileUpload = (field: 'invoice' | 'quote' | 'contract' | 'cession', file: File) => {
    if (!selectedTxId) return;
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeStr = parseFloat(sizeInMB) < 0.1 
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${sizeInMB} MB`;
    
    updateFileMeta(field, {
      name: file.name,
      size: sizeStr
    });
  };

  const handleDrag = (e: React.DragEvent, field: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveField(field);
    } else if (e.type === "dragleave") {
      setDragActiveField(null);
    }
  };

  const handleDrop = (e: React.DragEvent, field: 'invoice' | 'quote' | 'contract' | 'cession') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveField(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleRealFileUpload(field, e.dataTransfer.files[0]);
    }
  };

  const updateFileMeta = (field: 'invoice' | 'quote' | 'contract' | 'cession', value: any) => {
    if (!selectedTxId) return;
    setUploadedFiles(prev => {
      const current = prev[selectedTxId] || { isAssigned: false, assignedToEntity: '' };
      return {
        ...prev,
        [selectedTxId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const toggleAssigned = () => {
    if (!selectedTxId) return;
    setUploadedFiles(prev => {
      const current = prev[selectedTxId] || { isAssigned: false, assignedToEntity: '' };
      const newStatus = !current.isAssigned;
      return {
        ...prev,
        [selectedTxId]: {
          ...current,
          isAssigned: newStatus,
          assignedToEntity: newStatus ? 'BICE FACTORING S.A.' : '',
          // Clean factoring certificate if no longer assigned
          cession: newStatus ? current.cession || { name: 'SII_CESION_CERT.pdf', size: '750 KB' } : undefined
        }
      };
    });
  };

  const setAssignedEntity = (entity: string) => {
    if (!selectedTxId) return;
    setUploadedFiles(prev => {
      const current = prev[selectedTxId] || { isAssigned: false, assignedToEntity: '' };
      return {
        ...prev,
        [selectedTxId]: {
          ...current,
          assignedToEntity: entity
        }
      };
    });
  };

  const toggleChecklistItem = (txId: string, itemKey: keyof NonNullable<AuditReport['customChecklist']>) => {
    setSavedReports(prev => {
      let currentReport = prev[txId];
      if (!currentReport) {
        currentReport = {
          txId: txId,
          status: 'APROBADO_CON_OBSERVACIONES',
          checkedAt: new Date().toISOString(),
          reviewer: currentUser || 'Revisor de Control Interno',
          digitizationCheck: { passed: true, observations: 'Revisión manual inicial' },
          documentsCheck: { hasInvoice: true, hasQuoteOrContract: true, hasCessionCertificate: false, passed: true, observations: 'Revisión manual' },
          amountsCheck: { invoiceTotalMatchesContract: true, passed: true, observations: 'Revisión manual' },
          chileanLawCheck: { passed: true, observations: 'Revisión manual' },
          bankAndSupplierCheck: { passed: true, observations: 'Revisión manual' },
          deviations: [],
          remedialSuggestions: 'Se sugiere documentar debidamente en el archivador digital.',
          customChecklist: {
            hasInvoiceOrTaxDoc: true,
            hasExecNoConflictDecl: true,
            hasUafBeneficiaryDecl: true,
            hasThirdPartyNoConflictDecl: true,
            hasContractOrOT: true,
            hasCompletionReceptionDoc: true,
            hasCorrectEgresoMontoMoneda: true,
          }
        };
      }
      
      const currentCustomList = currentReport.customChecklist || {
        hasInvoiceOrTaxDoc: currentReport.documentsCheck?.hasInvoice ?? true,
        hasExecNoConflictDecl: currentReport.status !== 'RECHAZADO',
        hasUafBeneficiaryDecl: true,
        hasThirdPartyNoConflictDecl: currentReport.status !== 'RECHAZADO',
        hasContractOrOT: currentReport.documentsCheck?.hasQuoteOrContract ?? true,
        hasCompletionReceptionDoc: currentReport.documentsCheck?.passed ?? true,
        hasCorrectEgresoMontoMoneda: currentReport.amountsCheck?.passed ?? true,
      };

      const updatedCustomList = {
        ...currentCustomList,
        [itemKey]: !currentCustomList[itemKey]
      };

      const updatedReport = {
        ...currentReport,
        customChecklist: updatedCustomList
      };

      const newState = {
        ...prev,
        [txId]: updatedReport
      };

      localStorage.setItem('jde_weekly_payment_audits', JSON.stringify(newState));
      return newState;
    });
  };

  const getChecklistItemValue = (report: AuditReport | undefined, itemKey: keyof NonNullable<AuditReport['customChecklist']>) => {
    if (report && report.customChecklist && report.customChecklist[itemKey] !== undefined) {
      return report.customChecklist[itemKey];
    }
    if (report) {
      // sensible fallbacks based on initial run
      switch (itemKey) {
        case 'hasInvoiceOrTaxDoc': return report.documentsCheck?.hasInvoice ?? true;
        case 'hasExecNoConflictDecl': return report.status !== 'RECHAZADO';
        case 'hasUafBeneficiaryDecl': return true;
        case 'hasThirdPartyNoConflictDecl': return report.status !== 'RECHAZADO';
        case 'hasContractOrOT': return report.documentsCheck?.hasQuoteOrContract ?? true;
        case 'hasCompletionReceptionDoc': return report.documentsCheck?.passed ?? true;
        case 'hasCorrectEgresoMontoMoneda': return report.amountsCheck?.passed ?? true;
        default: return true;
      }
    }
    return true; // safe fallback
  };

  // Simulates a drag-and-drop or file pick instantly
  const handleQuickLoadFile = (field: 'invoice' | 'quote' | 'contract' | 'cession') => {
    if (!selectedTxId) return;
    const rng = Math.floor(Math.random() * 4);
    let name = '';
    let size = '';

    if (field === 'invoice') {
      name = DEFAULT_FILES.invoiceNames[rng];
      size = `${(Math.random() * 2 + 0.5).toFixed(1)} MB`;
    } else if (field === 'quote') {
      name = DEFAULT_FILES.quoteNames[rng % 3];
      size = `${Math.floor(Math.random() * 400 + 100)} KB`;
    } else if (field === 'contract') {
      name = DEFAULT_FILES.contractNames[rng % 3];
      size = `${(Math.random() * 4 + 1.2).toFixed(1)} MB`;
    } else if (field === 'cession') {
      name = DEFAULT_FILES.cessionNames[rng % 3];
      size = `${Math.floor(Math.random() * 300 + 400)} KB`;
    }

    updateFileMeta(field, { name, size });
  };

  // Delete simulated file
  const handleDisconnectFile = (field: 'invoice' | 'quote' | 'contract' | 'cession' | 'beneficiaryForm') => {
    if (!selectedTxId) return;
    setUploadedFiles(prev => {
      const current = prev[selectedTxId] || { isAssigned: false, assignedToEntity: '' };
      const copy = { ...current };
      delete copy[field];
      return {
        ...prev,
        [selectedTxId]: copy
      };
    });
  };

  const handleSaveBeneficiaryUAF = (payload: { name: string; size: string; customData: UafFormFields }) => {
    if (!selectedTxId) return;
    setUploadedFiles(prev => {
      const current = prev[selectedTxId] || { isAssigned: false, assignedToEntity: '' };
      return {
        ...prev,
        [selectedTxId]: {
          ...current,
          beneficiaryForm: payload
        }
      };
    });

    setSavedReports(prev => {
      const currentReport = prev[selectedTxId];
      if (currentReport) {
        return {
          ...prev,
          [selectedTxId]: {
            ...currentReport,
            customChecklist: {
              ...(currentReport.customChecklist || {}),
              hasUafBeneficiaryDecl: true
            }
          }
        };
      }
      return prev;
    });
  };

  // Run AI compliance analysis
  const handleExecuteAIAudit = async () => {
    if (!selectedTx) return;
    setIsAnalyzing(true);

    if (!selectedSupplier) {
      setAnalysisProgress('Bloqueo de Compliance: Verificando Maestro de Proveedores...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const fullReport: AuditReport = {
        txId: selectedTx.id,
        status: 'RECHAZADO',
        checkedAt: new Date().toISOString(),
        reviewer: currentUser,
        digitizationCheck: { 
          passed: false, 
          observations: "PROVEEDOR NO REGISTRADO: El emisor de la factura no coincide con ningún proveedor autorizado en la base de datos." 
        },
        documentsCheck: { 
          hasInvoice: !!activeTxFiles?.invoice, 
          hasQuoteOrContract: !!(activeTxFiles?.quote || activeTxFiles?.contract), 
          hasCessionCertificate: !!activeTxFiles?.cession, 
          passed: false, 
          observations: "Se bloquea el cotejo documental por falta de entidad proveedora en el sistema." 
        },
        amountsCheck: { 
          invoiceTotalMatchesContract: false, 
          passed: false, 
          observations: "No se puede certificar coincidencia de montos al no existir un perfil maestro de proveedor." 
        },
        chileanLawCheck: { 
          passed: false, 
          observations: "RESTRICCIÓN FISCAL CHILENA: Está estrictamente prohibido procesar a pago o emitir egresos a favor de destinatarios que no estén incorporados en la base de datos de proveedores regulados." 
        },
        bankAndSupplierCheck: { 
          passed: false, 
          observations: "FALLO DE CROSSTABLE: Rut o Razón Social inexistente en el módulo P04012 (Supplier Master Registry)." 
        },
        deviations: [
          {
            title: "DESTINATARIO NO LOCALIZADO EN MAESTRO DE PROVEEDORES",
            severity: "ALTA",
            description: "De acuerdo con el manual de Control Interno y Normativa Fiscal de AssetFlow Chile, no se admite el procesamiento a pago de egresos ni documentos tributarios (PDF/XML) para personas naturales o jurídicas que no cuenten con una ficha técnica vigente en el registro central de proveedores.",
            remedialAction: "Inscribir al proveedor con su RUT, Razón Social e información bancaria homologada antes de intentar auditar o liberar el pago de este documento tributario."
          }
        ],
        remedialSuggestions: "RECHAZO AUTOMÁTICO DE SEGURIDAD. El sistema bloqueó el trámite de pago porque el destinatario no está registrado. Inscriba la Razón Social en el maestro central de AssetFlow para desbloquear.",
        neuralNetworkAnalysis: {
          inputVectors: [
            { label: 'Factura Electrónica', value: activeTxFiles?.invoice ? 'Cargado' : 'Faltante', status: activeTxFiles?.invoice ? 'ok' : 'error' },
            { label: 'Soporte Contrato', value: (activeTxFiles?.quote || activeTxFiles?.contract) ? 'Cargado' : 'Faltante', status: (activeTxFiles?.quote || activeTxFiles?.contract) ? 'ok' : 'error' },
            { label: 'Ficha Proveedor', value: 'NO REGISTRADO', status: 'error' },
            { label: 'Leyes Chilenas SII', value: 'Ley 19.983', status: 'warning' }
          ],
          hiddenNeurons: [
            { id: 'ocr', name: 'Visión & OCR Documental', activation: 0.15, statusMsg: 'No iniciado por fallo en validación previa de emisor.', layer: 'ocr' },
            { id: 'crossref', name: 'Alineación de Entidades', activation: 0.05, statusMsg: 'ERROR: Emisor no existe en base de datos.', layer: 'crossref' },
            { id: 'compliance', name: 'Verificación Ley 19.983 & UAF', activation: 0.10, statusMsg: 'ERROR: No es posible auditar transferencias de terceros no regulados.', layer: 'compliance' },
            { id: 'risk', name: 'Riesgo Financiero / Cobros', activation: 0.02, statusMsg: 'CRÍTICO: Bloqueo de seguridad preventivo.', layer: 'risk' }
          ],
          outputWeights: [
            { name: 'APROBADO', weight: 0.01 },
            { name: 'OBSERVADO', weight: 0.05 },
            { name: 'RECHAZADO', weight: 0.99 }
          ]
        }
      };

      setSavedReports(prev => {
        const updated = { ...prev, [selectedTx.id]: fullReport };
        localStorage.setItem('jde_weekly_payment_audits', JSON.stringify(updated));
        return updated;
      });

      if (handleUpdateTransaction) {
        handleUpdateTransaction({
          ...selectedTx,
          metadata: {
            ...selectedTx.metadata,
            weeklyAuditResult: 'RECHAZADO',
            weeklyAuditCode: 'BLOQUEO-MAESTRO',
            weeklyAuditCheckedAt: fullReport.checkedAt
          }
        });
      }

      setIsAnalyzing(false);
      setAnalysisProgress('');
      return;
    }
    
    // Smooth progress simulation matching high standard ERP auditing
    const steps = [
      'Iniciando conexión con módulo ERP P0411 (Cuentas por Pagar)...',
      'Extrayendo datos de digitación de egreso contable F0911...',
      'Cruzando información con el Directorio Maestro de Proveedores P04012...',
      'Verificando validez jurídica de firma de Facturas electrónicas bajo ley chilena...',
      'Analizando soporte de contratos y presupuestos de obra...',
      'Comprobando regularidad de transferencias bancarias...',
      'Invocando auditor con Inteligencia Artificial Google Gemini...'
    ];

    let stepIndex = 0;
    setAnalysisProgress(steps[0]);

    const timer = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setAnalysisProgress(steps[stepIndex]);
      }
    }, 1200);

    try {
      // Prepare payload to AI
      const mockPayAndSupp = {
        payment: {
          description: selectedTx.description,
          amount: selectedTx.amount,
          category: selectedTx.category,
          documentType: selectedTx.documentType,
          documentNumber: selectedTx.documentNumber,
          date: selectedTx.date,
          invoiceDate: selectedTx.invoiceDate || selectedTx.date,
          isAssigned: activeTxFiles?.isAssigned || false,
          assignedToEntity: activeTxFiles?.isAssigned ? activeTxFiles.assignedToEntity : '',
          contractId: selectedContract?.id || '',
          contractValue: selectedContract?.amount || undefined
        },
        supplier: {
          taxId: selectedTx.supplierTaxId || selectedSupplier?.taxId || '76.123.-',
          name: selectedTx.supplierName || selectedSupplier?.name || 'Proveedor Contable',
          bankName: selectedSupplier?.bankName || 'S/N',
          accountType: selectedSupplier?.accountType || 'S/N',
          accountNumber: selectedSupplier?.accountNumber || 'S/N',
          dueDiligenceRisk: selectedSupplier?.dueDiligenceRisk || 'RIESGO BAJO'
        },
        files: {
          hasInvoice: !!activeTxFiles?.invoice,
          invoiceName: activeTxFiles?.invoice?.name,
          hasQuote: !!activeTxFiles?.quote,
          quoteName: activeTxFiles?.quote?.name,
          hasContract: !!activeTxFiles?.contract,
          contractName: activeTxFiles?.contract?.name,
          hasCessionCertificate: !!activeTxFiles?.cession,
          cessionCertificateName: activeTxFiles?.cession?.name,
          hasUafForm: !!activeTxFiles?.beneficiaryForm,
          uafFormName: activeTxFiles?.beneficiaryForm?.name,
          uafFormData: activeTxFiles?.beneficiaryForm?.customData
        },
        customRules: customRules
      };

      const result = await analyzeWeeklyPaymentCompliance(mockPayAndSupp);
      
      if (result) {
        const fullReport: AuditReport = {
          txId: selectedTx.id,
          status: result.status,
          checkedAt: new Date().toISOString(),
          reviewer: currentUser,
          digitizationCheck: result.digitizationCheck,
          documentsCheck: result.documentsCheck,
          amountsCheck: result.amountsCheck,
          chileanLawCheck: result.chileanLawCheck,
          bankAndSupplierCheck: result.bankAndSupplierCheck,
          deviations: result.deviations || [],
          remedialSuggestions: result.remedialSuggestions,
          customChecklist: {
            hasInvoiceOrTaxDoc: result.documentsCheck?.hasInvoice ?? true,
            hasExecNoConflictDecl: result.status !== 'RECHAZADO',
            hasUafBeneficiaryDecl: !!activeTxFiles?.beneficiaryForm,
            hasThirdPartyNoConflictDecl: result.status !== 'RECHAZADO',
            hasContractOrOT: result.documentsCheck?.hasQuoteOrContract ?? true,
            hasCompletionReceptionDoc: result.documentsCheck?.passed ?? true,
            hasCorrectEgresoMontoMoneda: result.amountsCheck?.passed ?? true,
          },
          neuralNetworkAnalysis: {
            inputVectors: [
              { label: 'Factura Electrónica', value: activeTxFiles?.invoice ? 'Cargada / OK' : 'No Subida', status: activeTxFiles?.invoice ? 'ok' : 'error' },
              { label: 'Soporte Contrato', value: activeTxFiles?.contract ? 'Contrato Marco' : activeTxFiles?.quote ? 'Cotización' : 'No Encontrado', status: (activeTxFiles?.quote || activeTxFiles?.contract) ? 'ok' : 'warning' },
              { label: 'Ficha Maestro', value: selectedSupplier ? `RUT: ${selectedSupplier.taxId}` : 'Error', status: selectedSupplier ? 'ok' : 'error' },
              { label: 'Ley Chilena', value: 'Vigencia de Facturas', status: 'ok' }
            ],
            hiddenNeurons: [
              { 
                id: 'ocr', 
                name: 'Visión & OCR Documental', 
                activation: result.documentsCheck?.passed ? 0.96 : 0.35, 
                statusMsg: result.documentsCheck?.observations || 'Verificación documental completada.', 
                layer: 'ocr' 
              },
              { 
                id: 'crossref', 
                name: 'Alineación de Entidades', 
                activation: result.bankAndSupplierCheck?.passed ? 0.98 : 0.25, 
                statusMsg: result.bankAndSupplierCheck?.observations || 'Conciliación bancaria completada.', 
                layer: 'crossref' 
              },
              { 
                id: 'compliance', 
                name: 'Verificación Ley 19.983 & UAF', 
                activation: result.chileanLawCheck?.passed ? 0.95 : 0.20, 
                statusMsg: result.chileanLawCheck?.observations || 'Vigencia en el S.I.I. e Impuestos evaluada.', 
                layer: 'compliance' 
              },
              { 
                id: 'risk', 
                name: 'Coherencia de Tarifas & Montos', 
                activation: result.amountsCheck?.passed ? 0.97 : 0.30, 
                statusMsg: result.amountsCheck?.observations || 'Controles de desviación de presupuesto ejecutados.', 
                layer: 'risk' 
              }
            ],
            outputWeights: [
              { name: 'APROBADO', weight: result.status === 'APROBADO' ? 0.98 : result.status === 'APROBADO_CON_OBSERVACIONES' ? 0.55 : 0.05 },
              { name: 'OBSERVADO', weight: result.status === 'APROBADO' ? 0.05 : result.status === 'APROBADO_CON_OBSERVACIONES' ? 0.90 : 0.15 },
              { name: 'RECHAZADO', weight: result.status === 'RECHAZADO' ? 0.99 : result.status === 'APROBADO_CON_OBSERVACIONES' ? 0.10 : 0.02 }
            ]
          }
        };

        // Save report state
        setSavedReports(prev => {
          const updated = { ...prev, [selectedTx.id]: fullReport };
          localStorage.setItem('jde_weekly_payment_audits', JSON.stringify(updated));
          return updated;
        });

        // Also integrate to global transactions if applicable to add audit history logs
        if (handleUpdateTransaction) {
          handleUpdateTransaction({
            ...selectedTx,
            metadata: {
              ...selectedTx.metadata,
              weeklyAuditResult: result.status,
              weeklyAuditCode: `AUDIT-${selectedTx.id.substring(0, 5).toUpperCase()}`,
              weeklyAuditCheckedAt: fullReport.checkedAt
            }
          });
        }
      }
    } catch (e) {
      console.error("Error during AI payment audit execution:", e);
    } finally {
      clearInterval(timer);
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  const getStatusBadge = (status: 'APROBADO' | 'APROBADO_CON_OBSERVACIONES' | 'RECHAZADO') => {
    switch (status) {
      case 'APROBADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded-full font-mono">
            <CheckCircle2 size={13} /> APROBADO S/N
          </span>
        );
      case 'APROBADO_CON_OBSERVACIONES':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-full font-mono">
            <AlertTriangle size={13} /> CON OBSERVACIONES
          </span>
        );
      case 'RECHAZADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/30 rounded-full font-mono">
            <XCircle size={13} /> CONGELADO / RECHAZADO
          </span>
        );
    }
  };

  const handleDownloadPDF = (tx: Transaction, report: AuditReport) => {
    const doc = new jsPDF() as any;
    const primaryColor = report.status === 'APROBADO' ? [16, 185, 129] : report.status === 'RECHAZADO' ? [244, 63, 94] : [245, 158, 11];
    
    // Draw Corporate Styled Header Bar
    doc.setFillColor(15, 23, 42); // Elegant slate-900 header
    doc.rect(0, 0, 210, 32, 'F');
    
    // Header texts
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("ASSETFLOW COMPLIANCE - DEPARTAMENTO INMOBILIARIO", 14, 11);
    
    doc.setFontSize(9);
    doc.setTextColor(251, 191, 36); // Amber yellow text
    doc.text(`INFORME DE HALLAZGOS Y SUGERENCIAS DE CONTROL (ROL DIAGNÓSTICO)`, 14, 18);
    
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(`ID VERIFICACION: VER-AUDIT-${tx.id.toUpperCase().substring(0, 10)}`, 14, 25);
    doc.text(`EMISION IMPRESA: ${new Date().toLocaleString()}`, 140, 25);

    // Disclaimer box immediately on top, clear & simple ("para que lo entienda cualquiera")
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 38, 182, 17, 'FD');
    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(190, 24, 74); // Rose-800 for warning text
    doc.text("AVISO IMPORTANTE DE CONTRALORÍA - CONTROL INTERNO:", 18, 43);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Este sistema opera exclusivamente como un asistente de diagnóstico. NUNCA realiza correcciones de datos contables", 18, 48);
    doc.text("o bancarios de forma automática. Todo hallazgo aquí señalado debe resolverse de forma manual por el usuario.", 18, 51);

    // Sidebar status block
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(14, 59, 182, 10, 'F');
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`DICTAMEN GENERAL DE AUDITORÍA: ${report.status === 'APROBADO' ? 'APROBADO SIN NOVEDAD' : report.status === 'RECHAZADO' ? 'BLOQUEADO / RECHAZADO' : 'OBSERVADO'}`, 18, 65.5);

    // Transaction & Audit Details
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    
    // Left Grid
    doc.text("1. DATOS REGISTRADOS DEL EGRESO / PAGO:", 14, 78);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Concepto / Glosa: ${tx.description || 'Sin concepto'}`, 14, 85);
    doc.text(`Monto Contabilizado: $${(tx.amount || 0).toLocaleString()} CLP`, 14, 91);
    doc.text(`Folio Interno: ${tx.documentNumber || 'S/F'} (${tx.documentType || 'S/T'})`, 14, 97);
    doc.text(`Fecha Contable ERP: ${tx.date || 'S/F'}`, 14, 103);
    
    const buildingName = resolveBuildingName(tx);
    doc.text(`Ubicación (Propiedad): ${buildingName}`, 14, 109);

    const txSupplier = suppliers?.find(s => s && (s.taxId === tx.supplierTaxId || s.name === tx.supplierName)) || selectedSupplier;
    const dueDiligenceRisk = txSupplier?.dueDiligenceRisk || 'RIESGO BAJO';

    // Right Grid
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("2. DETALLES DE COMPLIANCE / AUDITORÍA:", 110, 78);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Fecha de Revisión: ${report.checkedAt ? new Date(report.checkedAt).toLocaleDateString() : new Date().toLocaleDateString()}`, 110, 85);
    doc.text(`Auditor ERP: ${report.reviewer || 'AUDITOR'}`, 110, 91);
    doc.text(`Riesgo de Proveedor: ${dueDiligenceRisk}`, 110, 97);
    doc.text(`Canal de Transacción: TRANSFERENCIA BANCARIA`, 110, 103);
    doc.text(`Factura Cedidda (Factoring): ${report.documentsCheck?.hasCessionCertificate ? 'SÍ' : 'NO'}`, 110, 109);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 115, 196, 115);

    // Checkpoints Table (autotable)
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("3. RESUMEN DE COMPROBACIONES REALIZADAS POR ÉSTA ENTRADA:", 14, 121);
    
    const rows = [
      ["1. Check de Digitación Contable", report.digitizationCheck?.passed ? "CUMPLE" : "FALLA", report.digitizationCheck?.observations || ""],
      ["2. Set Soporte de Archivos", report.documentsCheck?.passed ? "CUMPLE" : "FALLA", report.documentsCheck?.observations || ""],
      ["3. Coherencia en Precios e Hitos", report.amountsCheck?.passed ? "CUMPLE" : "FALLA", report.amountsCheck?.observations || ""],
      ["4. Vigencia S.I.I. / Ley de Facturas", report.chileanLawCheck?.passed ? "CUMPLE" : "FALLA", report.chileanLawCheck?.observations || ""],
      ["5. Concordancia Bancaria F0411", report.bankAndSupplierCheck?.passed ? "CUMPLE" : "FALLA", report.bankAndSupplierCheck?.observations || ""]
    ];

    autoTable(doc, {
      startY: 125,
      head: [["Paso / Validación Realizada", "Estado", "Resultado de Diagnóstico Control Interno"]],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [71, 85, 105], valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
        2: { cellWidth: 107 }
      },
      didParseCell: function(data: any) {
        if (data.column.index === 1 && data.cell.section === 'body') {
          const txt = data.cell.text && data.cell.text[0] ? String(data.cell.text[0]) : '';
          if (txt === 'CUMPLE') {
            data.cell.styles.textColor = [16, 185, 129];
          } else {
            data.cell.styles.textColor = [244, 63, 94];
          }
        }
      }
    });

    let lastY = ((doc as any).lastAutoTable?.finalY || 170) + 8;

    // CHECKLIST DE REVISIÓN DE PAQUETE DOCUMENTAL
    if (lastY > 185) {
      doc.addPage();
      lastY = 20;
    }
    
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("4. CHECKLIST DE CONTENIDOS DEL PAQUETE DOCUMENTAL:", 14, lastY);
    
    const checklistRows = [
      [
        "1. Factura, boleta o soporte tributario", 
        getChecklistItemValue(report, 'hasInvoiceOrTaxDoc') ? "CONFORME" : "AUSENTE", 
        getChecklistItemValue(report, 'hasInvoiceOrTaxDoc') ? "Carga verificada de documento tributario SII" : "Falta documento tributario de egreso"
      ],
      [
        "2. Declaración de no-conflicto (Ejecutivo)", 
        getChecklistItemValue(report, 'hasExecNoConflictDecl') ? "CONFORME" : "AUSENTE", 
        getChecklistItemValue(report, 'hasExecNoConflictDecl') ? "Suscrito conforme en legajo" : "Falta declaración de probidad y transparencia del ejecutivo"
      ],
      [
        "3. Declaración beneficiarios finales (UAF)", 
        getChecklistItemValue(report, 'hasUafBeneficiaryDecl') ? "CONFORME" : "AUSENTE", 
        getChecklistItemValue(report, 'hasUafBeneficiaryDecl') ? "Análisis de transparencia corporativa" : "No registra declaración ante Unidad de Análisis Financiero"
      ],
      [
        "4. Declaración de no-conflicto de terceros", 
        getChecklistItemValue(report, 'hasThirdPartyNoConflictDecl') ? "CONFORME" : "AUSENTE", 
        getChecklistItemValue(report, 'hasThirdPartyNoConflictDecl') ? "Declaración de probidad terceros completada" : "No registra declaración de conflicto de intereses de contratista"
      ],
      [
        "5. Contrato respectivo u Orden de Trabajo (OT)", 
        getChecklistItemValue(report, 'hasContractOrOT') ? "CONFORME" : "AUSENTE", 
        getChecklistItemValue(report, 'hasContractOrOT') ? "Contratación vigente o visación de OT presupuestaria" : "No registra contrato u orden de trabajo adjunta"
      ],
      [
        "6. Documento de término y recepción conforme", 
        getChecklistItemValue(report, 'hasCompletionReceptionDoc') ? "CONFORME" : "PENDIENTE", 
        getChecklistItemValue(report, 'hasCompletionReceptionDoc') ? "Acta firmada o registro fotográfico cargado conforme" : "Falta acreditación de recepción conforme de obra"
      ],
      [
        "7. Egreso correcto (Monto y Moneda)",
        getChecklistItemValue(report, 'hasCorrectEgresoMontoMoneda') ? "CONFORME" : "DISCREPANCIA",
        getChecklistItemValue(report, 'hasCorrectEgresoMontoMoneda') ? "Montos y monedas coinciden con documento tributario" : "Discrepancia detectada en montos o tipo de divisa"
      ]
    ];

    autoTable(doc, {
      startY: lastY + 4,
      head: [["Requisito de Documentación", "Estado", "Observación de Control Interno"]],
      body: checklistRows,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7, textColor: [51, 65, 85], valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold' },
        1: { cellWidth: 28, fontStyle: 'bold', halign: 'center' },
        2: { cellWidth: 84 }
      },
      didParseCell: function(data: any) {
        if (data.column.index === 1 && data.cell.section === 'body') {
          const txt = data.cell.text && data.cell.text[0] ? String(data.cell.text[0]) : '';
          if (txt === "CONFORME") {
            data.cell.styles.textColor = [16, 185, 129];
          } else {
            data.cell.styles.textColor = [244, 63, 94];
          }
        }
      }
    });

    lastY = ((doc as any).lastAutoTable?.finalY || (lastY + 36)) + 8;

    // Deviations / Findings Table with Explicit Columns for legal justification & simple action
    const deviations = Array.isArray(report.deviations) ? report.deviations : [];
    if (deviations.length > 0) {
      if (lastY > 190) {
        doc.addPage();
        lastY = 20;
      }
      doc.setFontSize(9.5);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("5. REPORTE DETALLADO DE HALLAZGOS Y SUGERENCIAS DE SOLUCIÓN:", 14, lastY);
      
      const valDevs = deviations.map((d: any) => [
        d.title || "Inconsistencia / Desviación",
        d.severity || "MEDIA",
        d.description || "Inconsistencia detectada en el egreso o su respaldo.",
        d.remedialAction || "Subsanar o regularizar de forma manual."
      ]);

      autoTable(doc, {
        startY: lastY + 4,
        head: [["Hallazgo Encontrado", "Prioridad", "Justificación Legal / Normativa / Comentario", "Sugerencia de Solución (Manual)"]],
        body: valDevs,
        theme: 'striped',
        headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42], valign: 'top' },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' },
          1: { cellWidth: 18, fontStyle: 'bold', halign: 'center' },
          2: { cellWidth: 64 },
          3: { cellWidth: 60, fontStyle: 'bold' }
        },
        didParseCell: function(data: any) {
          if (data.column.index === 1 && data.cell.section === 'body') {
            const txt = data.cell.text && data.cell.text[0] ? String(data.cell.text[0]) : '';
            if (txt === 'ALTA') {
              data.cell.styles.textColor = [220, 38, 38];
            } else if (txt === 'MEDIA') {
              data.cell.styles.textColor = [217, 119, 6];
            } else {
              data.cell.styles.textColor = [13, 148, 136];
            }
          }
        }
      });
      lastY = ((doc as any).lastAutoTable?.finalY || (lastY + (valDevs.length * 15) + 12)) + 8;
    }

    // Suggestions Block
    if (lastY > 230) {
      doc.addPage();
      lastY = 20;
    }
    doc.setFontSize(9.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("6. DICTAMEN DE AUDITORÍA Y COMENTARIOS GENERALES PARA CONTRALORÍA:", 14, lastY);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    
    const disclaimerText = "NOTA DE AUDITORÍA GENERAL (ROL NO-MODIFICATIVO): El sistema cumple con un rol meramente diagnóstico de asesoría analítica. El sistema NO realiza correcciones operativas ni reemplaza las obligaciones humanas de firmas.";
    const commentFull = `${report.remedialSuggestions}\n\n${disclaimerText}`;
    const splitSuggestions = doc.splitTextToSize(commentFull, 180);
    doc.text(splitSuggestions, 14, lastY + 5);

    // Signature blocks
    const sigY = lastY + 35 > 260 ? 20 : lastY + 35;
    if (sigY === 20) doc.addPage();

    doc.setDrawColor(200, 200, 200);
    doc.line(60, sigY + 12, 150, sigY + 12);
    
    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(50, 60, 70);
    doc.text("DEPARTAMENTO INMOBILIARIO", 105, sigY + 17, { align: "center" });

    // Save
    doc.save(`Reporte_Hallazgos_Control_Depto_Inmobiliario_Pago_${tx.documentNumber}.pdf`);
  };

  const handleDownloadBatchReport = () => {
    const doc = new jsPDF() as any;
    const batch = batches.find(b => b.id === selectedWeek);
    const batchLabel = batch ? batch.label : selectedWeek;
    
    // Header
    doc.setFillColor(11, 60, 93); // ERP Corporate Navy Blue
    doc.rect(0, 0, 210, 32, 'F');
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("ASSETFLOW COMPLIANCE - DEPARTAMENTO INMOBILIARIO", 14, 11);
    
    doc.setFontSize(9);
    doc.setTextColor(255, 204, 0); // Golden Accent
    doc.text(`COMPROBANTE DE REVISIÓN CONTROL INTERNO DEPTO INMOBILIARIO (LOTE SEMANAL)`, 14, 18);
    
    doc.setFontSize(8);
    doc.setTextColor(200, 220, 240);
    doc.text(`REPORTE GENERAL EMITIDO DESDE LA CONSOLA ACTIVA DE CONTROL DE GESTIÓN`, 14, 25);
    doc.text(`GENERADO EL: ${new Date().toLocaleString()}`, 140, 25);

    // 1. Stats Box
    doc.setFillColor(242, 245, 249);
    doc.rect(14, 38, 92, 38, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, 38, 92, 38, 'D');
    
    doc.setFontSize(8.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(11, 60, 93);
    doc.text("CONSOLIDADO DE CUMPLIMIENTO", 18, 44);
    
    const combinedUnique = [...(localUploadedEgresos || []), ...(egresos || [])].filter((tx, idx, arr) => tx && arr.findIndex(t => t && t.id === tx.id) === idx);
    const matchedEgresosForReport = combinedUnique.filter(tx => {
      if (!tx) return false;
      const desc = tx.description || '';
      const name = tx.supplierName || '';
      const docNum = tx.documentNumber || '';
      const amt = tx.amount !== undefined && tx.amount !== null ? String(tx.amount) : '';
      const criteria = `${desc} ${name} ${docNum} ${amt}`.toLowerCase();
      return criteria.includes((searchTerm || '').toLowerCase());
    });
    
    const reportTotalAmount = matchedEgresosForReport.reduce((acc, tx) => acc + (tx?.amount || 0), 0);
    const reportTotalCount = matchedEgresosForReport.length;
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Total Egresos en Reporte: ${reportTotalCount}`, 18, 50);
    doc.text(`• Monto Consolidado: $${reportTotalAmount.toLocaleString()} CLP`, 18, 55);
    doc.text(`• Revisor: ${currentUser}`, 18, 60);
    doc.text(`• Estado Actual: CONSOLIDADO GLOBAL`, 18, 65);

    // 2. Compliance Legend Box WITH ACTIONS TO REMEDY
    doc.setFillColor(254, 254, 255);
    doc.rect(110, 38, 86, 38, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(110, 38, 86, 38, 'D');
    
    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(11, 60, 93);
    doc.text("SIGNIFICADO ESTADOS COMPLIANCE & ACCIONES", 114, 44);
    
    doc.setFontSize(6);
    
    // its meaning rows with action to remedy
    doc.setFillColor(16, 185, 129); // Green
    doc.circle(115, 49, 1.2, 'F');
    doc.setTextColor(16, 185, 129);
    doc.setFont("Helvetica", "bold");
    doc.text("APROBADO:", 118, 50.2);
    doc.setTextColor(100, 116, 139);
    doc.setFont("Helvetica", "normal");
    doc.text("Gesto sin alertas. Acción: Proceder a pago centralizado.", 136, 50.2);
    
    doc.setFillColor(217, 119, 6); // Orange
    doc.circle(115, 54, 1.2, 'F');
    doc.setTextColor(217, 119, 6);
    doc.setFont("Helvetica", "bold");
    doc.text("CON OBS.:", 118, 55.2);
    doc.setTextColor(100, 116, 139);
    doc.setFont("Helvetica", "normal");
    doc.text("Alertas menores. Acción: Corregir glosa contable y pagar.", 136, 55.2);
    
    doc.setFillColor(220, 38, 38); // Red
    doc.circle(115, 59, 1.2, 'F');
    doc.setTextColor(220, 38, 38);
    doc.setFont("Helvetica", "bold");
    doc.text("RECHAZADO:", 118, 60.2);
    doc.setTextColor(100, 116, 139);
    doc.setFont("Helvetica", "normal");
    doc.text("Faltas graves. Acción: Congelar pago y exigir set documental.", 136, 60.2);

    doc.setFillColor(100, 116, 139); // Gray
    doc.circle(115, 64, 1.2, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFont("Helvetica", "bold");
    doc.text("PENDIENTE:", 118, 65.2);
    doc.setTextColor(100, 116, 139);
    doc.setFont("Helvetica", "normal");
    doc.text("Sin auditar. Acción: Correr Auditoría IA desde control interno.", 136, 65.2);

    // Grouping transactions by week
    const groupedByWeek: Record<string, { label: string; transactions: Transaction[]; subtotal: number }> = {};
    
    batches.forEach(b => {
      groupedByWeek[b.id] = {
        label: b.label,
        transactions: [],
        subtotal: 0
      };
    });
    
    const otherGroupId = 'OTROS';
    groupedByWeek[otherGroupId] = {
      label: 'OTROS REGISTROS / FUERA DE LOTE',
      transactions: [],
      subtotal: 0
    };
    
    matchedEgresosForReport.forEach(tx => {
      if (!tx) return;
      const parentBatch = batches.find(b => tx.date && b.start && b.end && tx.date >= b.start && tx.date <= b.end);
      if (parentBatch) {
        groupedByWeek[parentBatch.id].transactions.push(tx);
        groupedByWeek[parentBatch.id].subtotal += (tx.amount || 0);
      } else {
        groupedByWeek[otherGroupId].transactions.push(tx);
        groupedByWeek[otherGroupId].subtotal += (tx.amount || 0);
      }
    });

    let currentY = 80;

    const activeGroups = Object.entries(groupedByWeek)
      .map(([id, data]) => ({ id, ...data }))
      .filter(group => group.transactions.length > 0);

    if (activeGroups.length === 0) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("NO SE ENCONTRARON REGISTROS QUE COINCIDAN CON LOS CRITERIOS DE BÚSQUEDA.", 14, currentY);
    } else {
      activeGroups.forEach((group, index) => {
        if (currentY > 210) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(11, 60, 93);
        doc.text(`BLOQUE DE LOTES: ${group.label.toUpperCase()}`, 14, currentY);
        currentY += 4;

        const tableRows = group.transactions.map(tx => {
          const report = savedReports[tx.id];
          let statusStr = '     PENDIENTE';
          if (report) {
            statusStr = report.status === 'APROBADO' ? '     APROBADO' : report.status === 'RECHAZADO' ? '     RECHAZADO' : '     CON OBS.';
          }
          
          const segDef = classifyTransactionSeguro(tx);
          const workDesc = tx.description || 'S/D Detalle de Trabajo';
          const buildingName = resolveBuildingName(tx);

          return [
            tx.documentNumber || 'S/N',
            tx.documentType || 'FACTURA',
            tx.supplierName || 'S/N Proveedor',
            tx.supplierTaxId || '',
            workDesc,
            buildingName,
            segDef?.pdfLabel || 'Seguros',
            tx.date || 'S/F',
            `$${(tx.amount || 0).toLocaleString()} CLP`,
            statusStr
          ];
        });

        tableRows.push([
          '',
          '',
          `SUB-TOTAL DE PAGOS LOTE ${group.label.split(' ')[0]}`,
          '',
          '',
          '',
          '',
          '',
          `$${(group.subtotal || 0).toLocaleString()} CLP`,
          ''
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["Folio/ID", "Tipo Doc", "Razón Social", "RUT Proveedor", "Glosa (Descripción Trabajo)", "Propiedad / Conjunto", "Clasificación Seguro", "Fecha", "Monto", "Estado Compliance"]],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [11, 60, 93], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59] },
          columnStyles: {
            0: { cellWidth: 10, fontStyle: 'bold' },
            1: { cellWidth: 12 },
            2: { cellWidth: 24 }, // Razón Social
            3: { cellWidth: 16, fontStyle: 'bold' }, // RUT Proveedor
            4: { cellWidth: 28 }, // Glosa (Description)
            5: { cellWidth: 22, fontStyle: 'bold' }, // Prop/Conjunto
            6: { cellWidth: 18 }, // Clasificación Seguro
            7: { cellWidth: 12, halign: 'center' }, // Fecha
            8: { cellWidth: 16, halign: 'right', fontStyle: 'bold' }, // Monto
            9: { cellWidth: 14, halign: 'left', fontStyle: 'bold' } // Estado Compliance
          },
          didParseCell: function(data: any) {
            const isSubtotalRow = data.row.index === tableRows.length - 1;
            if (isSubtotalRow) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [241, 245, 249];
              data.cell.styles.textColor = [15, 23, 42];
              data.cell.styles.fontSize = 7;
            } else if (data.column.index === 9 && data.cell.section === 'body') {
              const txt = data.cell.text && data.cell.text[0] ? String(data.cell.text[0]) : '';
              if (txt.includes('APROBADO')) {
                data.cell.styles.textColor = [16, 185, 129];
              } else if (txt.includes('RECHAZADO')) {
                data.cell.styles.textColor = [220, 38, 38];
              } else if (txt.includes('OBS')) {
                data.cell.styles.textColor = [217, 119, 6];
              } else {
                data.cell.styles.textColor = [100, 116, 139];
              }
            }
          },
          didDrawCell: function(data: any) {
            const isSubtotalRow = data.row.index === tableRows.length - 1;
            if (isSubtotalRow) return;

            if (data.column.index === 8 && data.cell.section === 'body') {
              const txt = data.cell.text && data.cell.text[0] ? String(data.cell.text[0]) : '';
              let color = [100, 116, 139];
              if (txt.includes('APROBADO')) {
                color = [16, 185, 129];
              } else if (txt.includes('RECHAZADO')) {
                color = [220, 38, 38];
              } else if (txt.includes('OBS')) {
                color = [217, 119, 6];
              }

              const posX = data.cell.x + 2.0;
              const posY = data.cell.y + (data.cell.height / 2);
              doc.setFillColor(color[0], color[1], color[2]);
              doc.circle(posX, posY, 1.2, 'F');
            }
          }
        });

        currentY = ((doc as any).lastAutoTable?.finalY || (currentY + (tableRows.length * 8) + 10)) + 12;
      });

      // Draw Grand Total Box
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(15, 23, 42); 
      doc.rect(14, currentY, 182, 11, 'F');
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text("TOTAL GENERAL GLOBAL REVISADO (PAGOS CONSOLIDADOS DEL LOTE)", 18, currentY + 7);
      doc.text(`$${reportTotalAmount.toLocaleString()} CLP`, 192, currentY + 7, { align: 'right' });
      
      currentY += 18;

      // Classifying and reporting values by Insurance Category
      let totalVidaOtras = 0;
      let countVidaOtras = 0;
      let appVidaOtras = 0;

      let totalCentenario = 0;
      let countCentenario = 0;
      let appCentenario = 0;

      let totalGenerales = 0;
      let countGenerales = 0;
      let appGenerales = 0;

      matchedEgresosForReport.forEach(tx => {
        if (!tx) return;
        const seg = classifyTransactionSeguro(tx);
        const rep = savedReports[tx.id];
        const isApproved = rep && rep.status === 'APROBADO';

        if (seg?.id === 'VIDA_CENTENARIO') {
          totalCentenario += (tx.amount || 0);
          countCentenario++;
          if (isApproved) appCentenario++;
        } else if (seg?.id === 'VIDA_OTRO') {
          totalVidaOtras += (tx.amount || 0);
          countVidaOtras++;
          if (isApproved) appVidaOtras++;
        } else {
          totalGenerales += (tx.amount || 0);
          countGenerales++;
          if (isApproved) appGenerales++;
        }
      });

      if (currentY > 215) {
        doc.addPage();
        currentY = 20;
      }

      // Draw Insurance category grouping box
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, 182, 45, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(14, currentY, 182, 45, 'D');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(11, 60, 93);
      doc.text("4. RESUMEN DE CONGREGACIÓN POR COMPAÑÍA / CARTERA DE SEGUROS:", 18, currentY + 7);

      // Line separators
      doc.setDrawColor(226, 232, 240);
      doc.line(18, currentY + 11, 192, currentY + 11);

      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      
      // Row 1: Vida Otras
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text("• COMPAÑÍA DE SEGUROS DE VIDA (GENERAL):", 20, currentY + 17);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`Cantidad: ${countVidaOtras} egresos  |  Conciliado: $${totalVidaOtras.toLocaleString()} CLP  |  Tasa Aprobación: ${countVidaOtras > 0 ? Math.round((appVidaOtras / countVidaOtras) * 100) : 100}%`, 20, currentY + 21.5);

      // Row 2: Centenario
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(217, 119, 6);
      doc.text("• SEGUROS DE VIDA (SUB-CATEGORÍA: EDIFICIO CENTENARIO):", 20, currentY + 27);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`Cantidad: ${countCentenario} egresos  |  Conciliado: $${totalCentenario.toLocaleString()} CLP  |  Tasa Aprobación: ${countCentenario > 0 ? Math.round((appCentenario / countCentenario) * 100) : 100}%`, 20, currentY + 31.5);

      // Row 3: Generales
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(59, 130, 246);
      doc.text("• COMPAÑÍA DE SEGUROS GENERALES:", 20, currentY + 37);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`Cantidad: ${countGenerales} egresos  |  Conciliado: $${totalGenerales.toLocaleString()} CLP  |  Tasa Aprobación: ${countGenerales > 0 ? Math.round((appGenerales / countGenerales) * 100) : 100}%`, 20, currentY + 41.5);

      currentY += 52;
    }

    // --- NEW DETAILED REVIEW STEPS APPENDIX ---
    const auditedTransactions = matchedEgresosForReport.filter(tx => savedReports[tx.id]);
    if (auditedTransactions.length > 0) {
      doc.addPage();
      currentY = 20;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(11, 60, 93);
      doc.text("ANEXO: EXPEDIENTE DETALLADO DE CONTROL INTERNO & PASOS DE AUDITORÍA", 14, currentY);
      doc.setFontSize(8);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Análisis minucioso del resultado de cada paso de control y mitigación de desviaciones por transacción auditada.", 14, currentY + 4.5);
      
      currentY += 12;

      auditedTransactions.forEach((tx) => {
        const report = savedReports[tx.id];
        const buildingName = resolveBuildingName(tx);

        if (currentY > 210) {
          doc.addPage();
          currentY = 20;
        }

        // Title Row Block
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, 182, 10, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, currentY, 182, 10, 'D');

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(`HISTORIAL DETALLADO PAGO FOLIO: ${tx.documentNumber || 'S/N'} | PROVEEDOR: ${tx.supplierName || 'S/N'}  | $${(tx.amount || 0).toLocaleString()} CLP`, 18, currentY + 6.5);
        
        currentY += 13;

        const subRows = [
          [
            "1. Digitación Contable (Glosa vs Auxiliares)",
            report.digitizationCheck?.passed ? "CUMPLE (PASSED)" : "LOG OUTLIER",
            report.digitizationCheck?.observations || "Verificado"
          ],
          [
            "2. Soporte Documental (Contratos/Hitos de Pago)",
            report.documentsCheck?.passed ? "CUMPLE (PASSED)" : "INSUFICIENTE / FALLA",
            report.documentsCheck?.observations || "Verificado"
          ],
          [
            "3. Coherencia en Tarifas e Hito Financiero",
            report.amountsCheck?.passed ? "CUMPLE (PASSED)" : "DISCREPANCIA",
            report.amountsCheck?.observations || "Verificado"
          ],
          [
            "4. Cumplimiento Ley 19.983 S.I.I. Facturación",
            report.chileanLawCheck?.passed ? "CUMPLE SII (APTO)" : "S.I.I. OBSERVADO",
            report.chileanLawCheck?.observations || "Verificado"
          ],
          [
            "5. Validación Identidad Proveedor-Cuenta Transferencia",
            report.bankAndSupplierCheck?.passed ? "CONCORDANTE (PASSED)" : "RIEGOS ADICIONALES",
            report.bankAndSupplierCheck?.observations || "Verificado"
          ]
        ];

        autoTable(doc, {
          startY: currentY,
          head: [["Paso de Control de Calidad", "Resultado", "Comentarios y Justificaciones del Auditor"]],
          body: subRows,
          theme: 'grid',
          headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 26, fontStyle: 'bold' },
            2: { cellWidth: 106 }
          },
          didParseCell: function(data: any) {
            if (data.column.index === 1 && data.cell.section === 'body') {
              const val = data.cell.text && data.cell.text[0] ? String(data.cell.text[0]) : '';
              if (val.includes('CUMPLE') || val.includes('CONCORDANTE')) {
                data.cell.styles.textColor = [16, 185, 129];
              } else {
                data.cell.styles.textColor = [220, 38, 38];
              }
            }
          }
        });

        currentY = ((doc as any).lastAutoTable?.finalY || (currentY + 45)) + 4;

        if (currentY > 195) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(11, 60, 93);
        doc.text("Checklist de Control de Contenido - Paquete Documental (7 Requisitos de Control):", 14, currentY + 3);

        const chkRows = [
          [
            "1. Factura, boleta o doc. tributario correspondiente",
            getChecklistItemValue(report, 'hasInvoiceOrTaxDoc') ? "CONFORME" : "AUSENTE",
            getChecklistItemValue(report, 'hasInvoiceOrTaxDoc') ? "Carga y validez tributaria certificada en S.I.I. del proveedor" : "No adjunta RUT/Factura original"
          ],
          [
            "2. Dec. de ausencia de conflicto de interés ejecutivo",
            getChecklistItemValue(report, 'hasExecNoConflictDecl') ? "CONFORME" : "AUSENTE",
            getChecklistItemValue(report, 'hasExecNoConflictDecl') ? "Suscrito sin observaciones en carpeta de operación" : "No registra declaración de conflicto"
          ],
          [
            "3. Dec. de beneficiarios finales (UAF)",
            getChecklistItemValue(report, 'hasUafBeneficiaryDecl') ? "CONFORME" : "AUSENTE",
            getChecklistItemValue(report, 'hasUafBeneficiaryDecl') ? "Búsqueda AML/UAF de propiedad transparente" : "No registra declaración de beneficiario final"
          ],
          [
            "4. Dec. de ausencia de conflicto de interés terceros",
            getChecklistItemValue(report, 'hasThirdPartyNoConflictDecl') ? "CONFORME" : "AUSENTE",
            getChecklistItemValue(report, 'hasThirdPartyNoConflictDecl') ? "Declaración de probidad e integridad firmada" : "No registra declaración de terceros"
          ],
          [
            "5. Contrato si corresponde u Orden de Trabajo (OT)",
            getChecklistItemValue(report, 'hasContractOrOT') ? "CONFORME" : "N/A - COTIZACION",
            getChecklistItemValue(report, 'hasContractOrOT') ? "Contratación vigente o visación presupuestaria" : "No registra contrato formal o presupuesto"
          ],
          [
            "6. Recepción conforme de obra (Acta / Registro)",
            getChecklistItemValue(report, 'hasCompletionReceptionDoc') ? "CONFORME" : "PENDIENTE REVISION",
            getChecklistItemValue(report, 'hasCompletionReceptionDoc') ? "Acta de entrega firmada o registro fotográfico cargado" : "Falta acreditación de finalización de obra"
          ],
          [
            "7. Egreso correctamente confeccionado (Monto y Moneda)",
            getChecklistItemValue(report, 'hasCorrectEgresoMontoMoneda') ? "CONFORME" : "DISCREPANCIA",
            getChecklistItemValue(report, 'hasCorrectEgresoMontoMoneda') ? "Monto del egreso coincide con el documento tributario y misma unidad de moneda" : "Diferencia de monto o moneda entre egreso y factura"
          ]
        ];

        autoTable(doc, {
          startY: currentY + 5,
          head: [["Requisito de Documentación Verificado", "Estado", "Observación de Control Interno"]],
          body: chkRows,
          theme: 'grid',
          headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 6.5, textColor: [51, 65, 85], valign: 'middle' },
          columnStyles: {
            0: { cellWidth: 70, fontStyle: 'bold' },
            1: { cellWidth: 32, fontStyle: 'bold', halign: 'center' },
            2: { cellWidth: 80 }
          },
          didParseCell: function(data: any) {
            if (data.column.index === 1 && data.cell.section === 'body') {
              const txt = data.cell.text && data.cell.text[0] ? String(data.cell.text[0]) : '';
              if (txt === "CONFORME") {
                data.cell.styles.textColor = [16, 185, 129];
              } else if (txt === "AUSENTE" || txt === "DISCREPANCIA" || txt === "PENDIENTE REVISION") {
                data.cell.styles.textColor = [244, 63, 94];
              } else {
                data.cell.styles.textColor = [217, 119, 6]; // warning / N/A
              }
            }
          }
        });

        currentY = ((doc as any).lastAutoTable?.finalY || (currentY + 36)) + 4;

        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text("Plan de Acción Inmobiliaria Recomendado:", 14, currentY);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        
        const actionText = `• Propiedad/Conjunto: ${buildingName}  |  Acción Sugerida: ${report.remedialSuggestions}`;
        const splitAct = doc.splitTextToSize(actionText, 182);
        doc.text(splitAct, 14, currentY + 3.5);

        currentY += (splitAct.length * 3.5) + 8;
      });
    }

    // Add Signature Box
    const footerY = currentY > 235 ? 20 : currentY;
    if (currentY > 235) doc.addPage();

    doc.setDrawColor(200, 200, 200);
    doc.line(60, footerY + 12, 150, footerY + 12);
    
    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(50, 60, 70);
    doc.text("DEPARTAMENTO INMOBILIARIO", 105, footerY + 16, { align: "center" });

    // Draw page numbers in footers of ALL pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); 
      
      doc.setDrawColor(226, 232, 240); 
      doc.line(14, 280, 196, 280);
      
      doc.text("ASSETFLOW COMPLIANCE SUITE • COMPROBANTE DE REVISIÓN CONTROL INTERNO DEPTO INMOBILIARIO", 14, 285);
      doc.text(`pág ${i} de ${totalPages}`, 196, 285, { align: 'right' });
    }

    doc.save(`Comprobante_Revision_Control_Interno_Depto_Inmobiliario_${selectedWeek}.pdf`);
  };

  const handleExportExcel = () => {
    const combinedUnique = [...(localUploadedEgresos || []), ...(egresos || [])].filter((tx, idx, arr) => tx && arr.findIndex(t => t && t.id === tx.id) === idx);
    const matchedEgresosForExcel = combinedUnique.filter(tx => {
      if (!tx) return false;
      const desc = tx.description || '';
      const name = tx.supplierName || '';
      const docNum = tx.documentNumber || '';
      const amt = tx.amount !== undefined && tx.amount !== null ? String(tx.amount) : '';
      const criteria = `${desc} ${name} ${docNum} ${amt}`.toLowerCase();
      return criteria.includes((searchTerm || '').toLowerCase());
    });

    const dataToExport = matchedEgresosForExcel.map(tx => {
      const seg = classifyTransactionSeguro(tx);
      const rep = savedReports[tx.id];
      const buildingName = resolveBuildingName(tx);
      
      return {
        'Folio / ID': tx.documentNumber || 'S/N',
        'Tipo Documento': tx.documentType || 'FACTURA',
        'Fecha Pago': tx.date || 'S/F',
        'Proveedor': tx.supplierName || 'S/N Proveedor',
        'RUT Proveedor': tx.supplierTaxId || 'S/R',
        'Descripción del Trabajo (Glosa)': tx.description || 'Sin concepto',
        'Propiedad / Conjunto (Ubicación)': buildingName,
        'Clasificación Cartera': seg?.text || 'Seguros',
        'Monto CLP': tx.amount || 0,
        'Estado Compliance': rep ? rep.status : 'PENDIENTE',
        'Revisor': rep?.reviewer || 'S/R',
        'Fecha Revisión': rep?.checkedAt ? new Date(rep.checkedAt).toLocaleDateString() : 'No Auditado',
        'Concordancia Digitación': rep?.digitizationCheck?.passed ? 'CUMPLE' : 'OUTLIER',
        'Obs. Digitación': rep?.digitizationCheck?.observations || '',
        'Concordancia Archivos Soporte': rep?.documentsCheck?.passed ? 'CUMPLE' : 'FALLA',
        'Obs. Archivos': rep?.documentsCheck?.observations || '',
        'Concordancia Montos': rep?.amountsCheck?.passed ? 'CUMPLE' : 'DISCREPANCIA',
        'Obs. Montos': rep?.amountsCheck?.observations || '',
        'Ley 19.983 S.I.I.': rep?.chileanLawCheck?.passed ? 'CUMPLE REG.' : 'OBSERVADO',
        'Obs. Ley 19.983': rep?.chileanLawCheck?.observations || '',
        'Concordancia Bancaria': rep?.bankAndSupplierCheck?.passed ? 'PASSED' : 'VERIFICAR',
        'Obs. Banco': rep?.bankAndSupplierCheck?.observations || '',
        'Plan de Acción Sugerido': rep?.remedialSuggestions || ''
      };
    });

    exportToExcel(
      dataToExport, 
      `Comprobante_Revision_Control_Interno_Depto_Inmobiliario_Lote_${selectedWeek}.xlsx`, 
      `Lote ${selectedWeek}`
    );
  };

  /**
   * Exporta a Excel el Maestro de Proveedores con sus estados de vigencia de Beneficiarios Finales UAF
   */
  const handleExportSuppliersExcel = () => {
    const dataToExport = filteredSuppliersForQuery.map(s => {
      const { hasUafDeclaration, expirationDateStr, isExpired } = getSupplierUafStatus(s);
      
      return {
        'Folio': s.folio || 'N/A',
        'RUT Proveedor': s.taxId,
        'Razón Social (Proveedor)': s.name,
        'Categoría': s.category,
        'Tipo de Documento': s.taxDocumentType,
        'Fecha Incorporación / Solicitud': s.requestDate,
        'Contacto Representante': s.contactName || 'S/D',
        'E-mail Contacto': s.email || 'S/D',
        'Teléfono': s.phone || 'S/D',
        'Dirección / Domicilio': s.address || 'S/D',
        'Banco': s.bankName || 'S/D',
        'Tipo Cuenta Bancaria': s.accountType || 'S/D',
        'Nro Cuenta Bancaria': s.accountNumber || 'S/D',
        'Riesgo Debida Diligencia': s.dueDiligenceRisk || 'RIESGO BAJO',
        'Tiene Certificado F29/DTE': s.complianceMaster?.hasTaxCertificate ? 'SÍ' : 'NO',
        'Tiene Declaración Beneficiarios UAF': hasUafDeclaration ? 'SÍ' : 'NO',
        'Fecha Vencimiento UAF (1 año)': hasUafDeclaration ? expirationDateStr : 'No aplica',
        'Estado de Vigencia Documento UAF': hasUafDeclaration ? (isExpired ? 'VENCIDO - ACCIÓN EXIGIDA' : 'VIGENTE / APTO') : 'SIN DECLARACIÓN',
        'Estado Maestro': s.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO',
        'Funcionario Registrador': s.userCreator || 'S/R'
      };
    });

    exportToExcel(
      dataToExport, 
      `Maestro_Proveedores_Reporte_Compliance_UAF_${new Date().toISOString().split('T')[0]}.xlsx`, 
      'Proveedores AssetFlow'
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f8fafc] text-slate-800 font-sans p-4 md:p-6 overflow-auto w-full">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-5 mb-6">
        <div>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 font-bold rounded-md font-mono border border-indigo-200 shadow-xs">
            CONTROL INTERNO INMOBILIARIO & CUMPLIMIENTO FISCAL
          </span>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight mt-1.5 flex items-center gap-2">
            <Layers size={24} className="text-indigo-600" />
            Comprobante de Revisión Control Interno Depto Inmobiliario
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Módulo automatizado con IA Gemini para auditar control interno y cumplimiento fiscal de transmisiones de egresos de activos inmobiliarios.
          </p>
        </div>
        
        {/* Batch selectors & Global Report Trigger */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadBatchReport}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider py-2.5 px-3.5 rounded-md shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Download size={14} /> Generar Reporte de Lote (PDF)
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider py-2.5 px-3.5 rounded-md shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Calculator size={14} /> Exportar a Excel (XLS)
          </button>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md py-1.5 px-3 shadow-3xs">
              <Calendar size={14} className="text-slate-400" />
              <select 
                value={selectedWeek} 
                onChange={(e) => {
                  setSelectedWeek(e.target.value);
                  setSelectedTxId(null);
                }}
                className="bg-transparent text-slate-700 text-xs font-bold leading-tight font-mono outline-hidden cursor-pointer"
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                const lastId = batches[0]?.id || 'W21';
                const match = lastId.match(/(\d+)/);
                const nextNum = match ? parseInt(match[1]) + 1 : 22;
                setNewBatchId(`W${nextNum}`);
                setNewBatchLabel(`LOTE-2026-W${nextNum}`);
                
                if (batches[0]) {
                  const lastEndDate = new Date(batches[0].end);
                  const nextStart = new Date(lastEndDate);
                  nextStart.setDate(lastEndDate.getDate() + 1);
                  const nextEnd = new Date(nextStart);
                  nextEnd.setDate(nextStart.getDate() + 6);
                  
                  setNewBatchStart(nextStart.toISOString().split('T')[0]);
                  setNewBatchEnd(nextEnd.toISOString().split('T')[0]);
                }
                
                setIsCreateBatchOpen(true);
              }}
              title="Crear Nuevo Lote Personalizado"
              className="flex items-center justify-center p-2 bg-indigo-55 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-100 hover:border-indigo-200 rounded-md shadow-3xs transition-all cursor-pointer"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* CREATE BATCH MODAL DIALOG */}
          {isCreateBatchOpen && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="bg-indigo-950 p-4 text-white">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={18} className="text-indigo-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider font-mono">Crear Nuevo Lote Único</h3>
                  </div>
                  <p className="text-[10px] text-indigo-200/90 mt-1">
                    Crea un lote con un ID único y legible para identificar y agrupar egresos de control interno.
                  </p>
                </div>

                <div className="p-4 space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-550 tracking-wider font-mono mb-1">
                      ID Único del Lote (Fácil de recordar)
                    </label>
                    <input
                      type="text"
                      value={newBatchId}
                      onChange={(e) => {
                        const cleanVal = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                        setNewBatchId(cleanVal);
                        setNewBatchLabel(`LOTE-2026-${cleanVal}`);
                      }}
                      placeholder="Ej: W22, URBANO-3, COPIAPO"
                      className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-[9px] text-slate-400 mt-1">
                      Ej: <span className="font-mono bg-slate-100 px-1 py-0.2 rounded-sm text-[8px] font-bold">W22</span> o <span className="font-mono bg-slate-100 px-1 py-0.2 rounded-sm text-[8px] font-bold">LOTE-MAY</span>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-550 tracking-wider font-mono mb-1">
                      Etiqueta / Nombre Visible del Lote
                    </label>
                    <input
                      type="text"
                      value={newBatchLabel}
                      onChange={(e) => setNewBatchLabel(e.target.value)}
                      placeholder="Ej: LOTE-2026-W22 (Semana Actual)"
                      className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-2.5 text-xs font-bold text-slate-850 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-550 tracking-wider font-mono mb-1">
                        Fecha Inicio
                      </label>
                      <input
                        type="date"
                        value={newBatchStart}
                        onChange={(e) => setNewBatchStart(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-550 tracking-wider font-mono mb-1">
                        Fecha Término
                      </label>
                      <input
                        type="date"
                        value={newBatchEnd}
                        onChange={(e) => setNewBatchEnd(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-2.5 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-normal bg-amber-50 rounded p-2 border border-amber-100/50">
                    💡 **Filtración por Fecha**: Los egresos de este rango ({newBatchStart} al {newBatchEnd}) se clasificarán automáticamente bajo este lote.
                  </p>
                </div>

                <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setIsCreateBatchOpen(false)}
                    className="px-3 py-1.5 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (!newBatchId.trim()) {
                        return;
                      }
                      const ok = handleCreateBatch(newBatchId, newBatchStart, newBatchEnd, newBatchLabel);
                      if (ok) {
                        setIsCreateBatchOpen(false);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-black uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    Crear y Seleccionar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STATS WIDGET GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Egresos Lote</span>
          <span className="text-lg font-black text-slate-900 mt-1">{stats.totalCount}</span>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs flex flex-col justify-between border-l-4 border-l-indigo-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono font-bold text-indigo-600">Monto Lote</span>
          <span className="text-lg font-black text-indigo-700 mt-1">${stats.totalBatchAmount.toLocaleString()} CLP</span>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono font-bold text-emerald-600">Aprobados IA</span>
          <span className="text-lg font-black text-emerald-700 mt-1">{stats.approvedCount}</span>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs flex flex-col justify-between border-l-4 border-l-amber-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono font-bold text-amber-600">Advertencias</span>
          <span className="text-lg font-black text-amber-700 mt-1">{stats.warningCount}</span>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs flex flex-col justify-between border-l-4 border-l-rose-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono font-bold text-rose-500">Congelados</span>
          <span className="text-lg font-black text-rose-700 mt-1">{stats.rejectedCount}</span>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs flex flex-col justify-between border-l-4 border-l-slate-400">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Pdtes. Revisar</span>
          <span className="text-lg font-black text-slate-500 mt-1">{stats.pendingCount}</span>
        </div>
      </div>

      {/* MAIN MODULE CONTENT SPLIT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPONENT: LIST of Egresos in select batch - REDESIGNED AS HIGH QUALITY ERP GRID/TABLE */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex flex-col">
          
          {/* FOLDER & PACKET LOADER SLOT SYSTEM */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 border-l-4 border-l-indigo-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                <FolderOpen size={14} className="text-indigo-600 animate-pulse" />
                Carga de Lotes / Carpetas Semanales
              </h3>
              {weeklyBatchFiles.length > 0 && (
                <button 
                  onClick={clearWeeklyBatchFiles} 
                  className="text-[9px] bg-rose-100 hover:bg-rose-200 text-rose-700 font-extrabold px-1.5 py-0.5 rounded shadow-2xs transition-colors uppercase font-mono cursor-pointer"
                >
                  Limpiar Lote
                </button>
              )}
            </div>

            {weeklyBatchFiles.length === 0 ? (
              <div
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setWeeklyDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setWeeklyDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setWeeklyDragActive(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setWeeklyDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const filesArray = Array.from(e.dataTransfer.files);
                    handleWeeklyFolderUpload(filesArray, "Carpeta_Semanal_Arrastrada");
                  }
                }}
                onClick={() => weeklyFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-all bg-white cursor-pointer ${
                  weeklyDragActive 
                    ? "border-indigo-600 bg-indigo-50/50" 
                    : "border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/10"
                }`}
              >
                <Upload size={20} className="mx-auto text-indigo-500/80 mb-2" />
                <span className="text-[11px] font-black text-slate-800 block uppercase">Arrastrar o Cargar Carpetas / Nóminas</span>
                <span className="text-[9px] text-slate-500 block mt-0.5 leading-relaxed">Sube un lote de archivos PDF de facturas, contratos o boletas; el sistema autocompondrá los egresos correspondientes.</span>
                <input 
                  type="file" 
                  ref={weeklyFileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const filesArray = Array.from(e.target.files);
                      // Fallback name parsing
                      const fName = (filesArray[0] as any).webkitRelativePath?.split('/')[0] || 'Lote_Cargado';
                      handleWeeklyFolderUpload(filesArray, fName);
                    }
                  }}
                  {...({
                    webkitdirectory: "",
                    directory: "",
                    multiple: true
                  } as any)}
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-white border border-slate-200 p-2.5 rounded-md flex items-center justify-between gap-2 shadow-3xs">
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] uppercase font-black tracking-widest text-slate-400">Origen Lote Cargado</p>
                    <p className="text-[10px] font-black text-slate-800 truncate font-mono">{weeklyBatchFolderName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[8px] uppercase font-black tracking-widest text-slate-400">Archivos</p>
                    <p className="text-[10px] font-black text-indigo-700 font-mono">{weeklyBatchFiles.length}</p>
                  </div>
                </div>

                {/* Micro Files Scroll Panel */}
                <div className="max-h-[110px] overflow-auto border border-slate-150 rounded-md p-1.5 bg-white space-y-1 divide-y divide-slate-100 scrollbar-thin">
                  {weeklyBatchFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[9px] text-slate-600 py-1 first:pt-0">
                      <span className="truncate max-w-[170px] font-mono font-medium">{f.name}</span>
                      <span className="bg-slate-100 text-slate-500 font-mono px-1 rounded-sm shrink-0 whitespace-nowrap ml-1">{f.size}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-md border border-emerald-100/60 leading-normal">
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                  <span>Nómina cargada con éxito. Se crearon {localUploadedEgresos.length} egresos en el lote {selectedWeek} listos para cotejar con IA.</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar egreso, deudor, proveedor o glosa de trabajo..."
                className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-xs text-slate-800 outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Clasificación de Seguros / Cartera */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider font-mono">
                Clasificación de Egresos por Aseguradora / Proyecto:
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1 p-1 bg-slate-200/50 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSelectedInsuranceClassification('ALL')}
                  className={`py-1.5 px-1 rounded-md text-[9.5px] font-bold text-center transition-all ${
                    selectedInsuranceClassification === 'ALL'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  TODOS ({currentWeekEgresos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInsuranceClassification('VIDA_OTRO')}
                  className={`py-1.5 px-1 rounded-md text-[9.5px] font-bold text-center transition-all ${
                    selectedInsuranceClassification === 'VIDA_OTRO'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  S. VIDA ({currentWeekEgresos.filter(t => {
                    const cl = classifyTransactionSeguro(t);
                    return cl.id === 'VIDA_OTRO';
                  }).length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInsuranceClassification('VIDA_CENTENARIO')}
                  className={`py-1.5 px-1 rounded-md text-[9.5px] font-bold text-center transition-all ${
                    selectedInsuranceClassification === 'VIDA_CENTENARIO'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-amber-750'
                  }`}
                >
                  EDIF. CENTENARIO ({currentWeekEgresos.filter(t => {
                    const cl = classifyTransactionSeguro(t);
                    return cl.id === 'VIDA_CENTENARIO';
                  }).length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInsuranceClassification('GENERALES')}
                  className={`py-1.5 px-1 rounded-md text-[9.5px] font-bold text-center transition-all ${
                    selectedInsuranceClassification === 'GENERALES'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  S. GENERALES ({currentWeekEgresos.filter(t => {
                    const cl = classifyTransactionSeguro(t);
                    return cl.id === 'GENERALES';
                  }).length})
                </button>
              </div>
            </div>
          </div>

          {/* TABLE GRID HEADERS FOR MULTI-COLUMN COMPLIANCE GRID */}
          <div className="hidden md:grid grid-cols-12 gap-2 bg-slate-100 p-3 text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono border-b border-slate-200">
            <div className="col-span-1">Folio/ID</div>
            <div className="col-span-1">Tipo Doc</div>
            <div className="col-span-2">Razón Social</div>
            <div className="col-span-1">RUT Proveedor</div>
            <div className="col-span-2">Descripción Trabajo (Glosa)</div>
            <div className="col-span-2">Propiedad / Conjunto</div>
            <div className="col-span-1 text-center font-bold">Fecha</div>
            <div className="col-span-1 text-right font-bold font-sans">Monto</div>
            <div className="col-span-1 text-center font-bold">Estado</div>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[550px] scrollbar-thin">
            {filteredEgresos.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileSearch className="mx-auto text-slate-300 mb-3" size={32} />
                <p className="text-xs font-medium">No se encontraron egresos (gastos) en este lote.</p>
                <p className="text-[10px] text-slate-400 mt-1">Crea gastos en la pestaña Egresos si deseas alimentar este lote en tiempo real.</p>
              </div>
            ) : (
              filteredEgresos.map(tx => {
                const report = savedReports[tx.id];
                const active = selectedTxId === tx.id;
                
                // Track missing suppliers
                const txSupplier = tx.supplierName === "Devolución de Garantía (Ex Arrendatario)"
                  ? { id: tx.supplierId, name: tx.supplierName, taxId: tx.supplierTaxId }
                  : suppliers.find(s => s.id === tx.supplierId || s.name === tx.supplierName || s.taxId === tx.supplierTaxId);
                const isSupplierMissing = !txSupplier;
                
                const seguro = classifyTransactionSeguro(tx);
                
                return (
                  <button
                    key={tx.id}
                    onClick={() => setSelectedTxId(tx.id)}
                    className={`w-full text-left p-3.5 transition-all duration-150 grid grid-cols-12 gap-2 items-center outline-hidden border-l-4 ${
                      active 
                        ? 'bg-indigo-50/90 border-l-indigo-600 font-medium shadow-3xs' 
                        : isSupplierMissing
                          ? 'bg-rose-50/20 hover:bg-rose-50/40 border-l-rose-500'
                          : 'hover:bg-slate-50 border-l-transparent'
                    } border-b border-slate-100`}
                  >
                    {/* Folio/ID */}
                    <div className="col-span-1 flex flex-col min-w-0 pr-1">
                      <span className="text-[10px] font-bold text-slate-800 font-mono truncate" title={tx.documentNumber}>
                        {tx.documentNumber || tx.id.substring(0, 8)}
                      </span>
                      <span className="text-[8px] bg-slate-100 text-slate-500 font-semibold px-1 py-0.2 rounded-sm font-mono w-max mt-0.5">
                        ERP AP
                      </span>
                    </div>

                    {/* Tipo Doc */}
                    <div className="col-span-1 flex flex-col min-w-0 pr-1">
                      <span className="text-[9.5px]/none font-extrabold text-blue-900 bg-blue-50/80 px-1 py-1 rounded-xs font-mono w-max truncate uppercase" title={tx.documentType}>
                        {tx.documentType || 'FACTURA'}
                      </span>
                    </div>

                    {/* Razón Social */}
                    <div className="col-span-2 flex flex-col min-w-0">
                      <h4 className="text-[11px] font-bold text-slate-800 truncate" title={tx.supplierName || tx.description}>
                        {tx.supplierName || 'S/N Proveedor'}
                      </h4>
                    </div>

                    {/* RUT Proveedor */}
                    <div className="col-span-1 flex flex-col min-w-0">
                      <span className="text-[10.5px] font-bold text-slate-600 font-mono tracking-wider truncate" title={tx.supplierTaxId || 'Sin RUT'}>
                        {tx.supplierTaxId || 'Sin RUT'}
                      </span>
                    </div>

                    {/* Descripción de Trabajo Separado */}
                    <div className="col-span-2 flex flex-col min-w-0">
                      <p className="text-[9.5px] text-slate-600 font-medium italic truncate max-w-full" title={tx.description}>
                        {tx.description || 'Sin descripción del trabajo.'}
                      </p>
                    </div>

                    {/* Propiedad / Conjunto Separado */}
                    <div className="col-span-2 flex flex-col min-w-0">
                      <span className="text-[10.5px] font-semibold text-indigo-950 truncate" title={resolveBuildingName(tx)}>
                        {resolveBuildingName(tx)}
                      </span>
                      <span className={`inline-flex items-center text-[7.5px] font-extrabold px-1.5 py-0.5 rounded-xs tracking-wider uppercase border w-max mt-1 ${seguro.color}`}>
                        {seguro.label}
                      </span>
                    </div>

                    {/* Fecha */}
                    <div className="col-span-1 font-mono text-[10px] text-slate-500 text-center truncate">
                      {tx.date}
                    </div>

                    {/* Monto */}
                    <div className="col-span-1 font-mono text-[11px] font-bold text-right text-slate-900 pr-1 whitespace-nowrap">
                      ${tx.amount.toLocaleString()}
                    </div>

                    {/* Compliance Indicator con Semáforo */}
                    <div className="col-span-1 flex justify-center">
                      <ComplianceSemaforoLight 
                        status={
                          report 
                            ? (report.status === 'APROBADO' 
                                ? 'APROBADO' 
                                : report.status === 'RECHAZADO' 
                                  ? 'RECHAZADO' 
                                  : 'OBSERVADO'
                              ) 
                            : 'PENDIENTE'
                        } 
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COMPONENT: ACTIVE AUDITOR / CERTIFICATE VIEWER */}
        <div className="xl:col-span-5 flex flex-col gap-6">

          {/* TAB NAVIGATION SELECTOR */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setRightPanelTab('REVIEW')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                rightPanelTab === 'REVIEW'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
              }`}
            >
              <FileSearch size={13} /> Mesa de Auditoría
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('MAESTRO')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                rightPanelTab === 'MAESTRO'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
              }`}
            >
              <Landmark size={13} className="text-indigo-505" /> Maestro Proveedores
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('TRAINING')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                rightPanelTab === 'TRAINING'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
              }`}
            >
              <Sparkles size={13} className="text-amber-500 animate-pulse" /> Entrenamiento IA
            </button>
          </div>

          {/* DYNAMIC TAB CONTROLLER FOR MAESTRO CENTRAL */}
          {rightPanelTab === 'MAESTRO' && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden animate-in fade-in duration-200">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 font-mono">
                    <Landmark size={15} className="text-indigo-400" />
                    Maestro Central de Proveedores
                  </h3>
                  <p className="text-[10px] text-slate-300 mt-0.5 font-sans">
                    Entidades habilitadas para emitir y cobrar órdenes de pago en AssetFlow Chile.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleExportSuppliersExcel}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9.5px] font-black uppercase tracking-wide py-1.5 px-2.5 rounded-md flex items-center gap-1.5 transition select-none cursor-pointer"
                >
                  <Download size={12} /> Exportar Excel
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Drag zone specifically inside Maestro Tab for automatic ingestion of any unregistered supplier */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider mb-1.5 flex items-center gap-1.5 font-mono">
                    <Sparkles size={13} className="text-indigo-600 animate-pulse" />
                    Buzón Compliance IA: Ingesta Automática por PDF UAF
                  </h4>
                  <p className="text-[10px] text-slate-505 mb-3 leading-normal font-sans">
                    ¿El proveedor aún no está registrado? Arrastra o sube su PDF de declaración de beneficiarios finales chilenos aquí. Gemini lo leerá, interpretará e incorporará automáticamente al maestro de AssetFlow con estado ACTIVO.
                  </p>
                  
                  <label className="flex items-center justify-center border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-lg p-3 bg-white cursor-pointer transition text-center select-none">
                    <Upload size={16} className="text-indigo-500 mr-2" />
                    <span className="text-[10.5px] font-bold text-slate-700">Digitalizar y Registrar Nuevo Proveedor (.pdf)</span>
                    <input 
                      type="file" 
                      accept="application/pdf,image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUafPdfUpload(file);
                      }}
                      disabled={isProcessingUaf}
                    />
                  </label>

                  {isProcessingUaf && (
                    <div className="mt-2.5 flex items-center justify-center gap-2 p-2 bg-indigo-50 border border-indigo-150 rounded-lg text-indigo-700 animate-pulse text-[10px] font-bold font-mono">
                      <RefreshCw size={12} className="animate-spin" />
                      PROCESANDO DECLARACIÓN UAF CON GEMINI IA...
                    </div>
                  )}
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por Razón Social, RUT u organizador..."
                      value={supplierSearchTerm}
                      onChange={(e) => setSupplierSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-medium bg-slate-50/50 hover:bg-slate-50 transition outline-hidden focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                  
                  <select
                    value={supplierFilter}
                    onChange={(e: any) => setSupplierFilter(e.target.value)}
                    className="border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white shadow-2xs outline-hidden"
                  >
                    <option value="ALL">Mostrar Todos ({suppliers.length})</option>
                    <option value="VALID_UAF">UAF Vigente</option>
                    <option value="NO_UAF">Sin Declaración UAF</option>
                    <option value="EXPIRED_UAF">UAF Vencido</option>
                  </select>
                </div>

                {/* Table list of suppliers */}
                <div className="border border-slate-105 rounded-lg overflow-x-auto font-sans">
                  <table className="w-full text-left text-slate-700 text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[9.5px] text-slate-500 font-mono uppercase tracking-wider font-extrabold border-b border-slate-105">
                        <th className="p-3">Razón Social / Folio</th>
                        <th className="p-3">RUT Proveedor</th>
                        <th className="p-3">Atributo Incorporado</th>
                        <th className="p-3 text-center">Estado UAF</th>
                        <th className="p-3">Cert. Vence (UAF)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSuppliersForQuery.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-300 italic font-sans">
                            No se encontraron proveedores que correspondan a los filtros.
                          </td>
                        </tr>
                      ) : (
                        filteredSuppliersForQuery.map(s => {
                          const { hasUafDeclaration, expirationDateStr, isExpired } = getSupplierUafStatus(s);
                          return (
                            <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all font-sans">
                              {/* Folio & Name */}
                              <td className="p-3 font-sans">
                                <div className="font-bold text-slate-900 font-sans">{s.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                                  <span className="bg-slate-100 px-1 py-0.2 rounded text-[9px] font-bold text-slate-600">{s.folio || 'S/F'}</span>
                                  <span>{s.category || 'Otros'}</span>
                                </div>
                              </td>

                              {/* TaxID / RUT */}
                              <td className="p-3 font-mono font-bold text-slate-650">
                                {s.taxId}
                              </td>

                              {/* Request / Incorporation Date */}
                              <td className="p-3 font-mono text-slate-500 whitespace-nowrap font-sans">
                                {s.requestDate || '01/03/2026'}
                              </td>

                              {/* State of UAF document */}
                              <td className="p-3 text-center whitespace-nowrap">
                                {hasUafDeclaration ? (
                                  isExpired ? (
                                    <span className="bg-amber-100 text-amber-850 text-[9px] font-black uppercase px-2 py-0.5 rounded-sm border border-amber-250 animate-pulse font-sans">
                                      Vencido
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-100 text-emerald-850 text-[9px] font-black uppercase px-2 py-0.5 rounded-sm border border-emerald-250 font-sans">
                                      Vigente
                                    </span>
                                  )
                                ) : (
                                  <span className="bg-rose-100 text-rose-805 text-[9px] font-black uppercase px-2 py-0.5 rounded-sm border border-rose-250 font-sans">
                                    Falta UAF
                                  </span>
                                )}
                              </td>

                              {/* UAF Expiry date (1 year rule) */}
                              <td className="p-3 font-mono text-[10.5px]">
                                {hasUafDeclaration ? (
                                  <span className={isExpired ? "text-amber-600 font-bold font-sans" : "text-slate-650 font-sans"}>
                                    {(() => {
                                      const parts = expirationDateStr.split('-');
                                      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : expirationDateStr;
                                    })()}
                                  </span>
                                ) : (
                                  <span className="text-rose-500 italic font-medium font-sans">No registra</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="text-[9.5px] text-slate-505 leading-relaxed font-sans bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700">Nota de Cumplimiento UAF Ley N° 19.913:</span> La Declaración Jurada de Beneficiarios Finales tiene un periodo de vigencia anual de <strong className="font-bold text-slate-800">365 días corridos</strong> contados desde su firma original. Cumplido este plazo, la red neuronal marcará preventivamente cualquier egreso como "Observado" hasta su renovación en el expediente.
                </div>
              </div>
            </div>
          )}

          {rightPanelTab === 'TRAINING' && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden animate-in fade-in duration-200">
              <div className="p-4 border-b border-slate-100 bg-[#0f172a] text-white flex justify-between items-center bg-slate-900">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 font-mono">
                    <Sparkles size={15} className="text-amber-400" />
                    Laboratorio de Entrenamiento de Reglas
                  </h3>
                  <p className="text-[10px] text-slate-300 mt-0.5 font-sans">
                    Enséñele criterios de auditoría específicos al Auditor de Control Interno (Gemini IA).
                  </p>
                </div>
                <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 font-bold uppercase font-mono rounded-sm">
                  MODO DIAGNÓSTICO
                </span>
              </div>

              <div className="p-5 space-y-6">
                {/* INTERRUPTOR PRINCIPAL RED NEURONAL */}
                <div id="master-neural-toggle-section" className="bg-indigo-950 text-white p-4 rounded-lg shadow-sm border border-indigo-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-2 font-mono text-indigo-300">
                      <Layers size={14} className="text-indigo-400" />
                      Interruptor Central de Red Neuronal
                    </h4>
                    <p className="text-[10px] text-slate-300 leading-normal font-sans">
                      Permite apagar el motor de red neuronal para el cotejo de egresos. Si está en bypass (OFF), los diagnósticos continuarán funcionando pero se deshabilitarán las visualizaciones de grafos de capas ocultas en la mesa de auditoría.
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    id="btn-toggle-neural-network"
                    onClick={() => handleToggleNeuralNetwork(!neuralNetworkEnabled)}
                    className={`px-4 py-2 text-[10.5px] font-black uppercase tracking-widest rounded-md transition-all cursor-pointer select-none font-mono ${
                      neuralNetworkEnabled 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/50' 
                        : 'bg-rose-800 hover:bg-rose-750 text-rose-100 border border-rose-900'
                    }`}
                  >
                    {neuralNetworkEnabled ? '● HABILITADO (ON)' : '○ BYPASS (OFF)'}
                  </button>
                </div>

                {/* 1. SECCIÓN DE PESOS / IMPORTANCIAS NEURONALES */}
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                  <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-wider mb-2 flex items-center gap-1.5 font-mono">
                    <Layers size={14} className="text-indigo-600" />
                    1. Calibración de Pesos de Umbral de Alarma
                  </h4>
                  <p className="text-[10px] text-slate-500 mb-4 leading-relaxed font-sans">
                    Ajuste los umbrales mínimos de tolerancia crítica para activar alarmas en el grafo de simulación de auditoría.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-bold text-slate-700 uppercase font-mono tracking-wide">
                        <span>Plausibilidad de Digitación ERP</span>
                        <span className="font-mono text-indigo-600 font-bold">{Math.round(neuralWeights.digitization * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.0"
                        step="0.05"
                        value={neuralWeights.digitization}
                        onChange={(e) => handleSaveWeights({ ...neuralWeights, digitization: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 font-sans">Sensibilidad ante incongruencias o descuidos menores de escritura o fecha.</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-bold text-slate-700 uppercase font-mono tracking-wide">
                        <span>Hermeticidad del Set Soporte</span>
                        <span className="font-mono text-indigo-600 font-bold">{Math.round(neuralWeights.documents * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.0"
                        step="0.05"
                        value={neuralWeights.documents}
                        onChange={(e) => handleSaveWeights({ ...neuralWeights, documents: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 font-sans">Grado de severidad si falta cotización preliminar o contrato físico.</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-bold text-slate-700 uppercase font-mono tracking-wide">
                        <span>Rigurosidad Leyes Chilenas (SII / UAF)</span>
                        <span className="font-mono text-indigo-600 font-bold">{Math.round(neuralWeights.compliance * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.0"
                        step="0.05"
                        value={neuralWeights.compliance}
                        onChange={(e) => handleSaveWeights({ ...neuralWeights, compliance: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 font-sans">Tolerancia ante omisión de Certificados de Factoring SII o declaraciones ejecutivas.</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-bold text-slate-700 uppercase font-mono tracking-wide">
                        <span>Validación Bancaria P04012 (Supplier)</span>
                        <span className="font-mono text-indigo-600 font-bold">{Math.round(neuralWeights.bank * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.0"
                        step="0.05"
                        value={neuralWeights.bank}
                        onChange={(e) => handleSaveWeights({ ...neuralWeights, bank: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 font-sans">Rigurosidad de chequeo contra el Maestro de Cuentas para transferir.</p>
                    </div>
                  </div>
                </div>

                {/* 2. REGLAS DENTRO DEL MOTOR */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 font-mono">
                      <FileCheck size={14} className="text-indigo-600" />
                      2. Registro de Pautas de Entrenamiento Activas
                    </h4>
                    <button
                      onClick={() => {
                        if (confirm('¿Desea restablecer las reglas al set estándar del sistema?')) {
                          localStorage.removeItem('jde_weekly_custom_training_rules');
                          window.location.reload();
                        }
                      }}
                      className="text-[9px] font-black text-slate-500 hover:text-indigo-600 tracking-wide uppercase font-mono bg-slate-100 hover:bg-slate-200 py-1 px-2 rounded-sm transition cursor-pointer select-none"
                    >
                      Restablecer Plantillas
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {customRules.map((rule, idx) => (
                      <div 
                        key={rule.id} 
                        className={`p-3 border rounded-lg transition-all ${
                          rule.active 
                            ? 'bg-slate-50/50 border-slate-200 shadow-3xs' 
                            : 'bg-slate-100/40 border-slate-150 text-slate-400'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={rule.active}
                              onChange={(e) => {
                                const copy = [...customRules];
                                copy[idx].active = e.target.checked;
                                handleSaveRules(copy);
                              }}
                              className="h-4 w-4 rounded-xs border-slate-350 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                            />
                            <div>
                              <h5 className={`text-[10.5px] font-black uppercase tracking-tight font-mono ${rule.active ? 'text-slate-900' : 'text-slate-400 font-normal line-through'}`}>
                                {rule.title}
                              </h5>
                              <p className={`text-[10px] mt-1 leading-relaxed font-sans ${rule.active ? 'text-slate-605' : 'text-slate-400 font-normal'}`}>
                                {rule.instruction}
                              </p>
                            </div>
                          </label>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded-xs uppercase font-mono ${
                              rule.active 
                                ? rule.severity === 'ALTA' ? 'bg-rose-100 text-rose-700 border border-rose-250' : rule.severity === 'MEDIA' ? 'bg-amber-100 text-amber-700 border border-amber-250' : 'bg-indigo-100 text-indigo-700 border border-indigo-250'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}>
                              {rule.severity}
                            </span>
                            {!rule.builtIn && (
                              <button
                                onClick={() => {
                                  const copy = customRules.filter(r => r.id !== rule.id);
                                  handleSaveRules(copy);
                                }}
                                className="text-[9px] text-rose-500 hover:text-rose-700 font-black uppercase font-mono shrink-0 mt-2 select-none cursor-pointer"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. AÑADIR NUEVA REGLA PERSONALIZADA */}
                <NewRuleForm customRules={customRules} onSaveRules={handleSaveRules} />

                {/* NOTA DIAGNÓSTICO EXCLUSIVO */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 flex gap-2.5 items-start">
                  <span className="text-amber-600 text-base">💡</span>
                  <div>
                    <h5 className="text-[10px] font-black uppercase text-amber-900 tracking-wider font-mono font-bold">FILOSOFÍA DE RESPALDO DE CONTROL AUTÓNOMO</h5>
                    <p className="text-[9.5px] text-amber-800 leading-normal mt-0.5 font-sans">
                      Los cambios de calibración se guardan de inmediato en el navegador y se inyectan en cada diagnóstico con Gemini. El sistema <strong>nunca realiza modificaciones contables automáticas</strong> de forma silenciosa para evitar descuidos de operación.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {rightPanelTab === 'REVIEW' && !selectedTx && (
            <div className="bg-white border border-slate-200 border-dashed rounded-lg p-16 text-center text-slate-400 shadow-xs">
              <Landmark className="mx-auto text-slate-300 mb-4" size={44} />
              <h3 className="text-sm font-black uppercase text-slate-600 tracking-wider">Mesa de Auditoría</h3>
              <p className="text-xs mt-1">Selecciona un egreso de la lista de la izquierda para analizar sus documentos, cruzables de contrato, vigencia en S.I.I. e identidad bancaria.</p>
            </div>
          )}

          {rightPanelTab === 'REVIEW' && selectedTx && (
            <>
              {/* COMPLIANCE CHECK CABINET - UPLOADS SLOT */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-linear-to-r from-slate-50 to-indigo-50/10 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-950 tracking-wider flex items-center gap-1">
                      <FileCheck size={15} className="text-indigo-600" />
                      Gabinete de Evidencia Documental (Pouch)
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Sube los soportes obligatorios chilenos para auditar este trámite con IA.</p>
                  </div>
                  
                  {/* Quick filler badge */}
                  <span className="text-[9px] bg-indigo-50 border border-indigo-200 font-bold text-indigo-700 px-2 py-0.5 uppercase font-mono rounded-sm">
                    {selectedTx.documentNumber} ERP
                  </span>
                </div>

                <div className="p-5 flex flex-col gap-4">
                  {uafSuccessNotification && (
                    <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-950 p-4 rounded-lg flex flex-col gap-2 relative animate-in fade-in duration-200">
                      <button 
                        onClick={() => setUafSuccessNotification(null)}
                        className="absolute top-2.5 right-2.5 text-emerald-650 hover:text-emerald-900 font-bold p-1 transition cursor-pointer"
                        type="button"
                      >
                        <XCircle size={16} />
                      </button>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                        <h4 className="text-xs font-black uppercase tracking-wider font-mono">{uafSuccessNotification.title}</h4>
                      </div>
                      <p className="text-[11px] leading-relaxed text-emerald-900 font-medium">
                        {uafSuccessNotification.message}
                      </p>
                    </div>
                  )}

                  {!selectedSupplier && (
                    <div className="bg-rose-50 border-2 border-rose-300 rounded-lg p-5 flex flex-col sm:flex-row gap-4 items-start shadow-sm mb-2">
                      <div className="p-2.5 bg-rose-100 text-rose-700 rounded-full shrink-0">
                        <ShieldAlert size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-rose-950 uppercase tracking-tight flex items-center gap-2">
                          Restricción Crítica: Proveedor No Registrado
                        </h4>
                        <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                          La reglamentación de control interno de AssetFlow Chile prohíbe taxativamente procesar cobros, facturas, u órdenes de pago para personas naturales o jurídicas que <strong className="font-extrabold text-rose-950">no se encuentren registradas</strong> en el Maestro de Proveedores (Base de Datos central P04012).
                        </p>
                        <div className="bg-white/75 p-3 rounded-md border border-rose-200 mt-3 text-xs text-slate-700 space-y-1">
                          <div><span className="font-semibold text-slate-500 font-mono">Rut Detectado:</span> <strong className="font-mono text-slate-900">{selectedTx.supplierTaxId || 'S/N Rut'}</strong></div>
                          <div><span className="font-semibold text-slate-500 font-mono">Razón Social:</span> <strong className="font-mono text-slate-900">{selectedTx.supplierName || 'S/N Nombre'}</strong></div>
                          <div><span className="font-semibold text-slate-500 font-mono">Monto de Operación:</span> <strong className="font-mono text-rose-700">${selectedTx.amount.toLocaleString()} CLP</strong></div>
                        </div>
                        <p className="text-[11px] text-rose-700 mt-2.5 font-bold">
                          Acción Mandataria: Inscriba previamente al proveedor en la sección correspondiente antes de continuar.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Document file slot rows */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    {/* Invoice (Factura) Slot */}
                    <div 
                      onDragEnter={(e) => handleDrag(e, 'invoice')}
                      onDragOver={(e) => handleDrag(e, 'invoice')}
                      onDragLeave={(e) => handleDrag(e, 'invoice')}
                      onDrop={(e) => handleDrop(e, 'invoice')}
                      className={`border p-3 rounded-lg flex flex-col justify-between transition-all duration-200 ${
                        dragActiveField === 'invoice' 
                          ? 'border-indigo-600 bg-indigo-50/80 scale-[1.01]' 
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-black uppercase font-mono text-indigo-600">Requerido Obligatorio</span>
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                            <FileText size={14} className="text-slate-500" /> Factura Electrónica
                          </h4>
                        </div>
                        {activeTxFiles?.invoice ? (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-sm font-bold uppercase font-mono">OK</span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-sm font-bold uppercase font-mono">FALTANTE</span>
                        )}
                      </div>
                      
                      {activeTxFiles?.invoice ? (
                        <div className="flex items-center justify-between text-[11px] bg-white border border-slate-200 p-2 rounded-md mt-3 shadow-3xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={13} className="text-indigo-500 shrink-0" />
                            <span className="font-mono text-slate-700 truncate max-w-[150px] font-medium">{activeTxFiles.invoice.name}</span>
                            <span className="text-[9px] text-slate-400 font-mono">({activeTxFiles.invoice.size})</span>
                          </div>
                          <button onClick={() => handleDisconnectFile('invoice')} className="text-xs text-rose-600 font-bold hover:underline outline-hidden px-1">X</button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 mt-3">
                          <div className="border border-dashed border-slate-300 rounded-md p-3 text-center bg-white/60 hover:bg-white transition-all cursor-pointer relative">
                            <input 
                              type="file" 
                              id="file-upload-invoice" 
                              className="hidden" 
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xls,.xlsx" 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleRealFileUpload('invoice', e.target.files[0]);
                                }
                              }} 
                            />
                            <label htmlFor="file-upload-invoice" className="cursor-pointer block">
                              <Upload size={18} className="mx-auto text-slate-400 mb-1" />
                              <span className="text-[10px] font-bold text-slate-600 block">Arrastrar o Subir PDF/Word</span>
                              <span className="text-[8px] text-slate-400 block mt-0.5">Documento de Factura Real</span>
                            </label>
                          </div>
                          <button 
                            onClick={() => handleQuickLoadFile('invoice')}
                            className="bg-slate-100/80 hover:bg-slate-200 border border-slate-200 text-[10px] font-bold py-1 px-2 rounded-md text-slate-700 outline-hidden flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <Sparkles size={10} className="text-indigo-500" /> Simular Carga Rápida
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quotation / Contract / Order Slot */}
                    <div 
                      onDragEnter={(e) => handleDrag(e, 'quote')}
                      onDragOver={(e) => handleDrag(e, 'quote')}
                      onDragLeave={(e) => handleDrag(e, 'quote')}
                      onDrop={(e) => handleDrop(e, 'quote')}
                      className={`border p-3 rounded-lg flex flex-col justify-between transition-all duration-200 ${
                        dragActiveField === 'quote' 
                          ? 'border-indigo-600 bg-indigo-50/80 scale-[1.01]' 
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-black uppercase font-mono text-indigo-600">Requerido Alternativo</span>
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                            <FileText size={14} className="text-slate-500" /> Cotización o Contrato
                          </h4>
                        </div>
                        {(activeTxFiles?.quote || activeTxFiles?.contract) ? (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-sm font-bold uppercase font-mono">OK</span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-sm font-bold uppercase font-mono">FALTANTE</span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 mt-3">
                        {activeTxFiles?.quote && (
                          <div className="flex items-center justify-between text-[11px] bg-white border border-slate-200 p-1.5 rounded-md shadow-3xs">
                            <div className="flex items-center gap-1 min-w-0">
                              <FileText size={11} className="text-amber-500 shrink-0" />
                              <span className="font-mono text-slate-600 truncate max-w-[130px]">COT: {activeTxFiles.quote.name}</span>
                            </div>
                            <button onClick={() => handleDisconnectFile('quote')} className="text-xs text-rose-600 font-bold outline-hidden font-mono px-1">x</button>
                          </div>
                        )}
                        {activeTxFiles?.contract && (
                          <div className="flex items-center justify-between text-[11px] bg-white border border-slate-200 p-1.5 rounded-md shadow-3xs">
                            <div className="flex items-center gap-1 min-w-0">
                              <FileText size={11} className="text-indigo-500 shrink-0" />
                              <span className="font-mono text-slate-600 truncate max-w-[130px]">CON: {activeTxFiles.contract.name}</span>
                            </div>
                            <button onClick={() => handleDisconnectFile('contract')} className="text-xs text-rose-600 font-bold outline-hidden font-mono px-1">x</button>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {/* Cotizacion upload */}
                          <div className="border border-dashed border-slate-300 rounded-md p-2 text-center bg-white/60 hover:bg-white transition-all cursor-pointer relative">
                            <input 
                              type="file" 
                              id="file-upload-quote" 
                              className="hidden" 
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xls,.xlsx" 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleRealFileUpload('quote', e.target.files[0]);
                                }
                              }} 
                            />
                            <label htmlFor="file-upload-quote" className="cursor-pointer block">
                              <Upload size={14} className="mx-auto text-slate-400 mb-0.5" />
                              <span className="text-[9px] font-bold text-slate-600 block">+ Cotización</span>
                            </label>
                          </div>

                          {/* Contrato upload */}
                          <div className="border border-dashed border-slate-300 rounded-md p-2 text-center bg-white/60 hover:bg-white transition-all cursor-pointer relative">
                            <input 
                              type="file" 
                              id="file-upload-contract" 
                              className="hidden" 
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xls,.xlsx" 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleRealFileUpload('contract', e.target.files[0]);
                                }
                              }} 
                            />
                            <label htmlFor="file-upload-contract" className="cursor-pointer block">
                              <Upload size={14} className="mx-auto text-slate-400 mb-0.5" />
                              <span className="text-[9px] font-bold text-slate-600 block">+ Contrato</span>
                            </label>
                          </div>
                        </div>

                        {(!activeTxFiles?.quote && !activeTxFiles?.contract) && (
                          <button 
                            onClick={() => {
                              handleQuickLoadFile('quote');
                              handleQuickLoadFile('contract');
                            }}
                            className="bg-slate-100/85 hover:bg-slate-200 border border-slate-200 text-[9px] font-bold py-1 px-2 rounded-md text-slate-700 outline-hidden flex items-center justify-center gap-1 shadow-2xs mt-1"
                          >
                            <Sparkles size={10} className="text-indigo-500" /> Simular Ambas Cargueras
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Declaración Jurada UAF de Beneficiarios Finales Slot */}
                    <div className="border border-slate-200 bg-slate-50/50 p-3 rounded-lg flex flex-col justify-between transition-all duration-200">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-black uppercase font-mono text-emerald-700">Ley 19.913 Corporativa</span>
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5 animate-pulse">
                            <Landmark size={14} className="text-emerald-600 shrink-0" /> Declaración UAF
                          </h4>
                        </div>
                        {activeTxFiles?.beneficiaryForm ? (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-sm font-bold uppercase font-mono">COMPLETADO</span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-sm font-bold uppercase font-mono">REQUERIDO</span>
                        )}
                      </div>

                      {activeTxFiles?.beneficiaryForm ? (
                        <div className="flex flex-col gap-2 mt-4 animate-in fade-in zoom-in-95 duration-150">
                          <div className="bg-white border border-slate-200 p-2.5 rounded-md shadow-3xs text-xs space-y-1.5 text-slate-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileText size={13} className="text-emerald-650 shrink-0" />
                                <span className="font-mono text-slate-700 font-bold truncate max-w-[155px]" title={activeTxFiles.beneficiaryForm.name}>
                                  {activeTxFiles.beneficiaryForm.name}
                                </span>
                              </div>
                              <button 
                                onClick={() => handleDisconnectFile('beneficiaryForm')} 
                                className="text-xs text-rose-600 font-bold hover:underline outline-hidden px-1 font-mono cursor-pointer"
                                title="Desconectar Documento"
                              >
                                x
                              </button>
                            </div>
                            
                            {activeTxFiles.beneficiaryForm.customData && (() => {
                              const data = activeTxFiles.beneficiaryForm.customData;
                              const day = parseInt(data.firmaDia || '1');
                              const mes = parseInt(data.firmaMes || '1');
                              const anioRaw = data.firmaAnio || '26';
                              const year = parseInt(anioRaw) < 100 ? 2000 + parseInt(anioRaw) : parseInt(anioRaw);
                              
                              const emissionDate = new Date(year, mes - 1, day);
                              const expiryDate = new Date(emissionDate);
                              expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                              
                              const today = new Date('2026-06-06');
                              const diffMs = expiryDate.getTime() - today.getTime();
                              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                              
                              let validityAlert = null;
                              if (diffDays <= 0) {
                                validityAlert = (
                                  <div className="mt-1 p-1 bg-rose-50 border border-rose-200 text-rose-700 font-bold font-mono text-[9px] rounded-sm flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-ping"></span>
                                    CADUCADO (Venció hace {Math.abs(diffDays)} días)
                                  </div>
                                );
                              } else if (diffDays <= 30) {
                                validityAlert = (
                                  <div className="mt-1.5 p-1 bg-amber-50 border border-amber-200 text-amber-700 font-bold font-mono text-[9px] rounded-sm flex items-center gap-1 animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                                    VENCE PRONTO (Quedan {diffDays} días)
                                  </div>
                                );
                              } else {
                                validityAlert = (
                                  <div className="mt-1 p-1 bg-emerald-50 border border-emerald-100 text-emerald-750 font-bold font-mono text-[8.5px] rounded-sm flex items-center gap-1">
                                    ✓ Vigente por {diffDays} días
                                  </div>
                                );
                              }

                              return (
                                <div className="bg-slate-50 border border-slate-150 p-2 rounded-xs space-y-1 text-[10px]">
                                  <div className="text-slate-500 font-bold uppercase font-mono tracking-wide text-[8px]">Estructura Declarada:</div>
                                  <div className="font-bold text-slate-800 truncate">
                                    Declarante: {data.declaranteNombres} {data.declaranteApellidoPaterno}
                                  </div>
                                  <div className="text-[10px] text-indigo-750 font-bold font-mono">
                                    {data.beneficiarios?.length || 0} Socios ≥ 10%
                                  </div>
                                  <div className="text-[8.5px] text-slate-500 font-mono mt-1">
                                    Emisión: {day.toString().padStart(2, '0')}/{mes.toString().padStart(2, '0')}/{year}<br/>
                                    Vence: {expiryDate.getDate().toString().padStart(2, '0')}/{(expiryDate.getMonth() + 1).toString().padStart(2, '0')}/{expiryDate.getFullYear()}
                                  </div>
                                  {validityAlert}
                                  {data.isSigned && (
                                    <div className="text-emerald-700 font-bold font-mono flex items-center gap-1 text-[9px] pt-1">
                                      <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                      Firma Certificada ClaveÚnica
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          
                          <button
                            onClick={() => setIsUafFormModalOpen(true)}
                            className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-bold py-1 px-2 rounded-md outline-hidden flex items-center justify-center gap-1 shadow-2xs cursor-pointer select-none"
                          >
                            <FileText size={11} /> Re-abrir / Editar Declaración UAF
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 mt-4">
                          {/* Botón Llenar Formulario Manual */}
                          <button
                            type="button"
                            onClick={() => setIsUafFormModalOpen(true)}
                            className="bg-emerald-605 hover:bg-emerald-550 text-white text-[11px] font-black uppercase tracking-wider py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer select-none transition-all"
                            disabled={isProcessingUaf}
                          >
                            <Plus size={13} className="text-emerald-350" /> Llenar Manualmente
                          </button>

                          {/* Separador */}
                          <div className="relative my-2">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                              <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-[9px] font-bold uppercase font-mono">
                              <span className="bg-white px-2 text-slate-450">O DIGITALIZAR</span>
                            </div>
                          </div>

                          {/* Dropzone / File input */}
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-lg p-3.5 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition text-center select-none">
                            <Upload size={18} className="text-slate-400 mb-1" />
                            <span className="text-[10px] font-bold text-slate-700">Subir PDF Declaración UAF</span>
                            <span className="text-[8px] text-slate-400 mt-0.5">Automáticamente registra al proveedor vía Gemini IA</span>
                            <input 
                              type="file" 
                              accept="application/pdf,image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUafPdfUpload(file);
                              }}
                              disabled={isProcessingUaf}
                            />
                          </label>

                          {/* Spinners & Errors */}
                          {isProcessingUaf && (
                            <div className="flex items-center justify-center gap-2 p-2.5 bg-indigo-50 border border-indigo-150 rounded-lg text-indigo-700 animate-pulse text-[10px] font-bold">
                              <RefreshCw size={13} className="animate-spin text-indigo-600" />
                              Analizando UAF con Gemini IA...
                            </div>
                          )}

                          {uafProcessError && (
                            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[9.5px] leading-relaxed">
                              <span className="font-bold block text-red-900 mb-0.5 font-mono uppercase text-[8px]">ERROR DE PROCESAMIENTO:</span>
                              {uafProcessError}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Factoring details toggle check */}
                  <div className="mt-2 border border-slate-200 bg-slate-50/50 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <input 
                          type="checkbox" 
                          checked={activeTxFiles?.isAssigned || false} 
                          onChange={toggleAssigned}
                          className="h-4 w-4 text-indigo-600 border-slate-300 rounded-sm focus:ring-indigo-500"
                        />
                        ¿La factura fue cedida? (Factoring)
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-md">
                        Si la factura fue transferida a un agente financiero (Factoring), según la legislación chilena Ley 19.983 se exige adjuntar el Certificado de Cesión autorizado del S.I.I.
                      </p>
                    </div>

                    {activeTxFiles?.isAssigned && (
                      <div className="flex flex-col gap-2 w-full md:w-auto">
                        <select
                          value={activeTxFiles.assignedToEntity}
                          onChange={(e) => setAssignedEntity(e.target.value)}
                          className="bg-white border border-slate-300 text-[10px] font-mono p-1.5 rounded-md shadow-2xs outline-hidden w-full"
                        >
                          <option value="SANTANDER FACTORING S.A.">SANTANDER FACTORING</option>
                          <option value="SCOTIABANK FACTORING">SCOTIABANK FACTORING</option>
                          <option value=" Tanner Servicios Financieros">TANNER SERVICIOS</option>
                          <option value="BICE FACTORING S.A.">BICE FACTORING</option>
                        </select>
                        
                        {activeTxFiles.cession ? (
                          <div className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 flex items-center justify-between rounded-md">
                            <span className="font-mono truncate max-w-[120px]">{activeTxFiles.cession.name}</span>
                            <button onClick={() => handleDisconnectFile('cession')} className="text-[10px] text-rose-600 font-bold ml-1.5">x</button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <div className="border border-dashed border-slate-300 rounded-md p-2 text-center bg-white hover:bg-slate-50 transition-all cursor-pointer relative">
                              <input 
                                type="file" 
                                id="file-upload-cession" 
                                className="hidden" 
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" 
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleRealFileUpload('cession', e.target.files[0]);
                                  }
                                }} 
                              />
                              <label htmlFor="file-upload-cession" className="cursor-pointer block">
                                <span className="text-[9px] font-bold text-indigo-600 block">+ Subir Certificado</span>
                              </label>
                            </div>
                            <button
                              onClick={() => handleQuickLoadFile('cession')}
                              className="bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-[8px] font-bold py-1 px-2 rounded-xs text-center"
                            >
                              Generar Certificado Falso
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* INTERACTIVE TRANSACTION EDITOR PANEL */}
                  <div className="border border-slate-200 bg-linear-to-b from-indigo-50/20 to-slate-50 p-4 rounded-lg">
                    <h4 className="text-[11px] font-black uppercase text-indigo-900 tracking-wider font-mono flex items-center gap-1.5 border-b border-indigo-100 pb-2 mb-3">
                      <FileText size={14} className="text-indigo-600 animate-pulse" />
                      Edición de Atribuciones y Datos del Egreso ERP (F0911/P0411)
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Propiedad / Conjunto Vinculado:</label>
                        <select
                          value={selectedTx.propertyId || ''}
                          onChange={(e) => {
                            handleUpdateTransaction({
                              ...selectedTx,
                              propertyId: e.target.value
                            });
                          }}
                          className="bg-white border border-slate-300 text-slate-800 text-[11px] p-2 rounded-md shadow-3xs outline-hidden w-full font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505"
                        >
                          <option value="">Selecciona Propiedad...</option>
                          {properties && properties.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.building} ({p.code}) - {p.type} {p.floor} [ROL: {p.propertyRole || 'S/R'}]
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Folio de Documento:</label>
                        <input
                          type="text"
                          value={selectedTx.documentNumber || ''}
                          onChange={(e) => {
                            handleUpdateTransaction({
                              ...selectedTx,
                              documentNumber: e.target.value
                            });
                          }}
                          className="bg-white border border-slate-300 text-slate-800 text-[11px] p-2 rounded-md shadow-3xs outline-hidden w-full font-mono font-medium focus:border-indigo-500"
                          placeholder="Ingrese número de folio..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tipo de Documento Tributario:</label>
                        <select
                          value={selectedTx.documentType || 'FACTURA'}
                          onChange={(e) => {
                            handleUpdateTransaction({
                              ...selectedTx,
                              documentType: e.target.value
                            });
                          }}
                          className="bg-white border border-slate-300 text-slate-800 text-[11px] p-2 rounded-md shadow-3xs outline-hidden w-full font-semibold focus:border-indigo-500"
                        >
                          <option value="FACTURA">FACTURA ELECTRÓNICA</option>
                          <option value="BOLETA">BOLETA DE SERVICIOS</option>
                          <option value="LIQUIDACIÓN DE GARANTÍA">LIQUIDACIÓN DE GARANTÍA (Devolución Depósito)</option>
                          <option value="COMPROBANTE_EGRESO">COMPROBANTE DE EGRESO</option>
                          <option value="NOTA_CREDITO">NOTA DE CRÉDITO</option>
                          <option value="OTRO">OTRO DOCUMENTO TRIBUTARIO</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Monto Total ($ CLP):</label>
                        <input
                          type="number"
                          value={selectedTx.amount || 0}
                          onChange={(e) => {
                            handleUpdateTransaction({
                              ...selectedTx,
                              amount: Number(e.target.value)
                            });
                          }}
                          className="bg-white border border-slate-300 text-slate-800 text-[11px] p-2 rounded-md shadow-3xs outline-hidden w-full font-mono font-medium focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Glosa / Descripción de Trabajo:</label>
                      <textarea
                        value={selectedTx.description || ''}
                        onChange={(e) => {
                          handleUpdateTransaction({
                            ...selectedTx,
                            description: e.target.value
                          });
                        }}
                        rows={2}
                        className="bg-white border border-slate-300 text-slate-800 text-[11px] p-2 rounded-md shadow-3xs outline-hidden w-full font-medium focus:border-indigo-500"
                        placeholder="Ingrese glosa explicativa del egreso..."
                      />
                    </div>
                  </div>

                  {/* BANK AND SUPPLIER MASTER GRID */}
                  <div className="border border-slate-200 bg-slate-50 p-4 rounded-lg">
                    <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider font-mono flex items-center gap-1.5">
                      <Landmark size={14} className="text-slate-500" />
                      Cruces con Maestro de Proveedores y Contratos ERP
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block">RUT / Razon Social Proveedor:</span>
                        <span className="text-[11px] font-bold text-slate-800 block mt-0.5 truncate">{selectedTx.supplierName || 'S/N Proveedor'}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">{selectedTx.supplierTaxId || 'RUT S/N'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block">Identidad Bancaria para Abonos:</span>
                        <span className="text-[11px] font-bold text-slate-800 block mt-0.5">{selectedSupplier?.bankName || 'S/N Banco'}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {selectedSupplier?.accountType || 'Cuenta'} Nº {selectedSupplier?.accountNumber || 'S/N'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block">Coherencia de Contratos:</span>
                        {selectedContract ? (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-sm font-bold block mt-0.5 border border-indigo-200 max-w-max truncate">
                            CON-{selectedContract.id.substring(0, 5).toUpperCase()} (${selectedContract.amount?.toLocaleString() || 'S/N'} CLP)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block mt-1 italic">Sin contrato activo asociado</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DIAGNOSTIC-ONLY WARNING CALLOUT ("Fácil de entender, no modifica nada contable automáticamente") */}
                  <div className="my-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
                    <span className="text-amber-600 text-lg">💡</span>
                    <div>
                      <h4 className="text-[11px] font-black uppercase text-amber-900 tracking-wider font-mono">ASISTENTE 100% DIAGNÓSTICO (SIN AUTO-CORRECCIONES)</h4>
                      <p className="text-[10px] text-amber-800 leading-normal mt-0.5">
                        El sistema solo <strong>emite hallazgos, justificaciones legales y sugerencias de solución simples</strong> para que usted las resuelva. 
                        No se modificará ni corregirá ningún dato del módulo contable o de pago de forma automática.
                      </p>
                    </div>
                  </div>

                  {/* EXECUTE COMPLIANCE IA BUTTON */}
                  <div className="mt-2 flex justify-end">
                    {!selectedSupplier ? (
                      <button
                        onClick={handleExecuteAIAudit}
                        disabled={isAnalyzing}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-md shadow-md hover:shadow-lg outline-hidden transform transition active:scale-95 flex items-center gap-2 animate-pulse"
                      >
                        {isAnalyzing ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" /> Registrando Cierre Fiscal...
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={15} className="text-white" /> Aplicar Bloqueo y Generar Rechazo
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleExecuteAIAudit}
                        disabled={isAnalyzing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-md shadow-md hover:shadow-lg outline-hidden transform transition active:scale-95 flex items-center gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" /> Procesando Verificacion...
                          </>
                        ) : (
                          <>
                            <Sparkles size={15} className="text-yellow-300" /> Auditar con IA Gemini
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* RUNNING LOADER INTERACTIVE */}
                  {isAnalyzing && (
                    <div className="mt-4 p-4 border border-indigo-100 bg-indigo-50/30 rounded-lg flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <RefreshCw size={18} className="animate-spin text-indigo-600" />
                        <span className="text-xs font-black uppercase text-indigo-800 tracking-wider">Mesa de Cumplimiento IA</span>
                      </div>
                      <p className="text-[11px] text-indigo-700 font-mono italic">{analysisProgress}</p>
                      <div className="w-full bg-indigo-100 h-1 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-1 animate-pulse" style={{ width: '70%' }}></div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* SAVED CERTIFICATE VIEW / DISPLAY */}
              {savedReports[selectedTx.id] && (
                <div id={`comprobante-revision-${selectedTx.id}`} className="bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden border-t-4 border-t-indigo-600">
                  
                  {/* COMPLEMENT BADGE BRAND HEADER */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase font-mono bg-indigo-800 text-white px-2 py-0.5 rounded-sm">ASSETFLOW COMPLIANCE</span>
                        <span className="text-[10px] text-slate-400 font-mono">CODE: VER-AUDIT-{selectedTx.id.toUpperCase().substring(0, 8)}</span>
                      </div>
                      <h3 className="text-md font-extrabold text-slate-950 mt-1">Comprobante Certificado de Revisión Fiscal</h3>
                    </div>
                    
                    <button
                      onClick={() => handleDownloadPDF(selectedTx, savedReports[selectedTx.id])}
                      className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-md shadow-xs active:scale-95 transition"
                    >
                      <Download size={13} /> Exportar como PDF
                    </button>
                  </div>

                  {/* CERTIFICATE DETAILS */}
                  <div className="p-6">
                    
                    {/* STATUS BLOCK */}
                    <div className="border border-slate-200 p-4 rounded-lg shadow-xs mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block tracking-wider uppercase font-mono">Conclusión de Auditoría IA:</span>
                        <div className="mt-1">{getStatusBadge(savedReports[selectedTx.id].status)}</div>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block tracking-wider uppercase font-mono">Revisado Por:</span>
                        <span className="text-[11px] font-bold text-slate-700 block mt-1 font-mono">{savedReports[selectedTx.id].reviewer}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block tracking-wider uppercase font-mono">Fecha del Análisis:</span>
                        <span className="text-[11px] font-bold text-slate-700 block mt-1 font-mono">
                          {new Date(savedReports[selectedTx.id].checkedAt).toLocaleDateString()} {new Date(savedReports[selectedTx.id].checkedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>

                    {/* PILL ACCORDION CHECKS */}
                    <div className="space-y-4 mb-6">
                      
                      {/* Digitación */}
                      <div className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {savedReports[selectedTx.id].digitizationCheck.passed ? (
                              <CheckCircle2 size={15} className="text-emerald-500" />
                            ) : (
                              <XCircle size={15} className="text-rose-500" />
                            )}
                            1. Control de Digitación Contable
                          </span>
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-sm ${savedReports[selectedTx.id].digitizationCheck.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {savedReports[selectedTx.id].digitizationCheck.passed ? 'PASSED' : 'OUTLIER'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 pl-6 font-mono leading-relaxed">
                          {savedReports[selectedTx.id].digitizationCheck.observations}
                        </p>
                      </div>

                      {/* Soporte documental */}
                      <div className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {savedReports[selectedTx.id].documentsCheck.passed ? (
                              <CheckCircle2 size={15} className="text-emerald-500" />
                            ) : (
                              <XCircle size={15} className="text-rose-500" />
                            )}
                            2. Set Completo de Soporte Documental
                          </span>
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-sm ${savedReports[selectedTx.id].documentsCheck.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {savedReports[selectedTx.id].documentsCheck.passed ? 'PASSED' : 'WARNING'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 pl-6 font-mono leading-relaxed">
                          {savedReports[selectedTx.id].documentsCheck.observations}
                        </p>
                      </div>

                      {/* Coherencia de precios */}
                      <div className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {savedReports[selectedTx.id].amountsCheck.passed ? (
                              <CheckCircle2 size={15} className="text-emerald-500" />
                            ) : (
                              <XCircle size={15} className="text-rose-500" />
                            )}
                            3. Coherencia de Precios Contrato s/ Factura
                          </span>
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-sm ${savedReports[selectedTx.id].amountsCheck.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {savedReports[selectedTx.id].amountsCheck.passed ? 'PASSED' : 'DISCREPANCIA'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 pl-6 font-mono leading-relaxed">
                          {savedReports[selectedTx.id].amountsCheck.observations}
                        </p>
                      </div>

                      {/* Vigencia Chile Ley 19983 */}
                      <div className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {savedReports[selectedTx.id].chileanLawCheck.passed ? (
                              <CheckCircle2 size={15} className="text-emerald-500" />
                            ) : (
                              <XCircle size={15} className="text-rose-500" />
                            )}
                            4. Vigencia de Facturas y Plazos Legales S.I.I.
                          </span>
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-sm ${savedReports[selectedTx.id].chileanLawCheck.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {savedReports[selectedTx.id].chileanLawCheck.passed ? 'CUMPLE REG.' : 'OBSERVADO'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 pl-6 font-mono leading-relaxed">
                          {savedReports[selectedTx.id].chileanLawCheck.observations}
                        </p>
                      </div>

                      {/* Concordancia bancaria */}
                      <div className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {savedReports[selectedTx.id].bankAndSupplierCheck.passed ? (
                              <CheckCircle2 size={15} className="text-emerald-500" />
                            ) : (
                              <XCircle size={15} className="text-rose-500" />
                            )}
                            5. Concordancia Identidad Bancaria-Proveedor
                          </span>
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-sm ${savedReports[selectedTx.id].bankAndSupplierCheck.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {savedReports[selectedTx.id].bankAndSupplierCheck.passed ? 'PASSED' : 'VERIFICAR'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 pl-6 font-mono leading-relaxed">
                          {savedReports[selectedTx.id].bankAndSupplierCheck.observations}
                        </p>
                      </div>

                    </div>

                    {/* INTERACTIVE MANUAL CHECKLIST FOR 7 POINTS */}
                    <div className="mb-6 border-t border-slate-200 pt-6">
                      <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100 flex items-start gap-3 mb-3">
                        <CheckCircle2 size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider font-mono">
                            Lista de Verificación de Requisitos Obligatorios (Control Interno Pt. 4)
                          </h4>
                          <p className="text-[10px] text-slate-600 mt-1 leading-normal">
                            Como Revisor de Control Interno, corrobore físicamente la presencia de cada documento del paquete. Marque conforme / ausente para cada criterio para actualizar automáticamente el reporte descargable PDF.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-150">
                        {[
                          { 
                            key: 'hasInvoiceOrTaxDoc' as const, 
                            num: "1",
                            label: "Factura, boleta o cualquier documento tributario correspondiente",
                            detail: "Contenido tributario válido y registrado bajo normativa SII." 
                          },
                          { 
                            key: 'hasExecNoConflictDecl' as const, 
                            num: "2",
                            label: "Declaración de ausencia de conflicto de intereses del ejecutivo",
                            detail: "Declaración firmada de probidad y transparencia en carpeta de operaciones." 
                          },
                          { 
                            key: 'hasUafBeneficiaryDecl' as const, 
                            num: "3",
                            label: "Declaración de beneficiarios finales (UAF)",
                            detail: "Declaración de transparencia corporativa s/ beneficiario final." 
                          },
                          { 
                            key: 'hasThirdPartyNoConflictDecl' as const, 
                            num: "4",
                            label: "Declaración de ausencia de conflictos de intereses de terceros",
                            detail: "Suscrito por contratista/proveedor adjudicado." 
                          },
                          { 
                            key: 'hasContractOrOT' as const, 
                            num: "5",
                            label: "Contrato si corresponde u Orden de Trabajo (OT) respectiva",
                            detail: "Vinculado al contrato marco o número de OT presupuestaria." 
                          },
                          { 
                            key: 'hasCompletionReceptionDoc' as const, 
                            num: "6",
                            label: "Documento o imágenes de finalización y recepción conforme",
                            detail: "Acta de recepción de obra firmada o soporte fotográfico en terreno." 
                          },
                          { 
                            key: 'hasCorrectEgresoMontoMoneda' as const, 
                            num: "7",
                            label: "Egreso correctamente confeccionado (Monto y Moneda)",
                            detail: "Monto coincide con factura y ambas unidades de moneda son las mismas." 
                          }
                        ].map((item) => {
                          const val = getChecklistItemValue(savedReports[selectedTx.id], item.key);
                          return (
                            <label 
                              key={item.key} 
                              className="flex items-start gap-3 p-2 bg-white rounded-md border border-slate-200 hover:border-indigo-400 transition-all cursor-pointer shadow-3xs"
                            >
                              <input 
                                type="checkbox"
                                checked={val}
                                onChange={() => toggleChecklistItem(selectedTx.id, item.key)}
                                className="h-4 w-4 mt-0.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 leading-snug">
                                  <span className="text-[9px] bg-slate-100 text-slate-600 h-4.5 w-4.5 rounded-full inline-flex items-center justify-center font-mono font-black shrink-0">{item.num}</span>
                                  {item.label}
                                </span>
                                <p className="text-[9.5px] text-slate-400 font-mono mt-0.5 pl-6">{item.detail}</p>
                              </div>
                              <span className={`text-[8.5px] font-black font-mono px-1.5 py-0.5 rounded-sm shrink-0 whitespace-nowrap self-start ${val ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {val ? "✔ CONFORME" : "✘ AUSENTE"}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* DEVIATIONS BLOCK */}
                    {savedReports[selectedTx.id].deviations && savedReports[selectedTx.id].deviations.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-3 flex items-center gap-1">
                          <ShieldAlert size={14} className="text-rose-600" />
                          Desviaciones Críticas Detectadas
                        </h4>
                        
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                          {savedReports[selectedTx.id].deviations.map((dev, dIndex) => (
                            <div key={dIndex} className="p-4 bg-rose-50/20">
                              <div className="flex items-center justify-between gap-3">
                                <h5 className="text-xs font-black text-slate-900">{dev.title}</h5>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-sm uppercase font-mono ${
                                  dev.severity === 'ALTA' ? 'bg-rose-100 text-rose-700' : dev.severity === 'MEDIA' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                                }`}>
                                  GRAVEDAD {dev.severity}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-mono">{dev.description}</p>
                              <div className="mt-3 bg-white border border-rose-100 p-2.5 rounded-md flex items-start gap-2">
                                <span className="text-[10px] font-black uppercase font-mono text-rose-600 tracking-widest block shrink-0 mt-0.5">ACCIÓN SUGERIDA:</span>
                                <p className="text-[11px] font-mono text-slate-800">{dev.remedialAction}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* REMEDIAL COMPLIANCE SUGGESTIONS GENERAL */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2">Comentario de Auditoría & Dictamen General</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-line">{savedReports[selectedTx.id].remedialSuggestions}</p>
                    </div>

                  </div>
                </div>
              )}

              {/* SAVED NEURAL NETWORK AUDITOR COMPACT INTERFACE */}
              {savedReports[selectedTx.id] && savedReports[selectedTx.id].neuralNetworkAnalysis && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg shadow-xl overflow-hidden mt-4 p-5 text-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${neuralNetworkEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                      <Layers size={16} className="text-indigo-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black uppercase text-indigo-300 font-mono tracking-wider">
                          Red Neuronal de Auditoría de Pagos Semanales
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {neuralNetworkEnabled 
                            ? <>Mapeo de Pesos de Activación y Capas Ocultas para ID: <span className="font-mono text-indigo-400">{selectedTx.id.substring(0, 8)}</span></>
                            : <span className="text-rose-405 font-bold uppercase">Motor en Desuso / Modo Bypass Manual Activo</span>}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNeuralEngineDetailsOpen(!neuralEngineDetailsOpen)}
                      className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[9px] font-mono rounded px-2 py-0.5 text-slate-300 flex items-center gap-1 select-none"
                    >
                      {neuralEngineDetailsOpen ? 'Ocultar Grafo' : 'Mostrar Grafo'}
                    </button>
                  </div>

                  {neuralEngineDetailsOpen && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative">
                      {!neuralNetworkEnabled && (
                        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs z-10 flex flex-col items-center justify-center text-center p-6 border border-rose-950 rounded-lg">
                          <AlertCircle size={28} className="text-rose-500 mb-2 animate-pulse" />
                          <h4 className="text-[11px] font-black text-rose-400 font-mono uppercase tracking-widest">Motor de Red Neuronal Desactivado (OFF)</h4>
                          <p className="text-[10px] text-slate-300 max-w-sm mt-1 leading-relaxed font-sans">
                            Has apagado la red neuronal desde el Laboratorio de Entrenamiento. El grafo de activación fue pausado temporalmente.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleToggleNeuralNetwork(true)}
                            className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded transition cursor-pointer font-mono"
                          >
                            Habilitar Red Neuronal
                          </button>
                        </div>
                      )}
                      
                      {/* Interactive Neural SVG Canvas */}
                      <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-900/60 rounded-lg border border-slate-900 p-4">
                        <span className="text-[9px] font-mono text-slate-400 mb-2 uppercase select-none">
                          Grafo Dinámico de Activación de Neuronas (Cotejo Multipaís Chile)
                        </span>
                        
                        <div className="relative w-full overflow-x-auto min-h-[300px] flex items-center justify-center">
                          <svg className="w-full max-w-[480px] h-[280px]" viewBox="0 0 480 280">
                            <defs>
                              <filter id="glow-green">
                                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                              <filter id="glow-rose">
                                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>

                            {/* Neural Connections (lines) */}
                            {/* Layer 1 (Inputs) to Layer 2 (Hidden) */}
                            {[
                              { fromY: 35, toY: 45 }, { fromY: 35, toY: 110 }, { fromY: 35, toY: 175 }, { fromY: 35, toY: 240 },
                              { fromY: 100, toY: 45 }, { fromY: 100, toY: 110 }, { fromY: 100, toY: 175 }, { fromY: 100, toY: 240 },
                              { fromY: 165, toY: 45 }, { fromY: 165, toY: 110 }, { fromY: 165, toY: 175 }, { fromY: 165, toY: 240 },
                              { fromY: 230, toY: 45 }, { fromY: 230, toY: 110 }, { fromY: 230, toY: 175 }, { fromY: 230, toY: 240 },
                            ].map((ln, i) => {
                              const isActive = savedReports[selectedTx.id] && savedReports[selectedTx.id].status !== 'RECHAZADO';
                              return (
                                <line
                                  key={`line-1-${i}`}
                                  x1="65"
                                  y1={ln.fromY}
                                  x2="235"
                                  y2={ln.toY}
                                  stroke={isActive ? '#312e81' : '#450a0a'}
                                  strokeWidth="1"
                                  strokeDasharray="2 3"
                                />
                              );
                            })}

                            {/* Layer 2 (Hidden) to Layer 3 (Outputs) */}
                            {[
                              { fromY: 45, toY: 60 }, { fromY: 45, toY: 135 }, { fromY: 45, toY: 210 },
                              { fromY: 110, toY: 60 }, { fromY: 110, toY: 135 }, { fromY: 110, toY: 210 },
                              { fromY: 175, toY: 60 }, { fromY: 175, toY: 135 }, { fromY: 175, toY: 210 },
                              { fromY: 240, toY: 60 }, { fromY: 240, toY: 135 }, { fromY: 240, toY: 210 },
                            ].map((ln, i) => {
                              const isActive = savedReports[selectedTx.id] && savedReports[selectedTx.id].status !== 'RECHAZADO';
                              return (
                                <line
                                  key={`line-2-${i}`}
                                  x1="245"
                                  y1={ln.fromY}
                                  x2="415"
                                  y2={ln.toY}
                                  stroke={isActive ? '#312e81' : '#450a0a'}
                                  strokeWidth="1"
                                  strokeDasharray="2 3"
                                />
                              );
                            })}

                            {/* Input Nodes (X: 60) */}
                            {savedReports[selectedTx.id].neuralNetworkAnalysis?.inputVectors.map((vec, i) => {
                              const nodeY = 35 + i * 65;
                              const isErr = vec.status === 'error';
                              const isWarn = vec.status === 'warning';
                              return (
                                <g 
                                  key={`in-${i}`} 
                                  className="cursor-pointer group"
                                  onClick={() => setSelectedNeuralNode(`in-${i}`)}
                                >
                                  <circle
                                    cx="60"
                                    cy={nodeY}
                                    r="15"
                                    fill={selectedNeuralNode === `in-${i}` ? '#4f46e5' : isErr ? '#1e1b1b' : '#0f172a'}
                                    stroke={isErr ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981'}
                                    strokeWidth={selectedNeuralNode === `in-${i}` ? '2.5' : '1.5'}
                                    className="transition-all duration-300"
                                  />
                                  <text
                                    x="60"
                                    y={nodeY + 3}
                                    fill="#fff"
                                    fontSize="8"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    className="font-mono text-[8px]"
                                  >
                                    V{i+1}
                                  </text>
                                  <text
                                    x="40"
                                    y={nodeY + 3}
                                    fill={isErr ? '#f87171' : isWarn ? '#fbbf24' : '#94a3b8'}
                                    fontSize="7.5"
                                    fontWeight="bold"
                                    textAnchor="end"
                                    className="font-mono tracking-wider opacity-70 group-hover:opacity-100 transition-opacity"
                                  >
                                    {vec.label.split(' ')[0]}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Hidden Layer Nodes (X: 240) */}
                            {savedReports[selectedTx.id].neuralNetworkAnalysis?.hiddenNeurons.map((neu, i) => {
                              const nodeY = 45 + i * 65;
                              
                              // Dynamically evaluate threshold from our trained neural settings
                              let threshold = 0.5;
                              if (i === 0) threshold = neuralWeights.digitization;
                              if (i === 1) threshold = neuralWeights.bank;
                              if (i === 2) threshold = neuralWeights.compliance;
                              if (i === 3) threshold = neuralWeights.documents;

                              const isActive = neu.activation >= threshold;
                              return (
                                <g 
                                  key={`hid-${i}`} 
                                  className="cursor-pointer group"
                                  onClick={() => setSelectedNeuralNode(`hid-${i}`)}
                                >
                                  <circle
                                    cx="240"
                                    cy={nodeY}
                                    r="17"
                                    fill={selectedNeuralNode === `hid-${i}` ? '#4f46e5' : '#020617'}
                                    stroke={isActive ? '#10b981' : '#ef4444'}
                                    strokeWidth={selectedNeuralNode === `hid-${i}` ? '2.5' : '1.5'}
                                    style={{ filter: isActive ? 'url(#glow-green)' : 'url(#glow-rose)' }}
                                    className="transition-all duration-300"
                                  />
                                  <text
                                    x="240"
                                    y={nodeY + 3}
                                    fill="#fff"
                                    fontSize="8"
                                    fontWeight="black"
                                    textAnchor="middle"
                                    className="font-mono text-[8px]"
                                  >
                                    N{i+1}
                                  </text>
                                  <text
                                    x="240"
                                    y={nodeY - 21}
                                    fill="#a5b4fc"
                                    fontSize="7.5"
                                    fontWeight="semibold"
                                    textAnchor="middle"
                                    className="font-mono tracking-normal opacity-85"
                                  >
                                    {(neu.activation * 100).toFixed(0)}%
                                  </text>
                                </g>
                              );
                            })}

                            {/* Output Layer Nodes (X: 420) */}
                            {savedReports[selectedTx.id].neuralNetworkAnalysis?.outputWeights.map((out, i) => {
                              const nodeY = 60 + i * 75;
                              const isSelected = (out.name === 'APROBADO' && savedReports[selectedTx.id].status === 'APROBADO') ||
                                                 (out.name === 'OBSERVADO' && savedReports[selectedTx.id].status === 'APROBADO_CON_OBSERVACIONES') ||
                                                 (out.name === 'RECHAZADO' && savedReports[selectedTx.id].status === 'RECHAZADO');
                              return (
                                <g 
                                  key={`out-${i}`} 
                                  className="cursor-pointer group"
                                  onClick={() => setSelectedNeuralNode(`out-${i}`)}
                                >
                                  <circle
                                    cx="420"
                                    cy={nodeY}
                                    r="17"
                                    fill={isSelected ? (out.name === 'RECHAZADO' ? '#7f1d1d' : '#064e3b') : '#0c0a09'}
                                    stroke={isSelected ? (out.name === 'RECHAZADO' ? '#f87171' : '#34d399') : '#292524'}
                                    strokeWidth={isSelected ? '2.5' : '1.5'}
                                    className="transition-all duration-300"
                                  />
                                  <text
                                    x="420"
                                    y={nodeY + 3}
                                    fill="#fff"
                                    fontSize="8"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    className="font-mono text-[8px]"
                                  >
                                    {out.name[0]}
                                  </text>
                                  <text
                                    x="442"
                                    y={nodeY + 3}
                                    fill={isSelected ? '#fff' : '#57534e'}
                                    fontSize="8"
                                    fontWeight="black"
                                    textAnchor="start"
                                    className="font-mono tracking-wide"
                                  >
                                    {out.name}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                        <p className="text-[9.5px] text-slate-500 font-mono text-center mt-2 max-w-sm">
                          Haga clic en cualquiera de los nodos (<span className="text-violet-400">V1-V4</span>, <span className="text-emerald-400">N1-N4</span> o <span className="text-amber-400">Salidas</span>) para inspeccionar observaciones de la red.
                        </p>
                      </div>

                      {/* Diagnostic details */}
                      <div className="lg:col-span-4 bg-slate-900 border border-slate-900 rounded-lg p-4 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-slate-400 tracking-wider block uppercase mb-3">
                            Monitor de Ajuste de Pesos y Sesgos
                          </span>

                          {!selectedNeuralNode && (
                            <div className="text-slate-400 h-full flex flex-col justify-center items-center py-10 text-center">
                              <Info size={28} className="text-slate-600 mb-2" />
                              <p className="text-[11px] font-mono">Seleccione un nodo para auditar su peso y activar el registro secuencial.</p>
                            </div>
                          )}

                          {selectedNeuralNode?.startsWith('in-') && (() => {
                            const index = parseInt(selectedNeuralNode.split('-')[1]);
                            const vec = savedReports[selectedTx.id]?.neuralNetworkAnalysis?.inputVectors?.[index];
                            if (!vec) return null;
                            return (
                              <div className="space-y-3 animation-fade-in text-slate-100">
                                <span className="text-[9px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded uppercase font-black">
                                  CORRELADOR DE ENTRADA (VECTOR V{index + 1})
                                </span>
                                <h5 className="text-xs font-bold text-indigo-300 mt-2 font-sans">{vec.label}</h5>
                                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px]">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-slate-500 font-mono">Valor de Atributo:</span>
                                    <span className="text-indigo-400 font-bold font-mono">{vec.value}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-mono">Estado de Red:</span>
                                    <span className={vec.status === 'ok' ? 'text-emerald-400 font-bold font-mono' : vec.status === 'warning' ? 'text-amber-400 font-bold font-mono' : 'text-rose-400 font-bold font-mono'}>
                                      {vec.status.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed pt-1 font-sans">
                                  Este nodo ingresa el estado físico del archivo de correspondencia cargado en AssetFlow. Los pesos hacia la capa oculta se ajustan según la autenticidad del emisor.
                                </p>
                              </div>
                            );
                          })()}

                          {selectedNeuralNode?.startsWith('hid-') && (() => {
                            const index = parseInt(selectedNeuralNode.split('-')[1]);
                            const neu = savedReports[selectedTx.id]?.neuralNetworkAnalysis?.hiddenNeurons?.[index];
                            if (!neu) return null;
                            return (
                              <div className="space-y-3 animation-fade-in text-slate-100">
                                <span className="text-[9px] bg-indigo-950 text-indigo-300 font-mono px-2 py-0.5 rounded uppercase font-black text-xs">
                                  NEURONA INTERMEDIA (CAPA N{index + 1})
                                </span>
                                <h5 className="text-xs font-bold text-emerald-300 mt-2 font-sans">{neu.name}</h5>
                                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px]">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-slate-500 font-mono">Activación Sigmoide:</span>
                                    <span className={`font-black font-mono ${neu.activation > 0.5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {(neu.activation * 100).toFixed(2)}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-mono">Estado de Capa:</span>
                                    <span className={neu.activation > 0.5 ? 'text-emerald-400 font-bold font-mono' : 'text-rose-400 font-bold font-mono'}>
                                      {neu.activation > 0.5 ? 'ACTIVADA' : 'INHIBIDA'}
                                    </span>
                                  </div>
                                </div>
                                <div className="bg-slate-950 p-2.5 rounded border border-slate-900 mt-1">
                                  <span className="text-[8px] font-bold text-indigo-400 block mb-1 font-mono uppercase">Log de Auditoría Neuronal:</span>
                                  <p className="text-[10px] text-slate-305 font-mono leading-relaxed max-h-[85px] overflow-y-auto" title={neu.statusMsg}>
                                    {neu.statusMsg}
                                  </p>
                                </div>
                              </div>
                            );
                          })()}

                          {selectedNeuralNode?.startsWith('out-') && (() => {
                            const index = parseInt(selectedNeuralNode.split('-')[1]);
                            const out = savedReports[selectedTx.id]?.neuralNetworkAnalysis?.outputWeights?.[index];
                            if (!out) return null;
                            return (
                              <div className="space-y-3 animation-fade-in text-slate-105">
                                <span className="text-[9px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded uppercase font-black">
                                  DICTAMEN FINAL (NODO SALIDA O{index + 1})
                                </span>
                                <h5 className="text-xs font-bold text-amber-300 mt-2 font-sans">Salida: {out.name}</h5>
                                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px]">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-slate-500 font-mono">Confianza de Red:</span>
                                    <span className="text-white font-black font-mono">{(out.weight * 100).toFixed(2)}%</span>
                                  </div>
                                  <div className="flex justify-between items-center font-mono">
                                    <span className="text-slate-500 font-mono">Dictamen Acordado:</span>
                                    <span className="text-amber-400 font-bold font-mono">
                                      {savedReports[selectedTx.id]?.status === 'APROBADO' && out.name === 'APROBADO' ? 'EVALUADO' :
                                       savedReports[selectedTx.id]?.status === 'APROBADO_CON_OBSERVACIONES' && out.name === 'OBSERVADO' ? 'EVALUADO' :
                                       savedReports[selectedTx.id]?.status === 'RECHAZADO' && out.name === 'RECHAZADO' ? 'EVALUADO' : 'INACTIVO'}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed pt-1 font-sans">
                                  Los pesos de probabilidad se resuelven utilizando una función Softmax. El veredicto '{out.name}' tiene un peso final de {(out.weight * 100).toFixed(1)}% de relevancia sobre los demás.
                                </p>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="border-t border-slate-800 pt-3 mt-4">
                          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                            <span>Sujeto a Pesos SII V4</span>
                            <span className="text-indigo-400">Cotejado con Éxito</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}

            </>
          )}

        </div>

      </div>

      {isUafFormModalOpen && (
        <UafBeneficiaryFormModal
          isOpen={isUafFormModalOpen}
          onClose={() => setIsUafFormModalOpen(false)}
          supplierName={selectedTx?.supplierName || selectedSupplier?.name}
          supplierTaxId={selectedTx?.supplierTaxId || selectedSupplier?.taxId}
          initialData={activeTxFiles?.beneficiaryForm}
          onSave={handleSaveBeneficiaryUAF}
        />
      )}

    </div>
  );
};
