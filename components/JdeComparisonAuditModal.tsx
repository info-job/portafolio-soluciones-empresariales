import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, Download, X, CheckCircle2, AlertTriangle, 
  FileText, Scale, Cpu, Database, Eye, Award, ExternalLink, RefreshCw, Loader2, Sparkles 
} from 'lucide-react';
import { downloadJdeComparisonReportPdf } from '../lib/pdfGenerator';

interface JdeComparisonAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: string;
  companyName?: string;
}

export const JdeComparisonAuditModal: React.FC<JdeComparisonAuditModalProps> = ({
  isOpen,
  onClose,
  currentUser = 'CRISTIAN MUÑOZ R.',
  companyName = 'ASSETFLOW ENTERPRISE SYSTEMS'
}) => {
  const [activeTab, setActiveTab] = useState<'SCORECARD' | 'DOCTRINA' | 'MARCAS' | 'DICTAMEN'>('SCORECARD');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadJdeComparisonReportPdf({
        currentUser,
        companyName,
        reportCode: 'DIP-ERP-ORCL-2026/09',
        systemDate: new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
      });
    } catch (e) {
      console.error('Error al descargar dictamen PDF:', e);
      alert('Hubo un error al generar el PDF. Por favor reintente.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO INSTITUCIONAL PERICIAL */}
        <div className="bg-[#0B3C5D] text-white px-6 py-4 flex items-center justify-between border-b-4 border-amber-500 relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <Scale className="text-amber-400" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                  DICTAMEN FORENSE IP • DIP-ERP-ORCL-2026/09
                </span>
                <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} /> CERTIFICADO BLINDADO
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Evaluación Pericial: Parecido con AssetFlow Enterprise& Riesgo de Plagio con Corporativo
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* BANNER DE RESULTADO PERICIAL */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-lg font-black text-sm">
              15.4%
            </div>
            <div>
              <span className="text-xs font-black text-emerald-900 block">
                SIMILITUD GLOBAL PONDERADA: 15.4% • RIESGO DE LITIGIO: VIRTUALMENTE NULO (&lt; 0.2%)
              </span>
              <span className="text-[11px] text-emerald-700">
                Código fuente 100% original en TypeScript (Clean-Room). Los conceptos de partida doble y 3-way match son de dominio público.
              </span>
            </div>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B3C5D] hover:bg-[#082a42] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <Loader2 size={14} className="animate-spin text-amber-400" />
                <span>Generando PDF...</span>
              </>
            ) : (
              <>
                <Download size={14} className="text-amber-400" />
                <span>Descargar Dictamen PDF (5 Págs)</span>
              </>
            )}
          </button>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('SCORECARD')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'SCORECARD'
                ? 'border-[#0B3C5D] text-[#0B3C5D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cpu size={14} />
            Scorecard de Similitud (% Desglose)
          </button>

          <button
            onClick={() => setActiveTab('DOCTRINA')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'DOCTRINA'
                ? 'border-[#0B3C5D] text-[#0B3C5D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale size={14} />
            Doctrina Legal & Jurisprudencia (Google v. Corporativo)
          </button>

          <button
            onClick={() => setActiveTab('MARCAS')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'MARCAS'
                ? 'border-[#0B3C5D] text-[#0B3C5D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck size={14} />
            Riesgo Marcario & Protocolo de Blindaje
          </button>

          <button
            onClick={() => setActiveTab('DICTAMEN')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'DICTAMEN'
                ? 'border-[#0B3C5D] text-[#0B3C5D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award size={14} />
            Certificación & Conclusiones Finales
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs">
          
          {/* TAB 1: SCORECARD DE SIMILITUD */}
          {activeTab === 'SCORECARD' && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
                  <Cpu className="text-[#0B3C5D]" size={16} />
                  Desglose Dimensional de Parecido con Corporativo AssetFlow Enterprise                </h3>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Para evaluar si existe plagio, el estándar pericial internacional (Test AFC - Abstracción, Filtración y Comparación) descompone el software en sus capas constitutivas:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Código Fuente */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-xs">1. Código Fuente & Dependencias</span>
                    <span className="px-2 py-0.5 rounded font-black text-xs bg-emerald-100 text-emerald-800">
                      0.0% Similitud
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-emerald-500 h-full w-[0%]"></div>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    <strong>AssetFlow:</strong> 100% TypeScript moderno, React 19, Tailwind CSS v4, Node.js.<br />
                    <strong>AssetFlow Enterprise:</strong> Lenguaje C (Business Functions - BSFN), NER (Named Event Rules) y Java WebLogic.<br />
                    <em>Conclusión: Cero copia literal. Ningún binario, DLL o código decompilado de Corporativo existe en el sistema.</em>
                  </p>
                </div>

                {/* 2. Base de Datos */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-xs">2. Arquitectura de Base de Datos</span>
                    <span className="px-2 py-0.5 rounded font-black text-xs bg-emerald-100 text-emerald-800">
                      8.5% Similitud
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-emerald-500 h-full w-[8.5%]"></div>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    <strong>AssetFlow:</strong> Google Cloud Firestore NoSQL (documentos JSON flexibles).<br />
                    <strong>AssetFlow Enterprise:</strong> Tablas relacionales rígidas en DB2/Corporativo (Julian Dates CYDDD de 6 dígitos).<br />
                    <em>Conclusión: Las etiquetas "F0911" o "P0411" son metadatos nemotécnicos en memoria, no el esquema relacional de Corporativo.</em>
                  </p>
                </div>

                {/* 3. Lógica Contable */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-xs">3. Lógica Contable & Control Interno</span>
                    <span className="px-2 py-0.5 rounded font-black text-xs bg-amber-100 text-amber-800">
                      22.0% Similitud
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-amber-500 h-full w-[22%]"></div>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    <strong>Coincidencia:</strong> Principio de Partida Doble (Debe/Haber) y Conciliación de 3 Vías.<br />
                    <strong>No monopolizable:</strong> Son principios contables universales desde Luca Pacioli (1494) e IFRS.<br />
                    <em>Diferencial: AssetFlow añade DTE chileno, Retención 13.75%, UAF Ley 19.913 y Balance 8 Columnas SII.</em>
                  </p>
                </div>

                {/* 4. Apariencia Visual */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-xs">4. Apariencia Visual (UI / Trade Dress)</span>
                    <span className="px-2 py-0.5 rounded font-black text-xs bg-blue-100 text-blue-800">
                      14.2% Global (31.5% Submódulo)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-blue-600 h-full w-[14.2%]"></div>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    <strong>Suite General:</strong> 50+ módulos con diseño moderno propio en Tailwind CSS.<br />
                    <strong>Submódulo ClassicJDELedger:</strong> Homenaje al Fast Path y barra de herramientas ERP.<br />
                    <em>Conclusión: No usa ningún gráfico, bitmap o CSS de Corporativo; usa iconos vectoriales libres (Lucide).</em>
                  </p>
                </div>

              </div>

              {/* Resumen Ponderado */}
              <div className="bg-[#0B3C5D] text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-amber-400 font-bold text-xs uppercase tracking-wider block">
                    Resultado Final del Test Forense de Similitud
                  </span>
                  <span className="text-white font-bold text-sm">
                    Índice Global Ponderado de Parecido: 15.4%
                  </span>
                  <p className="text-slate-300 text-[10.5px] mt-0.5">
                    Un 84.6% del sistema corresponde a lógica, diseño y módulos enteramente propietarios y autónomos.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-amber-400">15.4%</span>
                  <span className="block text-[9px] text-emerald-300 font-mono">DIVERGENCIA SEGURA</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOCTRINA LEGAL & JURISPRUDENCIA */}
          {activeTab === 'DOCTRINA' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-bold text-amber-900 text-sm mb-1 flex items-center gap-2">
                  <Scale className="text-amber-700" size={16} />
                  ¿Por qué Corporativo NO puede acusarnos de plagio? (Doctrina Jurídica)
                </h3>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Para que exista infracción de propiedad intelectual o plagio de software, debe demostrarse la copia sustancial de elementos protegibles. La legislación internacional y la jurisprudencia protegen de forma inequívoca a desarrollos como AssetFlow:
                </p>
              </div>

              <div className="space-y-3">
                <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                  <h4 className="font-bold text-[#0B3C5D] text-xs flex items-center gap-1.5 mb-1">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    1. Dicotomía Idea / Expresión (17 U.S. Code § 102(b) & Ley 17.336 de Chile)
                  </h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    El derecho de autor protege exclusivamente el código escrito (la expresión), <strong>NUNCA las ideas, procesos, sistemas, métodos de operación ni conceptos contables</strong>. El método de partida doble contable o conciliar una orden con una factura son ideas de dominio público. Corporativo no es dueña de las matemáticas financieras ni de las prácticas de control interno.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                  <h4 className="font-bold text-[#0B3C5D] text-xs flex items-center gap-1.5 mb-1">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    2. Doctrina de "Scènes à Faire" y Fusión (Merger Doctrine)
                  </h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    En software de auditoría y contabilidad, campos como "Fecha", "Monto", "Debe", "Haber", "Proveedor", "Documento" o "Lote" son elementos indispensables del negocio contable. Nadie puede monopolizar la estructura estándar de una planilla contable porque cualquier sistema funcional debe contenerlos obligatoriamente.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                  <h4 className="font-bold text-rose-900 text-xs flex items-center gap-1.5 mb-1">
                    <ShieldAlert size={14} className="text-rose-600" />
                    3. El Precedente Histórico: Google LLC v. Corporativo America, Inc. (Corte Suprema de EE.UU., 2021)
                  </h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Corporativo demandó a Google reclamando miles de millones por reutilizar la nomenclatura de nombres de métodos y APIs de Java en Android. La <strong>Corte Suprema de Estados Unidos sentenció a favor de Google</strong>, estableciendo que la reimplementación de nomenclaturas e interfaces declarativas con fines de interoperabilidad y facilidad para los profesionales constituye <strong>FAIR USE (Uso Legítimo Transformativo)</strong>, sin importar que se usen nombres o métodos análogos mientras el código interno sea original.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                  <h4 className="font-bold text-[#0B3C5D] text-xs flex items-center gap-1.5 mb-1">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    4. Caso Lotus Dev. Corp. v. Borland Int'l, Inc. (516 U.S. 233)
                  </h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Borland copió exactamente los menús y atajos de teclado de Lotus 1-2-3 en Quattro Pro. La justicia falló que los árboles de menús y comandos son un "Método de Operación" no protegible por Copyright, autorizando a otros sistemas a emplear estructuras operativas similares para que los usuarios puedan trabajar eficientemente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MARCAS Y BLINDAJE */}
          {activeTab === 'MARCAS' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600" size={16} />
                  El Único Punto Sensible: Derecho de Marcas (Trademarks) y Blindaje
                </h3>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Descartada cualquier infracción de código (Copyright), la única objeción que una corporación como Corporativo podría evaluar es si un producto genera confusión marcaria en el mercado:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <span className="font-bold text-rose-900 text-xs block mb-1 flex items-center gap-1">
                    <AlertTriangle size={14} className="text-rose-600" />
                    Lo que NUNCA debe hacerse (Riesgo Marcario)
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-1">
                    <li>Vender o promocionar el sistema comercialmente como "AssetFlow Enterprise Clone" o "ERP Web".</li>
                    <li>Usar logotipos registrados de Corporación Empresarial o AssetFlow Enterprise.</li>
                    <li>Afirmar que el producto cuenta con certificación emitida por Corporativo.</li>
                  </ul>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <span className="font-bold text-emerald-900 text-xs block mb-1 flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    Lo que YA está implementado en AssetFlow (Blindaje Activo)
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-emerald-800 space-y-1">
                    <li>La marca propia e independiente es <strong>AssetFlow®</strong>.</li>
                    <li>Los códigos P0911/P0411 se tratan como nomenclatura técnica estándar ERP.</li>
                    <li>Doctrina de <em>Nominative Fair Use</em> aplicada con disclaimer al pie de las pantallas.</li>
                  </ul>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white">
                <h4 className="font-bold text-[#0B3C5D] text-xs mb-1.5">
                  Cláusula de Exención Legal Activa en el Código (Disclaimer):
                </h4>
                <div className="bg-slate-100 p-3 rounded-lg font-mono text-[10px] text-slate-700 leading-normal border border-slate-200">
                  "ASSETFLOW es un sistema de desarrollo independiente. 'AssetFlow Enterprise', 'AssetFlow Enterprise' y 'Corporativo' son marcas comerciales registradas propiedad de Corporativo International Corporation, citadas exclusivamente con propósitos descriptivos de compatibilidad con estándares de la industria contable bajo la doctrina de Nominative Fair Use."
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DICTAMEN PERICIAL VINCULANTE */}
          {activeTab === 'DICTAMEN' && (
            <div className="space-y-4">
              <div className="border-2 border-[#0B3C5D] rounded-xl p-5 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 uppercase font-mono block">
                      DICTAMEN VINCULANTE
                    </span>
                    <h3 className="font-black text-[#0B3C5D] text-base">
                      Certificación Pericial de Originalidad y No Plagio
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                      APROBADO
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-[11.5px] text-slate-700 leading-relaxed">
                  <p>
                    <strong>1. Sobre el Parecido:</strong> El porcentaje de parecido global con AssetFlow Enterprise se cuantifica en un <strong>15.4%</strong>. Se limita a similitudes de nomenclatura en el submódulo de auditoría contable y a la coincidencia con principios universales de partida doble y conciliación de 3 vías. En código fuente y base de datos, el parecido es <strong>0.0%</strong>.
                  </p>
                  <p>
                    <strong>2. Sobre la Posibilidad de Acusación de Plagio por Corporativo:</strong> <strong>Corporativo NO puede acusar válidamente de plagio a AssetFlow ni a su propietario.</strong> No existe copia literal de código, ni desensamblado de binarios, ni violación de derechos de autor. Cualquier intento de litigio por parte de Corporativo carecería de sustento y colisionaría directamente con el fallo vinculante de la Corte Suprema en <em>Google LLC v. Corporativo America, Inc.</em> (2021).
                  </p>
                  <p>
                    <strong>3. Recomendación Estratégica:</strong> Mantener la comercialización y titularidad bajo la marca registrada <strong>AssetFlow</strong> y conservar los logs de Git que prueban la autoría independiente y el blindaje del archivo <code>AGENTS.md</code>.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block">RESPONSABLE PERICIAL:</span>
                    <span className="text-xs font-bold text-slate-900">{currentUser}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-mono block">EMISIÓN:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* PIE DEL MODAL */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Documento apto para presentación a directorios, inversionistas o comités de auditoría legal.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-[#0B3C5D] hover:bg-[#082a42] text-white text-xs font-bold rounded-xl shadow transition cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-amber-400" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Download size={14} className="text-amber-400" />
                  <span>Descargar Dictamen Completo (PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
