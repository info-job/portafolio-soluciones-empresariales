
import React, { useState, useMemo } from 'react';
import { Contract, Supplier, ContractStatus } from '../types';
import { CHART_OF_ACCOUNTS } from '../lib/accountingData';
import { 
  Plus, FileSignature, Search, Trash2, Edit3, X, 
  Calendar, DollarSign, Building2, Layers, AlertCircle, 
  CheckCircle2, Clock, Scale, Printer, ChevronDown, Book
} from 'lucide-react';
import { printHtmlElement } from '../lib/printDocument';

interface ContractModuleProps {
  contracts: Contract[];
  suppliers: Supplier[];
  onSave: (c: Contract) => void;
  onDelete: (id: string) => void;
  companyLogo: string | null;
  currentUser: string;
}

const ContractModule: React.FC<ContractModuleProps> = ({ contracts, suppliers, onSave, onDelete, companyLogo, currentUser }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewReportOpen, setIsPreviewReportOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const reportFolio = useMemo(() => `REP-CON-${Date.now()}`, [isPreviewReportOpen]);

  const [formData, setFormData] = useState<Omit<Contract, 'id' | 'timestamp' | 'status'>>({
    supplierId: '', supplierName: '', building: 'CENTENARIO', floor: '',
    startDate: new Date().toISOString().split('T')[0], endDate: '', monthlyAmount: 0, summary: '',
    accountCode: ''
  });

  const getContractStatus = (endDate: string): ContractStatus => {
    if (!endDate) return 'VIGENTE';
    const now = new Date();
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'VENCIDO';
    if (diffDays < 45) return 'POR_VENCER';
    return 'VIGENTE';
  };

  const filtered = contracts.filter(c => 
    c.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.building.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#f3f2f1] overflow-auto">
      {/* TOOLBAR */}
      <div className="min-h-14 py-2 bg-white border-b border-slate-300 flex flex-wrap items-center px-4 justify-between gap-2 shadow-sm z-30 no-print overflow-x-auto min-w-0">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded text-white mr-2">
            <Scale size={18} />
          </div>
          <h2 className="text-xs font-black text-slate-700 uppercase tracking-tighter">Archivo_Legal_Contratos.xlsx</h2>
          <div className="h-6 w-[1px] bg-slate-200 mx-4"></div>
          <button onClick={() => setIsFormOpen(true)} className="flex flex-col items-center px-4 py-1 hover:bg-slate-100 rounded transition-colors group">
            <Plus size={18} className="text-indigo-700" />
            <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Nuevo</span>
          </button>
          <button onClick={() => setIsPreviewReportOpen(true)} className="flex flex-col items-center px-4 py-1 hover:bg-slate-100 rounded transition-colors group border-l border-slate-200 ml-1">
            <Printer size={18} className="text-slate-700" />
            <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Reporte Estado</span>
          </button>
        </div>
        <div className="relative">
          <input 
            type="text" placeholder="Buscar proveedor..." 
            className="bg-slate-50 border border-slate-300 rounded px-8 py-1.5 text-[10px] font-bold uppercase w-64 outline-none"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
          <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
        </div>
      </div>

      <div className="flex-1 overflow-auto excel-grid bg-white no-print">
        <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[#f3f2f1] border-b border-slate-300 h-8">
              <th className="w-10 excel-cell-header font-black text-[9px]">#</th>
              <th className="w-48 excel-cell-header font-bold text-[9px]">PROVEEDOR</th>
              <th className="w-32 excel-cell-header font-bold text-[9px]">UBICACIÓN</th>
              <th className="w-24 excel-cell-header font-bold text-center text-[9px]">VENCIMIENTO</th>
              <th className="w-auto excel-cell-header font-bold text-left px-4 text-[9px]">SÍNTESIS</th>
              <th className="w-32 excel-cell-header font-bold text-right px-4 text-[9px]">MONTO</th>
              <th className="w-28 excel-cell-header font-bold text-center text-[9px]">ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => (
              <tr key={c.id} className="h-10 hover:bg-slate-50 border-b">
                <td className="excel-cell-header italic font-medium text-[10px]">{idx + 1}</td>
                <td className="px-3 text-[10px] font-black uppercase truncate">{c.supplierName}</td>
                <td className="px-3 text-[10px] font-bold text-slate-400 uppercase">{c.building} / PISO {c.floor}</td>
                <td className="px-2 text-[10px] font-mono font-black text-center">{c.endDate || 'INDEF.'}</td>
                <td className="px-4 text-[10px] font-medium text-slate-500 truncate uppercase italic">{c.summary}</td>
                <td className="px-4 text-[11px] font-black text-right">${c.monthlyAmount.toLocaleString()}</td>
                <td className="px-2 text-center">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase ${c.status === 'VIGENTE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL REPORTE CONTRATOS FOLIADO */}
      {isPreviewReportOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-100 flex flex-col no-print overflow-hidden">
            <div className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between shadow-xs">
                <button onClick={() => setIsPreviewReportOpen(false)} className="flex items-center gap-3 px-6 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl border border-slate-300 font-black text-xs uppercase cursor-pointer"><X size={18} /> Cerrar</button>
                <div className="text-right">
                   <p className="text-amber-700 font-black text-[10px] uppercase">Certificación de Vigencia • {reportFolio}</p>
                   <button onClick={() => printHtmlElement("printable-report", `Estado_Contratos_${reportFolio}`)} className="mt-1 bg-indigo-600 text-white px-8 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-md hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"><Printer size={16} /> Imprimir Estado de Contratos</button>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-12 bg-slate-200 flex justify-center custom-audit-scroll">
                <div id="printable-report" className="bg-white w-[216mm] min-h-[279mm] shadow-2xl p-[1.5cm] flex flex-col text-black font-sans relative my-10 animate-in zoom-in-95">
                    <div className="flex justify-between items-start border-b-[4px] border-slate-900 pb-6 mb-8">
                        <div className="flex items-center gap-6">
                            {companyLogo ? (
                               <img src={companyLogo} className="w-24 h-24 object-contain" alt="Logo Corporativo" />
                            ) : (
                               <div className="w-20 h-20 bg-indigo-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl">LEG</div>
                            )}
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 text-slate-900">Estado de Contratos Vigentes</h1>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reporte Consolidado de Obligaciones Contractuales</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-black uppercase">Folio: {reportFolio}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase">Corte: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-10">
                        <div className="bg-slate-50 p-6 border-l-4 border-indigo-600">
                           <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Carga Contractual</p>
                           <p className="text-2xl font-black">{contracts.length} Contratos</p>
                        </div>
                        <div className="bg-slate-50 p-6 border-l-4 border-emerald-600">
                           <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Canon Mensual Total</p>
                           <p className="text-2xl font-black">${contracts.reduce((sum, c) => sum + c.monthlyAmount, 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 p-6 border-l-4 border-rose-600">
                           <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Críticos / Vencidos</p>
                           <p className="text-2xl font-black">{contracts.filter(c => c.status !== 'VIGENTE').length}</p>
                        </div>
                    </div>

                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-slate-100 border-y border-black">
                             <th className="p-2 text-[10px] font-black uppercase">Proveedor / Prestador</th>
                             <th className="p-2 text-[10px] font-black uppercase">Edificio / Piso</th>
                             <th className="p-2 text-[10px] font-black uppercase">Vencimiento</th>
                             <th className="p-2 text-[10px] font-black uppercase text-right">Canon ($)</th>
                             <th className="p-2 text-[10px] font-black uppercase text-center">Estado</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-200">
                          {contracts.map(c => (
                             <tr key={c.id} className="text-[9px]">
                                <td className="p-2 font-black uppercase">{c.supplierName}</td>
                                <td className="p-2 uppercase">{c.building} - {c.floor}</td>
                                <td className="p-2 font-mono">{c.endDate || 'INDEF.'}</td>
                                <td className="p-2 text-right font-black">${c.monthlyAmount.toLocaleString()}</td>
                                <td className="p-2 text-center font-bold">{c.status}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>

                    <div className="mt-auto pt-10 border-t border-slate-200 flex justify-between items-end">
                        <div className="text-[8px] font-mono text-slate-400 italic">VALIDADOR: {reportFolio}</div>
                        <div className="w-64 text-center border-t border-black pt-4">
                            <p className="text-[10px] font-black uppercase text-black">{currentUser}</p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Depto. Jurídico / Inmuebles</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
      {isFormOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-tighter">Gestión de Contrato</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={32}/></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const supplier = suppliers.find(s => s.id === formData.supplierId);
              onSave({
                ...formData,
                id: editingId || crypto.randomUUID(),
                supplierName: supplier?.name || 'S/N',
                status: getContractStatus(formData.endDate),
                timestamp: Date.now()
              } as Contract);
              setIsFormOpen(false);
              setEditingId(null);
              setFormData({
                supplierId: '', supplierName: '', building: 'CENTENARIO', floor: '',
                startDate: new Date().toISOString().split('T')[0], endDate: '', monthlyAmount: 0, summary: '',
                accountCode: ''
              });
            }} className="p-10 space-y-5 bg-slate-50">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor / Contraparte</label>
                <select 
                  required
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600 appearance-none"
                  value={formData.supplierId}
                  onChange={e => setFormData(p => ({...p, supplierId: e.target.value}))}
                >
                  <option value="">-- SELECCIONE PROVEEDOR --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Edificio</label>
                  <select 
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600"
                    value={formData.building}
                    onChange={e => setFormData(p => ({...p, building: e.target.value}))}
                  >
                    <option value="CENTENARIO">CENTENARIO</option>
                    <option value="CATEDRAL">CATEDRAL</option>
                    <option value="HUERFANOS">HUERFANOS</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Piso / Unidad</label>
                  <input 
                    required
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600"
                    value={formData.floor}
                    onChange={e => setFormData(p => ({...p, floor: e.target.value.toUpperCase()}))}
                    placeholder="EJ: 1204"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Inicio</label>
                  <input 
                    type="date"
                    required
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black outline-none focus:border-indigo-600"
                    value={formData.startDate}
                    onChange={e => setFormData(p => ({...p, startDate: e.target.value}))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Vencimiento</label>
                  <input 
                    type="date"
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black outline-none focus:border-indigo-600"
                    value={formData.endDate}
                    onChange={e => setFormData(p => ({...p, endDate: e.target.value}))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto Mensual ($)</label>
                  <input 
                    type="number"
                    required
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black outline-none focus:border-indigo-600"
                    value={formData.monthlyAmount}
                    onChange={e => setFormData(p => ({...p, monthlyAmount: parseInt(e.target.value) || 0}))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cuenta Contable</label>
                  <select 
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600"
                    value={formData.accountCode}
                    onChange={e => setFormData(p => ({...p, accountCode: e.target.value}))}
                  >
                    <option value="">-- SELECCIONE CUENTA --</option>
                    {CHART_OF_ACCOUNTS.filter(a => a.level >= 3).map(acc => (
                      <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Síntesis del Contrato</label>
                <textarea 
                  required
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none focus:border-indigo-600 min-h-[80px]"
                  value={formData.summary}
                  onChange={e => setFormData(p => ({...p, summary: e.target.value.toUpperCase()}))}
                  placeholder="RESUMEN DE OBLIGACIONES..."
                />
              </div>

              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all">
                {editingId ? 'ACTUALIZAR CONTRATO' : 'REGISTRAR CONTRATO'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractModule;
