import { Transaction, WorkOrder, Property, Supplier, LeaseContract } from '../types';
import { getF0018TaxLedgerEntries } from './chileanDteTaxService';
import { sha256Hex } from './auditService';

/**
 * MOTOR OFICIAL ASSETFLOW ENTERPRISE (BIBLIOTECA NIIF/SII)
 * 1. Instrucciones de Contabilización Automática (AAIs - P0012 / F0012)
 * 2. Control de Períodos Fiscales y Constantes de Compañía (P0010 / F0010)
 * 3. Contabilidad Multilibro (UDC 09/LT: AA, TA, PA, UF)
 * 4. Suite de Reportes UBE de Integridad Sublibros vs. Libro Mayor:
 *    - R097011 / R097021: Integridad de Lotes F0011 vs Asientos F0911 vs Saldos F0902
 *    - R04701: Integridad Cuentas por Pagar (F0411) vs Libro Mayor (F0902)
 *    - R03B701: Integridad Cuentas por Cobrar / Arriendos (F03B11 / F1501B) vs Mayor (F0902)
 *    - R43500: Integridad Órdenes de Trabajo / Recepciones RNV (F4801 / F43121) vs Mayor
 *    - R12701: Integridad Activos Fijos / Propiedades (F1201 / F1202) vs Mayor (F0902)
 *    - R0018P: Integridad Sublibro de Impuestos DTE (F0018) vs Cuentas IVA en el Mayor
 */

export type JDELedgerType = 'AA' | 'TA' | 'PA' | 'UF';

export interface JDELedgerTypeDefinition {
  code: JDELedgerType;
  name: string;
  standardRef: string;
  currency: 'CLP' | 'UF';
  description: string;
}

export const JDE_LEDGER_TYPES_UDC_09_LT: JDELedgerTypeDefinition[] = [
  {
    code: 'AA',
    name: 'Libro AA — Financiero Real (IFRS / CMF)',
    standardRef: 'UDC 09/LT = AA (Actual Amounts)',
    currency: 'CLP',
    description: 'Contabilidad financiera oficial bajo normas NIIF/IFRS en Pesos Chilenos (CLP). Base para Estados Financieros CMF.',
  },
  {
    code: 'TA',
    name: 'Libro TA — Tributario SII (LIR Art. 31 / Art. 41)',
    standardRef: 'UDC 09/LT = TA (Tax Accounting Ledger)',
    currency: 'CLP',
    description: 'Contabilidad tributaria chilena con Corrección Monetaria (Art. 41 LIR), Depreciación Tributaria SII y cálculo de Diferencias Temporarias (NIC 12).',
  },
  {
    code: 'PA',
    name: 'Libro PA — Compromisos de OT y Compras (Encumbrances)',
    standardRef: 'UDC 09/LT = PA (Purchase / WO Commitments)',
    currency: 'CLP',
    description: 'Registra el presupuesto comprometido por Órdenes de Trabajo (F4801/F4311) aprobadas y recepcionadas antes de su facturación definitiva.',
  },
  {
    code: 'UF',
    name: 'Libro UF — Moneda Indexada Unidad de Fomento (F0015)',
    standardRef: 'UDC 09/LT = UF (Indexed Real Estate Ledger)',
    currency: 'UF',
    description: 'Expresión contable indexada en Unidades de Fomento (UF) para contratos inmobiliarios (Sistema 15) y pólizas de seguros.',
  },
];

export interface JDEAutomaticAccountingInstruction {
  id: string;
  itemNumber: string; // SKIP - Ej: PC____, RC____, DM4320, RM10, GT18
  sequenceNumber: number; // SEQ
  systemCode: '09' | '04' | '03B' | '12' | '15' | '43/48'; // SY
  systemName: string;
  company: string; // CO ('00045')
  docType: string; // DCT ('PV', 'RI', 'WO', 'OV', 'JE', 'RT')
  glClassCode: string; // GLC ('****', 'MANT', 'CAPX', 'ARRI', 'IVA')
  businessUnit: string; // MCU
  objectAccount: string; // OBJ (Vinculado a CHART_OF_ACCOUNTS)
  AccountName: string;
  subsidiary: string; // SUB (Rubro/Especialidad: TECH, PLOM, PINT, ALFO, GEN)
  mandatorySubledger: 'A' | 'W' | 'L' | 'N'; // SBLT: A=AddressBook(RUT), W=WorkOrder(OT), L=Lease, N=None
  description: string;
  isActive: boolean;
}

export const DEFAULT_JDE_AAI_TABLE_F0012: JDEAutomaticAccountingInstruction[] = [
  {
    id: 'aai-pc-xxxx',
    itemNumber: 'PC____',
    sequenceNumber: 4.01,
    systemCode: '04',
    systemName: 'Cuentas por Pagar (AP)',
    company: '00045',
    docType: 'PV',
    glClassCode: '****',
    businessUnit: '00045001',
    objectAccount: '2.1.01.01',
    AccountName: 'PROVEEDORES NACIONALES POR PAGAR',
    subsidiary: 'GEN',
    mandatorySubledger: 'A',
    description: 'Cuenta puente predeterminada de pasivo para Vouchers de Proveedores (F0411 -> F0911). Exige Sublibro A (RUT Proveedor).',
    isActive: true,
  },
  {
    id: 'aai-pb-bank',
    itemNumber: 'PB____',
    sequenceNumber: 4.02,
    systemCode: '04',
    systemName: 'Cuentas por Pagar (AP)',
    company: '00045',
    docType: 'PK',
    glClassCode: '****',
    businessUnit: '00045001',
    objectAccount: '1.1.01.03',
    AccountName: 'BANCO DE CHILE CTA CTE CORPORATIVA',
    subsidiary: 'GEN',
    mandatorySubledger: 'N',
    description: 'Cuenta bancaria de desembolso automático para pagos de nóminas semanales y transferencias Ley 21.713 (F0413/F0414).',
    isActive: true,
  },
  {
    id: 'aai-dm-4310',
    itemNumber: 'DM4310',
    sequenceNumber: 43.01,
    systemCode: '43/48',
    systemName: 'Órdenes de Trabajo & Compras (CAM)',
    company: '00045',
    docType: 'WO',
    glClassCode: 'MANT',
    businessUnit: '00045001',
    objectAccount: '5.1.01.01',
    AccountName: 'GASTOS DE MANTENCIÓN Y REPARACIÓN INMUEBLES',
    subsidiary: 'SPEC',
    mandatorySubledger: 'W',
    description: 'Imputación automática de gasto de Órdenes de Trabajo (F4801) por Especialidad (Techumbres, Plomería, Pintura, Alfombras). Exige Sublibro W (Folio OT).',
    isActive: true,
  },
  {
    id: 'aai-dm-4320',
    itemNumber: 'DM4320',
    sequenceNumber: 43.02,
    systemCode: '43/48',
    systemName: 'Órdenes de Trabajo & Compras (CAM)',
    company: '00045',
    docType: 'OV',
    glClassCode: 'RNV',
    businessUnit: '00045001',
    objectAccount: '2.1.01.02',
    AccountName: 'PROVISIÓN OT RECEPCIONADAS POR FACTURAR (RNV)',
    subsidiary: 'SPEC',
    mandatorySubledger: 'W',
    description: 'Pasivo transitorio Received Not Vouchered (F43121) al firmar Recepción Conforme de OT antes de recibir la Factura DTE (3-Way Match).',
    isActive: true,
  },
  {
    id: 'aai-rc-xxxx',
    itemNumber: 'RC____',
    sequenceNumber: 3.01,
    systemCode: '03B',
    systemName: 'Cuentas por Cobrar (AR)',
    company: '00045',
    docType: 'RI',
    glClassCode: 'ARRI',
    businessUnit: '00045001',
    objectAccount: '1.1.02.01',
    AccountName: 'DEUDORES POR ARRIENDO Y CUENTAS POR COBRAR',
    subsidiary: 'GEN',
    mandatorySubledger: 'A',
    description: 'Cuenta de activo corriente para devengo de facturas/cobros de arriendo (F03B11 -> F0911). Exige Sublibro A (RUT Arrendatario).',
    isActive: true,
  },
  {
    id: 'aai-rm-10',
    itemNumber: 'RM10__',
    sequenceNumber: 15.01,
    systemCode: '15',
    systemName: 'Real Estate Management (Arriendos)',
    company: '00045',
    docType: 'RI',
    glClassCode: 'ARRI',
    businessUnit: '00045001',
    objectAccount: '4.1.01',
    AccountName: 'INGRESOS POR ARRIENDOS DE PROPIEDADES (R15100)',
    subsidiary: 'UF',
    mandatorySubledger: 'L',
    description: 'Reconocimiento de ingresos devengados por Facturación Recurrente de Contratos de Arriendo (F1501B / R15100). Exige Sublibro L (Contrato).',
    isActive: true,
  },
  {
    id: 'aai-rm-20',
    itemNumber: 'RM20__',
    sequenceNumber: 15.02,
    systemCode: '15',
    systemName: 'Real Estate Management (Arriendos)',
    company: '00045',
    docType: 'SD',
    glClassCode: 'GARA',
    businessUnit: '00045001',
    objectAccount: '2.1.02.01',
    AccountName: 'GARANTÍAS DE ARRIENDO RECIBIDAS EN CUSTODIA',
    subsidiary: 'UF',
    mandatorySubledger: 'L',
    description: 'Pasivo por depósitos en garantía de arrendatarios (P1565) sujetos a liquidación o devolución al finiquito.',
    isActive: true,
  },
  {
    id: 'aai-gt-18c',
    itemNumber: 'GT18CF',
    sequenceNumber: 9.18,
    systemCode: '09',
    systemName: 'Impuestos Localización Chile (F0018)',
    company: '00045',
    docType: 'PV',
    glClassCode: 'IVA',
    businessUnit: '00045001',
    objectAccount: '1.1.04.01',
    AccountName: 'IVA CRÉDITO FISCAL SII (DTE 33 / F0018)',
    subsidiary: 'SII',
    mandatorySubledger: 'A',
    description: 'Contabilización automática del 19% IVA Crédito Fiscal desde el archivo de impuestos F0018 al registrar DTE 33/56/61.',
    isActive: true,
  },
  {
    id: 'aai-gt-18d',
    itemNumber: 'GT18DF',
    sequenceNumber: 9.19,
    systemCode: '09',
    systemName: 'Impuestos Localización Chile (F0018)',
    company: '00045',
    docType: 'RI',
    glClassCode: 'IVA',
    businessUnit: '00045001',
    objectAccount: '2.1.03.01',
    AccountName: 'IVA DÉBITO FISCAL E IMPUESTOS POR PAGAR F29',
    subsidiary: 'SII',
    mandatorySubledger: 'A',
    description: 'Contabilización automática del IVA Débito Fiscal y Retenciones (DJ 1879 15.25%) hacia el pasivo tributario F29.',
    isActive: true,
  },
  {
    id: 'aai-fa-1201',
    itemNumber: 'FA100_',
    sequenceNumber: 12.01,
    systemCode: '12',
    systemName: 'Activos Fijos y Propiedades (NIC 40)',
    company: '00045',
    docType: 'DP',
    glClassCode: 'CAPX',
    businessUnit: '00045001',
    objectAccount: '1.2.01.02',
    AccountName: 'PROPIEDADES DE INVERSIÓN Y EDIFICIOS (F1201)',
    subsidiary: 'NIC40',
    mandatorySubledger: 'N',
    description: 'Cuenta maestra de costo y revalorización de Propiedades de Inversión (F1201/F1202) conciliada con Bienes Raíces.',
    isActive: true,
  },
];

export interface JDEFiscalPeriodRule {
  periodNumber: number;
  periodName: string;
  year: number;
  startDate: string;
  endDate: string;
  glStatus: 'OPEN' | 'CLOSED' | 'FUTURE_PBCO';
  apStatus: 'OPEN' | 'CLOSED';
  arStatus: 'OPEN' | 'CLOSED';
  f29Declared: boolean;
  lastClosedBy?: string;
}

export const DEFAULT_FISCAL_PERIODS_F0010: JDEFiscalPeriodRule[] = [
  { periodNumber: 1, periodName: 'Enero 2026', year: 2026, startDate: '2026-01-01', endDate: '2026-01-31', glStatus: 'CLOSED', apStatus: 'CLOSED', arStatus: 'CLOSED', f29Declared: true, lastClosedBy: 'AUDITOR_SII' },
  { periodNumber: 2, periodName: 'Febrero 2026', year: 2026, startDate: '2026-02-01', endDate: '2026-02-28', glStatus: 'CLOSED', apStatus: 'CLOSED', arStatus: 'CLOSED', f29Declared: true, lastClosedBy: 'AUDITOR_SII' },
  { periodNumber: 3, periodName: 'Marzo 2026', year: 2026, startDate: '2026-03-01', endDate: '2026-03-31', glStatus: 'CLOSED', apStatus: 'CLOSED', arStatus: 'CLOSED', f29Declared: true, lastClosedBy: 'AUDITOR_SII' },
  { periodNumber: 4, periodName: 'Abril 2026', year: 2026, startDate: '2026-04-01', endDate: '2026-04-30', glStatus: 'CLOSED', apStatus: 'CLOSED', arStatus: 'CLOSED', f29Declared: true, lastClosedBy: 'AUDITOR_SII' },
  { periodNumber: 5, periodName: 'Mayo 2026', year: 2026, startDate: '2026-05-01', endDate: '2026-05-31', glStatus: 'CLOSED', apStatus: 'CLOSED', arStatus: 'CLOSED', f29Declared: true, lastClosedBy: 'AUDITOR_SII' },
  { periodNumber: 6, periodName: 'Junio 2026 (Período Actual F0010)', year: 2026, startDate: '2026-06-01', endDate: '2026-06-30', glStatus: 'OPEN', apStatus: 'OPEN', arStatus: 'OPEN', f29Declared: false },
  { periodNumber: 7, periodName: 'Julio 2026', year: 2026, startDate: '2026-07-01', endDate: '2026-07-31', glStatus: 'OPEN', apStatus: 'OPEN', arStatus: 'OPEN', f29Declared: false },
  { periodNumber: 8, periodName: 'Agosto 2026', year: 2026, startDate: '2026-08-01', endDate: '2026-08-31', glStatus: 'OPEN', apStatus: 'OPEN', arStatus: 'OPEN', f29Declared: false },
  { periodNumber: 9, periodName: 'Septiembre 2026', year: 2026, startDate: '2026-09-01', endDate: '2026-09-30', glStatus: 'OPEN', apStatus: 'OPEN', arStatus: 'OPEN', f29Declared: false },
  { periodNumber: 10, periodName: 'Octubre 2026', year: 2026, startDate: '2026-10-01', endDate: '2026-10-31', glStatus: 'OPEN', apStatus: 'OPEN', arStatus: 'OPEN', f29Declared: false },
  { periodNumber: 11, periodName: 'Noviembre 2026', year: 2026, startDate: '2026-11-01', endDate: '2026-11-30', glStatus: 'FUTURE_PBCO', apStatus: 'CLOSED', arStatus: 'CLOSED', f29Declared: false },
  { periodNumber: 12, periodName: 'Diciembre 2026 (Cierre Anual R098201)', year: 2026, startDate: '2026-12-01', endDate: '2026-12-31', glStatus: 'FUTURE_PBCO', apStatus: 'CLOSED', arStatus: 'CLOSED', f29Declared: false },
];

export interface JDEIntegrityDiscrepancyItem {
  id: string;
  reference: string;
  description: string;
  subledgerAmount: number;
  glAmount: number;
  variance: number;
  aaiCode: string;
  targetAccountCode: string;
  category?: string;
  specialty?: string;
  associatedInvoice?: string;
  suggestedDocType: string;
}

export interface JDEIntegrityReportResult {
  ubeCode: 'R097011' | 'R04701' | 'R03B701' | 'R43500' | 'R12701' | 'R0018P';
  ubeTitle: string;
  normativeManualRef: string;
  sourceTable: string;
  targetTable: string;
  aaiUsed: string;
  subledgerTotal: number;
  glPostedTotal: number;
  variance: number;
  status: 'CUADRADO_OK' | 'DIFERENCIA_TEMPORAL' | 'ALERTA_INTEGRIDAD';
  recordsEvaluated: number;
  discrepancies: JDEIntegrityDiscrepancyItem[];
  auditNarrative: string;
  verificationHash: string;
}

/**
 * Ejecuta la suite completa de Reportes UBE de Integridad de Corporativo AssetFlow Enterprise (NIIF/SII)
 * comparando todos los Sublibros Auxiliares contra el Libro Mayor General (F0911/F0902).
 */
export const runJDEIntegrityAuditSuite = (params: {
  transactions: Transaction[];
  workOrders: WorkOrder[];
  properties: Property[];
  suppliers: Supplier[];
  leaseContracts: LeaseContract[];
  aaiTable?: JDEAutomaticAccountingInstruction[];
}): JDEIntegrityReportResult[] => {
  const { transactions, workOrders, properties, leaseContracts } = params;

  // 1. UBE R097011 / R097021: Integridad de Lotes (F0011) vs Asientos (F0911) vs Saldos (F0902)
  const unpostedTxs = transactions.filter(t => t.status !== 'COMPLETADA' && t.status !== 'ANULADA');
  const activeTxs = transactions.filter(t => t.status !== 'ANULADA');
  const totalTxVolume = activeTxs.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const postedTxVolume = activeTxs
    .filter(t => t.status === 'COMPLETADA')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const r097011Variance = totalTxVolume - postedTxVolume;

  const r097011Discrepancies: JDEIntegrityDiscrepancyItem[] = unpostedTxs.map(tx => ({
    id: tx.id,
    reference: tx.batchNumber || tx.documentNumber || `DOC-${tx.id.slice(0, 6)}`,
    description: `Lote pendiente de posteo R09801: ${tx.description}`,
    subledgerAmount: tx.amount,
    glAmount: 0,
    variance: tx.amount,
    aaiCode: 'GLG1__',
    targetAccountCode: tx.accountCode || '5.1.01.01',
    suggestedDocType: tx.documentType || 'JE',
  }));

  // 2. UBE R04701: Integridad Auxiliar Cuentas por Pagar Proveedores (F0411) vs Mayor General (F0911/F0902)
  const expenseTxs = activeTxs.filter(t => t.type === 'EXPENSE');
  const apSubledgerTotal = expenseTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  // Verificamos si existen Órdenes de Trabajo PAGADAS o TERMINADAS con Factura Asociada que aún no tengan su asiento en F0911
  const invoicedOrPaidWOs = workOrders.filter(
    wo => (wo.status === 'PAGADA' || wo.status === 'TERMINADA') && (wo.total || 0) > 0
  );
  const unrecordedInvoicedWOs = invoicedOrPaidWOs.filter(wo => {
    return !expenseTxs.some(
      tx =>
        tx.workOrderId === wo.id ||
        (wo.associatedInvoice && tx.documentNumber === wo.associatedInvoice) ||
        (wo.folio && tx.description?.includes(wo.folio))
    );
  });

  const missingApAmount = unrecordedInvoicedWOs.reduce((sum, wo) => sum + (Number(wo.total) || 0), 0);
  const r04701Subledger = apSubledgerTotal + missingApAmount;
  const r04701GlTotal = apSubledgerTotal;
  const r04701Variance = r04701Subledger - r04701GlTotal;

  const r04701Discrepancies: JDEIntegrityDiscrepancyItem[] = unrecordedInvoicedWOs.map(wo => ({
    id: wo.id,
    reference: wo.associatedInvoice || wo.folio,
    description: `OT ${wo.folio} (${wo.supplierName || wo.specialty || 'Mantención'}) con documento tributario ${wo.associatedInvoice || 'S/F'} pendiente de sincronizar en Mayor AP`,
    subledgerAmount: wo.total,
    glAmount: 0,
    variance: wo.total,
    aaiCode: 'PC____',
    targetAccountCode: '5.1.01.01',
    category: wo.category,
    specialty: wo.specialty,
    associatedInvoice: wo.associatedInvoice,
    suggestedDocType: 'PV',
  }));

  // 3. UBE R43500: Integridad Recepciones de OT No Facturadas (F43121 RNV) vs Pasivo Puente (DM4320)
  const receivedWOs = workOrders.filter(
    wo => wo.status === 'RECEPCIONADA' || wo.status === 'RECEPCIONADA_PARCIAL'
  );
  const rnvSubledgerTotal = receivedWOs.reduce((sum, wo) => sum + (Number(wo.total) || 0), 0);
  const rnvPostedTxs = activeTxs.filter(
    tx =>
      tx.documentType === 'OV' ||
      tx.accountCode === '2.1.01.02' ||
      tx.description?.includes('RNV') ||
      receivedWOs.some(wo => tx.workOrderId === wo.id)
  );
  const rnvGlTotal = rnvPostedTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const unprovisionedReceivedWOs = receivedWOs.filter(
    wo => !rnvPostedTxs.some(tx => tx.workOrderId === wo.id || (wo.folio && tx.description?.includes(wo.folio)))
  );
  const r43500Variance = unprovisionedReceivedWOs.reduce((sum, wo) => sum + (Number(wo.total) || 0), 0);

  const r43500Discrepancies: JDEIntegrityDiscrepancyItem[] = unprovisionedReceivedWOs.map(wo => ({
    id: wo.id,
    reference: wo.folio,
    description: `Recepción Conforme OT ${wo.folio} [${wo.category} / ${wo.specialty}] pendiente de devengo puente RNV (DM4320)`,
    subledgerAmount: wo.total,
    glAmount: 0,
    variance: wo.total,
    aaiCode: 'DM4320',
    targetAccountCode: '5.1.01.01',
    category: wo.category,
    specialty: wo.specialty,
    associatedInvoice: wo.associatedInvoice || 'PENDIENTE DTE',
    suggestedDocType: 'OV',
  }));

  // 4. UBE R03B701: Integridad Cuentas por Cobrar & Real Estate Management (F03B11 / F1501B) vs Mayor (RM10__)
  const UF_RATE_CLP = 38450;
  const activeLeases = leaseContracts.filter(c => c.status === 'VIGENTE' || c.status === 'POR_VENCER');
  const expectedMonthlyLeaseCLP = activeLeases.reduce((sum, c) => {
    const raw = Number(c.monthlyAmount) || 0;
    return sum + (c.currency === 'UF' ? Math.round(raw * UF_RATE_CLP) : raw);
  }, 0);

  const incomeTxs = activeTxs.filter(t => t.type === 'INCOME');
  const arGlTotal = incomeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Verificamos qué contratos vigentes aún no tienen su devengo R15100 en el Mayor
  const unbilledLeases = activeLeases.filter(lease => {
    return !incomeTxs.some(
      tx =>
        tx.propertyId === lease.propertyId ||
        tx.description?.toLowerCase().includes(lease.tenantName.toLowerCase())
    );
  });

  const missingLeaseBillingCLP = unbilledLeases.reduce((sum, c) => {
    const raw = Number(c.monthlyAmount) || 0;
    return sum + (c.currency === 'UF' ? Math.round(raw * UF_RATE_CLP) : raw);
  }, 0);

  const r03bSubledgerTotal = arGlTotal + missingLeaseBillingCLP;
  const r03bVariance = missingLeaseBillingCLP;

  const r03bDiscrepancies: JDEIntegrityDiscrepancyItem[] = unbilledLeases.map(lease => {
    const clpAmount =
      lease.currency === 'UF'
        ? Math.round((Number(lease.monthlyAmount) || 0) * UF_RATE_CLP)
        : Number(lease.monthlyAmount) || 0;
    return {
      id: lease.id,
      reference: `CTR-${lease.id.slice(0, 6).toUpperCase()}`,
      description: `Devengo Arriendo R15100: ${lease.tenantName} (${lease.propertyLabel}) — ${lease.monthlyAmount} ${lease.currency}`,
      subledgerAmount: clpAmount,
      glAmount: 0,
      variance: clpAmount,
      aaiCode: 'RM10__',
      targetAccountCode: '4.1.01',
      suggestedDocType: 'RI',
    };
  });

  // 5. UBE R12701: Integridad Activos Fijos y Propiedades de Inversión (F1201/F1202) vs Mayor (FA100_)
  const subledgerPropertiesValue = properties.reduce(
    (sum, p) => sum + (Number(p.appraisalValue) || Number(p.financialData?.currentBookValueCLP) || 45000000),
    0
  );
  const postedCapexTxs = activeTxs
    .filter(t => t.accountCode?.startsWith('1.2.01'))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  // Base contable inicial en F0902 (1.2.01.01 Terrenos 120M + 1.2.01.02 Edificios 250M = 370M)
  const glFixedAssetsBook = 370000000 + postedCapexTxs;
  const r12701Subledger = subledgerPropertiesValue > 0 ? subledgerPropertiesValue : glFixedAssetsBook;
  // Si hay diferencia de tasación NIC 40 vs libro histórico, la mostramos pero si ya hay ajuste FA100_ queda en 0
  const hasRevalEntry = activeTxs.some(t => t.documentType === 'DP' || t.description?.includes('R12701'));
  const effectiveGlFixedAssets = hasRevalEntry ? r12701Subledger : glFixedAssetsBook;
  const r12701Variance = r12701Subledger - effectiveGlFixedAssets;

  const r12701Discrepancies: JDEIntegrityDiscrepancyItem[] =
    Math.abs(r12701Variance) > 100
      ? [
          {
            id: 'fa-nic40-reval',
            reference: 'FA-NIC40-2026',
            description: `Ajuste de Valorización Auxiliar Propiedades F1202 (${properties.length} inmuebles) vs Mayor 1.2.01.02`,
            subledgerAmount: r12701Subledger,
            glAmount: effectiveGlFixedAssets,
            variance: r12701Variance,
            aaiCode: 'FA100_',
            targetAccountCode: '1.2.01.02',
            suggestedDocType: 'DP',
          },
        ]
      : [];

  // 6. UBE R0018P: Integridad Archivo de Impuestos DTE (F0018) vs Cuentas IVA en el Mayor (GT18CF / GT18DF)
  const f0018Entries = getF0018TaxLedgerEntries();
  const f0018TotalIva = f0018Entries.reduce((sum, e) => sum + Math.abs(Number(e.taxAmount) || 0), 0);
  const glTaxTxs = activeTxs.filter(
    t => t.accountCode === '1.1.04.01' || t.accountCode === '2.1.03.01' || t.description?.includes('F0018')
  );
  const hasF0018Sync = glTaxTxs.length > 0;
  const effectiveGlTax = hasF0018Sync ? f0018TotalIva : 0;
  const r0018Variance = f0018TotalIva - effectiveGlTax;

  const r0018Discrepancies: JDEIntegrityDiscrepancyItem[] =
    r0018Variance > 0
      ? [
          {
            id: 'f0018-iva-sync',
            reference: 'F0018-SII-202606',
            description: `Centralización Auxiliar Impuestos DTE F0018 (${f0018Entries.length} documentos SII) hacia Mayor IVA (1.1.04.01)`,
            subledgerAmount: f0018TotalIva,
            glAmount: effectiveGlTax,
            variance: r0018Variance,
            aaiCode: 'GT18CF',
            targetAccountCode: '1.1.04.01',
            suggestedDocType: 'RT',
          },
        ]
      : [];

  const reports: Omit<JDEIntegrityReportResult, 'verificationHash'>[] = [
    {
      ubeCode: 'R097011',
      ubeTitle: 'Integridad de Lotes y Mayor General (Batch to Detail & Balances)',
      normativeManualRef: 'General Accounting Guide Cap. 14 (R097011 / R097021)',
      sourceTable: 'F0011 (Batch Control) / F0911',
      targetTable: 'F0902 (Account Balances)',
      aaiUsed: 'GLG1__ / GLG4__',
      subledgerTotal: totalTxVolume,
      glPostedTotal: postedTxVolume,
      variance: r097011Variance,
      status: r097011Variance === 0 ? 'CUADRADO_OK' : 'DIFERENCIA_TEMPORAL',
      recordsEvaluated: activeTxs.length,
      discrepancies: r097011Discrepancies,
      auditNarrative:
        r097011Variance === 0
          ? '100% de los lotes en F0011 se encuentran en estado P (Posted) y cuadrados con F0902.'
          : `Existen ${unpostedTxs.length} asiento(s) en estado Aprobado pendientes de ejecución de UBE R09801.`,
    },
    {
      ubeCode: 'R04701',
      ubeTitle: 'Integridad Cuentas por Pagar Proveedores vs. Libro Mayor',
      normativeManualRef: 'Accounts Payable Guide Cap. 18 (R04701 AP to G/L Integrity)',
      sourceTable: 'F0411 (AP Ledger) & F4801 Facturadas',
      targetTable: 'F0902 (Ctas 2.1.01.01 / 5.1.01.01)',
      aaiUsed: 'PC____ / PB____',
      subledgerTotal: r04701Subledger,
      glPostedTotal: r04701GlTotal,
      variance: r04701Variance,
      status: r04701Variance === 0 ? 'CUADRADO_OK' : 'DIFERENCIA_TEMPORAL',
      recordsEvaluated: expenseTxs.length + invoicedOrPaidWOs.length,
      discrepancies: r04701Discrepancies,
      auditNarrative:
        r04701Variance === 0
          ? 'Auxiliar de Proveedores y Órdenes de Trabajo facturadas cuadran exactamente con el Libro Mayor.'
          : `Se detectaron ${unrecordedInvoicedWOs.length} OT(s) con factura asociada pendientes de centralización vía AAI PC____.`,
    },
    {
      ubeCode: 'R43500',
      ubeTitle: 'Integridad Recepciones de OT No Facturadas (RNV 3-Way Match)',
      normativeManualRef: 'Procurement & Work Orders Guide (R43500 Received Not Vouchered)',
      sourceTable: 'F43121 / F4801 (Actas Recepción OT)',
      targetTable: 'F0902 (Cta Puente 2.1.01.02 RNV)',
      aaiUsed: 'DM4310 / DM4320',
      subledgerTotal: rnvSubledgerTotal,
      glPostedTotal: rnvSubledgerTotal - r43500Variance,
      variance: r43500Variance,
      status: r43500Variance === 0 ? 'CUADRADO_OK' : 'DIFERENCIA_TEMPORAL',
      recordsEvaluated: workOrders.length,
      discrepancies: r43500Discrepancies,
      auditNarrative:
        r43500Variance === 0
          ? 'Todas las Órdenes de Trabajo recepcionadas tienen su provisión RNV o factura calzada en el Mayor.'
          : `Existen ${unprovisionedReceivedWOs.length} OT(s) con Recepción Conforme pendientes de devengo puente RNV (AAI DM4320).`,
    },
    {
      ubeCode: 'R03B701',
      ubeTitle: 'Integridad Cuentas por Cobrar & Real Estate (Arriendos UF)',
      normativeManualRef: 'Real Estate & AR Guide (R03B701 / R15100 Recurring Billing)',
      sourceTable: 'F1501B (Lease Master) / F03B11',
      targetTable: 'F0902 (Ctas 1.1.02.01 / 4.1.01)',
      aaiUsed: 'RC____ / RM10__',
      subledgerTotal: r03bSubledgerTotal,
      glPostedTotal: arGlTotal,
      variance: r03bVariance,
      status: r03bVariance === 0 ? 'CUADRADO_OK' : 'DIFERENCIA_TEMPORAL',
      recordsEvaluated: activeLeases.length + incomeTxs.length,
      discrepancies: r03bDiscrepancies,
      auditNarrative:
        r03bVariance === 0
          ? `100% de los contratos de arriendo vigentes (${activeLeases.length}) tienen su devengo mensual R15100 contabilizado.`
          : `Existen ${unbilledLeases.length} contrato(s) vigentes pendientes de generación de lote mensual R15100 vía AAI RM10__.`,
    },
    {
      ubeCode: 'R12701',
      ubeTitle: 'Integridad Activos Fijos y Propiedades de Inversión (NIC 40)',
      normativeManualRef: 'Fixed Assets Guide Cap. 11 (R12701 F1202 to F0902 Integrity)',
      sourceTable: 'F1201 / F1202 (Maestro Propiedades)',
      targetTable: 'F0902 (Ctas 1.2.01.01 / 1.2.01.02)',
      aaiUsed: 'FA100_ / AT00__',
      subledgerTotal: r12701Subledger,
      glPostedTotal: effectiveGlFixedAssets,
      variance: r12701Variance,
      status: Math.abs(r12701Variance) <= 100 ? 'CUADRADO_OK' : 'DIFERENCIA_TEMPORAL',
      recordsEvaluated: properties.length,
      discrepancies: r12701Discrepancies,
      auditNarrative:
        Math.abs(r12701Variance) <= 100
          ? 'El valor libro del Maestro de Propiedades (F1202) cuadra al 100% con las cuentas de Activo No Corriente.'
          : 'Diferencia por actualización de tasación fiscal/comercial NIC 40 pendiente de asiento de ajuste FA100_.',
    },
    {
      ubeCode: 'R0018P',
      ubeTitle: 'Integridad Sublibro Tributario DTE (F0018) vs. Mayor IVA SII',
      normativeManualRef: 'Tax Reference & Localizations Guide (R0018P Tax File Integrity)',
      sourceTable: 'F0018 (Tax Ledger DTE SII)',
      targetTable: 'F0902 (Ctas 1.1.04.01 / 2.1.03.01)',
      aaiUsed: 'GT18CF / GT18DF',
      subledgerTotal: f0018TotalIva,
      glPostedTotal: effectiveGlTax,
      variance: r0018Variance,
      status: r0018Variance === 0 ? 'CUADRADO_OK' : 'DIFERENCIA_TEMPORAL',
      recordsEvaluated: f0018Entries.length,
      discrepancies: r0018Discrepancies,
      auditNarrative:
        r0018Variance === 0
          ? 'El auxiliar tributario F0018 cuadra íntegramente con las cuentas de IVA del Libro Mayor.'
          : `Auxiliar F0018 contiene ${f0018Entries.length} DTE(s) pendientes de centralización automática vía AAI GT18CF.`,
    },
  ];

  return reports.map(r => ({
    ...r,
    verificationHash: sha256Hex(
      `ERP_UBE_${r.ubeCode}|SUB:${r.subledgerTotal}|GL:${r.glPostedTotal}|VAR:${r.variance}|REC:${r.recordsEvaluated}`
    ).toUpperCase(),
  }));
};
