import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Clock, Shield, Sliders, DollarSign, 
  Download, HelpCircle, FileText, AlertTriangle, Calendar, RefreshCw, 
  Info, ArrowRight, CheckCircle2, ChevronRight, Activity, Zap
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, BarChart, Bar, ReferenceLine 
} from 'recharts';
import { Transaction, LeaseContract, WorkOrder, Property } from '../types';
import { exportTech10PeriodCashFlowToExcel } from '../lib/excelExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JDEGridContextMenu } from './JDEGridContextMenu';

interface CashFlowRunwayProps {
  transactions: Transaction[];
  leaseContracts: LeaseContract[];
  workOrders: WorkOrder[];
  properties: Property[];
}

export const CashFlowRunwayModule: React.FC<CashFlowRunwayProps> = ({
  transactions = [],
  leaseContracts = [],
  workOrders = [],
  properties = []
}) => {
  // --- STATE ---
  const [initialCashInput, setInitialCashInput] = useState<string>('15000000'); // Initial cash default $15.000.000 CLP
  const [growthAdjustment, setGrowthAdjustment] = useState<number>(0); // -50% to +100% adjustment on projected income
  const [expenseInflation, setExpenseInflation] = useState<number>(0); // 0% to +50% budget inflation/contingency on expenses
  const [includeActiveLeases, setIncludeActiveLeases] = useState<boolean>(true); // cross with lease contracts
  const [includePendingWorkOrders, setIncludePendingWorkOrders] = useState<boolean>(true); // cross with pending work orders
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'SCENARIOS' | 'TABLE'>('CONSOLE');
  
  // AssetFlow Enterprise Grid Context Menu State (P09220)
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    row: any;
  } | null>(null);

  const handleRowContextMenu = (e: React.MouseEvent, row: any) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const clickX = e?.clientX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const clickY = e?.clientY ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 300);

    setGridContextMenu({
      x: Math.max(10, Math.min(clickX, typeof window !== 'undefined' ? window.innerWidth - 240 : 800)),
      y: Math.max(10, Math.min(clickY, typeof window !== 'undefined' ? window.innerHeight - 380 : 500)),
      row
    });
  };

  // Scenario Simulator Inputs
  const [stressTestMode, setStressTestMode] = useState<boolean>(false);
  const [investmentDay, setInvestmentDay] = useState<number>(45);
  const [investmentAmount, setInvestmentAmount] = useState<string>('0');
  const [financingDay, setFinancingDay] = useState<number>(30);
  const [financingAmount, setFinancingAmount] = useState<string>('0');

  // --- MATH CALCULATION ENGINE ---
  const initialCash = useMemo(() => {
    const val = parseFloat(initialCashInput.replace(/[^0-9.-]+/g, ''));
    return isNaN(val) ? 0 : val;
  }, [initialCashInput]);

  const rawInvestment = useMemo(() => {
    const val = parseFloat(investmentAmount.replace(/[^0-9.-]+/g, ''));
    return isNaN(val) ? 0 : val;
  }, [investmentAmount]);

  const rawFinancing = useMemo(() => {
    const val = parseFloat(financingAmount.replace(/[^0-9.-]+/g, ''));
    return isNaN(val) ? 0 : val;
  }, [financingAmount]);

  // Compute transactional core variables
  const analysisCore = useMemo(() => {
    // Current completed Transactions (past 90 days or total)
    const incomeTxs = transactions.filter(t => t.type === 'INCOME' && t.status !== 'ANULADA');
    const expenseTxs = transactions.filter(t => t.type === 'EXPENSE' && t.status !== 'ANULADA');

    // Aggregate values
    const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

    // Calculate baseline Monthly average (using last 3 months of completed state or fallback defaults)
    const monthlyAvgIncome = incomeTxs.length > 0 ? (totalIncome / Math.max(1, Math.min(3, incomeTxs.length / 5))) : 4200000;
    const monthlyAvgExpense = expenseTxs.length > 0 ? (totalExpense / Math.max(1, Math.min(3, expenseTxs.length / 5))) : 3800000;

    // Projected 30-60-90 structure
    // Income side: Active Leases (VIGENTE arriendos represent contracted future recurring incomes)
    const activeVigenteLeases = leaseContracts.filter(c => c.status === 'VIGENTE');
    const monthlyLeaseRevenue = activeVigenteLeases.reduce((sum, c) => sum + c.monthlyAmount, 0);

    // Expense side: Approved work orders that are unpaid/active represent committed future expenses
    const pendingWorkOrders = workOrders.filter(w => 
      w.status === 'APROBADA' || 
      w.status === 'RECEPCIONADA_PARCIAL' || 
      w.status === 'RECEPCIONADA'
    );
    const totalCommittedWOExpenses = pendingWorkOrders.reduce((sum, w) => sum + w.total, 0);

    return {
      monthlyAvgIncome,
      monthlyAvgExpense,
      monthlyLeaseRevenue,
      totalCommittedWOExpenses,
      activeLeaseCount: activeVigenteLeases.length,
      pendingWOCount: pendingWorkOrders.length
    };
  }, [transactions, leaseContracts, workOrders]);

  // Build the granular 90-day time matrix (Days: 0, 15, 30, 45, 60, 75, 90)
  const projectionMatrix = useMemo(() => {
    const daysArr = [0, 15, 30, 45, 60, 75, 90];
    
    // Average daily values from transaction ledger
    const baseDailyIncome = (analysisCore.monthlyAvgIncome / 30);
    const baseDailyExpense = (analysisCore.monthlyAvgExpense / 30);

    // Dynamic factors
    const incomeGrowthMultiplier = 1 + (growthAdjustment / 100);
    const expenseInflationMultiplier = 1 + (expenseInflation / 100);
    const stressTestMultiplier = stressTestMode ? 0.70 : 1.0; // drops income by 30%

    // Cumulative calculations
    let currentBalance = initialCash;
    let accumulatedIncome = 0;
    let accumulatedExpense = 0;

    return daysArr.map((day) => {
      if (day === 0) {
        return {
          dayLabel: `Día ${day}`,
          dayValue: day,
          projectedCash: currentBalance,
          incomeScheduled: 0,
          expenseScheduled: 0,
          netFlow: 0,
          contractsRevenue: 0,
          workOrdersCost: 0,
          stressDeficit: 0,
          hasDepletion: currentBalance <= 0
        };
      }

      const daysStep = 15; // gap between nodes

      // 1. Transactional Income projections
      let incomeStep = baseDailyIncome * daysStep * incomeGrowthMultiplier * stressTestMultiplier;
      
      // Dynamic cross validation: Leases
      let leaseAddon = 0;
      if (includeActiveLeases) {
        // Contract receipts typically clear on Day 5-10 and Day 35-40, let's associate them at Day 30, Day 60, Day 90
        if (day === 30 || day === 60 || day === 90) {
          leaseAddon = analysisCore.monthlyLeaseRevenue;
        }
      }

      // 2. Transactional Expense projections
      let expenseStep = baseDailyExpense * daysStep * expenseInflationMultiplier;

      // Dynamic cross validation: committed Work Orders
      let woAddon = 0;
      if (includePendingWorkOrders) {
        // Distribute committed WO expenses evenly over the first 45 days
        if (day <= 45) {
          woAddon = analysisCore.totalCommittedWOExpenses / 3; // split into Day 15, 30, 45
        }
      }

      // Combined cash generation and usage
      const totalIncomeStep = incomeStep + leaseAddon;
      const totalExpenseStep = expenseStep + woAddon;

      // Scenario Infusions
      let extraInflow = 0;
      let extraOutflow = 0;

      if (day === financingDay && rawFinancing > 0) {
        extraInflow = rawFinancing;
      }
      if (day === investmentDay && rawInvestment > 0) {
        extraOutflow = rawInvestment;
      }

      accumulatedIncome += totalIncomeStep + extraInflow;
      accumulatedExpense += totalExpenseStep + extraOutflow;
      currentBalance = initialCash + accumulatedIncome - accumulatedExpense;

      const netFlow = (totalIncomeStep + extraInflow) - (totalExpenseStep + extraOutflow);

      return {
        dayLabel: `Día ${day}`,
        dayValue: day,
        projectedCash: Math.round(Math.max(0, currentBalance)),
        incomeScheduled: Math.round(totalIncomeStep + extraInflow),
        expenseScheduled: Math.round(totalExpenseStep + extraOutflow),
        netFlow: Math.round(netFlow),
        contractsRevenue: Math.round(leaseAddon),
        workOrdersCost: Math.round(woAddon),
        hasDepletion: currentBalance <= 0
      };
    });
  }, [
    initialCash, growthAdjustment, expenseInflation, includeActiveLeases, 
    includePendingWorkOrders, analysisCore, stressTestMode, 
    investmentDay, rawInvestment, financingDay, rawFinancing
  ]);

  // General KPIs and safety parameters
  const kpiData = useMemo(() => {
    const d90 = projectionMatrix[projectionMatrix.length - 1];
    const finalCash90Days = d90.projectedCash;
    
    // Average Monthly Net Burn = (Sum of Scheduled expenses - Sum of Scheduled incomes) in 90 days divided by 3
    const totalProjIncomes = projectionMatrix.reduce((sum, item) => sum + item.incomeScheduled, 0);
    const totalProjExpenses = projectionMatrix.reduce((sum, item) => sum + item.expenseScheduled, 0);
    const netMothlyBurn = Math.max(0, (totalProjExpenses - totalProjIncomes) / 3);

    // Days representation of Runway
    const runwayDays = netMothlyBurn > 0 ? Math.round((initialCash / netMothlyBurn) * 30) : 999;
    
    // Determine depletion point
    let depletionDay: number | null = null;
    for (const item of projectionMatrix) {
      if (item.projectedCash <= 0 && item.dayValue > 0) {
        depletionDay = item.dayValue;
        break;
      }
    }

    let statusSeverity: 'SUCCESS' | 'WARNING' | 'DANGER' = 'SUCCESS';
    if (runwayDays <= 45 || depletionDay !== null) {
      statusSeverity = 'DANGER';
    } else if (runwayDays <= 90) {
      statusSeverity = 'WARNING';
    }

    return {
      runwayDays,
      monthlyBurn: Math.round(netMothlyBurn),
      depletionDay,
      finalCash: finalCash90Days,
      statusSeverity,
      totalProjIncomes: Math.round(totalProjIncomes),
      totalProjExpenses: Math.round(totalProjExpenses)
    };
  }, [projectionMatrix, initialCash]);

  // Export Executive Consolidated Cash Flow PDF report
  const exportExecutiveReport = () => {
    const doc = new jsPDF('p', 'mm', 'letter');
    
    // Title Banner
    doc.setFillColor(15, 23, 42); // slate 900
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('CONSOLIDADO DE CASH FLOW & RUNWAY ACTIVO', 15, 18);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Informe Corporativo ERP · Licencia AssetFlow · Generado: ${new Date().toLocaleDateString()}`, 15, 26);
    doc.text('ANÁLISIS PROYECTADO A 30, 60 Y 90 DÍAS', 15, 31);
    
    // Summary Columns
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.text('1. Estado General de Liquidez', 15, 52);
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Efectivo Inicial: $${initialCash.toLocaleString('es-CL')} CLP`, 15, 60);
    doc.text(`Efectivo Proyectado a 90 d: $${kpiData.finalCash.toLocaleString('es-CL')} CLP`, 15, 66);
    doc.text(`Tasa de Consumo Mensual (Burn Rate): $${kpiData.monthlyBurn.toLocaleString('es-CL')} CLP/mes`, 15, 72);
    
    let runwayText = '';
    if (kpiData.runwayDays === 999) {
      runwayText = 'Estable / Flujo de efectivo positivo (+90 días)';
    } else {
      runwayText = `${kpiData.runwayDays} días de Runway disponible`;
    }
    doc.text(`Runway Estimado: ${runwayText}`, 15, 78);
    
    if (kpiData.depletionDay) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('Helvetica', 'bold');
      doc.text(`¡ALERTA!: Quiebra proyectada el Día ${kpiData.depletionDay}`, 15, 84);
    } else {
      doc.setTextColor(22, 163, 74);
      doc.setFont('Helvetica', 'bold');
      doc.text('SITUACIÓN: Capacidad de liquidez estable para el período analizado.', 15, 84);
    }
    
    // Cross variables
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Compilación y Cruce de Datos Reales (Sistema Central):', 15, 96);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`- Contratos de Arriendo Activos cruzados: ${analysisCore.activeLeaseCount} unidades (+$${analysisCore.monthlyLeaseRevenue.toLocaleString('es-CL')} CLP/mes)`, 15, 102);
    doc.text(`- Órdenes de Trabajo Comprometidas cruzadas: ${analysisCore.pendingWOCount} OT (-$${analysisCore.totalCommittedWOExpenses.toLocaleString('es-CL')} CLP acumulados)`, 15, 107);
    doc.text(`- Margen de Crecimiento Aplicado: ${growthAdjustment}%  |  Margen de inflación de gastos: ${expenseInflation}%`, 15, 112);
    
    // Tables
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.text('2. Matriz de Proyección Temporal', 15, 125);
    
    const tableBody = projectionMatrix.map(row => [
      row.dayLabel,
      `$${row.projectedCash.toLocaleString('es-CL')}`,
      `+$${row.incomeScheduled.toLocaleString('es-CL')}`,
      `-$${row.expenseScheduled.toLocaleString('es-CL')}`,
      `$${row.netFlow.toLocaleString('es-CL')}`
    ]);

    autoTable(doc, {
      startY: 130,
      head: [['Período', 'Saldos Proyectados', 'Entradas Proyectadas', 'Salidas Proyectadas', 'Flujo Neto']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { fontStyle: 'bold' }
      }
    });

    // Recommendations Section
    const nextY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.text('3. Recomendaciones y Acciones de Mitigación', 15, nextY);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    let recommendationLines = [];
    if (kpiData.statusSeverity === 'DANGER' || kpiData.depletionDay !== null) {
      recommendationLines = [
        '1. Adelantar cobros de contratos vigentes ofreciendo descuentos tempranos de un 1.5%.',
        '2. Ajustar órdenes de trabajo técnicas no urgentes o reprogramarlas para después del día 60.',
        '3. Inyectar capital o solicitar línea de crédito corporativa inmediata para mitigar brechas de capital.',
        '4. Suspender transacciones o inversiones que impacten el flujo neto antes de consolidar recaudación.'
      ];
    } else {
      recommendationLines = [
        '1. Mantener reservas líquidas estables y programar excedentes temporales a depósitos de 30 días.',
        '2. Se autoriza la prosecución del catálogo regular de servicios y compras programadas.',
        '3. Continuar con el monitoreo automático cruzado entre arriendos y órdenes de compras vigentes.'
      ];
    }

    let itemY = nextY + 6;
    recommendationLines.forEach(line => {
      doc.text(line, 15, itemY);
      itemY += 5;
    });

    // Signature Block
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 260, 85, 260);
    doc.line(125, 260, 195, 260);
    
    doc.setFontSize(8);
    doc.text('Firma Director de Finanzas (CFO)', 25, 264);
    doc.text('Firma Auditor General de Control', 135, 264);
    
    doc.save(`cash_flow_runway_jde_${Date.now()}.pdf`);
  };

  return (
    <div id="cash-flow-runway-container" className="absolute inset-0 overflow-y-auto p-4 lg:p-8 space-y-6 bg-slate-50/50">
      
      {/* HEADER BANNER */}
      <div id="cashflow-header-card" className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-[32px] p-6 lg:p-8 shadow-2xl border border-indigo-900/40">
        <div className="absolute top-0 right-0 -transtlate-y-12 translate-x-12 opacity-10">
          <TrendingUp size={240} className="text-white" />
        </div>
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner">
                <Shield size={10} />
                Módulo Consolidador ERP
              </span>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner">
                <Activity size={10} />
                PROYECCIÓN DE LIQUIDEZ
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold uppercase tracking-tight font-sans">
              CASH FLOW RUNWAY
            </h1>
            <p className="text-xs text-slate-300 max-w-xl font-medium">
              Gestor de predicción de tesorería y tiempo de supervivencia financiera corporativa. Cruza transacciones conciliadas, contratos vigentes y órdenes de trabajo activas de manera inteligente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              id="export-tech-cashflow-excel"
              onClick={() => exportTech10PeriodCashFlowToExcel()}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl flex items-center gap-2.5 shadow-lg border border-emerald-500/30 cursor-pointer active:scale-95 transition-all"
            >
              <FileText size={14} />
              Excel 10 Períodos Tech (.xlsx)
            </button>

            <button 
              id="print-jde-runway"
              onClick={exportExecutiveReport}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl flex items-center gap-2.5 shadow-lg border border-indigo-500/30 cursor-pointer active:scale-95 transition-all"
            >
              <Download size={14} />
              Exportar Consolidado PDF
            </button>
          </div>
        </div>
      </div>

      {/* RECONCILIATION SUMMARY BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: INITIAL CASH */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efectivo Inicial</p>
            <input 
              type="text" 
              value={initialCashInput}
              onChange={(e) => setInitialCashInput(e.target.value)}
              className="text-lg font-extrabold text-slate-800 bg-transparent border-b border-dashed border-slate-200 focus:outline-none focus:border-indigo-500 w-full font-mono"
            />
          </div>
        </div>

        {/* KPI 2: BURN RATE */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            {kpiData.monthlyBurn > 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasa Consumo Mensual</p>
            <p className="text-lg font-extrabold font-mono text-slate-850">
              ${kpiData.monthlyBurn.toLocaleString('es-CL')} <span className="text-xs text-slate-400 font-sans font-medium">/mes</span>
            </p>
          </div>
        </div>

        {/* KPI 3: RUNWAY DAYS */}
        <div className={`border p-5 rounded-3xl shadow-sm flex items-center gap-4 ${
          kpiData.statusSeverity === 'DANGER' ? 'bg-rose-50 border-rose-100 text-rose-800' :
          kpiData.statusSeverity === 'WARNING' ? 'bg-amber-50 border-amber-100 text-amber-800' :
          'bg-emerald-50 border-emerald-100 text-emerald-800'
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            kpiData.statusSeverity === 'DANGER' ? 'bg-rose-100 text-rose-600' :
            kpiData.statusSeverity === 'WARNING' ? 'bg-amber-100 text-amber-600' :
            'bg-emerald-100 text-emerald-600'
          }`}>
            <Clock size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Métrica Runway</p>
            <p className="text-lg font-black font-mono">
              {kpiData.runwayDays === 999 ? 'Estable (+90d)' : `${kpiData.runwayDays} Días`}
            </p>
          </div>
        </div>

        {/* KPI 4: FINAL SURPLUS */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Proyectado (90 d)</p>
            <p className="text-lg font-extrabold font-mono text-emerald-600">
              ${kpiData.finalCash.toLocaleString('es-CL')}
            </p>
          </div>
        </div>
      </div>

      {/* CONTROLS & GRAPH GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* PARAMS SLIDERS AND SYSTEM CROSSING CONTROLS */}
        <div className="lg:col-span-4 bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders size={16} className="text-slate-500" />
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Parámetros de Simulación</h3>
            </div>

            {/* GROW FACTOR */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-500">Crecimiento Ingresos</span>
                <span id="growth-percentage-value" className="font-mono font-black text-indigo-600">{growthAdjustment}%</span>
              </div>
              <input 
                type="range" 
                min="-50" 
                max="100" 
                value={growthAdjustment} 
                onChange={(e) => setGrowthAdjustment(parseInt(e.target.value))}
                className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* INFLATION FACTOR */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-500">Inflación de Egresos</span>
                <span id="inflation-percentage-value" className="font-mono font-black text-amber-600">+{expenseInflation}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="50" 
                value={expenseInflation} 
                onChange={(e) => setExpenseInflation(parseInt(e.target.value))}
                className="w-full accent-amber-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* INTEGRATIONS AND DATA CROSSING */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-1">
                <TrendingUp size={12} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Información Integrada</span>
              </div>

              {/* TOGGLE LEASES */}
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl hover:bg-slate-100/50 transition-colors cursor-pointer border border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700">Cruzar Contratos Arriendo</span>
                  <p className="text-[9px] text-slate-400 font-medium">Suma {analysisCore.activeLeaseCount} arriendos vigentes</p>
                </div>
                <input 
                  type="checkbox"
                  checked={includeActiveLeases}
                  onChange={(e) => setIncludeActiveLeases(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                />
              </label>

              {/* TOGGLE WORK ORDERS */}
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl hover:bg-slate-100/50 transition-colors cursor-pointer border border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700">Cruzar Órdenes de Trabajo</span>
                  <p className="text-[9px] text-slate-400 font-medium">{analysisCore.pendingWOCount} OTs aprobadas por pagar</p>
                </div>
                <input 
                  type="checkbox"
                  checked={includePendingWorkOrders}
                  onChange={(e) => setIncludePendingWorkOrders(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                />
              </label>
            </div>
          </div>

          {/* CROSS INFORMATION PREVIEW */}
          <div className="bg-slate-55 bg-indigo-50/40 border border-indigo-100 p-4 rounded-2xl">
            <h4 className="text-[11px] font-black uppercase text-indigo-800 tracking-wider mb-2">Ingeniería del Pronóstico</h4>
            <div className="space-y-1.5 text-xs text-indigo-950 font-medium">
              <div className="flex justify-between">
                <span>Arriendos recurrentes:</span>
                <span className="font-mono font-bold text-slate-800">${analysisCore.monthlyLeaseRevenue.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between">
                <span>OTs comprometidas:</span>
                <span className="font-mono font-bold text-slate-800">${analysisCore.totalCommittedWOExpenses.toLocaleString('es-CL')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* CENTRAL GRAPH VISUALIZER */}
        <div className="lg:col-span-8 bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-600 animate-pulse" />
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Curva Financiera de Supervivencia (90 Días)</h3>
            </div>

            {/* TAB CONTROLS */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('CONSOLE')}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-colors ${activeTab === 'CONSOLE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
              >
                Panel
              </button>
              <button 
                onClick={() => setActiveTab('SCENARIOS')}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-colors ${activeTab === 'SCENARIOS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
              >
                Escenarios
              </button>
              <button 
                onClick={() => setActiveTab('TABLE')}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-colors ${activeTab === 'TABLE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
              >
                Matriz
              </button>
            </div>
          </div>

          {/* DYNAMIC SCENARIO PANEL INSERTS */}
          {activeTab === 'SCENARIOS' && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-amber-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-800">Inyección de Liquidez (Financiamiento)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Monto CLP</span>
                    <input 
                      type="text" 
                      value={financingAmount}
                      onChange={(e) => setFinancingAmount(e.target.value)}
                      className="bg-white border border-slate-200 text-xs px-2 py-1.5 rounded-lg w-full font-mono focus:outline-indigo-500"
                      placeholder="Ej. 10000000"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Día Inyección</span>
                    <select 
                      value={financingDay}
                      onChange={(e) => setFinancingDay(parseInt(e.target.value))}
                      className="bg-white border border-slate-200 text-xs px-2 py-1.5 rounded-lg w-full font-bold text-slate-705"
                    >
                      <option value="15">Día 15</option>
                      <option value="30">Día 30</option>
                      <option value="45">Día 45</option>
                      <option value="60">Día 60</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingDown size={14} className="text-rose-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-rose-800">Inversión Planeada (Egreso No Recurrente)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Monto CLP</span>
                    <input 
                      type="text" 
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      className="bg-white border border-slate-200 text-xs px-2 py-1.5 rounded-lg w-full font-mono focus:outline-indigo-500"
                      placeholder="Ej. 5000000"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Día Inversión</span>
                    <select 
                      value={investmentDay}
                      onChange={(e) => setInvestmentDay(parseInt(e.target.value))}
                      className="bg-white border border-slate-200 text-xs px-2 py-1.5 rounded-lg w-full font-bold text-slate-705"
                    >
                      <option value="15">Día 15</option>
                      <option value="30">Día 30</option>
                      <option value="45">Día 45</option>
                      <option value="60">Día 60</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex items-center justify-between bg-white px-3 py-2 border rounded-xl">
                <span className="text-[10px] font-black uppercase tracking-wide text-rose-600">Stress Test: Simular caída de 30% en recaudación</span>
                <input 
                  type="checkbox"
                  checked={stressTestMode}
                  onChange={(e) => setStressTestMode(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 accent-rose-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'CONSOLE' && (
            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={projectionMatrix}
                  margin={{ top: 10, right: 30, left: 15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="dayLabel" 
                    tickLine={false} 
                    stroke="#94A3B8" 
                    tick={{ fontSize: 9, fontWeight: 700 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    stroke="#94A3B8" 
                    tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                    tick={{ fontSize: 9, fontWeight: 700 }}
                  />
                  <Tooltip 
                    formatter={(val: any) => [`$${Number(val).toLocaleString('es-CL')} CLP`, 'Efectivo Proyectado']}
                    labelStyle={{ fontWeight: 'black', color: '#1E293B', fontSize: 11 }}
                    contentStyle={{ borderRadius: 16, border: '1px solid #E2E8F0', padding: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area 
                    name="Flujo Efectivo Acumulado"
                    type="monotone" 
                    dataKey="projectedCash" 
                    stroke="#4F46E5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCash)" 
                  />
                  <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'TABLE' && (
            <div className="w-full overflow-x-auto border rounded-2xl animate-in fade-in duration-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B3C5D] border-b text-white font-bold">
                  <tr>
                    <th className="p-3 w-10 text-center select-none" title="Selector de Fila AssetFlow Enterprise (F4 / Menú Contextual)">#</th>
                    <th className="p-3">Período</th>
                    <th className="p-3 text-right">Saldo Proyectado</th>
                    <th className="p-3 text-right">Entrada</th>
                    <th className="p-3 text-right">Salida</th>
                    <th className="p-3 text-right">Flujo Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono">
                  {projectionMatrix.map((row, idx) => {
                    const isSelected = gridContextMenu?.row.dayLabel === row.dayLabel;
                    return (
                    <tr 
                      key={idx} 
                      onContextMenu={(e) => handleRowContextMenu(e, row)}
                      className={`transition cursor-pointer ${
                        isSelected 
                          ? 'bg-cyan-100/90 text-cyan-950 font-bold border-l-4 border-l-[#00E5FF]' 
                          : 'hover:bg-slate-50'
                      }`}
                      title="Clic derecho o clic en [#] para abrir Menú Contextual AssetFlow Enterprise"
                    >
                      <td className="p-2 text-center bg-slate-50 select-none">
                        <button
                          type="button"
                          onClick={(e) => handleRowContextMenu(e, row)}
                          className="w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-black text-[#0B3C5D] hover:bg-[#0B3C5D] hover:text-white border border-slate-300 hover:border-[#0B3C5D] shadow-2xs transition-all mx-auto"
                          title="Abrir Menú Contextual AssetFlow Enterprise"
                        >
                          #
                        </button>
                      </td>
                      <td className="p-3 font-sans font-bold">{row.dayLabel}</td>
                      <td className="p-3 text-right font-black text-indigo-600">${row.projectedCash.toLocaleString('es-CL')}</td>
                      <td className="p-3 text-right text-emerald-600">+${row.incomeScheduled.toLocaleString('es-CL')}</td>
                      <td className="p-3 text-right text-rose-600">-${row.expenseScheduled.toLocaleString('es-CL')}</td>
                      <td className={`p-3 text-right font-bold ${row.netFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {row.netFlow >= 0 ? '+' : ''}${row.netFlow.toLocaleString('es-CL')}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* WARNING ADVISORY FOOTER */}
          <div className="mt-4 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <AlertTriangle size={14} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase text-slate-700 tracking-wide">Puntos de Alerta Predictiva</p>
                <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                  {kpiData.depletionDay 
                    ? `¡Atención! Se proyecta una quiebra o saldo cero de caja en el día ${kpiData.depletionDay}. Inicie medidas paliativas de inmediato.` 
                    : 'Sin quiebras temporales detectadas. La liquidez mínima estimada se encuentra dentro de los parámetros corporativos.'}
                </p>
              </div>
            </div>
            
            {kpiData.depletionDay && (
              <span className="px-3 py-1 bg-rose-100 text-rose-800 text-[9px] font-extrabold uppercase rounded-full">
                Quiebra Día {kpiData.depletionDay}
              </span>
            )}
          </div>

        </div>

      </div>

      {/* MITIGATION PLAN DECISION PANEL */}
      <div id="reconciliation-mitigation-panel" className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-slate-600" />
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Plan de Acción & Mitigación Corporativa</h3>
          </div>
          
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Plan recomendado por Asistente Fiscal ERP</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LEASE COLLECTION ACCELERATION */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/40 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full">Recaudación Anticipada</span>
              <h4 className="text-xs font-extrabold text-slate-800 uppercase mt-2">Acelerar Cobros de Contratos</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Adelantar la facturación de arriendos activos del maestro contratado. Ofrecer descuento corporativo de pronto pago (1.2%) para liquidez en el día 15.
              </p>
            </div>
            <button 
              onClick={() => {
                setGrowthAdjustment(prev => Math.min(100, prev + 15));
                alert("Simulando cobro anticipado de contratos: Incremento proyectado de flujo inmediato (+15% ingresos).");
              }}
              className="mt-4 w-full py-2.5 bg-white hover:bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-700 rounded-xl border border-slate-200 transition-colors"
            >
              Aplicar a Simulación
            </button>
          </div>

          {/* WO RESCHEDULING */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/40 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest bg-amber-50 px-2 py-0.5 rounded-full">Optimización Gastos</span>
              <h4 className="text-xs font-extrabold text-slate-800 uppercase mt-2">Fraccionar Órdenes Técnicas</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Reprogramar OTs técnicas de montos pesados hacia después del día 60. Libera presión sobre la caja antes de recibir la liquidación mensual de arriendos.
              </p>
            </div>
            <button 
              onClick={() => {
                setExpenseInflation(prev => Math.max(0, prev - 10));
                setIncludePendingWorkOrders(false);
                alert("Simulando postergación de reparaciones no críticas: Excluyendo órdenes técnicas de la proyección inmediata.");
              }}
              className="mt-4 w-full py-2.5 bg-white hover:bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-700 rounded-xl border border-slate-200 transition-colors"
            >
              Postergar Órdenes Técnicas
            </button>
          </div>

          {/* CAPITAL INJECTION */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/40 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">Financiamiento</span>
              <h4 className="text-xs font-extrabold text-slate-800 uppercase mt-2 font-sans">Créditos / Línea de Caja</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Activar línea crediticia corporativa tradicional o realizar un aumento transitorio de capital social para cubrir brecha predictiva neta.
              </p>
            </div>
            <button 
              onClick={() => {
                setActiveTab('SCENARIOS');
                setFinancingAmount('10000000');
                setFinancingDay(30);
                alert("Simulando línea de crédito preventivo: Configurada inyección de $10.000.000 CLP en el Día 30.");
              }}
              className="mt-4 w-full py-2.5 bg-white hover:bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-705 rounded-xl border border-slate-200 transition-colors"
            >
              Simular Inyección Línea Crédito
            </button>
          </div>
        </div>
      </div>

      {/* AssetFlow Enterprise Floating Grid Context Menu (P09220) */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P09220"
          programTitle={`Cash Flow Runway Consolidador [W09220A] • Período ${gridContextMenu.row.dayLabel}`}
          collectionName="cash_flow_projections"
          recordKey={`Período: ${gridContextMenu.row.dayLabel} [Saldo: $${Number(gridContextMenu.row.projectedCash).toLocaleString('es-CL')}]`}
          recordData={gridContextMenu.row}
          currentStatus={gridContextMenu.row.netFlow >= 0 ? 'SUPERAVIT' : 'DEFICIT'}
          statusOptions={[
            { label: 'SUPERÁVIT (Flujo Positivo)', value: 'SUPERAVIT', color: 'bg-emerald-600' },
            { label: 'EQUILIBRIO (Neutro)', value: 'EQUILIBRIO', color: 'bg-slate-600' },
            { label: 'DÉFICIT (Alerta Liquidez)', value: 'DEFICIT', color: 'bg-rose-600' }
          ]}
          onClose={() => setGridContextMenu(null)}
          onViewDetails={() => {
            alert(`Detalle Período ${gridContextMenu.row.dayLabel}:\nSaldo Proyectado: $${gridContextMenu.row.projectedCash.toLocaleString('es-CL')}\nEntradas: +$${gridContextMenu.row.incomeScheduled.toLocaleString('es-CL')}\nSalidas: -$${gridContextMenu.row.expenseScheduled.toLocaleString('es-CL')}\nFlujo Neto: ${gridContextMenu.row.netFlow.toLocaleString('es-CL')}`);
            setGridContextMenu(null);
          }}
          onExportExcel={() => {
            exportTech10PeriodCashFlowToExcel('CashFlow_Runway_Consolidado_JDE.xlsx');
            setGridContextMenu(null);
          }}
          rowExits={[
            {
              label: 'Ver Ficha de Flujo / Detalle Diario',
              shortcut: 'Enter',
              onClick: () => {
                alert(`Detalle Período ${gridContextMenu.row.dayLabel}:\nSaldo Proyectado: $${gridContextMenu.row.projectedCash.toLocaleString('es-CL')}\nEntradas: +$${gridContextMenu.row.incomeScheduled.toLocaleString('es-CL')}\nSalidas: -$${gridContextMenu.row.expenseScheduled.toLocaleString('es-CL')}\nFlujo Neto: ${gridContextMenu.row.netFlow.toLocaleString('es-CL')}`);
                setGridContextMenu(null);
              }
            },
            {
              label: 'Exportar Proyección a Excel Auditoría',
              shortcut: 'Ctrl+E',
              onClick: () => {
                exportTech10PeriodCashFlowToExcel('CashFlow_Runway_Consolidado_JDE.xlsx');
                setGridContextMenu(null);
              }
            },
            {
              label: 'Activar Simulación de Escenario',
              shortcut: 'Alt+S',
              onClick: () => {
                setActiveTab('SCENARIOS');
                setGridContextMenu(null);
              }
            }
          ]}
        />
      )}
    </div>
  );
};
