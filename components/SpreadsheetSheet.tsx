
import React, { useState, useMemo, useRef } from 'react';
import { Transaction, InsuranceCompany, ComplianceChecklist, Supplier, WorkOrder, Property, USER_CREDENTIALS, ReversalRequest } from '../types';
import { useResizableColumns } from '../lib/useResizableColumns';
import { Edit2, Trash2, FileText, Printer, Lock, ShieldCheck, AlertTriangle, FileSignature, X, CheckCircle2, Plus, FileUp, Brain, Loader2, BarChart3, PieChart as PieChartIcon, Filter, Sparkles, Activity, ClipboardCheck, UserPlus, Check, Info, Layout, Download, Layers, Database, Search, CheckCircle, Mail, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import NewIndicator from './NewIndicator';
import TransactionForm from './TransactionForm';
import ComplianceChecklistModal from './ComplianceChecklistModal';
import { exportToExcel } from '../lib/excelExport';
import { extractTransactionDataFromDocument } from '../geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, LabelList } from 'recharts';
import { JDEContextualMenu } from './JDEContextualMenu';
import { downloadJDETransactionVoucher } from '../lib/pdfGenerator';
import { dataService } from '../lib/data-service';
import { printHtmlElement } from '../lib/printDocument';
import { GridDimensionControls } from './common/GridDimensionControls';

interface SpreadsheetSheetProps {
  data: Transaction[];
  suppliers?: Supplier[];
  title: string;
  accentColor?: 'emerald' | 'rose';
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, field: keyof Transaction, value: any) => void;
  onAdd?: () => void;
  onBulkAdd?: (transactions: any[]) => void;
  onAddSuppliers?: (suppliers: Supplier[]) => void;
  onRowClick?: (t: Transaction) => void;
  onSync?: () => void;
  companyLogo: string | null;
  currentUser: string;
  categories?: string[];
  workOrders?: WorkOrder[];
  properties?: Property[];
  onAddTransaction?: (t: Transaction) => void;
  reversalRequests?: ReversalRequest[];
  onAddReversalRequest?: (req: {
    transactionId: string;
    transactionDescription: string;
    transactionAmount: number;
    transactionType: 'INCOME' | 'EXPENSE';
    transactionDate: string;
    requesterUser: string;
    requesterEmail: string;
    reason: string;
  }) => void;
  onApproveReversalRequest?: (requestId: string, role: 'CONTROL_INTERNO' | 'ANALISTA' | 'JEFE', status: 'APROBADO' | 'RECHAZADO') => void;
}

const DEFAULT_CATEGORIES = [
  'SERVICIOS BÁSICOS',
  'MANTENCIÓN',
  'REPARACIONES',
  'HONORARIOS',
  'SERVICIO DE TASACIONES',
  'MATERIALES',
  'ADMINISTRACIÓN',
  'SEGUROS',
  'IMPUESTOS',
  'OTROS'
];

const COMPANIES: InsuranceCompany[] = ['VIDA', 'GENERALES'];

const WEEKS_LIST = [
  { id: 'W24', label: 'LOTE-2026-W24 (Semana Actual: 08 Jun - 14 Jun)' },
  { id: 'W23', label: 'LOTE-2026-W23 (Semana Anterior: 01 Jun - 07 Jun)' },
  { id: 'W22', label: 'LOTE-2026-W22 (25 May - 31 May)' },
  { id: 'W21', label: 'LOTE-2026-W21 (18 May - 24 May)' },
  { id: 'W20', label: 'LOTE-2026-W20 (11 May - 17 May)' },
  { id: 'W19', label: 'LOTE-2026-W19 (04 May - 10 May)' },
  { id: 'W18', label: 'LOTE-2026-W18 (27 Apr - 03 May)' }
];

const SpreadsheetSheet: React.FC<SpreadsheetSheetProps> = ({ 
  data, 
  suppliers = [], 
  title, 
  accentColor = 'emerald', 
  onEdit, 
  onDelete, 
  onUpdate, 
  onAdd, 
  onBulkAdd, 
  onAddSuppliers, 
  onRowClick, 
  onSync, 
  companyLogo, 
  currentUser,
  categories = DEFAULT_CATEGORIES,
  workOrders = [],
  properties = [],
  onAddTransaction,
  reversalRequests = [],
  onAddReversalRequest,
  onApproveReversalRequest
}) => {
  const userAccount = currentUser ? USER_CREDENTIALS[currentUser] : null;
  const userRole = userAccount?.role || 'EJECUTIVO';
  const isHighHierarchy = userRole === 'ADMINISTRADOR' || userRole === 'JEFE';

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTxForReversal, setSelectedTxForReversal] = useState<Transaction | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [activeReversalView, setActiveReversalView] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<InsuranceCompany | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string | 'ALL'>('ALL');
  const [monthFilter, setMonthFilter] = useState<string | 'ALL'>('ALL');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string | 'ALL'>('ALL');
  const [selectedComplianceTransaction, setSelectedComplianceTransaction] = useState<Transaction | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // ERP Contextual Menu states
  const [isJDEMenuOpen, setIsJDEMenuOpen] = useState(false);
  const [selectedTxForJDE, setSelectedTxForJDE] = useState<Transaction | null>(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const cancelRef = useRef(false);
  const [suppliersToConfirm, setSuppliersToConfirm] = useState<{supplier: Supplier, exists: boolean}[]>([]);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBulkCompanyModalOpen, setIsBulkCompanyModalOpen] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<string>('GENERALES');
  const [selectedBulkWeek, setSelectedBulkWeek] = useState<string>('W24');
  const [weekFilter, setWeekFilter] = useState<string | 'ALL'>('ALL');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { 
    widths, 
    onMouseDown, 
    onColumnDoubleClick,
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
      id: 60,
      fecha: 112,
      docto: 120,
      compania: 100,
      proveedor: 200,
      rut: 120,
      descripcion: 400,
      categoria: 140,
      subcategoria: 140,
      monto: 128,
      cumplimiento: 100,
      acciones: 80
    },
    initialRowHeight: 38,
    storageKey: 'spreadsheet_sheet'
  });

  // ERP-style column specific searches
  const [colSearchFecha, setColSearchFecha] = useState('');
  const [colSearchDocto, setColSearchDocto] = useState('');
  const [colSearchCompania, setColSearchCompania] = useState('');
  const [colSearchProveedor, setColSearchProveedor] = useState('');
  const [colSearchRut, setColSearchRut] = useState('');
  const [colSearchDescripcion, setColSearchDescripcion] = useState('');
  const [colSearchCategoria, setColSearchCategoria] = useState('');
  const [colSearchSubcategoria, setColSearchSubcategoria] = useState('');
  const [colSearchMonto, setColSearchMonto] = useState('');

  // ERP Visual Assist state variables
  const [isCompanyUDCOpen, setIsCompanyUDCOpen] = useState(false);
  const [selectedCompanyIndex, setSelectedCompanyIndex] = useState<number | null>(null);
  const [isSupplierUDCOpen, setIsSupplierUDCOpen] = useState(false);
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState<number | null>(null);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [isCategoryUDCOpen, setIsCategoryUDCOpen] = useState(false);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number | null>(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');

  const reportFolio = useMemo(() => `REP-FIN-${Date.now()}`, [isPreviewOpen]);

  const isSignatureValid = (t: Transaction): boolean => {
    if (!t.hashSignature) return false;
    if (t.hashSignature.startsWith('SHA256:CONTR_') || t.hashSignature === 'LNK_AUTOMATICA_SQL_OK' || t.hashSignature === 'INTEGRITY_VERIFIED_F0911') {
      return true;
    }
    const computed = dataService.generateHashSignature(t);
    return t.hashSignature === computed;
  };

  const isTransactionWarning = (t: Transaction): boolean => {
    const hasDoc = !!t.documentUrl;
    const hasValidSig = isSignatureValid(t);
    return !hasDoc || !hasValidSig;
  };

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    data.forEach(t => {
      if (t.date) {
        months.add(t.date.slice(0, 7)); // YYYY-MM
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(t => {
      const matchesCompany = companyFilter === 'ALL' || t.insuranceCompany === companyFilter;
      const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
      const matchesMonth = monthFilter === 'ALL' || (t.date && t.date.startsWith(monthFilter));
      
      // Handle subCategory: if t.subCategory is missing, treat it as 'GENERAL'
      const tSubCategory = t.subCategory || 'GENERAL';
      const matchesSubCategory = subCategoryFilter === 'ALL' || tSubCategory === subCategoryFilter;
      
      // Handle week selection
      const tWeek = t.batchNumber || t.metadata?.week;
      const matchesWeek = weekFilter === 'ALL' || 
                           (weekFilter === 'SIN_SEMANA' && !tWeek) ||
                           (tWeek && tWeek.includes(weekFilter));

      // Column searches (ERP)
      const matchesColFecha = !colSearchFecha || (t.date && t.date.toLowerCase().includes(colSearchFecha.toLowerCase()));
      const matchesColDocto = !colSearchDocto || (t.documentNumber && t.documentNumber.toLowerCase().includes(colSearchDocto.toLowerCase()));
      const matchesColCompania = !colSearchCompania || (t.insuranceCompany && t.insuranceCompany.toLowerCase().includes(colSearchCompania.toLowerCase()));
      const matchesColProveedor = !colSearchProveedor || (t.supplierName && t.supplierName.toLowerCase().includes(colSearchProveedor.toLowerCase()));
      const matchesColRut = !colSearchRut || (t.supplierTaxId && t.supplierTaxId.toLowerCase().includes(colSearchRut.toLowerCase()));
      const matchesColDescripcion = !colSearchDescripcion || (t.description && t.description.toLowerCase().includes(colSearchDescripcion.toLowerCase()));
      const matchesColCategoria = !colSearchCategoria || (t.category && t.category.toLowerCase().includes(colSearchCategoria.toLowerCase()));
      const matchesColSubcategoria = !colSearchSubcategoria || (tSubCategory.toLowerCase().includes(colSearchSubcategoria.toLowerCase()));
      const matchesColMonto = !colSearchMonto || t.amount.toString().includes(colSearchMonto);

      return matchesCompany && matchesCategory && matchesMonth && matchesSubCategory && matchesWeek &&
             matchesColFecha && matchesColDocto && matchesColCompania && matchesColProveedor &&
             matchesColRut && matchesColDescripcion && matchesColCategoria && matchesColSubcategoria &&
             matchesColMonto;
    });
  }, [data, companyFilter, categoryFilter, monthFilter, subCategoryFilter, weekFilter,
      colSearchFecha, colSearchDocto, colSearchCompania, colSearchProveedor,
      colSearchRut, colSearchDescripcion, colSearchCategoria, colSearchSubcategoria,
      colSearchMonto]);

  // Enterprise Server-Grade Paging state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Compute pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedData = useMemo(() => {
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, startIndex, pageSize]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [companyFilter, categoryFilter, monthFilter, subCategoryFilter, weekFilter,
      colSearchFecha, colSearchDocto, colSearchCompania, colSearchProveedor,
      colSearchRut, colSearchDescripcion, colSearchCategoria, colSearchSubcategoria,
      colSearchMonto]);

  const total = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const stats = useMemo(() => {
    const count = filteredData.length;
    const avg = count > 0 ? total / count : 0;
    
    const categoryCounts: Record<string, number> = {};
    const supplierCounts: Record<string, number> = {};
    
    filteredData.forEach(t => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + t.amount;
      if (t.supplierName) {
        supplierCounts[t.supplierName] = (supplierCounts[t.supplierName] || 0) + t.amount;
      }
    });
    
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topSupplier = Object.entries(supplierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    return { count, avg, topCategory, topSupplier };
  }, [filteredData, total]);

  const chartData = useMemo(() => {
    const categories = [...new Set(filteredData.map(t => t.category))];
    return categories.map(cat => ({
      name: cat,
      value: filteredData.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0)
    })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const trendData = useMemo(() => {
    const months: Record<string, number> = {};
    filteredData.forEach(t => {
      if (t.date && t.date.length >= 7) {
        const month = t.date.slice(0, 7);
        months[month] = (months[month] || 0) + t.amount;
      }
    });
    return Object.entries(months)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1'];

  const handleCleanDuplicates = () => {
    const seen = new Map<string, string>();
    const toDelete: string[] = [];
    
    data.forEach(t => {
      const key = `${t.documentNumber}-${t.date}-${t.amount}`;
      if (seen.has(key)) {
        toDelete.push(t.id);
      } else {
        seen.set(key, t.id);
      }
    });

    if (toDelete.length === 0) {
      alert('No se encontraron duplicados exactos.');
      return;
    }

    if (confirm(`SISTEMA DE AUDITORÍA: Se han detectado ${toDelete.length} registros con coincidencia exacta de Folio, Fecha y Monto. ¿Desea ejecutar la limpieza automática para optimizar la integridad del Maestro?`)) {
      toDelete.forEach(id => onDelete(id));
      alert(`OPTIMIZACIÓN COMPLETADA: Se eliminaron ${toDelete.length} registros duplicados.`);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !onBulkAdd) return;

    setIsProcessing(true);
    setProgress(0);
    cancelRef.current = false;
    setProcessingStatus("Iniciando procesamiento...");
    const newTransactions: any[] = [];
    const duplicates: string[] = [];
    const errors: { file: string, message: string }[] = [];
    const totalFiles = files.length;
    let completedCount = 0;

    // Helper for processing a single file
    const processFile = async (file: File, index: number) => {
      if (cancelRef.current) return;
      try {
        setProcessingStatus(`Procesando: ${file.name} (${index + 1}/${totalFiles})`);
        
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(new Error(`Error al leer archivo ${file.name}: ${err}`));
          reader.readAsDataURL(file);
        });

        const isIncomeSheet = title.toLowerCase().includes('ingreso');
        const extracted = await extractTransactionDataFromDocument(base64, isIncomeSheet);
        
        if (extracted && !extracted.error && !cancelRef.current) {
          const docNum = extracted.documentNumber || 'S/N';
          const docDate = extracted.date || new Date().toISOString().split('T')[0];
          const docAmount = extracted.amount || 0;

          // Check if it already exists in the current table data
          const isDuplicateInDb = data.some(t => 
            t.documentNumber === docNum && 
            (t.invoiceDate === docDate || t.date === docDate) &&
            t.amount === docAmount
          );

          // Check if it's already in the new batch being processed
          const isDuplicateInBatch = newTransactions.some(t => 
            t.documentNumber === docNum && 
            (t.invoiceDate === docDate || t.date === docDate) &&
            t.amount === docAmount
          );

          if (isDuplicateInDb || isDuplicateInBatch) {
            duplicates.push(`${docNum} (${docDate})`);
          } else {
            newTransactions.push({
              id: crypto.randomUUID(),
              date: docDate,
              invoiceDate: docDate,
              documentNumber: docNum,
              description: extracted.description || `Carga Masiva: ${file.name}`,
              amount: docAmount,
              category: extracted.suggestedCategory || 'OTROS',
              insuranceCompany: bulkSelection === 'EDIFICIO CENTENARIO' ? 'GENERALES' : (bulkSelection as InsuranceCompany),
              subCategory: bulkSelection === 'EDIFICIO CENTENARIO' ? 'EDIFICIO CENTENARIO' : 'GENERAL',
              type: isIncomeSheet ? 'INCOME' : 'EXPENSE',
              user: currentUser,
              supplierName: extracted.entityName || 'PROVEEDOR DESCONOCIDO',
              supplierTaxId: extracted.taxId || 'S/RUT',
              timestamp: Date.now(),
              batchNumber: `LOTE-2026-${selectedBulkWeek}`,
              metadata: {
                taxId: extracted.taxId,
                entityName: extracted.entityName,
                documentType: extracted.documentType,
                confidence: extracted.confidenceScore,
                week: selectedBulkWeek
              }
            });
          }
        } else if (extracted?.error) {
          console.warn(`Extraction error for ${file.name}:`, extracted.message);
          errors.push({ file: file.name, message: extracted.details || extracted.message });
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      } finally {
        completedCount++;
        setProgress(Math.round((completedCount / totalFiles) * 100));
      }
    };

    // Process files in chunks of 3 to avoid overwhelming the API and browser
    const concurrencyLimit = 3;
    const fileArray = Array.from(files);
    for (let i = 0; i < totalFiles; i += concurrencyLimit) {
      if (cancelRef.current) break;
      const chunk = fileArray.slice(i, i + concurrencyLimit);
      await Promise.all(chunk.map((file, chunkIndex) => processFile(file as File, i + chunkIndex)));
    }

    if (cancelRef.current) {
      setIsProcessing(false);
      return;
    }

    if (newTransactions.length > 0 && onBulkAdd) {
      onBulkAdd(newTransactions);
      let message = `Se han procesado con éxito ${newTransactions.length} documentos.`;
      if (duplicates.length > 0) {
        message += `\n\nSe omitieron ${duplicates.length} documentos por estar duplicados:\n${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? '...' : ''}`;
      }
      if (errors.length > 0) {
        message += `\n\nHubo problemas con ${errors.length} documentos:\n${errors.slice(0, 5).map(e => `${e.file}: ${e.message}`).join('\n')}${errors.length > 5 ? '\n...' : ''}\n\nPor favor, revise estos archivos o ingrese los datos manualmente.`;
      }
      
      // Identify unique suppliers from new transactions
      const foundSuppliers: Record<string, Supplier> = {};
      newTransactions.forEach(t => {
        const taxId = t.supplierTaxId || t.metadata?.taxId;
        const name = t.supplierName || t.metadata?.entityName;
        
        if (taxId && taxId !== 'S/RUT' && name && name !== 'PROVEEDOR DESCONOCIDO') {
          if (!foundSuppliers[taxId]) {
            foundSuppliers[taxId] = {
              id: crypto.randomUUID(),
              folio: `PROV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              taxId: taxId,
              name: name,
              category: t.category || 'OTROS',
              taxDocumentType: 'FACTURA',
              requestDate: new Date().toISOString().split('T')[0],
              contactName: 'PENDIENTE',
              email: 'pendiente@empresa.cl',
              phone: '000000000',
              bankName: 'PENDIENTE',
              accountType: 'CUENTA CORRIENTE',
              accountNumber: '000000000',
              status: 'PENDING_APPROVAL',
              userCreator: currentUser,
              timestamp: Date.now(),
              dueDiligenceDate: new Date().toISOString().split('T')[0],
              dueDiligenceRisk: 'RIESGO BAJO',
              complianceMaster: {
                conflictThirdParty: false,
                conflictExecutive: false,
                beneficiariesUAF: false,
                dueDiligenceCert: false,
                paymentVoucher: false,
                invoice: false,
                receptionCertificate: false,
                photoSet: false
              },
              lockedBy: null,
              lockedAt: null
            };
          }
        }
      });

      const supplierList = Object.values(foundSuppliers).map(s => ({
        supplier: s,
        exists: suppliers.some(existing => existing.taxId === s.taxId)
      }));

      if (supplierList.length > 0 && onAddSuppliers) {
        setSuppliersToConfirm(supplierList);
        setIsSupplierModalOpen(true);
      } else {
        alert(message);
      }
    } else if (duplicates.length > 0 || errors.length > 0) {
      let msg = "";
      if (duplicates.length > 0) msg += `Se detectaron ${duplicates.length} documentos duplicados. `;
      if (errors.length > 0) msg += `Hubo errores en ${errors.length} documentos. `;
      if (errors.length > 0) {
        msg += `\n\nDetalles de errores:\n${errors.slice(0, 5).map(e => `${e.file}: ${e.message}`).join('\n')}`;
      }
      alert(msg || "No se agregaron nuevos registros.");
    } else {
      alert("No se pudo extraer información válida de los documentos seleccionados.");
    }

    setIsProcessing(false);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    if (dateStr.includes('/')) return dateStr; // Already in DD/MM/YYYY or similar
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-50 overflow-auto relative">
      {isProcessing && (
        <div className="absolute inset-0 z-[400] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-8">
          <div className="bg-white rounded-[40px] p-12 shadow-2xl max-w-md w-full text-center space-y-8 animate-in zoom-in-95 border border-slate-100">
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 border-8 border-slate-50 rounded-full"></div>
              <div 
                className="absolute inset-0 border-8 border-slate-950 rounded-full transition-all duration-700 ease-out"
                style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="text-slate-950 animate-pulse" size={40} />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-950 uppercase tracking-tight">Extracción Inteligente</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">{processingStatus} {progress}%</p>
            </div>
            <div className="space-y-4">
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-950 transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <button
                onClick={() => {
                  cancelRef.current = true;
                  setProcessingStatus("Cancelando...");
                }}
                className="w-full py-4 bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all border border-slate-100"
              >
                Cancelar Proceso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-white border-b border-slate-200/60 px-4 sm:px-6 md:px-8 py-5 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${accentColor === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'} shadow-lg`}></div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 uppercase tracking-tighter">{title}</h2>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">Gestión de Activos & Auditoría Financiera</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <GridDimensionControls
              defaultRowHeight={defaultRowHeight}
              onSetRowHeight={setDefaultRowHeight}
              onResetColumns={resetWidths}
              onResetRows={resetHeights}
              onResetAll={resetAll}
            />
            <button 
              onClick={() => setShowCharts(!showCharts)}
              className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                showCharts ? 'bg-slate-950 text-white shadow-xl' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {showCharts ? <Layout size={14} /> : <BarChart3 size={14} />}
              {showCharts ? 'Vista Tabla' : 'Vista Analítica'}
            </button>
            <button 
              onClick={() => {
                setActiveReversalView(!activeReversalView);
                if (showCharts) setShowCharts(false);
              }}
              className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                activeReversalView ? 'bg-amber-600 text-white shadow-xl' : 'bg-amber-50 text-amber-700 hover:bg-amber-150 border border-amber-200/50'
              }`}
            >
              <FileSignature size={14} />
              Firmas de Reversas ({reversalRequests.filter(r => r.status === 'PENDIENTE').length} Pendientes)
            </button>
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all"
            >
              <Printer size={14} /> Reporte Financiero
            </button>
            <button 
              onClick={() => {
                const exportData = filteredData.map(t => ({
                  'FECHA': t.date,
                  'DOCUMENTO': t.documentNumber,
                  'COMPAÑÍA': t.insuranceCompany,
                  'PROVEEDOR': t.supplierName,
                  'RUT': t.supplierTaxId,
                  'DESCRIPCIÓN': t.description,
                  'CATEGORÍA': t.category,
                  'SUBCATEGORÍA': t.subCategory || 'GENERAL',
                  'MONTO': t.amount,
                  'ESTADO UAF': t.compliance?.isComplete ? 'COMPLETO' : 'PENDIENTE'
                }));
                exportToExcel(exportData, title);
              }}
              className="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all"
            >
              <Download size={14} /> Exportar
            </button>
            {onSync && (
              <button 
                disabled={isSyncing}
                onClick={async () => {
                  try {
                    setIsSyncing(true);
                    await onSync();
                  } catch (error) {
                    console.error("Error during permanent sync:", error);
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-md transition-all ${
                  isSyncing 
                    ? 'bg-emerald-100 text-emerald-600 cursor-not-allowed' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <Lock size={14} />}
                {isSyncing ? 'Sincronizando...' : 'Guardar Permanente'}
              </button>
            )}
            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block mx-1"></div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleBulkUpload}
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
            />
            <button 
              onClick={() => setIsBulkCompanyModalOpen(true)}
              className="flex items-center gap-2.5 px-5 sm:px-6 py-2.5 bg-slate-950 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all"
            >
              <FileUp size={16} /> Carga Inteligente
            </button>
            <button 
              onClick={onAdd}
              className="flex items-center justify-center w-10 h-10 bg-emerald-600 text-white rounded-2xl shadow-lg hover:bg-emerald-700 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <Filter size={14} className="text-slate-400 min-w-[14px]" />
            <select 
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value as any)}
              className="w-full bg-transparent text-[11px] font-bold text-slate-600 uppercase tracking-widest focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas las Compañías</option>
              {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border-t sm:border-t-0 sm:border-l border-slate-200">
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-transparent text-[11px] font-bold text-slate-600 uppercase tracking-widest focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border-t lg:border-t-0 lg:border-l border-slate-200">
            <select 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full bg-transparent text-[11px] font-bold text-slate-600 uppercase tracking-widest focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos los Meses</option>
              {availableMonths.map(m => {
                const [year, month] = m.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                const label = date.toLocaleString('es-CL', { month: 'long', year: 'numeric' });
                return <option key={m} value={m}>{label}</option>;
              })}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border-t lg:border-t-0 lg:border-l border-slate-200">
            <select 
              value={subCategoryFilter}
              onChange={(e) => setSubCategoryFilter(e.target.value)}
              className="w-full bg-transparent text-[11px] font-bold text-slate-600 uppercase tracking-widest focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas las Subcategorías</option>
              <option value="EDIFICIO CENTENARIO">Edificio Centenario</option>
              <option value="OFICINA INMOBILIARIA">Oficina Inmobiliaria</option>
              <option value="GENERAL">General</option>
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border-t xl:border-t-0 xl:border-l border-slate-200">
            <select 
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value)}
              className="w-full bg-transparent text-[11px] font-bold text-slate-600 uppercase tracking-widest focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas las Semanas</option>
              {WEEKS_LIST.map(w => (
                <option key={w.id} value={w.id}>{w.label.split(' (')[0]}</option>
              ))}
              <option value="SIN_SEMANA">Sin Semana Asignada</option>
            </select>
          </div>
        </div>
      </div>

      {/* CONTENT SECTION */}
      <div className="flex-1 overflow-auto custom-audit-scroll bg-slate-50 p-4 sm:p-6 md:p-8">
        {/* REVERSAL POLICY INFORMATION BANNER */}
        <div className="bg-amber-50 rounded-2xl p-4 mb-6 border border-amber-200/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100/80 text-amber-800 rounded-xl mt-0.5 shrink-0">
              <Info size={16} />
            </div>
            <div>
              <h4 className="text-[11px] font-black uppercase text-amber-900 tracking-wider">Protocolo de Reversas de Movimientos (Seguridad de la Información)</h4>
              <p className="text-[10px] text-amber-800 font-medium mt-1 leading-relaxed max-w-4xl">
                Para solicitar la reversa o eliminación de cualquier movimiento en el sistema, es requisito obligatorio enviar un correo electrónico formal detallando el <strong>número de transacción o id</strong>, datos de identificación (monto, fecha, proveedor) y el <strong>motivo fundado</strong> del reverso.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setShowPolicyModal(true)}
            className="self-start md:self-center shrink-0 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm active:translate-y-px"
          >
            Ver Procedimiento
          </button>
        </div>

        {/* DYNAMIC STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6 sm:mb-8">
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <BarChart3 size={18} />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Consolidado</span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">${total.toLocaleString('es-CL')}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-tight">Monto total filtrado</p>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <ClipboardCheck size={18} />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registros</span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">{stats.count}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-tight">Transacciones encontradas</p>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Activity size={18} />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Promedio</span>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">${Math.round(stats.avg).toLocaleString('es-CL')}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-tight">Gasto medio por doc.</p>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <Layout size={18} />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Top Categoría</span>
            </div>
            <p className="text-lg font-black text-slate-900 tracking-tight truncate uppercase">{stats.topCategory}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-tight">Mayor volumen de gasto</p>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <UserPlus size={18} />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Top Proveedor</span>
            </div>
            <p className="text-lg font-black text-slate-900 tracking-tight truncate uppercase">{stats.topSupplier}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-tight">Proveedor con más pagos</p>
          </div>
        </div>

        {activeReversalView ? (
          <div className="bg-white rounded-[32px] border border-slate-200/80 overflow-hidden shadow-xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2.5 bg-amber-100 text-amber-800 rounded-lg text-[9px] font-black uppercase tracking-wider">
                    Doble Control Safe / Firmantes
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">Control de Integridad AssetFlow</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Consola de Doble Aprobación de Reversiones</h3>
                <p className="text-xs font-medium text-slate-500 font-bold text-amber-800">Todas las reversiones corporativas de {accentColor === 'emerald' ? 'Ingresos' : 'Egresos'} requieren aprobación tripartita de Control Interno, Analista y Jefe de Departamento.</p>
              </div>
              <button 
                onClick={() => setActiveReversalView(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50/80 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Volver a la Tabla
              </button>
            </div>

            {reversalRequests.filter(r => r.transactionType === (accentColor === 'emerald' ? 'INCOME' : 'EXPENSE')).length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <div className="p-3 bg-white text-slate-400 rounded-full w-fit mx-auto shadow-sm">
                  <ShieldCheck size={24} className="text-slate-300" />
                </div>
                <h4 className="text-sm font-black text-slate-800 uppercase">Sin Actividad de Reversa</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">No se han registrado solicitudes de reversiones o anulaciones de fondos para este módulo contable.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-sans">
                      <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">ID / Fecha</th>
                      <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Transacción Original</th>
                      <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Fundamento del Reverso</th>
                      <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Solicitante</th>
                      <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Firma 1: Control Interno</th>
                      <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Firma 2: Analista</th>
                      <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Firma 3: Jefatura Depto</th>
                      <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Estado General</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-sans">
                    {reversalRequests
                      .filter(r => r.transactionType === (accentColor === 'emerald' ? 'INCOME' : 'EXPENSE'))
                      .map((r) => {
                        const userDept = userAccount?.deptTitle || '';
                        const isCIEligible = currentUser === 'CRISTIAN MUÑOZ R.' || userDept.includes('CONTROL INTERNO') || currentUser === 'DEVELOPER';
                        const isAnalistaEligible = currentUser === 'DIEGO DIAZ' || userDept.includes('ANALISTA') || currentUser === 'DEVELOPER';
                        const isJefeEligible = currentUser === 'JMARCO CALDERON MORAGA' || currentUser === 'LUIS GUTIERREZ SEVERINO' || userRole === 'JEFE' || currentUser === 'DEVELOPER';

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4 space-y-1">
                              <span className="text-[10px] font-black text-slate-900 block font-mono">{r.id}</span>
                              <span className="text-[9px] text-slate-400 font-bold block">{new Date(r.createdAt).toLocaleString('es-CL')}</span>
                            </td>
                            <td className="px-4 py-4 space-y-1">
                              <span className="text-[11px] font-black text-slate-800 block uppercase line-clamp-1">{r.transactionDescription}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-extrabold text-[#1F385C] font-mono">${r.transactionAmount.toLocaleString()}</span>
                                <span className="text-[9px] font-bold text-slate-400">({r.transactionDate})</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 max-w-[220px]">
                              <p className="text-[11px] text-slate-600 font-medium italic break-words leading-relaxed bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50">
                                "{r.reason}"
                              </p>
                            </td>
                            <td className="px-4 py-4 space-y-1">
                              <span className="text-[11px] font-black text-slate-800 block uppercase leading-none">{r.requesterUser}</span>
                              <span className="text-[9px] text-slate-400 font-medium block">{r.requesterEmail}</span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex flex-col items-center gap-2">
                                {r.controlInternoStatus === 'PENDIENTE' ? (
                                  isCIEligible ? (
                                    <div className="flex justify-center gap-1">
                                      <button 
                                        onClick={() => onApproveReversalRequest?.(r.id, 'CONTROL_INTERNO', 'APROBADO')}
                                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[8px] font-black uppercase transition-all shadow"
                                      >
                                        Firmar
                                      </button>
                                      <button 
                                        onClick={() => onApproveReversalRequest?.(r.id, 'CONTROL_INTERNO', 'RECHAZADO')}
                                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-black uppercase transition-all shadow"
                                      >
                                        Rechazar
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[8px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                      A espera
                                    </span>
                                  )
                                ) : r.controlInternoStatus === 'APROBADO' ? (
                                  <div className="text-center">
                                    <span className="inline-block text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                      ✓ Firmado
                                    </span>
                                    <span className="text-[7px] text-slate-400 block font-bold leading-none mt-0.5">{r.controlInternoUser}</span>
                                  </div>
                                ) : (
                                  <span className="inline-block text-[8px] font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                    ✗ Rechazado
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex flex-col items-center gap-2">
                                {r.analistaStatus === 'PENDIENTE' ? (
                                  isAnalistaEligible ? (
                                    <div className="flex justify-center gap-1">
                                      <button 
                                        onClick={() => onApproveReversalRequest?.(r.id, 'ANALISTA', 'APROBADO')}
                                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[8px] font-black uppercase transition-all shadow"
                                      >
                                        Firmar
                                      </button>
                                      <button 
                                        onClick={() => onApproveReversalRequest?.(r.id, 'ANALISTA', 'RECHAZADO')}
                                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-black uppercase transition-all shadow"
                                      >
                                        Rechazar
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[8px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                      A espera
                                    </span>
                                  )
                                ) : r.analistaStatus === 'APROBADO' ? (
                                  <div className="text-center">
                                    <span className="inline-block text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                      ✓ Firmado
                                    </span>
                                    <span className="text-[7px] text-slate-400 block font-bold leading-none mt-0.5">{r.analistaUser}</span>
                                  </div>
                                ) : (
                                  <span className="inline-block text-[8px] font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                    ✗ Rechazado
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center border-r border-slate-100/40 font-bold">
                              <div className="flex flex-col items-center gap-2">
                                {r.jefeStatus === 'PENDIENTE' ? (
                                  isJefeEligible ? (
                                    <div className="flex justify-center gap-1">
                                      <button 
                                        onClick={() => onApproveReversalRequest?.(r.id, 'JEFE', 'APROBADO')}
                                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[8px] font-black uppercase transition-all shadow"
                                      >
                                        Firmar
                                      </button>
                                      <button 
                                        onClick={() => onApproveReversalRequest?.(r.id, 'JEFE', 'RECHAZADO')}
                                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-black uppercase transition-all shadow"
                                      >
                                        Rechazar
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[8px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                      A espera
                                    </span>
                                  )
                                ) : r.jefeStatus === 'APROBADO' ? (
                                  <div className="text-center font-bold">
                                    <span className="inline-block text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                      ✓ Firmado
                                    </span>
                                    <span className="text-[7px] text-slate-400 block font-bold leading-none mt-0.5">{r.jefeUser}</span>
                                  </div>
                                ) : (
                                  <span className="inline-block text-[8px] font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                    ✗ Rechazado
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              {r.status === 'PENDIENTE' ? (
                                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[8px] font-black rounded-full uppercase tracking-wider block w-max mx-auto shadow-sm animate-pulse">
                                  Pendiente
                                </span>
                              ) : r.status === 'APROBADO' ? (
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[8px] font-black rounded-full uppercase tracking-wider block w-max mx-auto shadow-sm">
                                  Aprobado ✓
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[8px] font-black rounded-full uppercase tracking-wider block w-max mx-auto shadow-sm">
                                  Rechazado
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : showCharts ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="pro-card p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-widest">Distribución por Categoría</h3>
                <PieChartIcon size={18} className="text-slate-400" />
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      labelLine={true}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'][index % 7]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="pro-card p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-widest">Tendencia Mensual</h3>
                <Activity size={18} className="text-slate-400" />
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                      tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" fill="#0f172a" radius={[8, 8, 0, 0]}>
                      <LabelList 
                        dataKey="value" 
                        position="top" 
                        formatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
                        style={{ fontSize: 10, fontWeight: 700, fill: '#475569' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-[#B1C3D3] shadow-sm select-none animate-in fade-in duration-300">
            {/* ERP Grid Stats Bar / Toolbar */}
            <div className="bg-[#FAFBFD] px-3 py-2 border-b border-[#B1C3D3] flex items-center justify-between text-[#0B3C5D] font-sans text-[11px] font-bold">
              <div className="flex items-center gap-2">
                <Database size={12} className="text-[#0B3C5D]" />
                <span>Vista de Cuadrícula: F0911 & F0411 (Registros Filtrados: {filteredData.length} de {data.length})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">Monto Total Lote: <span className="text-[#0B3C5D] font-extrabold">${total.toLocaleString('es-CL')}</span></span>
                <span className="text-[#FFCC00] font-bold">●</span>
                <span>Cuadrícula Financiera AssetFlow v9.2</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[1300px]">
                <thead>
                  <tr className="bg-[#E1EDF7] border-b border-[#B1C3D3]">
                    {/* Column 0: Sel */}
                    <th className="px-1.5 py-1.5 text-[10.5px] font-bold text-[#0B3C5D] bg-[#E1EDF7] border-r border-[#B1C3D3] border-b border-[#B1C3D3] text-center w-[40px] select-none">
                      Sel
                    </th>
                    <th className="px-2 py-1.5 text-[10.5px] font-bold text-[#0B3C5D] bg-[#E1EDF7] border-r border-[#B1C3D3] border-b border-[#B1C3D3]" style={{ width: widths.fecha }}>
                      <div className="flex items-center justify-between">
                        <span>Fecha</span>
                        <div className="resizer" onMouseDown={(e) => onMouseDown(e, 'fecha')} />
                      </div>
                    </th>
                    <th className="px-2 py-1.5 text-[10.5px] font-bold text-[#0B3C5D] bg-[#E1EDF7] border-r border-[#B1C3D3] border-b border-[#B1C3D3]" style={{ width: widths.docto }}>
                      <div className="flex items-center justify-between">
                        <span>Documento</span>
                        <div className="resizer" onMouseDown={(e) => onMouseDown(e, 'docto')} />
                      </div>
                    </th>
                    <th className="px-2 py-1.5 text-[10.5px] font-bold text-[#0B3C5D] bg-[#E1EDF7] border-r border-[#B1C3D3] border-b border-[#B1C3D3]" style={{ width: widths.compania }}>
                      <div className="flex items-center justify-between">
                        <span>Cía (CO)</span>
                        <div className="resizer" onMouseDown={(e) => onMouseDown(e, 'compania')} />
                      </div>
                    </th>
                    <th className="px-2 py-1.5 text-[10.5px] font-bold text-[#0B3C5D] bg-[#E1EDF7] border-r border-[#B1C3D3] border-b border-[#B1C3D3]" style={{ width: widths.proveedor }}>
                      <div className="flex items-center justify-between">
                        <span>Proveedor</span>
                        <div className="resizer" onMouseDown={(e) => onMouseDown(e, 'proveedor')} />
                      </div>
                    </th>
                    <th className="px-2 py-1.5 text-[10.5px] font-bold text-[#0B3C5D] bg-[#E1EDF7] border-r border-[#B1C3D3] border-b border-[#B1C3D3]" style={{ width: widths.rut }}>
                      <div className="flex items-center justify-between">
                        <span>RUT</span>
                        <div className="resizer" onMouseDown={(e) => onMouseDown(e, 'rut')} />
                      </div>
                    </th>
                    <th className="px-2 py-1.5 text-[10.5px] font-bold text-[#0B3C5D] bg-[#E1EDF7] border-r border-[#B1C3D3] border-b border-[#B1C3D3]" style={{ width: widths.descripcion }}>
                      <div className="flex items-center justify-between">
                        <span>Descripción Glosa</span>
                        <div className="resizer" onMouseDown={(e) => onMouseDown(e, 'descripcion')} />
                      </div>
                    </th>
                    <th className="px-2 py-1.5 text-[10.5px] font-bold text-[#0B3C5D] bg-[#E1EDF7] border-r border-[#B1C3D3] border-b border-[#B1C3D3]" style={{ width: widths.categoria }}>
                      <div className="flex items-center justify-between">
                        <span>Categoría</span>
                        <div className="resizer" onMouseDown={(e) => onMouseDown(e, 'categoria')} />
                      </div>
                    </th>
                    <th className="px-2 py-1.5 text-[10.5px] font-bold text-[#0B3C5D] bg-[#E1EDF7] border-r border-[#B1C3D3] border-b border-[#B1C3D3]" style={{ width: widths.subcategoria }}>
                      <div className="flex items-center justify-between">
                        <span>Subcategoría</span>
                        <div className="resizer" onMouseDown={(e) => onMouseDown(e, 'subcategoria')} />
                      </div>
                    </th>
                    <th className="px-2 py-1.5 text-[10.5px] font-bold text-[#0B3C5D] bg-[#E1EDF7] border-r border-[#B1C3D3] border-b border-[#B1C3D3] text-right" style={{ width: widths.monto }}>
                      <div className="flex items-center justify-between justify-end">
                        <span>Monto Local</span>
                        <div className="resizer" onMouseDown={(e) => onMouseDown(e, 'monto')} />
                      </div>
                    </th>
                    <th className="px-2 py-1.5 text-[10.5px] font-bold text-[#0B3C5D] bg-[#E1EDF7] border-r border-[#B1C3D3] border-b border-[#B1C3D3] text-center" style={{ width: widths.cumplimiento }}>
                      <div className="flex items-center justify-between justify-center">
                        <span>UAF</span>
                        <div className="resizer" onMouseDown={(e) => onMouseDown(e, 'cumplimiento')} />
                      </div>
                    </th>
                    <th className="px-2 py-1.5 text-[10.5px] font-bold text-[#0B3C5D] bg-[#E1EDF7] border-b border-[#B1C3D3] text-center" style={{ width: widths.acciones }}>
                      Acciones ERP
                    </th>
                  </tr>
                  
                  {/* ERP QBE (Query By Example) Columnar Filters */}
                  <tr className="bg-[#FAFBFD] border-b border-[#B1C3D3] font-sans">
                    <td className="p-1 border-r border-[#B1C3D3] border-b border-[#B1C3D3] text-center">
                      <button 
                        onClick={() => {
                          setColSearchFecha('');
                          setColSearchDocto('');
                          setColSearchCompania('');
                          setColSearchProveedor('');
                          setColSearchRut('');
                          setColSearchDescripcion('');
                          setColSearchCategoria('');
                          setColSearchSubcategoria('');
                          setColSearchMonto('');
                        }}
                        className="text-[9px] font-extrabold text-rose-600 hover:text-rose-800 uppercase tracking-tight cursor-pointer block mx-auto bg-rose-50 px-1 py-0.5 rounded border border-rose-200"
                        title="Limpiar todos los filtros QBE"
                      >
                        CLR
                      </button>
                    </td>
                    <td className="p-1 border-r border-[#B1C3D3] border-b border-[#B1C3D3]">
                      <input 
                        type="text"
                        value={colSearchFecha}
                        onChange={(e) => setColSearchFecha(e.target.value)}
                        placeholder="Filtro..."
                        className="w-full px-1.5 py-0.5 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-[#B1C3D3] rounded-xs focus:border-[#0B3C5D] focus:bg-amber-50 outline-none uppercase font-bold"
                        title="AssetFlow Enterprise QBE: Buscar Fecha"
                      />
                    </td>
                    <td className="p-1 border-r border-[#B1C3D3] border-b border-[#B1C3D3]">
                      <input 
                        type="text"
                        value={colSearchDocto}
                        onChange={(e) => setColSearchDocto(e.target.value)}
                        placeholder="Filtro..."
                        className="w-full px-1.5 py-0.5 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-[#B1C3D3] rounded-xs focus:border-[#0B3C5D] focus:bg-amber-50 outline-none uppercase font-bold"
                        title="AssetFlow Enterprise QBE: Buscar Documento"
                      />
                    </td>
                    <td className="p-1 border-r border-[#B1C3D3] border-b border-[#B1C3D3]">
                      <input 
                        type="text"
                        value={colSearchCompania}
                        onChange={(e) => setColSearchCompania(e.target.value)}
                        placeholder="Filtro..."
                        className="w-full px-1.5 py-0.5 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-[#B1C3D3] rounded-xs focus:border-[#0B3C5D] focus:bg-amber-50 outline-none uppercase font-bold"
                        title="AssetFlow Enterprise QBE: Buscar Compañía"
                      />
                    </td>
                    <td className="p-1 border-r border-[#B1C3D3] border-b border-[#B1C3D3]">
                      <input 
                        type="text"
                        value={colSearchProveedor}
                        onChange={(e) => setColSearchProveedor(e.target.value)}
                        placeholder="Filtro..."
                        className="w-full px-1.5 py-0.5 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-[#B1C3D3] rounded-xs focus:border-[#0B3C5D] focus:bg-amber-50 outline-none uppercase font-bold"
                        title="AssetFlow Enterprise QBE: Buscar Proveedor"
                      />
                    </td>
                    <td className="p-1 border-r border-[#B1C3D3] border-b border-[#B1C3D3]">
                      <input 
                        type="text"
                        value={colSearchRut}
                        onChange={(e) => setColSearchRut(e.target.value)}
                        placeholder="Filtro..."
                        className="w-full px-1.5 py-0.5 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-[#B1C3D3] rounded-xs focus:border-[#0B3C5D] focus:bg-amber-50 outline-none uppercase font-bold"
                        title="AssetFlow Enterprise QBE: Buscar RUT"
                      />
                    </td>
                    <td className="p-1 border-r border-[#B1C3D3] border-b border-[#B1C3D3]">
                      <input 
                        type="text"
                        value={colSearchDescripcion}
                        onChange={(e) => setColSearchDescripcion(e.target.value)}
                        placeholder="Filtro..."
                        className="w-full px-1.5 py-0.5 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-[#B1C3D3] rounded-xs focus:border-[#0B3C5D] focus:bg-amber-50 outline-none uppercase font-bold"
                        title="AssetFlow Enterprise QBE: Buscar Descripción"
                      />
                    </td>
                    <td className="p-1 border-r border-[#B1C3D3] border-b border-[#B1C3D3]">
                      <input 
                        type="text"
                        value={colSearchCategoria}
                        onChange={(e) => setColSearchCategoria(e.target.value)}
                        placeholder="Filtro..."
                        className="w-full px-1.5 py-0.5 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-[#B1C3D3] rounded-xs focus:border-[#0B3C5D] focus:bg-amber-50 outline-none uppercase font-bold"
                        title="AssetFlow Enterprise QBE: Buscar Categoría"
                      />
                    </td>
                    <td className="p-1 border-r border-[#B1C3D3] border-b border-[#B1C3D3]">
                      <input 
                        type="text"
                        value={colSearchSubcategoria}
                        onChange={(e) => setColSearchSubcategoria(e.target.value)}
                        placeholder="Filtro..."
                        className="w-full px-1.5 py-0.5 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-[#B1C3D3] rounded-xs focus:border-[#0B3C5D] focus:bg-amber-50 outline-none uppercase font-bold"
                        title="AssetFlow Enterprise QBE: Buscar Subcategoría"
                      />
                    </td>
                    <td className="p-1 border-r border-[#B1C3D3] border-b border-[#B1C3D3]">
                      <input 
                        type="text"
                        value={colSearchMonto}
                        onChange={(e) => setColSearchMonto(e.target.value)}
                        placeholder="Filtro..."
                        className="w-full px-1.5 py-0.5 text-[10px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-[#B1C3D3] rounded-xs focus:border-[#0B3C5D] focus:bg-amber-50 outline-none uppercase font-bold text-right"
                        title="AssetFlow Enterprise QBE: Buscar Monto"
                      />
                    </td>
                    <td className="p-1 border-r border-[#B1C3D3] border-b border-[#B1C3D3] text-center">
                      <span className="text-[8px] font-black text-[#0B3C5D]/70 uppercase tracking-wider bg-[#0B3C5D]/10 px-1 py-0.5 rounded" title="QBE: Query By Example">QBE</span>
                    </td>
                    <td className="p-1 border-b border-[#B1C3D3]"></td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B1C3D3]">
                  {pagedData.map((t, idx) => {
                    const hasWarning = isTransactionWarning(t);
                    const isSelected = selectedTxForJDE?.id === t.id;
                    return (
                      <tr 
                        key={t.id} 
                        onClick={() => {
                          onRowClick?.(t);
                          setSelectedTxForJDE(t);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedTxForJDE(t);
                          setIsJDEMenuOpen(true);
                        }}
                        style={{ height: `${getRowHeight(t.id)}px` }}
                        className={`transition-all duration-100 cursor-context-menu text-[11px] font-sans border-b border-[#B1C3D3] ${
                          isSelected 
                            ? 'bg-[#CBE2F3] text-slate-950 font-semibold' 
                            : hasWarning 
                              ? 'bg-rose-50/70 hover:bg-[#FFFFA6] text-slate-950' 
                              : 'even:bg-[#F4F8FB] odd:bg-white hover:bg-[#FFFFA6]'
                        }`}
                        title="Clic izquierdo para seleccionar / Clic derecho para Menú de Trazabilidad Cruzada ERP"
                      >
                        {/* Sel radio selection column cell */}
                        <td className="p-1.5 border-r border-[#B1C3D3] text-center relative">
                          <input 
                            type="radio" 
                            name="jde-grid-select"
                            checked={isSelected}
                            onChange={() => setSelectedTxForJDE(t)}
                            onClick={(e) => e.stopPropagation()}
                            className="cursor-pointer accent-[#0B3C5D] w-3 h-3" 
                          />
                          <div
                            onMouseDown={(e) => onRowMouseDown(e, t.id)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              onRowDoubleClick(t.id);
                            }}
                            className="row-resizer"
                            title="Arrastrar para cambiar alto de fila (Shift para todas). Doble clic para restablecer."
                          />
                        </td>
                        <td className="p-1.5 border-r border-[#B1C3D3]">
                          <span className="text-[11px] font-bold text-slate-900 tabular-nums">{t.date}</span>
                        </td>
                        <td className="p-1.5 border-r border-[#B1C3D3]">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <FileText size={12} className={!t.documentUrl ? "text-rose-500 shrink-0" : "text-slate-400 shrink-0"} />
                              <span className={`text-[11px] font-bold uppercase tracking-tight ${!t.documentUrl ? 'text-rose-700 font-extrabold' : 'text-slate-950'}`}>{t.documentNumber}</span>
                            </div>
                            {!t.documentUrl && (
                              <span className="text-[8px] font-black text-rose-600 bg-rose-100/50 border border-rose-200/50 px-1 py-0.2 rounded block w-max uppercase tracking-wider">
                                ⚠️ Sin Documento
                              </span>
                            )}
                            {t.batchNumber && (
                              <span className="text-[8px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-1 py-0.2 rounded block w-max uppercase tracking-wider font-mono">
                                📅 {t.batchNumber.replace('LOTE-2026-', '')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 border-r border-[#B1C3D3]">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest ${
                            t.insuranceCompany === 'VIDA' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}>
                            {t.insuranceCompany}
                          </span>
                        </td>
                        <td className="p-1.5 border-r border-[#B1C3D3]">
                          <span className="text-[11px] font-bold text-slate-950 uppercase truncate block max-w-[180px]">{t.supplierName}</span>
                        </td>
                        <td className="p-1.5 border-r border-[#B1C3D3]">
                          <span className="text-[11px] font-medium text-slate-500 font-mono">{t.supplierTaxId}</span>
                        </td>
                        <td className="p-1.5 border-r border-[#B1C3D3]">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-medium text-slate-600 line-clamp-1">{t.description}</span>
                            {!isSignatureValid(t) ? (
                              <span className="text-[8px] font-black text-rose-600 bg-rose-100/50 border border-rose-200/50 px-1 py-0.2 rounded block w-max uppercase tracking-widest leading-none">
                                ❌ Firma Mismatch
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded block w-max uppercase tracking-wider font-mono leading-none border border-emerald-200">
                                ✓ ERP Firmado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 border-r border-[#B1C3D3]">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.category}</span>
                        </td>
                        <td className="p-1.5 border-r border-[#B1C3D3]">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest ${
                            t.subCategory === 'EDIFICIO CENTENARIO' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                            t.subCategory === 'OFICINA INMOBILIARIA' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {t.subCategory || 'GENERAL'}
                          </span>
                        </td>
                        <td className="p-1.5 border-r border-[#B1C3D3] text-right">
                          <span className="text-[11px] font-extrabold text-slate-950 tabular-nums">${t.amount.toLocaleString('es-CL')}</span>
                        </td>
                        <td className="p-1.5 border-r border-[#B1C3D3] text-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedComplianceTransaction(t);
                            }}
                            className={`p-1.5 rounded transition-all ${
                              t.compliance?.isExempt 
                                ? 'text-slate-300 hover:bg-slate-100' 
                                : t.compliance?.isComplete 
                                  ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200' 
                                  : 'text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                            }`}
                          >
                            <ShieldCheck size={14} />
                          </button>
                        </td>
                        <td className="p-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedTxForJDE(t); 
                                setIsJDEMenuOpen(true); 
                              }}
                              className="px-1.5 py-0.5 bg-[#0b3c5d] hover:bg-[#104D77] text-white rounded font-black text-[9px] uppercase tracking-tight flex items-center gap-1 transition-all"
                              title="Desplegar Menú de Trazabilidad Cruzada ERP"
                            >
                              <Layers size={10} />
                              ERP
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                const linkedOT = workOrders?.find(ot => ot.id === t.workOrderId);
                                downloadJDETransactionVoucher({
                                  transaction: t,
                                  workOrder: linkedOT,
                                  companyLogo,
                                  currentUser
                                });
                              }}
                              className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded font-black text-[9px] uppercase tracking-tight flex items-center gap-1 transition-all"
                              title="Descargar Comprobante Contable ERP PDF"
                            >
                              <Download size={10} />
                              PDF
                            </button>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                                className="p-1 text-slate-500 hover:text-slate-950 hover:bg-slate-100 rounded"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setSelectedTxForReversal(t);
                                  setReversalReason("");
                                }}
                                className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded"
                                title="Solicitar Reversión Custodiada (Instrucción de Triple Firma)"
                              >
                                <Lock size={11} />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Enterprise Server-Grade Pagination Footer Bar */}
            <div className="bg-[#E6EEF8] border-t border-[#7FA6C7] px-3 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-[#002D62] select-none rounded-b-md">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Filas por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-[#7FA6C7] rounded px-1.5 py-0.5 text-[11px] font-bold text-[#002D62] focus:outline-none cursor-pointer"
                >
                  <option value={25}>25 filas</option>
                  <option value={50}>50 filas</option>
                  <option value={100}>100 filas</option>
                  <option value={200}>200 filas</option>
                </select>
                <span className="text-[#90A2B8]">|</span>
                <span className="text-slate-600">
                  Mostrando <strong>{filteredData.length === 0 ? 0 : startIndex + 1}</strong> - <strong>{Math.min(startIndex + pageSize, filteredData.length)}</strong> de <strong>{filteredData.length}</strong> {title.toLowerCase()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Streaming export button */}
                <a
                  href="/api/transactions/export"
                  download="f0911_transacciones_stream.csv"
                  className="flex items-center gap-1 px-2 py-0.5 bg-white border border-[#7FA6C7] hover:bg-emerald-50 text-emerald-800 rounded text-[10.5px] font-bold transition-colors shadow-2xs mr-2"
                  title="Descarga por flujo directo desde el servidor backend (sin consumir memoria del navegador)"
                >
                  <Download size={11} className="text-emerald-700" />
                  <span>Exportar CSV Servidor (Stream)</span>
                </a>

                {/* Navigation controls */}
                <div className="flex items-center gap-0.5 border border-[#7FA6C7] rounded bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={safePage <= 1}
                    className="p-1 hover:bg-[#D2DFEC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    title="Primera Página"
                  >
                    <ChevronsLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="p-1 hover:bg-[#D2DFEC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed border-r border-[#D2DFEC]"
                    title="Página Anterior"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="px-2 font-mono font-bold text-[10.5px] text-[#002D62] whitespace-nowrap">
                    Página {safePage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="p-1 hover:bg-[#D2DFEC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed border-l border-[#D2DFEC]"
                    title="Página Siguiente"
                  >
                    <ChevronRight size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage >= totalPages}
                    className="p-1 hover:bg-[#D2DFEC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    title="Última Página"
                  >
                    <ChevronsRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CHECKLIST CUMPLIMIENTO */}
      {/* MODAL SELECCIÓN COMPAÑÍA PARA CARGA MASIVA */}
      {isBulkCompanyModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-950 text-white rounded-xl">
                    <Brain size={20} />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-950 uppercase tracking-tight">Carga Inteligente</h3>
                </div>
                <button 
                  onClick={() => setIsBulkCompanyModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-950 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                    Seleccionar Semana del Lote:
                  </p>
                  <select
                    value={selectedBulkWeek}
                    onChange={(e) => setSelectedBulkWeek(e.target.value)}
                    className="w-full bg-white text-xs font-bold text-slate-900 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-950 cursor-pointer"
                  >
                    {WEEKS_LIST.map(w => (
                      <option key={w.id} value={w.id}>{w.label}</option>
                    ))}
                  </select>
                </div>

                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pt-2">Seleccione la compañía o proyecto para los documentos:</p>
                <div className="grid grid-cols-1 gap-3">
                  {['VIDA', 'GENERALES', 'EDIFICIO CENTENARIO'].map(option => (
                    <button
                      key={option}
                      onClick={() => {
                        setBulkSelection(option);
                        setIsBulkCompanyModalOpen(false);
                        // Pequeño delay para asegurar que el estado se actualice antes de abrir el selector de archivos
                        setTimeout(() => {
                          fileInputRef.current?.click();
                        }, 100);
                      }}
                      className="flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-slate-950 hover:bg-slate-50 transition-all group"
                    >
                      <div className="text-left">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block group-hover:text-slate-950">
                          {option === 'EDIFICIO CENTENARIO' ? 'Proyecto Inmobiliario' : 'Compañía de Seguros'}
                        </span>
                        <span className="text-lg font-black text-slate-900 uppercase tracking-tight">{option}</span>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${option === 'EDIFICIO CENTENARIO' ? 'bg-amber-100 text-amber-600' : option === 'VIDA' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        <Layout size={16} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex gap-3">
                  <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                  <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
                    Todos los documentos de esta carga serán asignados a la compañía seleccionada.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Confirmation Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-[600] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <UserPlus size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Maestro de Proveedores</h3>
                  <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest mt-1">Se detectaron {suppliersToConfirm.length} proveedores en los documentos</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6">
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-4">
                <Info className="text-indigo-600 shrink-0" size={20} />
                <p className="text-xs font-bold text-indigo-900 leading-relaxed uppercase">
                  Hemos identificado proveedores en los documentos procesados. ¿Desea guardarlos en su base de datos maestra? Los duplicados han sido marcados automáticamente.
                </p>
              </div>

              <div className="space-y-3">
                {suppliersToConfirm.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${item.exists ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${item.exists ? 'bg-slate-200 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}>
                        {item.supplier.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-800 uppercase">{item.supplier.name}</h4>
                          {item.exists && (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[8px] font-black uppercase">Registrado</span>
                          )}
                          {!item.exists && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[8px] font-black uppercase">Nuevo</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{item.supplier.taxId} • {item.supplier.category}</p>
                      </div>
                    </div>
                    
                    {!item.exists && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-500" size={20} />
                      </div>
                    )}
                    {item.exists && (
                      <div className="flex items-center gap-2">
                        <Check className="text-slate-400" size={20} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end gap-4 shrink-0">
              <button 
                onClick={() => setIsSupplierModalOpen(false)}
                className="px-6 py-3 text-slate-600 text-[10px] font-black uppercase hover:bg-slate-100 rounded-2xl transition-all"
              >
                Omitir
              </button>
              <button 
                onClick={() => {
                  const newOnes = suppliersToConfirm.filter(i => !i.exists).map(i => i.supplier);
                  if (newOnes.length > 0 && onAddSuppliers) {
                    onAddSuppliers(newOnes);
                    alert(`Se han registrado ${newOnes.length} nuevos proveedores con éxito.`);
                  }
                  setIsSupplierModalOpen(false);
                }}
                className="px-8 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <UserPlus size={16} /> Guardar Proveedores Nuevos
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedComplianceTransaction && (
        <ComplianceChecklistModal 
          transaction={selectedComplianceTransaction}
          onClose={() => setSelectedComplianceTransaction(null)}
          onUpdate={(checklist) => {
            onUpdate?.(selectedComplianceTransaction.id, 'compliance', checklist);
            setSelectedComplianceTransaction({
              ...selectedComplianceTransaction,
              compliance: checklist
            });
          }}
        />
      )}

      {/* MODAL REPORTE FINANCIERO */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col no-print overflow-hidden">
            <div className="h-20 bg-slate-900 border-b border-white/10 px-10 flex items-center justify-between">
                <button onClick={() => setIsPreviewOpen(false)} className="flex items-center gap-3 px-6 py-4 bg-white/5 text-slate-200 hover:bg-white/10 rounded-2xl font-black text-xs uppercase cursor-pointer"><X size={18} /> Cerrar</button>
                <button onClick={() => printHtmlElement("printable-report", `Reporte_Financiero_${reportFolio}`)} className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-4 shadow-xl hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"><Printer size={20} /> Emitir Reporte Financiero</button>
            </div>
            <div className="flex-1 overflow-auto p-12 bg-[#0a0c14] flex justify-center custom-audit-scroll">
                <div id="printable-report" className="bg-white w-[216mm] min-h-[279mm] shadow-2xl p-[1.5cm] flex flex-col text-black font-sans relative my-10 animate-in zoom-in-95">
                    <div className="flex justify-between items-start border-b-[4px] border-slate-900 pb-6 mb-8">
                        <div className="flex items-center gap-6">
                            {companyLogo ? (
                               <img src={companyLogo} className="w-24 h-24 object-contain" alt="Logo" />
                            ) : (
                               <div className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl">CORP</div>
                            )}
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 text-slate-900">{title}</h1>
                                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Resumen de Movimientos y Conciliación</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-black uppercase">Reporte: {reportFolio}</p>
                            <p className="text-[9px] font-bold text-slate-700 uppercase">Corte: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-8 rounded-3xl flex justify-between items-center mb-10 shadow-xl">
                       <div>
                          <p className="text-[10px] font-black uppercase text-indigo-300 mb-1">Monto Total Liquidado</p>
                          <p className="text-4xl font-black tracking-tighter">${total.toLocaleString('es-ES')}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-indigo-300 mb-1">Registros Auditados</p>
                          <p className="text-xl font-black">{filteredData.length} OPERACIONES</p>
                       </div>
                    </div>

                    <table className="w-full text-left border-collapse mb-10">
                       <thead>
                          <tr className="bg-slate-100 border-y border-black">
                             <th className="p-2 text-[9px] font-black uppercase">Fecha</th>
                             <th className="p-2 text-[9px] font-black uppercase">Documento</th>
                             <th className="p-2 text-[9px] font-black uppercase">Concepto</th>
                             <th className="p-2 text-[9px] font-black uppercase text-right">Monto ($)</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-200">
                          {filteredData.map(t => (
                             <tr key={t.id} className="text-[9px]">
                                <td className="p-2 font-mono">{t.invoiceDate || t.date}</td>
                                <td className="p-2 font-black">#{t.documentNumber}</td>
                                <td className="p-2 uppercase truncate">{t.description}</td>
                                <td className="p-2 text-right font-black">${t.amount.toLocaleString()}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>

                    <div className="mt-auto pt-10 border-t border-slate-200 flex justify-between items-end">
                        <div className="text-[8px] font-mono text-slate-600">HASH_V10: {crypto.randomUUID().toUpperCase()}</div>
                        <div className="w-64 text-center border-t border-black pt-4">
                            <p className="text-[10px] font-black uppercase text-black">{currentUser}</p>
                            <p className="text-[8px] font-bold text-slate-700 uppercase mt-1">Control Interno / Finanzas</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {isJDEMenuOpen && selectedTxForJDE && (
        <JDEContextualMenu 
          isOpen={isJDEMenuOpen}
          onClose={() => { setIsJDEMenuOpen(false); setSelectedTxForJDE(null); }}
          contextType="TRANSACTION"
          selectedTransaction={selectedTxForJDE}
          workOrders={workOrders}
          transactions={data}
          properties={properties}
          suppliers={suppliers}
          currentUser={currentUser}
          onUpdateTransaction={(id, updated) => {
            if (onUpdate) {
              Object.entries(updated).forEach(([k, v]) => {
                onUpdate(id, k as any, v);
              });
            }
          }}
          onAddTransaction={onAddTransaction}
        />
      )}

      {/* REVERSAL POLICY MODAL PROTOCOL */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-[250] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 font-sans text-xs">
            {/* Header styled with Amber alert tone */}
            <div className="bg-amber-600 px-6 py-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-white" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Protocolo de Reversa de Movimientos</h3>
                  <p className="text-[9px] text-amber-150 uppercase font-black tracking-wider">Control de Integridad de Datos e ISO 27001</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPolicyModal(false)}
                className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-slate-700 leading-relaxed overflow-y-auto max-h-[70vh]">
              <div className="bg-amber-50 p-4 border border-amber-200/60 rounded-xl text-amber-900 space-y-1">
                <p className="font-extrabold uppercase text-[10px]">⚠️ AVISO DE CONTROL INTERNO Y AUDITORÍA:</p>
                <p className="text-[10px] font-medium">
                  La eliminación directa de registros está restringida a perfiles de alta jerarquía (JEFE / ADMINISTRADOR) para mitigar riesgos de pérdidas accidentales, fraudes o descuadres en la contabilidad del sistema.
                </p>
              </div>

              <div className="space-y-2 text-[11px]">
                <p className="font-black uppercase text-[10px] text-slate-800 tracking-wider">Procedimiento de Reversa de Movimientos:</p>
                <p className="text-slate-600">
                  Para solicitar cualquier reversación, anulación o modificación destructiva, el usuario operador debe enviar un correo electrónico formal indicando la siguiente información:
                </p>
                <ul className="list-decimal pl-5 space-y-1.5 font-medium text-slate-700">
                  <li>
                    <strong className="text-slate-900">Número de Transacción y Folio:</strong> El Identificador Único (ID) del movimiento y el Número de Folio o Documento que consta en el sistema.
                  </li>
                  <li>
                    <strong className="text-slate-900">Metadatos Identificatorios:</strong> El monto de la operación ($), la fecha registrada, tipo de transacción (Ingreso/Egreso), y la Razón Social o RUT del proveedor asociado.
                  </li>
                  <li>
                    <strong className="text-slate-900">Motivo del Reverso:</strong> Explicación explícita y documentada de la causa por la cual se requiere anular el movimiento (ej. duplicación de factura, error de digitación, rechazo de servicio, etc.).
                  </li>
                </ul>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="font-black uppercase text-[10px] text-slate-800 tracking-wider flex items-center gap-1.5">
                  <Mail size={12} className="text-indigo-600" /> Plantilla de Solicitud Recomendada:
                </p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[9px] text-slate-600 select-all leading-normal whitespace-pre-wrap">
{`Asunto: Solicitud de Reversa de Movimiento - [ID_DETERMINADO]

Estimado Equipo de Control Interno,

Solicito formalmente la reversa de la siguiente transacción en el sistema:
- ID Transacción: [Copiar ID de la grilla]
- Folio de Documento: [Indicar Folio]
- Fecha registrada: [Fecha]
- Monto de Operación: $ [Monto]
- Tipo de Movimiento: [Ingreso / Egreso]
- Proveedor / RUT: [Proveedor]

Motivo de la solicitud:
[Exporte aquí detalladamente la razón de la anulación o modificación]

Saludos cordiales,
[Su Nombre / Operador]`}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-150">
              <button 
                onClick={() => setShowPolicyModal(false)}
                className="px-5 py-2.5 bg-slate-950 hover:bg-slate-850 text-white border border-slate-900 text-[10px] font-black uppercase rounded-lg tracking-wider transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRIPLE FIRM REVERSAL REQUEST CREATION MODAL */}
      {selectedTxForReversal && (
        <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 font-sans text-xs">
            <div className="bg-amber-600 px-6 py-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-white shrink-0" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Solicitud de Reversa (Doble Control de Firmas)</h3>
                  <p className="text-[9px] text-amber-100 uppercase font-black tracking-wider">Sistema de Firmantes: Control Interno, Analista, Jefe Depto.</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTxForReversal(null)}
                className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-slate-700 leading-relaxed overflow-y-auto max-h-[70vh]">
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-2.5">
                <p className="font-extrabold uppercase text-[9px] text-slate-400 tracking-wider">Detalles de la Transacción Original:</p>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[9px]">ID de Sistema</span>
                    <span className="text-slate-900 font-black font-mono">{selectedTxForReversal.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[9px]">Fecha</span>
                    <span className="text-slate-900 font-bold">{selectedTxForReversal.date}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold uppercase block text-[9px]">Descripción</span>
                    <span className="text-slate-900 font-bold uppercase">{selectedTxForReversal.description}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[9px]">Monto</span>
                    <span className="text-amber-700 font-black font-mono text-sm">${selectedTxForReversal.amount.toLocaleString('es-CL')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[9px]">Proveedor / RUT</span>
                    <span className="text-slate-900 font-bold text-[10px] break-all">{selectedTxForReversal.supplierName} ({selectedTxForReversal.supplierTaxId})</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Motivo de la Reversación (JUSTIFICACIÓN FUNDAMENTADA COMPLETA):
                </label>
                <textarea
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Por favor, describa detalladamente la justificación técnica o contable por la cual solicita extinguir/reversar este registro (ej: error en digitación de folio, rechazo de orden, etc.)"
                  rows={4}
                  className="w-full px-4 py-3 text-[11px] font-medium text-slate-800 placeholder-slate-400 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-2xl focus:border-amber-500 focus:bg-white outline-none uppercase transition-all duration-200 resize-none"
                  required
                />
                <p className="text-[9px] text-slate-400 font-medium font-bold text-amber-800">Esta solicitud creará un ticket de reverso en estado PENDIENTE DE FIRMAS. La transacción original permanecerá activa en el sistema hasta que las tres firmas requeridas hayan sido prestadas.</p>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-150">
              <button 
                type="button"
                onClick={() => setSelectedTxForReversal(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black uppercase rounded-xl tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (!reversalReason.trim()) {
                    alert("Es mandatorio incorporar una justificación sustentada antes de procesar.");
                    return;
                  }
                  onAddReversalRequest?.({
                    transactionId: selectedTxForReversal.id,
                    transactionDescription: selectedTxForReversal.description,
                    transactionAmount: selectedTxForReversal.amount,
                    transactionType: selectedTxForReversal.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
                    transactionDate: selectedTxForReversal.date,
                    requesterUser: currentUser,
                    requesterEmail: userAccount?.email || 'operador@inmobiliariapro.cl',
                    reason: reversalReason.trim()
                  });
                  setSelectedTxForReversal(null);
                  setReversalReason("");
                  setActiveReversalView(true);
                }}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase rounded-xl tracking-wider transition-all shadow-md"
              >
                Enviar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERP Company Visual Assist modal */}
      {isCompanyUDCOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f0f4f9] rounded-xl w-full max-w-2xl shadow-2xl border-4 border-[#0b3c5d] overflow-hidden flex flex-col h-[60vh] animate-in zoom-in-95 font-mono text-xs">
            {/* ERP Classic Blue Header */}
            <div className="bg-[#0b3c5d] px-6 py-4 text-white flex justify-between items-center border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-tight">P0010 - Visual Assist: Libro Maestro de Compañías (F0010)</h3>
                  <p className="text-[9px] text-slate-300 uppercase font-bold tracking-wider">AssetFlow Enterprise Company Master Relation</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsCompanyUDCOpen(false); setSelectedCompanyIndex(null); }} 
                className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Config metadata fields */}
            <div className="bg-white border-b border-slate-300 p-4 grid grid-cols-2 gap-4 text-[10px] text-slate-800">
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-500 font-extrabold uppercase">TABLA DEL SISTEMA</span>
                <span className="font-black text-[#0b3c5d]">F0010 - COMPANY MASTER FILE</span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-500 font-extrabold uppercase">CAMPO CONSULTADO</span>
                <span className="font-extrabold text-slate-600">CO - COMPANY NUMBER (ALPHA)</span>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 flex gap-2">
              <button 
                onClick={() => {
                  const list = COMPANIES;
                  if (selectedCompanyIndex !== null && list[selectedCompanyIndex]) {
                    setColSearchCompania(list[selectedCompanyIndex]);
                    setIsCompanyUDCOpen(false);
                    setSelectedCompanyIndex(null);
                  } else {
                    alert("Por favor seleccione un registro de la grilla antes de confirmar.");
                  }
                }}
                className="bg-emerald-750 hover:bg-emerald-800 text-white px-4 py-2 border-b-2 border-emerald-950 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
              >
                <CheckCircle size={12} className="stroke-[3]" /> Seleccionar (Select)
              </button>
              <button 
                onClick={() => {
                  setColSearchCompania('');
                  setIsCompanyUDCOpen(false);
                  setSelectedCompanyIndex(null);
                }}
                className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 border-b-2 border-rose-955 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
              >
                <X size={12} /> Limpiar Filtro (Clear)
              </button>
              <button 
                onClick={() => { setIsCompanyUDCOpen(false); setSelectedCompanyIndex(null); }}
                className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 border-b-2 border-slate-800 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
              >
                Cancelar
              </button>
            </div>

            {/* Table Listing */}
            <div className="flex-1 overflow-auto p-4 bg-white custom-audit-scroll">
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-[#e1e6f2] text-slate-800 border-b border-slate-400">
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-32">Cód. Compañía</th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase">Razón Social ERP</th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase text-center w-28">Moneda Base</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPANIES.map((item, idx) => {
                    const isSelected = selectedCompanyIndex === idx;

                    return (
                      <tr 
                        key={item}
                        onClick={() => setSelectedCompanyIndex(idx)}
                        onDoubleClick={() => {
                          setColSearchCompania(item);
                          setIsCompanyUDCOpen(false);
                          setSelectedCompanyIndex(null);
                        }}
                        className={`cursor-pointer transition-colors border-b border-slate-200 ${
                          isSelected 
                            ? 'bg-blue-100 hover:bg-blue-200 font-extrabold text-[#0b3c5d]' 
                            : 'hover:bg-slate-50/80'
                        }`}
                        title="Doble click para seleccionar"
                      >
                        <td className="px-3 py-3 border border-slate-200 font-mono font-black text-blue-800 select-none">{item === 'VIDA' ? '00100' : '00200'}</td>
                        <td className="px-3 py-3 border border-slate-200 font-extrabold uppercase select-none">COMPAÑÍA DE SEGUROS DE {item} INMOBILIARIA</td>
                        <td className="px-3 py-3 border border-slate-200 text-center font-mono font-bold select-none text-slate-600">CLP</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-[#e1e6f2] px-6 py-2 border-t border-slate-300 flex justify-between items-center text-[8px] text-slate-600 font-sans">
              <p className="font-extrabold uppercase">Base de datos: MUTU_PRD_XE_MUTU • Maestro F0010</p>
              <p className="italic">Visual Assist v9.2.1 • [Doble click para confirmar]</p>
            </div>
          </div>
        </div>
      )}

      {/* ERP Supplier Address Book Visual Assist modal */}
      {isSupplierUDCOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f0f4f9] rounded-xl w-full max-w-4xl shadow-2xl border-4 border-[#0b3c5d] overflow-hidden flex flex-col h-[75vh] animate-in zoom-in-95 font-mono text-xs">
            {/* ERP Classic Blue Header */}
            <div className="bg-[#0b3c5d] px-6 py-4 text-white flex justify-between items-center border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">P01012 - Visual Assist: Libro Maestro de Proveedores (F0101 Address Book)</h3>
                  <p className="text-[9px] text-slate-300 uppercase font-bold tracking-wider">AssetFlow Enterprise Supplier Master Directory</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsSupplierUDCOpen(false); setSelectedSupplierIndex(null); }} 
                className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Key Field Section Header Section */}
            <div className="bg-white border-b border-slate-300 p-4 grid grid-cols-3 gap-4 text-[10px] text-slate-800">
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-500 font-extrabold uppercase">TABLA PRINCIPAL</span>
                <span className="font-black text-[#0b3c5d]">F0101 - ADDRESS BOOK MASTER</span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-500 font-extrabold uppercase">SISTEMA INTEGRADO</span>
                <span className="font-black text-[#0b3c5d]">04 - CUENTAS POR PAGAR (AP)</span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-500 font-extrabold uppercase">CAMPO RETORNADO</span>
                <span className="font-extrabold text-slate-600">ALPH - RÁZON SOCIAL DE COMBATE</span>
              </div>
            </div>

            {/* Toolbar Buttons ERP style */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 flex justify-between items-center text-xs">
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const filtered = suppliers.filter(sup =>
                      !supplierSearchTerm ||
                      String(sup.name || "").toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                      String(sup.taxId || "").toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                      (sup.category && String(sup.category).toLowerCase().includes(supplierSearchTerm.toLowerCase()))
                    );
                    if (selectedSupplierIndex !== null && filtered[selectedSupplierIndex]) {
                      setColSearchProveedor(filtered[selectedSupplierIndex].name);
                      setIsSupplierUDCOpen(false);
                      setSelectedSupplierIndex(null);
                    } else {
                      alert("Por favor seleccione un proveedor en la grilla antes de confirmar.");
                    }
                  }}
                  className="bg-emerald-750 hover:bg-emerald-800 text-white px-4 py-2 border-b-2 border-emerald-950 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <CheckCircle size={12} className="stroke-[3]" /> Seleccionar (Select)
                </button>
                <button 
                  onClick={() => {
                    setColSearchProveedor('');
                    setIsSupplierUDCOpen(false);
                    setSelectedSupplierIndex(null);
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 border-b-2 border-rose-955 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <X size={12} /> Limpiar Filtro (Clear)
                </button>
                <button 
                  onClick={() => { setIsSupplierUDCOpen(false); setSelectedSupplierIndex(null); }}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 border-b-2 border-slate-800 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  Cancelar
                </button>
              </div>

              {/* Find/Filter */}
              <div className="relative">
                <input 
                  type="text" 
                  value={supplierSearchTerm}
                  onChange={(e) => {
                    setSupplierSearchTerm(e.target.value);
                    setSelectedSupplierIndex(null);
                  }}
                  placeholder="FILTRAR POR RUT, NOMBRE..." 
                  className="bg-white border-2 border-slate-300 rounded px-3 py-1.5 text-[9px] font-bold text-slate-800 outline-none w-56 focus:border-[#0b3c5d] uppercase"
                />
                <Search size={12} className="absolute right-2.5 top-2.5 text-slate-400" />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-4 bg-white custom-audit-scroll">
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-[#e1e6f2] text-slate-800 border-b border-slate-400">
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-32">RUT Proveedor</th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase">Razón Social / Comercial</th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-40">Giro / Categoría</th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-48">Contacto Directo</th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase text-center w-24">Riesgo UAF</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers
                    .filter(sup =>
                      !supplierSearchTerm ||
                      String(sup.name || "").toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                      String(sup.taxId || "").toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                      (sup.category && String(sup.category).toLowerCase().includes(supplierSearchTerm.toLowerCase()))
                    )
                    .map((item, idx) => {
                      const isSelected = selectedSupplierIndex === idx;

                      return (
                        <tr 
                          key={item.id}
                          onClick={() => setSelectedSupplierIndex(idx)}
                          onDoubleClick={() => {
                            setColSearchProveedor(item.name);
                            setIsSupplierUDCOpen(false);
                            setSelectedSupplierIndex(null);
                          }}
                          className={`cursor-pointer transition-colors border-b border-slate-200 ${
                            isSelected 
                              ? 'bg-blue-100 hover:bg-blue-200 font-extrabold text-[#0b3c5d]' 
                              : 'hover:bg-slate-50/80'
                          }`}
                          title="Doble click para seleccionar directamente"
                        >
                          <td className="px-3 py-2.5 border border-slate-200 font-mono font-bold select-none">{item.taxId}</td>
                          <td className="px-3 py-2.5 border border-slate-205 font-black text-slate-800 select-none uppercase">{item.name}</td>
                          <td className="px-3 py-2.5 border border-slate-202 select-none text-slate-600 text-[9px] uppercase">{item.category}</td>
                          <td className="px-3 py-2.5 border border-slate-202 text-slate-500 text-[9px] select-none truncate max-w-[150px]">{item.contactName || item.email || 'S/I'}</td>
                          <td className="px-3 py-2.5 border border-slate-200 text-center select-none font-bold">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] border font-black uppercase text-center block ${
                              item.dueDiligenceRisk === 'ALTO' ? 'bg-red-50 border-red-200 text-red-700' :
                              item.dueDiligenceRisk === 'MEDIO' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              'bg-green-50 border-green-200 text-green-700'
                            }`}>{item.dueDiligenceRisk || 'BAJO'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  
                  {suppliers.filter(sup =>
                    !supplierSearchTerm ||
                    String(sup.name || "").toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                    String(sup.taxId || "").toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                    (sup.category && String(sup.category).toLowerCase().includes(supplierSearchTerm.toLowerCase()))
                  ).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold italic">
                        No se encontraron proveedores para la búsqueda "{supplierSearchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-[#e1e6f2] px-6 py-2 border-t border-slate-300 flex justify-between items-center text-[8px] text-slate-600 font-sans">
              <p className="font-extrabold uppercase">Base de datos: MUTU_PRD_XE_MUTU • Maestro F0101 Address Book</p>
              <p className="italic">Visual Assist v9.2.1 • [Doble click para seleccionar]</p>
            </div>
          </div>
        </div>
      )}

      {/* ERP Category codes Visual Assist modal */}
      {isCategoryUDCOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f0f4f9] rounded-xl w-full max-w-2xl shadow-2xl border-4 border-[#0b3c5d] overflow-hidden flex flex-col h-[70vh] animate-in zoom-in-95 font-mono text-xs">
            {/* ERP Classic Blue Header */}
            <div className="bg-[#0b3c5d] px-6 py-4 text-white flex justify-between items-center border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">UDC 00/03 - Visual Assist: Catálogo de Categorías Contables</h3>
                  <p className="text-[9px] text-[#A3B8CC] uppercase font-bold tracking-wider">AssetFlow Enterprise Account Category Codes</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsCategoryUDCOpen(false); setSelectedCategoryIndex(null); }} 
                className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Config metadata fields */}
            <div className="bg-white border-b border-slate-300 p-4 grid grid-cols-2 gap-4 text-[10px] text-slate-800">
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-500 font-extrabold uppercase">MÓDULO ERP</span>
                <span className="font-black text-[#0b3c5d]">00 - GENERAL SYSTEMS</span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-500 font-extrabold uppercase">CÓDIGO DE ATRIBUTO (UDC)</span>
                <span className="font-black text-[#0b3c5d]">00 / 03 - FINANCIAL CATEGORIES</span>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 flex justify-between items-center text-xs">
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const finalCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
                    const filtered = finalCategories.filter(cat => 
                      !categorySearchTerm || cat.toLowerCase().includes(categorySearchTerm.toLowerCase())
                    );
                    if (selectedCategoryIndex !== null && filtered[selectedCategoryIndex]) {
                      setColSearchCategoria(filtered[selectedCategoryIndex]);
                      setIsCategoryUDCOpen(false);
                      setSelectedCategoryIndex(null);
                    } else {
                      alert("Por favor seleccione un código de la grilla antes de confirmar.");
                    }
                  }}
                  className="bg-emerald-750 hover:bg-emerald-800 text-white px-4 py-2 border-b-2 border-emerald-950 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <CheckCircle size={12} className="stroke-[3]" /> Seleccionar (Select)
                </button>
                <button 
                  onClick={() => {
                    setColSearchCategoria('');
                    setIsCategoryUDCOpen(false);
                    setSelectedCategoryIndex(null);
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 border-b-2 border-rose-955 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <X size={12} /> Limpiar Filtro (Clear)
                </button>
                <button 
                  onClick={() => { setIsCategoryUDCOpen(false); setSelectedCategoryIndex(null); }}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 border-b-2 border-slate-800 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  Cancelar
                </button>
              </div>

              {/* ERP Search Input */}
              <div className="relative">
                <input 
                  type="text" 
                  value={categorySearchTerm}
                  onChange={(e) => {
                    setCategorySearchTerm(e.target.value);
                    setSelectedCategoryIndex(null);
                  }}
                  placeholder="FILTRAR..." 
                  className="bg-white border-2 border-slate-300 rounded px-3 py-1.5 text-[9px] font-bold text-slate-800 outline-none w-56 focus:border-[#0b3c5d] uppercase"
                />
                <Search size={12} className="absolute right-2.5 top-2.5 text-slate-400" />
              </div>
            </div>

            {/* Table Listing */}
            <div className="flex-1 overflow-auto p-4 bg-white custom-audit-scroll">
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-[#e1e6f2] text-slate-800 border-b border-slate-400">
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-32">Código ERP</th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase">Descripción del Rubro</th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase text-center w-28">Imputable</th>
                  </tr>
                </thead>
                <tbody>
                  {(categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES)
                    .filter(cat => 
                      !categorySearchTerm || cat.toLowerCase().includes(categorySearchTerm.toLowerCase())
                    )
                    .map((item, idx) => {
                      const isSelected = selectedCategoryIndex === idx;

                      return (
                        <tr 
                          key={item}
                          onClick={() => setSelectedCategoryIndex(idx)}
                          onDoubleClick={() => {
                            setColSearchCategoria(item);
                            setIsCategoryUDCOpen(false);
                            setSelectedCategoryIndex(null);
                          }}
                          className={`cursor-pointer transition-colors border-b border-slate-200 ${
                            isSelected 
                              ? 'bg-blue-100 hover:bg-blue-200 font-extrabold text-[#0b3c5d]' 
                              : 'hover:bg-slate-50/80'
                          }`}
                          title="Doble click para seleccionar directamente"
                        >
                          <td className="px-3 py-2.5 border border-slate-200 font-mono font-black text-blue-800 select-none">{(100 + idx * 5).toString()}</td>
                          <td className="px-3 py-2.5 border border-slate-200 font-black text-slate-800 select-none uppercase">{item}</td>
                          <td className="px-3 py-2.5 border border-slate-200 text-center font-bold text-emerald-800 select-none text-[9px]">SÍ [X]</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-[#e1e6f2] px-6 py-2 border-t border-slate-300 flex justify-between items-center text-[8px] text-slate-600 font-sans">
              <p className="font-extrabold uppercase">Base de datos: MUTU_PRD_XE_MUTU • Maestro ERP UDC 00/03</p>
              <p className="italic">Visual Assist v9.2.1 • [Doble click para seleccionar]</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpreadsheetSheet;
