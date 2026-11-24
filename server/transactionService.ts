import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_FILE = path.resolve(DATA_DIR, 'transactions_store.json');

export interface TransactionRecord {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: 'INCOME' | 'EXPENSE';
  documentType?: string;
  documentNumber?: string;
  date: string;
  invoiceDate?: string;
  user: string;
  timestamp: number;
  supplierId?: string;
  supplierName?: string;
  supplierTaxId?: string;
  propertyId?: string;
  accountCode?: string;
  insuranceCompany?: string;
  workOrderId?: string;
  status?: string;
  batchNumber?: string;
  programId?: string;
  workStationId?: string;
  nextNumberSeq?: number;
  hashSignature?: string;
  [key: string]: any;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'INCOME' | 'EXPENSE' | 'ALL';
  category?: string;
  startDate?: string;
  endDate?: string;
  supplierName?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult {
  items: TransactionRecord[];
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  aggregations: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    countIncome: number;
    countExpense: number;
    totalRecords: number;
  };
}

class TransactionService {
  private inMemoryCache: Map<string, TransactionRecord> = new Map();
  private isLoaded = false;
  private isWriting = false;
  private pendingWrite = false;

  constructor() {
    this.ensureDataDirectory();
    this.loadFromDisk();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const list: TransactionRecord[] = JSON.parse(raw);
        this.inMemoryCache.clear();
        for (const item of list) {
          if (item && item.id) {
            this.inMemoryCache.set(item.id, item);
          }
        }
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('[TransactionService] Error loading transactions store from disk:', err);
      this.isLoaded = true;
    }
  }

  private async flushToDisk(): Promise<void> {
    if (this.isWriting) {
      this.pendingWrite = true;
      return;
    }
    this.isWriting = true;
    this.pendingWrite = false;

    try {
      const items = Array.from(this.inMemoryCache.values());
      await fs.promises.writeFile(STORE_FILE, JSON.stringify(items), 'utf-8');
    } catch (err) {
      console.error('[TransactionService] Failed to flush transactions to disk:', err);
    } finally {
      this.isWriting = false;
      if (this.pendingWrite) {
        setImmediate(() => this.flushToDisk());
      }
    }
  }

  public getPaginated(query: PaginationQuery): PaginatedResult {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const search = (query.search || '').trim().toLowerCase();
    const type = query.type || 'ALL';
    const category = (query.category || '').trim().toLowerCase();
    const startDate = (query.startDate || '').trim();
    const endDate = (query.endDate || '').trim();
    const supplierName = (query.supplierName || '').trim().toLowerCase();
    const sortBy = query.sortBy || 'date';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    let allItems = Array.from(this.inMemoryCache.values());

    // Filter
    let filtered = allItems.filter(item => {
      if (type !== 'ALL' && item.type !== type) return false;
      if (category && item.category && !item.category.toLowerCase().includes(category)) return false;
      if (startDate && item.date && item.date < startDate) return false;
      if (endDate && item.date && item.date > endDate) return false;
      if (supplierName && item.supplierName && !item.supplierName.toLowerCase().includes(supplierName)) return false;

      if (search) {
        const desc = (item.description || '').toLowerCase();
        const docNum = (item.documentNumber || '').toLowerCase();
        const sup = (item.supplierName || '').toLowerCase();
        const rut = (item.supplierTaxId || '').toLowerCase();
        const usr = (item.user || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        if (!desc.includes(search) && !docNum.includes(search) && !sup.includes(search) && !rut.includes(search) && !usr.includes(search) && !cat.includes(search)) {
          return false;
        }
      }
      return true;
    });

    // Aggregations over the filtered set
    let totalIncome = 0;
    let totalExpense = 0;
    let countIncome = 0;
    let countExpense = 0;

    for (const item of filtered) {
      const amt = Number(item.amount) || 0;
      if (item.type === 'INCOME') {
        totalIncome += amt;
        countIncome++;
      } else {
        totalExpense += amt;
        countExpense++;
      }
    }

    const netBalance = totalIncome - totalExpense;
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    // Sorting
    filtered.sort((a, b) => {
      let valA = (a as any)[sortBy];
      let valB = (b as any)[sortBy];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      const comp = strA.localeCompare(strB);
      return sortOrder === 'asc' ? comp : -comp;
    });

    // Slicing current page
    const startIndex = (page - 1) * limit;
    const pageItems = filtered.slice(startIndex, startIndex + limit);

    return {
      items: pageItems,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      aggregations: {
        totalIncome,
        totalExpense,
        netBalance,
        countIncome,
        countExpense,
        totalRecords
      }
    };
  }

  public upsert(record: TransactionRecord): TransactionRecord {
    if (!record.id) {
      record.id = 'TX_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    }
    if (!record.timestamp) {
      record.timestamp = Date.now();
    }
    this.inMemoryCache.set(record.id, record);
    this.flushToDisk();
    return record;
  }

  public batchUpsert(records: TransactionRecord[]): { count: number } {
    let count = 0;
    for (const r of records) {
      if (!r.id) {
        r.id = 'TX_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      }
      if (!r.timestamp) {
        r.timestamp = Date.now();
      }
      this.inMemoryCache.set(r.id, r);
      count++;
    }
    this.flushToDisk();
    return { count };
  }

  public delete(id: string): boolean {
    const existed = this.inMemoryCache.delete(id);
    if (existed) {
      this.flushToDisk();
    }
    return existed;
  }

  public getById(id: string): TransactionRecord | null {
    return this.inMemoryCache.get(id) || null;
  }

  public getTotalCount(): number {
    return this.inMemoryCache.size;
  }

  public streamCsv(res: Response, query: PaginationQuery) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="f0911_transacciones_export.csv"');
    res.write('\uFEFF'); // BOM for Excel UTF-8 recognition

    // Header
    res.write('ID,Fecha,Tipo,Monto,Categoria,Descripcion,NumeroDocumento,Proveedor,RUT,Usuario,FirmaSHA256\r\n');

    const result = this.getPaginated({ ...query, page: 1, limit: 1000000 });
    for (const row of result.items) {
      const escape = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
      const line = [
        escape(row.id),
        escape(row.date),
        escape(row.type),
        row.amount || 0,
        escape(row.category),
        escape(row.description),
        escape(row.documentNumber),
        escape(row.supplierName),
        escape(row.supplierTaxId),
        escape(row.user),
        escape(row.hashSignature)
      ].join(',') + '\r\n';
      res.write(line);
    }
    res.end();
  }
}

export const transactionService = new TransactionService();
