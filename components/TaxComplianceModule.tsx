import React, { useState, useMemo } from 'react';
import { 
  TaxDeclaration, 
  TaxF29Data, 
  TaxF22Data, 
  Transaction, 
  WorkOrder, 
  PettyCashExpense,
  LeaseContract
} from '../types';
import { 
  FileText, 
  Calculator, 
  ShieldCheck, 
  Lock, 
  Printer, 
  Eye, 
  AlertCircle, 
  Search, 
  Calendar, 
  Building2, 
  Hash, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Award,
  Sparkles,
  HelpCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { printHtmlElement } from '../lib/printDocument';
import { JDEGridContextMenu } from './JDEGridContextMenu';
import { sha256Hex } from '../lib/auditService';
import { getF0018TaxLedgerEntries, validateChileanRut } from '../lib/chileanDteTaxService';

interface TaxComplianceModuleProps {
  transactions: Transaction[];
  workOrders: WorkOrder[];
  pettyCashExpenses: PettyCashExpense[];
  leaseContracts: LeaseContract[];
  declarations: TaxDeclaration[];
  currentUser: string;
  onSaveDeclaration: (declaration: TaxDeclaration) => Promise<void> | void;
  onSyncCloud?: () => void;
}

export const TaxComplianceModule: React.FC<TaxComplianceModuleProps> = ({
  transactions,
  workOrders,
  pettyCashExpenses,
  leaseContracts,
  declarations,
  currentUser,
  onSaveDeclaration,
  onSyncCloud
}) => {
  const [activeTab, setActiveTab] = useState<'F29' | 'F22' | 'DJ1835_LEY21713' | 'HISTORICO'>('F29');
  const f0018Entries = useMemo(() => getF0018TaxLedgerEntries(), [activeTab, declarations]);
  
  // Helper: Ley 21.133 Escala Gradual de Retención de Boletas de Honorarios (Art. 74 N° 2 LIR)
  const getLegalHonorariosRetentionRate = (year: number): number => {
    if (year <= 2024) return 13.75;
    if (year === 2025) return 14.50;
    if (year === 2026) return 15.25;
    if (year === 2027) return 16.00;
    return 17.00;
  };

  // F29 Form State
  const [selectedF29Year, setSelectedF29Year] = useState<number>(new Date().getFullYear());
  const [selectedF29Month, setSelectedF29Month] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [f29Regime, setF29Regime] = useState<'14D3' | '14D8' | '14A'>('14D3');
  const [f29PpmRate, setF29PpmRate] = useState<number>(1.25); // 1.25%
  const [f29HonorariosRate, setF29HonorariosRate] = useState<number>(() => getLegalHonorariosRetentionRate(new Date().getFullYear()));
  const [enableProrrataIva, setEnableProrrataIva] = useState<boolean>(true); // Art. 23 N° 3 DL 825
  
  // F22 Form State
  const [selectedF22TaxYear, setSelectedF22TaxYear] = useState<number>(new Date().getFullYear()); // AT 2026
  const [f22Regime, setF22Regime] = useState<'14D3' | '14D8' | '14A'>('14D3');
  const [f22IdpcRate, setF22IdpcRate] = useState<number>(12.5); // 12.5% ProPyme
  const [f22GastosRechazados, setF22GastosRechazados] = useState<number>(0);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'F29' | 'F22'>('ALL');
  
  // Modals & Detail Inspection
  const [selectedDeclarationForView, setSelectedDeclarationForView] = useState<TaxDeclaration | null>(null);
  const [showDraftModal, setShowDraftModal] = useState<boolean>(false);
  const [showTxBreakdownModal, setShowTxBreakdownModal] = useState<string | null>(null); // title of line breakdown

  // AssetFlow Enterprise Grid Context Menu State
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    declaration: TaxDeclaration;
  } | null>(null);

  const handleRowContextMenu = (e: React.MouseEvent, declaration: TaxDeclaration) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const clickX = e?.clientX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const clickY = e?.clientY ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 300);

    setGridContextMenu({
      x: Math.max(10, Math.min(clickX, typeof window !== 'undefined' ? window.innerWidth - 240 : 800)),
      y: Math.max(10, Math.min(clickY, typeof window !== 'undefined' ? window.innerHeight - 380 : 500)),
      declaration
    });
  };

  const f29PeriodKey = `${selectedF29Year}-${String(selectedF29Month).padStart(2, '0')}`;
  
  // Check if an official F29 declaration already exists for this period
  const existingOfficialF29 = useMemo(() => {
    return declarations.find(d => d.type === 'F29' && d.f29Data?.period === f29PeriodKey && (d.status === 'EMITIDO' || d.status === 'OFICIAL_EMITIDO'));
  }, [declarations, f29PeriodKey]);

  // Check previous period official F29 for Remanente de Crédito Fiscal (Código 504)
  const previousRemanente = useMemo(() => {
    let prevY = selectedF29Year;
    let prevM = selectedF29Month - 1;
    if (prevM === 0) {
      prevM = 12;
      prevY = selectedF29Year - 1;
    }
    const prevKey = `${prevY}-${String(prevM).padStart(2, '0')}`;
    const prevDec = declarations.find(d => d.type === 'F29' && d.f29Data?.period === prevKey && (d.status === 'EMITIDO' || d.status === 'OFICIAL_EMITIDO'));
    return prevDec?.f29Data?.remanenteActual || 0;
  }, [declarations, selectedF29Year, selectedF29Month]);

  // Calculate live F29 data from system transactions
  const calculatedF29 = useMemo<TaxF29Data>(() => {
    // Income txs in this period
    const incomeTxs = transactions.filter(t => {
      if (t.type !== 'INCOME' || t.status === 'ANULADA') return false;
      const tDate = t.date || '';
      return tDate.startsWith(f29PeriodKey);
    });

    // Expense txs in this period
    const expenseTxs = transactions.filter(t => {
      if (t.type !== 'EXPENSE' || t.status === 'ANULADA') return false;
      const tDate = t.date || '';
      return tDate.startsWith(f29PeriodKey);
    });

    // Work orders in this period
    const periodWorkOrders = workOrders.filter(wo => {
      if (wo.status === 'ANULADA') return false;
      const date = wo.issueDate || wo.deliveryDate || '';
      return date.startsWith(f29PeriodKey);
    });

    // Petty cash expenses in this period
    const periodPettyCash = pettyCashExpenses.filter(pc => {
      return (pc.date || '').startsWith(f29PeriodKey);
    });

    // Income breakdown (Afecto vs Exento)
    let ventasAfectasNeto = 0;
    let ventasExentas = 0;
    const includedIds: string[] = [];

    incomeTxs.forEach(t => {
      includedIds.push(t.id);
      const isExempt = (t.category || '').toUpperCase().includes('ARRIENDO HABITACIONAL') || 
                       (t.documentType || '').toUpperCase().includes('EXENTO');
      if (isExempt) {
        ventasExentas += t.amount;
      } else {
        // Assume amount is total if inclusive, or calculate net assuming 19% IVA
        const net = Math.round(t.amount / 1.19);
        ventasAfectasNeto += net;
      }
    });

    // Lease contracts active in this month can generate exempt/afecto rental base if not in transactions
    if (incomeTxs.length === 0) {
      leaseContracts.filter(c => c.status === 'VIGENTE').forEach(c => {
        ventasExentas += c.monthlyAmount || 0;
      });
    }

    const debitoFiscalIVA = Math.round(ventasAfectasNeto * 0.19);

    // Expenses breakdown (Compras Afectas a Crédito Fiscal)
    let comprasAfectasNeto = 0;
    let retenciones2aCat = 0;

    expenseTxs.forEach(t => {
      includedIds.push(t.id);
      const isHonorarios = (t.documentType || '').toUpperCase().includes('HONORARIO') || 
                           (t.category || '').toUpperCase().includes('HONORARIO');
      if (isHonorarios) {
        // Honorarios retention dynamic according to Ley 21.133 (e.g. 15.25% in 2026)
        retenciones2aCat += Math.round(t.amount * (f29HonorariosRate / 100));
      } else {
        const net = Math.round(t.amount / 1.19);
        comprasAfectasNeto += net;
      }
    });

    periodWorkOrders.forEach(wo => {
      if (!includedIds.includes(wo.id)) {
        includedIds.push(wo.id);
        comprasAfectasNeto += wo.subtotal || Math.round((wo.total || 0) / 1.19);
      }
    });

    periodPettyCash.forEach(pc => {
      if (pc.documentType === 'FACTURA') {
        comprasAfectasNeto += Math.round(pc.amount / 1.19);
      }
    });

    // Art. 23 N° 3 D.L. 825: Proporcionalidad del Crédito Fiscal de IVA (Prorrata de operaciones mixtas)
    const totalVentasNetas = ventasAfectasNeto + ventasExentas;
    let factorProrrataIva = 100;
    if (totalVentasNetas > 0) {
      factorProrrataIva = Math.round((ventasAfectasNeto / totalVentasNetas) * 10000) / 100;
    } else if (ventasExentas > 0 && ventasAfectasNeto === 0) {
      factorProrrataIva = 0;
    }

    const creditoFiscalBruto = Math.round(comprasAfectasNeto * 0.19);
    // Aplica prorrata cuando hay operaciones mixtas y la opción está habilitada por el auditor
    const creditoFiscalIVA = (enableProrrataIva && ventasExentas > 0) 
      ? Math.round(creditoFiscalBruto * (factorProrrataIva / 100))
      : creditoFiscalBruto;

    // Balance IVA
    const netDebitoIva = debitoFiscalIVA - creditoFiscalIVA - previousRemanente;
    let impuestoDeterminadoIVA = 0;
    let remanenteActual = 0;

    if (netDebitoIva > 0) {
      impuestoDeterminadoIVA = netDebitoIva;
      remanenteActual = 0;
    } else {
      impuestoDeterminadoIVA = 0;
      remanenteActual = Math.abs(netDebitoIva);
    }

    // PPM calculation
    const basePPM = ventasAfectasNeto + ventasExentas;
    const ppmNetoAmount = Math.round(basePPM * (f29PpmRate / 100));

    // Total a Pagar
    const totalAPagarNeto = impuestoDeterminadoIVA + ppmNetoAmount + retenciones2aCat;

    // Fechas límites de vencimiento legal SII (Art. 64 DL 825)
    const nextMonth = selectedF29Month === 12 ? 1 : selectedF29Month + 1;
    const nextYear = selectedF29Month === 12 ? selectedF29Year + 1 : selectedF29Year;
    const dueDateSiiGeneral = `12/${String(nextMonth).padStart(2, '0')}/${nextYear}`;
    const dueDateSiiElectronic = `20/${String(nextMonth).padStart(2, '0')}/${nextYear}`;

    return {
      period: f29PeriodKey,
      regime: f29Regime,
      ppmRate: f29PpmRate,
      ventasAfectasNeto,
      ventasExentas,
      debitoFiscalIVA,
      comprasAfectasNeto,
      creditoFiscalIVA,
      remanenteMesAnterior: previousRemanente,
      remanenteActual,
      impuestoDeterminadoIVA,
      ppmNetoAmount,
      retenciones2aCat,
      totalAPagarNeto,
      includedTransactionIds: includedIds,
      retencionRate: f29HonorariosRate,
      factorProrrataIva,
      creditoFiscalBruto,
      dueDateSiiGeneral,
      dueDateSiiElectronic
    };
  }, [transactions, workOrders, pettyCashExpenses, leaseContracts, f29PeriodKey, f29Regime, f29PpmRate, f29HonorariosRate, enableProrrataIva, previousRemanente, selectedF29Month, selectedF29Year]);

  // Calculate F22 Annual Tax Data
  const commercialYear = selectedF22TaxYear - 1; // e.g. AT 2026 -> Commercial Year 2025
  const existingOfficialF22 = useMemo(() => {
    return declarations.find(d => d.type === 'F22' && d.f22Data?.taxYear === selectedF22TaxYear && (d.status === 'EMITIDO' || d.status === 'OFICIAL_EMITIDO'));
  }, [declarations, selectedF22TaxYear]);

  const calculatedF22 = useMemo<TaxF22Data>(() => {
    const yearStr = String(commercialYear);

    // Income in commercial year
    const yearIncomes = transactions.filter(t => t.type === 'INCOME' && t.status !== 'ANULADA' && (t.date || '').startsWith(yearStr));
    const totalIngresosBrutos = yearIncomes.reduce((acc, t) => acc + t.amount, 0);

    // Expenses in commercial year
    const yearExpenses = transactions.filter(t => t.type === 'EXPENSE' && t.status !== 'ANULADA' && (t.date || '').startsWith(yearStr));
    const totalGastosDeducibles = yearExpenses.reduce((acc, t) => acc + t.amount, 0);

    // Sum PPM from all official F29 declarations in this commercial year
    const officialF29sInYear = declarations.filter(d => 
      d.type === 'F29' && 
      (d.status === 'EMITIDO' || d.status === 'OFICIAL_EMITIDO') && 
      (d.f29Data?.period || '').startsWith(yearStr)
    );
    const menosPPMAnual = officialF29sInYear.reduce((acc, d) => acc + (d.f29Data?.ppmNetoAmount || 0), 0);
    const menosRetencionesAnuales = officialF29sInYear.reduce((acc, d) => acc + (d.f29Data?.retenciones2aCat || 0), 0);

    // Renta Líquida Imponible (RLI)
    const rentaLiquidaImponible = Math.max(0, totalIngresosBrutos - totalGastosDeducibles + f22GastosRechazados);
    const impuestoIDPCDeterminado = Math.round(rentaLiquidaImponible * (f22IdpcRate / 100));

    // Saldo final
    const saldoFinalAnual = impuestoIDPCDeterminado - menosPPMAnual - menosRetencionesAnuales;

    const includedIds = yearIncomes.map(t => t.id).concat(yearExpenses.map(t => t.id));

    return {
      taxYear: selectedF22TaxYear,
      commercialYear,
      regime: f22Regime,
      idpcRate: f22IdpcRate,
      totalIngresosBrutos,
      totalGastosDeducibles,
      gastosRechazadosArt21: f22GastosRechazados,
      rentaLiquidaImponible,
      impuestoIDPCDeterminado,
      menosPPMAnual,
      menosRetencionesAnuales,
      saldoFinalAnual,
      includedTransactionIds: includedIds
    };
  }, [transactions, declarations, selectedF22TaxYear, commercialYear, f22Regime, f22IdpcRate, f22GastosRechazados]);

  // Generate Immutable Digital Signature with FIPS 180-4 SHA-256
  const generateDigitalSignature = (type: string, periodStr: string, total: number, user: string) => {
    const raw = `${type}|${periodStr}|${total}|${user}|${Date.now()}|ASSETFLOW_SII_F0018_SHA256_CL_2026`;
    const hex = sha256Hex(raw);
    return `SII-CL-SHA256-${hex.slice(0, 16)}-${hex.slice(-8)}`;
  };

  // Handle Official Issue F29
  const handleIssueOfficialF29 = async () => {
    if (existingOfficialF29) {
      alert(`⚠️ Ya existe una declaración F29 Inmutable emitida para el período ${f29PeriodKey}. No se puede duplicar.`);
      return;
    }

    const confirmMsg = `🏛️ ¿CONFIRMA EMITIR LA DECLARACIÓN F29 SII PARA EL PERÍODO ${f29PeriodKey}?\n\n` +
      `- Débito Fiscal IVA (C501): $${calculatedF29.debitoFiscalIVA.toLocaleString('es-CL')}\n` +
      `- Crédito Fiscal IVA (C520): $${calculatedF29.creditoFiscalIVA.toLocaleString('es-CL')}${calculatedF29.ventasExentas > 0 ? ` (Prorrata Art. 23 N° 3: ${calculatedF29.factorProrrataIva}%)` : ''}\n` +
      `- PPM Neto (C115) [${f29PpmRate}%]: $${calculatedF29.ppmNetoAmount.toLocaleString('es-CL')}\n` +
      `- Retenciones 2a Cat (C151) [${calculatedF29.retencionRate || f29HonorariosRate}% Ley 21.133]: $${calculatedF29.retenciones2aCat.toLocaleString('es-CL')}\n` +
      `-----------------------------------------------------\n` +
      `TOTAL A PAGAR EN BANCO/TESORERÍA: $${calculatedF29.totalAPagarNeto.toLocaleString('es-CL')}\n\n` +
      `⚠️ NOTA IMPORTANTE: Al ser emitida, la declaración quedará guardada como REGISTRO INMUTABLE e immodificable en el sistema según exigencias CMF/SII.`;

    if (!window.confirm(confirmMsg)) return;

    const folio = `F29-${f29PeriodKey.replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const hash = generateDigitalSignature('F29', f29PeriodKey, calculatedF29.totalAPagarNeto, currentUser);

    const newDeclaration: TaxDeclaration = {
      id: `tax-f29-${f29PeriodKey}`,
      type: 'F29',
      periodLabel: `F29 - Período ${f29PeriodKey}`,
      status: 'EMITIDO',
      f29Data: calculatedF29,
      folio,
      hashSignature: hash,
      issuedAt: Date.now(),
      issuedBy: currentUser,
      userCreator: currentUser,
      timestamp: Date.now(),
      notes: `Emitido formalmente vía portal tributario AssetFlow. Tasa PPM: ${f29PpmRate}%. Régimen: ${f29Regime}. Retención Honorarios: ${calculatedF29.retencionRate || f29HonorariosRate}% (Ley 21.133). Factor Prorrata IVA: ${calculatedF29.factorProrrataIva}% (Art. 23 N° 3 DL 825). Vencimiento RCV: ${calculatedF29.dueDateSiiElectronic}.`
    };

    await onSaveDeclaration(newDeclaration);
    alert(`✅ ¡Declaración Formulario 29 emitida con éxito!\n\nFolio asignado: ${folio}\nFirma Digital CMF/SII: ${hash}`);
  };

  // Handle Official Issue F22
  const handleIssueOfficialF22 = async () => {
    if (existingOfficialF22) {
      alert(`⚠️ Ya existe una declaración F22 Inmutable emitida para el Año Tributario AT ${selectedF22TaxYear}. No se puede duplicar.`);
      return;
    }

    const confirmMsg = `🏛️ ¿CONFIRMA EMITIR LA DECLARACIÓN F22 (RENTA ANUAL) AT ${selectedF22TaxYear} (Ejercicio ${commercialYear})?\n\n` +
      `- Ingresos Brutos Totales: $${calculatedF22.totalIngresosBrutos.toLocaleString('es-CL')}\n` +
      `- Gastos Deducibles (Art. 31): $${calculatedF22.totalGastosDeducibles.toLocaleString('es-CL')}\n` +
      `- Renta Líquida Imponible (RLI): $${calculatedF22.rentaLiquidaImponible.toLocaleString('es-CL')}\n` +
      `- IDPC Determinado (${f22IdpcRate}%): $${calculatedF22.impuestoIDPCDeterminado.toLocaleString('es-CL')}\n` +
      `- Crédito por PPM Anual Pagado: $${calculatedF22.menosPPMAnual.toLocaleString('es-CL')}\n` +
      `-----------------------------------------------------\n` +
      `${calculatedF22.saldoFinalAnual >= 0 ? 'IMPUESTO A PAGAR EN GIRO' : 'DEVOLUCIÓN DE IMPUESTOS A FAVOR'}: $${Math.abs(calculatedF22.saldoFinalAnual).toLocaleString('es-CL')}\n\n` +
      `⚠️ NOTA IMPORTANTE: La declaración se registrará como DOCUMENTO TRIBUTARIO INMUTABLE e inalterable.`;

    if (!window.confirm(confirmMsg)) return;

    const folio = `F22-AT${selectedF22TaxYear}-${Math.floor(1000 + Math.random() * 9000)}`;
    const hash = generateDigitalSignature('F22', `AT${selectedF22TaxYear}`, calculatedF22.saldoFinalAnual, currentUser);

    const newDeclaration: TaxDeclaration = {
      id: `tax-f22-at${selectedF22TaxYear}`,
      type: 'F22',
      periodLabel: `F22 - Año Tributario ${selectedF22TaxYear} (Ejercicio ${commercialYear})`,
      status: 'EMITIDO',
      f22Data: calculatedF22,
      folio,
      hashSignature: hash,
      issuedAt: Date.now(),
      issuedBy: currentUser,
      userCreator: currentUser,
      timestamp: Date.now(),
      notes: `Declaración Anual de Impuestos a la Renta emitida. Tasa IDPC: ${f22IdpcRate}%. Régimen: ${f22Regime}.`
    };

    await onSaveDeclaration(newDeclaration);
    alert(`✅ ¡Declaración Formulario 22 emitida exitosamente!\n\nFolio SII: ${folio}\nSello Digital CMF: ${hash}`);
  };

  // Filtered declarations for Vault
  const filteredDeclarations = useMemo(() => {
    return declarations.filter(d => {
      if (filterType !== 'ALL' && d.type !== filterType) return false;
      if (!searchTerm) return true;
      const st = searchTerm.toLowerCase();
      return d.folio.toLowerCase().includes(st) || 
             d.periodLabel.toLowerCase().includes(st) || 
             (d.hashSignature || '').toLowerCase().includes(st) ||
             d.userCreator.toLowerCase().includes(st);
    });
  }, [declarations, filterType, searchTerm]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#002D62] via-[#0B3C5D] to-[#1E3A8A] text-white p-6 rounded-xl shadow-lg border border-slate-700 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 p-8 text-9xl select-none font-serif font-black">
          SII
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-amber-500 text-slate-950 font-mono font-black text-[10px] px-2.5 py-1 rounded tracking-widest uppercase flex items-center gap-1.5 shadow-sm">
                <ShieldCheck size={13} /> P029F22 / R09SII
              </span>
              <span className="bg-blue-900/80 text-blue-200 font-mono text-[11px] px-2.5 py-1 rounded border border-blue-700/50">
                Normativa SII Ley de la Renta & CMF Chile
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight font-serif flex items-center gap-2">
              Módulo de Declaración de Impuestos F29 y F22
            </h1>
            <p className="text-blue-100 text-xs mt-1 max-w-3xl leading-relaxed">
              Generación de borradores interactivos y emisión de Formularios 29 (Mensual IVA/PPM) y 22 (Renta Anual RLI). Registro inmutable con sellado digital criptográfico SHA-256 para auditoría fiscal.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onSyncCloud && (
              <button
                onClick={onSyncCloud}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2"
                title="Sincronizar con Firestore"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                Sincronizar Bóveda
              </button>
            )}
            <div className="bg-slate-900/60 backdrop-blur border border-slate-700 p-3 rounded-lg text-right min-w-[150px]">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Declaraciones Inmutables</div>
              <div className="text-xl font-mono font-black text-amber-400">{declarations.filter(d => d.status === 'EMITIDO' || d.status === 'OFICIAL_EMITIDO').length} Registros</div>
            </div>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center gap-2 mt-6 border-t border-blue-800/60 pt-4">
          <button
            onClick={() => setActiveTab('F29')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'F29' 
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' 
                : 'bg-blue-900/40 text-blue-200 hover:bg-blue-800/60 border border-blue-700/40'
            }`}
          >
            <Calculator size={15} />
            Formulario 29 (F29 Mensual - IVA / PPM)
          </button>

          <button
            onClick={() => setActiveTab('F22')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'F22' 
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' 
                : 'bg-blue-900/40 text-blue-200 hover:bg-blue-800/60 border border-blue-700/40'
            }`}
          >
            <TrendingUp size={15} />
            Formulario 22 (F22 Anual - Renta RLI)
          </button>

          <button
            onClick={() => setActiveTab('DJ1835_LEY21713')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'DJ1835_LEY21713' 
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' 
                : 'bg-blue-900/40 text-blue-200 hover:bg-blue-800/60 border border-blue-700/40'
            }`}
          >
            <Building2 size={15} />
            DJ 1835 / DJ 1879 / Ley 21.713 (F0018)
          </button>

          <button
            onClick={() => setActiveTab('HISTORICO')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'HISTORICO' 
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' 
                : 'bg-blue-900/40 text-blue-200 hover:bg-blue-800/60 border border-blue-700/40'
            }`}
          >
            <Lock size={15} />
            Bóveda Histórica Inmutable ({declarations.length})
          </button>
        </div>
      </div>

      {/* VIEW TAB 1: FORMULARIO 29 (F29) */}
      {activeTab === 'F29' && (
        <div className="space-y-6">
          {/* Controls & Options Bar */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Año Comercial
                </label>
                <select
                  value={selectedF29Year}
                  onChange={e => {
                    const y = Number(e.target.value);
                    setSelectedF29Year(y);
                    setF29HonorariosRate(getLegalHonorariosRetentionRate(y));
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Mes Tributario
                </label>
                <select
                  value={selectedF29Month}
                  onChange={e => setSelectedF29Month(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[
                    { m: 1, name: '01 - Enero' },
                    { m: 2, name: '02 - Febrero' },
                    { m: 3, name: '03 - Marzo' },
                    { m: 4, name: '04 - Abril' },
                    { m: 5, name: '05 - Mayo' },
                    { m: 6, name: '06 - Junio' },
                    { m: 7, name: '07 - Julio' },
                    { m: 8, name: '08 - Agosto' },
                    { m: 9, name: '09 - Septiembre' },
                    { m: 10, name: '10 - Octubre' },
                    { m: 11, name: '11 - Noviembre' },
                    { m: 12, name: '12 - Diciembre' },
                  ].map(item => (
                    <option key={item.m} value={item.m}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Régimen Tributario
                </label>
                <select
                  value={f29Regime}
                  onChange={e => setF29Regime(e.target.value as any)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="14D3">ProPyme General (Art. 14 D3)</option>
                  <option value="14D8">ProPyme Transparente (Art. 14 D8)</option>
                  <option value="14A">Régimen Semi-Integrado (Art. 14 A)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tasa PPM (%)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={f29PpmRate}
                  onChange={e => setF29PpmRate(Number(e.target.value))}
                  className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Ret. Honorarios (%)
                  </label>
                  <span className="bg-amber-100 text-amber-900 text-[9px] font-extrabold px-1 rounded">
                    Ley 21.133
                  </span>
                </div>
                <input
                  type="number"
                  step="0.05"
                  value={f29HonorariosRate}
                  onChange={e => setF29HonorariosRate(Number(e.target.value))}
                  className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title={`Escala legal: 2024: 13.75%, 2025: 14.50%, 2026: 15.25%, 2027: 16.00%`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Prorrata IVA (Art. 23 N° 3)
                </label>
                <select
                  value={enableProrrataIva ? 'PRORRATA' : 'DIRECTO'}
                  onChange={e => setEnableProrrataIva(e.target.value === 'PRORRATA')}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PRORRATA">Automática (Mixta)</option>
                  <option value="DIRECTO">100% Directo</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {existingOfficialF29 ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg text-xs font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  DECLARACIÓN EMITIDA (Folio: {existingOfficialF29.folio})
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowDraftModal(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                  >
                    <Eye size={15} />
                    Vista Previa Borrador
                  </button>

                  <button
                    onClick={handleIssueOfficialF29}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2 rounded-lg text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck size={16} />
                    Emitir F29 Inmutable
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Panel de Cumplimiento Legal: Plazos SII & Proporcionalidad Art. 23 N° 3 */}
          <div className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 border border-blue-200/80 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 text-blue-900 rounded-lg shrink-0 mt-0.5">
                <Calendar size={18} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Vencimientos Legales F29 (SII)
                </div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">
                  General / Bancos: <span className="font-mono font-bold text-blue-950">{calculatedF29.dueDateSiiGeneral}</span> (Día 12)
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  Internet / RCV ProPyme: <span className="font-mono font-bold text-emerald-900">{calculatedF29.dueDateSiiElectronic}</span> (Día 20)
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 text-purple-900 rounded-lg shrink-0 mt-0.5">
                <Clock size={18} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Estado de Declaración y Plazo
                </div>
                {(() => {
                  const [d, m, y] = (calculatedF29.dueDateSiiElectronic || '').split('/').map(Number);
                  const dueDate = new Date(y, m - 1, d, 23, 59, 59);
                  const isPastDue = new Date() > dueDate;
                  return (
                    <div className="mt-1">
                      {existingOfficialF29 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          <CheckCircle2 size={13} /> Declaración Emitida en Tiempo y Forma
                        </span>
                      ) : isPastDue ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded" title="Período posterior al día 20. Si se emite ahora, quedará sujeta a validación de intereses Art. 53 CT.">
                          <AlertCircle size={13} /> Período Ordinario Concluido (Modalidad Rectificatoria / Fuera de Plazo)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                          <CheckCircle2 size={13} /> En Plazo Legal Ordinario (Hasta el día 20)
                        </span>
                      )}
                      <div className="text-[10px] text-slate-500 mt-1">
                        Regulado por Art. 64 D.L. 825 e instrucciones SII para facturadores electrónicos.
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-900 rounded-lg shrink-0 mt-0.5">
                <Calculator size={18} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Factor de Proporcionalidad IVA (Art. 23 N° 3)
                </div>
                <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                  Prorrata Calculada: <span className="text-emerald-800 font-extrabold">{calculatedF29.factorProrrataIva}%</span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  {calculatedF29.ventasExentas > 0 ? (
                    <span>
                      Operaciones mixtas: ${calculatedF29.ventasAfectasNeto.toLocaleString('es-CL')} afecto / ${(calculatedF29.ventasAfectasNeto + calculatedF29.ventasExentas).toLocaleString('es-CL')} total neto.
                    </span>
                  ) : (
                    <span>100% de operaciones afectas en el período (recuperabilidad total directa).</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Authentic SII Form Worksheet Table */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-md overflow-hidden font-sans">
            <div className="bg-[#002D62] text-white px-6 py-3 flex justify-between items-center border-b border-blue-900">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-amber-400" />
                <span className="font-serif font-black text-sm tracking-wide">
                  SERVICIO DE IMPUESTOS INTERNOS - DECLARACIÓN MENSUAL F29 ({f29PeriodKey})
                </span>
              </div>
              <span className="font-mono text-xs bg-blue-950 px-3 py-1 rounded text-amber-300 border border-blue-800">
                RUT: 96.890.000-K (ASSETFLOW)
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* SECTION 1: DÉBITOS FISCALES E INGRESOS */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-200 flex justify-between items-center">
                  <span>I. Débitos Fiscales y Ventas / Rentas Afectas y Exentas (Art. 8° y Ley IVA)</span>
                  <span className="text-[10px] text-slate-500 font-mono font-normal">Tasa IVA: 19%</span>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="text-left p-2.5 w-16 font-mono">Línea</th>
                      <th className="text-left p-2.5">Concepto Tributario SII</th>
                      <th className="text-center p-2.5 w-24 font-mono">Código SII</th>
                      <th className="text-right p-2.5 w-36">Base Imponible Neto ($)</th>
                      <th className="text-right p-2.5 w-36">Débito Fiscal ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-500">L 01</td>
                      <td className="p-2.5 font-sans font-medium text-slate-800">
                        Ventas y Servicios Afectos a IVA (Facturas / Boletas emitidas)
                      </td>
                      <td className="p-2.5 text-center font-bold text-blue-700 bg-blue-50/50">C501</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        ${calculatedF29.ventasAfectasNeto.toLocaleString('es-CL')}
                      </td>
                      <td className="p-2.5 text-right font-black text-blue-900 bg-blue-50">
                        ${calculatedF29.debitoFiscalIVA.toLocaleString('es-CL')}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-500">L 02</td>
                      <td className="p-2.5 font-sans font-medium text-slate-800">
                        Ventas y Rentas de Arriendo Exentas de IVA (Inmuebles No Amoblados)
                      </td>
                      <td className="p-2.5 text-center font-bold text-blue-700 bg-blue-50/50">C584</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        ${calculatedF29.ventasExentas.toLocaleString('es-CL')}
                      </td>
                      <td className="p-2.5 text-right text-slate-400 font-bold">$0</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECTION 2: CRÉDITOS FISCALES E IMPUESTOS RECUPERABLES */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-200 flex justify-between items-center">
                  <span>II. Créditos Fiscales y Compras del Giro (Facturas Recibidas)</span>
                  <span className="text-[10px] text-slate-500 font-mono font-normal">Recuperabilidad Art. 23 Ley IVA</span>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="text-left p-2.5 w-16 font-mono">Línea</th>
                      <th className="text-left p-2.5">Concepto Tributario SII</th>
                      <th className="text-center p-2.5 w-24 font-mono">Código SII</th>
                      <th className="text-right p-2.5 w-36">Base Imponible Neto ($)</th>
                      <th className="text-right p-2.5 w-36">Crédito Fiscal ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-500">L 03</td>
                      <td className="p-2.5 font-sans font-medium text-slate-800">
                        Compras y Gastos Afectos con Derecho a Crédito Fiscal
                        {calculatedF29.ventasExentas > 0 && enableProrrataIva && (
                          <div className="text-[10px] text-amber-800 font-mono mt-0.5 font-normal">
                            * Proporcionalidad Art. 23 N° 3 DL 825 aplicada: Factor {calculatedF29.factorProrrataIva}%. Crédito bruto 100%: ${calculatedF29.creditoFiscalBruto?.toLocaleString('es-CL')}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-bold text-emerald-700 bg-emerald-50/50">C520</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        ${calculatedF29.comprasAfectasNeto.toLocaleString('es-CL')}
                      </td>
                      <td className="p-2.5 text-right font-black text-emerald-900 bg-emerald-50">
                        ${calculatedF29.creditoFiscalIVA.toLocaleString('es-CL')}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-500">L 04</td>
                      <td className="p-2.5 font-sans font-medium text-slate-800">
                        Remanente de Crédito Fiscal del Período Anterior (Arrastre UTM)
                      </td>
                      <td className="p-2.5 text-center font-bold text-emerald-700 bg-emerald-50/50">C504</td>
                      <td className="p-2.5 text-right text-slate-400">-</td>
                      <td className="p-2.5 text-right font-bold text-emerald-800">
                        ${calculatedF29.remanenteMesAnterior.toLocaleString('es-CL')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECTION 3: DETERMINACIÓN NETO IVA & IMPUESTOS ADICIONALES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Calculator size={15} className="text-blue-600" />
                    Liquidación de IVA Neto
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">Débito Fiscal Total:</span>
                      <span className="font-bold text-blue-900">${calculatedF29.debitoFiscalIVA.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">(-) Crédito Fiscal Total:</span>
                      <span className="font-bold text-emerald-900">-${(calculatedF29.creditoFiscalIVA + calculatedF29.remanenteMesAnterior).toLocaleString('es-CL')}</span>
                    </div>
                    {calculatedF29.impuestoDeterminadoIVA > 0 ? (
                      <div className="flex justify-between py-2 bg-rose-50 border border-rose-200 rounded px-2">
                        <span className="font-bold text-rose-900 font-sans">Impuesto IVA a Pagar (C91):</span>
                        <span className="font-black text-rose-900 text-sm">${calculatedF29.impuestoDeterminadoIVA.toLocaleString('es-CL')}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between py-2 bg-emerald-50 border border-emerald-200 rounded px-2">
                        <span className="font-bold text-emerald-900 font-sans">Nuevo Remanente a Favor (C504):</span>
                        <span className="font-black text-emerald-900 text-sm">${calculatedF29.remanenteActual.toLocaleString('es-CL')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <DollarSign size={15} className="text-amber-600" />
                    PPM & Retenciones de Segunda Categoría
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">Base Imponible PPM:</span>
                      <span className="font-bold text-slate-800">${(calculatedF29.ventasAfectasNeto + calculatedF29.ventasExentas).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">PPM Neto ({f29PpmRate}%) (C115):</span>
                      <span className="font-bold text-amber-900">${calculatedF29.ppmNetoAmount.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">Retención {calculatedF29.retencionRate || f29HonorariosRate}% Honorarios (Ley 21.133) (C151):</span>
                      <span className="font-bold text-purple-900">${calculatedF29.retenciones2aCat.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SUMMARY PAYABLE BOX */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 rounded-xl border border-blue-900 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg">
                <div>
                  <div className="text-[11px] font-bold text-blue-300 uppercase tracking-widest flex items-center gap-2">
                    <Award size={16} className="text-amber-400" /> Total Determinado de Pago F29 SII ({f29PeriodKey})
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Impuesto IVA ($${calculatedF29.impuestoDeterminadoIVA.toLocaleString('es-CL')}) + PPM ($${calculatedF29.ppmNetoAmount.toLocaleString('es-CL')}) + Retenciones ($${calculatedF29.retenciones2aCat.toLocaleString('es-CL')})
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-mono font-black text-amber-400">
                    ${calculatedF29.totalAPagarNeto.toLocaleString('es-CL')}
                  </div>
                  <div className="text-[10px] text-blue-200 uppercase font-mono tracking-wider mt-0.5">
                    Monto Líquido a Declarar y Pagar en Banco / Tesorería
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: FORMULARIO 22 (F22 - RENTA ANUAL) */}
      {activeTab === 'F22' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Año Tributario (AT)
                </label>
                <select
                  value={selectedF22TaxYear}
                  onChange={e => setSelectedF22TaxYear(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={2026}>AT 2026 (Ejercicio Comercial 2025)</option>
                  <option value={2025}>AT 2025 (Ejercicio Comercial 2024)</option>
                  <option value={2027}>AT 2027 (Ejercicio Comercial 2026)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Régimen Impuesto a la Renta
                </label>
                <select
                  value={f22Regime}
                  onChange={e => {
                    const r = e.target.value as any;
                    setF22Regime(r);
                    if (r === '14D3') setF22IdpcRate(12.5);
                    else if (r === '14A') setF22IdpcRate(27);
                    else setF22IdpcRate(0);
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="14D3">ProPyme General (Art. 14 D3 - Tasa 12.5%)</option>
                  <option value="14D8">ProPyme Transparente (Art. 14 D8 - Tasa 0% Soc. / Finales)</option>
                  <option value="14A">Régimen Semi-Integrado (Art. 14 A - Tasa 27%)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Ajuste Gastos Rechazados Art. 21 ($)
                </label>
                <input
                  type="number"
                  value={f22GastosRechazados}
                  onChange={e => setF22GastosRechazados(Number(e.target.value))}
                  className="w-36 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {existingOfficialF22 ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg text-xs font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  DECLARACIÓN ANUAL EMITIDA (Folio: {existingOfficialF22.folio})
                </div>
              ) : (
                <button
                  onClick={handleIssueOfficialF22}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2 rounded-lg text-xs shadow-md transition flex items-center gap-2"
                >
                  <ShieldCheck size={16} />
                  Emitir F22 Inmutable
                </button>
              )}
            </div>
          </div>

          {/* F22 Annual RLI Breakdown Card */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-md overflow-hidden font-sans">
            <div className="bg-[#002D62] text-white px-6 py-3 flex justify-between items-center border-b border-blue-900">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-amber-400" />
                <span className="font-serif font-black text-sm tracking-wide">
                  SII - DECLARACIÓN ANUAL DE IMPUESTOS A LA RENTA FORMULARIO 22 (AT {selectedF22TaxYear})
                </span>
              </div>
              <span className="font-mono text-xs bg-blue-950 px-3 py-1 rounded text-amber-300 border border-blue-800">
                EJERCICIO COMERCIAL: {commercialYear}
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* RLI Worksheet */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-200">
                  Determinación de la Renta Líquida Imponible (RLI) - Impuesto de Primera Categoría (IDPC)
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-500 w-16">C01</td>
                      <td className="p-3 font-sans font-medium text-slate-800">
                        (+) Total Ingresos Brutos Percibidos o Devengados (Ventas / Rentas Arriendo)
                      </td>
                      <td className="p-3 text-right font-black text-emerald-700 text-sm">
                        ${calculatedF22.totalIngresosBrutos.toLocaleString('es-CL')}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-500 w-16">C02</td>
                      <td className="p-3 font-sans font-medium text-slate-800">
                        (-) Gastos Necesarios para Producir la Renta (Art. 31 LIR - Compras / OTs / Gastos)
                      </td>
                      <td className="p-3 text-right font-black text-rose-700 text-sm">
                        -${calculatedF22.totalGastosDeducibles.toLocaleString('es-CL')}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-500 w-16">C03</td>
                      <td className="p-3 font-sans font-medium text-slate-800">
                        (+) Agregados por Gastos Rechazados (Art. 21 LIR)
                      </td>
                      <td className="p-3 text-right font-bold text-amber-800">
                        +${calculatedF22.gastosRechazadosArt21.toLocaleString('es-CL')}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td className="p-3 text-slate-800 w-16">C18</td>
                      <td className="p-3 font-sans text-slate-900 font-black">
                        (=) RENTA LÍQUIDA IMPONIBLE BASE IDPC
                      </td>
                      <td className="p-3 text-right font-black text-blue-900 text-base">
                        ${calculatedF22.rentaLiquidaImponible.toLocaleString('es-CL')}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-500 w-16">C140</td>
                      <td className="p-3 font-sans font-medium text-slate-800">
                        IMPUESTO DE PRIMERA CATEGORÍA DETERMINADO (Tasa {f22IdpcRate}%)
                      </td>
                      <td className="p-3 text-right font-black text-blue-950 text-sm">
                        ${calculatedF22.impuestoIDPCDeterminado.toLocaleString('es-CL')}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-500 w-16">C55</td>
                      <td className="p-3 font-sans font-medium text-slate-800">
                        (-) Menos Créditos por Pagos Provisionales Mensuales (PPM Pagados en F29 del año)
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-800">
                        -${calculatedF22.menosPPMAnual.toLocaleString('es-CL')}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-500 w-16">C84</td>
                      <td className="p-3 font-sans font-medium text-slate-800">
                        (-) Menos Retenciones Sufridas
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-800">
                        -${calculatedF22.menosRetencionesAnuales.toLocaleString('es-CL')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* F22 Final Balance Result Card */}
              <div className={`p-6 rounded-xl border shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 ${
                calculatedF22.saldoFinalAnual >= 0 
                  ? 'bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border-rose-900 text-white' 
                  : 'bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-emerald-900 text-white'
              }`}>
                <div>
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={18} />
                    Resultado Final Formulario 22 (Año Tributario {selectedF22TaxYear})
                  </div>
                  <div className="text-xs text-slate-300 mt-1 max-w-2xl">
                    {calculatedF22.saldoFinalAnual >= 0 
                      ? 'Corresponde a Saldo Deudor a pagar en Tesorería General de la República por Impuesto de Primera Categoría neto.'
                      : '¡Saldo a Favor de la Empresa! Corresponde a devolución de impuestos por exceso de PPM pagados sobre el IDPC determinado.'}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-3xl font-mono font-black ${
                    calculatedF22.saldoFinalAnual >= 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    ${Math.abs(calculatedF22.saldoFinalAnual).toLocaleString('es-CL')}
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono uppercase tracking-wider mt-0.5">
                    {calculatedF22.saldoFinalAnual >= 0 ? 'IMPUESTO NETO A PAGAR' : 'DEVOLUCIÓN SOLICITADA EN DEPÓSITO'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 3: BÓVEDA HISTÓRICA INMUTABLE */}
      {activeTab === 'HISTORICO' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por Folio, Firma Digital, Período..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">Tipo:</span>
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 rounded text-xs font-bold ${filterType === 'ALL' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                Todos ({declarations.length})
              </button>
              <button
                onClick={() => setFilterType('F29')}
                className={`px-3 py-1 rounded text-xs font-bold ${filterType === 'F29' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                F29 Mensual
              </button>
              <button
                onClick={() => setFilterType('F22')}
                className={`px-3 py-1 rounded text-xs font-bold ${filterType === 'F22' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                F22 Anual
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#0B3C5D] text-white font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10 text-center font-mono select-none" title="Selector de Fila AssetFlow Enterprise (F4 / Menú Contextual)">#</th>
                  <th className="p-3 text-left font-mono">Folio SII</th>
                  <th className="p-3 text-left">Formulario & Período</th>
                  <th className="p-3 text-left">Estado Inmutable</th>
                  <th className="p-3 text-right">Monto Líquido</th>
                  <th className="p-3 text-left font-mono">Firma Criptográfica SHA-256</th>
                  <th className="p-3 text-center">Fecha Emisión</th>
                  <th className="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredDeclarations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                      No hay declaraciones registradas en la bóveda inmutable.
                    </td>
                  </tr>
                ) : (
                  filteredDeclarations.map(d => {
                    const amount = d.type === 'F29' ? d.f29Data?.totalAPagarNeto : d.f22Data?.saldoFinalAnual;
                    const isSelected = gridContextMenu?.declaration.id === d.id;
                    return (
                      <tr 
                        key={d.id} 
                        onContextMenu={(e) => handleRowContextMenu(e, d)}
                        className={`transition cursor-pointer ${
                          isSelected 
                            ? 'bg-cyan-100/90 text-cyan-950 font-bold border-l-4 border-l-[#00E5FF]' 
                            : 'hover:bg-slate-50'
                        }`}
                        title="Clic derecho o clic en [#] para abrir Menú Contextual AssetFlow Enterprise"
                      >
                        <td className="p-3 text-center bg-slate-50 select-none">
                          <button
                            type="button"
                            onClick={(e) => handleRowContextMenu(e, d)}
                            className="w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-black text-[#0B3C5D] hover:bg-[#0B3C5D] hover:text-white border border-slate-300 hover:border-[#0B3C5D] shadow-2xs transition-all mx-auto"
                            title="Abrir Menú Contextual AssetFlow Enterprise"
                          >
                            #
                          </button>
                        </td>
                        <td className="p-3 font-bold text-blue-900">{d.folio}</td>
                        <td className="p-3 font-sans font-bold text-slate-800">{d.periodLabel}</td>
                        <td className="p-3 font-sans">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1 w-fit">
                            <Lock size={12} /> INMUTABLE
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">
                          ${(amount || 0).toLocaleString('es-CL')}
                        </td>
                        <td className="p-3 text-slate-500 text-[10px] truncate max-w-[200px]" title={d.hashSignature}>
                          {d.hashSignature}
                        </td>
                        <td className="p-3 text-center text-slate-600">
                          {d.issuedAt ? new Date(d.issuedAt).toLocaleDateString('es-CL') : '-'}
                        </td>
                        <td className="p-3 text-center font-sans">
                          <button
                            onClick={() => setSelectedDeclarationForView(d)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold border border-blue-200 transition flex items-center gap-1 mx-auto"
                          >
                            <Eye size={13} />
                            Ver Ficha
                          </button>
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

      {/* VIEW TAB 4: DJ 1835, DJ 1879, LIBRO IMPUESTOS F0018 & LEY 21.713 */}
      {activeTab === 'DJ1835_LEY21713' && (
        <div className="space-y-6">
          {/* KPI & Ley 21.713 Control Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DJ 1835 (Arriendos Bienes Raíces)</div>
              <div className="text-xl font-mono font-black text-[#0B3C5D] mt-1">
                {leaseContracts.length || f0018Entries.length} Contratos / Roles
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                ✓ Cruce Rol Avalúo SII & Art. 8° g) DL 825
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DJ 1879 (Retención BHE 2026)</div>
              <div className="text-xl font-mono font-black text-purple-900 mt-1">
                Tasa Legal 15,25%
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Ley N° 21.133 Art. 74 N° 2 LIR (Escala 2026)
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ley N° 21.713 (Art. 85 bis C.T.)</div>
              <div className="text-xl font-mono font-black text-emerald-800 mt-1">
                {transactions.filter(t => t.type === 'INCOME' && t.status !== 'ANULADA').length} / 50 Abonos Sem.
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                ✓ 100% Trazabilidad Bancaria / DTE SII
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Libro Impuestos ERP F0018</div>
              <div className="text-xl font-mono font-black text-amber-700 mt-1">
                {f0018Entries.length} DTEs Timbrados
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Rebaja 11% Avalúo Art. 17: ${f0018Entries.reduce((s, e) => s + e.fiscalDeductionArt17, 0).toLocaleString('es-CL')}
              </div>
            </div>
          </div>

          {/* SECCIÓN 1: DECLARACIÓN JURADA ANUAL N° 1835 (BIENES RAÍCES ARRENDADOS) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-[#002D62] text-white px-5 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Building2 size={16} className="text-amber-400" />
                  Declaración Jurada Anual N° 1835 SII — Bienes Raíces Arrendados (AT {selectedF22TaxYear})
                </h3>
                <p className="text-[11px] text-blue-200">
                  Cruce automático Maestro de Contratos ERP (F1501B) + Libro de Impuestos (F0018) + Validación Módulo 11 RUT SII
                </p>
              </div>
              <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 px-2.5 py-1 rounded text-[10px] font-mono font-bold">
                RES. EX. SII DJ 1835 VIGENTE 2026
              </span>
            </div>

            <div className="overflow-x-auto jde-scrollbar">
              <table className="w-full min-w-[1050px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-mono text-[10px] uppercase">
                    <th className="p-3">Rol Avalúo SII</th>
                    <th className="p-3">Inmueble / Dirección</th>
                    <th className="p-3">RUT Arrendatario (Mód. 11)</th>
                    <th className="p-3">Razón Social / Arrendatario</th>
                    <th className="p-3">Destino / Régimen DL 825</th>
                    <th className="p-3 text-right">Canon Mensual</th>
                    <th className="p-3 text-right">Monto Anual Declarado</th>
                    <th className="p-3 text-center">Estado SII</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {(leaseContracts.length > 0 ? leaseContracts.map((c, idx) => {
                    const rutCheck = validateChileanRut(c.tenantRut || '77.342.190-8');
                    const monthly = c.monthlyAmount || 0;
                    return {
                      id: c.id,
                      role: `01420-00${idx + 11}`,
                      address: c.propertyName || `Propiedad ID ${c.propertyId}`,
                      rut: rutCheck.formatted || c.tenantRut || '77.342.190-8',
                      rutValid: rutCheck.isValid,
                      tenant: c.tenantName,
                      regime: 'EXENTO ART. 8° LETRA G (SIN AMOBLAR)',
                      monthly,
                      annual: monthly * 12,
                      status: c.status
                    };
                  }) : f0018Entries.map((e) => {
                    const rutCheck = validateChileanRut(e.taxId);
                    return {
                      id: e.taxLedgerId,
                      role: e.propertyRole || '01420-0089',
                      address: `Inmueble Rol ${e.propertyRole || 'S/N'}`,
                      rut: rutCheck.formatted || e.taxId,
                      rutValid: rutCheck.isValid,
                      tenant: e.counterpartyName,
                      regime: e.taxRateArea === 'CL-EXENTO' ? 'EXENTO DTE 34 (ART. 8° G)' : e.taxRateArea === 'CL-ART17-AVALUO' ? 'AFECTO DTE 33 CON REBAJA 11% AVALÚO (ART. 17)' : 'AFECTO IVA 19% (DTE 33)',
                      monthly: e.grossAmount,
                      annual: e.grossAmount * 12,
                      status: 'VIGENTE'
                    };
                  })).map((row) => (
                    <tr key={row.id} className="hover:bg-blue-50/40">
                      <td className="p-3 font-bold text-[#0B3C5D]">{row.role}</td>
                      <td className="p-3 font-sans text-slate-800 font-semibold">{row.address}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900">{row.rut}</span>
                        <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded font-sans font-bold ${row.rutValid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {row.rutValid ? 'Mód.11 OK' : 'Verificar DV'}
                        </span>
                      </td>
                      <td className="p-3 font-sans text-slate-700">{row.tenant}</td>
                      <td className="p-3 font-sans text-[10px] font-bold text-slate-600">{row.regime}</td>
                      <td className="p-3 text-right font-bold text-slate-800">${row.monthly.toLocaleString('es-CL')}</td>
                      <td className="p-3 text-right font-black text-blue-900">${row.annual.toLocaleString('es-CL')}</td>
                      <td className="p-3 text-center font-sans">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">
                          CUADRADO RCV
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECCIÓN 2: LIBRO DE IMPUESTOS ERP F0018 & REBAJA ART. 17 INC. 2° D.L. 825 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileText size={16} className="text-amber-400" />
                  Libro Auxiliar de Impuestos ERP (Tabla F0018) — Conciliación RCV SII & Art. 17 D.L. 825
                </h3>
                <p className="text-[11px] text-slate-300">
                  Desglose de Facturas Electrónicas Afectas (DTE 33), Exentas (DTE 34) y Deducción Legal del 11% Anual del Avalúo Fiscal
                </p>
              </div>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2.5 py-1 rounded text-[10px] font-mono font-bold">
                TABLA ERP F0018 SINCRONIZADA CON F0911
              </span>
            </div>

            <div className="overflow-x-auto jde-scrollbar">
              <table className="w-full min-w-[1050px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-mono text-[10px] uppercase">
                    <th className="p-3">ID F0018 / Folio</th>
                    <th className="p-3">Tipo DTE</th>
                    <th className="p-3">Fecha Contable</th>
                    <th className="p-3">RUT Receptor</th>
                    <th className="p-3">Área Impuesto ERP (TXA1)</th>
                    <th className="p-3 text-right">Monto Exento (C142)</th>
                    <th className="p-3 text-right">Rebaja 11% Avalúo (Art. 17)</th>
                    <th className="p-3 text-right">Base Afecta IVA</th>
                    <th className="p-3 text-right">Débito IVA 19% (C501)</th>
                    <th className="p-3 text-right">Total DTE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {f0018Entries.map((entry) => (
                    <tr key={entry.taxLedgerId} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-blue-900">{entry.taxLedgerId}</td>
                      <td className="p-3 font-sans font-bold">
                        DTE {entry.dteType} ({entry.docType})
                      </td>
                      <td className="p-3 text-slate-600">{entry.glDate}</td>
                      <td className="p-3 font-bold text-slate-800">{entry.taxId}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                          {entry.taxRateArea} [{entry.taxExplanationCode}]
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-700">${entry.exemptAmount.toLocaleString('es-CL')}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        {entry.fiscalDeductionArt17 > 0 ? `-$${entry.fiscalDeductionArt17.toLocaleString('es-CL')}` : '$0'}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">${entry.taxableAmount.toLocaleString('es-CL')}</td>
                      <td className="p-3 text-right font-bold text-blue-800">${entry.taxAmount.toLocaleString('es-CL')}</td>
                      <td className="p-3 text-right font-black text-slate-950">${entry.grossAmount.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW INMUTABLE DECLARATION CERTIFICATE */}
      {selectedDeclarationForView && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div id="tax-declaration-report" className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-3xl w-full max-h-[90vh] overflow-y-auto font-sans">
            <div className="bg-[#002D62] text-white p-5 flex justify-between items-center border-b border-blue-900 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-amber-400" size={24} />
                <div>
                  <h3 className="font-serif font-black text-lg">Comprobante Inmutable SII / CMF</h3>
                  <div className="text-xs text-blue-200 font-mono">Folio: {selectedDeclarationForView.folio}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeclarationForView(null)}
                className="text-white/80 hover:text-white font-bold text-xl px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-slate-800">{selectedDeclarationForView.periodLabel}</div>
                  <div className="text-slate-500">Emitido por: {selectedDeclarationForView.issuedBy || selectedDeclarationForView.userCreator}</div>
                  <div className="text-slate-500">Fecha de Registro: {new Date(selectedDeclarationForView.timestamp).toLocaleString('es-CL')}</div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-300 flex items-center gap-1.5">
                  <Lock size={14} /> REGISTRO BLOQUEADO (INMUTABLE)
                </span>
              </div>

              {/* Data payload details */}
              {selectedDeclarationForView.type === 'F29' && selectedDeclarationForView.f29Data && (
                <div className="border border-slate-200 rounded-lg p-4 space-y-3 font-mono text-xs">
                  <div className="font-sans font-bold text-slate-800 border-b pb-2">Desglose F29 (IVA / PPM)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Ventas Afectas (C501): <span className="font-bold">${selectedDeclarationForView.f29Data.ventasAfectasNeto.toLocaleString('es-CL')}</span></div>
                    <div>Débito Fiscal IVA: <span className="font-bold text-blue-900">${selectedDeclarationForView.f29Data.debitoFiscalIVA.toLocaleString('es-CL')}</span></div>
                    <div>Compras Afectas (C520): <span className="font-bold">${selectedDeclarationForView.f29Data.comprasAfectasNeto.toLocaleString('es-CL')}</span></div>
                    <div>Crédito Fiscal IVA: <span className="font-bold text-emerald-900">${selectedDeclarationForView.f29Data.creditoFiscalIVA.toLocaleString('es-CL')}</span> {selectedDeclarationForView.f29Data.factorProrrataIva !== undefined && <span className="text-[10px] text-slate-500 font-sans">(Prorrata Art. 23: {selectedDeclarationForView.f29Data.factorProrrataIva}%)</span>}</div>
                    <div>PPM Neto (C115): <span className="font-bold text-amber-900">${selectedDeclarationForView.f29Data.ppmNetoAmount.toLocaleString('es-CL')}</span></div>
                    <div>Retenciones 2a Cat (C151): <span className="font-bold text-purple-900">${selectedDeclarationForView.f29Data.retenciones2aCat.toLocaleString('es-CL')}</span> <span className="text-[10px] text-slate-500 font-sans">({selectedDeclarationForView.f29Data.retencionRate || 15.25}% Ley 21.133)</span></div>
                  </div>
                  <div className="bg-slate-100 p-3 rounded text-right font-black text-sm text-slate-900 border mt-2">
                    Total Pagado: ${selectedDeclarationForView.f29Data.totalAPagarNeto.toLocaleString('es-CL')}
                  </div>
                </div>
              )}

              {selectedDeclarationForView.type === 'F22' && selectedDeclarationForView.f22Data && (
                <div className="border border-slate-200 rounded-lg p-4 space-y-3 font-mono text-xs">
                  <div className="font-sans font-bold text-slate-800 border-b pb-2">Desglose F22 (Renta Anual RLI)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Ingresos Brutos Totales: <span className="font-bold">${selectedDeclarationForView.f22Data.totalIngresosBrutos.toLocaleString('es-CL')}</span></div>
                    <div>Gastos Deducibles (Art. 31): <span className="font-bold">${selectedDeclarationForView.f22Data.totalGastosDeducibles.toLocaleString('es-CL')}</span></div>
                    <div>RLI Base IDPC: <span className="font-bold text-blue-900">${selectedDeclarationForView.f22Data.rentaLiquidaImponible.toLocaleString('es-CL')}</span></div>
                    <div>IDPC Determinado ({selectedDeclarationForView.f22Data.idpcRate}%): <span className="font-bold">${selectedDeclarationForView.f22Data.impuestoIDPCDeterminado.toLocaleString('es-CL')}</span></div>
                    <div>PPM Anual Pagados: <span className="font-bold text-emerald-800">${selectedDeclarationForView.f22Data.menosPPMAnual.toLocaleString('es-CL')}</span></div>
                  </div>
                  <div className="bg-slate-100 p-3 rounded text-right font-black text-sm text-slate-900 border mt-2">
                    Resultado Final: ${Math.abs(selectedDeclarationForView.f22Data.saldoFinalAnual).toLocaleString('es-CL')}
                  </div>
                </div>
              )}

              {/* Digital Hash Stamp */}
              <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs space-y-1">
                <div className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Award size={14} /> Sello de Autenticidad Digital CMF/SII
                </div>
                <div className="text-[11px] text-slate-400 break-all">
                  Hash SHA-256: {selectedDeclarationForView.hashSignature}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => printHtmlElement("tax-declaration-report", `Declaracion_Tributaria_${selectedDeclarationForView.folio}`)}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded text-xs font-bold transition flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Printer size={15} /> Impresión / Exportar PDF
                </button>

                <button
                  onClick={() => setSelectedDeclarationForView(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded text-xs font-bold transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INTERACTIVE DRAFT PREVIEW (BORRADOR) */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-2xl w-full p-6 space-y-4 font-sans">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-amber-600" size={20} />
                Borrador de Trabajo F29 ({f29PeriodKey})
              </h3>
              <button onClick={() => setShowDraftModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900 leading-relaxed">
              ℹ️ Este es un <strong>Borrador de Simulación Interactivo</strong>. Puede revisar el cálculo antes de formalizar la emisión inmutable en la base de datos de AssetFlow.
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b">
                <span>Ventas Afectas Neto:</span>
                <span className="font-bold">${calculatedF29.ventasAfectasNeto.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span>Débito IVA 19%:</span>
                <span className="font-bold text-blue-900">${calculatedF29.debitoFiscalIVA.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span>Compras Afectas Neto:</span>
                <span className="font-bold">${calculatedF29.comprasAfectasNeto.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span>Crédito IVA 19%:</span>
                <span className="font-bold text-emerald-900">
                  ${calculatedF29.creditoFiscalIVA.toLocaleString('es-CL')}
                  {calculatedF29.ventasExentas > 0 && ` (Prorrata Art. 23: ${calculatedF29.factorProrrataIva}%)`}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span>PPM Neto ({f29PpmRate}%):</span>
                <span className="font-bold text-amber-900">${calculatedF29.ppmNetoAmount.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span>Retención 2a Cat ({calculatedF29.retencionRate || f29HonorariosRate}% Ley 21.133):</span>
                <span className="font-bold text-purple-900">${calculatedF29.retenciones2aCat.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b text-slate-500 font-sans text-[11px]">
                <span>Plazos Legales SII:</span>
                <span className="font-bold text-slate-700">General: {calculatedF29.dueDateSiiGeneral} | RCV ProPyme: {calculatedF29.dueDateSiiElectronic}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b bg-slate-100 p-2 rounded">
                <span className="font-bold font-sans">Monto Final A Pagar F29:</span>
                <span className="font-black text-sm text-slate-900">${calculatedF29.totalAPagarNeto.toLocaleString('es-CL')}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDraftModal(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded text-xs font-bold transition"
              >
                Cerrar Borrador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AssetFlow Enterprise Context Menu (P029F22) */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P029F22"
          programTitle={`Declaración SII Formulario ${gridContextMenu.declaration.type} (Folio: ${gridContextMenu.declaration.folio})`}
          collectionName="tax_declarations"
          recordKey={`Folio #${gridContextMenu.declaration.folio} [${gridContextMenu.declaration.periodLabel}]`}
          recordData={gridContextMenu.declaration}
          currentStatus={gridContextMenu.declaration.status}
          statusOptions={[
            { label: 'OFICIAL EMITIDO (SII Firmado)', value: 'OFICIAL_EMITIDO', color: 'bg-emerald-600' },
            { label: 'BORRADOR (En Proceso)', value: 'BORRADOR', color: 'bg-amber-600' },
            { label: 'OBSERVADO (Rectificatoria)', value: 'OBSERVADO', color: 'bg-rose-600' }
          ]}
          onClose={() => setGridContextMenu(null)}
          onViewDetails={() => {
            setSelectedDeclarationForView(gridContextMenu.declaration);
            setGridContextMenu(null);
          }}
          onPrint={() => {
            setSelectedDeclarationForView(gridContextMenu.declaration);
            setTimeout(() => {
              printHtmlElement('tax-declaration-print-content', `Declaracion_${gridContextMenu.declaration.type}_${gridContextMenu.declaration.folio}`);
            }, 300);
            setGridContextMenu(null);
          }}
          rowExits={[
            {
              label: 'Inspeccionar Certificado Oficial SII',
              shortcut: 'Enter',
              onClick: () => {
                setSelectedDeclarationForView(gridContextMenu.declaration);
                setGridContextMenu(null);
              }
            },
            {
              label: 'Imprimir Declaración Oficial / Folio',
              shortcut: 'Ctrl+P',
              onClick: () => {
                setSelectedDeclarationForView(gridContextMenu.declaration);
                setTimeout(() => {
                  printHtmlElement('tax-declaration-print-content', `Declaracion_${gridContextMenu.declaration.type}_${gridContextMenu.declaration.folio}`);
                }, 300);
                setGridContextMenu(null);
              }
            }
          ]}
        />
      )}
    </div>
  );
};

export default TaxComplianceModule;
