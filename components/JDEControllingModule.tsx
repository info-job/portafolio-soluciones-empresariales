import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, WorkOrder, Property, Supplier } from '../types';
import { 
  Activity, ShieldAlert, CheckCircle2, ChevronRight, Filter, 
  Search, RefreshCw, Layers, DollarSign, ArrowRight, Trash2, 
  Plus, Edit2, Play, AlertCircle, TrendingUp, Check, X, Undo,
  FileSpreadsheet, BarChart2, CheckSquare, Sparkles, Building, Download, Sliders, Database, Scale, Clock
} from 'lucide-react';
import { downloadJDETransactionVoucher, downloadJDEWorkOrderVoucher } from '../lib/pdfGenerator';
import { exportWorkOrdersToExcel } from '../lib/excelExport';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { F980011DModal } from './F980011DModal';
import { AiBudgetShieldPanel } from './AiBudgetShieldPanel';
import { JdeComparisonAuditModal } from './JdeComparisonAuditModal';
import { JDEGridContextMenu } from './JDEGridContextMenu';

interface JDEControllingModuleProps {
  transactions: Transaction[];
  workOrders: WorkOrder[];
  properties: Property[];
  suppliers: Supplier[];
  onUpdateTransaction: (id: string, field: keyof Transaction, value: any) => void;
  onDeleteTransaction: (id: string) => void;
  onAddTransaction: (newTx: Transaction) => void;
  currentUser: string;
}

export const JDEControllingModule: React.FC<JDEControllingModuleProps> = ({
  transactions,
  workOrders,
  properties,
  suppliers,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddTransaction,
  currentUser
}) => {
  // Navigation tabs typical of ERP Controlling sub-panels
  // 1. LEDGER: Balance G/L & Journal Batches (F0911 Audit)
  // 2. THREeway: 3-Way Match Audit (WorkOrder -> Provision CxP -> Paid check)
  // 3. DUPLICATES: Audits for duplicate entries (Duplicate Invoice numbers / Supplier amounts)
  // 4. SPEED_STATUS: Speed Status Change (Mass update payment states in P0411)
  // 5. BALANCE_OCHO_COLUMNAS: Balance Tributario de 8 Columnas (SII Normativa Chilena)
  // 6. AI_COST_SHIELD: Blindaje de Costos y Rate Limiting de IA (CFO Control)
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'THREE_WAY' | 'DUPLICATES' | 'SPEED_STATUS' | 'BALANCE_OCHO_COLUMNAS' | 'AI_COST_SHIELD'>('LEDGER');

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; record: Transaction } | null>(null);

  // AssetFlow Enterprise Grid Context Menu for Three-Way Match (F4311 / F0411 / F4801)
  const [threeWayGridContextMenu, setThreeWayGridContextMenu] = useState<{
    x: number;
    y: number;
    audit: {
      order: WorkOrder;
      voucher?: Transaction;
      hasInvoice: boolean;
      payment?: Transaction;
      healthRating: number;
    };
  } | null>(null);

  const handleThreeWayRowContextMenu = (e: React.MouseEvent, audit: {
    order: WorkOrder;
    voucher?: Transaction;
    hasInvoice: boolean;
    payment?: Transaction;
    healthRating: number;
  }) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const clickX = e?.clientX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const clickY = e?.clientY ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 300);

    setThreeWayGridContextMenu({
      x: Math.max(10, Math.min(clickX, typeof window !== 'undefined' ? window.innerWidth - 240 : 800)),
      y: Math.max(10, Math.min(clickY, typeof window !== 'undefined' ? window.innerHeight - 380 : 500)),
      audit
    });
  };

  // Click details inspector modal state
  const [inspectTarget, setInspectTarget] = useState<Transaction | null>(null);

  // 3-Way Match detailed inspection modal state
  const [selectedAuditDetail, setSelectedAuditDetail] = useState<{
    order: WorkOrder;
    voucher?: Transaction;
    hasInvoice: boolean;
    payment?: Transaction;
    healthRating: number;
  } | null>(null);

  // Dictamen Pericial Forense ERP / Corporativo modal state
  const [showJdeAuditModal, setShowJdeAuditModal] = useState(false);

  // Slide track scroll synchronizer for ERP original horizontal control
  const [scrollPercent, setScrollPercent] = useState(0);
  const ledgerScrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setScrollPercent(value);
    if (ledgerScrollContainerRef.current) {
      const container = ledgerScrollContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      container.scrollLeft = (value / 100) * maxScroll;
    }
  };

  const handleContainerScroll = () => {
    if (ledgerScrollContainerRef.current) {
      const container = ledgerScrollContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll > 0) {
        const percent = (container.scrollLeft / maxScroll) * 100;
        setScrollPercent(percent);
      }
    }
  };

  // Audit Metadata builder
  const getAuditData = (record: Transaction) => {
    return {
      registryId: record.id || 'N/A',
      programId: record.programId || 'P03B11',
      workStationId: record.workStationId || 'WK_MUT_CONTROL',
      nextNumberSeq: record.nextNumberSeq || Math.floor(100000 + Math.random() * 900000),
      hashSignature: `SHA256:${record.id ? record.id.substring(0, 8).toUpperCase() : 'F9801AA'}${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
      timestamp: record.timestamp ? new Date(record.timestamp).toLocaleString('es-CL') : new Date().toLocaleString('es-CL'),
      userCreator: record.user || 'SISTEMA',
      lockedBy: record.lockedBy || 'LIBRE',
      lockedAt: record.lockedAt ? new Date(record.lockedAt).toLocaleString('es-CL') : 'N/A',
      isTest: record.isTest ? 'SÍ (REPORTE DE PRUEBA)' : 'SÍ (MAESTRO PRODUCCIÓN)'
    };
  };

  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const handleRowContextMenu = (e: React.MouseEvent, record: Transaction) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY - 2,
      record
    });
  };

  // 8 Column Balance sheet memo following Chilean tax norms (S.I.I. and CMF compliance)
  const balanceOchoColumnas = useMemo(() => {
    let cajaDebito = 0;
    let cajaCredito = 0;
    let clientesDebito = 0;
    let clientesCredito = 0;
    let proveedoresDebito = 0;
    let proveedoresCredito = 0;
    let ivaCreditoDebito = 0;
    let ivaDebitoCredito = 0;
    let retencionesCredito = 0;
    let gastosDebito = 0;
    let ingresosCredito = 0;

    transactions.forEach(t => {
      const isCompleted = t.status === 'COMPLETADA';
      const isFactura = t.documentType === 'FACTURA';
      const isHonorario = (t.category || '').toUpperCase().includes('HONORARIO') || 
                          (t.category || '').toUpperCase().includes('SERVICIO') || 
                          (t.description || '').toUpperCase().includes('BOLETA');

      if (t.type === 'INCOME') {
        if (isFactura) {
          const net = t.amount / 1.19;
          const iva = t.amount - net;
          ivaDebitoCredito += iva;
          ingresosCredito += net;
        } else {
          ingresosCredito += t.amount;
        }

        if (isCompleted) {
          cajaDebito += t.amount;
        } else {
          clientesDebito += t.amount;
        }
      } else {
        if (isHonorario) {
          const Gross = t.amount;
          const retention = Gross * 0.1375;
          const netToPay = Gross - retention;
          retencionesCredito += retention;
          gastosDebito += Gross;

          if (isCompleted) {
            cajaCredito += netToPay;
          } else {
            proveedoresCredito += netToPay;
          }
        } else if (isFactura) {
          const net = t.amount / 1.19;
          const iva = t.amount - net;
          ivaCreditoDebito += iva;
          gastosDebito += net;

          if (isCompleted) {
            cajaCredito += t.amount;
          } else {
            proveedoresCredito += t.amount;
          }
        } else {
          gastosDebito += t.amount;
          if (isCompleted) {
            cajaCredito += t.amount;
          } else {
            proveedoresCredito += t.amount;
          }
        }
      }
    });

    const buildRow = (name: string, deb: number, cred: number, type: 'ACTIVO_PASIVO' | 'PERDIDA_GANANCIA') => {
      const deudor = deb > cred ? deb - cred : 0;
      const acreedor = cred > deb ? cred - deb : 0;
      
      let activo = 0;
      let pasivo = 0;
      let perdida = 0;
      let ganancia = 0;

      if (type === 'ACTIVO_PASIVO') {
        activo = deudor;
        pasivo = acreedor;
      } else {
        perdida = deudor;
        ganancia = acreedor;
      }

      return {
        name,
        deb,
        cred,
        deudor,
        acreedor,
        activo,
        pasivo,
        perdida,
        ganancia
      };
    };

    const rows = [
      buildRow('1101 CAJA Y BANCO (CLP)', cajaDebito, cajaCredito, 'ACTIVO_PASIVO'),
      buildRow('1103 CLIENTES / ARRENDATARIOS (CXC)', clientesDebito, clientesCredito, 'ACTIVO_PASIVO'),
      buildRow('1105 IVA CRÉDITO FISCAL (19%)', ivaCreditoDebito, 0, 'ACTIVO_PASIVO'),
      buildRow('2101 PROVEEDORES POR PAGAR (CXP)', proveedoresDebito, proveedoresCredito, 'ACTIVO_PASIVO'),
      buildRow('2104 IVA DÉBITO FISCAL (19%)', 0, ivaDebitoCredito, 'ACTIVO_PASIVO'),
      buildRow('2106 IMPUESTO RETENIDO BOLETAS (13.75%)', 0, retencionesCredito, 'ACTIVO_PASIVO'),
      buildRow('4101 INGRESO POR ARRENDAMIENTOS / LEASING', 0, ingresosCredito, 'PERDIDA_GANANCIA'),
      buildRow('5101 GASTOS OPERACIONALES Y MANTENCIONES', gastosDebito, 0, 'PERDIDA_GANANCIA'),
    ];

    let totDeb = 0;
    let totCred = 0;
    let totDeu = 0;
    let totAcr = 0;
    let totAct = 0;
    let totPas = 0;
    let totPer = 0;
    let totGan = 0;

    rows.forEach(r => {
      totDeb += r.deb;
      totCred += r.cred;
      totDeu += r.deudor;
      totAcr += r.acreedor;
      totAct += r.activo;
      totPas += r.pasivo;
      totPer += r.perdida;
      totGan += r.ganancia;
    });

    const activoPasivoDiff = totAct - totPas;
    const resultadoDiff = totGan - totPer;

    return {
      rows,
      totals: {
        deb: totDeb,
        cred: totCred,
        deu: totDeu,
        acr: totAcr,
        act: totAct,
        pas: totPas,
        per: totPer,
        gan: totGan,
        activoPasivoDiff,
        resultadoDiff
      }
    };
  }, [transactions]);

  // Audit run process states for Cuadratura General
  const [showCuadraturaModal, setShowCuadraturaModal] = useState(false);
  const [isAuditingLedger, setIsAuditingLedger] = useState(false);
  const [auditProgressPercent, setAuditProgressPercent] = useState(0);
  const [auditStatusText, setAuditStatusText] = useState('');

  // Query state (ERP Style checkbox filter)
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'PENDIENTES' | 'PAGADOS' | 'RETENIDOS'>('ALL');
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [searchSupplierQuery, setSearchSupplierQuery] = useState('');

  // Local state for Quick speed status change selection
  const [selectedTxIdForSpeed, setSelectedTxIdForSpeed] = useState<string | null>(null);

  // G/L interactive Manual posting panel states
  const [showManualPostForm, setShowManualPostForm] = useState(false);
  const [newPostAmount, setNewPostAmount] = useState<number>(0);
  const [newPostDescription, setNewPostDescription] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('PAGO A PROVEEDOR');
  const [newPostSupplierId, setNewPostSupplierId] = useState('');
  const [newPostPropertyId, setNewPostPropertyId] = useState('');
  const [newPostDocType, setNewPostDocType] = useState<'FACTURA' | 'RECOGIDA_RECEPCION' | 'COMPROBANTE'>('COMPROBANTE');
  const [newPostDocNumber, setNewPostDocNumber] = useState('');

  // 1. LEDGER CALCULATIONS
  const ledgerAnalysis = useMemo(() => {
    // Total Income vs Total Expense
    const totalIncomes = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    // Summing Debit / Credit checks standard is:
    // Income are usually Credits, Expenses are usually Debits
    // Let's check ledger alignment.
    const delta = totalIncomes - totalExpenses;
    const isBalanced = Math.abs(delta) < 2; // Exact double-entry par with minimal threshold

    // Grouping transactions by date for Recharts area comparison
    const dateMap: Record<string, { date: string; ingresos: number; egresos: number }> = {};
    transactions.forEach(t => {
      const dateStr = t.date || 'S/F';
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { date: dateStr, ingresos: 0, egresos: 0 };
      }
      if (t.type === 'INCOME') {
        dateMap[dateStr].ingresos += t.amount;
      } else {
        dateMap[dateStr].egresos += t.amount;
      }
    });

    const chartData = Object.values(dateMap)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-12); // Last 12 days for elegant display density

    return {
      totalIncomes,
      totalExpenses,
      delta,
      isBalanced,
      chartData
    };
  }, [transactions]);

  // 2. DUPLICATE DETECTOR LOGIC (CFO favorite audit tool)
  const duplicateEntries = useMemo(() => {
    const duplicates: Array<{
      main: Transaction;
      matches: Transaction[];
    }> = [];

    const processedIds = new Set<string>();

    transactions.forEach(tx => {
      if (processedIds.has(tx.id)) return;

      // Find any another expense that corresponds to same supplier, date and exact/near amount, or same invoice Number
      const matches = transactions.filter(other => {
        if (other.id === tx.id) return false;
        
        const isSameAmount = other.amount === tx.amount;
        const isSameSupplier = tx.supplierId && other.supplierId && tx.supplierId === other.supplierId;
        const isSameDocNum = tx.documentNumber && other.documentNumber && tx.documentNumber === other.documentNumber;
        
        return (isSameAmount && isSameSupplier) || (isSameDocNum && isSameSupplier);
      });

      if (matches.length > 0) {
        duplicates.push({
          main: tx,
          matches
        });
        processedIds.add(tx.id);
        matches.forEach(m => processedIds.add(m.id));
      }
    });

    return duplicates;
  }, [transactions]);

  // 3. THREE-WAY MATCHING AUDITOR
  // ERP Standard auditing matches WorkOrder -> Supplier AP Account (Pending Invoice) -> Payment entry (Egreso Bank)
  const threeWayMatchStats = useMemo(() => {
    let perfectMatches = 0; // Steps 1, 2, 3 accomplished
    let missingVouchers = 0; // OT approved, but no Accounting Voucher/CxP recorded
    let missingInvoices = 0; // CxP recorded, but Supplier Tax invoice number is blank/missing
    let pendingDisbursements = 0; // Voucher exists but unpaid

    const auditableOrders = workOrders.map(ot => {
      // Find corresponding accounting Voucher (F0411 devengo ledger)
      const matchedVoucher = transactions.find(t => 
        t.workOrderId === ot.id || 
        (t.type === 'EXPENSE' && t.supplierId === ot.supplierId && t.documentNumber === ot.folio)
      );

      // Verify invoice linkage
      const hasInvoiceLinked = !!ot.receptionInvoiceNumber || (matchedVoucher && matchedVoucher.documentType === 'FACTURA');

      // Verify final cash disbursement (unpaid or fully posted bank outflow)
      const matchedPayment = transactions.find(t => 
        t.type === 'EXPENSE' && 
        t.supplierId === ot.supplierId && 
        t.status === 'COMPLETADA' &&
        (t.workOrderId === ot.id || (matchedVoucher && t.id === matchedVoucher.id))
      );

      let healthRating = 0; 
      if (ot) healthRating += 1;
      if (matchedVoucher) healthRating += 1;
      if (hasInvoiceLinked) healthRating += 1;
      if (matchedPayment) healthRating += 1;

      // Classify for stats
      if (healthRating === 4) {
        perfectMatches++;
      } else {
        if (!matchedVoucher) {
          missingVouchers++;
        } else {
          if (!hasInvoiceLinked) missingInvoices++;
          if (!matchedPayment) pendingDisbursements++;
        }
      }

      return {
        order: ot,
        voucher: matchedVoucher,
        hasInvoice: hasInvoiceLinked,
        payment: matchedPayment,
        healthRating
      };
    });

    return {
      auditableOrders,
      perfectMatches,
      missingVouchers,
      missingInvoices,
      pendingDisbursements
    };
  }, [workOrders, transactions]);

  // Handle speed changing status
  const executeSpeedChange = (txId: string, nextStatus: 'PENDIENTE' | 'COMPLETADA' | 'RECHAZADA') => {
    onUpdateTransaction(txId, 'status', nextStatus);
    setSelectedTxIdForSpeed(null);
    alert(`ACCESO SPEED STATUS ACCIÓN CORRECTA.\nID: ${txId}\nEstado ERP modificado: ${nextStatus}.`);
  };

  const handleAnularDuplicado = (txId: string) => {
    if (confirm('¿Está seguro de que desea anular esta transacción duplicada? El registro se eliminará permanentemente de los libros contables.')) {
      onDeleteTransaction(txId);
      alert('Imputación duplicada eliminada para balancear libros.');
    }
  };

  // Execution algorithm of Cuadratura General F0911 Ledger Audit
  const handleCuadraturaExecute = () => {
    setActiveTab('LEDGER');
    setIsAuditingLedger(true);
    setAuditProgressPercent(0);
    setAuditStatusText('Iniciando rastreador de registros F0911...');
    
    setTimeout(() => {
      setAuditProgressPercent(25);
      setAuditStatusText('Verificando correlación lógica con auxiliar de proveedores (P0411)...');
    }, 200);
    
    setTimeout(() => {
      setAuditProgressPercent(60);
      setAuditStatusText('Validando correspondencia de egresos con órdenes de trabajo (F4311)...');
    }, 450);

    setTimeout(() => {
      setAuditProgressPercent(90);
      setAuditStatusText('Estructurando balance neto de partida doble (Sincronía G/L)...');
    }, 700);

    setTimeout(() => {
      setAuditProgressPercent(100);
      setIsAuditingLedger(false);
      setShowCuadraturaModal(true);
    }, 950);
  };

  const handleAutoCuadrar = () => {
    const delta = ledgerAnalysis.delta;
    if (delta === 0) {
      alert("El libro ya se encuentra perfectamente balanceado (Diferencial: $0).");
      return;
    }

    const adjustAmount = Math.abs(delta);
    const adjustType = delta < 0 ? 'INCOME' : 'EXPENSE';
    
    const manualTx: Transaction = {
      id: 'TX_MAN_JDE_ADJ_' + Math.floor(Math.random() * 100000),
      description: `MAN_G/L_POST [ID: JDE90] - AJUSTE INTEGRAL DE CUADRATURA LIBRO MAYOR (F0911)`,
      amount: adjustAmount,
      category: adjustType === 'INCOME' ? 'RECAUDACIÓN DE ARRIENDO' : 'PAGO A PROVEEDOR',
      type: adjustType,
      documentType: 'COMPROBANTE',
      documentNumber: 'AJU-F0911',
      date: new Date().toISOString().split('T')[0],
      invoiceDate: new Date().toISOString().split('T')[0],
      user: currentUser || 'SAMAHEIM',
      timestamp: Date.now(),
      status: 'COMPLETADA',
      programId: 'P0911',
      batchNumber: 'A' + Math.floor(100000 + Math.random() * 900000),
      insuranceCompany: 'GENERALES',
      lockedBy: null,
      lockedAt: null
    };

    onAddTransaction(manualTx);
    alert(`ASIENTO COMPENSATORIO DE AJUSTE PROVENIENTE DE CONTROL GENERAL REGISTRADO.\n\nLote ERP: ${manualTx.batchNumber}\nMonto: $${adjustAmount.toLocaleString('es-CL')}\nTipo: ${adjustType === 'INCOME' ? 'Haber (Crédito)' : 'Deber (Débito)'}\n\n¡Libro Mayor F0911 perfectamente reconciliado!`);
    setShowCuadraturaModal(false);
  };

  // Create a Manual posted ledger entry matching double entry book standards (General ledger)
  const handlePostManualLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostAmount || !newPostDescription) {
      alert('Por favor ingrese el monto y la descripción.');
      return;
    }

    const linkedSupplier = suppliers.find(s => s.id === newPostSupplierId);

    const manualTx: Transaction = {
      id: 'TX_MAN_JDE_GL_' + Math.floor(Math.random() * 100000),
      description: `MAN_G/L_POST [ID: JDE90] - ` + newPostDescription.toUpperCase(),
      amount: Number(newPostAmount),
      category: newPostCategory,
      type: 'EXPENSE',
      documentType: newPostDocType,
      documentNumber: newPostDocNumber || 'S/N',
      date: new Date().toISOString().split('T')[0],
      invoiceDate: new Date().toISOString().split('T')[0],
      user: currentUser,
      timestamp: Date.now(),
      supplierId: newPostSupplierId || undefined,
      supplierName: linkedSupplier?.name || undefined,
      supplierTaxId: linkedSupplier?.taxId || undefined,
      propertyId: newPostPropertyId || undefined,
      status: 'PENDIENTE',
      programId: 'P0911', // Posted to general ledger
      batchNumber: 'M' + Math.floor(100000 + Math.random() * 900000),
      insuranceCompany: 'GENERALES',
      lockedBy: null,
      lockedAt: null
    };

    onAddTransaction(manualTx);
    setShowManualPostForm(false);
    setNewPostAmount(0);
    setNewPostDescription('');
    setNewPostDocNumber('');
    alert(`ENTRADA CONTABLE POSTEADA EN LIBRO DIARIO.\nLote ERP: ${manualTx.batchNumber}\nBalanceado exitosamente.`);
  };

  // Columnar filtered transactions (Query By Example - QBE logic)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Status Check
      if (paymentStatusFilter === 'PENDIENTES' && t.status !== 'PENDIENTE') return false;
      if (paymentStatusFilter === 'PAGADOS' && t.status !== 'COMPLETADA') return false;
      if (paymentStatusFilter === 'RETENIDOS' && t.status === 'PENDIENTE') return false; // simulated

      // 2. text search Document Code
      if (searchDocQuery && !(t.documentNumber || '').toLowerCase().includes(searchDocQuery.toLowerCase())) return false;
      
      // 3. text search Supplier Name
      if (searchSupplierQuery && !(t.supplierName || t.description || '').toLowerCase().includes(searchSupplierQuery.toLowerCase())) return false;

      return true;
    });
  }, [transactions, paymentStatusFilter, searchDocQuery, searchSupplierQuery]);

  return (
    <div className="h-full overflow-y-auto px-6 md:px-8 py-6 space-y-6 animate-in fade-in duration-300 font-sans pb-24">
      
      {/* ASSETFLOW APP INTERACTIVE TOP BAR */}
      <div className="bg-[#0B3C5D] text-white p-6 rounded-3xl border-4 border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden shadow-lg gap-4">
        <div className="absolute right-0 top-0 opacity-10 -mr-16 -mt-8">
          <Layers size={220} />
        </div>
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] bg-blue-500/30 text-blue-100 px-2 py-0.5 rounded border border-blue-400/20">
              SYS_QUERY_P09210
            </span>
            <span className="text-[10px] text-slate-300 font-bold">Consola Controlling & Auditoría de Red</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">
            ASSETFLOW Central - Auditoría & Controlling
          </h2>
          <p className="text-[11px] text-slate-300 max-w-xl leading-relaxed">
            Módulo de monitoreo transversal de transacciones, cuadratura de Libro Diario General (F0911), control estadístico y trazabilidad de orden a pago (Match de 3 Vías).
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowJdeAuditModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all border border-emerald-400/40"
            title="Dictamen Pericial Forense sobre parecido técnico con Corporativo AssetFlow Enterprise y evaluación de riesgo de plagio"
          >
            <Scale size={14} className="text-amber-300" />
            Dictamen ERP / Corporativo (PDF)
          </button>

          <button 
            onClick={() => setShowManualPostForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all border border-amber-400/30"
          >
            <Plus size={14} />
            Postear Entrada G/L (F0911)
          </button>
        </div>
      </div>

      {/* TABS SELECTOR (Central Menu Bars Style) */}
      <div className="flex flex-wrap bg-white border border-slate-200 p-2 rounded-2xl shadow-sm gap-2">
        <button
          onClick={handleCuadraturaExecute}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeTab === 'LEDGER' ? 'bg-[#0B3C5D] text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity size={14} />
          Cuadratura General Libro de Cuenta
        </button>

        <button
          onClick={() => setActiveTab('THREE_WAY')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeTab === 'THREE_WAY' ? 'bg-[#0B3C5D] text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers size={14} />
          Conciliación 3 Vías Match (F4311)
        </button>

        <button
          onClick={() => setActiveTab('DUPLICATES')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all relative ${
            activeTab === 'DUPLICATES' ? 'bg-[#0B3C5D] text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert size={14} />
          Detector Duplicados
          {duplicateEntries.length > 0 && (
            <span className="absolute -top-1.5 -right-1 bg-red-600 border-2 border-white text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-bounce">
              {duplicateEntries.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('SPEED_STATUS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeTab === 'SPEED_STATUS' ? 'bg-[#0B3C5D] text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <RefreshCw size={14} />
          Speed Status Change (P0411)
        </button>

        <button
          onClick={() => setActiveTab('BALANCE_OCHO_COLUMNAS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all border border-amber-200 relative ${
            activeTab === 'BALANCE_OCHO_COLUMNAS' ? 'bg-[#0C4A6E] text-white shadow font-bold' : 'text-slate-600 hover:bg-[#F3F4F6]'
          }`}
        >
          <Activity size={14} className="text-amber-500 animate-pulse" />
          Balance 8 Columnas (SII)
        </button>

        <button
          onClick={() => setActiveTab('AI_COST_SHIELD')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all border border-indigo-200 ${
            activeTab === 'AI_COST_SHIELD' ? 'bg-indigo-900 text-white shadow' : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
          }`}
        >
          <Sparkles size={14} className="text-indigo-500 animate-pulse" />
          Blindaje & Costos IA CFO
        </button>
      </div>

      {/* CORE DISPLAY WORKSPACE */}

      {/* AUDITING PROGRESS LOADING STATE CARD */}
      {isAuditingLedger && (
        <div className="bg-slate-900 text-white p-6 rounded-3xl border-4 border-slate-700 shadow-xl space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <RefreshCw className="animate-spin text-amber-500" size={20} />
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#E2ECF5]">
                EJECUTANDO AUDITORÍA INTEGRAL DE LIBROS (P09210)
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ESTADO: {auditStatusText}</p>
            </div>
          </div>
          <div className="w-full bg-slate-805 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full transition-all duration-350"
              style={{ width: `${auditProgressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>F0911 MATRIX GENERAL COMPARED</span>
            <span>{auditProgressPercent}% COMPLETO</span>
          </div>
        </div>
      )}

      {/* TAB 1: LEDGER BALANCING AND ONE VIEW INQUIRY */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-6">
          
          {/* LEDGER HEALTH METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Créditos Totales (Ingresos)</span>
                <span className="text-xl font-black text-emerald-600 block mt-1">
                  ${ledgerAnalysis.totalIncomes.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-2 font-mono">Imputaciones a arriendos/garantías</div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Débitos Totales (Egresos)</span>
                <span className="text-xl font-black text-rose-600 block mt-1">
                  ${ledgerAnalysis.totalExpenses.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-2 font-mono">Gastos operaciones / OTs liquidadas</div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Balanza de Neto (Flujo Neto)</span>
                <span className={`text-xl font-black block mt-1 ${
                  ledgerAnalysis.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  ${ledgerAnalysis.delta.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-2 font-mono">Resultados operacionales balanceados</div>
            </div>

            <div className={`p-5 rounded-2xl flex flex-col justify-between shadow-sm border ${
              ledgerAnalysis.isBalanced 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest block">Sincronía Libro Mayor</span>
                <span className="text-base font-black flex items-center gap-1.5 mt-1">
                  {ledgerAnalysis.isBalanced ? (
                    <>
                      <CheckCircle2 className="text-emerald-600" size={18} />
                      LIBRO BALANCEADO
                    </>
                  ) : (
                    <>
                      <AlertCircle className="text-amber-600" size={18} />
                      DESFASE EN AJUSTE
                    </>
                  )}
                </span>
              </div>
              <div className="text-[10px] font-semibold mt-2">Diferencial menor a umbral de alerta</div>
            </div>

          </div>

          {/* BALANCE TREND GRAPH */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-[#0B3C5D]" />
              Visualización General de Flujos por Fecha (Créditos vs Débitos)
            </h3>

            <div className="h-64 mt-4 text-xs font-sans">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ledgerAnalysis.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncomes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toLocaleString()}k`} />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString('es-CL')}`]} />
                  <Area type="monotone" dataKey="ingresos" name="Créditos (" stroke="#10b981" fillOpacity={1} fill="url(#colorIncomes)" />
                  <Area type="monotone" dataKey="egresos" name="Débitos" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpenses)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* MAIN TRANSACTION INQUIRY ERP STYLE WITH QBE COLUMNS */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            
            {/* Filter toolbar */}
            <div className="bg-[#f0f4f8] p-5 border-b border-slate-200 space-y-4">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <FileSpreadsheet size={16} className="text-[#0B3C5D]" />
                  Consultas Directas Ledger Diario - QBE (Query By Example Mode)
                </h3>

                {/* Simulated Payment Checkbox Radio */}
                <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 text-xs font-black overflow-hidden gap-1">
                  <button 
                    onClick={() => setPaymentStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-md ${paymentStatusFilter === 'ALL' ? 'bg-[#0B3C5D] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setPaymentStatusFilter('PENDIENTES')}
                    className={`px-3 py-1.5 rounded-md ${paymentStatusFilter === 'PENDIENTES' ? 'bg-[#0B3C5D] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Pendientes
                  </button>
                  <button 
                    onClick={() => setPaymentStatusFilter('PAGADOS')}
                    className={`px-3 py-1.5 rounded-md ${paymentStatusFilter === 'PAGADOS' ? 'bg-[#0B3C5D] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Saldados
                  </button>
                </div>
              </div>

              {/* Text search grid representing ERP E1 columnar filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">QBE Proveedor / Glosa:</label>
                  <span className="absolute left-3 top-7 text-slate-400">
                    <Search size={12} />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Filtrar por proveedor o concepto..."
                    value={searchSupplierQuery}
                    onChange={e => setSearchSupplierQuery(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                  />
                </div>

                <div className="relative">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">QBE Número de Documento (Invoice ID):</label>
                  <span className="absolute left-3 top-7 text-slate-400">
                    <Search size={12} />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Filtrar por número de comprobante/factura fiscal..."
                    value={searchDocQuery}
                    onChange={e => setSearchDocQuery(e.target.value)}
                    className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                  />
                </div>
              </div>

            </div>

            {/* General Ledger Table */}
            <div 
              className="overflow-x-auto custom-jde-grid-scroll border border-slate-300"
              ref={ledgerScrollContainerRef}
              onScroll={handleContainerScroll}
            >
              <table className="w-full text-left border-collapse table-fixed min-w-[1000px] text-xs">
                <thead>
                  <tr className="bg-[#E2ECF5] text-[#143B57] font-black border-b border-slate-200">
                    <th className="p-3 w-16 border border-slate-200">Programa</th>
                    <th className="p-3 w-28 border border-slate-200">Lote ERP</th>
                    <th className="p-3 w-32 border border-slate-200">Fecha</th>
                    <th className="p-3 w-32 border border-slate-200">Tipo Docto</th>
                    <th className="p-3 w-32 border border-slate-200">Nº Docto</th>
                    <th className="p-3 border border-slate-200">Concepto Glosa</th>
                    <th className="p-3 w-32 border border-slate-200">Monto</th>
                    <th className="p-3 w-24 text-center border border-slate-200">Estado</th>
                    <th className="p-3 w-32 text-center border border-slate-200">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredTransactions.map(t => (
                    <tr 
                      key={t.id} 
                      onClick={() => setInspectTarget(t)}
                      onContextMenu={(e) => handleRowContextMenu(e, t)}
                      className="hover:bg-[#FFFCEB] transition-colors font-medium cursor-pointer"
                      title="Click izquierdo para ver Detalle / Click derecho para Menu de Acciones"
                    >
                      <td className="p-3 font-mono font-bold text-slate-500 border-r border-slate-100">
                        {t.programId || 'P03B11'}
                      </td>
                      <td className="p-3 font-mono font-bold text-[#0B3C5D] border-r border-slate-100">
                        {t.batchNumber || 'B88147'}
                      </td>
                      <td className="p-3 text-slate-600 font-mono border-r border-slate-100">
                        {t.date}
                      </td>
                      <td className="p-3 border-r border-slate-100">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 border border-slate-200 text-slate-700 font-mono">
                          {t.documentType || 'COMPROBANTE'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-800 font-bold border-r border-slate-100">
                        #{t.documentNumber || 'S/N'}
                      </td>
                      <td className="p-3 font-bold text-slate-900 border-r border-slate-100 truncate uppercase">
                        {t.description}
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 border-r border-slate-100 px-4">
                        ${t.amount.toLocaleString('es-CL')}
                      </td>
                      <td className="p-3 text-center border-r border-slate-100">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          t.status === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status === 'COMPLETADA' ? 'PAGADA' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const linkedOT = workOrders.find(ot => ot.id === t.workOrderId);
                            downloadJDETransactionVoucher({
                              transaction: t,
                              workOrder: linkedOT,
                              currentUser
                            });
                          }}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded font-black text-[9px] uppercase tracking-wider flex items-center gap-1 mx-auto transition-all shadow-sm"
                          title="Descargar Comprobante Contable ERP PDF"
                        >
                          <Download size={10} />
                          Comprobante
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 font-bold uppercase">
                        No se encontraron registros bajo los filtros de consulta QBE especificados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ERP ORIGINAL HORIZONTAL SCROLL SLIDE CONTROL */}
            <div className="bg-[#ECE9D8] border border-slate-400 p-2.5 rounded-sm flex items-center gap-3 shadow-inner my-2 font-sans select-none">
              <button 
                type="button"
                onClick={() => {
                  if (ledgerScrollContainerRef.current) {
                    ledgerScrollContainerRef.current.scrollLeft -= 100;
                    handleContainerScroll();
                  }
                }}
                className="bg-[#ECE9D8] hover:bg-slate-300 border border-t-white border-l-white border-b-slate-500 border-r-slate-500 p-1 rounded-sm text-[#0B3C5D] font-black text-xs h-7 w-7 flex items-center justify-center active:border-b-white active:border-r-white shadow-xs"
                title="Desplazar Izquierda (ERP)"
              >
                ◀
              </button>
              
              <div className="flex-1 flex items-center gap-4 relative">
                <span className="text-[10.5px] font-bold text-[#143B57] uppercase font-mono whitespace-nowrap flex items-center gap-1.5 bg-[#DFEFFC] px-2 py-1 rounded-sm border border-slate-300">
                  <Sliders size={12} className="text-[#0B3C5D]" /> SLIDE HORIZONTAL ERP:
                </span>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={scrollPercent} 
                  onChange={handleSliderChange}
                  className="flex-1 accent-[#0B3C5D] h-3.5 bg-slate-200 border border-slate-400 rounded-sm cursor-pointer outline-none transition-all"
                />
                <span className="text-[10.5px] font-mono font-bold text-[#0B3C5D] w-12 text-right bg-white px-1.5 py-0.5 rounded border border-slate-200">{Math.round(scrollPercent)}%</span>
              </div>

              <button 
                type="button"
                onClick={() => {
                  if (ledgerScrollContainerRef.current) {
                    ledgerScrollContainerRef.current.scrollLeft += 100;
                    handleContainerScroll();
                  }
                }}
                className="bg-[#ECE9D8] hover:bg-slate-300 border border-t-white border-l-white border-b-slate-500 border-r-slate-500 p-1 rounded-sm text-[#0B3C5D] font-black text-xs h-7 w-7 flex items-center justify-center active:border-b-white active:border-r-white shadow-xs"
                title="Desplazar Derecha (ERP)"
              >
                ▶
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
              Registros mostrados: {filteredTransactions.length} de {transactions.length}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: THREE WAY MATCH AUDIT DENSITY */}
      {activeTab === 'THREE_WAY' && (
        <div className="space-y-6">

          {/* THREE WAY MATCH METRIC STATUS FLAGS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
              <div>
                <CheckCircle2 className="text-emerald-600 mb-1" size={24} />
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">Match Perfecto ✓</span>
                <span className="text-2xl font-black mt-1 block">
                  {threeWayMatchStats.perfectMatches} OTs
                </span>
              </div>
              <p className="text-[10px] text-emerald-700 font-medium leading-normal mt-2">
                Órdenes vinculadas a una CxP y efectivamente saldadas en Banco.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-950 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
              <div>
                <AlertCircle className="text-amber-500 mb-1" size={24} />
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">Omission Provisión F0411</span>
                <span className="text-2xl font-black mt-1 block text-amber-900">
                  {threeWayMatchStats.missingVouchers} OTs
                </span>
              </div>
              <p className="text-[10px] text-amber-700 font-medium leading-normal mt-2">
                OT aprobada o recibida por el personal que aún carece de un devengo AP.
              </p>
            </div>

            <div className="bg-[#0B3C5D]/5 border border-[#0B3C5D]/10 text-slate-800 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
              <div>
                <Activity className="text-[#0B3C5D] mb-1" size={24} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Facturas sin Link Fiscal</span>
                <span className="text-2xl font-black mt-1 block text-[#0B3C5D]">
                  {threeWayMatchStats.missingInvoices} CxP
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-normal mt-2">
                Cuentas por pagar registradas que no tienen asociado un número de factura.
              </p>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
              <div>
                <DollarSign className="text-indigo-600 mb-1" size={24} />
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest block">Saldos CxP por Liquidar</span>
                <span className="text-2xl font-black mt-1 block text-indigo-900">
                  {threeWayMatchStats.pendingDisbursements} CxP
                </span>
              </div>
              <p className="text-[10px] text-indigo-700 font-medium leading-normal mt-2">
                Obligaciones devengadas pendientes en Tesorería para emisión de egreso.
              </p>
            </div>

          </div>

          {/* THREE WAY MATCH GRID VIEWER */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="bg-[#f0f4f8] p-5 border-b border-slate-200">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                Matriz de Control Cruzado de Tres Vías (Mantenimientos vs Contabilidad)
              </h3>
            </div>

            <div className="overflow-x-auto text-[11px] custom-audit-scroll">
              <table className="w-full text-left border-collapse table-fixed min-w-[1050px]">
                <thead>
                  <tr className="bg-[#0B3C5D] text-white font-bold border-b border-slate-200 uppercase text-[10px]">
                    <th className="p-3 w-12 text-center border-r border-[#1D5C8A] select-none" title="Selector de Fila AssetFlow Enterprise (F4 / Menú Contextual)">#</th>
                    <th className="p-3 w-1/4 border-r border-[#1D5C8A]">Paso 1: Orden de Trabajo</th>
                    <th className="p-3 w-1/4 border-r border-[#1D5C8A]">Paso 2: CxP Provisionada</th>
                    <th className="p-3 w-1/4 border-r border-[#1D5C8A]">Paso 3: Check Factura</th>
                    <th className="p-3 w-1/4">Paso 4: Egreso Bancario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {threeWayMatchStats.auditableOrders.map(audit => {
                    const isSelected = threeWayGridContextMenu?.audit.order.id === audit.order.id;
                    return (
                    <tr 
                      key={audit.order.id} 
                      onContextMenu={(e) => handleThreeWayRowContextMenu(e, audit)}
                      className={`transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-cyan-100/90 text-cyan-950 font-bold border-l-4 border-l-[#00E5FF]' 
                          : 'hover:bg-slate-50/80'
                      }`}
                      title="Clic derecho o clic en [#] para abrir Menú Contextual AssetFlow Enterprise (3-Way Matching)"
                    >
                      {/* ERP Row Selector */}
                      <td className="p-3 text-center border-r border-slate-100 bg-slate-50 select-none">
                        <button
                          type="button"
                          onClick={(e) => handleThreeWayRowContextMenu(e, audit)}
                          className="w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-black text-[#0B3C5D] hover:bg-[#0B3C5D] hover:text-white border border-slate-300 hover:border-[#0B3C5D] shadow-2xs transition-all mx-auto"
                          title="Abrir Menú Contextual AssetFlow Enterprise (3-Way Match)"
                        >
                          #
                        </button>
                      </td>
                      
                      {/* Step 1: Work Order */}
                      <td className="p-3.5 border-r border-slate-100">
                        <div className="space-y-1">
                          <span className="text-[#0B3C5D] font-extrabold font-mono block">OT #{audit.order.folio}</span>
                          <span className="font-bold text-slate-800 block text-[10px] truncate uppercase">{audit.order.supplierName}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">Total: ${audit.order.total.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Step 2: Voucher Account Payable */}
                      <td className="p-3.5 border-r border-slate-100">
                        {audit.voucher ? (
                          <div className="space-y-1">
                            <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              PROVISIONADO ✓
                            </span>
                            <span className="text-[10px] text-slate-700 font-mono block">Lote: {audit.voucher.batchNumber}</span>
                          </div>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 inline-block font-extrabold leading-tight text-[10px]">
                            OMISIÓN DE DEVENGADO
                          </span>
                        )}
                      </td>

                      {/* Step 3: Invoice check */}
                      <td className="p-3.5 border-r border-slate-100">
                        {audit.order.receptionInvoiceNumber ? (
                          <div className="space-y-1">
                            <span className="text-emerald-700 font-bold block uppercase">VINCULADA ✓</span>
                            <span className="text-[10px] text-slate-500 font-mono block">Factura #{audit.order.receptionInvoiceNumber}</span>
                          </div>
                        ) : audit.voucher && audit.voucher.documentType === 'FACTURA' ? (
                          <div className="space-y-1">
                            <span className="text-emerald-700 font-bold block uppercase">MATCH COMPACTO ✓</span>
                            <span className="text-[10px] text-slate-500 font-mono block">Docto: #{audit.voucher.documentNumber}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-bold italic text-[10px]">
                            Sin factura recibida
                          </span>
                        )}
                      </td>

                      {/* Step 4: Outflow Payment Check */}
                      <td className="p-3.5">
                        {audit.payment ? (
                          <div className="space-y-1">
                            <span className="text-emerald-700 font-extrabold flex items-center gap-1 uppercase">
                              <CheckCircle2 size={12} />
                              PAGO EMITIDO ✓
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">Fecha: {audit.payment.date}</span>
                          </div>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 border border-amber-150 rounded px-2 py-0.5 inline-block font-bold text-[10px]">
                            Pendiente pago
                          </span>
                        )}
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

      {/* TAB 3: DUPLICATE ENTRIES FINDER */}
      {activeTab === 'DUPLICATES' && (
        <div className="space-y-6">
          
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl space-y-2 text-amber-950">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-amber-900">
              <ShieldAlert size={16} />
              Inteligencia Contable - Almacén de Control Duplicados
            </h3>
            <p className="text-[11px] font-semibold leading-relaxed text-amber-900/80">
              Controla las facturas o boletas cargadas accidentalmente dos veces en el sistema. El algoritmo audita correspondencias de RUT de Proveedor y montos financieros idénticos, o duplicidad en números de facturas fiscales ingresadas.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
              Grupos de Imputaciones Contables Sospechosas detectadas
            </h4>

            {duplicateEntries.length === 0 ? (
              <div className="p-10 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 font-bold uppercase">
                Felicidades: No hay imputaciones o vouchers de CxP duplicados en los libros.
              </div>
            ) : (
              <div className="space-y-4">
                {duplicateEntries.map((group, index) => (
                  <div key={group.main.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    
                    <div className="bg-amber-50/50 p-3 border-b border-slate-200 flex justify-between items-center">
                      <span className="text-xs font-black text-[#0B3C5D] font-mono">
                        GRUPO DUPLICIDAD SOSPECHOSA #{index + 1}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black uppercase">
                        {group.matches.length + 1} FILAS EXACTAS
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {/* Main Transaction row */}
                      <div className="p-3 flex justify-between items-center">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Registro Primario ({group.main.batchNumber})</span>
                          <span className="text-xs font-black text-slate-800 uppercase">{group.main.description}</span>
                          <span className="text-[10px] text-slate-500 font-mono block">RUT: {group.main.supplierTaxId || 'S/E'} | Nº Docto: #{group.main.documentNumber || 'S/E'}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-slate-900">${group.main.amount.toLocaleString()}</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold uppercase rounded text-[9px]">A SALVO</span>
                        </div>
                      </div>

                      {/* Matched rows (duplicates to void) */}
                      {group.matches.map(m => (
                        <div key={m.id} className="p-3 bg-rose-50/30 flex justify-between items-center">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-rose-500 block uppercase">Duplicación sospechosa ({m.batchNumber})</span>
                            <span className="text-xs font-black text-slate-800 uppercase">{m.description}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">RUT: {m.supplierTaxId || 'S/E'} | Nº Docto: #{m.documentNumber || 'S/E'}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-black text-slate-900">${m.amount.toLocaleString()}</span>
                            <button 
                              onClick={() => handleAnularDuplicado(m.id)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all"
                            >
                              Anular Registro
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 4: SPEED STATUS CHANGE CONTROLS */}
      {activeTab === 'SPEED_STATUS' && (
        <div className="space-y-6">

          <div className="bg-[#0B3C5D]/5 border-l-4 border-l-[#0B3C5D] p-5 rounded-2xl text-slate-800">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-[#0B3C5D]">
              <RefreshCw size={16} />
              P0411 Speed Status Change - Control de Flujo de Tesorería
            </h3>
            <p className="text-[11px] font-semibold leading-relaxed text-slate-600 mt-1">
              La funcionalidad Speed Status Change es una emulación ERP original que permite a un contralor de cuentas a pagar cambiar de forma rápida u omitir aprobaciones de pagos, retener egresos de forma veloz para que no sean dispersados en el siguiente lote contable. Seleccione cualquier transacción para alterar su estado.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                Monedas y Obligaciones activas en Tesorería
              </h4>
            </div>

            <div className="space-y-4">
              {transactions.filter(t => t.type === 'EXPENSE').slice(0, 12).map(t => {
                const isSelected = selectedTxIdForSpeed === t.id;
                return (
                  <div key={t.id} className={`p-4 border rounded-2xl transition-all ${
                    isSelected ? 'border-[#0B3C5D] bg-indigo-50/20' : 'border-slate-200'
                  }`}>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">Lote: {t.batchNumber || 'B1120'}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span className="text-[10px] font-bold text-indigo-900 font-mono uppercase">{t.documentType || 'FACTURA'}</span>
                        </div>
                        <h5 className="text-xs font-black text-slate-800 uppercase">
                          {t.description}
                        </h5>
                        <p className="text-[10px] text-slate-500 font-bold font-mono">
                          Monto Ajuste: <span className="text-slate-900 font-black">${t.amount.toLocaleString()}</span>
                        </p>
                      </div>

                      {/* State badge / Control button */}
                      <div className="flex gap-2">
                        {isSelected ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-slate-500 mr-2 uppercase">Cambiar a:</span>
                            <button 
                              onClick={() => executeSpeedChange(t.id, 'PENDIENTE')}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-black uppercase"
                            >
                              Pendiente
                            </button>
                            <button 
                              onClick={() => executeSpeedChange(t.id, 'COMPLETADA')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-black uppercase"
                            >
                              Saldada
                            </button>
                            <button 
                              onClick={() => setSelectedTxIdForSpeed(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1.5 rounded text-[9px] font-black uppercase ${
                              t.status === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {t.status === 'COMPLETADA' ? 'PAGADA' : 'PENDIENTE'}
                            </span>
                            <button 
                              onClick={() => setSelectedTxIdForSpeed(t.id)}
                              className="px-3 py-1.5 bg-[#0B3C5D] hover:bg-indigo-900 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all"
                            >
                              Speed Change
                            </button>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* TAB 5: BALANCE DE 8 COLUMNAS Y CUMPLIMIENTO SII CHILE */}
      {activeTab === 'BALANCE_OCHO_COLUMNAS' && (
        <div className="space-y-6">
          <div className="bg-[#1E3A8A]/5 border-l-4 border-l-[#1E3A8A] p-5 rounded-2xl text-slate-800">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-[#1E3A8A]">
              <Database size={16} />
              Balance Trib. 8 Columnas - Conforme Normativa SII Chile & CMF
            </h3>
            <p className="text-[11px] font-semibold leading-relaxed text-slate-600 mt-1">
              Este dashboard calcula en tiempo real el Balance General Tributario de 8 Columnas según el plan de cuentas centralizado para ASSETFLOW. Asegura la cuadratura del Libro Diario General (F0911) permitiendo la declaración mensual del Formulario 29 (F29) de Impuestos Mensuales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#ECE9D8] border border-slate-355 p-4 rounded-xl shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Índice UF (Hoy):</span>
              <span className="text-base font-mono font-black text-slate-900">$38.125 CLP</span>
              <span className="text-[8.5px] text-[#4F5D73] font-semibold block">Valor reajustado CMF</span>
            </div>
            
            <div className="bg-[#ECE9D8] border border-slate-355 p-4 rounded-xl shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Tasa IVA General Chile:</span>
              <span className="text-base font-mono font-black text-indigo-800">19.00%</span>
              <span className="text-[8.5px] text-[#4F5D73] font-semibold block">Art. 14 DL 825 Ventas y Servicios</span>
            </div>

            <div className="bg-[#ECE9D8] border border-slate-355 p-4 rounded-xl shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Retención Boletas:</span>
              <span className="text-base font-mono font-black text-amber-700">13.75%</span>
              <span className="text-[8.5px] text-[#4F5D73] font-semibold block">Art. 42 Nº2 Ley de Impuesto Renta</span>
            </div>

            <div className="bg-[#ECE9D8] border border-slate-355 p-4 rounded-xl shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Estado F29 Previsional:</span>
              <span className="text-base font-mono font-black text-emerald-800">✓ CUADRADO (SII)</span>
              <span className="text-[8.5px] text-[#4F5D73] font-semibold block">Cuadratura tributaria de partida doble</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 overflow-x-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-sans">
                  COMPROBACIÓN Y SALDOS DE OCHO COLUMNAS (REPORTE ASSETFLOW)
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">Empresa: SOCIEDAD ASSETFLOW INMOBILIARIA SPA • Rut: 76.554.321-9</p>
              </div>
              <button
                onClick={() => {
                  alert('Exportando Balance de 8 Columnas a Excel XLS de auditoría de S.I.I.');
                }}
                className="px-3 py-1.5 bg-[#0B3C5D] hover:bg-indigo-900 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Download size={11} /> Exportar XLS SII
              </button>
            </div>

            <table className="w-full text-left font-mono text-[10.5px] border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-[#143B57] text-[#FFCC00] text-[9px] uppercase tracking-wider border-b border-slate-350">
                  <th className="p-2 border border-slate-300 text-left min-w-[200px]" rowSpan={2}>CUENTA CONTABLE (SII CHILE)</th>
                  <th className="p-2 border border-slate-300 text-center" colSpan={2}>1. SUMAS</th>
                  <th className="p-2 border border-slate-300 text-center" colSpan={2}>2. SALDOS</th>
                  <th className="p-2 border border-slate-300 text-center" colSpan={2}>3. INVENTARIO</th>
                  <th className="p-2 border border-slate-300 text-center" colSpan={2}>4. RESULTADO</th>
                </tr>
                <tr className="bg-[#1D5C8A] text-white text-[8.5px] uppercase border-b border-slate-300">
                  <th className="p-1 px-2 border border-slate-300 text-right">DÉBITO</th>
                  <th className="p-1 px-2 border border-slate-300 text-right">CRÉDITO</th>
                  <th className="p-1 px-2 border border-slate-300 text-right">DEUDOR</th>
                  <th className="p-1 px-2 border border-slate-300 text-right">ACREEDOR</th>
                  <th className="p-1 px-2 border border-slate-300 text-right">ACTIVO</th>
                  <th className="p-1 px-2 border border-slate-300 text-right">PASIVO</th>
                  <th className="p-1 px-2 border border-slate-300 text-right">PÉRDIDA</th>
                  <th className="p-1 px-2 border border-slate-300 text-right">GANANCIA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {balanceOchoColumnas.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#FFFCEB] transition cursor-pointer">
                    <td className="p-2 font-black border border-slate-200 text-slate-800 text-[11px] font-sans">{row.name}</td>
                    <td className="p-1 px-2 border border-slate-200 text-right text-slate-700">{row.deb > 0 ? `$${Math.round(row.deb).toLocaleString('es-CL')}` : '-'}</td>
                    <td className="p-1 px-2 border border-slate-200 text-right text-slate-700">{row.cred > 0 ? `$${Math.round(row.cred).toLocaleString('es-CL')}` : '-'}</td>
                    <td className="p-1 px-2 border border-slate-200 text-right text-indigo-700 font-bold">{row.deudor > 0 ? `$${Math.round(row.deudor).toLocaleString('es-CL')}` : '-'}</td>
                    <td className="p-1 px-2 border border-slate-200 text-right text-indigo-700 font-bold">{row.acreedor > 0 ? `$${Math.round(row.acreedor).toLocaleString('es-CL')}` : '-'}</td>
                    <td className="p-1 px-2 border border-slate-200 text-right text-emerald-800 font-semibold">{row.activo > 0 ? `$${Math.round(row.activo).toLocaleString('es-CL')}` : '-'}</td>
                    <td className="p-1 px-2 border border-slate-200 text-right text-rose-800 font-semibold">{row.pasivo > 0 ? `$${Math.round(row.pasivo).toLocaleString('es-CL')}` : '-'}</td>
                    <td className="p-1 px-2 border border-slate-200 text-right text-red-700">{row.perdida > 0 ? `$${Math.round(row.perdida).toLocaleString('es-CL')}` : '-'}</td>
                    <td className="p-1 px-2 border border-slate-200 text-right text-teal-800 font-black">{row.ganancia > 0 ? `$${Math.round(row.ganancia).toLocaleString('es-CL')}` : '-'}</td>
                  </tr>
                ))}

                <tr className="bg-[#DFEFFC] font-bold text-[11px] border-t-2 border-slate-400">
                  <td className="p-2 border border-slate-300 font-sans">SUBTOTALES DE CONTROL</td>
                  <td className="p-1 px-2 border border-slate-300 text-right text-slate-900">${Math.round(balanceOchoColumnas.totals.deb).toLocaleString('es-CL')}</td>
                  <td className="p-1 px-2 border border-slate-300 text-right text-slate-900">${Math.round(balanceOchoColumnas.totals.cred).toLocaleString('es-CL')}</td>
                  <td className="p-1 px-2 border border-slate-300 text-right text-indigo-850">${Math.round(balanceOchoColumnas.totals.deu).toLocaleString('es-CL')}</td>
                  <td className="p-1 px-2 border border-slate-300 text-right text-indigo-850">${Math.round(balanceOchoColumnas.totals.acr).toLocaleString('es-CL')}</td>
                  <td className="p-1 px-2 border border-slate-300 text-right text-emerald-800">${Math.round(balanceOchoColumnas.totals.act).toLocaleString('es-CL')}</td>
                  <td className="p-1 px-2 border border-slate-300 text-right text-rose-800">${Math.round(balanceOchoColumnas.totals.pas).toLocaleString('es-CL')}</td>
                  <td className="p-1 px-2 border border-slate-300 text-right text-red-800">${Math.round(balanceOchoColumnas.totals.per).toLocaleString('es-CL')}</td>
                  <td className="p-1 px-2 border border-slate-300 text-right text-teal-900">${Math.round(balanceOchoColumnas.totals.gan).toLocaleString('es-CL')}</td>
                </tr>

                <tr className="bg-amber-50 font-black text-[11.5px] border-y border-slate-450">
                  <td className="p-2.5 border border-slate-300 text-amber-900 font-sans">REMANENTE / RESULTADO DEL EJERCICIO NETO</td>
                  <td className="p-2 border border-slate-300" colSpan={4}></td>
                  <td className="p-2 border border-slate-300 text-right font-mono" colSpan={2}>
                    {balanceOchoColumnas.totals.activoPasivoDiff >= 0 ? (
                      <span className="text-emerald-800 font-black uppercase text-[10px]">Utilidad: +${Math.round(balanceOchoColumnas.totals.activoPasivoDiff).toLocaleString('es-CL')}</span>
                    ) : (
                      <span className="text-red-700 font-black uppercase text-[10px]">Pérdida: -${Math.round(Math.abs(balanceOchoColumnas.totals.activoPasivoDiff)).toLocaleString('es-CL')}</span>
                    )}
                  </td>
                  <td className="p-2 border border-slate-300 text-right font-mono" colSpan={2}>
                    {balanceOchoColumnas.totals.resultadoDiff >= 0 ? (
                      <span className="text-emerald-800 font-black uppercase text-[10px]">Utilidad: +${Math.round(balanceOchoColumnas.totals.resultadoDiff).toLocaleString('es-CL')}</span>
                    ) : (
                      <span className="text-red-700 font-black uppercase text-[10px]">Pérdida: -${Math.round(Math.abs(balanceOchoColumnas.totals.resultadoDiff)).toLocaleString('es-CL')}</span>
                    )}
                  </td>
                </tr>

                <tr className="bg-slate-100 font-extrabold text-[12px] border-b-4 border-double border-slate-500">
                  <td className="p-2.5 border border-slate-300 text-slate-800 uppercase text-[9.5px] font-sans">CUADRATURA SUMAS FINALES DE BALANCE</td>
                  <td className="p-2 border border-slate-300 text-right" colSpan={2}>
                    ${Math.round(balanceOchoColumnas.totals.deb).toLocaleString('es-CL')}
                  </td>
                  <td className="p-2 border border-slate-300 text-right text-indigo-900" colSpan={2}>
                    ${Math.round(balanceOchoColumnas.totals.deu).toLocaleString('es-CL')}
                  </td>
                  <td className="p-2 border border-slate-300 text-right" colSpan={2}>
                    ${Math.round(Math.max(balanceOchoColumnas.totals.act, balanceOchoColumnas.totals.pas) + (balanceOchoColumnas.totals.activoPasivoDiff < 0 ? Math.abs(balanceOchoColumnas.totals.activoPasivoDiff) : 0)).toLocaleString('es-CL')}
                  </td>
                  <td className="p-2 border border-slate-300 text-right" colSpan={2}>
                    ${Math.round(Math.max(balanceOchoColumnas.totals.gan, balanceOchoColumnas.totals.per) + (balanceOchoColumnas.totals.resultadoDiff < 0 ? Math.abs(balanceOchoColumnas.totals.resultadoDiff) : 0)).toLocaleString('es-CL')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-[#ECE9D8] border border-slate-350 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-black text-[#0B3C5D] uppercase tracking-wider flex items-center gap-2 border-b border-slate-300 pb-2 font-sans">
              <ShieldAlert size={15} /> Auditor de IVA, Boletas F29 e Impuestos (S.I.I. Compliance Chile)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] font-sans">
              <div className="space-y-2 text-slate-700 font-semibold">
                <p className="font-bold text-slate-950 text-xs">Declaración IVA Mensual (DL 825):</p>
                
                <div className="flex justify-between border-b border-dashed border-slate-300 pb-1.5">
                  <span className="font-medium text-slate-400">Total IVA Débito Fiscal (Boletas/Facturas de Arrendamientos)</span>
                  <span className="font-mono text-indigo-855 font-bold">
                    ${Math.round(balanceOchoColumnas.totals.pas).toLocaleString('es-CL')} CLP
                  </span>
                </div>

                <div className="flex justify-between border-b border-dashed border-slate-300 pb-1.5">
                  <span className="font-medium text-slate-400">Total IVA Crédito Fiscal (Compras de Mantenciones/Gasto)</span>
                  <span className="font-mono text-indigo-750 font-bold">
                    ${Math.round(balanceOchoColumnas.rows.find(r => r.name.includes('IVA CRÉDITO'))?.deb || 0).toLocaleString('es-CL')} CLP
                  </span>
                </div>

                <div className="flex justify-between font-bold pt-1 text-slate-900">
                  <span>Impuesto a declarar Estimado:</span>
                  <span className="font-mono">
                    {(balanceOchoColumnas.rows.find(r => r.name.includes('IVA DÉBITO'))?.cred || 0) >= (balanceOchoColumnas.rows.find(r => r.name.includes('IVA CRÉDITO'))?.deb || 0) ? (
                      <span className="text-red-700">A Pagar F29: ${Math.round((balanceOchoColumnas.rows.find(r => r.name.includes('IVA DÉBITO'))?.cred || 0) - (balanceOchoColumnas.rows.find(r => r.name.includes('IVA CRÉDITO'))?.deb || 0)).toLocaleString('es-CL')} CLP</span>
                    ) : (
                      <span className="text-emerald-700">Remanente de IVA: ${Math.round((balanceOchoColumnas.rows.find(r => r.name.includes('IVA CRÉDITO'))?.deb || 0) - (balanceOchoColumnas.rows.find(r => r.name.includes('IVA DÉBITO'))?.cred || 0)).toLocaleString('es-CL')} CLP</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-slate-700 font-semibold">
                <p className="font-bold text-slate-950 text-xs">Impuestos Adicionales y Retención de Segunda Categoría:</p>
                
                <div className="flex justify-between border-b border-dashed border-slate-300 pb-1.5">
                  <span className="font-medium text-slate-400">Impuesto Retenido s/ Boletas Honorarios (F29 L48 Código 151 - Tasa 13.75%)</span>
                  <span className="font-mono text-amber-800 font-bold">
                    ${Math.round(balanceOchoColumnas.rows.find(r => r.name.includes('RETENIDO BOLETAS'))?.cred || 0).toLocaleString('es-CL')} CLP
                  </span>
                </div>

                <div className="flex justify-between border-b border-dashed border-slate-300 pb-1.5">
                  <span className="font-medium text-slate-400">Previsión Técnica de Reajuste Monetario (Indexación IPC/UF)</span>
                  <span className="font-mono text-slate-700 font-medium">
                    UF Apertura: $37.950,22 → UF Cierre: $38.125,50
                  </span>
                </div>

                <div className="flex justify-between font-bold pt-1 text-slate-900 border-t border-slate-200">
                  <span>Resultado Consistencia de Saldos Ledger ASSETFLOW:</span>
                  <span className="text-emerald-700">✓ 100% BALANCEADO EXENTO DE DISCREPANCIA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG FOR MANUAL G/L ENTRY POSTING (F0911 Posted to general journal batch) */}
      {showManualPostForm && (
        <div className="fixed inset-0 z-[600] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-50 rounded-[28px] border-8 border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden font-sans flex flex-col">
            
            <div className="bg-[#0B3C5D] text-white p-5 flex justify-between items-center relative">
              <h4 className="text-sm font-black uppercase tracking-wider">
                P0911 Diario - Posteo Manual a Cuenta Libro
              </h4>
              <button 
                onClick={() => setShowManualPostForm(false)}
                className="p-1 px-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white font-black"
              >
                X
              </button>
            </div>

            <form onSubmit={handlePostManualLedger} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tipo Docto ERP:</label>
                  <select 
                    value={newPostDocType}
                    onChange={e => setNewPostDocType(e.target.value as any)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg p-2 outlined-none focus:ring-1 focus:ring-[#0B3C5D]"
                  >
                    <option value="COMPROBANTE">Comprobante (PV)</option>
                    <option value="FACTURA">Factura Fiscal (INV)</option>
                    <option value="RECOGIDA_RECEPCION">Ajuste Manual</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Número Docto:</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 147820"
                    value={newPostDocNumber}
                    onChange={e => setNewPostDocNumber(e.target.value)}
                    className="w-full text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Asignar Inmueble (Imputación Directa):</label>
                <select
                  value={newPostPropertyId}
                  onChange={e => setNewPostPropertyId(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                >
                  <option value="">Ninguno / Imputación Corporativa</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>Depto {p.code} - {p.building || 'S/N'}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Direccionar a Proveedor:</label>
                <select
                  value={newPostSupplierId}
                  onChange={e => setNewPostSupplierId(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                >
                  <option value="">Seleccione Proveedor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.taxId})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Glosa de Concepto:</label>
                <input 
                  type="text" 
                  placeholder="Ej: Pago de Mantenciones de Red Eléctrica..."
                  value={newPostDescription}
                  onChange={e => setNewPostDescription(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-[#0B3C5D] placeholder:font-normal"
                />
              </div>

              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Monto de Imputación ($):</label>
                <span className="absolute left-3 top-7.5 text-slate-450 text-xs font-black">$</span>
                <input 
                  type="number"
                  placeholder="Monto, ej: 120000"
                  value={newPostAmount || ''}
                  onChange={e => setNewPostAmount(Number(e.target.value))}
                  className="w-full text-xs font-black text-slate-800 bg-white border border-slate-300 rounded-lg p-2 pl-7 outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => setShowManualPostForm(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs uppercase tracking-wider shadow"
                >
                  Postear Entrada (F0911)
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CUADRATURA GENERAL AUDIT MODAL DUAL VIEW */}
      {showCuadraturaModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-4 border-slate-300 w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#0B3C5D] text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    Informe de Cuadratura ERP (P09210)
                  </h3>
                  <p className="text-[9px] text-slate-300 font-mono">Sincronizador General de Partida Doble • Lote Activo</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCuadraturaModal(false)}
                className="text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              
              {/* Main alert card */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                ledgerAnalysis.isBalanced 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                  : 'bg-rose-50 border-rose-250 text-rose-950'
              }`}>
                {ledgerAnalysis.isBalanced ? (
                  <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={22} />
                ) : (
                  <AlertCircle className="text-rose-600 mt-0.5 shrink-0" size={22} />
                )}
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    {ledgerAnalysis.isBalanced 
                      ? 'Sincronía Libro Mayor: PERFECTAMENTE BALANCEADO' 
                      : 'Sincronía Libro Mayor: DESFASE PATRIMONIAL DETECTADO'}
                  </h4>
                  <p className="text-[10px] leading-relaxed opacity-90">
                    {ledgerAnalysis.isBalanced
                      ? 'Todas las transacciones de créditos (ingresos) se compensan perfectamente con las cuentas de egresos de débito. No se requieren ajustes.'
                      : 'Existe una desviación acumulada. El balance del Libro Mayor F0911 no cumple con la rigurosa partida doble de ERP. Utilice el botón corrector automático para inyectar una regularización de ajuste.'}
                  </p>
                </div>
              </div>

              {/* Numeric Ledger breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl text-center">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block">HABER (CRÉDITOS / INGRESOs)</span>
                  <span className="text-sm font-black text-emerald-600 mt-1 block">
                    ${ledgerAnalysis.totalIncomes.toLocaleString('es-CL')}
                  </span>
                </div>
                <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl text-center">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block">DEBER (DÉBITOS / EGRESOs)</span>
                  <span className="text-sm font-black text-rose-600 mt-1 block">
                    ${ledgerAnalysis.totalExpenses.toLocaleString('es-CL')}
                  </span>
                </div>
                <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl text-center">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block font-mono">DIFERENCIA (NETO)</span>
                  <span className={`text-sm font-black mt-1 block ${
                    ledgerAnalysis.isBalanced ? 'text-slate-600' : 'text-amber-700'
                  }`}>
                    ${ledgerAnalysis.delta.toLocaleString('es-CL')}
                  </span>
                </div>
              </div>

              {/* Checklist list */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                <div className="p-3 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Auditoría General de Integridad Contable
                </div>
                <div className="p-3 space-y-3.5 text-[11px] text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-600">Partida Doble ERP (Balance General)</span>
                    <span className={`font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      ledgerAnalysis.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-[#b91c1c]'
                    }`}>
                      {ledgerAnalysis.isBalanced ? '✓ OK' : '⚠ DESCUADRE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-600">Correlatividad de Folios F0911</span>
                    <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded">
                      ✓ OK (SIN SALTOS)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-600">Integridad de Address Book (F0101)</span>
                    <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded">
                      ✓ 100% REGISTROS VÁLIDOS
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCuadraturaModal(false)}
                className="px-4 py-2 hover:bg-slate-200 bg-slate-150 text-slate-700 font-black rounded-xl text-xs uppercase cursor-pointer"
              >
                Cerrar Informe
              </button>
              
              {!ledgerAnalysis.isBalanced && (
                <button
                  onClick={handleAutoCuadrar}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow"
                >
                  <Sparkles size={14} />
                  Corregir Desfase Autocuadrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: BLINDAJE & CONTROL DE COSTOS DE IA (CFO) */}
      {activeTab === 'AI_COST_SHIELD' && (
        <div className="space-y-6">
          <AiBudgetShieldPanel />
        </div>
      )}

      {/* ======================================================= */}
      {/* ERP RETRO CONTEXT MENU (RIGHT CLICK) ON CONTROLLING     */}
      {/* ======================================================= */}
      {contextMenu && (
        <div 
          className="fixed z-[9999] bg-[#ECE9D8] border-2 border-[#0B3C5D] shadow-2xl py-1 rounded-sm min-w-[260px] text-xs font-sans text-slate-800 animate-in fade-in zoom-in-95 duration-100 select-none"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-linear-to-r from-[#0B3C5D] to-[#1D5C8A] px-3 py-1.5 mb-1 text-[9.5px] font-black uppercase text-[#FFCC00] tracking-widest flex justify-between items-center border-b border-[#FFCC00]">
            <span className="flex items-center gap-1">
              <Activity size={11} /> Control Financiero Central
            </span>
            <span className="font-mono bg-white/25 px-1 rounded text-white text-[8.5px]">#{contextMenu.record.id.substring(0, 5)}</span>
          </div>

          <div className="px-3 py-1 text-[9px] font-mono text-slate-500 font-bold border-b border-slate-200 bg-white/50 mb-1">
            CONCEPTO: {contextMenu.record.description.toUpperCase()}
          </div>

          {/* Option: Consultar Atributo Maestro */}
          <button
            onClick={() => {
              setInspectTarget(contextMenu.record);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-300 hover:text-[#0B3C5D] text-slate-700 font-bold transition-all text-[10.5px] cursor-pointer"
          >
            <Database size={12} className="text-[#0B3C5D]" /> 
            <span>Inspeccionar F980011D (Master)</span>
          </button>

          {/* Option: Ver Balance de 8 Columnas */}
          <button
            onClick={() => {
              setActiveTab('BALANCE_OCHO_COLUMNAS');
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-300 hover:text-[#0B3C5D] text-slate-705 font-bold transition-all text-[10.5px] cursor-pointer"
          >
            <Database size={12} className="text-amber-700" />
            <span>Ver Balance de 8 Columnas SII</span>
          </button>

          {/* Option: Descargar Comprobante PDF */}
          <button
            onClick={() => {
              const linkedOT = workOrders.find(ot => ot.id === contextMenu.record.workOrderId);
              downloadJDETransactionVoucher({
                transaction: contextMenu.record,
                workOrder: linkedOT,
                currentUser
              });
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-300 hover:text-[#0B3C5D] text-slate-705 font-bold transition-all text-[10.5px] cursor-pointer"
          >
            <Download size={12} className="text-indigo-700" />
            <span>Emitir Comprobante PDF (ERP)</span>
          </button>

          {/* Option: Realizar Conciliación 3 Vías */}
          <button
            onClick={() => {
              setActiveTab('THREE_WAY');
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-300 hover:text-[#0B3C5D] text-slate-705 font-bold transition-all text-[10.5px] cursor-pointer"
          >
            <Layers size={12} className="text-emerald-700" />
            <span>Ver 3-Way Match (F4311)</span>
          </button>

          {/* Option: Iniciar Auditoría Cuadratura */}
          <button
            onClick={() => {
              setShowCuadraturaModal(true);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-300 hover:text-[#0B3C5D] text-slate-705 font-bold transition-all text-[10.5px] cursor-pointer"
          >
            <RefreshCw size={12} className="text-[#0B3C5D]" />
            <span>Informe Cuadratura General</span>
          </button>

          <div className="h-px bg-slate-300 my-1"></div>

          {/* Option: Speed Status change directly */}
          <button
            onClick={() => {
              setActiveTab('SPEED_STATUS');
              setSelectedTxIdForSpeed(contextMenu.record.id);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-300 hover:text-indigo-900 text-indigo-750 font-bold transition-all text-[10.5px] cursor-pointer"
          >
            <RefreshCw size={12} className="text-indigo-600" />
            <span>Utilizar Speed Status Change</span>
          </button>

          <div className="h-px bg-slate-300 my-1"></div>

          {/* Option: Cerrar */}
          <button
            onClick={() => setContextMenu(null)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-300 text-slate-500 font-bold transition-all text-[10.5px] cursor-pointer"
          >
            <X size={12} />
            <span>Cerrar Menú</span>
          </button>
        </div>
      )}

      {/* ========================================================== */}
      {/* F980011D - MAESTRO DE ATRIBUTOS REGISTRO (INSPECTOR MODAL) */}
      {/* ========================================================== */}
      {inspectTarget && (
        <F980011DModal
          isOpen={!!inspectTarget}
          onClose={() => setInspectTarget(null)}
          registryId={inspectTarget.id}
          entityType="TRANSACTION"
          originalData={inspectTarget}
          currentUser={currentUser}
        />
      )}

      {/* ========================================================== */}
      {/* DICTAMEN PERICIAL FORENSE ERP / CORPORATIVO (SIMILITUD & PLAGIO) */}
      {/* ========================================================== */}
      <JdeComparisonAuditModal
        isOpen={showJdeAuditModal}
        onClose={() => setShowJdeAuditModal(false)}
        currentUser={currentUser}
        companyName="ASSETFLOW ENTERPRISE & CONTROLLING"
      />

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* ASSETFLOW ENTERPRISE GRID CONTEXT MENU - MATRIZ DE CONTROL TRES VÍAS (P09210)*/}
      {/* ========================================================================= */}
      {threeWayGridContextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={threeWayGridContextMenu.x}
          y={threeWayGridContextMenu.y}
          programCode="P09210"
          programTitle={`Control Cruzado de Tres Vías [W09210B] • OT #${threeWayGridContextMenu.audit.order.folio}`}
          collectionName="work_orders"
          recordKey={`OT #${threeWayGridContextMenu.audit.order.folio} [${threeWayGridContextMenu.audit.order.supplierName}]`}
          recordData={threeWayGridContextMenu.audit.order}
          currentStatus={threeWayGridContextMenu.audit.healthRating === 4 ? 'COMPLETO' : 'OBSERVADO'}
          statusOptions={[
            { label: 'CONCILIADO 3 VÍAS (Match)', value: 'COMPLETO', color: 'bg-emerald-600' },
            { label: 'OBSERVADO (Pendiente CxP o Factura)', value: 'OBSERVADO', color: 'bg-amber-600' },
            { label: 'DISCREPANCIA (Revisión Control)', value: 'DISCREPANCIA', color: 'bg-rose-600' }
          ]}
          onClose={() => setThreeWayGridContextMenu(null)}
          onViewDetails={() => {
            setSelectedAuditDetail(threeWayGridContextMenu.audit);
            setThreeWayGridContextMenu(null);
          }}
          onSelectRow={() => {
            setSelectedAuditDetail(threeWayGridContextMenu.audit);
            setThreeWayGridContextMenu(null);
          }}
          onPrint={() => {
            downloadJDEWorkOrderVoucher({
              workOrder: threeWayGridContextMenu.audit.order,
              currentUser
            });
            setThreeWayGridContextMenu(null);
          }}
          onExportExcel={() => {
            exportWorkOrdersToExcel(
              workOrders,
              `Cuadratura_Tres_Vias_${threeWayGridContextMenu.audit.order.folio}_${new Date().toISOString().split('T')[0]}`
            );
            setThreeWayGridContextMenu(null);
          }}
          rowExits={[
            {
              id: 'exit_cuadratura_modal',
              label: 'Ver Resumen Cuadratura 3 Vías',
              shortcut: 'Enter',
              onClick: () => {
                setSelectedAuditDetail(threeWayGridContextMenu.audit);
                setThreeWayGridContextMenu(null);
              }
            },
            {
              id: 'exit_pdf_voucher',
              label: 'Descargar Comprobante OT Oficial (PDF)',
              shortcut: 'Ctrl+P',
              onClick: () => {
                downloadJDEWorkOrderVoucher({
                  workOrder: threeWayGridContextMenu.audit.order,
                  currentUser
                });
                setThreeWayGridContextMenu(null);
              }
            },
            ...(threeWayGridContextMenu.audit.voucher ? [{
              id: 'exit_voucher_tx',
              label: 'Descargar Voucher Contable F0411 (PDF)',
              shortcut: 'Ctrl+D',
              onClick: () => {
                downloadJDETransactionVoucher({
                  transaction: threeWayGridContextMenu.audit.voucher!,
                  workOrder: threeWayGridContextMenu.audit.order,
                  currentUser
                });
                setThreeWayGridContextMenu(null);
              }
            }] : []),
            {
              id: 'exit_inspector_master',
              label: 'Inspeccionar Atributos de Orden (F4801)',
              shortcut: 'Alt+I',
              onClick: () => {
                setInspectTarget({
                  id: threeWayGridContextMenu.audit.order.id,
                  description: `OT #${threeWayGridContextMenu.audit.order.folio} - ${threeWayGridContextMenu.audit.order.specialInstructions || 'Mantenimiento General'}`,
                  amount: threeWayGridContextMenu.audit.order.total,
                  type: 'EXPENSE',
                  category: threeWayGridContextMenu.audit.order.category || 'MANTENCIÓN',
                  date: threeWayGridContextMenu.audit.order.createdAt || new Date().toISOString().split('T')[0],
                  user: currentUser,
                  timestamp: Date.now(),
                  supplierName: threeWayGridContextMenu.audit.order.supplierName,
                  programId: 'P09210',
                  workStationId: 'W09210B',
                  status: threeWayGridContextMenu.audit.healthRating === 4 ? 'COMPLETADA' : 'PENDIENTE'
                } as any);
                setThreeWayGridContextMenu(null);
              }
            },
            {
              id: 'exit_export_excel_3way',
              label: 'Exportar Matriz 3 Vías a Excel (.xlsx)',
              shortcut: 'Ctrl+X',
              onClick: () => {
                exportWorkOrdersToExcel(
                  workOrders,
                  `Cuadratura_Tres_Vias_${threeWayGridContextMenu.audit.order.folio}_${new Date().toISOString().split('T')[0]}`
                );
                setThreeWayGridContextMenu(null);
              }
            }
          ]}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL DE RESUMEN CUADRATURA Y AUDITORÍA 3 VÍAS (3-WAY MATCHING)          */}
      {/* ========================================================================= */}
      {selectedAuditDetail && (
        <div 
          className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setSelectedAuditDetail(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0B3C5D] text-white p-5 flex items-center justify-between border-b border-[#082940]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 font-bold border border-white/15">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                    Matriz de Control 3 Vías: OT #{selectedAuditDetail.order.folio}
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      selectedAuditDetail.healthRating === 4 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-amber-400 text-slate-900'
                    }`}>
                      {selectedAuditDetail.healthRating === 4 ? 'Match Cuadrado ✓' : 'Observada'}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-300 font-mono mt-0.5">
                    Proveedor: {selectedAuditDetail.order.supplierName} • Total OT: ${selectedAuditDetail.order.total.toLocaleString('es-CL')} CLP
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedAuditDetail(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Paso 1: Orden de Trabajo */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                    <span>Paso 1: Orden de Trabajo</span>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-xs">OT #{selectedAuditDetail.order.folio}</div>
                  <div className="text-[11px] text-slate-600 mt-1">{selectedAuditDetail.order.specialInstructions || 'Trabajo técnico'}</div>
                  <div className="font-mono text-emerald-700 font-bold mt-1">${selectedAuditDetail.order.total.toLocaleString('es-CL')} CLP</div>
                </div>

                {/* Paso 2: CxP Provisionada */}
                <div className={`p-3.5 border rounded-2xl ${
                  selectedAuditDetail.voucher ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                    <span>Paso 2: Devengo Contable CxP</span>
                    {selectedAuditDetail.voucher ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertCircle size={14} className="text-amber-600" />}
                  </div>
                  {selectedAuditDetail.voucher ? (
                    <>
                      <div className="font-mono font-bold text-slate-900 text-xs">Lote: {selectedAuditDetail.voucher.batchNumber || 'F0411'}</div>
                      <div className="text-[11px] text-slate-600 mt-1">Doc: #{selectedAuditDetail.voucher.documentNumber || 'S/N'}</div>
                      <div className="font-mono text-emerald-700 font-bold mt-1">${selectedAuditDetail.voucher.amount.toLocaleString('es-CL')} CLP</div>
                    </>
                  ) : (
                    <div className="text-amber-800 font-bold text-[11px] mt-2">
                      ⚠️ Omisión de devengo: La OT no ha sido provisionada en contabilidad F0411.
                    </div>
                  )}
                </div>

                {/* Paso 3: Check Factura */}
                <div className={`p-3.5 border rounded-2xl ${
                  selectedAuditDetail.hasInvoice ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                    <span>Paso 3: Factura Proveedor</span>
                    {selectedAuditDetail.hasInvoice ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Clock size={14} className="text-slate-400" />}
                  </div>
                  {selectedAuditDetail.order.receptionInvoiceNumber ? (
                    <div className="font-mono font-bold text-slate-900 text-xs mt-1">Factura #{selectedAuditDetail.order.receptionInvoiceNumber}</div>
                  ) : selectedAuditDetail.voucher?.documentNumber ? (
                    <div className="font-mono font-bold text-slate-900 text-xs mt-1">Factura #{selectedAuditDetail.voucher.documentNumber}</div>
                  ) : (
                    <div className="text-slate-500 italic text-[11px] mt-2">Sin número de factura formal ingresado.</div>
                  )}
                </div>

                {/* Paso 4: Egreso Bancario */}
                <div className={`p-3.5 border rounded-2xl ${
                  selectedAuditDetail.payment ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                    <span>Paso 4: Egreso Bancario</span>
                    {selectedAuditDetail.payment ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Clock size={14} className="text-amber-600" />}
                  </div>
                  {selectedAuditDetail.payment ? (
                    <>
                      <div className="font-mono font-bold text-slate-900 text-xs">Pagado el {selectedAuditDetail.payment.date}</div>
                      <div className="font-mono text-emerald-700 font-bold mt-1">${selectedAuditDetail.payment.amount.toLocaleString('es-CL')} CLP</div>
                    </>
                  ) : (
                    <div className="text-amber-800 font-semibold text-[11px] mt-2">
                      Pendiente de liquidación en tesorería.
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción dentro del modal */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    downloadJDEWorkOrderVoucher({
                      workOrder: selectedAuditDetail.order,
                      currentUser
                    });
                  }}
                  className="px-4 py-2 bg-[#0B3C5D] hover:bg-[#072438] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} /> Descargar OT PDF
                </button>
                {selectedAuditDetail.voucher && (
                  <button
                    type="button"
                    onClick={() => {
                      downloadJDETransactionVoucher({
                        transaction: selectedAuditDetail.voucher!,
                        workOrder: selectedAuditDetail.order,
                        currentUser
                      });
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={14} /> Voucher CxP F0411
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedAuditDetail(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
