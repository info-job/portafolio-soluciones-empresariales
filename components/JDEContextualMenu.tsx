import React, { useState, useMemo } from 'react';
import { WorkOrder, Transaction, Property, LeaseContract, Supplier } from '../types';
import { 
  FileText, CheckCircle, AlertCircle, ArrowRight, Lock, 
  HelpCircle, Settings, Layers, ListFilter, Users, 
  Check, Info, DollarSign, Split, Trash2, Plus, 
  X, ClipboardList, Shield, Printer, Sparkles, Building, Download,
  Square, CheckSquare, Upload
} from 'lucide-react';
import { downloadJDETransactionVoucher, downloadJDEWorkOrderVoucher } from '../lib/pdfGenerator';

interface JDEContextualMenuProps {
  isOpen: boolean;
  onClose: () => void;
  // Context type can either be 'WORK_ORDER' or 'TRANSACTION'
  contextType: 'WORK_ORDER' | 'TRANSACTION';
  // Target objects
  selectedWorkOrder?: WorkOrder;
  selectedTransaction?: Transaction;
  
  // Entire application states for doing actual lookups & matches
  workOrders: WorkOrder[];
  transactions: Transaction[];
  properties: Property[];
  suppliers: Supplier[];

  // Mutator actions to reflect links or creation back to the parent container
  onUpdateWorkOrder?: (id: string, updated: Partial<WorkOrder>) => void;
  onUpdateTransaction?: (id: string, updated: Partial<Transaction>) => void;
  onAddTransaction?: (newTx: Transaction) => void;
  currentUser: string;
}

const MOCK_RECEPTION_PHOTOS = [
  { id: 'p1', name: 'Reparación de Tablero', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=60' },
  { id: 'p2', name: 'Instalación de Aire', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=60' },
  { id: 'p3', name: 'Terminación Pintado', url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=150&auto=format&fit=crop&q=60' }
];

const MOCK_RECEPTION_DOCS = [
  { name: 'Acta de Entrega Conforme N°412.pdf', size: '1.2 MB', url: 'https://example.com/acta_entrega_412.pdf' },
  { name: 'Guía de Recepción Técnica ERP.pdf', size: '412 KB', url: 'https://example.com/reception_jde.pdf' }
];

export const JDEContextualMenu: React.FC<JDEContextualMenuProps> = ({
  isOpen,
  onClose,
  contextType,
  selectedWorkOrder,
  selectedTransaction,
  workOrders,
  transactions,
  properties,
  suppliers,
  onUpdateWorkOrder,
  onUpdateTransaction,
  onAddTransaction,
  currentUser
}) => {
  if (!isOpen) return null;

  // TAB state in the One View menu
  const [activeTab, setActiveTab] = useState<'TRACE' | 'SPLIT_PAYROLL' | 'DETAILS'>('TRACE');

  // Local state for matching utilities
  const [typedInvoiceNumber, setTypedInvoiceNumber] = useState('');
  const [showInvoiceInput, setShowInvoiceInput] = useState(false);

  // Local state for mass payroll distribution (Nómina Inmobiliaria Enterprise)
  const [payrollRows, setPayrollRows] = useState<Array<{
    id: string;
    propertyId: string;
    amount: number;
    description: string;
  }>>([
    { id: '1', propertyId: '', amount: 0, description: 'Pago de Arriendo - Unidad 1' }
  ]);

  // ERP F4312 Reception states
  const [isReceptionFormOpen, setIsReceptionFormOpen] = useState(false);
  const [recPhotos, setRecPhotos] = useState<string[]>([]);
  const [recDocs, setRecDocs] = useState<Array<{ name: string; size: string; url: string }>>([]);
  const [localLineStatuses, setLocalLineStatuses] = useState<Record<string, 'PENDIENTE' | 'RECIBIDO'>>({});
  const [lastOtId, setLastOtId] = useState<string | null>(null);

  // General utility lookups
  const targetOT = useMemo(() => {
    if (contextType === 'WORK_ORDER') return selectedWorkOrder;
    // For transactions, try to find by workOrderId field
    if (selectedTransaction?.workOrderId) {
      return workOrders.find(ot => ot.id === selectedTransaction.workOrderId);
    }
    // Alternatively lookup by supplier & matching amount closely
    if (selectedTransaction?.type === 'EXPENSE' && selectedTransaction.supplierId) {
      return workOrders.find(ot => 
        ot.supplierId === selectedTransaction.supplierId && 
        Math.abs(ot.total - selectedTransaction.amount) < 100
      );
    }
    return undefined;
  }, [contextType, selectedWorkOrder, selectedTransaction, workOrders]);

  // 1. Account Payable Lookup / Match (F0411 Voucher)
  const matchedVoucher = useMemo(() => {
    const ot = targetOT;
    if (!ot) return undefined;
    
    // Lookup a transaction that acts as Accounts Payable (expense, pending or completed status, with linked workOrderId or same folio)
    return transactions.find(t => 
      t.workOrderId === ot.id || 
      (t.type === 'EXPENSE' && t.supplierId === ot.supplierId && t.documentNumber === ot.folio) ||
      (t.type === 'EXPENSE' && t.supplierId === ot.supplierId && t.description.includes(ot.folio))
    );
  }, [targetOT, transactions]);

  // 2. Matched Invoice Lookup (Factura Invoice)
  const matchedInvoice = useMemo(() => {
    const ot = targetOT;
    if (!ot) return undefined;

    // Direct invoice lookups
    if (ot.receptionInvoiceNumber) {
      return transactions.find(t => 
        t.type === 'EXPENSE' && 
        t.supplierId === ot.supplierId && 
        (t.documentNumber === ot.receptionInvoiceNumber || t.description.includes(ot.receptionInvoiceNumber))
      );
    }

    return transactions.find(t => 
      t.type === 'EXPENSE' && 
      t.supplierId === ot.supplierId && 
      (t.documentType === 'FACTURA' || t.description.toLowerCase().includes('factura')) &&
      Math.abs(t.amount - ot.total) < 100
    );
  }, [targetOT, transactions]);

  // 3. Outflow payment Lookup (Egreso Bancario)
  const matchedPayment = useMemo(() => {
    const ot = targetOT;
    if (!ot) return undefined;

    return transactions.find(t => 
      t.type === 'EXPENSE' && 
      t.supplierId === ot.supplierId && 
      t.status === 'COMPLETADA' &&
      (t.workOrderId === ot.id || (matchedVoucher && t.id === matchedVoucher.id) || Math.abs(t.amount - ot.total) < 100)
    );
  }, [targetOT, transactions, matchedVoucher]);


  // ERP-style reception flag computed check
  const isReceived = useMemo(() => {
    return !!(targetOT && (['RECEPCIONADA', 'RECEPCIONADA_PARCIAL', 'TERMINADA', 'PAGADA'].includes(targetOT.status)));
  }, [targetOT]);

  // Sync state with matching targetOT
  if (targetOT && targetOT.id !== lastOtId) {
    setLastOtId(targetOT.id);
    const init: Record<string, 'PENDIENTE' | 'RECIBIDO'> = {};
    targetOT.items.forEach(item => {
      init[item.id] = (item.status === 'RECIBIDO') ? 'RECIBIDO' : 'RECIBIDO'; // Default to received for streamlined flow
    });
    setLocalLineStatuses(init);
    setRecPhotos(targetOT.receptionPhotos || []);
    setRecDocs(targetOT.receptionDocuments || []);
  }

  const toggleLocalLineStatus = (itemId: string) => {
    setLocalLineStatuses(prev => ({
      ...prev,
      [itemId]: prev[itemId] === 'RECIBIDO' ? 'PENDIENTE' : 'RECIBIDO'
    }));
  };

  const handleProcessInlineReceipt = () => {
    if (!targetOT) return;
    
    if (recPhotos.length === 0) {
      alert("⚠️ PROTOCOLO DE AUDITORÍA: De acuerdo al protocolo corporativo ERP-ASSETFLOW, la recepción en terreno exige al menos un (1) registro fotográfico de terreno como respaldo de la ejecución física.");
      return;
    }
    
    if (recDocs.length === 0) {
      alert("⚠️ REQUISITO DE CONTROL: Debe acompañar al menos un (1) documento de respaldo físico (Guía de recepción, Acta o Certificado) adjunto.");
      return;
    }

    // Map lines status and received quantities
    const updatedItems = targetOT.items.map(item => ({
      ...item,
      receivedQuantity: localLineStatuses[item.id] === 'RECIBIDO' ? item.quantity : 0,
      status: (localLineStatuses[item.id] || 'PENDIENTE') as 'RECIBIDO' | 'PENDIENTE'
    }));

    const isFullyReceived = updatedItems.every(item => item.status === 'RECIBIDO');

    if (onUpdateWorkOrder) {
      onUpdateWorkOrder(targetOT.id, {
        items: updatedItems,
        status: isFullyReceived ? 'RECEPCIONADA' : 'RECEPCIONADA_PARCIAL',
        jdeLastStatus: isFullyReceived ? '290' : '280',
        jdeNextStatus: '300', // Ready for Facturación / Matches
        receptionDate: new Date().toISOString().split('T')[0],
        receptionUser: currentUser,
        receptionPhotos: recPhotos,
        receptionDocuments: recDocs,
      });
    }

    setIsReceptionFormOpen(false);
    alert(`🎉 ¡RECEPCIÓN TÉCNICA COMPLETADA (P4312)!\n\nLa OT Folio #${targetOT.folio} ha sido recepcionada exitosamente.\nSe han cargado ${recPhotos.length} fotos y ${recDocs.length} actas.\nEstado ERP ascendido a: ${isFullyReceived ? 'RECEPCIONADA (290)' : 'RECEPCIONADA PARCIAL (280)'}.`);
  };

  // RENT INCOME MATCH STATS
  const matchedLeaseContract = useMemo(() => {
    if (selectedTransaction?.type !== 'INCOME') return undefined;
    return properties.find(p => p.id === selectedTransaction.propertyId);
  }, [selectedTransaction, properties]);

  // Calculate stats for payroll (Nómina Inmobiliaria Enterprise)
  const isPayrollTransaction = useMemo(() => {
    if (!selectedTransaction) return false;
    const desc = selectedTransaction.description.toUpperCase();
    const sup = (selectedTransaction.supplierName || '').toUpperCase();
    return desc.includes('INMOBILIARIA') || desc.includes('NOMINA') || desc.includes('NÓMINA') || sup.includes('INMOBILIARIA');
  }, [selectedTransaction]);

  const totalDistributedAmount = useMemo(() => {
    return payrollRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [payrollRows]);

  const totalTransactionAmount = selectedTransaction?.amount || 0;
  const remainingAmountToDistribute = totalTransactionAmount - totalDistributedAmount;

  // MATCH COUNTERS FOR PROGRESS BAR ERP STYLE (5 STEPS)
  const matchedStepsCount = useMemo(() => {
    let count = 0;
    if (targetOT) count++; // Step 1: OT F4311
    if (isReceived) count++; // Step 2: Receipt F4312
    if (matchedVoucher) count++; // Step 3: AP Voucher F0411
    if (matchedInvoice || (targetOT && targetOT.receptionInvoiceNumber)) count++; // Step 4: Match Factura
    if (matchedPayment) count++; // Step 5: Disbursed Egreso F0414
    return count;
  }, [targetOT, isReceived, matchedVoucher, matchedInvoice, matchedPayment]);

  // AUTOMATED MATCH / LINK EVENT HANDLERS
  const handleGenerateVoucher = () => {
    if (!targetOT || !onAddTransaction) return;

    // Create an accounts payable (EXPENSE) transaction representation
    const newVoucher: Transaction = {
      id: 'TX_JDE_VOUCHER_' + Math.floor(Math.random() * 100000),
      description: `PROVISIÓN CUENTA POR PAGAR OT #${targetOT.folio} - ${targetOT.description || 'SERVICIOS'}`,
      amount: targetOT.total,
      category: 'PAGO A PROVEEDOR',
      type: 'EXPENSE',
      documentType: 'COMPROBANTE',
      documentNumber: targetOT.folio,
      date: new Date().toISOString().split('T')[0],
      invoiceDate: targetOT.issueDate || new Date().toISOString().split('T')[0],
      user: currentUser,
      timestamp: Date.now(),
      supplierId: targetOT.supplierId,
      supplierName: targetOT.supplierName,
      supplierTaxId: targetOT.supplierTaxId,
      propertyId: targetOT.propertyId,
      workOrderId: targetOT.id,
      status: 'PENDIENTE', // still waiting for check output
      programId: 'P0411', // ERP standard program for Vouchers
      batchNumber: 'B' + Math.floor(100000 + Math.random() * 900000),
      insuranceCompany: 'GENERALES',
      lockedBy: null,
      lockedAt: null
    };

    onAddTransaction(newVoucher);
    
    // Also log audit update
    if (onUpdateWorkOrder) {
      onUpdateWorkOrder(targetOT.id, { 
        jdeLastStatus: '290',
        jdeNextStatus: '300'
      });
    }

    alert(`CUENTA POR PAGAR (F0411 VOUCHER) GENERADA.\nLote ERP: ${newVoucher.batchNumber}\nFolio correspondiente: #${targetOT.folio}`);
  };

  const handleLinkInvoice = () => {
    if (!targetOT || !typedInvoiceNumber) return;

    if (targetOT.status !== 'RECEPCIONADA' && targetOT.status !== 'RECEPCIONADA_PARCIAL') {
      alert("⚠️ REQUISITO DE AUDITORÍA RECHAZADO: De acuerdo al protocolo corporativo ERP-ASSETFLOW, la Orden de Trabajo debe ser previamente RECEPCIONADA con actas, respaldos fotográficos y documentos conformes de terreno antes de poder vincular una factura fiscal.");
      return;
    }

    if (onUpdateWorkOrder) {
      onUpdateWorkOrder(targetOT.id, { 
        receptionInvoiceNumber: typedInvoiceNumber,
        status: 'TERMINADA',
        jdeLastStatus: '300',
        jdeNextStatus: '320' // Ready for egreso/payment
      });
    }

    // Try to find if there is a pending transaction representing this invoice, update its documentNumber
    const t = transactions.find(tx => tx.workOrderId === targetOT.id || (tx.type === 'EXPENSE' && tx.supplierId === targetOT.supplierId && tx.documentNumber === targetOT.folio));
    if (t && onUpdateTransaction) {
      onUpdateTransaction(t.id, { 
        documentType: 'FACTURA',
        documentNumber: typedInvoiceNumber 
      });
    }

    setShowInvoiceInput(false);
    setTypedInvoiceNumber('');
    alert(`FACTURA DE COMPRA #${typedInvoiceNumber} VINCULADA CORRECTAMENTE A LA OT Y PROVISIÓN.\nEstado ERP ascendido a: TERMINADA (Edo 300/320).`);
  };

  const handleEmitPayment = () => {
    if (!targetOT) return;

    const voucherToPay = matchedVoucher;
    if (voucherToPay && onUpdateTransaction) {
      // Mark it as PAID
      onUpdateTransaction(voucherToPay.id, { status: 'COMPLETADA' });
      alert(`EGRESO REGISTRADO. Cuenta por pagar liquidada en Tesorería.\nLote Balanceado ERP: ${voucherToPay.batchNumber}`);
    } else {
      // If no voucher exists, create a direct completed EXPENSE
      if (!onAddTransaction) return;
      const directPayment: Transaction = {
        id: 'TX_JDE_EGRESO_' + Math.floor(Math.random() * 100000),
        description: `EGRESO DIRECTO LIQUIDACIÓN OT #${targetOT.folio} - ${targetOT.supplierName}`,
        amount: targetOT.total,
        category: 'PAGO A PROVEEDOR',
        type: 'EXPENSE',
        documentType: 'FACTURA',
        documentNumber: targetOT.receptionInvoiceNumber || targetOT.folio,
        date: new Date().toISOString().split('T')[0],
        invoiceDate: new Date().toISOString().split('T')[0],
        user: currentUser,
        timestamp: Date.now(),
        supplierId: targetOT.supplierId,
        supplierName: targetOT.supplierName,
        supplierTaxId: targetOT.supplierTaxId,
        propertyId: targetOT.propertyId,
        workOrderId: targetOT.id,
        status: 'COMPLETADA',
        programId: 'P0413', // Payment post
        batchNumber: 'P' + Math.floor(100000 + Math.random() * 900000),
        insuranceCompany: 'GENERALES',
        lockedBy: null,
        lockedAt: null
      };
      onAddTransaction(directPayment);
      alert(`PAGO DIRECTO REGISTRADO EN LIBRO DIARIO.\nEgreso bancario emitido.`);
    }
  };

  // POLICE PAYROLL HANDLERS
  const addPayrollRow = () => {
    setPayrollRows(p => [
      ...p, 
      { id: String(Date.now() + Math.random()), propertyId: '', amount: 0, description: `Pago de Arriendo - Unidad ${p.length + 1}` }
    ]);
  };

  const removePayrollRow = (rowId: string) => {
    if (payrollRows.length === 1) return;
    setPayrollRows(p => p.filter(r => r.id !== rowId));
  };

  const updatePayrollRow = (rowId: string, field: 'propertyId' | 'amount' | 'description', val: any) => {
    setPayrollRows(prev => prev.map(r => {
      if (r.id === rowId) {
        if (field === 'amount') {
          return { ...r, amount: Number(val) };
        }
        if (field === 'propertyId') {
          // Auto fill description with property unit's details
          const prop = properties.find(p => p.id === val);
          const label = prop ? `${prop.building || 'Inmueble'} Depto ${prop.code}` : '';
          return { ...r, propertyId: val, description: `PAGO ALQUILER INMOBILIARIA - ${label}` };
        }
        return { ...r, [field]: val };
      }
      return r;
    }));
  };

  const handleConfirmPayrollDistribution = () => {
    if (!selectedTransaction || !onUpdateTransaction) return;

    if (Math.abs(remainingAmountToDistribute) > 10) {
      if (!confirm(`Hay una diferencia sin distribuir de $${remainingAmountToDistribute.toLocaleString('es-CL')}. ¿Desea confirmar de todas formas?`)) {
        return;
      }
    }

    // Embed distribution array in the metadata of the transaction
    onUpdateTransaction(selectedTransaction.id, {
      metadata: {
        ...(selectedTransaction.metadata || {}),
        isPayrollSplit: true,
        splitDistribution: payrollRows.map(r => ({
          propertyId: r.propertyId,
          propertyLabel: properties.find(p => p.id === r.propertyId)?.code || 'S/E',
          amount: r.amount,
          description: r.description
        }))
      },
      description: `NÓMINA INMOBILIARIA [DISTRIBUIDO ENTRE ${payrollRows.length} UNIDADES] - ${selectedTransaction.description}`
    });

    alert(`NÓMINA MASIVA DISTRIBUIDA EN SISTEMA DE GESTIÓN INTEGRADA ERP.\nSe han registrado ${payrollRows.length} imputaciones de arriendo exitosamente.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-[28px] border-8 border-slate-200 w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 font-sans">
        
        {/* WINDOW HEADER: ASSETFLOW ENTERPRISE STYLE IN BLUE */}
        <div className="bg-[#0B3C5D] text-white p-5 flex justify-between items-center relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 opacity-10 -mr-12 -mt-6 pointer-events-none">
            <Settings size={180} />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <Layers size={22} className="text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-md border border-blue-400/20">
                  CON_ONEVIEW_P0411_0911
                </span>
                <span className="text-[10px] font-bold text-slate-300">
                  Sistema de Gestión Integrada PropWork
                </span>
              </div>
              <h1 className="text-lg font-black uppercase tracking-tight mt-1 flex items-center gap-2">
                One View ERP - Menú Contextual
              </h1>
            </div>
          </div>
          <button 
            id="close-jde-modal-btn"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-all text-slate-300 hover:text-white relative z-50 cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* METRICS / TOP QUICK STATS BAR */}
        <div className="bg-white border-b border-slate-200 p-4 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-sans">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Registro Activo</span>
            <span className="text-[11px] font-black text-indigo-900 block uppercase truncate mt-0.5">
              {contextType === 'WORK_ORDER' ? `OT Folio #${selectedWorkOrder?.folio}` : `Docto #${selectedTransaction?.documentNumber || 'S/N'}`}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Imputación</span>
            <span className="text-[11px] font-black text-slate-800 block uppercase mt-0.5 truncate">
              {contextType === 'WORK_ORDER' ? selectedWorkOrder?.supplierName : selectedTransaction?.description}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Monto Total</span>
            <span className="text-[12px] font-black text-slate-950 block mt-0.5">
              ${(contextType === 'WORK_ORDER' ? selectedWorkOrder?.total : selectedTransaction?.amount || 0).toLocaleString('es-CL')}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Trazabilidad Total</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white ${
                contextType === 'WORK_ORDER' && matchedStepsCount === 5 ? 'bg-emerald-600' : 'bg-amber-600'
              }`}>
                {contextType === 'WORK_ORDER' ? `${matchedStepsCount}/5 PASOS` : 'NÓMINA GESTIÓN INTEGRADA'}
              </span>
            </div>
          </div>
        </div>

        {/* OPTION TABS FOR INTERACTION */}
        <div className="flex bg-[#f3f2f1] px-5 py-2 border-b border-slate-200 shrink-0 justify-between items-center font-sans gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('TRACE')}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'TRACE' ? 'bg-[#0B3C5D] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Trazabilidad de Conciliación ERP
            </button>
            
            {isPayrollTransaction && (
              <button
                onClick={() => setActiveTab('SPLIT_PAYROLL')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'SPLIT_PAYROLL' ? 'bg-[#0B3C5D] text-white shadow-sm' : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                }`}
              >
                <Split size={12} />
                Distribución de Nómina Inmobiliaria Enterprise
              </button>
            )}

            <button
              onClick={() => setActiveTab('DETAILS')}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'DETAILS' ? 'bg-[#0B3C5D] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ficha General & Log Diario (LE)
            </button>
          </div>

          <button
            onClick={() => {
              if (contextType === 'TRANSACTION' && selectedTransaction) {
                downloadJDETransactionVoucher({
                  transaction: selectedTransaction,
                  workOrder: targetOT,
                  currentUser
                });
              } else if (selectedWorkOrder) {
                downloadJDEWorkOrderVoucher({
                  workOrder: selectedWorkOrder,
                  currentUser
                });
              }
            }}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-md transition-all shrink-0"
            title="Descargar Comprobante Contable ERP PDF"
          >
            <Download size={12} />
            Descargar Comprobante PDF
          </button>
        </div>

        {/* CORE WORKFLOW AREA */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50 custom-audit-scroll font-sans">
          
          {/* TAB 1: TRACE / MATCH TRAIL */}
          {activeTab === 'TRACE' && (
            <div className="space-y-6">
              
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <ClipboardList size={16} className="text-[#0B3C5D]" />
                  Gráfico de Trazabilidad Cruzada: OT → Cuenta Por Pagar → Factura → Egreso
                </h3>
                
                {/* Visual Steps Map */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-2">
                  
                  {/* Step 1: Work Order */}
                  <div className="bg-[#0B3C5D]/5 border border-[#0B3C5D]/10 rounded-xl p-3 flex flex-col justify-between relative shadow-sm h-32">
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400">PASO 1</span>
                      <CheckCircle className="text-emerald-500" size={14} />
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-[#0B3C5D] bg-white border border-[#0B3C5D]/20 px-1.5 py-0.5 rounded block w-max uppercase tracking-wider">
                        F4311 (EMITIDO)
                      </span>
                      <span className="text-[11px] font-black text-slate-800 block mt-1">
                        OT #{targetOT?.folio || 'N/A'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                        ${targetOT?.total.toLocaleString('es-CL') || '0'}
                      </span>
                    </div>
                  </div>

                  {/* Step 2: Technical Receipt (F4312) */}
                  <div className={`border rounded-xl p-3 flex flex-col justify-between relative shadow-sm h-32 ${
                    isReceived ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-200/60'
                  }`}>
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400">PASO 2</span>
                      {isReceived ? (
                        <CheckCircle className="text-emerald-500" size={14} />
                      ) : (
                        <AlertCircle className="text-amber-500 animate-pulse" size={14} />
                      )}
                    </div>
                    <div>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded block w-max uppercase tracking-wider ${
                        isReceived ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' : 'bg-amber-100 text-amber-800 border border-amber-250'
                      }`}>
                        F4312 (RECEPT)
                      </span>
                      <span className="text-[11px] font-black text-slate-800 block mt-1 truncate">
                        {isReceived ? 'RECEPCIONADO' : 'REC_TERRENO PENDIENTE'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                        {isReceived ? 'Respaldos: Cárg.' : 'Falta acta/fotos'}
                      </span>
                    </div>
                  </div>

                  {/* Step 3: Cuenta x Pagar (Voucher) */}
                  <div className={`border rounded-xl p-3 flex flex-col justify-between relative shadow-sm h-32 ${
                    matchedVoucher ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-200/60'
                  }`}>
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400">PASO 3</span>
                      {matchedVoucher ? (
                        <CheckCircle className="text-emerald-500" size={14} />
                      ) : (
                        <AlertCircle className="text-amber-500 animate-pulse" size={14} />
                      )}
                    </div>
                    <div>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded block w-max uppercase tracking-wider ${
                        matchedVoucher ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' : 'bg-amber-100 text-amber-800 border-amber-250'
                      }`}>
                        F0411 (VOUCHER)
                      </span>
                      <span className="text-[11px] font-black text-slate-800 block mt-1 truncate">
                        {matchedVoucher ? `CxP #${matchedVoucher.documentNumber}` : 'PROVISIÓN PENDIENTE'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                        {matchedVoucher ? `Lote: ${matchedVoucher.batchNumber}` : 'Clave: Incompletada'}
                      </span>
                    </div>
                  </div>

                  {/* Step 4: Factura Match */}
                  <div className={`border rounded-xl p-3 flex flex-col justify-between relative shadow-sm h-32 ${
                    (matchedInvoice || (targetOT && targetOT.receptionInvoiceNumber)) ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-200/60'
                  }`}>
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400">PASO 4</span>
                      {(matchedInvoice || (targetOT && targetOT.receptionInvoiceNumber)) ? (
                        <CheckCircle className="text-emerald-500" size={14} />
                      ) : (
                        <AlertCircle className="text-amber-500" size={14} />
                      )}
                    </div>
                    <div>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded block w-max uppercase tracking-wider ${
                        (matchedInvoice || (targetOT && targetOT.receptionInvoiceNumber)) ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' : 'bg-amber-100 text-amber-800 border border-amber-250'
                      }`}>
                        FACTURA (MATCH)
                      </span>
                      <span className="text-[11px] font-black text-slate-800 block mt-1 truncate">
                        {targetOT?.receptionInvoiceNumber ? `N° Factura: ${targetOT.receptionInvoiceNumber}` : matchedInvoice ? `Factura #${matchedInvoice.documentNumber}` : 'INV-PENDIENTE'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                        {(matchedInvoice || targetOT?.receptionInvoiceNumber) ? 'Match: Ejecutado' : 'Sin match XML/F0411'}
                      </span>
                    </div>
                  </div>

                  {/* Step 5: Egreso Dispersion */}
                  <div className={`border rounded-xl p-3 flex flex-col justify-between relative shadow-sm h-32 ${
                    matchedPayment ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-[#f3f2f1]'
                  }`}>
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400">PASO 5</span>
                      {matchedPayment ? (
                        <CheckCircle className="text-emerald-500" size={14} />
                      ) : (
                        <AlertCircle className="text-amber-500" size={14} />
                      )}
                    </div>
                    <div>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded block w-max uppercase tracking-wider ${
                        matchedPayment ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' : 'bg-slate-200 text-slate-700'
                      }`}>
                        F0414 (EGRESO BANCO)
                      </span>
                      <span className="text-[11px] font-black text-slate-800 block mt-1 truncate">
                        {matchedPayment ? `Pago Realizado` : 'EGRESO SIN EFECTUAR'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                        {matchedPayment ? `F. Pago: ${matchedPayment.date}` : 'Espera dispersión'}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* ACTION CENTER UNDER WORKFLOW */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  Acciones de Imputación Manual (Gestión Integrada One View)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  
                  {/* Action 0: Physical Reception ERP P4312 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#0B3C5D] block">RECEPCIÓN TÉCNICA F4312</span>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                        Sube respaldos de terreno, acta de entrega conforme y valida las líneas físicas de obra para poder habilitar la facturación.
                      </p>
                    </div>
                    
                    {isReceptionFormOpen ? (
                      <div className="border border-slate-200 bg-white p-3 rounded-lg space-y-2.5 shadow-sm">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase text-slate-400">Verificar Líneas:</p>
                          {targetOT?.items.map(item => {
                            const isLineDone = localLineStatuses[item.id] === 'RECIBIDO';
                            return (
                              <button 
                                key={item.id}
                                type="button"
                                onClick={() => toggleLocalLineStatus(item.id)}
                                className={`text-[8.5px] font-black uppercase flex items-center justify-between w-full p-1 border rounded text-left ${
                                  isLineDone ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}
                              >
                                <span className="truncate flex-1 max-w-[120px]">{item.description}</span>
                                <span className="text-[7px] shrink-0 font-bold">{isLineDone ? '✔️' : '◦'}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase text-slate-400">Fotos Terreno ({recPhotos.length}):</p>
                          <div className="flex gap-1">
                            {MOCK_RECEPTION_PHOTOS.map((ph) => (
                              <button 
                                key={ph.id}
                                type="button"
                                onClick={() => {
                                  if (recPhotos.includes(ph.url)) {
                                    setRecPhotos(prev => prev.filter(u => u !== ph.url));
                                  } else {
                                    setRecPhotos(prev => [...prev, ph.url]);
                                  }
                                }}
                                className={`border rounded overflow-hidden w-7 h-7 relative ${
                                  recPhotos.includes(ph.url) ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200'
                                }`}
                                title={ph.name}
                              >
                                <img src={ph.url} alt={ph.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase text-slate-400">Acta Adjunta ({recDocs.length}):</p>
                          <div className="flex gap-1">
                            {MOCK_RECEPTION_DOCS.map((doc, idx) => {
                              const isAttached = recDocs.some(d => d.name === doc.name);
                              return (
                                <button 
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (isAttached) {
                                      setRecDocs(prev => prev.filter(d => d.name !== doc.name));
                                    } else {
                                      setRecDocs(prev => [...prev, doc]);
                                    }
                                  }}
                                  className={`text-[8px] font-bold uppercase rounded px-1.5 py-0.5 flex-1 text-center border truncate max-w-[80px] ${
                                    isAttached ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  {doc.name.substring(0, 6)}...
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex gap-1 pt-1.5">
                          <button 
                            type="button"
                            onClick={handleProcessInlineReceipt}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-black uppercase tracking-wider flex-1 py-1"
                          >
                            Recibir
                          </button>
                          <button 
                            type="button"
                            onClick={() => setIsReceptionFormOpen(false)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[9px] font-bold uppercase px-2 py-1"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsReceptionFormOpen(true)}
                        disabled={isReceived}
                        className="w-full bg-[#0B3C5D] hover:bg-indigo-900 disabled:bg-slate-200 text-white disabled:text-slate-400 font-extrabold text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all shadow"
                      >
                        {isReceived ? 'OT RECEPCIONADA ✓' : '1. Recibir OT Terreno'}
                      </button>
                    )}
                  </div>

                  {/* Action 1: Create AP Voucher */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#0B3C5D] block">VOUCHER PROVISIÓN F0411</span>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                        Crea la obligación de pago (Cuenta por pagar de devengo) basada en los items aprobados de la OT.
                      </p>
                    </div>
                    <button 
                      onClick={handleGenerateVoucher}
                      disabled={!!matchedVoucher}
                      className="w-full bg-[#0B3C5D] hover:bg-indigo-900 disabled:bg-slate-200 text-white disabled:text-slate-400 font-extrabold text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all shadow"
                    >
                      {matchedVoucher ? 'YA PROVISIONADO (PASO 3 ✓)' : '2. Generar Cuenta por Pagar'}
                    </button>
                  </div>

                  {/* Action 2: Link Invoice */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#0B3C5D] block">VINCULAR FACTURA DE PROVEEDOR</span>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                        Asocia el número de factura fiscal recibido por el proveedor para liquidar el match de conciliación.
                      </p>
                    </div>
                    {showInvoiceInput ? (
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="Número de Factura, Ej: 90210" 
                          value={typedInvoiceNumber}
                          onChange={e => setTypedInvoiceNumber(e.target.value)}
                          className="w-full text-[11px] px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#0B3C5D] font-bold"
                        />
                        <div className="flex gap-1">
                          <button 
                            onClick={handleLinkInvoice}
                            className="bg-emerald-600 text-white rounded px-3 py-1 text-[10px] font-black uppercase tracking-wider flex-1"
                          >
                            Vincular
                          </button>
                          <button 
                            onClick={() => setShowInvoiceInput(false)}
                            className="bg-slate-200 text-slate-700 rounded px-2 py-1 text-[10px] font-bold uppercase"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 w-full">
                        {targetOT && targetOT.status !== 'RECEPCIONADA' && targetOT.status !== 'RECEPCIONADA_PARCIAL' && !targetOT.receptionInvoiceNumber && (
                          <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-[10px] text-amber-800 font-extrabold uppercase leading-relaxed flex items-center gap-1.5 animate-pulse">
                             <span>🚨 PROTOCOLO: OT DEBE SER RECEPCIONADA CON RESPALDOS ANTES DE VINCULAR FACTURA</span>
                          </div>
                        )}
                        <button 
                          onClick={() => {
                            if (targetOT && targetOT.status !== 'RECEPCIONADA' && targetOT.status !== 'RECEPCIONADA_PARCIAL') {
                              alert("⚠️ REQUISITO DE AUDITORÍA RECHAZADO: De acuerdo al protocolo corporativo ERP-ASSETFLOW, la Orden de Trabajo debe ser previamente RECEPCIONADA con actas, respaldos fotográficos y documentos conformes de terreno antes de poder vincular una factura fiscal.");
                              return;
                            }
                            setShowInvoiceInput(true);
                          }}
                          disabled={!!targetOT?.receptionInvoiceNumber}
                          className={`w-full font-extrabold text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all shadow text-white ${
                            targetOT && targetOT.status !== 'RECEPCIONADA' && targetOT.status !== 'RECEPCIONADA_PARCIAL' && !targetOT.receptionInvoiceNumber
                              ? 'bg-slate-400 cursor-not-allowed hover:bg-slate-500'
                              : 'bg-[#0B3C5D] hover:bg-indigo-900 disabled:bg-slate-200 disabled:text-slate-400'
                          }`}
                        >
                          {targetOT?.receptionInvoiceNumber ? 'Factura Vinculada ✓' : '3. Vincular Factura XML/PDF'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action 3: Emit Outflow Payment */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#0B3C5D] block">EFECTUAR EGRESO BANCARIO</span>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                        Dispensa los fondos al proveedor, cerrando la Cuenta por Pagar de devengo y registrando el egreso contable.
                      </p>
                    </div>
                    <button 
                      onClick={handleEmitPayment}
                      disabled={!!matchedPayment}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-extrabold text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all shadow"
                    >
                      {matchedPayment ? 'PAGO EFECTUADO (PASO 5 ✓)' : '4. Registrar Egreso (F0414)'}
                    </button>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB 2: SPECIAL POLICE RENT PAYROLL SPLITTER */}
          {activeTab === 'SPLIT_PAYROLL' && isPayrollTransaction && (
            <div className="space-y-6">
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2 text-emerald-950">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-900">
                  <Shield size={16} />
                  Módulo de Conciliación de Nómina Masiva Inmobiliaria Enterprise
                </h3>
                <p className="text-[11px] font-medium leading-relaxed">
                  Inmobiliaria Enterprise realiza un depósito consolidated (Nómina Integral de Conjuntos) que representa el arriendo de varias unidades inmobiliarias a lo largo de múltiples conjuntos de propiedades.
                  Use esta grilla de distribución para imputar sub-montos de forma contable directa en el diario ERP.
                </p>
              </div>

              {/* SPLIT BALANCER ROW */}
              <div className="grid grid-cols-3 gap-4 font-sans shrink-0">
                <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nómina Recibida</span>
                  <span className="text-base font-black text-slate-900 mt-1">
                    ${totalTransactionAmount.toLocaleString('es-CL')}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Distribuido</span>
                  <span className="text-base font-black text-emerald-600 mt-1">
                    ${totalDistributedAmount.toLocaleString('es-CL')}
                  </span>
                </div>
                <div className={`border p-4 rounded-xl flex flex-col ${
                  remainingAmountToDistribute === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <span className="text-[9px] font-bold uppercase tracking-widest">Saldo Sin Asignar</span>
                  <span className={`text-base font-black mt-1 ${
                    remainingAmountToDistribute === 0 ? 'text-emerald-700' : 'text-amber-800'
                  }`}>
                    ${remainingAmountToDistribute.toLocaleString('es-CL')}
                  </span>
                </div>
              </div>

              {/* DYNAMIC ERP BULK GRID FOR PAYROLL ITEMS */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                    Distribución de Desglose Imputaciones Inmobiliaria Enterprise
                  </h4>
                  <button 
                    onClick={addPayrollRow}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                  >
                    <Plus size={11} />
                    Añadir Unidad
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {payrollRows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50 border border-slate-200 rounded-xl p-3">
                      
                      <div className="md:col-span-1 text-center font-bold text-[10px] text-slate-400 font-mono">
                        #{index + 1}
                      </div>

                      <div className="md:col-span-3">
                        <select
                          value={row.propertyId}
                          onChange={e => updatePayrollRow(row.id, 'propertyId', e.target.value)}
                          className="w-full text-[11px] font-bold text-slate-700 border border-slate-250 bg-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                        >
                          <option value="">Seleccione Depto/Unidad...</option>
                          {properties.map(pr => (
                            <option key={pr.id} value={pr.id}>
                              {pr.building ? `${pr.building} - ` : ''} Depto {pr.code} ({pr.commune})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <input 
                          type="text"
                          value={row.description}
                          onChange={e => updatePayrollRow(row.id, 'description', e.target.value)}
                          placeholder="Descripción imputación"
                          className="w-full text-[11px] font-medium text-slate-700 border border-slate-250 bg-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                        />
                      </div>

                      <div className="md:col-span-3 relative">
                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-[11px] font-extrabold">$</span>
                        <input 
                          type="number"
                          value={row.amount || ''}
                          onChange={e => updatePayrollRow(row.id, 'amount', e.target.value)}
                          placeholder="Monto, ej: 1500000"
                          className="w-full text-[11px] font-black text-slate-800 border border-slate-250 bg-white rounded-lg p-2 pl-6 focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                        />
                      </div>

                      <div className="md:col-span-2 text-center">
                        <button 
                          onClick={() => removePayrollRow(row.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                          title="Eliminar fila"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>

                <div className="pt-5 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmPayrollDistribution}
                    className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shadow-emerald-500/10"
                  >
                    Confirmar Distribución Contable
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: DRILL-DOWN ADDITIONAL METADATA */}
          {activeTab === 'DETAILS' && (
            <div className="space-y-6 font-sans">
              
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Info size={16} className="text-[#0B3C5D]" />
                  Ficha de Registro de Gestión Integrada PropWork
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">ID de Seguridad del Sistema</span>
                    <span className="text-slate-700 font-mono text-[10px] block">{contextType === 'WORK_ORDER' ? selectedWorkOrder?.id : selectedTransaction?.id}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Lote de Balanza Automatizada</span>
                    <span className="text-slate-700 font-mono text-[10px] block">
                      {contextType === 'WORK_ORDER' ? 'F4311-SEQ01' : selectedTransaction?.batchNumber || 'SIN REGISTRAR'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Usuario Preparador (Auditado)</span>
                    <span className="text-slate-700 text-[11px] font-black uppercase block">
                      {contextType === 'WORK_ORDER' ? selectedWorkOrder?.preparedBy : selectedTransaction?.user}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Firma Criptográfica</span>
                    <span className="text-slate-500 font-mono text-[9px] block truncate">
                      {contextType === 'WORK_ORDER' ? 'SHA256:8f4ac9b81f12ecd3c02' : selectedTransaction?.hashSignature || 'SHA255:NONE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit trail */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Bitácora de Imputaciones</h4>
                
                <div className="text-[10px] font-mono text-slate-500 space-y-1">
                  <div>[2026-05-22 10:11:00] INIT: Apertura de sesión OneView por {currentUser}</div>
                  <div>[2026-05-22 11:21:44] CHECK: Verificación de cuentas por pagar cruzando Folio fiscal</div>
                  {matchedVoucher && (
                    <div className="text-emerald-700">[2026-05-22 12:44:11] VALID: Voucher de devengo F0411 localizado en base ({matchedVoucher.id})</div>
                  )}
                  {matchedPayment && (
                    <div className="text-emerald-700">[2026-05-22 12:44:12] COMPLETED: Pago egreso F0414 verificado en libro diario</div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* BOTTOM STATUS BAR */}
        <div className="bg-slate-100 hover:bg-slate-200/60 p-3 flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest border-t border-slate-200 shrink-0 select-none">
          <div>
            Terminal: <span className="font-mono text-slate-800">{selectedTransaction?.workStationId || 'MKEY-DEV-CONTAINER'}</span>
          </div>
          <div>
            Estado de Libro: <span className="text-slate-800 font-mono">CONCILIADO PARCIAL</span>
          </div>
        </div>

      </div>
    </div>
  );
};
