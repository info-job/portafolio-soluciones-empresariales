/**
 * ============================================================================
 * sercotecReportExport.ts
 * PLAN DE NEGOCIO Y POSTULACIÓN CAPITAL SEMILLA SERCOTEC 2026
 * Código Documento: SERCOTEC-SEM-2026-01 • Clasificación: Oficial Concursable
 * ============================================================================
 * 
 * Formulario Integral de Postulación, Modelo Canvas, Plan de Inversiones ($3.5M CLP),
 * Justificación de Constitución Legal de SpA, Pitch de 3 Minutos y Proyecciones Financieras.
 * 
 * Emprendimiento: AssetFlow Technologies SpA
 * Postulante Líder: Cristian Andrés Muñoz Rojas (samaheim@gmail.com)
 * Genera documento Microsoft Word NATIVO (.docx) basado en Office OpenXML vía JSZip.
 */

import JSZip from 'jszip';

export interface SercotecBudgetItem {
  category: string;
  item: string;
  supplierDescription: string;
  sercotecAmount: number;
  entrepreneurAmount: number;
  totalAmount: number;
  justification: string;
}

export const SERCOTEC_BUDGET_ITEMS: SercotecBudgetItem[] = [
  {
    category: 'Formalización y Constitución Legal',
    item: 'Constitución Legal SpA en "Tu Empresa en un Día" + Notaría',
    supplierDescription: 'Redacción de estatutos comerciales SpA con objeto ampliado para desarrollo de software,GovTech y LegalTech, firma electrónica avanzada (FEA) de socios e inscripción en Registro de Comercio.',
    sercotecAmount: 180000,
    entrepreneurAmount: 20000,
    totalAmount: 200000,
    justification: 'Requisito fundacional ineludible para nacer a la vida jurídica, obtener RUT societario en el SII y poder celebrar contratos de prestación de servicios de software con fondos de inversión y AGFs.'
  },
  {
    category: 'Formalización y Habilitación Comercial',
    item: 'Inicio de Actividades 1ª Categoría SII, Verificación de Actividades y Patente Comercial',
    supplierDescription: 'Asesoría contable-legal para habilitación tributaria con giro 620100 (Actividades de programación informática), acreditación de domicilio tributario y pago de patente comercial municipal.',
    sercotecAmount: 220000,
    entrepreneurAmount: 30000,
    totalAmount: 250000,
    justification: 'Permite facturar legalmente con IVA / Factura Exenta a clientes corporativos B2B y operar en estricto cumplimiento tributario bajo el régimen ProPyme General (Art. 14 D3 LIR).'
  },
  {
    category: 'Propiedad Intelectual y Activos Intangibles',
    item: 'Registro de Marca Comercial en INAPI (Clases 9 y 42) + Publicación Diario Oficial',
    supplierDescription: 'Solicitud de registro de marca "AssetFlow Enterprise" y "AssetFlow Technologies" en el Instituto Nacional de Propiedad Industrial (INAPI) para software de gestión contable-patrimonial y servicios tecnológicos.',
    sercotecAmount: 380000,
    entrepreneurAmount: 20000,
    totalAmount: 400000,
    justification: 'Protección jurídica irrestricta del activo marcario y código fuente ante posibles plagios o apropiación indebida de competidores en el mercado inmobiliario y financiero.'
  },
  {
    category: 'Equipamiento Tecnológico y Activos Productivos',
    item: 'Servidor Mini-Workstation de Pruebas de Carga y Laboratorio de Seguridad Forense',
    supplierDescription: 'Equipo de alta densidad de cómputo (Procesador AMD Ryzen 9 / 32 GB RAM DDR5 / 1 TB NVMe PCIe 4.0) para banco de pruebas de penetración, simulación de 10.000 tx/día en PostgreSQL 16 y empaquetado de contenedores Docker.',
    sercotecAmount: 1350000,
    entrepreneurAmount: 50000,
    totalAmount: 1400000,
    justification: 'Infraestructura física local-first esencial para ejecutar pruebas de estrés, benchmark de base de datos relacional particionada y validación de seguridad previa al paso a producción en clientes.'
  },
  {
    category: 'Ciberseguridad y Credenciales de Confianza',
    item: 'Certificados Criptográficos SSL/TLS EV Wildcard + Token FIPS 140-2 de Firma',
    supplierDescription: 'Certificado SSL de validación extendida corporativo por 2 años, adquisición de token de hardware criptográfico USB para firma electrónica avanzada de código fuente y contratos societarios.',
    sercotecAmount: 370000,
    entrepreneurAmount: 30000,
    totalAmount: 400000,
    justification: 'Indispensable para cumplir las normativas de seguridad de la CMF y la Ley N° 21.595, garantizando conexiones cifradas HTTPS/WSS grado bancario y sellado criptográfico inalterable.'
  },
  {
    category: 'Marketing B2B y Difusión Comercial',
    item: 'Diseño de Identidad Corporativa B2B, Brochure Digital y Campaña de Prospección',
    supplierDescription: 'Desarrollo de landing page comercial institucional de alto impacto, video demo animado del producto, catálogo técnico para comités de auditoría de AGFs y campaña focalizada en LinkedIn B2B a Gerentes de Operaciones.',
    sercotecAmount: 650000,
    entrepreneurAmount: 25000,
    totalAmount: 675000,
    justification: 'Generación de pipeline comercial calificado con Administradoras Generales de Fondos, operadores Multifamily y aseguradoras, acelerando el cierre de los primeros 3 contratos recurrentes.'
  },
  {
    category: 'Gestión y Capacitación Técnica',
    item: 'Asesoría y Auditoría Contable Inicial para Estructuración de Flujo y Estados Financieros',
    supplierDescription: 'Servicio profesional de contador auditor para apertura del libro contable oficial, estructuración del plan de cuentas societario y configuración del software de facturación electrónica en el SII.',
    sercotecAmount: 350000,
    entrepreneurAmount: 0,
    totalAmount: 350000,
    justification: 'Garantiza la trazabilidad contable y tributaria de la empresa desde su primer día de constitución, facilitando futuras rondas de financiamiento CORFO o capital privado.'
  }
];

export const SERCOTEC_CANVAS_MODULES = [
  {
    title: '1. Segmentos de Clientes (Customer Segments)',
    content: 'El mercado objetivo está compuesto por entidades B2B en Chile que administran carteras de activos inmobiliarios y de inversión, fiscalizadas por la CMF o sujetas a auditorías de la Contraloría General de la República:\n• Segmento Primario: Administradoras Generales de Fondos (AGFs) con fondos inmobiliarios residenciales y comerciales (LarraínVial, SURA AGF, Ameris Capital, FYNSA, Toesca, Banchile Inversiones).\n• Segmento Secundario: Operadores de Property Management & Multifamily (Assetplan, Eurocorp, Mutae, Renta Nacional).\n• Segmento Institucional/Defensa: Cajas de Compensación, Fondos de Bienestar de las Fuerzas Armadas (DIVBIEN Ejército, Armada, FACH) e instituciones de previsión social (Capredena, Dipreca).'
  },
  {
    title: '2. Propuesta de Valor (Value Proposition)',
    content: 'AssetFlow Enterprise ofrece la única plataforma integral de gestión de activos inmobiliarios con arquitectura "Soberana, Criptográficamente Trazable y Auditada ante la Ley N° 21.595 de Delitos Económicos":\n• Blindaje Jurídico Real: Matriz de 7 puntos de control pre-firma (W43081C) y supervisión humana indelegable de la IA (Human-in-the-loop, Art. 14 EU AI Act), impidiendo pagos fantasmas o colusiones de contratistas.\n• Trazabilidad Inmutable: Sellado criptográfico SHA-256 en cadena para cada aprobación de orden de trabajo (F4209) y partida contable (F0911).\n• Escalabilidad Garantizada: Capacidad comprobada para procesar más de 10.000 transacciones diarias (>36 millones en 10 años) mediante particionamiento mensual en PostgreSQL 16 y paginación server-side.'
  },
  {
    title: '3. Canales de Distribución y Comunicación (Channels)',
    content: '• Venta Consultiva Directa B2B: Prospección directa con Gerentes de Operaciones, Contralores y Oficiales de Cumplimiento (CCO) de AGFs y compañías de seguros.\n• Ecosistema de Alianzas Técnicas: Presentaciones en la Asociación de Administradoras de Fondos Mutuos (AAFM) y el Colegio de Contadores de Chile.\n• Canal Digital Soberano: Sitio web institucional con calculador interactivo de ROI y ahorro frente a multas de la Ley N° 21.595, más demos guiadas interactivas.'
  },
  {
    title: '4. Relación con Clientes (Customer Relationships)',
    content: '• Modelo de Acompañamiento en Terreno (Protocolo Sombra): Transferencia de competencias directas al personal administrativo y operativo para vencer la resistencia al cambio en menos de 15 días.\n• Soporte Técnico Dedicado de Nivel 2 y 3: Garantía de SLA de 4 horas para incidentes críticos y asistencia técnica directa por el equipo fundador.\n• Auditorías de Cumplimiento Trimestrales: Revisiones de integridad de la cadena criptográfica SHA-256 con informe formal para el Comité de Auditoría del cliente.'
  },
  {
    title: '5. Fuentes de Ingresos (Revenue Streams)',
    content: '• Suscripción Recurrente Mensual SaaS (B2B): Cobro mensual recurrente de 0,08 UF a 0,15 UF por inmueble/unidad administrada al mes, con un piso mínimo de 50 UF/mes por cliente institucional.\n• Licenciamiento On-Premise Air-Gapped: Licencia perpetua con tarifa de mantenimiento anual del 22% para instituciones de defensa o previsión que exigen servidores propios.\n• Servicios de Implementación y Parametrización: Cuota única de onboarding e integración contable (setup fee) entre 120 UF y 350 UF según el volumen de activos catastrados.'
  },
  {
    title: '6. Recursos Clave (Key Resources)',
    content: '• Activo Tecnológico Propio: Código fuente modular en React 19, Node.js 22, Express, PostgreSQL 16 particionado y compresión binaria OpenXML nativa sin dependencias de terceros.\n• Propiedad Intelectual: Algoritmos de cuadratura contable F0911, árbol de Merkle y matrices de due diligence UAF.\n• Capital Humano Experto: Liderazgo de Cristian Andrés Muñoz Rojas, con formación interdisciplinaria en Ingeniería Civil Industrial, Técnico Jurídico y Máster en IA, Derecho Digital y Blockchain.'
  },
  {
    title: '7. Actividades Clave (Key Activities)',
    content: '• Desarrollo Continuo y Hardening: Mantenimiento correctivo, auditoría forense de código y adaptación a nuevas normativas de la CMF y el SII.\n• Comercialización B2B y Demos de Valor: Ejecución de pruebas de concepto (PoC) de 30 días con datos anonimizados de carteras reales de condominios.\n• Cumplimiento Normativo y Legal: Actualización permanente del catálogo de 8 manuales oficiales bajo norma ISO 9001:2015 / ISO 27001.'
  },
  {
    title: '8. Alianzas Clave (Key Partnerships)',
    content: '• SERCOTEC: Entidad patrocinadora para la formalización societaria, registro de marca y apalancamiento inicial de capital de trabajo.\n• Proveedores de Infraestructura Cloud y Datacenter Soberano: Nube privada con servidores ubicados en territorio chileno para estricta soberanía de datos.\n• Auditores Externos y Contadores Colegiados: Validación cruzada de la lógica contable y fiscal de los informes tributarios F29 y F22.'
  },
  {
    title: '9. Estructura de Costos (Cost Structure)',
    content: '• Costos de Servidores e Infraestructura de Red: Alojamiento en nube privada de alta velocidad y proxy criptográfico (~8% de los ingresos).\n• Gastos de Personal Especializado: Equipo de ingeniería de software, analistas de soporte y asesoría jurídica/contable (~55% de los ingresos en régimen).\n• Marketing y Comercialización B2B: Campañas de captación, asistencia a congresos inmobiliarios y viajes a terreno (~15% de los ingresos).\n• Margen Operacional Proyectado: 40% a 55% a partir del Mes 8 de operación formal.'
  }
];

export const SERCOTEC_FINANCIAL_PROJECTIONS = [
  { year: 'Año 1 (2026)', clients: 5, managedUnits: 8500, mrrCLP: 18700000, arrCLP: 224400000, ebitdaMargin: '38%', breakEvenMonth: 'Mes 5' },
  { year: 'Año 2 (2027)', clients: 16, managedUnits: 28000, mrrCLP: 61600000, arrCLP: 739200000, ebitdaMargin: '48%', breakEvenMonth: 'Consolidado' },
  { year: 'Año 3 (2028)', clients: 35, managedUnits: 65000, mrrCLP: 143000000, arrCLP: 1716000000, ebitdaMargin: '55%', breakEvenMonth: 'Consolidado' }
];

// Helper: Escape XML
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper: Crear párrafos en Word OpenXML
function createParagraphXml(
  text: string,
  options: {
    bold?: boolean;
    italic?: boolean;
    sizeHalfPt?: number;
    color?: string;
    align?: 'left' | 'center' | 'right' | 'both';
    spaceBefore?: number;
    spaceAfter?: number;
    pageBreakBefore?: boolean;
    leftIndent?: number;
  } = {}
): string {
  const {
    bold = false,
    italic = false,
    sizeHalfPt = 21,
    color = '0F172A',
    align = 'left',
    spaceBefore = 60,
    spaceAfter = 60,
    pageBreakBefore = false,
    leftIndent = 0
  } = options;

  let jcXml = '';
  if (align === 'center') jcXml = '<w:jc w:val="center"/>';
  else if (align === 'right') jcXml = '<w:jc w:val="right"/>';
  else if (align === 'both') jcXml = '<w:jc w:val="both"/>';
  else jcXml = '<w:jc w:val="left"/>';

  const indentXml = leftIndent > 0 ? `<w:ind w:left="${leftIndent}"/>` : '';
  const pageBreakXml = pageBreakBefore ? '<w:pageBreakBefore/>' : '';

  return `
    <w:p>
      <w:pPr>
        ${pageBreakXml}
        ${jcXml}
        <w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="276" w:lineRule="auto"/>
        ${indentXml}
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          ${bold ? '<w:b/>' : ''}
          ${italic ? '<w:i/>' : ''}
          <w:color w:val="${color}"/>
          <w:sz w:val="${sizeHalfPt}"/>
          <w:szCs w:val="${sizeHalfPt}"/>
          <w:lang w:val="es-CL"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(text)}</w:t>
      </w:r>
    </w:p>
  `;
}

// Helper: Crear Callout Box en Word OpenXML
function createCalloutBoxXml(title: string, content: string, borderColor: string = '002D62', bgColor: string = 'F0F4F8'): string {
  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10000" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:left w:val="single" w:sz="24" w:space="0" w:color="${borderColor}"/>
          <w:bottom w:val="none"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="120" w:type="dxa"/>
          <w:bottom w:w="120" w:type="dxa"/>
          <w:left w:w="180" w:type="dxa"/>
          <w:right w:w="180" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="10000" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="${bgColor}"/>
          </w:tcPr>
          ${createParagraphXml(title, { bold: true, sizeHalfPt: 22, color: borderColor, spaceBefore: 40, spaceAfter: 40 })}
          ${createParagraphXml(content, { italic: false, sizeHalfPt: 20, color: '1E293B', spaceBefore: 20, spaceAfter: 40, align: 'both' })}
        </w:tc>
      </w:tr>
    </w:tbl>
  `;
}

// Helper: Crear Tablas en Word OpenXML
function createTableXml(headers: string[], rows: string[][], colWidthsDxa: number[]): string {
  const totalWidth = colWidthsDxa.reduce((a, b) => a + b, 0);

  const headerCellsXml = headers.map((h, i) => `
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="${colWidthsDxa[i]}" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="002D62"/>
        <w:tcMar>
          <w:top w:w="120" w:type="dxa"/>
          <w:bottom w:w="120" w:type="dxa"/>
          <w:left w:w="120" w:type="dxa"/>
          <w:right w:w="120" w:type="dxa"/>
        </w:tcMar>
      </w:tcPr>
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:before="40" w:after="40"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
            <w:b/>
            <w:color w:val="FFFFFF"/>
            <w:sz w:val="19"/>
          </w:rPr>
          <w:t>${escapeXml(h)}</w:t>
        </w:r>
      </w:p>
    </w:tc>
  `).join('');

  const rowsXml = rows.map((row, rIdx) => {
    const isEven = rIdx % 2 === 0;
    const bg = isEven ? 'FFFFFF' : 'F8FAFC';
    const cellsXml = row.map((c, cIdx) => `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${colWidthsDxa[cIdx]}" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>
          <w:tcMar>
            <w:top w:w="100" w:type="dxa"/>
            <w:bottom w:w="100" w:type="dxa"/>
            <w:left w:w="120" w:type="dxa"/>
            <w:right w:w="120" w:type="dxa"/>
          </w:tcMar>
        </w:tcPr>
        <w:p>
          <w:pPr>
            <w:jc w:val="${cIdx === 0 || cIdx >= row.length - 2 ? 'center' : 'left'}"/>
            <w:spacing w:before="30" w:after="30"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:color w:val="1E293B"/>
              <w:sz w:val="18"/>
            </w:rPr>
            <w:t>${escapeXml(c)}</w:t>
          </w:r>
        </w:p>
      </w:tc>
    `).join('');

    return `
      <w:tr>
        <w:trPr>
          <w:cantSplit/>
        </w:trPr>
        ${cellsXml}
      </w:tr>
    `;
  }).join('');

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="${totalWidth}" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:trPr>
          <w:tblHeader/>
        </w:trPr>
        ${headerCellsXml}
      </w:tr>
      ${rowsXml}
    </w:tbl>
  `;
}

/**
 * Genera y descarga el informe oficial en formato Microsoft Word nativo (.docx)
 */
export async function downloadSercotecReportWord(
  fileName: string = 'Plan_De_Negocio_Capital_Semilla_SERCOTEC_AssetFlow_Technologies_SpA.docx'
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

    // 5. Construir el documento
    const bodyParts: string[] = [];

    // ENCABEZADO INSTITUCIONAL
    bodyParts.push(
      createParagraphXml('SERVICIO DE COOPERACIÓN TÉCNICA — SERCOTEC CHILE', {
        bold: true,
        sizeHalfPt: 22,
        color: '002D62',
        align: 'center',
        spaceBefore: 100,
        spaceAfter: 30
      })
    );
    bodyParts.push(
      createParagraphXml('FONDO CONCURSABLE CAPITAL SEMILLA EMPRENDE / SEMILLA INICIA 2026', {
        bold: true,
        sizeHalfPt: 18,
        color: 'C5A059',
        align: 'center',
        spaceBefore: 10,
        spaceAfter: 60
      })
    );
    bodyParts.push(
      createParagraphXml('PLAN DE NEGOCIO Y MEMORIA TÉCNICA DE POSTULACIÓN', {
        bold: true,
        sizeHalfPt: 30,
        color: '002D62',
        align: 'center',
        spaceBefore: 60,
        spaceAfter: 40
      })
    );
    bodyParts.push(
      createParagraphXml('CONSTITUCIÓN FORMAL Y ESCALAMIENTO COMERCIAL: ASSETFLOW TECHNOLOGIES SpA', {
        bold: true,
        sizeHalfPt: 20,
        color: '107C41',
        align: 'center',
        spaceBefore: 20,
        spaceAfter: 60
      })
    );
    bodyParts.push(
      createParagraphXml(`Código Documento: SERCOTEC-SEM-2026-01  |  Convocatoria: Primer Semestre 2026  |  Fecha: ${currentDate}  |  Subsidio: $3.500.000 CLP`, {
        italic: true,
        sizeHalfPt: 17,
        color: '64748B',
        align: 'center',
        spaceBefore: 20,
        spaceAfter: 180
      })
    );

    // CALLOUT DE SÍNTESIS
    bodyParts.push(
      createCalloutBoxXml(
        '🎯 SÍNTESIS DE LA POSTULACIÓN A FONDOS PÚBLICOS',
        'El presente documento contiene la postulación completa y el Modelo Canvas riguroso para adjudicarse el Capital Semilla Emprende de SERCOTEC ($3.500.000 CLP de subsidio no reembolsable + $175.000 CLP de aporte del emprendedor). Su objetivo es financiar la constitución jurídica de "AssetFlow Technologies SpA", el registro de marca en INAPI, la adquisición de infraestructura de pruebas y el inicio de comercialización activa de AssetFlow Enterprise, plataforma ERP soberana con sellado criptográfico SHA-256 e inteligencia artificial asistida bajo supervisión humana (Art. 14 EU AI Act), que previene fraudes y protege a fondos de inversión y carteras inmobiliarias ante la Ley N° 21.595 de Delitos Económicos en Chile.',
        '002D62',
        'F1F5F9'
      )
    );

    // FICHA TÉCNICA
    bodyParts.push(
      createParagraphXml('1. FICHA RESUMEN DEL PROYECTO Y DEL POSTULANTE', {
        bold: true,
        sizeHalfPt: 24,
        color: '002D62',
        spaceBefore: 200,
        spaceAfter: 80
      })
    );

    const fichaHeaders = ['Parámetro', 'Detalle de la Postulación'];
    const fichaRows = [
      ['Razón Social a Constituir', 'AssetFlow Technologies SpA'],
      ['Nombre Comercial de la Solución', 'AssetFlow Enterprise ERP (Gestión de Activos, CMF e IA Soberana)'],
      ['Emprendedor Líder / Postulante', 'Cristian Andrés Muñoz Rojas (RUT: 13.069.969-9 / samaheim@gmail.com)'],
      ['Perfil y Competencias Clave', 'Ingeniero Civil Industrial / Técnico Jurídico / Máster en IA, Derecho Digital y Blockchain (EBIS Business Tech School)'],
      ['Región / Comuna de Operación', 'Región Metropolitana de Santiago / Comuna de Santiago Centro'],
      ['Rubro y Actividad Económica SII', '620100 - Actividades de programación informática y consultoría TI'],
      ['Subsidio Solicitado a SERCOTEC', '$3.500.000 CLP (Tres Millones Quinientos Mil Pesos Chilenos)'],
      ['Aporte Empresarial del Emprendedor', '$175.000 CLP (5% de cofinanciamiento obligatorio)'],
      ['Monto Total del Plan de Inversión', '$3.675.000 CLP (Tres Millones Seiscientos Setenta y Cinco Mil Pesos Chilenos)']
    ];
    bodyParts.push(createTableXml(fichaHeaders, fichaRows, [3000, 7000]));

    // ELEVATOR PITCH
    bodyParts.push(
      createParagraphXml('2. ELEVATOR PITCH DE 3 MINUTOS (DEFENSA ANTE EL COMITÉ SERCOTEC)', {
        bold: true,
        sizeHalfPt: 24,
        color: '002D62',
        spaceBefore: 240,
        spaceAfter: 80
      })
    );

    bodyParts.push(
      createCalloutBoxXml(
        '🗣️ GUION DEL PITCH OFICIAL (3 MINUTOS EXACTOS)',
        '«Estimados evaluadores de SERCOTEC: en Chile se administran miles de millones de pesos en activos inmobiliarios a ciegas, dispersos en hojas de Excel vulnerables, correos desordenados y pagos de mantención duplicados o inflados por contratistas. Con la entrada en vigencia de la Ley N° 21.595 de Delitos Económicos, los directores, administradores de fondos y gerentes hoy arriesgan penas de cárcel efectiva si sus empresas pagan facturas fantasmas o contratan con proveedores no auditados.\n\nFrente a este dolor crítico creamos AssetFlow Enterprise: un software de gestión corporativa que ya está desarrollado, probado y funcionando en terreno. Nuestro sistema incorpora la partida doble contable F0911, trazabilidad criptográfica SHA-256 en cadena y un asistente de inteligencia artificial que detecta anomalías y transcribe presupuestos, pero bajo una regla de hierro: la IA nunca aprueba pagos sola; la firma jurídica siempre recae en un ser humano facultado (Human-in-the-loop, Art. 14 del Reglamento Europeo de IA).\n\nCon este Capital Semilla de SERCOTEC de $3.500.000 no venimos a ver si la idea funciona: el software ya está construido. Venimos a constituir legalmente AssetFlow Technologies SpA en Tu Empresa en un Día, registrar la marca en INAPI, adquirir nuestro servidor de pruebas y salir a comercializar el software bajo modelo SaaS a más de 40 Administradoras de Fondos y operadores de edificios Multifamily en Santiago. Con solo 3 clientes corporativos alcanzamos el punto de equilibrio en el mes 5 y proyectamos una facturación de más de $220 millones en el primer año. Apoyen a AssetFlow Technologies para formalizar una empresa chilena de base tecnológica con proyección global. Muchas gracias.»',
        '107C41',
        'ECFDF5'
      )
    );

    // MODELO CANVAS
    bodyParts.push(
      createParagraphXml('3. MODELO CANVAS COMPLETO DE SERCOTEC (LOS 9 BLOQUES)', {
        bold: true,
        sizeHalfPt: 24,
        color: '002D62',
        spaceBefore: 240,
        spaceAfter: 80,
        pageBreakBefore: true
      })
    );

    for (const mod of SERCOTEC_CANVAS_MODULES) {
      bodyParts.push(
        createParagraphXml(mod.title, {
          bold: true,
          sizeHalfPt: 21,
          color: '002D62',
          spaceBefore: 120,
          spaceAfter: 40
        })
      );
      bodyParts.push(
        createParagraphXml(mod.content, {
          sizeHalfPt: 20,
          color: '1E293B',
          align: 'both',
          spaceBefore: 20,
          spaceAfter: 80
        })
      );
    }

    // PLAN DE INVERSIONES DETALLADO
    bodyParts.push(
      createParagraphXml('4. PLAN DE INVERSIONES Y PRESUPUESTO DETALLADO ($3.500.000 CLP)', {
        bold: true,
        sizeHalfPt: 24,
        color: '002D62',
        spaceBefore: 240,
        spaceAfter: 80,
        pageBreakBefore: true
      })
    );

    const budgetHeaders = ['Categoría', 'Ítem Financiable', 'Aporte SERCOTEC', 'Aporte Postulante', 'Total'];
    const budgetRows = SERCOTEC_BUDGET_ITEMS.map(b => [
      b.category,
      b.item,
      `$${b.sercotecAmount.toLocaleString('es-CL')}`,
      `$${b.entrepreneurAmount.toLocaleString('es-CL')}`,
      `$${b.totalAmount.toLocaleString('es-CL')}`
    ]);

    // Fila total
    const totalSercotec = SERCOTEC_BUDGET_ITEMS.reduce((sum, b) => sum + b.sercotecAmount, 0);
    const totalEmprendedor = SERCOTEC_BUDGET_ITEMS.reduce((sum, b) => sum + b.entrepreneurAmount, 0);
    const totalGeneral = totalSercotec + totalEmprendedor;

    budgetRows.push([
      'TOTAL GENERAL DEL PLAN',
      'CONSOLIDADO DE INVERSIÓN',
      `$${totalSercotec.toLocaleString('es-CL')}`,
      `$${totalEmprendedor.toLocaleString('es-CL')}`,
      `$${totalGeneral.toLocaleString('es-CL')}`
    ]);

    bodyParts.push(createTableXml(budgetHeaders, budgetRows, [2200, 3600, 1400, 1400, 1400]));

    // JUSTIFICACIÓN ITEM POR ITEM
    bodyParts.push(
      createParagraphXml('5. JUSTIFICACIÓN TÉCNICA Y DE IMPACTO ÍTEM POR ÍTEM', {
        bold: true,
        sizeHalfPt: 24,
        color: '002D62',
        spaceBefore: 240,
        spaceAfter: 80
      })
    );

    for (const b of SERCOTEC_BUDGET_ITEMS) {
      bodyParts.push(
        createParagraphXml(`• ${b.item} (${b.category})`, {
          bold: true,
          sizeHalfPt: 20,
          color: '002D62',
          spaceBefore: 60,
          spaceAfter: 20
        })
      );
      bodyParts.push(
        createParagraphXml(`Monto Financiado: $${b.sercotecAmount.toLocaleString('es-CL')} SERCOTEC + $${b.entrepreneurAmount.toLocaleString('es-CL')} Postulante = $${b.totalAmount.toLocaleString('es-CL')}`, {
          italic: true,
          sizeHalfPt: 18,
          color: '107C41',
          spaceBefore: 10,
          spaceAfter: 20
        })
      );
      bodyParts.push(
        createParagraphXml(`Descripción: ${b.supplierDescription}`, {
          sizeHalfPt: 19,
          color: '334155',
          spaceBefore: 10,
          spaceAfter: 20
        })
      );
      bodyParts.push(
        createParagraphXml(`Justificación de Necesidad: ${b.justification}`, {
          sizeHalfPt: 19,
          color: '1E293B',
          align: 'both',
          spaceBefore: 10,
          spaceAfter: 60
        })
      );
    }

    // PROYECCIONES FINANCIERAS
    bodyParts.push(
      createParagraphXml('6. PROYECCIONES FINANCIERAS Y VIABILIDAD ECONÓMICA A 3 AÑOS', {
        bold: true,
        sizeHalfPt: 24,
        color: '002D62',
        spaceBefore: 240,
        spaceAfter: 80,
        pageBreakBefore: true
      })
    );

    const finHeaders = ['Periodo', 'Clientes B2B', 'Unidades Catastradas', 'MRR Mensual', 'ARR Anual', 'Margen EBITDA', 'Punto Equilibrio'];
    const finRows = SERCOTEC_FINANCIAL_PROJECTIONS.map(f => [
      f.year,
      f.clients.toString(),
      f.managedUnits.toLocaleString('es-CL'),
      `$${(f.mrrCLP / 1000000).toFixed(1)}M`,
      `$${(f.arrCLP / 1000000).toFixed(1)}M`,
      f.ebitdaMargin,
      f.breakEvenMonth
    ]);
    bodyParts.push(createTableXml(finHeaders, finRows, [1600, 1200, 1800, 1400, 1400, 1300, 1300]));

    // GUÍA DE ENTREVISTA / DEFENSA
    bodyParts.push(
      createParagraphXml('7. GUÍA DE DEFENSA EN LA ENTREVISTA ANTE EL COMITÉ SERCOTEC', {
        bold: true,
        sizeHalfPt: 24,
        color: '002D62',
        spaceBefore: 240,
        spaceAfter: 80,
        pageBreakBefore: true
      })
    );

    const questions = [
      {
        q: '1. ¿Por qué SERCOTEC debería apoyar este proyecto si ya existe software de administración de condominios?',
        a: 'Respuesta Ganadora: "Porque el software tradicional de condominios en Chile solo emite gastos comunes para conserjería; ninguno tiene partida doble contable F0911 ni sellado criptográfico ante la Ley N° 21.595 de Delitos Económicos. Las grandes AGFs y administradoras de fondos no pueden usar portales caseros de conserjes: necesitan un ERP corporativo con debida diligencia UAF, informes CMF y responsabilidad penal blindada. Ese es nuestro nicho desatendido."'
      },
      {
        q: '2. ¿Cómo garantiza que el subsidio de $3.500.000 se utilizará eficientemente y la empresa no desaparecerá?',
        a: 'Respuesta Ganadora: "El riesgo técnico ya está 100% mitigado: el software ya está completamente programado, funcional y probado. No estamos solicitando recursos para investigar si se puede hacer, sino para el trámite de constitución SpA, la inscripción en el SII, el registro de marca y el empaquetamiento comercial para empezar a vender inmediatamente en el primer mes de adjudicación."'
      },
      {
        q: '3. ¿Cuál es el compromiso de dedicación del postulante?',
        a: 'Respuesta Ganadora: "Mi dedicación es total y exclusiva como Socio Fundador y Gerente General de AssetFlow Technologies SpA. Cuento con las competencias técnicas, legales y de gestión acreditadas en mi perfil pericial (SGC-RRHH-PSI-009) y en mi Tesis de Magíster, dedicando mi carrera al éxito y expansión de esta empresa."'
      }
    ];

    for (const item of questions) {
      bodyParts.push(
        createCalloutBoxXml(
          item.q,
          item.a,
          'C5A059',
          'FFFBEB'
        )
      );
      bodyParts.push(createParagraphXml('', { spaceBefore: 20, spaceAfter: 40 }));
    }

    // FIRMA DEL POSTULANTE
    bodyParts.push(
      createParagraphXml('Santiago de Chile, ' + currentDate, {
        italic: true,
        sizeHalfPt: 20,
        color: '64748B',
        align: 'center',
        spaceBefore: 200,
        spaceAfter: 40
      })
    );
    bodyParts.push(
      createParagraphXml('CRISTIAN ANDRÉS MUÑOZ ROJAS', {
        bold: true,
        sizeHalfPt: 22,
        color: '002D62',
        align: 'center',
        spaceBefore: 20,
        spaceAfter: 20
      })
    );
    bodyParts.push(
      createParagraphXml('Postulante Líder • Futuro Socio Gerente General de AssetFlow Technologies SpA', {
        italic: true,
        sizeHalfPt: 19,
        color: '107C41',
        align: 'center',
        spaceBefore: 10,
        spaceAfter: 100
      })
    );

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyParts.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Plan de Negocio Capital Semilla SERCOTEC 2026 — AssetFlow Technologies SpA</dc:title>
  <dc:subject>Formulario de Postulación Capital Semilla Emprende SERCOTEC Chile</dc:subject>
  <dc:creator>Cristian Andrés Muñoz Rojas</dc:creator>
  <cp:keywords>SERCOTEC, Capital Semilla, SpA, AssetFlow Technologies, ERP Inmobiliario, Ley 21.595, PropTech</cp:keywords>
  <dc:description>Propuesta oficial para adjudicación de financiamiento SERCOTEC para constitución formal y escalamiento comercial de la empresa desarrolladora</dc:description>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
</cp:coreProperties>`;

    const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>AssetFlow Enterprise Publisher (SERCOTEC-SEM-2026-01)</Application>
  <Company>AssetFlow Technologies SpA</Company>
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

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    return { success: true };
  } catch (err: any) {
    console.error('Error generating Sercotec Word document:', err);
    return { success: false, error: err?.message || 'Error desconocido al generar documento Word' };
  }
}
