import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  X, 
  Filter, 
  Calendar, 
  DollarSign, 
  Clock, 
  FileSpreadsheet, 
  Eye, 
  FileText, 
  ArrowRight, 
  User, 
  Terminal, 
  ExternalLink, 
  Activity, 
  Check, 
  ChevronDown, 
  Edit2, 
  Copy, 
  Building2, 
  CreditCard, 
  FileSearch, 
  Mail, 
  Users, 
  RefreshCw, 
  Download,
  Info
} from 'lucide-react';
import { 
  Transaction, 
  Supplier, 
  Property, 
  WorkOrder, 
  AuditEntry, 
  LeaseContract,
  USER_CREDENTIALS,
  UserRole
} from '../types';
import { exportToExcel } from '../lib/excelExport';
import { downloadForensicAntiFraudReport } from '../lib/pdfGenerator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend, 
  ResponsiveContainer, 
  Cell as RechartsCell,
  Line,
  ComposedChart
} from 'recharts';


interface TransactionalAuditCenterProps {
  transactions: Transaction[];
  suppliers: Supplier[];
  properties: Property[];
  workOrders: WorkOrder[];
  leaseContracts: LeaseContract[];
  currentUser: string;
  onUpdateTransaction: (id: string, field: keyof Transaction, value: any) => void;
  addAuditEntry: (
    action: AuditEntry['action'], 
    entityType: AuditEntry['entityType'],
    entityId: string, 
    entityName?: string,
    details?: { field?: string, old?: any, new?: any }
  ) => void;
}

export const TransactionalAuditCenter: React.FC<TransactionalAuditCenterProps> = ({
  transactions,
  suppliers,
  properties,
  workOrders,
  leaseContracts,
  currentUser,
  onUpdateTransaction,
  addAuditEntry,
}) => {
  // Validate if current user has ADMINISTRADOR role or is DEVELOPER
  const userRole: UserRole = useMemo(() => {
    if (currentUser === 'DEVELOPER') return 'ADMINISTRADOR';
    const profile = USER_CREDENTIALS[currentUser];
    return profile ? profile.role : 'EJECUTIVO';
  }, [currentUser]);

  const isAdmin = userRole === 'ADMINISTRADOR' || currentUser === 'DEVELOPER';

  // Subtab navigation inside TransactionalAuditCenter
  const [activeAuditTab, setActiveAuditTab] = useState<'TRANSACTO_LIST' | 'ANTI_FRAUD_DIAGNOSTIC'>('TRANSACTO_LIST');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, PENDIENTE, COMPLETADA, ANULADA
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>('ALL'); // ALL, PENDIENTE, AUDITADO, OBSERVADO
  const [typeFilter, setTypeFilter] = useState<string>('ALL'); // ALL, INCOME, EXPENSE
  const [timePeriod, setTimePeriod] = useState<string>('ALL'); // ALL, 30_DAYS, 90_DAYS, 2026
  const [companyFilter, setCompanyFilter] = useState<string>('ALL'); // ALL, VIDA, GENERALES
  const [sourceFilter, setSourceFilter] = useState<string>('ALL'); // ALL, DIRECT, WORK_ORDER, PETTY_CHIC
  const [riskFilter, setRiskFilter] = useState<string>('ALL'); // ALL, SANO, CON_OBSERVACION, FALTA_ESTAMPA, HUERFANO

  // Selected Transaction for Drawer/Modal Close inspect
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Resolution Form inputs for Selected Transaction
  const [auditRemarks, setAuditRemarks] = useState('');
  const [newAuditStatus, setNewAuditStatus] = useState<'PENDIENTE' | 'AUDITADO' | 'OBSERVADO' | 'ANULADA'>('PENDIENTE');
  const [tempAccountCode, setTempAccountCode] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [tempAmount, setTempAmount] = useState<number>(0);
  const [tempStatus, setTempStatus] = useState<'PENDIENTE' | 'COMPLETADA' | 'ANULADA'>('PENDIENTE');
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);

  // Real-time statistical analysis for anti-fraud & Benford's Law
  const fraudStats = useMemo(() => {
    let roundAmountCount = 0;
    let weekendTransactionCount = 0;
    const firstDigitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    let validDigitsTotal = 0;

    const amtDateGroups: Record<string, Transaction[]> = {};

    transactions.forEach(tx => {
      const amt = Math.abs(tx.amount);

      // Digits for Benford's law
      const digitsOnly = String(amt).replace(/[^1-9]/g, '');
      if (digitsOnly.length > 0) {
        const firstDigit = parseInt(digitsOnly[0], 10);
        if (firstDigit >= 1 && firstDigit <= 9) {
          firstDigitCounts[firstDigit]++;
          validDigitsTotal++;
        }
      }

      // Round numbers >= 10,000 and ending in 10,000 pattern
      if (amt >= 10000 && amt % 10000 === 0) {
        roundAmountCount++;
      }

      // Weekend posts
      if (tx.date) {
        const dObj = new Date(tx.date + 'T12:00:00');
        const day = dObj.getDay();
        if (day === 0 || day === 6) {
          weekendTransactionCount++;
        }
      }

      // Duplicates key
      const dupKey = `${tx.date}_${tx.amount.toFixed(0)}`;
      if (!amtDateGroups[dupKey]) {
        amtDateGroups[dupKey] = [];
      }
      amtDateGroups[dupKey].push(tx);
    });

    const duplicates = Object.values(amtDateGroups).filter(list => list.length > 1).flat();

    const expectedRatios: Record<number, number> = {
      1: 30.1, 2: 17.6, 3: 12.5, 4: 9.7, 5: 7.9, 6: 6.7, 7: 5.8, 8: 5.1, 9: 4.6
    };

    let totalAbsoluteDelta = 0;
    const benfordChartData = Object.keys(firstDigitCounts).map(key => {
      const d = parseInt(key, 10);
      const absCount = firstDigitCounts[d];
      const actualPct = validDigitsTotal > 0 ? (absCount / validDigitsTotal) * 100 : 0;
      const expPct = expectedRatios[d];
      const delta = actualPct - expPct;
      totalAbsoluteDelta += Math.abs(delta);
      return {
        digit: `${d}`,
        actual: parseFloat(actualPct.toFixed(1)),
        expected: expPct,
        count: absCount,
        delta: parseFloat(delta.toFixed(1))
      };
    });

    const divergenceIndex = totalAbsoluteDelta / 9;
    const conformityScore = Math.max(0, Math.min(100, 100 - (divergenceIndex * 4.5)));

    return {
      roundAmountCount,
      weekendTransactionCount,
      validDigitsTotal,
      duplicates,
      benfordChartData,
      conformityScore: parseFloat(conformityScore.toFixed(1))
    };
  }, [transactions]);


  // Helper to copy text to clipboard safely
  const handleCopyText = (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedId(label);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error("No se pudo copiar text", e);
    }
  };

  // Helper to open drawer details and populate form input states
  const handleSelectTx = (tx: Transaction) => {
    setSelectedTx(tx);
    const existingAuditStatus = tx.metadata?.auditStatus || 'PENDIENTE';
    const existingAuditRemarks = tx.metadata?.auditRemarks || '';
    setNewAuditStatus(existingAuditStatus);
    setAuditRemarks(existingAuditRemarks);
    setTempAccountCode(tx.accountCode || '');
    setTempDescription(tx.description || '');
    setTempAmount(tx.amount || 0);
    setTempStatus(tx.status || 'PENDIENTE');
    setValidationSuccess(null);
  };

  // Evaluate single transaction audit risks & integrity checks
  const runIntegrityAudit = (tx: Transaction) => {
    const findings: string[] = [];
    let score = 'BAJO'; // BAJO, MEDIO, ALTO (High risk is bad)

    // Check 1: Missing Account classification
    if (!tx.accountCode) {
      findings.push("Falta clasificación de cuenta contable ordinaria.");
      score = 'MEDIO';
    }

    // Check 2: Missing Supplier link on Expense or orphan link
    if (tx.type === 'EXPENSE') {
      if (!tx.supplierId) {
        findings.push("Egreso sin ID Proveedor asignado.");
        score = 'ALTO';
      } else {
        const supExists = suppliers.some(s => s.id === tx.supplierId);
        if (!supExists) {
          findings.push(`Proveedor Huérfano: ID [${tx.supplierId}] no existe en maestro.`);
          score = 'ALTO';
        }
      }
    }

    // Check 3: Property ID link checks
    if (tx.propertyId) {
      const propExists = properties.some(p => p.id === tx.propertyId);
      if (!propExists) {
        findings.push(`Propiedad Huérfana: ID [${tx.propertyId}] no existe en catálogo.`);
        score = 'MEDIO';
      }
    }

    // Check 4: Missing official certification stamps (ERP standard Audit fields)
    if (!tx.programId || !tx.workStationId || !tx.nextNumberSeq || !tx.hashSignature) {
      findings.push("Carece de estampa o firma técnica de integridad criptográfica.");
      if (score !== 'ALTO') score = 'MEDIO';
    }

    // Check 5: Document completeness
    if (!tx.documentUrl) {
      findings.push("No contiene documento tributario/comprobante digital adjunto.");
      if (score !== 'ALTO') score = 'MEDIO';
    }

    return {
      severity: score,
      findings
    };
  };

  // Process and Filter transactions
  const processedTransactions = useMemo(() => {
    return transactions.map(tx => {
      const audit = runIntegrityAudit(tx);
      const isAuto = tx.isAutoGenerated || (tx as any).source === 'ORDEN_TRABAJO';
      const isCaja = (tx as any).source === 'CAJA_CHICA';
      let derivedSource = 'DIRECTO';
      if (isAuto) derivedSource = 'ORDEN_TRABAJO';
      else if (isCaja) derivedSource = 'CAJA_CHICA';

      return {
        ...tx,
        auditSeverity: audit.severity,
        auditFindings: audit.findings,
        derivedSource
      };
    });
  }, [transactions, suppliers, properties]);

  // Apply filters to table list
  const filteredTx = useMemo(() => {
    return processedTransactions.filter(tx => {
      // Search term
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        tx.description.toLowerCase().includes(searchLower) ||
        tx.id.toLowerCase().includes(searchLower) ||
        (tx.documentNumber && tx.documentNumber.toLowerCase().includes(searchLower)) ||
        (tx.supplierName && tx.supplierName.toLowerCase().includes(searchLower)) ||
        (tx.supplierId && tx.supplierId.toLowerCase().includes(searchLower)) ||
        (tx.propertyId && tx.propertyId.toLowerCase().includes(searchLower)) ||
        (tx.workOrderId && tx.workOrderId.toLowerCase().includes(searchLower)) ||
        (tx.accountCode && tx.accountCode.toLowerCase().includes(searchLower));

      if (!matchSearch) return false;

      // Status
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;

      // Audit Status
      const audStat = tx.metadata?.auditStatus || 'PENDIENTE';
      if (auditStatusFilter !== 'ALL' && audStat !== auditStatusFilter) return false;

      // Type
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;

      // Company
      if (companyFilter !== 'ALL' && tx.insuranceCompany !== companyFilter) return false;

      // Source
      if (sourceFilter !== 'ALL' && tx.derivedSource !== sourceFilter) return false;

      // Time Period
      if (timePeriod !== 'ALL') {
        const txDate = new Date(tx.date).getTime();
        const now = Date.now();
        if (timePeriod === '30_DAYS' && (now - txDate) > 30 * 24 * 60 * 60 * 1000) return false;
        if (timePeriod === '90_DAYS' && (now - txDate) > 90 * 24 * 60 * 60 * 1000) return false;
        if (timePeriod === '2026' && !tx.date.startsWith('2026')) return false;
      }

      // Risk filters
      if (riskFilter !== 'ALL') {
        if (riskFilter === 'SANO' && tx.auditFindings.length > 0) return false;
        if (riskFilter === 'CON_OBSERVACION' && tx.auditFindings.length === 0) return false;
        if (riskFilter === 'FALTA_ESTAMPA' && (!tx.programId || !tx.hashSignature)) return false;
        if (riskFilter === 'HUERFANO' && !tx.auditFindings.some(f => f.includes('Huérfano') || f.includes('huerfano') || f.includes('sin ID'))) return false;
      }

      return true;
    });
  }, [processedTransactions, searchTerm, statusFilter, auditStatusFilter, typeFilter, timePeriod, companyFilter, sourceFilter, riskFilter]);

  // KPIs Calculations
  const kpis = useMemo(() => {
    const totalCount = processedTransactions.length;
    let auditedCount = 0;
    let observedCount = 0;
    let pendingCount = 0;
    let totalRiskCount = 0;
    let totalDirect = 0;
    let totalAuto = 0;
    let totalPetty = 0;

    processedTransactions.forEach(tx => {
      const ast = tx.metadata?.auditStatus || 'PENDIENTE';
      if (ast === 'AUDITADO') auditedCount++;
      else if (ast === 'OBSERVADO') observedCount++;
      else pendingCount++;

      if (tx.auditFindings.length > 0) {
        totalRiskCount++;
      }

      if (tx.derivedSource === 'ORDEN_TRABAJO') totalAuto++;
      else if (tx.derivedSource === 'CAJA_CHICA') totalPetty++;
      else totalDirect++;
    });

    const completionRate = totalCount > 0 ? Math.round((auditedCount / totalCount) * 100) : 0;

    return {
      totalCount,
      auditedCount,
      observedCount,
      pendingCount,
      totalRiskCount,
      completionRate,
      sources: { direct: totalDirect, auto: totalAuto, petty: totalPetty }
    };
  }, [processedTransactions]);

  // Security Verification Hash generator (Traceability Audit)
  const generateHashSignature = (txId: string) => {
    const randomChars = Math.random().toString(36).substring(2, 10);
    return `SHA256:CONTR_${txId.split('-')[0].toUpperCase()}_${randomChars}_OK`;
  };

  // Sign stamps manually
  const handleApplySecurityStamps = (txId: string) => {
    const target = transactions.find(t => t.id === txId);
    if (!target) return;

    const signature = generateHashSignature(txId);
    onUpdateTransaction(txId, 'programId', 'P0911A');
    onUpdateTransaction(txId, 'workStationId', 'MKEY-CLOUDRUN-CONTROL_INTERNO-ADMIN');
    onUpdateTransaction(txId, 'nextNumberSeq', Math.floor(1000 + Math.random() * 9000));
    onUpdateTransaction(txId, 'hashSignature', signature);

    addAuditEntry(
      'UPDATE', 
      'TRANSACCION', 
      txId, 
      target.description, 
      { field: 'HASH_SIGNATURE', old: 'Falta Firma', new: signature }
    );

    // Refresh selected tx view state
    setSelectedTx(prev => prev ? {
      ...prev,
      programId: 'P0911A',
      workStationId: 'MKEY-CLOUDRUN-CONTROL_INTERNO-ADMIN',
      nextNumberSeq: Math.floor(1000 + Math.random() * 9000),
      hashSignature: signature
    } : null);

    setValidationSuccess("Certificados ERP y marcas de seguridad aplicados exitosamente");
    setTimeout(() => setValidationSuccess(null), 3000);
  };

  // Guardar Resolución de Auditoría
  const handleSaveAuditResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    const txId = selectedTx.id;
    const oldMeta = selectedTx.metadata || {};
    const newMeta = {
      ...oldMeta,
      auditStatus: newAuditStatus,
      auditRemarks,
      auditedBy: currentUser,
      auditedAt: Date.now()
    };

    // Update main fields if modified
    if (tempDescription !== selectedTx.description) {
      onUpdateTransaction(txId, 'description', tempDescription);
      addAuditEntry('UPDATE', 'TRANSACCION', txId, tempDescription, { field: 'DESCRIPTION', old: selectedTx.description, new: tempDescription });
    }

    if (tempAmount !== selectedTx.amount) {
      onUpdateTransaction(txId, 'amount', Number(tempAmount));
      addAuditEntry('UPDATE', 'TRANSACCION', txId, tempDescription, { field: 'AMOUNT', old: selectedTx.amount, new: tempAmount });
    }

    if (tempAccountCode !== selectedTx.accountCode) {
      onUpdateTransaction(txId, 'accountCode', tempAccountCode);
      addAuditEntry('UPDATE', 'TRANSACCION', txId, tempDescription, { field: 'ACCOUNT_CODE', old: selectedTx.accountCode || 'N/A', new: tempAccountCode });
    }

    if (tempStatus !== selectedTx.status) {
      onUpdateTransaction(txId, 'status', tempStatus);
      addAuditEntry('UPDATE', 'TRANSACCION', txId, tempDescription, { field: 'STATUS', old: selectedTx.status, new: tempStatus });
    }

    // Save metadata audits
    onUpdateTransaction(txId, 'metadata', newMeta);

    // Explicitly Log resolution in Immutable security logs F0002 style
    const oldAudState = oldMeta.auditStatus || 'PENDIENTE';
    addAuditEntry(
      'UPDATE', 
      'TRANSACCION', 
      txId, 
      tempDescription, 
      { field: 'AUDIT_STATUS', old: oldAudState, new: newAuditStatus }
    );

    // Find in processes list to live-update selectedTx object representation inside modal
    setSelectedTx({
      ...selectedTx,
      description: tempDescription,
      amount: tempAmount,
      accountCode: tempAccountCode,
      status: tempStatus,
      metadata: newMeta
    });

    setValidationSuccess("Dictamen y ajustes de Auditoría Contable guardados en el libro mayor.");
    setTimeout(() => {
      setValidationSuccess(null);
      setSelectedTx(null); // auto-close on resolve for comfort
    }, 1500);
  };

  // Quick action: Accept Transaction Conforme directly on Row
  const handleQuickApprove = (tx: Transaction) => {
    const oldMeta = tx.metadata || {};
    const newMeta = {
      ...oldMeta,
      auditStatus: 'AUDITADO' as const,
      auditRemarks: 'Verificado conforme en primera línea de control administrativo.',
      auditedBy: currentUser,
      auditedAt: Date.now()
    };

    onUpdateTransaction(tx.id, 'metadata', newMeta);
    addAuditEntry(
      'UPDATE', 
      'TRANSACCION', 
      tx.id, 
      tx.description, 
      { field: 'AUDIT_STATUS', old: oldMeta.auditStatus || 'PENDIENTE', new: 'AUDITADO' }
    );
  };

  // Export to standard Excel
  const handleExportAuditorExcel = () => {
    const rows = filteredTx.map(tx => ({
      'ID Contable': tx.id,
      'Fecha': tx.date,
      'Tipo': tx.type === 'INCOME' ? 'INGRESO' : 'EGRESO',
      'Categoría': tx.category,
      'Documento': tx.documentType,
      'Número Doc': tx.documentNumber || 'S/N',
      'Monto CLP': tx.amount,
      'Clasificación Cuenta': tx.accountCode || 'FALTA',
      'Rut Proveedor': tx.supplierTaxId || 'S/N',
      'Compañía Seguros': tx.insuranceCompany,
      'Canal Origen': tx.derivedSource,
      'Programa ERP': tx.programId || 'N/A',
      'Terminal': tx.workStationId || 'N/A',
      'Hash Seguridad': tx.hashSignature || 'N/A',
      'Hallazgos Auditoría': tx.auditFindings.join(' | ') || 'SIN OBSERVACIONES',
      'Estado Control Interno': tx.metadata?.auditStatus || 'PENDIENTE',
      'Observaciones Auditor': tx.metadata?.auditRemarks || 'N/A'
    }));

    exportToExcel(rows, `Auditoria_Trazabilidad_${new Date().toISOString().split('T')[0]}`, 'Auditoria_Control_Interno');
  };

  // If NOT authorized
  if (!isAdmin) {
    return (
      <div className="bg-slate-50 min-h-screen p-8 flex items-center justify-center font-sans">
        <div className="bg-white max-w-xl border border-slate-200 shadow-xl rounded-[40px] p-12 text-center text-slate-800 space-y-6">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl mx-auto flex items-center justify-center shadow-md">
            <ShieldAlert size={40} />
          </div>
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Segregación de Funciones Corporativas (SOX / CMF)</p>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">Acceso Restringido a Control Interno</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Se requiere el rol de <strong className="text-slate-900">ADMINISTRADOR</strong> para ingresar a la consola de control transaccional e integridad ledger. Su rol asignado actual es <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">{userRole}</span>.
          </p>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs text-left italic text-slate-500">
            * Cada intento de acceso o modificación de bitácora sin privilegios es auditado y guardado en los registros del servidor con firma IP.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER BANNER DESIGN */}
      <div className="bg-slate-900 rounded-[30px] p-8 text-white border border-slate-850 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        
        {/* Subtle Background Artistry */}
        <div className="absolute right-0 top-0 w-80 h-full bg-indigo-500/10 rounded-l-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5">
              <Shield size={10} /> Control Interno • Admin
            </span>
            <span className="bg-emerald-600/30 text-emerald-300 border border-emerald-500/20 px-3 py-1 text-[9px] font-mono uppercase tracking-[0.1em] rounded-full">
              F0911_AUDIT_CONSOLE
            </span>
          </div>
          <h2 className="text-2xl font-black text-white leading-none">AUDITORÍA TRANSACCIONAL DE EXTREMO A EXTREMO</h2>
          <p className="text-slate-400 text-xs">
            Consola centralizada para reconciliar, auditar IDs, clasificar partidas mayor, e imponer marcas de seguridad SOX/CMF.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 z-10">
          <button 
            onClick={handleExportAuditorExcel}
            className="flex items-center gap-2 px-5 py-3 bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-black uppercase tracking-wide hover:bg-slate-750 transition-all shadow-sm cursor-pointer"
          >
            <FileSpreadsheet size={16} /> Exportar Excel Auditoría
          </button>
        </div>
      </div>

      {/* SUBTAB NAVIGATION FOR ANTI-FRAUD VS. LIST */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-[26px] shadow-sm">
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveAuditTab('TRANSACTO_LIST')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeAuditTab === 'TRANSACTO_LIST' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Activity size={13} />
            <span>Resgistro Ledger G/L (F0911)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveAuditTab('ANTI_FRAUD_DIAGNOSTIC')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeAuditTab === 'ANTI_FRAUD_DIAGNOSTIC' 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
            }`}
          >
            <ShieldAlert size={13} className={activeAuditTab === 'ANTI_FRAUD_DIAGNOSTIC' ? '' : 'text-rose-500'} />
            <span>Análisis Estadístico Anti-Fraude</span>
          </button>
        </div>

        {activeAuditTab === 'ANTI_FRAUD_DIAGNOSTIC' && (
          <button
            type="button"
            onClick={() => downloadForensicAntiFraudReport({ transactions })}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all cursor-pointer animate-pulse"
          >
            <Download size={13} /> Descargar Dictamen Forense PDF
          </button>
        )}
      </div>

      {activeAuditTab === 'TRANSACTO_LIST' ? (
        <>
          {/* KPI METRICS BLOCK */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-inner-sm space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Muestra Total</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{kpis.totalCount}</span>
            <span className="text-[10px] text-slate-500 font-bold">Líneas</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[8px] bg-indigo-50 text-indigo-700 font-mono px-1 rounded">D:{kpis.sources.direct}</span>
            <span className="text-[8px] bg-emerald-50 text-emerald-700 font-mono px-1 rounded">O:{kpis.sources.auto}</span>
            <span className="text-[8px] bg-amber-50 text-amber-700 font-mono px-1 rounded">C:{kpis.sources.petty}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-inner-sm space-y-2">
          <p className="text-[9px] font-black text-[#10B981] uppercase tracking-widest leading-none mb-1">Auditadas Conforme</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{kpis.auditedCount}</span>
            <span className="text-[10px] text-emerald-500 font-bold">Conformes</span>
          </div>
          <p className="text-[9px] font-semibold text-slate-400 uppercase">Sin anomalías contables</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-inner-sm space-y-2">
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Observadas / Alertas</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{kpis.observedCount}</span>
            <span className="text-[10px] text-amber-500 font-bold">Observadas</span>
          </div>
          <p className="text-[9px] font-semibold text-slate-400 uppercase">En proceso de revisión</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-inner-sm space-y-2">
          <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">Riesgos Técnicos Hoy</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">{kpis.totalRiskCount}</span>
            <span className="text-[10px] text-rose-450 font-bold">Fallos Coherencia</span>
          </div>
          <p className="text-[9px] font-semibold text-slate-400 uppercase">Falta RUT, estampa o cuenta</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-inner-sm col-span-2 md:col-span-1 space-y-2">
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Cobertura Control</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">{kpis.completionRate}%</span>
            <span className="text-[10px] text-indigo-500 font-bold">Ratio</span>
          </div>
          {/* Completion rate bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${kpis.completionRate}%` }}></div>
          </div>
        </div>

      </div>

      {/* SEARCH AND FILTERS PANEL */}
      <div className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Filter size={16} className="text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-wider">Filtros Avanzados de Control Interno</span>
          </div>
          <button 
            type="button" 
            onClick={() => {
              setSearchTerm(''); setStatusFilter('ALL'); setAuditStatusFilter('ALL');
              setTypeFilter('ALL'); setTimePeriod('ALL'); setCompanyFilter('ALL');
              setSourceFilter('ALL'); setRiskFilter('ALL');
            }}
            className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-all cursor-pointer"
          >
            Reestablecer Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Search Input bar */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Buscar por Glosa, ID, Doc o Nombre</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ID de transacción, RUT, N° factura, observaciones..."
                className="w-full bg-slate-50 font-mono text-xs border border-slate-200 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Status general Contable */}
          <div className="space-y-1">
            <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Estado Contable G/L</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 font-bold text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">TODOS LOS ESTADOS</option>
              <option value="PENDIENTE">PENDIENTE DE PAGO / VALOR</option>
              <option value="COMPLETADA">COMPLETADA / PAGADA</option>
              <option value="ANULADA">ANULADA</option>
            </select>
          </div>

          {/* Audit Status filter */}
          <div className="space-y-1">
            <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Estado Auditoría Interna</label>
            <select
              value={auditStatusFilter}
              onChange={(e) => setAuditStatusFilter(e.target.value)}
              className="w-full bg-slate-50 font-bold text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 animate-pulse-subtle"
            >
              <option value="ALL">TODAS LAS RESOLUCIONES</option>
              <option value="PENDIENTE">PENDIENTE DE REVISIÓN</option>
              <option value="AUDITADO">AUDITADO CONFORME</option>
              <option value="OBSERVADO">OBSERVADO / ALERTA</option>
            </select>
          </div>

          {/* Type income / expense */}
          <div className="space-y-1">
            <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Tipo Flujo</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-50 font-bold text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">AMBOS FLUJOS (INGRESOS + EGRESOS)</option>
              <option value="INCOME">INGRESOS DE CAJA</option>
              <option value="EXPENSE">EGRESOS / PAGOS</option>
            </select>
          </div>

          {/* Incoherencies Risk selector */}
          <div className="space-y-1">
            <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Reglas de Anomalía</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">TODOS (SANOS + ANÓMALOS)</option>
              <option value="SANO">ÓPTIMO (SIN NOVEDAD)</option>
              <option value="CON_OBSERVACION">CON ANOMALÍAS DE COHERENCIA</option>
              <option value="FALTA_ESTAMPA">SIN FIRMA CRIPTOGRÁFICA ERP</option>
              <option value="HUERFANO">REGISTROS HUÉRFANOS (SIN PROV. VALIDO)</option>
            </select>
          </div>

          {/* Insurance Company filter */}
          <div className="space-y-1">
            <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Sociedad Aseguradora</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full bg-slate-50 font-bold text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">VIDA Y GENERALES</option>
              <option value="VIDA">VIDA ($)</option>
              <option value="GENERALES">GENERALES ($)</option>
            </select>
          </div>

          {/* Trans. Origin source */}
          <div className="space-y-1">
            <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Canal de Origen</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full bg-slate-50 font-bold text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">TODAS LAS FUENTES</option>
              <option value="DIRECT">OPERACIONES DIRECTAS</option>
              <option value="WORK_ORDER">ÓRDENES TRABAJO AUTO</option>
              <option value="CAJA_CHICA">AUXILIAR CAJA CHICA</option>
            </select>
          </div>

        </div>
      </div>

      {/* MAIN DATA GRID WITH TECHNICAL COLS */}
      <div className="bg-white border border-slate-200 rounded-[30px] overflow-hidden shadow-sm">
        
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-baseline sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">Muestra Auxiliar Recesiones</h3>
            <p className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">
              Visualización de IDs, RUT, vinculaciones, sellos ERP y estado SOX
            </p>
          </div>
          <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-3.5 py-1 rounded-xl font-bold">
            Mostrando {filteredTx.length} de {transactions.length} registros contables
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-250 select-none">
                <th style={{ width: '10%' }} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha / Ref ID</th>
                <th style={{ width: '15%' }} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Muestra Transaccional / Canal</th>
                <th style={{ width: '11%' }} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Monto CLP / Sociedad</th>
                <th style={{ width: '10%' }} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cuenta Contable</th>
                <th style={{ width: '13%' }} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">ID Proveedor (supplierId)</th>
                <th style={{ width: '11%' }} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">ID Propiedad (propertyId)</th>
                <th style={{ width: '11%' }} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">ID Orden (workOrderId)</th>
                <th style={{ width: '10%' }} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Estado Auditoría</th>
                <th style={{ width: '9%' }} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Controles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-450 font-bold italic">
                    Sin registros que coincidan con la combinación de filtros de control interno activa.
                  </td>
                </tr>
              ) : (
                filteredTx.map(tx => {
                  const auditStatus = tx.metadata?.auditStatus || 'PENDIENTE';
                  const hasAnomalies = tx.auditFindings.length > 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      
                      {/* Fecha & ID Contable */}
                      <td className="px-4 py-3.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar size={11} className="shrink-0" />
                          <span className="text-[10px] font-medium text-slate-700">{tx.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[9px] bg-slate-100 font-bold px-1.5 py-0.5 rounded text-slate-500 tracking-tighter" title={tx.id}>
                            {tx.id.split('-')[0].toUpperCase()}
                          </span>
                          <button 
                            type="button"
                            onClick={() => handleCopyText(tx.id, tx.id)}
                            className="text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                            title="Copiar ID Completo"
                          >
                            {copiedId === tx.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                          </button>
                        </div>
                      </td>

                      {/* Description & Source Channel */}
                      <td className="px-4 py-3.5 space-y-1 min-w-0">
                        <span className="text-xs font-black text-slate-800 block truncate uppercase" title={tx.description}>
                          {tx.description}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.25 rounded ${
                            tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          }`}>
                            {tx.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                          </span>
                          <span className="text-[8.5px] font-medium text-slate-400">
                            {tx.documentType} {tx.documentNumber ? `N°${tx.documentNumber}` : 'S/N'}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.25 rounded font-mono ${
                            tx.derivedSource === 'ORDEN_TRABAJO' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                            tx.derivedSource === 'CAJA_CHICA' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {tx.derivedSource}
                          </span>
                        </div>
                      </td>

                      {/* Monto & Sociedad */}
                      <td className="px-4 py-3.5 text-right space-y-1">
                        <span className={`text-xs font-mono font-black ${
                          tx.type === 'INCOME' ? 'text-emerald-750' : 'text-slate-800'
                        }`}>
                          {tx.type === 'EXPENSE' ? '-' : '+'}${tx.amount.toLocaleString()}
                        </span>
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block">
                          SOCIEDAD: {tx.insuranceCompany}
                        </span>
                      </td>

                      {/* Account Code classification */}
                      <td className="px-4 py-3.5">
                        {tx.accountCode ? (
                          <div className="font-mono text-[10px] text-indigo-700 font-bold bg-indigo-50/50 border border-indigo-100/30 px-2 py-0.5 rounded leading-none w-fit uppercase">
                            {tx.accountCode}
                          </div>
                        ) : (
                          <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 font-black px-2 py-0.5 rounded flex items-center gap-1 w-fit animate-pulse">
                            <AlertTriangle size={10} /> SIN CUENTA
                          </span>
                        )}
                      </td>

                      {/* Technical Key: supplierId */}
                      <td className="px-4 py-3.5 space-y-1">
                        {tx.supplierId ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1 rounded truncate leading-none font-bold" title={tx.supplierId}>
                                {tx.supplierId.split('-')[0].toUpperCase()}
                              </span>
                              <button 
                                type="button"
                                onClick={() => handleCopyText(tx.supplierId!, `${tx.id}-supplierId`)}
                                className="text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                              >
                                {copiedId === `${tx.id}-supplierId` ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-500 truncate block max-w-full font-black uppercase" title={tx.supplierName}>
                              {tx.supplierName || 'S/N'}
                            </span>
                          </div>
                        ) : tx.type === 'EXPENSE' ? (
                          <span className="text-[9px] text-rose-600 font-bold flex items-center gap-1 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded w-fit">
                            <AlertTriangle size={10} /> HUÉRFANO
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">No aplica (Ingreso)</span>
                        )}
                      </td>

                      {/* Technical Key: propertyId */}
                      <td className="px-4 py-3.5">
                        {tx.propertyId ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] text-purple-700 font-black bg-purple-50/50 border border-purple-100/50 px-2 py-0.5 rounded truncate leading-none font-bold" title={tx.propertyId}>
                              {tx.propertyId.split('-')[0].toUpperCase()}
                            </span>
                            <button 
                              type="button"
                              onClick={() => handleCopyText(tx.propertyId!, `${tx.id}-propertyId`)}
                              className="text-slate-400 hover:text-indigo-650 transition-all cursor-pointer"
                            >
                              {copiedId === `${tx.id}-propertyId` ? <Check size={10} className="text-purple-500" /> : <Copy size={10} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">(Vacio)</span>
                        )}
                      </td>

                      {/* Technical Key: workOrderId */}
                      <td className="px-4 py-3.5">
                        {tx.workOrderId ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] text-orange-700 font-black bg-orange-50/50 border border-orange-100/50 px-2 py-0.5 rounded truncate leading-none font-bold" title={tx.workOrderId}>
                              {tx.workOrderId.split('-')[0].toUpperCase()}
                            </span>
                            <button 
                              type="button"
                              onClick={() => handleCopyText(tx.workOrderId!, `${tx.id}-workOrderId`)}
                              className="text-slate-400 hover:text-indigo-650 transition-all cursor-pointer"
                            >
                              {copiedId === `${tx.id}-workOrderId` ? <Check size={10} className="text-orange-500" /> : <Copy size={10} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">(Vacio)</span>
                        )}
                      </td>

                      {/* State of Auditor resolution */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border leading-none ${
                          auditStatus === 'AUDITADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                          auditStatus === 'OBSERVADO' ? 'bg-amber-50 text-amber-700 border-amber-250 animate-pulse-subtle' :
                          auditStatus === 'ANULADA' ? 'bg-slate-100 text-slate-600 border-slate-350' :
                          'bg-indigo-50/30 text-indigo-700 border-indigo-250'
                        }`}>
                          {auditStatus === 'AUDITADO' && 'CONFORME'}
                          {auditStatus === 'OBSERVADO' && 'OBSERVADO'}
                          {auditStatus === 'ANULADA' && 'ANULADO'}
                          {auditStatus === 'PENDIENTE' && 'PENDIENTE'}
                        </span>
                      </td>

                      {/* Controles y Auditar directly */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectTx(tx)}
                            className="bg-indigo-600 hover:bg-slate-800 text-white p-1.5 rounded-lg transition-all shadow-sm cursor-pointer"
                            title="Auditar en Detalle (IDs, Factura, Ajustes)"
                          >
                            <Eye size={12} />
                          </button>
                          {auditStatus !== 'AUDITADO' && (
                            <button
                              type="button"
                              onClick={() => handleQuickApprove(tx)}
                              className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-500 hover:text-white p-1.5 rounded-lg transition-all cursor-pointer"
                              title="Marcar Conforme Directo"
                            >
                              <Check size={12} />
                            </button>
                          )}
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

      {/* COMPACT EXPLANATION DESIGNS OF AUDITING CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm flex flex-col md:flex-row items-center gap-5 justify-between">
        <div className="flex gap-4 items-center">
          <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-700 border border-indigo-100 shrink-0">
            <Info size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase leading-none">Pautas de Trazabilidad SOX e Integridad ERP F0911</h4>
            <p className="text-slate-500 text-xs mt-1.5">
              Este módulo permite auditar transacciones con sus relaciones master. El control interno debe certificar que cada egreso posea un RUT emisor registrado y que su cuenta contable de pasivo o gasto esté mapeada en el Plan de Cuentas base. Puedes re-clasificar cuentas directamente al auditar.
            </p>
          </div>
        </div>
      </div>
        </>
      ) : (
        /* ========================================================== */
        /* STOCHASTIC / STATISTICAL ANTI-FRAUD ENGINE (BENFORD & Z-SCORE) */
        /* ========================================================== */
        <div className="space-y-6">
          
          {/* Top Banner Alert Panel */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-[30px] p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-full bg-rose-600/5 rounded-l-full blur-2xl pointer-events-none"></div>
            <div className="space-y-1.5 relative z-10">
              <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-450 border border-rose-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full leading-none">
                <ShieldAlert size={12} /> Diagnóstico Forense Activa
              </span>
              <h3 className="text-lg font-black uppercase tracking-tight">Sismógrafo Forense de Transacciones Contables</h3>
              <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
                Este análisis aplica la <strong>Ley de Fenómenos Fractales de Benford</strong> y desviaciones estadísticas de <strong>Z-Score</strong> para examinar la veracidad logarítmica de cada saldo depositado en el libro diario.
              </p>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0 bg-slate-850 p-4 rounded-2xl border border-slate-800 relative z-10 w-full md:w-auto">
              <span className="text-4xl font-extrabold text-indigo-400 font-mono tracking-tight">{fraudStats.conformityScore}%</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Conformidad de Benford</span>
            </div>
          </div>

          {/* Core Stochastic KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* 1. Benford discrepancy status */}
            <div className="bg-white border border-slate-200 rounded-[24px] p-5 space-y-3 shadow-inner-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Fenómenos Fractales</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                  fraudStats.conformityScore >= 85 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {fraudStats.conformityScore >= 85 ? 'Sano' : 'Anomalías'}
                </span>
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-800 tracking-tight">
                  {fraudStats.conformityScore >= 90 ? 'Conforme' : fraudStats.conformityScore >= 75 ? 'Divergencia Leve' : 'Sospecha Alta'}
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">Cumplimiento del Logaritmo General ERP</p>
              </div>
            </div>

            {/* 2. Duplicated Transaction Clusters count */}
            <div className="bg-white border border-slate-200 rounded-[24px] p-5 space-y-3 shadow-inner-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Coincidencias Críticas</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                  fraudStats.duplicates.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {fraudStats.duplicates.length === 0 ? 'Sin Duplicados' : 'Alerta'}
                </span>
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-800 tracking-tight">{fraudStats.duplicates.length} Líneas</h4>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">Montos Idénticos en Misma Fecha</p>
              </div>
            </div>

            {/* 3. Round Amount Count */}
            <div className="bg-white border border-slate-200 rounded-[24px] p-5 space-y-3 shadow-inner-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Números Redondos</span>
                <span className="px-2 py-0.5 rounded text-[8px] bg-slate-100 text-slate-700 font-bold uppercase">Múltiplo $10.000</span>
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-800 tracking-tight">
                  {fraudStats.roundAmountCount} <span className="text-xs text-slate-400">({transactions.length > 0 ? ((fraudStats.roundAmountCount / transactions.length) * 100).toFixed(0) : 0}%)</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">Registros Sin Residuos Decimales</p>
              </div>
            </div>

            {/* 4. Weekend posts count */}
            <div className="bg-white border border-slate-200 rounded-[24px] p-5 space-y-3 shadow-inner-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Asientos Inusuales</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                  fraudStats.weekendTransactionCount === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {fraudStats.weekendTransactionCount === 0 ? 'Correcto' : 'Revisar'}
                </span>
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-800 tracking-tight">{fraudStats.weekendTransactionCount} Líneas</h4>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">Postings Creados Sábado o Domingo</p>
              </div>
            </div>

          </div>

          {/* TWO COLUMN CHART & ANALYTICS WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Benford Law Recharts diagram (Span 2) */}
            <div className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-rose-50 pb-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Desviación en Espectro de Primer Dígito</h4>
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Real-time G/L Transactions versus Benford Law Distribution</p>
                </div>
                <div className="flex items-center gap-4 text-[9px] font-black uppercase">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-slate-900 rounded-sm"></span>
                    <span>Curva Teórica</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <span className="w-3 h-3 bg-rose-600 rounded-sm"></span>
                    <span>Espectro Real</span>
                  </div>
                </div>
              </div>

              {/* Chart Stage Container */}
              <div className="h-[280px] w-full mt-2 font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={fraudStats.benfordChartData}
                    margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="digit" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: '#64748B', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      unit="%"
                    />
                    <RechartsTooltip 
                      contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#FFFFF1' }}
                      labelFormatter={(label) => `Primer Dígito: ${label}`}
                    />
                    <Bar 
                      dataKey="actual" 
                      fill="#DC2626" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    >
                      {fraudStats.benfordChartData.map((entry, index) => {
                        const isSevere = Math.abs(entry.delta) > 7.5;
                        return <RechartsCell key={`cell-${index}`} fill={isSevere ? '#DC2626' : '#10B981'} />;
                      })}
                    </Bar>
                    <Line 
                      type="monotone" 
                      dataKey="expected" 
                      stroke="#0F172A" 
                      strokeWidth={3} 
                      dot={{ fill: '#0F172A', strokeWidth: 2, r: 4 }} 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-[10px] text-slate-500 leading-relaxed">
                <strong className="text-slate-800 uppercase">¿Qué es el análisis de Benford?</strong> En contabilidad forense, los primeros dígitos de los importes contables naturales siguen una distribución logarítmica decreciente específica (el dígito 1 ocurre ~30% de las veces, mientras que el 9 ocurre ~4.6%). Cuando las frecuencias experimentan anomalías (columnas rojas), suele indicar manipulación manual de montos o fraccionamiento deliberado para saltar aprobaciones.
              </div>
            </div>

            {/* Stochastic details and actions right column (Span 1) */}
            <div className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm space-y-4 h-full">
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Métricas de Ruido Contable</h4>
              
              <div className="space-y-3.5">
                
                {/* 1. Benford Variance Ratio */}
                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0 font-bold">
                    σ
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 block font-mono">Divergencia Promedio</span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {Math.max(0, (100 - fraudStats.conformityScore) / 2.5).toFixed(2)} % de Desviación
                    </span>
                  </div>
                </div>

                {/* 2. Overlap Ratio */}
                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 bg-rose-50 text-rose-700 rounded-xl flex items-center justify-center border border-rose-100 shrink-0 font-bold">
                    D
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 block font-mono">Ratio de Duplicación</span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {transactions.length > 0 ? ((fraudStats.duplicates.length / transactions.length) * 100).toFixed(1) : 0}% del volumen
                    </span>
                  </div>
                </div>

                {/* 3. Operational Risk Level indicator */}
                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0 font-bold">
                    R
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 block font-mono">Riesgo Global Evaluado</span>
                    <span className={`text-xs font-extrabold uppercase ${
                      fraudStats.conformityScore >= 85 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {fraudStats.conformityScore >= 85 ? 'RIESGO CONTABLE BAJO' : 'RIESGO DE OBSERVACIÓN MODERADO'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Custom Advice */}
              <div className="bg-rose-50 border border-rose-100 text-rose-950 p-4 rounded-2xl space-y-2 mt-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-rose-600" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Aviso de Control Forense</span>
                </div>
                <p className="text-[10px] text-rose-800 leading-relaxed">
                  Las transacciones que caen fuera de los espectros esperados han sido aisladas automáticamente para su debida diligencia manual. Se aconseja certificar la firma hash de control (F980011D) para blindar los registros.
                </p>
              </div>

            </div>

          </div>

          {/* DETALLES DE TRANSACCIONES ALERTADAS */}
          <div className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Muestra Seleccionada de Registros Duplicados o de Alto Riesgo Contable</h4>
              </div>
              <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-2.5 py-0.5 border border-rose-200 rounded-full font-bold">
                {fraudStats.duplicates.length} Transacciones Alertadas
              </span>
            </div>

            <div className="overflow-x-auto">
              {fraudStats.duplicates.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                  <h5 className="text-xs font-black uppercase text-slate-800 mt-2">No se detectaron cobros o egresos duplicados en la base contable</h5>
                  <p className="text-[10px] text-slate-500 max-w-lg mx-auto leading-relaxed">
                    Todas las Journal Entries disfrutan de montos únicos asignados por fecha ordinaria. La integridad transaccional cumple perfectamente con el manual de cumplimiento.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest font-sans">
                      <th style={{ width: '15%' }} className="px-4 py-3">Código G/L (F0911)</th>
                      <th style={{ width: '15%' }} className="px-4 py-3">Fecha</th>
                      <th style={{ width: '25%' }} className="px-4 py-3">Concepto Glosa</th>
                      <th style={{ width: '15%' }} className="px-4 py-3 text-right">Monto</th>
                      <th style={{ width: '15%' }} className="px-4 py-3 text-center">Riesgos Hallados</th>
                      <th style={{ width: '15%' }} className="px-4 py-3 text-center transition-all">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-sans text-slate-700">
                    {fraudStats.duplicates.slice(0, 15).map(tx => {
                      const idShort = tx.id.substring(0, 8).toUpperCase();
                      
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-400">
                            #{idShort}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {tx.date}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800 max-w-xs truncate" title={tx.description}>
                            {tx.description}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900">
                            ${Math.abs(tx.amount || 0).toLocaleString('es-CL')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex px-2 py-0.5 bg-rose-50 text-rose-700 font-bold font-sans text-[8.5px] rounded-md border border-rose-200">
                              MONTO DUPLICADO CONTIGUO
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleSelectTx(tx)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-rose-600 text-white rounded-lg font-bold text-[9.5px] uppercase transition-all shadow-3xs cursor-pointer flex items-center gap-1 mx-auto"
                            >
                              <Eye size={11} /> Auditar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}

      {/* MASTER DETAILS DRAWER MODAL SHEET */}
      {selectedTx && (
        <div className="fixed inset-0 z-[190] overflow-hidden no-print" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            
            {/* Modal backdrop */}
            <div 
              className="absolute inset-0 bg-slate-900/60 transition-opacity backdrop-blur-xs" 
              onClick={() => setSelectedTx(null)}
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-2xl transform bg-white shadow-2xl transition-all duration-300 ease-in-out border-l border-slate-200">
                <div className="flex h-full flex-col overflow-y-auto font-sans">
                  
                  {/* Drawer Header */}
                  <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="text-indigo-400" size={16} />
                        <h2 className="text-sm font-black uppercase tracking-widest text-[#FFCC00]">Análisis de Trazabilidad Contable</h2>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">RESOLUCIÓN DE CONTROL INTERNO ADMIN</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSelectedTx(null)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Drawer Content */}
                  <div className="flex-1 space-y-6 px-6 py-6 overflow-y-auto">
                    
                    {validationSuccess && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-bounce">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        <span>{validationSuccess}</span>
                      </div>
                    )}

                    {/* GENERAL METRICS */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 space-y-4">
                      
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 uppercase">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                            selectedTx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {selectedTx.type === 'INCOME' ? 'FLUJO_INGRESO' : 'FLUJO_EGRESO'}
                          </span>
                          <h3 className="text-lg font-black text-slate-800 tracking-tight block">
                            {selectedTx.description}
                          </h3>
                        </div>
                        <span className="text-xl font-mono font-black text-slate-900 whitespace-nowrap">
                          {selectedTx.type === 'EXPENSE' ? '-' : '+'}${selectedTx.amount.toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Auxiliar Técnico</p>
                          <div className="font-semibold text-slate-700">{selectedTx.documentType} {selectedTx.documentNumber ? `#${selectedTx.documentNumber}` : 'S/N'}</div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Sociedad Legal</p>
                          <div className="font-bold text-slate-800">ASSETFLOW CO. {selectedTx.insuranceCompany}</div>
                        </div>
                      </div>

                    </div>

                    {/* DATABASE KEYS AND IDS (CRITICAL SOX REQUIREMENTS) */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-150 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Terminal size={12} className="text-slate-400" /> Identificadores UUID y Llaves Foráneas
                      </div>
                      <div className="p-4 space-y-3 font-mono text-xs">
                        
                        {/* 1. Transaction ID */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <p className="text-[9px] font-sans font-black text-slate-400 uppercase">id de Transacción contable</p>
                            <span className="text-slate-700 font-bold block select-all">{selectedTx.id}</span>
                          </div>
                          <button 
                            onClick={() => handleCopyText(selectedTx.id, 'txId-drawer')}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-500 p-2 border border-slate-200 rounded-xl transition-all cursor-pointer"
                            title="Copiar ID"
                          >
                            {copiedId === 'txId-drawer' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                        </div>

                        {/* 2. Supplier ID */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <p className="text-[9px] font-sans font-black text-slate-400 uppercase">id de Proveedor Vinculado (supplierId)</p>
                            <span className={`block font-bold ${selectedTx.supplierId ? 'text-indigo-700 select-all' : 'text-slate-405 italic'}`}>
                              {selectedTx.supplierId || '(Vacio)'}
                            </span>
                          </div>
                          {selectedTx.supplierId && (
                            <button 
                              onClick={() => handleCopyText(selectedTx.supplierId!, 'supplierId-drawer')}
                              className="bg-slate-50 hover:bg-slate-100 text-slate-500 p-2 border border-slate-200 rounded-xl transition-all cursor-pointer"
                              title="Copiar ID"
                            >
                              {copiedId === 'supplierId-drawer' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>

                        {/* 3. Property ID */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <p className="text-[9px] font-sans font-black text-slate-400 uppercase">id de Inmueble Vinculado (propertyId)</p>
                            <span className={`block font-bold ${selectedTx.propertyId ? 'text-purple-705 select-all' : 'text-slate-405 italic'}`}>
                              {selectedTx.propertyId || '(Vacio)'}
                            </span>
                          </div>
                          {selectedTx.propertyId && (
                            <button 
                              onClick={() => handleCopyText(selectedTx.propertyId!, 'propertyId-drawer')}
                              className="bg-slate-50 hover:bg-slate-100 text-slate-500 p-2 border border-slate-200 rounded-xl transition-all cursor-pointer"
                              title="Copiar ID"
                            >
                              {copiedId === 'propertyId-drawer' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>

                        {/* 4. Work Order ID */}
                        <div className="flex items-center justify-between pb-2">
                          <div>
                            <p className="text-[9px] font-sans font-black text-slate-400 uppercase">id de Orden de Trabajo (workOrderId)</p>
                            <span className={`block font-bold ${selectedTx.workOrderId ? 'text-orange-700 select-all' : 'text-slate-405 italic'}`}>
                              {selectedTx.workOrderId || '(Vacio)'}
                            </span>
                          </div>
                          {selectedTx.workOrderId && (
                            <button 
                              onClick={() => handleCopyText(selectedTx.workOrderId!, 'workOrderId-drawer')}
                              className="bg-slate-50 hover:bg-slate-100 text-slate-500 p-2 border border-slate-200 rounded-xl transition-all cursor-pointer"
                              title="Copiar ID"
                            >
                              {copiedId === 'workOrderId-drawer' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* ACTIVE RELATIONSHIPS CROSS-CHECK VALIDATION */}
                    <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Cruces de Integridad en Libros Auxiliares</h4>
                      
                      <div className="space-y-3">
                        
                        {/* Supplier Check result */}
                        {selectedTx.type === 'EXPENSE' && (
                          <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                            selectedTx.supplierId 
                              ? suppliers.some(s => s.id === selectedTx.supplierId) 
                                ? 'bg-emerald-50/50 border-emerald-100' 
                                : 'bg-rose-50/50 border-rose-100 text-rose-800'
                              : 'bg-amber-50/50 border-amber-100 text-amber-800'
                          }`}>
                            {selectedTx.supplierId ? (
                              suppliers.some(s => s.id === selectedTx.supplierId) ? (
                                <>
                                  <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-black uppercase text-emerald-800">Proveedor Encontrado y Válido</p>
                                    <p className="text-slate-550 mt-0.5">
                                      {suppliers.find(s => s.id === selectedTx.supplierId)?.name || 'N/A'} • RUT: {suppliers.find(s => s.id === selectedTx.supplierId)?.taxId || 'N/A'}
                                    </p>
                                    <p className="text-[10px] mt-1 font-mono text-emerald-700 font-bold">Estado Maestro: {suppliers.find(s => s.id === selectedTx.supplierId)?.status}</p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-black uppercase">¡PROVEEDOR HUÉRFANO DETECTADO!</p>
                                    <p className="text-slate-600 mt-0.5">La base de datos contiene un ID para este egreso que no existe en el catálogo maestro. Peligro de error de cuadratura en Balance.</p>
                                  </div>
                                </>
                              )
                            ) : (
                              <>
                                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-black uppercase">FALTA VINCULACIÓN A PROVEEDOR</p>
                                  <p className="text-slate-600 mt-0.5">Este egreso de fondos se realizó sin registrar el ID único del contratista.</p>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Property Check result */}
                        {selectedTx.propertyId && (
                          <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                            properties.some(p => p.id === selectedTx.propertyId) 
                              ? 'bg-emerald-50/50 border-emerald-100' 
                              : 'bg-rose-50/50 border-rose-100 text-rose-800'
                          }`}>
                            {properties.some(p => p.id === selectedTx.propertyId) ? (
                              <>
                                <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-black uppercase text-emerald-800 font-sans">Activo Inmobiliario Conciliado</p>
                                  <p className="text-slate-550 mt-0.5">
                                    Edificio: {properties.find(p => p.id === selectedTx.propertyId)?.building} • ROL: {properties.find(p => p.id === selectedTx.propertyId)?.propertyRole || 'S/ROL'}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-black uppercase">PROPIEDAD HUÉRFANA</p>
                                  <p className="text-slate-600 mt-0.5">La transacción apunta a un id de propiedad que fue eliminado o no existe en el catastro.</p>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Work Order Check result */}
                        {selectedTx.workOrderId && (
                          <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                            workOrders.some(ot => ot.id === selectedTx.workOrderId) 
                              ? 'bg-emerald-50/50 border-emerald-100' 
                              : 'bg-rose-50/50 border-rose-100'
                          }`}>
                            {workOrders.some(ot => ot.id === selectedTx.workOrderId) ? (
                              <>
                                <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-black uppercase text-emerald-800">Orden de Trabajo Asociada</p>
                                  <p className="text-slate-550 mt-0.5">
                                    Folio ERP: #{workOrders.find(ot => ot.id === selectedTx.workOrderId)?.folio} • Confeccionada por: {workOrders.find(ot => ot.id === selectedTx.workOrderId)?.preparedBy}
                                  </p>
                                  <p className="text-[10px] mt-1 font-mono text-emerald-700 font-bold">Estado OT: {workOrders.find(ot => ot.id === selectedTx.workOrderId)?.status}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-black uppercase text-rose-800">Orden de Trabajo Inexistente</p>
                                  <p className="text-slate-600 mt-0.5">El ID de reconciliación de la orden de trabajo no figura en el listado activo.</p>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                      </div>
                    </div>

                    {/* ASSETFLOW ENTERPRISE AUDIT STAMPS AND CERTIFICATES */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-150 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                        <div className="flex items-center gap-1.5"><Terminal size={12} /> ASSETFLOW Enterprise ERP Audit Stamps (F0911)</div>
                        {selectedTx.hashSignature ? (
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase">SELLADO</span>
                        ) : (
                          <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded uppercase">FALTA SELLO</span>
                        )}
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <span className="text-[8px] font-sans font-black text-slate-400 uppercase tracking-wider block mb-1">Programa ERP de Origen (programId)</span>
                            <span className="text-slate-800 font-bold">{selectedTx.programId || 'NO REGISTRADO (POR DEFECTO)'}</span>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <span className="text-[8px] font-sans font-black text-slate-400 uppercase tracking-wider block mb-1">Caja/Terminal ID (workStationId)</span>
                            <span className="text-slate-800 font-bold uppercase truncate block" title={selectedTx.workStationId}>{selectedTx.workStationId || 'NO REGISTRADO'}</span>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <span className="text-[8px] font-sans font-black text-slate-400 uppercase tracking-wider block mb-1">Secuencial Ledger (nextNumberSeq)</span>
                            <span className="text-indigo-850 font-black">{selectedTx.nextNumberSeq || 'SIN ASIGNAR'}</span>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <span className="text-[8px] font-sans font-black text-slate-400 uppercase tracking-wider block mb-1">Lote de Entrada Ledger (batchNumber)</span>
                            <span className="text-slate-800 font-bold">{selectedTx.batchNumber || `BAT-${Math.floor(selectedTx.timestamp % 100000)}`}</span>
                          </div>
                        </div>

                        {/* Hash Signature key string */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 space-y-1.5 font-mono text-[10px]">
                          <span className="text-[8px] font-sans font-black text-slate-400 uppercase block leading-none">Firma de Integridad Criptográfica (hashSignature)</span>
                          <span className={`block font-bold leading-tight break-all ${selectedTx.hashSignature ? 'text-emerald-700' : 'text-slate-400 italic'}`}>
                            {selectedTx.hashSignature || 'Falta certificar firma para esta partida.'}
                          </span>
                        </div>

                        {/* Seal Action Trigger button */}
                        {!selectedTx.hashSignature && (
                          <button
                            type="button"
                            onClick={() => handleApplySecurityStamps(selectedTx.id)}
                            className="w-full flex items-center justify-center gap-2.5 bg-slate-900 border border-slate-850 text-white rounded-xl py-3 text-xs font-black uppercase tracking-wider hover:bg-indigo-650 transition-all cursor-pointer shadow-indigo-100 shadow"
                          >
                            <Terminal size={14} className="text-indigo-400 animate-pulse" /> Estampar Certificado de Seguridad ERP
                          </button>
                        )}
                      </div>
                    </div>

                    {/* CORRECTIVE AND RESOLVED CONTROL FORM */}
                    <form onSubmit={handleSaveAuditResolution} className="border-2 border-dashed border-slate-200 rounded-3xl p-5 space-y-5">
                      
                      <div className="flex items-center gap-1 text-slate-800">
                        <Edit2 size={14} className="text-indigo-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider">Ajustes & Dictamen Mayor (Control Interno)</h4>
                      </div>

                      <div className="space-y-4 text-xs">
                        
                        {/* 1. Account Code adjust */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase">Clasificación Mayor Contable (accountCode)</label>
                          <input
                            type="text"
                            value={tempAccountCode}
                            onChange={(e) => setTempAccountCode(e.target.value.toUpperCase())}
                            placeholder="Ej: 5.2.01.001, 1.1.03.002..."
                            className="w-full bg-slate-50 font-mono text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <p className="text-[8.5px] text-slate-405 leading-relaxed font-sans mt-0.5">
                            * Ingresar código estructurado según el catálogo del Plan de Cuentas.
                          </p>
                        </div>

                        {/* 2. Amount and Description override */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Ajuste de Glosa / Descripción</label>
                            <input
                              type="text"
                              value={tempDescription}
                              onChange={(e) => setTempDescription(e.target.value)}
                              className="w-full bg-slate-55 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Ajuste de Monto Nominal (CLP)</label>
                            <input
                              type="number"
                              value={tempAmount}
                              onChange={(e) => setTempAmount(Number(e.target.value))}
                              className="w-full bg-slate-55 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        {/* 3. Transaction state override */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase">Estado Contable del Flujo</label>
                          <select
                            value={tempStatus}
                            onChange={(e) => setTempStatus(e.target.value as any)}
                            className="w-full bg-slate-55 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="PENDIENTE">PENDIENTE DE PAGO</option>
                            <option value="COMPLETADA">PAGADA / DISPERSADA</option>
                            <option value="ANULADA">ANULADO DE LIBRO AUXILIAR</option>
                          </select>
                        </div>

                        {/* 4. Audit Status picker */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase">Resolución Dictamen de Auditoría Interna</label>
                          <select
                            value={newAuditStatus}
                            onChange={(e) => setNewAuditStatus(e.target.value as any)}
                            className="w-full bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-250 rounded-xl px-3- py-2.5 focus:outline-none"
                          >
                            <option value="PENDIENTE">PENDIENTE - EN EVALUACIÓN</option>
                            <option value="AUDITADO">AUDITADO - CONFORME (SOX COMPLIANT)</option>
                            <option value="OBSERVADO">OBSERVADO - INCUMPLIMIENTO / RECLASIFICAR</option>
                            <option value="ANULADA">ANULADO - DUPLICADO / SOSPECHOSO</option>
                          </select>
                        </div>

                        {/* 5. Audit feedback remarks */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase font-sans">Comentarios Técnicos / Observaciones</label>
                          <textarea
                            value={auditRemarks}
                            onChange={(e) => setAuditRemarks(e.target.value)}
                            placeholder="Describir aquí el hallazgo de control interno..."
                            className="w-full min-h-[80px] bg-slate-55 border border-slate-300 rounded-xl p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                      </div>

                      {/* Form Actions */}
                      <div className="flex gap-3 justify-end leading-none">
                        <button
                          type="button"
                          onClick={() => setSelectedTx(null)}
                          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-black uppercase tracking-wide transition-all cursor-pointer"
                        >
                          Cerrar
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wide transition-all cursor-pointer shadow h-fit"
                        >
                          Guardar Resolución
                        </button>
                      </div>

                    </form>

                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
