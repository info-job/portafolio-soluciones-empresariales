import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, Square, Search, Shield, Check, X, RotateCcw, 
  Layers, ChevronDown, ChevronRight, Info, AlertCircle 
} from 'lucide-react';
import { ModuleType, UserRole } from '../types';
import { 
  SYSTEM_MODULE_GROUPS, 
  ALL_MODULE_IDS, 
  getDefaultModulesForRole,
  ALL_SYSTEM_MODULES
} from '../lib/modulePermissions';

interface ModulePermissionsSelectorProps {
  selectedModules: ModuleType[];
  onChange: (modules: ModuleType[]) => void;
  userRole?: UserRole;
  userName?: string;
  readOnly?: boolean;
}

export const ModulePermissionsSelector: React.FC<ModulePermissionsSelectorProps> = ({
  selectedModules,
  onChange,
  userRole = 'EJECUTIVO',
  userName,
  readOnly = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleToggleModule = (moduleId: ModuleType) => {
    if (readOnly) return;
    if (selectedModules.includes(moduleId)) {
      onChange(selectedModules.filter(id => id !== moduleId));
    } else {
      onChange([...selectedModules, moduleId]);
    }
  };

  const handleSelectAll = () => {
    if (readOnly) return;
    onChange([...ALL_MODULE_IDS]);
  };

  const handleDeselectAll = () => {
    if (readOnly) return;
    // Always keep at least BUSQUEDA_EMPLEO or empty
    onChange([]);
  };

  const handleResetToRoleDefault = () => {
    if (readOnly) return;
    const defaults = getDefaultModulesForRole(userRole);
    onChange(defaults);
  };

  const handleToggleCategory = (categoryModuleIds: ModuleType[]) => {
    if (readOnly) return;
    const allSelected = categoryModuleIds.every(id => selectedModules.includes(id));
    if (allSelected) {
      // Remove this category's modules
      onChange(selectedModules.filter(id => !categoryModuleIds.includes(id)));
    } else {
      // Add missing modules
      const toAdd = categoryModuleIds.filter(id => !selectedModules.includes(id));
      onChange([...selectedModules, ...toAdd]);
    }
  };

  // Filter groups based on search & category filter
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return SYSTEM_MODULE_GROUPS.map(group => {
      if (activeCategoryFilter !== 'ALL' && group.id !== activeCategoryFilter) {
        return null;
      }

      const matchingModules = group.modules.filter(mod => {
        if (!q) return true;
        return (
          mod.label.toLowerCase().includes(q) ||
          mod.code.toLowerCase().includes(q) ||
          mod.id.toLowerCase().includes(q) ||
          mod.description.toLowerCase().includes(q)
        );
      });

      if (matchingModules.length === 0) return null;

      return {
        ...group,
        modules: matchingModules
      };
    }).filter(Boolean) as typeof SYSTEM_MODULE_GROUPS;
  }, [searchQuery, activeCategoryFilter]);

  const totalCount = ALL_MODULE_IDS.length;
  const selectedCount = selectedModules.length;
  const isFullAccess = selectedCount === totalCount;
  const isMinimal = selectedCount <= 2;

  return (
    <div className="space-y-4">
      {/* HEADER BAR CON CONTROLES RÁPIDOS */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Shield size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Matriz de Permisos por Módulo
                </h5>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  isFullAccess 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : isMinimal 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                }`}>
                  {selectedCount} de {totalCount} Habilitados
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 font-medium">
                {userName ? `Control granular de accesos para ${userName}` : 'Marque o desmarque las casillas de los módulos que este usuario podrá visualizar y operar.'}
              </p>
            </div>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                title="Habilitar todos los módulos del ERP"
              >
                <Check size={12} className="text-emerald-600" />
                Marcar Todos
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                title="Desmarcar todos los módulos"
              >
                <X size={12} className="text-rose-600" />
                Desmarcar Todos
              </button>
              <button
                type="button"
                onClick={handleResetToRoleDefault}
                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                title={`Restablecer a la plantilla recomendada para rol ${userRole}`}
              >
                <RotateCcw size={12} />
                Sugerencia ({userRole})
              </button>
            </div>
          )}
        </div>

        {/* BUSCADOR Y FILTROS POR CATEGORÍA */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-200">
          <div className="relative w-full sm:flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código AssetFlow Enterprise (ej: P0411, Arriendos, F29)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                activeCategoryFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({totalCount})
            </button>
            {SYSTEM_MODULE_GROUPS.map(group => {
              const groupSelected = group.modules.filter(m => selectedModules.includes(m.id)).length;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(group.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                    activeCategoryFilter === group.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{group.label.split('&')[0].trim()}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded-full ${
                    activeCategoryFilter === group.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {groupSelected}/{group.modules.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* AVISO DE AISLAMIENTO PARA ROL SOLO_EMPLEO */}
      {userRole === 'SOLO_EMPLEO' && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex items-start gap-2.5 text-amber-900 text-xs">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black uppercase tracking-tight">Atención: Rol de Empleo Restringido</p>
            <p className="text-[11px] font-medium text-amber-800 leading-snug">
              Este usuario tiene asignado el rol <strong>SOLO_EMPLEO</strong>. Por directriz de seguridad estricta, solo tendrá acceso al módulo de Búsqueda de Empleo Chile (P09OWJOB) para proteger los datos financieros de la compañía.
            </p>
          </div>
        </div>
      )}

      {/* LISTA DE GRUPOS Y CASILLAS MARCABLES */}
      <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
        {filteredGroups.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
            <Search size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider">No se encontraron módulos con el criterio ingresado</p>
            <p className="text-[11px] text-slate-400 mt-1">Intente con otro término de búsqueda o limpie los filtros.</p>
          </div>
        ) : (
          filteredGroups.map(group => {
            const groupModuleIds = group.modules.map(m => m.id);
            const groupSelectedCount = group.modules.filter(m => selectedModules.includes(m.id)).length;
            const isGroupAllSelected = groupSelectedCount === group.modules.length;
            const isGroupPartiallySelected = groupSelectedCount > 0 && !isGroupAllSelected;
            const isCollapsed = collapsedCategories[group.id];

            return (
              <div 
                key={group.id} 
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
              >
                {/* CATEGORY ACCORDION HEADER */}
                <div className="bg-slate-50/80 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleCategoryCollapse(group.id)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                          {group.label}
                        </span>
                        <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                          isGroupAllSelected
                            ? 'bg-emerald-100 text-emerald-800'
                            : isGroupPartiallySelected
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {groupSelectedCount} de {group.modules.length} autorizados
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                        {group.description}
                      </p>
                    </div>
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleToggleCategory(groupModuleIds)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[9.5px] font-black uppercase tracking-wider text-slate-700 transition-colors cursor-pointer"
                    >
                      {isGroupAllSelected ? 'Desmarcar Grupo' : 'Marcar Grupo'}
                    </button>
                  )}
                </div>

                {/* MODULE CHECKBOXES GRID */}
                {!isCollapsed && (
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {group.modules.map(mod => {
                      const isChecked = selectedModules.includes(mod.id);

                      return (
                        <div
                          key={mod.id}
                          onClick={() => handleToggleModule(mod.id)}
                          className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all ${
                            readOnly ? 'cursor-default' : 'cursor-pointer select-none'
                          } ${
                            isChecked
                              ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isChecked ? (
                              <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                <Check size={14} strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`text-xs font-bold leading-tight truncate ${
                                isChecked ? 'text-indigo-950 font-black' : 'text-slate-700'
                              }`}>
                                {mod.label}
                              </span>
                              <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded tracking-tighter shrink-0 ${
                                isChecked 
                                  ? 'bg-indigo-200/80 text-indigo-900 border border-indigo-300' 
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {mod.code}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5 line-clamp-2">
                              {mod.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ModulePermissionsSelector;
