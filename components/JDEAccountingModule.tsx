import React, { useState, useMemo } from 'react';
import { 
  Transaction, 
  AccountingAccount, 
  Property, 
  Supplier, 
  WorkOrder, 
  LeaseContract, 
  UserRole 
} from '../types';
import { CHART_OF_ACCOUNTS } from '../lib/accountingData';
import { formatCLP, formatRUT } from '../lib/chileanUtils';
import { exportToExcel } from '../lib/excelExport';
import { printHtmlElement } from '../lib/printDocument';
import { JDEGridContextMenu } from './JDEGridContextMenu';
import {
  JDELedgerType,
  JDE_LEDGER_TYPES_UDC_09_LT,
  JDEAutomaticAccountingInstruction,
  DEFAULT_JDE_AAI_TABLE_F0012,
  JDEFiscalPeriodRule,
  DEFAULT_FISCAL_PERIODS_F0010,
  runJDEIntegrityAuditSuite,
  JDEIntegrityReportResult,
} from '../lib/jdeIntegrityAndAaiService';
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  Layers, 
  Calculator, 
  Building2, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Scale, 
  FileSpreadsheet, 
  CheckCheck, 
  Clock, 
  ShieldCheck, 
  Activity, 
  Wallet, 
  FileText,
  X,
  AlertCircle,
  MoreVertical
} from 'lucide-react';

export type JDEAccountingTab = 
  | 'P0911_JOURNAL'         // Asientos de Diario y Comprobantes F0911
  | 'P09200_ACCOUNT_LEDGER' // Mayor de Cuentas Interactivo
  | 'P0901_CHART_ACCOUNTS'  // Plan de Cuentas Estructurado LOD
  | 'P09216_TRIAL_BALANCE'  // Balance Tributario de 8 Columnas
  | 'P09801_BATCH_POST'     // Gestión y Posteo de Lotes F0011
  | 'R097011_INTEGRITY'     // Suite UBE Integridad Sublibros vs. Mayor (R097011 / R04701 / R03B701 / R43500 / R12701)
  | 'P0012_AAI_PERIODS'     // Motor de AAIs (F0012) & Control de Períodos Fiscales (P0010)
  | 'P09131_BANK_RECON'     // Conciliación Bancaria
  | 'P0902_BUDGET_ACTUAL';  // Presupuesto vs Real

interface JDEAccountingModuleProps {
  transactions: Transaction[];
  workOrders: WorkOrder[];
  properties: Property[];
  suppliers: Supplier[];
  leaseContracts: LeaseContract[];
  currentUser: string;
  userRole?: UserRole;
  onAddTransaction: (transaction: Transaction) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const JDEAccountingModule: React.FC<JDEAccountingModuleProps> = ({
  transactions,
  workOrders,
  properties,
  suppliers,
  leaseContracts,
  currentUser,
  userRole = 'JEFE',
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
}) => {
  const [activeTab, setActiveTab] = useState<JDEAccountingTab>('P0911_JOURNAL');

  // ERP Multi-Ledger Type Selector (UDC 09/LT: AA, TA, PA, UF)
  const [selectedLedgerType, setSelectedLedgerType] = useState<JDELedgerType>('AA');

  // ERP Automatic Accounting Instructions Table (F0012) & Fiscal Periods (F0010)
  const [aaiList, setAaiList] = useState<JDEAutomaticAccountingInstruction[]>(DEFAULT_JDE_AAI_TABLE_F0012);
  const [fiscalPeriods, setFiscalPeriods] = useState<JDEFiscalPeriodRule[]>(DEFAULT_FISCAL_PERIODS_F0010);
  const [selectedUbeReportCode, setSelectedUbeReportCode] = useState<string>('ALL');
  const [aaiSystemFilter, setAaiSystemFilter] = useState<string>('ALL');

  // Chart of accounts local state
  const [accounts, setAccounts] = useState<AccountingAccount[]>(CHART_OF_ACCOUNTS);

  // Search & Filter States
  const [searchGeneral, setSearchGeneral] = useState('');
  const [filterAccountCode, setFilterAccountCode] = useState('ALL');
  const [filterPropertyId, setFilterPropertyId] = useState('ALL');
  const [filterDocType, setFilterDocType] = useState('ALL');
  const [filterBatchStatus, setFilterBatchStatus] = useState<'ALL' | 'POSTED' | 'APPROVED' | 'HOLD'>('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Selected Account for P09200 Account Ledger Inquiry
  const [selectedLedgerAccountCode, setSelectedLedgerAccountCode] = useState<string>('1.1.01.03'); // Default Banco de Chile

  // Modal State for New Journal Entry (P0911)
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [newEntryHeader, setNewEntryHeader] = useState({
    date: new Date().toISOString().split('T')[0],
    docType: 'JE',
    explanation: '',
    propertyId: '',
    batchNumber: `B-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`,
  });
  const [newEntryLines, setNewEntryLines] = useState<Array<{
    id: string;
    accountCode: string;
    description: string;
    debit: number;
    credit: number;
  }>>([
    { id: '1', accountCode: '5.1.01.01', description: 'GASTO MANTENCIÓN PREVENTIVA', debit: 150000, credit: 0 },
    { id: '2', accountCode: '1.1.01.03', description: 'PAGO BANCO DE CHILE CTA CTE', debit: 0, credit: 150000 },
  ]);

  // Modal State for New Account (P0901)
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [newAccountData, setNewAccountData] = useState<Partial<AccountingAccount>>({
    code: '',
    name: '',
    type: 'ACTIVO',
    subType: 'CORRIENTE',
    level: 4,
    parentCode: '1.1.01',
  });

  // Context Menu State
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    tx: Transaction;
  } | null>(null);

  // Column width states for interactive mouse drag resizing (authentic AssetFlow Enterprise grid)
  const [colWidthsP0911, setColWidthsP0911] = useState<{ [key: string]: number }>({
    idx: 45,
    date: 95,
    docNumber: 115,
    docType: 70,
    accountCode: 125,
    description: 280,
    debit: 110,
    credit: 110,
    batchNumber: 115,
    status: 120,
    actions: 90,
  });

  const [colWidthsP09200, setColWidthsP09200] = useState<{ [key: string]: number }>({
    idx: 45,
    date: 95,
    docNumber: 120,
    description: 280,
    debit: 115,
    credit: 115,
    balance: 130,
    actions: 75,
  });

  const [colWidthsP09216, setColWidthsP09216] = useState<{ [key: string]: number }>({
    code: 110,
    name: 240,
    debitSum: 110,
    creditSum: 110,
    debitBal: 110,
    creditBal: 110,
    asset: 110,
    liability: 110,
    loss: 110,
    gain: 110,
  });

  const [colWidthsP0901, setColWidthsP0901] = useState<{ [key: string]: number }>({
    code: 110,
    lod: 65,
    name: 280,
    type: 120,
    nature: 110,
    status: 100,
  });

  const [colWidthsP09801, setColWidthsP09801] = useState<{ [key: string]: number }>({
    batchNumber: 130,
    date: 95,
    count: 75,
    total: 130,
    user: 130,
    status: 115,
    actions: 140,
  });

  const handleResizeStart = (
    setter: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>,
    currentWidths: { [key: string]: number },
    colKey: string,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = currentWidths[colKey] || 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const diffX = moveEvent.clientX - startX;
      setter(prev => ({
        ...prev,
        [colKey]: Math.max(35, startWidth + diffX)
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Filtered transactions for P0911
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (searchGeneral) {
        const term = searchGeneral.toLowerCase();
        const matchDesc = tx.description?.toLowerCase().includes(term);
        const matchDoc = tx.documentNumber?.toLowerCase().includes(term);
        const matchAcc = tx.accountCode?.toLowerCase().includes(term);
        const matchUser = tx.user?.toLowerCase().includes(term);
        const matchBatch = tx.batchNumber?.toLowerCase().includes(term);
        if (!matchDesc && !matchDoc && !matchAcc && !matchUser && !matchBatch) return false;
      }
      if (filterAccountCode !== 'ALL' && tx.accountCode !== filterAccountCode) return false;
      if (filterPropertyId !== 'ALL' && tx.propertyId !== filterPropertyId) return false;
      if (filterDocType !== 'ALL' && tx.documentType !== filterDocType) return false;
      if (filterDateFrom && tx.date < filterDateFrom) return false;
      if (filterDateTo && tx.date > filterDateTo) return false;
      if (filterBatchStatus !== 'ALL') {
        const isPosted = tx.status === 'COMPLETADA';
        if (filterBatchStatus === 'POSTED' && !isPosted) return false;
        if (filterBatchStatus === 'APPROVED' && isPosted) return false;
      }
      return true;
    });
  }, [transactions, searchGeneral, filterAccountCode, filterPropertyId, filterDocType, filterBatchStatus, filterDateFrom, filterDateTo]);

  // P09200: Ledger calculation for selected account
  const ledgerEntries = useMemo(() => {
    const matched = transactions
      .filter(tx => tx.accountCode === selectedLedgerAccountCode)
      .sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = 0;
    return matched.map(tx => {
      const isIncome = tx.type === 'INCOME';
      const debit = !isIncome ? tx.amount : 0;
      const credit = isIncome ? tx.amount : 0;

      // Normal balance: Assets & Expenses increase on Debit, Liabilities/Equity/Income on Credit
      const acc = accounts.find(a => a.code === selectedLedgerAccountCode);
      const isDebitNormal = acc?.type === 'ACTIVO' || acc?.type === 'EGRESOS';

      if (isDebitNormal) {
        runningBalance += (debit - credit);
      } else {
        runningBalance += (credit - debit);
      }

      return {
        ...tx,
        debit,
        credit,
        runningBalance,
      };
    });
  }, [transactions, selectedLedgerAccountCode, accounts]);

  // P09216: 8-Column Trial Balance calculation
  const trialBalance8Columns = useMemo(() => {
    const reportRows: Array<{
      account: AccountingAccount;
      debitSum: number;
      creditSum: number;
      debitBalance: number;
      creditBalance: number;
      assetInventory: number;
      liabilityInventory: number;
      lossResult: number;
      gainResult: number;
    }> = [];

    let totalDebitSum = 0;
    let totalCreditSum = 0;
    let totalDebitBalance = 0;
    let totalCreditBalance = 0;
    let totalAssetInventory = 0;
    let totalLiabilityInventory = 0;
    let totalLossResult = 0;
    let totalGainResult = 0;

    // Filter level 4 leaf accounts
    const leafAccounts = accounts.filter(a => (a.level === 4 || a.code.split('.').length >= 4));

    leafAccounts.forEach((account) => {
      const relatedTxs = transactions.filter(t => t.accountCode === account.code);
      
      let debitSum = 0;
      let creditSum = 0;

      relatedTxs.forEach(tx => {
        if (tx.type === 'EXPENSE') {
          debitSum += tx.amount;
        } else {
          creditSum += tx.amount;
        }
      });

      // Default seed values if no transactions yet for realism
      if (relatedTxs.length === 0) {
        if (account.code === '1.1.01.03') debitSum = 18500000;
        else if (account.code === '1.2.01.01') debitSum = 120000000;
        else if (account.code === '1.2.01.02') debitSum = 250000000;
        else if (account.code === '3.1') creditSum = 350000000;
        else if (account.code === '4.1.01') creditSum = 38500000;
      }

      // Apply Multi-Ledger Transformation (UDC 09/LT: AA, TA, PA, UF)
      const UF_RATE = 38450;
      if (selectedLedgerType === 'TA') {
        // Libro Tributario SII (Art. 41 LIR Corrección Monetaria 4.2% sobre Activos No Monetarios y Patrimonio, Depreciación Acelerada)
        if (account.code.startsWith('1.2.01') || account.code.startsWith('3.1')) {
          debitSum = Math.round(debitSum * 1.042);
          creditSum = Math.round(creditSum * 1.042);
        }
      } else if (selectedLedgerType === 'PA') {
        // Libro de Compromisos Presupuestarios de Órdenes de Trabajo (F4801 / F4311)
        const committedWOTotal = workOrders
          .filter(wo => wo.status === 'APROBADA' || wo.status === 'EMITIDA_IMPRESA' || wo.status === 'RECEPCIONADA_PARCIAL' || wo.status === 'RECEPCIONADA')
          .reduce((s, wo) => s + (Number(wo.total) || 0), 0);
        if (account.code === '5.1.01.01') {
          debitSum = committedWOTotal;
          creditSum = 0;
        } else if (account.code === '2.1.01.01' || account.code === '2.1.01.02') {
          debitSum = 0;
          creditSum = account.code === '2.1.01.01' ? committedWOTotal : 0;
        } else {
          debitSum = 0;
          creditSum = 0;
        }
      } else if (selectedLedgerType === 'UF') {
        debitSum = Math.round((debitSum / UF_RATE) * 100) / 100;
        creditSum = Math.round((creditSum / UF_RATE) * 100) / 100;
      }

      let debitBalance = 0;
      let creditBalance = 0;
      if (debitSum >= creditSum) {
        debitBalance = debitSum - creditSum;
      } else {
        creditBalance = creditSum - debitSum;
      }

      let assetInventory = 0;
      let liabilityInventory = 0;
      let lossResult = 0;
      let gainResult = 0;

      if (account.type === 'ACTIVO') {
        assetInventory = debitBalance > 0 ? debitBalance : 0;
      } else if (account.type === 'PASIVO' || account.type === 'PATRIMONIO') {
        liabilityInventory = creditBalance > 0 ? creditBalance : 0;
      } else if (account.type === 'EGRESOS') {
        lossResult = debitBalance > 0 ? debitBalance : 0;
      } else if (account.type === 'INGRESOS') {
        gainResult = creditBalance > 0 ? creditBalance : 0;
      }

      totalDebitSum += debitSum;
      totalCreditSum += creditSum;
      totalDebitBalance += debitBalance;
      totalCreditBalance += creditBalance;
      totalAssetInventory += assetInventory;
      totalLiabilityInventory += liabilityInventory;
      totalLossResult += lossResult;
      totalGainResult += gainResult;

      reportRows.push({
        account,
        debitSum,
        creditSum,
        debitBalance,
        creditBalance,
        assetInventory,
        liabilityInventory,
        lossResult,
        gainResult,
      });
    });

    const netResultInventory = totalAssetInventory - totalLiabilityInventory;
    const netResultLossGain = totalGainResult - totalLossResult;

    return {
      rows: reportRows,
      totals: {
        totalDebitSum,
        totalCreditSum,
        totalDebitBalance,
        totalCreditBalance,
        totalAssetInventory,
        totalLiabilityInventory,
        totalLossResult,
        totalGainResult,
        netResultInventory,
        netResultLossGain,
        isBalanced: Math.abs(netResultInventory - netResultLossGain) < 1,
      }
    };
  }, [accounts, transactions, selectedLedgerType, workOrders]);

  // Suite de Reportes UBE de Integridad ERP (R097011, R04701, R43500, R03B701, R12701, R0018P)
  const integrityReports = useMemo(() => {
    return runJDEIntegrityAuditSuite({
      transactions,
      workOrders,
      properties,
      suppliers,
      leaseContracts,
      aaiTable: aaiList,
    });
  }, [transactions, workOrders, properties, suppliers, leaseContracts, aaiList]);

  // Ejecutar cuadratura automática de un reporte UBE de Integridad mediante el Motor AAI (F0012)
  const handleAutoReconcileUbeReport = (report: JDEIntegrityReportResult) => {
    if (report.ubeCode === 'R097011') {
      // Postear todos los lotes pendientes en F0011 -> F0911
      transactions
        .filter(tx => tx.status !== 'COMPLETADA' && tx.status !== 'ANULADA')
        .forEach(tx => {
          onUpdateTransaction({
            ...tx,
            status: 'COMPLETADA',
          });
        });
      return;
    }

    const batchId = `B-AAI-${report.ubeCode}-${Date.now().toString().slice(-4)}`;
    const todayStr = '2026-06-30';

    report.discrepancies.forEach((disc, idx) => {
      const isIncome = report.ubeCode === 'R03B701';
      const newTx: Transaction = {
        id: crypto.randomUUID(),
        date: todayStr,
        invoiceDate: todayStr,
        documentNumber: disc.associatedInvoice && disc.associatedInvoice !== 'PENDIENTE DTE'
          ? disc.associatedInvoice
          : `${disc.suggestedDocType}-${Date.now().toString().slice(-5)}-${idx + 1}`,
        documentType: disc.suggestedDocType,
        description: `[AAI ${disc.aaiCode} • ${report.ubeCode}] ${disc.description}`.toUpperCase(),
        amount: Math.abs(disc.variance),
        type: isIncome ? 'INCOME' : 'EXPENSE',
        category: disc.category || (isIncome ? 'ARRIENDOS REAL ESTATE' : 'AJUSTE INTEGRIDAD ERP'),
        accountCode: disc.targetAccountCode,
        workOrderId: (report.ubeCode === 'R04701' || report.ubeCode === 'R43500') ? disc.id : undefined,
        user: currentUser,
        timestamp: Date.now() + idx,
        status: 'COMPLETADA',
        batchNumber: batchId,
        programId: report.ubeCode,
        insuranceCompany: 'GENERALES',
        lockedBy: null,
        lockedAt: null,
      };
      onAddTransaction(newTx);
    });
  };

  // Conciliar todos los reportes UBE con diferencias en 1 clic
  const handleReconcileAllIntegrityReports = () => {
    integrityReports.forEach(rep => {
      if (rep.status !== 'CUADRADO_OK' && rep.discrepancies.length > 0) {
        handleAutoReconcileUbeReport(rep);
      }
    });
  };

  // P09801: Batches in F0011
  const batchList = useMemo(() => {
    const batchesMap = new Map<string, {
      batchNumber: string;
      docCount: number;
      totalAmount: number;
      createdDate: string;
      status: 'POSTED' | 'APPROVED';
      createdBy: string;
    }>();

    transactions.forEach((tx) => {
      const bNum = tx.batchNumber || 'B-2026-DEFAULT';
      if (!batchesMap.has(bNum)) {
        batchesMap.set(bNum, {
          batchNumber: bNum,
          docCount: 0,
          totalAmount: 0,
          createdDate: tx.date,
          status: tx.status === 'COMPLETADA' ? 'POSTED' : 'APPROVED',
          createdBy: tx.user || 'SISTEMA',
        });
      }
      const b = batchesMap.get(bNum)!;
      b.docCount++;
      b.totalAmount += tx.amount || 0;
      if (tx.status !== 'COMPLETADA') {
        b.status = 'APPROVED';
      }
    });

    return Array.from(batchesMap.values());
  }, [transactions]);

  // Handle saving new journal entry (with P0010 / F0010 Fiscal Period Gatekeeper)
  const handleSaveNewEntry = () => {
    const entryMonth = Number(newEntryHeader.date.split('-')[1] || 6);
    const periodRule = fiscalPeriods.find(p => p.periodNumber === entryMonth);
    if (periodRule && periodRule.glStatus !== 'OPEN') {
      alert(
        `⛔ ERROR ERP 0128 — PBCO (Post Before/After Cutoff) en Tabla F0010:\n\n` +
        `El período contable "${periodRule.periodName}" se encuentra en estado [${periodRule.glStatus}].\n` +
        (periodRule.f29Declared
          ? `Además, el Formulario 29 (SII) de este período ya fue declarado y bloqueado.\n\n`
          : `\n`) +
        `Para contabilizar en este mes, un Administrador debe autorizar la reapertura temporal del período en la pestaña "P0012 / P0010: Motor AAIs & Control Períodos".`
      );
      return;
    }

    const totalDebit = newEntryLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = newEntryLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

    if (totalDebit !== totalCredit || totalDebit <= 0) {
      alert(`El asiento está desbalanceado:\nTotal Débito: ${formatCLP(totalDebit)}\nTotal Crédito: ${formatCLP(totalCredit)}\n\nEn AssetFlow Enterprise un asiento debe estar 100% balanceado para ser registrado.`);
      return;
    }

    if (!newEntryHeader.explanation.trim()) {
      alert('Debe ingresar la glosa o explicación general del asiento contable.');
      return;
    }

    // Create two balanced transaction legs (or one compound per line)
    newEntryLines.forEach((line) => {
      if (line.debit > 0 || line.credit > 0) {
        const isExpense = line.debit > 0;
        const newTx: Transaction = {
          id: crypto.randomUUID(),
          date: newEntryHeader.date,
          invoiceDate: newEntryHeader.date,
          documentNumber: `JE-${Date.now().toString().slice(-6)}`,
          documentType: newEntryHeader.docType,
          description: `${newEntryHeader.explanation.toUpperCase()} - ${line.description.toUpperCase()}`,
          amount: line.debit > 0 ? line.debit : line.credit,
          type: isExpense ? 'EXPENSE' : 'INCOME',
          category: 'CONTABILIDAD GENERAL',
          accountCode: line.accountCode,
          propertyId: newEntryHeader.propertyId || undefined,
          user: currentUser,
          timestamp: Date.now(),
          status: 'COMPLETADA',
          batchNumber: newEntryHeader.batchNumber,
          programId: 'P0911',
          insuranceCompany: 'GENERALES',
          lockedBy: null,
          lockedAt: null,
        };
        onAddTransaction(newTx);
      }
    });

    setIsNewEntryModalOpen(false);
    alert(`✅ Asiento de diario registrado con éxito en Lote ${newEntryHeader.batchNumber}.\nBalance verificado: Débitos = Créditos = ${formatCLP(totalDebit)} CLP.`);
  };

  // Handle posting a batch (P09801)
  const handlePostBatch = (batchNumber: string) => {
    if (!window.confirm(`¿Confirma ejecutar el Posteo Contable General (UBE R09801) para el lote ${batchNumber}?`)) return;

    transactions
      .filter(tx => (tx.batchNumber || 'B-2026-DEFAULT') === batchNumber)
      .forEach(tx => {
        onUpdateTransaction({
          ...tx,
          status: 'COMPLETADA',
        });
      });

    alert(`✅ Lote ${batchNumber} posteado al Mayor General F0911 correctamente.`);
  };

  // Export Table to Excel
  const handleExportExcel = () => {
    if (activeTab === 'P0911_JOURNAL') {
      const data = filteredTransactions.map(tx => ({
        Fecha: tx.date,
        Doc_Tipo: tx.documentType,
        Doc_Nro: tx.documentNumber,
        Cuenta_Contable: tx.accountCode,
        Glosa_Asiento: tx.description,
        Debe_CLP: tx.type === 'EXPENSE' ? tx.amount : 0,
        Haber_CLP: tx.type === 'INCOME' ? tx.amount : 0,
        Lote_F0011: tx.batchNumber || 'B-2026',
        Estado_Posteo: tx.status === 'COMPLETADA' ? 'P (Posteado)' : 'A (Aprobado)',
        Usuario: tx.user,
      }));
      exportToExcel(data, `ERP_P0911_Diario_General_${new Date().toISOString().split('T')[0]}`);
    } else if (activeTab === 'P09216_TRIAL_BALANCE') {
      const data = trialBalance8Columns.rows.map(r => ({
        Codigo: r.account.code,
        Nombre_Cuenta: r.account.name,
        Debitos: r.debitSum,
        Creditos: r.creditSum,
        Saldo_Deudor: r.debitBalance,
        Saldo_Acreedor: r.creditBalance,
        Activo: r.assetInventory,
        Pasivo: r.liabilityInventory,
        Perdida: r.lossResult,
        Ganancia: r.gainResult,
      }));
      exportToExcel(data, `ERP_P09216_Balance_8_Columnas_${new Date().toISOString().split('T')[0]}`);
    }
  };

  const handlePrintReport = () => {
    printHtmlElement('jde-accounting-report-area', `ERP_Contabilidad_${activeTab}`);
  };

  return (
    <div className="h-full flex flex-col bg-[#F4F8FB] select-none text-slate-800 font-sans">
      
      {/* ERP TOP BANNER & FAST PATH */}
      <div className="bg-[#0B3C5D] text-white border-b-2 border-emerald-500 shadow-md shrink-0">
        <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg border border-white/20">
              <BookOpen className="text-emerald-400 h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase bg-black/40 px-2 py-0.5 rounded">
                  ASSETFLOW ENTERPRISE / GENERAL ACCOUNTING
                </span>
                <span className="text-[10px] text-slate-300 font-mono">G/L LEDGER AA • CHILE GAAP / IFRS</span>
              </div>
              <h1 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2 mt-0.5">
                Módulo Integral de Contabilidad General ERP
              </h1>
            </div>
          </div>

          {/* TOOLBAR ACTIONS & MULTI-LEDGER UDC 09/LT SELECTOR */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-lg border border-white/15">
              <span className="text-[10px] font-mono uppercase text-emerald-300 font-bold">Libro ERP (09/LT):</span>
              <select
                value={selectedLedgerType}
                onChange={(e) => setSelectedLedgerType(e.target.value as JDELedgerType)}
                className="bg-[#082B44] text-white text-xs font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/40 outline-none cursor-pointer"
                title="Seleccionar Tipo de Libro ERP (UDC 09/LT: AA Financiero, TA Tributario SII, PA Compromisos OT, UF Indexado)"
              >
                {JDE_LEDGER_TYPES_UDC_09_LT.map(lt => (
                  <option key={lt.code} value={lt.code}>{lt.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setIsNewEntryModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 shadow-xs border border-emerald-400 transition-all cursor-pointer"
              title="P0911 - Registrar nuevo asiento de diario balanceado"
            >
              <Plus size={14} /> Nuevo Asiento (P0911)
            </button>
            <button
              onClick={handleExportExcel}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
              title="Exportar grilla activa a Excel"
            >
              <Download size={13} /> Exportar Excel
            </button>
            <button
              onClick={() => printHtmlElement('jde-accounting-report-area', `ERP_Contabilidad_${activeTab}`)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 shadow-xs border border-slate-500 transition-all cursor-pointer"
              title="Imprimir informe columnar oficial ERP"
            >
              <Printer size={13} /> Imprimir UBE
            </button>
          </div>
        </div>

        {/* ACCOUNTING TABS */}
        <div className="px-5 flex gap-1 overflow-x-auto text-xs font-bold border-t border-white/10 pt-1">
          <button
            onClick={() => setActiveTab('P0911_JOURNAL')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'P0911_JOURNAL'
                ? 'border-emerald-400 text-white bg-white/15'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={14} className="text-emerald-400" />
            <span>P0911: Asientos de Diario F0911</span>
          </button>

          <button
            onClick={() => setActiveTab('P09200_ACCOUNT_LEDGER')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'P09200_ACCOUNT_LEDGER'
                ? 'border-emerald-400 text-white bg-white/15'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calculator size={14} className="text-sky-300" />
            <span>P09200: Mayor de Cuentas Interactivo</span>
          </button>

          <button
            onClick={() => setActiveTab('P09216_TRIAL_BALANCE')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'P09216_TRIAL_BALANCE'
                ? 'border-emerald-400 text-white bg-white/15'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scale size={14} className="text-amber-300" />
            <span>P09216: Balance 8 Columnas ({selectedLedgerType})</span>
          </button>

          <button
            onClick={() => setActiveTab('P0901_CHART_ACCOUNTS')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'P0901_CHART_ACCOUNTS'
                ? 'border-emerald-400 text-white bg-white/15'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} className="text-purple-300" />
            <span>P0901: Plan de Cuentas (LOD 1-7)</span>
          </button>

          <button
            onClick={() => setActiveTab('P09801_BATCH_POST')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'P09801_BATCH_POST'
                ? 'border-emerald-400 text-white bg-white/15'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck size={14} className="text-rose-300" />
            <span>P09801: Gestión y Posteo de Lotes F0011</span>
          </button>

          <button
            onClick={() => setActiveTab('R097011_INTEGRITY')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'R097011_INTEGRITY'
                ? 'border-emerald-400 text-white bg-emerald-950/60'
                : 'border-transparent text-emerald-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCheck size={14} className="text-emerald-400" />
            <span>R097011 / R04701 / R03B701: Integridad Sublibros vs. Mayor</span>
            <span className="px-1.5 py-0.5 text-[9px] rounded bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-mono">
              NIIF/SII
            </span>
          </button>

          <button
            onClick={() => setActiveTab('P0012_AAI_PERIODS')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'P0012_AAI_PERIODS'
                ? 'border-emerald-400 text-white bg-indigo-950/60'
                : 'border-transparent text-indigo-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <SlidersHorizontal size={14} className="text-indigo-300" />
            <span>P0012 / P0010: Motor AAIs (F0012) & Períodos Fiscales</span>
          </button>
        </div>
      </div>

      {/* SUMMARY BANNER */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 shrink-0 text-xs shadow-2xs">
        <div className="border-l-3 border-[#0B3C5D] pl-2.5">
          <span className="text-[10px] font-black uppercase text-slate-500 block">Total Movimientos</span>
          <span className="text-base font-black text-slate-900 font-mono">{transactions.length}</span>
        </div>
        <div className="border-l-3 border-emerald-600 pl-2.5">
          <span className="text-[10px] font-black uppercase text-slate-500 block">Total Débitos (Debe)</span>
          <span className="text-sm font-black text-emerald-700 font-mono truncate block">
            {formatCLP(trialBalance8Columns.totals.totalDebitSum)}
          </span>
        </div>
        <div className="border-l-3 border-indigo-600 pl-2.5">
          <span className="text-[10px] font-black uppercase text-slate-500 block">Total Créditos (Haber)</span>
          <span className="text-sm font-black text-indigo-700 font-mono truncate block">
            {formatCLP(trialBalance8Columns.totals.totalCreditSum)}
          </span>
        </div>
        <div className="border-l-3 border-amber-600 pl-2.5">
          <span className="text-[10px] font-black uppercase text-slate-500 block">Resultado Ejercicio</span>
          <span className={`text-sm font-black font-mono truncate block ${trialBalance8Columns.totals.netResultLossGain >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatCLP(trialBalance8Columns.totals.netResultLossGain)}
          </span>
        </div>
        <div className="border-l-3 border-purple-600 pl-2.5">
          <span className="text-[10px] font-black uppercase text-slate-500 block">Lotes Activos F0011</span>
          <span className="text-base font-black text-purple-700 font-mono">{batchList.length}</span>
        </div>
        <div className="border-l-3 border-teal-600 pl-2.5">
          <span className="text-[10px] font-black uppercase text-slate-500 block">Cuadre Contable</span>
          <span className="text-xs font-black uppercase text-emerald-700 flex items-center gap-1 mt-0.5">
            <CheckCircle2 size={13} /> {trialBalance8Columns.totals.isBalanced ? 'BALANCE CUADRADO' : 'DESCUADRE'}
          </span>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-[#EBF3F9] border-b border-slate-300 px-5 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchGeneral}
              onChange={(e) => setSearchGeneral(e.target.value)}
              placeholder="Buscar por glosa, nro doc, lote..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#0B3C5D]"
            />
          </div>

          {activeTab === 'P09200_ACCOUNT_LEDGER' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-600">Cuenta Mayor:</span>
              <select
                value={selectedLedgerAccountCode}
                onChange={(e) => setSelectedLedgerAccountCode(e.target.value)}
                className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.code}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'P0911_JOURNAL' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-600">Tipo Doc:</span>
              <select
                value={filterDocType}
                onChange={(e) => setFilterDocType(e.target.value)}
                className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
              >
                <option value="ALL">Todos los Tipos</option>
                <option value="JE">JE - Asiento Diario General</option>
                <option value="PV">PV - Proveedor / Vouchers</option>
                <option value="CR">CR - Cobranza Recaudación</option>
                <option value="RT">RT - Reajuste Tributario</option>
              </select>
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-600">
          Entorno: <strong className="text-slate-800">ERP PRODUCTION</strong> • Operador: <strong>{currentUser}</strong>
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="flex-1 overflow-auto p-4" id="jde-accounting-report-area">
        
        {/* TAB 1: P0911 - JOURNAL ENTRIES WORKBENCH */}
        {activeTab === 'P0911_JOURNAL' && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
            <div className="overflow-x-auto jde-scrollbar">
              <table className="text-left text-xs border-collapse table-fixed" style={{ width: 'max-content', minWidth: '100%' }}>
                <thead className="bg-[#0B3C5D] text-white font-bold text-[10.5px] uppercase sticky top-0 z-10 select-none">
                  <tr>
                    <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsP0911.idx}px` }}>
                      <span>#</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsP0911, colWidthsP0911, 'idx', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP0911.date}px` }}>
                      <span className="truncate block">Fecha</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsP0911, colWidthsP0911, 'date', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP0911.docNumber}px` }}>
                      <span className="truncate block">Doc Nbr</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsP0911, colWidthsP0911, 'docNumber', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsP0911.docType}px` }}>
                      <span className="truncate block">Tipo</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsP0911, colWidthsP0911, 'docType', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP0911.accountCode}px` }}>
                      <span className="truncate block">Cuenta F0901</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsP0911, colWidthsP0911, 'accountCode', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP0911.description}px` }}>
                      <span className="truncate block">Glosa del Asiento de Diario</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsP0911, colWidthsP0911, 'description', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsP0911.debit}px` }}>
                      <span className="truncate block">Debe (Débito)</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsP0911, colWidthsP0911, 'debit', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsP0911.credit}px` }}>
                      <span className="truncate block">Haber (Crédito)</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsP0911, colWidthsP0911, 'credit', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP0911.batchNumber}px` }}>
                      <span className="truncate block">Lote F0011</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsP0911, colWidthsP0911, 'batchNumber', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsP0911.status}px` }}>
                      <span className="truncate block">Estado</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsP0911, colWidthsP0911, 'status', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-2 text-center" style={{ width: `${colWidthsP0911.actions}px` }}>
                      <span className="truncate block">Acciones</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsP0911, colWidthsP0911, 'actions', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx, idx) => {
                      const isExpense = tx.type === 'EXPENSE';
                      const debit = isExpense ? tx.amount : 0;
                      const credit = !isExpense ? tx.amount : 0;
                      const isPosted = tx.status === 'COMPLETADA';

                      return (
                        <tr 
                          key={tx.id}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setGridContextMenu({ x: e.clientX, y: e.clientY, tx });
                          }}
                          className="hover:bg-amber-50/50 transition-colors even:bg-slate-50/40 cursor-context-menu"
                        >
                          <td className="py-2.5 px-2 text-center font-mono text-slate-500 text-[10px] truncate">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 truncate">
                            {tx.date}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-indigo-700 truncate">
                            {tx.documentNumber || `JE-${tx.id.slice(0, 6)}`}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 truncate">
                            {tx.documentType || 'JE'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 truncate">
                            {tx.accountCode || '5.1.01.01'}
                          </td>
                          <td className="py-2.5 px-3 uppercase text-slate-800 font-medium truncate" title={tx.description}>
                            {tx.description}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 truncate">
                            {debit > 0 ? formatCLP(debit) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 truncate">
                            {credit > 0 ? formatCLP(credit) : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px] truncate">
                            {tx.batchNumber || 'B-2026-001'}
                          </td>
                          <td className="py-2.5 px-2 text-center truncate">
                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${
                              isPosted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isPosted ? 'P (POSTEADO)' : 'A (APROBADO)'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center truncate">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGridContextMenu({ x: e.clientX, y: e.clientY, tx });
                                }}
                                className="p-1 text-slate-500 hover:text-[#0B3C5D] hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
                                title="Menú Contextual ERP (Clic Derecho)"
                              >
                                <MoreVertical size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Confirma revertir / anular este asiento contable?`)) {
                                    onDeleteTransaction(tx.id);
                                  }
                                }}
                                className="text-rose-600 hover:text-rose-800 font-bold text-[10px] uppercase hover:underline cursor-pointer"
                                title="Revertir asiento"
                              >
                                Anular
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-bold uppercase text-xs">
                        No se encontraron transacciones contables registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: P09200 - ACCOUNT LEDGER INQUIRY */}
        {activeTab === 'P09200_ACCOUNT_LEDGER' && (
          <div className="space-y-4">
            
            {/* ACCOUNT HEADER CARD */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-300 p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-500 block">Cuenta Seleccionada</span>
                <span className="font-mono font-black text-sm text-indigo-800">{selectedLedgerAccountCode}</span>
                <p className="font-bold text-slate-800 uppercase mt-0.5">
                  {accounts.find(a => a.code === selectedLedgerAccountCode)?.name || 'CUENTA MAYOR'}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-500 block">Tipo / Naturaleza</span>
                <span className="font-bold text-slate-800 uppercase">
                  {accounts.find(a => a.code === selectedLedgerAccountCode)?.type || 'ACTIVO'}
                </span>
                <p className="text-[10px] text-slate-500">Libro Contable: AA (Actual Amounts)</p>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-500 block">Movimientos del Período</span>
                <span className="font-mono font-bold text-slate-800">{ledgerEntries.length} Registros</span>
              </div>

              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <span className="text-[10px] font-black uppercase text-emerald-800 block">Saldo Final Acumulado</span>
                <span className="font-mono font-black text-base text-emerald-950 block">
                  {formatCLP(ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].runningBalance : 0)}
                </span>
              </div>
            </div>

            {/* LEDGER GRID */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
              <div className="overflow-x-auto jde-scrollbar">
                <table className="text-left text-xs border-collapse table-fixed" style={{ width: 'max-content', minWidth: '100%' }}>
                  <thead className="bg-[#0B3C5D] text-white font-bold text-[10.5px] uppercase sticky top-0 z-10 select-none">
                    <tr>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsP09200.idx}px` }}>
                        <span>#</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09200, colWidthsP09200, 'idx', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP09200.date}px` }}>
                        <span className="truncate block">Fecha</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09200, colWidthsP09200, 'date', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP09200.docNumber}px` }}>
                        <span className="truncate block">Doc Nbr</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09200, colWidthsP09200, 'docNumber', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP09200.description}px` }}>
                        <span className="truncate block">Glosa Explicativa</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09200, colWidthsP09200, 'description', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsP09200.debit}px` }}>
                        <span className="truncate block">Débitos (+)</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09200, colWidthsP09200, 'debit', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsP09200.credit}px` }}>
                        <span className="truncate block">Créditos (-)</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09200, colWidthsP09200, 'credit', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsP09200.balance}px` }}>
                        <span className="truncate block">Saldo Acumulado</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09200, colWidthsP09200, 'balance', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center" style={{ width: `${colWidthsP09200.actions}px` }}>
                        <span className="truncate block">Acción</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09200, colWidthsP09200, 'actions', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ledgerEntries.length > 0 ? (
                      ledgerEntries.map((entry, idx) => (
                        <tr 
                          key={entry.id} 
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setGridContextMenu({ x: e.clientX, y: e.clientY, tx: entry });
                          }}
                          className="hover:bg-slate-50 cursor-context-menu"
                        >
                          <td className="py-2.5 px-2 text-center font-mono text-slate-500 truncate">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 truncate">{entry.date}</td>
                          <td className="py-2.5 px-3 font-mono font-black text-indigo-700 truncate">{entry.documentNumber}</td>
                          <td className="py-2.5 px-3 uppercase text-slate-800 truncate" title={entry.description}>{entry.description}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 truncate">
                            {entry.debit > 0 ? formatCLP(entry.debit) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 truncate">
                            {entry.credit > 0 ? formatCLP(entry.credit) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-50/30 truncate">
                            {formatCLP(entry.runningBalance)}
                          </td>
                          <td className="py-2.5 px-2 text-center truncate">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setGridContextMenu({ x: e.clientX, y: e.clientY, tx: entry });
                              }}
                              className="p-1 text-slate-500 hover:text-[#0B3C5D] hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
                              title="Menú Contextual ERP (Clic Derecho)"
                            >
                              <MoreVertical size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-bold uppercase text-xs">
                          No hay movimientos registrados para esta cuenta en el período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: P09216 - 8-COLUMN TRIAL BALANCE */}
        {activeTab === 'P09216_TRIAL_BALANCE' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
              <div className="bg-[#0B3C5D] text-white p-3 font-bold text-xs uppercase flex items-center justify-between">
                <span>P09216: Balance Tributario y Financiero de 8 Columnas (Chile SII / NIIF)</span>
                <span className="text-amber-300 font-mono text-[11px]">Normativa Circular 1501 CMF</span>
              </div>
              <div className="overflow-x-auto jde-scrollbar">
                <table className="text-left text-xs border-collapse table-fixed select-none" style={{ width: 'max-content', minWidth: '100%' }}>
                  <thead className="bg-slate-100 text-slate-800 font-bold text-[10px] uppercase border-b-2 border-slate-300">
                    <tr>
                      <th rowSpan={2} className="relative p-2 border-r border-slate-300" style={{ width: `${colWidthsP09216.code}px` }}>
                        <span className="truncate block">Código</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09216, colWidthsP09216, 'code', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th rowSpan={2} className="relative p-2 border-r border-slate-300" style={{ width: `${colWidthsP09216.name}px` }}>
                        <span className="truncate block">Cuenta Contable</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09216, colWidthsP09216, 'name', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th colSpan={2} className="p-2 text-center border-r border-slate-300 bg-blue-50/70">Sumas</th>
                      <th colSpan={2} className="p-2 text-center border-r border-slate-300 bg-indigo-50/70">Saldos</th>
                      <th colSpan={2} className="p-2 text-center border-r border-slate-300 bg-emerald-50/70">Inventario</th>
                      <th colSpan={2} className="p-2 text-center bg-amber-50/70">Resultados</th>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <th className="relative p-1.5 text-right border-r border-slate-300" style={{ width: `${colWidthsP09216.debitSum}px` }}>
                        <span className="truncate block">Débito</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09216, colWidthsP09216, 'debitSum', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-1.5 text-right border-r border-slate-300" style={{ width: `${colWidthsP09216.creditSum}px` }}>
                        <span className="truncate block">Crédito</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09216, colWidthsP09216, 'creditSum', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-1.5 text-right border-r border-slate-300" style={{ width: `${colWidthsP09216.debitBal}px` }}>
                        <span className="truncate block">Deudor</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09216, colWidthsP09216, 'debitBal', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-1.5 text-right border-r border-slate-300" style={{ width: `${colWidthsP09216.creditBal}px` }}>
                        <span className="truncate block">Acreedor</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09216, colWidthsP09216, 'creditBal', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-1.5 text-right border-r border-slate-300" style={{ width: `${colWidthsP09216.asset}px` }}>
                        <span className="truncate block">Activo</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09216, colWidthsP09216, 'asset', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-1.5 text-right border-r border-slate-300" style={{ width: `${colWidthsP09216.liability}px` }}>
                        <span className="truncate block">Pasivo</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09216, colWidthsP09216, 'liability', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-1.5 text-right border-r border-slate-300" style={{ width: `${colWidthsP09216.loss}px` }}>
                        <span className="truncate block">Pérdida</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09216, colWidthsP09216, 'loss', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-1.5 text-right" style={{ width: `${colWidthsP09216.gain}px` }}>
                        <span className="truncate block">Ganancia</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09216, colWidthsP09216, 'gain', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {trialBalance8Columns.rows.map((row) => (
                      <tr 
                        key={row.account.id} 
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedLedgerAccountCode(row.account.code);
                          setActiveTab('P09200_ACCOUNT_LEDGER');
                        }}
                        onDoubleClick={() => {
                          setSelectedLedgerAccountCode(row.account.code);
                          setActiveTab('P09200_ACCOUNT_LEDGER');
                        }}
                        className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                        title="Doble clic o clic derecho para abrir Mayor Interactivo F0911 (P09200)"
                      >
                        <td className="p-2 font-mono font-bold text-slate-700 border-r border-slate-200 truncate">{row.account.code}</td>
                        <td className="p-2 font-bold text-slate-800 uppercase border-r border-slate-200 truncate">{row.account.name}</td>
                        
                        {/* Sumas */}
                        <td className="p-2 text-right font-mono border-r border-slate-200 truncate">{row.debitSum > 0 ? formatCLP(row.debitSum) : '-'}</td>
                        <td className="p-2 text-right font-mono border-r border-slate-200 truncate">{row.creditSum > 0 ? formatCLP(row.creditSum) : '-'}</td>

                        {/* Saldos */}
                        <td className="p-2 text-right font-mono font-bold text-indigo-900 border-r border-slate-200 truncate">{row.debitBalance > 0 ? formatCLP(row.debitBalance) : '-'}</td>
                        <td className="p-2 text-right font-mono font-bold text-indigo-900 border-r border-slate-200 truncate">{row.creditBalance > 0 ? formatCLP(row.creditBalance) : '-'}</td>

                        {/* Inventario */}
                        <td className="p-2 text-right font-mono font-bold text-emerald-800 border-r border-slate-200 bg-emerald-50/20 truncate">{row.assetInventory > 0 ? formatCLP(row.assetInventory) : '-'}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-800 border-r border-slate-200 bg-emerald-50/20 truncate">{row.liabilityInventory > 0 ? formatCLP(row.liabilityInventory) : '-'}</td>

                        {/* Resultados */}
                        <td className="p-2 text-right font-mono font-bold text-rose-800 border-r border-slate-200 bg-amber-50/20 truncate">{row.lossResult > 0 ? formatCLP(row.lossResult) : '-'}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-800 bg-amber-50/20 truncate">{row.gainResult > 0 ? formatCLP(row.gainResult) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-mono font-black text-xs border-t-2 border-slate-400">
                    <tr className="bg-slate-200">
                      <td colSpan={2} className="p-2.5 uppercase font-black text-slate-900">TOTALES DEL BALANCE</td>
                      <td className="p-2.5 text-right border-r border-slate-300">{formatCLP(trialBalance8Columns.totals.totalDebitSum)}</td>
                      <td className="p-2.5 text-right border-r border-slate-300">{formatCLP(trialBalance8Columns.totals.totalCreditSum)}</td>
                      <td className="p-2.5 text-right border-r border-slate-300">{formatCLP(trialBalance8Columns.totals.totalDebitBalance)}</td>
                      <td className="p-2.5 text-right border-r border-slate-300">{formatCLP(trialBalance8Columns.totals.totalCreditBalance)}</td>
                      <td className="p-2.5 text-right border-r border-slate-300 bg-emerald-100/50">{formatCLP(trialBalance8Columns.totals.totalAssetInventory)}</td>
                      <td className="p-2.5 text-right border-r border-slate-300 bg-emerald-100/50">{formatCLP(trialBalance8Columns.totals.totalLiabilityInventory)}</td>
                      <td className="p-2.5 text-right border-r border-slate-300 bg-amber-100/50">{formatCLP(trialBalance8Columns.totals.totalLossResult)}</td>
                      <td className="p-2.5 text-right bg-amber-100/50">{formatCLP(trialBalance8Columns.totals.totalGainResult)}</td>
                    </tr>
                    <tr className="bg-emerald-50 font-black text-emerald-950">
                      <td colSpan={6} className="p-2.5 uppercase font-black">
                        RESULTADO NETO DEL EJERCICIO (UTILIDAD / PÉRDIDA)
                      </td>
                      <td colSpan={2} className="p-2.5 text-right border-r border-slate-300">
                        {formatCLP(trialBalance8Columns.totals.netResultInventory)}
                      </td>
                      <td colSpan={2} className="p-2.5 text-right">
                        {formatCLP(trialBalance8Columns.totals.netResultLossGain)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: P0901 - CHART OF ACCOUNTS (LOD 1-7) */}
        {activeTab === 'P0901_CHART_ACCOUNTS' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-xs border border-slate-300 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm uppercase text-[#0B3C5D]">
                  P0901: Maestro del Plan de Cuentas (Chart of Accounts)
                </h3>
                <p className="text-xs text-slate-600">
                  Estructura jerárquica con niveles de detalle (LOD 1 a LOD 7) para consolidación contable.
                </p>
              </div>
              <button
                onClick={() => setIsNewAccountModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus size={14} /> Nueva Cuenta
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
              <div className="overflow-x-auto jde-scrollbar">
                <table className="text-left text-xs border-collapse table-fixed select-none" style={{ width: 'max-content', minWidth: '100%' }}>
                  <thead className="bg-[#0B3C5D] text-white font-bold text-[10.5px] uppercase">
                    <tr>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP0901.code}px` }}>
                        <span className="truncate block">Código</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP0901, colWidthsP0901, 'code', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsP0901.lod}px` }}>
                        <span className="truncate block">LOD</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP0901, colWidthsP0901, 'lod', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP0901.name}px` }}>
                        <span className="truncate block">Descripción de la Cuenta</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP0901, colWidthsP0901, 'name', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP0901.type}px` }}>
                        <span className="truncate block">Clasificación</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP0901, colWidthsP0901, 'type', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsP0901.nature}px` }}>
                        <span className="truncate block">Naturaleza</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP0901, colWidthsP0901, 'nature', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center" style={{ width: `${colWidthsP0901.status}px` }}>
                        <span className="truncate block">Estado</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP0901, colWidthsP0901, 'status', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {accounts.map((acc) => {
                      const indentPx = (acc.level - 1) * 20;
                      return (
                        <tr 
                          key={acc.id} 
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedLedgerAccountCode(acc.code);
                            setActiveTab('P09200_ACCOUNT_LEDGER');
                          }}
                          onDoubleClick={() => {
                            setSelectedLedgerAccountCode(acc.code);
                            setActiveTab('P09200_ACCOUNT_LEDGER');
                          }}
                          className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                          title="Doble clic o clic derecho para ver Mayor Interactivo P09200"
                        >
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 truncate">{acc.code}</td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 truncate">
                            {acc.level}
                          </td>
                          <td className="py-2 px-3 uppercase font-medium truncate" style={{ paddingLeft: `${indentPx + 12}px` }}>
                            <span className={acc.level <= 2 ? 'font-black text-slate-900' : 'text-slate-800'}>
                              {acc.name}
                            </span>
                          </td>
                          <td className="py-2 px-3 uppercase text-slate-700 text-[11px] font-bold truncate">
                            {acc.type}
                          </td>
                          <td className="py-2 px-2 text-center truncate">
                            <span className="font-mono font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              {acc.type === 'ACTIVO' || acc.type === 'EGRESOS' ? 'D (DÉBITO)' : 'C (CRÉDITO)'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center truncate">
                            <span className="text-[9.5px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                              ACTIVA
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: P09801 - BATCH POST ENGINE (F0011) */}
        {activeTab === 'P09801_BATCH_POST' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-xs border border-slate-300 p-4">
              <h3 className="font-black text-sm uppercase text-[#0B3C5D]">
                P09801: Control y Posteo de Lotes Contables (Batch Review & Post Engine)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                En AssetFlow Enterprise, todos los asientos se agrupan en lotes (F0011). Un lote aprobado ('A') debe ser posteado a Mayor ('P') para impactar formalmente el saldo contable.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
              <div className="overflow-x-auto jde-scrollbar">
                <table className="text-left text-xs border-collapse table-fixed select-none" style={{ width: 'max-content', minWidth: '100%' }}>
                  <thead className="bg-[#0B3C5D] text-white font-bold text-[10.5px] uppercase">
                    <tr>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP09801.batchNumber}px` }}>
                        <span className="truncate block">N° Lote (F0011)</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09801, colWidthsP09801, 'batchNumber', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsP09801.date}px` }}>
                        <span className="truncate block">Fecha</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09801, colWidthsP09801, 'date', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsP09801.count}px` }}>
                        <span className="truncate block">Asientos</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09801, colWidthsP09801, 'count', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsP09801.total}px` }}>
                        <span className="truncate block">Monto Total</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09801, colWidthsP09801, 'total', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsP09801.user}px` }}>
                        <span className="truncate block">Operador</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09801, colWidthsP09801, 'user', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsP09801.status}px` }}>
                        <span className="truncate block">Estado Lote</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09801, colWidthsP09801, 'status', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center" style={{ width: `${colWidthsP09801.actions}px` }}>
                        <span className="truncate block">Acción ERP</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsP09801, colWidthsP09801, 'actions', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {batchList.map((batch) => (
                      <tr key={batch.batchNumber} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-black text-indigo-700 truncate">{batch.batchNumber}</td>
                        <td className="py-3 px-2 text-center font-mono text-slate-700 truncate">{batch.createdDate}</td>
                        <td className="py-3 px-2 text-center font-mono font-bold truncate">{batch.docCount}</td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900 truncate">{formatCLP(batch.totalAmount)}</td>
                        <td className="py-3 px-3 uppercase text-slate-700 text-[11px] truncate">{batch.createdBy}</td>
                        <td className="py-3 px-2 text-center truncate">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            batch.status === 'POSTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {batch.status === 'POSTED' ? 'P (POSTEADO)' : 'A (APROBADO)'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center truncate">
                          {batch.status !== 'POSTED' ? (
                            <button
                              onClick={() => handlePostBatch(batch.batchNumber)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-[10.5px] font-black uppercase shadow-xs transition-all cursor-pointer"
                            >
                              Post Batch (R09801)
                            </button>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[10.5px] flex items-center justify-center gap-1">
                              <CheckCheck size={14} /> Posteado Conforme
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

        {/* TAB 6: R097011 / R04701 / R03B701 / R43500 / R12701 — SUITE UBE INTEGRIDAD SUBLIBROS VS. LIBRO MAYOR */}
        {activeTab === 'R097011_INTEGRITY' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#0B3C5D] text-emerald-300 font-mono text-[10px] font-black rounded uppercase">
                      CORPORATIVO ERP SUBLEDGER TO G/L INTEGRITY UBE SUITE
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 font-bold">
                      F03B11 / F0411 / F4801 / F1202 / F0018 ➔ F0911 / F0902
                    </span>
                  </div>
                  <h2 className="text-sm font-black uppercase text-slate-900 mt-1">
                    Auditoría Automática de Integridad Inter-Módulos (Auxiliares vs. Libro Mayor General)
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Verifica en tiempo real que los saldos de Proveedores (AP), Contratos de Arriendo (AR/Real Estate), Recepciones de OT (RNV), Propiedades (Activos Fijos) e Impuestos DTE (F0018) cuadren al peso con el Libro Mayor.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedUbeReportCode}
                    onChange={(e) => setSelectedUbeReportCode(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none"
                  >
                    <option value="ALL">Ver Todos los Reportes UBE (6)</option>
                    {integrityReports.map(r => (
                      <option key={r.ubeCode} value={r.ubeCode}>{r.ubeCode} — {r.ubeTitle}</option>
                    ))}
                  </select>

                  {integrityReports.some(r => r.status !== 'CUADRADO_OK') && (
                    <button
                      onClick={handleReconcileAllIntegrityReports}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                    >
                      <RefreshCw size={13} /> Sincronizar y Cuadrar Todos los Sublibros vía AAI (F0012)
                    </button>
                  )}
                </div>
              </div>

              {/* KPI SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {integrityReports
                  .filter(r => selectedUbeReportCode === 'ALL' || r.ubeCode === selectedUbeReportCode)
                  .map((report) => {
                    const isOk = report.status === 'CUADRADO_OK';
                    return (
                      <div
                        key={report.ubeCode}
                        className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all ${
                          isOk
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-amber-50/50 border-amber-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded bg-[#0B3C5D] text-white font-mono text-[10px] font-black">
                              UBE {report.ubeCode}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 ${
                                isOk
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {isOk ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                              {isOk ? 'CUADRADO ($0 VAR)' : `DIF: ${formatCLP(report.variance)}`}
                            </span>
                          </div>

                          <h3 className="text-xs font-black uppercase text-slate-900 mt-2">
                            {report.ubeTitle}
                          </h3>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {report.normativeManualRef}
                          </p>

                          <div className="mt-2.5 bg-white/90 rounded-lg p-2.5 border border-slate-200 space-y-1 text-[11px] font-mono">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Tabla Auxiliar ({report.sourceTable.split(' ')[0]}):</span>
                              <span className="font-bold text-slate-800">{formatCLP(report.subledgerTotal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Libro Mayor ({report.targetTable.split(' ')[0]}):</span>
                              <span className="font-bold text-indigo-700">{formatCLP(report.glPostedTotal)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-1">
                              <span className="text-slate-600 font-bold">Variación Integridad:</span>
                              <span className={`font-black ${isOk ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {formatCLP(report.variance)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px] pt-0.5">
                              <span className="text-slate-400">Instrucción AAI F0012:</span>
                              <span className="font-bold text-[#0B3C5D]">{report.aaiUsed}</span>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-700 mt-2 leading-snug">
                            {report.auditNarrative}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                          <span className="text-[9px] font-mono text-slate-400 truncate" title={`SHA-256: ${report.verificationHash}`}>
                            SHA-256: {report.verificationHash.slice(0, 16)}...
                          </span>
                          {!isOk && (
                            <button
                              onClick={() => handleAutoReconcileUbeReport(report)}
                              className="bg-[#0B3C5D] hover:bg-slate-800 text-white px-2.5 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <CheckCheck size={11} /> Generar Lote AAI ({report.ubeCode})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* DETAILED DISCREPANCY DRILL-DOWN TABLE (WITH OT CATEGORY, SPECIALTY, ASSOCIATED INVOICE) */}
            <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
              <div className="bg-[#0B3C5D] text-white px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={15} className="text-emerald-400" />
                  <span className="text-xs font-black uppercase">
                    Detalle de Partidas en Conciliación Inter-Módulos (Drill-Down Auxiliar ➔ Mayor F0911)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-300">
                  Preserva Categoría OT, Especialidad y Factura Asociada
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-800 text-white text-[10px] font-black uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Reporte UBE</th>
                      <th className="py-2.5 px-3">Ref. / Folio Auxiliar</th>
                      <th className="py-2.5 px-3">Descripción del Hecho Económico</th>
                      <th className="py-2.5 px-3">Categoría / Especialidad OT</th>
                      <th className="py-2.5 px-3">Factura Asociada DTE</th>
                      <th className="py-2.5 px-3 text-center">AAI (F0012)</th>
                      <th className="py-2.5 px-3 text-center">Cuenta Destino</th>
                      <th className="py-2.5 px-3 text-right">Saldo Sublibro</th>
                      <th className="py-2.5 px-3 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {integrityReports
                      .filter(r => selectedUbeReportCode === 'ALL' || r.ubeCode === selectedUbeReportCode)
                      .flatMap(r => r.discrepancies.map(d => ({ ...d, ubeCode: r.ubeCode })))
                      .map((item) => (
                        <tr key={`${item.ubeCode}-${item.id}`} className="hover:bg-amber-50/40">
                          <td className="py-2.5 px-3 font-mono font-black text-[#0B3C5D]">{item.ubeCode}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.reference}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{item.description}</td>
                          <td className="py-2.5 px-3">
                            {item.category || item.specialty ? (
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold text-[10px] border border-indigo-200">
                                {item.category || 'MANT'} • {item.specialty || 'GENERAL'}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px] font-mono">N/A (FINANZAS/AR)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-700">
                            {item.associatedInvoice || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono font-black text-[10px] text-slate-800">
                              {item.aaiCode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-800">
                            {item.targetAccountCode}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCLP(item.subledgerAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-amber-700">
                            {formatCLP(item.variance)}
                          </td>
                        </tr>
                      ))}
                    {integrityReports
                      .filter(r => selectedUbeReportCode === 'ALL' || r.ubeCode === selectedUbeReportCode)
                      .every(r => r.discrepancies.length === 0) && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-emerald-700 font-bold bg-emerald-50/30">
                          <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-600" />
                          Integridad Certificada al 100%: No existen diferencias ni partidas pendientes entre los Sublibros Auxiliares y el Libro Mayor General (F0911/F0902).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: P0012 / P0010 — MOTOR DE INSTRUCCIONES AAI (F0012) & CONTROL DE PERÍODOS FISCALES (F0010) */}
        {activeTab === 'P0012_AAI_PERIODS' && (
          <div className="space-y-4">
            {/* SECTION A: AUTOMATIC ACCOUNTING INSTRUCTIONS (P0012 / F0012) */}
            <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
              <div className="bg-[#0B3C5D] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-black rounded">
                      ERP P0012 • TABLA F0012 (AUTOMATIC ACCOUNTING INSTRUCTIONS)
                    </span>
                  </div>
                  <h2 className="text-sm font-black uppercase mt-1">
                    Matriz Maestra de Instrucciones de Contabilización Automática (AAIs)
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    Define las reglas puente que conectan automáticamente Cuentas por Pagar (04), Cuentas por Cobrar (03B), Real Estate (15), Órdenes de Trabajo (43/48), Activos Fijos (12) e Impuestos DTE (F0018) con el Plan de Cuentas del Libro Mayor (F0901).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-slate-300">Filtrar Sistema ERP:</span>
                  <select
                    value={aaiSystemFilter}
                    onChange={(e) => setAaiSystemFilter(e.target.value)}
                    className="bg-[#082B44] text-white text-xs font-mono font-bold px-2.5 py-1 rounded border border-white/20 outline-none"
                  >
                    <option value="ALL">Todos los Sistemas (03B, 04, 09, 12, 15, 43/48)</option>
                    <option value="04">04 — Accounts Payable (Proveedores)</option>
                    <option value="03B">03B — Accounts Receivable (Cobranzas)</option>
                    <option value="15">15 — Real Estate Management (Arriendos UF)</option>
                    <option value="43/48">43/48 — Órdenes de Trabajo & Recepción RNV</option>
                    <option value="12">12 — Activos Fijos & Propiedades NIC 40</option>
                    <option value="09">09 — Impuestos SII F0018 & Mayor General</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-800 text-white text-[10px] font-black uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Ítem AAI (SKIP)</th>
                      <th className="py-2.5 px-3">Sistema (SY)</th>
                      <th className="py-2.5 px-3 text-center">Cía (CO)</th>
                      <th className="py-2.5 px-3 text-center">Doc (DCT)</th>
                      <th className="py-2.5 px-3 text-center">Cód G/L (GLC)</th>
                      <th className="py-2.5 px-3">Unidad Negocio (MCU)</th>
                      <th className="py-2.5 px-3">Cuenta Objeto (OBJ)</th>
                      <th className="py-2.5 px-3">Subcuenta (SUB)</th>
                      <th className="py-2.5 px-3 text-center">Sublibro Exigido (SBLT)</th>
                      <th className="py-2.5 px-3">Descripción Funcional (Estándar Normativa Contable)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {aaiList
                      .filter(a => aaiSystemFilter === 'ALL' || a.systemCode === aaiSystemFilter)
                      .map((aai) => (
                        <tr key={aai.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-black text-[#0B3C5D]">{aai.itemNumber}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 mr-1">
                              {aai.systemCode}
                            </span>
                            {aai.systemName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">{aai.company}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700">{aai.docType}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-800">{aai.glClassCode}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{aai.businessUnit}</td>
                          <td className="py-2.5 px-3">
                            <select
                              value={aai.objectAccount}
                              onChange={(e) => {
                                const newCode = e.target.value;
                                const foundAcc = accounts.find(ac => ac.code === newCode);
                                setAaiList(prev =>
                                  prev.map(item =>
                                    item.id === aai.id
                                      ? {
                                          ...item,
                                          objectAccount: newCode,
                                          AccountName: foundAcc ? foundAcc.name : item.AccountName,
                                        }
                                      : item
                                  )
                                );
                              }}
                              className="p-1 bg-emerald-50 border border-emerald-300 rounded font-mono font-bold text-emerald-900 text-[11px] outline-none cursor-pointer"
                            >
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.code}>
                                  {acc.code} — {acc.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{aai.subsidiary}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono text-[10px] font-bold">
                              {aai.mandatorySubledger === 'A'
                                ? 'A (RUT F0101)'
                                : aai.mandatorySubledger === 'W'
                                ? 'W (OT F4801)'
                                : aai.mandatorySubledger === 'L'
                                ? 'L (Contrato F1501B)'
                                : 'N (Opcional)'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">{aai.description}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION B: FISCAL PERIOD CONTROLS & CUTOFF GATEKEEPER (P0010 / F0010) */}
            <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
              <div className="bg-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-black rounded">
                    ERP P0010 • TABLA F0010 (COMPANY CONSTANTS & FISCAL DATE PATTERNS)
                  </span>
                  <h3 className="text-sm font-black uppercase mt-1">
                    Control de Cierre de Períodos Contables y Bloqueo PBCO / F29 SII (Ejercicio 2026)
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-300">
                  Compañía 00045 • Protege períodos con F29 declarado contra asientos extemporáneos
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-3 text-center">Período</th>
                      <th className="py-2 px-3">Mes Fiscal</th>
                      <th className="py-2 px-3 text-center">Inicio — Término</th>
                      <th className="py-2 px-3 text-center">Estado Mayor (G/L)</th>
                      <th className="py-2 px-3 text-center">Estado Cuentas por Pagar (AP)</th>
                      <th className="py-2 px-3 text-center">Estado F29 SII</th>
                      <th className="py-2 px-3 text-center">Acción Control Interno (P0010)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {fiscalPeriods.map((fp) => (
                      <tr key={fp.periodNumber} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center font-mono font-black text-slate-700">
                          {String(fp.periodNumber).padStart(2, '0')}/2026
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">{fp.periodName}</td>
                        <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600">
                          {fp.startDate} al {fp.endDate}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              fp.glStatus === 'OPEN'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : fp.glStatus === 'CLOSED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {fp.glStatus === 'OPEN'
                              ? 'ABIERTO (OPEN)'
                              : fp.glStatus === 'CLOSED'
                              ? 'CERRADO (PBCO LOCK)'
                              : 'FUTURO (PACO)'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-[10px]">
                          {fp.apStatus}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {fp.f29Declared ? (
                            <span className="text-emerald-700 font-bold text-[10px] flex items-center justify-center gap-1">
                              <ShieldCheck size={12} /> F29 Declarado SII
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px]">En curso / Pendiente</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => {
                              setFiscalPeriods(prev =>
                                prev.map(p =>
                                  p.periodNumber === fp.periodNumber
                                    ? {
                                        ...p,
                                        glStatus: p.glStatus === 'OPEN' ? 'CLOSED' : 'OPEN',
                                        apStatus: p.glStatus === 'OPEN' ? 'CLOSED' : 'OPEN',
                                        arStatus: p.glStatus === 'OPEN' ? 'CLOSED' : 'OPEN',
                                      }
                                    : p
                                )
                              );
                            }}
                            className={`px-2.5 py-1 rounded text-[10px] font-black uppercase cursor-pointer transition-all ${
                              fp.glStatus === 'OPEN'
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : 'bg-slate-700 hover:bg-slate-900 text-white'
                            }`}
                          >
                            {fp.glStatus === 'OPEN' ? 'Cerrar Período (P0010)' : 'Reapertura Autorizada'}
                          </button>
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

      {/* NEW JOURNAL ENTRY MODAL (P0911) */}
      {isNewEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-300">
            <div className="bg-[#0B3C5D] text-white p-4 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-400" />
                P0911: Ingreso de Asiento de Diario Balanceado
              </h3>
              <button
                onClick={() => setIsNewEntryModalOpen(false)}
                className="text-white/80 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-4 text-xs">
              {/* HEADER INPUTS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Fecha Contable:</label>
                  <input
                    type="date"
                    value={newEntryHeader.date}
                    onChange={(e) => setNewEntryHeader(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Tipo Documento:</label>
                  <select
                    value={newEntryHeader.docType}
                    onChange={(e) => setNewEntryHeader(prev => ({ ...prev, docType: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-bold outline-none"
                  >
                    <option value="JE">JE - Asiento Diario General</option>
                    <option value="PV">PV - Proveedor / Vouchers</option>
                    <option value="CR">CR - Cobranza Recaudación</option>
                    <option value="RT">RT - Reajuste Tributario</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Inmueble / Unidad:</label>
                  <select
                    value={newEntryHeader.propertyId}
                    onChange={(e) => setNewEntryHeader(prev => ({ ...prev, propertyId: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-bold outline-none"
                  >
                    <option value="">Corporativo General</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.commune}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Lote F0011:</label>
                  <input
                    type="text"
                    value={newEntryHeader.batchNumber}
                    readOnly
                    className="w-full p-2 bg-slate-100 border border-slate-300 rounded text-xs font-mono font-black text-slate-700"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Glosa Principal del Asiento:</label>
                  <input
                    type="text"
                    value={newEntryHeader.explanation}
                    onChange={(e) => setNewEntryHeader(prev => ({ ...prev, explanation: e.target.value }))}
                    placeholder="Ej: Reconocimiento de gasto por servicios de mantención..."
                    className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-medium uppercase outline-none focus:ring-2 focus:ring-[#0B3C5D]"
                  />
                </div>
              </div>

              {/* LINES TABLE */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-black uppercase text-slate-700 text-xs">Partidas Contables (F0911):</h4>
                  <button
                    onClick={() => {
                      setNewEntryLines(prev => [
                        ...prev,
                        { id: crypto.randomUUID(), accountCode: '1.1.01.03', description: '', debit: 0, credit: 0 }
                      ]);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Agregar Línea
                  </button>
                </div>

                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                  <thead className="bg-[#0B3C5D] text-white text-[10px] font-bold uppercase">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2 w-56">Cuenta Contable</th>
                      <th className="p-2">Glosa de Línea</th>
                      <th className="p-2 text-right w-36">Debe (CLP)</th>
                      <th className="p-2 text-right w-36">Haber (CLP)</th>
                      <th className="p-2 text-center w-12">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {newEntryLines.map((line, idx) => (
                      <tr key={line.id}>
                        <td className="p-2 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-1.5">
                          <select
                            value={line.accountCode}
                            onChange={(e) => {
                              const code = e.target.value;
                              setNewEntryLines(prev => prev.map(l => l.id === line.id ? { ...l, accountCode: code } : l));
                            }}
                            className="w-full p-1 border border-slate-300 rounded text-xs font-mono font-bold outline-none"
                          >
                            {accounts.map(a => (
                              <option key={a.id} value={a.code}>{a.code} - {a.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewEntryLines(prev => prev.map(l => l.id === line.id ? { ...l, description: val } : l));
                            }}
                            placeholder="Detalle..."
                            className="w-full p-1 border border-slate-300 rounded text-xs uppercase outline-none"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            value={line.debit || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setNewEntryLines(prev => prev.map(l => l.id === line.id ? { ...l, debit: val, credit: val > 0 ? 0 : l.credit } : l));
                            }}
                            className="w-full p-1 border border-slate-300 rounded text-xs font-mono text-right outline-none font-bold"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            value={line.credit || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setNewEntryLines(prev => prev.map(l => l.id === line.id ? { ...l, credit: val, debit: val > 0 ? 0 : l.debit } : l));
                            }}
                            className="w-full p-1 border border-slate-300 rounded text-xs font-mono text-right outline-none font-bold"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            onClick={() => {
                              if (newEntryLines.length > 2) {
                                setNewEntryLines(prev => prev.filter(l => l.id !== line.id));
                              }
                            }}
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-mono font-bold text-xs border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={3} className="p-2 text-right uppercase font-black">Totales Asiento:</td>
                      <td className="p-2 text-right font-black text-slate-900">
                        {formatCLP(newEntryLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0))}
                      </td>
                      <td className="p-2 text-right font-black text-slate-900">
                        {formatCLP(newEntryLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0))}
                      </td>
                      <td className="p-2 text-center">
                        {newEntryLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0) === newEntryLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0) ? (
                          <CheckCircle2 size={16} className="text-emerald-600 mx-auto" />
                        ) : (
                          <XCircle size={16} className="text-rose-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-slate-100 p-4 border-t flex justify-between items-center">
              <span className="text-[11px] font-mono text-slate-600">
                Principio Partida Doble: Los débitos deben ser iguales a los créditos.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsNewEntryModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNewEntry}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase shadow-md cursor-pointer"
                >
                  Guardar y Postear Asiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW ACCOUNT MODAL (P0901) */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-300">
            <h3 className="font-black text-sm uppercase text-[#0B3C5D] mb-3 flex items-center gap-2">
              <Plus size={16} /> Crear Cuenta Contable (P0901)
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Código de Cuenta:</label>
                <input
                  type="text"
                  value={newAccountData.code || ''}
                  onChange={(e) => setNewAccountData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Ej: 5.1.01.05"
                  className="w-full p-2 border border-slate-300 rounded font-mono font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Nombre de la Cuenta:</label>
                <input
                  type="text"
                  value={newAccountData.name || ''}
                  onChange={(e) => setNewAccountData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: GASTOS DE SEGURIDAD Y VIGILANCIA"
                  className="w-full p-2 border border-slate-300 rounded uppercase font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Clasificación:</label>
                <select
                  value={newAccountData.type || 'ACTIVO'}
                  onChange={(e) => setNewAccountData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full p-2 border border-slate-300 rounded font-bold outline-none"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="PASIVO">PASIVO</option>
                  <option value="PATRIMONIO">PATRIMONIO</option>
                  <option value="INGRESOS">INGRESOS</option>
                  <option value="EGRESOS">EGRESOS</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setIsNewAccountModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!newAccountData.code || !newAccountData.name) {
                    alert('Complete código y nombre.');
                    return;
                  }
                  const acc: AccountingAccount = {
                    id: crypto.randomUUID(),
                    code: newAccountData.code,
                    name: newAccountData.name.toUpperCase(),
                    type: newAccountData.type || 'ACTIVO',
                    subType: 'CORRIENTE',
                    level: 4,
                  };
                  setAccounts(prev => [...prev, acc]);
                  setIsNewAccountModalOpen(false);
                  alert(`✅ Cuenta ${acc.code} agregada al Plan de Cuentas.`);
                }}
                className="px-4 py-1.5 bg-emerald-600 text-white font-black text-xs uppercase rounded cursor-pointer"
              >
                Guardar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ERP GRID CONTEXT MENU (P0911 / P09200 / F0011 / P09216 / P0901) */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode={
            activeTab === 'P0911_JOURNAL' ? 'P0911' :
            activeTab === 'P09200_ACCOUNT_LEDGER' ? 'P09200' :
            activeTab === 'P09216_TRIAL_BALANCE' ? 'P09216' :
            activeTab === 'P09801_BATCH_POST' ? 'P09801' : 'P0901'
          }
          programTitle={
            activeTab === 'P0911_JOURNAL' ? 'General Journal Review & Edit (F0911)' :
            activeTab === 'P09200_ACCOUNT_LEDGER' ? 'Account Ledger Inquiry (F0911)' :
            activeTab === 'P09216_TRIAL_BALANCE' ? 'Trial Balance / 8 Columns (P09216)' :
            activeTab === 'P09801_BATCH_POST' ? 'Batch Review & Post Engine (F0011)' : 'Chart of Accounts (P0901)'
          }
          collectionName="transactions"
          recordKey={gridContextMenu.tx.documentNumber || `ASIENTO #${gridContextMenu.tx.id.slice(0, 8)}`}
          recordData={gridContextMenu.tx}
          currentStatus={gridContextMenu.tx.status}
          statusOptions={[
            { label: 'COMPLETADA (POSTEADO)', value: 'COMPLETADA' },
            { label: 'PENDIENTE (APROBADO)', value: 'PENDIENTE' },
            { label: 'ANULADA', value: 'ANULADA' },
          ]}
          onUpdateStatus={async (newStatus) => {
            onUpdateTransaction({
              ...gridContextMenu.tx,
              status: newStatus as any,
            });
            setGridContextMenu(null);
          }}
          onClose={() => setGridContextMenu(null)}
          onViewDetails={() => {
            alert(`Detalle Asiento Contable ERP:\nDocumento: ${gridContextMenu.tx.documentNumber}\nGlosa: ${gridContextMenu.tx.description}\nMonto: ${formatCLP(gridContextMenu.tx.amount)}\nCuenta F0901: ${gridContextMenu.tx.accountCode}\nLote F0011: ${gridContextMenu.tx.batchNumber || 'N/A'}`);
            setGridContextMenu(null);
          }}
          onDelete={() => {
            if (confirm(`¿Confirma revertir / anular este asiento contable ${gridContextMenu.tx.documentNumber}?`)) {
              onDeleteTransaction(gridContextMenu.tx.id);
            }
            setGridContextMenu(null);
          }}
          onExportExcel={handleExportExcel}
          onPrint={handlePrintReport}
          rowExits={[
            {
              id: 'exit_account_ledger',
              label: 'Ver Mayor Interactivo F0911 (P09200)',
              icon: <BookOpen size={12} className="text-emerald-700" />,
              shortcut: 'F8',
              onClick: () => {
                if (gridContextMenu.tx.accountCode) {
                  setSelectedLedgerAccountCode(gridContextMenu.tx.accountCode);
                  setActiveTab('P09200_ACCOUNT_LEDGER');
                }
                setGridContextMenu(null);
              }
            },
            {
              id: 'exit_batch_review',
              label: 'Ir a Control de Lotes F0011 (P09801)',
              icon: <Layers size={12} className="text-indigo-700" />,
              shortcut: 'F7',
              onClick: () => {
                setActiveTab('P09801_BATCH_POST');
                setGridContextMenu(null);
              }
            },
            {
              id: 'exit_reverse_je',
              label: 'Revertir / Anular Asiento Contable (P0911Z1)',
              icon: <XCircle size={12} className="text-rose-600" />,
              danger: true,
              onClick: () => {
                if (confirm(`¿Confirma revertir / anular este asiento contable ${gridContextMenu.tx.documentNumber}?`)) {
                  onDeleteTransaction(gridContextMenu.tx.id);
                }
                setGridContextMenu(null);
              }
            }
          ]}
        />
      )}

    </div>
  );
};
