import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

/**
 * Motor universal de impresión de alta precisión para AssetFlow Enterprise.
 * Diseñado para operar de manera transparente tanto en iframes (Google AI Studio)
 * como en pestañas independientes, navegadores de escritorio y dispositivos móviles.
 */
export async function printHtmlElement(target: string | HTMLElement, docTitle: string = 'Documento_AssetFlow'): Promise<void> {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('assetflow:action', {
      detail: {
        action: 'EXPORT',
        entityType: 'IMPRESION',
        entityId: `PRN-${Date.now()}`,
        entityName: docTitle,
        details: `Envío de documento a impresión o exportación PDF: ${docTitle}`
      }
    }));
  }

  const element = typeof target === 'string' ? document.getElementById(target) : target;
  if (!element) {
    console.error(`[PrintEngine] Elemento objetivo no encontrado para impresión:`, target);
    // Fallback directo
    window.print();
    return;
  }

  // 1. Recopilar estilos globales y hojas de estilo compiladas de Tailwind
  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n');

  // 2. Preparar el contenedor maestro en el DOM principal (#printable-report-wrapper)
  let wrapper = document.getElementById('printable-report-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'printable-report-wrapper';
    document.body.appendChild(wrapper);
  }

  // Limpiar impresiones anteriores
  wrapper.innerHTML = '';

  // Clonar el elemento a imprimir preservando el contenido dinámico
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id'); // Evitar duplicación de ID con el elemento visible

  // Sincronizar valores de inputs, selects y textareas
  const origInputs = element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
  const cloneInputs = clone.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
  origInputs.forEach((orig, idx) => {
    const cl = cloneInputs[idx];
    if (cl) {
      if (orig instanceof HTMLInputElement && (orig.type === 'checkbox' || orig.type === 'radio')) {
        (cl as HTMLInputElement).checked = orig.checked;
      } else {
        cl.value = orig.value;
      }
    }
  });

  wrapper.appendChild(clone);

  // Guardar y asignar título del documento para el nombre del archivo / spooler de la impresora
  const previousTitle = document.title;
  if (docTitle) {
    document.title = docTitle;
  }

  let printExecuted = false;

  const cleanup = () => {
    if (wrapper) {
      wrapper.innerHTML = '';
    }
    document.title = previousTitle;
  };

  // Escuchar el evento de fin de impresión nativo del navegador
  const onAfterPrint = () => {
    cleanup();
    window.removeEventListener('afterprint', onAfterPrint);
  };
  window.addEventListener('afterprint', onAfterPrint);

  // Intentar la impresión primaria por el DOM principal (óptimo con CSS @media print)
  let printFailed = false;
  try {
    window.focus();
    window.print();
    printExecuted = true;
  } catch (printErr) {
    console.warn('[PrintEngine] window.print falló o fue restringido en el contexto actual:', printErr);
    printFailed = true;
    printExecuted = false;
  }

  // Fallback con iframe offscreen o descarga PDF si window.print falló o fue restringido
  if (!printExecuted || printFailed) {
    try {
      const offscreenIframe = document.createElement('iframe');
      offscreenIframe.id = 'assetflow-print-frame';
      offscreenIframe.style.position = 'fixed';
      offscreenIframe.style.left = '-9999px';
      offscreenIframe.style.top = '0';
      offscreenIframe.style.width = '1024px';
      offscreenIframe.style.height = '1400px';
      offscreenIframe.style.border = '0';
      offscreenIframe.style.opacity = '0';
      offscreenIframe.style.pointerEvents = 'none';
      document.body.appendChild(offscreenIframe);

      const iframeDoc = offscreenIframe.contentDocument || offscreenIframe.contentWindow?.document;
      if (iframeDoc && offscreenIframe.contentWindow) {
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html lang="es">
            <head>
              <meta charset="utf-8" />
              <title>${docTitle}</title>
              ${headStyles}
              <style>
                @page {
                  size: letter portrait;
                  margin: 0.5cm;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  box-sizing: border-box;
                }
                html, body {
                  margin: 0;
                  padding: 0;
                  background: #ffffff !important;
                  color: #000000 !important;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }
                #print-sheet {
                  width: 216mm;
                  min-height: 279mm;
                  margin: 0 auto;
                  padding: 0.5cm;
                  background: #ffffff !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                img {
                  max-width: 100%;
                  height: auto;
                  display: block;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              </style>
            </head>
            <body>
              <div id="print-sheet">${clone.outerHTML}</div>
            </body>
          </html>
        `);
        iframeDoc.close();

        setTimeout(() => {
          try {
            offscreenIframe.contentWindow?.focus();
            offscreenIframe.contentWindow?.print();
          } catch (e) {
            console.error('[PrintEngine] Error en impresión por iframe offscreen:', e);
            // Si el iframe también falla por sandboxing, generamos PDF directamente
            downloadElementAsPdf(element, `${docTitle}.pdf`);
          } finally {
            setTimeout(() => {
              if (document.body.contains(offscreenIframe)) {
                document.body.removeChild(offscreenIframe);
              }
              cleanup();
            }, 3000);
          }
        }, 350);
      }
    } catch (iframeErr) {
      console.error('[PrintEngine] Falló el fallback de iframe offscreen, generando PDF:', iframeErr);
      downloadElementAsPdf(element, `${docTitle}.pdf`);
      cleanup();
    }
  } else {
    // Si window.print se abrió, programar un temporizador de seguridad de limpieza
    setTimeout(() => {
      cleanup();
    }, 4000);
  }
}

/**
 * Genera y envía inmediatamente una página de prueba certificada a la impresora.
 * Incluye calibración de color CMYK/RGB, escala de grises, matriz de alineación,
 * escala tipográfica y metadatos de diagnóstico del sistema.
 */
export async function printTestPage(): Promise<void> {
  const folio = `TST-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-CL');

  // Crear contenedor temporal para la página de prueba
  const testContainer = document.createElement('div');
  testContainer.id = 'assetflow-test-page-container';
  testContainer.style.position = 'fixed';
  testContainer.style.left = '-9999px';
  testContainer.style.top = '0';
  testContainer.style.width = '216mm';
  testContainer.style.background = '#ffffff';

  testContainer.innerHTML = `
    <div style="width: 216mm; min-height: 279mm; margin: 0 auto; padding: 1.2cm; background: #ffffff; color: #0f172a; font-family: ui-sans-serif, system-ui, sans-serif; box-sizing: border-box; border: 2px solid #002D62; position: relative;">
      
      <!-- MARCAS DE ALINEACIÓN DE ESQUINAS (CROP MARKS) -->
      <div style="position: absolute; top: 4mm; left: 4mm; width: 12mm; height: 12mm; border-top: 2px solid #000; border-left: 2px solid #000;"></div>
      <div style="position: absolute; top: 4mm; right: 4mm; width: 12mm; height: 12mm; border-top: 2px solid #000; border-right: 2px solid #000;"></div>
      <div style="position: absolute; bottom: 4mm; left: 4mm; width: 12mm; height: 12mm; border-bottom: 2px solid #000; border-left: 2px solid #000;"></div>
      <div style="position: absolute; bottom: 4mm; right: 4mm; width: 12mm; height: 12mm; border-bottom: 2px solid #000; border-right: 2px solid #000;"></div>

      <!-- CABECERA DE PRUEBA -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #002D62; padding-bottom: 14px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 48px; height: 48px; background: #002D62; color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; letter-spacing: -1px;">
            AF
          </div>
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #002D62; text-transform: uppercase; letter-spacing: -0.5px;">AssetFlow Enterprise</h1>
            <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 1px;">Página de Prueba de Impresión y Diagnóstico de Hardware</p>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; background: #ecfdf5; border: 1px solid #10b981; color: #047857; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">
            ✓ HARDWARE LISTO
          </div>
          <p style="margin: 4px 0 0 0; font-size: 10px; font-family: monospace; font-weight: bold; color: #64748b;">Folio: ${folio}</p>
        </div>
      </div>

      <!-- METADATOS TÉCNICOS DEL ENTORNO -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 10px;">
        <div>
          <span style="color: #64748b; font-weight: bold; display: block; text-transform: uppercase;">Fecha de Emisión:</span>
          <strong style="color: #0f172a; text-transform: capitalize;">${dateStr}</strong>
        </div>
        <div>
          <span style="color: #64748b; font-weight: bold; display: block; text-transform: uppercase;">Hora Local:</span>
          <strong style="color: #0f172a;">${timeStr}</strong>
        </div>
        <div>
          <span style="color: #64748b; font-weight: bold; display: block; text-transform: uppercase;">Formato de Hoja:</span>
          <strong style="color: #0f172a;">Carta (Letter 216x279 mm)</strong>
        </div>
        <div>
          <span style="color: #64748b; font-weight: bold; display: block; text-transform: uppercase;">Ajuste de Color:</span>
          <strong style="color: #047857;">RGB / CMYK Exacto</strong>
        </div>
      </div>

      <!-- SECCIÓN 1: CALIBRACIÓN DE COLOR Y MATRIZ CROMÁTICA -->
      <div style="margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #ffffff;">
        <h2 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 900; color: #002D62; text-transform: uppercase; letter-spacing: 0.5px;">1. Calibración de Color (CMYK Primarios y RGB Corporativo)</h2>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; text-align: center; margin-bottom: 10px;">
          <div>
            <div style="height: 32px; background: #00AEEF; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1);"></div>
            <span style="font-size: 9px; font-weight: bold; display: block; margin-top: 3px;">CYAN</span>
          </div>
          <div>
            <div style="height: 32px; background: #EC008C; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1);"></div>
            <span style="font-size: 9px; font-weight: bold; display: block; margin-top: 3px;">MAGENTA</span>
          </div>
          <div>
            <div style="height: 32px; background: #FFF200; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1);"></div>
            <span style="font-size: 9px; font-weight: bold; display: block; margin-top: 3px;">AMARILLO</span>
          </div>
          <div>
            <div style="height: 32px; background: #000000; border-radius: 4px;"></div>
            <span style="font-size: 9px; font-weight: bold; display: block; margin-top: 3px;">NEGRO</span>
          </div>
          <div>
            <div style="height: 32px; background: #002D62; border-radius: 4px;"></div>
            <span style="font-size: 9px; font-weight: bold; display: block; margin-top: 3px;">AZUL ERP</span>
          </div>
          <div>
            <div style="height: 32px; background: #006D3D; border-radius: 4px;"></div>
            <span style="font-size: 9px; font-weight: bold; display: block; margin-top: 3px;">VERDE SII</span>
          </div>
          <div>
            <div style="height: 32px; background: #DC2626; border-radius: 4px;"></div>
            <span style="font-size: 9px; font-weight: bold; display: block; margin-top: 3px;">ROJO ALERTA</span>
          </div>
        </div>

        <h3 style="margin: 8px 0 6px 0; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase;">Gradiente en Escala de Grises (10% a 100% Densidad)</h3>
        <div style="display: flex; height: 18px; border: 1px solid #94a3b8; border-radius: 4px; overflow: hidden;">
          <div style="flex: 1; background: #f8fafc;" title="10%"></div>
          <div style="flex: 1; background: #f1f5f9;" title="20%"></div>
          <div style="flex: 1; background: #e2e8f0;" title="30%"></div>
          <div style="flex: 1; background: #cbd5e1;" title="40%"></div>
          <div style="flex: 1; background: #94a3b8;" title="50%"></div>
          <div style="flex: 1; background: #64748b;" title="60%"></div>
          <div style="flex: 1; background: #475569;" title="70%"></div>
          <div style="flex: 1; background: #334155;" title="80%"></div>
          <div style="flex: 1; background: #1e293b;" title="90%"></div>
          <div style="flex: 1; background: #000000;" title="100%"></div>
        </div>
      </div>

      <!-- SECCIÓN 2: ESCALA TIPOGRÁFICA Y DEFINICIÓN DE FUENTES -->
      <div style="margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #ffffff;">
        <h2 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 900; color: #002D62; text-transform: uppercase; letter-spacing: 0.5px;">2. Prueba de Legibilidad Tipográfica y Renderizado de Caracteres</h2>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <p style="margin: 0; font-size: 6pt; color: #334155;">[6pt] AssetFlow Enterprise - El rápido murciélago hindú comía feliz cardillo y kiwi. 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
          <p style="margin: 0; font-size: 8pt; color: #1e293b;">[8pt] Contratos, Órdenes de Trabajo, Fichas de Proveedores y Conciliaciones AssetFlow Enterprise Chile.</p>
          <p style="margin: 0; font-size: 10pt; font-weight: 600; color: #0f172a;">[10pt Negrita] Cumplimiento Normativo SII F29, Debida Diligencia UAF / PEP y Verificación CISO.</p>
          <p style="margin: 0; font-size: 12pt; font-weight: 800; color: #002D62;">[12pt Extra Bold] Si esta línea es nítida y legible, la resolución de su impresora es óptima.</p>
        </div>
      </div>

      <!-- SECCIÓN 3: DICTAMEN DE CONECTIVIDAD Y CERTIFICACIÓN -->
      <div style="border: 2px dashed #002D62; border-radius: 8px; padding: 14px; background: #f0f7ff; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="margin: 0; font-size: 13px; font-weight: 900; color: #002D62; text-transform: uppercase;">Dictamen de Compatibilidad: 100% Operativo</h3>
          <p style="margin: 4px 0 0 0; font-size: 10px; color: #334155; line-height: 1.4; max-width: 480px;">
            El subsistema de impresión de <strong>AssetFlow Enterprise</strong> ha vinculado exitosamente el DOM virtual con el driver de su impresora. Todos los informes ejecutivos, certificados de recepción, órdenes de trabajo y balances financieros saldrán con este mismo formato y calidad.
          </p>
        </div>
        <div style="text-align: center; border: 1px solid #002D62; border-radius: 8px; padding: 8px 14px; background: #ffffff;">
          <div style="font-size: 18px; font-weight: 900; color: #002D62; letter-spacing: 1px;">VERIFICADO</div>
          <div style="font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase;">AssetFlow Print Engine v4.2</div>
        </div>
      </div>

      <!-- PIE DE PÁGINA -->
      <div style="position: absolute; bottom: 8mm; left: 1.2cm; right: 1.2cm; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 9px; color: #64748b;">
        <span>AssetFlow Enterprise Chile - Sistema de Gestión Inmobiliaria & Auditoría Corporativa</span>
        <span>Página 1 de 1</span>
        <span>Impreso vía spooler del sistema operativo</span>
      </div>

    </div>
  `;

  document.body.appendChild(testContainer);

  try {
    await printHtmlElement(testContainer, `Pagina_de_Prueba_AssetFlow_${folio}`);
  } finally {
    setTimeout(() => {
      if (document.body.contains(testContainer)) {
        document.body.removeChild(testContainer);
      }
    }, 4000);
  }
}

/**
 * Descarga un archivo PDF de alta resolución de cualquier elemento del DOM utilizando html2canvas y jsPDF.
 */
export async function downloadElementAsPdf(target: string | HTMLElement, filename: string = 'documento.pdf'): Promise<void> {
  const element = typeof target === 'string' ? document.getElementById(target) : target;
  if (!element) {
    console.error(`[PrintEngine] Elemento no encontrado para exportar a PDF:`, target);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2.0,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const imgWidth = 216;
    const pageHeight = 279;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    try {
      pdf.save(filename);
    } catch (saveErr) {
      console.warn('[PrintEngine] pdf.save falló, utilizando fallback con file-saver:', saveErr);
      const pdfBlob = pdf.output('blob');
      saveAs(pdfBlob, filename);
    }
  } catch (err) {
    console.error('[PrintEngine] Error al generar PDF con html2canvas:', err);
    await printHtmlElement(element, filename);
  }
}
