import React, { useState, useEffect } from 'react';
import { 
  FileText, Check, Sparkles, Trash, Plus, Download, Upload, X, ShieldCheck, Signature, Landmark, AlertTriangle, Save, CheckCircle2, AlertCircle
} from 'lucide-react';
import { maskRUT, validateRUTDetailed, maskPhoneCLP, validatePhoneCLP, cleanRUTString } from '../lib/inputMasks';

interface AltaGerenciaMember {
  rut: string;
  cargo: string;
  nombre: string;
}

interface BeneficiarioFinal {
  cni: string;
  nombre: string;
  domicilio: string;
  ciudad: string;
  pais: string;
  domicilioTributario: string;
  participacion: number;
}

export interface UafFormFields {
  numeroDeclaracion: string;
  tipoTramite: 'NUEVO_PROVEEDOR' | 'TRANSACCION_UNICA' | 'ACTUALIZACION_DATOS' | 'ACTUALIZACION_SIN_CAMBIOS';
  razonSocial: string;
  rut: string;
  domicilio: string;
  ciudad: string;
  lugarConstitucion: string;
  domicilioTributario: string;
  telefono: string;
  rutRepLegal: string;
  nombreRepLegal: string;
  tipoSociedad: 'ANONIMA' | 'COLECTIVA' | 'EN_COMANDITA' | 'LIMITADA' | 'EIRL' | 'OTRA';
  tipoSociedadOtroEspecifico: string;
  altaGerencia: AltaGerenciaMember[];
  beneficiarios: BeneficiarioFinal[];
  controlEfectivo: BeneficiarioFinal[];
  actualizacionSinCambiosReiteracion: boolean;
  sinCambiosNroDeclaracionAnterior: string;
  sinCambiosFechaAnterior: string;
  declaranteNacionalidad: 'CHILENA' | 'EXTRANJERO_RESIDENTE' | 'EXTRANJERO_NO_RESIDENTE';
  declaranteRut: string;
  declaranteNombres: string;
  declaranteApellidoPaterno: string;
  declaranteApellidoMaterno: string;
  declaranteLugarOrigen: string;
  declaranteRelacion: string;
  firmaEnCiudad: string;
  firmaDia: string;
  firmaMes: string;
  firmaAnio: string;
  isSigned: boolean;
  signedStampCode?: string;
}

interface UafBeneficiaryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierName?: string;
  supplierTaxId?: string;
  initialData?: any;
  onSave: (data: { name: string; size: string; customData: UafFormFields }) => void;
}

export const UafBeneficiaryFormModal: React.FC<UafBeneficiaryFormModalProps> = ({
  isOpen,
  onClose,
  supplierName = '',
  supplierTaxId = '',
  initialData,
  onSave
}) => {
  const [formData, setFormData] = useState<UafFormFields>(() => {
    if (initialData?.customData) {
      return initialData.customData;
    }
    return getEmptyForm();
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData?.customData) {
        setFormData(initialData.customData);
      } else {
        // Pre-fill company name & RUT if available
        setFormData(prev => ({
          ...prev,
          razonSocial: supplierName || prev.razonSocial,
          rut: supplierTaxId || prev.rut,
          tipoTramite: 'ACTUALIZACION_DATOS'
        }));
      }
    }
  }, [isOpen, initialData, supplierName, supplierTaxId]);

  function getEmptyForm(): UafFormFields {
    return {
      numeroDeclaracion: `MUT-${Math.floor(100000 + Math.random() * 900000)}`,
      tipoTramite: 'NUEVO_PROVEEDOR',
      razonSocial: '',
      rut: '',
      domicilio: '',
      ciudad: '',
      lugarConstitucion: 'Chile',
      domicilioTributario: '',
      telefono: '',
      rutRepLegal: '',
      nombreRepLegal: '',
      tipoSociedad: 'LIMITADA',
      tipoSociedadOtroEspecifico: '',
      altaGerencia: [
        { rut: '', cargo: '', nombre: '' }
      ],
      beneficiarios: [
        { cni: '', nombre: '', domicilio: '', ciudad: '', pais: 'Chile', domicilioTributario: '', participacion: 0 }
      ],
      controlEfectivo: [
        { cni: '', nombre: '', domicilio: '', ciudad: '', pais: 'Chile', domicilioTributario: '', participacion: 0 }
      ],
      actualizacionSinCambiosReiteracion: false,
      sinCambiosNroDeclaracionAnterior: '',
      sinCambiosFechaAnterior: '',
      declaranteNacionalidad: 'CHILENA',
      declaranteRut: '',
      declaranteNombres: '',
      declaranteApellidoPaterno: '',
      declaranteApellidoMaterno: '',
      declaranteLugarOrigen: 'Chile',
      declaranteRelacion: 'Representante Legal',
      firmaEnCiudad: 'Santiago',
      firmaDia: new Date().getDate().toString(),
      firmaMes: (new Date().getMonth() + 1).toString(),
      firmaAnio: new Date().getFullYear().toString().substring(2),
      isSigned: false,
    };
  }

  const handleAutofillOCR = () => {
    const rx = supplierName || 'Inversiones y Construcciones Metrópolis Limitada';
    const txId = supplierTaxId || '76.492.381-4';
    
    const calculatedDeclarationId = `DEC-${Math.floor(400000 + Math.random() * 599999)}`;
    const randomStamp = `ASSETFLOW-UAF-SIGNED-HASH-${Math.random().toString(36).substring(2, 10).toUpperCase()}-2026`;

    setFormData({
      numeroDeclaracion: calculatedDeclarationId,
      tipoTramite: 'ACTUALIZACION_DATOS',
      razonSocial: rx,
      rut: txId,
      domicilio: 'Av. Vitacura 5250, Oficina 902',
      ciudad: 'Vitacura, Santiago',
      lugarConstitucion: 'Santiago, Chile',
      domicilioTributario: 'Av. Vitacura 5250, Oficina 902',
      telefono: '+56 2 2490 8312',
      rutRepLegal: '13.402.193-K',
      nombreRepLegal: 'Carlos Tomás Larraín Cruzat',
      tipoSociedad: 'LIMITADA',
      tipoSociedadOtroEspecifico: '',
      altaGerencia: [
        { rut: '15.489.102-3', cargo: 'Gerenta General', nombre: 'Marisol Valentina Pizarro Altamirano' },
        { rut: '13.621.492-9', cargo: 'Director de Finanzas ERP', nombre: 'Gonzalo Fuenzalida Vial' }
      ],
      beneficiarios: [
        { cni: '8.943.201-9', nombre: 'Carlos Tomás Larraín Cruzat', domicilio: 'Av. Las Condes 8295, Depto 1402', ciudad: 'Las Condes', pais: 'Chile', domicilioTributario: 'Av. Las Condes 8295', participacion: 60 },
        { cni: '11.402.193-4', nombre: 'María Teresa Edwards Rossi', domicilio: 'Camino La Viña 1230', ciudad: 'Vitacura', pais: 'Chile', domicilioTributario: 'Camino La Viña 1230', participacion: 25 },
        { cni: '10.392.482-1', nombre: 'Esteban Ignacio Valdés Pérez', domicilio: 'San Sebastián 2812', ciudad: 'Providencia', pais: 'Chile', domicilioTributario: 'San Sebastián 2812', participacion: 15 }
      ],
      controlEfectivo: [
        { cni: '14.291.902-1', nombre: 'Alejandro Andrés Silva Larraín', domicilio: 'Carlos Antúnez 1930', ciudad: 'Providencia', pais: 'Chile', domicilioTributario: 'Carlos Antúnez 1930', participacion: 5 }
      ],
      actualizacionSinCambiosReiteracion: false,
      sinCambiosNroDeclaracionAnterior: '',
      sinCambiosFechaAnterior: '',
      declaranteNacionalidad: 'CHILENA',
      declaranteRut: '8.943.201-9',
      declaranteNombres: 'Carlos Tomás',
      declaranteApellidoPaterno: 'Larraín',
      declaranteApellidoMaterno: 'Cruzat',
      declaranteLugarOrigen: 'Santiago, Chile',
      declaranteRelacion: 'Presidente de Directorio / Socio Fundador',
      firmaEnCiudad: 'Las Condes',
      firmaDia: '05',
      firmaMes: '06',
      firmaAnio: '26',
      isSigned: true,
      signedStampCode: randomStamp
    });
  };

  const handleAddAltaGerencia = () => {
    setFormData(prev => ({
      ...prev,
      altaGerencia: [...prev.altaGerencia, { rut: '', cargo: '', nombre: '' }]
    }));
  };

  const handleRemoveAltaGerencia = (index: number) => {
    setFormData(prev => ({
      ...prev,
      altaGerencia: prev.altaGerencia.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateAltaGerencia = (index: number, field: keyof AltaGerenciaMember, value: string) => {
    const formattedValue = field === 'rut' ? maskRUT(value) : value;
    setFormData(prev => ({
      ...prev,
      altaGerencia: prev.altaGerencia.map((item, i) => i === index ? { ...item, [field]: formattedValue } : item)
    }));
  };

  const handleAddBeneficiario = (section: 'beneficiarios' | 'controlEfectivo') => {
    setFormData(prev => ({
      ...prev,
      [section]: [...prev[section], { cni: '', nombre: '', domicilio: '', ciudad: '', pais: 'Chile', domicilioTributario: '', participacion: 0 }]
    }));
  };

  const handleRemoveBeneficiario = (section: 'beneficiarios' | 'controlEfectivo', index: number) => {
    setFormData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }));
  };

  const handleUpdateBeneficiario = (section: 'beneficiarios' | 'controlEfectivo', index: number, field: keyof BeneficiarioFinal, value: any) => {
    const formattedValue = field === 'cni' && typeof value === 'string' ? maskRUT(value) : value;
    setFormData(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) => i === index ? { ...item, [field]: formattedValue } : item)
    }));
  };

  const calculateTotalPct = () => {
    return formData.beneficiarios.reduce((sum, b) => sum + (Number(b.participacion) || 0), 0);
  };

  const handleSignElectronic = () => {
    if (!formData.declaranteRut || !formData.declaranteNombres) {
      alert("Por favor complete los Antecedentes de la Persona que realiza la declaración (Sección 4) antes de firmar.");
      return;
    }
    const hash = `ASSETFLOW-UAF-SIGNED-HASH-${Math.random().toString(36).substring(2, 10).toUpperCase()}-2026`;
    setFormData(prev => ({
      ...prev,
      isSigned: true,
      signedStampCode: hash
    }));
  };

  const handleSaveForm = () => {
    if (!formData.razonSocial || !formData.rut) {
      alert("La Razón Social y el RUT de la empresa declarante son obligatorios.");
      return;
    }

    const totalPct = calculateTotalPct();
    if (totalPct > 100) {
      alert(`Advertencia crítica Ley 19.913: El porcentaje de participación total de los beneficiarios finales suma ${totalPct}%, lo cual supera el 100% límite legal.`);
      return;
    }

    onSave({
      name: `UAF_DEC_BENEFICIARIOS_${formData.rut.replace(/[^a-zA-Z0-9]/g, '')}.pdf`,
      size: '1.2 MB',
      customData: formData
    });
    onClose();
  };

  if (!isOpen) return null;

  const sumPct = calculateTotalPct();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-100 rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl overflow-hidden flex flex-col my-4 max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL CONTROL HEADER */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider font-mono">DECLARACIÓN JURADA UAF (LEY N° 19.913)</h2>
              <p className="text-[10px] text-slate-350">Procesador Interactivo de Identificación de Beneficiarios Finales</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutofillOCR}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shadow-md select-none"
            >
              <Sparkles size={13} className="text-amber-400 animate-pulse" /> Simular Extracción OCR Formulario
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-sm transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* MODAL SCROLLABLE CONTENTS: FORM PAPER SHEET */}
        <div className="overflow-y-auto p-6 md:p-8 space-y-8 bg-[#f8fafc]">
          
          {/* LAW WARNING CRUST */}
          <div className="bg-amber-50 border border-amber-250 p-4 rounded-lg flex gap-3 text-amber-800 items-start">
            <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-600" />
            <div className="text-xs">
              <span className="font-bold uppercase block tracking-wider font-mono text-[10px] text-amber-900 mb-0.5">CONTEXTO OBLIGATORIO Y VIGENCIA - LEY 19.913 CHILE:</span>
              La Corporación de Seguros AssetFlow, bajo normativas de la Unidad de Análisis Financiero (UAF), exige adjuntar esta declaración firmada y timbrada para toda operación o flujo contractual. La información recopilada se cruza con las bases de datos de control interno de ERP y el módulo P04012.
              <span className="block mt-1 font-bold text-amber-950">VIGENCIA: Este formulario tiene una vigencia legal estricta de un (1) año (365 días) desde la fecha de firma o emisión consignada. El sistema registrará este plazo y emitirá alertas automáticas al aproximarse la fecha de vencimiento para ser renovado oportunamente.</span>
            </div>
          </div>

          {/* ASSETFLOW PAPER SHEET LAYOUT */}
          <div className="bg-white border border-slate-300 rounded-lg shadow-sm p-6 md:p-10 max-w-4xl mx-auto space-y-6 text-slate-800 selection:bg-slate-100 font-sans relative">
            
            {/* PAPER LOGO & HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-5 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-linear-to-b from-[#1e293b] to-[#151f32] p-2 rounded-md">
                  <div className="text-white text-base font-black tracking-tighter uppercase font-mono">AssetFlow</div>
                  <div className="text-[7px] text-emerald-400 tracking-widest font-bold uppercase -mt-1 font-sans">CORP. SEGUROS</div>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight border-l border-slate-200 pl-2.5 font-medium">
                  Corporación de Seguros<br/>AssetFlow de Chile
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-xs font-mono font-bold uppercase text-slate-500">Formulario N°</label>
                <input 
                  type="text" 
                  value={formData.numeroDeclaracion}
                  onChange={(e) => setFormData({ ...formData, numeroDeclaracion: e.target.value })}
                  placeholder="Ej: MUT-482012"
                  className="bg-amber-50/50 border border-slate-350 text-slate-900 font-mono font-black text-xs p-1 px-2.5 rounded-sm w-36 outline-hidden text-center focus:border-slate-800 focus:bg-white"
                />
              </div>
            </div>

            {/* MAIN FORM TITLE */}
            <div className="text-center space-y-1 py-1">
              <h3 className="text-sm md:text-base font-black uppercase text-slate-950 tracking-wide font-mono">
                DECLARACIÓN JURADA PARA LA IDENTIFICACIÓN DE LOS BENEFICIARIOS FINALES DE LAS PERSONAS / ESTRUCTURAS JURÍDICAS
              </h3>
              <p className="text-[11px] text-slate-550 max-w-2xl mx-auto leading-relaxed">
                De acuerdo con lo establecido en la <strong>Ley N° 19.913</strong> (Anti-Lavado de Activos / UAF), se solicita proporcionar la siguiente información obligatoria de transparencia:
              </p>
            </div>

            {/* TIPO DE TRAMITE SECTORS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-705">
              <label className="flex items-center gap-2 pointer cursor-pointer">
                <input 
                  type="radio" 
                  name="tipoTramite" 
                  checked={formData.tipoTramite === 'NUEVO_PROVEEDOR'} 
                  onChange={() => setFormData({ ...formData, tipoTramite: 'NUEVO_PROVEEDOR' })}
                  className="h-4.5 w-4.5 border-slate-300 text-slate-900 accent-slate-900" 
                />
                Nuevo Proveedor
              </label>
              <label className="flex items-center gap-2 pointer cursor-pointer">
                <input 
                  type="radio" 
                  name="tipoTramite" 
                  checked={formData.tipoTramite === 'TRANSACCION_UNICA'} 
                  onChange={() => setFormData({ ...formData, tipoTramite: 'TRANSACCION_UNICA' })}
                  className="h-4.5 w-4.5 border-slate-300 text-slate-900 accent-slate-900" 
                />
                Transacción única
              </label>
              <label className="flex items-center gap-2 pointer cursor-pointer">
                <input 
                  type="radio" 
                  name="tipoTramite" 
                  checked={formData.tipoTramite === 'ACTUALIZACION_DATOS'} 
                  onChange={() => setFormData({ ...formData, tipoTramite: 'ACTUALIZACION_DATOS' })}
                  className="h-4.5 w-4.5 border-slate-300 text-slate-900 accent-slate-900" 
                />
                Actualización de Datos
              </label>
              <label className="flex items-center gap-2 pointer cursor-pointer">
                <input 
                  type="radio" 
                  name="tipoTramite" 
                  checked={formData.tipoTramite === 'ACTUALIZACION_SIN_CAMBIOS'} 
                  onChange={() => setFormData({ ...formData, tipoTramite: 'ACTUALIZACION_SIN_CAMBIOS' })}
                  className="h-4.5 w-4.5 border-slate-300 text-slate-900 accent-slate-900" 
                />
                Act. sin cambios
              </label>
            </div>

            {/* SECTION 1: ANTECEDENTES DE LA SOCIEDAD */}
            <div className="space-y-3.5 pt-2">
              <div className="bg-slate-900 text-white text-[10.5px] font-black uppercase tracking-wider font-mono py-1.5 px-3 rounded-xs">
                1. ANTECEDENTES DE LA PERSONA / ESTRUCTURA JURÍDICA DECLARANTE
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono">RUT / Nº Identificación SII (*)</label>
                    {formData.rut && validateRUTDetailed(formData.rut).isValid ? (
                      <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-200">✓ Válido</span>
                    ) : formData.rut && !validateRUTDetailed(formData.rut).isValid ? (
                      <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200">RUT Inválido</span>
                    ) : null}
                  </div>
                  <input 
                    type="text" 
                    value={formData.rut} 
                    onChange={(e) => setFormData({ ...formData, rut: maskRUT(e.target.value) })}
                    placeholder="XX.XXX.XXX-X"
                    className={`w-full bg-slate-50 border rounded-md py-1.5 px-3 text-xs text-slate-800 font-mono font-bold focus:bg-white focus:outline-hidden ${
                      formData.rut && !validateRUTDetailed(formData.rut).isValid ? 'border-rose-400 bg-rose-50/20' : 'border-slate-250 focus:border-indigo-650'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Razón Social Completa (*)</label>
                  <input 
                    type="text" 
                    value={formData.razonSocial} 
                    onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value.toUpperCase() })}
                    placeholder="Nombre o Razón Social"
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs text-slate-800 font-bold focus:bg-white focus:outline-hidden focus:border-indigo-650 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Domicilio Principal</label>
                  <input 
                    type="text" 
                    value={formData.domicilio} 
                    onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                    placeholder="Calle, Número, Oficina/Depto"
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Ciudad / Comuna</label>
                  <input 
                    type="text" 
                    value={formData.ciudad} 
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                    placeholder="Santiago"
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Domicilio Tributario</label>
                  <input 
                    type="text" 
                    value={formData.domicilioTributario} 
                    onChange={(e) => setFormData({ ...formData, domicilioTributario: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Lugar de Constitución</label>
                  <input 
                    type="text" 
                    value={formData.lugarConstitucion} 
                    onChange={(e) => setFormData({ ...formData, lugarConstitucion: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs focus:bg-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono">Teléfono (+56 9)</label>
                    {formData.telefono && validatePhoneCLP(formData.telefono).isValid ? (
                      <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded-full border border-emerald-200">✓ Válido</span>
                    ) : null}
                  </div>
                  <input 
                    type="text" 
                    value={formData.telefono} 
                    onChange={(e) => setFormData({ ...formData, telefono: maskPhoneCLP(e.target.value) })}
                    placeholder="+56 9 XXXX XXXX"
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono">RUT Representante Legal</label>
                    {formData.rutRepLegal && validateRUTDetailed(formData.rutRepLegal).isValid ? (
                      <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-200">✓ Válido</span>
                    ) : formData.rutRepLegal && !validateRUTDetailed(formData.rutRepLegal).isValid ? (
                      <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200">RUT Inválido</span>
                    ) : null}
                  </div>
                  <input 
                    type="text" 
                    value={formData.rutRepLegal} 
                    onChange={(e) => setFormData({ ...formData, rutRepLegal: maskRUT(e.target.value) })}
                    placeholder="12.345.678-K"
                    className={`w-full bg-slate-50 border rounded-md py-1.5 px-3 text-xs focus:bg-white font-mono font-bold ${
                      formData.rutRepLegal && !validateRUTDetailed(formData.rutRepLegal).isValid ? 'border-rose-400 bg-rose-50/20' : 'border-slate-250'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Nombre Representante Legal</label>
                  <input 
                    type="text" 
                    value={formData.nombreRepLegal} 
                    onChange={(e) => setFormData({ ...formData, nombreRepLegal: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs focus:bg-white font-bold uppercase"
                  />
                </div>
              </div>

              {/* TIPO DE SOCIEDAD RADIO */}
              <div>
                <label className="block text-[9.5px] font-black uppercase text-slate-400 tracking-wider font-mono mb-1.5">Tipo de Sociedad</label>
                <div className="flex flex-wrap gap-4 text-xs">
                  {['ANONIMA', 'COLECTIVA', 'EN_COMANDITA', 'LIMITADA', 'EIRL', 'OTRA'].map((type) => (
                    <label key={type} className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input 
                        type="radio" 
                        name="tipoSociedad" 
                        checked={formData.tipoSociedad === type} 
                        onChange={() => setFormData({ ...formData, tipoSociedad: type as any })}
                        className="h-4 w-4 bg-slate-50 border-slate-350 text-slate-900 accent-slate-900 cursor-pointer"
                      />
                      <span className="font-bold text-[11px]">{type}</span>
                    </label>
                  ))}
                  {formData.tipoSociedad === 'OTRA' && (
                    <input 
                      type="text" 
                      value={formData.tipoSociedadOtroEspecifico}
                      onChange={(e) => setFormData({ ...formData, tipoSociedadOtroEspecifico: e.target.value })}
                      placeholder="Especifique..."
                      className="border border-slate-350 bg-slate-50 p-1 px-2.5 rounded-xs text-[11px] w-40 focus:bg-white outline-hidden"
                    />
                  )}
                </div>
              </div>

              {/* SUCCEEDED ALTA GERENCIA */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded-sm border border-slate-150">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider font-mono">Identifique la alta gerencia de la persona o estructura jurídica:</span>
                  <button 
                    onClick={handleAddAltaGerencia} 
                    className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 uppercase font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Añadir Miembro
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.altaGerencia.map((member, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      <div className="md:col-span-3">
                        <input 
                          type="text" 
                          value={member.rut} 
                          onChange={(e) => handleUpdateAltaGerencia(index, 'rut', e.target.value)}
                          placeholder="RUT / ID de Identificación" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-md py-1 px-2 text-xs font-mono"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <input 
                          type="text" 
                          value={member.cargo} 
                          onChange={(e) => handleUpdateAltaGerencia(index, 'cargo', e.target.value)}
                          placeholder="Cargo (Ej: Gerente General)" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-md py-1 px-2 text-xs font-bold"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <input 
                          type="text" 
                          value={member.nombre} 
                          onChange={(e) => handleUpdateAltaGerencia(index, 'nombre', e.target.value)}
                          placeholder="Nombre Completo" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-md py-1 px-2 text-xs font-bold"
                        />
                      </div>
                      <div className="md:col-span-1 text-center">
                        <button 
                          onClick={() => handleRemoveAltaGerencia(index)} 
                          className="text-rose-500 hover:text-rose-700 transition font-mono text-[10px] font-black py-1 cursor-pointer"
                        >
                          <Trash size={14} className="mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 2: IDENTIFICACIÓN DE BENEFICIARIOS FINALES */}
            <div className="space-y-4 pt-2">
              <div className="bg-slate-900 text-white text-[10.5px] font-black uppercase tracking-wider font-mono py-1.5 px-3 rounded-xs">
                2. IDENTIFICACIÓN DE LOS BENEFICIARIOS FINALES
              </div>
              <p className="text-[10px] text-slate-500 italic leading-relaxed border-l-2 border-indigo-600 pl-2.5">
                Se entenderá por Beneficiario(s) Final(es), a la(s) persona(s) natural(es) que finalmente posee(n), directa o indirectamente, a través de sociedades u otros mecanismos, una participación igual o mayor al 10% del capital o de los derechos a voto de una persona jurídica o estructura determinada. Asimismo, a la(s) persona(s) que ejerce(n) el control efectivo en la toma de decisiones.
              </p>

              {/* SUBSECTION 2.1: INTERVENCION >= 10% */}
              <div className="space-y-3 bg-slate-100/50 p-4 border border-slate-200 rounded-lg">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h4 className="text-[10.5px] font-black uppercase text-indigo-900 tracking-wider font-mono">
                    2.1 Beneficiarios Finales (Participación igual o mayor al 10%)
                  </h4>
                  <button 
                    onClick={() => handleAddBeneficiario('beneficiarios')} 
                    className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 uppercase font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Agregar Beneficiario
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.beneficiarios.map((b, index) => (
                    <div key={index} className="border border-slate-200 bg-white p-3.5 rounded-lg space-y-2 relative shadow-3xs">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[8.5px] font-black uppercase text-slate-400 font-mono mb-0.5">RUT / CNI ID</label>
                          <input 
                            type="text" 
                            value={b.cni} 
                            onChange={(e) => handleUpdateBeneficiario('beneficiarios', index, 'cni', e.target.value)}
                            placeholder="Ej: 11.402.193-4" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-md py-0.5 px-2 text-xs font-mono font-medium"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[8.5px] font-black uppercase text-slate-400 font-mono mb-0.5">Nombre Completo</label>
                          <input 
                            type="text" 
                            value={b.nombre} 
                            onChange={(e) => handleUpdateBeneficiario('beneficiarios', index, 'nombre', e.target.value)}
                            placeholder="Nombre del beneficiario natural" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-md py-0.5 px-2 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[8.5px] font-black uppercase text-slate-400 font-mono mb-0.5">% Participación Capital</label>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={b.participacion || ''} 
                              onChange={(e) => handleUpdateBeneficiario('beneficiarios', index, 'participacion', parseFloat(e.target.value))}
                              placeholder="Ej: 25" 
                              className="w-full bg-indigo-50/20 border border-slate-200 rounded-md py-0.5 px-2 text-xs font-mono font-bold text-indigo-700 text-right"
                            />
                            <span className="text-xs font-bold text-slate-500 shrink-0 font-mono">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div className="md:col-span-2">
                          <label className="block text-[8.5px] font-black uppercase text-slate-400 font-mono mb-0.5">Domicilio Habitual</label>
                          <input 
                            type="text" 
                            value={b.domicilio} 
                            onChange={(e) => handleUpdateBeneficiario('beneficiarios', index, 'domicilio', e.target.value)}
                            placeholder="Calle, Depto" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-md py-0.5 px-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[8.5px] font-black uppercase text-slate-400 font-mono mb-0.5">Ciudad</label>
                          <input 
                            type="text" 
                            value={b.ciudad} 
                            onChange={(e) => handleUpdateBeneficiario('beneficiarios', index, 'ciudad', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md py-0.5 px-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[8.5px] font-black uppercase text-slate-400 font-mono mb-0.5">País</label>
                          <input 
                            type="text" 
                            value={b.pais} 
                            onChange={(e) => handleUpdateBeneficiario('beneficiarios', index, 'pais', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md py-0.5 px-2 text-xs"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => handleRemoveBeneficiario('beneficiarios', index)}
                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* PCT METER PANEL */}
                <div className="flex justify-between items-center text-xs p-2 bg-slate-200 border border-slate-250 rounded-md">
                  <span className="font-mono text-slate-655 uppercase font-bold tracking-wide">SUMATORIA DE PARTICIPACIÓN ACCIONARIA BEN. FINALES:</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-black text-sm ${sumPct === 100 ? 'text-emerald-700' : sumPct > 100 ? 'text-rose-600 animate-pulse' : 'text-amber-705'}`}>
                      {sumPct}%
                    </span>
                    {sumPct === 100 ? (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-700 border border-emerald-250 font-bold px-1.5 py-0.5 uppercase rounded-xs">CONFORME (100%)</span>
                    ) : (
                      <span className="text-[9px] bg-amber-500/10 text-amber-700 border border-amber-250 font-bold px-1.5 py-0.5 uppercase rounded-xs">ESTRUCTURA INCOMPLETA</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SUBSECTION 2.2: CONTROL EFECTIVO */}
              <div className="space-y-3 bg-slate-100/50 p-4 border border-slate-200 rounded-lg">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h4 className="text-[10.5px] font-black uppercase text-indigo-900 tracking-wider font-mono">
                    2.2 Control Efectivo (Sujetos con control político/operativo, sin importar % accionario)
                  </h4>
                  <button 
                    onClick={() => handleAddBeneficiario('controlEfectivo')} 
                    className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 uppercase font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Agregar Relación de Control
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.controlEfectivo.map((b, index) => (
                    <div key={index} className="border border-slate-200 bg-white p-3.5 rounded-lg space-y-2 relative shadow-3xs">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[8.5px] font-black uppercase text-slate-400 font-mono mb-0.5">RUT / CNI ID</label>
                          <input 
                            type="text" 
                            value={b.cni} 
                            onChange={(e) => handleUpdateBeneficiario('controlEfectivo', index, 'cni', e.target.value)}
                            placeholder="Ej: 14.291.902-1" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-md py-0.5 px-2 text-xs font-mono font-medium"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[8.5px] font-black uppercase text-slate-400 font-mono mb-0.5">Nombre Completo</label>
                          <input 
                            type="text" 
                            value={b.nombre} 
                            onChange={(e) => handleUpdateBeneficiario('controlEfectivo', index, 'nombre', e.target.value)}
                            placeholder="Nombre del director o administrador" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-md py-0.5 px-2 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[8.5px] font-black uppercase text-slate-400 font-mono mb-0.5">% Participación Directa</label>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={b.participacion || ''} 
                              onChange={(e) => handleUpdateBeneficiario('controlEfectivo', index, 'participacion', parseFloat(e.target.value))}
                              placeholder="Ej: 5" 
                              className="w-full bg-slate-50 border border-slate-200 rounded-md py-0.5 px-2 text-xs font-mono text-slate-700 text-right"
                            />
                            <span className="text-xs font-bold text-slate-500 shrink-0 font-mono">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div className="md:col-span-2">
                          <label className="block text-[8.5px] font-black uppercase text-slate-400 font-mono mb-0.5">Domicilio Habitual</label>
                          <input 
                            type="text" 
                            value={b.domicilio} 
                            onChange={(e) => handleUpdateBeneficiario('controlEfectivo', index, 'domicilio', e.target.value)}
                            placeholder="Calle, Depto" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-md py-0.5 px-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[8.5px] font-black uppercase text-slate-400 font-mono mb-0.5">Ciudad</label>
                          <input 
                            type="text" 
                            value={b.ciudad} 
                            onChange={(e) => handleUpdateBeneficiario('controlEfectivo', index, 'ciudad', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md py-0.5 px-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[8.5px] font-black uppercase text-slate-400 font-mono mb-0.5">País</label>
                          <input 
                            type="text" 
                            value={b.pais} 
                            onChange={(e) => handleUpdateBeneficiario('controlEfectivo', index, 'pais', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md py-0.5 px-2 text-xs"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => handleRemoveBeneficiario('controlEfectivo', index)}
                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 3: ACTUALIZACION SIN CAMBIOS */}
            <div className="space-y-3 pt-2">
              <div className="bg-slate-900 text-white text-[10.5px] font-black uppercase tracking-wider font-mono py-1.5 px-3 rounded-xs">
                3. ACTUALIZACIÓN DE DATOS SIN CAMBIOS
              </div>
              <div className="border border-slate-200 p-4 rounded-lg bg-indigo-50/10">
                <label className="flex items-start gap-2.5 cursor-pointer pb-2 text-slate-800">
                  <input 
                    type="checkbox" 
                    checked={formData.actualizacionSinCambiosReiteracion} 
                    onChange={(e) => setFormData({ ...formData, actualizacionSinCambiosReiteracion: e.target.checked })}
                    className="h-4.5 w-4.5 border-slate-350 text-indigo-700 rounded-sm focus:ring-indigo-600 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-[11px] font-bold block uppercase font-mono tracking-tight text-indigo-950">Vincular con declaración anterior histórica</span>
                    <span className="text-[10px] text-slate-500 block leading-normal">
                      Se reitera la vigencia absoluta del set de UBOs de la Declaración Jurada N° cargada anteriormente.
                    </span>
                  </div>
                </label>

                {formData.actualizacionSinCambiosReiteracion && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3 border-t border-slate-200 mt-2 text-xs">
                    <div>
                      <label className="block text-[9.5px] font-black uppercase text-slate-400 font-mono mb-1 font-bold">Declaración Jurada N° Histórica</label>
                      <input 
                        type="text" 
                        value={formData.sinCambiosNroDeclaracionAnterior}
                        onChange={(e) => setFormData({ ...formData, sinCambiosNroDeclaracionAnterior: e.target.value })}
                        placeholder="Ej: DET-401923"
                        className="w-full bg-white border border-slate-250 rounded-md py-1 px-2.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black uppercase text-slate-400 font-mono mb-1 font-bold">De Fecha de Registro anterior</label>
                      <input 
                        type="text" 
                        value={formData.sinCambiosFechaAnterior}
                        onChange={(e) => setFormData({ ...formData, sinCambiosFechaAnterior: e.target.value })}
                        placeholder="Ej: 14 de Marzo de 2025"
                        className="w-full bg-white border border-slate-250 rounded-md py-1 px-2.5 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 4: ANTECEDENTES DE LA PERSONA QUE DECLARA */}
            <div className="space-y-3 pt-2">
              <div className="bg-slate-900 text-white text-[10.5px] font-black uppercase tracking-wider font-mono py-1.5 px-3 rounded-xs">
                4. ANTECEDENTES DE LA PERSONA QUE REALIZA LA PRESENTE DECLARACIÓN
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-705">
                <label className="flex items-center gap-2 pointer cursor-pointer">
                  <input 
                    type="radio" 
                    name="declaranteNacio" 
                    checked={formData.declaranteNacionalidad === 'CHILENA'} 
                    onChange={() => setFormData({ ...formData, declaranteNacionalidad: 'CHILENA' })}
                    className="h-4 w-4 bg-slate-50 border-slate-350 text-slate-900 accent-slate-900" 
                  />
                  Chilena
                </label>
                <label className="flex items-center gap-2 pointer cursor-pointer">
                  <input 
                    type="radio" 
                    name="declaranteNacio" 
                    checked={formData.declaranteNacionalidad === 'EXTRANJERO_RESIDENTE'} 
                    onChange={() => setFormData({ ...formData, declaranteNacionalidad: 'EXTRANJERO_RESIDENTE' })}
                    className="h-4 w-4 bg-slate-50 border-slate-350 text-slate-900 accent-slate-900" 
                  />
                  Extranjero Residente
                </label>
                <label className="flex items-center gap-2 pointer cursor-pointer">
                  <input 
                    type="radio" 
                    name="declaranteNacio" 
                    checked={formData.declaranteNacionalidad === 'EXTRANJERO_NO_RESIDENTE'} 
                    onChange={() => setFormData({ ...formData, declaranteNacionalidad: 'EXTRANJERO_NO_RESIDENTE' })}
                    className="h-4 w-4 bg-slate-50 border-slate-350 text-slate-900 accent-slate-900" 
                  />
                  Extranjero No Residente
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">RUT Identificación</label>
                  <input 
                    type="text" 
                    value={formData.declaranteRut} 
                    onChange={(e) => setFormData({ ...formData, declaranteRut: e.target.value })}
                    placeholder="Rut del firmante"
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs font-mono font-bold focus:bg-white"
                  />
                </div>
                <div className="col-span-1 md:col-span-3">
                  <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Nombres de Pila</label>
                  <input 
                    type="text" 
                    value={formData.declaranteNombres} 
                    onChange={(e) => setFormData({ ...formData, declaranteNombres: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs font-bold focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Apellido Paterno</label>
                  <input 
                    type="text" 
                    value={formData.declaranteApellidoPaterno} 
                    onChange={(e) => setFormData({ ...formData, declaranteApellidoPaterno: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs font-bold focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Apellido Materno</label>
                  <input 
                    type="text" 
                    value={formData.declaranteApellidoMaterno} 
                    onChange={(e) => setFormData({ ...formData, declaranteApellidoMaterno: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs font-bold focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Lugar de Origen / Ciudadanía</label>
                  <input 
                    type="text" 
                    value={formData.declaranteLugarOrigen} 
                    onChange={(e) => setFormData({ ...formData, declaranteLugarOrigen: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono mb-1">Relación con la Persona Declarada</label>
                  <input 
                    type="text" 
                    value={formData.declaranteRelacion} 
                    onChange={(e) => setFormData({ ...formData, declaranteRelacion: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-md py-1.5 px-3 text-xs font-bold focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* LOWER DECLARATION STATEMENT */}
            <p className="text-[11px] text-slate-705 leading-relaxed bg-slate-50 border border-slate-150 p-3.5 rounded-lg text-center font-medium font-mono uppercase tracking-wide">
              Declaro bajo juramento, que la información proporcionada en este formulario es completa, fidedigna, veraz y se ajusta a los dictámenes correspondientes de la Ley N2 19.913 de la República de Chile.
            </p>

            {/* DATE & SIGNATURE HUB */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end pt-4">
              <div className="md:col-span-5 text-xs text-slate-550 space-y-3 border-r border-slate-200 pr-4">
                <div className="flex items-center gap-1.5">
                  <span>En</span>
                  <input 
                    type="text" 
                    value={formData.firmaEnCiudad}
                    onChange={(e) => setFormData({ ...formData, firmaEnCiudad: e.target.value })}
                    className="border-b border-slate-400 font-bold bg-transparent text-slate-800 text-center text-xs pb-0.5 outline-hidden focus:border-slate-800 font-mono w-28" 
                  />
                  <span>, a</span>
                  <input 
                    type="text" 
                    value={formData.firmaDia}
                    onChange={(e) => setFormData({ ...formData, firmaDia: e.target.value })}
                    className="border-b border-slate-400 font-bold bg-transparent text-slate-800 text-center text-xs pb-0.5 outline-hidden focus:border-slate-800 font-mono w-10 animate-pulse" 
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span>de</span>
                  <input 
                    type="text" 
                    value={formData.firmaMes}
                    onChange={(e) => setFormData({ ...formData, firmaMes: e.target.value })}
                    placeholder="Mes"
                    className="border-b border-slate-400 font-bold bg-transparent text-slate-800 text-center text-xs pb-0.5 outline-hidden focus:border-slate-800 font-mono w-24" 
                  />
                  <span>de 20</span>
                  <input 
                    type="text" 
                    value={formData.firmaAnio}
                    onChange={(e) => setFormData({ ...formData, firmaAnio: e.target.value })}
                    className="border-b border-slate-400 font-bold bg-transparent text-slate-800 text-center text-xs pb-0.5 outline-hidden focus:border-slate-800 font-mono w-10" 
                  />
                </div>
              </div>

              {/* HAND SIGNPAD DRAW BOX (OR SEAL EMULATION) */}
              <div className="md:col-span-7 flex flex-col items-center justify-center">
                {formData.isSigned ? (
                  <div className="border border-emerald-300 bg-emerald-50/55 p-3.5 rounded-lg text-center w-full shadow-3xs flex flex-col items-center">
                    <ShieldCheck size={26} className="text-emerald-600 mb-1" />
                    <span className="text-[10px] font-black uppercase text-emerald-800 font-mono">Firma Certificada ClaveÚnica</span>
                    <span className="text-[8.5px] font-mono text-slate-500 mt-1 uppercase max-w-[280px] break-all">
                      {formData.signedStampCode}
                    </span>
                    <div className="bg-white border text-[8px] font-mono text-emerald-700 font-bold border-emerald-250 rounded-xs py-0.5 px-2 mt-2">
                      S.I.I. / UAF CONECTADO CON ÉXITO
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 bg-slate-50 p-6 rounded-lg text-center w-full flex flex-col items-center">
                    <Signature size={28} className="text-slate-400 mb-1.5" />
                    <button 
                      onClick={handleSignElectronic}
                      className="bg-slate-900 hover:bg-black text-white text-[11px] font-black tracking-wider uppercase font-mono py-1.5 px-4 rounded-md transition shadow-2xs cursor-pointer select-none"
                    >
                      Firmar con Certificado AssetFlow
                    </button>
                    <span className="text-[9px] text-slate-400 block mt-1 tracking-tight">Utiliza autenticación Ley 19.913</span>
                  </div>
                )}
              </div>
            </div>

            {/* COMPLETED REPORT SHADOW BAR */}
            <div className="border-t border-slate-100 pt-3 text-[9.5px] text-slate-400 font-mono text-center flex justify-between">
              <span>MUT_UAF_FORM_19913_REV2026.PDF</span>
              <span>ASSETFLOW CORPORACIÓN DE SEGUROS CHILE</span>
            </div>
          </div>
        </div>

        {/* MODAL BOTTOM BAR */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 flex justify-end gap-3 rounded-b-xl">
          <button 
            onClick={onClose} 
            className="border border-slate-350 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wider py-2.5 px-5 rounded-lg transition shrink-0 cursor-pointer"
          >
            Cancelar y Salir
          </button>
          
          <button 
            onClick={handleSaveForm}
            className="bg-[#0f172a] hover:bg-black text-white text-xs font-black uppercase tracking-wider py-2.5 px-6 rounded-lg transition-all flex items-center gap-2 shadow-md cursor-pointer shrink-0 select-none"
          >
            <Save size={14} className="text-emerald-400" /> Incorporar al Expediente Semanal
          </button>
        </div>
      </div>
    </div>
  );
};
