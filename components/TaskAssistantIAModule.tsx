import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { WorkOrder, Supplier, Contract, Solicitud, ModuleType } from '../types';
import {
  prioritizeTaskCenterWithAI,
  TaskCenterRawItem,
  PrioritizedTaskAIResult,
  TaskAssistantAIResponse
} from '../geminiService';
import { exportToExcel } from '../lib/excelExport';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  Hammer,
  Users,
  FileText,
  Filter,
  Download,
  Zap,
  CalendarClock,
  Scale,
  Layers
} from 'lucide-react';

interface TaskAssistantIAModuleProps {
  workOrders: WorkOrder[];
  pendingSuppliers: Supplier[];
  contracts: Contract[];
  solicitudes?: Solicitud[];
  currentUser: string;
  onNavigateToModule?: (module: ModuleType) => void;
}

export const TaskAssistantIAModule: React.FC<TaskAssistantIAModuleProps> = ({
  workOrders,
  pendingSuppliers,
  contracts,
  solicitudes = [],
  currentUser,
  onNavigateToModule
}) => {
  const [aiResponse, setAiResponse] = useState<TaskAssistantAIResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Construir el inventario consolidado de tareas del TaskCenter + Órdenes de Trabajo pendientes
  const rawTasks = useMemo<TaskCenterRawItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const calcDaysRemaining = (dateStr?: string): number => {
      if (!dateStr) return 5;
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return 5;
      parsed.setHours(0, 0, 0, 0);
      return Math.round((parsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    const items: TaskCenterRawItem[] = [];

    // 1. Órdenes de Trabajo (OT) pendientes de V°B°, en borrador o en ejecución con acciones pendientes
    const pendingWorkOrders = workOrders.filter(
      wo =>
        wo.status === 'PENDIENTE_VB' ||
        wo.status === 'BORRADOR' ||
        wo.status === 'APROBADA' ||
        wo.holdCode === '2W' ||
        wo.holdCode === '2H' ||
        wo.holdCode === 'B1' ||
        wo.holdCode === 'C1'
    );

    pendingWorkOrders.forEach(wo => {
      const dueDate = wo.deliveryDate || wo.issueDate || new Date().toISOString().split('T')[0];
      const daysRem = calcDaysRemaining(dueDate);

      // Determinar criticidad según monto, plazo y categoría/especialidad
      const catUpper = `${wo.category || ''} ${wo.specialty || ''} ${wo.specialInstructions || ''}`.toUpperCase();
      const isEmergencyKeywords =
        catUpper.includes('URGENCIA') ||
        catUpper.includes('EMERGENCIA') ||
        catUpper.includes('ASCENSOR') ||
        catUpper.includes('TECHUMBRE') ||
        catUpper.includes('ELÉCTRIC') ||
        catUpper.includes('FILTRACIÓN') ||
        catUpper.includes('INCENDIO');

      let criticalityLevel: TaskCenterRawItem['criticalityLevel'] = 'MEDIA';
      if (wo.total >= 5000000 || daysRem <= 0 || isEmergencyKeywords) {
        criticalityLevel = 'CRÍTICA';
      } else if (wo.total >= 1500000 || daysRem <= 3 || wo.status === 'PENDIENTE_VB') {
        criticalityLevel = 'ALTA';
      } else if (daysRem > 10 && wo.total < 500000) {
        criticalityLevel = 'BAJA';
      }

      const mainItemDesc = wo.items?.[0]?.description || wo.specialInstructions || 'Orden de Trabajo';

      items.push({
        id: `wo-task-${wo.id}`,
        taskCode: wo.folio,
        title: `OT ${wo.folio} — ${mainItemDesc}`,
        entityName: `${wo.supplierName} • ${wo.propertyLabel || wo.deliveryAddress}`,
        taskType: 'ORDEN_TRABAJO',
        dueDate,
        daysRemaining: daysRem,
        amountCLP: wo.total || 0,
        criticalityLevel,
        categoryOrSpecialty: [wo.category, wo.specialty].filter(Boolean).join(' / ') || 'MANTENCIÓN GENERAL',
        associatedInvoice: wo.associatedInvoice || wo.supplierTaxDocumentType || 'FACTURA / BH POR VALIDAR',
        holdCodeOrStatus: wo.holdCode ? `Hold ${wo.holdCode} (${wo.status})` : wo.status,
        targetModule: wo.status === 'PENDIENTE_VB' ? 'APROBACIONES_JDE' : 'ORDENES',
        sourceEntityId: wo.id
      });
    });

    // 2. Proveedores pendientes de aprobación en TaskCenter (Form DI-01 / Due Diligence)
    pendingSuppliers.forEach(sup => {
      const dueDate = sup.dueDiligenceDate || sup.requestDate || new Date().toISOString().split('T')[0];
      const daysRem = calcDaysRemaining(dueDate);
      const criticalityLevel: TaskCenterRawItem['criticalityLevel'] =
        sup.dueDiligenceRisk === 'RIESGO ALTO'
          ? 'CRÍTICA'
          : sup.dueDiligenceRisk === 'RIESGO MEDIO' || daysRem <= 2
          ? 'ALTA'
          : 'MEDIA';

      items.push({
        id: `sup-task-${sup.id}`,
        taskCode: sup.folio || `PROV-${sup.taxId}`,
        title: `Validación VoBo Proveedor: ${sup.name}`,
        entityName: `RUT ${sup.taxId} • Rubro: ${sup.category}`,
        taskType: 'PROVEEDOR_PENDIENTE',
        dueDate,
        daysRemaining: daysRem,
        amountCLP: sup.f0401Purchasing?.maxOrderAmount || 1500000,
        criticalityLevel,
        categoryOrSpecialty: `COMPLIANCE UAF (${sup.dueDiligenceRisk})`,
        associatedInvoice: sup.taxDocumentType,
        holdCodeOrStatus: 'PENDIENTE_VOBO_JEFATURA',
        targetModule: 'TAREAS',
        sourceEntityId: sup.id
      });
    });

    // 3. Contratos por vencer o vencidos en TaskCenter
    contracts
      .filter(c => c.status === 'POR_VENCER' || c.status === 'VENCIDO')
      .forEach(c => {
        const dueDate = c.endDate || new Date().toISOString().split('T')[0];
        const daysRem = calcDaysRemaining(dueDate);
        items.push({
          id: `con-task-${c.id}`,
          taskCode: `CTR-${c.id.substring(0, 6).toUpperCase()}`,
          title: `Renovación / Cierre Contrato: ${c.supplierName}`,
          entityName: `${c.building} - Piso ${c.floor}`,
          taskType: 'CONTRATO_POR_VENCER',
          dueDate,
          daysRemaining: daysRem,
          amountCLP: c.monthlyAmount || 0,
          criticalityLevel: c.status === 'VENCIDO' || daysRem <= 0 ? 'CRÍTICA' : 'ALTA',
          categoryOrSpecialty: 'CONTINUIDAD CONTRACTUAL',
          associatedInvoice: 'CONTRATO MARCO',
          holdCodeOrStatus: c.status,
          targetModule: 'CONTRATOS_ARRIENDO',
          sourceEntityId: c.id
        });
      });

    // 4. Solicitudes de mantención abiertas o detenidas
    solicitudes
      .filter(s => s.status === 'PENDIENTE' || s.status === 'DETENIDA' || s.status === 'EN_PROCESO')
      .slice(0, 6)
      .forEach(sol => {
        const dueDate = sol.requestDate || new Date().toISOString().split('T')[0];
        const daysRem = calcDaysRemaining(dueDate) + 3; // SLA 3 días desde solicitud
        items.push({
          id: `sol-task-${sol.id}`,
          taskCode: sol.id.toUpperCase(),
          title: `Solicitud Terreno: ${sol.title}`,
          entityName: `${sol.propertyLabel} • Solicitante: ${sol.applicantName || sol.userCreator}`,
          taskType: 'SOLICITUD_MANTENCION',
          dueDate,
          daysRemaining: daysRem,
          amountCLP: 450000,
          criticalityLevel: sol.priority === 'ALTA' ? 'ALTA' : sol.priority === 'MEDIA' ? 'MEDIA' : 'BAJA',
          categoryOrSpecialty: sol.category,
          associatedInvoice: 'POR EMITIR OT',
          holdCodeOrStatus: sol.status,
          targetModule: 'SOLICITUDES',
          sourceEntityId: sol.id
        });
      });

    return items;
  }, [workOrders, pendingSuppliers, contracts, solicitudes]);

  const runAIPrioritization = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const res = await prioritizeTaskCenterWithAI(rawTasks);
      setAiResponse(res);
    } finally {
      setIsAnalyzing(false);
    }
  }, [rawTasks]);

  useEffect(() => {
    runAIPrioritization();
  }, [runAIPrioritization]);

  // Combinar datos crudos con el ranking devuelto por Gemini
  const enrichedTasks = useMemo(() => {
    const aiMap = new Map<string, PrioritizedTaskAIResult>(
      (aiResponse?.prioritizedItems || []).map(p => [p.id, p])
    );
    return rawTasks
      .map((raw, idx) => {
        const ai = aiMap.get(raw.id);
        return {
          ...raw,
          rank: ai?.rank ?? idx + 1,
          priorityScore: ai?.priorityScore ?? 70,
          urgencyLabel: ai?.urgencyLabel ?? 'ALTA PRIORIDAD',
          aiRationale:
            ai?.aiRationale ??
            'Evaluando fecha de vencimiento y criticidad operativa de la Orden de Trabajo...',
          recommendedAction:
            ai?.recommendedAction ?? 'Validar antecedentes en bandeja transaccional.',
          complianceRiskNote:
            ai?.complianceRiskNote ?? 'Sujeto a validación humana (Art. 14 EU AI Act).'
        };
      })
      .sort((a, b) => a.rank - b.rank);
  }, [rawTasks, aiResponse]);

  const filteredTasks = useMemo(() => {
    return enrichedTasks.filter(t => {
      const matchesType = filterType === 'ALL' || t.taskType === filterType;
      const matchesUrgency = filterUrgency === 'ALL' || t.urgencyLabel === filterUrgency;
      const matchesSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.taskCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.categoryOrSpecialty || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesUrgency && matchesSearch;
    });
  }, [enrichedTasks, filterType, filterUrgency, searchQuery]);

  const handleExportPrioritizedExcel = () => {
    const rows = filteredTasks.map(t => ({
      'Ranking IA': `#${t.rank}`,
      'Score Prioridad (0-100)': t.priorityScore,
      'Nivel de Urgencia': t.urgencyLabel,
      'Código / Folio': t.taskCode,
      'Tipo de Tarea': t.taskType,
      'Tarea / Orden de Trabajo': t.title,
      'Entidad / Unidad Inmobiliaria': t.entityName,
      'Categoría / Especialidad': t.categoryOrSpecialty || 'GENERAL',
      'Doc. Tributario Asociado': t.associatedInvoice || 'N/A',
      'Fecha Vencimiento (SLA)': t.dueDate,
      'Días Restantes': t.daysRemaining,
      'Impacto Financiero (CLP)': t.amountCLP,
      'Fundamento Cognitivo Gemini': t.aiRationale,
      'Acción Recomendada (Human-in-the-Loop)': t.recommendedAction,
      'Control Normativo / Compliance': t.complianceRiskNote
    }));
    exportToExcel(
      rows,
      `Priorizacion_Asistente_Tareas_IA_${new Date().toISOString().split('T')[0]}`,
      'Priorizacion_IA'
    );
  };

  const criticalCount = enrichedTasks.filter(
    t => t.urgencyLabel === 'URGENCIA INMEDIATA (SLA CRÍTICO)'
  ).length;
  const pendingOTCount = enrichedTasks.filter(t => t.taskType === 'ORDEN_TRABAJO').length;
  const totalExposureCLP = enrichedTasks.reduce((acc, t) => acc + (t.amountCLP || 0), 0);

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-50 overflow-auto">
      {/* HEADER BAR ESTILO ASSETFLOW ENTERPRISE 9.11 */}
      <div className="bg-[#002D62] text-white px-4 md:px-8 py-4 border-b-2 border-emerald-500 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-mono text-[9.5px] font-black uppercase rounded">
                P0001IA / W0001IA
              </span>
              <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">
                Motor Cognitivo Gemini • Supervisión Humana Art. 14 EU AI Act
              </span>
            </div>
            <h1 className="text-base md:text-lg font-black tracking-tight uppercase mt-0.5">
              Asistente de Tareas IA — Priorización de TaskCenter y Órdenes de Trabajo
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigateToModule?.('TAREAS')}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Zap size={13} className="text-amber-400" />
            <span>Volver a TaskCenter (P0001)</span>
          </button>

          <button
            type="button"
            onClick={handleExportPrioritizedExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Download size={13} />
            <span>Exportar Matriz IA (.XLSX)</span>
          </button>

          <button
            type="button"
            onClick={runAIPrioritization}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <RefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
            <span>{isAnalyzing ? 'Priorizando con Gemini...' : 'Recalcular Prioridad IA'}</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* KPI STRIP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Total Tareas Evaluadas
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {enrichedTasks.length}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                TaskCenter + Bandeja OT (P48201 / P43081)
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers size={22} />
            </div>
          </div>

          <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">
                Urgencia Inmediata (SLA Crítico)
              </span>
              <span className="text-2xl font-black text-rose-700 mt-1 block">
                {criticalCount}
              </span>
              <span className="text-[10px] font-semibold text-rose-600/80">
                Vencidas o con alta criticidad técnica
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">
                Órdenes de Trabajo Pendientes
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {pendingOTCount}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Con Categoría, Especialidad y Doc. Tributario
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Hammer size={22} />
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">
                Exposición Patrimonial en Cola
              </span>
              <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                ${totalExposureCLP.toLocaleString('es-CL')}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Cálculo determinista exacto (CLP)
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Scale size={22} />
            </div>
          </div>
        </div>

        {/* DICTAMEN EJECUTIVO DE GEMINI (HUMAN-IN-THE-LOOP) */}
        <div className="bg-gradient-to-r from-slate-900 via-[#0B3C5D] to-slate-900 text-white rounded-2xl p-5 border border-emerald-500/50 shadow-md space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Dictamen de Priorización Cognitiva Gemini ({aiResponse?.modelUsed || 'Cargando...'})
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-300">
              Última sincronización: {aiResponse?.generatedAt || '--:--'} • Operador: {currentUser}
            </span>
          </div>

          <p className="text-xs text-slate-100 leading-relaxed">
            {aiResponse?.executiveSummary ||
              'Analizando fechas de vencimiento, rutas de aprobación P43081 y criticidad de Órdenes de Trabajo pendientes...'}
          </p>

          <div className="bg-white/10 border border-white/15 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-200 font-semibold">
                <strong>Alerta de Cuello de Botella & Gobernanza (Art. 14 EU AI Act):</strong>{' '}
                {aiResponse?.criticalBottleneckAlert ||
                  'El Asistente IA propone el orden de atención óptimo, pero toda liberación de OT o aprobación de proveedor requiere validación humana expresa.'}
              </p>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS QBE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase mr-2">
              <Filter size={14} className="text-indigo-600" />
              <span>Filtrar Cola:</span>
            </div>
            {[
              { id: 'ALL', label: 'Todas las Tareas' },
              { id: 'ORDEN_TRABAJO', label: 'Órdenes de Trabajo (OT)' },
              { id: 'PROVEEDOR_PENDIENTE', label: 'Proveedores (VoBo)' },
              { id: 'CONTRATO_POR_VENCER', label: 'Contratos por Vencer' },
              { id: 'SOLICITUD_MANTENCION', label: 'Solicitudes Terreno' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-[#002D62] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial justify-end">
            <select
              value={filterUrgency}
              onChange={e => setFilterUrgency(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">Todas las Urgencias</option>
              <option value="URGENCIA INMEDIATA (SLA CRÍTICO)">Urgencia Inmediata (SLA Crítico)</option>
              <option value="ALTA PRIORIDAD">Alta Prioridad</option>
              <option value="PRIORIDAD MEDIA">Prioridad Media</option>
              <option value="MONITOREO PREVENTIVO">Monitoreo Preventivo</option>
            </select>

            <input
              type="text"
              placeholder="Buscar folio, proveedor, especialidad..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 min-w-[220px]"
            />
          </div>
        </div>

        {/* GRILLA DE PRIORIZACIÓN INTELIGENTE */}
        <div className="bg-white border border-[#91A6BA] rounded-xl shadow-sm overflow-hidden">
          <div className="bg-[#E9F0F8] border-b border-[#C3D5E6] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-2 text-[#0B3C5D] font-bold">
              <span className="font-mono bg-[#0B3C5D] text-white px-1.5 py-0.5 rounded text-[9px]">
                GRID W0001IA
              </span>
              <span>Matriz de Priorización Cognitiva por Vencimiento (SLA) y Criticidad Operativa</span>
            </div>
            <div className="font-mono text-slate-600">
              Mostrando <strong className="text-slate-900">{filteredTasks.length}</strong> de{' '}
              <strong>{enrichedTasks.length}</strong> tareas
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0B3C5D] text-white text-[10px] font-black uppercase tracking-wider divide-x divide-[#092e48]">
                  <th className="py-3 px-3 w-16 text-center">Rank IA</th>
                  <th className="py-3 px-3 w-28 text-center">Score / SLA</th>
                  <th className="py-3 px-3 w-44">Tarea / Orden Pendiente</th>
                  <th className="py-3 px-3 w-44">Especialidad / Doc. Tributario</th>
                  <th className="py-3 px-3 w-36 text-center">Vencimiento</th>
                  <th className="py-3 px-3 w-28 text-right">Monto (CLP)</th>
                  <th className="py-3 px-4 min-w-[260px]">Justificación IA & Acción Sugerida</th>
                  <th className="py-3 px-3 w-32 text-center">Acción Humana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {filteredTasks.map(task => {
                  const isImmediate = task.urgencyLabel === 'URGENCIA INMEDIATA (SLA CRÍTICO)';
                  const isHigh = task.urgencyLabel === 'ALTA PRIORIDAD';

                  return (
                    <tr
                      key={task.id}
                      className={`transition-colors ${
                        isImmediate
                          ? 'bg-rose-50/40 hover:bg-rose-50/80'
                          : 'hover:bg-indigo-50/40 even:bg-slate-50/50'
                      }`}
                    >
                      {/* RANK */}
                      <td className="py-3 px-3 text-center border-r border-slate-150 font-mono">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs shadow-2xs ${
                            task.rank === 1
                              ? 'bg-rose-600 text-white'
                              : task.rank <= 3
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          #{task.rank}
                        </span>
                      </td>

                      {/* SCORE & URGENCY */}
                      <td className="py-3 px-3 text-center border-r border-slate-150">
                        <div className="font-mono font-black text-sm text-slate-900">
                          {task.priorityScore}/100
                        </div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-tight ${
                            isImmediate
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isHigh
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {task.urgencyLabel}
                        </span>
                      </td>

                      {/* TAREA / ENTIDAD */}
                      <td className="py-3 px-3 border-r border-slate-150">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono text-[9.5px] font-black px-1.5 py-0.2 bg-slate-200 text-slate-800 rounded">
                            {task.taskCode}
                          </span>
                          <span className="text-[9px] font-bold uppercase text-indigo-600">
                            {task.taskType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="font-black text-slate-900 uppercase leading-snug">
                          {task.title}
                        </p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          {task.entityName}
                        </p>
                      </td>

                      {/* CATEGORÍA / ESPECIALIDAD / FACTURA ASOCIADA (PRESERVACIÓN OBLIGATORIA) */}
                      <td className="py-3 px-3 border-r border-slate-150">
                        <div className="font-bold text-slate-800 uppercase text-[10px]">
                          {task.categoryOrSpecialty}
                        </div>
                        <div className="text-[9.5px] font-mono text-emerald-700 font-bold mt-1">
                          Doc: {task.associatedInvoice}
                        </div>
                        <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                          Estado: {task.holdCodeOrStatus}
                        </div>
                      </td>

                      {/* VENCIMIENTO */}
                      <td className="py-3 px-3 text-center border-r border-slate-150 font-mono">
                        <div className="flex items-center justify-center gap-1 font-bold text-slate-800">
                          <CalendarClock size={12} className="text-slate-500" />
                          <span>{task.dueDate}</span>
                        </div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            task.daysRemaining < 0
                              ? 'bg-rose-600 text-white'
                              : task.daysRemaining <= 2
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.daysRemaining < 0
                            ? `Vencida (${Math.abs(task.daysRemaining)}d)`
                            : task.daysRemaining === 0
                            ? 'Vence HOY'
                            : `En ${task.daysRemaining} día(s)`}
                        </span>
                      </td>

                      {/* MONTO */}
                      <td className="py-3 px-3 text-right border-r border-slate-150 font-mono font-black text-slate-900">
                        ${task.amountCLP.toLocaleString('es-CL')}
                      </td>

                      {/* JUSTIFICACIÓN IA */}
                      <td className="py-3 px-4 border-r border-slate-150 space-y-1.5">
                        <p className="text-[10.5px] text-slate-800 leading-relaxed font-medium">
                          {task.aiRationale}
                        </p>
                        <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-lg px-2.5 py-1.5 text-[10px] text-indigo-950">
                          <strong className="uppercase">Acción Sugerida:</strong>{' '}
                          {task.recommendedAction}
                        </div>
                        <div className="text-[9.5px] text-slate-500 italic">
                          {task.complianceRiskNote}
                        </div>
                      </td>

                      {/* ACCIÓN HUMANA */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onNavigateToModule?.(task.targetModule as ModuleType)}
                          className="px-3 py-2 bg-[#002D62] hover:bg-emerald-600 text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <span>Resolver</span>
                          <ArrowUpRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskAssistantIAModule;
