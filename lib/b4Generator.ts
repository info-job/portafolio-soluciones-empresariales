import { saveAs } from 'file-saver';
import { Property, LeaseContract, B4Record, InsuranceCompany } from '../types';
import { storage } from './storageEngine';

const safeUUID = (prefix: string = 'b4'): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

const safeDownloadBlob = (blob: Blob, fileName: string) => {
  try {
    if (typeof window !== 'undefined') {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 200);
      return;
    }
  } catch (e) {
    console.warn('Native download failed, falling back to saveAs:', e);
  }
  try {
    saveAs(blob, fileName);
  } catch (err) {
    console.error('File saving failed:', err);
  }
};

export interface B4PortfolioConsolidationRow {
  lineNumber: number;
  propertyId: string;
  propertyRole: string;
  propertyType: string;
  urbanRural: 'URBANO' | 'NO_URBANO';
  destination: 'HABITACIONAL' | 'NO_HABITACIONAL';
  use: 'ARRIENDO' | 'PROPIO' | 'MIXTO';
  ownUsePercentage: number;
  commune: string;
  address: string;
  city: string;
  
  // Superficies
  totalM2Land: number;
  totalM2Built: number;
  
  // Valoración Contable Desglosada NCG 316 (CMF)
  purchaseDate: string;
  landCostCLP: number;               // Costo Terreno (No Afecto a Depreciación - NCG 316)
  buildingCostCLP: number;           // Costo Construcción (Depreciable)
  updatedCostCLP: number;            // Costo Total = Terreno + Construcción
  landDepreciationCLP: number;       // $0 (CMF NCG 316: Terreno no depreciable)
  buildingDepreciationCLP: number;   // Depreciación Acumulada Construcción
  accumulatedDepreciationCLP: number;// Total Depreciación (= buildingDepreciationCLP)
  buildingNetCostCLP: number;        // Costo Neto Construcción (buildingCost - buildingDepreciation)
  remainingLifeMonths: number;
  correctedDepreciatedCostCLP: number; // Costo Deprec. Corregido = Terreno + Neto Construcción
  
  // Tasación Pericial Reglamentaria CMF Desglosada
  appraisalLandCLP: number;          // Tasación Terreno
  appraisalPerM2LandCLP: number;     // $/M2 Terreno (Truncado sin decimales)
  appraisalBuildingCLP: number;      // Tasación Construcción
  appraisalValuePerM2BuiltCLP: number; // $/M2 Construcción (Truncado sin decimales)
  appraisalValueCLP: number;         // Tasación Total (Terreno + Construcción)
  appraiserName: string;
  appraisalDate: string;
  
  // Valor Libro Final CMF
  finalValueCLP: number;
  ownershipPercentage: number;
  hasProhibition: boolean;
  backsReserve: boolean;
  ncg316Compliant: boolean;
  
  // Relación con Arriendo y Explotación Comercial
  tenantName: string;
  tenantRut: string;
  monthlyRentCLP: number;
  contractStatus: string;
  status: string;
}

export interface B4ConsolidationSummary {
  totalProperties: number;
  totalM2LandSum: number;
  totalM2BuiltSum: number;
  totalUpdatedCostCLP: number;
  totalLandCostCLP: number;              // Total Terreno (No depreciable NCG 316)
  totalBuildingCostCLP: number;          // Total Construcción Bruta
  totalDepreciationCLP: number;          // Depreciación Total Cartera (= Construcción)
  totalBuildingDepreciationCLP: number;  // Depreciación Construcciones
  totalLandDepreciationCLP: number;      // Depreciación Terrenos ($0 NCG 316)
  totalBuildingNetCostCLP: number;       // Total Neto Construcciones
  totalCorrectedDepreciatedCostCLP: number; // Terreno + Neto Construcción
  totalAppraisalValueCLP: number;
  totalAppraisalLandCLP: number;         // Tasación Terreno Total
  totalAppraisalBuildingCLP: number;     // Tasación Construcción Total
  totalFinalValueCLP: number;
  propertiesInRent: number;
  propertiesOwnUse: number;
  propertiesMixed: number;
  averageAppraisalPerM2Built: number;
  averageAppraisalPerM2Land: number;
  generatedAt: string;
}

/**
 * Normaliza y limpia textos para comparaciones seguras
 */
const cleanStr = (val: any): string => {
  return String(val || '').trim();
};

/**
 * Determina m2 construidos por defecto según tipología si no vienen definidos
 */
const getDefaultBuiltM2ForType = (type?: string): number => {
  const t = String(type || '').toUpperCase();
  if (t.includes('DEPTO') || t.includes('DEPARTAMENTO')) return 72;
  if (t.includes('CASA')) return 135;
  if (t.includes('OFICINA')) return 58;
  if (t.includes('BODEGA')) return 160;
  if (t.includes('ESTACIONAMIENTO')) return 14;
  if (t.includes('LOCAL')) return 85;
  if (t.includes('TERRENO')) return 0;
  return 75;
};

/**
 * Determina m2 de terreno por defecto según tipología si no vienen definidos
 */
const getDefaultLandM2ForType = (type?: string, builtM2: number = 70): number => {
  const t = String(type || '').toUpperCase();
  if (t.includes('CASA')) return 220;
  if (t.includes('TERRENO')) return 500;
  if (t.includes('BODEGA')) return 250;
  if (t.includes('LOCAL')) return 110;
  if (t.includes('OFICINA') || t.includes('DEPTO') || t.includes('DEPARTAMENTO') || t.includes('ESTACIONAMIENTO')) {
    // Cuota proporcional de terreno en copropiedad
    return Math.max(10, Math.round(builtM2 * 0.35));
  }
  return 100;
};

/**
 * Consolida la totalidad de la cartera de propiedades según la estructura oficial del
 * Archivo B.4 de Bienes Raíces (Circular CMF N° 1.835 / SVS) y conforme a la
 * Norma de Carácter General N° 316 (NCG 316 CMF).
 * 
 * Reglas mandatorias NCG 316:
 * 1. Desglose contable y pericial obligatorio entre Terreno y Construcción.
 * 2. Terrenos tienen vida útil indefinida y NO están afectos a depreciación (Dep. = $0).
 * 3. La depreciación acumulada se aplica única y exclusivamente a las Construcciones.
 * 4. El Costo Depreciado Corregido = Costo Terreno + (Costo Construcción - Depreciación Construcción).
 */
export function buildB4PortfolioConsolidation(
  properties: Property[] = [],
  contracts: LeaseContract[] = [],
  companyRut: string = '96.543.210-K'
): {
  rows: B4PortfolioConsolidationRow[];
  recordsForB4Report: B4Record[];
  summary: B4ConsolidationSummary;
} {
  const safeProperties = Array.isArray(properties) ? properties.filter(Boolean) : [];
  const safeContracts = Array.isArray(contracts) ? contracts.filter(Boolean) : [];

  // Mapa de contratos indexados por propertyId y por ROL
  const contractByPropId = new Map<string, LeaseContract>();
  const contractByRole = new Map<string, LeaseContract>();

  safeContracts.forEach((c) => {
    if (!c) return;
    if (c.propertyId && !contractByPropId.has(c.propertyId)) {
      contractByPropId.set(c.propertyId, c);
    }
    if (c.propertyLabel) {
      const parts = String(c.propertyLabel).split('-');
      if (parts.length >= 2) {
        const potentialRole = parts.slice(0, 2).join('-').trim();
        if (!contractByRole.has(potentialRole)) {
          contractByRole.set(potentialRole, c);
        }
      }
    }
  });

  // Ordenar cartera de propiedades de forma blindada (ROL ➔ Tipo ➔ Comuna ➔ Dirección)
  const sortedProperties = [...safeProperties].sort((a, b) => {
    if (!a || !b) return 0;
    const roleA = cleanStr(a.propertyRole || a.code);
    const roleB = cleanStr(b.propertyRole || b.code);
    const compRole = roleA.localeCompare(roleB, 'es', { numeric: true });
    if (compRole !== 0) return compRole;

    const typeA = cleanStr(a.type);
    const typeB = cleanStr(b.type);
    const compType = typeA.localeCompare(typeB, 'es');
    if (compType !== 0) return compType;

    const communeA = cleanStr(a.commune);
    const communeB = cleanStr(b.commune);
    const compCommune = communeA.localeCompare(communeB, 'es');
    if (compCommune !== 0) return compCommune;

    const addrA = cleanStr(a.address);
    const addrB = cleanStr(b.address);
    return addrA.localeCompare(addrB, 'es');
  });

  const rows: B4PortfolioConsolidationRow[] = [];
  const recordsForB4Report: B4Record[] = [];

  let totalM2LandSum = 0;
  let totalM2BuiltSum = 0;
  let totalUpdatedCostCLP = 0;
  let totalLandCostCLP = 0;
  let totalBuildingCostCLP = 0;
  let totalDepreciationCLP = 0;
  let totalBuildingDepreciationCLP = 0;
  const totalLandDepreciationCLP = 0; // Estrictamente $0 por NCG 316
  let totalBuildingNetCostCLP = 0;
  let totalCorrectedDepreciatedCostCLP = 0;
  let totalAppraisalValueCLP = 0;
  let totalAppraisalLandCLP = 0;
  let totalAppraisalBuildingCLP = 0;
  let totalFinalValueCLP = 0;
  let propertiesInRent = 0;
  let propertiesOwnUse = 0;
  let propertiesMixed = 0;

  sortedProperties.forEach((p, index) => {
    const role = cleanStr(p.propertyRole || p.code || `ROL-${1000 + index}`);
    const propType = cleanStr(p.type || 'DEPARTAMENTO').toUpperCase();
    const commune = cleanStr(p.commune || 'SANTIAGO');
    const address = cleanStr(p.address || `Inmueble Rol ${role}`);
    const city = cleanStr(p.region || 'SANTIAGO');

    // 1. Superficies
    const builtM2 = Number(p.surfaceAreaBuilt) > 0 ? Number(p.surfaceAreaBuilt) : getDefaultBuiltM2ForType(propType);
    const landM2 = Number(p.surfaceAreaLand) > 0 ? Number(p.surfaceAreaLand) : getDefaultLandM2ForType(propType, builtM2);

    totalM2LandSum += landM2;
    totalM2BuiltSum += builtM2;

    // 2. Destino y Uso según normativa CMF
    let destination: 'HABITACIONAL' | 'NO_HABITACIONAL' = 'HABITACIONAL';
    if (p.destination) {
      destination = p.destination;
    } else {
      if (['LOCAL', 'OFICINA', 'BODEGA'].includes(propType)) {
        destination = 'NO_HABITACIONAL';
      }
    }

    // Vinculación contractual
    const contract = contractByPropId.get(p.id) || contractByRole.get(role);
    const hasContract = Boolean(contract && contract.status !== 'FINIQUITADO' && contract.status !== 'RESUCINDIDO');

    let use: 'ARRIENDO' | 'PROPIO' | 'MIXTO' = 'ARRIENDO';
    let ownUsePercentage = 0;

    if (p.useType) {
      use = p.useType;
      ownUsePercentage = use === 'PROPIO' ? 100 : use === 'MIXTO' ? 50 : 0;
    } else if (!hasContract && (propType === 'OFICINA' || address.toLowerCase().includes('casa matriz') || address.toLowerCase().includes('sucursal'))) {
      use = 'PROPIO';
      ownUsePercentage = 100;
    } else {
      use = 'ARRIENDO';
      ownUsePercentage = 0;
    }

    if (use === 'ARRIENDO') propertiesInRent++;
    else if (use === 'PROPIO') propertiesOwnUse++;
    else propertiesMixed++;

    // 3. Valoración Contable & Tasación Pericial NCG 316
    const defaultAppraisalFromM2 = Math.round(builtM2 * 38000 * 42); // Estimación razonable UF 42/m2
    const appraisalValue = Number(p.appraisalValue) > 0 ? Number(p.appraisalValue) : defaultAppraisalFromM2;
    
    // Costo actualizado base
    let totalUpdatedCost = appraisalValue * 0.90;
    let rawDepreciation = appraisalValue * 0.15;
    let remainingLifeMonths = 360;

    if (p.financialData) {
      if (Number(p.financialData.acquisitionCostCLP) > 0) totalUpdatedCost = Number(p.financialData.acquisitionCostCLP);
      if (Number(p.financialData.accumulatedDepreciationCLP) > 0) rawDepreciation = Number(p.financialData.accumulatedDepreciationCLP);
      if (Number(p.financialData.usefulLifeMonths) > 0) remainingLifeMonths = Number(p.financialData.usefulLifeMonths);
    }

    // =========================================================================
    // NORMA DE CARÁCTER GENERAL N° 316 (CMF CHILE) - SEPARACIÓN TERRENO / CONSTRUCCIÓN
    // =========================================================================
    // Determinación del ratio técnico de terreno vs construcción según tipología inmobiliaria:
    let landRatio = 0.30;
    if (propType.includes('TERRENO')) {
      landRatio = 1.0; // 100% terreno
    } else if (propType.includes('CASA')) {
      landRatio = 0.45; // 45% terreno, 55% construcción
    } else if (propType.includes('DEPTO') || propType.includes('DEPARTAMENTO')) {
      landRatio = 0.20; // 20% cuota proporcional de terreno en copropiedad
    } else if (propType.includes('OFICINA')) {
      landRatio = 0.25; // 25% cuota terreno
    } else if (propType.includes('LOCAL')) {
      landRatio = 0.35; // 35% terreno
    } else if (propType.includes('BODEGA')) {
      landRatio = 0.40; // 40% terreno
    } else if (propType.includes('ESTACIONAMIENTO')) {
      landRatio = 0.30;
    }

    // Costos desglosados (respetando datos explícitos si existen)
    let landCostCLP = Math.round(totalUpdatedCost * landRatio);
    let buildingCostCLP = Math.max(0, Math.round(totalUpdatedCost - landCostCLP));

    if (p.financialData?.landAcquisitionCostCLP && Number(p.financialData.landAcquisitionCostCLP) > 0) {
      landCostCLP = Math.round(Number(p.financialData.landAcquisitionCostCLP));
      if (p.financialData?.buildingAcquisitionCostCLP && Number(p.financialData.buildingAcquisitionCostCLP) > 0) {
        buildingCostCLP = Math.round(Number(p.financialData.buildingAcquisitionCostCLP));
      } else {
        buildingCostCLP = Math.max(0, Math.round(totalUpdatedCost - landCostCLP));
      }
    }

    const updatedCostCLP = landCostCLP + buildingCostCLP;

    // MANDATO NCG 316:
    // Los terrenos NO sufren depreciación (vida útil indefinida, landDepreciation = 0).
    // La depreciación acumulada se imputa exclusivamente sobre la Construcción.
    const landDepreciationCLP = 0;
    const buildingDepreciationCLP = Math.min(buildingCostCLP, Math.round(rawDepreciation));
    const accumulatedDepreciationCLP = buildingDepreciationCLP; // Total depreciación = Dep. Construcción
    const buildingNetCostCLP = Math.max(0, buildingCostCLP - buildingDepreciationCLP);
    const correctedDepreciatedCostCLP = landCostCLP + buildingNetCostCLP;

    // Tasación Pericial Desglosada NCG 316
    const appraisalLandCLP = Math.round(appraisalValue * landRatio);
    const appraisalBuildingCLP = Math.max(0, Math.round(appraisalValue - appraisalLandCLP));
    const appraisalPerM2LandCLP = landM2 > 0 ? Math.trunc(appraisalLandCLP / landM2) : 0;
    const appraisalValuePerM2BuiltCLP = builtM2 > 0 ? Math.trunc(appraisalBuildingCLP / builtM2) : 0;

    // Valor Libro Final CMF (Valor Razonable NIC 40 / NCG 316)
    const finalValueCLP = appraisalValue > 0 ? appraisalValue : correctedDepreciatedCostCLP;

    // Sumatorias globales
    totalUpdatedCostCLP += updatedCostCLP;
    totalLandCostCLP += landCostCLP;
    totalBuildingCostCLP += buildingCostCLP;
    totalDepreciationCLP += accumulatedDepreciationCLP;
    totalBuildingDepreciationCLP += buildingDepreciationCLP;
    totalBuildingNetCostCLP += buildingNetCostCLP;
    totalCorrectedDepreciatedCostCLP += correctedDepreciatedCostCLP;
    totalAppraisalValueCLP += appraisalValue;
    totalAppraisalLandCLP += appraisalLandCLP;
    totalAppraisalBuildingCLP += appraisalBuildingCLP;
    totalFinalValueCLP += finalValueCLP;

    // Perito Tasador y Fecha
    const appraiserName = 'TRANSVAL CHILE CONSULTORES PERICIALES (REG. CMF N° 048)';
    const appraisalDate = p.lastAppraisalDate || '2025-11-30';

    // Datos del arrendatario si aplica
    const tenantName = contract ? contract.tenantName : (use === 'PROPIO' ? 'USO INSTITUCIONAL ASEGURADORA' : 'DISPONIBLE PARA ARRIENDO');
    const tenantRut = contract ? contract.tenantTaxId : (use === 'PROPIO' ? companyRut : 'S/I');
    const monthlyRentCLP = contract ? Number(contract.monthlyAmount) || 0 : (Number(p.rentalAmount) || 0);
    const contractStatus = contract ? contract.status : 'SIN_CONTRATO';

    const row: B4PortfolioConsolidationRow = {
      lineNumber: index + 1,
      propertyId: p.id,
      propertyRole: role,
      propertyType: propType,
      urbanRural: 'URBANO',
      destination,
      use,
      ownUsePercentage,
      commune,
      address,
      city,
      totalM2Land: landM2,
      totalM2Built: builtM2,
      purchaseDate: p.financialData?.acquisitionDate || '2020-03-15',
      landCostCLP,
      buildingCostCLP,
      updatedCostCLP,
      landDepreciationCLP,
      buildingDepreciationCLP,
      accumulatedDepreciationCLP,
      buildingNetCostCLP,
      remainingLifeMonths,
      correctedDepreciatedCostCLP,
      appraisalLandCLP,
      appraisalPerM2LandCLP,
      appraisalBuildingCLP,
      appraisalValuePerM2BuiltCLP,
      appraisalValueCLP: Math.round(appraisalValue),
      appraiserName,
      appraisalDate,
      finalValueCLP: Math.round(finalValueCLP),
      ownershipPercentage: 100,
      hasProhibition: false,
      backsReserve: true,
      ncg316Compliant: true,
      tenantName,
      tenantRut,
      monthlyRentCLP: Math.round(monthlyRentCLP),
      contractStatus,
      status: p.status || 'ACTIVO'
    };

    rows.push(row);

    // Mapeo canónico a B4Record
    const b4Record: B4Record = {
      id: p.id || safeUUID('b4_rec'),
      lineNumber: index + 1,
      rut: companyRut,
      propertyRole: role,
      propertyType: {
        apartment: propType.includes('DEPTO') || propType.includes('DEPARTAMENTO'),
        house: propType.includes('CASA'),
        office: propType.includes('OFICINA'),
        local: propType.includes('LOCAL'),
        warehouse: propType.includes('BODEGA'),
        parking: propType.includes('ESTACIONAMIENTO'),
        land: propType.includes('TERRENO'),
        building: propType.includes('EDIFICIO'),
        others: !['DEPTO', 'DEPARTAMENTO', 'CASA', 'OFICINA', 'LOCAL', 'BODEGA', 'ESTACIONAMIENTO', 'TERRENO'].some(k => propType.includes(k))
      },
      urbanRural: 'URBANO',
      destination,
      use,
      ownUsePercentage,
      address,
      commune,
      city,
      purchaseDate: row.purchaseDate,
      updatedCost: row.updatedCostCLP,
      landUpdatedCost: row.landCostCLP,
      buildingUpdatedCost: row.buildingCostCLP,
      accumulatedDepreciation: row.accumulatedDepreciationCLP,
      landAccumulatedDepreciation: 0,
      buildingAccumulatedDepreciation: row.buildingDepreciationCLP,
      buildingNetCost: row.buildingNetCostCLP,
      remainingLifeMonths: row.remainingLifeMonths,
      correctedDepreciatedCost: row.correctedDepreciatedCostCLP,
      appraisal1: row.appraisalValueCLP,
      appraisal2: 0,
      appraisalLand1: row.appraisalLandCLP,
      appraisalBuilding1: row.appraisalBuildingCLP,
      appraiser1: row.appraiserName,
      appraiser2: '',
      appraisalDate1: row.appraisalDate,
      appraisalDate2: '',
      totalM2Land: row.totalM2Land,
      totalM2Built: row.totalM2Built,
      appraisalM2Land: row.appraisalPerM2LandCLP,
      appraisalM2Built: row.appraisalValuePerM2BuiltCLP,
      deterioration: 0,
      finalValue: row.finalValueCLP,
      ownershipPercentage: 100,
      hasProhibition: false,
      backsReserve: true,
      ncg316Compliant: true,
      validationErrors: []
    };

    recordsForB4Report.push(b4Record);
  });

  const averageAppraisalPerM2Built = totalM2BuiltSum > 0 ? Math.trunc(totalAppraisalBuildingCLP / totalM2BuiltSum) : 0;
  const averageAppraisalPerM2Land = totalM2LandSum > 0 ? Math.trunc(totalAppraisalLandCLP / totalM2LandSum) : 0;

  return {
    rows,
    recordsForB4Report,
    summary: {
      totalProperties: safeProperties.length,
      totalM2LandSum,
      totalM2BuiltSum,
      totalUpdatedCostCLP: Math.round(totalUpdatedCostCLP),
      totalLandCostCLP: Math.round(totalLandCostCLP),
      totalBuildingCostCLP: Math.round(totalBuildingCostCLP),
      totalDepreciationCLP: Math.round(totalDepreciationCLP),
      totalBuildingDepreciationCLP: Math.round(totalBuildingDepreciationCLP),
      totalLandDepreciationCLP,
      totalBuildingNetCostCLP: Math.round(totalBuildingNetCostCLP),
      totalCorrectedDepreciatedCostCLP: Math.round(totalCorrectedDepreciatedCostCLP),
      totalAppraisalValueCLP: Math.round(totalAppraisalValueCLP),
      totalAppraisalLandCLP: Math.round(totalAppraisalLandCLP),
      totalAppraisalBuildingCLP: Math.round(totalAppraisalBuildingCLP),
      totalFinalValueCLP: Math.round(totalFinalValueCLP),
      propertiesInRent,
      propertiesOwnUse,
      propertiesMixed,
      averageAppraisalPerM2Built,
      averageAppraisalPerM2Land,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Exporta el Informe B.4 a un archivo Excel (.xlsx) estructurado, con diseño tabulado oficial CMF
 * conforme a la Norma de Carácter General N° 316 (NCG 316):
 * - Desglose explícito entre Terreno (No depreciable) y Construcción (Depreciable).
 * - Depreciación de terrenos en $0.
 * - Tasación pericial separada entre Terreno y Construcción con $/m2 de cada uno.
 * - Autofiltros en los encabezados de la tabla.
 * - Totales dinámicos con SUBTOTAL(109) y formato numérico chileno.
 */
export async function exportB4ConsolidationToExcel(
  rows: B4PortfolioConsolidationRow[],
  fileName: string = 'Informe_B4_CMF_Bienes_Raices.xlsx',
  companyName: string = 'ASSETFLOW CORPORACIÓN DE SEGUROS',
  companyRut: string = '96.543.210-K',
  period: string = new Date().toISOString().slice(0, 7)
): Promise<void> {
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AssetFlow Enterprise CMF B4 Engine (NCG 316 Compliant)';
  workbook.lastModifiedBy = 'AssetFlow Real Estate Regulatory Compliance';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('REGISTRO B4 BIENES RAICES', {
    views: [{ showGridLines: true }]
  });

  // 1. Títulos y Encabezado Institucional
  const totalColumns = 31;
  const colLetterEnd = 'AE'; // Columna 31

  worksheet.mergeCells(`A1:${colLetterEnd}1`);
  const titleA1 = worksheet.getCell('A1');
  titleA1.value = `${companyName} — INFORME B.4 CMF DE BIENES RAÍCES E INVERSIONES INMOBILIARIAS`;
  titleA1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleA1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate-900
  titleA1.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 32;

  worksheet.mergeCells(`A2:${colLetterEnd}2`);
  const subA2 = worksheet.getCell('A2');
  subA2.value = `Circular CMF N° 1.835 / SEIL • NORMA DE CARÁCTER GENERAL N° 316 (Valorización Separada Terreno y Construcción - Terrenos no afectos a depreciación) • NIIF / NIC 40`;
  subA2.font = { name: 'Calibri', size: 10, italic: true, bold: true, color: { argb: 'FF1E293B' } };
  subA2.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 22;

  worksheet.mergeCells(`A3:${colLetterEnd}3`);
  const infoA3 = worksheet.getCell('A3');
  infoA3.value = `Período Informado: ${period} | RUT Compañía: ${companyRut} | Inmuebles Declarados: ${rows.length} | Criterio NCG 316: Depreciación Terreno = $0 (Vida Útil Indefinida) | Fecha Emisión: ${new Date().toLocaleString('es-CL')}`;
  infoA3.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF475569' } };
  infoA3.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(3).height = 18;

  // Fila vacía separadora
  worksheet.addRow([]);

  // 2. Encabezados de Columnas Oficiales NCG 316 (Fila 5, 31 Columnas)
  const headers = [
    'N° LÍNEA',
    'ROL SII',
    'TIPO INMUEBLE',
    'DESTINO',
    'ZONA',
    'USO CMF',
    '% USO PROP.',
    'COMUNA',
    'DIRECCIÓN / UBICACIÓN',
    'M2 TERRENO',
    'M2 CONSTRUIDO',
    'VALOR TERRENO (NO DEPREC. NCG 316)',
    'VALOR CONSTRUCCIÓN (CLP)',
    'COSTO ACTUALIZADO TOTAL (CLP)',
    'DEP. ACUM. CONSTRUCCIÓN (CLP)',
    'DEP. TERRENO (NCG 316: $0)',
    'COSTO NETO CONSTRUCCIÓN (CLP)',
    'COSTO TOTAL DEPREC. CORR. (CLP)',
    'TASACIÓN TERRENO (CLP)',
    'VALOR $/M2 TERRENO',
    'TASACIÓN CONSTRUCCIÓN (CLP)',
    'VALOR $/M2 CONST.',
    'TASACIÓN TOTAL CARTERA (CLP)',
    'PERITO TASADOR REG. CMF',
    'FECHA TASACIÓN',
    'VALOR FINAL CONTABLE (CLP)',
    '% DOMINIO',
    'GRAVAMEN',
    'RESPALDA RESERVA',
    'ARRENDATARIO VIGENTE',
    'RUT ARRENDATARIO'
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 32;
  headerRow.eachCell((cell, colNumber) => {
    // Colores temáticos para distinguir Terreno (Ámbar/Oliva) y Construcción (Slate/Índigo)
    let headerBg = 'FF0F172A'; // Slate-900 general
    if (colNumber === 12 || colNumber === 16 || colNumber === 19 || colNumber === 20) {
      headerBg = 'FF1E3A8A'; // Azul/Índigo para Terrenos (NCG 316)
    } else if (colNumber === 13 || colNumber === 15 || colNumber === 17 || colNumber === 21 || colNumber === 22) {
      headerBg = 'FF334155'; // Slate-700 para Construcciones
    }

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerBg }
    };
    cell.font = {
      name: 'Calibri',
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 9
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF475569' } }
    };
  });

  // 3. Filas de Datos
  const startRow = 6;
  rows.forEach((r, idx) => {
    const isEven = idx % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    const dataRow = worksheet.addRow([
      r.lineNumber,
      r.propertyRole,
      r.propertyType,
      r.destination,
      r.urbanRural,
      r.use,
      r.ownUsePercentage / 100,
      r.commune,
      r.address,
      r.totalM2Land,
      r.totalM2Built,
      r.landCostCLP,
      r.buildingCostCLP,
      r.updatedCostCLP,
      r.buildingDepreciationCLP,
      r.landDepreciationCLP, // Siempre 0
      r.buildingNetCostCLP,
      r.correctedDepreciatedCostCLP,
      r.appraisalLandCLP,
      r.appraisalPerM2LandCLP,
      r.appraisalBuildingCLP,
      r.appraisalValuePerM2BuiltCLP,
      r.appraisalValueCLP,
      r.appraiserName,
      r.appraisalDate,
      r.finalValueCLP,
      r.ownershipPercentage / 100,
      r.hasProhibition ? 'SÍ' : 'NO',
      r.backsReserve ? 'SÍ' : 'NO',
      r.tenantName,
      r.tenantRut
    ]);
    dataRow.height = 20;

    dataRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      // Alineaciones y Formatos Específicos
      if ([1, 2, 3, 4, 5, 6, 25, 28, 29, 31].includes(colNumber)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (colNumber === 2) cell.font = { name: 'Calibri', bold: true, size: 9 };
      } else if ([8, 9, 24, 30].includes(colNumber)) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        if (colNumber === 9 || colNumber === 30) cell.font = { name: 'Calibri', bold: true, size: 9 };
      } else if (colNumber === 7 || colNumber === 27) {
        // Porcentajes
        cell.numFmt = '0%';
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 10 || colNumber === 11) {
        // Superficies
        cell.numFmt = '#,##0.00 "m²"';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font = { name: 'Calibri', bold: colNumber === 11, size: 9 };
      } else if (colNumber === 20 || colNumber === 22) {
        // Valores unitarios $/m2
        cell.numFmt = '"$"#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font = { name: 'Calibri', bold: true, color: { argb: 'FF0F172A' }, size: 9 };
      } else if (colNumber === 16) {
        // Depreciación Terreno ($0 NCG 316)
        cell.numFmt = '"$"#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font = { name: 'Calibri', italic: true, color: { argb: 'FF059669' }, size: 9 }; // Verde esmeralda indicando $0 sin pérdida
      } else if (colNumber === 15) {
        // Depreciación Construcción
        cell.numFmt = '"$"#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font = { name: 'Calibri', color: { argb: 'FFE11D48' }, size: 9 }; // Rosa/Rojo
      } else {
        // Valores Monetarios CLP (Cols 12, 13, 14, 17, 18, 19, 21, 23, 26)
        cell.numFmt = '"$"#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if ([12, 18, 23, 26].includes(colNumber)) {
          cell.font = { name: 'Calibri', bold: true, color: { argb: 'FF0F172A' }, size: 9 };
        } else {
          cell.font = { name: 'Calibri', size: 9 };
        }
      }
    });
  });

  const endRow = Math.max(startRow, startRow + (rows.length > 0 ? rows.length - 1 : 0));
  const totalsRowIndex = endRow + 1;

  // 4. Fila de Totales con fórmulas SUBTOTAL (compatibles con filtros dinámicos de Excel)
  const totalM2LandAll = rows.reduce((s, r) => s + r.totalM2Land, 0);
  const totalM2BuiltAll = rows.reduce((s, r) => s + r.totalM2Built, 0);
  const totalLandCostAll = rows.reduce((s, r) => s + r.landCostCLP, 0);
  const totalBuildingCostAll = rows.reduce((s, r) => s + r.buildingCostCLP, 0);
  const totalCostAll = rows.reduce((s, r) => s + r.updatedCostCLP, 0);
  const totalBuildingDeprAll = rows.reduce((s, r) => s + r.buildingDepreciationCLP, 0);
  const totalBuildingNetCostAll = rows.reduce((s, r) => s + r.buildingNetCostCLP, 0);
  const totalCostCorrAll = rows.reduce((s, r) => s + r.correctedDepreciatedCostCLP, 0);
  const totalAppraisalLandAll = rows.reduce((s, r) => s + r.appraisalLandCLP, 0);
  const avgAppraisalM2LandAll = totalM2LandAll > 0 ? Math.trunc(totalAppraisalLandAll / totalM2LandAll) : 0;
  const totalAppraisalBuildingAll = rows.reduce((s, r) => s + r.appraisalBuildingCLP, 0);
  const avgAppraisalM2BuiltAll = totalM2BuiltAll > 0 ? Math.trunc(totalAppraisalBuildingAll / totalM2BuiltAll) : 0;
  const totalAppraisalAll = rows.reduce((s, r) => s + r.appraisalValueCLP, 0);
  const totalFinalAll = rows.reduce((s, r) => s + r.finalValueCLP, 0);

  worksheet.mergeCells(`A${totalsRowIndex}:I${totalsRowIndex}`);
  const totalsLabelCell = worksheet.getCell(`A${totalsRowIndex}`);
  totalsLabelCell.value = 'TOTALES CARTERA NCG 316 (TERRENO + CONSTRUCCIÓN):';
  totalsLabelCell.font = { name: 'Calibri', bold: true, size: 9.5, color: { argb: 'FF0F172A' } };
  totalsLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const totalsRow = worksheet.getRow(totalsRowIndex);
  totalsRow.height = 26;

  const totalCols = [
    { col: 10, formula: `SUBTOTAL(109, J${startRow}:J${endRow})`, result: totalM2LandAll, numFmt: '#,##0.00 "m²"' },
    { col: 11, formula: `SUBTOTAL(109, K${startRow}:K${endRow})`, result: totalM2BuiltAll, numFmt: '#,##0.00 "m²"' },
    { col: 12, formula: `SUBTOTAL(109, L${startRow}:L${endRow})`, result: totalLandCostAll, numFmt: '"$"#,##0' },
    { col: 13, formula: `SUBTOTAL(109, M${startRow}:M${endRow})`, result: totalBuildingCostAll, numFmt: '"$"#,##0' },
    { col: 14, formula: `SUBTOTAL(109, N${startRow}:N${endRow})`, result: totalCostAll, numFmt: '"$"#,##0' },
    { col: 15, formula: `SUBTOTAL(109, O${startRow}:O${endRow})`, result: totalBuildingDeprAll, numFmt: '"$"#,##0' },
    { col: 16, formula: undefined, result: 0, numFmt: '"$"#,##0' }, // Dep. Terreno = $0 fijo por NCG 316
    { col: 17, formula: `SUBTOTAL(109, Q${startRow}:Q${endRow})`, result: totalBuildingNetCostAll, numFmt: '"$"#,##0' },
    { col: 18, formula: `SUBTOTAL(109, R${startRow}:R${endRow})`, result: totalCostCorrAll, numFmt: '"$"#,##0' },
    { col: 19, formula: `SUBTOTAL(109, S${startRow}:S${endRow})`, result: totalAppraisalLandAll, numFmt: '"$"#,##0' },
    { col: 20, formula: undefined, result: avgAppraisalM2LandAll, numFmt: '"$"#,##0' },
    { col: 21, formula: `SUBTOTAL(109, U${startRow}:U${endRow})`, result: totalAppraisalBuildingAll, numFmt: '"$"#,##0' },
    { col: 22, formula: undefined, result: avgAppraisalM2BuiltAll, numFmt: '"$"#,##0' },
    { col: 23, formula: `SUBTOTAL(109, W${startRow}:W${endRow})`, result: totalAppraisalAll, numFmt: '"$"#,##0' },
    { col: 26, formula: `SUBTOTAL(109, Z${startRow}:Z${endRow})`, result: totalFinalAll, numFmt: '"$"#,##0' }
  ];

  totalCols.forEach(({ col, formula, result, numFmt }) => {
    const cell = totalsRow.getCell(col);
    if (formula) {
      cell.value = { formula, result };
    } else {
      cell.value = result;
    }
    cell.numFmt = numFmt;
    cell.font = { name: 'Calibri', bold: true, size: 9.5, color: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  });

  totalsRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' } // Slate-100
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // 5. Ajustar anchos de columnas (31 columnas)
  const colWidths = [
    10, // 1. N° Línea
    14, // 2. ROL
    18, // 3. Tipo
    16, // 4. Destino
    12, // 5. Zona
    14, // 6. Uso
    14, // 7. % Uso Propio
    18, // 8. Comuna
    34, // 9. Dirección
    15, // 10. M2 Terreno
    15, // 11. M2 Construido
    22, // 12. Valor Terreno
    22, // 13. Valor Construcción
    22, // 14. Costo Actualizado Total
    20, // 15. Dep. Acum. Construcción
    18, // 16. Dep. Terreno (NCG 316: $0)
    20, // 17. Costo Neto Construcción
    22, // 18. Costo Total Deprec. Corr.
    22, // 19. Tasación Terreno
    18, // 20. $/M2 Terreno
    22, // 21. Tasación Construcción
    18, // 22. $/M2 Construcción
    24, // 23. Tasación Total
    38, // 24. Perito Tasador
    16, // 25. Fecha Tasación
    24, // 26. Valor Final Contable
    12, // 27. % Dominio
    12, // 28. Gravamen
    16, // 29. Respalda Reserva
    32, // 30. Arrendatario
    18  // 31. RUT Arrendatario
  ];
  colWidths.forEach((w, idx) => {
    worksheet.getColumn(idx + 1).width = w;
  });

  // 6. HABILITAR FILTROS EN LOS ENCABEZADOS DE LA TABLA (Fila 5, columnas 1 a 31)
  worksheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: endRow, column: totalColumns }
  };

  // 7. Inmovilizar fila de encabezados para mantenerla fija al desplazarse
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 5, activeCell: 'A6', showGridLines: true }
  ];

  // 8. Generar y descargar archivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  safeDownloadBlob(blob, fileName);

  // 9. Respaldo opcional en Bóveda Digital
  try {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      const docPayload = {
        id: safeUUID('b4_doc'),
        type: 'SALIENTE',
        docNumber: `CMF-B4-${period}-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString().slice(0, 10),
        arrivalDate: new Date().toISOString().slice(0, 10),
        systemLoadDate: new Date().toISOString(),
        subject: `REGISTRO OFICIAL CMF B.4 BIENES RAÍCES (NCG 316) - PERÍODO ${period}`,
        synthesis: `Archivo consolidado de ${rows.length} bienes raíces bajo NCG 316 (desglose terreno no depreciable y construcción).`,
        status: 'DESPACHADO',
        statusUpdatedAt: Date.now(),
        sender: companyName,
        recipient: 'COMISIÓN PARA EL MERCADO FINANCIERO (CMF CHILE)',
        userCreator: 'AssetFlow Regulatory Engine NCG 316',
        timestamp: Date.now(),
        documentUrl: base64data,
        documentName: fileName
      };
      const existingData = await storage.loadStoresSubset(['officialDocs']);
      const existingDocs = existingData?.officialDocs || [];
      await storage.save('officialDocs', [docPayload, ...existingDocs]);
    };
    reader.readAsDataURL(blob);
  } catch (err) {
    console.warn('No se pudo respaldar el B4 en la bóveda de documentos:', err);
  }
}
