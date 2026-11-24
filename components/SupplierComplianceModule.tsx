
import React, { useState, useRef } from 'react';
import { Supplier, SupplierComplianceRequirement, ComplianceRequirementType, ComplianceRequirementStatus } from '../types';
import { 
  ShieldCheck, FileUp, Search, Loader2, CheckCircle2, AlertTriangle, 
  Clock, XCircle, Filter, Download, ExternalLink, Info, Building2,
  FileText, UserCheck, Users, Briefcase, X, Wallet, ClipboardCheck, Camera, Cloud, Upload,
  ChevronLeft, ChevronRight, AlertCircle, RefreshCw, BrainCircuit, FileQuestion, Save, Plus
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { extractSupplierDataFromDocument } from '../geminiService';
import NewIndicator from './NewIndicator';
import SupplierForm from './SupplierForm';

interface SupplierComplianceModuleProps {
  suppliers: Supplier[];
  onUpdateSupplier: (supplier: Supplier) => void;
  onAddSupplier: (data: any) => void;
  currentUser: string;
}

const SupplierComplianceModule: React.FC<SupplierComplianceModuleProps> = ({ suppliers, onUpdateSupplier, onAddSupplier, currentUser }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const stopProcessingRef = useRef(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  const resetExtractor = () => {
    stopProcessingRef.current = true;
    setIsProcessing(false);
    setProcessingProgress({ current: 0, total: 0 });
    setProcessingResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    alert('Extractor reiniciado. Se ha detenido el procesamiento actual.');
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLIANT' | 'PENDING' | 'NON_COMPLIANT'>('ALL');
  const [selectedRequirement, setSelectedRequirement] = useState<{ supplier: Supplier, requirement: SupplierComplianceRequirement } | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<{ supplierId: string, type: string } | null>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateRequirement = (supplierId: string, requirementId: string, updates: Partial<SupplierComplianceRequirement>) => {
    const currentList = hasUnsavedChanges ? [...stagedSuppliers] : [...suppliers];
    const updatedList = currentList.map(s => {
      if (s.id === supplierId) {
        const updatedReqs = (s.complianceRequirements || []).map(r => 
          r.id === requirementId ? { ...r, ...updates } : r
        );
        return { ...s, complianceRequirements: updatedReqs };
      }
      return s;
    });
    setStagedSuppliers(updatedList);
    setHasUnsavedChanges(true);
    
    // Also update the selected requirement if it's the one being edited
    if (selectedRequirement && selectedRequirement.requirement.id === requirementId) {
      const updatedReq = { ...selectedRequirement.requirement, ...updates };
      setSelectedRequirement({ ...selectedRequirement, requirement: updatedReq });
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

    setIsProcessing(true);
    const totalFiles = files.length;
    setProcessingProgress({ current: 0, total: totalFiles });

    try {
      const currentList = hasUnsavedChanges ? [...stagedSuppliers] : [...suppliers];
      let updatedList = [...currentList];

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        setProcessingProgress({ current: i + 1, total: totalFiles });

        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });

        // Use IA to extract data even for manual upload
        const extracted = await extractSupplierDataFromDocument(fileData);

        const newReq: SupplierComplianceRequirement = {
          id: Math.random().toString(36).substr(2, 9),
          type: uploadingFor.type as any,
          name: requirementTypes.find(rt => rt.type === uploadingFor.type)?.label || uploadingFor.type,
          status: 'VALID',
          documentUrl: fileData,
          documentName: file.name,
          emissionDate: extracted?.emissionDate || new Date().toISOString().split('T')[0],
          expiryDate: extracted?.expiryDate || null,
          lastUpdate: new Date().toISOString().split('T')[0],
          observations: extracted?.observations || 'Cargado manualmente.',
          extractedData: extracted,
          amount: extracted?.totalAmount,
          invoiceNumber: extracted?.invoiceNumber
        };

        updatedList = updatedList.map(s => {
          if (s.id === uploadingFor.supplierId) {
            const existing = s.complianceRequirements || [];
            // If we are uploading multiple for the same type, we might want to keep them?
            // But the current logic replaces. Let's stick to replacing for now but allowing the batch.
            // Actually, if it's a batch for the same type, only the last one will remain with the current logic.
            // Maybe we should append if it's a batch? 
            // For now, let's just allow the batch processing.
            const filtered = existing.filter(r => r.type !== uploadingFor.type);
            return { ...s, complianceRequirements: [...filtered, newReq] };
          }
          return s;
        });

        // Update selected supplier if open
        if (selectedSupplier && selectedSupplier.id === uploadingFor.supplierId) {
          setSelectedSupplier(prev => {
            if (!prev) return null;
            const existing = prev.complianceRequirements || [];
            const filtered = existing.filter(r => r.type !== uploadingFor.type);
            return { ...prev, complianceRequirements: [...filtered, newReq] };
          });
        }

        // Small delay between files
        if (i < totalFiles - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setStagedSuppliers(updatedList);
      setHasUnsavedChanges(true);

      setIsProcessing(false);
      setUploadingFor(null);
      if (manualFileInputRef.current) manualFileInputRef.current.value = '';
      alert(totalFiles > 1 ? `${totalFiles} documentos cargados y procesados exitosamente.` : 'Documento cargado y procesado exitosamente.');
    } catch (error) {
      console.error("Error in manual upload:", error);
      setIsProcessing(false);
      setUploadingFor(null);
      alert('Error al cargar los documentos.');
    }
  };
  const [processingResults, setProcessingResults] = useState<{
    invoices: number;
    complianceDocs: number;
    totalInvoiced: number;
    newSuppliers: string[];
    processedRequirementIds: string[];
    batchDetails: { supplierName: string, docType: string, status: string, amount?: number }[];
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stagedSuppliers, setStagedSuppliers] = useState<Supplier[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const requirementTypes: { type: ComplianceRequirementType; label: string; icon: any }[] = [
    { type: 'CONFLICT_INTEREST_THIRD', label: 'Decl. Conflicto Terceros', icon: Users },
    { type: 'CONFLICT_INTEREST_EXEC', label: 'Decl. Conflicto Ejecutivo', icon: UserCheck },
    { type: 'UBO_DECLARATION', label: 'Decl. Beneficiarios Finales', icon: Briefcase },
    { type: 'TAX_CERTIFICATE', label: 'Certificado Tributario', icon: FileText },
    { type: 'DUE_DILIGENCE', label: 'Debida Diligencia', icon: ShieldCheck },
    { type: 'LEGAL_REPRESENTATIVE', label: 'Rep. Legal / Poderes', icon: Building2 },
    { type: 'ASSIGNMENT_CERTIFICATE', label: 'Cert. Cesión / Factoring', icon: ExternalLink },
    { type: 'WORK_REPORT', label: 'Informe de Trabajo', icon: ClipboardCheck },
    { type: 'PHOTO_SET', label: 'Set Fotográfico', icon: Camera },
    { type: 'PAYMENT_VOUCHER', label: 'Comprobante de Egreso', icon: Wallet },
  ];

  const currentData = hasUnsavedChanges ? stagedSuppliers : suppliers;

  const filteredSuppliers = currentData.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.taxId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const requirements = s.complianceRequirements || [];
    // Core requirements for compliance status
    const coreTypes = ['CONFLICT_INTEREST_THIRD', 'CONFLICT_INTEREST_EXEC', 'UBO_DECLARATION', 'TAX_CERTIFICATE', 'DUE_DILIGENCE', 'LEGAL_REPRESENTATIVE'];
    
    const isCompliant = coreTypes.every(type => {
      const req = requirements.find(r => r.type === type && r.status === 'VALID');
      if (!req) return false;
      // Check if expired
      if (req.expiryDate && new Date(req.expiryDate) < new Date()) return false;
      return true;
    });
    
    if (statusFilter === 'COMPLIANT') return matchesSearch && isCompliant;
    if (statusFilter === 'PENDING') return matchesSearch && !isCompliant;
    return matchesSearch;
  });

  const handleSaveToMaster = () => {
    // Separate new suppliers from updated ones
    const existingIds = new Set(suppliers.map(s => s.id));
    
    stagedSuppliers.forEach(s => {
      if (existingIds.has(s.id)) {
        onUpdateSupplier(s);
      } else {
        // For new suppliers, we need to strip the ID and other fields that onAddSupplier generates
        const { id, timestamp, userCreator, status, folio, ...data } = s;
        onAddSupplier(data);
      }
    });
    
    setHasUnsavedChanges(false);
    setStagedSuppliers([]);
    setProcessingResults(null);
    alert('Datos traspasados exitosamente al Maestro de Proveedores. Los cambios ahora son permanentes.');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length });
    setProcessingResults({ invoices: 0, complianceDocs: 0, totalInvoiced: 0, newSuppliers: [], processedRequirementIds: [], batchDetails: [], errors: [] });
    
    const results = { invoices: 0, complianceDocs: 0, totalInvoiced: 0, newSuppliers: [] as string[], processedRequirementIds: [] as string[], batchDetails: [] as { supplierName: string, docType: string, status: string, amount?: number }[], errors: [] as string[] };

    try {
      let currentSuppliers = hasUnsavedChanges ? [...stagedSuppliers] : [...suppliers];
      
      // Process files sequentially to avoid rate limits and timeouts
      stopProcessingRef.current = false;
      const batchSize = 1;
      for (let i = 0; i < files.length; i += batchSize) {
        if (stopProcessingRef.current) break;
        const batch = Array.from(files).slice(i, i + batchSize);
        
        const batchResults = await Promise.all(batch.map(async (file: File, index: number) => {
          const fileIndex = i + index;
          setProcessingProgress(prev => ({ ...prev, current: fileIndex + 1 }));
          
          try {
            const reader = new FileReader();
            const fileData = await new Promise<string>((resolve, reject) => {
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = (e) => reject(e);
              reader.readAsDataURL(file);
            });

            // Add a timeout to the IA extraction to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout de procesamiento (180s)')), 180000)
            );

            const result = await Promise.race([
              extractSupplierDataFromDocument(fileData),
              timeoutPromise
            ]) as any;
            
            return { result, fileData, fileName: file.name };
          } catch (fileError) {
            const errorMessage = fileError instanceof Error ? fileError.message : 'Error desconocido';
            results.errors.push(`Archivo ${file.name}: ${errorMessage}`);
            console.error(`Error processing ${file.name}:`, fileError);
            return null;
          }
        }));

        // Apply batch results sequentially to avoid race conditions
        for (const batchResult of batchResults) {
          if (!batchResult || !batchResult.result || !batchResult.result.taxId) {
            if (batchResult && batchResult.result && !batchResult.result.taxId) {
              results.errors.push(`Archivo ${batchResult.fileName}: No se pudo extraer información.`);
            }
            continue;
          }

          const { result, fileData, fileName } = batchResult;
          const normalizedExtractedRut = result.taxId.replace(/[^0-9kK]/g, '').toUpperCase();
          let supplier = currentSuppliers.find(s => s.taxId.replace(/[^0-9kK]/g, '').toUpperCase() === normalizedExtractedRut);
          
          // Create a requirement for the document (whether it's an invoice or compliance doc)
          const newRequirement: SupplierComplianceRequirement = {
            id: crypto.randomUUID(),
            type: result.isInvoice ? 'INVOICE' : (result.requirementType as ComplianceRequirementType),
            name: result.isInvoice ? `Factura ${result.taxId}` : (result.requirementName || 'Documento Extraído'),
            status: 'VALID',
            lastUpdate: new Date().toISOString().split('T')[0],
            emissionDate: result.emissionDate,
            expiryDate: result.expiryDate,
            documentUrl: fileData,
            documentName: fileName,
            extractedData: result,
            amount: result.totalAmount,
            invoiceNumber: result.invoiceNumber,
            observations: `Extraído automáticamente por IA el ${new Date().toLocaleString()}. Confianza: ${result.confidenceScore}%`
          };

          if (result.isInvoice) {
            results.invoices++;
            results.totalInvoiced += (result.totalAmount || 0);
            if (!supplier) {
              const fullNewSupplier: Supplier = {
                taxId: result.taxId,
                name: result.name || 'Proveedor Nuevo (IA)',
                category: result.category || 'OTROS',
                taxDocumentType: 'FACTURA',
                requestDate: new Date().toISOString().split('T')[0],
                contactName: 'N/A',
                email: result.email || '',
                phone: result.phone || '',
                address: result.address || '',
                bankName: result.bankName || 'PENDIENTE',
                accountType: result.accountType || 'PENDIENTE',
                accountNumber: result.accountNumber || 'PENDIENTE',
                isAssigned: result.isAssigned || false,
                assignedToEntity: result.assignedToEntity || '',
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                userCreator: currentUser,
                status: 'PENDING_APPROVAL',
                folio: `PROV-IA-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                dueDiligenceDate: new Date().toISOString().split('T')[0],
                dueDiligenceRisk: 'RIESGO MEDIO',
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
                lockedAt: null,
                latestDocumentDate: result.emissionDate || new Date().toISOString().split('T')[0],
                lastProcessingDate: new Date().toISOString().split('T')[0],
                complianceRequirements: [newRequirement]
              };
              
              currentSuppliers.push(fullNewSupplier);
              results.newSuppliers.push(result.name || result.taxId);
            } else {
              const updatedRequirements = [
                ...(supplier.complianceRequirements || []).filter(r => r.type !== 'INVOICE'),
                newRequirement
              ];
              const updatedSupplier = {
                ...supplier,
                bankName: result.bankName || supplier.bankName,
                accountType: result.accountType || supplier.accountType,
                accountNumber: result.accountNumber || supplier.accountNumber,
                isAssigned: result.isAssigned !== undefined ? result.isAssigned : supplier.isAssigned,
                assignedToEntity: result.assignedToEntity || supplier.assignedToEntity,
                address: result.address || supplier.address,
                phone: result.phone || supplier.phone,
                email: result.email || supplier.email,
                confidenceScore: result.confidenceScore,
                latestDocumentDate: result.emissionDate || supplier.latestDocumentDate,
                lastProcessingDate: new Date().toISOString().split('T')[0],
                complianceRequirements: updatedRequirements
              };
              currentSuppliers = currentSuppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s);
            }
            
            results.processedRequirementIds.push(newRequirement.id);
            results.batchDetails.push({ 
              supplierName: supplier ? supplier.name : (result.name || result.taxId), 
              docType: 'INVOICE', 
              status: 'IDENTIFICADO',
              amount: result.totalAmount
            });
          } else {
            results.complianceDocs++;
            if (supplier) {
              const updatedRequirements = [
                ...(supplier.complianceRequirements || []).filter(r => r.type !== newRequirement.type),
                newRequirement
              ];

              const updatedSupplier = {
                ...supplier,
                complianceRequirements: updatedRequirements,
                latestDocumentDate: result.emissionDate || supplier.latestDocumentDate,
                lastProcessingDate: new Date().toISOString().split('T')[0]
              };

              currentSuppliers = currentSuppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s);
              results.processedRequirementIds.push(newRequirement.id);
              results.batchDetails.push({ 
                supplierName: supplier.name, 
                docType: result.requirementType || 'Documento', 
                status: 'IDENTIFICADO' 
              });
            } else {
              results.errors.push(`Doc. Cumplimiento: No se encontró proveedor para RUT ${result.taxId}`);
            }
          }
        }

        // Small delay between files to avoid rate limits
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      setProcessingResults(results);
      setStagedSuppliers(currentSuppliers);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Error general en carga masiva:", error);
      alert("Ocurrió un error crítico durante el procesamiento.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getRequirementStatusIcon = (supplier: Supplier, type: ComplianceRequirementType) => {
    const req = supplier.complianceRequirements?.find(r => r.type === type);
    const isInCurrentBatch = req && processingResults?.processedRequirementIds.includes(req.id);
    const isBatchActive = processingResults !== null;
    
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (req) {
        setSelectedRequirement({ supplier, requirement: req });
      }
    };

    // If batch is active, show Green Check if in batch, Red X if not in batch
    if (isBatchActive) {
      return (
        <button 
          onClick={handleClick}
          className={`w-9 h-9 flex items-center justify-center rounded-2xl transition-all relative group ${
            isInCurrentBatch 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 ring-4 ring-emerald-400/20 scale-110 z-10 shadow-lg shadow-emerald-600/10' 
              : 'bg-slate-50 text-slate-300 border border-slate-100 opacity-40'
          }`}
        >
          {isInCurrentBatch ? (
            <CheckCircle2 size={18} className="animate-in zoom-in duration-300" />
          ) : (
            <XCircle size={18} className="animate-in fade-in duration-300" />
          )}
          
          {isInCurrentBatch && (
            <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-lg shadow-sm animate-bounce tracking-widest">
              LOTE
            </span>
          )}

          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-950 text-white text-[8px] font-black uppercase rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-800 translate-y-1 group-hover:translate-y-0">
            {isInCurrentBatch ? 'Identificado en Lote' : 'No en este Lote'}
          </div>
        </button>
      );
    }

    if (!req) return (
      <div className="w-9 h-9 flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 opacity-40">
        <Clock size={16} className="text-slate-300" />
      </div>
    );

    const isRecent = req.lastUpdate === new Date().toISOString().split('T')[0];
    const isExpired = req.expiryDate ? new Date(req.expiryDate) < new Date() : false;

    return (
      <button 
        onClick={handleClick}
        className={`w-9 h-9 flex items-center justify-center rounded-2xl transition-all relative group ${
          req.status === 'VALID' && !isExpired ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 shadow-sm' : 
          isExpired || req.status === 'EXPIRED' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 shadow-sm' : 
          'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'
        }`}
      >
        {req.status === 'VALID' && !isExpired ? (
          <CheckCircle2 size={18} />
        ) : isExpired || req.status === 'EXPIRED' ? (
          <AlertTriangle size={18} />
        ) : (
          <XCircle size={18} className="text-rose-400" />
        )}
        
        {isRecent && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white animate-pulse shadow-sm" />
        )}

        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-950 text-white text-[8px] font-black uppercase rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-800 translate-y-1 group-hover:translate-y-0">
          <span className="text-slate-400 mr-1">{req.name}:</span>
          {req.status === 'VALID' && !isExpired ? 'Vigente' : isExpired ? 'Vencido' : 'Pendiente'}
          {req.expiryDate && ` (Vence: ${req.expiryDate})`}
        </div>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* TOOLBAR */}
      <div className="h-20 bg-white border-b border-slate-300 flex items-center px-8 justify-between z-30 shadow-xs">
        <div className="flex items-center gap-5">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xs">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none">Matriz de Cumplimiento</h2>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1.5">Monitoreo de Requisitos y Debida Diligencia • Vigencia 1 Año</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isProcessing && (
            <button 
              onClick={resetExtractor}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 text-rose-700 rounded-2xl text-[10px] font-black uppercase hover:bg-rose-100 transition-all border border-rose-300"
            >
              <RefreshCw size={14} className="animate-spin" />
              Detener Extractor
            </button>
          )}
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Buscar proveedor..." 
              className="bg-slate-100 border border-slate-300 text-slate-900 rounded-2xl px-11 py-2.5 text-[10px] font-bold uppercase w-72 outline-none focus:border-indigo-600 transition-all placeholder:text-slate-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Search size={14} className="absolute left-4 top-3 text-slate-500 group-focus-within:text-indigo-600 transition-colors" />
          </div>

          <button 
            onClick={() => {
              const currentSearch = searchTerm;
              setSearchTerm('');
              setTimeout(() => setSearchTerm(currentSearch), 10);
            }}
            className="p-3 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-all border border-slate-300 shadow-2xs"
            title="Refrescar Tabla"
          >
            <Loader2 size={18} className={isProcessing ? "animate-spin" : ""} />
          </button>

          <button 
            onClick={() => setIsSupplierFormOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-500 transition-all shadow-sm cursor-pointer"
          >
            <Plus size={16} /> + Agregar Nuevo Proveedor
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-indigo-800 transition-all shadow-xs disabled:opacity-50"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />} 
            Carga Masiva IA
          </button>
          {hasUnsavedChanges && (
            <button 
              onClick={handleSaveToMaster}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-800 transition-all shadow-xs animate-pulse"
            >
              <Save size={16} /> 
              Guardar en Maestro
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple accept=".pdf,image/*" />
          <input type="file" ref={manualFileInputRef} onChange={handleManualFileChange} className="hidden" multiple accept=".pdf,image/*" />
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-full mx-auto space-y-8">
          {/* PROGRESS BAR */}
          {isProcessing && (
            <div className="bg-white p-8 rounded-[32px] border border-indigo-100 shadow-2xl shadow-indigo-500/5 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl">
                    <Loader2 size={22} className="animate-spin" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Procesando Lote de Documentos</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Archivo {processingProgress.current} de {processingProgress.total}</p>
                  </div>
                </div>
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{Math.round((processingProgress.current / processingProgress.total) * 100)}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                  style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* PROCESSING RESULTS SUMMARY */}
          {processingResults && !isProcessing && (
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-950/5 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                  Resumen de Procesamiento
                </h3>
                <button onClick={() => setProcessingResults(null)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Documentos</p>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xl font-black text-slate-900">{processingResults.invoices}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Facturas</p>
                    </div>
                    <div className="w-[1px] h-10 bg-slate-200"></div>
                    <div>
                      <p className="text-xl font-black text-slate-900">{processingResults.complianceDocs}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Cumplimiento</p>
                    </div>
                  </div>
                </div>
                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-600 uppercase mb-2 tracking-widest">Monto Total Procesado</p>
                  <p className="text-xl font-black text-indigo-700">
                    ${processingResults.totalInvoiced.toLocaleString('es-CL')}
                  </p>
                  <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1">
                    Suma de facturas identificadas
                  </p>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Nuevos Proveedores</p>
                  <p className="text-xl font-black text-emerald-700">{processingResults.newSuppliers.length}</p>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase mt-1 truncate">
                    {processingResults.newSuppliers.join(', ') || 'Ninguno'}
                  </p>
                </div>
                <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 flex flex-col">
                  <p className="text-[10px] font-black text-rose-600 uppercase mb-2 tracking-widest">Alertas / Errores</p>
                  <p className="text-xl font-black text-rose-700">{processingResults.errors.length}</p>
                  <div className="mt-2 max-h-[40px] overflow-y-auto custom-audit-scroll">
                    {processingResults.errors.map((err, i) => (
                      <p key={i} className="text-[8px] font-bold text-rose-600 uppercase leading-tight mb-1">
                        • {err}
                      </p>
                    ))}
                    {processingResults.errors.length === 0 && (
                      <p className="text-[9px] font-bold text-rose-500 uppercase mt-1">Sin errores</p>
                    )}
                  </div>
                </div>
              </div>

              {processingResults.batchDetails.some(d => d.docType === 'WORK_REPORT' || d.docType === 'PHOTO_SET') && (
                <div className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-5 animate-in slide-in-from-bottom-2">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                    <ClipboardCheck size={26} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-emerald-900 uppercase tracking-tight">Trabajo Recepcionado Conforme</p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Se identificó Informe de Trabajo o Set Fotográfico en el lote.</p>
                  </div>
                </div>
              )}

              {processingResults.batchDetails.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Documentos Identificados en el Lote:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {processingResults.batchDetails.map((detail, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                        <div className="w-7 h-7 bg-white border border-slate-200 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 rounded-xl flex items-center justify-center text-[10px] font-black transition-all">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-900 uppercase truncate">{detail.supplierName}</p>
                          <p className="text-[9px] font-bold text-indigo-600 uppercase mt-0.5">
                            {detail.docType.replace(/_/g, ' ')} 
                            {detail.amount ? ` - $${detail.amount.toLocaleString('es-CL')}` : ''}
                          </p>
                        </div>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {processingResults.invoices + processingResults.complianceDocs > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-wider">
                    * Haga clic en los iconos de la tabla para revisar manualmente cada documento extraído.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="pro-card p-7">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Proveedores</p>
              <p className="text-3xl font-black text-slate-950 tracking-tighter">{suppliers.length}</p>
            </div>
            <div className="pro-card p-7 border-emerald-100 bg-emerald-50/30">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Cumplimiento Total</p>
              <p className="text-3xl font-black text-emerald-700 tracking-tighter">
                {suppliers.filter(s => {
                  const coreTypes = ['CONFLICT_INTEREST_THIRD', 'CONFLICT_INTEREST_EXEC', 'UBO_DECLARATION', 'TAX_CERTIFICATE', 'DUE_DILIGENCE', 'LEGAL_REPRESENTATIVE'];
                  return coreTypes.every(type => {
                    const req = s.complianceRequirements?.find(r => r.type === type && r.status === 'VALID');
                    return req && (!req.expiryDate || new Date(req.expiryDate) >= new Date());
                  });
                }).length}
              </p>
            </div>
            <div className="pro-card p-7 border-amber-100 bg-amber-50/30">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Pendientes / Vencidos</p>
              <p className="text-3xl font-black text-amber-700 tracking-tighter">
                {suppliers.filter(s => {
                  const coreTypes = ['CONFLICT_INTEREST_THIRD', 'CONFLICT_INTEREST_EXEC', 'UBO_DECLARATION', 'TAX_CERTIFICATE', 'DUE_DILIGENCE', 'LEGAL_REPRESENTATIVE'];
                  return coreTypes.some(type => {
                    const req = s.complianceRequirements?.find(r => r.type === type && r.status === 'VALID');
                    return !req || (req.expiryDate && new Date(req.expiryDate) < new Date());
                  });
                }).length}
              </p>
            </div>
            <div className="pro-card p-7 border-indigo-100 bg-indigo-50/30">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Documentos IA</p>
              <p className="text-3xl font-black text-indigo-700 tracking-tighter">
                {suppliers.reduce((acc, s) => acc + (s.complianceRequirements?.length || 0), 0)}
              </p>
            </div>
          </div>

          {/* COMPLIANCE TABLE */}
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-950/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-8 py-5 text-[11px] font-black text-slate-950 uppercase tracking-widest">Proveedor</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-950 uppercase tracking-widest text-center">Vencimiento DD</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-950 uppercase tracking-widest text-center">N° Factura</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-950 uppercase tracking-widest text-center">Fecha Emisión</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-950 uppercase tracking-widest text-center">Monto Factura</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-950 uppercase tracking-widest text-center">Fecha Proc.</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-950 uppercase tracking-widest text-center">Factoring</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-950 uppercase tracking-widest text-center">Doc. Digital</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-950 uppercase tracking-widest text-center">Recepción Trabajo</th>
                    {requirementTypes.map(rt => (
                      <th key={rt.type} className="px-4 py-5 text-[10px] font-black text-slate-950 uppercase tracking-widest text-center">
                        <div className="flex flex-col items-center gap-2">
                          <rt.icon size={16} className="text-slate-950" />
                          <span className="max-w-[80px] leading-tight">{rt.label}</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-8 py-5 text-[11px] font-black text-slate-950 uppercase tracking-widest text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.map(s => {
                    const coreTypes = ['CONFLICT_INTEREST_THIRD', 'CONFLICT_INTEREST_EXEC', 'UBO_DECLARATION', 'TAX_CERTIFICATE', 'DUE_DILIGENCE', 'LEGAL_REPRESENTATIVE'];
                    const isCompliant = coreTypes.every(type => {
                      const req = s.complianceRequirements?.find(r => r.type === type && r.status === 'VALID');
                      return req && (!req.expiryDate || new Date(req.expiryDate) >= new Date());
                    });
                    
                    return (
                      <tr 
                        key={s.id} 
                        className="hover:bg-slate-50/80 transition-all group cursor-pointer"
                        onClick={() => setSelectedSupplier(s)}
                      >
                        <td className="px-8 py-5 relative">
                          <NewIndicator timestamp={s.timestamp} />
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                              <Building2 size={20} />
                            </div>
                            <div>
                              <p className="text-[12px] font-black text-slate-950 uppercase leading-none tracking-tight">{s.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-2 tracking-wider">{s.taxId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          {(() => {
                            const dd = s.complianceRequirements?.find(r => r.type === 'DUE_DILIGENCE');
                            if (!dd || !dd.expiryDate) return <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sin DD</span>;
                            
                            const expiry = new Date(dd.expiryDate);
                            const now = new Date();
                            const diffTime = expiry.getTime() - now.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            if (diffDays < 0) return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Vencido</span>;
                            if (diffDays <= 30) return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Por Vencer ({diffDays}d)</span>;
                            return <span className="text-[11px] font-black text-emerald-600 uppercase tracking-tighter">{dd.expiryDate}</span>;
                          })()}
                        </td>
                        <td className="px-4 py-5 text-center">
                          {(() => {
                            const invoice = s.complianceRequirements?.find(r => r.type === 'INVOICE');
                            return (
                              <span className="text-[11px] font-mono font-bold text-slate-950 uppercase tracking-tighter">
                                {invoice?.invoiceNumber || '---'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-5 text-center">
                          {(() => {
                            const invoice = s.complianceRequirements?.find(r => r.type === 'INVOICE');
                            return (
                              <span className="text-[11px] font-mono font-bold text-slate-600 uppercase tracking-tighter">
                                {invoice?.emissionDate || s.latestDocumentDate || '---'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-5 text-center">
                          {(() => {
                            const invoice = s.complianceRequirements?.find(r => r.type === 'INVOICE');
                            return invoice?.amount ? (
                              <span className="text-[11px] font-mono font-bold text-indigo-600 tracking-tighter">
                                ${invoice.amount.toLocaleString('es-CL')}
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">---</span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{s.lastProcessingDate || '---'}</span>
                        </td>
                        <td className="px-4 py-5 text-center">
                          {s.isAssigned ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">CEDIDA</span>
                              <p className="text-[7px] font-bold text-amber-600 uppercase max-w-[80px] truncate" title={s.assignedToEntity || 'FACTORING'}>
                                {s.assignedToEntity || 'FACTORING'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">DIRECTA</span>
                          )}
                        </td>
                        <td className="px-4 py-5 text-center">
                          {(() => {
                            const invoice = s.complianceRequirements?.find(r => r.type === 'INVOICE');
                            return invoice ? (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRequirement({ supplier: s, requirement: invoice });
                                }}
                                className="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm mx-auto"
                                title="Ver Factura Digital"
                              >
                                <FileText size={18} />
                              </button>
                            ) : (
                              <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">SIN DOC.</span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-5 text-center">
                          {(() => {
                            const reqs = s.complianceRequirements || [];
                            const hasReport = reqs.some(r => r.type === 'WORK_REPORT' && r.status === 'VALID');
                            const hasPhotos = reqs.some(r => r.type === 'PHOTO_SET' && r.status === 'VALID');
                            const isWorkConfirmed = hasReport || hasPhotos;
                            
                            return isWorkConfirmed ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl flex items-center justify-center shadow-sm">
                                  <ClipboardCheck size={18} />
                                </div>
                                <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Recepcionado</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 opacity-30">
                                <div className="w-9 h-9 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl flex items-center justify-center">
                                  <XCircle size={18} />
                                </div>
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Pendiente</span>
                              </div>
                            );
                          })()}
                        </td>
                        {requirementTypes.map(rt => (
                          <td key={rt.type} className="px-4 py-5 text-center">
                            <div className="flex justify-center">
                              {getRequirementStatusIcon(s, rt.type)}
                            </div>
                          </td>
                        ))}
                        <td className="px-8 py-5 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                              isCompliant 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {isCompliant ? 'Cumple' : 'Pendiente'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${isCompliant ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`}></div>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Score: {s.confidenceScore || 0}%</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* IA INFO BOX */}
          <div className="bg-white text-slate-900 p-10 rounded-[48px] shadow-sm relative overflow-hidden border-2 border-indigo-200 group">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="bg-indigo-700 p-6 rounded-[32px] shadow-sm group-hover:scale-105 transition-transform duration-500">
                <BrainCircuit size={48} className="text-white" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-3 leading-none text-slate-900">Extracción Inteligente de Documentos</h3>
                <p className="text-slate-700 text-sm font-medium leading-relaxed max-w-2xl">
                  Cargue de forma masiva declaraciones de conflicto de interés, certificados tributarios o identificaciones de beneficiarios finales. 
                  Nuestra IA identificará automáticamente al proveedor, el tipo de documento y validará su vigencia en tiempo real.
                </p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-700 hover:bg-indigo-800 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Comenzar Carga
              </button>
            </div>
            {/* DECORATIVE ELEMENTS */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full -mr-48 -mt-48 opacity-5 blur-[100px]"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500 rounded-full -ml-48 -mb-48 opacity-5 blur-[100px]"></div>
          </div>
        </div>
      </div>
      {/* SUPPLIER DETAIL MODAL */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-800/40 backdrop-blur-xs p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col border border-slate-200 scale-in-center shadow-slate-950/40">
            <div className="bg-slate-50 p-10 flex justify-between items-center border-b border-slate-200">
              <div className="flex items-center gap-8">
                <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-200">
                  <Building2 size={48} className="text-slate-950" />
                </div>
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter leading-none text-slate-950 mb-3">
                    {selectedSupplier.name}
                  </h3>
                  <div className="flex items-center gap-5">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                      RUT: {selectedSupplier.taxId}
                    </p>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                      selectedSupplier.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedSupplier.status}
                    </span>
                    {(() => {
                      const dates = selectedSupplier.complianceRequirements?.map(r => r.lastUpdate).filter(Boolean).sort().reverse();
                      if (dates && dates.length > 0) {
                        return (
                          <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full border border-indigo-100 shadow-sm">
                            <Clock size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Último Proceso: {dates[0]}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSupplier(null)}
                className="w-14 h-14 bg-white border border-slate-200 text-slate-400 hover:text-slate-950 hover:border-slate-950 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-90"
              >
                <X size={32} />
              </button>
            </div>

            <div className="p-12 grid grid-cols-2 gap-16 overflow-auto max-h-[75vh] custom-audit-scroll bg-white">
              <div className="space-y-10">
                <section>
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                      <Info size={14} />
                    </div>
                    Información General
                  </h4>
                  <div className="grid grid-cols-1 gap-5">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Categoría / Giro</p>
                      <p className="text-sm font-bold uppercase text-slate-950">{selectedSupplier.category}</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Dirección</p>
                      <p className="text-sm font-bold uppercase text-slate-950">{selectedSupplier.address || '---'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Teléfono</p>
                        <p className="text-sm font-bold text-slate-950 font-mono">{selectedSupplier.phone || '---'}</p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Email</p>
                        <p className="text-sm font-bold text-slate-950 font-mono">{selectedSupplier.email || '---'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <div className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                      <ShieldCheck size={14} />
                    </div>
                    Resumen de Vigencia
                  </h4>
                  <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 space-y-4">
                    {selectedSupplier.complianceRequirements?.map(req => {
                      const isExpired = req.expiryDate ? new Date(req.expiryDate) < new Date() : false;
                      return (
                        <div key={req.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                              req.status === 'VALID' && !isExpired ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'
                            }`}>
                              {req.status === 'VALID' && !isExpired ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-950 uppercase tracking-tight">{req.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest font-mono">Vence: {req.expiryDate || '---'}</p>
                            </div>
                          </div>
                          {isExpired ? (
                            <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Vencido</span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Vigente</span>
                          )}
                        </div>
                      );
                    })}
                    {(!selectedSupplier.complianceRequirements || selectedSupplier.complianceRequirements.length === 0) && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-300">
                          <FileQuestion size={24} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Sin documentación cargada</p>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <div className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                      <Wallet size={14} />
                    </div>
                    Credenciales Bancarias
                  </h4>
                  <div className="bg-emerald-50/50 p-8 rounded-[32px] border border-emerald-100 space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Banco</p>
                        <p className="text-lg font-black text-slate-950 uppercase tracking-tight">{selectedSupplier.bankName}</p>
                      </div>
                      {selectedSupplier.isAssigned && (
                        <div className="flex flex-col items-end gap-2">
                          <div className="bg-rose-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/20 animate-pulse">
                            Factura Cedida
                          </div>
                          {selectedSupplier.assignedToEntity && (
                            <p className="text-[10px] font-black text-rose-600 uppercase italic tracking-wider">
                              A: {selectedSupplier.assignedToEntity}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white/60 p-4 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Tipo Cuenta</p>
                        <p className="text-xs font-bold text-slate-900 uppercase">{selectedSupplier.accountType}</p>
                      </div>
                      <div className="bg-white/60 p-4 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-2 tracking-widest">N° Cuenta</p>
                        <p className="text-xs font-black text-slate-950 font-mono">{selectedSupplier.accountNumber}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {selectedSupplier.complianceRequirements?.some(r => r.type === 'INVOICE') && (
                  <section>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                      <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                        <FileText size={14} />
                      </div>
                      Factura Digital Extraída
                    </h4>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase text-slate-950 tracking-tight">Factura de Proveedor</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest font-mono">Procesada por IA</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const invoice = selectedSupplier.complianceRequirements?.find(r => r.type === 'INVOICE');
                          if (invoice) {
                            setSelectedRequirement({ supplier: selectedSupplier, requirement: invoice });
                            setSelectedSupplier(null);
                          }
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-950/10 active:scale-95"
                      >
                        Ver Factura
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </section>
                )}
              </div>

              <div className="space-y-10">
                <section>
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                      <ShieldCheck size={14} />
                    </div>
                    Estado de Cumplimiento
                  </h4>
                  <div className="space-y-4">
                    {requirementTypes.map(rt => {
                      const req = selectedSupplier.complianceRequirements?.find(r => r.type === rt.type);
                      const isValid = req?.status === 'VALID' && (!req.expiryDate || new Date(req.expiryDate) >= new Date());
                      const isExpired = req?.status === 'VALID' && req.expiryDate && new Date(req.expiryDate) < new Date();

                      return (
                        <div key={rt.type} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-[24px] shadow-sm hover:border-indigo-200 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isValid ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-950 group-hover:text-white'}`}>
                              <rt.icon size={20} />
                            </div>
                            <span className="text-[11px] font-black uppercase text-slate-950 tracking-tight">{rt.label}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {req ? (
                              <>
                                <div className="flex flex-col items-end mr-2">
                                  {req.emissionDate && (
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Emisión: {req.emissionDate}</span>
                                  )}
                                  {req.expiryDate && (
                                    <span className={`text-[8px] font-black uppercase tracking-widest mt-1 ${
                                      isExpired ? 'text-rose-500' : 'text-emerald-500'
                                    }`}>
                                      Vence: {req.expiryDate}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest shadow-sm ${
                                  isValid 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {isExpired ? 'EXPIRADO' : req.status}
                                </span>
                                <button 
                                  onClick={() => {
                                    setSelectedRequirement({ supplier: selectedSupplier, requirement: req });
                                    setSelectedSupplier(null);
                                  }}
                                  className="w-10 h-10 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl flex items-center justify-center transition-all border border-indigo-100 shadow-sm"
                                  title="Ver Documento Digital"
                                >
                                  <ExternalLink size={16} />
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-400 tracking-widest">
                                  PENDIENTE
                                </span>
                                <button 
                                  onClick={() => handleManualUploadClick(selectedSupplier.id, rt.type)}
                                  className="flex items-center gap-3 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-all border border-emerald-100 shadow-sm font-black text-[9px] uppercase tracking-widest"
                                >
                                  <Upload size={14} />
                                  Cargar PDF
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

            <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end gap-4">
              <button 
                onClick={() => setSelectedSupplier(null)}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT VIEWER MODAL */}
      {selectedRequirement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-800/40 backdrop-blur-xs p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-7xl h-full rounded-[40px] shadow-2xl overflow-hidden flex flex-col border-[4px] border-slate-300 scale-in-center">
            <div className="bg-white p-8 flex justify-between items-center text-slate-900 border-b border-slate-300 shadow-xs">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-xs">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter leading-none text-slate-900">
                    {selectedRequirement.requirement.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                      Proveedor: <span className="text-slate-950 font-black">{selectedRequirement.supplier.name}</span>
                    </p>
                    <div className="w-1 h-1 bg-slate-400 rounded-full" />
                    <p className="text-[11px] font-mono text-indigo-700 font-black tracking-widest">
                      {selectedRequirement.supplier.taxId}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {selectedRequirement.requirement.documentUrl && (
                  <a 
                    href={selectedRequirement.requirement.documentUrl} 
                    download={selectedRequirement.requirement.documentName || 'documento'}
                    className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-[11px] font-black uppercase tracking-widest group"
                  >
                    <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
                    Descargar Original
                  </a>
                )}
                <button 
                  onClick={() => {
                    setSelectedRequirement(null);
                    setNumPages(null);
                    setPageNumber(1);
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-rose-600/10 hover:bg-rose-600 text-rose-600 hover:text-white rounded-2xl transition-all border border-rose-600/20"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden bg-slate-100">
              {/* DOCUMENT PREVIEW */}
              <div className="flex-1 p-10 overflow-auto flex justify-center scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                <div className="bg-white shadow-2xl w-full max-w-4xl min-h-full rounded-2xl overflow-hidden border border-slate-200 flex flex-col items-center relative">
                  {selectedRequirement.requirement.documentUrl ? (
                    selectedRequirement.requirement.documentUrl.startsWith('data:application/pdf') ? (
                      <div className="w-full flex flex-col items-center bg-slate-200 p-6 min-h-full">
                        <Document
                          file={selectedRequirement.requirement.documentUrl}
                          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                          loading={
                            <div className="flex flex-col items-center py-32">
                              <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6" />
                              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Cargando PDF...</p>
                            </div>
                          }
                          error={
                            <div className="flex flex-col items-center py-32 text-rose-500 text-center px-10">
                              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                                <AlertCircle size={40} />
                              </div>
                              <p className="text-sm font-black uppercase tracking-widest mb-2">Error al cargar el PDF</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-xs leading-relaxed">
                                El archivo parece estar dañado o el formato no es compatible con el visor integrado.
                              </p>
                              <a 
                                href={selectedRequirement.requirement.documentUrl} 
                                download={selectedRequirement.requirement.documentName || 'documento'}
                                className="mt-8 px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all active:scale-95"
                              >
                                Descargar para ver localmente
                              </a>
                            </div>
                          }
                        >
                          <Page 
                            pageNumber={pageNumber} 
                            width={800}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="shadow-2xl rounded-lg overflow-hidden border border-slate-300"
                          />
                        </Document>
                        
                        {numPages && numPages > 1 && (
                          <div className="sticky bottom-8 mt-8 flex items-center gap-6 bg-white text-slate-900 px-8 py-4 rounded-[24px] shadow-lg border border-slate-300 ring-2 ring-slate-200">
                            <button 
                              disabled={pageNumber <= 1}
                              onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                              className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl disabled:opacity-20 transition-all border border-slate-300 cursor-pointer"
                            >
                              <ChevronLeft size={24} />
                            </button>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Página</span>
                              <span className="text-sm font-black font-mono text-indigo-700">
                                {pageNumber} <span className="text-slate-400 mx-1">/</span> {numPages}
                              </span>
                            </div>
                            <button 
                              disabled={pageNumber >= numPages}
                              onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
                              className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl disabled:opacity-20 transition-all border border-slate-300 cursor-pointer"
                            >
                              <ChevronRight size={24} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 bg-white w-full flex justify-center">
                        <img 
                          src={selectedRequirement.requirement.documentUrl} 
                          className="max-w-full h-auto shadow-2xl rounded-lg border border-slate-200" 
                          alt="Document Preview"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-slate-300 text-center">
                      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
                        <FileText size={48} className="opacity-20" />
                      </div>
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Vista previa no disponible</p>
                      <p className="text-[10px] uppercase mt-4 max-w-xs leading-relaxed font-bold tracking-widest">
                        El documento no se cargó correctamente o el formato no es compatible con la visualización directa.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* IA EXTRACTION DATA PANEL */}
              <div className="w-96 border-l border-slate-200 bg-white p-8 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                    <BrainCircuit size={20} />
                  </div>
                  <h4 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.2em]">
                    Extracción Inteligente
                  </h4>
                </div>
                
                <div className="space-y-8">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confianza IA</p>
                      <span className="text-[12px] font-black text-slate-950 font-mono">
                        {selectedRequirement.requirement.extractedData?.confidenceScore || 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ease-out ${
                          (selectedRequirement.requirement.extractedData?.confidenceScore || 0) > 80 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${selectedRequirement.requirement.extractedData?.confidenceScore || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">RUT Identificado</p>
                        <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 font-mono text-sm font-black text-slate-950">
                          {selectedRequirement.requirement.extractedData?.taxId || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo Documento</p>
                        <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-[11px] font-black text-slate-950 uppercase tracking-tight">
                          {selectedRequirement.requirement.type}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Emisión</p>
                          <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-[11px] font-black text-slate-950">
                            {selectedRequirement.requirement.emissionDate || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vencimiento</p>
                          <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-[11px] font-black text-slate-950">
                            {selectedRequirement.requirement.expiryDate || 'Sin Vencimiento'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado de Vigencia</p>
                        <div className="flex">
                          {(() => {
                            const isExpired = selectedRequirement.requirement.expiryDate ? new Date(selectedRequirement.requirement.expiryDate) < new Date() : false;
                            const daysToExpiry = selectedRequirement.requirement.expiryDate 
                              ? Math.ceil((new Date(selectedRequirement.requirement.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                              : null;

                            if (isExpired) return <span className="bg-rose-100 text-rose-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-200 shadow-sm">Vencido</span>;
                            if (daysToExpiry !== null && daysToExpiry <= 30) return <span className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-200 shadow-sm">Por Vencer ({daysToExpiry}d)</span>;
                            return <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 shadow-sm">Vigente</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Acciones de Revisión</p>
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => handleUpdateRequirement(selectedRequirement.supplier.id, selectedRequirement.requirement.id, { status: 'VALID' })}
                        className={`flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm border ${
                          selectedRequirement.requirement.status === 'VALID' 
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20' 
                            : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-600 hover:text-emerald-600'
                        }`}
                      >
                        <CheckCircle2 size={18} /> Validar Documento
                      </button>
                      <button 
                        onClick={() => handleUpdateRequirement(selectedRequirement.supplier.id, selectedRequirement.requirement.id, { status: 'EXPIRED' })}
                        className={`flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm border ${
                          selectedRequirement.requirement.status === 'EXPIRED' 
                            ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20' 
                            : 'bg-white text-slate-400 border-slate-200 hover:border-rose-600 hover:text-rose-600'
                        }`}
                      >
                        <XCircle size={18} /> Rechazar Documento
                      </button>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-200">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Observaciones IA</p>
                    <div className="bg-slate-100 p-5 rounded-2xl border border-slate-300 shadow-xs relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BrainCircuit size={40} className="text-indigo-600" />
                      </div>
                      <p className="text-[11px] font-medium text-slate-800 italic leading-relaxed relative z-10">
                        "{selectedRequirement.requirement.observations}"
                      </p>
                    </div>
                  </div>

                  <div className="pt-10">
                    <button 
                      onClick={() => {
                        setSelectedRequirement(null);
                        setNumPages(null);
                        setPageNumber(1);
                      }}
                      className="w-full py-5 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-[24px] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                      Cerrar Revisión
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {isSupplierFormOpen && (
        <SupplierForm
          onClose={() => setIsSupplierFormOpen(false)}
          onSave={(newSupData) => {
            onAddSupplier(newSupData);
            setIsSupplierFormOpen(false);
          }}
          existingSuppliers={suppliers}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default SupplierComplianceModule;
