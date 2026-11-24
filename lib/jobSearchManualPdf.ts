import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

/**
 * Generates and downloads the official, high-resolution vector PDF manual 
 * for the Chilean Job Search & CV Match module (P09OWJOB).
 *
 * Designed with 100% native jsPDF vector primitives:
 * - Completely immune to html2canvas / Tailwind CSS v4 styling issues
 * - Guaranteed instant, reliable file download across all browsers and sandboxed iframes
 * - Crisp 300+ DPI searchable typography and corporate branding
 */
export const downloadJobSearchManualPdf = async (
  filename: string = 'Manual_Usuario_Modulo_Empleo_P09OWJOB.pdf'
): Promise<void> => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const totalPages = 4;

    // Corporate Color Palette
    const COLOR_NAVY: [number, number, number] = [11, 60, 93];       // #0B3C5D
    const COLOR_GOLD: [number, number, number] = [255, 204, 0];      // #FFCC00
    const COLOR_EMERALD: [number, number, number] = [16, 185, 129];  // #10B981
    const COLOR_AMBER: [number, number, number] = [245, 158, 11];    // #F59E0B
    const COLOR_INDIGO: [number, number, number] = [79, 70, 229];    // #4F46E5
    const COLOR_SLATE_DARK: [number, number, number] = [15, 23, 42]; // #0F172A
    const COLOR_TEXT_MUTED: [number, number, number] = [100, 116, 139]; // #64748B
    const COLOR_BG_LIGHT: [number, number, number] = [248, 250, 252]; // #F8FAFC
    const COLOR_BORDER_LIGHT: [number, number, number] = [226, 232, 240]; // #E2E8F0

    // Reusable Header Helper
    const drawPageHeader = (pageNumber: number, title: string) => {
      // Top Navy Bar
      doc.setFillColor(...COLOR_NAVY);
      doc.rect(0, 0, 210, 16, 'F');

      // Top Gold Accent Line
      doc.setFillColor(...COLOR_GOLD);
      doc.rect(0, 16, 210, 1.5, 'F');

      // Header text left
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('GUÍA DIDÁCTICA • MÓDULO DE BÚSQUEDA DE EMPLEO CHILE', 14, 10.5);

      // Program Code right
      doc.setTextColor(...COLOR_GOLD);
      doc.setFontSize(8.5);
      doc.text('PROGRAMA: P09OWJOB', 196, 10.5, { align: 'right' });

      // Subtitle below bar (only on pages > 1)
      if (pageNumber > 1) {
        doc.setTextColor(...COLOR_NAVY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(title.toUpperCase(), 14, 23);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...COLOR_TEXT_MUTED);
        doc.text('MANUAL DE OPERACIÓN PASO A PASO PARA CANDIDATOS Y EJECUTIVOS', 196, 23, { align: 'right' });

        doc.setDrawColor(...COLOR_BORDER_LIGHT);
        doc.setLineWidth(0.3);
        doc.line(14, 25.5, 196, 25.5);
      }
    };

    // Reusable Footer Helper
    const drawPageFooter = (pageNumber: number) => {
      const footerY = 282;
      doc.setDrawColor(...COLOR_BORDER_LIGHT);
      doc.setLineWidth(0.4);
      doc.line(14, footerY, 196, footerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text('SISTEMA ASSETFLOW • DEPTO. DE CONTROL INMOBILIARIO & DESARROLLO LABORAL', 14, footerY + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR_NAVY);
      doc.text(`Página ${pageNumber} de ${totalPages}`, 196, footerY + 5.5, { align: 'right' });
    };

    // Reusable Box Card Helper
    const drawCardBox = (
      x: number,
      y: number,
      w: number,
      h: number,
      bgColor: [number, number, number] = COLOR_BG_LIGHT,
      borderColor: [number, number, number] = COLOR_BORDER_LIGHT,
      radius: number = 2
    ) => {
      doc.setFillColor(...bgColor);
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, h, radius, radius, 'FD');
    };

    // Reusable Step Badge Helper
    const drawStepHeader = (y: number, stepNum: string, stepTitle: string, badgeBg: [number, number, number] = COLOR_NAVY) => {
      // Step badge circle
      doc.setFillColor(...badgeBg);
      doc.circle(20, y + 2, 4.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(stepNum, 20, y + 4.5, { align: 'center' });

      // Step title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...COLOR_SLATE_DARK);
      doc.text(stepTitle.toUpperCase(), 28, y + 4.5);
    };

    // =========================================================================
    // PÁGINA 1: PORTADA, BIENVENIDA Y PASO 1 (INGRESO AL MÓDULO)
    // =========================================================================
    drawPageHeader(1, 'Portada & Resumen');

    // Título Principal
    let currentY = 25;

    // Ficha Técnica Header
    drawCardBox(14, currentY, 182, 28, [241, 245, 249], [203, 213, 225], 3);

    // Icono Maletín / Emblema
    doc.setFillColor(...COLOR_NAVY);
    doc.roundedRect(18, currentY + 3.5, 21, 21, 2.5, 2.5, 'F');
    doc.setTextColor(...COLOR_GOLD);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('JOB', 28.5, currentY + 16, { align: 'center' });

    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DEPARTAMENTO INMOBILIARIO & DESARROLLO PROFESIONAL', 43, currentY + 9);

    doc.setTextColor(...COLOR_SLATE_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('MANUAL DE USO PRÁCTICO: BÚSQUEDA DE EMPLEO CHILE', 43, currentY + 16);

    doc.setTextColor(...COLOR_EMERALD);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('VERSIÓN 2026.4 • ALGORITMO MATCH CV & CARTA IA • PROGRAMA P09OWJOB', 43, currentY + 22.5);

    currentY += 32;

    // Caja de Bienvenida y Propósito
    drawCardBox(14, currentY, 182, 28, [254, 243, 199], [252, 211, 77], 3); // Amber-50 / Amber-300
    doc.setFillColor(...COLOR_AMBER);
    doc.rect(14, currentY, 3, 28, 'F'); // Left accent bar

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 53, 15); // amber-900
    doc.text('★ BIENVENIDO: ¿PARA QUÉ SIRVE ESTE MÓDULO Y POR QUÉ ES TAN EFICIENTE?', 21, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14); // amber-800
    const welcomeText = 
      'Este módulo reúne en una sola interfaz las mejores ofertas de trabajo de Chile, integrando tanto vacantes del Estado / Sector Público (Empleos Públicos, Servicio Civil, Alta Dirección Pública) como del Sector Privado (LinkedIn, Laborum y Chiletrabajos). Compara al instante los requisitos con tus competencias, calcula tu porcentaje de compatibilidad (Match %), redacta cartas de presentación formales con Inteligencia Artificial y te enlaza directamente al portal para postular en segundos.';
    const splitWelcome = doc.splitTextToSize(welcomeText, 170);
    doc.text(splitWelcome, 21, currentY + 12.5);

    currentY += 32;

    // Resumen Gráfico de los 5 Pasos Esenciales
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('RESUMEN DEL FLUJO OPERATIVO EN 5 PASOS CLAVE:', 14, currentY);

    currentY += 4;
    const stepBoxWidth = 34.5;
    const stepBoxGap = 2.3;
    const stepsSummary = [
      { num: '1', title: 'BUSCAR OFERTAS', desc: 'Filtra por tu profesión o cargo', bg: COLOR_NAVY },
      { num: '2', title: 'VER MATCH %', desc: 'Evalúa tu compatibilidad al instante', bg: COLOR_EMERALD },
      { num: '3', title: 'GENERAR CARTA', desc: '1 clic con Inteligencia Artificial', bg: [79, 70, 229] as [number, number, number] }, // Indigo
      { num: '4', title: 'POSTULAR DIRECTO', desc: 'Enlace directo sin intermediarios', bg: [37, 99, 235] as [number, number, number] }, // Blue
      { num: '5', title: 'SEGUIMIENTO', desc: 'Tablero Kanban de entrevistas', bg: COLOR_AMBER }
    ];

    stepsSummary.forEach((s, idx) => {
      const boxX = 14 + idx * (stepBoxWidth + stepBoxGap);
      drawCardBox(boxX, currentY, stepBoxWidth, 24, COLOR_BG_LIGHT, COLOR_BORDER_LIGHT, 2);

      // Badge
      doc.setFillColor(...s.bg);
      doc.roundedRect(boxX + 3, currentY + 3, 6, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(s.num, boxX + 6, currentY + 7.2, { align: 'center' });

      // Title
      doc.setTextColor(...COLOR_SLATE_DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(s.title, boxX + 11, currentY + 7);

      // Description
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      const splitDesc = doc.splitTextToSize(s.desc, stepBoxWidth - 6);
      doc.text(splitDesc, boxX + 3, currentY + 14);
    });

    currentY += 28;

    // Separador sutil
    doc.setDrawColor(...COLOR_BORDER_LIGHT);
    doc.setLineWidth(0.3);
    doc.line(14, currentY, 196, currentY);

    currentY += 6;

    // PASO 1: CÓMO INGRESAR AL MÓDULO
    drawStepHeader(currentY, '1', 'Paso 1: Cómo Ingresar al Módulo de Empleo (P09OWJOB)', COLOR_NAVY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SLATE_DARK);
    doc.text('Existen dos modalidades seguras para acceder al módulo, según la configuración de tu cuenta:', 14, currentY);

    currentY += 4;

    // Opción A: Usuario Exclusivo SOLO EMPLEO
    drawCardBox(14, currentY, 89, 44, [248, 250, 252], [203, 213, 225], 2.5);
    doc.setFillColor(...COLOR_NAVY);
    doc.rect(14, currentY, 3, 44, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('OPCIÓN A: USUARIO EXCLUSIVO (SOLO EMPLEO)', 20, currentY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLOR_SLATE_DARK);
    const opAText = 
      '• Si tu perfil tiene el rol "SOLO EMPLEO", el sistema se iniciará de forma automática y exclusiva en este módulo tras iniciar sesión.\n' +
      '• Se oculta todo el menú de administración y finanzas corporativas para brindarte un entorno limpio, privado y 100% focalizado en tu postulación laboral.\n' +
      '• Máxima confidencialidad y rapidez de carga.';
    doc.text(doc.splitTextToSize(opAText, 80), 20, currentY + 13);

    // Opción B: Menú Lateral o Fast Path
    drawCardBox(107, currentY, 89, 44, [248, 250, 252], [203, 213, 225], 2.5);
    doc.setFillColor(...COLOR_INDIGO);
    doc.rect(107, currentY, 3, 44, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_INDIGO);
    doc.text('OPCIÓN B: MENÚ LATERAL O FAST PATH', 113, currentY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLOR_SLATE_DARK);
    const opBText = 
      '• Para usuarios estándar o administradores: en la barra lateral izquierda, abre la sección "Portal Laboral & Empleo" y selecciona "Búsqueda de Empleo Chile & Match CV (P09OWJOB)".\n' +
      '• Vía Fast Path: Escribe "empleo" o el código "P09OWJOB" en el casillero de comandos superior y pulsa IR o presiona Enter.\n' +
      '• El sistema abrirá la pantalla completa al instante.';
    doc.text(doc.splitTextToSize(opBText, 80), 113, currentY + 13);

    currentY += 49;

    // Caja Informativa de Seguridad
    drawCardBox(14, currentY, 182, 19, [238, 242, 255], [199, 210, 254], 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(55, 48, 163); // indigo-800
    doc.text('🛡️ PROTOCOLO DE SEGURIDAD Y PRIVACIDAD DE DATOS (LEY N° 19.628 CHILE):', 18, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(67, 56, 202);
    doc.text('Tu información curricular, pretensiones de renta y postulaciones se almacenan cifradas bajo estándares bancarios. Ningún tercero ni empresa externa puede acceder a tu historial sin tu autorización explícita.', 18, currentY + 12);

    drawPageFooter(1);

    // =========================================================================
    // PÁGINA 2: PASO 2 (BÚSQUEDA Y FILTROS) Y PASO 3 (ALGORITMO MATCH CV %)
    // =========================================================================
    doc.addPage();
    drawPageHeader(2, 'Búsqueda, Filtros y Compatibilidad Match CV');

    currentY = 30;

    // PASO 2: CÓMO BUSCAR Y FILTRAR VACANTES
    drawStepHeader(currentY, '2', 'Paso 2: Búsqueda Avanzada y Filtros de Vacantes', COLOR_NAVY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SLATE_DARK);
    doc.text('Optimiza tu tiempo aplicando los tres filtros visuales integrados en la barra superior:', 14, currentY);

    currentY += 5;

    // 3 Tarjetas de Filtro
    const filterCards = [
      {
        tag: 'FILTRO A',
        title: 'BÚSQUEDA POR TEXTO CLAVE',
        desc: 'Escribe términos como "Auditor", "Ingeniero", "Jefe de Operaciones", o el nombre de una entidad ("TGR", "Codelco", "Falabella"). Las ofertas se filtran en tiempo real sin recargar la página.',
        color: COLOR_NAVY
      },
      {
        tag: 'FILTRO B',
        title: 'SECTOR PÚBLICO VS. PRIVADO',
        desc: 'Elige fácilmente entre Concursos del Estado (Empleos Públicos, Alta Dirección Pública) y Empresas Privadas para visualizar únicamente las convocatorias que se adecúan a tu objetivo profesional.',
        color: [79, 70, 229] as [number, number, number]
      },
      {
        tag: 'FILTRO C',
        title: 'ACTUALIZACIÓN EN VIVO',
        desc: 'Pulsa el botón amarillo "Actualizar Portales Chile" para sincronizar las últimas vacantes publicadas en los boletines laborales de las últimas 24 a 48 horas.',
        color: COLOR_AMBER
      }
    ];

    filterCards.forEach((fc, idx) => {
      const boxW = 59;
      const boxX = 14 + idx * (boxW + 2.5);
      drawCardBox(boxX, currentY, boxW, 46, COLOR_BG_LIGHT, COLOR_BORDER_LIGHT, 2);

      // Accent top line
      doc.setFillColor(...fc.color);
      doc.rect(boxX, currentY, boxW, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...fc.color);
      doc.text(fc.tag, boxX + 4, currentY + 7);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_SLATE_DARK);
      doc.text(doc.splitTextToSize(fc.title, boxW - 8), boxX + 4, currentY + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text(doc.splitTextToSize(fc.desc, boxW - 8), boxX + 4, currentY + 22);
    });

    currentY += 52;

    // Separador
    doc.setDrawColor(...COLOR_BORDER_LIGHT);
    doc.setLineWidth(0.3);
    doc.line(14, currentY, 196, currentY);

    currentY += 6;

    // PASO 3: CÓMO ENTENDER EL MATCH % DE COMPATIBILIDAD
    drawStepHeader(currentY, '3', 'Paso 3: Comprensión del Algoritmo Match CV (%)', COLOR_EMERALD);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SLATE_DARK);
    const matchIntro = 
      'El motor de Inteligencia Artificial compara tus competencias, certificaciones y experiencia registrada contra las bases del concurso o descripción de cargo, asignando una calificación porcentual de idoneidad:';
    doc.text(doc.splitTextToSize(matchIntro, 182), 14, currentY);

    currentY += 8;

    // 3 Niveles de Match
    const matchTiers = [
      {
        range: '90% A 100% — EXCELENTE (MATCH TOTAL)',
        badge: 'ALTA PROBABILIDAD',
        action: '¡Postula de inmediato! Cumples prácticamente todos los requisitos del perfil.',
        subtext: 'Tu perfil figura entre los primeros filtros de los comités evaluadores y reclutadores. Genera tu carta y envía tus antecedentes de forma prioritaria.',
        bgColor: [236, 253, 245] as [number, number, number], // emerald-50
        borderColor: [110, 231, 183] as [number, number, number], // emerald-300
        textColor: [6, 95, 70] as [number, number, number], // emerald-800
        pillColor: COLOR_EMERALD
      },
      {
        range: '75% A 89% — BUEN MATCH (ALTAMENTE POSTULABLE)',
        badge: 'COMPETITIVO',
        action: 'Totalmente postulable. Tienes las competencias críticas y experiencia base.',
        subtext: 'Las habilidades faltantes son complementarias. Puedes destacar tu capacidad de adaptación y logros equivalentes en la carta de presentación generada por el sistema.',
        bgColor: [254, 243, 199] as [number, number, number], // amber-50
        borderColor: [252, 211, 77] as [number, number, number], // amber-300
        textColor: [146, 64, 14] as [number, number, number], // amber-800
        pillColor: COLOR_AMBER
      },
      {
        range: 'BAJO 75% — REVISAR REQUISITOS ESPECÍFICOS',
        badge: 'EVALUAR DETALLE',
        action: 'Revisa las habilidades marcadas en gris para evaluar brechas o actualizarlas.',
        subtext: 'Si posees esas competencias en tu trayectoria real pero no estaban registradas en tu perfil de la app, agrégalas en la pestaña "Mi Perfil & Competencias" para recalcular el Match.',
        bgColor: [241, 245, 249] as [number, number, number], // slate-100
        borderColor: [203, 213, 225] as [number, number, number], // slate-300
        textColor: [51, 65, 85] as [number, number, number], // slate-700
        pillColor: [100, 116, 139] as [number, number, number] // slate-500
      }
    ];

    matchTiers.forEach((tier) => {
      drawCardBox(14, currentY, 182, 26, tier.bgColor, tier.borderColor, 2);

      // Range Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...tier.textColor);
      doc.text(tier.range, 19, currentY + 6.5);

      // Pill right
      doc.setFillColor(...tier.pillColor);
      doc.roundedRect(160, currentY + 2.5, 32, 5.5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(tier.badge, 176, currentY + 6.3, { align: 'center' });

      // Action line
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...tier.textColor);
      doc.text(`✓ ${tier.action}`, 19, currentY + 12.5);

      // Subtext
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...tier.textColor);
      doc.text(doc.splitTextToSize(tier.subtext, 172), 19, currentY + 17.5);

      currentY += 28.5;
    });

    // Simulación didáctica de tarjeta de vacante
    currentY += 1;
    drawCardBox(14, currentY, 182, 33, [15, 23, 42], [30, 41, 59], 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_GOLD);
    doc.text('EJEMPLO VISUAL: TARJETA DE OFERTA EN PANTALLA CON DESGLOSE DE COMPETENCIAS', 19, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('Jefe de Control Interno & Auditoría • Tesorería General de la República (TGR)', 19, currentY + 12);

    // Pill de Match en la tarjeta
    doc.setFillColor(...COLOR_EMERALD);
    doc.roundedRect(165, currentY + 8, 26, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('MATCH 98%', 178, currentY + 12.3, { align: 'center' });

    // Habilidades
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('COMPETENCIAS COINCIDENTES (VERDES):', 19, currentY + 19);

    const sampleSkills = ['Ing. Comercial / Industrial', 'Auditoría Gubernamental', 'Power BI & SQL', 'Normas NICSP'];
    let skillX = 19;
    sampleSkills.forEach((sk) => {
      const sw = doc.getTextWidth(sk) + 6;
      doc.setFillColor(6, 78, 59); // dark emerald
      doc.roundedRect(skillX, currentY + 21, sw, 5, 1, 1, 'F');
      doc.setTextColor(110, 231, 183); // light emerald
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.text(`✓ ${sk}`, skillX + 3, currentY + 24.5);
      skillX += sw + 2.5;
    });

    drawPageFooter(2);

    // =========================================================================
    // PÁGINA 3: PASOS 4, 5 Y 6 (CARTA IA, POSTULACIÓN DIRECTA, TABLERO KANBAN)
    // =========================================================================
    doc.addPage();
    drawPageHeader(3, 'Carta IA, Postulación Directa y Tablero Kanban');

    currentY = 30;

    // PASO 4: CÓMO GENERAR LA CARTA DE PRESENTACIÓN AUTOMÁTICA
    drawStepHeader(currentY, '4', 'Paso 4: Redacción de Carta de Presentación con IA (1 Clic)', [79, 70, 229]);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SLATE_DARK);
    doc.text('Genera una carta formal adaptada al cargo en 1 segundo sin redactar desde cero:', 14, currentY);

    currentY += 4;

    const letterSteps = [
      { n: '1', txt: 'En la tarjeta de la vacante deseada, haz clic en el botón morado "Carta IA" (icono de destellos).' },
      { n: '2', txt: 'El sistema redacta de inmediato una carta protocolar formal chilena dirigida a la jefatura o comisión calificadora.' },
      { n: '3', txt: 'Haz clic en el botón "Copiar Texto" para guardarla automáticamente en tu portapapeles.' },
      { n: '4', txt: 'Pégala en el portal de postulación (o en el cuerpo del correo) usando Ctrl + V (o Mantener presionado > Pegar).' }
    ];

    drawCardBox(14, currentY, 182, 38, [248, 250, 252], [226, 232, 240], 2.5);
    letterSteps.forEach((ls, lIdx) => {
      const ly = currentY + 4 + lIdx * 8;
      doc.setFillColor(...COLOR_INDIGO);
      doc.circle(20, ly + 2, 2.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(ls.n, 20, ly + 3.8, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_SLATE_DARK);
      doc.text(ls.txt, 26, ly + 3.5);
    });

    currentY += 42;

    // PASO 5: CÓMO POSTULAR DIRECTO EN EL PORTAL DIRECTO
    drawStepHeader(currentY, '5', 'Paso 5: Postulación Directa en Convocatorias Vigentes', [37, 99, 235]);
    currentY += 8;

    drawCardBox(14, currentY, 182, 30, [239, 246, 255], [191, 219, 254], 2.5); // blue-50 / blue-200
    doc.setFillColor(37, 99, 235);
    doc.rect(14, currentY, 3, 30, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 64, 175); // blue-800
    doc.text('ENLACE SEGURO SIN COBROS NI INTERMEDIARIOS', 21, currentY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(29, 78, 216);
    const postText = 
      '• Haz clic en el botón azul "Ir a Postulación Directa" presente en la tarjeta de la oferta.\n' +
      '• El sistema abrirá automáticamente una nueva pestaña con la convocatoria en EmpleosPúblicos.cl, ServicioCivil.cl, Laborum o LinkedIn.\n' +
      '• Al hacer clic, el sistema cambia automáticamente el estado de la oferta a "POSTULADO", sumándola a tus métricas de seguimiento.';
    doc.text(doc.splitTextToSize(postText, 170), 21, currentY + 12.5);

    currentY += 35;

    // Separador
    doc.setDrawColor(...COLOR_BORDER_LIGHT);
    doc.setLineWidth(0.3);
    doc.line(14, currentY, 196, currentY);

    currentY += 6;

    // PASO 6: CÓMO USAR EL TABLERO DE SEGUIMIENTO (KANBAN)
    drawStepHeader(currentY, '6', 'Paso 6: Gestión y Seguimiento en Tablero Kanban', COLOR_AMBER);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SLATE_DARK);
    doc.text('Lleva el control exacto del avance de tus postulaciones con la vista tipo pizarra organizada en 4 fases:', 14, currentY);

    currentY += 5;

    const kanbanCols = [
      {
        num: '1',
        title: 'POR POSTULAR',
        desc: 'Vacantes detectadas que te interesan y cuyos antecedentes estás reuniendo.',
        color: [100, 116, 139] as [number, number, number]
      },
      {
        num: '2',
        title: 'POSTULADO',
        desc: 'CV y carta enviados formalmente a la institución o empresa.',
        color: [2, 132, 199] as [number, number, number]
      },
      {
        num: '3',
        title: 'EN ENTREVISTA',
        desc: '¡Contacto confirmado! En etapa de pruebas técnicas o psicolaborales.',
        color: COLOR_AMBER
      },
      {
        num: '4',
        title: 'OFERTA / CONTRATO',
        desc: 'Proceso exitoso. Propuesta de renta, firma de contrato o nombramiento.',
        color: COLOR_EMERALD
      }
    ];

    kanbanCols.forEach((kc, idx) => {
      const colW = 43.5;
      const colX = 14 + idx * (colW + 2.5);
      drawCardBox(colX, currentY, colW, 44, COLOR_BG_LIGHT, COLOR_BORDER_LIGHT, 2);

      // Top color banner
      doc.setFillColor(...kc.color);
      doc.rect(colX, currentY, colW, 3, 'F');

      // Col header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...kc.color);
      doc.text(`FASE ${kc.num}`, colX + 4, currentY + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_SLATE_DARK);
      doc.text(kc.title, colX + 4, currentY + 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text(doc.splitTextToSize(kc.desc, colW - 8), colX + 4, currentY + 20);
    });

    currentY += 49;

    // Tip de uso
    drawCardBox(14, currentY, 182, 17, [248, 250, 252], [226, 232, 240], 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('💡 ¿CÓMO MOVER UNA OFERTA ENTRE COLUMNAS?', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_DARK);
    doc.text('En cada tarjeta de oferta dispones de un menú desplegable de Estado. Cámbialo en 1 clic (ej. de "Postulado" a "En Entrevista") y el tablero se reorganizará de manera instantánea y automática.', 18, currentY + 11);

    drawPageFooter(3);

    // =========================================================================
    // PÁGINA 4: PASOS 7 Y 8, PREGUNTAS FRECUENTES Y CONTROL INSTITUCIONAL
    // =========================================================================
    doc.addPage();
    drawPageHeader(4, 'Personalización, Portales Chilenos y Preguntas Frecuentes');

    currentY = 30;

    // PASO 7: CÓMO PERSONALIZAR TUS HABILIDADES EN "MI PERFIL & CV"
    drawStepHeader(currentY, '7', 'Paso 7: Personalización de Competencias ("Mi Perfil & CV")', [13, 148, 136]); // teal-600
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE_DARK);
    const profileGuide = 
      '1. Dirígete a la pestaña "Mi Perfil & Competencias".\n' +
      '2. En el casillero escribe tu nueva habilidad (ej. "Excel Avanzado", "Auditoría Forense", "Gestión de Contratos", "Inglés B2").\n' +
      '3. Pulsa el botón verde "Agregar Habilidad". El sistema recalculará al instante el Match % en todas las ofertas del catálogo.';
    drawCardBox(14, currentY, 182, 23, [240, 253, 250], [153, 246, 228], 2); // teal-50
    doc.text(profileGuide, 18, currentY + 6);

    currentY += 27;

    // PASO 8: PORTALES CHILENOS DIRECTOS
    drawStepHeader(currentY, '8', 'Paso 8: Accesos Directos a Portales Laborales de Chile', COLOR_NAVY);
    currentY += 8;

    const portals = [
      { name: '🇨🇱 Empleos Públicos', url: 'empleospublicos.cl', desc: 'Ministerios, Hospitales, Servicios y Municipios.' },
      { name: '🏛️ Servicio Civil / ADP', url: 'serviciocivil.cl', desc: 'Concursos de Alta Dirección Pública y Directores.' },
      { name: '🏢 Bolsa Nacional (BNE)', url: 'bne.cl', desc: 'Plataforma del Min. del Trabajo y SENCE.' },
      { name: '💼 Laborum & LinkedIn', url: 'laborum.cl', desc: 'Vacantes del sector corporativo y privado en Chile.' }
    ];

    portals.forEach((p, idx) => {
      const pW = 43.5;
      const pX = 14 + idx * (pW + 2.5);
      drawCardBox(pX, currentY, pW, 23, COLOR_BG_LIGHT, COLOR_BORDER_LIGHT, 2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...COLOR_NAVY);
      doc.text(p.name, pX + 3, currentY + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...COLOR_EMERALD);
      doc.text(p.url, pX + 3, currentY + 9.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text(doc.splitTextToSize(p.desc, pW - 6), pX + 3, currentY + 14);
    });

    currentY += 28;

    // Separador
    doc.setDrawColor(...COLOR_BORDER_LIGHT);
    doc.setLineWidth(0.3);
    doc.line(14, currentY, 196, currentY);

    currentY += 6;

    // PREGUNTAS FRECUENTES (FAQ)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('PREGUNTAS FRECUENTES (RESPUESTAS RÁPIDAS)', 14, currentY);

    currentY += 5;

    const faqs = [
      {
        q: '¿Por qué no veo los módulos contables o inmobiliarios del sistema?',
        a: 'Si tu usuario fue asignado al rol "SOLO EMPLEO", el CISO y la gerencia configuraron tu entorno para brindarte máxima comodidad y aislamiento, mostrándote exclusivamente las herramientas laborales sin distracciones.'
      },
      {
        q: '¿Qué hago si encuentro una oferta en otro portal o en la prensa?',
        a: 'Usa el botón "+" ("Agregar Vacante Manual") en la barra superior. Podrás registrar el cargo, la institución, renta y enlace web para mantener todas tus postulaciones unificadas en un solo lugar.'
      },
      {
        q: '¿El sistema envía el currículum automáticamente sin mi intervención?',
        a: 'No. Por normativas legales de privacidad chilenas y requerimientos de ClaveÚnica, el sistema redacta tus documentos y te posiciona en la ventanilla directa para que tú apruebes el envío final.'
      }
    ];

    faqs.forEach((faq) => {
      drawCardBox(14, currentY, 182, 22, COLOR_BG_LIGHT, COLOR_BORDER_LIGHT, 2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text(`Q: ${faq.q}`, 18, currentY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLOR_SLATE_DARK);
      doc.text(doc.splitTextToSize(`R: ${faq.a}`, 172), 18, currentY + 11);

      currentY += 24.5;
    });

    currentY += 2;

    // RECUADRO DE VALIDACIÓN CORPORATIVA & FIRMA
    drawCardBox(14, currentY, 182, 27, [241, 245, 249], [203, 213, 225], 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('VALIDACIÓN INSTITUCIONAL & CONTROL INTERNO CORPORATIVO', 18, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text('Manual auditado bajo estándares de Seguridad ISO 27001 y Gobierno Corporativo ERP / ASSETFLOW.', 18, currentY + 11.5);
    doc.text('Soporte TI y Mesa de Ayuda: helpdesk@inmobiliariapro.cl • Canal CISO: ciso@inmobiliariapro.cl', 18, currentY + 16.5);

    // Firmas
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(145, currentY + 19, 190, currentY + 19);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('DEPARTAMENTO TI & PERSONAS', 167.5, currentY + 22.5, { align: 'center' });

    drawPageFooter(4);

    // =========================================================================
    // DESCARGA DIRECTA E INMUNE A BLOQUEOS DE NAVEGADOR
    // =========================================================================
    try {
      doc.save(filename);
    } catch (saveErr) {
      console.warn('doc.save threw, using file-saver blob fallback:', saveErr);
      const pdfBlob = doc.output('blob');
      saveAs(pdfBlob, filename);
    }
  } catch (fatalErr) {
    console.error('Error fatal al exportar el manual de empleo a PDF:', fatalErr);
    throw fatalErr;
  }
};
