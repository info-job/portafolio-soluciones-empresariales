/// <reference types="vite/client" />
import React, { useState } from 'react';
import { 
  Sparkles, Download, Printer, CheckCircle2, ShieldCheck, 
  Wrench, Calculator, LifeBuoy, BookOpen, Database, 
  Activity, Star, Globe, RefreshCw, Layers, Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import jdeBanner from '../src/assets/images/jde_banner_image_1779306228435.png';
import { printHtmlElement } from '../lib/printDocument';

interface BrochureModuleProps {
  currentUser: string;
}

export const BrochureModule: React.FC<BrochureModuleProps> = ({ currentUser }) => {
  const [clientName, setClientName] = useState('GRUPO EMPRESARIAL S.A.');
  const [consultantName, setConsultantName] = useState(currentUser || 'CONSULTOR TI PRINCIPAL');
  const [themeColor, setThemeColor] = useState<'navy' | 'emerald' | 'crimson'>('navy');
  const [showWatermark, setShowWatermark] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handlePrint = () => {
    printHtmlElement('brochure-paper', `Brochure_Corporativo_${clientName.replace(/\s+/g, '_')}`);
  };

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const element = document.getElementById('brochure-paper');
      if (!element) {
        alert('No se pudo encontrar el contenedor del brochure.');
        return;
      }
      
      // Pausa razonable para asegurar que todos los recursos de imagen y SVG estén listificados
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 2.0, // Alta definición ideal con carga balanceada
        useCORS: true,
        allowTaint: false, // ¡IMPORTANTE! Si está en true, toDataURL() lanza excepción de seguridad "tainted canvas"
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const imgWidth = 210; // Ancho A4 estándar en mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width; // Alto proporcional exacto

      // Creamos un documento de formato exacto y continuo para que la maqueta se lea ideal, sin cortes de página
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [imgWidth, imgHeight]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      const sanitizedClient = clientName ? clientName.trim().replace(/[^a-zA-Z0-9]/g, '_') : 'CLIENTE';
      pdf.save(`Brochure_Corporativo_${sanitizedClient}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF de alta fidelidad:', error);
      alert('Hubo un problema al generar el PDF de alta fidelidad desde el canvas. Se utilizará la alternativa de impresión local para su descarga.');
      handlePrint();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Color mappings based on selection
  const themeClasses = {
    navy: {
      primary: 'bg-[#0B3C5D]',
      text: 'text-[#0B3C5D]',
      border: 'border-[#0B3C5D]',
      accentBg: 'bg-[#FFCC00]/10',
      accentText: 'text-[#0B3C5D]',
      pill: 'bg-[#0B3C5D]/10 text-[#0B3C5D]',
      bullet: 'bg-[#FFCC00]',
      gradient: 'from-[#0B3C5D] to-[#1D5E8C]'
    },
    emerald: {
      primary: 'bg-emerald-700',
      text: 'text-emerald-800',
      border: 'border-emerald-600',
      accentBg: 'bg-emerald-50',
      accentText: 'text-emerald-850',
      pill: 'bg-emerald-100 text-emerald-850',
      bullet: 'bg-amber-500',
      gradient: 'from-emerald-700 to-teal-600'
    },
    crimson: {
      primary: 'bg-rose-900',
      text: 'text-rose-900',
      border: 'border-rose-900',
      accentBg: 'bg-rose-50',
      accentText: 'text-rose-900',
      pill: 'bg-rose-100 text-rose-900',
      bullet: 'bg-rose-500',
      gradient: 'from-rose-900 to-red-800'
    }
  }[themeColor];

  return (
    <div className="flex-grow flex flex-col xl:flex-row h-full overflow-hidden bg-slate-100 select-none font-sans no-print-background">
      
      {/* LEFT SECTION: CUSTOMIZATION PANEL (HIDDEN IN PRINT) */}
      <div className="w-full xl:w-96 bg-white border-b xl:border-b-0 xl:border-r border-slate-250 p-6 flex flex-col gap-6 shrink-0 overflow-y-auto no-print">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 rounded-full bg-amber-500/10 text-amber-605 text-[10px] uppercase font-black tracking-widest flex items-center gap-1">
              <Star size={10} className="fill-amber-500 text-amber-500" />
              Socio Corporativo
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-600" />
            Configurador de Brochure
          </h2>
          <p className="text-[10px] font-semibold text-slate-450 uppercase tracking-wider mt-1">
            Personalice la presentación corporativa antes de generar el reporte PDF.
          </p>
        </div>

        <div className="h-[1px] bg-slate-200"></div>

        {/* INPUT: CLIENT NAME */}
        <div className="space-y-1.5">
          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">Nombre del Cliente / Prospecto</label>
          <input 
            type="text" 
            value={clientName}
            onChange={(e) => setClientName(e.target.value.toUpperCase())}
            placeholder="EJ: CORPORACIÓN MULTINACIONAL"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-black uppercase text-slate-800 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner"
          />
        </div>

        {/* INPUT: CONSULTANT NAME */}
        <div className="space-y-1.5">
          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">Consultor Asignado</label>
          <input 
            type="text" 
            value={consultantName}
            onChange={(e) => setConsultantName(e.target.value.toUpperCase())}
            placeholder="EJ: NOMBRE DEL EJECUTIVO"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold uppercase text-slate-800 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner"
          />
        </div>

        {/* COLOR SCHEME SELECTION */}
        <div className="space-y-2">
          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">Esquema de Colores Corporativo</label>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setThemeColor('navy')}
              className={`px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${
                themeColor === 'navy' 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-102' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-[#0B3C5D] border border-white/20" />
              ERP Navy
            </button>
            <button 
              onClick={() => setThemeColor('emerald')}
              className={`px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${
                themeColor === 'emerald' 
                  ? 'bg-emerald-950 text-white border-emerald-950 shadow-md scale-102' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-emerald-700 border border-white/20" />
              Sustentable
            </button>
            <button 
              onClick={() => setThemeColor('crimson')}
              className={`px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${
                themeColor === 'crimson' 
                  ? 'bg-rose-950 text-white border-rose-950 shadow-md scale-102' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-rose-900 border border-white/20" />
              Premium Crimson
            </button>
          </div>
        </div>

        {/* WATERMARK TOGGLE */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <div>
            <p className="text-[10px] font-black text-slate-850 uppercase tracking-tight">Filigrana de Confidencialidad</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Incluye sello CONFIDENCIAL en PDF</p>
          </div>
          <input 
            type="checkbox" 
            checked={showWatermark}
            onChange={(e) => setShowWatermark(e.target.checked)}
            className="w-4 h-4 text-indigo-600 accent-indigo-600"
          />
        </div>

        <div className="h-[1px] bg-slate-200 mt-auto"></div>

        {/* EXPORT ACTION BUTTONS */}
        <div className="space-y-3">
          <button 
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            className={`w-full py-4 ${themeClasses.primary} hover:opacity-90 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-slate-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <Download size={16} />
                Descargar PDF de Alta Fidelidad
              </>
            )}
          </button>

          <button 
            onClick={handlePrint}
            disabled={isGeneratingPDF}
            className="w-full py-3 bg-slate-100 text-slate-705 hover:bg-slate-200 active:scale-95 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-slate-300"
          >
            <Printer size={14} />
            Imprimir por Navegador / PDF Local
          </button>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-1">
          <p className="text-[9px] font-bold text-amber-850 leading-normal uppercase">
            💡 <strong>Soporte Iframe:</strong> Para navegadores dentro de ambientes de prueba (Iframes), use el botón de <strong>Descarga PDF de Alta Fidelidad</strong> para obtener el archivo de forma directa y garantizada.
          </p>
          <p className="text-[8px] font-semibold text-slate-500 leading-normal uppercase">
            Si usa la opción de impresión local, recuerde activar la casilla de "Gráficos de fondo" en su diálogo de impresión de Chrome/Safari.
          </p>
        </div>
      </div>

      {/* RIGHT SECTION: BROCHURE PREVIEW / DOCUMENT PAPER SHEET */}
      <div id="printable-area" className="flex-1 overflow-y-auto p-4 md:p-8 custom-audit-scroll bg-slate-200/60 print:p-0 print:m-0 print:bg-white print:overflow-visible">
        
        {/* PHYSICAL PAPER CONTAINER */}
        <div id="brochure-paper" className="max-w-[812px] mx-auto bg-white border border-slate-300 shadow-2xl rounded-sm print:shadow-none print:border-none print:rounded-none relative overflow-hidden flex flex-col p-8 md:p-12 space-y-8 animate-in fade-in duration-300 min-h-[1130px]">
          
          {/* CONFIDENCIAL WATERMARK */}
          {showWatermark && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none select-all opacity-[0.04] text-[#0B3C5D] font-black text-[5.5rem] tracking-[1.5rem] uppercase -rotate-30 -z-0">
              CONFIDENCIAL
            </div>
          )}

          {/* DOCUMENT HEADER */}
          <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 shrink-0 relative z-10">
            <div className="flex gap-2.5 items-center">
              <div className="bg-[#0B3C5D] p-2 text-white font-mono font-black text-xs tracking-wider rounded-sm uppercase">
                ASSETFLOW
              </div>
              <div className="h-6 w-[1.5px] bg-slate-350" />
              <div>
                <h4 className="text-[12px] font-black tracking-widest uppercase text-slate-800">ERP Central</h4>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest -mt-0.5">Integrated Enterprise v9.2</p>
              </div>
            </div>

            <div className="text-right">
              <span className={`px-3 py-1 ${themeClasses.pill} font-black text-[9px] uppercase tracking-wider rounded`}>
                Propuesta Corporativa
              </span>
              <p className="text-[8px] font-black text-slate-400 uppercase mt-2 font-mono">FECHA DE EMISIÓN: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* HERO BANNER SECTION WITH IMAGE */}
          <div className="relative rounded-2xl overflow-hidden shadow-md flex-shrink-0 z-10 h-64 md:h-72">
            <img 
              src={jdeBanner} 
              alt="AssetFlow Enterprise ERP Suite Banner"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${themeClasses.gradient} mix-blend-multiply opacity-80`} />
            <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end text-white space-y-2">
              <span className="text-[10px] font-black text-[#FFCC00] tracking-widest uppercase font-mono">Lanzamiento Corporativo</span>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight max-w-xl leading-none">
                AssetFlow Enterprise ERP Suite
              </h1>
              <p className="text-[11px] md:text-xs text-white/90 font-medium max-w-lg leading-relaxed">
                Su plataforma centralizada de contabilidad fiscal, automatización inteligente de transacciones vía IA y soporte técnico Help Desk integrado.
              </p>
            </div>
          </div>

          {/* PRESPECTED CUSTOMER GREETING & DETAILS */}
          <div className={`p-6 ${themeClasses.accentBg} rounded-2xl border-l-4 ${themeClasses.border} space-y-2 shrink-0 z-10`}>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black ${themeClasses.accentText} uppercase tracking-wider`}>Preparado Exclusivamente Para:</span>
            </div>
            <p className="text-base font-black text-slate-850 uppercase tracking-tight leading-none">
              {clientName || 'GRUPO EMPRESARIAL INTEGRAL S.A.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[9px] font-bold text-slate-500 uppercase font-mono pt-1">
              <div>
                <span>Consultor Responsable:</span>
                <span className="block text-slate-700 font-extrabold">{consultantName || 'CONSULTOR TI PRINCIPAL'}</span>
              </div>
              <div>
                <span>Licenciamiento:</span>
                <span className="block text-slate-700 font-extrabold">SaaS Unlimited / Corporativo</span>
              </div>
              <div>
                <span>ID Proyecto:</span>
                <span className="block text-slate-700 font-extrabold">JD_ERP92_INTEGRADO</span>
              </div>
            </div>
          </div>

          {/* KEY CORE SOLUTIONS GRID */}
          <div className="space-y-4 relative z-10">
            <h3 className={`text-xs font-black ${themeClasses.text} uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-50/50 pb-2`}>
              <Layers size={14} /> Soluciones del Ecosistema Integrado
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* SOLUTION 1 */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex gap-3 h-28">
                <div className={`w-9 h-9 rounded-lg ${themeClasses.primary} text-white flex items-center justify-center shrink-0`}>
                  <BookOpen size={18} />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <h4 className="text-[10px] font-black text-slate-850 uppercase tracking-tight leading-none flex items-center gap-1">
                    Contabilidad General ERP
                  </h4>
                  <p className="text-[9px] text-slate-500 font-medium leading-normal line-clamp-3">
                    Monitoree Libro Diario, control de Fondos de Caja Chica, Cuentas por Cobrar/Pagar, Mayores de Cuentas, y complete la definición de su Plan de Cuentas Financiero.
                  </p>
                </div>
              </div>

              {/* SOLUTION 2 */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex gap-3 h-28">
                <div className="w-9 h-9 rounded-lg bg-indigo-650 text-white flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <h4 className="text-[10px] font-black text-slate-850 uppercase tracking-tight leading-none flex items-center gap-1">
                    Carga Inteligente con IA
                  </h4>
                  <p className="text-[9px] text-slate-500 font-medium leading-normal line-clamp-3">
                    Procesamiento de lotes y boletas interpretadas con inteligencia artificial generativa directa. Convierte datos no estructurados en asientos ERP validados en un segundo.
                  </p>
                </div>
              </div>

              {/* SOLUTION 3 */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex gap-3 h-28">
                <div className={`w-9 h-9 rounded-lg ${themeClasses.primary} text-white flex items-center justify-center shrink-0`}>
                  <Wrench size={18} />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <h4 className="text-[10px] font-black text-slate-850 uppercase tracking-tight leading-none flex items-center gap-1">
                    Gestión de Mantenciones
                  </h4>
                  <p className="text-[9px] text-slate-500 font-medium leading-normal line-clamp-3">
                    Maestro de Propiedades integrados a Órdenes de Trabajo técnicas, expedientes automáticos con subtareas interactivas en campo y bitácoras detalladas para maquinarias.
                  </p>
                </div>
              </div>

              {/* SOLUTION 4 */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex gap-3 h-28">
                <div className="w-9 h-9 rounded-lg bg-indigo-650 text-white flex items-center justify-center shrink-0">
                  <LifeBuoy size={18} />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <h4 className="text-[10px] font-black text-slate-850 uppercase tracking-tight leading-none flex items-center gap-1">
                    Centro Help Desk TI
                  </h4>
                  <p className="text-[9px] text-slate-500 font-medium leading-normal line-clamp-3">
                    Estación de incidencias con foliados, administración técnica de tickets por prioridad, plazos vencidos, exportaciones financieras Excel, y flujo drill-down interno.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* SECURITY & OFFLINE COHERENCE FIELD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 pt-2 flex-grow">
            
            {/* PLATFORM ADVANTAGES LIST */}
            <div className="space-y-3.5">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-600" /> Atributos de Seguridad Corporativa
              </h4>
              <ul className="space-y-2.5 text-[9px] text-slate-650 font-semibold uppercase leading-tight">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Sello UAF AML Compliance para prevención de blanqueo de capitales.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Debida Diligencia de Terceros vinculada a listas internacionales de riesgo.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Informes Reguladores tributarios Instantáneos (B13, B4 y Nota Financiera 14).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Historial de auditoría completo indexado por transacción de usuario.</span>
                </li>
              </ul>
            </div>

            {/* SYNC GRAPH */}
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wide leading-tight flex items-center gap-1.5">
                  <Database size={13} className={showWatermark ? 'text-indigo-600' : 'text-slate-600'} />
                  Resiliencia Tecnológica
                </h4>
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Conectividad Firestore Offline-First</p>
              </div>

              <div className="py-2 flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className={`p-2 rounded-xl ${themeClasses.accentBg} ${themeClasses.accentText} border border-dashed border-slate-300 w-10 h-10 flex items-center justify-center font-bold tracking-tight text-xs`}>
                    ERP
                  </div>
                  <span className="text-[8px] text-slate-400 font-bold uppercase block mt-1">Local IP</span>
                </div>
                <div className="text-slate-400 flex flex-col items-center">
                  <span className="text-[7px] text-emerald-600 font-extrabold uppercase animate-pulse">REPLICADO</span>
                  <Activity size={12} className="text-emerald-500" />
                  <span className="text-[7.5px] text-slate-350 font-mono tracking-tighter">SQL-LNKOK</span>
                </div>
                <div className="text-center">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-dashed border-indigo-200 w-10 h-10 flex items-center justify-center font-bold tracking-tight text-xs">
                    CLOUD
                  </div>
                  <span className="text-[8px] text-slate-400 font-black uppercase block mt-1">Firestore</span>
                </div>
              </div>

              <p className="text-[8px] text-slate-500 font-medium leading-relaxed italic text-center">
                Permite la carga ininterrumpida de información en terreno. Los datos se envían a la nube de manera garantizada mediante cola de lotes.
              </p>
            </div>
          </div>

          {/* HARDWARE REQ / SERVICE METRIC NOTE */}
          <div className="bg-slate-100/50 p-3.5 border border-slate-200 rounded-xl space-y-1.5 shrink-0 relative z-10">
            <h5 className="text-[8.5px] font-black text-slate-700 uppercase tracking-wider">Compromiso de Nivel de Servicio (SLA)</h5>
            <p className="text-[8px] text-slate-500 font-medium leading-relaxed uppercase">
              Monitoreo continuo respaldado por la Consola de Auditoría ASSETFLOW ERP Central Systems. Disponibilidad garantizada de base de datos del <strong>99.98%</strong> en replicaciones redundantes, mitigación de caídas localmente por almacenamiento en IndexDB del terminal de operaciones.
            </p>
          </div>

          {/* STATEMENT FOOTER PAGE SIGN */}
          <div className="text-center border-t border-slate-100 pt-5 space-y-1 shrink-0 relative z-10 mt-auto">
            <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">ASSETFLOW ERP Central Solutions Portfolio</p>
            <p className="text-[7.5px] font-semibold text-slate-400 uppercase tracking-widest">Chile • Costa Rica • Argentina • España • Operaciones de Cumplimiento Global</p>
          </div>

        </div>
      </div>
      
    </div>
  );
};

export default BrochureModule;
