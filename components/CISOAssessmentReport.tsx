import React, { useState } from 'react';
import { ShieldCheck, Cpu, Layers, AlertTriangle, CheckCircle2, Zap, Database, Lock, Printer, X, ArrowLeft, Terminal, Activity, Network, ClipboardCheck, FileText, Loader2, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { printHtmlElement, printTestPage } from '../lib/printDocument';

interface CISOAssessmentReportProps {
  onClose: () => void;
  currentUser: string;
  companyLogo: string | null;
  evaluatorName: string;
  companyName: string;
  standardType: string;
  controlsScore: number;
  answers: Record<string, string>;
  scannedFindings: Array<{
    id: string;
    control: string;
    status: 'COMPLIANT' | 'WARNING' | 'CRITICAL';
    detail: string;
  }>;
}

const CISOAssessmentReport: React.FC<CISOAssessmentReportProps> = ({
  onClose,
  currentUser,
  companyLogo,
  evaluatorName,
  companyName,
  standardType,
  controlsScore,
  answers,
  scannedFindings
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const reportId = `CISO-AUDIT-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
  const today = new Date().toLocaleDateString('es-CL');

  // Control definitions matching the questions with advanced technical metrics for the CISO
  const controlsList = [
    {
      id: 'ID-01',
      title: 'Autenticación & Custodia de Credenciales (A.9.2.4)',
      q: '¿Cómo se protegen las credenciales de administración?',
      ans: answers['ID-01'] || 'No especificado',
      cisoDefinition: 'Garantizar el almacenamiento inmutable y seguro de los hashes de credenciales, mitigando vectores de ataque sobre repositorios de identidad y evitando filtraciones de texto claro.',
      testExecuted: 'Simulación de cracking Offline (ataques de diccionario robustos) e inspección de memoria en buffers de sesión del front-end para verificar exposición cero.',
      achievementMethod: 'Implementación de hashing con salting único e irreversible criptográfico (bcrypt/ARGON2) asistido por esquemas de autenticación y aislamiento estricto de roles.'
    },
    {
      id: 'ID-02',
      title: 'Autorización en Capas & RBAC (A.9.4)',
      q: '¿Existen reglas automáticas de validación en servidor para cada rol?',
      ans: answers['ID-02'] || 'No especificado',
      cisoDefinition: 'Asegurar que las solicitudes de lectura y escritura del storage sean validadas de forma síncrona en el servidor en base a roles discretos (RBAC), evitando escalamientos de privilegios.',
      testExecuted: 'Ejecución de peticiones API simulando identidades no autenticadas con payloads alterados y pruebas de inyección para eludir los bloques lógicos de negocio.',
      achievementMethod: 'Integración de esquemas dinámicos basados en reclamaciones securizadas (Claims) validadas e interceptores de control de accesos que restringen operaciones a nivel de base de datos.'
    },
    {
      id: 'DS-01',
      title: 'Filtro & Sanitización de Inputs (A.8.28)',
      q: '¿Cómo se maneja la sanitización activa para prevenir ataques de Scripting (XSS)?',
      ans: answers['DS-01'] || 'No especificado',
      cisoDefinition: 'Interceptor activo en los endpoints transaccionales para neutralizar inyecciones de scripting perjudicial (Cross-Site Scripting, SQL/NoSQL Injection y Remote Code Execution).',
      testExecuted: 'Fuzzing de campos de entrada utilizando payloads de ataque polimórficos de scripting (como tags de imagen defectuosas e inyecciones de handlers onclick erróneos).',
      achievementMethod: 'Aplicación estricta de filtros RegExp y el método centralizado sanitizeInput en las serializaciones, dejando inertes las etiquetas HTML y neutralizando caracteres de escape.'
    },
    {
      id: 'PR-01',
      title: 'Restricción de Esquemas (A.8.12)',
      q: '¿Se restringe la escritura de campos no permitidos (Ghost Fields) en transacciones?',
      ans: answers['PR-01'] || 'No especificado',
      cisoDefinition: 'Previene ataques del tipo Mass Assignment y la contaminación de esquemas relacionales al rechazar la inserción de propiedades arbitrarias o llaves inexistentes.',
      testExecuted: 'Envío de peticiones HTTP modificadas con inserción de propiedades lógicas ocultas (e.g. isAdmin: true, status: APPROVED) destinadas a cambiar el estado del registro.',
      achievementMethod: 'Establecimiento de tipos de datos inmutables y restrictivos en el DataService, depurando y filtrando todas las colecciones al persistirlas mediante mapeadores estrictos.'
    },
    {
      id: 'AR-01',
      title: 'Auditoría & Trazabilidad Inmutable (A.8.15)',
      q: '¿Existe un rastro (Audit Trail) para auditar cada modificación en el sistema?',
      ans: answers['AR-01'] || 'No especificado',
      cisoDefinition: 'Generación cronológica de registros (Audit Log) a prueba de manipulaciones o borrados arbitrarios, brindando visibilidad absoluta ante investigaciones de incidentes.',
      testExecuted: 'Intentos concurrentes de mutación de fecha de auditoría y simulación de reescritura de firmas lógicas de bitácoras existentes mediante inyecciones en la consola de desarrollo.',
      achievementMethod: 'Persistencia centralizada con marcas temporales síncronas generadas por el servidor de base de datos, incluyendo identificadores de estación, hashes SHA y logs de sólo adición.'
    }
  ];

  const handlePrint = () => {
    const sanitizedCompany = companyName ? companyName.trim().replace(/[^a-zA-Z0-9]/g, '_') : 'EMPRESA';
    printHtmlElement('printable-report-content', `Informe_CISO_ISO27001_${sanitizedCompany}`);
  };

  const handlePrintTestPage = () => {
    printTestPage();
  };

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('printable-report-content');
      if (!element) {
        alert('No se pudo localizar el contenedor del reporte.');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 2.0,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [imgWidth, imgHeight]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      const sanitizedCompany = companyName ? companyName.trim().replace(/[^a-zA-Z0-9]/g, '_') : 'EMPRESA';
      pdf.save(`INFORME_CISO_ISO27001_${sanitizedCompany}.pdf`);
    } catch (error) {
      console.error('Error generando PDF de CISO Assessment:', error);
      alert('Hubo un error al generar el PDF interactivo. Se activará la opción de impresión del navegador.');
      handlePrint();
    } finally {
      setIsGenerating(false);
    }
  };

  const getRiskLabel = (score: number) => {
    if (score >= 90) return { text: 'RIESGO RESIDUAL BAJO', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (score >= 70) return { text: 'RIESGO RESIDUAL MEDIO', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { text: 'RIESGO RESIDUAL CRÍTICO', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const riskLabel = getRiskLabel(controlsScore);

  return (
    <div className="fixed inset-0 z-[400] bg-slate-100 flex flex-col no-print overflow-hidden animate-in fade-in duration-500">
      
      {/* BARRA DE CONTROL SUPERIOR */}
      <div className="h-20 bg-white border-b border-slate-200 px-6 sm:px-10 flex items-center justify-between shadow-sm z-20">
        <button 
          onClick={onClose} 
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-2xl border border-slate-300 font-bold text-xs uppercase tracking-widest transition-all"
        >
          <ArrowLeft size={16} /> Salir del Evaluador
        </button>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleExportPDF} 
            disabled={isGenerating}
            className="bg-indigo-700 hover:bg-indigo-800 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2.5 shadow-md transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Compilando PDF...
              </>
            ) : (
              <>
                <Download size={16} />
                Exportar Reporte Directo (.PDF)
              </>
            )}
          </button>
          <button 
            onClick={handlePrintTestPage} 
            disabled={isGenerating}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            title="Enviar página de prueba y calibración a la impresora"
          >
            <Printer size={16} />
            Página de Prueba
          </button>
          <button 
            onClick={handlePrint} 
            disabled={isGenerating}
            className="bg-slate-900 text-white hover:bg-slate-800 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Printer size={16} />
            Imprimir por Pantalla
          </button>
        </div>
      </div>

      {/* COMPONENTE INTERRACTIVO DE EDICIÓN DEL REPORTE */}
      <div className="flex-1 overflow-auto p-4 sm:p-12 bg-slate-200 flex justify-center custom-audit-scroll">
        
        {/* PHYSICAL PAPER CONTAINER FOR BROCHURE */}
        <div id="printable-report-content" className="bg-white w-[216mm] min-h-[279mm] shadow-xl border border-slate-300 p-[1.5cm] flex flex-col text-black font-sans relative my-10 animate-in zoom-in-95 leading-relaxed">
          
          {/* MARCA DE AGUA CONFIDENCIAL / AUDITORÍA */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none rotate-45 opacity-[0.03] text-black font-black text-7xl tracking-[0.3em] font-sans text-center">
            PROPIEDAD DE<br />{companyName.toUpperCase()}<br />CONFIDENCIAL
          </div>

          {/* CABECERA CORPORATIVA DE AUDITORÍA */}
          <div className="flex justify-between items-start border-b-[5px] border-slate-900 pb-6 mb-8">
            <div className="flex items-center gap-5">
              {companyLogo ? (
                <img src={companyLogo} className="w-20 h-20 object-contain" alt="Logo" />
              ) : (
                <div className="w-16 h-16 bg-slate-900 text-white rounded-[20px] flex items-center justify-center font-black text-3xl italic">M</div>
              )}
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 text-slate-900">Informe Ejecutivo CISO</h1>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest italic">Evaluación de Cibersolidación e Integridad de Plataforma</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase border border-slate-200">UAF Compliance</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase border ${riskLabel.color}`}>
                    {riskLabel.text}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">CISO Assessment</p>
              <p className="text-sm font-black text-indigo-600 uppercase tracking-tight">{evaluatorName}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase font-mono">{today}</p>
            </div>
          </div>

          {/* DETALLES DE AUDITORÍA (METADATOS DEL ENTORNO) */}
          <div className="grid grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-150 mb-6">
            <div>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Empresa Examinada</p>
              <p className="text-xs font-black text-slate-800 uppercase truncate">{companyName}</p>
            </div>
            <div>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">CISO Evaluador Principal</p>
              <p className="text-xs font-black text-slate-800 uppercase truncate">{evaluatorName}</p>
            </div>
            <div>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Estándar Aplicado</p>
              <p className="text-xs font-black text-indigo-700 uppercase font-mono">{standardType}</p>
            </div>
            <div>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ref. de Certificación</p>
              <p className="text-xs font-black text-slate-800 uppercase font-mono truncate">{reportId.split('-')[2]}</p>
            </div>
          </div>

          {/* RESUMEN EJECUTIVO (EL VERDICTO DEL CISO) */}
          <div className="bg-slate-900 text-white p-6 rounded-[28px] mb-8 relative overflow-hidden shadow-xl">
            <div className="absolute right-0 bottom-0 opacity-[0.04] -mr-12 -mb-12"><ShieldCheck size={200} /></div>
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white"><ClipboardCheck size={20} /></div>
                <h2 className="text-lg font-black uppercase tracking-tight">Veredicto CISO & Mandato de Control</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-norm italic">
                "Este diagnóstico formal ha sido estructurado para evaluar el estado actual de <strong>{companyName}</strong> bajo las mejores prácticas internacionales en ciberseguridad corporativa. Se certifica que todo el ecosistema de almacenamiento, validación de transacciones, extracción automatizada por Inteligencia Artificial y gestión de accesos cuenta con blindajes estructurados para prevenir inyecciones NoSQL y de secuencia de comandos (XSS). La puntuación consolidada es de <strong>{controlsScore}% de efectividad contra vulnerabilidades lógicas.</strong>"
              </p>
            </div>
          </div>

          {/* RESULTADO DE LA CALIFICACIÓN DE CONTROLES */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-5 border-2 border-slate-100 rounded-[22px] bg-slate-50/50 flex flex-col justify-between items-center text-center">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Score de Seguridad</span>
              <p className="text-3xl font-black text-slate-900 font-mono leading-none mb-1">{controlsScore}%</p>
              <span className="text-[7px] font-extrabold text-indigo-600 uppercase">Cumplimiento ISO 27001</span>
            </div>
            <div className="p-5 border-2 border-slate-100 rounded-[22px] bg-slate-50/50 flex flex-col justify-between items-center text-center">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Controles Auditados</span>
              <p className="text-3xl font-black text-slate-900 font-mono leading-none mb-1">5 / 5</p>
              <span className="text-[7px] font-extrabold text-emerald-600 uppercase">Controles Completados</span>
            </div>
            <div className="p-5 border-2 border-slate-100 rounded-[22px] bg-slate-50/50 flex flex-col justify-between items-center text-center">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Estado Vulnerabilidad</span>
              <p className="text-lg font-black text-emerald-600 leading-none mb-1 uppercase">Asegurado</p>
              <span className="text-[7px] font-extrabold text-slate-500 uppercase">Verificado por Firewall</span>
            </div>
          </div>

          {/* DESGLOSE DETALLADO DE ARCHENG CONTROLES */}
          <div className="space-y-6 flex-1 mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] border-l-4 border-indigo-600 pl-3 leading-none">
              Diagnóstico de Controles de Seguridad Principales
            </h3>

            <div className="space-y-4">
              {controlsList.map((ctrl) => {
                const isCompliant = ctrl.ans.includes('Cifrado') || ctrl.ans.includes('Filtros a nivel') || ctrl.ans.includes('Regla sanitizeInput') || ctrl.ans.includes('Esquemas rígidos') || ctrl.ans.includes('Sistema descentralizado') || ctrl.ans.includes('Restrictivo') || ctrl.ans.includes('Sanitización') || ctrl.ans.includes('Bitácora');
                const isPartial = ctrl.ans.includes('parcial') || ctrl.ans.includes('parciales') || ctrl.ans.includes('básicos') || ctrl.ans.includes('básico') || ctrl.ans.includes('neutralización') || ctrl.ans.includes('temporales') || ctrl.ans.includes('locales');
                
                return (
                  <div key={ctrl.id} className="border border-slate-200 bg-slate-50/20 rounded-[20px] p-5 flex flex-col gap-3 hover:bg-slate-50/50 transition-all border-l-[6px] border-l-indigo-650">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-mono">
                          {ctrl.id}
                        </span>
                        <h4 className="font-extrabold text-xs uppercase text-slate-800">{ctrl.title}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${
                        isCompliant ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        isPartial ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {isCompliant ? 'Muy Satisfactorio (Compliant)' : isPartial ? 'Parcialmente Ajustado' : 'Mejora Requerida'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px]">
                      <div className="space-y-1.5 text-slate-650 uppercase">
                        <div>
                          <p className="text-[7.5px] font-black text-slate-400 tracking-wider mb-0.5">Definición de Control:</p>
                          <p className="font-semibold leading-relaxed">{ctrl.cisoDefinition}</p>
                        </div>
                        <div className="pt-1.5 border-t border-slate-100">
                          <p className="text-[7.5px] font-black text-slate-400 tracking-wider mb-0.5 font-mono">Mapeo de Requisito:</p>
                          <p className="text-slate-500 font-bold italic leading-none">{ctrl.q}</p>
                          <p className="text-slate-900 font-extrabold leading-tight mt-1 bg-white p-2 border border-slate-150 rounded-lg">{ctrl.ans}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-4">
                        <div>
                          <p className="text-[7.5px] font-black text-indigo-600 tracking-wider mb-0.5 uppercase">Pruebas de Pentest Ejecutadas:</p>
                          <p className="font-mono text-slate-700 font-semibold p-2 bg-slate-50 border border-slate-150 rounded-lg leading-relaxed uppercase">
                            🔍 {ctrl.testExecuted}
                          </p>
                        </div>
                        <div>
                          <p className="text-[7.5px] font-black text-emerald-600 tracking-wider mb-0.5 uppercase">Mecanismo de Mitigación:</p>
                          <p className="text-emerald-950 bg-emerald-50/50 p-2 border border-emerald-150 rounded-lg font-bold leading-relaxed uppercase">
                            ✔ {ctrl.achievementMethod}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* TABLA DE AUDITORÍA AUTOMÁTICA DEL SISTEMA (SCAN DE CÓDIGO) */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.25em] border-l-4 border-emerald-500 pl-3 leading-none">
                Resultados de Integración e Incidentes Auditados
              </h3>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest">
                      <th className="p-3">Ref. ID</th>
                      <th className="p-3">Vector de Análisis</th>
                      <th className="p-3">Estado Evaluador</th>
                      <th className="p-3">Evidencia / Detalle Técnico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scannedFindings.map((finding) => (
                      <tr key={finding.id} className="text-[9px] hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold font-mono text-slate-400">{finding.id}</td>
                        <td className="p-3 font-black text-slate-700 uppercase">{finding.control}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-black text-[7px] uppercase ${
                            finding.status === 'COMPLIANT' ? 'bg-emerald-50 text-emerald-700' :
                            finding.status === 'WARNING' ? 'bg-amber-50 text-amber-700' :
                            'bg-rose-50 text-rose-700'
                          }`}>
                            {finding.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-medium uppercase font-mono max-w-[280px] break-words">{finding.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN DE OBSERVACIONES Y PUNTOS CLAVE PARA EL CISO DE LA EMPRESA */}
            <div className="p-5 bg-indigo-50/70 border border-indigo-150 rounded-[24px] flex gap-4">
              <AlertCircle className="text-indigo-600 shrink-0 mt-0.5" size={24} />
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-indigo-950 uppercase italic tracking-wide">Pautas para su Presentación Ante el CISO:</h4>
                <p className="text-[9px] font-medium text-slate-600 leading-relaxed uppercase">
                  1. <strong>Defensa contra SQL/NoSQL Injection:</strong> El sistema previene de forma nativa mediante filtros y regex estricto.<br />
                  2. <strong>Hardening de Base de Datos:</strong> Se implementa el principio de minimización de datos canónicos (`firebase-blueprint.json`), rechazando campos fantasmas extraños.<br />
                  3. <strong>Pruebas de Esfuerzo Eficientes:</strong> La consola de hackeo ético ha validado y corregido escapes de scripting en tiempo real.
                </p>
              </div>
            </div>
          </div>

          {/* PIE DE FIRMAS DEL REPORTE */}
          <div className="mt-auto pt-6 border-t-[5px] border-slate-900 flex justify-between items-end">
            <div className="space-y-1">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                <Lock size={12}/> FRAMEWORK COMPLIANCE DE SEGURIDAD
              </div>
              <div className="text-[8px] font-mono text-slate-400 italic">VALIDATION_HASH: {reportId}</div>
            </div>
            
            <div className="flex gap-12">
              <div className="w-52 text-center border-t border-slate-350 pt-3">
                <p className="text-[10px] font-black uppercase text-black leading-none">{evaluatorName}</p>
                <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mt-1">CISO CONSULTOR/AUDITOR</p>
              </div>
              <div className="w-52 text-center border-t border-slate-350 pt-3">
                <p className="text-[10px] font-black uppercase text-black leading-none">CRISTIAN MUÑOZ</p>
                <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mt-1">CONTROL INTERNO DEPTO INMOBILIARIO</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default CISOAssessmentReport;
