import React, { useState, useEffect } from 'react';
import { aiShield, AIShieldConfig, AIShieldStats } from '../lib/aiShieldMiddleware';
import { Shield, ShieldAlert, ShieldCheck, DollarSign, Activity, AlertTriangle, Power, RefreshCw, Zap, Cpu, Lock, CheckCircle2 } from 'lucide-react';

export const AiBudgetShieldPanel: React.FC = () => {
  const [config, setConfig] = useState<AIShieldConfig>(aiShield.getConfig());
  const [stats, setStats] = useState<AIShieldStats>(aiShield.getStats());
  const [editingBudget, setEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(config.monthlyBudgetCapUSD.toString());
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(aiShield.getStats());
      setConfig(aiShield.getConfig());
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleToggleKillSwitch = () => {
    const newStatus = aiShield.toggleKillSwitch();
    setConfig(aiShield.getConfig());
    setStats(aiShield.getStats());
  };

  const handleSaveBudget = () => {
    const val = parseFloat(tempBudget);
    if (!isNaN(val) && val > 0) {
      aiShield.updateConfig({ monthlyBudgetCapUSD: val });
      setConfig(aiShield.getConfig());
      setEditingBudget(false);
    }
  };

  const handleToggleDowngrade = () => {
    aiShield.updateConfig({ forceModelDowngrade: !config.forceModelDowngrade });
    setConfig(aiShield.getConfig());
  };

  const handleResetStats = () => {
    if (window.confirm("¿Está seguro de reiniciar los contadores mensuales de consumo de IA?")) {
      aiShield.resetMonthlyStats();
      setStats(aiShield.getStats());
    }
  };

  const handleRunStressSimulation = async () => {
    setIsSimulating(true);
    setSimulationLog(["Iniciando simulación de ráfaga masiva de 20 peticiones a la API de IA..."]);

    let blockedCount = 0;
    let allowedCount = 0;

    for (let i = 1; i <= 20; i++) {
      try {
        await aiShield.executeWithGuard(
          { modelName: 'gemini-2.5-flash', actionDescription: `Petición Simulación #${i}` },
          async (model) => {
            // Simulamos latencia reducida
            await new Promise(r => setTimeout(r, 80));
            return { status: "OK", modelUsed: model };
          }
        );
        allowedCount++;
        setSimulationLog(prev => [`[✅ APROBADA #${i}] Petición procesada bajo límites de cuota`, ...prev]);
      } catch (err: any) {
        blockedCount++;
        setSimulationLog(prev => [`[⛔ BLOQUEADA #${i}] ${err.message}`, ...prev]);
      }
    }

    setSimulationLog(prev => [
      `--- RESULTADO DE LA PRUEBA DE BLINDAJE ---`,
      `Aprobadas: ${allowedCount} | Bloqueadas preventivamente: ${blockedCount}`,
      ...prev
    ]);
    setIsSimulating(false);
    setStats(aiShield.getStats());
  };

  const percentBudgetUsed = Math.min(100, (stats.totalCostUSDMonth / config.monthlyBudgetCapUSD) * 100);

  return (
    <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm text-slate-900">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${config.isKillSwitchActive ? 'bg-red-50 text-red-700 border border-red-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-300'}`}>
            {config.isKillSwitchActive ? <ShieldAlert className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">Middleware de Blindaje & Costos de IA</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-900 font-mono font-bold border border-indigo-200">
                Rate-Limit & Budget Guard v1.0
              </span>
            </div>
            <p className="text-sm text-slate-600 font-medium">
              Protección anti-picos de consumo en Gemini, rate-limiting por tenant y presupuesto bloqueante para la CFO.
            </p>
          </div>
        </div>

        {/* Botón de Parada de Emergencia (CFO Kill-Switch) */}
        <button
          id="cfo-kill-switch-btn"
          onClick={handleToggleKillSwitch}
          className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm ${
            config.isKillSwitchActive
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200 animate-pulse'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
          }`}
        >
          <Power className="w-5 h-5" />
          {config.isKillSwitchActive ? 'DESACTIVAR PARADA DE EMERGENCIA' : 'ACTIVAR PARADA DE EMERGENCIA CFO'}
        </button>
      </div>

      {/* Alerta si KillSwitch activo */}
      {config.isKillSwitchActive && (
        <div className="mt-6 bg-red-50 border-2 border-red-400 rounded-xl p-4 flex items-center gap-3 text-red-950 font-medium shadow-xs">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <div className="font-black text-sm">PARADA DE EMERGENCIA CFO ACTIVADA</div>
            <div className="text-xs text-red-800 font-semibold">
              Todas las peticiones entrantes a modelos Gemini están bloqueadas en la capa intermedia antes de consumir la API.
            </div>
          </div>
        </div>
      )}

      {/* Grid de Metricas Clave */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        {/* Card Presupuesto Mensual */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold mb-1">
            <span>Presupuesto Mensual (CFO Cap)</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 font-mono">
              ${stats.totalCostUSDMonth.toFixed(3)}
            </span>
            <span className="text-xs text-slate-600 font-mono font-bold">
              / ${config.monthlyBudgetCapUSD.toFixed(2)} USD
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3 border border-slate-300/60">
            <div
              className={`h-full transition-all duration-500 ${
                percentBudgetUsed >= 90
                  ? 'bg-red-600'
                  : percentBudgetUsed >= 70
                  ? 'bg-amber-600'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${percentBudgetUsed}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-600 font-bold mt-2">
            <span>Consumido: {percentBudgetUsed.toFixed(1)}%</span>
            {!editingBudget ? (
              <button
                id="edit-budget-cap-btn"
                onClick={() => setEditingBudget(true)}
                className="text-indigo-700 hover:text-indigo-900 font-bold underline"
              >
                Ajustar Cap
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={tempBudget}
                  onChange={(e) => setTempBudget(e.target.value)}
                  className="w-16 bg-white border border-slate-300 text-slate-900 text-xs px-1.5 py-0.5 rounded shadow-xs focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={handleSaveBudget} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-xs">
                  Guardar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card Peticiones Mensuales */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold mb-1">
            <span>Peticiones Totales (Mes)</span>
            <Activity className="w-4 h-4 text-sky-700" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {stats.totalRequestsMonth}
          </div>
          <div className="text-xs text-slate-600 font-medium mt-2">
            Peticiones exitosas bajo supervisión
          </div>
        </div>

        {/* Card Tokens Totales */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold mb-1">
            <span>Tokens Consumidos</span>
            <Cpu className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {(stats.inputTokensMonth + stats.outputTokensMonth).toLocaleString()}
          </div>
          <div className="flex justify-between text-[11px] text-slate-600 font-semibold mt-2">
            <span>In: {stats.inputTokensMonth.toLocaleString()}</span>
            <span>Out: {stats.outputTokensMonth.toLocaleString()}</span>
          </div>
        </div>

        {/* Card Peticiones Bloqueadas */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold mb-1">
            <span>Bloqueos de Seguridad</span>
            <Lock className="w-4 h-4 text-amber-700" />
          </div>
          <div className={`text-2xl font-black font-mono mt-1 ${stats.blockedRequestsCount > 0 ? 'text-amber-800' : 'text-slate-800'}`}>
            {stats.blockedRequestsCount}
          </div>
          <div className="text-[11px] text-slate-600 font-medium mt-2 truncate" title={stats.lastBlockedReason || 'Sin bloqueos'}>
            Último: {stats.lastBlockedReason || 'Ninguno'}
          </div>
        </div>
      </div>

      {/* Configuraciones de Rate Limiting y Downgrade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Parámetros de Tasa */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 shadow-xs">
          <h3 className="font-black text-slate-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
            <Zap className="w-4 h-4 text-amber-600" />
            Límites Operativos de Rate-Limiting
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <span className="text-slate-700 font-medium">Límite por Tenant (Empresa):</span>
              <span className="font-mono font-bold text-indigo-950 bg-indigo-100/80 px-2.5 py-1 rounded border border-indigo-300">
                {config.maxRequestsPerMinTenant} req / minuto
              </span>
            </li>
            <li className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <span className="text-slate-700 font-medium">Límite por Usuario Individual:</span>
              <span className="font-mono font-bold text-indigo-950 bg-indigo-100/80 px-2.5 py-1 rounded border border-indigo-300">
                {config.maxRequestsPerMinUser} req / minuto
              </span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-700 font-medium">Operaciones Simultáneas Máximas:</span>
              <span className="font-mono font-bold text-indigo-950 bg-indigo-100/80 px-2.5 py-1 rounded border border-indigo-300">
                {config.maxConcurrentOps} paralelas
              </span>
            </li>
          </ul>
        </div>

        {/* Optimización de Modelos & Reset */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 shadow-xs">
          <h3 className="font-black text-slate-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            Estrategia de Optimización de Costos
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-900 font-bold">Forzar Redirección Inteligente (Smart Downgrade)</div>
                <div className="text-xs text-slate-600 font-medium">Redirige solicitudes masivas de Pro a Flash (Ahorro del 95%)</div>
              </div>
              <button
                onClick={handleToggleDowngrade}
                className={`w-12 h-6 rounded-full transition-colors relative p-1 ${config.forceModelDowngrade ? 'bg-emerald-600' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${config.forceModelDowngrade ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-semibold">Reiniciar contadores de consumo del mes actual:</span>
              <button
                onClick={handleResetStats}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center gap-1.5 border border-slate-300 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Resetear Mes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Banco de Pruebas de Estrés en Vivo */}
      <div className="mt-6 bg-slate-50 border border-slate-300 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4 text-sky-700" />
              Simulador de Carga Masiva y Prueba de Blindaje Anti-Spike
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Ejecuta una ráfaga inmediata para verificar la interceptación del middleware en tiempo real.
            </p>
          </div>
          <button
            id="run-ai-shield-stress-test-btn"
            onClick={handleRunStressSimulation}
            disabled={isSimulating}
            className="px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
          >
            {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {isSimulating ? 'Simulando Ráfaga...' : 'Ejecutar Prueba de Blindaje'}
          </button>
        </div>

        {/* Consola de Simulación */}
        {simulationLog.length > 0 && (
          <div className="bg-white border border-slate-300 rounded-lg p-3.5 max-h-48 overflow-y-auto font-mono text-xs text-slate-800 space-y-1.5 shadow-inner">
            {simulationLog.map((log, idx) => (
              <div
                key={idx}
                className={
                  log.includes('⛔')
                    ? 'text-red-700 font-bold bg-red-50/60 px-2 py-0.5 rounded border border-red-200'
                    : log.includes('✅')
                    ? 'text-emerald-800 font-bold bg-emerald-50/60 px-2 py-0.5 rounded border border-emerald-200'
                    : 'text-indigo-950 font-bold bg-indigo-50/60 px-2 py-0.5 rounded border border-indigo-200'
                }
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
