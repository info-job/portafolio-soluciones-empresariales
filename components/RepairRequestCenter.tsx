
import React, { useState, useMemo } from 'react';
import { WorkOrder, Property, WorkOrderStatus } from '../types';
import { CHART_OF_ACCOUNTS } from '../lib/accountingData';
import { 
  Wrench, Search, Plus, Trash2, X, LayoutGrid, List, Filter, 
  ChevronRight, Layers, FileUp, Database, CheckCircle2, AlertTriangle, 
  Loader2, ArrowRight, Table, Settings2, ShieldCheck, Save, ClipboardList, Hammer
} from 'lucide-react';

interface RepairRequestCenterProps {
  workOrders: WorkOrder[];
  properties: Property[];
  currentUser: string;
  onSave: (req: WorkOrder) => void;
  onConvertToOT: () => void;
}

const RepairRequestCenter: React.FC<RepairRequestCenterProps> = ({ workOrders, properties, currentUser, onSave, onConvertToOT }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Solo mostramos las solicitudes que aún no son OTs aprobadas
  const requests = workOrders.filter(o => o.status === 'BORRADOR' || o.status === 'PENDIENTE_VB' || !o.authorizedBy);

  const filtered = requests.filter(r => 
    r.propertyLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.specialInstructions.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-[#f3f2f1] overflow-hidden">
      {/* TOOLBAR */}
      <div className="h-14 bg-white border-b border-slate-300 flex items-center px-4 justify-between shadow-sm z-30">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-700 p-1.5 rounded text-white mr-2">
            <Wrench size={18} />
          </div>
          <h2 className="text-xs font-black text-slate-700 uppercase tracking-tighter">Buzon_Solicitudes_Reparacion.xlsx</h2>
          <div className="h-6 w-[1px] bg-slate-200 mx-4"></div>
          
          <button onClick={() => setIsFormOpen(true)} className="flex flex-col items-center px-4 py-1 hover:bg-slate-100 rounded transition-colors group">
            <Plus size={18} className="text-indigo-700" />
            <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Nueva Falla</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar unidad o descripción..." 
              className="bg-slate-50 border border-slate-300 rounded px-8 py-1.5 text-[10px] font-bold uppercase w-64 outline-none focus:ring-1 focus:ring-indigo-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto excel-grid bg-white custom-audit-scroll">
        <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[#f3f2f1] border-b border-slate-300 h-8">
              <th className="w-10 excel-cell-header italic font-black text-[9px]">#</th>
              <th className="w-48 excel-cell-header font-bold text-[9px] uppercase">A - UBICACIÓN</th>
              <th className="w-32 excel-cell-header font-bold text-[9px] uppercase text-center">B - FECHA SOLICITUD</th>
              <th className="w-auto excel-cell-header font-bold text-[9px] uppercase px-4">C - DETALLE TÉCNICO / DIAGNÓSTICO PREVIO</th>
              <th className="w-40 excel-cell-header font-bold text-[9px] uppercase text-center">D - ESTADO GESTIÓN</th>
              <th className="w-40 excel-cell-header font-bold text-[9px] uppercase text-center">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="h-64 text-center">
                   <div className="flex flex-col items-center opacity-20">
                      <ClipboardList size={64} />
                      <p className="text-sm font-black uppercase mt-4">Sin solicitudes de reparación activas</p>
                   </div>
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <tr key={r.id} className="h-12 hover:bg-slate-50 transition-colors group">
                  <td className="excel-cell-header italic font-medium text-[10px]">{idx + 1}</td>
                  <td className="px-3 text-[10px] font-black text-slate-800 border-r border-slate-200 uppercase">{r.propertyLabel}</td>
                  <td className="px-2 text-[10px] font-mono font-black text-slate-400 border-r border-slate-200 text-center">{r.issueDate}</td>
                  <td className="px-4 text-[10px] font-medium text-slate-500 border-r border-slate-200 truncate uppercase italic">
                    {r.specialInstructions || 'S/D'}
                  </td>
                  <td className="px-2 border-r border-slate-200 text-center">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase bg-indigo-50 text-indigo-700`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 text-center">
                     <button 
                       onClick={onConvertToOT}
                       className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-sm"
                     >
                        <Hammer size={12} /> Convertir a OT
                     </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl border-[8px] border-[#f3f2f1] overflow-hidden scale-in-center">
              <div className="bg-indigo-700 p-8 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <Wrench size={24} />
                    <h2 className="text-xl font-black uppercase tracking-tighter">Nueva Solicitud de Reparación</h2>
                 </div>
                 <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={32}/></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const propId = fd.get('propertyId') as string;
                const prop = properties.find(p => p.id === propId);
                
                const sol: WorkOrder = {
                  id: crypto.randomUUID(),
                  folio: 'SOL-TEMP',
                  issueDate: new Date().toISOString().split('T')[0],
                  preparedBy: currentUser,
                  preparedByDept: 'MANTENCION',
                  preparedByPhone: '',
                  preparedByEmail: '',
                  supplierId: '',
                  supplierName: 'PENDIENTE',
                  supplierTaxId: '',
                  supplierTaxDocumentType: 'FACTURA',
                  supplierAddress: '',
                  supplierContact: '',
                  supplierPhone: '',
                  supplierEmail: '',
                  quoteNumber: '',
                  requestDate: new Date().toISOString().split('T')[0],
                  reqDept: 'Inmobiliario',
                  deliveryDate: '',
                  paymentTerms: '',
                  deliveryAddress: prop?.address || '',
                  items: [],
                  subtotal: 0,
                  iva: 0,
                  total: 0,
                  specialInstructions: (fd.get('description') as string).toUpperCase(),
                  status: 'BORRADOR',
                  propertyId: propId,
                  propertyLabel: `${prop?.building} - PISO ${prop?.floor}`,
                  accountCode: fd.get('accountCode') as string,
                  timestamp: Date.now(),
                  lockedBy: null, lockedAt: null
                };
                onSave(sol);
                setIsFormOpen(false);
              }} className="p-10 space-y-6">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Propiedad con Siniestro / Falla</label>
                    <select required name="propertyId" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500">
                       <option value="">-- SELECCIONE UNIDAD --</option>
                       {properties.map(p => <option key={p.id} value={p.id}>{p.building} - {p.code} ({p.address})</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cuenta Contable Sugerida</label>
                    <select name="accountCode" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500">
                       <option value="">-- SELECCIONE CUENTA --</option>
                       {CHART_OF_ACCOUNTS.filter(a => a.level >= 3).map(acc => (
                          <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                       ))}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Descripción del Problema</label>
                    <textarea required name="description" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none" placeholder="EJ: FILTRACIÓN EN BAÑO PRINCIPAL, GRIETA EN CIELO..."/>
                 </div>
                 <button type="submit" className="w-full py-5 bg-indigo-700 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl border-b-8 border-indigo-900 active:translate-y-1 active:border-b-0 transition-all">
                    Registrar en Bitácora
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default RepairRequestCenter;
