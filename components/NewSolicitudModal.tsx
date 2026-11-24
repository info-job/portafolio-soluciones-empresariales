import React, { useState, useMemo } from 'react';
import { ClipboardList, X, CheckCircle2, MapPin, Building2, Home, AlertCircle, Key, RefreshCw, Check } from 'lucide-react';
import { Property, Solicitud, LeaseContract } from '../types';

export interface PropertyTenancyInfo {
  status: 'ARRENDADA' | 'PROXIMA_A_VACANTE' | 'VACANTE';
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  tag: string;
  tenantName?: string;
  endDate?: string;
  daysRemaining?: number;
}

export function getPropertyTenancy(
  property: Property,
  leaseContracts?: LeaseContract[]
): PropertyTenancyInfo {
  if (!property) {
    return {
      status: 'VACANTE',
      badgeLabel: 'VACANTE / DISPONIBLE',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-700',
      badgeBorder: 'border-slate-200',
      tag: '⚪ VACANTE'
    };
  }

  // 1. Check contracts linked to this property
  const contracts = (leaseContracts || []).filter(c => c.propertyId === property.id);
  const activeContract = contracts.find(c => c.status === 'VIGENTE' || c.status === 'POR_VENCER');

  if (activeContract) {
    let isExpiringSoon = activeContract.status === 'POR_VENCER';
    let daysDiff: number | undefined = undefined;

    if (activeContract.endDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const end = new Date(activeContract.endDate + 'T00:00:00');
      daysDiff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // If contract ends within 60 days, treat as "PRÓXIMA A QUEDAR VACANTE"
      if (daysDiff <= 60 && daysDiff >= 0) {
        isExpiringSoon = true;
      }
    }

    if (isExpiringSoon) {
      const daysText = daysDiff !== undefined 
        ? (daysDiff === 0 ? 'hoy' : daysDiff < 0 ? 'vencido' : `en ${daysDiff} días`)
        : '';
      return {
        status: 'PROXIMA_A_VACANTE',
        badgeLabel: 'PRÓXIMA A QUEDAR VACANTE',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-800',
        badgeBorder: 'border-amber-300',
        tag: `🟡 PRÓX. A QUEDAR VACANTE${daysText ? ` (${daysText})` : ''}`,
        tenantName: activeContract.tenantName,
        endDate: activeContract.endDate,
        daysRemaining: daysDiff
      };
    }

    return {
      status: 'ARRENDADA',
      badgeLabel: 'ARRENDADA (CONTRATO VIGENTE)',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-300',
      tag: `🟢 ARRENDADA${activeContract.tenantName ? ` - ${activeContract.tenantName}` : ''}`,
      tenantName: activeContract.tenantName,
      endDate: activeContract.endDate,
      daysRemaining: daysDiff
    };
  }

  // 2. Check property status attribute if no contract in array
  const propStatusNorm = (property.status || '').toUpperCase();
  if (propStatusNorm.includes('POR_DESOCUPAR') || propStatusNorm.includes('PROXIMA') || propStatusNorm.includes('POR VENCER') || propStatusNorm.includes('VACANCIA')) {
    return {
      status: 'PROXIMA_A_VACANTE',
      badgeLabel: 'PRÓXIMA A QUEDAR VACANTE',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-300',
      tag: '🟡 PRÓX. A QUEDAR VACANTE',
      tenantName: property.owner || undefined
    };
  }

  if (propStatusNorm.includes('ARRENDADA') || propStatusNorm.includes('OCUPADA') || (property.rentalAmount && property.rentalAmount > 0 && property.useType === 'ARRIENDO')) {
    return {
      status: 'ARRENDADA',
      badgeLabel: 'ARRENDADA',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-300',
      tag: '🟢 ARRENDADA',
      tenantName: property.owner || undefined
    };
  }

  // Default: Vacante / Disponible
  return {
    status: 'VACANTE',
    badgeLabel: 'VACANTE / DISPONIBLE',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    tag: '⚪ VACANTE / DISPONIBLE'
  };
}

interface NewSolicitudModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  leaseContracts?: LeaseContract[];
  uniqueCommunes: string[];
  uniqueConjuntos: string[];
  currentUser: string;
  onSave: (solicitud: Solicitud) => void;
  onAddProperty: (property: Property) => void;
  onSelectCreatedSolicitud?: (solicitud: Solicitud) => void;
}

const COMMON_COMMUNES = [
  'SANTIAGO', 'PROVIDENCIA', 'LAS CONDES', 'VITACURA', 'LO BARNECHEA',
  'MAIPÚ', 'ÑUÑOA', 'LA REINA', 'PEÑALOLÉN', 'LA FLORIDA', 'SAN MIGUEL',
  'ESTACIÓN CENTRAL', 'PUENTE ALTO', 'COLINA', 'CONCHALÍ', 'RECOLETA',
  'SANTIAGO CENTRO', 'QUILICURA', 'CHIGUAYANTE', 'VALPARAÍSO', 'VIÑA DEL MAR'
];

export const NewSolicitudModal: React.FC<NewSolicitudModalProps> = React.memo(({
  isOpen,
  onClose,
  properties,
  leaseContracts,
  uniqueCommunes,
  uniqueConjuntos,
  currentUser,
  onSave,
  onAddProperty,
  onSelectCreatedSolicitud
}) => {
  if (!isOpen) return null;

  // Wizard Step
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardTitle, setWizardTitle] = useState('');
  const [wizardCategory, setWizardCategory] = useState<'REQUERIMIENTO' | 'MEJORA' | 'CONSULTA' | 'DOCUMENTACIÓN' | 'SERVICIOS' | 'REEMBOLSO'>('REQUERIMIENTO');
  const [wizardPriority, setWizardPriority] = useState<'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA'>('BAJA');
  const [wizardPropertyId, setWizardPropertyId] = useState('');
  const [wizardAssignedTo, setWizardAssignedTo] = useState('');
  const [wizardApplicantName, setWizardApplicantName] = useState('');
  const [wizardApplicantEmail, setWizardApplicantEmail] = useState('');
  const [wizardDescription, setWizardDescription] = useState('');

  // Dependent dropdowns for Step 2
  const [selectedCommune, setSelectedCommune] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');

  // Property Mode
  const [propertyMode, setPropertyMode] = useState<'SELECT' | 'NEW'>('SELECT');
  const [newPropRegion, setNewPropRegion] = useState('');
  const [newPropCommune, setNewPropCommune] = useState('');
  const [newPropConjunto, setNewPropConjunto] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [newPropType, setNewPropType] = useState<'DEPARTAMENTO' | 'CASA' | 'BODEGA' | 'ESTACIONAMIENTO' | 'LOCAL' | 'OFICINA'>('DEPARTAMENTO');

  // Property search filter inside dropdown
  const [propertySearchFilter, setPropertySearchFilter] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Precomputed list of communes
  const allCommunesList = useMemo(() => {
    return Array.from(new Set([...COMMON_COMMUNES, ...uniqueCommunes])).sort();
  }, [uniqueCommunes]);

  // Dependent Dropdown 1: Available Communes
  const communeOptions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of properties) {
      const c = (p.commune || 'SANTIAGO').toUpperCase().trim();
      map[c] = (map[c] || 0) + 1;
    }
    return Object.keys(map).sort().map(name => ({
      name,
      count: map[name]
    }));
  }, [properties]);

  // Dependent Dropdown 2: Available Buildings in Selected Commune
  const buildingOptions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of properties) {
      if (selectedCommune) {
        const c = (p.commune || 'SANTIAGO').toUpperCase().trim();
        if (c !== selectedCommune) continue;
      }
      const b = (p.building || p.conjunto || 'GENERAL').toUpperCase().trim();
      map[b] = (map[b] || 0) + 1;
    }
    return Object.keys(map).sort().map(name => ({
      name,
      count: map[name]
    }));
  }, [properties, selectedCommune]);

  // Dependent Dropdown 3: Exact Address / Unit Options
  // Priorizar viviendas habitadas/ocupadas en primeros lugares, luego próximas a vacante y al final vacantes
  const exactAddressOptions = useMemo(() => {
    let list = properties;
    if (selectedCommune) {
      list = list.filter(p => (p.commune || 'SANTIAGO').toUpperCase().trim() === selectedCommune);
    }
    if (selectedBuilding) {
      list = list.filter(p => (p.building || p.conjunto || 'GENERAL').toUpperCase().trim() === selectedBuilding);
    }
    if (propertySearchFilter.trim()) {
      const search = propertySearchFilter.toUpperCase().trim();
      list = list.filter(p => 
        (p.address && p.address.toUpperCase().includes(search)) ||
        (p.building && p.building.toUpperCase().includes(search)) ||
        (p.code && p.code.toUpperCase().includes(search)) ||
        (p.propertyRole && p.propertyRole.toUpperCase().includes(search))
      );
    }

    const tenancyRank = (status: 'ARRENDADA' | 'PROXIMA_A_VACANTE' | 'VACANTE'): number => {
      switch (status) {
        case 'ARRENDADA': return 1;
        case 'PROXIMA_A_VACANTE': return 2;
        case 'VACANTE': return 3;
        default: return 4;
      }
    };

    return [...list].sort((a, b) => {
      const tenA = getPropertyTenancy(a, leaseContracts);
      const tenB = getPropertyTenancy(b, leaseContracts);
      const rankA = tenancyRank(tenA.status);
      const rankB = tenancyRank(tenB.status);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return (a.address || '').localeCompare(b.address || '', undefined, { numeric: true });
    });
  }, [properties, selectedCommune, selectedBuilding, propertySearchFilter, leaseContracts]);

  // Grouped options for structured dropdown rendering
  const groupedAddressOptions = useMemo(() => {
    const occupied: Property[] = [];
    const nearVacant: Property[] = [];
    const vacant: Property[] = [];

    for (const p of exactAddressOptions) {
      const t = getPropertyTenancy(p, leaseContracts);
      if (t.status === 'ARRENDADA') {
        occupied.push(p);
      } else if (t.status === 'PROXIMA_A_VACANTE') {
        nearVacant.push(p);
      } else {
        vacant.push(p);
      }
    }

    return { occupied, nearVacant, vacant };
  }, [exactAddressOptions, leaseContracts]);

  // Handler for Commune change
  const handleCommuneChange = (commune: string) => {
    setSelectedCommune(commune);
    if (commune) {
      const validBuildings = properties
        .filter(p => (p.commune || 'SANTIAGO').toUpperCase().trim() === commune)
        .map(p => (p.building || p.conjunto || 'GENERAL').toUpperCase().trim());
      if (selectedBuilding && !validBuildings.includes(selectedBuilding)) {
        setSelectedBuilding('');
        setWizardPropertyId('');
      }
    } else {
      setSelectedBuilding('');
      setWizardPropertyId('');
    }
  };

  // Handler for Building change
  const handleBuildingChange = (building: string) => {
    setSelectedBuilding(building);
    if (building && wizardPropertyId) {
      const currentProp = properties.find(p => p.id === wizardPropertyId);
      if (currentProp) {
        const bld = (currentProp.building || currentProp.conjunto || 'GENERAL').toUpperCase().trim();
        if (bld !== building) {
          setWizardPropertyId('');
        }
      }
    }
  };

  // Handler for selecting an exact property
  const handleSelectProperty = (propId: string) => {
    setWizardPropertyId(propId);
    const found = properties.find(p => p.id === propId);
    if (found) {
      const comm = (found.commune || 'SANTIAGO').toUpperCase().trim();
      const bld = (found.building || found.conjunto || 'GENERAL').toUpperCase().trim();
      if (!selectedCommune) setSelectedCommune(comm);
      if (!selectedBuilding) setSelectedBuilding(bld);
    }
  };

  // Reset dropdown filters
  const handleResetFilters = () => {
    setSelectedCommune('');
    setSelectedBuilding('');
    setPropertySearchFilter('');
  };

  const wizardValidation = (step: number): boolean => {
    if (step >= 1) {
      if (!wizardTitle.trim()) return false;
    }
    if (step >= 2) {
      if (propertyMode === 'SELECT') {
        if (!wizardPropertyId) return false;
      } else {
        if (!newPropRegion.trim() || !newPropCommune.trim() || !newPropConjunto.trim() || !newPropAddress.trim()) {
          return false;
        }
      }
    }
    if (step >= 4) {
      if (!wizardDescription.trim()) return false;
    }
    return true;
  };

  const handleConfirmAndSave = () => {
    setFormError(null);
    if (!wizardValidation(4)) {
      setFormError('Debe rellenar todos los campos obligatorios antes de grabar el registro.');
      return;
    }
    
    let finalPropertyId = '';
    let finalPropertyLabel = '';

    if (propertyMode === 'SELECT') {
      finalPropertyId = wizardPropertyId;
      const property = properties.find(p => p.id === finalPropertyId);
      finalPropertyLabel = property ? `${property.building} - ${property.code}` : 'GENERAL / SIN ESPECIFICAR';
    } else {
      if (!newPropAddress.trim() || !newPropCommune.trim() || !newPropConjunto.trim()) {
        setFormError('Por favor, rellene todos los parámetros de la nueva propiedad (Dirección, Comuna, Conjunto).');
        return;
      }
      const newPropId = crypto.randomUUID();
      const codeText = `NEW-${Math.floor(1000 + Math.random() * 9000)}`;
      const newPropObj: Property = {
        id: newPropId,
        code: codeText,
        building: newPropConjunto.toUpperCase().trim(),
        floor: '1',
        address: newPropAddress.toUpperCase().trim(),
        commune: newPropCommune.toUpperCase().trim(),
        region: (newPropRegion || 'METROPOLITANA').toUpperCase().trim(),
        conjunto: newPropConjunto.toUpperCase().trim(),
        type: newPropType
      };

      onAddProperty(newPropObj);
      finalPropertyId = newPropId;
      finalPropertyLabel = `${newPropObj.building} (${newPropObj.commune}, ${newPropObj.region})`;
    }

    const newSol: Solicitud = {
      id: crypto.randomUUID(),
      propertyId: finalPropertyId,
      propertyLabel: finalPropertyLabel,
      title: wizardTitle.toUpperCase().trim(),
      description: wizardDescription,
      status: 'PENDIENTE',
      priority: wizardPriority,
      category: wizardCategory,
      requestDate: new Date().toISOString().split('T')[0],
      updates: [],
      subtasks: [],
      userCreator: currentUser,
      timestamp: Date.now(),
      assignedTo: wizardAssignedTo.trim() || undefined,
      applicantName: wizardApplicantName.toUpperCase().trim() || undefined,
      applicantEmail: wizardApplicantEmail.toLowerCase().trim() || undefined,
      lastModifiedAt: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0].substring(0, 5),
      lastModifiedBy: currentUser,
      statusHistory: [{
        status: 'PENDIENTE',
        date: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0].substring(0, 5),
        user: currentUser,
        timestamp: Date.now()
      }]
    };

    onSave(newSol);
    if (onSelectCreatedSolicitud) {
      onSelectCreatedSolicitud(newSol);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-150">
      <div 
        className="bg-white rounded-[36px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-rose-600 p-3 rounded-2xl text-white shadow-md shadow-rose-200">
              <ClipboardList size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Asistente de Solicitudes</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Estilo original ERP: Registro paso a paso - FASE {wizardStep} de 5
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="px-6 md:px-8 pt-5 pb-3 border-b border-slate-100 bg-slate-50/30 select-none shrink-0">
          <div className="relative flex items-center justify-between w-full">
            {/* Progress Bar Track */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-150 -translate-y-1/2 z-0" />
            <div 
              className="absolute left-0 top-1/2 h-0.5 bg-rose-600 -translate-y-1/2 z-0 transition-all duration-200"
              style={{ width: `${((wizardStep - 1) / 4) * 100}%` }}
            />

            {/* Nodes */}
            {[
              { step: 1, label: 'Id. Caso' },
              { step: 2, label: 'Ubicación' },
              { step: 3, label: 'Contacto' },
              { step: 4, label: 'Exposición' },
              { step: 5, label: 'Grabar' }
            ].map((s) => {
              const isPast = s.step < wizardStep;
              const isActive = s.step === wizardStep;
              return (
                <div key={s.step} className="flex flex-col items-center z-10 relative">
                  <button
                    type="button"
                    onClick={() => {
                      let canGo = true;
                      for (let i = 1; i < s.step; i++) {
                        if (!wizardValidation(i)) {
                          canGo = false;
                          break;
                        }
                      }
                      if (canGo) setWizardStep(s.step);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                      isPast 
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-100 cursor-pointer' 
                        : isActive 
                        ? 'bg-white border-2 border-rose-600 text-rose-600 ring-4 ring-rose-100 font-extrabold outline-none' 
                        : 'bg-white border border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    disabled={s.step > wizardStep}
                  >
                    {isPast ? "✓" : s.step}
                  </button>
                  <div className="mt-1.5 text-center">
                    <span className={`text-[8.5px] font-black uppercase tracking-wider block font-sans ${isActive ? 'text-rose-600' : isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 font-sans text-slate-800 space-y-6">
          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs font-bold animate-in fade-in">
              <span className="text-rose-600 font-extrabold text-sm">⚠</span>
              <span>{formError}</span>
            </div>
          )}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest ml-1 font-bold">Título de la Solicitud / Caso *</label>
                <input 
                  type="text" 
                  value={wizardTitle}
                  onChange={e => setWizardTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 uppercase outline-none focus:bg-white focus:border-rose-600 transition-all font-sans"
                  placeholder="INGRESAR UN TÍTULO CLARO O ASUNTO"
                  autoFocus
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1 mt-1 font-sans">Este identificador aparecerá en el encabezado del libro maestro generales.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest ml-1 font-bold font-sans">Categoría de Solicitud</label>
                  <select 
                    value={wizardCategory}
                    onChange={e => setWizardCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-rose-600 transition-all font-sans"
                  >
                    <option value="REQUERIMIENTO">REQUERIMIENTO</option>
                    <option value="MEJORA">MEJORA</option>
                    <option value="CONSULTA">CONSULTA</option>
                    <option value="DOCUMENTACIÓN">DOCUMENTACIÓN</option>
                    <option value="SERVICIOS">SERVICIOS</option>
                    <option value="REEMBOLSO">REEMBOLSO DE REPARACIÓN</option>
                  </select>
                </div>

                <div className="space-y-1 font-sans">
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest ml-1 font-bold font-sans">Prioridad / Urgencia</label>
                  <select 
                    value={wizardPriority}
                    onChange={e => setWizardPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-rose-600 transition-all font-sans"
                  >
                    <option value="BAJA">BAJA</option>
                    <option value="MEDIA">MEDIA</option>
                    <option value="ALTA">ALTA</option>
                    <option value="CRÍTICA">CRÍTICA (URGENCIA)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex border-b border-slate-100 mb-2">
                <button
                  type="button"
                  onClick={() => setPropertyMode('SELECT')}
                  className={`flex-1 pb-2.5 text-xs uppercase font-black tracking-wider transition-all border-b-2 cursor-pointer font-sans ${
                    propertyMode === 'SELECT'
                      ? 'border-rose-600 text-rose-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Seleccionar Propiedad Existente
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyMode('NEW')}
                  className={`flex-1 pb-2.5 text-xs uppercase font-black tracking-wider transition-all border-b-2 cursor-pointer font-sans ${
                    propertyMode === 'NEW'
                      ? 'border-rose-600 text-rose-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Ingresar Propiedad Manualmente
                </button>
              </div>

              {propertyMode === 'SELECT' ? (
                <div className="space-y-4 font-sans">
                  {/* Dependent dropdown info header & quick filter */}
                  <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-wide">
                        Listas Desplegables Dependientes de Ubicación
                      </p>
                      <p className="text-[9px] text-slate-500 font-semibold mt-0.5">
                        Filtro en cascada: 1. Comuna → 2. Edificio / Conjunto → 3. Dirección Exacta (con estado de arriendo / vacancia)
                      </p>
                    </div>
                    {(selectedCommune || selectedBuilding || propertySearchFilter) && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer self-start md:self-center"
                      >
                        <RefreshCw size={11} />
                        Limpiar filtros
                      </button>
                    )}
                  </div>

                  {/* Quick Search Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest ml-1 font-bold">
                      Búsqueda Rápida Opcional (Dirección, Rol o Código)
                    </label>
                    <input 
                      type="text" 
                      value={propertySearchFilter}
                      onChange={e => setPropertySearchFilter(e.target.value)}
                      placeholder="Escriba para filtrar por dirección física o rol..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2 text-xs font-bold text-slate-800 uppercase outline-none focus:bg-white focus:border-rose-600 transition-all font-sans"
                    />
                  </div>

                  {/* Grid with 2 parent dependent dropdowns: Comuna and Edificio */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* 1. Comuna ERP */}
                    <div className="space-y-1 font-sans">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest font-bold flex items-center gap-1">
                          <MapPin size={12} className="text-rose-600" />
                          1. Comuna *
                        </label>
                        <span className="text-[9px] font-bold text-slate-400">
                          {communeOptions.length} comunas
                        </span>
                      </div>
                      <select 
                        value={selectedCommune}
                        onChange={e => handleCommuneChange(e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-bold text-slate-800 uppercase outline-none focus:border-rose-600 transition-all font-sans"
                      >
                        <option value="">-- TODAS LAS COMUNAS ({communeOptions.length}) --</option>
                        {communeOptions.map(c => (
                          <option key={c.name} value={c.name}>
                            {c.name} ({c.count} unidades)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Edificio / Condominio / Conjunto */}
                    <div className="space-y-1 font-sans">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest font-bold flex items-center gap-1">
                          <Building2 size={12} className="text-rose-600" />
                          2. Edificio / Conjunto *
                        </label>
                        <span className="text-[9px] font-bold text-slate-400">
                          {buildingOptions.length} edificios
                        </span>
                      </div>
                      <select 
                        value={selectedBuilding}
                        onChange={e => handleBuildingChange(e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-bold text-slate-800 uppercase outline-none focus:border-rose-600 transition-all font-sans"
                      >
                        <option value="">
                          {selectedCommune 
                            ? `-- EDIFICIOS EN ${selectedCommune} (${buildingOptions.length}) --` 
                            : `-- TODOS LOS EDIFICIOS (${buildingOptions.length}) --`}
                        </option>
                        {buildingOptions.map(b => (
                          <option key={b.name} value={b.name}>
                            {b.name} ({b.count} unidades)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 3. Dirección Exacta / Unidad Inmobiliaria con Estado de Arriendo / Vacancia */}
                  <div className="space-y-1.5 font-sans pt-1">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest font-bold flex items-center gap-1">
                        <Home size={12} className="text-rose-600" />
                        3. Dirección Exacta / Unidad Inmobiliaria *
                      </label>
                      <span className="text-[9px] font-bold text-slate-500">
                        {exactAddressOptions.length} disponibles
                      </span>
                    </div>

                    <select 
                      value={wizardPropertyId}
                      onChange={e => handleSelectProperty(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 uppercase outline-none focus:bg-white focus:border-rose-600 transition-all font-sans shadow-xs"
                    >
                      <option value="">-- SELECCIONE DIRECCIÓN EXACTA ({exactAddressOptions.length} DISPONIBLES) --</option>
                      
                      {/* 1. Viviendas Ocupadas / Arrendadas en Primer Lugar */}
                      {groupedAddressOptions.occupied.length > 0 && (
                        <optgroup label={`🟢 VIVIENDAS OCUPADAS (CONTRATO VIGENTE) — [${groupedAddressOptions.occupied.length}]`}>
                          {groupedAddressOptions.occupied.map(p => {
                            const tenancy = getPropertyTenancy(p, leaseContracts);
                            return (
                              <option key={p.id} value={p.id}>
                                {p.address} (Depto/Piso: {p.floor || '-'}) (Rol: {p.propertyRole || p.code}) — [{tenancy.tag}]
                              </option>
                            );
                          })}
                        </optgroup>
                      )}

                      {/* 2. Viviendas Próximas a Desocuparse */}
                      {groupedAddressOptions.nearVacant.length > 0 && (
                        <optgroup label={`🟡 PRÓXIMAS A QUEDAR VACANTES (AVISO / POR VENCER) — [${groupedAddressOptions.nearVacant.length}]`}>
                          {groupedAddressOptions.nearVacant.map(p => {
                            const tenancy = getPropertyTenancy(p, leaseContracts);
                            return (
                              <option key={p.id} value={p.id}>
                                {p.address} (Depto/Piso: {p.floor || '-'}) (Rol: {p.propertyRole || p.code}) — [{tenancy.tag}]
                              </option>
                            );
                          })}
                        </optgroup>
                      )}

                      {/* 3. Viviendas Vacantes / Disponibles al final */}
                      {groupedAddressOptions.vacant.length > 0 && (
                        <optgroup label={`⚪ VIVIENDAS VACANTES / DISPONIBLES (PUESTA A PUNTO / PREVENTIVA) — [${groupedAddressOptions.vacant.length}]`}>
                          {groupedAddressOptions.vacant.map(p => {
                            const tenancy = getPropertyTenancy(p, leaseContracts);
                            return (
                              <option key={p.id} value={p.id}>
                                {p.address} (Depto/Piso: {p.floor || '-'}) (Rol: {p.propertyRole || p.code}) — [{tenancy.tag}]
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                    </select>

                    <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider ml-1 mt-1 font-sans">
                      Lista priorizada: Las viviendas habitadas y con inquilinos aparecen en primer orden por mayor probabilidad de servicio.
                    </p>

                    {/* Selected Property Status Card & Tenancy Banner */}
                    {wizardPropertyId && (() => {
                      const propObj = properties.find(p => p.id === wizardPropertyId);
                      if (!propObj) return null;
                      const tenancy = getPropertyTenancy(propObj, leaseContracts);

                      return (
                        <div className="mt-3.5 p-4.5 bg-white border-2 border-slate-200 rounded-2xl space-y-3 font-sans shadow-sm">
                          {/* Top Row: Tenancy Badge & Classification */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10.5px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${tenancy.badgeBg} ${tenancy.badgeText} ${tenancy.badgeBorder} inline-flex items-center gap-1.5 shadow-xs`}>
                                {tenancy.status === 'ARRENDADA' && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />}
                                {tenancy.status === 'PROXIMA_A_VACANTE' && <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />}
                                {tenancy.status === 'VACANTE' && <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />}
                                {tenancy.badgeLabel}
                              </span>
                              {tenancy.daysRemaining !== undefined && tenancy.daysRemaining >= 0 && (
                                <span className="text-[9.5px] font-extrabold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-lg border border-amber-200">
                                  Término en {tenancy.daysRemaining} días
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg">
                              Tipo: {propObj.type || 'DEPARTAMENTO'}
                            </span>
                          </div>

                          {/* Property Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[9px] block">Dirección Exacta</span>
                              <span className="font-black text-slate-900 text-xs block">{propObj.address}</span>
                              <span className="text-slate-500 font-bold text-[10px]">Piso / Unidad: {propObj.floor || 'N/A'} (Rol: {propObj.propertyRole || propObj.code})</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[9px] block">Edificio & Comuna</span>
                              <span className="font-extrabold text-slate-800 text-xs block">{propObj.building || propObj.conjunto}</span>
                              <span className="text-slate-500 font-bold text-[10px]">{propObj.commune} ({propObj.region || 'METROPOLITANA'})</span>
                            </div>
                          </div>

                          {/* Contextual Notice according to tenancy status */}
                          {tenancy.status === 'ARRENDADA' && (
                            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-[10.5px] text-emerald-900 flex items-start gap-2">
                              <Key size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                              <div>
                                <div className="font-black text-emerald-950">Inmueble con Contrato de Arriendo Vigente</div>
                                {tenancy.tenantName && (
                                  <div className="font-semibold text-emerald-800">
                                    Arrendatario Registrado: <span className="font-black">{tenancy.tenantName}</span>
                                    {tenancy.endDate && <span> | Vencimiento: {tenancy.endDate}</span>}
                                  </div>
                                )}
                                <div className="text-[9.5px] text-emerald-700 font-medium mt-0.5">
                                  La mantención solicitada debe coordinarse con el arrendatario para el acceso de proveedores.
                                </div>
                              </div>
                            </div>
                          )}

                          {tenancy.status === 'PROXIMA_A_VACANTE' && (
                            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-[10.5px] text-amber-950 flex items-start gap-2 shadow-xs">
                              <AlertCircle size={15} className="text-amber-700 shrink-0 mt-0.5" />
                              <div>
                                <div className="font-black text-amber-950 uppercase tracking-wide">
                                  Vivienda Próxima a Quedar Vacante
                                </div>
                                <div className="font-bold text-amber-900 mt-0.5">
                                  {tenancy.tenantName ? `Arrendatario saliente: ${tenancy.tenantName} | ` : ''}
                                  Fecha estimada de desocupación: <span className="font-black underline">{tenancy.endDate || 'Próximamente'}</span>
                                  {tenancy.daysRemaining !== undefined && ` (${tenancy.daysRemaining} días restantes)`}
                                </div>
                                <div className="text-[9.5px] text-amber-800 font-medium mt-0.5">
                                  Prioridad Operativa: Esta mantención facilitará el alistamiento, reparación y entrega de llaves para el próximo ciclo de arriendo.
                                </div>
                              </div>
                            </div>
                          )}

                          {tenancy.status === 'VACANTE' && (
                            <div className="p-3 bg-slate-100/80 border border-slate-200 rounded-xl text-[10.5px] text-slate-800 flex items-start gap-2">
                              <Home size={14} className="text-slate-600 shrink-0 mt-0.5" />
                              <div>
                                <div className="font-black text-slate-900">Vivienda Vacante / Desocupada</div>
                                <div className="text-[9.5px] text-slate-600 font-medium mt-0.5">
                                  Propiedad desocupada. Lista para visita técnica o ejecución directa de trabajos de mantenimiento.
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-[28px] grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 font-sans">Parámetros de la Nueva Unidad de Catastro</p>
                  </div>

                  <div className="space-y-1 col-span-1 md:col-span-2 font-sans">
                    <label className="text-[9px] font-black text-slate-555 uppercase tracking-widest ml-1 text-[10px] font-sans">Región *</label>
                    <input 
                      type="text" 
                      value={newPropRegion}
                      onChange={e => setNewPropRegion(e.target.value)}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 uppercase outline-none focus:border-rose-600 font-sans"
                      placeholder="METROPOLITANA / VALPARAÍSO"
                    />
                  </div>

                  <div className="space-y-1 font-sans">
                    <label className="text-[9px] font-black text-slate-555 uppercase tracking-widest ml-1 text-[10px] font-sans font-bold font-sans">Comuna *</label>
                    <select 
                      value={newPropCommune === '' ? '' : (allCommunesList.includes(newPropCommune) ? newPropCommune : 'CUSTOM')}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'CUSTOM') {
                          setNewPropCommune('');
                        } else {
                          setNewPropCommune(val);
                        }
                      }}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-705 uppercase outline-none focus:border-rose-600 font-sans"
                    >
                      <option value="">-- SELECCIONE COMUNA --</option>
                      {allCommunesList.map(comm => (
                        <option key={comm} value={comm}>{comm}</option>
                      ))}
                      <option value="CUSTOM">-- OTRA (ESTANDARIZAR NUEVA) --</option>
                    </select>
                    {(newPropCommune === '' || !allCommunesList.includes(newPropCommune)) && (
                      <input 
                        type="text" 
                        value={newPropCommune}
                        onChange={e => setNewPropCommune(e.target.value)}
                        className="w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 uppercase outline-none focus:border-rose-600 font-sans"
                        placeholder="ESCRIBA AQUÍ LA COMUNA NUEVA"
                      />
                    )}
                  </div>

                  <div className="space-y-1 font-sans">
                    <label className="text-[9px] font-black text-slate-555 uppercase tracking-widest ml-1 text-[10px] font-sans font-bold">Conjunto / Edificio *</label>
                    <select 
                      value={newPropConjunto === '' ? '' : (uniqueConjuntos.includes(newPropConjunto) ? newPropConjunto : 'CUSTOM')}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'CUSTOM') {
                          setNewPropConjunto('');
                        } else {
                          setNewPropConjunto(val);
                        }
                      }}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-705 uppercase outline-none focus:border-rose-600 font-sans"
                    >
                      <option value="">-- SELECCIONE CONJUNTO EXISTENTE --</option>
                      {uniqueConjuntos.map(conj => (
                        <option key={conj} value={conj}>{conj}</option>
                      ))}
                      <option value="CUSTOM">-- OTRO (ESTANDARIZAR NUEVO) --</option>
                    </select>
                    {(newPropConjunto === '' || !uniqueConjuntos.includes(newPropConjunto)) && (
                      <input 
                        type="text" 
                        value={newPropConjunto}
                        onChange={e => setNewPropConjunto(e.target.value)}
                        className="w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 uppercase outline-none focus:border-rose-600 font-sans"
                        placeholder="ESCRIBA AQUÍ EL NOMBRE DE CONJUNTO O EDIFICIO NUEVO"
                      />
                    )}
                  </div>

                  <div className="space-y-1 col-span-1 md:col-span-2 font-sans">
                    <label className="text-[9px] font-black text-slate-555 uppercase tracking-widest ml-1 text-[10px] font-sans font-bold">Dirección Exacta *</label>
                    <input 
                      type="text" 
                      value={newPropAddress}
                      onChange={e => setNewPropAddress(e.target.value)}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 uppercase outline-none focus:border-rose-600 font-sans"
                      placeholder="AV. AMÉRICO VESPUCIO 1500"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-1 font-sans">
                    <label className="text-[9px] font-black text-slate-555 uppercase tracking-widest ml-1 text-[10px] font-sans">Tipo de Unidad Inmobiliaria</label>
                    <select 
                      value={newPropType}
                      onChange={e => setNewPropType(e.target.value as any)}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-700 uppercase outline-none focus:border-rose-600 font-sans"
                    >
                      <option value="DEPARTAMENTO">DEPARTAMENTO</option>
                      <option value="CASA">CASA</option>
                      <option value="BODEGA">BODEGA</option>
                      <option value="ESTACIONAMIENTO">ESTACIONAMIENTO</option>
                      <option value="LOCAL">LOCAL</option>
                      <option value="OFICINA">OFICINA</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4 font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-555 uppercase tracking-widest ml-1 font-bold">Nombre Solicitante / Cliente</label>
                <input 
                  type="text" 
                  value={wizardApplicantName}
                  onChange={e => setWizardApplicantName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 uppercase outline-none focus:bg-white focus:border-rose-600 transition-all font-sans font-black"
                  placeholder="QUIEN EMITE EL REQUERIMIENTO (EJ. JUAN PÉREZ)"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-555 uppercase tracking-widest ml-1 font-bold font-sans">Email de Contacto</label>
                  <input 
                    type="email" 
                    value={wizardApplicantEmail}
                    onChange={e => setWizardApplicantEmail(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-rose-600 transition-all lowercase"
                    placeholder="ejemplo@correo.cl"
                  />
                </div>

                <div className="space-y-1 font-sans">
                  <label className="text-[10px] font-black text-slate-555 uppercase tracking-widest ml-1 font-bold font-sans">Responsable Interno Asignado</label>
                  <input 
                    type="text" 
                    value={wizardAssignedTo}
                    onChange={e => setWizardAssignedTo(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 uppercase outline-none focus:bg-white focus:border-rose-600 transition-all font-sans font-black"
                    placeholder="QUIÉN DEBE GESTIONAR (EJ. DIEGO DIAZ)"
                  />
                </div>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-4 font-sans">
              <div className="space-y-1 font-sans">
                <label className="text-[10px] font-black text-slate-555 uppercase tracking-widest ml-1 font-bold font-sans">Descripción Detallada *</label>
                <textarea 
                  value={wizardDescription}
                  onChange={e => setWizardDescription(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-medium text-slate-855 outline-none focus:bg-white focus:border-rose-600 transition-all leading-relaxed font-sans"
                  placeholder="DESCRIBA DE FORMA COMPLETA Y ESPECÍFICA DETALLES DEL REQUERIMIENTO O PROBLEMA..."
                  autoFocus
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1 mt-1 font-sans">
                  Por favor exprese claramente los hechos, daños o solicitudes de mejora estructural para facilitar el análisis del profesional a cargo.
                </p>
              </div>
            </div>
          )}

          {wizardStep === 5 && (
            <div className="space-y-4 font-sans">
              {/* Validation Box */}
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-3xl flex items-start gap-3">
                <div className="bg-emerald-100 text-emerald-700 p-2 rounded-2xl mt-0.5">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-emerald-800 uppercase tracking-wider leading-none">Controles de Integridad ERP Aprobados</h4>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">El requerimiento se ha validado de forma sintáctica de acuerdo con el protocolo AssetFlow Enterprise central.</p>
                </div>
              </div>

              {/* Summary Bento Grid */}
              <div className="bg-slate-50 border border-slate-150 rounded-3xl p-6 space-y-4 text-slate-800 text-[11px] shadow-sm font-sans">
                <div className="border-b border-slate-200/60 pb-3.5">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Identificación Principal</div>
                  <div className="text-sm font-black text-slate-900 uppercase mt-1.5 leading-none">{wizardTitle || 'SOLICITUD SIN TÍTULO'}</div>
                  <div className="flex gap-4 mt-2.5">
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider">CATEGORÍA:</span> <span className="font-extrabold text-slate-700 bg-slate-200/50 px-2.5 py-0.5 rounded-lg ml-1 text-[10px] uppercase">{wizardCategory}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider font-sans">PRIORIDAD:</span> <span className={`font-black px-2.5 py-0.5 rounded-lg ml-1 text-[10px] uppercase font-sans ${wizardPriority === 'CRÍTICA' ? 'bg-red-100 text-red-600' : 'bg-slate-200/50 text-slate-700'}`}>{wizardPriority}</span>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-200/60 pb-3.5">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 font-sans">Unidad Inmobiliaria y Catastro</div>
                  {propertyMode === 'SELECT' ? (() => {
                    const propObj = properties.find(p => p.id === wizardPropertyId);
                    const tenancy = propObj ? getPropertyTenancy(propObj, leaseContracts) : null;
                    return (
                      <div className="mt-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-slate-800 text-xs">
                            {propObj ? `${propObj.building} (Rol: ${propObj.propertyRole || propObj.code})` : 'GENERAL - SIN ASIGNAR'}
                          </span>
                          {tenancy && (
                            <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${tenancy.badgeBg} ${tenancy.badgeText} ${tenancy.badgeBorder}`}>
                              {tenancy.badgeLabel}
                            </span>
                          )}
                        </div>
                        {propObj && (
                          <div className="text-slate-600 text-[10.5px] font-medium">
                            <span className="font-bold text-slate-800">Dirección Exacta:</span> {propObj.address}, {propObj.commune}
                            {tenancy?.tenantName && (
                              <span className="ml-2 text-slate-500 font-semibold">| Arrendatario: <span className="text-slate-800 font-bold">{tenancy.tenantName}</span></span>
                            )}
                            {tenancy?.endDate && (
                              <span className="ml-2 text-slate-500 font-semibold">| Término: <span className="text-slate-800 font-bold">{tenancy.endDate}</span></span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="mt-1 bg-white border border-slate-150 p-3 rounded-2xl font-sans">
                      <span className="bg-[#EEF2F6] text-[#475569] text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md inline-block mb-1.5">INSCRIPCIÓN DE NUEVA PROPIEDAD</span>
                      <div className="font-black text-slate-800">{newPropConjunto.toUpperCase()}</div>
                      <div className="text-slate-500 text-[10px] font-semibold mt-0.5">{newPropAddress.toUpperCase()}, {newPropCommune.toUpperCase()} ({newPropRegion.toUpperCase()})</div>
                      <div className="mt-1 text-[9px] font-bold text-rose-600 uppercase">Clasificación: {newPropType}</div>
                    </div>
                  )}
                </div>

                <div className="border-b border-slate-200/60 pb-3.5 font-sans">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 font-sans">Enlace Técnico y Solicitante</div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-1 font-sans">
                    <div>
                      <span className="font-bold text-slate-400 block text-[9.5px]">SOLICITANTE:</span> 
                      <span className="font-black text-slate-700 uppercase font-sans">{wizardApplicantName.trim() || 'NO IDENTIFICADO'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 block text-[9.5px]">CORREO CONTACTO:</span> 
                      <span className="font-bold text-slate-700 lowercase font-sans">{wizardApplicantEmail.trim() || 'N/A'}</span>
                    </div>
                    <div className="col-span-2 mt-1 bg-rose-500/5 px-3 py-1.5 rounded-xl border border-rose-500/10">
                      <span className="font-bold text-rose-500 block text-[9px] uppercase tracking-wider font-sans">Profesional Asignado:</span> 
                      <span className="font-black text-rose-700 uppercase font-sans">{wizardAssignedTo.trim() || 'ORGANIZACIÓN CENTRAL'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 font-sans">Exposición Detallada y Hechos</div>
                  <p className="font-medium text-slate-600 mt-1 italic leading-relaxed bg-white border border-slate-100 p-4 rounded-2xl text-[10.5px]">
                    "{wizardDescription}"
                  </p>
                </div>
              </div>

              <p className="text-[9.5px] text-slate-400 text-center font-bold uppercase tracking-wide font-sans">
                ⚠️ Al confirmar, el sistema registrará de inmediato este expediente en el maestro de transacciones de forma digital.
              </p>
            </div>
          )}
        </div>

        {/* Footer buttons / Controls */}
        <div className="p-6 md:p-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          {/* Back or Cancel */}
          {wizardStep === 1 ? (
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-all cursor-pointer font-sans"
            >
              Cancelar
            </button>
          ) : (
            <button 
              type="button" 
              onClick={() => setWizardStep(prev => prev - 1)}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase hover:bg-slate-300 transition-all cursor-pointer flex items-center gap-1.5 font-sans border-0"
            >
              ◀ Anterior FASE
            </button>
          )}

          {/* Next or Confirm */}
          {wizardStep < 5 ? (
            <button 
              type="button" 
              onClick={() => {
                if (wizardValidation(wizardStep)) {
                  setWizardStep(prev => prev + 1);
                } else {
                  alert('Faltan completar campos requeridos obligatorios marcados con asterisco (*).');
                }
              }}
              className={`px-8 py-3 text-white rounded-2xl font-black text-xs uppercase transition-all flex items-center gap-1.5 font-sans border-0 ${
                wizardValidation(wizardStep)
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Siguiente ▶
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleConfirmAndSave}
              className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all cursor-pointer flex items-center gap-1.5 border-0 font-sans"
            >
              ✔ Confirmar y Grabar Registro
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
