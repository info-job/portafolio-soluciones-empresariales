
import React, { useState, useMemo, useRef } from 'react';
import { PettyCash, PettyCashExpense } from '../types';
import { extractPettyCashExpenseData } from '../geminiService';
import { CHART_OF_ACCOUNTS } from '../lib/accountingData';
import { formatCLP, validateRUT, formatRUT } from '../lib/chileanUtils';
import { maskRUT, validateRUTDetailed, maskMoneyCLP, maskFolioOrInvoice, allowOnlyRUTKey, allowOnlyDigitsKey } from '../lib/inputMasks';
import { 
  Wallet, Plus, Receipt, FileText, Image as ImageIcon, FileSearch, 
  Trash2, Download, AlertCircle, AlertTriangle, CheckCircle2, Loader2, Upload,
  ChevronRight, ArrowUpRight, ArrowDownRight, History, PieChart, RefreshCw,
  Camera, X as LucideX, Scan, Zap, Book, Save, Paperclip, DollarSign
} from 'lucide-react';

interface PettyCashModuleProps {
  pettyCashFunds: PettyCash[];
  expenses: PettyCashExpense[];
  onSaveExpense: (expense: PettyCashExpense) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateFund: (fund: PettyCash) => void;
  currentUser: string;
}

const PettyCashModule: React.FC<PettyCashModuleProps> = ({
  pettyCashFunds,
  expenses,
  onSaveExpense,
  onDeleteExpense,
  onUpdateFund,
  currentUser
}) => {
  const [activeFundId, setActiveFundId] = useState<string | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [manualExpense, setManualExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    amountDisplay: '',
    description: '',
    accountCode: '',
    documentType: 'BOLETA' as any,
    documentNumber: '',
    supplierName: '',
    supplierTaxId: ''
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Set initial active fund when funds are loaded or handle missing active fund
  React.useEffect(() => {
    if (pettyCashFunds.length > 0) {
      const exists = pettyCashFunds.some(f => f.id === activeFundId);
      if (!exists) {
        setActiveFundId(pettyCashFunds[0].id);
      }
    } else if (activeFundId !== null) {
      setActiveFundId(null);
    }
  }, [pettyCashFunds, activeFundId]);

  const activeFund = useMemo(() => 
    pettyCashFunds.find(f => f.id === activeFundId), 
    [pettyCashFunds, activeFundId]
  );

  const fundExpenses = useMemo(() => 
    expenses.filter(e => e.pettyCashId === activeFundId)
      .sort((a, b) => b.timestamp - a.timestamp),
    [expenses, activeFundId]
  );

  const stats = useMemo(() => {
    if (!activeFund) return { totalSpent: 0, remaining: 0, percentUsed: 0 };
    const totalSpent = fundExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = activeFund.initialBalance - totalSpent;
    const percentUsed = (totalSpent / activeFund.initialBalance) * 100;
    return { totalSpent, remaining, percentUsed };
  }, [activeFund, fundExpenses]);

  const handleFileUpload = async (file: File | Blob, fileName: string) => {
    if (!activeFundId) return;

    setIsExtracting(true);
    setUploadProgress(10);

    try {
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const base64Data = await fileDataPromise;
      const base64Content = base64Data.split(',')[1];
      const mimeType = file.type;

      setUploadProgress(30);

      const result = await extractPettyCashExpenseData(base64Content, mimeType);

      setUploadProgress(80);

      if (result && !result.error) {
        setUploadProgress(95);

        const newExpense: PettyCashExpense = {
          id: crypto.randomUUID(),
          pettyCashId: activeFundId!,
          date: result.date || new Date().toISOString().split('T')[0],
          description: result.description || `Gasto ${fileName}`,
          amount: result.amount || 0,
          category: 'OTROS',
          supplierName: result.supplierName || '',
          supplierTaxId: result.supplierTaxId || '',
          documentNumber: result.documentNumber || '',
          documentType: result.documentType || 'BOLETA',
          accountCode: result.accountCode || '',
          attachmentUrl: result.enhancedImage || base64Data,
          attachmentType: 'IMAGE',
          userCreator: currentUser,
          timestamp: Date.now(),
          extractedData: {
            confidence: 0.95,
            ...result
          }
        };

        onSaveExpense(newExpense);
        setIsAddingExpense(false);
      } else if (result?.error) {
        alert(`${result.message}\n\n${result.details}\n\nPor favor, ingrese los datos manualmente.`);
      }

    } catch (error) {
      console.error("Error extracting data:", error);
      alert("Error al procesar el documento con IA. Por favor, intente de nuevo o ingrese los datos manualmente.");
    } finally {
      setIsExtracting(false);
      setUploadProgress(0);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      setIsCameraLoading(true);
      setCapturedImage(null);
      
      let stream: MediaStream;
      try {
        // Try high-res first
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        });
      } catch (e) {
        console.warn("High-res camera failed, falling back to default", e);
        // Fallback to basic video
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.onloadedmetadata = () => {
          setIsCameraLoading(false);
          videoRef.current?.play().catch(e => console.error("Error playing video:", e));
        };
      }

      // Check for torch support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      if (capabilities && capabilities.torch) {
        setHasTorch(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara. Asegúrese de dar los permisos necesarios y que su dispositivo tenga cámara.");
      setIsCameraOpen(false);
      setIsCameraLoading(false);
    }
  };

  const toggleTorch = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{ torch: !isTorchOn }]
        } as any);
        setIsTorchOn(!isTorchOn);
      } catch (err) {
        console.error("Error toggling torch:", err);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setCapturedImage(null);
    setIsTorchOn(false);
    setHasTorch(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Ensure video has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("Video not ready for capture");
        return;
      }

      // Use the video's intrinsic resolution for the capture
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(dataUrl);
        
        // Visual feedback (shutter effect)
        const shutter = document.createElement('div');
        shutter.className = 'fixed inset-0 bg-white z-[400] animate-out fade-out duration-300 pointer-events-none';
        document.body.appendChild(shutter);
        setTimeout(() => shutter.remove(), 300);
      }
    }
  };

  const processCapturedImage = () => {
    if (capturedImage) {
      // Convert dataUrl to blob
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          handleFileUpload(blob, `Captura_${new Date().getTime()}.jpg`);
          stopCamera();
        });
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-50 p-4 md:p-6 overflow-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0 overflow-x-auto min-w-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <Wallet className="text-indigo-600" size={32} />
            Rendición de Caja Chica
          </h1>
          <p className="text-[10px] font-bold text-slate-600 uppercase mt-1 tracking-widest">
            Gestión de fondos fijos y rendición de gastos con IA
          </p>
        </div>

        <div className="flex gap-2">
          {pettyCashFunds.length === 0 ? (
            <button
              onClick={() => {
                const defaultFunds: PettyCash[] = [
                  { id: 'fund-inmobiliaria', name: 'OFICINA INMOBILIARIA', responsible: 'ADMINISTRACIÓN', initialBalance: 500000, currentBalance: 500000, status: 'OPEN', createdAt: new Date().toISOString(), timestamp: Date.now() },
                  { id: 'fund-centenario', name: 'EDIFICIO CENTENARIO', responsible: 'OPERACIONES', initialBalance: 500000, currentBalance: 500000, status: 'OPEN', createdAt: new Date().toISOString(), timestamp: Date.now() }
                ];
                defaultFunds.forEach(f => onUpdateFund(f));
                setActiveFundId(defaultFunds[0].id);
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all border-b-4 border-indigo-800"
            >
              Inicializar Cajas
            </button>
          ) : (
            pettyCashFunds.map(fund => (
              <button
                key={fund.id}
                onClick={() => setActiveFundId(fund.id)}
                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-b-4 ${
                  activeFundId === fund.id 
                    ? 'bg-indigo-600 text-white border-indigo-800 shadow-lg scale-105' 
                    : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {fund.name}
              </button>
            ))
          )}
        </div>
      </div>

      {activeFund ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-auto min-h-0">
          {/* Left Panel: Stats & Controls */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6 overflow-y-auto custom-audit-scroll">
            {/* Fund Card */}
            <div className="bg-white rounded-[32px] p-6 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Wallet size={24} />
                </div>
                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                  {activeFund.status}
                </span>
              </div>
              
              <div className="space-y-1 mb-6">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Saldo Disponible</p>
                <h2 className="text-3xl font-black text-slate-900 font-mono">
                  {formatCLP(stats.remaining)}
                </h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-black uppercase">
                    <span className="text-slate-600">Uso del Fondo</span>
                    <span className={stats.percentUsed > 90 ? 'text-rose-600' : 'text-indigo-600'}>
                      {stats.percentUsed.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${stats.percentUsed > 90 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(stats.percentUsed, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Inicial</p>
                    <p className="text-xs font-black text-slate-700 font-mono">{formatCLP(activeFund.initialBalance)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Gastado</p>
                    <p className="text-xs font-black text-rose-600 font-mono">{formatCLP(stats.totalSpent)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button 
                onClick={() => setIsAddingExpense(true)}
                className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 border-b-4 border-indigo-800 active:translate-y-1 active:border-b-0"
              >
                <Plus size={18} /> Registrar Gasto
              </button>

              <button 
                onClick={startCamera}
                disabled={isExtracting}
                className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 border-b-4 border-emerald-800 active:translate-y-1 active:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera size={18} /> Capturar con Cámara
              </button>

              <label className="w-full bg-white text-slate-600 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 border border-slate-200 cursor-pointer">
                <Upload size={18} className="text-indigo-600" />
                {isExtracting ? 'Procesando IA...' : 'Subir Documento (IA)'}
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, file.name);
                  }}
                  disabled={isExtracting}
                />
              </label>

              {isExtracting && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between text-[8px] font-black uppercase text-indigo-600">
                    <span>Extrayendo datos con Gemini...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1 bg-indigo-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="bg-indigo-900 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <FileSearch className="mb-4 text-indigo-300" size={32} />
                <h3 className="text-xs font-black uppercase mb-2">Lectura Inteligente</h3>
                <p className="text-[9px] text-indigo-200 leading-relaxed uppercase font-bold">
                  Suba una foto o PDF de su boleta. Nuestra IA extraerá automáticamente el RUT, monto y fecha para su rendición.
                </p>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            </div>
          </div>

          {/* Right Panel: Expense List */}
          <div className="flex-1 bg-white rounded-[40px] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Historial de Gastos</h3>
                <p className="text-[10px] font-bold text-slate-600 uppercase mt-1">
                  {fundExpenses.length} Movimientos registrados en este periodo
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    if (confirm("¿Está seguro de que desea reiniciar las cajas? Esto no borrará los gastos, pero reseteará los fondos iniciales.")) {
                      const defaultFunds: PettyCash[] = [
                        { id: 'fund-inmobiliaria', name: 'OFICINA INMOBILIARIA', responsible: 'ADMINISTRACIÓN', initialBalance: 500000, currentBalance: 500000, status: 'OPEN', createdAt: new Date().toISOString(), timestamp: Date.now() },
                        { id: 'fund-centenario', name: 'EDIFICIO CENTENARIO', responsible: 'OPERACIONES', initialBalance: 500000, currentBalance: 500000, status: 'OPEN', createdAt: new Date().toISOString(), timestamp: Date.now() }
                      ];
                      defaultFunds.forEach(f => onUpdateFund(f));
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                  title="Reiniciar Fondos"
                >
                  <RefreshCw size={20} />
                </button>
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                  <Download size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex flex-col bg-[#FAFBFD] border border-[#91A6BA] rounded-sm m-4 shadow-sm">
              {/* ERP Grid Top Bar */}
              <div className="bg-[#E9F0F8] border-b border-[#C3D5E6] px-3 py-1.5 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2 text-[#0B3C5D] font-bold">
                  <span className="font-mono bg-[#0B3C5D] text-white px-1.5 py-0.5 rounded text-[9px]">P0411PC / W0411PC</span>
                  <span>Rendición de Gastos Menores (Caja Chica: {activeFund.name})</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600 font-mono text-[9.5px]">
                    Movimientos: <strong className="text-slate-900">{fundExpenses.length}</strong>
                  </span>
                </div>
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#E2ECF5] border-b border-[#91A6BA] text-[#143B57] text-[10px] font-black uppercase tracking-wider">
                      <th className="py-2 px-3 w-10 text-center border-r border-[#B0C4D6]">#</th>
                      <th className="py-2 px-3 w-24 text-center border-r border-[#B0C4D6]">Fecha</th>
                      <th className="py-2 px-3 w-28 border-r border-[#B0C4D6]">Tipo Doc</th>
                      <th className="py-2 px-3 w-28 font-mono border-r border-[#B0C4D6]">N° Doc</th>
                      <th className="py-2 px-3 min-w-[200px] border-r border-[#B0C4D6]">Descripción</th>
                      <th className="py-2 px-3 min-w-[180px] border-r border-[#B0C4D6]">Proveedor / RUT</th>
                      <th className="py-2 px-3 w-32 text-right border-r border-[#B0C4D6]">Monto Rendido</th>
                      <th className="py-2 px-3 w-24 text-center border-r border-[#B0C4D6]">Soporte</th>
                      <th className="py-2 px-3 w-20 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5E1ED] text-[11px] font-sans">
                    {fundExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-16 text-center text-slate-500">
                          <Receipt size={36} className="mx-auto mb-2 opacity-30" />
                          <p className="font-bold uppercase tracking-wider text-xs">No hay gastos rendidos en este fondo</p>
                        </td>
                      </tr>
                    ) : (
                      fundExpenses.map((expense, idx) => (
                        <tr key={expense.id} className="hover:bg-[#EDF4FA] transition-colors border-b border-[#E2ECF5]">
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-500 border-r border-[#E2ECF5]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-700 border-r border-[#E2ECF5]">
                            {expense.date}
                          </td>
                          <td className="py-2 px-3 border-r border-[#E2ECF5]">
                            <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border ${
                              expense.documentType === "FACTURA" ? "bg-indigo-50 text-indigo-800 border-indigo-200" :
                              expense.documentType === "BOLETA" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                              "bg-slate-100 text-slate-700 border-slate-200"
                            }`}>
                              {expense.documentType}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-[#E2ECF5]">
                            #{expense.documentNumber}
                          </td>
                          <td className="py-2 px-3 border-r border-[#E2ECF5]">
                            <span className="font-black text-slate-900 uppercase">{expense.description}</span>
                          </td>
                          <td className="py-2 px-3 border-r border-[#E2ECF5]">
                            <p className="font-bold text-slate-800 uppercase">{expense.supplierName || "---"}</p>
                            {expense.supplierTaxId && (
                              <p className="text-[9px] font-mono text-slate-400">{formatRUT(expense.supplierTaxId)}</p>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900 border-r border-[#E2ECF5]">
                            {formatCLP(expense.amount)}
                          </td>
                          <td className="py-2 px-3 text-center border-r border-[#E2ECF5]">
                            {expense.attachmentUrl ? (
                              <button
                                onClick={() => window.open(expense.attachmentUrl, "_blank")}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded text-[9px] font-bold"
                                title="Ver Comprobante Digital"
                              >
                                <Paperclip size={10} />
                                <span>Ver</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 font-mono text-[9px]">---</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => onDeleteExpense(expense.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                              title="Eliminar Gasto"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ERP Bottom Status Strip */}
              <div className="bg-[#E9F0F8] border-t border-[#C3D5E6] px-4 py-1.5 flex items-center justify-between text-[9.5px] text-slate-600 font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    ERP Grid En Línea
                  </span>
                  <span>•</span>
                  <span>Total Rendido: <strong>{formatCLP(fundExpenses.reduce((acc, e) => acc + e.amount, 0))}</strong></span>
                  <span>•</span>
                  <span>Saldo Restante: <strong className="text-emerald-700">{formatCLP(activeFund.currentBalance)}</strong></span>
                </div>
                <div>
                  Registros: <strong className="text-slate-900">{fundExpenses.length}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center opacity-20">
            <AlertCircle size={64} className="mx-auto mb-4" />
            <p className="text-sm font-black uppercase tracking-[0.3em]">Seleccione un fondo para comenzar</p>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl border border-white/10">
            {!capturedImage ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="w-full h-full object-cover aspect-[3/4]"
                />
                
                {isCameraLoading && (
                  <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={48} className="text-indigo-500 animate-spin" />
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Iniciando Cámara...</p>
                  </div>
                )}
                
                {/* AI Scanning Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-12 border-2 border-emerald-500/30 rounded-3xl">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-lg" />
                    
                    {/* Scanning Line */}
                    <div className="absolute inset-x-0 h-1 bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-[scan_3s_ease-in-out_infinite]" />
                  </div>
                </div>
                
                {/* Camera Controls */}
                <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-6">
                  <div className="flex items-center gap-2 bg-emerald-500/20 px-4 py-1.5 rounded-full border border-emerald-500/30 backdrop-blur-md">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.2em]">IA: Optimizando Enfoque</p>
                  </div>
                  
                  <div className="flex items-center gap-12">
                    <button 
                      onClick={stopCamera}
                      className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                    >
                      <LucideX size={24} />
                    </button>
                    
                    <button 
                      onClick={capturePhoto}
                      className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group"
                    >
                      <div className="w-16 h-16 border-4 border-slate-900 rounded-full flex items-center justify-center">
                        <Scan size={32} className="text-slate-900 group-hover:scale-110 transition-transform" />
                      </div>
                    </button>
                    
                    {hasTorch ? (
                      <button 
                        onClick={toggleTorch}
                        className={`p-4 rounded-full transition-all ${isTorchOn ? 'bg-amber-400 text-slate-900 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        <Zap size={24} fill={isTorchOn ? "currentColor" : "none"} />
                      </button>
                    ) : (
                      <div className="w-14" />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="relative w-full h-full bg-slate-900 flex flex-col">
                <img src={capturedImage} className="w-full h-full object-contain aspect-[3/4]" alt="Preview" />
                
                <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-6">
                  <div className="flex items-center gap-2 bg-indigo-500/20 px-4 py-1.5 rounded-full border border-indigo-500/30 backdrop-blur-md">
                    <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em]">Vista Previa de Captura</p>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full max-w-xs">
                    <button 
                      onClick={() => setCapturedImage(null)}
                      className="flex-1 bg-white/10 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all"
                    >
                      Repetir
                    </button>
                    <button 
                      onClick={processCapturedImage}
                      className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={16} className="animate-spin-slow" /> Procesar con IA
                    </button>
                  </div>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            <button 
              onClick={stopCamera}
              className="absolute top-6 right-6 p-3 bg-black/40 text-white rounded-2xl hover:bg-black/60 transition-all backdrop-blur-md z-10"
            >
              <LucideX size={20} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Manual Expense Modal */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter">Registrar Nuevo Gasto</h2>
                <p className="text-[10px] font-bold text-indigo-200 uppercase mt-1">Ingreso manual de rendición</p>
              </div>
              <button onClick={() => setIsAddingExpense(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form className="p-10 space-y-6" onSubmit={(e) => {
              e.preventDefault();
              const expense: PettyCashExpense = {
                id: crypto.randomUUID(),
                pettyCashId: activeFundId!,
                date: manualExpense.date,
                description: manualExpense.description,
                amount: manualExpense.amount,
                category: 'OPERACIONAL',
                supplierName: manualExpense.supplierName,
                supplierTaxId: manualExpense.supplierTaxId,
                documentNumber: manualExpense.documentNumber,
                documentType: manualExpense.documentType,
                accountCode: manualExpense.accountCode,
                userCreator: currentUser,
                timestamp: Date.now()
              };
              onSaveExpense(expense);
              setIsAddingExpense(false);
              setManualExpense({
                date: new Date().toISOString().split('T')[0],
                amount: 0,
                amountDisplay: '',
                description: '',
                accountCode: '',
                documentType: 'BOLETA',
                documentNumber: '',
                supplierName: '',
                supplierTaxId: ''
              });
            }}>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Fecha</label>
                  <input 
                    name="date" 
                    type="date" 
                    required 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-indigo-600 outline-none transition-all" 
                    value={manualExpense.date}
                    onChange={e => setManualExpense(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Monto (CLP)</label>
                    {manualExpense.amount > 0 && (
                      <span className="text-[9px] font-bold text-emerald-600 font-mono">
                        $ {manualExpense.amount.toLocaleString('es-CL')}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input 
                      name="amount" 
                      type="text" 
                      required 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black font-mono focus:border-indigo-600 outline-none transition-all" 
                      placeholder="$ 0"
                      value={manualExpense.amountDisplay}
                      onKeyDown={allowOnlyDigitsKey}
                      onChange={e => {
                        const { rawNumber, formatted } = maskMoneyCLP(e.target.value);
                        setManualExpense(p => ({ ...p, amount: rawNumber, amountDisplay: formatted }));
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Descripción / Glosa</label>
                <input 
                  name="description" 
                  type="text" 
                  required 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-indigo-600 outline-none transition-all uppercase" 
                  placeholder="Ej: Compra de insumos oficina"
                  value={manualExpense.description}
                  onChange={e => setManualExpense(p => ({ ...p, description: e.target.value.toUpperCase() }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Cuenta Contable</label>
                <div className="relative">
                  <Book className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select 
                    name="accountCode" 
                    required 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:border-indigo-600 outline-none transition-all appearance-none"
                    value={manualExpense.accountCode}
                    onChange={e => setManualExpense(p => ({ ...p, accountCode: e.target.value }))}
                  >
                    <option value="">SELECCIONE CUENTA...</option>
                    {CHART_OF_ACCOUNTS.filter(acc => acc.type === 'EGRESOS' && acc.level >= 3).map(acc => (
                      <option key={acc.id} value={acc.code}>{acc.code} - {acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tipo Documento</label>
                  <select 
                    name="documentType" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-indigo-600 outline-none transition-all appearance-none"
                    value={manualExpense.documentType}
                    onChange={e => setManualExpense(p => ({ ...p, documentType: e.target.value as any }))}
                  >
                    <option value="BOLETA">BOLETA</option>
                    <option value="FACTURA">FACTURA</option>
                    <option value="COMPROBANTE">COMPROBANTE</option>
                    <option value="OTRO">OTRO</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Nº Documento / Folio</label>
                  <input 
                    name="documentNumber" 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-mono font-bold focus:border-indigo-600 outline-none transition-all uppercase" 
                    placeholder="0000"
                    value={manualExpense.documentNumber}
                    onChange={e => setManualExpense(p => ({ ...p, documentNumber: maskFolioOrInvoice(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Proveedor</label>
                  <input 
                    name="supplierName" 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-indigo-600 outline-none transition-all uppercase" 
                    placeholder="Nombre Fantasía"
                    value={manualExpense.supplierName}
                    onChange={e => setManualExpense(p => ({ ...p, supplierName: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RUT Proveedor</label>
                    {manualExpense.supplierTaxId && validateRUTDetailed(manualExpense.supplierTaxId).isValid ? (
                      <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full border border-emerald-200">
                        ✓ Válido
                      </span>
                    ) : manualExpense.supplierTaxId && !validateRUTDetailed(manualExpense.supplierTaxId).isValid ? (
                      <span className="text-[8px] font-black text-rose-600">
                        {validateRUTDetailed(manualExpense.supplierTaxId).error || 'Inválido'}
                      </span>
                    ) : null}
                  </div>
                  <input 
                    name="supplierTaxId" 
                    type="text" 
                    className={`w-full bg-slate-50 border-2 rounded-2xl p-4 text-sm font-mono font-bold focus:border-indigo-600 outline-none transition-all ${
                      manualExpense.supplierTaxId && !validateRUTDetailed(manualExpense.supplierTaxId).isValid
                        ? 'border-rose-300 bg-rose-50/20'
                        : manualExpense.supplierTaxId && validateRUTDetailed(manualExpense.supplierTaxId).isValid
                        ? 'border-emerald-400 bg-emerald-50/10'
                        : 'border-slate-100'
                    }`}
                    placeholder="12.345.678-K"
                    value={manualExpense.supplierTaxId}
                    onKeyDown={allowOnlyRUTKey}
                    onChange={e => setManualExpense(p => ({ ...p, supplierTaxId: maskRUT(e.target.value) }))}
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white p-5 rounded-[24px] font-black text-[12px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all border-b-4 border-indigo-800 active:translate-y-1 active:border-b-0 mt-4 flex items-center justify-center gap-2">
                <Save size={16} /> Guardar Rendición
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PettyCashModule;

const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
