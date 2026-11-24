
import React, { useState, useEffect, useMemo } from 'react';
import { Supplier } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, CartesianGrid, AreaChart, Area
} from 'recharts';
import { Sparkles, Building2, Ban, ShieldCheck, Activity, Target } from 'lucide-react';
import { getSupplierInsights } from '../geminiService';

const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];

const DashboardSheet: React.FC<{ transactions: any[] }> = ({ transactions: suppliersData }) => {
  const suppliers = suppliersData as Supplier[];
  const [insights, setInsights] = useState<string>("Analizando base de datos...");

  useEffect(() => {
    if (suppliers.length > 0) {
      getSupplierInsights(suppliers).then(setInsights);
    }
  }, [suppliers.length]);

  const categorySummary = useMemo(() => {
    const data: Record<string, number> = {};
    suppliers.forEach(s => {
      data[s.category] = (data[s.category] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [suppliers]);

  const statusData = [
    { name: 'Activos', value: suppliers.filter(s => s.status === 'ACTIVE').length },
    { name: 'Bloqueados', value: suppliers.filter(s => s.status === 'BLOCKED').length }
  ];

  return (
    <div className="h-full bg-slate-50 p-8 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
              <div className="w-4 h-12 bg-slate-900 rounded-full"></div>
              Control de Cartera de Terceros
            </h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 italic">Vigilancia corporativa de alta disponibilidad</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Building2 size={24} /></div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">REGISTRADOS</span>
             </div>
             <p className="text-4xl font-black text-slate-900">{suppliers.length}</p>
             <p className="text-[10px] text-indigo-600 font-bold mt-1">Total en Base de Datos</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><Ban size={24} /></div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">LISTA NEGRA</span>
             </div>
             <p className="text-4xl font-black text-slate-900">{suppliers.filter(s => s.status === 'BLOCKED').length}</p>
             <p className="text-[10px] text-rose-600 font-bold mt-1">Proveedores No Aptos</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/10 rounded-2xl"><ShieldCheck size={24} /></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CUMPLIMIENTO</span>
             </div>
             <p className="text-4xl font-black text-white">{suppliers.length > 0 ? Math.round((suppliers.filter(s => s.status === 'ACTIVE').length / suppliers.length) * 100) : 0}%</p>
             <p className="text-[10px] text-indigo-300 font-bold mt-1">Índice de Salud de Cartera</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                 <Target size={18} className="text-indigo-600" /> Distribución por Rubro
              </h3>
              <div className="h-72">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categorySummary}>
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'black' }} />
                       <YAxis hide />
                       <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                       <Bar dataKey="value" fill="#6366f1" radius={[12, 12, 12, 12]} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Sparkles size={24} /></div>
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Reporte IA de Riesgos</h3>
                 </div>
                 <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {insights}
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardSheet;
