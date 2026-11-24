import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, LeaseContract, PettyCashExpense, Property, Supplier, WorkOrder } from '../types';
import { 
  BookOpen, Calendar, HelpCircle, FileSpreadsheet, Search, CheckCircle2, 
  AlertTriangle, ArrowUpRight, ArrowDownLeft, Landmark, Users, Sliders, ChevronRight,
  ArrowUp, ArrowDown, Layers, Maximize2, Minimize2, Printer, Copy, Tag, Database, Download,
  MoreVertical, Settings, CheckSquare, Move, ChevronDown, ChevronUp, Plus
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { JDEContextualMenu } from './JDEContextualMenu';
import { JDEGridContextMenu } from './JDEGridContextMenu';
import { SupplierForm } from './SupplierForm';
import { downloadJDETransactionVoucher } from '../lib/pdfGenerator';
import {
  DEFAULT_JDE_AAI_TABLE_F0012,
  runJDEIntegrityAuditSuite,
  JDEIntegrityReportResult,
} from '../lib/jdeIntegrityAndAaiService';

interface AuxiliaryLedgersModuleProps {
  transactions: Transaction[];
  leaseContracts: LeaseContract[];
  pettyCashExpenses: PettyCashExpense[];
  properties: Property[];
  suppliers: Supplier[];
  currentUser: string;
  companyLogo?: string | null;
  workOrders?: WorkOrder[];
  onUpdateTransaction?: (id: string, updated: Partial<Transaction>) => void;
  onAddTransaction?: (newTx: Transaction) => void;
  onAddSupplier?: (supplier: Supplier) => void;
}

export const AuxiliaryLedgersModule: React.FC<AuxiliaryLedgersModuleProps> = ({
  transactions,
  leaseContracts,
  pettyCashExpenses,
  properties,
  suppliers,
  currentUser,
  companyLogo,
  workOrders = [],
  onUpdateTransaction = (_id: string, _updated: Partial<Transaction>) => {},
  onAddTransaction = (_newTx: Transaction) => {},
  onAddSupplier
}) => {
  // Select Month & Year (Default to current execution month: June 2026)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // June
  
  // Active Tab
  const [activeTab, setActiveTab] = useState<'MAYOR' | 'BANCOS' | 'PROVEEDORES' | 'INTEGRIDAD_AAI'>('MAYOR');
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  
  // Search state per tab
  const [searchMayor, setSearchMayor] = useState<string>('');
  const [searchBancos, setSearchBancos] = useState<string>('');
  const [searchProvs, setSearchProvs] = useState<string>('');

  // Initial Bank Balance (editable for easy reconciliation with real bank statement)
  const [initialBankBalance, setInitialBankBalance] = useState<number>(18500200);

  // Selected supplier to view card
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');

  // ERP Contextual Menu state
  const [isJDEMenuOpen, setIsJDEMenuOpen] = useState(false);
  const [selectedTxForJDE, setSelectedTxForJDE] = useState<Transaction | null>(null);

  // ERP-specific simulation states for the filter panels (to match AssetFlow Enterprise screenshot)
  const [jdeSupplierNum, setJdeSupplierNum] = useState<string>('');
  const [jdeCompany, setJdeCompany] = useState<string>('00045');
  const [jdePaymentStatus, setJdePaymentStatus] = useState<'TODOS' | 'PAGADOS' | 'PENDIENTES' | 'RETENIDOS'>('TODOS');
  const [jdeCurrency, setJdeCurrency] = useState<string>('CLP');
  const [jdeExchangeRateDate, setJdeExchangeRateDate] = useState<string>('2026-06-30');
  const [jdeReferenceDate, setJdeReferenceDate] = useState<string>('2026-06-30');
  const [showReportsDropdown, setShowReportsDropdown] = useState<boolean>(false);
  const [isCompactView, setIsCompactView] = useState<boolean>(false);
  const [bubblePos, setBubblePos] = useState({ x: 24, y: 24 });
  const [isDraggingBubble, setIsDraggingBubble] = useState(false);
  const [dragStart, setDragStart] = useState({ startX: 0, startY: 0, initialBubbleX: 24, initialBubbleY: 24 });
  const [isBubbleExpanded, setIsBubbleExpanded] = useState(true);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingBubble) return;
      const deltaX = dragStart.startX - e.clientX;
      const deltaY = dragStart.startY - e.clientY;
      const nextX = Math.max(10, Math.min(window.innerWidth - 80, dragStart.initialBubbleX + deltaX));
      const nextY = Math.max(10, Math.min(window.innerHeight - 80, dragStart.initialBubbleY + deltaY));
      setBubblePos({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      if (isDraggingBubble) {
        setIsDraggingBubble(false);
      }
    };

    if (isDraggingBubble) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingBubble, dragStart]);

  // QBE (Query By Example) interactive filters for Libro Mayor grid
  const [qbeMayorFecha, setQbeMayorFecha] = useState<string>('');
  const [qbeMayorModulo, setQbeMayorModulo] = useState<string>('');
  const [qbeMayorGlosa, setQbeMayorGlosa] = useState<string>('');
  const [qbeMayorReferencia, setQbeMayorReferencia] = useState<string>('');
  const [qbeMayorCuenta, setQbeMayorCuenta] = useState<string>('');
  const [qbeMayorDebe, setQbeMayorDebe] = useState<string>('');
  const [qbeMayorHaber, setQbeMayorHaber] = useState<string>('');
  const [qbeMayorSaldo, setQbeMayorSaldo] = useState<string>('');

  // QBE (Query By Example) interactive filters for Auxiliar Bancos grid
  const [qbeBancosFecha, setQbeBancosFecha] = useState<string>('');
  const [qbeBancosVoucher, setQbeBancosVoucher] = useState<string>('');
  const [qbeBancosDescripcion, setQbeBancosDescripcion] = useState<string>('');
  const [qbeBancosDestinatario, setQbeBancosDestinatario] = useState<string>('');
  const [qbeBancosDepositos, setQbeBancosDepositos] = useState<string>('');
  const [qbeBancosGiros, setQbeBancosGiros] = useState<string>('');
  const [qbeBancosSaldo, setQbeBancosSaldo] = useState<string>('');

  // QBE (Query By Example) interactive filters for Resumen AP Proveedores grid
  const [qbeProvsNombre, setQbeProvsNombre] = useState<string>('');
  const [qbeProvsRut, setQbeProvsRut] = useState<string>('');
  const [qbeProvsFacturado, setQbeProvsFacturado] = useState<string>('');
  const [qbeProvsPagado, setQbeProvsPagado] = useState<string>('');
  const [qbeProvsSaldo, setQbeProvsSaldo] = useState<string>('');

  // ERP Form P0911 (Journal Entry / Voucher Entry) states
  const [isP0911Open, setIsP0911Open] = useState<boolean>(false);
  const [p0911Date, setP0911Date] = useState<string>('2026-06-15');
  const [p0911DocType, setP0911DocType] = useState<string>('JE');
  const [p0911DocNum, setP0911DocNum] = useState<string>('');
  const [p0911Glosa, setP0911Glosa] = useState<string>('');
  const [p0911AccountCode, setP0911AccountCode] = useState<string>('1.1.01.01 (Caja General)');
  const [p0911Type, setP0911Type] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [p0911Amount, setP0911Amount] = useState<number>(0);
  const [p0911SupplierId, setP0911SupplierId] = useState<string>('');
  const [p0911PropertyId, setP0911PropertyId] = useState<string>('');
  const [p0911InsuranceCompany, setP0911InsuranceCompany] = useState<'VIDA' | 'GENERALES'>('GENERALES');
  const [p0911ErrorMessage, setP0911ErrorMessage] = useState<string>('');

  // AssetFlow Enterprise Floating Grid Context Menu (Right Click / F4)
  const [selectedGridRow, setSelectedGridRow] = useState<any | null>(null);
  const [selectedGridType, setSelectedGridType] = useState<'MAYOR' | 'BANCOS' | 'PROVEEDORES' | 'PROV_ITEM'>('MAYOR');
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    row: any;
    type: 'MAYOR' | 'BANCOS' | 'PROVEEDORES' | 'PROV_ITEM';
    transaction?: Transaction;
  } | null>(null);

  // Clear all filters across all tabs
  const handleClearAllFilters = () => {
    setJdeSupplierNum('');
    setSearchMayor('');
    setSearchBancos('');
    setSearchProvs('');
    setJdePaymentStatus('TODOS');
    setJdeCurrency('CLP');

    // Clear all Libro Mayor QBE filters
    setQbeMayorFecha('');
    setQbeMayorModulo('');
    setQbeMayorGlosa('');
    setQbeMayorReferencia('');
    setQbeMayorCuenta('');
    setQbeMayorDebe('');
    setQbeMayorHaber('');
    setQbeMayorSaldo('');

    // Clear all Auxiliar Bancos QBE filters
    setQbeBancosFecha('');
    setQbeBancosVoucher('');
    setQbeBancosDescripcion('');
    setQbeBancosDestinatario('');
    setQbeBancosDepositos('');
    setQbeBancosGiros('');
    setQbeBancosSaldo('');

    // Clear all Supplier QBE filters
    setQbeProvsNombre('');
    setQbeProvsRut('');
    setQbeProvsFacturado('');
    setQbeProvsPagado('');
    setQbeProvsSaldo('');
  };

  // Helper to open ERP Context Menu on right-click or row selector click
  const handleRowContextMenu = (e: React.MouseEvent, row: any, type: 'MAYOR' | 'BANCOS' | 'PROVEEDORES' | 'PROV_ITEM' = activeTab) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setSelectedGridRow(row);
    setSelectedGridType(type);

    // Look for matching real transaction if any
    let matchedTx: Transaction | undefined = undefined;
    if (row && row.id) {
      const cleanId = String(row.id).replace('PETTY-', '').replace('ARR-', '');
      matchedTx = transactions.find(t => t.id === row.id || t.id === cleanId);
    }

    // Build resilient pseudo-transaction object if this row is synthetic, so details/inspect/pdf always work
    if (!matchedTx && row) {
      const isCredit = (row.credit > 0 || row.deposit > 0 || row.payments > 0);
      const rawAmt = row.debit || row.credit || row.deposit || row.withdrawal || row.purchases || row.charge || row.pendingBalance || row.balance || 0;
      matchedTx = {
        id: row.id || `ERP-${Date.now()}`,
        description: row.description || row.supplierName || 'Registro Contable Mayor y Balance',
        amount: Math.abs(Number(rawAmt) || 0),
        category: row.account || (type === 'BANCOS' ? 'BANCOS' : type === 'PROVEEDORES' ? 'CUENTAS POR PAGAR' : 'MAYOR'),
        type: isCredit ? 'INCOME' : 'EXPENSE',
        documentType: row.docType || (row.ref ? row.ref.split(' ')[0] : 'ERP'),
        documentNumber: row.docNum || (row.ref ? row.ref.split(' ')[1] : row.taxId || 'S/N'),
        date: row.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
        invoiceDate: row.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
        user: currentUser || 'samaheim@gmail.com',
        timestamp: Date.now(),
        supplierName: row.supplierName || row.detail || 'Empresa General',
        supplierTaxId: row.taxId,
        accountCode: row.account || '1.1.01.01',
        status: 'COMPLETADA',
        programId: 'P092102',
        workStationId: 'W092102A'
      } as unknown as Transaction;
    }

    const clickX = e?.clientX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const clickY = e?.clientY ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 300);

    setGridContextMenu({
      x: Math.max(10, Math.min(clickX, typeof window !== 'undefined' ? window.innerWidth - 240 : 800)),
      y: Math.max(10, Math.min(clickY, typeof window !== 'undefined' ? window.innerHeight - 380 : 500)),
      row,
      type,
      transaction: matchedTx
    });
  };

  // Isolate reports dropdown click outside
  useEffect(() => {
    if (!showReportsDropdown) return;
    const handleDropdownOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#reports-dropdown-container')) {
        setShowReportsDropdown(false);
      }
    };
    window.addEventListener('click', handleDropdownOutside);
    return () => {
      window.removeEventListener('click', handleDropdownOutside);
    };
  }, [showReportsDropdown]);

  // Month Names Helper
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Quick Action Buttons to switch periods
  const handleCurrentPeriod = () => {
    setSelectedYear(2026);
    setSelectedMonth(6);
  };
  const handlePreviousPeriod = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(v => v - 1);
    } else {
      setSelectedMonth(v => v - 1);
    }
  };
  const handleNextPeriod = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(v => v + 1);
    } else {
      setSelectedMonth(v => v + 1);
    }
  };

  // Helper to format currency
  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper matches selected year and month
  const isDateInSelectedPeriod = (dateStr?: string) => {
    if (!dateStr) return false;
    // expect format YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      return year === selectedYear && month === selectedMonth;
    }
    return false;
  };

  // 1. COMPILATION: LIBRO MAYOR (GENERAL LEDGER)
  const compiledGeneralLedger = useMemo(() => {
    const list: any[] = [];

    // A. DIRECT TRANSACTIONS
    transactions.forEach((tx) => {
      if (isDateInSelectedPeriod(tx.date)) {
        const isIncome = tx.type === 'INCOME';
        list.push({
          id: tx.id,
          date: tx.date,
          description: tx.description || 'Sin glosa',
          ref: tx.documentNumber ? `${tx.documentType || 'Doc'} Nº ${tx.documentNumber}` : `TX-${tx.id.slice(0, 6)}`,
          debit: !isIncome ? tx.amount : 0,  // egreso
          credit: isIncome ? tx.amount : 0,  // ingreso
          source: 'TRANSACCIÓN',
          account: tx.accountCode || tx.category || 'Otros',
          detail: tx.supplierName || tx.user || 'S/N'
        });
      }
    });

    // B. LEASE CONTRACTS ACCRUED (REVENUE)
    // For each contract, active during selected period, generate a revenue accrual record
    leaseContracts.forEach((contract) => {
      // Contract is active if starts before the end of the selected month
      // And starts/ends within bounds
      const periodStartStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const periodEndStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-30`; // simple representation
      
      const cStart = contract.startDate;
      const cEnd = contract.endDate;
      
      const isContractActive = contract.status === 'VIGENTE' || contract.status === 'ACTIVO' || (
        (!cStart || cStart <= periodEndStr) &&
        (!cEnd || cEnd >= periodStartStr)
      );

      if (isContractActive) {
        list.push({
          id: `LEASE-${contract.id}`,
          date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`, // usually 1st of month
          description: `Devengo Arriendo Mensual - ${contract.tenantName} (Unidad: ${contract.propertyLabel})`,
          ref: `CONT-ARR-${contract.id.slice(0, 6)}`,
          debit: 0,
          credit: contract.monthlyAmount,
          source: 'CONTRATO ARRIENDO',
          account: '1.2.01.01 (Ingresos Operativos de Arriendos)',
          detail: contract.tenantName
        });
      }
    });

    // C. PETTY CASH EXPENSES OUTFLOWS
    pettyCashExpenses.forEach((exp) => {
      if (isDateInSelectedPeriod(exp.date)) {
        list.push({
          id: `PETTY-${exp.id}`,
          date: exp.date,
          description: `Rendición Caja Chica: ${exp.description}`,
          ref: exp.documentNumber ? `${exp.documentType || 'REND'} Nº ${exp.documentNumber}` : `PETTY-${exp.id.slice(0, 6)}`,
          debit: exp.amount,
          credit: 0,
          source: 'CAJA CHICA',
          account: exp.accountCode || exp.category || '4.1.02.10 (Gastos Fondos Fijos)',
          detail: exp.supplierName || exp.userCreator || 'S/N'
        });
      }
    });

    // Sort chronologically
    list.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.id.localeCompare(b.id);
    });

    // Compute Running Balance (Credit - Debit, since standard income pool represents credit card)
    // Or we provide a clear: Creditos - Debitos calculation
    let currentBal = 0;
    const finalLedger = list.map((item) => {
      // Balance accumulates Creditos (+) and reduces Debitos (-)
      currentBal += (item.credit - item.debit);
      return {
        ...item,
        balance: currentBal
      };
    });

    return finalLedger;
  }, [transactions, leaseContracts, pettyCashExpenses, selectedYear, selectedMonth]);

  // Filter General Ledger on search query & ERP-specific filters
  const filteredGeneralLedger = useMemo(() => {
    let result = compiledGeneralLedger;
    if (searchMayor.trim()) {
      const query = searchMayor.toLowerCase();
      result = result.filter(item => 
        item.description.toLowerCase().includes(query) ||
        item.ref.toLowerCase().includes(query) ||
        item.account.toLowerCase().includes(query) ||
        item.detail.toLowerCase().includes(query)
      );
    }
    if (jdeSupplierNum.trim()) {
      const query = jdeSupplierNum.toLowerCase();
      result = result.filter(item => 
        item.detail.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.account.toLowerCase().includes(query)
      );
    }
    if (jdePaymentStatus !== 'TODOS') {
      if (jdePaymentStatus === 'PENDIENTES') {
        result = result.filter(item => item.debit > 0);
      } else if (jdePaymentStatus === 'PAGADOS') {
        result = result.filter(item => item.credit > 0);
      }
    }

    // Apply QBE filters for Libro Mayor
    if (qbeMayorFecha.trim()) {
      const q = qbeMayorFecha.toLowerCase();
      result = result.filter(item => item.date.toLowerCase().includes(q));
    }
    if (qbeMayorModulo.trim()) {
      const q = qbeMayorModulo.toLowerCase();
      result = result.filter(item => item.source.toLowerCase().includes(q));
    }
    if (qbeMayorGlosa.trim()) {
      const q = qbeMayorGlosa.toLowerCase();
      result = result.filter(item => item.description.toLowerCase().includes(q));
    }
    if (qbeMayorReferencia.trim()) {
      const q = qbeMayorReferencia.toLowerCase();
      result = result.filter(item => item.ref.toLowerCase().includes(q));
    }
    if (qbeMayorCuenta.trim()) {
      const q = qbeMayorCuenta.toLowerCase();
      result = result.filter(item => item.account.toLowerCase().includes(q));
    }
    if (qbeMayorDebe.trim()) {
      const q = qbeMayorDebe.toLowerCase();
      result = result.filter(item => String(item.debit).includes(q) || (item.debit > 0 && item.debit.toLocaleString('es-CL').includes(q)));
    }
    if (qbeMayorHaber.trim()) {
      const q = qbeMayorHaber.toLowerCase();
      result = result.filter(item => String(item.credit).includes(q) || (item.credit > 0 && item.credit.toLocaleString('es-CL').includes(q)));
    }
    if (qbeMayorSaldo.trim()) {
      const q = qbeMayorSaldo.toLowerCase();
      result = result.filter(item => String(item.balance).includes(q) || item.balance.toLocaleString('es-CL').includes(q));
    }

    return result;
  }, [compiledGeneralLedger, searchMayor, jdeSupplierNum, jdePaymentStatus, qbeMayorFecha, qbeMayorModulo, qbeMayorGlosa, qbeMayorReferencia, qbeMayorCuenta, qbeMayorDebe, qbeMayorHaber, qbeMayorSaldo]);

  // TOTALS FOR MAYOR
  const mayorTotals = useMemo(() => {
    let totDebit = 0;
    let totCredit = 0;
    compiledGeneralLedger.forEach(x => {
      totDebit += x.debit;
      totCredit += x.credit;
    });
    return {
      debit: totDebit,
      credit: totCredit,
      net: totCredit - totDebit
    };
  }, [compiledGeneralLedger]);


  // 2. COMPILATION: AUXILIAR DE BANCOS (BANK AUXILIARY LEDGER)
  // Standard bank ledger compiles direct transactions which are bank-associated or typical bank entries
  const compiledBankLedger = useMemo(() => {
    const list: any[] = [];
    
    // We fetch bank movements from direct transactions in the selected period
    transactions.forEach((tx) => {
      if (isDateInSelectedPeriod(tx.date)) {
        const isDeposit = tx.type === 'INCOME';
        
        // Exclude accounts that clearly aren't related, e.g. if we want only cash equivalents,
        // but traditionally we track cashflow transactions.
        list.push({
          id: tx.id,
          date: tx.date,
          docType: tx.documentType || 'DEP',
          docNum: tx.documentNumber || `REF-${tx.id.slice(0, 4)}`,
          description: tx.description || 'Movimiento Bancario',
          deposit: isDeposit ? tx.amount : 0,
          withdrawal: !isDeposit ? tx.amount : 0,
          detail: tx.supplierName || tx.user || 'S/N'
        });
      }
    });

    // Sort chronologically
    list.sort((a, b) => a.date.localeCompare(b.date));

    // Compute running balance starting with initial bank balance
    let bankBal = initialBankBalance;
    const finalBankBook = list.map((item) => {
      bankBal = bankBal + item.deposit - item.withdrawal;
      return {
        ...item,
        balance: bankBal
      };
    });

    return finalBankBook;
  }, [transactions, selectedYear, selectedMonth, initialBankBalance]);

  // Filter Bank Ledger
  const filteredBankLedger = useMemo(() => {
    let result = compiledBankLedger;
    if (searchBancos.trim()) {
      const query = searchBancos.toLowerCase();
      result = result.filter(item => 
        item.description.toLowerCase().includes(query) ||
        item.docNum.toLowerCase().includes(query) ||
        item.detail.toLowerCase().includes(query)
      );
    }

    // Apply QBE filters for Auxiliar de Bancos
    if (qbeBancosFecha.trim()) {
      const q = qbeBancosFecha.toLowerCase();
      result = result.filter(item => item.date.toLowerCase().includes(q));
    }
    if (qbeBancosVoucher.trim()) {
      const q = qbeBancosVoucher.toLowerCase();
      result = result.filter(item => `${item.docType} Nº ${item.docNum}`.toLowerCase().includes(q));
    }
    if (qbeBancosDescripcion.trim()) {
      const q = qbeBancosDescripcion.toLowerCase();
      result = result.filter(item => item.description.toLowerCase().includes(q));
    }
    if (qbeBancosDestinatario.trim()) {
      const q = qbeBancosDestinatario.toLowerCase();
      result = result.filter(item => item.detail.toLowerCase().includes(q));
    }
    if (qbeBancosDepositos.trim()) {
      const q = qbeBancosDepositos.toLowerCase();
      result = result.filter(item => String(item.deposit).includes(q) || (item.deposit > 0 && item.deposit.toLocaleString('es-CL').includes(q)));
    }
    if (qbeBancosGiros.trim()) {
      const q = qbeBancosGiros.toLowerCase();
      result = result.filter(item => String(item.withdrawal).includes(q) || (item.withdrawal > 0 && item.withdrawal.toLocaleString('es-CL').includes(q)));
    }
    if (qbeBancosSaldo.trim()) {
      const q = qbeBancosSaldo.toLowerCase();
      result = result.filter(item => String(item.balance).includes(q) || item.balance.toLocaleString('es-CL').includes(q));
    }

    return result;
  }, [compiledBankLedger, searchBancos, qbeBancosFecha, qbeBancosVoucher, qbeBancosDescripcion, qbeBancosDestinatario, qbeBancosDepositos, qbeBancosGiros, qbeBancosSaldo]);

  const bankTotals = useMemo(() => {
    let dep = 0;
    let wth = 0;
    compiledBankLedger.forEach(x => {
      dep += x.deposit;
      wth += x.withdrawal;
    });
    return {
      deposits: dep,
      withdrawals: wth,
      endBalance: initialBankBalance + dep - wth
    };
  }, [compiledBankLedger, initialBankBalance]);


  // 3. COMPILATION: AUXILIAR DE PROVEEDORES (SUPPLIER AUXILIARY LEDGER)
  // Compiles accounts payable for each supplier
  const compiledSupplierLedger = useMemo(() => {
    const map: Record<string, { 
      supplierName: string; 
      taxId: string; 
      purchases: number; // Cargo (Invoice values)
      payments: number;  // Abono (Payment values)
      items: any[];
    }> = {};

    // Initial setup for major suppliers to avoid blank screen
    suppliers.forEach((s) => {
      map[s.id] = {
        supplierName: s.name,
        taxId: s.rut || '76.012.345-K',
        purchases: 0,
        payments: 0,
        items: []
      };
    });

    // Compile from Transactions: expenses with a supplierName
    transactions.forEach((tx) => {
      if (isDateInSelectedPeriod(tx.date) && tx.supplierName) {
        const sKey = tx.supplierId || tx.supplierName;
        if (!map[sKey]) {
          map[sKey] = {
            supplierName: tx.supplierName,
            taxId: tx.supplierTaxId || '76.000.000-0',
            purchases: 0,
            payments: 0,
            items: []
          };
        }

        const isExpense = tx.type === 'EXPENSE';
        const item = {
          id: tx.id,
          date: tx.date,
          docType: tx.documentType || 'FACTURA',
          docNum: tx.documentNumber || `DOC-${tx.id.slice(0, 4)}`,
          description: tx.description,
          charge: isExpense ? tx.amount : 0,  // purchase invoice value
          payment: !isExpense ? tx.amount : 0, // payment made
          source: 'TRANSACCIÓN'
        };

        map[sKey].items.push(item);
        if (isExpense) {
          map[sKey].purchases += tx.amount;
        } else {
          map[sKey].payments += tx.amount;
        }
      }
    });

    // Compile from Petty cash expenses that have a supplier name
    pettyCashExpenses.forEach((exp) => {
      if (isDateInSelectedPeriod(exp.date) && exp.supplierName) {
        const sKey = exp.supplierName; // usually grouped by name
        if (!map[sKey]) {
          map[sKey] = {
            supplierName: exp.supplierName,
            taxId: exp.supplierTaxId || '76.000.000-0',
            purchases: 0,
            payments: 0,
            items: []
          };
        }

        const item = {
          id: `PETTY-${exp.id}`,
          date: exp.date,
          docType: exp.documentType || 'BOLETA',
          docNum: exp.documentNumber || 'S/N',
          description: `Gasto Caja Chica: ${exp.description}`,
          charge: exp.amount, // purchase value
          payment: 0,        // petty cash expense counts as instant charge, but let's assume it represents cash purchase
          source: 'CAJA CHICA'
        };

        map[sKey].items.push(item);
        map[sKey].purchases += exp.amount;
      }
    });

    // Return as array
    return Object.keys(map).map((key) => {
      // Sort itemized rows chronologically
      const sortedItems = [...map[key].items].sort((a, b) => a.date.localeCompare(b.date));
      
      // Calculate running cumulative unpaid balance for individual supplier
      let bal = 0;
      const finalItems = sortedItems.map((it) => {
        // Purchases (charge) increase unpaid balance, payments decrease it
        bal = bal + it.charge - it.payment;
        return {
          ...it,
          balance: bal
        };
      });

      return {
        id: key,
        supplierName: map[key].supplierName,
        taxId: map[key].taxId,
        purchases: map[key].purchases,
        payments: map[key].payments,
        pendingBalance: map[key].purchases - map[key].payments,
        items: finalItems
      };
    }).filter(x => x.purchases > 0 || x.payments > 0 || x.items.length > 0);
  }, [transactions, pettyCashExpenses, suppliers, selectedYear, selectedMonth]);

  // Filter Supplier Ledger based on QBE inputs
  const filteredSupplierLedger = useMemo(() => {
    let result = compiledSupplierLedger;
    if (searchProvs.trim()) {
      const query = searchProvs.toLowerCase();
      result = result.filter(item => item.supplierName.toLowerCase().includes(query));
    }

    // Apply QBE filters for Proveedores
    if (qbeProvsNombre.trim()) {
      const q = qbeProvsNombre.toLowerCase();
      result = result.filter(item => item.supplierName.toLowerCase().includes(q));
    }
    if (qbeProvsRut.trim()) {
      const q = qbeProvsRut.toLowerCase();
      result = result.filter(item => item.taxId.toLowerCase().includes(q));
    }
    if (qbeProvsFacturado.trim()) {
      const q = qbeProvsFacturado.toLowerCase();
      result = result.filter(item => String(item.purchases).includes(q) || item.purchases.toLocaleString('es-CL').includes(q));
    }
    if (qbeProvsPagado.trim()) {
      const q = qbeProvsPagado.toLowerCase();
      result = result.filter(item => String(item.payments).includes(q) || item.payments.toLocaleString('es-CL').includes(q));
    }
    if (qbeProvsSaldo.trim()) {
      const q = qbeProvsSaldo.toLowerCase();
      result = result.filter(item => String(item.pendingBalance).includes(q) || item.pendingBalance.toLocaleString('es-CL').includes(q));
    }

    return result;
  }, [compiledSupplierLedger, searchProvs, qbeProvsNombre, qbeProvsRut, qbeProvsFacturado, qbeProvsPagado, qbeProvsSaldo]);

  // Keyboard shortcut listener (F4 / Shift+F10 to trigger menu on active row, Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGridContextMenu(null);
        setIsJDEMenuOpen(false);
      }
      if (e.key === 'F4' || (e.shiftKey && e.key === 'F10')) {
        e.preventDefault();
        const currentList = activeTab === 'MAYOR' 
          ? filteredGeneralLedger 
          : activeTab === 'BANCOS' 
            ? filteredBankLedger 
            : filteredSupplierLedger;
        const targetRow = selectedGridRow || currentList[0];
        if (targetRow) {
          const fakeEvent = {
            preventDefault: () => {},
            stopPropagation: () => {},
            clientX: Math.min(window.innerWidth / 2, 450),
            clientY: Math.min(window.innerHeight / 2, 380)
          } as any;
          handleRowContextMenu(fakeEvent, targetRow, activeTab);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedGridRow, activeTab, filteredGeneralLedger, filteredBankLedger, filteredSupplierLedger]);

  // Total suppliers aggregate
  const supplierTotals = useMemo(() => {
    let totChg = 0;
    let totPay = 0;
    compiledSupplierLedger.forEach(s => {
      totChg += s.purchases;
      totPay += s.payments;
    });
    return {
      purchases: totChg,
      payments: totPay,
      pending: totChg - totPay
    };
  }, [compiledSupplierLedger]);

  // Selected supplier itemized card rows
  const selectedSupplierCardData = useMemo(() => {
    if (selectedSupplierId === 'ALL') return [];
    const supp = compiledSupplierLedger.find(s => s.id === selectedSupplierId);
    return supp ? supp.items : [];
  }, [compiledSupplierLedger, selectedSupplierId]);


  // DYNAMIC COMPLIANCE CHECKS ("Simplicidad Radical")
  const auditEvaluations = useMemo(() => {
    const ledgerCount = compiledGeneralLedger.length;
    const rentLines = compiledGeneralLedger.filter(x => x.source === 'CONTRATO ARRIENDO').length;
    const pettyCashLines = compiledGeneralLedger.filter(x => x.source === 'CAJA CHICA').length;
    const bankFlowCount = compiledBankLedger.length;
    
    return [
      {
        title: 'Cuadratura Contable Libro Mayor',
        desc: `Cargos vs Abonos balanceados en la partida del mes`,
        status: mayorTotals.net !== 0 ? 'INFO' : 'SUCCESS',
        label: mayorTotals.net !== 0 
          ? `Descuadre Neto: ${formatCLP(mayorTotals.net)} (Ingreso vs Gasto)` 
          : 'Libro Mayor perfectamente cuadradito'
      },
      {
        title: 'Ingreso Estimado por Arriendos (Contratos)',
        desc: `Devengación contable calculada de contratos activos de arriendo`,
        status: rentLines > 0 ? 'SUCCESS' : 'WARNING',
        label: rentLines > 0 
          ? `${rentLines} Contratos devengados (${formatCLP(compiledGeneralLedger.filter(x => x.source === 'CONTRATO ARRIENDO').reduce((s,x)=>s+x.credit, 0))} facturado)`
          : 'Atención: No se registraron devengos de contratos en este mes.'
      },
      {
        title: 'Rendición de Gastos por Caja Chica',
        desc: `Cajas chicas integradas automáticamente`,
        status: pettyCashLines > 0 ? 'SUCCESS' : 'INFO',
        label: pettyCashLines > 0 
          ? `${pettyCashLines} Comprobantes de compras menores cargados`
          : 'No se registran gastos menores de Caja Chica este mes'
      },
      {
        title: 'Auxiliar Bancario Sincronizado',
        desc: `Conciliación del libro auxiliar de bancos`,
        status: bankFlowCount > 0 ? 'SUCCESS' : 'INFO',
        label: bankFlowCount > 0 
          ? `${bankFlowCount} Transacciones bancarias validadas`
          : 'Sin movimientos bancarios en la planilla'
      }
    ];
  }, [compiledGeneralLedger, compiledBankLedger, mayorTotals]);


  // ==========================================
  // EXCEL EXPORTEUR CON FORMATO CORPORATIVO (ASSETFLOW)
  // ==========================================
  const handleExportAllToExcel = async (format: 'xls' | 'xlsx' = 'xlsx') => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      const pName = `${monthNames[selectedMonth - 1]} ${selectedYear}`.toUpperCase();

      // PART 1: LIBRO MAYOR SHEET
      const wsMayor = workbook.addWorksheet('Libro Mayor');
      wsMayor.views = [{ showGridLines: true }];

      // Header Banner
      wsMayor.mergeCells('A1:G1');
      const titleCell = wsMayor.getCell('A1');
      titleCell.value = 'ASSETFLOW - CORPORACIÓN DE SEGUROS';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }; // Charcoal slate
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      wsMayor.getRow(1).height = 40;

      // Report Header
      wsMayor.mergeCells('A2:G2');
      const subTitleCell = wsMayor.getCell('A2');
      subTitleCell.value = `REPORTE CONTABLE: LIBRO MAYOR CONSOLIDADO - PERÍODO: ${pName}`;
      subTitleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF4F46E5' } };
      subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      wsMayor.getRow(2).height = 25;

      // Metadata Info
      wsMayor.mergeCells('A3:G3');
      const infoCell = wsMayor.getCell('A3');
      infoCell.value = `Generado de forma automática por: ${currentUser} - UTC: ${new Date().toLocaleDateString()}`;
      infoCell.font = { name: 'Calibri', size: 9, italic: true };
      infoCell.alignment = { vertical: 'middle', horizontal: 'right' };
      wsMayor.getRow(3).height = 20;

      wsMayor.addRow([]); // Blank line

      // Headers Row
      const listHeaders = ['Fecha', 'Origen/Módulo', 'Glosa / Descripción', 'ID / Referencia', 'Cuenta Contable', 'Debe (Cargos)', 'Haber (Abonos)', 'Saldo Acumulado'];
      const headerRow = wsMayor.addRow(listHeaders);
      wsMayor.getRow(5).height = 28;
      
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo-600
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'medium', color: { argb: 'FF312E81' } }
        };
      });

      // Data Fill
      compiledGeneralLedger.forEach((it) => {
        const row = wsMayor.addRow([
          it.date,
          it.source,
          it.description,
          it.ref,
          it.account,
          it.debit,
          it.credit,
          it.balance
        ]);
        row.height = 22;

        // Custom formatting on data
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(4).alignment = { horizontal: 'left' };

        // Numbers/Finance formatting
        row.getCell(6).numFmt = '$#,##0';
        row.getCell(7).numFmt = '$#,##0';
        row.getCell(8).numFmt = '$#,##0';

        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
          // highlight source
          if (colNumber === 2) {
            cell.font = { bold: true, size: 9, color: { argb: it.source === 'CONTRATO ARRIENDO' ? 'FF059669' : it.source === 'CAJA CHICA' ? 'FF7C3AED' : 'FF4B5563' } };
          }
        });
      });

      // Totals Row
      const lastMayorRowIdx = wsMayor.rowCount + 1;
      const totalRow = wsMayor.addRow([
        'TOTALES', '', 'Resumen consolidado de Cargos y Abonos', '', '',
        { formula: `SUM(F6:F${lastMayorRowIdx - 1})` },
        { formula: `SUM(G6:G${lastMayorRowIdx - 1})` },
        { formula: `G${lastMayorRowIdx - 1} - F${lastMayorRowIdx - 1}` }
      ]);
      totalRow.height = 28;
      totalRow.eachCell((cell, colIdx) => {
        cell.font = { name: 'Calibri', size: 10, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        cell.border = {
          top: { style: 'double', color: { argb: 'FF4F46E5' } },
          bottom: { style: 'medium', color: { argb: 'FF312E81' } }
        };
        if (colIdx >= 6) {
          cell.numFmt = '$#,##0';
        }
      });


      // PART 2: AUXILIAR DE BANCOS SHEET
      const wsBancos = workbook.addWorksheet('Auxiliar de Bancos');
      wsBancos.views = [{ showGridLines: true }];

      // Header Banner
      wsBancos.mergeCells('A1:F1');
      const tBancos = wsBancos.getCell('A1');
      tBancos.value = 'ASSETFLOW - AUXILIAR MENSUAL DE BANCOS';
      tBancos.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      tBancos.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } }; // Emerald dark banner
      tBancos.alignment = { vertical: 'middle', horizontal: 'center' };
      wsBancos.getRow(1).height = 40;

      // Month info in subtitle
      wsBancos.mergeCells('A2:F2');
      const sbBancos = wsBancos.getCell('A2');
      sbBancos.value = `LIBRO AUXILIAR DE CUENTAS CORRIENTES - PERÍODO: ${pName}`;
      sbBancos.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF059669' } };
      sbBancos.alignment = { vertical: 'middle', horizontal: 'center' };
      wsBancos.getRow(2).height = 25;

      wsBancos.addRow([]); // Space line

      // Initial Balance Row representation in Excel
      wsBancos.addRow([
        'SALDO INIC.', '', 'Saldo de apertura en Cuenta Corriente Bancaria', '', '', '', initialBankBalance
      ]);
      const initRow = wsBancos.getRow(4);
      initRow.getCell(1).font = { bold: true };
      initRow.getCell(2).font = { bold: true };
      initRow.getCell(7).numFmt = '$#,##0';
      initRow.getCell(7).font = { bold: true, color: { argb: 'FF1E293B' } };

      // Headers Row
      const bankHeaders = ['Fecha', 'Doc / Referencia', 'Descripción / Concepto', 'Auxiliar / Detalle', 'Depósitos (+)', 'Giros / Egresos (-)', 'Saldo Cartola'];
      const hBank = wsBancos.addRow(bankHeaders);
      wsBancos.getRow(5).height = 28;
      hBank.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; // Emerald green
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Rows
      compiledBankLedger.forEach((it) => {
        const row = wsBancos.addRow([
          it.date,
          `${it.docType} Nº ${it.docNum}`,
          it.description,
          it.detail,
          it.deposit,
          it.withdrawal,
          it.balance
        ]);
        row.height = 22;
        row.getCell(5).numFmt = '$#,##0';
        row.getCell(6).numFmt = '$#,##0';
        row.getCell(7).numFmt = '$#,##0';
        row.eachCell((cell) => {
          cell.font = { name: 'Calibri', size: 10 };
        });
      });

      // Bank totals
      const lastBankRowIdx = wsBancos.rowCount + 1;
      const tBankRow = wsBancos.addRow([
        'TOTAL DE MOVIMIENTOS', '', 'Suma de Cargos y Abonos', '',
        { formula: `SUM(E6:E${lastBankRowIdx - 1})` },
        { formula: `SUM(F6:F${lastBankRowIdx - 1})` },
        { formula: `G4 + SUM(E6:E${lastBankRowIdx - 1}) - SUM(F6:F${lastBankRowIdx - 1})` }
      ]);
      tBankRow.height = 28;
      tBankRow.eachCell((cell, colIdx) => {
        cell.font = { name: 'Calibri', size: 10, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEECEFEE' } };
        if (colIdx >= 5) {
          cell.numFmt = '$#,##0';
        }
      });


      // PART 3: AUXILIAR DE PROVEEDORES SHEET
      const wsProvs = workbook.addWorksheet('Auxiliar de Proveedores');
      wsProvs.views = [{ showGridLines: true }];

      // Header Banner
      wsProvs.mergeCells('A1:E1');
      const tProvs = wsProvs.getCell('A1');
      tProvs.value = 'ASSETFLOW - AUXILIAR DE PROVEEDORES';
      tProvs.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      tProvs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }; // Purple banner
      tProvs.alignment = { vertical: 'middle', horizontal: 'center' };
      wsProvs.getRow(1).height = 40;

      wsProvs.mergeCells('A2:E2');
      const sbProvs = wsProvs.getCell('A2');
      sbProvs.value = `RESUMEN DE CUENTAS POR PAGAR (AP) - PERÍODO: ${pName}`;
      sbProvs.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF6D28D9' } };
      sbProvs.alignment = { vertical: 'middle', horizontal: 'center' };
      wsProvs.getRow(2).height = 25;

      wsProvs.addRow([]); // Blank

      // Main aggregate table headers
      const provHeaders = ['Proveedor / Prestador', 'RUT / Tax ID', 'Total Facturado (Cargos)', 'Total Pagado (Abonos)', 'Saldo Insoluto'];
      const hProvs = wsProvs.addRow(provHeaders);
      wsProvs.getRow(4).height = 26;
      hProvs.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Row fill
      compiledSupplierLedger.forEach((it) => {
        const row = wsProvs.addRow([
          it.supplierName,
          it.taxId,
          it.purchases,
          it.payments,
          it.pendingBalance
        ]);
        row.height = 21;
        row.getCell(3).numFmt = '$#,##0';
        row.getCell(4).numFmt = '$#,##0';
        row.getCell(5).numFmt = '$#,##0';
        row.eachCell((cell) => {
          cell.font = { name: 'Calibri', size: 10 };
        });
      });

      // Totals row
      const lastProvRowIdx = wsProvs.rowCount + 1;
      const tProvsRow = wsProvs.addRow([
        'TOTALES CONSOLIDADOS', '',
        { formula: `SUM(C5:C${lastProvRowIdx - 1})` },
        { formula: `SUM(D5:D${lastProvRowIdx - 1})` },
        { formula: `SUM(E5:E${lastProvRowIdx - 1})` }
      ]);
      tProvsRow.height = 28;
      tProvsRow.eachCell((cell, colIdx) => {
        cell.font = { name: 'Calibri', size: 10, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
        if (colIdx >= 3) {
          cell.numFmt = '$#,##0';
        }
      });


      // AUTO-WIDTH COLUMN ADJUSTMENT FOR ALL THREE SHEETS
      [wsMayor, wsBancos, wsProvs].forEach((ws) => {
        ws.columns.forEach((column) => {
          let maxLen = 0;
          column.eachCell?.({ includeEmpty: true }, (cell) => {
            const valStr = cell.value ? cell.value.toString() : '';
            if (valStr.length > maxLen) maxLen = valStr.length;
          });
          column.width = Math.min(Math.max(maxLen + 3, 12), 45); // elegant boundary
        });
      });


      // BUFFER WRITE AND DOWNLOAD TRIGGER
      const buf = await workbook.xlsx.writeBuffer();
      const mimeType = format === 'xls' ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const fBlob = new Blob([buf], { type: mimeType });
      const fName = `LIBROS_AUXILIARES_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.${format}`;
      
      // Standalone browser safeguard link fallback if FileSaver blocks
      try {
        saveAs(fBlob, fName);
      } catch (e) {
        // Fallback standard download trigger
        const url = window.URL.createObjectURL(fBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      alert('Error al generar la compilación de libros Excel. Por favor verifique los datos.');
    }
  };

  // Submit handler for adding a ERP transaction (P0911 Ledger Entry)
  const handleP0911Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setP0911ErrorMessage('');

    if (!p0911Glosa.trim()) {
      setP0911ErrorMessage('Error: La Glosa / Descripción es obligatoria para registrar en el libro mayor.');
      return;
    }
    if (p0911Amount <= 0) {
      setP0911ErrorMessage('Error: El importe debe ser mayor que $0.');
      return;
    }
    if (!p0911Date) {
      setP0911ErrorMessage('Error: Debe ingresar una Fecha de movimiento válida.');
      return;
    }

    // Find supplier if selected
    const selectedSupplier = suppliers.find(s => s.id === p0911SupplierId);
    
    // Create new Transaction matching types.ts Transaction interface
    const newTx: Transaction = {
      id: `TX-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      description: p0911Glosa,
      amount: p0911Amount,
      category: p0911DocType === 'JE' ? 'DIARIO_GENERAL' : 'PAGO A PROVEEDOR',
      type: p0911Type,
      documentType: p0911DocType,
      documentNumber: p0911DocNum || String(Math.floor(10000 + Math.random() * 90000)),
      date: p0911Date,
      invoiceDate: p0911Date,
      user: currentUser || 'SAMAHEIM',
      timestamp: Date.now(),
      supplierId: p0911SupplierId || undefined,
      supplierName: selectedSupplier?.name || undefined,
      supplierTaxId: selectedSupplier?.taxId || undefined,
      propertyId: p0911PropertyId || undefined,
      accountCode: p0911AccountCode,
      insuranceCompany: p0911InsuranceCompany,
      status: 'COMPLETADA',
      programId: 'P0911',
      workStationId: 'MKEY-PC-01',
      lockedBy: null,
      lockedAt: null,
      isTest: false,
    };

    onAddTransaction(newTx);

    // Reset fields & success feedback
    setP0911Glosa('');
    setP0911Amount(0);
    setP0911DocNum('');
    setIsP0911Open(false);
    alert(`✅ Registro contable ERP (P0911) ingresado con éxito!\nDocumento: ${newTx.documentType} Nº ${newTx.documentNumber}\nCuenta: ${newTx.accountCode}\nMonto: ${formatCLP(newTx.amount)}`);
  };


  return (
    <div 
      className="w-full min-h-full flex flex-col gap-4 p-2 sm:p-3 md:p-4 pb-20 bg-[#EBF0F5] overflow-visible scroll-smooth" 
      id="auxiliary-ledgers-main-panel"
    >
      
      {/* ASSETFLOW ENTERPRISE CORPORATE BRAND HEADER */}
      <div className="bg-[#FAFBFD] border border-[#91A6BA] rounded-lg shadow-sm mb-2 select-none overflow-hidden">
        <div className="bg-[#0B3C5D] text-white px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight text-sm">AssetFlow Enterprise</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-4 text-[10px] font-semibold text-blue-100">
            <span className="hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1">
              <BookOpen size={12} /> Inicio
            </span>
            <span className="hover:text-amber-300 transition-colors cursor-pointer">Navegador</span>
            <span className="hover:text-amber-300 transition-colors cursor-pointer">Favoritos</span>
            <span className="text-blue-400">|</span>
            <span className="hover:text-amber-300 transition-colors cursor-pointer">Funciones</span>
            <span className="hover:text-amber-300 transition-colors cursor-pointer">Personalización</span>
            <span className="hover:text-amber-300 transition-colors cursor-pointer">Ayuda</span>
            <span className="text-blue-400">|</span>
            <span className="text-white bg-[#061F30]/40 px-2 py-0.5 rounded border border-blue-400/20 font-mono">
              Entorno: PRD_JD0910
            </span>
            <span className="text-blue-400">|</span>
            <span className="text-[#FF9999] hover:text-red-300 transition-colors cursor-pointer font-bold">Desconexión</span>
          </div>
        </div>

        {/* WORKSPACE APP TITLE AND ACTION TOOLBAR */}
        <div className="p-3.5 bg-[#FAFBFD] border-b border-[#D2DFEC] flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold text-[#1A3E5C] flex flex-wrap items-center gap-2 font-sans tracking-tight leading-snug">
              <span>Consulta de Mayor y Balance • Libros Auxiliares One View</span>
              <span className="text-xs bg-[#E3ECF3] border border-[#A2BCCF] text-[#1A3E5C] font-mono px-2 py-0.5 rounded-md font-bold shrink-0">
                P092102 / P0912AUX
              </span>
            </h1>
            <p className="text-[10.5px] font-medium text-slate-500 mt-0.5 leading-normal">
              Visualización estandarizada de movimientos financieros, conciliaciones bancarias y cuentas por pagar integradas.
            </p>
          </div>

          {/* ERP TOOLBAR BUTTONS */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button 
              onClick={() => {
                alert('🔍 Buscando y refrescando datos del libro contable según criterios ERP...');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFBFD] hover:bg-[#F0F5FA] text-slate-700 border border-[#A2A2A2] rounded text-[10.5px] font-bold uppercase transition-all shadow-xs cursor-pointer no-jde-override"
            >
              <Search size={12} className="text-blue-700" />
              Buscar (Find)
            </button>

            <button 
              onClick={handleClearAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFBFD] hover:bg-[#F0F5FA] text-slate-700 border border-[#A2A2A2] rounded text-[10.5px] font-bold uppercase transition-all shadow-xs cursor-pointer no-jde-override"
            >
              <span className="text-rose-600 font-extrabold">✕</span>
              Limpiar (Clear)
            </button>

            {/* Direct XLSX / XLS Export Buttons on main toolbar to satisfy user request */}
            <button 
              onClick={() => handleExportAllToExcel('xlsx')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#107c41] hover:bg-[#0b592e] text-white border border-[#0d6b38] rounded text-[10.5px] font-black uppercase transition-all shadow-md cursor-pointer no-jde-override shrink-0"
              title="Exportar todos los datos del grid actual a una planilla Excel (.xlsx) real"
            >
              <FileSpreadsheet size={12} />
              Exportar XLSX
            </button>

            <button 
              onClick={() => handleExportAllToExcel('xls')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#107c41]/90 hover:bg-[#0b592e] text-white border border-[#0d6b38] rounded text-[10.5px] font-black uppercase transition-all shadow-md cursor-pointer no-jde-override shrink-0"
              title="Exportar todos los datos del grid actual a una planilla Excel compatible (.xls)"
            >
              <FileSpreadsheet size={12} />
              Exportar XLS
            </button>

            <button 
              onClick={handleCurrentPeriod}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFBFD] hover:bg-[#F0F5FA] text-slate-700 border border-[#A2A2A2] rounded text-[10.5px] font-bold uppercase transition-all shadow-xs cursor-pointer no-jde-override"
            >
              <Calendar size={12} className="text-[#1A3E5C]" />
              Pantalla (E)
            </button>

            <div className="relative inline-block">
              <button 
                onClick={() => setShowReportsDropdown(!showReportsDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFBFD] hover:bg-[#F0F5FA] text-slate-700 border border-[#A2A2A2] rounded text-[10.5px] font-bold uppercase transition-all shadow-xs cursor-pointer no-jde-override"
              >
                <FileSpreadsheet size={12} className="text-emerald-700" />
                Mis Informes ERP
                <span className="text-[8px] text-slate-400">▼</span>
              </button>

              {showReportsDropdown && (
                <div className="absolute right-0 mt-1 w-64 bg-[#FAFBFD] border border-[#91A6BA] shadow-lg rounded-md z-50 py-1.5 text-xs text-slate-700 divide-y divide-slate-100">
                  <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Modelos One View Reports
                  </div>
                  <button 
                    onClick={() => { setShowReportsDropdown(false); alert('Generando simulación de informe "Facturación Proveedor" en lote...'); }}
                    className="w-full text-left px-4 py-2 hover:bg-[#FFFCDD] hover:text-black block transition-all"
                  >
                    📝 Facturación Proveedor (F0411)
                  </button>
                  <button 
                    onClick={() => { setShowReportsDropdown(false); alert('Abriendo libro histórico "Situación de Proveedores" (F0414)...'); }}
                    className="w-full text-left px-4 py-2 hover:bg-[#FFFCDD] hover:text-black block transition-all"
                  >
                    📊 Situación de Proveedores (AP Ledger)
                  </button>
                  <button 
                    onClick={() => { setShowReportsDropdown(false); handleExportAllToExcel(); }}
                    className="w-full text-left px-4 py-2 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] font-bold block transition-all flex items-center gap-2"
                  >
                    📥 Exportar Todos a Excel (Lay-out F0911)
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => {
                setIsP0911Open(!isP0911Open);
                const day = new Date().getDate();
                setP0911Date(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day > 28 ? 15 : day).padStart(2, '0')}`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFCDD] hover:bg-[#FFF9B3] text-amber-950 border border-[#CCAA00] rounded text-[10.5px] font-black uppercase transition-all shadow-xs cursor-pointer no-jde-override"
              title="Formulario de AssetFlow Enterprise (P0911) para ingresar un comprobante/voucher en el Libro Mayor"
            >
              <span className="text-emerald-700 font-extrabold text-xs">✚</span>
              Ingreso Diario (P0911)
            </button>

            <button 
              onClick={() => {
                alert('💎 One View Watchlist: Se ha auditado la correlación del General Ledger. Todas las alertas se encuentran actualizadas.');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B3C5D] hover:bg-[#104C74] text-white border border-[#061F30] rounded text-[10.5px] font-bold uppercase transition-all shadow-xs cursor-pointer no-jde-override"
            >
              <Sliders size={12} className="text-amber-300" />
              One View Watchlists
            </button>

            {/* Quick Slide to Grid Button */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('main-jde-data-grid');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#E1EBF5] hover:bg-[#D2DFEC] text-[#0A2D4A] border border-[#7FA6C7] rounded text-[10.5px] font-black uppercase transition-all shadow-xs cursor-pointer no-jde-override shrink-0"
              title="Desplazarse hacia abajo a la Grilla de Registros y Cuentas (Slide Bar)"
            >
              <span>Grilla de Datos</span>
              <span className="text-xs">↓</span>
            </button>
          </div>
        </div>

        {/* ERP INTERACTIVE FORM FILTER PANEL */}
        <div className="p-4 bg-[#F0F4F8] border-b border-[#D2DFEC] grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
          
          {/* Supplier Search Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block font-sans">
              Número Proveedor / RUT
            </label>
            <div className="relative">
              <input 
                type="text"
                value={jdeSupplierNum}
                onChange={(e) => setJdeSupplierNum(e.target.value)}
                placeholder="RUT o Nombre de Proveedor..."
                className="w-full bg-white border border-[#9DB2C3] px-2.5 py-1.5 rounded text-xs text-[#2D3E50] focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]"
              />
              {jdeSupplierNum && (
                <button 
                  onClick={() => setJdeSupplierNum('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-extrabold text-[10px] no-jde-override px-1 py-0 bg-transparent border-0 shadow-none hover:bg-transparent"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Company Code Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block font-sans">
              Compañía
            </label>
            <input 
              type="text"
              value={jdeCompany}
              onChange={(e) => setJdeCompany(e.target.value)}
              placeholder="00045"
              className="w-full bg-white border border-[#9DB2C3] px-2.5 py-1.5 rounded text-xs text-[#2D3E50]"
            />
          </div>

          {/* Payment Status Radios Group */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block font-sans">
              Estado de Pago (Filtro AP)
            </label>
            <div className="flex flex-wrap items-center bg-white border border-[#9DB2C3] rounded p-1.5 gap-4">
              {[
                { id: 'TODOS', label: 'Todos' },
                { id: 'PAGADOS', label: 'Pagados' },
                { id: 'PENDIENTES', label: 'Pendientes' },
                { id: 'RETENIDOS', label: 'Retenidos' }
              ].map((st) => (
                <label key={st.id} className="flex items-center gap-1.5 text-[11px] font-bold text-[#2D3E50] cursor-pointer">
                  <input 
                    type="radio"
                    name="jdePaymentStatusRadio"
                    checked={jdePaymentStatus === st.id}
                    onChange={() => setJdePaymentStatus(st.id as any)}
                    className="accent-[#0B3C5D] w-3 h-3"
                  />
                  {st.label}
                </label>
              ))}
            </div>
          </div>

          {/* Currency dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block font-sans">
              Moneda Cálculo
            </label>
            <select 
              value={jdeCurrency} 
              onChange={(e) => setJdeCurrency(e.target.value)}
              className="w-full bg-white border border-[#9DB2C3] px-2.5 py-1.5 rounded text-xs text-[#2D3E50]"
            >
              <option value="CLP">Pesos Chilenos (CLP)</option>
              <option value="USD">Dólares Americanos (USD)</option>
            </select>
          </div>

          {/* Exchange Rate Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block font-sans">
              Fecha T/C Cálculo
            </label>
            <input 
              type="date"
              value={jdeExchangeRateDate}
              onChange={(e) => setJdeExchangeRateDate(e.target.value)}
              className="w-full bg-white border border-[#9DB2C3] px-2.5 py-1.5 rounded text-xs text-[#2D3E50] font-mono"
            />
          </div>

          {/* Reference Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block font-sans">
              Fecha Referencia
            </label>
            <input 
              type="date"
              value={jdeReferenceDate}
              onChange={(e) => setJdeReferenceDate(e.target.value)}
              className="w-full bg-white border border-[#9DB2C3] px-2.5 py-1.5 rounded text-xs text-[#2D3E50] font-mono"
            />
          </div>

          {/* Period Selection Controls integrated */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block font-sans">
              Período Contable Activo
            </label>
            <div className="flex items-center gap-1">
              <button 
                onClick={handlePreviousPeriod} 
                className="px-2 py-1.5 bg-[#FAFBFD] hover:bg-[#F0F5FA] border border-[#A2A2A2] rounded text-[10px] font-black text-[#1A3E5C] flex-1 text-center cursor-pointer no-jde-override"
                title="Ir al mes contable anterior"
              >
                ◀ Ant
              </button>
              <div className="bg-[#EBF0F5] border border-[#B1C2D1] text-slate-800 text-[10.5px] font-bold px-1.5 py-1.5 rounded flex items-center justify-center font-mono shrink-0 min-w-[90px]">
                {monthNames[selectedMonth - 1].substring(0, 3).toUpperCase()}-{selectedYear}
              </div>
              <button 
                onClick={handleNextPeriod} 
                className="px-2 py-1.5 bg-[#FAFBFD] hover:bg-[#F0F5FA] border border-[#A2A2A2] rounded text-[10px] font-black text-[#1A3E5C] flex-1 text-center cursor-pointer no-jde-override"
                title="Ir al mes contable siguiente"
              >
                Sig ▶
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ERP AUTHENTIC VERTICAL SLIDE BAR BANNER & NAVIGATION BAR */}
      <div className="bg-[#DCE7F2] border border-[#7FA6C7] rounded-lg p-2 sm:px-3.5 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs select-none">
        <div className="flex items-center gap-2">
          <span className="bg-[#0B3C5D] text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 shadow-2xs">
            <span className="text-amber-300 font-black text-xs">↕↔</span> SLIDEBAR VERTICAL & HORIZONTAL ACTIVO
          </span>
          <span className="font-bold text-xs text-[#0A2540]">
            P092102 • W092102A (Navegación Vertical & Horizontal de Consulta)
          </span>
          <span className="hidden xl:inline text-[10px] text-slate-600 font-medium">
            | Desplace la barra vertical u horizontal inferior para explorar columnas y montos sin cortes
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('auxiliary-ledgers-main-panel');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#0B3C5D] border border-[#7FA6C7] rounded text-[10px] font-bold uppercase transition-all shadow-xs cursor-pointer flex items-center gap-1 no-jde-override"
            title="Desplazarse arriba al Encabezado y Filtros (Slide Bar)"
          >
            <ArrowUp size={11} className="text-blue-700" />
            <span>Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('jde-watchlists-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#0B3C5D] border border-[#7FA6C7] rounded text-[10px] font-bold uppercase transition-all shadow-xs cursor-pointer flex items-center gap-1 no-jde-override"
            title="Desplazarse a las Listas de Control Watchlists"
          >
            <span>📊</span>
            <span>Listas Control</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('main-jde-data-grid');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3 py-1 bg-[#0B3C5D] hover:bg-[#144D75] text-white border border-[#061F30] rounded text-[10px] font-black uppercase transition-all shadow-xs cursor-pointer flex items-center gap-1.5 no-jde-override"
            title="Desplazarse directamente a la Grilla de Cuentas Contables F0911"
          >
            <ArrowDown size={11} className="text-amber-300" />
            <span>Grilla Cuentas (F0911)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCompactView(!isCompactView)}
            className={`px-2.5 py-1 rounded text-[10px] font-black uppercase transition-all shadow-xs cursor-pointer flex items-center gap-1 border no-jde-override ${
              isCompactView 
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-500' 
                : 'bg-[#FFFCDD] hover:bg-[#FFF9B3] text-amber-950 border-[#CCAA00]'
            }`}
            title="Alternar entre modo compacto y modo completo para optimizar el espacio vertical de la grilla"
          >
            {isCompactView ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
            <span>{isCompactView ? 'Modo Completo' : 'Modo Compacto'}</span>
          </button>
        </div>
      </div>

      {/* ERP FORM P0911 - INGRESO DE COMPROBANTES / DIARIO GENERAL */}
      {isP0911Open && (
        <div className="bg-[#FAFBFD] border-2 border-[#CCAA00] rounded-lg shadow-md mb-5 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-250">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-[#DCAE1D] to-[#B38F10] text-amber-950 px-4 py-2 flex items-center justify-between border-b border-[#CCAA00]">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono border border-amber-300">
                P0911
              </span>
              <span className="font-extrabold tracking-tight text-xs uppercase font-sans">
                Ingreso de Comprobantes Contables / Diario General Standard
              </span>
            </div>
            <button 
              onClick={() => setIsP0911Open(false)}
              className="text-amber-950 hover:text-black font-extrabold text-xs bg-amber-50/50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-900/10 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleP0911Submit} className="p-4 bg-[#F2F6F9] text-xs font-sans space-y-4">
            {p0911ErrorMessage && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 p-2 rounded text-[11px] font-bold">
                ⚠️ {p0911ErrorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Fecha Contable */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block">
                  Fecha Comprobante <span className="text-orange-600 font-extrabold">*</span>
                </label>
                <input 
                  type="date"
                  required
                  value={p0911Date}
                  onChange={(e) => setP0911Date(e.target.value)}
                  className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-xs px-2 py-1.5 border border-[#B1C2D1] rounded focus:outline-none focus:ring-1 focus:ring-[#0B3C5D] font-mono"
                />
              </div>

              {/* Tipo Documento */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block">
                  Tipo Doc (Co) <span className="text-orange-600 font-extrabold">*</span>
                </label>
                <select 
                  value={p0911DocType}
                  onChange={(e) => setP0911DocType(e.target.value)}
                  className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-xs px-2 py-1.5 border border-[#B1C2D1] rounded focus:outline-none focus:ring-1 focus:ring-[#0B3C5D] font-bold"
                >
                  <option value="JE">JE - Diario General / Traspaso</option>
                  <option value="PV">PV - Voucher de Proveedor</option>
                  <option value="CD">CD - Egreso / Pago Egreso</option>
                  <option value="CR">CR - Recibo / Depósito Ingreso</option>
                  <option value="AR">AR - Factura Arriendo</option>
                </select>
              </div>

              {/* Nº Documento */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block">
                  Nº Documento ERP
                </label>
                <input 
                  type="text"
                  placeholder="Auto-generar Nº"
                  value={p0911DocNum}
                  onChange={(e) => setP0911DocNum(e.target.value)}
                  className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-xs px-2 py-1.5 border border-[#B1C2D1] rounded focus:outline-none focus:ring-1 focus:ring-[#0B3C5D] font-mono"
                />
              </div>

              {/* Compañía ERP */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block">
                  Cía ERP
                </label>
                <input 
                  type="text"
                  value={jdeCompany}
                  disabled
                  className="w-full bg-[#E9EEF3] text-slate-500 text-xs px-2 py-1.5 border border-[#B1C2D1] rounded font-bold"
                />
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Glosa / Detalle */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block">
                  Glosa / Detalle de Descripción <span className="text-orange-600 font-extrabold">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ej: Pago de reparaciones de techumbre oficinas..."
                  value={p0911Glosa}
                  onChange={(e) => setP0911Glosa(e.target.value)}
                  className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-xs px-2.5 py-1.5 border border-[#B1C2D1] rounded focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                />
              </div>

              {/* Cuenta Contable */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block">
                  Cuenta General ERP (F0901) <span className="text-orange-600 font-extrabold">*</span>
                </label>
                <select 
                  value={p0911AccountCode}
                  onChange={(e) => setP0911AccountCode(e.target.value)}
                  className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-xs px-2 py-1.5 border border-[#B1C2D1] rounded focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                >
                  <option value="1.1.01.01 (Caja General)">1.1.01.01 (Caja General)</option>
                  <option value="1.1.02.01 (Banco de Chile)">1.1.02.01 (Banco de Chile)</option>
                  <option value="1.2.01.01 (Arriendos por Cobrar)">1.2.01.01 (Arriendos por Cobrar)</option>
                  <option value="2.1.01.01 (Proveedores por Pagar)">2.1.01.01 (Proveedores por Pagar)</option>
                  <option value="4.1.01.01 (Ingreso por Arriendos)">4.1.01.01 (Ingreso por Arriendos)</option>
                  <option value="5.1.02.10 (Gastos de Reparación)">5.1.02.10 (Gastos de Reparación)</option>
                  <option value="5.1.03.15 (Gastos de Consumo Eléctrico)">5.1.03.15 (Gastos de Consumo Eléctrico)</option>
                </select>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              {/* Tipo de Movimiento / Columna */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block">
                  Tipo Movimiento <span className="text-orange-600 font-extrabold">*</span>
                </label>
                <select 
                  value={p0911Type}
                  onChange={(e) => setP0911Type(e.target.value as any)}
                  className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-xs px-2 py-1.5 border border-[#B1C2D1] rounded focus:outline-none focus:ring-1 focus:ring-[#0B3C5D] font-bold"
                >
                  <option value="EXPENSE">Débito / Debe (-) [Egreso]</option>
                  <option value="INCOME">Crédito / Haber (+) [Ingreso]</option>
                </select>
              </div>

              {/* Importe Neto */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block">
                  Importe / Monto (CLP) <span className="text-orange-600 font-extrabold">*</span>
                </label>
                <input 
                  type="number"
                  required
                  min="1"
                  placeholder="Ingrese el monto..."
                  value={p0911Amount || ''}
                  onChange={(e) => setP0911Amount(Number(e.target.value) || 0)}
                  className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-xs px-2.5 py-1.5 border border-[#B1C2D1] rounded focus:outline-none focus:ring-1 focus:ring-[#0B3C5D] font-mono text-right font-bold"
                />
              </div>

              {/* Proveedor */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block">
                  Proveedor Relacionado
                </label>
                <select 
                  value={p0911SupplierId}
                  onChange={(e) => setP0911SupplierId(e.target.value)}
                  className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-xs px-2 py-1.5 border border-[#B1C2D1] rounded focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                >
                  <option value="">-- No aplica / Sin proveedor --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.taxId})</option>
                  ))}
                </select>
              </div>

              {/* Unidad de Negocio / Propiedad */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#1A3E5C] uppercase tracking-wider block">
                  Unidad de Negocio (Propiedad)
                </label>
                <select 
                  value={p0911PropertyId}
                  onChange={(e) => setP0911PropertyId(e.target.value)}
                  className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-xs px-2 py-1.5 border border-[#B1C2D1] rounded focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                >
                  <option value="">-- No aplica / Corporativo --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.address} (Piso {p.floor})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Form Actions footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D2DFEC]">
              <button 
                type="button"
                onClick={() => setIsP0911Open(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFBFD] hover:bg-[#F0F5FA] text-slate-700 border border-[#A2A2A2] rounded text-[10.5px] font-bold uppercase cursor-pointer shadow-xs no-jde-override"
              >
                <span className="text-rose-600 font-extrabold">✕</span>
                Cerrar (Cancel)
              </button>
              <button 
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-bottom from-[#E6F3FF] to-[#C2E0FF] text-[#0A2D4A] border border-[#7FA6C7] hover:border-[#41769B] rounded text-[10.5px] font-black uppercase cursor-pointer shadow-xs font-sans no-jde-override"
              >
                <span className="text-emerald-700 font-extrabold text-xs">✓</span>
                Aceptar (OK)
              </button>
            </div>

          </form>
        </div>
      )}

      {/* THREE ERP WATCHLIST / STATUS METRIC CARDS & AUDIT EVALUATIONS */}
      {isCompactView ? (
        <div id="jde-watchlists-section" className="bg-[#FAFBFD] border border-[#91A6BA] rounded-lg p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
          <div className="flex items-center gap-4 flex-wrap font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#4B6276] uppercase">Neto F0911:</span>
              <span className={`font-black ${mayorTotals.net >= 0 ? 'text-[#0B3C5D]' : 'text-rose-700'}`}>
                {formatCLP(mayorTotals.net)} {jdeCurrency}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#4B6276] uppercase">Bancos (CC):</span>
              <span className="font-black text-emerald-700">
                {formatCLP(bankTotals.endBalance)} {jdeCurrency}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#4B6276] uppercase">Saldo AP:</span>
              <span className="font-black text-purple-700">
                {formatCLP(supplierTotals.pending)} {jdeCurrency}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 size={12} />
              <span>Auditoría ERP: Válida (Partida Doble)</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCompactView(false)}
            className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline uppercase cursor-pointer"
          >
            Mostrar paneles de control expandidos ↓
          </button>
        </div>
      ) : (
        <div id="jde-watchlists-section" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans">
            
            {/* Watchlist Mayor */}
            <div className="bg-[#FAFBFD] border border-[#91A6BA] rounded-lg p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-[#4B6276] uppercase tracking-wider block">
                    Lista Control 1: Resultado Neto Mayor (F0911)
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                </div>
                <h2 className={`text-xl font-bold mt-2 font-sans ${mayorTotals.net >= 0 ? 'text-[#0B3C5D]' : 'text-rose-700'}`}>
                  {formatCLP(mayorTotals.net)} {jdeCurrency}
                </h2>
                <div className="mt-3 grid grid-cols-2 text-[10px] font-semibold text-slate-600 font-mono gap-1 border-t border-[#D2DFEC] pt-2">
                  <div>Créditos (+):</div>
                  <div className="text-right text-emerald-700">{formatCLP(mayorTotals.credit)}</div>
                  <div>Débitos (-):</div>
                  <div className="text-right text-rose-700">{formatCLP(mayorTotals.debit)}</div>
                </div>
              </div>
              <p className="text-[9px] italic text-[#4B6276] mt-3 pt-2 border-t border-[#E3ECF3]">
                * Cuenta balanceada ERP para período actual.
              </p>
            </div>

            {/* Watchlist Bancos */}
            <div className="bg-[#FAFBFD] border border-[#91A6BA] rounded-lg p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-[#4B6276] uppercase tracking-wider block">
                    Lista Control 2: Saldo Auxiliar de Bancos
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                </div>
                <h2 className="text-xl font-bold mt-2 text-[#0B3C5D] font-sans">
                  {formatCLP(bankTotals.endBalance)} {jdeCurrency}
                </h2>
                <div className="mt-2 text-[10px] font-semibold text-slate-600 font-mono flex flex-col gap-1 border-t border-[#D2DFEC] pt-2">
                  <div className="flex justify-between">
                    <span>Apertura:</span> 
                    <span className="text-slate-800">{formatCLP(initialBankBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dep/Giros:</span> 
                    <span className="text-emerald-700">+{formatCLP(bankTotals.deposits)} / -{formatCLP(bankTotals.withdrawals)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 border-t border-[#E3ECF3] pt-2 flex items-center justify-between gap-1.5">
                <span className="text-[9px] font-bold text-[#4B6276] uppercase">Editar Apertura:</span>
                <input 
                  type="number"
                  value={initialBankBalance}
                  onChange={(e) => setInitialBankBalance(Number(e.target.value) || 0)}
                  className="w-24 bg-white border border-[#9DB2C3] text-slate-700 text-[10px] font-mono px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                />
              </div>
            </div>

            {/* Watchlist Proveedores */}
            <div className="bg-[#FAFBFD] border border-[#91A6BA] rounded-lg p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-[#4B6276] uppercase tracking-wider block">
                    Lista Control 3: Saldo Cuentas x Pagar (F0411)
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                </div>
                <h2 className="text-xl font-bold mt-2 text-[#0B3C5D] font-sans">
                  {formatCLP(supplierTotals.pending)} {jdeCurrency}
                </h2>
                <div className="mt-3 grid grid-cols-2 text-[10px] font-semibold text-slate-600 font-mono gap-1 border-t border-[#D2DFEC] pt-2">
                  <div>Facturado:</div>
                  <div className="text-right text-rose-700">{formatCLP(supplierTotals.purchases)}</div>
                  <div>Pagado:</div>
                  <div className="text-right text-emerald-700">{formatCLP(supplierTotals.payments)}</div>
                </div>
              </div>
              <p className="text-[9px] italic text-[#4B6276] mt-3 pt-2 border-t border-[#E3ECF3]">
                * Estado {jdePaymentStatus} filtrado de proveedores.
              </p>
            </div>

          </div>

          {/* DYNAMIC ERP AUDIT EVALUATIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {auditEvaluations.map((audit, idx) => (
              <div key={idx} className="bg-[#FAFBFD] p-3.5 border border-[#91A6BA] rounded-lg flex items-start gap-2.5 shadow-xs">
                {audit.status === 'SUCCESS' ? (
                  <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                ) : audit.status === 'WARNING' ? (
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                ) : (
                  <HelpCircle className="text-indigo-600 shrink-0 mt-0.5" size={16} />
                )}
                <div>
                  <h4 className="text-[10.5px] font-bold text-[#1A3E5C] uppercase leading-tight">{audit.title}</h4>
                  <p className="text-[9.5px] font-semibold text-slate-500 mt-0.5 leading-snug">{audit.desc}</p>
                  <div className="mt-1 text-[8.5px] font-black text-[#2D3E50] bg-[#F0F4F8] px-1.5 py-0.5 rounded border border-[#B1C2D1] inline-block font-mono">
                    {audit.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN DATA MODULE */}
      <div id="main-jde-data-grid" className="bg-[#FAFBFD] border border-[#91A6BA] rounded-lg overflow-hidden shadow-sm">
        
        {/* TABS NAVBAR */}
        <div className="flex flex-wrap border-b border-[#91A6BA] bg-[#F0F5FA] p-1.5 gap-1">
          {[
            { id: 'MAYOR', label: '1. Libro Mayor Consolidado', count: compiledGeneralLedger.length, icon: <BookOpen size={13} /> },
            { id: 'BANCOS', label: '2. Auxiliar de Bancos (CC)', count: compiledBankLedger.length, icon: <Landmark size={13} /> },
            { id: 'PROVEEDORES', label: '3. Auxiliar Proveedor (AP)', count: compiledSupplierLedger.length, icon: <Users size={13} /> },
            { id: 'INTEGRIDAD_AAI', label: '4. Integridad UBE & AAIs (R097011 / R04701 / F0012)', count: 6, icon: <CheckSquare size={13} /> }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-t border transition-all cursor-pointer no-jde-override ${
                  isActive 
                    ? 'bg-white text-[#1A3E5C] border-b-transparent border-[#91A6BA] border-t-4 border-t-[#0B3C5D]' 
                    : 'bg-[#E1EBF5] text-[#4B6276] border-[#A2BCCF] hover:bg-[#FFFCDD] hover:text-[#000000]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded ${
                  isActive ? 'bg-[#0B3C5D] text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTINUED VIEW */}
        <div className="p-4 bg-white">
          {/*================= TAB 1: LIBRO MAYOR =================*/}
          {activeTab === 'MAYOR' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="relative w-full sm:max-w-md">
                  <input 
                    type="text"
                    value={searchMayor}
                    onChange={(e) => setSearchMayor(e.target.value)}
                    placeholder="Filtrar por glosa, referencia, cuenta contable..."
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-9 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
                  />
                  <Search size={14} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Mostrando {filteredGeneralLedger.length} registros del mes de {monthNames[selectedMonth - 1]}
                </div>
              </div>

              {/* SLIDEBAR STATUS BAR & TABLE CONTAINER */}
              <div className="bg-[#DCE7F2] border border-[#7FA6C7] border-b-0 px-3 py-1.5 flex items-center justify-between text-[10.5px] font-sans text-[#0B3C5D] rounded-t-md select-none">
                <div className="flex items-center gap-2 font-bold">
                  <span className="text-[#0B3C5D] font-black text-xs">↕↔ SLIDEBAR VERTICAL & HORIZONTAL (F0911):</span>
                  <span className="text-slate-700">Desplace la barra vertical u horizontal para explorar los {filteredGeneralLedger.length} asientos contables con ancho completo</span>
                </div>
                <span className="text-[10px] font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-[#B0C4DE] font-semibold">
                  {filteredGeneralLedger.length} Asientos Cargados
                </span>
              </div>

              {/* TABLE WITH VERTICAL SLIDE BAR */}
              <div className="overflow-x-auto overflow-y-auto max-h-[60vh] min-h-[320px] border border-[#7FA6C7] rounded-b-md shadow-xs bg-white jde-scrollbar [&::-webkit-scrollbar]:w-3.5 [&::-webkit-scrollbar]:h-3.5 [&::-webkit-scrollbar-track]:bg-[#E2ECF5] [&::-webkit-scrollbar-thumb]:bg-[#0B3C5D] [&::-webkit-scrollbar-thumb]:rounded-sm hover:[&::-webkit-scrollbar-thumb]:bg-blue-800">
                <table className="w-full min-w-[1200px] text-left border-collapse font-sans text-[11px] bg-white relative" style={{ border: '1px solid #7FA6C7' }}>
                  <thead className="sticky top-0 z-20 shadow-xs bg-[#FAFBFD]">
                    <tr className="bg-[#FAFBFD] text-[#1A3E5C] text-[10px] font-bold uppercase tracking-wider border-b-2 border-[#7FA6C7]">
                      <th className="w-9 p-1.5 text-center border-r border-[#A2BCCF] font-bold text-[9px] uppercase tracking-wider" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }} title="Selector de Fila ERP / Menú Contextual">#</th>
                      <th className="p-1.5 text-center border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Fecha</th>
                      <th className="p-1.5 text-center border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Módulo</th>
                      <th className="p-1.5 border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Glosa / Detalle Descripción</th>
                      <th className="p-1.5 border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Referencia</th>
                      <th className="p-1.5 border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Cuenta General</th>
                      <th className="p-1.5 text-right border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Debito (Debe)</th>
                      <th className="p-1.5 text-right border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Credito (Haber)</th>
                      <th className="p-1.5 text-right font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Saldo</th>
                    </tr>

                    {/* ERP QBE (Query By Example) interactive row */}
                    <tr className="bg-[#E2ECF5] border-b border-[#7FA6C7] sticky top-[28px] z-20 shadow-2xs">
                      <th className="w-9 p-1 border-r border-[#A2BCCF] bg-[#DCE7F2] text-center text-[9px] text-[#0B3C5D] font-mono font-bold">
                        QBE
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeMayorFecha}
                          onChange={(e) => setQbeMayorFecha(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeMayorModulo}
                          onChange={(e) => setQbeMayorModulo(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeMayorGlosa}
                          onChange={(e) => setQbeMayorGlosa(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeMayorReferencia}
                          onChange={(e) => setQbeMayorReferencia(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeMayorCuenta}
                          onChange={(e) => setQbeMayorCuenta(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeMayorDebe}
                          onChange={(e) => setQbeMayorDebe(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none text-right"
                        />
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeMayorHaber}
                          onChange={(e) => setQbeMayorHaber(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none text-right"
                        />
                      </th>
                      <th className="p-1">
                        <input
                          type="text"
                          value={qbeMayorSaldo}
                          onChange={(e) => setQbeMayorSaldo(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none text-right"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D2DFEC] text-slate-800">
                    {filteredGeneralLedger.map((row, idx) => {
                      const isArriendo = row.source === 'CONTRATO ARRIENDO';
                      const isCajaChica = row.source === 'CAJA CHICA';
                      const isSelected = selectedGridRow?.id === row.id;
                      
                      return (
                        <tr 
                          key={row.id || idx} 
                          onContextMenu={(e) => handleRowContextMenu(e, row, 'MAYOR')}
                          className={`transition-all cursor-context-menu select-none ${
                            isSelected 
                              ? 'bg-[#D1E6F9]! text-[#0A2540] font-semibold ring-1 ring-[#0B3C5D]' 
                              : 'hover:bg-[#FFFCDD]! odd:bg-white even:bg-[#F4F8FC]'
                          }`}
                          title="Clic derecho o clic en [#] para abrir Menú Contextual AssetFlow Enterprise"
                        >
                          {/* ERP Row Selector Cell */}
                          <td 
                            className={`w-9 p-1 text-center border-r border-[#E3ECF3] font-mono text-[10px] cursor-pointer transition-colors select-none ${
                              isSelected
                                ? 'bg-[#0B3C5D] text-white font-bold'
                                : 'bg-[#F0F5FA] text-[#1A3E5C] font-semibold hover:bg-amber-100 hover:text-amber-900'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowContextMenu(e, row, 'MAYOR');
                            }}
                            title="Clic para abrir Menú Contextual AssetFlow Enterprise (F4 / Clic Derecho)"
                          >
                            <div className="flex items-center justify-center">
                              {isSelected ? (
                                <span className="text-[10px] font-black text-amber-300 animate-pulse">▶</span>
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-1.5 text-center font-mono font-medium whitespace-nowrap text-[#2D3E50] border-r border-[#E3ECF3]">{row.date}</td>
                          <td className="p-1.5 text-center whitespace-nowrap border-r border-[#E3ECF3]">
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              isArriendo 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isCajaChica
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : 'bg-slate-100 text-slate-800 border border-slate-300'
                            }`}>
                              {row.source}
                            </span>
                          </td>
                          <td className="p-1.5 max-w-xs truncate border-r border-[#E3ECF3] font-sans" title={row.description}>{row.description}</td>
                          <td className="p-1.5 font-mono font-medium text-[10px] text-[#2D3E50] border-r border-[#E3ECF3]">{row.ref}</td>
                          <td className="p-1.5 text-slate-600 font-mono text-[10px] border-r border-[#E3ECF3]">{row.account}</td>
                          <td className="p-1.5 text-right text-rose-700 font-medium font-mono border-r border-[#E3ECF3]">
                            {row.debit > 0 ? formatCLP(row.debit) : '-'}
                          </td>
                          <td className="p-1.5 text-right text-emerald-700 font-medium font-mono border-r border-[#E3ECF3]">
                            {row.credit > 0 ? formatCLP(row.credit) : '-'}
                          </td>
                          <td className="p-1.5 text-right font-bold font-mono text-slate-900">
                            {formatCLP(row.balance)}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredGeneralLedger.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 uppercase font-black tracking-wider text-[10px]">
                          No se registran movimientos ni devengaciones en el período que coincidan con los filtros QBE.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {/* STICKY FOOTER TOTALS */}
                  <tfoot className="sticky bottom-0 z-20 bg-[#F0F5FA] border-t-2 border-[#7FA6C7] font-mono font-bold text-[10.5px] text-[#0A2540] shadow-md">
                    <tr>
                      <td colSpan={6} className="p-2 text-right uppercase tracking-wider font-sans font-bold text-[#0B3C5D]">
                        Totales Acumulados Período:
                      </td>
                      <td className="p-2 text-right text-rose-700 border-r border-[#A2BCCF]">
                        {formatCLP(mayorTotals.debit)}
                      </td>
                      <td className="p-2 text-right text-emerald-700 border-r border-[#A2BCCF]">
                        {formatCLP(mayorTotals.credit)}
                      </td>
                      <td className={`p-2 text-right font-black ${mayorTotals.net >= 0 ? 'text-[#0B3C5D]' : 'text-rose-700'}`}>
                        {formatCLP(mayorTotals.net)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/*================= TAB 2: AUXILIAR DE BANCOS =================*/}
          {activeTab === 'BANCOS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="relative w-full sm:max-w-md">
                  <input 
                    type="text"
                    value={searchBancos}
                    onChange={(e) => setSearchBancos(e.target.value)}
                    placeholder="Filtrar por documento, detalle, destinatario..."
                    className="w-full bg-slate-50 border border-slate-200 text-xs px-9 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
                  />
                  <Search size={14} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Libro Auxiliar Banco - Cuenta Corriente Operacional
                </div>
              </div>

              {/* SLIDEBAR STATUS BAR & TABLE CONTAINER */}
              <div className="bg-[#DCE7F2] border border-[#7FA6C7] border-b-0 px-3 py-1.5 flex items-center justify-between text-[10.5px] font-sans text-[#0B3C5D] rounded-t-md select-none">
                <div className="flex items-center gap-2 font-bold">
                  <span className="text-[#0B3C5D] font-black text-xs">↕↔ SLIDEBAR VERTICAL & HORIZONTAL (BANCOS):</span>
                  <span className="text-slate-700">Desplace la barra vertical u horizontal para explorar los {filteredBankLedger.length + 1} movimientos bancarios con ancho completo</span>
                </div>
                <span className="text-[10px] font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-[#B0C4DE] font-semibold">
                  {filteredBankLedger.length + 1} Registros Cargados
                </span>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto overflow-y-auto max-h-[60vh] min-h-[320px] border border-[#7FA6C7] rounded-b-md shadow-xs bg-white jde-scrollbar [&::-webkit-scrollbar]:w-3.5 [&::-webkit-scrollbar]:h-3.5 [&::-webkit-scrollbar-track]:bg-[#E2ECF5] [&::-webkit-scrollbar-thumb]:bg-[#0B3C5D] [&::-webkit-scrollbar-thumb]:rounded-sm hover:[&::-webkit-scrollbar-thumb]:bg-blue-800">
                <table className="w-full min-w-[1200px] text-left border-collapse font-sans text-[11px] bg-white relative" style={{ border: '1px solid #7FA6C7' }}>
                  <thead className="sticky top-0 z-20 shadow-xs bg-[#FAFBFD]">
                    <tr className="bg-[#FAFBFD] text-[#1A3E5C] text-[10px] font-bold uppercase tracking-wider border-b-2 border-[#7FA6C7]">
                      <th className="w-9 p-1.5 text-center border-r border-[#A2BCCF] font-bold text-[9px] uppercase tracking-wider" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }} title="Selector de Fila ERP / Menú Contextual">#</th>
                      <th className="p-1.5 text-center border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Fecha</th>
                      <th className="p-1.5 border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Voucher / Tipo</th>
                      <th className="p-1.5 border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Descripción Movto</th>
                      <th className="p-1.5 border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Auxiliar Destinatario</th>
                      <th className="p-1.5 text-right border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Depósitos (+)</th>
                      <th className="p-1.5 text-right border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Giros (-)</th>
                      <th className="p-1.5 text-right font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Saldo Cartola</th>
                    </tr>

                    {/* ERP QBE (Query By Example) interactive row */}
                    <tr className="bg-[#E2ECF5] border-b border-[#7FA6C7] sticky top-[28px] z-20 shadow-2xs">
                      <th className="w-9 p-1 border-r border-[#A2BCCF] bg-[#DCE7F2] text-center text-[9px] text-[#0B3C5D] font-mono font-bold">
                        QBE
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeBancosFecha}
                          onChange={(e) => setQbeBancosFecha(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeBancosVoucher}
                          onChange={(e) => setQbeBancosVoucher(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeBancosDescripcion}
                          onChange={(e) => setQbeBancosDescripcion(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeBancosDestinatario}
                          onChange={(e) => setQbeBancosDestinatario(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeBancosDepositos}
                          onChange={(e) => setQbeBancosDepositos(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none text-right"
                        />
                      </th>
                      <th className="p-1 border-r border-[#A2BCCF]">
                        <input
                          type="text"
                          value={qbeBancosGiros}
                          onChange={(e) => setQbeBancosGiros(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none text-right"
                        />
                      </th>
                      <th className="p-1">
                        <input
                          type="text"
                          value={qbeBancosSaldo}
                          onChange={(e) => setQbeBancosSaldo(e.target.value)}
                          placeholder="QBE..."
                          className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none text-right"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D2DFEC] text-[#2D3E50]">
                    {/* Raw initial row */}
                    {(() => {
                      const initRow = {
                        id: 'APERTURA',
                        date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
                        description: 'Saldo de apertura en cartola bancaria',
                        balance: initialBankBalance,
                        docType: 'INIT',
                        docNum: '0000',
                        detail: 'BANCO'
                      };
                      const isSelected = selectedGridRow?.id === 'APERTURA';
                      return (
                        <tr 
                          onContextMenu={(e) => handleRowContextMenu(e, initRow, 'BANCOS')}
                          className={`transition-all select-none cursor-context-menu ${
                            isSelected ? 'bg-[#D1E6F9]! text-[#0A2540] font-semibold' : 'bg-slate-100/60 font-bold text-[#1A3E5C] hover:bg-[#FFFCDD]!'
                          }`}
                          title="Clic derecho o [#] para Menú Contextual ERP (Saldo de Apertura)"
                        >
                          <td 
                            className="w-9 p-1 text-center border-r border-[#E3ECF3] font-mono text-[10px] cursor-pointer bg-[#F0F5FA] text-[#1A3E5C] font-semibold hover:bg-amber-100 hover:text-amber-900 select-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowContextMenu(e, initRow, 'BANCOS');
                            }}
                            title="Clic para Menú Contextual ERP"
                          >
                            <div className="flex items-center justify-center">
                              {isSelected ? <span className="text-[10px] font-black text-amber-300 animate-pulse">▶</span> : <span>0</span>}
                            </div>
                          </td>
                          <td className="p-1.5 text-center font-mono text-[10px] border-r border-[#E3ECF3]">Apertura</td>
                          <td className="p-1.5 font-mono text-[10px] text-slate-600 border-r border-[#E3ECF3]">SALDO INICIAL</td>
                          <td className="p-1.5 text-slate-600 border-r border-[#E3ECF3]">Saldo de apertura en cartola bancaria</td>
                          <td className="p-1.5 text-slate-500 border-r border-[#E3ECF3]">-</td>
                          <td className="p-1.5 text-right border-r border-[#E3ECF3] text-slate-500">-</td>
                          <td className="p-1.5 text-right border-r border-[#E3ECF3] text-slate-500">-</td>
                          <td className="p-1.5 text-right font-mono text-[#0B3C5D] font-extrabold">{formatCLP(initialBankBalance)}</td>
                        </tr>
                      );
                    })()}

                    {filteredBankLedger.map((row, idx) => {
                      const isSelected = selectedGridRow?.id === row.id;
                      return (
                        <tr 
                          key={row.id || idx} 
                          onContextMenu={(e) => handleRowContextMenu(e, row, 'BANCOS')}
                          className={`transition-all cursor-context-menu select-none ${
                            isSelected 
                              ? 'bg-[#D1E6F9]! text-[#0A2540] font-semibold ring-1 ring-[#0B3C5D]' 
                              : 'hover:bg-[#FFFCDD]! odd:bg-white even:bg-[#F4F8FC]'
                          }`}
                          title="Clic derecho o clic en [#] para abrir Menú Contextual AssetFlow Enterprise"
                        >
                          {/* ERP Row Selector Cell */}
                          <td 
                            className={`w-9 p-1 text-center border-r border-[#E3ECF3] font-mono text-[10px] cursor-pointer transition-colors select-none ${
                              isSelected
                                ? 'bg-[#0B3C5D] text-white font-bold'
                                : 'bg-[#F0F5FA] text-[#1A3E5C] font-semibold hover:bg-amber-100 hover:text-amber-900'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowContextMenu(e, row, 'BANCOS');
                            }}
                            title="Clic para abrir Menú Contextual AssetFlow Enterprise (F4 / Clic Derecho)"
                          >
                            <div className="flex items-center justify-center">
                              {isSelected ? (
                                <span className="text-[10px] font-black text-amber-300 animate-pulse">▶</span>
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-1.5 text-center font-mono font-medium whitespace-nowrap text-[#2D3E50] border-r border-[#E3ECF3]">{row.date}</td>
                          <td className="p-1.5 font-mono font-medium text-[10px] text-[#2D3E50] border-r border-[#E3ECF3]">
                            {row.docType} Nº {row.docNum}
                          </td>
                          <td className="p-1.5 border-r border-[#E3ECF3] font-sans">{row.description}</td>
                          <td className="p-1.5 text-[#2D3E50] font-semibold border-r border-[#E3ECF3]">{row.detail}</td>
                          <td className="p-1.5 text-right text-[#059669] font-bold font-mono border-r border-[#E3ECF3]">
                            {row.deposit > 0 ? formatCLP(row.deposit) : '-'}
                          </td>
                          <td className="p-1.5 text-right text-rose-700 font-bold font-mono border-r border-[#E3ECF3]">
                            {row.withdrawal > 0 ? formatCLP(row.withdrawal) : '-'}
                          </td>
                          <td className="p-1.5 text-right font-bold font-mono text-slate-900">
                            {formatCLP(row.balance)}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredBankLedger.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 uppercase font-black text-[10px] tracking-wider">
                          Sin transacciones operacionales que coincidan con los filtros QBE.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {/* STICKY FOOTER TOTALS */}
                  <tfoot className="sticky bottom-0 z-20 bg-[#F0F5FA] border-t-2 border-[#7FA6C7] font-mono font-bold text-[10.5px] text-[#0A2540] shadow-md">
                    <tr>
                      <td colSpan={5} className="p-2 text-right uppercase tracking-wider font-sans font-bold text-[#0B3C5D]">
                        Totales Cartola Bancaria:
                      </td>
                      <td className="p-2 text-right text-emerald-700 border-r border-[#A2BCCF]">
                        +{formatCLP(bankTotals.deposits)}
                      </td>
                      <td className="p-2 text-right text-rose-700 border-r border-[#A2BCCF]">
                        -{formatCLP(bankTotals.withdrawals)}
                      </td>
                      <td className="p-2 text-right font-black text-[#0B3C5D]">
                        {formatCLP(bankTotals.endBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/*================= TAB 3: AUXILIAR DE PROVEEDORES =================*/}
          {activeTab === 'PROVEEDORES' && (
            <div className="space-y-6">
              {/* TWO SIDES: Master aggregate table list or Supplier Ledger Card */}
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Left Side: Summary of all active suppliers */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                        Resumen Cuentas por Pagar (AP)
                      </h3>
                      {onAddSupplier && (
                        <button
                          onClick={() => setIsSupplierFormOpen(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                          title="Crear Nuevo Proveedor en Libro de Direcciones (F0101) y Maestro de Proveedores (F0401)"
                        >
                          <Plus size={12} /> + Agregar Nuevo Proveedor (P01012)
                        </button>
                      )}
                    </div>
                    <input 
                      type="text"
                      value={searchProvs}
                      onChange={(e) => setSearchProvs(e.target.value)}
                      placeholder="Filtrar proveedor..."
                      className="bg-slate-50 border border-slate-200 text-[10.5px] px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* SLIDEBAR STATUS BAR */}
                  <div className="bg-[#DCE7F2] border border-[#7FA6C7] border-b-0 px-3 py-1.5 flex items-center justify-between text-[10.5px] font-sans text-[#0B3C5D] rounded-t-md select-none">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-[#0B3C5D] font-black text-xs">↕↔ SLIDEBAR VERTICAL & HORIZONTAL (AP):</span>
                      <span className="text-slate-700">Desplace la barra vertical u horizontal para explorar los {filteredSupplierLedger.length} proveedores con ancho completo</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-[#B0C4DE] font-semibold">
                      {filteredSupplierLedger.length} Proveedores
                    </span>
                  </div>

                  <div className="overflow-x-auto overflow-y-auto max-h-[55vh] min-h-[300px] border border-[#7FA6C7] rounded-b-md shadow-xs bg-white jde-scrollbar [&::-webkit-scrollbar]:w-3.5 [&::-webkit-scrollbar]:h-3.5 [&::-webkit-scrollbar-track]:bg-[#E2ECF5] [&::-webkit-scrollbar-thumb]:bg-[#0B3C5D] [&::-webkit-scrollbar-thumb]:rounded-sm hover:[&::-webkit-scrollbar-thumb]:bg-blue-800">
                    <table className="w-full min-w-[1200px] text-left border-collapse font-sans text-[11px] bg-white relative" style={{ border: '1px solid #7FA6C7' }}>
                      <thead className="sticky top-0 z-20 shadow-xs bg-[#FAFBFD]">
                        <tr className="bg-[#FAFBFD] text-[#1A3E5C] text-[10px] font-bold uppercase tracking-wider border-b-2 border-[#7FA6C7]">
                          <th className="w-9 p-1.5 text-center border-r border-[#A2BCCF] font-bold text-[9px] uppercase tracking-wider" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }} title="Selector de Fila ERP / Menú Contextual">#</th>
                          <th className="p-1.5 border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Proveedor / Prestador de Servs</th>
                          <th className="p-1.5 border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>RUT</th>
                          <th className="p-1.5 text-right border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Facturado (Cargo)</th>
                          <th className="p-1.5 text-right border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Pagado (Abono)</th>
                          <th className="p-1.5 text-right border-r border-[#A2BCCF] font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Saldo AP</th>
                          <th className="p-1.5 text-center font-bold" style={{ background: 'linear-gradient(to bottom, #F0F5FA 0%, #D8E4F1 100%)' }}>Acción</th>
                        </tr>

                        {/* ERP QBE (Query By Example) interactive row */}
                        <tr className="bg-[#E2ECF5] border-b border-[#7FA6C7] sticky top-[28px] z-20 shadow-2xs">
                          <th className="w-9 p-1 border-r border-[#A2BCCF] bg-[#DCE7F2] text-center text-[9px] text-[#0B3C5D] font-mono font-bold">
                            QBE
                          </th>
                          <th className="p-1 border-r border-[#A2BCCF]">
                            <input
                              type="text"
                              value={qbeProvsNombre}
                              onChange={(e) => setQbeProvsNombre(e.target.value)}
                              placeholder="QBE..."
                              className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none"
                            />
                          </th>
                          <th className="p-1 border-r border-[#A2BCCF]">
                            <input
                              type="text"
                              value={qbeProvsRut}
                              onChange={(e) => setQbeProvsRut(e.target.value)}
                              placeholder="QBE..."
                              className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none"
                            />
                          </th>
                          <th className="p-1 border-r border-[#A2BCCF]">
                            <input
                              type="text"
                              value={qbeProvsFacturado}
                              onChange={(e) => setQbeProvsFacturado(e.target.value)}
                              placeholder="QBE..."
                              className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none text-right"
                            />
                          </th>
                          <th className="p-1 border-r border-[#A2BCCF]">
                            <input
                              type="text"
                              value={qbeProvsPagado}
                              onChange={(e) => setQbeProvsPagado(e.target.value)}
                              placeholder="QBE..."
                              className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none text-right"
                            />
                          </th>
                          <th className="p-1 border-r border-[#A2BCCF]">
                            <input
                              type="text"
                              value={qbeProvsSaldo}
                              onChange={(e) => setQbeProvsSaldo(e.target.value)}
                              placeholder="QBE..."
                              className="w-full bg-[#FCFDFE] focus:bg-[#FFFDE8] text-[#1A3E5C] text-[10px] font-mono px-1 py-0.5 border border-[#B1C2D1] rounded-xs focus:outline-none text-right"
                            />
                          </th>
                          <th className="p-1 bg-[#F0F5FA]">
                            {/* No QBE for button */}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D2DFEC] text-[#2D3E50]">
                        {filteredSupplierLedger.map((row, idx) => {
                          const isSelected = selectedSupplierId === row.id;
                          const isGridSelected = selectedGridRow?.id === row.id;
                          return (
                            <tr 
                              key={row.id} 
                              onContextMenu={(e) => handleRowContextMenu(e, row, 'PROVEEDORES')}
                              className={`cursor-pointer transition-all odd:bg-white even:bg-[#F4F8FC] select-none ${
                                isSelected 
                                  ? 'bg-purple-100! text-purple-950 font-black ring-1 ring-purple-400' 
                                  : isGridSelected
                                    ? 'bg-[#D1E6F9]! text-[#0A2540] font-semibold'
                                    : 'hover:bg-[#FFFCDD]!'
                              }`}
                              onClick={() => setSelectedSupplierId(row.id)}
                              title="Clic para seleccionar / Clic derecho o [#] para Menú Contextual ERP"
                            >
                              {/* ERP Row Selector Cell */}
                              <td 
                                className={`w-9 p-1 text-center border-r border-[#E3ECF3] font-mono text-[10px] cursor-pointer transition-colors select-none ${
                                  isGridSelected || isSelected
                                    ? 'bg-[#0B3C5D] text-white font-bold'
                                    : 'bg-[#F0F5FA] text-[#1A3E5C] font-semibold hover:bg-amber-100 hover:text-amber-900'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSupplierId(row.id);
                                  handleRowContextMenu(e, row, 'PROVEEDORES');
                                }}
                                title="Clic para abrir Menú Contextual AssetFlow Enterprise (F4 / Clic Derecho)"
                              >
                                <div className="flex items-center justify-center">
                                  {isGridSelected || isSelected ? (
                                    <span className="text-[10px] font-black text-amber-300 animate-pulse">▶</span>
                                  ) : (
                                    <span>{idx + 1}</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-1.5 font-bold border-r border-[#E3ECF3]">{row.supplierName}</td>
                              <td className="p-1.5 font-mono text-slate-600 border-r border-[#E3ECF3]">{row.taxId}</td>
                              <td className="p-1.5 text-right font-mono text-rose-700 border-r border-[#E3ECF3]">{formatCLP(row.purchases)}</td>
                              <td className="p-1.5 text-right font-mono text-[#059669] border-r border-[#E3ECF3]">{formatCLP(row.payments)}</td>
                              <td className="p-1.5 text-right font-mono font-bold text-slate-900 border-r border-[#E3ECF3]">{formatCLP(row.pendingBalance)}</td>
                              <td className="p-1.5 text-center whitespace-nowrap">
                                <button 
                                  className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'bg-purple-700 text-white border-purple-800 shadow-xs' 
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  Ver Ficha
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredSupplierLedger.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400 font-bold uppercase text-[9px]">
                              Sin registros de proveedores que coincidan con los filtros QBE.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {/* STICKY FOOTER TOTALS */}
                      <tfoot className="sticky bottom-0 z-20 bg-[#F0F5FA] border-t-2 border-[#7FA6C7] font-mono font-bold text-[10.5px] text-[#0A2540] shadow-md">
                        <tr>
                          <td colSpan={3} className="p-2 text-right uppercase tracking-wider font-sans font-bold text-[#0B3C5D]">
                            Totales Cuentas por Pagar:
                          </td>
                          <td className="p-2 text-right text-rose-700 border-r border-[#A2BCCF]">
                            {formatCLP(supplierTotals.purchases)}
                          </td>
                          <td className="p-2 text-right text-emerald-700 border-r border-[#A2BCCF]">
                            {formatCLP(supplierTotals.payments)}
                          </td>
                          <td className="p-2 text-right font-black text-purple-700 border-r border-[#A2BCCF]">
                            {formatCLP(supplierTotals.pending)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Right Side: Ledger Card view of selected supplier */}
                <div className="w-full lg:w-[45%] bg-slate-50/60 border border-slate-200 p-5 rounded-[24px] space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[9px] font-black text-purple-700 uppercase tracking-widest block">
                        Ficha Corriente Detallada
                      </span>
                      <h4 className="text-xs font-black text-slate-800 uppercase leading-none mt-1">
                        {selectedSupplierId === 'ALL' 
                          ? 'SELECCIONE UN PROVEEDOR' 
                          : compiledSupplierLedger.find(s => s.id === selectedSupplierId)?.supplierName || 'Proveedor'}
                      </h4>
                    </div>

                    {selectedSupplierId !== 'ALL' && (
                      <button 
                        onClick={() => setSelectedSupplierId('ALL')}
                        className="text-[9.5px] font-black text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded-lg"
                      >
                        Limpiar Selección
                      </button>
                    )}
                  </div>

                  {selectedSupplierId === 'ALL' ? (
                    <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                      <Users size={28} className="text-slate-300 opacity-80" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">
                        Haga clic en un proveedor para analizar su cartola o ficha de cuenta individual.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* KPI highlights for Supplier */}
                      {(() => {
                        const s = compiledSupplierLedger.find(x => x.id === selectedSupplierId);
                        if (!s) return null;
                        return (
                          <div className="grid grid-cols-3 gap-2 p-3 bg-white border border-slate-200/60 rounded-xl font-mono text-[10px]">
                            <div className="text-center">
                              <span className="text-slate-400 block pb-0.5">Total Cargo:</span>
                              <strong className="text-slate-800 font-bold">{formatCLP(s.purchases)}</strong>
                            </div>
                            <div className="text-center border-l border-slate-100">
                              <span className="text-slate-400 block pb-0.5">Total Abono:</span>
                              <strong className="text-slate-800 font-bold">{formatCLP(s.payments)}</strong>
                            </div>
                            <div className="text-center border-l border-slate-100">
                              <span className="text-slate-400 block pb-0.5">Saldo AP:</span>
                              <strong className="text-purple-700 font-extrabold">{formatCLP(s.pendingBalance)}</strong>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Itemized ledger Rows */}
                      <div className="overflow-y-auto max-h-[380px] border border-slate-200/50 rounded-xl bg-white jde-scrollbar [&::-webkit-scrollbar]:w-3.5 [&::-webkit-scrollbar]:h-3.5 [&::-webkit-scrollbar-track]:bg-[#E2ECF5] [&::-webkit-scrollbar-thumb]:bg-[#0B3C5D] [&::-webkit-scrollbar-thumb]:rounded-sm hover:[&::-webkit-scrollbar-thumb]:bg-blue-800">
                        <table className="w-full text-left border-collapse text-[10.5px]">
                          <thead className="sticky top-0 z-10 shadow-xs bg-slate-50">
                            <tr className="bg-slate-50 text-slate-500 text-[8.5px] font-black uppercase tracking-wider border-b border-slate-200">
                              <th className="w-7 p-2 text-center border-r border-slate-200 font-mono">#</th>
                              <th className="p-2.5 text-center">Fecha</th>
                              <th className="p-2.5">Documento</th>
                              <th className="p-2.5 text-right">Compra</th>
                              <th className="p-2.5 text-right">Pago</th>
                              <th className="p-2.5 text-right">Saldo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-600 font-mono">
                            {selectedSupplierCardData.map((row, idx) => (
                              <tr 
                                key={idx} 
                                onContextMenu={(e) => handleRowContextMenu(e, row, 'PROV_ITEM')}
                                className="hover:bg-slate-50/50 cursor-context-menu select-none"
                                title="Clic derecho o [#] para Menú Contextual ERP sobre este movimiento"
                              >
                                <td 
                                  className="w-7 p-1 text-center border-r border-slate-200 font-mono text-[9px] cursor-pointer bg-slate-50 text-slate-600 hover:bg-amber-100 hover:text-amber-900 select-none"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowContextMenu(e, row, 'PROV_ITEM');
                                  }}
                                  title="Clic para Menú Contextual ERP"
                                >
                                  <span>{idx + 1}</span>
                                </td>
                                <td className="p-2.5 text-center text-slate-500 whitespace-nowrap">{row.date}</td>
                                <td className="p-2.5">
                                  <span className="block text-slate-800 font-bold truncate max-w-[110px]" title={row.description}>
                                    {row.description}
                                  </span>
                                  <span className="text-[8px] text-slate-400 font-mono">
                                    {row.docType} Nº {row.docNum}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right text-rose-600">
                                  {row.charge > 0 ? formatCLP(row.charge) : '-'}
                                </td>
                                <td className="p-2.5 text-right text-emerald-600">
                                  {row.payment > 0 ? formatCLP(row.payment) : '-'}
                                </td>
                                <td className="p-2.5 text-right text-slate-900 font-black">
                                  {formatCLP(row.balance)}
                                </td>
                              </tr>
                            ))}

                            {selectedSupplierCardData.length === 0 && (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400 font-bold uppercase text-[9px]">
                                  Sin transacciones particulares en el mes.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>
          )}

          {/* TAB 4: INTEGRIDAD SUBLIBROS VS. LIBRO MAYOR (R097011 / R04701 / R03B701) & MOTOR AAIs (P0012 / F0012) */}
          {activeTab === 'INTEGRIDAD_AAI' && (() => {
            const ubeSuite = runJDEIntegrityAuditSuite({
              transactions,
              workOrders,
              properties,
              suppliers,
              leaseContracts,
              aaiTable: DEFAULT_JDE_AAI_TABLE_F0012,
            });

            const handleSyncAuxReport = (rep: JDEIntegrityReportResult) => {
              if (rep.ubeCode === 'R097011') {
                transactions
                  .filter(t => t.status !== 'COMPLETADA' && t.status !== 'ANULADA')
                  .forEach(t => onUpdateTransaction(t.id, { status: 'COMPLETADA' }));
                return;
              }
              const batchId = `B-AAI-${rep.ubeCode}-${Date.now().toString().slice(-4)}`;
              rep.discrepancies.forEach((disc, idx) => {
                const isIncome = rep.ubeCode === 'R03B701';
                onAddTransaction({
                  id: crypto.randomUUID(),
                  date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-28`,
                  invoiceDate: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-28`,
                  documentNumber: disc.associatedInvoice && disc.associatedInvoice !== 'PENDIENTE DTE'
                    ? disc.associatedInvoice
                    : `${disc.suggestedDocType}-${Date.now().toString().slice(-5)}-${idx + 1}`,
                  documentType: disc.suggestedDocType,
                  description: `[AAI ${disc.aaiCode} • ${rep.ubeCode}] ${disc.description}`.toUpperCase(),
                  amount: Math.abs(disc.variance),
                  type: isIncome ? 'INCOME' : 'EXPENSE',
                  category: disc.category || (isIncome ? 'ARRIENDOS REAL ESTATE' : 'AJUSTE INTEGRIDAD ERP'),
                  accountCode: disc.targetAccountCode,
                  workOrderId: (rep.ubeCode === 'R04701' || rep.ubeCode === 'R43500') ? disc.id : undefined,
                  user: currentUser,
                  timestamp: Date.now() + idx,
                  status: 'COMPLETADA',
                  batchNumber: batchId,
                  programId: rep.ubeCode,
                  insuranceCompany: 'GENERALES',
                  lockedBy: null,
                  lockedAt: null,
                });
              });
            };

            return (
              <div className="p-4 space-y-5 bg-[#FAFBFD]">
                <div className="bg-[#0B3C5D] text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-black uppercase bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-2 py-0.5 rounded">
                      ESTÁNDAR OFICIAL ESTÁNDAR CONTABLE CORPORATIVO • R097011 / R04701 / R03B701 / F0012
                    </span>
                    <h3 className="text-sm font-black uppercase mt-1">
                      Cuadratura Automática de Integridad (Auxiliares F03B11 / F0411 / F1202 / F4801 vs. Libro Mayor F0911 / F0902)
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Audita en vivo las diferencias entre los sublibros auxiliares y el Mayor General, utilizando las Instrucciones de Contabilización Automática (AAIs - P0012 / F0012).
                    </p>
                  </div>
                  {ubeSuite.some(u => u.status !== 'CUADRADO_OK') && (
                    <button
                      type="button"
                      onClick={() => ubeSuite.forEach(u => { if (u.status !== 'CUADRADO_OK') handleSyncAuxReport(u); })}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-[11px] font-black uppercase cursor-pointer shadow-xs"
                    >
                      Sincronizar Todos los Sublibros vía AAI (F0012)
                    </button>
                  )}
                </div>

                {/* UBE INTEGRITY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {ubeSuite.map(rep => {
                    const isOk = rep.status === 'CUADRADO_OK';
                    return (
                      <div
                        key={rep.ubeCode}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                          isOk ? 'bg-emerald-50/40 border-emerald-200' : 'bg-amber-50/50 border-amber-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-[#0B3C5D] text-white font-mono text-[10px] font-black">
                              UBE {rep.ubeCode}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {isOk ? 'CUADRADO ($0)' : `VARIACIÓN: ${formatCLP(rep.variance)}`}
                            </span>
                          </div>
                          <h4 className="text-xs font-black uppercase text-slate-900 mt-2">{rep.ubeTitle}</h4>
                          <p className="text-[10px] font-mono text-slate-500">{rep.normativeManualRef}</p>
                          <div className="mt-2 bg-white p-2 rounded border border-slate-200 font-mono text-[10.5px] space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Saldo Auxiliar:</span>
                              <span className="font-bold text-slate-800">{formatCLP(rep.subledgerTotal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Saldo Mayor F0902:</span>
                              <span className="font-bold text-indigo-700">{formatCLP(rep.glPostedTotal)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-1">
                              <span className="text-slate-500">AAI Puente (F0012):</span>
                              <span className="font-black text-[#0B3C5D]">{rep.aaiUsed}</span>
                            </div>
                          </div>
                          <p className="text-[10.5px] text-slate-600 mt-2">{rep.auditNarrative}</p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-slate-400">
                            SHA-256: {rep.verificationHash.slice(0, 14)}...
                          </span>
                          {!isOk && (
                            <button
                              type="button"
                              onClick={() => handleSyncAuxReport(rep)}
                              className="px-2.5 py-1 bg-[#0B3C5D] hover:bg-slate-800 text-white rounded text-[10px] font-black uppercase cursor-pointer"
                            >
                              Cuadrar Sublibro ({rep.ubeCode})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AAI TABLE F0012 SUMMARY */}
                <div className="border border-[#91A6BA] rounded-xl overflow-hidden bg-white">
                  <div className="bg-[#1A3E5C] text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-black uppercase">
                      P0012 • Tabla Maestra de Instrucciones de Contabilización Automática (F0012 AAIs)
                    </span>
                    <span className="text-[10px] font-mono text-amber-300">
                      Vínculo Automático Sublibros (03B / 04 / 12 / 15 / 48) ➔ Mayor General (09)
                    </span>
                  </div>
                  <div className="overflow-x-auto jde-scrollbar">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase border-b border-slate-300">
                        <tr>
                          <th className="p-2.5">Código AAI</th>
                          <th className="p-2.5">Sistema Origen</th>
                          <th className="p-2.5 text-center">Doc</th>
                          <th className="p-2.5">Unidad Negocio (MCU)</th>
                          <th className="p-2.5">Cuenta Mayor Destino (OBJ)</th>
                          <th className="p-2.5 text-center">Sublibro Exigido</th>
                          <th className="p-2.5">Regla de Integración Normativa Contable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono">
                        {DEFAULT_JDE_AAI_TABLE_F0012.map(aai => (
                          <tr key={aai.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-black text-[#0B3C5D]">{aai.itemNumber}</td>
                            <td className="p-2.5 font-sans font-bold text-slate-800">
                              [{aai.systemCode}] {aai.systemName}
                            </td>
                            <td className="p-2.5 text-center font-bold text-indigo-700">{aai.docType}</td>
                            <td className="p-2.5 text-slate-600">{aai.businessUnit}</td>
                            <td className="p-2.5 font-bold text-emerald-800">
                              {aai.objectAccount} — {aai.AccountName}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold">
                                SBLT: {aai.mandatorySubledger}
                              </span>
                            </td>
                            <td className="p-2.5 font-sans text-slate-600 text-[10.5px]">{aai.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

      </div>

      {/* AssetFlow Enterprise Floating Grid Context Menu (Right Click & Row Selector Click) */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode={gridContextMenu.type === 'PROVEEDORES' ? 'P0411' : 'P092102'}
          programTitle={`Consulta Mayor y Balance [W092102A] • ${
            gridContextMenu.type === 'MAYOR' 
              ? 'Diario General F0911' 
              : gridContextMenu.type === 'BANCOS' 
                ? 'Cartola Bancaria F0911' 
                : 'Cuentas por Pagar Proveedores F0411'
          }`}
          collectionName="transactions"
          recordKey={
            gridContextMenu.row.taxId 
              ? `${gridContextMenu.row.supplierName || 'PROV'} [${gridContextMenu.row.taxId}]`
              : (gridContextMenu.transaction?.documentNumber ? `DOC #${gridContextMenu.transaction.documentNumber}` : `MOV #${gridContextMenu.row.id || 'ERP'}`)
          }
          recordData={gridContextMenu.transaction || gridContextMenu.row}
          currentStatus={gridContextMenu.transaction?.status || 'COMPLETADA'}
          statusOptions={[
            { label: 'COMPLETADA (Conciliado)', value: 'COMPLETADA', color: 'bg-emerald-600' },
            { label: 'PENDIENTE (Por Conciliar)', value: 'PENDIENTE', color: 'bg-amber-600' },
            { label: 'ANULADA (Reversa ERP)', value: 'ANULADA', color: 'bg-red-600' }
          ]}
          onUpdateStatus={async (newStatus) => {
            if (gridContextMenu.transaction?.id && onUpdateTransaction) {
              onUpdateTransaction(gridContextMenu.transaction.id, { status: newStatus as any });
            }
            setGridContextMenu(null);
          }}
          onClose={() => setGridContextMenu(null)}
          onSelectRow={() => {
            setSelectedGridRow(gridContextMenu.row);
            if (gridContextMenu.type === 'PROVEEDORES' && gridContextMenu.row.id) {
              setSelectedSupplierId(gridContextMenu.row.id);
            }
            setGridContextMenu(null);
          }}
          onViewDetails={() => {
            if (gridContextMenu.transaction) {
              setSelectedTxForJDE(gridContextMenu.transaction);
              setIsJDEMenuOpen(true);
            }
            setGridContextMenu(null);
          }}
          onTraceability={() => {
            if (gridContextMenu.transaction) {
              setSelectedTxForJDE(gridContextMenu.transaction);
              setIsJDEMenuOpen(true);
            }
            setGridContextMenu(null);
          }}
          onExportExcel={() => {
            handleExportAllToExcel('xlsx');
            setGridContextMenu(null);
          }}
          onPrint={() => {
            if (gridContextMenu.transaction) {
              const linkedOT = workOrders.find(ot => ot.id === gridContextMenu.transaction?.workOrderId);
              downloadJDETransactionVoucher({
                transaction: gridContextMenu.transaction,
                workOrder: linkedOT,
                currentUser
              });
            } else {
              window.print();
            }
            setGridContextMenu(null);
          }}
          onClearQBE={() => {
            handleClearAllFilters();
            setGridContextMenu(null);
          }}
          onRefresh={() => {
            setGridContextMenu(null);
          }}
          onCopy={() => {
            const text = gridContextMenu.row.taxId || gridContextMenu.transaction?.documentNumber || gridContextMenu.row.ref || gridContextMenu.row.id || '';
            navigator.clipboard?.writeText(text);
            setGridContextMenu(null);
          }}
          items={[
            {
              id: 'inspect_master',
              label: 'Inspeccionar Atributos F980011D (Master)',
              icon: <Database size={13} className="text-[#0B3C5D]" />,
              shortcut: 'F4',
              onClick: () => {
                if (gridContextMenu.transaction) {
                  setSelectedTxForJDE(gridContextMenu.transaction);
                  setIsJDEMenuOpen(true);
                }
              }
            },
            {
              id: 'traceability_oneview',
              label: 'Trazabilidad Cruzada One View (ERP)',
              icon: <Layers size={13} className="text-purple-700" />,
              shortcut: 'F8',
              onClick: () => {
                if (gridContextMenu.transaction) {
                  setSelectedTxForJDE(gridContextMenu.transaction);
                  setIsJDEMenuOpen(true);
                }
              }
            },
            {
              id: 'emit_pdf',
              label: 'Emitir Comprobante Contable PDF (ERP)',
              icon: <Download size={13} className="text-indigo-700" />,
              shortcut: 'Ctrl+P',
              onClick: () => {
                if (gridContextMenu.transaction) {
                  const linkedOT = workOrders.find(ot => ot.id === gridContextMenu.transaction?.workOrderId);
                  downloadJDETransactionVoucher({
                    transaction: gridContextMenu.transaction,
                    workOrder: linkedOT,
                    currentUser
                  });
                }
              }
            },
            {
              id: 'export_excel',
              label: 'Exportar Grilla a Excel (.xlsx)',
              icon: <FileSpreadsheet size={13} className="text-emerald-700" />,
              shortcut: 'Ctrl+E',
              onClick: () => {
                handleExportAllToExcel('xlsx');
              }
            },
            {
              id: 'copy_folio',
              label: 'Copiar Folio / N° Documento',
              icon: <Copy size={13} className="text-slate-600" />,
              shortcut: 'Ctrl+C',
              onClick: () => {
                const text = gridContextMenu.row.taxId || gridContextMenu.transaction?.documentNumber || gridContextMenu.row.ref || gridContextMenu.row.id || '';
                navigator.clipboard?.writeText(text);
              }
            }
          ]}
          rowExits={[
            ...(gridContextMenu.type === 'PROVEEDORES' ? [
              {
                id: 'exit_ficha_prov',
                label: 'Ver Ficha de Proveedor / Cartola Detallada',
                icon: <Users size={13} className="text-purple-700" />,
                onClick: () => {
                  if (gridContextMenu.row.id) {
                    setSelectedSupplierId(gridContextMenu.row.id);
                  }
                }
              },
              {
                id: 'exit_rut_prov',
                label: 'Copiar RUT del Proveedor',
                icon: <CheckSquare size={13} className="text-slate-600" />,
                onClick: () => {
                  if (gridContextMenu.row.taxId) {
                    navigator.clipboard?.writeText(gridContextMenu.row.taxId);
                  }
                }
              }
            ] : []),
            {
              id: 'exit_cuadratura',
              label: 'Verificar Cuadratura Débitos = Créditos (P092102)',
              icon: <CheckCircle2 size={13} className="text-emerald-700" />,
              onClick: () => {
                alert(`✓ Cuadratura Mayor y Balance [P092102]: Total Débitos ${formatCLP(mayorTotals.debit)} = Créditos ${formatCLP(mayorTotals.credit)}. Saldo Neto: ${formatCLP(mayorTotals.net)}.`);
              }
            }
          ]}
        />
      )}

      {isJDEMenuOpen && selectedTxForJDE && (
        <JDEContextualMenu 
          isOpen={isJDEMenuOpen}
          onClose={() => { setIsJDEMenuOpen(false); setSelectedTxForJDE(null); }}
          contextType="TRANSACTION"
          selectedTransaction={selectedTxForJDE}
          workOrders={workOrders}
          transactions={transactions}
          properties={properties}
          suppliers={suppliers}
          currentUser={currentUser}
          onUpdateTransaction={onUpdateTransaction}
          onAddTransaction={onAddTransaction}
        />
      )}

      {/* DRAGGABLE FLOATING BUBBLE (BURBUJA FLOTANTE REUBICABLE CON EL RATÓN) */}
      <div 
        style={{
          position: 'fixed',
          bottom: `${bubblePos.y}px`,
          right: `${bubblePos.x}px`,
          zIndex: 60
        }}
        className={`flex flex-col items-center bg-[#0B3C5D]/95 text-white shadow-2xl border-2 border-amber-300/60 backdrop-blur-md select-none transition-shadow ${
          isDraggingBubble ? 'cursor-grabbing shadow-amber-400/40 ring-4 ring-amber-400/50 scale-105' : 'shadow-black/40'
        } ${isBubbleExpanded ? 'p-2 rounded-2xl w-14' : 'p-1.5 rounded-full w-12 h-12 justify-center'}`}
        title="Burbuja Flotante de Navegación ERP (Arrastre con el cursor para reubicar)"
      >
        {/* DRAG HANDLE HEADER */}
        <div 
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingBubble(true);
            setDragStart({
              startX: e.clientX,
              startY: e.clientY,
              initialBubbleX: bubblePos.x,
              initialBubbleY: bubblePos.y
            });
          }}
          className="w-full flex items-center justify-center p-1 cursor-grab active:cursor-grabbing hover:bg-white/20 rounded-md transition-colors"
          title="Mantenga presionado con el ratón para arrastrar y reubicar la burbuja en cualquier punto"
        >
          <Move size={14} className="text-amber-300 animate-pulse" />
        </div>

        {isBubbleExpanded ? (
          <div className="flex flex-col items-center gap-1.5 mt-1 w-full">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('auxiliary-ledgers-main-panel');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer no-jde-override"
              title="Slide Bar: Subir al Inicio del Módulo (Filtros)"
            >
              <ArrowUp size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('main-jde-data-grid');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-1.5 hover:bg-white/20 rounded-lg text-amber-300 transition-all cursor-pointer no-jde-override"
              title="Slide Bar: Centrar Grilla de Cuentas (F0911)"
            >
              <Layers size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                const mainEl = document.getElementById('main-content-scroll-container') || document.documentElement;
                if (mainEl) mainEl.scrollTo({ top: mainEl.scrollHeight, behavior: 'smooth' });
              }}
              className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer no-jde-override"
              title="Slide Bar: Bajar al final del módulo"
            >
              <ArrowDown size={15} />
            </button>
            
            <div className="w-6 h-[1px] bg-blue-300/40 my-0.5"></div>
            
            <button
              type="button"
              onClick={() => setIsCompactView(!isCompactView)}
              className="p-1.5 hover:bg-white/20 rounded-lg text-amber-200 transition-all cursor-pointer text-[9px] font-mono font-bold no-jde-override"
              title={isCompactView ? "Modo Completo" : "Modo Compacto"}
            >
              {isCompactView ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
            </button>

            <button
              type="button"
              onClick={() => setIsBubbleExpanded(false)}
              className="p-1 hover:bg-white/20 rounded-md text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Minimizar burbuja flotante"
            >
              <ChevronDown size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsBubbleExpanded(true)}
            className="p-1 hover:bg-white/20 rounded-full text-amber-300 transition-all cursor-pointer flex items-center justify-center"
            title="Expandir controles de navegación"
          >
            <ChevronUp size={14} />
          </button>
        )}
      </div>

      {/* SUPPLIER CREATION MODAL (P01012 / P04012) */}
      {isSupplierFormOpen && onAddSupplier && (
        <SupplierForm
          onClose={() => setIsSupplierFormOpen(false)}
          existingSuppliers={suppliers}
          onSubmit={(newSup) => {
            onAddSupplier(newSup);
            setIsSupplierFormOpen(false);
          }}
        />
      )}
    </div>
  );
};
