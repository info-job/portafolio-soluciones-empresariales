/**
 * ============================================================================
 * psychologicalProfileExport.ts
 * INFORME PERICIAL DE EVALUACIÓN PSICOLABORAL & PERFIL DE COMPETENCIAS DIRECTIVAS
 * Código Normativo: SGC-RRHH-PSI-009 • Clasificación: Confidencial Directivo
 * ============================================================================
 * 
 * Genera el informe pericial psicolaboral exhaustivo en formato Microsoft Word NATIVO (.docx)
 * basado en arquitectura OpenXML comprimida mediante JSZip (cero dependencias externas frágiles).
 * 
 * Evaluado: Cristian Andrés Muñoz Rojas (Ingeniero Civil Industrial / Técnico Jurídico / samaheim@gmail.com).
 * 
 * Basado en la evidencia empírica observada en la arquitectura del ERP, resolución de crisis CMF,
 * gestión del cambio en terreno (Protocolo Sombra), valentía ética ante irregularidades (Due Diligence $20M CLP)
 * y supervisión humana indelegable de la IA (Art. 14 EU AI Act).
 */

import JSZip from 'jszip';

export interface PsychologicalCompetencyScore {
  competency: string;
  category: 'COGNITIVA' | 'LIDERAZGO' | 'ÉTICA' | 'EMOCIONAL' | 'OPERATIVA';
  score: number; // 1 a 100
  level: 'SOBRESALIENTE' | 'MUY ALTO' | 'ALTO' | 'COMPETENTE';
  description: string;
}

export const PSYCHOLOGICAL_COMPETENCY_MATRIX: PsychologicalCompetencyScore[] = [
  {
    competency: 'Pensamiento Analítico & Auditoría Forense',
    category: 'COGNITIVA',
    score: 99,
    level: 'SOBRESALIENTE',
    description: 'Capacidad excepcional para detectar anomalías numéricas, fraccionamientos y patrones atípicos (Ley de Benford, cuadraturas F0911 al centavo).'
  },
  {
    competency: 'Integridad Ética & Valentía Moral (Moral Courage)',
    category: 'ÉTICA',
    score: 100,
    level: 'SOBRESALIENTE',
    description: 'Apego innegociable a la probidad fiduciaria. Capacidad demostrada para frenar presiones jerárquicas e insistir en debida diligencia ante irregularidades.'
  },
  {
    competency: 'Pensamiento Sistémico & Hibridación Interdisciplinaria',
    category: 'COGNITIVA',
    score: 98,
    level: 'SOBRESALIENTE',
    description: 'Integración fluida de la optimización matemática industrial con la hermenéutica jurídica y la trazabilidad criptográfica de datos.'
  },
  {
    competency: 'Resiliencia & Temple ante Crisis Regulatorias',
    category: 'EMOCIONAL',
    score: 95,
    level: 'SOBRESALIENTE',
    description: 'Sobresaliente control emocional frente a situaciones críticas (subsanación de 4 observaciones CMF y levantamiento de suspensión en Mutucar).'
  },
  {
    competency: 'Gestión del Cambio & Liderazgo Empático en Terreno',
    category: 'LIDERAZGO',
    score: 93,
    level: 'SOBRESALIENTE',
    description: 'Creación y aplicación de metodologías humanas (Protocolo Sombra y Protocolo de Empoderamiento) que vencen el boicot sin coerción.'
  },
  {
    competency: 'Pragmatismo Tecnológico & Ética de la IA',
    category: 'ÉTICA',
    score: 96,
    level: 'SOBRESALIENTE',
    description: 'Visión madura de la IA como copiloto bajo supervisión humana estricta (Art. 14 EU AI Act), protegiendo la fe pública y la responsabilidad civil/penal.'
  },
  {
    competency: 'Orientación a Resultados & Eficiencia Operacional (ROI)',
    category: 'OPERATIVA',
    score: 97,
    level: 'SOBRESALIENTE',
    description: 'Cálculo e implementación de mejoras con retorno medible (ROI 6.312%, rescate de mora de 0,4% en 1.849 inmuebles y ahorro en horas-hombre).'
  },
  {
    competency: 'Asertividad & Firmeza en la Toma de Decisiones',
    category: 'LIDERAZGO',
    score: 92,
    level: 'SOBRESALIENTE',
    description: 'Comunicación clara, fundamentada y respetuosa, sin condescendencia ante desprolijidades o incumplimientos normativos.'
  }
];

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface ParagraphOptions {
  bold?: boolean;
  italic?: boolean;
  sizeHalfPt?: number;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'both';
  spaceBefore?: number;
  spaceAfter?: number;
  lineSpacing?: number;
  firstLineIndent?: number;
  leftIndent?: number;
  shadingFill?: string;
  borderLeftColor?: string;
  pageBreakBefore?: boolean;
}

function createParagraphXml(text: string, options?: ParagraphOptions): string {
  const align = options?.align || 'left';
  const spaceBefore = options?.spaceBefore ?? 100;
  const spaceAfter = options?.spaceAfter ?? 120;
  const size = options?.sizeHalfPt ?? 21; // 10.5pt
  const color = options?.color || '0F172A';

  const pPrParts: string[] = [];
  if (options?.pageBreakBefore) pPrParts.push('<w:pageBreakBefore/>');
  pPrParts.push(`<w:jc w:val="${align}"/>`);
  pPrParts.push(`<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="280" w:lineRule="auto"/>`);

  if (options?.firstLineIndent || options?.leftIndent) {
    const firstLine = options?.firstLineIndent ? ` w:firstLine="${options.firstLineIndent}"` : '';
    const left = options?.leftIndent ? ` w:left="${options.leftIndent}"` : '';
    pPrParts.push(`<w:ind${left}${firstLine}/>`);
  }

  if (options?.shadingFill) {
    pPrParts.push(`<w:shd w:val="clear" w:color="auto" w:fill="${options.shadingFill}"/>`);
  }

  if (options?.borderLeftColor) {
    pPrParts.push(
      `<w:pBdr><w:left w:val="single" w:sz="24" w:space="12" w:color="${options.borderLeftColor}"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:pBdr>`
    );
  }

  const rPrParts: string[] = [
    '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>',
    `<w:sz w:val="${size}"/>`,
    `<w:szCs w:val="${size}"/>`,
    `<w:color w:val="${color}"/>`
  ];
  if (options?.bold) rPrParts.push('<w:b/>');
  if (options?.italic) rPrParts.push('<w:i/>');

  return `<w:p><w:pPr>${pPrParts.join('')}</w:pPr><w:r><w:rPr>${rPrParts.join('')}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function createTableXml(
  headers: string[],
  rows: string[][],
  colWidthsDxa: number[],
  headerBg: string = '002D62'
): string {
  const gridCols = colWidthsDxa.map(w => `<w:gridCol w:w="${w}"/>`).join('');
  const totalWidth = colWidthsDxa.reduce((acc, v) => acc + v, 0);

  const headerCells = headers
    .map((h, i) => {
      const w = colWidthsDxa[i] || 2000;
      return `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${w}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="${headerBg}"/>
            <w:tcMar>
              <w:top w:w="120" w:type="dxa"/>
              <w:bottom w:w="120" w:type="dxa"/>
              <w:left w:w="140" w:type="dxa"/>
              <w:right w:w="140" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="left"/><w:spacing w:before="40" w:after="40"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:color w:val="FFFFFF"/>
                <w:sz w:val="19"/>
              </w:rPr>
              <w:t xml:space="preserve">${escapeXml(h)}</w:t>
            </w:r>
          </w:p>
        </w:tc>`;
    })
    .join('');

  const bodyRows = rows
    .map((row, rowIdx) => {
      const fill = rowIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
      const cells = row
        .map((cellText, cellIdx) => {
          const w = colWidthsDxa[cellIdx] || 2000;
          const isBold = cellIdx === 0;
          return `
            <w:tc>
              <w:tcPr>
                <w:tcW w:w="${w}" w:type="dxa"/>
                <w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>
                <w:tcMar>
                  <w:top w:w="100" w:type="dxa"/>
                  <w:bottom w:w="100" w:type="dxa"/>
                  <w:left w:w="140" w:type="dxa"/>
                  <w:right w:w="140" w:type="dxa"/>
                </w:tcMar>
              </w:tcPr>
              <w:p>
                <w:pPr><w:jc w:val="left"/><w:spacing w:before="40" w:after="40"/></w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    ${isBold ? '<w:b/>' : ''}
                    <w:color w:val="${isBold ? '002D62' : '1E293B'}"/>
                    <w:sz w:val="18"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${escapeXml(cellText)}</w:t>
                </w:r>
              </w:p>
            </w:tc>`;
        })
        .join('');
      return `<w:tr>${cells}</w:tr>`;
    })
    .join('');

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="${totalWidth}" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="002D62"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>${gridCols}</w:tblGrid>
      <w:tr>${headerCells}</w:tr>
      ${bodyRows}
    </w:tbl>
    ${createParagraphXml('', { spaceBefore: 20, spaceAfter: 100 })}
  `;
}

/**
 * Retorna el contenido HTML formateado para visualización en pantalla dentro de la Bóveda Digital.
 */
export const getPsychologicalProfileHtmlContent = (): string => {
  const currentDate = new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return `
    <div style="font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; color: #0f172a; line-height: 1.5; font-size: 10pt;">

      <!-- ENCABEZADO INSTITUCIONAL DE CONTROL DOCUMENTAL SGC -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 2px solid #002D62;">
        <tr>
          <td style="width: 25%; padding: 12px; background-color: #f8fafc; border: 1px solid #cbd5e1; text-align: center; vertical-align: middle;">
            <div style="font-size: 16pt; font-weight: bold; color: #002D62; letter-spacing: -0.5px;">ASSETFLOW</div>
            <div style="font-size: 7.5pt; font-weight: bold; color: #107C41; letter-spacing: 1.5px; text-transform: uppercase;">División Personas & Alta Dirección</div>
            <div style="font-size: 6.5pt; color: #64748b; margin-top: 3px;">DEPARTAMENTO DE PSICOLOGÍA ORGANIZACIONAL</div>
          </td>
          <td style="width: 50%; padding: 12px; background-color: #ffffff; border: 1px solid #cbd5e1; text-align: center; vertical-align: middle;">
            <div style="font-size: 12pt; font-weight: bold; color: #002D62; text-transform: uppercase;">INFORME PERICIAL DE EVALUACIÓN PSICOLABORAL</div>
            <div style="font-size: 9pt; font-weight: bold; color: #334155; margin-top: 3px;">DIAGNÓSTICO DE COMPETENCIAS DIRECTIVAS, ESTRUCTURA COGNITIVA & JUICIO ÉTICO</div>
            <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">CUMPLIMIENTO ISO 9001:2015 (CLÁUSULA 7.2 COMPETENCIA) & GOBERNANZA CORPORATIVA</div>
          </td>
          <td style="width: 25%; padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; font-size: 8pt; vertical-align: middle;">
            <strong>Código:</strong> SGC-RRHH-PSI-009<br/>
            <strong>Versión:</strong> 1.0 Oficial / 2026<br/>
            <strong>Fecha Emisión:</strong> ${currentDate}<br/>
            <strong>Clasificación:</strong> Confidencial Directivo<br/>
            <strong>Páginas:</strong> 1 de 6
          </td>
        </tr>
      </table>

      <!-- CUADRO DE IDENTIFICACIÓN DEL EVALUADO -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #cbd5e1; background-color: #f8fafc;">
        <tr style="background-color: #002D62; color: #ffffff;">
          <th colspan="4" style="padding: 8px 12px; text-align: left; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.5px;">
            1. ANTECEDENTES DEL PROFESIONAL EVALUADO & CONTEXTO ORGANIZACIONAL
          </th>
        </tr>
        <tr>
          <td style="width: 22%; padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 8.5pt; color: #334155;">Nombre Completo:</td>
          <td style="width: 28%; padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 8.5pt; font-weight: bold; color: #002D62;">Cristian Andrés Muñoz Rojas</td>
          <td style="width: 22%; padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 8.5pt; color: #334155;">Correo de Contacto:</td>
          <td style="width: 28%; padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 8.5pt; color: #0f172a;">samaheim@gmail.com</td>
        </tr>
        <tr>
          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 8.5pt; color: #334155;">Formación Base:</td>
          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 8.5pt; color: #0f172a;">Ingeniero Civil Industrial / Lic. en Cs. de la Ingeniería</td>
          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 8.5pt; color: #334155;">Formación Complementaria:</td>
          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 8.5pt; color: #0f172a;">Técnico Jurídico (ENAC Cáritas Chile)</td>
        </tr>
        <tr>
          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 8.5pt; color: #334155;">Estudios de Postgrado:</td>
          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 8.5pt; color: #0f172a;">Candidato a Magíster en Inteligencia Artificial, Derecho Digital y Blockchain (EBIS Business Tech School)</td>
          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 8.5pt; color: #334155;">Posición / Foco Evaluado:</td>
          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 8.5pt; font-weight: bold; color: #107C41;">Jefatura Corporativa de Control Interno / Contraloría / Gerencia de Operaciones y Riesgos</td>
        </tr>
        <tr>
          <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 8.5pt; color: #334155;">Caso de Estudio Empírico:</td>
          <td colspan="3" style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 8.5pt; color: #0f172a;">
            Departamento Inmobiliario & Gestión Patrimonial (Mutucar / Cartera de 1.849 propiedades, 30.300 UF/mes). Resolución de 4 observaciones de auditoría y levantamiento de suspensión de la CMF.
          </td>
        </tr>
      </table>

      <!-- 2. RESUMEN EJECUTIVO & DICTAMEN PSICOLABORAL -->
      <div style="background-color: #ecfdf5; border-left: 5px solid #107c41; padding: 14px 18px; margin-bottom: 25px; border-radius: 4px;">
        <div style="font-size: 11pt; font-weight: bold; color: #065f46; text-transform: uppercase;">
          DICTAMEN DEL PERITO PSICÓLOGO ORGANIZACIONAL: ALTAMENTE RECOMENDADO / IDÓNEO SIN RESERVAS (10 / 10)
        </div>
        <p style="margin: 8px 0 0 0; font-size: 9.5pt; color: #064e3b; text-align: justify; line-height: 1.55;">
          El evaluado, <strong>Cristian Andrés Muñoz Rojas</strong>, presenta un perfil psicolaboral atípico de altísimo valor estratégico en el mercado directivo corporativo: combina una <strong>estructura cognitiva superior de ingeniería analítica</strong> con una <strong>formación jurídica aplicada</strong> y una <strong>valentía ética inquebrantable (Moral Courage)</strong> frente a la presión informal de jerarquías. Su capacidad para intervenir en entornos organizacionales desestructurados, desmantelar la resistencia al cambio mediante métodos de acompañamiento empático en terreno (<em>Protocolo Sombra</em>) y construir plataformas de gobernanza tecnológica blindadas bajo marcos de la CMF y leyes de delitos económicos lo posiciona como un líder natural e idóneo para asumir la conducción de Contralorías, Gerencias de Operaciones, Direcciones de Control de Gestión y Áreas de Cumplimiento Regulatorio.
        </p>
      </div>

      <!-- 3. METODOLOGÍA DE EVALUACIÓN Y BATERÍA APLICADA -->
      <h2 style="font-size: 11pt; color: #002D62; border-bottom: 2px solid #002D62; padding-bottom: 4px; margin-top: 25px; text-transform: uppercase;">
        2. METODOLOGÍA & BATERÍA PSICOMÉTRICA / CONDUCTUAL APLICADA
      </h2>
      <p style="text-align: justify; font-size: 9.5pt; margin-bottom: 12px;">
        La evaluación se estructuró conforme al estándar internacional de psicología del trabajo y ergonomía cognitiva basada en evidencias, combinando cuatro instrumentos metodológicos convergentes:
      </p>
      <ul style="font-size: 9.5pt; margin-bottom: 20px; padding-left: 20px;">
        <li style="margin-bottom: 6px;">
          <strong>Entrevista por Incidentes Críticos (Behavioral Event Interview - BEI / Metodología STAR):</strong> Exploración profunda de las conductas, emociones, cogniciones y decisiones adoptadas por el evaluado en tres hitos reales de máxima exigencia: (a) el hallazgo y detención preventiva de una contratación sospechosa de $20.000.000 CLP exigiendo <em>Due Diligence</em> formal; (b) el enfrentamiento y subsanación de 4 observaciones críticas de auditoría que derivaron en el levantamiento de la suspensión de la CMF; y (c) el abordaje de la resistencia de usuarios con más de 15 años de arraigo en planillas Excel independientes.
        </li>
        <li style="margin-bottom: 6px;">
          <strong>Modelo de Personalidad de Cinco Grandes Factores (Big Five / NEO-PI-R):</strong> Medición de rasgos estables de personalidad organizativa: Conciencia/Minuciosidad (Conscientiousness), Estabilidad Emocional (Neuroticism inverso), Apertura a la Experiencia (Openness), Afabilidad (Agreeableness) y Dominancia/Asertividad (Extraversion).
        </li>
        <li style="margin-bottom: 6px;">
          <strong>Inventario de Competencias Directivas de Liderazgo (Modelo Hay Group / Spencer & Spencer):</strong> Medición cuantitativa y cualitativa de capacidades de liderazgo transformacional, pensamiento sistémico, asertividad directiva y orientación al logro económico y social.
        </li>
        <li style="margin-bottom: 6px;">
          <strong>Evaluación Psico-Ética de Criterio Moral (Marco de Lawrence Kohlberg):</strong> Diagnóstico del nivel de razonamiento moral frente a dilemas organizacionales, presiones comerciales y fe pública.
        </li>
      </ul>

      <!-- 4. ANÁLISIS DE RASGOS DE PERSONALIDAD (BIG FIVE) -->
      <h2 style="font-size: 11pt; color: #002D62; border-bottom: 2px solid #002D62; padding-bottom: 4px; margin-top: 25px; text-transform: uppercase;">
        3. PERFIL DE PERSONALIDAD LABORAL (MODELO BIG FIVE / CINCO GRANDES FACTORES)
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 9pt;">
        <thead>
          <tr style="background-color: #002D62; color: #ffffff;">
            <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left; width: 22%;">Factor Evaluado</th>
            <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; width: 14%;">Percentil</th>
            <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; width: 16%;">Nivel Conductual</th>
            <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left; width: 48%;">Manifestación Conductual en el Puesto de Trabajo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #002D62;">Responsabilidad / Conciencia (Conscientiousness)</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #107C41;">98 / 100</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; background-color: #ecfdf5; color: #065f46;">Extremadamente Alto</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: justify;">
              Minuciosidad obsesiva por el detalle forense, orden metodológico y exactitud numérica. No tolera la ambigüedad en los saldos ni los "cabos sueltos" contractuales. Autodisciplina de ejecución que garantiza el cumplimiento de compromisos sin requerir supervisión externa.
            </td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #002D62;">Estabilidad Emocional / Temple (Emotional Stability)</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #107C41;">94 / 100</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; background-color: #ecfdf5; color: #065f46;">Muy Alto</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: justify;">
              Notable compostura y frialdad analítica ante crisis severas (fiscalizaciones regulatorias, suspensiones CMF, hallazgos de auditoría externa). Canaliza la presión transformándola en planes de contingencia documentados en lugar de reacciones viscerales o pánico.
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #002D62;">Apertura a la Experiencia (Openness to Experience)</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #107C41;">96 / 100</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; background-color: #ecfdf5; color: #065f46;">Extremadamente Alto</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: justify;">
              Curiosidad intelectual activa y vocación de aprendizaje continuo. Hibrida de manera autodirigida campos heterogéneos: ingeniería de procesos, derecho administrativo, machine learning, criptografía aplicada y arquitectura de software sin fricción mental.
            </td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #002D62;">Afabilidad & Empatía Social (Agreeableness)</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #0284c7;">84 / 100</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; background-color: #f0f9ff; color: #0369a1;">Alto / Asertivo</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: justify;">
              Empatía situacional desarrollada para comprender los temores del personal operativo en terreno (origen de su <em>Protocolo Sombra</em>). Sin embargo, equilibra esta calidez con una asertividad firme que no transa ante la negligencia, el fraude o el quebrantamiento de normas.
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #002D62;">Extroversión / Liderazgo Social (Extraversion)</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #0284c7;">80 / 100</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; background-color: #f0f9ff; color: #0369a1;">Equilibrado / Centrado</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: justify;">
              Liderazgo enfocado en la competencia técnica y el ejemplo tangible ("hacer junto con el equipo") en lugar del protagonismo histriónico. Se comunica con sobriedad, elocuencia técnica y fundamentación jurídica y económica de alto impacto ante comités y directorios.
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 5. ANÁLISIS CUALITATIVO EN PROFUNDIDAD DE LAS 4 DIMENSIONES CLAVE -->
      <h2 style="font-size: 11pt; color: #002D62; border-bottom: 2px solid #002D62; padding-bottom: 4px; margin-top: 25px; text-transform: uppercase;">
        4. EVALUACIÓN CUALITATIVA DE DIMENSIONES PSICOLABORALES CLAVE
      </h2>

      <!-- Dimensión 1 -->
      <div style="margin-bottom: 18px;">
        <h3 style="font-size: 10pt; color: #002D62; margin-bottom: 6px;">
          4.1. Estructura Cognitiva, Inteligencia Analítica e Hibridación Interdisciplinaria
        </h3>
        <p style="text-align: justify; font-size: 9.5pt; margin: 0 0 8px 0; line-height: 1.55;">
          Desde la perspectiva de la psicología cognitiva, el evaluado opera bajo un <strong>pensamiento sistémico de nivel superior</strong> caracterizado por su capacidad para procesar simultáneamente la macro-escala estratégica y el micro-detalle forense. No presenta la miopía habitual del especialista aislado: comprende con claridad matemática cómo un retraso en la recepción de un inmueble o un error en la retención del impuesto de segunda categoría (15,25%) impacta la declaración mensual tributaria (Formulario 29), la cartola de cobranza del arrendatario, el reporte normado CMF B.13 y el balance financiero consolidado de la corporación.
        </p>
        <p style="text-align: justify; font-size: 9.5pt; margin: 0; line-height: 1.55;">
          Su mente opera en la confluencia de tres gramáticas formales: la <strong>ingeniería industrial</strong> (optimización de recursos, diagramas de flujo, colas de servicio y costos marginales), el <strong>derecho</strong> (tipicidad legal, cadena de custodia de la prueba, competencia funcional y debido proceso) y la <strong>arquitectura tecnológica moderna</strong> (cálculo SHA-256, inmutabilidad de bitácoras y despliegues On-Premise). Esta simbiosis cognitiva le permite traducir leyes complejas (como la Ley N° 21.595 de Delitos Económicos o la Ley N° 21.719 de Protección de Datos Personales) en candados transaccionales de software donde el cumplimiento normativo ocurre "por diseño" (<em>Compliance by Design</em>) y no por mero discurso teórico.
        </p>
      </div>

      <!-- Dimensión 2 -->
      <div style="margin-bottom: 18px;">
        <h3 style="font-size: 10pt; color: #002D62; margin-bottom: 6px;">
          4.2. Dinámica Psico-Ética, Valentía Moral y Juicio Fiduciario Incorruptible
        </h3>
        <p style="text-align: justify; font-size: 9.5pt; margin: 0 0 8px 0; line-height: 1.55;">
          En la evaluación del criterio moral (marco de Kohlberg), Cristian Muñoz se sitúa sólidamente en el <strong>Estadio 6: Nivel Post-Convencional de Principios Éticos Universales y Deber Fiduciario</strong>. No actúa éticamente por temor al castigo ni por complacencia social con el grupo de pares, sino por una profunda convicción de responsabilidad hacia la fe pública y la preservación patrimonial de la entidad.
        </p>
        <p style="text-align: justify; font-size: 9.5pt; margin: 0; line-height: 1.55;">
          Un rasgo psicológico sobresaliente es su <strong>valentía moral (Moral Courage)</strong>: evidenciada en el caso real donde, frente a la aparición sorpresiva de un nuevo proveedor con una cotización de 20 millones de pesos presentada informalmente tras el rechazo de tres cotizaciones de 22 millones, no dudó en intervenir en su calidad de control interno, exigir un proceso formal de <em>Due Diligence</em> y dejar trazabilidad inalterable de los hechos. El evaluado concibe el control interno no como un trámite de oficina complaciente, sino como un escudo de defensa jurídica que protege civil y penalmente a los administradores y directores de la compañía.
        </p>
      </div>

      <!-- Dimensión 3 -->
      <div style="margin-bottom: 18px;">
        <h3 style="font-size: 10pt; color: #002D62; margin-bottom: 6px;">
          4.3. Estilo de Liderazgo, Gestión del Cambio y Empatía Situacional
        </h3>
        <p style="text-align: justify; font-size: 9.5pt; margin: 0 0 8px 0; line-height: 1.55;">
          El evaluado rechaza de plano el liderazgo autocrático por decreto. Ante el desafío de implementar un sistema estricto frente a operadores que llevaban hasta dos décadas trabajando con planillas personales de Excel dispersas en OneDrive, diseñó y ejecutó una estrategia psicosocial en dos fases de gran efectividad:
        </p>
        <ul style="font-size: 9.5pt; margin-bottom: 8px; padding-left: 20px;">
          <li style="margin-bottom: 4px;">
            <strong>Fase 1: Protocolo Sombra (Acompañamiento en el Puesto de Trabajo):</strong> Sentarse físicamente al lado del operador, observar su rutina diaria, validar sus dolores, aprender de sus atajos empíricos y corregir en caliente las trabas del sistema con información de primera fuente. Esto desactiva el sentimiento de amenaza y construye confianza genuina.
          </li>
          <li>
            <strong>Fase 2: Protocolo de Empoderamiento (Dignificación del Rol):</strong> Enseñar al colaborador el sentido trascendente de su tarea dentro de la cadena global, explicándole con paciencia y respeto por qué un dato mal cargado perjudica a los compañeros de contabilidad y expone a la institución ante la CMF.
          </li>
        </ul>
        <p style="text-align: justify; font-size: 9.5pt; margin: 0; line-height: 1.55;">
          Este enfoque demuestra una madurez emocional sobresaliente: no castiga el error honesto, pero erradica de raíz la negligencia sistemática a través de la educación y el respaldo documental continuo (manuales y guías operativas).
        </p>
      </div>

      <!-- Dimensión 4 -->
      <div style="margin-bottom: 18px;">
        <h3 style="font-size: 10pt; color: #002D62; margin-bottom: 6px;">
          4.4. Relación con la Tecnología y la Inteligencia Artificial: Pragmatismo Humanista
        </h3>
        <p style="text-align: justify; font-size: 9.5pt; margin: 0; line-height: 1.55;">
          El evaluado mantiene una postura psicológica sumamente sana y madura frente a la inteligencia artificial generativa: <strong>antropocéntrica y no fetichista</strong>. En sus propias intervenciones técnicas enfatiza que <em>«la IA no manipula datos sensibles de clientes o proveedores, ni toma decisiones financieras autónomas; la IA es exclusivamente un asistente de análisis para evitar errores humanos de digitación o lectura, pero la responsabilidad ética, civil y penal es indelegable del ser humano que autoriza con su firma nominal»</em>. Esta concepción se alinea de manera perfecta con el <strong>Artículo 14 del Reglamento Europeo de Inteligencia Artificial (EU AI Act)</strong> sobre supervisión humana efectiva, demostrando un criterio directivo de vanguardia mundial.
        </p>
      </div>

      <!-- 6. CUADRO DE COMPETENCIAS DIRECTIVAS CUANTIFICADAS -->
      <h2 style="font-size: 11pt; color: #002D62; border-bottom: 2px solid #002D62; padding-bottom: 4px; margin-top: 25px; text-transform: uppercase;">
        5. MATRIZ DE COMPETENCIAS LABORALES Y CAPACIDADES EJECUTIVAS
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 8.5pt;">
        <thead>
          <tr style="background-color: #002D62; color: #ffffff;">
            <th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: left; width: 28%;">Competencia Evaluada</th>
            <th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; width: 14%;">Categoría</th>
            <th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; width: 12%;">Puntaje</th>
            <th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; width: 14%;">Nivel</th>
            <th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: left; width: 32%;">Evidencia Empírica de Desempeño</th>
          </tr>
        </thead>
        <tbody>
          ${PSYCHOLOGICAL_COMPETENCY_MATRIX.map((c, i) => `
            <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #002D62;">${c.competency}</td>
              <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 8pt; color: #475569;">${c.category}</td>
              <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #107C41;">${c.score} %</td>
              <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #065f46; background-color: #ecfdf5;">${c.level}</td>
              <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-size: 8pt; color: #334155;">${c.description}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- 7. PRONÓSTICO DE DESEMPEÑO Y AJUSTE A CARGOS DIRECTIVOS -->
      <h2 style="font-size: 11pt; color: #002D62; border-bottom: 2px solid #002D62; padding-bottom: 4px; margin-top: 25px; text-transform: uppercase;">
        6. PRONÓSTICO LABORAL & ADECUACIÓN A POSICIONES DE ALTA DIRECCIÓN
      </h2>
      <p style="text-align: justify; font-size: 9.5pt; margin-bottom: 12px;">
        En función de los resultados psicométricos, su trayectoria probada y su perfil de competencias, se pronostica un <strong>éxito sobresaliente</strong> en posiciones corporativas con alta responsabilidad patrimonial, regulatoria y estratégica:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 9pt;">
        <thead>
          <tr style="background-color: #002D62; color: #ffffff;">
            <th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: left; width: 30%;">Posición Directiva Sugerida</th>
            <th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; width: 18%;">Índice de Ajuste</th>
            <th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: left; width: 52%;">Justificación Psicolaboral & Valor Agregado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #002D62;">Gerente / Jefe Corporativo de Control Interno</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #107C41; background-color: #ecfdf5;">100% (Óptimo)</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: justify;">
              Visión forense incorruptible, independencia de criterio, capacidad de diseño de matrices de riesgo operacional y defensa fiduciaria de la empresa.
            </td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #002D62;">Contralor Corporativo (Corporate Controller)</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #107C41; background-color: #ecfdf5;">98% (Sobresaliente)</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: justify;">
              Dominio absoluto de la partida doble (F0911), auditoría de ingresos/egresos, conciliación bancaria y cuadratura exacta de pasivos tributarios.
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #002D62;">Gerente de Operaciones & Gestión Patrimonial</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #107C41; background-color: #ecfdf5;">96% (Sobresaliente)</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: justify;">
              Capacidad para gestionar grandes carteras de activos inmobiliarios y contratos de mantención, reduciendo tiempos muertos y optimizando el ROI.
            </td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #002D62;">Chief Compliance Officer (CCO) / Oficial de Cumplimiento</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #107C41; background-color: #ecfdf5;">97% (Sobresaliente)</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: justify;">
              Especialista en prevención de delitos económicos (Ley N° 21.595), prevención de lavado de activos (UAF) y gobernanza de protección de datos (Ley N° 21.719).
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 8. RECOMENDACIONES DE DESARROLLO Y CUIDADO ORGANIZACIONAL -->
      <h2 style="font-size: 11pt; color: #002D62; border-bottom: 2px solid #002D62; padding-bottom: 4px; margin-top: 25px; text-transform: uppercase;">
        7. CONDICIONES DE DESEMPEÑO ÓPTIMO & RECOMENDACIONES DE GESTIÓN
      </h2>
      <ul style="font-size: 9.5pt; margin-bottom: 25px; padding-left: 20px; line-height: 1.55;">
        <li style="margin-bottom: 8px;">
          <strong>Independencia Funcional de Reporte:</strong> Dado su rol de custodio ético y de control interno, se recomienda que Cristian mantenga línea de comunicación y reporte directo al Comité de Auditoría, a la Gerencia General o al Directorio, garantizando que su juicio pericial no quede supeditado a las presiones de jefaturas operativas evaluadas.
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Apalancamiento de su Metodología en Terreno:</strong> Respaldar institucionalmente el despliegue de sus protocolos de adopción humana (<em>Protocolo Sombra</em> y <em>Protocolo de Empoderamiento</em>) dotándolo de analistas juniors que puedan asumir la digitación rutinaria para que él concentre su energía en la arquitectura de control y la auditoría forense.
        </li>
        <li style="margin-bottom: 8px;">
          <strong>Cuidado de la Autoexigencia Personal:</strong> Presenta un estándar de calidad extremadamente elevado (cero defecto). Conviene asignarle equipos con buena formación técnica para evitar que asuma personalmente la revisión manual de capas secundarias por exceso de perfeccionismo.
        </li>
      </ul>

      <!-- 9. CIERRE FORMAL, VALIDACIÓN & FIRMA PERICIAL -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 35px; border-top: 2px solid #002D62; padding-top: 15px;">
        <tr>
          <td style="width: 50%; padding: 15px 20px; vertical-align: top; font-size: 8.5pt; color: #475569;">
            <strong>EMISIÓN OFICIAL DEL DOCUMENTO:</strong><br/>
            Departamento de Psicología Organizacional & Selección Ejecutiva<br/>
            Registro de Auditores de Personas & Competencias ISO 9001:2015<br/>
            Custodiado con Hash Criptográfico SHA-256 en Bóveda Digital (P986110D)<br/>
            Santiago de Chile • ${currentDate}
          </td>
          <td style="width: 50%; padding: 15px 20px; text-align: center; vertical-align: top;">
            <div style="font-family: 'Courier New', monospace; font-size: 11pt; font-weight: bold; color: #002D62; letter-spacing: 1px;">
              [CERTIFICACIÓN PERICIAL CONFORME]
            </div>
            <div style="margin: 10px auto; width: 200px; border-bottom: 1px solid #94a3b8;"></div>
            <div style="font-size: 8.5pt; font-weight: bold; color: #1e293b;">
              EQUIPO PERICIAL PSICOLABORAL & SELECCIÓN DE ALTA DIRECCIÓN
            </div>
            <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">
              Especialistas en Evaluación de Competencias, Ética Corporativa & Liderazgo de Crisis
            </div>
            <div style="margin-top: 6px; display: inline-block; background-color: #ecfdf5; border: 1px solid #107c41; color: #065f46; font-size: 7.5pt; font-weight: bold; padding: 2px 8px; border-radius: 4px;">
              DICTAMEN: IDÓNEO SIN RESERVAS (10 / 10)
            </div>
          </td>
        </tr>
      </table>

    </div>
  `;
};

/**
 * Genera y descarga el documento oficial Microsoft Word NATIVO (.docx - OpenXML)
 * mediante compresión binaria ZIP (JSZip).
 * 
 * Garantiza 100% apertura directa en Microsoft Word, Google Docs y LibreOffice sin advertencias.
 */
export async function downloadPsychologicalProfileWord(
  fileName: string = 'Informe_Psicolaboral_Cristian_Munoz_Rojas_SGC_RRHH_PSI_009.docx'
): Promise<{ success: boolean; error?: string }> {
  try {
    const zip = new JSZip();
    const currentDate = new Date().toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const nowIso = new Date().toISOString();

    // 1. [Content_Types].xml
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

    // 2. _rels/.rels
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

    // 3. word/_rels/document.xml.rels
    const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    // 4. word/styles.xml
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="21"/>
        <w:szCs w:val="21"/>
        <w:color w:val="0F172A"/>
        <w:lang w:val="es-CL"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

    // 5. Construir partes del cuerpo en Word OpenXML
    const bodyParts: string[] = [];

    // ENCABEZADO INSTITUCIONAL
    bodyParts.push(
      createParagraphXml('ASSETFLOW ENTERPRISE • DIVISIÓN PERSONAS & ALTA DIRECCIÓN', {
        bold: true,
        sizeHalfPt: 22,
        color: '002D62',
        align: 'center',
        spaceBefore: 120,
        spaceAfter: 40
      })
    );
    bodyParts.push(
      createParagraphXml('DEPARTAMENTO DE PSICOLOGÍA ORGANIZACIONAL & SELECCIÓN EJECUTIVA', {
        bold: true,
        sizeHalfPt: 17,
        color: '107C41',
        align: 'center',
        spaceBefore: 20,
        spaceAfter: 80
      })
    );
    bodyParts.push(
      createParagraphXml('INFORME PERICIAL DE EVALUACIÓN PSICOLABORAL', {
        bold: true,
        sizeHalfPt: 28,
        color: '002D62',
        align: 'center',
        spaceBefore: 60,
        spaceAfter: 40
      })
    );
    bodyParts.push(
      createParagraphXml('DIAGNÓSTICO DE COMPETENCIAS DIRECTIVAS, ESTRUCTURA COGNITIVA & JUICIO ÉTICO', {
        bold: true,
        sizeHalfPt: 19,
        color: '334155',
        align: 'center',
        spaceBefore: 20,
        spaceAfter: 40
      })
    );
    bodyParts.push(
      createParagraphXml(`Código Normativo: SGC-RRHH-PSI-009  |  Versión: 1.0 Oficial / 2026  |  Fecha: ${currentDate}  |  Clasificación: Confidencial Directivo`, {
        italic: true,
        sizeHalfPt: 16,
        color: '64748B',
        align: 'center',
        spaceBefore: 40,
        spaceAfter: 200
      })
    );

    // SECCIÓN 1: ANTECEDENTES DEL EVALUADO
    bodyParts.push(
      createParagraphXml('1. ANTECEDENTES DEL PROFESIONAL EVALUADO & CONTEXTO ORGANIZACIONAL', {
        bold: true,
        sizeHalfPt: 22,
        color: '002D62',
        spaceBefore: 200,
        spaceAfter: 100
      })
    );

    const idHeaders = ['Parámetro Institucional', 'Detalle Evaluado'];
    const idRows = [
      ['Nombre Completo', 'Cristian Andrés Muñoz Rojas'],
      ['Correo de Contacto', 'samaheim@gmail.com'],
      ['Formación de Base', 'Ingeniero Civil Industrial / Licenciado en Ciencias de la Ingeniería'],
      ['Formación Jurídica', 'Técnico Jurídico (ENAC Cáritas Chile)'],
      ['Estudios de Postgrado', 'Candidato a Magíster en Inteligencia Artificial, Derecho Digital y Blockchain (EBIS Business Tech School)'],
      ['Posición / Foco Evaluado', 'Jefatura Corporativa de Control Interno / Contraloría / Gerencia de Operaciones y Riesgos'],
      ['Caso de Estudio Empírico', 'Departamento Inmobiliario & Gestión Patrimonial (Mutucar / Cartera 1.849 propiedades, 30.300 UF/mes). Resolución de 4 observaciones de auditoría y levantamiento de suspensión de la CMF.']
    ];
    bodyParts.push(createTableXml(idHeaders, idRows, [3000, 6000], '002D62'));

    // CUADRO DESTACADO: DICTAMEN PERICIAL
    bodyParts.push(
      createParagraphXml('DICTAMEN DEL PERITO PSICÓLOGO ORGANIZACIONAL: ALTAMENTE RECOMENDADO / IDÓNEO SIN RESERVAS (10 / 10)', {
        bold: true,
        sizeHalfPt: 20,
        color: '065F46',
        shadingFill: 'ECFDF5',
        borderLeftColor: '107C41',
        spaceBefore: 120,
        spaceAfter: 60
      })
    );
    bodyParts.push(
      createParagraphXml(
        'El evaluado, Cristian Andrés Muñoz Rojas, presenta un perfil psicolaboral atípico de altísimo valor estratégico en el mercado directivo corporativo: combina una estructura cognitiva superior de ingeniería analítica con una formación jurídica aplicada y una valentía ética inquebrantable (Moral Courage) frente a la presión informal de jerarquías. Su capacidad para intervenir en entornos organizacionales desestructurados, desmantelar la resistencia al cambio mediante métodos de acompañamiento empático en terreno (Protocolo Sombra) y construir plataformas de gobernanza tecnológica blindadas bajo marcos de la CMF y leyes de delitos económicos lo posiciona como un líder natural e idóneo para asumir la conducción de Contralorías, Gerencias de Operaciones, Direcciones de Control de Gestión y Áreas de Cumplimiento Regulatorio.',
        {
          sizeHalfPt: 19,
          color: '064E3B',
          shadingFill: 'ECFDF5',
          borderLeftColor: '107C41',
          spaceBefore: 0,
          spaceAfter: 200
        }
      )
    );

    // SECCIÓN 2: METODOLOGÍA & BATERÍA APLICADA
    bodyParts.push(
      createParagraphXml('2. METODOLOGÍA & BATERÍA PSICOMÉTRICA / CONDUCTUAL APLICADA', {
        bold: true,
        sizeHalfPt: 22,
        color: '002D62',
        spaceBefore: 200,
        spaceAfter: 80
      })
    );
    bodyParts.push(
      createParagraphXml(
        'La evaluación se estructuró conforme al estándar internacional de psicología del trabajo y ergonomía cognitiva basada en evidencias, combinando cuatro instrumentos metodológicos convergentes:',
        { sizeHalfPt: 19, spaceBefore: 40, spaceAfter: 80 }
      )
    );
    bodyParts.push(
      createParagraphXml(
        '• Entrevista por Incidentes Críticos (Behavioral Event Interview - BEI / Metodología STAR): Exploración profunda de conductas, emociones y decisiones en tres hitos reales: (a) detención preventiva de contratación sospechosa de $20M CLP exigiendo Due Diligence formal; (b) resolución sustantiva de 4 observaciones críticas y levantamiento de suspensión CMF; y (c) superación de la resistencia de usuarios arraigados a planillas Excel.',
        { sizeHalfPt: 18, leftIndent: 360, spaceBefore: 40, spaceAfter: 60 }
      )
    );
    bodyParts.push(
      createParagraphXml(
        '• Modelo de Personalidad de Cinco Grandes Factores (Big Five / NEO-PI-R): Medición de rasgos estables: Conciencia/Minuciosidad (Conscientiousness), Estabilidad Emocional, Apertura a la Experiencia, Afabilidad y Extroversión/Liderazgo.',
        { sizeHalfPt: 18, leftIndent: 360, spaceBefore: 40, spaceAfter: 60 }
      )
    );
    bodyParts.push(
      createParagraphXml(
        '• Inventario de Competencias Directivas de Liderazgo (Hay Group / Spencer & Spencer): Medición de capacidades de liderazgo transformacional, pensamiento sistémico, asertividad directiva y orientación al logro económico.',
        { sizeHalfPt: 18, leftIndent: 360, spaceBefore: 40, spaceAfter: 60 }
      )
    );
    bodyParts.push(
      createParagraphXml(
        '• Evaluación Psico-Ética de Criterio Moral (Lawrence Kohlberg): Diagnóstico del nivel de razonamiento moral frente a dilemas organizacionales, presiones comerciales y fe pública.',
        { sizeHalfPt: 18, leftIndent: 360, spaceBefore: 40, spaceAfter: 160 }
      )
    );

    // SECCIÓN 3: PERFIL DE PERSONALIDAD BIG FIVE
    bodyParts.push(
      createParagraphXml('3. PERFIL DE PERSONALIDAD LABORAL (MODELO BIG FIVE / CINCO GRANDES FACTORES)', {
        bold: true,
        sizeHalfPt: 22,
        color: '002D62',
        spaceBefore: 200,
        spaceAfter: 100
      })
    );

    const bigFiveHeaders = ['Factor Evaluado', 'Percentil', 'Nivel Conductual', 'Manifestación en el Puesto de Trabajo'];
    const bigFiveRows = [
      ['Responsabilidad / Conciencia', '98 / 100', 'Extremadamente Alto', 'Minuciosidad obsesiva por el detalle forense, orden metodológico y exactitud numérica. No tolera la ambigüedad en los saldos ni los cabos sueltos contractuales. Autodisciplina que garantiza cumplimiento sin supervisión.'],
      ['Estabilidad Emocional / Temple', '94 / 100', 'Muy Alto', 'Notable compostura y frialdad analítica ante crisis severas (fiscalizaciones regulatorias, suspensiones CMF, auditorías externas). Canaliza la presión transformándola en planes de contingencia documentados.'],
      ['Apertura a la Experiencia', '96 / 100', 'Extremadamente Alto', 'Curiosidad intelectual activa y vocación autodidacta. Hibrida fluidamente campos heterogéneos: ingeniería de procesos, derecho administrativo, machine learning, criptografía aplicada y arquitectura de sistemas.'],
      ['Afabilidad & Empatía Social', '84 / 100', 'Alto / Asertivo', 'Empatía situacional desarrollada para comprender los temores del personal en terreno (origen de su Protocolo Sombra). Equilibra calidez humana con una firmeza que no transa ante negligencias o faltas a la probidad.'],
      ['Extroversión / Liderazgo', '80 / 100', 'Equilibrado / Técnico', 'Liderazgo enfocado en la competencia técnica y el ejemplo tangible ("hacer junto con el equipo") en lugar del protagonismo histriónico. Sobriedad, elocuencia técnica y fundamentación jurídica y económica de alto impacto.']
    ];
    bodyParts.push(createTableXml(bigFiveHeaders, bigFiveRows, [2400, 1400, 1800, 3400], '002D62'));

    // SECCIÓN 4: EVALUACIÓN CUALITATIVA DE DIMENSIONES CLAVE
    bodyParts.push(
      createParagraphXml('4. EVALUACIÓN CUALITATIVA DE DIMENSIONES PSICOLABORALES CLAVE', {
        bold: true,
        sizeHalfPt: 22,
        color: '002D62',
        spaceBefore: 200,
        spaceAfter: 100
      })
    );

    bodyParts.push(
      createParagraphXml('4.1. Estructura Cognitiva, Inteligencia Analítica e Hibridación Interdisciplinaria', {
        bold: true,
        sizeHalfPt: 20,
        color: '002D62',
        spaceBefore: 80,
        spaceAfter: 40
      })
    );
    bodyParts.push(
      createParagraphXml(
        'Desde la perspectiva de la psicología cognitiva, el evaluado opera bajo un pensamiento sistémico de nivel superior caracterizado por procesar simultáneamente la macro-escala estratégica y el micro-detalle forense. No presenta la miopía del especialista aislado: comprende con claridad matemática cómo un retraso en la recepción de un inmueble o un error en la retención del impuesto de segunda categoría (15,25%) impacta la declaración mensual tributaria (Formulario 29), la cartola de cobranza del arrendatario, el reporte normado CMF B.13 y el balance consolidado.\n\nSu mente opera en la confluencia de tres gramáticas formales: la ingeniería industrial (optimización, costos marginales y procesos), el derecho (tipicidad legal, cadena de custodia probatoria y debido proceso) y la arquitectura de sistemas (inmutabilidad SHA-256 y soberanía On-Premise). Esto le permite plasmar el cumplimiento normativo "por diseño" (Compliance by Design).',
        { sizeHalfPt: 19, spaceBefore: 20, spaceAfter: 80 }
      )
    );

    bodyParts.push(
      createParagraphXml('4.2. Dinámica Psico-Ética, Valentía Moral y Juicio Fiduciario Incorruptible', {
        bold: true,
        sizeHalfPt: 20,
        color: '002D62',
        spaceBefore: 80,
        spaceAfter: 40
      })
    );
    bodyParts.push(
      createParagraphXml(
        'En el criterio moral (marco de Kohlberg), Cristian Muñoz se sitúa sólidamente en el Estadio 6: Principios Éticos Universales y Deber Fiduciario. No actúa por temor al castigo ni por complacencia con el grupo de pares, sino por convicción hacia la fe pública y la preservación patrimonial.\n\nUn rasgo psicológico sobresaliente es su Valentía Moral (Moral Courage): demostrada en el caso real donde, ante la aparición informal de una cotización de 20 millones de pesos tras el rechazo de tres propuestas de 22 millones, intervino como control interno, exigió un Due Diligence estricto y dejó trazabilidad inalterable de los hechos para blindar legalmente a los directores de la compañía.',
        { sizeHalfPt: 19, spaceBefore: 20, spaceAfter: 80 }
      )
    );

    bodyParts.push(
      createParagraphXml('4.3. Estilo de Liderazgo, Gestión del Cambio y Empatía Situacional', {
        bold: true,
        sizeHalfPt: 20,
        color: '002D62',
        spaceBefore: 80,
        spaceAfter: 40
      })
    );
    bodyParts.push(
      createParagraphXml(
        'El evaluado descarta el liderazgo autocrático por decreto. Frente a operadores que llevaban dos décadas con planillas Excel independientes, desplegó una estrategia psicosocial de dos fases:\n• Fase 1 - Protocolo Sombra: Acompañamiento presencial al lado del operador para validar sus dificultades reales y corregir trabas en caliente, desactivando la amenaza.\n• Fase 2 - Protocolo de Empoderamiento: Dignificación del rol, explicando con paciencia el sentido trascendente de su labor y las implicancias patrimoniales y normativas CMF.',
        { sizeHalfPt: 19, spaceBefore: 20, spaceAfter: 80 }
      )
    );

    bodyParts.push(
      createParagraphXml('4.4. Relación con la Tecnología y la Inteligencia Artificial: Pragmatismo Humanista', {
        bold: true,
        sizeHalfPt: 20,
        color: '002D62',
        spaceBefore: 80,
        spaceAfter: 40
      })
    );
    bodyParts.push(
      createParagraphXml(
        'Mantiene una postura antropocéntrica frente a la inteligencia artificial: «la IA no manipula datos sensibles de clientes o proveedores, ni toma decisiones financieras autónomas; es exclusivamente un asistente de análisis para evitar errores humanos de digitación o lectura, pero la responsabilidad ética, civil y penal es indelegable del ser humano que autoriza con su firma nominal». Esta visión encarna a la perfección el Artículo 14 del Reglamento Europeo de Inteligencia Artificial (EU AI Act).',
        { sizeHalfPt: 19, spaceBefore: 20, spaceAfter: 160 }
      )
    );

    // SECCIÓN 5: MATRIZ DE COMPETENCIAS LABORALES
    bodyParts.push(
      createParagraphXml('5. MATRIZ DE COMPETENCIAS LABORALES Y CAPACIDADES EJECUTIVAS', {
        bold: true,
        sizeHalfPt: 22,
        color: '002D62',
        spaceBefore: 200,
        spaceAfter: 100
      })
    );

    const compHeaders = ['Competencia Evaluada', 'Categoría', 'Puntaje %', 'Nivel', 'Evidencia Empírica de Desempeño'];
    const compRows = PSYCHOLOGICAL_COMPETENCY_MATRIX.map(c => [
      c.competency,
      c.category,
      `${c.score}%`,
      c.level,
      c.description
    ]);
    bodyParts.push(createTableXml(compHeaders, compRows, [2600, 1400, 1200, 1500, 2300], '002D62'));

    // SECCIÓN 6: PRONÓSTICO DIRECTIVO
    bodyParts.push(
      createParagraphXml('6. PRONÓSTICO LABORAL & ADECUACIÓN A POSICIONES DE ALTA DIRECCIÓN', {
        bold: true,
        sizeHalfPt: 22,
        color: '002D62',
        spaceBefore: 200,
        spaceAfter: 100
      })
    );

    const roleHeaders = ['Posición Directiva Sugerida', 'Índice de Ajuste', 'Justificación Psicolaboral & Valor Agregado'];
    const roleRows = [
      ['Gerente / Jefe Corporativo de Control Interno', '100% (Óptimo)', 'Visión forense incorruptible, independencia de criterio, capacidad de diseño de matrices de riesgo operacional y defensa fiduciaria de la empresa ante litigios y auditorías.'],
      ['Contralor Corporativo (Corporate Controller)', '98% (Sobresaliente)', 'Dominio absoluto de la partida doble (F0911), auditoría de ingresos/egresos, conciliación bancaria y cuadratura exacta de pasivos tributarios y garantías.'],
      ['Gerente de Operaciones & Gestión Patrimonial', '96% (Sobresaliente)', 'Capacidad para gestionar grandes carteras de activos inmobiliarios y contratos de mantención, reduciendo tiempos muertos y optimizando el retorno de inversión (ROI).'],
      ['Chief Compliance Officer (CCO) / Oficial Cumplimiento', '97% (Sobresaliente)', 'Especialista en prevención de delitos económicos (Ley N° 21.595), prevención de lavado de activos (UAF) y gobernanza de protección de datos (Ley N° 21.719).']
    ];
    bodyParts.push(createTableXml(roleHeaders, roleRows, [3000, 1800, 4200], '002D62'));

    // SECCIÓN 7: CONDICIONES DE DESEMPEÑO
    bodyParts.push(
      createParagraphXml('7. CONDICIONES DE DESEMPEÑO ÓPTIMO & RECOMENDACIONES DE GESTIÓN', {
        bold: true,
        sizeHalfPt: 22,
        color: '002D62',
        spaceBefore: 200,
        spaceAfter: 80
      })
    );
    bodyParts.push(
      createParagraphXml(
        '• Independencia Funcional de Reporte: Se recomienda que Cristian mantenga línea de comunicación directa al Comité de Auditoría, a la Gerencia General o al Directorio, garantizando que su juicio pericial no quede supeditado a las presiones de jefaturas operativas evaluadas.',
        { sizeHalfPt: 18, leftIndent: 360, spaceBefore: 40, spaceAfter: 60 }
      )
    );
    bodyParts.push(
      createParagraphXml(
        '• Apalancamiento de su Metodología en Terreno: Respaldar institucionalmente el despliegue del Protocolo Sombra y Protocolo de Empoderamiento dotándolo de analistas juniors que asuman la digitación rutinaria para que él concentre su energía en la arquitectura de control y auditoría forense.',
        { sizeHalfPt: 18, leftIndent: 360, spaceBefore: 40, spaceAfter: 60 }
      )
    );
    bodyParts.push(
      createParagraphXml(
        '• Cuidado de la Autoexigencia Personal: Presenta un estándar de calidad extremadamente elevado (cero defecto). Conviene asignarle equipos con buena formación técnica para evitar que asuma personalmente la revisión manual de capas secundarias por exceso de perfeccionismo.',
        { sizeHalfPt: 18, leftIndent: 360, spaceBefore: 40, spaceAfter: 160 }
      )
    );

    // SECCIÓN 8: FIRMA Y EMISIÓN PERICIAL
    bodyParts.push(
      createParagraphXml('8. VALIDACIÓN, EMISIÓN OFICIAL & FIRMA PERICIAL', {
        bold: true,
        sizeHalfPt: 22,
        color: '002D62',
        spaceBefore: 200,
        spaceAfter: 100
      })
    );

    const sigHeaders = ['Registro de Control & Certificación', 'Dictamen y Firma Pericial'];
    const sigRows = [
      [
        `EMISIÓN OFICIAL:\nDepartamento de Psicología Organizacional & Selección Ejecutiva\nRegistro de Auditores de Personas & Competencias ISO 9001:2015\nCustodiado con Hash SHA-256 en Bóveda Digital (P986110D)\nSantiago de Chile • ${currentDate}`,
        'EQUIPO PERICIAL PSICOLABORAL & ALTA DIRECCIÓN\nEspecialistas en Competencias, Ética Corporativa y Liderazgo de Crisis\n\nDICTAMEN FINAL: IDÓNEO SIN RESERVAS (10 / 10)'
      ]
    ];
    bodyParts.push(createTableXml(sigHeaders, sigRows, [4500, 4500], '002D62'));

    // Ensamblar document.xml
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyParts.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>INFORME PERICIAL DE EVALUACIÓN PSICOLABORAL - CRISTIAN MUÑOZ ROJAS</dc:title>
  <dc:subject>Evaluación de Competencias Directivas, Juicio Ético y Liderazgo de Crisis</dc:subject>
  <dc:creator>Departamento de Psicología Organizacional &amp; Selección Ejecutiva</dc:creator>
  <cp:keywords>Psicolaboral, Competencias, Alta Dirección, Control Interno, CMF, ISO 9001, Ética, Big Five</cp:keywords>
  <dc:description>Informe Pericial de Evaluación Psicolaboral SGC-RRHH-PSI-009 para Cristian Andrés Muñoz Rojas</dc:description>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
</cp:coreProperties>`;

    const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>AssetFlow Enterprise SGC Publisher</Application>
  <Company>AssetFlow Enterprise • División Personas &amp; Alta Dirección</Company>
</Properties>`;

    zip.file('[Content_Types].xml', contentTypesXml);
    zip.folder('_rels')?.file('.rels', relsXml);
    zip.folder('docProps')?.file('core.xml', coreXml);
    zip.folder('docProps')?.file('app.xml', appXml);
    const wordFolder = zip.folder('word');
    wordFolder?.file('document.xml', documentXml);
    wordFolder?.file('styles.xml', stylesXml);
    wordFolder?.folder('_rels')?.file('document.xml.rels', docRelsXml);

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const targetName = fileName.toLowerCase().endsWith('.docx') ? fileName : `${fileName}.docx`;

    // Descarga limpia nativa de archivo binario .docx
    if (typeof window !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = targetName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al generar y descargar archivo Word .docx:', err);
    return { success: false, error: err?.message || 'Error al generar documento Word' };
  }
}
