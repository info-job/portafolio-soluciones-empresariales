import React, { useState, useMemo, useDeferredValue, useCallback, memo } from 'react';
import { useNotification } from './NotificationProvider';
import { 
  Users, Plus, Search, Filter, Calendar, DollarSign, User, Building2, 
  Trash2, Edit3, Download, X, CheckCircle, AlertTriangle, FileText, 
  RefreshCw, TrendingUp, Info, Activity, ShieldAlert, Award, Save,
  CheckCircle2, Clock, Sparkles, Home, FileSpreadsheet, CheckSquare
} from 'lucide-react';
import { Applicant, Property, LeaseContract } from '../types';
import { formatCLP } from '../lib/chileanUtils';
import { JDEGridContextMenu } from './JDEGridContextMenu';
import { exportToExcel } from '../lib/excelExport';
import { 
  maskRUT, 
  validateRUTDetailed, 
  maskPhoneCLP, 
  validatePhoneCLP, 
  cleanEmail, 
  validateEmail, 
  checkDuplicateRUT, 
  maskMoneyCLP, 
  allowOnlyRUTKey, 
  allowOnlyDigitsKey 
} from '../lib/inputMasks';

export type PropertyAvailabilityTier = 'DISPONIBLE' | 'PROXIMA' | 'OCUPADA';

export interface PropertyAvailabilityInfo {
  tier: PropertyAvailabilityTier;
  priority: number; // 1 = DISPONIBLE, 2 = PROXIMA, 3 = OCUPADA
  badgeText: string;
  badgeColor: string;
  reason?: string;
}

/**
 * High-performance O(1) property availability evaluation
 * Evaluates direct status first, then scans associated contracts without allocating intermediate arrays
 */
export function getPropertyAvailabilityInfo(
  property: Property,
  contracts?: LeaseContract[]
): PropertyAvailabilityInfo {
  const statusUpper = (property.status || '').toUpperCase().trim();

  // 1. Tier DISPONIBLE (Priority 1)
  const isDirectAvailable =
    statusUpper === 'DISPONIBLE' ||
    statusUpper === 'VACANTE' ||
    statusUpper === 'LIBRE' ||
    statusUpper === 'DESOCUPADA' ||
    statusUpper === 'DISPONIBLE_INMEDIATA' ||
    statusUpper === 'EN_ARRIENDO' ||
    statusUpper === 'PUBLICADA' ||
    (statusUpper.includes('DISPONIBLE') && !statusUpper.includes('PROXIM'));

  if (isDirectAvailable) {
    return {
      tier: 'DISPONIBLE',
      priority: 1,
      badgeText: 'Disponible Inmediata',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
  }

  // 2. Check if status directly indicates upcoming vacancy (Priority 2)
  const isDirectUpcoming =
    statusUpper.includes('PROXIM') ||
    statusUpper.includes('POR_DESOCUPAR') ||
    statusUpper.includes('DESOCUPACION') ||
    statusUpper.includes('POR_VENCER') ||
    statusUpper.includes('RENOVACION') ||
    statusUpper.includes('MANTENCION') ||
    statusUpper.includes('EN_REPARACION') ||
    statusUpper.includes('RESTITUCION') ||
    statusUpper.includes('PENDIENTE_RESTITUCION') ||
    statusUpper.includes('SALIDA');

  if (isDirectUpcoming) {
    return {
      tier: 'PROXIMA',
      priority: 2,
      badgeText: 'Próxima a Estar Disponible',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      reason: property.status || 'En proceso de desocupación'
    };
  }

  // 3. Scan associated contracts (early exit on first match to avoid full array iterations)
  if (contracts && contracts.length > 0) {
    const now = Date.now();
    for (const c of contracts) {
      if (c.propertyId && c.propertyId !== property.id) continue;
      if (c.status === 'FINIQUITADO') continue;

      const cStatusUpper = (c.status || '').toUpperCase();
      if (cStatusUpper === 'POR_VENCER' || cStatusUpper === 'VENCIDO' || cStatusUpper === 'EN_RENOVACION') {
        return {
          tier: 'PROXIMA',
          priority: 2,
          badgeText: 'Próxima a Desocupar (Contrato por vencer)',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
          reason: `Contrato ${c.status.replace('_', ' ')}`
        };
      }
      if (c.endDate) {
        const end = new Date(c.endDate).getTime();
        const diffDays = Math.round((end - now) / (1000 * 60 * 60 * 24));
        if (diffDays >= -30 && diffDays <= 60) {
          return {
            tier: 'PROXIMA',
            priority: 2,
            badgeText: `Próxima a Desocupar (${diffDays > 0 ? `en ${diffDays} días` : 'en desocupación'})`,
            badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
            reason: `Vencimiento de contrato: ${c.endDate}`
          };
        }
      }
    }
  }

  // 4. Tier OCUPADA / ARRENDADA (Priority 3)
  return {
    tier: 'OCUPADA',
    priority: 3,
    badgeText: property.status || 'Arrendada',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300'
  };
}

export function sortPropertiesByAvailability(
  properties: Property[],
  contracts?: LeaseContract[]
): Property[] {
  // Precompute availability info once to avoid O(N log N) redundant calculations
  const infoMap = new Map<string, PropertyAvailabilityInfo>();
  for (const p of properties) {
    infoMap.set(p.id, getPropertyAvailabilityInfo(p, contracts));
  }

  return [...properties].sort((a, b) => {
    const prioA = infoMap.get(a.id)?.priority ?? 3;
    const prioB = infoMap.get(b.id)?.priority ?? 3;

    if (prioA !== prioB) {
      return prioA - prioB;
    }

    const labelA = `${a.building || ''} ${a.code || ''} ${a.commune || ''}`.trim();
    const labelB = `${b.building || ''} ${b.code || ''} ${b.commune || ''}`.trim();
    return labelA.localeCompare(labelB);
  });
}

export function getRegionByCommune(commune: string): string {
  const comm = (commune || '').trim().toLowerCase();
  
  if (['iquique', 'alto hospicio', 'pozo almonte', 'pica', 'huara', 'camiña', 'colchane'].includes(comm)) {
    return 'Región de Tarapacá (I)';
  }
  if (['valparaíso', 'valparaiso', 'viña del mar', 'vina del mar', 'quilpué', 'quilpue', 'villa alemana', 'san antonio', 'quillota', 'los andes', 'san felipe', 'el quisco', 'el tabo', 'algarrobo', 'casablanca', 'concón', 'concon', 'limache', 'olmue', 'olmué', 'san esteban'].includes(comm)) {
    return 'Región de Valparaíso (V)';
  }
  if (['santiago', 'providencia', 'las condes', 'vitacura', 'ñuñoa', 'nunoa', 'la reina', 'peñalolén', 'penalolen', 'macul', 'san joaquín', 'san joaquin', 'la florida', 'puente alto', 'san bernardo', 'maipú', 'maipu', 'pudahuel', 'quilicura', 'estación central', 'estacion central', 'independencia', 'recoleta', 'conchalí', 'conchali', 'huechuraba', 'cerrillos', 'lo espejo', 'la cisterna', 'san ramón', 'san ramon', 'la granja', 'el bosque', 'lo barnechea', 'quinta normal', 'pudahuel', 'lo prado', 'cerro navia', 'renca', 'lampa', 'colina', 'talagante', 'buin', 'paine', 'melipilla'].includes(comm)) {
    return 'Región Metropolitana (RM)';
  }
  if (['antofagasta', 'calama', 'tocopilla', 'mejillones', 'taltal', 'san pedro de atacama'].includes(comm)) {
    return 'Región de Antofagasta (II)';
  }
  if (['coquimbo', 'la serena', 'ovalle', 'illapel', 'vicuña', 'vicuna', 'los vilos'].includes(comm)) {
    return 'Región de Coquimbo (IV)';
  }
  if (['copiapó', 'copiapo', 'vallenar', 'caldera', 'chañaral', 'chanaral', 'huasco', 'diego de almagro'].includes(comm) || comm.includes('vallenar')) {
    return 'Región de Atacama (III)';
  }
  if (['valdivia', 'la unión', 'la union', 'río bueno', 'rio bueno', 'panguipulli', 'lanco', 'mariquina'].includes(comm) || comm.includes('valdivia')) {
    return 'Región de Los Ríos (XIV)';
  }
  if (['coyhaique', 'aysen', 'puerto aysen', 'chile chico', 'cochrane'].includes(comm) || comm.includes('coyhaique')) {
    return 'Región de Aysén (XI)';
  }
  if (['concepción', 'concepcion', 'talcahuano', 'chiguayante', 'san pedro de la paz', 'coronel', 'lota', 'penco', 'tomé', 'tome', 'hualpén', 'hualpen', 'los ángeles', 'los angeles'].includes(comm)) {
    return 'Región del Biobío (VIII)';
  }
  if (['temuco', 'padre las casas', 'angol', 'villarrica', 'pucón', 'pucon', 'lautaro', 'victoria'].includes(comm)) {
    return 'Región de la Araucanía (IX)';
  }
  if (['puerto montt', 'osorno', 'castro', 'ancud', 'puerto varas', 'frutillar', 'llanquihue', 'quellón', 'quellon'].includes(comm)) {
    return 'Región de Los Lagos (X)';
  }

  if (comm.includes('santiago') || comm.includes('condes') || comm.includes('ñuñoa') || comm.includes('providencia') || comm.includes('florida') || comm.includes('maipu') || comm.includes('maipú')) {
    return 'Región Metropolitana (RM)';
  }
  if (comm.includes('valp') || comm.includes('viña') || comm.includes('tabo') || comm.includes('quisco') || comm.includes('algarrobo')) {
    return 'Región de Valparaíso (V)';
  }
  if (comm.includes('iquique') || comm.includes('hospicio')) {
    return 'Región de Tarapacá (I)';
  }
  if (comm.includes('antofagasta') || comm.includes('calama')) {
    return 'Región de Antofagasta (II)';
  }
  if (comm.includes('conce') || comm.includes('talcahuano')) {
    return 'Región del Biobío (VIII)';
  }

  return 'Región Metropolitana (RM)';
}

// Pre-indexed property option representation for zero-allocation renders
export interface FormPropertyOption {
  id: string;
  code: string;
  building: string;
  commune: string;
  rentalAmount: number;
  priority: number;
  tier: PropertyAvailabilityTier;
  badgeText: string;
  badgeColor: string;
  reason?: string;
  displayLabel: string;
  searchKey: string;
}

export function calculateScore(income: number, employmentStatus: string, rentAmount: number): number {
  if (rentAmount <= 0) return 50;
  const ratio = income / rentAmount;
  let score = 0;

  // 1. Rent-to-Income Ratio (Max 50 points)
  if (ratio >= 4.0) {
    score += 50;
  } else if (ratio >= 3.0) {
    score += 40;
  } else if (ratio >= 2.5) {
    score += 30;
  } else if (ratio >= 2.0) {
    score += 15;
  } else {
    score += 5;
  }

  // 2. Employment Stability (Max 40 points)
  if (employmentStatus === 'DEPENDIENTE' || employmentStatus === 'FUNCIONARIO') {
    score += 40;
  } else if (employmentStatus === 'INDEPENDIENTE_CON_IVA' || employmentStatus === 'EMPRESARIO') {
    score += 30;
  } else if (employmentStatus === 'INDEPENDIENTE_HONORARIOS') {
    score += 20;
  } else {
    score += 10;
  }

  // 3. Score booster
  score += 10;

  return Math.min(score, 100);
}

// =========================================================================
// ISOLATED, MEMOIZED FORM DIALOG (Zero-lag, 60fps typing, Windowed Dropdown)
// =========================================================================

interface ApplicantFormModalProps {
  isOpen: boolean;
  initialApplicant: Applicant | null;
  formPropertyOptions: FormPropertyOption[];
  propertyMap: Map<string, Property>;
  propertyAvailabilityMap: Map<string, PropertyAvailabilityInfo>;
  uniqueCommunes: string[];
  applicants: Applicant[];
  currentUser: string;
  onClose: () => void;
  onSave: (applicant: Applicant) => void;
}

const ApplicantFormModal: React.FC<ApplicantFormModalProps> = memo(({
  isOpen,
  initialApplicant,
  formPropertyOptions,
  propertyMap,
  propertyAvailabilityMap,
  uniqueCommunes,
  applicants,
  currentUser,
  onClose,
  onSave
}) => {
  const { notify } = useNotification();

  // Local Form State isolated strictly inside this modal
  // Typing in this modal NEVER triggers re-renders of the parent or background table!
  const [formData, setFormData] = useState<Partial<Applicant>>(() => {
    if (initialApplicant) {
      return {
        id: initialApplicant.id,
        name: initialApplicant.name,
        taxId: initialApplicant.taxId,
        email: initialApplicant.email || '',
        phone: initialApplicant.phone || '',
        monthlyIncome: initialApplicant.monthlyIncome || 0,
        employmentStatus: initialApplicant.employmentStatus || 'DEPENDIENTE',
        propertyId: initialApplicant.propertyId || '',
        status: initialApplicant.status || 'PENDIENTE',
        evaluatorObservations: initialApplicant.evaluatorObservations || ''
      };
    }
    return {
      name: '',
      taxId: '',
      email: '',
      phone: '',
      monthlyIncome: 0,
      employmentStatus: 'DEPENDIENTE',
      propertyId: '',
      status: 'PENDIENTE',
      evaluatorObservations: ''
    };
  });

  const [propertySearchFilter, setPropertySearchFilter] = useState('');
  const [propertyCommuneFilter, setPropertyCommuneFilter] = useState('');

  // Use deferred value for property search so fast typing never lags the input
  const deferredSearch = useDeferredValue(propertySearchFilter.trim().toLowerCase());

  // Filtered properties in memory (fast lowercase search without regex or DOM work)
  const filteredProperties = useMemo(() => {
    let list = formPropertyOptions;
    if (propertyCommuneFilter) {
      list = list.filter(p => p.commune === propertyCommuneFilter);
    }
    if (deferredSearch) {
      list = list.filter(p => p.searchKey.includes(deferredSearch));
    }
    return list;
  }, [formPropertyOptions, propertyCommuneFilter, deferredSearch]);

  // High-performance windowing: render up to 150 options to prevent browser DOM freezing
  // If the user's selected property is beyond 150, inject it so the select value is never lost!
  const MAX_OPTIONS = 150;
  const { visibleDisponibles, visibleProximas, visibleOcupadas, isCapped, totalMatches } = useMemo(() => {
    const disponibles: FormPropertyOption[] = [];
    const proximas: FormPropertyOption[] = [];
    const ocupadas: FormPropertyOption[] = [];

    const selectedId = formData.propertyId;
    let selectedIncluded = false;
    let count = 0;

    for (const p of filteredProperties) {
      if (p.id === selectedId) selectedIncluded = true;
      if (count < MAX_OPTIONS) {
        if (p.priority === 1) disponibles.push(p);
        else if (p.priority === 2) proximas.push(p);
        else ocupadas.push(p);
        count++;
      }
    }

    // Guarantee selected option is present in the select even if filtered out or past cap
    if (selectedId && !selectedIncluded) {
      const selectedItem = formPropertyOptions.find(p => p.id === selectedId);
      if (selectedItem) {
        if (selectedItem.priority === 1) disponibles.unshift(selectedItem);
        else if (selectedItem.priority === 2) proximas.unshift(selectedItem);
        else ocupadas.unshift(selectedItem);
      }
    }

    return {
      visibleDisponibles: disponibles,
      visibleProximas: proximas,
      visibleOcupadas: ocupadas,
      isCapped: filteredProperties.length > MAX_OPTIONS,
      totalMatches: filteredProperties.length
    };
  }, [filteredProperties, formData.propertyId, formPropertyOptions]);

  // Memoized RUT validation local to this modal
  const formTaxIdDuplicate = useMemo(() => {
    if (!formData.taxId) return { isDuplicate: false, warningMessage: null };
    return checkDuplicateRUT(formData.taxId, applicants, initialApplicant?.id);
  }, [formData.taxId, applicants, initialApplicant?.id]);

  const formTaxIdDetailed = useMemo(() => {
    if (!formData.taxId) return { isValid: false, error: null };
    return validateRUTDetailed(formData.taxId);
  }, [formData.taxId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      notify('Por favor ingrese el nombre del postulante.', 'warning');
      return;
    }
    if (!formData.taxId?.trim()) {
      notify('Por favor ingrese el RUT o identificador tributario del postulante.', 'warning');
      return;
    }
    if (!formData.propertyId) {
      notify('Por favor seleccione la propiedad a la que postula el candidato.', 'warning');
      return;
    }

    const property = propertyMap.get(formData.propertyId);
    const rentAmount = property?.rentalAmount || 1;
    const calculatedScore = calculateScore(
      formData.monthlyIncome || 0,
      formData.employmentStatus || 'DEPENDIENTE',
      rentAmount
    );

    const updatedApplicant: Applicant = {
      id: formData.id || `app-${Date.now()}`,
      name: formData.name.trim(),
      taxId: formData.taxId.trim().toUpperCase(),
      email: (formData.email || '').trim(),
      phone: (formData.phone || '').trim(),
      monthlyIncome: Number(formData.monthlyIncome) || 0,
      employmentStatus: formData.employmentStatus || 'DEPENDIENTE',
      propertyId: formData.propertyId,
      propertyLabel: property ? `${property.building ? property.building + ' - ' : ''}Depto ${property.code} (${property.commune || 'S/C'})` : 'S/I',
      score: calculatedScore,
      status: (formData.status as 'PENDIENTE' | 'APROBADO' | 'RECHAZADO') || 'PENDIENTE',
      evaluatorObservations: (formData.evaluatorObservations || '').trim(),
      userCreator: currentUser || 'SISTEMA',
      timestamp: Date.now()
    };

    onSave(updatedApplicant);

    if (formData.status === 'APROBADO' && property && property.status !== 'DISPONIBLE') {
      notify('Postulante aprobado. Recordatorio: la unidad requiere emisión de Acta de Restitución antes de entrega de llaves.', 'info');
    } else {
      notify(formData.id ? '¡Cambios guardados con éxito!' : '¡Candidato registrado y evaluado con éxito!', 'success');
    }
    onClose();
  };

  if (!isOpen) return null;

  // Selected Property card details (instant O(1) map lookup)
  const selectedProperty = formData.propertyId ? propertyMap.get(formData.propertyId) : null;
  const selectedPropInfo = selectedProperty ? propertyAvailabilityMap.get(selectedProperty.id) : null;
  const requiredIncome = selectedProperty ? (selectedProperty.rentalAmount || 0) * 3 : 0;
  const userIncome = formData.monthlyIncome || 0;
  const meetsRatio = userIncome >= requiredIncome && requiredIncome > 0;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      style={{ willChange: 'opacity' }}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 font-mono">
              Evaluación Inmobiliaria ATS (P15013)
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
              {initialApplicant ? 'Editar Postulante' : 'Ingresar Nueva Postulación'}
            </h2>
            <p className="text-[11px] font-bold text-slate-500 mt-0.5">
              Análisis y scoring de solvencia financiera inmediata
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs p-2 rounded-2xl transition-all cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 flex-1">
          {/* Row 1: Nombre & RUT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">
                Nombre Completo <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-slate-800 uppercase"
                placeholder="Juan Pérez Silva"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                  RUT (Máscara + Módulo 11) <span className="text-rose-500">*</span>
                </label>
                {formData.taxId && formTaxIdDuplicate.isDuplicate ? (
                  <span className="text-[8px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300 animate-pulse">
                    <AlertTriangle size={10} className="text-amber-600" /> Duplicado
                  </span>
                ) : formData.taxId && !formTaxIdDetailed.isValid ? (
                  <span className="text-[8px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                    {formTaxIdDetailed.error || 'Inválido'}
                  </span>
                ) : formData.taxId && formTaxIdDetailed.isValid ? (
                  <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ RUT Válido
                  </span>
                ) : null}
              </div>
              <input 
                type="text"
                required
                value={formData.taxId || ''}
                onKeyDown={allowOnlyRUTKey}
                onChange={(e) => {
                  const masked = maskRUT(e.target.value);
                  setFormData(prev => ({ ...prev, taxId: masked }));
                }}
                className={`w-full bg-slate-50 border-2 rounded-2xl p-3.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all ${
                  formData.taxId && formTaxIdDuplicate.isDuplicate
                    ? 'border-amber-400 bg-amber-50/40 text-amber-950'
                    : formData.taxId && !formTaxIdDetailed.isValid
                    ? 'border-rose-400 bg-rose-50/20 text-rose-900'
                    : formData.taxId && formTaxIdDetailed.isValid
                    ? 'border-emerald-400 bg-emerald-50/10'
                    : 'border-slate-200 text-slate-800'
                }`}
                placeholder="12.345.678-9"
              />
              {formData.taxId && formTaxIdDuplicate.warningMessage && (
                <p className="text-[9.5px] font-bold text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 flex items-center gap-1.5 mt-1">
                  <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                  <span>{formTaxIdDuplicate.warningMessage}</span>
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Correo & Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                  Correo Electrónico
                </label>
                {formData.email && validateEmail(formData.email).isValid ? (
                  <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-200">✓ Válido</span>
                ) : formData.email && !validateEmail(formData.email).isValid ? (
                  <span className="text-[8px] font-black text-rose-600">Email Inválido</span>
                ) : null}
              </div>
              <input 
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, email: cleanEmail(e.target.value) }))}
                className={`w-full bg-slate-50 border-2 rounded-2xl p-3.5 text-xs font-bold focus:outline-none transition-all focus:bg-white ${
                  formData.email && !validateEmail(formData.email).isValid ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 text-slate-800'
                }`}
                placeholder="juan.perez@email.com"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                  Teléfono Móvil (+56 9)
                </label>
                {formData.phone && validatePhoneCLP(formData.phone).isValid ? (
                  <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-200">✓ Válido</span>
                ) : formData.phone && !validatePhoneCLP(formData.phone).isValid ? (
                  <span className="text-[8px] font-black text-rose-600">9 dígitos</span>
                ) : null}
              </div>
              <input 
                type="text"
                value={formData.phone || ''}
                onKeyDown={allowOnlyDigitsKey}
                onChange={(e) => {
                  const masked = maskPhoneCLP(e.target.value);
                  setFormData(prev => ({ ...prev, phone: masked }));
                }}
                className={`w-full bg-slate-50 border-2 rounded-2xl p-3.5 text-xs font-mono font-bold focus:outline-none transition-all focus:bg-white ${
                  formData.phone && !validatePhoneCLP(formData.phone).isValid ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 text-slate-800'
                }`}
                placeholder="+56 9 8765 4321"
              />
            </div>
          </div>

          {/* Row 3: Ingreso Líquido & Situación Laboral */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                  Ingreso Líquido Mensual (CLP) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-mono font-black text-emerald-700">
                  {formData.monthlyIncome ? maskMoneyCLP(formData.monthlyIncome).formatted : '$ 0'}
                </span>
              </div>
              <input 
                type="text"
                required
                value={formData.monthlyIncome ? formData.monthlyIncome.toLocaleString('es-CL') : ''}
                onKeyDown={allowOnlyDigitsKey}
                onChange={(e) => {
                  const rawNum = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({ ...prev, monthlyIncome: rawNum ? parseInt(rawNum, 10) : 0 }));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-slate-800 font-bold"
                placeholder="Monto en pesos, ej: 1.500.000"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">
                Situación Laboral / Dependencia
              </label>
              <select 
                value={formData.employmentStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, employmentStatus: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-slate-800 font-semibold"
              >
                <option value="DEPENDIENTE">CONTRATO DEPENDIENTE INDEFINIDO</option>
                <option value="DEPENDIENTE_PLAZO">CONTRATO DEPENDIENTE PLAZO FIJO</option>
                <option value="INDEPENDIENTE_CON_IVA">INDEPENDIENTE CARPETA TRIBUTARIA (IVA)</option>
                <option value="INDEPENDIENTE_HONORARIOS">INDEPENDIENTE BOLETERO (HONORARIOS)</option>
                <option value="EMPRESARIO">SOCIO / EMPRESARIO</option>
                <option value="FUNCIONARIO">FUNCIONARIO PÚBLICO O DE FUERZAS ARMADAS</option>
                <option value="JUBILADO">JUBILADO / PENSIONADO</option>
              </select>
            </div>
          </div>

          {/* Row 4: Property Selection Container (Optimized with Windowed Search) */}
          <div className="space-y-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                <div>
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                    Selección de Propiedad / Unidad Solicitada <span className="text-rose-500">*</span>
                  </h4>
                  <p className="text-[10px] text-emerald-700 font-bold">
                    🟢 Unidades ordenadas por disponibilidad inmediata y próximas a desocupar
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-2xs self-start sm:self-center">
                Total Cartera: {formPropertyOptions.length} unidades
              </span>
            </div>

            {/* Quick Filters (Keyword + Comuna) with Zero-lag Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={propertySearchFilter}
                  onChange={(e) => setPropertySearchFilter(e.target.value)}
                  placeholder="Buscar depto, edificio o calle..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <select
                  value={propertyCommuneFilter}
                  onChange={(e) => setPropertyCommuneFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Todas las comunas ({uniqueCommunes.length})</option>
                  {uniqueCommunes.map(comm => (
                    <option key={comm} value={comm}>{comm}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Capped dropdown info banner */}
            {isCapped && (
              <div className="p-2 bg-amber-50/90 border border-amber-200 rounded-xl text-[10px] text-amber-900 font-medium flex items-center justify-between">
                <span>
                  ⚡ Mostrando las primeras {MAX_OPTIONS} unidades de {totalMatches} encontradas.
                </span>
                <span className="font-bold text-amber-700">Filtre arriba para afinar</span>
              </div>
            )}

            {/* Dropdown Options (Rendered with Windowing for 60fps responsiveness) */}
            <div className="space-y-1">
              <select
                required
                value={formData.propertyId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, propertyId: e.target.value }))}
                className="w-full bg-white border-2 border-emerald-400 focus:border-emerald-600 rounded-2xl p-3.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-xs"
              >
                <option value="">-- SELECCIONE PROPIEDAD (ORDENADAS POR DISPONIBILIDAD) --</option>
                
                {visibleDisponibles.length > 0 && (
                  <optgroup label={`🟢 DISPONIBLES INMEDIATAS (${visibleDisponibles.length} mostradas)`}>
                    {visibleDisponibles.map(p => (
                      <option key={p.id} value={p.id} className="text-emerald-900 font-semibold py-1">
                        {p.displayLabel}
                      </option>
                    ))}
                  </optgroup>
                )}

                {visibleProximas.length > 0 && (
                  <optgroup label={`🟡 PRÓXIMAS A ESTAR DISPONIBLES (${visibleProximas.length} mostradas)`}>
                    {visibleProximas.map(p => (
                      <option key={p.id} value={p.id} className="text-amber-900 font-semibold py-1">
                        {p.displayLabel}
                      </option>
                    ))}
                  </optgroup>
                )}

                {visibleOcupadas.length > 0 && (
                  <optgroup label={`⚪ ARRENDADAS / OCUPADAS (${visibleOcupadas.length} mostradas)`}>
                    {visibleOcupadas.map(p => (
                      <option key={p.id} value={p.id} className="text-slate-600 py-1">
                        {p.displayLabel}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Display Selected Property Details Card */}
            {selectedProperty && selectedPropInfo && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 animate-in fade-in duration-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${selectedPropInfo.badgeColor}`}>
                      {selectedPropInfo.badgeText}
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      {selectedProperty.building ? `${selectedProperty.building} — ` : ''}Depto/Unidad {selectedProperty.code}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, propertyId: '' }))}
                    className="text-[10px] text-rose-600 hover:text-rose-800 uppercase font-black tracking-widest transition-colors self-end sm:self-center cursor-pointer"
                  >
                    Limpiar Selección
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-150">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Ubicación</div>
                    <div className="font-semibold text-slate-700 truncate">{selectedProperty.address}, {selectedProperty.commune}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-150">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Canon de Arriendo</div>
                    <div className="font-extrabold text-emerald-700">{formatCLP(selectedProperty.rentalAmount || 0)}/mes</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-150">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Renta Requerida (3.0x)</div>
                    <div className="font-bold text-slate-800">{formatCLP(requiredIncome)}</div>
                  </div>
                </div>

                {/* Live Financial Solvency Feedback */}
                {userIncome > 0 && (
                  <div className={`rounded-xl p-3 text-[11px] font-semibold flex items-center gap-2 border ${
                    meetsRatio 
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}>
                    {meetsRatio ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                    )}
                    <span>
                      {meetsRatio 
                        ? `Postulante Solvente: Renta mensual de ${formatCLP(userIncome)} supera holgadamente el ratio mínimo 3.0x (${formatCLP(requiredIncome)}).`
                        : `Renta insuficiente para ratio 3.0x (${formatCLP(userIncome)} vs ${formatCLP(requiredIncome)}). Se recomienda solicitar aval o codeudor solidario.`}
                    </span>
                  </div>
                )}

                {selectedPropInfo.priority === 1 && (
                  <div className="bg-emerald-50/70 border border-emerald-200 text-emerald-900 rounded-xl p-2.5 text-[11px] font-medium flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span><strong>Unidad Inmediatamente Disponible:</strong> Apta para firma de contrato y entrega de llaves tras aprobación.</span>
                  </div>
                )}

                {selectedPropInfo.priority === 2 && (
                  <div className="bg-amber-50/70 border border-amber-200 text-amber-900 rounded-xl p-2.5 text-[11px] font-medium flex items-center gap-2">
                    <Clock size={15} className="text-amber-600 shrink-0" />
                    <span><strong>Próxima a Desocupar:</strong> {selectedPropInfo.reason || 'En proceso de desocupación'}. Permite pre-evaluación y reserva anticipada.</span>
                  </div>
                )}

                {selectedPropInfo.priority === 3 && (
                  <div className="bg-slate-100 border border-slate-200 text-slate-800 rounded-xl p-2.5 text-[11px] font-medium flex items-center gap-2">
                    <Info size={15} className="text-slate-600 shrink-0" />
                    <span><strong>Control de Ocupación:</strong> Esta unidad se encuentra en estado "{selectedProperty.status || 'ARRENDADA'}". Requiere emisión de Acta de Restitución antes de entrega formal.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 5: Estado Inicial */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">
              Estado de Evaluación Inicial
            </label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-slate-800 font-semibold"
            >
              <option value="PENDIENTE">PENDIENTE (BAJO ANÁLISIS)</option>
              <option value="APROBADO">APROBADO (APTO PARA ARRENDAR)</option>
              <option value="RECHAZADO">RECHAZADO (NO APTO)</option>
            </select>
          </div>

          {/* Row 6: Observaciones */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">
              Observaciones / Juicios de Revisión
            </label>
            <textarea 
              value={formData.evaluatorObservations}
              onChange={(e) => setFormData(prev => ({ ...prev, evaluatorObservations: e.target.value }))}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-slate-800"
              placeholder="Escriba comentarios adicionales sobre el postulante, antecedentes de comportamiento, aval presente, etc..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              className="bg-slate-100 text-slate-700 rounded-2xl px-5 py-3.5 text-xs font-bold uppercase transition-all hover:bg-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="bg-emerald-600 text-white rounded-2xl px-7 py-3.5 text-xs font-black uppercase tracking-wider transition-all hover:bg-emerald-700 shadow-md shadow-emerald-600/10 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Save size={15} />
              <span>{initialApplicant ? 'Guardar Cambios' : 'Registrar y Evaluar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// =========================================================================
// MEMOIZED APPLICANTS TABLE (Dormant when modal is open)
// =========================================================================

interface ApplicantTableProps {
  enrichedApplicants: Array<{
    app: Applicant;
    matchedProperty?: Property;
    propInfo: PropertyAvailabilityInfo | null;
    rent: number;
    isOptimalRatio: boolean;
    ratioDisplay: string;
  }>;
  onQuickStatusChange: (app: Applicant, status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO') => void;
  onEdit: (app: Applicant) => void;
  onDelete: (id: string) => void;
  onExportPDF: (app: Applicant) => void;
  onRowContextMenu?: (e: React.MouseEvent, app: Applicant) => void;
  onRowSelectorClick?: (e: React.MouseEvent, app: Applicant) => void;
  selectedApplicantId?: string | null;
}

const ApplicantTable: React.FC<ApplicantTableProps> = memo(({
  enrichedApplicants,
  onQuickStatusChange,
  onEdit,
  onDelete,
  onExportPDF,
  onRowContextMenu,
  onRowSelectorClick,
  selectedApplicantId
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-100/70 border-b border-slate-200 font-sans text-slate-700 text-[10px] font-black uppercase tracking-wider text-left">
            <th className="w-10 px-2 py-3.5 text-center border-r border-slate-200/60 font-mono text-[9px] text-slate-600 font-black select-none" title="Selector de Fila AssetFlow Enterprise (P1501)">
              #
            </th>
            <th className="px-6 py-4">Postulante / RUT</th>
            <th className="px-6 py-4">Propiedad Requerida</th>
            <th className="px-6 py-4 text-right">Renta Líquida</th>
            <th className="px-6 py-4 text-center">Score Financiero</th>
            <th className="px-6 py-4 text-center">Estado</th>
            <th className="px-6 py-4 text-center">Controles Rápidos</th>
            <th className="px-6 py-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs">
          {enrichedApplicants.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-16 text-slate-600">
                <div className="flex flex-col items-center gap-2">
                  <Users size={40} className="text-slate-400" />
                  <p className="font-bold uppercase tracking-wide text-slate-700">No se encontraron postulantes registrados o con este filtro.</p>
                  <p className="text-[10px] text-slate-500 font-bold">Utilice el botón superior para ingresar y calificar postulaciones.</p>
                </div>
              </td>
            </tr>
          ) : (
            enrichedApplicants.map(({ app, matchedProperty, propInfo, rent, isOptimalRatio, ratioDisplay }, idx) => {
              const isSelected = selectedApplicantId === app.id;
              return (
                <tr 
                  key={app.id} 
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (onRowContextMenu) onRowContextMenu(e, app);
                  }}
                  className={`transition-colors select-none ${
                    isSelected 
                      ? 'bg-blue-50/90 ring-1 ring-blue-300 font-medium' 
                      : 'hover:bg-slate-50/80'
                  }`}
                  title="Clic derecho o botón [#] para abrir Menú Contextual AssetFlow Enterprise"
                >
                  {/* AssetFlow Enterprise Row Selector Cell */}
                  <td 
                    className={`w-10 px-1 py-4 text-center border-r border-slate-200/60 font-mono text-[10px] cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#0B3C5D] text-white font-bold'
                        : 'bg-slate-50 text-slate-700 font-bold hover:bg-amber-100 hover:text-amber-900'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRowSelectorClick) onRowSelectorClick(e, app);
                    }}
                    title="Clic para abrir Menú Contextual AssetFlow Enterprise (P1501)"
                  >
                    <div className="flex items-center justify-center">
                      {isSelected ? (
                        <span className="text-[11px] font-black text-amber-300 animate-pulse">▶</span>
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{app.name}</div>
                    <div className="text-[10px] font-mono text-slate-600 font-bold mt-0.5">{app.taxId}</div>
                    <div className="text-[10px] text-slate-600 font-medium mt-1">{app.email} | {app.phone}</div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-slate-800">{app.propertyLabel}</span>
                      {propInfo && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black border ${propInfo.badgeColor}`}>
                          {propInfo.badgeText}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-600 font-bold mt-0.5 uppercase tracking-wide">
                      Renta req: ${matchedProperty?.rentalAmount?.toLocaleString('es-CL') || '0'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-bold text-slate-900">${app.monthlyIncome.toLocaleString('es-CL')}</div>
                    <span className={`inline-block py-0.5 px-2 rounded-full text-[9px] font-black uppercase mt-1 ${isOptimalRatio ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                      {ratioDisplay}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className={`text-sm font-black rounded-full px-3 py-1 ${
                        app.score >= 80 ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                        app.score >= 60 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {app.score}/100
                      </span>
                      <span className="text-[9px] text-slate-600 font-mono font-bold mt-1">{app.employmentStatus}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block py-1.5 px-3 rounded-full text-[10px] font-extrabold uppercase ${
                      app.status === 'APROBADO' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/10' :
                      app.status === 'PENDIENTE' ? 'bg-amber-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex gap-1 justify-center">
                      <button 
                        onClick={() => onQuickStatusChange(app, 'APROBADO')}
                        className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${app.status === 'APROBADO' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-600 hover:bg-emerald-50 border-slate-200'}`}
                      >
                        Aprobar
                      </button>
                      <button 
                        onClick={() => onQuickStatusChange(app, 'RECHAZADO')}
                        className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${app.status === 'RECHAZADO' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 hover:bg-red-50 border-slate-200'}`}
                      >
                        Rechazar
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => onExportPDF(app)}
                        className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition-colors cursor-pointer"
                        title="Descargar Ficha PDF Acreditada"
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        onClick={() => onEdit(app)}
                        className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl transition-colors cursor-pointer"
                        title="Editar Antecedentes"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => onDelete(app.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors cursor-pointer"
                        title="Eliminar Postulación"
                      >
                        <Trash2 size={14} />
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
  );
});

// =========================================================================
// MAIN APPLICANT EVALUATION MODULE
// =========================================================================

interface ApplicantEvaluationModuleProps {
  applicants: Applicant[];
  properties: Property[];
  contracts?: LeaseContract[];
  onSave: (applicant: Applicant) => void;
  onBatchSave?: (applicants: Applicant[]) => void;
  onDelete: (id: string) => void;
  currentUser: string;
  companyLogo: string | null;
}

const ApplicantEvaluationModule: React.FC<ApplicantEvaluationModuleProps> = ({
  applicants,
  properties,
  contracts,
  onSave,
  onBatchSave,
  onDelete,
  currentUser,
  companyLogo
}) => {
  const { notify } = useNotification();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApplicant, setEditingApplicant] = useState<Applicant | null>(null);
  const [demoBanner, setDemoBanner] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'>('ALL');
  
  // AssetFlow Enterprise Floating Grid Context Menu State
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    applicant: Applicant;
  } | null>(null);

  // 1. Ultra-fast Precomputed O(1) Index Maps
  const contractsByPropertyId = useMemo(() => {
    const map = new Map<string, LeaseContract[]>();
    if (!contracts || contracts.length === 0) return map;
    for (const c of contracts) {
      if (!c.propertyId || c.status === 'FINIQUITADO') continue;
      const list = map.get(c.propertyId);
      if (list) {
        list.push(c);
      } else {
        map.set(c.propertyId, [c]);
      }
    }
    return map;
  }, [contracts]);

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>();
    for (const p of properties) {
      map.set(p.id, p);
    }
    return map;
  }, [properties]);

  const propertyAvailabilityMap = useMemo(() => {
    const map = new Map<string, PropertyAvailabilityInfo>();
    for (const p of properties) {
      const propContracts = contractsByPropertyId.get(p.id);
      map.set(p.id, getPropertyAvailabilityInfo(p, propContracts));
    }
    return map;
  }, [properties, contractsByPropertyId]);

  // Precomputed & Preformatted Option List for the Form Dropdown (Indexed once!)
  const formPropertyOptions = useMemo<FormPropertyOption[]>(() => {
    return properties.map(p => {
      const info = propertyAvailabilityMap.get(p.id) || getPropertyAvailabilityInfo(p);
      const buildingPrefix = p.building ? `${p.building} - ` : '';
      const communeSuffix = p.commune || 'S/C';
      const rentFormatted = formatCLP(p.rentalAmount || 0);
      const displayLabel = `${info.priority === 1 ? '🟢 DISPONIBLE' : info.priority === 2 ? `🟡 PRÓXIMA (${info.badgeText})` : `⚪ ${p.status || 'OCUPADA'}`} | ${buildingPrefix}Depto ${p.code} (${communeSuffix}) — ${rentFormatted}/mes`;
      const searchKey = `${p.building || ''} ${p.code || ''} ${p.address || ''} ${p.commune || ''} ${p.status || ''}`.toLowerCase();

      return {
        id: p.id,
        code: p.code || '',
        building: p.building || '',
        commune: p.commune || '',
        rentalAmount: p.rentalAmount || 0,
        priority: info.priority,
        tier: info.tier,
        badgeText: info.badgeText,
        badgeColor: info.badgeColor,
        reason: info.reason,
        displayLabel,
        searchKey
      };
    }).sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.displayLabel.localeCompare(b.displayLabel);
    });
  }, [properties, propertyAvailabilityMap]);

  // Unique communes for quick filtering
  const uniqueCommunes = useMemo(() => {
    const set = new Set<string>();
    for (const p of properties) {
      if (p.commune) set.add(p.commune);
    }
    return Array.from(set).sort();
  }, [properties]);

  // Precomputed KPIs in a single loop
  const kpis = useMemo(() => {
    const total = applicants.length;
    let approved = 0;
    let pending = 0;
    let scoreSum = 0;

    for (const a of applicants) {
      if (a.status === 'APROBADO') approved++;
      else if (a.status === 'PENDIENTE') pending++;
      scoreSum += (a.score || 0);
    }

    const avgScore = total > 0 ? Math.round(scoreSum / total) : 0;
    return { total, approved, pending, avgScore };
  }, [applicants]);

  const handleGenerateMockApplicants = () => {
    if (properties.length === 0) {
      notify("No hay propiedades disponibles. Ingrese propiedades antes de generar postulantes de prueba.", "warning");
      return;
    }

    const mockCandidates = [
      { name: "Sofía Martínez Valenzuela", taxId: "17.485.930-4", email: "sofia.martinez@gmail.com", phone: "+569 8745 1290", income: 2500000, status: "DEPENDIENTE" },
      { name: "Benjamín Silva Cáceres", taxId: "18.234.908-1", email: "benja.silva@yahoo.com", phone: "+569 9345 6112", income: 3200000, status: "DEPENDIENTE" },
      { name: "Camila Larraín Cruz", taxId: "16.122.990-2", email: "camila.cruz@outlook.com", phone: "+569 7712 3445", income: 4500000, status: "INDEPENDIENTE" },
      { name: "Matías Allende Rosselot", taxId: "15.845.221-K", email: "m.allende@allende.cl", phone: "+569 5144 8891", income: 5100050, status: "INDEPENDIENTE" },
      { name: "Catalina Fernández Prado", taxId: "19.340.583-9", email: "catalina.f@gmail.com", phone: "+569 8122 7744", income: 2800000, status: "DEPENDIENTE" },
      { name: "Sebastián Piñeyro Vergara", taxId: "14.223.119-2", email: "sebast.pineyro@gmail.com", phone: "+569 6611 2233", income: 3700000, status: "DEPENDIENTE" },
      { name: "Valentina Henríquez Rojas", taxId: "18.745.289-5", email: "v.henriquez@puc.cl", phone: "+569 9456 1234", income: 2900000, status: "DEPENDIENTE" },
      { name: "Ignacio Ossa Mackenna", taxId: "12.783.441-K", email: "iossa@omconsultores.cl", phone: "+569 4112 9900", income: 6200000, status: "INDEPENDIENTE" },
      { name: "Javiera Alcaíno Toro", taxId: "20.125.883-7", email: "javiera.alc@gmail.com", phone: "+569 7855 4422", income: 1800000, status: "DEPENDIENTE" },
      { name: "Gonzalo Bilbao Ugarte", taxId: "13.447.810-6", email: "g.bilbau@live.cl", phone: "+569 6321 8554", income: 3400000, status: "DEPENDIENTE" }
    ];

    const generatedApps: Applicant[] = mockCandidates.map((cand, idx) => {
      const property = properties[idx % properties.length];
      const rentAmount = property.rentalAmount || 1;
      const score = calculateScore(cand.income, cand.status || 'DEPENDIENTE', rentAmount);

      return {
        id: `app-demo-${idx}-${Date.now()}`,
        name: cand.name,
        taxId: cand.taxId,
        email: cand.email,
        phone: cand.phone,
        monthlyIncome: cand.income,
        employmentStatus: cand.status,
        propertyId: property.id,
        propertyLabel: `${property.building ? property.building + ' - ' : ''}Depto ${property.code} (${property.commune || 'S/C'})`,
        score: score,
        status: 'APROBADO',
        evaluatorObservations: 'Postulante calificado para pruebas de emisión de contratos. Aprobado de forma automática con score óptimo.',
        userCreator: currentUser || 'SISTEMA',
        timestamp: Date.now() + idx * 1000
      };
    });

    if (onBatchSave) {
      onBatchSave(generatedApps);
    } else {
      generatedApps.forEach(app => onSave(app));
    }

    setDemoBanner(true);
    setTimeout(() => {
      setDemoBanner(false);
    }, 5000);
  };

  const handleOpenNewForm = () => {
    setEditingApplicant(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (app: Applicant) => {
    setEditingApplicant(app);
    setIsFormOpen(true);
  };

  const handleQuickStatusChange = (app: Applicant, newStatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO') => {
    const updated: Applicant = {
      ...app,
      status: newStatus,
      userCreator: currentUser || 'SISTEMA'
    };
    onSave(updated);

    if (newStatus === 'APROBADO') {
      const property = propertyMap.get(app.propertyId);
      if (property && property.status !== 'DISPONIBLE') {
        notify('Postulante aprobado. Recordatorio: la unidad requiere emisión de Acta de Restitución antes de entrega formal.', 'info');
        return;
      }
      notify(`Postulante ${app.name} aprobado exitosamente.`, 'success');
    } else if (newStatus === 'RECHAZADO') {
      notify(`Postulante ${app.name} marcado como Rechazado.`, 'warning');
    } else {
      notify(`Postulante ${app.name} actualizado a estado Pendiente.`, 'info');
    }
  };

  // Enriched applicants with O(1) lookups and precomputed ratios for instant zero-lag rendering
  const enrichedApplicants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return applicants
      .filter(app => {
        const matchesStatus = filterStatus === 'ALL' || app.status === filterStatus;
        if (!matchesStatus) return false;
        if (!q) return true;
        const name = (app.name || '').toLowerCase();
        const taxId = (app.taxId || '').toLowerCase();
        const propLabel = (app.propertyLabel || '').toLowerCase();
        return name.includes(q) || taxId.includes(q) || propLabel.includes(q);
      })
      .map(app => {
        const matchedProperty = propertyMap.get(app.propertyId);
        const propInfo = matchedProperty ? propertyAvailabilityMap.get(matchedProperty.id) || null : null;
        const rent = matchedProperty?.rentalAmount || 0;
        const isOptimalRatio = rent > 0 ? (app.monthlyIncome / rent) >= 3.0 : false;
        const ratioDisplay = rent > 0 ? `${(app.monthlyIncome / rent).toFixed(1)}x canon` : 'Sin Razón';

        return {
          app,
          matchedProperty,
          propInfo,
          rent,
          isOptimalRatio,
          ratioDisplay
        };
      });
  }, [applicants, searchQuery, filterStatus, propertyMap, propertyAvailabilityMap]);

  // AssetFlow Enterprise Context Menu Handlers (60 FPS memoized callbacks)
  const handleRowContextMenu = useCallback((e: React.MouseEvent, app: Applicant) => {
    e.preventDefault();
    setGridContextMenu({
      x: e.clientX,
      y: e.clientY,
      applicant: app
    });
  }, []);

  const handleRowSelectorClick = useCallback((e: React.MouseEvent, app: Applicant) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setGridContextMenu({
      x: Math.round(rect.right + 2),
      y: Math.round(rect.top),
      applicant: app
    });
  }, []);

  const handleExportApplicantsExcel = useCallback(async () => {
    try {
      const dataToExport = enrichedApplicants.map(({ app, matchedProperty, propInfo, isOptimalRatio }) => ({
        'ID Postulación': app.id,
        'Nombre del Postulante': app.name,
        'RUT': app.taxId,
        'Correo': app.email,
        'Teléfono': app.phone,
        'Renta Líquida Mensual ($)': app.monthlyIncome,
        'Situación Laboral': app.employmentStatus,
        'Score Crediticio (0-100)': app.score,
        'Estado': app.status,
        'Inmueble Solicitado': app.propertyLabel,
        'Comuna': matchedProperty?.commune || 'S/C',
        'Canon Arriendo Requerido ($)': matchedProperty?.rentalAmount || 0,
        'Disponibilidad Inmueble': propInfo?.badgeText || 'N/A',
        'Cumple Razón 3x Renta': isOptimalRatio ? 'SÍ' : 'NO',
        'Observaciones del Evaluador': app.evaluatorObservations || '',
        'Usuario Evaluador': app.userCreator || 'SISTEMA',
        'Fecha Registro': app.createdAt ? new Date(app.createdAt).toLocaleString('es-CL') : ''
      }));

      await exportToExcel(
        dataToExport,
        `Postulaciones_JDE_P1501_${new Date().toISOString().split('T')[0]}`,
        'Postulantes_F1501'
      );
      notify("Planilla de postulantes exportada a Excel (.xlsx) exitosamente.", "success");
    } catch (err) {
      console.error("Error al exportar postulantes a Excel:", err);
      notify("Error al exportar datos a Excel.", "error");
    }
  }, [enrichedApplicants, notify]);

  // Download PDF Report for a single candidate (Lazy-loads jsPDF for ultra-fast module startup)
  const exportApplicantPDF = async (app: Applicant) => {
    try {
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF() as any;
      const margin = 20;

      // Headings and corporate logo
      if (companyLogo) {
        try {
          const format = companyLogo.toLowerCase().includes('png') ? 'PNG' : 
                         companyLogo.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
          doc.addImage(companyLogo, format, margin, 12, 35, 12, undefined, 'FAST');
        } catch (e) {
          try {
            doc.addImage(companyLogo, 'JPEG', margin, 12, 35, 12, undefined, 'FAST');
          } catch (e2) {}
        }
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 98, 51); // Green AssetFlow theme
      doc.text('REPORTE DE EVALUACIÓN DE POSTULANTE', margin, margin + 14);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Identificador de Evaluación: ${app.id}`, margin, margin + 22);
      doc.text(`Fecha de impresión: ${new Date().toLocaleString('es-CL')}`, margin, margin + 27);
      doc.text(`Usuario: ${currentUser || 'SISTEMA'}`, margin, margin + 32);

      // Context / Information Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, margin + 38, 170, 48, 3, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFontSize(10);
      doc.text('ANTECEDENTES DEL POSTULANTE', margin + 5, margin + 45);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51);
      doc.text(`Nombre Completo: ${app.name}`, margin + 5, margin + 52);
      doc.text(`RUT / Tax ID: ${app.taxId}`, margin + 5, margin + 58);
      doc.text(`Correo Electrónico: ${app.email}`, margin + 5, margin + 64);
      doc.text(`Teléfono: ${app.phone}`, margin + 5, margin + 70);
      doc.text(`Ingreso Líquido Mensual: $${app.monthlyIncome.toLocaleString('es-CL')}`, margin + 5, margin + 76);

      // Property Target & Credit Scoring Box
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, margin + 92, 170, 46, 3, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('DETALLE DE PROPIEDAD & PUNTAJE CREDITICIO', margin + 5, margin + 99);

      const pr = propertyMap.get(app.propertyId);
      const rentalRent = pr?.rentalAmount || 0;
      const ratio = rentalRent > 0 ? (app.monthlyIncome / rentalRent).toFixed(1) : 'S/I';

      doc.setFont('helvetica', 'normal');
      doc.text(`Propiedad de Interés: ${app.propertyLabel}`, margin + 5, margin + 107);
      doc.text(`Valor de Arriendo: $${rentalRent.toLocaleString('es-CL')}`, margin + 5, margin + 113);
      doc.text(`Ratio Ingreso / Arriendo: ${ratio} veces (Requerido: > 3.0 para menor riesgo)`, margin + 5, margin + 119);
      doc.text(`Estabilidad Laboral: ${app.employmentStatus}`, margin + 5, margin + 125);

      // Big Score Gauge
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(margin, margin + 144, 170, 28, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`PUNTAJE DE EVALUACIÓN CONTRA RIESGO: ${app.score}/100 PUNTOS`, margin + 8, margin + 154);
      
      let evaluationLabel = 'BAJO CUMPLIMIENTO / COMPLEJO';
      if (app.score >= 80) evaluationLabel = 'CUMPLIMIENTO EXCEPCIONAL (Riesgo Muy Bajo)';
      else if (app.score >= 60) evaluationLabel = 'Apto / Suficiente (Riesgo Moderado)';
      
      doc.setFontSize(9);
      doc.text(`Diagnóstico: ${evaluationLabel}`, margin + 8, margin + 162);

      // Final Status Indicator and observations
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.text('ESTADO DE LA EVALUACIÓN', margin, margin + 184);

      const statusMap = {
        'APROBADO': 'APROBADO (Pre-aprobado para contrato de Arriendo)',
        'PENDIENTE': 'EN ESTUDIO O REVISIÓN DE ANTECEDENTES',
        'RECHAZADO': 'RECHAZADO / NO APTO SEGÚN POLÍTICA'
      };

      doc.setFont('helvetica', 'bold');
      doc.text(`Estado Final: ${statusMap[app.status]}`, margin, margin + 192);

      doc.setFont('helvetica', 'normal');
      doc.text('Observaciones del Evaluador:', margin, margin + 200);
      
      const textLines = doc.splitTextToSize(app.evaluatorObservations || 'Sin observaciones registradas por el evaluador.', 170);
      doc.text(textLines, margin, margin + 206);

      const pageHeight = doc.internal.pageSize.height;
      doc.setDrawColor(200);
      doc.line(margin, pageHeight - 35, margin + 60, pageHeight - 35);
      doc.setFontSize(8);
      doc.text(`Firma y timbre evaluador`, margin, pageHeight - 30);
      doc.text(`Analista: ${app.userCreator}`, margin, pageHeight - 26);

      doc.save(`Ficha_Evaluacion_${app.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      notify("Ocurrió un error al generar el PDF del postulante.", "error");
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen text-slate-800 font-sans pb-16">
      {/* Banner de Cabecera */}
      <div className="bg-white border-b border-slate-100 px-8 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">
              Módulo Inmobiliario (P15013)
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-3">
              <Users className="text-emerald-500" size={32} />
              Evaluación y Pre-arriendo de Postulantes
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Cargue, evalúe y certifique la solvencia de solicitantes de arriendo para autorizar la creación de contratos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleGenerateMockApplicants}
              className="bg-indigo-600 text-white border border-indigo-700 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all hover:bg-indigo-700 hover:shadow-lg shadow-indigo-650/20 flex items-center gap-2 cursor-pointer"
            >
              <Award size={16} className="text-amber-400" />
              Generar 10 Aprobados (Demo)
            </button>
            <button 
              onClick={handleOpenNewForm}
              className="bg-emerald-600 text-white rounded-2xl px-6 py-3 text-xs font-bold uppercase transition-all hover:bg-emerald-700 hover:shadow-lg shadow-emerald-600/10 flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              Nuevo Postulante
            </button>
          </div>
        </div>

        {demoBanner && (
          <div className="max-w-7xl mx-auto mt-4 p-4 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle className="text-indigo-600" size={20} />
            <div className="text-xs font-bold uppercase">
              ¡Lote de Demo Exitoso! Se han creado <span className="underline font-black">10 postulantes con perfil Aprobado</span> y solvencia calificada. Listos para emitir contratos.
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Core Stats / KPI widgets */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 flex items-center gap-4 shadow-sm shadow-slate-100">
          <div className="bg-slate-50 text-slate-700 p-4 rounded-2xl">
            <Users size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{kpis.total}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Postulantes Totales</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 flex items-center gap-4 shadow-sm shadow-slate-100">
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-900">{kpis.approved}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aprobados (Aptos)</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 flex items-center gap-4 shadow-sm shadow-slate-100">
          <div className="bg-amber-50 text-amber-700 p-4 rounded-2xl">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-900">{kpis.pending}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Análisis Clínico</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 flex items-center gap-4 shadow-sm shadow-slate-100">
          <div className="bg-indigo-50 text-indigo-700 p-4 rounded-2xl animate-pulse">
            <Award size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-950">
              {kpis.avgScore}/100
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Puntaje Score Promedio</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-8">
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm shadow-slate-100">
          {/* Controls Bar */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <input 
                type="text" 
                placeholder="Buscar postulante, RUT o propiedad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-800"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>

            {/* Status Filter Tabs & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1.5 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                <button 
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${filterStatus === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setFilterStatus('PENDIENTE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${filterStatus === 'PENDIENTE' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Pendiente
                </button>
                <button 
                  onClick={() => setFilterStatus('APROBADO')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${filterStatus === 'APROBADO' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Aprobado
                </button>
                <button 
                  onClick={() => setFilterStatus('RECHAZADO')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${filterStatus === 'RECHAZADO' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Rechazado
                </button>
              </div>

              <button
                onClick={handleExportApplicantsExcel}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-2xl px-4 py-2 text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Exportar listado a Excel (.xlsx)"
              >
                <FileSpreadsheet size={15} className="text-emerald-700" />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* AssetFlow Enterprise Status & Fast Path Indicator */}
          <div className="px-6 py-2 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600 font-medium select-none">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>
                <strong>AssetFlow Enterprise (P1501 / F1501)</strong> — Clic derecho sobre cualquier fila o clic en el selector <span className="font-mono text-[#0B3C5D] font-bold">[ # ]</span> para abrir el Menú Contextual (Salidas de Fila, Estados, Ficha PDF, etc.).
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 hidden sm:block">
              Total Evaluados: <strong className="text-slate-800">{enrichedApplicants.length}</strong>
            </div>
          </div>

          {/* Records Table (Memoized to remain completely dormant while modal is open) */}
          <ApplicantTable
            enrichedApplicants={enrichedApplicants}
            onQuickStatusChange={handleQuickStatusChange}
            onEdit={handleOpenEditForm}
            onDelete={onDelete}
            onExportPDF={exportApplicantPDF}
            onRowContextMenu={handleRowContextMenu}
            onRowSelectorClick={handleRowSelectorClick}
            selectedApplicantId={gridContextMenu?.applicant.id}
          />
        </div>
      </div>

      {/* AssetFlow Enterprise Floating Grid Context Menu (Right Click & Row Selector Click) */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P1501"
          programTitle="Work With Tenant & Applicant Evaluations (F1501/F0101)"
          collectionName="applicants"
          recordKey={`${gridContextMenu.applicant.name} [${gridContextMenu.applicant.taxId}]`}
          recordData={gridContextMenu.applicant}
          currentStatus={gridContextMenu.applicant.status}
          statusOptions={[
            { label: 'APROBADO (Pre-aprobado Arriendo)', value: 'APROBADO', color: 'bg-emerald-600' },
            { label: 'PENDIENTE (En Evaluación)', value: 'PENDIENTE', color: 'bg-amber-600' },
            { label: 'RECHAZADO (No Apto)', value: 'RECHAZADO', color: 'bg-red-600' }
          ]}
          onUpdateStatus={async (newStatus) => {
            handleQuickStatusChange(gridContextMenu.applicant, newStatus as any);
            setGridContextMenu(null);
          }}
          onViewDetails={() => {
            handleOpenEditForm(gridContextMenu.applicant);
            setGridContextMenu(null);
          }}
          onEdit={() => {
            handleOpenEditForm(gridContextMenu.applicant);
            setGridContextMenu(null);
          }}
          onDelete={() => {
            if (window.confirm(`¿Confirma eliminar la postulación de ${gridContextMenu.applicant.name} (${gridContextMenu.applicant.taxId})?`)) {
              onDelete(gridContextMenu.applicant.id);
            }
            setGridContextMenu(null);
          }}
          onPrint={() => {
            exportApplicantPDF(gridContextMenu.applicant);
            setGridContextMenu(null);
          }}
          onExportExcel={() => {
            handleExportApplicantsExcel();
            setGridContextMenu(null);
          }}
          onClearQBE={() => {
            setSearchQuery('');
            setFilterStatus('ALL');
            setGridContextMenu(null);
          }}
          onRefresh={() => {
            notify("Listado de postulaciones sincronizado con la base de datos.", "info");
            setGridContextMenu(null);
          }}
          rowExits={[
            {
              id: 'exit_pdf',
              label: 'Generar Ficha PDF Acreditada (P15013)',
              icon: <Download size={12} className="text-emerald-700" />,
              shortcut: 'F4',
              onClick: () => {
                exportApplicantPDF(gridContextMenu.applicant);
              }
            },
            {
              id: 'exit_edit',
              label: 'Modificar Datos & Calificación de Solvencia',
              icon: <Edit3 size={12} className="text-indigo-700" />,
              shortcut: 'Ctrl+E',
              onClick: () => {
                handleOpenEditForm(gridContextMenu.applicant);
              }
            },
            {
              id: 'exit_copy_rut',
              label: 'Copiar RUT al Portapapeles',
              icon: <CheckSquare size={12} className="text-slate-600" />,
              shortcut: 'Ctrl+C',
              onClick: () => {
                navigator.clipboard?.writeText(gridContextMenu.applicant.taxId);
                notify(`RUT ${gridContextMenu.applicant.taxId} copiado al portapapeles.`, 'success');
              }
            },
            {
              id: 'exit_copy_contact',
              label: 'Copiar Datos de Contacto (Email & Fono)',
              icon: <User size={12} className="text-slate-600" />,
              onClick: () => {
                const info = `${gridContextMenu.applicant.name} - Email: ${gridContextMenu.applicant.email} | Tel: ${gridContextMenu.applicant.phone}`;
                navigator.clipboard?.writeText(info);
                notify('Información de contacto copiada al portapapeles.', 'success');
              }
            },
            {
              id: 'exit_inspect_prop',
              label: 'Inspeccionar Inmueble Solicitado (F1501)',
              icon: <Building2 size={12} className="text-amber-700" />,
              shortcut: 'F8',
              onClick: () => {
                const matched = propertyMap.get(gridContextMenu.applicant.propertyId);
                if (matched) {
                  notify(`Inmueble: ${matched.building || ''} ${matched.code || ''} (${matched.commune || ''}) - Renta base: ${formatCLP(matched.rentalAmount || 0)}`, 'info');
                } else {
                  notify(`Propiedad: ${gridContextMenu.applicant.propertyLabel || 'Sin asignar'}`, 'info');
                }
              }
            }
          ]}
          onClose={() => setGridContextMenu(null)}
        />
      )}

      {/* Form Dialog Modal (Isolated into its own component with 60fps local state & windowed dropdown) */}
      {isFormOpen && (
        <ApplicantFormModal
          key={editingApplicant?.id || 'new-applicant'}
          isOpen={isFormOpen}
          initialApplicant={editingApplicant}
          formPropertyOptions={formPropertyOptions}
          propertyMap={propertyMap}
          propertyAvailabilityMap={propertyAvailabilityMap}
          uniqueCommunes={uniqueCommunes}
          applicants={applicants}
          currentUser={currentUser}
          onClose={() => {
            setIsFormOpen(false);
            setEditingApplicant(null);
          }}
          onSave={onSave}
        />
      )}
    </div>
  );
};

export default ApplicantEvaluationModule;
