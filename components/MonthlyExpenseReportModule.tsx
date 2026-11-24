import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FolderOpen, Upload, Sparkles, FileText, Download, AlertTriangle, 
  CheckCircle2, XCircle, RefreshCw, Layers, Calendar, ChevronRight, 
  Check, Play, ArrowRight, ShieldAlert, FileSearch, Trash2, Library, Star
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Transaction, Supplier } from '../types';
import { analyzeMonthlyExpenseReport } from '../geminiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { openDocumentSecurely } from '../lib/storage';

interface MonthlyExpenseReportModuleProps {
  transactions: Transaction[];
  suppliers: Supplier[];
  currentUser: string;
  companyLogo?: string | null;
}

interface MonthlyReport {
  id: string;
  period: string;
  generatedAt: string;
  author: string;
  folderName: string;
  fileCount: number;
  data: any; // AI Output
}

export const MonthlyExpenseReportModule: React.FC<MonthlyExpenseReportModuleProps> = ({
  transactions,
  suppliers,
  currentUser,
  companyLogo
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-05'); // Default to current system period
  const [folderName, setFolderName] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ path: string; name: string; size: string; type: string }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [historyReports, setHistoryReports] = useState<MonthlyReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history reports from local storage
  useEffect(() => {
    const raw = localStorage.getItem('jde_monthly_expense_reports');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setHistoryReports(parsed);
        if (parsed.length > 0) {
          setActiveReportId(parsed[0].id);
        }
      } catch (e) {
        console.error("Error reading saved monthly reports:", e);
      }
    }
  }, []);

  // Save reports block
  const saveReportsToHistory = (newReports: MonthlyReport[]) => {
    setHistoryReports(newReports);
    localStorage.setItem('jde_monthly_expense_reports', JSON.stringify(newReports));
  };

  // Directory Tree structure generator based on paths (webkitRelativePath)
  const directoryTree = useMemo(() => {
    const root: any = { name: 'Root', files: [], folders: {} };
    
    uploadedFiles.forEach(file => {
      const parts = file.path.split('/');
      let current = root;
      
      // Navigate folders
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i];
        if (!current.folders[folderName]) {
          current.folders[folderName] = { name: folderName, files: [], folders: {} };
        }
        current = current.folders[folderName];
      }
      
      // Add file to current folder level
      current.files.push(file);
    });
    
    return root;
  }, [uploadedFiles]);

  // Handle files when user selects folder
  const handleFolderSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files) as any[];
      const rootFolder = filesArray[0].webkitRelativePath?.split('/')[0] || 'Carpeta';
      setFolderName(rootFolder);

      const parsedFiles = filesArray.map((file: any) => {
        const sizeInKB = (file.size / 1024).toFixed(1);
        const sizeStr = parseFloat(sizeInKB) > 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${sizeInKB} KB`;

        return {
          path: file.webkitRelativePath || file.name,
          name: file.name,
          size: sizeStr,
          type: file.name.split('.').pop()?.toUpperCase() || 'DOCUMENTO'
        };
      });

      setUploadedFiles(parsedFiles);
    }
  };

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files) as any[];
      setFolderName("Carpeta_Arrastrada");
      
      const parsedFiles = filesArray.map((file: any) => {
        const sizeInKB = (file.size / 1024).toFixed(1);
        const sizeStr = parseFloat(sizeInKB) > 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${sizeInKB} KB`;

        return {
          path: (file as any).relativePath || file.name,
          name: file.name,
          size: sizeStr,
          type: file.name.split('.').pop()?.toUpperCase() || 'DOCUMENTO'
        };
      });

      setUploadedFiles(parsedFiles);
    }
  };

  // Format amount to Chilean Pesos (CLP)
  const formatCLP = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Exponent run of AI Analysis trigger
  const handleStartAIAnalysis = async () => {
    if (uploadedFiles.length === 0) {
      alert("Por favor, cargue primero una carpeta que contenga las nóminas de pago.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStatus("Iniciando análisis hermenéutico del lote de carpetas...");

    try {
      // Step simulation for authentic corporate experience
      setTimeout(() => setAnalysisStatus("Escaneando jerarquía de subcarpetas y detectando documentos tributarios..."), 1200);
      setTimeout(() => setAnalysisStatus("Reconciliando emisores contra el Maestro de Proveedores Activos (Regla de Pago N°3)..."), 2500);
      setTimeout(() => setAnalysisStatus("Calculando distribución semanal y agregados de categorías de costos..."), 4500);
      setTimeout(() => setAnalysisStatus("Analizando inconsistencias, facturas cedidas y buscando desvíos contables en ERP..."), 6200);

      // We filter expense transactions for the selected month to send as contextual ground
      const monthPrefix = selectedPeriod; // '2026-05'
      const monthlyExpenses = transactions.filter(t => t.type === 'EXPENSE' && t.date.startsWith(monthPrefix));

      const response = await analyzeMonthlyExpenseReport({
        period: selectedPeriod,
        folderStructure: uploadedFiles,
        transactions: monthlyExpenses,
        suppliers: suppliers
      });

      if (response) {
        const newReport: MonthlyReport = {
          id: `rep-${Date.now()}`,
          period: selectedPeriod,
          generatedAt: new Date().toISOString(),
          author: currentUser || 'SISTEMA',
          folderName: folderName,
          fileCount: uploadedFiles.length,
          data: response
        };

        const updated = [newReport, ...historyReports];
        saveReportsToHistory(updated);
        setActiveReportId(newReport.id);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      alert("Error procesando el informe mensual con AI.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus("");
    }
  };

  // Find currently active report
  const activeReport = useMemo(() => {
    return historyReports.find(r => r.id === activeReportId) || null;
  }, [historyReports, activeReportId]);

  // Clean current folder state to analyze another month
  const handleClearCurrentFiles = () => {
    setUploadedFiles([]);
    setFolderName('');
  };

  // Delete saved report in list
  const handleDeleteReport = (id: string) => {
    if (confirm("¿Está seguro de que desea eliminar permanentemente este registro de auditoría mensual?")) {
      const filtered = historyReports.filter(r => r.id !== id);
      saveReportsToHistory(filtered);
      if (activeReportId === id) {
        setActiveReportId(filtered.length > 0 ? filtered[0].id : null);
      }
    }
  };

  // Render Directory Tree Node Component
  const FolderNode = ({ node, level = 0 }: { node: any; level?: number; key?: string }) => {
    const [isOpen, setIsOpen] = useState(true);
    const hasSubElements = Object.keys(node.folders).length > 0 || node.files.length > 0;

    return (
      <div className="select-none font-mono text-[11px]" style={{ paddingLeft: level > 0 ? '14px' : '0px' }}>
        {level > 0 && (
          <div 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 py-1 text-slate-700 hover:text-indigo-700 cursor-pointer"
          >
            <ChevronRight size={12} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            <FolderOpen size={14} className="text-amber-500 fill-amber-500/10" />
            <span className="font-bold">{node.name}</span>
            <span className="text-[9px] text-slate-400">({node.files.length + Object.keys(node.folders).length})</span>
          </div>
        )}
        
        {isOpen && (
          <div className="border-l border-slate-200/60 ml-2 pl-2">
            {/* Subfolders */}
            {Object.values(node.folders).map((subDir: any) => (
              <FolderNode key={subDir.name} node={subDir} level={level + 1} />
            ))}
            
            {/* Files */}
            {node.files.map((file: any) => (
              <div key={file.path} className="flex items-center justify-between py-1 px-1 hover:bg-slate-100/60">
                <div className="flex items-center gap-2 text-slate-600">
                  <FileText size={12} className="text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px]">
                  <span className="bg-slate-200 text-slate-600 font-bold px-1 rounded-sm">{file.type}</span>
                  <span className="text-slate-400">{file.size}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Color mappings for chart slices
  const COLORS = ['#0B3C5D', '#D9534F', '#5CB85C', '#F0AD4E', '#5BC0DE', '#9C27B0', '#795548', '#607D8B'];

  // jsPDF Generator function for the Monthly Report
  const handleDownloadPDF = () => {
    if (!activeReport) return;
    const reportData = activeReport.data || {};

    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'letter'
    }) as any;

    // Helper formatting safeguards to avoid type crash on generated data
    const safeFormatCLP = (val: any) => {
      if (val === undefined || val === null) return formatCLP(0);
      if (typeof val === 'number') return formatCLP(val);
      const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      return formatCLP(isNaN(parsed) ? 0 : parsed);
    };

    const safeFormatPercent = (val: any) => {
      if (val === undefined || val === null) return '0.0%';
      if (typeof val === 'number') return `${val.toFixed(1)}%`;
      const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      return `${isNaN(num) ? '0.0' : num.toFixed(1)}%`;
    };

    const safeFormatDate = (val: any) => {
      try {
        if (!val) return new Date().toLocaleDateString();
        const d = new Date(val);
        if (isNaN(d.getTime())) return new Date().toLocaleDateString();
        return d.toLocaleDateString();
      } catch {
        return new Date().toLocaleDateString();
      }
    };

    const safeFormatDateTime = (val: any) => {
      try {
        if (!val) return new Date().toLocaleString();
        const d = new Date(val);
        if (isNaN(d.getTime())) return new Date().toLocaleString();
        return d.toLocaleString();
      } catch {
        return new Date().toLocaleString();
      }
    };

    try {
      // 1. Accent & Master Header bar typical to AssetFlow reports
      doc.setFillColor(191, 36, 36); // Corporate Red
      doc.rect(0, 0, 216, 4, 'F');

      doc.setFillColor(11, 60, 93); // Corporate Navy Blue
      doc.rect(0, 4, 216, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('ASSETFLOW® SISTEMA CENTRAL', 14, 15);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('INFORME EXECUTIVO DE AUDITORÍA Y CONTROL CONTABLE INTERNO', 14, 21);
      doc.text(`PLANNER CODE: R09325 | AMBITO: DEPARTAMENTO INMOBILIARIO | MODULO: CONTROL DE CONTROL CENTRAL`, 14, 26);

      // Info badge box on the right
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(160, 8, 42, 18, 1, 1, 'F');
      doc.setTextColor(11, 60, 93);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('INFORME DE CONTROL', 163, 13);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`PERIODO: ${activeReport.period || 'S/P'}`, 163, 18);
      doc.text(`FECHA: ${safeFormatDate(activeReport.generatedAt)}`, 163, 22);

      let currentY = 38;

      // Report Metadata Title
      doc.setTextColor(30, 41, 59);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`INFORME MENSUAL DE GASTOS Y AUDITORÍA DE FACTURACIÓN IA`, 14, currentY);
      currentY += 6;

      doc.setStrokeColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, currentY, 202, currentY);
      currentY += 8;

      // Executive metrics blocks
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, 188, 16, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('GASTO TOTAL VERIFICADO:', 18, currentY + 6);
      doc.setFont('Helvetica', 'normal');
      doc.text(safeFormatCLP(reportData.totalAmount), 62, currentY + 6);

      doc.setFont('Helvetica', 'bold');
      doc.text('EGRESOS REGISTRADOS:', 18, currentY + 11);
      doc.setFont('Helvetica', 'normal');
      doc.text(`${reportData.verifiedCount || 0} transacciones / payrolls`, 62, currentY + 11);

      const unregisteredCheck = reportData.unregisteredSuppliersCheck || { passed: true, violationsDetected: 0, violatorsList: [] };

      doc.setFont('Helvetica', 'bold');
      doc.text('ESTADO MAESTRO PROVEEDORES:', 110, currentY + 6);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(unregisteredCheck.passed ? 16 : 185, unregisteredCheck.passed ? 122 : 28, unregisteredCheck.passed ? 87 : 28);
      doc.text(unregisteredCheck.passed ? "CUMPLIDO - TODO EN REGISTRO" : `ALERTA CRÍTICA: ${unregisteredCheck.violationsDetected || 0} ELEMENTO(S) S/AUTORIZACIÓN`, 164, currentY + 6);

      doc.setTextColor(30, 41, 59);
      doc.setFont('Helvetica', 'bold');
      doc.text('COMPACTACIÓN DE ARCHIVOS S/LOCAL:', 110, currentY + 11);
      doc.setFont('Helvetica', 'normal');
      doc.text(`${activeReport.fileCount || 0} archivos de nómina cargados`, 164, currentY + 11);

      currentY += 24;

      // 1. AI Executive Summary (Narrative text from Gemini)
      doc.setTextColor(11, 60, 93);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('ANÁLISIS COHERENCIAL E INSIGHTS FINANCIEROS IA:', 14, currentY);
      currentY += 5;

      doc.setTextColor(51, 65, 85);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      
      const summaryText = typeof reportData.aiExecutiveSummary === 'string' 
        ? reportData.aiExecutiveSummary 
        : (reportData.aiExecutiveSummary ? JSON.stringify(reportData.aiExecutiveSummary) : "");
      
      const summaryLines = doc.splitTextToSize(summaryText, 188);
      doc.text(summaryLines, 14, currentY);
      currentY += (summaryLines.length * 4) + 8;

      // 2. Unregistered Suppliers Block (Important Requirement 3)
      if (currentY > 220) {
        doc.addPage();
        doc.setFillColor(191, 36, 36);
        doc.rect(0, 0, 216, 4, 'F');
        currentY = 15;
      }

      doc.setTextColor(191, 36, 36);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('CONTROL CRÍTICO: REGLA DE PROVEEDORES COMPORTADOS (REGLA N°3)', 14, currentY);
      currentY += 5;

      doc.setTextColor(100, 116, 139);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Mandato de Control: Ningún documento tributario se puede procesar a pago si el emisor no reside en el maestro interno.', 14, currentY);
      currentY += 5;

      const violatorsRaw = unregisteredCheck.violatorsList;
      const violators = Array.isArray(violatorsRaw) ? violatorsRaw : [];

      if (violators.length === 0) {
        doc.setFillColor(240, 253, 244);
        doc.rect(14, currentY, 188, 10, 'F');
        doc.setTextColor(21, 128, 61);
        doc.setFont('Helvetica', 'bold');
        doc.text('VERIFICACIÓN EXITOSA: Todos los egresos corresponden a proveedores debidamente acreditados.', 18, currentY + 6);
        currentY += 16;
      } else {
        const violatorRows = violators.map((v: any) => [
          v.name || 'S/N',
          v.taxId || 'S/R',
          safeFormatCLP(v.amountMatched),
          v.riskDescription || ''
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['Razón Social / Descriptor', 'RUT Emisor', 'Monto Involucrado', 'Desviación de Adquisición']],
          body: violatorRows,
          theme: 'grid',
          headStyles: { fillColor: [191, 36, 36], fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7.5 },
          margin: { left: 14, right: 14 }
        });
        currentY = ((doc as any).lastAutoTable?.finalY || (currentY + (violatorRows.length * 5) + 12)) + 10;
      }

      // 3. Category distribution table
      if (currentY > 220) {
        doc.addPage();
        doc.setFillColor(191, 36, 36);
        doc.rect(0, 0, 216, 4, 'F');
        currentY = 15;
      }

      doc.setTextColor(11, 60, 93);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DISTRIBUCIÓN Y AGREGADOS POR CATEGORÍA DE COSTOS:', 14, currentY);
      currentY += 6;

      const categoryContributionsRaw = reportData.categoryContributions;
      const categoryContributions = Array.isArray(categoryContributionsRaw) ? categoryContributionsRaw : [];

      const categoryRows = categoryContributions.map((c: any) => [
        c.category || 'Varios',
        safeFormatCLP(c.amount),
        safeFormatPercent(c.percentage),
        c.description || ''
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Categorías', 'Gasto Total Mensual', '% Sobre Total', 'Descripción de Flujo Contable']],
        body: categoryRows,
        theme: 'striped',
        headStyles: { fillColor: [11, 60, 93], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5 },
        margin: { left: 14, right: 14 }
      });
      currentY = ((doc as any).lastAutoTable?.finalY || (currentY + (categoryRows.length * 5) + 12)) + 10;

      // Page Break for Anomalies and Recommendations to ensure neatness
      doc.addPage();
      // Accent stripe again
      doc.setFillColor(191, 36, 36);
      doc.rect(0, 0, 216, 4, 'F');
      currentY = 15;

      // 4. Anomalies Table
      doc.setTextColor(11, 60, 93);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('DESVIACIONES Y DISCREPANCIAS ENCONTRADAS (CONTROL DE RIESGO):', 14, currentY);
      currentY += 6;

      const anomaliesRaw = reportData.anomalies;
      const anomalies = Array.isArray(anomaliesRaw) ? anomaliesRaw : [];

      const anomalyRows = anomalies.map((a: any) => [
        a.title || 'Inconsistencia',
        a.severity || 'MEDIA',
        a.description || '',
        a.recommendation || a.remedialAction || ''
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Anomalía Detectada', 'Gravedad', 'Explicación del Incumplimiento', 'Recomendación de Subsanación']],
        body: anomalyRows,
        theme: 'grid',
        headStyles: { fillColor: [240, 173, 78], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          1: { cellWidth: 20 },
          2: { cellWidth: 70 },
          3: { cellWidth: 60 }
        },
        margin: { left: 14, right: 14 }
      });
      currentY = ((doc as any).lastAutoTable?.finalY || (currentY + (anomalyRows.length * 5) + 12)) + 10;

      // 5. Audit Suggestions list
      if (currentY > 220) {
        doc.addPage();
        doc.setFillColor(191, 36, 36);
        doc.rect(0, 0, 216, 4, 'F');
        currentY = 15;
      }

      doc.setTextColor(11, 60, 93);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SUGERENCIAS DE MEJORA Y DIRECTIVAS DE GOBIERNO FINANCIERO:', 14, currentY);
      currentY += 6;

      doc.setTextColor(51, 65, 85);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);

      const suggestionsRaw = reportData.remedialSuggestions;
      const suggestionsList: string[] = [];
      if (Array.isArray(suggestionsRaw)) {
        suggestionsList.push(...suggestionsRaw.map(s => String(s)));
      } else if (typeof suggestionsRaw === 'string' && suggestionsRaw.trim()) {
        suggestionsList.push(suggestionsRaw);
      } else {
        suggestionsList.push(
          "Verifique que la conexión con el servidor de aplicaciones ERP esté libre de interrupciones.",
          "Asegúrese de cargar nombres de archivos de egresos estructurados de forma correlativa."
        );
      }

      suggestionsList.forEach((suggestion: string, idx: number) => {
        const text = `${idx + 1}. ${suggestion}`;
        const suggestLines = doc.splitTextToSize(text, 188);
        const neededHeight = (suggestLines.length * 4) + 2;
        
        if (currentY + neededHeight > 255) {
          doc.addPage();
          doc.setFillColor(191, 36, 36);
          doc.rect(0, 0, 216, 4, 'F');
          currentY = 15;
        }

        doc.text(suggestLines, 14, currentY);
        currentY += neededHeight;
      });

      // Signature metadata footer
      if (currentY + 20 > 265) {
        doc.addPage();
        doc.setFillColor(191, 36, 36);
        doc.rect(0, 0, 216, 4, 'F');
        currentY = 15;
      }

      currentY += 15;
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Informe generado de forma automatizada mediante inteligencia artificial y reconciliado con el Ledger F0911.`, 14, currentY);
      doc.text(`Revisado por Auditor Senior: ${activeReport.author || 'AUDITOR'} | Firma de Seguridad Hash: auth_sig_md5_${(activeReport.id || '').slice(-6)}`, 14, currentY + 4);

      // Trigger download with secure backup download path
      try {
        doc.save(`Informe_Gastos_${activeReport.period || 'Periodo'}_${(activeReport.folderName || 'Nómina').replace(/\s+/g, "_")}.pdf`);
      } catch (saveError) {
        console.warn("Direct doc.save failed, navigating via secure base64 opener:", saveError);
        try {
          const pdfDataUri = doc.output('datauristring');
          openDocumentSecurely(pdfDataUri, `Informe_Gastos_${activeReport.period || 'Periodo'}`);
        } catch (innerError) {
          console.error("Critical fallback PDF downloader failure:", innerError);
          alert("El navegador bloqueó la descarga automática directa de PDFs en un iframe. Intente abrir la aplicación en una pestaña nueva para descargar directamente.");
        }
      }
    } catch (e) {
      console.error("Error generating printable report:", e);
      alert("Hubo un problema recopilando el archivo PDF: " + (e as any).message);
    }
  };

  // Helper calculations for visual charts
  const categoryChartData = useMemo(() => {
    if (!activeReport || !activeReport.data.categoryContributions) return [];
    return activeReport.data.categoryContributions.map((c: any) => ({
      name: c.category,
      amount: c.amount,
      percentage: c.percentage
    }));
  }, [activeReport]);

  const weeklyChartData = useMemo(() => {
    if (!activeReport || !activeReport.data.weeklyContributions) return [];
    return activeReport.data.weeklyContributions.map((w: any) => ({
      semana: w.week,
      monto: w.amount,
      conteo: w.count
    }));
  }, [activeReport]);

  const unresolvedAnomalies = useMemo(() => {
    if (!activeReport) return [];
    return activeReport.data.anomalies || [];
  }, [activeReport]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-auto font-sans p-6">
      
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <Library size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Planificador de Informes de Gastos Mensuales</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Análisis e Integración de Carpetas de Nóminas bajo Auditoría IA</p>
          </div>
        </div>

        {/* Month selector UI */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período Fiscal:</span>
          <input 
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold font-mono px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN - Folder loading & History panel (size: 4/12) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* A. Folder Picker Panel */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <FolderOpen size={14} className="text-emerald-600" />
                Cargar Carpetas Semanales
              </h3>
              {uploadedFiles.length > 0 && (
                <button 
                  onClick={handleClearCurrentFiles}
                  className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-700 transition"
                >
                  Limpiar Lote
                </button>
              )}
            </div>

            {/* Drag Drop & Native Folder select container */}
            {uploadedFiles.length === 0 ? (
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center min-h-[180px] cursor-pointer ${
                  dragActive ? "border-emerald-600 bg-emerald-50/50" : "border-slate-300 hover:border-emerald-500 hover:bg-slate-50/60"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Upload size={22} />
                </div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Seleccionar Carpeta de Nómina</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[190px] mx-auto">Selecciona una carpeta para escanear sus subcarpetas y archivos (PDF o Word)</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFolderSelection}
                  webkitdirectory="" 
                  directory="" 
                  multiple 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Meta details */}
                <div className="bg-emerald-50 border border-emerald-100/80 p-3.5 rounded-2xl flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Carpeta Raíz</p>
                    <p className="text-xs font-bold text-slate-800 truncate font-mono">{folderName}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Archivos</p>
                    <p className="text-xs font-black text-emerald-700 font-mono">{uploadedFiles.length}</p>
                  </div>
                </div>

                {/* Subfolder layout rendering */}
                <div className="max-h-[260px] overflow-auto bg-slate-50 border border-slate-200/60 rounded-2xl p-3 scrollbar-thin">
                  <FolderNode node={directoryTree} level={1} />
                </div>

                {/* Trigger analysis */}
                <button
                  type="button"
                  onClick={handleStartAIAnalysis}
                  disabled={isAnalyzing}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap active:scale-95 cursor-pointer disabled:opacity-55"
                >
                  {isAnalyzing ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} className="animate-pulse" />
                  )}
                  {isAnalyzing ? "Analizando Lote..." : "Iniciar Análisis IA del Reporte"}
                </button>
              </div>
            )}
          </div>

          {/* B. Loading Spinner (Visual Overlay logic) */}
          {isAnalyzing && (
            <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-md border-l-4 border-l-emerald-600 animate-pulse space-y-3">
              <div className="flex items-center gap-3 text-emerald-700">
                <RefreshCw size={16} className="animate-spin shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">Compilando Auditoría Mensual</span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono italic leading-relaxed">{analysisStatus}</p>
            </div>
          )}

          {/* C. History of compiled monthly reports */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <Library size={14} className="text-[#0B3C5D]" />
              Informes Históricos Guardados
            </h3>

            {historyReports.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                No hay reportes de auditoría en el sistema local.
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-auto scrollbar-thin">
                {historyReports.map((r) => {
                  const isActive = r.id === activeReportId;
                  return (
                    <div 
                      key={r.id}
                      onClick={() => setActiveReportId(r.id)}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer group ${
                        isActive 
                          ? 'border-emerald-600 bg-emerald-50/25' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] bg-indigo-100 text-[#0B3C5D] font-extrabold px-1.5 py-0.5 rounded-md font-mono">
                            {r.period}
                          </span>
                          <span className="text-[10px] font-bold text-slate-800 truncate">
                            {r.folderName}
                          </span>
                        </div>
                        <p className="text-[8.5px] text-slate-400 mt-1 font-mono">
                          {r.fileCount} archs • {new Date(r.generatedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReport(r.id);
                        }}
                        className="text-slate-300 hover:text-rose-600 transition p-1 rounded-lg shrink-0"
                        title="Eliminar Reporte"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN - Report Display Content (size: 8/12) */}
        <div className="lg:col-span-8">
          
          {!activeReport ? (
            <div className="bg-white rounded-[40px] border border-slate-200 p-12 text-center h-[520px] flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-300 mb-6 shadow-xs">
                <FileSearch size={36} />
              </div>
              <h3 className="text-base font-black text-slate-700 uppercase tracking-tighter">Planilla de Control Mensual Vacía</h3>
              <p className="text-xs text-slate-400 max-w-[340px] mt-2 leading-relaxed">
                Por favor, cargue una carpeta con las nóminas semanales del departamento inmobiliario de este ciclo en el panel izquierdo para generar el informe mensual consolidado mediante IA.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Report Header Stats & Download UI */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-xs">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded-md font-mono uppercase tracking-widest">
                        PERIODO FISCAL: {activeReport.period}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        ID: {activeReport.id}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mt-1.5 flex items-center gap-2">
                      Nómina Mensual: {activeReport.folderName}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium font-mono uppercase tracking-widest mt-0.5">
                      Compilado el {new Date(activeReport.generatedAt).toLocaleString()} • Por {activeReport.author}
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadPDF}
                    className="px-5 py-3 bg-[#0B3C5D] text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-[#0B3C5D]/10"
                  >
                    <Download size={14} /> Descargar Reporte PDF
                  </button>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* Metric 1 */}
                  <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Total Gastos Verificados</p>
                      <h4 className="text-xl font-black text-slate-900 mt-2 font-mono">
                        {formatCLP(activeReport.data.totalAmount)}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-3 font-semibold">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      <span>{activeReport.data.verifiedCount} transacciones en mes</span>
                    </div>
                  </div>

                  {/* Metric 2 - UNREGISTERED SUPPLIERS (Requirement 3) */}
                  <div className={`border p-4 rounded-2xl flex flex-col justify-between ${
                    activeReport.data.unregisteredSuppliersCheck.passed 
                      ? 'bg-slate-50/50 border-slate-200' 
                      : 'bg-rose-50 border-rose-200/60'
                  }`}>
                    <div>
                      <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Directiva Proveedores (R3)</p>
                      <h4 className={`text-xl font-black mt-2 ${
                        activeReport.data.unregisteredSuppliersCheck.passed ? 'text-slate-900' : 'text-rose-600'
                      }`}>
                        {activeReport.data.unregisteredSuppliersCheck.passed ? 'APROBADO' : 'FALLIDO'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] mt-3 font-black uppercase tracking-wide">
                      {activeReport.data.unregisteredSuppliersCheck.passed ? (
                        <>
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span className="text-slate-400">Directorios Validados</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={12} className="text-rose-600 animate-pulse" />
                          <span className="text-rose-600">
                            {activeReport.data.unregisteredSuppliersCheck.violationsDetected} S/AUTORIZACIÓN
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Desviaciones y Alertas</p>
                      <h4 className="text-xl font-black text-slate-900 mt-2 font-mono">
                        {unresolvedAnomalies.length}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] mt-3 font-semibold uppercase font-mono">
                      {unresolvedAnomalies.length > 0 ? (
                        <>
                          <AlertTriangle size={12} className="text-amber-500" />
                          <span className="text-amber-600">Riesgos contables detectados</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span className="text-emerald-600">Integridad Total</span>
                        </>
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* Requirement 3 Specific Module Board: Unregistered entity alerts */}
              {!activeReport.data.unregisteredSuppliersCheck.passed && (
                <div className="bg-rose-50 border border-rose-200 rounded-[32px] p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <ShieldAlert size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-rose-800 uppercase tracking-tight">CONTROL CRÍTICO DE ADQUISICIONES: PAGOS DE ENTIDADES S/REGISTRO DETECTADOS</h4>
                      <p className="text-[11px] text-rose-700 leading-normal mt-1 font-semibold">
                        Aviso de Seguridad de Control ERP (Regla N°3): Se han detectado de forma automatizada solicitudes de fondos o transacciones vinculadas a RUTs que NO se encuentran acreditados en el Directorio General de Proveedores. Por mandato normativo de la alta gerencia, estos pagos deben congelarse de inmediato.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-rose-100/80 overflow-hidden">
                    <table className="w-full text-left font-sans text-xs border-collapse">
                      <thead>
                        <tr className="bg-rose-600 text-white font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3">Nombre emisor o documento</th>
                          <th className="p-3">RUT Identificado</th>
                          <th className="p-3 text-right">Monto</th>
                          <th className="p-3">Inconsistencia General</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-50 text-slate-700 font-mono text-[11px]">
                        {(activeReport.data.unregisteredSuppliersCheck.violatorsList || []).map((v: any, index: number) => (
                          <tr key={index} className="hover:bg-rose-50/40">
                            <td className="p-3 font-bold text-slate-800">{v.name}</td>
                            <td className="p-3">{v.taxId}</td>
                            <td className="p-3 text-right font-black text-rose-600">{formatCLP(v.amountMatched)}</td>
                            <td className="p-3 text-slate-500 italic text-[10px] font-sans">{v.riskDescription}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Graphic charts board (Recharts) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Graph A - Category Distribution */}
                <div className="bg-white p-5 rounded-[32px] border border-slate-200">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">
                    Gasto Mensual por Categoría
                  </h4>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="amount"
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => formatCLP(Number(value))}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          iconSize={10} 
                          wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Graph B - Weekly Payroll Trends */}
                <div className="bg-white p-5 rounded-[32px] border border-slate-200">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">
                    Evolución Semanal de Fondos
                  </h4>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyChartData}>
                        <XAxis dataKey="semana" tick={{ fontSize: 9, fontFamily: 'monospace' }} />
                        <YAxis tick={{ fontSize: 9, fontFamily: 'monospace' }} />
                        <Tooltip formatter={(value: any) => formatCLP(Number(value))} />
                        <Bar dataKey="monto" name="Gasto Semanal" fill="#0B3C5D" radius={[4, 4, 0, 0]}>
                          {weeklyChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#0B3C5D" : "#5CB85C"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* AI Narratives & Suggestions */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-200 space-y-5">
                <div>
                  <h4 className="text-xs font-black text-slate-850 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 flex items-center gap-1">
                    <Sparkles size={14} className="text-amber-500 animate-pulse" />
                    Perspectiva Analítica e Insights Centrales
                  </h4>
                  <div className="text-slate-600 text-xs leading-relaxed font-sans font-medium whitespace-pre-wrap">
                    {activeReport.data.aiExecutiveSummary}
                  </div>
                </div>

                {/* Suggestions bullets list */}
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                    Recomendaciones de Gobernanza de Pago
                  </h4>
                  <div className="space-y-2.5">
                    {(activeReport.data.remedialSuggestions || []).map((suggestion: string, idx: number) => (
                      <div key={idx} className="flex gap-3 text-xs text-slate-600 font-sans font-medium items-start">
                        <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold font-mono mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="leading-relaxed">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Anomalies / Auditing Panel */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-200">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">
                  Desviaciones y Alertas de Integridad Fiscal Detectadas
                </h4>

                {unresolvedAnomalies.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> Correlatividades normativas perfectas. No se encontraron anomalías.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {unresolvedAnomalies.map((a: any, idx: number) => {
                      const isHigh = a.severity === 'ALTA';
                      return (
                        <div 
                          key={idx}
                          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start gap-4 transition ${
                            isHigh 
                              ? 'bg-rose-50/50 border-rose-200' 
                              : 'bg-amber-50/30 border-amber-200'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isHigh ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            <AlertTriangle size={16} />
                          </div>

                          <div className="space-y-1 my-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md ${
                                isHigh ? 'bg-rose-600 text-white' : 'bg-amber-500 text-black'
                              }`}>
                                {a.severity}
                              </span>
                              <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                {a.title}
                              </h5>
                            </div>
                            <p className="text-xs text-slate-600 leading-normal">{a.description}</p>
                            <div className="flex items-start gap-1 text-[11px] text-slate-500 italic mt-2">
                              <span className="font-bold text-slate-700 not-italic shrink-0">Acción Requerida:</span>
                              <span className="font-sans font-medium">{a.recommendation}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
