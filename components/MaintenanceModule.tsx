import React, { useState } from 'react';
import { 
  Wrench, Plus, Search, Filter, Calendar, Clock, 
  AlertTriangle, CheckCircle2, PlayCircle, StopCircle,
  ChevronRight, MessageSquare, User, MapPin, 
  ArrowRight, FileText, Camera, MoreVertical,
  History, TrendingUp, ClipboardList, X, Trash2, CheckSquare, Square, Save
} from 'lucide-react';
import { MaintenanceExpediente, MaintenanceUpdate, Property, MaintenanceSubtask } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface MaintenanceModuleProps {
  expedientes: MaintenanceExpediente[];
  properties: Property[];
  onSave: (expediente: MaintenanceExpediente) => void;
  onDelete: (id: string) => void;
  currentUser: string;
}

const MaintenanceModule: React.FC<MaintenanceModuleProps> = ({ 
  expedientes, 
  properties, 
  onSave, 
  onDelete,
  currentUser 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedExpediente, setSelectedExpediente] = useState<MaintenanceExpediente | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [qbeFolio, setQbeFolio] = useState("");
  const [qbeTitle, setQbeTitle] = useState("");
  const [qbeProperty, setQbeProperty] = useState("");
  const [qbePriority, setQbePriority] = useState("");
  const [qbeStatus, setQbeStatus] = useState("");
  
  // Quick Input States
  const [quickSubtaskTitle, setQuickSubtaskTitle] = useState('');
  const [newUpdateContent, setNewUpdateContent] = useState('');

  const filteredExpedientes = expedientes.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         exp.propertyLabel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || exp.status === filterStatus;
    const matchesQbeFolio = !qbeFolio || exp.id.toLowerCase().includes(qbeFolio.toLowerCase());
    const matchesQbeTitle = !qbeTitle || exp.title.toLowerCase().includes(qbeTitle.toLowerCase());
    const matchesQbeProperty = !qbeProperty || exp.propertyLabel.toLowerCase().includes(qbeProperty.toLowerCase());
    const matchesQbePriority = !qbePriority || exp.priority.toLowerCase().includes(qbePriority.toLowerCase());
    const matchesQbeStatus = !qbeStatus || exp.status.toLowerCase().includes(qbeStatus.toLowerCase());
    return matchesSearch && matchesStatus && matchesQbeFolio && matchesQbeTitle && matchesQbeProperty && matchesQbePriority && matchesQbeStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDIENTE': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'EN_PROCESO': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DETENIDO': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'FINALIZADO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'CRÍTICA': return <AlertTriangle className="text-rose-600" size={14} />;
      case 'ALTA': return <TrendingUp className="text-orange-500" size={14} />;
      case 'MEDIA': return <Clock className="text-blue-500" size={14} />;
      default: return <div className="w-3.5 h-3.5 rounded-full bg-slate-300" />;
    }
  };

  const handleToggleSubtask = (subtaskId: string) => {
    if (!selectedExpediente) return;
    const currentSubtasks = selectedExpediente.subtasks || [];
    const updatedSubtasks = currentSubtasks.map(sub => {
      if (sub.id === subtaskId) {
        const nextStatus = sub.status === 'FINALIZADA' ? 'PENDIENTE' : 'FINALIZADA';
        return {
          ...sub,
          status: nextStatus as any,
          completedAt: nextStatus === 'FINALIZADA' ? new Date().toISOString() : undefined
        };
      }
      return sub;
    });

    const updatedExpediente: MaintenanceExpediente = {
      ...selectedExpediente,
      subtasks: updatedSubtasks
    };
    onSave(updatedExpediente);
    setSelectedExpediente(updatedExpediente);
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!selectedExpediente) return;
    const currentSubtasks = selectedExpediente.subtasks || [];
    const updatedSubtasks = currentSubtasks.filter(sub => sub.id !== subtaskId);

    const updatedExpediente: MaintenanceExpediente = {
      ...selectedExpediente,
      subtasks: updatedSubtasks
    };
    onSave(updatedExpediente);
    setSelectedExpediente(updatedExpediente);
  };

  const handleQuickSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpediente || !quickSubtaskTitle.trim()) return;

    const newSub: MaintenanceSubtask = {
      id: crypto.randomUUID(),
      title: quickSubtaskTitle.trim().toUpperCase(),
      status: 'PENDIENTE',
    };

    const updatedExpediente: MaintenanceExpediente = {
      ...selectedExpediente,
      subtasks: [...(selectedExpediente.subtasks || []), newSub]
    };

    onSave(updatedExpediente);
    setSelectedExpediente(updatedExpediente);
    setQuickSubtaskTitle('');
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-50 overflow-auto">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 p-4 md:p-6 shrink-0 overflow-x-auto min-w-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#0B3C5D] text-white rounded-2xl shadow-lg shadow-blue-100">
              <Wrench size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Expedientes de Mantención</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestión de reparaciones y seguimiento semanal</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text"
                placeholder="Buscar expedientes..."
                className="pl-9 pr-3 py-2.5 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-600 rounded-xl text-xs font-bold outline-none transition-all w-32 sm:w-44 lg:w-56"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="px-3 py-2.5 bg-slate-100 border-transparent rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-600 transition-all text-slate-700 uppercase"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">TODOS</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="EN_PROCESO">EN PROCESO</option>
              <option value="DETENIDO">DETENIDO</option>
              <option value="FINALIZADO">FINALIZADO</option>
            </select>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0B3C5D] text-white rounded-xl font-black text-xs uppercase shadow-xl shadow-blue-50 hover:bg-opacity-90 transition-all active:scale-95"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Nuevo Expediente</span><span className="inline sm:hidden">Nuevo</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: ASSETFLOW ENTERPRISE GRID (P13700) */}
      <div className="flex-1 overflow-auto flex flex-col min-h-0 bg-[#F4F6F9] p-4 md:p-6 gap-6">
        {/* ERP Grid Table Container */}
        <div className="bg-[#FAFBFD] border border-[#91A6BA] rounded-sm shadow-sm overflow-hidden flex flex-col shrink-0">
          {/* ERP Grid Header Bar */}
          <div className="bg-[#E9F0F8] border-b border-[#C3D5E6] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-2 text-[#0B3C5D] font-bold">
              <span className="font-mono bg-[#0B3C5D] text-white px-1.5 py-0.5 rounded text-[9px]">P13700 / W13700A</span>
              <span>Trabajar con Expedientes de Mantenimiento</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600 font-mono text-[9.5px]">
                Registros: <strong className="text-slate-900">{filteredExpedientes.length}</strong> de {expedientes.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQbeFolio("");
                  setQbeTitle("");
                  setQbeProperty("");
                  setQbePriority("");
                  setQbeStatus("");
                  setSearchTerm("");
                  setFilterStatus("ALL");
                }}
                className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-[9.5px] font-bold shadow-3xs cursor-pointer"
              >
                Limpiar QBE
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="px-2.5 py-1 bg-[#0B3C5D] hover:bg-[#144f77] text-white rounded text-[9.5px] font-bold flex items-center gap-1 shadow-3xs cursor-pointer"
              >
                <Plus size={11} />
                <span>Nuevo Expediente</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[420px] custom-audit-scroll">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#E2ECF5] border-b border-[#91A6BA] text-[#143B57] text-[10px] font-black uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center border-r border-[#B0C4D6]">#</th>
                  <th className="py-2.5 px-3 w-28 border-r border-[#B0C4D6]">Estado</th>
                  <th className="py-2.5 px-3 w-24 text-center border-r border-[#B0C4D6]">Prioridad</th>
                  <th className="py-2.5 px-3 w-28 border-r border-[#B0C4D6]">ID / Folio</th>
                  <th className="py-2.5 px-3 min-w-[220px] border-r border-[#B0C4D6]">Título del Expediente</th>
                  <th className="py-2.5 px-3 min-w-[180px] border-r border-[#B0C4D6]">Propiedad / Ubicación</th>
                  <th className="py-2.5 px-3 w-32 border-r border-[#B0C4D6]">Categoría</th>
                  <th className="py-2.5 px-3 w-28 text-center border-r border-[#B0C4D6]">Fecha</th>
                  <th className="py-2.5 px-3 w-24 text-center border-r border-[#B0C4D6]">Avances</th>
                  <th className="py-2.5 px-3 w-28 text-center">Acciones</th>
                </tr>
                {/* QBE Filter Row */}
                <tr className="bg-[#EDF4FA] border-b border-[#91A6BA] text-[10px]">
                  <th className="p-1 border-r border-[#B0C4D6] text-center font-mono text-[9px] text-slate-400">QBE</th>
                  <th className="p-1 border-r border-[#B0C4D6]">
                    <input
                      type="text"
                      placeholder="Filtro..."
                      value={qbeStatus}
                      onChange={(e) => setQbeStatus(e.target.value)}
                      className="w-full px-1.5 py-0.5 bg-white border border-[#A7BCCF] rounded text-[10px] outline-none"
                    />
                  </th>
                  <th className="p-1 border-r border-[#B0C4D6]">
                    <input
                      type="text"
                      placeholder="Filtro..."
                      value={qbePriority}
                      onChange={(e) => setQbePriority(e.target.value)}
                      className="w-full px-1.5 py-0.5 bg-white border border-[#A7BCCF] rounded text-[10px] outline-none text-center"
                    />
                  </th>
                  <th className="p-1 border-r border-[#B0C4D6]">
                    <input
                      type="text"
                      placeholder="Filtro..."
                      value={qbeFolio}
                      onChange={(e) => setQbeFolio(e.target.value)}
                      className="w-full px-1.5 py-0.5 bg-white border border-[#A7BCCF] rounded text-[10px] outline-none font-mono"
                    />
                  </th>
                  <th className="p-1 border-r border-[#B0C4D6]">
                    <input
                      type="text"
                      placeholder="Filtro título..."
                      value={qbeTitle}
                      onChange={(e) => setQbeTitle(e.target.value)}
                      className="w-full px-1.5 py-0.5 bg-white border border-[#A7BCCF] rounded text-[10px] outline-none"
                    />
                  </th>
                  <th className="p-1 border-r border-[#B0C4D6]">
                    <input
                      type="text"
                      placeholder="Filtro propiedad..."
                      value={qbeProperty}
                      onChange={(e) => setQbeProperty(e.target.value)}
                      className="w-full px-1.5 py-0.5 bg-white border border-[#A7BCCF] rounded text-[10px] outline-none"
                    />
                  </th>
                  <th className="p-1 border-r border-[#B0C4D6]"></th>
                  <th className="p-1 border-r border-[#B0C4D6]"></th>
                  <th className="p-1 border-r border-[#B0C4D6]"></th>
                  <th className="p-1"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5E1ED] text-[11px] font-sans">
                {filteredExpedientes.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                      <ClipboardList size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="font-bold uppercase tracking-wider text-xs">No se encontraron expedientes con los filtros actuales</p>
                    </td>
                  </tr>
                ) : (
                  filteredExpedientes.map((exp, idx) => {
                    const isSelected = selectedExpediente?.id === exp.id;
                    return (
                      <tr
                        key={exp.id}
                        onClick={() => setSelectedExpediente(exp)}
                        className={`transition-colors cursor-pointer border-b border-[#E2ECF5] ${
                          isSelected ? "bg-[#DFE8F6] font-medium" : "hover:bg-[#EDF4FA]"
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-500 border-r border-[#E2ECF5]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-[#E2ECF5]">
                          <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border ${getStatusColor(exp.status)}`}>
                            {exp.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center border-r border-[#E2ECF5]">
                          <div className="flex items-center justify-center gap-1">
                            {getPriorityIcon(exp.priority)}
                            <span className="text-[9px] font-black uppercase text-slate-600">{exp.priority}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-700 border-r border-[#E2ECF5]">
                          {exp.id.split("-")[0].toUpperCase()}
                        </td>
                        <td className="py-2 px-3 border-r border-[#E2ECF5]">
                          <p className="font-black text-slate-900 uppercase leading-snug">{exp.title}</p>
                        </td>
                        <td className="py-2 px-3 border-r border-[#E2ECF5] text-slate-700 uppercase font-medium">
                          {exp.propertyLabel}
                        </td>
                        <td className="py-2 px-3 border-r border-[#E2ECF5] text-slate-600 uppercase text-[10px]">
                          {exp.category}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600 border-r border-[#E2ECF5]">
                          {exp.requestDate}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-[#0B3C5D] border-r border-[#E2ECF5]">
                          {exp.updates.length}
                        </td>
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedExpediente(exp)}
                              className="px-2 py-1 bg-white hover:bg-[#0B3C5D] hover:text-white text-slate-700 border border-slate-300 rounded text-[9.5px] font-bold transition-all shadow-3xs cursor-pointer"
                              title="Ver Ficha Detallada"
                            >
                              Ver Ficha
                            </button>
                            <button
                              onClick={() => onDelete(exp.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                              title="Eliminar Expediente"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ERP Bottom Status Strip */}
          <div className="bg-[#E9F0F8] border-t border-[#C3D5E6] px-4 py-1.5 flex items-center justify-between text-[9.5px] text-slate-600 font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                ERP Grid En Línea
              </span>
              <span>•</span>
              <span>Hacer clic en cualquier fila para desplegar auditoría, sub-tareas y avances abajo</span>
            </div>
            <div>
              Expedientes Activos: <strong className="text-slate-900">{filteredExpedientes.length}</strong>
            </div>
          </div>
        </div>
{/* DETAILS */}
        <div className="flex-1 bg-slate-50 overflow-y-auto custom-audit-scroll">
          {selectedExpediente ? (
            <div className="p-6 max-w-4xl mx-auto space-y-6">
              {/* EXPEDIENTE HEADER */}
              <div className="bg-white rounded-[24px] p-6 shadow-xs border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border ${getStatusColor(selectedExpediente.status)}`}>
                        {selectedExpediente.status}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        ID: {selectedExpediente.id.split('-')[0]}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                      {selectedExpediente.title}
                    </h2>
                    <p className="text-[#0B3C5D] font-bold text-xs uppercase flex items-center gap-2">
                      <MapPin size={14} /> {selectedExpediente.propertyLabel}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onDelete(selectedExpediente.id)}
                      className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                      title="Eliminar Expediente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 py-4 border-y border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoría</p>
                    <p className="text-xs font-black text-slate-700 uppercase">{selectedExpediente.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prioridad</p>
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(selectedExpediente.priority)}
                      <p className="text-xs font-black text-slate-700 uppercase">{selectedExpediente.priority}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha Solicitud</p>
                    <p className="text-xs font-black text-slate-700 uppercase">{selectedExpediente.requestDate}</p>
                  </div>
                </div>

                {/* DESCRIPCIÓN */}
                <div className="mt-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Descripción del Caso</p>
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-slate-50 p-3 rounded-xl border border-slate-150">
                    {selectedExpediente.description}
                  </p>
                </div>

                {/* CONTROLES DE CAMBIO DE ESTADO DIRECTO */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-indigo-600" /> Presione para Cambiar Estado:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['PENDIENTE', 'EN_PROCESO', 'DETENIDO', 'FINALIZADO'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          const updatedExpediente: MaintenanceExpediente = {
                            ...selectedExpediente,
                            status: st
                          };
                          onSave(updatedExpediente);
                          setSelectedExpediente(updatedExpediente);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase border transition-all active:scale-95 flex items-center gap-1.5 ${
                          selectedExpediente.status === st
                            ? getStatusColor(st) + ' ring-2 ring-indigo-200 border-indigo-300 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          st === 'PENDIENTE' ? 'bg-amber-500' :
                          st === 'EN_PROCESO' ? 'bg-blue-500' :
                          st === 'DETENIDO' ? 'bg-rose-500' :
                          'bg-emerald-500'
                        }`} />
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* DUAL COLUMN: SUBTASKS & ADVANCES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* COLUMN 1: SUBTASKS (SUBTAREAS) */}
                <div className="bg-white rounded-[24px] p-5 shadow-xs border border-slate-200 space-y-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <ClipboardList className="text-[#0B3C5D]" size={18} />
                      Tareas por Hacer (Checklist)
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {selectedExpediente.subtasks && selectedExpediente.subtasks.length > 0
                        ? `${selectedExpediente.subtasks.filter(s => s.status === 'FINALIZADA').length} de ${selectedExpediente.subtasks.length} completadas`
                        : "Sin subtareas asignadas"}
                    </p>
                  </div>

                  {/* QUICK SUBTASK FORM */}
                  <form onSubmit={handleQuickSubtaskSubmit} className="flex gap-2">
                    <input 
                      type="text" 
                      required
                      value={quickSubtaskTitle}
                      onChange={e => setQuickSubtaskTitle(e.target.value.toUpperCase())}
                      placeholder="ESCRIBA UNA TAREA Y PRESIONE ENTRAR"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none focus:border-indigo-600 focus:bg-white uppercase transition-all"
                    />
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-[#0B3C5D] text-white rounded-xl font-black text-xs uppercase hover:bg-opacity-95 transition-all active:scale-95 shrink-0"
                    >
                      Añadir
                    </button>
                  </form>

                  {/* PROGRESS BAR */}
                  {selectedExpediente.subtasks && selectedExpediente.subtasks.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase">
                        <span>Progreso de ejecución</span>
                        <span className="text-[#0B3C5D]">
                          {Math.round(
                            (selectedExpediente.subtasks.filter(s => s.status === 'FINALIZADA').length / selectedExpediente.subtasks.length) * 100
                          )}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#0B3C5D] transition-all duration-300 rounded-full" 
                          style={{
                            width: `${Math.round(
                              (selectedExpediente.subtasks.filter(s => s.status === 'FINALIZADA').length / selectedExpediente.subtasks.length) * 100
                            )}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* LIST OF SUBTASKS */}
                  <div className="space-y-2">
                    {!selectedExpediente.subtasks || selectedExpediente.subtasks.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 border border-dashed border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Sin tareas aún</p>
                      </div>
                    ) : (
                      selectedExpediente.subtasks.map(sub => {
                        const isDone = sub.status === 'FINALIZADA';
                        return (
                          <div 
                            key={sub.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                              isDone ? 'bg-emerald-50/10 border-emerald-100 text-slate-400' : 'bg-slate-50/50 border-slate-100'
                            }`}
                          >
                            <button 
                              type="button"
                              onClick={() => handleToggleSubtask(sub.id)}
                              className="flex items-center gap-3 text-left flex-1 min-w-0"
                            >
                              {isDone ? (
                                <CheckSquare size={18} className="text-emerald-600 fill-emerald-50 shrink-0" />
                              ) : (
                                <Square size={18} className="text-slate-400 shrink-0" />
                              )}
                              <span className={`text-xs font-bold uppercase tracking-tight break-words truncate ${isDone ? 'line-through text-slate-400 font-normal' : 'text-slate-800'}`}>
                                {sub.title}
                              </span>
                            </button>

                            <button 
                              type="button"
                              onClick={() => confirm('¿Eliminar esta tarea?') && handleDeleteSubtask(sub.id)}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0 ml-2"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* COLUMN 2: WEEKLY ADVANCES (HISTORIAL DE AVANCES) */}
                <div className="bg-white rounded-[24px] p-5 shadow-xs border border-slate-200 space-y-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <History className="text-[#0B3C5D]" size={18} />
                      Avances del Caso
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      Bitácora de actualización y novedades semanales
                    </p>
                  </div>

                  {/* INLINE WRITE UPDATE BOX */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-[9px] font-black text-[#0B3C5D] uppercase tracking-widest">Escribir Nuevo Avance Directo:</p>
                    <textarea 
                      rows={2}
                      placeholder="DETALLE AQUÍ LOS NUEVOS TRABAJOS REALIZADOS O NOVEDADES..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-600 uppercase transition-all resize-none"
                      value={newUpdateContent}
                      onChange={(e) => setNewUpdateContent(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <button 
                        type="button"
                        onClick={() => {
                          if (!newUpdateContent.trim()) return;
                          const newUpdate: MaintenanceUpdate = {
                            id: crypto.randomUUID(),
                            date: new Date().toISOString().split('T')[0],
                            content: newUpdateContent.trim().toUpperCase(),
                            user: currentUser,
                            timestamp: Date.now()
                          };
                          const updatedExpediente: MaintenanceExpediente = {
                            ...selectedExpediente,
                            updates: [newUpdate, ...selectedExpediente.updates]
                          };
                          onSave(updatedExpediente);
                          setSelectedExpediente(updatedExpediente);
                          setNewUpdateContent('');
                        }}
                        className="px-4 py-2 bg-[#0B3C5D] text-white rounded-xl font-black text-[10px] uppercase hover:bg-opacity-95 transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <Save size={12} /> Guardar Avance
                      </button>
                    </div>
                  </div>

                  {/* UPDATE LIST */}
                  <div className="relative space-y-4 pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 max-h-[300px] overflow-y-auto custom-audit-scroll">
                    {selectedExpediente.updates.length === 0 ? (
                      <div className="py-6 text-center text-slate-400">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Sin avances registrados</p>
                      </div>
                    ) : (
                      selectedExpediente.updates.map((update, idx) => (
                        <div key={update.id} className="relative pl-4">
                          <div className="absolute left-[-16px] top-1.5 w-2 h-2 rounded-full bg-[#0B3C5D]" />
                          <div className="bg-slate-50/70 border border-slate-150 rounded-xl p-3 space-y-1">
                            <div className="flex justify-between items-center text-[8.5px] font-bold text-slate-450 uppercase">
                              <span className="text-[#0B3C5D] font-black">{update.user}</span>
                              <span className="font-mono">{update.date}</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-normal font-bold uppercase">
                              {update.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-24 h-24 bg-white rounded-3xl shadow-xs flex items-center justify-center text-slate-200">
                <FileText size={48} />
              </div>
              <div className="max-w-xs">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Seleccione un Expediente</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Elija un caso de la lista para ver el detalle y los avances semanales.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL NUEVO EXPEDIENTE */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[24px] w-full max-w-xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-[#0B3C5D] p-2.5 rounded-xl text-white">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Nuevo Expediente</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Apertura de caso de mantención</p>
                </div>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const propertyId = formData.get('propertyId') as string;
                const property = properties.find(p => p.id === propertyId);
                
                const newExp: MaintenanceExpediente = {
                  id: crypto.randomUUID(),
                  propertyId,
                  propertyLabel: property ? `${property.building} - ${property.code}` : 'S/N',
                  title: (formData.get('title') as string).trim().toUpperCase(),
                  description: (formData.get('description') as string).trim().toUpperCase(),
                  status: 'PENDIENTE',
                  priority: formData.get('priority') as any,
                  category: formData.get('category') as any,
                  requestDate: new Date().toISOString().split('T')[0],
                  updates: [],
                  userCreator: currentUser,
                  timestamp: Date.now()
                };
                
                onSave(newExp);
                setIsFormOpen(false);
                setSelectedExpediente(newExp);
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase px-1">Propiedad Asociada</label>
                  <select 
                    name="propertyId"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black outline-none focus:border-indigo-600 transition-all text-slate-800"
                  >
                    <option value="">SELECCIONAR PROPIEDAD</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.building} - {p.code}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase px-1">Categoría</label>
                  <select 
                    name="category"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black outline-none focus:border-indigo-600 transition-all text-slate-800"
                  >
                    <option value="REPARACIÓN">REPARACIÓN</option>
                    <option value="MANTENCIÓN">MANTENCIÓN</option>
                    <option value="EMERGENCIA">EMERGENCIA</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase px-1">Título del Caso</label>
                <input 
                  name="title"
                  required
                  placeholder="EJ: REPARACIÓN FILTRACIÓN BAÑO PRINCIPAL"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black uppercase outline-none focus:border-indigo-600 transition-all text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase px-1">Descripción Detallada</label>
                <textarea 
                  name="description"
                  required
                  rows={3}
                  placeholder="DESCRIBA EL PROBLEMA O LA MANTENCIÓN REQUERIDA..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all resize-none text-slate-800 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase px-1">Prioridad</label>
                  <select 
                    name="priority"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black outline-none focus:border-indigo-600 transition-all text-slate-800"
                  >
                    <option value="BAJA">BAJA</option>
                    <option value="MEDIA">MEDIA</option>
                    <option value="ALTA">ALTA</option>
                    <option value="CRÍTICA">CRÍTICA</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    type="submit"
                    className="w-full bg-[#0B3C5D] text-white py-3 rounded-xl font-black text-xs uppercase shadow-xl shadow-blue-50 hover:bg-opacity-95 transition-all active:scale-[0.98]"
                  >
                    Abrir Expediente
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceModule;
