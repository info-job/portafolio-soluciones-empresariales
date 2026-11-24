
import React, { useState } from 'react';
import { Transaction } from '../types';
import { 
  Edit2, Trash2, ArrowUpRight, ArrowDownLeft, FileSpreadsheet, 
  ShieldCheck, AlertCircle, FileText, ExternalLink, Database, Tag, X, Check, Sliders, Info,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download
} from 'lucide-react';
import NewIndicator from './NewIndicator';
import { useResizableColumns } from '../lib/useResizableColumns';
import { openDocumentSecurely } from '@/lib/storage';
import { F980011DModal } from './F980011DModal';
import { GridDimensionControls } from './common/GridDimensionControls';
import { JDEGridContextMenu } from './JDEGridContextMenu';
import { useJDESort } from '../lib/jdeGridSort';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, onEdit, onDelete }) => {
  // F980011D Attribute Master target state
  const [inspectTarget, setInspectTarget] = useState<Transaction | null>(null);
  const [gridContextMenu, setGridContextMenu] = useState<{ x: number; y: number; tx: Transaction } | null>(null);

  // General audit-style metadata block generator
  const getAuditData = (record: Transaction) => {
    return {
      registryId: record.id || 'N/A',
      programId: record.programId || 'P0911',
      workStationId: record.workStationId || 'WK_MUT_01',
      nextNumberSeq: record.nextNumberSeq || Math.floor(100000 + Math.random() * 900000),
      hashSignature: `SHA256:${Math.random().toString(16).substring(2, 10).toUpperCase()}${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
      timestamp: record.timestamp ? new Date(record.timestamp).toLocaleString('es-CL') : new Date().toLocaleString('es-CL'),
      userCreator: record.user || 'SISTEMA',
      lockedBy: record.lockedBy || 'LIBRE',
      lockedAt: record.lockedAt ? new Date(record.lockedAt).toLocaleString('es-CL') : 'N/A',
      isTest: record.isTest ? 'SÍ (REPORTE DE PRUEBA)' : 'SÍ (MAESTRO PRODUCCIÓN)'
    };
  };

  const { 
    widths, 
    onMouseDown, 
    onColumnDoubleClick,
    onRowMouseDown, 
    onRowDoubleClick, 
    getRowHeight, 
    defaultRowHeight, 
    setDefaultRowHeight, 
    resetWidths, 
    resetHeights, 
    resetAll 
  } = useResizableColumns({
    initialWidths: {
      index: 40,
      fecha: 128,
      descripcion: 400,
      categoria: 128,
      tipo: 96,
      monto: 128,
      proveedor: 180,
      rut: 120,
      usuario: 128,
      acciones: 96
    },
    initialRowHeight: 30,
    storageKey: 'transaction_table'
  });

  // ERP QBE (Query By Example) columnar filter states
  const [colSearchFecha, setColSearchFecha] = useState('');
  const [colSearchDesc, setColSearchDesc] = useState('');
  const [colSearchCat, setColSearchCat] = useState('');
  const [colSearchTipo, setColSearchTipo] = useState('');
  const [colSearchMonto, setColSearchMonto] = useState('');
  const [colSearchProv, setColSearchProv] = useState('');
  const [colSearchRut, setColSearchRut] = useState('');
  const [colSearchUsr, setColSearchUsr] = useState('');

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      const matchesFecha = !colSearchFecha || (t.date && t.date.toLowerCase().includes(colSearchFecha.toLowerCase()));
      const matchesDesc = !colSearchDesc || (t.description && t.description.toLowerCase().includes(colSearchDesc.toLowerCase()));
      const matchesCat = !colSearchCat || (t.category && t.category.toLowerCase().includes(colSearchCat.toLowerCase()));
      const matchesTipo = !colSearchTipo || (t.type && (t.type === 'INCOME' ? 'ingreso' : 'egreso').includes(colSearchTipo.toLowerCase()));
      const matchesMonto = !colSearchMonto || t.amount.toString().includes(colSearchMonto);
      const matchesProv = !colSearchProv || (t.supplierName && t.supplierName.toLowerCase().includes(colSearchProv.toLowerCase()));
      const matchesRut = !colSearchRut || (t.supplierTaxId && t.supplierTaxId.toLowerCase().includes(colSearchRut.toLowerCase()));
      const matchesUsr = !colSearchUsr || (t.user && t.user.toLowerCase().includes(colSearchUsr.toLowerCase()));

      return matchesFecha && matchesDesc && matchesCat && matchesTipo && matchesMonto && matchesProv && matchesRut && matchesUsr;
    });
  }, [transactions, colSearchFecha, colSearchDesc, colSearchCat, colSearchTipo, colSearchMonto, colSearchProv, colSearchRut, colSearchUsr]);

  // JDE EnterpriseOne Grid Sorting (1st click: desc, 2nd click: asc, 3rd click: reset)
  const txExtractors = React.useMemo(() => ({
    fecha: (t: Transaction) => t.date || t.timestamp,
    descripcion: (t: Transaction) => t.description,
    categoria: (t: Transaction) => t.category,
    tipo: (t: Transaction) => (t.type === 'INCOME' ? 'Ingreso' : 'Egreso'),
    monto: (t: Transaction) => t.amount,
    proveedor: (t: Transaction) => t.supplierName,
    rut: (t: Transaction) => t.supplierTaxId,
    usuario: (t: Transaction) => t.user
  }), []);

  const {
    sortedData: displayTransactions,
    requestSort,
    getSortState,
    primarySort
  } = useJDESort<Transaction>(filteredTransactions);

  const handleTxSort = (columnKey: string) => {
    const extractor = (txExtractors as any)[columnKey];
    requestSort(columnKey, { extractor });
  };

  // Enterprise Server-Grade Paging state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Compute pagination slice
  const totalPages = Math.max(1, Math.ceil(displayTransactions.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageTransactions = displayTransactions.slice(startIndex, startIndex + pageSize);

  // Reset to page 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [colSearchFecha, colSearchDesc, colSearchCat, colSearchTipo, colSearchMonto, colSearchProv, colSearchRut, colSearchUsr]);

  if (transactions.length === 0) {
    return (
      <div className="bg-white h-full rounded-lg border border-slate-300 flex flex-col items-center justify-center text-slate-400 excel-grid">
         <FileSpreadsheet size={48} className="mb-4 opacity-20" />
         <p className="font-bold">No hay datos en esta hoja.</p>
         <p className="text-xs">Haga clic en 'Nuevo' para empezar a registrar.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#7FA6C7] shadow-xs overflow-hidden h-full flex flex-col rounded-md">
      {/* AssetFlow Enterprise Grid Banner Bar */}
      <div className="jde-grid-banner">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[#002D62] text-[11px] font-bold">
            Pág. {safePage}/{totalPages} • Registros {displayTransactions.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + pageSize, displayTransactions.length)} de {displayTransactions.length}
          </span>
          <span className="text-[#90A2B8]">|</span>
          <span className="text-[10px] text-slate-600 font-normal">
            Total en Base: {transactions.length} txs
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <GridDimensionControls
            defaultRowHeight={defaultRowHeight}
            onSetRowHeight={setDefaultRowHeight}
            onResetColumns={resetWidths}
            onResetRows={resetHeights}
            onResetAll={resetAll}
          />
          <span className="text-[#002D62] font-semibold">Query: <strong className="font-bold">All Active Records</strong></span>
          <button 
            type="button" 
            onClick={() => {
              setColSearchFecha('');
              setColSearchDesc('');
              setColSearchCat('');
              setColSearchTipo('');
              setColSearchMonto('');
              setColSearchProv('');
              setColSearchRut('');
              setColSearchUsr('');
            }}
            className="no-jde-override text-[#002D62] hover:underline font-bold cursor-pointer"
          >
            Limpiar Filtros QBE
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1 excel-grid">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#E6EEF8] border-b border-[#7FA6C7]">
              <th style={{ width: widths.index }} className="relative px-2 py-1.5 text-[10px] font-bold text-[#002D62] text-center border-r border-[#A2BCCF]">
                #
                <div onMouseDown={(e) => onMouseDown(e, 'index')} className="resizer" />
              </th>
              <th 
                style={{ width: widths.fecha }} 
                className="relative px-2.5 py-1.5 text-[10px] font-bold text-[#002D62] border-r border-[#A2BCCF] cursor-pointer select-none hover:bg-[#D5E4F3] transition-colors group/hdr"
                onClick={() => handleTxSort('fecha')}
                title="1er clic: Más reciente (desc) • 2do clic: Más antiguo (asc) • 3er clic: Restablecer"
              >
                <div className="flex items-center justify-between">
                  <span>A - Fecha</span>
                  <span className="font-mono text-[10px]">
                    {getSortState('fecha').direction === 'desc' && <span className="text-[#002D62] font-black">▼</span>}
                    {getSortState('fecha').direction === 'asc' && <span className="text-[#002D62] font-black">▲</span>}
                    {getSortState('fecha').direction === null && <span className="opacity-20 group-hover/hdr:opacity-70">⇅</span>}
                  </span>
                </div>
                <div onMouseDown={(e) => onMouseDown(e, 'fecha')} onClick={(e) => e.stopPropagation()} className="resizer" />
              </th>
              <th 
                style={{ width: widths.descripcion }} 
                className="relative px-2.5 py-1.5 text-[10px] font-bold text-[#002D62] border-r border-[#A2BCCF] cursor-pointer select-none hover:bg-[#D5E4F3] transition-colors group/hdr"
                onClick={() => handleTxSort('descripcion')}
                title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
              >
                <div className="flex items-center justify-between">
                  <span>B - Descripción</span>
                  <span className="font-mono text-[10px]">
                    {getSortState('descripcion').direction === 'desc' && <span className="text-[#002D62] font-black">▼</span>}
                    {getSortState('descripcion').direction === 'asc' && <span className="text-[#002D62] font-black">▲</span>}
                    {getSortState('descripcion').direction === null && <span className="opacity-20 group-hover/hdr:opacity-70">⇅</span>}
                  </span>
                </div>
                <div onMouseDown={(e) => onMouseDown(e, 'descripcion')} onClick={(e) => e.stopPropagation()} className="resizer" />
              </th>
              <th 
                style={{ width: widths.categoria }} 
                className="relative px-2.5 py-1.5 text-[10px] font-bold text-[#002D62] border-r border-[#A2BCCF] cursor-pointer select-none hover:bg-[#D5E4F3] transition-colors group/hdr"
                onClick={() => handleTxSort('categoria')}
                title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
              >
                <div className="flex items-center justify-between">
                  <span>C - Categoría</span>
                  <span className="font-mono text-[10px]">
                    {getSortState('categoria').direction === 'desc' && <span className="text-[#002D62] font-black">▼</span>}
                    {getSortState('categoria').direction === 'asc' && <span className="text-[#002D62] font-black">▲</span>}
                    {getSortState('categoria').direction === null && <span className="opacity-20 group-hover/hdr:opacity-70">⇅</span>}
                  </span>
                </div>
                <div onMouseDown={(e) => onMouseDown(e, 'categoria')} onClick={(e) => e.stopPropagation()} className="resizer" />
              </th>
              <th 
                style={{ width: widths.tipo }} 
                className="relative px-2.5 py-1.5 text-[10px] font-bold text-[#002D62] border-r border-[#A2BCCF] text-center cursor-pointer select-none hover:bg-[#D5E4F3] transition-colors group/hdr"
                onClick={() => handleTxSort('tipo')}
                title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>D - Tipo</span>
                  <span className="font-mono text-[10px]">
                    {getSortState('tipo').direction === 'desc' && <span className="text-[#002D62] font-black">▼</span>}
                    {getSortState('tipo').direction === 'asc' && <span className="text-[#002D62] font-black">▲</span>}
                    {getSortState('tipo').direction === null && <span className="opacity-20 group-hover/hdr:opacity-70">⇅</span>}
                  </span>
                </div>
                <div onMouseDown={(e) => onMouseDown(e, 'tipo')} onClick={(e) => e.stopPropagation()} className="resizer" />
              </th>
              <th 
                style={{ width: widths.monto }} 
                className="relative px-2.5 py-1.5 text-[10px] font-bold text-[#002D62] border-r border-[#A2BCCF] text-right cursor-pointer select-none hover:bg-[#D5E4F3] transition-colors group/hdr"
                onClick={() => handleTxSort('monto')}
                title="1er clic: Mayor a menor monto ($$$ a $0) • 2do clic: Menor a mayor • 3er clic: Restablecer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px]">
                    {getSortState('monto').direction === 'desc' && <span className="text-[#002D62] font-black">▼</span>}
                    {getSortState('monto').direction === 'asc' && <span className="text-[#002D62] font-black">▲</span>}
                    {getSortState('monto').direction === null && <span className="opacity-20 group-hover/hdr:opacity-70">⇅</span>}
                  </span>
                  <span>E - Monto ($)</span>
                </div>
                <div onMouseDown={(e) => onMouseDown(e, 'monto')} onClick={(e) => e.stopPropagation()} className="resizer" />
              </th>
              <th 
                style={{ width: widths.proveedor }} 
                className="relative px-2.5 py-1.5 text-[10px] font-bold text-[#002D62] border-r border-[#A2BCCF] cursor-pointer select-none hover:bg-[#D5E4F3] transition-colors group/hdr"
                onClick={() => handleTxSort('proveedor')}
                title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
              >
                <div className="flex items-center justify-between">
                  <span>F - Proveedor / Titular</span>
                  <span className="font-mono text-[10px]">
                    {getSortState('proveedor').direction === 'desc' && <span className="text-[#002D62] font-black">▼</span>}
                    {getSortState('proveedor').direction === 'asc' && <span className="text-[#002D62] font-black">▲</span>}
                    {getSortState('proveedor').direction === null && <span className="opacity-20 group-hover/hdr:opacity-70">⇅</span>}
                  </span>
                </div>
                <div onMouseDown={(e) => onMouseDown(e, 'proveedor')} onClick={(e) => e.stopPropagation()} className="resizer" />
              </th>
              <th 
                style={{ width: widths.rut }} 
                className="relative px-2.5 py-1.5 text-[10px] font-bold text-[#002D62] border-r border-[#A2BCCF] cursor-pointer select-none hover:bg-[#D5E4F3] transition-colors group/hdr"
                onClick={() => handleTxSort('rut')}
                title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
              >
                <div className="flex items-center justify-between">
                  <span>G - RUT</span>
                  <span className="font-mono text-[10px]">
                    {getSortState('rut').direction === 'desc' && <span className="text-[#002D62] font-black">▼</span>}
                    {getSortState('rut').direction === 'asc' && <span className="text-[#002D62] font-black">▲</span>}
                    {getSortState('rut').direction === null && <span className="opacity-20 group-hover/hdr:opacity-70">⇅</span>}
                  </span>
                </div>
                <div onMouseDown={(e) => onMouseDown(e, 'rut')} onClick={(e) => e.stopPropagation()} className="resizer" />
              </th>
              <th 
                style={{ width: widths.usuario }} 
                className="relative px-2.5 py-1.5 text-[10px] font-bold text-[#002D62] border-r border-[#A2BCCF] cursor-pointer select-none hover:bg-[#D5E4F3] transition-colors group/hdr"
                onClick={() => handleTxSort('usuario')}
                title="1er clic: Mayor a menor (desc) • 2do clic: Menor a mayor (asc) • 3er clic: Restablecer"
              >
                <div className="flex items-center justify-between">
                  <span>H - Usuario</span>
                  <span className="font-mono text-[10px]">
                    {getSortState('usuario').direction === 'desc' && <span className="text-[#002D62] font-black">▼</span>}
                    {getSortState('usuario').direction === 'asc' && <span className="text-[#002D62] font-black">▲</span>}
                    {getSortState('usuario').direction === null && <span className="opacity-20 group-hover/hdr:opacity-70">⇅</span>}
                  </span>
                </div>
                <div onMouseDown={(e) => onMouseDown(e, 'usuario')} onClick={(e) => e.stopPropagation()} className="resizer" />
              </th>
              <th style={{ width: widths.acciones }} className="relative px-2.5 py-1.5 text-[10px] font-bold text-[#002D62] text-center">
                Acciones
                <div onMouseDown={(e) => onMouseDown(e, 'acciones')} className="resizer" />
              </th>
            </tr>
            {/* ERP QBE (Query By Example) Row */}
            <tr className="bg-[#F0F5FA] border-b border-[#7FA6C7]">
              <th className="px-1 py-1 text-center bg-[#E1EAF2] border-r border-[#A2BCCF]">
                <span className="text-[8px] font-black text-[#002D62]">QBE</span>
              </th>
              <th className="px-1 py-1 border-r border-[#A2BCCF]">
                <input 
                  type="text" 
                  value={colSearchFecha}
                  onChange={(e) => setColSearchFecha(e.target.value)}
                  placeholder="*" 
                  className="jde-qbe-input"
                />
              </th>
              <th className="px-1 py-1 border-r border-[#A2BCCF]">
                <input 
                  type="text" 
                  value={colSearchDesc}
                  onChange={(e) => setColSearchDesc(e.target.value)}
                  placeholder="*" 
                  className="jde-qbe-input"
                />
              </th>
              <th className="px-1 py-1 border-r border-[#A2BCCF]">
                <input 
                  type="text" 
                  value={colSearchCat}
                  onChange={(e) => setColSearchCat(e.target.value)}
                  placeholder="*" 
                  className="jde-qbe-input"
                />
              </th>
              <th className="px-1 py-1 border-r border-[#A2BCCF]">
                <input 
                  type="text" 
                  value={colSearchTipo}
                  onChange={(e) => setColSearchTipo(e.target.value)}
                  placeholder="*" 
                  className="jde-qbe-input"
                />
              </th>
              <th className="px-1 py-1 border-r border-[#A2BCCF]">
                <input 
                  type="text" 
                  value={colSearchMonto}
                  onChange={(e) => setColSearchMonto(e.target.value)}
                  placeholder="*" 
                  className="jde-qbe-input text-right"
                />
              </th>
              <th className="px-1 py-1 border-r border-[#A2BCCF]">
                <input 
                  type="text" 
                  value={colSearchProv}
                  onChange={(e) => setColSearchProv(e.target.value)}
                  placeholder="*" 
                  className="jde-qbe-input"
                />
              </th>
              <th className="px-1 py-1 border-r border-[#A2BCCF]">
                <input 
                  type="text" 
                  value={colSearchRut}
                  onChange={(e) => setColSearchRut(e.target.value)}
                  placeholder="*" 
                  className="jde-qbe-input"
                />
              </th>
              <th className="px-1 py-1 border-r border-[#A2BCCF]">
                <input 
                  type="text" 
                  value={colSearchUsr}
                  onChange={(e) => setColSearchUsr(e.target.value)}
                  placeholder="*" 
                  className="jde-qbe-input"
                />
              </th>
              <th className="px-1 py-1 bg-[#F0F5FA]">
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D2DFEC]">
            {pageTransactions.map((t, index) => (
              <tr 
                key={t.id} 
                onClick={() => onEdit(t)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setInspectTarget(t);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setGridContextMenu({ x: e.clientX, y: e.clientY, tx: t });
                }}
                style={{ height: `${getRowHeight(t.id || index)}px` }}
                className="hover:bg-[#FFFCDD] transition-colors group cursor-pointer"
                title="Haga clic para editar (Drill Down). Doble clic para Consultar Maestro de Atributos F980011D"
              >
                <td className="relative px-2 text-[10px] font-bold text-[#1A3E5C] text-center border-r border-[#A2BCCF] border-b border-[#D2DFEC] bg-[#F4F8FC]">
                  <NewIndicator timestamp={t.timestamp} />
                  {startIndex + index + 1}
                  <div
                    onMouseDown={(e) => onRowMouseDown(e, t.id || index)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onRowDoubleClick(t.id || index);
                    }}
                    className="row-resizer"
                    title="Arrastrar para cambiar alto de fila (Shift para todas). Doble clic para restablecer."
                  />
                </td>
                <td className="px-2.5 text-xs font-medium text-slate-700 border-r border-[#A2BCCF] border-b border-[#D2DFEC] mono">{t.date}</td>
                <td className="px-2.5 text-xs font-bold text-slate-800 border-r border-[#A2BCCF] border-b border-[#D2DFEC] truncate">
                  <div className="flex items-center gap-1.5">
                    {t.isTest && (
                      <span className="shrink-0 bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-widest leading-none">TEST</span>
                    )}
                    <span className="truncate">{t.description}</span>
                  </div>
                </td>
                <td className="px-2.5 border-r border-[#A2BCCF] border-b border-[#D2DFEC]">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                    {t.category}
                  </span>
                </td>
                <td className="px-2.5 border-r border-[#A2BCCF] border-b border-[#D2DFEC] text-center">
                  <div className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 rounded ${t.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {t.type === 'INCOME' ? '▲' : '▼'} {t.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                  </div>
                  {t.type === 'EXPENSE' && t.category === 'PAGO A PROVEEDOR' && (
                    <div className="mt-0.5 flex justify-center">
                      {(t.compliance?.isExempt || (
                        t.compliance?.conflictThirdParty &&
                        t.compliance?.conflictExecutive &&
                        t.compliance?.beneficiariesUAF &&
                        t.compliance?.dueDiligenceCert &&
                        t.compliance?.paymentVoucher &&
                        t.compliance?.invoice &&
                        t.compliance?.receptionCertificate &&
                        t.compliance?.photoSet
                      )) ? (
                        <ShieldCheck size={10} className="text-emerald-500" title="Lote de documentos completo" />
                      ) : (
                        <AlertCircle size={10} className="text-rose-500" title="Documentación incompleta" />
                      )}
                    </div>
                  )}
                </td>
                <td className="px-2.5 border-r border-[#A2BCCF] border-b border-[#D2DFEC] text-right mono">
                  <span className={`text-xs font-bold ${t.type === 'INCOME' ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {t.type === 'INCOME' ? '' : '-'}${t.amount.toLocaleString()}
                  </span>
                </td>
                <td className="px-2.5 border-r border-[#A2BCCF] border-b border-[#D2DFEC] text-[10px] font-bold text-slate-600 uppercase truncate">
                  {t.supplierName || '-'}
                </td>
                <td className="px-2.5 border-r border-[#A2BCCF] border-b border-[#D2DFEC] text-[10px] font-mono text-slate-500 text-center">
                  {t.supplierTaxId || '-'}
                </td>
                <td className="px-2.5 border-r border-[#A2BCCF] border-b border-[#D2DFEC] text-[10px] font-bold text-slate-500 truncate italic">
                  {t.user}
                </td>
                <td className="px-2.5 text-center border-b border-[#D2DFEC]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.documentUrl && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openDocumentSecurely(t.documentUrl, t.documentName || 'documento');
                        }}
                        className="p-1 text-indigo-600 hover:bg-indigo-100 rounded" 
                        title={`Ver Soporte: ${t.documentName || 'Documento'}`}
                      >
                        <FileText size={12} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectTarget(t);
                      }} 
                      className="p-1 text-[#0B3C5D] hover:bg-amber-100 rounded hover:text-indigo-850" 
                      title="F980011D: Consultar Maestro de Atributos"
                    >
                      <Database size={12} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(t);
                      }} 
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded" 
                      title="Editar"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('¿Borrar fila?')) onDelete(t.id);
                      }} 
                      className="p-1 text-red-600 hover:bg-red-100 rounded" 
                      title="Borrar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* Empty grid rows for visual effect */}
            {Array.from({ length: Math.max(0, 15 - pageTransactions.length) }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-[28px]">
                <td className="bg-[#F4F8FC] border-r border-[#A2BCCF] border-b border-[#D2DFEC] text-[10px] text-slate-300 text-center font-bold">{pageTransactions.length + i + 1}</td>
                <td className="border-r border-[#A2BCCF] border-b border-[#D2DFEC]"></td>
                <td className="border-r border-[#A2BCCF] border-b border-[#D2DFEC]"></td>
                <td className="border-r border-[#A2BCCF] border-b border-[#D2DFEC]"></td>
                <td className="border-r border-[#A2BCCF] border-b border-[#D2DFEC]"></td>
                <td className="border-r border-[#A2BCCF] border-b border-[#D2DFEC]"></td>
                <td className="border-r border-[#A2BCCF] border-b border-[#D2DFEC]"></td>
                <td className="border-r border-[#A2BCCF] border-b border-[#D2DFEC]"></td>
                <td className="border-r border-[#A2BCCF] border-b border-[#D2DFEC]"></td>
                <td className="border-b border-[#D2DFEC]"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enterprise Server-Grade Pagination Footer Bar */}
      <div className="bg-[#E6EEF8] border-t border-[#7FA6C7] px-3 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-[#002D62] select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Filas por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-[#7FA6C7] rounded px-1.5 py-0.5 text-[11px] font-bold text-[#002D62] focus:outline-none cursor-pointer"
          >
            <option value={25}>25 filas</option>
            <option value={50}>50 filas</option>
            <option value={100}>100 filas</option>
            <option value={200}>200 filas</option>
          </select>
          <span className="text-[#90A2B8]">|</span>
          <span className="text-slate-600">
            Mostrando <strong>{displayTransactions.length === 0 ? 0 : startIndex + 1}</strong> - <strong>{Math.min(startIndex + pageSize, displayTransactions.length)}</strong> de <strong>{displayTransactions.length}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick export link to streaming server endpoint */}
          <a
            href="/api/transactions/export"
            download="f0911_transacciones_export.csv"
            className="flex items-center gap-1 px-2 py-0.5 bg-white border border-[#7FA6C7] hover:bg-emerald-50 text-emerald-800 rounded text-[10.5px] font-bold transition-colors shadow-2xs mr-2"
            title="Descarga por flujo directo desde el servidor (sin consumir memoria del navegador)"
          >
            <Download size={11} className="text-emerald-700" />
            <span>Exportar CSV Servidor (Stream)</span>
          </a>

          {/* Navigation controls */}
          <div className="flex items-center gap-0.5 border border-[#7FA6C7] rounded bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safePage <= 1}
              className="p-1 hover:bg-[#D2DFEC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
              title="Primera Página"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-1 hover:bg-[#D2DFEC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed border-r border-[#D2DFEC]"
              title="Página Anterior"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="px-2 font-mono font-bold text-[10.5px] text-[#002D62] whitespace-nowrap">
              Página {safePage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="p-1 hover:bg-[#D2DFEC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed border-l border-[#D2DFEC]"
              title="Página Siguiente"
            >
              <ChevronRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage >= totalPages}
              className="p-1 hover:bg-[#D2DFEC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
              title="Última Página"
            >
              <ChevronsRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* F980011D - MAESTRO DE ATRIBUTOS REGISTRO (INSPECTOR MODAL) */}
      {/* ========================================================== */}
      {inspectTarget && (
        <F980011DModal
          isOpen={!!inspectTarget}
          onClose={() => setInspectTarget(null)}
          registryId={inspectTarget.id || ''}
          entityType="TRANSACTION"
          originalData={inspectTarget}
          currentUser={inspectTarget.user || 'SISTEMA'}
        />
      )}

      {/* ERP CONTEXT MENU */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={!!gridContextMenu}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P0911"
          programTitle="Mayor y Diario de Transacciones"
          collectionName="transactions"
          recordId={gridContextMenu.tx.id}
          recordFolio={gridContextMenu.tx.description || gridContextMenu.tx.id}
          onClose={() => setGridContextMenu(null)}
          onViewDetail={() => {
            onEdit(gridContextMenu.tx);
            setGridContextMenu(null);
          }}
          onSetRowHeight={setDefaultRowHeight}
          onResetColumns={resetWidths}
          onResetRows={resetHeights}
          onResetGridDimensions={resetAll}
        />
      )}
    </div>
  );
};

export default TransactionTable;
