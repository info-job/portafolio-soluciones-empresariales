import React, { useState, useRef, useEffect } from 'react';
import {
  X, Building2, AlertCircle, ShieldCheck, CheckSquare, FileText, Printer,
  ArrowLeft, Save, CheckCircle2, MapPin, Users, Landmark, Sliders, Plus,
  Trash2, Upload, Eye, KeyRound, Layers, Sparkles, Lock, CreditCard,
  Zap, Droplets, Flame, Wifi, Building, Shield, ChevronRight, DollarSign,
  Calendar, Home, FileSpreadsheet
} from 'lucide-react';
import { Property, PropertyBasicServiceAccount, ChileanUtilityType } from '../types';
import {
  CHILE_TERRITORY_MASTER,
  UTILITY_SERVICES_CATALOG,
  getCommunesByRegionCode,
  getUtilityProvidersByRegionAndType,
  formatChileanPropertyRole
} from '../lib/chileanRealEstateMaster';
import { maskRUT, validateRUTDetailed } from '../lib/inputMasks';
import { printHtmlElement } from '../lib/printDocument';
import { DEFAULT_ASSETFLOW_SVG } from '../lib/defaultLogo';
import { formatCLP } from '../lib/chileanUtils';

interface PropertyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (property: Omit<Property, 'id'> | Property) => void | Promise<void>;
  initialProperty?: Property | null;
  existingProperties?: Property[];
  currentUser?: string;
  companyLogo?: string | null;
}

type ActiveTab = 'F1501' | 'F1502' | 'F1503' | 'F1504' | 'F1505';

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProperty = null,
  existingProperties = [],
  currentUser = 'SISTEMA',
  companyLogo = null
}) => {
  const isEditing = !!initialProperty;
  const [activeTab, setActiveTab] = useState<ActiveTab>('F1501');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const appraisalInputRef = useRef<HTMLInputElement>(null);

  // Generador de folio correlativo JDE para Activos Inmobiliarios (Formato: INM-150000)
  const defaultFolioCode = React.useMemo(() => {
    if (initialProperty?.code) return initialProperty.code;
    const count = existingProperties.length + 1;
    return `INM-${String(150000 + count).padStart(6, '0')}`;
  }, [initialProperty, existingProperties]);

  // ==========================================
  // ESTADO CENTRAL DEL FORMULARIO JDE (F1501 + F1502 + F1503 + F1504 + F1505)
  // ==========================================
  const [formData, setFormData] = useState({
    code: initialProperty?.code || defaultFolioCode,
    building: initialProperty?.building || '',
    conjunto: initialProperty?.conjunto || '',
    towerOrPhase: initialProperty?.towerOrPhase || '',
    floor: initialProperty?.floor || '1',
    address: initialProperty?.address || '',
    region: initialProperty?.region || 'RM',
    commune: initialProperty?.commune || 'SANTIAGO',
    type: (initialProperty?.type || 'DEPARTAMENTO') as Property['type'],
    owner: initialProperty?.owner || 'INVERSIONES E INMOBILIARIA ASSETFLOW SPA',
    ownerTaxId: initialProperty?.ownerTaxId || '76.458.921-3',
    propertyRole: initialProperty?.propertyRole || '',
    status: initialProperty?.status || 'OPERATIVO',
    occupancyStatus: initialProperty?.occupancyStatus || 'DISPONIBLE',

    // F1502 - Físicas & Avalúo
    surfaceAreaLand: initialProperty?.surfaceAreaLand || 0,
    surfaceAreaBuilt: initialProperty?.surfaceAreaBuilt || 0,
    constructionYear: initialProperty?.constructionYear || new Date().getFullYear(),
    destination: (initialProperty?.destination || 'HABITACIONAL') as Property['destination'],
    useType: (initialProperty?.useType || 'ARRIENDO') as Property['useType'],
    appraisalValue: initialProperty?.appraisalValue || 0,
    lastAppraisalDate: initialProperty?.lastAppraisalDate || '',
    appraisalDocumentUrl: initialProperty?.appraisalDocumentUrl || '',
    appraisalDocumentName: initialProperty?.appraisalDocumentName || '',

    // F1503 - Cánones & Comercial
    rentalAmount: initialProperty?.rentalAmount || 450000,
    rentalCurrency: (initialProperty?.rentalCurrency || 'CLP') as 'CLP' | 'UF',
    rentalPaymentDay: initialProperty?.rentalPaymentDay || 5,
    depositMonths: initialProperty?.depositMonths || 1,
    notes: initialProperty?.notes || '',

    // F1504 - Cuentas de Servicios Básicos
    basicServices: (initialProperty?.basicServices || [
      {
        id: 'svc-init-1',
        serviceType: 'LUZ',
        providerName: 'ENEL DISTRIBUCIÓN CHILE',
        clientNumber: '',
        meterNumber: '',
        isAutomaticDebit: false,
        notes: 'Medidor general departamento'
      },
      {
        id: 'svc-init-2',
        serviceType: 'AGUA',
        providerName: 'AGUAS ANDINAS',
        clientNumber: '',
        meterNumber: '',
        isAutomaticDebit: false,
        notes: 'Arranque sanitario independiente'
      }
    ]) as PropertyBasicServiceAccount[],

    // F1505 - Contabilidad & Finanzas
    businessUnit: '100-INMOB',
    acquisitionCostCLP: initialProperty?.financialData?.acquisitionCostCLP || 0,
    acquisitionCostUF: initialProperty?.financialData?.acquisitionCostUF || 0,
    ufAtAcquisition: initialProperty?.financialData?.ufAtAcquisition || 38000,
    acquisitionDate: initialProperty?.financialData?.acquisitionDate || new Date().toISOString().split('T')[0],
    usefulLifeMonths: initialProperty?.financialData?.usefulLifeMonths || 600,
    residualValueCLP: initialProperty?.financialData?.residualValueCLP || 0,
    accumulatedDepreciationCLP: initialProperty?.financialData?.accumulatedDepreciationCLP || 0,
    currentBookValueCLP: initialProperty?.financialData?.currentBookValueCLP || 0
  });

  // Lista de comunas dependientes de la región seleccionada
  const availableCommunes = React.useMemo(() => {
    return getCommunesByRegionCode(formData.region);
  }, [formData.region]);

  // Si la comuna actual no pertenece a la nueva región seleccionada, auto-asignar la primera válida
  useEffect(() => {
    if (availableCommunes.length > 0 && !availableCommunes.includes(formData.commune.toUpperCase())) {
      setFormData(prev => ({ ...prev, commune: availableCommunes[0] }));
    }
  }, [formData.region, availableCommunes]);

  // ==========================================
  // ESTADO TEMPORAL PARA AGREGAR NUEVO SERVICIO BÁSICO EN TAB F1504
  // ==========================================
  const [newServiceType, setNewServiceType] = useState<ChileanUtilityType>('LUZ');
  const [newServiceProvider, setNewServiceProvider] = useState<string>('');
  const [newServiceClientNumber, setNewServiceClientNumber] = useState<string>('');
  const [newServiceMeterNumber, setNewServiceMeterNumber] = useState<string>('');
  const [newServiceAutoDebit, setNewServiceAutoDebit] = useState<boolean>(false);
  const [newServiceNotes, setNewServiceNotes] = useState<string>('');

  // Proveedores dependientes de la Región y del Tipo de Servicio
  const availableProvidersForNewService = React.useMemo(() => {
    return getUtilityProvidersByRegionAndType(formData.region, newServiceType);
  }, [formData.region, newServiceType]);

  // Inicializar o ajustar el proveedor predeterminado al cambiar servicio o región
  useEffect(() => {
    if (availableProvidersForNewService.length > 0) {
      if (!newServiceProvider || !availableProvidersForNewService.includes(newServiceProvider)) {
        setNewServiceProvider(availableProvidersForNewService[0]);
      }
    }
  }, [availableProvidersForNewService, newServiceProvider]);

  // Handlers para agregar y eliminar cuentas de servicios
  const handleAddServiceAccount = () => {
    if (!newServiceClientNumber.trim()) {
      alert('Por favor ingrese el Número de Cliente o Identificador de Suministro del servicio básico.');
      return;
    }

    const newAccount: PropertyBasicServiceAccount = {
      id: `svc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      serviceType: newServiceType,
      providerName: newServiceProvider || availableProvidersForNewService[0] || 'PROVEEDOR GENERAL',
      clientNumber: newServiceClientNumber.trim(),
      meterNumber: newServiceMeterNumber.trim() || undefined,
      isAutomaticDebit: newServiceAutoDebit,
      notes: newServiceNotes.trim() || undefined
    };

    setFormData(prev => ({
      ...prev,
      basicServices: [...prev.basicServices, newAccount]
    }));

    // Resetear formulario de inserción rápida
    setNewServiceClientNumber('');
    setNewServiceMeterNumber('');
    setNewServiceNotes('');
    setNewServiceAutoDebit(false);
  };

  const handleRemoveServiceAccount = (id: string) => {
    setFormData(prev => ({
      ...prev,
      basicServices: prev.basicServices.filter(s => s.id !== id)
    }));
  };

  // Manejo de archivo de tasación
  const handleFileAppraisalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          appraisalDocumentUrl: reader.result as string,
          appraisalDocumentName: file.name
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Guardar en la base de datos
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.building.trim()) {
      setActiveTab('F1501');
      alert('El Nombre de la Propiedad, Edificio o Denominación es obligatorio.');
      return;
    }

    if (!formData.address.trim()) {
      setActiveTab('F1501');
      alert('La Dirección Física particular del inmueble es obligatoria.');
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        ...(initialProperty?.id ? { id: initialProperty.id } : {}),
        code: formData.code.trim().toUpperCase(),
        building: formData.building.trim().toUpperCase(),
        conjunto: formData.conjunto.trim() ? formData.conjunto.trim().toUpperCase() : 'INMUEBLE INDIVIDUAL / SIN CONJUNTO',
        towerOrPhase: formData.towerOrPhase.trim() ? formData.towerOrPhase.trim().toUpperCase() : undefined,
        floor: formData.floor.trim() || '1',
        address: formData.address.trim(),
        region: formData.region.trim().toUpperCase(),
        commune: formData.commune.trim().toUpperCase(),
        type: formData.type,
        owner: formData.owner.trim().toUpperCase(),
        ownerTaxId: formData.ownerTaxId.trim(),
        propertyRole: formData.propertyRole.trim() ? formatChileanPropertyRole(formData.propertyRole) : undefined,
        status: formData.status,
        occupancyStatus: formData.occupancyStatus,
        surfaceAreaLand: Number(formData.surfaceAreaLand) || 0,
        surfaceAreaBuilt: Number(formData.surfaceAreaBuilt) || 0,
        constructionYear: Number(formData.constructionYear) || new Date().getFullYear(),
        destination: formData.destination,
        useType: formData.useType,
        appraisalValue: Number(formData.appraisalValue) || 0,
        lastAppraisalDate: formData.lastAppraisalDate || undefined,
        appraisalDocumentUrl: formData.appraisalDocumentUrl || undefined,
        appraisalDocumentName: formData.appraisalDocumentName || undefined,
        rentalAmount: Number(formData.rentalAmount) || 0,
        rentalCurrency: formData.rentalCurrency,
        rentalPaymentDay: Number(formData.rentalPaymentDay) || 5,
        depositMonths: Number(formData.depositMonths) || 1,
        basicServices: formData.basicServices,
        notes: formData.notes.trim() || undefined,
        financialData: {
          acquisitionCostCLP: Number(formData.acquisitionCostCLP) || 0,
          acquisitionCostUF: Number(formData.acquisitionCostUF) || 0,
          acquisitionDate: formData.acquisitionDate,
          usefulLifeMonths: Number(formData.usefulLifeMonths) || 600,
          residualValueCLP: Number(formData.residualValueCLP) || 0,
          accumulatedDepreciationCLP: Number(formData.accumulatedDepreciationCLP) || 0,
          currentBookValueCLP: Number(formData.currentBookValueCLP) || Number(formData.acquisitionCostCLP) || 0,
          ufAtAcquisition: Number(formData.ufAtAcquisition) || 38000
        }
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Error guardando propiedad:', err);
      alert('Ocurrió un error al guardar la propiedad en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
      <div className="bg-[#f8fafc] w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* ========================================================= */}
        {/* ENCABEZADO SUPERIOR ESTILO ASSETFLOW ENTERPRISE ERP       */}
        {/* ========================================================= */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between border-b-2 border-emerald-500 shadow-md gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-xl">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded font-mono">
                  P15012 · W15012A
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  AssetFlow RE-15 Real Estate Property Master
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                {isEditing ? `Modificación de Propiedad: ${formData.code}` : 'Nueva Propiedad & Definición de Cánones y Servicios'}
              </h2>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN DE ENCABEZADO (OK / CANCEL / PRINT / PREVIEW) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold uppercase transition-all shadow-xs cursor-pointer"
              title="Previsualizar Ficha Técnica del Inmueble"
            >
              <Eye size={14} className="text-indigo-400" />
              <span className="hidden sm:inline">Vista Previa</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase rounded-lg shadow-md transition-all border border-emerald-400 cursor-pointer disabled:opacity-50"
              title="Guardar Propiedad en la Base de Datos (Enter / OK)"
            >
              <CheckCircle2 size={15} />
              <span>{isSaving ? 'Guardando...' : 'Aceptar (OK)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
              title="Cancelar y Salir (Esc)"
            >
              <X size={15} />
              <span className="hidden sm:inline">Cancelar</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BARRA DE PESTAÑAS (TABS) TIPO JDE ERP */}
        {/* ========================================================= */}
        <div className="bg-slate-100 border-b border-slate-300 px-6 pt-2 flex items-center gap-1 overflow-x-auto text-xs font-bold select-none">
          <button
            type="button"
            onClick={() => setActiveTab('F1501')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all border-t border-x cursor-pointer ${
              activeTab === 'F1501'
                ? 'bg-white border-slate-300 border-b-transparent text-emerald-800 font-black shadow-xs -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <MapPin size={14} className={activeTab === 'F1501' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>F1501 · Jerarquía & Dirección</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('F1502')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all border-t border-x cursor-pointer ${
              activeTab === 'F1502'
                ? 'bg-white border-slate-300 border-b-transparent text-emerald-800 font-black shadow-xs -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Home size={14} className={activeTab === 'F1502' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>F1502 · Superficies & ROL SII</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('F1503')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all border-t border-x cursor-pointer ${
              activeTab === 'F1503'
                ? 'bg-white border-slate-300 border-b-transparent text-emerald-800 font-black shadow-xs -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <DollarSign size={14} className={activeTab === 'F1503' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>F1503 · Cánones de Arriendo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('F1504')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all border-t border-x cursor-pointer ${
              activeTab === 'F1504'
                ? 'bg-white border-slate-300 border-b-transparent text-emerald-800 font-black shadow-xs -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Zap size={14} className={activeTab === 'F1504' ? 'text-amber-500' : 'text-slate-400'} />
            <span>F1504 · Servicios Básicos ({formData.basicServices.length})</span>
            {formData.basicServices.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-black">
                {formData.basicServices.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('F1505')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all border-t border-x cursor-pointer ${
              activeTab === 'F1505'
                ? 'bg-white border-slate-300 border-b-transparent text-emerald-800 font-black shadow-xs -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Landmark size={14} className={activeTab === 'F1505' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>F1505 · Contabilidad & MCU</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* CUERPO DEL FORMULARIO CON PESTAÑAS (TAB CONTENT) */}
        {/* ========================================================= */}
        <div className="flex-1 p-6 overflow-y-auto bg-white min-h-[460px]">

          {/* ------------------------------------------------------------- */}
          {/* TAB F1501: JERARQUÍA TERRITORIAL & IDENTIFICACIÓN INMOBILIARIA */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'F1501' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
                <MapPin className="text-emerald-700 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-emerald-950">
                  <p className="font-black uppercase tracking-wider mb-0.5">Jerarquía Territorial y Ubicación (De Mayor a Menor)</p>
                  <p className="text-slate-600">
                    Estructura normalizada: <strong>Región</strong> (División administrativa mayor) $\rightarrow$ <strong>Comuna</strong> (Municipio) $\rightarrow$ <strong>Conjunto Habitacional / Condominio</strong> $\rightarrow$ <strong>Inmueble / Unidad Particular</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Folio / Código JDE */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase flex items-center justify-between">
                    <span>Código de Activo / Folio JDE</span>
                    <span className="text-[9px] text-emerald-700 font-mono">MCU-P1501</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 uppercase focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="Ej: INM-150042 o DEP-304"
                  />
                </div>

                {/* NIVEL 1: REGIÓN DE CHILE */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-emerald-900 uppercase flex items-center gap-1">
                    <span>[Nivel 1] Región Administrativa *</span>
                  </label>
                  <select
                    value={formData.region}
                    onChange={e => setFormData({ ...formData, region: e.target.value })}
                    className="w-full bg-emerald-50/40 border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                  >
                    {CHILE_TERRITORY_MASTER.map(r => (
                      <option key={r.code} value={r.code}>
                        {r.code} · {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* NIVEL 2: COMUNA DE CHILE (DEPENDIENTE DE REGIÓN) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-emerald-900 uppercase flex items-center justify-between">
                    <span>[Nivel 2] Comuna *</span>
                    <span className="text-[9px] text-emerald-600 font-bold">{availableCommunes.length} Comunas</span>
                  </label>
                  <select
                    value={formData.commune}
                    onChange={e => setFormData({ ...formData, commune: e.target.value })}
                    className="w-full bg-emerald-50/40 border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                  >
                    {availableCommunes.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* NIVEL 3: CONJUNTO HABITACIONAL / CONDOMINIO */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase flex items-center justify-between">
                    <span>[Nivel 3] Conjunto Habitacional / Condominio / Complejo</span>
                    <span className="text-[9px] text-slate-400 font-normal">Si es casa aislada, dejar "Inmueble Individual"</span>
                  </label>
                  <input
                    type="text"
                    value={formData.conjunto}
                    onChange={e => setFormData({ ...formData, conjunto: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="Ej: Condominio Los Robles, Edificio Nueva Las Condes, Conjunto Parque Almagro"
                  />
                </div>

                {/* SUB-DIVISIÓN: TORRE, ETAPA O BLOQUE */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Torre / Etapa / Bloque (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.towerOrPhase}
                    onChange={e => setFormData({ ...formData, towerOrPhase: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="Ej: Torre Oriente / Etapa II"
                  />
                </div>

                {/* NIVEL 4: NOMBRE O DENOMINACIÓN DEL INMUEBLE */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Denominación / Edificio Base *
                  </label>
                  <input
                    type="text"
                    value={formData.building}
                    onChange={e => setFormData({ ...formData, building: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="Ej: Edificio San Cristóbal o Casa 14"
                  />
                </div>

                {/* PISO / NIVEL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Piso / Nivel
                  </label>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={e => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="Ej: Piso 4 o Subterráneo -1"
                  />
                </div>

                {/* TIPO DE INMUEBLE */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Tipo de Estructura / Inmueble *
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as Property['type'] })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                  >
                    <option value="DEPARTAMENTO">DEPARTAMENTO</option>
                    <option value="CASA">CASA / CHALET</option>
                    <option value="OFICINA">OFICINA COMERCIAL</option>
                    <option value="LOCAL">LOCAL COMERCIAL</option>
                    <option value="BODEGA">BODEGA</option>
                    <option value="ESTACIONAMIENTO">ESTACIONAMIENTO</option>
                  </select>
                </div>

                {/* DIRECCIÓN PARTICULAR COMPLETA */}
                <div className="space-y-1 md:col-span-3">
                  <label className="text-[11px] font-black text-slate-700 uppercase flex items-center justify-between">
                    <span>[Nivel 4] Dirección Física Particular del Inmueble *</span>
                    <span className="text-[9px] text-slate-400">Calle, número particular, depto/oficina</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none uppercase"
                    placeholder="Ej: AV. APOQUINDO 4500, DEPTO 502, LAS CONDES"
                  />
                </div>

                {/* PROPIETARIO & RUT */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Razón Social / Propietario Legal
                  </label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={e => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none uppercase"
                    placeholder="Ej: ASSETFLOW INMOBILIARIA SPA"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    RUT del Propietario
                  </label>
                  <input
                    type="text"
                    value={formData.ownerTaxId}
                    onChange={e => setFormData({ ...formData, ownerTaxId: maskRUT(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="Ej: 76.458.921-3"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB F1502: SUPERFICIES, AVALÚO & ROL SII                      */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'F1502' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-3">
                <FileText className="text-slate-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-slate-700">
                  <p className="font-black uppercase tracking-wider mb-0.5">Ficha Técnica, Rol de Avalúo y Tasaciones</p>
                  <p className="text-slate-500">
                    Parámetros normativos del SII y la CMF (Norma Carácter General CMF B.4 y B.13).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* ROL DE AVALÚO FISCAL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase flex items-center justify-between">
                    <span>ROL de Avalúo Fiscal SII</span>
                    <span className="text-[9px] text-indigo-600 font-mono">Manzana-Predio</span>
                  </label>
                  <input
                    type="text"
                    value={formData.propertyRole}
                    onChange={e => setFormData({ ...formData, propertyRole: formatChileanPropertyRole(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-black text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="Ej: 14205-0012"
                  />
                </div>

                {/* DESTINO TRIBUTARIO SII */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Destino Tributario SII
                  </label>
                  <select
                    value={formData.destination}
                    onChange={e => setFormData({ ...formData, destination: e.target.value as Property['destination'] })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                  >
                    <option value="HABITACIONAL">HABITACIONAL (Exento de IVA)</option>
                    <option value="NO_HABITACIONAL">NO HABITACIONAL / COMERCIAL (Afecto a IVA)</option>
                  </select>
                </div>

                {/* USO OPERACIONAL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Uso Autorizado
                  </label>
                  <select
                    value={formData.useType}
                    onChange={e => setFormData({ ...formData, useType: e.target.value as Property['useType'] })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                  >
                    <option value="ARRIENDO">ARRIENDO A TERCEROS</option>
                    <option value="PROPIO">USO PROPIO / ADMINISTRATIVO</option>
                    <option value="MIXTO">USO MIXTO</option>
                  </select>
                </div>

                {/* SUPERFICIE TERRENO */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Sup. Terreno (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.surfaceAreaLand || ''}
                    onChange={e => setFormData({ ...formData, surfaceAreaLand: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="0.00"
                  />
                </div>

                {/* SUPERFICIE CONSTRUIDA */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Sup. Construida Útil (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.surfaceAreaBuilt || ''}
                    onChange={e => setFormData({ ...formData, surfaceAreaBuilt: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="0.00"
                  />
                </div>

                {/* AÑO DE CONSTRUCCIÓN */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Año de Construcción
                  </label>
                  <input
                    type="number"
                    value={formData.constructionYear || ''}
                    onChange={e => setFormData({ ...formData, constructionYear: parseInt(e.target.value) || 2020 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="Ej: 2022"
                  />
                </div>

                {/* AVALÚO FISCAL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Valor Tasación Comercial (CLP)
                  </label>
                  <input
                    type="number"
                    value={formData.appraisalValue || ''}
                    onChange={e => setFormData({ ...formData, appraisalValue: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="0"
                  />
                </div>

                {/* FECHA TASACIÓN */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Fecha Última Tasación
                  </label>
                  <input
                    type="date"
                    value={formData.lastAppraisalDate}
                    onChange={e => setFormData({ ...formData, lastAppraisalDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none cursor-pointer"
                  />
                </div>

                {/* ADJUNTO DE TASACIÓN / CERTIFICADO */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Copia Digital Tasación / Certificado
                  </label>
                  <input
                    type="file"
                    ref={appraisalInputRef}
                    onChange={handleFileAppraisalUpload}
                    accept="application/pdf,image/*"
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => appraisalInputRef.current?.click()}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload size={14} />
                      <span className="truncate">{formData.appraisalDocumentName || 'Subir PDF'}</span>
                    </button>
                    {formData.appraisalDocumentUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, appraisalDocumentUrl: '', appraisalDocumentName: '' })}
                        className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg border border-rose-200"
                        title="Quitar archivo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB F1503: CONDICIONES COMERCIALES & CÁNONES DE ARRIENDO       */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'F1503' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-xl flex items-start gap-3">
                <DollarSign className="text-indigo-700 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-indigo-950">
                  <p className="font-black uppercase tracking-wider mb-0.5">Condiciones Comerciales y Canon de Arriendo Base</p>
                  <p className="text-slate-600">
                    Definición del canon de arrendamiento base, moneda contractual (CLP o UF), día de corte/vencimiento mensual y estado de ocupación.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* CANON BASE */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase flex items-center justify-between">
                    <span>Canon de Arriendo Base *</span>
                    <span className="text-[9px] text-emerald-600 font-bold">Mensual</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={formData.rentalCurrency === 'UF' ? '0.01' : '1000'}
                      value={formData.rentalAmount || ''}
                      onChange={e => setFormData({ ...formData, rentalAmount: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-12 py-2 text-xs font-mono font-black text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                      placeholder="0"
                    />
                    <div className="absolute right-3 top-2 text-xs font-bold text-slate-400 font-mono">
                      {formData.rentalCurrency}
                    </div>
                  </div>
                </div>

                {/* MONEDA DE CONTRATO */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Moneda Contractual *
                  </label>
                  <select
                    value={formData.rentalCurrency}
                    onChange={e => setFormData({ ...formData, rentalCurrency: e.target.value as 'CLP' | 'UF' })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                  >
                    <option value="CLP">PESOS CHILENOS ($ CLP)</option>
                    <option value="UF">UNIDADES DE FOMENTO (UF)</option>
                  </select>
                </div>

                {/* DÍA DE PAGO */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Día de Vencimiento / Pago Mensual
                  </label>
                  <select
                    value={formData.rentalPaymentDay}
                    onChange={e => setFormData({ ...formData, rentalPaymentDay: parseInt(e.target.value) || 5 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                  >
                    {[1, 5, 10, 15, 20, 25, 28, 30].map(d => (
                      <option key={d} value={d}>
                        Día {d} de cada mes
                      </option>
                    ))}
                  </select>
                </div>

                {/* MESES DE GARANTÍA */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Garantía Requerida (Meses de Canon)
                  </label>
                  <select
                    value={formData.depositMonths}
                    onChange={e => setFormData({ ...formData, depositMonths: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                  >
                    <option value="1">1 Mes de Garantía</option>
                    <option value="2">2 Meses de Garantía</option>
                    <option value="3">3 Meses de Garantía</option>
                  </select>
                </div>

                {/* ESTADO DE OCUPACIÓN */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Estado de Ocupación
                  </label>
                  <select
                    value={formData.occupancyStatus}
                    onChange={e => setFormData({ ...formData, occupancyStatus: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                  >
                    <option value="DISPONIBLE">DISPONIBLE PARA ARRIENDO</option>
                    <option value="ARRENDADO">ARRENDADO CON CONTRATO VIGENTE</option>
                    <option value="EN_MANTENCION">EN MANTENCIÓN / REPARACIÓN</option>
                    <option value="EN_RESERVA">EN RESERVA / EVALUACIÓN</option>
                    <option value="USO_PROPIO">USO PROPIO</option>
                  </select>
                </div>

                {/* ESTADO OPERACIONAL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Condición Operativa
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                  >
                    <option value="OPERATIVO">OPERATIVO 100%</option>
                    <option value="REMODELACION">EN REMODELACIÓN</option>
                    <option value="DESOCUPADO">DESOCUPADO / ENTREGA</option>
                    <option value="BLOQUEADO">BLOQUEADO POR SINIESTRO / LITIGIO</option>
                  </select>
                </div>

                {/* OBSERVACIONES COMERCIALES */}
                <div className="space-y-1 md:col-span-3">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Observaciones y Cláusulas Comerciales Particulares
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:bg-white outline-none resize-none"
                    placeholder="Indique condiciones especiales: prohibición de mascotas, subarrendamiento, estacionamiento incluido, etc."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB F1504: SERVICIOS BÁSICOS CON LISTAS DEPENDIENTES REGIONALES */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'F1504' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <Zap className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-amber-950">
                  <p className="font-black uppercase tracking-wider mb-0.5">
                    Servicios Básicos & Proveedores Estandarizados por Región
                  </p>
                  <p className="text-slate-600">
                    Las empresas proveedoras se filtran automáticamente de acuerdo con la <strong>Región ({formData.region})</strong> seleccionada en la ficha del inmueble. Ingrese el número de cliente, medidor y active si corresponde a pago automático (PAT/PAC).
                  </p>
                </div>
              </div>

              {/* PANEL DE INSERCIÓN RÁPIDA DE SERVICIO BÁSICO */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
                    <Plus size={14} className="text-emerald-600" />
                    <span>Vincular Nueva Cuenta de Suministro / Servicio Básico</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Región de emplazamiento: <strong className="text-emerald-700">{formData.region}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* SELECTOR 1: TIPO DE SERVICIO BÁSICO */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 uppercase">
                      1. Tipo de Servicio *
                    </label>
                    <select
                      value={newServiceType}
                      onChange={e => setNewServiceType(e.target.value as ChileanUtilityType)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                    >
                      {UTILITY_SERVICES_CATALOG.map(s => (
                        <option key={s.type} value={s.type}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SELECTOR 2: EMPRESA PROVEEDORA (DEPENDIENTE DE REGIÓN + TIPO) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-emerald-900 uppercase flex items-center justify-between">
                      <span>2. Empresa Proveedora *</span>
                      <span className="text-[9px] text-emerald-600 font-mono">Según {formData.region}</span>
                    </label>
                    <select
                      value={newServiceProvider}
                      onChange={e => setNewServiceProvider(e.target.value)}
                      className="w-full bg-emerald-50/40 border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                    >
                      {availableProvidersForNewService.map(p => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* INPUT 3: NÚMERO DE CLIENTE / IDENTIFICADOR DE SUMINISTRO */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 uppercase">
                      3. N° de Cliente / Cuenta / ID Suministro *
                    </label>
                    <input
                      type="text"
                      value={newServiceClientNumber}
                      onChange={e => setNewServiceClientNumber(e.target.value)}
                      placeholder="Ej: 1234567-8"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-600 outline-none uppercase"
                    />
                  </div>

                  {/* INPUT 4: N° DE MEDIDOR FÍSICO */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 uppercase">
                      4. N° Medidor Físico (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newServiceMeterNumber}
                      onChange={e => setNewServiceMeterNumber(e.target.value)}
                      placeholder="Ej: MED-998821"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-600 outline-none uppercase"
                    />
                  </div>

                  {/* OBSERVACIÓN O UBICACIÓN DEL MEDIDOR */}
                  <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase">
                      Observación / Ubicación de Arranque o Marcador
                    </label>
                    <input
                      type="text"
                      value={newServiceNotes}
                      onChange={e => setNewServiceNotes(e.target.value)}
                      placeholder="Ej: Shaft pasillo piso 5, llave de paso independiente"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-600 outline-none"
                    />
                  </div>

                  {/* CHECKBOX PAT/PAC & BOTÓN AGREGAR */}
                  <div className="flex items-center justify-between sm:col-span-2 lg:col-span-1 gap-2 pt-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={newServiceAutoDebit}
                        onChange={e => setNewServiceAutoDebit(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>PAT / PAC</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddServiceAccount}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* LISTA / GRILLA INTERACTIVA DE CUENTAS VINCULADAS */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-700">
                    Cuentas de Servicios Básicos Registradas para este Inmueble
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    Total: {formData.basicServices.length} registros
                  </span>
                </div>

                {formData.basicServices.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-medium">
                    No se han registrado cuentas de servicios básicos para este inmueble todavía. Utilice el panel superior para asociar suministros.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                          <th className="p-2.5 pl-4">Tipo de Servicio</th>
                          <th className="p-2.5">Empresa Proveedora</th>
                          <th className="p-2.5">N° Cliente / Cuenta</th>
                          <th className="p-2.5">N° Medidor</th>
                          <th className="p-2.5">Pago Auto (PAT)</th>
                          <th className="p-2.5">Observación</th>
                          <th className="p-2.5 pr-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {formData.basicServices.map(svc => {
                          const meta = UTILITY_SERVICES_CATALOG.find(m => m.type === svc.serviceType);
                          return (
                            <tr key={svc.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-2.5 pl-4 font-bold text-slate-800 flex items-center gap-2">
                                {svc.serviceType === 'LUZ' && <Zap size={14} className="text-amber-500" />}
                                {svc.serviceType === 'AGUA' && <Droplets size={14} className="text-blue-500" />}
                                {svc.serviceType === 'GAS' && <Flame size={14} className="text-orange-500" />}
                                {svc.serviceType === 'INTERNET' && <Wifi size={14} className="text-purple-500" />}
                                {svc.serviceType === 'GASTO_COMUN' && <Building size={14} className="text-emerald-500" />}
                                {svc.serviceType === 'SEGURIDAD' && <Shield size={14} className="text-red-500" />}
                                {svc.serviceType === 'OTRO' && <Sliders size={14} className="text-slate-500" />}
                                <span>{meta?.label || svc.serviceType}</span>
                              </td>
                              <td className="p-2.5 font-bold text-emerald-800">
                                {svc.providerName}
                              </td>
                              <td className="p-2.5 font-mono font-black text-slate-900 bg-slate-50/80 px-2 rounded">
                                {svc.clientNumber}
                              </td>
                              <td className="p-2.5 font-mono text-slate-600">
                                {svc.meterNumber || '---'}
                              </td>
                              <td className="p-2.5">
                                {svc.isAutomaticDebit ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded-full">
                                    PAT ACTIVO
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold uppercase rounded-full">
                                    PAGO MANUAL
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-slate-500 text-[11px] truncate max-w-xs">
                                {svc.notes || '-'}
                              </td>
                              <td className="p-2.5 pr-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveServiceAccount(svc.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Eliminar cuenta de servicio"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB F1505: CONTABILIDAD, CENTRO DE COSTOS (MCU) & DEPRECIACIÓN */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'F1505' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-xl flex items-start gap-3">
                <Landmark className="text-indigo-700 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-indigo-950">
                  <p className="font-black uppercase tracking-wider mb-0.5">Integración Contable & Centro de Costos (MCU)</p>
                  <p className="text-slate-600">
                    Control de Activo Fijo, Costos de Adquisición en CLP/UF, Vida Útil para Depreciación y Valor Libros para balances financieros.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* UNIDAD DE NEGOCIO MCU */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Unidad de Negocio JDE (MCU)
                  </label>
                  <select
                    value={formData.businessUnit}
                    onChange={e => setFormData({ ...formData, businessUnit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                  >
                    <option value="100-INMOB">100-INMOB · División Activos Inmobiliarios y Renta</option>
                    <option value="200-MANT">200-MANT · Obras y Mantención</option>
                    <option value="300-ADMIN">300-ADMIN · Administración Central</option>
                  </select>
                </div>

                {/* COSTO ADQUISICIÓN CLP */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Costo de Adquisición (CLP)
                  </label>
                  <input
                    type="number"
                    value={formData.acquisitionCostCLP || ''}
                    onChange={e => setFormData({ ...formData, acquisitionCostCLP: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="0"
                  />
                </div>

                {/* COSTO ADQUISICIÓN UF */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Costo de Adquisición (UF)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.acquisitionCostUF || ''}
                    onChange={e => setFormData({ ...formData, acquisitionCostUF: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="0.00"
                  />
                </div>

                {/* FECHA ADQUISICIÓN */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Fecha de Escrituración / Compra
                  </label>
                  <input
                    type="date"
                    value={formData.acquisitionDate}
                    onChange={e => setFormData({ ...formData, acquisitionDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none cursor-pointer"
                  />
                </div>

                {/* VIDA ÚTIL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Vida Útil Contable (Meses)
                  </label>
                  <input
                    type="number"
                    value={formData.usefulLifeMonths || ''}
                    onChange={e => setFormData({ ...formData, usefulLifeMonths: parseInt(e.target.value) || 600 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="600"
                  />
                </div>

                {/* VALOR RESIDUAL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    Valor Residual (CLP)
                  </label>
                  <input
                    type="number"
                    value={formData.residualValueCLP || ''}
                    onChange={e => setFormData({ ...formData, residualValueCLP: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-600 focus:bg-white outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* PIE DE PÁGINA (FOOTER) CON RESUMEN Y BOTONES DE CIERRE     */}
        {/* ========================================================= */}
        <div className="bg-slate-100 border-t border-slate-300 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="font-bold uppercase text-[10px]">Jerarquía Activa:</span>
            <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px] font-mono text-slate-800">
              {formData.region} &gt; {formData.commune} &gt; {formData.conjunto || 'Sin Conjunto'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold uppercase transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase rounded-lg shadow-md transition-all flex items-center gap-2 border border-emerald-500 disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSaving ? 'Guardando en Base de Datos...' : isEditing ? 'Guardar Cambios' : 'Registrar Propiedad'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL DE VISTA PREVIA IMPRIMIBLE DE LA FICHA MAESTRA JDE */}
      {/* ========================================================= */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-xs flex flex-col p-4 overflow-hidden animate-in fade-in">
          <div className="bg-white rounded-t-xl p-4 border-b border-slate-200 flex items-center justify-between max-w-4xl mx-auto w-full shadow-md">
            <div className="flex items-center gap-2">
              <Printer className="text-emerald-600" size={18} />
              <h3 className="text-sm font-black uppercase text-slate-800">
                Ficha Técnica JDE RE-15 · {formData.code}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => printHtmlElement('jde-property-sheet', `Ficha_JDE_${formData.code}`)}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-emerald-500 flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={14} />
                <span>Imprimir Ficha</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-200 p-6 flex justify-center max-w-4xl mx-auto w-full rounded-b-xl shadow-2xl">
            <div id="jde-property-sheet" className="bg-white p-8 w-full max-w-3xl border border-slate-300 text-slate-900 font-sans shadow-lg space-y-6">
              {/* Header Ficha */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div className="flex items-center gap-4">
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="w-16 h-16 object-contain" />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} className="w-16 h-16" />
                  )}
                  <div>
                    <h1 className="text-lg font-black uppercase tracking-tight text-slate-900">
                      Ficha Maestra de Propiedad & Cánones
                    </h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      AssetFlow Enterprise · Módulo RE-15 Real Estate
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <p className="font-black text-emerald-700">Folio: {formData.code}</p>
                  <p className="text-[10px] text-slate-500">Fecha: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Jerarquía */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-lg text-xs">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Región</p>
                  <p className="font-black text-slate-800">{formData.region}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Comuna</p>
                  <p className="font-black text-slate-800">{formData.commune}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Conjunto</p>
                  <p className="font-black text-slate-800">{formData.conjunto || 'Sin Conjunto'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Edificio / Denom.</p>
                  <p className="font-black text-slate-800">{formData.building}</p>
                </div>
              </div>

              {/* Dirección Particular */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-xs">
                <p className="text-[10px] font-black text-slate-400 uppercase">Dirección Particular del Inmueble</p>
                <p className="font-black text-slate-900 text-sm mt-0.5">{formData.address}</p>
              </div>

              {/* Condiciones Comerciales */}
              <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-4 text-xs">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Canon de Arriendo Base</p>
                  <p className="text-sm font-black text-emerald-800 font-mono">
                    {formData.rentalCurrency === 'UF' ? `${formData.rentalAmount} UF` : formatCLP(formData.rentalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Día de Pago</p>
                  <p className="font-black text-slate-800">Día {formData.rentalPaymentDay} de cada mes</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Estado de Ocupación</p>
                  <p className="font-black text-slate-800">{formData.occupancyStatus}</p>
                </div>
              </div>

              {/* Servicios Básicos Estandarizados */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-800">
                  Cuentas de Servicios Básicos Asociadas
                </h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase">
                      <th className="p-2">Servicio</th>
                      <th className="p-2">Proveedor</th>
                      <th className="p-2">N° Cliente / Cuenta</th>
                      <th className="p-2">N° Medidor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {formData.basicServices.map(svc => (
                      <tr key={svc.id}>
                        <td className="p-2 font-bold">{svc.serviceType}</td>
                        <td className="p-2">{svc.providerName}</td>
                        <td className="p-2 font-black">{svc.clientNumber}</td>
                        <td className="p-2 text-slate-500">{svc.meterNumber || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
