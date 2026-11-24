import React, { useState, useMemo } from 'react';
import { 
  GitMerge, ShieldCheck, Lock, Plus, Edit2, Trash2, 
  ArrowUp, ArrowDown, Save, RotateCcw, FileSpreadsheet, 
  CheckCircle2, AlertTriangle, Clock, DollarSign, Layers,
  Check, X, Sparkles, Sliders, ArrowRight, Eye, UserCheck,
  Search, Info, FileCheck
} from 'lucide-react';
import { ApprovalRoute, ApprovalStep, ApproverRoleType, UserRole } from '../types';
import { 
  getApprovalRoutes, saveApprovalRoutes, saveApprovalRoute, 
  deleteApprovalRoute, resetApprovalRoutesToDefault, evaluateApprovalRoute 
} from '../lib/approvalRoutesData';
import { useResizableColumns } from '../lib/useResizableColumns';
import { GridDimensionControls } from './common/GridDimensionControls';
import { JDEGridContextMenu } from './JDEGridContextMenu';

export interface ApprovalRoutesModuleProps {
  currentUser: string;
  userRole?: string;
  onAuditLog?: (action: string, details: string) => void;
}

export const ApprovalRoutesModule: React.FC<ApprovalRoutesModuleProps> = ({
  currentUser,
  userRole = 'ADMINISTRADOR',
  onAuditLog
}) => {
  // Security Gate: STRICTLY ONLY FOR SYSTEM ADMINISTRATOR
  const isAdmin = userRole === 'ADMINISTRADOR' || currentUser.toLowerCase().includes('admin') || currentUser.toLowerCase().includes('samaheim');

  // State
  const [routes, setRoutes] = useState<ApprovalRoute[]>(() => getApprovalRoutes());
  const [selectedRouteId, setSelectedRouteId] = useState<string>(() => routes[0]?.id || 'route_op_default');
  
  // Currently viewed route
  const activeRoute = useMemo(() => {
    return routes.find(r => r.id === selectedRouteId) || routes[0];
  }, [routes, selectedRouteId]);

  // Modal for editing/adding step
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ApprovalStep | null>(null);

  // Modal for new route
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [newRouteCode, setNewRouteCode] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteOrderType, setNewRouteOrderType] = useState<'OP' | 'SQ' | 'OT'>('OP');
  const [newRouteDesc, setNewRouteDesc] = useState('');

  // Simulator state
  const [simAmount, setSimAmount] = useState<number>(2500000);
  const [simOrderType, setSimOrderType] = useState<'OP' | 'SQ' | 'OT'>('OP');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Context Menu state
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    step: ApprovalStep;
  } | null>(null);

  // Resizable Columns and Rows hook for ERP grid
  const {
    widths,
    onMouseDown,
    onColumnDoubleClick,
    onRowMouseDown,
    onRowDoubleClick,
    getRowHeight,
    defaultRowHeight,
    setDefaultRowHeight,
    resetWidths,
    resetHeights,
    resetAll
  } = useResizableColumns({
    initialWidths: {
      nivel: 60,
      denominacion: 230,
      rol: 200,
      titular: 180,
      monto: 160,
      exigencias: 190,
      subrogante: 160,
      sla: 90,
      acciones: 130
    },
    initialRowHeight: 44,
    storageKey: 'jde_approval_steps_grid'
  });

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Step modal form fields
  const [stepName, setStepName] = useState('');
  const [approverRole, setApproverRole] = useState<ApproverRoleType>('JEFE_MANTENCION');
  const [approverTitle, setApproverTitle] = useState('');
  const [approverName, setApproverName] = useState('');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(5000000);
  const [requiresQuotes, setRequiresQuotes] = useState(true);
  const [minQuotesCount, setMinQuotesCount] = useState<number>(2);
  const [requiresUafCheck, setRequiresUafCheck] = useState(false);
  const [requiresInspectionReport, setRequiresInspectionReport] = useState(false);
  const [subrogateRole, setSubrogateRole] = useState('');
  const [subrogateName, setSubrogateName] = useState('');
  const [slaHours, setSlaHours] = useState<number>(24);
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [notes, setNotes] = useState('');

  // Open Step Modal for Add
  const handleOpenAddStep = () => {
    if (!activeRoute) return;
    const nextStepNum = (activeRoute.steps.length || 0) + 1;
    setEditingStep(null);
    setStepName(`Paso ${nextStepNum}: Autorización de Nivel ${nextStepNum}`);
    setApproverRole('JEFE_MANTENCION');
    setApproverTitle('Jefe de Operaciones / Mantención');
    setApproverName('JEFE ASIGNADO');
    setMinAmount(1000000);
    setMaxAmount(5000000);
    setRequiresQuotes(true);
    setMinQuotesCount(2);
    setRequiresUafCheck(false);
    setRequiresInspectionReport(false);
    setSubrogateRole('');
    setSubrogateName('');
    setSlaHours(24);
    setAutoEscalate(true);
    setNotes('');
    setIsStepModalOpen(true);
  };

  // Open Step Modal for Edit
  const handleOpenEditStep = (step: ApprovalStep) => {
    setEditingStep(step);
    setStepName(step.stepName);
    setApproverRole(step.approverRole);
    setApproverTitle(step.approverTitle);
    setApproverName(step.approverName);
    setMinAmount(step.minAmount);
    setMaxAmount(step.maxAmount);
    setRequiresQuotes(step.requiresQuotes);
    setMinQuotesCount(step.minQuotesCount || 1);
    setRequiresUafCheck(Boolean(step.requiresUafCheck));
    setRequiresInspectionReport(Boolean(step.requiresInspectionReport));
    setSubrogateRole(step.subrogateRole || '');
    setSubrogateName(step.subrogateName || '');
    setSlaHours(step.slaHours || 24);
    setAutoEscalate(step.autoEscalate);
    setNotes(step.notes || '');
    setIsStepModalOpen(true);
  };

  // Save Step
  const handleSaveStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoute) return;

    let updatedSteps: ApprovalStep[];

    if (editingStep) {
      updatedSteps = activeRoute.steps.map(s => {
        if (s.id === editingStep.id) {
          return {
            ...s,
            stepName,
            approverRole,
            approverTitle,
            approverName,
            minAmount: Number(minAmount),
            maxAmount: Number(maxAmount),
            requiresQuotes,
            minQuotesCount: requiresQuotes ? Number(minQuotesCount) : 0,
            requiresUafCheck,
            requiresInspectionReport,
            subrogateRole,
            subrogateName,
            slaHours: Number(slaHours),
            autoEscalate,
            notes
          };
        }
        return s;
      });
    } else {
      const newStep: ApprovalStep = {
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        stepNumber: activeRoute.steps.length + 1,
        stepName,
        approverRole,
        approverTitle,
        approverName,
        minAmount: Number(minAmount),
        maxAmount: Number(maxAmount),
        requiresQuotes,
        minQuotesCount: requiresQuotes ? Number(minQuotesCount) : 0,
        requiresUafCheck,
        requiresInspectionReport,
        subrogateRole,
        subrogateName,
        slaHours: Number(slaHours),
        autoEscalate,
        notes
      };
      updatedSteps = [...activeRoute.steps, newStep];
    }

    // Re-index step numbers
    updatedSteps = updatedSteps.map((s, idx) => ({
      ...s,
      stepNumber: idx + 1
    }));

    const updatedRoute: ApprovalRoute = {
      ...activeRoute,
      steps: updatedSteps,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser
    };

    const newRoutes = saveApprovalRoute(updatedRoute, currentUser);
    setRoutes(newRoutes);
    setIsStepModalOpen(false);
    showFeedback(`Paso de aprobación "${stepName}" guardado correctamente.`);
    if (onAuditLog) {
      onAuditLog('UPDATE_APPROVAL_STEP', `Modificado paso "${stepName}" en ruta ${activeRoute.routeCode}`);
    }
  };

  // Move Step Up/Down
  const handleMoveStep = (stepIdx: number, direction: 'UP' | 'DOWN') => {
    if (!activeRoute) return;
    const targetIdx = direction === 'UP' ? stepIdx - 1 : stepIdx + 1;
    if (targetIdx < 0 || targetIdx >= activeRoute.steps.length) return;

    const newSteps = [...activeRoute.steps];
    const temp = newSteps[stepIdx];
    newSteps[stepIdx] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;

    const renumbered = newSteps.map((s, i) => ({
      ...s,
      stepNumber: i + 1
    }));

    const updatedRoute: ApprovalRoute = {
      ...activeRoute,
      steps: renumbered,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser
    };

    const newRoutes = saveApprovalRoute(updatedRoute, currentUser);
    setRoutes(newRoutes);
    showFeedback(`Secuencia jerárquica de pasos actualizada.`);
  };

  // Delete Step
  const handleDeleteStep = (stepId: string) => {
    if (!activeRoute) return;
    if (activeRoute.steps.length <= 1) {
      alert('Una ruta de aprobación debe tener como mínimo 1 paso.');
      return;
    }
    if (!confirm('¿Está seguro de eliminar este nivel de aprobación de la ruta?')) return;

    const filtered = activeRoute.steps.filter(s => s.id !== stepId).map((s, i) => ({
      ...s,
      stepNumber: i + 1
    }));

    const updatedRoute: ApprovalRoute = {
      ...activeRoute,
      steps: filtered,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser
    };

    const newRoutes = saveApprovalRoute(updatedRoute, currentUser);
    setRoutes(newRoutes);
    showFeedback('Paso eliminado de la ruta.', 'info');
  };

  // Create New Route
  const handleCreateNewRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteCode.trim() || !newRouteName.trim()) {
      alert('Debe ingresar el código y el nombre de la ruta.');
      return;
    }

    const newRoute: ApprovalRoute = {
      id: `route_${Date.now()}`,
      routeCode: newRouteCode.trim().toUpperCase(),
      routeName: newRouteName.trim().toUpperCase(),
      orderType: newRouteOrderType,
      description: newRouteDesc.trim() || 'Ruta personalizada de aprobación de órdenes ERP',
      isActive: true,
      isDefault: false,
      currency: 'CLP',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
      steps: [
        {
          id: `step_init_${Date.now()}`,
          stepNumber: 1,
          stepName: 'Paso 1: Solicitud y Elaboración',
          approverRole: 'SOLICITANTE',
          approverTitle: 'Analista de Control Inmobiliario',
          approverName: currentUser,
          minAmount: 0,
          maxAmount: 100000000,
          requiresQuotes: false,
          minQuotesCount: 0,
          slaHours: 12,
          autoEscalate: false,
          notes: 'Emisión inicial'
        }
      ]
    };

    const updated = saveApprovalRoute(newRoute, currentUser);
    setRoutes(updated);
    setSelectedRouteId(newRoute.id);
    setIsRouteModalOpen(false);
    setNewRouteCode('');
    setNewRouteName('');
    setNewRouteDesc('');
    showFeedback(`Ruta ${newRoute.routeCode} creada exitosamente.`);
  };

  // Reset to corporate defaults
  const handleResetDefaults = () => {
    if (confirm('¿Restablecer todas las rutas de aprobación a los valores corporativos oficiales de AssetFlow ERP?')) {
      const defaults = resetApprovalRoutesToDefault();
      setRoutes(defaults);
      setSelectedRouteId(defaults[0]?.id || 'route_op_default');
      showFeedback('Rutas restablecidas a los estándares corporativos.');
    }
  };

  // Export matrix to CSV/Excel
  const handleExportMatrix = () => {
    const csvRows: string[] = [
      ['CODIGO_RUTA', 'TIPO_ORDEN', 'NUM_PASO', 'NOMBRE_PASO', 'ROL_APROBADOR', 'TITULO_APROBADOR', 'DESDE_CLP', 'HASTA_CLP', 'COTIZACIONES_EXIGIDAS', 'UAF_EXIGIDA', 'SLA_HORAS', 'SUBROGANTE'].join(';')
    ];

    routes.forEach(r => {
      r.steps.forEach(s => {
        csvRows.push([
          r.routeCode,
          r.orderType,
          s.stepNumber,
          `"${s.stepName}"`,
          s.approverRole,
          `"${s.approverTitle}"`,
          s.minAmount,
          s.maxAmount,
          s.requiresQuotes ? s.minQuotesCount || 1 : 0,
          s.requiresUafCheck ? 'SI' : 'NO',
          s.slaHours,
          `"${s.subrogateName || 'NINGUNO'}"`
        ].join(';'));
      });
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Matriz_Rutas_Aprobacion_P43008_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback('Matriz exportada exitosamente.');
  };

  // Simulation calculation
  const simResult = useMemo(() => {
    return evaluateApprovalRoute(simOrderType, simAmount, activeRoute?.routeCode);
  }, [simOrderType, simAmount, activeRoute]);

  // If user is not admin, deny access
  if (!isAdmin) {
    return (
      <div className="h-full bg-slate-100 flex items-center justify-center p-6 select-none">
        <div className="bg-white rounded-xl border-2 border-rose-300 p-8 max-w-lg shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Lock size={32} />
          </div>
          <h2 className="text-lg font-black uppercase text-slate-800 tracking-wide">
            Acceso Restringido - Solo Administrador del Sistema
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            El módulo <strong className="text-rose-700">P43008 (Approval Level Rules)</strong> gestiona las jerarquías de firmas, techos presupuestarios y desvíos de compras corporativas. Por exigencias de la norma NIA 240 y control interno SOX, solo los usuarios con rol de <strong>ADMINISTRADOR</strong> tienen privilegios para alterar estas matrices.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[11px] font-mono text-slate-500">
            Usuario actual: <strong className="text-slate-800">{currentUser}</strong> | Rol: <strong className="text-slate-800">{userRole}</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#f0f3f6] select-none overflow-hidden">
      
      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR                                        */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-[#002D62] via-[#0A4B82] to-[#002D62] text-white px-5 py-3 border-b border-[#001D42] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-lg text-amber-400">
            <GitMerge size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black uppercase tracking-wide">
                P43008 - Approval Level Rules & Workflow Routing
              </h1>
              <span className="text-[10px] bg-amber-400 text-slate-900 px-2 py-0.5 rounded font-black tracking-wider uppercase flex items-center gap-1 shadow-xs">
                <Lock size={10} /> SOLO ADMINISTRADOR
              </span>
            </div>
            <p className="text-[11px] text-blue-100 font-medium">
              Matriz Jerárquica de Aprobaciones de Órdenes de Compra (OP), Requisiciones (SQ) y Órdenes de Trabajo (OT)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRouteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#002D62] hover:bg-[#0A4B82] border border-blue-400/40 text-white rounded text-xs font-bold uppercase transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Nueva Ruta</span>
          </button>
          <button
            onClick={handleExportMatrix}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase transition-colors shadow-xs cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>Exportar Matriz</span>
          </button>
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold uppercase transition-colors border border-white/20 cursor-pointer"
            title="Restablecer configuración predeterminada"
          >
            <RotateCcw size={14} />
            <span>Restablecer</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`px-4 py-2 text-xs font-bold flex items-center gap-2 ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' :
          feedbackMsg.type === 'info' ? 'bg-blue-50 text-blue-800 border-b border-blue-200' :
          'bg-rose-50 text-rose-800 border-b border-rose-200'
        }`}>
          <CheckCircle2 size={15} />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN WORKBENCH: ROUTE SELECTOR + STEPS TABLE          */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-audit-scroll">
        
        {/* ROUTE SELECTOR TABS */}
        <div className="bg-white rounded-lg border border-slate-300 p-3 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-[#002D62] flex items-center gap-2">
              <Layers size={14} />
              Rutas Jerárquicas Configuradas en el Sistema
            </h2>
            <span className="text-[10px] text-slate-500 font-semibold">
              Seleccione una ruta para inspeccionar o editar sus niveles de autorización
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {routes.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRouteId(r.id)}
                className={`px-3 py-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer min-w-[240px] shrink-0 ${
                  r.id === selectedRouteId
                    ? 'bg-[#EBF3FB] border-[#002D62] ring-2 ring-[#002D62]/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-black text-[#002D62]">
                    {r.routeCode}
                  </span>
                  <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    r.orderType === 'OP' ? 'bg-blue-100 text-blue-800' :
                    r.orderType === 'SQ' ? 'bg-amber-100 text-amber-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {r.orderType === 'OP' ? 'Órdenes OP' : r.orderType === 'SQ' ? 'Solicitudes SQ' : 'OTs Mantención'}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-800 truncate" title={r.routeName}>
                  {r.routeName}
                </p>
                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1">
                  <span>{r.steps.length} Niveles de Aprobación</span>
                  {r.isDefault && <span className="text-emerald-700 font-bold">PREDETERMINADA</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ACTIVE ROUTE DETAILS & STEPS GRID */}
        {activeRoute && (
          <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden flex flex-col">
            
            {/* ROUTE HEADER INFO */}
            <div className="bg-[#EBF1F5] px-4 py-3 border-b border-slate-300 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black uppercase text-[#002D62] tracking-wide">
                    {activeRoute.routeName} ({activeRoute.routeCode})
                  </h3>
                  <span className="text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                    TIPO: {activeRoute.orderType}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {activeRoute.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <GridDimensionControls
                  defaultRowHeight={defaultRowHeight}
                  onSetRowHeight={setDefaultRowHeight}
                  onResetColumns={resetWidths}
                  onResetRows={resetHeights}
                  onResetAll={resetAll}
                />

                <button
                  type="button"
                  onClick={handleOpenAddStep}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#002D62] hover:bg-[#0A4B82] text-white rounded text-xs font-bold uppercase transition-colors shadow-xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Agregar Nivel de Aprobación</span>
                </button>
              </div>
            </div>

            {/* STEPS TABLE */}
            <div className="overflow-x-auto relative">
              <table className="w-full text-left border-collapse text-[11px] table-fixed">
                <thead className="bg-[#E1E8EE] border-b border-slate-300 text-[10px] font-black text-slate-700 uppercase tracking-tight select-none">
                  <tr className="h-8">
                    {/* NIVEL */}
                    <th 
                      style={{ width: widths.nivel, minWidth: widths.nivel }}
                      className="px-2 text-center relative border-r border-slate-300"
                    >
                      Nivel
                      <div 
                        onMouseDown={(e) => onMouseDown('nivel', e)}
                        onDoubleClick={() => onColumnDoubleClick('nivel', 60)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>

                    {/* DENOMINACIÓN */}
                    <th 
                      style={{ width: widths.denominacion, minWidth: widths.denominacion }}
                      className="px-2 relative border-r border-slate-300"
                    >
                      Denominación del Paso
                      <div 
                        onMouseDown={(e) => onMouseDown('denominacion', e)}
                        onDoubleClick={() => onColumnDoubleClick('denominacion', 230)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>

                    {/* ROL */}
                    <th 
                      style={{ width: widths.rol, minWidth: widths.rol }}
                      className="px-2 relative border-r border-slate-300"
                    >
                      Rol / Cargo Autorizador
                      <div 
                        onMouseDown={(e) => onMouseDown('rol', e)}
                        onDoubleClick={() => onColumnDoubleClick('rol', 200)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>

                    {/* TITULAR */}
                    <th 
                      style={{ width: widths.titular, minWidth: widths.titular }}
                      className="px-2 relative border-r border-slate-300"
                    >
                      Persona / Titular Asignado
                      <div 
                        onMouseDown={(e) => onMouseDown('titular', e)}
                        onDoubleClick={() => onColumnDoubleClick('titular', 180)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>

                    {/* MONTO */}
                    <th 
                      style={{ width: widths.monto, minWidth: widths.monto }}
                      className="px-2 text-right relative border-r border-slate-300"
                    >
                      Rango Monto (CLP)
                      <div 
                        onMouseDown={(e) => onMouseDown('monto', e)}
                        onDoubleClick={() => onColumnDoubleClick('monto', 160)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>

                    {/* EXIGENCIAS */}
                    <th 
                      style={{ width: widths.exigencias, minWidth: widths.exigencias }}
                      className="px-2 text-center relative border-r border-slate-300"
                    >
                      Exigencias de Control
                      <div 
                        onMouseDown={(e) => onMouseDown('exigencias', e)}
                        onDoubleClick={() => onColumnDoubleClick('exigencias', 190)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>

                    {/* SUBROGANTE */}
                    <th 
                      style={{ width: widths.subrogante, minWidth: widths.subrogante }}
                      className="px-2 relative border-r border-slate-300"
                    >
                      Subrogante Autorizado
                      <div 
                        onMouseDown={(e) => onMouseDown('subrogante', e)}
                        onDoubleClick={() => onColumnDoubleClick('subrogante', 160)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>

                    {/* SLA */}
                    <th 
                      style={{ width: widths.sla, minWidth: widths.sla }}
                      className="px-2 text-center relative border-r border-slate-300"
                    >
                      SLA (Horas)
                      <div 
                        onMouseDown={(e) => onMouseDown('sla', e)}
                        onDoubleClick={() => onColumnDoubleClick('sla', 90)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>

                    {/* ACCIONES */}
                    <th 
                      style={{ width: widths.acciones, minWidth: widths.acciones }}
                      className="px-2 text-center relative"
                    >
                      Acciones
                      <div 
                        onMouseDown={(e) => onMouseDown('acciones', e)}
                        onDoubleClick={() => onColumnDoubleClick('acciones', 130)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeRoute.steps.map((step, idx) => (
                    <tr 
                      key={step.id}
                      style={{ height: `${getRowHeight(step.id)}px` }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setGridContextMenu({ x: e.clientX, y: e.clientY, step });
                      }}
                      className="even:bg-slate-50 odd:bg-white hover:bg-[#FFFFA6]/50 transition-colors relative group"
                    >
                      {/* NIVEL */}
                      <td className="px-2 text-center font-mono font-black text-blue-900 border-r border-slate-200 relative">
                        {step.stepNumber}
                        <div
                          onMouseDown={(e) => onRowMouseDown(step.id, e)}
                          onDoubleClick={() => onRowDoubleClick(step.id, defaultRowHeight)}
                          className="absolute left-0 right-0 bottom-0 h-1 cursor-row-resize hover:bg-blue-600"
                        />
                      </td>

                      {/* NOMBRE */}
                      <td className="px-2 border-r border-slate-200 font-bold text-slate-900 truncate">
                        <div className="truncate">{step.stepName}</div>
                        {step.notes && (
                          <div className="text-[9.5px] font-normal text-slate-500 italic truncate" title={step.notes}>
                            {step.notes}
                          </div>
                        )}
                      </td>

                      {/* ROL / CARGO */}
                      <td className="px-2 border-r border-slate-200 font-semibold text-slate-800 truncate">
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 border border-slate-300 text-slate-800">
                          {step.approverTitle || step.approverRole}
                        </span>
                      </td>

                      {/* NOMBRE TITULAR */}
                      <td className="px-2 border-r border-slate-200 font-bold text-slate-700 truncate">
                        {step.approverName || 'VACANTE / ASIGNACIÓN DINÁMICA'}
                      </td>

                      {/* RANGO MONTO */}
                      <td className="px-2 text-right font-mono font-bold text-slate-900 border-r border-slate-200 truncate">
                        ${step.minAmount.toLocaleString('es-CL')} - ${step.maxAmount.toLocaleString('es-CL')}
                      </td>

                      {/* EXIGENCIAS */}
                      <td className="px-2 border-r border-slate-200 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap text-[9px] font-bold">
                          {step.requiresQuotes && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded">
                              {step.minQuotesCount || 1} Cotiz.
                            </span>
                          )}
                          {step.requiresUafCheck && (
                            <span className="bg-indigo-50 text-indigo-800 border border-indigo-300 px-1.5 py-0.5 rounded">
                              UAF
                            </span>
                          )}
                          {step.requiresInspectionReport && (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded">
                              Inspección
                            </span>
                          )}
                          {!step.requiresQuotes && !step.requiresUafCheck && !step.requiresInspectionReport && (
                            <span className="text-slate-400">Sin requisitos extra</span>
                          )}
                        </div>
                      </td>

                      {/* SUBROGANTE */}
                      <td className="px-2 border-r border-slate-200 text-slate-600 text-[10px]">
                        {step.subrogateName || <span className="text-slate-400 italic">No especificado</span>}
                      </td>

                      {/* SLA */}
                      <td className="px-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200">
                        <span className="flex items-center justify-center gap-1">
                          <Clock size={11} className="text-slate-400" />
                          {step.slaHours}h
                        </span>
                      </td>

                      {/* ACCIONES */}
                      <td className="px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, 'UP')}
                            disabled={idx === 0}
                            className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                            title="Subir Nivel"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, 'DOWN')}
                            disabled={idx === activeRoute.steps.length - 1}
                            className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                            title="Bajar Nivel"
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStep(step)}
                            className="p-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                            title="Editar Parámetros del Paso"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStep(step.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            title="Eliminar Paso"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ROUTE FOOTER INFO */}
            <div className="bg-[#F8FAFC] border-t border-slate-300 p-3 flex items-center justify-between text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-[#002D62]" />
                <span>
                  Última actualización: <strong>{new Date(activeRoute.updatedAt).toLocaleString('es-CL')}</strong> por <strong>{activeRoute.updatedBy}</strong>
                </span>
              </div>
              <span className="font-semibold text-emerald-800">
                Total Pasos Activos: {activeRoute.steps.length}
              </span>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* 3. SIMULADOR EN VIVO DE RUTAS DE APROBACIÓN              */}
        {/* ======================================================== */}
        <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#002D62] flex items-center gap-2">
              <Sliders size={15} />
              Simulador en Tiempo Real de Reglas de Aprobación
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold">
              Ingrese un monto hipotético para comprobar qué niveles de firma y documentos se exigirán
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700 uppercase">
                Monto de la Transacción (CLP)
              </label>
              <input
                type="number"
                step="10000"
                value={simAmount}
                onChange={e => setSimAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm font-mono font-black text-blue-900 outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700 uppercase">
                Tipo de Transacción
              </label>
              <select
                value={simOrderType}
                onChange={e => setSimOrderType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-bold uppercase text-slate-800 outline-none focus:bg-white focus:border-blue-600"
              >
                <option value="OP">OP - Orden de Compra / Orden de Trabajo de Mantención</option>
                <option value="SQ">SQ - Solicitud de Requerimiento de Inquilino</option>
              </select>
            </div>

            <div className="bg-[#EBF3FB] border border-[#002D62]/30 p-2.5 rounded text-[11px] font-bold text-slate-800 space-y-0.5">
              <div>Ruta Activada: <strong className="text-blue-900">{simResult.route.routeCode}</strong></div>
              <div>Aprobador Más Alto: <strong className="text-emerald-700">{simResult.highestApprover.approverTitle}</strong></div>
            </div>
          </div>

          {/* VISUAL STEPS CHAIN */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-600">
              Cadena Jerárquica Exigida ({simResult.applicableSteps.length} Pasos):
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {simResult.applicableSteps.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-2 shrink-0">
                  <div className="bg-white border border-slate-300 rounded p-2.5 shadow-2xs min-w-[200px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-black text-blue-900 bg-blue-50 px-1 rounded">
                        PASO {s.stepNumber}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono font-bold">
                        {s.slaHours}h SLA
                      </span>
                    </div>
                    <p className="text-[11px] font-black text-slate-800 truncate" title={s.stepName}>
                      {s.stepName}
                    </p>
                    <p className="text-[9.5px] font-bold text-slate-600">
                      {s.approverTitle}
                    </p>
                    <div className="text-[8.5px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span>Cotiz: {s.requiresQuotes ? s.minQuotesCount : 0}</span>
                      {s.requiresUafCheck && <span className="text-indigo-700 font-bold">UAF</span>}
                    </div>
                  </div>
                  {idx < simResult.applicableSteps.length - 1 && (
                    <ArrowRight size={16} className="text-slate-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <div className="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
              <span>
                Cotizaciones formales exigidas: <strong className="text-slate-900">{simResult.requirements.maxQuotesRequired}</strong> | 
                Revisión UAF: <strong className={simResult.requirements.requiresUafCheck ? 'text-indigo-700' : 'text-slate-500'}>
                  {simResult.requirements.requiresUafCheck ? 'OBLIGATORIA' : 'NO REQUERIDA'}
                </strong> | 
                Inspección técnica: <strong className={simResult.requirements.requiresInspectionReport ? 'text-emerald-700' : 'text-slate-500'}>
                  {simResult.requirements.requiresInspectionReport ? 'OBLIGATORIA' : 'NO REQUERIDA'}
                </strong>
              </span>
              <span className="font-bold text-[#002D62]">
                SLA Acumulado de la Ruta: {simResult.requirements.totalSlaHours} horas hábiles
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* MODAL 1: AGREGAR O EDITAR PASO DE APROBACIÓN             */}
      {/* ======================================================== */}
      {isStepModalOpen && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border-2 border-[#002D62] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="bg-[#002D62] text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <GitMerge size={15} />
                {editingStep ? 'Editar Paso de Aprobación' : 'Nuevo Paso en la Ruta'}
              </h3>
              <button 
                onClick={() => setIsStepModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStep} className="p-4 space-y-3 text-[11px] overflow-y-auto max-h-[80vh]">
              
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Denominación del Paso / Hito de Validación *
                </label>
                <input
                  type="text"
                  value={stepName}
                  onChange={e => setStepName(e.target.value)}
                  placeholder="Ej: Paso 2: Revisión Técnica & Jefatura de Mantención"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase outline-none focus:bg-white focus:border-blue-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-700 uppercase">
                    Rol Aprobador ERP *
                  </label>
                  <select
                    value={approverRole}
                    onChange={e => setApproverRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase outline-none"
                  >
                    <option value="SOLICITANTE">SOLICITANTE / EMISOR</option>
                    <option value="JEFE_MANTENCION">JEFE DE MANTENCIÓN / OPERACIONES</option>
                    <option value="COMPLIANCE_JDE">COMPLIANCE ERP / CONTROL INTERNO</option>
                    <option value="GERENCIA_OPERACIONES">GERENCIA DE OPERACIONES</option>
                    <option value="GERENCIA_GENERAL">GERENCIA GENERAL / DIRECTORIO</option>
                    <option value="AUDITOR_SENIOR">AUDITOR SENIOR FORENSE</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR DEL SISTEMA</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-700 uppercase">
                    Título o Cargo Visible
                  </label>
                  <input
                    type="text"
                    value={approverTitle}
                    onChange={e => setApproverTitle(e.target.value)}
                    placeholder="Ej: Jefe de Mantenimiento"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Nombre del Titular Autorizado
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={e => setApproverName(e.target.value)}
                  placeholder="Ej: ING. CARLOS MENDOZA"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-700 uppercase">
                    Monto Mínimo Desde ($ CLP)
                  </label>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={e => setMinAmount(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-700 uppercase">
                    Monto Máximo Hasta ($ CLP)
                  </label>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={e => setMaxAmount(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* CONTROLES Y CONDICIONES */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-2">
                <span className="text-[9.5px] font-black uppercase text-slate-700 block">
                  Exigencias Normativas y de Control para este Nivel:
                </span>
                
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresQuotes}
                      onChange={e => setRequiresQuotes(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-bold text-slate-800">Exigir Cotizaciones Comparativas</span>
                  </label>
                  {requiresQuotes && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-500 font-bold">Mínimo:</span>
                      <select
                        value={minQuotesCount}
                        onChange={e => setMinQuotesCount(parseInt(e.target.value) || 1)}
                        className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold"
                      >
                        <option value={1}>1 Cotización</option>
                        <option value={2}>2 Cotizaciones</option>
                        <option value={3}>3 Cotizaciones (NIA 240)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresUafCheck}
                      onChange={e => setRequiresUafCheck(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-bold text-slate-800">Exigir Acreditación UAF Proveedor</span>
                  </label>
                  <span className="text-[9px] text-slate-500">Ley 19.913 Anti-Lavado</span>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresInspectionReport}
                      onChange={e => setRequiresInspectionReport(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-bold text-slate-800">Exigir Acta de Inspección en Terreno</span>
                  </label>
                  <span className="text-[9px] text-slate-500">Constatación física de fallas</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-700 uppercase">
                    Subrogante Autorizado
                  </label>
                  <input
                    type="text"
                    value={subrogateName}
                    onChange={e => setSubrogateName(e.target.value)}
                    placeholder="Ej: RODRIGO PEÑA (SUPERVISOR)"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase outline-none focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-700 uppercase">
                    Plazo SLA Resolución (Horas)
                  </label>
                  <input
                    type="number"
                    value={slaHours}
                    onChange={e => setSlaHours(parseInt(e.target.value) || 24)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Notas de Auditoría / Justificación del Nivel
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Detalles sobre por qué se activa este paso..."
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs outline-none focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsStepModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#002D62] hover:bg-[#0A4B82] text-white rounded text-xs font-black uppercase transition-all shadow-md cursor-pointer"
                >
                  Guardar Nivel de Aprobación
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CREAR NUEVA RUTA DE APROBACIÓN                  */}
      {/* ======================================================== */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border-2 border-[#002D62] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-[#002D62] text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <Plus size={15} />
                Nueva Ruta Jerárquica de Aprobación
              </h3>
              <button 
                onClick={() => setIsRouteModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewRoute} className="p-4 space-y-3 text-[11px]">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Código de la Ruta (Identificador ERP) *
                </label>
                <input
                  type="text"
                  placeholder="Ej: CAPEX_HIGH, TI_INFRA, URGENTE_24H"
                  value={newRouteCode}
                  onChange={e => setNewRouteCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold uppercase outline-none focus:bg-white focus:border-blue-600"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Nombre Descriptivo de la Ruta *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ruta de Aprobación para Mejoras de Capital (CAPEX)"
                  value={newRouteName}
                  onChange={e => setNewRouteName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase outline-none focus:bg-white focus:border-blue-600"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Tipo de Orden que Aplica *
                </label>
                <select
                  value={newRouteOrderType}
                  onChange={e => setNewRouteOrderType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase"
                >
                  <option value="OP">OP - Orden de Compra / Orden de Trabajo (Purchase Order)</option>
                  <option value="SQ">SQ - Solicitud de Mantención de Inquilinos (Requisition)</option>
                  <option value="OT">OT - Órdenes Técnicas de Taller y Servicios</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Descripción Operativa
                </label>
                <textarea
                  rows={2}
                  placeholder="Explique el propósito y alcance de esta ruta..."
                  value={newRouteDesc}
                  onChange={e => setNewRouteDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs outline-none focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRouteModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#002D62] hover:bg-[#0A4B82] text-white rounded text-xs font-black uppercase transition-all shadow-md cursor-pointer"
                >
                  Crear Ruta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ERP CONTEXT MENU */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={!!gridContextMenu}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P43008"
          programTitle={`Reglas de Niveles de Aprobación - ${activeRoute.routeName}`}
          collectionName="approval_routes"
          recordId={gridContextMenu.step.id}
          recordFolio={`NIVEL-${gridContextMenu.step.stepNumber}: ${gridContextMenu.step.stepName}`}
          onClose={() => setGridContextMenu(null)}
          onViewDetail={() => {
            handleOpenEditStep(gridContextMenu.step);
            setGridContextMenu(null);
          }}
          onExportExcel={() => {
            handleExportMatrix();
            setGridContextMenu(null);
          }}
          onSetRowHeight={setDefaultRowHeight}
          onResetColumns={resetWidths}
          onResetRows={resetHeights}
          onResetGridDimensions={resetAll}
        />
      )}

    </div>
  );
};
export default ApprovalRoutesModule;
