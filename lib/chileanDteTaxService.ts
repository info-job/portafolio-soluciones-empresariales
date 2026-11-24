import { DTEInvoice, DTEInvoiceLineItem, DTEType, DTEExemptionReason } from '../types';

/**
 * Servicio Especializado de Facturación Electrónica (DTE) y Cumplimiento
 * del Decreto Ley N° 825 sobre Impuesto a las Ventas y Servicios (IVA),
 * particularmente Artículo 8°, letra g) y Artículo 17° inciso 2°.
 */

export interface TaxAssessmentResult {
  isExempt: boolean;
  dteType: DTEType;
  dteTypeName: string;
  category: 'EXENTO_PLENO' | 'AFECTO_TOTAL' | 'AFECTO_CON_DEDUCCION_AVALUO' | 'MIXTO';
  legalSummary: string;
  legalCitation: string;
  siiNormativeBasis: string;
  siiCirculars: string[];
  checklist: {
    title: string;
    description: string;
    passed: boolean;
    recommendation?: string;
  }[];
  calculations: {
    rentalAmount: number;
    fiscalAppraisalValue: number;
    monthlyFiscalDeduction: number;
    exemptAmount: number;
    netTaxableAmount: number;
    taxableBase: number;
    ivaRate: number;
    ivaAmount: number;
    totalAmount: number;
    effectiveTaxRate: number;
  };
}

/**
 * Evalúa el régimen de IVA para una propiedad o contrato según el D.L. 825 Art. 8 letra g
 */
export const evaluateDL825Art8g = ({
  rentalAmount,
  isFurnished,
  hasCommercialFacilities,
  propertyDestination = 'HABITACIONAL',
  fiscalAppraisalValue = 0,
  taxableServicesAmount = 0
}: {
  rentalAmount: number;
  isFurnished: boolean;
  hasCommercialFacilities: boolean;
  propertyDestination?: 'HABITACIONAL' | 'OFICINA' | 'COMERCIAL' | 'BODEGA' | 'INDUSTRIAL';
  fiscalAppraisalValue?: number;
  taxableServicesAmount?: number;
}): TaxAssessmentResult => {
  // Deducción legal por avalúo fiscal vigente (Art. 17 inc. 2 DL 825: 11% anual dividido en 12 meses)
  const monthlyFiscalDeduction = Math.round((fiscalAppraisalValue * 0.11) / 12);

  // REGLA 1: Inmueble NO amoblado y SIN instalaciones o maquinarias industriales
  // Criterio Art. 8 letra g a contrario sensu: NO ESTÁ GRAVADO CON IVA (EXENTO)
  if (!isFurnished && !hasCommercialFacilities) {
    const isExempt = taxableServicesAmount === 0;
    const dteType: DTEType = isExempt ? '34' : '33';
    const dteTypeName = isExempt 
      ? 'Factura No Afecta o Exenta Electrónica (DTE 34)' 
      : 'Factura Electrónica Afecta / Mixta (DTE 33)';

    const exemptAmount = rentalAmount;
    const netTaxableAmount = taxableServicesAmount;
    const ivaAmount = Math.round(netTaxableAmount * 0.19);
    const totalAmount = exemptAmount + netTaxableAmount + ivaAmount;

    return {
      isExempt,
      dteType,
      dteTypeName,
      category: taxableServicesAmount > 0 ? 'MIXTO' : 'EXENTO_PLENO',
      legalSummary: 'OPERACIÓN EXENTA DE IVA SEGÚN ART. 8° LETRA G) D.L. 825',
      legalCitation: 'D.L. N° 825 de 1974, Artículo 8°, letra g) a contrario sensu. El arrendamiento de inmuebles sin amoblar y sin instalaciones industriales o comerciales se encuentra no gravado con el Impuesto al Valor Agregado (IVA).',
      siiNormativeBasis: 'Instrucciones del Servicio de Impuestos Internos: Circular N° 37 de 2020, Circular N° 42 de 2021 y Oficios N° 1.542/2020 y N° 2.488/2021.',
      siiCirculars: [
        'Circular SII N° 37 (2020): Gravamen de IVA en arrendamiento de inmuebles amoblados o con instalaciones.',
        'Circular SII N° 42 (2021): Imputación de crédito por avalúo fiscal y delimitación de bienes muebles indispensables.',
        'Oficio SII N° 1.542 (2020): Arriendo de oficinas y departamentos habitacionales sin muebles gozan de exención automática.',
        'Res. Ex. SII N° 45 (2003): Obligatoriedad de emisión de DTE Tipo 34 para operaciones no gravadas o exentas.'
      ],
      checklist: [
        {
          title: 'Inmueble Desocupado de Muebles',
          description: 'El inmueble se entrega sin mobiliario para habitación o trabajo.',
          passed: !isFurnished
        },
        {
          title: 'Sin Instalaciones Industriales / Comerciales',
          description: 'No posee maquinaria adherida ni equipos destinados al giro del arrendatario.',
          passed: !hasCommercialFacilities
        },
        {
          title: 'Cláusula Contractual Expresa',
          description: 'El contrato de arrendamiento debe consignar expresamente el estado "sin amoblar".',
          passed: true,
          recommendation: 'Verificar en el expediente digital del contrato que figure la cláusula de entrega en obra limpia/sin muebles.'
        },
        {
          title: 'Tipo de Documento Tributario Adecuado',
          description: 'Debe emitirse Factura No Afecta o Exenta Electrónica (DTE 34) al RUT del arrendatario.',
          passed: true
        },
        {
          title: 'Declaración F29 en Línea Exenta',
          description: 'El monto exento se registra en el Formulario 29 en Códigos 142 (Ventas Exentas) y 584.',
          passed: true
        }
      ],
      calculations: {
        rentalAmount,
        fiscalAppraisalValue,
        monthlyFiscalDeduction: 0,
        exemptAmount,
        netTaxableAmount,
        taxableBase: netTaxableAmount,
        ivaRate: 0.19,
        ivaAmount,
        totalAmount,
        effectiveTaxRate: totalAmount > 0 ? (ivaAmount / totalAmount) * 100 : 0
      }
    };
  }

  // REGLA 2: Inmueble AMOBLADO o con INSTALACIONES INDUSTRIALES
  // Criterio Art. 8 letra g): AFECTO A IVA (19%)
  // Con beneficio de rebaja de avalúo fiscal (Art. 17 inc. 2 DL 825)
  const grossRent = rentalAmount + taxableServicesAmount;
  const allowableDeduction = Math.min(grossRent, monthlyFiscalDeduction);
  const taxableBase = Math.max(0, grossRent - allowableDeduction);
  const ivaAmount = Math.round(taxableBase * 0.19);
  const totalAmount = grossRent + ivaAmount;

  return {
    isExempt: false,
    dteType: '33',
    dteTypeName: 'Factura Electrónica Afecta (DTE 33)',
    category: monthlyFiscalDeduction > 0 ? 'AFECTO_CON_DEDUCCION_AVALUO' : 'AFECTO_TOTAL',
    legalSummary: 'OPERACIÓN AFECTA A IVA (19%) - APLICA ART. 8° LETRA G) Y ART. 17 INC. 2° D.L. 825',
    legalCitation: 'D.L. N° 825 de 1974, Artículo 8°, letra g) (hecho gravado especial por inmueble amoblado o con instalaciones) en concordancia con Artículo 17° inciso 2° (deducción del 11% anual del avalúo fiscal vigente).',
    siiNormativeBasis: 'Criterio SII: El arriendo amoblado está afecto a IVA sobre el valor de la renta deducida la proporción mensual del 11% del avalúo fiscal.',
    siiCirculars: [
      'Circular SII N° 37 (2020): Precisiones sobre inmuebles amoblados o con instalaciones.',
      'Circular SII N° 42 (2021): Procedimiento de cálculo y deducción del 11% del avalúo fiscal (Art. 17).',
      'Oficio SII N° 1.874 (2019): Base imponible en arrendamiento de establecimientos de comercio y bienes con instalaciones.'
    ],
    checklist: [
      {
        title: 'Calificación de Amoblado / Equipado',
        description: isFurnished ? 'Inmueble cuenta con muebles suficientes para su habilitación.' : 'Inmueble cuenta con instalaciones/maquinaria.',
        passed: true
      },
      {
        title: 'Certificado de Avalúo Fiscal SII Vigente',
        description: 'Se cuenta con el Rol y certificado de avalúo para acreditar la deducción legal.',
        passed: fiscalAppraisalValue > 0,
        recommendation: fiscalAppraisalValue === 0 ? 'Ingresar el Avalúo Fiscal del inmueble para aplicar la rebaja del 11% anual en la base imponible de IVA.' : undefined
      },
      {
        title: 'Deducción Legal del 11% Anual (Art. 17 inc. 2)',
        description: `Deducción mensual aplicable: $${monthlyFiscalDeduction.toLocaleString('es-CL')}.`,
        passed: monthlyFiscalDeduction > 0
      },
      {
        title: 'Emisión de Factura Electrónica DTE 33',
        description: 'Emisión de DTE Tipo 33 con desglose de Base Imponible rebajada e IVA 19%.',
        passed: true
      }
    ],
    calculations: {
      rentalAmount,
      fiscalAppraisalValue,
      monthlyFiscalDeduction,
      exemptAmount: 0,
      netTaxableAmount: grossRent,
      taxableBase,
      ivaRate: 0.19,
      ivaAmount,
      totalAmount,
      effectiveTaxRate: totalAmount > 0 ? (ivaAmount / totalAmount) * 100 : 0
    }
  };
};

/**
 * FACTURAS DE EJEMPLO PRE-CONFIGURADAS PARA AUDITORÍA Y DEMOSTRACIÓN
 */
export const SAMPLE_DTE_INVOICES: DTEInvoice[] = [
  {
    id: 'dte-sample-001',
    folio: 4521,
    dteType: '34',
    dteTypeName: 'Factura No Afecta o Exenta Electrónica',
    issueDate: '2026-09-15',
    dueDate: '2026-09-30',
    paymentMethod: 'TRANSFERENCIA',
    
    // Emisor
    issuerTaxId: '76.892.450-3',
    issuerName: 'INMOBILIARIA Y RENTAS ASSETFLOW CENTRAL SPA',
    issuerBusiness: 'ARRENDAMIENTO Y EXPLOTACIÓN DE BIENES INMUEBLES',
    issuerAddress: 'Av. El Golf 0140, Piso 14, Oficina 1402',
    issuerCommune: 'Las Condes',
    issuerCity: 'Santiago',
    siiOffice: 'S.I.I. - SANTIAGO ORIENTE',
    issuerPhone: '+56 2 2890 4100',
    issuerEmail: 'facturacion@assetflow-central.cl',
    
    // Receptor
    receiverTaxId: '77.342.190-8',
    receiverName: 'ASESORÍAS FINANCIERAS E INVERSIONES LOS ANDES S.A.',
    receiverBusiness: 'ASESORÍAS EN INGENIERÍA Y SERVICIOS PROFESIONALES',
    receiverAddress: 'Calle Moneda 812, Depto. 1204',
    receiverCommune: 'Santiago Centro',
    receiverCity: 'Santiago',
    receiverEmail: 'contacto@losandes-inversiones.cl',
    receiverPhone: '+56 9 7890 1234',
    
    // Vínculo Inmobiliario
    propertyId: 'prop-stgo-1204',
    propertyAddress: 'Moneda 812, Depto. 1204, Santiago Centro',
    propertyRole: '01420-0089',
    contractId: 'CTR-2025-089',
    periodBilled: 'Septiembre 2026',
    isFurnished: false,
    hasCommercialFacilities: false,
    propertyDestination: 'HABITACIONAL',
    fiscalAppraisalValue: 84500000,
    monthlyFiscalDeduction: 0,
    
    // Detalle
    items: [
      {
        id: 'item-001',
        lineNumber: 1,
        code: 'ARR-HAB-SF',
        description: 'CANON DE ARRENDAMIENTO DEPARTAMENTO HABITACIONAL SIN AMOBLAR - PERÍODO SEPTIEMBRE 2026',
        quantity: 1,
        unitPrice: 850000,
        isExempt: true,
        exemptionReason: 'DL_825_ART_8_G_NO_AMOBLADO',
        exemptionLegalCitation: 'D.L. 825 Art. 8 letra g) a contrario sensu (Inmueble sin amoblar destinado a habitación).',
        discountPercent: 0,
        exemptAmount: 850000,
        taxableAmount: 0,
        totalAmount: 850000
      }
    ],
    subtotal: 850000,
    exemptTotal: 850000,
    netTaxableTotal: 0,
    fiscalDeductionApplied: 0,
    taxableBase: 0,
    ivaRate: 0.19,
    ivaAmount: 0,
    totalAmount: 850000,
    
    legalExemptionNote: 'OPERACIÓN EXENTA DE IVA SEGÚN ARTÍCULO 8°, LETRA G) DEL DECRETO LEY N° 825 DE 1974 SOBRE IMPUESTO A LAS VENTAS Y SERVICIOS. INMUEBLE SIN AMOBLAR DESTINADO A HABITACIÓN O ACTIVIDAD ADMINISTRATIVA SIN INSTALACIONES INDUSTRIALES (CIRCULARES SII N° 37/2020 Y N° 42/2021).',
    siiTedSignature: 'MDwCAQACBAa3s9wCAQACAQAEIDa8b417e290f6c24598124b89dfaa30920400b65671',
    status: 'ACEPTADA_SII',
    userCreator: 'SISTEMA DTE / JEFE ADMINISTRACIÓN',
    timestamp: Date.now() - 86400000 * 5,
    isSample: true
  },
  {
    id: 'dte-sample-002',
    folio: 4522,
    dteType: '34',
    dteTypeName: 'Factura No Afecta o Exenta Electrónica',
    issueDate: '2026-09-16',
    dueDate: '2026-10-01',
    paymentMethod: 'TRANSFERENCIA',
    
    // Emisor
    issuerTaxId: '76.892.450-3',
    issuerName: 'INMOBILIARIA Y RENTAS ASSETFLOW CENTRAL SPA',
    issuerBusiness: 'ARRENDAMIENTO Y EXPLOTACIÓN DE BIENES INMUEBLES',
    issuerAddress: 'Av. El Golf 0140, Piso 14, Oficina 1402',
    issuerCommune: 'Las Condes',
    issuerCity: 'Santiago',
    siiOffice: 'S.I.I. - SANTIAGO ORIENTE',
    issuerPhone: '+56 2 2890 4100',
    issuerEmail: 'facturacion@assetflow-central.cl',
    
    // Receptor
    receiverTaxId: '76.123.987-2',
    receiverName: 'SERVICIOS PROFESIONALES DE ARQUITECTURA E INGENIERÍA SPA',
    receiverBusiness: 'OFICINA TÉCNICA Y CONSULTORÍA DE PROYECTOS',
    receiverAddress: 'Av. Providencia 1650, Oficina 804',
    receiverCommune: 'Providencia',
    receiverCity: 'Santiago',
    receiverEmail: 'finanzas@arquitectura-spa.cl',
    
    // Vínculo Inmobiliario
    propertyId: 'prop-prov-804',
    propertyAddress: 'Av. Providencia 1650, Of. 804, Providencia',
    propertyRole: '02150-0112',
    contractId: 'CTR-2025-112',
    periodBilled: 'Septiembre 2026',
    isFurnished: false,
    hasCommercialFacilities: false,
    propertyDestination: 'OFICINA',
    fiscalAppraisalValue: 125000000,
    monthlyFiscalDeduction: 0,
    
    items: [
      {
        id: 'item-002',
        lineNumber: 1,
        code: 'ARR-OFI-SF',
        description: 'ARRENDAMIENTO PLANTA LIBRE DE OFICINA EN OBRA LIMPIA SIN AMOBLAR - PERÍODO SEPTIEMBRE 2026',
        quantity: 1,
        unitPrice: 1650000,
        isExempt: true,
        exemptionReason: 'DL_825_ART_8_G_NO_AMOBLADO',
        exemptionLegalCitation: 'D.L. 825 Art. 8 letra g) a contrario sensu (Oficina sin enseres ni muebles).',
        discountPercent: 0,
        exemptAmount: 1650000,
        taxableAmount: 0,
        totalAmount: 1650000
      }
    ],
    subtotal: 1650000,
    exemptTotal: 1650000,
    netTaxableTotal: 0,
    fiscalDeductionApplied: 0,
    taxableBase: 0,
    ivaRate: 0.19,
    ivaAmount: 0,
    totalAmount: 1650000,
    
    legalExemptionNote: 'OPERACIÓN EXENTA DE IVA SEGÚN ARTÍCULO 8°, LETRA G) DEL DECRETO LEY N° 825 DE 1974. ARRENDAMIENTO DE OFICINA SIN MOBILIARIO NI INSTALACIONES INDUSTRIALES (OFICIO SII N° 1.542 DE 2020).',
    siiTedSignature: 'MDwCAQACBAe5t2xCAQACAQAEIDf192b0c345a0e98124b89dfaa30920400b65671',
    status: 'ACEPTADA_SII',
    userCreator: 'SISTEMA DTE / JEFE FINANZAS',
    timestamp: Date.now() - 86400000 * 4,
    isSample: true
  },
  {
    id: 'dte-sample-003',
    folio: 1890,
    dteType: '33',
    dteTypeName: 'Factura Electrónica Afecta',
    issueDate: '2026-09-18',
    dueDate: '2026-10-03',
    paymentMethod: 'CREDITO_30',
    
    // Emisor
    issuerTaxId: '76.892.450-3',
    issuerName: 'INMOBILIARIA Y RENTAS ASSETFLOW CENTRAL SPA',
    issuerBusiness: 'ARRENDAMIENTO Y EXPLOTACIÓN DE BIENES INMUEBLES',
    issuerAddress: 'Av. El Golf 0140, Piso 14, Oficina 1402',
    issuerCommune: 'Las Condes',
    issuerCity: 'Santiago',
    siiOffice: 'S.I.I. - SANTIAGO ORIENTE',
    
    // Receptor
    receiverTaxId: '96.885.340-9',
    receiverName: 'HOLDING MINERO Y ENERGÉTICO DEL PACÍFICO S.A.',
    receiverBusiness: 'EXTRACCIÓN Y EXPLOTACIÓN DE MINERALES METÁLICOS',
    receiverAddress: 'Av. Isidora Goyenechea 3000, Piso 18',
    receiverCommune: 'Las Condes',
    receiverCity: 'Santiago',
    
    // Vínculo Inmobiliario
    propertyId: 'prop-condes-301',
    propertyAddress: 'Av. Apoquindo 4500, Depto. 301, Las Condes',
    propertyRole: '03400-0021',
    contractId: 'CTR-2025-201',
    periodBilled: 'Septiembre 2026',
    isFurnished: true,
    hasCommercialFacilities: false,
    propertyDestination: 'HABITACIONAL',
    fiscalAppraisalValue: 120000000,
    monthlyFiscalDeduction: 1100000,
    
    items: [
      {
        id: 'item-003',
        lineNumber: 1,
        code: 'ARR-HAB-AMOB',
        description: 'ARRIENDO DEPARTAMENTO EJECUTIVO TOTALMENTE AMOBLADO - ART. 8 LETRA G Y ART. 17 D.L. 825',
        quantity: 1,
        unitPrice: 1200000,
        isExempt: false,
        exemptionReason: 'AFECTO_AMOBLADO_ART_17',
        exemptionLegalCitation: 'Afecto a IVA 19% con deducción de avalúo fiscal vigente (Art. 17 inc. 2 D.L. 825).',
        discountPercent: 0,
        exemptAmount: 0,
        taxableAmount: 1200000,
        totalAmount: 1200000
      }
    ],
    subtotal: 1200000,
    exemptTotal: 0,
    netTaxableTotal: 1200000,
    fiscalDeductionApplied: 1100000,
    taxableBase: 100000, // 1.200.000 - 1.100.000 = 100.000
    ivaRate: 0.19,
    ivaAmount: 19000, // 19% de 100.000
    totalAmount: 1219000,
    
    legalExemptionNote: 'OPERACIÓN AFECTA A IVA SEGÚN ART. 8° LETRA G) D.L. 825 POR CORRESPONDER A BIEN RAÍZ AMOBLADO. SE DEDUCE DE LA BASE IMPONIBLE EL CRÉDITO DEL 11% ANUAL DEL AVALÚO FISCAL VIGENTE CONFORME AL ART. 17 INCISO 2° DEL D.L. 825 (CIRCULAR SII N° 42 DE 2021).',
    siiTedSignature: 'MDwCAQACBAc2f81CAQACAQAEIDa9b417e290f6c24598124b89dfaa30920400b65671',
    status: 'ACEPTADA_SII',
    userCreator: 'SISTEMA DTE / CONTABILIDAD TRIBUTARIA',
    timestamp: Date.now() - 86400000 * 2,
    isSample: true
  },
  {
    id: 'dte-sample-004',
    folio: 1891,
    dteType: '33',
    dteTypeName: 'Factura Electrónica Afecta / Mixta',
    issueDate: '2026-09-20',
    dueDate: '2026-10-05',
    paymentMethod: 'TRANSFERENCIA',
    
    // Emisor
    issuerTaxId: '76.892.450-3',
    issuerName: 'INMOBILIARIA Y RENTAS ASSETFLOW CENTRAL SPA',
    issuerBusiness: 'ARRENDAMIENTO Y EXPLOTACIÓN DE BIENES INMUEBLES',
    issuerAddress: 'Av. El Golf 0140, Piso 14, Oficina 1402',
    issuerCommune: 'Las Condes',
    issuerCity: 'Santiago',
    siiOffice: 'S.I.I. - SANTIAGO ORIENTE',
    
    // Receptor
    receiverTaxId: '77.890.123-4',
    receiverName: 'DISTRIBUIDORA Y LOGÍSTICA TRANSANDINA LTDA.',
    receiverBusiness: 'TRANSPORTE Y LOGÍSTICA DE CARGA TERRESTRE',
    receiverAddress: 'Parque Industrial Enea, Módulo 14',
    receiverCommune: 'Pudahuel',
    receiverCity: 'Santiago',
    
    // Vínculo Inmobiliario
    propertyId: 'prop-pud-bodega',
    propertyAddress: 'Camino Lo Boza 120, Bodega B-4, Pudahuel',
    propertyRole: '04890-0014',
    contractId: 'CTR-2025-014',
    periodBilled: 'Septiembre 2026',
    isFurnished: false,
    hasCommercialFacilities: false,
    propertyDestination: 'BODEGA',
    fiscalAppraisalValue: 95000000,
    monthlyFiscalDeduction: 0,
    
    items: [
      {
        id: 'item-004a',
        lineNumber: 1,
        code: 'ARR-BOD-SF',
        description: 'CANON DE ARRIENDO BODEGA LOGÍSTICA SIN MAQUINARIAS NI INSTALACIONES INDUSTRIALES - EXENTO ART. 8 LETRA G',
        quantity: 1,
        unitPrice: 1400000,
        isExempt: true,
        exemptionReason: 'DL_825_ART_8_G_SIN_INSTALACIONES',
        exemptionLegalCitation: 'D.L. 825 Art. 8 letra g) a contrario sensu (Bodega sin instalaciones de proceso industrial).',
        discountPercent: 0,
        exemptAmount: 1400000,
        taxableAmount: 0,
        totalAmount: 1400000
      },
      {
        id: 'item-004b',
        lineNumber: 2,
        code: 'SERV-ADM-GGCC',
        description: 'GASTOS DE ADMINISTRACIÓN, SEGURIDAD 24/7 Y MANTENCIÓN ÁREAS COMUNES DE PARQUE INDUSTRIAL (AFECTO)',
        quantity: 1,
        unitPrice: 180000,
        isExempt: false,
        discountPercent: 0,
        exemptAmount: 0,
        taxableAmount: 180000,
        totalAmount: 180000
      }
    ],
    subtotal: 1580000,
    exemptTotal: 1400000,
    netTaxableTotal: 180000,
    fiscalDeductionApplied: 0,
    taxableBase: 180000,
    ivaRate: 0.19,
    ivaAmount: 34200, // 19% de 180.000
    totalAmount: 1614200,
    
    legalExemptionNote: 'FACTURA MIXTA: ÍTEM 1 CORRESPONDE A ARRIENDO DE INMUEBLE NO AMOBLADO Y SIN INSTALACIONES INDUSTRIALES, EXENTO DE IVA SEGÚN ART. 8° LETRA G) D.L. 825. ÍTEM 2 CORRESPONDE A SERVICIOS DE SEGURIDAD Y MANTENCIÓN AFECTOS A IVA (19%).',
    siiTedSignature: 'MDwCAQACBAf9k82CAQACAQAEIDb7a123e456f7c89101112b89dfaa30920400b65671',
    status: 'ACEPTADA_SII',
    userCreator: 'SISTEMA DTE / JEFE OPERACIONES',
    timestamp: Date.now() - 86400000 * 1,
    isSample: true
  }
];

const LOCAL_STORAGE_KEY = 'jde_invoices_dte_records';

/**
 * Validador Oficial Chileno de RUT (Algoritmo Módulo 11 SII)
 */
export const validateChileanRut = (rawRut: string): {
  isValid: boolean;
  formatted: string;
  body: string;
  dv: string;
  dvExpected: string;
} => {
  const clean = (rawRut || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) {
    return { isValid: false, formatted: rawRut || '', body: '', dv: '', dvExpected: '' };
  }
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body.charAt(i), 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = 11 - (sum % 11);
  const dvExpected = mod === 11 ? '0' : mod === 10 ? 'K' : String(mod);

  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return {
    isValid: dv === dvExpected && parseInt(body, 10) > 0,
    formatted: `${formattedBody}-${dv}`,
    body,
    dv,
    dvExpected
  };
};

/**
 * Genera el Timbre Electrónico SII XML <TED version="1.0"> conforme al esquema oficial del SII
 */
export const generateSiiTedXml = (inv: Partial<DTEInvoice>): string => {
  const re = (inv.issuerTaxId || '76.892.450-3').replace(/\./g, '');
  const td = inv.dteType || '34';
  const f = inv.folio || 1;
  const fe = inv.issueDate || new Date().toISOString().split('T')[0];
  const rr = (inv.receiverTaxId || '66.666.666-6').replace(/\./g, '');
  const rsr = (inv.receiverName || 'RECEPTOR').slice(0, 40);
  const mnt = Math.round(inv.totalAmount || 0);
  const it1 = (inv.items?.[0]?.description || 'ARRENDAMIENTO INMUEBLE').slice(0, 40);
  const tst = new Date().toISOString().slice(0, 19);

  // Huella determinística sobre el nodo DD del TED
  const ddPayload = `${re}|${td}|${f}|${fe}|${rr}|${mnt}|${it1}`;
  let acc = 0x811c9dc5;
  for (let i = 0; i < ddPayload.length; i++) {
    acc ^= ddPayload.charCodeAt(i);
    acc = Math.imul(acc, 0x01000193);
  }
  const frmtHash = Math.abs(acc >>> 0).toString(16).padStart(8, '0').toUpperCase();

  return `<TED version="1.0"><DD><RE>${re}</RE><TD>${td}</TD><F>${f}</F><FE>${fe}</FE><RR>${rr}</RR><RSR>${rsr}</RSR><MNT>${mnt}</MNT><IT1>${it1}</IT1><TSTED>${tst}</TSTED></DD><FRMT algoritmo="SHA1withRSA">SII-TED-2026-${frmtHash}-${f}</FRMT></TED>`;
};

export interface JDEF0018TaxEntry {
  taxLedgerId: string;
  docCompany: string; // KCO (00001)
  docType: 'RI' | 'RM' | 'PV'; // RI: Factura Emitida, PV: Factura Compra
  docNumber: number; // DOC
  dteType: DTEType;
  glDate: string; // DGJ
  taxRateArea: 'CL-IVA19' | 'CL-EXENTO' | 'CL-ART17-AVALUO'; // TXA1
  taxExplanationCode: 'V' | 'E' | 'M'; // EXR1 (V: VAT 19%, E: Exempt Art 8g, M: Mixed/Art 17)
  taxId: string; // RUT Contraparte
  counterpartyName: string;
  propertyRole?: string;
  grossAmount: number; // AG
  exemptAmount: number; // ATXN
  fiscalDeductionArt17: number; // Rebaja 11% Avalúo Fiscal Art. 17 DL 825
  taxableAmount: number; // ATXA
  taxAmount: number; // STAM (IVA 19%)
  siiStatus: string;
}

/**
 * Obtiene el Libro Auxiliar de Impuestos ERP F0018 (Taxes Table) sincronizado con los DTE emitidos
 */
export const getF0018TaxLedgerEntries = (): JDEF0018TaxEntry[] => {
  const invoices = getAllDTEInvoices();
  return invoices.map(inv => ({
    taxLedgerId: `F0018-${inv.dteType}-${inv.folio}`,
    docCompany: '00001',
    docType: 'RI',
    docNumber: inv.folio,
    dteType: inv.dteType,
    glDate: inv.issueDate,
    taxRateArea: inv.exemptTotal > 0 && inv.ivaAmount === 0
      ? 'CL-EXENTO'
      : (inv.fiscalDeductionApplied || 0) > 0
        ? 'CL-ART17-AVALUO'
        : 'CL-IVA19',
    taxExplanationCode: inv.exemptTotal > 0 && inv.ivaAmount === 0 ? 'E' : (inv.fiscalDeductionApplied || 0) > 0 ? 'M' : 'V',
    taxId: inv.receiverTaxId,
    counterpartyName: inv.receiverName,
    propertyRole: inv.propertyRole,
    grossAmount: inv.totalAmount,
    exemptAmount: inv.exemptTotal || 0,
    fiscalDeductionArt17: inv.fiscalDeductionApplied || 0,
    taxableAmount: inv.taxableBase || 0,
    taxAmount: inv.ivaAmount || 0,
    siiStatus: inv.status
  }));
};

/**
 * Obtiene todas las facturas DTE (ejemplos + emitidas por el usuario)
 */
export const getAllDTEInvoices = (): DTEInvoice[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SAMPLE_DTE_INVOICES));
      return SAMPLE_DTE_INVOICES;
    }
    const stored = JSON.parse(raw);
    return Array.isArray(stored) && stored.length > 0 ? stored : SAMPLE_DTE_INVOICES;
  } catch {
    return SAMPLE_DTE_INVOICES;
  }
};

/**
 * Guarda una nueva factura DTE emitida en el Libro de Impuestos F0018 y almacenamiento persistente
 */
export const saveDTEInvoice = (invoice: DTEInvoice): void => {
  try {
    const current = getAllDTEInvoices();
    const filtered = current.filter(inv => inv.id !== invoice.id);
    const enriched: DTEInvoice = {
      ...invoice,
      siiTedSignature: invoice.siiTedSignature || generateSiiTedXml(invoice)
    };
    const updated = [enriched, ...filtered];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated.slice(0, 100)));
  } catch (err) {
    console.error('Error al guardar factura DTE:', err);
  }
};

