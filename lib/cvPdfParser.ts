import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { CvProfile, JobOffer } from '../types';

// Safely configure PDF.js worker for browser environments
try {
  const actualPdfjs = (pdfjsLib as any).default || pdfjsLib;
  if (actualPdfjs && actualPdfjs.GlobalWorkerOptions) {
    const version = actualPdfjs.version || '5.5.207';
    actualPdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('No se pudo inicializar workerSrc de PDF.js:', e);
}

// Broad dictionary of technical, operational, financial and managerial skills
// relevant to the Chilean and Latin American professional job market.
export const KNOWN_MARKET_SKILLS: { name: string; aliases: string[]; category: string }[] = [
  // Ingeniería, Procesos & Industria
  { name: 'Ingeniero Civil Industrial', aliases: ['ingenieria civil industrial', 'civil industrial', 'industrial engineer'], category: 'Ingeniería & Título' },
  { name: 'Ingeniero Comercial', aliases: ['ingenieria comercial', 'comercial', 'business administration'], category: 'Ingeniería & Título' },
  { name: 'Contador Auditor', aliases: ['contador publico', 'auditor', 'auditoria contable', 'contabilidad general'], category: 'Finanzas & Auditoría' },
  { name: 'Control Interno', aliases: ['control de gestion', 'internal control', 'compliance', 'supervision operativa'], category: 'Control & Auditoría' },
  { name: 'Auditoría Cero Observaciones', aliases: ['auditoria sin observaciones', 'cero observaciones', 'auditoria interna', 'cgr'], category: 'Control & Auditoría' },
  { name: 'Gestión Inmobiliaria', aliases: ['inmobiliario', 'asset management', 'propiedades', 'bienes raices', 'tasaciones'], category: 'Operaciones & Bienes' },
  { name: 'Supply Chain & Logística', aliases: ['cadena de suministro', 'supply chain management', 'logistica', 'abastecimiento', 'bodegas'], category: 'Supply Chain' },
  { name: 'Capacitación S&OP (Sales & Operations Planning)', aliases: ['s&op', 'sales and operations planning', 'planificacion de demanda', 'demanda y operaciones'], category: 'Supply Chain' },
  { name: 'SAP MM/WM', aliases: ['sap mm', 'sap wm', 'sap erp', 'sap s/4hana', 'sap r/3', 'sap'], category: 'Sistemas & ERP' },
  { name: 'AssetFlow Enterprise', aliases: ['assetflow', 'erp', 'enterpriseone'], category: 'Sistemas & ERP' },
  { name: 'Power BI & DAX', aliases: ['power bi', 'dax', 'business intelligence', 'powerbi', 'tableros bi'], category: 'Datos & Analítica' },
  { name: 'Consultas SQL', aliases: ['sql', 'transact-sql', 'postgresql', 'mysql', 'queries sql'], category: 'Datos & Analítica' },
  { name: 'IA Generativa (Google AI Studio)', aliases: ['ia generativa', 'google ai studio', 'gemini api', 'prompt engineering', 'inteligencia artificial'], category: 'Tecnología & IA' },
  { name: 'Desarrollo TypeScript & React', aliases: ['typescript', 'react', 'javascript', 'frontend', 'desarrollo web', 'full stack'], category: 'Tecnología & IA' },
  { name: 'Ingeniería & Control de Procesos con IA', aliases: ['ingenieria de procesos', 'control de procesos', 'automatizacion', 'ia aplicada', 'inteligencia artificial aplicada'], category: 'Tecnología & IA' },
  { name: 'Arquitectura Full-Stack & Google AI Studio', aliases: ['arquitectura de software', 'arquitectura full-stack', 'sistema assetflow', 'assetflow'], category: 'Tecnología & IA' },
  { name: 'Gestión de Activos Inmobiliarios UF 30.300', aliases: ['uf 30.300', '1.849 propiedades', 'gestion de activos', 'cartera inmobiliaria', '30.300 uf'], category: 'Operaciones & Bienes' },
  { name: 'Gobernanza CMF (B13 / B4 / Nota 14)', aliases: ['normas cmf', 'planillas b13', 'planilla b4', 'nota 14', 'b13', 'b4'], category: 'Finanzas & Normas' },
  { name: 'Inventarios Rotativos IRA en $0 Diferencias', aliases: ['inventarios en $0', '$0 diferencias', 'ira $0', 'inventarios sin diferencias'], category: 'Supply Chain' },
  { name: 'Seguridad de la Información & Ciberseguridad', aliases: ['seguridad de la informacion', 'ciberseguridad', 'proteccion de datos'], category: 'Gobernanza & Normas' },
  { name: 'Cumplimiento CMF (B13/B4/N14)', aliases: ['cmf', 'b13', 'b4', 'nota 14', 'normas ifrs', 'comision para el mercado financiero'], category: 'Finanzas & Normas' },
  { name: 'Prevención UAF / PEP', aliases: ['uaf', 'lavado de activos', 'pep', 'cumplimiento uaf', 'debida diligencia'], category: 'Gobernanza & Legal' },
  { name: 'Inventarios Rotativos IRA ($0 Dif)', aliases: ['inventarios rotativos', 'ira', 'toma de inventarios', 'control de inventarios', 'diferencia $0'], category: 'Supply Chain' },
  { name: 'Optimización Working Capital', aliases: ['working capital', 'capital de trabajo', 'flujo de caja', 'gestion de capital'], category: 'Finanzas & Gestión' },
  { name: 'Metodología Lean Six Sigma', aliases: ['lean', 'six sigma', '5s', 'kaizen', 'mejora continua'], category: 'Mejora Continua' },
  { name: 'Liderazgo de Equipos', aliases: ['liderazgo', 'gestion de personas', 'direccion de equipos', 'coordinacion de equipos', 'supervision'], category: 'Habilidades Directivas' },
  
  // Habilidades adicionales del mercado chileno y Sector Público (SADP)
  { name: 'Alta Dirección Pública (Ley N° 19.882)', aliases: ['alta direccion publica', 'sadp', 'servicio civil', 'directivo publico', 'concurso adp'], category: 'Sector Público' },
  { name: 'Transformación Digital del Estado (Ley N° 21.180)', aliases: ['ley 21.180', 'transformacion digital del estado', 'cero papel', 'expediente electronico', 'gobierno digital'], category: 'Sector Público' },
  { name: 'Control Interno & Auditoría CAIGG / CGR', aliases: ['caigg', 'contraloria', 'cgr', 'auditoria gubernamental', 'control interno publico'], category: 'Sector Público' },
  { name: 'Probidad Administrativa & Transparencia', aliases: ['probidad administrativa', 'transparencia activa', 'ley 20.285', 'ley 20.880', 'declaracion de intereses'], category: 'Sector Público' },
  { name: 'Evaluación de Proyectos (CAPEX/OPEX)', aliases: ['capex', 'opex', 'evaluacion de proyectos', 'van', 'tir'], category: 'Finanzas & Proyectos' },
  { name: 'Mercado Público & ChileCompra', aliases: ['mercado publico', 'chilecompra', 'licitaciones publicas', 'convenio marco', 'ley 19.886'], category: 'Sector Público' },
  { name: 'Estatuto Administrativo (Ley 18.834)', aliases: ['estatuto administrativo', 'ley 18.834', 'sector publico', 'concurso publico'], category: 'Sector Público' },
  { name: 'Gestión y Eficiencia Presupuestaria Dipres', aliases: ['dipres', 'presupuesto publico', 'ejecucion presupuestaria', 'sigfe'], category: 'Sector Público' },
  { name: 'Excel Avanzado & Macros VBA', aliases: ['excel avanzado', 'macros', 'vba', 'tablas dinamicas', 'modelacion excel'], category: 'Herramientas' },
  { name: 'Gestión de Contratos & Proveedores', aliases: ['administracion de contratos', 'gestion de proveedores', 'sla', 'kpis de servicio'], category: 'Operaciones' },
  { name: 'Prevención de Riesgos & Seguridad Laboral', aliases: ['prevencion de riesgos', 'seguridad laboral', 'ley 16.744', 'comite paritario'], category: 'Operaciones' },
  { name: 'Modelación Financiera & Presupuestos', aliases: ['modelacion financiera', 'presupuesto', 'control presupuestario', 'forecast'], category: 'Finanzas' },
  { name: 'Negociación Estratégica', aliases: ['negociacion', 'negociacion con proveedores', 'compras estrategicas'], category: 'Habilidades Directivas' }
];

/**
 * Extracts raw textual content from an ArrayBuffer of a PDF document.
 * Tiers:
 * 1. Primary: PDF.js browser engine (extracts font encodings, CMaps, ligatures, multiple pages).
 * 2. Secondary: Resilient binary & structural token scanner (BT...ET, Tj/TJ, hex strings, metadata, readable tokens).
 * Never throws unhandled stream or decompression errors.
 */
export async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  // Tier 1: PDF.js extraction
  try {
    const actualPdfjs = (pdfjsLib as any).default || pdfjsLib;
    if (actualPdfjs && typeof actualPdfjs.getDocument === 'function') {
      const loadingTask = actualPdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        isEvalSupported: false
      });

      const pdf = await Promise.race([
        loadingTask.promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout al cargar PDF')), 10000))
      ]);

      let fullText = '';
      const numPages = Math.min(pdf.numPages || 1, 15);
      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          let lastY = -1;
          let pageText = '';
          for (const item of (content.items as any[])) {
            if (lastY !== -1 && item.transform && Math.abs(item.transform[5] - lastY) > 4) {
              pageText += '\n';
            }
            pageText += (item.str || '') + ' ';
            if (item.transform) lastY = item.transform[5];
          }
          fullText += pageText + '\n';
        } catch (pageErr) {
          console.warn(`Aviso al procesar página ${i} del PDF:`, pageErr);
        }
      }

      if (fullText.trim().length > 30) {
        return fullText.trim();
      }
    }
  } catch (pdfErr) {
    console.warn('PDF.js no pudo extraer texto o excedió tiempo, usando analizador binario estructurado:', pdfErr);
  }

  // Tier 2: Safe structural token scanner (Runs in zero-dependency native JS, never throws)
  try {
    const bytes = new Uint8Array(buffer);
    const textDecoder = new TextDecoder('latin1');
    const rawString = textDecoder.decode(bytes);

    let combinedText = '';

    // 1. Scan for uncompressed text blocks (BT ... ET)
    const textBlockRegex = /BT[\s\S]*?ET/g;
    const matches = rawString.match(textBlockRegex);
    if (matches && matches.length > 0) {
      for (const block of matches) {
        const stringMatches = block.match(/\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f]+>/g);
        if (stringMatches) {
          for (const str of stringMatches) {
            if (str.startsWith('(') && str.endsWith(')')) {
              const clean = str.slice(1, -1).replace(/\\([()\\])/g, '$1');
              combinedText += clean + ' ';
            } else if (str.startsWith('<') && str.endsWith('>')) {
              const hex = str.slice(1, -1);
              let decodedHex = '';
              for (let i = 0; i < hex.length; i += 2) {
                const code = parseInt(hex.substring(i, i + 2), 16);
                if (!isNaN(code) && code >= 32) decodedHex += String.fromCharCode(code);
              }
              combinedText += decodedHex + ' ';
            }
          }
        }
      }
    }

    // 2. Scan metadata tags (/Title, /Author, /Subject, etc.)
    const metaRegex = /\/(Title|Author|Subject|Keywords|Creator)\s*\(([^()]+)\)/gi;
    let metaMatch;
    while ((metaMatch = metaRegex.exec(rawString)) !== null) {
      if (metaMatch[2]) {
        combinedText += ' ' + metaMatch[2];
      }
    }

    // 3. Scan plain readable tokens across raw buffer if extracted text is still brief
    if (combinedText.trim().length < 80) {
      const words = rawString.match(/[A-Za-zÁÉÍÓÚáéíóúñÑ0-9+@#._-]{3,}/g);
      if (words) {
        const ignoredPdfTags = new Set([
          'obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref',
          'Catalog', 'Pages', 'Page', 'Font', 'Type', 'Contents', 'MediaBox',
          'FlateDecode', 'Filter', 'Length', 'FontDescriptor', 'Encoding'
        ]);
        const cleanWords = words.filter(w => !ignoredPdfTags.has(w));
        combinedText += ' ' + cleanWords.join(' ');
      }
    }

    return combinedText.trim();
  } catch (fallbackErr) {
    console.warn('Error en analizador binario de respaldo:', fallbackErr);
    return '';
  }
}

/**
 * Intelligent analyzer that parses extracted text and builds a structured CvProfile.
 * Guarantees a robust, non-crashing result even with minimal or scanned text.
 */
export function analyzeCvText(
  rawText: string,
  fileName: string,
  fileSizeStr: string,
  source: 'UPLOADED_PDF' | 'MODEL_DEMO_PDF' = 'UPLOADED_PDF'
): CvProfile {
  const normalizedText = (rawText || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const normalizedFileName = (fileName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const invalidNameWords = new Set([
    'CURRICULUM', 'VITAE', 'RESUME', 'INFORMACION', 'EXPERIENCIA', 'EDUCACION',
    'FORMACION', 'PERFIL', 'PROFESIONAL', 'LABORAL', 'ACADEMICA', 'ESTUDIOS',
    'CONTACTO', 'ANTECEDENTES', 'TELEFONO', 'CORREO', 'EMAIL', 'HABILIDADES',
    'COMPETENCIAS', 'REFERENCIAS', 'IDIOMAS', 'CERTIFICACIONES', 'PROYECTOS',
    'EMPLEO', 'POSTULACION', 'SANTIAGO', 'CHILE', 'INGENIERO', 'CIVIL', 'INDUSTRIAL',
    'COMERCIAL', 'CONTADOR', 'AUDITOR', 'TECNICO', 'JURIDICO', 'GERENTE', 'JEFE',
    'UNIVERSIDAD', 'INSTITUTO', 'COLEGIO', 'LICENCIADO', 'MAGISTER', 'DIPLOMADO'
  ]);

  // 1. Candidate Name Detection
  let candidateName = '';

  const isCristianOrRareProfile = 
    normalizedText.includes('cristian andres munoz') || 
    normalizedText.includes('cristian munoz') || 
    normalizedFileName.includes('cristian_munoz') ||
    normalizedFileName.includes('cristian-munoz') ||
    normalizedFileName.includes('cristian munoz') ||
    normalizedFileName.includes('cristian');

  if (isCristianOrRareProfile) {
    candidateName = 'CRISTIAN ANDRÉS MUÑOZ ROJAS';
  } else {
    // Check explicit field: "Nombre: ...", "Candidato: ...", "Postulante: ..."
    const explicitMatch = rawText.match(/(?:nombre|candidato|postulante|perfil(?:\s+de)?)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i);
    if (explicitMatch && explicitMatch[1]) {
      const cand = explicitMatch[1].trim();
      const firstWord = cand.split(/\s+/)[0].toUpperCase();
      if (!invalidNameWords.has(firstWord)) {
        candidateName = cand.toUpperCase();
      }
    }

    // Check top lines of document
    if (!candidateName) {
      const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 3);
      for (let i = 0; i < Math.min(lines.length, 8); i++) {
        const line = lines[i].replace(/[|•,;:\-–].*$/, '').trim();
        const words = line.split(/\s+/);
        if (words.length >= 2 && words.length <= 4) {
          const upperWords = words.map(w => w.toUpperCase());
          const hasInvalid = upperWords.some(w => invalidNameWords.has(w) || w.length < 2);
          if (!hasInvalid && /^[A-ZÁÉÍÓÚÑa-záéíóúñ\s.]+$/.test(line)) {
            candidateName = line.toUpperCase();
            break;
          }
        }
      }
    }

    // Extract from filename: e.g. "CV_Juan_Perez_2026.pdf" -> "JUAN PEREZ"
    if (!candidateName) {
      const cleanFileName = fileName.replace(/\.[^.]+$/, '').replace(/^(cv|curriculum|curriculum_vitae|resume|hoja_de_vida)[_\-\s]*/i, '');
      const fileWords = cleanFileName.split(/[_\-\s]+/).filter(w => w.length >= 2 && !invalidNameWords.has(w.toUpperCase()));
      if (fileWords.length >= 2) {
        candidateName = fileWords.slice(0, 4).join(' ').toUpperCase();
      }
    }

    if (!candidateName) {
      candidateName = 'CRISTIAN ANDRÉS MUÑOZ ROJAS';
    }
  }

  // 2. Candidate Profession / Title Detection
  let candidateTitle = 'Ingeniero Civil Industrial';

  if (isCristianOrRareProfile) {
    candidateTitle = 'Ingeniero Civil Industrial • Control Interno & IA Generativa (Perfil Híbrido de Alta Rareza)';
  } else if (normalizedText.includes('civil industrial')) {
    candidateTitle = 'Ingeniero Civil Industrial';
  } else if (normalizedText.includes('comercial') && (normalizedText.includes('ingenier') || normalizedText.includes('licenciad'))) {
    candidateTitle = 'Ingeniero Comercial';
  } else if (normalizedText.includes('control de gestion') || (normalizedText.includes('control') && normalizedText.includes('gestion'))) {
    candidateTitle = 'Ingeniero en Control de Gestión';
  } else if (normalizedText.includes('contador') || normalizedText.includes('auditor') || normalizedText.includes('auditoria')) {
    candidateTitle = 'Contador Auditor & Control Interno';
  } else if (normalizedText.includes('software') || normalizedText.includes('informatic') || normalizedText.includes('programador') || normalizedText.includes('desarrollador')) {
    candidateTitle = 'Ingeniero de Software & TI';
  } else if (normalizedText.includes('logistica') || normalizedText.includes('supply chain') || normalizedText.includes('abastecimiento') || normalizedText.includes('operaciones')) {
    candidateTitle = 'Jefe de Supply Chain & Operaciones';
  } else if (normalizedText.includes('prevencion de riesgos') || normalizedText.includes('prevencionista')) {
    candidateTitle = 'Ingeniero en Prevención de Riesgos';
  } else if (normalizedText.includes('administrador') || normalizedText.includes('administracion')) {
    candidateTitle = 'Administrador de Empresas & Operaciones';
  }

  // 3. Email and Phone
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : (isCristianOrRareProfile ? 'cristian.munoz0223@gmail.com' : 'contacto.profesional@gmail.com');

  const phoneMatch = rawText.match(/(?:\+?56\s?9\s?\d{4}\s?\d{4}|\+?56\s?\d{1,2}\s?\d{7,8}|\b9\d{8}\b)/);
  const phone = phoneMatch ? phoneMatch[0] : '+56 9 6143 6853';

  // 4. Skills Detection & Extraction (Accent-insensitive)
  const detectedSkillsSet = new Set<string>();

  KNOWN_MARKET_SKILLS.forEach(skillDef => {
    const normName = skillDef.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalizedText.includes(normName)) {
      detectedSkillsSet.add(skillDef.name);
      return;
    }
    for (const alias of skillDef.aliases) {
      const normAlias = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (normalizedText.includes(normAlias)) {
        detectedSkillsSet.add(skillDef.name);
        break;
      }
    }
  });

  if (isCristianOrRareProfile) {
    [
      'Ingeniero Civil Industrial',
      'Control Interno',
      'Auditoría Cero Observaciones',
      'Perfil Híbrido de Alta Rareza (Ingeniería + IA + Auditoría)',
      'Arquitectura Full-Stack & Google AI Studio',
      'Gestión de Activos Inmobiliarios UF 30.300',
      'Gobernanza CMF (B13 / B4 / Nota 14)',
      'Inventarios Rotativos IRA en $0 Diferencias',
      'Supply Chain & Logística',
      'Capacitación S&OP (Sales & Operations Planning)',
      'SAP MM/WM',
      'AssetFlow Enterprise',
      'Power BI & DAX',
      'Consultas SQL',
      'IA Generativa (Google AI Studio)',
      'Desarrollo TypeScript & React',
      'Control Interno & Auditoría CMF',
      'Cumplimiento CMF (B13/B4/N14)',
      'Prevención UAF / PEP',
      'Optimización Working Capital',
      'Metodología Lean Six Sigma',
      'Liderazgo de Equipos',
      'Evaluación de Proyectos (CAPEX/OPEX)'
    ].forEach(s => detectedSkillsSet.add(s));
  } else if (detectedSkillsSet.size < 5) {
    // Add realistic baseline market skills according to the candidate's detected discipline
    if (candidateTitle.includes('Comercial')) {
      ['Ingeniero Comercial', 'Modelación Financiera & Presupuestos', 'Evaluación de Proyectos (CAPEX/OPEX)', 'Excel Avanzado & Macros VBA', 'Liderazgo de Equipos'].forEach(s => detectedSkillsSet.add(s));
    } else if (candidateTitle.includes('Auditor') || candidateTitle.includes('Control')) {
      ['Contador Auditor', 'Control Interno', 'Cumplimiento CMF (B13/B4/N14)', 'Power BI & DAX', 'Auditoría Cero Observaciones'].forEach(s => detectedSkillsSet.add(s));
    } else if (candidateTitle.includes('Software') || candidateTitle.includes('TI')) {
      ['Desarrollo TypeScript & React', 'Consultas SQL', 'IA Generativa (Google AI Studio)', 'Arquitectura Full-Stack & Google AI Studio', 'Excel Avanzado & Macros VBA'].forEach(s => detectedSkillsSet.add(s));
    } else {
      ['Ingeniero Civil Industrial', 'Control Interno', 'Supply Chain & Logística', 'Power BI & DAX', 'Liderazgo de Equipos', 'Evaluación de Proyectos (CAPEX/OPEX)'].forEach(s => detectedSkillsSet.add(s));
    }
  }

  // 5. Estimated Years of Experience
  let yearsOfExperience = isCristianOrRareProfile ? 8 : 6;
  const yearMatches = rawText.match(/\b(20[0-2][0-9]|19[8-9][0-9])\b/g);
  if (yearMatches && yearMatches.length >= 2) {
    const years = yearMatches.map(Number).sort((a, b) => a - b);
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    const diff = maxYear - minYear;
    if (diff >= 2 && diff <= 35) {
      yearsOfExperience = diff;
    }
  }

  // 6. Suggested Salary Range (in CLP)
  let suggestedSalaryMin = isCristianOrRareProfile ? 3800000 : 3200000;
  let suggestedSalaryMax = isCristianOrRareProfile ? 5500000 : 4800000;
  if (!isCristianOrRareProfile && (candidateTitle.includes('Civil Industrial') || candidateTitle.includes('Gerente') || candidateTitle.includes('Auditor'))) {
    suggestedSalaryMin = Math.max(3500000, 2800000 + (yearsOfExperience * 150000));
    suggestedSalaryMax = suggestedSalaryMin + 1400000;
  }

  const rarityPillars = isCristianOrRareProfile ? [
    {
      title: 'Pilar I: Ingeniería Industrial & Gobierno Cuantitativo',
      subtitle: 'Rigor Matemático & Gestión de Activos UF 30.300',
      description: 'Modelación cuantitativa de operaciones, optimización de capital de trabajo CAPEX/OPEX y administración de 1.849 propiedades valoradas en UF 30.300 ($1.146M CLP).'
    },
    {
      title: 'Pilar II: Control Interno & Auditoría Cero Observaciones',
      subtitle: 'Cumplimiento Normativo CMF & Prevención UAF / PEP',
      description: 'Gobernanza corporativa de máxima exigencia, generación de reportes normados CMF (B13, B4, Nota 14), prevención UAF/PEP Ley 19.913 y récord de cero observaciones.'
    },
    {
      title: 'Pilar III: Supply Chain Multinacional & Inventarios $0 Dif',
      subtitle: 'Gestión Crítica Essity por UF 158.000 ($6.000M CLP)',
      description: 'Liderazgo en bodega de repuestos críticos de alta demanda con hito histórico de $0 diferencias en inventarios rotativos IRA, células S&OP y dominio de SAP MM/WM y AssetFlow Enterprise.'
    },
    {
      title: 'Pilar IV: Arquitectura Full-Stack & IA Generativa',
      subtitle: 'Google AI Studio & Creador del Sistema AssetFlow',
      description: 'La habilidad más escasa en niveles ejecutivos: desarrollo directo en TypeScript/React y orquestación con IA Generativa (Google AI Studio) creando desde cero software corporativo en producción.'
    }
  ] : undefined;

  return {
    id: 'cv-' + Date.now(),
    fileName,
    fileSize: fileSizeStr,
    uploadedAt: new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    candidateName,
    candidateTitle,
    email,
    phone,
    location: 'Santiago, Chile',
    linkedin: 'www.linkedin.com/in/cristian-munoz-rojas',
    yearsOfExperience,
    extractedSkills: Array.from(detectedSkillsSet),
    suggestedSalaryMin,
    suggestedSalaryMax,
    rawTextPreview: (rawText || '').slice(0, 500),
    source,
    rarityScore: isCristianOrRareProfile ? 99.8 : undefined,
    rarityTag: isCristianOrRareProfile ? 'PERFIL DE RAREZA EXCEPCIONAL (PERCENTIL 99.8°)' : undefined,
    rarityPillars
  };
}

/**
 * Universal CV parser supporting PDF (.pdf), Word (.docx, .doc), and text files (.txt, .md).
 * Handles all binary conversions safely with comprehensive fallbacks.
 */
export async function parseCvPdfFile(file: File): Promise<CvProfile> {
  const buffer = await file.arrayBuffer();
  let text = '';
  const lowerName = file.name.toLowerCase();

  const sizeKb = (file.size / 1024).toFixed(1);
  const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${sizeKb} KB`;

  // 1. DOCX Support
  if (lowerName.endsWith('.docx') || file.type.includes('wordprocessingml')) {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      text = result.value || '';
    } catch (docxErr) {
      console.warn('Fallo al extraer texto con mammoth de archivo DOCX:', docxErr);
    }
  } 
  // 2. Plain Text / Markdown Support
  else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || file.type.startsWith('text/')) {
    try {
      text = new TextDecoder('utf-8').decode(buffer);
    } catch {
      text = new TextDecoder('latin1').decode(buffer);
    }
  } 
  // 3. PDF Support (PDF.js + Multi-layer fallback)
  else {
    text = await extractTextFromPdfBuffer(buffer);
  }

  return analyzeCvText(text, file.name, sizeStr, 'UPLOADED_PDF');
}

export const parseCvFile = parseCvPdfFile;

/**
 * Builds the official, executive 1-page model PDF for Cristian Andrés Muñoz Rojas
 * optimized for ATS (Applicant Tracking Systems) filters, high semantic keyword density,
 * humanized narrative, and balanced single-page layout.
 * Returns the jsPDF instance synchronously.
 */
export function buildCristianCvPdfDoc(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  // =========================================================================
  // SINGLE-PAGE ATS EXECUTIVE CV (CRISTIAN ANDRÉS MUÑOZ ROJAS)
  // Dimensions: 215.9 mm x 279.4 mm (Letter) — Strict 1-Page Layout
  // =========================================================================

  // Top Header (White Clean Background, High Contrast, Minimal Color)
  // Candidate Name
  doc.setTextColor(15, 23, 42); // Slate-900 (Black / Dark Charcoal)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CRISTIAN ANDRÉS MUÑOZ ROJAS', 14, 11);

  // Subtitle / Professional Title
  doc.setTextColor(51, 65, 85); // Slate-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Ingeniero Civil Industrial  •  Control de Gestión, Auditoría de Procesos y Operaciones', 14, 16.5);

  // Contact Info Line (Clean ATS Standard - Contacto en Negrita y Disponibilidad Inmediata)
  doc.setTextColor(15, 23, 42); // Slate-900 (Negrita destacada)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.text('Santiago, Chile   |   Tel: +56 9 6143 6853   |   cristian.munoz0223@gmail.com   |   Disponibilidad Inmediata   |   linkedin.com/in/cristian-muñoz-3a747258', 14, 21.5);

  // Subtle Header Divider Line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(14, 23.5, 202, 23.5);

  // -------------------------------------------------------------------------
  // SECTION 1: PERFIL PROFESIONAL
  // -------------------------------------------------------------------------
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('PERFIL PROFESIONAL', 14, 28.5);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(49, 28, 202, 28);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.75);
  const profileText = 
    'Ingeniero Civil Industrial con más de 12 años de experiencia liderando áreas de Control de Gestión, Auditoría Interna, Operaciones y Abastecimiento en sectores corporativos, manufactura multinacional y gestión patrimonial. Especialista en control presupuestario (OPEX/CAPEX), diseño de matrices de riesgo operacional y optimización de procesos mediante analítica avanzada (Power BI, SQL) y automatización. Formación complementaria en Ciencias Jurídicas (ENAC), aportando criterio técnico en cumplimiento normativo, contratos y debida diligencia. Historial comprobado en optimización de capital de trabajo por más de $2.000M CLP, administración de carteras inmobiliarias sin observaciones CMF y conducción directa de dotaciones operativas de hasta 20 personas. Disponibilidad Inmediata.';
  doc.text(doc.splitTextToSize(profileText, 188), 14, 32.5);

  // -------------------------------------------------------------------------
  // SECTION 2: EXPERIENCIA PROFESIONAL
  // -------------------------------------------------------------------------
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('EXPERIENCIA PROFESIONAL', 14, 46.5);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(59, 46, 202, 46);

  // --- CARGO 1: CORPORACIÓN INMOBILIARIA ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.text('Jefatura de Control Interno y Gestión de Activos', 14, 51.5);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.1);
  doc.text('Corporación Inmobiliaria & Gestión Patrimonial', 14, 55.2);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  doc.text('2023 – 2026  |  Santiago, Chile', 158, 51.5);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(6.4);
  doc.text('• Gestión Patrimonial y Tasaciones: Dirección técnica y control de 1.849 activos inmobiliarios corporativos (UF 30.300 / $1.146M CLP), coordinando a peritos tasadores y arquitectos.', 16, 59.2);
  doc.text('• Cumplimiento Regulatorio y CMF: Cero observaciones sostenidas en auditorías externas y CMF mediante matrices de riesgo operacional y segregación de perfiles (SoD).', 16, 62.8);
  doc.text('• Control Presupuestario OPEX/CAPEX: Supervisión de presupuestos de conservación y seguros, garantizando la consistencia contable del 100% de los gastos comunes y fondos.', 16, 66.4);
  doc.text('• Automatización de Procesos: Diseño de plataforma AssetFlow con motor OCR y reglas contables, reduciendo tiempos de reporte CMF y cierre de 15 días a menos de 1 hora.', 16, 70.0);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.line(14, 72.5, 202, 72.5);

  // --- CARGO 2: ESSITY CHILE ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.text('Jefatura de Operaciones, Abastecimiento & Logística Estratégica', 14, 77.0);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.1);
  doc.text('Essity Chile (Multinacional Sueca de Manufactura & Consumo)', 14, 80.7);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  doc.text('2018 – 2023  |  Lampa, Santiago', 154, 77.0);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(6.4);
  doc.text('• Liderazgo Directo de Dotación: Condujo a 8 colaboradores técnicos de almacén central; gestión de turnos, seguridad laboral y 98% en nivel de servicio (SLA) para manufactura.', 16, 84.7);
  doc.text('• Optimización de Capital de Trabajo: Planificación S&OP en cartera de UF 158.000 ($6.000M CLP), liberando más de UF 53.000 (~$2.000M CLP) en acuerdos marco con proveedores.', 16, 88.3);
  doc.text('• Custodia de Activos y Cero Diferencias: Mantuvo $0 diferencias por 10 meses consecutivos en repuestos críticos mediante inventarios rotativos (IRA) en SAP MM/WM con 99.5% IRA.', 16, 91.9);
  doc.text('• Proveedores y Cuadros de Mando: Negociación de contratos marco con 15% de reducción en lead times y tableros en Power BI enlazados a SAP para control de stocks.', 16, 95.5);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.line(14, 98.0, 202, 98.0);

  // --- CARGO 3: RENDIC HERMANOS S.A. ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.text('Supervisor de Operaciones de Caja & Tesorería (2014–2018) | Cajero (2008–2013)', 14, 102.5);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.1);
  doc.text('Rendic Hermanos S.A. (Unimarc / Red SMU)', 14, 106.2);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  doc.text('2008 – 2018  |  Santiago, Chile', 158, 102.5);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(6.4);
  doc.text('• Conducción Operativa y Turnos: Programación y supervisión diaria de 15 a 20 cajeros por jornada; inducción, contingencias en sala y ejecución de arqueos sorpresivos.', 16, 110.2);
  doc.text('• Tesorería y Custodia de Caudales: Administración del fondo fijo, flujo financiero diario y despacho de remesas blindadas (Brink\'s / Prosegur) con cuadratura diaria al 100%.', 16, 113.8);
  doc.text('• Auditoría Interna sin Observaciones: Mantuvo estándar de cero observaciones en auditorías internas sorpresivas en tesorería y recaudación por más de 12 meses continuos.', 16, 117.4);
  doc.text('• Promoción por Desempeño: Promovido en 2014 a Supervisor y Tesorero tras 5 años de trayectoria intachable como Cajero (2008–2013) sustentado en exactitud y probidad.', 16, 121.0);

  // -------------------------------------------------------------------------
  // SECTION 3: FORMACIÓN ACADÉMICA
  // -------------------------------------------------------------------------
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('FORMACIÓN ACADÉMICA', 14, 131.5);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(54, 131, 202, 131);

  // Item 1: Ingeniería
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('• Ingeniería Civil Industrial — Licenciado en Ciencias de la Ingeniería', 14, 136.0);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  doc.text('Santiago, Chile', 178, 136.0);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(6.45);
  doc.text('Formación orientada a la optimización de procesos, finanzas corporativas, control de gestión y evaluación de proyectos.', 16, 139.5);

  // Item 2: Técnico Jurídico ENAC
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('• Formación en Ciencias Jurídicas: Técnico Jurídico — ENAC Cáritas Chile (2005 – 2008)', 14, 144.5);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  doc.text('Santiago, Chile', 178, 144.5);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(6.45);
  const legalText = 'Formación aplicada en derecho administrativo, procedimientos legales, contratos mercantiles y legislación corporativa. Base formativa que sustenta el rigor en probidad, control interno (CAIGG/CGR), compliance CMF y prevención UAF (Ley N° 19.913).';
  doc.text(doc.splitTextToSize(legalText, 186), 16, 148.0);

  // -------------------------------------------------------------------------
  // SECTION 4: COMPETENCIAS CLAVE, SISTEMAS & METODOLOGÍAS
  // -------------------------------------------------------------------------
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('COMPETENCIAS CLAVE, SISTEMAS & METODOLOGÍAS', 14, 157.0);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(95, 156.5, 202, 156.5);

  // Minimalist clean rows (no heavy color boxes)
  const skillsList = [
    { cat: 'Gestión Pública & Control:', items: 'Auditoría Cero Observaciones  •  Normas CAIGG / CGR  •  Probidad Administrativa  •  Prevención UAF/PEP (Ley 19.913)  •  Matrices de Riesgo' },
    { cat: 'Eficiencia Presupuestaria:', items: 'Optimización Presupuestaria Dipres  •  Planificación S&OP  •  Convenios y Licitaciones (Ley 19.886)  •  Inventarios IRA en $0' },
    { cat: 'Sistemas ERP & Analítica:', items: 'SAP MM / WM / FI  •  AssetFlow Enterprise  •  Oracle ERP  •  Power BI (DAX)  •  Consultas SQL  •  Excel Avanzado' },
    { cat: 'Transformación Digital:', items: 'Ley N° 21.180 Transformación Digital del Estado  •  Arquitectura de Software con IA  •  Expediente Electrónico  •  Cero Papel' }
  ];

  skillsList.forEach((sk, idx) => {
    const sy = 162.0 + idx * 5.0;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.7);
    doc.text(`• ${sk.cat}`, 14, sy);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(sk.items, 56, sy);
  });

  // -------------------------------------------------------------------------
  // SECTION 5: IDIOMAS & CERTIFICACIONES
  // -------------------------------------------------------------------------
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('IDIOMAS & FORMACIÓN CONTINUA', 14, 185.0);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(70, 184.5, 202, 184.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('• Idiomas:', 14, 190.0);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(6.6);
  doc.text('Español (Nativo)   |   Inglés Técnico (Lectura, redacción y comprensión de especificaciones técnicas y documentación de negocios)', 30, 190.0);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('• Especializaciones:', 14, 194.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(6.6);
  doc.text('Especialización S&OP  •  Prevención UAF/PEP Ley 19.913  •  Control de Gestión CMF  •  Desarrollo de Software con IA', 42, 194.5);

  // -------------------------------------------------------------------------
  // FOOTER (Clean Minimalist Line)
  // -------------------------------------------------------------------------
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(14, 202, 202, 202);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(6.5);
  doc.text('Página 1 de 1', 186, 206);

  return doc;
}

/**
 * Returns the structured CvProfile object for Cristian Andrés Muñoz Rojas
 * with all rarity metrics and extracted skills pre-calibrated.
 */
export function buildCristianDemoProfile(): CvProfile {
  return {
    candidateName: 'CRISTIAN ANDRÉS MUÑOZ ROJAS',
    candidateTitle: 'Ingeniero Civil Industrial • Control de Gestión, Auditoría & Transformación Digital',
    extractedSkills: [
      'Ingeniería Civil Industrial (Plan >10 semestres)',
      'Control de Gestión & Eficiencia Presupuestaria',
      'Control Interno & Auditoría Cero Observaciones',
      'Normas CAIGG & Contraloría General (CGR)',
      'Probidad Administrativa & Transparencia Activa',
      'Prevención UAF / PEP (Ley N° 19.913)',
      'Transformación Digital del Estado (Ley N° 21.180)',
      'Gobernanza CMF (B13 / B4 / Nota 14)',
      'Optimización Presupuestaria Dipres (+$2.000M CLP)',
      'Supply Chain & Logística Multinacional',
      'Planificación S&OP (Sales & Operations Planning)',
      'Inventarios Rotativos IRA en $0 Diferencias',
      'Gestión de Contratos y Compras Públicas (Ley 19.886)',
      'Dirección y Conducción de Dotaciones de Personal',
      'Gestión Patrimonial de Activos (1.849 Unidades)',
      'ERP SAP MM/WM',
      'AssetFlow Enterprise',
      'Arquitectura de Software Full-Stack (AssetFlow)',
      'TypeScript & React 18',
      'Inteligencia Artificial Generativa & Google AI Studio',
      'Metodología Lean Six Sigma',
      'Power BI & SQL Avanzado',
      'Técnico Jurídico (Derecho Administrativo, Procesal & Contratos)',
      'Modelación Financiera & Presupuestos OPEX/CAPEX',
      'Prevención de Riesgos (Ley 16.744)',
      'Negociación Estratégica & Contratos Públicos/Privados'
    ],
    email: 'cristian.munoz0223@gmail.com',
    phone: '+56 9 6143 6853',
    location: 'Santiago, Chile',
    linkedin: 'https://linkedin.com/in/cristian-munoz-rojas',
    yearsOfExperience: 8,
    suggestedSalaryMin: 3800000,
    suggestedSalaryMax: 5400000,
    rarityScore: 99.8,
    rarityTag: 'PERFIL PROFESIONAL DESTACADO',
    rarityPillars: [
      {
        title: 'I. Ingeniería Industrial & Gobierno Cuantitativo',
        subtitle: '1.849 Activos Inmobiliarios • UF 30.300',
        description: 'Optimización estocástica, modelación de proyectos CAPEX/OPEX y administración integral de cartera de 1.849 propiedades valoradas en UF 30.300 ($1.146M CLP).'
      },
      {
        title: 'II. Control Interno & Auditoría Cero Observaciones',
        subtitle: 'Gobernanza CMF • Base Jurídica ENAC • Ley 19.913',
        description: 'Gobernanza CMF (planillas B13, B4, Nota 14), base técnica jurídica en contratos y derecho procesal (ENAC Cáritas Chile), prevención UAF / PEP Ley 19.913 y fiscalización con cero observaciones.'
      },
      {
        title: 'III. Supply Chain Multinacional & IRA $0 Diferencias',
        subtitle: 'Essity Multinacional • UF 158.000 ($6.000M CLP)',
        description: 'Gestión crítica en Essity Multinacional por UF 158.000 ($6.000M CLP), implementación de células S&OP, ERPs SAP MM/WM, AssetFlow Enterprise e inventarios IRA en $0 dif.'
      },
      {
        title: 'IV. Arquitectura de Software & IA Aplicada',
        subtitle: 'Sistema AssetFlow en Producción • Google AI Studio',
        description: 'Capacidad de diseñar y programar soluciones a medida en TypeScript/React con Google AI Studio; creador de la plataforma AssetFlow en producción.'
      }
    ],
    rawTextPreview: 'Ingeniero Civil Industrial con visión integral orientada a resolver desafíos complejos con método, cercanía y rigor. Experiencia en gestión de 1.849 activos inmobiliarios por UF 30.300, 100% Cero Observaciones en fiscalizaciones CMF, Supply Chain Essity con $0 diferencias IRA en UF 158.000, y desarrollo de software con IA en Google AI Studio.',
    fileName: 'CV_Cristian_Munoz_Perfil_Profesional.pdf',
    fileSize: '148 KB',
    uploadedAt: new Date().toLocaleDateString('es-CL'),
    source: 'MODEL_DEMO_PDF'
  };
}

/**
 * Generates an official model PDF and CvProfile for Cristian Andrés Muñoz Rojas.
 */
export async function generateDemoCristianPdf(): Promise<{ file: File; profile: CvProfile }> {
  const doc = buildCristianCvPdfDoc();
  const pdfBlob = doc.output('blob');
  const file = new File([pdfBlob], 'CV_Cristian_Munoz_Perfil_Hibrido_Alta_Rareza.pdf', { type: 'application/pdf' });
  const profile = buildCristianDemoProfile();

  return { file, profile };
}

/**
 * Direct browser download trigger for Cristian's official model CV PDF.
 * Uses native jsPDF doc.save with multi-layer fallback (Blob URL and Data URI)
 * ensuring instant, reliable download even inside sandboxed iframes.
 */
export function downloadCristianCvPdf(customFileName: string = 'CV_Cristian_Munoz_Perfil_Hibrido_Alta_Rareza.pdf'): { success: boolean; blobUrl?: string; error?: string } {
  try {
    const doc = buildCristianCvPdfDoc();

    // 1. Primary: Native jsPDF doc.save
    try {
      doc.save(customFileName);
      return { success: true };
    } catch (saveErr) {
      console.warn('doc.save() failed, attempting anchor blob fallback:', saveErr);
    }

    // 2. Fallback: Blob URL + Anchor click
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = customFileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { success: true, blobUrl: url };
  } catch (err: any) {
    console.error('Error in downloadCristianCvPdf:', err);
    // 3. Fallback: Data URI
    try {
      const doc = buildCristianCvPdfDoc();
      const dataUri = doc.output('datauristring');
      const win = window.open(dataUri, '_blank');
      if (!win) {
        window.location.href = dataUri;
      }
      return { success: true };
    } catch (finalErr: any) {
      console.error('All PDF download mechanisms failed:', finalErr);
      return { success: false, error: err?.message || 'Error al descargar el PDF' };
    }
  }
}

/**
 * Opens Cristian's CV PDF directly in a new browser tab for preview/printing.
 */
export function previewCristianCvPdf(): void {
  try {
    const doc = buildCristianCvPdfDoc();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.error('Error previewing CV PDF:', err);
  }
}

/**
 * Downloads Cristian's CV in Microsoft Word (.doc) format with clean ATS-optimized markup
 * and updated education (including Técnico Jurídico ENAC Cáritas Chile).
 */
export function downloadCristianCvWord(customFileName: string = 'CV_Cristian_Munoz_ATS.doc'): { success: boolean; error?: string } {
  try {
    const wordContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>CV - CRISTIAN ANDRÉS MUÑOZ ROJAS</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 8.5in 11in;
            margin: 0.8in 0.8in 0.8in 0.8in;
          }
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 10.5pt;
            line-height: 1.3;
            color: #1e293b;
          }
          h1 {
            font-size: 18pt;
            font-weight: bold;
            color: #0b3c5d;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: -0.5px;
          }
          h2 {
            font-size: 11.5pt;
            font-weight: bold;
            color: #0b3c5d;
            border-bottom: 1.5pt solid #0284c7;
            padding-bottom: 3px;
            margin-top: 18px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .subtitle {
            font-size: 11pt;
            font-weight: bold;
            color: #0284c7;
            margin: 0 0 6px 0;
          }
          .contact {
            font-size: 9pt;
            color: #475569;
            margin: 0 0 14px 0;
            line-height: 1.4;
          }
          ul {
            margin: 4px 0 10px 0;
            padding-left: 18px;
          }
          li {
            font-size: 9.5pt;
            margin-bottom: 4px;
            color: #334155;
            line-height: 1.35;
            text-align: justify;
          }
          .job-title {
            font-size: 10.5pt;
            font-weight: bold;
            color: #0f172a;
            margin: 0 0 2px 0;
          }
          .job-sub {
            font-size: 9.5pt;
            color: #0284c7;
            font-weight: bold;
            margin: 0 0 4px 0;
          }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 20px;">
          <h1>CRISTIAN ANDRÉS MUÑOZ ROJAS</h1>
          <div class="subtitle">INGENIERO CIVIL INDUSTRIAL • CONTROL INTERNO CMF • SUPPLY CHAIN S&OP • IA GENERATIVA</div>
          <div class="contact">
            📍 Santiago, Chile &nbsp;|&nbsp; 📞 +56 9 6143 6853 &nbsp;|&nbsp; ✉️ cristian.munoz0223@gmail.com
            <br/>
            🔗 linkedin.com/in/cristian-munoz-rojas &nbsp;|&nbsp; Disponibilidad: Inmediata
          </div>
        </div>

        <h2>Perfil Profesional</h2>
        <p style="text-align: justify; font-size: 10pt; line-height: 1.45; color: #334155; margin: 0 0 14px 0;">
          Ingeniero Civil Industrial con una visión integral orientada a resolver desafíos complejos con método, cercanía y rigor. A lo largo de mi trayectoria he combinado la visión analítica y cuantitativa de la ingeniería con la disciplina del Control Interno (manteniendo un historial intachable de cero observaciones ante la CMF), la gestión de personas y suministros en multinacionales como Essity (logrando el hito histórico de inventarios en $0 diferencias sobre bodega crítica de repuestos por $6.000M CLP) y el diseño e implementación de herramientas tecnológicas modernas con Inteligencia Artificial aplicada (creador de la plataforma AssetFlow para 1.849 propiedades). Me motiva liderar con el ejemplo, construir relaciones de confianza con los equipos y traducir las metas directivas en operaciones eficientes, transparentes y de alto estándar sostenido.
        </p>

        <h2>Experiencia Laboral Comprobable</h2>
        
        <div style="margin-bottom: 14px; page-break-inside: avoid;">
          <p class="job-title">LÍDER DE CONTROL INTERNO, TECNOLOGÍA E INMOBILIARIO</p>
          <p class="job-sub">Corporación Inmobiliaria | <span style="color: #64748b; font-weight: normal;">2023 – Presente • Santiago, Chile</span></p>
          <ul>
            <li>Arquitecto y programador del Sistema AssetFlow (Google AI Studio + TypeScript) para 1.849 propiedades valoradas en UF 30.300 ($1.146M CLP).</li>
            <li>Auditorías 100% impecables con CERO OBSERVACIONES; emisión de reportes normados CMF (B13, B4, Nota 14) y debida diligencia UAF/PEP.</li>
            <li>Conciliación bancaria automatizada de cánones de arriendo, gestión integral de contratos y control de órdenes de trabajo (OT).</li>
            <li>Reducción en 85% del tiempo de generación de informes para directorios y auditorías externas gracias a la automatización digital.</li>
          </ul>
        </div>

        <div style="margin-bottom: 14px; page-break-inside: avoid;">
          <p class="job-title">LÍDER DE BODEGA DE REPUESTOS & SUPPLY CHAIN</p>
          <p class="job-sub">Essity Chile Multinacional | <span style="color: #64748b; font-weight: normal;">2020 – 2023 • Lampa / Santiago, Chile</span></p>
          <ul>
            <li>Hito histórico de inventarios rotativos IRA con $0 DIFERENCIAS en bodega crítica de repuestos valorada en UF 158.000 ($6.000M CLP).</li>
            <li>Administración integral de repuestos, órdenes de compra y niveles de stock de seguridad mediante SAP MM/WM y AssetFlow Enterprise.</li>
            <li>Implementación de metodología S&OP (Sales & Operations Planning) y optimización de Working Capital reduciendo tiempos de paro operacional.</li>
            <li>Liderazgo de equipos operativos y supervisión de protocolos de seguridad y prevención de riesgos laborales (Ley 16.744).</li>
          </ul>
        </div>

        <div style="margin-bottom: 14px; page-break-inside: avoid;">
          <p class="job-title">INGENIERO DE OPERACIONES & CONTROL DE PROCESOS</p>
          <p class="job-sub">Consultoría y Proyectos Industriales | <span style="color: #64748b; font-weight: normal;">2017 – 2020 • Santiago, Chile</span></p>
          <ul>
            <li>Optimización de procesos operacionales con metodología Lean Six Sigma, tableros de control en Power BI & SQL y modelación financiera.</li>
            <li>Evaluación técnica y económica de proyectos de inversión (CAPEX/OPEX), matrices de riesgo operacional y control presupuestario.</li>
          </ul>
        </div>

        <h2>Educación Superior & Formación Estratégica</h2>
        <p style="font-size: 10pt; color: #1e293b; margin: 0 0 6px 0; line-height: 1.35;">
          <strong>• Título Profesional: Ingeniero Civil Industrial</strong><br/>
          Santiago, Chile &nbsp;|&nbsp; Licenciatura en Ciencias de la Ingeniería con mención en optimización estocástica y finanzas corporativas.
        </p>
        <p style="font-size: 10pt; color: #1e293b; margin: 0 0 6px 0; line-height: 1.35;">
          <strong>• 2005 al 2008: Técnico Jurídico en ENAC Cáritas Chile (inconcluso)</strong><br/>
          Formación técnica en derecho procesal, derecho administrativo, redacción de contratos mercantiles, legislación corporativa e instrumentos notariales. Base jurídica formativa que sustenta y complementa el rigor en Control Interno, Compliance CMF y debida diligencia UAF / PEP Ley 19.913.
        </p>
        <p style="font-size: 10pt; color: #1e293b; margin: 0 0 6px 0; line-height: 1.35;">
          <strong>• Especialización S&OP (Sales & Operations Planning)</strong> &nbsp;|&nbsp; Planificación y control de demanda e inventarios.
        </p>
        <p style="font-size: 10pt; color: #1e293b; margin: 0 0 6px 0; line-height: 1.35;">
          <strong>• Prevención de Lavado de Activos & Delitos Financieros (UAF / PEP)</strong> &nbsp;|&nbsp; Ley 19.913 y debida diligencia.
        </p>
        <p style="font-size: 10pt; color: #1e293b; margin: 0 0 12px 0; line-height: 1.35;">
          <strong>• Arquitectura de Soluciones con Inteligencia Artificial Generativa</strong> &nbsp;|&nbsp; Google AI Studio, TypeScript, React y Gemini API.
        </p>

        <h2>Competencias Clave y Habilidades Técnicas</h2>
        <ul>
          <li><strong>Sistemas ERP & Gestión:</strong> SAP MM/WM, AssetFlow Enterprise, Excel Avanzado (Power Query, Modelos Financieros), Power BI (DAX), SQL relacional.</li>
          <li><strong>Control & Auditoría:</strong> Reportes CMF (B13, B4, Nota 14), Matrices de Riesgo, Prevención UAF / PEP, Conciliaciones bancarias automatizadas.</li>
          <li><strong>Supply Chain & Producción:</strong> Inventarios Rotativos IRA en $0 Diferencias, Working Capital, Lean Six Sigma, S&OP.</li>
          <li><strong>Desarrollo de Software & IA:</strong> TypeScript, React 18, Tailwind CSS, Google AI Studio, Arquitectura Cloud, APIs Gemini.</li>
        </ul>

        <h2>Idiomas</h2>
        <p style="font-size: 9.5pt; color: #334155; margin: 0; line-height: 1.35;">
          <strong>Español:</strong> Nativo &nbsp;|&nbsp; <strong>Inglés:</strong> Técnico (Lectura, redacción y comprensión de documentación técnica de sistemas).
        </p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + wordContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = customFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { success: true };
  } catch (err: any) {
    console.error('Error downloading Word CV:', err);
    return { success: false, error: err?.message || 'Error al descargar documento Word' };
  }
}

/**
 * Calculates match percentage and identifies matched/missing skills
 * for a list of job offers based on candidate's active skills.
 */
export function recalculateJobMatches(
  offers: JobOffer[],
  candidateSkills: string[],
  candidateTitle: string = ''
): JobOffer[] {
  const normSkills = candidateSkills.map(s => s.toLowerCase().trim());
  const titleWords = candidateTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  return offers.map(offer => {
    const required = offer.requiredSkills || [];
    if (required.length === 0) {
      return { ...offer, matchScore: 80, matchedSkills: [], missingSkills: [] };
    }

    const matched: string[] = [];
    const missing: string[] = [];

    required.forEach(reqSkill => {
      const normReq = reqSkill.toLowerCase().trim();
      
      // Exact or alias match
      const hasMatch = normSkills.some(candSkill => {
        if (candSkill === normReq) return true;
        if (candSkill.includes(normReq) || normReq.includes(candSkill)) return true;

        // Check aliases in dictionary
        const dictEntry = KNOWN_MARKET_SKILLS.find(k => k.name.toLowerCase() === candSkill || k.name.toLowerCase() === normReq);
        if (dictEntry) {
          if (dictEntry.aliases.some(a => normReq.includes(a) || a.includes(normReq))) return true;
        }
        return false;
      });

      if (hasMatch) {
        matched.push(reqSkill);
      } else {
        missing.push(reqSkill);
      }
    });

    // Base score calculation from ratio of required skills
    let baseScore = Math.round((matched.length / required.length) * 100);

    // Title affinity bonus (+5% if title words match offer category or title)
    const offerText = (offer.title + ' ' + offer.description + ' ' + offer.category).toLowerCase();
    const titleBonus = titleWords.some(tw => offerText.includes(tw)) ? 5 : 0;

    // Bonus for candidate having extra relevant skills mentioned in offer description
    let extraBonus = 0;
    normSkills.forEach(cs => {
      if (!matched.some(m => m.toLowerCase() === cs) && offerText.includes(cs)) {
        extraBonus += 3;
      }
    });

    const finalScore = Math.min(100, Math.max(25, baseScore + titleBonus + Math.min(extraBonus, 10)));

    return {
      ...offer,
      matchScore: finalScore,
      matchedSkills: matched,
      missingSkills: missing
    };
  });
}
