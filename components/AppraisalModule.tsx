
import React, { useState, useMemo, useRef } from 'react';
import { Appraisal, Property, AppraisalRole } from '../types';
import { 
  Calculator, Search, Plus, Trash2, X, FileUp, Database, 
  CheckCircle2, AlertTriangle, Loader2, ArrowRight, Table, 
  Sparkles, Eye, FileText, Building2, MapPin, Calendar,
  TrendingUp, DollarSign, Layers, Filter, ChevronRight, ChevronDown, Save, Paperclip
} from 'lucide-react';
import { extractAppraisalData } from '../geminiService';
import { uploadFile, openDocumentSecurely } from '@/lib/storage';
import { useNotification } from './NotificationProvider';
import { exportToExcel } from '../lib/excelExport';

const checkAppraisalUniqueConstraint = (
  newAppraisal: Appraisal,
  existingAppraisals: Appraisal[]
): { isDuplicate: boolean; duplicateAppraisal?: Appraisal } => {
  if (!newAppraisal.appraisalDate) return { isDuplicate: false };
  
  const newYear = new Date(newAppraisal.appraisalDate).getFullYear();
  if (isNaN(newYear)) return { isDuplicate: false };

  const newAppraiserNorm = (newAppraisal.appraiserName || '').trim().toLowerCase();
  const newRoleNorm = (newAppraisal.propertyRole || '').trim().toLowerCase();
  
  const duplicate = existingAppraisals.find(existing => {
    // Skip if we are editing the SAME appraisal
    if (existing.id === newAppraisal.id) return false;

    const existingYear = new Date(existing.appraisalDate).getFullYear();
    const existingAppraiserNorm = (existing.appraiserName || '').trim().toLowerCase();
    const existingRoleNorm = (existing.propertyRole || '').trim().toLowerCase();

    // Match year
    if (newYear !== existingYear) return false;

    // Match appraiser
    if (newAppraiserNorm !== existingAppraiserNorm) return false;

    // Match property by propertyId or propertyRole
    const matchesProperty = 
      (newAppraisal.propertyId && existing.propertyId && newAppraisal.propertyId === existing.propertyId) ||
      (newRoleNorm && existingRoleNorm && newRoleNorm === existingRoleNorm);

    return matchesProperty;
  });

  return {
    isDuplicate: !!duplicate,
    duplicateAppraisal: duplicate
  };
};

interface AppraisalModuleProps {
  appraisals: Appraisal[];
  properties: Property[];
  currentUser: string;
  onSave: (appraisal: Appraisal) => void;
  onDelete: (id: string) => void;
  onUpdateProperty: (property: Property) => void;
}

const AppraisalModule: React.FC<AppraisalModuleProps> = ({ 
  appraisals, 
  properties, 
  currentUser, 
  onSave, 
  onDelete,
  onUpdateProperty
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppraisal, setEditingAppraisal] = useState<Appraisal | null>(null);
  const [expandedAppraisalId, setExpandedAppraisalId] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'BY_ROLE' | 'CONSOLIDATED'>('BY_ROLE');
  const [formRoles, setFormRoles] = useState<AppraisalRole[]>([]);
  const [viewingAppraisal, setViewingAppraisal] = useState<Appraisal | null>(null);
  const [manualDocBase64, setManualDocBase64] = useState<string>('');
  const [manualDocName, setManualDocName] = useState<string>('');
  const manualFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form roles and existing document when editing
  React.useEffect(() => {
    if (isFormOpen) {
      if (editingAppraisal) {
        setFormRoles(editingAppraisal.roles || []);
        setManualDocBase64(editingAppraisal.documentUrl || '');
        setManualDocName(editingAppraisal.documentName || '');
      } else {
        setFormRoles([]);
        setManualDocBase64('');
        setManualDocName('');
      }
    }
  }, [editingAppraisal, isFormOpen]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [extractedDataList, setExtractedDataList] = useState<any[]>([]);
  const [currentExtractionIndex, setCurrentExtractionIndex] = useState(0);
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [showBatchSummary, setShowBatchSummary] = useState(false);
  const [batchProcessedData, setBatchProcessedData] = useState<Appraisal[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractedData = extractedDataList[currentExtractionIndex] || null;

  // Stats
  const stats = useMemo(() => {
    const total = appraisals.length;
    const totalCLP = appraisals.reduce((sum, a) => sum + (a.marketValueCLP || 0), 0);
    const totalUF = appraisals.reduce((sum, a) => sum + (a.marketValueUF || 0), 0);
    const pending = appraisals.filter(a => a.status === 'PENDIENTE').length;

    return { total, totalCLP, totalUF, pending };
  }, [appraisals]);

  const filteredAppraisals = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return appraisals.filter(a => 
      a.address.toLowerCase().includes(term) ||
      a.commune.toLowerCase().includes(term) ||
      a.propertyRole?.toLowerCase().includes(term) ||
      a.appraiserName.toLowerCase().includes(term) ||
      (a.roles && a.roles.some(r => r.role.toLowerCase().includes(term)))
    );
  }, [appraisals, searchTerm]);

  // Flattened ROL rows for "1 ROL por Registro" view mode
  const flatRoleRows = useMemo(() => {
    const rows: {
      id: string;
      appraisal: Appraisal;
      roleNumber: string;
      roleIndex: number;
      totalRolesInAppraisal: number;
      valueCLP: number;
      valueUF: number;
      isProportional: boolean;
      roleDetail?: AppraisalRole;
    }[] = [];

    filteredAppraisals.forEach((appraisal) => {
      if (appraisal.roles && appraisal.roles.length > 0) {
        appraisal.roles.forEach((r, idx) => {
          const hasSpecificCLP = r.valueCLP !== undefined && r.valueCLP > 0;
          const valCLP = hasSpecificCLP 
            ? r.valueCLP! 
            : Math.round(appraisal.marketValueCLP / appraisal.roles!.length);

          const hasSpecificUF = r.valueUF !== undefined && r.valueUF > 0;
          const valUF = hasSpecificUF 
            ? r.valueUF! 
            : Number((appraisal.marketValueUF / appraisal.roles!.length).toFixed(2));

          rows.push({
            id: `${appraisal.id}-role-${idx}-${r.role}`,
            appraisal,
            roleNumber: r.role,
            roleIndex: idx + 1,
            totalRolesInAppraisal: appraisal.roles!.length,
            valueCLP: valCLP,
            valueUF: valUF,
            isProportional: !hasSpecificCLP,
            roleDetail: r
          });
        });
      } else {
        rows.push({
          id: `${appraisal.id}-single`,
          appraisal,
          roleNumber: appraisal.propertyRole || 'S/R',
          roleIndex: 1,
          totalRolesInAppraisal: 1,
          valueCLP: appraisal.marketValueCLP,
          valueUF: appraisal.marketValueUF,
          isProportional: false
        });
      }
    });

    return rows;
  }, [filteredAppraisals]);

  const handleExportExcel = () => {
    if (filteredAppraisals.length === 0) {
      alert('No hay tasaciones para exportar.');
      return;
    }

    if (viewMode === 'BY_ROLE') {
      const dataToExport = flatRoleRows.map(row => ({
        'ROL': row.roleNumber,
        'N° ROL': `${row.roleIndex} de ${row.totalRolesInAppraisal}`,
        'Dirección Propiedad': row.appraisal.address,
        'Comuna': row.appraisal.commune,
        'Tasador': row.appraisal.appraiserName,
        'Fecha Tasación': row.appraisal.appraisalDate,
        'Valor CLP ROL': Math.round(row.valueCLP),
        'Valor UF ROL': row.valueUF,
        'Tipo Asignación': row.isProportional ? 'Proporcional' : 'Directa ROL',
        'Estado': row.appraisal.status
      }));
      exportToExcel(dataToExport, `Reporte_Tasaciones_Por_ROL_${new Date().toISOString().split('T')[0]}`, 'Tasaciones_por_ROL');
    } else {
      const dataToExport = filteredAppraisals.map(a => ({
        'ROL Principal / ROLes': a.roles?.map(r => r.role).join(', ') || a.propertyRole || 'N/A',
        'Cantidad ROLes': a.roles?.length || 1,
        'Dirección': a.address,
        'Comuna': a.commune,
        'Tasador': a.appraiserName,
        'Fecha Tasación': a.appraisalDate,
        'Valor Comercial Total CLP': a.marketValueCLP || 0,
        'Valor Comercial Total UF': a.marketValueUF || 0,
        'Estado': a.status
      }));
      exportToExcel(dataToExport, `Reporte_Tasaciones_Consolidado_${new Date().toISOString().split('T')[0]}`, 'Tasaciones');
    }
  };

    const { notify, dismiss } = useNotification();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsExtracting(true);
    setUploadProgress({ current: 0, total: files.length });
    let loadingId = notify(`Procesando 0 de ${files.length} documento(s) (0%)...`, 'loading', 0);
    const results: any[] = [];

    const totalCount = files.length;
    let completedCount = 0;

    // Helper to process a single file with raw base64 and extractAppraisalData
    const processAppraisalFile = async (file: File) => {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        let data: any = null;
        try {
          data = await extractAppraisalData(base64, 0, file.name);
        } catch (aiErr) {
          console.warn(`Extracción IA de tasación no disponible para ${file.name}, aplicando plantilla base.`);
        }

        if (data && !data.error) {
          return {
            ...data,
            fileName: file.name,
            fileUrl: URL.createObjectURL(file),
            fileBase64: base64,
            originalFile: file
          };
        }

        // Fallback seguro: conservar el archivo PDF/Imagen para que el usuario complete o confirme los campos sin perder el documento
        return {
          address: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
          commune: 'Santiago',
          propertyRole: '',
          roles: [],
          appraiserName: 'Por Confirmar',
          appraisalDate: new Date().toISOString().split('T')[0],
          marketValueCLP: 0,
          marketValueUF: 0,
          surfaceAreaLand: 0,
          surfaceAreaBuilt: 0,
          confidenceScore: 70,
          fileName: file.name,
          fileUrl: URL.createObjectURL(file),
          fileBase64: base64,
          originalFile: file
        };
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
      return null;
    };

    // Concurrency queue
    const queue = [...files];
    const concurrency = Math.min(3, files.length);

    const worker = async () => {
      while (queue.length > 0) {
        const file = queue.shift() as File;
        if (!file) break;

        const res = await processAppraisalFile(file);
        if (res) {
          results.push(res);
        }

        completedCount++;
        const percent = Math.round((completedCount / totalCount) * 100);
        setUploadProgress({ current: completedCount, total: totalCount });

        // Dynamically update notification with percentage
        dismiss(loadingId);
        loadingId = notify(`Procesando ${completedCount} de ${totalCount} documento(s) (${percent}%)...`, 'loading', 0);
      }
    };

    // Spin up concurrent workers
    const workers = Array(concurrency).fill(null).map(() => worker());
    await Promise.all(workers);

    dismiss(loadingId);

    if (results.length > 0) {
      setExtractedDataList(results);
      setCurrentExtractionIndex(0);
      setShowExtractionModal(true);
      notify(`Procesamiento finalizado: ${results.length} documentos listos para revisión`, 'success');
    } else {
      notify("No se pudo extraer información de los documentos seleccionados.", 'error');
    }
    setIsExtracting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmExtraction = async () => {
    if (!extractedData) return;

    const loadingId = notify(`Guardando tasación y subiendo documento...`, 'loading', 0);
    let finalDocumentUrl = extractedData.fileBase64 || extractedData.fileUrl;
    
    // Upload to Firebase Storage if we have the original file
    if (extractedData.originalFile) {
      try {
        const path = `appraisals/${crypto.randomUUID()}_${extractedData.fileName}`;
        finalDocumentUrl = await uploadFile(extractedData.originalFile, path);
      } catch (error) {
        console.error("Error uploading appraisal document:", error);
        notify("Error al subir el documento a la bóveda digital", 'error');
        if (extractedData.fileBase64) {
          finalDocumentUrl = extractedData.fileBase64;
        }
      }
    }

    const { originalFile, fileBase64, fileUrl, ...cleanExtractedMetadata } = extractedData;

    const newAppraisal: Appraisal = {
      id: crypto.randomUUID(),
      propertyId: '', 
      propertyRole: extractedData.propertyRole || '',
      roles: extractedData.roles || [],
      address: extractedData.address || '',
      commune: extractedData.commune || '',
      appraiserName: extractedData.appraiserName || 'Desconocido',
      appraisalDate: extractedData.appraisalDate || new Date().toISOString().split('T')[0],
      marketValueCLP: extractedData.marketValueCLP || 0,
      marketValueUF: extractedData.marketValueUF || 0,
      ufValue: extractedData.ufValue,
      ufDate: extractedData.ufDate,
      surfaceAreaLand: extractedData.surfaceAreaLand || 0,
      surfaceAreaBuilt: extractedData.surfaceAreaBuilt || 0,
      landValueCLP: extractedData.landValueCLP,
      builtValueCLP: extractedData.builtValueCLP,
      documentUrl: finalDocumentUrl,
      documentName: extractedData.fileName,
      status: 'VIGENTE',
      timestamp: Date.now(),
      userCreator: currentUser,
      extractedData: cleanExtractedMetadata,
      confidenceScore: extractedData.confidenceScore || 80
    };

    const yearExtracted = new Date(newAppraisal.appraisalDate).getFullYear();
    const dupCheck = checkAppraisalUniqueConstraint(newAppraisal, appraisals);
    if (dupCheck.isDuplicate) {
      dismiss(loadingId);
      notify(`No se puede guardar: Ya existe una tasación para la propiedad (ROL ${newAppraisal.propertyRole}) por el tasador '${newAppraisal.appraiserName}' para el año ${yearExtracted}.`, 'error');
      return;
    }

    const rolesToMatch = newAppraisal.roles && newAppraisal.roles.length > 0 
      ? newAppraisal.roles.map(r => r.role)
      : [newAppraisal.propertyRole].filter(Boolean);

    rolesToMatch.forEach(roleStr => {
      const matchingProperty = properties.find(p => p.role === roleStr);
      if (matchingProperty) {
        onUpdateProperty({
          ...matchingProperty,
          lastAppraisalDate: newAppraisal.appraisalDate,
          appraisalDocumentUrl: newAppraisal.documentUrl,
          appraisalDocumentName: newAppraisal.documentName,
          valueCLP: newAppraisal.roles?.find(r => r.role === roleStr)?.valueCLP || newAppraisal.marketValueCLP,
          valueUF: newAppraisal.roles?.find(r => r.role === roleStr)?.valueUF || newAppraisal.marketValueUF
        });
      }
    });

    onSave(newAppraisal);
    setBatchProcessedData(prev => [...prev, newAppraisal]);
    dismiss(loadingId);
    notify("Tasación guardada correctamente", 'success');
    
    if (currentExtractionIndex < extractedDataList.length - 1) {
      setCurrentExtractionIndex(prev => prev + 1);
    } else {
      setShowExtractionModal(false);
      setExtractedDataList([]);
      setShowBatchSummary(true);
    }
  };

  const handleDiscardExtraction = () => {
    if (currentExtractionIndex < extractedDataList.length - 1) {
      setCurrentExtractionIndex(prev => prev + 1);
    } else {
      setShowExtractionModal(false);
      setExtractedDataList([]);
      if (batchProcessedData.length > 0) {
        setShowBatchSummary(true);
      }
    }
  };

  const handleFinalizeBatch = () => {
    setShowBatchSummary(false);
    setBatchProcessedData([]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-950 tracking-tight flex items-center gap-3">
              <Calculator className="text-indigo-600" size={28} />
              Gestión de Tasaciones
            </h2>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Control y extracción inteligente de informes de tasación inmobiliaria
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,image/*" 
              multiple
              onChange={handleFileUpload}
            />
            <div className="flex flex-col items-end gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                {isExtracting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                Carga Inteligente
              </button>
              {isExtracting && (
                <div className="flex flex-col items-end gap-1 w-full">
                  <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-black text-indigo-600 font-mono">
                    {uploadProgress.current} / {uploadProgress.total} ({Math.round((uploadProgress.current / (uploadProgress.total || 1)) * 100)}%)
                  </span>
                </div>
              )}
            </div>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-100"
              title="Exportar grilla actual a formato Excel (.xlsx)"
            >
              <FileUp size={18} />
              Exportar Excel
            </button>
            <button 
              onClick={() => {
                setEditingAppraisal(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-2 bg-slate-950 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200"
            >
              <Plus size={18} />
              Nueva Tasación
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <FileText size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tasaciones</span>
            </div>
            <div className="text-2xl font-black text-slate-950">{stats.total}</div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <DollarSign size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total (CLP)</span>
            </div>
            <div className="text-2xl font-black text-slate-950">
              ${stats.totalCLP.toLocaleString('es-CL')}
            </div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                <TrendingUp size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total (UF)</span>
            </div>
            <div className="text-2xl font-black text-slate-950">
              {stats.totalUF.toLocaleString('es-CL')} UF
            </div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <CheckCircle2 size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes</span>
            </div>
            <div className="text-2xl font-black text-slate-950">{stats.pending}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 flex flex-col gap-6 shrink-0">
        {/* Filters and View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[280px] relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Buscar por dirección, comuna, ROL individual o tasador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>

          {/* View Mode Toggle Switch */}
          <div className="flex items-center gap-1.5 bg-[#E2ECF5] p-1.5 rounded-2xl border border-[#B0C4D6]">
            <button
              type="button"
              onClick={() => setViewMode('BY_ROLE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'BY_ROLE' 
                  ? 'bg-[#0B3C5D] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Muestra 1 ROL por registro individual para evitar filas gigantes"
            >
              <Layers size={15} />
              <span>1 ROL por Registro ({flatRoleRows.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CONSOLIDATED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'CONSOLIDATED' 
                  ? 'bg-[#0B3C5D] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Agrupa todos los ROLes por informe de tasación general"
            >
              <Table size={15} />
              <span>Consolidado por Informe ({filteredAppraisals.length})</span>
            </button>
          </div>

          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm">
            <Filter size={18} />
            Filtros
          </button>
        </div>

        {/* ERP-Style High-Density Grid Container */}
        <div className="bg-[#FAFBFD] border border-[#91A6BA] rounded-sm shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-[#91A6BA]">
              <thead>
                <tr className="bg-[#E2ECF5] border-b border-[#91A6BA]">
                  <th className="px-4 py-3 text-[10px] font-black text-[#143B57] uppercase tracking-wider border border-[#B0C4D6]">Propiedad / Dirección</th>
                  <th className="px-4 py-3 text-[10px] font-black text-[#143B57] uppercase tracking-wider text-center border border-[#B0C4D6]">ROL</th>
                  <th className="px-4 py-3 text-[10px] font-black text-[#143B57] uppercase tracking-wider text-center border border-[#B0C4D6]">Fecha</th>
                  <th className="px-4 py-3 text-[10px] font-black text-[#143B57] uppercase tracking-wider text-right border border-[#B0C4D6]">Valor CLP</th>
                  <th className="px-4 py-3 text-[10px] font-black text-[#143B57] uppercase tracking-wider text-right border border-[#B0C4D6]">Valor UF</th>
                  <th className="px-4 py-3 text-[10px] font-black text-[#143B57] uppercase tracking-wider text-center border border-[#B0C4D6]">Estado</th>
                  <th className="px-4 py-3 text-[10px] font-black text-[#143B57] uppercase tracking-wider text-right border border-[#B0C4D6]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D2E0EE]">
                {viewMode === 'BY_ROLE' ? (
                  flatRoleRows.length > 0 ? (
                    flatRoleRows.map((row) => (
                      <React.Fragment key={row.id}>
                        <tr className="hover:bg-[#F4F7F9] transition-colors group">
                          <td className="px-4 py-2.5 border border-[#D2E0EE]">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform shrink-0">
                                <Building2 size={15} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">{row.appraisal.address}</div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                                  {row.appraisal.commune} • {row.appraisal.appraiserName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center border border-[#D2E0EE]">
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[11px] font-black tracking-wider font-mono border border-indigo-200 shadow-xs">
                                {row.roleNumber}
                              </span>
                              {row.totalRolesInAppraisal > 1 && (
                                <span className="text-[8.5px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 font-mono">
                                  ROL {row.roleIndex} de {row.totalRolesInAppraisal}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center border border-[#D2E0EE]">
                            <div className="text-xs font-semibold text-slate-700 font-mono">
                              {new Date(row.appraisal.appraisalDate).toLocaleDateString('es-CL')}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right border border-[#D2E0EE]">
                            <div className="text-xs font-bold text-slate-900 font-mono">
                              ${Math.round(row.valueCLP).toLocaleString('es-CL')}
                            </div>
                            {row.isProportional && row.totalRolesInAppraisal > 1 && (
                              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono mt-0.5">
                                (Prop. 1/{row.totalRolesInAppraisal})
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right border border-[#D2E0EE]">
                            <div className="text-xs font-bold text-indigo-700 font-mono">
                              {row.valueUF.toLocaleString('es-CL', { maximumFractionDigits: 2 })} UF
                            </div>
                            {row.appraisal.ufValue && (
                              <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 font-mono">
                                UF: ${row.appraisal.ufValue.toLocaleString('es-CL')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center border border-[#D2E0EE]">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider ${
                              row.appraisal.status === 'VIGENTE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              row.appraisal.status === 'VENCIDA' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              row.appraisal.status === 'OBSOLETA' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                              'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {row.appraisal.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right border border-[#D2E0EE]">
                            <div className="flex items-center justify-end gap-1.5">
                              {row.roleDetail && (row.roleDetail.landValueCLP !== undefined || row.roleDetail.builtValueCLP !== undefined) && (
                                <button 
                                  onClick={() => setExpandedRowId(expandedRowId === row.id ? null : row.id)}
                                  className={`p-1.5 rounded transition-all ${expandedRowId === row.id ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                  title="Ver Desglose de Terreno y Edificación para este ROL"
                                >
                                  <ChevronDown size={14} className={`transition-transform duration-200 ${expandedRowId === row.id ? 'rotate-180' : ''}`} />
                                </button>
                              )}
                              {row.appraisal.documentUrl && (
                                <button 
                                  onClick={() => setViewingAppraisal(row.appraisal)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                  title="Ver Copia Digital"
                                >
                                  <Eye size={14} />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setEditingAppraisal(row.appraisal);
                                  setIsFormOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                title="Editar Tasación"
                              >
                                <FileText size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm(`¿Eliminar la tasación de ${row.appraisal.address}?`)) onDelete(row.appraisal.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedRowId === row.id && row.roleDetail && (
                          <tr className="bg-indigo-50/20">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="bg-[#FAFBFD] border border-[#91A6BA] rounded-sm overflow-hidden shadow-xs animate-in slide-in-from-top-2 duration-150">
                                <div className="bg-[#0B3C5D] px-4 py-1.5 flex items-center justify-between">
                                  <span className="text-[10px] font-black text-white uppercase tracking-widest font-mono">Desglose ROL {row.roleNumber}</span>
                                  <span className="text-[10px] font-bold text-[#FFCC00] uppercase tracking-wider font-mono">Superficie y Valores</span>
                                </div>
                                <table className="w-full text-left border-collapse border border-[#91A6BA] text-xs">
                                  <thead>
                                    <tr className="bg-[#E2ECF5]">
                                      <th className="px-3 py-1.5 text-[10px] font-black text-[#143B57] uppercase tracking-wider border border-[#B0C4D6]">Componente</th>
                                      <th className="px-3 py-1.5 text-[10px] font-black text-[#143B57] uppercase tracking-wider border border-[#B0C4D6] text-center">Superficie (m²)</th>
                                      <th className="px-3 py-1.5 text-[10px] font-black text-[#143B57] uppercase tracking-wider border border-[#B0C4D6] text-right">Valor CLP</th>
                                      <th className="px-3 py-1.5 text-[10px] font-black text-[#143B57] uppercase tracking-wider border border-[#B0C4D6] text-right">Valor UF</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 font-mono">
                                    {row.roleDetail.landValueCLP !== undefined && (
                                      <tr>
                                        <td className="px-3 py-1.5 border border-slate-200 font-sans font-bold text-slate-700">Terreno</td>
                                        <td className="px-3 py-1.5 border border-slate-200 text-center font-bold">{row.roleDetail.surfaceAreaLand || 0} m²</td>
                                        <td className="px-3 py-1.5 border border-slate-200 text-right font-bold">${row.roleDetail.landValueCLP?.toLocaleString('es-CL')}</td>
                                        <td className="px-3 py-1.5 border border-slate-200 text-right font-bold text-indigo-700">{row.roleDetail.landValueUF?.toLocaleString('es-CL')} UF</td>
                                      </tr>
                                    )}
                                    {row.roleDetail.builtValueCLP !== undefined && (
                                      <tr>
                                        <td className="px-3 py-1.5 border border-slate-200 font-sans font-bold text-slate-700">Edificación</td>
                                        <td className="px-3 py-1.5 border border-slate-200 text-center font-bold">{row.roleDetail.surfaceAreaBuilt || 0} m²</td>
                                        <td className="px-3 py-1.5 border border-slate-200 text-right font-bold">${row.roleDetail.builtValueCLP?.toLocaleString('es-CL')}</td>
                                        <td className="px-3 py-1.5 border border-slate-200 text-right font-bold text-indigo-700">{row.roleDetail.builtValueUF?.toLocaleString('es-CL')} UF</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                            <Calculator size={32} />
                          </div>
                          <div>
                            <p className="text-slate-950 font-bold">No se encontraron registros de ROL</p>
                            <p className="text-slate-400 text-xs mt-1">Intenta con otro término de búsqueda</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                ) : (
                  filteredAppraisals.length > 0 ? (
                    filteredAppraisals.map((appraisal) => (
                      <React.Fragment key={appraisal.id}>
                        <tr className="hover:bg-[#F4F7F9] transition-colors group">
                          <td className="px-4 py-3 border border-[#D2E0EE]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform shrink-0">
                                <Building2 size={16} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900">{appraisal.address}</div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                                  {appraisal.commune} • {appraisal.appraiserName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center border border-[#D2E0EE]">
                            {appraisal.roles && appraisal.roles.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center max-w-[220px]">
                                {appraisal.roles.map((r, idx) => (
                                  <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-black border border-indigo-100 font-mono">
                                    {r.role}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold tracking-wider font-mono border border-slate-200">
                                {appraisal.propertyRole || 'S/R'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center border border-[#D2E0EE]">
                            <div className="text-xs font-semibold text-slate-700 font-mono">
                              {new Date(appraisal.appraisalDate).toLocaleDateString('es-CL')}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right border border-[#D2E0EE]">
                            <div className="text-xs font-bold text-slate-900 font-mono">
                              ${appraisal.marketValueCLP.toLocaleString('es-CL')}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right border border-[#D2E0EE]">
                            <div className="text-xs font-bold text-indigo-700 font-mono">
                              {appraisal.marketValueUF.toLocaleString('es-CL')} UF
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center border border-[#D2E0EE]">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider ${
                              appraisal.status === 'VIGENTE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              appraisal.status === 'VENCIDA' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              appraisal.status === 'OBSOLETA' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                              'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {appraisal.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right border border-[#D2E0EE]">
                            <div className="flex items-center justify-end gap-1.5">
                              {appraisal.roles && appraisal.roles.length > 0 && (
                                <button 
                                  onClick={() => setExpandedAppraisalId(expandedAppraisalId === appraisal.id ? null : appraisal.id)}
                                  className={`p-1.5 rounded transition-all ${expandedAppraisalId === appraisal.id ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                  title="Ver Sub-registros"
                                >
                                  <ChevronDown size={14} className={`transition-transform duration-200 ${expandedAppraisalId === appraisal.id ? 'rotate-180' : ''}`} />
                                </button>
                              )}
                              {appraisal.documentUrl && (
                                <button 
                                  onClick={() => setViewingAppraisal(appraisal)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                  title="Ver Copia Digital"
                                >
                                  <Eye size={14} />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setEditingAppraisal(appraisal);
                                  setIsFormOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                title="Editar"
                              >
                                <FileText size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm('¿Eliminar esta tasación?')) onDelete(appraisal.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                            <Calculator size={32} />
                          </div>
                          <div>
                            <p className="text-slate-950 font-bold">No se encontraron tasaciones</p>
                            <p className="text-slate-400 text-xs mt-1">Carga un informe de tasación para comenzar</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Extraction Confirmation Modal */}
      {showExtractionModal && extractedData && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-50/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-950 tracking-tight">Confirmar Extracción IA</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-0.5">
                    Documento {currentExtractionIndex + 1} de {extractedDataList.length}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleDiscardExtraction}
                className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-950"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dirección</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950">
                    {extractedData.address}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Comuna</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950">
                    {extractedData.commune}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">ROL SII</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950">
                    {extractedData.propertyRole || 'No detectado'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha Tasación</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950">
                    {extractedData.appraisalDate}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Comercial (CLP)</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black text-indigo-600">
                    ${extractedData.marketValueCLP?.toLocaleString('es-CL')}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Comercial (UF)</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black text-indigo-600">
                    {extractedData.marketValueUF?.toLocaleString('es-CL')} UF
                  </div>
                </div>
                {extractedData.ufValue && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor UF Aplicado</label>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 text-sm font-bold text-indigo-600 flex justify-between items-center">
                      <span>${extractedData.ufValue.toLocaleString('es-CL')}</span>
                      <span className="text-[10px] opacity-70">{extractedData.ufDate ? new Date(extractedData.ufDate).toLocaleDateString('es-CL') : ''}</span>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sup. Terreno (m2)</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950">
                    {extractedData.surfaceAreaLand || 0} m2
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sup. Construida (m2)</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950">
                    {extractedData.surfaceAreaBuilt || 0} m2
                  </div>
                </div>
              </div>

              {extractedData.roles && extractedData.roles.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Roles Individuales Detectados</label>
                  <div className="grid grid-cols-1 gap-2">
                    {extractedData.roles.map((r: any, idx: number) => (
                      <div key={idx} className="bg-indigo-50/50 border border-indigo-100 rounded-2xl px-4 py-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-indigo-900">{r.role}</span>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                              {r.surfaceAreaBuilt || 0} m2 const. • {r.surfaceAreaLand || 0} m2 terr.
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-indigo-600">${r.valueCLP?.toLocaleString('es-CL')}</div>
                            <div className="text-[10px] font-bold text-indigo-400">{r.valueUF?.toLocaleString('es-CL')} UF</div>
                          </div>
                        </div>
                        {(r.landValueCLP || r.builtValueCLP) && (
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-indigo-100/50">
                            <div>
                              <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Valor Terreno</div>
                              <div className="text-[10px] font-bold text-slate-600">
                                ${r.landValueCLP?.toLocaleString('es-CL')} ({r.landValueUF?.toLocaleString('es-CL')} UF)
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Valor Construcción</div>
                              <div className="text-[10px] font-bold text-slate-600">
                                ${r.builtValueCLP?.toLocaleString('es-CL')} ({r.builtValueUF?.toLocaleString('es-CL')} UF)
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-4">
                <div className="p-2 bg-white rounded-xl text-amber-600 h-fit shadow-sm">
                  <Database size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Vinculación con Propiedad</h4>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    {extractedData.propertyRole && properties.some(p => p.role === extractedData.propertyRole) 
                      ? `Se encontró una propiedad coincidente con el ROL ${extractedData.propertyRole}. Los valores se actualizarán automáticamente.`
                      : "No se encontró una propiedad coincidente en el maestro. Se creará un registro de tasación independiente."}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={handleDiscardExtraction}
                className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-950 transition-colors"
              >
                Descartar {extractedDataList.length > 1 ? 'este' : ''}
              </button>
              <button 
                onClick={handleConfirmExtraction}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
              >
                {currentExtractionIndex < extractedDataList.length - 1 ? 'Confirmar y Siguiente' : 'Confirmar y Finalizar'}
                <CheckCircle2 size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Form Modal */}
      {showBatchSummary && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6 shadow-inner">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-950 tracking-tight mb-2">Procesamiento Completado</h3>
              <p className="text-slate-500 font-medium mb-8">
                Se han procesado exitosamente <span className="text-indigo-600 font-bold">{batchProcessedData.length}</span> documentos. 
                Toda la información ha sido integrada en la base de datos de tasaciones y propiedades.
              </p>

              <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left max-h-[200px] overflow-y-auto custom-scrollbar">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Resumen de Carga</h4>
                <div className="space-y-3">
                  {batchProcessedData.map((appraisal, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span className="font-bold text-slate-700 truncate max-w-[200px]">{appraisal.address}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-xs">{appraisal.propertyRole}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleFinalizeBatch}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-3"
              >
                Guardar Permanentemente y Finalizar
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white">
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-950 tracking-tight">
                    {editingAppraisal ? 'Editar Tasación' : 'Nueva Tasación Manual'}
                  </h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-0.5">Completa los datos técnicos de la propiedad</p>
                </div>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-950"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data: any = Object.fromEntries(formData.entries());
              
              const appraisal: Appraisal = {
                id: editingAppraisal?.id || crypto.randomUUID(),
                propertyId: editingAppraisal?.propertyId || '',
                address: data.address,
                commune: data.commune,
                propertyRole: data.propertyRole,
                roles: formRoles.filter(r => r.role.trim() !== ''),
                appraiserName: data.appraiserName,
                appraisalDate: data.appraisalDate,
                marketValueCLP: Number(data.marketValueCLP),
                marketValueUF: Number(data.marketValueUF),
                ufValue: data.ufValue ? Number(data.ufValue) : undefined,
                ufDate: data.ufDate || undefined,
                surfaceAreaLand: Number(data.surfaceAreaLand),
                surfaceAreaBuilt: Number(data.surfaceAreaBuilt),
                status: data.status,
                documentUrl: manualDocBase64 || editingAppraisal?.documentUrl,
                documentName: manualDocName || editingAppraisal?.documentName,
                timestamp: editingAppraisal?.timestamp || Date.now(),
                userCreator: currentUser,
              };

              const yearSubmitted = new Date(appraisal.appraisalDate).getFullYear();
              const dupCheck = checkAppraisalUniqueConstraint(appraisal, appraisals);
              if (dupCheck.isDuplicate) {
                notify(`No se puede guardar: Ya existe una tasación para la propiedad (ROL ${appraisal.propertyRole}) por el tasador '${appraisal.appraiserName}' para el año ${yearSubmitted}.`, 'error');
                return;
              }

              // Update property if linked (single role or multiple)
              const rolesToSync = appraisal.roles && appraisal.roles.length > 0 
                ? appraisal.roles.map(r => r.role)
                : [appraisal.propertyRole].filter(Boolean);

              rolesToSync.forEach(roleStr => {
                const matchingProperty = properties.find(p => p.role === roleStr);
                if (matchingProperty) {
                  onUpdateProperty({
                    ...matchingProperty,
                    lastAppraisalDate: appraisal.appraisalDate,
                    appraisalDocumentUrl: appraisal.documentUrl || matchingProperty.appraisalDocumentUrl,
                    appraisalDocumentName: appraisal.documentName || matchingProperty.appraisalDocumentName,
                    valueCLP: appraisal.roles?.find(r => r.role === roleStr)?.valueCLP || appraisal.marketValueCLP,
                    valueUF: appraisal.roles?.find(r => r.role === roleStr)?.valueUF || appraisal.marketValueUF
                  });
                }
              });

              onSave(appraisal);
              notify("Tasación y respaldo digital guardados correctamente", "success");
              setIsFormOpen(false);
            }} className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dirección</label>
                  <input 
                    name="address"
                    defaultValue={editingAppraisal?.address}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Comuna</label>
                  <input 
                    name="commune"
                    defaultValue={editingAppraisal?.commune}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">ROL SII</label>
                  <input 
                    name="propertyRole"
                    defaultValue={editingAppraisal?.propertyRole}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tasador</label>
                  <input 
                    name="appraiserName"
                    defaultValue={editingAppraisal?.appraiserName}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha Tasación</label>
                  <input 
                    name="appraisalDate"
                    type="date"
                    defaultValue={editingAppraisal?.appraisalDate}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor CLP</label>
                  <input 
                    name="marketValueCLP"
                    type="number"
                    defaultValue={editingAppraisal?.marketValueCLP}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor UF</label>
                  <input 
                    name="marketValueUF"
                    type="number"
                    step="0.01"
                    defaultValue={editingAppraisal?.marketValueUF}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor UF Aplicado ($)</label>
                  <input 
                    name="ufValue"
                    type="number"
                    step="0.01"
                    defaultValue={editingAppraisal?.ufValue}
                    placeholder="Ej: 36863.83"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha Valor UF</label>
                  <input 
                    name="ufDate"
                    type="date"
                    defaultValue={editingAppraisal?.ufDate}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Superficie Terreno (m2)</label>
                  <input 
                    name="surfaceAreaLand"
                    type="number"
                    defaultValue={editingAppraisal?.surfaceAreaLand}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Superficie Construida (m2)</label>
                  <input 
                    name="surfaceAreaBuilt"
                    type="number"
                    defaultValue={editingAppraisal?.surfaceAreaBuilt}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                  <select 
                    name="status"
                    defaultValue={editingAppraisal?.status || 'VIGENTE'}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  >
                    <option value="VIGENTE">VIGENTE</option>
                    <option value="VENCIDA">VENCIDA</option>
                    <option value="OBSOLETA">OBSOLETA</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                  </select>
                </div>

                {/* Adjunto de Informe de Tasación (PDF / Imagen) en el formulario manual */}
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Documento de Respaldo (Informe PDF / Imagen)</label>
                  <input
                    type="file"
                    ref={manualFileInputRef}
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setManualDocBase64(reader.result as string);
                        setManualDocName(file.name);
                        notify(`Informe "${file.name}" adjuntado al formulario`, 'success');
                      };
                      reader.readAsDataURL(file);
                      if (manualFileInputRef.current) manualFileInputRef.current.value = '';
                    }}
                  />
                  {manualDocBase64 ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-emerald-900 truncate">
                          {manualDocName || 'Informe de Tasación Adjunto'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => manualFileInputRef.current?.click()}
                          className="text-[10px] font-black uppercase text-indigo-600 hover:underline"
                        >
                          Reemplazar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setManualDocBase64('');
                            setManualDocName('');
                          }}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => manualFileInputRef.current?.click()}
                      className="w-full py-3.5 px-4 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase text-indigo-600 hover:bg-indigo-50/40 transition-all"
                    >
                      <Paperclip size={15} />
                      Adjuntar Informe PDF / Imagen de Tasación
                    </button>
                  )}
                </div>

                <div className="space-y-4 col-span-2 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Roles Individuales (Sub-registros)</label>
                    <button 
                      type="button"
                      onClick={() => setFormRoles([...formRoles, { role: '', valueCLP: 0, valueUF: 0, landValueCLP: 0, landValueUF: 0, builtValueCLP: 0, builtValueUF: 0, surfaceAreaBuilt: 0, surfaceAreaLand: 0 }])}
                      className="flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      <Plus size={14} /> AGREGAR ROL
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formRoles.map((r, idx) => (
                      <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 grid grid-cols-4 gap-4 relative group">
                        <button 
                          type="button"
                          onClick={() => setFormRoles(formRoles.filter((_, i) => i !== idx))}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                        >
                          <X size={12} />
                        </button>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">ROL</label>
                          <input 
                            value={r.role}
                            onChange={(e) => {
                              const updated = [...formRoles];
                              updated[idx].role = e.target.value;
                              setFormRoles(updated);
                            }}
                            placeholder="123-45"
                            className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor CLP</label>
                          <input 
                            type="number"
                            value={r.valueCLP}
                            onChange={(e) => {
                              const updated = [...formRoles];
                              updated[idx].valueCLP = Number(e.target.value);
                              setFormRoles(updated);
                            }}
                            className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor UF</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={r.valueUF}
                            onChange={(e) => {
                              const updated = [...formRoles];
                              updated[idx].valueUF = Number(e.target.value);
                              setFormRoles(updated);
                            }}
                            className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sup. Const (m2)</label>
                          <input 
                            type="number"
                            value={r.surfaceAreaBuilt}
                            onChange={(e) => {
                              const updated = [...formRoles];
                              updated[idx].surfaceAreaBuilt = Number(e.target.value);
                              setFormRoles(updated);
                            }}
                            className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Val. Terreno (CLP)</label>
                          <input 
                            type="number"
                            value={r.landValueCLP}
                            onChange={(e) => {
                              const updated = [...formRoles];
                              updated[idx].landValueCLP = Number(e.target.value);
                              setFormRoles(updated);
                            }}
                            className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Val. Terreno (UF)</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={r.landValueUF}
                            onChange={(e) => {
                              const updated = [...formRoles];
                              updated[idx].landValueUF = Number(e.target.value);
                              setFormRoles(updated);
                            }}
                            className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Val. Const (CLP)</label>
                          <input 
                            type="number"
                            value={r.builtValueCLP}
                            onChange={(e) => {
                              const updated = [...formRoles];
                              updated[idx].builtValueCLP = Number(e.target.value);
                              setFormRoles(updated);
                            }}
                            className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Val. Const (UF)</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={r.builtValueUF}
                            onChange={(e) => {
                              const updated = [...formRoles];
                              updated[idx].builtValueUF = Number(e.target.value);
                              setFormRoles(updated);
                            }}
                            className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                    ))}
                    {formRoles.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No hay roles individuales definidos</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 -mx-8 -mb-8 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-950 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-slate-950 hover:bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
                >
                  <Save size={18} />
                  {editingAppraisal ? 'Actualizar' : 'Guardar Tasación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW IN-APP MODAL */}
      {viewingAppraisal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[40px] w-full max-w-5xl h-[85vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                  <FileText className="text-indigo-600" /> Copia Digital de Tasación
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {viewingAppraisal.address} {viewingAppraisal.propertyRole ? `(ROL ${viewingAppraisal.propertyRole})` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openDocumentSecurely(viewingAppraisal.documentUrl, viewingAppraisal.documentName || 'tasacion')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                  title="Descargar para visualización externa segura"
                >
                  <Eye size={16} /> Descargar Archivo
                </button>
                <button 
                  onClick={() => setViewingAppraisal(null)}
                  className="p-3 hover:bg-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-800 p-4 relative flex items-center justify-center overflow-hidden">
              {viewingAppraisal.documentUrl ? (
                viewingAppraisal.documentUrl.startsWith('data:image/') || viewingAppraisal.documentName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                  <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                    <img 
                      src={viewingAppraisal.documentUrl} 
                      alt="Copia Digital Tasación"
                      className="max-w-full max-h-full rounded-xl object-contain shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <iframe 
                    src={viewingAppraisal.documentUrl} 
                    className="w-full h-full rounded-2xl border-none bg-white shadow-inner"
                    title="Documento de Tasación"
                  />
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <AlertTriangle size={48} className="mb-4 text-amber-500" />
                  <p className="font-extrabold uppercase tracking-widest text-sm">No hay copia digital disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalModule;
