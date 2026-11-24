export type SignatureThemeId = 'navy_gold' | 'emerald_slate' | 'minimal_executive';

export interface GmailSignatureConfig {
  fullName: string;
  title: string;
  phoneDisplay: string;
  phoneRaw: string;
  email: string;
  includeEmail: boolean;
  includeWhatsAppLink: boolean;
  includeConfidentiality: boolean;
  theme: SignatureThemeId;
}

export const DEFAULT_CRISTIAN_SIGNATURE_CONFIG: GmailSignatureConfig = {
  fullName: 'Cristian Muñoz Rojas',
  title: 'Ingeniero Civil Industrial',
  phoneDisplay: '+56 9 6143 6853',
  phoneRaw: '56961436853',
  email: 'samaheim@gmail.com',
  includeEmail: false,
  includeWhatsAppLink: true,
  includeConfidentiality: false,
  theme: 'navy_gold',
};

interface ThemePalette {
  label: string;
  subtitle: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accentBar: string;
  nameColor: string;
  titleColor: string;
  textColor: string;
  mutedColor: string;
  linkColor: string;
  dividerColor: string;
  pillBg: string;
  pillText: string;
}

export const SIGNATURE_THEMES: Record<SignatureThemeId, ThemePalette> = {
  navy_gold: {
    label: 'Ejecutivo Marino & Oro',
    subtitle: 'Clásico directivo de alta jerarquía',
    badgeBg: '#0B2545',
    badgeText: '#FFFFFF',
    badgeBorder: '#C9A227',
    accentBar: '#C9A227',
    nameColor: '#0B2545',
    titleColor: '#8A6D1B',
    textColor: '#1E293B',
    mutedColor: '#64748B',
    linkColor: '#0B2545',
    dividerColor: '#CBD5E1',
    pillBg: '#ECFDF5',
    pillText: '#047857',
  },
  emerald_slate: {
    label: 'Corporativo Emerald & Slate',
    subtitle: 'Moderno, sobrio y tecnológico',
    badgeBg: '#0F172A',
    badgeText: '#FFFFFF',
    badgeBorder: '#059669',
    accentBar: '#059669',
    nameColor: '#0F172A',
    titleColor: '#047857',
    textColor: '#1E293B',
    mutedColor: '#64748B',
    linkColor: '#0F172A',
    dividerColor: '#CBD5E1',
    pillBg: '#ECFDF5',
    pillText: '#065F46',
  },
  minimal_executive: {
    label: 'Minimalista Gerencial',
    subtitle: 'Ultra limpio sin bloque de monograma',
    badgeBg: '#1E293B',
    badgeText: '#FFFFFF',
    badgeBorder: '#1E293B',
    accentBar: '#0F172A',
    nameColor: '#0F172A',
    titleColor: '#475569',
    textColor: '#1E293B',
    mutedColor: '#64748B',
    linkColor: '#0F172A',
    dividerColor: '#E2E8F0',
    pillBg: '#F1F5F9',
    pillText: '#0F172A',
  },
};

const escapeHtml = (input: string): string =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getInitials = (fullName: string): string => {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'CM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const sanitizeDigits = (phone: string): string => phone.replace(/\D/g, '') || '56961436853';

/**
 * Generates 100% Gmail-compatible nested-table HTML with inline CSS only.
 * Zero <style> tags, zero inline <svg>, zero external hotlinked images.
 */
export const buildGmailSignatureHtml = (config: GmailSignatureConfig): string => {
  const palette = SIGNATURE_THEMES[config.theme] || SIGNATURE_THEMES.navy_gold;
  const safeName = escapeHtml(config.fullName.trim() || 'Cristian Muñoz Rojas');
  const safeTitle = escapeHtml(config.title.trim() || 'Ingeniero Civil Industrial');
  const safePhoneDisplay = escapeHtml(config.phoneDisplay.trim() || '+56 9 6143 6853');
  const cleanDigits = sanitizeDigits(config.phoneRaw || config.phoneDisplay);
  const safeEmail = escapeHtml(config.email.trim() || 'samaheim@gmail.com');
  const initials = escapeHtml(getInitials(config.fullName));

  const showMonogram = config.theme !== 'minimal_executive';

  const monogramCell = showMonogram
    ? `
      <td valign="middle" style="padding:0 16px 0 0;vertical-align:middle;">
        <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:separate;">
          <tr>
            <td align="center" valign="middle" width="58" height="58" style="width:58px;height:58px;background-color:${palette.badgeBg};border:2px solid ${palette.badgeBorder};border-radius:8px;text-align:center;vertical-align:middle;font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:700;letter-spacing:1.5px;color:${palette.badgeText};line-height:58px;">
              ${initials}
            </td>
          </tr>
        </table>
      </td>`
    : '';

  const whatsappBadge = config.includeWhatsAppLink
    ? `<span style="color:${palette.dividerColor};padding:0 7px;">&bull;</span><a href="https://wa.me/${cleanDigits}" target="_blank" rel="noopener noreferrer" style="color:${palette.pillText};background-color:${palette.pillBg};text-decoration:none;font-size:11px;font-weight:700;padding:2px 7px;border-radius:4px;letter-spacing:0.2px;display:inline-block;">WhatsApp</a>`
    : '';

  const emailRow = config.includeEmail && config.email.trim()
    ? `
            <tr>
              <td style="padding:4px 0 0 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.4;color:${palette.textColor};">
                <span style="color:${palette.mutedColor};font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:0.8px;padding-right:6px;">Email</span>
                <a href="mailto:${safeEmail}" style="color:${palette.linkColor};text-decoration:none;font-weight:600;">${safeEmail}</a>
              </td>
            </tr>`
    : '';

  const confidentialityRow = config.includeConfidentiality
    ? `
    <tr>
      <td colspan="${showMonogram ? 3 : 2}" style="padding-top:12px;">
        <table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-top:1px solid ${palette.dividerColor};">
          <tr>
            <td style="padding-top:8px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:10px;line-height:1.45;color:#94A3B8;">
              Este correo electrónico y sus archivos adjuntos son confidenciales y están dirigidos exclusivamente a su destinatario.
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : '';

  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:${palette.textColor};max-width:480px;background-color:#FFFFFF;">
  <tbody>
    <tr>
      ${monogramCell}
      <td width="3" style="width:3px;background-color:${palette.accentBar};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
      <td valign="middle" style="padding:2px 0 2px 16px;vertical-align:middle;">
        <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
          <tbody>
            <tr>
              <td style="padding:0 0 2px 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:${palette.nameColor};letter-spacing:0.2px;line-height:1.25;">
                ${safeName}
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 8px 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:${palette.titleColor};text-transform:uppercase;letter-spacing:1.1px;line-height:1.3;">
                ${safeTitle}
              </td>
            </tr>
            <tr>
              <td style="padding:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.45;color:${palette.textColor};">
                <span style="color:${palette.mutedColor};font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:0.8px;padding-right:6px;">Tel.</span>
                <a href="tel:+${cleanDigits}" style="color:${palette.linkColor};text-decoration:none;font-weight:600;letter-spacing:0.2px;">${safePhoneDisplay}</a>${whatsappBadge}
              </td>
            </tr>${emailRow}
          </tbody>
        </table>
      </td>
    </tr>${confidentialityRow}
  </tbody>
</table>`;
};

export const buildPlainTextSignature = (config: GmailSignatureConfig): string => {
  const lines = [
    config.fullName.trim() || 'Cristian Muñoz Rojas',
    config.title.trim() || 'Ingeniero Civil Industrial',
    `Tel: ${config.phoneDisplay.trim() || '+56 9 6143 6853'}`,
  ];
  if (config.includeEmail && config.email.trim()) {
    lines.push(`Email: ${config.email.trim()}`);
  }
  return lines.join('\n');
};

/**
 * Copies rich HTML + plain text to the system clipboard for 1-click Gmail pasting.
 */
export const copyRichSignatureToClipboard = async (
  htmlSnippet: string,
  plainText: string
): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const htmlBlob = new Blob([htmlSnippet], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    const container = document.createElement('div');
    container.innerHTML = htmlSnippet;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = '#FFFFFF';
    document.body.appendChild(container);

    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const ok = document.execCommand('copy');
    selection?.removeAllRanges();
    document.body.removeChild(container);
    return ok;
  } catch {
    return false;
  }
};

/**
 * Builds a self-contained downloadable HTML file containing the signature + 1-click copy helper.
 */
export const buildStandaloneSignatureFileHtml = (config: GmailSignatureConfig): string => {
  const snippet = buildGmailSignatureHtml(config);
  const plainText = buildPlainTextSignature(config);
  const safeName = escapeHtml(config.fullName.trim() || 'Cristian Muñoz Rojas');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pie de Firma Gmail — ${safeName}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 36px 20px;
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      background: #F1F5F9;
      color: #0F172A;
    }
    .wrapper {
      max-width: 720px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
    }
    .header {
      background: #0B2545;
      color: #FFFFFF;
      padding: 22px 28px;
      border-bottom: 3px solid #C9A227;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      letter-spacing: 0.3px;
    }
    .header p {
      margin: 5px 0 0;
      font-size: 12.5px;
      color: #CBD5E1;
    }
    .body {
      padding: 28px;
    }
    .preview-box {
      border: 1px dashed #94A3B8;
      border-radius: 10px;
      padding: 26px;
      background: #FFFFFF;
      margin-bottom: 22px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 22px;
    }
    .btn-primary {
      background: #0B2545;
      color: #FFFFFF;
      border: none;
      padding: 11px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-primary:hover { background: #133A6B; }
    .btn-secondary {
      background: #ECFDF5;
      color: #047857;
      border: 1px solid #A7F3D0;
      padding: 11px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .status {
      display: none;
      padding: 10px 14px;
      border-radius: 8px;
      background: #ECFDF5;
      border: 1px solid #6EE7B7;
      color: #065F46;
      font-size: 12.5px;
      font-weight: 600;
      margin-bottom: 18px;
    }
    .steps {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 16px 20px;
      font-size: 12.5px;
      line-height: 1.6;
      color: #334155;
    }
    .steps strong { color: #0B2545; }
    .steps ol { margin: 8px 0 0 18px; padding: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Pie de Firma Corporativo Compatible con Gmail</h1>
      <p>${safeName} &mdash; Formato HTML de tablas inline (100% compatible con Gmail Web, Android, iOS y Outlook)</p>
    </div>
    <div class="body">
      <div id="status" class="status">Firma copiada con formato enriquecido. Ahora ve a Gmail &rarr; Configuración &rarr; Firma y presiona Ctrl+V (o Cmd+V).</div>

      <div class="actions">
        <button class="btn-primary" onclick="copySignature()">Copiar Firma Lista para Gmail (1 Clic)</button>
        <button class="btn-secondary" onclick="selectSignature()">Seleccionar Firma Manualmente</button>
      </div>

      <div id="signature-preview" class="preview-box">
${snippet}
      </div>

      <div class="steps">
        <strong>Cómo instalar en Gmail en 15 segundos:</strong>
        <ol>
          <li>Haz clic en <strong>"Copiar Firma Lista para Gmail (1 Clic)"</strong> arriba.</li>
          <li>Abre <strong>Gmail</strong> &rarr; ícono de engranaje (<strong>Configuración</strong>) &rarr; <strong>Ver toda la configuración</strong>.</li>
          <li>En la pestaña <strong>General</strong>, baja hasta la sección <strong>Firma</strong> y haz clic en <strong>+ Crear nueva</strong>.</li>
          <li>Pega dentro del cuadro de texto con <strong>Ctrl + V</strong> (Windows) o <strong>Cmd + V</strong> (Mac).</li>
          <li>Selecciona esta firma como predeterminada y haz clic en <strong>Guardar cambios</strong> al final de la página.</li>
        </ol>
      </div>
    </div>
  </div>

  <script>
    const SIGNATURE_HTML = ${JSON.stringify(snippet)};
    const SIGNATURE_TEXT = ${JSON.stringify(plainText)};

    async function copySignature() {
      let copied = false;
      try {
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/html': new Blob([SIGNATURE_HTML], { type: 'text/html' }),
              'text/plain': new Blob([SIGNATURE_TEXT], { type: 'text/plain' })
            })
          ]);
          copied = true;
        }
      } catch (e) {}

      if (!copied) {
        selectSignature();
        copied = document.execCommand('copy');
      }

      const el = document.getElementById('status');
      el.style.display = 'block';
      el.textContent = copied
        ? '✓ Firma copiada con éxito. Pégala directamente en Gmail (Configuración → Firma → Ctrl+V).'
        : 'Firma seleccionada. Presiona Ctrl+C para copiar y luego Ctrl+V en Gmail.';
    }

    function selectSignature() {
      const node = document.getElementById('signature-preview');
      const range = document.createRange();
      range.selectNodeContents(node);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  </script>
</body>
</html>`;
};

/**
 * Renders a razor-sharp 2x PNG data URL via Canvas for users who prefer uploading an image signature in Gmail.
 */
export const renderSignatureToPngDataUrl = (config: GmailSignatureConfig): string => {
  const palette = SIGNATURE_THEMES[config.theme] || SIGNATURE_THEMES.navy_gold;
  const showMonogram = config.theme !== 'minimal_executive';
  const scale = 2;
  const width = 540;
  const height = config.includeEmail ? 156 : 132;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Clean white card background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  let cursorX = 24;
  const centerY = height / 2;

  if (showMonogram) {
    const boxSize = 64;
    const boxY = centerY - boxSize / 2;
    const radius = 9;

    ctx.beginPath();
    ctx.moveTo(cursorX + radius, boxY);
    ctx.lineTo(cursorX + boxSize - radius, boxY);
    ctx.quadraticCurveTo(cursorX + boxSize, boxY, cursorX + boxSize, boxY + radius);
    ctx.lineTo(cursorX + boxSize, boxY + boxSize - radius);
    ctx.quadraticCurveTo(cursorX + boxSize, boxY + boxSize, cursorX + boxSize - radius, boxY + boxSize);
    ctx.lineTo(cursorX + radius, boxY + boxSize);
    ctx.quadraticCurveTo(cursorX, boxY + boxSize, cursorX, boxY + boxSize - radius);
    ctx.lineTo(cursorX, boxY + radius);
    ctx.quadraticCurveTo(cursorX, boxY, cursorX + radius, boxY);
    ctx.closePath();

    ctx.fillStyle = palette.badgeBg;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = palette.badgeBorder;
    ctx.stroke();

    ctx.fillStyle = palette.badgeText;
    ctx.font = '700 23px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getInitials(config.fullName), cursorX + boxSize / 2, centerY + 1);

    cursorX += boxSize + 18;
  }

  const barHeight = config.includeEmail ? 94 : 74;
  const barY = centerY - barHeight / 2;
  ctx.fillStyle = palette.accentBar;
  ctx.fillRect(cursorX, barY, 3.5, barHeight);

  cursorX += 18;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const startY = barY + 20;

  ctx.fillStyle = palette.nameColor;
  ctx.font = '700 20px "Segoe UI", Arial, Helvetica, sans-serif';
  ctx.fillText(config.fullName.trim() || 'Cristian Muñoz Rojas', cursorX, startY);

  ctx.fillStyle = palette.titleColor;
  ctx.font = '700 11.5px "Segoe UI", Arial, Helvetica, sans-serif';
  ctx.fillText((config.title.trim() || 'Ingeniero Civil Industrial').toUpperCase(), cursorX, startY + 21);

  ctx.fillStyle = palette.mutedColor;
  ctx.font = '700 10.5px "Segoe UI", Arial, Helvetica, sans-serif';
  ctx.fillText('TEL.', cursorX, startY + 46);

  ctx.fillStyle = palette.linkColor;
  ctx.font = '600 13.5px "Segoe UI", Arial, Helvetica, sans-serif';
  ctx.fillText(config.phoneDisplay.trim() || '+56 9 6143 6853', cursorX + 30, startY + 46);

  if (config.includeEmail && config.email.trim()) {
    ctx.fillStyle = palette.mutedColor;
    ctx.font = '700 10.5px "Segoe UI", Arial, Helvetica, sans-serif';
    ctx.fillText('EMAIL', cursorX, startY + 68);

    ctx.fillStyle = palette.linkColor;
    ctx.font = '600 13px "Segoe UI", Arial, Helvetica, sans-serif';
    ctx.fillText(config.email.trim(), cursorX + 42, startY + 68);
  }

  return canvas.toDataURL('image/png');
};

export const triggerFileDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
