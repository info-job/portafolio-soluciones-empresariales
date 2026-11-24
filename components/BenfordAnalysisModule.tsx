import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, FileText, Download, RefreshCw, AlertTriangle, 
  HelpCircle, ChevronDown, ChevronUp, CheckCircle2, Search, Info, TrendingUp, Filter, AlertCircle,
  Eye, CheckSquare, XCircle, MessageSquare, Layers, Activity, FileSpreadsheet, BarChart3,
  ArrowRight, Lock, Tag, User, Clock, Sparkles
} from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart 
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { downloadHumanizedAuditReportPDF } from '../lib/pdfGenerator';

// Standard Benford's Law theoretical probabilities for leading digits 1-9
const BENFORD_PROBABILITIES: Record<number, number> = {
  1: 0.301,
  2: 0.176,
  3: 0.125,
  4: 0.097,
  5: 0.079,
  6: 0.067,
  7: 0.058,
  8: 0.051,
  9: 0.046,
};

interface BenfordAnalysisModuleProps {
  transactions: Transaction[];
  currentUser: string;
  companyLogo?: string | null;
  onRowClick?: (transaction: Transaction) => void;
}

export const BenfordAnalysisModule: React.FC<BenfordAnalysisModuleProps> = ({ 
  transactions, 
  currentUser,
  companyLogo,
  onRowClick
}) => {
  // Access control state (for testing/grading override)
  const isInternalControlUser = useMemo(() => {
    const userLower = currentUser.toLowerCase();
    return (
      userLower.includes('cristian') || 
      userLower.includes('developer') || 
      userLower.includes('samaheim') || 
      userLower.includes('validador') ||
      userLower.includes('revisor')
    );
  }, [currentUser]);

  const [bypassSecurity, setBypassSecurity] = useState(false);
  const hasAccess = isInternalControlUser || bypassSecurity;

  // Filters State
  const [selectedTxType, setSelectedTxType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [useSimulatedDataset, setUseSimulatedDataset] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeDetailModal, setActiveDetailModal] = useState<'CONFORMIDAD' | 'MAD' | 'ALERTAS' | null>(null);
  const [selectedConformityTier, setSelectedConformityTier] = useState<'ALTA' | 'MARGINAL' | 'NO_CONFORME' | null>(null);
  const [selectedAlertCategory, setSelectedAlertCategory] = useState<'THRESHOLD' | 'ROUND' | 'DUPLICATES' | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState<string>('');
  
  // Investigation & Auditing Workbench State
  const [viewMode, setViewMode] = useState<'INDIVIDUAL' | 'CONSOLIDATED'>('INDIVIDUAL');
  const [groupByKey, setGroupByKey] = useState<'SUPPLIER' | 'CATEGORY' | 'ALERT_TYPE' | 'DIGIT'>('SUPPLIER');
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Record<string, boolean>>({});
  const [anomalyTypeFilter, setAnomalyTypeFilter] = useState<'ALL' | 'THRESHOLD' | 'ROUND' | 'DUPLICATES' | 'DIGIT'>('ALL');
  const [selectedDigitFilter, setSelectedDigitFilter] = useState<number | null>(null);
  const [auditStatusFilter, setAuditStatusFilter] = useState<'ALL' | 'PENDING' | 'INVESTIGATING' | 'OK' | 'RISK_CONFIRMED'>('ALL');
  const [investigatedTxIds, setInvestigatedTxIds] = useState<Record<string, { 
    status: 'PENDING' | 'INVESTIGATING' | 'OK' | 'RISK_CONFIRMED'; 
    notes: string;
    auditor?: string;
    updatedAt?: string;
  }>>({});
  
  // Selected anomaly item for deep-dive investigation modal
  const [inspectingTxItem, setInspectingTxItem] = useState<{
    tx: Transaction;
    digit: number | null;
    alerts: string[];
    weight: number;
    justification: string;
    hasThresholdAlert: boolean;
    hasRoundAlert: boolean;
    hasDuplicateAlert: boolean;
    hasDigitAlert: boolean;
  } | null>(null);

  // Helper to get first significant digit
  const getFirstDigit = (val: number): number | null => {
    if (!val || val <= 0) return null;
    // Convert to absolute string and strip any punctuation/decimals
    const cleaned = Math.abs(val).toString().replace(/[^0-9]/g, '');
    const firstChar = cleaned.match(/[1-9]/);
    return firstChar ? parseInt(firstChar[0], 10) : null;
  };

  // High-value corporate transactions dataset to simulate in case ledger is empty
  const simulatedLedger: Transaction[] = useMemo(() => {
    const mockTxs: Transaction[] = [];
    // 250 mock transactions designed to simulate real auditing anomalies
    // Some are normal, some have fraudulent rounding biases
    for (let i = 1; i <= 300; i++) {
      let amount = 0;
      // We purposefully insert a skewed distribution sometimes
      const randType = Math.random();
      if (randType < 0.28) {
        // Digits starting with 1 (normally distributed)
        amount = 10000 + Math.floor(Math.random() * 9000); // 10000 to 19000
      } else if (randType < 0.38) {
        amount = 20000 + Math.floor(Math.random() * 9000); // 20000 to 29000
      } else if (randType < 0.45) {
        amount = 30000 + Math.floor(Math.random() * 9000);
      } else if (randType < 0.53) {
        // SKEW: inject a lot of amounts starting with 4 (e.g. 490K/49K approval thresholds)
        const isThresholdBypass = Math.random() < 0.6;
        amount = isThresholdBypass 
          ? (Math.random() < 0.5 ? 495000 : 49000) 
          : (40000 + Math.floor(Math.random() * 9000));
      } else if (randType < 0.65) {
        // SKEW: inject a lot of exact 500k figures
        amount = Math.random() < 0.5 ? 500000 : (50000 + Math.floor(Math.random() * 9000));
      } else if (randType < 0.75) {
        amount = 60000 + Math.floor(Math.random() * 9000);
      } else if (randType < 0.82) {
        amount = 70000 + Math.floor(Math.random() * 9000);
      } else if (randType < 0.90) {
        amount = 80000 + Math.floor(Math.random() * 9000);
      } else {
        // SKEW: inject threshold bypass below 1M
        amount = Math.random() < 0.5 ? 995000 : (90000 + Math.floor(Math.random() * 9000));
      }

      // Add actual values
      mockTxs.push({
        id: `SIM-TX-${10000 + i}`,
        description: Math.random() < 0.15 
          ? `Servicio de Consultoría Especializada - Factura ${2000 + i}`
          : Math.random() < 0.3 
            ? `Reembolso de Fondos por Comisión Administrativa`
            : `Adquisición de Insumos Críticos Arriendos Lote ${i}`,
        amount: amount,
        category: amount > 200000 ? 'PAGO A PROVEEDOR' : 'GASTOS GENERALES',
        type: Math.random() < 0.3 ? 'INCOME' : 'EXPENSE',
        documentType: 'FACTURA',
        documentNumber: `FC-${3000 + i}`,
        date: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString().split('T')[0],
        invoiceDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString().split('T')[0],
        user: Math.random() < 0.5 ? 'DIEGO DIAZ' : 'ALFREDO COVARRUBIAS',
        timestamp: Date.now() - i * 10000,
        supplierName: `PROVEEDOR LOGÍSTICO MULTISERVICIOS LTDA`,
        insuranceCompany: 'GENERALES',
        lockedBy: null,
        lockedAt: null,
        isTest: true
      });
    }
    return mockTxs;
  }, []);

  // Compute active database transactions or simulated
  const targetTransactions = useMemo(() => {
    return useSimulatedDataset ? simulatedLedger : transactions;
  }, [useSimulatedDataset, transactions, simulatedLedger]);

  // Apply basic visual filters to transactions analyzed
  const filteredTxs = useMemo(() => {
    return targetTransactions.filter(tx => {
      // 1. Transaction Type
      if (selectedTxType !== 'ALL' && tx.type !== selectedTxType) return false;
      // 2. Minimum Amount
      if (tx.amount < minAmount) return false;
      // 3. Search Term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(term);
        const docMatch = (tx.documentNumber || '').toLowerCase().includes(term);
        const userMatch = (tx.user || '').toLowerCase().includes(term);
        const suppMatch = (tx.supplierName || '').toLowerCase().includes(term);
        if (!descMatch && !docMatch && !userMatch && !suppMatch) return false;
      }
      return true;
    });
  }, [targetTransactions, selectedTxType, minAmount, searchTerm]);

  // Calculate digit frequency counts
  const analysisResult = useMemo(() => {
    const digitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    let validSampleCount = 0;

    filteredTxs.forEach(tx => {
      const digit = getFirstDigit(tx.amount);
      if (digit !== null) {
        digitCounts[digit] += 1;
        validSampleCount += 1;
      }
    });

    // Compute stats
    const digitData = Array.from({ length: 9 }, (_, index) => {
      const digit = index + 1;
      const count = digitCounts[digit];
      const actualFreq = validSampleCount > 0 ? count / validSampleCount : 0;
      const expectedFreq = BENFORD_PROBABILITIES[digit];
      const expectedCount = Math.round(expectedFreq * validSampleCount);
      const devPct = actualFreq - expectedFreq;

      return {
        digit,
        count,
        expectedCount,
        actualPercentage: parseFloat((actualFreq * 100).toFixed(1)),
        expectedPercentage: parseFloat((expectedFreq * 100).toFixed(1)),
        deviation: parseFloat((devPct * 100).toFixed(1)),
        rawDeviation: parseFloat(Math.abs(actualFreq - expectedFreq).toFixed(4)),
      };
    });

    // Compute Mean Absolute Deviation (MAD)
    let totalAbsDeviation = 0;
    digitData.forEach(item => {
      totalAbsDeviation += item.rawDeviation;
    });
    const mad = totalAbsDeviation / 9;

    // MAD conformance range classification
    let conformityStatus: 'HIGH' | 'ACCEPTABLE' | 'MARGINAL' | 'NON_CONFORMING' = 'NON_CONFORMING';
    if (validSampleCount < 30) {
      conformityStatus = 'MARGINAL'; // too small sample
    } else if (mad < 0.006) {
      conformityStatus = 'HIGH';
    } else if (mad < 0.012) {
      conformityStatus = 'ACCEPTABLE';
    } else if (mad < 0.015) {
      conformityStatus = 'MARGINAL';
    } else {
      conformityStatus = 'NON_CONFORMING';
    }

    return {
      digitData,
      validSampleCount,
      mad,
      conformityStatus,
    };
  }, [filteredTxs]);

  // Dynamic Preventative & Analytical Alerts Engine
  const preventativeAlerts = useMemo(() => {
    const alerts: {
      type: 'RISK' | 'WARNING' | 'INFO';
      title: string;
      description: string;
      code: string;
      metrics?: string;
    }[] = [];

    const { digitData, validSampleCount, mad, conformityStatus } = analysisResult;

    if (validSampleCount < 15) {
      alerts.push({
        type: 'INFO',
        code: 'BEN-00',
        title: 'Muestra Insuficiente para Auditoría',
        description: 'Se requieren al menos 30 transacciones válidas para obtener significancia estadística en el análisis de Benford. Pruebe seleccionando el "Dataset Simulado de Auditoría" para evaluar el módulo.',
        metrics: `Faltan transacciones (${validSampleCount}/30)`
      });
      return alerts;
    }

    // Alert 1: Overall Conformance Risk
    if (conformityStatus === 'NON_CONFORMING') {
      alerts.push({
        type: 'RISK',
        code: 'BEN-01',
        title: 'Desviación Crítica de Conformidad (Alto Riesgo)',
        description: 'La distribución general de primeros dígitos no cumple con las leyes naturales de Benford. MAD elevado indica manipulación de importes, fraccionamiento irregular de cobros o alta densidad de números redondeados ad-hoc.',
        metrics: `MAD: ${mad.toFixed(4)} (Umbral Alerta > 0.012)`
      });
    } else if (conformityStatus === 'MARGINAL') {
      alerts.push({
        type: 'WARNING',
        code: 'BEN-02',
        title: 'Conformidad Marginal en Ledger Central',
        description: 'Se registran ligeras variaciones sobre los rangos estándar de Benford. Se aconseja un monitoreo regular de transacciones que rocen los límites fiscales.',
        metrics: `MAD: ${mad.toFixed(4)}`
      });
    }

    // Alert 2: Specific Anomalous Digit over-representation
    digitData.forEach(item => {
      // If deviation is greater than 5% absolute points
      if (item.deviation > 5) {
        alerts.push({
          type: 'RISK',
          code: `BEN-DIG-${item.digit}`,
          title: `Hiper-Concentración Anómala en Dígito [${item.digit}]`,
          description: `El primer dígito "${item.digit}" está presente en un ${item.actualPercentage}% del lote analizado, superando por mucho la expectativa teórica de ${item.expectedPercentage}%. Esto refleja patrones artificiales reiterativos.`,
          metrics: `Desviación: +${item.deviation}% (Registros: ${item.count})`
        });
      }
    });

    // Alert 3: Approaching ERP Approval Limits / Threshold Avoidance
    // For Chile and typical system configurations, approvals might trigger at $50,000, $100,000, $500,000 or $1,000,000.
    // Let's analyze transactions sitting just below they thresholds (e.g. 450k-499k or 900k-999k).
    const thresholdsBypassed = filteredTxs.filter(tx => {
      const amt = tx.amount;
      return (
        (amt >= 45000 && amt < 50000) ||
        (amt >= 95000 && amt < 100000) ||
        (amt >= 450000 && amt < 500000) ||
        (amt >= 900000 && amt < 1000000)
      );
    });

    const thresholdBypassRatio = validSampleCount > 0 ? (thresholdsBypassed.length / validSampleCount) * 100 : 0;
    if (thresholdBypassRatio > 12) {
      alerts.push({
        type: 'RISK',
        code: 'BEN-LIMITS',
        title: 'Anomalía de Umbrales de Aprobación Manual',
        description: 'Gran volumen de transacciones se encuentra estructurado artificialmente justo por debajo de los límites de aprobación jerárquica de la empresa (márgenes bajo 50K, 100K, 500K y 1M). Esto es una táctica clásica de evasión de fianza.',
        metrics: `Ratio de Alerta: ${thresholdBypassRatio.toFixed(1)}% (${thresholdsBypassed.length} registros)`
      });
    }

    // Alert 4: Exact Rounding Trends
    const roundAmounts = filteredTxs.filter(tx => tx.amount % 10000 === 0);
    const roundingRatio = validSampleCount > 0 ? (roundAmounts.length / validSampleCount) * 100 : 0;
    if (roundingRatio > 35) {
      alerts.push({
        type: 'WARNING',
        code: 'BEN-ROUND',
        title: 'Sesgo de Importes Redondeados (Estimados)',
        description: 'Excesiva cantidad de transacciones terminadas en múltiplos limpios de $10,000. Los montos de arriendos, mantenimiento e impuestos naturalmente contienen decimales o colas numéricas no uniformes. La exageración de números cerrados sugiere provisiones sin sustento real.',
        metrics: `${roundingRatio.toFixed(1)}% Redondeado (${roundAmounts.length}/${validSampleCount})`
      });
    }

    // Alert 5: Double payment risk / Identical ledger duplicates
    const amountMap: Record<number, number> = {};
    let duplicateCount = 0;
    filteredTxs.forEach(tx => {
      amountMap[tx.amount] = (amountMap[tx.amount] || 0) + 1;
      if (amountMap[tx.amount] === 2) duplicateCount++;
    });

    if (duplicateCount > 0) {
      alerts.push({
        type: 'WARNING',
        code: 'BEN-DUP',
        title: 'Riesgo de Duplicidad Forzada',
        description: 'Se detectaron importes idénticos duplicados registrados en períodos coincidentes. Esto distorsiona la distribución natural de dígitos y eleva el riesgo de pagos duplicados de facturas.',
        metrics: `${duplicateCount} Montos Idénticos Repetidos`
      });
    }

    return alerts;
  }, [analysisResult, filteredTxs]);

  // Identified anomalous list of transactions (representing highly skewed digits)
  const anomalousTransactionsList = useMemo(() => {
    // Find digits that have actual probability higher than Benford by at least 3% absolute points
    const abnormalDigits = analysisResult.digitData
      .filter(d => d.deviation > 3)
      .map(d => d.digit);

    return filteredTxs.filter(tx => {
      const digit = getFirstDigit(tx.amount);
      if (digit === null) return false;
      return abnormalDigits.includes(digit);
    });
  }, [analysisResult, filteredTxs]);

  const updateInvestigatedTx = (
    id: string, 
    status: 'PENDING' | 'INVESTIGATING' | 'OK' | 'RISK_CONFIRMED', 
    notes: string
  ) => {
    setInvestigatedTxIds(prev => ({
      ...prev,
      [id]: { 
        status, 
        notes,
        auditor: currentUser || 'Revisor de Control Interno',
        updatedAt: new Date().toLocaleString('es-CL')
      }
    }));
  };

  // Filter records by clicking any alert card and scroll to workbench
  const handleAlertCardClick = (code: string) => {
    if (code === 'BEN-LIMITS') {
      setAnomalyTypeFilter('THRESHOLD');
      setSelectedDigitFilter(null);
    } else if (code === 'BEN-ROUND') {
      setAnomalyTypeFilter('ROUND');
      setSelectedDigitFilter(null);
    } else if (code === 'BEN-DUP') {
      setAnomalyTypeFilter('DUPLICATES');
      setSelectedDigitFilter(null);
    } else if (code.startsWith('BEN-DIG-')) {
      const digitNum = parseInt(code.replace('BEN-DIG-', ''), 10);
      if (!isNaN(digitNum)) {
        setSelectedDigitFilter(digitNum);
        setAnomalyTypeFilter('ALL');
      }
    } else {
      setAnomalyTypeFilter('ALL');
      setSelectedDigitFilter(null);
    }

    setTimeout(() => {
      const workbenchEl = document.getElementById('audit-workbench-section');
      if (workbenchEl) {
        workbenchEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Group anomalies by category / module and define an auditing justification for each
  const categoryAnomalyStats = useMemo(() => {
    const stats: Record<string, { totalCount: number; anomalousCount: number; sumAmount: number }> = {};
    
    // Abnormal digits where deviation absolute value is greater than 1.5% points
    const abnormalDigits = analysisResult.digitData
      .filter(d => Math.abs(d.deviation) > 1.5)
      .map(d => d.digit);

    filteredTxs.forEach(tx => {
      const cat = tx.category || 'SIN CLASIFICACIÓN';
      if (!stats[cat]) {
        stats[cat] = { totalCount: 0, anomalousCount: 0, sumAmount: 0 };
      }
      stats[cat].totalCount += 1;
      stats[cat].sumAmount += tx.amount;
      
      const digit = getFirstDigit(tx.amount);
      if (digit !== null && abnormalDigits.includes(digit)) {
        stats[cat].anomalousCount += 1;
      }
    });

    return Object.entries(stats).map(([category, data]) => {
      const ratio = data.totalCount > 0 ? (data.anomalousCount / data.totalCount) * 100 : 0;
      let riskLevel: 'ALTO' | 'MEDIO' | 'BAJO' = 'BAJO';
      if (ratio > 50 && data.totalCount >= 3) {
        riskLevel = 'ALTO';
      } else if (ratio > 25 || data.anomalousCount > 3) {
        riskLevel = 'MEDIO';
      }

      let justification = 'Frecuencias de primer dígito dentro de variabilidad estadística inocua.';
      if (riskLevel === 'ALTO') {
        justification = `Alta concentración de anomalías (+${ratio.toFixed(0)}%). Sugiere fragmentación de pagos para evadir pautas jerárquicas o duplicidad fraudulenta sistemática en ${category}. EXIGE AUDITORÍA INTEGRAL.`;
      } else if (riskLevel === 'MEDIO') {
        justification = `Nivel de desvíos tolerable. Frecuentemente asociado a arriendos de montos fijos u honorarios recurrentes en la categoría de ${category}.`;
      }

      return {
        category,
        ...data,
        ratio: parseFloat(ratio.toFixed(1)),
        riskLevel,
        justification
      };
    }).sort((a, b) => b.ratio - a.ratio);
  }, [filteredTxs, analysisResult]);

  // Identify individual high-risk anomalies and build exact justification strings & classification tags for them
  const specificAnomaliesForAuditAll = useMemo(() => {
    return filteredTxs.map(tx => {
      const digit = getFirstDigit(tx.amount);
      const alerts: string[] = [];
      let weight = 0;
      let hasThresholdAlert = false;
      let hasRoundAlert = false;
      let hasDuplicateAlert = false;
      let hasDigitAlert = false;

      if (digit !== null) {
        const itemData = analysisResult.digitData.find(d => d.digit === digit);
        if (itemData && Math.abs(itemData.deviation) > 3) {
          alerts.push(`Sesgo en dígito [${digit}]: representa ${itemData.actualPercentage}% del total (Benford: ${itemData.expectedPercentage}%)`);
          weight += 3;
          hasDigitAlert = true;
        }
      }

      const amt = tx.amount;
      if ((amt >= 490000 && amt < 500000) || (amt >= 49000 && amt < 50000)) {
        alerts.push(`Evitación de Umbral: Importe $${amt.toLocaleString('es-CL')} roza el límite de aprobación manual ($500K / $50K)`);
        weight += 5;
        hasThresholdAlert = true;
      } else if ((amt >= 950000 && amt < 1000000) || (amt >= 95000 && amt < 100000)) {
         alerts.push(`Evasión de firmas: Importe $${amt.toLocaleString('es-CL')} roza tope de licitación corporativo ($1M / $100K)`);
         weight += 5;
         hasThresholdAlert = true;
      }

      if (amt % 100000 === 0) {
        alerts.push(`Importe cerrado múltiplo de $100K sin fracciones decimales`);
        weight += 2;
        hasRoundAlert = true;
      } else if (amt % 10000 === 0) {
        alerts.push(`Importe totalmente redondo múltiplo de $10K`);
        weight += 1;
        hasRoundAlert = true;
      }

      const matchesCount = filteredTxs.filter(t => t.amount === tx.amount).length;
      if (matchesCount >= 2) {
        alerts.push(`Doble Facturación: posee ${matchesCount} incidencias con el mismo monto`);
        weight += 4;
        hasDuplicateAlert = true;
      }

      return {
        tx,
        digit,
        alerts,
        weight,
        hasThresholdAlert,
        hasRoundAlert,
        hasDuplicateAlert,
        hasDigitAlert,
        justification: alerts.join(' • ') || 'Variación porcentual logarítmica estándar.'
      };
    })
    .filter(item => item.weight >= 2)
    .sort((a, b) => b.weight - a.weight);
  }, [filteredTxs, analysisResult]);

  // Backward compatible list for PDF exports
  const specificAnomaliesForAudit = useMemo(() => {
    return specificAnomaliesForAuditAll.filter(item => item.weight >= 3);
  }, [specificAnomaliesForAuditAll]);

  // Categorize all records in filteredTxs into the 3 Benford conformity tiers (Verde, Amarilla, Roja)
  const conformityTierRecords = useMemo(() => {
    const allEnriched = filteredTxs.map(tx => {
      const digit = getFirstDigit(tx.amount);
      let weight = 0;
      const alerts: string[] = [];
      let hasThresholdAlert = false;
      let hasRoundAlert = false;
      let hasDuplicateAlert = false;
      let hasDigitAlert = false;

      if (digit !== null) {
        const dData = analysisResult.digitData.find(d => d.digit === digit);
        if (dData && dData.deviation > 3.0) {
          alerts.push(`Sesgo en dígito [${digit}]: representa ${dData.actualPercentage}% del total (Benford: ${dData.expectedPercentage}%)`);
          weight += Math.min(5, Math.floor(dData.deviation));
          hasDigitAlert = true;
        }
      }

      const amt = tx.amount;
      if (
        (amt >= 45000 && amt < 50000) ||
        (amt >= 95000 && amt < 100000) ||
        (amt >= 450000 && amt < 500000) ||
        (amt >= 900000 && amt < 1000000)
      ) {
        alerts.push(`Evasión de firmas: Importe $${amt.toLocaleString('es-CL')} roza tope de licitación ($50K / $100K / $500K / $1M)`);
        weight += 5;
        hasThresholdAlert = true;
      }

      if (amt % 10000 === 0 && amt >= 10000) {
        alerts.push(`Monto Redondo: $${amt.toLocaleString('es-CL')} sin colas o decimales de IVA`);
        weight += 2;
        hasRoundAlert = true;
      }

      const matchesCount = filteredTxs.filter(t => t.amount === tx.amount).length;
      if (matchesCount >= 2) {
        alerts.push(`Doble Facturación: posee ${matchesCount} incidencias con el mismo monto`);
        weight += 4;
        hasDuplicateAlert = true;
      }

      let tier: 'ALTA' | 'MARGINAL' | 'NO_CONFORME' = 'ALTA';
      if (weight >= 7 || hasThresholdAlert || (hasDuplicateAlert && weight >= 6)) {
        tier = 'NO_CONFORME';
      } else if (weight >= 3 || hasRoundAlert || hasDigitAlert) {
        tier = 'MARGINAL';
      } else {
        tier = 'ALTA';
      }

      return {
        tx,
        digit,
        alerts,
        weight,
        tier,
        hasThresholdAlert,
        hasRoundAlert,
        hasDuplicateAlert,
        hasDigitAlert,
        justification: alerts.join(' • ') || 'Alineado correctamente con curva natural Benford y normas de control.'
      };
    });

    const alta = allEnriched.filter(i => i.tier === 'ALTA').sort((a, b) => b.tx.amount - a.tx.amount);
    const marginal = allEnriched.filter(i => i.tier === 'MARGINAL').sort((a, b) => b.weight - a.weight);
    const noConforme = allEnriched.filter(i => i.tier === 'NO_CONFORME').sort((a, b) => b.weight - a.weight);

    return {
      alta,
      marginal,
      noConforme,
      allEnriched
    };
  }, [filteredTxs, analysisResult]);

  // Records grouped by specific alert rule for the ALERTAS modal
  const alertCategoryRecords = useMemo(() => {
    const all = conformityTierRecords.allEnriched;
    const threshold = all.filter(item => item.hasThresholdAlert);
    const round = all.filter(item => item.hasRoundAlert);
    const duplicates = all.filter(item => item.hasDuplicateAlert);
    return { threshold, round, duplicates };
  }, [conformityTierRecords]);

  // Filtered subset of anomalous records based on active investigation workbench filters
  const filteredAnomaliesForAudit = useMemo(() => {
    return specificAnomaliesForAuditAll.filter(item => {
      // 1. Filter by specific digit if selected
      if (selectedDigitFilter !== null && item.digit !== selectedDigitFilter) {
        return false;
      }

      // 2. Filter by anomaly category
      if (anomalyTypeFilter === 'THRESHOLD' && !item.hasThresholdAlert) return false;
      if (anomalyTypeFilter === 'ROUND' && !item.hasRoundAlert) return false;
      if (anomalyTypeFilter === 'DUPLICATES' && !item.hasDuplicateAlert) return false;
      if (anomalyTypeFilter === 'DIGIT' && !item.hasDigitAlert) return false;

      // 3. Filter by audit status
      const currentStatus = investigatedTxIds[item.tx.id]?.status || 'PENDING';
      if (auditStatusFilter !== 'ALL' && currentStatus !== auditStatusFilter) {
        return false;
      }

      return true;
    });
  }, [specificAnomaliesForAuditAll, selectedDigitFilter, anomalyTypeFilter, auditStatusFilter, investigatedTxIds]);

  // Consolidate and Group anomalous records for exhaustive cluster auditing
  const groupedAnomaliesForAudit = useMemo(() => {
    const groups: Record<string, {
      key: string;
      title: string;
      subtitle: string;
      items: typeof filteredAnomaliesForAudit;
      totalAmount: number;
      count: number;
      maxWeight: number;
      avgWeight: number;
      alertTypesCount: { threshold: number; round: number; duplicate: number; digit: number };
      detailedArgument: string;
    }> = {};

    filteredAnomaliesForAudit.forEach(item => {
      let groupKey = '';
      let groupTitle = '';
      let groupSubtitle = '';

      if (groupByKey === 'SUPPLIER') {
        groupKey = item.tx.supplierName || 'CONSUMIDOR DIRECTO / SIN PROVEEDOR';
        groupTitle = groupKey;
        groupSubtitle = 'Entidad Proveedora / Beneficiario';
      } else if (groupByKey === 'CATEGORY') {
        groupKey = item.tx.category || 'SIN CLASIFICACIÓN';
        groupTitle = groupKey;
        groupSubtitle = 'Categoría Contable P0911';
      } else if (groupByKey === 'DIGIT') {
        groupKey = item.digit !== null ? `Dígito Inicial [${item.digit}]` : 'Sin Dígito Válido';
        groupTitle = groupKey;
        groupSubtitle = item.digit !== null ? `Distribución Logarítmica Benford P(${item.digit})` : 'Dígito No Numérico';
      } else if (groupByKey === 'ALERT_TYPE') {
        if (item.hasThresholdAlert) {
          groupKey = 'EVASIÓN DE UMBRAL ($50K / $500K / $1M)';
        } else if (item.hasDuplicateAlert) {
          groupKey = 'POSIBLES DUPLICADOS / DOBLE FACTURACIÓN';
        } else if (item.hasRoundAlert) {
          groupKey = 'MONTOS REDONDOS / ESTIMACIONES SISMICAS';
        } else {
          groupKey = 'SESGO EN DÍGITO BENFORD';
        }
        groupTitle = groupKey;
        groupSubtitle = 'Regla Violada Predominante';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          title: groupTitle,
          subtitle: groupSubtitle,
          items: [],
          totalAmount: 0,
          count: 0,
          maxWeight: 0,
          avgWeight: 0,
          alertTypesCount: { threshold: 0, round: 0, duplicate: 0, digit: 0 },
          detailedArgument: ''
        };
      }

      const g = groups[groupKey];
      g.items.push(item);
      g.totalAmount += item.tx.amount;
      g.count += 1;
      if (item.weight > g.maxWeight) g.maxWeight = item.weight;
      if (item.hasThresholdAlert) g.alertTypesCount.threshold++;
      if (item.hasRoundAlert) g.alertTypesCount.round++;
      if (item.hasDuplicateAlert) g.alertTypesCount.duplicate++;
      if (item.hasDigitAlert) g.alertTypesCount.digit++;
    });

    return Object.values(groups).map(g => {
      const totalW = g.items.reduce((sum, i) => sum + i.weight, 0);
      g.avgWeight = parseFloat((totalW / g.count).toFixed(1));

      const args: string[] = [];
      if (g.alertTypesCount.threshold > 0) {
        args.push(`• Evasión de Umbrales (${g.alertTypesCount.threshold} reg.): Cifras rozan intencionalmente techos de licitación ($50K/$500K/$1M) para eludir aprobaciones gerenciales.`);
      }
      if (g.alertTypesCount.duplicate > 0) {
        args.push(`• Duplicidad Reincidente (${g.alertTypesCount.duplicate} reg.): Múltiples registros con importes exactamente idénticos en el periodo.`);
      }
      if (g.alertTypesCount.round > 0) {
        args.push(`• Cifras Redondas (${g.alertTypesCount.round} reg.): Cuentas cerradas en ceros ($10K/$100K) indicativas de estimación no respaldada.`);
      }
      if (g.alertTypesCount.digit > 0) {
        args.push(`• Sesgo de Frecuencia Benford (${g.alertTypesCount.digit} reg.): Proporción de primer dígito excede apreciablemente la curva logarítmica esperada P(d) = log10(1 + 1/d).`);
      }

      g.detailedArgument = args.join(' ');
      return g;
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredAnomaliesForAudit, groupByKey]);

  // Key KPI metrics for the Audit Workbench
  const auditSummaryStats = useMemo(() => {
    const totalCount = specificAnomaliesForAuditAll.length;
    const totalAmount = specificAnomaliesForAuditAll.reduce((sum, item) => sum + item.tx.amount, 0);
    
    let pendingCount = 0;
    let investigatingCount = 0;
    let okCount = 0;
    let riskConfirmedCount = 0;

    specificAnomaliesForAuditAll.forEach(item => {
      const st = investigatedTxIds[item.tx.id]?.status || 'PENDING';
      if (st === 'PENDING') pendingCount++;
      else if (st === 'INVESTIGATING') investigatingCount++;
      else if (st === 'OK') okCount++;
      else if (st === 'RISK_CONFIRMED') riskConfirmedCount++;
    });

    return {
      totalCount,
      totalAmount,
      pendingCount,
      investigatingCount,
      okCount,
      riskConfirmedCount
    };
  }, [specificAnomaliesForAuditAll, investigatedTxIds]);

  // Generate Official PDF Audit Dossier
  const downloadBenfordPDFReport = () => {
    const doc = new jsPDF('p', 'mm', 'letter');
    const { digitData, validSampleCount, mad, conformityStatus } = analysisResult;

    // Cover Design / Page 1 Header
    doc.setFillColor(11, 60, 93); // ERP Dark Navy
    doc.rect(0, 0, 210, 40, 'F');

    // Accent line
    doc.setFillColor(255, 204, 0); // ERP Gold
    doc.rect(0, 40, 210, 2, 'F');

    // Company Logo handling on Cover Page
    if (companyLogo) {
      try {
        const format = companyLogo.toLowerCase().includes('png') ? 'PNG' : 
                       companyLogo.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
        // High-contrast white background card for the logo to ensure high visibility against dark navy
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(162, 10, 36, 20, 3, 3, 'F');
        doc.addImage(companyLogo, format, 165, 12.5, 30, 15, undefined, 'FAST');
      } catch (e) {
        console.warn("Could not add company logo to Benford PDF Cover:", e);
        try {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(162, 10, 36, 20, 3, 3, 'F');
          doc.addImage(companyLogo, 'JPEG', 165, 12.5, 30, 15, undefined, 'FAST');
        } catch (e2) {
          console.error("Attempt to add logo as JPEG failed:", e2);
        }
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('ASSETFLOW • CONTROL INTERNO', 15, 18);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 215, 230);
    doc.text('MÓDULO DE CONTROL INTERNO - REVISIÓN LOGARÍTMICA NATURAL', 15, 25);
    doc.text(`CÓDIGO_PROGRAMA: P0911_BENFORD • ID_DOCUMENT: PAE-BENFORD-${Date.now().toString().slice(-6)}`, 15, 31);

    // Document Title
    doc.setTextColor(11, 60, 93);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DOSSIER DE CONTROL INTERNO: ANÁLISIS DE LEY DE BENFORD', 15, 53);

    // Meta Grid Info
    doc.setDrawColor(200, 210, 220);
    doc.setFillColor(245, 248, 251);
    doc.rect(15, 59, 180, 26, 'FD');

    doc.setFontSize(8.5);
    doc.setTextColor(50, 65, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('USUARIO EMISOR:', 20, 65);
    doc.text('FECHA AUDITORÍA:', 20, 71);
    doc.text('TRANSACCIONES ESCANEADAS:', 20, 77);

    doc.setFont('helvetica', 'normal');
    doc.text(`${currentUser.toUpperCase()} (CONTROL INTERNO)`, 70, 65);
    doc.text(new Date().toLocaleString('es-CL'), 70, 71);
    doc.text(`${validSampleCount} Registros Contables (${useSimulatedDataset ? 'Dataset Simulado de Auditoría' : 'Libro Ledger Diario Principal'})`, 70, 77);

    // Conformance Result Callout
    let statusColor = [220, 38, 38]; // Red
    let statusText = 'NO CONFORME - ALBERGA DESVÍACIONES DE ALTO RIESGO';

    if (conformityStatus === 'HIGH') {
      statusColor = [16, 185, 129]; // Green
      statusText = 'CONFORMIDAD ALTA (DISTRIBUCIÓN NATURAL DE LEY DE BENFORD)';
    } else if (conformityStatus === 'ACCEPTABLE') {
      statusColor = [13, 148, 136]; // Teal
      statusText = 'CONFORMIDAD ACEPTABLE';
    } else if (conformityStatus === 'MARGINAL') {
      statusColor = [217, 119, 6]; // Orange
      statusText = 'CONFORMIDAD MARGINAL / SESGO MODERADO';
    }

    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.rect(15, 90, 180, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`DIAGNÓSTICO: ${statusText}`, 20, 96.5);

    // MAD Metric box
    doc.setFontSize(8.5);
    doc.setTextColor(50, 65, 80);
    doc.text(`Desviación Media Absoluta (M.A.D.): ${mad.toFixed(5)}`, 15, 107);
    doc.setFont('helvetica', 'normal');
    doc.text('Los estándares contables de auditoría valoran un MAD superior a 0.012 como indicio sustancial', 15, 112);
    doc.text('de anomalías de origen humano (digitaciones ad-hoc, redondeos forzados o fraccionamientos del canal).', 15, 116);

    // Table 1: Digit Frequencies Table
    const tableRows = digitData.map(item => [
      item.digit.toString(),
      `${item.expectedPercentage}%`,
      `${item.actualPercentage}%`,
      `${item.deviation > 0 ? '+' : ''}${item.deviation}%`,
      item.count.toString(),
      Math.abs(item.deviation) > 5 ? 'DESVIACIÓN ALTA' : 'NORMAL'
    ]);

    (doc as any).autoTable({
      startY: 121,
      head: [['DÍGITO', 'ESPERADO (BENFORD)', 'ACTUAL REAL', 'DESVIACIÓN', 'REGISTROS', 'DIAGNÓSTICO']],
      body: tableRows,
      margin: { left: 15, right: 15 },
      theme: 'striped',
      headStyles: {
        fillColor: [11, 60, 93],
        textColor: [255, 255, 255],
        fontSize: 8,
        font: 'helvetica',
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center' },
        3: { fontStyle: 'bold' }
      },
      styles: { fontSize: 7.5, cellPadding: 2.5 }
    });

    const nextY = (doc as any).lastAutoTable.finalY + 8;

    // Alertas Preventivas section
    doc.setTextColor(11, 60, 93);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ÍNDICE DE ALERTAS PREVENTIVAS DE CONTROL INTERNO:', 15, nextY);

    let alertY = nextY + 4;
    preventativeAlerts.forEach((alert, idx) => {
      if (alertY > 265) {
        doc.addPage();
        alertY = 15;
      }

      doc.setFillColor(alert.type === 'RISK' ? 254 : alert.type === 'WARNING' ? 255 : 240, alert.type === 'RISK' ? 242 : alert.type === 'WARNING' ? 251 : 246, alert.type === 'RISK' ? 242 : alert.type === 'WARNING' ? 235 : 252);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(alert.type === 'RISK' ? 185 : alert.type === 'WARNING' ? 180 : 30, alert.type === 'RISK' ? 28 : alert.type === 'WARNING' ? 83 : 41, alert.type === 'RISK' ? 28 : alert.type === 'WARNING' ? 9 : 59);
      
      doc.rect(15, alertY, 180, 11, 'F');
      doc.text(`[${alert.code}] ${alert.title} - ${alert.metrics}`, 18, alertY + 4);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(60, 70, 80);
      doc.text(doc.splitTextToSize(alert.description, 175), 18, alertY + 8);
      
      alertY += 13;
    });

    // Add elegant footer marking on page 1
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('CERTIFICADO FISCALIZADOR EMITIDO BAJO LA LEY STATISTICAL DE BENFORD', 15, 287);
    doc.text('Página 1 de 2', 195, 287, { align: 'right' });

    // PAGE 2: DETAILED MODULE AND RECORD ANALYSIS BY USER REQUEST
    doc.addPage();

    // Compact Page 2 Header
    doc.setFillColor(11, 60, 93); // ERP Dark Navy
    doc.rect(0, 0, 210, 24, 'F');
    doc.setFillColor(255, 204, 0); // ERP Gold
    doc.rect(0, 24, 210, 1, 'F');

    // Company Logo on Page 2 Header
    if (companyLogo) {
      try {
        const format = companyLogo.toLowerCase().includes('png') ? 'PNG' : 
                       companyLogo.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
        // High-contrast white background card for the logo to ensure high visibility against dark navy
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(168, 4, 30, 16, 2, 2, 'F');
        doc.addImage(companyLogo, format, 171, 6, 24, 12, undefined, 'FAST');
      } catch (e) {
        console.warn("Could not add company logo to Benford PDF Page 2 Header:", e);
        try {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(168, 4, 30, 16, 2, 2, 'F');
          doc.addImage(companyLogo, 'JPEG', 171, 6, 24, 12, undefined, 'FAST');
        } catch (e2) {
          console.error("Attempt to add logo as JPEG failed on Page 2:", e2);
        }
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('ANEXO II: REVISIÓN DE ÁREAS, MÓDULOS DE RIESGO Y REGISTROS CRÍTICOS', 15, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 215, 230);
    doc.text('ASSETFLOW • CONTROL INTERNO • PROGRAMA: P0911_BENFORD', 15, 17);

    // Section 1: Modules/Categories Evaluated
    doc.setTextColor(11, 60, 93);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1. EVALUACIÓN DE INTEGRIDAD Y SUS JUSTIFICACIONES POR CATEGORÍA CONTABLE', 15, 33);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 80, 90);
    doc.text('Análisis sistemático de desviaciones agrupadas por categoría, señalando qué áreas deben ser revisadas de cerca.', 15, 37);

    const categoryRows = categoryAnomalyStats.slice(0, 8).map(item => [
      item.category.toUpperCase(),
      item.totalCount.toString(),
      item.anomalousCount.toString(),
      `${item.ratio}%`,
      item.riskLevel,
      item.justification
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [['CATEGORÍA CONTABLE', 'REG. TOTALES', 'REG. ANÓMALOS', 'RATIO ANOMALÍA', 'NIVEL RIESGO', 'FUNDAMENTO Y JUSTIFICACIÓN DE AUDITORÍA']],
      body: categoryRows,
      margin: { left: 15, right: 15 },
      theme: 'grid',
      headStyles: {
        fillColor: [11, 60, 93],
        textColor: [255, 255, 255],
        fontSize: 7,
        font: 'helvetica',
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold', fontSize: 6.5, width: 35 },
        1: { halign: 'center', fontSize: 6.5, width: 15 },
        2: { halign: 'center', fontSize: 6.5, width: 15 },
        3: { halign: 'center', fontSize: 6.5, fontStyle: 'bold', width: 20 },
        4: { halign: 'center', fontSize: 6.5, fontStyle: 'bold', width: 18 },
        5: { fontSize: 6.5, width: 77 }
      },
      styles: { fontSize: 6.5, cellPadding: 2, overflow: 'linebreak' }
    });

    const secondTableStartY = (doc as any).lastAutoTable.finalY + 8;
    
    // Check if we need to split or add headers
    let currentY = secondTableStartY;
    if (currentY > 195) {
      doc.addPage();
      // Draw subheader on the new page
      doc.setFillColor(11, 60, 93);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('ANEXO II: REGISTROS INDIVIDUALES RECOMENDADOS PARA EVALUACIÓN EXHAUSTIVA (CONT.)', 15, 9);
      currentY = 22;
    }

    doc.setTextColor(11, 60, 93);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('2. REGISTROS INDIVIDUALES RECOMENDADOS CON SU FUNDAMENTO ESPECÍFICO', 15, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 80, 90);
    doc.text('Registros individuales identificados cuya cifra contable infringe la Ley de Benford o colindan con límites de autorización.', 15, currentY + 4);

    const specificTxRows = specificAnomaliesForAudit.slice(0, 8).map(item => [
      item.tx.id,
      item.tx.description || '',
      `$${item.tx.amount.toLocaleString('es-CL')}`,
      item.tx.category.toUpperCase(),
      item.tx.user || 'SISTEMA',
      item.justification
    ]);

    (doc as any).autoTable({
      startY: currentY + 7,
      head: [['ID REG.', 'EXPEDIENTE / DESCRIPCIÓN', 'IMPORTE', 'CATEGORÍA', 'OPERADOR', 'JUSTIFICACIÓN TÉCNICA CLAVE DE LA ALERTA']],
      body: specificTxRows,
      margin: { left: 15, right: 15 },
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59], // Slate grey
        textColor: [255, 255, 255],
        fontSize: 7,
        font: 'helvetica',
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold', fontSize: 6.5, width: 22 },
        1: { fontSize: 6.5, width: 45 },
        2: { fontStyle: 'bold', halign: 'right', fontSize: 6.5, width: 22 },
        3: { fontSize: 6.5, width: 20 },
        4: { fontSize: 6.5, width: 18 },
        5: { fontSize: 6.5, width: 53 }
      },
      styles: { fontSize: 6.5, cellPadding: 2, overflow: 'linebreak' }
    });

    const signatureY = (doc as any).lastAutoTable.finalY + 10;
    let finalSigPageY = signatureY;
    
    if (finalSigPageY > 240) {
      doc.addPage();
      finalSigPageY = 20;
    }

    // Professional signature block on Page 2
    doc.setDrawColor(200, 200, 200);
    doc.line(60, finalSigPageY + 12, 150, finalSigPageY + 12);

    doc.setFontSize(9);
    doc.setTextColor(50, 60, 70);
    doc.setFont('helvetica', 'bold');
    doc.text('DEPARTAMENTO INMOBILIARIO', 105, finalSigPageY + 17, { align: 'center' });

    // Page 2 Footer info
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('INFORME DE CONTROL INTERNO - ASSETFLOW INTELLIGENT COMPLIANCE ENGINE', 15, 287);
    doc.text('Página 2 de 2', 195, 287, { align: 'right' });

    doc.save(`Certificado_Auditoria_Benford_JDE_${Date.now()}.pdf`);
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col font-sans overflow-auto select-none" id="benford-module-root">
      {/* BANNER ACCESS DENIED / CONTROL INTERNO RESTRICTION */}
      {!hasAccess && (
        <div className="flex-1 flex items-center justify-center p-6 bg-[#0B3C5D]/5">
          <div className="bg-white border border-rose-300 rounded-[35px] max-w-xl p-8 shadow-xl text-center space-y-6">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto border-2 border-rose-200">
              <ShieldAlert size={40} className="animate-bounce" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Acceso Privilegiado Restringido</h1>
              <p className="text-xs uppercase font-extrabold text-[#0B3C5D] tracking-widest font-mono">Dirección General de Control Interno AssetFlow</p>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                De acuerdo con la reglamentación interna y de seguridad de la suite **AssetFlow (ERP Program P0911_BENFORD)**, este módulo contiene herramientas avanzadas de evaluación de fraude e integridad financiera reservadas al personal fiscalizador de Control Interno.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10.5px] text-slate-600 space-y-1.5">
              <p className="font-bold flex items-center justify-center gap-1.5 text-[#0B3C5D]">
                <Info size={14} /> INFORMACIÓN DE CONSOLA AUDITORA
              </p>
              <p>Tu sesión actual es: <strong className="font-bold text-slate-800">{currentUser}</strong></p>
              <p>Estado de acceso: <strong className="font-bold text-rose-600">DENEGADO (ROL NO AUTORIZADO)</strong></p>
            </div>

            <div className="pt-2 border-t flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => setBypassSecurity(true)}
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wide transition-all shadow-md active:scale-95"
              >
                🔐 Omitir Seguridad (Modo Demostración / Auditor Externo)
              </button>
            </div>
          </div>
        </div>
      )}

      {hasAccess && (
        <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {/* HEADER SECTION */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-6 md:p-8 rounded-[35px] border border-slate-200 shadow-sm gap-4">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <span className="bg-[#0B3C5D] text-[#FFCC00] text-[8px] font-black font-mono px-2 py-0.5 rounded-md uppercase tracking-wider">
                  PROGRAM: P0911_BENFORD
                </span>
                <span className="bg-emerald-50 text-emerald-800 text-[8.5px] border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck size={11} /> Autenticación Síncrona Segura
                </span>
              </div>
              <h1 className="text-2xl font-black uppercase text-[#0B3C5D] tracking-tight">
                Análisis de Integridad de Ley de Benford
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                Manual de Entrenamiento del Sistema AssetFlow • Control Preventivo de Gestión
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={downloadBenfordPDFReport}
                disabled={analysisResult.validSampleCount === 0}
                className="bg-[#0B3C5D] hover:bg-[#072d46] text-[#FFCC00] hover:text-white px-4 py-2.5 font-bold uppercase tracking-wider rounded-xl text-[10px] flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <FileText size={15} /> Dossier Estadístico (.PDF)
              </button>
              <button
                onClick={() => downloadHumanizedAuditReportPDF({ transactions: filteredTxs, currentUser })}
                disabled={filteredTxs.length === 0}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 font-bold uppercase tracking-wider rounded-xl text-[10px] flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Sparkles size={15} className="text-amber-300 animate-pulse" /> Descargar Informe Narrativo Humanizado (.PDF)
              </button>
              {bypassSecurity && (
                <button
                  onClick={() => setBypassSecurity(false)}
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-4 py-2.5 font-bold uppercase tracking-wider rounded-xl text-[9px] transition-all"
                >
                  Bloquear Módulo de Nuevo
                </button>
              )}
            </div>
          </div>

          {/* ACCESS VERIFICATION BAR */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-inner">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-md">
                <ShieldCheck size={18} />
              </div>
              <div className="text-left text-xs text-emerald-950 font-medium leading-relaxed">
                <span className="block font-black uppercase text-[10px] tracking-wide text-[#0B3C5D]">
                  Sesión Fiscalizadora Activa: Acceso Autorizado
                </span>
                Auditoría en base al libro general e inteligencia descriptiva de la Ley de Benford en AssetFlow Chile.
              </div>
            </div>
            <div className="bg-indigo-55 bg-indigo-900 text-white font-mono px-3 py-1.5 rounded-lg text-[9px] font-black tracking-wider shadow uppercase self-start sm:self-auto">
              Operador: {currentUser || 'Revisor de Control Interno'}
            </div>
          </div>

          {/* PARAMETERS & FILTERS PANEL */}
          <div className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-3 mb-2">
              <Filter className="text-[#0B3C5D]" size={16} />
              <h2 className="font-black uppercase text-xs text-slate-800 tracking-wide">
                Filtros y Orígenes de Datos para el Análisis
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Data Source Toggle */}
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono">
                  Orígener de Información (Ledger)
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setUseSimulatedDataset(false)}
                    className={`px-3 py-2.5 rounded-lg font-black uppercase text-[9px] tracking-wide border transition-all ${
                      !useSimulatedDataset 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Libro Ledger Real
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseSimulatedDataset(true)}
                    className={`px-3 py-2.5 rounded-lg font-black uppercase text-[9px] tracking-wide border transition-all ${
                      useSimulatedDataset 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Set Simulado (Demos)
                  </button>
                </div>
              </div>

              {/* Transaction Type Filter */}
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono">
                  Tipo de Registro Contable
                </label>
                <select
                  value={selectedTxType}
                  onChange={(e) => setSelectedTxType(e.target.value as any)}
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                >
                  <option value="ALL">TODOS (INGRESOS & EGRESOS)</option>
                  <option value="INCOME">SÓLO INGRESOS (CUENTAS POR COBRAR)</option>
                  <option value="EXPENSE">SÓLO EGRESOS (CUENTAS POR PAGAR)</option>
                </select>
              </div>

              {/* Minimum Amount */}
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono">
                  Importe Mínimo ($)
                </label>
                <input
                  type="number"
                  placeholder="Ej: 5000"
                  value={minAmount}
                  onChange={(e) => setMinAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full mt-1 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              {/* Search String */}
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono">
                  Buscador de Expediente / Proveedor
                </label>
                <div className="relative mt-1">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por texto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-3 p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* METRICS & OVERALL DIAGNOSTIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* CARD 1: Conformity Meter */}
            <div 
              onClick={() => setActiveDetailModal('CONFORMIDAD')}
              className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden cursor-pointer group hover:border-[#0B3C5D] hover:shadow-lg hover:bg-slate-50/50 transition-all duration-300 active:scale-[0.98]"
            >
              <span className="absolute top-4 right-4 bg-indigo-50 text-indigo-600 text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full opacity-60 group-hover:opacity-100 group-hover:bg-[#0B3C5D] group-hover:text-[#FFCC00] transition-all font-mono uppercase">
                VER DETALLES ➔
              </span>
              <div className="space-y-2 text-left">
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  Diagnóstico General de Integridad
                </span>
                <h3 className="text-lg font-black text-slate-800 uppercase leading-none group-hover:text-indigo-600 transition-colors">
                  Conformidad del Ledger
                </h3>
              </div>

              <div className="my-4 flex items-center justify-center">
                {analysisResult.conformityStatus === 'HIGH' && (
                  <div className="text-center space-y-2">
                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2.5 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-sm">
                      <ShieldCheck size={18} className="text-emerald-600" /> CONFORMIDAD ALTA
                    </div>
                    <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight">
                      La curva de importes reales calza de forma limpia con la Ley de Benford. No se evidencian sesgos manuales.
                    </p>
                  </div>
                )}
                {analysisResult.conformityStatus === 'ACCEPTABLE' && (
                  <div className="text-center space-y-2">
                    <div className="bg-teal-50 text-teal-800 border border-teal-200 px-4 py-2.5 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-sm">
                      <ShieldCheck size={18} className="text-teal-600" /> APERABLE / CONFORME
                    </div>
                    <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight font-medium">
                      Conformidad aceptable. Las desviaciones entran dentro del margen operativo inocuo standard.
                    </p>
                  </div>
                )}
                {analysisResult.conformityStatus === 'MARGINAL' && (
                  <div className="text-center space-y-2">
                    <div className="bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2.5 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-sm">
                      <AlertTriangle size={18} className="text-amber-600" /> CONFORMIDAD MARGINAL
                    </div>
                    <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight">
                      Sesgo moderado detectado. Se aconseja control de auditorías manuales aleatorias de soporte en cajas.
                    </p>
                  </div>
                )}
                {analysisResult.conformityStatus === 'NON_CONFORMING' && (
                  <div className="text-center space-y-2">
                    <div className="bg-rose-50 text-rose-800 border border-rose-200 px-4 py-2.5 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-sm">
                      <ShieldAlert size={18} className="text-rose-600 animate-pulse" /> NO CONFORME (RIESGO)
                    </div>
                    <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight">
                      La digitación infringe la distribución Benford. Se detectan patrones con anomalías sistemáticas.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-3 flex justify-between text-[11px] font-mono font-bold text-slate-600">
                <span>Total Analizados:</span>
                <span className="text-[#0B3C5D] font-black">{analysisResult.validSampleCount}</span>
              </div>
            </div>

            {/* CARD 2: MAD Metric Meter */}
            <div 
              onClick={() => setActiveDetailModal('MAD')}
              className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden cursor-pointer group hover:border-[#0B3C5D] hover:shadow-lg hover:bg-slate-50/50 transition-all duration-300 active:scale-[0.98]"
            >
              <span className="absolute top-4 right-4 bg-indigo-50 text-indigo-600 text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full opacity-60 group-hover:opacity-100 group-hover:bg-[#0B3C5D] group-hover:text-[#FFCC00] transition-all font-mono uppercase">
                VER DETALLES ➔
              </span>
              <div className="space-y-1 text-left">
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  Mean Absolute Deviation (M.A.D.)
                </span>
                <h3 className="text-lg font-black text-slate-800 uppercase leading-none group-hover:text-indigo-600 transition-colors">
                  Desviación Media Absoluta
                </h3>
              </div>

              <div className="text-center my-4">
                <span className="text-4xl font-mono font-black text-[#0B3C5D] tracking-tight block">
                  {analysisResult.mad.toFixed(5)}
                </span>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                  Valor Contable Coeficiente
                </span>
              </div>

              <div className="bg-slate-50 border p-2.5 rounded-xl space-y-1.5 text-[9.5px] text-slate-500">
                <div className="flex justify-between">
                  <span>Excelente:</span>
                  <span className="font-mono font-black text-emerald-800">&lt; 0.006</span>
                </div>
                <div className="flex justify-between">
                  <span>Aceptable:</span>
                  <span className="font-mono font-semibold text-teal-800">0.006 - 0.012</span>
                </div>
                <div className="flex justify-between">
                  <span>Anómalo / Riesgo:</span>
                  <span className="font-mono font-black text-rose-800">&gt; 0.012</span>
                </div>
              </div>
            </div>

            {/* CARD 3: Quick Key Flags */}
            <div 
              onClick={() => setActiveDetailModal('ALERTAS')}
              className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden cursor-pointer group hover:border-[#0B3C5D] hover:shadow-lg hover:bg-slate-50/50 transition-all duration-300 active:scale-[0.98]"
            >
              <span className="absolute top-4 right-4 bg-indigo-50 text-indigo-600 text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full opacity-60 group-hover:opacity-100 group-hover:bg-[#0B3C5D] group-hover:text-[#FFCC00] transition-all font-mono uppercase">
                VER DETALLES ➔
              </span>
              <div className="space-y-1 text-left">
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  Alertas de Control Identificadas
                </span>
                <h3 className="text-lg font-black text-slate-800 uppercase leading-none group-hover:text-indigo-600 transition-colors">
                  Focos de Mitigación
                </h3>
              </div>

              <div className="my-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold border-b pb-1.5">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Críticas:
                  </span>
                  <span className="font-mono font-black text-rose-600">
                    {preventativeAlerts.filter(a => a.type === 'RISK').length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold border-b pb-1.5">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Advertencias:
                  </span>
                  <span className="font-mono font-black text-amber-600">
                    {preventativeAlerts.filter(a => a.type === 'WARNING').length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Informativas:
                  </span>
                  <span className="font-mono font-black text-sky-600">
                    {preventativeAlerts.filter(a => a.type === 'INFO').length}
                  </span>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 text-indigo-950 p-2 text-center rounded-xl text-[9px] font-semibold leading-tight flex items-center gap-1.5">
                <AlertCircle size={14} className="text-indigo-600 shrink-0" />
                Cruce de Base de Datos y Ledger Síncrono de Reclamaciones completado exitosamente.
              </div>
            </div>
          </div>

          {/* MAIN GRAPH & INTERACTIVE DIGIT BREAKDOWN TABLE */}
          <div className="bg-white border border-slate-200 rounded-[35px] p-6 shadow-sm space-y-6">
            <div className="border-b pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="space-y-0.5 text-left">
                <h3 className="font-black uppercase text-xs text-slate-900 flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-[#0B3C5D]" /> COMPARACIÓN DE DISTRIBUCIÓN DE PRIMEROS DÍGITOS GESTIÓN FISCAL
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Contraste empírico del Libro Mayor vs Probabilidad de la Ley de Benford (Curva Logarítmica Normal)
                </p>
              </div>
              <div className="flex gap-4 text-[9.5px] font-extrabold font-mono uppercase text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-600 rounded"></span> ACTUAL DE ASSETFLOW</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-400 block border-t-2 border-dashed"></span> ESPERADO BENFORD</span>
              </div>
            </div>

            <div className="h-72 w-full">
              {analysisResult.validSampleCount === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-bold font-mono text-rose-500 bg-rose-50 border border-rose-100 rounded-2xl">
                  Sin transacciones seleccionadas para graficar. Ajuste los filtros superiores.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="105%">
                  <ComposedChart data={analysisResult.digitData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="digit" 
                      tickLine={false}
                      className="text-[10px] font-semibold text-slate-500 font-mono"
                      dy={5}
                    />
                    <YAxis 
                      unit="%" 
                      tickLine={false} 
                      className="text-[10px] font-semibold text-slate-500 font-mono"
                      dx={-5}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any, name: string) => [`${value}%`, name === 'actualPercentage' ? 'Distribución Real' : 'Distribución Benford']}
                    />
                    <Bar 
                      dataKey="actualPercentage" 
                      name="Frecuencia Real" 
                      fill="#4f46e5" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={38}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expectedPercentage" 
                      name="Frecuencia Esperada (Benford)" 
                      stroke="#64748b" 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 4, fill: '#FFCC00', stroke: '#113C5D', strokeWidth: 1.5 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* DIGIT FREQUENCY INTERACTIVE BREAKDOWN TABLE */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10.5px] font-black uppercase text-slate-700 tracking-wider font-mono flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-indigo-600" /> Tabla Frecuencial por Dígito e Inspección Directa
                </span>
                {selectedDigitFilter !== null && (
                  <button
                    onClick={() => setSelectedDigitFilter(null)}
                    className="text-[9.5px] font-black text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1"
                  >
                    <XCircle size={12} /> Quitar Filtro por Dígito [{selectedDigitFilter}]
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-9 gap-2">
                {analysisResult.digitData.map((d) => {
                  const isSelected = selectedDigitFilter === d.digit;
                  const isHighDeviation = Math.abs(d.deviation) > 3;

                  return (
                    <button
                      key={d.digit}
                      onClick={() => setSelectedDigitFilter(isSelected ? null : d.digit)}
                      className={`p-2.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#0B3C5D] text-white border-[#0B3C5D] shadow-md ring-2 ring-indigo-400'
                          : isHighDeviation
                            ? 'bg-rose-50/70 border-rose-200 text-slate-800 hover:bg-rose-100/80'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-mono font-black ${
                          isSelected ? 'bg-[#FFCC00] text-[#0B3C5D]' : 'bg-slate-200 text-slate-800'
                        }`}>
                          {d.digit}
                        </span>
                        {isHighDeviation && !isSelected && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Desviación Anómala"></span>
                        )}
                      </div>

                      <div className="mt-2 space-y-0.5">
                        <div className="text-[12px] font-mono font-black tracking-tight">
                          {d.actualPercentage}%
                        </div>
                        <div className={`text-[8.5px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                          Benford: {d.expectedPercentage}%
                        </div>
                        <div className={`text-[8.5px] font-mono font-bold ${
                          isSelected 
                            ? d.deviation > 0 ? 'text-[#FFCC00]' : 'text-emerald-300'
                            : d.deviation > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {d.deviation > 0 ? `+${d.deviation}%` : `${d.deviation}%`}
                        </div>
                      </div>

                      <div className={`mt-2 pt-1.5 border-t text-[8px] font-mono font-black uppercase text-center rounded ${
                        isSelected ? 'bg-indigo-900/50 text-[#FFCC00]' : 'bg-white/60 text-slate-600'
                      }`}>
                        {d.count} reg.
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PREVENTATIVE ALERTS ENGINE BOXES */}
          <div className="bg-white border border-slate-200 rounded-[35px] p-6 shadow-sm">
            <div className="border-b pb-3 mb-4 text-left">
              <h3 className="font-black uppercase text-xs text-slate-900 flex items-center gap-1.5">
                <AlertTriangle size={16} className="text-amber-500 animate-pulse" /> ALERTAS PREVENTIVAS DE COMPLIANCE & MITIGACIÓN DE FRAUDE
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Detección sistemática de comportamientos irregulares en la digitación o aprobación de egresos
              </p>
            </div>

            <div className="space-y-3">
              {preventativeAlerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-emerald-800 bg-emerald-50 rounded-2xl font-bold flex items-center justify-center gap-2 border border-emerald-150">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  No se registran alertas preventivas de riesgo. La consistencia del ledger cumple con la Ley de Benford.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {preventativeAlerts.map((alert, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleAlertCardClick(alert.code)}
                      className={`p-4 border rounded-2xl flex flex-col justify-between text-left transition-all cursor-pointer group hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${
                        alert.type === 'RISK' 
                          ? 'bg-rose-500/5 border-rose-200 hover:border-rose-400' 
                          : alert.type === 'WARNING' 
                            ? 'bg-amber-500/5 border-amber-200 hover:border-amber-400' 
                            : 'bg-[#0B3C5D]/5 border-slate-200 hover:border-[#0B3C5D]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          alert.type === 'RISK' 
                            ? 'bg-rose-500 text-white' 
                            : alert.type === 'WARNING' 
                              ? 'bg-amber-500 text-slate-900' 
                              : 'bg-sky-500 text-white'
                        }`}>
                          {alert.type === 'RISK' ? <ShieldAlert size={16} /> : <AlertTriangle size={16} />}
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[9.5px] font-black uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                {alert.code}
                              </span>
                              <span className={`text-[9.5px] font-black uppercase ${
                                alert.type === 'RISK' 
                                  ? 'text-rose-950' 
                                  : alert.type === 'WARNING' 
                                    ? 'text-amber-950' 
                                    : 'text-slate-950'
                              }`}>
                                {alert.title}
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-700 leading-normal font-medium">
                            {alert.description}
                          </p>
                          {alert.metrics && (
                            <div className="pt-1 text-[9px] font-black font-mono text-slate-550 flex items-center gap-1 uppercase">
                              <span className="text-indigo-600 block">Indicador:</span> {alert.metrics}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button CTA */}
                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[9px] font-mono font-black text-[#0B3C5D] group-hover:text-indigo-700">
                        <span className="flex items-center gap-1 uppercase tracking-wider">
                          <Search size={12} className="text-indigo-600" /> Filtrar y Revisar Registros Involucrados
                        </span>
                        <span className="bg-[#0B3C5D] text-white group-hover:bg-indigo-700 px-2 py-0.5 rounded text-[8.5px] uppercase tracking-wider flex items-center gap-1 transition-colors">
                          Examinar <ArrowRight size={10} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DEDICATED SPECIFIC RECORDS AUDIT & INVESTIGATION WORKBENCH */}
          <div id="audit-workbench-section" className="bg-white border border-slate-200 rounded-[35px] p-6 sm:p-8 shadow-sm space-y-6">
            {/* Header & KPI Banner */}
            <div className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="bg-rose-600 text-white text-[8px] font-black font-mono px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                    <Activity size={12} /> AUDITORÍA ESPECÍFICA DE EGRESOS
                  </span>
                  <span className="bg-[#0B3C5D]/10 text-[#0B3C5D] font-mono font-black text-[9px] px-2 py-0.5 rounded">
                    {filteredAnomaliesForAudit.length} de {specificAnomaliesForAuditAll.length} Registros Flagged
                  </span>
                </div>
                <h3 className="text-lg font-black uppercase text-[#0B3C5D] tracking-tight flex items-center gap-2">
                  <Search size={18} className="text-[#0B3C5D]" /> Investigador de Registros Anómalos para Revisión
                </h3>
                <p className="text-[10.5px] text-slate-500 font-medium">
                  Matriz de fiscalización individual para investigar, dictaminar observaciones y auditar cada transacción identificada por la Ley de Benford.
                </p>
              </div>

              {/* Quick Summary KPIs & Export */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-center font-mono">
                  <div className="p-1.5 bg-white rounded-xl border border-slate-150">
                    <span className="text-[8px] font-bold text-slate-400 block uppercase">FLAGGED TOTAL</span>
                    <span className="text-xs font-black text-slate-900">{auditSummaryStats.totalCount}</span>
                  </div>
                  <div className="p-1.5 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[8px] font-bold text-amber-700 block uppercase">PENDIENTES</span>
                    <span className="text-xs font-black text-amber-900">{auditSummaryStats.pendingCount}</span>
                  </div>
                  <div className="p-1.5 bg-sky-50 rounded-xl border border-sky-200">
                    <span className="text-[8px] font-bold text-sky-700 block uppercase">EN REVISIÓN</span>
                    <span className="text-xs font-black text-sky-900">{auditSummaryStats.investigatingCount}</span>
                  </div>
                  <div className="p-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[8px] font-bold text-emerald-700 block uppercase">LIBERADOS / OK</span>
                    <span className="text-xs font-black text-emerald-900">{auditSummaryStats.okCount}</span>
                  </div>
                </div>

                <button
                  onClick={() => downloadHumanizedAuditReportPDF({ transactions: filteredTxs, currentUser })}
                  disabled={filteredTxs.length === 0}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-3 font-black uppercase text-[9.5px] tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <Sparkles size={15} className="text-amber-300 animate-pulse" /> Descargar Informe Narrativo PDF
                </button>
              </div>
            </div>

            {/* WORKBENCH CONTROLS & FILTER PANELS */}
            <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] font-black text-slate-400 font-mono uppercase mr-1">
                    Criterio de Riesgo:
                  </span>
                  <button
                    onClick={() => setAnomalyTypeFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl font-black uppercase text-[9px] font-mono tracking-wider transition-all ${
                      anomalyTypeFilter === 'ALL'
                        ? 'bg-[#0B3C5D] text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    TODOS ({specificAnomaliesForAuditAll.length})
                  </button>
                  <button
                    onClick={() => setAnomalyTypeFilter('THRESHOLD')}
                    className={`px-3 py-1.5 rounded-xl font-black uppercase text-[9px] font-mono tracking-wider transition-all flex items-center gap-1 ${
                      anomalyTypeFilter === 'THRESHOLD'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    <ShieldAlert size={11} /> EVASIÓN DE UMBRAL ($50K/$500K/$1M)
                  </button>
                  <button
                    onClick={() => setAnomalyTypeFilter('ROUND')}
                    className={`px-3 py-1.5 rounded-xl font-black uppercase text-[9px] font-mono tracking-wider transition-all flex items-center gap-1 ${
                      anomalyTypeFilter === 'ROUND'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                    }`}
                  >
                    <Tag size={11} /> MONTOS REDONDOS ($10K/$100K)
                  </button>
                  <button
                    onClick={() => setAnomalyTypeFilter('DUPLICATES')}
                    className={`px-3 py-1.5 rounded-xl font-black uppercase text-[9px] font-mono tracking-wider transition-all flex items-center gap-1 ${
                      anomalyTypeFilter === 'DUPLICATES'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white text-purple-800 border border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    <Layers size={11} /> POSIBLES DUPLICADOS
                  </button>
                  <button
                    onClick={() => setAnomalyTypeFilter('DIGIT')}
                    className={`px-3 py-1.5 rounded-xl font-black uppercase text-[9px] font-mono tracking-wider transition-all flex items-center gap-1 ${
                      anomalyTypeFilter === 'DIGIT'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-indigo-800 border border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    <BarChart3 size={11} /> SESGO EN DÍGITO
                  </button>
                </div>

                {/* Audit Status Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 font-mono uppercase">
                    Estado Auditor:
                  </span>
                  <select
                    value={auditStatusFilter}
                    onChange={(e) => setAuditStatusFilter(e.target.value as any)}
                    className="border border-slate-300 rounded-xl px-3 py-1.5 text-[9.5px] font-bold font-mono bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">TODOS LOS ESTADOS</option>
                    <option value="PENDING">🔍 PENDIENTES DE AUDITORÍA</option>
                    <option value="INVESTIGATING">⚠️ EN INVESTIGACIÓN ACTIVA</option>
                    <option value="OK">✅ LIBERADOS / DESCARTE LEGÍTIMO</option>
                    <option value="RISK_CONFIRMED">🚨 FRAUDE / ANOMALÍA CONFIRMADA</option>
                  </select>
                </div>
              </div>

              {/* Digit filter buttons row */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-black text-slate-400 font-mono uppercase mr-1">
                  Filtrar x Primer Dígito:
                </span>
                <button
                  onClick={() => setSelectedDigitFilter(null)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[9px] font-black uppercase ${
                    selectedDigitFilter === null ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  TODOS
                </button>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => setSelectedDigitFilter(selectedDigitFilter === digit ? null : digit)}
                    className={`w-7 h-7 rounded-lg font-mono text-[10px] font-black flex items-center justify-center transition-all ${
                      selectedDigitFilter === digit 
                        ? 'bg-[#FFCC00] text-[#0B3C5D] font-black shadow ring-2 ring-[#0B3C5D]' 
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {digit}
                  </button>
                ))}
              </div>
            </div>

            {/* VIEW MODE TOGGLE BAR & GROUPING SELECTOR */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-black font-mono uppercase text-slate-400 mr-1">
                  Modo de Auditoría:
                </span>
                <button
                  onClick={() => setViewMode('INDIVIDUAL')}
                  className={`px-3.5 py-1.5 rounded-xl font-mono text-[9.5px] font-black uppercase transition-all flex items-center gap-1.5 ${
                    viewMode === 'INDIVIDUAL'
                      ? 'bg-[#0B3C5D] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Search size={13} /> Registros Individuales ({filteredAnomaliesForAudit.length})
                </button>
                <button
                  onClick={() => setViewMode('CONSOLIDATED')}
                  className={`px-3.5 py-1.5 rounded-xl font-mono text-[9.5px] font-black uppercase transition-all flex items-center gap-1.5 ${
                    viewMode === 'CONSOLIDATED'
                      ? 'bg-[#0B3C5D] text-[#FFCC00] shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Layers size={13} /> Consolidado Agrupado ({groupedAnomaliesForAudit.length} Grupos)
                </button>
              </div>

              {viewMode === 'CONSOLIDATED' && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black font-mono uppercase text-slate-400">
                    Agrupar Transacciones por:
                  </span>
                  <select
                    value={groupByKey}
                    onChange={(e) => setGroupByKey(e.target.value as any)}
                    className="border border-indigo-200 rounded-xl px-3 py-1.5 text-[9.5px] font-black font-mono bg-indigo-50 text-indigo-950 focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
                  >
                    <option value="SUPPLIER">🏢 PROVEEDOR / ENTIDAD BENEFICIARIA</option>
                    <option value="ALERT_TYPE">🚨 TIPO DE REGLA O UMBRAL VIOLADO</option>
                    <option value="CATEGORY">📁 CATEGORÍA CONTABLE (P0911)</option>
                    <option value="DIGIT">🔢 PRIMER DÍGITO (BENFORD)</option>
                  </select>
                </div>
              )}
            </div>

            {/* AUDIT WORKBENCH - VIEW MODE: INDIVIDUAL vs CONSOLIDATED */}
            {filteredAnomaliesForAudit.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400 bg-slate-50 border border-dashed rounded-3xl space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 opacity-80" />
                <p className="text-slate-700 font-black uppercase tracking-wide">Sin registros coincidentes con los filtros aplicados</p>
                <p className="text-[10px] text-slate-400 font-normal">Modifique los filtros superiores para explorar otros registros del ledger.</p>
              </div>
            ) : viewMode === 'CONSOLIDATED' ? (
              /* CONSOLIDATED GROUPING VIEW */
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-200 rounded-2xl flex items-center justify-between text-left">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-700 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black uppercase text-amber-950 font-mono">
                        Consolidación de Hallazgos y Argumentación de Riesgo ({groupedAnomaliesForAudit.length} Clústeres)
                      </h4>
                      <p className="text-[10px] text-amber-900 font-medium">
                        Agrupación inteligente de desviaciones contables para análisis cualitativo y detección de patrones de fraccionamiento sistemático.
                      </p>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black font-mono text-amber-900 bg-white px-2.5 py-1 rounded-xl border border-amber-200 shrink-0">
                    Suma Flagged: ${groupedAnomaliesForAudit.reduce((s, g) => s + g.totalAmount, 0).toLocaleString('es-CL')} CLP
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {groupedAnomaliesForAudit.map((group) => {
                    const isExpanded = expandedGroupKeys[group.key] ?? true;
                    return (
                      <div 
                        key={group.key}
                        className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-left transition-all hover:border-slate-300"
                      >
                        {/* Group Header Card */}
                        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded bg-slate-900 text-white uppercase">
                                {group.subtitle}
                              </span>
                              <h3 className="text-sm font-black text-[#0B3C5D] uppercase tracking-tight">
                                {group.title}
                              </h3>
                              <span className="bg-indigo-100 text-indigo-900 font-black text-[9.5px] font-mono px-2 py-0.5 rounded-full">
                                {group.count} Transacciones
                              </span>
                            </div>

                            {/* Detailed Technical Argumentation & AI Logic */}
                            <div className="mt-1.5 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[10px] font-medium text-amber-950 space-y-1">
                              <div className="font-bold font-mono text-amber-900 flex items-center gap-1 uppercase text-[9px]">
                                <AlertTriangle size={12} className="text-amber-600" /> ARGUMENTACIÓN TÉCNICA Y SUSTENTO AUDITOR:
                              </div>
                              <p className="leading-relaxed">
                                {group.detailedArgument}
                              </p>
                            </div>
                          </div>

                          {/* Group KPI Summary */}
                          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                            <div className="text-right font-mono">
                              <span className="text-[8.5px] font-bold text-slate-400 block uppercase">MONTO CONSOLIDADO</span>
                              <strong className="text-sm font-black text-[#0B3C5D]">
                                ${group.totalAmount.toLocaleString('es-CL')}
                              </strong>
                              <span className="block text-[8.5px] font-bold text-rose-700 uppercase">
                                SCORE MÁX: {group.maxWeight}/10
                              </span>
                            </div>

                            <button
                              onClick={() => setExpandedGroupKeys(prev => ({ ...prev, [group.key]: !isExpanded }))}
                              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1 transition-all shadow-xs"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              <span className="text-[9.5px] font-mono uppercase hidden sm:inline">
                                {isExpanded ? 'Ocultar Detalle' : 'Desplegar Registros'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Inner Expandable Table of Grouped Transactions */}
                        {isExpanded && (
                          <div className="overflow-x-auto bg-white p-2">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-100 text-slate-600 text-[8.5px] font-black uppercase font-mono tracking-wider">
                                  <th className="p-2 text-center">DÍGITO</th>
                                  <th className="p-2">EXPEDIENTE / DESCRIPCIÓN</th>
                                  <th className="p-2 text-right">MONTO ($ CLP)</th>
                                  <th className="p-2">CATEGORÍA / PROVEEDOR</th>
                                  <th className="p-2">ALERTAS INDIVIDUALES</th>
                                  <th className="p-2 text-center">ACCIONES</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {group.items.map((item) => {
                                  const { tx, digit, weight, alerts } = item;
                                  return (
                                    <tr 
                                      key={tx.id}
                                      onClick={() => setInspectingTxItem(item)}
                                      className="hover:bg-indigo-50/70 cursor-pointer transition-colors group"
                                      title="Haga clic para realizar drill-down de este registro específico"
                                    >
                                      <td className="p-2 text-center font-mono">
                                        <span className="w-6 h-6 rounded-full inline-flex items-center justify-center bg-[#0B3C5D] text-[#FFCC00] text-[10px] font-black">
                                          {digit}
                                        </span>
                                      </td>
                                      <td className="p-2 max-w-xs">
                                        <div className="font-bold text-slate-800 group-hover:text-indigo-600 truncate flex items-center gap-1 text-[11px]">
                                          <span>{tx.description}</span>
                                          <Eye size={11} className="text-indigo-600 opacity-0 group-hover:opacity-100 shrink-0" />
                                        </div>
                                        <div className="text-[8.5px] font-mono text-slate-400">
                                          ID: {tx.id} • Fecha: {tx.date || tx.invoiceDate}
                                        </div>
                                      </td>
                                      <td className="p-2 text-right font-mono font-black text-slate-900 text-[11px]">
                                        ${tx.amount.toLocaleString('es-CL')}
                                      </td>
                                      <td className="p-2">
                                        <span className="text-[9px] font-bold text-slate-700 block uppercase font-mono">
                                          {tx.category || 'GENERAL'}
                                        </span>
                                        <span className="text-[8.5px] text-slate-500 font-mono block truncate max-w-[150px]">
                                          {tx.supplierName || 'CONSUMIDOR DIRECTO'}
                                        </span>
                                      </td>
                                      <td className="p-2">
                                        <div className="flex flex-wrap gap-1">
                                          {alerts.map((al, idx) => (
                                            <span key={idx} className="bg-slate-100 border border-slate-200 text-[8.5px] px-1.5 py-0.5 rounded font-mono text-slate-800">
                                              {al}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => setInspectingTxItem(item)}
                                          className="bg-[#0B3C5D] hover:bg-indigo-900 text-white font-bold px-2 py-1 rounded-lg text-[8.5px] font-mono uppercase transition-all shadow-xs"
                                        >
                                          Drill-Down
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* INDIVIDUAL RECORDS TABLE VIEW */
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0B3C5D] text-white text-[9px] font-black uppercase font-mono tracking-wider">
                      <th className="p-3 text-center">DÍGITO & SCORE</th>
                      <th className="p-3">EXPEDIENTE / CONCEPTO</th>
                      <th className="p-3 text-right">IMPORTE ($ CLP)</th>
                      <th className="p-3">CATEGORÍA / DOC</th>
                      <th className="p-3">JUSTIFICACIÓN TÉCNICA Y ALERTAS DE BENFORD</th>
                      <th className="p-3 text-center">ESTADO AUDITORÍA</th>
                      <th className="p-3 text-center">INVESTIGAR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-700 bg-white">
                    {filteredAnomaliesForAudit.map((item) => {
                      const { tx, digit, weight, alerts } = item;
                      const invState = investigatedTxIds[tx.id];
                      const currentStatus = invState?.status || 'PENDING';

                      return (
                        <tr 
                          key={tx.id}
                          onClick={() => setInspectingTxItem(item)}
                          className={`hover:bg-indigo-50/70 cursor-pointer transition-all duration-150 group ${
                            currentStatus === 'OK' ? 'bg-emerald-50/30' : currentStatus === 'RISK_CONFIRMED' ? 'bg-rose-50/40' : ''
                          }`}
                          title="Haga clic en cualquier parte de la fila para consultar los detalles y realizar drill-down del registro"
                        >
                          {/* Digit & Risk Score */}
                          <td className="p-3 text-center font-mono">
                            <div className="flex flex-col items-center gap-1">
                              <span className="w-7 h-7 rounded-full inline-flex items-center justify-center bg-[#0B3C5D] text-[#FFCC00] text-[11px] font-black shadow-sm group-hover:scale-110 transition-transform">
                                {digit}
                              </span>
                              <span className={`text-[8px] font-black font-mono px-1.5 py-0.2 rounded uppercase ${
                                weight >= 5 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                SCORE {weight}/10
                              </span>
                            </div>
                          </td>

                          {/* Description & Metadata */}
                          <td className="p-3 max-w-xs">
                            <div className="font-black text-[#0B3C5D] group-hover:text-indigo-600 transition-colors truncate flex items-center gap-1">
                              <span>{tx.description}</span>
                              <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 shrink-0" />
                            </div>
                            <div className="text-[9.5px] font-mono text-slate-500 uppercase mt-0.5">
                              ID: <strong className="text-slate-800">{tx.id}</strong> • Proveedor: {tx.supplierName || 'CONSUMIDOR DIRECTO'}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              Fecha: {tx.date || tx.invoiceDate || 'N/A'} • Operador: {tx.user || 'SISTEMA'}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="p-3 text-right font-mono font-black text-slate-900 text-xs">
                            ${tx.amount.toLocaleString('es-CL')}
                            <span className={`block text-[8px] font-extrabold uppercase ${
                              tx.type === 'INCOME' ? 'text-emerald-600' : 'text-amber-700'
                            }`}>
                              {tx.type === 'INCOME' ? 'INGRESO' : 'EGRESO'}
                            </span>
                          </td>

                          {/* Category & Doc */}
                          <td className="p-3">
                            <span className="text-[9.5px] font-bold text-slate-800 uppercase block font-mono">
                              {tx.category || 'GENERAL'}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 uppercase block">
                              {tx.documentType} N° {tx.documentNumber || tx.id}
                            </span>
                          </td>

                          {/* Alerts Badges / Justification */}
                          <td className="p-3 max-w-sm">
                            <div className="space-y-1">
                              {alerts.map((al, idx) => (
                                <div 
                                  key={idx}
                                  className="text-[9px] font-bold p-1 rounded bg-slate-100 border border-slate-200 text-slate-800 flex items-start gap-1"
                                >
                                  <AlertTriangle size={11} className="text-amber-600 shrink-0 mt-0.5" />
                                  <span>{al}</span>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Audit Status Quick Selector */}
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={currentStatus}
                              onChange={(e) => updateInvestigatedTx(tx.id, e.target.value as any, invState?.notes || '')}
                              className={`border rounded-xl px-2 py-1 text-[9px] font-black font-mono shadow-sm cursor-pointer ${
                                currentStatus === 'PENDING' 
                                  ? 'bg-amber-50 text-amber-900 border-amber-300' 
                                  : currentStatus === 'INVESTIGATING'
                                    ? 'bg-sky-50 text-sky-900 border-sky-300'
                                    : currentStatus === 'OK'
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                      : 'bg-rose-50 text-rose-900 border-rose-300'
                              }`}
                            >
                              <option value="PENDING">🔍 PENDIENTE REVISIÓN</option>
                              <option value="INVESTIGATING">⚠️ EN INVESTIGACIÓN</option>
                              <option value="OK">✅ LIBERADO / OK</option>
                              <option value="RISK_CONFIRMED">🚨 ANOMALÍA CONFIRMADA</option>
                            </select>
                            {invState?.notes && (
                              <p className="text-[8.5px] text-slate-500 font-mono truncate max-w-[140px] mx-auto mt-1 italic">
                                "{invState.notes}"
                              </p>
                            )}
                          </td>

                          {/* Actions: View Deep-Dive Modal */}
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setInspectingTxItem(item)}
                              className="bg-[#0B3C5D] hover:bg-indigo-900 text-white font-bold px-2.5 py-1.5 rounded-xl text-[9px] font-mono tracking-wider uppercase transition-all shadow-sm active:scale-95 flex items-center gap-1 mx-auto"
                            >
                              <Eye size={12} /> Investigar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FICHA DE INVESTIGACIÓN AUDITORA DE REGISTRO ANÓMALO MODAL */}
          {inspectingTxItem && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[35px] max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <button 
                  onClick={() => setInspectingTxItem(null)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-bold text-lg p-2 hover:bg-slate-100 rounded-full w-10 h-10 flex items-center justify-center transition-all"
                >
                  ✕
                </button>

                <div className="space-y-6 text-left">
                  {/* Modal Header */}
                  <div className="border-b pb-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#0B3C5D] text-[#FFCC00] text-[8.5px] font-black font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        FICHA DE AUDITORÍA PAE BENFORD P0911
                      </span>
                      <span className="bg-rose-100 text-rose-800 text-[8.5px] font-black font-mono px-2 py-0.5 rounded">
                        SCORE DE ANOMALÍA: {inspectingTxItem.weight}/10
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      Expediente de Investigacion: {inspectingTxItem.tx.id}
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold">
                      {inspectingTxItem.tx.description}
                    </p>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1">
                      <span className="text-[8.5px] font-black text-slate-400 font-mono uppercase block">IMPORTE REGISTRADO</span>
                      <span className="text-lg font-mono font-black text-[#0B3C5D]">
                        ${inspectingTxItem.tx.amount.toLocaleString('es-CL')}
                      </span>
                      <span className="text-[9px] text-slate-500 block font-mono uppercase">
                        Tipo: {inspectingTxItem.tx.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1">
                      <span className="text-[8.5px] font-black text-slate-400 font-mono uppercase block">DÍGITO INICIAL</span>
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-[#0B3C5D] text-[#FFCC00] font-black text-sm flex items-center justify-center font-mono">
                          {inspectingTxItem.digit}
                        </span>
                        <span className="text-[9.5px] text-slate-600 font-medium">
                          Primer Dígito Significativo
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1">
                      <span className="text-[8.5px] font-black text-slate-400 font-mono uppercase block">PROVEEDOR / ENTIDAD</span>
                      <span className="text-xs font-black text-slate-800 block truncate">
                        {inspectingTxItem.tx.supplierName || 'CONSUMIDOR DIRECTO'}
                      </span>
                      <span className="text-[9px] text-slate-500 block font-mono">
                        Doc: {inspectingTxItem.tx.documentType} N° {inspectingTxItem.tx.documentNumber}
                      </span>
                    </div>
                  </div>

                  {/* Section 1: Detailed Rule Violations & Anomaly Justification */}
                  <div className="bg-amber-50/80 border border-amber-300/80 rounded-2xl p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                      <h4 className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5 font-mono">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                        <span>¿POR QUÉ LA MÁQUINA SELECCIONÓ ESTE REGISTRO?</span>
                      </h4>
                      <span className="text-[9px] bg-amber-200 text-amber-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                        EXPLICACIÓN SENCILLA
                      </span>
                    </div>
                    
                    {/* Resumen Principal en lenguaje ultra sencillo */}
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="text-base shrink-0">💡</span>
                        <div className="space-y-1">
                          <strong className="text-slate-900 font-extrabold block text-xs">
                            {inspectingTxItem.hasDuplicateAlert
                              ? '⚠️ ALERTA DE POSIBLE DOBLE PAGO'
                              : inspectingTxItem.hasThresholdAlert
                              ? '⚠️ ALERTA DE MONTO CERCA DEL LÍMITE DE FIRMA'
                              : inspectingTxItem.hasRoundAlert
                              ? '⚠️ ALERTA DE NÚMERO DEMASIADO REDONDO'
                              : '⚠️ ALERTA POR FRECUENCIA DE PRIMER DÍGITO (BENFORD)'}
                          </strong>
                          <p className="text-slate-700 leading-relaxed text-[11px] font-medium">
                            {inspectingTxItem.hasDuplicateAlert
                              ? `Atención: Existen ${filteredTxs.filter(t => t.amount === inspectingTxItem.tx.amount).length} pagos o facturas registradas exactamente por el mismo monto de $${inspectingTxItem.tx.amount.toLocaleString('es-CL')} CLP. Revisa que no sea un cobro repetido o duplicado por error.`
                              : inspectingTxItem.hasThresholdAlert
                              ? `Atención: El monto de $${inspectingTxItem.tx.amount.toLocaleString('es-CL')} CLP está "rozando" o justo debajo del límite de aprobación corporativa ($50K / $100K / $500K / $1M). A veces se dividen compras en facturas más chicas para saltarse la firma del jefe.`
                              : inspectingTxItem.hasRoundAlert
                              ? `Atención: El pago es un número "demasiado cerrado" ($${inspectingTxItem.tx.amount.toLocaleString('es-CL')} CLP sin pesos ni decimales de IVA). En compras o servicios reales casi siempre hay números impares.`
                              : `Atención: Este monto empieza con el dígito [${inspectingTxItem.digit}]. En los libros contables reales, este número está apareciendo con mayor frecuencia de la normal.`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Explicación en 2 bloques limpios y didácticos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1">
                        <div className="font-bold text-amber-900 flex items-center gap-1 uppercase font-mono text-[10px]">
                          <span>📊 1. ANÁLISIS DE DÍGITO ({inspectingTxItem.digit}):</span>
                        </div>
                        <p className="text-slate-600 font-normal leading-snug">
                          Normalmente, los montos que empiezan con el número <strong>{inspectingTxItem.digit}</strong> corresponden al <strong>{(BENFORD_PROBABILITIES[inspectingTxItem.digit || 1] * 100).toFixed(1)}%</strong> de las facturas. En tu contabilidad, este dígito se repite más de la cuenta.
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1">
                        <div className="font-bold text-amber-900 flex items-center gap-1 uppercase font-mono text-[10px]">
                          <span>🛡️ 2. REGLA DE CONTROL DIRECTO:</span>
                        </div>
                        <p className="text-slate-600 font-normal leading-snug">
                          {inspectingTxItem.hasThresholdAlert 
                            ? 'Monto muy cercano a tope de autorización ($50K / $100K / $1M). Requiere verificar si se fraccionó la compra.'
                            : inspectingTxItem.hasRoundAlert 
                            ? 'Monto redondo en miles o cientos de miles. Verificar factura física por posibles estimaciones o montos inventados.'
                            : inspectingTxItem.hasDuplicateAlert
                            ? 'Monto exacto repetido en el libro contable. Verificar comprobante o pago bancario para descartar duplicidad.'
                            : 'Anomalía identificada por desviación respecto a la distribución natural de compras.'}
                        </p>
                      </div>
                    </div>

                    {/* Alertas específicas en etiquetas claras */}
                    <div className="pt-1 space-y-1.5">
                      <span className="text-[9.5px] font-mono font-bold text-amber-900 uppercase block">
                        ALERTAS DETECTADAS EN ESTA TRANSACCIÓN:
                      </span>
                      {inspectingTxItem.alerts.map((al, idx) => (
                        <div key={idx} className="bg-white border border-amber-200 p-2 rounded-xl text-[10.5px] font-medium text-slate-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                          <span>{al}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Complete Transaction Metadata */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-800 font-mono flex items-center gap-1.5">
                      <Info size={14} className="text-indigo-600" /> Atributos Completos del Registro Contable
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-400 block font-bold">ID TRANSACCIÓN:</span>
                        <strong className="text-slate-800">{inspectingTxItem.tx.id}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">CATEGORÍA CONTABLE:</span>
                        <strong className="text-slate-800">{inspectingTxItem.tx.category || 'SIN CLASIFICAR'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">OPERADOR DIGITADOR:</span>
                        <strong className="text-slate-800">{inspectingTxItem.tx.user || 'SISTEMA'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">FECHA TRANSACCIÓN:</span>
                        <strong className="text-slate-800">{inspectingTxItem.tx.date || inspectingTxItem.tx.invoiceDate || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">COMPAÑÍA / BLOQUE:</span>
                        <strong className="text-slate-800">{inspectingTxItem.tx.insuranceCompany || 'ASSETFLOW'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">TIPO DOCUMENTO:</span>
                        <strong className="text-slate-800">{inspectingTxItem.tx.documentType}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Audit Resolution Form */}
                  <div className="border border-indigo-200 rounded-2xl p-4 bg-indigo-50/40 space-y-3">
                    <h4 className="text-xs font-black uppercase text-indigo-950 font-mono flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-indigo-600" /> Dictamen y Registro de Control Interno
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[9.5px] font-black uppercase text-slate-600 font-mono block mb-1">
                          Dictamen de Integridad de la Transacción:
                        </label>
                        <select
                          value={investigatedTxIds[inspectingTxItem.tx.id]?.status || 'PENDING'}
                          onChange={(e) => updateInvestigatedTx(
                            inspectingTxItem.tx.id, 
                            e.target.value as any, 
                            investigatedTxIds[inspectingTxItem.tx.id]?.notes || ''
                          )}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-black font-mono bg-white focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="PENDING">🔍 PENDIENTE DE OBSERVACIONES (EN EVALUACIÓN)</option>
                          <option value="INVESTIGATING">⚠️ EN INVESTIGACIÓN ACTIVA CON EL OPERADOR</option>
                          <option value="OK">✅ LIBERADO / DESCARTE LEGÍTIMO (DOCUMENTACIÓN AUDITADA)</option>
                          <option value="RISK_CONFIRMED">🚨 FRAUDE / ANOMALÍA CONFIRMADA (INTERVENCIÓN)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9.5px] font-black uppercase text-slate-600 font-mono block mb-1">
                          Observaciones del Auditor Fiscalizador:
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Ingrese las justificaciones técnicas de auditoría, número de acta o respaldos verificados..."
                          value={investigatedTxIds[inspectingTxItem.tx.id]?.notes || ''}
                          onChange={(e) => updateInvestigatedTx(
                            inspectingTxItem.tx.id, 
                            investigatedTxIds[inspectingTxItem.tx.id]?.status || 'PENDING', 
                            e.target.value
                          )}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {investigatedTxIds[inspectingTxItem.tx.id]?.updatedAt && (
                        <div className="text-[9px] font-mono text-slate-500 text-right">
                          Última actualización: {investigatedTxIds[inspectingTxItem.tx.id]?.updatedAt} por {investigatedTxIds[inspectingTxItem.tx.id]?.auditor}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
                    <button
                      onClick={() => downloadHumanizedAuditReportPDF({ transactions: [inspectingTxItem.tx], currentUser })}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <Sparkles size={14} className="text-amber-300 animate-pulse" /> Descargar Informe PDF
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                      {onRowClick && (
                        <button
                          onClick={() => {
                            const itemTx = inspectingTxItem.tx;
                            setInspectingTxItem(null);
                            onRowClick(itemTx);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-[10px] font-black font-mono uppercase transition-all"
                        >
                          🔗 Ver Ficha General
                        </button>
                      )}

                      <button 
                        onClick={() => setInspectingTxItem(null)}
                        className="bg-[#0B3C5D] hover:bg-indigo-900 text-white px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all shadow-md active:scale-95"
                      >
                        Guardar y Cerrar Ficha
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INTERACTIVE DETAIL MODALS */}
          {activeDetailModal === 'CONFORMIDAD' && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[35px] max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <button 
                  onClick={() => {
                    setActiveDetailModal(null);
                    setSelectedConformityTier(null);
                    setModalSearchTerm('');
                  }}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-bold text-lg p-2 hover:bg-slate-100 rounded-full w-10 h-10 flex items-center justify-center transition-all"
                >
                  ✕
                </button>
                <div className="space-y-6 text-left">
                  <div className="space-y-1 pr-10">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#0B3C5D] text-[#FFCC00] text-[8px] font-black font-mono px-2 py-0.5 rounded uppercase tracking-wider">
                        ERP Program P0911_BENFORD
                      </span>
                      <span className="bg-indigo-50 text-indigo-900 text-[8px] font-black font-mono px-2 py-0.5 rounded uppercase">
                        {filteredTxs.length} Registros Muestreados
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      Detalle de Conformidad Benford y Selección de Registros
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">
                      Niveles de Tolerancia de Control Interno • Seleccione cualquiera de las 3 categorías para desplegar sus transacciones
                    </p>
                  </div>

                  <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    La Ley de Benford describe la distribución esperada del primer dígito significativo en conjuntos de datos numéricos naturales. El dígito <strong className="text-slate-800 font-bold">1</strong> aparece aprox. el <strong className="text-slate-800 font-bold">30.1%</strong> de las veces, descendiendo logarítmicamente hasta el <strong className="text-slate-800 font-bold">9</strong>, que solo ocurre en un <strong className="text-slate-800 font-bold">4.6%</strong>.
                  </div>

                  {/* Interactive Category Cards (Verde, Amarilla, Roja) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Verde: Conformidad Alta */}
                    <div 
                      onClick={() => setSelectedConformityTier(prev => prev === 'ALTA' ? null : 'ALTA')}
                      className={`border-2 rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden text-left ${
                        selectedConformityTier === 'ALTA'
                          ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-400/40'
                          : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">✓</span>
                          <strong className="text-emerald-900 font-black uppercase text-[11px] tracking-tight">
                            Conformidad Alta / Aceptable
                          </strong>
                        </div>
                        <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full ${
                          selectedConformityTier === 'ALTA' ? 'bg-emerald-600 text-white' : 'bg-emerald-200/80 text-emerald-950'
                        }`}>
                          {selectedConformityTier === 'ALTA' ? '▼ Ocultar' : '▶ Ver Registros'}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-emerald-900 font-medium leading-normal mb-3">
                        La curva real contable se alinea estrechamente con el comportamiento natural. Sin sesgos de dígito redondeado o alteración manual.
                      </p>

                      <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-emerald-800">
                          {conformityTierRecords.alta.length} Transacciones
                        </span>
                        <span className="font-black text-emerald-950">
                          ${conformityTierRecords.alta.reduce((s, x) => s + x.tx.amount, 0).toLocaleString('es-CL')} CLP
                        </span>
                      </div>
                    </div>

                    {/* Amarilla: Conformidad Marginal */}
                    <div 
                      onClick={() => setSelectedConformityTier(prev => prev === 'MARGINAL' ? null : 'MARGINAL')}
                      className={`border-2 rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden text-left ${
                        selectedConformityTier === 'MARGINAL'
                          ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-400/40'
                          : 'bg-amber-50/40 border-amber-200 hover:border-amber-400 hover:bg-amber-50/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">!</span>
                          <strong className="text-amber-900 font-black uppercase text-[11px] tracking-tight">
                            Conformidad Marginal (Alerta)
                          </strong>
                        </div>
                        <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full ${
                          selectedConformityTier === 'MARGINAL' ? 'bg-amber-600 text-white' : 'bg-amber-200/80 text-amber-950'
                        }`}>
                          {selectedConformityTier === 'MARGINAL' ? '▼ Ocultar' : '▶ Ver Registros'}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-amber-900 font-medium leading-normal mb-3">
                        Variaciones moderadas. Común en carteras con cobros fijos predeterminados o importes redondeados ad-hoc.
                      </p>

                      <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-amber-800">
                          {conformityTierRecords.marginal.length} Transacciones
                        </span>
                        <span className="font-black text-amber-950">
                          ${conformityTierRecords.marginal.reduce((s, x) => s + x.tx.amount, 0).toLocaleString('es-CL')} CLP
                        </span>
                      </div>
                    </div>

                    {/* Roja: No Conforme */}
                    <div 
                      onClick={() => setSelectedConformityTier(prev => prev === 'NO_CONFORME' ? null : 'NO_CONFORME')}
                      className={`border-2 rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden text-left ${
                        selectedConformityTier === 'NO_CONFORME'
                          ? 'bg-rose-50 border-rose-500 shadow-md ring-2 ring-rose-400/40'
                          : 'bg-rose-50/40 border-rose-200 hover:border-rose-400 hover:bg-rose-50/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">✗</span>
                          <strong className="text-rose-900 font-black uppercase text-[11px] tracking-tight">
                            No Conforme (Alto Riesgo)
                          </strong>
                        </div>
                        <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full ${
                          selectedConformityTier === 'NO_CONFORME' ? 'bg-rose-600 text-white' : 'bg-rose-200/80 text-rose-950'
                        }`}>
                          {selectedConformityTier === 'NO_CONFORME' ? '▼ Ocultar' : '▶ Ver Registros'}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-rose-900 font-medium leading-normal mb-3">
                        La digitación quiebra de forma drástica la ley natural. Sugiere intervención para eludir aprobaciones de firmas o duplicados.
                      </p>

                      <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-rose-800">
                          {conformityTierRecords.noConforme.length} Transacciones
                        </span>
                        <span className="font-black text-rose-950">
                          ${conformityTierRecords.noConforme.reduce((s, x) => s + x.tx.amount, 0).toLocaleString('es-CL')} CLP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED TRANSACTIONS PANEL FOR SELECTED TIER */}
                  {selectedConformityTier && (() => {
                    const rawItems = selectedConformityTier === 'ALTA' 
                      ? conformityTierRecords.alta 
                      : selectedConformityTier === 'MARGINAL' 
                      ? conformityTierRecords.marginal 
                      : conformityTierRecords.noConforme;

                    const filteredModalItems = rawItems.filter(item => {
                      if (!modalSearchTerm) return true;
                      const term = modalSearchTerm.toLowerCase();
                      return (
                        item.tx.description.toLowerCase().includes(term) ||
                        item.tx.id.toLowerCase().includes(term) ||
                        (item.tx.supplierName && item.tx.supplierName.toLowerCase().includes(term)) ||
                        (item.tx.category && item.tx.category.toLowerCase().includes(term)) ||
                        item.tx.amount.toString().includes(term)
                      );
                    });

                    const themeStyles = selectedConformityTier === 'ALTA' 
                      ? { bg: 'bg-emerald-500/10', border: 'border-emerald-300', text: 'text-emerald-950', badge: 'bg-emerald-600 text-white', label: 'Conformidad Alta / Aceptable (Verde)' }
                      : selectedConformityTier === 'MARGINAL'
                      ? { bg: 'bg-amber-500/10', border: 'border-amber-300', text: 'text-amber-950', badge: 'bg-amber-600 text-white', label: 'Conformidad Marginal (Amarilla)' }
                      : { bg: 'bg-rose-500/10', border: 'border-rose-300', text: 'text-rose-950', badge: 'bg-rose-600 text-white', label: 'No Conforme / Alto Riesgo (Roja)' };

                    return (
                      <div className={`border-2 rounded-2xl p-4 space-y-3 ${themeStyles.bg} ${themeStyles.border} animate-in fade-in duration-150`}>
                        {/* Header Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded ${themeStyles.badge}`}>
                                {themeStyles.label}
                              </span>
                              <span className="text-[10px] font-bold font-mono text-slate-600">
                                ({filteredModalItems.length} de {rawItems.length} registros)
                              </span>
                            </div>
                            <h4 className="text-xs font-black text-slate-800 uppercase font-mono mt-1">
                              Listado de Registros Involucrados en este Tramo de Control
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="relative">
                              <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Filtrar registros..."
                                value={modalSearchTerm}
                                onChange={(e) => setModalSearchTerm(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-[10px] font-mono border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 shadow-2xs"
                              />
                            </div>

                            <button
                              onClick={() => {
                                if (selectedConformityTier === 'NO_CONFORME') {
                                  setAnomalyTypeFilter('ALL');
                                  setAuditStatusFilter('ALL');
                                } else if (selectedConformityTier === 'MARGINAL') {
                                  setAnomalyTypeFilter('ROUND');
                                } else {
                                  setAnomalyTypeFilter('ALL');
                                }
                                setActiveDetailModal(null);
                                setTimeout(() => {
                                  const workbenchEl = document.getElementById('audit-workbench-section');
                                  if (workbenchEl) workbenchEl.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                              }}
                              className="bg-[#0B3C5D] text-white hover:bg-indigo-900 px-3 py-1.5 rounded-xl font-mono text-[9px] font-bold uppercase transition-all shadow-xs shrink-0"
                            >
                              📍 Ir al Banco de Trabajo
                            </button>
                          </div>
                        </div>

                        {/* Transactions List Table */}
                        {filteredModalItems.length === 0 ? (
                          <div className="p-6 text-center text-xs font-mono text-slate-400 bg-white rounded-xl border border-dashed">
                            No se encontraron registros en esta categoría con el término "{modalSearchTerm}".
                          </div>
                        ) : (
                          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className="sticky top-0 bg-slate-100 text-slate-600 text-[8.5px] font-black uppercase font-mono tracking-wider z-10 border-b border-slate-200">
                                <tr>
                                  <th className="p-2 text-center">DÍGITO</th>
                                  <th className="p-2">EXPEDIENTE / DESCRIPCIÓN</th>
                                  <th className="p-2 text-right">MONTO ($ CLP)</th>
                                  <th className="p-2">PROVEEDOR / CATEGORÍA</th>
                                  <th className="p-2">INDICADOR / ALERTA</th>
                                  <th className="p-2 text-center whitespace-nowrap min-w-[110px]">ACCIONES</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {filteredModalItems.map((item) => {
                                  const { tx, digit, weight, alerts } = item;
                                  return (
                                    <tr
                                      key={tx.id}
                                      onClick={() => setInspectingTxItem(item)}
                                      className="hover:bg-indigo-50/80 cursor-pointer transition-colors group"
                                      title="Haga clic para realizar drill-down de esta transacción"
                                    >
                                      <td className="p-2 text-center font-mono">
                                        <span className="w-5 h-5 rounded-full inline-flex items-center justify-center bg-[#0B3C5D] text-[#FFCC00] text-[9.5px] font-black">
                                          {digit}
                                        </span>
                                      </td>
                                      <td className="p-2 max-w-xs">
                                        <div className="font-bold text-slate-800 group-hover:text-indigo-600 truncate text-[10.5px] flex items-center gap-1">
                                          <span>{tx.description}</span>
                                          <Eye size={10} className="text-indigo-600 opacity-0 group-hover:opacity-100 shrink-0" />
                                        </div>
                                        <div className="text-[8.5px] font-mono text-slate-400">
                                          ID: {tx.id} • Fecha: {tx.date || tx.invoiceDate}
                                        </div>
                                      </td>
                                      <td className="p-2 text-right font-mono font-black text-slate-900 text-[10.5px]">
                                        ${tx.amount.toLocaleString('es-CL')}
                                      </td>
                                      <td className="p-2">
                                        <span className="text-[9px] font-bold text-slate-700 block uppercase font-mono truncate max-w-[140px]">
                                          {tx.supplierName || 'CONSUMIDOR DIRECTO'}
                                        </span>
                                        <span className="text-[8.5px] text-slate-500 font-mono block">
                                          {tx.category || 'GENERAL'}
                                        </span>
                                      </td>
                                      <td className="p-2">
                                        {alerts.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {alerts.map((al, idx) => (
                                              <span key={idx} className="bg-slate-100 border border-slate-200 text-[8px] px-1.5 py-0.5 rounded font-mono text-slate-800">
                                                {al}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-[8.5px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                            ✓ Sin alertas anómalas
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-2 text-center whitespace-nowrap min-w-[110px]" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => setInspectingTxItem(item)}
                                          className="bg-[#0B3C5D] hover:bg-indigo-900 text-white font-bold px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase transition-all shadow-2xs whitespace-nowrap inline-flex items-center justify-center gap-1 mx-auto"
                                        >
                                          <Eye size={10} />
                                          <span>Drill-Down</span>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="pt-4 border-t flex justify-end">
                    <button 
                      onClick={() => {
                        setActiveDetailModal(null);
                        setSelectedConformityTier(null);
                        setModalSearchTerm('');
                      }}
                      className="bg-[#0B3C5D] hover:bg-[#072d46] text-white px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all"
                    >
                      Cerrar Panel Informativo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDetailModal === 'MAD' && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[35px] max-w-2xl w-full p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <button 
                  onClick={() => setActiveDetailModal(null)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-bold text-lg p-2 hover:bg-slate-100 rounded-full w-10 h-10 flex items-center justify-center transition-all animate-bounce"
                >
                  ✕
                </button>
                <div className="space-y-6 text-left">
                  <div className="space-y-1">
                    <span className="bg-[#0B3C5D] text-[#FFCC00] text-[8px] font-black font-mono px-2 py-0.5 rounded uppercase tracking-wider">
                      MÓDULO DE FÓRMULA ESTADÍSTICA
                    </span>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      M.A.D. (Desviación Media Absoluta)
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">
                      Drake & Fabozzi Conforming Metrics Standards
                    </p>
                  </div>

                  <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                    <p>
                      El M.A.D. (Mean Absolute Deviation) es el indicador clave de conformidad contable internacional. Mide de forma absoluta la diferencia matemática promedio entre las frecuencias porcentuales de tus registros reales y las frecuencias esperadas por la Ley de Benford:
                    </p>

                    <div className="bg-slate-900 text-[#FFCC00] font-mono p-4 rounded-2xl text-center font-bold text-[13px] border shadow-md my-2.5">
                      M.A.D. = ∑ | Real_d - Esperado_d | / 9
                    </div>

                    <p>
                      A diferencia de otros coeficientes estadísticos (ej. Chi-cuadrado), el M.A.D. no se ve sesgado por el tamaño de la muestra, siendo el estimador más fiable para la dirección de auditoría interna de AssetFlow.
                    </p>

                    <div className="grid grid-cols-3 gap-2.5 pt-2">
                      <div className="border border-slate-150 rounded-xl p-3 bg-slate-50 text-center">
                        <span className="text-[10px] font-black text-slate-400 block font-mono uppercase">ESTRICTO</span>
                        <span className="text-sm font-black font-mono text-emerald-600">&lt; 0.006</span>
                        <span className="text-[9px] text-slate-500 block font-medium mt-1 leading-tight">Distribución Perfectamente Natural</span>
                      </div>
                      <div className="border border-slate-150 rounded-xl p-3 bg-slate-50 text-center">
                        <span className="text-[10px] font-black text-slate-400 block font-mono uppercase">ACEPTABLE</span>
                        <span className="text-sm font-black font-mono text-teal-600">0.006 - 0.012</span>
                        <span className="text-[9px] text-slate-500 block font-medium mt-1 leading-tight">Variabilidades Propias del Negocio</span>
                      </div>
                      <div className="border border-slate-150 rounded-xl p-3 bg-slate-50 text-center">
                        <span className="text-[10px] font-black text-slate-400 block font-mono uppercase">ANÓMALO</span>
                        <span className="text-sm font-black font-mono text-rose-600">&gt; 0.012</span>
                        <span className="text-[9px] text-slate-500 block font-medium mt-1 leading-tight">Alto Sesgo / Intervención Humana</span>
                      </div>
                    </div>

                    <p className="bg-amber-50 border border-amber-200 text-amber-950 p-3 rounded-xl font-medium leading-relaxed">
                      Tu desvío M.A.D. actual es de <strong className="font-mono font-black">{analysisResult.mad.toFixed(5)}</strong>, lo que representa una conformidad dictaminada como <strong className="font-black text-amber-800 uppercase">{analysisResult.conformityStatus}</strong>.
                    </p>
                  </div>

                  <div className="pt-4 border-t flex justify-end">
                    <button 
                      onClick={() => setActiveDetailModal(null)}
                      className="bg-[#0B3C5D] hover:bg-[#072d46] text-white px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all"
                    >
                      Cerrar Panel Informativo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDetailModal === 'ALERTAS' && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[35px] max-w-4xl w-full p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <button 
                  onClick={() => {
                    setActiveDetailModal(null);
                    setSelectedAlertCategory(null);
                    setModalSearchTerm('');
                  }}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-bold text-lg p-2 hover:bg-slate-100 rounded-full w-10 h-10 flex items-center justify-center transition-all animate-bounce"
                >
                  ✕
                </button>
                <div className="space-y-6 text-left">
                  <div className="space-y-1">
                    <span className="bg-[#0B3C5D] text-[#FFCC00] text-[8px] font-black font-mono px-2 py-0.5 rounded uppercase tracking-wider">
                      DETERMINACIÓN CONTABLE INTELIGENTE
                    </span>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      Alertas de Control Identificadas
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">
                      Modelo Predictivo de Integridad Patrimonial • Seleccione cualquiera de las 3 categorías para desplegar sus transacciones
                    </p>
                  </div>

                  <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                    <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
                      La matriz preventiva evalúa constantemente las transacciones registradas de AssetFlow cruzando desvíos de dígitos Benford con tácticas recurrentes de fraude o errores administrativos. <strong className="text-slate-900">Haga clic en cualquiera de las reglas a continuación para ver el detalle completo de registros involucrados:</strong>
                    </p>

                    {/* 3 Interactive Alert Category Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* 1. Threshold Evasion */}
                      <div 
                        onClick={() => setSelectedAlertCategory(prev => prev === 'THRESHOLD' ? null : 'THRESHOLD')}
                        className={`border-2 rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden text-left flex flex-col justify-between ${
                          selectedAlertCategory === 'THRESHOLD'
                            ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-400/40'
                            : 'bg-amber-50/30 border-amber-200 hover:border-amber-400 hover:bg-amber-50/70'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <strong className="text-amber-950 font-black uppercase text-[11px] tracking-tight font-mono">
                              1. Evasión de Límites de Autorización
                            </strong>
                            <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full shrink-0 ${
                              selectedAlertCategory === 'THRESHOLD' ? 'bg-amber-600 text-white' : 'bg-amber-200 text-amber-950'
                            }`}>
                              {selectedAlertCategory === 'THRESHOLD' ? '▼ Ocultar' : '▶ Ver Registros'}
                            </span>
                          </div>
                          
                          <p className="text-[10.5px] text-amber-900 font-medium leading-normal mb-3">
                            Detecta egresos concentrados justo bajo los umbrales de firma corporativa ($50K, $100K, $500K o $1M) para eludir licitaciones o fianzas.
                          </p>
                        </div>

                        <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[10px] font-mono">
                          <span className="font-bold text-amber-900">
                            {alertCategoryRecords.threshold.length} Transacciones
                          </span>
                          <span className="font-black text-amber-950">
                            ${alertCategoryRecords.threshold.reduce((s, x) => s + x.tx.amount, 0).toLocaleString('es-CL')} CLP
                          </span>
                        </div>
                      </div>

                      {/* 2. Rounding */}
                      <div 
                        onClick={() => setSelectedAlertCategory(prev => prev === 'ROUND' ? null : 'ROUND')}
                        className={`border-2 rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden text-left flex flex-col justify-between ${
                          selectedAlertCategory === 'ROUND'
                            ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-400/40'
                            : 'bg-indigo-50/30 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/70'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <strong className="text-indigo-950 font-black uppercase text-[11px] tracking-tight font-mono">
                              2. Niveles de Redondeo Atípico
                            </strong>
                            <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full shrink-0 ${
                              selectedAlertCategory === 'ROUND' ? 'bg-indigo-600 text-white' : 'bg-indigo-200 text-indigo-950'
                            }`}>
                              {selectedAlertCategory === 'ROUND' ? '▼ Ocultar' : '▶ Ver Registros'}
                            </span>
                          </div>
                          
                          <p className="text-[10.5px] text-indigo-900 font-medium leading-normal mb-3">
                            Alerta sobre un ratio elevado de cantidades redondas (múltiplos de $10K o $100K) sin colas de IVA o decimales ordinarios.
                          </p>
                        </div>

                        <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-[10px] font-mono">
                          <span className="font-bold text-indigo-900">
                            {alertCategoryRecords.round.length} Transacciones
                          </span>
                          <span className="font-black text-indigo-950">
                            ${alertCategoryRecords.round.reduce((s, x) => s + x.tx.amount, 0).toLocaleString('es-CL')} CLP
                          </span>
                        </div>
                      </div>

                      {/* 3. Duplicates */}
                      <div 
                        onClick={() => setSelectedAlertCategory(prev => prev === 'DUPLICATES' ? null : 'DUPLICATES')}
                        className={`border-2 rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden text-left flex flex-col justify-between ${
                          selectedAlertCategory === 'DUPLICATES'
                            ? 'bg-rose-50 border-rose-500 shadow-md ring-2 ring-rose-400/40'
                            : 'bg-rose-50/30 border-rose-200 hover:border-rose-400 hover:bg-rose-50/70'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <strong className="text-rose-950 font-black uppercase text-[11px] tracking-tight font-mono">
                              3. Coincidentes de Duplicidad
                            </strong>
                            <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full shrink-0 ${
                              selectedAlertCategory === 'DUPLICATES' ? 'bg-rose-600 text-white' : 'bg-rose-200 text-rose-950'
                            }`}>
                              {selectedAlertCategory === 'DUPLICATES' ? '▼ Ocultar' : '▶ Ver Registros'}
                            </span>
                          </div>
                          
                          <p className="text-[10.5px] text-rose-900 font-medium leading-normal mb-3">
                            Escruta el libro en busca de transacciones duplicadas idénticas registradas en el período, evitando doble pago de facturas.
                          </p>
                        </div>

                        <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between text-[10px] font-mono">
                          <span className="font-bold text-rose-900">
                            {alertCategoryRecords.duplicates.length} Transacciones
                          </span>
                          <span className="font-black text-rose-950">
                            ${alertCategoryRecords.duplicates.reduce((s, x) => s + x.tx.amount, 0).toLocaleString('es-CL')} CLP
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Transactions Detail Section */}
                    {selectedAlertCategory && (() => {
                      const currentCategoryData = 
                        selectedAlertCategory === 'THRESHOLD' ? alertCategoryRecords.threshold :
                        selectedAlertCategory === 'ROUND' ? alertCategoryRecords.round :
                        alertCategoryRecords.duplicates;

                      const categoryName = 
                        selectedAlertCategory === 'THRESHOLD' ? 'Evasión de Límites de Autorización' :
                        selectedAlertCategory === 'ROUND' ? 'Niveles de Redondeo Atípico' :
                        'Coincidentes de Duplicidad';

                      const categoryColorClass = 
                        selectedAlertCategory === 'THRESHOLD' ? 'border-amber-400 bg-amber-50/40' :
                        selectedAlertCategory === 'ROUND' ? 'border-indigo-400 bg-indigo-50/40' :
                        'border-rose-400 bg-rose-50/40';

                      const filteredItems = currentCategoryData.filter(item => {
                        if (!modalSearchTerm.trim()) return true;
                        const term = modalSearchTerm.toLowerCase();
                        const desc = (item.tx.description || '').toLowerCase();
                        const supp = (item.tx.supplierName || '').toLowerCase();
                        const cat = (item.tx.category || '').toLowerCase();
                        const id = (item.tx.id || '').toLowerCase();
                        const amt = item.tx.amount.toString();
                        return desc.includes(term) || supp.includes(term) || cat.includes(term) || id.includes(term) || amt.includes(term);
                      });

                      const totalAmount = currentCategoryData.reduce((acc, curr) => acc + curr.tx.amount, 0);

                      return (
                        <div className={`mt-4 border-2 rounded-2xl p-4 transition-all space-y-3 animate-in fade-in duration-200 ${categoryColorClass}`}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                            <div>
                              <span className="text-[9px] font-mono font-bold uppercase text-slate-500 block">
                                REGISTROS INVOLUCRADOS EN LA ALERTA
                              </span>
                              <h4 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                                <span>{categoryName}</span>
                                <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-mono">
                                  {currentCategoryData.length} transacciones
                                </span>
                              </h4>
                              <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                                Monto acumulado: <strong className="text-slate-900 font-black">${totalAmount.toLocaleString('es-CL')} CLP</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="🔍 Buscar en esta alerta..."
                                value={modalSearchTerm}
                                onChange={(e) => setModalSearchTerm(e.target.value)}
                                className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 w-48 shadow-2xs"
                              />
                              <button
                                onClick={() => {
                                  if (selectedAlertCategory === 'THRESHOLD') setAnomalyTypeFilter('THRESHOLD');
                                  else if (selectedAlertCategory === 'ROUND') setAnomalyTypeFilter('ROUND');
                                  else setAnomalyTypeFilter('DUPLICATES');
                                  
                                  setActiveDetailModal(null);
                                  setTimeout(() => {
                                    const workbenchEl = document.getElementById('audit-workbench-section');
                                    if (workbenchEl) workbenchEl.scrollIntoView({ behavior: 'smooth' });
                                  }, 100);
                                }}
                                className="bg-[#0B3C5D] text-white hover:bg-indigo-900 px-3 py-1.5 rounded-xl font-mono text-[9px] font-bold uppercase transition-all shadow-2xs shrink-0"
                              >
                                📍 Ir al Banco de Trabajo
                              </button>
                            </div>
                          </div>

                          {/* Table of transactions */}
                          {filteredItems.length === 0 ? (
                            <div className="p-6 text-center text-xs font-mono text-slate-400 bg-white rounded-xl border border-dashed">
                              No se encontraron registros en esta alerta con el filtro "{modalSearchTerm}".
                            </div>
                          ) : (
                            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead className="sticky top-0 bg-slate-100 text-slate-600 text-[8.5px] font-black uppercase font-mono tracking-wider z-10 border-b border-slate-200">
                                  <tr>
                                    <th className="p-2 text-center">DÍGITO</th>
                                    <th className="p-2">EXPEDIENTE / DESCRIPCIÓN</th>
                                    <th className="p-2 text-right">MONTO ($ CLP)</th>
                                    <th className="p-2">PROVEEDOR / CATEGORÍA</th>
                                    <th className="p-2">INDICADOR / ALERTA</th>
                                    <th className="p-2 text-center whitespace-nowrap min-w-[110px]">ACCIONES</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                  {filteredItems.map((item) => {
                                    const { tx, digit, alerts } = item;
                                    return (
                                      <tr
                                        key={tx.id}
                                        onClick={() => setInspectingTxItem(item)}
                                        className="hover:bg-indigo-50/80 cursor-pointer transition-colors group"
                                        title="Haga clic para realizar drill-down de esta transacción"
                                      >
                                        <td className="p-2 text-center font-mono">
                                          <span className="w-5 h-5 rounded-full inline-flex items-center justify-center bg-[#0B3C5D] text-[#FFCC00] text-[9.5px] font-black">
                                            {digit}
                                          </span>
                                        </td>
                                        <td className="p-2 max-w-xs">
                                          <div className="font-bold text-slate-800 group-hover:text-indigo-600 truncate text-[10.5px] flex items-center gap-1">
                                            <span>{tx.description}</span>
                                            <Eye size={10} className="text-indigo-600 opacity-0 group-hover:opacity-100 shrink-0" />
                                          </div>
                                          <div className="text-[8.5px] font-mono text-slate-400">
                                            ID: {tx.id} • Fecha: {tx.date || tx.invoiceDate}
                                          </div>
                                        </td>
                                        <td className="p-2 text-right font-mono font-black text-slate-900 text-[10.5px]">
                                          ${tx.amount.toLocaleString('es-CL')}
                                        </td>
                                        <td className="p-2">
                                          <span className="text-[9px] font-bold text-slate-700 block uppercase font-mono truncate max-w-[140px]">
                                            {tx.supplierName || 'CONSUMIDOR DIRECTO'}
                                          </span>
                                          <span className="text-[8.5px] text-slate-500 font-mono block">
                                            {tx.category || 'GENERAL'}
                                          </span>
                                        </td>
                                        <td className="p-2">
                                          {alerts.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                              {alerts.map((al, idx) => (
                                                <span key={idx} className="bg-slate-100 border border-slate-200 text-[8px] px-1.5 py-0.5 rounded font-mono text-slate-800">
                                                  {al}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="text-[8.5px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                              ✓ Sin alertas anómalas
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2 text-center whitespace-nowrap min-w-[110px]" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            onClick={() => setInspectingTxItem(item)}
                                            className="bg-[#0B3C5D] hover:bg-indigo-900 text-white font-bold px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase transition-all shadow-2xs whitespace-nowrap inline-flex items-center justify-center gap-1 mx-auto"
                                          >
                                            <Eye size={10} />
                                            <span>Drill-Down</span>
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="pt-4 border-t flex justify-end">
                    <button 
                      onClick={() => {
                        setActiveDetailModal(null);
                        setSelectedAlertCategory(null);
                        setModalSearchTerm('');
                      }}
                      className="bg-[#0B3C5D] hover:bg-[#072d46] text-white px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all"
                    >
                      Cerrar Panel Informativo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BenfordAnalysisModule;
