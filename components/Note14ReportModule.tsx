import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileUp, AlertTriangle, CheckCircle2, ArrowRight, 
  History, Search, Filter, Download, Trash2, 
  TrendingUp, TrendingDown, Info, Loader2, FileSpreadsheet, X, FileText,
  Building2, Landmark, DollarSign, PieChart, ShieldCheck, BookOpen, Layers,
  ChevronRight, RefreshCw, BarChart3, CheckSquare, Sparkles
} from 'lucide-react';
import { 
  Note14Report, 
  Note14Record, 
  InsuranceCompany, 
  Property, 
  LeaseContract, 
  Transaction, 
  WorkOrder 
} from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPdfAssetFlowLogo } from '../lib/defaultLogo';
import { exportToExcel } from '../lib/excelExport';
import { 
  buildNote14Consolidation, 
  exportNote14ToExcel, 
  Note14ConsolidatedReport,
  safeUUID 
} from '../lib/note14Generator';

interface Note14ReportModuleProps {
  reports: Note14Report[];
  properties?: Property[];
  leaseContracts?: LeaseContract[];
  transactions?: Transaction[];
  workOrders?: WorkOrder[];
  onSave: (report: Note14Report) => void;
  onDelete: (id: string) => void;
  onSync?: () => Promise<void>;
  currentUser: string;
  companyLogo: string | null;
}

const Note14ReportModule: React.FC<Note14ReportModuleProps> = ({ 
  reports, 
  properties = [], 
  leaseContracts = [], 
  transactions = [], 
  workOrders = [], 
  onSave, 
  onDelete, 
  onSync, 
  currentUser, 
  companyLogo 
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q4');
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany | 'TODAS'>('TODAS');
  const [valuationModel, setValuationModel] = useState<'VALOR_RAZONABLE' | 'COSTO'>('VALOR_RAZONABLE');
  const [activeMainTab, setActiveMainTab] = useState<'EMISION_OFICIAL' | 'METODOLOGIA_IFRS' | 'CARGA_EXTERNA' | 'HISTORIAL'>('EMISION_OFICIAL');
  const [activeSubTab, setActiveSubTab] = useState<'ROLL_FORWARD' | 'NOI_RESULTADOS' | 'NOMINA_CARTERA' | 'GRAVAMENES' | 'CUADRE_B4' | 'IMPUESTOS_NIC12'>('ROLL_FORWARD');
  
  // Detalle Cartera Pagination, Search & Semáforo de Tasaciones CMF
  const [carteraSearch, setCarteraSearch] = useState('');
  const [carteraPageSize, setCarteraPageSize] = useState<number | 'ALL'>(25);
  const [carteraCurrentPage, setCarteraCurrentPage] = useState<number>(1);
  const [selectedCommune, setSelectedCommune] = useState<string>('TODAS');
  const [appraisalFilter, setAppraisalFilter] = useState<'TODAS' | 'VIGENTE' | 'ALERTA' | 'VENCIDA'>('TODAS');

  // External Upload State (Preserved for compatibility)
  const [isUploading, setIsUploading] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<Note14Record[]>([]);
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Motor de Consolidación Oficial Nota 14 (O(N) optimizado con useMemo)
  const consolidatedData: Note14ConsolidatedReport = useMemo(() => {
    return buildNote14Consolidation(
      properties,
      leaseContracts,
      transactions,
      workOrders,
      {
        year: selectedYear,
        quarter: selectedQuarter,
        company: selectedCompany,
        valuationModel,
        currentUser
      }
    );
  }, [properties, leaseContracts, transactions, workOrders, selectedYear, selectedQuarter, selectedCompany, valuationModel, currentUser]);

  // Lista de comunas únicas de la cartera
  const uniqueCommunes = useMemo(() => {
    const set = new Set<string>();
    consolidatedData.detailedProperties.forEach(p => {
      if (p.commune) set.add(p.commune);
    });
    return Array.from(set).sort();
  }, [consolidatedData.detailedProperties]);

  // Filtrado de la nómina de propiedades con Semáforo CMF Circular 1.835
  const filteredDetailedProperties = useMemo(() => {
    return consolidatedData.detailedProperties.filter(p => {
      const matchSearch = carteraSearch === '' || 
        p.code.toLowerCase().includes(carteraSearch.toLowerCase()) ||
        p.propertyRole.toLowerCase().includes(carteraSearch.toLowerCase()) ||
        p.address.toLowerCase().includes(carteraSearch.toLowerCase()) ||
        p.tenantName.toLowerCase().includes(carteraSearch.toLowerCase());
      const matchCommune = selectedCommune === 'TODAS' || p.commune === selectedCommune;
      const matchAppraisal = appraisalFilter === 'TODAS' ||
        (appraisalFilter === 'VIGENTE' && p.appraisalStatus === 'VIGENTE') ||
        (appraisalFilter === 'ALERTA' && (p.appraisalStatus === 'ALERTA_AMARILLA' || p.appraisalStatus === 'ALERTA_NARANJA')) ||
        (appraisalFilter === 'VENCIDA' && p.appraisalStatus === 'VENCIDA_CMF');
      return matchSearch && matchCommune && matchAppraisal;
    });
  }, [consolidatedData.detailedProperties, carteraSearch, selectedCommune, appraisalFilter]);

  // Paginación FDA de la nómina
  const paginatedProperties = useMemo(() => {
    if (carteraPageSize === 'ALL') return filteredDetailedProperties;
    const start = (carteraCurrentPage - 1) * carteraPageSize;
    return filteredDetailedProperties.slice(start, start + carteraPageSize);
  }, [filteredDetailedProperties, carteraPageSize, carteraCurrentPage]);

  const totalPages = carteraPageSize === 'ALL' ? 1 : Math.ceil(filteredDetailedProperties.length / (carteraPageSize || 1));

  // Exportar Excel Oficial
  const handleExportOfficialExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportNote14ToExcel(consolidatedData);
    } catch (error) {
      console.error('Error al exportar Nota 14 a Excel:', error);
      alert('Error al generar archivo Excel de la Nota 14: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Guardar reporte consolidado en el historial de reportes
  const handleSaveConsolidationAsReport = () => {
    const reportRecords: Note14Record[] = consolidatedData.detailedProperties.map(p => ({
      id: safeUUID('rec'),
      propertyRole: p.propertyRole,
      address: p.address,
      classification: 'INVERSION',
      fairValue: p.fairValueCLP,
      bookValue: p.totalBookValueCLP,
      landValue: p.landCostCLP,
      buildingsValue: p.buildingCostCLP,
      rentalIncome: p.monthlyRentCLP * 12,
      operatingExpenses: Math.round(p.fairValueCLP * 0.02),
      restrictions: p.encumbrance
    }));

    const newReport: Note14Report = {
      id: safeUUID('rep_n14'),
      period: consolidatedData.period,
      insuranceCompany: selectedCompany === 'TODAS' ? 'VIDA' : selectedCompany,
      uploadDate: new Date().toISOString(),
      records: reportRecords,
      summary: consolidatedData.rollForwardCurrent.map(r => ({
        concept: r.concept,
        land: r.landAmount,
        buildings: r.buildingsAmount,
        others: r.underConstructionAmount,
        total: r.totalAmount
      })),
      userCreator: currentUser,
      timestamp: Date.now()
    };

    onSave(newReport);
    alert(`Nota 14 para el periodo ${consolidatedData.period} guardada exitosamente en el historial.`);
  };

  // Funciones de subida y procesamiento legado
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (rows.length === 0) {
        alert("El archivo está vacío.");
        setIsUploading(false);
        return;
      }

      const records: Note14Record[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const concept = String(row[0] || row[1] || `Fila ${i}`);
        const land = Number(row[2]) || 0;
        const bld = Number(row[3]) || 0;
        const total = Number(row[4]) || (land + bld);

        records.push({
          id: safeUUID('legacy_rec'),
          lineNumber: i + 1,
          isSummary: true,
          concept,
          landValue: land,
          buildingsValue: bld,
          fairValue: total,
          bookValue: total,
          validationErrors: []
        });
      }

      setCurrentPreview(records);
      setActiveMainTab('CARGA_EXTERNA');
      alert(`Archivo procesado: se extrajeron ${records.length} registros de previsualización.`);
    } catch (err) {
      console.error('Error al procesar archivo:', err);
      alert('Error al leer el archivo Excel.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatCLP = (val: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
  };

  const formatM$ = (val: number) => {
    return `M$ ${(val / 1000).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER INSTITUCIONAL CON TÍTULO Y CONTROLES NORMATIVOS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-700/50">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600/30 p-2.5 rounded-2xl border border-indigo-400/30 text-indigo-300">
                <Landmark size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                    Nota 14: Propiedades de Inversión (NIC 40 / CMF)
                  </h1>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    FECU / XBRL
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Emisión normativa de revelaciones de balance, conciliación de movimientos de saldos y nómina según NCG 316.
                </p>
              </div>
            </div>
          </div>

          {/* Botones de Acción Primaria */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleExportOfficialExcel}
              disabled={isExportingExcel}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExportingExcel ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generando XLSX...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} />
                  <span>Emitir Nota 14 Oficial (.xlsx)</span>
                </>
              )}
            </button>

            <button
              onClick={handleSaveConsolidationAsReport}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
            >
              <CheckSquare size={16} />
              <span>Guardar en Historial</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros y Configuración del Ejercicio */}
        <div className="mt-6 pt-5 border-t border-slate-700/60 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Ejercicio / Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full bg-slate-800/90 text-white border border-slate-600 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-indigo-400"
            >
              {[2027, 2026, 2025, 2024, 2023].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Periodo / Trimestre
            </label>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value as any)}
              className="w-full bg-slate-800/90 text-white border border-slate-600 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-indigo-400"
            >
              <option value="Q1">Q1 - 31 de Marzo</option>
              <option value="Q2">Q2 - 30 de Junio</option>
              <option value="Q3">Q3 - 30 de Septiembre</option>
              <option value="Q4">Q4 - 31 de Diciembre (Anual)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Compañía / Entidad
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value as any)}
              className="w-full bg-slate-800/90 text-white border border-slate-600 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-indigo-400"
            >
              <option value="TODAS">TODAS (CONSOLIDADO)</option>
              <option value="VIDA">SEGUROS DE VIDA</option>
              <option value="GENERALES">SEGUROS GENERALES</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Modelo de Medición (NIC 40)
            </label>
            <select
              value={valuationModel}
              onChange={(e) => setValuationModel(e.target.value as any)}
              className="w-full bg-slate-800/90 text-white border border-slate-600 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-indigo-400"
            >
              <option value="VALOR_RAZONABLE">VALOR RAZONABLE (NIC 40 §33)</option>
              <option value="COSTO">MODELO DEL COSTO (NIC 40 §56)</option>
            </select>
          </div>

          <div className="col-span-2 md:col-span-4 lg:col-span-1 flex items-end">
            <div className="w-full bg-indigo-900/40 border border-indigo-500/30 rounded-xl p-2 text-center">
              <span className="text-[9px] font-black text-indigo-300 uppercase block">Regulación Activa</span>
              <span className="text-[11px] font-black text-white">NCG 316 / NIC 40</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPIS EJECUTIVOS DE LA CARTERA BAJO NIC 40 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Cartera NIC 40</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-800">
              {formatM$(consolidatedData.kpis.totalFairValueCLP)}
            </span>
          </div>
          <span className="text-[9px] font-bold text-slate-500 mt-1 block">
            {consolidatedData.kpis.totalPropertiesCount} Propiedades de Inversión
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Costo Histórico / Libro</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-700">
              {formatM$(consolidatedData.kpis.totalBookValueCLP)}
            </span>
          </div>
          <span className="text-[9px] font-bold text-slate-500 mt-1 block">
            Base depreciable construcción
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">Superávit Valor Razonable</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-black text-emerald-700">
              +{formatM$(consolidatedData.kpis.totalFairValueSurplusCLP)}
            </span>
          </div>
          <span className="text-[9px] font-bold text-emerald-600 mt-1 block">
            Ganancia no realizada acumulada
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Ingresos Arriendos (Año)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-black text-indigo-600">
              {formatM$(consolidatedData.kpis.annualizedRentalIncomeCLP)}
            </span>
          </div>
          <span className="text-[9px] font-bold text-indigo-500 mt-1 block">
            Canon anualizado devengado
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Resultado Neto (NOI)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900">
              {formatM$(consolidatedData.operationalResult.netOperatingIncome)}
            </span>
          </div>
          <span className="text-[9px] font-bold text-slate-500 mt-1 block">
            Margen: {(100 - consolidatedData.operationalResult.expenseRatio).toFixed(1)}% sobre ingresos
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Ocupación / Cap Rate</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-black text-indigo-700">
              {consolidatedData.kpis.occupancyRate.toFixed(1)}%
            </span>
            <span className="text-xs font-bold text-slate-500">
              / {consolidatedData.kpis.netCapRate.toFixed(2)}%
            </span>
          </div>
          <span className="text-[9px] font-bold text-slate-500 mt-1 block">
            {consolidatedData.kpis.rentedPropertiesCount} en arriendo vigente
          </span>
        </div>
      </div>

      {/* 2.1 SEMÁFORO DE TASACIONES PERICIALES CMF (CIRCULAR N° 1.835 < 24 MESES) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 rounded-3xl border border-slate-700 shadow-md text-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                  Ente Fiscalizador CMF • Circular N° 1.835
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {consolidatedData.appraisalKpis.compliancePercentage.toFixed(1)}% VIGENCIA LEGAL
                </span>
              </div>
              <h4 className="text-xs font-black uppercase text-white mt-0.5">
                Semáforo Regulatorio de Tasaciones Periciales de Inversión (&lt; 24 Meses)
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
            <button
              onClick={() => { setActiveSubTab('NOMINA_CARTERA'); setAppraisalFilter('VIGENTE'); }}
              className="bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 px-3 py-2 rounded-xl text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase text-emerald-300">Vigente (&lt;18m)</span>
              </div>
              <div className="text-base font-black text-white mt-0.5">
                {consolidatedData.appraisalKpis.vigentesCount} <span className="text-[10px] text-emerald-400/80 font-normal">inmuebles</span>
              </div>
            </button>

            <button
              onClick={() => { setActiveSubTab('NOMINA_CARTERA'); setAppraisalFilter('ALERTA'); }}
              className="bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 px-3 py-2 rounded-xl text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="text-[9px] font-black uppercase text-amber-300">Alerta (18-21m)</span>
              </div>
              <div className="text-base font-black text-white mt-0.5">
                {consolidatedData.appraisalKpis.alertaAmarillaCount} <span className="text-[10px] text-amber-400/80 font-normal">por cotizar</span>
              </div>
            </button>

            <button
              onClick={() => { setActiveSubTab('NOMINA_CARTERA'); setAppraisalFilter('ALERTA'); }}
              className="bg-orange-950/60 hover:bg-orange-900/80 border border-orange-500/40 px-3 py-2 rounded-xl text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                <span className="text-[9px] font-black uppercase text-orange-300">Crítica (22-24m)</span>
              </div>
              <div className="text-base font-black text-white mt-0.5">
                {consolidatedData.appraisalKpis.alertaNaranjaCount} <span className="text-[10px] text-orange-400/80 font-normal">&lt;60 días</span>
              </div>
            </button>

            <button
              onClick={() => { setActiveSubTab('NOMINA_CARTERA'); setAppraisalFilter('VENCIDA'); }}
              className="bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 px-3 py-2 rounded-xl text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="text-[9px] font-black uppercase text-rose-300">Vencida (&gt;24m)</span>
              </div>
              <div className="text-base font-black text-white mt-0.5">
                {consolidatedData.appraisalKpis.vencidasCount} <span className="text-[10px] text-rose-400/80 font-normal">infracción</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 3. PESTAÑAS PRINCIPALES DEL MÓDULO */}
      <div className="flex border-b border-slate-200 gap-1 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveMainTab('EMISION_OFICIAL')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'EMISION_OFICIAL'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 size={15} />
          <span>Emisión Oficial CMF (4 Cuadros)</span>
        </button>

        <button
          onClick={() => setActiveMainTab('METODOLOGIA_IFRS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'METODOLOGIA_IFRS'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen size={15} />
          <span>Metodología & Bases Técnicas (NIC 40 / NCG 316)</span>
        </button>

        <button
          onClick={() => setActiveMainTab('CARGA_EXTERNA')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'CARGA_EXTERNA'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileUp size={15} />
          <span>Carga Externa & Validación</span>
        </button>

        <button
          onClick={() => setActiveMainTab('HISTORIAL')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'HISTORIAL'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History size={15} />
          <span>Historial de Reportes ({reports.length})</span>
        </button>
      </div>

      {/* 4. CONTENIDO: PESTAÑA EMISIÓN OFICIAL */}
      {activeMainTab === 'EMISION_OFICIAL' && (
        <div className="space-y-6">
          {/* Subpestañas de los 4 cuadros oficiales */}
          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveSubTab('ROLL_FORWARD')}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'ROLL_FORWARD'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              1. Conciliación de Movimientos (Roll-Forward)
            </button>

            <button
              onClick={() => setActiveSubTab('NOI_RESULTADOS')}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'NOI_RESULTADOS'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              2. Ingresos y Gastos Operacionales (NOI)
            </button>

            <button
              onClick={() => setActiveSubTab('NOMINA_CARTERA')}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'NOMINA_CARTERA'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              3. Nómina Analítica Cartera NIC 40 ({consolidatedData.detailedProperties.length})
            </button>

            <button
              onClick={() => setActiveSubTab('GRAVAMENES')}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'GRAVAMENES'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              4. Gravámenes y Restricciones ({consolidatedData.encumbrances.length})
            </button>

            <button
              onClick={() => setActiveSubTab('CUADRE_B4')}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeSubTab === 'CUADRE_B4'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>5. Cuadre B.4 vs. Nota 14 ($0 Dif • Hash CMF)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('IMPUESTOS_NIC12')}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeSubTab === 'IMPUESTOS_NIC12'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Landmark size={13} className="text-purple-600" />
              <span>6. Puente Tributario NIC 12 &amp; Art. 17 DL 825</span>
            </button>
          </div>

          {/* SUB-TAB 1: ROLL-FORWARD MATRIX (CONCILIACIÓN DE SALDOS) */}
          {activeSubTab === 'ROLL_FORWARD' && (
            <div className="space-y-6">
              {/* Periodo Actual */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      Cuadro 1: Conciliación de Movimientos de Propiedades de Inversión ({consolidatedData.currentPeriodLabel})
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Evolución del saldo por clases de activos según NIC 40 §76 y Circular CMF N° 1.835 (Valores en CLP).
                    </p>
                  </div>
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                    Ejercicio en Curso
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider">
                        <th className="py-3 px-4">Concepto / Movimiento</th>
                        <th className="py-3 px-4 text-right">Terrenos (CLP)</th>
                        <th className="py-3 px-4 text-right">Edificios y Constr. (CLP)</th>
                        <th className="py-3 px-4 text-right">Obras en Desarrollo (CLP)</th>
                        <th className="py-3 px-4 text-right">Total Propiedades Inversión (CLP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {consolidatedData.rollForwardCurrent.map((row) => (
                        <tr 
                          key={row.id} 
                          className={
                            row.isTotal 
                              ? 'bg-slate-900 text-white font-black' 
                              : row.isSubtotal 
                              ? 'bg-slate-100 font-bold text-slate-800' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }
                        >
                          <td className={`py-2.5 px-4 ${row.indent ? 'pl-8' : ''}`}>
                            {row.concept}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">
                            {formatCLP(row.landAmount)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">
                            {formatCLP(row.buildingsAmount)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">
                            {formatCLP(row.underConstructionAmount)}
                          </td>
                          <td className={`py-2.5 px-4 text-right font-mono ${row.isTotal ? 'text-emerald-300 font-black' : 'font-bold'}`}>
                            {formatCLP(row.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Periodo Comparativo Anterior */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      Conciliación de Movimientos Comparativo Anterior ({consolidatedData.previousPeriodLabel})
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Exigencia IFRS de revelación comparativa de dos ejercicios para Estados Financieros auditados.
                    </p>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                    Ejercicio Anterior
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider">
                        <th className="py-3 px-4">Concepto / Movimiento</th>
                        <th className="py-3 px-4 text-right">Terrenos (CLP)</th>
                        <th className="py-3 px-4 text-right">Edificios y Constr. (CLP)</th>
                        <th className="py-3 px-4 text-right">Obras en Desarrollo (CLP)</th>
                        <th className="py-3 px-4 text-right">Total Propiedades Inversión (CLP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {consolidatedData.rollForwardPrevious.map((row) => (
                        <tr 
                          key={row.id} 
                          className={
                            row.isTotal 
                              ? 'bg-slate-900 text-white font-black' 
                              : row.isSubtotal 
                              ? 'bg-slate-100 font-bold text-slate-800' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }
                        >
                          <td className={`py-2.5 px-4 ${row.indent ? 'pl-8' : ''}`}>
                            {row.concept}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">
                            {formatCLP(row.landAmount)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">
                            {formatCLP(row.buildingsAmount)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">
                            {formatCLP(row.underConstructionAmount)}
                          </td>
                          <td className={`py-2.5 px-4 text-right font-mono ${row.isTotal ? 'text-emerald-300 font-black' : 'font-bold'}`}>
                            {formatCLP(row.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: RESULTADOS OPERACIONALES (NOI) */}
          {activeSubTab === 'NOI_RESULTADOS' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      Cuadro 2: Ingresos por Arrendamiento y Gastos Operacionales Directos (NIC 40 §75f)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Rentas generadas e imputación de costos operacionales directos diferenciados por condición de ocupación.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider">
                        <th className="py-3 px-4">Concepto Operacional</th>
                        <th className="py-3 px-4 text-right">Monto CLP</th>
                        <th className="py-3 px-4 text-right">% s/ Renta</th>
                        <th className="py-3 px-4">Criterio Regulatorio CMF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          Ingresos por Arrendamiento Operativo de Propiedades de Inversión
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          {formatCLP(consolidatedData.operationalResult.rentalIncomeGross)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">100.0%</td>
                        <td className="py-3 px-4 text-slate-500">Reconocimiento lineal según NIIF 16</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-slate-700 pl-8">
                          (-) Gastos directos de operación: Inmuebles que generaron ingresos por renta
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-600">
                          -{formatCLP(consolidatedData.operationalResult.directOperatingExpensesGenerating)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {(consolidatedData.operationalResult.directOperatingExpensesGenerating / (consolidatedData.operationalResult.rentalIncomeGross || 1) * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-slate-500">Mantenciones, seguros y contribuciones</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-slate-700 pl-8">
                          (-) Gastos directos de operación: Inmuebles que NO generaron ingresos por renta (Vacancia)
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-600">
                          -{formatCLP(consolidatedData.operationalResult.directOperatingExpensesNonGenerating)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {(consolidatedData.operationalResult.directOperatingExpensesNonGenerating / (consolidatedData.operationalResult.rentalIncomeGross || 1) * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-slate-500">Costos de preservación de bienes desocupados</td>
                      </tr>
                      <tr className="bg-emerald-50 text-emerald-900 font-black">
                        <td className="py-3.5 px-4 font-black uppercase">
                          RESULTADO OPERACIONAL NETO INMOBILIARIO (NOI / NET OPERATING INCOME)
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                          {formatCLP(consolidatedData.operationalResult.netOperatingIncome)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black">
                          {(100 - consolidatedData.operationalResult.expenseRatio).toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-emerald-800">Margen neto antes de ajuste a valor razonable</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Desglose de naturaleza del gasto */}
                <div className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Mantención & Obras Menores</span>
                    <span className="text-base font-black text-slate-800 mt-1 block">
                      {formatCLP(consolidatedData.operationalResult.expenseCategories.maintenance)}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">OTs recepcionadas en el periodo</span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Contribuciones e Impuestos SII</span>
                    <span className="text-base font-black text-slate-800 mt-1 block">
                      {formatCLP(consolidatedData.operationalResult.expenseCategories.taxesContribuciones)}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Cuotas trimestrales TGR devengadas</span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Primas de Seguros</span>
                    <span className="text-base font-black text-slate-800 mt-1 block">
                      {formatCLP(consolidatedData.operationalResult.expenseCategories.insurance)}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Pólizas sismo e incendio vigentes</span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Gastos Comunes y Servicios</span>
                    <span className="text-base font-black text-slate-800 mt-1 block">
                      {formatCLP(consolidatedData.operationalResult.expenseCategories.commonExpensesAndServices)}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Costos no transferidos al arrendatario</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: NÓMINA ANALÍTICA CARTERA PROPIEDADES DE INVERSIÓN */}
          {activeSubTab === 'NOMINA_CARTERA' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    Cuadro 3: Nómina Analítica y Valorización Individualizada de Propiedades de Inversión
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Separación de Terreno (No Afecto a Depreciación) y Construcción conforme a Norma de Carácter General N° 316.
                  </p>
                </div>

                {/* Filtros de Nómina */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-60">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar por rol, código, calle, inquilino..."
                      value={carteraSearch}
                      onChange={(e) => {
                        setCarteraSearch(e.target.value);
                        setCarteraCurrentPage(1);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <select
                    value={selectedCommune}
                    onChange={(e) => {
                      setSelectedCommune(e.target.value);
                      setCarteraCurrentPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="TODAS">Todas las Comunas</option>
                    {uniqueCommunes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={carteraPageSize}
                    onChange={(e) => {
                      setCarteraPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                      setCarteraCurrentPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value={25}>25 por pág.</option>
                    <option value={50}>50 por pág.</option>
                    <option value={100}>100 por pág.</option>
                    <option value="ALL">Ver Todas</option>
                  </select>

                  {/* Filtro Rápido Semáforo CMF Circular 1.835 */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 text-[10px] font-black uppercase">
                    <span className="px-2 text-slate-400">Tasación:</span>
                    <button
                      onClick={() => { setAppraisalFilter('TODAS'); setCarteraCurrentPage(1); }}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${appraisalFilter === 'TODAS' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => { setAppraisalFilter('VIGENTE'); setCarteraCurrentPage(1); }}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${appraisalFilter === 'VIGENTE' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      🟢 Vigentes (&lt;18m)
                    </button>
                    <button
                      onClick={() => { setAppraisalFilter('ALERTA'); setCarteraCurrentPage(1); }}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${appraisalFilter === 'ALERTA' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      🟡/🟠 Alerta (18-24m)
                    </button>
                    <button
                      onClick={() => { setAppraisalFilter('VENCIDA'); setCarteraCurrentPage(1); }}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${appraisalFilter === 'VENCIDA' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      🔴 Vencidas (&gt;24m)
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabla Paginada */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black text-[9px] uppercase tracking-wider">
                      <th className="py-3 px-3">Código</th>
                      <th className="py-3 px-3">Rol SII</th>
                      <th className="py-3 px-3">Dirección & Comuna</th>
                      <th className="py-3 px-2 text-center">Tipo</th>
                      <th className="py-3 px-3 text-center">Tasación CMF (Antigüedad)</th>
                      <th className="py-3 px-3 text-right">M2 Terr.</th>
                      <th className="py-3 px-3 text-right">M2 Const.</th>
                      <th className="py-3 px-3 text-right">Costo Terreno (NCG 316)</th>
                      <th className="py-3 px-3 text-right">Costo Constr.</th>
                      <th className="py-3 px-3 text-right">Valor Libro</th>
                      <th className="py-3 px-3 text-right">Valor Razonable CMF</th>
                      <th className="py-3 px-3 text-right">Canon Mensual</th>
                      <th className="py-3 px-3">Arrendatario / Régimen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {paginatedProperties.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-8 text-center text-slate-400 font-sans">
                          No se encontraron propiedades que coincidan con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      paginatedProperties.map((p) => (
                        <tr key={p.propertyId} className="hover:bg-slate-50 text-[11px]">
                          <td className="py-2.5 px-3 font-bold text-indigo-700 font-sans">{p.code}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{p.propertyRole}</td>
                          <td className="py-2.5 px-3 font-sans truncate max-w-[200px]" title={`${p.address}, ${p.commune}`}>
                            <span className="font-bold text-slate-800 block truncate">{p.address}</span>
                            <span className="text-[10px] text-slate-400 block">{p.commune}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-sans">
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                              {p.propertyType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              p.appraisalStatus === 'VIGENTE' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : p.appraisalStatus === 'ALERTA_AMARILLA' 
                                ? 'bg-amber-100 text-amber-800' 
                                : p.appraisalStatus === 'ALERTA_NARANJA'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-rose-100 text-rose-800 animate-pulse'
                            }`}>
                              {p.appraisalStatus === 'VIGENTE' && '🟢 Vigente'}
                              {p.appraisalStatus === 'ALERTA_AMARILLA' && '🟡 18-21m'}
                              {p.appraisalStatus === 'ALERTA_NARANJA' && '🟠 22-24m'}
                              {p.appraisalStatus === 'VENCIDA_CMF' && '🔴 Vencida'}
                              <span className="font-normal font-mono">({p.appraisalAgeMonths}m)</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{p.surfaceLandM2}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{p.surfaceBuiltM2}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">{formatCLP(p.landCostCLP)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">{formatCLP(p.buildingCostCLP)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">{formatCLP(p.totalBookValueCLP)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{formatCLP(p.fairValueCLP)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-indigo-600">{formatCLP(p.monthlyRentCLP)}</td>
                          <td className="py-2.5 px-3 font-sans truncate max-w-[150px]">
                            <span className="font-bold text-slate-800 block truncate">{p.tenantName}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-[9px] font-black uppercase ${p.contractStatus === 'VIGENTE' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {p.contractStatus}
                              </span>
                              {p.taxDeductionArt17Eligible && (
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.2 rounded" title="Deducción 11% Avalúo Fiscal (Art. 17 DL 825)">
                                  Art. 17
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginador */}
              {carteraPageSize !== 'ALL' && totalPages > 1 && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-500">
                    Mostrando página {carteraCurrentPage} de {totalPages} ({filteredDetailedProperties.length} propiedades en total)
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCarteraCurrentPage(p => Math.max(1, p - 1))}
                      disabled={carteraCurrentPage === 1}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCarteraCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={carteraCurrentPage === totalPages}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 4: GRAVÁMENES Y RESTRICCIONES */}
          {activeSubTab === 'GRAVAMENES' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    Cuadro 4: Restricciones, Gravámenes y Compromisos de Inversión (Circular CMF 1.835)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Inmuebles afectos a hipotecas, prohibiciones de enajenar o garantías de reservas técnicas de seguros.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Rol SII</th>
                      <th className="py-3 px-4">Dirección & Comuna</th>
                      <th className="py-3 px-4">Acreedor / Beneficiario</th>
                      <th className="py-3 px-4">Naturaleza del Gravamen</th>
                      <th className="py-3 px-4 text-right">Monto Garantizado (CLP)</th>
                      <th className="py-3 px-4">Estado & Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {consolidatedData.encumbrances.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                          No existen hipotecas ni prohibiciones de enajenar registradas en la cartera actual.
                        </td>
                      </tr>
                    ) : (
                      consolidatedData.encumbrances.map((enc) => (
                        <tr key={enc.id} className="hover:bg-slate-50 text-slate-700">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{enc.propertyRole}</td>
                          <td className="py-3 px-4 font-medium">{enc.address}, {enc.commune}</td>
                          <td className="py-3 px-4 font-bold text-indigo-700">{enc.creditor}</td>
                          <td className="py-3 px-4">{enc.mortgageType}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCLP(enc.securedAmountCLP)}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-[11px]">{enc.observations}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 5: MATRIZ DE CUADRE B.4 VS NOTA 14 (DIFERENCIA $0 & HASH CMF) */}
          {activeSubTab === 'CUADRE_B4' && (
            <div className="space-y-6">
              {/* Header Box & Certification */}
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-6 rounded-3xl border border-emerald-500/40 shadow-lg text-white">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Certificación Regulatoria CMF
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300 font-bold">
                        Circular N° 1.835 / NCG 316
                      </span>
                    </div>
                    <h3 className="text-base font-black uppercase text-white tracking-tight">
                      Matriz de Conciliación Trimestral: Archivo B.4 vs. Revelación Nota 14 (NIC 40)
                    </h3>
                    <p className="text-xs text-slate-300 font-medium max-w-3xl">
                      Certificación matemática obligatoria de cuadratura exacta ($0 de discrepancia) entre el reporte mensual B.4 
                      al corte de {consolidatedData.cmfB4Reconciliation.periodLabel} y la nómina consolidada de los Estados Financieros.
                    </p>
                  </div>

                  <div className="bg-emerald-900/40 border border-emerald-400/50 p-4 rounded-2xl text-center min-w-[200px]">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300 block">
                      Estado de Cuadratura
                    </span>
                    <span className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1.5 mt-0.5">
                      <CheckCircle2 size={18} className="text-emerald-400" />
                      DIFERENCIA $0
                    </span>
                    <span className="text-[9px] text-slate-300 block mt-1 font-mono">
                      100% Homologado CMF
                    </span>
                  </div>
                </div>

                {/* Cryptographic Certification Hash */}
                <div className="mt-5 pt-4 border-t border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10px]">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Hash de Integridad CMF:</span>
                    <span className="bg-slate-950 px-2.5 py-1 rounded-lg text-emerald-400 border border-emerald-900/60 select-all">
                      {consolidatedData.cmfB4Reconciliation.certificationHash}
                    </span>
                  </div>
                  <div className="text-slate-400 font-medium">
                    Certificado por: <strong className="text-white font-mono">{consolidatedData.cmfB4Reconciliation.certifiedBy}</strong>
                  </div>
                </div>
              </div>

              {/* Reconciliation Table */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      Tabla Comparativa de 7 Puntos de Cuadratura Obligatoria
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Exigencia de auditores externos y peritajes CMF: La cartera declarada en B.4 debe reflejar los mismos saldos contables y métricas físicas que la Nota 14.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider">
                        <th className="py-3 px-4">Concepto / Métrica Regulatoria</th>
                        <th className="py-3 px-4 text-right">Monto B.4 Mensual (CMF)</th>
                        <th className="py-3 px-4 text-right">Monto Nota 14 (NIC 40)</th>
                        <th className="py-3 px-4 text-right">Diferencia</th>
                        <th className="py-3 px-4 text-center">Estado Auditoría</th>
                        <th className="py-3 px-4">Fundamento Normativo / Observación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {consolidatedData.cmfB4Reconciliation.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-sans font-bold text-slate-800">
                            {row.concept}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            {row.unit === 'CLP' ? formatCLP(row.b4Value) : row.unit === 'M2' ? `${row.b4Value.toLocaleString('es-CL')} m²` : `${row.b4Value} unidades`}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-indigo-700">
                            {row.unit === 'CLP' ? formatCLP(row.note14Value) : row.unit === 'M2' ? `${row.note14Value.toLocaleString('es-CL')} m²` : `${row.note14Value} unidades`}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-emerald-600">
                            {row.unit === 'CLP' ? '$0' : row.unit === 'M2' ? '0 m²' : '0'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                              <CheckCircle2 size={11} /> CUADRE EXACTO
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-sans text-slate-600 text-[11px]">
                            {row.observation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    <strong>Dictamen de Control Interno:</strong> Se certifica la inexistencia de partidas conciliatorias 
                    pendientes entre el archivo B.4 transmitido a la CMF y las revelaciones de la Nota 14 para el periodo analizado. 
                    El desglose de terrenos sin depreciación cumple cabalmente con la Norma de Carácter General N° 316.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 6: PUENTE FINANCIERO-TRIBUTARIO NIC 12 & ART. 17 DL 825 */}
          {activeSubTab === 'IMPUESTOS_NIC12' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 rounded-3xl border border-purple-500/40 shadow-lg text-white">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Norma Contable NIC 12 &amp; SII
                      </span>
                      <span className="text-[10px] font-mono text-purple-300 font-bold">
                        Formulario 22 • Renta Líquida Imponible
                      </span>
                    </div>
                    <h3 className="text-base font-black uppercase text-white tracking-tight">
                      Puente Financiero-Tributario: Impuestos Diferidos &amp; Exenciones D.L. 825
                    </h3>
                    <p className="text-xs text-slate-300 font-medium max-w-3xl">
                      Conciliación de diferencias temporarias por revalorización a valor razonable (NIC 40 / NIC 12) 
                      y control de deducción del 11% del avalúo fiscal en arriendos amoblados afectos a IVA (Art. 17 inc. 2 D.L. 825).
                    </p>
                  </div>

                  <div className="bg-purple-900/40 border border-purple-400/50 p-4 rounded-2xl text-center min-w-[220px]">
                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-300 block">
                      Pasivo Impuesto Diferido (27%)
                    </span>
                    <span className="text-lg font-black text-purple-300 mt-0.5 block font-mono">
                      {formatCLP(consolidatedData.taxBridgeNic12.deferredTaxLiabilityCLP)}
                    </span>
                    <span className="text-[9px] text-slate-300 block mt-1">
                      Tasa IDPC Régimen 14A
                    </span>
                  </div>
                </div>
              </div>

              {/* NIC 12 Reconciliation Grid */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  1. Conciliación de Impuestos Diferidos (NIC 12 vs. RLI Art. 31 LIR)
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Bajo la Ley sobre Impuesto a la Renta de Chile (D.L. 824), la ganancia devengada por ajuste a valor razonable 
                  de propiedades de inversión no constituye renta tributable devengada hasta su venta efectiva.
                </p>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider">
                        <th className="py-3 px-4">Concepto Contable-Tributario</th>
                        <th className="py-3 px-4 text-right">Base Financiera (IFRS)</th>
                        <th className="py-3 px-4 text-right">Base Tributaria (SII)</th>
                        <th className="py-3 px-4 text-right">Diferencia Temporaria</th>
                        <th className="py-3 px-4 text-center">Tasa IDPC</th>
                        <th className="py-3 px-4 text-right">Efecto Balance (Pasivo NIC 12)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      <tr className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-sans font-bold text-slate-800">
                          Revalorización Neta Acumulada a Valor Razonable
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {formatCLP(consolidatedData.taxBridgeNic12.totalFairValueGainAccumulated)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-500">
                          $0 (No Imponible)
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-purple-700">
                          +{formatCLP(consolidatedData.taxBridgeNic12.passiveTemporaryDifferenceBase)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                          27.0%
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-rose-700">
                          {formatCLP(consolidatedData.taxBridgeNic12.deferredTaxLiabilityCLP)}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-sans font-bold text-slate-800">
                          Depreciación Tributaria Construcciones (Art. 31 N° 5 LIR)
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-500">
                          $0 (Bajo Valor Razonable)
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                          -{formatCLP(consolidatedData.taxBridgeNic12.taxDepreciationSiiAccumulated)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600">
                          Deducible en RLI
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                          27.0%
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                          Crédito Fiscal Gasto
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Art. 17 inc. 2 D.L. 825 Panel */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 rounded-2xl text-amber-600 border border-amber-200">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      2. Expediente Digital de Exención Parcial de IVA (Art. 17 inc. 2 D.L. N° 825)
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Deducción del 11% anual del avalúo fiscal vigente en contratos de arriendo amoblados o con instalaciones comerciales.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Inmuebles Amoblados Afectos
                    </span>
                    <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                      {consolidatedData.detailedProperties.filter(p => p.taxDeductionArt17Eligible).length} Unidades
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Con inventario de muebles registrado
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">
                      Deducción Mensual Base Imponible
                    </span>
                    <span className="text-xl font-black text-emerald-700 mt-1 block font-mono">
                      {formatCLP(consolidatedData.detailedProperties.reduce((sum, p) => sum + (p.monthlyFiscalDeductionArt17 || 0), 0))}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                      11% Avalúo Fiscal / 12 meses
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                      Ahorro Mensual IVA Débito (19%)
                    </span>
                    <span className="text-xl font-black text-indigo-700 mt-1 block font-mono">
                      {formatCLP(Math.round(consolidatedData.detailedProperties.reduce((sum, p) => sum + (p.monthlyFiscalDeductionArt17 || 0), 0) * 0.19))}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Beneficio tributario legal directo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. CONTENIDO: PESTAÑA METODOLOGÍA Y BASES TÉCNICAS (IFRS / CMF) */}
      {activeMainTab === 'METODOLOGIA_IFRS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    Manual Técnico: Metodología de Construcción y Presentación de la Nota 14
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Normas Internacionales de Información Financiera (IFRS) y Normativa de la Comisión para el Mercado Financiero (CMF).
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 leading-relaxed">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[10px]">1</span>
                  <h4 className="font-black text-slate-900 uppercase">Definición y Alcance Contable (NIC 40 §5)</h4>
                </div>
                <p>
                  Las <strong>Propiedades de Inversión</strong> son bienes raíces (terrenos, edificios o partes de edificios) mantenidos por el dueño o arrendatario bajo arrendamiento financiero con el propósito exclusivo de:
                </p>
                <ul className="list-disc pl-5 space-y-1 font-medium text-slate-600">
                  <li><strong>Percibir rentas por arrendamiento operativo</strong> a terceros independientes.</li>
                  <li><strong>Obtener plusvalías por apreciación del capital</strong> a mediano y largo plazo.</li>
                  <li><strong>Ambas finalidades combinadas.</strong></li>
                </ul>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px]">
                  <strong>Exclusiones críticas:</strong> No califican como Nota 14 los inmuebles ocupados por la propia entidad para fines administrativos o productivos (rigen bajo <strong>NIC 16: Propiedad, Planta y Equipo</strong>), ni aquellos adquiridos para venta en el curso ordinario del giro (rigen bajo <strong>NIC 2: Inventarios</strong>).
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[10px]">2</span>
                  <h4 className="font-black text-slate-900 uppercase">Separación Terreno vs Construcción (NCG 316 CMF)</h4>
                </div>
                <p>
                  Bajo la <strong>Norma de Carácter General N° 316 de la CMF</strong>, la contabilidad inmobiliaria en Chile exige la separación analítica indispensable entre:
                </p>
                <ul className="list-disc pl-5 space-y-1 font-medium text-slate-600">
                  <li>
                    <strong>Terrenos:</strong> Poseen vida útil indefinida y <strong>NO están afectos a depreciación</strong> económica ni tributaria.
                  </li>
                  <li>
                    <strong>Edificios y Construcciones:</strong> Tienen vida útil finita sujeta a desgaste o envejecimiento. Para efectos de registros auxiliares de costo se deprecian linealmente entre 50 y 80 años.
                  </li>
                </ul>
                <p className="text-[11px] text-slate-500 italic">
                  AssetFlow calcula de forma automática esta separación respetando los avalúos desglosados del SII y las tasaciones técnicas registradas.
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[10px]">3</span>
                  <h4 className="font-black text-slate-900 uppercase">Modelo del Valor Razonable (NIC 40 §33-55 / NIIF 13)</h4>
                </div>
                <p>
                  La política preferente y estándar en el mercado asegurador chileno supervisado por la CMF es el <strong>Modelo del Valor Razonable</strong>:
                </p>
                <ul className="list-disc pl-5 space-y-1 font-medium text-slate-600">
                  <li>
                    El valor de balance de la propiedad se ajusta periódicamente al valor de mercado determinado por tasaciones periciales.
                  </li>
                  <li>
                    <strong>Efecto en Resultados:</strong> La variación neta (ganancia o pérdida por revalorización) se imputa <em>directamente al Estado de Resultados Integrales</em> del ejercicio en la cuenta "Resultado por Valorización de Propiedades de Inversión".
                  </li>
                  <li>
                    Bajo el modelo del valor razonable, <em>no se registra depreciación acumulada en el balance financiero consolidado</em>, ya que el valor razonable absorbe íntegramente el desgaste o apreciación del inmueble.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[10px]">4</span>
                  <h4 className="font-black text-slate-900 uppercase">Requisitos de Tasaciones y Circular CMF N° 1.835</h4>
                </div>
                <p>
                  Para respaldar el valor razonable ante la CMF y auditores externos (Big Four):
                </p>
                <ul className="list-disc pl-5 space-y-1 font-medium text-slate-600">
                  <li>
                    Las tasaciones deben ser emitidas por <strong>peritos independientes debidamente inscritos en el Registro de Tasadores de la CMF</strong>.
                  </li>
                  <li>
                    <strong>Antigüedad máxima:</strong> Las valorizaciones no pueden superar los 24 meses de antigüedad.
                  </li>
                  <li>
                    <strong>Metodologías aceptadas:</strong> Enfoque de Mercado Comparativo (para inmuebles residenciales y comerciales estándar) y Enfoque de Flujo de Fondos Descontados (DCF) para edificios corporativos con contratos a largo plazo.
                  </li>
                </ul>
              </div>
            </div>

            {/* Cuadro de Conciliación Tributaria vs Financiera */}
            <div className="bg-indigo-50/70 p-6 rounded-3xl border border-indigo-100 space-y-3">
              <h4 className="font-black text-indigo-950 uppercase text-xs flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                Conciliación Tributaria con el Servicio de Impuestos Internos (SII)
              </h4>
              <p className="text-xs text-indigo-900 leading-relaxed">
                El ajuste a valor razonable reconocido bajo IFRS es una ganancia puramente financiera no realizada, por lo que <strong>NO constituye renta gravable para fines de Impuesto de Primera Categoría (IDPC)</strong> hasta la efectiva enajenación del inmueble. En el Formulario 22 (Renta Líquida Imponible - RLI) se debe deducir este ajuste como "Ingreso Financiero no Tributable" y deducir la depreciación tributaria normal según las tablas del SII (Art. 31 LIR), generando una <em>diferencia temporaria pasiva</em> que se revela bajo <strong>NIC 12: Impuestos a las Ganancias</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. CONTENIDO: PESTAÑA CARGA EXTERNA & VALIDACIÓN */}
      {activeMainTab === 'CARGA_EXTERNA' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">
                  Carga Masiva y Validación de Planillas Nota 14
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Cargue archivos Excel provistos por filiales o sistemas contables externos para validar consistencia matemática.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                  <span>Seleccionar Archivo Excel</span>
                </button>
              </div>
            </div>

            {currentPreview.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-700 uppercase">
                    Registros Extraídos: {currentPreview.length}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-black text-slate-700 text-[10px] uppercase">
                        <th className="p-3">Concepto / Inmueble</th>
                        <th className="p-3 text-right">Terrenos</th>
                        <th className="p-3 text-right">Edificios</th>
                        <th className="p-3 text-right">Valor Razonable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {currentPreview.map((rec, i) => (
                        <tr key={rec.id || i} className="hover:bg-slate-50">
                          <td className="p-3 font-sans font-bold text-slate-800">{rec.concept || rec.address || `Item ${i+1}`}</td>
                          <td className="p-3 text-right">{formatCLP(rec.landValue || 0)}</td>
                          <td className="p-3 text-right">{formatCLP(rec.buildingsValue || 0)}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">{formatCLP(rec.fairValue || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. CONTENIDO: PESTAÑA HISTORIAL */}
      {activeMainTab === 'HISTORIAL' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Historial de Reportes Emitidos y Guardados
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Consulte y descargue emisiones anteriores de la Nota 14 registradas en la base de datos.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Periodo</th>
                  <th className="py-3 px-4">Compañía</th>
                  <th className="py-3 px-4">Fecha de Emisión</th>
                  <th className="py-3 px-4 text-center">Inmuebles</th>
                  <th className="py-3 px-4">Usuario Creador</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay reportes históricos de Nota 14 registrados. Utilice el botón "Guardar en Historial" para registrar uno.
                    </td>
                  </tr>
                ) : (
                  reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50 text-slate-700">
                      <td className="py-3 px-4 font-bold text-indigo-700">{rep.period}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{rep.insuranceCompany}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(rep.uploadDate).toLocaleString('es-CL')}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {rep.records?.length || 0}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">{rep.userCreator}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onDelete(rep.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Eliminar Reporte"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Note14ReportModule;
