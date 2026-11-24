
import React, { useState } from 'react';
import { Supplier, Transaction, Contract, USER_CREDENTIALS, ModuleType } from '../types';
import { 
  CheckCircle, XCircle, Clock, AlertTriangle, ArrowRight, 
  User, Building2, Wallet, Zap, ClipboardList, ShieldAlert, FileSignature, ShieldCheck, Cloud, ExternalLink, FileUp, FileText,
  Download, Eye, Sparkles, X, Check, Printer, FileDown, GraduationCap, Scale, Award, Briefcase
} from 'lucide-react';
import { exportToExcel } from '../lib/excelExport';
import { downloadCristianCvPdf, previewCristianCvPdf, downloadCristianCvWord } from '../lib/cvPdfParser';

interface TaskCenterProps {
  pendingSuppliers: Supplier[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  transactions: Transaction[];
  contracts: Contract[];
  currentUser: string;
  allowedModules?: ModuleType[];
  setActiveModule?: (module: any) => void;
}

const TaskCenter: React.FC<TaskCenterProps> = ({ pendingSuppliers, onApprove, onReject, transactions, contracts, currentUser, allowedModules, setActiveModule }) => {
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const canAccessModule = (mod: ModuleType) => !allowedModules || allowedModules.includes(mod);
  const isDemoClient = currentUser === 'CLIENTE DEMO';

  const highValueExpenses = transactions.filter(t => t.type === 'EXPENSE' && t.amount > 1000000);
  const expiringContracts = contracts.filter(c => c.status === 'POR_VENCER' || c.status === 'VENCIDO');
  
  const userAccount = USER_CREDENTIALS[currentUser];
  const canApprove = userAccount?.role === 'JEFE' || userAccount?.role === 'ADMINISTRADOR';

  const triggerCvPdfDownload = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = downloadCristianCvPdf();
      if (res.success) {
        setDownloadFeedback('✓ ¡Currículum Vitae (PDF 1 Página • Formato Ejecutivo ATS) descargado con éxito!');
      } else {
        previewCristianCvPdf();
        setDownloadFeedback('Abriendo vista previa del PDF en nueva pestaña...');
      }
    } catch {
      previewCristianCvPdf();
      setDownloadFeedback('Abriendo vista previa del PDF en nueva pestaña...');
    }
    setTimeout(() => setDownloadFeedback(null), 5000);
  };

  const triggerCvWordDownload = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = downloadCristianCvWord();
    if (res.success) {
      setDownloadFeedback('✓ ¡Currículum Vitae en formato Word (.DOC) descargado con éxito!');
    } else {
      setDownloadFeedback('Error al generar archivo Word.');
    }
    setTimeout(() => setDownloadFeedback(null), 5000);
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-50 overflow-auto">
      {/* TOOLBAR */}
      <div className="min-h-16 py-2 bg-white border-b border-slate-300 flex flex-wrap items-center px-4 md:px-6 justify-between gap-3 shadow-xs z-30 overflow-x-auto min-w-0">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-2 rounded-xl text-slate-900 shadow-sm">
            <Zap size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none">Centro de Mandos</h2>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Control de Seguridad y Atribuciones</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 px-4 py-1.5 rounded-xl border border-slate-300 text-center">
              <span className="text-[8px] font-black text-slate-600 uppercase block leading-none mb-1">Pendientes</span>
              <span className="text-sm font-black text-amber-700 leading-none">{pendingSuppliers.length + expiringContracts.length}</span>
            </div>
            <button 
              onClick={() => {
                const dataToExport = pendingSuppliers.map(s => ({
                  'Nombre': s.name,
                  'RUT': s.taxId,
                  'Categoría': s.category,
                  'Solicitante': s.userCreator,
                  'Fecha Due Diligence': s.dueDiligenceDate,
                  'Nivel Riesgo': s.dueDiligenceRisk
                }));
                exportToExcel(dataToExport, `Proveedores_Pendientes_${new Date().toISOString().split('T')[0]}`, 'Pendientes');
              }}
              className="bg-slate-100 p-2 rounded-xl border border-slate-300 text-slate-700 hover:text-emerald-700 hover:border-emerald-500 transition-all group"
              title="Exportar Pendientes"
            >
              <FileUp size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING SUCCESS TOAST */}
      {downloadFeedback && (
        <div className="bg-emerald-600 text-white px-6 py-3 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 z-40">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-200 animate-bounce" />
            <span className="text-xs font-black uppercase tracking-wide">{downloadFeedback}</span>
          </div>
          <button 
            onClick={() => setDownloadFeedback(null)}
            className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 md:p-8 lg:p-10 min-h-0">
        <div className="max-w-6xl mx-auto space-y-10">
          
          {/* ACCESOS DIRECTOS COMPLIANCE & PROVEEDORES */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Accesos Rápidos Regulados (ERP Compliance)</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navegación Directa de Auditoría, Control y Listas Negras</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
              {/* Card 0: Búsqueda de Empleo Chile */}
              {canAccessModule('BUSQUEDA_EMPLEO') && (
                <button 
                  onClick={() => setActiveModule?.('BUSQUEDA_EMPLEO')}
                  className="group flex flex-col justify-between p-5 bg-gradient-to-br from-amber-50 to-orange-50 hover:bg-slate-900 text-left rounded-2xl border border-amber-200 hover:border-slate-800 transition-all duration-300 active:scale-95 cursor-pointer shadow-sm hover:shadow-slate-500/15"
                >
                  <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-700 group-hover:bg-white/20 group-hover:text-white mb-4 transition-all shadow-xs">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-amber-700 group-hover:text-amber-300 tracking-widest uppercase block mb-1">RRHH - P09OWJOB</span>
                    <span className="text-xs font-black text-slate-800 group-hover:text-white uppercase leading-tight block">Portal Búsqueda de Empleo</span>
                  </div>
                </button>
              )}

              {/* Card Demo 1: Catálogo de Soluciones */}
              {canAccessModule('SYSTEM_LANDING') && (
                <button 
                  onClick={() => setActiveModule?.('SYSTEM_LANDING')}
                  className="group flex flex-col justify-between p-5 bg-indigo-50 hover:bg-slate-900 text-left rounded-2xl border border-indigo-200 transition-all duration-300 active:scale-95 cursor-pointer shadow-sm"
                >
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-4 transition-all">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-indigo-600 group-hover:text-indigo-300 tracking-widest uppercase block mb-1">SHOWCASE - P98LANDING</span>
                    <span className="text-xs font-black text-slate-800 group-hover:text-white uppercase leading-tight block">Soluciones & ROI Corporativo</span>
                  </div>
                </button>
              )}

              {/* Card Demo 2: Logística & WMS */}
              {canAccessModule('LOGISTICA_WMS') && (
                <button 
                  onClick={() => setActiveModule?.('LOGISTICA_WMS')}
                  className="group flex flex-col justify-between p-5 bg-sky-50 hover:bg-slate-900 text-left rounded-2xl border border-sky-200 transition-all duration-300 active:scale-95 cursor-pointer shadow-sm"
                >
                  <div className="w-10 h-10 bg-[#005B94] text-white rounded-xl flex items-center justify-center mb-4 transition-all">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-sky-700 group-hover:text-sky-300 tracking-widest uppercase block mb-1">WMS - P4600</span>
                    <span className="text-xs font-black text-slate-800 group-hover:text-white uppercase leading-tight block">Logística & Almacenes WMS</span>
                  </div>
                </button>
              )}

              {/* Card Demo 3: Propiedades & Contratos */}
              {canAccessModule('PROPIEDADES') && (
                <button 
                  onClick={() => setActiveModule?.('PROPIEDADES')}
                  className="group flex flex-col justify-between p-5 bg-slate-50 hover:bg-slate-900 text-left rounded-2xl border border-slate-100 transition-all duration-300 active:scale-95 cursor-pointer shadow-sm"
                >
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-white/20 group-hover:text-white mb-4 transition-all">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-emerald-600 group-hover:text-emerald-200 tracking-widest uppercase block mb-1">ACTIVOS - P1501</span>
                    <span className="text-xs font-black text-slate-800 group-hover:text-white uppercase leading-tight block">Unidades Inmobiliarias</span>
                  </div>
                </button>
              )}

              {/* Card 1: Directorio Maestro */}
              {canAccessModule('PROVEEDORES') && (
                <button 
                  onClick={() => setActiveModule?.('PROVEEDORES')}
                  className="group flex flex-col justify-between p-5 bg-slate-50 hover:bg-slate-900 text-left rounded-2xl border border-slate-100 transition-all duration-300 active:scale-95 cursor-pointer shadow-sm hover:shadow-slate-500/15"
                >
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-white/20 group-hover:text-white mb-4 transition-all">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-indigo-600 group-hover:text-indigo-200 tracking-widest uppercase block mb-1">PROV - P04012</span>
                    <span className="text-xs font-black text-slate-800 group-hover:text-white uppercase leading-tight block">Ficha Maestro Proveedores</span>
                  </div>
                </button>
              )}

              {/* Card 2: Due Diligence */}
              {canAccessModule('DUE_DILIGENCIA') && (
                <button 
                  onClick={() => setActiveModule?.('DUE_DILIGENCIA')}
                  className="group flex flex-col justify-between p-5 bg-slate-50 hover:bg-slate-900 text-left rounded-2xl border border-slate-100 transition-all duration-300 active:scale-95 cursor-pointer shadow-sm hover:shadow-slate-500/15"
                >
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-white/20 group-hover:text-white mb-4 transition-all">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-emerald-600 group-hover:text-emerald-200 tracking-widest uppercase block mb-1">COMP - P01012A</span>
                    <span className="text-xs font-black text-slate-800 group-hover:text-white uppercase leading-tight block">Auditoría / Due Diligence</span>
                  </div>
                </button>
              )}

              {/* Card 3: Lista Negra */}
              {canAccessModule('DUE_DILIGENCIA_CONSULTA') && (
                <button 
                  onClick={() => setActiveModule?.('DUE_DILIGENCIA_CONSULTA')}
                  className="group flex flex-col justify-between p-5 bg-slate-50 hover:bg-slate-900 text-left rounded-2xl border border-slate-100 transition-all duration-300 active:scale-95 cursor-pointer shadow-sm hover:shadow-slate-500/15"
                >
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-white/20 group-hover:text-white mb-4 transition-all">
                    <FileSignature size={20} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-amber-600 group-hover:text-amber-200 tracking-widest uppercase block mb-1">COMP - P01012B</span>
                    <span className="text-xs font-black text-slate-800 group-hover:text-white uppercase leading-tight block">Consulta Lista Negra</span>
                  </div>
                </button>
              )}

              {/* Card 4: Auditoría Cumplimiento UAF */}
              {canAccessModule('UAF_COMPLIANCE') && (
                <button 
                  onClick={() => setActiveModule?.('UAF_COMPLIANCE')}
                  className="group flex flex-col justify-between p-5 bg-slate-50 hover:bg-slate-900 text-left rounded-2xl border border-slate-100 transition-all duration-300 active:scale-95 cursor-pointer shadow-sm hover:shadow-slate-500/15"
                >
                  <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 group-hover:bg-white/20 group-hover:text-white mb-4 transition-all">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-rose-500 group-hover:text-rose-200 tracking-widest uppercase block mb-1">COMP - P0115U</span>
                    <span className="text-xs font-black text-slate-800 group-hover:text-white uppercase leading-tight block">Auditoría UAF & AML</span>
                  </div>
                </button>
              )}

              {/* Card 5: Informe CISO PDF */}
              {canAccessModule('CISO_REPORT') && (
                <button 
                  onClick={() => setActiveModule?.('CISO_REPORT')}
                  className="group flex flex-col justify-between p-5 bg-indigo-50 hover:bg-slate-900 border-2 border-indigo-200 hover:border-slate-900 text-left rounded-2xl transition-all duration-300 active:scale-95 cursor-pointer shadow-sm hover:shadow-indigo-500/15"
                >
                  <div className="w-10 h-10 bg-indigo-650 text-indigo-105 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:bg-indigo-500">
                    <ShieldCheck size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-indigo-600 group-hover:text-indigo-300 tracking-widest uppercase block mb-1">CISO - R09OWSEC</span>
                    <span className="text-xs font-black text-slate-800 group-hover:text-white uppercase leading-tight block">Informe Ejecutivo CISO (.PDF)</span>
                  </div>
                </button>
              )}

              {/* Card 6: Presentación Proyectos PDF */}
              {canAccessModule('PROJECTS_REPORT') && (
                <button 
                  onClick={() => setActiveModule?.('PROJECTS_REPORT')}
                  className="group flex flex-col justify-between p-5 bg-emerald-50 hover:bg-slate-900 border-2 border-emerald-250 hover:border-slate-900 text-left rounded-2xl transition-all duration-300 active:scale-95 cursor-pointer shadow-sm hover:shadow-emerald-500/15"
                >
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center mb-4 transition-all group-hover:bg-emerald-500 animate-pulse">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-emerald-600 group-hover:text-emerald-300 tracking-widest uppercase block mb-1">PMO - R09OWPRJ</span>
                    <span className="text-xs font-black text-slate-800 group-hover:text-white uppercase leading-tight block">Presentación Solución Proyectos (.PDF)</span>
                  </div>
                </button>
              )}

              {/* Card 7: Mi Nuevo Currículum PDF & WORD */}
              {!isDemoClient && (
              <div 
                onClick={() => setCvModalOpen(true)}
                className="group relative flex flex-col justify-between p-4 bg-gradient-to-b from-sky-50 via-emerald-50/40 to-white hover:from-slate-900 hover:to-slate-950 border-2 border-emerald-300 hover:border-emerald-500 text-left rounded-2xl transition-all duration-300 cursor-pointer shadow-sm hover:shadow-emerald-500/20 active:scale-[0.98]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center transition-all group-hover:bg-emerald-500 shadow-sm shadow-emerald-600/30 animate-pulse">
                      <FileText size={18} />
                    </div>
                    <span className="text-[7.5px] font-black bg-emerald-100 group-hover:bg-emerald-500/20 text-emerald-800 group-hover:text-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-tight">
                      PDF 2 PÁG
                    </span>
                  </div>
                  
                  <span className="text-[8px] font-bold text-sky-700 group-hover:text-sky-300 tracking-widest uppercase block mb-0.5">CV - R09OWCV</span>
                  <span className="text-xs font-black text-slate-900 group-hover:text-white uppercase leading-tight block">Mi Nuevo Currículum (.PDF)</span>
                  <p className="text-[8.5px] font-semibold text-slate-500 group-hover:text-slate-400 mt-1 leading-tight line-clamp-1">
                    Civil Industrial • Téc. Jurídico ENAC
                  </p>
                </div>

                {/* Direct Action Buttons on Card */}
                <div className="mt-3 pt-2 border-t border-slate-200/80 group-hover:border-slate-800 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={triggerCvPdfDownload}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-tight flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                    title="Descargar PDF directamente"
                  >
                    <Download size={11} /> Descargar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); previewCristianCvPdf(); }}
                    className="py-1.5 px-2 bg-slate-200 hover:bg-slate-300 group-hover:bg-slate-800 group-hover:hover:bg-slate-700 text-slate-800 group-hover:text-slate-200 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer"
                    title="Ver o imprimir en navegador"
                  >
                    <Eye size={11} />
                  </button>
                  <button
                    onClick={() => setCvModalOpen(true)}
                    className="py-1.5 px-2 bg-sky-100 hover:bg-sky-200 group-hover:bg-sky-950 text-sky-800 group-hover:text-sky-300 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer"
                    title="Más formatos y detalles"
                  >
                    Más
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Validación Jefatura (Form DI-01)</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aprobaciones de Proveedores y Compliance</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {setActiveModule && canAccessModule('ASISTENTE_TAREAS_IA') && (
                  <button
                    onClick={() => setActiveModule('ASISTENTE_TAREAS_IA')}
                    className="px-4 py-2 bg-[#0B3C5D] hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-emerald-500/40"
                    title="Abrir Asistente de Tareas IA (P0001IA) para priorizar tareas y Órdenes de Trabajo pendientes con Gemini"
                  >
                    <Sparkles size={13} className="text-emerald-400" />
                    <span>Asistente de Tareas IA (P0001IA)</span>
                  </button>
                )}
                {!canApprove && (
                  <div className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full text-[8px] font-black uppercase flex items-center gap-2 border border-rose-100">
                    <ShieldAlert size={12}/> Su perfil no tiene atribución de VoBo
                  </div>
                )}
              </div>
            </div>

            {pendingSuppliers.length === 0 ? (
              <div className="pro-card p-16 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Sin solicitudes pendientes</p>
              </div>
            ) : (
              <div className="bg-[#FAFBFD] border border-[#91A6BA] rounded-sm shadow-sm overflow-hidden flex flex-col">
                {/* ERP Grid Top Info & Batch Toolbar */}
                <div className="bg-[#E9F0F8] border-b border-[#C3D5E6] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <div className="flex items-center gap-2 text-[#0B3C5D] font-bold">
                    <span className="font-mono bg-[#0B3C5D] text-white px-1.5 py-0.5 rounded text-[9px]">P0101A / W0101A</span>
                    <span>Bandeja de Autorización y VoBo de Proveedores (Compliance)</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600 font-mono text-[9.5px]">
                      Pendientes: <strong className="text-slate-900">{pendingSuppliers.length}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveModule?.("DUE_DILIGENCIA")}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-indigo-700 border border-slate-300 rounded text-[9.5px] font-bold flex items-center gap-1 shadow-3xs cursor-pointer"
                    >
                      <ShieldCheck size={11} />
                      <span>Ir a Auditoría Due Diligence</span>
                    </button>
                  </div>
                </div>

                {/* Table Container */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-[#E2ECF5] border-b border-[#91A6BA] text-[#143B57] text-[10px] font-black uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center border-r border-[#B0C4D6]">#</th>
                        <th className="py-2.5 px-3 w-28 border-r border-[#B0C4D6]">RUT</th>
                        <th className="py-2.5 px-3 min-w-[200px] border-r border-[#B0C4D6]">Proveedor / Razón Social</th>
                        <th className="py-2.5 px-3 w-32 border-r border-[#B0C4D6]">Categoría</th>
                        <th className="py-2.5 px-3 min-w-[280px] border-r border-[#B0C4D6]">Cumplimiento Compliance (8 Puntos)</th>
                        <th className="py-2.5 px-3 w-28 border-r border-[#B0C4D6]">Solicitante</th>
                        <th className="py-2.5 px-3 w-24 text-center border-r border-[#B0C4D6]">Auditoría</th>
                        <th className="py-2.5 px-3 w-16 text-center border-r border-[#B0C4D6]">Carpeta</th>
                        <th className="py-2.5 px-3 w-44 text-center">Acciones Jefatura</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D5E1ED] text-[11px] font-sans">
                      {pendingSuppliers.map((s, idx) => {
                        const comp = s.complianceMaster;
                        const complianceItems = [
                          { key: "conflictThirdParty", label: "Conflicto 3ro" },
                          { key: "conflictExecutive", label: "Conflicto Ejec" },
                          { key: "beneficiariesUAF", label: "UAF" },
                          { key: "dueDiligenceCert", label: "Cert. DD" },
                          { key: "invoice", label: "Factura" },
                          { key: "paymentVoucher", label: "Pago" },
                          { key: "receptionCertificate", label: "Acta" },
                          { key: "photoSet", label: "Fotos" }
                        ];
                        const passedCount = complianceItems.filter(item => comp[item.key as keyof typeof comp]).length;
                        const isFullyCompliant = Object.values(comp).every(v => v === true);

                        return (
                          <tr key={s.id} className="hover:bg-[#EDF4FA] transition-colors border-b border-[#E2ECF5]">
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-500 border-r border-[#E2ECF5]">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-[#E2ECF5]">{s.taxId}</td>
                            <td className="py-2 px-3 border-r border-[#E2ECF5]">
                              <p className="font-black text-slate-900 uppercase leading-snug">{s.name}</p>
                            </td>
                            <td className="py-2 px-3 border-r border-[#E2ECF5] text-slate-700 uppercase font-semibold text-[10px]">
                              {s.category}
                            </td>
                            <td className="py-2 px-3 border-r border-[#E2ECF5]">
                              <div className="flex items-center gap-2">
                                <span className={`font-mono font-black text-[9px] px-1.5 py-0.5 rounded ${isFullyCompliant ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                                  {passedCount}/8 OK
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {complianceItems.map(item => (
                                    <span
                                      key={item.key}
                                      title={item.label + ": " + (comp[item.key as keyof typeof comp] ? "Aprobado" : "Pendiente")}
                                      className={`text-[8px] px-1 py-0.2 rounded ${comp[item.key as keyof typeof comp] ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 border border-slate-200"}`}
                                    >
                                      {item.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-3 border-r border-[#E2ECF5] text-slate-700 text-[10px] uppercase">
                              {s.userCreator}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-600 border-r border-[#E2ECF5]">
                              {s.dueDiligenceDate || "---"}
                            </td>
                            <td className="py-2 px-3 text-center border-r border-[#E2ECF5]">
                              {s.folderUrl ? (
                                <a
                                  href={s.folderUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex p-1 bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white rounded transition-colors"
                                  title="Ver Documentación Legal"
                                >
                                  <Cloud size={13} />
                                </a>
                              ) : <span className="text-slate-300 font-mono text-[9px]">---</span>}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {canApprove ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => onApprove(s.id)}
                                    disabled={!isFullyCompliant}
                                    className={`px-2 py-1 rounded text-[9.5px] font-black uppercase flex items-center gap-1 transition-all shadow-3xs ${
                                      isFullyCompliant
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                    }`}
                                    title={isFullyCompliant ? "Otorgar VoBo" : "Bloqueado: Requiere 100% de cumplimiento"}
                                  >
                                    <CheckCircle size={11} /> VoBo
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = prompt("Indique motivo del rechazo:");
                                      if (reason) onReject(s.id, reason);
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9.5px] font-bold uppercase transition-all shadow-3xs cursor-pointer"
                                    title="Denegar Alta"
                                  >
                                    <XCircle size={11} /> Denegar
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[9px] font-mono text-slate-400 italic">Esperando Jefatura</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
                    <span>VoBo habilitado exclusivamente con 8/8 requisitos validados</span>
                  </div>
                  <div>
                    Total Solicitudes: <strong className="text-slate-900">{pendingSuppliers.length}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CV DOWNLOAD MODAL */}
      {cvModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-slate-300 rounded-[32px] max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-slate-50 text-slate-900 border-b border-slate-200 p-6 sm:p-8 relative overflow-hidden">
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 border border-emerald-300 rounded-full text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-3">
                    <Sparkles size={12} className="text-amber-600" />
                    CV Actualizado • Versión 2026
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                    Cristian Andrés Muñoz Rojas
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                    Ingeniero Civil Industrial • Técnico Jurídico • Especialista Control Interno CMF & S&OP
                  </p>
                </div>
                <button
                  onClick={() => setCvModalOpen(false)}
                  className="p-2 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
                  title="Cerrar ventana"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Pillars chips */}
              <div className="flex flex-wrap gap-2 mt-5 relative z-10 text-[10px] font-bold uppercase">
                <span className="bg-white text-slate-800 px-3 py-1 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5">
                  <GraduationCap size={13} className="text-emerald-600" /> Ing. Civil Industrial
                </span>
                <span className="bg-white text-amber-900 px-3 py-1 rounded-xl border border-amber-200 shadow-xs flex items-center gap-1.5">
                  <Scale size={13} className="text-amber-600" /> Téc. Jurídico ENAC (2005-2008)
                </span>
                <span className="bg-white text-sky-900 px-3 py-1 rounded-xl border border-sky-200 shadow-xs flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-sky-600" /> Control CMF & UAF
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Formación Académica Destacada */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <GraduationCap size={16} className="text-emerald-600" />
                  Formación Académica & Jurídica Integrada
                </h4>
                <div className="space-y-2 text-xs text-slate-650">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-900 font-bold">Ingeniería Civil Industrial</strong> – Santiago, Chile.
                      <p className="text-[11px] text-slate-500">Licenciatura en Ciencias de la Ingeniería con mención en optimización estocástica y finanzas corporativas.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-900 font-bold">2005 al 2008: Técnico Jurídico en ENAC Cáritas Chile (inconcluso)</strong>
                      <p className="text-[11px] text-slate-500">Formación técnica en derecho procesal, administrativo, elaboración de contratos mercantiles e instrumentos notariales. Complemento al rigor en Control Interno, Compliance CMF y debida diligencia UAF / PEP Ley 19.913.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Descarga */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Selecciona Formato de Descarga
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opción 1: Descargar PDF */}
                  <button
                    onClick={() => {
                      triggerCvPdfDownload();
                      setCvModalOpen(false);
                    }}
                    className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl flex items-center gap-3.5 text-left transition-all shadow-lg shadow-emerald-900/20 active:scale-95 cursor-pointer group"
                  >
                    <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Download size={22} className="text-white" />
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold bg-emerald-700/80 text-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider block w-fit mb-0.5">
                        Recomendado
                      </span>
                      <span className="text-sm font-black uppercase block leading-tight">
                        Descargar PDF
                      </span>
                      <span className="text-[10px] text-emerald-150 font-medium block">
                        1 Página • Formato ATS Optimizado
                      </span>
                    </div>
                  </button>

                  {/* Opción 2: Ver / Imprimir PDF */}
                  <button
                    onClick={() => {
                      previewCristianCvPdf();
                      setCvModalOpen(false);
                    }}
                    className="p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl flex items-center gap-3.5 text-left transition-all shadow-md active:scale-95 cursor-pointer group"
                  >
                    <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Eye size={22} className="text-slate-200" />
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Lectura / Impresión
                      </span>
                      <span className="text-sm font-black uppercase block leading-tight">
                        Ver / Imprimir PDF
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Abre en nueva pestaña
                      </span>
                    </div>
                  </button>

                  {/* Opción 3: Descargar Word */}
                  <button
                    onClick={() => {
                      triggerCvWordDownload();
                      setCvModalOpen(false);
                    }}
                    className="p-4 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl flex items-center gap-3.5 text-left transition-all shadow-md active:scale-95 cursor-pointer group"
                  >
                    <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <FileDown size={22} className="text-white" />
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold bg-sky-700/80 text-sky-100 px-2 py-0.5 rounded uppercase tracking-wider block w-fit mb-0.5">
                        Editable
                      </span>
                      <span className="text-sm font-black uppercase block leading-tight">
                        Descargar Word (.DOC)
                      </span>
                      <span className="text-[10px] text-sky-150 font-medium block">
                        ATS-Optimized • Word 2003+
                      </span>
                    </div>
                  </button>

                  {/* Opción 4: Ir al Editor de CV */}
                  <button
                    onClick={() => {
                      setActiveModule?.('CURRICULUM_CV');
                      setCvModalOpen(false);
                    }}
                    className="p-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl flex items-center gap-3.5 text-left transition-all border border-slate-200 active:scale-95 cursor-pointer group"
                  >
                    <div className="w-11 h-11 bg-slate-200 group-hover:bg-slate-300 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform text-slate-700">
                      <ExternalLink size={20} />
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">
                        Módulo Completo
                      </span>
                      <span className="text-sm font-black uppercase block leading-tight text-slate-900">
                        Editor & Entrevista
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block">
                        Discurso, comisiones y edición
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setCvModalOpen(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCenter;
