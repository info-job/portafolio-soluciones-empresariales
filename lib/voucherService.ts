/**
 * ASSETFLOW Central ERP - Voucher & Receipt Generation Engine
 * 
 * Centraliza la emisión automática de comprobantes y vouchers PDF descargables
 * para cada operación finalizada con éxito en el sistema:
 *  - Transacciones Contables (F0911 - Ingresos y Egresos)
 *  - Órdenes de Trabajo (F4801 - Emisión, Aprobación y Recepción)
 *  - Pagos de Arriendo (F03B11 - Comprobantes con Folio SII)
 *  - Solicitudes y Siniestros (F55CLAIM)
 *  - Gastos de Caja Chica (F0911PC)
 *  - Liquidaciones de Garantías (F1502G)
 *  - Conciliaciones Bancarias (F0916)
 * 
 * Cada comprobante generado se descarga inmediatamente al dispositivo del usuario,
 * se registra en la cola de Informes Recientes (WSJ - P986110B) y despliega una
 * notificación enriquecida con acceso directo a re-descarga.
 */

import { 
  Transaction, 
  WorkOrder, 
  LeaseContract, 
  LeasePayment, 
  Property, 
  PettyCashExpense, 
  SecurityDeposit, 
  AccountingReconciliation,
  DTEInvoice
} from '../types';

export type VoucherOperationType = 
  | 'TRANSACTION'
  | 'WORK_ORDER'
  | 'RENT_PAYMENT'
  | 'CLAIM'
  | 'PETTY_CASH'
  | 'SECURITY_DEPOSIT'
  | 'RECONCILIATION'
  | 'DTE_INVOICE';

export interface VoucherRecord {
  id: string;
  operationType: VoucherOperationType;
  folio: string;
  title: string;
  category?: string;
  amount?: number;
  currency?: string;
  timestamp: number;
  formattedDate: string;
  user: string;
  status: 'EXITOSO';
  pdfFilename: string;
  payload: any;
}

const STORAGE_KEY = 'ASSETFLOW_SUBMITTED_VOUCHERS';

/**
 * Obtiene la lista histórica de comprobantes emitidos en el sistema
 */
export const getStoredVouchers = (): VoucherRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error al leer comprobantes almacenados:", err);
    return [];
  }
};

/**
 * Almacena un comprobante en el registro local del ERP (máximo 100 registros)
 */
export const saveVoucherRecord = (record: VoucherRecord): void => {
  try {
    const existing = getStoredVouchers();
    const updated = [record, ...existing.filter(v => v.id !== record.id)].slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Error al guardar comprobante en storage:", err);
  }
};

/**
 * Despacha notificación global con acción de descarga
 */
const notifyVoucherSuccess = (record: VoucherRecord, onDownload: () => void) => {
  if (typeof window === 'undefined') return;

  // Notificación interactiva a través del NotificationProvider
  window.dispatchEvent(new CustomEvent('jde:notify', {
    detail: {
      title: '¡Operación Exitosa • Voucher Generado!',
      message: `${record.title} [Folio: ${record.folio}]. El comprobante PDF se ha generado y descargado a su dispositivo.`,
      type: 'success',
      duration: 8000,
      action: {
        label: 'Descargar Voucher PDF',
        onClick: onDownload
      }
    }
  }));

  // Notificación de nuevo trabajo en WSJ
  window.dispatchEvent(new CustomEvent('jde:voucher-emitted', {
    detail: { voucher: record }
  }));
};

/**
 * EMISOR: Transacción Contable F0911 (Ingreso o Egreso)
 */
export const emitTransactionVoucher = (
  transaction: Transaction,
  companyLogo?: string | null,
  currentUser: string = 'SISTEMA',
  autoDownload: boolean = true
): VoucherRecord => {
  const isIncome = transaction.type === 'INCOME' || (transaction.type as any) === 'INGRESO';
  const folio = transaction.documentNumber || transaction.batchNumber || transaction.id.slice(-6).toUpperCase();
  const title = `Voucher Contable ${isIncome ? 'Ingreso' : 'Egreso'} F0911 - ${transaction.category || 'General'}`;

  const record: VoucherRecord = {
    id: `vch-tx-${transaction.id}`,
    operationType: 'TRANSACTION',
    folio,
    title,
    category: transaction.category,
    amount: transaction.amount,
    currency: 'CLP',
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleDateString('es-CL'),
    user: transaction.user || currentUser,
    status: 'EXITOSO',
    pdfFilename: `Recibo_Central_${transaction.id}.pdf`,
    payload: transaction
  };

  saveVoucherRecord(record);

  const downloadFn = () => {
    import('./pdfGenerator')
      .then(({ downloadJDETransactionVoucher }) => {
        downloadJDETransactionVoucher({
          transaction,
          companyLogo,
          currentUser: record.user
        });
      })
      .catch(e => console.error("Error cargando pdfGenerator:", e));
  };

  if (autoDownload) {
    try {
      downloadFn();
    } catch (e) {
      console.error("Error en auto-descarga de voucher transacción:", e);
    }
  }

  notifyVoucherSuccess(record, downloadFn);
  return record;
};

/**
 * EMISOR: Orden de Trabajo F4801 (Creación, Aprobación o Recepción)
 */
export const emitWorkOrderVoucher = (
  workOrder: WorkOrder,
  companyLogo?: string | null,
  currentUser: string = 'SISTEMA',
  autoDownload: boolean = true
): VoucherRecord => {
  const folio = workOrder.folio ? `#${workOrder.folio}` : `OT-${workOrder.id.slice(-6).toUpperCase()}`;
  const title = `Voucher Orden de Trabajo F4801 - Folio ${folio} (${workOrder.specialty || 'Mantención'})`;

  const record: VoucherRecord = {
    id: `vch-wo-${workOrder.id}`,
    operationType: 'WORK_ORDER',
    folio,
    title,
    category: workOrder.category || workOrder.reqDept,
    amount: workOrder.total,
    currency: 'CLP',
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleDateString('es-CL'),
    user: currentUser,
    status: 'EXITOSO',
    pdfFilename: `Recibo_OT_${workOrder.id}.pdf`,
    payload: workOrder
  };

  saveVoucherRecord(record);

  const downloadFn = () => {
    import('./pdfGenerator')
      .then(({ downloadJDEWorkOrderVoucher }) => {
        downloadJDEWorkOrderVoucher({
          workOrder,
          companyLogo,
          currentUser
        });
      })
      .catch(e => console.error("Error cargando pdfGenerator:", e));
  };

  if (autoDownload) {
    try {
      downloadFn();
    } catch (e) {
      console.error("Error en auto-descarga de voucher OT:", e);
    }
  }

  notifyVoucherSuccess(record, downloadFn);
  return record;
};

/**
 * EMISOR: Pago de Arriendo F03B11
 */
export const emitRentPaymentVoucher = (
  contract: LeaseContract,
  payment: LeasePayment,
  property?: Property,
  companyLogo?: string | null,
  currentUser: string = 'SISTEMA CAJA',
  autoDownload: boolean = true
): VoucherRecord => {
  const folio = `REC-ARR-${payment.id.toUpperCase().slice(-8)}`;
  const title = `Recibo de Pago Arriendo - ${contract.tenantName} (${payment.period})`;

  const record: VoucherRecord = {
    id: `vch-pay-${payment.id}`,
    operationType: 'RENT_PAYMENT',
    folio,
    title,
    amount: payment.amountPaid,
    currency: 'CLP',
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleDateString('es-CL'),
    user: currentUser,
    status: 'EXITOSO',
    pdfFilename: `Comprobante_Pago_Arriendo_${folio}.pdf`,
    payload: { contract, payment, property }
  };

  saveVoucherRecord(record);

  const downloadFn = () => {
    import('./pdfGenerator')
      .then(({ downloadRentPaymentReceiptPDF }) => {
        downloadRentPaymentReceiptPDF({
          contract,
          payment,
          property,
          currentUser
        });
      })
      .catch(e => console.error("Error cargando pdfGenerator:", e));
  };

  if (autoDownload) {
    try {
      downloadFn();
    } catch (e) {
      console.error("Error en auto-descarga de recibo de arriendo:", e);
    }
  }

  notifyVoucherSuccess(record, downloadFn);
  return record;
};

/**
 * EMISOR: Reclamo / Solicitud de Mantención F55CLAIM
 */
export const emitClaimVoucher = (
  claim: any,
  property?: any,
  companyLogo?: string | null,
  currentUser: string = 'SISTEMA',
  autoDownload: boolean = true
): VoucherRecord => {
  const folio = claim.claimNumber || claim.folio || claim.id?.slice(-6)?.toUpperCase() || 'S/F';
  const title = `Voucher Solicitud F55CLAIM - Folio ${folio} (${claim.category || claim.issueDescription?.slice(0, 20) || 'Reclamo'})`;

  const record: VoucherRecord = {
    id: `vch-claim-${claim.id}`,
    operationType: 'CLAIM',
    folio,
    title,
    category: claim.category,
    amount: claim.estimatedCost || 0,
    currency: 'CLP',
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleDateString('es-CL'),
    user: currentUser,
    status: 'EXITOSO',
    pdfFilename: `F12017_Siniestro_${folio}.pdf`,
    payload: { claim, property }
  };

  saveVoucherRecord(record);

  const downloadFn = () => {
    import('./pdfGenerator')
      .then(({ downloadJDEClaimReceipt }) => {
        downloadJDEClaimReceipt({
          claim,
          property,
          companyLogo,
          currentUser
        });
      })
      .catch(e => console.error("Error cargando pdfGenerator:", e));
  };

  if (autoDownload) {
    try {
      downloadFn();
    } catch (e) {
      console.error("Error en auto-descarga de voucher reclamo:", e);
    }
  }

  notifyVoucherSuccess(record, downloadFn);
  return record;
};

/**
 * EMISOR: Rendición de Caja Chica F0911PC
 */
export const emitPettyCashVoucher = (
  expense: PettyCashExpense,
  fundName: string = 'Fondo Fijo Operacional',
  companyLogo?: string | null,
  currentUser: string = 'SISTEMA CAJA',
  autoDownload: boolean = true
): VoucherRecord => {
  const folio = `CC-${expense.id.slice(-6).toUpperCase()}`;
  const title = `Vale Caja Chica F0911PC - ${expense.category || 'Gasto'} (${expense.description?.slice(0, 25)})`;

  const record: VoucherRecord = {
    id: `vch-cc-${expense.id}`,
    operationType: 'PETTY_CASH',
    folio,
    title,
    category: expense.category,
    amount: expense.amount,
    currency: 'CLP',
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleDateString('es-CL'),
    user: currentUser,
    status: 'EXITOSO',
    pdfFilename: `Voucher_CajaChica_${folio}.pdf`,
    payload: { expense, fundName }
  };

  saveVoucherRecord(record);

  const downloadFn = () => {
    import('./pdfGenerator')
      .then(({ downloadPettyCashVoucher }) => {
        downloadPettyCashVoucher({
          expense,
          fundName,
          companyLogo,
          currentUser
        });
      })
      .catch(e => console.error("Error cargando pdfGenerator:", e));
  };

  if (autoDownload) {
    try {
      downloadFn();
    } catch (e) {
      console.error("Error en auto-descarga de voucher caja chica:", e);
    }
  }

  notifyVoucherSuccess(record, downloadFn);
  return record;
};

/**
 * EMISOR: Liquidación / Resguardo de Garantía F1502G
 */
export const emitSecurityDepositVoucher = (
  deposit: SecurityDeposit,
  companyLogo?: string | null,
  currentUser: string = 'SISTEMA GARANTÍAS',
  autoDownload: boolean = true
): VoucherRecord => {
  const folio = `GAR-${deposit.id.slice(-6).toUpperCase()}`;
  const title = `Comprobante Garantía F1502G - ${deposit.tenantName} (${deposit.propertyLabel})`;

  const record: VoucherRecord = {
    id: `vch-gar-${deposit.id}`,
    operationType: 'SECURITY_DEPOSIT',
    folio,
    title,
    amount: deposit.initialAmount,
    currency: deposit.currency,
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleDateString('es-CL'),
    user: currentUser,
    status: 'EXITOSO',
    pdfFilename: `Comprobante_Garantia_${folio}.pdf`,
    payload: deposit
  };

  saveVoucherRecord(record);

  const downloadFn = () => {
    import('./pdfGenerator')
      .then(({ downloadSecurityDepositVoucher }) => {
        downloadSecurityDepositVoucher({
          deposit,
          companyLogo,
          currentUser
        });
      })
      .catch(e => console.error("Error cargando pdfGenerator:", e));
  };

  if (autoDownload) {
    try {
      downloadFn();
    } catch (e) {
      console.error("Error en auto-descarga de voucher garantía:", e);
    }
  }

  notifyVoucherSuccess(record, downloadFn);
  return record;
};

/**
 * EMISOR: Conciliación Bancaria F0916
 */
export const emitReconciliationVoucher = (
  reconciliation: AccountingReconciliation,
  companyLogo?: string | null,
  currentUser: string = 'SISTEMA AUDITOR',
  autoDownload: boolean = true
): VoucherRecord => {
  const folio = `CONC-${reconciliation.id.slice(-6).toUpperCase()}`;
  const title = `Acta Conciliación Contable F0916 - ${reconciliation.period} (${reconciliation.title || reconciliation.fileName || 'General'})`;
  const amount = reconciliation.results?.reduce((acc, r) => acc + (r.caratulaValue || 0), 0) || 0;

  const record: VoucherRecord = {
    id: `vch-conc-${reconciliation.id}`,
    operationType: 'RECONCILIATION',
    folio,
    title,
    amount,
    currency: 'CLP',
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleDateString('es-CL'),
    user: currentUser,
    status: 'EXITOSO',
    pdfFilename: `Acta_Conciliacion_${folio}.pdf`,
    payload: reconciliation
  };

  saveVoucherRecord(record);

  const downloadFn = () => {
    import('./pdfGenerator')
      .then(({ downloadReconciliationVoucher }) => {
        downloadReconciliationVoucher({
          reconciliation,
          companyLogo,
          currentUser
        });
      })
      .catch(e => console.error("Error cargando pdfGenerator:", e));
  };

  if (autoDownload) {
    try {
      downloadFn();
    } catch (e) {
      console.error("Error en auto-descarga de acta de conciliación:", e);
    }
  }

  notifyVoucherSuccess(record, downloadFn);
  return record;
};

/**
 * EMISOR: Factura Electrónica DTE (Tipo 33 / 34) y Cumplimiento DL 825 Art. 8g
 */
export const emitDTEInvoiceVoucher = (
  invoice: DTEInvoice,
  companyLogo?: string | null,
  currentUser: string = 'SISTEMA FACTURACIÓN',
  autoDownload: boolean = true
): VoucherRecord => {
  const folioStr = String(invoice.folio).padStart(8, '0');
  const dteLabel = invoice.dteType === '34' ? 'Factura Exenta DTE 34' : 'Factura Afecta DTE 33';
  const title = `${dteLabel} N° ${folioStr} - ${invoice.receiverName} (${invoice.propertyAddress || 'Inmueble'})`;

  const record: VoucherRecord = {
    id: `vch-dte-${invoice.id}`,
    operationType: 'DTE_INVOICE',
    folio: `DTE-${invoice.dteType}-${folioStr}`,
    title,
    amount: invoice.totalAmount,
    currency: 'CLP',
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleDateString('es-CL'),
    user: currentUser,
    status: 'EXITOSO',
    pdfFilename: `DTE_${invoice.dteType}_Folio_${folioStr}.pdf`,
    payload: invoice
  };

  saveVoucherRecord(record);

  const downloadFn = () => {
    import('./pdfGenerator')
      .then(({ downloadDTEInvoicePDF }) => {
        downloadDTEInvoicePDF({
          invoice,
          companyLogo
        });
      })
      .catch(e => console.error("Error cargando pdfGenerator:", e));
  };

  if (autoDownload) {
    try {
      downloadFn();
    } catch (e) {
      console.error("Error en auto-descarga de factura DTE:", e);
    }
  }

  notifyVoucherSuccess(record, downloadFn);
  return record;
};

/**
 * Re-descarga cualquier voucher desde el historial
 */
export const reDownloadVoucher = async (
  voucher: VoucherRecord,
  companyLogo?: string | null,
  currentUser: string = 'SISTEMA'
): Promise<void> => {
  try {
    const {
      downloadDTEInvoicePDF,
      downloadJDETransactionVoucher,
      downloadJDEWorkOrderVoucher,
      downloadRentPaymentReceiptPDF,
      downloadJDEClaimReceipt,
      downloadPettyCashVoucher,
      downloadSecurityDepositVoucher,
      downloadReconciliationVoucher
    } = await import('./pdfGenerator');

    switch (voucher.operationType) {
      case 'DTE_INVOICE':
        downloadDTEInvoicePDF({
          invoice: voucher.payload,
          companyLogo
        });
        break;
      case 'TRANSACTION':
        downloadJDETransactionVoucher({
          transaction: voucher.payload,
          companyLogo,
          currentUser: voucher.user || currentUser
        });
        break;
      case 'WORK_ORDER':
        downloadJDEWorkOrderVoucher({
          workOrder: voucher.payload,
          companyLogo,
          currentUser: voucher.user || currentUser
        });
        break;
      case 'RENT_PAYMENT':
        downloadRentPaymentReceiptPDF({
          contract: voucher.payload.contract,
          payment: voucher.payload.payment,
          property: voucher.payload.property,
          currentUser: voucher.user || currentUser
        });
        break;
      case 'CLAIM':
        downloadJDEClaimReceipt({
          claim: voucher.payload.claim,
          property: voucher.payload.property,
          companyLogo,
          currentUser: voucher.user || currentUser
        });
        break;
      case 'PETTY_CASH':
        downloadPettyCashVoucher({
          expense: voucher.payload.expense,
          fundName: voucher.payload.fundName,
          companyLogo,
          currentUser: voucher.user || currentUser
        });
        break;
      case 'SECURITY_DEPOSIT':
        downloadSecurityDepositVoucher({
          deposit: voucher.payload,
          companyLogo,
          currentUser: voucher.user || currentUser
        });
        break;
      case 'RECONCILIATION':
        downloadReconciliationVoucher({
          reconciliation: voucher.payload,
          companyLogo,
          currentUser: voucher.user || currentUser
        });
        break;
      default:
        console.warn("Tipo de voucher no reconocido para re-descarga:", voucher.operationType);
    }
  } catch (err) {
    console.error("Error al re-descargar voucher:", err);
  }
};
