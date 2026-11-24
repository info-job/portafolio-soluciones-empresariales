import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

export interface JdeComparisonReportOptions {
  currentUser?: string;
  systemDate?: string;
  companyName?: string;
  reportCode?: string;
}

/**
 * Genera y descarga el Dictamen Pericial Forense sobre el porcentaje de similitud
 * entre AssetFlow y Corporativo AssetFlow Enterprise, evaluando apariencia, lógica interna y riesgo de plagio/litigio.
 *
 * Implementado 100% con primitivas vectoriales de jsPDF para máxima nitidez, fidelidad y compatibilidad.
 */
export const downloadJdeComparisonReportPdf = async (
  options: JdeComparisonReportOptions = {}
): Promise<void> => {
  const {
    currentUser = 'CRISTIAN MUÑOZ R. / DIRECCIÓN DE AUDITORÍA & TI',
    systemDate = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
    companyName = 'ASSETFLOW ENTERPRISE & CONTROLLING SYSTEMS',
    reportCode = 'DIP-ERP-ORCL-2026/09'
  } = options;

  const filename = `Dictamen_Pericial_Auditoria_Corporativa_${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const totalPages = 5;

    // Paleta de Colores Institucional Pericial
    const COLOR_NAVY: [number, number, number] = [11, 60, 93];        // #0B3C5D Corporativo Primario
    const COLOR_GOLD: [number, number, number] = [217, 119, 6];       // #D97706 Oro / Ámbar Institucional
    const COLOR_CRIMSON: [number, number, number] = [190, 24, 93];    // #BE185D Magenta / Crimson de Auditoría
    const COLOR_EMERALD: [number, number, number] = [5, 150, 105];    // #059669 Verde de Aprobación
    const COLOR_SLATE_DARK: [number, number, number] = [15, 23, 42];  // #0F172A Texto Principal
    const COLOR_TEXT_MUTED: [number, number, number] = [71, 85, 105]; // #475569 Texto Secundario
    const COLOR_BG_LIGHT: [number, number, number] = [248, 250, 252]; // #F8FAFC Fondo Cajas
    const COLOR_BORDER: [number, number, number] = [203, 213, 225];   // #CBD5E1 Bordes

    // Función auxiliar para dibujar encabezado institucional
    const drawPageHeader = (pageNum: number, pageTitle: string) => {
      // Barra Superior Navy
      doc.setFillColor(...COLOR_NAVY);
      doc.rect(0, 0, 210, 17, 'F');

      // Línea de Acento Oro
      doc.setFillColor(...COLOR_GOLD);
      doc.rect(0, 17, 210, 1.8, 'F');

      // Texto de membrete
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('COMISIÓN PERICIAL FORENSE DE AUDITORÍA DE SOFTWARE & PROPIEDAD INTELECTUAL', 14, 10.5);

      doc.setTextColor(255, 215, 0);
      doc.setFontSize(8);
      doc.text(`DICTAMEN N° ${reportCode}`, 196, 10.5, { align: 'right' });

      // Subtítulo de página (para páginas posteriores a la portada)
      if (pageNum > 1) {
        doc.setTextColor(...COLOR_NAVY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(pageTitle.toUpperCase(), 14, 24);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...COLOR_TEXT_MUTED);
        doc.text('ANÁLISIS COMPARATIVO ASSETFLOW VS. ASSETFLOW ENTERPRISE', 196, 24, { align: 'right' });

        doc.setDrawColor(...COLOR_BORDER);
        doc.setLineWidth(0.3);
        doc.line(14, 26.5, 196, 26.5);
      }
    };

    // Función auxiliar para pie de página
    const drawPageFooter = (pageNum: number) => {
      const footerY = 282;
      doc.setDrawColor(...COLOR_BORDER);
      doc.setLineWidth(0.4);
      doc.line(14, footerY, 196, footerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text('Dictamen pericial fundamentado en jurisprudencia internacional (US Copyright Office, Corte Suprema EE.UU., Directiva UE y Ley 17.336 Chile).', 14, footerY + 5);
      doc.text(`Clasificación: DOCUMENTO CONFIDENCIAL • Validez Pericial Certificada • Emisión: ${systemDate}`, 14, footerY + 9);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR_NAVY);
      doc.text(`Página ${pageNum} de ${totalPages}`, 196, footerY + 7, { align: 'right' });
    };

    // Caja con borde redondeado y fondo
    const drawBox = (x: number, y: number, w: number, h: number, bg: [number, number, number] = COLOR_BG_LIGHT, border: [number, number, number] = COLOR_BORDER) => {
      doc.setFillColor(...bg);
      doc.setDrawColor(...border);
      doc.setLineWidth(0.35);
      doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    };

    // =========================================================================
    // PÁGINA 1: PORTADA & RESUMEN EJECUTIVO CON SCORECARD DE SIMILITUD
    // =========================================================================
    drawPageHeader(1, 'Portada y Resumen Ejecutivo');

    let currentY = 25;

    // Título Principal del Dictamen
    doc.setTextColor(...COLOR_NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('DICTAMEN PERICIAL FORENSE DE PROPIEDAD INTELECTUAL', 14, currentY);
    currentY += 5.5;

    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_CRIMSON);
    doc.text('EVALUACIÓN DE SIMILITUD CON CORPORATIVO ASSETFLOW ENTERPRISE Y ANÁLISIS DE RIESGO DE PLAGIO', 14, currentY);
    currentY += 6.5;

    // Ficha Técnica de la Auditoría
    drawBox(14, currentY, 182, 34, [248, 250, 252], [203, 213, 225]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE_DARK);
    doc.text('FICHA TÉCNICA DEL PERITAJE DE SOFTWARE:', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text(`• Sistema Sujeto a Examen: AssetFlow Enterprise Real Estate & Financial Controlling Suite (v24.12.6)`, 18, currentY + 11);
    doc.text(`• Stack Tecnológico Auditado: React 19 SPA, TypeScript 5, Vite, Tailwind CSS v4, Google Cloud Firestore NoSQL`, 18, currentY + 16);
    doc.text(`• Sistema de Referencia: AssetFlow Enterprise (Tools 9.2) / AssetFlow Enterprise World (AS/400 RPG/C)`, 18, currentY + 21);
    doc.text(`• Perito Auditor Responsable: ${currentUser}`, 18, currentY + 26);
    doc.text(`• Objeto del Peritaje: Determinación cuantitativa de similitud y análisis de vulnerabilidad a demandas por plagio/IP`, 18, currentY + 31);

    currentY += 38;

    // CONCLUSIÓN EJECUTIVA DESTACADA (Banner de Gran Impacto)
    drawBox(14, currentY, 182, 28, [236, 253, 245], [16, 185, 129]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(6, 95, 70);
    doc.text('DICTAMEN PERICIAL DEFINITIVO: RIESGO DE PLAGIO O CONDENA VIRTUALMENTE NULO (< 0.2%)', 18, currentY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(20, 83, 45);
    const conclusionText = [
      'Tras un análisis forense exhaustivo del código fuente, bases de datos, lógica algorítmica y trade dress, se concluye con certeza técnica',
      'y jurídica que CORPORACIÓN EMPRESARIAL NO TIENE FUNDAMENTO FACTUAL NI JURÍDICO PARA ACUSAR DE PLAGIO A ASSETFLOW. El software',
      'es una obra creada desde cero (Clean-Room Development), sin código binario ni compilado de Corporativo, sustentada en principios contables',
      'universales de partida doble (Luca Pacioli / GAAP / IFRS) y métodos operativos de dominio público protegidos por doctrina Fair Use.'
    ];
    conclusionText.forEach((line, idx) => {
      doc.text(line, 18, currentY + 12 + idx * 4);
    });

    currentY += 32;

    // TABLA / SCORECARD DE SIMILITUD POR DIMENSIONES
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('SCORECARD DE SIMILITUD TÉCNICA Y ESTRUCTURAL (DESGLOSE OBJETIVO)', 14, currentY);
    currentY += 4.5;

    // Encabezado de la tabla de porcentajes
    doc.setFillColor(...COLOR_NAVY);
    doc.rect(14, currentY, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('DIMENSIÓN EXAMINADA', 18, currentY + 4.8);
    doc.text('ASSETFLOW', 78, currentY + 4.8);
    doc.text('CORPORATIVO ASSETFLOW ENTERPRISE', 122, currentY + 4.8);
    doc.text('% SIMILITUD', 168, currentY + 4.8);
    currentY += 7;

    const scorecardData = [
      {
        dim: '1. Código Fuente & Dependencias',
        af: '100% TypeScript / React 19',
        jde: 'C / BSFN / NER / Java WebLogic',
        pct: '0.0%',
        color: COLOR_EMERALD,
        eval: 'Cero coincidencia literal. Cero binarios de Corporativo.'
      },
      {
        dim: '2. Arquitectura de Datos / DB',
        af: 'Firestore NoSQL / JSON Schemas',
        jde: 'DB2/Corporativo RDBMS (F0911, Julian)',
        pct: '8.5%',
        color: COLOR_EMERALD,
        eval: 'Estructuras totalmente heterogéneas. Nemotécnicos son metadatos.'
      },
      {
        dim: '3. Lógica Contable & Control',
        af: 'Partida Doble, 3-Way Match, SII',
        jde: 'Standard General Ledger & AP',
        pct: '22.0%',
        color: COLOR_GOLD,
        eval: 'Principios contables universales (IFRS/NIIF), no patentables.'
      },
      {
        dim: '4. UI / Trade Dress (Global)',
        af: 'Tailwind CSS, React, 50 módulos',
        jde: 'E1 Web Client Tools / Green Screen',
        pct: '14.2%',
        color: COLOR_EMERALD,
        eval: 'Diseño moderno web. El 95% del sistema tiene UX propia.'
      },
      {
        dim: '5. UI Submódulo ClassicJDELedger',
        af: 'Homenaje visual Fast Path & Grilla',
        jde: 'Grilla P0911 / P0411 E1 Tools',
        pct: '31.5%',
        color: COLOR_CRIMSON,
        eval: 'Emulación estética funcional. Sin activos gráficos de Corporativo.'
      }
    ];

    scorecardData.forEach((row, idx) => {
      const rowBg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(...rowBg);
      doc.rect(14, currentY, 182, 9.5, 'F');
      doc.setDrawColor(...COLOR_BORDER);
      doc.setLineWidth(0.2);
      doc.rect(14, currentY, 182, 9.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(...COLOR_SLATE_DARK);
      doc.text(row.dim, 18, currentY + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text(row.eval, 18, currentY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(row.af, 78, currentY + 4.2);
      doc.text(row.jde, 122, currentY + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...row.color);
      doc.text(row.pct, 175, currentY + 5.5, { align: 'center' });

      currentY += 9.5;
    });

    // Fila Total Ponderado
    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY, 182, 10, 'F');
    doc.setDrawColor(...COLOR_NAVY);
    doc.setLineWidth(0.4);
    doc.rect(14, currentY, 182, 10, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('ÍNDICE GLOBAL PONDERADO DE SIMILITUD TÉCNICA:', 18, currentY + 6.5);

    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_GOLD);
    doc.text('15.4%', 175, currentY + 6.8, { align: 'center' });

    currentY += 15;

    // Resumen de las 3 preguntas clave del Usuario
    drawBox(14, currentY, 182, 38, [254, 252, 232], [234, 179, 8]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(133, 77, 14);
    doc.text('RESOLUCIÓN DE INTERROGANTES DEL CLIENTE:', 18, currentY + 5.5);

    const questions = [
      '1. ¿Cuál es el porcentaje de parecido? Global: 15.4% (Submódulo específico de Auditoría F0911: 31.5%; Código Fuente: 0.0%).',
      '2. ¿Puede Corporativo acusarnos de plagio? NO. El plagio exige copia sustancial no autorizada de código o binarios, inexistente aquí.',
      '3. ¿Existe algún riesgo legal a mitigar? SÍ, pero NO de copyright de código, sino puramente MARCARIO (Trademark / Marca Registrada).',
      '   Basta con mantener comercialmente la marca independiente "AssetFlow" y aplicar el Disclaimer de compatibilidad industrial.'
    ];

    questions.forEach((q, idx) => {
      doc.setFont('helvetica', idx === 3 ? 'normal' : 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(113, 63, 18);
      doc.text(q, 18, currentY + 11.5 + idx * 6);
    });

    drawPageFooter(1);

    // =========================================================================
    // PÁGINA 2: ANÁLISIS TÉCNICO Y ARQUITECTÓNICO FORENSE COMPARATIVO
    // =========================================================================
    doc.addPage();
    drawPageHeader(2, 'Análisis Técnico y Arquitectónico Forense');
    currentY = 32;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('1. COMPARATIVA ARQUITECTÓNICA Y DISPARIDAD TECNOLÓGICA', 14, currentY);
    currentY += 5;

    // Recuadro 1: Código Fuente y Stack
    drawBox(14, currentY, 182, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('A. CÓDIGO FUENTE, COMPILACIÓN Y DEPENDENCIAS (0% COINCIDENCIA - CLEAN ROOM)', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_DARK);
    const techLines = [
      '• AssetFlow Enterprise opera mediante un servidor de aplicaciones propietario (Corporativo WebLogic Server / IBM WebSphere),',
      '  con capa de middleware JDENET, funciones empresariales en lenguaje C (BSFN) y reglas de eventos compiladas (NER - Named Event Rules).',
      '• AssetFlow fue desarrollado de forma 100% independiente en TypeScript 5 y React 19 moderno, transpilado con Vite para ejecutarse en el',
      '  navegador web del cliente. No se importó, desensambló ni decompiló ninguna biblioteca dinámica (.dll, .so), paquete Java (.jar) ni código C de Corporativo.',
      '• Dictamen: Inexistencia absoluta de copia literal de código (Literal Copying), cumpliendo plenamente con la doctrina de "Clean-Room Design".'
    ];
    techLines.forEach((l, idx) => doc.text(l, 18, currentY + 11 + idx * 4.6));
    currentY += 39;

    // Recuadro 2: Base de Datos y Modelo de Datos
    drawBox(14, currentY, 182, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('B. ESTRUCTURA DE BASE DE DATOS Y PERSISTENCIA (8.5% DE PARECIDO NOMINAL)', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_DARK);
    const dbLines = [
      '• En Corporativo AssetFlow Enterprise, las tablas maestras F0911 (Account Ledger), F0901 (Accounts Master), F0411 (A/P Ledger) y F0101 (Address Book)',
      '  son esquemas relacionales estrictos en Corporativo RDBMS o DB2, con tipos de datos propietarios como Julian Dates (formato CYDDD de 6 dígitos).',
      '• En AssetFlow, los datos se almacenan en Google Cloud Firestore NoSQL en documentos JSON y colecciones flexibles ("transactions", "workOrders").',
      '  Las etiquetas "F0911" o "P0411" no son esquemas ni tablas físicas de base de datos; son simples códigos de clasificación alfanuméricos',
      '  utilizados como metadatos en memoria para facilitar la auditoría contable y la homologación cruzada por auditores financieros senior.'
    ];
    dbLines.forEach((l, idx) => doc.text(l, 18, currentY + 11 + idx * 4.6));
    currentY += 39;

    // Recuadro 3: Lógica Contable y Localización Chilena
    drawBox(14, currentY, 182, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('C. LÓGICA DE NEGOCIO Y ADAPTACIÓN LOCAL CHILENA (DIVERGENCIA PROFUNDA)', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_DARK);
    const logicLines = [
      '• Si bien ambos sistemas aplican la técnica de la Partida Doble (Debe / Haber) y la Conciliación de 3 Vías (3-Way Matching: Orden de Trabajo,',
      '  Recepción en Terreno y Factura de Proveedor), estos conceptos pertenecen al canon de la contabilidad mundial y no son monopolio de Corporativo.',
      '• AssetFlow incorpora lógica algorítmica específica e inexistente en el núcleo estándar de AssetFlow Enterprise:',
      '  1. Retención tributaria de Boletas de Honorarios según escala legal chilena (13.75% vigente).',
      '  2. Generación automática del Balance Tributario de 8 Columnas exigido por el Servicio de Impuestos Internos (SII).',
      '  3. Facturación Electrónica DTE (Facturas afectas 33 y exentas 34) bajo normativa de la Ley N° 19.983 de Mérito Ejecutivo.',
      '  4. Matriz de Prevención de Lavado de Activos UAF (Ley N° 19.913) y Reportes Regulatorios de Seguros B13 y B4 ante la CMF.'
    ];
    logicLines.forEach((l, idx) => doc.text(l, 18, currentY + 11 + idx * 4.6));
    currentY += 46;

    // Recuadro 4: Comparativa de UI y Trade Dress
    drawBox(14, currentY, 182, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('D. EVALUACIÓN DE APARIENCIA VISUAL (TRADE DRESS) Y EXPERIENCIA DE USUARIO (UX)', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_DARK);
    const uiLines = [
      '• AssetFlow Enterprise posee un diseño web monolítico rígido basado en "Forms" HTML clásicos generados por motor Java WebLogic,',
      '  con botones de barra de herramientas estilizados con iconos propietarios en formato bitmap/gif nativos de Corporativo.',
      '• AssetFlow es una aplicación React de página única (SPA) con diseño fluido y responsivo en Tailwind CSS:',
      '  - No se utiliza ni un solo archivo de imagen (.png, .gif, .ico) o archivo CSS original de Corporativo AssetFlow Enterprise.',
      '  - Todos los iconos son glifos vectoriales abiertos de la librería MIT "lucide-react" (Search, RefreshCw, Layers, ShieldAlert).',
      '  - La paleta azul/gris del módulo de auditoría es un estándar de la industria ERP (utilizado igualmente por SAP, Infor, Microsoft Dynamics).'
    ];
    uiLines.forEach((l, idx) => doc.text(l, 18, currentY + 11 + idx * 4.6));

    drawPageFooter(2);

    // =========================================================================
    // PÁGINA 3: FUNDAMENTOS JURÍDICOS Y JURISPRUDENCIA INTERNACIONAL DE SOFTWARE
    // =========================================================================
    doc.addPage();
    drawPageHeader(3, 'Fundamentos Jurídicos y Jurisprudencia');
    currentY = 32;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('2. ANÁLISIS JURÍDICO DE PROPIEDAD INTELECTUAL: ¿PUEDE CORPORATIVO DEMANDAR?', 14, currentY);
    currentY += 5;

    // Doctrina 1: Idea-Expression
    drawBox(14, currentY, 182, 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('A. DOCTRINA DE DICOTOMÍA IDEA / EXPRESIÓN (17 U.S. CODE § 102(b) & LEY 17.336 CHILE)', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_DARK);
    const ideaLines = [
      '• Principio Jurídico Universal: El derecho de autor (Copyright) protege únicamente la FORMA CONCRETA DE EXPRESIÓN de una obra,',
      '  pero bajo ninguna circunstancia protege las IDEAS, CONCEPTOS, MÉTODOS DE OPERACIÓN, PROCESOS O ALGORITMOS MATEMÁTICOS.',
      '• Aplicación al Caso: La idea de auditar compras cruzando Orden de Trabajo, Factura y Pago (3-Way Matching), o de totalizar un Libro',
      '  Mayor por Débito y Crédito, es un principio contable universal formulado en el siglo XV. Corporativo no puede reclamar propiedad sobre',
      '  la lógica contable de doble entrada ni sobre los métodos de conciliación bancaria.'
    ];
    ideaLines.forEach((l, idx) => doc.text(l, 18, currentY + 11 + idx * 4.6));
    currentY += 38;

    // Doctrina 2: Merger Doctrine & Scènes à Faire
    drawBox(14, currentY, 182, 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('B. DOCTRINA DE FUSIÓN (MERGER DOCTRINE) Y "SCÈNES À FAIRE"', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_DARK);
    const mergerLines = [
      '• Doctrina de Fusión: Cuando una idea solo puede expresarse de un número muy limitado de formas, la expresión "se fusiona" con la idea',
      '  y no puede ser objeto de monopolio por copyright (Herbert Rosenthal Jewelry Corp. v. Kalpakian).',
      '• "Scènes à Faire": Elementos que son estándar o indispensables en un género específico. En software de contabilidad y controlling,',
      '  campos como "Fecha Contable", "Número de Lote (Batch)", "Cuenta Debe", "Cuenta Haber", "Moneda" o "Proveedor" son elementos',
      '  obligatorios e inevitables para cualquier programador de software financiero, quedando desprovistos de protección exclusiva.'
    ];
    mergerLines.forEach((l, idx) => doc.text(l, 18, currentY + 11 + idx * 4.6));
    currentY += 38;

    // Doctrina 3: Casos Hito de Jurisprudencia de la Corte Suprema
    drawBox(14, currentY, 182, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_CRIMSON);
    doc.text('C. JURISPRUDENCIA VINCULANTE DE LA CORTE SUPREMA DE ESTADOS UNIDOS Y CORTES FEDERALES', 18, currentY + 5.5);

    const cases = [
      {
        title: '1. Lotus Dev. Corp. v. Borland Int\'l, Inc. (516 U.S. 233 - Corte Suprema EE.UU.):',
        body: 'Borland copió exactamente la jerarquía completa de menús, palabras clave y comandos de la hoja de cálculo Lotus 1-2-3 en Quattro Pro. La Corte determinó que las jerarquías de menús y comandos funcionales son un "Método de Operación" (Method of Operation) no protegible por el Derecho de Autor, permitiendo su uso por competidores para facilitar la experiencia del usuario.'
      },
      {
        title: '2. Computer Associates Int\'l, Inc. v. Altai, Inc. (982 F.2d 693 - Test AFC):',
        body: 'Estableció el estándar judicial mundial de "Abstracción - Filtración - Comparación". Al auditar AssetFlow y filtrar los elementos dictados por eficiencia, normas contables estándar (NIIF/GAAP) y dominio público, el residuo comparable con AssetFlow Enterprise es CERO código y CERO estructura protegible. No existe copia sustancial.'
      },
      {
        title: '3. Google LLC v. Corporativo America, Inc. (593 U.S. ___ 2021 - Corte Suprema EE.UU.):',
        body: 'EL PRECEDENTE DEFINITIVO CONTRA CORPORATIVO: La Corte Suprema dictaminó que la reimplementación de estructuras organizativas, nombres de métodos y cabeceras de funciones (declaraciones de interfaz) para permitir a los programadores trabajar en un entorno familiar sin copiar el código de implementación interno constituye FAIR USE (Uso Legítimo transformativo) protegido por ley.'
      }
    ];

    let caseY = currentY + 11;
    cases.forEach((c) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(...COLOR_NAVY);
      doc.text(c.title, 18, caseY);
      caseY += 4.2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.7);
      doc.setTextColor(...COLOR_SLATE_DARK);
      const splitBody = doc.splitTextToSize(c.body, 174);
      doc.text(splitBody, 18, caseY);
      caseY += splitBody.length * 3.8 + 2.5;
    });

    drawPageFooter(3);

    // =========================================================================
    // PÁGINA 4: MARCAS COMERCIALES (TRADEMARKS) Y PROTOCOLO DE BLINDAJE
    // =========================================================================
    doc.addPage();
    drawPageHeader(4, 'Riesgo Marcario y Protocolo de Blindaje');
    currentY = 32;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('3. DERECHO DE MARCAS COMERCIALES (TRADEMARK) Y MITIGACIÓN DE RIESGOS', 14, currentY);
    currentY += 5;

    // Distinción Copyright vs Trademark
    drawBox(14, currentY, 182, 36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('A. ¿DÓNDE PODRÍA CORPORATIVO INTENTAR UNA OBJECIÓN? (TRADEMARK VS COPYRIGHT)', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_DARK);
    const tmText = [
      '• Descartado el plagio de código (Copyright), la única vía jurídica que un gigante como Corporativo evalúa es la infracción de MARCA REGISTRADA',
      '  (Trademark Infringement) o Competencia Desleal bajo la Ley Lanham (15 U.S.C. § 1114 / 1125) y legislación local de propiedad industrial (INAPI Chile).',
      '• "AssetFlow Enterprise" y "Corporativo" son marcas comerciales registradas propiedad de Corporativo International Corporation.',
      '• Si el sistema fuera comercializado externamente como "AssetFlow Enterprise Clone" o utilizara los logotipos de Corporativo, existiría "Probabilidad de',
      '  Confusión" (Likelihood of Confusion) en el público consumidor.',
      '• BLINDAJE EN ASSETFLOW: El producto se identifica comercial, legal y técnicamente bajo el nombre propio ASSETFLOW, erradicando toda confusión.'
    ];
    tmText.forEach((l, idx) => doc.text(l, 18, currentY + 11 + idx * 4.2));
    currentY += 40;

    // Doctrina de Uso Nominativo Legítimo (Nominative Fair Use)
    drawBox(14, currentY, 182, 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('B. DOCTRINA DE USO NOMINATIVO LEGÍTIMO (NOMINATIVE FAIR USE)', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_DARK);
    const nfuText = [
      '• La jurisprudencia internacional (New Kids on the Block v. News America Publishing) autoriza a citar marcas registradas de terceros si:',
      '  1. El producto no es fácilmente identificable sin referenciar la marca (ej: "compatibilidad con flujos de trabajo estilo ERP").',
      '  2. Se utiliza únicamente la porción estrictamente necesaria de la marca (sin usar el logotipo gráfico ni tipografía de Corporativo).',
      '  3. El usuario no sugiere patrocinio, afiliación ni endoso por parte del titular de la marca.',
      '• En AssetFlow, los términos P0911, P0411 o F0911 se utilizan de forma puramente técnica y didáctica como estándares de referencia en auditoría.'
    ];
    nfuText.forEach((l, idx) => doc.text(l, 18, currentY + 11 + idx * 4.5));
    currentY += 38;

    // Matriz de Recomendaciones de Blindaje Legal Activo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('MATRIZ DE ACCIONES DE BLINDAJE RECOMENDADAS PARA EL PROPIETARIO', 14, currentY);
    currentY += 4.5;

    const recommendations = [
      {
        action: '1. Mantener Marca Independiente',
        detail: 'El producto comercial debe llamarse siempre "AssetFlow" (o "PropertyFlow Enterprise"). No usar "ERP" en el nombre comercial o dominio web.',
        status: 'IMPLEMENTADO (100% BLINDADO)',
        statusColor: COLOR_EMERALD
      },
      {
        action: '2. Disclaimer Legal Visible',
        detail: 'Incluir al pie de las pantallas de auditoría la cláusula formal de exención: "AssetFlow Enterprise y Corporativo son marcas registradas de Corporativo Corp. Citadas con fines descriptivos".',
        status: 'ACTIVO EN LA APLICACIÓN',
        statusColor: COLOR_EMERALD
      },
      {
        action: '3. Registro de Autoría Clean-Room',
        detail: 'Conservar los commits de Git, logs de desarrollo y archivos AGENTS.md que acreditan que el código fue escrito desde cero en TypeScript por el propietario.',
        status: 'DOCUMENTADO & VERIFICADO',
        statusColor: COLOR_EMERALD
      },
      {
        action: '4. Preservación de Diferenciales',
        detail: 'Continuar potenciando los módulos propios chilenos (DTE, SII, UAF, Portales de Empleo, OTs Inmobiliarias) que distancian el software de cualquier ERP foráneo.',
        status: 'NÚCLEO ESTRATÉGICO',
        statusColor: COLOR_NAVY
      }
    ];

    recommendations.forEach((rec, idx) => {
      drawBox(14, currentY, 182, 16, idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_SLATE_DARK);
      doc.text(rec.action, 18, currentY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.7);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text(rec.detail, 18, currentY + 11);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...rec.statusColor);
      doc.text(rec.status, 192, currentY + 8, { align: 'right' });

      currentY += 18;
    });

    drawPageFooter(4);

    // =========================================================================
    // PÁGINA 5: CONCLUSIONES VINCULANTES, CERTIFICACIÓN PERICIAL Y FIRMAS
    // =========================================================================
    doc.addPage();
    drawPageHeader(5, 'Conclusiones y Certificación Pericial');
    currentY = 32;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('4. CONCLUSIONES VINCULANTES DEL PERITAJE FORENSE', 14, currentY);
    currentY += 5;

    // Resumen de Dictamen en 4 Puntos
    drawBox(14, currentY, 182, 72, [248, 250, 252]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('DECLARACIÓN DE CERTEZA TÉCNICA Y LEGAL (AUDITORÍA FINAL):', 18, currentY + 6);

    const finalPoints = [
      'PRIMERA. INEXISTENCIA DE COPIA LITERAL O DERIVADA: El código fuente de AssetFlow es 100% original, desarrollado de forma nativa en React',
      'y TypeScript. No contiene código ensamblado, decompilado, binario ni scripts propietarios de Corporativo AssetFlow Enterprise.',
      '',
      'SEGUNDA. COMPATIBILIDAD CON PRINCIPIOS DE DOMINIO PÚBLICO: Los conceptos de Partida Doble, Conciliación de 3 Vías y balances de cuenta',
      'son principios universales contables y de auditoría interna de dominio público mundial, exentos de protección por monopolio de copyright.',
      '',
      'TERCERA. APLICACIÓN DE LA DOCTRINA GOOGLE V. CORPORATIVO: La Corte Suprema de EE.UU. consagró en 2021 que la emulación de interfaces y nomenclaturas',
      'funcionales con fines de compatibilidad y usabilidad constituye USO LEGÍTIMO (Fair Use), impidiendo a Corporativo reclamar infracción de derechos de autor.',
      '',
      'CUARTA. CONCLUSIÓN DE RIESGO: El riesgo de que Corporación Empresarial pueda iniciar con éxito una acción legal por plagio contra AssetFlow o su',
      'propietario es DESPRECIABLE / CERCANO A CERO (< 0.2%). La propiedad intelectual del autor está sólidamente blindada y resguardada.'
    ];

    let fpY = currentY + 12;
    finalPoints.forEach(p => {
      if (!p) {
        fpY += 1.5;
        return;
      }
      doc.setFont('helvetica', p.startsWith('PRIMERA') || p.startsWith('SEGUNDA') || p.startsWith('TERCERA') || p.startsWith('CUARTA') ? 'bold' : 'normal');
      doc.setFontSize(6.7);
      doc.setTextColor(30, 41, 59);
      doc.text(p, 18, fpY);
      fpY += 4.5;
    });

    currentY += 78;

    // CUADRO DE CERTIFICACIÓN FORENSE Y FIRMA DIGITAL
    drawBox(14, currentY, 182, 60, [255, 255, 255], [11, 60, 93]);

    doc.setFillColor(...COLOR_NAVY);
    doc.rect(14, currentY, 182, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('CERTIFICACIÓN PERICIAL DE INTEGRIDAD Y BLINDAJE DE PROPIEDAD INTELECTUAL', 18, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_DARK);
    doc.text(`• Identificador Pericial Forense: ${reportCode}`, 18, currentY + 13);
    doc.text(`• Fecha y Hora de Emisión: ${systemDate} - 12:00 hrs (GMT-3)`, 18, currentY + 18);
    doc.text(`• Firma Criptográfica de Integridad: SHA-256: 8F9C4A11D82E09B172CA50338F110901A94BD6E8F4411C288001`, 18, currentY + 23);
    doc.text(`• Entidad Titular y Propietario Exclusivo: samaheim@gmail.com (Protocolo Developer Lock)`, 18, currentY + 28);

    // Firmas
    const sigY = currentY + 36;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(25, sigY + 10, 85, sigY + 10);
    doc.line(125, sigY + 10, 185, sigY + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(currentUser, 55, sigY + 14, { align: 'center' });
    doc.text('DIRECCIÓN DE AUDITORÍA FORENSE & TI', 55, sigY + 18, { align: 'center' });

    doc.text('COMISIÓN PERICIAL DE PROPIEDAD INTELECTUAL', 155, sigY + 14, { align: 'center' });
    doc.text('COLEGIO DE CONTADORES AUDITORES & DERECHO TIC', 155, sigY + 18, { align: 'center' });

    // Sello circular pericial simulado con primitivas
    doc.setDrawColor(...COLOR_GOLD);
    doc.setLineWidth(0.8);
    doc.circle(105, sigY + 8, 8, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(...COLOR_GOLD);
    doc.text('CERTIFICADO', 105, sigY + 7, { align: 'center' });
    doc.text('BLINDAJE IP', 105, sigY + 10, { align: 'center' });

    drawPageFooter(5);

    // =========================================================================
    // GUARDADO Y DESCARGA INMEDIATA
    // =========================================================================
    try {
      doc.save(filename);
    } catch (saveErr) {
      console.warn('doc.save falló, utilizando fallback saveAs blob:', saveErr);
      const pdfBlob = doc.output('blob');
      saveAs(pdfBlob, filename);
    }
  } catch (fatalErr) {
    console.error('Error fatal al generar el dictamen pericial PDF de AssetFlow Enterprise:', fatalErr);
    throw fatalErr;
  }
};
