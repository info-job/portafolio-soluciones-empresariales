
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileUp, AlertTriangle, CheckCircle2, ArrowRight, 
  History, Search, Filter, Download, Trash2, 
  TrendingUp, TrendingDown, Info, Loader2, FileSpreadsheet, X, RefreshCw,
  Building2, Layers, ShieldCheck, Eye, MapPin, Hash, DollarSign
} from 'lucide-react';
import { B4Report, B4Record, InsuranceCompany, B13Report, B4ComparisonResult, AccountingReconciliation, Property, LeaseContract } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportToExcel } from '../lib/excelExport';
import { 
  buildB4PortfolioConsolidation, 
  exportB4ConsolidationToExcel, 
  B4PortfolioConsolidationRow 
} from '../lib/b4Generator';
import { MASTER_PROPERTIES_SEED } from '../lib/masterDataSeed';

interface B4ReportModuleProps {
  reports: B4Report[];
  b13Reports?: B13Report[];
  reconciliations?: AccountingReconciliation[];
  properties?: Property[];
  leaseContracts?: LeaseContract[];
  onSave: (report: B4Report) => void;
  onDelete: (id: string) => void;
  onSync?: () => Promise<void>;
  currentUser?: string;
  companyLogo: string | null;
}

const validateRut = (rutBody: string | number, dv: string | number): boolean => {
  const body = String(rutBody).replace(/[^0-9]/g, '');
  const dvChar = String(dv).toUpperCase().trim();
  
  if (!body || !dvChar) return false;
  
  let sum = 0;
  let mul = 2;
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  
  const res = 11 - (sum % 11);
  let expectedDv = '';
  if (res === 11) expectedDv = '0';
  else if (res === 10) expectedDv = 'K';
  else expectedDv = String(res);
  
  return dvChar === expectedDv;
};

const B4ReportModule: React.FC<B4ReportModuleProps> = ({ 
  reports = [], 
  b13Reports = [], 
  reconciliations = [],
  properties = [],
  leaseContracts = [],
  onSave, 
  onDelete, 
  onSync,
  currentUser = 'SISTEMA', 
  companyLogo 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany>('VIDA');
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const [comparisonResults, setComparisonResults] = useState<B4ComparisonResult[]>([]);
  const [currentPreview, setCurrentPreview] = useState<B4Record[]>([]);
  const [activeTab, setActiveTab] = useState<'CONSOLIDATED_B4' | 'UPLOAD' | 'HISTORY' | 'ANALYSIS' | 'TRENDS' | 'RESULTS'>('CONSOLIDATED_B4');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados y gestión de cartera B.4 CMF
  const [portfolioSearchTerm, setPortfolioSearchTerm] = useState('');
  const [portfolioTypeFilter, setPortfolioTypeFilter] = useState<string>('ALL');
  const [portfolioUseFilter, setPortfolioUseFilter] = useState<'ALL' | 'ARRIENDO' | 'PROPIO' | 'MIXTO'>('ALL');
  const [isExportingB4Excel, setIsExportingB4Excel] = useState(false);
  const [selectedB4DetailRow, setSelectedB4DetailRow] = useState<B4PortfolioConsolidationRow | null>(null);

  // Paginación y rendimiento de renderizado de alta eficiencia (Optimización FDA)
  const [portfolioCurrentPage, setPortfolioCurrentPage] = useState(0);
  const [portfolioPageSize, setPortfolioPageSize] = useState<number>(25);

  // Inicialización de cartera inmediata y reactiva sin bloqueo síncrono de almacenamiento
  const effectiveProperties = useMemo(() => {
    if (Array.isArray(properties) && properties.length > 0) return properties;
    return (MASTER_PROPERTIES_SEED || []).map((p, idx) => ({
      ...p,
      id: `prop_seed_${p.code || idx}`
    })) as Property[];
  }, [properties]);

  const effectiveContracts = useMemo(() => {
    return Array.isArray(leaseContracts) ? leaseContracts : [];
  }, [leaseContracts]);

  const companyRut = selectedCompany === 'VIDA' ? '96.543.210-K' : '99.123.456-0';

  const consolidatedB4 = useMemo(() => {
    return buildB4PortfolioConsolidation(effectiveProperties, effectiveContracts, companyRut);
  }, [effectiveProperties, effectiveContracts, companyRut]);

  const filteredB4PortfolioRows = useMemo(() => {
    if (!consolidatedB4 || !Array.isArray(consolidatedB4.rows)) return [];
    const term = (portfolioSearchTerm || '').toLowerCase().trim();
    const typeFilter = (portfolioTypeFilter || 'ALL').toUpperCase().trim();
    const useFilter = portfolioUseFilter || 'ALL';

    return consolidatedB4.rows.filter(r => {
      if (!r) return false;
      const matchSearch = 
        !term ||
        String(r.propertyRole || '').toLowerCase().includes(term) ||
        String(r.address || '').toLowerCase().includes(term) ||
        String(r.commune || '').toLowerCase().includes(term) ||
        String(r.tenantName || '').toLowerCase().includes(term) ||
        String(r.tenantRut || '').toLowerCase().includes(term) ||
        String(r.propertyType || '').toLowerCase().includes(term);

      const matchType = 
        typeFilter === 'ALL' || 
        String(r.propertyType || '').toUpperCase().includes(typeFilter);

      const matchUse = 
        useFilter === 'ALL' || 
        r.use === useFilter;

      return matchSearch && matchType && matchUse;
    });
  }, [consolidatedB4, portfolioSearchTerm, portfolioTypeFilter, portfolioUseFilter]);

  // Reiniciar a la primera página cuando cambian los filtros
  useEffect(() => {
    setPortfolioCurrentPage(0);
  }, [portfolioSearchTerm, portfolioTypeFilter, portfolioUseFilter, selectedCompany]);

  const portfolioTotalPages = useMemo(() => {
    if (portfolioPageSize === -1) return 1;
    return Math.ceil(filteredB4PortfolioRows.length / portfolioPageSize) || 1;
  }, [filteredB4PortfolioRows.length, portfolioPageSize]);

  const paginatedB4Rows = useMemo(() => {
    if (portfolioPageSize === -1) return filteredB4PortfolioRows;
    const start = portfolioCurrentPage * portfolioPageSize;
    return filteredB4PortfolioRows.slice(start, start + portfolioPageSize);
  }, [filteredB4PortfolioRows, portfolioCurrentPage, portfolioPageSize]);

  // Totalizadores de pie de tabla en una sola pasada O(N) para evitar 14 reducciones durante el render
  const portfolioTotals = useMemo(() => {
    let landM2 = 0;
    let builtM2 = 0;
    let landCost = 0;
    let buildingCost = 0;
    let updatedCost = 0;
    let buildingDepr = 0;
    let buildingNet = 0;
    let correctedDeprec = 0;
    let appraisalLand = 0;
    let appraisalBuilding = 0;
    let appraisalTotal = 0;
    let finalVal = 0;
    let rentCLP = 0;

    for (let i = 0; i < filteredB4PortfolioRows.length; i++) {
      const r = filteredB4PortfolioRows[i];
      landM2 += r.totalM2Land || 0;
      builtM2 += r.totalM2Built || 0;
      landCost += r.landCostCLP || 0;
      buildingCost += r.buildingCostCLP || 0;
      updatedCost += r.updatedCostCLP || 0;
      buildingDepr += r.buildingDepreciationCLP || 0;
      buildingNet += r.buildingNetCostCLP || 0;
      correctedDeprec += r.correctedDepreciatedCostCLP || 0;
      appraisalLand += r.appraisalLandCLP || 0;
      appraisalBuilding += r.appraisalBuildingCLP || 0;
      appraisalTotal += r.appraisalValueCLP || 0;
      finalVal += r.finalValueCLP || 0;
      rentCLP += r.monthlyRentCLP || 0;
    }

    const avgAppraisalLandPerM2 = landM2 > 0 ? Math.trunc(appraisalLand / landM2) : 0;
    const avgAppraisalBuiltPerM2 = builtM2 > 0 ? Math.trunc(appraisalBuilding / builtM2) : 0;

    return {
      landM2,
      builtM2,
      landCost,
      buildingCost,
      updatedCost,
      buildingDepr,
      buildingNet,
      correctedDeprec,
      appraisalLand,
      appraisalBuilding,
      appraisalTotal,
      finalVal,
      rentCLP,
      avgAppraisalLandPerM2,
      avgAppraisalBuiltPerM2
    };
  }, [filteredB4PortfolioRows]);

  const handleExportConsolidatedB4Excel = async () => {
    setIsExportingB4Excel(true);
    try {
      const fileName = `Informe_B4_CMF_Bienes_Raices_${selectedCompany}_${selectedPeriod}.xlsx`;
      const compName = selectedCompany === 'VIDA' ? 'ASSETFLOW VIDA COMPAÑÍA DE SEGUROS S.A.' : 'ASSETFLOW GENERALES COMPAÑÍA DE SEGUROS S.A.';
      await exportB4ConsolidationToExcel(
        filteredB4PortfolioRows,
        fileName,
        compName,
        companyRut,
        selectedPeriod
      );
    } catch (err) {
      console.error('Error al exportar B4 Excel:', err);
      alert('Error al generar archivo Excel B.4: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setIsExportingB4Excel(false);
    }
  };

  const handleRegisterConsolidatedAsOfficialReport = () => {
    if (consolidatedB4.recordsForB4Report.length === 0) {
      alert('No existen inmuebles en la cartera para generar el reporte B.4.');
      return;
    }

    if (filteredReports.some(r => r.period === selectedPeriod)) {
      if (!confirm(`Ya existe un reporte B4 de ${selectedCompany} para el periodo ${selectedPeriod}. ¿Desea sobrescribirlo con la cartera actual consolidada?`)) {
        return;
      }
      const existing = filteredReports.find(r => r.period === selectedPeriod);
      if (existing) onDelete(existing.id);
    }

    const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `b4_rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newReport: B4Report = {
      id: safeId,
      period: selectedPeriod,
      insuranceCompany: selectedCompany,
      uploadDate: new Date().toISOString().split('T')[0],
      records: consolidatedB4.recordsForB4Report,
      userCreator: `${currentUser} (Generador Automático Cartera CMF B.4)`,
      timestamp: Date.now()
    };

    onSave(newReport);
    alert(`Reporte Oficial B.4 para ${selectedCompany} (${selectedPeriod}) generado y guardado exitosamente con ${consolidatedB4.recordsForB4Report.length} bienes raíces.`);
    setActiveTab('HISTORY');
  };

  const filteredReports = useMemo(() => {
    if (!Array.isArray(reports)) return [];
    return reports.filter(r => r && r.insuranceCompany === selectedCompany);
  }, [reports, selectedCompany]);

  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a, b) => String(b?.period || '').localeCompare(String(a?.period || '')));
  }, [filteredReports]);

  const getPreviousMonth = (period: string) => {
    if (!period || !period.includes('-')) return '';
    const [year, month] = period.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    return date.toISOString().slice(0, 7);
  };

  const compareB4Reports = (current: B4Record[], previous: B4Record[]): B4ComparisonResult[] => {
    const results: B4ComparisonResult[] = [];
    const safeCurr = Array.isArray(current) ? current.filter(Boolean) : [];
    const safePrev = Array.isArray(previous) ? previous.filter(Boolean) : [];
    const prevMap = new Map(safePrev.map(r => [r?.propertyRole, r]));

    safeCurr.forEach(curr => {
      if (!curr) return;
      const prev = prevMap.get(curr.propertyRole);
      const prevValue = prev ? (Number(prev.finalValue) || 0) : 0;
      const currValue = Number(curr.finalValue) || 0;
      const diff = currValue - prevValue;
      const pctChange = prevValue !== 0 ? (diff / Math.abs(prevValue)) * 100 : (currValue !== 0 ? 100 : 0);

      let isAnomaly = false;
      let reason = '';

      if (Math.abs(pctChange) > 20 && Math.abs(diff) > 5000000) {
        isAnomaly = true;
        reason = `Variación de valor significativa (>20% y >$5M)`;
      } else if (!prev && currValue !== 0) {
        isAnomaly = true;
        reason = `Propiedad nueva en cartera`;
      } else if (prev && (prev.totalM2Land !== curr.totalM2Land || prev.totalM2Built !== curr.totalM2Built)) {
        isAnomaly = true;
        reason = `Variación en Superficie (Terreno: ${((curr.totalM2Land || 0) - (prev.totalM2Land || 0)).toFixed(2)} m², Const: ${((curr.totalM2Built || 0) - (prev.totalM2Built || 0)).toFixed(2)} m²)`;
      }

      results.push({
        propertyRole: curr.propertyRole || '',
        address: curr.address || '',
        currentValue: currValue,
        previousValue: prevValue,
        difference: diff,
        percentageChange: pctChange,
        currentM2Land: curr.totalM2Land || 0,
        previousM2Land: prev ? prev.totalM2Land : undefined,
        currentM2Built: curr.totalM2Built || 0,
        previousM2Built: prev ? prev.totalM2Built : undefined,
        isAnomaly,
        anomalyReason: reason
      });
    });

    return results;
  };

  // Optimización Google: Computación perezosa (Lazy) de tendencias solo al ingresar a la pestaña TRENDS con Map O(N)
  const trendsData = useMemo(() => {
    if (activeTab !== 'TRENDS') return [];
    if (!Array.isArray(filteredReports) || filteredReports.length === 0) return [];
    
    const allRoles = new Set<string>();
    const roleAddressMap = new Map<string, string>();
    const rolePeriodTotals = new Map<string, number>();

    filteredReports.forEach(r => {
      const period = r?.period;
      (r?.records || []).forEach(rec => {
        if (!rec || !rec.propertyRole) return;
        const role = rec.propertyRole;
        allRoles.add(role);
        if (rec.address && !roleAddressMap.has(role)) {
          roleAddressMap.set(role, rec.address);
        }
        if (period) {
          const key = `${role}__${period}`;
          const current = rolePeriodTotals.get(key) || 0;
          rolePeriodTotals.set(key, current + (Number(rec.finalValue) || 0));
        }
      });
    });
    
    const periods = [...new Set(filteredReports.map(r => r?.period).filter(Boolean))].sort() as string[];
    
    return Array.from(allRoles).map(role => {
      const data: Record<string, any> = { 
        propertyRole: role, 
        address: roleAddressMap.get(role) || ''
      };

      periods.forEach((p: string) => {
        data[p] = rolePeriodTotals.get(`${role}__${p}`) || 0;
      });
      return data;
    });
  }, [filteredReports, activeTab]);

  // Optimización Google: Computación perezosa de análisis solo cuando se necesita (RESULTS o ANALYSIS) con Map O(N)
  const allAnalysisResults = useMemo(() => {
    if (activeTab !== 'RESULTS' && activeTab !== 'ANALYSIS') return [];
    if (!Array.isArray(filteredReports)) return [];
    const results: any[] = [];
    const sortedReportsByPeriod = [...filteredReports].sort((a, b) => String(a?.period || '').localeCompare(String(b?.period || '')));
    
    sortedReportsByPeriod.forEach((report, index) => {
      if (!report) return;
      const prevReport = index > 0 ? sortedReportsByPeriod[index - 1] : null;
      const comparisons = compareB4Reports(report.records || [], prevReport ? (prevReport.records || []) : []);
      const compMap = new Map(comparisons.map(c => [c.propertyRole, c]));
      
      (report.records || []).forEach(record => {
        if (!record) return;
        const comp = compMap.get(record.propertyRole);
        results.push({
          ...record,
          period: report.period,
          comparison: comp,
          reportId: report.id
        });
      });
    });
    
    return results.sort((a, b) => String(b?.period || '').localeCompare(String(a?.period || '')) || String(a?.propertyRole || '').localeCompare(String(b?.propertyRole || '')));
  }, [filteredReports, activeTab]);

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
        return;
      }

      let headerRowIndex = -1;
      const keywords = ['ROL', 'RUT', 'UBICACION', 'COMUNA', 'VALOR_FINAL', 'COSTO_ACTUALIZADO'];
      
      for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const hasKeywords = row.some(cell => cell && keywords.some(kw => String(cell).toUpperCase().includes(kw)));
        if (hasKeywords) {
          headerRowIndex = i;
          break;
        }
      }

      const finalHeaderIndex = headerRowIndex === -1 ? 0 : headerRowIndex;
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: finalHeaderIndex, defval: '' }) as any[];

      const records: B4Record[] = jsonData.map((row, index) => {
        const getValue = (possibleKeys: string[]) => {
          const key = Object.keys(row).find(k => possibleKeys.some(pk => k.toUpperCase().replace(/\s/g, '').includes(pk.toUpperCase())));
          return key ? row[key] : undefined;
        };

        const parseNum = (val: any) => {
          if (typeof val === 'number') return val;
          if (typeof val === 'string' && val.trim() !== '') {
            let cleaned = val.trim();
            if (cleaned.includes('.') && cleaned.includes(',')) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            else if (cleaned.includes('.') && (cleaned.split('.').length > 2 || /\.\d{3}$/.test(cleaned))) cleaned = cleaned.replace(/\./g, '');
            else if (cleaned.includes(',')) cleaned = cleaned.replace(',', '.');
            cleaned = cleaned.replace(/[^0-9.-]/g, '');
            return parseFloat(cleaned) || 0;
          }
          return 0;
        };

        const excelLineNumber = finalHeaderIndex + index + 2;
        const rutVal = getValue(['RUT', 'TAXID', 'IDENTIFICADOR', 'RUT_CUERPO', 'RUT_EMPRESA']);
        const dvVal = getValue(['DV', 'DIGITO_VERIFICADOR', 'RUT_DV', 'DV_EMPRESA']);
        const roleVal = getValue(['ROL', 'PROPERTY_ROLE', 'ROL_SII']);
        const updatedCost = parseNum(getValue(['COSTO_ACTUALIZADO', 'COSTO_HISTORICO_REAJUSTADO', 'COSTO_TOTAL']));
        const explicitLandCost = parseNum(getValue(['VALOR_TERRENO', 'COSTO_TERRENO', 'TERRENO_ACTUALIZADO']));
        const explicitBuildingCost = parseNum(getValue(['VALOR_CONSTRUCCION', 'COSTO_CONSTRUCCION', 'CONSTRUCCION_ACTUALIZADA']));
        const explicitLandDepr = parseNum(getValue(['DEP_TERRENO', 'DEPRECIACION_TERRENO']));
        const accumulatedDepreciation = parseNum(getValue(['DEPRECIACION_ACUMULADA', 'DEP_ACUM', 'DEP_CONSTRUCCION']));
        const correctedDepreciatedCost = parseNum(getValue(['COSTO_CORREGIDO_Y_DEPRECIADO', 'VALOR_LIBRO', 'BOOK_VALUE']));
        const appraisal1 = parseNum(getValue(['TASACION_1', 'VALOR_TASACION_1', 'TASACION_TOTAL']));
        const appraisalLand1 = parseNum(getValue(['TASACION_TERRENO', 'TASACION_TERRENO_1']));
        const appraisalBuilding1 = parseNum(getValue(['TASACION_CONSTRUCCION', 'TASACION_CONSTRUCCION_1']));
        const appraisal2 = parseNum(getValue(['TASACION_2', 'VALOR_TASACION_2']));
        const appraisalDate1 = String(getValue(['FECHA_TASACION_1', 'FECHA_TAS_1']) || '').trim();
        const m2Land = parseNum(getValue(['TOTAL_M2_TERRENO', 'M2_TERRENO']));
        const m2Built = parseNum(getValue(['TOTAL_M2_CONSTRUCCION', 'M2_CONSTRUIDOS']));
        const ownershipPercentage = parseNum(getValue(['COPROPIETARIA', 'PORCENTAJE_PROPIEDAD', 'OWNERSHIP_PERCENT'])) || 100;
        const finalValue = parseNum(getValue(['VALOR_FINAL', 'VALUE', 'TOTAL_VALUE']));
        
        const rawRut = String(rutVal || '').trim();
        const rawDv = String(dvVal || '').trim();
        let rut = rawRut;
        if (rawRut && rawDv && !rawRut.includes('-')) {
          rut = `${rawRut}-${rawDv}`;
        }
        
        const role = String(roleVal || '').trim();
        const communeVal = getValue(['COMUNA', 'COMMUNE', 'CODIGO_COMUNA']);
        const addressVal = getValue(['UBICACION', 'DIRECCION', 'ADDRESS']);
        const purchaseDateVal = getValue(['FECHA_COMPRA', 'PURCHASE_DATE']);
        
        const errors: string[] = [];
        const prefix = `[Fila ${excelLineNumber} | Rol ${role || 'N/A'}]`;
        
        // Identification Validations (SEIL)
        if (!rut) errors.push(`${prefix} RUT en blanco. Solución: Ingrese el RUT de la compañía.`);
        else {
          const [body, dvPart] = rut.includes('-') ? rut.split('-') : [rut, ''];
          if (!validateRut(body, dvPart)) {
            errors.push(`${prefix} RUT/DV inválido (${rut}). Solución: Verifique el dígito verificador del RUT.`);
          }
        }
        
        if (!role) errors.push(`${prefix} Rol en blanco. Solución: Ingrese el número de Rol SII.`);
        else if (!/^\d+-\d+$/.test(role)) {
          errors.push(`${prefix} Formato de Rol incorrecto. Solución: Use el formato numérico con guion (ej: 1234-567).`);
        }

        if (!communeVal) errors.push(`${prefix} Código de Comuna faltante. Solución: Ingrese el código de 3 dígitos de la CMF.`);
        if (!addressVal) errors.push(`${prefix} Dirección faltante. Solución: Ingrese la ubicación física de la propiedad.`);
        if (!purchaseDateVal) errors.push(`${prefix} Fecha de Compra faltante. Solución: Ingrese la fecha de adquisición.`);

        // =========================================================================
        // NORMA DE CARÁCTER GENERAL N° 316 (CMF) - TERRENOS NO AFECTOS A DEPRECIACIÓN
        // =========================================================================
        if (explicitLandDepr > 0) {
          errors.push(`${prefix} Infracción NCG N° 316 CMF: El terreno registra depreciación acumulada ($${explicitLandDepr.toLocaleString('es-CL')}). Conforme a la Norma de Carácter General N° 316 CMF, los terrenos tienen vida útil indefinida y NO están afectos a depreciación.`);
        }

        // Desglose de Terreno y Construcción
        let landCost = explicitLandCost;
        let buildingCost = explicitBuildingCost;
        if (landCost === 0 && buildingCost === 0 && updatedCost > 0) {
          landCost = Math.round(updatedCost * 0.30);
          buildingCost = Math.max(0, updatedCost - landCost);
        } else if (landCost > 0 && buildingCost === 0) {
          buildingCost = Math.max(0, updatedCost - landCost);
        } else if (buildingCost > 0 && landCost === 0) {
          landCost = Math.max(0, updatedCost - buildingCost);
        }

        // Depreciación exclusiva para construcción
        const buildingDepr = accumulatedDepreciation;
        const buildingNet = Math.max(0, buildingCost - buildingDepr);
        const calculatedBookValue = landCost + buildingNet;

        // Valuation Consistency
        if (correctedDepreciatedCost > 0 && Math.abs(correctedDepreciatedCost - calculatedBookValue) > 100) {
          errors.push(`${prefix} Error de Cuadratura Contable NCG 316: El costo neto ($${correctedDepreciatedCost.toLocaleString('es-CL')}) no coincide con Terreno ($${landCost.toLocaleString('es-CL')}) + Construcción Neta ($${buildingNet.toLocaleString('es-CL')}). Solución: Ajuste el costo o la depreciación de construcciones.`);
        }

        // Appraisal Validations (SEIL: Max 24 months)
        if (appraisal1 <= 0 && appraisal2 <= 0) {
          errors.push(`${prefix} Falta Tasación: Toda propiedad debe tener al menos una tasación vigente. Solución: Ingrese el valor de la tasación más reciente.`);
        }

        if (appraisal1 > 0 && !appraisalDate1) {
          errors.push(`${prefix} Fecha de Tasación faltante. Solución: Ingrese la fecha en que se realizó la tasación 1.`);
        } else if (appraisalDate1) {
          const appDate = new Date(appraisalDate1);
          const now = new Date();
          const diffMonths = (now.getFullYear() - appDate.getFullYear()) * 12 + (now.getMonth() - appDate.getMonth());
          if (diffMonths > 24) {
            errors.push(`${prefix} Tasación Vencida: La tasación tiene más de 24 meses (${diffMonths} meses). Solución: Se requiere una nueva tasación según normativa CMF.`);
          }
        }

        // M2 Consistency
        if (m2Land <= 0) {
          errors.push(`${prefix} M2 Terreno en cero. Solución: Ingrese la superficie total del terreno según escritura.`);
        }

        // Ownership
        if (ownershipPercentage <= 0 || ownershipPercentage > 100) {
          errors.push(`${prefix} Porcentaje de propiedad inválido (${ownershipPercentage}%). Solución: Ingrese un valor entre 0.01 y 100.`);
        }

        if (finalValue <= 0) {
          errors.push(`${prefix} Valor Final en cero. Solución: El valor final reportado a la CMF no puede ser nulo.`);
        }

        // Cross-Validation with B13 (SEIL)
        const b13Report = b13Reports.find(b => b.period === selectedPeriod && b.insuranceCompany === selectedCompany);
        if (b13Report) {
          const existsInB13 = b13Report.records.some(b13r => b13r.propertyRole === role);
          if (!existsInB13) {
            errors.push(`${prefix} Alerta de Cruce: El Rol ${role} no registra contratos en el reporte B13.`);
          }
        }

        // NCG 454 Taxonomy
        let riskCategory: 'PROCESOS' | 'PERSONAS' | 'SISTEMAS' | 'INTEGRIDAD' = 'INTEGRIDAD';
        if (errors.some(e => e.includes('Cuadratura') || e.includes('Falta Tasación') || e.includes('Final') || e.includes('316'))) riskCategory = 'PROCESOS';
        else if (errors.some(e => e.includes('RUT'))) riskCategory = 'PERSONAS';
        else if (errors.some(e => e.includes('Rol') || e.includes('Fecha'))) riskCategory = 'SISTEMAS';

        const riskScore = errors.length === 0 ? 0 : (errors.length === 1 ? 40 : (errors.length === 2 ? 70 : 100));

        return {
          id: crypto.randomUUID(),
          lineNumber: excelLineNumber,
          rut,
          propertyRole: role,
          propertyType: {}, 
          urbanRural: 'URBANO',
          destination: 'NO_HABITACIONAL',
          use: (getValue(['USO', 'USE']) || 'PROPIO').toUpperCase(),
          address: String(getValue(['UBICACION', 'DIRECCION', 'ADDRESS']) || '').trim(),
          commune: String(getValue(['COMUNA']) || ''),
          city: String(getValue(['CIUDAD']) || ''),
          purchaseDate: String(getValue(['FECHA_COMPRA']) || ''),
          updatedCost: updatedCost > 0 ? updatedCost : (landCost + buildingCost),
          landUpdatedCost: landCost,
          buildingUpdatedCost: buildingCost,
          accumulatedDepreciation,
          landAccumulatedDepreciation: 0, // NCG 316
          buildingAccumulatedDepreciation: buildingDepr,
          buildingNetCost: buildingNet,
          remainingLifeMonths: parseNum(getValue(['PLAZO', 'VIDA_UTIL_RESTANTE'])),
          correctedDepreciatedCost: correctedDepreciatedCost > 0 ? correctedDepreciatedCost : calculatedBookValue,
          appraisal1,
          appraisal2,
          appraisalLand1: appraisalLand1 > 0 ? appraisalLand1 : Math.round(appraisal1 * 0.30),
          appraisalBuilding1: appraisalBuilding1 > 0 ? appraisalBuilding1 : Math.round(appraisal1 * 0.70),
          appraiser1: String(getValue(['NOMBRE_DEL_TASADOR_1', 'TASADOR_1']) || ''),
          appraiser2: String(getValue(['NOMBRE_DEL_TASADOR_2', 'TASADOR_2']) || ''),
          appraisalDate1,
          appraisalDate2: String(getValue(['FECHA_TASACION_2', 'FECHA_TAS_2']) || ''),
          totalM2Land: m2Land,
          totalM2Built: m2Built,
          appraisalM2Land: parseNum(getValue(['VALOR_TASACION_TERRENO_M2'])),
          appraisalM2Built: parseNum(getValue(['VALOR_TASACION_CONSTRUCCION_M2'])),
          deterioration: parseNum(getValue(['DETERIORO'])),
          finalValue,
          ownershipPercentage,
          hasProhibition: getValue(['PROHIBICION']) === 'S',
          backsReserve: getValue(['ACTIVO_RESPALDA_RESERVA']) === 'S',
          ncg316Compliant: explicitLandDepr === 0,
          validationErrors: errors,
          riskScore,
          riskCategory: errors.length > 0 ? riskCategory : undefined
        } as B4Record;
      }).filter(r => r.propertyRole !== '');

      if (records.length === 0) {
        alert("No se encontraron registros válidos.");
        return;
      }

      setCurrentPreview(records);
      
      const prevMonth = getPreviousMonth(selectedPeriod);
      const prevReport = filteredReports.find(r => r.period === prevMonth);
      const results = compareB4Reports(records, prevReport ? prevReport.records : []);
      setComparisonResults(results);

      setActiveTab('ANALYSIS');
    } catch (error) {
      console.error("Error parsing Excel:", error);
      alert("Error al procesar el archivo Excel.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportPDF = (report?: B4Report) => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'letter'
    });
    const period = report ? report.period : selectedPeriod;
    const company = report ? report.insuranceCompany : selectedCompany;
    const title = `Reporte B4 - ${company} - ${period}`;
    
    // Determine data to export
    let dataToExport = allAnalysisResults.filter(r => r.period === period);
    if (!report && currentPreview.length > 0) {
      dataToExport = currentPreview.map(record => {
        const comp = comparisonResults.find(c => c.propertyRole === record.propertyRole);
        return {
          ...record,
          period: selectedPeriod,
          comparison: comp
        };
      });
    }

    const filteredData = dataToExport.filter(r => 
      r.propertyRole.includes(searchTerm) || 
      (r.address && r.address.toUpperCase().includes(searchTerm.toUpperCase())) ||
      (r.rut && r.rut.includes(searchTerm))
    );

    if (filteredData.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    // Enhanced Logo Handling
    if (companyLogo) {
      try {
        const format = companyLogo.toLowerCase().includes('png') ? 'PNG' : 
                       companyLogo.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
        doc.addImage(companyLogo, format, 14, 10, 30, 15, undefined, 'FAST');
      } catch (e) {
        console.warn("Could not add logo to B4 PDF:", e);
        try {
          doc.addImage(companyLogo, 'JPEG', 14, 10, 30, 15, undefined, 'FAST');
        } catch (e2) {
          doc.setFillColor(79, 70, 229);
          doc.rect(14, 10, 30, 15, 'F');
        }
      }
    } else {
      doc.setFillColor(79, 70, 229);
      doc.rect(14, 10, 30, 15, 'F');
    }
    
    // Company Data
    doc.setFontSize(8);
    doc.setTextColor(40);
    doc.setFont("helvetica", "bold");
    doc.text("CORPORACIÓN INMOBILIARIA", 50, 14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("DEPARTAMENTO INMOBILIARIO", 50, 18);
    doc.text("SANTIAGO, CHILE | RUT: 70.016.400-0", 50, 22);
    
    doc.setDrawColor(230);
    doc.setLineWidth(0.1);
    doc.line(14, 30, 200, 30);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 40);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Usuario: ${currentUser}`, 14, 46);
    doc.text(`Fecha de impresión: ${new Date().toLocaleString('es-CL')}`, 14, 50);

    const tableData = filteredData.map(record => {
      const valDiff = record.comparison?.difference || 0;
      
      return [
        record.rut,
        record.propertyRole,
        record.address || 'N/A',
        record.commune || 'N/A',
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(record.finalValue),
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', signDisplay: 'always' }).format(valDiff),
        `${record.totalM2Land || 0} m²`,
        `${record.totalM2Built || 0} m²`,
        record.validationErrors && record.validationErrors.length > 0 ? 'ERROR' : (record.comparison?.isAnomaly ? 'ALERTA' : 'OK')
      ];
    });

    (doc as any).autoTable({
      startY: 55,
      head: [['RUT', 'Rol', 'Ubicación', 'Comuna', 'Valor Final', 'Dif. Valor', 'M2 Terr.', 'M2 Const.', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: 'F', fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 6 },
      styles: { fontSize: 5, cellPadding: 1 },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'center' }
      },
      didParseCell: function(data: any) {
        if (data.section === 'body' && data.column.index === 5) {
          const val = data.cell.raw;
          if (typeof val === 'string' && (val.includes('+') || val.includes('-')) && !val.includes('$ 0')) {
            data.cell.styles.textColor = [220, 38, 38]; // Red for differences
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.section === 'body' && data.column.index === 8) {
          if (data.cell.raw === 'ERROR' || data.cell.raw === 'ALERTA') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { bottom: 25 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 55;
    
    // Signature Section
    let signatureY = finalY + 25;
    if (signatureY > 240) {
      doc.addPage();
      signatureY = 30;
    }
    
    // Center signature block (Landscape)
    doc.setDrawColor(200, 200, 200);
    doc.line(100, signatureY, 190, signatureY);
    doc.setFontSize(9);
    doc.setTextColor(50, 60, 70);
    doc.setFont("helvetica", "bold");
    doc.text("DEPARTAMENTO INMOBILIARIO", 145, signatureY + 5, { align: "center" });

    // Add Page Numbering & Folio
    const pageCount = (doc as any).internal.getNumberOfPages();
    const b4Folio = `FL-B4-${company}-${period}`.toUpperCase();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, 280, 200, { align: 'right' });
      
      doc.setDrawColor(240);
      doc.line(14, 195, 280, 195);
      doc.text(`Corporación Inmobiliaria - Reporte B4 CMF (Propiedades de Inversión) | Folio: ${b4Folio}`, 14, 200);
    }

    doc.save(`Reporte_B4_${company}_${period}.pdf`);
  };

  const handleExportExcel = (report?: B4Report) => {
    const period = report ? report.period : selectedPeriod;
    const company = report ? report.insuranceCompany : selectedCompany;
    
    // Determine data to export
    let dataToExport = allAnalysisResults.filter(r => r.period === period);
    if (!report && currentPreview.length > 0) {
      dataToExport = currentPreview.map(record => {
        const comp = comparisonResults.find(c => c.propertyRole === record.propertyRole);
        return {
          ...record,
          period: selectedPeriod,
          comparison: comp
        };
      });
    }

    const filteredData = dataToExport.filter(r => 
      String(r.propertyRole || '').includes(searchTerm) || 
      String(r.address || '').toUpperCase().includes(searchTerm.toUpperCase()) ||
      String(r.rut || '').includes(searchTerm)
    );

    if (filteredData.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataRows = filteredData.map(record => ({
      'Periodo': record.period || period,
      'Compañía': company,
      'RUT': record.rut,
      'ROL Propiedad': record.propertyRole,
      'Dirección': record.address || 'N/A',
      'Comuna': record.commune || 'N/A',
      'Valor Final (CLP)': record.finalValue,
      'Diferencia de Valor (CLP)': record.comparison?.difference || 0,
      'M2 Terreno': record.totalM2Land || 0,
      'M2 Construido': record.totalM2Built || 0,
      'Estado ERP': record.validationErrors && record.validationErrors.length > 0 ? 'ERROR' : (record.comparison?.isAnomaly ? 'ALERTA' : 'OK')
    }));

    exportToExcel(dataRows, `Reporte_B4_${company}_${period}`, 'Análisis B4');
  };

  const handleSaveReport = () => {
    if (currentPreview.length === 0) return;
    
    if (filteredReports.some(r => r.period === selectedPeriod)) {
      if (!confirm(`Ya existe un reporte B4 de ${selectedCompany} para el periodo ${selectedPeriod}. ¿Desea sobrescribirlo?`)) {
        return;
      }
      const existing = filteredReports.find(r => r.period === selectedPeriod);
      if (existing) onDelete(existing.id);
    }

    const newReport: B4Report = {
      id: crypto.randomUUID(),
      period: selectedPeriod,
      insuranceCompany: selectedCompany,
      uploadDate: new Date().toISOString().split('T')[0],
      records: currentPreview,
      userCreator: currentUser,
      timestamp: Date.now()
    };

    onSave(newReport);
    alert("Reporte B4 guardado exitosamente.");
    setActiveTab('HISTORY');
    setCurrentPreview([]);
  };

  const lineErrors = currentPreview.filter(r => r.validationErrors && r.validationErrors.length > 0);
  const selectedErrorRecord = useMemo(() => {
    return currentPreview.find(r => r.id === expandedErrorId);
  }, [currentPreview, expandedErrorId]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-6">
          {companyLogo && (
            <img src={companyLogo} alt="Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Módulo Reporte B4 CMF</h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prevalidación de Bienes Raíces</p>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setSelectedCompany('VIDA')}
                  className={`px-3 py-1 rounded-md text-[8px] font-black uppercase transition-all ${selectedCompany === 'VIDA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Seguros de Vida
                </button>
                <button 
                  onClick={() => setSelectedCompany('GENERALES')}
                  className={`px-3 py-1 rounded-md text-[8px] font-black uppercase transition-all ${selectedCompany === 'GENERALES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Seguros Generales
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('CONSOLIDATED_B4')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'CONSOLIDATED_B4' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Building2 size={14} /> Cartera B.4 CMF
          </button>
          <button 
            onClick={() => setActiveTab('UPLOAD')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'UPLOAD' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <FileUp size={14} /> Cargar B4
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <History size={14} /> Historial B4
          </button>
          <button 
            onClick={() => setActiveTab('TRENDS')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'TRENDS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <TrendingUp size={14} /> Tendencias
          </button>
          <button 
            onClick={() => setActiveTab('RESULTS')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'RESULTS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <FileSpreadsheet size={14} /> Resultados
          </button>
          {currentPreview.length > 0 && (
            <>
              <button 
                onClick={() => setActiveTab('ANALYSIS')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'ANALYSIS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <Search size={14} /> Análisis B4
              </button>
              <button 
                onClick={() => handleExportExcel()}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm hover:bg-emerald-100"
                title="Exportar grilla de análisis actual a Excel (.xlsx)"
              >
                <FileSpreadsheet size={14} /> Exportar Excel (.xlsx)
              </button>
              <button 
                onClick={() => handleExportPDF()}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
              >
                <Download size={14} /> Exportar PDF
              </button>
            </>
          )}
          {onSync && (
            <button 
              onClick={onSync}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm hover:bg-emerald-100"
              title="Sincronizar todo a la nube"
            >
              <RefreshCw size={14} className="animate-spin-slow" /> Guardar Permanente
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'CONSOLIDATED_B4' && (
          <div className="space-y-6 max-w-[1700px] mx-auto">
            {/* NORMA DE CARÁCTER GENERAL N° 316 - BANNER NORMATIVO CMF */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl shadow-sm border border-slate-700 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-2.5 rounded-2xl flex items-center justify-center shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-xs uppercase tracking-wider text-emerald-400">Norma de Carácter General N° 316 (CMF)</span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30">Vigente • Circular 1.835</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    La valorización de bienes raíces está <strong>separada estrictamente entre Terreno y Construcción</strong>. Los terrenos tienen vida útil indefinida y <strong>no están afectos a depreciación (Dep. Terreno = $0)</strong>; la depreciación acumulada se aplica únicamente sobre la edificación.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-[10px] text-slate-300 shrink-0">
                <span className="font-bold text-white uppercase">Criterio CMF:</span>
                <span className="text-emerald-400 font-bold">Terreno $0 Dep.</span>
                <span>•</span>
                <span className="text-indigo-300 font-bold">Construcción Depreciable</span>
              </div>
            </div>

            {/* KPI SUMMARY CARDS NCG 316 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inmuebles Declarados</span>
                  <Building2 size={16} className="text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{consolidatedB4.summary.totalProperties}</div>
                <div className="text-[10px] text-slate-500 mt-1 font-semibold">100% Cartera Vigente CMF</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Superficies NCG 316</span>
                  <Layers size={16} className="text-emerald-600" />
                </div>
                <div className="text-xl font-black text-slate-900">
                  {consolidatedB4.summary.totalM2BuiltSum.toLocaleString('es-CL')} <span className="text-xs text-slate-400 font-bold">m² Const.</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                  Terreno: {consolidatedB4.summary.totalM2LandSum.toLocaleString('es-CL')} m²
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Valor Terrenos</span>
                  <DollarSign size={16} className="text-indigo-600" />
                </div>
                <div className="text-xl font-black text-slate-900 truncate">
                  ${Math.round(consolidatedB4.summary.totalLandCostCLP / 1000000).toLocaleString('es-CL')}M <span className="text-xs text-slate-400 font-normal">CLP</span>
                </div>
                <div className="text-[10px] text-emerald-600 mt-1 font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} /> No Afecto a Depreciación
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Construcción Neta</span>
                  <DollarSign size={16} className="text-blue-600" />
                </div>
                <div className="text-xl font-black text-slate-900 truncate">
                  ${Math.round(consolidatedB4.summary.totalBuildingNetCostCLP / 1000000).toLocaleString('es-CL')}M <span className="text-xs text-slate-400 font-normal">CLP</span>
                </div>
                <div className="text-[10px] text-rose-500 mt-1 font-semibold truncate">
                  Dep. Acum: -${Math.round(consolidatedB4.summary.totalBuildingDepreciationCLP / 1000000).toLocaleString('es-CL')}M
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest">Tasación Cartera</span>
                  <Hash size={16} className="text-purple-600" />
                </div>
                <div className="text-xl font-black text-slate-900 truncate">
                  ${Math.round(consolidatedB4.summary.totalAppraisalValueCLP / 1000000).toLocaleString('es-CL')}M <span className="text-xs text-slate-400 font-normal">CLP</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                  ${consolidatedB4.summary.averageAppraisalPerM2Built.toLocaleString('es-CL')}/m² const.
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Activo Neto CMF</span>
                  <ShieldCheck size={16} className="text-emerald-600" />
                </div>
                <div className="text-xl font-black text-emerald-700 truncate">
                  ${Math.round(consolidatedB4.summary.totalFinalValueCLP / 1000000).toLocaleString('es-CL')}M <span className="text-xs text-slate-400 font-normal">CLP</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                  {consolidatedB4.summary.propertiesInRent} Rent / {consolidatedB4.summary.propertiesOwnUse} Prop
                </div>
              </div>
            </div>

            {/* FILTER & ACTION TOOLBAR */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                    <Building2 className="text-indigo-600" size={18} />
                    Informe B.4 Consolidado de Bienes Raíces (Circular CMF 1.835 • NCG 316)
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Declaración periódica con desglose obligatorio entre terreno (vida útil indefinida, no depreciable) y construcción amortizable.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Período:</label>
                    <input 
                      type="month" 
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={handleExportConsolidatedB4Excel}
                    disabled={isExportingB4Excel || filteredB4PortfolioRows.length === 0}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    title="Descargar archivo Excel (.xlsx) estructurado con desglose NCG 316, autofiltros y totales dinámicos"
                  >
                    {isExportingB4Excel ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet size={15} />
                    )}
                    Exportar Cartera B.4 CMF NCG 316 (.xlsx)
                  </button>

                  <button
                    onClick={handleRegisterConsolidatedAsOfficialReport}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    title="Almacenar este consolidado en el Historial Oficial de Reportes B4 del sistema"
                  >
                    <CheckCircle2 size={15} />
                    Registrar en Historial B4
                  </button>
                </div>
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div className="flex flex-col md:flex-row items-center gap-3 pt-2 border-t border-slate-100">
                <div className="relative flex-1 w-full">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={portfolioSearchTerm}
                    onChange={(e) => setPortfolioSearchTerm(e.target.value)}
                    placeholder="Filtrar por ROL SII, Dirección, Comuna, Arrendatario o Tipo..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {portfolioSearchTerm && (
                    <button
                      onClick={() => setPortfolioSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select
                    value={portfolioTypeFilter}
                    onChange={(e) => setPortfolioTypeFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Tipología: Todas</option>
                    <option value="DEPARTAMENTO">Departamentos</option>
                    <option value="OFICINA">Oficinas</option>
                    <option value="LOCAL">Locales</option>
                    <option value="BODEGA">Bodegas</option>
                    <option value="CASA">Casas</option>
                    <option value="ESTACIONAMIENTO">Estacionamientos</option>
                    <option value="TERRENO">Terrenos</option>
                  </select>

                  <select
                    value={portfolioUseFilter}
                    onChange={(e) => setPortfolioUseFilter(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Uso CMF: Todos</option>
                    <option value="ARRIENDO">Destinado a Arriendo</option>
                    <option value="PROPIO">Uso Propio / Matriz</option>
                    <option value="MIXTO">Uso Mixto</option>
                  </select>
                </div>
              </div>
            </div>

            {/* TABULATED DATA GRID NCG 316 */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs font-black uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-emerald-400" />
                  <span>Nómina Tabulada CMF B.4 NCG 316 ({filteredB4PortfolioRows.length} Bienes Raíces)</span>
                </div>
                
                {/* Controles de paginación de alto rendimiento estilo FDA Enterprise */}
                <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-700 text-[10px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">Filas:</span>
                    <select
                      value={portfolioPageSize}
                      onChange={(e) => {
                        setPortfolioPageSize(Number(e.target.value));
                        setPortfolioCurrentPage(0);
                      }}
                      className="bg-slate-900 text-emerald-400 border border-slate-700 rounded-lg px-2 py-0.5 font-bold outline-none cursor-pointer"
                    >
                      <option value={25}>25 por pág.</option>
                      <option value={50}>50 por pág.</option>
                      <option value={100}>100 por pág.</option>
                      <option value={-1}>Todas ({filteredB4PortfolioRows.length})</option>
                    </select>
                  </div>

                  <span className="text-slate-500">•</span>

                  <span className="font-semibold text-slate-300">
                    {filteredB4PortfolioRows.length === 0 ? '0' : (
                      portfolioPageSize === -1 
                        ? `1–${filteredB4PortfolioRows.length}` 
                        : `${portfolioCurrentPage * portfolioPageSize + 1}–${Math.min((portfolioCurrentPage + 1) * portfolioPageSize, filteredB4PortfolioRows.length)}`
                    )} de {filteredB4PortfolioRows.length}
                  </span>

                  {portfolioPageSize !== -1 && portfolioTotalPages > 1 && (
                    <>
                      <span className="text-slate-500">•</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPortfolioCurrentPage(p => Math.max(0, p - 1))}
                          disabled={portfolioCurrentPage === 0}
                          className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded text-[9px] font-bold text-white transition-all cursor-pointer"
                        >
                          ◀ Ant
                        </button>
                        <span className="font-bold text-white px-1">
                          {portfolioCurrentPage + 1}/{portfolioTotalPages}
                        </span>
                        <button
                          onClick={() => setPortfolioCurrentPage(p => Math.min(portfolioTotalPages - 1, p + 1))}
                          disabled={portfolioCurrentPage >= portfolioTotalPages - 1}
                          className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded text-[9px] font-bold text-white transition-all cursor-pointer"
                        >
                          Sig ▶
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[650px] custom-scrollbar">
                <table className="w-full min-w-[2700px] text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 border-b border-slate-300">
                    <tr className="divide-x divide-slate-200">
                      <th className="px-3 py-3 font-black text-center w-12">#</th>
                      <th className="px-3 py-3 font-black text-center w-28">ROL SII</th>
                      <th className="px-3 py-3 font-black text-center w-28">Tipo Inmueble</th>
                      <th className="px-3 py-3 font-black text-center w-24">Destino</th>
                      <th className="px-3 py-3 font-black text-center w-20">Zona</th>
                      <th className="px-3 py-3 font-black text-center w-24">Uso CMF</th>
                      <th className="px-3 py-3 font-black text-center w-16">% Prop.</th>
                      <th className="px-3 py-3 font-black w-28">Comuna</th>
                      <th className="px-3 py-3 font-black w-48">Dirección</th>
                      <th className="px-3 py-3 font-black text-right w-24">M² Terreno</th>
                      <th className="px-3 py-3 font-black text-right w-24">M² Const.</th>
                      {/* Desglose NCG 316 */}
                      <th className="px-3 py-3 font-black text-right w-32 bg-indigo-50/70 text-indigo-900" title="Terreno: No afecto a depreciación según NCG N° 316">
                        Valor Terreno (NCG 316)
                      </th>
                      <th className="px-3 py-3 font-black text-right w-32">Valor Const.</th>
                      <th className="px-3 py-3 font-black text-right w-32">Costo Total</th>
                      <th className="px-3 py-3 font-black text-right w-28 text-rose-700">Dep. Const.</th>
                      <th className="px-3 py-3 font-black text-center w-24 bg-emerald-50/70 text-emerald-800" title="Depreciación Terreno = $0 (Norma de Carácter General N° 316)">
                        Dep. Terr. ($0)
                      </th>
                      <th className="px-3 py-3 font-black text-right w-32">Neto Const.</th>
                      <th className="px-3 py-3 font-black text-right w-32">Costo Deprec. Corr.</th>
                      <th className="px-3 py-3 font-black text-right w-32 bg-indigo-50/50">Tas. Terreno</th>
                      <th className="px-3 py-3 font-black text-right w-24">$/M² Terr.</th>
                      <th className="px-3 py-3 font-black text-right w-32">Tas. Const.</th>
                      <th className="px-3 py-3 font-black text-right w-24">$/M² Const.</th>
                      <th className="px-3 py-3 font-black text-right w-36">Tasación Total</th>
                      <th className="px-3 py-3 font-black text-right w-36 bg-indigo-50/80 text-indigo-950">Valor Final CMF</th>
                      <th className="px-3 py-3 font-black text-center w-16">% Dom.</th>
                      <th className="px-3 py-3 font-black text-center w-16">Grav.</th>
                      <th className="px-3 py-3 font-black text-center w-20">Res. Téc.</th>
                      <th className="px-3 py-3 font-black w-44">Arrendatario</th>
                      <th className="px-3 py-3 font-black text-center w-28">RUT Arrend.</th>
                      <th className="px-3 py-3 font-black text-right w-28">Canon Mensual</th>
                      <th className="px-3 py-3 font-black text-center w-20">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedB4Rows.length === 0 ? (
                      <tr>
                        <td colSpan={31} className="text-center py-12 text-slate-400 font-bold">
                          No se encontraron inmuebles que coincidan con los criterios de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      paginatedB4Rows.map((r, idx) => (
                        <tr 
                          key={r.propertyId || idx}
                          onClick={() => setSelectedB4DetailRow(r)}
                          className="hover:bg-indigo-50/40 transition-colors cursor-pointer divide-x divide-slate-100"
                        >
                          <td className="px-3 py-2 text-center text-slate-400 font-bold">{r.lineNumber}</td>
                          <td className="px-3 py-2 text-center font-black text-slate-900 bg-slate-50/50">{r.propertyRole}</td>
                          <td className="px-3 py-2 text-center font-bold text-slate-700">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px]">
                              {r.propertyType}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-[10px] font-bold text-slate-600">
                            {r.destination}
                          </td>
                          <td className="px-3 py-2 text-center text-[10px] font-bold text-slate-500">
                            {r.urbanRural}
                          </td>
                          <td className="px-3 py-2 text-center font-bold">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                              r.use === 'ARRIENDO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              r.use === 'PROPIO' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {r.use}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-600">{r.ownUsePercentage}%</td>
                          <td className="px-3 py-2 text-slate-700 font-medium">{r.commune}</td>
                          <td className="px-3 py-2 text-slate-800 font-bold truncate max-w-[200px]" title={r.address}>{r.address}</td>
                          <td className="px-3 py-2 text-right text-slate-600 font-medium">{r.totalM2Land.toLocaleString('es-CL')} m²</td>
                          <td className="px-3 py-2 text-right font-black text-slate-900 bg-slate-50/30">{r.totalM2Built.toLocaleString('es-CL')} m²</td>
                          
                          {/* Desglose NCG 316: Terreno y Construcción */}
                          <td className="px-3 py-2 text-right font-black text-indigo-900 bg-indigo-50/40">
                            ${r.landCostCLP.toLocaleString('es-CL')}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700">${r.buildingCostCLP.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2 text-right text-slate-600 font-medium">${r.updatedCostCLP.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2 text-right text-rose-600 font-medium">-${r.buildingDepreciationCLP.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-700 bg-emerald-50/30">
                            $0
                          </td>
                          <td className="px-3 py-2 text-right text-slate-800 font-bold">${r.buildingNetCostCLP.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2 text-right text-slate-700 font-semibold">${r.correctedDepreciatedCostCLP.toLocaleString('es-CL')}</td>
                          
                          {/* Tasaciones Desglosadas */}
                          <td className="px-3 py-2 text-right text-slate-800 font-medium bg-slate-50/30">${r.appraisalLandCLP.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2 text-right text-slate-600 font-mono text-[11px]">${r.appraisalPerM2LandCLP.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2 text-right text-slate-800 font-medium">${r.appraisalBuildingCLP.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2 text-right font-bold text-indigo-700 font-mono text-[11px]">${r.appraisalValuePerM2BuiltCLP.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2 text-right font-black text-slate-900 bg-slate-50/50">${r.appraisalValueCLP.toLocaleString('es-CL')}</td>
                          
                          <td className="px-3 py-2 text-right font-black text-indigo-900 bg-indigo-50/50">${r.finalValueCLP.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2 text-center font-bold text-slate-700">{r.ownershipPercentage}%</td>
                          <td className="px-3 py-2 text-center font-bold text-slate-500">{r.hasProhibition ? 'SÍ' : 'NO'}</td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-600">{r.backsReserve ? 'SÍ' : 'NO'}</td>
                          <td className="px-3 py-2 text-slate-800 font-bold truncate max-w-[180px]" title={r.tenantName}>{r.tenantName}</td>
                          <td className="px-3 py-2 text-center text-slate-600 font-mono text-[11px]">{r.tenantRut}</td>
                          <td className="px-3 py-2 text-right font-black text-slate-800">${r.monthlyRentCLP.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedB4DetailRow(r);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                            >
                              Ver Ficha
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredB4PortfolioRows.length > 0 && (
                    <tfoot className="sticky bottom-0 z-10 bg-slate-900 text-white font-black text-xs border-t-2 border-slate-700">
                      <tr className="divide-x divide-slate-800">
                        <td colSpan={9} className="px-4 py-3 text-right uppercase tracking-wider text-slate-300">
                          Totales Cartera NCG 316 ({filteredB4PortfolioRows.length} Inmuebles):
                        </td>
                        <td className="px-3 py-3 text-right">
                          {portfolioTotals.landM2.toLocaleString('es-CL')} m²
                        </td>
                        <td className="px-3 py-3 text-right text-emerald-400">
                          {portfolioTotals.builtM2.toLocaleString('es-CL')} m²
                        </td>
                        <td className="px-3 py-3 text-right text-indigo-300 bg-indigo-950/60">
                          ${portfolioTotals.landCost.toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-3 text-right">
                          ${portfolioTotals.buildingCost.toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-3 text-right">
                          ${portfolioTotals.updatedCost.toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-3 text-right text-rose-300">
                          -${portfolioTotals.buildingDepr.toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-3 text-center text-emerald-400 bg-emerald-950/40">
                          $0
                        </td>
                        <td className="px-3 py-3 text-right">
                          ${portfolioTotals.buildingNet.toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-3 text-right">
                          ${portfolioTotals.correctedDeprec.toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-3 text-right text-indigo-200">
                          ${portfolioTotals.appraisalLand.toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-400">
                          ${portfolioTotals.avgAppraisalLandPerM2.toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-3 text-right">
                          ${portfolioTotals.appraisalBuilding.toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-3 text-right text-purple-300">
                          ${portfolioTotals.avgAppraisalBuiltPerM2.toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-3 text-right text-amber-300">
                          ${portfolioTotals.appraisalTotal.toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-3 text-right text-emerald-300 bg-indigo-950/80">
                          ${portfolioTotals.finalVal.toLocaleString('es-CL')}
                        </td>
                        <td colSpan={5}></td>
                        <td className="px-3 py-3 text-right text-emerald-400">
                          ${portfolioTotals.rentCLP.toLocaleString('es-CL')}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE FICHA TÉCNICA OFICIAL CMF B.4 */}
        {selectedB4DetailRow && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedB4DetailRow(null)}>
            <div className="bg-white rounded-[36px] w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-slate-900 text-white px-8 py-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2.5 rounded-2xl"><Building2 size={22} className="text-white" /></div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight">Ficha Técnica Bien Raíz — CMF B.4</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                      Rol SII: {selectedB4DetailRow.propertyRole} | Tipología: {selectedB4DetailRow.propertyType} | Comuna: {selectedB4DetailRow.commune}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedB4DetailRow(null)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar text-xs">
                {/* 1. UBICACIÓN E IDENTIFICACIÓN */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <MapPin size={13} className="text-indigo-600" /> Identificación Registral y Territorial
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Dirección Oficial</span>
                      <span className="font-bold text-slate-900">{selectedB4DetailRow.address}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Comuna / Ciudad</span>
                      <span className="font-bold text-slate-900">{selectedB4DetailRow.commune}, {selectedB4DetailRow.city}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Destino CMF</span>
                      <span className="font-bold text-slate-900">{selectedB4DetailRow.destination}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Zona</span>
                      <span className="font-bold text-slate-900">{selectedB4DetailRow.urbanRural}</span>
                    </div>
                  </div>
                </div>

                {/* 2. SUPERFICIES Y VALORES UNITARIOS NCG 316 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
                    <span className="text-indigo-600 text-[10px] font-black uppercase block">M² Terreno</span>
                    <span className="text-lg font-black text-indigo-900">{selectedB4DetailRow.totalM2Land.toLocaleString('es-CL')} m²</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">${selectedB4DetailRow.appraisalPerM2LandCLP.toLocaleString('es-CL')}/m²</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-slate-600 text-[10px] font-black uppercase block">M² Construidos</span>
                    <span className="text-lg font-black text-slate-900">{selectedB4DetailRow.totalM2Built.toLocaleString('es-CL')} m²</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">${selectedB4DetailRow.appraisalValuePerM2BuiltCLP.toLocaleString('es-CL')}/m²</span>
                  </div>
                  <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100">
                    <span className="text-emerald-700 text-[10px] font-black uppercase block">Tasación Terreno</span>
                    <span className="text-lg font-black text-emerald-900">${selectedB4DetailRow.appraisalLandCLP.toLocaleString('es-CL')}</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5 font-bold">No Depreciable</span>
                  </div>
                  <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100">
                    <span className="text-purple-700 text-[10px] font-black uppercase block">Tasación Const.</span>
                    <span className="text-lg font-black text-purple-900">${selectedB4DetailRow.appraisalBuildingCLP.toLocaleString('es-CL')}</span>
                    <span className="text-[10px] text-purple-600 block mt-0.5 font-bold">Amortizable</span>
                  </div>
                </div>

                {/* 3. DESGLOSE CONTABLE EXCLUSIVO NCG 316 (TERRENO VS CONSTRUCCIÓN) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* TERRENO */}
                  <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="text-[11px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={13} className="text-indigo-600" /> Terreno (NCG N° 316 CMF)
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded-md">
                        Vida Útil Indefinida
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Valor Terreno Actualizado:</span>
                        <span className="font-bold text-slate-800">${selectedB4DetailRow.landCostCLP.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Depreciación Acumulada:</span>
                        <span className="font-black text-emerald-600">$0 (No Afecto por NCG 316)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Tasación Pericial Terreno:</span>
                        <span className="font-bold text-indigo-900">${selectedB4DetailRow.appraisalLandCLP.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Valor Unitario $/M² Terreno:</span>
                        <span className="font-mono font-bold text-slate-800">${selectedB4DetailRow.appraisalPerM2LandCLP.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-[10px] text-emerald-800 font-medium">
                        Normativa CMF: Los terrenos no sufren pérdida de valor por uso o paso del tiempo, manteniéndose sin depreciación acumulada.
                      </div>
                    </div>
                  </div>

                  {/* CONSTRUCCIÓN */}
                  <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-600" /> Construcción (Depreciable)
                      </div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-black uppercase rounded-md">
                        {selectedB4DetailRow.remainingLifeMonths} Meses Remanentes
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Valor Construcción Bruta:</span>
                        <span className="font-bold text-slate-800">${selectedB4DetailRow.buildingCostCLP.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Depreciación Acumulada:</span>
                        <span className="font-black text-rose-600">-${selectedB4DetailRow.buildingDepreciationCLP.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Costo Neto Construcción:</span>
                        <span className="font-black text-slate-900">${selectedB4DetailRow.buildingNetCostCLP.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Tasación Construcción:</span>
                        <span className="font-bold text-slate-800">${selectedB4DetailRow.appraisalBuildingCLP.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500">Valor Unitario $/M² Const.:</span>
                        <span className="font-mono font-bold text-indigo-700">${selectedB4DetailRow.appraisalValuePerM2BuiltCLP.toLocaleString('es-CL')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. TOTALES CONSOLIDADOS Y VALOR FINAL CMF */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>Consolidación Regulatoria CMF (Circular 1.835 / NCG 316)</span>
                    <span className="text-emerald-400 font-bold">% Dominio: {selectedB4DetailRow.ownershipPercentage}%</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 border-t border-slate-800">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Costo Actualizado Total</span>
                      <span className="text-base font-black text-white">${selectedB4DetailRow.updatedCostCLP.toLocaleString('es-CL')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Costo Deprec. Corregido</span>
                      <span className="text-base font-black text-slate-200">${selectedB4DetailRow.correctedDepreciatedCostCLP.toLocaleString('es-CL')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Tasación Pericial Total</span>
                      <span className="text-base font-black text-amber-300">${selectedB4DetailRow.appraisalValueCLP.toLocaleString('es-CL')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Valor Libro Final CMF</span>
                      <span className="text-base font-black text-emerald-400">${selectedB4DetailRow.finalValueCLP.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                </div>

                {/* 4. EXPLOTACIÓN Y RENTA */}
                <div className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 space-y-3">
                  <div className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" /> Situación Contractual y Renta
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Uso Asignado</span>
                      <span className="font-bold text-slate-900">{selectedB4DetailRow.use} ({selectedB4DetailRow.ownUsePercentage}% propio)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Arrendatario / Titular</span>
                      <span className="font-bold text-slate-900 truncate block">{selectedB4DetailRow.tenantName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">RUT Inquilino</span>
                      <span className="font-mono font-bold text-slate-900">{selectedB4DetailRow.tenantRut}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Canon Mensual</span>
                      <span className="font-black text-emerald-700">${selectedB4DetailRow.monthlyRentCLP.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedB4DetailRow(null)}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Cerrar Ficha
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'UPLOAD' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white rounded-[32px] p-10 shadow-sm border border-slate-100">
              <h2 className="text-lg font-black text-slate-800 uppercase mb-6">Carga de Reporte B4</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Periodo</label>
                  <input 
                    type="month" 
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-64 border-4 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
                >
                  {isUploading ? (
                    <Loader2 size={48} className="text-indigo-500 animate-spin" />
                  ) : (
                    <>
                      <FileSpreadsheet size={48} className="text-slate-200 group-hover:text-indigo-400 mb-4 transition-colors" />
                      <p className="text-sm font-black text-slate-400 group-hover:text-indigo-600 uppercase">Seleccionar Excel B4</p>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sortedReports.map(report => (
              <div key={report.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{report.period}</div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleExportPDF(report)} 
                      className="text-slate-300 hover:text-indigo-600 transition-colors"
                      title="Exportar PDF"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(report.id)} 
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase">Bienes Raíces (B4)</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Cargado el {report.uploadDate}</p>
                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-700">{report.records.length} Propiedades</span>
                  <button 
                    onClick={() => { setCurrentPreview(report.records); setActiveTab('ANALYSIS'); }}
                    className="text-[10px] font-black text-indigo-600 uppercase hover:underline"
                  >
                    Ver Detalle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ANALYSIS' && (
          <div className="space-y-8">
            {/* AUXILIAR VALIDATION WARNING */}
            {(() => {
              const hasAuxiliar = reconciliations?.some(r => 
                r.period === selectedPeriod && 
                (r.fileName.toUpperCase().includes('PROPIEDAD') || r.fileName.toUpperCase().includes('INVERSION') || r.sheets.some(s => s.sheetName.toUpperCase().includes('PROPIEDAD') || s.sheetName.toUpperCase().includes('INVERSION')))
              );
              if (!hasAuxiliar) {
                return (
                  <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[24px] flex items-center gap-4 animate-pulse">
                    <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-amber-900 uppercase">Advertencia: Auxiliar de Propiedades de Inversión no detectado</p>
                      <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">
                        No se ha encontrado la información del Libro Auxiliar de Propiedades de Inversión para el periodo {selectedPeriod}. 
                        Se recomienda cargar la conciliación correspondiente para asegurar la integridad de los datos.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* SEARCH AND FILTERS */}
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por Rol, Dirección o RUT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <button onClick={handleSaveReport} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-all">
                <CheckCircle2 size={16} /> Guardar Reporte B4
              </button>
            </div>

            {/* COMPARISON SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Propiedades</p>
                <p className="text-2xl font-black text-slate-900">{currentPreview.length}</p>
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Total Cartera</p>
                <p className="text-2xl font-black text-indigo-600">
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(currentPreview.reduce((sum, r) => sum + r.finalValue, 0))}
                </p>
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Alertas / Anomalías</p>
                <p className="text-2xl font-black text-amber-600">{comparisonResults.filter(r => r.isAnomaly).length}</p>
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Errores de Validación</p>
                <p className="text-2xl font-black text-rose-600">{lineErrors.length}</p>
              </div>
            </div>

            {/* COMPARISON TABLE */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol / Ubicación</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Actual</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Anterior</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Diferencia</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {comparisonResults
                      .filter(r => r.propertyRole.includes(searchTerm) || r.address.toUpperCase().includes(searchTerm.toUpperCase()))
                      .map((res, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="text-xs font-black text-slate-900 uppercase">{res.propertyRole}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{res.address}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-xs font-black text-slate-700">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(res.currentValue)}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-xs font-bold text-slate-400">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(res.previousValue)}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`flex items-center justify-end gap-1 text-xs font-black ${res.difference > 0 ? 'text-emerald-600' : res.difference < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {res.difference > 0 ? <TrendingUp size={12}/> : res.difference < 0 ? <TrendingDown size={12}/> : null}
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', signDisplay: 'always' }).format(res.difference)}
                            <span className="text-[8px] ml-1">({res.percentageChange.toFixed(1)}%)</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            {res.isAnomaly ? (
                              <div className="group relative">
                                <AlertTriangle className="text-amber-500" size={18} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[8px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  {res.anomalyReason}
                                </div>
                              </div>
                            ) : (
                              <CheckCircle2 className="text-emerald-500" size={18} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ERROR CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lineErrors.map((errorRec, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setExpandedErrorId(errorRec.id)}
                  className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm cursor-pointer hover:border-amber-400 transition-all"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-2 py-1 rounded uppercase">Fila {errorRec.lineNumber}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Rol: {errorRec.propertyRole}</span>
                  </div>
                  <p className="text-xs font-black text-slate-800 uppercase truncate">{errorRec.address}</p>
                  <div className="mt-2 space-y-1">
                    {errorRec.validationErrors?.map((err, i) => (
                      <p key={i} className="text-[9px] font-bold text-rose-600 uppercase flex items-center gap-1">
                        <AlertTriangle size={10} /> {err.split('. Solución: ')[0]}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'TRENDS' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase mb-6">Tendencia de Valorización por Propiedad</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol / Dirección</th>
                      {[...new Set(filteredReports.map(r => r.period))].sort().map((p: string) => (
                        <th key={p} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {trendsData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-xs font-black text-slate-900 uppercase">{row.propertyRole}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{row.address}</p>
                        </td>
                        {[...new Set(filteredReports.map(r => r.period))].sort().map((p: string) => (
                          <td key={p} className="px-6 py-4 text-right">
                            <p className="text-xs font-black text-slate-700">
                              {row[p] ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(row[p]) : '-'}
                            </p>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'RESULTS' && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Filtrar resultados históricos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Periodo</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dirección</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Final</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Diferencia</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allAnalysisResults
                      .filter(r => r.propertyRole.includes(searchTerm) || r.address.toUpperCase().includes(searchTerm.toUpperCase()))
                      .map((res, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase">{res.period}</span>
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-slate-900 uppercase">{res.propertyRole}</td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{res.address}</td>
                        <td className="px-6 py-4 text-right text-xs font-black text-slate-700">
                          {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(res.finalValue)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`text-[10px] font-black ${res.comparison?.difference > 0 ? 'text-emerald-600' : res.comparison?.difference < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', signDisplay: 'always' }).format(res.comparison?.difference || 0)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            {res.validationErrors && res.validationErrors.length > 0 ? (
                              <AlertTriangle className="text-rose-500" size={16} />
                            ) : res.comparison?.isAnomaly ? (
                              <AlertTriangle className="text-amber-500" size={16} />
                            ) : (
                              <CheckCircle2 className="text-emerald-500" size={16} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {selectedErrorRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setExpandedErrorId(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-amber-50 px-10 py-8 border-b border-amber-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl"><AlertTriangle size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-amber-900 uppercase">Inconsistencia B4</h2>
                  <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">Fila {selectedErrorRecord.lineNumber} | Rol {selectedErrorRecord.propertyRole} | RUT {selectedErrorRecord.rut}</p>
                </div>
              </div>
              <button onClick={() => setExpandedErrorId(null)} className="p-3 bg-white text-slate-400 rounded-2xl shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              {/* VALUATION INFO */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valoración Contable</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-bold">Costo Actualizado:</span>
                      <span className="font-black text-slate-700">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedErrorRecord.updatedCost)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-bold">Dep. Acumulada:</span>
                      <span className="font-black text-rose-600">-{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedErrorRecord.accumulatedDepreciation)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
                      <span className="text-slate-900 font-black">Valor Libro:</span>
                      <span className="font-black text-indigo-600">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedErrorRecord.correctedDepreciatedCost)}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasaciones Vigentes</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-bold">Tasación 1:</span>
                      <span className="font-black text-slate-700">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedErrorRecord.appraisal1)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-bold">Fecha T1:</span>
                      <span className="font-black text-slate-400">{selectedErrorRecord.appraisalDate1 || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-bold">Tasación 2:</span>
                      <span className="font-black text-slate-700">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedErrorRecord.appraisal2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PHYSICAL SPECS */}
              <div className="bg-slate-50 rounded-3xl p-6 grid grid-cols-2 gap-6 border border-slate-100">
                <div className="text-center space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Superficie Terreno</p>
                  <p className="text-xs font-black text-slate-700">{selectedErrorRecord.totalM2Land || 0} m²</p>
                </div>
                <div className="text-center space-y-1 border-l border-slate-200">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Superficie Construida</p>
                  <p className="text-xs font-black text-slate-700">{selectedErrorRecord.totalM2Built || 0} m²</p>
                </div>
              </div>

              {/* ERROR LIST */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Análisis de Integridad B4</p>
                <div className="space-y-3">
                  {selectedErrorRecord.validationErrors?.map((err, i) => {
                    const [msg, sol] = err.split('. Solución: ');
                    return (
                      <div key={i} className="bg-rose-50 rounded-2xl p-5 border border-rose-100 space-y-3">
                        <p className="text-xs font-black text-rose-800 uppercase leading-relaxed">{msg}</p>
                        {sol && (
                          <div className="bg-white/60 rounded-xl p-3 border border-rose-50 flex gap-2">
                            <span className="text-lg">💡</span>
                            <p className="text-[11px] font-bold text-slate-600">
                              <span className="text-indigo-600 font-black uppercase text-[9px] block mb-1">Acción Sugerida:</span>
                              {sol}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-10 py-6 border-t border-slate-100 flex justify-end shrink-0">
              <button onClick={() => setExpandedErrorId(null)} className="px-8 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors">Cerrar Detalle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default B4ReportModule;
