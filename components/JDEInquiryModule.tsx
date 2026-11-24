import React, { useState, useMemo } from 'react';
import { 
  WorkOrder, 
  WorkOrderLineItem, 
  Supplier, 
  Property, 
  Transaction, 
  LeaseContract,
  UserRole 
} from '../types';
import { 
  JDE_LINE_STATUS_UDC, 
  evaluateWorkOrderStatusFromLines, 
  approveWorkOrderLine, 
  rejectWorkOrderLine, 
  holdWorkOrderLine, 
  approveAllPendingLines 
} from '../lib/jdeLineApprovalService';
import { formatCLP, formatRUT } from '../lib/chileanUtils';
import { exportToExcel } from '../lib/excelExport';
import { printHtmlElement } from '../lib/printDocument';
import { JDEGridContextMenu } from './JDEGridContextMenu';
import { JDELineApprovalModal } from './JDELineApprovalModal';
import { SupplierForm } from './SupplierForm';
import { 
  Plus,
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Printer, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Eye, 
  FileText, 
  Building2, 
  Users, 
  CreditCard, 
  Activity, 
  Receipt, 
  CheckSquare, 
  SlidersHorizontal, 
  ArrowUpDown, 
  ChevronRight,
  ShieldCheck,
  Table,
  BookOpen,
  MoreVertical
} from 'lucide-react';

export type JDEInquiryTab = 'P43214_ORDERS' | 'P43081_APPROVALS' | 'P042004_SUPPLIERS' | 'P09200_LEDGER' | 'P4312Q_3WAY' | 'P1501Q_REALESTATE';

interface JDEInquiryModuleProps {
  workOrders: WorkOrder[];
  suppliers: Supplier[];
  properties: Property[];
  transactions: Transaction[];
  leaseContracts?: LeaseContract[];
  currentUser: string;
  userRole?: UserRole;
  onSaveWorkOrder: (order: WorkOrder) => void;
  onViewOrderDetail?: (order: WorkOrder) => void;
  onOpenReception?: (order: WorkOrder) => void;
  onAddSupplier?: (supplier: Supplier) => void;
}

export const JDEInquiryModule: React.FC<JDEInquiryModuleProps> = ({
  workOrders,
  suppliers,
  properties,
  transactions,
  leaseContracts = [],
  currentUser,
  userRole = 'JEFE',
  onSaveWorkOrder,
  onViewOrderDetail,
  onOpenReception,
  onAddSupplier,
}) => {
  const [activeTab, setActiveTab] = useState<JDEInquiryTab>('P43214_ORDERS');
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  
  // P43214 View Mode: 'LINES' (F4311 Detalle de Líneas) vs 'HEADER' (F4801/F4301 Resumen Órdenes)
  const [p43214ViewMode, setP43214ViewMode] = useState<'LINES' | 'HEADER'>('LINES');

  // QBE (Query-By-Example) Filter States
  const [filterFolio, setFilterFolio] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterStatusCode, setFilterStatusCode] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterSpecialty, setFilterSpecialty] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchGeneral, setSearchGeneral] = useState('');

  // Selected Order for Line Approval Modal (P43081)
  const [selectedOrderForLineApproval, setSelectedOrderForLineApproval] = useState<WorkOrder | null>(null);

  // Selected Order for Full Document Preview
  const [selectedOrderForPreview, setSelectedOrderForPreview] = useState<WorkOrder | null>(null);

  // Context Menu State (supporting orders, suppliers, transactions, and properties)
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    order?: WorkOrder;
    supplier?: Supplier;
    tx?: Transaction;
    property?: Property;
  } | null>(null);

  // Column width states for interactive mouse drag resizing (authentic AssetFlow Enterprise grid)
  const [colWidthsLines, setColWidthsLines] = useState<{ [key: string]: number }>({
    idx: 45,
    folio: 110,
    lineNum: 55,
    description: 250,
    quantity: 65,
    unitPrice: 110,
    total: 115,
    status: 140,
    supplier: 160,
    property: 160,
    associatedDoc: 120,
    actions: 105,
  });

  const [colWidthsHeader, setColWidthsHeader] = useState<{ [key: string]: number }>({
    idx: 45,
    folio: 110,
    date: 95,
    supplier: 180,
    property: 170,
    category: 130,
    specialty: 130,
    total: 115,
    status: 140,
    linesCount: 75,
    actions: 105,
  });

  const [colWidthsApprovals, setColWidthsApprovals] = useState<{ [key: string]: number }>({
    idx: 45,
    folio: 110,
    lineNum: 55,
    description: 250,
    quantity: 65,
    unitPrice: 110,
    total: 115,
    supplier: 160,
    property: 160,
    actions: 170,
  });

  const [colWidthsSuppliers, setColWidthsSuppliers] = useState<{ [key: string]: number }>({
    rut: 110,
    name: 240,
    orders: 75,
    gross: 130,
    tax: 120,
    paid: 120,
    pending: 130,
    status: 120,
    actions: 80,
  });

  const [colWidthsLedger, setColWidthsLedger] = useState<{ [key: string]: number }>({
    idx: 45,
    date: 95,
    docNumber: 120,
    account: 120,
    description: 260,
    property: 140,
    debit: 115,
    credit: 115,
    actions: 75,
  });

  const [colWidths3Way, setColWidths3Way] = useState<{ [key: string]: number }>({
    folio: 110,
    supplier: 170,
    amountPO: 120,
    reception: 160,
    invoice: 160,
    matchStatus: 180,
    actions: 110,
  });

  const [colWidthsRealEstate, setColWidthsRealEstate] = useState<{ [key: string]: number }>({
    code: 110,
    name: 220,
    address: 200,
    role: 95,
    appraisal: 120,
    tenant: 180,
    rent: 120,
    openOTs: 85,
    status: 140,
    actions: 80,
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

  // Reset all filters
  const handleClearFilters = () => {
    setFilterFolio('');
    setFilterSupplier('');
    setFilterProperty('');
    setFilterStatusCode('ALL');
    setFilterCategory('ALL');
    setFilterSpecialty('ALL');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchGeneral('');
  };

  // Flattened Work Order Lines for P43214 Lines View
  const flattenedLines = useMemo(() => {
    const list: Array<{
      order: WorkOrder;
      line: WorkOrderLineItem;
      lineIndex: number;
    }> = [];

    workOrders.forEach((order) => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((line, idx) => {
          list.push({ order, line, lineIndex: idx });
        });
      } else {
        // Fallback for orders without explicit items array
        list.push({
          order,
          line: {
            id: `${order.id}-0`,
            description: 'SERVICIO / ADQUISICIÓN GENERAL',
            quantity: 1,
            receivedQuantity: order.status === 'RECEPCIONADA' ? 1 : 0,
            unitPrice: order.subtotal || order.total,
            total: order.subtotal || order.total,
            status: (order.status === 'APROBADA' || order.status === 'EMITIDA_IMPRESA' ? 'APROBADA' : 'PENDIENTE_VB'),
            lineStatusCode: order.jdeNextStatus || '220',
          },
          lineIndex: 0,
        });
      }
    });

    return list;
  }, [workOrders]);

  // Filtered Lines for P43214 Lines View
  const filteredLines = useMemo(() => {
    return flattenedLines.filter(({ order, line }) => {
      // General search
      if (searchGeneral) {
        const term = searchGeneral.toLowerCase();
        const matchFolio = order.folio?.toLowerCase().includes(term);
        const matchDesc = line.description?.toLowerCase().includes(term);
        const matchSup = order.supplierName?.toLowerCase().includes(term);
        const matchRut = order.supplierTaxId?.toLowerCase().includes(term);
        const matchProp = order.propertyLabel?.toLowerCase().includes(term);
        const matchInv = order.associatedInvoice?.toLowerCase().includes(term);
        if (!matchFolio && !matchDesc && !matchSup && !matchRut && !matchProp && !matchInv) {
          return false;
        }
      }

      // Column filters
      if (filterFolio && !order.folio?.toLowerCase().includes(filterFolio.toLowerCase())) {
        return false;
      }
      if (filterSupplier && !order.supplierName?.toLowerCase().includes(filterSupplier.toLowerCase()) && !order.supplierTaxId?.includes(filterSupplier)) {
        return false;
      }
      if (filterProperty && !order.propertyLabel?.toLowerCase().includes(filterProperty.toLowerCase())) {
        return false;
      }
      if (filterCategory !== 'ALL' && order.category !== filterCategory) {
        return false;
      }
      if (filterSpecialty !== 'ALL' && order.specialty !== filterSpecialty) {
        return false;
      }
      if (filterStatusCode !== 'ALL') {
        const code = line.lineStatusCode || (line.status === 'APROBADA' ? '230' : line.status === 'RECHAZADA' ? '999' : '220');
        if (code !== filterStatusCode) return false;
      }
      if (filterDateFrom && order.issueDate < filterDateFrom) {
        return false;
      }
      if (filterDateTo && order.issueDate > filterDateTo) {
        return false;
      }

      return true;
    });
  }, [flattenedLines, searchGeneral, filterFolio, filterSupplier, filterProperty, filterCategory, filterSpecialty, filterStatusCode, filterDateFrom, filterDateTo]);

  // Filtered Orders for P43214 Header View
  const filteredOrders = useMemo(() => {
    return workOrders.filter((order) => {
      if (searchGeneral) {
        const term = searchGeneral.toLowerCase();
        const matchFolio = order.folio?.toLowerCase().includes(term);
        const matchSup = order.supplierName?.toLowerCase().includes(term);
        const matchRut = order.supplierTaxId?.toLowerCase().includes(term);
        const matchProp = order.propertyLabel?.toLowerCase().includes(term);
        const matchInv = order.associatedInvoice?.toLowerCase().includes(term);
        if (!matchFolio && !matchSup && !matchRut && !matchProp && !matchInv) {
          return false;
        }
      }

      if (filterFolio && !order.folio?.toLowerCase().includes(filterFolio.toLowerCase())) {
        return false;
      }
      if (filterSupplier && !order.supplierName?.toLowerCase().includes(filterSupplier.toLowerCase()) && !order.supplierTaxId?.includes(filterSupplier)) {
        return false;
      }
      if (filterProperty && !order.propertyLabel?.toLowerCase().includes(filterProperty.toLowerCase())) {
        return false;
      }
      if (filterCategory !== 'ALL' && order.category !== filterCategory) {
        return false;
      }
      if (filterSpecialty !== 'ALL' && order.specialty !== filterSpecialty) {
        return false;
      }
      if (filterStatusCode !== 'ALL') {
        const orderCode = order.jdeNextStatus || (order.status === 'APROBADA' ? '230' : order.status === 'EMITIDA_IMPRESA' ? '280' : '220');
        if (orderCode !== filterStatusCode) return false;
      }
      if (filterDateFrom && order.issueDate < filterDateFrom) {
        return false;
      }
      if (filterDateTo && order.issueDate > filterDateTo) {
        return false;
      }

      return true;
    });
  }, [workOrders, searchGeneral, filterFolio, filterSupplier, filterProperty, filterCategory, filterSpecialty, filterStatusCode, filterDateFrom, filterDateTo]);

  // Lines Pending Approval for P43081 Workbench
  const pendingApprovalLines = useMemo(() => {
    return flattenedLines.filter(({ line }) => {
      return line.status === 'PENDIENTE_VB' || line.status === 'PENDIENTE' || line.status === 'EN_OBSERVACION';
    });
  }, [flattenedLines]);

  // Total KPIs
  const kpis = useMemo(() => {
    const totalOrdersCount = workOrders.length;
    const totalLinesCount = flattenedLines.length;
    const totalPendingLines = pendingApprovalLines.length;
    const totalApprovedLines = flattenedLines.filter(l => l.line.status === 'APROBADA').length;
    const totalRejectedLines = flattenedLines.filter(l => l.line.status === 'RECHAZADA').length;
    const totalAmountCLP = workOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const approvedAmountCLP = flattenedLines
      .filter(l => l.line.status === 'APROBADA')
      .reduce((sum, l) => sum + (l.line.total || 0), 0);

    return {
      totalOrdersCount,
      totalLinesCount,
      totalPendingLines,
      totalApprovedLines,
      totalRejectedLines,
      totalAmountCLP,
      approvedAmountCLP,
    };
  }, [workOrders, flattenedLines, pendingApprovalLines]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (activeTab === 'P43214_ORDERS' && p43214ViewMode === 'LINES') {
      const exportRows = filteredLines.map(({ order, line, lineIndex }) => ({
        Folio_OT: order.folio,
        Linea_Nro: lineIndex + 1,
        Descripcion: line.description,
        Cantidad: line.quantity,
        Precio_Unitario_CLP: line.unitPrice,
        Total_Linea_CLP: line.total,
        Estado_Linea_JDE: line.status,
        Codigo_UDC: line.lineStatusCode || (line.status === 'APROBADA' ? '230' : line.status === 'RECHAZADA' ? '999' : '220'),
        Aprobador: line.approvedBy || 'PENDIENTE',
        Fecha_Aprobacion: line.approvalDate || '',
        Motivo_Rechazo: line.rejectionReason || '',
        Proveedor: order.supplierName,
        RUT_Proveedor: order.supplierTaxId,
        Inmueble_Unidad: order.propertyLabel,
        Categoria: order.category || 'MANTENCIÓN PREVENTIVA',
        Especialidad: order.specialty || 'TECHUMBRES',
        Factura_Asociada: order.associatedInvoice || '',
        Fecha_Emision: order.issueDate,
      }));
      exportToExcel(exportRows, `JDE_P43214_Consulta_Lineas_${new Date().toISOString().split('T')[0]}`);
    } else {
      const exportRows = filteredOrders.map((order) => ({
        Folio_OT: order.folio,
        Fecha: order.issueDate,
        Proveedor: order.supplierName,
        RUT: order.supplierTaxId,
        Inmueble: order.propertyLabel,
        Categoria: order.category,
        Especialidad: order.specialty,
        Factura_Asociada: order.associatedInvoice,
        Subtotal_CLP: order.subtotal,
        Total_CLP: order.total,
        Estado_OT: order.status,
        JDE_Last_Status: order.jdeLastStatus || '220',
        JDE_Next_Status: order.jdeNextStatus || '230',
        Solicitado_Por: order.preparedBy,
        Autorizado_Por: order.authorizedBy || '',
      }));
      exportToExcel(exportRows, `JDE_P43214_Consulta_Ordenes_${new Date().toISOString().split('T')[0]}`);
    }
  };

  // Print Report Handler
  const handlePrintReport = () => {
    printHtmlElement('jde-inquiry-report-area', `JDE_Reporte_Consultas_${activeTab}`);
  };

  // Batch Approval for P43081
  const handleApproveAllPending = () => {
    if (!window.confirm('¿Confirma aprobar todas las órdenes y líneas pendientes con su firma digital?')) return;
    
    // Group pending lines by order
    const ordersToUpdate = new Map<string, WorkOrder>();
    pendingApprovalLines.forEach(({ order }) => {
      if (!ordersToUpdate.has(order.id)) {
        ordersToUpdate.set(order.id, order);
      }
    });

    ordersToUpdate.forEach((order) => {
      const updated = approveAllPendingLines(order, currentUser);
      onSaveWorkOrder(updated);
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#F4F8FB] select-none text-slate-800 font-sans">
      
      {/* ERP TOP BANNER & ACTION BAR */}
      <div className="bg-[#0B3C5D] text-white border-b-2 border-[#D97706] shadow-md shrink-0">
        <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg border border-white/20">
              <Layers className="text-[#FBBF24] h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#FBBF24] uppercase bg-black/40 px-2 py-0.5 rounded">
                  ASSETFLOW ENTERPRISE
                </span>
                <span className="text-[10px] text-slate-300 font-mono">PROD_ENV • CLT CHILE</span>
              </div>
              <h1 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2 mt-0.5">
                Centro Integral de Consultas Interconectadas
              </h1>
            </div>
          </div>

          {/* ERP TOOLBAR BUTTONS */}
          <div className="flex flex-wrap items-center gap-2">
            {onAddSupplier && (
              <button
                onClick={() => setIsSupplierFormOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 shadow-sm border border-emerald-400 transition-all cursor-pointer"
                title="Crear Nuevo Proveedor en Libro de Direcciones (F0101) y Maestro de Proveedores (F0401)"
              >
                <Plus size={14} /> + Agregar Nuevo Proveedor (P01012)
              </button>
            )}
            <button
              onClick={handleClearFilters}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
              title="Limpiar todos los filtros de búsqueda"
            >
              <RefreshCw size={13} /> Limpiar
            </button>
            <button
              onClick={handleExportExcel}
              className="bg-emerald-700 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 shadow-xs border border-emerald-500 transition-all cursor-pointer"
              title="Exportar grilla activa a archivo Excel (.xlsx)"
            >
              <Download size={13} /> Exportar Excel
            </button>
            <button
              onClick={handlePrintReport}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 shadow-xs border border-slate-500 transition-all cursor-pointer"
              title="Imprimir informe en formato columnar oficial ERP"
            >
              <Printer size={13} /> Imprimir UBE
            </button>
          </div>
        </div>

        {/* ERP PROGRAM TABS */}
        <div className="px-5 flex gap-1 overflow-x-auto text-xs font-bold border-t border-white/10 pt-1">
          <button
            onClick={() => setActiveTab('P43214_ORDERS')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'P43214_ORDERS'
                ? 'border-[#FBBF24] text-white bg-white/15'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={14} className="text-[#FBBF24]" />
            <span>P43214: Consulta de Órdenes y Líneas F4311</span>
          </button>

          <button
            onClick={() => setActiveTab('P43081_APPROVALS')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'P43081_APPROVALS'
                ? 'border-[#FBBF24] text-white bg-white/15'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck size={14} className="text-amber-400" />
            <span>P43081: Mesa de Aprobación por Líneas</span>
            {kpis.totalPendingLines > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {kpis.totalPendingLines}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('P042004_SUPPLIERS')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'P042004_SUPPLIERS'
                ? 'border-[#FBBF24] text-white bg-white/15'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={14} className="text-sky-300" />
            <span>P042004: Mayor Proveedores & DTE (AP)</span>
          </button>

          <button
            onClick={() => setActiveTab('P09200_LEDGER')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'P09200_LEDGER'
                ? 'border-[#FBBF24] text-white bg-white/15'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={14} className="text-emerald-300" />
            <span>P09200: Mayor General F0911 (GL)</span>
          </button>

          <button
            onClick={() => setActiveTab('P4312Q_3WAY')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'P4312Q_3WAY'
                ? 'border-[#FBBF24] text-white bg-white/15'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity size={14} className="text-purple-300" />
            <span>P4312Q: Cruce 3-Vías (OT / Bodega / DTE)</span>
          </button>

          <button
            onClick={() => setActiveTab('P1501Q_REALESTATE')}
            className={`px-4 py-2 border-b-2 font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'P1501Q_REALESTATE'
                ? 'border-[#FBBF24] text-white bg-white/15'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 size={14} className="text-teal-300" />
            <span>P1501Q: Consulta Inmobiliaria & Arriendos</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS STRIP */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 shrink-0 text-xs shadow-2xs">
        <div className="border-l-3 border-[#0B3C5D] pl-2.5">
          <span className="text-[10px] font-black uppercase text-slate-500 block">Total Órdenes</span>
          <span className="text-base font-black text-slate-900 font-mono">{kpis.totalOrdersCount}</span>
        </div>
        <div className="border-l-3 border-indigo-600 pl-2.5">
          <span className="text-[10px] font-black uppercase text-slate-500 block">Total Líneas F4311</span>
          <span className="text-base font-black text-indigo-700 font-mono">{kpis.totalLinesCount}</span>
        </div>
        <div className="border-l-3 border-amber-500 pl-2.5">
          <span className="text-[10px] font-black uppercase text-slate-500 block">Líneas Pend. VoBo</span>
          <span className="text-base font-black text-amber-700 font-mono">{kpis.totalPendingLines}</span>
        </div>
        <div className="border-l-3 border-emerald-600 pl-2.5">
          <span className="text-[10px] font-black uppercase text-slate-500 block">Líneas Aprobadas</span>
          <span className="text-base font-black text-emerald-700 font-mono">{kpis.totalApprovedLines}</span>
        </div>
        <div className="border-l-3 border-rose-500 pl-2.5">
          <span className="text-[10px] font-black uppercase text-slate-500 block">Líneas Rechazadas</span>
          <span className="text-base font-black text-rose-700 font-mono">{kpis.totalRejectedLines}</span>
        </div>
        <div className="border-l-3 border-[#D97706] pl-2.5">
          <span className="text-[10px] font-black uppercase text-slate-500 block">Monto Comprometido</span>
          <span className="text-sm font-black text-[#D97706] font-mono truncate block" title={formatCLP(kpis.totalAmountCLP)}>
            {formatCLP(kpis.totalAmountCLP)}
          </span>
        </div>
      </div>

      {/* FILTER & QBE HEADER CONTROLS */}
      <div className="bg-[#EBF3F9] border-b border-slate-300 px-5 py-3 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5 text-xs">
          
          {/* General Search */}
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">
              Búsqueda Rápida QBE (Folio, Proveedor, Unidad, Factura):
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchGeneral}
                onChange={(e) => setSearchGeneral(e.target.value)}
                placeholder="Buscar en todos los campos..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#0B3C5D]"
              />
            </div>
          </div>

          {/* Status UDC filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">
              Estado ERP (UDC 40/AT):
            </label>
            <select
              value={filterStatusCode}
              onChange={(e) => setFilterStatusCode(e.target.value)}
              className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0B3C5D]"
            >
              <option value="ALL">Todos los Estados ERP</option>
              <option value="110">[110] Borrador / Solicitud</option>
              <option value="220">[220] Pendiente VoBo Jefatura</option>
              <option value="225">[225] En Observación (Hold)</option>
              <option value="230">[230] Aprobado por Jefatura</option>
              <option value="280">[280] Emitido Compras (R43500)</option>
              <option value="400">[400] Recepcionado Bodega (P4312)</option>
              <option value="999">[999] Rechazado / Cancelado</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">
              Categoría OT:
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0B3C5D]"
            >
              <option value="ALL">Todas las Categorías</option>
              <option value="MANTENCIÓN PREVENTIVA">MANTENCIÓN PREVENTIVA</option>
              <option value="MANTENCIÓN CORRECTIVA">MANTENCIÓN CORRECTIVA</option>
              <option value="REPARACIÓN EXTRAORDINARIA">REPARACIÓN EXTRAORDINARIA</option>
              <option value="EMERGENCIA">EMERGENCIA</option>
              <option value="MEJORA / INSTALACIÓN">MEJORA / INSTALACIÓN</option>
            </select>
          </div>

          {/* Specialty filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">
              Especialidad / Rubro:
            </label>
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0B3C5D]"
            >
              <option value="ALL">Todas las Especialidades</option>
              <option value="TECHUMBRES">TECHUMBRES</option>
              <option value="PLOMERÍA">PLOMERÍA</option>
              <option value="ALFOMBRAS">ALFOMBRAS</option>
              <option value="PINTURA">PINTURA</option>
              <option value="CLIMATIZACIÓN">CLIMATIZACIÓN</option>
              <option value="ELECTRICIDAD">ELECTRICIDAD</option>
              <option value="CERRAJERÍA">CERRAJERÍA</option>
            </select>
          </div>

          {/* View Mode Toggle for P43214 */}
          {activeTab === 'P43214_ORDERS' && (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">
                Nivel de Grilla ERP:
              </label>
              <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-300">
                <button
                  onClick={() => setP43214ViewMode('LINES')}
                  className={`flex-1 py-1 rounded text-[11px] font-black uppercase transition-all cursor-pointer ${
                    p43214ViewMode === 'LINES'
                      ? 'bg-[#0B3C5D] text-white shadow-2xs'
                      : 'text-slate-700 hover:text-black'
                  }`}
                  title="Ver detalle por Línea individual F4311 con estado independiente"
                >
                  Líneas (F4311)
                </button>
                <button
                  onClick={() => setP43214ViewMode('HEADER')}
                  className={`flex-1 py-1 rounded text-[11px] font-black uppercase transition-all cursor-pointer ${
                    p43214ViewMode === 'HEADER'
                      ? 'bg-[#0B3C5D] text-white shadow-2xs'
                      : 'text-slate-700 hover:text-black'
                  }`}
                  title="Ver encabezados de orden F4801/F4301"
                >
                  Encabezado (F4801)
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-auto p-4" id="jde-inquiry-report-area">
        
        {/* TAB 1: P43214 - PURCHASE ORDER & LINE INQUIRY */}
        {activeTab === 'P43214_ORDERS' && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
            
            {p43214ViewMode === 'LINES' ? (
              // LINES VIEW (F4311)
              <div className="overflow-x-auto">
                <table className="text-left text-xs border-collapse table-fixed select-none" style={{ width: 'max-content', minWidth: '100%' }}>
                  <thead className="bg-[#0B3C5D] text-white font-bold text-[10.5px] uppercase sticky top-0 z-10">
                    <tr>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsLines.idx}px` }}>
                        <span>#</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsLines, colWidthsLines, 'idx', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsLines.folio}px` }}>
                        <span className="truncate block">Folio OT</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsLines, colWidthsLines, 'folio', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsLines.lineNum}px` }}>
                        <span className="truncate block">Lín</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsLines, colWidthsLines, 'lineNum', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsLines.description}px` }}>
                        <span className="truncate block">Descripción Técnica (F4311)</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsLines, colWidthsLines, 'description', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsLines.quantity}px` }}>
                        <span className="truncate block">Cant.</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsLines, colWidthsLines, 'quantity', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsLines.unitPrice}px` }}>
                        <span className="truncate block">P. Unitario</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsLines, colWidthsLines, 'unitPrice', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsLines.total}px` }}>
                        <span className="truncate block">Total Línea</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsLines, colWidthsLines, 'total', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsLines.status}px` }}>
                        <span className="truncate block">Estado ERP (UDC)</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsLines, colWidthsLines, 'status', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsLines.supplier}px` }}>
                        <span className="truncate block">Proveedor / RUT</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsLines, colWidthsLines, 'supplier', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsLines.property}px` }}>
                        <span className="truncate block">Inmueble / Unidad</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsLines, colWidthsLines, 'property', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsLines.associatedDoc}px` }}>
                        <span className="truncate block">Doc. Asociado</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsLines, colWidthsLines, 'associatedDoc', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center" style={{ width: `${colWidthsLines.actions}px` }}>
                        <span className="truncate block">Acciones</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsLines, colWidthsLines, 'actions', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredLines.length > 0 ? (
                      filteredLines.map(({ order, line, lineIndex }, idx) => {
                        const statusCode = line.lineStatusCode || (line.status === 'APROBADA' ? '230' : line.status === 'RECHAZADA' ? '999' : '220');
                        const statusInfo = JDE_LINE_STATUS_UDC[statusCode] || JDE_LINE_STATUS_UDC['220'];

                        return (
                          <tr
                            key={`${order.id}-${line.id || lineIndex}`}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setGridContextMenu({ x: e.clientX, y: e.clientY, order });
                            }}
                            className="hover:bg-amber-50/50 transition-colors even:bg-slate-50/40 cursor-context-menu"
                          >
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500 text-[10px] truncate">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-indigo-700 truncate">
                              <button
                                onClick={() => setSelectedOrderForPreview(order)}
                                className="hover:underline flex items-center gap-1 cursor-pointer"
                                title="Ver Comprobante OT Oficial"
                              >
                                <span>{order.folio}</span>
                                <Eye size={11} className="text-slate-400" />
                              </button>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 truncate">
                              #{lineIndex + 1}
                            </td>
                            <td className="py-2.5 px-3 truncate">
                              <span className="font-bold text-slate-800 uppercase block truncate">{line.description}</span>
                              {line.rejectionReason && (
                                <span className="text-[9.5px] text-rose-700 font-bold italic mt-0.5 block truncate">
                                  Obs: {line.rejectionReason}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 truncate">
                              {line.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700 truncate">
                              {formatCLP(line.unitPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 truncate">
                              {formatCLP(line.total)}
                            </td>
                            <td className="py-2.5 px-2 text-center truncate">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-black border ${statusInfo.badgeBg} ${statusInfo.badgeText}`}>
                                [{statusInfo.code}] {statusInfo.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 truncate">
                              <span className="font-bold text-slate-800 uppercase truncate block text-[11px]" title={order.supplierName}>
                                {order.supplierName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">{order.supplierTaxId}</span>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] font-medium text-slate-700 truncate" title={order.propertyLabel}>
                              {order.propertyLabel || 'UNIDAD CORPORATIVA'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10.5px] text-indigo-700 font-bold truncate">
                              {order.associatedInvoice || 'S/D'}
                            </td>
                            <td className="py-2.5 px-2 text-center truncate">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGridContextMenu({ x: e.clientX, y: e.clientY, order });
                                  }}
                                  className="p-1 text-slate-500 hover:text-[#0B3C5D] hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
                                  title="Menú Contextual ERP (Clic Derecho)"
                                >
                                  <MoreVertical size={13} />
                                </button>
                                <button
                                  onClick={() => setSelectedOrderForLineApproval(order)}
                                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-black text-[9.5px] uppercase border border-amber-300 transition-all flex items-center gap-1 cursor-pointer"
                                  title="Abrir Mesa de Aprobación por Líneas ERP P43081"
                                >
                                  <Layers size={11} className="text-amber-700" />
                                  <span>P43081</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-slate-400 font-bold uppercase text-xs">
                          No se encontraron líneas que coincidan con los criterios de búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              // HEADER VIEW (F4801)
              <div className="overflow-x-auto">
                <table className="text-left text-xs border-collapse table-fixed select-none" style={{ width: 'max-content', minWidth: '100%' }}>
                  <thead className="bg-[#0B3C5D] text-white font-bold text-[10.5px] uppercase sticky top-0 z-10">
                    <tr>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsHeader.idx}px` }}>
                        <span>#</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsHeader, colWidthsHeader, 'idx', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsHeader.folio}px` }}>
                        <span className="truncate block">Folio OT</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsHeader, colWidthsHeader, 'folio', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsHeader.date}px` }}>
                        <span className="truncate block">Fecha</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsHeader, colWidthsHeader, 'date', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsHeader.supplier}px` }}>
                        <span className="truncate block">Proveedor Adjudicado</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsHeader, colWidthsHeader, 'supplier', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsHeader.property}px` }}>
                        <span className="truncate block">Inmueble / Unidad</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsHeader, colWidthsHeader, 'property', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsHeader.category}px` }}>
                        <span className="truncate block">Categoría</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsHeader, colWidthsHeader, 'category', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsHeader.specialty}px` }}>
                        <span className="truncate block">Especialidad</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsHeader, colWidthsHeader, 'specialty', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsHeader.total}px` }}>
                        <span className="truncate block">Total OT</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsHeader, colWidthsHeader, 'total', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsHeader.status}px` }}>
                        <span className="truncate block">Estado Global</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsHeader, colWidthsHeader, 'status', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsHeader.linesCount}px` }}>
                        <span className="truncate block">Líneas</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsHeader, colWidthsHeader, 'linesCount', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center" style={{ width: `${colWidthsHeader.actions}px` }}>
                        <span className="truncate block">Acciones</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsHeader, colWidthsHeader, 'actions', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order, idx) => {
                        const evaluation = evaluateWorkOrderStatusFromLines(order.items || []);

                        return (
                          <tr
                            key={order.id}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setGridContextMenu({ x: e.clientX, y: e.clientY, order });
                            }}
                            className="hover:bg-amber-50/50 transition-colors even:bg-slate-50/40 cursor-context-menu"
                          >
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500 text-[10px] truncate">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-indigo-700 truncate">
                              <button
                                onClick={() => setSelectedOrderForPreview(order)}
                                className="hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>{order.folio}</span>
                                <Eye size={11} className="text-slate-400" />
                              </button>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 truncate">
                              {order.issueDate}
                            </td>
                            <td className="py-2.5 px-3 truncate">
                              <span className="font-bold text-slate-800 uppercase block truncate">{order.supplierName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{order.supplierTaxId}</span>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] font-medium text-slate-700 truncate" title={order.propertyLabel}>
                              {order.propertyLabel || 'UNIDAD CORPORATIVA'}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] font-bold text-slate-700 uppercase truncate">
                              {order.category || 'MANTENCIÓN PREVENTIVA'}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] font-bold text-emerald-800 uppercase truncate">
                              {order.specialty || 'TECHUMBRES'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 truncate">
                              {formatCLP(order.total)}
                            </td>
                            <td className="py-2.5 px-2 text-center truncate">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                order.status === 'APROBADA' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                order.status === 'EMITIDA_IMPRESA' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                                order.status === 'RECEPCIONADA' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                order.status === 'RECHAZADA' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {order.status} {evaluation.isPartiallyApproved ? '(PARCIAL)' : ''}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center truncate">
                              <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-slate-700">
                                {evaluation.approvedLines}/{evaluation.totalLines} apr.
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center truncate">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGridContextMenu({ x: e.clientX, y: e.clientY, order });
                                  }}
                                  className="p-1 text-slate-500 hover:text-[#0B3C5D] hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
                                  title="Menú Contextual ERP (Clic Derecho)"
                                >
                                  <MoreVertical size={13} />
                                </button>
                                <button
                                  onClick={() => setSelectedOrderForLineApproval(order)}
                                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-black text-[9.5px] uppercase border border-amber-300 transition-all flex items-center gap-1 cursor-pointer"
                                  title="Aprobar o rechazar líneas de la orden (P43081)"
                                >
                                  <Layers size={11} className="text-amber-700" />
                                  <span>P43081</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-bold uppercase text-xs">
                        No se encontraron órdenes registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

        {/* TAB 2: P43081 - LINE APPROVAL WORKBENCH */}
        {activeTab === 'P43081_APPROVALS' && (
          <div className="space-y-4">
            
            {/* AUTHORITY & BATCH ACTION HEADER */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 text-white p-2.5 rounded-lg shadow-xs">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-amber-950 flex items-center gap-2">
                    Bandeja de Aprobación por Líneas ERP (P43081)
                  </h3>
                  <p className="text-xs text-amber-800">
                    Aprobador en Sesión: <strong className="text-slate-900">{currentUser}</strong> ({userRole}) • Límite de Aprobación Delegado: <strong>Hasta $10.000.000 CLP</strong> por línea
                  </p>
                </div>
              </div>

              {pendingApprovalLines.length > 0 && (
                <button
                  onClick={handleApproveAllPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                  title="Aprobar todas las órdenes y líneas pendientes en lote"
                >
                  <CheckCircle2 size={16} /> Aprobar Todas las Líneas Pendientes ({pendingApprovalLines.length})
                </button>
              )}
            </div>

            {/* PENDING LINES GRID */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-left text-xs border-collapse table-fixed select-none" style={{ width: 'max-content', minWidth: '100%' }}>
                  <thead className="bg-[#0B3C5D] text-white font-bold text-[10.5px] uppercase">
                    <tr>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsApprovals.idx}px` }}>
                        <span>#</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsApprovals, colWidthsApprovals, 'idx', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsApprovals.folio}px` }}>
                        <span className="truncate block">Folio OT</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsApprovals, colWidthsApprovals, 'folio', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsApprovals.lineNum}px` }}>
                        <span className="truncate block">Lín</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsApprovals, colWidthsApprovals, 'lineNum', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsApprovals.description}px` }}>
                        <span className="truncate block">Descripción del Servicio / Insumo</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsApprovals, colWidthsApprovals, 'description', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsApprovals.quantity}px` }}>
                        <span className="truncate block">Cant.</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsApprovals, colWidthsApprovals, 'quantity', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsApprovals.unitPrice}px` }}>
                        <span className="truncate block">P. Unitario</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsApprovals, colWidthsApprovals, 'unitPrice', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsApprovals.total}px` }}>
                        <span className="truncate block">Total Línea</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsApprovals, colWidthsApprovals, 'total', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsApprovals.supplier}px` }}>
                        <span className="truncate block">Proveedor</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsApprovals, colWidthsApprovals, 'supplier', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsApprovals.property}px` }}>
                        <span className="truncate block">Inmueble</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsApprovals, colWidthsApprovals, 'property', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative py-2.5 px-2 text-center" style={{ width: `${colWidthsApprovals.actions}px` }}>
                        <span className="truncate block">Decisión de Aprobador</span>
                        <div onMouseDown={(e) => handleResizeStart(setColWidthsApprovals, colWidthsApprovals, 'actions', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pendingApprovalLines.length > 0 ? (
                      pendingApprovalLines.map(({ order, line, lineIndex }, idx) => (
                        <tr 
                          key={`${order.id}-${line.id}`} 
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setGridContextMenu({ x: e.clientX, y: e.clientY, order });
                          }}
                          className="hover:bg-amber-50/40 cursor-context-menu"
                        >
                          <td className="py-3 px-2 text-center font-mono text-slate-500 truncate">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-indigo-700 truncate">
                            #{order.folio}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-slate-700 truncate">
                            #{lineIndex + 1}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800 uppercase truncate" title={line.description}>
                            {line.description}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-slate-700 truncate">
                            {line.quantity}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700 truncate">
                            {formatCLP(line.unitPrice)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900 truncate">
                            {formatCLP(line.total)}
                          </td>
                          <td className="py-3 px-3 truncate">
                            <span className="font-bold text-slate-800 uppercase truncate block text-[11px]" title={order.supplierName}>
                              {order.supplierName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{order.supplierTaxId}</span>
                          </td>
                          <td className="py-3 px-3 text-[11px] font-medium text-slate-700 truncate" title={order.propertyLabel}>
                            {order.propertyLabel || 'UNIDAD CORPORATIVA'}
                          </td>
                          <td className="py-3 px-2 text-center truncate">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGridContextMenu({ x: e.clientX, y: e.clientY, order });
                                }}
                                className="p-1 text-slate-500 hover:text-[#0B3C5D] hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
                                title="Menú Contextual ERP (Clic Derecho)"
                              >
                                <MoreVertical size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  const updated = approveWorkOrderLine(order, line.id, currentUser);
                                  onSaveWorkOrder(updated);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title="Aprobar esta línea (ERP 230)"
                              >
                                <CheckCircle2 size={12} /> Aprobar
                              </button>
                              <button
                                onClick={() => setSelectedOrderForLineApproval(order)}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title="Rechazar o revisar observaciones de la orden"
                              >
                                <XCircle size={12} /> Rechazar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-emerald-700 font-black uppercase text-xs">
                          ✅ No hay líneas pendientes de aprobación en este momento. Todas las órdenes están al día.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: P042004 - SUPPLIER LEDGER INQUIRY */}
        {activeTab === 'P042004_SUPPLIERS' && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
            <div className="bg-[#0B3C5D] text-white p-3 font-bold text-xs uppercase flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>P042004: Consulta de Cuentas por Pagar a Proveedores y Facturas DTE</span>
                <span className="text-amber-300 font-mono text-[11px]">Subledger Type: V (Vendor)</span>
              </div>
              {onAddSupplier && (
                <button
                  onClick={() => setIsSupplierFormOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs border border-emerald-400 transition-all cursor-pointer"
                >
                  <Plus size={12} /> + Agregar Nuevo Proveedor
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="text-left text-xs border-collapse table-fixed select-none" style={{ width: 'max-content', minWidth: '100%' }}>
                <thead className="bg-[#0B3C5D] text-white font-bold text-[10.5px] uppercase sticky top-0 z-10">
                  <tr>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsSuppliers.rut}px` }}>
                      <span className="truncate block">RUT / Tax ID</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsSuppliers, colWidthsSuppliers, 'rut', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsSuppliers.name}px` }}>
                      <span className="truncate block">Razón Social del Proveedor</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsSuppliers, colWidthsSuppliers, 'name', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-center border-r border-slate-600/50" style={{ width: `${colWidthsSuppliers.orders}px` }}>
                      <span className="truncate block">N° OTs</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsSuppliers, colWidthsSuppliers, 'orders', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsSuppliers.gross}px` }}>
                      <span className="truncate block">Monto Bruto Facturado</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsSuppliers, colWidthsSuppliers, 'gross', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsSuppliers.tax}px` }}>
                      <span className="truncate block">Retención / IVA</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsSuppliers, colWidthsSuppliers, 'tax', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsSuppliers.paid}px` }}>
                      <span className="truncate block">Saldo Pagado</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsSuppliers, colWidthsSuppliers, 'paid', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsSuppliers.pending}px` }}>
                      <span className="truncate block">Saldo Abierto</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsSuppliers, colWidthsSuppliers, 'pending', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-center border-r border-slate-600/50" style={{ width: `${colWidthsSuppliers.status}px` }}>
                      <span className="truncate block">Estado</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsSuppliers, colWidthsSuppliers, 'status', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-2 text-center" style={{ width: `${colWidthsSuppliers.actions}px` }}>
                      <span className="truncate block">Acción</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsSuppliers, colWidthsSuppliers, 'actions', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {suppliers.map((sup) => {
                    const supOrders = workOrders.filter(o => o.supplierId === sup.id || o.supplierTaxId === sup.taxId);
                    const totalGross = supOrders.reduce((sum, o) => sum + (o.total || 0), 0);
                    const totalTax = supOrders.reduce((sum, o) => sum + (o.iva || 0), 0);
                    const totalPaid = supOrders.filter(o => o.status === 'PAGADA').reduce((sum, o) => sum + (o.total || 0), 0);
                    const openBalance = totalGross - totalPaid;

                    return (
                      <tr
                        key={sup.id}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setGridContextMenu({ x: e.clientX, y: e.clientY, supplier: sup });
                        }}
                        className="hover:bg-slate-50 cursor-context-menu"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 truncate">
                          {sup.taxId}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 uppercase truncate">
                          {sup.name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold truncate">
                          {supOrders.length}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 truncate">
                          {formatCLP(totalGross)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 truncate">
                          {formatCLP(totalTax)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold truncate">
                          {formatCLP(totalPaid)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-black truncate">
                          {formatCLP(openBalance)}
                        </td>
                        <td className="py-2.5 px-3 text-center truncate">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            sup.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {sup.status === 'ACTIVE' ? 'ACTIVO' : 'BLOQUEADO'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center truncate">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setGridContextMenu({ x: e.clientX, y: e.clientY, supplier: sup });
                            }}
                            className="p-1 text-slate-500 hover:text-[#0B3C5D] hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
                            title="Menú Contextual ERP (Clic Derecho)"
                          >
                            <MoreVertical size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: P09200 - ACCOUNT LEDGER INQUIRY */}
        {activeTab === 'P09200_LEDGER' && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
            <div className="bg-[#0B3C5D] text-white p-3 font-bold text-xs uppercase flex items-center justify-between">
              <span>P09200: Consulta de Asientos y Mayor General F0911</span>
              <span className="text-emerald-300 font-mono text-[11px]">Ledger Type: AA (Actual Amounts)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-left text-xs border-collapse table-fixed select-none" style={{ width: 'max-content', minWidth: '100%' }}>
                <thead className="bg-[#0B3C5D] text-white font-bold text-[10.5px] uppercase sticky top-0 z-10">
                  <tr>
                    <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsLedger.idx}px` }}>
                      <span>#</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsLedger, colWidthsLedger, 'idx', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsLedger.date}px` }}>
                      <span className="truncate block">Fecha</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsLedger, colWidthsLedger, 'date', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsLedger.docNumber}px` }}>
                      <span className="truncate block">Documento</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsLedger, colWidthsLedger, 'docNumber', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsLedger.account}px` }}>
                      <span className="truncate block">Cuenta Contable</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsLedger, colWidthsLedger, 'account', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsLedger.description}px` }}>
                      <span className="truncate block">Glosa Explicativa</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsLedger, colWidthsLedger, 'description', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsLedger.property}px` }}>
                      <span className="truncate block">Centro Costo (Unidad)</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsLedger, colWidthsLedger, 'property', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsLedger.debit}px` }}>
                      <span className="truncate block">Debe (Débito)</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsLedger, colWidthsLedger, 'debit', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsLedger.credit}px` }}>
                      <span className="truncate block">Haber (Crédito)</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsLedger, colWidthsLedger, 'credit', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-2 text-center" style={{ width: `${colWidthsLedger.actions}px` }}>
                      <span className="truncate block">Acción</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsLedger, colWidthsLedger, 'actions', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transactions.slice(0, 50).map((tx, idx) => (
                    <tr
                      key={tx.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setGridContextMenu({ x: e.clientX, y: e.clientY, tx });
                      }}
                      className="hover:bg-slate-50 cursor-context-menu"
                    >
                      <td className="py-2 px-2 text-center font-mono text-slate-500 text-[10px] truncate">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono text-slate-600 truncate">{tx.date}</td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-700 truncate">{tx.documentNumber || tx.id.slice(0, 8)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 truncate">{tx.accountCode || '5.1.01.01'}</td>
                      <td className="py-2 px-3 uppercase text-slate-800 font-medium truncate" title={tx.description}>{tx.description}</td>
                      <td className="py-2 px-3 text-slate-600 text-[11px] truncate">{tx.propertyLabel || 'GENERAL'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 truncate">
                        {tx.type === 'EGRESO' ? formatCLP(tx.amount) : '$0'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 truncate">
                        {tx.type === 'INGRESO' ? formatCLP(tx.amount) : '$0'}
                      </td>
                      <td className="py-2 px-2 text-center truncate">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: P4312Q - 3-WAY MATCH CROSS CONTROL INQUIRY */}
        {activeTab === 'P4312Q_3WAY' && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
            <div className="bg-[#0B3C5D] text-white p-3 font-bold text-xs uppercase flex items-center justify-between">
              <span>P4312Q: Matriz de Control Cruzado de 3 Vías (OT F4311 ↔ Recepción F4312 ↔ Factura DTE F0411)</span>
              <span className="text-purple-300 font-mono text-[11px]">3-Way Match Validation Engine</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-left text-xs border-collapse table-fixed select-none" style={{ width: 'max-content', minWidth: '100%' }}>
                <thead className="bg-[#0B3C5D] text-white font-bold text-[10.5px] uppercase sticky top-0 z-10">
                  <tr>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidths3Way.folio}px` }}>
                      <span className="truncate block">Folio OT</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidths3Way, colWidths3Way, 'folio', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidths3Way.supplier}px` }}>
                      <span className="truncate block">Proveedor</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidths3Way, colWidths3Way, 'supplier', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidths3Way.amountPO}px` }}>
                      <span className="truncate block">Monto OT (F4311)</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidths3Way, colWidths3Way, 'amountPO', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-center border-r border-slate-600/50" style={{ width: `${colWidths3Way.reception}px` }}>
                      <span className="truncate block">Recepción (F4312)</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidths3Way, colWidths3Way, 'reception', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-center border-r border-slate-600/50" style={{ width: `${colWidths3Way.invoice}px` }}>
                      <span className="truncate block">Factura DTE (F0411)</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidths3Way, colWidths3Way, 'invoice', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-center border-r border-slate-600/50" style={{ width: `${colWidths3Way.matchStatus}px` }}>
                      <span className="truncate block">Estado Calce 3-Vías</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidths3Way, colWidths3Way, 'matchStatus', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-2 text-center" style={{ width: `${colWidths3Way.actions}px` }}>
                      <span className="truncate block">Acciones</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidths3Way, colWidths3Way, 'actions', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {workOrders.map((order) => {
                    const isReceived = order.status === 'RECEPCIONADA' || order.status === 'PAGADA' || order.receptionDate;
                    const hasInvoice = !!order.associatedInvoice || !!order.receptionInvoiceNumber;
                    const isFullyMatched = isReceived && hasInvoice;

                    return (
                      <tr
                        key={order.id}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setGridContextMenu({ x: e.clientX, y: e.clientY, order });
                        }}
                        className="hover:bg-slate-50 cursor-context-menu"
                      >
                        <td className="py-3 px-3 font-mono font-black text-indigo-700 truncate">#{order.folio}</td>
                        <td className="py-3 px-3 font-bold text-slate-800 uppercase truncate">{order.supplierName}</td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900 truncate">{formatCLP(order.total)}</td>
                        <td className="py-3 px-3 text-center truncate">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isReceived ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isReceived ? 'RECEPCIONADO CONFORME' : 'PENDIENTE RECEPCIÓN'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center truncate">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            hasInvoice ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {hasInvoice ? `DTE ${order.associatedInvoice || order.receptionInvoiceNumber}` : 'SIN DTE VINCULADO'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center truncate">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${
                            isFullyMatched ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            isReceived ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            {isFullyMatched ? '🟢 CALCE CONFORME 3-VÍAS' : isReceived ? '🟡 PENDIENTE FACTURA' : '🟠 PENDIENTE RECEPCIÓN'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center truncate">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setGridContextMenu({ x: e.clientX, y: e.clientY, order });
                              }}
                              className="p-1 text-slate-500 hover:text-[#0B3C5D] hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
                              title="Menú Contextual ERP (Clic Derecho)"
                            >
                              <MoreVertical size={13} />
                            </button>
                            <button
                              onClick={() => setSelectedOrderForPreview(order)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded font-bold text-[10px] uppercase border border-indigo-200 transition-all cursor-pointer"
                            >
                              Ver OT
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

        {/* TAB 6: P1501Q - REAL ESTATE & LEASE CONTRACT INQUIRY */}
        {activeTab === 'P1501Q_REALESTATE' && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
            <div className="bg-[#0B3C5D] text-white p-3 font-bold text-xs uppercase flex items-center justify-between">
              <span>P1501Q: Consulta Maestro de Inmuebles y Contratos de Arriendo (F1501 / F15012)</span>
              <span className="text-teal-300 font-mono text-[11px]">Real Estate Management Suite</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-left text-xs border-collapse table-fixed select-none" style={{ width: 'max-content', minWidth: '100%' }}>
                <thead className="bg-[#0B3C5D] text-white font-bold text-[10.5px] uppercase sticky top-0 z-10">
                  <tr>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsRealEstate.code}px` }}>
                      <span className="truncate block">Código Unidad</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsRealEstate, colWidthsRealEstate, 'code', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsRealEstate.name}px` }}>
                      <span className="truncate block">Inmueble / Edificio</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsRealEstate, colWidthsRealEstate, 'name', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsRealEstate.address}px` }}>
                      <span className="truncate block">Dirección y Comuna</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsRealEstate, colWidthsRealEstate, 'address', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsRealEstate.role}px` }}>
                      <span className="truncate block">Rol SII</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsRealEstate, colWidthsRealEstate, 'role', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsRealEstate.appraisal}px` }}>
                      <span className="truncate block">Avalúo Fiscal (CLP)</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsRealEstate, colWidthsRealEstate, 'appraisal', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 border-r border-slate-600/50" style={{ width: `${colWidthsRealEstate.tenant}px` }}>
                      <span className="truncate block">Arrendatario / Contrato</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsRealEstate, colWidthsRealEstate, 'tenant', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-right border-r border-slate-600/50" style={{ width: `${colWidthsRealEstate.rent}px` }}>
                      <span className="truncate block">Canon Arriendo</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsRealEstate, colWidthsRealEstate, 'rent', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-2 text-center border-r border-slate-600/50" style={{ width: `${colWidthsRealEstate.openOTs}px` }}>
                      <span className="truncate block">OTs</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsRealEstate, colWidthsRealEstate, 'openOTs', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-3 text-center border-r border-slate-600/50" style={{ width: `${colWidthsRealEstate.status}px` }}>
                      <span className="truncate block">Estado Ocupación</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsRealEstate, colWidthsRealEstate, 'status', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                    <th className="relative py-2.5 px-2 text-center" style={{ width: `${colWidthsRealEstate.actions}px` }}>
                      <span className="truncate block">Acción</span>
                      <div onMouseDown={(e) => handleResizeStart(setColWidthsRealEstate, colWidthsRealEstate, 'actions', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-400 active:bg-blue-600 z-20" title="Arrastrar para ajustar ancho" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {properties.map((prop) => {
                    const lease = leaseContracts.find(c => c.propertyId === prop.id || c.propertyId === prop.code);
                    const relatedOTs = workOrders.filter(o => o.propertyId === prop.id || o.propertyLabel?.includes(prop.code) || o.propertyLabel?.includes(prop.name));
                    const isOccupied = !!lease && lease.status === 'VIGENTE';

                    return (
                      <tr
                        key={prop.id}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setGridContextMenu({ x: e.clientX, y: e.clientY, property: prop });
                        }}
                        className="hover:bg-slate-50 cursor-context-menu"
                      >
                        <td className="py-3 px-3 font-mono font-black text-indigo-700 truncate">{prop.code || prop.id.slice(0, 8)}</td>
                        <td className="py-3 px-3 font-bold text-slate-800 uppercase truncate">{prop.name || prop.building || 'UNIDAD INMOBILIARIA'}</td>
                        <td className="py-3 px-3 text-slate-700 truncate">{prop.address}, {prop.commune}</td>
                        <td className="py-3 px-3 font-mono text-slate-600 truncate">{prop.propertyRole || 'S/R'}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 truncate">
                          {formatCLP(prop.appraisalValue || 65000000)}
                        </td>
                        <td className="py-3 px-3 truncate">
                          {lease ? (
                            <div>
                              <strong className="text-slate-800 uppercase block text-[11px] truncate">{lease.tenantName}</strong>
                              <span className="text-[10px] text-slate-500 font-mono">Folio: {lease.folio || 'CTR-ACTIVO'}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Sin contrato vigente</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-800 truncate">
                          {formatCLP(prop.rentalAmount || lease?.monthlyRentCLP || 0)}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-bold truncate">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            relatedOTs.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {relatedOTs.length} OTs
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center truncate">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${
                            isOccupied ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            {isOccupied ? 'ARRENDADO' : 'DISPONIBLE'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center truncate">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setGridContextMenu({ x: e.clientX, y: e.clientY, property: prop });
                            }}
                            className="p-1 text-slate-500 hover:text-[#0B3C5D] hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
                            title="Menú Contextual ERP (Clic Derecho)"
                          >
                            <MoreVertical size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* FLOATING ERP GRID CONTEXT MENU */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode={
            gridContextMenu.supplier ? 'P042004' :
            gridContextMenu.tx ? 'P09200' :
            gridContextMenu.property ? 'P1501Q' : 'P43214'
          }
          programTitle={
            gridContextMenu.supplier ? 'Supplier Ledger Inquiry (F0411)' :
            gridContextMenu.tx ? 'Account Ledger Inquiry (F0911)' :
            gridContextMenu.property ? 'Real Estate Master Inquiry (F1501)' : 'PO / Work Order & Line Inquiry (F4311)'
          }
          collectionName={
            gridContextMenu.supplier ? 'suppliers' :
            gridContextMenu.tx ? 'transactions' :
            gridContextMenu.property ? 'properties' : 'work_orders'
          }
          recordKey={
            gridContextMenu.supplier ? `PROVEEDOR #${gridContextMenu.supplier.taxId}` :
            gridContextMenu.tx ? (gridContextMenu.tx.documentNumber || `ASIENTO #${gridContextMenu.tx.id.slice(0, 8)}`) :
            gridContextMenu.property ? `INMUEBLE ${gridContextMenu.property.code || gridContextMenu.property.name}` :
            `OT #${gridContextMenu.order?.folio || gridContextMenu.order?.id}`
          }
          recordData={gridContextMenu.order || gridContextMenu.supplier || gridContextMenu.tx || gridContextMenu.property}
          currentStatus={
            gridContextMenu.order?.status ||
            (gridContextMenu.supplier?.status === 'ACTIVE' ? 'ACTIVO' : 'BLOQUEADO') ||
            gridContextMenu.tx?.status ||
            'ACTIVO'
          }
          statusOptions={
            gridContextMenu.order ? [
              { label: 'APROBADA', value: 'APROBADA' },
              { label: 'EMITIDA_IMPRESA', value: 'EMITIDA_IMPRESA' },
              { label: 'RECEPCIONADA', value: 'RECEPCIONADA' },
              { label: 'PAGADA', value: 'PAGADA' },
              { label: 'RECHAZADA', value: 'RECHAZADA' }
            ] : gridContextMenu.supplier ? [
              { label: 'ACTIVO', value: 'ACTIVE' },
              { label: 'BLOQUEADO', value: 'BLOCKED' }
            ] : undefined
          }
          onUpdateStatus={gridContextMenu.order ? async (newStatus) => {
            onSaveWorkOrder({
              ...gridContextMenu.order!,
              status: newStatus as any,
            });
            setGridContextMenu(null);
          } : undefined}
          rowExits={
            gridContextMenu.order ? [
              {
                id: 'exit_line_approval',
                label: 'Mesa de Aprobación por Líneas (P43081)',
                icon: <Layers size={12} className="text-amber-600" />,
                shortcut: 'F7',
                onClick: () => {
                  setSelectedOrderForLineApproval(gridContextMenu.order!);
                }
              },
              {
                id: 'exit_view_order',
                label: 'Ver Comprobante Oficial OT (W43214A)',
                icon: <Eye size={12} className="text-[#0B3C5D]" />,
                shortcut: 'F4',
                onClick: () => {
                  setSelectedOrderForPreview(gridContextMenu.order!);
                }
              }
            ] : gridContextMenu.supplier ? [
              {
                id: 'exit_view_orders',
                label: 'Ver Órdenes Asociadas en P43214',
                icon: <FileText size={12} className="text-[#0B3C5D]" />,
                shortcut: 'F4',
                onClick: () => {
                  setSearchGeneral(gridContextMenu.supplier!.taxId);
                  setActiveTab('P43214_ORDERS');
                  setGridContextMenu(null);
                }
              }
            ] : gridContextMenu.property ? [
              {
                id: 'exit_view_property_orders',
                label: 'Ver Órdenes del Inmueble en P43214',
                icon: <FileText size={12} className="text-[#0B3C5D]" />,
                shortcut: 'F4',
                onClick: () => {
                  setSearchGeneral(gridContextMenu.property!.code || gridContextMenu.property!.name);
                  setActiveTab('P43214_ORDERS');
                  setGridContextMenu(null);
                }
              }
            ] : []
          }
          onClose={() => setGridContextMenu(null)}
          onViewDetails={() => {
            if (gridContextMenu.order) {
              setSelectedOrderForPreview(gridContextMenu.order);
            }
            setGridContextMenu(null);
          }}
          onTraceability={() => {
            if (gridContextMenu.order) {
              setSelectedOrderForLineApproval(gridContextMenu.order);
            }
            setGridContextMenu(null);
          }}
          onExportExcel={handleExportExcel}
          onPrint={handlePrintReport}
        />
      )}

      {/* ERP LINE APPROVAL MODAL (P43081) */}
      {selectedOrderForLineApproval && (
        <JDELineApprovalModal
          isOpen={!!selectedOrderForLineApproval}
          onClose={() => setSelectedOrderForLineApproval(null)}
          order={selectedOrderForLineApproval}
          currentUser={currentUser}
          onSaveOrder={(updated) => {
            onSaveWorkOrder(updated);
            setSelectedOrderForLineApproval(updated);
          }}
          isManager={userRole === 'JEFE' || userRole === 'ADMINISTRADOR'}
        />
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {selectedOrderForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300">
            <div className="bg-[#0B3C5D] text-white p-4 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase flex items-center gap-2">
                <FileText size={16} className="text-amber-300" />
                Comprobante Oficial de Orden de Trabajo #{selectedOrderForPreview.folio}
              </h3>
              <button
                onClick={() => setSelectedOrderForPreview(null)}
                className="text-white/80 hover:text-white text-sm font-bold px-2 py-1 rounded cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-slate-100 text-xs">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase block">Proveedor:</span>
                    <strong className="text-sm text-slate-800">{selectedOrderForPreview.supplierName}</strong>
                    <p className="font-mono text-slate-600">{selectedOrderForPreview.supplierTaxId}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-500 uppercase block">Monto Total:</span>
                    <strong className="text-base text-emerald-700 font-mono">{formatCLP(selectedOrderForPreview.total)}</strong>
                    <p className="text-[10px] font-black uppercase text-indigo-700">Estado: {selectedOrderForPreview.status}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-black uppercase text-slate-700 text-xs mb-2">Desglose de Líneas (F4311):</h4>
                  <table className="w-full text-left border-collapse border border-slate-200">
                    <thead className="bg-slate-100 text-[10px] font-black uppercase">
                      <tr>
                        <th className="p-2 border border-slate-200">Lín</th>
                        <th className="p-2 border border-slate-200">Descripción</th>
                        <th className="p-2 border border-slate-200 text-center">Cant.</th>
                        <th className="p-2 border border-slate-200 text-right">P. Unitario</th>
                        <th className="p-2 border border-slate-200 text-right">Total</th>
                        <th className="p-2 border border-slate-200 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrderForPreview.items || []).map((item, idx) => (
                        <tr key={item.id}>
                          <td className="p-2 border border-slate-200 text-center font-mono font-bold">#{idx + 1}</td>
                          <td className="p-2 border border-slate-200 uppercase font-medium">{item.description}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono">{item.quantity}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono">{formatCLP(item.unitPrice)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatCLP(item.total)}</td>
                          <td className="p-2 border border-slate-200 text-center font-bold text-[10px]">
                            <span className={`px-2 py-0.5 rounded ${item.status === 'APROBADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              [{item.lineStatusCode || '220'}] {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="bg-slate-100 p-3 border-t flex justify-end">
              <button
                onClick={() => setSelectedOrderForPreview(null)}
                className="bg-[#0B3C5D] text-white px-5 py-2 rounded-lg font-bold text-xs uppercase cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

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
