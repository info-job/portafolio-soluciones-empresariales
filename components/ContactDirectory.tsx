
import React, { useState } from 'react';
import { Contact } from '../types';
// Added Users to the lucide-react imports
import { Search, UserPlus, Mail, Building2, Trash2, Edit2, User, Users, X, Save, Cloud, RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { parseOutlookContacts } from '../geminiService';

interface ContactDirectoryProps {
  contacts: Contact[];
  onAdd: (c: Omit<Contact, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (c: Contact) => void;
}

const ContactDirectory: React.FC<ContactDirectoryProps> = ({ contacts, onAdd, onDelete, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [syncStep, setSyncStep] = useState<'LOGIN' | 'INPUT' | 'PROCESSING' | 'SUCCESS'>('LOGIN');
  const [rawText, setRawText] = useState('');
  const [importedContacts, setImportedContacts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    entity: '',
    position: ''
  });

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      onUpdate({ ...formData, id: editingContact.id });
    } else {
      onAdd(formData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', entity: '', position: '' });
    setEditingContact(null);
    setIsFormOpen(false);
  };

  const handleEdit = (c: Contact) => {
    setEditingContact(c);
    setFormData(c);
    setIsFormOpen(true);
  };

  const handleStartSync = () => {
    setSyncStep('LOGIN');
    setIsSyncOpen(true);
  };

  const handleLoginSim = () => {
    setSyncStep('INPUT');
  };

  const handleProcessImport = async () => {
    if (!rawText.trim()) return;
    setSyncStep('PROCESSING');
    const result = await parseOutlookContacts(rawText);
    setImportedContacts(result);
    setSyncStep('SUCCESS');
  };

  const handleConfirmImport = () => {
    importedContacts.forEach(c => {
      // Evitar duplicados por email
      if (!contacts.some(existing => existing.email.toLowerCase() === c.email.toLowerCase())) {
        onAdd(c);
      }
    });
    setIsSyncOpen(false);
    setRawText('');
    setImportedContacts([]);
  };

  return (
    <div className="h-full bg-slate-50 p-8 overflow-auto custom-audit-scroll">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-4">
               <div className="p-3 bg-slate-800 text-white rounded-2xl shadow-lg"><User size={28} /></div>
               Directorio Corporativo
            </h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 italic">Gestión Centralizada de Contactos e Interesados</p>
          </div>
          <div className="flex gap-3">
             <button 
               onClick={handleStartSync}
               className="bg-[#0078d4] text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-[#005a9e] transition-all shadow-xl border-b-4 border-[#004578]"
             >
               <Cloud size={18} /> Sincronizar Outlook
             </button>
             <button 
               onClick={() => setIsFormOpen(true)}
               className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl"
             >
               <UserPlus size={18} /> Nuevo Manual
             </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
           <Search size={20} className="text-slate-400 ml-4" />
           <input 
              type="text" 
              placeholder="BUSCAR POR NOMBRE, EMPRESA O CORREO..."
              className="flex-1 bg-transparent border-none outline-none text-xs font-black uppercase text-slate-700 py-2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
           />
           <div className="bg-slate-100 px-4 py-2 rounded-xl text-[9px] font-black text-slate-500 uppercase">
              {filteredContacts.length} Contactos
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredContacts.length === 0 ? (
              <div className="col-span-full py-20 text-center opacity-20">
                 <Users size={64} className="mx-auto mb-4" />
                 <p className="text-sm font-black uppercase tracking-widest">No hay contactos registrados</p>
              </div>
           ) : (
              filteredContacts.map(contact => (
                 <div key={contact.id} className="bg-white rounded-[32px] p-8 border-2 border-slate-100 hover:border-indigo-200 transition-all shadow-sm hover:shadow-xl group">
                    <div className="flex justify-between items-start mb-6">
                       <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <User size={24} />
                       </div>
                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(contact)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"><Edit2 size={16}/></button>
                          <button onClick={() => confirm('¿Eliminar contacto?') && onDelete(contact.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 size={16}/></button>
                       </div>
                    </div>
                    <div className="space-y-1 mb-4">
                       <h3 className="text-sm font-black text-slate-900 uppercase truncate">{contact.name}</h3>
                       <p className="text-[10px] font-bold text-indigo-600 uppercase">{contact.position}</p>
                    </div>
                    <div className="space-y-3">
                       <div className="flex items-center gap-3 text-slate-500">
                          <Mail size={14} className="shrink-0" />
                          <span className="text-[10px] font-bold truncate">{contact.email}</span>
                       </div>
                       <div className="flex items-center gap-3 text-slate-500">
                          <Building2 size={14} className="shrink-0" />
                          <span className="text-[10px] font-black uppercase truncate">{contact.entity}</span>
                       </div>
                    </div>
                 </div>
              ))
           )}
        </div>

        {/* MODAL DE SINCRONIZACIÓN OUTLOOK */}
        {isSyncOpen && (
          <div className="fixed inset-0 z-[150] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
             <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="bg-[#0078d4] p-10 text-white flex justify-between items-center relative overflow-hidden">
                   <Cloud className="absolute -right-10 -bottom-10 opacity-10 w-64 h-64" />
                   <div className="flex items-center gap-6 relative z-10">
                      <div className="p-4 bg-white/10 rounded-3xl border border-white/20">
                         <Mail size={32} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Microsoft Outlook Bridge</h2>
                        <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mt-1">Conector de Datos Inteligente • v1.0</p>
                      </div>
                   </div>
                   <button onClick={() => setIsSyncOpen(false)} className="p-2 hover:bg-white/10 rounded-full relative z-10"><X size={32}/></button>
                </div>

                <div className="p-12">
                   {syncStep === 'LOGIN' && (
                     <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-24 h-24 bg-blue-50 text-[#0078d4] rounded-full flex items-center justify-center mx-auto shadow-inner">
                           <RefreshCw size={48} className="animate-spin-slow" />
                        </div>
                        <div className="space-y-3">
                           <h3 className="text-xl font-black text-slate-900 uppercase">Conectar con Microsoft 365</h3>
                           <p className="text-slate-500 text-xs font-bold leading-relaxed max-w-sm mx-auto uppercase tracking-tighter">Haga clic abajo para validar su identidad corporativa y permitir la extracción de contactos externos.</p>
                        </div>
                        <button 
                           onClick={handleLoginSim}
                           className="w-full py-5 bg-[#0078d4] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#005a9e] shadow-xl transition-all flex items-center justify-center gap-3"
                        >
                           Iniciar Sesión con Outlook
                        </button>
                     </div>
                   )}

                   {syncStep === 'INPUT' && (
                     <div className="space-y-8 animate-in fade-in">
                        <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex items-start gap-4">
                           <AlertCircle className="text-amber-600 shrink-0" size={24} />
                           <p className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">
                              Pegue a continuación la lista de contactos exportada, su agenda o incluso una firma de correo. <strong>Nuestra IA procesará y normalizará los datos automáticamente.</strong>
                           </p>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Bloque de Datos Outlook/Texto</label>
                           <textarea 
                              className="w-full h-48 bg-slate-50 border-2 border-slate-100 rounded-[32px] p-8 text-xs font-medium text-slate-700 outline-none focus:border-[#0078d4] resize-none"
                              placeholder="Ej: Juan Perez (j.perez@empresa.cl) Gerente en Constructora ABC..."
                              value={rawText}
                              onChange={e => setRawText(e.target.value)}
                           />
                        </div>
                        <button 
                           onClick={handleProcessImport}
                           disabled={!rawText.trim()}
                           className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${rawText.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                           Analizar con Inteligencia Artificial
                        </button>
                     </div>
                   )}

                   {syncStep === 'PROCESSING' && (
                     <div className="py-20 text-center space-y-8 animate-in fade-in">
                        <div className="relative mx-auto w-24 h-24">
                           <Loader2 size={96} className="text-[#0078d4] animate-spin" />
                           <Cloud className="absolute inset-0 m-auto text-blue-200" size={32} />
                        </div>
                        <div className="space-y-2">
                           <h3 className="text-xl font-black text-slate-900 uppercase">Procesando Atributos...</h3>
                           <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">La IA de Gemini está estructurando sus contactos externos</p>
                        </div>
                     </div>
                   )}

                   {syncStep === 'SUCCESS' && (
                     <div className="space-y-8 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                           <h3 className="text-sm font-black text-slate-900 uppercase">Contactos Identificados ({importedContacts.length})</h3>
                           <div className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle size={16} />
                              <span className="text-[10px] font-black uppercase">Validación Correcta</span>
                           </div>
                        </div>
                        <div className="max-h-64 overflow-auto space-y-2 pr-2 custom-audit-scroll">
                           {importedContacts.map((c, i) => (
                              <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                                 <div>
                                    <p className="text-[11px] font-black text-slate-800 uppercase">{c.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 italic">{c.email}</p>
                                 </div>
                                 <span className="text-[8px] font-black text-indigo-600 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">{c.entity}</span>
                              </div>
                           ))}
                        </div>
                        <div className="flex gap-4">
                           <button onClick={() => setSyncStep('INPUT')} className="flex-1 py-5 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase text-slate-500 hover:bg-slate-50 transition-all">Volver</button>
                           <button onClick={handleConfirmImport} className="flex-[2] py-5 bg-[#0078d4] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-[#005a9e] transition-all">Importar al Directorio</button>
                        </div>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* MODAL DE FORMULARIO MANUAL */}
        {isFormOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
             <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl border-4 border-slate-800 overflow-hidden scale-in-center">
                <div className="bg-slate-800 p-8 text-white flex justify-between items-center">
                   <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                      <UserPlus size={24} /> {editingContact ? 'Editar Contacto' : 'Nuevo Contacto Corporativo'}
                   </h2>
                   <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-10 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre Completo</label>
                         <input required type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-black uppercase outline-none focus:border-indigo-600" 
                           value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))}/>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Correo Electrónico</label>
                         <input required type="email" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-black outline-none focus:border-indigo-600"
                           value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))}/>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Entidad / Empresa</label>
                         <input required type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-black uppercase outline-none focus:border-indigo-600"
                           value={formData.entity} onChange={e => setFormData(p => ({...p, entity: e.target.value}))}/>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cargo / Posición</label>
                         <input required type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-black uppercase outline-none focus:border-indigo-600"
                           value={formData.position} onChange={e => setFormData(p => ({...p, position: e.target.value}))}/>
                      </div>
                   </div>
                   <button type="submit" className="w-full py-5 bg-slate-800 text-white rounded-[28px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-900 transition-all shadow-xl">
                      <Save size={20} /> {editingContact ? 'Guardar Cambios' : 'Registrar en Agenda'}
                   </button>
                </form>
             </div>
          </div>
        )}

      </div>
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ContactDirectory;
