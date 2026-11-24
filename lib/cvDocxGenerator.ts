import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle
} from 'docx';
import { storage } from './storageEngine';

/**
 * Genera el documento oficial Microsoft Word (.docx) formato ejecutivo de 1 página
 * para Cristian Andrés Muñoz Rojas, enfocado en lectura rápida de reclutadores expertos
 * y cumplimiento de filtros ATS.
 */
export async function buildCristianCvDocx(): Promise<Document> {
  const primaryColor = '0F172A'; // Slate-900 (Negro / Azul Noche)
  const secondaryColor = '334155'; // Slate-700
  const dividerColor = '94A3B8'; // Slate-400
  const bodyColor = '1E293B'; // Slate-800

  const createSectionHeader = (title: string): Paragraph => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 130, after: 40 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 8,
          color: dividerColor,
          space: 2
        }
      },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 19, // 9.5pt
          color: primaryColor,
          font: 'Calibri'
        })
      ]
    });
  };

  const createBullet = (text: string, boldPrefix?: string): Paragraph => {
    const children: TextRun[] = [];
    if (boldPrefix) {
      children.push(
        new TextRun({
          text: boldPrefix + ' ',
          bold: true,
          size: 17, // 8.5pt
          color: primaryColor,
          font: 'Calibri'
        })
      );
    }
    children.push(
      new TextRun({
        text: text,
        size: 17, // 8.5pt
        color: bodyColor,
        font: 'Calibri'
      })
    );

    return new Paragraph({
      bullet: { level: 0 },
      spacing: { before: 20, after: 20 },
      alignment: AlignmentType.JUSTIFIED,
      children
    });
  };

  const doc = new Document({
    creator: 'AssetFlow Enterprise — Sistema de Gestión Patrimonial',
    title: 'Curriculum Vitae - Cristian Andrés Muñoz Rojas',
    description: 'Currículum Vitae Ejecutivo de 1 Página optimizado para lectura ATS y evaluación de reclutadores expertos.',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 480, // ~0.33 in
              bottom: 480,
              left: 540, // ~0.38 in
              right: 540
            }
          }
        },
        children: [
          // -------------------------------------------------------------------
          // HEADER: NOMBRE COMPLETO
          // -------------------------------------------------------------------
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 30 },
            children: [
              new TextRun({
                text: 'CRISTIAN ANDRÉS MUÑOZ ROJAS',
                bold: true,
                size: 30, // 15pt
                color: primaryColor,
                font: 'Calibri'
              })
            ]
          }),

          // SUBTÍTULO PROFESIONAL
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 40 },
            children: [
              new TextRun({
                text: 'Ingeniero Civil Industrial · Control de Gestión, Auditoría de Procesos y Operaciones',
                bold: true,
                size: 19, // 9.5pt
                color: secondaryColor,
                font: 'Calibri'
              })
            ]
          }),

          // DATOS DE CONTACTO
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 70 },
            border: {
              bottom: {
                style: BorderStyle.SINGLE,
                size: 10,
                color: primaryColor,
                space: 3
              }
            },
            children: [
              new TextRun({ text: 'Santiago, Chile', bold: true, size: 17, color: primaryColor, font: 'Calibri' }),
              new TextRun({ text: '   •   ', size: 17, color: dividerColor, font: 'Calibri' }),
              new TextRun({ text: '+56 9 6143 6853', bold: true, size: 17, color: primaryColor, font: 'Calibri' }),
              new TextRun({ text: '   •   ', size: 17, color: dividerColor, font: 'Calibri' }),
              new TextRun({ text: 'cristian.munoz0223@gmail.com', bold: true, size: 17, color: primaryColor, font: 'Calibri' }),
              new TextRun({ text: '   •   ', size: 17, color: dividerColor, font: 'Calibri' }),
              new TextRun({ text: 'Disponibilidad Inmediata', bold: true, size: 17, color: primaryColor, font: 'Calibri' }),
              new TextRun({ text: '   •   ', size: 17, color: dividerColor, font: 'Calibri' }),
              new TextRun({ text: 'linkedin.com/in/cristian-muñoz-3a747258', size: 17, color: secondaryColor, font: 'Calibri' })
            ]
          }),

          // -------------------------------------------------------------------
          // 1. PERFIL PROFESIONAL
          // -------------------------------------------------------------------
          createSectionHeader('Perfil Profesional'),
          new Paragraph({
            spacing: { before: 30, after: 50 },
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: 'Ingeniero Civil Industrial con más de 12 años de experiencia liderando áreas de Control de Gestión, Auditoría Interna, Operaciones y Abastecimiento en sectores corporativos, manufactura multinacional y gestión patrimonial. Especialista en control presupuestario (OPEX/CAPEX), diseño de matrices de riesgo operacional y optimización de procesos mediante analítica avanzada (Power BI, SQL) y automatización. Formación complementaria en Ciencias Jurídicas (ENAC), aportando criterio técnico en cumplimiento normativo, contratos y debida diligencia. Historial comprobado en optimización de capital de trabajo por más de $2.000M CLP, administración de carteras inmobiliarias sin observaciones CMF y conducción directa de dotaciones operativas de hasta 20 personas.',
                size: 17, // 8.5pt
                color: bodyColor,
                font: 'Calibri'
              })
            ]
          }),

          // -------------------------------------------------------------------
          // 2. ÁREAS DE ESPECIALIZACIÓN
          // -------------------------------------------------------------------
          createSectionHeader('Áreas de Especialización'),
          createBullet(
            'Auditoría de procesos, matrices de riesgo operacional, segregación de funciones (SoD), debida diligencia UAF/PEP (Ley N° 19.913) y cumplimiento normativo CMF / CAIGG.',
            '• Control de Gestión & Riesgos:'
          ),
          createBullet(
            'Control y fiscalización de presupuestos OPEX/CAPEX, evaluación económica de proyectos, optimización de capital inmovilizado y conciliación contable periódica.',
            '• Gestión Financiera & Presupuestos:'
          ),
          createBullet(
            'Planificación de demanda y suministro (S&OP), acuerdos marco con proveedores estratégicos, gestión de inventarios rotativos (IRA) y continuidad operacional (SLAs).',
            '• Operaciones & Abastecimiento:'
          ),
          createBullet(
            'Modelado en Power BI (DAX avanzado), consultas SQL relacionales, sistemas ERP (SAP MM/WM/FI, Oracle ERP) y desarrollo de plataformas de control con IA.',
            '• Analítica & Transformación Digital:'
          ),

          // -------------------------------------------------------------------
          // 3. EXPERIENCIA PROFESIONAL
          // -------------------------------------------------------------------
          createSectionHeader('Experiencia Profesional'),

          // CARGO 1: CORPORACIÓN INMOBILIARIA
          new Paragraph({
            spacing: { before: 50, after: 15 },
            children: [
              new TextRun({
                text: 'Jefatura de Control Interno y Gestión de Activos',
                bold: true,
                size: 18,
                color: primaryColor,
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            spacing: { before: 0, after: 30 },
            children: [
              new TextRun({
                text: 'Corporación Inmobiliaria & Gestión Patrimonial',
                bold: true,
                size: 16,
                color: secondaryColor,
                font: 'Calibri'
              }),
              new TextRun({
                text: '   |   2023 – 2026   |   Santiago, Chile',
                size: 16,
                color: dividerColor,
                font: 'Calibri'
              })
            ]
          }),
          createBullet(
            'Dirección técnica y control de gestión sobre portafolio de 1.849 activos inmobiliarios corporativos (UF 30.300 / $1.146M CLP), coordinando a peritos tasadores, arquitectos y analistas bajo estándares técnicos uniformes.',
            '• Gestión Patrimonial y Tasaciones:'
          ),
          createBullet(
            'Mantenimiento sostenido de cero observaciones en auditorías externas y ante la Comisión para el Mercado Financiero (CMF), mediante matrices de riesgo operacional y segregación de perfiles (SoD).',
            '• Cumplimiento Regulatorio y CMF:'
          ),
          createBullet(
            'Supervisión del presupuesto operacional (OPEX) y de conservación (CAPEX), asegurando la rendición periódica y la consistencia contable del 100% de los gastos comunes, seguros y fondos de reserva.',
            '• Control Presupuestario:'
          ),
          createBullet(
            'Diseño y puesta en marcha de la plataforma corporativa AssetFlow con motor OCR y reglas contables, digitalizando contratos y reportes CMF (Ficha B.4 y Nota 14), reduciendo tiempos de cierre de 15 días a menos de 1 hora.',
            '• Automatización y Procesos:'
          ),

          // CARGO 2: ESSITY CHILE
          new Paragraph({
            spacing: { before: 60, after: 15 },
            children: [
              new TextRun({
                text: 'Jefatura de Operaciones, Abastecimiento & Logística Estratégica',
                bold: true,
                size: 18,
                color: primaryColor,
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            spacing: { before: 0, after: 30 },
            children: [
              new TextRun({
                text: 'Essity Chile (Multinacional Sueca de Manufactura & Consumo)',
                bold: true,
                size: 16,
                color: secondaryColor,
                font: 'Calibri'
              }),
              new TextRun({
                text: '   |   2018 – 2023   |   Lampa, Santiago',
                size: 16,
                color: dividerColor,
                font: 'Calibri'
              })
            ]
          }),
          createBullet(
            'Conducción directa de 8 colaboradores técnicos en operaciones y almacén central; gestión de turnos, estándares de seguridad laboral y cumplimiento de un 98% en nivel de servicio (SLA) para plantas productivas.',
            '• Liderazgo de Dotación y SLAs:'
          ),
          createBullet(
            'Liderazgo de la planificación S&OP en repuestos y suministros críticos (cartera de UF 158.000 / $6.000M CLP), liberando más de UF 53.000 (~$2.000M CLP) en capital inmovilizado mediante acuerdos marco.',
            '• Optimización de Capital de Trabajo:'
          ),
          createBullet(
            'Mantenimiento de $0 diferencias de inventario durante 10 meses consecutivos en activos críticos, instaurando rutinas diarias de inventarios rotativos aleatorios (IRA) en SAP MM/WM con 99.5% de exactitud.',
            '• Custodia de Activos y Cero Diferencias:'
          ),
          createBullet(
            'Negociación de acuerdos marco con proveedores estratégicos con 15% de reducción en tiempos de entrega, e implementación de tableros directivos en Power BI enlazados a SAP para el control de stocks.',
            '• Proveedores y Cuadros de Mando:'
          ),

          // CARGO 3: RENDIC HERMANOS S.A.
          new Paragraph({
            spacing: { before: 60, after: 15 },
            children: [
              new TextRun({
                text: 'Supervisor de Operaciones de Caja & Tesorería (2014–2018) | Cajero (2008–2013)',
                bold: true,
                size: 18,
                color: primaryColor,
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            spacing: { before: 0, after: 30 },
            children: [
              new TextRun({
                text: 'Rendic Hermanos S.A. (Unimarc / Red SMU)',
                bold: true,
                size: 16,
                color: secondaryColor,
                font: 'Calibri'
              }),
              new TextRun({
                text: '   |   2008 – 2018   |   Santiago, Chile',
                size: 16,
                color: dividerColor,
                font: 'Calibri'
              })
            ]
          }),
          createBullet(
            'Supervisión y asignación de turnos a dotación de 15 a 20 cajeros por jornada; administración del fondo de tesorería del local y despacho de remesas blindadas (Brink\'s / Prosegur) con cuadratura exacta al 100%.',
            '• Conducción Operativa y Tesorería:'
          ),
          createBullet(
            'Mantenimiento del estándar de cero observaciones en auditorías internas sorpresivas de tesorería y custodia de caudales durante más de 12 meses continuos.',
            '• Auditoría Interna sin Observaciones:'
          ),
          createBullet(
            'Promovido por mérito en 2014 a Supervisor de Cajas y Tesorero tras 5 años de desempeño intachable como Cajero (2008–2013), sustentado en precisión operativa, responsabilidad y probidad.',
            '• Promoción por Desempeño:'
          ),

          // -------------------------------------------------------------------
          // 4. FORMACIÓN ACADÉMICA
          // -------------------------------------------------------------------
          createSectionHeader('Formación Académica'),
          createBullet(
            'Licenciado en Ciencias de la Ingeniería. Enfoque en Optimización de Procesos, Control de Gestión y Finanzas Corporativas.',
            '• Ingeniería Civil Industrial —'
          ),
          createBullet(
            'Técnico Jurídico en ENAC Cáritas Chile (2005 – 2008). Especialización aplicada en derecho administrativo, contratos mercantiles, procedimientos legales y debida diligencia corporativa.',
            '• Formación en Ciencias Jurídicas:'
          ),
          createBullet(
            'Planificación S&OP • Auditoría y Control Interno (CAIGG/CGR) • Prevención UAF / PEP (Ley N° 19.913) • Business Intelligence (Power BI/DAX).',
            '• Especializaciones Clave:'
          ),

          // -------------------------------------------------------------------
          // 5. IDIOMAS & SISTEMAS
          // -------------------------------------------------------------------
          createSectionHeader('Idiomas & Sistemas'),
          new Paragraph({
            spacing: { before: 20, after: 30 },
            children: [
              new TextRun({ text: 'ERP & Software: ', bold: true, size: 17, color: primaryColor, font: 'Calibri' }),
              new TextRun({ text: 'SAP (MM/WM/FI), Oracle ERP, AssetFlow, Power BI (DAX), SQL   |   ', size: 17, color: bodyColor, font: 'Calibri' }),
              new TextRun({ text: 'Idiomas: ', bold: true, size: 17, color: primaryColor, font: 'Calibri' }),
              new TextRun({ text: 'Español (Nativo) • Inglés Técnico (Documentación, contratos y especificaciones de sistemas)', size: 17, color: bodyColor, font: 'Calibri' })
            ]
          })
        ]
      }
    ]
  });

  return doc;
}

/**
 * Descarga el archivo DOCX oficial generado en el navegador del usuario.
 */
export async function downloadCristianCvDocx(fileName: string = 'CURRICULUM_EJECUTIVO_CRISTIAN_MUNOZ_ROJAS.docx'): Promise<{ success: boolean; error?: string }> {
  try {
    const doc = await buildCristianCvDocx();
    const blob = await Packer.toBlob(doc);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    return { success: true };
  } catch (err: any) {
    console.error('Error al generar y descargar archivo Word .docx:', err);
    return { success: false, error: err?.message || 'Error al generar documento Word' };
  }
}

/**
 * Registra y aloja el archivo DOCX en la Bóveda de Documentos Digital del sistema.
 */
export async function registerCvDocxInVault(
  user: string = 'CRISTIAN MUÑOZ R.'
): Promise<{ success: boolean; message: string; docId?: string }> {
  try {
    const doc = await buildCristianCvDocx();
    const base64Str = await Packer.toBase64String(doc);
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64Str}`;

    const newDocId = `DOC-CV-WORD-${Date.now()}`;
    const dateToday = new Date().toISOString().split('T')[0];

    const officialDoc = {
      id: newDocId,
      type: 'OTRO' as const,
      docNumber: 'CV-DOCX-2026-001',
      date: dateToday,
      arrivalDate: dateToday,
      systemLoadDate: dateToday,
      subject: 'CURRÍCULUM VITAE EJECUTIVO — CRISTIAN ANDRÉS MUÑOZ ROJAS (MICROSOFT WORD .DOCX)',
      synthesis: 'Currículum Vitae oficial en formato Microsoft Word nativo (.docx) de 1 página. Destaca Control de Gestión, Auditoría Interna Cero Observaciones, Liderazgo de Dotaciones, Optimización Presupuestaria de Capital de Trabajo y Transformación Digital.',
      status: 'RECEPCIONADO' as const,
      statusUpdatedAt: Date.now(),
      sender: 'CRISTIAN ANDRÉS MUÑOZ ROJAS',
      recipient: 'COMISIONES EVALUADORAS & RECLUTADORES',
      attachments: [],
      userCreator: user,
      timestamp: Date.now(),
      documentUrl: dataUrl,
      documentName: 'CURRICULUM_EJECUTIVO_CRISTIAN_MUNOZ_ROJAS.docx',
      signedBy: user,
      signedAt: new Date().toISOString()
    };

    const vaultStorage: any = storage;
    if (typeof vaultStorage.addOfficialDoc === 'function') {
      await vaultStorage.addOfficialDoc(officialDoc);
    } else if (typeof vaultStorage.save === 'function') {
      await vaultStorage.save('officialDocs', officialDoc);
    } else if (typeof vaultStorage.put === 'function') {
      await vaultStorage.put('officialDocs', officialDoc);
    } else {
      const existing = JSON.parse(localStorage.getItem('assetflow_vault_docs') || '[]');
      existing.unshift(officialDoc);
      localStorage.setItem('assetflow_vault_docs', JSON.stringify(existing));
    }

    return {
      success: true,
      message: 'El Currículum Vitae (.DOCX) ha sido alojado y respaldado con éxito en su Bóveda de Documentos.',
      docId: newDocId
    };
  } catch (err: any) {
    console.error('Error al registrar CV .docx en Bóveda:', err);
    return {
      success: false,
      message: `No se pudo registrar el archivo en la Bóveda: ${err?.message || 'Error desconocido'}`
    };
  }
}
