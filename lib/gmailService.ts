import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';

/**
 * Scopes required for automated email sending via Google Workspace Gmail API
 */
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send'
];

const provider = new GoogleAuthProvider();
GMAIL_SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account'
});

// CRITICAL SECURITY RULE: In-memory caching ONLY. Never persist in localStorage / sessionStorage.
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initialize Google Auth listener for Gmail API token management
 */
export const initGmailAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Google Sign-In popup with gmail.send scope
 */
export const googleSignInGmail = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google OAuth para Gmail.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[Gmail Auth Error]', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns currently cached in-memory access token
 */
export const getGmailAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Set an in-memory access token manually if obtained elsewhere
 */
export const setGmailAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Clear cached access token
 */
export const logoutGmail = () => {
  cachedAccessToken = null;
};

/**
 * Encode string to UTF-8 Base64URL string (RFC 4648 § 5)
 */
export const toBase64Url = (str: string): string => {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Encode binary ArrayBuffer or Uint8Array to Base64URL
 */
export const bufferToBase64Url = (buffer: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export interface EmailAttachment {
  filename: string;
  contentType: string;
  dataBase64: string; // Pure Base64 data without data: URI prefix
}

export interface SendEmailPayload {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  threadId?: string;
  timestamp: number;
}

/**
 * Constructs an RFC 2822 MIME message and dispatches it via Gmail API
 */
export const sendAutomatedEmail = async (
  payload: SendEmailPayload,
  tokenOverride?: string
): Promise<SendEmailResult> => {
  const token = tokenOverride || cachedAccessToken;
  if (!token) {
    throw new Error('No hay una sesión activa de Google autorizada. Inicie sesión con Google para enviar correos.');
  }

  const boundary = `====AssetFlow_Bound_${Date.now()}====`;
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`;

  const headers: string[] = [
    `To: ${payload.to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0'
  ];

  if (payload.cc) {
    headers.push(`Cc: ${payload.cc}`);
  }
  if (payload.bcc) {
    headers.push(`Bcc: ${payload.bcc}`);
  }

  let mimeMessage = '';

  if (payload.attachments && payload.attachments.length > 0) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    mimeMessage += headers.join('\r\n') + '\r\n\r\n';

    // Body part
    mimeMessage += `--${boundary}\r\n`;
    if (payload.bodyHtml) {
      mimeMessage += 'Content-Type: text/html; charset="UTF-8"\r\n';
      mimeMessage += 'Content-Transfer-Encoding: 8bit\r\n\r\n';
      mimeMessage += payload.bodyHtml + '\r\n\r\n';
    } else {
      mimeMessage += 'Content-Type: text/plain; charset="UTF-8"\r\n';
      mimeMessage += 'Content-Transfer-Encoding: 8bit\r\n\r\n';
      mimeMessage += payload.bodyText + '\r\n\r\n';
    }

    // Attachment parts
    for (const att of payload.attachments) {
      mimeMessage += `--${boundary}\r\n`;
      mimeMessage += `Content-Type: ${att.contentType}; name="${att.filename}"\r\n`;
      mimeMessage += 'Content-Transfer-Encoding: base64\r\n';
      mimeMessage += `Content-Disposition: attachment; filename="${att.filename}"\r\n\r\n`;
      // Break base64 in 76-char chunks per RFC standards
      const cleanBase64 = att.dataBase64.replace(/\s+/g, '');
      const chunks = cleanBase64.match(/.{1,76}/g) || [cleanBase64];
      mimeMessage += chunks.join('\r\n') + '\r\n\r\n';
    }

    mimeMessage += `--${boundary}--\r\n`;
  } else {
    if (payload.bodyHtml) {
      headers.push('Content-Type: text/html; charset="UTF-8"');
      headers.push('Content-Transfer-Encoding: 8bit');
      mimeMessage = headers.join('\r\n') + '\r\n\r\n' + payload.bodyHtml;
    } else {
      headers.push('Content-Type: text/plain; charset="UTF-8"');
      headers.push('Content-Transfer-Encoding: 8bit');
      mimeMessage = headers.join('\r\n') + '\r\n\r\n' + payload.bodyText;
    }
  }

  const rawBase64Url = toBase64Url(mimeMessage);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: rawBase64Url })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Error en Gmail API (${response.status} ${response.statusText})`;
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('La sesión de Google ha expirado. Por favor, vuelva a autenticarse.');
    }
    throw new Error(message);
  }

  const result = await response.json();
  return {
    success: true,
    messageId: result.id,
    threadId: result.threadId,
    timestamp: Date.now()
  };
};

/**
 * Pre-configured template for commercial presentation to potential clients,
 * emphasizing adaptability to any industry while specialized in real estate & CMF.
 */
export const buildPresentationEmailTemplate = (
  recipientName: string = 'Estimado/a',
  targetIndustry: string = 'Inmobiliaria / Operaciones Corporativas'
) => {
  const subject = `Propuesta de Solución Tecnológica Integral - Plataforma Modular de Gestión Operativa, Financiera y Cumplimiento`;
  
  const bodyText = `Estimado/a ${recipientName},

Junto con saludar cordialmente, me dirijo a usted para presentarle una solución tecnológica de nivel empresarial diseñada para transformar y blindar la gestión operativa, financiera y de cumplimiento de las organizaciones.

Nuestra plataforma ha sido concebida con una arquitectura modular y escalable de alto rendimiento que le permite ajustarse de forma nativa a las dinámicas operacionales y requerimientos específicos de CUALQUIER INDUSTRIA (manufactura, logística, retail, servicios profesionales, educación, salud o corporaciones multinacionales).

Actualmente, el sistema cuenta con una parametrización de vanguardia concebida para sostener y optimizar las operaciones de apoyo de la INDUSTRIA INMOBILIARIA y fondos de inversión, incorporando:

1. GESTIÓN INTEGRAL DE ÓRDENES DE TRABAJO (OT): Trazabilidad total con categorización por rubro (Techumbres, Plomería, Obras Civiles, Pintura), factura tributaria asociada y workbench de aprobaciones multinivel estilo Enterprise 9.11 (P43081 / F4209).
2. CONFORMIDAD REGULATORIA CMF & IFRS: Módulos dedicados para generación automática y cuadratura exacta de informes B.4 (Cartera y Activos NCG 316), B.13 (Morosidad y Cobranza) y Nota 14 NIC 40 (Roll-Forward de Inversiones Inmobiliarias) con exportación directa en Excel estructurado.
3. MOTOR DE INTELIGENCIA DE CONTROL INTERNO: Análisis forense de Ley de Benford, auditoría de integridad transaccional inmutable y conciliación bancaria automatizada.
4. GOBERNANZA TRIBUTARIA Y UAF: Liquidación de garantías de arriendo, matriz de riesgo de proveedores y formularios de beneficiarios finales UAF.

Estaremos encantados de coordinar una breve reunión o demostración interactiva en vivo para evaluar cómo esta solución puede potenciar la eficiencia, trazabilidad y control de costos en su empresa.

Quedo a su completa disposición para resolver cualquier inquietud.

Atentamente,

Cristian Muñoz
Director de Proyecto & Arquitectura de Soluciones
AssetFlow Enterprise Solution
Contacto: samaheim@gmail.com`;

  return { subject, bodyText };
};
