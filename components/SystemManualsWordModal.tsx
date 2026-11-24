import React from 'react';
import { X, FileText, Download, BookOpen, ShieldCheck, FileSpreadsheet, Building2, HelpCircle, Sparkles, CheckCircle2, Link2 } from 'lucide-react';
import { 
  generateGeneralSystemManualWord, 
  generateTenantPortalManualWord, 
  generateDueDiligenceManualWord, 
  generateSecurityDepositManualWord,
  generateOrderApprovalBlockchainManualWord,
  generateNote14AndB4ManualWord,
  generateExamSimulation1Word,
  generateExamSimulation2Word,
  generateExamSimulation3Word
} from '../lib/wordManualsExport';
import { downloadMagisterThesisDocx } from '../lib/magisterThesisDocx';
import { downloadItDeploymentManualWord, downloadItDeploymentManualPdf } from '../lib/itDeploymentManualExport';
import { downloadPsychologicalProfileWord } from '../lib/psychologicalProfileExport';

interface SystemManualsWordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemManualsWordModal: React.FC<SystemManualsWordModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleDownloadAll = () => {
    downloadItDeploymentManualWord();
    setTimeout(() => generateGeneralSystemManualWord(), 250);
    setTimeout(() => generateNote14AndB4ManualWord(), 500);
    setTimeout(() => generateOrderApprovalBlockchainManualWord(), 750);
    setTimeout(() => generateTenantPortalManualWord(), 1000);
    setTimeout(() => generateDueDiligenceManualWord(), 1250);
    setTimeout(() => generateSecurityDepositManualWord(), 1500);
    setTimeout(() => downloadMagisterThesisDocx(), 1750);
    setTimeout(() => generateExamSimulation1Word(), 2000);
    setTimeout(() => generateExamSimulation2Word(), 2250);
    setTimeout(() => generateExamSimulation3Word(), 2500);
    setTimeout(() => downloadPsychologicalProfileWord(), 2750);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* HEADER MODAL */}
        <div className="bg-[#002D62] text-white p-6 border-b-4 border-emerald-500 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20 text-emerald-400">
              <BookOpen size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase font-mono tracking-widest bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-md">
                  Formato ISO 9001:2015 (.doc / Word) + TFM (.docx)
                </span>
                <span className="text-[10px] font-mono text-slate-300">SGC-ASSETFLOW / Bóveda Digital F980011D</span>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white mt-1">
                Manuales del Sistema AssetFlow ERP (ISO 9001) &amp; Tesis de Máster
              </h2>
              <p className="text-xs text-slate-200 mt-0.5 font-medium">
                Descargue los instructivos normados bajo estándar ISO 9001:2015, el Informe de Trabajo Final de Máster y cada uno de los 3 Simulacros de Examen de Grado en documentos Word individuales.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X size={22} />
          </button>
        </div>

        {/* BODY MODAL */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
          {/* BANNER RECOMENDACIONES DE USO */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5">
              <Sparkles size={20} />
            </div>
            <div className="space-y-1 text-xs text-slate-700">
              <h4 className="font-black text-blue-900 uppercase tracking-tight">
                Estructura Estandarizada ISO 9001:2015 (v4.0) en Microsoft Word
              </h4>
              <p className="leading-relaxed">
                Cada documento cuenta con la tabla de control documental ISO 9001 (Código SGC, Versión, Vigencia), cuadro de aprobación de firmas, matriz RACI de responsabilidades, control de registros de calidad y <strong>espacios prediseñados para capturas de pantalla</strong> del sistema en vivo.
              </p>
            </div>
          </div>

          {/* FEATURED: INFORME TRABAJO FINAL DE MÁSTER (.DOCX NATIVO OPENXML) + 3 SIMULACROS INDIVIDUALES */}
          <div className="bg-gradient-to-r from-slate-900 via-[#002D62] to-slate-900 border-2 border-emerald-400/80 rounded-2xl p-5 text-white shadow-lg flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-black uppercase bg-emerald-400 text-slate-950 px-2.5 py-0.5 rounded-md">
                    TRABAJO FINAL PARA OPTAR AL GRADO DE MAGÍSTER &amp; 3 SIMULACROS (EBIS)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 font-bold">
                    IA Generativa • Derecho Digital • Blockchain SHA-256
                  </span>
                </div>
                <h3 className="text-sm md:text-base font-black text-white leading-snug">
                  Trabajo Final para Optar al Grado de Magíster (.DOCX) + 3 Simulacros de Examen (.DOC)
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Descargue la Memoria Académica oficial para optar al grado de Magíster o cada uno de los tres Simulacros de Defensa de Grado por separado con sus respectivas preguntas, respuestas y actas de calificación (9,3/10, 9,8/10 y 9,6/10).
                </p>
              </div>
              <button
                onClick={() => downloadMagisterThesisDocx()}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Download size={16} />
                <span>Descargar Tesis (.DOCX)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/15">
              <button
                onClick={() => generateExamSimulation1Word()}
                className="px-3.5 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-300/40"
              >
                <Download size={14} />
                <span>Simulacro N° 1 (9,3/10 • .DOC)</span>
              </button>
              <button
                onClick={() => generateExamSimulation2Word()}
                className="px-3.5 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-300/40"
              >
                <Download size={14} />
                <span>Simulacro N° 2 (9,8/10 • .DOC)</span>
              </button>
              <button
                onClick={() => generateExamSimulation3Word()}
                className="px-3.5 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-300/40"
              >
                <Download size={14} />
                <span>Simulacro N° 3 (9,6/10 • .DOC)</span>
              </button>
            </div>
          </div>

          {/* GRID DE MANUALES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* DOCUMENTO EJECUTIVO DE PERSONAS: INFORME PERICIAL PSICOLABORAL */}
            <div className="bg-gradient-to-br from-white to-emerald-50/50 border-2 border-emerald-400 hover:border-emerald-600 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group md:col-span-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black uppercase bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                    SGC-RRHH-PSI-009 • PERITAJE PSICOLABORAL OFICIAL
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Dictamen: Idóneo sin reservas (10/10)</span>
                </div>
                <h3 className="text-sm md:text-base font-black text-slate-900 group-hover:text-emerald-800 transition-colors uppercase leading-snug">
                  Informe Pericial de Evaluación Psicolaboral &amp; Competencias Directivas de Cristian Muñoz Rojas
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Evaluación psicológica integral basada en incidentes críticos reales (STAR): detección y contención de irregularidades en mantenciones ($20M CLP), subsanación de 4 observaciones CMF y levantamiento de suspensión, gestión del cambio con operadores resistentes mediante el <strong>Protocolo Sombra</strong> y <strong>Protocolo de Empoderamiento</strong>, y ética de la IA bajo supervisión humana (Art. 14 EU AI Act).
                </p>
              </div>
              
              <button 
                onClick={downloadPsychologicalProfileWord}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer border border-emerald-800"
              >
                <Download size={15} />
                <span>Descargar Informe Psicolaboral Oficial (.docx / Word)</span>
              </button>
            </div>

            {/* MANUAL 1: ENTRENAMIENTO GENERAL */}
            <div className="bg-white border-2 border-slate-200 hover:border-indigo-400 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black uppercase bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                    SGC-MAN-ERP-001 • v7.0 (Con Índice)
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Editable Word</span>
                </div>
                <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors uppercase leading-snug">
                  1. Manual de Entrenamiento Integral AssetFlow ERP (v7.0)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Incluye <strong>Índice General ISO 9001:2015</strong>, arranque JAS FastBoot (&lt;15ms), Aprobaciones (P43081/F4209), OT (P48201), Ingesta (R15011Z1I), Postulantes (P15013), Contratos (P15012), <strong>Historial de Pagos (P1501HA)</strong>, Actas (P1501RV), Liquidaciones (P1540), Bóveda (F980011D) y <strong>Captura 13 con Drildown de Maestro de Conjuntos y Unidades</strong>.
                </p>
              </div>
              
              <button 
                onClick={generateGeneralSystemManualWord}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#002D62] hover:bg-[#001D42] text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer border border-blue-950"
              >
                <Download size={15} className="text-emerald-400" />
                <span>Descargar Manual General (.docx)</span>
              </button>
            </div>

            {/* MANUAL 5 (DESTACADO): APROBACIONES P43081 Y BLOCKCHAIN F4209 */}
            <div className="bg-white border-2 border-indigo-200 hover:border-indigo-500 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black uppercase bg-indigo-900 text-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Link2 size={10} /> SGC-PRO-APR-005 • Blockchain SHA-256
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600">Nuevo • ISO 9001</span>
                </div>
                <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors uppercase leading-snug">
                  2. Procedimiento Aprobaciones P43081 y Cadena de Bloques F4209
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Norma la autorización jerárquica de OT/OC (P43081/P43008/P43280), el Checklist de 7 puntos (W43081C), el menú contextual en las 4 grillas, la exportación Excel con hora corta (<code>HH:mm</code>) y el Verificador SHA-256 Append-Only (sin restauración histórica).
                </p>
              </div>
              
              <button 
                onClick={generateOrderApprovalBlockchainManualWord}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer border border-indigo-950"
              >
                <Download size={15} className="text-amber-300" />
                <span>Descargar Manual P43081 &amp; Blockchain (.docx)</span>
              </button>
            </div>

            {/* MANUAL 2: PORTAL ARRENDATARIO */}
            <div className="bg-white border-2 border-slate-200 hover:border-emerald-400 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black uppercase bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                    SGC-INS-POR-002 • Arrendatarios
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Editable Word</span>
                </div>
                <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors uppercase leading-snug">
                  3. Manual de Usuario del Portal Arrendatario
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Guía didáctica para arrendatarios: Ingreso con RUT, lectura de Ficha de Cumplimiento Contractual, revisión de estado de cuenta, descarga de Cartola PDF y Excel, y envío de requerimientos.
                </p>
              </div>
              
              <button 
                onClick={generateTenantPortalManualWord}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#107C41] hover:bg-[#0B5C30] text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer border border-emerald-900"
              >
                <Download size={15} />
                <span>Descargar Manual Arrendatario (.docx)</span>
              </button>
            </div>

            {/* MANUAL 3: DEBIDA DILIGENCIA */}
            <div className="bg-white border-2 border-slate-200 hover:border-amber-400 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black uppercase bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                    SGC-PRO-UAF-003 • CMP-PP-01
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Editable Word</span>
                </div>
                <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition-colors uppercase leading-snug">
                  4. Manual de Debida Diligencia y Prevención LA/FT
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Protocolo CMP-PP-01 para la verificación de listas PEP, OFAC, prevención de lavado de activos, emisión de dictámenes de riesgo e integración con la Bóveda de Firma Digital (F980011D).
                </p>
              </div>
              
              <button 
                onClick={generateDueDiligenceManualWord}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer border border-amber-900"
              >
                <Download size={15} />
                <span>Descargar Manual Debida Diligencia (.docx)</span>
              </button>
            </div>

            {/* MANUAL 4: LIQUIDACION GARANTIAS */}
            <div className="bg-white border-2 border-slate-200 hover:border-rose-400 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black uppercase bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                    SGC-PRO-GAR-004 • ERP P1540 / P1501RV
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Editable Word</span>
                </div>
                <h3 className="text-sm font-black text-slate-900 group-hover:text-rose-700 transition-colors uppercase leading-snug">
                  5. Manual Liquidación de Garantías y Recepción
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Acta de recepción física (P1501RV), verificación de arriendos pendientes (P1501HA), deducciones por reparación y cálculo del Saldo Neto a Devolver.
                </p>
              </div>
              
              <button 
                onClick={generateSecurityDepositManualWord}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer border border-rose-900"
              >
                <Download size={15} />
                <span>Descargar Manual Liquidaciones (.docx)</span>
              </button>
            </div>

            {/* MANUAL 5: CMF INFORME B.4 & NOTA 14 NIC 40 */}
            <div className="bg-white border-2 border-emerald-300 hover:border-emerald-500 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black uppercase bg-emerald-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={10} /> SGC-MAN-CMF-007 • Circular 1.835 / NCG 316
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700">Actualizado 2026</span>
                </div>
                <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors uppercase leading-snug">
                  6. Manual CMF: Informe B.4 &amp; Nota 14 (NIC 40 / NCG 316)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Procedimiento de reporte mensual B.4 (R09322) con separación de Terreno no depreciable y Construcción (NCG 316), emisión trimestral de la Nota 14 (R09323) con Roll-Forward de 2 años, cálculo del NOI (NIC 40 §75f) y regla de conciliación obligatoria entre ambos reportes.
                </p>
              </div>
              
              <button 
                onClick={generateNote14AndB4ManualWord}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer border border-emerald-950"
              >
                <Download size={15} className="text-amber-300" />
                <span>Descargar Manual CMF B.4 &amp; Nota 14 (.docx)</span>
              </button>
            </div>

            {/* MANUAL 7: DESPLIEGUE EN SERVIDORES EMPRESARIALES TI (DOCKER & PM2) */}
            <div className="bg-white border-2 border-indigo-400 hover:border-indigo-600 rounded-2xl p-5 shadow-md transition-all flex flex-col justify-between group md:col-span-2 bg-gradient-to-br from-white via-indigo-50/20 to-slate-50">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black uppercase bg-[#002D62] text-amber-300 px-3 py-0.5 rounded-full flex items-center gap-1.5">
                    <ShieldCheck size={11} className="text-emerald-400" /> SGC-IT-MAN-008 • Operaciones &amp; Infraestructura TI
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 font-mono">Word (.doc/.docx) &amp; Vector PDF</span>
                </div>
                <h3 className="text-sm md:text-base font-black text-slate-900 group-hover:text-indigo-800 transition-colors uppercase leading-snug">
                  7. Manual Técnico de Instalación, Despliegue y Operación en Servidores Empresariales
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed max-w-4xl">
                  <strong>Guía Didáctica Paso a Paso para Personal Inexperto:</strong> Explicación detallada de requerimientos de hardware (RAM/CPU/SWAP), arquitectura de empaquetado (<code>Dockerfile</code>, <code>docker-compose.yml</code>, <code>deploy.sh</code>, <code>deploy-windows.bat</code>), despliegue en 1 solo clic con Docker Compose, método alternativo nativo con Node 22 y PM2, configuración de Proxy Inverso Nginx con SSL gratuito (Let&apos;s Encrypt / Certbot), blindaje de puertos y firewall UFW, políticas de backup diario y <strong>Cheat-Sheet de Troubleshooting</strong> (puerto 3000 ocupado, falta de memoria SWAP, 502 Bad Gateway).
                </p>
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] font-medium text-slate-500 italic">
                  Disponible en formato Word nativo editable e informe PDF corporativo de alta resolución.
                </div>
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={downloadItDeploymentManualPdf}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer border border-rose-900"
                    title="Descargar Manual Técnico IT en formato PDF de alta resolución"
                  >
                    <Download size={14} />
                    <span>Descargar PDF</span>
                  </button>
                  <button 
                    onClick={downloadItDeploymentManualWord}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#002D62] hover:bg-[#001D42] text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer border border-blue-950"
                    title="Descargar Manual Técnico IT en formato Microsoft Word editable"
                  >
                    <Download size={14} className="text-emerald-400" />
                    <span>Descargar Word (.docx)</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER MODAL */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Formatos 100% compatibles con Microsoft Word, Google Docs y LibreOffice Writer.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={handleDownloadAll}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
            >
              <Download size={16} />
              <span>DESCARGAR TODOS LOS MANUALES + TESIS (.DOCX)</span>
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemManualsWordModal;
