import { JobOffer } from "../types";

/**
 * Superpower Mode AI Service for Chilean Job Applications
 * Genera respuestas elocuentes, concisas y humanizadas fundamentadas en el CV real de Cristian Muñoz Rojas,
 * la creación y arquitectura de este sistema (PropWork / AssetFlow), la rareza de su perfil híbrido
 * y el impacto cuantificable para la empresa a la que se postula.
 */

export interface RecruiterQuestionTemplate {
  id: string;
  category: string;
  question: string;
  description: string;
}

export interface JobApplicationContext {
  title: string;
  description: string;
  company?: string;
  portal?: string;
  modality?: string;
  salaryMin?: number;
  salaryMax?: number;
  requiredSkills?: string[];
}

export const RECRUITER_COMMON_QUESTIONS: RecruiterQuestionTemplate[] = [
  {
    id: 'exp_logros',
    category: 'Experiencia y Logros',
    question: 'Cuéntanos de tu experiencia en el cargo al que postulas y tus logros más destacados.',
    description: 'Pregunta estándar de filtro sobre trayectoria y resultados medibles.'
  },
  {
    id: 'valor_diferencial',
    category: 'Propuesta de Valor & Rareza',
    question: '¿Qué valor diferencial aportas y por qué deberíamos seleccionarte a ti frente a otros candidatos?',
    description: 'Explica la rareza del perfil híbrido (Ingeniería + IA + Auditoría + Supply Chain).'
  },
  {
    id: 'optimizacion_costos',
    category: 'Resultados Financieros',
    question: 'Describe una situación donde lideraste una optimización de procesos o reducción de costos.',
    description: 'Destaca los $2.000M CLP liberados en Working Capital en Essity y el 99.5% IRA ($0 diferencias).'
  },
  {
    id: 'control_auditoria',
    category: 'Gobernanza & Auditoría',
    question: '¿Cómo abordas el control interno, la prevención de riesgos y la relación con auditorías externas?',
    description: 'Destaca las 0 observaciones ante CGR/CMF en la gestión de 1.849 propiedades (UF 30.300).'
  },
  {
    id: 'tecnologia_ia',
    category: 'Transformación Digital',
    question: '¿Qué experiencia tienes implementando tecnología, automatización o Inteligencia Artificial en el negocio?',
    description: 'Detalla la creación y desarrollo de PropWork / AssetFlow con TypeScript, React, SQL e IA Generativa.'
  },
  {
    id: 'motivacion_empresa',
    category: 'Alineación Estratégica',
    question: '¿Por qué te interesa esta vacante y cómo planeas aportar a nuestra organización desde el día 1?',
    description: 'Conecta de forma humanizada el negocio de la empresa con las fortalezas del candidato.'
  },
  {
    id: 'renta_disponibilidad',
    category: 'Condiciones de Postulación',
    question: 'Indica tus pretensiones de renta líquida mensual y tu disponibilidad para comenzar.',
    description: 'Respuesta formal, flexible y alineada con los rangos de mercado y el valor ofrecido.'
  }
];

const CRISTIAN_CORE_BACKGROUND = `
CANDIDATO: Cristian Andrés Muñoz Rojas
TÍTULO: Ingeniero Civil Industrial
ESPECIALIDADES: Control Interno, Gestión Inmobiliaria, Supply Chain & Bodega Crítica, Transformación Digital e Inteligencia Artificial Generativa.
UBICACIÓN: Santiago, Chile
CONTACTO: +56 9 6143 6853 | cristian.munoz0223@gmail.com | RUT: 15.823.941-K

PILAR 1: CONTROL INTERNO & AUDITORÍA CERO OBSERVACIONES (Corporación Inmobiliaria, 2023 - Presente)
- Liderazgo del gobierno corporativo y control de un portafolio patrimonial de 1.849 unidades valorizado en UF 30.300 ($1.146M CLP).
- Logro histórico de mantener 0 observaciones ante la Contraloría General de la República (CGR) y auditorías externas de forma consecutiva.
- Automatización de reportes regulatorios complejos para la Comisión para el Mercado Financiero (CMF): planillas regulatorias B13, B4 y cálculo de la Nota 14.
- Prevención de lavado de activos y debida diligencia de contrapartes bajo normativa UAF / PEP (Ley N° 19.913).

PILAR 2: SUPPLY CHAIN & REDUCCIÓN MULTIMILLONARIA DE COSTOS (Essity Chile, 2018 - 2023)
- Líder de Bodega de Repuestos Críticos para plantas de manufactura continua de alta exigencia.
- Liberación y optimización de capital de trabajo (Working Capital) por más de $2.000 millones de pesos chilenos ($2.000M CLP / UF 53.000), reduciendo el inventario inmovilizado en un 22%.
- Récord operacional de más de 10 meses consecutivos manteniendo cero ($0) diferencias en inventarios rotativos IRA con precisión de 99.5% y SLA de 98%.
- Aplicación práctica de metodología Lean Six Sigma, disminuyendo obsolescencia de materiales en un 35% y manejo experto de SAP MM/WM.

PILAR 3: DESARROLLO TECNOLÓGICO, CREACIÓN DE ASSETFLOW / PROPWORK E IA GENERATIVA
- Diseñó, programó y desplegó autónomamente el software full-stack PropWork / AssetFlow (utilizando TypeScript, React, SQL, Tailwind CSS y Google AI Studio / Gemini API).
- Reemplazó planillas Excel descentralizadas que generaban inconsistencias normativas por un sistema auditado con marcas de tiempo inmutables y reglas de validación en tiempo real.
- Capacidad única de conectar las necesidades del negocio con código moderno y herramientas de IA Generativa para erradicar tareas repetitivas.

PILAR 4: FORMACIÓN TÉCNICO JURÍDICA (ENAC Cáritas Chile, 2005 - 2008)
- Estudios en derecho procesal, derecho administrativo y elaboración de contratos comerciales.
- Base legal rigurosa que potencia sus funciones de Compliance, redacción contractual y prevención de contingencias jurídicas.

RAREZA DEL PERFIL (99.8% de singularidad en el mercado chileno):
- Es un Ingeniero Civil Industrial que no solo analiza números en un Excel: tiene la disciplina operacional de bodega ($0 diferencias), el rigor de auditor CMF (0 observaciones), la solvencia legal para entender normativas y contratos, y la capacidad de programar sistemas con Inteligencia Artificial.
`;

/**
 * Genera una respuesta altamente elocuente, concisa y humanizada para una pregunta de reclutador
 * Estructurada rigurosamente en función del cargo al que se postula, la descripción del puesto y el CV
 */
export async function generateSuperpowerAnswer(
  job: JobOffer | JobApplicationContext,
  question: string,
  tone: 'EXECUTIVE' | 'QUANTITATIVE' | 'INNOVATOR' = 'EXECUTIVE'
): Promise<string> {
  try {
    const res = await fetch('/api/gemini/superpower-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, question, tone })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.answer && data.answer.length > 50) {
        return data.answer;
      }
    }
  } catch {
    // Fallback a generación inteligente heurística si falla la red
  }

  // Generador de Respaldo Heurístico de Alta Fidelidad (garantía 100% libre de fallos)
  return getFallbackSuperpowerAnswer(job, question, tone);
}

/**
 * Genera un Elevator Pitch de 30 segundos (ideal para mensaje directo a reclutador o InMail)
 */
export async function generateSuperpowerPitch(
  job: JobOffer | JobApplicationContext,
  recruiterName?: string
): Promise<string> {
  try {
    const res = await fetch('/api/gemini/superpower-pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, recruiterName })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.pitch && data.pitch.length > 30) {
        return data.pitch;
      }
    }
  } catch {
    // Fallback
  }

  const jobCompany = job.company || 'su organización';
  const jobTitle = job.title || 'esta posición';

  return `Estimado equipo de selección de ${jobCompany}:
Como Ingeniero Civil Industrial con perfil híbrido de alta rareza, integro la rigurosidad del control interno y auditoría CMF (0 observaciones en portafolios de UF 30.300) con la excelencia operacional de supply chain ($2.000M CLP optimizados en capital de trabajo y $0 diferencias de inventario en Essity), junto con la capacidad de programar soluciones de software e Inteligencia Artificial a medida (como el sistema AssetFlow). Mi objetivo en el rol de ${jobTitle} es aportar visión analítica, probidad irrestricta y aceleración tecnológica inmediata desde el primer día.`;
}

/**
 * Generador de respaldo de alta fidelidad basado en el análisis semántico de la pregunta
 */
function getFallbackSuperpowerAnswer(
  job: JobOffer | JobApplicationContext,
  question: string,
  tone: 'EXECUTIVE' | 'QUANTITATIVE' | 'INNOVATOR'
): string {
  const qLower = question.toLowerCase();
  const company = job.company || 'su organización';
  const role = job.title || 'el cargo';
  const desc = job.description || '';

  // 1. Preguntas sobre logros y experiencia
  if (qLower.includes('logro') || qLower.includes('experiencia') || qLower.includes('trayectoria') || qLower.includes('cuéntanos')) {
    if (tone === 'QUANTITATIVE') {
      return `A lo largo de mis 8 años como Ingeniero Civil Industrial, he sustentado mi desempeño en resultados numéricos verificables. En Essity Chile liberé más de $2.000 millones de pesos en capital de trabajo mediante reingeniería de inventarios y logré el hito de sostener durante más de 10 meses consecutivos cero ($0) diferencias en inventarios rotativos IRA con 99.5% de precisión. Posteriormente, como Jefe de Control Interno, asumí la fiscalización de 1.849 propiedades por UF 30.300 ($1.146M CLP), manteniendo de forma ininterrumpida cero (0) observaciones ante la Contraloría General de la República (CGR) y auditorías externas. Para ${company}, en el cargo de ${role}, pondré esta misma disciplina cuantitativa al servicio de la rentabilidad, la mitigación de riesgos y el control estricto de sus recursos.`;
    }
    return `Como Ingeniero Civil Industrial, mi trayectoria combina liderazgo operacional, control interno y transformación tecnológica. En el sector inmobiliario lideré la fiscalización de 1.849 unidades por UF 30.300, reduciendo a cero y manteniendo en 0 las observaciones ante la Contraloría General de la República y la CMF. En paralelo, para erradicar las ineficiencias de planillas descentralizadas, programé y desplegué el software PropWork/AssetFlow con Inteligencia Artificial y reglas de validación en tiempo real. Previamente en Essity Chile optimicé más de $2.000M CLP en Working Capital con inventarios en $0 diferencias. Mi propuesta para ${company} es aportar madurez de gestión, visión preventiva y la capacidad probada de generar eficiencias estructurales en ${role} desde el primer mes.`;
  }

  // 2. Preguntas sobre valor diferencial y rareza del perfil
  if (qLower.includes('diferencial') || qLower.includes('por qué') || qLower.includes('rareza') || qLower.includes('seleccionarte') || qLower.includes('otros')) {
    return `Mi principal valor diferencial radica en un perfil híbrido de muy alta rareza en el mercado: integro la capacidad de optimización cuantitativa de un Ingeniero Civil Industrial, la disciplina operativa de bodega (donde mantuve $0 diferencias en Essity liberando $2.000M CLP), el estándar de auditoría CMF con 0 observaciones, y la habilidad técnica de programar software full-stack con Inteligencia Artificial Generativa (habiendo creado la plataforma AssetFlow). A esto sumo una sólida base técnico-jurídica en derecho procesal y administrativo. Mientras que la mayoría de los candidatos deben elegir entre ser analistas de negocio o depender de consultores de TI externos, yo conecto directamente los dolores operacionales de ${company} con soluciones tecnológicas robustas y cumplimiento regulatorio intachable.`;
  }

  // 3. Preguntas sobre optimización de costos o procesos
  if (qLower.includes('costo') || qLower.includes('optimiz') || qLower.includes('ahorro') || qLower.includes('eficiencia') || qLower.includes('proceso')) {
    return `Mi mayor caso de éxito en optimización ocurrió en Essity Chile, planta de manufactura continua de alta criticidad. Allí lideré un programa integral de inventory lean management sobre repuestos estratégicos: mediante análisis de criticidad de SKUs, negociación de acuerdos de nivel de servicio con proveedores clave y conteos cíclicos automatizados, redujimos el capital de trabajo inmovilizado en un 22%, liberando más de $2.000M CLP acumulados y alcanzando 99.5% de precisión de inventario. Asimismo, en mi rol de Control Interno reduje el tiempo de reportería mensual de 15 días hábiles a minutos mediante la plataforma tecnológica que diseñé. Para ${company}, aportaré este mismo enfoque de eliminar desperdicios operacionales y maximizar el retorno de cada peso invertido en ${role}.`;
  }

  // 4. Preguntas sobre auditoría, CMF, UAF o control interno
  if (qLower.includes('auditor') || qLower.includes('control') || qLower.includes('cmf') || qLower.includes('uaf') || qLower.includes('riesgo') || qLower.includes('cgr')) {
    return `Mi enfoque de control interno se basa en la prevención proactiva y la trazabilidad absoluta del dato. En la Corporación Inmobiliaria supervisé el portafolio de 1.849 inmuebles (UF 30.300), logrando un récord de cero observaciones críticas tanto de auditorías externas como de la Contraloría General de la República. Esto fue posible gracias a la implementación de controles de doble entrada homologados con AssetFlow Enterprise y reportes normados CMF (B13, B4 y Nota 14), además de un motor automatizado de debida diligencia UAF / PEP (Ley 19.913). Mi formación formativa en el ámbito jurídico refuerza mi criterio contractual y de probidad. En ${company}, velaré por blindar la operación contra cualquier contingencia normativa o desvío financiero.`;
  }

  // 5. Preguntas sobre tecnología e Inteligencia Artificial
  if (qLower.includes('tecnolog') || qLower.includes('ia') || qLower.includes('inteligencia') || qLower.includes('software') || qLower.includes('automatiz') || qLower.includes('program')) {
    return `No me limito a ser un usuario de tecnología: soy un creador de soluciones. Diseñé, programé e implementé en producción la suite AssetFlow / PropWork utilizando TypeScript, React, SQL y modelos de Inteligencia Artificial Generativa a través de Google AI Studio. Este sistema automatizó la validación de contratos, la conciliación contable de doble entrada y la verificación de listas de cumplimiento, eliminando el error humano derivado del uso de planillas manuales. Esta destreza full-stack me permite dialogar con el negocio y con las áreas de ingeniería de software, acelerando la digitalización de ${company} en ${role} sin sobrecostos de consultoría externa.`;
  }

  // 6. Preguntas sobre renta líquida y disponibilidad
  if (qLower.includes('renta') || qLower.includes('sueldo') || qLower.includes('pretension') || qLower.includes('disponib')) {
    const salaryMinStr = (job.salaryMin || 3500000).toLocaleString('es-CL');
    const salaryMaxStr = (job.salaryMax || 4500000).toLocaleString('es-CL');
    return `Mis pretensiones de renta líquida se sitúan en el rango de $ ${salaryMinStr} a $ ${salaryMaxStr} CLP mensuales, alineadas con los estándares de mercado para una posición de ${role} y proporcionales al impacto financiero, rigor de control y capacidades de aceleración tecnológica que aporto. Respecto a mi disponibilidad, cuento con disposición inmediata para iniciar funciones y realizar un traspaso fluido de responsabilidades, con total flexibilidad para modalidades presenciales, híbridas o remotas según las necesidades estratégicas de ${company}.`;
  }

  // 7. Respuesta multipropósito humanizada y elocuente
  return `Abordo este desafío en ${company} con una combinación singular de visión estratégica y capacidad de ejecución tangible. Como Ingeniero Civil Industrial de perfil híbrido, cuento con un historial comprobado liderando control interno (0 observaciones en portafolios de UF 30.300 ante CGR/CMF), supply chain de alta exigencia ($2.000M CLP optimizados en capital de trabajo y $0 diferencias en Essity) y desarrollo de software con Inteligencia Artificial (habiendo creado la plataforma AssetFlow). Mi formación jurídica complementaria me permite asegurar rigor normativo absoluto, mientras que mi orientación a resultados garantiza que cada iniciativa se traduzca en eficiencias medibles para el equipo de ${company}.`;
}

/**
 * Parsea texto pegado desde un portal de empleo que puede contener una o varias preguntas
 * (separadas por números, guiones, saltos de línea o prefijos tipo 'Pregunta 1:', '1.', etc.)
 */
export function parsePastedQuestions(text: string): string[] {
  if (!text || !text.trim()) return [];
  const trimmed = text.trim();
  
  // Dividir por saltos de línea
  const rawLines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Si solo hay una línea
  if (rawLines.length === 1) {
    return [trimmed];
  }

  // Detectar si contiene prefijos de preguntas
  const questionPattern = /^(\d+[\.\)\-:]|pregunta\s*\d*[\:\.]|\¿|\-|\*)\s*/i;
  const questions: string[] = [];
  let currentQ = '';

  for (const line of rawLines) {
    if (questionPattern.test(line)) {
      if (currentQ) {
        questions.push(currentQ.trim());
      }
      currentQ = line.replace(/^(\d+[\.\)\-:]|pregunta\s*\d*[\:\.]|\-|\*)\s*/i, '').trim();
    } else if (currentQ) {
      currentQ += ' ' + line;
    } else {
      currentQ = line;
    }
  }

  if (currentQ) {
    questions.push(currentQ.trim());
  }

  const valid = questions.filter(q => q.length >= 5);
  return valid.length > 0 ? valid : [trimmed];
}
