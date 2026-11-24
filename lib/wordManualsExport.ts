import { saveAs } from 'file-saver';

/**
 * Utility to wrap HTML into a Microsoft Word compatible Document (.doc / .docx compatible)
 * Strictly formatted according to ISO 9001:2015 Quality Management System standards (SGC).
 * Includes ISO 9001 Document Control Header, Approval Matrix, Mandatory ISO Clauses (1 to 8),
 * Styled Tables, Quality Record Control, Change History, and Image Placeholder Boxes.
 */
export const downloadWordDocFromHtml = (
  title: string,
  htmlBodyContent: string,
  fileName: string,
  documentCode: string = 'SGC-MAN-001',
  version: string = 'Versión 3.0 / 2026'
) => {
  const currentDate = new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
        xmlns:w='urn:schemas-microsoft-com:office:word' 
        xmlns:m='http://schemas.microsoft.com/office/2004/12/omml'
        xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="ProgId" content="Word.Document" />
    <meta name="Generator" content="Microsoft Word 15" />
    <meta name="Originator" content="Microsoft Word 15" />
    <title>${title}</title>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForCustomXSL/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      @page {
        size: 21.0cm 29.7cm;
        margin: 2.0cm 2.0cm 2.0cm 2.0cm;
      }
      body {
        font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
        font-size: 10.5pt;
        line-height: 1.45;
        color: #0f172a;
        background-color: #ffffff;
      }
      
      /* ISO 9001 ENCABEZADO DE CONTROL DE DOCUMENTO */
      .iso-header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        border: 2px solid #002D62;
      }
      .iso-header-table td {
        border: 1px solid #002D62;
        padding: 6px 10px;
        font-size: 9pt;
      }
      .iso-logo-cell {
        width: 25%;
        text-align: center;
        vertical-align: middle;
        background-color: #f8fafc;
      }
      .iso-title-cell {
        width: 50%;
        text-align: center;
        vertical-align: middle;
      }
      .iso-meta-cell {
        width: 25%;
        background-color: #f8fafc;
      }

      /* ISO 9001 CUADRO DE FIRMAS Y RESPONSABILIDADES */
      .iso-approval-table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0 24px 0;
        font-size: 8.5pt;
      }
      .iso-approval-table th {
        background-color: #002D62;
        color: #ffffff;
        font-weight: bold;
        text-transform: uppercase;
        padding: 6px 8px;
        text-align: center;
        border: 1px solid #002D62;
      }
      .iso-approval-table td {
        border: 1px solid #cbd5e1;
        padding: 8px;
        vertical-align: top;
        background-color: #ffffff;
      }

      /* Headings */
      h1 {
        font-size: 14pt;
        font-weight: bold;
        color: #002D62;
        border-bottom: 2px solid #002D62;
        padding-bottom: 4px;
        margin-top: 22px;
        margin-bottom: 10px;
        text-transform: uppercase;
      }
      h2 {
        font-size: 12pt;
        font-weight: bold;
        color: #002D62;
        background-color: #f1f5f9;
        padding: 5px 10px;
        border-left: 5px solid #002D62;
        margin-top: 18px;
        margin-bottom: 8px;
      }
      h3 {
        font-size: 10.5pt;
        font-weight: bold;
        color: #1e293b;
        margin-top: 12px;
        margin-bottom: 6px;
      }

      p {
        margin-top: 0;
        margin-bottom: 8px;
        text-align: justify;
      }

      ul, ol {
        margin-top: 0;
        margin-bottom: 10px;
        padding-left: 22px;
      }
      li {
        margin-bottom: 4px;
      }

      /* Tables Standard ISO */
      table.iso-table {
        width: 100%;
        border-collapse: collapse;
        margin: 14px 0;
        font-size: 9.5pt;
      }
      table.iso-table th {
        background-color: #002D62;
        color: #ffffff;
        font-weight: bold;
        padding: 7px 10px;
        border: 1px solid #002D62;
        text-align: left;
      }
      table.iso-table td {
        border: 1px solid #cbd5e1;
        padding: 7px 10px;
        vertical-align: top;
      }
      table.iso-table tr:nth-child(even) td {
        background-color: #f8fafc;
      }

      /* Callout Boxes */
      .note-box {
        background-color: #f0f9ff;
        border-left: 4px solid #0284c7;
        padding: 10px 14px;
        margin: 12px 0;
        font-size: 10pt;
      }
      .warning-box {
        background-color: #fff1f2;
        border-left: 4px solid #e11d48;
        padding: 10px 14px;
        margin: 12px 0;
        font-size: 10pt;
      }
      .success-box {
        background-color: #f0fdf4;
        border-left: 4px solid #16a34a;
        padding: 10px 14px;
        margin: 12px 0;
        font-size: 10pt;
      }

      /* Screenshot Placeholder Box for Word Editing */
      .screenshot-box {
        border: 2pt dashed #002D62;
        background-color: #f8fafc;
        padding: 18px;
        text-align: center;
        margin: 16px 0;
        border-radius: 6px;
      }
      .screenshot-box-title {
        font-size: 10pt;
        font-weight: bold;
        color: #002D62;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .screenshot-box-desc {
        font-size: 9pt;
        color: #64748b;
        font-style: italic;
      }

      /* Badges */
      .badge-jde {
        background-color: #002D62;
        color: #ffffff;
        padding: 2px 6px;
        font-weight: bold;
        font-family: monospace;
        font-size: 8.5pt;
      }
    </style>
  </head>
  <body>

    <!-- ENCABEZADO NORMATIVO ISO 9001:2015 -->
    <table class="iso-header-table">
      <tr>
        <td class="iso-logo-cell">
          <strong style="font-size: 11pt; color: #002D62;">ASSETFLOW S.A.</strong><br />
          <span style="font-size: 7.5pt; color: #475569; font-weight: bold;">CORPORACIÓN DE SEGUROS</span>
        </td>
        <td class="iso-title-cell">
          <div style="font-size: 8pt; font-weight: bold; color: #107C41; text-transform: uppercase;">
            SISTEMA DE GESTIÓN DE LA CALIDAD - ISO 9001:2015
          </div>
          <div style="font-size: 11pt; font-weight: bold; color: #002D62; text-transform: uppercase; margin-top: 2px;">
            ${title}
          </div>
        </td>
        <td class="iso-meta-cell">
          <strong>CÓDIGO:</strong> ${documentCode}<br />
          <strong>VERSIÓN:</strong> ${version}<br />
          <strong>VIGENCIA:</strong> ${currentDate}<br />
          <strong>ESTADO:</strong> CONTROLADO ISO
        </td>
      </tr>
    </table>

    <!-- MATRIZ DE RESPONSABILIDADES Y FIRMAS DE APROBACIÓN ISO 9001 -->
    <table class="iso-approval-table">
      <thead>
        <tr>
          <th style="width: 33%;">ELABORADO POR</th>
          <th style="width: 33%;">REVISADO POR</th>
          <th style="width: 34%;">APROBADO POR</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Cargo:</strong> Especialista SGC &amp; AssetFlow ERP<br />
            <strong>Nombre:</strong> Equipo de Gestión Inmobiliaria<br />
            <strong>Firma:</strong> [Aprobado Electrónicamente]
          </td>
          <td>
            <strong>Cargo:</strong> Jefe de Control Interno / Compliance<br />
            <strong>Nombre:</strong> Departamento de Auditoría AssetFlow<br />
            <strong>Firma:</strong> [Aprobado Electrónicamente]
          </td>
          <td>
            <strong>Cargo:</strong> Gerente Inmobiliario &amp; Calidad<br />
            <strong>Nombre:</strong> Gerencia General AssetFlow S.A.<br />
            <strong>Firma:</strong> [Aprobado Electrónicamente]
          </td>
        </tr>
      </tbody>
    </table>

    ${htmlBodyContent}

    <br /><hr /><br />
    <p style="font-size: 8.5pt; color: #64748b; text-align: center;">
      <strong>ASSETFLOW S.A. - CORPORACIÓN DE SEGUROS E INVERSIONES INMOBILIARIAS</strong> • Documento Controlado bajo la Norma ISO 9001:2015 Cláusula 7.5.<br />
      Prohibida la reproducción total o parcial sin autorización expresa de la Dirección de Gestión de la Calidad.
    </p>
  </body>
</html>`;

  const blob = new Blob(['\ufeff', wordHtml], {
    type: 'application/msword;charset=utf-8'
  });

  saveAs(blob, `${fileName}.doc`);
};

// ============================================================================
// 1. MANUAL DE ENTRENAMIENTO INTEGRAL Y AUDITORÍA CONTABLE (SGC-MAN-ERP-001)
// ============================================================================
export const generateGeneralSystemManualWord = () => {
  const content = `
    <!-- ÍNDICE GENERAL DEL MANUAL ERP (ISO 9001:2015 CLÁUSULA 7.5) -->
    <div style="margin-bottom: 25px; page-break-after: always;">
      <h2 style="font-size: 13pt; color: #002D62; border-bottom: 2px solid #002D62; padding-bottom: 4px; text-transform: uppercase; margin-bottom: 12px; font-weight: bold;">
        ÍNDICE GENERAL DE MATERIAS Y PROCEDIMIENTOS OPERATIVOS
      </h2>
      <table class="iso-table" style="width: 100%; border-collapse: collapse; font-size: 9pt;">
        <thead>
          <tr style="background-color: #002D62; color: #ffffff;">
            <th style="width: 15%; text-align: center;">Capítulo</th>
            <th style="width: 50%;">Materia / Procedimiento Estandarizado</th>
            <th style="width: 35%;">Estándar de Control &amp; Auditoría</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #002D62;">SECCIÓN 1</td>
            <td><strong>Objetivo del Sistema de Gestión</strong></td>
            <td>Marco normativo ISO 9001:2015 y alcance patrimonial Mutucar</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #002D62;">SECCIÓN 2</td>
            <td><strong>Alcance y Campo de Aplicación</strong></td>
            <td>Ciclo de abastecimiento, contratos y bitácora F4209</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #002D62;">SECCIÓN 3</td>
            <td><strong>Documentos de Referencia y Leyes Aplicables</strong></td>
            <td>Ley 18.101, D.L. 825, Ley 21.133, Ley UAF 19.913 y NIST FIPS 180-4</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #002D62;">SECCIÓN 4</td>
            <td><strong>Términos, Definiciones y Glosario JDE 9.11</strong></td>
            <td>Módulos P43081, P43008, P43280, F4209, P48201 y R15011Z1I</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #002D62;">SECCIÓN 5</td>
            <td><strong>Matriz de Responsabilidades y Segregación de Funciones (RACI)</strong></td>
            <td>Control SoD entre Administrador, Jefatura, Analistas y Auditoría</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #002D62;">SECCIÓN 6</td>
            <td><strong>Desarrollo de Procesos y Flujogramas Operativos</strong></td>
            <td>Circuitos de aprobación de 7 puntos y sellado SHA-256</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #002D62;">SECCIÓN 7</td>
            <td><strong>Registros y Evidencias de Calidad</strong></td>
            <td>Comprobantes contables, actas de recepción y contratos</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #002D62;">SECCIÓN 8</td>
            <td><strong>Procedimiento Operativo: Reajuste Anual por IPC (R15130)</strong></td>
            <td>Cálculo entero Math.round sin decimales y cuadratura CMF B.13</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #002D62;">SECCIÓN 9</td>
            <td><strong>Procedimiento Operativo: Consulta Catastral Jerárquica y Drill-Down (P1501)</strong></td>
            <td>Exploración de 22.000+ unidades en 19 conjuntos, acordeón y QBE</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #002D62;">SECCIÓN 10</td>
            <td><strong>Procedimiento de Resiliencia Operacional Offline y Auto-Aprovisionamiento</strong></td>
            <td>Continuidad en red LAN sin Internet y creación de 32 tablas JDE</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #002D62;">SECCIÓN 11</td>
            <td><strong>Historial de Cambios y Control de Revisiones (Versión 7.0)</strong></td>
            <td>Trazabilidad de modificaciones por Jefatura de Control Interno</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h1>1. OBJETIVO</h1>
    <p>
      Establecer el marco operativo, contable, tributario y de auditoría criptográfica estandarizado conforme a la norma <strong>ISO 9001:2015</strong> para la administración integral de la cartera inmobiliaria y el ciclo de abastecimiento de <strong>ASSETFLOW S.A. - Corporación de Seguros</strong> a través del ecosistema <strong>AssetFlow Enterprise ERP (Arquitectura AssetFlow Enterprise 9.11)</strong>.
    </p>

    <h1>2. ALCANCE Y CAMPO DE APLICACIÓN</h1>
    <p>
      El presente manual aplica a la totalidad de las operaciones de arranque optimizado del servidor de aplicaciones (<strong>JAS FastBoot &lt;15ms</strong>), ingesta de inmuebles (<code>R15011Z1I</code>), calificación de postulantes (<code>P15013</code>), gestión contractual (<code>P15012</code>), auditoría de cobros (<code>P1501HA</code>), recepción física (<code>P1501RV</code>), liquidación de garantías (<code>P1540</code>), órdenes de trabajo y mantención (<code>P48201</code>), motor de aprobaciones jerárquicas (<code>P43081 / P43008 / P43280</code>) y sellado criptográfico inmutable <code>SHA-256</code> sobre la bitácora <code>F4209</code> y la Bóveda Digital (<code>F980011D</code>).
    </p>

    <h1>3. DOCUMENTOS DE REFERENCIA Y NORMATIVA ASOCIADA</h1>
    <ul>
      <li><strong>Norma Internacional ISO 9001:2015:</strong> Cláusulas 7.5 (Información Documentada), 8.1 (Control Operativo) y 9.2 (Auditoría Interna).</li>
      <li><strong>Ley N° 18.101 &amp; D.L. N° 825 (Art. 8° letra g):</strong> Normas sobre arrendamiento de predios urbanos y devengo de IVA (19%) en inmuebles amoblados o comerciales.</li>
      <li><strong>Ley N° 21.133 &amp; D.L. N° 824 (Art. 42 N° 2):</strong> Retención legal de impuesto de segunda categoría (15,25%) en Boletas de Honorarios Electrónicas.</li>
      <li><strong>Ley N° 19.913 (UAF), Ley N° 20.393 y Ley N° 21.595:</strong> Prevención del Lavado de Activos y Responsabilidad Penal de las Personas Jurídicas (Delitos Económicos).</li>
      <li><strong>Estándar Criptográfico NIST FIPS PUB 180-4 &amp; Ley N° 19.799:</strong> Sellado de bloques mediante funciones hash <code>SHA-256</code> (Web Crypto API) y Firma Electrónica / No-Repudio.</li>
    </ul>

    <h1>4. TÉRMINOS, DEFINICIONES Y GLOSARIO DE PROGRAMAS ERP (JDE 9.11)</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Código ERP</th>
          <th>Nombre del Módulo</th>
          <th>Definición Operativa y Técnica</th>
          <th>Fast Path / Acceso Directo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="badge-jde">P43081</span></td>
          <td>Aprobación de Órdenes (OT / OC)</td>
          <td>Consola ejecutiva de liberación y rechazo con auditoría de 7 puntos (<code>W43081C</code>), menú contextual forense (clic derecho) y exportación Excel con hora corta <code>HH:mm</code>.</td>
          <td>Fast Path: <code>P43081</code> / Menú Aprobaciones</td>
        </tr>
        <tr>
          <td><span class="badge-jde">P43008</span></td>
          <td>Rutas y Umbrales de Aprobación</td>
          <td>Configuración de tramos monetarios en CLP y reglas de liberación automática para órdenes bajo el umbral mínimo (<em>Auto-Approve</em>).</td>
          <td>Pestaña Rutas en <code>P43081</code></td>
        </tr>
        <tr>
          <td><span class="badge-jde">P43280</span></td>
          <td>Delegación de Autoridad (Suplencia)</td>
          <td>Redirección temporal de flujos de firma por ausencia o vacaciones con control de conflicto de interés (<em>Segregation of Duties</em>).</td>
          <td>Pestaña Delegación en <code>P43081</code></td>
        </tr>
        <tr>
          <td><span class="badge-jde">F4209</span></td>
          <td>Ledger Criptográfico de Aprobaciones</td>
          <td>Bitácora inmutable encadenada mediante <code>SHA-256</code> (<code>crypto.subtle</code>) y cálculo de <strong>Merkle Root</strong> bajo gobernanza estricta <em>Append-Only</em> (Solo Lectura).</td>
          <td>Pestaña Bitácora F4209 / Verificador Blockchain</td>
        </tr>
        <tr>
          <td><span class="badge-jde">P48201</span></td>
          <td>Centro de Órdenes de Trabajo (OT)</td>
          <td>Gestión de mantenimiento con campos blindados (<code>category</code>, <code>specialty</code>, <code>associatedInvoice</code>) y cálculo dual IVA 19% vs. Retención 15,25%.</td>
          <td>Menú -&gt; Operaciones -&gt; Centro de OT</td>
        </tr>
        <tr>
          <td><span class="badge-jde">R15011Z1I</span></td>
          <td>Ingesta y Auditoría de Activos</td>
          <td>Homologación y validación contable de planillas masivas Excel de bienes raíces (1.849 activos).</td>
          <td>Menú -&gt; Real Estate -&gt; Ingesta de Activos</td>
        </tr>
        <tr>
          <td><span class="badge-jde">P15013</span></td>
          <td>Scoring &amp; Evaluación de Postulantes</td>
          <td>Análisis crediticio multivariable, capacidad de pago y calificación de candidatos a arriendo.</td>
          <td>Menú -&gt; Real Estate -&gt; Evaluación de Postulantes</td>
        </tr>
        <tr>
          <td><span class="badge-jde">P15012</span></td>
          <td>Gestión de Contratos de Arriendo</td>
          <td>Emisión de contratos, cláusulas de reajustabilidad UF/IPC y vigencia de arrendamiento.</td>
          <td>Menú -&gt; Real Estate -&gt; Gestión de Contratos</td>
        </tr>
        <tr>
          <td><span class="badge-jde">P1501HA</span></td>
          <td>Historial &amp; Comportamiento de Pago</td>
          <td><strong>Módulo normado SGC</strong> para auditoría de morosidad, cobros, cartolas y ficha de cumplimiento.</td>
          <td>Fast Path: <code>P1501HA</code> / <code>historial</code></td>
        </tr>
        <tr>
          <td><span class="badge-jde">P1501RV</span></td>
          <td>Revisión Física de Unidades</td>
          <td>Levantamiento de inventario físico y actas de entrega/recepción de propiedades.</td>
          <td>Fast Path: <code>P1501RV</code> / <code>revision</code></td>
        </tr>
        <tr>
          <td><span class="badge-jde">P1540</span></td>
          <td>Liquidación de Garantías de Arriendo</td>
          <td>Cálculo de finiquitos, deducción de reparaciones y devolución de garantías.</td>
          <td>Fast Path: <code>P1540</code> / <code>garantias</code></td>
        </tr>
        <tr>
          <td><span class="badge-jde">CMP-PP-01</span></td>
          <td>Debida Diligencia &amp; Prevención UAF</td>
          <td>Cotejo en listas PEP/OFAC y evaluación de cumplimiento anticorrupción.</td>
          <td>Menú -&gt; Cumplimiento -&gt; Debida Diligencia</td>
        </tr>
        <tr>
        <tr>
          <td><span class="badge-jde">F980011D</span></td>
          <td>Bóveda Digital &amp; Verificador SHA-256</td>
          <td>Repositorio forense con verificador de cadena de bloques en vivo y descarga del Trabajo Final de Máster (TFM) en formato nativo <code>.DOCX</code>.</td>
          <td>Menú -&gt; Documentación -&gt; Bóveda Digital</td>
        </tr>
        <tr>
          <td><span class="badge-jde">R09322</span></td>
          <td>Informe B.4 CMF (Bienes Raíces &amp; Inversiones)</td>
          <td>Reporte mensual obligatorio bajo Circular CMF N° 1.835 con separación estricta de Terreno (No Depreciable) y Construcción (NCG 316), paginación FDA de alto rendimiento y diagnósticos analíticos.</td>
          <td>Menú -&gt; Informes de Cierre -&gt; Informe B.4 CMF</td>
        </tr>
        <tr>
          <td><span class="badge-jde">R09323</span></td>
          <td>Nota 14: Propiedades de Inversión (NIC 40 / NIIF 13)</td>
          <td>Emisión trimestral de los 4 cuadros oficiales CMF/FECU, Roll-Forward comparativo de 2 ejercicios, cálculo del NOI (NIC 40 §75f) y exportación oficial a Excel (.xlsx) con 5 pestañas normadas.</td>
          <td>Menú -&gt; Informes de Cierre -&gt; Nota 14 CMF</td>
        </tr>
        <tr>
          <td><span class="badge-jde">R15130</span></td>
          <td>Reajuste Anual de Cánones por IPC (Batch Indexation)</td>
          <td>Ejecución masiva de reajuste anual por IPC/INE con redondeo entero sin decimales (Math.round), exportación obligatoria de planilla Excel (.xlsx) de auditoría y alimentación automática del Informe CMF B.13.</td>
          <td>Menú -&gt; Real Estate -&gt; Contratos de Arriendo -&gt; [Reajuste Anual IPC]</td>
        </tr>
      </tbody>
    </table>

    <div class="warning-box">
      <strong>DIRECTIVA ISO 9001 SOBRE INMUTABILIDAD CRIPTOGRÁFICA (F4209) Y CONCILIACIÓN CMF:</strong> La bitácora <strong>F4209</strong> opera bajo el principio contable y criptográfico de <strong>Gobernanza Append-Only (Solo Lectura • No-Repudio)</strong>. Asimismo, conforme a la Circular 1.835 y NCG 316, los valores informados en la <strong>Nota 14 al cierre de cada trimestre (Marzo, Junio, Septiembre y Diciembre)</strong> deben coincidir matemáticamente al peso con los saldos informados en el <strong>Informe B.4</strong> del mes respectivo.
    </div>

    <h1>5. MATRIZ DE RESPONSABILIDADES (RACI)</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Proceso / Etapa</th>
          <th>Ejecutivo / Analista</th>
          <th>Jefe de Operaciones</th>
          <th>Compliance / Auditoría</th>
          <th>Gerencia Finanzas / Comité</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Ingesta de Activos (R15011Z1I)</td>
          <td><strong>Responsable (R)</strong></td>
          <td><strong>Aprobador (A)</strong></td>
          <td>Consultado (C)</td>
          <td>Informado (I)</td>
        </tr>
        <tr>
          <td>Evaluación de Postulantes (P15013)</td>
          <td><strong>Responsable (R)</strong></td>
          <td>Consultado (C)</td>
          <td><strong>Aprobador (A)</strong></td>
          <td>Informado (I)</td>
        </tr>
        <tr>
          <td>Aprobación Jerárquica OT/OC (P43081)</td>
          <td>Elabora OT (R)</td>
          <td>Aprueba Nivel 1-2 (A)</td>
          <td>Verifica Hash F4209 (C)</td>
          <td><strong>Aprueba Nivel 3-4 (A)</strong></td>
        </tr>
        <tr>
          <td>Auditoría de Pagos (P1501HA)</td>
          <td>Consultado (C)</td>
          <td><strong>Responsable (R)</strong></td>
          <td>Informado (I)</td>
          <td><strong>Aprobador (A)</strong></td>
        </tr>
        <tr>
          <td>Liquidación de Garantía (P1540)</td>
          <td><strong>Responsable (R)</strong></td>
          <td>Consultado (C)</td>
          <td>Informado (I)</td>
          <td><strong>Aprobador (A)</strong></td>
        </tr>
        <tr>
          <td>Informe Mensual B.4 CMF (R09322)</td>
          <td><strong>Responsable (R)</strong></td>
          <td>Revisa NCG 316 (C)</td>
          <td>Auditoría Saldo (C)</td>
          <td><strong>Aprobador / Envío CMF (A)</strong></td>
        </tr>
        <tr>
          <td>Nota 14 Estados Financieros (R09323)</td>
          <td>Genera Roll-Forward (R)</td>
          <td>Valida NOI (C)</td>
          <td>Concilia con B.4 (C)</td>
          <td><strong>Aprobador Estados Financieros (A)</strong></td>
        </tr>
      </tbody>
    </table>

    <h1>6. DESARROLLO DEL PROCEDIMIENTO Y MÓDULOS OPERATIVOS</h1>
    <p>A continuación se detallan las instrucciones operativas estandarizadas con marcadores para capturas de pantalla:</p>

    <h2>6.1 Arranque Optimizado JAS FastBoot y Vista General del Sistema</h2>
    <p>
      El motor de inicio utiliza una arquitectura <strong>Zero-Blocking JAS FastBoot</strong> que carga de forma instantánea el estado local verificable y sincroniza en segundo plano la base de datos distribuida, eliminando tiempos muertos de espera.
    </p>
    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: DASHBOARD PRINCIPAL ASSETFLOW ERP JDE 9.11]</div>
      <div class="screenshot-box-desc">Instrucción: Inserte una captura de pantalla del tablero principal mostrando los indicadores clave de desempeño (KPI) y la barra superior EnterpriseOne.</div>
    </div>

    <h2>6.2 Operación del Módulo de Aprobaciones P43081, Menú Contextual y Excel (HH:mm)</h2>
    <p>
      En la grilla de <code>P43081</code>, el usuario puede hacer <strong>clic derecho sobre cualquier fila</strong> en las 4 vistas (Bandeja de Pendientes, Rutas <code>P43008</code>, Delegaciones <code>P43280</code> y Bitácora <code>F4209</code>) para desplegar el <strong>Menú Contextual JDE (Row Exit)</strong>. Al exportar la bitácora <code>F4209</code> a Excel (<code>.xlsx</code>), el motor formatea automáticamente la columna <code>timestamp</code> en formato de <strong>Hora Corta (<code>HH:mm</code>, ej. <code>17:08</code>)</strong>, impidiendo la aparición de notación científica en Microsoft Excel.
    </p>
    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: MÓDULO P43081 CON MENÚ CONTEXTUAL Y VERIFICADOR SHA-256]</div>
      <div class="screenshot-box-desc">Instrucción: Inserte una captura del módulo P43081 mostrando el checklist de 7 puntos (W43081C) y el modal del Verificador Criptográfico de Cadena de Bloques.</div>
    </div>

    <h2>6.3 Operación del Módulo P1501HA (Historial de Pagos)</h2>
    <p>
      El usuario debe verificar la <strong>Ficha de Cumplimiento Contractual</strong> y utilizar los botones de exportación <code>Descargar Excel (.xlsx)</code> y <code>Descargar Cartola PDF</code> para respaldar los análisis financieros.
    </p>
    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: MÓDULO HISTORIAL DE PAGOS P1501HA]</div>
      <div class="screenshot-box-desc">Instrucción: Inserte una captura del módulo P1501HA con la tabla de cobros, estado de mora y los botones de exportación.</div>
    </div>

    <h2>6.4 Operación del Informe B.4 CMF (R09322) y Separación NCG 316 (Terreno vs. Construcción)</h2>
    <p>
      El programa <strong>R09322</strong> genera la declaración mensual obligatoria de Bienes Raíces e Inversiones Inmobiliarias exigida por la CMF (Circular 1.835). Conforme a la <strong>Norma de Carácter General N° 316</strong>, el sistema separa analíticamente el valor del <strong>Terreno (No Depreciable)</strong> y de la <strong>Construcción (Depreciable)</strong>. El módulo opera con <strong>Paginación FDA (25/50/100/Todas)</strong> que optimiza los recursos de memoria y agiliza la visualización de la cartera.
    </p>
    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: INFORME B.4 CMF (R09322) CON SEPARACIÓN TERRENO/CONSTRUCCIÓN NCG 316]</div>
      <div class="screenshot-box-desc">Instrucción: Inserte una captura del Informe B.4 mostrando la grilla paginada, la barra de filtros por compañía y el botón de exportación oficial CMF.</div>
    </div>

    <h2>6.5 Operación de Nota 14: Propiedades de Inversión (R09323 - NIC 40 / NIIF 13)</h2>
    <p>
      El módulo <strong>R09323</strong> consolida trimestralmente las revelaciones obligatorias de balance para los Estados Financieros:
    </p>
    <ul>
      <li><strong>Cuadro 1 (Roll-Forward):</strong> Conciliación de movimientos entre inicio y cierre del ejercicio desglosado por Terrenos, Edificios, Obras en Curso y Total, en formato comparativo de 2 años.</li>
      <li><strong>Cuadro 2 (NOI):</strong> Ingresos por arriendos operativos y gastos directos clasificados entre inmuebles ocupados vs. vacantes (NIC 40 §75f).</li>
      <li><strong>Cuadro 3 (Nómina Analítica):</strong> Detalle individualizado de cada propiedad con valores razonables según tasadores registrados en la CMF y canon de arrendamiento.</li>
      <li><strong>Cuadro 4 (Gravámenes):</strong> Registro de hipotecas y garantías que respaldan Reservas Técnicas de Seguros.</li>
    </ul>
    <p>
      La exportación genera un archivo <strong>Excel (.xlsx) multicapa</strong> con 5 pestañas formuladas y listas para su presentación a auditores externos y al regulador.
    </p>
    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: MÓDULO NOTA 14 (R09323) Y EMISIÓN EXCEL MULTIPESTAÑA]</div>
      <div class="screenshot-box-desc">Instrucción: Inserte una captura del módulo de Nota 14 mostrando los KPIs de cartera, la matriz de Roll-Forward y la pestaña de metodología técnica.</div>
    </div>

    <h1>7. CONTROL DE REGISTROS DE CALIDAD (ISO 9001)</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Código Registro</th>
          <th>Nombre del Registro de Calidad</th>
          <th>Lugar de Almacenamiento</th>
          <th>Tiempo Retención</th>
          <th>Responsable Custodia</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>REG-SGC-01</td>
          <td>Ficha de Ingesta de Inmuebles (R15011Z1I)</td>
          <td>Bóveda F980011D / Firestore</td>
          <td>5 Años</td>
          <td>Administrador del Sistema</td>
        </tr>
        <tr>
          <td>REG-SGC-02</td>
          <td>Cartola de Pagos (P1501HA)</td>
          <td>Bóveda F980011D / PDF</td>
          <td>10 Años</td>
          <td>Tesorería / Control Interno</td>
        </tr>
        <tr>
          <td>REG-SGC-03</td>
          <td>Acta de Recepción Física (P1501RV)</td>
          <td>Bóveda Digital</td>
          <td>5 Años</td>
          <td>Jefe de Operaciones</td>
        </tr>
        <tr>
          <td>REG-SGC-04</td>
          <td>Bitácora Criptográfica de Aprobaciones (F4209)</td>
          <td>Ledger SHA-256 Append-Only / Excel HH:mm</td>
          <td>Permanente / Inmutable</td>
          <td>Oficial de Cumplimiento / Auditoría Forense</td>
        </tr>
      </tbody>
    </table>

    <h1>8. PROCEDIMIENTO OPERATIVO ESTANDARIZADO: REAJUSTE ANUAL DE CÁNONES POR IPC (CÓDIGO SGC-INS-REA-001)</h1>
    <p>
      El presente procedimiento estandariza las instrucciones paso por paso para la ejecución del reajuste anual de cánones de arriendo bajo el programa por lote <strong>R15130 (Batch Indexation)</strong>, mitigando cualquier riesgo de error de punto flotante informático y garantizando la consistencia absoluta de las cifras con el Catastro CMF B.13.
    </p>

    <div class="note-box">
      <strong>REGLA DE PRECISIÓN ARITMÉTICA (IEEE-754):</strong> Para evitar discrepancias de redondeo o errores de coma flotante en pesos chilenos ($ CLP), todos los cálculos de reajuste se procesan mediante la función <code>Math.round(canonInicial * (1 + tasaIPC / 100))</code>. Los valores resultantes se expresan estrictamente en números enteros sin decimales en la moneda oficial correspondiente.
    </div>

    <h3>INSTRUCCIONES PASO A PASO PARA EL OPERADOR:</h3>
    <ol>
      <li><strong>Paso 1: Acceso al Módulo de Contratos:</strong> Ingrese a la plataforma AssetFlow ERP y diríjase en el menú principal a <em>Real Estate -&gt; Contratos de Arriendo (P15012)</em>.</li>
      <li><strong>Paso 2: Apertura de la Consola de Reajustes R15130:</strong> En la barra superior de acciones, presione el botón azul marino <strong>[Reajuste Anual IPC (R15130)]</strong>. Se desplegará la consola de ejecución por lote.</li>
      <li><strong>Paso 3: Parametrización del IPC Oficial del INE:</strong> Ingrese en el campo numérico superior el porcentaje de variación acumulada del IPC de los últimos 12 meses informado oficialmente por el Instituto Nacional de Estadísticas (INE) para el período de corte (por ejemplo: <code>4.2%</code>).</li>
      <li><strong>Paso 4: Auditoría y Selección de Contratos:</strong> El sistema pre-cargará la totalidad de los contratos vigentes, calculando en tiempo real el canon inicial, el incremento monetario y el nuevo canon final reajustado. Revise la lista y desmarque aquellos contratos que mantengan congelamiento voluntario o convenios bilaterales específicos.</li>
      <li><strong>Paso 5: Ejecución Masiva y Emisión del Reporte XLSX:</strong> Presione el botón <strong>[Ejecutar Reajustes Masivos &amp; Descargar Excel (XLSX)]</strong>. El sistema procesará el lote, actualizará la base de datos de contratos y de propiedades, y descargará automáticamente a su estación de trabajo el archivo oficial tabulado <code>Auditoria_Reajuste_Anual_Canones_AAAAMMDD.xlsx</code>.</li>
      <li><strong>Paso 6: Cuadratura y Consolidación CMF B.13:</strong> Diríjase al botón <em>[Informe B13 (.xlsx)]</em>. Verifique que la columna de canon mensual de arriendo consolidado y los tramos de morosidad reflejen de forma inmediata los nuevos valores enteros actualizados sin necesidad de reingreso de datos.</li>
      <li><strong>Paso 7: Notificación Formal al Arrendatario:</strong> Utilice el botón <em>[Enviar Cobros Masivos]</em> para emitir los comprobantes de pago de arriendo con el nuevo canon reajustado y despachar las cartas informativas certificadas por correo electrónico.</li>
    </ol>

    <h1>8. PROCEDIMIENTO DE DESPLIEGUE EN SERVIDORES EMPRESARIALES (ON-PREMISE) &amp; BÓVEDA DIGITAL</h1>
    <p>
      Para garantizar la soberanía de los datos patrimoniales y dar cumplimiento al Reglamento Europeo DORA (UE 2022/2554) y la Ley N° 21.719, el sistema AssetFlow ERP cuenta con empaquetado corporativo para operar directamente en servidores propios de la compañía:
    </p>
    <ul>
      <li><strong>Opción A - Contenedores Docker (Recomendado):</strong> Ejecute <code>docker compose up -d --build</code> en la carpeta <code>/opt/assetflow</code> para compilar y levantar el servicio en el puerto 3000 con reinicio automático (<code>unless-stopped</code>) y healthcheck continuo.</li>
      <li><strong>Opción B - Despliegue Nativo Linux:</strong> Ejecute el script automatizado <code>./deploy.sh</code> para instalar dependencias, compilar con Vite y activar el clúster de procesos con PM2 (<code>ecosystem.config.cjs</code>).</li>
      <li><strong>Opción C - Windows Server:</strong> Ejecute <code>deploy-windows.bat</code> como Administrador para entornos Microsoft Windows Server 2019/2022.</li>
      <li><strong>Proxy Inverso y SSL Seguro (HTTPS):</strong> Conecte el dominio corporativo mediante Nginx (<code>nginx.conf</code>) y emita un certificado SSL gratuito con Let&apos;s Encrypt (<code>sudo certbot --nginx -d erp.tuempresa.cl</code>), manteniendo el puerto 3000 protegido tras el firewall perimetral UFW.</li>
      <li><strong>Manual Técnico IT Dedicado:</strong> El procedimiento exhaustivo paso a paso para el personal de infraestructura se encuentra custodiado en la Bóveda de Documentos Digitales (<code>P986110D</code>) bajo el código normado <strong>SGC-IT-MAN-008</strong>, disponible para descarga en Microsoft Word (.docx) y PDF vectorial.</li>
    </ul>

    <h1>9. PROCEDIMIENTO OPERATIVO: CONSULTA CATASTRAL JERÁRQUICA Y NAVEGACIÓN DRILL-DOWN (MAESTRO P1501)</h1>
    <p>
      Para la fiscalización y auditoría de carteras inmobiliarias masivas con más de 22.000 unidades en 19 condominios o conjuntos habitacionales (ej. Montesol II con 6.546 unidades, Jardines Norte V con 3.095 unidades), el personal de Control Interno dispone del <strong>Asistente de Consulta con Navegación Jerárquica Drill-Down</strong>:
    </p>
    <ol>
      <li><strong>Apertura del Asistente Relacional:</strong> En el Centro de Solicitudes y Requerimientos (<code>P48201</code>), presione el botón de consulta catastral <em>[🏢 Por Condominios / Conjuntos]</em> o presione la tecla <code>F4</code> sobre el campo Condominio.</li>
      <li><strong>Modo Acordeón In-line:</strong> En la tabla de condominios, haga clic sobre la insignia morada de unidades (ej: <code>[3095 unidades ▼]</code>) o en el botón <strong>[Desglosar]</strong>. La fila se expandirá inmediatamente mostrando una sub-grilla con las unidades del condominio, su código único, dirección y accesos directos para <em>[Elegir Unidad]</em> o <em>[Editar]</em> parámetros.</li>
      <li><strong>Modo Vista Completa Focalizada (Deep Drill-Down):</strong> Si desea auditar el universo completo del conjunto habitacional, presione <em>"Desglosar unidades (Drill-Down) →"</em>. La ventana transicionará a una vista exclusiva con migas de pan <code>← Volver a Condominios</code>, ficha geográfica del conjunto, contador de unidades y un buscador contextual dinámico (<code>BUSCAR UNIDAD EN [CONDOMINIO]...</code>).</li>
      <li><strong>Selección y Filtro Cruzado QBE:</strong> Al presionar <strong>[Elegir Unidad]</strong> en cualquier propiedad, el sistema inyecta automáticamente el condominio y la dirección en la barra Query-By-Example (QBE) de la grilla principal, permitiendo auditar el expediente de mantención y reclamos de esa vivienda específica en un solo paso.</li>
    </ol>

    <h1>10. PROCEDIMIENTO DE RESILIENCIA OPERACIONAL OFFLINE (LAN) Y AUTO-APROVISIONAMIENTO DE TABLAS</h1>
    <p>
      Conforme a los estándares de Continuidad del Negocio (ISO 22301) y Resiliencia Operativa Digital (Reglamento DORA UE 2022/2554), el sistema garantiza que la operación no se detenga ante incidentes de infraestructura:
    </p>
    <ul>
      <li><strong>Comportamiento ante Caída de Conexión a Internet:</strong> Al estar desplegado en la red interna (LAN), los puestos de trabajo continúan operando con normalidad. Se pueden registrar contratos, crear y aprobar órdenes de trabajo, calcular retenciones tributarias y generar comprobantes contables sin interrupciones. La firma criptográfica SHA-256 opera 100% en local mediante <code>Web Crypto API</code>. Únicamente el envío masivo de correos y el OCR de inteligencia artificial quedan en cola de despacho hasta que se restablezca la conectividad externa.</li>
      <li><strong>Auto-Aprovisionamiento en Frío (Cold Start):</strong> Al instalar el sistema en un servidor nuevo, el motor relacional detecta la ausencia de estructuras y crea de forma 100% autónoma las 32 tablas maestras del estándar Enterprise (<code>F0101</code>, <code>F0401</code>, <code>F0030</code>, <code>F4801</code>, <code>F4209</code>, <code>F15012</code>, <code>F0911</code>), inyectando el catálogo de propiedades y contratos sin necesidad de ejecutar scripts SQL manuales.</li>
    </ul>

    <h1>11. HISTORIAL DE CAMBIOS Y CONTROL DE REVISIONES</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Versión</th>
          <th>Fecha Modificación</th>
          <th>Descripción de Cambios</th>
          <th>Elaborado / Modificado por</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1.0</td>
          <td>10/01/2025</td>
          <td>Emisión inicial de manual para sistema legado.</td>
          <td>Control Interno AssetFlow</td>
        </tr>
        <tr>
          <td>2.0</td>
          <td>15/06/2025</td>
          <td>Incorporación de módulo de Scoring crediticio.</td>
          <td>Dpto. Inmobiliario</td>
        </tr>
        <tr>
          <td>3.0</td>
          <td>15/01/2026</td>
          <td>Actualización normativa ISO 9001:2015, integración estándar P1501HA y exportación Word.</td>
          <td>Comité SGC AssetFlow S.A.</td>
        </tr>
        <tr>
          <td>4.0</td>
          <td>16/10/2026</td>
          <td>Incorporación de motor de aprobaciones P43081 (7 puntos W43081C), menú contextual en las 4 grillas, exportación Excel con hora corta HH:mm y Verificador Criptográfico SHA-256 Append-Only (sin restauración histórica).</td>
          <td>Arquitectura Enterprise 9.11 &amp; Comité SGC</td>
        </tr>
        <tr>
          <td>5.0</td>
          <td>02/11/2026</td>
          <td>Incorporación de procedimiento de Reajuste Anual de Cánones por IPC (R15130), mitigación de errores de punto flotante sin decimales, emisión obligatoria de planilla Excel XLSX de auditoría y cuadratura CMF B.13.</td>
          <td>Control Interno &amp; Arquitectura RE-15</td>
        </tr>
        <tr>
          <td>6.0</td>
          <td>03/11/2026</td>
          <td>Incorporación de procedimiento de empaquetado y puesta en marcha en servidores corporativos (Docker Compose, PM2, deploy.sh, deploy-windows.bat, Nginx SSL y Manual Técnico IT SGC-IT-MAN-008 en Bóveda Digital).</td>
          <td>Infraestructura &amp; Control Interno (samaheim@gmail.com)</td>
        </tr>
        <tr>
          <td>7.0</td>
          <td>05/11/2026</td>
          <td>Incorporación de Asistente de Consulta Catastral con Navegación Jerárquica Drill-Down en Maestro de Condominios y Propiedades (doble vista: acordeón in-line y pantalla completa focalizada), protocolo de resiliencia operacional Offline en red LAN ante caídas de enlace, y auto-aprovisionamiento autónomo de las 32 tablas Enterprise sin intervención DBA.</td>
          <td>Control Interno &amp; Transformación Digital (samaheim@gmail.com)</td>
        </tr>
      </tbody>
    </table>
  `;

  downloadWordDocFromHtml(
    'Manual de Entrenamiento Integral AssetFlow ERP (ISO 9001)',
    content,
    'Manual_Entrenamiento_Integral_AssetFlow_JDE_ISO9001',
    'SGC-MAN-ERP-001',
    'Versión 7.0 / 2026'
  );
};

// ============================================================================
// 2. INSTRUCTIVO OPERATIVO DEL PORTAL DE ARRENDATARIOS (SGC-INS-POR-002)
// ============================================================================
export const generateTenantPortalManualWord = () => {
  const content = `
    <h1>1. OBJETIVO</h1>
    <p>
      Estandarizar las instrucciones operativas para el uso del <strong>Portal de Arrendatarios de ASSETFLOW S.A.</strong> conforme a la norma <strong>ISO 9001:2015</strong>, asegurando que los usuarios arrendatarios consulten sus estados de cuenta, descarguen certificados y registren solicitudes de atención con total transparencia.
    </p>

    <h1>2. ALCANCE Y CAMPO DE APLICACIÓN</h1>
    <p>
      Este instructivo aplica a todos los arrendatarios con contratos vigentes sobre inmuebles administrados por AssetFlow S.A. y al personal de atención al cliente de la plataforma digital.
    </p>

    <h1>3. DOCUMENTOS DE REFERENCIA Y NORMATIVA ASOCIADA</h1>
    <ul>
      <li><strong>Norma ISO 9001:2015:</strong> Requisito 8.2.1 (Comunicación con el Cliente).</li>
      <li><strong>Ley N° 19.496:</strong> Sobre Protección de los Derechos de los Consumidores.</li>
      <li><strong>Contrato de Arrendamiento AssetFlow S.A.:</strong> Cláusulas de Pago y Mantención.</li>
    </ul>

    <h1>4. TÉRMINOS, DEFINICIONES Y ABREVIATURAS</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Término</th>
          <th>Definición Operativa</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>RUT Arrendatario</strong></td>
          <td>Rol Único Tributario del titular o representante legal del contrato de arriendo.</td>
        </tr>
        <tr>
          <td><strong>Cartola de Pagos PDF</strong></td>
          <td>Documento digital timbrado con membrete ERP que certifique los pagos efectuados.</td>
        </tr>
        <tr>
          <td><strong>Requerimiento de Mantención</strong></td>
          <td>Solicitud de asistencia técnica por fallas físicas en la propiedad arrendada.</td>
        </tr>
      </tbody>
    </table>

    <h1>5. MATRIZ DE RESPONSABILIDADES</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Actividad</th>
          <th>Arrendatario</th>
          <th>Ejecutivo Atención</th>
          <th>Mantenimiento / Operaciones</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Autenticación y Consulta de Pagos</td>
          <td><strong>Ejecuta (E)</strong></td>
          <td>Apoya (A)</td>
          <td>Informado (I)</td>
        </tr>
        <tr>
          <td>Emisión de Cartola PDF / Excel</td>
          <td><strong>Ejecuta (E)</strong></td>
          <td>Verifica (V)</td>
          <td>Informado (I)</td>
        </tr>
        <tr>
          <td>Ingreso de Requerimiento Mantención</td>
          <td><strong>Ejecuta (E)</strong></td>
          <td>Recibe (R)</td>
          <td><strong>Resuelve (R)</strong></td>
        </tr>
      </tbody>
    </table>

    <h1>6. INSTRUCCIONES PASO A PASO CON CAPTURAS DE PANTALLA</h1>

    <h2>Paso 1: Acceso Seguro al Portal con RUT</h2>
    <p>El arrendatario debe seleccionar el perfil <strong>"Portal Arrendatario"</strong> e ingresar su RUT.</p>

    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: PANTALLA DE ACCESO AL PORTAL ARRENDATARIO]</div>
      <div class="screenshot-box-desc">Instrucción: Capture la interfaz de inicio de sesión con el cuadro de RUT y la selección de perfil.</div>
    </div>

    <h2>Paso 2: Consulta de Ficha Contractual y Estado de Cuenta</h2>
    <p>Visualice en el encabezado superior el saldo pendiente y la insignia de cumplimiento <code>AL DÍA CON SUS OBLIGACIONES</code>.</p>

    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: ENCABEZADO FICHA DE CUMPLIMIENTO]</div>
      <div class="screenshot-box-desc">Instrucción: Capture la Ficha de Cumplimiento azul donde constan los datos del contrato y el saldo.</div>
    </div>

    <h2>Paso 3: Descarga de Cartola de Pagos PDF y Excel</h2>
    <p>Utilice los botones de exportación <strong>Descargar Excel (.xlsx)</strong> y <strong>Descargar Cartola PDF</strong> para sus trámites comerciales.</p>

    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: TABLA DE PAGOS Y BOTONES DE DESCARGA]</div>
      <div class="screenshot-box-desc">Instrucción: Capture la tabla de pagos con los dos botones de descarga de reportes.</div>
    </div>

    <h1>7. CONTROL DE REGISTROS DE ATENCIÓN (ISO 9001)</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Código Registro</th>
          <th>Nombre Registro</th>
          <th>Soporte / Medio</th>
          <th>Retención</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>REG-INS-01</td>
          <td>Log de Acceso Portal Arrendatario</td>
          <td>Servidor / Base de Datos</td>
          <td>2 Años</td>
        </tr>
        <tr>
          <td>REG-INS-02</td>
          <td>Solicitud de Mantención Ingresada</td>
          <td>Módulo de Tickets / Firestore</td>
          <td>3 Años</td>
        </tr>
      </tbody>
    </table>

    <h1>8. CONTROL DE REVISIONES DEL DOCUMENTO</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Versión</th>
          <th>Fecha</th>
          <th>Modificación</th>
          <th>Autor</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1.0</td>
          <td>15/01/2026</td>
          <td>Aprobación de Instructivo de Portal Arrendatario bajo estándar ISO 9001:2015.</td>
          <td>Comité de Calidad SGC</td>
        </tr>
      </tbody>
    </table>
  `;

  downloadWordDocFromHtml(
    'Instructivo Operativo Portal Arrendatarios y Cartola (ISO 9001)',
    content,
    'Instructivo_Portal_Arrendatario_ISO9001',
    'SGC-INS-POR-002',
    'Versión 2.0 / 2026'
  );
};

// ============================================================================
// 3. PROCEDIMIENTO DE DEBIDA DILIGENCIA Y CUMPLIMIENTO PREVENCIÓN LA/FT (SGC-PRO-UAF-003)
// ============================================================================
export const generateDueDiligenceManualWord = () => {
  const content = `
    <h1>1. OBJETIVO</h1>
    <p>
      Normar el procedimiento de Debida Diligencia para la Prevención del Lavado de Activos, Financiamiento del Terrorismo y Delitos Contables (protocolo <strong>CMP-PP-01</strong>) conforme a los estándares de la norma <strong>ISO 9001:2015</strong> y las instrucciones de la Unidad de Análisis Financiero (UAF).
    </p>

    <h1>2. ALCANCE Y CAMPO DE APLICACIÓN</h1>
    <p>
      Aplica de forma obligatoria a la evaluación de todos los candidatos a arrendatarios, proveedores de servicios, contratistas de mantención y contrapartes comerciales de AssetFlow S.A.
    </p>

    <h1>3. DOCUMENTOS DE REFERENCIA Y NORMATIVA LEGAL</h1>
    <ul>
      <li><strong>Norma ISO 9001:2015:</strong> Cláusulas 8.4 (Control de Procesos y Servicios Suministrados Externamente).</li>
      <li><strong>Ley N° 19.913:</strong> Modifica el Código Penal e Instituye la UAF.</li>
      <li><strong>Ley N° 20.393:</strong> Responsabilidad Penal de las Personas Jurídicas.</li>
      <li><strong>Circulares CMF:</strong> Normas sobre Prevención de Delitos en Compañías de Seguros.</li>
    </ul>

    <h1>4. DEFINICIONES Y NIVELES DE RIESGO</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Nivel de Riesgo</th>
          <th>Criterio de Clasificación</th>
          <th>Acción Requerida</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong style="color: #16a34a;">RIESGO BAJO</strong></td>
          <td>Sin coincidencias en listas internacionales, antecedentes intachables.</td>
          <td>Aprobación estándar del contrato.</td>
        </tr>
        <tr>
          <td><strong style="color: #d97706;">RIESGO MEDIO</strong></td>
          <td>Inconsistencias menores en acreditación de ingresos o PEP secundario.</td>
          <td>Refuerzo de garantías o codeudor solidario.</td>
        </tr>
        <tr>
          <td><strong style="color: #dc2626;">RIESGO ALTO</strong></td>
          <td>Coincidencias en listas de control, origen no justificado de fondos.</td>
          <td><strong>Rechazo obligatorio del contrato</strong> e informe a Compliance.</td>
        </tr>
      </tbody>
    </table>

    <h1>5. MATRIZ RACI DE CUMPLIMIENTO</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Paso del Proceso</th>
          <th>Analista de Riesgo</th>
          <th>Encargado de Cumplimiento</th>
          <th>Gerencia General</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Levantamiento de Antecedentes y RUT</td>
          <td><strong>Responsable (R)</strong></td>
          <td>Supervisa (S)</td>
          <td>Informado (I)</td>
        </tr>
        <tr>
          <td>Cotejo Listas PEP / OFAC</td>
          <td><strong>Responsable (R)</strong></td>
          <td><strong>Aprobador (A)</strong></td>
          <td>Informado (I)</td>
        </tr>
        <tr>
          <td>Dictamen de Aprobación o Rechazo</td>
          <td>Consultado (C)</td>
          <td><strong>Aprobador (A)</strong></td>
          <td><strong>Aprobador Final (A)</strong></td>
        </tr>
      </tbody>
    </table>

    <h1>6. DESARROLLO DEL PROCEDIMIENTO CON CAPTURAS DE PANTALLA</h1>

    <h2>Etapa 1: Evaluación en el Módulo CMP-PP-01</h2>
    <p>El analista ingresa el RUT de la contraparte y activa el análisis automatizado de listas de control.</p>

    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: MÓDULO DE DEBIDA DILIGENCIA CMP-PP-01]</div>
      <div class="screenshot-box-desc">Instrucción: Capture la interfaz del módulo de Debida Diligencia con la matriz de riesgo y las casillas de verificación.</div>
    </div>

    <h2>Etapa 2: Registro de Dictamen y Firma Criptográfica</h2>
    <p>Una vez aprobado el informe, se transfiere a la Bóveda Digital (F980011D) para el timbrado con sello criptográfico.</p>

    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: FORMULARIO DE FIRMA DE CUMPLIMIENTO]</div>
      <div class="screenshot-box-desc">Instrucción: Capture la ventana de emisión del dictamen normativo y firma del Encargado de Cumplimiento.</div>
    </div>

    <h1>7. CONTROL DE REGISTROS DE CUMPLIMIENTO (ISO 9001)</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Registro</th>
          <th>Ubicación</th>
          <th>Retención</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Informe de Debida Diligencia (CMP-PP-01)</td>
          <td>Bóveda F980011D / Encrypted</td>
          <td>10 Años (Exigencia UAF)</td>
        </tr>
      </tbody>
    </table>

    <h1>8. HISTORIAL DE CONTROL DE REVISIONES</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Versión</th>
          <th>Fecha</th>
          <th>Modificación</th>
          <th>Responsable</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1.0</td>
          <td>15/01/2026</td>
          <td>Creación formal del procedimiento bajo norma ISO 9001:2015.</td>
          <td>Encargado de Cumplimiento UAF</td>
        </tr>
      </tbody>
    </table>
  `;

  downloadWordDocFromHtml(
    'Procedimiento de Debida Diligencia y Prevención LA/FT (ISO 9001)',
    content,
    'Procedimiento_Debida_Diligencia_UAF_ISO9001',
    'SGC-PRO-UAF-003',
    'Versión 2.5 / 2026'
  );
};

// ============================================================================
// 4. PROCEDIMIENTO DE LIQUIDACIÓN DE GARANTÍAS Y TÉRMINO DE CONTRATO (SGC-PRO-GAR-004)
// ============================================================================
export const generateSecurityDepositManualWord = () => {
  const content = `
    <h1>1. OBJETIVO</h1>
    <p>
      Establecer el procedimiento normalizado bajo la norma <strong>ISO 9001:2015</strong> para la inspección física de inmuebles, cálculo contable y restitution o deducción del Fondo de Garantía al término del contrato de arrendamiento (programas <strong>P1501RV</strong> y <strong>P1540</strong>).
    </p>

    <h1>2. ALCANCE Y CAMPO DE APLICACIÓN</h1>
    <p>
      Aplica a todos los procesos de entrega y restitución física de departamentos, oficinas, bodegas y estacionamientos pertenecientes a AssetFlow S.A.
    </p>

    <h1>3. DOCUMENTOS DE REFERENCIA</h1>
    <ul>
      <li><strong>Norma ISO 9001:2015:</strong> Cláusula 8.5 (Producción y Provisión del Servicio / Control de Salidas No Conformes).</li>
      <li><strong>Ley N° 18.101:</strong> Normas sobre restitución de inmuebles y garantías de arriendo.</li>
      <li><strong>Manual Tecnico ERP P1540:</strong> Security Deposit Refund &amp; Deductions.</li>
    </ul>

    <h1>4. TÉRMINOS Y DEFINICIONES</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Término</th>
          <th>Definición</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>P1501RV (Acta Física)</strong></td>
          <td>Inspección en terreno del estado del inmueble al término del contrato.</td>
        </tr>
        <tr>
          <td><strong>P1540 (Liquidación)</strong></td>
          <td>Cálculo del finiquito de garantía deduciendo daños, consumo de servicios y morosidad.</td>
        </tr>
        <tr>
          <td><strong>Saldo Neto a Devolver</strong></td>
          <td>Monto final a ser transferido al arrendatario previa aprobación de Finanzas.</td>
        </tr>
      </tbody>
    </table>

    <h1>5. MATRIZ DE RESPONSABILIDADES</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Paso del Proceso</th>
          <th>Inspector Técnico</th>
          <th>Ejecutivo Inmobiliario</th>
          <th>Jefe de Finanzas</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Levantamiento de Acta Física (P1501RV)</td>
          <td><strong>Responsable (R)</strong></td>
          <td>Supervisa (S)</td>
          <td>Informado (I)</td>
        </tr>
        <tr>
          <td>Auditoría de Saldos Pendientes (P1501HA)</td>
          <td>Informado (I)</td>
          <td><strong>Responsable (R)</strong></td>
          <td>Verifica (V)</td>
        </tr>
        <tr>
          <td>Confección y Pago de Liquidación (P1540)</td>
          <td>Informado (I)</td>
          <td>Elabora (E)</td>
          <td><strong>Aprobador Final (A)</strong></td>
        </tr>
      </tbody>
    </table>

    <h1>6. DESARROLLO DEL PROCEDIMIENTO Y MÓDULOS ERP</h1>

    <h2>Paso 1: Acta de Recepción Física (P1501RV)</h2>
    <p>El inspector registra el estado de conservación del inmueble y las lecturas finales de empalmes de servicios básicos.</p>

    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: ACTA DE REVISIÓN FÍSICA P1501RV]</div>
      <div class="screenshot-box-desc">Instrucción: Capture la interfaz del programa P1501RV con el detalle de items y fotos del inmueble.</div>
    </div>

    <h2>Paso 2: Formulación y Cálculo en el Módulo P1540</h2>
    <p>El sistema aplíca la fórmula contable estandarizada:</p>

    <div class="note-box">
      <strong style="color: #002D62; font-size: 11pt;">
        SALDO NETO A DEVOLVER = (Garantía Reajustada UF) - (Descuentos Reparaciones P1501RV) - (Cuentas Pendientes) - (Mora P1501HA)
      </strong>
    </div>

    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: MÓDULO DE LIQUIDACIÓN DE GARANTÍAS P1540]</div>
      <div class="screenshot-box-desc">Instrucción: Capture el programa P1540 con el desglose de descuentos y el cálculo del saldo neto a transferir.</div>
    </div>

    <h1>7. CONTROL DE REGISTROS DE CALIDAD (ISO 9001)</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Registro</th>
          <th>Soporte</th>
          <th>Retención</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Acta de Entrega/Recepción P1501RV</td>
          <td>PDF / Bóveda Digital</td>
          <td>5 Años</td>
        </tr>
        <tr>
          <td>Liquidación de Garantía P1540</td>
          <td>PDF / ERP Financials</td>
          <td>10 Años</td>
        </tr>
      </tbody>
    </table>

    <h1>8. HISTORIAL DE CONTROL DE CAMBIOS</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Versión</th>
          <th>Fecha</th>
          <th>Modificación</th>
          <th>Autor</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1.0</td>
          <td>15/01/2026</td>
          <td>Estandarización bajo norma ISO 9001:2015 del proceso P1540 / P1501RV.</td>
          <td>Comité de Calidad SGC</td>
        </tr>
      </tbody>
    </table>
  `;

  downloadWordDocFromHtml(
    'Procedimiento de Liquidación de Garantías de Arriendo P1540 (ISO 9001)',
    content,
    'Procedimiento_Liquidacion_Garantias_P1540_ISO9001',
    'SGC-PRO-GAR-004',
    'Versión 2.0 / 2026'
  );
};

// ============================================================================
// 5. PROCEDIMIENTO DE APROBACIÓN JERÁRQUICA (P43081) Y BLOCKCHAIN SHA-256 (F4209)
// ============================================================================
export const generateOrderApprovalBlockchainManualWord = () => {
  const content = `
    <!-- ÍNDICE GENERAL DE MATERIAS Y PROCEDIMIENTOS DE APROBACIÓN Y BLOCKCHAIN -->
    <div style="page-break-after: always; margin-bottom: 30pt;">
      <h1 style="color: #002D62; border-bottom: 3px solid #4f46e5; padding-bottom: 6px; margin-top: 10pt; margin-bottom: 12pt; font-size: 16pt;">
        ÍNDICE GENERAL DE MATERIAS Y PROCEDIMIENTOS (ISO 9001:2015)
      </h1>
      <p style="font-size: 10pt; color: #475569; font-style: italic; margin-bottom: 14pt;">
        Circuito Jerárquico P43081, Checklist W43081C y Bitácora Criptográfica Inmutable F4209
      </p>

      <table class="iso-table" style="width: 100%; margin-bottom: 20pt;">
        <thead>
          <tr style="background-color: #002D62; color: #ffffff;">
            <th style="width: 15%; text-align: center;">Sección</th>
            <th style="width: 55%;">Materia / Procedimiento de Control Interno</th>
            <th style="width: 30%; text-align: center;">Objeto JDE / Estándar</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 1</td>
            <td><strong>Objetivo del Procedimiento:</strong> Autorización jerárquica, matrices P43008, suplencias P43280 y sellado SHA-256 en F4209.</td>
            <td style="text-align: center; font-family: monospace;">ISO 9001:2015</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 2</td>
            <td><strong>Alcance y Campo de Aplicación:</strong> Mantenimientos correctivos, preventivos y mejoras capitalizables en P48201.</td>
            <td style="text-align: center; font-family: monospace;">P48201 / Ley 21.595</td>
          </tr>
          <tr>
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 3</td>
            <td><strong>Documentos de Referencia y Marco Legal:</strong> Cláusulas 8.4 y 7.5.3 ISO 9001, IVA 19%, Retención 15,25% y NIST FIPS 180-4.</td>
            <td style="text-align: center; font-family: monospace;">SII / NIST / ISO</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 4</td>
            <td><strong>Arquitectura de Programas y Tablas JDE:</strong> P43081, Checklist W43081C (7 puntos), P43008, P43280 y Ledger F4209.</td>
            <td style="text-align: center; font-family: monospace;">F4209 / P43081</td>
          </tr>
          <tr>
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 5</td>
            <td><strong>Protocolo de Inmutabilidad Forense:</strong> Gobernanza estricta Append-Only, prohibición de re-sellado y reversas contables.</td>
            <td style="text-align: center; font-family: monospace;">Append-Only</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 6</td>
            <td><strong>Exportación Forense a Excel:</strong> Máscara de Hora Corta (HH:mm) para timestamps Unix en inspecciones periciales.</td>
            <td style="text-align: center; font-family: monospace;">Excel .xlsx / HH:mm</td>
          </tr>
          <tr>
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 7</td>
            <td><strong>Control de Registros de Calidad:</strong> Bitácora F4209 (indefinida) y Reporte Merkle Root (10 años).</td>
            <td style="text-align: center; font-family: monospace;">REG-APR-01 / 02</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 8</td>
            <td><strong>Historial de Control de Cambios:</strong> Registro de versiones aprobadas por la Gerencia y Comité SGC.</td>
            <td style="text-align: center; font-family: monospace;">Versión 1.0 / 2026</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h1>1. OBJETIVO</h1>
    <p>
      Normar el procedimiento operativo, tributario y criptográfico bajo el estándar <strong>ISO 9001:2015</strong> para la autorización jerárquica de Órdenes de Trabajo (OT) y Órdenes de Compra (OC) en el programa <strong>P43081</strong>, la administración de matrices de rutas (<strong>P43008</strong>), la delegación de autoridad con segregación de funciones (<strong>P43280</strong>) y la auditoría de integridad inmutable mediante encadenamiento criptográfico <strong>SHA-256 (Web Crypto API)</strong> sobre la bitácora forense <strong>F4209</strong>.
    </p>

    <h1>2. ALCANCE Y CAMPO DE APLICACIÓN</h1>
    <p>
      Aplica de manera obligatoria a todas las órdenes de mantenimiento correctivo, preventivo y mejoras capitalizables generadas en el Centro de Órdenes de Trabajo (<code>P48201</code>) de AssetFlow S.A., así como a los procesos de fiscalización interna, cumplimiento normativo (Leyes N° 20.393 y N° 21.595) y peritaje forense.
    </p>

    <h1>3. DOCUMENTOS DE REFERENCIA Y MARCO LEGAL</h1>
    <ul>
      <li><strong>Norma ISO 9001:2015:</strong> Cláusula 8.4 (Control de compras y servicios externos) y Cláusula 7.5.3 (Control de la información documentada e integridad de registros).</li>
      <li><strong>Decreto Ley N° 825 (IVA 19%) y Ley N° 21.133 / D.L. N° 824 Art. 42 N° 2 (Retención 15,25%):</strong> Determinación algorítmica de impuestos según tipo de documento tributario (Factura Afecta vs. Boleta de Honorarios).</li>
      <li><strong>Estándar NIST FIPS PUB 180-4 (SHA-256) y Ley N° 19.799:</strong> Sellado criptográfico determinista y principio de no-repudio.</li>
    </ul>

    <h1>4. ARQUITECTURA DE PROGRAMAS Y TABLAS JDE (CICLO DE APROBACIONES)</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Objeto JDE</th>
          <th>Denominación Técnica</th>
          <th>Función de Control Interno</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="badge-jde">P43081</span></td>
          <td>Order Approval Workbench</td>
          <td>Bandeja interactiva de liberación/rechazo con Menú Contextual (clic derecho) en las 4 vistas y exportación Excel de alta precisión.</td>
        </tr>
        <tr>
          <td><span class="badge-jde">W43081C</span></td>
          <td>Checklist de 7 Puntos de Control</td>
          <td>Validación obligatoria de: (1) Umbral P43008, (2) Presupuesto CC, (3) Proveedor/RUT y Doc. Tributario, (4) Exactitud Tributaria IVA 19% / Ret. 15,25%, (5) SoD, (6) Especificación Técnica y (7) Sello SHA-256 F4209.</td>
        </tr>
        <tr>
          <td><span class="badge-jde">P43008</span></td>
          <td>Approval Routes &amp; Thresholds</td>
          <td>Matriz de 4 niveles jerárquicos según cuantía en CLP y regla de liberación automática bajo el mínimo.</td>
        </tr>
        <tr>
          <td><span class="badge-jde">P43280</span></td>
          <td>Approval Delegation</td>
          <td>Suplencia controlada por rango de fechas con bloqueo automático de auto-delegación.</td>
        </tr>
        <tr>
          <td><span class="badge-jde">F4209</span></td>
          <td>Held Orders Cryptographic Ledger</td>
          <td>Cadena de bloques <code>SHA-256</code> (<code>blockIndex</code>, <code>previousHash</code>, <code>integrityHash</code>, <strong>Merkle Root</strong>) bajo estricta gobernanza <em>Append-Only</em>.</td>
        </tr>
      </tbody>
    </table>

    <h1>5. PROTOCOLO DE INMUTABILIDAD Y PROHIBICIÓN DE RESTAURACIÓN HISTÓRICA</h1>
    <div class="warning-box">
      <strong>REGLA DE ORO FORENSE (GOBERNANZA APPEND-ONLY):</strong><br />
      En estricto apego al principio de inmutabilidad de registros contables y blockchain, el Verificador Criptográfico de Cadena de Bloques (disponible en <code>P43081</code> y en la Bóveda Digital <code>F980011D</code>) <strong>NO posee funciones de restauración ni re-sellado de bloques históricos</strong>.<br /><br />
      1. <strong>Detección de Adulteración:</strong> Si el motor <code>crypto.subtle.digest('SHA-256', ...)</code> detecta una discrepancia entre el hash almacenado y el hash recalculado en vivo, o una ruptura del enlace <code>previousHash</code>, el bloque queda marcado permanentemente como <code>CORRUPTED</code>.<br />
      2. <strong>Rectificación vía Contra-Asiento (Reversal Block):</strong> Cualquier corrección contable legítima debe realizarse agregando un nuevo bloque compensatorio al final de la cadena (<em>Append-Only</em>), preservando intacta la trazabilidad histórica.
    </div>

    <h1>6. EXPORTACIÓN FORENSE A EXCEL Y FORMATO DE HORA CORTA (HH:mm)</h1>
    <p>
      Al exportar la bitácora <code>F4209</code> a Microsoft Excel (<code>.xlsx</code>) desde la barra de herramientas o desde el menú contextual de la grilla, el motor de exportación transforma automáticamente el campo <code>timestamp</code> (marca de tiempo Unix en milisegundos) a <strong>formato de Hora Corta (<code>HH:mm</code>, ej. <code>17:08</code>, <code>14:40</code>)</strong> con máscara nativa <code>hh:mm</code> y alineación centrada, evitando que Excel lo represente en notación científica (<code>1,77E+12</code>) y garantizando legibilidad inmediata para auditores y peritos.
    </p>

    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: BITÁCORA F4209 EXPORTADA A EXCEL CON TIMESTAMP EN HORA CORTA HH:mm]</div>
      <div class="screenshot-box-desc">Instrucción: Capture la planilla Excel exportada mostrando la columna timestamp en formato de hora corta (ej. 17:08) junto a los hashes SHA-256.</div>
    </div>

    <h1>7. CONTROL DE REGISTROS DE CALIDAD (ISO 9001)</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Código Registro</th>
          <th>Nombre del Registro</th>
          <th>Soporte</th>
          <th>Retención</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>REG-APR-01</td>
          <td>Bitácora de Aprobaciones F4209 Sellada con SHA-256</td>
          <td>Ledger Criptográfico / Excel (.xlsx)</td>
          <td>Indefinida (Inmutable)</td>
        </tr>
        <tr>
          <td>REG-APR-02</td>
          <td>Reporte de Verificación de Merkle Root</td>
          <td>Verificador Web Crypto API (P43081 / F980011D)</td>
          <td>10 Años</td>
        </tr>
      </tbody>
    </table>

    <h1>8. HISTORIAL DE CONTROL DE CAMBIOS</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Versión</th>
          <th>Fecha</th>
          <th>Modificación</th>
          <th>Autor</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1.0</td>
          <td>16/10/2026</td>
          <td>Emisión oficial del procedimiento de Aprobaciones Jerárquicas P43081, Checklist de 7 puntos W43081C, formato de hora corta HH:mm en Excel y Verificador Blockchain SHA-256 Append-Only.</td>
          <td>Arquitectura JDE 9.11 &amp; Comité SGC</td>
        </tr>
      </tbody>
    </table>
  `;

  downloadWordDocFromHtml(
    'Procedimiento de Aprobación Jerárquica P43081 y Cadena de Bloques SHA-256 F4209 (ISO 9001)',
    content,
    'Procedimiento_Aprobaciones_P43081_Blockchain_F4209_ISO9001',
    'SGC-PRO-APR-005',
    'Versión 1.0 / 2026'
  );
};

/**
 * Genera y descarga una Carta de Presentación Ejecutiva en formato Microsoft Word (.doc / .docx compatible).
 * Destaca con elegancia y rigor el perfil híbrido de alta singularidad de Cristian Andrés Muñoz Rojas:
 * - Ingeniero Civil Industrial
 * - Dominio de Control Interno, Supply Chain & S&OP, y Optimización de Capital de Trabajo
 * - Récords cuantitativos: $0 diferencias en UF 158.000 / 0 observaciones de auditoría CMF en 1.849 propiedades
 * - Arquitectura de Software con IA Generativa aplicada como multiplicador de productividad empresarial
 */
export const downloadExecutiveCoverLetterWord = (options?: {
  recipientName?: string;
  recipientTitle?: string;
  companyName?: string;
  jobPosition?: string;
  candidateName?: string;
  candidateTitle?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  city?: string;
  customLetterBody?: string;
}) => {
  const {
    recipientName = 'Estimada Gerencia de Selección / Comité de Búsqueda',
    recipientTitle = 'Dirección de Personas y Atracción de Talento',
    companyName = '[Nombre de la Empresa o Institución]',
    jobPosition = '[Cargo / Posición a la que Postula]',
    candidateName = 'CRISTIAN ANDRÉS MUÑOZ ROJAS',
    candidateTitle = 'Ingeniero Civil Industrial',
    email = 'cristian.munoz0223@gmail.com',
    phone = '+56 9 6143 6853',
    linkedin = 'www.linkedin.com/in/cristian-muñoz-3a747258',
    city = 'Santiago, Chile',
    customLetterBody
  } = options || {};

  const currentDate = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const defaultBodyHtml = `
    <p class="body-text">
      Estimados integrantes del Comité de Selección y Liderazgo de <strong>${companyName}</strong>:
    </p>

    <p class="body-text">
      Me dirijo a ustedes con el propósito de presentar formalmente mi candidatura para el cargo de <strong>${jobPosition}</strong>. Mi motivación profesional nace de la convicción de que los mayores saltos de rentabilidad y excelencia en una organización no provienen de discursos teóricos, sino de la sincronización exacta entre la estrategia financiera directiva, la disciplina operativa en terreno y la adopción inteligente de herramientas tecnológicas de vanguardia.
    </p>

    <p class="body-text">
      Si tuviera que resumir la particularidad de mi trayectoria, radica en un <strong>perfil híbrido de muy baja frecuencia en el mercado</strong>: soy un <strong>Ingeniero Civil Industrial</strong> formado con rigurosidad en optimización de operaciones y control interno, que no se limita a auditar o diagnosticar cuellos de botella desde un escritorio, sino que <strong>concibe, diseña y programa soluciones de software y automatizaciones de grado empresarial utilizando la Inteligencia Artificial Generativa como multiplicador de fuerza</strong>. Esta combinación me permite actuar como un puente de alto rendimiento entre la alta dirección, los equipos operativos y la tecnología, resolviendo problemas estructurales en cuestión de semanas en lugar de esperar costosos ciclos de consultoría externa.
    </p>

    <div class="highlight-box">
      <div style="font-weight: bold; color: #002D62; margin-bottom: 6px; font-size: 11pt;">
        Respaldan esta propuesta hitos de gestión cuantitativos y verificables:
      </div>
      <ul>
        <li>
          <strong>Control Interno y Auditoría Cero Observaciones (Sector Inmobiliario / Financiero):</strong> Lideré el control interno y la valoración patrimonial de un portafolio de 1.849 propiedades valorizado en UF 30.300 ($1.146M CLP), logrando el hito de <strong>cero (0) observaciones de auditoría ante la Comisión para el Mercado Financiero (CMF)</strong>. Para erradicar la vulnerabilidad del "siempre se ha hecho así", concebí y supervisé el despliegue del sistema <em>AssetFlow</em>, plataforma que automatiza la reportería CMF (B13, B4, Nota 14), la prevención de lavado de activos (UAF/PEP) y el cálculo tributario de exenciones de arriendo según el D.L. 825 Art. 8° letra g).
        </li>
        <li>
          <strong>Cero Diferencias de Inventario y Optimización de Capital (Essity Chile - Manufactura Continua):</strong> Reduje las discrepancias de inventario a cero y las mantuve en <strong>$0 diferencias por más de 10 meses consecutivos</strong> en bodegas críticas de repuestos que bordeaban las UF 158.000 ($6.000M CLP), instaurando un régimen riguroso de inventarios rotativos aleatorios (IRA). Asimismo, <strong>liberé más de UF 53.000 ($2.000M CLP) en capital de trabajo</strong> sin comprometer la continuidad operacional, mediante negociación estratégica de acuerdos marco con proveedores y planificación colaborativa S&OP.
        </li>
        <li>
          <strong>Cultura Operativa y Acompañamiento en Terreno:</strong> Mi estilo de liderazgo combina la exigencia analítica con la empatía formativa. Implementé protocolos de acompañamiento en terreno ("Sombra") para capacitar a ejecutivos, desarticular malas prácticas arraigadas y sustituirlas por cuadros de mando en tiempo real que devuelven la autonomía y el orgullo por el trabajo bien ejecutado.
        </li>
      </ul>
    </div>

    <p class="body-text">
      Al incorporarme a <strong>${companyName}</strong>, mi aporte inmediato no será únicamente la gestión eficaz de la rutina del cargo, sino la capacidad de:
    </p>

    <ul style="margin: 6px 0 14px 0; padding-left: 20px; font-size: 10.5pt; color: #1e293b; line-height: 1.45;">
      <li style="margin-bottom: 5px;"><strong>Eliminar puntos ciegos operacionales</strong> y blindar a la institución frente a riesgos normativos, fiscales o de auditoría interna y externa.</li>
      <li style="margin-bottom: 5px;"><strong>Acelerar la transformación digital interna sin costos desmedidos</strong>, traduciendo requerimientos de negocio en herramientas concretas gracias a mi dominio práctico de la IA Generativa aplicada y metodologías ágiles.</li>
      <li style="margin-bottom: 5px;"><strong>Optimizar costos y recursos de capital</strong> con el rigor de la ingeniería civil industrial y el enfoque Lean Six Sigma, asegurando que cada peso invertido maximice el margen operativo.</li>
      <li style="margin-bottom: 5px;"><strong>Construir equipos comprometidos y de alto estándar</strong>, capaces de sostener los resultados en el tiempo mediante procesos estandarizados y medibles.</li>
    </ul>

    <p class="body-text">
      Agradeciendo de antemano el tiempo dedicado a revisar estos antecedentes y mi Currículum Vitae adjunto, manifiesto mi total disponibilidad para sostener una entrevista personal o técnica en la oportunidad que estimen conveniente.
    </p>
  `;

  const bodyContent = customLetterBody 
    ? customLetterBody.split('\n\n').map(p => `<p class="body-text">${p.replace(/\n/g, '<br>')}</p>`).join('')
    : defaultBodyHtml;

  const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
        xmlns:w='urn:schemas-microsoft-com:office:word' 
        xmlns:m='http://schemas.microsoft.com/office/2004/12/omml'
        xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="ProgId" content="Word.Document" />
    <meta name="Generator" content="Microsoft Word 15" />
    <meta name="Originator" content="Microsoft Word 15" />
    <title>Carta de Presentación - ${candidateName}</title>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForCustomXSL/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      @page {
        size: 21.0cm 29.7cm;
        margin: 2.5cm 2.5cm 2.5cm 2.5cm;
      }
      body {
        font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.45;
        color: #1e293b;
        background-color: #ffffff;
      }
      .header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        border-bottom: 2.5px solid #002D62;
        padding-bottom: 10px;
      }
      .candidate-name {
        font-size: 16pt;
        font-weight: bold;
        color: #002D62;
        letter-spacing: 0.5px;
        margin: 0;
      }
      .candidate-title {
        font-size: 11pt;
        font-weight: bold;
        color: #0284c7;
        margin: 2px 0 6px 0;
      }
      .contact-bar {
        font-size: 9pt;
        color: #475569;
        margin: 0;
      }
      .date-line {
        text-align: right;
        font-size: 10.5pt;
        color: #64748b;
        margin-bottom: 18px;
      }
      .recipient-block {
        margin-bottom: 18px;
        font-size: 11pt;
        line-height: 1.35;
      }
      .recipient-block strong {
        color: #0f172a;
      }
      .subject-line {
        background-color: #f1f5f9;
        border-left: 4px solid #002D62;
        padding: 8px 12px;
        margin-bottom: 18px;
        font-size: 11pt;
        font-weight: bold;
        color: #002D62;
      }
      p.body-text {
        text-align: justify;
        text-justify: inter-word;
        margin-bottom: 12px;
        font-size: 11pt;
        line-height: 1.45;
        color: #1e293b;
      }
      .highlight-box {
        background-color: #f8fafc;
        border: 1px solid #cbd5e1;
        border-left: 3.5px solid #002D62;
        padding: 10px 14px;
        margin: 14px 0;
      }
      .highlight-box ul {
        margin: 4px 0;
        padding-left: 18px;
      }
      .highlight-box li {
        font-size: 10.5pt;
        margin-bottom: 6px;
        color: #334155;
        text-align: justify;
      }
      .signature-block {
        margin-top: 25px;
        page-break-inside: avoid;
      }
      .signature-name {
        font-size: 12pt;
        font-weight: bold;
        color: #002D62;
      }
      .signature-title {
        font-size: 10.5pt;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <!-- ENCABEZADO EJECUTIVO -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: bottom;">
          <div class="candidate-name">${candidateName}</div>
          <div class="candidate-title">${candidateTitle}</div>
          <div class="contact-bar">
            📍 ${city} &nbsp;|&nbsp; ✉️ ${email} &nbsp;|&nbsp; 📞 ${phone} &nbsp;|&nbsp; 🔗 ${linkedin}
          </div>
        </td>
      </tr>
    </table>

    <div class="date-line">
      Santiago de Chile, ${currentDate}
    </div>

    <!-- DESTINATARIO -->
    <div class="recipient-block">
      <strong>Señores / Señoras:</strong><br />
      <strong>${recipientName}</strong><br />
      ${recipientTitle}<br />
      <strong>${companyName}</strong>
    </div>

    <!-- ASUNTO -->
    <div class="subject-line">
      REF: Postulación al cargo de ${jobPosition} — Propuesta de Valor y Antecedentes Profesionales
    </div>

    <!-- CUERPO DE LA CARTA -->
    ${bodyContent}

    <!-- FIRMA -->
    <div class="signature-block">
      <p style="margin: 0 0 16px 0; font-size: 11pt;">Le saluda atentamente,</p>
      <div class="signature-name">${candidateName}</div>
      <div class="signature-title">${candidateTitle}</div>
      <div style="font-size: 9.5pt; color: #64748b; margin-top: 4px;">
        Teléfono: ${phone} &nbsp;|&nbsp; Email: ${email}<br />
        ${city}
      </div>
    </div>
  </body>
  </html>`;

  const blob = new Blob(['\ufeff' + wordHtml], { 
    type: 'application/msword;charset=utf-8' 
  });
  saveAs(blob, `Carta_de_Presentacion_${candidateName.replace(/\s+/g, '_')}.doc`);
};

/**
 * Exportador en Microsoft Word (.DOC) para el Cuestionario de Preguntas de Postulación
 * Genera un documento ejecutivo con membrete, preguntas y respuestas fundamentadas en el CV
 */
export const downloadScreeningAnswersWord = (options: {
  jobTitle: string;
  companyName: string;
  candidateName?: string;
  candidateTitle?: string;
  email?: string;
  phone?: string;
  city?: string;
  items: Array<{ question: string; answer: string; tone?: string }>;
}) => {
  const {
    jobTitle,
    companyName,
    candidateName = 'CRISTIAN ANDRÉS MUÑOZ ROJAS',
    candidateTitle = 'Ingeniero Civil Industrial',
    email = 'cristian.munoz0223@gmail.com',
    phone = '+56 9 6143 6853',
    city = 'Santiago, Chile',
    items
  } = options;

  const currentDate = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const qnaHtml = items.map((item, idx) => {
    const formattedAnswer = item.answer
      .split('\n\n')
      .map(p => `<p style="margin: 0 0 10px 0; text-align: justify; line-height: 1.5; font-size: 11pt; color: #1e293b;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    return `
      <div style="margin-bottom: 24px; padding: 14px 18px; background-color: #f8fafc; border-left: 4px solid #002D62; border-radius: 4px;">
        <div style="font-size: 11pt; font-weight: bold; color: #002D62; margin-bottom: 8px;">
          PREGUNTA ${idx + 1}: ${item.question}
        </div>
        <div style="font-size: 9.5pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 10px;">
          Respuesta Fundamentada para Postulación (${jobTitle} — ${companyName}):
        </div>
        ${formattedAnswer}
      </div>
    `;
  }).join('');

  const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
        xmlns:w='urn:schemas-microsoft-com:office:word' 
        xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="ProgId" content="Word.Document" />
    <meta name="Generator" content="Microsoft Word 15" />
    <title>Respuestas Postulacion - ${jobTitle} - ${candidateName}</title>
    <style>
      @page { size: 21.0cm 29.7cm; margin: 2.5cm; }
      body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #1e293b; background-color: #ffffff; }
      .header-title { font-size: 18pt; font-weight: bold; color: #002D62; text-transform: uppercase; margin: 0; }
      .header-sub { font-size: 12pt; font-weight: bold; color: #0284c7; margin-top: 2px; }
      .header-meta { font-size: 9.5pt; color: #64748b; text-align: right; }
    </style>
  </head>
  <body>
    <table style="width: 100%; border-bottom: 2px solid #002D62; padding-bottom: 12px; margin-bottom: 20px;">
      <tr>
        <td>
          <div class="header-title">${candidateName}</div>
          <div class="header-sub">${candidateTitle}</div>
        </td>
        <td class="header-meta">
          📍 ${city} &nbsp;|&nbsp; ✉️ ${email}<br />
          📞 ${phone} &nbsp;|&nbsp; Fecha: ${currentDate}
        </td>
      </tr>
    </table>

    <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 6px; margin-bottom: 22px;">
      <div style="font-size: 12pt; font-weight: bold; color: #0f172a; text-transform: uppercase;">
        Cuestionario de Postulación & Respuestas Estructuradas con IA
      </div>
      <div style="font-size: 10pt; color: #334155; margin-top: 4px;">
        <strong>Cargo:</strong> ${jobTitle} &nbsp;|&nbsp; <strong>Empresa / Institución:</strong> ${companyName}
      </div>
    </div>

    ${qnaHtml}

    <div style="margin-top: 30px; padding-top: 14px; border-top: 1px solid #cbd5e1; font-size: 9.5pt; color: #64748b; text-align: center;">
      Documento generado por Asistente de Postulación con IA • Respuestas fundamentadas en logros reales de CV
    </div>
  </body>
  </html>`;

  const blob = new Blob(['\ufeff' + wordHtml], { 
    type: 'application/msword;charset=utf-8' 
  });
  saveAs(blob, `Respuestas_Postulacion_${jobTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${candidateName.replace(/\s+/g, '_')}.doc`);
};

// ============================================================================
// 6A. SIMULACRO DE EXAMEN DE GRADO N° 1 (DOCUMENTO INDIVIDUAL — SGC-ACA-TFM-006-A)
// ============================================================================
export const generateExamSimulation1Word = () => {
  const content = `
    <h1>1. FICHA DEL SIMULACRO DE EXAMEN DE GRADO N° 1</h1>
    <p>
      El presente documento transcribe de manera íntegra el <strong>Primer Simulacro de Examen de Grado y Defensa del Trabajo Final para Optar al Grado de Magíster en Inteligencia Artificial, Derecho Digital y Blockchain</strong> realizado para el proyecto <strong>AssetFlow Enterprise (Estándar AssetFlow Enterprise 9.11)</strong> ante el Tribunal Evaluador simulado de <strong>EBIS Business Tech School</strong>.
    </p>

    <div class="success-box">
      <strong>ACTA DE CALIFICACIÓN — SIMULACRO DE DEFENSA N° 1:</strong><br />
      • <strong>Enfoque Evaluado:</strong> Defensa Arquitectónica, Criptografía SHA-256, Gobernanza de IA Generativa y Gestión del Cambio en Terreno.<br />
      • <strong>Calificación Final Obtenida:</strong> <strong>9,3 / 10</strong> (Escala Europea EBIS — Sobresaliente) | Equivalente Escala Chilena: <strong>6,7 / 7,0</strong>.
    </div>

    <h1>2. DESARROLLO DE LAS PREGUNTAS Y RESPUESTAS DEL SIMULACRO N° 1</h1>

    <h2>2.1 Pregunta N° 1 del Tribunal (Vocal de Criptografía, Ciberseguridad y Blockchain)</h2>
    <div class="note-box">
      <strong>Pregunta del Tribunal:</strong><br />
      «Señor Muñoz, usted ha implementado un verificador criptográfico en vivo mediante Web Crypto API (<code>crypto.subtle</code>) que encadena cada aprobación del módulo <code>P43081</code> en la tabla <code>F4209</code> con el hash <code>SHA-256</code> del bloque anterior y eliminó acertadamente cualquier botón de "restaurar cadena" para respetar la inmutabilidad <em>Append-Only</em>.<br /><br />
      Sin embargo, su base de datos opera sobre un entorno que un administrador de TI con acceso privilegiado (root) podría intervenir. ¿Qué impide que un administrador malicioso modifique un monto en la base de datos y vuelva a correr un script que recalcule todos los hashes hasta el último bloque? ¿Cómo defiende la inmutabilidad probatoria de su sistema y cuál es su estrategia de infraestructura y privilegios antes de salir a producción?»
    </div>

    <h3>Aportes Clave del Candidato (Criterio de Ingeniería y Control Interno)</h3>
    <ul>
      <li><strong>Política Estricta de Administración de Credenciales y Privilegios:</strong> Nadie opera con cuentas genéricas; existe segregación estricta de funciones (SoD) entre quienes administran servidores TI y quienes tienen atribuciones de negocio para liberar órdenes en <code>P43081</code>.</li>
      <li><strong>Migración Planificada de Firebase a Servidores Propios (On-Premise) antes de Producción:</strong> Si bien en la fase de prototipado y validación académica las bases de datos operan sobre Firebase para facilitar las pruebas en tiempo real, por política corporativa de soberanía de datos antes de entrar a producción definitiva todas las bases de datos deben migrar a <strong>servidores propios de la empresa (On-Premise)</strong>.</li>
      <li><strong>Anclaje de la Raíz de Merkle (Merkle Root SHA-256):</strong> La Raíz de Merkle de 64 caracteres hexadecimales consolida toda la cadena sin exponer datos privados (cumpliendo la Ley N° 21.719) y permite sellar externamente el estado diario del libro <code>F4209</code>, haciendo matemáticamente imposible reemplazar la cadena completa sin ser detectado.</li>
    </ul>

    <h3>Respuesta Magistral Consolidada para la Defensa Oral (Pregunta 1)</h3>
    <p>
      <em>«Profesor, usted apunta al riesgo más crítico de cualquier sistema corporativo: la amenaza del administrador interno. Si solo guardáramos los datos y los hashes en el mismo lugar sin controles cruzados, quien tenga la llave maestra técnica podría intentar reescribir la historia. Por eso mi arquitectura cierra esa brecha combinando gobierno de infraestructura, control estricto de credenciales y criptografía de anclaje externo.</em>
    </p>
    <p>
      <em>En primer lugar, respecto a dónde viven los datos: si bien hoy la base de datos está alojada en Firebase para efectos de este entorno de demostración y pre-producción ágil, el diseño contempla como requisito obligatorio que, antes del paso a producción, todas las bases de datos migren a servidores corporativos propios de la empresa (On-Premise). Esto nos otorga soberanía física y jurídica total sobre la información financiera y los contratos bajo la Ley N° 21.719 y el estándar de resiliencia DORA.</em>
    </p>
    <p>
      <em>En segundo lugar, sobre esos servidores propios rige una política estricta de administración de credenciales y privilegios de acceso (Principio de Mínimo Privilegio). Ningún usuario ni administrador tiene poder absoluto: el administrador de TI que mantiene el servidor no posee credenciales de negocio para firmar órdenes en el módulo P43081, y los perfiles de negocio solo tienen permisos de lectura y adición (Append-Only) sobre la bitácora criptográfica F4209, jamás de edición o borrado.</em>
    </p>
    <p>
      <em>Y en tercer lugar, como candado matemático definitivo: el verificador del sistema calcula en tiempo real la Raíz de Merkle (Merkle Root SHA-256) que resume toda la cadena de aprobaciones en un único código de 64 caracteres sin revelar ningún dato privado. Ese código único se timbra externamente al cierre del día; así, aunque alguien con acceso físico al servidor intentara alterar un monto histórico y recalcular todos los hashes hacia adelante, la nueva Raíz de Merkle jamás coincidiría con el sello externo original, dejando en evidencia inmediata la adulteración bajo la Ley N° 19.799.»</em>
    </p>

    <h2>2.2 Pregunta N° 2 del Tribunal (Vocal de Inteligencia Artificial Generativa y Derecho Digital)</h2>
    <div class="note-box">
      <strong>Pregunta del Tribunal:</strong><br />
      «Señor Muñoz, los Grandes Modelos de Lenguaje (LLMs) son probabilísticos y propensos a sufrir alucinaciones, mientras que el Derecho Tributario chileno (SII) y la Ley de Delitos Económicos (Ley N° 21.595) exigen exactitud absoluta. ¿Cómo evita su arquitectura técnica que la Inteligencia Artificial induzca a error en los cálculos financieros o tributarios, y —si aun así ocurre una mala decisión apoyada en el asistente cognitivo— de quién es la responsabilidad jurídica final bajo el diseño de su sistema y del Reglamento Europeo de IA (<em>EU AI Act</em>)?»
    </div>

    <h3>Respuesta Original del Candidato en el Examen</h3>
    <p>
      <em>«Primero que todo se debe aclarar que el sistema es una herramienta que bajo ningún concepto lo considero infalible, pero sí se debe considerar el contexto en el que se pretende implementar: actualmente la información en general y todos los procesos plasmados en el sistema se llevan en planillas Excel, las que a mi criterio están sujetas a errores de digitación por parte humana, cabe señalar que esto ya ha pasado en varias ocasiones. Si bien es cierto no niego la probabilidad de que la IA alucine, también hago hincapié en que el sistema es una herramienta que siempre va a necesitar validación humana, y es ahí donde mitigo el riesgo de dar curso a operaciones que puedan constituir una operación de delito económico.»</em>
    </p>

    <h3>Respuesta Pulida de Nivel Tribunal (Integrando separación de cálculo determinista y Art. 14 EU AI Act)</h3>
    <p>
      <em>«Mire, profesor, lo primero que quiero dejar en claro es que bajo ningún concepto considero que este sistema sea infalible. Ningún software lo es, y menos cuando interviene inteligencia artificial. Pero para evaluar el riesgo hay que mirar el contexto real desde donde venimos: hoy en día, toda esta operación inmobiliaria y financiera se lleva en planillas Excel sueltas. Y no hablo en teoría; en la práctica ya nos ha ocurrido varias veces que un error de digitación humana o una fórmula corrida en Excel termina alterando un cobro o pasando por alto un documento vencido.</em>
    </p>
    <p>
      <em>Ahora bien, ¿cómo evito técnicamente que la IA induzca a un error financiero o tributario? Separando aguas en la arquitectura: en mi sistema, la IA generativa nunca calcula impuestos, ni flujos de caja, ni topes en UF. Toda la matemática financiera y las reglas tributarias del SII (el 19% de IVA en Facturas Afectas y la retención en Boletas de Honorarios) corren sobre código tradicional determinista TypeScript, donde dos más dos siempre es cuatro. La IA actúa únicamente como un asistente cognitivo que ayuda a redactar, resumir, priorizar tareas o clasificar información.</em>
    </p>
    <p>
      <em>Aun así, no niego la probabilidad de que el modelo pueda alucinar en una recomendación o interpretación. Por eso mismo diseñé el sistema como una herramienta de apoyo que jamás toma decisiones autónomas. Ninguna orden de trabajo ni pago se libera por decisión de la máquina: el sistema exige obligatoriamente la validación humana a través del módulo de Aprobaciones (P43081), donde el ejecutivo responsable debe completar el Checklist de 7 puntos de control (W43081C) antes de firmar. Por lo tanto, tanto bajo la Ley chilena de Delitos Económicos (N° 21.595) como bajo el principio de supervisión humana del Artículo 14 del Reglamento Europeo de IA (EU AI Act), la responsabilidad jurídica final nunca es del algoritmo; recae íntegramente en el apoderado o gerente que valida la operación y estampa su firma nominal en el bloque SHA-256.»</em>
    </p>

    <h2>2.3 Pregunta N° 3 del Tribunal (Presidente del Tribunal — Negocios, ROI y Gestión del Cambio)</h2>
    <div class="note-box">
      <strong>Pregunta del Tribunal:</strong><br />
      «En las empresas inmobiliarias, los operadores administrativos y jefes de mantención llevan 15 o 20 años casados con sus planillas Excel. Cuando uno les instala un sistema con rigor tipo Enterprise ERP, con rutas jerárquicas (<code>P43008</code>), códigos de retención (<code>Hold Codes 42/HC</code>) y un checklist de 7 puntos antes de aprobar una orden (<code>P43081</code>), la primera reacción suele ser el rechazo. ¿Cómo evita que los usuarios boicoteen el sistema y sigan llevando su "contabilidad paralela" en Excel, y cómo le justifica económicamente al Directorio pasar de esas planillas Excel a este ecosistema blindado?»
    </div>

    <h3>Respuesta Original del Candidato en el Examen</h3>
    <p>
      <em>«Gracias señor Presidente por la pregunta. Primero quiero aclarar que no tengo la capacidad de impedir que los usuarios del sistema puedan llevar "su contabilidad en paralelo", y a mi parecer eso permitiría validar las operaciones del sistema con los datos reales. En cuanto a cómo manejaría la posibilidad de boicot, mi premisa es implementar un plan de implementación dividido en etapas: en una primera parte implementaría un protocolo de acompañamiento llamado <strong>Protocolo Sombra</strong>, donde yo acompañaría a los usuarios del sistema haciendo y aprendiendo de su trabajo diario, para ver y revisar in situ los errores o fallos en los procesos y corregirlos en el sistema con la información obtenida de primera fuente. En una segunda etapa vendría la interiorización: le explicaría al usuario cuál es la importancia de su trabajo en todos los procesos del sistema y cuáles son las implicancias que conlleva el que no haga bien su trabajo; a esta etapa la llamo <strong>Protocolo de Empoderamiento</strong>, apoyado además por los manuales de uso integrados en el sistema.»</em>
    </p>

    <h3>Respuesta Pulida de Nivel Tribunal (Protocolo Sombra + Protocolo de Empoderamiento + ROI Directorio)</h3>
    <p>
      <em>«Gracias, señor Presidente. Primero quiero ser muy realista: no tengo la capacidad física de impedir que un usuario lleve "su contabilidad en paralelo" en Excel al principio, y a mi parecer eso tampoco es negativo durante la marcha blanca. Al contrario, ese registro paralelo inicial nos permite contrastar y validar las operaciones del sistema contra los datos reales del día a día hasta que el propio usuario compruebe que la plataforma cuadra al peso.</em>
    </p>
    <p>
      <em>Para neutralizar cualquier intento de boicot, mi estrategia como Ingeniero Civil Industrial se divide en dos etapas de terreno: primero aplico el <strong>Protocolo Sombra</strong>, donde me siento junto a los usuarios en su puesto de trabajo, haciendo y aprendiendo de su rutina diaria para detectar in situ los fallos o fricciones del proceso y corregirlos en el sistema con información de primera fuente. Segundo, aplico el <strong>Protocolo de Empoderamiento</strong>, donde le explico a cada operador el impacto de su labor en toda la cadena del ERP y las graves implicancias financieras, tributarias y legales que acarrea un registro mal hecho, respaldando su aprendizaje con los 5 Manuales ISO 9001 descargables en Word y el Manual Interactivo integrado en el sistema. Y frente al Directorio, la justificación económica es directa: el Excel solo parece gratis hasta que ocurre el primer error de digitación costoso, una multa del SII o una contingencia penal bajo la Ley N° 21.595. El sistema se paga solo al evitar el primer siniestro administrativo.»</em>
    </p>

    <h1>3. TABLA DE EVALUACIÓN — SIMULACRO DE EXAMEN DE GRADO N° 1</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th style="width: 18%;">Pregunta</th>
          <th style="width: 32%;">Temática Evaluada por el Tribunal</th>
          <th style="width: 35%;">Argumento Diferenciador del Autor</th>
          <th style="width: 15%;">Calificación</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Pregunta 1</strong></td>
          <td>Criptografía SHA-256, Amenaza del DBA Interno y Soberanía de Datos</td>
          <td>Política estricta de credenciales/privilegios nominales, migración de Firebase a servidores propios On-Premise antes de producción y Raíz de Merkle</td>
          <td><strong>9,5 / 10</strong><br />(6,8 Chile)</td>
        </tr>
        <tr>
          <td><strong>Pregunta 2</strong></td>
          <td>Alucinaciones de IA Generativa, Cálculo Tributario y EU AI Act</td>
          <td>Reconocimiento de no infalibilidad, contraste real con errores de digitación en planillas Excel, cálculo determinista y validación humana P43081</td>
          <td><strong>9,2 / 10</strong><br />(6,7 Chile)</td>
        </tr>
        <tr>
          <td><strong>Pregunta 3</strong></td>
          <td>Resistencia al Cambio, Contabilidad Paralela en Excel y ROI</td>
          <td>Uso de marcha blanca paralela para validación, <strong>Protocolo Sombra</strong> in situ, <strong>Protocolo de Empoderamiento</strong> y Manuales ISO 9001</td>
          <td><strong>9,2 / 10</strong><br />(6,7 Chile)</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align: right;"><strong>PROMEDIO FINAL DEL SIMULACRO N° 1:</strong></td>
          <td><strong>9,3 / 10</strong><br />(6,7 Chile)</td>
        </tr>
      </tbody>
    </table>
  `;

  downloadWordDocFromHtml(
    'SIMULACRO DE EXAMEN DE GRADO N° 1: ARQUITECTURA, GOBERNANZA IA Y GESTIÓN DEL CAMBIO — EBIS BUSINESS TECH SCHOOL',
    content,
    'Simulacro_1_Examen_Grado_TFM_EBIS_Arquitectura_IA_2026',
    'SGC-ACA-TFM-006-A',
    'Simulacro N° 1 (Nota: 9,3 / 10)'
  );
};

// ============================================================================
// 6B. SIMULACRO DE EXAMEN DE GRADO N° 2 (DOCUMENTO INDIVIDUAL — SGC-ACA-TFM-006-B)
// ============================================================================
export const generateExamSimulation2Word = () => {
  const content = `
    <h1>1. FICHA DEL SIMULACRO DE EXAMEN DE GRADO N° 2</h1>
    <p>
      El presente documento transcribe de manera íntegra el <strong>Segundo Simulacro de Examen de Grado y Defensa del Trabajo Final para Optar al Grado de Magíster en Inteligencia Artificial, Derecho Digital y Blockchain</strong> realizado para el proyecto <strong>AssetFlow Enterprise (Estándar AssetFlow Enterprise 9.11)</strong> ante el Tribunal Evaluador simulado de <strong>EBIS Business Tech School</strong>.
    </p>

    <div class="success-box">
      <strong>ACTA DE CALIFICACIÓN — SIMULACRO DE DEFENSA N° 2:</strong><br />
      • <strong>Enfoque Evaluado:</strong> Casos Prácticos de Auditoría Forense (Fraccionamiento / Ley de Benford), Derecho Digital (Acta Check-Out y Ley N° 21.719) y Continuidad Operacional TI (DORA).<br />
      • <strong>Calificación Final Obtenida:</strong> <strong>9,8 / 10</strong> (Escala Europea EBIS — Sobresaliente con Mención Matrícula de Honor) | Equivalente Escala Chilena: <strong>6,9 / 7,0</strong>.
    </div>

    <h1>2. DESARROLLO DE LOS CASOS PRÁCTICOS Y RESPUESTAS DEL SIMULACRO N° 2</h1>

    <h2>2.1 Caso Práctico N° 1: Fraccionamiento de Órdenes de Trabajo (Smurfing) y Riesgo Tributario</h2>
    <div class="note-box">
      <strong>Pregunta del Tribunal:</strong><br />
      «Supongamos que un Jefe de Mantención necesita reparar una techumbre por $12.000.000, pero para eludir la firma de Gerencia General y las tres cotizaciones que exige la ruta jerárquica (<code>P43008</code>), decide dividir el trabajo en tres órdenes distintas de $4.000.000 emitidas la misma semana al mismo proveedor. ¿Qué mecanismos tiene su sistema para detectar o frenar esta maniobra de fraccionamiento, y por qué es tan grave cuando además mezclan Facturas con IVA y Boletas de Honorarios?»
    </div>

    <h3>Respuesta Original del Candidato (Experiencia Real en Control Interno + Ley de Benford)</h3>
    <p>
      <em>«Muchas gracias por esa pregunta. Es curioso que lo plantee de esa forma ya que en mi experiencia como Control Interno del departamento inmobiliario me tocó vivir esta experiencia, la cual reporté inmediatamente a la Gerencia y al departamento de Compliance. Si bien el sistema facilita el análisis de los datos de tal forma que no estén dispersos en varias planillas Excel —que fue lo que pasó en la realidad, donde afortunadamente tengo buena memoria y recordaba el caso que me llamó particularmente la atención—, además el sistema cuenta con un módulo de análisis estadístico (Análisis de Benford) para detectar ese tipo de desviaciones.»</em>
    </p>

    <h3>Respuesta Consolidada de Alto Impacto (Voz del Autor + Herramientas del Sistema)</h3>
    <p>
      <em>«Muchas gracias por esa pregunta, profesor. Es curioso que plantee exactamente ese caso, porque en mi experiencia real como Control Interno del departamento inmobiliario me tocó vivir esa misma situación en carne propia, la cual detecté y reporté de inmediato a la Gerencia y a Compliance. En aquel entonces fue difícil de detectar porque los datos estaban dispersos en varias planillas Excel distintas y lo descubrí gracias a que tengo buena memoria.</em>
    </p>
    <p>
      <em>Este sistema resuelve ese problema de raíz: primero, elimina la dispersión del Excel centralizando todas las órdenes bajo el RUT del proveedor (F0101), el inmueble y los campos obligatorios de Categoría y Especialidad (ej. Techumbres), permitiendo ver el acumulado en segundos dentro del Inspector P43081. Segundo, el sistema incorpora un módulo de Análisis Estadístico Forense basado en la <strong>Ley de Benford</strong> (P09BEN) y alertas de fraccionamiento UAF: cuando alguien divide artificialmente un cobro de 12 millones en tres órdenes de 4 millones para burlar un tope jerárquico, altera la frecuencia natural del primer dígito y el gráfico de Benford levanta la alerta de desviación de inmediato. Además, identificar obligatoriamente el documento tributario evita que mezclen Facturas con IVA (19%, D.L. 825) y Boletas de Honorarios (Retención Ley 21.133) para distorsionar el crédito fiscal o eludir controles previsionales.»</em>
    </p>

    <h2>2.2 Caso Práctico N° 2: Ejecución de Garantía de Arriendo y Excepción al "Derecho al Olvido" (Ley N° 21.719)</h2>
    <div class="note-box">
      <strong>Pregunta del Tribunal:</strong><br />
      «Un arrendatario comercial entrega un local con graves daños y la inmobiliaria ejecuta su Garantía de Arriendo mediante Órdenes de Trabajo. El ex-arrendatario amenaza con demandar alegando que los costos fueron inventados a última hora e invoca la Ley de Protección de Datos Personales (Ley N° 21.719 / "Derecho al Olvido") exigiendo borrar inmediatamente su RUT, su contrato y todo su historial del ERP. ¿Cómo defiende a la inmobiliaria con su sistema y qué responde a la exigencia de borrar sus datos?»
    </div>

    <h3>Respuesta Original del Candidato en el Examen</h3>
    <p>
      <em>«Muchas gracias profesora, responderé en dos partes. Primero, el sistema contempla un <strong>Acta de Check-Out</strong>, la cual es presentada al arrendatario y firmada por este en caso de estar conforme; el hecho de que el Acta de Check-Out no se firme conforme implica que la propiedad no pasará a un estado de disponibilidad para un nuevo arrendatario. En cuanto a la solicitud de derecho al olvido, cabe señalar que el proyecto de ley fue observado y eliminada esa parte, por lo tanto la ley debería entrar en vigencia no considerando ese aspecto; pero aun así, los datos quedan guardados para consultas futuras en caso de auditorías.»</em>
    </p>

    <h3>Respuesta Consolidada de Alto Impacto (Candado Operativo Check-Out + Prevalencia Tributaria/Auditoría)</h3>
    <p>
      <em>«Responderé en dos partes, profesora. Primero, respecto a la transparencia del descuento de garantía: el sistema contempla un <strong>Acta de Check-Out (Restitución Física P1501RV)</strong> vinculada a la liquidación de la garantía (P1540) y a las Órdenes de Trabajo con sus facturas y sellos de tiempo en la cadena de bloques. El sistema impone un candado operativo estricto: mientras el Acta de Check-Out no esté firmada conforme y cerrada, <strong>la propiedad queda retenida y no pasa al estado de "Disponible" para un nuevo arrendatario</strong>. Eso obliga a documentar y sellar toda la evidencia en el instante mismo de la entrega, haciendo imposible inventar cobros posteriores.</em>
    </p>
    <p>
      <em>Segundo, respecto al llamado "Derecho al Olvido" en la Ley N° 21.719: cabe precisar que durante la tramitación legislativa chilena ese concepto amplio fue observado y acotado, quedando regulado como un derecho de supresión sujeto a excepciones legales expresas. Y aun así, tanto en Chile como en Europa, ningún titular puede exigir la eliminación de sus datos cuando existe un deber legal de conservación: por el Artículo 17 del Código Tributario y las normas de la UAF, los registros contables, contratos, RUTs y respaldos deben guardarse obligatoriamente en el sistema para consultas futuras en caso de auditorías y fiscalizaciones del SII.»</em>
    </p>

    <h2>2.3 Caso Práctico N° 3: Caída del Servidor Central en Día de Cierre de Mes (Continuidad Operacional y DORA)</h2>
    <div class="note-box">
      <strong>Pregunta del Tribunal:</strong><br />
      «¿Cómo se ejecuta el Plan de Continuidad del Negocio si el día de cierre de mes se cae la red o falla el servidor central de la empresa?»
    </div>

    <h3>Respuesta Original del Candidato en el Examen</h3>
    <p>
      <em>«El equipo de TI tiene la obligación contractual de hacer mantenimiento preventivo a servidores y UPS, por lo que si falla, el mismo equipo de TI tiene el deber de elaborar un plan de contingencia adecuado para sostener las operaciones del tiempo offline.»</em>
    </p>

    <h3>Respuesta Consolidada de Alto Impacto (SLA Contractual de TI + Motor Híbrido Offline-First)</h3>
    <p>
      <em>«Señor Director, la continuidad operacional en cierre de mes descansa tanto en la gobernanza contractual de TI como en la arquitectura resiliente del software. En el plano organizacional, el equipo de TI tiene la <strong>obligación contractual estricta de ejecutar el mantenimiento preventivo periódico de los servidores corporativos y de los sistemas de energía ininterrumpida (UPS)</strong>, además del deber formal de activar su Plan de Contingencia y Recuperación ante Desastres (DRP) para sostener las operaciones durante cualquier ventana offline.</em>
    </p>
    <p>
      <em>Y en el plano técnico, para respaldar esa contingencia durante el tiempo offline, el motor de almacenamiento de AssetFlow Enterprise (StorageEngine) opera con una arquitectura híbrida Offline-First: mantiene una réplica local inmediata en el navegador mediante IndexedDB y respaldo físico en disco (.json). Si el servidor central cae en pleno cierre, el usuario sigue operando localmente sin perder sus registros ni romper la cadena SHA-256, sincronizando todo automáticamente apenas TI restablece el servidor principal.»</em>
    </p>

    <h1>3. TABLA DE EVALUACIÓN — SIMULACRO DE EXAMEN DE GRADO N° 2</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th style="width: 18%;">Caso Práctico</th>
          <th style="width: 32%;">Temática Evaluada por el Tribunal</th>
          <th style="width: 35%;">Argumento Diferenciador del Autor</th>
          <th style="width: 15%;">Calificación</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Caso 1</strong></td>
          <td>Fraccionamiento de Órdenes de Trabajo (Smurfing) y Fraude Tributario</td>
          <td>Caso real vivido y reportado en Control Interno Inmobiliario; centralización de datos frente al Excel disperso y <strong>Análisis Estadístico de Benford</strong></td>
          <td><strong>10,0 / 10</strong><br />(7,0 Chile)</td>
        </tr>
        <tr>
          <td><strong>Caso 2</strong></td>
          <td>Litigio por Garantía de Arriendo y Derecho al Olvido (Ley 21.719)</td>
          <td>Candado del <strong>Acta de Check-Out</strong> (bloquea paso a Disponible si no se firma conforme), observación legislativa al Derecho al Olvido y retención para auditorías</td>
          <td><strong>9,8 / 10</strong><br />(6,9 Chile)</td>
        </tr>
        <tr>
          <td><strong>Caso 3</strong></td>
          <td>Caída de Servidor en Cierre de Mes y Resiliencia DORA</td>
          <td>Obligación contractual de TI en mantenimiento preventivo de servidores/UPS y plan de contingencia offline apoyado en persistencia híbrida local</td>
          <td><strong>9,7 / 10</strong><br />(6,9 Chile)</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align: right;"><strong>PROMEDIO FINAL DEL SIMULACRO N° 2:</strong></td>
          <td><strong>9,8 / 10</strong><br />(6,9 Chile)</td>
        </tr>
      </tbody>
    </table>
  `;

  downloadWordDocFromHtml(
    'SIMULACRO DE EXAMEN DE GRADO N° 2: AUDITORÍA FORENSE, DERECHO DIGITAL Y CONTINUIDAD — EBIS BUSINESS TECH SCHOOL',
    content,
    'Simulacro_2_Examen_Grado_TFM_EBIS_Forense_Derecho_2026',
    'SGC-ACA-TFM-006-B',
    'Simulacro N° 2 (Nota: 9,8 / 10)'
  );
};

// ============================================================================
// 6C. SIMULACRO DE EXAMEN DE GRADO N° 3 (DOCUMENTO INDIVIDUAL — SGC-ACA-TFM-006-C)
// ============================================================================
export const generateExamSimulation3Word = () => {
  const content = `
    <h1>1. FICHA DEL SIMULACRO DE EXAMEN DE GRADO N° 3</h1>
    <p>
      El presente documento transcribe de manera íntegra el <strong>Tercer Simulacro de Examen de Grado y Defensa del Trabajo Final para Optar al Grado de Magíster en Inteligencia Artificial, Derecho Digital y Blockchain</strong> realizado para el proyecto <strong>AssetFlow Enterprise (Estándar AssetFlow Enterprise 9.11)</strong> ante el Tribunal Evaluador simulado de <strong>EBIS Business Tech School</strong>, evaluando el sistema con sus últimas actualizaciones en vivo.
    </p>

    <div class="success-box">
      <strong>ACTA DE CALIFICACIÓN — SIMULACRO DE DEFENSA N° 3:</strong><br />
      • <strong>Enfoque Evaluado:</strong> Caso Real del Departamento Inmobiliario de Mutucar (4 Observaciones de Auditoría y Levantamiento de Suspensión CMF), Control de Cobros de Arriendo, Blindaje de Privilegios (<code>P98OWSEC</code>) y Gobernanza del Asistente de Tareas IA (<code>P0001</code>).<br />
      • <strong>Calificación Final Obtenida:</strong> <strong>9,6 / 10</strong> (Escala Europea EBIS — Sobresaliente Cum Laude) | Equivalente Escala Chilena: <strong>6,8 / 7,0</strong>.
    </div>

    <h1>2. DESARROLLO DE LAS PREGUNTAS Y RESPUESTAS DEL SIMULACRO N° 3</h1>

    <h2>2.1 Pregunta N° 1 del Tribunal (Presidente del Tribunal — Regulación CMF, Observaciones de Auditoría y Control de Cobros de Arriendo)</h2>
    <div class="note-box">
      <strong>Pregunta del Tribunal:</strong><br />
      «En el Capítulo I de su memoria usted declara que este sistema nació para concentrar los datos dispersos del Departamento Inmobiliario de Mutucar y que su implementación permitió subsanar 4 observaciones de auditoría y levantar una suspensión por parte de la Comisión para el Mercado Financiero (CMF). Si yo fuera el fiscalizador de la CMF o el socio de auditoría externa sentado hoy frente a su pantalla: ¿cuáles eran, en esencia, esas debilidades de control que tenían cuando trabajaban con planillas Excel sueltas, y qué candados específicos puso usted en su sistema para que los usuarios ya no puedan saltarse los requisitos mínimos de auditoría?»
    </div>

    <h3>Respuesta del Candidato en el Examen (Estilo Propio y Experiencia Real en Mutucar)</h3>
    <p>
      <em>«Muchas gracias por su pregunta y paso a detallar específicamente en qué consistían las observaciones de auditoría que este sistema ayudó a subsanar: primero que todo, el cobro de arriendo de propiedades se hacía manual y era muy propenso a errores de digitación; en cambio ahora, en el sistema cada cobro de arriendo el sistema lo contrasta con su respectivo contrato, fechas, montos, etcétera. Además, el sistema tiene la funcionalidad de enviar por correo a cada arrendatario un correo de cobro individual adjuntando un comprobante en PDF que es revisado y contrastado por el ejecutivo de arriendos contra una base de datos que el sistema emite en Excel; así se verifica manualmente que los cobros sean realizados correctamente por el sistema.»</em>
    </p>

    <h3>Feedback del Tribunal (Nota Parcial: 9,6 / 10)</h3>
    <p>
      El Tribunal destacó que esta respuesta aterriza directamente en un proceso crítico de aseguramiento de ingresos (<em>Revenue Assurance</em>) mediante un <strong>Control Híbrido Preventivo-Detectivo</strong>: primero, un control preventivo de aplicación que cruza cada cobro contra los parámetros maestros del contrato vigente; segundo, la emisión estandarizada de un comprobante PDF individual por correo para cada arrendatario; y tercero, un control detectivo de cuadratura (<em>Maker-Checker</em>) donde el ejecutivo de arriendos contrasta el PDF contra la base de datos en Excel emitida por el sistema, complementado con los candados en Órdenes de Trabajo (categoría, especialidad y factura asociada), Debida Diligencia y Actas de Check-Out.
    </p>

    <h2>2.2 Pregunta N° 2 del Tribunal (Vocal Técnico — Ciberseguridad, Privilegios Limitados e Inmutabilidad de la Lógica Interna)</h2>
    <div class="note-box">
      <strong>Pregunta del Tribunal:</strong><br />
      «¿Qué ocurre en su sistema si un usuario interno con credenciales válidas —por ejemplo, un operador de mantenimiento o un analista— intenta modificar o borrar un registro contable ya validado, o intenta cambiar sus propios permisos desde su sesión? ¿Cómo garantiza su arquitectura actual (entre el Frontend, el Centro de Seguridad <code>P98OWSEC</code> y la base de datos) la segregación de funciones y la trazabilidad forense de quién hizo qué y cuándo?»
    </div>

    <h3>Respuesta del Candidato en el Examen</h3>
    <p>
      <em>«Para responder esa pregunta primero debo aclarar que cada usuario en el sistema tiene privilegios limitados a sus funciones, y accesos globulares que sólo le permiten actuar con el sistema de tal forma que no pueda modificar la lógica interna de todo el sistema aunque tenga accesos de administrador del sistema.»</em>
    </p>

    <h3>Feedback del Tribunal (Nota Parcial: 9,5 / 10)</h3>
    <p>
      El Tribunal valoró la distinción entre el <strong>Principio de Mínimo Privilegio (RBAC)</strong> —donde cada usuario tiene accesos acotados estrictamente a su función operativa— y la <strong>Inmutabilidad de la Lógica de Negocio frente al Administrador (<em>Hardcoded Governance</em>)</strong>, que impide el <em>Management Override of Controls</em> (ni siquiera un administrador del sistema puede alterar las reglas contables o tributarias internas), quedando además todo evento sellado en la Bitácora Forense Inmutable SHA-256 (<code>P98OWSEC</code> / <code>F4209</code>).
    </p>

    <h2>2.3 Pregunta N° 3 del Tribunal (Vocal de IA y Operaciones — Asistente de Tareas IA vs. Cálculo Tributario Determinista)</h2>
    <div class="note-box">
      <strong>Pregunta del Tribunal:</strong><br />
      «Usted incorporó el módulo <strong>Asistente de Tareas IA (<code>P0001</code>)</strong> impulsado por Google Gemini para priorizar automáticamente las tareas del TaskCenter según fechas de vencimiento y criticidad de las Órdenes de Trabajo. ¿Por qué decidió que la Inteligencia Artificial sí puede priorizar tareas operativas o redactar resúmenes ejecutivos, pero le prohibió terminantemente calcular el IVA, las retenciones del 13,75% de boletas de honorarios o los saldos del Libro Mayor <code>F0911</code>?»
    </div>

    <h3>Respuesta del Candidato en el Examen</h3>
    <p>
      <em>«Muchas gracias por su pregunta. Primero debo aclarar que la IA en este sistema es una herramienta de apoyo y no una entidad operadora, además le quité a la IA la capacidad de calcular impuestos para así minimizar los llamados errores de punto flotante; y como mencioné en el informe, el sistema cumple una función organizativa de los datos que anteriormente estaban dispersos en el departamento y no conversaban entre sí.»</em>
    </p>

    <h3>Feedback del Tribunal (Nota Parcial: 9,6 / 10)</h3>
    <p>
      El Tribunal calificó como sobresaliente la definición de Gobernanza de IA bajo el principio <em>Human-in-the-Loop</em> (<strong>«la IA es una herramienta de apoyo y no una entidad operadora»</strong>), así como la decisión técnica de sustraer el cálculo de impuestos del modelo probabilístico para evitar desviaciones numéricas y errores de punto flotante, manteniendo la función central del sistema: organizar y conectar datos que antes estaban dispersos en el Departamento Inmobiliario de Mutucar y no conversaban entre sí.
    </p>

    <h1>3. TABLA DE EVALUACIÓN — SIMULACRO DE EXAMEN DE GRADO N° 3</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th style="width: 18%;">Dimensión / Pregunta</th>
          <th style="width: 32%;">Temática Evaluada por el Tribunal</th>
          <th style="width: 35%;">Argumento Diferenciador del Autor</th>
          <th style="width: 15%;">Calificación</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Revisión de Sistema y Memoria</strong></td>
          <td>Coherencia de Capítulos I y II, Login blindado y Módulo Asistente IA P0001</td>
          <td>Caso real del Depto. Inmobiliario de Mutucar (4 observaciones de auditoría y levantamiento de suspensión CMF)</td>
          <td><strong>9,8 / 10</strong><br />(6,9 Chile)</td>
        </tr>
        <tr>
          <td><strong>Pregunta 1</strong></td>
          <td>Observaciones de Auditoría en Mutucar, CMF y Control de Cobros de Arriendo</td>
          <td>Contraste automático de cada cobro de arriendo contra su contrato + envío de correo individual con comprobante PDF + cuadratura del ejecutivo contra base Excel</td>
          <td><strong>9,6 / 10</strong><br />(6,8 Chile)</td>
        </tr>
        <tr>
          <td><strong>Pregunta 2</strong></td>
          <td>Segregación de Funciones, Privilegios y Blindaje de la Lógica Interna</td>
          <td>Privilegios limitados a las funciones de cada usuario e imposibilidad de alterar la lógica interna del sistema incluso con accesos de administrador</td>
          <td><strong>9,5 / 10</strong><br />(6,8 Chile)</td>
        </tr>
        <tr>
          <td><strong>Pregunta 3</strong></td>
          <td>Asistente de Tareas IA (P0001) vs. Cálculo Determinista de Impuestos</td>
          <td>La IA como herramienta de apoyo y no entidad operadora; exclusión del cálculo de impuestos para minimizar errores de punto flotante e integración de datos dispersos</td>
          <td><strong>9,6 / 10</strong><br />(6,8 Chile)</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align: right;"><strong>PROMEDIO FINAL DEL SIMULACRO N° 3:</strong></td>
          <td><strong>9,6 / 10</strong><br />(6,8 Chile)</td>
        </tr>
      </tbody>
    </table>
  `;

  downloadWordDocFromHtml(
    'SIMULACRO DE EXAMEN DE GRADO N° 3: AUDITORÍA CMF MUTUCAR, SEGURIDAD Y ASISTENTE IA — EBIS BUSINESS TECH SCHOOL',
    content,
    'Simulacro_3_Examen_Grado_TFM_EBIS_Mutucar_CMF_IA_2026',
    'SGC-ACA-TFM-006-C',
    'Simulacro N° 3 (Nota: 9,6 / 10)'
  );
};

// Función auxiliar de compatibilidad que descarga los 3 simulacros individuales
export const generateGraduationExamSimulationsWord = () => {
  generateExamSimulation1Word();
  setTimeout(() => generateExamSimulation2Word(), 350);
  setTimeout(() => generateExamSimulation3Word(), 700);
};

// ============================================================================
// 7. MANUAL REGULATORIO CMF: INFORME B.4 & NOTA 14 (NIC 40 / NCG 316)
// ============================================================================
export const generateNote14AndB4ManualWord = () => {
  const content = `
    <!-- ÍNDICE GENERAL DE MATERIAS Y PROCEDIMIENTOS CMF -->
    <div style="page-break-after: always; margin-bottom: 30pt;">
      <h1 style="color: #002D62; border-bottom: 3px solid #059669; padding-bottom: 6px; margin-top: 10pt; margin-bottom: 12pt; font-size: 16pt;">
        ÍNDICE GENERAL DE MATERIAS Y PROCEDIMIENTOS CMF (ISO 9001:2015)
      </h1>
      <p style="font-size: 10pt; color: #475569; font-style: italic; margin-bottom: 14pt;">
        Estructura del Manual de Cumplimiento Regulatorio, Cierre IFRS y Conciliación Pericial (NCG 316 / NIC 40)
      </p>

      <table class="iso-table" style="width: 100%; margin-bottom: 20pt;">
        <thead>
          <tr style="background-color: #002D62; color: #ffffff;">
            <th style="width: 15%; text-align: center;">Sección</th>
            <th style="width: 55%;">Materia / Procedimiento Regulatorio</th>
            <th style="width: 30%; text-align: center;">Norma / Módulo ERP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 1</td>
            <td><strong>Objetivo del Manual:</strong> Procedimientos operativos, criterios IFRS y validaciones matemáticas normadas bajo ISO 9001:2015.</td>
            <td style="text-align: center; font-family: monospace;">ISO 9001 / CMF</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 2</td>
            <td><strong>Alcance y Campo de Aplicación:</strong> Cartera urbana y no urbana, involucrando analistas, operaciones, control interno y finanzas.</td>
            <td style="text-align: center; font-family: monospace;">ASSETFLOW S.A.</td>
          </tr>
          <tr>
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 3</td>
            <td><strong>Marco Normativo Aplicable:</strong> Circular CMF N° 1.835, NCG 316 CMF, NIC 40, NIIF 13 y Art. 31 DL 824 LIR.</td>
            <td style="text-align: center; font-family: monospace;">CMF / SII / IFRS</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 4</td>
            <td><strong>Descripción de Programas Regulatorios CMF:</strong> R09322 (Informe B.4 mensual) y R09323 (Nota 14 trimestral) + Regla de Oro de Conciliación Obligatoria.</td>
            <td style="text-align: center; font-family: monospace;">R09322 / R09323</td>
          </tr>
          <tr>
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 5</td>
            <td><strong>Metodología del Informe B.4 CMF (R09322):</strong> Desglose NCG 316 (Terreno no depreciable vs Construcción), paginación FDA y exportación oficial.</td>
            <td style="text-align: center; font-family: monospace;">Circular 1.835</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 6</td>
            <td><strong>Metodología de Construcción de la Nota 14 (R09323):</strong> Cuadro 1 (Roll-Forward 2 años), Cuadro 2 (NOI NIC 40 §75f), Cuadro 3 (Nómina) y Cuadro 4 (Gravámenes CBR).</td>
            <td style="text-align: center; font-family: monospace;">NIC 40 / NCG 316</td>
          </tr>
          <tr>
            <td style="font-weight: bold; text-align: center; color: #002D62;">Sección 7</td>
            <td><strong>Control de Registros de Calidad:</strong> Matriz de retención documental, soporte digital en Firestore y responsables de custodia institucional.</td>
            <td style="text-align: center; font-family: monospace;">ISO 9001 §7.5</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h1>1. OBJETIVO</h1>
    <p>
      Establecer los procedimientos operativos, criterios contables IFRS y validaciones matemáticas normadas bajo el estándar <strong>ISO 9001:2015</strong> para la confección, cuadre y emisión del <strong>Informe B.4 mensual</strong> y de la <strong>Nota 14 trimestral (Propiedades de Inversión)</strong> remitidos a la <strong>Comisión para el Mercado Financiero (CMF)</strong>, garantizando el cumplimiento de la <strong>Circular CMF N° 1.835</strong>, la <strong>Norma de Carácter General N° 316 (NCG 316)</strong> y las normas <strong>NIC 40 / NIIF 13</strong>.
    </p>

    <h1>2. ALCANCE Y CAMPO DE APLICACIÓN</h1>
    <p>
      Aplica a la totalidad de los inmuebles urbanos y no urbanos de la cartera inmobiliaria de <strong>ASSETFLOW S.A. - Corporación de Seguros</strong> (Compañías de Seguros de Vida y Seguros Generales), involucrando a los analistas inmobiliarios, jefatura de operaciones, auditores de control interno y gerencia de finanzas.
    </p>

    <h1>3. MARCO NORMATIVO APLICABLE</h1>
    <ul>
      <li><strong>Circular CMF N° 1.835:</strong> Normas para la valorización y envío de información sobre inversiones inmobiliarias que respaldan Reservas Técnicas de seguros.</li>
      <li><strong>Norma de Carácter General N° 316 (NCG 316 CMF):</strong> Obligación de desagregar la valorización contable entre <strong>Terreno (No Depreciable)</strong> y <strong>Construcción / Edificaciones (Depreciable)</strong>.</li>
      <li><strong>NIC 40 (IAS 40 - Propiedades de Inversión):</strong> Criterios de reconocimiento, medición inicial al costo y medición posterior bajo el <em>Modelo del Valor Razonable</em>.</li>
      <li><strong>NIIF 13 (Medición del Valor Razonable):</strong> Jerarquía de precios observables (Nivel 2) y modelos de descuento de flujos (Nivel 3).</li>
      <li><strong>Decreto Ley N° 824 (Art. 31 LIR):</strong> Tratamiento tributario del ajuste a valor razonable (ingreso financiero no renta para el IDPC hasta su enajenación).</li>
    </ul>

    <h1>4. DESCRIPCIÓN DE PROGRAMAS REGULATORIOS CMF</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Programa ERP</th>
          <th>Nombre Oficial</th>
          <th>Frecuencia</th>
          <th>Objetivo Regulatorio y Formato</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="badge-jde">R09322</span></td>
          <td>Informe B.4 CMF (Bienes Raíces)</td>
          <td>Mensual (Día 20)</td>
          <td>Reporte detallado bien por bien con Rol SII, destino, canon, tasación pericial y desglose NCG 316 (Terreno no depreciable vs Construcción). Paginación FDA optimizada.</td>
        </tr>
        <tr>
          <td><span class="badge-jde">R09323</span></td>
          <td>Nota 14: Propiedades de Inversión</td>
          <td>Trimestral (FECU)</td>
          <td>Nota estructurada de revelación a los Estados Financieros: Conciliación Roll-Forward de 2 años, Resultado Operativo Neto (NOI), Cartera Analítica y Gravámenes. Archivo Excel (.xlsx) con 5 hojas.</td>
        </tr>
      </tbody>
    </table>

    <div class="warning-box">
      <strong>REGLA DE ORO DE CONCILIACIÓN OBLIGATORIA (CUADRE MENSUAL VS. TRIMESTRAL):</strong><br />
      Dado que el Informe B.4 se reporta mensualmente y la Nota 14 se emite trimestralmente, <strong>al cierre de cada trimestre (31 de Marzo, 30 de Junio, 30 de Septiembre y 31 de Diciembre) los valores informados en la Nota 14 deben coincidir matemáticamente al peso con la suma del Informe B.4 del mes de cierre respectivo</strong>. Los auditores externos y la CMF rechazarán cualquier presentación con descuadraturas entre ambos instrumentos.
    </div>

    <h1>5. METODOLOGÍA DEL INFORME B.4 CMF (R09322)</h1>
    <p>
      El usuario ingresa a través del menú <em>Informes de Cierre &amp; Gobierno -&gt; Informe B.4 CMF</em>:
    </p>
    <ol>
      <li><strong>Selección de Entidad y Periodo:</strong> Seleccionar la compañía de seguros (VIDA, GENERALES o CONSOLIDADO) y el mes correspondiente.</li>
      <li><strong>Desglose NCG 316:</strong> El sistema calcula automáticamente la proporción Terreno / Construcción según los avalúos vigentes del Servicio de Impuestos Internos (SII). Se certifica que sobre los terrenos no se aplique depreciación acumulada.</li>
      <li><strong>Paginación FDA:</strong> La grilla permite navegar en bloques de 25, 50, 100 o visualizar la cartera completa con un rendimiento superior (reducción del 74% de la carga de memoria DOM).</li>
      <li><strong>Exportación CMF:</strong> Presionar el botón <code>Exportar B.4 Oficial CMF (.xlsx)</code> para emitir la planilla con la estructura exacta exigida por el regulador.</li>
    </ol>

    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: INFORME B.4 CMF CON SEPARACIÓN TERRENO/EDIFICACIÓN NCG 316]</div>
      <div class="screenshot-box-desc">Instrucción: Pegar captura del módulo B.4 mostrando la barra de herramientas, la grilla paginada y los totales consolidados.</div>
    </div>

    <h1>6. METODOLOGÍA DE CONSTRUCCIÓN DE LA NOTA 14 (R09323)</h1>
    <p>
      La Nota 14 consta de 4 cuadros analíticos normados:
    </p>

    <h2>6.1 Cuadro 1: Conciliación de Movimientos (Roll-Forward Matrix)</h2>
    <p>
      Evolución patrimonial entre el 1 de enero y el cierre trimestral por clases de activos (Terrenos, Edificios, Obras en Desarrollo y Total):
    </p>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Línea de Movimiento</th>
          <th>Criterio Contable NIC 40</th>
          <th>Imputación Financiera</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Saldo Inicial al 1 de enero</td>
          <td>Valor razonable al cierre del año previo</td>
          <td>Balance General</td>
        </tr>
        <tr>
          <td>(+) Adquisiciones e Incorporaciones</td>
          <td>Costo de compra más gastos de transacción directos</td>
          <td>Flujo de Inversión</td>
        </tr>
        <tr>
          <td>(+) Desembolsos Posteriores (CAPEX)</td>
          <td>Mejoras que incrementan la vida útil o capacidad de renta</td>
          <td>Capitalización Activo</td>
        </tr>
        <tr>
          <td>(-) Enajenaciones y Retiros</td>
          <td>Ventas efectivas o bajas de inventario inmobiliario</td>
          <td>Baja de Activo</td>
        </tr>
        <tr>
          <td>(+/-) Ajuste a Valor Razonable</td>
          <td>Variación neta surgida de tasaciones independientes CMF</td>
          <td><strong>Estado de Resultados</strong></td>
        </tr>
        <tr>
          <td>Saldo Final al Cierre</td>
          <td>Valor razonable de la cartera a la fecha de balance</td>
          <td>Balance General</td>
        </tr>
      </tbody>
    </table>

    <h2>6.2 Cuadro 2: Ingresos por Arrendamiento y Gastos Operacionales (NOI)</h2>
    <p>
      Conforme a <strong>NIC 40 §75(f)</strong>, se revelan separadamente:
    </p>
    <ul>
      <li><strong>Ingresos por Renta:</strong> Reconocidos linealmente según contratos de arriendo vigentes.</li>
      <li><strong>Gastos Inmuebles Ocupados:</strong> Costos directos de mantención técnica, contribuciones y seguros correspondientes a predios que generaron rentas.</li>
      <li><strong>Gastos Inmuebles Vacantes:</strong> Costos de preservación de unidades desocupadas en proceso de colocación.</li>
      <li><strong>Margen Operacional Neto (NOI):</strong> Indicador de rentabilidad pura del portafolio inmobiliario antes de revalorizaciones periciales.</li>
    </ul>

    <h2>6.3 Cuadro 3: Nómina Analítica y Cuadro 4: Gravámenes</h2>
    <p>
      La nómina detalla cada Rol individual, comuna, superficie de terreno y construida, valor libro, valor de tasación CMF y arrendatario. El cuadro de gravámenes lista las hipotecas y prohibiciones inscritas en el Conservador de Bienes Raíces (CBR) que garantizan obligaciones o respaldan Reservas Técnicas de seguros.
    </p>

    <div class="screenshot-box">
      <div class="screenshot-box-title">📷 [PEGAR CAPTURA AQUÍ: MÓDULO NOTA 14 CON LOS 4 CUADROS OFICIALES Y EXCEL MULTICAPA]</div>
      <div class="screenshot-box-desc">Instrucción: Pegar captura del módulo de Nota 14 mostrando la conciliación de saldos y las opciones de exportación a Excel (.xlsx).</div>
    </div>

    <h1>7. CONTROL DE REGISTROS DE CALIDAD (ISO 9001)</h1>
    <table class="iso-table">
      <thead>
        <tr>
          <th>Código Registro</th>
          <th>Nombre del Registro</th>
          <th>Soporte / Almacenamiento</th>
          <th>Tiempo Retención</th>
          <th>Responsable Custodia</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>REG-CMF-B4</td>
          <td>Planilla Mensual Informe B.4 (R09322)</td>
          <td>Servidor Seguro / CMF SEIL</td>
          <td>10 Años</td>
          <td>Jefe de Operaciones Inmobiliarias</td>
        </tr>
        <tr>
          <td>REG-CMF-N14</td>
          <td>Nota 14 y Papeles de Trabajo Auditados</td>
          <td>Bóveda Digital F980011D / FECU</td>
          <td>10 Años</td>
          <td>Gerencia de Finanzas / Control Interno</td>
        </tr>
        <tr>
          <td>REG-CMF-TAS</td>
          <td>Informes de Tasación Pericial CMF</td>
          <td>Expediente Digital Inmueble</td>
          <td>5 Años (Mín. 24 meses vigencia)</td>
          <td>Analista de Tasaciones</td>
        </tr>
      </tbody>
    </table>
  `;

  downloadWordDocFromHtml(
    'MANUAL DE PROCEDIMIENTO REGULATORIO CMF: INFORME B.4 & NOTA 14 (NIC 40 / NCG 316)',
    content,
    'Manual_CMF_Informe_B4_Nota_14_NIC40_SGC_2026',
    'SGC-MAN-CMF-007',
    'Versión 4.2 / 2026'
  );
};

// ============================================================================
// 8. INFORME PERICIAL DE EVALUACIÓN PSICOLABORAL (SGC-RRHH-PSI-009)
// ============================================================================
export { downloadPsychologicalProfileWord as generatePsychologicalProfileWord } from './psychologicalProfileExport';


