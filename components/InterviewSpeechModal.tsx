import React, { useRef, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  X, 
  CheckCircle2, 
  Sparkles, 
  Target, 
  Brain, 
  Award, 
  Briefcase, 
  ShieldCheck, 
  TrendingUp, 
  Lightbulb, 
  MessageSquare, 
  UserCheck, 
  Building2, 
  HelpCircle, 
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { printHtmlElement, downloadElementAsPdf } from '../lib/printDocument';

interface InterviewSpeechModalProps {
  onClose: () => void;
  candidateName?: string;
}

export const InterviewSpeechModal: React.FC<InterviewSpeechModalProps> = ({ 
  onClose, 
  candidateName = 'CRISTIAN ANDRÉS MUÑOZ ROJAS' 
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    await downloadElementAsPdf(contentRef.current, 'Pauta_y_Discurso_Entrevista_Laboral_Cristian_Munoz.pdf');
  };

  const handlePrint = async () => {
    if (!contentRef.current) return;
    await printHtmlElement(contentRef.current, 'Pauta_y_Discurso_Entrevista_Laboral_Cristian_Munoz');
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-slate-800/40 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 md:p-8 custom-audit-scroll flex justify-center items-start pt-4 sm:pt-8 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto text-slate-900 animate-in zoom-in-95 duration-200">
        
        {/* Top Control Bar */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded font-mono">
                  Documento Descargable PDF
                </span>
                <span className="text-slate-600 text-xs font-mono font-bold">Código: SGC-PAU-2026</span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                Pauta Estratégica &amp; Discurso para Entrevista Laboral Real
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all border border-slate-300 cursor-pointer active:scale-95"
              title="Imprimir o guardar como PDF"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable / Viewable Report Body */}
        <div className="p-6 sm:p-10 bg-slate-100 text-slate-900 overflow-x-hidden">
          <div ref={contentRef} className="space-y-8 bg-white text-slate-900 p-8 sm:p-12 rounded-xl border border-slate-200 shadow-xl">
            
            {/* Header ISO 9001 Style Document Banner */}
            <div className="border-2 border-slate-900 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 bg-slate-50 border-b-2 border-slate-900 text-xs font-mono font-bold">
                <div className="col-span-3 p-3 border-r-2 border-slate-900 flex flex-col justify-center items-center text-center bg-slate-100">
                  <span className="text-base font-black text-slate-900 tracking-tight">CRISTIAN MUÑOZ</span>
                  <span className="text-[9px] text-slate-600 font-sans uppercase">Ingeniero Civil Industrial</span>
                </div>
                <div className="col-span-6 p-3 border-r-2 border-slate-900 text-center flex flex-col justify-center items-center">
                  <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-widest">GUÍA DE ALTO PERFORMANCE - ALTA DIRECCIÓN</span>
                  <span className="text-sm font-black text-slate-900 uppercase tracking-tight">PAUTA Y DISCURSO ESTRATÉGICO PARA ENTREVISTA LABORAL</span>
                  <span className="text-[9px] text-slate-500 font-sans italic">Preparación Integral para Cargos de Jefatura / Subgerencia de Control Interno, PMO &amp; Operaciones</span>
                </div>
                <div className="col-span-3 p-3 flex flex-col justify-center text-[10px] space-y-0.5 bg-slate-100">
                  <div><strong>CÓDIGO:</strong> PAU-ENT-2026</div>
                  <div><strong>FECHA:</strong> Julio 2026</div>
                  <div><strong>EDICIÓN:</strong> Versión Final 3.0</div>
                  <div><strong>CONFIDENCIAL:</strong> Sí (Uso Personal)</div>
                </div>
              </div>
            </div>

            {/* Ficha Candidato / Resumen de Poder */}
            <div className="bg-slate-50 text-slate-900 border border-slate-200 p-6 rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {candidateName}
                  </h1>
                  <p className="text-xs text-emerald-700 font-bold">
                    Ingeniero Civil Industrial | Líder de Control Interno, Transformación Digital &amp; Working Capital
                  </p>
                </div>
                <div className="text-right font-mono text-xs text-slate-600 font-bold">
                  <div>📞 +56 9 6143 6853</div>
                  <div>✉️ cristian.munoz0223@gmail.com</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                  <span className="text-emerald-700 font-bold block text-[10px] uppercase tracking-wider">Pilar 1: Control &amp; Auditoría</span>
                  <span className="text-slate-700 font-medium">0 Observaciones de Auditoría CMF en 1.849 propiedades (UF 30.300 / $1.146M CLP).</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                  <span className="text-emerald-700 font-bold block text-[10px] uppercase tracking-wider">Pilar 2: Optimización Financiera</span>
                  <span className="text-slate-700 font-medium">Liberación de +$2.000M CLP en Working Capital en Essity Chile sin afectar la planta.</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                  <span className="text-emerald-700 font-bold block text-[10px] uppercase tracking-wider">Pilar 3: Desarrollo Tech / IA</span>
                  <span className="text-slate-700 font-medium">Arquitecto y programador de PropWork / AssetFlow ERP para erradicar errores en CMF y UAF.</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 1: ELEVATOR PITCH DE 3 MINUTOS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1">
                <Brain className="w-5 h-5 text-emerald-700" />
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  1. EL ELEVATOR PITCH: DISCURSO DE PRESENTACIÓN (3 MINUTOS)
                </h2>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                *Instrucción de uso: Utiliza este discurso cuando el entrevistador diga "Háblame de ti", "Cuéntame tu trayectoria" o "¿Por qué deberíamos contratarte?". Manten un tono firme, pausado, seguro y orientado a resultados medibles.*
              </p>

              <div className="p-5 bg-slate-50 border-l-4 border-slate-900 rounded-r-lg space-y-3 text-xs leading-relaxed text-slate-800">
                <p>
                  <strong>«Apertura de Impacto:»</strong><br />
                  "Muchas gracias. Soy Cristian Muñoz, Ingeniero Civil Industrial con más de 8 años de trayectoria liderando la optimización operacional, el control interno estratégico y la transformación tecnológica de procesos en sectores de alta exigencia, como la gestión inmobiliario-financiera y la manufactura multinacional.
                </p>
                <p>
                  <strong>«Mi Trayectoria Reciente (Corporación Inmobiliaria):»</strong><br />
                  En mi rol más reciente como Jefe de Control Interno en el Departamento Inmobiliario de la Corporación Inmobiliaria, asumí el desafío de gobernar y auditar un portafolio de 1.849 propiedades valoradas en UF 30.300 ($1.146 millones de pesos). Mi mayor hito allí fue lograr y mantener en <strong>cero absoluto las observaciones de auditoría externa e interna</strong>. Para lograrlo, desarticulé inercias del tipo 'siempre se ha hecho así' y concebí, diseñé y programé personalmente <strong>PropWork / AssetFlow ERP</strong>, una suite de software a medida que digitalizó la bóveda documental, automatizó la conciliación contable para la CMF (planillas B13, B4 y Nota 14) e integró controles UAF/AML para prevención de lavado de activos.
                </p>
                <p>
                  <strong>«Mi Trayectoria Multinacional (Essity Chile):»</strong><br />
                  Previamente, trabajé durante 5 años en la multinacional Essity Chile liderando la bodega de repuestos críticos. Ahí logré un hito operacional significativo: liberé más de <strong>$2.000 millones de pesos chilenos (UF 53.000) en capital de trabajo (Working Capital)</strong> sin arriesgar ni un solo minuto de la continuidad operacional de la planta continua. Lo logré renegociando acuerdos de cobertura con proveedores en mercados oligopólicos e introduciendo inventarios rotativos aleatorios (IRA), lo que nos llevó a mantener <strong>diferencias de inventario en $0 pesos por 10 meses consecutivos</strong> en una bodega de UF 158.000.
                </p>
                <p>
                  <strong>«Mi Cierre y Propuesta de Valor:»</strong><br />
                  Lo que me diferencia como Ingeniero Civil Industrial es mi perfil híbrido de alto impacto: no solo analizo los procesos en el papel o desde un escritorio, sino que tengo la capacidad técnica de desarrollar herramientas digitales, formar equipos en terreno con empatía y conectar directamente el cumplimiento normativo con el ahorro financiero de la compañía. Estoy aquí porque busco agregar este mismo nivel de rigurosidad, innovación y resguardo patrimonial a su organización."
                </p>
              </div>
            </div>

            {/* SECCIÓN 2: GUION METODOLÓGICO STAR PARA HISTORIAS DE ÉXITO */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1">
                <Target className="w-5 h-5 text-emerald-700" />
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  2. GUION METODOLÓGICO STAR (PREGUNTAS DE COMPORTAMIENTO)
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs">
                {/* CASO STAR 1 */}
                <div className="p-4 border border-slate-200 rounded-lg bg-white space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-slate-900 uppercase">Caso 1: ¿Cómo lograste mantener 0 observaciones de auditoría en la CMF?</span>
                    <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-mono text-[10px] font-bold">Control Interno &amp; CMF</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-slate-700 pt-1">
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                      <strong className="block text-slate-900 font-bold mb-1">Situación (S):</strong>
                      Existían procesos de validación manuales en Excel propensos a inconsistencias para reportar a la CMF y auditar 1.849 inmuebles.
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                      <strong className="block text-slate-900 font-bold mb-1">Tarea (T):</strong>
                      Garantizar la consistencia contable total, pasar las auditorías con 0 observaciones y alinearse con CMF y UAF.
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                      <strong className="block text-slate-900 font-bold mb-1">Acción (A):</strong>
                      Implementé el protocolo "Sombra" para reeducar ejecutivos, eliminé planillas aisladas y programé las reglas de validación en PropWork.
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                      <strong className="block text-slate-900 font-bold mb-1">Resultado (R):</strong>
                      0 observaciones de auditoría por 2 periodos consecutivos y reportes CMF (B13/B4) generados en minutos en vez de 15 días.
                    </div>
                  </div>
                </div>

                {/* CASO STAR 2 */}
                <div className="p-4 border border-slate-200 rounded-lg bg-white space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-slate-900 uppercase">Caso 2: ¿Cómo redujiste $2.000M CLP en Working Capital en Essity?</span>
                    <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-mono text-[10px] font-bold">Supply Chain &amp; Finanzas</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-slate-700 pt-1">
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                      <strong className="block text-slate-900 font-bold mb-1">Situación (S):</strong>
                      Había $6.000M CLP estancados en inventario por temor a que la planta de manufactura sufriera detenciones no programadas.
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                      <strong className="block text-slate-900 font-bold mb-1">Tarea (T):</strong>
                      Liberar capital de trabajo (Working Capital) reduciendo el sobrestock de SKUs sin arriesgar la continuidad operacional.
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                      <strong className="block text-slate-900 font-bold mb-1">Acción (A):</strong>
                      Clasifiqué SKUs por matriz de rotación, negocié contratos de consignment/stock de seguridad guardado en bodegas del proveedor.
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                      <strong className="block text-slate-900 font-bold mb-1">Resultado (R):</strong>
                      Liberación comprobada de +$2.000M CLP (22% de reducción de stock) y 10 meses con $0 diferencias de inventario.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: RESPUESTAS A PREGUNTAS DIFÍCILES Y OBJECIONES */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1">
                <HelpCircle className="w-5 h-5 text-emerald-700" />
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  3. MANEJO DE PREGUNTAS CLAVE &amp; OBJECIONES DEL ENTREVISTADOR
                </h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded border-l-4 border-slate-800 space-y-1">
                  <span className="font-bold text-slate-900 block">Pregunta 1: "¿Por qué un Ingeniero Industrial programa software en lugar de usar un software comercial ya hecho?"</span>
                  <p className="text-slate-700 leading-relaxed">
                    <strong>Respuesta Ganadora:</strong> "Para mí la programación no es un fin en sí mismo, es una herramienta de ingeniería para resolver cuellos de botella con velocidad. Cuando los software comerciales tardan 8 meses en adaptarse a un cambio normativo o cuestan licencias desproporcionadas, mi capacidad de desarrollar prototipos funcionales full-stack nos permite validar procesos en días. Eso elimina el 'teléfono descompuesto' entre la gerencia y los desarrolladores externos, ahorrándole millones a la empresa."
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded border-l-4 border-slate-800 space-y-1">
                  <span className="font-bold text-slate-900 block">Pregunta 2: "¿Cómo manejas la resistencia de personal antiguo que rechaza la tecnología?"</span>
                  <p className="text-slate-700 leading-relaxed">
                    <strong>Respuesta Ganadora:</strong> "Aplico la metodología 'Sombra' y liderazgo empático. Nunca impongo una plataforma desde arriba. Me me siento al lado del ejecutivo, observo su dolor al llenar 20 planillas Excel y le demuestro cómo la nueva herramienta le ahorra 2 horas diarias de trabajo repetitivo. Cuando el usuario percibe que el software es su aliado y no un fiscalizador, la adopción pasa de ser obligatoria a ser natural."
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded border-l-4 border-slate-800 space-y-1">
                  <span className="font-bold text-slate-900 block">Pregunta 3: "¿Cuál consideras que es tu mayor oportunidad de mejora o aspecto a desarrollar?"</span>
                  <p className="text-slate-700 leading-relaxed">
                    <strong>Respuesta Ganadora:</strong> "Mi alto nivel de exigencia con los entregables a veces me llevaba a querer revisar personalmente cada detalle técnico. He trabajado conscientemente en estructurar metodologías de delegación con puntos de control intermedios (KPIs semanales), confiando en la autonomía de mi equipo y enfocando mi energía en la toma de decisiones estratégicas a nivel directivo."
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: PREGUNTAS INTELIGENTES PARA HACERLE AL PANEL */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1">
                <MessageSquare className="w-5 h-5 text-emerald-700" />
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  4. PREGUNTAS ESTRATÉGICAS PARA HACERLE AL PANEL (CIERRE DE IMPACTO)
                </h2>
              </div>
              <p className="text-xs text-slate-600 italic">
                *Al final de la entrevista, cuando pregunten '¿Tienes alguna pregunta para nosotros?', haz 2 o 3 de estas preguntas para demostrar visión de negocio y seniority:*
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                  <strong className="text-emerald-950 font-extrabold block mb-1">1. Sobre los Objetivos del Cargo:</strong>
                  "¿Cuáles son los 3 principales indicadores de éxito o desafíos prioritarios que la persona que asuma este rol debe resolver en sus primeros 90 días?"
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                  <strong className="text-emerald-950 font-extrabold block mb-1">2. Sobre la Cultura &amp; Madurez Digital:</strong>
                  "¿Cuál es el nivel de apertura de la organización respecto a la automatización de procesos y el uso de herramientas de Inteligencia Artificial para el control interno?"
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                  <strong className="text-emerald-950 font-extrabold block mb-1">3. Sobre los Desafíos Operacionales:</strong>
                  "¿Cuál ha sido el cuello de botella más complejo en la conciliación contable o la gestión de auditorías durante el último periodo?"
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                  <strong className="text-emerald-950 font-extrabold block mb-1">4. Sobre el Equipo de Trabajo:</strong>
                  "¿Cómo está estructurado actualmente el equipo con el que colaboraría y qué metodologías de gestión de proyectos están utilizando hoy?"
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: CHECKLIST DE PREPARACIÓN PRE-ENTREVISTA */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  5. CHECKLIST DE LENGUAJE Y LENGUAJE CORPORAL
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium text-slate-800">
                <div className="p-3 bg-slate-100 rounded border border-slate-200 flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <strong className="block text-slate-900">Contacto Visual &amp; Postura</strong>
                    Mantén la mirada firme hacia la cámara (si es online) o a los ojos de los entrevistadores, con espalda erguida.
                  </div>
                </div>
                <div className="p-3 bg-slate-100 rounded border border-slate-200 flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <strong className="block text-slate-900">Métricas Específicas</strong>
                    Cita números reales: 1.849 propiedades, $1.146M CLP, $2.000M CLP liberados, 0 observaciones CMF, 10 meses en $0.
                  </div>
                </div>
                <div className="p-3 bg-slate-100 rounded border border-slate-200 flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <strong className="block text-slate-900">Tono Calmado y Seguro</strong>
                    Habla a un ritmo de 130 palabras por minuto. Pausas de 2 segundos antes de responder proyectan reflexión y serenidad.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer de Firma ISO */}
            <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-500 font-mono space-y-1">
              <p><strong>DOCUMENTO DE PREPARACIÓN EJECUTIVA - CRISTIAN ANDRÉS MUÑOZ ROJAS</strong></p>
              <p>Generado e impreso a través de la Suite de Gestión Integral PropWork / AssetFlow ERP • Santiago, Chile</p>
            </div>

          </div>
        </div>

        {/* Bottom Bar */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-mono font-bold">
            Documento listo para guardar en PDF o imprimir.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Descargar PDF Ahora
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer border border-slate-300"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InterviewSpeechModal;
