import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Supplier, SUPPLIER_CATEGORIES, SupplierComplianceRequirement } from '../types';
import { useResizableColumns } from '../lib/useResizableColumns';
import { 
  Users, Search, Plus, FileUp, Building2, ShieldCheck, 
  AlertCircle, CheckCircle2, Clock, ExternalLink, 
  ChevronRight, Trash2, FileText, X, Info, ClipboardCheck, Camera, Briefcase,
  Download, ChevronLeft, ChevronsLeft, ChevronsRight, Database,
  KeyRound, MapPin, Sliders, Landmark, Edit3, RefreshCw, Lock
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { exportToExcel } from '../lib/excelExport';
import SupplierForm from './SupplierForm';
import SupplierComplianceModule from './SupplierComplianceModule';
import { F980011DModal } from './F980011DModal';
import { GridDimensionControls } from './common/GridDimensionControls';
import { JDEGridContextMenu } from './JDEGridContextMenu';
import {
  hydrateSupplierRelationalTables,
  syncSupplierRelationalTablesToDatabase
} from '../lib/supplierMasterDatabase';

export const getDueDiligenceStatus = (s: Supplier) => {
  const ddReq = s.complianceRequirements?.find(r => r.type === 'DUE_DILIGENCE');
  
  let expiryStr = '';
  
  if (ddReq?.expiryDate) {
    expiryStr = ddReq.expiryDate;
  } else if (s.dueDiligenceDate) {
    const auditDate = new Date(s.dueDiligenceDate);
    if (!isNaN(auditDate.getTime())) {
      const expDate = new Date(auditDate);
      expDate.setFullYear(expDate.getFullYear() + 1);
      expiryStr = expDate.toISOString().split('T')[0];
    }
  }
  
  if (!expiryStr) {
    return {
      status: 'SIN_REGISTRO',
      label: 'Sin Registro',
      expiryDate: null,
      daysRemaining: null
    };
  }

  const expiry = new Date(expiryStr);
  const now = new Date();
  expiry.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return {
      status: 'VENCIDO',
      label: 'Vencido',
      expiryDate: expiryStr,
      daysRemaining: diffDays
    };
  } else if (diffDays <= 30) {
    return {
      status: 'POR_VENCER',
      label: 'Por Vencer',
      expiryDate: expiryStr,
      daysRemaining: diffDays
    };
  } else {
    return {
      status: 'VIGENTE',
      label: 'Vigente',
      expiryDate: expiryStr,
      daysRemaining: diffDays
    };
  }
};

interface SupplierDirectoryProps {
  suppliers: Supplier[];
  onSave: (data: Omit<Supplier, 'id' | 'timestamp' | 'userCreator' | 'status' | 'folio'>) => void;
  onUpdate: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
  currentUser: string;
  companyLogo: string | null;
}

type JdeTableTab = 'F0101' | 'F0116' | 'F0111' | 'F0401' | 'F0030';

const SupplierDirectory: React.FC<SupplierDirectoryProps> = ({
  suppliers,
  onSave,
  onUpdate,
  onDelete,
  currentUser,
  companyLogo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectTarget, setInspectTarget] = useState<Supplier | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('TODOS');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [view, setView] = useState<'LIST' | 'JDE_TABLES' | 'COMPLIANCE'>('LIST');
  const [activeJdeTable, setActiveJdeTable] = useState<JdeTableTab>('F0101');
  const [isSyncingTables, setIsSyncingTables] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [selectedRequirement, setSelectedRequirement] = useState<{ supplier: Supplier, requirement: SupplierComplianceRequirement } | null>(null);
  const [selectedSupplierForExpediente, setSelectedSupplierForExpediente] = useState<Supplier | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [uploadingFor, setUploadingFor] = useState<{ supplierId: string, type: string } | null>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // ERP QBE (Query By Example) state hooks for table columns
  const [colSearchFolio, setColSearchFolio] = useState('');
  const [colSearchProveedor, setColSearchProveedor] = useState('');
  const [colSearchCategoria, setColSearchCategoria] = useState('');
  const [colSearchFinanzas, setColSearchFinanzas] = useState('');
  const [colSearchCompliance, setColSearchCompliance] = useState('');
  const [colSearchEstado, setColSearchEstado] = useState('');
  const [gridContextMenu, setGridContextMenu] = useState<{ x: number; y: number; supplier: Supplier } | null>(null);

  useEffect(() => {
    const handleJdeNew = () => {
      setEditingSupplier(null);
      setIsFormOpen(true);
    };
    const handleJdeClearQbe = () => {
      setColSearchFolio('');
      setColSearchProveedor('');
      setColSearchCategoria('');
      setColSearchFinanzas('');
      setColSearchCompliance('');
      setColSearchEstado('');
      setSearchTerm('');
    };
    window.addEventListener('jde:new', handleJdeNew);
    window.addEventListener('jde:clear_qbe', handleJdeClearQbe);
    return () => {
      window.removeEventListener('jde:new', handleJdeNew);
      window.removeEventListener('jde:clear_qbe', handleJdeClearQbe);
    };
  }, []);

  const { 
    widths, 
    onMouseDown, 
    onRowMouseDown, 
    onRowDoubleClick, 
    getRowHeight, 
    defaultRowHeight, 
    setDefaultRowHeight, 
    resetWidths, 
    resetHeights, 
    resetAll 
  } = useResizableColumns({
    initialWidths: {
      folio: 125,
      proveedor: 290,
      categoria: 150,
      finanzas: 210,
      compliance: 210,
      estado: 115,
      acciones: 120
    },
    initialRowHeight: 52,
    storageKey: 'supplier_directory_v2'
  });

  // Hydrate all suppliers with the 5 JDE 9.11 relational tables
  const hydratedCatalog = useMemo(() => {
    return suppliers.map((s, idx) => hydrateSupplierRelationalTables(s, idx, suppliers));
  }, [suppliers]);

  // Ensure relational stores are populated in IndexedDB whenever suppliers change
  useEffect(() => {
    if (suppliers.length > 0) {
      syncSupplierRelationalTablesToDatabase(suppliers).catch(() => {});
    }
  }, [suppliers]);

  const handleManualSyncRelationalDB = async () => {
    setIsSyncingTables(true);
    try {
      await syncSupplierRelationalTablesToDatabase(suppliers);
      setSyncMessage(`5 Tablas JDE sincronizadas (${suppliers.length} registros AN8)`);
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setIsSyncingTables(false);
    }
  };

  const handleManualUploadClick = (supplierId: string, type: string) => {
    setUploadingFor({ supplierId, type });
    if (manualFileInputRef.current) {
      manualFileInputRef.current.click();
    }
  };

  const handleManualFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !uploadingFor || !files.length) return;

    const file = files[0];
    const reader = new FileReader();
    const fileData = await new Promise<string>((resolve, reject) => {
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.onerror = (ev) => reject(ev);
      reader.readAsDataURL(file);
    });

    const supplier = suppliers.find(s => s.id === uploadingFor.supplierId);
    if (!supplier) return;

    const newReq: SupplierComplianceRequirement = {
      id: Math.random().toString(36).substr(2, 9),
      type: uploadingFor.type as any,
      name: uploadingFor.type.replace(/_/g, ' '),
      status: 'VALID',
      documentUrl: fileData,
      documentName: file.name,
      lastUpdate: new Date().toISOString().split('T')[0],
      observations: 'Cargado desde Expediente.'
    };

    const existingReqs = supplier.complianceRequirements || [];
    const filteredReqs = existingReqs.filter(r => r.type !== uploadingFor.type);
    const updatedSupplier = {
      ...supplier,
      complianceRequirements: [...filteredReqs, newReq]
    };

    onUpdate(updatedSupplier);
    setSelectedSupplierForExpediente(updatedSupplier);
    setUploadingFor(null);
    if (manualFileInputRef.current) manualFileInputRef.current.value = '';
  };

  const filteredHydrated = useMemo(() => {
    return hydratedCatalog.filter(({ enrichedSupplier: s, f0101, f0401, f0030List }) => {
      const primaryBank = f0030List.find(b => b.isDefault) || f0030List[0];
      const matchesSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.taxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(f0101.addressNumber).includes(searchTerm) ||
        (f0101.alphaName && f0101.alphaName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'TODOS' || s.category === categoryFilter;
      const matchesStatus = statusFilter === 'TODOS' || s.status === statusFilter;
      
      // ERP QBE Column Filters
      const matchesColFolio =
        !colSearchFolio ||
        (s.folio && s.folio.toLowerCase().includes(colSearchFolio.toLowerCase())) ||
        String(f0101.addressNumber).includes(colSearchFolio) ||
        f0101.searchType.toLowerCase().includes(colSearchFolio.toLowerCase());
      const matchesColProveedor =
        !colSearchProveedor ||
        (s.name && s.name.toLowerCase().includes(colSearchProveedor.toLowerCase())) ||
        (s.taxId && s.taxId.toLowerCase().includes(colSearchProveedor.toLowerCase())) ||
        (f0101.alphaName && f0101.alphaName.toLowerCase().includes(colSearchProveedor.toLowerCase()));
      const matchesColCategoria =
        !colSearchCategoria ||
        (s.category && s.category.toLowerCase().includes(colSearchCategoria.toLowerCase())) ||
        (f0101.businessUnit && f0101.businessUnit.toLowerCase().includes(colSearchCategoria.toLowerCase()));
      const matchesColFinanzas =
        !colSearchFinanzas ||
        f0401.glClassCode.toLowerCase().includes(colSearchFinanzas.toLowerCase()) ||
        f0401.defaultExpenseAccount.toLowerCase().includes(colSearchFinanzas.toLowerCase()) ||
        (primaryBank?.bankName && primaryBank.bankName.toLowerCase().includes(colSearchFinanzas.toLowerCase())) ||
        (primaryBank?.accountNumber && primaryBank.accountNumber.toLowerCase().includes(colSearchFinanzas.toLowerCase()));
      const ddStatus = getDueDiligenceStatus(s);
      const matchesColCompliance = !colSearchCompliance || (
        (s.dueDiligenceRisk && s.dueDiligenceRisk.toLowerCase().includes(colSearchCompliance.toLowerCase())) ||
        (ddStatus.label && ddStatus.label.toLowerCase().includes(colSearchCompliance.toLowerCase())) ||
        (ddStatus.expiryDate && ddStatus.expiryDate.includes(colSearchCompliance))
      );
      const matchesColEstado = !colSearchEstado || (s.status && s.status.toLowerCase().includes(colSearchEstado.toLowerCase()));

      return matchesSearch && matchesCategory && matchesStatus &&
             matchesColFolio && matchesColProveedor && matchesColCategoria && matchesColFinanzas && matchesColCompliance && matchesColEstado;
    });
  }, [hydratedCatalog, searchTerm, categoryFilter, statusFilter, colSearchFolio, colSearchProveedor, colSearchCategoria, colSearchFinanzas, colSearchCompliance, colSearchEstado]);

  const paginatedHydrated = useMemo(() => {
    return filteredHydrated.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [filteredHydrated, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredHydrated.length / pageSize);
  }, [filteredHydrated, pageSize]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, categoryFilter, statusFilter, colSearchFolio, colSearchProveedor, colSearchCategoria, colSearchFinanzas, colSearchCompliance, colSearchEstado, view]);

  const handleExportExcel = () => {
    if (view === 'JDE_TABLES') {
      if (activeJdeTable === 'F0101') {
        const rows = filteredHydrated.map(({ f0101 }) => ({
          'AN8 (N° Libro)': f0101.addressNumber,
          'TAX (RUT)': f0101.taxId,
          'ALPH (Nombre Alfabético)': f0101.alphaName,
          'MLNM (Razón Social)': f0101.mailingName,
          'AT1 (Tipo Búsqueda)': f0101.searchType,
          'MCU (Unidad Negocio)': f0101.businessUnit,
          'SIC (Giro)': f0101.industryClassification || '',
          'ATP (CxP)': f0101.payablesFlag,
          'AC01 (Región)': f0101.catCode01 || '',
          'AC02 (Rubro)': f0101.catCode02 || '',
          'AC03 (Segmento)': f0101.catCode03 || '',
          'AC04 (Criticidad)': f0101.catCode04 || '',
          'AC05 (Riesgo UAF)': f0101.catCode05 || '',
          'USER': f0101.userId,
          'PID': f0101.programId,
          'UPMJ': f0101.updatedDate
        }));
        exportToExcel(rows, `Tabla_F0101_AddressBook_${new Date().toISOString().split('T')[0]}`, 'F0101');
        return;
      }
      if (activeJdeTable === 'F0116') {
        const rows = filteredHydrated.flatMap(({ f0116List }) =>
          f0116List.map(a => ({
            'AN8': a.addressNumber,
            'EFTB (Fecha Efectiva)': a.effectiveDate,
            'ATYPE (Tipo)': a.addressType,
            'ADD1 (Dirección)': a.addressLine1,
            'ADD2 (Complemento)': a.addressLine2 || '',
            'CTY1 (Comuna)': a.commune,
            'COUN (Ciudad)': a.city,
            'ADDS (Región)': a.region,
            'ADDZ (Código Postal)': a.postalCode || '',
            'CTR (País)': a.country,
            'Principal': a.isPrimary ? 'SÍ' : 'NO'
          }))
        );
        exportToExcel(rows, `Tabla_F0116_Direcciones_${new Date().toISOString().split('T')[0]}`, 'F0116');
        return;
      }
      if (activeJdeTable === 'F0111') {
        const rows = filteredHydrated.flatMap(({ f0111List }) =>
          f0111List.map(c => ({
            'AN8': c.addressNumber,
            'IDLN (Línea)': c.lineId,
            'TYC (Rol)': c.contactType,
            'MLNM (Nombre Contacto)': c.fullName,
            'RUT Contacto': c.contactTaxId || '',
            'ATTL (Cargo)': c.jobTitle,
            'PH1 (Teléfono)': c.phonePrimary,
            'EMAL (Correo Electrónico)': c.electronicAddress,
            'Firma Contratos': c.canSignContracts ? 'SÍ' : 'NO'
          }))
        );
        exportToExcel(rows, `Tabla_F0111_Contactos_${new Date().toISOString().split('T')[0]}`, 'F0111');
        return;
      }
      if (activeJdeTable === 'F0401') {
        const rows = filteredHydrated.map(({ f0101, f0401 }) => ({
          'AN8': f0401.addressNumber,
          'Razón Social': f0101.mailingName,
          'APC (Clase Contable AAI)': f0401.glClassCode,
          'GLBA (Cuenta Gasto)': f0401.defaultExpenseAccount,
          'TRAP (Condición Pago)': f0401.paymentTermsCode,
          'PYIN (Instrumento Pago)': f0401.paymentInstrument,
          'EXR1 (Impuesto)': f0401.taxExplanationCode,
          'Retención %': f0401.withholdingTaxPct,
          'CRRP (Moneda)': f0401.currencyCode,
          'Mínimo OC': f0401.minOrderAmount,
          'Máximo OC': f0401.maxOrderAmount,
          'HOLD (Bloqueo Pago)': f0401.holdPaymentCode,
          '3-Way Match': f0401.threeWayMatchRequired ? 'SÍ' : 'NO',
          'Factoring': f0401.factoringAllowed ? 'SÍ' : 'NO'
        }));
        exportToExcel(rows, `Tabla_F0401_MaestroCompras_${new Date().toISOString().split('T')[0]}`, 'F0401');
        return;
      }
      if (activeJdeTable === 'F0030') {
        const rows = filteredHydrated.flatMap(({ f0030List }) =>
          f0030List.map(b => ({
            'AN8': b.addressNumber,
            'BKTP (Tipo)': b.recordType,
            'TNST (Código SBIF)': b.bankCode,
            'DL01 (Banco)': b.bankName,
            'ACTP (Tipo Cuenta)': b.accountType,
            'CBNK (N° Cuenta)': b.accountNumber,
            'RUT Titular': b.holderRut,
            'Nombre Titular': b.holderName,
            'Email Remesa TEF': b.remittanceEmail,
            'PREN (Pre-Nota)': b.prenoteStatus
          }))
        );
        exportToExcel(rows, `Tabla_F0030_BancosTEF_${new Date().toISOString().split('T')[0]}`, 'F0030');
        return;
      }
    }

    const dataToExport = filteredHydrated.map(({ enrichedSupplier: s, f0101, f0401, f0030List }) => {
      const bank = f0030List[0];
      return {
        'AN8 (Libro Direcciones)': f0101.addressNumber,
        'Folio': s.folio,
        'Tipo (AT1)': f0101.searchType,
        'RUT (TAX)': s.taxId,
        'Razón Social (MLNM)': s.name,
        'Nombre Alfabético (ALPH)': f0101.alphaName,
        'Unidad Negocio (MCU)': f0101.businessUnit,
        'Categoría (AC02)': s.category,
        'Clase Contable (APC)': f0401.glClassCode,
        'Cuenta Gasto Default': f0401.defaultExpenseAccount,
        'Condición Pago (TRAP)': f0401.paymentTermsCode,
        'Código SBIF (TNST)': bank?.bankCode || '001',
        'Banco (F0030)': s.bankName,
        'Tipo Cuenta': s.accountType,
        'N° Cuenta (CBNK)': s.accountNumber,
        'Estado': s.status,
        'Riesgo Compliance': s.dueDiligenceRisk,
        'Fecha Auditoría': s.dueDiligenceDate,
        'Factura Cedida': s.isAssigned ? 'SÍ' : 'NO',
        'Entidad Factoring': s.assignedToEntity || 'N/A',
        'Creado Por': s.userCreator
      };
    });
    exportToExcel(dataToExport, `Maestro_Proveedores_JDE_${new Date().toISOString().split('T')[0]}`, 'Proveedores');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">Activo</span>;
      case 'PENDING_APPROVAL':
        return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">Pendiente VoBo</span>;
      case 'REJECTED':
        return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">Rechazado</span>;
      case 'BLOCKED':
        return <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">Bloqueado</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">{status}</span>;
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-50/50 overflow-auto">
      {/* TOOLBAR */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 md:px-6 py-3 shadow-sm z-30 shrink-0 space-y-2.5">
        {/* ROW 1: TITLE & PRIMARY ACTION BUTTONS (ALWAYS VISIBLE) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl text-slate-950 shadow-lg shadow-emerald-500/20">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black text-white uppercase tracking-tighter leading-none">
                  Maestro de Proveedores &amp; Libro de Direcciones
                </h2>
                <span className="font-mono text-[9px] font-black text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  P01012 / P04012
                </span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Arquitectura Relacional 5 Tablas (F0101 · F0116 · F0111 · F0401 · F0030) &amp; Compliance DI-01
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button 
              onClick={() => {
                setEditingSupplier(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer border border-emerald-400/40"
            >
              <Plus size={16} /> + Agregar Nuevo Proveedor (Alta 5 Tablas / DI-01)
            </button>

            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-200 hover:text-white hover:border-slate-500 transition-all shadow-sm cursor-pointer"
            >
              <FileUp size={15} className="text-emerald-400" /> Exportar Excel
            </button>
          </div>
        </div>

        {/* ROW 2: NAVIGATION TABS, FILTERS & SEARCH */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setView('LIST')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${view === 'LIST' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                1. Libro de Direcciones &amp; Maestro (P01012)
              </button>
              <button 
                onClick={() => setView('JDE_TABLES')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${view === 'JDE_TABLES' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Database size={12} /> 2. Base de Datos 5 Tablas
              </button>
              <button 
                onClick={() => setView('COMPLIANCE')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${view === 'COMPLIANCE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                3. Cumplimiento DI-01
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {['TODOS', 'ACTIVE', 'PENDING_APPROVAL', 'REJECTED'].map(status => (
                <button 
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${statusFilter === status ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {status === 'ACTIVE' ? 'Activos' : status === 'PENDING_APPROVAL' ? 'Pendientes' : status === 'REJECTED' ? 'Rechazados' : 'Todos'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {view === 'LIST' && (
              <GridDimensionControls
                defaultRowHeight={defaultRowHeight}
                onSetRowHeight={setDefaultRowHeight}
                onResetColumns={resetWidths}
                onResetRows={resetHeights}
                onResetAll={resetAll}
              />
            )}

            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar AN8, RUT o Razón Social..." 
                className="bg-slate-900 border border-slate-800 rounded-xl px-9 py-1.5 text-[10px] font-bold uppercase w-60 outline-none focus:border-emerald-500 text-white transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search size={14} className="absolute left-3 top-2 text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 min-h-0">
        {view === 'COMPLIANCE' ? (
          <SupplierComplianceModule 
            suppliers={suppliers} 
            onUpdateSupplier={onUpdate} 
            onAddSupplier={onSave}
            currentUser={currentUser} 
          />
        ) : view === 'JDE_TABLES' ? (
          /* ================================================================= */
          /* EXPLORADOR DE BASE DE DATOS RELACIONAL — 5 TABLAS JDE 9.11        */
          /* ================================================================= */
          <div className="max-w-7xl mx-auto space-y-5">
            {/* BANNER DE ARQUITECTURA RELACIONAL */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md font-mono text-[10px] font-black">
                    RELATIONAL SCHEMA 9.11
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-tight">
                    Explorador de Tablas Maestras de Proveedores (Clave Primaria Relacional: AN8)
                  </h3>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Cada proveedor registrado se descompone y persiste automáticamente en 5 tablas normalizadas en IndexedDB y Firestore Cloud.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {syncMessage && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> {syncMessage}
                  </span>
                )}
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setIsFormOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  <Plus size={14} /> + Agregar Nuevo Proveedor
                </button>
                <button
                  onClick={handleManualSyncRelationalDB}
                  disabled={isSyncingTables}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <RefreshCw size={14} className={isSyncingTables ? 'animate-spin' : ''} />
                  Sincronizar 5 Tablas en BD
                </button>
              </div>
            </div>

            {/* SELECTOR DE LAS 5 TABLAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                {
                  id: 'F0101' as JdeTableTab,
                  code: 'F0101',
                  title: 'Address Book Master',
                  subtitle: 'Identidad Fiscal & Cat Codes',
                  count: filteredHydrated.length,
                  icon: <KeyRound size={16} />
                },
                {
                  id: 'F0116' as JdeTableTab,
                  code: 'F0116',
                  title: 'Address by Date',
                  subtitle: 'Domicilios por Vigencia EFTB',
                  count: filteredHydrated.reduce((acc, h) => acc + h.f0116List.length, 0),
                  icon: <MapPin size={16} />
                },
                {
                  id: 'F0111' as JdeTableTab,
                  code: 'F0111 / F01151',
                  title: "Who's Who Contacts",
                  subtitle: 'Rep. Legal, Cobranza & DTE',
                  count: filteredHydrated.reduce((acc, h) => acc + h.f0111List.length, 0),
                  icon: <Users size={16} />
                },
                {
                  id: 'F0401' as JdeTableTab,
                  code: 'F0401',
                  title: 'Supplier Master',
                  subtitle: 'Reglas Compras, AAI & Impuestos',
                  count: filteredHydrated.length,
                  icon: <Sliders size={16} />
                },
                {
                  id: 'F0030' as JdeTableTab,
                  code: 'F0030',
                  title: 'Bank Transit Master',
                  subtitle: 'Cuentas TEF, SBIF & Pre-Nota',
                  count: filteredHydrated.reduce((acc, h) => acc + h.f0030List.length, 0),
                  icon: <Landmark size={16} />
                }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveJdeTable(t.id)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    activeJdeTable === t.id
                      ? 'bg-slate-900 text-white border-emerald-500 shadow-lg'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                      activeJdeTable === t.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {t.code}
                    </span>
                    <span className="font-mono text-xs font-black">{t.count} reg.</span>
                  </div>
                  <p className="text-xs font-black uppercase tracking-tight">{t.title}</p>
                  <p className={`text-[10px] mt-0.5 ${activeJdeTable === t.id ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.subtitle}
                  </p>
                </button>
              ))}
            </div>

            {/* GRILLA DE LA TABLA ACTIVA */}
            <div className="pro-card overflow-x-auto">
              {activeJdeTable === 'F0101' && (
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-mono uppercase">
                      <th className="px-4 py-3">AN8 (PK)</th>
                      <th className="px-4 py-3">TAX (RUT)</th>
                      <th className="px-4 py-3">ALPH (Nombre Alfabético)</th>
                      <th className="px-4 py-3">MLNM (Razón Social)</th>
                      <th className="px-4 py-3">AT1 (Tipo)</th>
                      <th className="px-4 py-3">MCU (Unidad Negocio)</th>
                      <th className="px-4 py-3">AC01..AC05 (Cat Codes)</th>
                      <th className="px-4 py-3">ATP (CxP)</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredHydrated.map(({ enrichedSupplier, f0101 }) => (
                      <tr key={f0101.id} className="hover:bg-slate-50 font-mono">
                        <td className="px-4 py-3 font-black text-emerald-700">#{f0101.addressNumber}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{f0101.taxId}</td>
                        <td className="px-4 py-3 font-sans font-black text-slate-800 text-[11px]">{f0101.alphaName}</td>
                        <td className="px-4 py-3 font-sans font-bold text-slate-600 text-[11px]">{f0101.mailingName}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-black text-[10px]">
                            {f0101.searchType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] font-bold text-slate-700">{f0101.businessUnit}</td>
                        <td className="px-4 py-3 text-[10px] text-slate-600">
                          {f0101.catCode01} · {f0101.catCode03} · {f0101.catCode05}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                            f0101.payablesFlag === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {f0101.payablesFlag}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setEditingSupplier(enrichedSupplier);
                              setIsFormOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-[10px] font-sans font-black uppercase transition-all cursor-pointer"
                          >
                            Editar F0101
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeJdeTable === 'F0116' && (
                <table className="w-full text-left border-collapse min-w-[1050px]">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-mono uppercase">
                      <th className="px-4 py-3">AN8 (FK)</th>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3">EFTB (Fecha Efectiva)</th>
                      <th className="px-4 py-3">ATYPE (Tipo Domicilio)</th>
                      <th className="px-4 py-3">ADD1 (Calle y Número)</th>
                      <th className="px-4 py-3">CTY1 (Comuna)</th>
                      <th className="px-4 py-3">ADDS (Región)</th>
                      <th className="px-4 py-3">Principal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredHydrated.flatMap(({ enrichedSupplier, f0116List }) =>
                      f0116List.map((addr) => (
                        <tr key={addr.id} className="hover:bg-slate-50 font-mono">
                          <td className="px-4 py-3 font-black text-emerald-700">#{addr.addressNumber}</td>
                          <td className="px-4 py-3 font-sans font-bold text-slate-800 text-[11px]">{enrichedSupplier.name}</td>
                          <td className="px-4 py-3 text-slate-700">{addr.effectiveDate}</td>
                          <td className="px-4 py-3 text-[10px] font-bold text-indigo-700">{addr.addressType}</td>
                          <td className="px-4 py-3 font-sans font-bold text-slate-900 text-[11px]">{addr.addressLine1}</td>
                          <td className="px-4 py-3 font-sans text-slate-700 text-[11px]">{addr.commune}</td>
                          <td className="px-4 py-3 text-slate-700">{addr.region}</td>
                          <td className="px-4 py-3">
                            {addr.isPrimary ? (
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-black">PRIMARIO</span>
                            ) : (
                              <span className="text-slate-400 text-[9px]">SECUNDARIO</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeJdeTable === 'F0111' && (
                <table className="w-full text-left border-collapse min-w-[1050px]">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-mono uppercase">
                      <th className="px-4 py-3">AN8 (FK)</th>
                      <th className="px-4 py-3">IDLN</th>
                      <th className="px-4 py-3">TYC (Rol Contacto)</th>
                      <th className="px-4 py-3">MLNM (Nombre Completo)</th>
                      <th className="px-4 py-3">ATTL (Cargo)</th>
                      <th className="px-4 py-3">PH1 (Teléfono)</th>
                      <th className="px-4 py-3">EMAL (Correo F01151)</th>
                      <th className="px-4 py-3">Poder Firma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredHydrated.flatMap(({ f0111List }) =>
                      f0111List.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 font-mono">
                          <td className="px-4 py-3 font-black text-emerald-700">#{c.addressNumber}</td>
                          <td className="px-4 py-3 text-slate-500">{c.lineId}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-black">
                              {c.contactType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-sans font-black text-slate-900 text-[11px]">{c.fullName}</td>
                          <td className="px-4 py-3 font-sans text-slate-600 text-[10.5px]">{c.jobTitle}</td>
                          <td className="px-4 py-3 text-slate-800">{c.phonePrimary}</td>
                          <td className="px-4 py-3 text-emerald-700 font-bold">{c.electronicAddress}</td>
                          <td className="px-4 py-3">
                            {c.canSignContracts ? (
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-black">AUTORIZADO</span>
                            ) : (
                              <span className="text-slate-400 text-[9px]">NO</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeJdeTable === 'F0401' && (
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-mono uppercase">
                      <th className="px-4 py-3">AN8 (PK)</th>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3">APC (Clase AAI)</th>
                      <th className="px-4 py-3">GLBA (Cta Gasto)</th>
                      <th className="px-4 py-3">TRAP (Condición Pago)</th>
                      <th className="px-4 py-3">PYIN (Vía)</th>
                      <th className="px-4 py-3">EXR1 (Impuesto)</th>
                      <th className="px-4 py-3">Límite OC (CLP)</th>
                      <th className="px-4 py-3">3-Way Match</th>
                      <th className="px-4 py-3">HOLD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredHydrated.map(({ enrichedSupplier, f0401 }) => (
                      <tr key={f0401.id} className="hover:bg-slate-50 font-mono">
                        <td className="px-4 py-3 font-black text-emerald-700">#{f0401.addressNumber}</td>
                        <td className="px-4 py-3 font-sans font-bold text-slate-900 text-[11px]">{enrichedSupplier.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded font-black text-[10px]">
                            {f0401.glClassCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{f0401.defaultExpenseAccount}</td>
                        <td className="px-4 py-3 font-sans text-[10.5px] font-bold text-slate-700">{f0401.paymentTermsCode}</td>
                        <td className="px-4 py-3 text-slate-700">{f0401.paymentInstrument}</td>
                        <td className="px-4 py-3 text-slate-800">
                          {f0401.taxExplanationCode} {f0401.withholdingTaxPct > 0 ? `(${f0401.withholdingTaxPct}%)` : ''}
                        </td>
                        <td className="px-4 py-3 text-slate-800">${f0401.maxOrderAmount.toLocaleString('es-CL')}</td>
                        <td className="px-4 py-3">
                          {f0401.threeWayMatchRequired ? (
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-black">ACTIVO</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px]">NO</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-black ${
                            f0401.holdPaymentCode === '00' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {f0401.holdPaymentCode}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeJdeTable === 'F0030' && (
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-mono uppercase">
                      <th className="px-4 py-3">AN8 (FK)</th>
                      <th className="px-4 py-3">BKTP</th>
                      <th className="px-4 py-3">TNST (SBIF)</th>
                      <th className="px-4 py-3">DL01 (Banco)</th>
                      <th className="px-4 py-3">ACTP (Tipo Cuenta)</th>
                      <th className="px-4 py-3">CBNK (N° Cuenta)</th>
                      <th className="px-4 py-3">RUT Titular</th>
                      <th className="px-4 py-3">Titular Cuenta</th>
                      <th className="px-4 py-3">PREN (Pre-Nota)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredHydrated.flatMap(({ f0030List }) =>
                      f0030List.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 font-mono">
                          <td className="px-4 py-3 font-black text-emerald-700">#{b.addressNumber}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-black ${
                              b.recordType === 'F' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {b.recordType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-600">{b.bankCode}</td>
                          <td className="px-4 py-3 font-sans font-black text-slate-900 text-[11px]">{b.bankName}</td>
                          <td className="px-4 py-3 font-sans text-slate-700 text-[10.5px]">{b.accountType}</td>
                          <td className="px-4 py-3 font-black text-slate-900">{b.accountNumber}</td>
                          <td className="px-4 py-3 text-slate-700">{b.holderRut}</td>
                          <td className="px-4 py-3 font-sans text-[10.5px] font-bold text-slate-800">{b.holderName}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-black ${
                              b.prenoteStatus === 'A' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {b.prenoteStatus === 'A' ? 'A · VERIFICADA' : b.prenoteStatus === 'P' ? 'P · PRE-NOTA' : 'B · BLOQUEADA'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* VISTA PRINCIPAL: MAESTRO DE PROVEEDORES (P04012 / P01012)         */
          /* ================================================================= */
          <div className="max-w-7xl mx-auto space-y-4">
            {/* ACTION & KPI BANNER ABOVE THE TABLE */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    Libro de Direcciones (F0101) &amp; Maestro de Proveedores (F0401)
                  </h3>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                    Mostrando {filteredHydrated.length} de {suppliers.length} proveedores registrados en las 5 tablas relacionales
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-4">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black uppercase">
                    Activos: {suppliers.filter(s => s.status === 'ACTIVE').length}
                  </span>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase">
                    Pendientes VoBo: {suppliers.filter(s => s.status === 'PENDING_APPROVAL').length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setIsFormOpen(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Plus size={16} /> + Agregar Nuevo Proveedor
                </button>
                <button
                  onClick={() => setView('JDE_TABLES')}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Database size={14} className="text-emerald-400" /> Ver 5 Tablas JDE
                </button>
              </div>
            </div>

            <div className="pro-card overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[1180px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th style={{ width: widths.folio }} className="relative px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      AN8 / Folio
                      <div onMouseDown={(e) => onMouseDown(e, 'folio')} className="resizer" />
                    </th>
                    <th style={{ width: widths.proveedor }} className="relative px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Proveedor (F0101 MLNM / TAX)
                      <div onMouseDown={(e) => onMouseDown(e, 'proveedor')} className="resizer" />
                    </th>
                    <th style={{ width: widths.categoria }} className="relative px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Rubro &amp; MCU
                      <div onMouseDown={(e) => onMouseDown(e, 'categoria')} className="resizer" />
                    </th>
                    <th style={{ width: widths.finanzas }} className="relative px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      CxP (F0401) &amp; Banco (F0030)
                      <div onMouseDown={(e) => onMouseDown(e, 'finanzas')} className="resizer" />
                    </th>
                    <th style={{ width: widths.compliance }} className="relative px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Compliance DI-01
                      <div onMouseDown={(e) => onMouseDown(e, 'compliance')} className="resizer" />
                    </th>
                    <th style={{ width: widths.estado }} className="relative px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Estado
                      <div onMouseDown={(e) => onMouseDown(e, 'estado')} className="resizer" />
                    </th>
                    <th style={{ width: widths.acciones }} className="relative px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Acciones
                      <div onMouseDown={(e) => onMouseDown(e, 'acciones')} className="resizer" />
                    </th>
                  </tr>
                  {/* ERP QBE (Query By Example) Row */}
                  <tr className="bg-slate-100/50 border-b border-slate-100 font-sans">
                    <td className="px-4 py-2 border-b border-slate-100">
                      <input 
                        type="text" 
                        value={colSearchFolio}
                        onChange={(e) => setColSearchFolio(e.target.value)}
                        placeholder="AN8 / Folio..." 
                        className="w-full px-2 py-1 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded uppercase font-bold outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2 border-b border-slate-100">
                      <input 
                        type="text" 
                        value={colSearchProveedor}
                        onChange={(e) => setColSearchProveedor(e.target.value)}
                        placeholder="Razón Social / RUT..." 
                        className="w-full px-2 py-1 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded uppercase font-bold outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2 border-b border-slate-100">
                      <input 
                        type="text" 
                        value={colSearchCategoria}
                        onChange={(e) => setColSearchCategoria(e.target.value)}
                        placeholder="Rubro / MCU..." 
                        className="w-full px-2 py-1 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded uppercase font-bold outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2 border-b border-slate-100">
                      <input 
                        type="text" 
                        value={colSearchFinanzas}
                        onChange={(e) => setColSearchFinanzas(e.target.value)}
                        placeholder="AAI / Banco / Cta..." 
                        className="w-full px-2 py-1 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded uppercase font-bold outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2 border-b border-slate-100">
                      <input 
                        type="text" 
                        value={colSearchCompliance}
                        onChange={(e) => setColSearchCompliance(e.target.value)}
                        placeholder="Riesgo / Vigencia..." 
                        className="w-full px-2 py-1 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded uppercase font-bold outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2 border-b border-slate-100">
                      <input 
                        type="text" 
                        value={colSearchEstado}
                        onChange={(e) => setColSearchEstado(e.target.value)}
                        placeholder="Estado..." 
                        className="w-full px-2 py-1 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded uppercase font-bold outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2 border-b border-slate-100 text-center">
                      <span className="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest bg-emerald-500/5 px-1.5 py-0.5 rounded" title="QBE: Query By Example">QBE</span>
                    </td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHydrated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-20">
                          <Users size={48} />
                          <p className="text-xs font-black uppercase tracking-widest">No se encontraron proveedores</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedHydrated.map(({ enrichedSupplier: s, f0101, f0401, f0030List }) => {
                      const primaryBank = f0030List.find(b => b.isDefault) || f0030List[0];
                      return (
                        <tr 
                          key={s.id} 
                          style={{ height: `${getRowHeight(s.id)}px` }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setInspectTarget(s);
                          }}
                          onClick={() => setSelectedSupplierForExpediente(s)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setGridContextMenu({ x: e.clientX, y: e.clientY, supplier: s });
                          }}
                          className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                          title="Doble clic para Consultar Atributos F980011D. Un clic para Ver Expediente 360°"
                        >
                          <td className="relative px-5 py-3">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-mono font-black text-emerald-700">
                                AN8 #{f0101.addressNumber}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-mono font-bold text-slate-400">{s.folio}</span>
                                <span className="text-[8px] font-mono font-black px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded">
                                  {f0101.searchType}
                                </span>
                              </div>
                            </div>
                            <div
                              onMouseDown={(e) => onRowMouseDown(e, s.id)}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                onRowDoubleClick(s.id);
                              }}
                              className="row-resizer"
                            />
                          </td>

                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all shrink-0">
                                <Building2 size={18} />
                              </div>
                              <div className="truncate">
                                <div className="flex items-center gap-2">
                                  <p className="text-[11px] font-black text-slate-900 uppercase leading-none truncate">{s.name}</p>
                                  {s.isAssigned && (
                                    <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter">
                                      Factoring
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] font-mono font-bold text-slate-500 mt-1 uppercase">
                                  RUT: {s.taxId} · <span className="text-slate-400">{f0101.alphaName}</span>
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-700 uppercase truncate">{s.category}</span>
                              <span className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">
                                MCU: {f0101.businessUnit}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-3">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono font-black px-1.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded">
                                  {f0401.glClassCode}
                                </span>
                                <span className="text-[9.5px] font-mono font-bold text-slate-700">
                                  Cta: {f0401.defaultExpenseAccount}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-500 mt-1 truncate">
                                [{primaryBank?.bankCode || '001'}] {primaryBank?.bankName || s.bankName} · #{primaryBank?.accountNumber || s.accountNumber}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-3">
                            <div className="flex flex-col gap-1">
                              {(() => {
                                const dd = getDueDiligenceStatus(s);
                                let badgeColor = "bg-slate-100 text-slate-700 border-slate-200/60";
                                let icon = <Info size={10} className="text-slate-400" />;
                                
                                if (dd.status === 'VIGENTE') {
                                  badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
                                  icon = <CheckCircle2 size={10} className="text-emerald-600" />;
                                } else if (dd.status === 'POR_VENCER') {
                                  badgeColor = "bg-amber-50 text-amber-700 border-amber-200/60";
                                  icon = <Clock size={10} className="text-amber-600" />;
                                } else if (dd.status === 'VENCIDO') {
                                  badgeColor = "bg-rose-50 text-rose-700 border-rose-200/60";
                                  icon = <AlertCircle size={10} className="text-rose-600" />;
                                }

                                return (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${badgeColor}`}>
                                        {icon}
                                        {dd.label}
                                      </span>
                                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                        s.dueDiligenceRisk === 'RIESGO BAJO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        s.dueDiligenceRisk === 'RIESGO MEDIO' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        'bg-rose-50 text-rose-600 border-rose-100'
                                      }`}>
                                        {s.dueDiligenceRisk || 'BAJO'}
                                      </span>
                                    </div>
                                    {dd.expiryDate && (
                                      <span className="text-[8.5px] font-mono font-bold text-slate-400 uppercase">
                                        Vence: {dd.expiryDate}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>

                          <td className="px-5 py-3">
                            {getStatusBadge(s.status)}
                          </td>

                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSupplier(s);
                                  setIsFormOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                title="Editar Maestro (5 Tablas JDE)"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectTarget(s);
                                }}
                                className="p-1.5 text-slate-400 hover:text-[#0B3C5D] hover:bg-amber-100 rounded-lg transition-all cursor-pointer"
                                title="F980011D: Consultar Maestro de Atributos"
                              >
                                <Database size={15} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(s.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Eliminar Proveedor"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination bar for Suppliers */}
            <div className="bg-[#DCE7F2] border-t border-[#6B8095]/40 px-3 py-1.5 flex flex-col md:flex-row items-center justify-between font-mono text-[10px] text-slate-800 select-none gap-2 rounded-b-[16px] no-print">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-[#1C4E75] uppercase">Cuadrícula Registros (F0101 / F0401):</span>
                <span className="bg-white border border-[#A2BCCF] px-2 py-0.5 font-bold">
                  {filteredHydrated.length === 0 ? 0 : currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, filteredHydrated.length)} de {filteredHydrated.length}
                </span>
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
                </select>

                <div className="flex items-center gap-1 ml-0 md:ml-4 border-l border-[#A2BCCF] pl-3">
                  <button
                    onClick={() => setCurrentPage(0)}
                    disabled={currentPage === 0}
                    className={`p-1 border rounded-xs ${
                      currentPage === 0 
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                        : 'bg-white text-slate-800 border-[#A2BCCF] hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <ChevronsLeft size={11} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className={`p-1 border rounded-xs ${
                      currentPage === 0 
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                        : 'bg-white text-slate-800 border-[#A2BCCF] hover:bg-slate-50 cursor-pointer'
                    }`}
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
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                        : 'bg-white text-slate-800 border-[#A2BCCF] hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <ChevronRight size={11} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages - 1)}
                    disabled={currentPage >= totalPages - 1}
                    className={`p-1 border rounded-xs ${
                      currentPage >= totalPages - 1 
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                        : 'bg-white text-slate-800 border-[#A2BCCF] hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <ChevronsRight size={11} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FORMULARIO CREACIÓN / EDICIÓN 5 TABLAS JDE 9.11 */}
      {isFormOpen && (
        <SupplierForm 
          onClose={() => {
            setIsFormOpen(false);
            setEditingSupplier(null);
          }}
          initialSupplier={editingSupplier}
          onSave={(data) => {
            onSave(data);
            setIsFormOpen(false);
            setEditingSupplier(null);
          }}
          onUpdate={(updatedSupplier) => {
            onUpdate(updatedSupplier);
            setIsFormOpen(false);
            setEditingSupplier(null);
          }}
          currentUser={currentUser}
          companyLogo={companyLogo}
          nextFolio={`PROV-${String(suppliers.length + 1).padStart(4, '0')}`}
          existingSuppliers={suppliers}
        />
      )}

      {/* EXPEDIENTE 360° MODAL (CON LAS 5 TABLAS RELACIONALES + DOCUMENTOS) */}
      {selectedSupplierForExpediente && (() => {
        const hydrated = hydrateSupplierRelationalTables(selectedSupplierForExpediente, 0, suppliers);
        const { f0101, f0116List, f0111List, f0401, f0030List } = hydrated;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 md:p-8 animate-in fade-in">
            <div className="bg-[#f8fafc] w-full max-w-6xl h-full rounded-[32px] shadow-2xl overflow-hidden flex flex-col border-4 border-slate-900">
              <div className="bg-slate-950 text-white p-6 flex flex-wrap justify-between items-center gap-4 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-950 font-black">
                    <Building2 size={30} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-black px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md">
                        AN8 #{f0101.addressNumber}
                      </span>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">
                        {selectedSupplierForExpediente.name}
                      </h3>
                      {getStatusBadge(selectedSupplierForExpediente.status)}
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 uppercase mt-1">
                      RUT: {selectedSupplierForExpediente.taxId} · FOLIO: {selectedSupplierForExpediente.folio} · TIPO AT1: {f0101.searchType} · MCU: {f0101.businessUnit}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {selectedSupplierForExpediente.status !== 'ACTIVE' && (
                    <button
                      onClick={() => {
                        const approved: Supplier = { ...selectedSupplierForExpediente, status: 'ACTIVE' };
                        onUpdate(approved);
                        setSelectedSupplierForExpediente(approved);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Aprobar Alta Maestro
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const target = selectedSupplierForExpediente;
                      setSelectedSupplierForExpediente(null);
                      setEditingSupplier(target);
                      setIsFormOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    <Edit3 size={14} className="text-emerald-400" /> Editar 5 Tablas
                  </button>
                  <button 
                    onClick={() => setSelectedSupplierForExpediente(null)}
                    className="p-2.5 hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-auto flex-1 custom-audit-scroll">
                {/* COLUMNA IZQUIERDA: RESUMEN DE LAS 5 TABLAS JDE 9.11 */}
                <div className="space-y-5">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                      <KeyRound size={14} /> 1. Tabla F0101 · Address Book Master
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Nombre Alfabético (ALPH)</span>
                        <span className="font-black text-slate-800">{f0101.alphaName}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Giro Comercial (SIC)</span>
                        <span className="font-bold text-slate-700">{f0101.industryClassification || sCategory(selectedSupplierForExpediente)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Cat Codes (AC01 / AC03 / AC04)</span>
                        <span className="font-mono font-bold text-slate-700">{f0101.catCode01} · {f0101.catCode03} · {f0101.catCode04}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Indicador CxP (ATP)</span>
                        <span className="font-mono font-black text-emerald-700">{f0101.payablesFlag}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                      <Sliders size={14} /> 2. Tabla F0401 · Parámetros Compras &amp; CxP
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Clase Contable (APC) &amp; Cuenta</span>
                        <span className="font-mono font-black text-slate-900">{f0401.glClassCode} · Cta {f0401.defaultExpenseAccount}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Condición Pago (TRAP)</span>
                        <span className="font-bold text-slate-800">{f0401.paymentTermsCode}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Impuesto (EXR1) / Moneda</span>
                        <span className="font-mono font-bold text-slate-700">{f0401.taxExplanationCode} ({f0401.currencyCode})</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Cotejo 3 Vías / Límite OC</span>
                        <span className="font-mono font-bold text-slate-700">
                          {f0401.threeWayMatchRequired ? '3-Way Match' : 'Estándar'} · Máx ${f0401.maxOrderAmount.toLocaleString('es-CL')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <h4 className="text-[10px] font-black text-sky-700 uppercase tracking-widest flex items-center gap-2">
                      <Landmark size={14} /> 3. Tabla F0030 · Cuentas Bancarias TEF ({f0030List.length})
                    </h4>
                    {f0030List.map((b) => (
                      <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-black text-slate-900">[{b.bankCode}] {b.bankName} · {b.accountType}</p>
                          <p className="font-mono text-[10px] text-slate-600 mt-0.5">
                            N° {b.accountNumber} · Titular: {b.holderRut} ({b.holderName})
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[9px] font-black">
                          PREN: {b.prenoteStatus}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={14} /> 4. Tablas F0116 (Domicilios) &amp; F0111 (Contactos)
                    </h4>
                    <div className="space-y-2 text-xs">
                      {f0116List.map((a) => (
                        <div key={a.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="font-mono text-[9px] font-black text-indigo-700">{a.addressType} (EFTB {a.effectiveDate}): </span>
                          <span className="font-bold text-slate-800">{a.addressLine1}, {a.commune} ({a.region})</span>
                        </div>
                      ))}
                      {f0111List.map((c) => (
                        <div key={c.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="font-mono text-[9px] font-black text-emerald-700">{c.contactType}: </span>
                          <span className="font-bold text-slate-800">{c.fullName} · {c.phonePrimary} · {c.electronicAddress}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA: LEGAJO DOCUMENTAL DE CUMPLIMIENTO DI-01 */}
                <div className="space-y-6">
                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-indigo-600" /> Documentos de Cumplimiento &amp; Respaldo DI-01
                    </h4>
                    <div className="space-y-3">
                      {[
                        { type: 'CONFLICT_INTEREST_THIRD', label: 'Decl. Conflicto Terceros', icon: Users },
                        { type: 'CONFLICT_INTEREST_EXEC', label: 'Decl. Conflicto Ejecutivo', icon: CheckCircle2 },
                        { type: 'UBO_DECLARATION', label: 'Decl. Beneficiarios Finales (UAF)', icon: Briefcase },
                        { type: 'TAX_CERTIFICATE', label: 'Carpeta Tributaria SII', icon: FileText },
                        { type: 'DUE_DILIGENCE', label: 'Certificado Debida Diligencia', icon: ShieldCheck },
                        { type: 'LEGAL_REPRESENTATIVE', label: 'Personería / Poderes Rep. Legal', icon: Building2 },
                        { type: 'ASSIGNMENT_CERTIFICATE', label: 'Contrato / Cert. Factoring', icon: ExternalLink },
                        { type: 'WORK_REPORT', label: 'Informe Técnico Tipo', icon: ClipboardCheck },
                        { type: 'PHOTO_SET', label: 'Set Fotográfico Georreferenciado', icon: Camera },
                      ].map(rt => {
                        const req = selectedSupplierForExpediente.complianceRequirements?.find(r => r.type === rt.type);
                        return (
                          <div key={rt.type} className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${req?.status === 'VALID' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                <rt.icon size={15} />
                              </div>
                              <span className="text-[10px] font-black uppercase text-slate-700">{rt.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {req ? (
                                <>
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    req.status === 'VALID' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                  }`}>
                                    {req.status}
                                  </span>
                                  <button 
                                    onClick={() => {
                                      setSelectedRequirement({ supplier: selectedSupplierForExpediente, requirement: req });
                                      setSelectedSupplierForExpediente(null);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all border border-indigo-100 cursor-pointer"
                                  >
                                    <span className="text-[8px] font-black uppercase">Ver</span>
                                    <ExternalLink size={11} />
                                  </button>
                                  <button 
                                    onClick={() => handleManualUploadClick(selectedSupplierForExpediente.id, rt.type)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                    title="Actualizar Documento"
                                  >
                                    <FileUp size={14} />
                                  </button>
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                                    PENDIENTE
                                  </span>
                                  <button 
                                    onClick={() => handleManualUploadClick(selectedSupplierForExpediente.id, rt.type)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all border border-emerald-200 cursor-pointer"
                                  >
                                    <Plus size={12} />
                                    <span className="text-[8px] font-black uppercase">Subir</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </div>

              <div className="p-5 bg-slate-100 border-t border-slate-200 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedSupplierForExpediente(null)}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all cursor-pointer"
                >
                  Cerrar Expediente
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DOCUMENT VIEWER MODAL */}
      <input 
        type="file"
        ref={manualFileInputRef}
        className="hidden"
        onChange={handleManualFileChange}
        accept=".pdf,.jpg,.jpeg,.png"
      />
      {selectedRequirement && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-8 animate-in fade-in">
          <div className="bg-white w-full max-w-6xl h-full rounded-[40px] shadow-2xl overflow-hidden flex flex-col border-[6px] border-indigo-600 scale-in-center">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter leading-none">
                    {selectedRequirement.requirement.name}
                  </h3>
                  <p className="text-[10px] font-bold text-indigo-200 uppercase mt-1 tracking-widest">
                    Proveedor: {selectedRequirement.supplier.name} • {selectedRequirement.supplier.taxId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedRequirement.requirement.documentUrl && (
                  <a 
                    href={selectedRequirement.requirement.documentUrl} 
                    download={selectedRequirement.requirement.documentName || 'documento'}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-all text-[10px] font-black uppercase tracking-widest"
                  >
                    <Download size={16} />
                    Descargar Original
                  </a>
                )}
                <button 
                  onClick={() => {
                    setSelectedRequirement(null);
                    setNumPages(null);
                    setPageNumber(1);
                  }}
                  className="p-3 hover:bg-white/20 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 bg-slate-100 p-8 overflow-auto flex justify-center">
                <div className="bg-white shadow-2xl w-full max-w-4xl min-h-full rounded-xl overflow-hidden border border-slate-200 flex flex-col items-center">
                  {selectedRequirement.requirement.documentUrl ? (
                    selectedRequirement.requirement.documentUrl.startsWith('data:application/pdf') ? (
                      <div className="w-full flex flex-col items-center bg-slate-200 p-4 min-h-full">
                        <Document
                          file={selectedRequirement.requirement.documentUrl}
                          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        >
                          <Page 
                            pageNumber={pageNumber} 
                            width={800}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="shadow-xl"
                          />
                        </Document>
                      </div>
                    ) : (
                      <img 
                        src={selectedRequirement.requirement.documentUrl} 
                        className="w-full h-auto" 
                        alt="Document Preview"
                        referrerPolicy="no-referrer"
                      />
                    )
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                      <FileText size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-widest">Vista previa no disponible</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {inspectTarget && (
        <F980011DModal
          isOpen={!!inspectTarget}
          onClose={() => setInspectTarget(null)}
          registryId={inspectTarget.id || ''}
          entityType="SUPPLIER"
          originalData={inspectTarget}
          currentUser={currentUser}
        />
      )}

      {/* ERP CONTEXT MENU */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={!!gridContextMenu}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P04012"
          programTitle="Directorio Maestro de Proveedores"
          collectionName="suppliers"
          recordId={gridContextMenu.supplier.id}
          recordFolio={gridContextMenu.supplier.folio || gridContextMenu.supplier.taxId}
          onClose={() => setGridContextMenu(null)}
          onViewDetail={() => {
            setSelectedSupplierForExpediente(gridContextMenu.supplier);
            setGridContextMenu(null);
          }}
          onExportExcel={() => {
            handleExportExcel();
            setGridContextMenu(null);
          }}
          onSetRowHeight={setDefaultRowHeight}
          onResetColumns={resetWidths}
          onResetRows={resetHeights}
          onResetGridDimensions={resetAll}
        />
      )}
    </div>
  );
};

function sCategory(s: Supplier) {
  return s.category || 'SERVICIOS GENERALES';
}

export default SupplierDirectory;
