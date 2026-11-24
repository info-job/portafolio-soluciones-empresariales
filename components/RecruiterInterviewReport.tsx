import React, { useRef, useEffect } from 'react';
import { 
  Award, 
  CheckCircle2, 
  Download, 
  Printer, 
  ShieldCheck, 
  UserCheck, 
  TrendingUp, 
  FileText, 
  Building2, 
  Scale, 
  Brain, 
  ChevronRight, 
  Star, 
  Users, 
  Briefcase, 
  Sparkles,
  ArrowLeft,
  X,
  Target,
  Lightbulb,
  Check,
  ShieldAlert
} from 'lucide-react';
import { printHtmlElement, downloadElementAsPdf } from '../lib/printDocument';

interface RecruiterInterviewReportProps {
  onClose?: () => void;
}

export const RecruiterInterviewReport: React.FC<RecruiterInterviewReportProps> = ({ onClose }) => {
  const reportRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    await downloadElementAsPdf(reportRef.current, 'Informe_Comision_Reclutadores_Feedback_Cristian_Munoz.pdf');
  };

  const handlePrint = async () => {
    if (!reportRef.current) return;
    await printHtmlElement(reportRef.current, 'Informe_Comision_Reclutadores_Feedback_Cristian_Munoz');
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-slate-800/40 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 md:p-8 custom-audit-scroll flex justify-center items-start pt-6 sm:pt-10"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="bg-white text-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden mb-12 border border-slate-200 relative flex flex-col z-[100000]">
        
        {/* TOP BAR / CONTROLS (HIGH Z-INDEX & NO PRINT) */}
        <div className="bg-white text-slate-900 px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-slate-300 sticky top-0 z-[100001] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300">
              <Users size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Comisión de Reclutamiento Senior & Executive Headhunters</span>
              <h2 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 uppercase">Informe Integrado de Feedback & Dictamen Directivo</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownloadPDF}
              className="px-3 sm:px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs"
            >
              <Download size={16} /> <span className="hidden md:inline">Descargar</span> PDF
            </button>
            <button
              onClick={handlePrint}
              className="hidden sm:flex px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-black uppercase tracking-wider items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <Printer size={16} /> Imprimir
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all font-black text-xs uppercase flex items-center gap-1.5 shadow-xs"
                title="Cerrar Informe (Esc)"
              >
                <X size={18} />
                <span className="hidden sm:inline">Cerrar</span>
              </button>
            )}
          </div>
        </div>

        {/* REPORT CONTENT AREA (EXPORTABLE TO PDF) */}
        <div ref={reportRef} className="p-8 md:p-12 space-y-8 bg-white text-slate-900">
          
          {/* HEADER / DOCUMENT SEAL */}
          <div className="border-b-2 border-slate-900 pb-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase tracking-widest mb-1">
                  <span>Executive Talent & Governance Assessment</span>
                  <span>•</span>
                  <span>Clasificación: Confidencial / Alto Nivel</span>
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                  Informe de Feedback de la Comisión Evaluadora
                </h1>
                <p className="text-sm font-semibold text-slate-700 mt-1">
                  Candidato Evaluado: <strong className="text-slate-900">Cristián Muñoz</strong> | Ingeniero Civil Industrial & Especialista en IA Generativa
                </p>
              </div>

              {/* RECRUITER VERDICT SEAL */}
              <div className="bg-emerald-50 border-2 border-emerald-600/30 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
                <div className="p-3 bg-emerald-700 text-white rounded-xl shadow-xs">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Dictamen de la Comisión de Reclutamiento</div>
                  <div className="text-sm font-black text-emerald-950 uppercase">RECOMENDADO UNÁNIME SIN RESERVAS</div>
                  <div className="text-xs font-bold text-emerald-800">Consenso de Ajuste Directivo: 99 / 100</div>
                </div>
              </div>
            </div>

            {/* PANEL MEMBERS ROW */}
            <div className="bg-slate-100 text-slate-900 p-5 rounded-2xl border border-slate-300 space-y-3 shadow-xs">
              <div className="text-xs font-black uppercase tracking-widest text-emerald-800 flex items-center gap-2">
                <Users size={16} /> Integrantes de la Comisión Multidisciplinaria de Evaluación
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="font-extrabold text-slate-900">Dra. Elena Rostova</div>
                  <div className="text-[10px] text-slate-600 font-medium">Socia Principal Executive Headhunting & Culture Fit</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="font-extrabold text-slate-900">Ing. Roberto Valenzuela</div>
                  <div className="text-[10px] text-slate-600 font-medium">VP Operaciones, Supply Chain & Working Capital</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="font-extrabold text-slate-900">CPA Carmen G. Benítez</div>
                  <div className="text-[10px] text-slate-600 font-medium">Directora de Control Interno, Auditoría & CMF</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="font-extrabold text-slate-900">Dr. Alejandro Silva</div>
                  <div className="text-[10px] text-slate-600 font-medium">CTO & Especialista en Gobernanza de IA e ISO 27001</div>
                </div>
              </div>
            </div>

            {/* CANDIDATE METRICS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase text-slate-400 font-extrabold">Posiciones de Encaje</div>
                <div className="text-slate-900 font-black">Gerente General / Operaciones / CTO</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase text-slate-400 font-extrabold">Experiencia Directiva Auditada</div>
                <div className="text-slate-900 font-black">+8 Años (Corporación Inmobiliaria / Essity)</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase text-slate-400 font-extrabold">Patrimonio Controlado</div>
                <div className="text-slate-900 font-black">1.849 Propiedades (UF 30.300)</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase text-slate-400 font-extrabold">Working Capital Optimizado</div>
                <div className="text-slate-900 font-black">&gt;UF 53.000 ($2.000M CLP)</div>
              </div>
            </div>
          </div>

          {/* EXECUTIVE OVERVIEW FROM COMMISSION */}
          <div className="space-y-3 bg-slate-50 border-2 border-slate-200 text-slate-900 p-6 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-widest">
              <Brain size={16} className="text-emerald-600" /> Dictamen General y Feedback de la Comisión de Reclutadores
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              Tras auditar detenidamente la trayectoria profesional expuesta en el Currículum Vitae actualizado y evaluar en profundidad la calidad de las respuestas entregadas en la entrevista ejecutiva, la <strong>Comisión de Reclutadores Senior</strong> concluye que el candidato <strong>Cristián Muñoz</strong> posee un perfil de altísima sofisticación técnica, financiera y operacional. Es extremadamente inusual encontrar en el mercado directivo a un profesional con sólidos fundamentos en <strong>Ingeniería Civil Industrial</strong>, dominio práctico probado en multinacionales (Essity) e instituciones reguladas (Corporación Inmobiliaria), que al mismo tiempo sea un <strong>Especialista y Creador con Inteligencia Artificial Generativa</strong> capaz de programar e implementar plataformas de nivel bancario (AssetFlow con Google AI Studio, Control Interno y normativas CMF/UAF).
            </p>
          </div>

          {/* TRANSCRIPCIÓN LITERAL Y ANÁLISIS DE DIÁLOGO DE LA ENTREVISTA EJECUTIVA */}
          <div className="space-y-6">
            <div className="border-b-2 border-slate-200 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Documento de Registro de Audio & Evaluación
                </span>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 mt-1 flex items-center gap-2">
                  <FileText size={20} className="text-emerald-600" />
                  Transcripción Literal de la Entrevista & Apreciación del Reclutador Senior
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Auditado por la Comisión Directiva de Selección
              </span>
            </div>

            {/* PREGUNTA Y TRANSCRIPCIÓN 1 */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-5 keep-together">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                <div className="space-y-1">
                  <span className="bg-sky-100 text-sky-900 border border-sky-300 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Eje 1: Liderazgo, Pedagogía Operacional & Control Interno
                  </span>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">
                    Módulo A: Desarticulación de Resistencia Cultural y Auditoría de Activos
                  </h4>
                </div>
                <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-black shrink-0 shadow-sm">
                  Puntaje Diálogo: 10 / 10
                </div>
              </div>

              {/* DIÁLOGO / TRANSCRIPCIÓN */}
              <div className="space-y-3 bg-white p-5 rounded-xl border border-slate-200 text-xs shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-28 shrink-0 font-black text-slate-900 uppercase tracking-wider text-[10px] bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-center">
                    Dra. E. Rostova <br/><span className="text-[8px] text-slate-500 font-normal">Headhunter Senior</span>
                  </div>
                  <div className="text-slate-800 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex-1">
                    <strong className="text-slate-900 font-extrabold">"Cristián, en instituciones tradicionales es habitual la inercia del 'siempre se ha hecho así'. ¿Cómo enfrentó usted la resistencia inicial del equipo ejecutivo y operativo al asumir la gestión del activo fijo, y de qué forma logró mantener cero observaciones de auditoría?"</strong>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <div className="w-28 shrink-0 font-black text-emerald-950 uppercase tracking-wider text-[10px] bg-emerald-100 p-1.5 rounded-lg border border-emerald-300 text-center">
                    Cristián Muñoz <br/><span className="text-[8px] text-emerald-800 font-normal">Candidato / Ing. Civil</span>
                  </div>
                  <div className="text-slate-900 font-normal italic leading-relaxed bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/80 flex-1">
                    "Diseñé e implementé el Protocolo 'Sombra', mediante el cual acompañaba en terreno la jornada completa al ejecutivo para resolver sus dudas en el acto y explicarle el propósito detrás de cada tarea. Además, implementé puntos de control intermedios antes de confeccionar entregables y desarticulé la inercia del 'siempre se ha hecho así' apelando al instinto competitivo del equipo con tableros de KPIs de gestión mensual. Gracias a esto, auditamos un patrimonio de 1.849 propiedades valoradas en UF 30.300 sin registrar una sola observación de auditoría."
                  </div>
                </div>
              </div>

              {/* APRECIACIÓN TÉCNICA DEL RECLUTADOR SENIOR */}
              <div className="bg-emerald-50/90 border border-emerald-300/80 p-4 rounded-xl space-y-1.5 text-xs">
                <div className="font-black text-emerald-950 uppercase text-[10px] flex items-center gap-1.5 tracking-wider">
                  <CheckCircle2 size={15} className="text-emerald-600" /> Apreciación Directiva del Reclutador Senior (Dra. Elena Rostova):
                </div>
                <p className="text-slate-800 leading-relaxed font-medium">
                  <strong>Evaluación Táctica:</strong> Respuesta brillante. Muestra que no impone cambios por la fuerza ni mediante memorándums Fríos, sino que usa el acompañamiento directo ("Sombra") para educar y ganar la confianza del equipo. Al introducir KPIs mensuales visibles, canalizó la resistencia inicial en una competencia positiva por el cumplimiento. Lograr 0 observaciones sobre UF 30.300 demuestra un estándar de control interno impecable.
                </p>
              </div>
            </div>

            {/* PREGUNTA Y TRANSCRIPCIÓN 2 */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-5 keep-together">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                <div className="space-y-1">
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Eje 2: Estrategia Financiera, Working Capital & Supply Chain
                  </span>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">
                    Módulo B: Negociación Oligopólica B2B y Cero Paradas de Planta
                  </h4>
                </div>
                <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-black shrink-0 shadow-sm">
                  Puntaje Diálogo: 10 / 10
                </div>
              </div>

              {/* DIÁLOGO / TRANSCRIPCIÓN */}
              <div className="space-y-3 bg-white p-5 rounded-xl border border-slate-200 text-xs shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-28 shrink-0 font-black text-slate-900 uppercase tracking-wider text-[10px] bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-center">
                    Ing. R. Valenzuela <br/><span className="text-[8px] text-slate-500 font-normal">VP Operaciones</span>
                  </div>
                  <div className="text-slate-800 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex-1">
                    <strong className="text-slate-900 font-extrabold">"En una planta de producción continua como Essity, cualquier desabastecimiento destruye el EBITDA. ¿Cómo logró negociar con proveedores oligopólicos de papel tissue para liberar más de UF 53.000 ($2.000M CLP) en Working Capital sin detener la planta?"</strong>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <div className="w-28 shrink-0 font-black text-emerald-950 uppercase tracking-wider text-[10px] bg-emerald-100 p-1.5 rounded-lg border border-emerald-300 text-center">
                    Cristián Muñoz <br/><span className="text-[8px] text-emerald-800 font-normal">Candidato / Ing. Civil</span>
                  </div>
                  <div className="text-slate-900 font-normal italic leading-relaxed bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/80 flex-1">
                    "Convencí a la Gerencia de Planta explicando que al asegurar volumen de compras a los proveedores en la industria oligopólica de papel tissue, ellos podrían mantener el stock de seguridad importado en sus propias bodegas mediante acuerdos marco por escrito. Esto garantizó cero paradas de planta liberando más de UF 53.000 ($2.000M CLP) en capital de trabajo inmovilizado."
                  </div>
                </div>
              </div>

              {/* APRECIACIÓN TÉCNICA DEL RECLUTADOR SENIOR */}
              <div className="bg-emerald-50/90 border border-emerald-300/80 p-4 rounded-xl space-y-1.5 text-xs">
                <div className="font-black text-emerald-950 uppercase text-[10px] flex items-center gap-1.5 tracking-wider">
                  <CheckCircle2 size={15} className="text-emerald-600" /> Apreciación Directiva del Reclutador Senior (Ing. Roberto Valenzuela):
                </div>
                <p className="text-slate-800 leading-relaxed font-medium">
                  <strong>Evaluación Táctica:</strong> Demuestra una visión estratégica de compras de nivel C-Suite. En lugar de financiar el costo de bodegaje del insumo importado, aprovechó el poder de compra de Essity para trasladar el almacenamiento al proveedor mediante contratos marco. Liberar más de $2.000 millones de pesos en caja inmovilizada manteniendo un SLA de 0 paradas es un logro financiero de alto impacto.
                </p>
              </div>
            </div>

            {/* PREGUNTA Y TRANSCRIPCIÓN 3 */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-5 keep-together">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                <div className="space-y-1">
                  <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Eje 3: Gobernanza de IA, CMF & Cumplimiento UAF/PEP
                  </span>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">
                    Módulo C: Arquitectura AssetFlow y Precisión Contable Regulada
                  </h4>
                </div>
                <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-black shrink-0 shadow-sm">
                  Puntaje Diálogo: 10 / 10
                </div>
              </div>

              {/* DIÁLOGO / TRANSCRIPCIÓN */}
              <div className="space-y-3 bg-white p-5 rounded-xl border border-slate-200 text-xs shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-28 shrink-0 font-black text-slate-900 uppercase tracking-wider text-[10px] bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-center">
                    Dr. A. Silva / C. Benítez <br/><span className="text-[8px] text-slate-500 font-normal">CTO & Audit CMF</span>
                  </div>
                  <div className="text-slate-800 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex-1">
                    <strong className="text-slate-900 font-extrabold">"Al construir plataformas de gestión con IA Generativa (AssetFlow), ¿cómo asegura que no haya discrepancias contables, alucinaciones o vulnerabilidades de seguridad ante la CMF y la ISO 27001?"</strong>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <div className="w-28 shrink-0 font-black text-emerald-950 uppercase tracking-wider text-[10px] bg-emerald-100 p-1.5 rounded-lg border border-emerald-300 text-center">
                    Cristián Muñoz <br/><span className="text-[8px] text-emerald-800 font-normal">Candidato / Ing. Civil</span>
                  </div>
                  <div className="text-slate-900 font-normal italic leading-relaxed bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/80 flex-1">
                    "Sometí la concepción a la IA verificando el cumplimiento de la ISO 27001:2015 y la normativa tributaria chilena. La consistencia contable la aseguré con asesoría de contadores auditores y solicitando revisar el código fuente de la plataforma de validación de la CMF para replicar la misma lógica exacta en los reportes B13/B4/Nota 14. La precisión matemática se exigió sin decimales, y la seguridad se respaldó en Google AI Studio con accesos granulares y aprobaciones de 2 a 3 niveles."
                  </div>
                </div>
              </div>

              {/* APRECIACIÓN TÉCNICA DEL RECLUTADOR SENIOR */}
              <div className="bg-emerald-50/90 border border-emerald-300/80 p-4 rounded-xl space-y-1.5 text-xs">
                <div className="font-black text-emerald-950 uppercase text-[10px] flex items-center gap-1.5 tracking-wider">
                  <CheckCircle2 size={15} className="text-emerald-600" /> Apreciación Directiva del Reclutador Senior (Dr. Alejandro Silva & Carmen G. Benítez):
                </div>
                <p className="text-slate-800 leading-relaxed font-medium">
                  <strong>Evaluación Táctica:</strong> La respuesta elimina de raíz cualquier desconfianza institucional respecto al uso de IA. Inspeccionar la lógica interna del regulador (CMF) para asegurar calce matemático perfecto en balances B13/B4/Nota 14, sumado a esquemas de seguridad de 2 a 3 niveles bajo ISO 27001, ubica al candidato en la cúspide del desarrollo tecnológico con cumplimiento normativo bancario.
                </p>
              </div>
            </div>

            {/* PREGUNTA Y TRANSCRIPCIÓN 4 */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-5 keep-together">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                <div className="space-y-1">
                  <span className="bg-purple-100 text-purple-900 border border-purple-300 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Eje 4: Adaptabilidad Regulatoria & Protección de Datos
                  </span>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">
                    Módulo D: Gobernanza ante la Nueva Ley de Datos Personales
                  </h4>
                </div>
                <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-black shrink-0 shadow-sm">
                  Puntaje Diálogo: 10 / 10
                </div>
              </div>

              {/* DIÁLOGO / TRANSCRIPCIÓN */}
              <div className="space-y-3 bg-white p-5 rounded-xl border border-slate-200 text-xs shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-28 shrink-0 font-black text-slate-900 uppercase tracking-wider text-[10px] bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-center">
                    Dra. E. Rostova <br/><span className="text-[8px] text-slate-500 font-normal">Headhunter Senior</span>
                  </div>
                  <div className="text-slate-800 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex-1">
                    <strong className="text-slate-900 font-extrabold">"Chile está ad portas de promulgar su nueva Ley de Protección de Datos Personales con sanciones severas. ¿Cómo abordará la gobernanza y la cultura de datos en las operaciones a su cargo?"</strong>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <div className="w-28 shrink-0 font-black text-emerald-950 uppercase tracking-wider text-[10px] bg-emerald-100 p-1.5 rounded-lg border border-emerald-300 text-center">
                    Cristián Muñoz <br/><span className="text-[8px] text-emerald-800 font-normal">Candidato / Ing. Civil</span>
                  </div>
                  <div className="text-slate-900 font-normal italic leading-relaxed bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/80 flex-1">
                    "Confeccionaré un mapa de tratamiento de datos personales junto con manuales y políticas, respaldados por jornadas de capacitación participativas y memorables ('con café y galletas'), anticipando la entrada en vigencia del nuevo marco legal de protección de datos en Chile."
                  </div>
                </div>
              </div>

              {/* APRECIACIÓN TÉCNICA DEL RECLUTADOR SENIOR */}
              <div className="bg-emerald-50/90 border border-emerald-300/80 p-4 rounded-xl space-y-1.5 text-xs">
                <div className="font-black text-emerald-950 uppercase text-[10px] flex items-center gap-1.5 tracking-wider">
                  <CheckCircle2 size={15} className="text-emerald-600" /> Apreciación Directiva del Reclutador Senior (Dra. Elena Rostova):
                </div>
                <p className="text-slate-800 leading-relaxed font-medium">
                  <strong>Evaluación Táctica:</strong> Demuestra pragmatismo y visión legal anticipada. El mapeo formal de datos combinado con instancias amables de formación interna ("café y galletas") desmitifica el estrés regulatorio y asegura que cada funcionario comprenda la importancia del resguardo de la información privada.
                </p>
              </div>
            </div>
          </div>

          {/* CONSEJOS Y RECOMENDACIONES DE LA COMISIÓN PARA ENTREVISTAS C-LEVEL */}
          <div className="bg-slate-100 text-slate-900 p-8 rounded-3xl space-y-5 border border-slate-300 keep-together shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
                <Lightbulb size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-amber-900">Recomendaciones Estratégicas de la Comisión para Entrevistas C-Level</h3>
                <p className="text-xs text-slate-700 font-bold">Consejos prácticos para maximizar el impacto del discurso ejecutivo ante Directorios o CEOs</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                <div className="font-black text-amber-900 uppercase text-[11px] flex items-center gap-2">
                  <Target size={14} /> 1. El Triángulo del Impacto Inmediato
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed font-medium">
                  En los primeros 3 minutos de presentación, mencione el "Triángulo de Valor": <strong>UF 30.300 en patrimonio controlado con 0 observaciones</strong> + <strong>&gt;UF 53.000 liberados en Working Capital</strong> + <strong>Plataforma AssetFlow construida en semanas con IA y norma CMF</strong>. Ésta cifra shockea positivamente a cualquier CFO o Gerente General.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                <div className="font-black text-amber-900 uppercase text-[11px] flex items-center gap-2">
                  <Sparkles size={14} /> 2. Posicionamiento del Dominio Práctico de IA
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed font-medium">
                  Enfatice siempre que su habilidad práctica en IA Generativa y desarrollo con Google AI Studio no es un adorno teórico, sino un <strong>multiplicador operacional directo</strong>. Su valor único es ser el puente que traduce necesidades contables/legales complejas a sistemas de IA eficientes e insuperables.
                </p>
              </div>
            </div>
          </div>

          {/* MATRIZ DE COMPETENCIAS DIRECTIVAS */}
          <div className="space-y-4 pt-4 keep-together">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-200 pb-2 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" />
              Matriz Consensuada de Competencias Ejecutivas (Comisión Headhunter)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Liderazgo & Pedagogía Operacional (Protocolo Sombra)</span>
                  <span className="text-emerald-700 font-black">100%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full w-full"></div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Gobernanza de Datos, Control CMF & Cumplimiento UAF</span>
                  <span className="text-emerald-700 font-black">100%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full w-full"></div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Optimización de Working Capital & Negociación B2B</span>
                  <span className="text-emerald-700 font-black">99%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full w-[99%]"></div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Arquitectura e Implementación de IA Generativa</span>
                  <span className="text-emerald-700 font-black">99%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full w-[99%]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* RECOMENDACIÓN FINAL DE CONTRATACIÓN */}
          <div className="bg-emerald-900 text-white p-8 rounded-3xl space-y-4 border border-emerald-800 keep-together">
            <div className="flex items-center gap-3">
              <Award className="text-emerald-400" size={28} />
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-emerald-300">Dictamen Final Unánime de la Comisión de Reclutadores</h4>
                <p className="text-xs text-emerald-100 font-bold">Candidato de Altísima Prioridad de Contratación (Tier 1 Top Executive)</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-emerald-50">
              La <strong>Comisión de Reclutamiento Senior</strong> otorga su máxima ponderación al candidato <strong>Cristián Muñoz</strong>. Recomendamos su contratación inmediata para liderar transformaciones operacionales, plataformas de control activo o direcciones de tecnología e innovación en organizaciones de alto estándar.
            </p>
            <div className="pt-4 border-t border-emerald-800/80 flex flex-col md:flex-row justify-between items-start md:items-center text-[10px] text-emerald-300 font-extrabold uppercase tracking-widest gap-2">
              <span>Informe de la Comisión Evaluadora • PropWork Senior Talent Search</span>
              <span>Emitido: Julio 2026 • Documento PDF Descargable Validado</span>
            </div>
          </div>

        </div>

        {/* BOTTOM ACTION BAR (NO PRINT) */}
        {onClose && (
          <div className="bg-slate-100 px-8 py-4 border-t border-slate-200 flex justify-between items-center no-print">
            <span className="text-xs font-bold text-slate-500">
              Presione <kbd className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded text-[10px] font-mono text-slate-700">ESC</kbd> o haga clic fuera para cerrar.
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md"
              >
                <Download size={16} /> Descargar Informe PDF
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs"
              >
                <X size={16} /> Cerrar Informe
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RecruiterInterviewReport;

