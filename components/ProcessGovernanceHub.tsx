import React, { useState } from 'react';
import { 
  Network, ShieldAlert, CheckCircle2, Clock, Lock, Unlock, 
  ArrowRight, UserCheck, AlertTriangle, Building2, Layers, 
  DollarSign, FileText, Send, X, RefreshCw, Sparkles, Scale,
  Briefcase, CheckSquare, ChevronRight, Activity, HelpCircle, FileCheck
} from 'lucide-react';
import { ProcessContingencyModal, ContingencyBypassPayload } from './ProcessContingencyModal';
import { formatCLP } from '../lib/chileanUtils';

export interface CorporateProcessItem {
  id: string;
  code: string;
  title: string;
  category: 'ARRIENDOS' | 'TESORERIA' | 'SEGUROS' | 'PROVEEDORES' | 'OPERACIONES';
  originArea: string;
  blockingArea: string;
  targetFinalArea: string;
  activeBlockCount: number;
  ruleGate: string;
  description: string;
  sampleRecordId: string;
  sampleRecordTitle: string;
  status: 'FLUIDO' | 'BLOQUEADO' | 'SUBROGADO';
  contingencyHistory: Array<{
    date: string;
    subrogateUser: string;
    reason: string;
    recordTitle: string;
  }>;
}

interface ProcessGovernanceHubProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  onLogContingency?: (payload: ContingencyBypassPayload) => void;
}

export const ProcessGovernanceHub: React.FC<ProcessGovernanceHubProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogContingency
}) => {
  const [selectedProcess, setSelectedProcess] = useState<CorporateProcessItem | null>(null);
  const [isContingencyModalOpen, setIsContingencyModalOpen] = useState(false);
  const [targetForContingency, setTargetForContingency] = useState<CorporateProcessItem | null>(null);

  // Initial registry of the 6 core enterprise interconnected processes
  const [processes, setProcesses] = useState<CorporateProcessItem[]>([
    {
      id: 'proc_1',
      code: 'ERP P1501',
      title: '1. Onboarding y Aprobación de Arrendatarios',
      category: 'ARRIENDOS',
      originArea: 'Comercial / Captación',
      blockingArea: 'Riesgo Financiero & Compliance UAF',
      targetFinalArea: 'Facturación & Cobranzas',
      activeBlockCount: 2,
      ruleGate: 'Comercial no puede emitir el contrato definitivo ni Operaciones entregar llaves sin aprobación de solvencia financiera (DICOM) y chequeo de listas UAF.',
      description: 'Garantiza que sólo ingresen arrendatarios solventes y verificados legalmente, resguardando el patrimonio inmobiliario.',
      sampleRecordId: 'POST-2026-089',
      sampleRecordTitle: 'Postulación Depto 402 - Inversiones Los Boldos SpA',
      status: 'BLOQUEADO',
      contingencyHistory: [
        {
          date: '2026-09-20',
          subrogateUser: 'JORGE RIVAS (SUBROGANTE RIESGO)',
          reason: 'Aprobación con Aval Solidario Personal ante vacaciones de analista de riesgo',
          recordTitle: 'Postulación Oficina 801 - TechSolutions Chile'
        }
      ]
    },
    {
      id: 'proc_2',
      code: 'ERP P1512',
      title: '2. Devolución y Liquidación de Garantías (Check-out)',
      category: 'ARRIENDOS',
      originArea: 'Operaciones en Terreno (Inspección Salida)',
      blockingArea: 'Mantenimiento (Valorización OT) & Administración',
      targetFinalArea: 'Tesorería (Transferencia Saldo)',
      activeBlockCount: 3,
      ruleGate: 'Tesorería no puede transferir la restitución de fondos de garantía si Operaciones no ha cargado el Acta de Check-Out o si Mantenimiento tiene OTs de reparación pendientes de cuantificar.',
      description: 'Cruza el inventario de salida contra el fondo de garantía retenido para descontar daños y cuentas de servicios impagas antes del finiquito.',
      sampleRecordId: 'GAR-5542',
      sampleRecordTitle: 'Liquidación Garantía Depto 1104 - Santiago Centro',
      status: 'BLOQUEADO',
      contingencyHistory: []
    },
    {
      id: 'proc_3',
      code: 'ERP P1201',
      title: '3. Tramitación y Liquidación de Siniestros de Inmuebles',
      category: 'SEGUROS',
      originArea: 'Administración de Edificios (Reporte Daño)',
      blockingArea: 'Compañía de Seguros & Liquidador Designado',
      targetFinalArea: 'Contabilidad (Indemnización)',
      activeBlockCount: 1,
      ruleGate: 'Mantenimiento no puede ejecutar obras definitivas sin el informe preliminar del liquidador de seguros para no invalidar la cobertura de la póliza.',
      description: 'Controla el ciclo de siniestros: denuncia, inspección de aseguradora, deducible UF, ejecución de reparaciones y recepción de indemnización.',
      sampleRecordId: 'CLM-2026-014',
      sampleRecordTitle: 'Siniestro Rotura Matriz Agua - Edificio Catedral N°1337',
      status: 'BLOQUEADO',
      contingencyHistory: [
        {
          date: '2026-09-18',
          subrogateUser: 'CLAUDIA VALENZUELA (COMPLIANCE)',
          reason: 'Reparación de mitigación inmediata autorizada para cortar filtración a departamentos inferiores',
          recordTitle: 'Filtración Urgente Piso 6 - Torres del Parque'
        }
      ]
    },
    {
      id: 'proc_4',
      code: 'ERP P04571',
      title: '4. Nómina Semanal de Pagos a Proveedores con F30-1',
      category: 'TESORERIA',
      originArea: 'Cuentas por Pagar (Facturas Devengadas)',
      blockingArea: 'Compliance Laboral (Certificado F30-1 DT)',
      targetFinalArea: 'Banco / Tesorería (Nómina TEF)',
      activeBlockCount: 4,
      ruleGate: 'El sistema retiene automáticamente el pago de cualquier contratista de servicios continuos (guardias, aseo, ascensores) que no haya cargado su Certificado F30-1 al día.',
      description: 'Blindaje integral ante la Ley de Subcontratación N° 20.123 para evitar demandas laborales subsidiarias y embargos bancarios.',
      sampleRecordId: 'PAY-W38-04',
      sampleRecordTitle: 'Factura F-8840 Aseo & Mantenimiento Industrial Ltda ($3.850.000)',
      status: 'BLOQUEADO',
      contingencyHistory: []
    },
    {
      id: 'proc_5',
      code: 'ERP P0911',
      title: '5. Rendición y Reembolso de Caja Chica / Fondos Fijos',
      category: 'OPERACIONES',
      originArea: 'Supervisores en Terreno (Boletas / Gastos)',
      blockingArea: 'Control Contable & Verificación SII',
      targetFinalArea: 'Tesorería (Reposición de Fondo)',
      activeBlockCount: 2,
      ruleGate: 'Tesorería tiene bloqueado el reembolso de reposición si el fondo anterior no tiene rendido y validado con DTE al menos el 70% de los gastos imputados.',
      description: 'Monitorea que los fondos de caja chica para emergencias cuenten con respaldo tributario fidedigno antes de desembolsar recursos adicionales.',
      sampleRecordId: 'CJ-SANTIAGO-02',
      sampleRecordTitle: 'Rendición Quincenal Supervisor Terreno - Fondo Centro ($500.000)',
      status: 'BLOQUEADO',
      contingencyHistory: []
    },
    {
      id: 'proc_6',
      code: 'ERP P04012',
      title: '6. Homologación y Alta de Proveedores Críticos',
      category: 'PROVEEDORES',
      originArea: 'Adquisiciones & Compras (Proposición Proveedor)',
      blockingArea: 'Encargado de Cumplimiento UAF & Cuenta Bancaria',
      targetFinalArea: 'Maestro de Proveedores Activos',
      activeBlockCount: 1,
      ruleGate: 'Ningún usuario puede emitir cotizaciones ni órdenes de trabajo a proveedores en estado "PENDIENTE_HOMOLOGACION" o sin cuenta bancaria auditada.',
      description: 'Verificación de beneficiarios finales, listas restrictivas y prevención de suplantación de cuentas bancarias de pago.',
      sampleRecordId: 'SUP-NEW-882',
      sampleRecordTitle: 'Alta Técnica: Climatización & Bombas Austral SpA (76.849.201-4)',
      status: 'BLOQUEADO',
      contingencyHistory: [
        {
          date: '2026-09-15',
          subrogateUser: currentUser,
          reason: 'Homologación provisoria 7 días por reparación de emergencia de caldera central',
          recordTitle: 'TermoServicios Centrales'
        }
      ]
    }
  ]);

  if (!isOpen) return null;

  const handleOpenContingency = (proc: CorporateProcessItem) => {
    setTargetForContingency(proc);
    setIsContingencyModalOpen(true);
  };

  const handleConfirmContingency = (payload: ContingencyBypassPayload) => {
    if (!targetForContingency) return;

    // Record in local state
    setProcesses(prev => prev.map(p => {
      if (p.id === targetForContingency.id) {
        return {
          ...p,
          status: 'SUBROGADO',
          activeBlockCount: Math.max(0, p.activeBlockCount - 1),
          contingencyHistory: [
            {
              date: new Date().toISOString().split('T')[0],
              subrogateUser: payload.subrogateUser,
              reason: `${payload.reasonType}: ${payload.customReason}`,
              recordTitle: payload.recordTitle
            },
            ...p.contingencyHistory
          ]
        };
      }
      return p;
    }));

    if (onLogContingency) {
      onLogContingency(payload);
    }

    setIsContingencyModalOpen(false);
    setTargetForContingency(null);

    alert(
      `✅ PROTOCOLO DE SUBROGANCIA ACTIVADO EXITOSAMENTE\n\n` +
      `Proceso: ${payload.processName} (${payload.processCode})\n` +
      `Registro: ${payload.recordTitle}\n` +
      `Subrogante Autorizador: ${payload.subrogateUser}\n` +
      `Motivo: ${payload.reasonType}\n` +
      `Plazo Regularización: ${payload.regularizationDeadline}\n\n` +
      `El proceso ha sido liberado hacia la siguiente etapa y el evento ha quedado asentado en la bitácora corporativa.`
    );
  };

  const handleNotifyArea = (proc: CorporateProcessItem) => {
    alert(
      `🔔 SOLICITUD ENVIADA AL ÁREA BLOQUEANTE\n\n` +
      `Destinatario: ${proc.blockingArea}\n` +
      `Proceso: ${proc.title}\n` +
      `Se ha emitido un requerimiento formal en el sistema para que el área titular revise el bloqueo.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
        
        {/* TOP HEADER */}
        <div className="bg-[#0B3C5D] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-200">
              <Network size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide uppercase">
                  Gobernanza de Procesos Interconectados & Subrogancia ERP
                </h2>
                <span className="bg-indigo-600/80 text-white text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase">
                  Cross-Departmental Rules
                </span>
              </div>
              <p className="text-xs text-indigo-100/80">
                Monitoreo de compuertas entre áreas con protocolo de contingencia ante vacaciones, licencias o emergencias.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* SUMMARY STATS BAR */}
        <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-4 shrink-0 text-xs font-mono">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <strong>6 PROCESOS CENTRALES</strong>
            </span>
            <span className="flex items-center gap-2 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <strong>COMPUERTAS DE CONTROL ACTIVAS</strong>
            </span>
            <span className="flex items-center gap-2 text-blue-300">
              <ShieldAlert size={14} />
              <strong>PROTOCOLO SUBROGANCIA DISPONIBLE</strong>
            </span>
          </div>
          <span className="text-slate-400 text-[11px]">
            Usuario en Sesión: <strong className="text-white">{currentUser}</strong>
          </span>
        </div>

        {/* MAIN BODY: CARDS OF THE 6 PROCESSES */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4 custom-audit-scroll">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {processes.map((proc) => {
              const hasBlocks = proc.activeBlockCount > 0;
              return (
                <div 
                  key={proc.id}
                  className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    
                    {/* CARD HEADER */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="bg-indigo-50 text-indigo-900 text-[9px] font-mono font-black px-2 py-0.5 rounded border border-indigo-200">
                          {proc.code}
                        </span>
                        <h3 className="text-sm font-black text-slate-900 uppercase mt-1">
                          {proc.title}
                        </h3>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        proc.status === 'SUBROGADO' 
                          ? 'bg-blue-100 text-blue-800' 
                          : hasBlocks 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {proc.status === 'SUBROGADO' ? 'SUBROGANCIA ACTIVA' : hasBlocks ? `${proc.activeBlockCount} EN ESPERA` : 'FLUIDO'}
                      </span>
                    </div>

                    {/* INTERCONNECTED PATHWAY FLOW */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[10.5px]">
                      <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[8.5px] mb-1">
                        <span>Origen</span>
                        <span className="text-amber-700">Compuerta de Control</span>
                        <span>Destino</span>
                      </div>
                      <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-800">
                        <span className="truncate max-w-[30%]">{proc.originArea}</span>
                        <ArrowRight size={12} className="text-slate-400 shrink-0" />
                        <span className="font-bold text-amber-950 bg-amber-100/70 px-1.5 py-0.5 rounded truncate max-w-[40%] text-center">
                          {proc.blockingArea}
                        </span>
                        <ArrowRight size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[30%] text-right">{proc.targetFinalArea}</span>
                      </div>
                    </div>

                    {/* RULE GATE EXPLANATION */}
                    <div className="bg-amber-50/70 border border-amber-300/80 rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-900 text-[10.5px] font-black uppercase">
                        <Lock size={12} className="text-amber-700 shrink-0" />
                        Regla de Bloqueo Mandatoria:
                      </div>
                      <p className="text-[10.5px] text-amber-950 leading-relaxed font-sans">
                        {proc.ruleGate}
                      </p>
                    </div>

                    {/* SAMPLE ACTIVE RECORD */}
                    <div className="text-[11px] space-y-0.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                        Caso Ejemplo Activo:
                      </span>
                      <p className="font-mono font-bold text-slate-800 truncate">
                        {proc.sampleRecordTitle}
                      </p>
                    </div>

                    {/* CONTINGENCY HISTORY BADGE IF ANY */}
                    {proc.contingencyHistory.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 text-[10px] text-blue-900 space-y-0.5">
                        <span className="font-black flex items-center gap-1 text-[9px] uppercase text-blue-800">
                          <CheckCircle2 size={11} className="text-blue-600" /> Última Subrogancia Registrada:
                        </span>
                        <p className="font-mono text-[9.5px]">
                          {proc.contingencyHistory[0].date}: {proc.contingencyHistory[0].subrogateUser}
                        </p>
                        <p className="text-[9px] text-slate-600 italic">
                          "{proc.contingencyHistory[0].reason}"
                        </p>
                      </div>
                    )}

                  </div>

                  {/* ACTION BUTTONS (NORMAL VS CONTINGENCY) */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleNotifyArea(proc)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
                    >
                      <Send size={12} className="text-indigo-600" />
                      Solicitar Acción al Titular
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenContingency(proc)}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                      title="Activar bypass por vacaciones, licencias o emergencia operacional con registro de auditoría"
                    >
                      <Unlock size={12} />
                      Liberar por Subrogancia (Vacaciones)
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* FOOTER */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Estándar: <strong>Enterprise Inter-Area Governance & Contingency Routing</strong></span>
            <span>•</span>
            <span>Gobernanza: <strong>Toda subrogancia queda registrada en Auditoría Permanente</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black text-xs uppercase transition-all cursor-pointer"
          >
            Cerrar Gobernanza
          </button>
        </div>

      </div>

      {/* CONTINGENCY MODAL DIALOG */}
      {isContingencyModalOpen && targetForContingency && (
        <ProcessContingencyModal
          isOpen={true}
          onClose={() => setIsContingencyModalOpen(false)}
          processName={targetForContingency.title}
          processCode={targetForContingency.code}
          recordId={targetForContingency.sampleRecordId}
          recordTitle={targetForContingency.sampleRecordTitle}
          originArea={targetForContingency.originArea}
          blockedByArea={targetForContingency.blockingArea}
          currentUser={currentUser}
          onConfirmBypass={handleConfirmContingency}
        />
      )}

    </div>
  );
};

export default ProcessGovernanceHub;
