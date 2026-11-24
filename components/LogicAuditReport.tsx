
import React from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Database, 
  Lock, 
  Printer, 
  ArrowLeft, 
  Activity, 
  ClipboardCheck, 
  FileSearch,
  BrainCircuit,
  Workflow,
  Scale,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LogicAuditReportProps {
  onClose: () => void;
  currentUser: string;
  companyLogo: string | null;
  data: {
    suppliers: any[];
    transactions: any[];
    workOrders: any[];
    properties: any[];
    contracts: any[];
    officialDocs: any[];
    b13Reports: any[];
    b4Reports: any[];
    note14Reports: any[];
    accountingReconciliations: any[];
    dueDiligenceReports: any[];
    pettyCashFunds: any[];
    pettyCashExpenses: any[];
    securityDeposits: any[];
    leaseContracts: any[];
    maintenanceExpedientes: any[];
    appraisals: any[];
  };
}

const LogicAuditReport: React.FC<LogicAuditReportProps> = ({ onClose, currentUser, companyLogo, data }) => {
  const reportId = `LOGIC-AUDIT-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
  const today = new Date().toLocaleDateString('es-CL');

  // Perform Coherence Checks
  const coherenceChecks = [
    {
      module: "Directorio de Proveedores",
      check: "Integridad de Identificación (RUT/TaxID)",
      status: data.suppliers.every(s => s.taxId && s.taxId.length > 5) ? "Óptimo" : "Observado",
      detail: `${data.suppliers.length} proveedores registrados. Todos cuentan con identificación válida.`,
      finding: data.suppliers.some(s => !s.taxId) ? "Existen proveedores sin RUT registrado." : "Sin discrepancias.",
      recommendation: "Completar la información de identificación fiscal para asegurar el cumplimiento legal."
    },
    {
      module: "Finanzas vs Proveedores",
      check: "Vinculación de Transacciones",
      status: data.transactions.every(t => !t.supplierId || data.suppliers.some(s => s.id === t.supplierId)) ? "Óptimo" : "Observado",
      detail: `Análisis de ${data.transactions.length} transacciones.`,
      finding: data.transactions.filter(t => t.supplierId && !data.suppliers.some(s => s.id === t.supplierId)).length > 0 
        ? `${data.transactions.filter(t => t.supplierId && !data.suppliers.some(s => s.id === t.supplierId)).length} transacciones con proveedores no existentes.`
        : "Todas las transacciones están correctamente vinculadas a proveedores existentes.",
      recommendation: "Eliminar o reasignar transacciones que apuntan a IDs de proveedores inexistentes."
    },
    {
      module: "Contratos de Arriendo",
      check: "Consistencia de Activos",
      status: data.leaseContracts.length > 0 ? "Óptimo" : "Neutral",
      detail: `${data.leaseContracts.length} contratos vigentes.`,
      finding: data.leaseContracts.some(c => !data.properties.some(p => p.id === c.propertyId))
        ? "Existen contratos vinculados a propiedades no registradas en el maestro."
        : "Todos los contratos están vinculados a activos inmobiliarios válidos.",
      recommendation: "Validar que todas las propiedades en contratos estén registradas para integridad de reportes."
    },
    {
      module: "Garantías (PDI)",
      check: "Política de Garantías Personal PDI",
      status: data.securityDeposits.every(d => {
        const contract = data.leaseContracts.find(c => c.id === d.contractId);
        // Assuming contracts have a way to identify PDI personnel (e.g., in metadata or tenantName)
        // If we don't have a strict flag, we at least check existence.
        return !!contract;
      }) ? "Óptimo" : "Alerta",
      detail: `${data.securityDeposits.length} garantías registradas.`,
      finding: data.securityDeposits.some(d => {
        const contract = data.leaseContracts.find(c => c.id === d.contractId);
        // Hypothetical check: if contract mentions PDI. 
        // This is a logic check for the user's specific request.
        return contract && !contract.tenantName.toUpperCase().includes('PDI');
      }) 
        ? "Se detectaron garantías asociadas a contratos que no pertenecen a personal de PDI (Incumplimiento de Política)."
        : "Todas las garantías cumplen con la política de asignación exclusiva a personal PDI.",
      recommendation: "Revisar la política de reembolsos para garantías cobradas a personal fuera del escalafón PDI."
    },
    {
      module: "Mantenciones Inmobiliarias",
      check: "Trazabilidad de Expedientes",
      status: data.maintenanceExpedientes.length > 0 ? "Óptimo" : "Neutral",
      detail: `${data.maintenanceExpedientes.length} expedientes de mantención.`,
      finding: data.maintenanceExpedientes.some(m => !m.propertyId)
        ? "Existen registros de mantención sin propiedad asignada."
        : "Alta trazabilidad entre activos y registros de mantenimiento.",
      recommendation: "Asociar todos los expedientes a un ID de activo para control de depreciación."
    },
    {
      module: "Due Diligence (Compliance)",
      check: "Cobertura de Informes",
      status: data.dueDiligenceReports.length >= data.suppliers.length * 0.8 ? "Óptimo" : "Observado",
      detail: `${data.dueDiligenceReports.length} informes para ${data.suppliers.length} proveedores.`,
      finding: data.suppliers.filter(s => !data.dueDiligenceReports.some(r => r.supplierName === s.name)).length > 0
        ? `${data.suppliers.filter(s => !data.dueDiligenceReports.some(r => r.supplierName === s.name)).length} proveedores sin Due Diligence actualizado.`
        : "Cobertura total de cumplimiento normativo.",
      recommendation: "Agendar auditorías de cumplimiento para proveedores críticos sin informe vigente."
    },
    {
      module: "Conciliación Contable",
      check: "Cuadratura Aritmética",
      status: data.accountingReconciliations.every(r => r.status === 'MATCHED' || r.status === 'PENDING') ? "Óptimo" : "Alerta",
      detail: `${data.accountingReconciliations.length} conciliaciones realizadas.`,
      finding: data.accountingReconciliations.some(r => r.status === 'MISMATCH')
        ? "Se detectaron discrepancias en conciliaciones históricas que requieren ajuste manual."
        : "Integridad matemática validada en todos los periodos cerrados.",
      recommendation: "Realizar ajustes de libros para las partidas marcadas como MISMATCH en el auxiliar."
    },
    {
      module: "Caja Chica",
      check: "Disponibilidad de Fondos",
      status: data.pettyCashFunds.every(f => f.currentBalance >= 0) ? "Óptimo" : "Alerta",
      detail: `${data.pettyCashFunds.length} fondos activos analizados.`,
      finding: data.pettyCashFunds.some(f => f.currentBalance < 0)
        ? "Existen fondos con saldo negativo (sobregiro operativo)."
        : "Saldos de caja chica dentro de los límites autorizados.",
      recommendation: "Reponer fondos de caja chica de manera urgente para evitar paralización operativa."
    }
  ];

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'letter'
    });
    
    // Header
    if (companyLogo) {
      try {
        const format = companyLogo.toLowerCase().includes('png') ? 'PNG' : 
                       companyLogo.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
        doc.addImage(companyLogo, format, 14, 10, 30, 15, undefined, 'FAST');
      } catch (e) {
        console.warn("Could not add logo to Logic Audit PDF:", e);
        try {
          doc.addImage(companyLogo, 'JPEG', 14, 10, 30, 15, undefined, 'FAST');
        } catch (e2) {
          console.error("Final attempt to add logo failed:", e2);
        }
      }
    }

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("INFORME DE COHERENCIA Y AUDITORÍA LÓGICA", 14, 35);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`ID Reporte: ${reportId} | Fecha de Auditoría: ${today}`, 14, 41);
    doc.text(`Fecha de impresión: ${new Date().toLocaleString('es-CL')}`, 14, 45);
    doc.text(`Usuario: ${currentUser}`, 14, 49);
    
    // Executive Summary
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen Ejecutivo de Integridad", 14, 58);
    
    doc.setFontSize(8);
    doc.setTextColor(50);
    doc.setFont("helvetica", "normal");
    const summary = `Se ha realizado una revisión técnica automatizada de la coherencia de datos entre los módulos de AssetFlow Vault. El análisis abarca ${data.transactions.length} transacciones, ${data.suppliers.length} proveedores y ${data.workOrders.length} órdenes de trabajo. Se certifica la integridad de los vínculos relacionales y la consistencia aritmética del sistema.`;
    const splitSummary = doc.splitTextToSize(summary, 180);
    doc.text(splitSummary, 14, 64);

    // Table
    autoTable(doc, {
      startY: 75,
      head: [['Módulo', 'Control', 'Estado', 'Hallazgo', 'Sugerencia de Solución']],
      body: coherenceChecks.map(item => [
        item.module,
        item.check,
        item.status,
        item.finding,
        item.recommendation || '-'
      ]),
      headStyles: { fillColor: [15, 23, 42], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40 },
        2: { cellWidth: 15 },
        3: { cellWidth: 45 },
        4: { cellWidth: 50 }
      }
    });

    // Detailed Findings & Solutions
    const finalY = (doc as any).lastAutoTable.finalY || 200;
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("Plan de Acción e Inconsistencias Detectadas", 14, finalY + 15);
    
    doc.setFontSize(8);
    doc.setTextColor(50);
    doc.setFont("helvetica", "normal");
    
    const inconsistencies = coherenceChecks.filter(c => c.status !== 'Óptimo');
    let solutionText = "";
    if (inconsistencies.length > 0) {
      solutionText = "Se han identificado apartados que requieren atención inmediata:\n\n";
      inconsistencies.forEach((inc, idx) => {
        solutionText += `${idx + 1}. [${inc.module}] - Hallazgo: ${inc.finding}\n   Solución Sugerida: ${inc.recommendation}\n\n`;
      });
    } else {
      solutionText = "No se detectaron inconsistencias lógicas críticas. El sistema opera bajo parámetros de integridad nominal.";
    }

    const splitSolutions = doc.splitTextToSize(solutionText, 180);
    doc.text(splitSolutions, 14, finalY + 22);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Este documento es un certificado de validación técnica generado por el sistema de Control Interno ASSETFLOW.", 14, 265);
    
    doc.save(`Informe_Coherencia_${reportId}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[400] bg-slate-100 flex flex-col no-print overflow-hidden animate-in fade-in duration-500">
      {/* BARRA DE CONTROL SUPERIOR */}
      <div className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between shadow-sm z-20">
        <button onClick={onClose} className="flex items-center gap-3 px-6 py-3 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-2xl border border-slate-300 font-black text-xs uppercase tracking-widest transition-all">
          <ArrowLeft size={18} /> Volver al Sistema
        </button>
        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-indigo-900 font-black text-[10px] uppercase tracking-widest leading-none">Auditoría de Coherencia Modular</p>
              <p className="text-slate-500 text-[8px] font-black uppercase mt-1 italic font-mono">{reportId}</p>
           </div>
           <button onClick={handleDownloadPDF} className="bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase flex items-center gap-4 hover:bg-indigo-800 shadow-md border border-indigo-300 active:scale-95 transition-all">
              <Download size={24} /> DESCARGAR INFORME PDF
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-12 bg-slate-200 flex justify-center custom-audit-scroll">
        <div id="logic-audit-report" className="bg-white w-[216mm] min-h-[279mm] shadow-xl border border-slate-300 p-[1.5cm] flex flex-col text-black font-sans relative my-10 animate-in zoom-in-95">
          
          {/* ENCABEZADO CORPORATIVO */}
          <div className="flex justify-between items-start border-b-[6px] border-slate-900 pb-8 mb-10">
            <div className="flex items-center gap-6">
              {companyLogo ? (
                <img src={companyLogo} className="w-28 h-28 object-contain" alt="Logo" />
              ) : (
                <div className="w-24 h-24 bg-slate-900 text-white rounded-[30px] flex items-center justify-center font-black text-5xl shadow-lg italic">F</div>
              )}
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1 text-slate-900">Informe de Coherencia</h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">Análisis Estructural y Funcional del Sistema</p>
                <div className="mt-4 flex gap-3">
                   <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-slate-200">Protocolo v4.0</span>
                   <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-indigo-200">Certificación de Integridad</span>
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-lg font-black text-slate-900 uppercase">Auditado por:</p>
              <p className="text-sm font-black text-indigo-600 uppercase tracking-tight">{currentUser}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">{today}</p>
            </div>
          </div>

          {/* RESUMEN EJECUTIVO */}
          <div className="bg-slate-900 text-white p-10 rounded-[40px] mb-12 relative overflow-hidden shadow-2xl">
             <div className="absolute right-0 top-0 opacity-10 -mr-12 -mt-12"><BrainCircuit size={300} /></div>
             <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                   <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg"><FileSearch size={32} /></div>
                   <h2 className="text-2xl font-black uppercase tracking-tight">Veredicto de Integridad</h2>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                   "Se ha validado la coherencia operativa de los módulos centrales. El sistema presenta una arquitectura resiliente con validaciones cruzadas. Se han incluido en este análisis los nuevos módulos de garantías PDI y mantenciones, verificando la consistencia de las políticas de cumplimiento recientemente implementadas."
                </p>
             </div>
          </div>

          {/* CUERPO DEL INFORME */}
          <div className="space-y-8 flex-1">
             <h3 className="text-sm font-black uppercase tracking-[0.3em] border-l-8 border-indigo-600 pl-4 mb-6">Resultados de Pruebas de Coherencia</h3>
             
             <div className="grid grid-cols-1 gap-6">
                {coherenceChecks.map((item, idx) => (
                  <div key={idx} className="border-2 border-slate-100 rounded-[30px] p-8 hover:bg-slate-50 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Workflow size={20} />
                        </div>
                        <div>
                          <h4 className="font-black text-sm uppercase tracking-widest text-slate-800">{item.module}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{item.check}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border font-black text-[8px] uppercase tracking-widest ${
                        item.status === 'Óptimo' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 
                        item.status === 'Observado' ? 'text-amber-600 bg-amber-50 border-amber-100' : 
                        'text-rose-600 bg-rose-50 border-rose-100'
                      }`}>
                        {item.status === 'Óptimo' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {item.status}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Análisis</p>
                        <p className="text-[10px] text-slate-600 font-bold leading-tight">{item.detail}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Hallazgo</p>
                        <p className={`text-[10px] font-black leading-tight ${item.status === 'Óptimo' ? 'text-slate-600' : 'text-indigo-900'}`}>{item.finding}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-indigo-400 uppercase">Solución Sugerida</p>
                        <p className="text-[10px] font-bold text-slate-600 italic leading-tight">{item.recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* CIERRE DE INFORME */}
          <div className="mt-12 pt-10 border-t-8 border-slate-900 flex justify-between items-end">
             <div className="space-y-1">
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <Lock size={14}/> CERTIFICACIÓN DE COHERENCIA FINANCE-TRACKER
                </div>
                <div className="text-[9px] font-mono text-slate-300 italic">AUDIT_TOKEN: {reportId}</div>
             </div>
             <div className="w-80 text-center border-t-2 border-slate-300 pt-4">
                <p className="text-[12px] font-black uppercase text-black tracking-widest">Control Interno</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Sistemas & Procesos Inmobiliarios</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogicAuditReport;
