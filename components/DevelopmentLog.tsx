
import React from 'react';
import { BookOpen, CheckCircle2, Zap, Shield, Layers, Code, Terminal, Info } from 'lucide-react';

const DevelopmentLog: React.FC = () => {
  const modules = [
    {
      id: 1,
      title: "Centro de Tareas (Inicio)",
      desc: "Panel de control con resumen de tareas pendientes.",
      features: ["Validación de proveedores (VoBo Jefatura)", "Alertas de contratos por vencer", "Gastos de alto valor"],
      icon: <Layers className="text-indigo-600" />
    },
    {
      id: 2,
      title: "Gestión de Oficios",
      desc: "Registro y seguimiento de documentos normados (Entrantes/Salientes).",
      features: ["Filtros por tipo", "Estados dinámicos", "Carga de archivos", "Exportación a Excel"],
      icon: <Terminal className="text-blue-600" />
    },
    {
      id: 3,
      title: "Gestión Financiera (Planillas)",
      desc: "Control de ingresos y egresos.",
      features: ["Categorización", "Asociación a proveedores/propiedades", "Exportación a Excel"],
      icon: <Zap className="text-amber-600" />
    },
    {
      id: 4,
      title: "Órdenes de Trabajo (OT)",
      desc: "Generación y seguimiento de órdenes de reparación/mantenimiento.",
      features: ["Selección de proveedores y propiedades", "Desglose de ítems", "Estados de recepción", "Exportación a Excel"],
      icon: <Code className="text-emerald-600" />
    },
    {
      id: 5,
      title: "Maestro de Proveedores",
      desc: "Directorio central de prestadores de servicios.",
      features: ["Formulario DI-01 (Alta)", "Validación de compliance", "Niveles de riesgo", "Exportación a Excel"],
      icon: <Shield className="text-rose-600" />
    },
    {
      id: 6,
      title: "Pool de Propiedades",
      desc: "Inventario maestro de activos inmobiliarios.",
      features: ["Vista por edificio/planta", "Catastro de unidades", "Exportación a Excel"],
      icon: <BookOpen className="text-purple-600" />
    },
    {
      id: 7,
      title: "Help Desk TI",
      desc: "Soporte técnico interno.",
      features: ["Sistema de tickets", "Prioridades y categorías", "Seguimiento de resolución", "Exportación a Excel"],
      icon: <Info className="text-cyan-600" />
    },
    {
      id: 8,
      title: "Seguridad y Configuración",
      desc: "Gestión de acceso y personalización.",
      features: ["Alta/Baja de usuarios", "Roles (ADMIN, JEFE, EJECUTIVO)", "Logo corporativo", "Respaldos totales"],
      icon: <Shield className="text-slate-600" />
    }
  ];

  return (
    <div className="h-full bg-slate-50 p-8 overflow-auto custom-audit-scroll">
      <div className="max-w-5xl mx-auto space-y-10 pb-20">
        <div className="flex items-center gap-6 mb-12">
          <div className="bg-indigo-600 p-4 rounded-[24px] text-white shadow-xl shadow-indigo-200">
            <BookOpen size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none italic">Bitácora de Desarrollos</h1>
            <p className="text-indigo-600 text-[11px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
              <CheckCircle2 size={14} /> Registro de Funcionalidades e Integridad del Sistema
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((m) => (
            <div key={m.id} className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex items-start gap-5">
                <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                  {m.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-mono font-black text-slate-300">MOD-0{m.id}</span>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{m.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-bold mb-4">{m.desc}</p>
                  <div className="space-y-2">
                    {m.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 rounded-[40px] p-10 text-white mt-12 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 -mr-10 -mb-10"><Code size={200} /></div>
          <h3 className="text-xl font-black uppercase tracking-tighter mb-6 relative z-10">Funcionalidades Transversales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><Zap size={20} /></div>
                <div><p className="text-[11px] font-black uppercase">Sincronización Cloud</p><p className="text-[9px] text-slate-400 uppercase">OneDrive / Dropbox JSON</p></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><Shield size={20} /></div>
                <div><p className="text-[11px] font-black uppercase">Auditoría Inmutable</p><p className="text-[9px] text-slate-400 uppercase">Registro de cambios total</p></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><Layers size={20} /></div>
                <div><p className="text-[11px] font-black uppercase">Exportación Universal</p><p className="text-[9px] text-slate-400 uppercase">Excel .xlsx en todos los módulos</p></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><CheckCircle2 size={20} /></div>
                <div><p className="text-[11px] font-black uppercase">Reportes de Coherencia</p><p className="text-[9px] text-slate-400 uppercase">Auditoría de integridad de datos</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentLog;
