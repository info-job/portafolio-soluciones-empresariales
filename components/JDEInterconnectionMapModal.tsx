import React, { useState } from 'react';
import { WorkOrder, WorkOrderAction, ContingencyOverride } from '../types';
import { 
  Network, ArrowRight, ShieldCheck, Printer, CheckCircle2, 
  Clock, AlertTriangle, Building2, Layers, DollarSign, 
  PackageCheck, FileText, Lock, Unlock, HelpCircle, X, ChevronRight,
  GitMerge, UserCheck, Briefcase, RefreshCw, Send, Check,
  Lightbulb, BookmarkCheck, Scale, ClipboardList, Activity, ArrowUpRight,
  LifeBuoy, ShieldAlert, Sparkles
} from 'lucide-react';
import { formatCLP } from '../lib/chileanUtils';

interface JDEInterconnectionMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrders: WorkOrder[];
  currentUser: string;
  onEmitOrder?: (order: WorkOrder) => void;
  onSelectOrderForInspection?: (order: WorkOrder) => void;
  onSaveOrder?: (order: WorkOrder) => void;
}

export const JDEInterconnectionMapModal: React.FC<JDEInterconnectionMapModalProps> = ({
  isOpen,
  onClose,
  workOrders,
  currentUser,
  onEmitOrder,
  onSelectOrderForInspection,
  onSaveOrder
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'suggestions' | 'history'>('matrix');
  const [activeStep, setActiveStep] = useState<number>(3); // Default to Step 3: Compras / Impresión R43500
  const [selectedOTId, setSelectedOTId] = useState<string>(workOrders[0]?.id || '');
  
  // State for user evaluations of the 5 ERP proposed interconnections
  const [evaluations, setEvaluations] = useState<Record<string, string>>({
    'p1': 'ALTA_PRIORIDAD',
    'p2': 'ALTA_PRIORIDAD',
    'p3': 'EN_EVALUACION',
    'p4': 'ALTA_PRIORIDAD',
    'p5': 'EN_EVALUACION'
  });

  // Contingency & Vacation Bypass modal state
  const [contingencyTargetSug, setContingencyTargetSug] = useState<any | null>(null);
  const [contingencyTypeInput, setContingencyTypeInput] = useState<ContingencyOverride['type']>('VACACIONES');
  const [contingencyReasonInput, setContingencyReasonInput] = useState<string>('');
  const [contingencySubroganteInput, setContingencySubroganteInput] = useState<string>(currentUser || 'SUBROGANTE FACULTADO');

  if (!isOpen) return null;

  // Calculate live counts across the 5 ERP Interconnected Areas
  const step1Count = workOrders.filter(o => o.status === 'BORRADOR' || o.status === 'PENDIENTE_VB').length;
  const step2Count = workOrders.filter(o => o.status === 'APROBADA' && !o.printedAt && o.status !== 'EMITIDA_IMPRESA').length;
  const step3Count = workOrders.filter(o => o.status === 'EMITIDA_IMPRESA' || (o.printedAt && o.status !== 'RECEPCIONADA' && o.status !== 'PAGADA')).length;
  const step4Count = workOrders.filter(o => o.status === 'RECEPCIONADA' || o.status === 'RECEPCIONADA_PARCIAL').length;
  const step5Count = workOrders.filter(o => o.status === 'PAGADA' || o.status === 'TERMINADA').length;

  const currentSelectedOrder = workOrders.find(o => o.id === selectedOTId) || workOrders[0];

  const stepsData = [
    {
      step: 1,
      area: "Área Solicitante / Usuaria",
      jdeProgram: "P43E10 (Requisition Self-Service)",
      jdeTable: "F43E01 / F4301",
      lastStatus: "110",
      nextStatus: "220",
      statusName: "Solicitud / Requisición",
      color: "amber",
      count: step1Count,
      roleRequired: "Usuario Operativo / Solicitante",
      description: "El departamento que requiere el bien o servicio genera la solicitud técnica con justificación y cotización referencial.",
      ruleGate: "No se puede generar Orden de Compra ni comprometer fondos sin la requisición justificada y cargada por el área requirente."
    },
    {
      step: 2,
      area: "Jefatura & Control Financiero",
      jdeProgram: "P43081 (Purchase Order Approvals)",
      jdeTable: "F4311 / F4209",
      lastStatus: "220",
      nextStatus: "230",
      statusName: "VoBo & Aprobación de Gasto",
      color: "blue",
      count: step2Count,
      roleRequired: "Jefatura / Gerencia / Control Interno",
      description: "Revisión presupuestaria del centro de costo, autorización de gasto y firma digital con visto bueno conforme.",
      ruleGate: "Una orden aprobada NO puede ser recepcionada en Bodega directamente. Debe pasar obligatoriamente por el Área de Adquisiciones."
    },
    {
      step: 3,
      area: "Adquisiciones & Compras",
      jdeProgram: "R43500 (Print Purchase Orders UBE)",
      jdeTable: "F4311 (LST=280 / NXT=400)",
      lastStatus: "230",
      nextStatus: "280",
      statusName: "Emisión e Impresión Formal",
      color: "indigo",
      count: step3Count,
      roleRequired: "Encargado de Compras / Abastecimiento",
      description: "Formalización mercantil con el proveedor. Al emitir e imprimir la OC física o digitalmente (R43500), el sistema pasa la orden a estado 280.",
      ruleGate: "⚡ REGLA SINE QUA NON: En AssetFlow Enterprise, Bodega tiene terminantemente PROHIBIDO recibir mercadería si Compras no ha ejecutado la Emisión ERP (R43500). El estado debe ser 280."
    },
    {
      step: 4,
      area: "Bodega, Almacén & Operaciones",
      jdeProgram: "P4312 (Purchase Order Receipts)",
      jdeTable: "F43121 (Receipt Routing)",
      lastStatus: "280",
      nextStatus: "400",
      statusName: "Recepción Técnica & Guía",
      color: "emerald",
      count: step4Count,
      roleRequired: "Jefe de Bodega / Inspector Técnico",
      description: "Inspección física contra guía de despacho o acta de entrega. Registro de cantidades recibidas, fotos de evidencia y conformidad técnica.",
      ruleGate: "Contabilidad y Cuentas por Pagar NO pueden cursar pago a ningún proveedor sin el acta de recepción conforme emitida por Bodega."
    },
    {
      step: 5,
      area: "Contabilidad & Cuentas por Pagar",
      jdeProgram: "P4314 (Voucher Match 3-Vías)",
      jdeTable: "F0411 / F0911",
      lastStatus: "400",
      nextStatus: "999",
      statusName: "3-Way Matching & Pago",
      color: "purple",
      count: step5Count,
      roleRequired: "Contador General / Tesorería",
      description: "Calce de 3 vías: Cruce automático de OC de Compras (F4311), Recepción de Bodega (F43121) y Factura DTE del Proveedor (F0411).",
      ruleGate: "Si el monto o las cantidades de la Factura difieren de lo recepcionado en Bodega, el sistema retiene el pago en voucher auditado hasta su conciliación."
    }
  ];

  // 5 Concrete suggestions of interconnected enterprise workflows with Operational Contingency Protocols
  const interAreaSuggestions = [
    {
      id: 'p1',
      title: '1. Cotejo Automático de 3 Vías (3-Way Matching)',
      jdeCode: 'ERP P0411 / F0411 & F43121',
      sourceArea: 'Compras + Bodega',
      targetArea: 'Contabilidad & Cuentas por Pagar',
      ruleGate: 'Bloqueo de voucher de pago si el valor de la Factura no coincide exactamente con las unidades recepcionadas por Bodega y el precio pactado por Compras.',
      operationalFlow: 'Compras emite OC ($X) → Bodega firma recepción conforme física ($Y unidades) → Proveedor emite Factura DTE → Sistema valida que OC == Recepción == Factura. Si hay discrepancia (>0.5%), se retiene el pago y exige autorización de Gerencia.',
      internalControlValue: 'Elimina al 100% cobros por insumos no entregados, cobros duplicados o discrepancias de precio entre lo negociado y lo facturado.',
      badge: 'Control Financiero Máximo',
      contingencyProtocol: 'Si el Jefe de Bodega o el Comprador están con feriado legal/vacaciones, o ante una urgencia de pago para evitar corte de suministro del proveedor, la Gerencia o un Subrogante Facultado puede emitir una "Liberación Extraordinaria de Pago con Voucher Provisorio Condicionado", registrando la justificación auditada para regularización posterior.',
      contingencyActionTitle: 'Liberar Pago Extraordinario (Vacaciones / Subrogancia)',
      overrideKey: 'contingency3Way' as const,
      contingencyTypeDefault: 'VACACIONES' as const
    },
    {
      id: 'p2',
      title: '2. Requisición Previa con 3 Cotizaciones Obligatorias',
      jdeCode: 'ERP P43E10 (Requisition to PO Routing)',
      sourceArea: 'Área Solicitante (Administración/Operaciones)',
      targetArea: 'Adquisiciones & Compras',
      ruleGate: 'Compras no puede emitir la Orden de Compra formal si no se han adjuntado mínimo 3 cotizaciones de proveedores registrados para compras superiores a 15 UF.',
      operationalFlow: 'El solicitante pide un insumo/servicio → Compras busca cotizaciones y las adjunta en PDF → Jefatura compara el cuadro comparativo y autoriza la alternativa ganadora → Se genera la OC formal.',
      internalControlValue: 'Previene favoritismo o direccionamiento a proveedores específicos y asegura precios de mercado competitivos.',
      badge: 'Transparencia en Compras',
      contingencyProtocol: 'En caso de rotura de matriz, corte eléctrico, ascensor trabado o vacaciones del cotizador titular, se activa la "Excepción de Emergencia Operativa o Proveedor Único Autorizado". El subrogante faculta la emisión inmediata de la OC formal sin esperar los 3 presupuestos comparativos.',
      contingencyActionTitle: 'Autorizar Excepción de Cotizaciones por Urgencia',
      overrideKey: 'contingencyQuotes' as const,
      contingencyTypeDefault: 'EMERGENCIA_OPERACIONAL' as const
    },
    {
      id: 'p3',
      title: '3. Inspección de Calidad, Discrepancias y Cuarentena en Bodega',
      jdeCode: 'ERP P4312 (Receipt Routing & Inspection)',
      sourceArea: 'Bodega & Almacén',
      targetArea: 'Compras y Calidad',
      ruleGate: 'Al detectar insumos dañados, defectuosos o cantidades incompletas, Bodega marca "Recepción con Discrepancia / Cuarentena". El sistema bloquea el pase a Facturación y notifica a Compras.',
      operationalFlow: 'Llega despacho → Bodega inspecciona con fotos → Detecta rotura o faltante → Genera Acta de Discrepancia F43121 → Compras gestiona reposición inmediata o Nota de Crédito con el proveedor antes de dar pase a pago.',
      internalControlValue: 'Impide que la empresa asuma costos de materiales rotos o servicios deficientes.',
      badge: 'Aseguramiento de Calidad',
      contingencyProtocol: 'Si los insumos son indispensables para no paralizar un trabajo en terreno o el inspector técnico titular está de vacaciones o enfermo, se emite un "Pase Provisorio Condicionado bajo Garantía del Proveedor". Se liberan los insumos aptos para uso inmediato registrando la fianza.',
      contingencyActionTitle: 'Emitir Pase Provisorio Condicionado en Bodega',
      overrideKey: 'contingencyQuality' as const,
      contingencyTypeDefault: 'SUBROGANTE_AUTORIZADO' as const
    },
    {
      id: 'p4',
      title: '4. Congelamiento / Cierre de Periodo Contable (Period Freeze)',
      jdeCode: 'ERP P0010 (Company Constants & Period Control)',
      sourceArea: 'Contabilidad General & Controller',
      targetArea: 'Todas las Áreas de la Empresa',
      ruleGate: 'Ningún usuario de Compras, Bodega u Operaciones puede registrar, fechar ni recepcionar documentos en meses contables cerrados por Contabilidad.',
      operationalFlow: 'El Controller cierra el mes (ej: Septiembre) tras conciliación bancaria → El sistema congela la fecha contable → Intentos de posteo con fecha anterior son rechazados automáticamente exigiendo imputación al mes abierto.',
      internalControlValue: 'Garantiza la inalterabilidad de los estados financieros auditados ante SII y directores.',
      badge: 'Compliance Tributario',
      contingencyProtocol: 'Si una factura rezagada clave o acta de recepción arriba durante las vacaciones del Contador General y se requiere su cómputo urgente para no perder crédito fiscal IVA, el Controller Subrogante puede habilitar una "Apertura Excepcional de Periodo Contable" con bitácora inalterable.',
      contingencyActionTitle: 'Autorizar Apertura Extraordinaria de Periodo',
      overrideKey: 'contingencyPeriodFreeze' as const,
      contingencyTypeDefault: 'SUBROGANTE_AUTORIZADO' as const
    },
    {
      id: 'p5',
      title: '5. Liquidación de OT de Mantenimiento con Despacho de Materiales',
      jdeCode: 'ERP P13714 (Maintenance Work Order) → P4112 (Inventory Issues)',
      sourceArea: 'Técnicos de Mantenimiento en Terreno',
      targetArea: 'Bodega & Control de Inventario',
      ruleGate: 'Una OT de mantenimiento preventivo o correctivo (ej: filtración, pintura, techumbres) no puede pasar a estado "CONCLUIDA" sin que Bodega certifique la rebaja de inventario de los repuestos consumidos.',
      operationalFlow: 'Técnico retira insumos de Bodega para reparar una propiedad → Bodega registra salida vinculada a la OT → Técnico finaliza trabajo → Bodega certifica el consumo real → OT se liquida y su costo queda imputado al edificio exacto.',
      internalControlValue: 'Evita extravío de herramientas y materiales, garantizando costo real y margen por propiedad.',
      badge: 'Control Operacional',
      contingencyProtocol: 'Si la reparación técnica se finalizó en turno nocturno, fin de semana o con el bodeguero titular con permiso administrativo, el supervisor de operaciones autoriza la "Liquidación Provisoria en Terreno", entregando la propiedad al arrendatario y programando el cuadre de inventario.',
      contingencyActionTitle: 'Aprobar Liquidación Provisoria de Mantenimiento',
      overrideKey: 'contingencyInventory' as const,
      contingencyTypeDefault: 'EMERGENCIA_OPERACIONAL' as const
    }
  ];

  // Execute contingency or vacation bypass on selected OT
  const handleExecuteSuggestionContingency = (sug: typeof interAreaSuggestions[0]) => {
    if (!currentSelectedOrder) return;
    const reasonText = contingencyReasonInput.trim() || `Subrogancia por ${contingencyTypeInput.replace('_', ' ')}: ${sug.contingencyProtocol}`;
    const now = new Date();
    const dateIso = now.toISOString();
    const dateStr = dateIso.split('T')[0];

    const overrideObj: ContingencyOverride = {
      enabled: true,
      type: contingencyTypeInput,
      reason: reasonText,
      authorizedBy: contingencySubroganteInput || currentUser,
      date: dateIso,
      timestamp: Date.now()
    };

    let updatedOT: WorkOrder = {
      ...currentSelectedOrder,
      [sug.overrideKey]: overrideObj
    };

    if (sug.id === 'p1') {
      if (updatedOT.status === 'RECEPCIONADA' || updatedOT.status === 'RECEPCIONADA_PARCIAL') {
        updatedOT.status = 'PAGADA';
      }
    } else if (sug.id === 'p2') {
      if (updatedOT.status === 'BORRADOR' || updatedOT.status === 'PENDIENTE_VB') {
        updatedOT.status = 'APROBADA';
        updatedOT.authorizedBy = contingencySubroganteInput || currentUser;
        updatedOT.authorizationDate = dateStr;
      }
    } else if (sug.id === 'p3') {
      if (updatedOT.status === 'EMITIDA_IMPRESA') {
        updatedOT.status = 'RECEPCIONADA';
        updatedOT.receptionDate = dateStr;
        updatedOT.receptionUser = contingencySubroganteInput || currentUser;
      }
    } else if (sug.id === 'p5') {
      updatedOT.status = 'TERMINADA';
    }

    const action: WorkOrderAction = {
      id: crypto.randomUUID(),
      date: dateIso,
      entryDate: dateStr,
      type: 'REALIZADA',
      user: contingencySubroganteInput || currentUser,
      actionResponsible: sug.targetArea,
      trackingResponsible: contingencySubroganteInput || currentUser,
      actionCategory: 'CONTINGENCY_BYPASS',
      sourceArea: `SUBROGANTE (${contingencySubroganteInput || currentUser})`,
      targetArea: sug.targetArea,
      description: `🛡️ BYPASS DE CONTINGENCIA / VACACIONES [${sug.title}]: Autorizado por ${contingencySubroganteInput || currentUser}. Motivo: ${reasonText}. Alternativa aplicada para garantizar la continuidad operativa sin detener la empresa.`
    };

    updatedOT.trackingActions = [action, ...(updatedOT.trackingActions || [])];

    if (onSaveOrder) {
      onSaveOrder(updatedOT);
    }
    setContingencyTargetSug(null);
    setContingencyReasonInput('');
    alert(
      `✅ PROTOCOLO DE CONTINGENCIA / VACACIONES ACTIVADO CON ÉXITO\n\n` +
      `Proceso: ${sug.title}\n` +
      `OT Afectada: #${updatedOT.folio}\n` +
      `Subrogante / Autorizador: ${contingencySubroganteInput || currentUser}\n` +
      `Motivo: ${reasonText}\n\n` +
      `La alternativa ha sido aplicada y registrada en la bitácora transaccional para continuar con las operaciones.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
        
        {/* TOP HEADER */}
        <div className="bg-[#0B3C5D] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-200">
              <Network size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide uppercase">
                  Matriz de Interconexión Inter-Áreas AssetFlow Enterprise                </h2>
                <span className="bg-indigo-600/80 text-white text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase">
                  F40203 Order Activity Rules
                </span>
              </div>
              <p className="text-xs text-indigo-100/80">
                Flujo de control cruzado: Ningún departamento avanza sin la validación previa del área responsable.
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

        {/* TABS SELECTOR */}
        <div className="bg-slate-800 px-6 py-2 border-b border-slate-700 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'matrix' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <GitMerge size={14} />
            Matriz de Reglas Activas F40203
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'suggestions' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Lightbulb size={14} className="text-amber-400" />
            Propuestas y Sugerencias Inter-Áreas (Para Evaluación)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ClipboardList size={14} />
            Historial y Trazabilidad Transaccional ({currentSelectedOrder?.folio || 'OT'})
          </button>
        </div>

        {/* TAB 1: MATRIZ DE REGLAS ACTIVAS (F40203) */}
        {activeTab === 'matrix' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* PIPELINE DE 5 ÁREAS INTERCONECTADAS */}
            <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 text-white shrink-0">
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                {stepsData.map((s, idx) => {
                  const isSelected = activeStep === s.step;
                  return (
                    <React.Fragment key={s.step}>
                      <button
                        onClick={() => setActiveStep(s.step)}
                        className={`flex-1 min-w-[190px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg scale-102' 
                            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Paso {s.step} • {s.lastStatus} → {s.nextStatus}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            s.count > 0 ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'
                          }`}>
                            {s.count} OTs
                          </span>
                        </div>
                        <p className="text-xs font-black text-white truncate">{s.area}</p>
                        <p className="text-[10px] font-mono text-indigo-300 font-semibold truncate mt-0.5">{s.statusName}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-1 truncate">{s.jdeProgram}</p>
                      </button>
                      {idx < stepsData.length - 1 && (
                        <ArrowRight size={16} className="text-slate-600 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* CONTENIDO PRINCIPAL: DETALLE DEL PASO SELECCIONADO + SIMULADOR / AUDITORÍA EN TIEMPO REAL */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-audit-scroll">
              
              {/* COLUMNA IZQUIERDA (7 cols): Explicación de la Regla ERP y Bloqueo Inter-área */}
              <div className="lg:col-span-7 space-y-4">
                {(() => {
                  const currentStepInfo = stepsData.find(s => s.step === activeStep)!;
                  return (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-[#0B3C5D] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase">
                              Área {currentStepInfo.step} de 5
                            </span>
                            <h3 className="text-base font-black text-slate-900">
                              {currentStepInfo.area}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-1">
                            Programa ERP: <span className="font-bold text-indigo-600">{currentStepInfo.jdeProgram}</span> • Tabla: <span className="font-bold text-slate-700">{currentStepInfo.jdeTable}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono font-bold text-slate-400 block">CÓDIGOS DE ESTADO</span>
                          <span className="text-sm font-mono font-black text-[#0B3C5D] bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                            {currentStepInfo.lastStatus} → {currentStepInfo.nextStatus}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Rol que ejecuta este paso:</p>
                          <p className="font-black text-slate-800 mt-0.5">{currentStepInfo.roleRequired}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Órdenes actualmente en este paso:</p>
                          <p className="font-black text-indigo-700 mt-0.5">{currentStepInfo.count} registros activos</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-1">
                          Descripción del Proceso Operativo:
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                          {currentStepInfo.description}
                        </p>
                      </div>

                      {/* BLOQUEO DE CONTROL INTERNO ERP */}
                      <div className="bg-amber-50 border-2 border-amber-300/80 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wide">
                          <Lock size={16} className="text-amber-700" />
                          Regla de Actividad Mandatoria (Order Activity Rule F40203)
                        </div>
                        <p className="text-xs text-amber-950 leading-relaxed">
                          {currentStepInfo.ruleGate}
                        </p>
                        {activeStep === 3 && (
                          <div className="mt-2 pt-2 border-t border-amber-200 text-[11px] text-amber-900 font-medium">
                            💡 <strong>Ejemplo en vivo (El caso planteado):</strong> Cuando Compras presiona <em>«Imprimir OT»</em> o descarga el PDF, el sistema ejecuta el programa R43500 y cambia el estado a <code className="bg-amber-200 px-1 py-0.5 rounded font-bold">280 (EMITIDA_IMPRESA)</code>. Sólo a partir de ese segundo el usuario del Módulo de Bodega ve la orden habilitada para recepcionar.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* TABLA DE ÓRDENES EN ESTE ESTADO */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Layers size={14} className="text-[#0B3C5D]" />
                      Órdenes en esta Etapa ({stepsData.find(s => s.step === activeStep)?.count || 0})
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">Seleccione una orden para ver su trazabilidad</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg custom-audit-scroll">
                    {workOrders.map((ot) => {
                      const isEmitted = ot.status === 'EMITIDA_IMPRESA' || !!ot.printedAt;
                      const isReceived = ot.status === 'RECEPCIONADA' || ot.status === 'RECEPCIONADA_PARCIAL';
                      const isApproved = ot.status === 'APROBADA';

                      return (
                        <div 
                          key={ot.id}
                          onClick={() => setSelectedOTId(ot.id)}
                          className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            selectedOTId === ot.id ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-[#0B3C5D]">{ot.folio}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                                ot.status === 'APROBADA' && !isEmitted
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : isEmitted && !isReceived
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : isReceived
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {ot.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-600 truncate max-w-[280px]">
                              {ot.supplierName} • {ot.propertyLabel}
                            </p>
                          </div>

                          <div className="text-right space-y-0.5">
                            <p className="font-mono font-black text-slate-900">{formatCLP(ot.total)}</p>
                            <p className="text-[9px] font-mono text-slate-400">
                              {ot.printedAt ? `Impresa: ${ot.printedAt.split('T')[0]}` : 'Sin impresión Compras'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA (5 cols): Ficha en Vivo de la Orden Seleccionada & Compuertas */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                      <ShieldCheck size={16} className="text-indigo-600" />
                      Estado de Compuertas Inter-Áreas
                    </h4>
                    <span className="font-mono text-xs font-black text-[#0B3C5D] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {currentSelectedOrder?.folio || 'S/I'}
                    </span>
                  </div>

                  {/* SEMÁFORO DE COMPUERTAS PARA ESTA ORDEN */}
                  <div className="space-y-2.5">
                    {/* Compuerta 1: Solicitud */}
                    <div className="p-2.5 rounded-lg border bg-emerald-50 border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <div>
                          <p className="text-[11px] font-black text-emerald-950">1. Requisición Solicitante (P43E10)</p>
                          <p className="text-[9px] text-emerald-800 font-mono">Formulada por {currentSelectedOrder?.preparedBy || 'SISTEMA'}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        OK 110/220
                      </span>
                    </div>

                    {/* Compuerta 2: Aprobación VoBo */}
                    {(() => {
                      const isApproved = currentSelectedOrder?.status === 'APROBADA' || currentSelectedOrder?.status === 'EMITIDA_IMPRESA' || currentSelectedOrder?.status === 'RECEPCIONADA' || currentSelectedOrder?.status === 'PAGADA';
                      return (
                        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          isApproved ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                        }`}>
                          <div className="flex items-center gap-2.5">
                            {isApproved ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Clock size={16} className="text-amber-600" />}
                            <div>
                              <p className="text-[11px] font-black text-slate-900">2. Aprobación VoBo Jefatura (P43081)</p>
                              <p className="text-[9px] text-slate-600 font-mono">
                                {isApproved ? `Aprobada por ${currentSelectedOrder?.authorizedBy || 'CONTROL INTERNO'}` : 'Pendiente de VoBo'}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isApproved ? 'OK 230' : 'BLOQUEADO'}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Compuerta 3: Emisión e Impresión Compras (R43500) */}
                    {(() => {
                      const isEmitted = currentSelectedOrder?.status === 'EMITIDA_IMPRESA' || !!currentSelectedOrder?.printedAt;
                      return (
                        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          isEmitted ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                        }`}>
                          <div className="flex items-center gap-2.5">
                            {isEmitted ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Printer size={16} className="text-amber-700 animate-pulse" />}
                            <div>
                              <p className="text-[11px] font-black text-slate-900">3. Emisión e Impresión Compras (R43500)</p>
                              <p className="text-[9px] text-slate-600 font-mono">
                                {isEmitted 
                                  ? `Emitida el ${currentSelectedOrder?.printedAt?.split('T')[0]} por ${currentSelectedOrder?.printedBy || 'COMPRAS'}` 
                                  : 'Requisito pendiente para habilitar Bodega'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isEmitted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200 text-amber-900 font-black'
                            }`}>
                              {isEmitted ? 'OK 280' : 'PENDIENTE'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Compuerta 4: Recepción Bodega (P4312) */}
                    {(() => {
                      const isReceived = currentSelectedOrder?.status === 'RECEPCIONADA' || currentSelectedOrder?.status === 'RECEPCIONADA_PARCIAL';
                      const isEmitted = currentSelectedOrder?.status === 'EMITIDA_IMPRESA' || !!currentSelectedOrder?.printedAt;
                      return (
                        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          isReceived 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : (isEmitted ? 'bg-blue-50 border-blue-200' : 'bg-slate-100 border-slate-200 opacity-60')
                        }`}>
                          <div className="flex items-center gap-2.5">
                            {isReceived ? <CheckCircle2 size={16} className="text-emerald-600" /> : <PackageCheck size={16} className={isEmitted ? "text-blue-600" : "text-slate-400"} />}
                            <div>
                              <p className="text-[11px] font-black text-slate-900">4. Recepción Técnica Bodega (P4312)</p>
                              <p className="text-[9px] text-slate-600 font-mono">
                                {isReceived 
                                  ? `Recepcionada el ${currentSelectedOrder?.receptionDate} por ${currentSelectedOrder?.receptionUser}` 
                                  : (isEmitted ? 'Habilitada para recibir mercadería' : 'Bloqueada (Falta impresión Compras)')}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isReceived ? 'bg-emerald-100 text-emerald-800' : (isEmitted ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600')
                          }`}>
                            {isReceived ? 'OK 400' : (isEmitted ? 'HABILITADA' : 'BLOQUEADA')}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Compuerta 5: Contabilidad 3-Way Match (P4314) */}
                    {(() => {
                      const isPaid = currentSelectedOrder?.status === 'PAGADA' || currentSelectedOrder?.status === 'TERMINADA';
                      const isReceived = currentSelectedOrder?.status === 'RECEPCIONADA';
                      return (
                        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          isPaid 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : (isReceived ? 'bg-purple-50 border-purple-200' : 'bg-slate-100 border-slate-200 opacity-60')
                        }`}>
                          <div className="flex items-center gap-2.5">
                            {isPaid ? <CheckCircle2 size={16} className="text-emerald-600" /> : <DollarSign size={16} className={isReceived ? "text-purple-600" : "text-slate-400"} />}
                            <div>
                              <p className="text-[11px] font-black text-slate-900">5. Matching & Pago Contable (P4314)</p>
                              <p className="text-[9px] text-slate-600 font-mono">
                                {isPaid ? 'Factura calzada 3-Vías y Pagada' : (isReceived ? 'Habilitada para conciliar factura' : 'Bloqueada (Falta recepción Bodega)')}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isPaid ? 'bg-emerald-100 text-emerald-800' : (isReceived ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-600')
                          }`}>
                            {isPaid ? 'OK 999' : (isReceived ? 'PENDIENTE' : 'BLOQUEADA')}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* ACCIÓN RÁPIDA: Si la orden está en APROBADA (230) pero falta impresión Compras, permitir emitir */}
                  {currentSelectedOrder?.status === 'APROBADA' && !currentSelectedOrder?.printedAt && onEmitOrder && (
                    <div className="pt-3 border-t border-slate-200">
                      <button
                        onClick={() => {
                          onEmitOrder(currentSelectedOrder);
                        }}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        <Printer size={16} />
                        Emitir e Imprimir Ahora como Compras (R43500)
                      </button>
                      <p className="text-[10px] text-slate-500 text-center mt-1.5 font-mono">
                        Avanzará a estado 280 y desbloqueará la recepción en Bodega.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: SUGERENCIAS Y PROPUESTAS INTER-ÁREAS (EVALUACIÓN CONJUNTA) */}
        {activeTab === 'suggestions' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6 custom-audit-scroll">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-amber-500 text-white rounded-xl shadow shrink-0">
                  <Lightbulb size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Propuestas de Procesos Interconectados AssetFlow Enterprise para Evaluación
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                    A continuación se detallan 5 mecanismos de gobernanza y control cruzado basados en la arquitectura nativa de ERP AssetFlow Enterprise. Puede evaluar la viabilidad y prioridad de cada uno para incorporar sus bloqueos al sistema.
                  </p>
                </div>
              </div>
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-right shrink-0 font-mono text-xs">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Total Evaluadas</span>
                <span className="text-base font-black text-[#0B3C5D]">5 Propuestas Estructuradas</span>
              </div>
            </div>

            {/* LIST OF SUGGESTIONS CARDS */}
            <div className="grid grid-cols-1 gap-5">
              {interAreaSuggestions.map((sug) => {
                const currentEval = evaluations[sug.id] || 'EN_EVALUACION';
                return (
                  <div 
                    key={sug.id}
                    className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 uppercase">
                            {sug.title}
                          </h4>
                          <span className="bg-indigo-50 text-indigo-800 text-[10px] font-mono font-black px-2 py-0.5 rounded border border-indigo-200">
                            {sug.jdeCode}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">
                          Flujo: <span className="text-slate-800">{sug.sourceArea}</span> → <span className="text-indigo-700">{sug.targetArea}</span>
                        </p>
                      </div>

                      {/* EVALUATION SELECTOR */}
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Evaluación:</span>
                        <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 text-[10px] font-bold">
                          <button
                            onClick={() => setEvaluations(prev => ({ ...prev, [sug.id]: 'ALTA_PRIORIDAD' }))}
                            className={`px-3 py-1 rounded-lg transition-all ${
                              currentEval === 'ALTA_PRIORIDAD' 
                                ? 'bg-emerald-600 text-white font-black shadow-xs' 
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            ⭐ Alta Prioridad
                          </button>
                          <button
                            onClick={() => setEvaluations(prev => ({ ...prev, [sug.id]: 'EN_EVALUACION' }))}
                            className={`px-3 py-1 rounded-lg transition-all ${
                              currentEval === 'EN_EVALUACION' 
                                ? 'bg-amber-500 text-white font-black shadow-xs' 
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            ⏳ En Evaluación
                          </button>
                          <button
                            onClick={() => setEvaluations(prev => ({ ...prev, [sug.id]: 'FASE_2' }))}
                            className={`px-3 py-1 rounded-lg transition-all ${
                              currentEval === 'FASE_2' 
                                ? 'bg-slate-700 text-white font-black shadow-xs' 
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            📅 Fase 2 (Posterior)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* GATEWAY BLOCKING RULE */}
                    <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center gap-2 text-amber-900 text-xs font-black uppercase">
                        <Lock size={15} className="text-amber-700 shrink-0" />
                        Compuerta de Bloqueo Inter-Área (Rule Gate):
                      </div>
                      <p className="text-xs text-amber-950 font-medium leading-relaxed pl-6">
                        {sug.ruleGate}
                      </p>
                    </div>

                    {/* OPERATIONAL FLOW & INTERNAL CONTROL VALUE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                          Flujo Operativo Interconectado:
                        </span>
                        <p className="text-slate-700 leading-relaxed font-sans">
                          {sug.operationalFlow}
                        </p>
                      </div>
                      <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 space-y-1">
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-emerald-600" /> Beneficio de Control Interno y Gobernanza:
                        </span>
                        <p className="text-emerald-950 leading-relaxed font-medium">
                          {sug.internalControlValue}
                        </p>
                      </div>
                    </div>

                    {/* OPERATIONAL CONTINGENCY & VACATION PROTOCOL */}
                    <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-amber-900 text-xs font-black uppercase">
                          <LifeBuoy size={16} className="text-amber-700 shrink-0" />
                          Alternativa para Contingencias o Vacaciones (Garantía de Continuidad):
                        </div>
                        {currentSelectedOrder && (currentSelectedOrder as any)[sug.overrideKey]?.enabled ? (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 shrink-0">
                            <CheckCircle2 size={13} className="text-emerald-700" /> Bypass Activo en OT #{currentSelectedOrder.folio}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setContingencyTargetSug(sug);
                              setContingencyTypeInput(sug.contingencyTypeDefault);
                              setContingencyReasonInput('');
                            }}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-black text-[10px] uppercase flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                            title={`Ejecutar alternativa para continuar trámite sin detener el flujo en OT #${currentSelectedOrder?.folio || 'OT'}`}
                          >
                            <LifeBuoy size={13} />
                            <span>{sug.contingencyActionTitle}</span>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-amber-950 font-medium leading-relaxed pl-6">
                        {sug.contingencyProtocol}
                      </p>
                      {currentSelectedOrder && (currentSelectedOrder as any)[sug.overrideKey]?.enabled && (
                        <div className="ml-6 mt-1 p-2.5 bg-white/80 rounded-lg border border-emerald-200 text-[11px] text-emerald-950 space-y-0.5 font-mono">
                          <span className="font-bold">Justificación auditada:</span> {(currentSelectedOrder as any)[sug.overrideKey].reason} 
                          <span className="text-slate-500 ml-2">(Por {(currentSelectedOrder as any)[sug.overrideKey].authorizedBy} el {(currentSelectedOrder as any)[sug.overrideKey].date.split('T')[0]})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: HISTORIAL Y TRAZABILIDAD TRANSACCIONAL */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-5 custom-audit-scroll">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Bitácora de Trazabilidad e Historial Transaccional
                  </h3>
                  <span className="bg-indigo-50 text-[#0B3C5D] font-mono text-xs font-black px-2.5 py-0.5 rounded border border-indigo-200">
                    OT #{currentSelectedOrder?.folio || 'S/I'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Proveedor: <strong>{currentSelectedOrder?.supplierName || 'S/I'}</strong> • Monto: <strong>{formatCLP(currentSelectedOrder?.total || 0)}</strong>
                </p>
              </div>
              <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1 rounded-full text-xs font-black font-mono">
                {(currentSelectedOrder?.trackingActions || []).length} HITOS AUDITADOS
              </span>
            </div>

            {/* TIMELINE VIEW */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              {(!currentSelectedOrder?.trackingActions || currentSelectedOrder.trackingActions.length === 0) ? (
                <div className="py-16 text-center text-slate-400 font-bold uppercase text-xs tracking-widest italic border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <Activity size={28} className="text-slate-300 animate-pulse" />
                  No hay hitos de trazabilidad registrados aún para esta OT.
                </div>
              ) : (
                <div className="space-y-4 relative pl-4 border-l-2 border-slate-200">
                  {currentSelectedOrder.trackingActions.map((action, idx) => (
                    <div key={action.id || idx} className="relative">
                      {/* BULLET */}
                      <div className={`absolute -left-[25px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                        action.type === 'REALIZADA' ? 'border-emerald-500 text-emerald-500' : 'border-amber-500 text-amber-500'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-3xs space-y-2 hover:bg-slate-100/70 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-xs font-bold text-slate-900 leading-relaxed flex-1">
                            {action.description}
                          </p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                            action.type === 'REALIZADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {action.type}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-[10px] font-sans">
                          <div>
                            <span className="text-slate-400 uppercase font-black block text-[8px]">RESPONSABLE</span>
                            <span className="text-slate-800 font-bold uppercase truncate block">
                              {action.actionResponsible || 'S/I'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase font-black block text-[8px]">DESTINATARIO</span>
                            <span className="text-indigo-700 font-bold uppercase truncate block">
                              {action.trackingResponsible || 'S/I'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase font-black block text-[8px]">REGISTRADO POR</span>
                            <span className="text-slate-700 font-bold uppercase truncate block">
                              {action.user}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase font-black block text-[8px]">FECHA Y HORA</span>
                            <span className="text-slate-600 font-mono font-bold block">
                              {new Date(action.date).toLocaleString('es-CL')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTINGENCY & VACATION EXECUTION DIALOG */}
        {contingencyTargetSug && currentSelectedOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-amber-400 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                <div className="flex items-center gap-2.5 text-amber-900">
                  <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
                    <LifeBuoy size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">
                      Protocolo de Contingencia / Vacaciones
                    </h3>
                    <p className="text-[10px] text-amber-700 font-bold">
                      {contingencyTargetSug.title} • OT #{currentSelectedOrder.folio}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setContingencyTargetSug(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 space-y-1">
                <span className="font-black uppercase text-[10px] text-amber-900 block">Compuerta Estándar a Desbloquear:</span>
                <p className="text-[11px] leading-relaxed font-medium">
                  {contingencyTargetSug.ruleGate}
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">
                    Causa o Tipo de Contingencia:
                  </label>
                  <select
                    value={contingencyTypeInput}
                    onChange={(e) => setContingencyTypeInput(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                  >
                    <option value="VACACIONES">🏖️ Vacaciones del Titular / Aprobador Previo (Subrogancia)</option>
                    <option value="EMERGENCIA_OPERACIONAL">🚨 Emergencia Operacional Impostergable (Falla Crítica)</option>
                    <option value="LICENCIA_MEDICA">🏥 Licencia Médica o Ausencia Justificada de Personal</option>
                    <option value="SUBROGANTE_AUTORIZADO">👔 Subrogante Formal Facultado por Gerencia</option>
                    <option value="PROVEEDOR_UNICO">⭐ Proveedor Único / Distribuidor Exclusivo</option>
                    <option value="OTRO">📋 Otra Contingencia Operativa Auditada</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">
                    Funcionario Subrogante o Autorizante:
                  </label>
                  <input
                    type="text"
                    value={contingencySubroganteInput}
                    onChange={(e) => setContingencySubroganteInput(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans uppercase"
                    placeholder="Nombre y cargo del subrogante..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">
                    Justificación Auditada para Continuar el Trámite:
                  </label>
                  <textarea
                    rows={2}
                    value={contingencyReasonInput}
                    onChange={(e) => setContingencyReasonInput(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                    placeholder={`Ej: Subrogancia autorizada por feriado legal del titular. Se continúa el proceso para no detener operaciones...`}
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setContingencyTargetSug(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteSuggestionContingency(contingencyTargetSug)}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <ShieldCheck size={16} />
                  Autorizar y Desbloquear Proceso (Auditado)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Estándar: <strong>AssetFlow Enterprise Status Flow</strong></span>
            <span>•</span>
            <span>Tablas involucradas: <strong>F40203 (Rules), F4311 (Lines), F43121 (Receipts), F0411 (Vouchers)</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black text-xs uppercase transition-all cursor-pointer"
          >
            Cerrar Matriz
          </button>
        </div>

      </div>
    </div>
  );
};

export default JDEInterconnectionMapModal;
