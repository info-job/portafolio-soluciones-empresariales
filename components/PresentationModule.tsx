import React, { useState } from 'react';
import { 
  Presentation, Download, ChevronLeft, ChevronRight, Play, Sparkles, 
  Database, ShieldAlert, CheckCircle2, Building2, TrendingUp, HelpCircle, 
  Info, Users, LayoutGrid, FileText
} from 'lucide-react';
import pptxgen from 'pptxgenjs';

interface PresentationModuleProps {
  currentUser?: string;
  companyLogo?: string | null;
}

interface SlideData {
  id: number;
  title: string;
  subtitle?: string;
  type: 'cover' | 'content' | 'split' | 'conclusion';
  bgTheme: 'dark' | 'light';
  category: string;
  points: { title: string; desc: string; icon?: React.ReactNode }[];
  highlight?: string;
}

export const PresentationModule: React.FC<PresentationModuleProps> = ({ currentUser = 'CRISTIAN MUÑOZ R.', companyLogo }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [customCompany, setCustomCompany] = useState('ASSETFLOW SEGUROS');
  const [customPresenter, setCustomPresenter] = useState(currentUser || 'CRISTIAN MUÑOZ R.');

  const slides: SlideData[] = [
    {
      id: 1,
      category: 'BIENVENIDA',
      title: 'Democratización del Dato en la Gestión Inmobiliaria',
      subtitle: 'Ecosistema de Información y Toma de Decisiones Cohesivas',
      type: 'cover',
      bgTheme: 'dark',
      points: [],
      highlight: 'Un ecosistema unificado que elimina silos de información para transformar datos transaccionales de control inmobiliario y compliance en activos estratégicos de negocio.'
    },
    {
      id: 2,
      category: 'EL DESAFÍO OPERATIVO',
      title: 'La Problemática de los Silos de Información',
      subtitle: 'Puntos de dolor previos a la centralización de datos',
      type: 'content',
      bgTheme: 'light',
      points: [
        {
          title: 'Asimetría en los Datos',
          desc: 'Información dispersa entre departamentos (Finanzas, Operaciones, Legal), impidiendo una visión global en tiempo real.'
        },
        {
          title: 'Procesos Manuales Críticos',
          desc: 'Dependencia de planillas desconectadas propensas a errores humanos en registros contables e hitos contractuales.'
        },
        {
          title: 'Opaquedad en el Cumplimiento',
          desc: 'Riesgos regulatorios (UAF, Debida Diligencia) debido a la falta de trazabilidad histórica y alertas preventivas automáticas.'
        },
        {
          title: 'Lentitud de Respuesta',
          desc: 'Toma de decisiones reactiva por demoras de días en consolidar balances, reportes de reparación y estados de pólizas.'
        }
      ],
      highlight: 'La fragmentación del dato no solo ralentiza la operación, sino que genera brechas de control interno y riesgos financieros severos.'
    },
    {
      id: 3,
      category: 'LA PROPUESTA DE VALOR',
      title: 'Democratización y Acceso Cohesivo',
      subtitle: 'La transformación del dato en un recurso compartido y transparente',
      type: 'split',
      bgTheme: 'light',
      points: [
        {
          title: 'Acceso Universal Controlado',
          desc: 'Cualquier usuario autorizado puede acceder a la ficha técnica, transacciones históricas o hitos de mantenimiento sin depender de intermediarios.'
        },
        {
          title: 'Consistencia Relacional Rigurosa',
          desc: 'Emulación impecable del Libro Mayor (F0911), Maestro de Atributos (F980011D) y Catálogos para mantener consistencia contable.'
        },
        {
          title: 'Gobierno de Datos Proactivo',
          desc: 'Validaciones automatizadas, marcas de tiempo criptográficas y firma de auditor para garantizar la veracidad física de cada transacción.'
        }
      ],
      highlight: 'Democratizar no es desordenar; es estructurar el acceso para que cada colaborador tome decisiones informadas con datos confiables y sellados.'
    },
    {
      id: 4,
      category: 'COMPLIANCE Y DEBIDA DILIGENCIA',
      title: 'Blindaje de la Cadena de Suministro',
      subtitle: 'Interconectividad del Maestro de Proveedores y Auditoría de Cumplimiento',
      type: 'content',
      bgTheme: 'light',
      points: [
        {
          title: 'Evaluación y Alertas Preventivas',
          desc: 'Análisis automatizado de Debida Diligencia para cada proveedor, indicando de forma visual vigencia, vencimientos y nivel de riesgo.'
        },
        {
          title: 'Formularios UAF Integrados',
          desc: 'Digitalización y trazabilidad de los beneficiarios finales en formularios DI-01, mitigando activamente riesgos de lavado de activos.'
        },
        {
          title: 'Referencias Cruzadas Inteligentes',
          desc: 'Garantía de que cada egreso, orden de trabajo u operación se realice exclusivamente con un proveedor vigente y debidamente auditado.'
        }
      ],
      highlight: 'El sistema interconecta la Debida Diligencia directamente con la liberación de fondos, asegurando que el cumplimiento no sea un trámite, sino una regla operativa automática.'
    },
    {
      id: 5,
      category: 'CERRANDO EL CÍCLO DE OPERACIONES',
      title: 'Eficiencia Inmobiliaria e Infraestructura',
      subtitle: 'Trazabilidad total desde el requerimiento hasta el documento contable',
      type: 'content',
      bgTheme: 'light',
      points: [
        {
          title: 'Órdenes de Trabajo Inteligentes',
          desc: 'Mantenimiento preventivo y correctivo con imputación directa a cuentas, rubros y pólizas asociadas, evitando costos no reclamados.'
        },
        {
          title: 'Recepción Técnica F4312',
          desc: 'Aprobación jerárquica obligatoria que conecta la inspección en terreno con el devengo contable automático en el Ledger.'
        },
        {
          title: 'Gestión Contractual Integrada',
          desc: 'Control automático de canon de arriendo, reajustes IPC, retención de garantías y alertas de vencimiento de contratos.'
        }
      ],
      highlight: 'Cada acción en terreno se traduce de inmediato en un registro financiero visible, democratizando el estado real del patrimonio inmobiliario.'
    },
    {
      id: 6,
      category: 'HERRAMIENTAS DE CIERRE Y GOBIERNO',
      title: 'Auditoría, Consistencia y Reportabilidad',
      subtitle: 'Informes con estándares ejecutivos listos para la toma de decisiones',
      type: 'split',
      bgTheme: 'light',
      points: [
        {
          title: 'Estructuración B4 y Planilla B13',
          desc: 'Consolidación automática en segundos de informes reguladores y auditoría contable, eliminando el trabajo manual de fin de mes.'
        },
        {
          title: 'Análisis de Benford Integrado',
          desc: 'Algoritmos estadísticos que detectan anomalías en montos registrados para prever y alertar sobre potenciales desviaciones o fraudes.'
        },
        {
          title: 'Sellado y Regularización Masiva',
          desc: 'Consola de auditoría para verificar y sellar firmas, marcas de tiempo y consistencia relacional (F0911 vs F4801).'
        }
      ],
      highlight: 'La alta gerencia accede a un centro de control verificado, confiando plenamente en la consistencia matemática y normativa de los datos.'
    },
    {
      id: 7,
      category: 'CONCLUSIÓN Y VISIÓN',
      title: 'Hacia un Gobierno de Datos Inteligente',
      subtitle: 'El valor estratégico de la transparencia operacional',
      type: 'conclusion',
      bgTheme: 'dark',
      points: [],
      highlight: 'La democratización de los datos es la llave para descentralizar la toma de decisiones, agilizar la operación y garantizar el cumplimiento normativo en una sola plataforma integrada. Al empoderar a cada miembro de la organización con datos certeros, transparentes e interconectados, aseguramos la excelencia operativa y la protección del patrimonio.'
    }
  ];

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const exportToPPTX = () => {
    setIsExporting(true);
    try {
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_16x9';

      // Define standard styling constants
      const COLOR_PRIMARY = '047857'; // Emerald 700
      const COLOR_SECONDARY = '1E293B'; // Slate 800
      const COLOR_DARK_BG = '0F172A'; // Slate 900
      const COLOR_LIGHT_BG = 'F8FAFC'; // Slate 50
      const COLOR_ACCENT = '4F46E5'; // Indigo 600
      const COLOR_MUTED = '64748B'; // Slate 500
      const COLOR_WHITE = 'FFFFFF';

      slides.forEach((slideData) => {
        const slide = pptx.addSlide();

        if (slideData.bgTheme === 'dark') {
          // Dark Slide Background
          slide.background = { fill: COLOR_DARK_BG };
          
          // Accent decorative vertical block
          slide.addShape(pptx.ShapeType.rect, { 
            fill: { color: COLOR_PRIMARY }, 
            x: 0, y: 0, w: 0.3, h: 5.625 
          });

          // Category Tracker
          slide.addText(slideData.category, {
            x: 0.8, y: 0.8, w: 8.0, h: 0.3,
            fontSize: 10, bold: true, color: COLOR_PRIMARY,
            fontFace: 'Arial'
          });

          if (slideData.type === 'cover') {
            // Main Cover Title
            slide.addText(slideData.title, {
              x: 0.8, y: 1.4, w: 8.4, h: 1.6,
              fontSize: 32, bold: true, color: COLOR_WHITE,
              fontFace: 'Arial'
            });

            // Subtitle
            slide.addText(slideData.subtitle || '', {
              x: 0.8, y: 3.1, w: 8.4, h: 0.6,
              fontSize: 16, color: '94A3B8',
              fontFace: 'Arial'
            });

            // Separator Line
            slide.addShape(pptx.ShapeType.line, {
              line: { color: COLOR_PRIMARY, width: 2 },
              x: 0.8, y: 4.0, w: 4.0, h: 0
            });

            // Presenter metadata
            slide.addText(`Compañía: ${customCompany}\nPresentador: ${customPresenter} • Control de Compliance`, {
              x: 0.8, y: 4.3, w: 8.4, h: 0.8,
              fontSize: 11, color: COLOR_MUTED,
              fontFace: 'Arial', lineSpacing: 18
            });

          } else if (slideData.type === 'conclusion') {
            // Conclusion slide
            slide.addText(slideData.title, {
              x: 0.8, y: 1.3, w: 8.4, h: 0.8,
              fontSize: 28, bold: true, color: COLOR_WHITE,
              fontFace: 'Arial'
            });

            // Text block inside conclusion
            slide.addText(slideData.highlight || '', {
              x: 0.8, y: 2.3, w: 8.4, h: 2.2,
              fontSize: 14, color: 'E2E8F0',
              fontFace: 'Arial', lineSpacing: 24
            });

            // Decorative logo signature text at bottom right
            slide.addText(customCompany, {
              x: 7.0, y: 4.9, w: 2.5, h: 0.3,
              fontSize: 10, bold: true, color: COLOR_PRIMARY,
              align: 'right', fontFace: 'Arial'
            });
          }

        } else {
          // Light Slide Background
          slide.background = { fill: COLOR_LIGHT_BG };

          // Top Header Border Line (Emerald accent)
          slide.addShape(pptx.ShapeType.rect, { 
            fill: { color: COLOR_PRIMARY }, 
            x: 0, y: 0, w: 10, h: 0.12 
          });

          // Category header text
          slide.addText(slideData.category, {
            x: 0.8, y: 0.5, w: 8.4, h: 0.3,
            fontSize: 9, bold: true, color: COLOR_PRIMARY,
            fontFace: 'Arial'
          });

          // Main Title
          slide.addText(slideData.title, {
            x: 0.8, y: 0.8, w: 8.4, h: 0.5,
            fontSize: 22, bold: true, color: COLOR_SECONDARY,
            fontFace: 'Arial'
          });

          // Subtitle
          slide.addText(slideData.subtitle || '', {
            x: 0.8, y: 1.3, w: 8.4, h: 0.3,
            fontSize: 12, color: COLOR_MUTED,
            fontFace: 'Arial'
          });

          if (slideData.type === 'content') {
            // Grid point items
            let yOffset = 1.8;
            slideData.points.slice(0, 4).forEach((pt, index) => {
              const xPos = index % 2 === 0 ? 0.8 : 5.2;
              const yPos = index < 2 ? 1.8 : 3.4;

              // Card background shape
              slide.addShape(pptx.ShapeType.roundRect, {
                fill: { color: COLOR_WHITE },
                line: { color: 'E2E8F0', width: 1 },
                x: xPos, y: yPos, w: 4.0, h: 1.3,
                rectRadius: 0.08
              });

              // Mini color indicator block
              slide.addShape(pptx.ShapeType.rect, {
                fill: { color: index % 2 === 0 ? COLOR_PRIMARY : COLOR_ACCENT },
                x: xPos, y: yPos, w: 0.1, h: 1.3
              });

              // Point Title
              slide.addText(pt.title, {
                x: xPos + 0.2, y: yPos + 0.1, w: 3.6, h: 0.3,
                fontSize: 11, bold: true, color: COLOR_SECONDARY,
                fontFace: 'Arial'
              });

              // Point description
              slide.addText(pt.desc, {
                x: xPos + 0.2, y: yPos + 0.4, w: 3.6, h: 0.8,
                fontSize: 9, color: COLOR_MUTED,
                fontFace: 'Arial', lineSpacing: 13
              });
            });

            // Underline highlight block
            if (slideData.highlight) {
              slide.addShape(pptx.ShapeType.rect, {
                fill: { color: 'F1F5F9' },
                x: 0.8, y: 4.9, w: 8.4, h: 0.45
              });
              slide.addText(`💡 Enfoque Clave: ${slideData.highlight}`, {
                x: 0.9, y: 4.95, w: 8.2, h: 0.35,
                fontSize: 8.5, italic: true, color: '1E293B',
                fontFace: 'Arial'
              });
            }

          } else if (slideData.type === 'split') {
            // Split layout: 3 narrative items on the left, highlight box on the right
            let yOffset = 1.8;
            slideData.points.slice(0, 3).forEach((pt, index) => {
              const currentY = yOffset + (index * 1.0);
              
              // Bullet bullet dot
              slide.addShape(pptx.ShapeType.ellipse, {
                fill: { color: COLOR_PRIMARY },
                x: 0.8, y: currentY + 0.05, w: 0.1, h: 0.1
              });

              // Point title and desc together
              slide.addText(pt.title, {
                x: 1.0, y: currentY, w: 4.0, h: 0.25,
                fontSize: 11, bold: true, color: COLOR_SECONDARY,
                fontFace: 'Arial'
              });

              slide.addText(pt.desc, {
                x: 1.0, y: currentY + 0.25, w: 4.0, h: 0.6,
                fontSize: 9, color: COLOR_MUTED,
                fontFace: 'Arial', lineSpacing: 12
              });
            });

            // Right Highlight Box
            slide.addShape(pptx.ShapeType.roundRect, {
              fill: { color: 'ECFDF5' }, // light emerald
              line: { color: 'A7F3D0', width: 1.5 },
              x: 5.3, y: 1.8, w: 3.9, h: 2.8,
              rectRadius: 0.1
            });

            slide.addText("REVOLUCIÓN OPERATIVA", {
              x: 5.6, y: 2.1, w: 3.3, h: 0.3,
              fontSize: 10, bold: true, color: COLOR_PRIMARY,
              fontFace: 'Arial'
            });

            slide.addText(slideData.highlight || '', {
              x: 5.6, y: 2.5, w: 3.3, h: 1.8,
              fontSize: 11.5, color: '065F46',
              fontFace: 'Arial', lineSpacing: 18
            });
          }
        }

        // Add standard footer to all light slides
        if (slideData.bgTheme === 'light') {
          slide.addText(`Democratización del Dato • ${customCompany}`, {
            x: 0.8, y: 5.3, w: 5.0, h: 0.2,
            fontSize: 7.5, color: '94A3B8', fontFace: 'Arial'
          });
          slide.addText(`Slide ${slideData.id} de ${slides.length}`, {
            x: 8.0, y: 5.3, w: 1.2, h: 0.2,
            fontSize: 7.5, color: '94A3B8', align: 'right', fontFace: 'Arial'
          });
        }
      });

      pptx.writeFile({ fileName: `Presentacion_Democratizacion_Datos_${customCompany.replace(/\s+/g, '_')}.pptx` });
    } catch (err) {
      console.error("Error generating PowerPoint Presentation:", err);
      alert("Error al generar la presentación PPTX. Revise la consola.");
    } finally {
      setIsExporting(false);
    }
  };

  const activeSlide = slides[currentSlideIndex];

  return (
    <div className="bg-[#f8fafc] min-h-screen flex flex-col font-sans select-none" id="presentation-module-root">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-[#0a2f47] text-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/30">
            <Presentation className="text-emerald-400 animate-pulse" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              GENERADOR DE PRESENTACIONES CORPORATIVAS <span className="bg-emerald-500 text-slate-950 font-mono text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest">PPTX Corporativo</span>
            </h1>
            <p className="text-[10px] text-slate-300 uppercase font-bold tracking-wider mt-0.5">
              Democratización del Dato, Gobierno Operacional & Compliance • Sistema Centralizado
            </p>
          </div>
        </div>

        <button
          onClick={exportToPPTX}
          disabled={isExporting}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.3)] border border-emerald-500 transition-all cursor-pointer h-11"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generando PPTX...
            </>
          ) : (
            <>
              <Download size={14} />
              Descargar Presentación (.PPTX)
            </>
          )}
        </button>
      </div>

      {/* Editor Controls & Dynamic Slide Player Grid */}
      <div className="flex-1 p-6 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full overflow-y-auto">
        
        {/* Left Side: Presentation Editor Variables */}
        <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-5 shrink-0">
          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <Sparkles size={13} className="text-amber-500" /> Atributos de Portada
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Compañía / Razón Social</label>
                <input 
                  type="text" 
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner"
                  placeholder="ASSETFLOW SEGUROS"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Auditor / Presentador</label>
                <input 
                  type="text" 
                  value={customPresenter}
                  onChange={(e) => setCustomPresenter(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner"
                  placeholder="CRISTIAN MUÑOZ R."
                />
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-slate-150 my-1" />

          {/* Quick Stats of the Deck */}
          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <Info size={13} className="text-blue-500" /> Detalles de la Estructura
            </h2>
            <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-4 flex flex-col gap-3 text-slate-600">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold">Total de Diapositivas:</span>
                <span className="font-black text-slate-900">{slides.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold">Formato de Pantalla:</span>
                <span className="font-mono text-emerald-600 font-black">Widescreen 16:9</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold">Paleta Principal:</span>
                <span className="bg-emerald-50 text-emerald-700 font-black text-[9px] px-1.5 py-0.5 rounded-md border border-emerald-100">Emerald / Slate / Indigo</span>
              </div>
            </div>
          </div>

          <div className="mt-auto bg-blue-50/50 border border-blue-200/50 rounded-xl p-3 flex gap-2.5">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-800 font-bold leading-relaxed">
              La presentación argumenta formalmente la <strong className="font-black">democratización del acceso</strong> y la seguridad transaccional, perfecta para comités ejecutivos y auditorías contables.
            </p>
          </div>
        </div>

        {/* Right Side: High Fidelity Live Presentation Player */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* Active slide container representing slide canvas size exactly */}
          <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-[#0f172a] select-none transition-all duration-300">
            
            {/* Slide Body */}
            {activeSlide.bgTheme === 'dark' ? (
              // DARK SLIDE BODY
              <div className="absolute inset-0 bg-[#0f172a] text-white flex flex-col justify-between p-12 relative overflow-hidden">
                {/* Left vertical emerald brand block */}
                <div className="absolute left-0 top-0 bottom-0 w-3 bg-emerald-500" />
                
                {/* Header Category and Logo preview placeholder if any */}
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.25em]">{activeSlide.category}</span>
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="h-6 w-auto object-contain bg-white/5 px-1.5 py-0.5 rounded" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[10px] font-mono font-black text-slate-500 tracking-widest">{customCompany}</span>
                  )}
                </div>

                {activeSlide.type === 'cover' ? (
                  // Cover layouts
                  <div className="my-auto pl-4">
                    <span className="text-emerald-500 font-black text-xs tracking-widest uppercase block mb-2">Plataforma Cohesiva de Gestión</span>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-none max-w-2xl text-white">
                      {activeSlide.title}
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base font-bold mt-4 max-w-xl">
                      {activeSlide.subtitle}
                    </p>
                    <div className="w-24 h-0.5 bg-emerald-500 mt-6" />
                  </div>
                ) : (
                  // Conclusion / end Slide layouts
                  <div className="my-auto pl-4 max-w-2xl">
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-4">
                      {activeSlide.title}
                    </h2>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-bold">
                      {activeSlide.highlight}
                    </p>
                  </div>
                )}

                {/* Footer and Metadata */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-800/40 pt-3">
                  <div>
                    <span>Preparado por: <strong className="text-slate-300 uppercase font-black">{customPresenter}</strong></span>
                    <span className="mx-2">•</span>
                    <span>Planilla de Control Interno</span>
                  </div>
                  <span className="font-mono font-bold uppercase">DIAPOSITIVA {activeSlide.id} / {slides.length}</span>
                </div>
              </div>
            ) : (
              // LIGHT SLIDE BODY
              <div className="absolute inset-0 bg-slate-50 text-slate-800 flex flex-col justify-between p-10 relative overflow-hidden">
                {/* Top border emerald bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />
                
                {/* Header Category and Company name tracker */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{activeSlide.category}</span>
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="h-6 w-auto object-contain bg-slate-100 px-1 py-0.5 rounded border border-slate-200" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[9.5px] font-mono font-black text-slate-400 tracking-widest">{customCompany}</span>
                  )}
                </div>

                {/* Content Layouts */}
                <div className="my-auto flex flex-col gap-3">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 leading-none mb-1">
                      {activeSlide.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      {activeSlide.subtitle}
                    </p>
                  </div>

                  {activeSlide.type === 'content' ? (
                    // 4 Grid layout
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      {activeSlide.points.map((pt, idx) => (
                        <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex gap-2.5 relative overflow-hidden">
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${idx % 2 === 0 ? 'bg-emerald-600' : 'bg-indigo-600'}`} />
                          <div className="flex-1">
                            <h4 className="text-[11px] font-black uppercase text-slate-800 mb-0.5">{pt.title}</h4>
                            <p className="text-[9.5px] text-slate-500 leading-relaxed font-bold">{pt.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Split narrative layout
                    <div className="grid grid-cols-5 gap-4 mt-1 items-stretch">
                      <div className="col-span-3 flex flex-col gap-2.5 justify-center">
                        {activeSlide.points.map((pt, idx) => (
                          <div key={idx} className="flex gap-2.5 items-start">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                            <div>
                              <h4 className="text-[10.5px] font-black uppercase text-slate-800 leading-none mb-0.5">{pt.title}</h4>
                              <p className="text-[9.5px] text-slate-500 font-bold leading-normal">{pt.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="col-span-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col justify-center">
                        <span className="text-[8.5px] font-black uppercase text-emerald-700 tracking-widest block mb-1">Revolución Operativa</span>
                        <p className="text-[11.5px] text-emerald-800 font-black leading-relaxed">
                          "{activeSlide.highlight}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer and Page markers */}
                <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-200/60 pt-2 shrink-0">
                  <span>Democratización de Datos • Planilla Integral de Control Inmobiliario y Compliance</span>
                  <span className="font-mono font-bold uppercase text-slate-500">DIAPOSITIVA {activeSlide.id} DE {slides.length}</span>
                </div>

              </div>
            )}
          </div>

          {/* Presentation Player Navigation Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs select-none">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentSlideIndex === 0}
                className="w-9 h-9 border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Diapositiva Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNext}
                disabled={currentSlideIndex === slides.length - 1}
                className="w-9 h-9 border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Siguiente Diapositiva"
              >
                <ChevronRight size={16} />
              </button>
              <div className="text-xs font-bold text-slate-500 ml-2">
                Diapositiva <span className="font-black text-slate-800">{currentSlideIndex + 1}</span> de <span className="font-black text-slate-800">{slides.length}</span>
              </div>
            </div>

            {/* Slide Index dots marker list */}
            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentSlideIndex 
                      ? 'w-6 bg-emerald-600' 
                      : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  title={`Ir a Diapositiva ${idx + 1}`}
                />
              ))}
            </div>

            <div className="text-[10px] font-mono text-slate-400 uppercase font-black tracking-wider">
              Play Mode Activo
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
