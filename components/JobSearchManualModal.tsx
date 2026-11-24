import React, { useRef, useState, useEffect } from 'react';
import { 
  BookOpen, Download, Printer, X, CheckCircle2, Search, Briefcase, 
  Sparkles, ExternalLink, Globe, UserCheck, ArrowRight, MousePointer, 
  HelpCircle, AlertTriangle, Star, Check, Copy, Building2, Plus, 
  FileText, ShieldCheck, ChevronRight, Layers, Eye, RefreshCw, Smartphone
} from 'lucide-react';
import { printHtmlElement } from '../lib/printDocument';
import { downloadJobSearchManualPdf } from '../lib/jobSearchManualPdf';

interface JobSearchManualModalProps {
  onClose: () => void;
}

export const JobSearchManualModal: React.FC<JobSearchManualModalProps> = ({ onClose }) => {
  const manualRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    setDownloadSuccess(false);
    try {
      await downloadJobSearchManualPdf('Manual_Usuario_Modulo_Empleo_P09OWJOB.pdf');
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4500);
    } catch (err) {
      console.error('Error al generar PDF del manual de empleo:', err);
      alert('Hubo un inconveniente al generar el PDF. Puedes utilizar el botón "Imprimir" como alternativa inmediata.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!manualRef.current) return;
    await printHtmlElement(manualRef.current, 'Manual_Usuario_Modulo_Empleo_P09OWJOB');
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-slate-800/40 backdrop-blur-xs overflow-y-auto p-2 sm:p-6 flex justify-center items-start pt-4 sm:pt-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white text-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden mb-12 flex flex-col relative z-[100000]">
        
        {/* BARRA SUPERIOR DE ACCIONES (STICKY) */}
        <div className="bg-white text-slate-900 px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50 border-b border-slate-300 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl border border-amber-300">
              <BookOpen size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">
                  GUÍA DIDÁCTICA ILUSTRADA
                </span>
                <span className="text-slate-500 text-xs font-mono">P09OWJOB</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Manual de Uso Paso a Paso: Módulo de Empleo
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className={`flex items-center gap-2 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 ${
                downloadSuccess 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                  : 'bg-amber-400 hover:bg-amber-500 text-slate-950'
              }`}
              title="Descargar este manual en PDF para guardar o imprimir"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 size={16} className="text-white animate-pulse" />
                  <span>¡PDF Descargado!</span>
                </>
              ) : isExporting ? (
                <>
                  <Download size={15} className="animate-bounce" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Descargar PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider border border-white/20 transition-all cursor-pointer"
              title="Imprimir directamente desde el navegador"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer ml-1"
              title="Cerrar manual"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CONTENIDO DEL MANUAL IMPRIMIBLE / DESCARGABLE */}
        <div ref={manualRef} id="job-search-manual-content" className="bg-white p-6 sm:p-12 space-y-12 text-slate-800">
          
          {/* PORTADA DEL DOCUMENTO */}
          <div className="border-b-4 border-slate-900 pb-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0B3C5D] text-[#FFCC00] flex items-center justify-center font-black text-2xl shadow-md">
                  💼
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    DEPARTAMENTO INMOBILIARIO & DESARROLLO PROFESIONAL
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-black uppercase text-slate-900 tracking-tight">
                    Manual de Uso Práctico
                  </h1>
                </div>
              </div>
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 text-right text-xs">
                <p className="font-mono text-slate-500 text-[10px]">PROGRAMA</p>
                <p className="font-mono font-black text-slate-900 text-sm">P09OWJOB</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Versión 2026.4 — Listo para Imprimir</p>
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-6 text-amber-950 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-600 shrink-0" size={20} />
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Bienvenido: ¿Para qué sirve este módulo y por qué es tan fácil de usar?
                </h3>
              </div>
              <p className="text-xs leading-relaxed font-medium text-amber-900">
                Este módulo reúne en una sola pantalla las mejores ofertas de trabajo de Chile (tanto del <strong>Estado / Sector Público</strong> como del <strong>Sector Privado</strong> en portales como Empleos Públicos, Servicio Civil, LinkedIn, Laborum y Chiletrabajos). Compara de inmediato tu currículum con la oferta, te dice con un porcentaje qué tan compatible eres, te redacta una carta de presentación con Inteligencia Artificial y te lleva al portal de postulación en segundos.
              </p>
            </div>

            {/* RESUMEN VISUAL EN 5 PASOS */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs inline-flex items-center justify-center mb-1">1</span>
                <p className="text-[10px] font-black text-slate-700 uppercase">Buscar Ofertas</p>
                <p className="text-[9px] text-slate-500">Filtra por tu profesión</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs inline-flex items-center justify-center mb-1">2</span>
                <p className="text-[10px] font-black text-slate-700 uppercase">Ver el Match %</p>
                <p className="text-[9px] text-slate-500">¿Eres compatible?</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs inline-flex items-center justify-center mb-1">3</span>
                <p className="text-[10px] font-black text-slate-700 uppercase">Generar Carta</p>
                <p className="text-[9px] text-slate-500">1 clic con IA</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs inline-flex items-center justify-center mb-1">4</span>
                <p className="text-[10px] font-black text-slate-700 uppercase">Postular Directo</p>
                <p className="text-[9px] text-slate-500">Enlace directo</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center justify-center mb-1">5</span>
                <p className="text-[10px] font-black text-slate-700 uppercase">Seguimiento</p>
                <p className="text-[9px] text-slate-500">Mueve tus entrevistas</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PASO 1: CÓMO INGRESAR AL MÓDULO */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                1
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">PASO 1</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Cómo Ingresar al Módulo de Empleo
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Hay dos formas sencillas de entrar al módulo, dependiendo de cómo esté configurado tu usuario:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold uppercase text-[11px]">
                  <Briefcase size={16} /> Opción A: Usuario Exclusivo (SOLO EMPLEO)
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Si tu usuario tiene el perfil de <strong>SOLO EMPLEO</strong>, no tienes que hacer nada: al colocar tu contraseña el sistema se abrirá <strong>directamente en este módulo</strong>. Todo lo demás queda oculto para tu comodidad.
                </p>
              </div>

              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold uppercase text-[11px]">
                  <MousePointer size={16} /> Opción B: Desde el Menú Lateral o Fast Path
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  En la columna izquierda, busca la categoría <strong>«Portal Laboral & Empleo»</strong> y haz clic en <strong>«Búsqueda de Empleo Chile & Match CV (P09OWJOB)»</strong>. O escribe <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800">empleo</code> en el casillero <em>Fast Path</em> y pulsa <strong>IR</strong>.
                </p>
              </div>
            </div>

            {/* ILUSTRACIÓN PASO 1 */}
            <div className="bg-slate-100 rounded-2xl p-4 sm:p-6 text-slate-900 border border-slate-300 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-300 pb-2 text-[10px] text-slate-600 font-mono font-bold">
                <span>ILUSTRACIÓN 1.1: UBICACIÓN EN EL MENÚ DEL SISTEMA</span>
                <span className="text-emerald-800 font-bold">● VISTA EXACTA</span>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                <div className="w-full sm:w-64 bg-slate-50 p-3 rounded-lg border border-indigo-300 space-y-2">
                  <div className="text-[9px] font-bold text-slate-600 uppercase">Menú Lateral Izquierdo:</div>
                  <div className="bg-indigo-50 border border-indigo-300 text-indigo-950 p-2 rounded-lg flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <Briefcase size={14} className="text-amber-600" /> Búsqueda de Empleo
                    </span>
                    <span className="text-[9px] font-mono bg-indigo-100 border border-indigo-200 px-1 rounded text-indigo-900">P09OWJOB</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-indigo-800 text-xs font-bold">
                  <ArrowRight size={20} className="hidden sm:block animate-pulse" />
                  <span>👆 Haz clic en esta opción para abrir el portal</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PASO 2: CÓMO BUSCAR Y FILTRAR VACANTES */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                2
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">PASO 2</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Cómo Buscar y Filtrar Ofertas Laborales
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              No pierdas tiempo leyendo ofertas que no te interesan. Usa los filtros rápidos para ver solo lo que buscas:
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">A</span>
                <div>
                  <strong className="text-slate-900 uppercase">Barra de Búsqueda por Texto:</strong> Escribe una palabra clave como <em>"Auditor"</em>, <em>"Jefe de Operaciones"</em>, <em>"Logística"</em> o el nombre de una empresa (ej. <em>"Ministerio de Hacienda"</em>, <em>"Falabella"</em>). La lista se actualiza al instante mientras escribes.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">B</span>
                <div>
                  <strong className="text-slate-900 uppercase">Filtro por Sector (Público vs Privado):</strong> Puedes elegir ver solo concursos del Estado de Chile (Empleos Públicos, Alta Dirección Pública ADP) o solo empresas privadas.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">C</span>
                <div>
                  <strong className="text-slate-900 uppercase">Botón Amarillo «Actualizar Portales Chile»:</strong> Haz clic aquí para que el sistema consulte los portales y traiga ofertas recién publicadas.
                </div>
              </div>
            </div>

            {/* ILUSTRACIÓN PASO 2 */}
            <div className="bg-slate-100 rounded-2xl p-4 sm:p-6 text-slate-900 border border-slate-300 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-300 pb-2 text-[10px] text-slate-600 font-mono font-bold">
                <span>ILUSTRACIÓN 2.1: BARRA DE FILTROS RÁPIDOS</span>
                <span className="text-amber-800 font-bold">FILTROS VISUALES</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-slate-800">
                    <Search size={14} className="text-slate-500" />
                    <span>Escribe aquí: "Ingeniero Civil", "Control Interno", "Jefe"...</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-slate-100 border border-slate-300 px-3 py-2 rounded-xl text-[10px] font-bold text-slate-800 flex items-center gap-1">
                      <span>Sector: Todos ▼</span>
                    </div>
                    <div className="bg-amber-400 text-slate-950 px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shadow-2xs">
                      <RefreshCw size={12} /> Actualizar Portales
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-700 font-mono text-center font-bold">
                  👆 Si buscas trabajo en el Estado, selecciona en el selector de categoría: "Sector Público & Gobierno".
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PASO 3: CÓMO ENTENDER EL MATCH DE COMPATIBILIDAD (%) */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                3
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">PASO 3</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Cómo Entender el Porcentaje de Compatibilidad (Match %)
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Cada oferta tiene una etiqueta con un porcentaje. Este número te dice de forma automática <strong>cuánto calzas con el puesto</strong> comparando los requisitos con tus competencias registradas:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 space-y-1">
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase">
                  90% a 100% — EXCELENTE
                </span>
                <p className="font-bold text-emerald-950 text-xs mt-1">¡Postula de inmediato!</p>
                <p className="text-emerald-800 text-[11px]">
                  Cumples casi la totalidad de las habilidades solicitadas. Tu probabilidad de ser llamado a entrevista es máxima.
                </p>
              </div>

              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-1">
                <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                  75% a 89% — BUEN MATCH
                </span>
                <p className="font-bold text-amber-950 text-xs mt-1">Totalmente Postulable</p>
                <p className="text-amber-800 text-[11px]">
                  Tienes las competencias más importantes. Puedes suplir las faltantes destacando tu capacidad de aprendizaje en la carta.
                </p>
              </div>

              <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 space-y-1">
                <span className="bg-slate-600 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase">
                  Bajo 75% — REVISAR REQUISITOS
                </span>
                <p className="font-bold text-slate-900 text-xs mt-1">Evaluar Detalle</p>
                <p className="text-slate-600 text-[11px]">
                  Revisa la lista de habilidades grises (faltantes) para ver si las tienes en la vida real y solo te faltó agregarlas en tu perfil.
                </p>
              </div>
            </div>

            {/* ILUSTRACIÓN PASO 3 */}
            <div className="bg-slate-900 rounded-2xl p-4 sm:p-6 text-white border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] text-slate-400 font-mono">
                <span>ILUSTRACIÓN 3.1: TARJETA DE OFERTA CON DESGLOSE DE HABILIDADES</span>
                <span className="text-emerald-400 font-bold">INDICADOR EN VIVO</span>
              </div>

              <div className="bg-white text-slate-900 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black text-indigo-600 uppercase">Sector Público & Gobierno</span>
                    <h4 className="text-sm font-black uppercase">Jefe de Auditoría & Control Gubernamental</h4>
                    <p className="text-[10px] text-slate-500">Tesorería General de la República (TGR)</p>
                  </div>
                  <div className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-xl text-center">
                    <span className="text-xs font-black block leading-none">98%</span>
                    <span className="text-[8px] font-bold uppercase">MATCH</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Tus Habilidades que Coinciden (Verdes):</span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                      <Check size={10} /> Ingeniero Civil Industrial
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                      <Check size={10} /> Control Interno
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                      <Check size={10} /> Power BI & DAX
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PASO 4: CÓMO GENERAR LA CARTA DE PRESENTACIÓN AUTOMÁTICA */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                4
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">PASO 4</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Cómo Generar tu Carta de Presentación con Inteligencia Artificial (1 Clic)
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Ya no tienes que pasar horas pensando cómo escribir una carta formal para postular. El sistema la escribe por ti adaptada a la empresa:
            </p>

            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 font-medium">
              <li>En la tarjeta de la oferta que te gustó, busca el botón morado que dice <strong>«Carta IA»</strong> o <strong>«Generar Carta de Presentación»</strong> (<Sparkles size={13} className="inline text-indigo-600" />).</li>
              <li>Haz clic sobre él. En 1 segundo se abrirá una ventana con una <strong>carta formal profesional lista</strong> dirigida al Gerente de Selección o Comisión Evaluadora.</li>
              <li>Haz clic en el botón <strong>«Copiar Texto»</strong> (<Copy size={13} className="inline" />).</li>
              <li>¡Listo! Pégala en el portal de empleo (Laborum, Empleos Públicos o correo) usando <kbd className="bg-slate-200 px-1 rounded font-mono">Ctrl + V</kbd>.</li>
            </ol>

            {/* ILUSTRACIÓN PASO 4 */}
            <div className="bg-slate-100 rounded-2xl p-4 sm:p-6 text-slate-900 border border-slate-300 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-300 pb-2 text-[10px] text-slate-600 font-mono font-bold">
                <span>ILUSTRACIÓN 4.1: VENTANA GENERADORA DE CARTAS DE PRESENTACIÓN</span>
                <span className="text-indigo-800 font-bold">1 CLIC</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-3 shadow-2xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Sparkles size={16} className="text-amber-600" />
                    <span>Carta de Presentación: Jefe de Auditoría - TGR</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-indigo-700 text-white px-2.5 py-1 rounded text-[9px] font-black uppercase flex items-center gap-1 shadow-2xs">
                      <Copy size={11} /> Copiar
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-700 font-serif italic leading-relaxed">
                  "Estimada Comisión Calificadora: Mediante la presente manifiesto mi postulación al cargo de Jefe de Departamento de Auditoría... Mi experiencia en Control Interno, metodologías Cero Observaciones y herramientas Power BI me permiten asegurar un aporte de valor inmediato..."
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PASO 5: CÓMO POSTULAR EN EL PORTAL DIRECTO */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                5
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">PASO 5</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Cómo Postular Directo en el Portal Convocante (Sin Intermediarios)
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Todas las ofertas están conectadas directamente a la página donde se reciben los antecedentes:
            </p>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-xs text-blue-950 space-y-2">
              <p className="font-bold flex items-center gap-2">
                <ExternalLink size={16} className="text-blue-600" />
                Haz clic en el botón azul «Ir a Postulación Directa»:
              </p>
              <p className="text-[11px] text-blue-900 leading-relaxed">
                Al hacer clic, el navegador abrirá en una pestaña nueva la convocatoria en <strong>EmpleosPúblicos.cl</strong>, <strong>ServicioCivil.cl</strong>, <strong>Laborum</strong>, <strong>LinkedIn</strong> o el portal correspondiente. Además, el sistema automáticamente cambiará el estado de la oferta a <strong>«POSTULADO»</strong> para que lleves tu cuenta al día.
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PASO 6: CÓMO USAR EL TABLERO DE SEGUIMIENTO (KANBAN) */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                6
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">PASO 6</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Cómo Llevar el Control de tus Postulaciones (Tablero de Seguimiento)
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              En la pestaña superior <strong>«Tablero de Postulaciones»</strong> tienes un organizador tipo pizarra con 4 columnas para que nunca olvides a qué postulaste ni cuándo te llaman:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">COLUMNA 1</span>
                <strong className="text-slate-800 text-xs block uppercase">Por Postular</strong>
                <p className="text-[10px] text-slate-500 mt-1">Ofertas que te interesan y vas a enviar pronto.</p>
              </div>

              <div className="bg-sky-50 p-3 rounded-xl border border-sky-200">
                <span className="text-[9px] font-black uppercase text-sky-600 block mb-1">COLUMNA 2</span>
                <strong className="text-sky-900 text-xs block uppercase">Postulado</strong>
                <p className="text-[10px] text-sky-700 mt-1">Ya mandaste tu currículum o postulaste en el portal.</p>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-[9px] font-black uppercase text-amber-700 block mb-1">COLUMNA 3</span>
                <strong className="text-amber-950 text-xs block uppercase">En Entrevista</strong>
                <p className="text-[10px] text-amber-800 mt-1">¡Te contactaron! Estás en reuniones de selección.</p>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-[9px] font-black uppercase text-emerald-700 block mb-1">COLUMNA 4</span>
                <strong className="text-emerald-950 text-xs block uppercase">Oferta / Contrato</strong>
                <p className="text-[10px] text-emerald-800 mt-1">¡Te seleccionaron para el empleo!</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              💡 <em>¿Cómo mover una oferta de columna?</em> Muy fácil: en la misma tarjeta de la oferta hay un menú desplegable pequeño donde puedes cambiar el estado a "En Entrevista" o "Contratado" con un solo clic.
            </p>
          </div>

          {/* ========================================================================= */}
          {/* PASO 7: CÓMO PERSONALIZAR TUS HABILIDADES EN "MI PERFIL & CV" */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-teal-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                7
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-teal-600 tracking-wider">PASO 7</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Cómo Personalizar tus Habilidades (Pestaña «Mi Perfil & Competencias»)
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              ¿Hiciste un curso nuevo o tienes una habilidad que no aparece en la lista? Agrégala para que tu Match % suba automáticamente:
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800 uppercase text-[11px]">
                <Plus size={16} className="text-teal-600" /> Para Agregar una Competencia:
              </div>
              <p className="text-slate-600 text-[11px]">
                1. Ve a la pestaña superior <strong>«Mi Perfil & Competencias»</strong>.<br />
                2. En el casillero escribe el nombre (ejemplo: <em>"Excel Avanzado"</em>, <em>"Gestión de Contratos"</em>, <em>"Inglés Intermedio"</em>).<br />
                3. Pulsa el botón verde <strong>«Agregar Habilidad»</strong>.<br />
                4. ¡Listo! Todas las ofertas del sistema se volverán a calcular para reflejar tu nueva habilidad.
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PASO 8: PORTALES CHILENOS DIRECTOS */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-slate-800 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                8
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">PASO 8</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Accesos Directos a los Portales de Chile
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Si quieres salir a explorar vacantes directamente en los portales de empleo de Chile, haz clic en la pestaña <strong>«Portales Chilenos»</strong>. Encontrarás botones directos preconfigurados:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <span className="font-black text-slate-900 block text-xs">🇨🇱 Empleos Públicos</span>
                <span className="text-[9px] text-slate-500">Concursos en Ministerios, Hospitales y Municipalidades.</span>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <span className="font-black text-slate-900 block text-xs">🏛️ Servicio Civil / ADP</span>
                <span className="text-[9px] text-slate-500">Alta Dirección Pública para Directores y Jefaturas.</span>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <span className="font-black text-slate-900 block text-xs">🏢 BNE (Bolsa Nacional)</span>
                <span className="text-[9px] text-slate-500">Plataforma del Ministerio del Trabajo y SENCE.</span>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <span className="font-black text-slate-900 block text-xs">💼 Laborum & LinkedIn</span>
                <span className="text-[9px] text-slate-500">Vacantes del sector privado corporativo en Chile.</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PREGUNTAS FRECUENTES (FAQ) ULTRA SIMPLES */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-4 border-t-2 border-slate-900">
            <div className="flex items-center gap-3">
              <HelpCircle size={28} className="text-amber-500" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                Preguntas Frecuentes (Respuestas Rápidas)
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <strong className="text-slate-900 block mb-1">¿Por qué no veo los otros botones del sistema inmobiliario?</strong>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Si tu usuario tiene el rol <em>SOLO EMPLEO</em>, el sistema se configuró para que tengas una experiencia limpia, privada y enfocada exclusivamente en tu búsqueda laboral, sin botones de finanzas o propiedades que te estorben.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <strong className="text-slate-900 block mb-1">¿Qué pasa si encuentro una oferta en el diario o en otra página web?</strong>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Puedes registrarla en tu sistema haciendo clic en el botón <strong>«Agregar Vacante Manual»</strong> (+). Podrás escribir el cargo, la empresa, la renta ofrecida y el enlace para llevar todo en el mismo tablero.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <strong className="text-slate-900 block mb-1">¿El sistema envía el CV automáticamente por mí?</strong>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  No. Por seguridad y transparencia, el sistema te redacta la carta y te abre la página directa del portal para que tú mismo confirmes el envío con tu clave única o cuenta personal.
                </p>
              </div>
            </div>
          </div>

          {/* BANNER DE ACCIÓN RÁPIDA: DESCARGA INFERIOR */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-amber-950 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-amber-600 shrink-0" />
                <h4 className="text-sm font-black uppercase tracking-tight">¿Deseas guardar este manual en tu computador o imprimirlo?</h4>
              </div>
              <p className="text-xs text-amber-900 mt-1 font-medium">
                Genera un documento en PDF de 4 páginas de alta resolución listo para archivar, compartir o imprimir en tamaño carta.
              </p>
            </div>
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className={`flex items-center gap-2 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer shrink-0 disabled:opacity-50 ${
                downloadSuccess 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-amber-400 hover:bg-amber-500 text-slate-950'
              }`}
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 size={16} className="text-white animate-pulse" />
                  <span>¡PDF Descargado con Éxito!</span>
                </>
              ) : isExporting ? (
                <>
                  <Download size={16} className="animate-bounce" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Descargar Manual en PDF</span>
                </>
              )}
            </button>
          </div>

          {/* PIE DE PÁGINA FORMAL DEL MANUAL */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[10px] font-mono">
            <div>
              <span>SISTEMA DE GESTIÓN INMOBILIARIA & DESARROLLO LABORAL</span>
              <p>MÓDULO DE BÚSQUEDA DE EMPLEO CHILE (P09OWJOB)</p>
            </div>
            <div className="text-right">
              <p>DOCUMENTO GENERADO PARA USO PROFESIONAL</p>
              <p className="text-emerald-600 font-bold">GOBERNANZA CMF & CONTROL INTERNO</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default JobSearchManualModal;
