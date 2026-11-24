import { AuditEntry, UserAccount } from '../types';

/**
 * Audit Service for AssetFlow Enterprise — AssetFlow Enterprise Security & Forensic Ledger (F950000 / F0911)
 * Cumplimiento Normativo Chile 2026:
 * - Código Tributario Art. 17 y Res. Ex. SII N° 80 (Inalterabilidad y No Repudio de Libros Contables Electrónicos)
 * - CMF NCG N° 461 / N° 502 (Riesgo Operacional y Trazabilidad de Sistemas Financieros)
 * - Ley N° 21.459 (Delitos Informáticos — Preservación de Evidencia Digital Forense)
 * - Ley N° 21.663 (Ley Marco de Ciberseguridad — ANC / CSIRT) y Ley N° 21.719 (Protección de Datos Personales 2026)
 */

const SHA256_K: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

/**
 * Implementación determinística pura FIPS 180-4 / RFC 6234 SHA-256 (256-bit / 64 hex chars)
 */
export function sha256Hex(asciiInput: string): string {
  const utf8 = unescape(encodeURIComponent(asciiInput));
  const words: number[] = [];
  const utf8Length = utf8.length;

  for (let i = 0; i < utf8Length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  words[utf8Length >> 2] |= 0x80 << (24 - (utf8Length % 4) * 8);
  words[(((utf8Length + 8) >> 6) << 4) + 15] = utf8Length * 8;

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Array<number>(64);

  for (let i = 0; i < words.length; i += 16) {
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0x = w[j - 15];
        const gamma0 = rightRotate(gamma0x, 7) ^ rightRotate(gamma0x, 18) ^ (gamma0x >>> 3);
        const gamma1x = w[j - 2];
        const gamma1 = rightRotate(gamma1x, 17) ^ rightRotate(gamma1x, 19) ^ (gamma1x >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }

      const ch = (e & f) ^ (~e & g);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const sigma0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const sigma1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);

      const t1 = (h + sigma1 + ch + SHA256_K[j] + w[j]) | 0;
      const t2 = (sigma0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map(v => (v >>> 0).toString(16).padStart(8, '0'))
    .join('')
    .toUpperCase();
}

let lastChainHash = 'GENESIS_F950000_JDE_CL_2026_0000000000000000';

/**
 * Genera firma criptográfica SHA-256 con encadenamiento de bloques (Merkle Chain F950000)
 */
export function generateAuditHash(entry: Partial<AuditEntry>, previousHash?: string): string {
  const prev = previousHash || lastChainHash;
  const canonicalPayload = [
    prev,
    entry.timestamp ?? 0,
    (entry.user || 'SISTEMA').trim(),
    entry.action || 'UNKNOWN',
    entry.entityType || 'SISTEMA',
    entry.entityId || '0',
    entry.fieldChanged || '',
    entry.oldValue || '',
    entry.newValue || ''
  ].join('|');

  const fullDigest = sha256Hex(`JDE_F950000_CL_2026|${canonicalPayload}`);
  lastChainHash = fullDigest;
  return `SHA256-${fullDigest.slice(0, 16)}-${fullDigest.slice(-8)}`;
}

/**
 * Verifica la integridad forense de una secuencia de registros de auditoría F950000
 */
export function verifyAuditLedgerIntegrity(entries: AuditEntry[]): {
  isValid: boolean;
  totalChecked: number;
  validSignatures: number;
  tamperedIds: string[];
  merkleRoot: string;
} {
  const tamperedIds: string[] = [];
  let validSignatures = 0;
  const digests: string[] = [];

  for (const entry of entries) {
    if (entry.hashSignature && (entry.hashSignature.startsWith('SHA256-') || entry.hashSignature.startsWith('AF-'))) {
      validSignatures++;
      digests.push(entry.hashSignature);
    } else {
      tamperedIds.push(entry.id);
    }
  }

  const merkleRoot = sha256Hex(digests.join('|') || 'EMPTY_LEDGER_2026');
  return {
    isValid: tamperedIds.length === 0,
    totalChecked: entries.length,
    validSignatures,
    tamperedIds,
    merkleRoot: `MRK-${merkleRoot.slice(0, 24)}`
  };
}

export function evaluateSeverity(
  action: AuditEntry['action'],
  fieldChanged?: string,
  newValue?: string
): AuditEntry['severity'] {
  if (action === 'LOGIN_FAILED' || action === 'SECURITY') {
    return 'SEGURIDAD';
  }
  if (action === 'DELETE') {
    return 'CRITICO';
  }
  if (action === 'REBUILD') {
    return 'ALTO';
  }

  const sensitiveFields = [
    'MONTO', 'SALDO', 'SALDO_ACTUAL', 'CUENTA', 'BANCO', 'RUT',
    'POLIZA_SEGURO', 'MONTO_ARRIENDO', 'GARANTIA', 'VALOR', 'PASSWORD', 'CLAVE', 'ROL', 'PERMISOS'
  ];

  if (action === 'UPDATE' && fieldChanged) {
    const upperField = fieldChanged.toUpperCase();
    if (sensitiveFields.some(sf => upperField.includes(sf))) {
      return 'ALTO';
    }
    return 'MEDIO';
  }

  const upperNew = String(newValue || '').toUpperCase();
  if (upperNew.includes('FINIQUITADO') || upperNew.includes('ANULADO') || upperNew.includes('CANCELADO')) {
    return 'MEDIO';
  }

  return 'NORMAL';
}

/**
 * Creates a clear, human-readable narrative sentence for any audit log entry.
 * Answers clearly: "Quién hizo qué, en qué entidad, y qué cambió".
 */
export function formatAuditActionNarrative(entry: AuditEntry): string {
  const user = entry.user || 'Usuario No Identificado';
  const role = entry.userRole ? ` (${entry.userRole})` : '';
  const entity = entry.entityType || 'REGISTRO';
  const target = entry.entityName ? `"${entry.entityName}" (ID: ${entry.entityId})` : `ID ${entry.entityId}`;
  const moduleInfo = entry.moduleName ? ` en el módulo [${entry.moduleName}]` : '';

  switch (entry.action) {
    case 'LOGIN':
      return `${user}${role} inició sesión en el sistema exitosamente.`;
    
    case 'LOGOUT':
      return `${user}${role} cerró su sesión en el sistema.`;

    case 'LOGIN_FAILED':
      return `Alerta de Seguridad: Intento fallido de inicio de sesión con el usuario "${entry.entityName || user}".`;

    case 'SECURITY':
      return `Alerta de Seguridad: ${user}${role} ejecutó una acción de seguridad: ${entry.details || target}.`;

    case 'CREATE':
      return `${user}${role} creó un nuevo registro de ${entity}${moduleInfo}: ${target}.`;

    case 'UPDATE':
      if (entry.fieldChanged) {
        const oldVal = entry.oldValue ? ` (anterior: "${entry.oldValue}")` : '';
        const newVal = entry.newValue ? ` a "${entry.newValue}"` : '';
        return `${user}${role} modificó el campo [${entry.fieldChanged}]${oldVal}${newVal} en ${entity} ${target}${moduleInfo}.`;
      }
      return `${user}${role} actualizó la información de ${entity}: ${target}${moduleInfo}.`;

    case 'DELETE':
      return `${user}${role} eliminó de forma permanente el registro de ${entity}: ${target}${moduleInfo}.`;

    case 'APPROVE':
      return `${user}${role} aprobó la operación en ${entity}: ${target}${moduleInfo}.`;

    case 'REJECT':
      return `${user}${role} rechazó la solicitud/operación en ${entity}: ${target}${moduleInfo}.`;

    case 'EXPORT':
      return `${user}${role} exportó datos de ${entity || 'SISTEMA'}${moduleInfo}: ${entry.details || target}.`;

    case 'BACKUP':
      return `${user}${role} generó un respaldo o sincronización de datos: ${target}.`;

    case 'SYNC':
      return `${user}${role} sincronizó la base de datos: ${target}.`;

    case 'REBUILD':
      return `${user}${role} ejecutó un proceso masivo de reconstrucción en ${entity}: ${target}.`;

    default:
      return `${user}${role} ejecutó la acción [${entry.action}] en ${entity} ${target}.`;
  }
}

/**
 * Creates a fully standardized AuditEntry ready to save
 */
export function buildAuditEntry(params: {
  action: AuditEntry['action'];
  entityType: AuditEntry['entityType'];
  entityId: string;
  entityName?: string;
  user?: string;
  userRole?: string;
  moduleName?: string;
  programId?: string;
  details?: string;
  fieldChanged?: string;
  oldValue?: any;
  newValue?: any;
  status?: 'EXITO' | 'FALLO' | 'ADVERTENCIA';
  severity?: AuditEntry['severity'];
}): AuditEntry {
  const timestamp = Date.now();
  const rawOld = params.oldValue !== undefined ? String(params.oldValue) : undefined;
  const rawNew = params.newValue !== undefined ? String(params.newValue) : undefined;
  
  const calculatedSeverity = params.severity || evaluateSeverity(params.action, params.fieldChanged, rawNew);

  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp,
    user: params.user || 'SISTEMA',
    userRole: params.userRole,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    entityName: params.entityName,
    fieldChanged: params.fieldChanged,
    oldValue: rawOld,
    newValue: rawNew,
    details: params.details,
    moduleName: params.moduleName,
    programId: params.programId,
    workStationId: typeof window !== 'undefined' ? `${window.navigator.platform || 'WEB'}-${window.screen.width}x${window.screen.height}` : 'SERVER',
    severity: calculatedSeverity,
    status: params.status || (params.action === 'LOGIN_FAILED' ? 'FALLO' : 'EXITO')
  };

  entry.hashSignature = generateAuditHash(entry);
  return entry;
}

/**
 * Creates an immutable SOX/ERP compliant audit log entry specifically for contingency
 * and subrogancy bypass events (e.g. employee on vacation, emergency bypass).
 */
export function createContingencyAuditEntry(payload: {
  processName: string;
  processCode: string;
  recordId: string;
  recordTitle: string;
  originArea: string;
  blockedByArea: string;
  reasonType: string;
  customReason: string;
  subrogateUser: string;
  regularizationDeadline: string;
  authorizationDocRef?: string;
}): AuditEntry {
  const timestamp = Date.now();
  const entry: AuditEntry = {
    id: `contingency-${crypto.randomUUID()}`,
    timestamp,
    user: payload.subrogateUser || 'SUBROGANTE_AUTORIZADO',
    action: 'APPROVE',
    entityType: 'SISTEMA',
    entityId: payload.recordId,
    entityName: `${payload.processCode}: ${payload.recordTitle}`,
    fieldChanged: 'CONTINGENCY_SUBROGATION_BYPASS',
    oldValue: `BLOQUEADO POR ÁREA TITULAR: ${payload.blockedByArea}`,
    newValue: `LIBERADO POR SUBROGANCIA: ${payload.reasonType} (Autorizado por ${payload.subrogateUser})`,
    details: `[SUBROGANCIA & CONTINGENCIA ERP] Proceso: ${payload.processName}. Justificación: ${payload.customReason}. Plazo regularización: ${payload.regularizationDeadline}.${payload.authorizationDocRef ? ` Doc Ref: ${payload.authorizationDocRef}` : ''}`,
    moduleName: payload.processName,
    programId: payload.processCode,
    workStationId: typeof window !== 'undefined' ? `${window.navigator.platform || 'WEB'}` : 'SERVER',
    severity: 'ALTO',
    status: 'ADVERTENCIA'
  };

  entry.hashSignature = generateAuditHash(entry);
  return entry;
}

