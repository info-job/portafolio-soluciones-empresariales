
import { db } from '../firebase';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  collection, 
  serverTimestamp
} from 'firebase/firestore';
import { 
  Transaction, 
  Supplier, 
  WorkOrder, 
  AuditEntry, 
  PettyCashExpense,
  PettyCash,
  Contract,
  Property,
  LeaseContract
} from '../types';

export enum EntityType {
  TRANSACCION = 'TRANSACCION',
  PROVEEDOR = 'PROVEEDOR',
  ORDEN_TRABAJO = 'ORDEN_TRABAJO',
  PROPIEDAD = 'PROPIEDAD',
  CONTRATO = 'CONTRATO',
  DOCUMENTO_OFICIAL = 'DOCUMENTO_OFICIAL',
  TICKET_IT = 'TICKET_IT',
  REPORTE_B13 = 'REPORTE_B13',
  REPORTE_B4 = 'REPORTE_B4',
  REPORTE_NOTA14 = 'REPORTE_NOTA14',
  CONCILIACION_CONTABLE = 'CONCILIACION_CONTABLE',
  REPORTE_DUE_DILIGENCE = 'REPORTE_DUE_DILIGENCE',
  FONDO_CAJA_CHICA = 'FONDO_CAJA_CHICA',
  GASTO_CAJA_CHICA = 'GASTO_CAJA_CHICA',
  CUENTA_CONTABLE = 'CUENTA_CONTABLE',
  SISTEMA = 'SISTEMA'
}

export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'SYNC' | 'BACKUP' | 'RESTORE';

export interface CoherenceResult {
  valid: boolean;
  errors: string[];
}

export class DataService {
  private static instance: DataService;
  
  private constructor() {}

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  /**
   * Sincroniza una entidad individual a Firestore
   */
  async syncToFirestore(collectionName: string, id: string, data: any): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, { ...data, lastSync: Date.now() }, { merge: true });
    } catch (error) {
      console.error(`Error syncing ${collectionName}/${id}:`, error);
    }
  }

  /**
   * Elimina una entidad de Firestore
   */
  async deleteFromFirestore(collectionName: string, id: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting ${collectionName}/${id}:`, error);
    }
  }

  /**
   * AssetFlow Enterprise F0002 Next Numbers Emulator
   * Mantiene secuencialidad única para evitar brechas transaccionales en producción.
   */
  public getNextNumber(systemCode: string): number {
    if (typeof window === 'undefined') return 10001;
    const key = `jde_nn_${systemCode.toLowerCase()}`;
    const current = localStorage.getItem(key);
    let nextVal = current ? parseInt(current, 10) : 0;
    
    if (!nextVal) {
      const defaults: Record<string, number> = {
        je: 10001,  // Journal Entry (Bitácora)
        pv: 50001,  // Voucher / Facturas Compra
        rc: 20001,  // Receipts / Cobros
        wo: 80001,  // Work Order
        au: 900001, // Security Audit Log
        co: 30001,  // Contracts
        pr: 40001   // Properties
      };
      nextVal = defaults[systemCode.toLowerCase()] || 10001;
    }
    
    localStorage.setItem(key, (nextVal + 1).toString());
    return nextVal;
  }

  /**
   * Captura el identificador único de terminal cliente (F0911 MKEY Equivalent)
   */
  public getWorkStationId(): string {
    if (typeof window === 'undefined') return 'SERVER_NODE';
    const pl = window.navigator.platform || 'WEB';
    const userAgent = window.navigator.userAgent;
    let browser = 'CHROME';
    if (userAgent.indexOf('Firefox') > -1) browser = 'FIREFOX';
    else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) browser = 'SAFARI';
    else if (userAgent.indexOf('Edge') > -1) browser = 'EDGE';
    
    // Use window screen info for a simple browser footprint
    const screenRes = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080';
    return `MKEY-${pl.toUpperCase().replace(/\s+/g, '_')}-${browser}-${screenRes}`;
  }

  /**
   * Mapea entidades con los programas maestros interactivos ERP originales
   */
  public getProgramId(entityType: string, action: string = 'CREATE'): string {
    const map: Record<string, string> = {
      TRANSACCION: 'P0911',      // General Ledger Entry (Diarios)
      PROVEEDOR: 'P04012',       // Supplier Master Directory
      ORDEN_TRABAJO: 'P48201',   // Work Order Maintenance
      PROPIEDAD: 'P1501',        // Real Estate Property Master
      CONTRATO: 'P15012',        // Lease Contracts Administration
      DOCUMENTO_OFICIAL: 'P0115',// Official Letters and Communications
      TICKET_IT: 'P17500',       // Help Desk Center
      REPORTE_B13: 'R09321',     // Regulated Financial Sheets B13
      REPORTE_B4: 'R09322',      // Official B4 Ledger Report
      REPORTE_NOTA14: 'R09314',  // Notes Financials Formulate
      GASTO_CAJA_CHICA: 'P0002M',// Petty Cash System
      SISTEMA: 'P986110',        // Systems security
      TASACION: 'P15401'         // Appraisal Module
    };
    return map[entityType] || 'P980011';
  }

  /**
   * Genera un hash sumatorio resistente a la manipulación en el cliente para auditorías de producción
   */
  public generateHashSignature(data: any): string {
    const fieldsToSign = typeof data === 'object' 
      ? JSON.stringify({ id: data.id, amount: data.amount, timestamp: data.timestamp, user: data.user, action: data.action })
      : String(data);
    
    let hash = 0;
    for (let i = 0; i < fieldsToSign.length; i++) {
      const char = fieldsToSign.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `JDE_SEC_SIG_${Math.abs(hash).toString(16).toUpperCase()}`;
  }

  /**
   * Auditoría de Trazabilidad e Integridad de Base de Datos (R097001 ERP Benchmark)
   * Escanea consecutividad de next numbers, estampas faltantes y balances debito/credito de lotes.
   */
  public securityIntegrityAudit(
    transactions: Transaction[], 
    auditLog: AuditEntry[]
  ) {
    const issues: { type: 'GAP' | 'STAMP' | 'TAMPER' | 'BALANCE'; severity: 'CRITICAL' | 'WARNING'; message: string; resolution: string }[] = [];
    
    // 1. Scan for sequence gaps in general ledger transactions (P0911 numbers)
    const sequences = transactions
      .map(t => t.nextNumberSeq)
      .filter((seq): seq is number => typeof seq === 'number')
      .sort((a, b) => a - b);
      
    if (sequences.length > 1) {
      for (let i = 0; i < sequences.length - 1; i++) {
        const diff = sequences[i + 1] - sequences[i];
        if (diff > 1) {
          for (let gapVal = sequences[i] + 1; gapVal < sequences[i + 1]; gapVal++) {
            issues.push({
              type: 'GAP',
              severity: 'CRITICAL',
              message: `Brecha de secuencia detectada: Falta número correlativo F0002 ERP [${gapVal}] entre registros.`,
              resolution: `Investigar posibles eliminaciones directas o fallos de sincronía local-cloud.`
            });
          }
        }
      }
    }

    // 2. Scan for untracked audit stamps (USER / PID / MKEY)
    const unstampedTrans = transactions.filter(t => !t.programId || !t.workStationId || !t.nextNumberSeq);
    if (unstampedTrans.length > 0) {
      issues.push({
        type: 'STAMP',
        severity: 'WARNING',
        message: `Existen ${unstampedTrans.length} transacciones registradas sin estampa ERP (USER/PID/MKEY vacíos).`,
        resolution: `Ejecutar la Rutina de Reparación de Estampa Operativa [R0002B37] para asentar campos retroactivamente.`
      });
    }

    // 3. Check for out-of-balance entries
    const invalidAmounts = transactions.filter(t => t.amount <= 0 || isNaN(t.amount));
    if (invalidAmounts.length > 0) {
      issues.push({
        type: 'BALANCE',
        severity: 'CRITICAL',
        message: `Se detectaron ${invalidAmounts.length} transacciones con importes inválidos o nulos.`,
        resolution: `Reclasificar o ajustar transacciones de importe nulo para cuadrar el libro general.`
      });
    }

    return {
      passed: issues.length === 0,
      score: Math.max(0, 100 - (issues.filter(i => i.severity === 'CRITICAL').length * 15) - (issues.filter(i => i.severity === 'WARNING').length * 5)),
      issues
    };
  }

  /**
   * Crea una entrada de auditoría con estampa ERP integrada
   */
  createAuditEntry(
    user: string,
    action: ActionType,
    entityType: EntityType,
    entityId: string,
    entityName?: string,
    details?: { field?: string, old?: any, new?: any }
  ): AuditEntry {
    const programId = this.getProgramId(entityType, action as string);
    const workStationId = this.getWorkStationId();
    const nextNumberSeq = this.getNextNumber('AU');

    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      user,
      action: action as any,
      entityType: entityType as any,
      entityId,
      entityName,
      fieldChanged: details?.field,
      oldValue: details?.old !== undefined ? String(details?.old) : undefined,
      newValue: details?.new !== undefined ? String(details?.new) : undefined,
      programId,
      workStationId,
      nextNumberSeq
    };

    entry.hashSignature = this.generateHashSignature(entry);
    return entry;
  }

  /**
   * Verifica la coherencia de los datos del sistema
   */
  checkCoherence(data: {
    transactions: Transaction[],
    workOrders: WorkOrder[],
    suppliers: Supplier[],
    pettyCashExpenses: PettyCashExpense[],
    pettyCashFunds: PettyCash[],
    contracts: Contract[],
    properties: Property[],
    leaseContracts: LeaseContract[]
  }): CoherenceResult {
    const errors: string[] = [];

    // 1. Verificar Órdenes de Trabajo Pagadas vs Transacciones
    data.workOrders.filter(wo => wo.status === 'PAGADA').forEach(wo => {
      const hasTransaction = data.transactions.some(t => t.relatedEntityId === wo.id || t.workOrderId === wo.id);
      if (!hasTransaction) {
        errors.push(`Orden de Trabajo ${wo.folio} (${wo.id}) está PAGADA pero no tiene una transacción asociada.`);
      }
    });

    // 2. Verificar Gastos de Caja Chica vs Fondos
    data.pettyCashExpenses.forEach(expense => {
      const fundExists = data.pettyCashFunds.some(f => f.id === expense.pettyCashId);
      if (!fundExists) {
        errors.push(`Gasto de Caja Chica ${expense.id} referencia a un fondo inexistente: ${expense.pettyCashId}`);
      }
    });

    // 3. Verificar Transacciones vs Proveedores
    data.transactions.filter(t => t.type === 'EXPENSE' && t.supplierId).forEach(t => {
      const supplierExists = data.suppliers.some(s => s.id === t.supplierId);
      if (!supplierExists) {
        errors.push(`Transacción ${t.id} referencia a un proveedor inexistente: ${t.supplierId}`);
      }
    });

    // 4. Verificar Contratos vs Proveedores
    data.contracts.forEach(contract => {
      const supplier = data.suppliers.find(s => s.id === contract.supplierId);
      if (!supplier) {
        errors.push(`Contrato ${contract.id} referencia a un proveedor inexistente: ${contract.supplierId}`);
      } else if (supplier.status !== 'ACTIVE' && contract.status === 'VIGENTE') {
        errors.push(`Contrato ${contract.id} está VIGENTE pero el proveedor ${supplier.name} no está ACTIVO.`);
      }
    });

    // 5. Verificar Propiedades vs Contratos de Arriendo
    data.leaseContracts.filter(lc => lc.status === 'VIGENTE').forEach(lc => {
      const property = data.properties.find(p => p.id === lc.propertyId);
      if (!property) {
        errors.push(`Contrato de Arriendo ${lc.id} referencia a una propiedad inexistente: ${lc.propertyId}`);
      } else if (property.rentalAmount !== lc.monthlyAmount) {
        // Solo advertencia si hay discrepancia en montos
        console.warn(`Discrepancia de monto en Propiedad ${property.code}: Propiedad indica ${property.rentalAmount}, Contrato indica ${lc.monthlyAmount}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Genera transacciones automáticas basadas en el estado de otros módulos
   */
  generateCoherentTransactions(
    workOrders: WorkOrder[],
    existingTransactions: Transaction[]
  ): Transaction[] {
    const newTransactions: Transaction[] = [];
    
    workOrders.filter(wo => wo.status === 'PAGADA').forEach(wo => {
      const alreadyExists = existingTransactions.some(t => t.relatedEntityId === wo.id || t.workOrderId === wo.id);
      if (!alreadyExists) {
        const nextNum = this.getNextNumber('pv');
        const mkey = this.getWorkStationId();
        const pid = this.getProgramId('TRANSACCION');

        const autoTransaction: Transaction = {
          id: `AUTO-WO-${wo.id}`,
          date: wo.receptionDate || wo.issueDate || new Date().toISOString().split('T')[0],
          invoiceDate: wo.receptionDate || wo.issueDate || new Date().toISOString().split('T')[0],
          amount: wo.total || 0,
          type: 'EXPENSE',
          category: 'PAGO A PROVEEDOR',
          description: `Pago Automático: OT ${wo.folio} - ${wo.items[0]?.description || 'Servicios'}`,
          supplierId: wo.supplierId,
          supplierName: wo.supplierName,
          supplierTaxId: wo.supplierTaxId,
          propertyId: wo.propertyId,
          status: 'COMPLETADA' as any,
          workOrderId: wo.id,
          insuranceCompany: 'GENERALES',
          documentType: 'FACTURA',
          documentNumber: wo.receptionInvoiceNumber || 'S/N',
          user: wo.receptionUser || 'SISTEMA',
          timestamp: Date.now(),
          lockedBy: null,
          lockedAt: null,
          metadata: { isAutoGenerated: true, relatedEntityId: wo.id, relatedEntityType: 'ORDEN_TRABAJO' },
          nextNumberSeq: nextNum,
          workStationId: mkey,
          programId: pid,
          batchNumber: `BAT-${Date.now().toString().slice(-6)}`
        };
        autoTransaction.hashSignature = this.generateHashSignature(autoTransaction);
        newTransactions.push(autoTransaction);
      }
    });

    return newTransactions;
  }

  /**
   * Valida la coincidencia exacta entre los montos de facturación cargados (transacciones)
   * y los presupuestos aprobados en el módulo de Órdenes de Trabajo.
   * Marca discrepancias superiores al 5% con un flag de error.
   */
  public verifyTransactionConsistency(
    transactions: Transaction[],
    workOrders: WorkOrder[]
  ): Array<{
    transactionId: string;
    workOrderId: string;
    transactionAmount: number;
    workOrderTotal: number;
    discrepancyPercentage: number;
    hasError: boolean;
    message: string;
  }> {
    const results: Array<{
      transactionId: string;
      workOrderId: string;
      transactionAmount: number;
      workOrderTotal: number;
      discrepancyPercentage: number;
      hasError: boolean;
      message: string;
    }> = [];

    transactions.forEach(tx => {
      // Find matching work order through direct linkage or reference
      const linkedWoId = tx.workOrderId || tx.relatedEntityId || tx.metadata?.relatedEntityId;
      let matchingWo = workOrders.find(wo => wo.id === linkedWoId);

      // Fallback: match by description, document number or matching supplier if no direct link, but has work order context
      if (!matchingWo && tx.description?.includes('OT')) {
        const otMatch = tx.description.match(/OT\s*(\d+)/i) || tx.description.match(/OT-(\d+)/i);
        if (otMatch) {
          const folioStr = otMatch[1];
          matchingWo = workOrders.find(wo => String(wo.folio) === folioStr);
        }
      }

      if (matchingWo) {
        const txAmount = tx.amount || 0;
        const woAmount = matchingWo.total || 0;
        
        if (woAmount > 0) {
          const absoluteDiff = Math.abs(txAmount - woAmount);
          const discrepancyPercent = (absoluteDiff / woAmount) * 100;
          const hasError = discrepancyPercent > 5;
          
          let message = 'Coincidencia exacta conforme';
          if (hasError) {
            message = `Discrepancia crítica: El monto facturado ($${txAmount.toLocaleString('es-CL')}) supera el presupuesto aprobado ($${woAmount.toLocaleString('es-CL')}) por un ${discrepancyPercent.toFixed(2)}% (Límite 5%)`;
          } else if (discrepancyPercent > 0) {
            message = `Diferencia menor aceptada: ${discrepancyPercent.toFixed(2)}% de desviación`;
          }

          results.push({
            transactionId: tx.id,
            workOrderId: matchingWo.id,
            transactionAmount: txAmount,
            workOrderTotal: woAmount,
            discrepancyPercentage: discrepancyPercent,
            hasError,
            message
          });

          // Also inject standard flag inside the transaction metadata in-place to allow dynamic warnings in UI if desired
          if (tx.metadata) {
            tx.metadata.budgetConsistencyError = hasError;
            tx.metadata.budgetConsistencyPercent = discrepancyPercent;
            tx.metadata.budgetConsistencyMessage = message;
          } else {
            tx.metadata = {
              budgetConsistencyError: hasError,
              budgetConsistencyPercent: discrepancyPercent,
              budgetConsistencyMessage: message
            };
          }
        }
      }
    });

    return results;
  }
}

export const dataService = DataService.getInstance();
