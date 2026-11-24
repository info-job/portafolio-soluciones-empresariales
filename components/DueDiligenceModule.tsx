
import React, { useState, useMemo, useRef } from 'react';
import { DueDiligenceReport, Supplier, RiskLevel } from '../types';
import { aiShield } from '../lib/aiShieldMiddleware';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker safely
try {
  const actualPdfjs = (pdfjsLib as any).default || pdfjsLib;
  if (actualPdfjs && actualPdfjs.GlobalWorkerOptions) {
    const version = actualPdfjs.version || '5.5.207';
    actualPdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn("Failed to configure PDFJS workerSrc:", e);
}

import { 
  ShieldCheck, Search, Plus, FileText, Download, Filter, 
  ChevronRight, AlertTriangle, CheckCircle2, Clock, 
  User, Calendar, Building2, Layout, Printer, X, Save,
  ArrowLeft, History, BookOpen, ExternalLink, Trash2, PlusCircle,
  Upload, Sparkles, Loader2, FileSpreadsheet, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw
} from 'lucide-react';
import { exportToExcel } from '../lib/excelExport';
import { printHtmlElement } from '../lib/printDocument';

interface DueDiligenceModuleProps {
  reports: DueDiligenceReport[];
  suppliers: Supplier[];
  onSave: (report: DueDiligenceReport) => void;
  onDelete: (id: string | string[]) => void;
  onSaveSupplier: (supplier: Supplier) => void;
  onSync?: () => void;
  onRestoreDefaultReports?: () => void;
}

const DueDiligenceModule: React.FC<DueDiligenceModuleProps> = ({ 
  reports, 
  suppliers, 
  onSave, 
  onDelete, 
  onSaveSupplier, 
  onSync,
  onRestoreDefaultReports 
}) => {
  const getDaysToExpiry = (dateStr: string, riskLevel?: string) => {
    if (!dateStr) return null;
    const expirationDate = new Date(dateStr);
    if (isNaN(expirationDate.getTime())) return null;
    const isHighRisk = riskLevel === 'RIESGO ALTO';
    if (isHighRisk) {
      expirationDate.setMonth(expirationDate.getMonth() + 6);
    } else {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    }
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'RIESGO ALTO':
        return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><AlertTriangle size={10} /> ALTO</span>;
      case 'RIESGO MEDIO':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><Clock size={10} /> MEDIO</span>;
      default:
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><CheckCircle2 size={10} /> BAJO</span>;
    }
  };

  const getValidityStatus = (dateStr: string, riskLevel?: string) => {
    if (!dateStr) return null;
    const reportDate = new Date(dateStr);
    if (isNaN(reportDate.getTime())) return null;
    const today = new Date();
    const diffTime = today.getTime() - reportDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isHighRisk = riskLevel === 'RIESGO ALTO';
    const limitDays = isHighRisk ? 180 : 365;
    const daysToExpiry = limitDays - diffDays;

    if (diffDays > limitDays) {
      return { label: 'VENCIDO', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: <AlertTriangle size={10} /> };
    } else if (daysToExpiry <= 21) {
      // 15 days hábiles ≈ 21 days calendario. If less than 21 days left, the new report will arrive AFTER expiration.
      return { label: 'PLAZO CRÍTICO', color: 'text-rose-500 bg-[#FFF5F5] border-rose-400 border-2 animate-pulse', icon: <AlertTriangle size={10} /> };
    } else if (daysToExpiry <= 45) {
      // Warning zone: request now to stay covered within compliance lead times.
      return { label: 'SOLICITAR RENOVACIÓN', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: <Clock size={10} /> };
    }
    return { label: 'VIGENTE', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={10} /> };
  };

  const getExpirationDate = (dateStr: string, riskLevel?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const isHighRisk = riskLevel === 'RIESGO ALTO';
    if (isHighRisk) {
      date.setMonth(date.getMonth() + 6);
    } else {
      date.setFullYear(date.getFullYear() + 1);
    }
    try {
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };
  const [view, setView] = useState<'LIST' | 'FORM' | 'DETAIL'>('LIST');
  const [selectedReport, setSelectedReport] = useState<DueDiligenceReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [showManual, setShowManual] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ERP QBE Column Search state variables
  const [colSearchId, setColSearchId] = useState('');
  const [colSearchProveedorRut, setColSearchProveedorRut] = useState('');
  const [colSearchRiesgo, setColSearchRiesgo] = useState('');
  const [colSearchDias, setColSearchDias] = useState('');
  const [colSearchVigencia, setColSearchVigencia] = useState('');
  const [colSearchVence, setColSearchVence] = useState('');
  const [colSearchAnalista, setColSearchAnalista] = useState('');
  const [colSearchEstado, setColSearchEstado] = useState('');

  // Sorting state
  const [sortKey, setSortKey] = useState<string>('date'); // default: date
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // default: desc (most recent first)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ArrowUpDown size={11} className="text-slate-350 shrink-0 select-none opacity-50 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp size={11} className="text-indigo-600 shrink-0 font-black animate-bounce" />
      : <ArrowDown size={11} className="text-indigo-600 shrink-0 font-black animate-bounce" />;
  };

  // Form State
  const [formData, setFormData] = useState<Partial<DueDiligenceReport>>({
    status: 'BORRADOR',
    riskLevel: 'RIESGO BAJO',
    findings: [],
    attachments: []
  });

  const filteredReports = useMemo(() => {
    return (reports || []).filter(r => {
      if (!r) return false;
      const name = (r.supplierName || '').trim();
      const taxId = (r.supplierTaxId || '').trim();
      const analyst = (r.analyst || '').trim();
      const rId = (r.id || '').trim();
      const rDate = (r.date || '').trim();
      const riskLevel = (r.riskLevel || '').trim();
      const rStatus = (r.status || '').trim();

      const matchesSearch = 
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        taxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        analyst.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRisk = riskFilter === 'ALL' || r.riskLevel === riskFilter;

      // QBE Column searches
      const matchesColId = !colSearchId || rId.toLowerCase().includes(colSearchId.toLowerCase()) || rDate.toLowerCase().includes(colSearchId.toLowerCase());
      const matchesColProveedorRut = !colSearchProveedorRut || name.toLowerCase().includes(colSearchProveedorRut.toLowerCase()) || taxId.toLowerCase().includes(colSearchProveedorRut.toLowerCase());
      const matchesColRiesgo = !colSearchRiesgo || riskLevel.toLowerCase().includes(colSearchRiesgo.toLowerCase());
      
      const days = getDaysToExpiry(r.date, r.riskLevel);
      const daysStr = days !== null ? `${days} días` : '-';
      const matchesColDias = !colSearchDias || daysStr.toLowerCase().includes(colSearchDias.toLowerCase());

      const validity = getValidityStatus(r.date, r.riskLevel);
      const validityLabel = validity?.label || '';
      const matchesColVigencia = !colSearchVigencia || validityLabel.toLowerCase().includes(colSearchVigencia.toLowerCase());

      const expDate = getExpirationDate(r.date, r.riskLevel);
      const matchesColVence = !colSearchVence || expDate.toLowerCase().includes(colSearchVence.toLowerCase());

      const matchesColAnalista = !colSearchAnalista || analyst.toLowerCase().includes(colSearchAnalista.toLowerCase());
      const matchesColEstado = !colSearchEstado || rStatus.toLowerCase().includes(colSearchEstado.toLowerCase());

      return matchesSearch && matchesRisk &&
             matchesColId && matchesColProveedorRut && matchesColRiesgo && matchesColDias &&
             matchesColVigencia && matchesColVence && matchesColAnalista && matchesColEstado;
    }).sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortKey === 'date') {
        const timeA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
        const timeB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      } else if (sortKey === 'supplier') {
        valA = (a.supplierName || '').trim().toLowerCase();
        valB = (b.supplierName || '').trim().toLowerCase();
      } else if (sortKey === 'risk') {
        const riskScore: Record<string, number> = { 'RIESGO BAJO': 1, 'RIESGO MEDIO': 2, 'RIESGO ALTO': 3 };
        valA = riskScore[a.riskLevel] || 0;
        valB = riskScore[b.riskLevel] || 0;
      } else if (sortKey === 'expiry') {
        valA = getDaysToExpiry(a.date, a.riskLevel) ?? 99999;
        valB = getDaysToExpiry(b.date, b.riskLevel) ?? 99999;
      } else if (sortKey === 'validity') {
        const valScore: Record<string, number> = { 'VIGENTE': 3, 'SOLICITAR RENOVACIÓN': 2, 'PLAZO CRÍTICO': 1, 'VENCIDO': 0 };
        const statusA = getValidityStatus(a.date, a.riskLevel)?.label || '';
        const statusB = getValidityStatus(b.date, b.riskLevel)?.label || '';
        valA = valScore[statusA] ?? 0;
        valB = valScore[statusB] ?? 0;
      } else if (sortKey === 'expiration') {
        valA = getExpirationDate(a.date, a.riskLevel);
        valB = getExpirationDate(b.date, b.riskLevel);
      } else if (sortKey === 'analyst') {
        valA = (a.analyst || '').trim().toLowerCase();
        valB = (b.analyst || '').trim().toLowerCase();
      } else if (sortKey === 'status') {
        valA = (a.status || '').trim().toLowerCase();
        valB = (b.status || '').trim().toLowerCase();
      } else {
        const tA = a.timestamp || 0;
        const tB = b.timestamp || 0;
        return sortOrder === 'asc' ? tA - tB : tB - tA;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [
    reports, searchTerm, riskFilter,
    colSearchId, colSearchProveedorRut, colSearchRiesgo, colSearchDias, colSearchVigencia, colSearchVence, colSearchAnalista, colSearchEstado,
    sortKey, sortOrder
  ]);

  const handleCreateNew = () => {
    setFormData({
      id: `DD-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      status: 'BORRADOR',
      riskLevel: 'RIESGO BAJO',
      analyst: sessionStorage.getItem('active_user')?.toUpperCase() || '',
      findings: [''],
      attachments: [],
      timestamp: Date.now()
    });
    setView('FORM');
  };

  const handleEdit = (report: DueDiligenceReport) => {
    setFormData(report);
    setView('FORM');
  };

  const handleViewDetail = (report: DueDiligenceReport) => {
    setSelectedReport(report);
    setView('DETAIL');
  };

  const handleSave = () => {
    if (!formData.supplierId || !formData.analyst || !formData.summary) {
      alert("Por favor complete los campos obligatorios (Proveedor, Analista, Resumen)");
      return;
    }

    const reportToSave = {
      ...formData,
      timestamp: Date.now()
    } as DueDiligenceReport;

    onSave(reportToSave);
    setView('LIST');
  };

  const addFinding = () => {
    setFormData(prev => ({
      ...prev,
      findings: [...(prev.findings || []), '']
    }));
  };

  const updateFinding = (index: number, value: string) => {
    const newFindings = [...(formData.findings || [])];
    newFindings[index] = value;
    setFormData(prev => ({ ...prev, findings: newFindings }));
  };

  const removeFinding = (index: number) => {
    const newFindings = [...(formData.findings || [])];
    newFindings.splice(index, 1);
    setFormData(prev => ({ ...prev, findings: newFindings }));
  };

  const extractTextFromPDF = async (file: File, onProgress: (p: number) => void): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const actualPdfjs = (pdfjsLib as any).default || pdfjsLib;
      const loadingTask = actualPdfjs.getDocument({ data: arrayBuffer });
      
      // Add a timeout for PDF loading
      const pdf = await Promise.race([
        loadingTask.promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout al cargar PDF")), 30000))
      ]);

      let fullText = '';
      const pagesToProcess = Math.min(pdf.numPages, 15);
      
      for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let lastY = -1;
        let pageText = '';
        
        for (const item of textContent.items as any[]) {
          if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          }
          pageText += item.str + ' ';
          lastY = item.transform[5];
        }
        
        fullText += `--- PÁGINA ${i} ---\n${pageText}\n\n`;
        onProgress((i / pagesToProcess) * 100);
        
        // Yield to main thread to prevent UI freeze
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      return fullText.trim();
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      throw error;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsExtracting(true);
    setExtractionProgress(0);
    
    try {
      const totalFiles = files.length;
      let processedCount = 0;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const fileBaseProgress = (i / totalFiles) * 100;
        const fileWeight = 100 / totalFiles;

        try {
          if (file.type === 'application/pdf') {
            const text = await extractTextFromPDF(file, (p) => {
              setExtractionProgress(fileBaseProgress + (p * 0.4 * fileWeight) / 100);
            });
            
            if (text) {
              await extractDataWithAI(text, 'text/plain', totalFiles > 1, (p) => {
                setExtractionProgress(fileBaseProgress + (40 * fileWeight / 100) + (p * 0.6 * fileWeight) / 100);
              });
            } else {
              const base64Data = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target?.result?.toString().split(',')[1] || '');
                reader.readAsDataURL(file);
              });
              if (base64Data) {
                await extractDataWithAI(base64Data, file.type, totalFiles > 1, (p) => {
                  setExtractionProgress(fileBaseProgress + (p * fileWeight) / 100);
                });
              }
            }
          } else if (file.type.startsWith('image/')) {
            const base64Data = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (event) => resolve(event.target?.result?.toString().split(',')[1] || '');
              reader.readAsDataURL(file);
            });
            if (base64Data) {
              await extractDataWithAI(base64Data, file.type, totalFiles > 1, (p) => {
                setExtractionProgress(fileBaseProgress + (p * fileWeight) / 100);
              });
            }
          }
          processedCount++;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
        
        setExtractionProgress(((i + 1) / totalFiles) * 100);
        
        if (i < totalFiles - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay for safety
        }
      }

      if (totalFiles > 1) {
        alert(`Procesamiento completado: ${processedCount} de ${totalFiles} informes procesados con éxito.`);
      }
    } catch (error) {
      console.error("Fatal error in bulk upload:", error);
      alert("Ocurrió un error crítico durante la carga masiva.");
    } finally {
      setIsExtracting(false);
      setExtractionProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const extractDataWithAI = async (
    content: string, 
    mimeType: string, 
    skipViewChange: boolean = false,
    onProgress?: (p: number) => void
  ) => {
    try {
      const isText = mimeType === 'text/plain';
      onProgress?.(10);

      onProgress?.(30);

      const result: any = await aiShield.executeWithGuard(
        { modelName: "gemini-3.8-flash", actionDescription: "Análisis Due Diligence" },
        async () => {
          const fetchPromise = fetch('/api/gemini/due-diligence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, mimeType })
          }).then(async res => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || `HTTP error ${res.status}`);
            }
            return res.json();
          });

          return await Promise.race([
            fetchPromise,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout en la respuesta de IA")), 45000))
          ]);
        }
      );

      onProgress?.(80);
      
      if (result.supplier && result.report) {
        onProgress?.(90);
        // Check if supplier exists
        let supplierId = '';
        const existingSupplier = (suppliers || []).find(s => s.taxId === (result.supplier?.taxId || ''));
        
        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          // Create new supplier
          const newId = `sup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const newSupplier: Supplier = {
            id: newId,
            folio: `PROV-AI-${Date.now().toString().slice(-4)}`,
            taxId: result.supplier.taxId,
            name: result.supplier.name,
            category: result.supplier.category || 'OTROS',
            taxDocumentType: 'FACTURA',
            requestDate: new Date().toISOString().split('T')[0],
            contactName: result.supplier.contactName || 'Extraído por IA',
            email: result.supplier.email || '',
            phone: result.supplier.phone || '',
            address: result.supplier.address || '',
            bankName: '',
            accountType: '',
            accountNumber: '',
            status: 'PENDING_APPROVAL',
            userCreator: sessionStorage.getItem('active_user')?.toUpperCase() || 'SISTEMA',
            timestamp: Date.now(),
            dueDiligenceDate: result.report.date || new Date().toISOString().split('T')[0],
            dueDiligenceRisk: result.report.riskLevel,
            complianceMaster: {
              conflictThirdParty: false,
              conflictExecutive: false,
              beneficiariesUAF: false,
              dueDiligenceCert: true,
              paymentVoucher: false,
              invoice: false,
              receptionCertificate: false,
              photoSet: false
            },
            lockedBy: null,
            lockedAt: null
          };
          onSaveSupplier(newSupplier);
          supplierId = newId;
        }

        const newReport: DueDiligenceReport = {
          id: `DD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          supplierId,
          supplierName: result.supplier.name,
          supplierTaxId: result.supplier.taxId,
          date: result.report.date || new Date().toISOString().split('T')[0],
          riskLevel: result.report.riskLevel,
          analyst: sessionStorage.getItem('active_user')?.toUpperCase() || 'SISTEMA',
          summary: result.report.summary,
          backgroundCheck: result.report.backgroundCheck,
          financialAnalysis: result.report.financialAnalysis,
          legalStatus: result.report.legalStatus,
          reputationCheck: result.report.reputationCheck,
          findings: result.report.findings || [],
          recommendations: result.report.recommendations,
          status: 'FINALIZADO',
          attachments: [],
          timestamp: Date.now()
        };

        const cleanTaxId = result.supplier.taxId?.trim() || '';
        const hasExistingReport = reports.some(r => r.supplierTaxId?.trim() === cleanTaxId);
        if (hasExistingReport) {
          alert(`📢 NOTIFICACIÓN DE SISTEMA:\n\nEl proveedor "${result.supplier.name}" (RUT: ${cleanTaxId}) ya se encuentra registrado en el sistema.\n\nEl informe actual ha sido procesado y se guardará como la versión de evaluación más reciente.`);
        }

        onSave(newReport);
        onProgress?.(100);
        
        if (!skipViewChange) {
          setSelectedReport(newReport);
          setView('DETAIL');
        }
      } else {
        throw new Error("Estructura de IA inválida");
      }
    } catch (error) {
      console.error("AI Extraction error:", error);
      if (!skipViewChange) {
        alert(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`);
      }
      throw error;
    }
  };


  const handleExport = async () => {
    const dataToExport = filteredReports.map(report => {
      const validity = getValidityStatus(report.date, report.riskLevel);
      const daysToExpiry = getDaysToExpiry(report.date, report.riskLevel);
      return {
        'ID Informe': report.id,
        'Fecha Emisión': report.date,
        'Proveedor': report.supplierName,
        'RUT Proveedor': report.supplierTaxId,
        'Nivel de Riesgo': report.riskLevel,
        'Estado Vigencia': validity?.label || 'DESCONOCIDO',
        'Días para Expiración': daysToExpiry !== null ? daysToExpiry : 'N/A',
        'Vencimiento': getExpirationDate(report.date, report.riskLevel),
        'Analista': report.analyst,
        'Estado Informe': report.status,
        'Resumen Ejecutivo': report.summary,
        'Antecedentes': report.backgroundCheck,
        'Análisis Financiero': report.financialAnalysis,
        'Situación Legal': report.legalStatus,
        'Reputación': report.reputationCheck,
        'Hallazgos Detectados': (report.findings || []).join('; '),
        'Recomendaciones': report.recommendations,
        'Fecha de Carga': new Date(report.timestamp).toLocaleString()
      };
    });

    await exportToExcel(
      dataToExport, 
      `Maestro_Debida_Diligencia_${new Date().toISOString().split('T')[0]}`, 
      'Debida Diligencia'
    );
  };

  if (view === 'FORM') {

    return (
      <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
        <div className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('LIST')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              {formData.id?.includes('new') ? 'Nuevo Informe' : 'Editar Informe'} de Debida Diligencia
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setFormData(prev => ({ ...prev, status: prev.status === 'BORRADOR' ? 'FINALIZADO' : 'BORRADOR' }))}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.status === 'FINALIZADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
            >
              {formData.status}
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Save size={16} /> Guardar Informe
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor</label>
                <select 
                  value={formData.supplierId || ''}
                  onChange={(e) => {
                    const sup = (suppliers || []).find(s => s.id === e.target.value);
                    if (sup) {
                      setFormData(prev => ({
                        ...prev,
                        supplierId: sup.id,
                        supplierName: sup.name,
                        supplierTaxId: sup.taxId
                      }));
                    }
                  }}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="">Seleccionar Proveedor...</option>
                  {(suppliers || []).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.taxId})</option>
                  ))}
                </select>
              </div>

              <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel de Riesgo</label>
                <div className="flex gap-2">
                  {(['RIESGO BAJO', 'RIESGO MEDIO', 'RIESGO ALTO'] as RiskLevel[]).map(risk => (
                    <button
                      key={risk}
                      onClick={() => setFormData(prev => ({ ...prev, riskLevel: risk }))}
                      className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase transition-all border-2 ${
                        formData.riskLevel === risk 
                          ? risk === 'RIESGO ALTO' ? 'bg-rose-50 border-rose-500 text-rose-700' : 
                            risk === 'RIESGO MEDIO' ? 'bg-amber-50 border-amber-500 text-amber-700' : 
                            'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {risk.split(' ')[1]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analista Responsable</label>
                <input 
                  type="text"
                  value={formData.analyst || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, analyst: e.target.value.toUpperCase() }))}
                  placeholder="NOMBRE DEL ANALISTA"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Analysis Sections */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <BookOpen size={14} className="text-indigo-500" /> Resumen Ejecutivo
                </label>
                <textarea 
                  value={formData.summary || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Resumen general de la evaluación..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-medium outline-none focus:border-indigo-500 transition-all min-h-[120px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antecedentes Generales</label>
                  <textarea 
                    value={formData.backgroundCheck || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, backgroundCheck: e.target.value }))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-medium outline-none focus:border-indigo-500 transition-all min-h-[100px]"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Análisis Financiero</label>
                  <textarea 
                    value={formData.financialAnalysis || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, financialAnalysis: e.target.value }))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-medium outline-none focus:border-indigo-500 transition-all min-h-[100px]"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Situación Legal</label>
                  <textarea 
                    value={formData.legalStatus || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, legalStatus: e.target.value }))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-medium outline-none focus:border-indigo-500 transition-all min-h-[100px]"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reputación y Referencias</label>
                  <textarea 
                    value={formData.reputationCheck || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, reputationCheck: e.target.value }))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-medium outline-none focus:border-indigo-500 transition-all min-h-[100px]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hallazgos Clave</label>
                  <button onClick={addFinding} className="text-indigo-600 hover:text-indigo-700 p-1">
                    <PlusCircle size={20} />
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.findings?.map((finding, idx) => (
                    <div key={idx} className="flex gap-3">
                      <input 
                        type="text"
                        value={finding}
                        onChange={(e) => updateFinding(idx, e.target.value)}
                        placeholder={`Hallazgo #${idx + 1}`}
                        className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 text-xs font-medium outline-none focus:border-indigo-500 transition-all"
                      />
                      <button onClick={() => removeFinding(idx)} className="text-rose-400 hover:text-rose-600 p-2">
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" /> Recomendaciones Finales
                </label>
                <textarea 
                  value={formData.recommendations || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                  placeholder="Acciones recomendadas o condiciones de aprobación..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-medium outline-none focus:border-indigo-500 transition-all min-h-[120px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'DETAIL' && selectedReport) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <div className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between shrink-0 no-print">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('LIST')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Detalle de Informe</h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => printHtmlElement('printable-due-diligence-detail', `Informe_Debida_Diligencia_${selectedReport.id}`)} 
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all cursor-pointer active:scale-95"
            >
              <Printer size={16} /> Imprimir PDF
            </button>
            <button onClick={() => handleEdit(selectedReport)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-100 transition-all">
              <FileText size={16} /> Editar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-12 print:p-0">
          <div id="printable-due-diligence-detail" className="max-w-4xl mx-auto bg-white print:shadow-none space-y-12">
            {/* Report Header */}
            <div className="flex justify-between items-start border-b-4 border-indigo-600 pb-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-slate-900 uppercase leading-none">Informe de Debida Diligencia</h1>
                <p className="text-indigo-600 font-black tracking-widest uppercase text-sm">Folio: {selectedReport.id}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase">Fecha de Emisión</p>
                <p className="text-lg font-black text-slate-800">{selectedReport.date}</p>
                <div className="flex flex-col items-end gap-2">
                  {getRiskBadge(selectedReport.riskLevel)}
                  {(() => {
                    const status = getValidityStatus(selectedReport.date, selectedReport.riskLevel);
                    return status && (
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Entity Info */}
            <div className="grid grid-cols-2 gap-12 bg-slate-50 p-8 rounded-[40px]">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-600">
                  <Building2 size={20} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Entidad Evaluada</h3>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-black text-slate-900 uppercase">{selectedReport.supplierName}</p>
                  <p className="text-sm font-bold text-slate-500">RUT: {selectedReport.supplierTaxId}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-600">
                  <User size={20} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Analista Responsable</h3>
                </div>
                <p className="text-xl font-black text-slate-900 uppercase">{selectedReport.analyst}</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="space-y-10">
              <section className="space-y-4">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] border-l-4 border-indigo-600 pl-4">Resumen Ejecutivo</h3>
                <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{selectedReport.summary}</p>
              </section>

              <div className="grid grid-cols-2 gap-12">
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Antecedentes</h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedReport.backgroundCheck}</p>
                </section>
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Análisis Financiero</h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedReport.financialAnalysis}</p>
                </section>
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Situación Legal</h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedReport.legalStatus}</p>
                </section>
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Reputación</h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedReport.reputationCheck}</p>
                </section>
              </div>

              <section className="bg-slate-900 text-white p-10 rounded-[48px] space-y-6">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em]">Hallazgos y Conclusiones</h3>
                <div className="space-y-4">
                  {(selectedReport.findings || []).map((f, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black border border-indigo-500/30">
                        {i + 1}
                      </div>
                      <p className="text-sm font-medium text-slate-300">{f}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="p-10 border-4 border-emerald-100 rounded-[48px] space-y-6">
                <div className="flex items-center gap-3 text-emerald-600">
                  <ShieldCheck size={24} />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Recomendaciones y Mitigación</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-bold italic whitespace-pre-wrap">{selectedReport.recommendations}</p>
              </section>
            </div>

            {/* Footer */}
            <div className="pt-12 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <p>Generado por Sistema de Gestión Inmobiliaria</p>
              <p>{new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 overflow-auto">
      {/* Header */}
      <div className="min-h-20 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center px-4 md:px-10 justify-between gap-4 shrink-0 overflow-x-auto min-w-0">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Debida Diligencia</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Gestión de Informes de Riesgo</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="BUSCAR INFORME..."
              className="bg-slate-50 border-2 border-slate-100 rounded-full px-12 py-2.5 text-[10px] font-black uppercase w-[300px] outline-none focus:border-indigo-500 transition-all"
            />
            <Search size={18} className="absolute left-4 top-2.5 text-slate-300" />
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting}
              className="relative flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 overflow-hidden"
            >
              {isExtracting && (
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300 ease-out"
                  style={{ width: `${extractionProgress}%` }}
                />
              )}
              {isExtracting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Procesando ({Math.round(extractionProgress)}%)...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Subir Informe (IA)
                </>
              )}
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-6 py-2.5 bg-white text-emerald-700 border-2 border-emerald-100 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-50 transition-all shadow-xl shadow-emerald-600/5"
            >
              <FileSpreadsheet size={18} /> Exportar Excel
            </button>
            <button 
              onClick={() => setShowManual(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 text-indigo-700 border-2 border-indigo-100 rounded-2xl text-[10px] font-black uppercase hover:bg-indigo-100 transition-all shadow-xl shadow-indigo-600/5"
            >
              <BookOpen size={18} /> Manual CMP-PP-01
            </button>
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
            >
              <Plus size={18} /> Nuevo Informe Manual
            </button>
            {onRestoreDefaultReports && (
              <button 
                onClick={onRestoreDefaultReports}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/20"
                title="Restaurar datos de prueba originales de Debida Diligencia"
              >
                <RefreshCw size={16} /> Restaurar Informes
              </button>
            )}
            {onSync && (
              <button 
                onClick={async () => {
                  try {
                    await onSync();
                  } catch (error) {
                    console.error("Error during permanent sync:", error);
                  }
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/10"
              >
                <Save size={18} /> Guardar Permanente
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-10 py-4 bg-white border-b border-slate-100 flex items-center gap-6 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros:</span>
        </div>
        <div className="flex gap-2">
          {(['ALL', 'RIESGO BAJO', 'RIESGO MEDIO', 'RIESGO ALTO'] as const).map(f => (
            <button
              key={f}
              onClick={() => setRiskFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${
                riskFilter === f ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {f === 'ALL' ? 'TODOS' : f.split(' ')[1]}
            </button>
          ))}
        </div>

      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-10 min-h-0">
        <div className="max-w-7xl mx-auto space-y-6">


          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 select-none">
                  <th 
                    onClick={() => handleSort('date')}
                    className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/80 hover:text-slate-600 transition-colors group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ID / Fecha</span>
                      {getSortIcon('date')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('supplier')}
                    className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/80 hover:text-slate-600 transition-colors group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Proveedor / RUT</span>
                      {getSortIcon('supplier')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('risk')}
                    className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/80 hover:text-slate-600 transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Riesgo</span>
                      {getSortIcon('risk')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('expiry')}
                    className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/80 hover:text-slate-600 transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Días p/ Expirar</span>
                      {getSortIcon('expiry')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('validity')}
                    className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/80 hover:text-slate-600 transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Vigencia</span>
                      {getSortIcon('validity')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('expiration')}
                    className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/80 hover:text-slate-600 transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Vigente hasta</span>
                      {getSortIcon('expiration')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('analyst')}
                    className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/80 hover:text-slate-600 transition-colors group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Analista</span>
                      {getSortIcon('analyst')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/80 hover:text-slate-600 transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Estado</span>
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Drill Down</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
                <tr className="bg-slate-100/70 border-b border-slate-200">
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="Filtrar ID/Fecha..."
                      value={colSearchId}
                      onChange={e => setColSearchId(e.target.value)}
                      className="w-full px-2 py-1 text-[10px] bg-white border border-slate-200 rounded-lg text-slate-705 placeholder-slate-400 focus:outline-hidden font-bold"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="Filtrar Proveedor/RUT..."
                      value={colSearchProveedorRut}
                      onChange={e => setColSearchProveedorRut(e.target.value)}
                      className="w-full px-2 py-1 text-[10px] bg-white border border-slate-200 rounded-lg text-slate-705 placeholder-slate-400 focus:outline-hidden font-bold"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="Filtrar Riesgo..."
                      value={colSearchRiesgo}
                      onChange={e => setColSearchRiesgo(e.target.value)}
                      className="w-full px-1 py-1 text-[10px] bg-white border border-slate-200 rounded-lg text-slate-705 placeholder-slate-400 focus:outline-hidden font-bold text-center"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="Filtrar Días..."
                      value={colSearchDias}
                      onChange={e => setColSearchDias(e.target.value)}
                      className="w-full px-1 py-1 text-[10px] bg-white border border-slate-200 rounded-lg text-slate-705 placeholder-slate-400 focus:outline-hidden font-bold text-center"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="Filtrar Vigencia..."
                      value={colSearchVigencia}
                      onChange={e => setColSearchVigencia(e.target.value)}
                      className="w-full px-1 py-1 text-[10px] bg-white border border-slate-200 rounded-lg text-slate-705 placeholder-slate-400 focus:outline-hidden font-bold text-center"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="Filtrar Vence..."
                      value={colSearchVence}
                      onChange={e => setColSearchVence(e.target.value)}
                      className="w-full px-1 py-1 text-[10px] bg-white border border-slate-200 rounded-lg text-slate-705 placeholder-slate-400 focus:outline-hidden font-bold text-center font-mono"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="Filtrar Analista..."
                      value={colSearchAnalista}
                      onChange={e => setColSearchAnalista(e.target.value)}
                      className="w-full px-2 py-1 text-[10px] bg-white border border-slate-200 rounded-lg text-slate-705 placeholder-slate-400 focus:outline-hidden font-bold"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input 
                      type="text" 
                      placeholder="Filtrar Estado..."
                      value={colSearchEstado}
                      onChange={e => setColSearchEstado(e.target.value)}
                      className="w-full px-1 py-1 text-[10px] bg-white border border-slate-200 rounded-lg text-slate-705 placeholder-slate-400 focus:outline-hidden font-bold text-center"
                    />
                  </td>
                  <td className="px-2 py-2 text-center text-slate-300 font-sans font-bold">-</td>
                  <td className="px-4 py-2 text-center text-slate-300 font-sans font-bold">-</td>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center text-slate-300">
                      <div className="flex flex-col items-center gap-4">
                        <ShieldCheck size={48} strokeWidth={1} className="text-slate-400" />
                        <p className="text-sm font-black uppercase tracking-widest text-slate-600">No se encontraron informes</p>
                        <p className="text-xs text-slate-400 max-w-md text-center font-medium">
                          No existen informes coincidentes. Si los datos de demostración fueron borrados, puedes restaurarlos con el siguiente botón:
                        </p>
                        {onRestoreDefaultReports && (
                          <button 
                            onClick={onRestoreDefaultReports}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all cursor-pointer mt-2"
                          >
                            <RefreshCw size={16} /> Restaurar Informes de Debida Diligencia
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : filteredReports.map(report => {
                  const validity = getValidityStatus(report.date, report.riskLevel);
                  const cleanTaxId = report.supplierTaxId?.trim() || '';

                  return (
                    <tr 
                      key={report.id} 
                      className={`hover:bg-indigo-50/30 cursor-pointer transition-colors group border-l-4 border-l-transparent hover:border-l-indigo-500 ${
                        report.timestamp > Date.now() - 48 * 60 * 60 * 1000 ? 'bg-indigo-50/40 ring-1 ring-inset ring-indigo-500/20 shadow-sm' : ''
                      }`}
                      onClick={() => handleViewDetail(report)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-indigo-600 uppercase">{report.id}</span>
                             {report.timestamp > Date.now() - 48 * 60 * 60 * 1000 && (
                               <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[7px] font-black uppercase animate-pulse">NUEVO</span>
                             )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{report.date}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-800 uppercase group-hover:text-indigo-600 transition-colors">
                              {report.supplierName}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{report.supplierTaxId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {getRiskBadge(report.riskLevel)}
                        </div>
                      </td>
                    <td className="px-6 py-4 text-center">
                      {(() => {
                        const days = getDaysToExpiry(report.date, report.riskLevel);
                        if (days === null) return <span className="text-slate-300">-</span>;
                        const isCritical = days <= 21; // Zone where new report won't arrive on time
                        const isWarning = days <= 45; // Zone where renewal should be requested
                        const isExpired = days < 0;
                        
                        return (
                          <div className="flex flex-col items-center">
                            <span className={`text-[11px] font-black ${isExpired ? 'text-rose-600' : isCritical ? 'text-rose-500' : isWarning ? 'text-amber-600' : 'text-slate-700'}`}>
                              {days} días
                            </span>
                            {isCritical && !isExpired && (
                              <span className="text-[7px] font-black text-rose-400 uppercase leading-none mt-0.5">Fuera de Plazo Compliance</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        {validity && (
                          <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase flex items-center gap-1 border ${validity.color}`}>
                            {validity.icon} {validity.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[10px] font-black text-slate-700 uppercase">{getExpirationDate(report.date, report.riskLevel)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{report.analyst}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${report.status === 'FINALIZADO' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{report.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleViewDetail(report)}
                        className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1 mx-auto"
                      >
                        <ExternalLink size={12} /> Detalle
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => handleViewDetail(report)}
                          title="Ver Detalle"
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <button 
                          onClick={() => handleEdit(report)}
                          title="Editar"
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        >
                          <FileText size={16} />
                        </button>
                        <button 
                          onClick={() => onDelete(report.id)}
                          title="Eliminar"
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
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
      
      {showManual && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-800/40 backdrop-blur-xs p-4 md:p-10 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[85vh] shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-white text-slate-900 border-b border-slate-300 flex justify-between items-center shadow-2xs">
              <div className="flex items-center gap-3">
                <BookOpen className="text-indigo-700" size={24} />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Manual del Proceso de Debida Diligencia</h3>
                  <p className="text-[10px] font-bold text-slate-600 uppercase">CÓDIGO: CMP-PP-01 | VERSIÓN 2026.04</p>
                </div>
              </div>
              <button 
                onClick={() => setShowManual(false)} 
                className="hover:bg-slate-100 p-2 rounded-full transition-all text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-10 space-y-8 text-left text-xs text-slate-600 font-sans leading-relaxed custom-audit-scroll">
              
              {/* Bloque Autoría de Cumplimiento */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase">Elaborado por</span>
                  <p className="font-bold text-slate-700">Isidora Salazar V.</p>
                  <p className="text-[9px] font-bold text-indigo-500 uppercase text-xs">Analista de Cumplimiento</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase">Revisado por</span>
                  <p className="font-bold text-slate-700">Paula Figueroa C.</p>
                  <p className="text-[9px] font-bold text-indigo-500 uppercase text-xs">Encargado de Cumplimiento</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase">Validado por</span>
                  <p className="font-bold text-slate-700">Ramiro Rosales Ch.</p>
                  <p className="text-[9px] font-bold text-indigo-500 uppercase text-xs">Subgerente</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase">Aprobado por</span>
                  <p className="font-bold text-slate-700">René Ureta T.</p>
                  <p className="text-[9px] font-bold text-indigo-500 uppercase text-xs">Gerente de Finanzas</p>
                </div>
              </div>

              {/* Sección 1 */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[9px] font-bold">1</span> 
                  Marco General y Sujeto Obligado
                </h4>
                <p>
                  Bajo la reglamentación de la <strong>Ley N° 19.913</strong>, <strong>Ley N° 21.732</strong>, y las directrices emanadas de la <strong>Unidad de Análisis Financiero (UAF)</strong>, en particular la <strong>Circular N° 62</strong>, la organización opera bajo el carácter de <strong>Sujeto Obligado</strong>. Esto impone el deber legal y ético de reportar operaciones sospechosas y estructurar un control riguroso de debida diligencia de clientes, contrapartes operacionales, y proveedores del sistema de compras.
                </p>
              </div>

              {/* Sección 2 */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[9px] font-bold">2</span> 
                  Debida Diligencia de Clientes (Siniestros e Incorporaciones)
                </h4>
                <p>
                  Se distinguen dos tipos principales de debida diligencia aplicadas a clientes:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Diligencia Simplificada:</strong> Aplicada por defecto a contrapartes de bajo riesgo en su fase de incorporación inicial.</li>
                  <li><strong>Diligencia Reforzada (Siniestros / PEP):</strong> Se gatilla obligatoriamente cuando un cliente es declarado como Persona Expuesta Políticamente (PEP) o se gestiona el cobro o liquidación de siniestros. Exige:
                    <ul className="list-circle pl-5 mt-1 space-y-0.5">
                      <li>Actualización semestral de antecedentes financieros e identidad.</li>
                      <li>Monitoreo continuo de transacciones especiales.</li>
                      <li>Aprobación o rechazo explícito por el Comité Directivo de Cumplimiento.</li>
                    </ul>
                  </li>
                </ul>
              </div>

              {/* Sección 3 */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[9px] font-bold">3</span> 
                  Debida Diligencia de Proveedores y Contrataciones
                </h4>
                <p>
                  La contratación de proveedores operacionales y de servicios está regulada de manera estricta para evitar la filtración de riesgos penales o reputacionales:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1.5">
                  <li><strong>Umbral Operativo Integral:</strong> La Debida Diligencia es de carácter <strong>MANDATORIO</strong> para cualquier proveedor que mantenga transacciones acumuladas u operaciones contractuales equivalentes a un monto igual o superior a <strong>$1.000.000 (un millón de pesos chilenos)</strong> durante el periodo anual.</li>
                  <li><strong>Contratos por Licitación o Monoproveedor:</strong> Todo proveedor incorporado mediante canales de licitaciones o bajo esquemas monoproveedor (Sole Source) debe ser auditado de forma mandatoria.</li>
                  <li><strong>Declaraciones Juradas Críticas:</strong> Es un requerimiento insalvable la retención y firma electrónica de:
                    <ul className="list-circle pl-5 mt-1 space-y-0.5">
                      <li>La <strong>Declaración de Conflicto de Interés de Terceros</strong>.</li>
                      <li>La <strong>Declaración de Beneficiarios Finales (UBO)</strong>, estableciendo la obligación de transparentar a cualquier persona jurídica o natural que posea de manera directa o indirecta una participación accionaria, de capital, o de derechos de voto igual o superior al <strong>10%</strong>.</li>
                    </ul>
                  </li>
                </ul>
              </div>

              {/* Sección 4 */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[9px] font-bold">4</span> 
                  Clave de Expiración, Plazos y Niveles de Riesgo
                </h4>
                <p>
                  La vigencia del informe de debida diligencia está directamente condicionada por la categorización de riesgo asignada por el Analista de Cumplimiento o sugerida por la Auditoría de Inteligencia Artificial:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[8px] font-black uppercase">RIESGO BAJO</span>
                    <h5 className="font-bold text-emerald-950 mt-2 text-[10px]">Vigencia: 1 Año (12 Meses)</h5>
                    <p className="text-[9px] text-emerald-800 mt-1">Sin hallazgos significativos, sin vinculación a personas de interés o personas políticamente expuestas.</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[8px] font-black uppercase">RIESGO MEDIO</span>
                    <h5 className="font-bold text-amber-950 mt-2 text-[10px]">Vigencia: 1 Año (12 Meses)</h5>
                    <p className="text-[9px] text-amber-800 mt-1">Vínculos indirectos de bajo nivel o dudas menores que requieren aclaración transaccional periódica.</p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[8px] font-black uppercase">RIESGO ALTO</span>
                    <h5 className="font-bold text-rose-950 mt-2 text-[10px]">Vigencia: 6 Meses (Mitigación)</h5>
                    <p className="text-[9px] text-rose-800 mt-1">Candidatos PEP, vínculos de interés nacional o internacional, o noticias de prensa que requieran mitigaciones periódicas.</p>
                  </div>
                </div>

                <div className="pt-2 p-3.5 bg-rose-100/40 rounded-xl border border-rose-200 flex gap-3 text-[10px]">
                  <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-black text-rose-900 uppercase">RIESGO INACEPTABLE / VINCULACIÓN DIRECTA CRÍTICA</span>
                    <p className="text-rose-800 mt-1 leading-normal font-medium">
                      Bahu la norma CMP-PP-01, se define como <strong>Riesgo Inaceptable</strong> la presencia de juicios activos, formalizaciones judiciales, acusaciones criminales del Ministerio Público, o sentencias condenatorias firmes relacionadas con <strong>Lavado de Activos (LA), Financiamiento del Terrorismo (FT), Financiamiento de la Proliferación de Armas (FP)</strong>, u otros delitos de la de Ley Penal de Responsabilidad de Personas Jurídicas. Dichas relaciones deben ser <strong>RECHAZADAS INMEDIATAMENTE</strong> por el Encargado de Cumplimiento.
                    </p>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="px-8 py-4.5 bg-slate-100 border-t border-slate-300 flex justify-end">
              <button 
                onClick={() => setShowManual(false)} 
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-xl text-[10px] font-black uppercase transition-all shadow-xs cursor-pointer"
              >
                Entendido, Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default DueDiligenceModule;
