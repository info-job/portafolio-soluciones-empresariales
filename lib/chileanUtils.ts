
/**
 * Utilidades específicas para Chile (RUT, IVA, Moneda)
 */

/**
 * Valida un RUT chileno (con o sin puntos/guión)
 */
export const validateRUT = (rut: string): boolean => {
  if (!rut || typeof rut !== 'string') return false;
  
  // Limpiar el RUT de puntos y guión
  const cleanRUT = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  
  if (cleanRUT.length < 8 || cleanRUT.length > 9) return false;
  
  const body = cleanRUT.slice(0, -1);
  const dv = cleanRUT.slice(-1);
  
  if (!/^\d+$/.test(body)) return false;
  
  let sum = 0;
  let multiplier = 2;
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const expectedDV = 11 - (sum % 11);
  let dvChar = '';
  
  if (expectedDV === 11) dvChar = '0';
  else if (expectedDV === 10) dvChar = 'K';
  else dvChar = expectedDV.toString();
  
  return dv === dvChar;
};

/**
 * Formatea un RUT chileno (ej: 123456789 -> 12.345.678-9)
 */
export const formatRUT = (rut: string): string => {
  if (!rut) return '';
  const cleanRUT = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (cleanRUT.length < 2) return cleanRUT;
  
  const body = cleanRUT.slice(0, -1);
  const dv = cleanRUT.slice(-1);
  
  return body.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') + '-' + dv;
};

/**
 * Formatea moneda chilena (CLP) sin decimales
 */
export const formatCLP = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Calcula el IVA (19% en Chile)
 */
export const calculateIVA = (netAmount: number): number => {
  return Math.round(netAmount * 0.19);
};

/**
 * Calcula la Retención de Honorarios (13.75% en Chile para 2025/2026)
 */
export const calculateRetention = (grossAmount: number): number => {
  return Math.round(grossAmount * 0.1375);
};

/**
 * Calcula el Total desde el Neto
 */
export const calculateTotalFromNet = (netAmount: number): number => {
  return netAmount + calculateIVA(netAmount);
};

/**
 * Calcula la sobretasa del impuesto territorial (Ley 21.210 Art. 7 bis)
 * de acuerdo con los avalúos fiscales acumulados por propietario.
 * Devuelve el detalle del cálculo general y asigna de manera proporcional a cada propiedad.
 */
export interface SurchargeResult {
  owner: string;
  propertyCount: number;
  totalAppraisal: number;
  exceedsThreshold: boolean;
  surchargeTotalAmount: number;
  breakdown: {
    bracket1Excess: number; // 0% up to 670 UTA
    bracket2Excess: number; // 0.075% on excess > 670 <= 1340 UTA
    bracket3Excess: number; // 0.150% on excess > 1340 <= 2010 UTA
    bracket4Excess: number; // 0.275% on excess > 2010 UTA
  };
  allocatedProperties: {
    propertyId: string;
    propertyCode: string;
    propertyBuilding: string;
    appraisalValue: number;
    proportionalShare: number; // % de contribución al total del propietario
    proportionalSurcharge: number; // $ sobretasa asignada proporcionalmente
  }[];
}

export const calculateSurchargeByOwner = (
  properties: { id: string; code: string; building: string; owner?: string; appraisalValue?: number }[],
  utaValue: number = 800000
): Record<string, SurchargeResult> => {
  const grouped: Record<string, typeof properties> = {};
  
  properties.forEach(p => {
    const ownerName = p.owner?.trim() || 'SIN PROPIETARIO';
    if (!grouped[ownerName]) grouped[ownerName] = [];
    grouped[ownerName].push(p);
  });
  
  const results: Record<string, SurchargeResult> = {};
  
  // Bracket thresholds in UTAs
  const limit1UTA = 670;
  const limit2UTA = 1340;
  const limit3UTA = 2010;
  
  const limit1 = limit1UTA * utaValue; // ~536,000,000 CLP
  const limit2 = limit2UTA * utaValue; // ~1,072,000,000 CLP
  const limit3 = limit3UTA * utaValue; // ~1,608,000,000 CLP
  
  Object.entries(grouped).forEach(([ownerName, props]) => {
    const totalAppraisal = props.reduce((sum, p) => sum + (p.appraisalValue || 0), 0);
    const exceedsThreshold = totalAppraisal > limit1;
    
    let surchargeTotalAmount = 0;
    let b2Excess = 0;
    let b3Excess = 0;
    let b4Excess = 0;
    
    if (exceedsThreshold) {
      if (totalAppraisal <= limit2) {
        b2Excess = totalAppraisal - limit1;
        surchargeTotalAmount = b2Excess * 0.00075;
      } else if (totalAppraisal <= limit3) {
        b2Excess = limit2 - limit1;
        b3Excess = totalAppraisal - limit2;
        surchargeTotalAmount = (b2Excess * 0.00075) + (b3Excess * 0.0015);
      } else {
        b2Excess = limit2 - limit1;
        b3Excess = limit3 - limit2;
        b4Excess = totalAppraisal - limit3;
        surchargeTotalAmount = (b2Excess * 0.00075) + (b3Excess * 0.0015) + (b4Excess * 0.00275);
      }
    }
    
    surchargeTotalAmount = Math.round(surchargeTotalAmount);
    
    const allocatedProperties = props.map(p => {
      const pValue = p.appraisalValue || 0;
      const proportionalShare = totalAppraisal > 0 ? pValue / totalAppraisal : 0;
      const proportionalSurcharge = Math.round(surchargeTotalAmount * proportionalShare);
      
      return {
        propertyId: p.id,
        propertyCode: p.code,
        propertyBuilding: p.building,
        appraisalValue: pValue,
        proportionalShare,
        proportionalSurcharge
      };
    });
    
    results[ownerName] = {
      owner: ownerName,
      propertyCount: props.length,
      totalAppraisal,
      exceedsThreshold,
      surchargeTotalAmount,
      breakdown: {
        bracket1Excess: Math.min(totalAppraisal, limit1),
        bracket2Excess: b2Excess,
        bracket3Excess: b3Excess,
        bracket4Excess: b4Excess
      },
      allocatedProperties
    };
  });
  
  return results;
};
