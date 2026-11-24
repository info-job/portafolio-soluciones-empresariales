
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileUp, AlertTriangle, CheckCircle2, ArrowRight, 
  History, Search, Filter, Download, Trash2, 
  TrendingUp, TrendingDown, Info, Loader2, FileSpreadsheet, X,
  ClipboardList, Clock, CheckCircle, AlertCircle, FileText, RefreshCw,
  Layers, Building2, ShieldCheck, Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { B13Report, B13Record, B13ComparisonResult, InsuranceCompany, B13Task, B4Report, AccountingReconciliation, Property, LeaseContract } from '../types';
import { storage } from '../lib/storageEngine';
import { exportToExcel } from '../lib/excelExport';
import { 
  buildB13PortfolioConsolidation, 
  exportB13ConsolidationToExcel, 
  B13PortfolioConsolidationRow 
} from '../lib/b13Generator';

interface B13ReportModuleProps {
  reports: B13Report[];
  b4Reports?: B4Report[];
  reconciliations?: AccountingReconciliation[];
  properties?: Property[];
  leaseContracts?: LeaseContract[];
  onSave: (report: B13Report) => void;
  onDelete: (id: string) => void;
  onSync?: () => Promise<void>;
  currentUser: string;
  companyLogo?: string | null;
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

const generateMnemonicCode = (region: string, commune: string, role: string, unit: string): string => {
  // Rule: Region (2) + Commune (3) + Role (11) + Unit (9) = 25 chars
  const r = region.padStart(2, '0').slice(-2);
  const c = commune.padStart(3, '0').slice(-3);
  const rol = role.replace(/[^0-9]/g, '').padStart(11, '0').slice(-11);
  const u = unit.toUpperCase().padStart(9, '0').slice(-9);
  return `${r}${c}${rol}${u}`;
};

const B13ReportModule: React.FC<B13ReportModuleProps> = ({ 
  reports, 
  b4Reports = [], 
  reconciliations = [],
  properties = [],
  leaseContracts = [],
  onSave, 
  onDelete, 
  onSync,
  currentUser, 
  companyLogo 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany>('VIDA');
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const [comparisonResults, setComparisonResults] = useState<B13ComparisonResult[]>([]);
  const [currentPreview, setCurrentPreview] = useState<B13Record[]>([]);
  const [activeTab, setActiveTab] = useState<'UPLOAD' | 'HISTORY' | 'ANALYSIS' | 'TRENDS' | 'RESULTS' | 'TASKS' | 'CONSOLIDATED_B13'>('CONSOLIDATED_B13');
  const [tasks, setTasks] = useState<B13Task[]>(() => {
    const saved = localStorage.getItem('b13_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados específicos para Consolidado B13 de Cartera y Morosidad
  const [portfolioSearchTerm, setPortfolioSearchTerm] = useState('');
  const [portfolioFilter, setPortfolioFilter] = useState<'ALL' | 'MOROSOS' | 'AL_DIA'>('ALL');
  const [isExportingB13Excel, setIsExportingB13Excel] = useState(false);
  const [selectedDetailRow, setSelectedDetailRow] = useState<B13PortfolioConsolidationRow | null>(null);

  const [internalProperties, setInternalProperties] = useState<Property[]>(() => {
    if (properties && properties.length > 0) return properties;
    try {
      const local = localStorage.getItem('properties');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });

  const [internalContracts, setInternalContracts] = useState<LeaseContract[]>(() => {
    if (leaseContracts && leaseContracts.length > 0) return leaseContracts;
    try {
      const local = localStorage.getItem('leaseContracts');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (properties && properties.length > 0) {
      setInternalProperties(properties);
    }
  }, [properties]);

  useEffect(() => {
    if (leaseContracts && leaseContracts.length > 0) {
      setInternalContracts(leaseContracts);
    }
  }, [leaseContracts]);

  // Consolidado de Cartera y Morosidad B13
  const consolidation = useMemo(() => {
    return buildB13PortfolioConsolidation(internalProperties, internalContracts);
  }, [internalProperties, internalContracts]);

  const filteredConsolidationRows = useMemo(() => {
    let list = consolidation.rows;
    if (portfolioFilter === 'MOROSOS') {
      list = list.filter(r => r.hasMorosity);
    } else if (portfolioFilter === 'AL_DIA') {
      list = list.filter(r => !r.hasMorosity);
    }

    if (portfolioSearchTerm.trim()) {
      const q = portfolioSearchTerm.toLowerCase().trim();
      list = list.filter(r => 
        r.role.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.commune.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.tenantName.toLowerCase().includes(q) ||
        r.tenantRut.toLowerCase().includes(q)
      );
    }
    return list;
  }, [consolidation.rows, portfolioFilter, portfolioSearchTerm]);

  const handleExportConsolidationExcel = async () => {
    try {
      setIsExportingB13Excel(true);
      const fileName = `Informe_B13_Consolidado_Cartera_${new Date().toISOString().slice(0, 10)}.xlsx`;
      await exportB13ConsolidationToExcel(consolidation.rows, fileName);
    } catch (err: any) {
      console.error('Error al exportar B13 consolidado:', err);
      alert('Error al generar archivo Excel: ' + (err?.message || 'Error desconocido'));
    } finally {
      setIsExportingB13Excel(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => r.insuranceCompany === selectedCompany);
  }, [reports, selectedCompany]);

  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a, b) => b.period.localeCompare(a.period));
  }, [filteredReports]);

  const periods = useMemo<string[]>(() => {
    return [...new Set(filteredReports.map(r => r.period))].sort();
  }, [filteredReports]);

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
      const keywords = ['CODIGO', 'CÓDIGO', 'CUENTA', 'ACCOUNT', 'NOMBRE', 'MONTO', 'SALDO', 'AMOUNT', 'VALOR', 'CTA', 'GLOSA'];
      
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

      const records: B13Record[] = jsonData.map((row, index) => {
        const getValue = (possibleKeys: string[]) => {
          const key = Object.keys(row).find(k => possibleKeys.some(pk => k.toUpperCase().replace(/\s/g, '').includes(pk.toUpperCase())));
          return key ? row[key] : undefined;
        };

        const excelLineNumber = finalHeaderIndex + index + 2;
        
        const roleVal = getValue(['ROL', 'PROPERTY_ROLE', 'ROL_PROPIEDAD', 'ID_PROPIEDAD']);
        const communeVal = getValue(['COMUNA', 'COMMUNE', 'CODIGO_COMUNA']);
        const regionVal = getValue(['REGION', 'REGIÓN', 'CODIGO_REGION']);
        const unitVal = getValue(['UNIDAD', 'UNIT', 'ID_UNIDAD', 'LOCAL', 'OFICINA']);
        
        const tenantNameVal = getValue(['ARRENDATARIO', 'TENANT', 'NOMBRE_DEUDOR', 'NOMBRE_ARRENDATARIO']);
        const tenantRutVal = getValue(['RUT_ARRENDATARIO', 'TENANT_RUT', 'RUT_DEUDOR', 'RUT_CUERPO', 'RUT']);
        const tenantDvVal = getValue(['DV_ARRENDATARIO', 'TENANT_DV', 'DV_DEUDOR', 'DIGITO_VERIFICADOR', 'DV']);
        const economicActivityVal = getValue(['ACTIVIDAD_ECONOMICA', 'ECONOMIC_ACTIVITY', 'CODIGO_ACTIVIDAD']);
        const relatedPartyVal = getValue(['RELACION', 'RELATED_PARTY', 'VINCULO']);
        const expirationVal = getValue(['VENCIMIENTO', 'EXPIRATION', 'FECHA_VENCIMIENTO']);
        const mnemonicVal = getValue(['CODIGO_IDENTIFICACION', 'MNEMONIC', 'NEMOTECNICO']);
        const invoiceNumberVal = getValue(['NUMERO_FACTURA', 'FACTURA', 'N_FACTURA', 'INVOICE_NUMBER']);
        const issueDateVal = getValue(['FECHA_EMISION', 'FECHA', 'FECHA_FACTURA', 'ISSUE_DATE']);
        
        const billedVal = getValue(['FACTURACION', 'BILLED', 'MONTO_FACTURADO', 'FACTURACION_MES']);
        const collectedCurrentVal = getValue(['RECAUDACION_MES', 'COLLECTED_CURRENT', 'RECAUDACION_ACTUAL']);
        const collectedPreviousVal = getValue(['RECAUDACION_ANTERIOR', 'COLLECTED_PREVIOUS']);
        const pendingNoMorosityVal = getValue(['SIN_MOROSIDAD', 'PENDING_NO_MOROSITY', 'MONTO_SIN_MOROSIDAD']);
        
        const m30Val = getValue(['M30', 'MOROSIDAD_30', 'MENOR_30']);
        const m60Val = getValue(['M60', 'MOROSIDAD_60', 'ENTRE_30_60']);
        const m90Val = getValue(['M90', 'MOROSIDAD_90', 'ENTRE_60_90']);
        const m180Val = getValue(['M180', 'MOROSIDAD_180', 'ENTRE_90_180']);
        const m365Val = getValue(['M365', 'MOROSIDAD_365', 'ENTRE_180_365']);
        const m2yVal = getValue(['M2Y', 'MOROSIDAD_2Y', 'ENTRE_1_2_ANOS']);
        const m3yVal = getValue(['M3Y', 'MOROSIDAD_3Y', 'ENTRE_2_3_ANOS']);
        const m4yVal = getValue(['M4Y', 'MOROSIDAD_4Y', 'ENTRE_3_4_ANOS']);
        const plus4yVal = getValue(['PLUS4Y', 'MOROSIDAD_MAS_4', 'MAYOR_4_ANOS']);
        
        const badDebtVal = getValue(['PROVISION', 'BAD_DEBT', 'PROVISION_INCOBRABILIDAD']);
        const propertyTypeVal = getValue(['TIPO_BIEN_RAIZ', 'PROPERTY_TYPE', 'DESTINO']);
        const overdueInstallmentsVal = getValue(['CUOTAS_VENCIDAS', 'OVERDUE_INSTALLMENTS']);
        const reprogrammingTypeVal = getValue(['REPROGRAMACION', 'REPROGRAMMING_TYPE']);
        const reprogrammingAmountVal = getValue(['MONTO_REPROGRAMACION', 'REPROGRAMMING_AMOUNT']);
        
        const m2AvailableVal = getValue(['M2_DISPONIBLES', 'TOTAL_M2', 'SUPERFICIE']);
        const m2RentedVal = getValue(['M2_ARRENDADOS', 'M2_OCUPADOS']);
        const m2VacantVal = getValue(['M2_VACANTES', 'M2_LIBRES']);
        const contractTypeVal = getValue(['TIPO_CONTRATO', 'CONTRACT_TYPE']);
        const rentValueUFVal = getValue(['VALOR_M2_UF', 'RENT_UF']);
        const expectedRentValueUFVal = getValue(['VALOR_ESPERADO_UF', 'EXPECTED_RENT_UF']);
        
        const debtOriginalVal = getValue(['DEUDA_UM', 'DEUDA_ORIGINAL']);
        const debtCLPVal = getValue(['DEUDA_M$', 'DEUDA_CLP']);

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

        const role = String(roleVal || '').trim();
        const communeCode = String(communeVal || '').trim();
        const regionCode = String(regionVal || '').trim();
        const unitCode = String(unitVal || '').trim();
        
        const tenantName = String(tenantNameVal || '').trim();
        const rawTenantRut = String(tenantRutVal || '').trim();
        const rawTenantDv = String(tenantDvVal || '').trim();
        
        // Combine RUT and DV if separate, or handle if already combined
        let tenantRut = rawTenantRut;
        if (rawTenantRut && rawTenantDv && !rawTenantRut.includes('-')) {
          tenantRut = `${rawTenantRut}-${rawTenantDv}`;
        } else if (rawTenantRut && !rawTenantRut.includes('-') && !rawTenantDv) {
          // If no DV provided and no hyphen, it might be just the body
          // We keep it as is, but validation will catch it if it's invalid
        }
        
        const economicActivityCode = String(economicActivityVal || '').trim();
        const relatedParty = (String(relatedPartyVal || 'NA').toUpperCase() as 'RE' | 'NR' | 'NA');
        const contractExpirationDate = String(expirationVal || '').replace(/[^0-9]/g, '');
        
        const m2Available = parseNum(m2AvailableVal);
        const m2Rented = parseNum(m2RentedVal);
        const m2Vacant = parseNum(m2VacantVal);
        
        const billedMonth = parseNum(billedVal);
        const collectedCurrent = parseNum(collectedCurrentVal);
        const collectedPrevious = parseNum(collectedPreviousVal);
        const collectedTotal = collectedCurrent + collectedPrevious;
        const pendingNoMorosity = parseNum(pendingNoMorosityVal);
        
        const morosityBuckets = {
          m30: parseNum(m30Val),
          m60: parseNum(m60Val),
          m90: parseNum(m90Val),
          m180: parseNum(m180Val),
          m365: parseNum(m365Val),
          m2y: parseNum(m2yVal),
          m3y: parseNum(m3yVal),
          m4y: parseNum(m4yVal),
          plus4y: parseNum(plus4yVal),
        };
        
        const morosityTotal = Object.values(morosityBuckets).reduce((a, b) => a + b, 0);
        const badDebtProvision = parseNum(badDebtVal);
        const propertyType = (String(propertyTypeVal || 'OTROS').toUpperCase() as any);
        const overdueInstallments = parseNum(overdueInstallmentsVal);
        const reprogrammingType = (String(reprogrammingTypeVal || 'N/A').toUpperCase() as any);
        const reprogrammingAmount = parseNum(reprogrammingAmountVal);
        
        const contractType = (String(contractTypeVal || 'FI').toUpperCase() as any);
        const rentValueUF = parseNum(rentValueUFVal);
        const expectedRentValueUF = parseNum(expectedRentValueUFVal);
        
        const debtOriginalCurrency = parseNum(debtOriginalVal);
        const debtCLP = parseNum(debtCLPVal);

        const mnemonicCode = mnemonicVal ? String(mnemonicVal).trim() : generateMnemonicCode(regionCode, communeCode, role, unitCode);
        
        const errors: string[] = [];
        const prefix = `[Fila ${excelLineNumber} | Rol ${role || 'N/A'}]`;
        
        // CMF B13 Validations (SEIL)
        if (!role) errors.push(`${prefix} ROL SII en blanco. Requerido para cruce con B4.`);
        if (!communeCode) errors.push(`${prefix} Código de Comuna faltante. Solución: Ingrese el código de 3 dígitos.`);
        else if (communeCode.length !== 3) errors.push(`${prefix} Código de Comuna inválido (${communeCode}). Debe tener 3 dígitos.`);
        
        if (!regionCode) errors.push(`${prefix} Código de Región faltante.`);
        else if (regionCode.length !== 2) errors.push(`${prefix} Código de Región inválido (${regionCode}). Debe tener 2 dígitos.`);

        if (!tenantName && m2Rented > 0) errors.push(`${prefix} Nombre de Arrendatario faltante para unidad ocupada.`);
        
        if (tenantRut && tenantRut !== '0') {
          const [body, dv] = tenantRut.includes('-') ? tenantRut.split('-') : [tenantRut, ''];
          if (!validateRut(body, dv)) {
            errors.push(`${prefix} RUT Arrendatario inválido (RUT: ${tenantRut}). Solución: Verifique el cuerpo y dígito verificador.`);
          }
        }

        if (mnemonicCode.length !== 25) {
          errors.push(`${prefix} Código Nemotécnico inválido (Largo: ${mnemonicCode.length}/25). Formato: Región(2)+Comuna(3)+Rol(11)+Unidad(9).`);
        } else {
          const mRegion = mnemonicCode.slice(0, 2);
          const mCommune = mnemonicCode.slice(2, 5);
          const mRole = mnemonicCode.slice(5, 16);
          
          if (mRegion !== regionCode.padStart(2, '0')) errors.push(`${prefix} Nemotécnico: Región (${mRegion}) no coincide con Código Región (${regionCode}).`);
          if (mCommune !== communeCode.padStart(3, '0')) errors.push(`${prefix} Nemotécnico: Comuna (${mCommune}) no coincide con Código Comuna (${communeCode}).`);
          const cleanRole = role.replace(/[^0-9]/g, '').padStart(11, '0').slice(-11);
          if (mRole !== cleanRole) errors.push(`${prefix} Nemotécnico: Rol (${mRole}) no coincide con Rol SII (${role}).`);
        }
        
        // M2 Consistency (SEIL)
        if (m2Available > 0 && Math.abs(m2Available - (m2Rented + m2Vacant)) > 0.01) {
          errors.push(`${prefix} Error Cuadratura M2: Disponibles (${m2Available}) != Arrendados (${m2Rented}) + Vacantes (${m2Vacant}).`);
        }

        // Financial Consistency (SEIL)
        const totalCollectedExpected = collectedCurrent + collectedPrevious;
        if (Math.abs(collectedTotal - totalCollectedExpected) > 1) {
          errors.push(`${prefix} Error Cuadratura Recaudación: Total (${collectedTotal}) != Mes (${collectedCurrent}) + Anterior (${collectedPrevious}).`);
        }

        if (Math.abs(morosityTotal - Object.values(morosityBuckets).reduce((a, b) => a + b, 0)) > 1) {
          errors.push(`${prefix} Error Cuadratura Morosidad: El total no coincide con la suma de los tramos.`);
        }

        // Reprogramming Consistency
        if (reprogrammingType !== 'N/A' && reprogrammingAmount <= 0) {
          errors.push(`${prefix} Inconsistencia Reprogramación: Se indica tipo ${reprogrammingType} pero el monto es 0.`);
        }

        // Vacancy Logic
        if (tenantName.toUpperCase().includes('SIN ARRENDATARIO') || tenantName.toUpperCase().includes('VACANTE')) {
          if (m2Rented > 0) errors.push(`${prefix} Inconsistencia: M2 Arrendados en unidad vacante.`);
          if (collectedCurrent > 0) errors.push(`${prefix} Inconsistencia: Recaudación actual en unidad vacante.`);
        }

        // Cross-Validation with B4 (SEIL)
        const b4Report = b4Reports.find(b => b.period === selectedPeriod && b.insuranceCompany === selectedCompany);
        if (b4Report) {
          const existsInB4 = b4Report.records.some(b4r => b4r.propertyRole === role);
          if (!existsInB4) {
            errors.push(`${prefix} Error de Cruce: El Rol ${role} no existe en el reporte B4 del mismo periodo.`);
          }
        }

        // Risk Taxonomy Mapping (NCG 454)
        let riskCategory: 'PROCESOS' | 'PERSONAS' | 'SISTEMAS' | 'INTEGRIDAD' = 'INTEGRIDAD';
        if (errors.some(e => e.includes('Cuadratura') || e.includes('Inconsistencia'))) riskCategory = 'PROCESOS';
        else if (errors.some(e => e.includes('RUT') || e.includes('Nombre'))) riskCategory = 'PERSONAS';
        else if (errors.some(e => e.includes('Código') || e.includes('Nemotécnico'))) riskCategory = 'SISTEMAS';

        const riskScore = errors.length === 0 ? 0 : (errors.length === 1 ? 40 : (errors.length === 2 ? 70 : 100));

        return {
          id: crypto.randomUUID(),
          lineNumber: excelLineNumber,
          propertyRole: role,
          communeCode,
          tenantName,
          tenantRut,
          economicActivityCode,
          relatedParty,
          contractExpirationDate,
          mnemonicCode,
          invoiceNumber: String(invoiceNumberVal || '').trim(),
          issueDate: String(issueDateVal || '').trim(),
          billedMonth,
          collectedCurrent,
          collectedPrevious,
          collectedTotal,
          pendingNoMorosity,
          morosityBuckets,
          morosityTotal,
          badDebtProvision,
          propertyType,
          overdueInstallments,
          reprogrammingType,
          reprogrammingAmount,
          m2Available,
          m2Rented,
          m2Vacant,
          contractType,
          rentValueUF,
          expectedRentValueUF,
          debtOriginalCurrency,
          debtCLP,
          validationErrors: errors,
          riskScore,
          riskCategory: errors.length > 0 ? riskCategory : undefined
        };
      }).filter(r => r.propertyRole !== '' && r.propertyRole !== 'undefined');

      if (records.length === 0) {
        alert("No se encontraron registros válidos.");
        return;
      }

      setCurrentPreview(records);
      
      // Always generate comparison results, even if no previous month
      const prevMonth = getPreviousMonth(selectedPeriod);
      const prevReport = filteredReports.find(r => r.period === prevMonth);
      const results = compareReports(records, prevReport ? prevReport.records : []);
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

  const handleUpdateRecord = (id: string, field: string, value: any) => {
    const updatedPreview = currentPreview.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    });
    setCurrentPreview(updatedPreview);
    
    const prevMonth = getPreviousMonth(selectedPeriod);
    const prevReport = filteredReports.find(r => r.period === prevMonth);
    const results = compareReports(updatedPreview, prevReport ? prevReport.records : []);
    setComparisonResults(results);
  };

  const trendsData = useMemo(() => {
    if (filteredReports.length === 0) return [];
    
    // Get all unique property roles
    const allRoles = new Set<string>();
    filteredReports.forEach(r => r.records.forEach(rec => {
      if (rec.propertyRole) allRoles.add(rec.propertyRole);
    }));
    
    const periods = [...new Set(filteredReports.map(r => r.period))].sort();
    
    return Array.from(allRoles).map(role => {
      // Find representative data for this role
      let representativeName = '';
      let representativeTenant = '';
      let representativeMnemonic = '';
      
      for (const r of filteredReports) {
        const rec = r.records.find(rc => rc.propertyRole === role);
        if (rec) {
          representativeName = rec.tenantName || representativeName;
          representativeTenant = rec.tenantName || representativeTenant;
          representativeMnemonic = rec.mnemonicCode || representativeMnemonic;
          if (representativeName && representativeTenant) break;
        }
      }

      const data: Record<string, any> = { 
        propertyRole: role, 
        accountName: representativeName,
        tenantName: representativeTenant,
        mnemonicCode: representativeMnemonic
      };

      periods.forEach((p: string) => {
        const report = filteredReports.find(r => r.period === p);
        const records = report?.records.filter(rec => rec.propertyRole === role) || [];
        // Sum billedMonth for the same role in that period
        const totalAmount = records.reduce((sum, r) => sum + r.billedMonth, 0);
        data[p] = totalAmount;
      });
      return data;
    });
  }, [filteredReports]);

  const allAnalysisResults = useMemo(() => {
    const results: any[] = [];
    const sortedReportsByPeriod = [...filteredReports].sort((a, b) => a.period.localeCompare(b.period));
    
    sortedReportsByPeriod.forEach((report, index) => {
      const prevReport = index > 0 ? sortedReportsByPeriod[index - 1] : null;
      const comparisons = compareReports(report.records, prevReport ? prevReport.records : []);
      
      report.records.forEach(record => {
        const comp = comparisons.find(c => c.propertyRole === record.propertyRole);
        results.push({
          ...record,
          period: report.period,
          comparison: comp,
          reportId: report.id
        });
      });
    });
    
    return results.sort((a, b) => b.period.localeCompare(a.period) || a.propertyRole.localeCompare(b.propertyRole));
  }, [filteredReports]);

  const handleUpdateTaskStatus = (id: string, status: B13Task['status']) => {
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, status } : t);
    setTasks(updatedTasks);
    localStorage.setItem('b13_tasks', JSON.stringify(updatedTasks));
  };

  const handleAddTask = (title: string, description: string, priority: B13Task['priority'], recordId?: string) => {
    const newTask: B13Task = {
      id: crypto.randomUUID(),
      title,
      description,
      status: 'PENDING',
      priority,
      createdAt: new Date().toISOString(),
      recordId
    };
    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    localStorage.setItem('b13_tasks', JSON.stringify(updatedTasks));
  };

  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'letter'
    });
    const title = `Reporte B13 - ${selectedCompany} - ${selectedPeriod}`;
    
    // Determine data to export
    let dataToExport = allAnalysisResults;
    if ((activeTab === 'ANALYSIS' || activeTab === 'UPLOAD') && currentPreview.length > 0) {
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
      (r.tenantName && r.tenantName.toUpperCase().includes(searchTerm.toUpperCase())) ||
      (r.tenantRut && r.tenantRut.includes(searchTerm))
    );

    // Enhanced Logo Handling
    if (companyLogo) {
      try {
        const format = companyLogo.toLowerCase().includes('png') ? 'PNG' : 
                       companyLogo.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
        doc.addImage(companyLogo, format, 14, 10, 30, 15, undefined, 'FAST');
      } catch (e) {
        console.warn("Could not add logo to B13 PDF:", e);
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
      return [
        record.period,
        record.propertyRole,
        record.tenantName || 'N/A',
        record.invoiceNumber || 'N/A',
        record.issueDate || 'N/A',
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(record.billedMonth),
        record.validationErrors && record.validationErrors.length > 0 ? 'ERROR' : (record.comparison?.isAnomaly ? 'ALERTA' : 'OK')
      ];
    });

    (doc as any).autoTable({
      startY: 55,
      head: [['Periodo', 'Rol', 'Arrendatario', 'N° Factura', 'Fecha Emisión', 'Fact. Act.', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: 'F', fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 6 },
      styles: { fontSize: 5, cellPadding: 1 },
      columnStyles: {
        5: { halign: 'right' },
        6: { halign: 'center' }
      },
      didParseCell: function(data: any) {
        if (data.section === 'body' && data.column.index === 8) {
          const val = data.cell.raw;
          if (typeof val === 'string' && (val.includes('+') || val.includes('-')) && !val.includes('$ 0')) {
            data.cell.styles.textColor = [220, 38, 38]; // Red for differences
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.section === 'body' && data.column.index === 9) {
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
    
    // Center signature block
    doc.setDrawColor(200, 200, 200);
    doc.line(60, signatureY, 150, signatureY);
    doc.setFontSize(9);
    doc.setTextColor(50, 60, 70);
    doc.setFont("helvetica", "bold");
    doc.text("DEPARTAMENTO INMOBILIARIO", 105, signatureY + 5, { align: "center" });

    // Add Page Numbering & Folio
    const pageCount = (doc as any).internal.getNumberOfPages();
    const b13Folio = `FL-B13-${selectedCompany}-${selectedPeriod}`.toUpperCase();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, 200, 270, { align: 'right' });
      
      doc.setDrawColor(240);
      doc.line(14, 265, 200, 265);
      doc.text(`Corporación Inmobiliaria - Reporte B13 CMF | Folio: ${b13Folio}`, 14, 270);
    }

    doc.save(`Reporte_B13_${selectedCompany}_${selectedPeriod}.pdf`);
  };

  const handleExportExcel = () => {
    // Determine data to export
    let dataToExport = allAnalysisResults;
    if ((activeTab === 'ANALYSIS' || activeTab === 'UPLOAD') && currentPreview.length > 0) {
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
      (r.tenantName && r.tenantName.toUpperCase().includes(searchTerm.toUpperCase())) ||
      (r.tenantRut && r.tenantRut.includes(searchTerm))
    );

    if (filteredData.length === 0) {
      alert('No hay registros para exportar.');
      return;
    }

    const dataRows = filteredData.map(record => ({
      'Periodo': record.period || selectedPeriod,
      'Compañía': selectedCompany,
      'ROL Propiedad': record.propertyRole,
      'Rut Arrendatario': record.tenantRut || 'N/A',
      'Arrendatario': record.tenantName || 'N/A',
      'Nº Factura': record.invoiceNumber || 'N/A',
      'Fecha Emisión': record.issueDate || 'N/A',
      'Facturado Actual (CLP)': record.billedMonth,
      'Facturado Anterior (CLP)': record.comparison?.previousBilledMonth || 0,
      'Variación (CLP)': record.comparison?.billedDifference || 0,
      'Desviación %': record.comparison?.billedDifferencePercent || 0,
      'Estado ERP': record.validationErrors && record.validationErrors.length > 0 ? 'ERROR' : (record.comparison?.isAnomaly ? 'ALERTA' : 'OK')
    }));

    exportToExcel(dataRows, `Reporte_B13_${selectedCompany}_${selectedPeriod}`, 'Análisis B13');
  };

  const getPreviousMonth = (period: string) => {
    const [year, month] = period.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    return date.toISOString().slice(0, 7);
  };

  const compareReports = (current: B13Record[], previous: B13Record[]): B13ComparisonResult[] => {
    const results: B13ComparisonResult[] = [];
    const prevMap = new Map(previous.map(r => [r.propertyRole, r]));

    current.forEach(curr => {
      const prev = prevMap.get(curr.propertyRole);
      const prevAmount = prev ? prev.billedMonth : 0;
      const diff = curr.billedMonth - prevAmount;
      const pctChange = prevAmount !== 0 ? (diff / Math.abs(prevAmount)) * 100 : (curr.billedMonth !== 0 ? 100 : 0);

      let isAnomaly = false;
      let reason = '';

      if (Math.abs(pctChange) > 50 && Math.abs(diff) > 1000000) {
        isAnomaly = true;
        reason = `Variación significativa (>50% y >$1M)`;
      } else if (!prev && curr.billedMonth !== 0) {
        isAnomaly = true;
        reason = `Propiedad nueva con facturación`;
      } else if (prev && prev.m2Available !== curr.m2Available) {
        isAnomaly = true;
        reason = `Variación en Metros Cuadrados (Diferencia: ${((curr.m2Available || 0) - (prev.m2Available || 0)).toFixed(2)} m²)`;
      }

      results.push({
        accountCode: curr.mnemonicCode,
        accountName: curr.tenantName,
        currentAmount: curr.billedMonth,
        previousAmount: prevAmount,
        difference: diff,
        percentageChange: pctChange,
        currentSquareMeters: curr.m2Available,
        previousSquareMeters: prev ? prev.m2Available : undefined,
        propertyRole: curr.propertyRole,
        isAnomaly,
        anomalyReason: reason
      });
    });

    return results;
  };

  const handleSaveReport = () => {
    if (currentPreview.length === 0) return;
    
    // Check if report for this period already exists
    if (filteredReports.some(r => r.period === selectedPeriod)) {
      if (!confirm(`Ya existe un reporte de ${selectedCompany} para el periodo ${selectedPeriod}. ¿Desea sobrescribirlo?`)) {
        return;
      }
      // Delete existing
      const existing = filteredReports.find(r => r.period === selectedPeriod);
      if (existing) onDelete(existing.id);
    }

    const newReport: B13Report = {
      id: crypto.randomUUID(),
      period: selectedPeriod,
      insuranceCompany: selectedCompany,
      uploadDate: new Date().toISOString().split('T')[0],
      records: currentPreview,
      userCreator: currentUser,
      timestamp: Date.now()
    };

    onSave(newReport);
    alert("Reporte guardado exitosamente.");
    setActiveTab('HISTORY');
    setCurrentPreview([]);
    setComparisonResults([]);
  };

  const filteredAnalysis = comparisonResults.filter(r => 
    r.accountCode.includes(searchTerm) || 
    r.accountName.toUpperCase().includes(searchTerm.toUpperCase())
  );

  const anomalies = comparisonResults.filter(r => r.isAnomaly);
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Módulo Reporte B13 CMF</h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análisis de Consistencia Mensual</p>
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
            onClick={() => setActiveTab('CONSOLIDATED_B13')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'CONSOLIDATED_B13' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Layers size={14} /> Consolidado Cartera & Mora (B13)
          </button>
          <button 
            onClick={() => setActiveTab('UPLOAD')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'UPLOAD' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <FileUp size={14} /> Cargar Nuevo
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <History size={14} /> Historial
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
          <button 
            onClick={() => setActiveTab('TASKS')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'TASKS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <ClipboardList size={14} /> Tareas
            {tasks.filter(t => t.status === 'PENDING').length > 0 && (
              <span className="bg-rose-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">
                {tasks.filter(t => t.status === 'PENDING').length}
              </span>
            )}
          </button>
          {onSync && (
            <button 
              onClick={onSync}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm hover:bg-emerald-100"
              title="Sincronizar todo a la nube"
            >
              <RefreshCw size={14} className="animate-spin-slow" /> Guardar Permanente
            </button>
          )}
          <button 
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm hover:bg-emerald-100"
            title="Exportar grilla de análisis actual a Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} /> Exportar Excel (.xlsx)
          </button>
          <button 
            onClick={exportToPDF}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
          >
            <FileText size={14} /> Exportar PDF
          </button>
          {comparisonResults.length > 0 && (
            <button 
              onClick={() => setActiveTab('ANALYSIS')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'ANALYSIS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <TrendingUp size={14} /> Análisis Actual
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'CONSOLIDATED_B13' && (
          <div className="space-y-6">
            {/* ENCABEZADO Y REGLAS NORMATIVAS B13 CMF */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1.5">
                      <ShieldCheck size={12} /> NORMAS CMF B13 • CONTROL PREVENTIVO DE CARTERA
                    </span>
                    <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                      UNIDADES EN M$ (SIN DECIMALES)
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                    Consolidado de Cartera y Morosidad B13
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    Consolidación oficial de la totalidad de las propiedades ordenada estrictamente por <strong className="text-white">Rol, Tipo, Comuna y Dirección</strong>. Los montos de arriendos morosos se agrupan en los 3 tramos fiscalizables (≤30 días, 31–90 días, 91–179 días), expresados en <strong className="text-emerald-300">Miles de Pesos (M$) divididos por 1.000 sin decimales</strong> para evitar errores de punto flotante. Los montos superiores a 180 días se consideran como incobrables.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={handleExportConsolidationExcel}
                    disabled={isExportingB13Excel || consolidation.rows.length === 0}
                    className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 flex items-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Exportar archivo XLSX con formato de tabla tabulada oficial para fiscalización"
                  >
                    {isExportingB13Excel ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Generando XLSX...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={16} /> Exportar Tabla XLSX (.xlsx)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* KPI METRIC CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Propiedades</span>
                <p className="text-xl font-black text-slate-900 mt-1">{consolidation.summary.totalProperties}</p>
                <span className="text-[10px] text-slate-500 font-medium">{consolidation.summary.totalM2Sum.toLocaleString('es-CL')} m² totales</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">Sup. Arrendada</span>
                <p className="text-xl font-black text-indigo-700 mt-1">{consolidation.summary.totalRentedM2Sum.toLocaleString('es-CL')} m²</p>
                <span className="text-[10px] text-indigo-600 font-medium">
                  {((consolidation.summary.totalRentedM2Sum / (consolidation.summary.totalM2Sum || 1)) * 100).toFixed(1)}% ocupación
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Valor Promedio M2</span>
                <p className="text-xl font-black text-slate-800 mt-1">$ {consolidation.summary.averageRentPerM2.toLocaleString('es-CL')}</p>
                <span className="text-[10px] text-slate-400 font-medium">por m² (truncado)</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Mora ≤ 30 Días</span>
                <p className="text-xl font-black text-slate-800 mt-1">$ {consolidation.summary.totalMora30OrLessM.toLocaleString('es-CL')} M$</p>
                <span className="text-[10px] text-slate-400 font-medium">Tramo 1 (30d o menos)</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block">Mora 31–90 Días</span>
                <p className="text-xl font-black text-amber-700 mt-1">$ {consolidation.summary.totalMora31To90M.toLocaleString('es-CL')} M$</p>
                <span className="text-[10px] text-amber-600 font-medium">Tramo 2 (&gt;30d y ≤90d)</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block">Mora 91–179 Días</span>
                <p className="text-xl font-black text-orange-700 mt-1">$ {consolidation.summary.totalMora91To179M.toLocaleString('es-CL')} M$</p>
                <span className="text-[10px] text-orange-600 font-medium">Tramo 3 (&gt;90d y &lt;180d)</span>
              </div>
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xs text-white">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">Gran Total Mora</span>
                <p className="text-xl font-black text-emerald-300 mt-1">$ {consolidation.summary.grandTotalMorosityM.toLocaleString('es-CL')} M$</p>
                <span className="text-[10px] text-slate-400 font-medium">Suma en M$ (Enteros)</span>
              </div>
            </div>

            {/* BARRA DE HERRAMIENTAS Y FILTROS */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar por Rol, Tipo, Comuna, Dirección o Arrendatario..."
                  value={portfolioSearchTerm}
                  onChange={(e) => setPortfolioSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none font-medium"
                />
                {portfolioSearchTerm && (
                  <button onClick={() => setPortfolioSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filtro:</span>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setPortfolioFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                      portfolioFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Toda la Cartera ({consolidation.rows.length})
                  </button>
                  <button
                    onClick={() => setPortfolioFilter('MOROSOS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                      portfolioFilter === 'MOROSOS' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Solo Morosos ({consolidation.summary.propertiesWithMorosity})
                  </button>
                  <button
                    onClick={() => setPortfolioFilter('AL_DIA')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                      portfolioFilter === 'AL_DIA' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Solo al Día ({consolidation.summary.propertiesUpToDate})
                  </button>
                </div>
              </div>
            </div>

            {/* TABLA TABULADA OFICIAL FORMATO EXCEL B13 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Planilla Tabulada de Fiscalización B13 ({filteredConsolidationRows.length} Registros)
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Consolidación por Rol → Tipo → Comuna → Dirección. Superficies M2 Totales y Arrendados con Valor $/m² truncado sin decimales.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md font-bold">
                  NCG CMF B13 • SUPERFICIES &amp; MOROSIDAD
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                      <th className="px-3 py-3 border border-slate-800 text-center">ROL</th>
                      <th className="px-3 py-3 border border-slate-800 text-center">Tipo de Propiedad</th>
                      <th className="px-3 py-3 border border-slate-800">Comuna</th>
                      <th className="px-4 py-3 border border-slate-800">Dirección</th>
                      <th className="px-3 py-3 border border-slate-800 text-right bg-slate-800">M2 Totales</th>
                      <th className="px-3 py-3 border border-slate-800 text-right bg-slate-800">M2 Arrendados</th>
                      <th className="px-3 py-3 border border-slate-800 text-right bg-slate-800">Valor M2 ($/m²)</th>
                      <th className="px-3 py-3 border border-slate-800 text-center">RUT Arrendatario</th>
                      <th className="px-4 py-3 border border-slate-800">Nombre Arrendatario</th>
                      <th className="px-3 py-3 border border-slate-800 text-right">Mora ≤ 30 Días (M$)</th>
                      <th className="px-3 py-3 border border-slate-800 text-right">Mora 31–90 Días (M$)</th>
                      <th className="px-3 py-3 border border-slate-800 text-right">Mora 91–179 Días (M$)</th>
                      <th className="px-4 py-3 border border-slate-800 text-right">Total Morosidad (M$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                    {filteredConsolidationRows.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="text-center py-12 text-slate-400 font-medium italic">
                          No se encontraron propiedades que coincidan con el criterio seleccionado.
                        </td>
                      </tr>
                    ) : (
                      filteredConsolidationRows.map((row, idx) => (
                        <tr 
                          key={row.propertyId || idx}
                          onClick={() => setSelectedDetailRow(row)}
                          className={`hover:bg-slate-100 transition-colors cursor-pointer ${
                            row.hasMorosity ? 'bg-rose-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                          }`}
                        >
                          <td className="px-3 py-2.5 border-r border-slate-200 text-center font-mono font-bold text-slate-900">
                            {row.role}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 text-center font-bold text-slate-700 text-[11px]">
                            {row.type}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 font-medium text-slate-800">
                            {row.commune}
                          </td>
                          <td className="px-4 py-2.5 border-r border-slate-200 font-medium text-slate-800">
                            {row.address}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                            {row.totalM2.toLocaleString('es-CL')} m²
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 text-right font-mono text-slate-700">
                            {row.rentedM2 > 0 ? `${row.rentedM2.toLocaleString('es-CL')} m²` : '0 m²'}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 text-right font-mono font-bold text-indigo-700 bg-indigo-50/30">
                            {row.rentPerM2CLP > 0 ? `$ ${row.rentPerM2CLP.toLocaleString('es-CL')}` : '$ 0'}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 text-center font-mono text-[11px] font-bold text-slate-800">
                            {row.tenantRut}
                          </td>
                          <td className="px-4 py-2.5 border-r border-slate-200 font-bold text-slate-900">
                            {row.tenantName}
                          </td>
                          <td className={`px-3 py-2.5 border-r border-slate-200 text-right font-mono font-bold ${
                            row.mora30OrLessM > 0 ? 'text-rose-700 bg-rose-100/50' : 'text-slate-400'
                          }`}>
                            $ {row.mora30OrLessM.toLocaleString('es-CL')} M$
                          </td>
                          <td className={`px-3 py-2.5 border-r border-slate-200 text-right font-mono font-bold ${
                            row.mora31To90M > 0 ? 'text-amber-800 bg-amber-100/50' : 'text-slate-400'
                          }`}>
                            $ {row.mora31To90M.toLocaleString('es-CL')} M$
                          </td>
                          <td className={`px-3 py-2.5 border-r border-slate-200 text-right font-mono font-bold ${
                            row.mora91To179M > 0 ? 'text-orange-800 bg-orange-100/50' : 'text-slate-400'
                          }`}>
                            $ {row.mora91To179M.toLocaleString('es-CL')} M$
                          </td>
                          <td className={`px-4 py-2.5 text-right font-mono font-black ${
                            row.totalMorosityM > 0 ? 'text-rose-800 bg-rose-200/50' : 'text-slate-400'
                          }`}>
                            $ {row.totalMorosityM.toLocaleString('es-CL')} M$
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-black text-xs text-slate-900">
                    <tr>
                      <td colSpan={4} className="px-4 py-3.5 uppercase tracking-wider text-right font-black">
                        TOTALES CARTERA:
                      </td>
                      <td className="px-3 py-3.5 border-r border-slate-300 text-right font-mono text-slate-900 font-bold bg-slate-200/60">
                        {consolidation.summary.totalM2Sum.toLocaleString('es-CL')} m²
                      </td>
                      <td className="px-3 py-3.5 border-r border-slate-300 text-right font-mono text-slate-900 font-bold bg-slate-200/60">
                        {consolidation.summary.totalRentedM2Sum.toLocaleString('es-CL')} m²
                      </td>
                      <td className="px-3 py-3.5 border-r border-slate-300 text-right font-mono text-indigo-900 font-bold bg-indigo-100/50">
                        $ {consolidation.summary.averageRentPerM2.toLocaleString('es-CL')}
                      </td>
                      <td colSpan={2} className="px-3 py-3.5 border-r border-slate-300 text-center text-slate-400 font-normal">
                        —
                      </td>
                      <td className="px-3 py-3.5 border-r border-slate-300 text-right font-mono text-slate-900">
                        $ {consolidation.summary.totalMora30OrLessM.toLocaleString('es-CL')} M$
                      </td>
                      <td className="px-3 py-3.5 border-r border-slate-300 text-right font-mono text-slate-900">
                        $ {consolidation.summary.totalMora31To90M.toLocaleString('es-CL')} M$
                      </td>
                      <td className="px-3 py-3.5 border-r border-slate-300 text-right font-mono text-slate-900">
                        $ {consolidation.summary.totalMora91To179M.toLocaleString('es-CL')} M$
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-rose-800 text-sm font-black bg-rose-100/60">
                        $ {consolidation.summary.grandTotalMorosityM.toLocaleString('es-CL')} M$
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* MODAL AUDITORÍA DE INMUEBLE SELECCIONADO */}
            {selectedDetailRow && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Ficha de Inmueble B13</span>
                      <h4 className="text-lg font-black text-slate-900">{selectedDetailRow.address}</h4>
                    </div>
                    <button 
                      onClick={() => setSelectedDetailRow(null)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Rol de Propiedad</span>
                      <span className="font-mono font-bold text-slate-900">{selectedDetailRow.role}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Tipo y Comuna</span>
                      <span className="font-bold text-slate-900">{selectedDetailRow.type} • {selectedDetailRow.commune}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Superficie Total</span>
                      <span className="font-mono font-bold text-slate-900">{selectedDetailRow.totalM2.toLocaleString('es-CL')} m²</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Superficie Arrendada</span>
                      <span className="font-mono font-bold text-slate-900">{selectedDetailRow.rentedM2.toLocaleString('es-CL')} m²</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Canon Mensual</span>
                      <span className="font-mono font-bold text-slate-900">$ {selectedDetailRow.monthlyAmountCLP.toLocaleString('es-CL')} CLP</span>
                    </div>
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <span className="text-[9px] font-black text-indigo-700 uppercase block">Valor Unitario / m²</span>
                      <span className="font-mono font-black text-indigo-900 text-sm">
                        $ {selectedDetailRow.rentPerM2CLP.toLocaleString('es-CL')} CLP / m²
                      </span>
                      <span className="text-[9px] text-indigo-600 block">(Truncado sin decimales)</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Arrendatario</span>
                      <span className="font-bold text-slate-900">{selectedDetailRow.tenantName}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">RUT Arrendatario</span>
                      <span className="font-mono font-bold text-slate-900">{selectedDetailRow.tenantRut}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider block">Desglose de Morosidad Evaluada</span>
                    <div className="flex justify-between text-xs py-1 border-b border-slate-200">
                      <span className="text-slate-600">Mora ≤ 30 días:</span>
                      <span className="font-mono font-bold text-slate-900">$ {selectedDetailRow.mora30OrLessM.toLocaleString('es-CL')} M$ ({selectedDetailRow.mora30OrLessExact.toLocaleString('es-CL')} CLP)</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-slate-200">
                      <span className="text-slate-600">Mora 31 a 90 días:</span>
                      <span className="font-mono font-bold text-slate-900">$ {selectedDetailRow.mora31To90M.toLocaleString('es-CL')} M$ ({selectedDetailRow.mora31To90Exact.toLocaleString('es-CL')} CLP)</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-slate-200">
                      <span className="text-slate-600">Mora 91 a 179 días:</span>
                      <span className="font-mono font-bold text-slate-900">$ {selectedDetailRow.mora91To179M.toLocaleString('es-CL')} M$ ({selectedDetailRow.mora91To179Exact.toLocaleString('es-CL')} CLP)</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5 font-black text-rose-800">
                      <span>Total Morosidad Declarable:</span>
                      <span className="font-mono text-sm">$ {selectedDetailRow.totalMorosityM.toLocaleString('es-CL')} M$</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setSelectedDetailRow(null)}
                      className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'UPLOAD' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white rounded-[32px] p-10 shadow-sm border border-slate-100">
              <h2 className="text-lg font-black text-slate-800 uppercase mb-6">Configuración de Carga</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Periodo del Reporte</label>
                  <input 
                    type="month" 
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-900 outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-64 border-4 border-dashed border-slate-300 rounded-[40px] flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-all group"
                >
                  {isUploading ? (
                    <Loader2 size={48} className="text-indigo-600 animate-spin" />
                  ) : (
                    <>
                      <FileSpreadsheet size={48} className="text-slate-400 group-hover:text-indigo-600 mb-4 transition-colors" />
                      <p className="text-sm font-black text-slate-700 group-hover:text-indigo-700 uppercase">Seleccionar Archivo Excel B13</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Formatos aceptados: .xlsx, .xls</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept=".xlsx, .xls" 
                  />
                </div>

                <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 flex gap-4">
                  <Info className="text-amber-700 shrink-0" size={20} />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-900 uppercase">Instrucciones</p>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      Asegúrese de que el archivo contenga las columnas de <strong>Código de Cuenta</strong> y <strong>Monto</strong>. 
                      El sistema comparará automáticamente con el periodo anterior ({getPreviousMonth(selectedPeriod)}) si existe en la base de datos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedReports.length === 0 ? (
                <div className="col-span-full py-20 text-center">
                  <History size={48} className="text-slate-400 mx-auto mb-4" />
                  <p className="text-sm font-black text-slate-700 uppercase tracking-[0.2em]">No hay reportes cargados aún</p>
                </div>
              ) : sortedReports.map(report => (
                <div key={report.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                      {report.period}
                    </div>
                    <button 
                      onClick={() => onDelete(report.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase mb-1">Reporte B13 CMF</h3>
                  <p className="text-[10px] font-bold text-slate-600 uppercase mb-4">Cargado el {report.uploadDate}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-600 uppercase">Registros</span>
                      <span className="text-xs font-black text-slate-800">{report.records.length}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setCurrentPreview(report.records);
                        setSelectedPeriod(report.period);
                        const prevMonth = getPreviousMonth(report.period);
                        const prevReport = filteredReports.find(r => r.period === prevMonth);
                        if (prevReport) {
                          setComparisonResults(compareReports(report.records, prevReport.records));
                        } else {
                          setComparisonResults([]);
                        }
                        setActiveTab('ANALYSIS');
                      }}
                      className="text-[10px] font-black text-indigo-600 uppercase hover:underline"
                    >
                      Ver Análisis
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ANALYSIS' && (
          <div className="space-y-8">
            {/* AUXILIAR VALIDATION WARNING */}
            {(() => {
              const hasAuxiliar = reconciliations.some(r => 
                r.period === selectedPeriod && 
                (r.fileName.toUpperCase().includes('ARRIENDO') || r.sheets.some(s => s.sheetName.toUpperCase().includes('ARRIENDO')))
              );
              if (!hasAuxiliar) {
                return (
                  <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[24px] flex items-center gap-4 animate-pulse">
                    <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-amber-900 uppercase">Advertencia: Auxiliar de Arriendos no detectado</p>
                      <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">
                        No se ha encontrado la información del Libro Auxiliar de Arriendos para el periodo {selectedPeriod}. 
                        Se recomienda cargar la conciliación correspondiente para asegurar la integridad de los datos.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Cuentas</p>
                <p className="text-2xl font-black text-slate-900">{comparisonResults.length}</p>
              </div>
              <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Inconsistencias</p>
                <p className={`text-2xl font-black ${anomalies.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {anomalies.length}
                </p>
              </div>
              <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Errores de Línea</p>
                <p className={`text-2xl font-black ${lineErrors.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {lineErrors.length}
                </p>
              </div>
              <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex items-end">
                <button 
                  onClick={handleSaveReport}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={14} /> Guardar Reporte
                </button>
              </div>
            </div>

            {/* CMF NCG 454 RISK TAXONOMY SUMMARY */}
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase">Perfil de Riesgo Operacional (NCG 454)</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Taxonomía de fallos detectados en el reporte</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">1ra Línea de Defensa: Activa</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Procesos</p>
                    <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-black">
                      {currentPreview.filter(r => r.riskCategory === 'PROCESOS').length}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-1000" 
                      style={{ width: `${(currentPreview.filter(r => r.riskCategory === 'PROCESOS').length / currentPreview.length) * 100}%` }} 
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-3 leading-relaxed">Errores de cuadratura, inconsistencias en M2 o recaudación.</p>
                </div>

                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Personas</p>
                    <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded text-[10px] font-black">
                      {currentPreview.filter(r => r.riskCategory === 'PERSONAS').length}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 transition-all duration-1000" 
                      style={{ width: `${(currentPreview.filter(r => r.riskCategory === 'PERSONAS').length / currentPreview.length) * 100}%` }} 
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-3 leading-relaxed">RUTs inválidos o faltantes, errores en identificación de terceros.</p>
                </div>

                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sistemas</p>
                    <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[10px] font-black">
                      {currentPreview.filter(r => r.riskCategory === 'SISTEMAS').length}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 transition-all duration-1000" 
                      style={{ width: `${(currentPreview.filter(r => r.riskCategory === 'SISTEMAS').length / currentPreview.length) * 100}%` }} 
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-3 leading-relaxed">Formatos de Rol incorrectos o códigos de cuenta inexistentes.</p>
                </div>
              </div>
            </div>

            {/* ANALYSIS TABLE SECTION */}
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase">Resultados del Análisis Técnico</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Haga clic en una fila para ver el detalle completo</p>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl border border-indigo-100">
                  <span className="text-[10px] font-black uppercase tracking-widest">Periodo: {selectedPeriod}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nemotécnico</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Rol</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Arrendatario</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">N° Factura</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Fecha Emisión</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Facturación</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {currentPreview.map((record) => {
                      const hasErrors = record.validationErrors && record.validationErrors.length > 0;
                      const comp = comparisonResults.find(c => c.propertyRole === record.propertyRole);
                      const isAnomaly = comp?.isAnomaly;
                      
                      return (
                        <tr 
                          key={record.id} 
                          onClick={() => setExpandedErrorId(record.id)}
                          className={`hover:bg-slate-50 cursor-pointer transition-colors ${hasErrors || isAnomaly ? 'bg-rose-50/30' : ''}`}
                        >
                          <td className="px-6 py-4 text-[10px] font-mono font-black text-slate-500">{record.mnemonicCode}</td>
                          <td className="px-6 py-4 text-[10px] font-mono font-black text-slate-700">{record.propertyRole}</td>
                          <td className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase">{record.tenantName}</td>
                          <td className="px-6 py-4 text-[10px] font-mono font-black text-slate-500">{record.invoiceNumber || 'N/A'}</td>
                          <td className="px-6 py-4 text-center text-[10px] font-mono font-black text-slate-500">{record.issueDate || 'N/A'}</td>
                          <td className="px-6 py-4 text-right text-[10px] font-mono font-black text-slate-900">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(record.billedMonth)}
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const hasErrors = record.validationErrors && record.validationErrors.length > 0;
                              return (
                                <div className="space-y-2">
                                  <div className="flex justify-center">
                                    {hasErrors ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-600 rounded-lg text-[8px] font-black uppercase">
                                        <AlertTriangle size={10} /> Error
                                      </span>
                                    ) : isAnomaly ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-600 rounded-lg text-[8px] font-black uppercase">
                                        <AlertTriangle size={10} /> Alerta
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[8px] font-black uppercase">
                                        <CheckCircle2 size={10} /> OK
                                      </span>
                                    )}
                                  </div>
                                  
                                  {(hasErrors || isAnomaly) && (
                                    <div className="text-[8px] text-left space-y-1 max-w-[200px] mx-auto">
                                      <p className="font-black text-slate-400 uppercase">
                                        Registro: {record.lineNumber} | Rol: {record.propertyRole}
                                      </p>
                                      {hasErrors && record.validationErrors?.map((err, i) => {
                                        const [msg, solution] = err.split('. Solución: ');
                                        return (
                                          <div key={i} className="bg-rose-50/50 p-1.5 rounded border border-rose-100/50">
                                            <p className="font-black text-rose-700 uppercase leading-tight">{msg}</p>
                                            {solution && (
                                              <p className="font-bold text-slate-500 mt-0.5 italic">💡 {solution}</p>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {isAnomaly && !hasErrors && (
                                        <div className="bg-amber-50/50 p-1.5 rounded border border-amber-100/50">
                                          <p className="font-black text-amber-700 uppercase leading-tight">Variación inusual detectada</p>
                                          <p className="font-bold text-slate-500 mt-0.5 italic">💡 Revisar cambios en facturación vs mes anterior.</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DATA TABLE (EDITABLE) */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h2 className="text-sm font-black text-slate-800 uppercase">Detalle de Comparación</h2>
                <div className="relative w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    type="text" 
                    placeholder="BUSCAR CUENTA..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-indigo-300"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1300px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nemotécnico</th>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Rol</th>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Arrendatario</th>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">RUT</th>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">M² Act.</th>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">M² Ant.</th>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Fact. Anterior</th>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Fact. Actual</th>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Variación</th>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredAnalysis.map((row, idx) => {
                      const record = currentPreview.find(r => r.propertyRole === row.propertyRole);
                      const hasErrors = record?.validationErrors && record.validationErrors.length > 0;
                      
                      return (
                      <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${row.isAnomaly || hasErrors ? 'bg-rose-50/30' : ''}`}>
                        <td className="px-8 py-4 text-[10px] font-mono font-black text-slate-500">{record?.mnemonicCode}</td>
                        <td className="px-8 py-4 text-[10px] font-mono font-black text-slate-700">{row.propertyRole}</td>
                        <td className="px-8 py-4">
                          <input 
                            type="text" 
                            value={record?.tenantName || ''}
                            onChange={(e) => handleUpdateRecord(record!.id, 'tenantName', e.target.value)}
                            className="w-full bg-transparent border-none text-[10px] font-black text-slate-700 uppercase outline-none focus:bg-white focus:ring-1 focus:ring-indigo-200 rounded px-1"
                          />
                        </td>
                        <td className="px-8 py-4">
                          <input 
                            type="text" 
                            value={record?.tenantRut || ''}
                            onChange={(e) => handleUpdateRecord(record!.id, 'tenantRut', e.target.value)}
                            className="w-full bg-transparent border-none text-[10px] font-mono font-black text-slate-500 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-200 rounded px-1"
                          />
                        </td>
                        <td className="px-8 py-4">
                          <input 
                            type="number" 
                            value={record?.m2Available || 0}
                            onChange={(e) => handleUpdateRecord(record!.id, 'm2Available', Number(e.target.value))}
                            className="w-20 bg-transparent border-none text-[10px] font-mono font-black text-right outline-none focus:bg-white focus:ring-1 focus:ring-indigo-200 rounded px-1"
                          />
                        </td>
                        <td className="px-8 py-4 text-[10px] font-mono text-slate-400 text-right">
                          {row.previousSquareMeters ? `${row.previousSquareMeters} m²` : '0 m²'}
                        </td>
                        <td className="px-8 py-4 text-[10px] font-mono text-slate-400 text-right">
                          {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(row.previousAmount)}
                        </td>
                        <td className="px-8 py-4 text-right">
                          <input 
                            type="number" 
                            value={row.currentAmount}
                            onChange={(e) => handleUpdateRecord(record!.id, 'billedMonth', Number(e.target.value))}
                            className="w-32 bg-transparent border-none text-[10px] font-mono font-black text-slate-900 text-right outline-none focus:bg-white focus:ring-1 focus:ring-indigo-200 rounded px-1"
                          />
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className={`flex items-center justify-end gap-1 text-[10px] font-black ${row.difference > 0 ? 'text-emerald-600' : row.difference < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {row.difference > 0 ? <TrendingUp size={12} /> : row.difference < 0 ? <TrendingDown size={12} /> : null}
                            {row.percentageChange.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-8 py-4 text-center">
                          {row.isAnomaly ? (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-600 rounded-lg text-[8px] font-black uppercase">
                              <AlertTriangle size={10} /> Alerta
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[8px] font-black uppercase">
                              <CheckCircle2 size={10} /> OK
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'TRENDS' && (
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase">Variación Histórica por Rol</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Seguimiento mensual de saldos por propiedad</p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="text" 
                  placeholder="BUSCAR ROL O ARRENDATARIO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-indigo-300"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky left-0 bg-slate-50 z-10">Propiedad (Rol)</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Arrendatario / Cuenta</th>
                    {periods.map(p => (
                      <th key={p} className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {trendsData
                    .filter(t => 
                      t.propertyRole.includes(searchTerm) || 
                      t.tenantName.toUpperCase().includes(searchTerm.toUpperCase()) ||
                      t.accountName.toUpperCase().includes(searchTerm.toUpperCase())
                    )
                    .map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-50">
                        <p className="text-[10px] font-mono font-black text-indigo-600">{row.propertyRole}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase mt-1">{row.mnemonicCode}</p>
                      </td>
                      <td className="px-8 py-4">
                        <p className="text-[10px] font-black text-slate-700 uppercase truncate max-w-[250px]">{row.tenantName || 'SIN ARRENDATARIO'}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[250px]">{row.accountName}</p>
                      </td>
                      {periods.map((p, pIdx) => {
                        const currentVal = row[p] || 0;
                        const prevPeriod = pIdx > 0 ? periods[pIdx - 1] : null;
                        const prevVal = prevPeriod ? (row[prevPeriod] || 0) : null;
                        const diff = prevVal !== null ? currentVal - prevVal : 0;
                        
                        return (
                          <td key={p} className="px-8 py-4 text-right">
                            <p className="text-[10px] font-mono font-black text-slate-700">
                              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(currentVal)}
                            </p>
                            {prevVal !== null && diff !== 0 && (
                              <p className={`text-[8px] font-black uppercase mt-1 ${diff > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {diff > 0 ? '+' : ''}{new Intl.NumberFormat('es-CL').format(diff)}
                              </p>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'RESULTS' && (
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase">Resultados Globales de Análisis</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Todos los registros históricos ordenados por periodo</p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="text" 
                  placeholder="BUSCAR ROL O ARRENDATARIO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-indigo-300"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Periodo</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nemotécnico</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Rol</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Arrendatario</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">N° Factura</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Fecha Emisión</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Facturación</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allAnalysisResults
                    .filter(r => 
                      r.propertyRole.includes(searchTerm) || 
                      r.tenantName.toUpperCase().includes(searchTerm.toUpperCase())
                    )
                    .map((record) => {
                      const hasErrors = record.validationErrors && record.validationErrors.length > 0;
                      const isAnomaly = record.comparison?.isAnomaly;
                      
                      return (
                        <tr 
                          key={`${record.period}-${record.id}`} 
                          onClick={() => {
                            const report = filteredReports.find(rep => rep.id === record.reportId);
                            if (report) {
                              setCurrentPreview(report.records);
                              setExpandedErrorId(record.id);
                            }
                          }}
                          className={`hover:bg-slate-50 cursor-pointer transition-colors ${hasErrors || isAnomaly ? 'bg-rose-50/30' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[8px] font-black uppercase">{record.period}</span>
                          </td>
                          <td className="px-6 py-4 text-[10px] font-mono font-black text-slate-500">{record.mnemonicCode}</td>
                          <td className="px-6 py-4 text-[10px] font-mono font-black text-slate-700">{record.propertyRole}</td>
                          <td className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase">{record.tenantName}</td>
                          <td className="px-6 py-4 text-[10px] font-mono font-black text-slate-500">{record.invoiceNumber || 'N/A'}</td>
                          <td className="px-6 py-4 text-center text-[10px] font-mono font-black text-slate-500">{record.issueDate || 'N/A'}</td>
                          <td className="px-6 py-4 text-right text-[10px] font-mono font-black text-slate-900">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(record.billedMonth)}
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const hasErrors = record.validationErrors && record.validationErrors.length > 0;
                              const isAnomaly = record.comparison?.isAnomaly;
                              return (
                                <div className="space-y-2">
                                  <div className="flex justify-center">
                                    {hasErrors ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-600 rounded-lg text-[8px] font-black uppercase">
                                        <AlertTriangle size={10} /> Error
                                      </span>
                                    ) : isAnomaly ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-600 rounded-lg text-[8px] font-black uppercase">
                                        <AlertTriangle size={10} /> Alerta
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[8px] font-black uppercase">
                                        <CheckCircle2 size={10} /> OK
                                      </span>
                                    )}
                                  </div>
                                  
                                  {(hasErrors || isAnomaly) && (
                                    <div className="text-[8px] text-left space-y-1 max-w-[200px] mx-auto">
                                      <p className="font-black text-slate-400 uppercase">
                                        Registro: {record.lineNumber} | Rol: {record.propertyRole}
                                      </p>
                                      {hasErrors && record.validationErrors?.map((err, i) => {
                                        const [msg, solution] = err.split('. Solución: ');
                                        return (
                                          <div key={i} className="bg-rose-50/50 p-1.5 rounded border border-rose-100/50">
                                            <p className="font-black text-rose-700 uppercase leading-tight">{msg}</p>
                                            {solution && (
                                              <p className="font-bold text-slate-500 mt-0.5 italic">💡 {solution}</p>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {isAnomaly && !hasErrors && (
                                        <div className="bg-amber-50/50 p-1.5 rounded border border-amber-100/50">
                                          <p className="font-black text-amber-700 uppercase leading-tight">Inconsistencia histórica</p>
                                          <p className="font-bold text-slate-500 mt-0.5 italic">💡 Validar montos contra registros previos.</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'TASKS' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase">Gestión de Tareas Pendientes</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Seguimiento de correcciones y validaciones B13</p>
                </div>
                <div className="flex gap-2">
                  <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                    <Clock size={14} className="text-amber-500" />
                    <span className="text-[10px] font-black text-slate-600 uppercase">Pendientes: {tasks.filter(t => t.status === 'PENDING').length}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                    <ClipboardList size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-sm font-black text-slate-400 uppercase">No hay tareas pendientes</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase mt-1">Las tareas se crean manualmente al detectar errores críticos</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div 
                      key={task.id}
                      className={`bg-white rounded-2xl p-6 border transition-all flex items-center justify-between group ${
                        task.status === 'COMPLETED' ? 'border-slate-100 opacity-60' : 'border-slate-100 hover:border-indigo-200 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`p-3 rounded-xl ${
                          task.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-500' : 
                          task.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-500 animate-pulse' :
                          task.priority === 'HIGH' ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {task.status === 'COMPLETED' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className={`text-sm font-black uppercase ${task.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {task.title}
                            </h3>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                              task.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-600' :
                              task.priority === 'HIGH' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed max-w-xl">
                            {task.description}
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-[8px] font-black text-slate-300 uppercase flex items-center gap-1">
                              <Clock size={10} /> {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                            {task.recordId && (
                              <span className="text-[8px] font-black text-indigo-400 uppercase">Ref: {task.recordId.slice(0, 8)}...</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status !== 'COMPLETED' ? (
                          <button 
                            onClick={() => handleUpdateTaskStatus(task.id, 'COMPLETED')}
                            className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-emerald-100 transition-all"
                          >
                            Marcar como resuelto
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUpdateTaskStatus(task.id, 'PENDING')}
                            className="bg-slate-50 text-slate-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-slate-100 transition-all"
                          >
                            Reabrir
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            const updated = tasks.filter(t => t.id !== task.id);
                            setTasks(updated);
                            localStorage.setItem('b13_tasks', JSON.stringify(updated));
                          }}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ERROR DETAIL MODAL */}
      {selectedErrorRecord && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedErrorId(null)}
        >
          <div 
            className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-amber-50 px-10 py-8 border-b border-amber-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-amber-900 uppercase">Detalle de Inconsistencia</h2>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">Fila {selectedErrorRecord.lineNumber} | Rol {selectedErrorRecord.propertyRole || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={() => setExpandedErrorId(null)}
                className="p-3 bg-white text-slate-400 hover:text-slate-600 rounded-2xl shadow-sm transition-all hover:scale-110 active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              {/* ACCOUNT INFO */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Arrendatario / Deudor</p>
                  <p className="text-sm font-black text-slate-800 uppercase">{selectedErrorRecord.tenantName}</p>
                  <p className="text-[12px] font-mono font-black text-indigo-600 uppercase tracking-widest mt-1">RUT: {selectedErrorRecord.tenantRut}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Nemotécnico: {selectedErrorRecord.mnemonicCode}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Factura: {selectedErrorRecord.invoiceNumber || 'N/A'}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Fecha Emisión: {selectedErrorRecord.issueDate || 'N/A'}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Facturación Mes</p>
                  <p className="text-sm font-black text-slate-800">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedErrorRecord.billedMonth)}</p>
                </div>
              </div>

              {/* MOROSITY BUCKETS */}
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Desglose de Morosidad (M$)</p>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  {[
                    { label: '<30', val: selectedErrorRecord.morosityBuckets?.m30 },
                    { label: '30-60', val: selectedErrorRecord.morosityBuckets?.m60 },
                    { label: '60-90', val: selectedErrorRecord.morosityBuckets?.m90 },
                    { label: '90-180', val: selectedErrorRecord.morosityBuckets?.m180 },
                    { label: '180-365', val: selectedErrorRecord.morosityBuckets?.m365 },
                    { label: '1-2 Años', val: selectedErrorRecord.morosityBuckets?.m2y },
                    { label: '2-3 Años', val: selectedErrorRecord.morosityBuckets?.m3y },
                    { label: '3-4 Años', val: selectedErrorRecord.morosityBuckets?.m4y },
                    { label: '>4 Años', val: selectedErrorRecord.morosityBuckets?.plus4y },
                  ].map((bucket, i) => (
                    <div key={i} className="text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase">{bucket.label}</p>
                      <p className={`text-[10px] font-black ${bucket.val > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {new Intl.NumberFormat('es-CL').format(bucket.val || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* TECHNICAL SPECS */}
              <div className="bg-slate-50 rounded-3xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 border border-slate-100">
                <div className="text-center space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">M2 Disponibles</p>
                  <p className="text-xs font-black text-slate-700">{selectedErrorRecord.m2Available || 0} m²</p>
                </div>
                <div className="text-center space-y-1 border-x border-slate-200">
                  <p className="text-[8px] font-black text-slate-400 uppercase">M2 Arrendados</p>
                  <p className="text-xs font-black text-slate-700">{selectedErrorRecord.m2Rented || 0} m²</p>
                </div>
                <div className="text-center space-y-1 border-r border-slate-200">
                  <p className="text-[8px] font-black text-slate-400 uppercase">M2 Vacantes</p>
                  <p className="text-xs font-black text-slate-700">{selectedErrorRecord.m2Vacant || 0} m²</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Tipo Contrato</p>
                  <p className="text-xs font-black text-slate-700">{selectedErrorRecord.contractType || 'N/A'}</p>
                </div>
              </div>

              {/* FINANCIAL DETAILS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recaudación</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Mes Actual</span>
                      <span className="text-[10px] font-black text-slate-700">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedErrorRecord.collectedCurrent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Meses Anteriores</span>
                      <span className="text-[10px] font-black text-slate-700">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedErrorRecord.collectedPrevious)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-black text-indigo-600 uppercase">Total Recaudado</span>
                      <span className="text-[10px] font-black text-indigo-600">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedErrorRecord.collectedTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valores M2</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Valor M2 (UF)</span>
                      <span className="text-[10px] font-black text-slate-700">{selectedErrorRecord.rentValueUF} UF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Valor Esperado (UF)</span>
                      <span className="text-[10px] font-black text-slate-700">{selectedErrorRecord.expectedRentValueUF} UF</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ERROR LIST */}
              <div className="space-y-4 pb-4">
                <div className="flex items-center justify-between ml-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Análisis Técnico CMF</p>
                  <button 
                    onClick={() => {
                      handleAddTask(
                        `Corregir Inconsistencia: ${selectedErrorRecord.propertyRole}`,
                        `Se detectaron ${selectedErrorRecord.validationErrors?.length} errores en el registro del arrendatario ${selectedErrorRecord.tenantName}.`,
                        selectedErrorRecord.validationErrors?.some(e => e.includes('CRÍTICO')) ? 'CRITICAL' : 'HIGH',
                        selectedErrorRecord.id
                      );
                      alert('Tarea creada exitosamente');
                    }}
                    className="flex items-center gap-2 text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all"
                  >
                    <ClipboardList size={12} /> Crear Tarea de Seguimiento
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedErrorRecord.validationErrors?.map((err, i) => {
                    const [msg, solution] = err.split('. Solución: ');
                    return (
                      <div key={i} className="bg-rose-50 rounded-2xl p-5 border border-rose-100 space-y-2">
                        <p className="text-xs font-black text-rose-800 uppercase leading-relaxed">{msg}</p>
                        {solution && (
                          <div className="flex items-start gap-2 bg-white/60 rounded-xl p-3 border border-rose-50">
                            <span className="text-lg">💡</span>
                            <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
                              <span className="text-indigo-600 font-black uppercase text-[9px] block mb-1">Acción Sugerida:</span>
                              {solution}
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
              <button 
                onClick={() => setExpandedErrorId(null)}
                className="px-8 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 shadow-lg transition-all active:scale-95"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default B13ReportModule;
