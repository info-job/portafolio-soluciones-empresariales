import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, FileText, Download, CheckCircle2, 
  AlertTriangle, XCircle, Calendar, Building2,
  ShieldCheck, ArrowRight, Filter, FileSpreadsheet, Eye, Info, Database, Layers, ShieldAlert,
  Briefcase, Wrench, RefreshCw, Key, FileCheck, DollarSign, ExternalLink, HelpCircle, User, FileClock, Tag, HelpCircle as HelpIcon, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight,
  ChevronDown, Check, X, Printer, Settings, Maximize2, Minimize2, Plus
} from 'lucide-react';
import { Supplier, Transaction, WorkOrder, Property, Contract, LeaseContract, ModuleType } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { drawPdfAssetFlowLogo } from '../lib/defaultLogo';
import { downloadChileanTaxAuditReport } from '../lib/pdfGenerator';
import { JDEGridContextMenu } from './JDEGridContextMenu';
import { JDERecentReportsModal } from './JDERecentReportsModal';
import { SupplierForm } from './SupplierForm';

interface DueDiligenceConsultationProps {
  suppliers: Supplier[];
  transactions: Transaction[];
  workOrders: WorkOrder[];
  properties: Property[];
  contracts: Contract[];
  leaseContracts: LeaseContract[];
  companyLogo?: string | null;
  currentUser?: string | null;
  setActiveModule: (module: ModuleType) => void;
  onAddSupplier?: (supplier: Supplier) => void;
}

type TabType = 'F0911_TRANS' | 'F0401_PROV' | 'F1501_PROP' | 'F4801_OT' | 'F1502_LEASES' | 'F0402_CONTS';

const DueDiligenceConsultation: React.FC<DueDiligenceConsultationProps> = ({
  suppliers,
  transactions,
  workOrders,
  properties,
  contracts,
  leaseContracts,
  companyLogo,
  currentUser,
  setActiveModule,
  onAddSupplier
}) => {
  // Current Active Tab (ERP Program / File)
  const [activeTab, setActiveTab] = useState<TabType>('F0911_TRANS');
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);

  // Recent Reports Modal (WSJ - P986110B)
  const [showRecentReportsModal, setShowRecentReportsModal] = useState(false);

  // ERP Form Header parameter filters
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedCurrency, setSelectedCurrency] = useState('CLP');
  const [selectedGlobalRisk, setSelectedGlobalRisk] = useState('ALL');

  // ERP Grid pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Interactive ERP selection and dropdown states
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isFormMenuOpen, setIsFormMenuOpen] = useState(false);
  const [isRowMenuOpen, setIsRowMenuOpen] = useState(false);
  const [qbeVisible, setQbeVisible] = useState(true);

  // Helper to find a supplier's risk level by supplier name or taxId
  const getSupplierRisk = (supplierNameOrTaxId: string) => {
    if (!supplierNameOrTaxId || !suppliers) return 'RIESGO BAJO';
    const s = suppliers.find(sup => 
      (sup.name && sup.name.toLowerCase() === supplierNameOrTaxId.toLowerCase()) ||
      (sup.taxId && sup.taxId.toLowerCase() === supplierNameOrTaxId.toLowerCase())
    );
    return s?.dueDiligenceRisk || 'RIESGO BAJO';
  };

  // Master attributes inspector target state
  const [inspectTarget, setInspectTarget] = useState<{
    record: any;
    entityType: 'TRANSACTION' | 'SUPPLIER' | 'PROPERTY' | 'WORK_ORDER' | 'LEASE' | 'CONTRACT';
  } | null>(null);

  // ERP Grid Context Menu State (Right-Click Row Menu)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    record: any;
    entityType: 'TRANSACTION' | 'SUPPLIER' | 'PROPERTY' | 'WORK_ORDER' | 'LEASE' | 'CONTRACT';
    programCode: string;
    programTitle: string;
    recordKey: string;
  } | null>(null);

  const handleRowContextMenu = (
    e: React.MouseEvent,
    record: any,
    entityType: 'TRANSACTION' | 'SUPPLIER' | 'PROPERTY' | 'WORK_ORDER' | 'LEASE' | 'CONTRACT',
    programCode: string,
    programTitle: string,
    recordKey: string
  ) => {
    e.preventDefault();
    setSelectedRowId(record.id);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      record,
      entityType,
      programCode,
      programTitle,
      recordKey
    });
  };

  // Global Quick Search (searches everything in the active tab)
  const [globalSearch, setGlobalSearch] = useState('');

  // Fullscreen Grid Window Toggle (AssetFlow Enterprise Style Maximize Grid)
  const [isFullscreenGrid, setIsFullscreenGrid] = useState(false);

  // ERP Cross-Connection and Detached Window States
  const [isRelationsDetached, setIsRelationsDetached] = useState(false);
  const [relationsPos, setRelationsPos] = useState({ x: 200, y: 180, w: 750, h: 460 });
  const [activeRelationsTab, setActiveRelationsTab] = useState<'AUDIT' | 'F0911' | 'F0401' | 'F1501' | 'F4801' | 'F1502' | 'F0402'>('AUDIT');
  const [draggingRelations, setDraggingRelations] = useState(false);
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const [resizingRelations, setResizingRelations] = useState(false);
  const [resizeStartSize, setResizeStartSize] = useState({ w: 0, h: 0 });
  const [resizeStartMouse, setResizeStartMouse] = useState({ x: 0, y: 0 });

  const startDragRelations = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setDraggingRelations(true);
    setDragStartOffset({
      x: e.clientX - relationsPos.x,
      y: e.clientY - relationsPos.y
    });
    e.preventDefault();
  };

  const startResizeRelations = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setResizingRelations(true);
    setResizeStartSize({ w: relationsPos.w, h: relationsPos.h });
    setResizeStartMouse({ x: e.clientX, y: e.clientY });
    e.stopPropagation();
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingRelations) {
      setRelationsPos(prev => ({
        ...prev,
        x: e.clientX - dragStartOffset.x,
        y: e.clientY - dragStartOffset.y
      }));
    } else if (resizingRelations) {
      const dw = e.clientX - resizeStartMouse.x;
      const dh = e.clientY - resizeStartMouse.y;
      setRelationsPos(prev => ({
        ...prev,
        w: Math.max(450, resizeStartSize.w + dw),
        h: Math.max(280, resizeStartSize.h + dh)
      }));
    }
  };

  const handleMouseUp = () => {
    setDraggingRelations(false);
    setResizingRelations(false);
  };

  // ==========================================
  // ERP QBE (Query By Example) Column Filters
  // ==========================================
  
  // F0911 (Transactions) Filters
  const [f0911Filters, setF0911Filters] = useState({
    folio: '',
    documentType: '',
    description: '',
    supplierName: '',
    propertyLabel: '',
    amount: '',
    accountCode: '',
    status: '',
    date: ''
  });

  // F0401 (Suppliers) Filters
  const [f0401Filters, setF0401Filters] = useState({
    folio: '',
    taxId: '',
    name: '',
    category: '',
    status: '',
    dueDiligenceRisk: '',
    bankName: ''
  });

  // F1501 (Properties) Filters
  const [f1501Filters, setF1501Filters] = useState({
    code: '',
    propertyRole: '',
    address: '',
    commune: '',
    type: '',
    appraisalValue: '',
    rentalAmount: ''
  });

  // F4801 (Work Orders) Filters
  const [f4801Filters, setF4801Filters] = useState({
    folio: '',
    status: '',
    supplierName: '',
    propertyLabel: '',
    total: '',
    trackingResponsible: '',
    issueDate: ''
  });

  // F1502 (Lease Contracts) Filters
  const [f1502Filters, setF1502Filters] = useState({
    tenantName: '',
    tenantTaxId: '',
    propertyLabel: '',
    monthlyAmount: '',
    status: '',
    startDate: ''
  });

  // F0402 (Service Contracts) Filters
  const [f0402Filters, setF0402Filters] = useState({
    supplierName: '',
    building: '',
    monthlyAmount: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // Auto-reset page to 0 when filters or tab change
  React.useEffect(() => {
    setCurrentPage(0);
  }, [activeTab, globalSearch, f0911Filters, f0401Filters, f1501Filters, f4801Filters, f1502Filters, f0402Filters, selectedCompany, selectedGlobalRisk, selectedCurrency]);

  // Reset Filters helper
  const resetAllFilters = () => {
    setGlobalSearch('');
    setSelectedRowId(null);
    setCurrentPage(0);
    setSelectedCompany('ALL');
    setSelectedCurrency('CLP');
    setSelectedGlobalRisk('ALL');
    setF0911Filters({ folio: '', documentType: '', description: '', supplierName: '', propertyLabel: '', amount: '', accountCode: '', status: '', date: '' });
    setF0401Filters({ folio: '', taxId: '', name: '', category: '', status: '', dueDiligenceRisk: '', bankName: '' });
    setF1501Filters({ code: '', propertyRole: '', address: '', commune: '', type: '', appraisalValue: '', rentalAmount: '' });
    setF4801Filters({ folio: '', status: '', supplierName: '', propertyLabel: '', total: '', trackingResponsible: '', issueDate: '' });
    setF1502Filters({ tenantName: '', tenantTaxId: '', propertyLabel: '', monthlyAmount: '', status: '', startDate: '' });
    setF0402Filters({ supplierName: '', building: '', monthlyAmount: '', status: '', startDate: '', endDate: '' });
  };

  // Quick action to filter connected records
  const handleInterconnectFilter = (tab: TabType, field: string, value: string) => {
    setGlobalSearch('');
    setSelectedRowId(null);
    setActiveTab(tab);

    // Apply the filter cleanly by resetting everything and inserting the single target filter field
    setF0911Filters({
      folio: '',
      documentType: '',
      description: '',
      supplierName: tab === 'F0911_TRANS' && field === 'supplierName' ? value : '',
      propertyLabel: tab === 'F0911_TRANS' && field === 'propertyLabel' ? value : '',
      amount: '',
      accountCode: '',
      status: '',
      date: ''
    });

    setF0401Filters({
      folio: '',
      taxId: tab === 'F0401_PROV' && field === 'taxId' ? value : '',
      name: tab === 'F0401_PROV' && field === 'supplierName' ? value : '',
      category: '',
      status: '',
      dueDiligenceRisk: '',
      bankName: ''
    });

    setF1501Filters({
      code: tab === 'F1501_PROP' && field === 'code' ? value : '',
      propertyRole: '',
      address: '',
      commune: '',
      type: '',
      appraisalValue: '',
      rentalAmount: ''
    });

    setF4801Filters({
      folio: '',
      status: '',
      supplierName: tab === 'F4801_OT' && field === 'supplierName' ? value : '',
      propertyLabel: tab === 'F4801_OT' && field === 'propertyLabel' ? value : '',
      total: '',
      trackingResponsible: '',
      issueDate: ''
    });

    setF1502Filters({
      tenantName: '',
      tenantTaxId: '',
      propertyLabel: tab === 'F1502_LEASES' && field === 'propertyLabel' ? value : '',
      monthlyAmount: '',
      status: '',
      startDate: ''
    });

    setF0402Filters({
      supplierName: '',
      building: '',
      monthlyAmount: '',
      status: '',
      startDate: '',
      endDate: ''
    });
  };

  // Helper to fetch the currently selected row object based on the active tab
  const getSelectedRecord = () => {
    if (!selectedRowId) return null;
    switch (activeTab) {
      case 'F0911_TRANS':
        return transactions.find(r => r.id === selectedRowId) || null;
      case 'F0401_PROV':
        return suppliers.find(r => r.id === selectedRowId) || null;
      case 'F1501_PROP':
        return properties.find(r => r.id === selectedRowId) || null;
      case 'F4801_OT':
        return workOrders.find(r => r.id === selectedRowId) || null;
      case 'F1502_LEASES':
        return leaseContracts.find(r => r.id === selectedRowId) || null;
      case 'F0402_CONTS':
        return contracts.find(r => r.id === selectedRowId) || null;
      default:
        return null;
    }
  };

  // Memoized cross-connection related records query
  const relatedData = useMemo(() => {
    const rec = getSelectedRecord();
    if (!rec) {
      return { transactions: [], suppliers: [], properties: [], workOrders: [], leaseContracts: [], contracts: [] };
    }

    let relTx: Transaction[] = [];
    let relSuppliers: Supplier[] = [];
    let relProperties: Property[] = [];
    let relWorkOrders: WorkOrder[] = [];
    let relLeaseContracts: LeaseContract[] = [];
    let relContracts: Contract[] = [];

    const recId = rec.id?.toLowerCase() || '';

    if (activeTab === 'F0401_PROV') { // Selected record is a Supplier (F0401)
      const taxId = rec.taxId?.toLowerCase() || '';
      const name = rec.name?.toLowerCase() || '';

      relTx = transactions.filter(t => 
        (t.supplierTaxId && t.supplierTaxId.toLowerCase() === taxId) ||
        (t.supplierName && t.supplierName.toLowerCase() === name)
      );
      relWorkOrders = workOrders.filter(w => 
        (w.supplierTaxId && w.supplierTaxId.toLowerCase() === taxId) ||
        (w.supplierName && w.supplierName.toLowerCase() === name)
      );
      relContracts = contracts.filter(c => 
        (c.supplierId && c.supplierId.toLowerCase() === taxId) ||
        (c.supplierName && c.supplierName.toLowerCase() === name)
      );
    } 
    else if (activeTab === 'F1501_PROP') { // Selected record is a Property (F1501)
      const code = rec.code?.toLowerCase() || '';

      relTx = transactions.filter(t => t.propertyId?.toLowerCase() === code);
      relWorkOrders = workOrders.filter(w => w.propertyLabel?.toLowerCase() === code);
      relLeaseContracts = leaseContracts.filter(l => l.propertyId?.toLowerCase() === code);
      relContracts = contracts.filter(c => c.building?.toLowerCase() === code);
    } 
    else if (activeTab === 'F0911_TRANS') { // Selected record is a Transaction (F0911)
      const supplierTax = rec.supplierTaxId?.toLowerCase() || '';
      const supplierName = rec.supplierName?.toLowerCase() || '';
      const propertyId = rec.propertyId?.toLowerCase() || '';

      if (supplierTax || supplierName) {
        relSuppliers = suppliers.filter(s => 
          (supplierTax && s.taxId?.toLowerCase() === supplierTax) ||
          (supplierName && s.name?.toLowerCase() === supplierName)
        );
        relContracts = contracts.filter(c => 
          (supplierTax && c.supplierId?.toLowerCase() === supplierTax) ||
          (supplierName && c.supplierName?.toLowerCase() === supplierName)
        );
      }
      if (propertyId) {
        relProperties = properties.filter(p => p.code?.toLowerCase() === propertyId);
        relLeaseContracts = leaseContracts.filter(l => l.propertyId?.toLowerCase() === propertyId);
      }
    } 
    else if (activeTab === 'F4801_OT') { // Selected record is a Work Order (F4801)
      const supplierTax = rec.supplierTaxId?.toLowerCase() || '';
      const supplierName = rec.supplierName?.toLowerCase() || '';
      const propId = rec.propertyLabel?.toLowerCase() || '';

      if (supplierTax || supplierName) {
        relSuppliers = suppliers.filter(s => 
          (supplierTax && s.taxId?.toLowerCase() === supplierTax) ||
          (supplierName && s.name?.toLowerCase() === supplierName)
        );
      }
      if (propId) {
        relProperties = properties.filter(p => p.code?.toLowerCase() === propId);
      }
    } 
    else if (activeTab === 'F1502_LEASES') { // Selected record is a Lease Contract (F1502)
      const propId = rec.propertyId?.toLowerCase() || '';
      if (propId) {
        relProperties = properties.filter(p => p.code?.toLowerCase() === propId);
      }
    } 
    else if (activeTab === 'F0402_CONTS') { // Selected record is a Service Contract (F0402)
      const supplierId = rec.supplierId?.toLowerCase() || '';
      const supplierName = rec.supplierName?.toLowerCase() || '';
      const building = rec.building?.toLowerCase() || '';

      if (supplierId || supplierName) {
        relSuppliers = suppliers.filter(s => 
          (supplierId && s.taxId?.toLowerCase() === supplierId) ||
          (supplierName && s.name?.toLowerCase() === supplierName)
        );
      }
      if (building) {
        relProperties = properties.filter(p => p.code?.toLowerCase() === building);
      }
    }

    return {
      transactions: relTx,
      suppliers: relSuppliers,
      properties: relProperties,
      workOrders: relWorkOrders,
      leaseContracts: relLeaseContracts,
      contracts: relContracts
    };
  }, [activeTab, selectedRowId, transactions, suppliers, properties, workOrders, leaseContracts, contracts]);

  // Switch tab and clean row selection
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedRowId(null);
    setGlobalSearch('');
  };

  // Helper inside render to format currencies in standard Chilean CLP format
  const formatCLP = (val: number | undefined) => {
    if (val === undefined || val === null) return '$0';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);
  };

  // Helper to format Date to beautiful readable text
  const formatDate = (val: string | number | undefined) => {
    if (!val) return 'N/A';
    if (typeof val === 'number') {
      return new Date(val).toLocaleDateString('es-CL');
    }
    return new Date(val).toLocaleDateString('es-CL');
  };

  // ERP-style metadata block generator (F980011D simulation)
  const getAuditData = (record: any, type: string) => {
    const programIdMap = {
      'TRANSACTION': record.programId || 'P0911',
      'SUPPLIER': 'P04012',
      'PROPERTY': 'P1501',
      'WORK_ORDER': 'P48201',
      'LEASE': 'P15012',
      'CONTRACT': 'P1501'
    };

    return {
      registryId: record.id || 'N/A',
      programId: programIdMap[type as keyof typeof programIdMap] || 'P0000',
      workStationId: record.workStationId || 'CH_SANTIAGO_WS04',
      nextNumberSeq: record.nextNumberSeq || Math.floor(100000 + Math.random() * 900000),
      hashSignature: record.hashSignature || `SHA256:${Math.random().toString(16).substring(2, 10).toUpperCase()}${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
      timestamp: record.timestamp ? new Date(record.timestamp).toLocaleString('es-CL') : new Date().toLocaleString('es-CL'),
      userCreator: record.userCreator || record.user || 'SISTEMA',
      lockedBy: record.lockedBy || 'LIBRE',
      lockedAt: record.lockedAt ? new Date(record.lockedAt).toLocaleString('es-CL') : 'N/A',
      isTest: record.isTest ? 'SÍ (REPORTE DE PRUEBA)' : 'SÍ (MAESTRO PRODUCCIÓN)'
    };
  };

  // ==========================================
  // FILTERS IMPLEMENTATION PER TABS
  // ==========================================
  // FILTERS IMPLEMENTATION PER TABS
  // ==========================================

  // 1. F0911 Transactions Memo Matcher
  const filteredF0911 = useMemo(() => {
    return transactions.filter(t => {
      const g = globalSearch.toLowerCase();
      const matchesGlobal = !g || 
        t.documentNumber?.toLowerCase().includes(g) ||
        t.description?.toLowerCase().includes(g) ||
        t.supplierName?.toLowerCase().includes(g) ||
        t.propertyId?.toLowerCase().includes(g) ||
        t.accountCode?.toLowerCase().includes(g);

      const f = f0911Filters;
      const matchesFolio = !f.folio || t.documentNumber?.toLowerCase().includes(f.folio.toLowerCase());
      const matchesDocType = !f.documentType || t.documentType?.toLowerCase().includes(f.documentType.toLowerCase());
      const matchesDesc = !f.description || t.description?.toLowerCase().includes(f.description.toLowerCase());
      const matchesSupplier = !f.supplierName || t.supplierName?.toLowerCase().includes(f.supplierName.toLowerCase()) || t.supplierTaxId?.toLowerCase().includes(f.supplierName.toLowerCase());
      const matchesProp = !f.propertyLabel || t.propertyId?.toLowerCase().includes(f.propertyLabel.toLowerCase());
      const matchesAmount = !f.amount || t.amount?.toString().includes(f.amount);
      const matchesAccount = !f.accountCode || t.accountCode?.toLowerCase().includes(f.accountCode.toLowerCase());
      const matchesStatus = !f.status || t.status?.toLowerCase().includes(f.status.toLowerCase());
      const matchesDate = !f.date || t.date?.includes(f.date);

      // Global filters
      const matchesGlobalRisk = selectedGlobalRisk === 'ALL' || getSupplierRisk(t.supplierName || '') === selectedGlobalRisk;
      const matchesCompany = selectedCompany === 'ALL' || 
        (selectedCompany === '00001' && (t.id.includes('demo') || t.documentNumber?.startsWith('TR'))) ||
        (selectedCompany === '00002' && (!t.id.includes('demo') && !t.documentNumber?.startsWith('TR')));

      return matchesGlobal && matchesFolio && matchesDocType && matchesDesc && matchesSupplier && matchesProp && matchesAmount && matchesAccount && matchesStatus && matchesDate && matchesGlobalRisk && matchesCompany;
    });
  }, [transactions, globalSearch, f0911Filters, selectedGlobalRisk, selectedCompany, suppliers]);

  // 2. F0401 Suppliers Memo Matcher
  const filteredF0401 = useMemo(() => {
    return suppliers.filter(s => {
      const g = globalSearch.toLowerCase();
      const matchesGlobal = !g ||
        s.name?.toLowerCase().includes(g) ||
        s.taxId?.toLowerCase().includes(g) ||
        s.category?.toLowerCase().includes(g) ||
        s.folio?.toLowerCase().includes(g);

      const f = f0401Filters;
      const matchesFolio = !f.folio || s.folio?.toLowerCase().includes(f.folio.toLowerCase());
      const matchesTaxId = !f.taxId || s.taxId?.toLowerCase().includes(f.taxId.toLowerCase());
      const matchesName = !f.name || s.name?.toLowerCase().includes(f.name.toLowerCase());
      const matchesCat = !f.category || s.category?.toLowerCase().includes(f.category.toLowerCase());
      const matchesStatus = !f.status || s.status?.toLowerCase().includes(f.status.toLowerCase());
      const matchesRisk = !f.dueDiligenceRisk || s.dueDiligenceRisk?.toLowerCase().includes(f.dueDiligenceRisk.toLowerCase());
      const matchesBank = !f.bankName || s.bankName?.toLowerCase().includes(f.bankName.toLowerCase());

      // Global filters
      const matchesGlobalRisk = selectedGlobalRisk === 'ALL' || s.dueDiligenceRisk === selectedGlobalRisk;
      const matchesCompany = selectedCompany === 'ALL' || 
        (selectedCompany === '00001' && (s.id.includes('demo') || s.id.includes('0001'))) ||
        (selectedCompany === '00002' && (!s.id.includes('demo') && !s.id.includes('0001')));

      return matchesGlobal && matchesFolio && matchesTaxId && matchesName && matchesCat && matchesStatus && matchesRisk && matchesBank && matchesGlobalRisk && matchesCompany;
    });
  }, [suppliers, globalSearch, f0401Filters, selectedGlobalRisk, selectedCompany]);

  // 3. F1501 Properties Memo Matcher
  const filteredF1501 = useMemo(() => {
    return properties.filter(p => {
      const g = globalSearch.toLowerCase();
      const matchesGlobal = !g ||
        p.code?.toLowerCase().includes(g) ||
        p.address?.toLowerCase().includes(g) ||
        p.commune?.toLowerCase().includes(g) ||
        p.conjunto?.toLowerCase().includes(g);

      const f = f1501Filters;
      const matchesCode = !f.code || p.code?.toLowerCase().includes(f.code.toLowerCase());
      const matchesRole = !f.propertyRole || p.propertyRole?.toLowerCase().includes(f.propertyRole.toLowerCase());
      const matchesAddress = !f.address || p.address?.toLowerCase().includes(f.address.toLowerCase());
      const matchesCommune = !f.commune || p.commune?.toLowerCase().includes(f.commune.toLowerCase());
      const matchesType = !f.type || p.type?.toLowerCase().includes(f.type.toLowerCase());
      const matchesAppraisal = !f.appraisalValue || p.appraisalValue?.toString().includes(f.appraisalValue);
      const matchesRent = !f.rentalAmount || p.rentalAmount?.toString().includes(f.rentalAmount);

      // Global filters
      const matchesCompany = selectedCompany === 'ALL' || 
        (selectedCompany === '00001' && (p.id.includes('demo') || p.code?.startsWith('I-'))) ||
        (selectedCompany === '00002' && (!p.id.includes('demo') && !p.code?.startsWith('I-')));

      return matchesGlobal && matchesCode && matchesRole && matchesAddress && matchesCommune && matchesType && matchesAppraisal && matchesRent && matchesCompany;
    });
  }, [properties, globalSearch, f1501Filters, selectedCompany]);

  // 4. F4801 Work Orders Memo Matcher
  const filteredF4801 = useMemo(() => {
    return workOrders.filter(w => {
      const g = globalSearch.toLowerCase();
      const matchesGlobal = !g ||
        w.folio?.toLowerCase().includes(g) ||
        w.supplierName?.toLowerCase().includes(g) ||
        w.propertyLabel?.toLowerCase().includes(g) ||
        w.reqDept?.toLowerCase().includes(g);

      const f = f4801Filters;
      const matchesFolio = !f.folio || w.folio?.toLowerCase().includes(f.folio.toLowerCase());
      const matchesStatus = !f.status || w.status?.toLowerCase().includes(f.status.toLowerCase());
      const matchesSupplier = !f.supplierName || w.supplierName?.toLowerCase().includes(f.supplierName.toLowerCase());
      const matchesProp = !f.propertyLabel || w.propertyLabel?.toLowerCase().includes(f.propertyLabel.toLowerCase());
      const matchesTotal = !f.total || w.total?.toString().includes(f.total);
      const matchesResp = !f.trackingResponsible || w.trackingResponsible?.toLowerCase().includes(f.trackingResponsible.toLowerCase());
      const matchesDate = !f.issueDate || w.issueDate?.includes(f.issueDate);

      // Global filters
      const matchesGlobalRisk = selectedGlobalRisk === 'ALL' || getSupplierRisk(w.supplierName || '') === selectedGlobalRisk;
      const matchesCompany = selectedCompany === 'ALL' || 
        (selectedCompany === '00001' && (w.id.includes('demo') || w.folio?.startsWith('OT'))) ||
        (selectedCompany === '00002' && (!w.id.includes('demo') && !w.folio?.startsWith('OT')));

      return matchesGlobal && matchesFolio && matchesStatus && matchesSupplier && matchesProp && matchesTotal && matchesResp && matchesDate && matchesGlobalRisk && matchesCompany;
    });
  }, [workOrders, globalSearch, f4801Filters, selectedGlobalRisk, selectedCompany, suppliers]);

  // 5. F1502 Lease Contracts Memo Matcher
  const filteredF1502 = useMemo(() => {
    return leaseContracts.filter(lc => {
      const g = globalSearch.toLowerCase();
      const matchesGlobal = !g ||
        lc.tenantName?.toLowerCase().includes(g) ||
        lc.tenantTaxId?.toLowerCase().includes(g) ||
        lc.propertyLabel?.toLowerCase().includes(g);

      const f = f1502Filters;
      const matchesTenant = !f.tenantName || lc.tenantName?.toLowerCase().includes(f.tenantName.toLowerCase());
      const matchesTaxId = !f.tenantTaxId || lc.tenantTaxId?.toLowerCase().includes(f.tenantTaxId.toLowerCase());
      const matchesProp = !f.propertyLabel || lc.propertyLabel?.toLowerCase().includes(f.propertyLabel.toLowerCase());
      const matchesAmount = !f.monthlyAmount || lc.monthlyAmount?.toString().includes(f.monthlyAmount);
      const matchesStatus = !f.status || lc.status?.toLowerCase().includes(f.status.toLowerCase());
      const matchesDate = !f.startDate || lc.startDate?.includes(f.startDate);

      // Global filters
      const matchesCompany = selectedCompany === 'ALL' || 
        (selectedCompany === '00001' && lc.id.includes('demo')) ||
        (selectedCompany === '00002' && !lc.id.includes('demo'));

      return matchesGlobal && matchesTenant && matchesTaxId && matchesProp && matchesAmount && matchesStatus && matchesDate && matchesCompany;
    });
  }, [leaseContracts, globalSearch, f1502Filters, selectedCompany]);

  // 6. F0402 Supplier Service Contracts Memo Matcher
  const filteredF0402 = useMemo(() => {
    return contracts.filter(c => {
      const g = globalSearch.toLowerCase();
      const matchesGlobal = !g ||
        c.supplierName?.toLowerCase().includes(g) ||
        c.building?.toLowerCase().includes(g);

      const f = f0402Filters;
      const matchesSupplier = !f.supplierName || c.supplierName?.toLowerCase().includes(f.supplierName.toLowerCase());
      const matchesBuilding = !f.building || c.building?.toLowerCase().includes(f.building.toLowerCase());
      const matchesAmount = !f.monthlyAmount || c.monthlyAmount?.toString().includes(f.monthlyAmount);
      const matchesStatus = !f.status || c.status?.toLowerCase().includes(f.status.toLowerCase());
      const matchesStartDate = !f.startDate || c.startDate?.includes(f.startDate);
      const matchesEndDate = !f.endDate || c.endDate?.includes(f.endDate);

      // Global filters
      const matchesGlobalRisk = selectedGlobalRisk === 'ALL' || getSupplierRisk(c.supplierName || '') === selectedGlobalRisk;
      const matchesCompany = selectedCompany === 'ALL' || 
        (selectedCompany === '00001' && c.id.includes('demo')) ||
        (selectedCompany === '00002' && !c.id.includes('demo'));

      return matchesGlobal && matchesSupplier && matchesBuilding && matchesAmount && matchesStatus && matchesStartDate && matchesEndDate && matchesGlobalRisk && matchesCompany;
    });
  }, [contracts, globalSearch, f0402Filters, selectedGlobalRisk, selectedCompany, suppliers]);

  // Listen for global ERP Toolbar Events (Top Menu Bar)
  useEffect(() => {
    const handleJdeFind = () => {
      setCurrentPage(0);
    };
    const handleJdeExport = () => {
      handleExportXLSX();
    };
    const handleJdeClearQBE = () => {
      resetAllFilters();
    };
    const handleJdePrint = () => {
      handlePrintPDF();
    };

    window.addEventListener('jde:find', handleJdeFind);
    window.addEventListener('jde:export', handleJdeExport);
    window.addEventListener('jde:clear_qbe', handleJdeClearQBE);
    window.addEventListener('jde:print', handleJdePrint);

    return () => {
      window.removeEventListener('jde:find', handleJdeFind);
      window.removeEventListener('jde:export', handleJdeExport);
      window.removeEventListener('jde:clear_qbe', handleJdeClearQBE);
      window.removeEventListener('jde:print', handleJdePrint);
    };
  }, [activeTab, filteredF0911, filteredF0401, filteredF1501, filteredF4801, filteredF1502, filteredF0402]);

  // ==========================================
  // REAL ERP PAGINATION HELPERS
  // ==========================================
  const paginatedF0911 = useMemo(() => {
    return filteredF0911.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filteredF0911, currentPage, pageSize]);

  const paginatedF0401 = useMemo(() => {
    return filteredF0401.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filteredF0401, currentPage, pageSize]);

  const paginatedF1501 = useMemo(() => {
    return filteredF1501.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filteredF1501, currentPage, pageSize]);

  const paginatedF4801 = useMemo(() => {
    return filteredF4801.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filteredF4801, currentPage, pageSize]);

  const paginatedF1502 = useMemo(() => {
    return filteredF1502.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filteredF1502, currentPage, pageSize]);

  const paginatedF0402 = useMemo(() => {
    return filteredF0402.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filteredF0402, currentPage, pageSize]);

  const currentTotalCount = useMemo(() => {
    switch (activeTab) {
      case 'F0911_TRANS': return filteredF0911.length;
      case 'F0401_PROV': return filteredF0401.length;
      case 'F1501_PROP': return filteredF1501.length;
      case 'F4801_OT': return filteredF4801.length;
      case 'F1502_LEASES': return filteredF1502.length;
      case 'F0402_CONTS': return filteredF0402.length;
      default: return 0;
    }
  }, [activeTab, filteredF0911.length, filteredF0401.length, filteredF1501.length, filteredF4801.length, filteredF1502.length, filteredF0402.length]);

  const totalPages = Math.ceil(currentTotalCount / pageSize);

  // Export spreadsheet using xlsx
  const handleExportXLSX = () => {
    let dataset: any[] = [];
    let sheetName = "";

    switch (activeTab) {
      case 'F0911_TRANS':
        dataset = filteredF0911.map(t => ({
          'Folio Docto': t.documentNumber || 'N/A',
          'Tipo Doc': t.documentType || 'N/A',
          'Descripción / Glosa': t.description,
          'Monto ($)': t.amount,
          'Razón Social Proveedor': t.supplierName || 'N/A',
          'Dirección / Unidad': t.propertyId || 'N/A',
          'Cuenta Contable': t.accountCode || 'N/A',
          'Estado Registro': t.status || 'PENDIENTE',
          'Compañía Seguros': t.insuranceCompany,
          'Fecha Emisión': t.date
        }));
        sheetName = "F0911_Libro_Diario";
        break;

      case 'F0401_PROV':
        dataset = filteredF0401.map(s => ({
          'Folio': s.folio || 'N/A',
          'RUT Proveedor': s.taxId,
          'Razón Social': s.name,
          'Categoría': s.category,
          'Estado Auditoría': s.status,
          'Tipo Tributario': s.taxDocumentType,
          'Riesgo Due Diligence': s.dueDiligenceRisk,
          'Institución Bancaria': s.bankName,
          'N° Cuenta': s.accountNumber,
          'Fecha DD': s.dueDiligenceDate
        }));
        sheetName = "F0401_Maestro_Proveedores";
        break;

      case 'F1501_PROP':
        dataset = filteredF1501.map(p => ({
          'Código Unidad': p.code,
          'ROL Avalúo': p.propertyRole || 'N/A',
          'Dirección': p.address,
          'Comuna': p.commune,
          'Tipo Inmueble': p.type,
          'Conjunto Habitacional': p.conjunto || 'N/A',
          'Propietario Legal': p.owner || 'N/A',
          'Valor de Tasación': p.appraisalValue || 0,
          'Monto Arriendo Mensual': p.rentalAmount || 0
        }));
        sheetName = "F1501_Maestro_Unidades";
        break;

      case 'F4801_OT':
        dataset = filteredF4801.map(w => ({
          'Folio OT': w.folio,
          'Asunto Orden': w.items.map(i => i.description).join(', ') || 'N/A',
          'Estado Ejecución': w.status,
          'Proveedor Asignado': w.supplierName,
          'RUT Proveedor': w.supplierTaxId,
          'Monto Neto ($)': w.subtotal,
          'Impuestos IVA ($)': w.iva,
          'Total OT ($)': w.total,
          'Propiedad Afecta': w.propertyLabel,
          'Unidad ID': w.propertyId,
          'Depto Preparador': w.preparedByDept,
          'Responsable': w.trackingResponsible || 'N/A',
          'Fecha Carga': w.issueDate
        }));
        sheetName = "F4801_Ordenes_Trabajo";
        break;

      case 'F1502_LEASES':
        dataset = filteredF1502.map(lc => ({
          'Arrendatario': lc.tenantName,
          'RUT Arrendatario': lc.tenantTaxId,
          'Propiedad': lc.propertyLabel,
          'Monto Mensual': lc.monthlyAmount,
          'Moneda': lc.currency,
          'Fecha Inicio': lc.startDate,
          'Fecha Término': lc.endDate,
          'Estado Contrato': lc.status
        }));
        sheetName = "F1502_Arriendos";
        break;

      case 'F0402_CONTS':
        dataset = filteredF0402.map(c => ({
          'Proveedor Servicio': c.supplierName,
          'Unidad / Edificio': c.building,
          'Piso / Oficina': c.floor,
          'Monto Mensual ($)': c.monthlyAmount,
          'Fecha Inicio': c.startDate,
          'Fecha Cierre': c.endDate,
          'Resumen Contrato': c.summary,
          'Estado Contrato': c.status
        }));
        sheetName = "F0402_Contratos_Proveedores";
        break;
    }

    if (dataset.length === 0) {
      alert("No hay registros en la grilla que coincidan con la búsqueda actual para exportar.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataset);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 30));
    XLSX.writeFile(workbook, `JDE_Inquiry_${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Clear QBE column filters for active tab
  const handleClearActiveQBE = () => {
    switch (activeTab) {
      case 'F0911_TRANS':
        setF0911Filters({ folio: '', documentType: '', description: '', supplierName: '', propertyLabel: '', amount: '', accountCode: '', status: '', date: '' });
        break;
      case 'F0401_PROV':
        setF0401Filters({ folio: '', taxId: '', name: '', category: '', status: '', dueDiligenceRisk: '', bankName: '' });
        break;
      case 'F1501_PROP':
        setF1501Filters({ code: '', propertyRole: '', address: '', commune: '', type: '', appraisalValue: '', rentalAmount: '' });
        break;
      case 'F4801_OT':
        setF4801Filters({ folio: '', status: '', supplierName: '', propertyLabel: '', total: '', trackingResponsible: '', issueDate: '' });
        break;
      case 'F1502_LEASES':
        setF1502Filters({ tenantName: '', tenantTaxId: '', propertyLabel: '', monthlyAmount: '', status: '', startDate: '' });
        break;
      case 'F0402_CONTS':
        setF0402Filters({ supplierName: '', building: '', serviceType: '', monthlyAmount: '', status: '', expirationDate: '' });
        break;
    }
  };

  // PDF report of table
  const handlePrintPDF = () => {
    const doc = new jsPDF('l', 'mm', 'letter');
    doc.setFillColor(11, 60, 93); // ERP dark slate
    doc.rect(0, 0, 297, 25, 'F');

    // Draw Logo on the top right
    const isCustomLogo = companyLogo && (
      companyLogo.startsWith('data:image/png') || 
      companyLogo.startsWith('data:image/jpeg') || 
      companyLogo.startsWith('data:image/webp')
    );

    if (isCustomLogo) {
      try {
        const format = companyLogo!.toLowerCase().includes('png') ? 'PNG' : 
                       companyLogo!.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(245, 3, 38, 19, 2, 2, 'F');
        doc.addImage(companyLogo!, format, 246, 4, 36, 17, undefined, 'FAST');
      } catch (err) {
        console.error("Error rendering uploaded logo in landscape PDF, drawing vector fallback:", err);
        drawPdfAssetFlowLogo(doc, 245, 3, 0.95);
      }
    } else {
      // Draw pristine vector AssetFlow logo natively in the PDF header
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(245, 3, 38, 19, 2, 2, 'F');
      drawPdfAssetFlowLogo(doc, 246, 4, 0.44);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSETFLOW ASSETFLOW - CONSULTA GENERAL DE CONTROL INTERNO', 15, 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('VISOR INTERCONECTADO DE ATRIBUTOS, MAESTROS Y TRANSACCIONES [PROGRAM v2.0]', 15, 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Impreso por: ${currentUser || 'SISTEMA'} - ${new Date().toLocaleString()}`, 175, 11);

    // Dynamic grid based on tab
    let headers: string[] = [];
    let rows: any[][] = [];
    let title = "";

    if (activeTab === 'F0911_TRANS') {
      title = "F0911 - DIARIO GASTOS Y TRANSACCIONES DE CAJA Y CUENTAS POR PAGAR";
      headers = ['Docto', 'Tipo', 'Glosa', 'Proveedor', 'Propiedad', 'Monto', 'Cuenta', 'Estado', 'Fecha'];
      rows = filteredF0911.map(t => [
        t.documentNumber || 'N/A',
        t.documentType || 'N/A',
        t.description?.substring(0, 35) || '',
        t.supplierName?.substring(0, 25) || 'N/A',
        t.propertyId || 'N/A',
        formatCLP(t.amount),
        t.accountCode || 'N/A',
        t.status || 'PENDIENTE',
        t.date
      ]);
    } else if (activeTab === 'F0401_PROV') {
      title = "F0401 - MAESTRO DE PROVEEDORES DE SERVICIOS Y AUDITORÍA DE COMPLIANCE";
      headers = ['Folio', 'RUT', 'Nombre', 'Categoría', 'Riesgo DD', 'Institución', 'Estado', 'Fecha DD'];
      rows = filteredF0401.map(s => [
        s.folio || 'N/A',
        s.taxId,
        s.name.substring(0, 40),
        s.category,
        s.dueDiligenceRisk,
        s.bankName,
        s.status,
        s.dueDiligenceDate || 'N/A'
      ]);
    } else if (activeTab === 'F1501_PROP') {
      title = "F1501 - MAESTRO GENERAL DE PROPIEDADES, CATASTRO Inmobiliario Y TASACIONES";
      headers = ['Código', 'ROL', 'Dirección', 'Comuna', 'Tipo Inmueble', 'Propietario', 'Valor Tasación', 'Canon Arriendo'];
      rows = filteredF1501.map(p => [
        p.code,
        p.propertyRole || 'N/A',
        p.address.substring(0, 40),
        p.commune,
        p.type,
        p.owner?.substring(0, 25) || 'N/A',
        formatCLP(p.appraisalValue),
        formatCLP(p.rentalAmount)
      ]);
    } else if (activeTab === 'F4801_OT') {
      title = "F4801 - HOJA DE TRABAJO DE ÓRDENES DE MANTENCIMIENTO Y OBRAS CIVILES";
      headers = ['Folio OT', 'Descripción', 'Estado', 'Proveedor', 'Monto Neto', 'Total OT', 'Unidad Afecta', 'Responsable'];
      rows = filteredF4801.map(w => [
        w.folio,
        w.items[0]?.description.substring(0, 35) || 'N/A',
        w.status,
        w.supplierName.substring(0, 25),
        formatCLP(w.subtotal),
        formatCLP(w.total),
        w.propertyLabel,
        w.trackingResponsible || 'N/A'
      ]);
    } else if (activeTab === 'F1502_LEASES') {
      title = "F1502 - ADMINISTRACIÓN DE CONTRATOS DE ARRIENDO CON INQUILINOS";
      headers = ['Arrendatario', 'RUT', 'Unidad Inmobiliaria', 'Monto Mensual', 'Inicio', 'Vence', 'Estado'];
      rows = filteredF1502.map(lc => [
        lc.tenantName.substring(0, 30),
        lc.tenantTaxId,
        lc.propertyLabel,
        formatCLP(lc.monthlyAmount) + " " + lc.currency,
        lc.startDate,
        lc.endDate,
        lc.status
      ]);
    } else if (activeTab === 'F0402_CONTS') {
      title = "F0402 - REGISTRO DE CONTRATOS DE PROVEEDORES Y SERVICIOS DIRECTOS";
      headers = ['Proveedor', 'Edificio/Unidad', 'Piso/Of', 'Monto Mensual', 'Inicio', 'Vence', 'Estado'];
      rows = filteredF0402.map(c => [
        c.supplierName.substring(0, 30),
        c.building,
        c.floor,
        formatCLP(c.monthlyAmount),
        c.startDate,
        c.endDate,
        c.status
      ]);
    }

    doc.setTextColor(11, 60, 93);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, 15, 33);

    (doc as any).autoTable({
      startY: 37,
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [210, 220, 230] },
      headStyles: { fillColor: [11, 60, 93], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [244, 247, 249] }
    });

    // Dynamic Folio and Page Numbering X de YY
    const reportFolio = `FL-${activeTab}-${Math.floor(100000 + Math.random() * 900000)}`;
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Documento de Integridad Corporativa ERP-ASSETFLOW | Folio: ${reportFolio}`, 15, 202);
      doc.text(`Página ${i} de ${pageCount}`, 260, 202);
    }

    doc.save(`Inquiry_General_${activeTab}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handlePrintSingleRowPDF = (rec: any, entityType: string) => {
    if (!rec) return;
    const doc = new jsPDF('p', 'mm', 'letter');
    
    // Header banner with classical blue ERP color
    doc.setFillColor(11, 60, 93); // ERP dark slate
    doc.rect(0, 0, 210, 30, 'F');

    // Draw Logo on the top right
    const isCustomLogo = companyLogo && (
      companyLogo.startsWith('data:image/png') || 
      companyLogo.startsWith('data:image/jpeg') || 
      companyLogo.startsWith('data:image/webp')
    );

    if (isCustomLogo) {
      try {
        const format = companyLogo!.toLowerCase().includes('png') ? 'PNG' : 
                       companyLogo!.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(160, 3, 38, 24, 2, 2, 'F');
        doc.addImage(companyLogo!, format, 161, 4, 36, 22, undefined, 'FAST');
      } catch (err) {
        console.error("Error rendering uploaded logo in single PDF, drawing vector fallback:", err);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(160, 3, 38, 24, 2, 2, 'F');
        drawPdfAssetFlowLogo(doc, 161, 4.5, 0.44);
      }
    } else {
      // Draw pristine vector AssetFlow logo natively in the PDF header
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(160, 3, 38, 24, 2, 2, 'F');
      drawPdfAssetFlowLogo(doc, 161, 4.5, 0.44);
    }

    // Title text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSETFLOW ENTERPRISE AssetFlow Enterprise', 15, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('COMPROBANTE DE REGISTRO EN MAESTRO - FORMULARIO F980011D', 15, 17);
    doc.text(`SISTEMA DE CONTROL INTERNO Y AUDITORÍA DE COMPLIANCE - ASSETFLOW`, 15, 22);

    // Audit metadata blocks (F980011D simulation)
    const audit = getAuditData(rec, entityType);

    doc.setFillColor(240, 244, 248);
    doc.rect(15, 38, 180, 25, 'F');
    doc.setDrawColor(11, 60, 93);
    doc.setLineWidth(0.3);
    doc.rect(15, 38, 180, 25, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 60, 93);
    doc.text('METADATOS DE AUDITORÍA F980011D (SISTEMA DE SEGURIDAD EN CAPA)', 18, 43);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(`ID Registro: ${audit.registryId}`, 18, 48);
    doc.text(`Estación de Trabajo: ${audit.workStationId}`, 18, 52);
    doc.text(`Usuario Creador: ${audit.userCreator}`, 18, 56);

    doc.text(`Programa ERP: ${audit.programId}`, 110, 48);
    doc.text(`Sello de Tiempo: ${audit.timestamp}`, 110, 52);
    doc.text(`Firma Hash: ${audit.hashSignature.substring(0, 30)}...`, 110, 56);

    // Main section header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 60, 93);
    doc.text('DETALLE DEL REGISTRO INSPECIONADO', 15, 72);

    // Dynamic grid of details based on entityType
    let tableData: [string, string][] = [];
    if (entityType === 'TRANSACTION') {
      tableData = [
        ['Número de Documento (Folio)', rec.documentNumber || 'N/A'],
        ['Tipo de Documento', rec.documentType || 'N/A'],
        ['Descripción / Glosa', rec.description || 'N/A'],
        ['Monto Total', formatCLP(rec.amount)],
        ['Proveedor Relacionado', rec.supplierName || 'N/A'],
        ['RUT Proveedor', rec.supplierTaxId || 'N/A'],
        ['Propiedad / Unidad', rec.propertyId || 'N/A'],
        ['Cuenta Contable ERP', rec.accountCode || 'N/A'],
        ['Estado de Transacción', rec.status || 'PENDIENTE'],
        ['Fecha de Registro', rec.date || 'N/A'],
        ['Aseguradora Asociada', rec.insuranceCompany || 'N/A'],
      ];
    } else if (entityType === 'SUPPLIER') {
      tableData = [
        ['Folio Maestro ERP', rec.folio || 'N/A'],
        ['RUT del Proveedor', rec.taxId || 'N/A'],
        ['Razón Social', rec.name || 'N/A'],
        ['Categoría del Rubro', rec.category || 'N/A'],
        ['Estado de Compliance', rec.status || 'N/A'],
        ['Nivel de Riesgo DD', rec.dueDiligenceRisk || 'N/A'],
        ['Banco del Proveedor', rec.bankName || 'N/A'],
        ['Número de Cuenta', rec.accountNumber || 'N/A'],
        ['Tipo de Cuenta Bancaria', rec.accountType || 'N/A'],
        ['Fecha de Debida Diligencia', rec.dueDiligenceDate || 'N/A'],
        ['Observaciones de Auditoría', rec.observations || 'N/A'],
      ];
    } else if (entityType === 'PROPERTY') {
      tableData = [
        ['Código de Propiedad', rec.code || 'N/A'],
        ['ROL del Avalúo', rec.propertyRole || 'N/A'],
        ['Dirección Física', rec.address || 'N/A'],
        ['Comuna', rec.commune || 'N/A'],
        ['Tipo de Unidad', rec.type || 'N/A'],
        ['Conjunto Inmobiliario', rec.conjunto || 'N/A'],
        ['Propietario Legal', rec.owner || 'N/A'],
        ['Valor de Tasación Fiscal', formatCLP(rec.appraisalValue)],
        ['Monto Base de Canon', formatCLP(rec.rentalAmount)],
        ['Superficie (m2)', rec.m2 ? `${rec.m2} m²` : 'N/A'],
      ];
    } else if (entityType === 'WORK_ORDER') {
      tableData = [
        ['Folio de Orden de Trabajo (OT)', rec.folio || 'N/A'],
        ['Estado Actual de la Obra', rec.status || 'N/A'],
        ['Razón Social Proveedor', rec.supplierName || 'N/A'],
        ['RUT Proveedor Asignado', rec.supplierTaxId || 'N/A'],
        ['Propiedad Afectada', rec.propertyLabel || 'N/A'],
        ['Subtotal (Monto Neto)', formatCLP(rec.subtotal)],
        ['Monto IVA (19%)', formatCLP(rec.iva)],
        ['Total General OT', formatCLP(rec.total)],
        ['Departamento Creador', rec.preparedByDept || 'N/A'],
        ['Responsable de Control', rec.trackingResponsible || 'N/A'],
        ['Fecha de Carga y Registro', rec.issueDate || 'N/A'],
      ];
    } else if (entityType === 'LEASE') {
      tableData = [
        ['Nombre del Inquilino (Arrendatario)', rec.tenantName || 'N/A'],
        ['RUT del Inquilino', rec.tenantTaxId || 'N/A'],
        ['Propiedad Arrendada', rec.propertyLabel || 'N/A'],
        ['Monto Arriendo Mensual', formatCLP(rec.monthlyAmount) + ' ' + (rec.currency || 'CLP')],
        ['Fecha de Inicio de Contrato', rec.startDate || 'N/A'],
        ['Fecha de Vencimiento', rec.endDate || 'N/A'],
        ['Estado del Contrato', rec.status || 'N/A'],
      ];
    } else if (entityType === 'CONTRACT') {
      tableData = [
        ['Proveedor del Servicio', rec.supplierName || 'N/A'],
        ['Unidad Inmobiliaria', rec.building || 'N/A'],
        ['Piso / Oficina', rec.floor || 'N/A'],
        ['Monto Mensual del Contrato', formatCLP(rec.monthlyAmount)],
        ['Fecha de Inicio', rec.startDate || 'N/A'],
        ['Fecha de Cierre', rec.endDate || 'N/A'],
        ['Resumen de Servicios', rec.summary || 'N/A'],
        ['Estado de Vigencia', rec.status || 'N/A'],
      ];
    }

    (doc as any).autoTable({
      startY: 77,
      head: [['Atributo del Maestro ERP', 'Valor del Atributo Registrado']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2, lineColor: [210, 220, 230] },
      headStyles: { fillColor: [11, 60, 93], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold', fillColor: [245, 247, 250] },
        1: { cellWidth: 110 }
      }
    });

    // Verification Footer
    const finalY = (doc as any).lastAutoTable.finalY || 180;
    doc.setFillColor(252, 243, 207);
    doc.rect(15, finalY + 8, 180, 22, 'F');
    doc.setDrawColor(212, 172, 13);
    doc.rect(15, finalY + 8, 180, 22, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 90, 10);
    doc.text('CERTIFICADO DE CONGRUENCIA CONTABLE Y VERIFICACIÓN', 18, finalY + 13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Este documento sirve como respaldo físico de la auditoría. Los datos aquí mostrados coinciden plenamente', 18, finalY + 18);
    doc.text('con el libro auxiliar y la firma electrónica inmutable registrada en el módulo de Bóveda Digital.', 18, finalY + 22);

    // Footer lines
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text(`Comprobante Autogenerado por AssetFlow AssetFlow ERP en base a ERP-schema v9.1`, 15, finalY + 37);

    // Dynamic Folio and Page Numbering X de YY
    const singleFolio = `FL-${entityType.substring(0, 3)}-${(rec.id || rec.folio || 'N/A').substring(0, 12).toUpperCase()}`;
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Documento de Integridad Corporativa ERP-ASSETFLOW | Folio: ${singleFolio}`, 15, 287);
      doc.text(`Página ${i} de ${pageCount}`, 170, 287);
    }

    doc.save(`Comprobante_JDE_${entityType}_${(rec.id || rec.folio || 'REC').substring(0, 8)}.pdf`);
  };

  const renderRelationsPanel = () => {
    const rec = getSelectedRecord();
    if (!rec) return null;
    const audit = getAuditData(rec, activeTab === 'F0911_TRANS' ? 'TRANSACTION' : activeTab === 'F0401_PROV' ? 'SUPPLIER' : activeTab === 'F1501_PROP' ? 'PROPERTY' : activeTab === 'F4801_OT' ? 'WORK_ORDER' : activeTab === 'F1502_LEASES' ? 'LEASE' : 'CONTRACT');

    return (
      <div className="flex-1 flex flex-col h-full bg-[#EBF0F5] overflow-hidden font-mono">
        
        {/* Relations Panel Tabs Bar */}
        <div className="bg-[#DCE7F2] border-b border-[#6B8095] px-2 pt-1.5 flex flex-wrap items-end gap-1 shrink-0">
          
          <button
            onClick={() => setActiveRelationsTab('AUDIT')}
            className={`px-2.5 py-1 text-[9.5px] uppercase font-bold border rounded-t-sm flex items-center gap-1 cursor-pointer transition-all ${
              activeRelationsTab === 'AUDIT'
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-10 font-extrabold pb-1.5'
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <ShieldCheck size={11} className="text-emerald-600" />
            <span>F980011D (Auditoría)</span>
          </button>

          <button
            onClick={() => setActiveRelationsTab('F0911')}
            className={`px-2.5 py-1 text-[9.5px] uppercase font-bold border rounded-t-sm flex items-center gap-1 cursor-pointer transition-all ${
              activeRelationsTab === 'F0911'
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-10 font-extrabold pb-1.5'
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <Database size={11} className="text-[#1C4E75]" />
            <span>Diario F0911 ({relatedData.transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveRelationsTab('F0401')}
            className={`px-2.5 py-1 text-[9.5px] uppercase font-bold border rounded-t-sm flex items-center gap-1 cursor-pointer transition-all ${
              activeRelationsTab === 'F0401'
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-10 font-extrabold pb-1.5'
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <User size={11} className="text-[#1C4E75]" />
            <span>Proveedor F0401 ({relatedData.suppliers.length})</span>
          </button>

          <button
            onClick={() => setActiveRelationsTab('F1501')}
            className={`px-2.5 py-1 text-[9.5px] uppercase font-bold border rounded-t-sm flex items-center gap-1 cursor-pointer transition-all ${
              activeRelationsTab === 'F1501'
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-10 font-extrabold pb-1.5'
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <Building2 size={11} className="text-[#1C4E75]" />
            <span>Catastro F1501 ({relatedData.properties.length})</span>
          </button>

          <button
            onClick={() => setActiveRelationsTab('F4801')}
            className={`px-2.5 py-1 text-[9.5px] uppercase font-bold border rounded-t-sm flex items-center gap-1 cursor-pointer transition-all ${
              activeRelationsTab === 'F4801'
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-10 font-extrabold pb-1.5'
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <Wrench size={11} className="text-[#1C4E75]" />
            <span>OT F4801 ({relatedData.workOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveRelationsTab('F1502')}
            className={`px-2.5 py-1 text-[9.5px] uppercase font-bold border rounded-t-sm flex items-center gap-1 cursor-pointer transition-all ${
              activeRelationsTab === 'F1502'
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-10 font-extrabold pb-1.5'
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <Key size={11} className="text-[#1C4E75]" />
            <span>Inquilinos F1502 ({relatedData.leaseContracts.length})</span>
          </button>

          <button
            onClick={() => setActiveRelationsTab('F0402')}
            className={`px-2.5 py-1 text-[9.5px] uppercase font-bold border rounded-t-sm flex items-center gap-1 cursor-pointer transition-all ${
              activeRelationsTab === 'F0402'
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-10 font-extrabold pb-1.5'
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <FileCheck size={11} className="text-[#1C4E75]" />
            <span>Servicios F0402 ({relatedData.contracts.length})</span>
          </button>

        </div>

        {/* Relations Panel Body */}
        <div className="flex-1 overflow-auto bg-white p-2 text-[10px]">
          
          {/* TAB 1: AUDIT */}
          {activeRelationsTab === 'AUDIT' && (
            <div className="space-y-2 p-1.5 font-mono">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-sm">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[10px]">
                  <div>
                    <span className="text-slate-400 block text-[8px] font-bold uppercase">Folio de Control</span>
                    <strong className="text-[#1C4E75] font-black font-sans text-xs">{rec.folio || rec.code || rec.id?.slice(0,10).toUpperCase()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[8px] font-bold uppercase">ERP Program ID</span>
                    <strong className="text-slate-800 font-bold">{audit.programId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[8px] font-bold uppercase">Next No Seq</span>
                    <strong className="text-purple-900 font-black">#{audit.nextNumberSeq}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[8px] font-bold uppercase">Terminal / WS MKEY</span>
                    <strong className="text-slate-600 truncate block">{audit.workStationId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[8px] font-bold uppercase">Creador / Auditor</span>
                    <strong className="text-slate-800 font-black">{audit.userCreator}</strong>
                  </div>
                  <div className="col-span-3 border-t border-slate-100 pt-1.5">
                    <span className="text-slate-400 block text-[8px] font-bold uppercase">Hash de Seguridad Criptográfico (F980011D)</span>
                    <strong className="text-emerald-700 block truncate select-all">{audit.hashSignature}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[8px] font-bold uppercase">Sincronización</span>
                    <strong className="text-slate-800">{audit.timestamp}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[8px] font-bold uppercase">Bloqueo Preventivo</span>
                    <strong className="text-rose-700">LOCKED (Cristian M.)</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: F0911 (Transactions) */}
          {activeRelationsTab === 'F0911' && (
            <div className="overflow-auto max-h-full">
              {relatedData.transactions.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1C4E75] text-white font-bold text-[9px]">
                      <th className="px-2 py-1 border border-slate-200">Folio</th>
                      <th className="px-2 py-1 border border-slate-200">Tipo Doc</th>
                      <th className="px-2 py-1 border border-slate-200">Descripción</th>
                      <th className="px-2 py-1 border border-slate-200">Proveedor</th>
                      <th className="px-2 py-1 border border-slate-200 text-right">Monto</th>
                      <th className="px-2 py-1 border border-slate-200">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedData.transactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 border-b border-slate-100 odd:bg-slate-50/30 text-[9.5px]">
                        <td className="px-2 py-1 border border-slate-100 font-bold">{t.folio}</td>
                        <td className="px-2 py-1 border border-slate-100">{t.documentType}</td>
                        <td className="px-2 py-1 border border-slate-100 font-sans">{t.description}</td>
                        <td className="px-2 py-1 border border-slate-100 font-sans truncate max-w-[120px]">{t.supplierName}</td>
                        <td className="px-2 py-1 border border-slate-100 text-right font-bold text-[#1C4E75]">{formatCLP(t.amount)}</td>
                        <td className="px-2 py-1 border border-slate-100">{t.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-400 uppercase tracking-widest text-[9px] font-mono">[NO_MATCHING_RECORDS_IN_F0911]</div>
              )}
            </div>
          )}

          {/* TAB 3: F0401 (Suppliers) */}
          {activeRelationsTab === 'F0401' && (
            <div className="overflow-auto max-h-full">
              {relatedData.suppliers.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1C4E75] text-white font-bold text-[9px]">
                      <th className="px-2 py-1 border border-slate-200">RUT</th>
                      <th className="px-2 py-1 border border-slate-200">Nombre o Razón Social</th>
                      <th className="px-2 py-1 border border-slate-200">Categoría</th>
                      <th className="px-2 py-1 border border-slate-200 text-center">Riesgo Compliance</th>
                      <th className="px-2 py-1 border border-slate-200 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedData.suppliers.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 border-b border-slate-100 odd:bg-slate-50/30 text-[9.5px]">
                        <td className="px-2 py-1 border border-slate-100 font-bold">{s.taxId}</td>
                        <td className="px-2 py-1 border border-slate-100 font-sans font-bold text-[#1C4E75]">{s.name}</td>
                        <td className="px-2 py-1 border border-slate-100">{s.category}</td>
                        <td className="px-2 py-1 border border-slate-100 text-center font-bold text-rose-700">{s.dueDiligenceRisk}</td>
                        <td className="px-2 py-1 border border-slate-100 text-center font-bold text-emerald-800">{s.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-400 uppercase tracking-widest text-[9px] font-mono">[NO_MATCHING_RECORDS_IN_F0401]</div>
              )}
            </div>
          )}

          {/* TAB 4: F1501 (Properties) */}
          {activeRelationsTab === 'F1501' && (
            <div className="overflow-auto max-h-full">
              {relatedData.properties.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1C4E75] text-white font-bold text-[9px]">
                      <th className="px-2 py-1 border border-slate-200">Código</th>
                      <th className="px-2 py-1 border border-slate-200">Dirección</th>
                      <th className="px-2 py-1 border border-slate-200">Comuna</th>
                      <th className="px-2 py-1 border border-slate-200">Tipo</th>
                      <th className="px-2 py-1 border border-slate-200 text-right">Renta Sugerida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedData.properties.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 border-b border-slate-100 odd:bg-slate-50/30 text-[9.5px]">
                        <td className="px-2 py-1 border border-slate-100 font-bold">{p.code}</td>
                        <td className="px-2 py-1 border border-slate-100 font-sans font-bold text-[#1C4E75]">{p.address}</td>
                        <td className="px-2 py-1 border border-slate-100">{p.commune}</td>
                        <td className="px-2 py-1 border border-slate-100">{p.type}</td>
                        <td className="px-2 py-1 border border-slate-100 text-right font-bold text-emerald-700">{formatCLP(p.rentalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-400 uppercase tracking-widest text-[9px] font-mono">[NO_MATCHING_RECORDS_IN_F1501]</div>
              )}
            </div>
          )}

          {/* TAB 5: F4801 (Work Orders) */}
          {activeRelationsTab === 'F4801' && (
            <div className="overflow-auto max-h-full">
              {relatedData.workOrders.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1C4E75] text-white font-bold text-[9px]">
                      <th className="px-2 py-1 border border-slate-200">Folio</th>
                      <th className="px-2 py-1 border border-slate-200">Status</th>
                      <th className="px-2 py-1 border border-slate-200">Proveedor</th>
                      <th className="px-2 py-1 border border-slate-200">Propiedad</th>
                      <th className="px-2 py-1 border border-slate-200 text-right">Monto Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedData.workOrders.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50 border-b border-slate-100 odd:bg-slate-50/30 text-[9.5px]">
                        <td className="px-2 py-1 border border-slate-100 font-bold">{w.folio}</td>
                        <td className="px-2 py-1 border border-slate-100 text-center">
                          <span className="bg-amber-100 text-amber-900 px-1 py-0.2 text-[8px] font-black rounded">{w.status}</span>
                        </td>
                        <td className="px-2 py-1 border border-slate-100 font-sans">{w.supplierName}</td>
                        <td className="px-2 py-1 border border-slate-100">{w.propertyLabel}</td>
                        <td className="px-2 py-1 border border-slate-100 text-right font-bold text-[#1C4E75]">{formatCLP(w.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-400 uppercase tracking-widest text-[9px] font-mono">[NO_MATCHING_RECORDS_IN_F4801]</div>
              )}
            </div>
          )}

          {/* TAB 6: F1502 (Leases) */}
          {activeRelationsTab === 'F1502' && (
            <div className="overflow-auto max-h-full">
              {relatedData.leaseContracts.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1C4E75] text-white font-bold text-[9px]">
                      <th className="px-2 py-1 border border-slate-200">Inquilino</th>
                      <th className="px-2 py-1 border border-slate-200">RUT</th>
                      <th className="px-2 py-1 border border-slate-200">Propiedad</th>
                      <th className="px-2 py-1 border border-slate-200 text-right">Renta Mensual</th>
                      <th className="px-2 py-1 border border-slate-200 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedData.leaseContracts.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50 border-b border-slate-100 odd:bg-slate-50/30 text-[9.5px]">
                        <td className="px-2 py-1 border border-slate-100 font-sans font-bold text-[#1C4E75]">{l.tenantName}</td>
                        <td className="px-2 py-1 border border-slate-100">{l.tenantTaxId}</td>
                        <td className="px-2 py-1 border border-slate-100">{l.propertyId}</td>
                        <td className="px-2 py-1 border border-slate-100 text-right font-bold text-slate-800">{formatCLP(l.monthlyAmount)} {l.currency}</td>
                        <td className="px-2 py-1 border border-slate-100 text-center font-bold text-emerald-800">{l.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-400 uppercase tracking-widest text-[9px] font-mono">[NO_MATCHING_RECORDS_IN_F1502]</div>
              )}
            </div>
          )}

          {/* TAB 7: F0402 (Contracts) */}
          {activeRelationsTab === 'F0402' && (
            <div className="overflow-auto max-h-full">
              {relatedData.contracts.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1C4E75] text-white font-bold text-[9px]">
                      <th className="px-2 py-1 border border-slate-200">Proveedor</th>
                      <th className="px-2 py-1 border border-slate-200">Edificio</th>
                      <th className="px-2 py-1 border border-slate-200">Piso</th>
                      <th className="px-2 py-1 border border-slate-200 text-right">Monto UF/CLP</th>
                      <th className="px-2 py-1 border border-slate-200 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedData.contracts.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 border-b border-slate-100 odd:bg-slate-50/30 text-[9.5px]">
                        <td className="px-2 py-1 border border-slate-100 font-sans font-bold text-[#1C4E75]">{c.supplierName}</td>
                        <td className="px-2 py-1 border border-slate-100">{c.building}</td>
                        <td className="px-2 py-1 border border-slate-100">{c.floor}</td>
                        <td className="px-2 py-1 border border-slate-100 text-right font-bold text-rose-800">{formatCLP(c.monthlyAmount)}</td>
                        <td className="px-2 py-1 border border-slate-100 text-center font-bold text-emerald-800">{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-400 uppercase tracking-widest text-[9px] font-mono">[NO_MATCHING_RECORDS_IN_F0402]</div>
              )}
            </div>
          )}

        </div>
        
      </div>
    );
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`flex flex-col h-full bg-[#EBF0F5] overflow-hidden font-sans select-none rounded-none relative ${
        isFullscreenGrid ? 'fixed inset-0 z-[140] w-screen h-screen p-3 md:p-6 shadow-2xl bg-slate-900' : 'border-l border-slate-300'
      }`}
    >
      
      {/* 
        ========================================================================
        ERP BRAND BAR (Row 1 - High Fidelity AssetFlow Enterprise Layout)
        ========================================================================
      */}
      <div className="bg-white border-b border-[#D2DFEC] shrink-0 px-4 py-1.5 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-1.5">
          {/* Authentic ERP brand logo styling */}
          <span className="text-[#002D62] font-black tracking-tighter text-[16px] font-sans pr-1">ASSETFLOW ENTERPRISE</span>
          <span className="h-4 w-[1px] bg-slate-300 mx-1.5 hidden sm:inline"></span>
          <span className="text-[#333333] font-sans text-xs md:text-[13px] tracking-tight font-medium">AssetFlow Enterprise</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-sans text-[#005B94]">
          <span className="hover:underline cursor-pointer flex items-center gap-0.5">Funciones <span className="text-[8px]">▼</span></span>
          <span className="text-slate-300">|</span>
          <span className="hover:underline cursor-pointer flex items-center gap-0.5">Personalización <span className="text-[8px]">▼</span></span>
          <span className="text-slate-300">|</span>
          <span className="hover:underline cursor-pointer flex items-center gap-0.5">Ayuda <span className="text-[8px]">▼</span></span>
          <span className="text-slate-300">|</span>
          <span className="hover:underline cursor-pointer">Worldwide Company <strong className="text-[#0B3C5D] font-mono">[JD910]</strong></span>
          <span className="text-slate-300">|</span>
          <span 
            onClick={() => setActiveModule('DASHBOARD')} 
            className="hover:underline cursor-pointer font-bold text-red-750 flex items-center gap-1 text-[10px]"
          >
            [ Desconexión ]
          </span>
        </div>
      </div>

      {/* 
        ========================================================================
        ERP NAVIGATION HEADER BAR (Row 2 - Classical Blue Bar)
        ========================================================================
      */}
      <div className="bg-[#005B94] text-white px-4 py-1 border-b border-[#004B7B] shrink-0 flex flex-col md:flex-row justify-between items-center gap-2 text-[11px] font-sans">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="hover:text-amber-300 cursor-pointer">Inicio</span>
          <span className="text-white/40">|</span>
          <span className="hover:text-amber-300 cursor-pointer flex items-center gap-0.5">Navegador <span className="text-[7px]">▼</span></span>
          <span className="text-white/40">|</span>
          <span className="hover:text-amber-300 cursor-pointer flex items-center gap-0.5">Abrir aplicaciones <span className="text-[7px]">▼</span></span>
          <span className="text-white/40">|</span>
          <button 
            type="button"
            onClick={() => setShowRecentReportsModal(true)}
            className="hover:text-amber-300 cursor-pointer flex items-center gap-1 font-semibold select-none text-left"
            title="Abrir Trabajar con Trabajos Enviados (WSJ - P986110B) • Informes Recientes"
          >
            <span className="bg-amber-500 text-slate-900 px-1 rounded-[2px] text-[8px] font-black">WSJ</span>
            <span>Informes recientes</span>
            <span className="text-[7px]">▼</span>
          </button>
          <span className="text-white/40">|</span>
          <span className="hover:text-amber-300 cursor-pointer flex items-center gap-0.5">Favoritos <span className="text-[7px]">▼</span></span>
        </div>
        <div className="flex items-center gap-2">
          {isFullscreenGrid && (
            <button
              onClick={() => setIsFullscreenGrid(false)}
              className="bg-red-700 hover:bg-red-800 text-white font-black font-mono px-2 py-0.5 text-[9.5px] border border-red-900 rounded-sm mr-2 uppercase"
              title="Restaurar vista normal"
            >
              Restaurar Vista Normal [✕]
            </button>
          )}
          <span className="text-white/80 text-[10px] uppercase font-mono tracking-tight">Acceso rápido</span>
          <div className="flex items-center">
            <input 
              type="text" 
              readOnly 
              value="p042022" 
              className="w-20 bg-white text-slate-800 border-none font-mono text-[10px] px-1.5 py-0.2 focus:outline-none uppercase text-center"
            />
            <button className="bg-slate-200 text-[#005B94] px-1 font-bold text-[10px] border-l border-slate-400">Ir</button>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        ERP APPLICATION TITLE CONTAINER (Row 3 - Light Blue-Gray Banner)
        ========================================================================
      */}
      <div className="bg-gradient-to-r from-[#ECF3FA] to-[#E2EDF8] px-4 py-2 border-b border-[#A2BCCF] shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="bg-[#FFCC00] text-[#0B3C5D] px-1.5 py-0.2 font-mono font-black text-[9px] border border-[#B89600] rounded-xs shadow-3xs uppercase tracking-tight shrink-0">
            P01012B
          </div>
          <h2 className="text-xs md:text-[13px] font-bold text-[#003B66] uppercase tracking-tight font-sans">
            Consulta de LM de proveedores One View
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[10.5px] font-sans">
          <span className="text-slate-600">Consulta:</span>
          <select className="bg-white border border-[#9DB2C3] text-[10.5px] py-0.5 px-2 font-medium text-slate-800">
            <option>Todos los registros</option>
            <option>Filtrado por Relación Directa</option>
            <option>Solo con Alertas Compliance</option>
          </select>
          <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 font-mono font-bold rounded-xs tracking-wider uppercase ml-1">
            ONLINE
          </span>
        </div>
      </div>

      {/* 
        ========================================================================
        ERP ACTIONS MENU & TOOLBAR (Alta Standard Buttons)
        ========================================================================
      */}
      <div className="bg-[#DCE7F2] px-3 py-1.5 border-b border-[#A2BCCF] shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3 font-mono text-[11px] text-slate-800">
        
        {/* Left Actions: ERP Form Menu & Row Menu Dropdowns and Grid Controls */}
        <div className="flex flex-wrap items-center gap-2.5 relative">
          
          {/* Form Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setIsFormMenuOpen(!isFormMenuOpen);
                setIsRowMenuOpen(false);
              }}
              className="bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#A2BCCF] px-3 py-1 flex items-center gap-1 cursor-pointer font-bold rounded-none text-slate-800 select-none text-[10.5px]"
            >
              <span>Herramientas Formulario (Form)</span>
              <ChevronDown size={11} className="text-slate-600" />
            </button>
            {isFormMenuOpen && (
              <div className="absolute left-0 mt-1 w-64 bg-white border border-[#6B8095] shadow-lg z-50 rounded-none text-left">
                <div className="bg-[#0B3C5D] text-white px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider font-mono">
                  Menú de Navegación Cruzada (P01012B)
                </div>
                <div className="py-1 text-[11px]">
                  <button
                    onClick={() => { setActiveModule('FINANZAS'); setIsFormMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] text-[10px] block border-b border-slate-100 uppercase font-mono"
                  >
                    1. Ir a Libro Auxiliar Diario [P0911]
                  </button>
                  <button
                    onClick={() => { setActiveModule('PROVEEDORES'); setIsFormMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] text-[10px] block border-b border-slate-100 uppercase font-mono"
                  >
                    2. Ir a Maestro de Proveedores [P04012]
                  </button>
                  <button
                    onClick={() => { setActiveModule('PROPIEDADES'); setIsFormMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] text-[10px] block border-b border-slate-100 uppercase font-mono"
                  >
                    3. Ir a Catastro de Propiedades [P1501]
                  </button>
                  <button
                    onClick={() => { setActiveModule('ORDENES'); setIsFormMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] text-[10px] block border-b border-slate-100 uppercase font-mono"
                  >
                    4. Ir a Órdenes de Trabajo [P48201]
                  </button>
                  <button
                    onClick={() => { setActiveModule('CONTRATOS_ARRIENDO'); setIsFormMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] text-[10px] block uppercase font-mono"
                  >
                    5. Ir a Contratos de Arriendo [P15012]
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Row Dropdown Menu (requires selectedRowId) */}
          <div className="relative">
            <button
              onClick={() => {
                if (selectedRowId) {
                  setIsRowMenuOpen(!isRowMenuOpen);
                  setIsFormMenuOpen(false);
                }
              }}
              disabled={!selectedRowId}
              className={`border px-3 py-1 flex items-center gap-1 cursor-pointer font-bold rounded-none text-[10.5px] ${
                selectedRowId 
                  ? 'bg-[#F1F5F9] hover:bg-[#E2E8F0] border-[#A2BCCF] text-slate-800' 
                  : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Herramientas Fila (Row)</span>
              <ChevronDown size={11} className={selectedRowId ? 'text-slate-600' : 'text-slate-400'} />
            </button>
            {isRowMenuOpen && selectedRowId && (() => {
              const rec = getSelectedRecord();
              return (
                <div className="absolute left-0 mt-1 w-64 bg-white border border-[#6B8095] shadow-lg z-50 rounded-none text-left">
                  <div className="bg-[#6B8095] text-white px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider font-mono">
                    Acción en Fila Selecta [ID: {selectedRowId.slice(0,8)}]
                  </div>
                  <div className="py-1 text-[11px]">
                    <button
                      onClick={() => {
                        if (rec) {
                          setInspectTarget({ record: rec, entityType: 
                            activeTab === 'F0911_TRANS' ? 'TRANSACTION' : 
                            activeTab === 'F0401_PROV' ? 'SUPPLIER' : 
                            activeTab === 'F1501_PROP' ? 'PROPERTY' : 
                            activeTab === 'F4801_OT' ? 'WORK_ORDER' : 
                            activeTab === 'F1502_LEASES' ? 'LEASE' : 'CONTRACT'
                          });
                        }
                        setIsRowMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] text-[10px] block border-b border-slate-100 uppercase font-bold font-mono"
                    >
                      ✓ Inspeccionar Firma F980011D
                    </button>
                    <button
                      onClick={() => {
                        if (rec) {
                          // Filter connected records based on active entity
                          if (activeTab === 'F0401_PROV') {
                            handleInterconnectFilter('F0911_TRANS', 'supplierName', (rec as any).name);
                          } else if (activeTab === 'F1501_PROP') {
                            handleInterconnectFilter('F0911_TRANS', 'propertyLabel', (rec as any).code);
                          } else if (activeTab === 'F4801_OT') {
                            handleInterconnectFilter('F0401_PROV', 'taxId', (rec as any).supplierTaxId);
                          } else if (activeTab === 'F1502_LEASES') {
                            handleInterconnectFilter('F1501_PROP', 'code', (rec as any).propertyId);
                          } else if (activeTab === 'F0911_TRANS') {
                            if ((rec as any).supplierTaxId) {
                              handleInterconnectFilter('F0401_PROV', 'taxId', (rec as any).supplierTaxId);
                            } else if ((rec as any).propertyId) {
                              handleInterconnectFilter('F1501_PROP', 'code', (rec as any).propertyId);
                            } else if ((rec as any).supplierName) {
                              handleInterconnectFilter('F0401_PROV', 'supplierName', (rec as any).supplierName);
                            } else {
                              alert("No se encontraron atributos (Proveedor o Propiedad) para interconectar.");
                            }
                          } else if (activeTab === 'F0402_CONTS') {
                            if ((rec as any).supplierId) {
                              handleInterconnectFilter('F0401_PROV', 'taxId', (rec as any).supplierId);
                            } else if ((rec as any).building) {
                              handleInterconnectFilter('F1501_PROP', 'code', (rec as any).building);
                            } else {
                              alert("No se encontraron atributos (Proveedor o Edificio) para interconectar.");
                            }
                          } else {
                            alert("Búsqueda interconectada transversal no aplica para este tipo de registro.");
                          }
                        }
                        setIsRowMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] text-[10px] block border-b border-slate-100 uppercase font-mono"
                    >
                      🔗 Filtrar Relacionados
                    </button>
                    <button
                      onClick={() => {
                        const entityType = 
                          activeTab === 'F0911_TRANS' ? 'TRANSACTION' : 
                          activeTab === 'F0401_PROV' ? 'SUPPLIER' : 
                          activeTab === 'F1501_PROP' ? 'PROPERTY' : 
                          activeTab === 'F4801_OT' ? 'WORK_ORDER' : 
                          activeTab === 'F1502_LEASES' ? 'LEASE' : 'CONTRACT';
                        handlePrintSingleRowPDF(rec, entityType);
                        setIsRowMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] text-[10px] block border-b border-slate-100 uppercase font-mono"
                    >
                      🖨️ Generar Comprobante PDF
                    </button>
                    <button
                      onClick={() => {
                        if (rec) {
                          // Jump to respective functional module
                          if (activeTab === 'F0911_TRANS' || activeTab === 'F0402_CONTS') {
                            setActiveModule('FINANZAS');
                          } else if (activeTab === 'F0401_PROV') {
                            setActiveModule('PROVEEDORES');
                          } else if (activeTab === 'F1501_PROP') {
                            setActiveModule('PROPIEDADES');
                          } else if (activeTab === 'F4801_OT') {
                            setActiveModule('ORDENES');
                          } else if (activeTab === 'F1502_LEASES') {
                            setActiveModule('CONTRATOS_ARRIENDO');
                          }
                        }
                        setIsRowMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] text-[10px] block uppercase font-bold text-indigo-700 font-mono"
                    >
                      ➡ Ir a Módulo Funcional
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

        </div>

        {/* Central Prominent Actions: ERP Grid Control Buttons moved up for maximum prominence */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#E4ECF5] px-2 py-1 border border-[#A2BCCF] rounded-sm shrink-0">
          <span className="text-[9px] font-black text-[#0B3C5D] uppercase tracking-wider mr-1 select-none">CUADRÍCULA:</span>
          
          <button
            onClick={() => setQbeVisible(!qbeVisible)}
            className={`px-2 py-1 border flex items-center gap-1 cursor-pointer rounded-none text-[9px] font-mono ${
              qbeVisible 
                ? 'bg-[#0B3C5D] text-white border-slate-700 font-extrabold' 
                : 'bg-white text-[#0B3C5D] border-[#A2BCCF] hover:bg-slate-50'
            }`}
            title="Alternar Fila de Búsqueda QBE"
          >
            <Filter size={10} />
            <span>{qbeVisible ? 'Ocultar QBE' : 'Ver QBE'}</span>
          </button>

          <button
            onClick={resetAllFilters}
            className="bg-white hover:bg-slate-50 border border-[#A2BCCF] px-2 py-1 text-[#333] cursor-pointer rounded-none text-[9px] font-mono flex items-center gap-1 font-bold"
            title="Limpiar todos los filtros"
          >
            <RefreshCw size={10} className="text-amber-600 animate-none" />
            <span>Limpiar</span>
          </button>

          {onAddSupplier && (
            <button
              onClick={() => setIsSupplierFormOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-800 px-2.5 py-1 cursor-pointer rounded-none text-[9px] font-mono flex items-center gap-1 font-black shadow-xs"
              title="Crear Nuevo Proveedor en Libro de Direcciones (F0101) y Maestro de Proveedores (F0401)"
            >
              <Plus size={10} />
              <span>+ Nuevo Proveedor (P01012)</span>
            </button>
          )}

          <button
            onClick={handleExportXLSX}
            className="bg-emerald-750 hover:bg-emerald-800 text-white border border-[#388E3C] px-2 py-1 cursor-pointer rounded-none text-[9px] font-mono flex items-center gap-1 font-bold shadow-xs"
            title="Exportar registros a planilla Excel"
          >
            <FileSpreadsheet size={10} />
            <span>Excel</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="bg-[#3A3F44] hover:bg-[#4C5258] text-white border border-black px-2 py-1 cursor-pointer rounded-none text-[9px] font-mono flex items-center gap-1 font-bold"
            title="Exportar informe en formato PDF"
          >
            <Download size={10} />
            <span>PDF</span>
          </button>

          <button
            onClick={() => {
              downloadChileanTaxAuditReport({
                currentUser: currentUser || 'CRISTIAN MUÑOZ R.',
                systemDate: new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
              });
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white border border-amber-800 px-2.5 py-1 cursor-pointer rounded-none text-[9px] font-mono flex items-center gap-1 font-black shadow-xs"
            title="Descargar Informe del Equipo Experto de Contadores Auditores (Normativa Tributaria Chilena / SII)"
          >
            <ShieldAlert size={10} />
            <span>Dictamen Auditoría</span>
          </button>

          {isFullscreenGrid ? (
            <button
              onClick={() => setIsFullscreenGrid(false)}
              className="bg-red-650 hover:bg-red-700 text-white border border-red-800 px-2 py-1 cursor-pointer rounded-none text-[9px] font-mono flex items-center gap-1 font-black shadow-xs uppercase tracking-tight"
              title="Restaurar vista normal"
            >
              <Minimize2 size={10} />
              <span>Restaurar Vista</span>
            </button>
          ) : (
            <button
              onClick={() => setIsFullscreenGrid(true)}
              className="bg-[#0B3C5D] hover:bg-[#144D75] text-white border border-slate-700 px-2.5 py-1 cursor-pointer rounded-none text-[9px] font-mono flex items-center gap-1 font-black shadow-xs uppercase tracking-tight"
              title="Desplegar cuadrícula en ventana completa (Estilo ERP Maximize Grid)"
            >
              <Maximize2 size={10} />
              <span>Maximizar Cuadrícula</span>
            </button>
          )}

          {/* Toggle Detached Interconnections */}
          {selectedRowId && (
            <button
              onClick={() => setIsRelationsDetached(!isRelationsDetached)}
              className={`border px-2 py-1 flex items-center gap-1 cursor-pointer rounded-none text-[9px] font-mono font-black tracking-wide shadow-xs transition-all ${
                isRelationsDetached 
                  ? 'bg-indigo-600 text-white border-indigo-800' 
                  : 'bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-50/50'
              }`}
              title="Alternar entre visor empotrado en la parte inferior o ventana flotante"
            >
              <ExternalLink size={10} />
              <span>{isRelationsDetached ? 'Empotrar Panel' : 'Desacoplar Ventana'}</span>
            </button>
          )}

          <button
            onClick={() => {
              alert("Configuración de Grid ERP:\n- Modo de Filtro QBE Inteligente: Activado\n- Líneas de Cuadrícula: Sólidas #D2DFEC\n- Selección de Fila por Click: Activada\n- Menús Dinámicos: Listos.");
            }}
            className="bg-white hover:bg-slate-50 border border-[#A2BCCF] p-1 cursor-pointer rounded-none text-slate-700"
            title="Propiedades y Personalización de Cuadrícula"
          >
            <Settings size={10} />
          </button>
        </div>

        {/* Right Actions: Classical ERP standard buttons */}
        <div className="flex items-center gap-1 border-l border-slate-300 pl-2">
          {/* Find (Buscar) Button */}
          <button
            onClick={() => {
              // Trigger a query or just flash/reset selection
              alert("Consulta ERP ejecutada con éxito. Se aplicaron filtros QBE.");
            }}
            className="w-8 h-8 bg-[#F0F4F8] hover:bg-[#D9E2EC] border border-[#9DB2C3] flex flex-col items-center justify-center cursor-pointer text-[#0B3C5D] transition-all"
            title="Ejecutar Consulta (Find) [Ctrl+Enter]"
          >
            <Search size={14} className="font-extrabold" />
            <span className="text-[7px] font-black uppercase -mt-0.5">Buscar</span>
          </button>

          {/* Select / Accept (Aceptar) Button */}
          <button
            onClick={() => {
              if (selectedRowId) {
                const rec = getSelectedRecord();
                if (rec) {
                  setInspectTarget({ record: rec, entityType: 
                    activeTab === 'F0911_TRANS' ? 'TRANSACTION' : 
                    activeTab === 'F0401_PROV' ? 'SUPPLIER' : 
                    activeTab === 'F1501_PROP' ? 'PROPERTY' : 
                    activeTab === 'F4801_OT' ? 'WORK_ORDER' : 
                    activeTab === 'F1502_LEASES' ? 'LEASE' : 'CONTRACT'
                  });
                }
              } else {
                alert("Por favor seleccione una fila haciendo click para ejecutar.");
              }
            }}
            className="w-8 h-8 bg-[#E2F0D9] hover:bg-[#C5E1A5] border border-[#388E3C] flex flex-col items-center justify-center cursor-pointer text-[#1B5E20] transition-all"
            title="Seleccionar y Examinar Registro (Select)"
          >
            <Check size={14} className="font-extrabold" />
            <span className="text-[7px] font-black uppercase -mt-0.5">Select</span>
          </button>
          
          {/* Cancel / Reset (Cancelar) Button */}
          <button
            onClick={resetAllFilters}
            className="w-8 h-8 bg-[#FCE4D6] hover:bg-[#F8BBD0] border border-[#C62828] flex flex-col items-center justify-center cursor-pointer text-[#C62828] transition-all"
            title="Limpiar Filtros (Clear)"
          >
            <RefreshCw size={12} />
            <span className="text-[7px] font-black uppercase -mt-0.5">Clear</span>
          </button>

          {/* Close (Cerrar) Button */}
          <button
            onClick={() => {
              setActiveModule('GENERAL');
            }}
            className="w-8 h-8 bg-[#ECEFF1] hover:bg-[#CFD8DC] border border-[#546E7A] flex flex-col items-center justify-center cursor-pointer text-[#37474F] transition-all"
            title="Cerrar Módulo (Close) [Esc]"
          >
            <X size={14} />
            <span className="text-[7px] font-black uppercase -mt-0.5">Cerrar</span>
          </button>
        </div>

      </div>

      {/* 
        ========================================================================
        ERP SEARCH CONTROLS (Alta styled panel background)
        ========================================================================
      */}
      <div className="bg-[#E4ECF5] px-3 py-1.5 border-b border-[#A2BCCF] shrink-0 flex items-center gap-3">
        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono shrink-0 flex items-center gap-1">
          <Search size={11} className="text-[#0B3C5D]" />
          <span>Búsqueda Rápida:</span>
        </label>
        <div className="relative flex-1">
          <input 
            type="text"
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setSelectedRowId(null);
            }}
            placeholder="Escriba filtro global (Nombre, RUT, Código, etc.) para buscar transversalmente..."
            className="w-full bg-white border border-[#9DB2C3] pl-3 pr-10 py-1 text-xs text-slate-900 focus:outline-none focus:ring-0 focus:border-[#0B3C5D] font-mono rounded-none"
          />
          {globalSearch && (
            <button 
              onClick={() => { setGlobalSearch(''); setSelectedRowId(null); }}
              className="absolute right-2.5 top-1 text-slate-500 hover:text-red-600 text-[10px] font-bold font-mono"
            >
              [X]
            </button>
          )}
        </div>
        <div className="text-[10px] font-mono text-[#0B3C5D] font-bold hidden md:block">
          MODO: <span className="bg-[#0B3C5D] text-white px-1.5 py-0.5 font-bold">INQUIRY</span>
        </div>
      </div>

      {/* 
        ========================================================================
        ERP CLASSICAL FORM HEADER (Parámetros y Filtros de Cabecera Globales)
        ========================================================================
      */}
      <div className="bg-[#EBF0F5] border-b border-[#A2BCCF] px-4 py-2 shrink-0">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch text-[10.5px] font-sans text-slate-800">
          
          {/* Left Column Parameters */}
          <div className="flex-1 min-w-[240px] flex flex-col gap-1.5 justify-center">
            <div className="flex items-center gap-2">
              <span className="w-28 text-right font-medium text-slate-700">Número proveedor:</span>
              <input 
                type="text" 
                placeholder="*" 
                disabled
                className="w-24 bg-[#FFFFE1] border border-[#9DB2C3] px-2 py-0.5 text-[10.5px] text-slate-800" 
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-28 text-right font-bold text-slate-750">Compañía:</span>
              <div className="flex items-center">
                <select
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value);
                    setSelectedRowId(null);
                    setCurrentPage(0);
                  }}
                  className="bg-[#FFFFE1] border border-[#9DB2C3] px-2 py-0.5 text-[10.5px] font-bold text-slate-800 focus:outline-none focus:border-[#005B94] cursor-pointer"
                >
                  <option value="ALL">00045 - ASSETFLOW CONSOLIDADO</option>
                  <option value="00001">00001 - ASSETFLOW SEGUROS GRALES</option>
                  <option value="00002">00002 - ASSETFLOW INMOBILIARIA</option>
                </select>
                <button className="bg-slate-200 border-y border-r border-[#9DB2C3] px-1.5 py-0.5 text-[9px] text-[#005B94] font-bold hover:bg-slate-300">🔍</button>
              </div>
            </div>
          </div>

          {/* Middle Column Parameters */}
          <div className="flex-1 min-w-[260px] flex flex-col gap-1.5 justify-center border-l border-slate-300/40 pl-4">
            <div className="flex items-center gap-2">
              <span className="w-32 text-right font-medium text-slate-700">Moneda cálculo:</span>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="bg-[#FFFFE1] border border-[#9DB2C3] px-2 py-0.5 text-[10.5px] font-bold text-slate-800 focus:outline-none focus:border-[#005B94] cursor-pointer"
              >
                <option value="CLP">CLP - Pesos Chilenos ($)</option>
                <option value="UF">UF - Unidades de Fomento (UF)</option>
                <option value="USD">USD - Dólar Americano (US$)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 text-right font-medium text-slate-600">Fecha tipo cambio:</span>
              <input 
                type="text" 
                readOnly 
                value="18/07/2026" 
                className="w-24 bg-[#EBF0F5] border border-slate-300 px-2 py-0.5 text-[10px] text-slate-500 font-mono" 
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 text-right font-medium text-slate-600">Fecha referencia:</span>
              <input 
                type="text" 
                readOnly 
                value="18/07/2026" 
                className="w-24 bg-[#EBF0F5] border border-slate-300 px-2 py-0.5 text-[10px] text-slate-500 font-mono" 
              />
            </div>
          </div>

          {/* Right Column Parameters - Estado pago style, but controlling our compliance risk filter! */}
          <div className="min-w-[280px] bg-[#E5EFF8] border border-[#A9C4DF] p-2.5 rounded-sm flex flex-col justify-between">
            <span className="font-bold text-[#003B66] text-[10.5px] uppercase tracking-wide border-b border-[#A9C4DF] pb-1 mb-1.5 block">
              Estado de Riesgo Compliance
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-center">
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input 
                  type="radio" 
                  name="complianceRiskRadio" 
                  checked={selectedGlobalRisk === 'ALL'} 
                  onChange={() => { setSelectedGlobalRisk('ALL'); setSelectedRowId(null); setCurrentPage(0); }}
                  className="cursor-pointer" 
                />
                <span className={selectedGlobalRisk === 'ALL' ? 'font-black text-[#005B94]' : 'text-slate-700'}>Todos</span>
              </label>
              
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input 
                  type="radio" 
                  name="complianceRiskRadio" 
                  checked={selectedGlobalRisk === 'RIESGO BAJO'} 
                  onChange={() => { setSelectedGlobalRisk('RIESGO BAJO'); setSelectedRowId(null); setCurrentPage(0); }}
                  className="cursor-pointer" 
                />
                <span className={selectedGlobalRisk === 'RIESGO BAJO' ? 'font-black text-emerald-800' : 'text-slate-750'}>🟢 Bajo</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input 
                  type="radio" 
                  name="complianceRiskRadio" 
                  checked={selectedGlobalRisk === 'RIESGO MEDIO'} 
                  onChange={() => { setSelectedGlobalRisk('RIESGO MEDIO'); setSelectedRowId(null); setCurrentPage(0); }}
                  className="cursor-pointer" 
                />
                <span className={selectedGlobalRisk === 'RIESGO MEDIO' ? 'font-black text-amber-800' : 'text-slate-750'}>🟡 Medio</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input 
                  type="radio" 
                  name="complianceRiskRadio" 
                  checked={selectedGlobalRisk === 'RIESGO ALTO'} 
                  onChange={() => { setSelectedGlobalRisk('RIESGO ALTO'); setSelectedRowId(null); setCurrentPage(0); }}
                  className="cursor-pointer" 
                />
                <span className={selectedGlobalRisk === 'RIESGO ALTO' ? 'font-black text-rose-800' : 'text-slate-750'}>🔴 Alto</span>
              </label>
            </div>
          </div>

        </div>
      </div>

      {/* 
        ========================================================================
        ERP HORIZONTAL TAB FOLDERS (Authentic 9.1 Overlapping Tabs)
        ========================================================================
      */}
      <div className="bg-[#ECEFF4] pt-2 px-3 border-b border-[#6B8095] shrink-0 flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end -mb-[1px] gap-[2px]">
          
          <button 
            onClick={() => handleTabChange('F0911_TRANS')}
            className={`border px-3.5 py-1.5 text-[10.5px] uppercase font-bold tracking-tight rounded-t-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'F0911_TRANS' 
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-15 font-extrabold pb-2 -mt-[2px]' 
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <Database size={11} className="text-[#1C4E75]" />
            <span>F0911 (Diario Transaccional)</span>
            <span className="bg-[#1C4E75] text-white text-[9px] px-1 font-mono font-black">{transactions.length}</span>
          </button>
          
          <button 
            onClick={() => handleTabChange('F0401_PROV')}
            className={`border px-3.5 py-1.5 text-[10.5px] uppercase font-bold tracking-tight rounded-t-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'F0401_PROV' 
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-15 font-extrabold pb-2 -mt-[2px]' 
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <User size={11} className="text-[#1C4E75]" />
            <span>F0401 (Maestro Proveedores)</span>
            <span className="bg-[#1C4E75] text-white text-[9px] px-1 font-mono font-black">{suppliers.length}</span>
          </button>

          <button 
            onClick={() => handleTabChange('F1501_PROP')}
            className={`border px-3.5 py-1.5 text-[10.5px] uppercase font-bold tracking-tight rounded-t-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'F1501_PROP' 
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-15 font-extrabold pb-2 -mt-[2px]' 
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <Building2 size={11} className="text-[#1C4E75]" />
            <span>F1501 (Catastro Propiedades)</span>
            <span className="bg-[#1C4E75] text-white text-[9px] px-1 font-mono font-black">{properties.length}</span>
          </button>

          <button 
            onClick={() => handleTabChange('F4801_OT')}
            className={`border px-3.5 py-1.5 text-[10.5px] uppercase font-bold tracking-tight rounded-t-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'F4801_OT' 
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-15 font-extrabold pb-2 -mt-[2px]' 
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <Wrench size={11} className="text-[#1C4E75]" />
            <span>F4801 (Órdenes de Trabajo)</span>
            <span className="bg-[#1C4E75] text-white text-[9px] px-1 font-mono font-black">{workOrders.length}</span>
          </button>

          <button 
            onClick={() => handleTabChange('F1502_LEASES')}
            className={`border px-3.5 py-1.5 text-[10.5px] uppercase font-bold tracking-tight rounded-t-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'F1502_LEASES' 
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-15 font-extrabold pb-2 -mt-[2px]' 
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <Key size={11} className="text-[#1C4E75]" />
            <span>F1502 (Maestro Inquilinos)</span>
            <span className="bg-[#1C4E75] text-white text-[9px] px-1 font-mono font-black">{leaseContracts.length}</span>
          </button>

          <button 
            onClick={() => handleTabChange('F0402_CONTS')}
            className={`border px-3.5 py-1.5 text-[10.5px] uppercase font-bold tracking-tight rounded-t-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'F0402_CONTS' 
                ? 'bg-white text-[#1C4E75] border-[#6B8095] border-b-white z-15 font-extrabold pb-2 -mt-[2px]' 
                : 'bg-[#D6E2EE] hover:bg-[#CAD9E6] text-slate-700 border-[#9DB2C3] border-b-[#6B8095]'
            }`}
          >
            <FileCheck size={11} className="text-[#1C4E75]" />
            <span>F0402 (Contratos Servicios)</span>
            <span className="bg-[#1C4E75] text-white text-[9px] px-1 font-mono font-black">{contracts.length}</span>
          </button>

        </div>

        {onAddSupplier && (
          <div className="pb-1.5 flex items-center gap-2">
            <button
              onClick={() => setIsSupplierFormOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs border border-emerald-700 transition-all cursor-pointer"
              title="Crear Nuevo Proveedor en F0101 Libro de Direcciones y F0401 Maestro de Proveedores"
            >
              <Plus size={12} /> + Agregar Nuevo Proveedor (F0101 / F0401)
            </button>
          </div>
        )}

      </div>

      {/* 
        ========================================================================
        ERP THE GRID BOX WITH SPLIT-SCREEN OR DOCKED OPTIONS
        ========================================================================
      */}
      <div className="flex-1 overflow-hidden bg-white p-2.5 flex flex-col min-h-0">
        
        {/* Upper Master Grid Section */}
        <div className={`${selectedRowId && !isRelationsDetached ? 'h-[52%] min-h-[200px] mb-2.5' : 'h-full'} border border-[#6B8095] shadow-xs flex flex-col overflow-auto rounded-none relative`}>
          
          {/* TAB 1: F0911 GENERAL JOURNAL & PAYABLES */}
          {activeTab === 'F0911_TRANS' && (
            <table className="w-full text-left border-collapse min-w-[1200px] border border-[#A9C4DF]">
              
              {/* Header Titles */}
              <thead className="sticky top-0 bg-[#D2DFEC] text-[#002C5B] z-20 text-[10px] font-sans font-bold">
                <tr>
                  <th className="w-[30px] bg-[#CFD8DC] border-r border-b border-[#A9C4DF] text-[#002C5B] text-center font-bold"></th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[9%] text-[#002C5B] font-bold text-center">Folio/Docto</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[8%] text-[#002C5B] font-bold text-center">Tipo Doc</th>
                  <th className="px-2 py-1.5 border-r border-b border-[#A9C4DF] w-[20%] text-[#002C5B] font-bold text-center">Descripción (Glosa)</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[18%] text-[#002C5B] font-bold text-center">Proveedor (F0401) Info</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[14%] text-[#002C5B] font-bold text-center">Propiedad (F1501) Info</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[9%] text-[#002C5B] font-bold text-right pr-4">Monto ($)</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[10%] text-[#002C5B] font-bold text-center">Cuenta</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[7%] text-[#002C5B] font-bold text-center">Estado</th>
                  <th className="px-3 py-1.5 border-b border-[#A9C4DF] w-[5%] text-[#002C5B] font-bold text-center">Auditar</th>
                </tr>
                
                {/* ERP QBE Columnar Search Inputs */}
                <tr className="bg-[#ECF3F9] text-[9.5px]">
                  <th className="w-[30px] bg-[#CFD8DC] border-r border-b border-[#A9C4DF] text-[8px] font-bold text-slate-600 text-center">QBE</th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0911Filters.folio} 
                      onChange={(e) => setF0911Filters({ ...f0911Filters, folio: e.target.value })}
                      placeholder="Filtrar..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-mono focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0911Filters.documentType} 
                      onChange={(e) => setF0911Filters({ ...f0911Filters, documentType: e.target.value })}
                      placeholder="Filtrar..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-mono focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0911Filters.description} 
                      onChange={(e) => setF0911Filters({ ...f0911Filters, description: e.target.value })}
                      placeholder="Filtrar..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0911Filters.supplierName} 
                      onChange={(e) => setF0911Filters({ ...f0911Filters, supplierName: e.target.value })}
                      placeholder="Buscar por Prov..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0911Filters.propertyLabel} 
                      onChange={(e) => setF0911Filters({ ...f0911Filters, propertyLabel: e.target.value })}
                      placeholder="Heredar Unidad..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0911Filters.amount} 
                      onChange={(e) => setF0911Filters({ ...f0911Filters, amount: e.target.value })}
                      placeholder="Monto..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-mono focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0911Filters.accountCode} 
                      onChange={(e) => setF0911Filters({ ...f0911Filters, accountCode: e.target.value })}
                      placeholder="Cuenta..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-mono focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0911Filters.status} 
                      onChange={(e) => setF0911Filters({ ...f0911Filters, status: e.target.value })}
                      placeholder="Estado..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-mono uppercase focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-b border-[#A9C4DF] text-center text-[8px] font-mono font-bold text-slate-500 bg-[#ECF3F9]">
                    F980011D
                  </th>
                </tr>
              </thead>

              {/* Data Rows */}
              <tbody className="text-[10.5px] font-mono">
                {paginatedF0911.map((t, idx) => (
                  <tr 
                    key={t.id} 
                    onClick={() => setSelectedRowId(selectedRowId === t.id ? null : t.id)}
                    onDoubleClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                    onContextMenu={(e) => handleRowContextMenu(e, t, 'TRANSACTION', 'P0911', 'Libro Diario General F0911', t.documentNumber || t.id)}
                    title="Clic para seleccionar fila. Doble clic para Detalle F980011D. Clic DERECHO para Menú Fila ERP"
                    className={`transition-all duration-150 cursor-context-menu text-[10.5px] border-b border-[#A9C4DF] ${
                      selectedRowId === t.id 
                        ? 'bg-[#FFF9C4] font-bold text-[#002C5B]' 
                        : 'bg-white hover:bg-[#FFFCDD] odd:bg-[#F6FAFE] text-slate-800'
                    }`}
                  >
                    <td className="w-[30px] bg-[#E8EEF5] border-r border-[#A9C4DF] text-center select-none py-1 text-slate-700 font-bold">
                      {selectedRowId === t.id ? (
                        <span className="text-[#002C5B] font-black text-[12px]">▶</span>
                      ) : (
                        <span className="text-slate-400 text-[9px] font-normal">{idx + 1}</span>
                      )}
                    </td>
                    <td className="px-3 py-1 border-r border-[#A9C4DF] font-bold text-[#002C5B] select-all truncate">
                      {t.documentNumber || 'N/A'}
                    </td>
                    <td className="px-3 py-1 border-r border-[#A9C4DF] truncate text-[9px] font-bold">
                      <span className="bg-slate-200/50 p-1 rounded font-black text-slate-800">{t.documentType || 'DEPÓSITO'}</span>
                    </td>
                    <td className="px-2 py-1 border-r border-[#A9C4DF] font-sans truncate text-[#445566]" title={t.description}>
                      {t.description || 'N/A'}
                    </td>
                    
                    {/* Interconnected Supplier Column */}
                    <td className="px-3 py-1 border-r border-[#A9C4DF]">
                      {t.supplierName ? (
                        <div className="flex items-center justify-between gap-1 group/link">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleInterconnectFilter('F0401_PROV', 'taxId', t.supplierTaxId || '');
                            }}
                            className="text-[#005B94] hover:underline font-bold text-left truncate max-w-[130px] font-sans block"
                            title="Ver en Maestro Proveedores [F0401]"
                          >
                            {t.supplierName}
                          </button>
                          <div className="flex gap-1 shrink-0 opacity-20 group-hover/link:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveModule('PROVEEDORES'); }} 
                              className="text-indigo-600 hover:text-indigo-900" 
                              title="Saltar a Directorio de Proveedores"
                            >
                              <ExternalLink size={10} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A (Sujeto Interno)</span>
                      )}
                    </td>

                    {/* Interconnected Property Column */}
                    <td className="px-3 py-1 border-r border-[#A9C4DF]">
                      {t.propertyId ? (
                        <div className="flex items-center justify-between gap-1 group/link">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleInterconnectFilter('F1501_PROP', 'code', t.propertyId || '');
                            }}
                            className="text-amber-800 hover:underline font-bold text-left truncate max-w-[100px] font-sans"
                            title="Filtrar en F1501 Unidades"
                          >
                            {t.propertyId}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveModule('PROPIEDADES'); }} 
                            className="opacity-20 group-hover/link:opacity-100 transition-opacity text-indigo-600 hover:text-indigo-900"
                            title="Saltar a Maestro de Propiedades"
                          >
                            <ExternalLink size={10} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">MULTICENTRO</span>
                      )}
                    </td>

                    <td className="px-3 py-1 border-r border-[#A9C4DF] text-right font-bold text-[#002C5B]">
                      {formatCLP(t.amount)}
                    </td>
                    <td className="px-3 py-1 border-r border-[#A9C4DF] text-slate-500 font-bold">
                      {t.accountCode || 'N/A'}
                    </td>
                    <td className="px-3 py-1 border-r border-[#A9C4DF] text-center">
                      <span className={`inline-block px-1.5 py-0.2 rounded-xs text-[8.5px] font-black tracking-widest ${
                        t.status === 'COMPLETADA' || t.status === 'APROBADO'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : t.status === 'PENDIENTE'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {t.status || 'INGRESADO'}
                      </span>
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button 
                        onClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                        className="text-slate-400 hover:text-[#0B3C5D] transition-colors"
                        title="Ver Atributos del Registro F980011D"
                      >
                        <Info size={12} className="mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 2: F0401 SUPPLIER REGISTRY */}
          {activeTab === 'F0401_PROV' && (
            <table className="w-full text-left border-collapse min-w-[1200px] border border-[#A9C4DF]">
              <thead className="sticky top-0 bg-[#D2DFEC] text-[#002C5B] z-20 text-[10px] font-sans font-bold">
                <tr>
                  <th className="w-[30px] bg-[#CFD8DC] border-r border-b border-[#A9C4DF] text-[#002C5B] text-center font-bold"></th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[8%] text-[#002C5B] font-bold text-center">Folio ERP</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[11%] text-[#002C5B] font-bold text-center">RUT / Identificador</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[22%] text-[#002C5B] font-bold text-center">Razón Social o Nombre</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[14%] text-[#002C5B] font-bold text-center">Categoría Principal</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[14%] text-[#002C5B] font-bold text-center">Cuenta de Repósito</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[11%] text-[#002C5B] font-bold text-center">Riesgo Compliance</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[11%] text-[#002C5B] font-bold text-center">Estado ERP</th>
                  <th className="px-3 py-1.5 border-b border-[#A9C4DF] w-[5%] text-[#002C5B] font-bold text-center">Atribs</th>
                </tr>
                <tr className="bg-[#ECF3F9] text-[9.5px]">
                  <th className="w-[30px] bg-[#CFD8DC] border-r border-b border-[#A9C4DF] text-[8px] font-bold text-slate-600 text-center">QBE</th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0401Filters.folio} 
                      onChange={(e) => setF0401Filters({ ...f0401Filters, folio: e.target.value })}
                      placeholder="Folio..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-mono focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0401Filters.taxId} 
                      onChange={(e) => setF0401Filters({ ...f0401Filters, taxId: e.target.value })}
                      placeholder="RUT..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-mono focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0401Filters.name} 
                      onChange={(e) => setF0401Filters({ ...f0401Filters, name: e.target.value })}
                      placeholder="Razón Social..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0401Filters.category} 
                      onChange={(e) => setF0401Filters({ ...f0401Filters, category: e.target.value })}
                      placeholder="Categoría..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0401Filters.bankName} 
                      onChange={(e) => setF0401Filters({ ...f0401Filters, bankName: e.target.value })}
                      placeholder="Banco..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0401Filters.dueDiligenceRisk} 
                      onChange={(e) => setF0401Filters({ ...f0401Filters, dueDiligenceRisk: e.target.value })}
                      placeholder="Riesgo..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] uppercase focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0401Filters.status} 
                      onChange={(e) => setF0401Filters({ ...f0401Filters, status: e.target.value })}
                      placeholder="Estado..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] uppercase font-mono focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-b border-[#A9C4DF] bg-[#ECF3F9]"></th>
                </tr>
              </thead>
              <tbody className="text-[10.5px] font-mono">
                {paginatedF0401.map((s, idx) => {
                  return (
                    <tr 
                      key={s.id} 
                      onClick={() => setSelectedRowId(selectedRowId === s.id ? null : s.id)}
                      onDoubleClick={() => setInspectTarget({ record: s, entityType: 'SUPPLIER' })}
                      onContextMenu={(e) => handleRowContextMenu(e, s, 'SUPPLIER', 'P04012', 'Maestro de Proveedores F0401', s.folio || s.taxId || s.name)}
                      title="Clic para seleccionar fila. Doble clic para Detalle F980011D. Clic DERECHO para Menú Fila ERP"
                      className={`transition-all duration-150 cursor-context-menu text-[10.5px] border-b border-[#A9C4DF] ${
                        selectedRowId === s.id 
                          ? 'bg-[#FFF9C4] font-bold text-[#002C5B]' 
                          : 'bg-white hover:bg-[#FFFCDD] odd:bg-[#F6FAFE] text-slate-800'
                      }`}
                    >
                      <td className="w-[30px] bg-[#E8EEF5] border-r border-[#A9C4DF] text-center select-none py-1 text-slate-700 font-bold">
                        {selectedRowId === s.id ? (
                          <span className="text-[#002C5B] font-black text-[12px]">▶</span>
                        ) : (
                          <span className="text-slate-400 text-[9px] font-normal">{idx + 1}</span>
                        )}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] font-bold text-[#002C5B]">
                        {s.folio || 'N/A'}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] font-bold text-slate-600 select-all">
                        {s.taxId}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] font-sans font-bold text-slate-900 flex items-center justify-between">
                        <span>{s.name}</span>
                        {/* Interactive filters: Click to see related transactions */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInterconnectFilter('F0911_TRANS', 'supplierName', s.name);
                            }}
                            className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-1 py-0.5 rounded text-[8px] tracking-tight hover:bg-indigo-100"
                            title="Filtrar Transacciones"
                          >
                            F0911
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInterconnectFilter('F4801_OT', 'supplierName', s.name);
                            }}
                            className="bg-amber-50 border border-amber-200 text-amber-700 px-1 py-0.5 rounded text-[8px] tracking-tight hover:bg-amber-100"
                            title="Filtrar Órdenes de Trabajo"
                          >
                            F4801
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] font-sans text-slate-500">
                        {s.category}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF]">
                        <span className="block truncate text-slate-600 font-sans" title={`${s.bankName} - ${s.accountNumber}`}>
                          <strong>{s.bankName}</strong> ({s.accountType?.substring(0, 4)}...{s.accountNumber?.slice(-4)})
                        </span>
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-center">
                        <span className={`inline-block px-2 py-0.2 border rounded-xs text-[8.5px] uppercase font-bold ${
                          s.dueDiligenceRisk === 'RIESGO BAJO' 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : s.dueDiligenceRisk === 'RIESGO MEDIO'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {s.dueDiligenceRisk || 'SIN ANALIZAR'}
                        </span>
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-center">
                        <span className={`inline-block px-1.5 py-0.2 border rounded-xs text-[8.5px] font-black ${
                          s.status === 'ACTIVE' 
                            ? 'bg-emerald-500/25 text-emerald-800 border-emerald-300' 
                            : s.status === 'BLOCKED'
                            ? 'bg-rose-500/25 text-rose-800 border-rose-300'
                            : 'bg-amber-500/25 text-amber-800 border-amber-300'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-1 py-1 text-center">
                        <button 
                          onClick={() => setInspectTarget({ record: s, entityType: 'SUPPLIER' })}
                          className="text-slate-400 hover:text-[#0B3C5D]"
                        >
                          <Info size={12} className="mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* TAB 3: F1501 PROPERTIES AND ASSETS */}
          {activeTab === 'F1501_PROP' && (
            <table className="w-full text-left border-collapse min-w-[1200px] border border-[#A9C4DF]">
              <thead className="sticky top-0 bg-[#D2DFEC] text-[#002C5B] z-20 text-[10px] font-sans font-bold">
                <tr>
                  <th className="w-[30px] bg-[#CFD8DC] border-r border-b border-[#A9C4DF] text-[#002C5B] text-center font-bold"></th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[8%] text-[#002C5B] font-bold text-center">Código</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[10%] text-[#002C5B] font-bold text-center">ROL Avalúo</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[26%] text-[#002C5B] font-bold text-center">Dirección Física</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[14%] text-[#002C5B] font-bold text-center">Comuna</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[10%] text-[#002C5B] font-bold text-center">Tipo Inmueble</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[10%] text-[#002C5B] font-bold text-right pr-4">Valor Tasación</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[10%] text-[#002C5B] font-bold text-right pr-4">Canon Arriendo</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[7%] text-[#002C5B] font-bold text-center">Inspeccionar</th>
                  <th className="px-3 py-1.5 border-b border-[#A9C4DF] w-[5%] text-[#002C5B] font-bold text-center">Atribs</th>
                </tr>
                <tr className="bg-[#ECF3F9] text-[9.5px]">
                  <th className="w-[30px] bg-[#CFD8DC] border-r border-b border-[#A9C4DF] text-[8px] font-bold text-slate-600 text-center">QBE</th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1501Filters.code} 
                      onChange={(e) => setF1501Filters({ ...f1501Filters, code: e.target.value })}
                      placeholder="Código..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-mono focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1501Filters.propertyRole} 
                      onChange={(e) => setF1501Filters({ ...f1501Filters, propertyRole: e.target.value })}
                      placeholder="ROL..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-mono focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1501Filters.address} 
                      onChange={(e) => setF1501Filters({ ...f1501Filters, address: e.target.value })}
                      placeholder="Dirección..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1501Filters.commune} 
                      onChange={(e) => setF1501Filters({ ...f1501Filters, commune: e.target.value })}
                      placeholder="Comuna..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1501Filters.type} 
                      onChange={(e) => setF1501Filters({ ...f1501Filters, type: e.target.value })}
                      placeholder="Tipo Inm..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1501Filters.appraisalValue} 
                      onChange={(e) => setF1501Filters({ ...f1501Filters, appraisalValue: e.target.value })}
                      placeholder="Tasación..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1501Filters.rentalAmount} 
                      onChange={(e) => setF1501Filters({ ...f1501Filters, rentalAmount: e.target.value })}
                      placeholder="Canon..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF] bg-[#ECF3F9]"></th>
                  <th className="p-1 border-b border-[#A9C4DF] bg-[#ECF3F9]"></th>
                </tr>
              </thead>
              <tbody className="text-[10.5px] font-mono">
                {paginatedF1501.map((p, idx) => {
                  return (
                    <tr 
                      key={p.id} 
                      onClick={() => setSelectedRowId(selectedRowId === p.id ? null : p.id)}
                      onDoubleClick={() => setInspectTarget({ record: p, entityType: 'PROPERTY' })}
                      onContextMenu={(e) => handleRowContextMenu(e, p, 'PROPERTY', 'P1501', 'Catastro de Inmuebles F1501', p.code || p.address)}
                      title="Clic para seleccionar fila. Doble clic para Detalle F980011D. Clic DERECHO para Menú Fila ERP"
                      className={`transition-all duration-150 cursor-context-menu text-[10.5px] border-b border-[#A9C4DF] ${
                        selectedRowId === p.id 
                          ? 'bg-[#FFF9C4] font-bold text-[#002C5B]' 
                          : 'bg-white hover:bg-[#FFFCDD] odd:bg-[#F6FAFE] text-slate-800'
                      }`}
                    >
                      <td className="w-[30px] bg-[#E8EEF5] border-r border-[#A9C4DF] text-center select-none py-1 text-slate-700 font-bold">
                        {selectedRowId === p.id ? (
                          <span className="text-[#002C5B] font-black text-[12px]">▶</span>
                        ) : (
                          <span className="text-slate-400 text-[9px] font-normal">{idx + 1}</span>
                        )}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] font-bold text-[#005B94] select-all">
                        {p.code}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] font-bold text-slate-600">
                        {p.propertyRole || 'N/A'}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] font-sans text-slate-900 flex items-center justify-between">
                        <span>{p.address}</span>
                        {/* Interactive links: click to filter contracts or OTs of this property */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInterconnectFilter('F0911_TRANS', 'propertyLabel', p.code);
                            }}
                            className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-1 py-0.5 rounded text-[8px] hover:bg-indigo-100"
                            title="Filtrar Ledger"
                          >
                            Ledger
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInterconnectFilter('F1502_LEASES', 'propertyLabel', p.code);
                            }}
                            className="bg-purple-50 border border-purple-200 text-purple-700 px-1 py-0.5 rounded text-[8px] hover:bg-purple-100"
                            title="Filtrar Arrendamientos"
                          >
                            Lease
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInterconnectFilter('F4801_OT', 'propertyLabel', p.code);
                            }}
                            className="bg-amber-50 border border-amber-200 text-amber-700 px-1 py-0.5 rounded text-[8px] hover:bg-amber-100"
                            title="Filtrar OTs"
                          >
                            OT
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] font-sans text-slate-500">
                        {p.commune}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF]">
                        <span className="text-[9px] bg-slate-100 border border-slate-200 p-1 rounded font-black text-slate-700">
                          {p.type}
                        </span>
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-right font-bold text-emerald-800">
                        {formatCLP(p.appraisalValue)}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-right font-black text-[#002C5B] bg-sky-50/20">
                        {formatCLP(p.rentalAmount)}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveModule('PROPIEDADES'); }}
                          className="bg-slate-150 hover:bg-slate-300 border border-slate-350 px-2 py-0.5 text-[8.5px] uppercase font-bold text-slate-800 flex items-center justify-center gap-1 mx-auto"
                        >
                          Ir <ArrowRight size={10} />
                        </button>
                      </td>
                      <td className="px-1 py-1 text-center">
                        <button 
                          onClick={() => setInspectTarget({ record: p, entityType: 'PROPERTY' })}
                          className="text-slate-400 hover:text-[#0B3C5D]"
                        >
                          <Info size={12} className="mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* TAB 4: F4801 WORK ORDERS */}
          {activeTab === 'F4801_OT' && (
            <table className="w-full text-left border-collapse min-w-[1200px] border border-[#A9C4DF]">
              <thead className="sticky top-0 bg-[#D2DFEC] text-[#002C5B] z-20 text-[10px] font-sans font-bold">
                <tr>
                  <th className="w-[30px] bg-[#CFD8DC] border-r border-[#A9C4DF] text-[#002C5B] text-center font-bold"></th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[8%] text-[#002C5B] font-bold text-center">Folio OT</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[14%] text-[#002C5B] font-bold text-center">Estado Ejecución</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[22%] text-[#002C5B] font-bold text-center">Proveedor Asignado</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[18%] text-[#002C5B] font-bold text-center">Inmueble / Unidad Involucrada</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[11%] text-[#002C5B] font-bold text-right pr-4">Total OT ($)</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[14%] text-[#002C5B] font-bold text-center">Responsable Técnico</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[8%] text-[#002C5B] font-bold text-center">Fecha Emisión</th>
                  <th className="px-3 py-1.5 border-b border-[#A9C4DF] w-[5%] text-[#002C5B] font-bold text-center">Atribs</th>
                </tr>
                <tr className="bg-[#ECF3F9] text-[9.5px]">
                  <th className="w-[30px] bg-[#CFD8DC] border-r border-b border-[#A9C4DF] text-[8px] font-bold text-slate-600 text-center">QBE</th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f4801Filters.folio} 
                      onChange={(e) => setF4801Filters({ ...f4801Filters, folio: e.target.value })}
                      placeholder="Folio..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-mono focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f4801Filters.status} 
                      onChange={(e) => setF4801Filters({ ...f4801Filters, status: e.target.value })}
                      placeholder="Estado..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] uppercase font-mono focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f4801Filters.supplierName} 
                      onChange={(e) => setF4801Filters({ ...f4801Filters, supplierName: e.target.value })}
                      placeholder="Proveedor..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f4801Filters.propertyLabel} 
                      onChange={(e) => setF4801Filters({ ...f4801Filters, propertyLabel: e.target.value })}
                      placeholder="Unidad..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f4801Filters.total} 
                      onChange={(e) => setF4801Filters({ ...f4801Filters, total: e.target.value })}
                      placeholder="Total..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f4801Filters.trackingResponsible} 
                      onChange={(e) => setF4801Filters({ ...f4801Filters, trackingResponsible: e.target.value })}
                      placeholder="Resp..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f4801Filters.issueDate} 
                      onChange={(e) => setF4801Filters({ ...f4801Filters, issueDate: e.target.value })}
                      placeholder="Fecha..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-b border-[#A9C4DF] bg-[#ECF3F9]"></th>
                </tr>
              </thead>
              <tbody className="text-[10.5px] font-mono">
                {paginatedF4801.map((w, idx) => {
                  return (
                    <tr 
                      key={w.id} 
                      onClick={() => setSelectedRowId(selectedRowId === w.id ? null : w.id)}
                      onDoubleClick={() => setInspectTarget({ record: w, entityType: 'WORK_ORDER' })}
                      onContextMenu={(e) => handleRowContextMenu(e, w, 'WORK_ORDER', 'P48201', 'Órdenes de Trabajo F4801', w.folio || w.id)}
                      title="Clic para seleccionar fila. Doble clic para Detalle F980011D. Clic DERECHO para Menú Fila ERP"
                      className={`transition-all duration-150 cursor-context-menu text-[10.5px] border-b border-[#A9C4DF] ${
                        selectedRowId === w.id 
                          ? 'bg-[#FFF9C4] font-bold text-[#002C5B]' 
                          : 'bg-white hover:bg-[#FFFCDD] odd:bg-[#F6FAFE] text-slate-800'
                      }`}
                    >
                      <td className="w-[30px] bg-[#E8EEF5] border-r border-[#A9C4DF] text-center select-none py-1 text-slate-700 font-bold">
                        {selectedRowId === w.id ? (
                          <span className="text-[#002C5B] font-black text-[12px]">▶</span>
                        ) : (
                          <span className="text-slate-400 text-[9px] font-normal">{idx + 1}</span>
                        )}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] font-bold text-[#005B94]">
                        {w.folio}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-center">
                        <span className={`inline-block px-2 py-0.2 border rounded-xs text-[8.5px] font-bold ${
                          w.status === 'PAGADA' || w.status === 'TERMINADA' || w.status === 'RECEPCIONADA'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : w.status === 'PENDIENTE_VB'
                            ? 'bg-rose-100 text-[#002C5B] font-black border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                      
                      {/* Connected Supplier Column */}
                      <td className="px-3 py-1 border-r border-[#A9C4DF]">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInterconnectFilter('F0401_PROV', 'taxId', w.supplierTaxId);
                          }}
                          className="text-[#005B94] hover:underline font-bold text-left block"
                        >
                          {w.supplierName} ({w.supplierTaxId})
                        </button>
                      </td>

                      {/* Connected Property Column */}
                      <td className="px-3 py-1 border-r border-[#A9C4DF]">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInterconnectFilter('F1501_PROP', 'code', w.propertyId);
                          }}
                          className="text-amber-800 hover:underline font-bold text-left block"
                        >
                          {w.propertyLabel}
                        </button>
                      </td>

                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-right font-black text-rose-950">
                        {formatCLP(w.total)}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] font-sans text-slate-600">
                        {w.trackingResponsible || 'N/A SIN ASIGNAR'}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-center text-[10px]">
                        {w.issueDate || 'N/A'}
                      </td>
                      <td className="px-1 py-1 text-center">
                        <button 
                          onClick={() => setInspectTarget({ record: w, entityType: 'WORK_ORDER' })}
                          className="text-slate-400 hover:text-[#0B3C5D]"
                        >
                          <Info size={12} className="mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* TAB 5: F1502 LEASE AGREEMENTS */}
          {activeTab === 'F1502_LEASES' && (
            <table className="w-full text-left border-collapse min-w-[1200px] border border-[#A9C4DF]">
              <thead className="sticky top-0 bg-[#D2DFEC] text-[#002C5B] z-20 text-[10px] font-sans font-bold">
                <tr>
                  <th className="w-[30px] bg-[#CFD8DC] border-r border-b border-[#A9C4DF] text-[#002C5B] text-center font-bold"></th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[18%] text-[#002C5B] font-bold text-center">Razón Social Arrendatario</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[11%] text-[#002C5B] font-bold text-center">RUT Inquilino</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[18%] text-[#002C5B] font-bold text-center">Propiedad Arrendada</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[11%] text-[#002C5B] font-bold text-right pr-4">Monto Mensual</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[10%] text-[#002C5B] font-bold text-center">Fecha Inicio</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[10%] text-[#002C5B] font-bold text-center">Fecha Término</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[11%] text-[#002C5B] font-bold text-center">Estado Auditoría</th>
                  <th className="px-3 py-1.5 border-b border-[#A9C4DF] w-[5%] text-[#002C5B] font-bold text-center">Atribs</th>
                </tr>
                <tr className="bg-[#ECF3F9] text-[9.5px]">
                  <th className="w-[30px] bg-[#CFD8DC] border-r border-b border-[#A9C4DF] text-[8px] font-bold text-slate-600 text-center">QBE</th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1502Filters.tenantName} 
                      onChange={(e) => setF1502Filters({ ...f1502Filters, tenantName: e.target.value })}
                      placeholder="Inquilino..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1502Filters.tenantTaxId} 
                      onChange={(e) => setF1502Filters({ ...f1502Filters, tenantTaxId: e.target.value })}
                      placeholder="RUT..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-mono focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1502Filters.propertyLabel} 
                      onChange={(e) => setF1502Filters({ ...f1502Filters, propertyLabel: e.target.value })}
                      placeholder="Propiedad..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1502Filters.monthlyAmount} 
                      onChange={(e) => setF1502Filters({ ...f1502Filters, monthlyAmount: e.target.value })}
                      placeholder="Monto..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1502Filters.startDate} 
                      onChange={(e) => setF1502Filters({ ...f1502Filters, startDate: e.target.value })}
                      placeholder="Inicio..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF] bg-[#ECF3F9]"></th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f1502Filters.status} 
                      onChange={(e) => setF1502Filters({ ...f1502Filters, status: e.target.value })}
                      placeholder="Estado..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-mono text-center uppercase focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-b border-[#A9C4DF] bg-[#ECF3F9]"></th>
                </tr>
              </thead>
              <tbody className="text-[10.5px] font-mono">
                {paginatedF1502.map((lc, idx) => {
                  return (
                    <tr 
                      key={lc.id} 
                      onClick={() => setSelectedRowId(selectedRowId === lc.id ? null : lc.id)}
                      onDoubleClick={() => setInspectTarget({ record: lc, entityType: 'LEASE' })}
                      onContextMenu={(e) => handleRowContextMenu(e, lc, 'LEASE', 'P15012', 'Contratos de Arriendo F1502', lc.tenantName || lc.tenantTaxId || lc.id)}
                      title="Clic para seleccionar fila. Doble clic para Detalle F980011D. Clic DERECHO para Menú Fila ERP"
                      className={`transition-all duration-150 cursor-context-menu text-[10.5px] border-b border-[#A9C4DF] ${
                        selectedRowId === lc.id 
                          ? 'bg-[#FFF9C4] font-bold text-[#002C5B]' 
                          : 'bg-white hover:bg-[#FFFCDD] odd:bg-[#F6FAFE] text-slate-800'
                      }`}
                    >
                      <td className="w-[30px] bg-[#E8EEF5] border-r border-[#A9C4DF] text-center select-none py-1 text-slate-700 font-bold">
                        {selectedRowId === lc.id ? (
                          <span className="text-[#002C5B] font-black text-[12px]">▶</span>
                        ) : (
                          <span className="text-slate-400 text-[9px] font-normal">{idx + 1}</span>
                        )}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] font-sans font-bold text-slate-900 select-all">
                        {lc.tenantName}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-slate-600 font-extrabold select-all">
                        {lc.tenantTaxId}
                      </td>
                      
                      {/* Connected Property Column */}
                      <td className="px-3 py-1 border-r border-[#A9C4DF]">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInterconnectFilter('F1501_PROP', 'code', lc.propertyId);
                          }}
                          className="text-[#005B94] hover:underline font-bold text-left block"
                        >
                          {lc.propertyLabel}
                        </button>
                      </td>

                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-right font-black text-[#002C5B]">
                        {formatCLP(lc.monthlyAmount)} <span className="text-[8.5px] font-black text-[#005B94] block">{lc.currency}</span>
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-center">
                        {lc.startDate}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-center text-slate-500">
                        {lc.endDate || 'INDEFINIDO'}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-center">
                        <span className={`inline-block px-2 py-0.2 border rounded-xs font-black text-[8.5px] ${
                          lc.status === 'VIGENTE' 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : lc.status === 'POR_VENCER'
                            ? 'bg-amber-100 text-amber-850 border-amber-300 animate-pulse'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {lc.status}
                        </span>
                      </td>
                      <td className="px-1 py-1 text-center">
                        <button 
                          onClick={() => setInspectTarget({ record: lc, entityType: 'LEASE' })}
                          className="text-slate-400 hover:text-[#0B3C5D]"
                        >
                          <Info size={12} className="mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* TAB 6: F0402 SUPPLIER SERVICES CONTRACTS */}
          {activeTab === 'F0402_CONTS' && (
            <table className="w-full text-left border-collapse min-w-[1200px] border border-[#A9C4DF]">
              <thead className="sticky top-0 bg-[#D2DFEC] text-[#002C5B] z-20 text-[10px] font-sans font-bold">
                <tr>
                  <th className="w-[30px] bg-[#CFD8DC] border-r border-b border-[#A9C4DF] text-[#002C5B] text-center font-bold"></th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[20%] text-[#002C5B] font-bold text-center">Proveedor del Servicio</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[16%] text-[#002C5B] font-bold text-center">Edificio / Unidad Inmobiliaria</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[8%] text-[#002C5B] font-bold text-center">Piso/Oficina</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[12%] text-[#002C5B] font-bold text-right pr-4">Monto Mensual Neto</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[10%] text-[#002C5B] font-bold text-center">Fecha Inicio</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[10%] text-[#002C5B] font-bold text-center">Fecha Vencimiento</th>
                  <th className="px-3 py-1.5 border-r border-b border-[#A9C4DF] w-[13%] text-[#002C5B] font-bold text-center">Estado Auditoría</th>
                  <th className="px-3 py-1.5 border-b border-[#A9C4DF] w-[5%] text-[#002C5B] font-bold text-center">Atribs</th>
                </tr>
                <tr className="bg-[#ECF3F9] text-[9.5px]">
                  <th className="w-[30px] bg-[#CFD8DC] border-r border-b border-[#A9C4DF] text-[8px] font-bold text-slate-600 text-center">QBE</th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0402Filters.supplierName} 
                      onChange={(e) => setF0402Filters({ ...f0402Filters, supplierName: e.target.value })}
                      placeholder="Proveedor..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0402Filters.building} 
                      onChange={(e) => setF0402Filters({ ...f0402Filters, building: e.target.value })}
                      placeholder="Edificio..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF] bg-[#ECF3F9]"></th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0402Filters.monthlyAmount} 
                      onChange={(e) => setF0402Filters({ ...f0402Filters, monthlyAmount: e.target.value })}
                      placeholder="Monto..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0402Filters.startDate} 
                      onChange={(e) => setF0402Filters({ ...f0402Filters, startDate: e.target.value })}
                      placeholder="Inicio..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0402Filters.endDate} 
                      onChange={(e) => setF0402Filters({ ...f0402Filters, endDate: e.target.value })}
                      placeholder="Vence..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] font-sans focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-r border-b border-[#A9C4DF]">
                    <input 
                      type="text" 
                      value={f0402Filters.status} 
                      onChange={(e) => setF0402Filters({ ...f0402Filters, status: e.target.value })}
                      placeholder="Estado..."
                      className="w-full bg-[#FFFFE1] border border-[#A9C4DF] px-1 py-0.5 text-[9.5px] uppercase font-mono text-center focus:bg-white focus:outline-none focus:border-[#005B94] rounded-none"
                    />
                  </th>
                  <th className="p-1 border-b border-[#A9C4DF] bg-[#ECF3F9]"></th>
                </tr>
              </thead>
              <tbody className="text-[10.5px] font-mono">
                {paginatedF0402.map((c, idx) => {
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedRowId(selectedRowId === c.id ? null : c.id)}
                      onDoubleClick={() => setInspectTarget({ record: c, entityType: 'CONTRACT' })}
                      onContextMenu={(e) => handleRowContextMenu(e, c, 'CONTRACT', 'P0402', 'Contratos de Servicio F0402', c.supplierName || c.building || c.id)}
                      title="Clic para seleccionar fila. Doble clic para Detalle F980011D. Clic DERECHO para Menú Fila ERP"
                      className={`transition-all duration-150 cursor-context-menu text-[10.5px] border-b border-[#A9C4DF] ${
                        selectedRowId === c.id 
                          ? 'bg-[#FFF9C4] font-bold text-[#002C5B]' 
                          : 'bg-white hover:bg-[#FFFCDD] odd:bg-[#F6FAFE] text-slate-800'
                      }`}
                    >
                      <td className="w-[30px] bg-[#E8EEF5] border-r border-[#A9C4DF] text-center select-none py-1 text-slate-700 font-bold">
                        {selectedRowId === c.id ? (
                          <span className="text-[#002C5B] font-black text-[12px]">▶</span>
                        ) : (
                          <span className="text-slate-400 text-[9px] font-normal">{idx + 1}</span>
                        )}
                      </td>
                      
                      {/* Connected Supplier Column */}
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-slate-900 font-sans font-bold">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInterconnectFilter('F0401_PROV', 'taxId', c.supplierId);
                          }}
                          className="text-[#005B94] hover:underline font-bold text-left block"
                        >
                          {c.supplierName}
                        </button>
                      </td>

                      <td className="px-3 py-1 border-r border-[#A9C4DF] font-sans">
                        {c.building}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-slate-600 font-bold">
                        {c.floor || 'N/A'}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-right font-black text-[#002C5B]">
                        {formatCLP(c.monthlyAmount)}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-center">
                        {c.startDate}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-center">
                        {c.endDate}
                      </td>
                      <td className="px-3 py-1 border-r border-[#A9C4DF] text-center">
                        <span className={`inline-block px-1.5 py-0.2 border rounded-xs font-black text-[8.5px] ${
                          c.status === 'VIGENTE' 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : c.status === 'POR_VENCER'
                            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-1 py-1 text-center">
                        <button 
                          onClick={() => setInspectTarget({ record: c, entityType: 'CONTRACT' })}
                          className="text-slate-400 hover:text-[#0B3C5D]"
                        >
                          <Info size={12} className="mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Empty Grid Fallback */}
          {((activeTab === 'F0911_TRANS' && filteredF0911.length === 0) ||
            (activeTab === 'F0401_PROV' && filteredF0401.length === 0) ||
            (activeTab === 'F1501_PROP' && filteredF1501.length === 0) ||
            (activeTab === 'F4801_OT' && filteredF4801.length === 0) ||
            (activeTab === 'F1502_LEASES' && filteredF1502.length === 0) ||
            (activeTab === 'F0402_CONTS' && filteredF0402.length === 0)) && (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-slate-400 bg-slate-50 min-h-[300px]">
              <ShieldAlert size={36} className="text-[#FFCC00] mb-3 animate-bounce" />
              <p className="text-xs font-black uppercase tracking-widest text-[#0B3C5D] font-mono">[NO_MATCH_FOUND]</p>
              <p className="text-[10px] font-mono text-slate-500 uppercase mt-1">Ningún registro en la base de datos de ERP coincide con los criterios QBE ingresados.</p>
            </div>
          )}

        </div>

        {/* 
          ========================================================================
          ERP GRID FOOTER / PAGINATION BAR
          ========================================================================
        */}
        <div className="bg-[#DCE7F2] border border-[#6B8095] border-t-0 px-3 py-1.5 shrink-0 flex flex-col md:flex-row items-center justify-between font-mono text-[10px] text-slate-800 select-none gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-[#1C4E75] uppercase">Cuadrícula Registros:</span>
            <span className="bg-white border border-[#A2BCCF] px-2 py-0.5 font-bold">
              {currentTotalCount === 0 ? 0 : currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, currentTotalCount)} de {currentTotalCount}
            </span>
            {selectedRowId && (
              <span className="text-indigo-950 bg-indigo-50 px-2 py-0.5 border border-indigo-200 font-bold animate-pulse">
                Fila Seleccionada: <strong className="font-black">{selectedRowId.slice(0, 8)}</strong>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#1C4E75]">Tamaño Página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="bg-white border border-[#9DB2C3] px-1.5 py-0.5 text-[9.5px] font-bold focus:outline-none focus:border-[#0B3C5D]"
            >
              <option value={10}>10 por pág</option>
              <option value={20}>20 por pág</option>
              <option value={50}>50 por pág</option>
              <option value={100}>100 por pág</option>
              <option value={200}>200 por pág</option>
            </select>

            <div className="flex items-center gap-1 ml-0 md:ml-4 border-l border-[#A2BCCF] pl-3">
              <button
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
                className={`p-1 border rounded-xs ${
                  currentPage === 0 
                    ? 'bg-slate-150 text-slate-350 border-slate-200 cursor-not-allowed' 
                    : 'bg-white text-slate-800 border-[#A2BCCF] hover:bg-slate-50 cursor-pointer'
                }`}
                title="Primera página"
              >
                <ChevronsLeft size={11} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className={`p-1 border rounded-xs ${
                  currentPage === 0 
                    ? 'bg-slate-150 text-slate-350 border-slate-200 cursor-not-allowed' 
                    : 'bg-white text-slate-800 border-[#A2BCCF] hover:bg-slate-50 cursor-pointer'
                }`}
                title="Página anterior"
              >
                <ChevronLeft size={11} />
              </button>

              <span className="px-2.5 py-0.5 bg-white border border-[#9DB2C3] font-bold text-[#1C4E75]">
                Pág. {totalPages === 0 ? 0 : currentPage + 1} de {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                className={`p-1 border rounded-xs ${
                  currentPage >= totalPages - 1 
                    ? 'bg-slate-150 text-slate-350 border-slate-200 cursor-not-allowed' 
                    : 'bg-white text-slate-800 border-[#A2BCCF] hover:bg-slate-50 cursor-pointer'
                }`}
                title="Siguiente página"
              >
                <ChevronRight size={11} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
                className={`p-1 border rounded-xs ${
                  currentPage >= totalPages - 1 
                    ? 'bg-slate-150 text-slate-350 border-slate-200 cursor-not-allowed' 
                    : 'bg-white text-slate-800 border-[#A2BCCF] hover:bg-slate-50 cursor-pointer'
                }`}
                title="Última página"
              >
                <ChevronsRight size={11} />
              </button>
            </div>
          </div>
        </div>

        {/* Integrated (Docked) Cross-Connection Relationships Panel */}
        {selectedRowId && !isRelationsDetached && (
          <div className="h-[45%] min-h-[160px] border border-[#6B8095] bg-[#EBF0F5] flex flex-col overflow-hidden shrink-0">
            {renderRelationsPanel()}
          </div>
        )}

      </div>

      {/* Floating (Detached) Cross-Connection Relationships Window (MDI Style) */}
      {selectedRowId && isRelationsDetached && (
        <div 
          style={{ 
            position: 'absolute', 
            left: `${relationsPos.x}px`, 
            top: `${relationsPos.y}px`, 
            width: `${relationsPos.w}px`, 
            height: `${relationsPos.h}px`, 
            zIndex: 150 
          }}
          className="bg-[#EBF0F5] border-2 border-[#1C4E75] shadow-2xl flex flex-col overflow-hidden rounded-none"
        >
          {/* Window Title Bar for Dragging */}
          <div 
            onMouseDown={startDragRelations}
            className="bg-gradient-to-r from-[#1C4E75] to-[#0B3C5D] px-3 py-1.5 text-white font-mono text-[10px] font-bold flex justify-between items-center select-none cursor-grab active:cursor-grabbing border-b border-[#0A3250]"
          >
            <div className="flex items-center gap-1.5">
              <Database size={11} className="text-[#FFCC00]" />
              <span>F980011D: Visor de Interconexiones Cruzadas ERP [ID: {selectedRowId.slice(0, 8).toUpperCase()}]</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsRelationsDetached(false)}
                className="bg-white/10 hover:bg-white/20 text-white px-1.5 py-0.5 text-[8.5px] rounded-sm font-bold uppercase cursor-pointer"
                title="Empotrar panel en la parte inferior"
              >
                Empotrar
              </button>
              <button 
                onClick={() => setSelectedRowId(null)}
                className="bg-red-650 hover:bg-red-700 text-white font-bold px-1.5 py-0.5 text-[8.5px] rounded-sm uppercase cursor-pointer"
                title="Cerrar visor"
              >
                [X]
              </button>
            </div>
          </div>

          {/* Window Body */}
          <div className="flex-1 overflow-hidden flex flex-col relative bg-white">
            {renderRelationsPanel()}
          </div>

          {/* Window Resize Handle */}
          <div 
            onMouseDown={startResizeRelations}
            className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize flex items-end justify-end p-0.5 select-none"
            title="Arrastre para cambiar tamaño"
          >
            <svg width="6" height="6" viewBox="0 0 8 8" className="text-[#1C4E75]">
              <path d="M6 0 L8 0 L8 8 L0 8 L0 6 L4 6 L4 4 L6 4 Z" fill="currentColor" opacity="0.6"/>
            </svg>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        ERP BOTTOM STATS & DETAILS RAIL
        ========================================================================
      */}
      <div className="bg-[#D2DFEC] px-3 py-1.5 border-t border-[#6B8095] shrink-0 text-[10px] font-mono text-[#0B3C5D] font-bold flex flex-col md:flex-row justify-between items-center gap-1">
        <div className="flex items-center gap-3">
          <span>TABLA ACTIVA: <strong className="bg-[#0B3C5D] text-white px-1.5 py-0.5 rounded text-[9px] font-black">{activeTab}</strong></span>
          <div className="h-3 w-[1px] bg-[#6B8095]"></div>
          <span>REGISTROS MOSTRADOS: <strong className="text-slate-900 text-xs font-black">
            {activeTab === 'F0911_TRANS' ? filteredF0911.length : 
             activeTab === 'F0401_PROV' ? filteredF0401.length : 
             activeTab === 'F1501_PROP' ? filteredF1501.length : 
             activeTab === 'F4801_OT' ? filteredF4801.length : 
             activeTab === 'F1502_LEASES' ? filteredF1502.length : 
             filteredF0402.length}
          </strong> de {
            activeTab === 'F0911_TRANS' ? transactions.length : 
            activeTab === 'F0401_PROV' ? suppliers.length : 
            activeTab === 'F1501_PROP' ? properties.length : 
            activeTab === 'F4801_OT' ? workOrders.length : 
            activeTab === 'F1502_LEASES' ? leaseContracts.length : 
            contracts.length
          }</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-[9px]">
          <span>MKEY: #0001</span>
          <span>● SERVIDOR ESTABLE CHILE-CENTRO</span>
        </div>
      </div>

      {/* 
        ========================================================================
        F980011D ATRIBUTES & MASTER LOGS INSPECTOR MODAL
        ========================================================================
      */}
      {inspectTarget && (() => {
        const audit = getAuditData(inspectTarget.record, inspectTarget.entityType);
        return (
          <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white border-2 border-[#0B3C5D] shadow-xl w-full max-w-2xl max-h-[85vh] md:max-h-[90vh] overflow-hidden rounded shadow-2xl flex flex-col font-sans">
              
              {/* Modal Header */}
              <div className="bg-[#0B3C5D] p-3 text-white flex justify-between items-center border-b border-[#051C30]">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-[#FFCC00]" />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-tight font-mono">
                      F980011D - Consulta de Maestro de Atributos del Registro
                    </h3>
                    <p className="text-[9px] text-slate-300 font-mono">INSPECCIÓN DE HISTORIAL, AUDIT COMPLIANCE Y FIRMAS DE SEGURIDAD</p>
                  </div>
                </div>
                <button 
                  onClick={() => setInspectTarget(null)}
                  className="bg-[#FFCC00]/10 hover:bg-[#FFCC00]/25 text-[#FFCC00] px-2.5 py-1 text-[10px] font-black font-mono tracking-widest rounded-sm"
                >
                  CERRAR [X]
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
                
                {/* 1. Entity Overview */}
                <div className="bg-[#EBF0F5] border border-[#9DB2C3] p-3">
                  <h4 className="font-extrabold text-[#0B3C5D] uppercase tracking-wider text-[10px] font-mono flex items-center gap-1.5 mb-2">
                    <Tag size={13} />
                    Resumen de Registro Maestro Selecto
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                    <div>
                      <span className="text-slate-600 font-semibold block uppercase text-[9px]">ID Interno Generizado:</span>
                      <strong className="text-slate-800 select-all font-mono break-all">{inspectTarget.record.id || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 font-semibold block uppercase text-[9px]">Tabla de Datos ERP:</span>
                      <strong className="text-slate-800 font-mono font-black">{activeTab}</strong>
                    </div>
                    
                    {inspectTarget.entityType === 'TRANSACTION' && (
                      <>
                        <div>
                          <span className="text-slate-600 font-semibold block uppercase text-[9px]">Glosa Transaccional:</span>
                          <strong className="text-slate-800">{inspectTarget.record.description || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-600 font-semibold block uppercase text-[9px]">Monto Contabilizado:</span>
                          <strong className="text-indigo-900 text-sm font-black">{formatCLP(inspectTarget.record.amount)}</strong>
                        </div>
                      </>
                    )}

                    {inspectTarget.entityType === 'SUPPLIER' && (
                      <>
                        <div>
                          <span className="text-slate-600 font-semibold block uppercase text-[9px]">Razón Social / RUT:</span>
                          <strong className="text-slate-800">{inspectTarget.record.name} ({inspectTarget.record.taxId})</strong>
                        </div>
                        <div>
                          <span className="text-slate-600 font-semibold block uppercase text-[9px]">Riesgo Directo Compliance:</span>
                          <strong className="text-rose-900 font-black">{inspectTarget.record.dueDiligenceRisk}</strong>
                        </div>
                      </>
                    )}

                    {inspectTarget.entityType === 'PROPERTY' && (
                      <>
                        <div>
                          <span className="text-slate-600 font-semibold block uppercase text-[9px]">Dirección / Comuna:</span>
                          <strong className="text-slate-800">{inspectTarget.record.address} ({inspectTarget.record.commune})</strong>
                        </div>
                        <div>
                          <span className="text-slate-600 font-semibold block uppercase text-[9px]">ROL Avalúo / Tasación:</span>
                          <strong className="text-[#0B3C5D] font-bold">{inspectTarget.record.propertyRole || 'N/A'} - {formatCLP(inspectTarget.record.appraisalValue)}</strong>
                        </div>
                      </>
                    )}

                    {inspectTarget.entityType === 'WORK_ORDER' && (
                      <>
                        <div>
                          <span className="text-slate-600 font-semibold block uppercase text-[9px]">Folio OT / Items:</span>
                          <strong className="text-slate-800">{inspectTarget.record.folio} ({inspectTarget.record.items?.length || 0} ítems)</strong>
                        </div>
                        <div>
                          <span className="text-slate-600 font-semibold block uppercase text-[9px]">Total Obras Netos + IVA:</span>
                          <strong className="text-rose-900 text-sm font-bold">{formatCLP(inspectTarget.record.total)}</strong>
                        </div>
                      </>
                    )}

                    {inspectTarget.entityType === 'LEASE' && (
                      <>
                        <div>
                          <span className="text-slate-600 font-semibold block uppercase text-[9px]">Arrendatario / Identificador:</span>
                          <strong className="text-slate-800">{inspectTarget.record.tenantName} ({inspectTarget.record.tenantTaxId})</strong>
                        </div>
                        <div>
                          <span className="text-slate-600 font-semibold block uppercase text-[9px]">Arriendo Mensual UF/CLP:</span>
                          <strong className="text-slate-800 font-black">{formatCLP(inspectTarget.record.monthlyAmount)} {inspectTarget.record.currency}</strong>
                        </div>
                      </>
                    )}

                    {inspectTarget.entityType === 'CONTRACT' && (
                      <>
                        <div>
                          <span className="text-slate-600 font-semibold block uppercase text-[9px]">Proveedor / Edificio:</span>
                          <strong className="text-slate-800">{inspectTarget.record.supplierName} ({inspectTarget.record.building})</strong>
                        </div>
                        <div>
                          <span className="text-slate-600 font-semibold block uppercase text-[9px]">Costo Mensual Directo:</span>
                          <strong className="text-[#0B3C5D] font-bold">{formatCLP(inspectTarget.record.monthlyAmount)}</strong>
                        </div>
                      </>
                    )}

                  </div>
                </div>

                {/* 2. ERP Audit Metadata Grid */}
                <div>
                  <h4 className="font-extrabold text-[#0B3C5D] uppercase tracking-wider text-[10px] font-mono flex items-center gap-1.5 mb-2">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    Atributos del Esquema de Control (Trazabilidad Inmutable)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-[10px] bg-slate-50 border border-slate-200 p-3 rounded">
                    
                    <div className="bg-white p-2 border border-slate-100 rounded">
                      <span className="text-slate-500 block pb-1 text-[8.5px] font-bold uppercase tracking-widest">ERP program ID (F9210)</span>
                      <strong className="text-[#0B3C5D] font-black text-xs">{audit.programId}</strong>
                    </div>

                    <div className="bg-white p-2 border border-slate-100 rounded">
                      <span className="text-slate-500 block pb-1 text-[8.5px] font-bold uppercase tracking-widest">Next No Seq (F0002)</span>
                      <strong className="text-slate-800 font-black text-xs">#{audit.nextNumberSeq}</strong>
                    </div>

                    <div className="bg-white p-2 border border-slate-100 rounded col-span-1 md:col-span-1">
                      <span className="text-slate-500 block pb-1 text-[8.5px] font-bold uppercase tracking-widest">Entidad de Control</span>
                      <strong className="text-purple-900 font-black">{inspectTarget.entityType}</strong>
                    </div>

                    <div className="bg-white p-2 border border-slate-100 rounded col-span-2">
                      <span className="text-slate-500 block pb-1 text-[8.5px] font-bold uppercase tracking-widest">Terminal / WS MKEY</span>
                      <strong className="text-slate-600 truncate block text-[9.5px]" title={audit.workStationId}>{audit.workStationId}</strong>
                    </div>

                    <div className="bg-white p-2 border border-slate-100 rounded col-span-1">
                      <span className="text-slate-500 block pb-1 text-[8.5px] font-bold uppercase tracking-widest">User Creator/Auditor</span>
                      <strong className="text-slate-800 text-[10px] block truncate">{audit.userCreator}</strong>
                    </div>

                    <div className="bg-white p-2 border border-slate-100 rounded col-span-2 md:col-span-3">
                      <span className="text-slate-500 block pb-1 text-[8.5px] font-bold uppercase tracking-widest">Hash de Trazabilidad Criptográfica (Inconmovible)</span>
                      <strong className="text-[#0B3C5D] text-[9.5px] tracking-tight block select-all break-all">{audit.hashSignature}</strong>
                    </div>

                    <div className="bg-white p-2 border border-slate-100 rounded col-span-1 md:col-span-2">
                      <span className="text-slate-500 block pb-1 text-[8.5px] font-bold uppercase tracking-widest">Estampa de Sincronización</span>
                      <strong className="text-slate-800">{audit.timestamp}</strong>
                    </div>

                    <div className="bg-white p-2 border border-slate-100 rounded col-span-1">
                      <span className="text-slate-500 block pb-1 text-[8.5px] font-bold uppercase tracking-widest">Ambiente base</span>
                      <strong className="text-emerald-700 text-[9px] font-black">{audit.isTest}</strong>
                    </div>

                  </div>
                </div>

                {/* 3. Locking mechanism logs */}
                <div className="bg-rose-50/50 border border-rose-100 p-2 text-[10px] text-rose-950 rounded flex items-start gap-2">
                  <ShieldAlert size={14} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-tight font-mono">
                    <span className="font-extrabold block text-[9px] text-rose-900 uppercase">Resguardo de Concurrencia de Datos (Optimistic Locking)</span>
                    Este registro cuenta con estado de bloqueo preventivo por mutuo acuerdo [lockedBy: <strong className="text-rose-700">{audit.lockedBy}</strong>] desde las {audit.lockedAt}. Cualquier mutación de atributos gatillará la re-auditoría en la Consola de Auditoría de Sistemas Log P950000.
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-100 p-3 border-t border-slate-200 flex justify-between items-center shrink-0 font-mono text-[9.5px]">
                <span className="text-slate-500 font-bold uppercase">Auditoría P01012B por Cristian Muñoz R.</span>
                <button
                  onClick={() => setInspectTarget(null)}
                  className="bg-[#0B3C5D] hover:bg-[#144D75] text-white font-extrabold px-4 py-1 rounded-sm cursor-pointer"
                >
                  ENTENDIDO / SALIR
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* AssetFlow Enterprise Grid Context Menu */}
      {contextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          programCode={contextMenu.programCode}
          programTitle={contextMenu.programTitle}
          collectionName={
            contextMenu.entityType === 'TRANSACTION' ? 'transactions' :
            contextMenu.entityType === 'SUPPLIER' ? 'suppliers' :
            contextMenu.entityType === 'PROPERTY' ? 'properties' :
            contextMenu.entityType === 'WORK_ORDER' ? 'work_orders' :
            contextMenu.entityType === 'LEASE' ? 'lease_contracts' : 'contracts'
          }
          recordKey={contextMenu.recordKey}
          recordData={contextMenu.record}
          onExportExcel={() => handleExportXLSX()}
          onClearQBE={() => resetAllFilters()}
          items={[
            {
              id: 'select_row',
              label: 'Seleccionar / Fila Activa',
              icon: <Check size={13} className="text-[#002D62]" />,
              shortcut: 'Enter',
              onClick: () => {
                setSelectedRowId(contextMenu.record.id);
              }
            },
            {
              id: 'inspect_details',
              label: 'Consultar Detalle Completo (F980011D)',
              icon: <Eye size={13} className="text-indigo-700" />,
              shortcut: 'F4',
              onClick: () => {
                setInspectTarget({ record: contextMenu.record, entityType: contextMenu.entityType });
              }
            },
            {
              id: 'jump_module',
              label: `Ir al Módulo Principal (${
                contextMenu.entityType === 'TRANSACTION' ? 'Finanzas' :
                contextMenu.entityType === 'SUPPLIER' ? 'Proveedores' :
                contextMenu.entityType === 'PROPERTY' ? 'Propiedades' :
                contextMenu.entityType === 'WORK_ORDER' ? 'Órdenes de Trabajo' :
                contextMenu.entityType === 'LEASE' ? 'Contratos de Arriendo' : 'Contratos'
              })`,
              icon: <ExternalLink size={13} className="text-[#005B94]" />,
              onClick: () => {
                const targetMod = 
                  contextMenu.entityType === 'TRANSACTION' ? 'FINANZAS' :
                  contextMenu.entityType === 'SUPPLIER' ? 'PROVEEDORES' :
                  contextMenu.entityType === 'PROPERTY' ? 'PROPIEDADES' :
                  contextMenu.entityType === 'WORK_ORDER' ? 'ORDENES' :
                  contextMenu.entityType === 'LEASE' ? 'CONTRATOS_ARRIENDO' : 'CONTRATOS';
                setActiveModule(targetMod as ModuleType);
              }
            },
            {
              id: 'export_grid',
              label: 'Exportar Grilla a Excel (.xlsx)',
              icon: <FileSpreadsheet size={13} className="text-emerald-700" />,
              shortcut: 'Ctrl+E',
              onClick: () => {
                handleExportXLSX();
              }
            },
            {
              id: 'print_pdf',
              label: 'Imprimir Grilla / Reporte PDF',
              icon: <Printer size={13} className="text-slate-700" />,
              shortcut: 'Ctrl+P',
              onClick: () => {
                handlePrintPDF();
              }
            },
            {
              id: 'copy_key',
              label: 'Copiar Clave / Folio del Registro',
              icon: <Key size={13} className="text-slate-700" />,
              shortcut: 'Ctrl+C',
              onClick: () => {
                navigator.clipboard.writeText(contextMenu.recordKey);
              }
            },
            {
              id: 'clear_qbe',
              label: 'Limpiar Filtros QBE',
              icon: <Filter size={13} className="text-slate-600" />,
              onClick: () => {
                handleClearActiveQBE();
              }
            }
          ]}
        />
      )}

      {/* ======================================================= */}
      {/* ERP RECENT REPORTS (WSJ - P986110B) MODAL               */}
      {/* ======================================================= */}
      <JDERecentReportsModal
        isOpen={showRecentReportsModal}
        onClose={() => setShowRecentReportsModal(false)}
        currentUser={currentUser || undefined}
        transactions={transactions}
        workOrders={workOrders}
        properties={properties}
        suppliers={suppliers}
        onOpenApp={(code) => {
          if (code === 'P0911') setActiveTab('F0911_TRANS');
          if (code === 'P0411') setActiveTab('F0401_PROV');
          if (code === 'P48201') setActiveTab('F4801_OT');
          setShowRecentReportsModal(false);
        }}
      />

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

export default DueDiligenceConsultation;
