import React, { useState, useMemo } from 'react';
import { AccountingAccount, Transaction, Property, WorkOrder, LeaseContract } from '../types';
import { CHART_OF_ACCOUNTS } from '../lib/accountingData';
import { formatCLP } from '../lib/chileanUtils';
import { 
  Book, Search, Filter, ChevronRight, ChevronDown, 
  ArrowUpRight, Download, FileSpreadsheet, Info,
  PieChart, Wallet, Building2, Briefcase, TrendingUp, TrendingDown, X, 
  Calendar, User, Tag, Layers, RefreshCw, Eye, CheckCircle2, AlertTriangle, 
  ShieldCheck, Database, CheckCircle, Sliders, Hash, DollarSign,
  Printer, FileText, ExternalLink, Wrench, ShieldAlert, ArrowDownUp
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useJDESort, JDESortColumnOption } from '../lib/jdeGridSort';
import { JDESortSequenceModal } from './common/JDESortSequenceModal';

interface ChartOfAccountsModuleProps {
  transactions?: Transaction[];
  properties?: Property[];
  workOrders?: WorkOrder[];
  leaseContracts?: LeaseContract[];
  pettyCashExpenses?: any[];
  currentUser?: string;
}

interface AccountMovement {
  id: string;
  date: string;
  timestamp: number;
  voucherNumber: string;
  voucherType: string;
  description: string;
  debit: number;
  credit: number;
  user: string;
  category?: string;
  propertyId?: string;
  propertyAddress?: string;
  propertyRole?: string;
  workOrderId?: string;
  workOrderFolio?: string;
  workOrderSpecialty?: string;
  associatedInvoice?: string;
  supplierName?: string;
  supplierTaxId?: string;
  accountCode: string;
  accountName?: string;
  contraAccountCode?: string;
  contraAccountName?: string;
  batchNumber?: string;
  hashSignature?: string;
}

interface AccountBalanceData {
  account: AccountingAccount;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  nature: 'DEUDOR' | 'ACREEDOR';
  movementCount: number;
  movements: AccountMovement[];
}

type VisualAssistType = 'CODE' | 'NAME' | 'TYPE' | 'LEVEL' | 'DEBIT' | 'CREDIT' | 'BALANCE' | 'NATURE';

// ==============================================================================
// MODAL: JDE P0911 - VOUCHER / ASINETO CONTABLE DETAIL INSPECTOR (FICHA DE ASIENTO)
// ==============================================================================
const VoucherDetailModal: React.FC<{
  movement: AccountMovement;
  onClose: () => void;
}> = ({ movement, onClose }) => {
  const isDebit = movement.debit > 0;
  const amount = isDebit ? movement.debit : movement.credit;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[700] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in zoom-in-95 font-sans">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl border-4 border-[#002D62] overflow-hidden flex flex-col">
        
        {/* Header JDE EnterpriseOne */}
        <div className="bg-gradient-to-r from-[#002D62] via-[#004B7B] to-[#002D62] p-4 text-white flex justify-between items-center shadow-md border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-lg border border-white/20 flex items-center justify-center shadow-inner">
              <FileText size={20} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black bg-amber-400 text-[#002D62] px-2 py-0.5 rounded shadow-xs">
                  P0911 • W0911A
                </span>
                <h2 className="text-sm md:text-base font-black uppercase tracking-tight text-white">
                  Comprobante de Asiento de Diario F0911 • N° {movement.voucherNumber}
                </h2>
              </div>
              <p className="text-[10px] text-blue-100 font-mono mt-0.5">
                AssetFlow Enterprise • Módulo de Contabilidad General y Asientos de Mayor
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
            title="Cerrar Ficha (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status & Summary Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-[#EAF1F8] border-b border-[#B8CCE0]">
          <div className="bg-white p-2 rounded border border-[#9DB2C3] shadow-xs">
            <span className="text-[8.5px] font-bold text-slate-500 uppercase block">N° Comprobante / Voucher</span>
            <span className="font-mono font-black text-xs md:text-sm text-[#002D62]">{movement.voucherNumber}</span>
          </div>
          <div className="bg-white p-2 rounded border border-[#9DB2C3] shadow-xs">
            <span className="text-[8.5px] font-bold text-slate-500 uppercase block">Fecha Contable / G/L Date</span>
            <span className="font-mono font-bold text-xs text-slate-900">{movement.date}</span>
          </div>
          <div className="bg-white p-2 rounded border border-[#9DB2C3] shadow-xs">
            <span className="text-[8.5px] font-bold text-slate-500 uppercase block">Tipo de Documento (DCTO)</span>
            <span className="font-mono font-bold text-xs text-indigo-700">{movement.voucherType}</span>
          </div>
          <div className="bg-white p-2 rounded border border-[#9DB2C3] shadow-xs">
            <span className="text-[8.5px] font-bold text-slate-500 uppercase block">Monto Transaccional</span>
            <span className="font-mono font-black text-xs md:text-sm text-emerald-700">{formatCLP(amount)}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-slate-50">
          
          {/* Glosa y Descripción */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[9px] font-black text-slate-500 uppercase block tracking-wider mb-1">
              Glosa Contable / Concepto Operacional
            </span>
            <p className="text-xs md:text-sm font-semibold text-slate-900 leading-relaxed">
              {movement.description}
            </p>
            {movement.category && (
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold uppercase rounded border border-slate-200">
                  Categoría: {movement.category}
                </span>
              </div>
            )}
          </div>

          {/* Partida Doble: Asiento Contable Cuadrado */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9.5px] font-black text-[#002D62] uppercase tracking-wider flex items-center gap-1.5">
                <Database size={13} className="text-[#002D62]" />
                Asiento Contable de Partida Doble (F0911 Ledger Lines)
              </span>
              <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                ASIENTO CUADRADO [DEBE = HABER]
              </span>
            </div>

            <table className="jde-grid w-full">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>Línea</th>
                  <th style={{ width: '120px' }}>Cuenta Contable</th>
                  <th>Denominación Oficial de Cuenta</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Débito (Debe)</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Crédito (Haber)</th>
                </tr>
              </thead>
              <tbody>
                {/* Línea 1: Cuenta Principal */}
                <tr className="jde-row-even">
                  <td className="text-center font-mono text-[10px] font-bold">1</td>
                  <td className="font-mono font-black text-[11px] text-[#002D62]">
                    {movement.accountCode}
                  </td>
                  <td className="text-[11px] font-bold text-slate-900">
                    {movement.accountName || CHART_OF_ACCOUNTS.find(a => a.code === movement.accountCode)?.name || 'Cuenta General'}
                  </td>
                  <td className="text-right font-mono font-bold text-[11px] text-slate-800">
                    {movement.debit > 0 ? formatCLP(movement.debit) : '-'}
                  </td>
                  <td className="text-right font-mono font-bold text-[11px] text-slate-800">
                    {movement.credit > 0 ? formatCLP(movement.credit) : '-'}
                  </td>
                </tr>

                {/* Línea 2: Cuenta Contrapartida */}
                <tr className="jde-row-odd">
                  <td className="text-center font-mono text-[10px] font-bold">2</td>
                  <td className="font-mono font-black text-[11px] text-[#002D62]">
                    {movement.contraAccountCode || (movement.debit > 0 ? '1.1.01.03' : '1.1.01.03')}
                  </td>
                  <td className="text-[11px] font-bold text-slate-900">
                    {movement.contraAccountName || (movement.debit > 0 ? 'BANCO DE CHILE - CTA CTE' : 'BANCO DE CHILE - CTA CTE')}
                  </td>
                  <td className="text-right font-mono font-bold text-[11px] text-slate-800">
                    {movement.credit > 0 ? formatCLP(movement.credit) : '-'}
                  </td>
                  <td className="text-right font-mono font-bold text-[11px] text-slate-800">
                    {movement.debit > 0 ? formatCLP(movement.debit) : '-'}
                  </td>
                </tr>

                {/* Totales */}
                <tr className="bg-[#EAF1F8] font-bold border-t-2 border-[#9DB2C3]">
                  <td colSpan={3} className="text-right text-[10px] uppercase font-black text-[#002D62]">
                    Sumas Iguales del Asiento:
                  </td>
                  <td className="text-right font-mono text-[11px] font-black text-emerald-800">
                    {formatCLP(amount)}
                  </td>
                  <td className="text-right font-mono text-[11px] font-black text-emerald-800">
                    {formatCLP(amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Vínculos Operacionales: OT, Propiedad, Proveedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Vínculo Orden de Trabajo (OT) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[9px] font-black text-slate-500 uppercase block tracking-wider mb-1.5 flex items-center gap-1">
                <Wrench size={12} className="text-amber-600" />
                Vínculo con Orden de Trabajo (OT)
              </span>
              {movement.workOrderId || movement.workOrderFolio ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Folio OT:</span>
                    <span className="font-mono font-bold text-[#002D62]">{movement.workOrderFolio || movement.workOrderId}</span>
                  </div>
                  {movement.workOrderSpecialty && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Especialidad:</span>
                      <span className="font-bold text-slate-800">{movement.workOrderSpecialty}</span>
                    </div>
                  )}
                  {movement.associatedInvoice && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Factura / DTE:</span>
                      <span className="font-mono font-bold text-indigo-700">{movement.associatedInvoice}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">No asociado directamente a una OT de mantención</p>
              )}
            </div>

            {/* Vínculo Propiedad Inmueble */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[9px] font-black text-slate-500 uppercase block tracking-wider mb-1.5 flex items-center gap-1">
                <Building2 size={12} className="text-indigo-600" />
                Vínculo con Propiedad Inmueble
              </span>
              {movement.propertyId || movement.propertyAddress ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">ID Activo:</span>
                    <span className="font-mono font-bold text-[#002D62]">{movement.propertyId || 'Varios'}</span>
                  </div>
                  {movement.propertyAddress && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Dirección:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[180px]">{movement.propertyAddress}</span>
                    </div>
                  )}
                  {movement.propertyRole && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">ROL SII:</span>
                      <span className="font-mono font-bold text-slate-700">{movement.propertyRole}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">Movimiento consolidado a nivel de cartera</p>
              )}
            </div>

            {/* Proveedor / Contraparte */}
            {movement.supplierName && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs md:col-span-2">
                <span className="text-[9px] font-black text-slate-500 uppercase block tracking-wider mb-1 flex items-center gap-1">
                  <Briefcase size={12} className="text-emerald-600" />
                  Proveedor / Beneficiario Registrado
                </span>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900">{movement.supplierName}</span>
                  {movement.supplierTaxId && (
                    <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                      RUT: {movement.supplierTaxId}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Auditoría y Trazabilidad */}
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Usuario Creador: <strong className="text-slate-800">{movement.user}</strong></span>
              <span>Timestamp: <strong>{new Date(movement.timestamp).toISOString()}</strong></span>
            </div>
            <div className="flex justify-between">
              <span>Firma Digital SHA-256:</span>
              <span className="font-mono text-indigo-700">{movement.hashSignature || `ASSETFLOW-${movement.id.slice(0, 12).toUpperCase()}`}</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#E8EEF5] border-t border-[#B8CCE0] flex justify-between items-center text-[10px] font-mono text-slate-700">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-700" />
            <span>Auditoría Contable Inmutable • Cumplimiento CMF</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="jde-btn font-bold uppercase flex items-center gap-1 cursor-pointer"
            >
              <Printer size={12} />
              <span>Imprimir</span>
            </button>
            <button 
              onClick={onClose} 
              className="jde-btn jde-btn-primary px-4 font-bold uppercase cursor-pointer"
            >
              Cerrar Ficha
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// ==============================================================================
// MODAL: JDE P09200 - ACCOUNT LEDGER INQUIRY (CONSULTA DE MAYOR AUXILIAR)
// ==============================================================================
const AccountDetailModal: React.FC<{ 
  accountData: AccountBalanceData; 
  onClose: () => void;
  properties?: Property[];
  workOrders?: WorkOrder[];
}> = ({ accountData, onClose, properties = [], workOrders = [] }) => {
  const { account, totalDebit, totalCredit, balance, nature, movements } = accountData;

  // Search & Filter state inside the ledger modal
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DEBITS' | 'CREDITS'>('ALL');
  const [selectedMovementIndex, setSelectedMovementIndex] = useState<number | null>(null);
  const [inspectingMovement, setInspectingMovement] = useState<AccountMovement | null>(null);

  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => a.timestamp - b.timestamp);
  }, [movements]);

  // Calculate running balance for each movement
  const movementsWithRunningBalance = useMemo(() => {
    let running = 0;
    return sortedMovements.map(m => {
      if (nature === 'DEUDOR') {
        running += (m.debit - m.credit);
      } else {
        running += (m.credit - m.debit);
      }
      return {
        ...m,
        runningBalance: running
      };
    });
  }, [sortedMovements, nature]);

  // Filtered movements based on search and type
  const filteredMovements = useMemo(() => {
    return movementsWithRunningBalance.filter(m => {
      // Type filter
      if (filterType === 'DEBITS' && m.debit <= 0) return false;
      if (filterType === 'CREDITS' && m.credit <= 0) return false;

      // Text search
      if (!filterText) return true;
      const term = filterText.toLowerCase();
      return (
        m.voucherNumber.toLowerCase().includes(term) ||
        m.description.toLowerCase().includes(term) ||
        m.user.toLowerCase().includes(term) ||
        m.voucherType.toLowerCase().includes(term) ||
        m.accountCode.toLowerCase().includes(term) ||
        (m.category && m.category.toLowerCase().includes(term)) ||
        (m.workOrderId && m.workOrderId.toLowerCase().includes(term))
      );
    });
  }, [movementsWithRunningBalance, filterText, filterType]);

  return (
    <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-5 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-[1200px] max-h-[94vh] shadow-2xl border border-slate-300 overflow-hidden flex flex-col">
        
        {/* JDE Program Header */}
        <div className="bg-gradient-to-r from-[#002D62] via-[#004B7B] to-[#002D62] p-4 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-lg border border-white/20 flex items-center justify-center shadow-inner">
              <Book size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-amber-300">
                  P09200 • F0911
                </span>
                <h2 className="text-sm md:text-base font-black uppercase tracking-tight">
                  Libro Mayor Auxiliar • {account.code} - {account.name}
                </h2>
              </div>
              <p className="text-[10px] text-blue-100 font-mono mt-0.5">
                Clasificación: {account.type} • {account.subType} | Naturaleza: <span className="font-bold text-amber-200">{nature}</span> | Nivel Jerárquico: {account.level}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* JDE KPI Summary Box */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-[#EAF1F8] border-b border-[#B8CCE0]">
          <div className="bg-white p-2.5 rounded border border-[#9DB2C3] shadow-xs">
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Débitos (Debe)</span>
            <span className="text-sm md:text-base font-mono font-black text-slate-900">{formatCLP(totalDebit)}</span>
          </div>
          <div className="bg-white p-2.5 rounded border border-[#9DB2C3] shadow-xs">
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Créditos (Haber)</span>
            <span className="text-sm md:text-base font-mono font-black text-slate-900">{formatCLP(totalCredit)}</span>
          </div>
          <div className="bg-white p-2.5 rounded border border-[#9DB2C3] shadow-xs">
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Saldo Contable ({nature === 'DEUDOR' ? 'Deudor' : 'Acreedor'})</span>
            <span className={`text-sm md:text-base font-mono font-black ${balance >= 0 ? 'text-[#002D62]' : 'text-rose-600'}`}>
              {formatCLP(balance)}
            </span>
          </div>
          <div className="bg-white p-2.5 rounded border border-[#9DB2C3] shadow-xs">
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Asientos Imputados</span>
            <span className="text-sm md:text-base font-mono font-black text-indigo-700">{movements.length} Registros</span>
          </div>
        </div>

        {/* Search & Filter Toolbar inside Ledger */}
        <div className="bg-[#F4F8FB] px-4 py-2 border-b border-[#B8CCE0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Buscar por comprobante, glosa, cuenta o usuario..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded pl-7 pr-3 py-1 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-[#002D62]"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterType('ALL')}
              className={`jde-btn text-[10px] ${filterType === 'ALL' ? 'jde-btn-primary' : ''}`}
            >
              Todos ({movements.length})
            </button>
            <button
              onClick={() => setFilterType('DEBITS')}
              className={`jde-btn text-[10px] ${filterType === 'DEBITS' ? 'jde-btn-primary' : ''}`}
            >
              Solo Débitos
            </button>
            <button
              onClick={() => setFilterType('CREDITS')}
              className={`jde-btn text-[10px] ${filterType === 'CREDITS' ? 'jde-btn-primary' : ''}`}
            >
              Solo Créditos
            </button>
          </div>
        </div>

        {/* High Density Ledger Grid con Botón de Detalle */}
        <div className="flex-1 overflow-auto custom-scrollbar p-3">
          {filteredMovements.length > 0 ? (
            <table className="jde-grid w-full select-text">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '85px' }}>Fecha</th>
                  <th style={{ width: '105px' }}>N° Comprobante</th>
                  <th style={{ width: '85px' }}>Tipo Doc</th>
                  <th style={{ width: '90px' }}>Cta Imputada</th>
                  <th>Glosa / Concepto Operacional</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Débito (Debe)</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Crédito (Haber)</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Saldo Acumulado</th>
                  <th style={{ width: '100px' }}>Usuario</th>
                  <th style={{ width: '95px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((m, idx) => {
                  const isSelected = selectedMovementIndex === idx;
                  return (
                    <tr 
                      key={`${m.id}-${idx}`} 
                      onClick={() => setSelectedMovementIndex(idx)}
                      onDoubleClick={() => setInspectingMovement(m)}
                      className={`jde-tr cursor-pointer transition-colors ${
                        isSelected 
                          ? 'jde-row-selected' 
                          : idx % 2 === 0 ? 'jde-row-even' : 'jde-row-odd'
                      }`}
                      title="Haga doble clic para abrir la ficha técnica del comprobante"
                    >
                      <td className="text-center font-mono text-[9px] text-slate-500 font-bold">
                        {idx + 1}
                      </td>
                      <td className="font-mono text-[10px] text-slate-600">{m.date}</td>
                      <td className="font-mono font-bold text-[10.5px] text-[#002D62]">{m.voucherNumber}</td>
                      <td className="text-[10px] font-semibold text-slate-700">{m.voucherType}</td>
                      <td className="font-mono text-[10px] font-bold text-indigo-800">{m.accountCode}</td>
                      <td className="text-[10.5px] text-slate-800">
                        <div className="flex flex-col">
                          <span className="font-medium">{m.description}</span>
                          {(m.category || m.workOrderId || m.propertyId) && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {m.category && (
                                <span className="text-[8.5px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-semibold">
                                  {m.category}
                                </span>
                              )}
                              {m.workOrderId && (
                                <span className="text-[8.5px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-mono font-bold">
                                  OT: {m.workOrderId}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="font-mono text-[10.5px] text-right font-medium text-slate-800">
                        {m.debit > 0 ? formatCLP(m.debit) : '-'}
                      </td>
                      <td className="font-mono text-[10.5px] text-right font-medium text-slate-800">
                        {m.credit > 0 ? formatCLP(m.credit) : '-'}
                      </td>
                      <td className={`font-mono text-[10.5px] text-right font-bold ${m.runningBalance >= 0 ? 'text-[#002D62]' : 'text-rose-600'}`}>
                        {formatCLP(m.runningBalance)}
                      </td>
                      <td className="text-[9.5px] text-slate-600 truncate max-w-[100px]" title={m.user}>
                        {m.user}
                      </td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setInspectingMovement(m)}
                          className="jde-btn px-2 py-0.5 text-[9.5px] font-bold text-[#002D62] hover:bg-[#002D62] hover:text-white transition-colors"
                          title="Inspeccionar detalle completo del asiento contable"
                        >
                          <Eye size={10} />
                          <span>Detalle</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Info size={48} className="mb-2 text-slate-300" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                No existen movimientos que coincidan con la búsqueda
              </p>
              <button 
                onClick={() => { setFilterText(''); setFilterType('ALL'); }}
                className="jde-btn mt-3"
              >
                Limpiar Búsqueda
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer con selector activo */}
        <div className="p-3 bg-[#F4F8FB] border-t border-[#B8CCE0] flex justify-between items-center text-[10.5px] text-slate-600 font-mono">
          <div className="flex items-center gap-3">
            <span>AssetFlow Enterprise • F0911 General Ledger</span>
            {selectedMovementIndex !== null && filteredMovements[selectedMovementIndex] && (
              <span className="text-[#002D62] font-bold">
                | Seleccionado: #{filteredMovements[selectedMovementIndex].voucherNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedMovementIndex !== null && filteredMovements[selectedMovementIndex] && (
              <button 
                onClick={() => setInspectingMovement(filteredMovements[selectedMovementIndex])}
                className="jde-btn jde-btn-primary px-3 py-1 font-bold uppercase cursor-pointer flex items-center gap-1"
              >
                <Eye size={12} />
                <span>Ver Ficha del Asiento</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="jde-btn px-4 py-1 font-bold uppercase cursor-pointer"
            >
              Cerrar Ventana
            </button>
          </div>
        </div>
      </div>

      {/* Ficha de Asiento Contable (P0911 Voucher Detail Modal) */}
      {inspectingMovement && (
        <VoucherDetailModal
          movement={inspectingMovement}
          onClose={() => setInspectingMovement(null)}
        />
      )}
    </div>
  );
};

// ==============================================================================
// MODAL: JDE ENTERPRISEONE VISUAL ASSIST (CONSULTA DE MAESTRO DE ATRIBUTO)
// ==============================================================================
interface VisualAssistModalProps {
  type: VisualAssistType;
  onClose: () => void;
  onSelect: (value: string) => void;
  onClear: () => void;
  accountBalancesMap: Map<string, AccountBalanceData>;
}

const VisualAssistModal: React.FC<VisualAssistModalProps> = ({
  type,
  onClose,
  onSelect,
  onClear,
  accountBalancesMap
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Metadata per attribute
  const meta = useMemo(() => {
    switch (type) {
      case 'CODE':
        return {
          title: 'P0901A - Visual Assist: Maestro de Cuentas Contables (F0901)',
          productCode: '09 - GENERAL ACCOUNTING',
          tableCode: 'F0901 - ACCOUNT MASTER',
          dataType: 'VARCHAR (15) - CÓDIGO CONTABLE'
        };
      case 'NAME':
        return {
          title: 'P0901D - Visual Assist: Catálogo Maestro de Denominaciones Contables',
          productCode: '09 - GENERAL ACCOUNTING',
          tableCode: 'F0901D - ACCOUNT GLOSSARY',
          dataType: 'VARCHAR (60) - ALFANUMÉRICO'
        };
      case 'TYPE':
        return {
          title: 'UDC 09/TY - Visual Assist: Tipos de Cuentas Contables',
          productCode: '09 - GENERAL ACCOUNTING',
          tableCode: 'UDC 09/TY - ACCOUNT CLASSIFICATION',
          dataType: 'CODE (10) - CLASE CONTABLE'
        };
      case 'LEVEL':
        return {
          title: 'UDC 09/LV - Visual Assist: Estructura de Niveles Jerárquicos',
          productCode: '09 - GENERAL ACCOUNTING',
          tableCode: 'UDC 09/LV - HIERARCHY LEVELS',
          dataType: 'INT (1..4) - NIVEL DE REPORTE'
        };
      case 'DEBIT':
        return {
          title: 'F0911-DB - Visual Assist: Maestro de Movimientos Débitos / Cargos (Debe)',
          productCode: '09 - GENERAL ACCOUNTING',
          tableCode: 'F0911 - GENERAL LEDGER (DEBITS)',
          dataType: 'CURRENCY (CLP) - DÉBITOS'
        };
      case 'CREDIT':
        return {
          title: 'F0911-CR - Visual Assist: Maestro de Movimientos Créditos / Abonos (Haber)',
          productCode: '09 - GENERAL ACCOUNTING',
          tableCode: 'F0911 - GENERAL LEDGER (CREDITS)',
          dataType: 'CURRENCY (CLP) - CRÉDITOS'
        };
      case 'BALANCE':
        return {
          title: 'F0902 - Visual Assist: Maestro de Rangos y Consulta de Saldos Contables',
          productCode: '09 - GENERAL ACCOUNTING',
          tableCode: 'F0902 - ACCOUNT BALANCES',
          dataType: 'RANGE (CLP) - SALDO CONTABLE'
        };
      case 'NATURE':
        return {
          title: 'UDC 09/NA - Visual Assist: Naturaleza de Saldo (Deudor vs Acreedor)',
          productCode: '09 - GENERAL ACCOUNTING',
          tableCode: 'UDC 09/NA - NORMAL BALANCE',
          dataType: 'CHAR (1) - D/A'
        };
    }
  }, [type]);

  // Items dataset per attribute type
  const items = useMemo(() => {
    switch (type) {
      case 'CODE':
      case 'NAME':
        return CHART_OF_ACCOUNTS.map(acc => {
          const bal = accountBalancesMap.get(acc.code);
          return {
            key: acc.code,
            code: acc.code,
            label: acc.name,
            sub: `${acc.type} • Nivel ${acc.level}`,
            value: type === 'CODE' ? acc.code : acc.name,
            extra: bal ? formatCLP(bal.balance) : '$0',
            nature: bal?.nature
          };
        });

      case 'TYPE':
        return [
          { key: 'ACTIVO', code: 'ACTIVO', label: 'ACTIVOS', sub: 'Recursos económicos controlados por la entidad', value: 'ACTIVO', extra: 'Naturaleza Deudora', nature: 'DEUDOR' },
          { key: 'PASIVO', code: 'PASIVO', label: 'PASIVOS', sub: 'Obligaciones actuales exigibles a terceros', value: 'PASIVO', extra: 'Naturaleza Acreedora', nature: 'ACREEDOR' },
          { key: 'PATRIMONIO', code: 'PATRIMONIO', label: 'PATRIMONIO', sub: 'Parte residual de los activos deducidos los pasivos', value: 'PATRIMONIO', extra: 'Naturaleza Acreedora', nature: 'ACREEDOR' },
          { key: 'INGRESOS', code: 'INGRESOS', label: 'INGRESOS', sub: 'Incrementos en beneficios económicos del ejercicio', value: 'INGRESOS', extra: 'Naturaleza Acreedora', nature: 'ACREEDOR' },
          { key: 'EGRESOS', code: 'EGRESOS', label: 'EGRESOS', sub: 'Gastos, costos y depreciaciones operacionales', value: 'EGRESOS', extra: 'Naturaleza Deudora', nature: 'DEUDOR' },
        ];

      case 'LEVEL':
        return [
          { key: '1', code: 'Nivel 1', label: 'CUENTA MAYOR PRINCIPAL / CLASE', sub: 'Totalizadores máximos (1. Activos, 2. Pasivos, 3. Patrimonio, 4. Ingresos, 5. Egresos)', value: '1', extra: 'Consolidación L1' },
          { key: '2', code: 'Nivel 2', label: 'GRUPO CONTABLE / CLASIFICACIÓN', sub: 'Subtotales (1.1 Corrientes, 1.2 No Corrientes, 4.1 Arriendos, 5.1 Mantenciones)', value: '2', extra: 'Consolidación L2' },
          { key: '3', code: 'Nivel 3', label: 'SUBGRUPO / RUBRO ESPECÍFICO', sub: 'Cuentas de control agregado (1.1.01 Efectivo, 1.1.02 CxC Arriendos)', value: '3', extra: 'Consolidación L3' },
          { key: '4', code: 'Nivel 4', label: 'CUENTA TERMINAL / AUXILIAR IMPUTABLE', sub: 'Cuentas de último nivel donde se imputan los asientos directos', value: '4', extra: 'Imputación Directa' },
        ];

      case 'DEBIT':
        return CHART_OF_ACCOUNTS.filter(acc => (accountBalancesMap.get(acc.code)?.totalDebit || 0) > 0).map(acc => {
          const bal = accountBalancesMap.get(acc.code)!;
          return {
            key: acc.code,
            code: acc.code,
            label: acc.name,
            sub: `${acc.type} • ${bal.movementCount} movimientos directos o imputados`,
            value: acc.code,
            extra: formatCLP(bal.totalDebit),
            nature: 'DEUDOR'
          };
        });

      case 'CREDIT':
        return CHART_OF_ACCOUNTS.filter(acc => (accountBalancesMap.get(acc.code)?.totalCredit || 0) > 0).map(acc => {
          const bal = accountBalancesMap.get(acc.code)!;
          return {
            key: acc.code,
            code: acc.code,
            label: acc.name,
            sub: `${acc.type} • ${bal.movementCount} movimientos directos o imputados`,
            value: acc.code,
            extra: formatCLP(bal.totalCredit),
            nature: 'ACREEDOR'
          };
        });

      case 'BALANCE':
        return [
          { key: 'ALL', code: 'TODOS', label: 'Mostrar Todos los Saldos', sub: 'Sin restricción de saldo mínimo', value: '', extra: 'Filtro Libre' },
          { key: 'MIN_1', code: 'SALDO > 0', label: 'Solo Cuentas con Saldo Positivo', sub: 'Filtra cuentas con balances activos mayores a $0', value: '1', extra: '> $0' },
          { key: 'MIN_1M', code: '> $1.000.000', label: 'Saldos Superiores a 1 Millón CLP', sub: 'Cuentas con saldo mayor o igual a $1.000.000', value: '1000000', extra: '>= $1.000.000' },
          { key: 'MIN_10M', code: '> $10.000.000', label: 'Saldos Superiores a 10 Millones CLP', sub: 'Cuentas con saldo mayor o igual a $10.000.000', value: '10000000', extra: '>= $10.000.000' },
          { key: 'MIN_100M', code: '> $100.000.000', label: 'Cuentas de Alto Patrimonio / Valor', sub: 'Cuentas con saldo mayor o igual a $100.000.000', value: '100000000', extra: '>= $100.000.000' },
        ];

      case 'NATURE':
        return [
          { key: 'D', code: 'D', label: 'DEUDOR', sub: 'Saldo normal al Debe (Aumenta por Débitos, disminuye por Créditos)', value: 'D', extra: 'Activos / Egresos' },
          { key: 'A', code: 'A', label: 'ACREEDOR', sub: 'Saldo normal al Haber (Aumenta por Créditos, disminuye por Débitos)', value: 'A', extra: 'Pasivos / Patrimonio / Ingresos' },
        ];
    }
  }, [type, accountBalancesMap]);

  // Filtered by internal modal search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(it => 
      it.code.toLowerCase().includes(term) || 
      it.label.toLowerCase().includes(term) ||
      it.sub.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  const handleConfirm = () => {
    if (selectedIndex !== null && filteredItems[selectedIndex]) {
      onSelect(filteredItems[selectedIndex].value);
      onClose();
    } else {
      alert('Por favor seleccione un elemento de la grilla antes de confirmar.');
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#f0f4f9] rounded-xl w-full max-w-3xl shadow-2xl border-4 border-[#002D62] overflow-hidden flex flex-col h-[75vh] animate-in zoom-in-95 font-sans">
        
        {/* ERP Classic Header */}
        <div className="bg-[#002D62] px-6 py-3.5 text-white flex justify-between items-center border-b-2 border-amber-500 shadow-md">
          <div className="flex items-center gap-3">
            <Database size={20} className="text-amber-400" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight">
                {meta.title}
              </h3>
              <p className="text-[9.5px] text-blue-200 uppercase font-mono font-bold tracking-wider">
                Tablas Maestras AssetFlow Enterprise • Contabilidad y Finanzas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Technical Metadata Box */}
        <div className="bg-white border-b border-slate-300 p-3 grid grid-cols-3 gap-3 text-[10px] text-slate-800">
          <div className="bg-slate-50 p-2 border border-slate-200 rounded">
            <span className="block text-[8px] text-slate-500 font-extrabold uppercase">CÓDIGO DE SISTEMA</span>
            <span className="font-mono font-black text-[#002D62]">{meta.productCode}</span>
          </div>
          <div className="bg-slate-50 p-2 border border-slate-200 rounded">
            <span className="block text-[8px] text-slate-500 font-extrabold uppercase">TABLA MAESTRA</span>
            <span className="font-mono font-black text-[#002D62]">{meta.tableCode}</span>
          </div>
          <div className="bg-slate-50 p-2 border border-slate-200 rounded">
            <span className="block text-[8px] text-slate-500 font-extrabold uppercase">TIPO DE DATO</span>
            <span className="font-mono font-bold text-slate-700">{meta.dataType}</span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirm}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 border-b-2 border-emerald-950 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-xs active:translate-y-px transition-all"
            >
              <CheckCircle size={12} className="stroke-[3]" /> Seleccionar (Select)
            </button>
            <button
              onClick={() => {
                onClear();
                onClose();
              }}
              className="bg-rose-700 hover:bg-rose-800 text-white px-3.5 py-1.5 border-b-2 border-rose-950 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-xs active:translate-y-px transition-all"
            >
              <X size={12} /> Limpiar Filtro (Clear)
            </button>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Buscar en el maestro..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedIndex(null);
              }}
              className="w-full bg-white border border-slate-300 rounded pl-7 pr-3 py-1 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-[#002D62]"
            />
          </div>
        </div>

        {/* Master High-Density Table */}
        <div className="flex-1 overflow-auto custom-scrollbar p-3 bg-white">
          <table className="jde-grid">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                <th style={{ width: '130px' }}>Código / Valor</th>
                <th>Descripción / Denominación Oficial</th>
                <th>Definición Normativa / Detalle</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Valor / Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((it, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <tr
                      key={it.key}
                      onClick={() => setSelectedIndex(idx)}
                      onDoubleClick={() => {
                        onSelect(it.value);
                        onClose();
                      }}
                      className={`jde-tr cursor-pointer transition-colors ${
                        isSelected 
                          ? 'jde-row-selected' 
                          : idx % 2 === 0 ? 'jde-row-even' : 'jde-row-odd'
                      }`}
                    >
                      <td className="text-center font-mono text-[9px] text-slate-500 font-bold">
                        {idx + 1}
                      </td>
                      <td className="font-mono font-bold text-[11px] text-[#002D62]">
                        {it.code}
                      </td>
                      <td className="font-bold text-[11px] text-slate-900">
                        {it.label}
                      </td>
                      <td className="text-[10px] text-slate-600">
                        {it.sub}
                      </td>
                      <td className="font-mono font-bold text-[10.5px] text-right text-slate-800">
                        {it.extra || '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Info size={32} className="mx-auto mb-2 text-slate-300" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500 block">
                      No se encontraron registros en el maestro con el filtro actual
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-2 flex justify-between items-center text-[10px] text-slate-600 font-mono">
          <span>Visual Assist v9.11 • [Doble clic o Enter para confirmar selección]</span>
          <button
            onClick={onClose}
            className="jde-btn font-bold uppercase cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

// Column definitions for JDE P986110S Sort Sequence Modal
const ACCOUNT_SORT_COLUMNS: JDESortColumnOption[] = [
  { key: 'code', label: 'Código Cuenta (F0901)' },
  { key: 'name', label: 'Descripción / Denominación de Cuenta' },
  { key: 'type', label: 'Tipo de Cuenta (Clase Contable)' },
  { key: 'level', label: 'Nivel Jerárquico (1 a 4)' },
  { key: 'totalDebit', label: 'Total Débitos (Debe)' },
  { key: 'totalCredit', label: 'Total Créditos (Haber)' },
  { key: 'balance', label: 'Saldo Contable' },
  { key: 'nature', label: 'Naturaleza (Deudor / Acreedor)' }
];

// ==============================================================================
// COMPONENTE PRINCIPAL: PLAN DE CUENTAS CON BALANCES EN TIEMPO REAL (JDE P0901)
// ==============================================================================
const ChartOfAccountsModule: React.FC<ChartOfAccountsModuleProps> = ({ 
  transactions = [],
  properties = [],
  workOrders = [],
  leaseContracts = [],
  pettyCashExpenses = [],
  currentUser = 'SISTEMA'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set(['1', '1.1', '1.2', '2', '2.1', '3', '4', '4.1', '5', '5.1', '5.2']));
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedAccountData, setSelectedAccountData] = useState<AccountBalanceData | null>(null);
  const [onlyWithBalance, setOnlyWithBalance] = useState<boolean>(false);
  const [showSortModal, setShowSortModal] = useState<boolean>(false);

  // Active Visual Assist Modal state
  const [activeVisualAssist, setActiveVisualAssist] = useState<VisualAssistType | null>(null);

  // QBE (Query-By-Example) Column Filters
  const [qbeCode, setQbeCode] = useState('');
  const [qbeName, setQbeName] = useState('');
  const [qbeType, setQbeType] = useState('');
  const [qbeLevel, setQbeLevel] = useState('');
  const [qbeMinBalance, setQbeMinBalance] = useState('');
  const [qbeNature, setQbeNature] = useState('');

  // ----------------------------------------------------------------------------
  // MOTOR DE CÁLCULO DE BALANCES CONTABLES EN TIEMPO REAL (ENRIQUECIDO)
  // ----------------------------------------------------------------------------
  const accountBalancesMap = useMemo(() => {
    // 1. Inicializar mapa de terminales y cuentas con acumuladores directos
    const directMovementsMap = new Map<string, AccountMovement[]>();
    CHART_OF_ACCOUNTS.forEach(acc => {
      directMovementsMap.set(acc.code, []);
    });

    const addMovement = (accCode: string, movement: AccountMovement) => {
      if (directMovementsMap.has(accCode)) {
        directMovementsMap.get(accCode)!.push(movement);
      } else {
        // Fallback a cuenta nivel 3 o 2 si la terminal exacta no existe
        const parentCandidate = CHART_OF_ACCOUNTS.find(a => accCode.startsWith(a.code) && a.level === 4) ||
                               CHART_OF_ACCOUNTS.find(a => accCode.startsWith(a.code));
        if (parentCandidate && directMovementsMap.has(parentCandidate.code)) {
          directMovementsMap.get(parentCandidate.code)!.push({ ...movement, accountCode: parentCandidate.code });
        }
      }
    };

    // 2. Procesar Transacciones Financieras (`transactions`)
    transactions.forEach(t => {
      if (t.status === 'ANULADA') return;

      const voucher = t.documentNumber || `AS-${t.id.slice(0, 6).toUpperCase()}`;
      const docType = t.documentType || (t.type === 'INCOME' ? 'INGRESO' : 'EGRESO');
      const dateStr = t.date || new Date(t.timestamp).toLocaleDateString('es-CL');

      // Cross-reference WorkOrder & Property metadata
      const linkedWO = workOrders.find(w => w.id === t.workOrderId || w.folio === t.workOrderId);
      const linkedProp = properties.find(p => p.id === t.propertyId);

      const propAddress = linkedProp ? `${linkedProp.address}, ${linkedProp.commune}` : undefined;
      const propRole = linkedProp?.propertyRole;

      const woFolio = linkedWO ? linkedWO.folio : t.workOrderId;
      const woSpecialty = linkedWO ? linkedWO.specialty : undefined;
      const assocInvoice = linkedWO ? linkedWO.associatedInvoice : (t.documentNumber || undefined);
      const supplierName = t.supplierName || (linkedWO ? linkedWO.supplierName : undefined);
      const supplierTaxId = t.supplierTaxId || (linkedWO ? linkedWO.supplierTaxId : undefined);

      if (t.accountCode && directMovementsMap.has(t.accountCode)) {
        // Imputación directa especificada
        const targetAcc = CHART_OF_ACCOUNTS.find(a => a.code === t.accountCode);
        const isDebit = t.type === 'EXPENSE' || (targetAcc && targetAcc.type === 'ACTIVO');
        
        addMovement(t.accountCode, {
          id: t.id,
          date: dateStr,
          timestamp: t.timestamp,
          voucherNumber: voucher,
          voucherType: docType,
          description: t.description || 'Movimiento Financiero Registrado',
          debit: isDebit ? t.amount : 0,
          credit: !isDebit ? t.amount : 0,
          user: t.user || 'SISTEMA',
          category: t.category,
          propertyId: t.propertyId,
          propertyAddress: propAddress,
          propertyRole: propRole,
          workOrderId: t.workOrderId,
          workOrderFolio: woFolio,
          workOrderSpecialty: woSpecialty,
          associatedInvoice: assocInvoice,
          supplierName: supplierName,
          supplierTaxId: supplierTaxId,
          accountCode: t.accountCode,
          accountName: targetAcc?.name,
          contraAccountCode: '1.1.01.03',
          contraAccountName: 'BANCO DE CHILE - CTA CTE',
          hashSignature: t.hashSignature
        });

        // Contrapartida contable a Banco (1.1.01.03) para cuadratura de partida doble
        addMovement('1.1.01.03', {
          id: `${t.id}-contra`,
          date: dateStr,
          timestamp: t.timestamp,
          voucherNumber: voucher,
          voucherType: 'CONTRAPARTIDA_BANCO',
          description: `Contraasiento: ${t.description || 'Movimiento en Cuenta Corriente'}`,
          debit: !isDebit ? t.amount : 0,
          credit: isDebit ? t.amount : 0,
          user: t.user || 'SISTEMA',
          category: t.category,
          propertyId: t.propertyId,
          propertyAddress: propAddress,
          propertyRole: propRole,
          workOrderId: t.workOrderId,
          workOrderFolio: woFolio,
          workOrderSpecialty: woSpecialty,
          associatedInvoice: assocInvoice,
          supplierName: supplierName,
          supplierTaxId: supplierTaxId,
          accountCode: '1.1.01.03',
          accountName: 'BANCO DE CHILE - CTA CTE',
          contraAccountCode: t.accountCode,
          contraAccountName: targetAcc?.name,
          hashSignature: t.hashSignature
        });
      } else {
        // Imputación automática inteligente según reglas contables de negocio
        if (t.type === 'INCOME') {
          // Arriendos Habitacionales (4.1.01) o Comerciales (4.1.02)
          const isComercial = (t.category && t.category.toLowerCase().includes('comercial')) || 
                              (t.description && t.description.toLowerCase().includes('comercial'));
          const incomeAccount = isComercial ? '4.1.02' : '4.1.01';
          const incomeAccObj = CHART_OF_ACCOUNTS.find(a => a.code === incomeAccount);

          // Ingreso: Crédito a cuenta de resultado
          addMovement(incomeAccount, {
            id: t.id,
            date: dateStr,
            timestamp: t.timestamp,
            voucherNumber: voucher,
            voucherType: docType,
            description: t.description || 'Ingreso por Arriendo Devengado',
            debit: 0,
            credit: t.amount,
            user: t.user || 'SISTEMA',
            category: t.category,
            propertyId: t.propertyId,
            propertyAddress: propAddress,
            propertyRole: propRole,
            accountCode: incomeAccount,
            accountName: incomeAccObj?.name,
            contraAccountCode: '1.1.01.03',
            contraAccountName: 'BANCO DE CHILE - CTA CTE'
          });

          // Banco: Débito a activo disponible
          addMovement('1.1.01.03', {
            id: `${t.id}-banco`,
            date: dateStr,
            timestamp: t.timestamp,
            voucherNumber: voucher,
            voucherType: 'BANCO_TEF',
            description: `Recaudación Ingreso: ${t.description || 'Depósito en Banco de Chile'}`,
            debit: t.amount,
            credit: 0,
            user: t.user || 'SISTEMA',
            category: t.category,
            propertyId: t.propertyId,
            propertyAddress: propAddress,
            propertyRole: propRole,
            accountCode: '1.1.01.03',
            accountName: 'BANCO DE CHILE - CTA CTE',
            contraAccountCode: incomeAccount,
            contraAccountName: incomeAccObj?.name
          });
        } else {
          // Egresos y Gastos Operacionales
          let expenseAccount = '5.1.01'; // Default: Mantención y Reparaciones
          const desc = (t.description + ' ' + (t.category || '')).toLowerCase();

          if (desc.includes('contribuc')) {
            expenseAccount = '5.1.02';
          } else if (desc.includes('seguro')) {
            expenseAccount = '5.1.03';
          } else if (desc.includes('sueldo') || desc.includes('remunerac')) {
            expenseAccount = '5.2.01';
          } else if (desc.includes('honorari')) {
            expenseAccount = '5.2.02';
          } else if (desc.includes('oficina') || desc.includes('utiles') || desc.includes('admin')) {
            expenseAccount = '5.2.03';
          }

          const expenseAccObj = CHART_OF_ACCOUNTS.find(a => a.code === expenseAccount);

          // Egreso: Débito a cuenta de resultado pérdida
          addMovement(expenseAccount, {
            id: t.id,
            date: dateStr,
            timestamp: t.timestamp,
            voucherNumber: voucher,
            voucherType: docType,
            description: t.description || 'Egreso Operacional Imputado',
            debit: t.amount,
            credit: 0,
            user: t.user || 'SISTEMA',
            category: t.category,
            propertyId: t.propertyId,
            propertyAddress: propAddress,
            propertyRole: propRole,
            workOrderId: t.workOrderId,
            workOrderFolio: woFolio,
            workOrderSpecialty: woSpecialty,
            associatedInvoice: assocInvoice,
            supplierName: supplierName,
            supplierTaxId: supplierTaxId,
            accountCode: expenseAccount,
            accountName: expenseAccObj?.name,
            contraAccountCode: '1.1.01.03',
            contraAccountName: 'BANCO DE CHILE - CTA CTE'
          });

          // Banco: Crédito a activo disponible
          addMovement('1.1.01.03', {
            id: `${t.id}-banco-egreso`,
            date: dateStr,
            timestamp: t.timestamp,
            voucherNumber: voucher,
            voucherType: 'BANCO_EGRESO',
            description: `Pago Egreso: ${t.description || 'Transferencia TEF Proveedor'}`,
            debit: 0,
            credit: t.amount,
            user: t.user || 'SISTEMA',
            category: t.category,
            propertyId: t.propertyId,
            propertyAddress: propAddress,
            propertyRole: propRole,
            workOrderId: t.workOrderId,
            workOrderFolio: woFolio,
            workOrderSpecialty: woSpecialty,
            associatedInvoice: assocInvoice,
            supplierName: supplierName,
            supplierTaxId: supplierTaxId,
            accountCode: '1.1.01.03',
            accountName: 'BANCO DE CHILE - CTA CTE',
            contraAccountCode: expenseAccount,
            contraAccountName: expenseAccObj?.name
          });
        }
      }
    });

    // 3. Procesar Gastos de Caja Chica (`pettyCashExpenses`)
    pettyCashExpenses.forEach((exp: any) => {
      const amt = Number(exp.amount) || 0;
      if (amt <= 0) return;

      const dateStr = exp.date || new Date(exp.timestamp || Date.now()).toLocaleDateString('es-CL');
      const voucher = exp.documentNumber || `CCH-${String(exp.id).slice(0, 6).toUpperCase()}`;

      // Gasto de oficina (5.2.03) -> Débito
      addMovement('5.2.03', {
        id: `cch-${exp.id}`,
        date: dateStr,
        timestamp: exp.timestamp || Date.now(),
        voucherNumber: voucher,
        voucherType: exp.documentType || 'COMPROBANTE_CAJA',
        description: `Caja Chica: ${exp.description || 'Gasto menor de oficina'}`,
        debit: amt,
        credit: 0,
        user: exp.userCreator || 'SISTEMA',
        category: exp.category || 'CAJA_CHICA',
        supplierName: exp.supplierName,
        supplierTaxId: exp.supplierTaxId,
        accountCode: '5.2.03',
        accountName: 'GASTOS DE OFICINA',
        contraAccountCode: '1.1.01.02',
        contraAccountName: 'CAJA CHICA OFICINA'
      });

      // Caja Chica Oficina (1.1.01.02) -> Crédito
      addMovement('1.1.01.02', {
        id: `cch-haber-${exp.id}`,
        date: dateStr,
        timestamp: exp.timestamp || Date.now(),
        voucherNumber: voucher,
        voucherType: 'EGRESO_CAJA_CHICA',
        description: `Rendición de Fondos: ${exp.description || 'Rendición de Caja Chica'}`,
        debit: 0,
        credit: amt,
        user: exp.userCreator || 'SISTEMA',
        category: 'CAJA_CHICA',
        supplierName: exp.supplierName,
        supplierTaxId: exp.supplierTaxId,
        accountCode: '1.1.01.02',
        accountName: 'CAJA CHICA OFICINA',
        contraAccountCode: '5.2.03',
        contraAccountName: 'GASTOS DE OFICINA'
      });
    });

    // 4. Incorporar Activos Inmobiliarios de la Cartera (`properties`)
    let totalPropLandValue = 0;
    let totalPropBuiltValue = 0;

    properties.forEach(p => {
      const val = p.financialData?.currentBookValueCLP || p.appraisalValue || (p.rentalAmount ? p.rentalAmount * 150 : 0);
      if (val > 0) {
        totalPropLandValue += Math.round(val * 0.25);
        totalPropBuiltValue += Math.round(val * 0.75);
      }
    });

    if (totalPropLandValue > 0) {
      addMovement('1.2.01.01', {
        id: 'prop-land-portfolio',
        date: new Date().toLocaleDateString('es-CL'),
        timestamp: Date.now(),
        voucherNumber: 'INV-TERRENOS',
        voucherType: 'INVENTARIO_ACTIVOS',
        description: `Valor Libro Cartera Terrenos (${properties.length} Propiedades)`,
        debit: totalPropLandValue,
        credit: 0,
        user: 'CONTROL_INTERNO',
        accountCode: '1.2.01.01',
        accountName: 'TERRENOS',
        contraAccountCode: '3.1',
        contraAccountName: 'CAPITAL PAGADO'
      });
    }

    if (totalPropBuiltValue > 0) {
      addMovement('1.2.01.02', {
        id: 'prop-built-portfolio',
        date: new Date().toLocaleDateString('es-CL'),
        timestamp: Date.now(),
        voucherNumber: 'INV-EDIFICIOS',
        voucherType: 'INVENTARIO_ACTIVOS',
        description: `Valor Libro Cartera Construcciones (${properties.length} Propiedades)`,
        debit: totalPropBuiltValue,
        credit: 0,
        user: 'CONTROL_INTERNO',
        accountCode: '1.2.01.02',
        accountName: 'EDIFICIOS Y CONSTRUCCIONES',
        contraAccountCode: '3.1',
        contraAccountName: 'CAPITAL PAGADO'
      });

      // Contrapartida al Capital Social (3.1)
      addMovement('3.1', {
        id: 'prop-capital-equity',
        date: new Date().toLocaleDateString('es-CL'),
        timestamp: Date.now(),
        voucherNumber: 'CAP-INVERSION',
        voucherType: 'PATRIMONIO_INICIAL',
        description: `Aporte de Capital Representativo de Cartera Inmobiliaria`,
        debit: 0,
        credit: totalPropLandValue + totalPropBuiltValue,
        user: 'CONTROL_INTERNO',
        accountCode: '3.1',
        accountName: 'CAPITAL PAGADO',
        contraAccountCode: '1.2.01',
        contraAccountName: 'PROPIEDADES DE INVERSIÓN'
      });
    }

    // 5. CÁLCULO JERÁRQUICO CON ROLLUP (NIVELES 4, 3, 2, 1)
    const resultBalances = new Map<string, AccountBalanceData>();

    CHART_OF_ACCOUNTS.forEach(account => {
      const isNatureDebit = account.type === 'ACTIVO' || account.type === 'EGRESOS';
      const nature: 'DEUDOR' | 'ACREEDOR' = isNatureDebit ? 'DEUDOR' : 'ACREEDOR';

      // Obtener todos los movimientos propios y de cuentas hijas cuyo código comience con account.code
      let accDebits = 0;
      let accCredits = 0;
      const accMovements: AccountMovement[] = [];

      CHART_OF_ACCOUNTS.forEach(candidate => {
        if (candidate.code === account.code || candidate.code.startsWith(account.code + '.')) {
          const movs = directMovementsMap.get(candidate.code) || [];
          movs.forEach(m => {
            accDebits += m.debit;
            accCredits += m.credit;
            accMovements.push(m);
          });
        }
      });

      // Saldo Contable según naturaleza contable
      const balance = isNatureDebit ? (accDebits - accCredits) : (accCredits - accDebits);

      resultBalances.set(account.code, {
        account,
        totalDebit: accDebits,
        totalCredit: accCredits,
        balance,
        nature,
        movementCount: accMovements.length,
        movements: accMovements
      });
    });

    return resultBalances;
  }, [transactions, properties, workOrders, leaseContracts, pettyCashExpenses]);

  // ----------------------------------------------------------------------------
  // TOTALES DE CONTROL Y ECUACIÓN PATRIMONIAL (KPI STRIP)
  // ----------------------------------------------------------------------------
  const accountingSummary = useMemo(() => {
    const act = accountBalancesMap.get('1')?.balance || 0;
    const pas = accountBalancesMap.get('2')?.balance || 0;
    const pat = accountBalancesMap.get('3')?.balance || 0;
    const ing = accountBalancesMap.get('4')?.balance || 0;
    const egr = accountBalancesMap.get('5')?.balance || 0;
    const resultadoEjercicio = ing - egr;
    const diferenciaEcuacion = act - (pas + pat + resultadoEjercicio);

    return {
      activos: act,
      pasivos: pas,
      patrimonio: pat,
      ingresos: ing,
      egresos: egr,
      resultadoEjercicio,
      diferenciaEcuacion,
      isCuadrado: Math.abs(diferenciaEcuacion) < 1
    };
  }, [accountBalancesMap]);

  // ----------------------------------------------------------------------------
  // FILTRADO QBE Y ARBOL JERÁRQUICO
  // ----------------------------------------------------------------------------
  const toggleExpand = (code: string) => {
    const newExpanded = new Set(expandedCodes);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedCodes(newExpanded);
  };

  const expandAll = () => {
    const allParentCodes = CHART_OF_ACCOUNTS
      .filter(a => CHART_OF_ACCOUNTS.some(c => c.parentCode === a.code))
      .map(a => a.code);
    setExpandedCodes(new Set(allParentCodes));
  };

  const collapseAll = () => {
    setExpandedCodes(new Set());
  };

  const clearAllQbe = () => {
    setQbeCode('');
    setQbeName('');
    setQbeType('');
    setQbeLevel('');
    setQbeMinBalance('');
    setQbeNature('');
    setSearchTerm('');
    setFilterType('ALL');
    setOnlyWithBalance(false);
  };

  const isQbeActive = Boolean(
    qbeCode || qbeName || qbeType || qbeLevel || qbeMinBalance || qbeNature || searchTerm || filterType !== 'ALL' || onlyWithBalance
  );

  const filteredAccountsWithBalance = useMemo(() => {
    return CHART_OF_ACCOUNTS.map(acc => {
      const data = accountBalancesMap.get(acc.code)!;
      return data;
    }).filter(item => {
      const acc = item.account;

      // Filtro de Texto General
      const matchesSearch = !searchTerm || 
        acc.code.includes(searchTerm) || 
        acc.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'ALL' || acc.type === filterType;

      // ERP QBE Column filters
      const matchesQbeCode = !qbeCode || acc.code.toLowerCase().includes(qbeCode.toLowerCase());
      const matchesQbeName = !qbeName || acc.name.toLowerCase().includes(qbeName.toLowerCase());
      const matchesQbeType = !qbeType || acc.type.toLowerCase().includes(qbeType.toLowerCase());
      const matchesQbeLevel = !qbeLevel || acc.level.toString() === qbeLevel.trim();

      // QBE Nature filter
      const matchesQbeNature = !qbeNature || 
        (qbeNature.toUpperCase() === 'D' && item.nature === 'DEUDOR') ||
        (qbeNature.toUpperCase() === 'A' && item.nature === 'ACREEDOR');

      // QBE Min Balance filter
      let matchesMinBalance = true;
      if (qbeMinBalance) {
        const minVal = parseFloat(qbeMinBalance.replace(/[^0-9.-]/g, ''));
        if (!isNaN(minVal)) {
          matchesMinBalance = Math.abs(item.balance) >= minVal;
        }
      }

      // Solo con saldo / movimientos
      const matchesOnlyBalance = !onlyWithBalance || item.totalDebit > 0 || item.totalCredit > 0 || item.balance !== 0;

      return matchesSearch && matchesType && matchesQbeCode && matchesQbeName && matchesQbeType && matchesQbeLevel && matchesQbeNature && matchesMinBalance && matchesOnlyBalance;
    });
  }, [accountBalancesMap, searchTerm, filterType, qbeCode, qbeName, qbeType, qbeLevel, qbeNature, qbeMinBalance, onlyWithBalance]);

  // Estructura visible de árbol
  const visibleAccounts = useMemo(() => {
    if (isQbeActive) {
      return filteredAccountsWithBalance;
    }

    const result: AccountBalanceData[] = [];
    const addChildren = (parentCode?: string) => {
      const children = CHART_OF_ACCOUNTS.filter(acc => acc.parentCode === parentCode);
      children.forEach(child => {
        const itemData = accountBalancesMap.get(child.code);
        if (itemData) {
          result.push(itemData);
          if (expandedCodes.has(child.code)) {
            addChildren(child.code);
          }
        }
      });
    };

    addChildren(undefined);
    return result;
  }, [isQbeActive, filteredAccountsWithBalance, accountBalancesMap, expandedCodes]);

  // ----------------------------------------------------------------------------
  // ORDENAMIENTO ESTILO JDE ENTERPRISEONE (P986110S)
  // Ciclo Oficial: 1° Clic: Mayor a Menor (desc) | 2° Clic: Menor a Mayor (asc) | 3° Clic: Restablecer
  // ----------------------------------------------------------------------------
  const accountExtractors = useMemo(() => ({
    code: (item: AccountBalanceData) => item.account.code,
    name: (item: AccountBalanceData) => item.account.name,
    type: (item: AccountBalanceData) => item.account.type,
    level: (item: AccountBalanceData) => item.account.level,
    totalDebit: (item: AccountBalanceData) => item.totalDebit,
    totalCredit: (item: AccountBalanceData) => item.totalCredit,
    balance: (item: AccountBalanceData) => item.balance,
    nature: (item: AccountBalanceData) => item.nature
  }), []);

  const {
    sortedData: sortedFilteredAccounts,
    primarySort,
    secondarySort,
    requestSort,
    clearSort,
    setManualMultiSort,
    getSortState,
    isSorted
  } = useJDESort<AccountBalanceData>(filteredAccountsWithBalance);

  const handleAccountSort = (columnKey: string) => {
    const extractor = (accountExtractors as any)[columnKey];
    requestSort(columnKey, { extractor });
  };

  // Cuando la grilla está ordenada explícitamente, se visualiza la lista plana ordenada según el criterio JDE.
  // Al restablecer el orden (3er clic / reset), retorna a la estructura de árbol jerárquica natural.
  const displayAccounts = isSorted ? sortedFilteredAccounts : visibleAccounts;

  // ----------------------------------------------------------------------------
  // EXPORTACIONES A EXCEL Y PDF CON BALANCES
  // ----------------------------------------------------------------------------
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Plan de Cuentas y Balances');

      // Title block
      worksheet.mergeCells('A1:I1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'ASSETFLOW ENTERPRISE - CORPORACIÓN INMOBILIARIA';
      titleCell.font = { name: 'Arial Black', size: 13, color: { argb: 'FF002D62' } };

      worksheet.mergeCells('A2:I2');
      const subTitleCell = worksheet.getCell('A2');
      subTitleCell.value = 'MAESTRO DE PLAN DE CUENTAS Y BALANCES EN TIEMPO REAL (JDE P0901 / F0902)';
      subTitleCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };

      worksheet.mergeCells('A3:I3');
      const dateCell = worksheet.getCell('A3');
      dateCell.value = `Fecha de Consulta: ${new Date().toLocaleString('es-CL')} | Usuario: ${currentUser} | Ecuación: ${accountingSummary.isCuadrado ? 'CUADRADA [OK]' : 'DESCUADRADA'}`;
      dateCell.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF64748B' } };

      worksheet.addRow([]); // Blank row

      // Headers row
      const headers = ['Código', 'Nombre de Cuenta', 'Tipo', 'Clasificación', 'Niv', 'Total Débitos (Debe)', 'Total Créditos (Haber)', 'Saldo Contable', 'Nat'];
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF002D62' } // JDE Navy
        };
        cell.font = {
          name: 'Segoe UI',
          bold: true,
          color: { argb: 'FFFFFFFF' },
          size: 9.5
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Data rows
      filteredAccountsWithBalance.forEach((item) => {
        const { account, totalDebit, totalCredit, balance, nature } = item;
        const nameVal = '  '.repeat(account.level - 1) + account.name;
        
        const row = worksheet.addRow([
          account.code,
          nameVal,
          account.type,
          account.subType || '',
          account.level,
          totalDebit,
          totalCredit,
          balance,
          nature === 'DEUDOR' ? 'D' : 'A'
        ]);

        row.height = 18;

        row.eachCell((cell, colIndex) => {
          cell.font = { 
            name: 'Segoe UI', 
            size: 9,
            bold: account.level <= 2,
            color: account.level === 1 ? { argb: 'FF002D62' } : { argb: 'FF1E293B' }
          };

          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD5E1EC' } },
            bottom: { style: 'thin', color: { argb: 'FFD5E1EC' } },
            left: { style: 'thin', color: { argb: 'FFD5E1EC' } },
            right: { style: 'thin', color: { argb: 'FFD5E1EC' } }
          };

          if (colIndex === 1) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            cell.font = { ...cell.font, name: 'Consolas', bold: account.level <= 2 };
          } else if (colIndex === 2) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else if (colIndex >= 6 && colIndex <= 8) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '$#,##0;($#,##0);"-"';
            cell.font = { ...cell.font, name: 'Consolas' };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }

          if (account.level === 1) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFEAF1F8' }
            };
          } else if (account.level === 2) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF4F8FB' }
            };
          }
        });
      });

      worksheet.columns = [
        { width: 14 },
        { width: 38 },
        { width: 14 },
        { width: 16 },
        { width: 8 },
        { width: 20 },
        { width: 20 },
        { width: 20 },
        { width: 8 },
      ];

      worksheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 5, activeCell: 'A6' }
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), 'Plan_de_Cuentas_y_Balances_JDE.xlsx');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape') as any;

      // JDE Header Strip
      doc.setFillColor(0, 45, 98); // JDE Navy #002D62
      doc.rect(0, 0, 297, 20, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('ASSETFLOW ENTERPRISE • CONSULTA DE PLAN DE CUENTAS Y BALANCES (P0901)', 14, 10);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`FECHA CONSULTA: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')} | USUARIO: ${currentUser}`, 14, 16);
      doc.text(`ESTADO: ${accountingSummary.isCuadrado ? 'CUADRADO [OK]' : 'DESCUADRE DETECTADO'}`, 230, 16);

      const tableRows = filteredAccountsWithBalance.map(item => {
        const { account, totalDebit, totalCredit, balance, nature } = item;
        return [
          account.code,
          '  '.repeat(account.level - 1) + account.name,
          account.type,
          `NIVEL ${account.level}`,
          totalDebit > 0 ? formatCLP(totalDebit) : '-',
          totalCredit > 0 ? formatCLP(totalCredit) : '-',
          formatCLP(balance),
          nature === 'DEUDOR' ? 'D' : 'A'
        ];
      });

      doc.autoTable({
        startY: 25,
        head: [['Código', 'Nombre de Cuenta', 'Tipo', 'Nivel', 'Débitos (Debe)', 'Créditos (Haber)', 'Saldo Contable', 'Nat']],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.8, font: 'Helvetica' },
        headStyles: { 
          fillColor: [0, 45, 98], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold', 
          fontSize: 8.5,
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: 'bold', font: 'Courier', fontSize: 8.5 },
          1: { cellWidth: 70 },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 32, halign: 'right', font: 'Courier' },
          5: { cellWidth: 32, halign: 'right', font: 'Courier' },
          6: { cellWidth: 34, halign: 'right', fontStyle: 'bold', font: 'Courier' },
          7: { cellWidth: 14, halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: (data: any) => {
          if (data.row.index !== -1) {
            const raw = filteredAccountsWithBalance[data.row.index];
            if (raw && raw.account.level === 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [234, 241, 248];
              data.cell.styles.textColor = [0, 45, 98];
            } else if (raw && raw.account.level === 2) {
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        margin: { left: 14, right: 14 }
      });

      doc.save('Plan_de_Cuentas_y_Balances_JDE.pdf');
    } catch (err) {
      console.error('Error al exportar a PDF:', err);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-[#F3F6F9] p-3 md:p-6 overflow-y-auto custom-scrollbar pb-24 font-sans">
      <div className="max-w-[1550px] mx-auto w-full flex flex-col gap-3">

        {/* =========================================================================
            JDE ENTERPRISEONE FORM HEADER
           ========================================================================= */}
        <div className="bg-white border border-[#9DB2C3] rounded shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-[#002D62] via-[#004B7B] to-[#002D62] px-4 py-2 text-white flex flex-wrap items-center justify-between gap-2 border-b border-[#001B3B]">
            <div className="flex items-center gap-3">
              <span className="bg-amber-400 text-[#002D62] font-mono font-black text-xs px-2 py-0.5 rounded shadow-xs">
                P0901 • W0901A
              </span>
              <div>
                <h1 className="text-sm md:text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                  Plan de Cuentas y Consulta de Balances en Tiempo Real
                </h1>
                <p className="text-[10px] text-blue-100 font-mono">
                  AssetFlow Enterprise • Módulo de Contabilidad General y Maestro de Cuentas F0901 / F0902
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                accountingSummary.isCuadrado 
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400' 
                  : 'bg-rose-500/30 text-rose-200 border-rose-400'
              }`}>
                {accountingSummary.isCuadrado ? (
                  <>
                    <CheckCircle2 size={12} className="text-emerald-300" />
                    ECUACIÓN PATRIMONIAL CUADRADA [OK]
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} className="text-rose-300" />
                    DESCUADRE: {formatCLP(accountingSummary.diferenciaEcuacion)}
                  </>
                )}
              </span>
              <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-slate-200">
                Moneda: CLP
              </span>
            </div>
          </div>

          {/* JDE Action Toolbar */}
          <div className="bg-[#E8EEF5] px-3 py-2 border-b border-[#B8CCE0] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button 
                onClick={() => {}} 
                className="jde-btn jde-btn-primary"
                title="Actualizar Consulta (F5)"
              >
                <RefreshCw size={12} />
                <span>Buscar / Refrescar</span>
              </button>

              <button 
                onClick={expandAll} 
                className="jde-btn"
                title="Expandir todas las cuentas"
              >
                <ChevronDown size={12} />
                <span>Expandir Todo</span>
              </button>

              <button 
                onClick={collapseAll} 
                className="jde-btn"
                title="Colapsar cuentas a nivel 1"
              >
                <ChevronRight size={12} />
                <span>Colapsar Todo</span>
              </button>

              <button 
                onClick={() => setOnlyWithBalance(!onlyWithBalance)} 
                className={`jde-btn ${onlyWithBalance ? 'bg-amber-100 font-bold border-amber-400 text-amber-900' : ''}`}
                title="Filtrar solo cuentas con movimiento o saldo"
              >
                <Filter size={12} />
                <span>{onlyWithBalance ? 'Ver Todas' : 'Solo con Saldo'}</span>
              </button>

              <button 
                onClick={() => setShowSortModal(true)} 
                className={`jde-btn ${isSorted ? 'bg-amber-100 font-bold border-amber-400 text-amber-900 shadow-xs' : ''}`}
                title="Secuencia de Ordenamiento JDE (P986110S) • 1er clic: Mayor a Menor, 2do clic: Menor a Mayor, 3er clic: Restablecer"
              >
                <ArrowDownUp size={12} className={isSorted ? 'text-amber-800' : 'text-slate-700'} />
                <span>{isSorted && primarySort ? `Ordenado: ${primarySort.column} (${primarySort.direction === 'desc' ? '▼ Mayor' : '▲ Menor'})` : 'Ordenar Grilla (JDE)'}</span>
              </button>

              {isSorted && (
                <button 
                  onClick={clearSort} 
                  className="jde-btn bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300 font-bold"
                  title="Restablecer orden jerárquico natural del Plan de Cuentas"
                >
                  <X size={12} />
                  <span>Restablecer Orden</span>
                </button>
              )}

              {isQbeActive && (
                <button 
                  onClick={clearAllQbe} 
                  className="jde-btn bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 font-bold"
                  title="Limpiar todos los filtros y QBE"
                >
                  <X size={12} />
                  <span>Limpiar QBE</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleExportExcel} 
                className="jde-btn bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                title="Exportar a Microsoft Excel"
              >
                <FileSpreadsheet size={13} className="text-emerald-700" />
                <span>Exportar Excel</span>
              </button>

              <button 
                onClick={handleExportPDF} 
                className="jde-btn bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100"
                title="Generar Reporte PDF Oficial"
              >
                <Download size={13} className="text-slate-700" />
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              JDE KPI BALANCE SUMMARY STRIP
             ========================================================================= */}
          <div className="grid grid-cols-2 md:grid-cols-6 divide-x divide-[#B8CCE0] bg-[#F4F8FB] border-b border-[#B8CCE0] text-center text-xs">
            <div className="p-2.5">
              <span className="text-[9.5px] font-bold text-slate-600 uppercase block tracking-wider">1. Total Activos</span>
              <span className="font-mono font-black text-emerald-700 text-xs md:text-sm">
                {formatCLP(accountingSummary.activos)}
              </span>
            </div>
            <div className="p-2.5">
              <span className="text-[9.5px] font-bold text-slate-600 uppercase block tracking-wider">2. Total Pasivos</span>
              <span className="font-mono font-black text-rose-700 text-xs md:text-sm">
                {formatCLP(accountingSummary.pasivos)}
              </span>
            </div>
            <div className="p-2.5">
              <span className="text-[9.5px] font-bold text-slate-600 uppercase block tracking-wider">3. Total Patrimonio</span>
              <span className="font-mono font-black text-amber-700 text-xs md:text-sm">
                {formatCLP(accountingSummary.patrimonio)}
              </span>
            </div>
            <div className="p-2.5">
              <span className="text-[9.5px] font-bold text-slate-600 uppercase block tracking-wider">4. Ingresos Acumulados</span>
              <span className="font-mono font-black text-indigo-700 text-xs md:text-sm">
                {formatCLP(accountingSummary.ingresos)}
              </span>
            </div>
            <div className="p-2.5">
              <span className="text-[9.5px] font-bold text-slate-600 uppercase block tracking-wider">5. Egresos y Costos</span>
              <span className="font-mono font-black text-orange-700 text-xs md:text-sm">
                {formatCLP(accountingSummary.egresos)}
              </span>
            </div>
            <div className="p-2.5 bg-[#EAF1F8]">
              <span className="text-[9.5px] font-bold text-[#002D62] uppercase block tracking-wider">Resultado del Ejercicio</span>
              <span className={`font-mono font-black text-xs md:text-sm ${accountingSummary.resultadoEjercicio >= 0 ? 'text-[#002D62]' : 'text-rose-600'}`}>
                {accountingSummary.resultadoEjercicio >= 0 ? '+' : ''}{formatCLP(accountingSummary.resultadoEjercicio)}
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            JDE HIGH DENSITY DATA GRID (P0901) CON LUPAS DE MAESTRO (VISUAL ASSIST)
           ========================================================================= */}
        <div className="bg-white border border-[#9DB2C3] rounded shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="jde-grid select-text">
              {/* Header Titles con Lupa para consultar Maestro de Atributo */}
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>+/-</th>
                  
                  {/* CÓDIGO CUENTA */}
                  <th 
                    style={{ width: '135px' }}
                    className="cursor-pointer select-none hover:bg-slate-200/60 transition-colors group/col"
                    onClick={() => handleAccountSort('code')}
                    title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1 font-bold">
                        CÓDIGO CUENTA
                        {getSortState('code').direction === 'desc' && <span className="text-amber-600 font-black text-xs">▼</span>}
                        {getSortState('code').direction === 'asc' && <span className="text-blue-700 font-black text-xs">▲</span>}
                        {getSortState('code').direction === null && <span className="opacity-25 group-hover/col:opacity-80 text-[10px]">⇅</span>}
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveVisualAssist('CODE'); }}
                        className="p-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] rounded transition-all cursor-pointer bg-white/60 border border-slate-300"
                        title="Visual Assist ERP: Maestro de Cuentas Contables (F0901)"
                      >
                        <Search size={9} className="stroke-[3]" />
                      </button>
                    </div>
                  </th>

                  {/* DESCRIPCIÓN */}
                  <th 
                    className="cursor-pointer select-none hover:bg-slate-200/60 transition-colors group/col"
                    onClick={() => handleAccountSort('name')}
                    title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1 font-bold">
                        DESCRIPCIÓN / DENOMINACIÓN DE CUENTA
                        {getSortState('name').direction === 'desc' && <span className="text-amber-600 font-black text-xs">▼</span>}
                        {getSortState('name').direction === 'asc' && <span className="text-blue-700 font-black text-xs">▲</span>}
                        {getSortState('name').direction === null && <span className="opacity-25 group-hover/col:opacity-80 text-[10px]">⇅</span>}
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveVisualAssist('NAME'); }}
                        className="p-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] rounded transition-all cursor-pointer bg-white/60 border border-slate-300"
                        title="Visual Assist ERP: Catálogo Maestro de Glosas Contables (F0901D)"
                      >
                        <Search size={9} className="stroke-[3]" />
                      </button>
                    </div>
                  </th>

                  {/* TIPO */}
                  <th 
                    style={{ width: '115px' }}
                    className="cursor-pointer select-none hover:bg-slate-200/60 transition-colors group/col"
                    onClick={() => handleAccountSort('type')}
                    title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="mx-auto flex items-center gap-1 font-bold">
                        TIPO
                        {getSortState('type').direction === 'desc' && <span className="text-amber-600 font-black text-xs">▼</span>}
                        {getSortState('type').direction === 'asc' && <span className="text-blue-700 font-black text-xs">▲</span>}
                        {getSortState('type').direction === null && <span className="opacity-25 group-hover/col:opacity-80 text-[10px]">⇅</span>}
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveVisualAssist('TYPE'); }}
                        className="p-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] rounded transition-all cursor-pointer bg-white/60 border border-slate-300"
                        title="Visual Assist ERP: Maestro UDC de Tipos de Cuentas (UDC 09/TY)"
                      >
                        <Search size={9} className="stroke-[3]" />
                      </button>
                    </div>
                  </th>

                  {/* NIVEL */}
                  <th 
                    style={{ width: '70px' }}
                    className="cursor-pointer select-none hover:bg-slate-200/60 transition-colors group/col"
                    onClick={() => handleAccountSort('level')}
                    title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="mx-auto flex items-center gap-1 font-bold">
                        NIVEL
                        {getSortState('level').direction === 'desc' && <span className="text-amber-600 font-black text-xs">▼</span>}
                        {getSortState('level').direction === 'asc' && <span className="text-blue-700 font-black text-xs">▲</span>}
                        {getSortState('level').direction === null && <span className="opacity-25 group-hover/col:opacity-80 text-[10px]">⇅</span>}
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveVisualAssist('LEVEL'); }}
                        className="p-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] rounded transition-all cursor-pointer bg-white/60 border border-slate-300"
                        title="Visual Assist ERP: Maestro UDC de Niveles Jerárquicos (UDC 09/LV)"
                      >
                        <Search size={9} className="stroke-[3]" />
                      </button>
                    </div>
                  </th>

                  {/* DÉBITOS */}
                  <th 
                    style={{ width: '135px' }}
                    className="cursor-pointer select-none hover:bg-slate-200/60 transition-colors group/col"
                    onClick={() => handleAccountSort('totalDebit')}
                    title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="ml-auto flex items-center gap-1 font-bold">
                        DÉBITOS (DEBE)
                        {getSortState('totalDebit').direction === 'desc' && <span className="text-amber-600 font-black text-xs">▼</span>}
                        {getSortState('totalDebit').direction === 'asc' && <span className="text-blue-700 font-black text-xs">▲</span>}
                        {getSortState('totalDebit').direction === null && <span className="opacity-25 group-hover/col:opacity-80 text-[10px]">⇅</span>}
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveVisualAssist('DEBIT'); }}
                        className="p-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] rounded transition-all cursor-pointer bg-white/60 border border-slate-300 ml-1"
                        title="Visual Assist ERP: Libro Diario Maestro de Débitos (F0911)"
                      >
                        <Search size={9} className="stroke-[3]" />
                      </button>
                    </div>
                  </th>

                  {/* CRÉDITOS */}
                  <th 
                    style={{ width: '135px' }}
                    className="cursor-pointer select-none hover:bg-slate-200/60 transition-colors group/col"
                    onClick={() => handleAccountSort('totalCredit')}
                    title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="ml-auto flex items-center gap-1 font-bold">
                        CRÉDITOS (HABER)
                        {getSortState('totalCredit').direction === 'desc' && <span className="text-amber-600 font-black text-xs">▼</span>}
                        {getSortState('totalCredit').direction === 'asc' && <span className="text-blue-700 font-black text-xs">▲</span>}
                        {getSortState('totalCredit').direction === null && <span className="opacity-25 group-hover/col:opacity-80 text-[10px]">⇅</span>}
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveVisualAssist('CREDIT'); }}
                        className="p-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] rounded transition-all cursor-pointer bg-white/60 border border-slate-300 ml-1"
                        title="Visual Assist ERP: Libro Diario Maestro de Créditos (F0911)"
                      >
                        <Search size={9} className="stroke-[3]" />
                      </button>
                    </div>
                  </th>

                  {/* SALDO CONTABLE */}
                  <th 
                    style={{ width: '150px' }}
                    className="cursor-pointer select-none hover:bg-slate-200/60 transition-colors group/col"
                    onClick={() => handleAccountSort('balance')}
                    title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="ml-auto flex items-center gap-1 font-black">
                        SALDO CONTABLE
                        {getSortState('balance').direction === 'desc' && <span className="text-amber-600 font-black text-xs">▼</span>}
                        {getSortState('balance').direction === 'asc' && <span className="text-blue-700 font-black text-xs">▲</span>}
                        {getSortState('balance').direction === null && <span className="opacity-25 group-hover/col:opacity-80 text-[10px]">⇅</span>}
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveVisualAssist('BALANCE'); }}
                        className="p-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] rounded transition-all cursor-pointer bg-white/60 border border-slate-300 ml-1"
                        title="Visual Assist ERP: Maestro de Balances y Rangos de Saldo (F0902)"
                      >
                        <Search size={9} className="stroke-[3]" />
                      </button>
                    </div>
                  </th>

                  {/* NAT */}
                  <th 
                    style={{ width: '60px' }}
                    className="cursor-pointer select-none hover:bg-slate-200/60 transition-colors group/col"
                    onClick={() => handleAccountSort('nature')}
                    title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="mx-auto flex items-center gap-1 font-bold">
                        NAT
                        {getSortState('nature').direction === 'desc' && <span className="text-amber-600 font-black text-xs">▼</span>}
                        {getSortState('nature').direction === 'asc' && <span className="text-blue-700 font-black text-xs">▲</span>}
                        {getSortState('nature').direction === null && <span className="opacity-25 group-hover/col:opacity-80 text-[10px]">⇅</span>}
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveVisualAssist('NATURE'); }}
                        className="p-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] rounded transition-all cursor-pointer bg-white/60 border border-slate-300"
                        title="Visual Assist ERP: Maestro UDC de Naturaleza Contable (UDC 09/NA)"
                      >
                        <Search size={9} className="stroke-[3]" />
                      </button>
                    </div>
                  </th>

                  {/* MAYOR */}
                  <th style={{ width: '90px', textAlign: 'center' }}>MAYOR</th>
                </tr>

                {/* JDE QBE (Query-By-Example) Search Row con Lupas Visual Assist en cada celda */}
                <tr className="jde-qbe-row">
                  <td className="text-center font-mono text-[9px] text-slate-500 font-bold bg-[#FFFFE1]">
                    QBE
                  </td>

                  {/* QBE CÓDIGO */}
                  <td>
                    <div className="relative flex items-center pr-4">
                      <input 
                        type="text" 
                        placeholder="Código..."
                        className="jde-qbe-input font-mono font-bold pr-4"
                        value={qbeCode}
                        onChange={(e) => setQbeCode(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setActiveVisualAssist('CODE')}
                        className="absolute right-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 transition-all flex items-center justify-center"
                        title="Visual Assist: Consultar Maestro de Cuentas Contables (F0901)"
                        style={{ width: "13px", height: "13px" }}
                      >
                        <Search size={8} className="stroke-[3.5]" />
                      </button>
                    </div>
                  </td>

                  {/* QBE DESCRIPCIÓN */}
                  <td>
                    <div className="relative flex items-center pr-4">
                      <input 
                        type="text" 
                        placeholder="Filtrar descripción de cuenta..."
                        className="jde-qbe-input font-semibold pr-4"
                        value={qbeName}
                        onChange={(e) => setQbeName(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setActiveVisualAssist('NAME')}
                        className="absolute right-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 transition-all flex items-center justify-center"
                        title="Visual Assist: Consultar Catálogo Maestro de Glosas Contables"
                        style={{ width: "13px", height: "13px" }}
                      >
                        <Search size={8} className="stroke-[3.5]" />
                      </button>
                    </div>
                  </td>

                  {/* QBE TIPO */}
                  <td>
                    <div className="relative flex items-center pr-4">
                      <input 
                        type="text" 
                        placeholder="Tipo (Act/Pas)..."
                        className="jde-qbe-input text-center uppercase pr-4"
                        value={qbeType}
                        onChange={(e) => setQbeType(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setActiveVisualAssist('TYPE')}
                        className="absolute right-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 transition-all flex items-center justify-center"
                        title="Visual Assist: Consultar Maestro UDC de Tipos de Cuentas (UDC 09/TY)"
                        style={{ width: "13px", height: "13px" }}
                      >
                        <Search size={8} className="stroke-[3.5]" />
                      </button>
                    </div>
                  </td>

                  {/* QBE NIVEL */}
                  <td>
                    <div className="relative flex items-center pr-4">
                      <input 
                        type="text" 
                        placeholder="1-4"
                        className="jde-qbe-input text-center font-mono pr-4"
                        value={qbeLevel}
                        onChange={(e) => setQbeLevel(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setActiveVisualAssist('LEVEL')}
                        className="absolute right-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 transition-all flex items-center justify-center"
                        title="Visual Assist: Consultar Estructura de Niveles Jerárquicos (UDC 09/LV)"
                        style={{ width: "13px", height: "13px" }}
                      >
                        <Search size={8} className="stroke-[3.5]" />
                      </button>
                    </div>
                  </td>

                  {/* QBE DÉBITOS */}
                  <td>
                    <div className="relative flex items-center pr-4">
                      <span className="w-full text-right text-[9.5px] font-mono text-slate-500 pr-1 truncate">
                        Débitos F0911
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveVisualAssist('DEBIT')}
                        className="absolute right-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 transition-all flex items-center justify-center"
                        title="Visual Assist: Consultar Libro Diario de Débitos (F0911)"
                        style={{ width: "13px", height: "13px" }}
                      >
                        <Search size={8} className="stroke-[3.5]" />
                      </button>
                    </div>
                  </td>

                  {/* QBE CRÉDITOS */}
                  <td>
                    <div className="relative flex items-center pr-4">
                      <span className="w-full text-right text-[9.5px] font-mono text-slate-500 pr-1 truncate">
                        Créditos F0911
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveVisualAssist('CREDIT')}
                        className="absolute right-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 transition-all flex items-center justify-center"
                        title="Visual Assist: Consultar Libro Diario de Créditos (F0911)"
                        style={{ width: "13px", height: "13px" }}
                      >
                        <Search size={8} className="stroke-[3.5]" />
                      </button>
                    </div>
                  </td>

                  {/* QBE MÍN SALDO */}
                  <td>
                    <div className="relative flex items-center pr-4">
                      <input 
                        type="text" 
                        placeholder="Mín Saldo..."
                        className="jde-qbe-input text-right font-mono pr-4"
                        value={qbeMinBalance}
                        onChange={(e) => setQbeMinBalance(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setActiveVisualAssist('BALANCE')}
                        className="absolute right-0.5 text-[#002D62] hover:text-white hover:bg-[#002D62] focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 transition-all flex items-center justify-center"
                        title="Visual Assist: Consultar Maestro de Balances y Rangos (F0902)"
                        style={{ width: "13px", height: "13px" }}
                      >
                        <Search size={8} className="stroke-[3.5]" />
                      </button>
                    </div>
                  </td>

                  {/* QBE NATURALEZA */}
                  <td>
                    <div className="relative flex items-center pr-3">
                      <input 
                        type="text" 
                        placeholder="D/A"
                        className="jde-qbe-input text-center font-mono uppercase pr-3 font-bold"
                        value={qbeNature}
                        onChange={(e) => setQbeNature(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setActiveVisualAssist('NATURE')}
                        className="absolute right-0 text-[#002D62] hover:text-white hover:bg-[#002D62] focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 transition-all flex items-center justify-center"
                        title="Visual Assist: Consultar Maestro de Naturaleza Contable (UDC 09/NA)"
                        style={{ width: "12px", height: "12px" }}
                      >
                        <Search size={7} className="stroke-[3.5]" />
                      </button>
                    </div>
                  </td>

                  {/* QBE RESET */}
                  <td className="text-center bg-[#FFFFE1]">
                    {isQbeActive && (
                      <button 
                        onClick={clearAllQbe}
                        className="text-[9px] font-mono font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 px-1 py-0.5 rounded cursor-pointer"
                        title="Limpiar filtros QBE"
                      >
                        Reset QBE
                      </button>
                    )}
                  </td>
                </tr>
              </thead>

              {/* High Density Rows */}
              <tbody>
                {displayAccounts.length > 0 ? (
                  displayAccounts.map((item, idx) => {
                    const { account, totalDebit, totalCredit, balance, nature, movementCount } = item;
                    const hasChildren = CHART_OF_ACCOUNTS.some(a => a.parentCode === account.code);
                    const isExpanded = expandedCodes.has(account.code);
                    const paddingLeft = isSorted ? 0 : (account.level - 1) * 18;

                    // Row style based on level
                    const isLevel1 = account.level === 1;
                    const isLevel2 = account.level === 2;
                    const rowClass = isLevel1 
                      ? 'bg-[#EAF1F8] font-bold font-sans' 
                      : isLevel2 
                        ? 'bg-[#F4F8FB] font-semibold' 
                        : (idx % 2 === 0 ? 'jde-row-even' : 'jde-row-odd');

                    return (
                      <tr 
                        key={account.id}
                        onClick={() => setSelectedAccountData(item)}
                        className={`jde-tr jde-row-hover cursor-pointer transition-colors group ${rowClass}`}
                      >
                        {/* Tree Toggle Column */}
                        <td className="text-center select-none" onClick={(e) => {
                          if (hasChildren && !isQbeActive && !isSorted) {
                            e.stopPropagation();
                            toggleExpand(account.code);
                          }
                        }}>
                          {hasChildren && !isQbeActive && !isSorted ? (
                            <button 
                              className="w-4 h-4 rounded hover:bg-slate-200 inline-flex items-center justify-center text-slate-700"
                              title={isExpanded ? 'Colapsar' : 'Expandir'}
                            >
                              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                          ) : (
                            <span className="text-slate-400 font-mono text-[9px]">{idx + 1}</span>
                          )}
                        </td>

                        {/* Account Code Column con Visual Assist rápido */}
                        <td className="font-mono">
                          <div className="flex items-center justify-between" style={{ paddingLeft: `${paddingLeft}px` }}>
                            <span className={`text-[11px] ${
                              isLevel1 
                                ? 'font-black text-[#002D62]' 
                                : isLevel2 
                                  ? 'font-bold text-slate-900' 
                                  : 'font-semibold text-slate-700'
                            }`}>
                              {account.code}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQbeCode(account.code);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-[#002D62] transition-opacity"
                              title={`Filtrar por cuenta ${account.code}`}
                            >
                              <Search size={8} />
                            </button>
                          </div>
                        </td>

                        {/* Account Name */}
                        <td>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] ${
                              isLevel1 
                                ? 'font-black text-[#002D62] tracking-wide' 
                                : isLevel2 
                                  ? 'font-bold text-slate-800' 
                                  : 'text-slate-800'
                            }`}>
                              {account.name}
                            </span>
                            {movementCount > 0 && (
                              <span className="text-[8.5px] font-mono bg-blue-100 text-[#002D62] px-1 py-0.2 rounded font-bold">
                                {movementCount} movs
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Account Type */}
                        <td className="text-center">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVisualAssist('TYPE');
                            }}
                            className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-black tracking-tight cursor-pointer hover:ring-1 hover:ring-[#002D62] ${
                              account.type === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              account.type === 'PASIVO' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                              account.type === 'PATRIMONIO' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              account.type === 'INGRESOS' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              'bg-orange-100 text-orange-800 border border-orange-200'
                            }`}
                            title="Consultar maestro UDC 09/TY"
                          >
                            {account.type}
                          </span>
                        </td>

                        {/* Level */}
                        <td className="text-center font-mono text-[10px] text-slate-600 font-semibold">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVisualAssist('LEVEL');
                            }}
                            className="hover:underline cursor-pointer"
                            title="Consultar maestro de niveles UDC 09/LV"
                          >
                            L{account.level}
                          </span>
                        </td>

                        {/* Total Débitos */}
                        <td className="text-right font-mono text-[11px] font-medium text-slate-800">
                          {totalDebit > 0 ? formatCLP(totalDebit) : '-'}
                        </td>

                        {/* Total Créditos */}
                        <td className="text-right font-mono text-[11px] font-medium text-slate-800">
                          {totalCredit > 0 ? formatCLP(totalCredit) : '-'}
                        </td>

                        {/* Saldo Contable */}
                        <td className={`text-right font-mono text-[11px] font-black ${
                          balance < 0 
                            ? 'text-rose-600' 
                            : isLevel1 
                              ? 'text-[#002D62]' 
                              : balance > 0 
                                ? 'text-slate-900' 
                                : 'text-slate-400'
                        }`}>
                          {balance !== 0 ? formatCLP(balance) : '$0'}
                        </td>

                        {/* Nature (Deudor / Acreedor) */}
                        <td className="text-center font-mono text-[10px] font-bold">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVisualAssist('NATURE');
                            }}
                            className={`cursor-pointer hover:underline ${nature === 'DEUDOR' ? 'text-blue-700' : 'text-purple-700'}`}
                            title="Consultar maestro UDC 09/NA"
                          >
                            {nature === 'DEUDOR' ? 'D' : 'A'}
                          </span>
                        </td>

                        {/* Action: Ledger Drilldown */}
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => setSelectedAccountData(item)}
                            className="jde-btn px-2 py-0.5 text-[9.5px] font-semibold"
                            title={`Ver Libro Mayor P09200 de ${account.code}`}
                          >
                            <Eye size={10} />
                            <span>Mayor</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <Info size={36} className="mx-auto mb-2 text-slate-300" />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500 block">
                        No se encontraron cuentas que coincidan con los filtros QBE
                      </span>
                      <button 
                        onClick={clearAllQbe}
                        className="jde-btn mt-3"
                      >
                        Limpiar Filtros y Mostrar Todo
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Status Strip */}
          <div className="bg-[#E8EEF5] px-3 py-1.5 border-t border-[#9DB2C3] flex flex-wrap items-center justify-between text-[10.5px] font-mono text-slate-700">
            <div className="flex items-center gap-4">
              <span>Registros Visualizados: <strong>{visibleAccounts.length}</strong> de {CHART_OF_ACCOUNTS.length} Cuentas</span>
              <span className="text-slate-400">|</span>
              <span>Modo: Consulta Directa de Saldos con Visual Assist Habilitado</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-slate-600">
                <ShieldCheck size={12} className="text-emerald-600" />
                Validación CMF Directrices B4/B13 & IFRS
              </span>
            </div>
          </div>
        </div>

        {/* Corporate Legal & Compliance Notice */}
        <div className="bg-white border border-[#9DB2C3] p-3 rounded flex items-center justify-between text-[10px] text-slate-600 font-mono shadow-xs">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-[#002D62] shrink-0" />
            <span>
              <strong>ESTÁNDAR ENTERPRISE F0901/F0902:</strong> Haga clic en el ícono de la lupa 🔍 en cualquier encabezado o campo de filtro QBE para abrir el Visual Assist de la tabla maestra correspondiente.
            </span>
          </div>
          <span className="text-slate-400 shrink-0">AssetFlow Core v9.11</span>
        </div>

      </div>

      {/* Drilldown Modal (P09200 - Account Ledger Inquiry) */}
      {selectedAccountData && (
        <AccountDetailModal 
          accountData={selectedAccountData} 
          onClose={() => setSelectedAccountData(null)} 
          properties={properties}
          workOrders={workOrders}
        />
      )}

      {/* Visual Assist Search & Select Modal */}
      {activeVisualAssist && (
        <VisualAssistModal
          type={activeVisualAssist}
          accountBalancesMap={accountBalancesMap}
          onClose={() => setActiveVisualAssist(null)}
          onSelect={(val) => {
            switch (activeVisualAssist) {
              case 'CODE':
                setQbeCode(val);
                break;
              case 'NAME':
                setQbeName(val);
                break;
              case 'TYPE':
                setQbeType(val);
                break;
              case 'LEVEL':
                setQbeLevel(val);
                break;
              case 'DEBIT':
                setQbeCode(val);
                break;
              case 'CREDIT':
                setQbeCode(val);
                break;
              case 'BALANCE':
                setQbeMinBalance(val);
                break;
              case 'NATURE':
                setQbeNature(val);
                break;
            }
          }}
          onClear={() => {
            switch (activeVisualAssist) {
              case 'CODE':
                setQbeCode('');
                break;
              case 'NAME':
                setQbeName('');
                break;
              case 'TYPE':
                setQbeType('');
                break;
              case 'LEVEL':
                setQbeLevel('');
                break;
              case 'DEBIT':
                setQbeCode('');
                break;
              case 'CREDIT':
                setQbeCode('');
                break;
              case 'BALANCE':
                setQbeMinBalance('');
                break;
              case 'NATURE':
                setQbeNature('');
                break;
            }
          }}
        />
      )}

      {/* JDE FDA EnterpriseOne Sort Sequence Dialog (P0901S / W0001S) */}
      <JDESortSequenceModal
        isOpen={showSortModal}
        onClose={() => setShowSortModal(false)}
        availableColumns={ACCOUNT_SORT_COLUMNS}
        currentPrimarySort={primarySort}
        currentSecondarySort={secondarySort}
        onApply={(primary, secondary) => setManualMultiSort(primary, secondary)}
        programCode="P0901S"
        gridTitle="Plan de Cuentas y Balances F0901"
      />
    </div>
  );
};

export default ChartOfAccountsModule;
