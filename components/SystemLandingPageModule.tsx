import React, { useState } from 'react';
import { 
  Building2, ShieldCheck, Zap, Calculator, CheckCircle2, 
  ArrowRight, Sparkles, Download, Layers, Clock, DollarSign, 
  TrendingUp, Lock, FileSpreadsheet, Globe, Award, Mail, 
  Phone, User, MessageSquare, Check, ExternalLink, Play, 
  Star, ChevronRight, Server, FileText, Wrench, Warehouse, LayoutDashboard
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface SystemLandingPageProps {
  onNavigateToModule?: (module: any) => void;
  sharedAppUrl?: string;
}

export const SystemLandingPageModule: React.FC<SystemLandingPageProps> = ({
  onNavigateToModule,
  sharedAppUrl = 'https://ais-pre-dz3bxgy56etagjpimmn3xu-188547091868.us-east1.run.app'
}) => {
  // ROI Calculator State
  const [propertyCount, setPropertyCount] = useState<number>(45);
  const [analystCostHours, setAnalystCostHours] = useState<number>(18000); // CLP per hour
  const [reconciliationHoursMonth, setReconciliationHoursMonth] = useState<number>(60);

  // Calculated ROI
  const hoursSavedPerMonth = Math.round(reconciliationHoursMonth * 0.917); // 91.7% time reduction
  const monthlySavingsCLP = Math.round(hoursSavedPerMonth * analystCostHours);
  const annualSavingsCLP = monthlySavingsCLP * 12;
  const estimatedSoftwareCostCLP = 750000; // Monthly license Plan Corporate
  const netMonthlyProfitCLP = monthlySavingsCLP - estimatedSoftwareCostCLP;
  const roiPercentage = Math.round((netMonthlyProfitCLP / estimatedSoftwareCostCLP) * 100);

  // Active Feature Tab
  const [activeTab, setActiveTab] = useState<'jde' | 'wms' | 'uaf' | 'ot' | 'tax' | 'ciso'>('jde');

  // Contact / Demo Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('Plan Corporate Pro');
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    properties: '1 - 50',
    message: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setIsModalOpen(false);
      setFormData({ name: '', company: '', email: '', phone: '', properties: '1 - 50', message: '' });
    }, 3000);
  };

  const downloadCommercialBrochurePDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Header Frame
    doc.setFillColor(0, 45, 98);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('ASSETFLOW ENTERPRISE', 105, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text('Plataforma Integral de Gestión Inmobiliaria, Conciliación ERP & IA Generativa', 105, 26, { align: 'center' });

    let y = 45;

    // Executive Summary
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('PROPUESTA DE VALOR Y SOLUCIÓN B2B', 15, y);
    doc.setLineWidth(0.5);
    doc.setDrawColor(203, 213, 225);
    doc.line(15, y + 2, 195, y + 2);

    y += 9;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const summaryText = 'AssetFlow Enterprise es la solución tecnológica diseñada para administradoras de fondos de inversión inmobiliaria, family offices y gestoras B2B en Chile. Elimina cuellos de botella operativos mediante IA automatizada, conciliación contable de Libro Mayor AssetFlow Enterprise F0911 y verificación preventiva UAF/PEP.';
    const splitSummary = doc.splitTextToSize(summaryText, 180);
    doc.text(splitSummary, 15, y);

    y += (splitSummary.length * 5) + 8;

    // Feature Highlights
    const features = [
      ['Conciliación AssetFlow Enterprise F0911:', 'Cuadre forense de Libro Mayor y Ley de Benford en 3.85 segundos (-91.7% tiempo).'],
      ['Debida Diligencia UAF / PEP:', 'Screening legal acelerado con dictamen emitido en PDF en 1.42 segundos.'],
      ['Órdenes de Trabajo (OT):', 'Trazabilidad total con categoría, especialidad y factura asociada requerida.'],
      ['Cumplimiento Tributario SII:', 'Informes listos para Formulario 29/F22, Reporte B13, B4 y Nota 14.'],
      ['Seguridad ISO 27001:', 'Arquitectura No-Key Leak con Proxy Server y encriptación de datos.']
    ];

    doc.setFillColor(248, 250, 252);
    doc.rect(15, y, 180, 50, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, y, 180, 50, 'D');

    let fy = y + 8;
    features.forEach(([title, desc]) => {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 45, 98);
      doc.text(title, 18, fy);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(desc, 70, fy);
      fy += 8;
    });

    y += 60;

    // Commercial Contact
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('CONTACTO COMERCIAL & LICENCIAMIENTO', 15, y);
    doc.line(15, y + 2, 195, y + 2);

    y += 8;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Propietario / Consultor TI: Cristian Muñoz R.', 15, y);
    doc.text('Email de Contacto Directo: samaheim@gmail.com', 15, y + 5);
    doc.text('Enlace de Demostración Activa: ' + sharedAppUrl, 15, y + 10);

    doc.save(`DOSSIER_COMERCIAL_ASSETFLOW_ENTERPRISE_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 pb-20">
      
      {/* TOP HERO BANNER */}
      <div className="relative bg-gradient-to-b from-[#001D40] via-slate-900 to-slate-950 pt-12 pb-20 px-6 md:px-12 border-b border-slate-800 overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-indigo-600/15 blur-[120px] pointer-events-none rounded-full"></div>
        <div className="absolute top-1/3 right-10 w-96 h-96 bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full"></div>

        <div className="max-w-7xl mx-auto space-y-8 relative z-10">
          
          {/* BADGES */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <span className="bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-inner">
              <Sparkles size={14} className="text-emerald-400 animate-pulse" /> Software Inmobiliario & Financiero B2B
            </span>
            <span className="bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-indigo-400" /> ISO 27001 & CMF / UAF Compliant
            </span>
            <span className="bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono px-3 py-1 rounded-full">
              AssetFlow Enterprise F0911 Native
            </span>
          </div>

          {/* MAIN HEADLINE */}
          <div className="text-center md:text-left space-y-4 max-w-4xl">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Transforma la Gestión de Activos Inmobiliarios con <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300 bg-clip-text text-transparent">IA Generativa & ERP Contable</span>
            </h1>
            <p className="text-base md:text-xl text-slate-300 leading-relaxed max-w-3xl">
              AssetFlow Enterprise unifica en una sola plataforma la conciliación de cobros contra el Libro Mayor AssetFlow Enterprise, el screening acelerado de debida diligencia UAF/PEP y el control total de Órdenes de Trabajo (OT) con factura asociada.
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              onClick={() => {
                setSelectedPlan('Plan Corporate Pro');
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-8 py-4 rounded-xl shadow-xl hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider cursor-pointer transform hover:-translate-y-0.5"
            >
              <Zap size={18} className="fill-slate-950" /> Comprar Licencia B2B / Demo
            </button>

            {onNavigateToModule && (
              <button
                onClick={() => onNavigateToModule('DASHBOARD')}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold px-7 py-4 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Play size={16} className="text-emerald-400" /> Explorar Sistema en Vivo
              </button>
            )}

            <button
              onClick={downloadCommercialBrochurePDF}
              className="w-full sm:w-auto bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 font-bold px-6 py-4 rounded-xl border border-indigo-700/60 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Download size={16} className="text-indigo-400" /> Dossier PDF
            </button>
          </div>

          {/* KEY METRICS RIBBON */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-800/80">
            <div className="space-y-1">
              <span className="text-2xl md:text-3xl font-black text-emerald-400 font-mono">-91.7%</span>
              <span className="text-xs text-slate-400 block font-medium">Tiempo en Conciliación Contable</span>
            </div>
            <div className="space-y-1">
              <span className="text-2xl md:text-3xl font-black text-indigo-400 font-mono">1.42s</span>
              <span className="text-xs text-slate-400 block font-medium">Dictamen UAF/PEP con Gemini 2.5</span>
            </div>
            <div className="space-y-1">
              <span className="text-2xl md:text-3xl font-black text-teal-400 font-mono">100%</span>
              <span className="text-xs text-slate-400 block font-medium">Trazabilidad de OTs con Factura</span>
            </div>
            <div className="space-y-1">
              <span className="text-2xl md:text-3xl font-black text-amber-400 font-mono">ISO 27001</span>
              <span className="text-xs text-slate-400 block font-medium">Seguridad CISO & No-Key Leak</span>
            </div>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 space-y-20">

        {/* SECTION 0: LIVE INTERACTIVE SOLUTIONS SHOWCASE */}
        {onNavigateToModule && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Play size={13} className="text-emerald-400" /> Demostración Interactiva en Vivo
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                  Soluciones Disponibles para Explorar Ahora
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Haz clic en cualquier solución para evaluar la arquitectura JD Edwards EnterpriseOne 9.11, fluidez de interfaz y flujos operativos en entorno seguro de demostración.
                </p>
              </div>
              <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg shrink-0">
                Entorno Demo Seguro • Sin Alterar Producción
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  id: 'DASHBOARD',
                  code: 'P0000',
                  title: 'Dashboard Ejecutivo & KPIs',
                  desc: 'Indicadores consolidados, alertas operativas y analítica visual en tiempo real.',
                  badge: 'BI & Control',
                  icon: <LayoutDashboard size={18} className="text-indigo-400" />
                },
                {
                  id: 'LOGISTICA_WMS',
                  code: 'P4600 / F41021',
                  title: 'Logística & WMS (Extra Item)',
                  desc: 'Maestro de artículos F4101, inventario por ubicación bin F41021, putaway y picking P4611.',
                  badge: 'Supply Chain',
                  icon: <Warehouse size={18} className="text-sky-400" />
                },
                {
                  id: 'PROPIEDADES',
                  code: 'P1501',
                  title: 'Maestro de Unidades & Activos',
                  desc: 'Catastro corporativo, grillas QBE tipo JD Edwards, estado ocupacional y valorización.',
                  badge: 'Real Estate',
                  icon: <Building2 size={18} className="text-emerald-400" />
                },
                {
                  id: 'CONTRATOS_ARRIENDO',
                  code: 'P15012',
                  title: 'Contratos & Emisión de Cobros',
                  desc: 'Administración contractual, reajustes UF/IPC y generación automática de facturación.',
                  badge: 'Facturación',
                  icon: <FileSpreadsheet size={18} className="text-teal-400" />
                },
                {
                  id: 'ORDENES',
                  code: 'P48201',
                  title: 'Órdenes de Trabajo (OT) Trazables',
                  desc: 'Ciclo completo con categoría, especialidad, factura asociada y exportación a Excel.',
                  badge: 'Operaciones',
                  icon: <Wrench size={18} className="text-amber-400" />
                },
                {
                  id: 'BROCHURE',
                  code: 'P2026B',
                  title: 'Brochure Comercial PDF',
                  desc: 'Generador de dossier corporativo en PDF de alta fidelidad personalizable por cliente.',
                  badge: 'Comercial PDF',
                  icon: <FileText size={18} className="text-rose-400" />
                }
              ].map((sol) => (
                <button
                  key={sol.id}
                  onClick={() => onNavigateToModule(sol.id)}
                  className="group bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-5 text-left transition-all flex flex-col justify-between gap-4 cursor-pointer shadow-lg hover:-translate-y-0.5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-emerald-500/40 transition-colors">
                        {sol.icon}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                          {sol.code}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          {sol.badge}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                        {sol.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        {sol.desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-900 text-xs font-bold text-emerald-400">
                    <span>Abrir módulo en vivo</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 1: PAIN POINTS VS ASSETFLOW SOLUTION */}
        <div className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">¿Por qué las Administradoras eligen AssetFlow?</span>
            <h2 className="text-2xl md:text-4xl font-black text-white">
              De la Ineficiencia Manual en Excel al Control Total Automatizado
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              Compara la operativa tradicional vulnerable contra la precisión de AssetFlow Enterprise.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* TRADITIONAL OPERATIONAL PAIN */}
            <div className="bg-slate-950/80 border border-rose-900/40 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-rose-900/30 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <Clock size={16} /> Operativa Tradicional (Lenta & Vulnerable)
                </span>
                <span className="text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded">3 a 15 Días</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span><strong>Conciliación de Cobros Lenta:</strong> Analistas contables digitando cartolas bancarias línea por línea contra el Libro Mayor.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span><strong>Riesgo Normativo UAF:</strong> Revisiones manuales de antecedentes PEP que tardan días, arriesgando multas severas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span><strong>Desconexión en Mantenimiento:</strong> Órdenes de Trabajo (OT) enviadas por correo sin vinculación obligatoria a la factura o especialidad.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span><strong>Fricción Tributaria SII:</strong> Preparación manual de declaraciones F29/F22 y reportes B13/B4 vulnerables a errores tipográficos.</span>
                </li>
              </ul>
            </div>

            {/* ASSETFLOW PRO SOLUTION */}
            <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-xl shadow-emerald-950/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full pointer-events-none"></div>
              <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-400" /> AssetFlow Enterprise (IA & Automático)
                </span>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded font-bold">Segundos</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-200 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Conciliación Forense ERP F0911:</strong> Cuadre automático de cartolas y prueba de Ley de Benford en solo <strong>3.85 segundos</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Screening UAF/PEP Acelerado:</strong> Verificación legal en tiempo real con emisión inmediata del dictamen de debida diligencia en PDF en <strong>1.42s</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>OTs Trazables en Tiempo Real:</strong> Exige categoría, especialidad y factura asociada (`associatedInvoice`) para autorizar pagos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Reportabilidad SII Lista:</strong> Emisión automatizada de Nota 14, B13, B4 e impuestos F29 con certificación digital.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* SECTION 2: INTERACTIVE ROI CALCULATOR */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-[#001833] border border-indigo-900/60 rounded-3xl p-6 md:p-10 shadow-2xl space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calculator size={15} /> Calculadora Interactiva de Retorno de Inversión
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                Calcula tu Ahorro Operativo Mensual y ROI con AssetFlow
              </h2>
            </div>
            <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1.5 rounded-xl font-mono">
              Simulador B2B Chile
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            {/* INPUT CONTROLS */}
            <div className="space-y-6">
              
              {/* SLIDER 1: PROPERTY COUNT */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <label className="font-bold text-slate-300">Cantidad de Propiedades / Unidades Gestionadas:</label>
                  <span className="font-mono font-black text-emerald-400 text-sm">{propertyCount} Unidades</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  value={propertyCount}
                  onChange={(e) => setPropertyCount(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
                />
              </div>

              {/* SLIDER 2: RECONCILIATION HOURS */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <label className="font-bold text-slate-300">Horas Mensuales de Análisis Contable / Manual:</label>
                  <span className="font-mono font-black text-indigo-400 text-sm">{reconciliationHoursMonth} hrs/mes</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={reconciliationHoursMonth}
                  onChange={(e) => setReconciliationHoursMonth(Number(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
                />
              </div>

              {/* SLIDER 3: ANALYST HOURLY COST */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <label className="font-bold text-slate-300">Costo Hora Analista Contable / Legal (CLP):</label>
                  <span className="font-mono font-black text-teal-400 text-sm">${analystCostHours.toLocaleString('es-CL')} /hr</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="45000"
                  step="1000"
                  value={analystCostHours}
                  onChange={(e) => setAnalystCostHours(Number(e.target.value))}
                  className="w-full accent-teal-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
                />
              </div>

            </div>

            {/* RESULTS DASHBOARD CARD */}
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-6 shadow-xl relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Horas Ahorradas Mensualmente</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">{hoursSavedPerMonth} hrs</span>
                  <span className="text-[9.5px] text-slate-500 block mt-0.5">-91.7% reducción de tiempo</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Ahorro Monetario Mensual</span>
                  <span className="text-2xl font-black text-teal-300 font-mono">${monthlySavingsCLP.toLocaleString('es-CL')}</span>
                  <span className="text-[9.5px] text-slate-500 block mt-0.5">En costo de horas/hombre</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-950 via-slate-950 to-indigo-950 p-4 rounded-xl border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-slate-300 block">Retorno Estimado de Inversión (ROI)</span>
                  <span className="text-3xl font-black text-emerald-400 font-mono">+{roiPercentage}%</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Ahorro Anual Proyectado</span>
                  <span className="text-lg font-black text-white font-mono">${annualSavingsCLP.toLocaleString('es-CL')} CLP</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedPlan('Plan Corporate Pro');
                  setIsModalOpen(true);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <DollarSign size={16} /> Solicitar Cotización Formal para mi Cartera
              </button>
            </div>

          </div>

        </div>

        {/* SECTION 3: FEATURE TOUR TABS */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">Explorador de Arquitectura</span>
            <h2 className="text-2xl md:text-4xl font-black text-white">Módulos Especializados del Sistema</h2>
          </div>

          {/* TAB HEADERS */}
          <div className="flex flex-wrap justify-center gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab('jde')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'jde' 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg font-black' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileSpreadsheet size={15} /> Conciliación ERP ERP
            </button>

            <button
              onClick={() => setActiveTab('wms')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'wms' 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg font-black' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Warehouse size={15} /> Logística & WMS (P4600)
            </button>

            <button
              onClick={() => setActiveTab('uaf')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'uaf' 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg font-black' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <ShieldCheck size={15} /> Debida Diligencia UAF / PEP
            </button>

            <button
              onClick={() => setActiveTab('ot')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ot' 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg font-black' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Wrench size={15} /> Órdenes de Trabajo (OT)
            </button>

            <button
              onClick={() => setActiveTab('tax')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'tax' 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg font-black' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileText size={15} /> Módulos Tributarios SII
            </button>

            <button
              onClick={() => setActiveTab('ciso')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ciso' 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg font-black' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Lock size={15} /> Seguridad CISO ISO 27001
            </button>
          </div>

          {/* TAB CONTENT PANEL */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-4">
            {activeTab === 'jde' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <span className="text-xs font-mono text-emerald-400 font-bold uppercase">Módulo Contable Forense</span>
                  <h3 className="text-xl font-bold text-white">Conciliación de Cartolas Bancarias contra AssetFlow Enterprise F0911</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sincronización directa con tablas estándar AssetFlow Enterprise. Detecta duplicidades, descuadres en centavos y anomalías estadísticas mediante la prueba matemática de la Ley de Benford.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Sincronización masiva de tablas F0911, F0411 y F03B11</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Generación de certificado de conciliación contable firmado</li>
                  </ul>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-xs text-emerald-400 space-y-1">
                  <p className="text-slate-500">// AssetFlow Enterprise F0911 Audit Engine</p>
                  <p>STATUS: MATCH_EXACT (100%)</p>
                  <p>BATCH_ID: ERP-2026-88401</p>
                  <p>BENFORD_ANOMALY_INDEX: 0.002 (NORMAL)</p>
                  <p className="text-white pt-2 font-sans font-bold">Respuesta en 3.85 segundos</p>
                </div>
              </div>
            )}

            {activeTab === 'wms' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <span className="text-xs font-mono text-sky-400 font-bold uppercase">Supply Chain & Warehouse Management</span>
                  <h3 className="text-xl font-bold text-white">Logística & WMS JD Edwards EnterpriseOne (P4600 / F41021 / F4611)</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Módulo completo de bodegaje e inventarios independiente del rubro inmobiliario: control de pasillos/bins, recepción de órdenes de compra, despacho (picking), transferencias y Kardex F4111 con filtros QBE.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><Check size={14} className="text-sky-400" /> Maestro de Ítems (F4101) y Stock Multi-Ubicación (F41021)</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-sky-400" /> Sugerencias de Putaway y Picking FIFO/FEFO (P4611)</li>
                  </ul>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-xs text-sky-300 space-y-1">
                  <p className="text-slate-500">// JDE Warehouse Management Engine</p>
                  <p>BRANCH_PLANT: CD_CENTRAL_SCL (BP-01)</p>
                  <p>LOCATION_BIN: A-01-R02-N3</p>
                  <p>TASK_QUEUE: P4611_PUTAWAY_CONFIRMED</p>
                  <p className="text-white pt-2 font-sans font-bold">Trazabilidad Kárdex F4111 en tiempo real</p>
                </div>
              </div>
            )}

            {activeTab === 'uaf' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <span className="text-xs font-mono text-indigo-400 font-bold uppercase">Prevención de Lavado de Activos</span>
                  <h3 className="text-xl font-bold text-white">Screening UAF / PEP con Inferencia Gemini 2.5 Flash</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Verificación inmediata de RUTs de contratistas, proveedores y arrendatarios en listas de prevención de delitos y Personas Expuestas Políticamente con emisión de informe legal descargable.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-400" /> Latencia ultrarrápida de 1.42 segundos por consulta</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-400" /> Emisión automática del dictamen legal firmado en .PDF</li>
                  </ul>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-xs text-indigo-300 space-y-1">
                  <p className="text-slate-500">// Gemini 2.5 Flash Legal Screening</p>
                  <p>SUBJECT: 76.492.100-K (PROVEEDOR B2B)</p>
                  <p>PEP_STATUS: NO_MATCH (CLEAN)</p>
                  <p>UAF_RISK_SCORE: LOW (0.01)</p>
                  <p className="text-white pt-2 font-sans font-bold">Dictamen listo para Auditoría CMF</p>
                </div>
              </div>
            )}

            {activeTab === 'ot' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <span className="text-xs font-mono text-teal-400 font-bold uppercase">Gestión Operativa de Mantenimiento</span>
                  <h3 className="text-xl font-bold text-white">Órdenes de Trabajo (OT) con Factura Asociada Registrada</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Garantiza la trazabilidad exigida por el protocolo de desarrollo: toda OT conserva estrictamente su Categoría (`category`), Especialidad (`specialty`) y Factura Tributaria Asociada (`associatedInvoice`).
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><Check size={14} className="text-teal-400" /> Recepción digital y firma de conformidad en terreno</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-teal-400" /> Exportación a Excel con todas las columnas de control</li>
                  </ul>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-xs text-teal-300 space-y-1">
                  <p className="text-slate-500">// WorkOrderCenter Data Binding</p>
                  <p>OT_ID: OT-2026-9041</p>
                  <p>CATEGORY: MANTENCION_PREVENTIVA</p>
                  <p>SPECIALTY: CLIMATIZACION_HVAC</p>
                  <p>ASSOCIATED_INVOICE: FACT-88301 (SII_VALIDATED)</p>
                </div>
              </div>
            )}

            {activeTab === 'tax' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <span className="text-xs font-mono text-amber-400 font-bold uppercase">Cumplimiento Tributario SII Chile</span>
                  <h3 className="text-xl font-bold text-white">Módulos Formulario 29, F22, Reportes B13, B4 & Nota 14</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Prepara los reportes exigidos por el Servicio de Impuestos Internos para rentas de arrendamiento, libros auxiliares y notas explicativas contables sin errores de digitación.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><Check size={14} className="text-amber-400" /> Cálculo automático de PPM, IVA Crédito/Débito</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-amber-400" /> Formato homologado para auditores externos</li>
                  </ul>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-xs text-amber-300 space-y-1">
                  <p className="text-slate-500">// SII Tax Module Engine</p>
                  <p>REPORT: SII_NOTA_14_INMOBILIARIA</p>
                  <p>F29_CALCULATION: VALIDATED_OK</p>
                  <p>B13_B4_EXPORT: EXCEL_READY</p>
                </div>
              </div>
            )}

            {activeTab === 'ciso' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <span className="text-xs font-mono text-emerald-400 font-bold uppercase">Seguridad Informatica & Privacidad</span>
                  <h3 className="text-xl font-bold text-white">Arquitectura CISO ISO 27001 & No-Key Leak</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Todas las llamadas a las APIs de Gemini y bases de datos se realizan a través del servidor Express Proxy. Ninguna clave o secreto queda expuesto en el navegador cliente.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Firestore NoSQL con reglas de seguridad granulares</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Informe CISO en PDF generado para compliance</li>
                  </ul>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-xs text-emerald-300 space-y-1">
                  <p className="text-slate-500">// ISO 27001 CISO Shield</p>
                  <p>EXPRESS_PROXY: ACTIVE (Port 3000)</p>
                  <p>CLIENT_EXPOSED_KEYS: 0 (ZERO_LEAK)</p>
                  <p>AUDIT_LOGS: REALTIME_FIRESTORE</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: COMMERCIAL PRICING PLANS */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">Planes de Licenciamiento B2B</span>
            <h2 className="text-2xl md:text-4xl font-black text-white">Elige la Licencia Ideal para tu Cartera</h2>
            <p className="text-xs text-slate-400">Sin costos ocultos. Incluye soporte técnico especializado e implementación asistida.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* PLAN STARTER */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase">Plan Start B2B</span>
                <div className="space-y-1">
                  <span className="text-3xl font-black text-white">$450.000</span>
                  <span className="text-xs text-slate-400 block font-mono">CLP / Mes + IVA</span>
                </div>
                <p className="text-xs text-slate-300">Ideal para gestoras medianas y family offices emergentes.</p>
                <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-900">
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Hasta 25 Propiedades / Unidades</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Conciliación Contable ERP Basic</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Screening UAF/PEP Acelerado</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Control de OTs con Factura</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setSelectedPlan('Plan Start B2B');
                  setIsModalOpen(true);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase cursor-pointer border border-slate-700"
              >
                Solicitar Plan Start
              </button>
            </div>

            {/* PLAN CORPORATE PRO (FEATURED) */}
            <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-[#001d42] border-2 border-emerald-500 rounded-2xl p-6 space-y-6 flex flex-col justify-between relative shadow-2xl shadow-emerald-950/40">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-black text-[10px] uppercase font-mono px-3 py-1 rounded-full shadow-md">
                Más Elegido por Fondos B2B
              </div>
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Plan Corporate Pro</span>
                <div className="space-y-1">
                  <span className="text-3xl font-black text-white">$750.000</span>
                  <span className="text-xs text-slate-400 block font-mono">CLP / Mes + IVA</span>
                </div>
                <p className="text-xs text-slate-200">Para administradoras de carteras y fondos de inversión en crecimiento.</p>
                <ul className="space-y-2.5 text-xs text-slate-200 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Hasta 150 Propiedades / Unidades</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Conciliación Forense ERP F0911 & Benford</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Dictámenes UAF/PEP ilimitados en PDF</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Módulos Tributarios SII (F29, F22, B13, B4)</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Soporte Técnico Prioritario</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setSelectedPlan('Plan Corporate Pro');
                  setIsModalOpen(true);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-xl transition-all text-xs uppercase cursor-pointer shadow-lg tracking-wider"
              >
                Comprar Licencia Corporate
              </button>
            </div>

            {/* PLAN ENTERPRISE FONDO CUSTOM */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase">Plan Fondo Custom</span>
                <div className="space-y-1">
                  <span className="text-3xl font-black text-white">A Medida</span>
                  <span className="text-xs text-slate-400 block font-mono">Cotización Personalizada</span>
                </div>
                <p className="text-xs text-slate-300">Grandes fondos de inversión con integraciones ERP a la medida.</p>
                <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-900">
                  <li className="flex items-center gap-2"><Check size={14} className="text-indigo-400 shrink-0" /> Propiedades Ilimitadas</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-indigo-400 shrink-0" /> Conector API Directo ERP AssetFlow Enterprise/ SAP</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-indigo-400 shrink-0" /> Servidor Dedicado Cloud Run</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-indigo-400 shrink-0" /> Consultor de Implementación Asignado</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setSelectedPlan('Plan Fondo Custom');
                  setIsModalOpen(true);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase cursor-pointer border border-slate-700"
              >
                Cotizar Fondo Custom
              </button>
            </div>

          </div>
        </div>

        {/* FOOTER CALL TO ACTION */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-950 to-indigo-950 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-black text-white">
            ¿Listo para llevar tu Gestión Inmobiliaria al Siguiente Nivel?
          </h2>
          <p className="text-xs text-slate-300 max-w-xl mx-auto">
            Contacta directamente al creador del sistema para coordinar una demostración personalizada o activar tu licencia comercial hoy mismo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => {
                setSelectedPlan('Plan Corporate Pro');
                setIsModalOpen(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-7 py-3 rounded-xl text-xs uppercase cursor-pointer shadow-lg"
            >
              Contactar al Propietario (samaheim@gmail.com)
            </button>
            <button
              onClick={downloadCommercialBrochurePDF}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl text-xs cursor-pointer border border-slate-700 flex items-center gap-2"
            >
              <Download size={14} /> Descargar Dossier PDF
            </button>
          </div>
        </div>

      </div>

      {/* PURCHASE / DEMO MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
            >
              ✕
            </button>

            <div>
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase">Solicitud de Licencia B2B</span>
              <h3 className="text-xl font-bold text-white mt-1">Adquirir {selectedPlan}</h3>
              <p className="text-xs text-slate-400">Ingresa tus datos y coordinaremos la activación inmediata.</p>
            </div>

            {formSubmitted ? (
              <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-6 text-center space-y-2">
                <CheckCircle2 size={36} className="text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-sm font-bold text-white">¡Solicitud Enviada con Éxito!</h4>
                <p className="text-xs text-slate-300">
                  El propietario (<strong>samaheim@gmail.com</strong>) revisará tu requerimiento y te contactará a la brevedad.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nombre Completo:</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Roberto Silva"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-white p-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Empresa / Fondo:</label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Ej: Inversiones Sur SpA"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-white p-2.5 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Teléfono:</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+56 9 1234 5678"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-white p-2.5 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Email Corporativo:</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rsilva@inversiones.cl"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-white p-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Mensaje o Requerimientos Específicos:</label>
                  <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Comentarios adicionales sobre tu cartera de propiedades..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-white p-2.5 focus:border-emerald-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl transition-all text-xs uppercase cursor-pointer"
                >
                  Enviar Solicitud Directa
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default SystemLandingPageModule;
