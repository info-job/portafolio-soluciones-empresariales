
import React, { useState } from 'react';
import { 
  Terminal, Database, ShieldAlert, CheckCircle2, 
  Trash2, Search, Code, Eye, AlertTriangle,
  Zap, RefreshCw, Filter
} from 'lucide-react';
import { 
  Supplier, WorkOrder, Transaction, AuditEntry, 
  Property, Contract, OfficialDocument, ITTicket,
  DueDiligenceReport, LeaseContract,  MaintenanceExpediente
} from '../types';
import { storage } from '../lib/storageEngine';

interface DeveloperConsoleProps {
  data: {
    suppliers: Supplier[];
    workOrders: WorkOrder[];
    transactions: Transaction[];
    properties: Property[];
    contracts: Contract[];
    officialDocs: OfficialDocument[];
    tickets: ITTicket[];
    dueDiligenceReports: DueDiligenceReport[];
    leaseContracts: LeaseContract[];
    maintenanceExpedientes: MaintenanceExpediente[];
  };
  companyLogo: string | null;
  onUpdateLogo: (logo: string | null) => void;
  onUpdate: (collection: string, item: any) => void;
  onDelete: (collection: string, id: string) => void;
  addAuditEntry: (action: string, module: string, targetId: string, targetName?: string, details?: any) => void;
  currentUser: string;
}

const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({ 
  data, companyLogo, onUpdateLogo, onUpdate, onDelete, addAuditEntry, currentUser 
}) => {
  const [selectedCollection, setSelectedCollection] = useState<string>('suppliers');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isJsonView, setIsJsonView] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const collections = [
    { id: 'suppliers', label: 'Proveedores', items: data.suppliers },
    { id: 'workOrders', label: 'Órdenes de Trabajo', items: data.workOrders },
    { id: 'transactions', label: 'Transacciones', items: data.transactions },
    { id: 'properties', label: 'Propiedades', items: data.properties },
    { id: 'contracts', label: 'Contratos', items: data.contracts },
    { id: 'officialDocs', label: 'Oficios', items: data.officialDocs },
    { id: 'tickets', label: 'Tickets HelpDesk', items: data.tickets },
    { id: 'dueDiligenceReports', label: 'Debida Diligencia', items: data.dueDiligenceReports },
    { id: 'leaseContracts', label: 'Contratos Arriendo', items: data.leaseContracts },
    { id: 'maintenanceExpedientes', label: 'Mantenciones', items: data.maintenanceExpedientes },
    { id: 'SYSTEM_SETTINGS', label: 'Configuración Sistema', items: [] },
  ];

  const currentItems = collections.find(c => c.id === selectedCollection)?.items || [];
  
  const filteredItems = currentItems.filter(item => {
    const searchStr = JSON.stringify(item).toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
  });

  const handleForceApprove = (item: any) => {
    if (!confirm('¿FORZAR APROBACIÓN? Esta acción saltará todas las validaciones normales.')) return;

    let updatedItem = { ...item };
    let collectionName = '';

    if (selectedCollection === 'suppliers') {
      updatedItem.status = 'ACTIVE';
      collectionName = 'suppliers';
    } else if (selectedCollection === 'workOrders') {
      updatedItem.status = 'APROBADA';
      collectionName = 'work_orders';
    }

    if (collectionName) {
      onUpdate(collectionName, updatedItem);
      addAuditEntry('FORCE_APPROVE', 'DEVELOPER', item.id, item.name || item.title || item.folio, { 
        reason: 'FORZADO POR DESARROLLADOR',
        user: currentUser 
      });
      setSelectedItem(updatedItem);
    }
  };

  const handleForceDelete = (id: string, name?: string) => {
    if (!confirm('¿ELIMINACIÓN FORZADA? Esta acción es irreversible y se saltará restricciones de integridad.')) return;

    const collectionMap: Record<string, string> = {
      suppliers: 'suppliers',
      workOrders: 'work_orders',
      transactions: 'transactions',
      properties: 'properties',
      contracts: 'contracts',
      officialDocs: 'official_docs',
      tickets: 'tickets',
      dueDiligenceReports: 'due_diligence',
      leaseContracts: 'lease_contracts',
      maintenanceExpedientes: 'maintenance_expedientes'
    };

    onDelete(collectionMap[selectedCollection], id);
    addAuditEntry('FORCE_DELETE', 'DEVELOPER', id, name, { 
      reason: 'ELIMINACIÓN FORZADA POR DESARROLLADOR',
      user: currentUser 
    });
    setSelectedItem(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      onUpdateLogo(base64String);
      
      // Persist to storage
      await storage.save('settings_logo', base64String);
      
      // Persist to Firestore via onUpdate (generic handler)
      onUpdate('settings', { id: 'global_config', logo: base64String });
      
      addAuditEntry('UPDATE_LOGO', 'SYSTEM', 'LOGO', 'Logo Corporativo', { user: currentUser });
      setIsUploading(false);
      alert('Logo actualizado correctamente');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    if (!confirm('¿Eliminar logo corporativo?')) return;
    onUpdateLogo(null);
    await storage.save('settings_logo', null);
    onUpdate('settings', { id: 'global_config', logo: null });
    addAuditEntry('DELETE_LOGO', 'SYSTEM', 'LOGO', 'Logo Corporativo', { user: currentUser });
    alert('Logo eliminado');
  };

  return (
    <div className="flex h-full bg-slate-100 text-slate-800 font-mono overflow-hidden">
      {/* Sidebar de Colecciones */}
      <div className="w-64 border-r border-slate-300 flex flex-col bg-white">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3 text-indigo-700 mb-2">
            <Terminal size={20} />
            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Dev Console</h2>
          </div>
          <p className="text-[10px] text-slate-600 font-bold uppercase">Database Explorer</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {collections.map(col => (
            <button
              key={col.id}
              onClick={() => {
                setSelectedCollection(col.id);
                setSelectedItem(null);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                selectedCollection === col.id 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 font-black' 
                  : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>{col.label}</span>
                <span className="text-[9px] opacity-75 font-mono">[{col.items.length}]</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Items */}
      <div className="w-96 border-r border-slate-300 flex flex-col bg-slate-50">
        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="QUERY DATABASE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-[11px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition-all font-bold shadow-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedItem?.id === item.id
                  ? 'bg-white border-2 border-indigo-600 shadow-md ring-2 ring-indigo-100'
                  : 'bg-white border-slate-200 hover:border-slate-400 shadow-xs'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-indigo-900 uppercase truncate max-w-[150px]">
                  {item.name || item.title || item.folio || item.id.split('-')[0]}
                </span>
                <span className="text-[8px] text-slate-500 font-mono font-bold">{item.id.split('-')[0]}</span>
              </div>
              <p className="text-[9px] text-slate-600 line-clamp-1 font-mono">
                {JSON.stringify(item)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Detalle y Acciones */}
      <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
        {selectedCollection === 'SYSTEM_SETTINGS' ? (
          <div className="flex-1 overflow-y-auto p-12">
            <div className="max-w-2xl mx-auto space-y-12">
              <div className="flex items-center gap-4 text-indigo-700 mb-8">
                <Code size={32} />
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">System Configuration</h2>
              </div>

              {/* Logo Management Section */}
              <div className="bg-white border border-slate-300 rounded-[40px] p-10 space-y-8 shadow-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Logo Corporativo</h3>
                    <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Personalización de Marca</p>
                  </div>
                  <div className="bg-indigo-50 text-indigo-700 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-200">
                    UI Asset
                  </div>
                </div>

                <div className="flex items-center gap-10">
                  <div className="w-40 h-40 bg-slate-50 border-2 border-dashed border-slate-300 rounded-[32px] flex items-center justify-center overflow-hidden relative group">
                    {companyLogo ? (
                      <>
                        <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-4" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <button 
                            onClick={handleRemoveLogo}
                            className="p-3 bg-rose-600 text-white rounded-2xl hover:scale-110 transition-all shadow-md"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center gap-2">
                        <Eye size={32} />
                        <span className="text-[8px] font-black uppercase text-slate-600">No Logo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-6">
                    <p className="text-[11px] text-slate-600 leading-relaxed font-bold uppercase tracking-wide">
                      Cargue una imagen (PNG, JPG o SVG) para usar como logo corporativo en el encabezado y reportes del sistema.
                    </p>
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        disabled={isUploading}
                      />
                      <button className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        isUploading ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
                      }`}>
                        {isUploading ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
                        {isUploading ? 'Subiendo...' : 'Cargar Nuevo Logo'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Settings Placeholder */}
              <div className="bg-white border-2 border-slate-300 border-dashed rounded-[40px] p-10 flex flex-col items-center justify-center text-slate-600 shadow-xs">
                <AlertTriangle size={32} className="mb-4 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Más configuraciones próximamente</p>
              </div>
            </div>
          </div>
        ) : selectedItem ? (
          <>
            <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-white shadow-xs">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
                  {selectedItem.name || selectedItem.title || selectedItem.folio || 'Elemento Detalle'}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono font-bold mt-1 uppercase tracking-widest">ID: {selectedItem.id}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsJsonView(!isJsonView)}
                  className={`p-3 rounded-xl transition-all border ${isJsonView ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}`}
                  title="Toggle JSON View"
                >
                  <Code size={18} />
                </button>
                
                {(selectedCollection === 'suppliers' || selectedCollection === 'workOrders') && selectedItem.status !== 'ACTIVE' && selectedItem.status !== 'APROBADA' && (
                  <button
                    onClick={() => handleForceApprove(selectedItem)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-100"
                  >
                    <Zap size={16} />
                    Force Approve
                  </button>
                )}

                <button
                  onClick={() => handleForceDelete(selectedItem.id, selectedItem.name || selectedItem.title)}
                  className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md shadow-rose-100"
                >
                  <Trash2 size={16} />
                  Force Delete
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {isJsonView ? (
                <div className="bg-white rounded-3xl p-8 border border-slate-300 shadow-xs overflow-x-auto">
                  <pre className="text-[12px] text-slate-900 leading-relaxed font-mono font-semibold">
                    {JSON.stringify(selectedItem, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {Object.entries(selectedItem).map(([key, value]) => (
                    <div key={key} className="bg-white p-6 rounded-2xl border border-slate-300 shadow-xs">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 font-mono">{key}</p>
                      <p className="text-xs text-slate-900 font-bold break-all font-mono">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-12 text-center">
            <div className="w-24 h-24 bg-white rounded-[40px] flex items-center justify-center mb-8 border border-slate-300 shadow-xs">
              <Database size={48} className="text-slate-700" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">No Item Selected</h3>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] mt-4 max-w-xs text-slate-600">
              Select an entry from the database to perform developer operations or view raw data.
            </p>
          </div>
        )}

        {/* Footer Info */}
        <div className="p-4 bg-white border-t border-slate-300 flex justify-between items-center px-8 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-bold text-slate-600 uppercase">Live DB Connection</span>
            </div>
            <div className="h-4 w-px bg-slate-300"></div>
            <span className="text-[9px] font-bold text-slate-600 uppercase">User: {currentUser}</span>
          </div>
          <div className="flex items-center gap-2 text-rose-700 font-bold">
            <ShieldAlert size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Admin Privileges Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperConsole;
