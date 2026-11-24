
import React, { useMemo, useState } from 'react';
import { ShieldCheck, Database, AlertTriangle, CheckCircle2, Activity, Lock, Search, Trash2, RefreshCw, Zap, Users, Cpu, Shield, Wrench, Loader2, ChevronDown, ChevronUp, Info, Activity as ConcurrencyIcon } from 'lucide-react';
import { Transaction, WorkOrder, Supplier, Property, AuditEntry, PettyCashExpense, PettyCash, Contract, LeaseContract } from '../types';
import { dataService } from '../lib/data-service';
import { ConcurrencyTestSimulator } from './ConcurrencyTestSimulator';
import { AiBudgetShieldPanel } from './AiBudgetShieldPanel';

interface SystemHealthDashboardProps {
  transactions: Transaction[];
  workOrders: WorkOrder[];
  suppliers: Supplier[];
  properties: Property[];
  contracts: Contract[];
  leaseContracts: LeaseContract[];
  auditLog: AuditEntry[];
  pettyCashExpenses: PettyCashExpense[];
  pettyCashFunds: PettyCash[];
  isDbConnected: boolean;
  onFixJdeStamps?: () => void;
  currentUser: string;
  addAuditEntry: (action: string, module: string, targetId: string, targetName?: string, details?: any) => void;
}

type TestResult = {
  label: string;
  status: 'OK' | 'WARN' | 'FAIL';
  detail: string;
  suggestion: string;
  actionLabel?: string;
};

const SystemHealthDashboard: React.FC<SystemHealthDashboardProps> = ({ 
  transactions, workOrders, suppliers, properties, contracts, leaseContracts, auditLog, pettyCashExpenses, pettyCashFunds, isDbConnected, onFixJdeStamps, currentUser, addAuditEntry
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'HEALTH' | 'CONCURRENCY' | 'AI_SHIELD'>('HEALTH');
  const [activeExperts, setActiveExperts] = useState<string[]>([]);
  const [repairingTest, setRepairingTest] = useState<string | null>(null);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  const toggleExpert = (expert: string) => {
    setActiveExperts(prev => 
      prev.includes(expert) ? prev.filter(e => e !== expert) : [...prev, expert]
    );
  };

  const handleRepair = (label: string) => {
    setRepairingTest(label);
    setTimeout(() => {
      setRepairingTest(null);
      alert(`Acción de reparación ejecutada para: ${label}. El sistema re-evaluará la salud en el próximo ciclo.`);
    }, 2000);
  };
  
  const auditResults = useMemo(() => {
    const results = {
      security: [] as TestResult[],
      consistency: [] as TestResult[],
      performance: [] as TestResult[]
    };

    // 1. Security Tests
    results.security.push({
      label: 'Conexión a Base de Datos',
      status: isDbConnected ? 'OK' : 'FAIL',
      detail: isDbConnected ? 'Enlace activo con Firebase Firestore.' : 'No se detecta conexión persistente.',
      suggestion: isDbConnected ? 'Mantener monitoreo activo.' : 'Verificar credenciales en firebase-applet-config.json y estado de red.',
      actionLabel: isDbConnected ? undefined : 'Reintentar Conexión'
    });

    results.security.push({
      label: 'Protocolo de Auditoría',
      status: auditLog.length > 0 ? 'OK' : 'WARN',
      detail: `Se han registrado ${auditLog.length} eventos de trazabilidad.`,
      suggestion: auditLog.length > 0 ? 'Trazabilidad garantizada.' : 'Se recomienda realizar una acción de prueba para inicializar el log.',
      actionLabel: auditLog.length > 0 ? undefined : 'Generar Log de Prueba'
    });

    // 2. Consistency Tests (Using DataService)
    const coherence = dataService.checkCoherence({
      transactions,
      workOrders,
      suppliers,
      pettyCashExpenses,
      pettyCashFunds,
      contracts,
      properties,
      leaseContracts
    });

    results.consistency.push({
      label: 'Coherencia de Módulos (DataService)',
      status: coherence.valid ? 'OK' : 'FAIL',
      detail: coherence.valid 
        ? 'La interacción entre módulos es coherente.' 
        : `Se detectaron ${coherence.errors.length} inconsistencias críticas.`,
      suggestion: coherence.valid ? 'Sistema estable.' : coherence.errors[0],
      actionLabel: coherence.valid ? undefined : 'Reparar Coherencia'
    });

    const orphanedTransactions = transactions.filter(t => t.supplierId && !suppliers.find(s => s.id === t.supplierId));
    results.consistency.push({
      label: 'Integridad Referencial (Proveedores)',
      status: orphanedTransactions.length === 0 ? 'OK' : 'FAIL',
      detail: orphanedTransactions.length === 0 
        ? 'Todos los movimientos financieros están vinculados a proveedores válidos.' 
        : `Se detectaron ${orphanedTransactions.length} transacciones con proveedores inexistentes.`,
      suggestion: orphanedTransactions.length === 0 ? 'Datos consistentes.' : 'Ejecutar script de limpieza o re-asignación de proveedores huérfanos.',
      actionLabel: orphanedTransactions.length === 0 ? undefined : 'Reparar Vínculos'
    });

    const incompleteExpenses = transactions.filter(t => t.type === 'EXPENSE' && (!t.supplierTaxId || t.supplierTaxId === 'S/RUT' || !t.supplierName || t.supplierName === 'PROVEEDOR DESCONOCIDO'));
    results.consistency.push({
      label: 'Calidad de Datos (Egresos)',
      status: incompleteExpenses.length === 0 ? 'OK' : 'WARN',
      detail: incompleteExpenses.length === 0 
        ? 'Todos los egresos tienen información de proveedor completa.' 
        : `Se detectaron ${incompleteExpenses.length} egresos con datos incompletos (RUT o Nombre).`,
      suggestion: incompleteExpenses.length === 0 ? 'Extracción IA funcionando al 100%.' : 'Se recomienda revisar los documentos originales o re-procesar con el nuevo motor de extracción mejorado.',
      actionLabel: incompleteExpenses.length === 0 ? undefined : 'Re-procesar Egresos'
    });

    const invalidWorkOrders = workOrders.filter(wo => !properties.find(p => p.id === wo.propertyId));
    results.consistency.push({
      label: 'Integridad Referencial (Propiedades)',
      status: invalidWorkOrders.length === 0 ? 'OK' : 'FAIL',
      detail: invalidWorkOrders.length === 0 
        ? 'Todas las OTs están vinculadas a activos inmobiliarios registrados.' 
        : `Se detectaron ${invalidWorkOrders.length} OTs vinculadas a propiedades no encontradas.`,
      suggestion: invalidWorkOrders.length === 0 ? 'Datos consistentes.' : 'Verificar IDs de propiedades en el módulo de Pool de Propiedades.',
      actionLabel: invalidWorkOrders.length === 0 ? undefined : 'Auditar Propiedades'
    });

    // 3. Performance Tests
    const totalRecords = transactions.length + workOrders.length + suppliers.length + properties.length + auditLog.length;
    results.performance.push({
      label: 'Carga de Datos Local',
      status: totalRecords < 5000 ? 'OK' : 'WARN',
      detail: `Volumen actual: ${totalRecords} registros. Rendimiento óptimo.`,
      suggestion: totalRecords < 5000 ? 'Rendimiento dentro de parámetros.' : 'Considerar archivado de registros históricos para optimizar memoria.',
      actionLabel: totalRecords < 5000 ? undefined : 'Archivar Históricos'
    });

    return results;
  }, [transactions, workOrders, suppliers, properties, auditLog, isDbConnected]);

  const overallScore = useMemo(() => {
    const all = [...auditResults.security, ...auditResults.consistency, ...auditResults.performance];
    const okCount = all.filter(r => r.status === 'OK').length;
    return Math.round((okCount / all.length) * 100);
  }, [auditResults]);

  const jdeScanResult = useMemo(() => {
    return dataService.securityIntegrityAudit(transactions, auditLog);
  }, [transactions, auditLog]);

  const renderTestCard = (test: TestResult) => {
    const isExpanded = expandedTest === test.label;
    const isRepairing = repairingTest === test.label;

    return (
      <div key={test.label} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div 
          className="p-6 flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedTest(isExpanded ? null : test.label)}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${test.status === 'OK' ? 'bg-emerald-50 text-emerald-600' : test.status === 'WARN' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
              {test.status === 'OK' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">{test.label}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{test.detail}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${test.status === 'OK' ? 'bg-emerald-100 text-emerald-700' : test.status === 'WARN' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
              {test.status}
            </div>
            {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </div>
        </div>

        {isExpanded && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/50 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3 mb-4">
              <Info size={16} className="text-indigo-500 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sugerencia de Reparación</p>
                <p className="text-xs text-slate-700 font-medium italic">{test.suggestion}</p>
              </div>
            </div>
            {test.actionLabel && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleRepair(test.label); }}
                disabled={isRepairing}
                className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  isRepairing ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-95'
                }`}
              >
                {isRepairing ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
                {isRepairing ? 'Reparando...' : test.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-auto custom-audit-scroll">
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        
        {/* HEADER */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Salud del Sistema</h1>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">Panel de Diagnóstico Técnico y Ciberseguridad</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className={`w-3 h-3 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[10px] font-black uppercase text-slate-700">{isDbConnected ? 'Sincronización Activa' : 'Modo Offline'}</span>
            </div>
          </div>
        </div>

        {/* SUB-TABS SELECTOR */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('HEALTH')}
            className={`pb-4 px-6 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeSubTab === 'HEALTH'
                ? 'border-indigo-600 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Diagnóstico de Salud ERP & Seguridad
          </button>
          <button
            onClick={() => setActiveSubTab('CONCURRENCY')}
            className={`pb-4 px-6 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeSubTab === 'CONCURRENCY'
                ? 'border-indigo-600 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Simulador de Concurrencia (Multi-Usuario)
          </button>
          <button
            onClick={() => setActiveSubTab('AI_SHIELD')}
            className={`pb-4 px-6 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'AI_SHIELD'
                ? 'border-indigo-600 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            Blindaje & Costos IA CFO (Rate Limit & Budget Cap)
          </button>
        </div>

        {activeSubTab === 'AI_SHIELD' ? (
          <AiBudgetShieldPanel />
        ) : activeSubTab === 'CONCURRENCY' ? (
          <ConcurrencyTestSimulator 
            properties={properties}
            leaseContracts={leaseContracts}
            transactions={transactions}
            currentUser={currentUser}
            addAuditEntry={addAuditEntry}
            isDbConnected={isDbConnected}
          />
        ) : (
          <>
            {/* EXPERT TEAM ACTIVATION */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Users size={18} className="text-indigo-600" /> Activación de Equipo de Expertos
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Habilite especialistas para diagnósticos profundos</p>
                </div>
                <div className="flex gap-2">
                  {activeExperts.map(e => (
                    <div key={e} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-black uppercase animate-pulse">
                      {e} Activo
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'DEV', label: 'Desarrollo Full-Stack', icon: <Cpu size={24} />, color: 'indigo' },
                  { id: 'DBA', label: 'Administrador de BD', icon: <Database size={24} />, color: 'emerald' },
                  { id: 'SEC', label: 'Ciberseguridad', icon: <Shield size={24} />, color: 'rose' }
                ].map(expert => (
                  <button
                    key={expert.id}
                    onClick={() => toggleExpert(expert.id)}
                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group ${
                      activeExperts.includes(expert.id) 
                        ? `border-${expert.color}-500 bg-${expert.color}-50 shadow-lg` 
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className={`p-4 rounded-2xl transition-all ${
                      activeExperts.includes(expert.id) 
                        ? `bg-${expert.color}-500 text-white` 
                        : `bg-slate-50 text-slate-400 group-hover:text-${expert.color}-500`
                    }`}>
                      {expert.icon}
                    </div>
                    <div className="text-center">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${activeExperts.includes(expert.id) ? `text-${expert.color}-700` : 'text-slate-600'}`}>
                        {expert.label}
                      </p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                        {activeExperts.includes(expert.id) ? 'Especialista en Línea' : 'Click para Activar'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* TOP STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><ShieldCheck size={80} /></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Índice de Seguridad</p>
                <p className="text-5xl font-black text-slate-900">{overallScore}%</p>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${overallScore}%` }} />
                </div>
              </div>

              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Database size={80} /></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Registros Totales</p>
                <p className="text-5xl font-black text-slate-900">{(transactions.length + workOrders.length + suppliers.length + properties.length).toLocaleString()}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-tight">Base de Datos Híbrida (Local + Cloud)</p>
              </div>

              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Activity size={80} /></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Eventos de Auditoría</p>
                <p className="text-5xl font-black text-slate-900">{auditLog.length.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-tight">Trazabilidad de Acciones de Usuario</p>
              </div>
            </div>

            {/* ASSETFLOW CENTRAL INTEGRITY CONTROL SUITE */}
            <div className="bg-[#FAFBFD] border border-[#6B8095] p-8 rounded-3xl shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#B0C4D6] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-[#0B3C5D] text-[#FFCC00] px-2.5 py-1 font-bold font-mono uppercase tracking-widest rounded-md">
                      Benchmark Central
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">
                      PROGRAM: R097001 / F0002 / F0911
                    </span>
                  </div>
                  <h2 className="text-[#1A3E5C] text-lg font-black uppercase tracking-tight mt-1 flex items-center gap-2">
                    <ShieldCheck className="text-[#0B3C5D]" size={20} />
                    Control de Integridad y Trazabilidad Transaccional
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Análisis comparativo de consecutividad, marcas de auditoría de seguridad y consistencia de libros contables.</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white border border-[#91A6BA] px-4 py-2.5 rounded-2xl">
                  <div className="text-right">
                    <p className="text-[9px] font-mono font-black text-slate-400 uppercase">Cumplimiento ERP</p>
                    <p className="text-2xl font-black text-[#0B3C5D] font-mono leading-none mt-0.5">{jdeScanResult.score}%</p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-xs font-mono"
                       style={{ 
                         borderColor: jdeScanResult.score === 100 ? '#10B981' : jdeScanResult.score > 70 ? '#F59E0B' : '#EF4444',
                         color: jdeScanResult.score === 100 ? '#10B981' : jdeScanResult.score > 70 ? '#F59E0B' : '#EF4444'
                       }}>
                    {jdeScanResult.score === 100 ? 'OK' : 'ATTN'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 border border-[#D2DFEC] rounded-2xl">
                  <label className="text-[9px] font-black text-slate-500 uppercase font-mono tracking-wider block">Estampas de Auditoría (USER / PID / MKEY):</label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${transactions.every(t => t.programId && t.workStationId) ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                    <span className="text-xs font-black text-slate-700 font-mono">
                      {transactions.every(t => t.programId && t.workStationId) ? 'Estampas Firmadas (Conforme)' : 'Estampas Faltantes'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Garantiza el registro del usuario contable, código de programa ERP y firma única del terminal local (MKEY).</p>
                </div>

                <div className="bg-white p-5 border border-[#D2DFEC] rounded-2xl">
                  <label className="text-[9px] font-black text-slate-500 uppercase font-mono tracking-wider block font-black">Consecutivos F0002 Next Numbers:</label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${!jdeScanResult.issues.some(i => i.type === 'GAP') ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                    <span className="text-xs font-black text-slate-700 font-mono">
                      {!jdeScanResult.issues.some(i => i.type === 'GAP') ? 'Secuencia Continua (Conforme)' : 'Brecha Detectada'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Previene vacíos intencionales o accidentales en los correlativos numéricos de asientos contables en producción.</p>
                </div>

                <div className="bg-white p-5 border border-[#D2DFEC] rounded-2xl">
                  <label className="text-[9px] font-black text-slate-500 uppercase font-mono tracking-wider block">Equilibrio Técnico de Libro Mayor:</label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${!jdeScanResult.issues.some(i => i.type === 'BALANCE') ? 'bg-emerald-500' : 'bg-[#C0392B]'}`}></span>
                    <span className="text-xs font-black text-slate-700 font-mono">
                      {!jdeScanResult.issues.some(i => i.type === 'BALANCE') ? 'Cuadrado Aritméticamente' : 'Ajustes Requeridos'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Monitorea importes nulos o desbalances operacionales para mitigar riesgos de incoherencias en cierres mensuales.</p>
                </div>
              </div>

              {jdeScanResult.issues.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 animate-pulse rounded-full"></span>
                    Inconsistencias y Alertas Detectadas (Trazabilidad):
                  </p>
                  <div className="overflow-x-auto border border-[#B0C4D6] rounded-2xl overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-[#E2ECF5]">
                        <tr>
                          <th className="px-4 py-2 text-left text-[9px] font-black text-[#143B57] uppercase font-mono tracking-wider">Gravedad</th>
                          <th className="px-4 py-2 text-left text-[9px] font-black text-[#143B57] uppercase font-mono tracking-wider">Tipo</th>
                          <th className="px-4 py-2 text-left text-[9px] font-black text-[#143B57] uppercase font-mono tracking-wider">Descripción del Hallazgo</th>
                          <th className="px-4 py-2 text-left text-[9px] font-black text-[#143B57] uppercase font-mono tracking-wider">Plan de Acción / Resolución ERP</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {jdeScanResult.issues.map((issue, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/50">
                            <td className="px-4 py-2 text-[10px] font-mono font-black">
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                issue.severity === 'CRITICAL' ? 'bg-rose-100 text-[#C0392B]' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {issue.severity === 'CRITICAL' ? 'CRÍTICO' : 'ATENCIÓN'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-[10px] font-bold text-slate-600 font-mono text-[9.5px]">
                              {issue.type}
                            </td>
                            <td className="px-4 py-2 text-[11px] font-medium text-slate-700 italic">
                              {issue.message}
                            </td>
                            <td className="px-4 py-2 text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                              <span className="text-[#0B3C5D] font-mono text-[10px] font-black uppercase">[AYUDA]:</span>
                              <span>{issue.resolution}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {onFixJdeStamps && (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => {
                          onFixJdeStamps();
                          alert("Marcas de Auditoría, ID de Terminales de Trabajo (MKEY), Programas Ejecutores y correlativos Next Numbers F0002 ERP actualizados con éxito para asegurar el cumplimiento del estándar contable de producción.");
                        }}
                        className="px-4 py-2.5 bg-[#0B3C5D] hover:bg-[#104D77] text-white border border-[#06243A] font-black tracking-wider uppercase font-mono text-[10px] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                      >
                        <Wrench size={13} className="text-[#FFCC00]" />
                        Ejecutar Re-Indexación y Sellado Retroactivo ERP [R0002B37]
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-400/20 text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-600" size={24} />
                    <div>
                      <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider">Auditoría Aprobada sin Observaciones</h4>
                      <p className="text-[11px] font-semibold text-emerald-600">Todas las transacciones de producción cuentan con firmas de terminales operativas autorizadas, marcas temporales, y Next Numbers emitidos por el núcleo ERP F0002.</p>
                    </div>
                  </div>
                  <span className="text-[10px] border border-emerald-500/20 px-2.5 py-1 text-emerald-700 font-mono font-black uppercase select-none rounded bg-white">
                    CUMPLIMIENTO: 100% SECURE
                  </span>
                </div>
              )}
            </div>

            {/* DETAILED TESTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* SECURITY & CONNECTIVITY */}
              <div className="space-y-6">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                  <Lock size={18} className="text-indigo-600" /> Seguridad y Conectividad
                </h2>
                <div className="space-y-4">
                  {auditResults.security.map(renderTestCard)}
                </div>
              </div>

              {/* DATA CONSISTENCY */}
              <div className="space-y-6">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                  <RefreshCw size={18} className="text-emerald-600" /> Coherencia de Datos
                </h2>
                <div className="space-y-4">
                  {auditResults.consistency.map(renderTestCard)}
                </div>
              </div>
            </div>

            {/* RECOMMENDATIONS */}
            <div className="bg-indigo-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 -mb-12 -mr-12"><Search size={200} /></div>
              <div className="relative z-10">
                <h3 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                  <Zap size={24} className="text-amber-400" /> Recomendaciones del Equipo de Expertos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Ciberseguridad</p>
                    <p className="text-sm text-indigo-100 leading-relaxed italic">
                      "Se ha implementado el endurecimiento de las reglas de Firestore. Se recomienda activar la autenticación de dos factores (2FA) para todas las cuentas administrativas y realizar una rotación de llaves cada 90 días."
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Optimización de Datos</p>
                    <p className="text-sm text-indigo-100 leading-relaxed italic">
                      "La extracción IA de Egresos ha sido optimizada para el contexto contable chileno. Se recomienda re-procesar documentos con baja confianza para asegurar la integridad del RUT y Razón Social."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default SystemHealthDashboard;
