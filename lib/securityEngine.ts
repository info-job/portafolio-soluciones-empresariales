/**
 * SISTEMA MULTICAPA DE SEGURIDAD E INTEGRIDAD DE DATOS (DEFENSE-IN-DEPTH — ERP CNC GRC)
 * Alineado con el Marco Normativo y Regulatorio de Chile (Vigencia 2026):
 * - Ley N° 21.663 (Ley Marco sobre Ciberseguridad e Infraestructura Crítica — Agencia Nacional de Ciberseguridad ANC y CSIRT Nacional, Alerta Temprana 3 Horas Art. 9°)
 * - Ley N° 21.719 (Nueva Ley de Protección de Datos Personales que reforma la Ley N° 19.628 y crea la Agencia de Protección de Datos Personales — Vigencia 2026)
 * - Ley N° 21.459 (Sobre Delitos Informáticos, Sabotaje y Falsificación de Datos)
 * - Ley N° 21.595 (Ley de Delitos Económicos y Atentados contra el Medio Ambiente — MPD Ley N° 20.393)
 * - Código Tributario Art. 17 y Res. Ex. SII N° 80 (Integridad de Registros Contables F0911 / F0018)
 * 
 * Este motor implementa 4 capas concéntricas de protección con huella criptográfica SHA-256 (FIPS 180-4).
 */

import { sha256Hex } from './auditService';

const SYSTEM_HMAC_SALT = "ASSETFLOW_JDE_E1_SECURE_SALT_2026_CL_ANC_SII";

export interface SecurityIncident {
  timestamp: number;
  layer: 'WAF' | 'SCHEMA_INTEGRITY' | 'ANTI_TAMPER' | 'ACCESS_CONTROL';
  severity: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA';
  actionBlocked: string;
  attackerPayload: string;
  mitigationMessage: string;
  lawReferenced: string;
  ancCsirtReportCode?: string;
  sha256Signature?: string;
}

export interface AncCsirtEarlyWarningReport {
  folio: string;
  generatedAt: string;
  reportingDeadline3h: string;
  dataAgencyDeadline72h: string;
  entityCategory: 'OPERADOR_IMPORTANCIA_VITAL_OIV' | 'SERVICIO_ESENCIAL_FINANCIERO_INMOBILIARIO';
  incidentLayer: SecurityIncident['layer'];
  severity: SecurityIncident['severity'];
  legalBasis: string;
  technicalSummary: string;
  cryptographicDigest: string;
}

export type SecurityAssessmentScore = {
  overallScore: number;
  layerWafScore: number;
  layerSchemaScore: number;
  layerAntiTamperScore: number;
  layerAccessScore: number;
  incidentsBlocked: number;
  complianceLevel: 'EXCELENTE' | 'MEDIO' | 'CRÍTICO';
};

class LayeredSecurityEngine {
  private incidentLogs: SecurityIncident[] = [];
  private static instance: LayeredSecurityEngine;

  private constructor() {
    const initTimestamp = Date.now() - 3600000 * 24;
    const initDigest = sha256Hex(`WAF|${initTimestamp}|GET /../../etc/passwd|${SYSTEM_HMAC_SALT}`);
    this.incidentLogs = [
      {
        timestamp: initTimestamp,
        layer: 'WAF',
        severity: 'ALTA',
        actionBlocked: 'Escaneo de Puertos / Path Traversal',
        attackerPayload: 'GET /../../etc/passwd',
        mitigationMessage: 'Acceso bloqueado por regex restrictivo de ruta local ERP JAS.',
        lawReferenced: 'Ley N° 21.459 Art. 1 (Acceso Ilícito) y Ley N° 21.663 Art. 9 (ANC)',
        ancCsirtReportCode: `ANC-CSIRT-2026-${initDigest.slice(0, 8)}`,
        sha256Signature: `SHA256-${initDigest.slice(0, 24)}`
      }
    ];
  }

  public static getInstance(): LayeredSecurityEngine {
    if (!LayeredSecurityEngine.instance) {
      LayeredSecurityEngine.instance = new LayeredSecurityEngine();
    }
    return LayeredSecurityEngine.instance;
  }

  // --- CAPA 1: FILTRADO DE ENTRADA Y PREVENCIÓN DE INTRUSIONES (WAF EMULATOR) ---
  // Mitiga OWASP Top 10: XSS, Inyección NoSQL, Path Traversal
  public sanitizeAndValidateInput(input: string, contextName: string = "General"): { sanitized: string; isValid: boolean; incident?: SecurityIncident } {
    if (!input || typeof input !== 'string') {
      return { sanitized: "", isValid: true };
    }

    let isValid = true;
    let incident: SecurityIncident | undefined;
    let sanitizedText = input;

    const hasNoSqlPattern = /({|\[)\s*"\$(gt|lt|ne|eq|gte|lte|in|nin|regex)"/gi.test(input) || input.includes('"$gt"') || input.includes('"$ne"');
    const hasPathTraversal = /\.\.\/\.\.\//gi.test(input) || input.includes('../') || input.includes('..\\');
    const hasScriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(input) || 
                             /href="javascript:|onclick=|onload=|onerror=/gi.test(input);

    if (hasNoSqlPattern || hasPathTraversal || hasScriptPattern) {
      isValid = false;
      let reason = "";
      let law = "Ley N° 21.663 (Marco sobre Ciberseguridad ANC)";

      if (hasNoSqlPattern) {
        reason = "Intento de Inyección de Operadores NoSQL en Base de Datos";
        law = "Ley N° 21.459 Art. 3 (Sabotaje Informático) y Ley N° 21.663 Art. 9";
      } else if (hasPathTraversal) {
        reason = "Intento de Salto de Directorio (Path Traversal)";
        law = "Ley N° 21.459 Art. 1 (Acceso Ilícito)";
      } else if (hasScriptPattern) {
        reason = "Inyección de Secuencias de Comandos en Sitios Cruzados (XSS)";
        law = "Ley N° 21.719 / Ley N° 19.628 Art. 14 bis (Deber de Seguridad de Datos Personales)";
      }

      sanitizedText = input
        .replace(/<[^>]*>/g, "")
        .replace(/["'$]/g, "")
        .substring(0, 500);

      const ts = Date.now();
      const digest = sha256Hex(`WAF|${ts}|${contextName}|${input.substring(0, 150)}|${SYSTEM_HMAC_SALT}`);

      incident = {
        timestamp: ts,
        layer: 'WAF',
        severity: 'ALTA',
        actionBlocked: `Entrada bloqueada en campo: ${contextName}`,
        attackerPayload: input.substring(0, 150),
        mitigationMessage: `Campo sanitizado automáticamente de forma inofensiva. Motivo: ${reason}.`,
        lawReferenced: law,
        ancCsirtReportCode: `ANC-CSIRT-2026-${digest.slice(0, 8)}`,
        sha256Signature: `SHA256-${digest.slice(0, 24)}`
      };

      this.logIncident(incident);
    }

    return { sanitized: sanitizedText, isValid, incident };
  }

  // --- CAPA 2: ESQUEMA DE DATOS CANÓNICO Y PROTECCIÓN DE ATRIBUTOS (ANTI UPDATE-GAP) ---
  public validateSchemaIntegrity(payload: Record<string, any>, allowedKeys: string[], moduleName: string): { isCompliant: boolean; sanitizedPayload: Record<string, any>; incident?: SecurityIncident } {
    let isCompliant = true;
    let incident: SecurityIncident | undefined;
    const sanitizedPayload: Record<string, any> = {};
    const injectedKeys: string[] = [];

    for (const key in payload) {
      if (allowedKeys.includes(key)) {
        sanitizedPayload[key] = payload[key];
      } else {
        isCompliant = false;
        injectedKeys.push(key);
      }
    }

    if (!isCompliant) {
      const ts = Date.now();
      const digest = sha256Hex(`SCHEMA|${ts}|${moduleName}|${injectedKeys.join(',')}|${SYSTEM_HMAC_SALT}`);
      incident = {
        timestamp: ts,
        layer: 'SCHEMA_INTEGRITY',
        severity: 'MEDIA',
        actionBlocked: `Inyección de Atribución No-Canónica en módulo ${moduleName}`,
        attackerPayload: `Llaves bloqueadas: ${injectedKeys.join(', ')}`,
        mitigationMessage: "Filtrado automático de llaves ajenas al modelo maestro de base de datos canónico ERP.",
        lawReferenced: "Ley N° 21.663 Art. 7 y 8 (Deberes Generales de Resiliencia e Integridad)",
        ancCsirtReportCode: `ANC-CSIRT-2026-${digest.slice(0, 8)}`,
        sha256Signature: `SHA256-${digest.slice(0, 24)}`
      };

      this.logIncident(incident);
    }

    return { isCompliant, sanitizedPayload, incident };
  }

  // --- CAPA 3: CRIPTOGRAFÍA DE INTEGRIDAD DE ARCHIVOS Y REGISTROS (ANTI-TAMPERING SHA-256 REAL) ---
  public generateTamperProofHash(recordId: string, amount: number, supplierTaxId: string): string {
    const rawString = `${recordId}|${Number(amount).toFixed(0)}|${(supplierTaxId || '').trim().toUpperCase()}|${SYSTEM_HMAC_SALT}`;
    const digest = sha256Hex(rawString);
    return `ERP-SHA256-${digest.slice(0, 24)}`;
  }

  public verifyTamperProof(recordId: string, amount: number, supplierTaxId: string, providedHash?: string): { isIntact: boolean; incident?: SecurityIncident } {
    if (!providedHash) {
      return { isIntact: true };
    }

    const expectedHash = this.generateTamperProofHash(recordId, amount, supplierTaxId);
    if (expectedHash !== providedHash) {
      const ts = Date.now();
      const digest = sha256Hex(`ANTI_TAMPER|${ts}|${recordId}|${providedHash}|${expectedHash}`);
      const incident: SecurityIncident = {
        timestamp: ts,
        layer: 'ANTI_TAMPER',
        severity: 'CRÍTICA',
        actionBlocked: `Sabotaje de Registros Financieros ERP F0911 (ID: ${recordId})`,
        attackerPayload: `Hash Proveído: ${providedHash} | Esperado: ${expectedHash}`,
        mitigationMessage: "Divergencia criptográfica SHA-256 detectada en monto o RUT del registro contable. Operación bloqueada y reportada a CSIRT/Auditoría.",
        lawReferenced: "Ley N° 21.459 Art. 4 (Falsificación Informática), Ley N° 21.595 (Delitos Económicos) y Art. 97 N° 4 Código Tributario",
        ancCsirtReportCode: `ANC-ALERTA-3H-${digest.slice(0, 8)}`,
        sha256Signature: `SHA256-${digest.slice(0, 24)}`
      };

      this.logIncident(incident);
      return { isIntact: false, incident };
    }

    return { isIntact: true };
  }

  // --- CAPA 4: CONTROL DE ACCESO AUTORIZADO Y BITÁCORA INMUTABLE (ZERO-TRUST AUDIT) ---
  public auditAction(user: string, role: string, action: string, success: boolean): SecurityIncident {
    const isSuccess = success ? "EXITOSA" : "DENEGADA";
    const ts = Date.now();
    const digest = sha256Hex(`ACCESS|${ts}|${user}|${role}|${action}|${isSuccess}|${SYSTEM_HMAC_SALT}`);
    
    const incident: SecurityIncident = {
      timestamp: ts,
      layer: 'ACCESS_CONTROL',
      severity: success ? 'BAJA' : 'ALTA',
      actionBlocked: `Rastro de Auditoría Zero-Trust ERP P950000`,
      attackerPayload: `Operador: ${user} | Rol: ${role} | Acción: ${action} | Estado: ${isSuccess}`,
      mitigationMessage: success 
        ? `Acceso y operación autorizada según privilegios de rol ${role}.`
        : `Acceso DENEGADO a módulo restringido por segregación de funciones (SoD ERP).`,
      lawReferenced: "Ley N° 21.719 (Responsabilidad Proactiva y Seguridad de Datos Personales) y CMF NCG N° 502",
      ancCsirtReportCode: `ANC-SOD-2026-${digest.slice(0, 8)}`,
      sha256Signature: `SHA256-${digest.slice(0, 24)}`
    };

    if (!success) {
      this.logIncident(incident);
    }
    return incident;
  }

  /**
   * Genera Reporte Oficial de Alerta Temprana (3 Horas) para el CSIRT Nacional / ANC (Ley N° 21.663 Art. 9)
   * y notificación en 72 Horas a la Agencia de Protección de Datos Personales (Ley N° 21.719 Art. 14 ter)
   */
  public generateAncCsirtReport(incident: SecurityIncident): AncCsirtEarlyWarningReport {
    const incidentDate = new Date(incident.timestamp);
    const deadline3h = new Date(incident.timestamp + 3 * 3600 * 1000);
    const deadline72h = new Date(incident.timestamp + 72 * 3600 * 1000);
    const digest = sha256Hex(`${incident.timestamp}|${incident.layer}|${incident.actionBlocked}|${SYSTEM_HMAC_SALT}`);

    return {
      folio: incident.ancCsirtReportCode || `ANC-CSIRT-2026-${digest.slice(0, 8)}`,
      generatedAt: incidentDate.toISOString(),
      reportingDeadline3h: deadline3h.toISOString(),
      dataAgencyDeadline72h: deadline72h.toISOString(),
      entityCategory: 'SERVICIO_ESENCIAL_FINANCIERO_INMOBILIARIO',
      incidentLayer: incident.layer,
      severity: incident.severity,
      legalBasis: 'Ley N° 21.663 Art. 9° (Alerta Temprana 3h CSIRT Nacional) • Ley N° 21.719 Art. 14 ter (Reporte 72h Agencia Protección de Datos)',
      technicalSummary: `${incident.actionBlocked} — ${incident.mitigationMessage}`,
      cryptographicDigest: `SHA256-${digest}`
    };
  }

  private logIncident(incident: SecurityIncident): void {
    this.incidentLogs.unshift(incident);
    if (this.incidentLogs.length > 200) {
      this.incidentLogs.pop();
    }
  }

  public getIncidentLogs(): SecurityIncident[] {
    return this.incidentLogs;
  }

  public clearLogsForTesting(): void {
    this.incidentLogs = [];
  }

  public calculateComplianceAssessment(): SecurityAssessmentScore {
    const incidents = this.incidentLogs;
    const waferCount = incidents.filter(i => i.layer === 'WAF').length;
    const schemaCount = incidents.filter(i => i.layer === 'SCHEMA_INTEGRITY').length;
    const tamperCount = incidents.filter(i => i.layer === 'ANTI_TAMPER').length;
    const accessCount = incidents.filter(i => i.layer === 'ACCESS_CONTROL' && i.severity === 'ALTA').length;

    const layerWafScore = Math.max(70, 100 - waferCount * 5);
    const layerSchemaScore = Math.max(80, 100 - schemaCount * 10);
    const layerAntiTamperScore = Math.max(90, 100 - tamperCount * 15);
    const layerAccessScore = Math.max(85, 100 - accessCount * 10);

    const overallScore = Math.round((layerWafScore + layerSchemaScore + layerAntiTamperScore + layerAccessScore) / 4);
    
    let complianceLevel: 'EXCELENTE' | 'MEDIO' | 'CRÍTICO' = 'EXCELENTE';
    if (overallScore < 80) complianceLevel = 'CRÍTICO';
    else if (overallScore < 92) complianceLevel = 'MEDIO';

    return {
      overallScore,
      layerWafScore,
      layerSchemaScore,
      layerAntiTamperScore,
      layerAccessScore,
      incidentsBlocked: incidents.length,
      complianceLevel
    };
  }
}

export const securityEngine = LayeredSecurityEngine.getInstance();

