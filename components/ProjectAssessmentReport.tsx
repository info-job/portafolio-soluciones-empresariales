import React, { useState } from 'react';
import { 
  FileText, Cpu, BarChart4, TrendingUp, Compass, Calendar, Clock, LayoutGrid, 
  CheckCircle2, Award, Download, Printer, ArrowLeft, Loader2, ShieldCheck, 
  Database, Rocket, DollarSign, Sparkles, ChevronRight, FileSpreadsheet, 
  ShieldAlert, Check, AlertTriangle, Eye, Landmark, Lock, HelpCircle, 
  HardDrive, FileUp, Smartphone, Layers, Server, Globe, Laptop, Network,
  Radio, Workflow, Settings, Bell, Key, ArrowRight, Hexagon, Zap
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { DEFAULT_ASSETFLOW_SVG } from '../lib/defaultLogo';
import { downloadAcademicProjectReportPDF } from '../lib/pdfGenerator';
import { printHtmlElement } from '../lib/printDocument';

interface ProjectAssessmentReportProps {
  onClose: () => void;
  companyName: string;
  companyLogo: string | null;
  currentUser: string;
}

const ProjectAssessmentReport: React.FC<ProjectAssessmentReportProps> = ({
  onClose,
  companyName,
  companyLogo,
  currentUser
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<'INNOVACION' | 'PMO' | 'PROYECTO_IA'>('PROYECTO_IA');
  const reportId = `PRJ-EVAL-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
  const today = new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const handlePrint = () => {
    printHtmlElement('printable-project-content', `Evaluacion_Proyectos_${reportId}`);
  };

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      if (activeReportTab === 'PROYECTO_IA') {
        downloadAcademicProjectReportPDF(companyName, currentUser);
        setIsGenerating(false);
        return;
      }

      const element = document.getElementById('printable-project-content');
      if (!element) {
        alert('No se pudo localizar el contenedor del reporte.');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 405));

      const canvas = await html2canvas(element, {
        scale: 2.0, // High quality vector rendering
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210; 
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const sanitizedCompany = companyName ? companyName.trim().replace(/[^a-zA-Z0-9]/g, '_') : 'EMPRESA';
      const docName = activeReportTab === 'INNOVACION' 
        ? `PROPUESTA_INNOVACION_${sanitizedCompany}.pdf` 
        : `INFORME_TECNICO_PROYECTOS_${sanitizedCompany}.pdf`;
        
      pdf.save(docName);
    } catch (error) {
      console.error('Error generando PDF de Proyectos:', error);
      alert('Hubo un error al generar el PDF. Se activará la opción de impresión del navegador.');
      handlePrint();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-slate-200 flex flex-col no-print overflow-hidden animate-in fade-in duration-500">
      
      {/* BARRA DE CONTROL SUPERIOR */}
      <div className="h-20 bg-white border-b border-slate-300 px-6 sm:px-10 flex items-center justify-between shadow-sm z-20">
        <button 
          onClick={onClose} 
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-2xl border border-slate-300 font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
        >
          <ArrowLeft size={16} /> Volver al Tablero
        </button>

        {/* SELECTOR DE REPORTE - ESTILO CORPORATIVO */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-300 shadow-xs gap-1">
          <button
            onClick={() => setActiveReportTab('PROYECTO_IA')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeReportTab === 'PROYECTO_IA'
                ? 'bg-emerald-700 text-white shadow-xs ring-1 ring-emerald-600'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Sparkles size={14} className={activeReportTab === 'PROYECTO_IA' ? 'text-amber-200 animate-pulse' : 'text-slate-500'} />
            Informe Proyecto IA Generativa (Entregables Finales)
          </button>
          <button
            onClick={() => setActiveReportTab('INNOVACION')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeReportTab === 'INNOVACION'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Cpu size={14} className={activeReportTab === 'INNOVACION' ? 'text-indigo-200' : 'text-slate-500'} />
            Propuesta de Innovación
          </button>
          <button
            onClick={() => setActiveReportTab('PMO')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeReportTab === 'PMO'
                ? 'bg-white text-slate-900 border border-slate-300 shadow-xs font-black'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <FileText size={14} className={activeReportTab === 'PMO' ? 'text-emerald-700' : 'text-slate-500'} />
            Informe Técnico PMO
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleExportPDF} 
            disabled={isGenerating}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2.5 shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Compilando PDF...
              </>
            ) : (
              <>
                <Download size={16} />
                Exportar Propuesta (.PDF)
              </>
            )}
          </button>
          <button 
            onClick={handlePrint}
            disabled={isGenerating}
            className="bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Printer size={16} />
            Imprimir
          </button>
        </div>
      </div>

      {/* VISTA PREVIA INTERACTIVA */}
      <div className="flex-1 overflow-auto p-4 sm:p-12 bg-slate-200 flex justify-center custom-audit-scroll">
        
        {/* PHYSICAL PAPER CONTAINER */}
        <div id="printable-project-content" className="bg-white w-[216mm] min-h-[297mm] shadow-2xl p-[1.5cm] flex flex-col text-black font-sans relative my-10 animate-in zoom-in-95 leading-relaxed">
          
          {/* MARCA DE AGUA CORPORATIVA */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none rotate-45 opacity-[0.025] text-black font-black text-5xl tracking-[0.3em] font-sans text-center">
            PROPUESTA DE INNOVACIÓN<br />{companyName.toUpperCase()}<br />CONFIDENCIAL
          </div>

          {activeReportTab === 'PROYECTO_IA' ? (
            /* 
              =========================================================
              TAB: PROYECTO FINAL ACADÉMICO - IA GENERATIVA (3 ENTREGABLES)
              =========================================================
            */
            <div className="flex flex-col flex-1 space-y-8 text-slate-900 font-sans">
              
              {/* CABECERA ACADÉMICA Y PROYECTO */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                <div className="flex items-center gap-5">
                  {companyLogo ? (
                    <img src={companyLogo} className="w-16 h-16 object-contain" alt="Logo de la Empresa" />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} className="w-16 h-16 flex items-center justify-center [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:object-contain" />
                  )}
                  <div>
                    <span className="inline-block border border-slate-900 text-slate-900 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1">
                      PROYECTO FINAL GRUPAL — IA GENERATIVA
                    </span>
                    <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
                      Diseño de Solución Basada en Inteligencia Artificial Generativa
                    </h1>
                    <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                      Plataforma de Módulos a Medida para Gestión Inmobiliaria, Operativa, Contable y Legal (AssetFlow ERP)
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1 font-mono">
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">CÓDIGO ENTREGABLE</p>
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">IA-GEN-FINAL-2026</p>
                  <p className="text-[9px] font-medium text-slate-600 uppercase">{today}</p>
                </div>
              </div>

              {/* METADATOS DEL TRABAJO GRUPAL Y ENTREGABLES */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-slate-300 font-sans">
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Integrantes / Autor</p>
                  <p className="text-xs font-bold text-slate-900 uppercase">{currentUser}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Modelo LLM Principal</p>
                  <p className="text-xs font-bold text-slate-900 uppercase">Google Gemini 2.5 Flash / 1.5 Pro</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Extensión y Estructura</p>
                  <p className="text-xs font-bold text-slate-900 uppercase">35 Páginas Acádemicas (3 Entregables)</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado de Compilación</p>
                  <p className="text-xs font-bold text-slate-900 uppercase">100% Verificado & Ejecutable</p>
                </div>
              </div>

              {/* CUADRO RESUMEN - LECTURA HUMANA (FONDO BLANCO, TEXTO NEGRO) */}
              <div className="bg-white text-slate-900 p-5 rounded-xl border border-slate-300 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-slate-800" />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Resumen Consolidado y Estructura Completa de 35 Páginas</h2>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-900 px-2.5 py-1 rounded border border-slate-300">35 PÁGINAS PDF</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-normal">
                  Este documento de 35 páginas en formato académico (Negro sobre Blanco, alta legibilidad) consolida en detalle los tres entregables exigidos para el proyecto final del curso de Inteligencia Artificial Generativa. Incluye Portada, Índice General, Resumen Ejecutivo, Introducción, Planteamiento del Problema, Marco Teórico de LLMs, Metodología, Entregable 1 (Arquitectura de Software e Interconexión), Entregable 2 (Ingeniería de Prompts y Casos de Uso), Entregable 3 (Modelo FinOps, Plan de Despliegue y ROI de +314%), Análisis de Resultados, Conclusiones y Referencias Bibliográficas.
                </p>
              </div>

              {/* =========================================================
                  ENTREGABLE 1: PROBLEMA DE NEGOCIO Y ARQUITECTURA TÉCNICA
                  ========================================================= */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-900 pb-1.5">
                  <span className="bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded">ENTREGABLE 1</span>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                    Planteamiento del Problema de Negocio y Arquitectura de la Solución
                  </h3>
                </div>

                {/* 1.1 MOTIVACIÓN, JUSTIFICACIÓN Y PROBLEMA DE NEGOCIO */}
                <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-900 flex items-center gap-2">
                    <AlertTriangle size={15} className="text-slate-800" />
                    1.1 Motivación, Justificación y Planteamiento del Problema (Caso Real: Depto. Inmobiliario de Mutucar)
                  </h4>
                  <p className="text-[11px] text-slate-800 leading-relaxed text-justify">
                    Este sistema nace de la <strong>imperiosa necesidad de concentrar la gran cantidad de datos que existe en el Departamento Inmobiliario de Mutucar</strong>, con la finalidad de llevar un control efectivo y facilitar mi trabajo diario de <strong>Control Interno del Departamento Inmobiliario</strong>. Antes de implementar esta plataforma, los antecedentes de propiedades, contratos, tasaciones, garantías y órdenes de trabajo estaban dispersos en múltiples planillas Excel independientes, lo que dificultaba enormemente el cruce de información y el seguimiento preventivo.
                  </p>
                  <p className="text-[11px] text-slate-800 leading-relaxed text-justify">
                    A mi parecer, la solución no pasaba solo por juntar los archivos, sino por <strong>implementar un sistema que a su vez obligue a los usuarios a cumplir con los requisitos mínimos para enfrentar tanto las auditorías internas como las externas</strong> (no permitiendo cursar órdenes ni pagos sin debida diligencia, documento tributario asociado, categoría, especialidad o actas de recepción). <strong>Cabe señalar que la implementación de este sistema nos ayudó directamente en la empresa a subsanar 4 observaciones de auditoría y a levantar una suspensión por parte del ente fiscalizador, la Comisión para el Mercado Financiero (CMF)</strong>.
                  </p>
                  
                  {/* TABLA COMPARATIVA ESCENARIO TRADICIONAL VS ASSETFLOW PRO */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="border border-rose-200 bg-rose-50/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between border-b border-rose-200 pb-1">
                        <span className="text-[10px] font-black text-rose-900 uppercase tracking-wider flex items-center gap-1">
                          <Clock size={12} className="text-rose-600" /> Operativa Tradicional (Manual / Días)
                        </span>
                        <span className="text-[8px] font-mono font-bold bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded">3 a 15 Días</span>
                      </div>
                      <ul className="text-[9.5px] text-slate-700 space-y-1.5 list-disc pl-4">
                        <li><strong>Debida Diligencia UAF / PEP:</strong> 3 a 5 días hábiles en revisar RUTs, PEP y antecedentes manualmente en planillas Excel.</li>
                        <li><strong>Conciliación ERP F0911:</strong> Hasta 120 horas mensuales de analistas digitando y buscando diferencias centavo a centavo.</li>
                        <li><strong>Puntos de Control Manuales:</strong> Firmas físicas en papel, pases de nota y validaciones redundantes que congelaban pagos.</li>
                        <li><strong>Órdenes de Trabajo Discontinuas:</strong> OTs gestionadas por correo sin vinculación a la factura asociada (`associatedInvoice`), categoría (`category`) o especialidad (`specialty`).</li>
                      </ul>
                    </div>

                    <div className="border border-emerald-300 bg-emerald-50/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-1">
                        <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                          <Zap size={12} className="text-emerald-600" /> AssetFlow Pro (IA Generativa / Segundos)
                        </span>
                        <span className="text-[8px] font-mono font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">1.4s - 3.8s</span>
                      </div>
                      <ul className="text-[9.5px] text-slate-700 space-y-1.5 list-disc pl-4">
                        <li><strong>Screening UAF/PEP Acelerado:</strong> Resultado legal completo y dictamen PDF emitido en <strong>1.42 segundos</strong> con Gemini 2.5 Flash.</li>
                        <li><strong>Conciliación Forense F0911:</strong> Cuadre de Libro Mayor y Ley de Benford ejecutado en <strong>3.85 segundos por lote</strong> (-91.7% tiempo).</li>
                        <li><strong>Eliminación de Controles Manuales:</strong> Pipeline automatizado Express Proxy + Gemini API + Firestore NoSQL con sello ISO 27001.</li>
                        <li><strong>OTs Conectadas en Tiempo Real:</strong> Vinculación persistente obligatoria de cada OT con su factura, categoría y especialidad.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 1.2 ARQUITECTURA TECNOLÓGICA E INTERCONEXIÓN DE COMPONENTES (C4 MODEL LEVEL 2) */}
                <div className="bg-white border border-slate-300 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-900 flex items-center gap-2">
                        <Layers size={16} className="text-slate-800" />
                        1.2 Arquitectura Tecnológica e Interconexión de Componentes
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">ESPECIFICACIÓN DE ARQUITECTURA DE SOFTWARE — MODELO C4 NIVEL 2 (ISO/IEC/IEEE 42010)</p>
                    </div>
                    <span className="self-start sm:self-auto text-[9px] font-mono font-bold bg-slate-900 text-white px-2.5 py-1 rounded">
                      FULL-STACK PROXY BACKEND
                    </span>
                  </div>

                  {/* DIAGRAMA VISUAL VECTORIAL DE ARQUITECTURA CLOUD (GCP ENTERPRISE REFERENCE PATTERN) */}
                  <div className="bg-white text-slate-800 p-4 rounded-xl border border-slate-300 shadow-sm space-y-3 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-[11px] font-bold text-blue-700 flex items-center gap-2 tracking-wide uppercase">
                        <Network size={15} className="text-blue-600" />
                        CLOUD NETWORK ARCHITECTURE — GCP ENTERPRISE PLATFORM PATTERN
                      </span>
                      <span className="text-[9px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">ISO/IEC/IEEE 42010 Architecture Standard</span>
                    </div>

                    {/* CONTENEDOR PRINCIPAL: ARQUITECTURA HÍBRIDA (CLIENTS OUTSIDE -> GCP BOUNDARY) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch pt-1">
                      
                      {/* CLIENT DISPOSITIVOS (3 CLIENTES APILADOS VERTICALMENTE EN MARCOS AZULES) */}
                      <div className="md:col-span-3 space-y-2 flex flex-col justify-center">
                        <p className="text-[9px] font-bold text-blue-700 uppercase text-center font-mono tracking-wider">CLIENT DEVICES / FRONTEND SPA</p>
                        
                        {/* Client 1: Android / Web Tablet */}
                        <div className="bg-slate-50 border-2 border-blue-500 rounded-xl p-2.5 flex items-center gap-2.5 shadow-xs">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 shrink-0">
                            <Laptop size={20} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[9.5px] font-bold text-slate-900 uppercase">Enterprise Web Client</p>
                            <p className="text-[8px] text-slate-600 font-mono">React 19 SPA (ERP Redwood UI)</p>
                          </div>
                        </div>

                        {/* Client 2: Mobile iOS/Android */}
                        <div className="bg-slate-50 border-2 border-blue-500 rounded-xl p-2.5 flex items-center gap-2.5 shadow-xs">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 shrink-0">
                            <Smartphone size={20} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[9.5px] font-bold text-slate-900 uppercase">Mobile Terreno PWA</p>
                            <p className="text-[8px] text-slate-600 font-mono">Field Work Orders (Offline Sync)</p>
                          </div>
                        </div>

                        {/* Client 3: Executive Portal */}
                        <div className="bg-slate-50 border-2 border-blue-500 rounded-xl p-2.5 flex items-center gap-2.5 shadow-xs">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-rose-700 shrink-0">
                            <Globe size={20} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[9.5px] font-bold text-slate-900 uppercase">Portal Auditoría / SII</p>
                            <p className="text-[8px] text-slate-600 font-mono">Panel F0911 & UAF Screening</p>
                          </div>
                        </div>
                      </div>

                      {/* CLOUD ENVIRONMENT BOUNDARY (GRAN CAJA CON BORDE AZUL RECTANGULAR) */}
                      <div className="md:col-span-9 border-2 border-blue-600 rounded-2xl p-3 bg-blue-50/20 space-y-3 relative shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between border-b border-blue-200 pb-1.5">
                          <span className="text-[10px] font-bold text-blue-900 font-mono flex items-center gap-1.5 uppercase">
                            <Server size={14} className="text-blue-600" />
                            GOOGLE CLOUD ENVIRONMENT — SECURE CONTAINER BOUNDARY
                          </span>
                          <span className="text-[8px] font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded font-bold">
                            Proxy Gate Port 3000 (TLS 1.3)
                          </span>
                        </div>

                        {/* GRID INTERNO CLOUD (MANAGEMENT -> COMPUTE -> (IDENTITY SECURITY & MACHINE LEARNING) -> BIG DATA) */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-stretch">

                          {/* 1. MANAGEMENT TOOLS / INGRESS GATEWAY (LIGHT EMERALD BOX) */}
                          <div className="md:col-span-3 border border-emerald-400 rounded-xl p-2 bg-emerald-50/60 flex flex-col justify-between space-y-1.5 text-center">
                            <p className="text-[8.5px] font-bold text-emerald-900 uppercase font-mono border-b border-emerald-200 pb-0.5">
                              Management Tools
                            </p>
                            <div className="space-y-1 font-mono">
                              <div className="bg-white p-1.5 rounded border border-emerald-200 shadow-xs flex items-center gap-1.5 text-left">
                                <Hexagon size={13} className="text-emerald-600 shrink-0" />
                                <div>
                                  <p className="text-[8px] font-bold text-slate-900">Nginx Reverse Proxy</p>
                                  <p className="text-[6.5px] text-slate-600">Port 3000 Ingress SSL</p>
                                </div>
                              </div>

                              <div className="bg-white p-1.5 rounded border border-emerald-200 shadow-xs flex items-center gap-1.5 text-left">
                                <Hexagon size={13} className="text-emerald-600 shrink-0" />
                                <div>
                                  <p className="text-[8px] font-bold text-slate-900">Load Balancer</p>
                                  <p className="text-[6.5px] text-slate-600">Rate Limit & SSL Term</p>
                                </div>
                              </div>

                              <div className="bg-white p-1.5 rounded border border-emerald-200 shadow-xs flex items-center gap-1.5 text-left">
                                <Hexagon size={13} className="text-emerald-600 shrink-0" />
                                <div>
                                  <p className="text-[8px] font-bold text-slate-900">API Route Dispatcher</p>
                                  <p className="text-[6.5px] text-slate-600">/api/gemini & /api/erp</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. COMPUTE NODE (CENTRAL CAJA) */}
                          <div className="md:col-span-2 flex flex-col items-center justify-center p-2 border border-emerald-400 rounded-xl bg-emerald-50/60 text-center space-y-1.5">
                            <p className="text-[8.5px] font-bold text-emerald-900 uppercase font-mono border-b border-emerald-200 pb-0.5 w-full">
                              Compute
                            </p>
                            <div className="w-10 h-10 rounded-xl bg-blue-600 border-2 border-blue-400 flex items-center justify-center text-white shadow-md">
                              <Cpu size={20} />
                            </div>
                            <div>
                              <p className="text-[8.5px] font-bold text-slate-900 font-mono">Node.js Express</p>
                              <p className="text-[7px] text-slate-700 font-mono">server.ts Backend</p>
                              <p className="text-[6.5px] text-emerald-700 font-bold font-mono mt-0.5">Cloud Run</p>
                            </div>
                          </div>

                          {/* 3. DOS RAMAS APILADAS: IDENTITY SECURITY (TOP) & MACHINE LEARNING (BOTTOM) */}
                          <div className="md:col-span-4 flex flex-col space-y-2 justify-between">
                            
                            {/* BRANCH TOP: IDENTITY SECURITY */}
                            <div className="border border-emerald-400 rounded-xl p-1.5 bg-emerald-50/60 space-y-1">
                              <p className="text-[8px] font-bold text-emerald-900 uppercase font-mono text-center border-b border-emerald-200 pb-0.5">
                                Identity Security
                              </p>
                              <div className="grid grid-cols-2 gap-1 font-mono">
                                <div className="bg-white p-1 rounded border border-emerald-200 flex items-center gap-1">
                                  <ShieldCheck size={12} className="text-blue-600 shrink-0" />
                                  <div>
                                    <p className="text-[7.5px] font-bold text-slate-900">Firebase Auth</p>
                                    <p className="text-[6px] text-slate-600">JWT Token</p>
                                  </div>
                                </div>

                                <div className="bg-white p-1 rounded border border-emerald-200 flex items-center gap-1">
                                  <Lock size={12} className="text-emerald-600 shrink-0" />
                                  <div>
                                    <p className="text-[7.5px] font-bold text-slate-900">firestore.rules</p>
                                    <p className="text-[6px] text-slate-600">Isolation UID</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* BRANCH BOTTOM: MACHINE LEARNING / GEN AI */}
                            <div className="border border-purple-300 rounded-xl p-1.5 bg-purple-50/60 space-y-1">
                              <p className="text-[8px] font-bold text-purple-900 uppercase font-mono text-center border-b border-purple-200 pb-0.5">
                                Machine Learning / GenAI Engine
                              </p>
                              <div className="space-y-1 font-mono">
                                <div className="bg-white p-1 rounded border border-purple-200 flex items-center gap-1">
                                  <Sparkles size={12} className="text-purple-600 shrink-0" />
                                  <div>
                                    <p className="text-[7.5px] font-bold text-purple-900">Gemini 2.5 Flash</p>
                                    <p className="text-[6px] text-slate-600">UAF & DTE Extractor (&lt;1.2s)</p>
                                  </div>
                                </div>

                                <div className="bg-white p-1 rounded border border-purple-200 flex items-center gap-1">
                                  <Cpu size={12} className="text-purple-600 shrink-0" />
                                  <div>
                                    <p className="text-[7.5px] font-bold text-purple-900">Gemini 1.5 Pro</p>
                                    <p className="text-[6px] text-slate-600">Benford F0911 (1M tokens)</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>

                          {/* 4. BIG DATA & ENTERPRISE SYSTEMS (RIGHTMOST BOX) */}
                          <div className="md:col-span-3 border border-emerald-400 rounded-xl p-2 bg-emerald-50/60 flex flex-col justify-between space-y-1.5 text-center">
                            <p className="text-[8.5px] font-bold text-emerald-900 uppercase font-mono border-b border-emerald-200 pb-0.5">
                              Big Data & Enterprise
                            </p>

                            <div className="space-y-1 font-mono">
                              <div className="bg-white p-1.5 rounded border border-emerald-200 flex items-center gap-1.5 text-left">
                                <Database size={13} className="text-emerald-600 shrink-0" />
                                <div>
                                  <p className="text-[8px] font-bold text-slate-900">Firebase Firestore</p>
                                  <p className="text-[6.5px] text-slate-600">NoSQL Realtime DB</p>
                                </div>
                              </div>

                              <div className="bg-white p-1.5 rounded border border-cyan-200 flex items-center gap-1.5 text-left">
                                <Server size={13} className="text-cyan-700 shrink-0" />
                                <div>
                                  <p className="text-[8px] font-bold text-slate-900">AssetFlow Enterprise ERP DB</p>
                                  <p className="text-[6.5px] text-slate-600">Tablas F0911 & F0411</p>
                                </div>
                              </div>

                              <div className="bg-white p-1.5 rounded border border-blue-200 flex items-center gap-1.5 text-left">
                                <Landmark size={13} className="text-blue-600 shrink-0" />
                                <div>
                                  <p className="text-[8px] font-bold text-slate-900">SII WebServices</p>
                                  <p className="text-[6.5px] text-slate-600">Validación DTE & F29</p>
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>

                  {/* MATRIZ DE PROTOCOLOS DE INTERCONEXIÓN (NIVEL MAGÍSTER) */}
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-bold uppercase text-slate-900 flex items-center gap-1.5">
                      <FileSpreadsheet size={14} className="text-slate-800" />
                      Matriz Técnica de Protocolos e Interfaces de Comunicación
                    </h5>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] text-left border-collapse border border-slate-200">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                            <th className="p-2 border-r border-slate-200">Interfaz / Endpoint</th>
                            <th className="p-2 border-r border-slate-200">Origen &rarr; Destino</th>
                            <th className="p-2 border-r border-slate-200">Protocolo</th>
                            <th className="p-2 border-r border-slate-200">Seguridad / Autenticación</th>
                            <th className="p-2">SLA Latencia / SLA Objetivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold border-r border-slate-200 text-purple-900">/api/gemini/screen-uaf</td>
                            <td className="p-2 border-r border-slate-200">Express Gateway &rarr; Gemini API</td>
                            <td className="p-2 border-r border-slate-200 font-mono">HTTPS / gRPC</td>
                            <td className="p-2 border-r border-slate-200">GEMINI_API_KEY (Server-side)</td>
                            <td className="p-2 font-mono font-bold text-emerald-700">&lt; 1,500 ms (99.2% uptime)</td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold border-r border-slate-200 text-blue-900">/api/erp/reconcile-f0911</td>
                            <td className="p-2 border-r border-slate-200">AssetFlow Core &rarr; AssetFlow Enterprise DB</td>
                            <td className="p-2 border-r border-slate-200 font-mono">REST / JDBC Staging</td>
                            <td className="p-2 border-r border-slate-200">TLS 1.3 + DB Service Account</td>
                            <td className="p-2 font-mono font-bold text-emerald-700">&lt; 2,000 ms (Batch sync)</td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold border-r border-slate-200 text-amber-900">Firestore Realtime Sync</td>
                            <td className="p-2 border-r border-slate-200">React Client &rarr; Firestore NoSQL</td>
                            <td className="p-2 border-r border-slate-200 font-mono">WebSockets / TLS</td>
                            <td className="p-2 border-r border-slate-200">Firebase Auth JWT + firestore.rules</td>
                            <td className="p-2 font-mono font-bold text-emerald-700">&lt; 300 ms (Event-driven)</td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold border-r border-slate-200 text-cyan-900">/api/sii/validate-folio</td>
                            <td className="p-2 border-r border-slate-200">Express Server &rarr; SII Chile WS</td>
                            <td className="p-2 border-r border-slate-200 font-mono">SOAP / HTTPS</td>
                            <td className="p-2 border-r border-slate-200">Certificado Digital Tributario</td>
                            <td className="p-2 font-mono font-bold text-emerald-700">&lt; 2,500 ms (SII Gateway)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* FUNDAMENTACIÓN ACADÉMICA Y JUSTIFICACIÓN ARQUITECTÓNICA (NIVEL MAGÍSTER) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-[10.5px] text-slate-800">
                    <h5 className="font-bold text-slate-900 uppercase flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-slate-800" />
                      Justificación de Ingeniería de Software — Patrón Proxy Backend vs. Desarrollo Directo en ERP
                    </h5>
                    <p className="leading-relaxed text-slate-700">
                      Desde la perspectiva de la arquitectura de sistemas empresariales, la modificación directa de los módulos nativos en un ERP legado de la escala de <strong>AssetFlow Enterprise (ERP World/AssetFlow Enterprise)</strong> implica un costo estimado de consultoría de más de USD $120.000 y un periodo de prueba de 6 a 9 meses, incrementando drásticamente el riesgo operacional.
                    </p>
                    <p className="leading-relaxed text-slate-700">
                      La solución propuesta adopta un <strong>Patrón de Arquitectura Desacoplada (Decoupled Micro-Frontend Proxy Gateway)</strong>. Al encapsular la inteligencia generativa en un microservicio Node.js Express sobre Google Cloud Run, se logra:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      <li><strong>Aislamiento Total de Credenciales (Zero Trust):</strong> La clave secreta de la API de Google Gemini se almacena exclusivamente en las variables de entorno del servidor proxy (`GEMINI_API_KEY`), impidiendo cualquier fuga hacia el cliente web en cumplimiento con las normas ISO 27001 y NCh-ISO 27017.</li>
                      <li><strong>Persistencia Resiliente y Reactiva:</strong> Las Órdenes de Trabajo (`work_orders`) e informes UAF persisten en Firebase Firestore con reglas de aislamiento multi-tenant (`request.auth.uid == resource.data.userId`), asegurando continuidad operativa incluso en caso de indisponibilidad temporal del ERP.</li>
                      <li><strong>Interoperabilidad con Tablas Maestras F0911 y F0411:</strong> Sincronización asíncrona mediante lotes estructurados JSON, permitiendo auditar previamente las transacciones contables mediante el motor analítico de la Ley de Benford antes de su registro definitivo en el Libro Mayor.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* =========================================================
                  ENTREGABLE 2: INGENIERÍA DE PROMPTS Y CASOS DE PRUEBA
                  ========================================================= */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 border-b border-slate-900 pb-1.5">
                  <span className="bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded">ENTREGABLE 2</span>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                    Diseño de Prompts e Ingeniería de Inteligencia Artificial Generativa
                  </h3>
                </div>

                {/* PROMPT 1 */}
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-slate-900 flex justify-between items-center text-[10px] font-mono">
                    <span className="font-bold text-slate-900">PROMPT N° 1 — DEBIDA DILIGENCIA Y EVALUACIÓN DE RIESGO UAF Y PEP</span>
                    <span className="border border-slate-300 px-2 py-0.5 rounded font-sans text-slate-700">Modelo: Gemini 2.5 Flash</span>
                  </div>
                  <div className="p-4 space-y-3 text-[10px]">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="font-mono font-bold text-slate-900 block mb-1">SYSTEM PROMPT (Instrucción Base):</span>
                      <p className="text-slate-800 font-mono italic">
                        "Eres un Encargado de Cumplimiento AML y UAF experto en Chile. Recibirás los datos fiscales de un contratista o proveedor (RUT, Razón Social, Mapeo Dicom). Debes analizar el riesgo de lavado de activos y PEP, emitiendo una respuesta JSON estricta con los campos: `riskScore` (0-100), `riskCategory` ('BAJO'|'MEDIO'|'ALTO'), `pepStatus` (boolean), y `recommendation`."
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 font-mono text-[9px]">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-900 block mb-1">EJEMPLO ENTRADA (Input):</span>
                        <code>{`{ "rut": "76.541.229-K", "company": "Maule Obras Civiles SpA", "amount": 18500000 }`}</code>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-900 block mb-1">EJEMPLO SALIDA GENERATIVA (Output):</span>
                        <code>{`{ "riskScore": 2, "riskCategory": "BAJO", "pepStatus": false, "recommendation": "APROBADO PARA PAGO" }`}</code>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PROMPT 2 */}
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-slate-900 flex justify-between items-center text-[10px] font-mono">
                    <span className="font-bold text-slate-900">PROMPT N° 2 — CAMPAÑAS PUBLICITARIAS Y PROPUESTAS B2B</span>
                    <span className="border border-slate-300 px-2 py-0.5 rounded font-sans text-slate-700">Modelo: Gemini 2.5 Flash</span>
                  </div>
                  <div className="p-4 space-y-2 text-[10px]">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="font-mono font-bold text-slate-900 block mb-1">PROPUESTA DE VALOR GENERADA POR IA:</span>
                      <p className="text-slate-800 font-serif italic text-[11px]">
                        “Desarrollamos e implementamos módulos a medida diseñados para resolver cada requerimiento operativo, contable o legal de tu cartera. A través de una asesoría personalizada entendemos, documentamos y levantamos puntos de control; otorgando fluidez a tus operaciones.”
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* =========================================================
                  ENTREGABLE 3: MODELO DE COSTES Y PLAN DE DESPLIEGUE
                  ========================================================= */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 border-b border-slate-900 pb-1.5">
                  <span className="bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded">ENTREGABLE 3</span>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                    Modelo de Costes (FinOps), Plan de Despliegue y Evaluación ROI
                  </h3>
                </div>

                {/* TABLA DE MODELO DE COSTES */}
                <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-900 flex items-center gap-2">
                    <DollarSign size={15} className="text-slate-800" />
                    3.1 Modelo de Costos de la Infraestructura de IA y Cloud (Proyección Mensual)
                  </h4>

                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold uppercase border-b border-slate-300">
                        <th className="p-2 border border-slate-300">Componente / Servicio</th>
                        <th className="p-2 border border-slate-300">Métrica de Consumo Estimada</th>
                        <th className="p-2 border border-slate-300">Tarifa Unitaria</th>
                        <th className="p-2 border border-slate-300 text-right">Costo Estimado Mensual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-mono">
                      <tr>
                        <td className="p-2 border border-slate-200 font-sans font-bold">Google Gemini 2.5 Flash API</td>
                        <td className="p-2 border border-slate-200">100,000 Peticiones (50M Tokens In / 10M Out)</td>
                        <td className="p-2 border border-slate-200">$0.075 / 1M In | $0.30 / 1M Out</td>
                        <td className="p-2 border border-slate-200 text-right font-bold text-slate-900">$6.75 USD</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-200 font-sans font-bold">Google Gemini 1.5 Pro (Auditoría Forense)</td>
                        <td className="p-2 border border-slate-200">5,000 Peticiones Complejas (8M In / 2M Out)</td>
                        <td className="p-2 border border-slate-200">$1.25 / 1M In | $5.00 / 1M Out</td>
                        <td className="p-2 border border-slate-200 text-right font-bold text-slate-900">$20.00 USD</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-200 font-sans font-bold">Firebase Firestore & Auth</td>
                        <td className="p-2 border border-slate-200">250,000 Lecturas / 80,000 Escrituras</td>
                        <td className="p-2 border border-slate-200">$0.06 / 100k Lecturas</td>
                        <td className="p-2 border border-slate-200 text-right font-bold text-slate-900">$4.50 USD</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-200 font-sans font-bold">Cloud Run Containers (Nginx + Node)</td>
                        <td className="p-2 border border-slate-200">Escalado a cero / 1.5M vCPU-Segundos</td>
                        <td className="p-2 border border-slate-200">$0.000024 / vCPU-segundo</td>
                        <td className="p-2 border border-slate-200 text-right font-bold text-slate-900">$12.00 USD</td>
                      </tr>
                      <tr className="bg-slate-100 text-slate-900 font-bold">
                        <td colSpan={3} className="p-2 border border-slate-300 font-sans text-right uppercase">COSTO TOTAL INFRAESTRUCTURA Y IA GENERATIVA (TCO MENSUAL):</td>
                        <td className="p-2 border border-slate-300 text-right text-sm text-slate-900 font-black">$43.25 USD</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* PLAN DE DESPLIEGUE Y ROI */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase text-slate-900">3.2 Plan de Despliegue en 3 Fases</h4>
                    <ul className="text-[10px] text-slate-800 space-y-1 list-disc pl-4 font-medium">
                      <li><strong>Fase 1 (Semanas 1-2):</strong> Integración de APIs, reglas Firestore y Prompt Engineering base.</li>
                      <li><strong>Fase 2 (Semanas 3-4):</strong> Conexión con tablas ERP ERP y homologación de reportes SII.</li>
                      <li><strong>Fase 3 (Mes 2):</strong> Pruebas de carga, auditoría CISO ISO 27001 y pase a producción.</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-2 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-900">3.3 Retorno de Inversión (ROI)</h4>
                      <p className="text-[10px] text-slate-800 font-medium mt-1">
                        Ahorro estimado de <strong>120 horas-hombre mensuales</strong> por analista contable.
                      </p>
                    </div>
                    <div className="bg-slate-900 text-white p-2.5 rounded-lg text-center">
                      <span className="text-lg font-bold font-mono">ROI PROYECTADO: +314%</span>
                      <p className="text-[8.5px] uppercase font-bold text-slate-200">Payback de la inversión en 1.5 meses</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER CORPORATIVO DE LA PROPUESTA */}
              <div className="mt-auto pt-6 border-t-2 border-slate-900 flex justify-between items-end">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                    <Award size={12} className="text-slate-900" /> INFORME ENTREGABLE ACADÉMICO PROYECTO IA GENERATIVA
                  </div>
                  <div className="text-[8px] font-mono text-slate-500 italic">PROYECTO_ID: {reportId} // ESTADO: VERIFICADO PARA ENTREGA</div>
                </div>
                
                <div className="flex gap-12">
                  <div className="w-52 text-center border-t border-slate-400 pt-2">
                    <p className="text-[10px] font-bold uppercase text-slate-900 leading-none">EVALUACIÓN ACADÉMICA</p>
                    <p className="text-[8px] font-medium text-slate-600 uppercase tracking-wider mt-1">CURSO IA GENERATIVA 2026</p>
                  </div>
                  <div className="w-52 text-center border-t border-slate-400 pt-2">
                    <p className="text-[10px] font-bold uppercase text-slate-900 leading-none">{currentUser}</p>
                    <p className="text-[8px] font-medium text-slate-600 uppercase tracking-wider mt-1">AUTOR / INTEGRANTE GRUPAL</p>
                  </div>
                </div>
              </div>

            </div>
          ) : activeReportTab === 'INNOVACION' ? (
            /* 
              =========================================
              TAB 1: PROPUESTA PARA EL ÁREA DE INNOVACIÓN
              =========================================
            */
            <div className="flex flex-col flex-1">
              
              {/* CABECERA INSTITUCIONAL */}
              <div className="flex justify-between items-start border-b-[5px] border-indigo-950 pb-6 mb-8">
                <div className="flex items-center gap-5">
                  {companyLogo ? (
                    <img src={companyLogo} className="w-20 h-20 object-contain" alt="Logo de la Empresa" />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} className="w-20 h-20 flex items-center justify-center [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:object-contain" />
                  )}
                  <div>
                    <span className="bg-gradient-to-r from-indigo-800 to-emerald-800 text-white px-3 py-1 rounded-md text-[8.5px] font-black uppercase tracking-widest">
                      Línea de Innovación Tecnológica
                    </span>
                    <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 text-slate-900 mt-2">
                      Propuesta de Transformación Digital & Automatización Contable
                    </h1>
                    <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest italic">
                      Solución Integradora ERP Centralizado Para Contabilidad, Operaciones y Cumplimiento Regulatorio
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1 font-mono">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">CÓDIGO PROPUESTA</p>
                  <p className="text-sm font-black text-indigo-600 uppercase tracking-tight">{reportId.split('-')[2]}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">{today}</p>
                </div>
              </div>

              {/* METADATOS DE LA PROPUESTA */}
              <div className="grid grid-cols-4 gap-4 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 mb-6 font-sans">
                <div>
                  <p className="text-[7.5px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Destinatario</p>
                  <p className="text-xs font-black text-slate-800 uppercase">Comité de Innovación</p>
                </div>
                <div>
                  <p className="text-[7.5px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Autor de Propuesta</p>
                  <p className="text-xs font-black text-slate-800 uppercase">{currentUser}</p>
                </div>
                <div>
                  <p className="text-[7.5px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Impacto Organizacional</p>
                  <p className="text-xs font-black text-emerald-700 uppercase">Estratégico / Alto</p>
                </div>
                <div>
                  <p className="text-[7.5px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Viabilidad Técnica</p>
                  <p className="text-xs font-black text-slate-800 uppercase">100% Sincronizado</p>
                </div>
              </div>

              {/* RESUMEN DE LA PROPUESTA */}
              <div className="bg-slate-100 border-2 border-slate-300 text-slate-900 p-6 rounded-[28px] mb-8 relative overflow-hidden shadow-xs">
                <div className="absolute right-0 bottom-0 opacity-[0.03] -mr-10 -mb-10 text-slate-900"><Cpu size={180} /></div>
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-700 rounded-xl text-white shadow-xs"><Rocket size={20} /></div>
                    <h2 className="text-lg font-black uppercase tracking-tight leading-none text-slate-900">Resumen Ejecutivo de Innovación</h2>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    La presente propuesta detalla los **beneficios estratégicos y operacionales** de incorporar la plataforma integrada de automatización. El sistema está diseñado para erradicar las ineficiencias de los procesos manuales críticos vinculados a la contabilidad del ledger de <strong className="text-slate-900">nuestro Sistema Corporativo (tablas contables centrales F0911 y F0411)</strong>, unificar el compliance AML (Prevención de Lavado de Activos exigido por la UAF en Chile) y optimizar el control inmobiliario y de órdenes de trabajo. Esta innovación reestructura actividades que consumían días hábiles de trabajo en **procesos instantáneos autogestionados y completamente trazables**.
                  </p>
                </div>
              </div>

              {/* SECCIÓN 1: BENEFICIOS CLAVE */}
              <div className="mb-6 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.25em] border-l-4 border-indigo-600 pl-3 leading-none text-slate-900">
                  Beneficios Clave del Ecosistema de Innovación
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Beneficio 1 */}
                  <div className="border border-slate-200 rounded-[20px] p-4 bg-slate-50/50 hover:bg-white transition-all space-y-1.5 align-top">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 font-bold">
                        <FileSpreadsheet size={15} />
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-slate-800">Carga Inteligente & Eliminación de Errores</h4>
                    </div>
                    <p className="text-[10px] text-slate-650 leading-relaxed">
                      El motor inteligente de ingesta procesa planillas complejas, analiza los datos mediante validaciones inteligentes del sistema central y genera directamente las transacciones sin descuadres. El sistema comprueba que cada fila calce con las cuentas contables del maestro general **F0901**.
                    </p>
                  </div>

                  {/* Beneficio 2 */}
                  <div className="border border-slate-200 rounded-[20px] p-4 bg-slate-50/50 hover:bg-white transition-all space-y-1.5 align-top">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 font-bold">
                        <ShieldCheck size={15} />
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-slate-800">Blindaje Normativo UAF & Ley 20.393</h4>
                    </div>
                    <p className="text-[10px] text-slate-655 leading-relaxed">
                      Auditoría inmediata de debida diligencia de proveedores, subcontratistas y beneficiarios finales mediante RUT. Detecta Personas Expuestas Políticamente (PEP) y entidades bloqueadas bajo circulares de la CMF, generando expedientes inmutables de cumplimiento corporativo.
                    </p>
                  </div>

                  {/* Beneficio 3 */}
                  <div className="border border-slate-200 rounded-[20px] p-4 bg-slate-50/50 hover:bg-white transition-all space-y-1.5 align-top">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-bold">
                        <Landmark size={15} />
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-slate-800">Conciliación Financiera Coherente</h4>
                    </div>
                    <p className="text-[10px] text-slate-655 leading-relaxed">
                      Une en tiempo real depósitos de garantías, liquidaciones de caja chica y arriendos con las cartolas bancarias. Se elimina el trabajo de cruzar planillas Excel manualmente al final del trimestre lo que libera hasta un 85% de carga sobre el personal senior.
                    </p>
                  </div>

                  {/* Beneficio 4 */}
                  <div className="border border-slate-200 rounded-[20px] p-4 bg-slate-50/50 hover:bg-white transition-all space-y-1.5 align-top">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-50 border border-rose-150 rounded-lg text-rose-700 font-bold">
                        <BarChart4 size={15} />
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-slate-800">Control de Rendimiento e Informes CMF</h4>
                    </div>
                    <p className="text-[10px] text-slate-655 leading-relaxed">
                      Genera planillas automatizadas de cierre regulador de forma limpia (Reportes B13, B4 e inclusive la compleja Nota 14), con una tasa de asertividad fiscal certificada del 99.4%, listas para ser presentadas al directorio.
                    </p>
                  </div>

                  {/* Beneficio 5 - Standard Grid Layout & Utilities */}
                  <div className="border border-indigo-200 rounded-[20px] p-4 bg-indigo-50/30 hover:bg-white transition-all space-y-1.5 col-span-1 align-top">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-800 font-bold">
                        <LayoutGrid size={15} />
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-1.5">
                        Apariencia Homologada & Operatividad de Grilla Central
                      </h4>
                    </div>
                    <p className="text-[10px] text-slate-700 leading-relaxed">
                      El sistema reproduce con precisión táctica la **interfaz clásica de grillas del sistema central (Classic Grid View)**. Cuenta con controles de filtrado rápido por columnas en línea, exportación directa a Excel con un clic, estado dinámico de base de datos vinculada con FireStore o Local Storage, indicador de ambiente Sandbox de control (“SNDBOX”), y botones rápidos de navegación integrados. Esto minimiza la curva de aprendizaje corporativo.
                    </p>
                  </div>

                  {/* Beneficio 6 - PROTECCIÓN ABSOLUTA DE DATOS */}
                  <div className="border border-emerald-200 rounded-[20px] p-4 bg-emerald-50/20 hover:bg-white transition-all space-y-1.5 col-span-1 align-top">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-100 border border-emerald-250 rounded-lg text-emerald-800 font-bold">
                        <Lock size={15} />
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-1.5">
                        Protección Absoluta de Datos & Blindaje CISO
                      </h4>
                    </div>
                    <p className="text-[10px] text-slate-700 leading-relaxed text-slate-655">
                      Seguridad con **cifrado AES-256 / SHA-2 en tránsito y reposo**. Cuenta con aislamiento lógico multiusuario (Multi-tenant Isolation) en Firestore Cloud, respaldos automatizados, políticas cero confianza y registros inmutables de auditoría transaccional para cumplir plenamente con normativas de seguridad ISO 27001 y de protección de datos.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: SIMULACIONES VISUALES / CAPTURAS DE PANTALLA */}
              <div className="mb-6 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.25em] border-l-4 border-indigo-600 pl-3 leading-none text-slate-900">
                  Evidencia Visual: Capturas del Sistema en Acción
                </h3>
                <p className="text-[10.5px] text-slate-500 italic uppercase">
                  *Las siguientes interfaces ilustran los módulos inteligentes instalados que dan soporte a los analistas operacionales.*
                </p>

                <div className="space-y-4 font-sans">
                  
                  {/* CAPTURA 1: CARGA CONTABLE INTELIGENTE (EXCEL TO CENTRAL) */}
                  <div className="border border-slate-300 rounded-[16px] overflow-hidden bg-white shadow-sm">
                    {/* Window Bar */}
                    <div className="bg-slate-900 px-4 py-2 flex items-center justify-between text-white border-b border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                        <span className="text-[9px] font-mono font-bold text-slate-400 ml-2">MÓDULO: R15011Z1I // INGESTA DE ACTIVOS</span>
                      </div>
                      <span className="text-[8px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-mono font-black">● CONEXIÓN ACTIVA CON EL CORE CENTRAL</span>
                    </div>

                    {/* Window content simulation */}
                    <div className="p-4 bg-slate-50 text-slate-800 text-xs flex gap-4">
                      {/* Left: file drop box */}
                      <div className="w-1/3 border-2 border-dashed border-indigo-300 rounded-xl p-3 bg-indigo-50/25 flex flex-col items-center justify-center text-center">
                        <FileSpreadsheet className="text-indigo-600 mb-1" size={24} />
                        <p className="text-[9.5px] font-black text-slate-800">ASSETFLOW_PRO_ACTIVOS.xlsx</p>
                        <p className="text-[7.5px] text-indigo-600 font-bold uppercase mt-1">✓ LOTE AUDITADO POR IA</p>
                      </div>
                      {/* Right: validation items */}
                      <div className="flex-1 space-y-2">
                        <div className="bg-white p-2 border border-slate-200 rounded-lg flex justify-between items-center text-[9px]">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span className="font-bold text-slate-800">Mapeo Cuenta Contable (F0901)</span>
                          </div>
                          <span className="font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-black uppercase text-[7.5px]">Correcto</span>
                        </div>
                        <div className="bg-white p-2 border border-slate-200 rounded-lg flex justify-between items-center text-[9px]">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span className="font-bold text-slate-800">Integridad Balance de Partida Doble</span>
                          </div>
                          <span className="font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-black uppercase text-[7.5px]">Débito = Crédito</span>
                        </div>
                        <div className="bg-white p-2 border border-slate-200 rounded-lg flex justify-between items-center text-[9px]">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span className="font-bold text-slate-800">Chilean RUT Validator Engine</span>
                          </div>
                          <span className="font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-black uppercase text-[7.5px]">100% Correcto</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CAPTURA 2: AUDITORÍA DE MATRICULA CUMPLIMIENTO UAF (PEP & LISTAS NEGRAS) */}
                  <div className="border border-slate-300 rounded-[16px] overflow-hidden bg-white shadow-sm">
                    {/* Window Bar */}
                    <div className="bg-indigo-950 px-4 py-2 flex items-center justify-between text-white border-b border-indigo-900">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                        <span className="text-[9px] font-mono font-bold text-indigo-300 ml-2">MÓDULO: P0115U // PREVENCIÓN DE LAVADO UAF & AML</span>
                      </div>
                      <span className="text-[8px] bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded font-mono font-black">SEGURIDAD ISO 27001-CISO</span>
                    </div>

                    {/* Window content simulation */}
                    <div className="p-4 bg-[#F8FAFC] text-slate-800 text-xs space-y-3">
                      <div className="flex items-center justify-between bg-white p-3 border border-slate-150 rounded-xl">
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5 font-mono">PROVEEDOR EVALUADO</p>
                          <p className="text-xs font-black text-slate-800">SOCIEDAD CONSTRUCTORA MAULE LIMITADA</p>
                          <p className="text-[9px] font-mono text-slate-550 mt-1">RUT: 76.541.229-K | Categoría: Obras Civiles</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block bg-emerald-50 border border-emerald-250 text-emerald-800 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                            ✓ CERTIFICADO VIGENTE
                          </span>
                        </div>
                      </div>

                      {/* Detail Metrics checklist */}
                      <div className="grid grid-cols-4 gap-2 font-mono">
                        <div className="bg-white p-2 rounded-lg border border-slate-150 text-center">
                          <p className="text-[6.5px] font-black text-slate-400 uppercase leading-none">Criba PEP</p>
                          <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">✓ SIN RIESGO</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-150 text-center">
                          <p className="text-[6.5px] font-black text-slate-400 uppercase leading-none">Lista Clinton</p>
                          <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">✓ APTO</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-150 text-center">
                          <p className="text-[6.5px] font-black text-slate-400 uppercase leading-none">Boletín SII</p>
                          <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">✓ VIGENTE</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-150 text-center">
                          <p className="text-[6.5px] font-black text-slate-400 uppercase leading-none">Riesgo Global</p>
                          <p className="text-[10px] font-black text-indigo-700 uppercase mt-1">0.02% (BAJO)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CAPTURA 3: GRILLA ESTÁNDAR CENTRAL (LOOK & FEEL) */}
                  <div className="border border-slate-300 rounded-[16px] overflow-hidden bg-white shadow-sm">
                    {/* Window Bar */}
                    <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                        <span className="text-[9px] font-mono font-black text-slate-600 ml-2">SYSTEM: ASSETFLOW_FIN_GRID_F0411 (HELP DESK TI)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[7px] bg-amber-500/10 text-amber-800 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          SNDBOX: AMBIENTE DE PRUEBAS
                        </span>
                        <span className="text-[7px] bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                          FIRESTORE ACTIVE
                        </span>
                      </div>
                    </div>

                    {/* Ribbon Controls (Classic Ribbon) */}
                    <div className="p-2.5 bg-slate-50/75 border-b border-slate-200 px-4 flex justify-between items-center text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-extrabold uppercase text-[8px] tracking-wide">Acciones de Grilla:</span>
                        <span className="font-black text-slate-700 hover:text-indigo-600 cursor-pointer border border-slate-200 px-2 py-1 rounded bg-white shadow-xs">＋ NUEVO</span>
                        <span className="font-black text-slate-700 hover:text-indigo-600 cursor-pointer border border-slate-200 px-2 py-1 rounded bg-white shadow-xs">📥 IMPORTAR EXCEL</span>
                        <span className="font-black text-slate-700 hover:text-indigo-600 cursor-pointer border border-slate-200 px-2 py-1 rounded bg-white shadow-xs">⎙ EXPORTAR CSV</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1">
                        <span className="text-slate-400 font-bold uppercase text-[7.5px] mr-1">Filtro Rápido:</span>
                        <input type="text" placeholder="Buscar en columnas..." className="bg-transparent border-none text-[9px] outline-none w-24" disabled value="Permisos Power" />
                      </div>
                    </div>

                    {/* Grid Table Simulation */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[9px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-black">
                            <th className="p-2 border-r border-slate-200">ID Incidencia</th>
                            <th className="p-2 border-r border-slate-200">Asunto Solicitud / Cuenta</th>
                            <th className="p-2 border-r border-slate-200">Solicitante</th>
                            <th className="p-2 border-r border-slate-200">Estado</th>
                            <th className="p-2 border-r border-slate-200">Trazabilidad de Movimientos</th>
                          </tr>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <td className="p-1 border-r border-slate-200"><input type="text" className="w-full text-[8.5px] border border-slate-200 p-0.5 rounded outline-none font-mono" disabled value="TI-2025-0004" /></td>
                            <td className="p-1 border-r border-slate-200"><input type="text" className="w-full text-[8.5px] border border-slate-200 p-0.5 rounded outline-none font-mono" disabled value="SOLICITUD PERMISOS POWER" /></td>
                            <td className="p-1 border-r border-slate-200"><input type="text" className="w-full text-[8.5px] border border-slate-200 p-0.5 rounded outline-none font-mono" disabled value="HUGO NUÑEZ" /></td>
                            <td className="p-1 border-r border-slate-200"><input type="text" className="w-full text-[8.5px] border border-slate-200 p-0.5 rounded outline-none font-mono" disabled value="ABIERTO" /></td>
                            <td className="p-1 border-r border-slate-200"><input type="text" className="w-full text-[8.5px] border border-slate-200 p-0.5 rounded outline-none font-mono" disabled value="2D 20H SIN MOVIMIENTO" /></td>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-105 hover:bg-slate-50/50">
                            <td className="p-2 border-r border-slate-105 font-mono text-indigo-700 font-bold">TI-2025-0004</td>
                            <td className="p-2 border-r border-slate-105 font-medium text-slate-800">SOLICITUD PERMISOS MICROSOFT POWER PLATFORM</td>
                            <td className="p-2 border-r border-slate-105 text-slate-600 font-bold">HUGO NUÑEZ</td>
                            <td className="p-2 border-r border-slate-105"><span className="bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded text-[8px] uppercase">ABIERTO</span></td>
                            <td className="p-2 border-r border-slate-105 font-mono text-slate-500">2D 20H SIN MOVIMIENTO</td>
                          </tr>
                          <tr className="border-b border-slate-105 hover:bg-slate-50/50">
                            <td className="p-2 border-r border-slate-105 font-mono text-indigo-700 font-bold">TI-2025-0003</td>
                            <td className="p-2 border-r border-slate-105 font-medium text-slate-800">ACCESO APLICATIVOS MICROSOFT 365</td>
                            <td className="p-2 border-r border-slate-105 text-slate-600 font-bold">HUGO NUÑEZ</td>
                            <td className="p-2 border-r border-slate-105"><span className="bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded text-[8px] uppercase">ABIERTO</span></td>
                            <td className="p-2 border-r border-slate-105 font-mono text-slate-500">2D 20H SIN MOVIMIENTO</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </div>

              {/* SECCIÓN 3: ROI Y RETORNO */}
              <div className="border border-indigo-100 rounded-[24px] p-6 mb-8 bg-indigo-50/20">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-indigo-950 flex items-center gap-2">
                  <BarChart4 size={16} className="text-indigo-700" /> Métricas e Indicador del Retorno de la Inversión (ROI) de la Innovación
                </h3>
                
                <div className="flex gap-8 items-center">
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase mb-1">
                        <span>Tiempo de Cierre Mensual Tradicional (Manual / Excel)</span>
                        <span className="font-mono text-slate-900">12 Días Hábiles</span>
                      </div>
                      <div className="w-full h-5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-400 text-white text-[9px] font-black flex items-center pl-3" style={{ width: '100%' }}>
                          Validación Manual de Impuestos, Bancos & Mayor
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase mb-1">
                        <span>Tiempo de Cierre con el Nuevo Sistema Inteligente</span>
                        <span className="font-mono text-indigo-650 font-black">3 Minutos</span>
                      </div>
                      <div className="w-full h-5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-[9px] font-black flex items-center pl-3" style={{ width: '7%' }}>
                          Match Instantáneo
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-48 p-4 bg-gradient-to-br from-indigo-950 to-indigo-900 text-white rounded-2xl flex flex-col justify-center items-center text-center shadow-md">
                    <span className="text-3xl font-black tracking-tight leading-none text-emerald-400 font-mono">99.8%</span>
                    <span className="text-[7.5px] font-black uppercase tracking-widest mt-1 text-slate-300">Ahorro en Tiempo Operativo</span>
                  </div>
                </div>
              </div>

              {/* FOOTER CORPORATIVO DE LA PROPUESTA */}
              <div className="mt-auto pt-6 border-t-[5px] border-indigo-950 flex justify-between items-end">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                    <Award size={12} className="text-indigo-600" /> COMITÉ DE INNOVACIÓN & TI ASSETFLOW PRO
                  </div>
                  <div className="text-[8px] font-mono text-slate-450 italic">TRANSACTION_ID: {reportId} // CLASIFICACIÓN: CONFIDENCIAL</div>
                </div>
                
                <div className="flex gap-12">
                  <div className="w-52 text-center border-t border-slate-300 pt-3">
                    <p className="text-[10px] font-black uppercase text-slate-800 leading-none">ÁREA DE INNOVACIÓN</p>
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mt-1">EVALUACIÓN DE TECNOLOGÍA</p>
                  </div>
                  <div className="w-52 text-center border-t border-slate-300 pt-3">
                    <p className="text-[10px] font-black uppercase text-indigo-950 leading-none">{currentUser}</p>
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mt-1">LÍDER PMO INNOVACIÓN</p>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* 
              =========================================
              TAB 2: ORIGINAL INFORME TÉCNICO PMO
              =========================================
            */
            <div className="flex flex-col flex-1">
              
              {/* CABECERA CORPORATIVA */}
              <div className="flex justify-between items-start border-b-[5px] border-slate-900 pb-6 mb-8">
                <div className="flex items-center gap-5">
                  {companyLogo ? (
                    <img src={companyLogo} className="w-20 h-20 object-contain" alt="Logo" />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} className="w-20 h-20 flex items-center justify-center [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:object-contain" />
                  )}
                  <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 text-slate-900">Informe Técnico de Negocio</h1>
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest italic">Automatización Financiera & Integración de Core Contable Central</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="bg-emerald-55 text-emerald-800 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase border border-emerald-250">Solución Aprobada</span>
                      <span className="bg-indigo-50 text-indigo-800 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase border border-indigo-250">ROI 314% Verificado</span>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">PMO - Solutions</p>
                  <p className="text-sm font-black text-emerald-600 uppercase tracking-tight">Finanzas & TI</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase font-mono">{today}</p>
                </div>
              </div>

              {/* METADATOS DEL PROYECTO */}
              <div className="grid grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-150 mb-6 font-sans">
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nombre del Proyecto</p>
                  <p className="text-xs font-black text-slate-800 uppercase">Sincronización Central</p>
                </div>
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Líder Técnico</p>
                  <p className="text-xs font-black text-slate-800 uppercase">Cristian Muñoz</p>
                </div>
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Área Destinataria</p>
                  <p className="text-xs font-black text-indigo-700 uppercase font-bold">Área de Proyectos</p>
                </div>
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">ID Propuesta</p>
                  <p className="text-xs font-black text-slate-800 uppercase font-mono">{reportId.split('-')[2]}</p>
                </div>
              </div>

              {/* RESUMEN EJECUTIVO DE PROYECTOS */}
              <div className="bg-slate-100 border-2 border-slate-300 text-slate-900 p-6 rounded-[28px] mb-8 relative overflow-hidden shadow-xs">
                <div className="absolute right-0 bottom-0 opacity-[0.04] -mr-12 -mb-12 text-slate-900"><Cpu size={200} /></div>
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-700 rounded-xl text-white shadow-xs"><Rocket size={20} /></div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Resumen Ejecutivo para la PMO</h2>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    Esta propuesta detalla la **Estrategia Core de Automatización Financiera e Inmobiliaria** diseñada para mitigar pérdidas operacionales, agilizar los reportes normativos ante la CMF (Planillas B13, B4 y Nota 14) y centralizar la auditoría de caja chica y sub-contratos. Mediante la integración de un **motor analítico híbrido de IA y validación de doble entrada (Standard F0911/F0411)**, el sistema erradica las correcciones manuales de cierres de mes, reduciendo los tiempos de procesamiento de <strong>15 días hábiles a 3 minutos in situ</strong>.
                  </p>
                </div>
              </div>

              {/* INFORMACIÓN DE RETORNO Y VELOCIDAD (KPIs DE PROYECTO) */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 border-2 border-slate-100 rounded-[22px] bg-emerald-50/20 flex flex-col justify-between items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 mb-2">
                    <Clock size={16} />
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ahorro Mensual</span>
                  <p className="text-2xl font-black text-emerald-700 font-mono leading-none mb-1">120 hrs</p>
                  <span className="text-[7.5px] font-extrabold text-slate-500 uppercase">Por Analista Contable</span>
                </div>
                <div className="p-4 border-2 border-slate-100 rounded-[22px] bg-indigo-50/20 flex flex-col justify-between items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 mb-2">
                    <TrendingUp size={16} />
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Efectividad de Procesos</span>
                  <p className="text-2xl font-black text-indigo-700 font-mono leading-none mb-1">98.6%</p>
                  <span className="text-[7.5px] font-extrabold text-slate-500 uppercase">Sin Errores Manuales</span>
                </div>
                <div className="p-4 border-2 border-slate-100 rounded-[22px] bg-amber-50/20 flex flex-col justify-between items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 mb-2">
                    <DollarSign size={16} />
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Recuperación ROI</span>
                  <p className="text-2xl font-black text-amber-700 font-mono leading-none mb-1 font-bold">4.2 Meses</p>
                  <span className="text-[7.5px] font-extrabold text-slate-500 uppercase">Payback Técnico</span>
                </div>
              </div>

              {/* COMPONENTE GRÁFICO - COMPARATIVA DE RENDIMIENTO */}
              <div className="border border-slate-200 rounded-[24px] p-6 mb-8 bg-slate-50/50">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-slate-800 flex items-center gap-2">
                  <BarChart4 size={16} className="text-emerald-600" /> Comparativa de Rendimiento Operacional: Automatización vs Tradicional
                </h3>
                
                <div className="flex gap-8 items-center flex-row">
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase mb-1">
                        <span>Trabajo Tradicional (Preparación Manual de F0911)</span>
                        <span className="font-mono text-slate-900 font-bold">145 Horas / Mes</span>
                      </div>
                      <div className="w-full h-6 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-400 text-white text-[9px] font-bold flex items-center pl-3" style={{ width: '100%' }}>
                          Esfuerzo Manual Manual & Validación Excel
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase mb-1">
                        <span>Con Plataforma Inteligente Integrada (Actual)</span>
                        <span className="font-mono text-emerald-600 font-bold">12 Horas / Mes</span>
                      </div>
                      <div className="w-full h-6 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 text-white text-[9px] font-black flex items-center pl-3" style={{ width: '8.2%' }}>
                          3 mins/Lote
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-48 p-4 bg-emerald-950 text-emerald-100 rounded-2xl flex flex-col justify-center items-center text-center">
                    <span className="text-[28px] font-black tracking-tight leading-none">-91.7%</span>
                    <span className="text-[8px] font-black uppercase tracking-widest mt-1 text-emerald-300">Esfuerzo de Procesamiento</span>
                  </div>
                </div>
              </div>

              {/* ALINEACIÓN DE ARQUITECTURA TÉCNICA */}
              <div className="space-y-6 flex-1 mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.25em] border-l-4 border-emerald-600 pl-3 leading-none text-slate-800">
                  Arquitectura de Solución e Integración de Sistemas
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-[20px] p-4 bg-white space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                        <Database size={15} />
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-slate-800">Capa Transaccional Central</h4>
                    </div>
                    <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                      Conexión segura de lectura y balanceo diario con las tablas maestras **F0911 (Ledger General)** y **F0411 (Cuentas por Pagar)**. El sistema asigna programas específicos como `P0911` y `P0411`, asegurando trazabilidad por puesto de trabajo (`workStationId`).
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-[20px] p-4 bg-white space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600">
                        <ShieldCheck size={15} />
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-slate-800">Capa de Trazabilidad & AML</h4>
                    </div>
                    <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                      Modulo de cumplimiento automatizado para la **Directiva CMF & AML de la UAF**. Mantiene un flujo de validación inmutable para subcontratistas y proveedores (RUT bloqueado, PEP, conflicto de interés) antes de abrir cualquier orden.
                    </p>
                  </div>
                </div>

                {/* PLAN DE TRABAJO */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-[0.25em] border-l-4 border-slate-900 pl-3 leading-none text-slate-800">
                    Estrategia de Despliegue & Fases PMO
                  </h3>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 font-sans">
                    <div className="p-3 text-[10px] flex justify-between items-center bg-slate-50 font-bold uppercase text-slate-700">
                      <span>Fase de Proyecto</span>
                      <span>Plazo sugerido</span>
                      <span>Estado de Solución</span>
                    </div>
                    
                    <div className="p-3 text-[10px] flex justify-between items-center hover:bg-slate-50/50">
                      <div className="space-y-0.5">
                        <p className="font-black text-slate-800">1. Fase de Análisis e Ingesta de Datos (Carga Inteligente)</p>
                        <p className="text-[9px] text-slate-400 font-medium uppercase font-mono">Lectura dinámica de contratos, tasaciones, oficios mediante IA</p>
                      </div>
                      <span className="font-mono font-bold text-slate-500">Semana 1-2</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-black text-[8px] rounded-full uppercase">Listo en App</span>
                    </div>

                    <div className="p-3 text-[10px] flex justify-between items-center hover:bg-slate-50/50">
                      <div className="space-y-0.5">
                        <p className="font-black text-slate-800">2. Integración de Libros Balances & Cuenta Corriente Central</p>
                        <p className="text-[9px] text-slate-400 font-medium uppercase font-mono">Consolidación de egresos vs balances bancarios en AS400</p>
                      </div>
                      <span className="font-mono font-bold text-slate-500">Semana 3-4</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-black text-[8px] rounded-full uppercase">Listo en App</span>
                    </div>

                    <div className="p-3 text-[10px] flex justify-between items-center hover:bg-slate-50/50">
                      <div className="space-y-0.5">
                        <p className="font-black text-slate-800">3. Auditoría e Integridad Lógica (CISO & ISO 27001)</p>
                        <p className="text-[9px] text-slate-400 font-medium uppercase font-mono">Validación por el evaluador de accesos ante directivas</p>
                      </div>
                      <span className="font-mono font-bold text-slate-500">Semana 5</span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-black text-[8px] rounded-full uppercase">Certificado</span>
                    </div>
                  </div>
                </div>

                {/* NOTAS AL PIE DE PROYECTOS */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-[20px]">
                  <p className="text-[9.5px] font-bold text-slate-800 uppercase mb-1">Notas de Viabilidad PMO:</p>
                  <p className="text-[9px] text-slate-500 leading-relaxed font-semibold uppercase">
                    *La inversión inicial incluye el módulo de IA nativo con soporte ilimitado de plantillas de informe regulador B13/B4. Los costos de mantenimiento recurrente se estiman en 0.5% del ahorro operacional mensual verificado, asegurando un flujo de caja positivo constante desde el primer mes.*
                  </p>
                </div>
              </div>

              {/* PIE DE FIRMA F0911 PROYECTOS */}
              <div className="mt-auto pt-6 border-t-[5px] border-slate-900 flex justify-between items-end">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                    <FileText size={12}/> PMO BUSINESS SOLUTIONS
                  </div>
                  <div className="text-[8px] font-mono text-slate-450 italic font-medium">SOLUTION_APPROVAL_CODE: {reportId}</div>
                </div>
                
                <div className="flex gap-12">
                  <div className="w-52 text-center border-t border-slate-350 pt-3">
                    <p className="text-[10px] font-black uppercase text-black leading-none">SOCIOS DE TI & PROYECTOS</p>
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mt-1">APROBACIÓN COMITÉ DE TI</p>
                  </div>
                  <div className="w-52 text-center border-t border-slate-350 pt-3">
                    <p className="text-[10px] font-black uppercase text-black leading-none">{currentUser}</p>
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mt-1">LÍDER PMO IMPLEMENTACIÓN</p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* CLONE CONTAINER FOR SCREEN-PERFECT PRINT OUT */}
      <div id="printable-project-wrapper" className="absolute bottom-0 left-0 w-0 h-0 overflow-hidden pointer-events-none"></div>

    </div>
  );
};

export default ProjectAssessmentReport;
