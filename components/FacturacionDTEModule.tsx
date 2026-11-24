import React, { useState, useMemo, useEffect } from 'react';
import { 
  DTEInvoice, 
  DTEInvoiceLineItem, 
  DTEType, 
  Property, 
  LeaseContract 
} from '../types';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Printer, 
  Calculator, 
  Building2, 
  ShieldCheck, 
  Eye, 
  RefreshCw, 
  Plus, 
  Search, 
  Info, 
  Scale, 
  BookOpen, 
  FileSpreadsheet, 
  Sliders, 
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Layers,
  HelpCircle,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Check
} from 'lucide-react';
import { formatCLP, formatRUT, validateRUT } from '../lib/chileanUtils';
import { 
  getAllDTEInvoices, 
  saveDTEInvoice, 
  SAMPLE_DTE_INVOICES, 
  evaluateDL825Art8g, 
  TaxAssessmentResult 
} from '../lib/chileanDteTaxService';
import { downloadDTEInvoicePDF } from '../lib/pdfGenerator';
import { emitDTEInvoiceVoucher } from '../lib/voucherService';
import { JDEGridContextMenu } from './JDEGridContextMenu';

/**
 * Convierte montos en pesos chilenos a su expresión verbal en palabras
 * Útil para evitar confusiones entre millones y miles al digitar valores financieros.
 */
export const formatAmountInSpanishWords = (amount: number): string => {
  if (!amount || amount <= 0) return 'Cero pesos CLP';
  if (amount >= 1000000000) {
    const billions = Math.floor(amount / 1000000000);
    const remainder = amount % 1000000000;
    return `${billions} mil millones${remainder > 0 ? ' y fracción' : ''} de pesos CLP`;
  }
  if (amount >= 1000000) {
    const millions = Math.floor(amount / 1000000);
    const thousands = Math.floor((amount % 1000000) / 1000);
    let str = millions === 1 ? 'Un millón' : `${millions} millones`;
    if (thousands > 0) {
      str += ` ${thousands} mil`;
    }
    return `${str} de pesos CLP`;
  }
  if (amount >= 1000) {
    const thousands = Math.floor(amount / 1000);
    return `${thousands} mil pesos CLP`;
  }
  return `${amount} pesos CLP`;
};

/**
 * Componente de entrada para moneda chilena (CLP)
 * - Permite escritura libre y borrado sin bloquearse en '0'
 * - Formatea automáticamente con puntos de miles (es-CL)
 * - Evita spinners, scroll no deseado y errores al editar
 * - Proporciona chips de adición rápida, presets y botón de limpieza
 */
interface ChileanCurrencyInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  subtitle?: string;
  placeholder?: string;
  quickIncrements?: { label: string; amount: number }[];
  presets?: { label: string; value: number }[];
  allowZero?: boolean;
}

const ChileanCurrencyInput: React.FC<ChileanCurrencyInputProps> = ({
  label,
  value,
  onChange,
  subtitle,
  placeholder = '$ 0',
  quickIncrements = [],
  presets = [],
  allowZero = true
}) => {
  const [displayStr, setDisplayStr] = useState<string>(() => {
    if (value === 0 && !allowZero) return '';
    return value ? value.toLocaleString('es-CL') : (value === 0 ? '0' : '');
  });

  useEffect(() => {
    if (value === 0) {
      setDisplayStr(allowZero ? '0' : '');
    } else if (value) {
      setDisplayStr(value.toLocaleString('es-CL'));
    } else {
      setDisplayStr('');
    }
  }, [value, allowZero]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '');
    
    if (digitsOnly === '') {
      setDisplayStr('');
      onChange(0);
      return;
    }
    
    const parsedNum = parseInt(digitsOnly, 10);
    const capped = Math.min(parsedNum, 999999999999);
    setDisplayStr(capped.toLocaleString('es-CL'));
    onChange(capped);
  };

  const handleClear = () => {
    setDisplayStr(allowZero ? '0' : '');
    onChange(0);
  };

  const handleIncrement = (amount: number) => {
    const newVal = Math.max(0, (value || 0) + amount);
    setDisplayStr(newVal.toLocaleString('es-CL'));
    onChange(newVal);
  };

  const handlePreset = (presetVal: number) => {
    setDisplayStr(presetVal.toLocaleString('es-CL'));
    onChange(presetVal);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-800 tracking-tight">
          {label}
        </label>
        {subtitle && (
          <span className="text-[10px] text-slate-400 font-medium">
            {subtitle}
          </span>
        )}
      </div>

      <div className="relative flex items-stretch border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
        <span className="inline-flex items-center px-2.5 bg-slate-100 text-slate-600 text-[11px] font-mono font-bold border-r border-slate-200 select-none">
          $ CLP
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={displayStr}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="clean-currency-field flex-1 bg-transparent py-1.5 px-2.5 text-xs font-mono font-bold text-slate-900 outline-none border-none"
        />
        {(displayStr !== '' && displayStr !== '0') && (
          <button
            type="button"
            onClick={handleClear}
            className="px-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer text-xs font-bold"
            title="Restablecer a $0"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] pt-0.5">
        <span className="text-slate-500 font-medium truncate">
          {formatAmountInSpanishWords(value)}
        </span>
        {value > 0 && (
          <span className="text-emerald-700 font-mono font-bold shrink-0 ml-1">
            {formatCLP(value)}
          </span>
        )}
      </div>

      {(quickIncrements.length > 0 || presets.length > 0) && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {quickIncrements.map((inc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleIncrement(inc.amount)}
              className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 font-medium border border-slate-200 transition-colors cursor-pointer"
            >
              {inc.label}
            </button>
          ))}
          {presets.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePreset(p.value)}
              className={`text-[9.5px] px-1.5 py-0.5 rounded font-medium border transition-colors cursor-pointer ${
                value === p.value 
                  ? 'bg-emerald-600 text-white border-emerald-600 font-bold' 
                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
          {value > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[9.5px] px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface FacturacionDTEModuleProps {
  properties: Property[];
  contracts: LeaseContract[];
  currentUser: string;
  companyLogo?: string | null;
  onSyncFirestore?: (collection: string, docId: string, data: any) => void;
  onAuditEntry?: (action: string, entity: string, entityId: string, details: string) => void;
}

export const FacturacionDTEModule: React.FC<FacturacionDTEModuleProps> = ({
  properties = [],
  contracts = [],
  currentUser = 'SISTEMA FACTURACIÓN',
  companyLogo = null,
  onSyncFirestore,
  onAuditEntry
}) => {
  // Tabs: 'EJEMPLO' | 'SIMULADOR' | 'REGISTRO' | 'NORMATIVA'
  const [activeTab, setActiveTab] = useState<'EJEMPLO' | 'SIMULADOR' | 'REGISTRO' | 'NORMATIVA'>('EJEMPLO');

  // Invoices list state
  const [invoices, setInvoices] = useState<DTEInvoice[]>(() => getAllDTEInvoices());
  
  // Selected sample invoice for showcase
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(SAMPLE_DTE_INVOICES[0].id);
  
  // Filter for registry
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDteType, setFilterDteType] = useState<string>('ALL');

  // AssetFlow Enterprise Grid Context Menu State (P4210DTE)
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    invoice: DTEInvoice;
  } | null>(null);

  const handleRowContextMenu = (e: React.MouseEvent, invoice: DTEInvoice) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const clickX = e?.clientX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const clickY = e?.clientY ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 300);

    setGridContextMenu({
      x: Math.max(10, Math.min(clickX, typeof window !== 'undefined' ? window.innerWidth - 240 : 800)),
      y: Math.max(10, Math.min(clickY, typeof window !== 'undefined' ? window.innerHeight - 380 : 500)),
      invoice
    });
  };

  // Simulator Form State
  const [simPropertyId, setSimPropertyId] = useState<string>(properties[0]?.id || '');
  const [simRentAmount, setSimRentAmount] = useState<number>(850000);
  const [simIsFurnished, setSimIsFurnished] = useState<boolean>(false);
  const [simHasFacilities, setSimHasFacilities] = useState<boolean>(false);
  const [simPropertyDestination, setSimPropertyDestination] = useState<'HABITACIONAL' | 'OFICINA' | 'COMERCIAL' | 'BODEGA' | 'INDUSTRIAL'>('HABITACIONAL');
  const [simFiscalAppraisal, setSimFiscalAppraisal] = useState<number>(80000000);
  const [simTaxableServices, setSimTaxableServices] = useState<number>(0);
  
  // Receiver Simulator Form
  const [simReceiverTaxId, setSimReceiverTaxId] = useState<string>('77.123.456-7');
  const [simReceiverName, setSimReceiverName] = useState<string>('ARRENDATARIO DE PRUEBA SPA');
  const [simReceiverBusiness, setSimReceiverBusiness] = useState<string>('SERVICIOS PROFESIONALES');
  const [simReceiverAddress, setSimReceiverAddress] = useState<string>('Av. Apoquindo 4000, Las Condes');
  const [simPeriodBilled, setSimPeriodBilled] = useState<string>('Septiembre 2026');

  // Success message state
  const [lastEmittedInvoice, setLastEmittedInvoice] = useState<DTEInvoice | null>(null);

  // Modo en pestaña Simulador: 'WIZARD' (Asistente paso a paso cero errores) o 'SANDBOX' (Formulario directo)
  const [simulatorMode, setSimulatorMode] = useState<'WIZARD' | 'SANDBOX'>('WIZARD');
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [isWizardModalOpen, setIsWizardModalOpen] = useState<boolean>(false);

  // Modal de Decisión: "¿Desea ver el documento en pantalla o descargarlo en PDF?"
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    invoice: DTEInvoice | null;
    title?: string;
  }>({
    isOpen: false,
    invoice: null
  });

  // Modal Visor de Factura DTE en Pantalla (con soporte Blanco y Negro)
  const [screenViewer, setScreenViewer] = useState<{
    isOpen: boolean;
    invoice: DTEInvoice | null;
    isBW: boolean;
  }>({
    isOpen: false,
    invoice: null,
    isBW: false
  });

  // Active selected invoice
  const currentSelectedInvoice = useMemo(() => {
    return invoices.find(inv => inv.id === selectedInvoiceId) || invoices[0] || SAMPLE_DTE_INVOICES[0];
  }, [invoices, selectedInvoiceId]);

  // Dynamic tax assessment for simulator
  const simTaxAssessment: TaxAssessmentResult = useMemo(() => {
    return evaluateDL825Art8g({
      rentalAmount: simRentAmount,
      isFurnished: simIsFurnished,
      hasCommercialFacilities: simHasFacilities,
      propertyDestination: simPropertyDestination,
      fiscalAppraisalValue: simFiscalAppraisal,
      taxableServicesAmount: simTaxableServices
    });
  }, [simRentAmount, simIsFurnished, simHasFacilities, simPropertyDestination, simFiscalAppraisal, simTaxableServices]);

  // Metrics
  const metrics = useMemo(() => {
    const totalExemptInvoices = invoices.filter(inv => inv.dteType === '34' || inv.exemptTotal > 0).length;
    const sumExemptAmount = invoices.reduce((acc, inv) => acc + (inv.exemptTotal || 0), 0);
    const estimatedIvaSavings = Math.round(sumExemptAmount * 0.19);
    const totalTaxableInvoices = invoices.filter(inv => inv.dteType === '33' && inv.netTaxableTotal > 0).length;
    return {
      totalExemptInvoices,
      sumExemptAmount,
      estimatedIvaSavings,
      totalTaxableInvoices,
      totalInvoices: invoices.length
    };
  }, [invoices]);

  // Iniciar asistente para nueva emisión DTE de prueba
  const handleStartNewEmission = () => {
    if (properties.length > 0) {
      handlePropertySelect(properties[0].id);
    } else {
      setSimRentAmount(850000);
      setSimIsFurnished(false);
      setSimHasFacilities(false);
      setSimPropertyDestination('HABITACIONAL');
      setSimFiscalAppraisal(80000000);
    }
    setSimTaxableServices(0);
    setSimReceiverTaxId('77.123.456-7');
    setSimReceiverName('ARRENDATARIO DE PRUEBA SPA');
    setSimReceiverBusiness('SERVICIOS PROFESIONALES');
    setSimReceiverAddress('Av. Apoquindo 4000, Las Condes');
    setSimPeriodBilled('Septiembre 2026');
    setWizardStep(1);
    setSimulatorMode('WIZARD');
    setActiveTab('SIMULADOR');
    setIsWizardModalOpen(true);
  };

  // Abrir modal de pregunta: ¿Ver en pantalla o Descargar PDF?
  const handleOpenPromptModal = (invoice: DTEInvoice, title?: string) => {
    setPromptModal({
      isOpen: true,
      invoice,
      title: title || `Factura ${invoice.dteTypeName} Folio ${invoice.folio}`
    });
  };

  // Abrir visor en pantalla
  const handleOpenScreenViewer = (invoice: DTEInvoice, isBW: boolean = false) => {
    setPromptModal({ isOpen: false, invoice: null });
    setScreenViewer({
      isOpen: true,
      invoice,
      isBW
    });
  };

  // Handle property change in simulator
  const handlePropertySelect = (propId: string) => {
    setSimPropertyId(propId);
    const foundProp = properties.find(p => p.id === propId);
    if (foundProp) {
      setSimRentAmount(foundProp.rentalAmount || (foundProp as any).rentalPrice || 850000);
      if (foundProp.appraisalValue) {
        setSimFiscalAppraisal(foundProp.appraisalValue);
      }
      setSimReceiverAddress(foundProp.address || 'Santiago');
      // Infer destination if available
      if ((foundProp as any).propertyType === 'COMERCIAL' || foundProp.type === 'LOCAL') setSimPropertyDestination('COMERCIAL');
      else if ((foundProp as any).propertyType === 'OFICINA' || foundProp.type === 'OFICINA') setSimPropertyDestination('OFICINA');
      else if (foundProp.type === 'BODEGA') setSimPropertyDestination('BODEGA');
      else setSimPropertyDestination('HABITACIONAL');
    }
  };

  // Emit test invoice
  const handleEmitTestInvoice = () => {
    const nextFolio = Math.max(4530, ...invoices.map(i => i.folio)) + 1;
    const isExempt = simTaxAssessment.isExempt;
    const dteType: DTEType = simTaxAssessment.dteType;
    const dteTypeName = simTaxAssessment.dteTypeName;

    const items: DTEInvoiceLineItem[] = [
      {
        id: `item-sim-1`,
        lineNumber: 1,
        code: isExempt ? 'ARR-EXENTO-8G' : 'ARR-AFECTO-8G',
        description: `CANON DE ARRENDAMIENTO INMUEBLE DESTINO ${simPropertyDestination} - ${simIsFurnished ? 'AMOBLADO' : 'SIN AMOBLAR'} (${simPeriodBilled})`,
        quantity: 1,
        unitPrice: simRentAmount,
        isExempt: !simIsFurnished && !simHasFacilities,
        exemptionReason: !simIsFurnished && !simHasFacilities ? 'DL_825_ART_8_G_NO_AMOBLADO' : (simIsFurnished ? 'AFECTO_AMOBLADO_ART_17' : 'NO_APLICA'),
        exemptionLegalCitation: simTaxAssessment.legalCitation,
        discountPercent: 0,
        exemptAmount: simTaxAssessment.calculations.exemptAmount,
        taxableAmount: simTaxAssessment.calculations.netTaxableAmount,
        totalAmount: simRentAmount
      }
    ];

    if (simTaxableServices > 0) {
      items.push({
        id: `item-sim-2`,
        lineNumber: 2,
        code: 'SERV-ADM-GGCC',
        description: `SERVICIOS COMPLEMENTARIOS Y GASTOS DE ADMINISTRACIÓN / MANTENCIÓN (${simPeriodBilled})`,
        quantity: 1,
        unitPrice: simTaxableServices,
        isExempt: false,
        discountPercent: 0,
        exemptAmount: 0,
        taxableAmount: simTaxableServices,
        totalAmount: simTaxableServices
      });
    }

    const newInvoice: DTEInvoice = {
      id: `dte-${Date.now()}`,
      folio: nextFolio,
      dteType,
      dteTypeName,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
      paymentMethod: 'TRANSFERENCIA',
      
      issuerTaxId: '76.892.450-3',
      issuerName: 'INMOBILIARIA Y RENTAS ASSETFLOW CENTRAL SPA',
      issuerBusiness: 'ARRENDAMIENTO Y EXPLOTACIÓN DE BIENES INMUEBLES',
      issuerAddress: 'Av. El Golf 0140, Piso 14, Oficina 1402',
      issuerCommune: 'Las Condes',
      issuerCity: 'Santiago',
      siiOffice: 'S.I.I. - SANTIAGO ORIENTE',
      issuerPhone: '+56 2 2890 4100',
      issuerEmail: 'facturacion@assetflow-central.cl',
      
      receiverTaxId: simReceiverTaxId,
      receiverName: simReceiverName,
      receiverBusiness: simReceiverBusiness,
      receiverAddress: simReceiverAddress,
      receiverCommune: 'Santiago',
      receiverCity: 'Santiago',
      
      propertyId: simPropertyId,
      propertyAddress: simReceiverAddress,
      propertyRole: '01420-0089',
      periodBilled: simPeriodBilled,
      isFurnished: simIsFurnished,
      hasCommercialFacilities: simHasFacilities,
      propertyDestination: simPropertyDestination,
      fiscalAppraisalValue: simFiscalAppraisal,
      monthlyFiscalDeduction: simTaxAssessment.calculations.monthlyFiscalDeduction,
      
      items,
      subtotal: simRentAmount + simTaxableServices,
      exemptTotal: simTaxAssessment.calculations.exemptAmount,
      netTaxableTotal: simTaxAssessment.calculations.netTaxableAmount,
      fiscalDeductionApplied: simTaxAssessment.calculations.monthlyFiscalDeduction,
      taxableBase: simTaxAssessment.calculations.taxableBase,
      ivaRate: 0.19,
      ivaAmount: simTaxAssessment.calculations.ivaAmount,
      totalAmount: simTaxAssessment.calculations.totalAmount,
      
      legalExemptionNote: simTaxAssessment.legalCitation,
      siiTedSignature: `MDwCAQACBA${Math.random().toString(36).substring(2, 8)}CAQACAQAEID${Math.random().toString(36).substring(2, 12)}`,
      status: 'ACEPTADA_SII',
      userCreator: currentUser || 'SISTEMA FACTURACIÓN',
      timestamp: Date.now(),
      isSample: false
    };

    saveDTEInvoice(newInvoice);
    setInvoices(prev => [newInvoice, ...prev]);
    setSelectedInvoiceId(newInvoice.id);
    setLastEmittedInvoice(newInvoice);

    // Sync to Firestore
    if (onSyncFirestore) {
      onSyncFirestore('invoices_dte', newInvoice.id, newInvoice);
    }

    // Add Audit Entry
    if (onAuditEntry) {
      onAuditEntry(
        'CREATE', 
        'FACTURA_DTE', 
        newInvoice.id, 
        `Emisión DTE ${newInvoice.dteType} Folio ${newInvoice.folio}: ${newInvoice.receiverName} (${newInvoice.isFurnished ? 'Afecto Art. 8g' : 'Exento Art. 8g'})`
      );
    }

    // Registrar en sistema de vouchers pero sin forzar descarga automática no solicitada
    emitDTEInvoiceVoucher(newInvoice, companyLogo, currentUser, false);

    // Cerrar modal de wizard si estaba abierto
    setIsWizardModalOpen(false);

    // Seleccionar la pestaña de visualización
    setActiveTab('EJEMPLO');

    // Desplegar modal preguntando si prefiere ver en pantalla o descargar PDF
    handleOpenPromptModal(
      newInvoice, 
      `¡Factura ${newInvoice.dteTypeName} Folio N° ${newInvoice.folio} Emitida con Éxito!`
    );
  };

  // Filtered invoices for registry
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = 
        String(inv.folio).includes(searchTerm) ||
        inv.receiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.receiverTaxId.includes(searchTerm) ||
        (inv.propertyAddress && inv.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchType = 
        filterDteType === 'ALL' ||
        (filterDteType === '34' && inv.dteType === '34') ||
        (filterDteType === '33' && inv.dteType === '33');

      return matchSearch && matchType;
    });
  }, [invoices, searchTerm, filterDteType]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Program Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-xl shadow-lg border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                ERP P4210DTE / REG. SII RES. EX. N° 45
              </span>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                <Scale size={11} /> CUMPLIMIENTO D.L. 825 ART. 8° LETRA G
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <FileText className="text-emerald-400" size={26} />
              Centro de Facturación DTE & Exenciones Tributarias
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Emisión de Facturas Electrónicas (DTE 33/34), banco de pruebas interactivo y motor de verificación jurídica de la exención de IVA en arrendamiento de inmuebles sin amoblar según el Artículo 8°, letra g) del D.L. 825 de 1974.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStartNewEmission}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ring-2 ring-emerald-400/40"
              title="Iniciar Asistente Guiado Paso a Paso de Nueva Emisión DTE"
            >
              <Sparkles size={15} /> Probar Nueva Emisión DTE
            </button>
            <button
              onClick={() => handleOpenPromptModal(currentSelectedInvoice)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all border border-slate-600 cursor-pointer shadow-xs active:scale-95"
              title="Opciones de visualización en pantalla o descarga de PDF"
            >
              <Eye size={14} className="text-emerald-400" />
              <span>Ver en Pantalla / PDF</span>
            </button>
          </div>
        </div>

        {/* Quick KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-700/80">
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <p className="text-[10px] uppercase font-bold text-slate-400">Facturas Exentas (DTE 34)</p>
            <p className="text-lg font-black text-emerald-400 mt-0.5">{metrics.totalExemptInvoices} docs</p>
            <p className="text-[9px] text-slate-400">100% Exentas Art. 8g</p>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Arriendos Exentos</p>
            <p className="text-lg font-black text-white mt-0.5">{formatCLP(metrics.sumExemptAmount)}</p>
            <p className="text-[9px] text-emerald-400">Sin recargo de IVA</p>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <p className="text-[10px] uppercase font-bold text-slate-400">Ahorro IVA Arrendatarios</p>
            <p className="text-lg font-black text-amber-400 mt-0.5">{formatCLP(metrics.estimatedIvaSavings)}</p>
            <p className="text-[9px] text-slate-400">19% de IVA liberado legalmente</p>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <p className="text-[10px] uppercase font-bold text-slate-400">Facturas Afectas / Mixtas</p>
            <p className="text-lg font-black text-sky-400 mt-0.5">{metrics.totalTaxableInvoices} docs</p>
            <p className="text-[9px] text-slate-400">Con rebaja avalúo Art. 17</p>
          </div>
        </div>
      </div>

      {/* Success banner if invoice was just emitted */}
      {lastEmittedInvoice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-emerald-800">
                ¡Factura de Prueba Emitida con Éxito en el Banco de Pruebas DTE!
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Folio N° {lastEmittedInvoice.folio} ({lastEmittedInvoice.dteTypeName}) para {lastEmittedInvoice.receiverName}. Monto Total: {formatCLP(lastEmittedInvoice.totalAmount)}. Comprobante PDF generado y descargado.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                downloadDTEInvoicePDF({ invoice: lastEmittedInvoice, companyLogo });
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow cursor-pointer"
            >
              <Download size={13} /> Re-descargar PDF
            </button>
            <button
              onClick={() => setLastEmittedInvoice(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 bg-white px-4 pt-2 rounded-t-xl shadow-xs">
        <button
          onClick={() => setActiveTab('EJEMPLO')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'EJEMPLO'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye size={15} />
          Visor de Factura de Ejemplo (DL 825 Art. 8g)
        </button>

        <button
          onClick={() => setActiveTab('SIMULADOR')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'SIMULADOR'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders size={15} />
          Simulador & Banco de Pruebas DTE
        </button>

        <button
          onClick={() => setActiveTab('REGISTRO')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'REGISTRO'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet size={15} />
          Libro de Ventas & Historial DTE ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab('NORMATIVA')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'NORMATIVA'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale size={15} />
          Fundamento Legal & Checklist SII (Art. 8 letra g)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: VISOR DE FACTURA DE EJEMPLO (SHOWCASE PRINCIPAL)       */}
      {/* ========================================================================= */}
      {activeTab === 'EJEMPLO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Sample Selector & Legal Analysis (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Scenario Picker */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-600" />
                Seleccionar Escenario de Factura
              </h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Haz clic en cualquiera de los ejemplos para ver cómo el sistema estructura el documento tributario y aplica las exenciones o deducciones tributarias:
              </p>

              <div className="space-y-2 pt-1">
                {invoices.map((inv) => {
                  const isSelected = inv.id === currentSelectedInvoice.id;
                  const isExempt = inv.dteType === '34' || (inv.exemptTotal > 0 && inv.netTaxableTotal === 0);

                  return (
                    <button
                      key={inv.id}
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          inv.dteType === '34' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                        }`}>
                          DTE {inv.dteType}: {inv.dteType === '34' ? 'EXENTA' : 'AFECTA'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Folio #{inv.folio}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-1">
                        {inv.receiverName}
                      </p>
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                        {inv.items[0]?.description || inv.propertyAddress}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/60 text-[11px]">
                        <span className="font-semibold text-slate-500">
                          {isExempt ? '100% Exento Art. 8g' : (inv.fiscalDeductionApplied > 0 ? 'Con rebaja Art. 17' : 'Afecto a IVA')}
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          {formatCLP(inv.totalAmount)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legal Breakdown Card for Current Invoice */}
            <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Análisis de Cumplimiento SII
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
                  {currentSelectedInvoice.dteType === '34' ? 'DTE 34 EXENTA' : 'DTE 33 AFECTA'}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white">
                {currentSelectedInvoice.isFurnished 
                  ? 'Inmueble Amoblado (Gravado con IVA)' 
                  : 'Inmueble Sin Amoblar (Exento de IVA)'}
              </h4>

              <div className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
                <p>
                  <strong className="text-emerald-300">Base Legal:</strong> D.L. N° 825 de 1974, Artículo 8°, letra g) a contrario sensu.
                </p>
                <p className="bg-slate-800/90 p-2.5 rounded border border-slate-700 text-[10.5px] italic text-slate-200">
                  "{currentSelectedInvoice.legalExemptionNote}"
                </p>
                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Condición Mobiliario:</span>
                    <span className="font-semibold text-white">
                      {currentSelectedInvoice.isFurnished ? 'Amoblado / Equipado' : 'Sin amoblar (Vacío)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Instalaciones Industriales:</span>
                    <span className="font-semibold text-white">
                      {currentSelectedInvoice.hasCommercialFacilities ? 'Sí posee' : 'No posee (Obra limpia)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Monto Exento Art. 8g:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCLP(currentSelectedInvoice.exemptTotal)}
                    </span>
                  </div>
                  {currentSelectedInvoice.fiscalDeductionApplied > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Deducción Avalúo (Art. 17):</span>
                      <span className="font-mono font-bold text-emerald-400">
                        -{formatCLP(currentSelectedInvoice.fiscalDeductionApplied)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">IVA (19%):</span>
                    <span className="font-mono font-bold text-amber-400">
                      {formatCLP(currentSelectedInvoice.ivaAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-xs">
                    <span className="text-slate-300 font-bold">Total Facturado:</span>
                    <span className="font-mono font-black text-white">
                      {formatCLP(currentSelectedInvoice.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    downloadDTEInvoicePDF({ invoice: currentSelectedInvoice, companyLogo });
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer active:scale-98"
                >
                  <Download size={14} /> Descargar Esta Factura en PDF
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: High Fidelity DTE Invoice Document (8 cols) */}
          <div className="lg:col-span-8">
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-300 shadow-md relative overflow-hidden font-sans">
              {/* Watermark / Background stamp indicator */}
              <div className="absolute right-6 bottom-40 text-slate-100 font-black text-7xl select-none pointer-events-none -rotate-12 uppercase opacity-40">
                {currentSelectedInvoice.dteType === '34' ? 'DTE 34 EXENTA' : 'DTE 33 AFECTA'}
              </div>

              {/* Header: Emisor (Left) & Red SII Box (Right) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pb-6 border-b border-slate-200">
                <div className="sm:col-span-7 space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                      {currentSelectedInvoice.issuerName}
                    </h2>
                  </div>
                  <p className="text-xs font-bold text-slate-700 uppercase">
                    GIRO: {currentSelectedInvoice.issuerBusiness}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    CASA MATRIZ: {currentSelectedInvoice.issuerAddress}, {currentSelectedInvoice.issuerCommune}, {currentSelectedInvoice.issuerCity}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Fono: {currentSelectedInvoice.issuerPhone} | Email: {currentSelectedInvoice.issuerEmail}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono pt-1">
                    RESOLUCIÓN EXENTA SII N° 45 DE 2003 - FACTURA ELECTRÓNICA
                  </p>
                </div>

                {/* Red SII Box */}
                <div className="sm:col-span-5 flex justify-end">
                  <div className="border-2 border-red-600 rounded p-3 text-center w-full max-w-[240px] bg-red-50/20">
                    <p className="text-xs font-mono font-black text-red-600 tracking-wide">
                      R.U.T.: {currentSelectedInvoice.issuerTaxId}
                    </p>
                    <p className="text-[11px] font-black text-red-600 my-1 uppercase leading-tight">
                      {currentSelectedInvoice.dteType === '34' 
                        ? 'FACTURA NO AFECTA O EXENTA ELECTRÓNICA' 
                        : 'FACTURA ELECTRÓNICA'}
                    </p>
                    <p className="text-sm font-mono font-black text-red-600">
                      N° {String(currentSelectedInvoice.folio).padStart(8, '0')}
                    </p>
                    <p className="text-[9px] font-bold text-red-600 uppercase mt-1">
                      {currentSelectedInvoice.siiOffice}
                    </p>
                  </div>
                </div>
              </div>

              {/* Receptor Information Box */}
              <div className="my-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-8">
                    <span className="font-bold text-slate-500">SEÑOR(ES): </span>
                    <span className="font-bold text-slate-900 uppercase">{currentSelectedInvoice.receiverName}</span>
                  </div>
                  <div className="sm:col-span-4">
                    <span className="font-bold text-slate-500">R.U.T.: </span>
                    <span className="font-bold text-slate-900 font-mono">{currentSelectedInvoice.receiverTaxId}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-8">
                    <span className="font-bold text-slate-500">GIRO: </span>
                    <span className="text-slate-800 uppercase">{currentSelectedInvoice.receiverBusiness}</span>
                  </div>
                  <div className="sm:col-span-4">
                    <span className="font-bold text-slate-500">FECHA EMISIÓN: </span>
                    <span className="font-bold text-slate-900 font-mono">{currentSelectedInvoice.issueDate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-8">
                    <span className="font-bold text-slate-500">DIRECCIÓN: </span>
                    <span className="text-slate-800">{currentSelectedInvoice.receiverAddress}, {currentSelectedInvoice.receiverCommune}</span>
                  </div>
                  <div className="sm:col-span-4">
                    <span className="font-bold text-slate-500">FECHA VTO.: </span>
                    <span className="font-bold text-slate-900 font-mono">{currentSelectedInvoice.dueDate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-slate-200/80">
                  <div className="sm:col-span-8">
                    <span className="font-bold text-slate-500">INMUEBLE ASOCIADO: </span>
                    <span className="font-semibold text-emerald-800">
                      {currentSelectedInvoice.propertyAddress} (Rol SII: {currentSelectedInvoice.propertyRole})
                    </span>
                  </div>
                  <div className="sm:col-span-4">
                    <span className="font-bold text-slate-500">FORMA PAGO: </span>
                    <span className="font-bold text-slate-800">{currentSelectedInvoice.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto my-4 border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-bold text-[11px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3 w-16">Código</th>
                      <th className="py-2.5 px-3">Descripción y Fundamento Legal</th>
                      <th className="py-2.5 px-3 text-center w-14">Cant.</th>
                      <th className="py-2.5 px-3 text-right w-24">P. Unitario</th>
                      <th className="py-2.5 px-3 text-right w-28">Monto Exento</th>
                      <th className="py-2.5 px-3 text-right w-24">Monto Neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {currentSelectedInvoice.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-mono font-bold text-slate-600">{item.code}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{item.description}</p>
                          {item.exemptionLegalCitation && (
                            <p className="text-[10px] text-emerald-700 font-medium mt-0.5 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                              Exención legal: {item.exemptionLegalCitation}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-3 px-3 text-right font-mono">{formatCLP(item.unitPrice)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          {item.exemptAmount > 0 ? formatCLP(item.exemptAmount) : '$0'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {item.taxableAmount > 0 ? formatCLP(item.taxableAmount) : '$0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Certification & Totals Split */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mt-6">
                {/* Left: Legal Exemption Note Box */}
                <div className="sm:col-span-7 bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                    <Scale size={13} className="text-emerald-600" />
                    Certificación de Exención Tributaria (D.L. 825 Art. 8° letra g)
                  </p>
                  <p className="text-[10px] text-slate-600 leading-relaxed font-sans">
                    {currentSelectedInvoice.legalExemptionNote}
                  </p>
                  <div className="pt-2 text-[9.5px] text-slate-500 border-t border-slate-200 space-y-0.5">
                    <p>• Validador SII: Circular N° 37/2020 y Circular N° 42/2021.</p>
                    <p>• Destino del Inmueble: {currentSelectedInvoice.propertyDestination} (Sin instalaciones industriales anexas).</p>
                    <p>• Formulario 29: Se declara en Código 142 (Ventas Exentas) del RCV.</p>
                  </div>
                </div>

                {/* Right: Totals Box */}
                <div className="sm:col-span-5 bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Monto Exento (Art. 8° letra g):</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatCLP(currentSelectedInvoice.exemptTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Monto Neto Afecto:</span>
                    <span className="font-mono text-slate-800">
                      {formatCLP(currentSelectedInvoice.netTaxableTotal)}
                    </span>
                  </div>

                  {currentSelectedInvoice.fiscalDeductionApplied > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
                      <span className="text-[11px]">Rebaja Avalúo Fiscal (Art. 17):</span>
                      <span className="font-mono font-bold">
                        -{formatCLP(currentSelectedInvoice.fiscalDeductionApplied)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">I.V.A. (19%):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCLP(currentSelectedInvoice.ivaAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 px-2.5 bg-slate-900 text-white rounded font-bold text-sm">
                    <span>TOTAL A PAGAR:</span>
                    <span className="font-mono font-black text-emerald-400">
                      {formatCLP(currentSelectedInvoice.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom: Timbre Electrónico DTE (TED) & Acuse de Recibo */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mt-6 pt-6 border-t border-slate-200">
                {/* Simulated Timbre TED */}
                <div className="sm:col-span-7 border border-slate-900 p-3 rounded text-center space-y-1.5 bg-slate-50/50">
                  {/* Barcode visual matrix simulation */}
                  <div className="flex justify-center items-center gap-[2px] h-8 overflow-hidden py-1">
                    {Array.from({ length: 55 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-full ${i % 3 === 0 ? 'w-[3px] bg-slate-900' : (i % 2 === 0 ? 'w-[1.5px] bg-slate-900' : 'w-[1px] bg-slate-400')}`}
                      />
                    ))}
                  </div>
                  <p className="text-[9px] font-black text-slate-900 uppercase">
                    Timbre Electrónico D.T.E. - Res. Ex. SII N° 45 de 2003
                  </p>
                  <p className="text-[8.5px] text-slate-500">
                    Verifique documento en www.sii.cl con el RUT emisor, folio y fecha.
                  </p>
                  <p className="text-[7.5px] font-mono text-slate-400 truncate">
                    CAF SHA-1: {currentSelectedInvoice.siiTedSignature}
                  </p>
                </div>

                {/* Acuse de Recibo Ley 19.983 */}
                <div className="sm:col-span-5 border border-slate-300 p-3 rounded text-[9px] text-slate-600 space-y-1.5 bg-slate-50">
                  <p className="font-black text-slate-800 uppercase tracking-tight">
                    ACUSE DE RECIBO - LEY N° 19.983
                  </p>
                  <p>NOMBRE: ____________________________________</p>
                  <p>R.U.T.:   ____________________________________</p>
                  <p>FECHA:   ____________________________________</p>
                  <p>FIRMA:   ____________________________________</p>
                  <p className="text-[7.5px] text-slate-400 italic">
                    El acuse de recibo acredita la recepción de mercaderías o servicios prestados.
                  </p>
                </div>
              </div>

              {/* Action Toolbar on Bottom */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    DTE Válido para Declaración F29
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {currentSelectedInvoice.id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      downloadDTEInvoicePDF({ invoice: currentSelectedInvoice, companyLogo });
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download size={14} /> Descargar Factura en PDF
                  </button>
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-3 rounded-lg flex items-center gap-1 border border-slate-300 cursor-pointer"
                  >
                    <Printer size={14} /> Imprimir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: SIMULADOR & BANCO DE PRUEBAS DE EMISIÓN                        */}
      {/* ========================================================================= */}
      {activeTab === 'SIMULADOR' && (
        <div className="space-y-5">
          {/* Barra Superior de Control de Modo */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="text-emerald-600" size={20} />
                <h3 className="text-base font-bold text-slate-900">
                  Emisión y Certificación DTE (Sandbox Tributario)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure las variables del arrendamiento según el D.L. 825 Art. 8° letra g) con validación automática y prevención de errores.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSimulatorMode('WIZARD')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    simulatorMode === 'WIZARD'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>Asistente Paso a Paso</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatorMode('SANDBOX')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    simulatorMode === 'SANDBOX'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers size={14} />
                  <span>Modo Directo</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleStartNewEmission}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                title="Reiniciar con valores de prueba limpios"
              >
                <RefreshCw size={13} />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

          {/* VISTA 1: ASISTENTE PASO A PASO (CERO ERRORES) */}
          {simulatorMode === 'WIZARD' ? (
            <div className="space-y-5">
              {/* Stepper Progress Bar */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { step: 1, title: '1. Inmueble & Art. 8g', desc: 'Condición y amoblado' },
                    { step: 2, title: '2. Receptor SII', desc: 'RUT, Razón Social y Giro' },
                    { step: 3, title: '3. Liquidación Tributaria', desc: 'Dictamen de exención e IVA' },
                    { step: 4, title: '4. Auditoría & Emisión', desc: 'Blindaje SII y certificación' }
                  ].map(s => {
                    const isCurrent = wizardStep === s.step;
                    const isDone = wizardStep > s.step;
                    return (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => setWizardStep(s.step)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/20'
                            : isDone
                            ? 'bg-slate-50 border-slate-300 hover:bg-slate-100'
                            : 'bg-white border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          isCurrent 
                            ? 'bg-emerald-600 text-white' 
                            : isDone 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isDone ? <Check size={12} /> : s.step}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs truncate ${isCurrent ? 'text-emerald-950 font-black' : 'text-slate-800 font-bold'}`}>
                            {s.title}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">{s.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wizard Body Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form Col (8 cols) */}
                <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                  {/* PASO 1 */}
                  {wizardStep === 1 && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <div className="border-b pb-3">
                        <span className="text-[10px] font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          PASO 1 DE 4 • DETERMINACIÓN DE HECHO GRAVADO
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">
                          Inmueble y Condición Física (DL 825 Art. 8° letra g)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Seleccione la propiedad y declare su condición de mobiliario. Esta especificación define automáticamente si el canon de arrendamiento queda 100% Exento de IVA o si devenga IVA con derecho a deducción de avalúo fiscal.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Seleccionar Inmueble del Sistema
                          </label>
                          <select
                            value={simPropertyId}
                            onChange={(e) => handlePropertySelect(e.target.value)}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                          >
                            <option value="">-- Ingresar Manualmente --</option>
                            {properties.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.label || p.address} - {formatCLP(p.rentalPrice || 0)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Destino Contractual del Inmueble
                          </label>
                          <select
                            value={simPropertyDestination}
                            onChange={(e) => setSimPropertyDestination(e.target.value as any)}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                          >
                            <option value="HABITACIONAL">Habitacional (Vivienda / Residencial)</option>
                            <option value="OFICINA">Oficina Profesional / Administrativa</option>
                            <option value="COMERCIAL">Local Comercial (Sin instalaciones)</option>
                            <option value="BODEGA">Bodega / Almacenaje</option>
                            <option value="INDUSTRIAL">Planta Industrial</option>
                          </select>
                        </div>
                      </div>

                      {/* Factores Determinantes */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                            <Scale size={14} className="text-emerald-600" />
                            Factores Determinantes de la Exención Tributaria
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            !simIsFurnished 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {!simIsFurnished ? 'Resultado: EXENTO DE IVA' : 'Resultado: AFECTO A IVA 19%'}
                          </span>
                        </div>

                        {/* Toggle Amoblado */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-900">¿El inmueble se entrega AMOBLADO?</p>
                            <p className="text-[11px] text-slate-500">
                              Mobiliario suficiente que permita pernoctar, cocinar o habilitar actividades.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSimIsFurnished(false)}
                              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                !simIsFurnished 
                                  ? 'bg-emerald-600 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              NO (Sin Amoblar - Exento)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimIsFurnished(true)}
                              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                simIsFurnished 
                                  ? 'bg-rose-600 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              SÍ (Amoblado - Afecto)
                            </button>
                          </div>
                        </div>

                        {/* Toggle Instalaciones */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-900">¿Posee instalaciones o maquinarias industriales?</p>
                            <p className="text-[11px] text-slate-500">
                              Infraestructura que permita el desarrollo directo de una actividad fabril.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSimHasFacilities(false)}
                              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                !simHasFacilities 
                                  ? 'bg-emerald-600 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              NO
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimHasFacilities(true)}
                              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                simHasFacilities 
                                  ? 'bg-rose-600 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              SÍ
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Inputs de Valores con ChileanCurrencyInput */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ChileanCurrencyInput
                          label="Canon de Arrendamiento Mensual ($ CLP)"
                          subtitle="Valor contractual acordado"
                          value={simRentAmount}
                          onChange={setSimRentAmount}
                          placeholder="$ 850.000"
                          quickIncrements={[
                            { label: '+50k', amount: 50000 },
                            { label: '+100k', amount: 100000 }
                          ]}
                          presets={[
                            { label: '550k', value: 550000 },
                            { label: '850k', value: 850000 },
                            { label: '1.2M', value: 1200000 },
                            { label: '2.5M', value: 2500000 }
                          ]}
                        />

                        <ChileanCurrencyInput
                          label="Avalúo Fiscal Vigente SII ($ CLP)"
                          subtitle="Rebaja 11% Art. 17 DL 825"
                          value={simFiscalAppraisal}
                          onChange={setSimFiscalAppraisal}
                          placeholder="$ 80.000.000"
                          presets={[
                            { label: '50M', value: 50000000 },
                            { label: '80M', value: 80000000 },
                            { label: '150M', value: 150000000 }
                          ]}
                        />
                      </div>

                      <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          <span>Siguiente: Datos del Receptor (Paso 2)</span>
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PASO 2 */}
                  {wizardStep === 2 && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <div className="border-b pb-3">
                        <span className="text-[10px] font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          PASO 2 DE 4 • RECEPTOR ELECTRÓNICO TRIBUTARIO
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">
                          Datos del Arrendatario / Receptor del DTE
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Ingrese o seleccione la contraparte que recibirá el DTE. El sistema valida el RUT con el algoritmo Módulo 11 del SII para evitar rechazos en el portal tributario.
                        </p>
                      </div>

                      {/* Presets Rápidos */}
                      <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Carga Rápida Demo:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSimReceiverTaxId('77.123.456-7');
                            setSimReceiverName('SERVICIOS Y TECNOLOGÍA CHILE SPA');
                            setSimReceiverBusiness('ASESORÍAS COMPUTACIONALES');
                            setSimReceiverAddress('Av. Apoquindo 4000, Las Condes');
                          }}
                          className="text-[11px] px-2 py-1 bg-white hover:bg-emerald-50 text-slate-700 border border-slate-300 rounded font-semibold transition-all cursor-pointer"
                        >
                          Empresa SpA
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSimReceiverTaxId('16.482.910-K');
                            setSimReceiverName('RODRIGO SILVA GÓMEZ');
                            setSimReceiverBusiness('INGENIERO CONSULTOR');
                            setSimReceiverAddress('Moneda 970, Santiago');
                          }}
                          className="text-[11px] px-2 py-1 bg-white hover:bg-emerald-50 text-slate-700 border border-slate-300 rounded font-semibold transition-all cursor-pointer"
                        >
                          Persona Natural
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSimReceiverTaxId('76.999.888-2');
                            setSimReceiverName('INVERSIONES Y CAPITALES ANDINOS LTDA');
                            setSimReceiverBusiness('INVERSIONES INMOBILIARIAS');
                            setSimReceiverAddress('Av. Vitacura 2670, Las Condes');
                          }}
                          className="text-[11px] px-2 py-1 bg-white hover:bg-emerald-50 text-slate-700 border border-slate-300 rounded font-semibold transition-all cursor-pointer"
                        >
                          Sociedad Ltda
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-800">RUT Receptor</label>
                            {simReceiverTaxId && (
                              validateRUT(simReceiverTaxId) ? (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                                  <CheckCircle2 size={11} /> RUT Válido SII
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Formato: XX.XXX.XXX-X
                                </span>
                              )
                            )}
                          </div>
                          <input
                            type="text"
                            value={simReceiverTaxId}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9kK]/g, '');
                              if (!raw) {
                                setSimReceiverTaxId('');
                              } else if (raw.length <= 9) {
                                setSimReceiverTaxId(formatRUT(raw));
                              }
                            }}
                            placeholder="77.123.456-7"
                            className="w-full text-xs p-2.5 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Razón Social o Nombre Completo
                          </label>
                          <input
                            type="text"
                            value={simReceiverName}
                            onChange={(e) => setSimReceiverName(e.target.value)}
                            placeholder="Ej: Inmobiliaria del Sur SpA"
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Giro Comercial Registrado en SII
                          </label>
                          <input
                            type="text"
                            value={simReceiverBusiness}
                            onChange={(e) => setSimReceiverBusiness(e.target.value)}
                            placeholder="Ej: SERVICIOS PROFESIONALES"
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Dirección Tributaria / Inmueble Arrendado
                          </label>
                          <input
                            type="text"
                            value={simReceiverAddress}
                            onChange={(e) => setSimReceiverAddress(e.target.value)}
                            placeholder="Ej: Av. Apoquindo 4000, Las Condes"
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Período Facturado (Mes y Año del Arriendo)
                        </label>
                        <input
                          type="text"
                          value={simPeriodBilled}
                          onChange={(e) => setSimPeriodBilled(e.target.value)}
                          placeholder="Septiembre 2026"
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {['Enero 2026', 'Febrero 2026', 'Marzo 2026', 'Julio 2026', 'Agosto 2026', 'Septiembre 2026', 'Octubre 2026'].map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setSimPeriodBilled(m)}
                              className={`text-[10px] px-2.5 py-1 rounded-md border font-semibold transition-all cursor-pointer ${
                                simPeriodBilled === m 
                                  ? 'bg-emerald-600 text-white border-emerald-600' 
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="text-slate-600 hover:text-slate-900 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ArrowLeft size={15} />
                          <span>Volver a Inmueble (Paso 1)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setWizardStep(3)}
                          disabled={!simReceiverTaxId || !simReceiverName}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          <span>Siguiente: Liquidación Tributaria (Paso 3)</span>
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PASO 3 */}
                  {wizardStep === 3 && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <div className="border-b pb-3">
                        <span className="text-[10px] font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          PASO 3 DE 4 • DICTAMEN Y DESGLOSE IMPOSITIVO
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">
                          Servicios Anexos y Dictamen Tributario Automático
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Especifique si existen servicios complementarios (administración anexa o mantención) y revise el desglose legal formulado por el motor tributario.
                        </p>
                      </div>

                      <ChileanCurrencyInput
                        label="Servicios Complementarios / Administración Anexa ($ CLP)"
                        subtitle="Siempre gravados con IVA 19% si corresponden a servicios mercantiles"
                        value={simTaxableServices}
                        onChange={setSimTaxableServices}
                        placeholder="$ 0"
                        allowZero={true}
                        quickIncrements={[
                          { label: '+25k', amount: 25000 },
                          { label: '+50k', amount: 50000 }
                        ]}
                        presets={[
                          { label: '$0 (Sin anexos)', value: 0 },
                          { label: '45k', value: 45000 },
                          { label: '85k', value: 85000 }
                        ]}
                      />

                      <div className={`p-4 rounded-xl border ${
                        simTaxAssessment.isExempt 
                          ? 'bg-emerald-50/70 border-emerald-300' 
                          : 'bg-indigo-50/70 border-indigo-300'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                            simTaxAssessment.isExempt 
                              ? 'bg-emerald-200 text-emerald-900 border-emerald-400' 
                              : 'bg-indigo-200 text-indigo-900 border-indigo-400'
                          }`}>
                            EVALUACIÓN AUTOMÁTICA SII
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {simTaxAssessment.dteTypeName}
                          </span>
                        </div>

                        <p className="text-sm font-black text-slate-900">
                          {simTaxAssessment.legalSummary}
                        </p>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {simTaxAssessment.legalCitation}
                        </p>

                        <div className="bg-white p-3.5 rounded-lg border border-slate-200 mt-3 space-y-1.5 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-600">Canon Arriendo:</span>
                            <span className="font-mono font-semibold text-slate-900">{formatCLP(simRentAmount)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-600">Monto Exento (Art. 8g):</span>
                            <span className="font-mono font-semibold text-emerald-600">{formatCLP(simTaxAssessment.calculations.exemptAmount)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-600">Neto Gravado Arriendo:</span>
                            <span className="font-mono font-semibold text-slate-900">{formatCLP(simTaxAssessment.calculations.netTaxableAmount)}</span>
                          </div>
                          {simTaxAssessment.calculations.monthlyFiscalDeduction > 0 && (
                            <div className="flex justify-between py-1 border-b border-slate-100 bg-amber-50/60 px-1 rounded">
                              <span className="text-amber-900">Rebaja Avalúo Fiscal (11% Art. 17):</span>
                              <span className="font-mono font-bold text-amber-700">-{formatCLP(simTaxAssessment.calculations.monthlyFiscalDeduction)}</span>
                            </div>
                          )}
                          {simTaxableServices > 0 && (
                            <div className="flex justify-between py-1 border-b border-slate-100">
                              <span className="text-slate-600">Servicios Complementarios:</span>
                              <span className="font-mono font-semibold text-slate-900">{formatCLP(simTaxableServices)}</span>
                            </div>
                          )}
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-600">Base Imponible IVA:</span>
                            <span className="font-mono font-semibold text-slate-900">{formatCLP(simTaxAssessment.calculations.taxableBase)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-600">IVA 19%:</span>
                            <span className="font-mono font-bold text-indigo-700">{formatCLP(simTaxAssessment.calculations.ivaAmount)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-2 bg-slate-900 text-white rounded font-bold text-sm mt-2">
                            <span>Total Facturado:</span>
                            <span className="font-mono font-black text-emerald-400">
                              {formatCLP(simTaxAssessment.calculations.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="text-slate-600 hover:text-slate-900 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ArrowLeft size={15} />
                          <span>Volver a Receptor (Paso 2)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setWizardStep(4)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          <span>Siguiente: Auditoría y Emisión (Paso 4)</span>
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PASO 4 */}
                  {wizardStep === 4 && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <div className="border-b pb-3">
                        <span className="text-[10px] font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          PASO 4 DE 4 • CERTIFICACIÓN Y EMISIÓN EN SANDBOX
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">
                          Auditoría de Blindaje SII y Emisión Tributaria
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Inspección de las 5 reglas de blindaje tributario antes de emitir y timbrar el DTE con firma electrónica simulada.
                        </p>
                      </div>

                      <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-700 shadow-md">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                              DOCUMENTO POR TIMBRAR
                            </span>
                            <h5 className="text-base font-black text-white">
                              {simTaxAssessment.dteTypeName} (Próximo Folio Correlativo)
                            </h5>
                          </div>
                          <span className="text-xs font-mono font-bold bg-slate-800 px-2.5 py-1 rounded text-slate-300 border border-slate-600">
                            Ambiente: SANDBOX RES. 45
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs">
                          <div>
                            <p className="text-[10px] text-slate-400">Receptor:</p>
                            <p className="font-bold text-slate-100 truncate">{simReceiverName}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">RUT Receptor:</p>
                            <p className="font-mono font-bold text-emerald-400">{simReceiverTaxId}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">Condición Art. 8g:</p>
                            <p className="font-bold text-slate-100">{simIsFurnished ? 'Amoblado (Afecto)' : 'Sin Amoblar (Exento)'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">Total a Facturar:</p>
                            <p className="font-mono font-black text-emerald-400 text-sm">
                              {formatCLP(simTaxAssessment.calculations.totalAmount)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                          <ShieldCheck size={16} className="text-emerald-600" />
                          Verificación de Requisitos de Blindaje Tributario
                        </h5>
                        {simTaxAssessment.checklist.map((c, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                            {c.passed ? (
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-bold text-slate-900">{c.title}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{c.description}</p>
                              {c.recommendation && (
                                <p className="text-[10px] text-amber-700 font-medium mt-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Nota: {c.recommendation}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setWizardStep(3)}
                          className="text-slate-600 hover:text-slate-900 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ArrowLeft size={15} />
                          <span>Volver a Liquidación (Paso 3)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleEmitTestInvoice}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ring-2 ring-emerald-400/40"
                        >
                          <Sparkles size={16} />
                          <span>Emitir y Certificar Factura de Prueba (DTE {simTaxAssessment.dteType})</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Floating Summary (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        ESTADO DE EMISIÓN
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        En Línea SII
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500">Documento:</span>
                        <p className="font-bold text-slate-900">{simTaxAssessment.dteTypeName}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Condición Tributaria:</span>
                        <p className="font-bold text-slate-900">
                          {simIsFurnished ? 'Afecto a IVA 19% (Amoblado)' : '100% Exento de IVA (Sin Amoblar)'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Receptor:</span>
                        <p className="font-bold text-slate-900 truncate">{simReceiverName || 'Pendiente'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Período:</span>
                        <p className="font-bold text-slate-900">{simPeriodBilled}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mt-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Monto Total a Facturar:</span>
                      <p className="text-xl font-black text-emerald-600 mt-0.5">
                        {formatCLP(simTaxAssessment.calculations.totalAmount)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {simTaxAssessment.isExempt ? 'Monto Exento sin recargo de IVA' : `Incluye ${formatCLP(simTaxAssessment.calculations.ivaAmount)} de IVA`}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <BookOpen size={14} className="text-emerald-600" />
                      Fundamento Legal SII
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      "El arrendamiento de inmuebles no agrícolas no amoblados se encuentra no gravado con el Impuesto al Valor Agregado en conformidad a lo dispuesto en el Artículo 8°, letra g) del D.L. N° 825 de 1974."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VISTA 2: MODO DIRECTO SANDBOX */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Simulator Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="text-emerald-600" size={20} />
                <h3 className="text-base font-bold text-slate-900">
                  Banco de Pruebas de Facturación (Sandbox DTE)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ajusta las variables del arriendo para verificar cómo el motor tributario evalúa la condición de amoblado vs sin amoblar y aplica la exención del D.L. 825 Art. 8 letra g.
              </p>
            </div>

            {/* Inmueble & Variables */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b pb-1">
                1. Datos del Inmueble y Condición Física
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cargar desde Propiedad del Sistema
                  </label>
                  <select
                    value={simPropertyId}
                    onChange={(e) => handlePropertySelect(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">-- Ingresar Manualmente --</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.label || p.address} - {formatCLP(p.rentalPrice || 0)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destino del Inmueble
                  </label>
                  <select
                    value={simPropertyDestination}
                    onChange={(e) => setSimPropertyDestination(e.target.value as any)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="HABITACIONAL">Habitacional (Vivienda)</option>
                    <option value="OFICINA">Oficina Profesional / Administrativa</option>
                    <option value="COMERCIAL">Local Comercial (Sin instalaciones)</option>
                    <option value="BODEGA">Bodega / Almacenaje</option>
                    <option value="INDUSTRIAL">Planta Industrial</option>
                  </select>
                </div>
              </div>

              {/* Key Toggles for DL 825 Art 8g */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                  <Scale size={14} className="text-emerald-600" />
                  Criterios Determinantes de la Exención (Art. 8 letra g)
                </p>

                {/* Toggle 1: Amoblado */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-900">¿El inmueble se entrega AMOBLADO?</p>
                    <p className="text-[11px] text-slate-500">
                      Incluye camas, mesas, sillones o mobiliario suficiente para habilitación.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSimIsFurnished(false)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        !simIsFurnished 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      NO (Sin amoblar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimIsFurnished(true)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        simIsFurnished 
                          ? 'bg-rose-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      SÍ (Amoblado)
                    </button>
                  </div>
                </div>

                {/* Toggle 2: Instalaciones Industriales */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-900">¿Posee instalaciones o maquinarias industriales?</p>
                    <p className="text-[11px] text-slate-500">
                      Puentes grúa, transformadores de alta potencia o equipos de explotación comercial.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSimHasFacilities(false)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        !simHasFacilities 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      NO (Sin equipos)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimHasFacilities(true)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        simHasFacilities 
                          ? 'bg-rose-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      SÍ (Con equipos)
                    </button>
                  </div>
                </div>
              </div>

              {/* Amounts and Appraisals */}
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ChileanCurrencyInput
                    label="Canon de Arriendo ($ CLP)"
                    value={simRentAmount}
                    onChange={setSimRentAmount}
                    placeholder="$ 850.000"
                    quickIncrements={[
                      { label: '+100k', amount: 100000 },
                      { label: '+500k', amount: 500000 }
                    ]}
                    presets={[
                      { label: '500k', value: 500000 },
                      { label: '850k', value: 850000 },
                      { label: '1.2M', value: 1200000 },
                      { label: '2.5M', value: 2500000 }
                    ]}
                  />

                  <ChileanCurrencyInput
                    label="Avalúo Fiscal SII ($ CLP)"
                    subtitle="Rebaja 11% Art. 17"
                    value={simFiscalAppraisal}
                    onChange={setSimFiscalAppraisal}
                    placeholder="$ 80.000.000"
                    quickIncrements={[
                      { label: '+10M', amount: 10000000 },
                      { label: '+50M', amount: 50000000 }
                    ]}
                    presets={[
                      { label: '50M', value: 50000000 },
                      { label: '80M', value: 80000000 },
                      { label: '120M', value: 120000000 },
                      { label: '200M', value: 200000000 }
                    ]}
                  />

                  <ChileanCurrencyInput
                    label="Servicios Anexos ($ CLP)"
                    subtitle="Gastos comunes / mantención"
                    value={simTaxableServices}
                    onChange={setSimTaxableServices}
                    placeholder="$ 0"
                    allowZero={true}
                    quickIncrements={[
                      { label: '+25k', amount: 25000 },
                      { label: '+50k', amount: 50000 }
                    ]}
                    presets={[
                      { label: '$0 (Sin anexos)', value: 0 },
                      { label: '45k', value: 45000 },
                      { label: '85k', value: 85000 }
                    ]}
                  />
                </div>
              </div>

              {/* Receiver Information */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b pb-1">
                  2. Datos del Arrendatario / Receptor del DTE
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-800">RUT Receptor</label>
                      {simReceiverTaxId && (
                        validateRUT(simReceiverTaxId) ? (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 size={11} /> RUT Válido SII
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Formato: XX.XXX.XXX-X
                          </span>
                        )
                      )}
                    </div>
                    <div className="relative flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500">
                      <input
                        type="text"
                        value={simReceiverTaxId}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9kK]/g, '');
                          if (!raw) {
                            setSimReceiverTaxId('');
                            return;
                          }
                          setSimReceiverTaxId(formatRUT(raw));
                        }}
                        placeholder="77.123.456-7"
                        className="flex-1 py-1.5 px-2.5 text-xs font-mono font-bold text-slate-900 border-none outline-none"
                      />
                      {simReceiverTaxId && (
                        <button
                          type="button"
                          onClick={() => setSimReceiverTaxId('')}
                          className="px-2 text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer"
                          title="Borrar RUT"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSimReceiverTaxId('77.123.456-7');
                          setSimReceiverName('ARRENDATARIO DE PRUEBA SPA');
                          setSimReceiverBusiness('SERVICIOS PROFESIONALES');
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                      >
                        🏢 Demo SpA (77.123.456-7)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSimReceiverTaxId('15.420.890-K');
                          setSimReceiverName('JUAN CARLOS PÉREZ MORALES');
                          setSimReceiverBusiness('ACTIVIDADES PROFESIONALES');
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                      >
                        👤 Persona Natural (15.420.890-K)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Razón Social</label>
                    <div className="relative flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500">
                      <input
                        type="text"
                        value={simReceiverName}
                        onChange={(e) => setSimReceiverName(e.target.value)}
                        placeholder="Nombre o Razón Social"
                        className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-slate-900 border-none outline-none"
                      />
                      {simReceiverName && (
                        <button
                          type="button"
                          onClick={() => setSimReceiverName('')}
                          className="px-2 text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer"
                          title="Borrar"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => setSimReceiverName('ARRENDATARIO DE PRUEBA SPA')}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 cursor-pointer"
                      >
                        Arrendatario SpA
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimReceiverName('INVERSIONES Y SERVICIOS LTDA')}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 cursor-pointer"
                      >
                        Inversiones Ltda
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Giro Comercial</label>
                    <div className="relative flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500">
                      <input
                        type="text"
                        value={simReceiverBusiness}
                        onChange={(e) => setSimReceiverBusiness(e.target.value)}
                        placeholder="Giro comercial registrado en SII"
                        className="flex-1 py-1.5 px-2.5 text-xs text-slate-900 border-none outline-none"
                      />
                      {simReceiverBusiness && (
                        <button
                          type="button"
                          onClick={() => setSimReceiverBusiness('')}
                          className="px-2 text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer"
                          title="Borrar"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => setSimReceiverBusiness('SERVICIOS PROFESIONALES')}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 cursor-pointer"
                      >
                        Servicios Profesionales
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimReceiverBusiness('OFICINA ADMINISTRATIVA')}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 cursor-pointer"
                      >
                        Oficina
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Período Facturado</label>
                    <div className="relative flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500">
                      <input
                        type="text"
                        value={simPeriodBilled}
                        onChange={(e) => setSimPeriodBilled(e.target.value)}
                        placeholder="Ej: Septiembre 2026"
                        className="flex-1 py-1.5 px-2.5 text-xs text-slate-900 border-none outline-none"
                      />
                      {simPeriodBilled && (
                        <button
                          type="button"
                          onClick={() => setSimPeriodBilled('')}
                          className="px-2 text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer"
                          title="Borrar"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['Septiembre 2026', 'Octubre 2026', 'Noviembre 2026', 'Diciembre 2026'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSimPeriodBilled(m)}
                          className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                            simPeriodBilled === m 
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t">
                <button
                  type="button"
                  onClick={handleEmitTestInvoice}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <Sparkles size={16} />
                  Emitir y Certificar Factura de Prueba (DTE {simTaxAssessment.dteType})
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Tax Engine Assessment (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Verdict Box */}
            <div className={`p-5 rounded-xl border shadow-sm ${
              simTaxAssessment.isExempt 
                ? 'bg-emerald-50/70 border-emerald-300' 
                : 'bg-indigo-50/70 border-indigo-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                  simTaxAssessment.isExempt 
                    ? 'bg-emerald-200 text-emerald-900 border-emerald-400' 
                    : 'bg-indigo-200 text-indigo-900 border-indigo-400'
                }`}>
                  DICTAMEN TRIBUTARIO AUTOMÁTICO
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {simTaxAssessment.dteTypeName}
                </span>
              </div>

              <h4 className="text-base font-black text-slate-900 leading-snug">
                {simTaxAssessment.legalSummary}
              </h4>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {simTaxAssessment.legalCitation}
              </p>

              {/* Calculations Box */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Canon Arriendo Bruto:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatCLP(simTaxAssessment.calculations.rentalAmount)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Monto Exento (Art. 8g):</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatCLP(simTaxAssessment.calculations.exemptAmount)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Monto Neto Afecto:</span>
                  <span className="font-mono text-slate-800">
                    {formatCLP(simTaxAssessment.calculations.netTaxableAmount)}
                  </span>
                </div>

                {simTaxAssessment.calculations.monthlyFiscalDeduction > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
                    <span>Rebaja Avalúo Fiscal (11% Art. 17):</span>
                    <span className="font-mono font-bold">
                      -{formatCLP(simTaxAssessment.calculations.monthlyFiscalDeduction)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Base Imponible IVA:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCLP(simTaxAssessment.calculations.taxableBase)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">IVA (19%):</span>
                  <span className="font-mono font-bold text-amber-600">
                    {formatCLP(simTaxAssessment.calculations.ivaAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 px-2 bg-slate-900 text-white rounded font-bold text-sm">
                  <span>Total Facturado:</span>
                  <span className="font-mono font-black text-emerald-400">
                    {formatCLP(simTaxAssessment.calculations.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Checklist of compliance rules */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                Auditoría de Requisitos para el DTE
              </h4>

              <div className="space-y-2">
                {simTaxAssessment.checklist.map((c, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2 rounded bg-slate-50 border border-slate-150 text-xs">
                    {c.passed ? (
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold text-slate-900">{c.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{c.description}</p>
                      {c.recommendation && (
                        <p className="text-[10px] text-amber-700 font-medium mt-1 bg-amber-50 p-1 rounded">
                          Sugerencia: {c.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: LIBRO DE VENTAS & HISTORIAL DTE                                */}
      {/* ========================================================================= */}
      {activeTab === 'REGISTRO' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" size={20} />
                Libro de Ventas Electrónico & Registro de Facturas DTE
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Trazabilidad de todas las facturas exentas y afectas emitidas y simuladas en el sistema.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por folio, RUT, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg w-56 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={filterDteType}
                onChange={(e) => setFilterDteType(e.target.value)}
                className="text-xs p-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="ALL">Todos los DTE</option>
                <option value="34">DTE 34 (Exentas)</option>
                <option value="33">DTE 33 (Afectas)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B3C5D] text-white font-bold text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-2 w-10 text-center select-none" title="Selector de Fila AssetFlow Enterprise (F4 / Menú Contextual)">#</th>
                  <th className="py-2.5 px-3">DTE</th>
                  <th className="py-2.5 px-3">Folio</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Receptor / Arrendatario</th>
                  <th className="py-2.5 px-3">Inmueble / Condición</th>
                  <th className="py-2.5 px-3 text-right">Mto. Exento (Art. 8g)</th>
                  <th className="py-2.5 px-3 text-right">IVA (19%)</th>
                  <th className="py-2.5 px-3 text-right">Total a Pagar</th>
                  <th className="py-2.5 px-3 text-center">Estado SII</th>
                  <th className="py-2.5 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInvoices.map((inv) => {
                  const isSelected = gridContextMenu?.invoice.id === inv.id;
                  return (
                  <tr 
                    key={inv.id} 
                    onContextMenu={(e) => handleRowContextMenu(e, inv)}
                    className={`transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-cyan-100/90 text-cyan-950 font-bold border-l-4 border-l-[#00E5FF]' 
                        : 'hover:bg-slate-50'
                    }`}
                    title="Clic derecho o clic en [#] para abrir Menú Contextual AssetFlow Enterprise"
                  >
                    <td className="py-2.5 px-2 text-center bg-slate-50 select-none">
                      <button
                        type="button"
                        onClick={(e) => handleRowContextMenu(e, inv)}
                        className="w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-black text-[#0B3C5D] hover:bg-[#0B3C5D] hover:text-white border border-slate-300 hover:border-[#0B3C5D] shadow-2xs transition-all mx-auto"
                        title="Abrir Menú Contextual AssetFlow Enterprise"
                      >
                        #
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        inv.dteType === '34' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        DTE {inv.dteType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      N° {inv.folio}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {inv.issueDate}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900">{inv.receiverName}</p>
                      <p className="text-[10px] font-mono text-slate-400">{inv.receiverTaxId}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="text-slate-800 truncate max-w-xs">{inv.propertyAddress || 'N/A'}</p>
                      <span className={`text-[9.5px] font-semibold ${
                        inv.isFurnished ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        {inv.isFurnished ? '• Amoblado (Afecto)' : '• Sin amoblar (Exento)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatCLP(inv.exemptTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatCLP(inv.ivaAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                      {formatCLP(inv.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={11} /> {inv.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedInvoiceId(inv.id);
                            setActiveTab('EJEMPLO');
                          }}
                          title="Ver Factura de Ejemplo"
                          className="p-1 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenPromptModal(inv)}
                          title="Opciones de Visualización en Pantalla y Descarga PDF"
                          className="p-1 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: FUNDAMENTO LEGAL & CHECKLIST DE AUDITORÍA SII                  */}
      {/* ========================================================================= */}
      {activeTab === 'NORMATIVA' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Legal Framework Article 8g */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Scale size={22} className="text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                Decreto Ley N° 825 de 1974 - Artículo 8°, Letra g)
              </h3>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-3 leading-relaxed">
              <p className="font-bold text-slate-900">Texto del Hecho Gravado Especial:</p>
              <p className="italic bg-white p-3 rounded border border-slate-200 text-slate-800">
                "El arrendamiento, subarrendamiento, usufructo o cualquiera otra forma de cesión del uso o goce temporal de bienes corporales muebles, inmuebles amoblados, inmuebles con instalaciones o maquinarias que permitan el ejercicio de una actividad comercial o industrial y de todo tipo de establecimientos de comercio."
              </p>

              <p className="font-bold text-slate-900 pt-1">Principio Jurídico a Contrario Sensu:</p>
              <p>
                Al gravar la ley expresamente solo los inmuebles <strong>amoblados</strong> o aquellos con <strong>instalaciones/maquinarias para actividad comercial o industrial</strong>, todo arrendamiento de bienes raíces sin muebles (habitacionales, oficinas en obra gruesa, locales sin instalaciones) queda <strong>NO GRAVADO (EXENTO) con IVA</strong>.
              </p>

              <p className="font-bold text-slate-900 pt-1">Jurisprudencia Administrativa del SII:</p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
                <li><strong>Circular N° 37 (2020):</strong> Define que para configurarse el hecho gravado, el mobiliario debe ser suficiente para que el inmueble pueda ser utilizado de inmediato sin necesidad de que el arrendatario aporte enseres esenciales.</li>
                <li><strong>Circular N° 42 (2021):</strong> Regula la deducción del 11% anual del avalúo fiscal vigente en los casos de arriendos amoblados (Art. 17 inc. 2).</li>
                <li><strong>Oficio N° 1.542 (2020):</strong> Confirma que oficinas entregadas sin mobiliario gozan de exención automática de IVA.</li>
              </ul>
            </div>
          </div>

          {/* Practical Audit Checklist */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={22} className="text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                Checklist de Blindaje ante Fiscalizaciones del SII
              </h3>
            </div>

            <p className="text-xs text-slate-500">
              Para garantizar que el SII no formule liquidaciones de IVA ni reclasifique arriendos exentos en fiscalizaciones del Formulario 29, se deben verificar estos 5 pilares:
            </p>

            <div className="space-y-3">
              {[
                {
                  step: '01',
                  title: 'Cláusula Expresa en Contrato de Arriendo',
                  desc: 'El contrato de arrendamiento (registrado en notaría o con Firma Electrónica Avanzada) debe estipular taxativamente que la unidad se arrienda "completamente desocupada, sin muebles ni enseres".'
                },
                {
                  step: '02',
                  title: 'Acta de Entrega Recepción en Terreno',
                  desc: 'Contar con acta de inspección física inicial con registro fotográfico que certifique que el inmueble fue recibido vacío por el inquilino (disponible en el módulo de Revisión de Propiedades P1501RV).'
                },
                {
                  step: '03',
                  title: 'Emisión con Factura Exenta (DTE Tipo 34)',
                  desc: 'Los cánones de arriendo exentos deben facturarse mediante el DTE Tipo 34 del SII o Boleta Exenta (Tipo 39/41), jamás como Factura Afecta (DTE 33) con IVA en tasa 0% ficticia.'
                },
                {
                  step: '04',
                  title: 'Separación Estricta de Servicios Complementarios',
                  desc: 'Si se cobran gastos comunes, administración o mantención técnica, estos deben facturarse en líneas separadas como afectos a IVA (19%) o en una factura independiente.'
                },
                {
                  step: '05',
                  title: 'Declaración Cuadrada en Formulario 29',
                  desc: 'El total de facturas exentas emitidas debe coincidir con el Registro de Ventas (RCV) del SII y declararse en la Línea 21 (Códigos 142 y 584) del F29 mensual.'
                }
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-mono font-black text-emerald-600 text-xs bg-emerald-100 px-2 py-1 rounded">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{item.title}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AssetFlow Enterprise Floating Grid Context Menu (P4210DTE) */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P4210DTE"
          programTitle={`Facturación DTE SII [W4210D] • Folio #${gridContextMenu.invoice.folio} (Tipo ${gridContextMenu.invoice.dteType})`}
          collectionName="dte_invoices"
          recordKey={`DTE ${gridContextMenu.invoice.dteType} #${gridContextMenu.invoice.folio} [${gridContextMenu.invoice.receiverName}]`}
          recordData={gridContextMenu.invoice}
          currentStatus={gridContextMenu.invoice.status}
          statusOptions={[
            { label: 'ACEPTADO (SII Certificado)', value: 'ACEPTADO', color: 'bg-emerald-600' },
            { label: 'ENVIADO (Pendiente SII)', value: 'ENVIADO', color: 'bg-amber-600' },
            { label: 'ANULADO (Nota de Crédito)', value: 'ANULADO', color: 'bg-rose-600' }
          ]}
          onClose={() => setGridContextMenu(null)}
          onViewDetails={() => {
            setSelectedInvoiceId(gridContextMenu.invoice.id);
            setActiveTab('EJEMPLO');
            setGridContextMenu(null);
          }}
          onPrint={() => {
            handleOpenPromptModal(gridContextMenu.invoice);
            setGridContextMenu(null);
          }}
          rowExits={[
            {
              label: 'Ver Factura / Visualización Tributaria',
              shortcut: 'Enter',
              onClick: () => {
                setSelectedInvoiceId(gridContextMenu.invoice.id);
                setActiveTab('EJEMPLO');
                setGridContextMenu(null);
              }
            },
            {
              label: 'Exportar Factura Electrónica a PDF',
              shortcut: 'Ctrl+P',
              onClick: () => {
                handleOpenPromptModal(gridContextMenu.invoice);
                setGridContextMenu(null);
              }
            },
            {
              label: 'Emitir Comprobante de Ingreso / Voucher',
              shortcut: 'Ctrl+E',
              onClick: () => {
                emitDTEInvoiceVoucher(gridContextMenu.invoice);
                setGridContextMenu(null);
              }
            }
          ]}
        />
      )}
    </div>
  );
};

export default FacturacionDTEModule;
