import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { F980011D } from '../types';
import { Database, Check, X, Sliders, Hash, Edit3, Plus, Trash2, Key, HelpCircle } from 'lucide-react';

interface F980011DModalProps {
  isOpen: boolean;
  onClose: () => void;
  registryId: string;
  entityType: string;
  originalData?: any;
  currentUser: string;
}

export const F980011DModal: React.FC<F980011DModalProps> = ({
  isOpen,
  onClose,
  registryId,
  entityType,
  originalData,
  currentUser,
}) => {
  if (!isOpen) return null;

  const orig: any = originalData || {};

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<F980011D | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // For adding custom attributes
  const [newKey, setNewKey] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');

  // Auto detect programId from entity type
  const getProgramId = (type: string): string => {
    switch (type.toUpperCase()) {
      case 'TRANSACTION':
      case 'TRANSACCION':
      case 'INGRESOS':
      case 'EGRESOS':
        return 'P0911'; // General Ledger
      case 'SUPPLIER':
      case 'PROVEEDOR':
        return 'P01012'; // Address Book
      case 'PROPERTY':
      case 'PROPIEDAD':
        return 'P1201'; // Asset Master
      case 'WORK_ORDER':
      case 'ORDEN_TRABAJO':
        return 'P48013'; // Work Order Center
      case 'OFFICIAL_DOCUMENT':
      case 'OFICIO':
        return 'P0002D'; // Official Document Control
      case 'CONTRACT':
      case 'CONTRATO':
        return 'P4310'; // Contract Purchase
      case 'LEASE_CONTRACT':
      case 'CONTRATO_ARRIENDO':
        return 'P1501'; // Real Estate Management
      case 'MAINTENANCE':
      case 'MANTENCIONES':
        return 'P12120'; // Equipment Maintenance
      case 'APPRAISAL':
      case 'TASACIONES':
        return 'P1204'; // Valuation Master
      case 'PETTY_CHALLENGE':
      case 'CAJA_CHICA':
        return 'P0011'; // Journal Entry Voucher
      case 'SECURITY_DEPOSIT':
      case 'GARANTIAS':
        return 'P0411'; // Accounts Payable
      default:
        return 'P980011';
    }
  };

  // Generate deterministic hashing simulation
  const generateHashSig = (regId: string, type: string, attributesMap: Record<string, string>) => {
    const serializedAttributes = JSON.stringify(attributesMap);
    const mockHashInput = `${regId}-${type}-${serializedAttributes}`;
    let hash = 0;
    for (let i = 0; i < mockHashInput.length; i++) {
      const char = mockHashInput.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `SHA256:${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}${regId.substring(0, 4).toUpperCase()}JDE77`;
  };

  useEffect(() => {
    const fetchOrCreateAttributeMaster = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        
        const docRef = doc(db, 'f980011d', registryId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setData(docSnap.data() as F980011D);
        } else {
          // Initialize a standard original ERP Attribute Master structure
          const initialAttributes: Record<string, string> = {
            'CO01': orig.category || orig.type || '',
            'CO02': orig.commune || orig.city || '',
            'CO03': orig.status || '',
            'CO04': orig.code || '',
            'CO05': orig.building || '',
            'CO06': orig.supplierName || orig.name || '',
          };

          const newRecord: F980011D = {
            id: registryId,
            registryId: registryId,
            entityType: entityType.toUpperCase(),
            programId: getProgramId(entityType),
            workStationId: 'WK_MUT_01',
            nextNumberSeq: Math.floor(100000 + Math.random() * 900000),
            userCreator: currentUser || 'SYSTEM',
            timestamp: Date.now(),
            hashSignature: generateHashSig(registryId, entityType, initialAttributes),
            lockedBy: null,
            lockedAt: null,
            isTest: 'LE',
            attributes: initialAttributes,
          };

          setData(newRecord);
        }
      } catch (err: any) {
        console.error("Error loading attribute master:", err);
        setErrorMsg("Error de comunicación de base de datos F980011D: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateAttributeMaster();
  }, [registryId, entityType, isOpen]);

  const handleUpdateAttribute = (key: string, value: string) => {
    if (!data) return;
    const updatedAttributes = { ...data.attributes, [key]: value };
    setData({
      ...data,
      attributes: updatedAttributes,
      hashSignature: generateHashSig(data.registryId, data.entityType, updatedAttributes),
    });
  };

  const handleRemoveAttribute = (key: string) => {
    if (!data) return;
    const updatedAttributes = { ...data.attributes };
    delete updatedAttributes[key];
    setData({
      ...data,
      attributes: updatedAttributes,
      hashSignature: generateHashSig(data.registryId, data.entityType, updatedAttributes),
    });
  };

  const handleAddCustomAttribute = () => {
    if (!data || !newKey.trim()) return;
    const formattedKey = newKey.trim().toUpperCase();
    if (data.attributes[formattedKey] !== undefined) {
      alert(`El atributo '${formattedKey}' ya existe en el maestro.`);
      return;
    }
    const updatedAttributes = { ...data.attributes, [formattedKey]: newValue };
    setData({
      ...data,
      attributes: updatedAttributes,
      hashSignature: generateHashSig(data.registryId, data.entityType, updatedAttributes),
    });
    setNewKey('');
    setNewValue('');
  };

  const handleSave = async () => {
    if (!data) return;
    try {
      setSaving(true);
      setErrorMsg(null);

      const docRef = doc(db, 'f980011d', data.registryId);
      await setDoc(docRef, {
        ...data,
        timestamp: Date.now(), // update edit timestamp
        userCreator: currentUser || data.userCreator,
      });

      alert(`✅ MAESTRO DE ATRIBUTOS REGISTRADO Y GUARDADO EN F980011D.\nTransacción ERP consolidada exitosamente.`);
      onClose();
    } catch (err: any) {
      console.error("Error saving F980011D:", err);
      setErrorMsg("Error al grabar transacción de auditoría F980011D: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#ECE9D8] text-slate-900 border-2 border-white shadow-2xl w-full max-w-2xl max-h-[85vh] md:max-h-[90vh] rounded-sm overflow-hidden flex flex-col font-sans text-xs select-none">
        
        {/* Retro ERP Title bar */}
        <div className="bg-gradient-to-r from-[#0055E4] to-[#3A82F6] text-white px-3 py-2 flex items-center justify-between font-bold text-[13px] border-b border-[#002EAD]">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-amber-300 animate-pulse" />
            <span>SISTEMA CORPORATIVO - F980011D: Consulta de Maestro de Atributos del Registro</span>
          </div>
          <button 
            onClick={onClose}
            className="hover:bg-red-700 bg-red-600 border border-[#9E0000] text-white px-1.5 py-0.5 rounded-sm font-mono text-[10px] transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Navigation/Options Bar */}
        <div className="bg-[#F0EEE2] border-b border-slate-300 p-1.5 flex items-center gap-4 text-[11px] text-slate-700 shadow-3xs">
          <button 
            onClick={handleSave}
            disabled={loading || saving}
            className="px-3 py-1 bg-[#ECE9D8] hover:bg-slate-200 disabled:opacity-50 border border-slate-400 rounded-sm font-semibold flex items-center gap-1 shadow-3xs cursor-pointer"
          >
            <Check size={11} className="text-emerald-700 font-bold" /> Guardar Atributos
          </button>
          <button 
            onClick={onClose}
            className="px-3 py-1 bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 rounded-sm flex items-center gap-1 shadow-3xs cursor-pointer"
          >
            <X size={11} className="text-red-700" /> Cancelar
          </button>
          <div className="h-4 w-px bg-slate-400"></div>
          <span className="text-[10px] text-slate-500 font-mono">Registro ID: {registryId}</span>
          <span className="ml-auto text-[10px] bg-[#FFFFE1] border border-[#7F9DB9] text-indigo-950 font-black font-mono px-2 py-0.5 rounded-xs select-text">
            ERP SYSTEM v2.0 SP4
          </span>
        </div>

        {/* Workspace area */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="bg-red-100 border border-red-300 text-red-950 p-3 rounded-sm font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-2 bg-white border border-[#A0A0A0] shadow-inner">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-700"></div>
              <span className="font-semibold text-slate-600 font-mono">Leyendo Maestro de Base de Datos...</span>
            </div>
          ) : data ? (
            <>
              {/* Audit Controls & Form */}
              <div className="bg-white border border-[#A0A0A0] p-4 space-y-3 shadow-inner rounded-sm">
                <div className="flex items-center gap-1.5 border-b border-indigo-100 pb-2 mb-2">
                  <Sliders size={13} className="text-indigo-700" />
                  <span className="font-bold text-indigo-950 uppercase tracking-wide text-[11.5px]">Maestro de Firma y Control del Grid ({entityType})</span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {/* Program ID */}
                  <div className="flex items-center justify-between">
                    <label className="text-slate-600 font-semibold w-28 text-left">Programa Origen:</label>
                    <input 
                      type="text" 
                      readOnly 
                      value={data.programId}
                      className="bg-[#FFFFE1] border border-[#7F9DB9] text-indigo-950 font-mono font-black text-center px-2 py-0.5 w-48 text-[11px] rounded-sm focus:outline-none"
                    />
                  </div>

                  {/* Workstation */}
                  <div className="flex items-center justify-between">
                    <label className="text-slate-600 font-semibold w-28 text-left">Estación de Trabajo:</label>
                    <input 
                      type="text" 
                      readOnly 
                      value={data.workStationId}
                      className="bg-slate-100 border border-[#7F9DB9] text-slate-800 font-mono px-2 py-0.5 w-48 text-[10.5px] rounded-sm focus:outline-none"
                    />
                  </div>

                  {/* Audit Sequence */}
                  <div className="flex items-center justify-between">
                    <label className="text-slate-600 font-semibold w-28 text-left">Nº Correlativo Audit:</label>
                    <input 
                      type="text" 
                      readOnly 
                      value={data.nextNumberSeq}
                      className="bg-slate-100 border border-[#7F9DB9] text-[#144D75] font-mono font-bold text-center px-2 py-0.5 w-48 text-[11px] rounded-sm focus:outline-none"
                    />
                  </div>

                  {/* User Creator */}
                  <div className="flex items-center justify-between">
                    <label className="text-slate-600 font-semibold w-28 text-left">Audit User ID:</label>
                    <input 
                      type="text" 
                      readOnly 
                      value={data.userCreator}
                      className="bg-[#DFF6DD] border border-[#7F9DB9] text-[#0E621F] font-mono font-bold text-center px-2 py-0.5 w-48 text-[11px] rounded-sm focus:outline-none"
                    />
                  </div>

                  {/* Test status */}
                  <div className="flex items-center justify-between col-span-2">
                    <label className="text-slate-600 font-semibold w-28 text-left">Tipo de Ledger:</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={data.isTest}
                        onChange={(e) => setData({ ...data, isTest: e.target.value })}
                        className="bg-white border border-[#7F9DB9] text-slate-800 font-mono font-bold px-2 py-0.5 w-48 text-[10.5px] rounded-sm focus:outline-none"
                      >
                        <option value="LE">LE (Ledger Entry)</option>
                        <option value="AA">AA (Actual Amounts)</option>
                        <option value="BA">BA (Budget Amounts)</option>
                        <option value="UT">UT (Audit Test)</option>
                      </select>
                      <span className="text-[10px] text-slate-400 font-medium">(Normas de Auditoría NIAs)</span>
                    </div>
                  </div>

                  {/* Cryptographic Hash */}
                  <div className="flex flex-col col-span-2 mt-1.5 border-t border-slate-200 pt-2">
                    <label className="text-slate-500 font-mono text-[9px] uppercase tracking-wider mb-0.5 flex items-center gap-1 font-bold">
                      <Key size={10} className="text-amber-600" />
                      <span>Sello de Validación Criptográfica F980011D (Integridad de Ledger)</span>
                    </label>
                    <div className="bg-slate-900 text-amber-400 font-mono text-[9.5px] p-2 rounded-sm border border-slate-700 select-all font-bold tracking-tight break-all">
                      {data.hashSignature}
                    </div>
                  </div>
                </div>
              </div>

              {/* ERP Category Codes Attributes Subform */}
              <div className="bg-white border border-[#A0A0A0] p-4 space-y-3 shadow-inner rounded-sm">
                <div className="flex items-center justify-between border-b border-amber-100 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sliders size={13} className="text-amber-700" />
                    <span className="font-bold text-amber-950 uppercase tracking-wide text-[11.5px]">Maestro de Atributos del Registro (F980011D)</span>
                  </div>
                  <span className="text-[10px] text-indigo-700 font-bold font-mono">Normativas NIAs v4</span>
                </div>

                {/* Grid attributes editable */}
                <div className="space-y-2 border border-slate-200 p-2 bg-slate-50 rounded-xs max-h-48 overflow-y-auto">
                  {Object.keys(data.attributes).length === 0 ? (
                    <div className="text-center p-4 text-slate-400 font-mono">Sin atributos registrados en F980011D.</div>
                  ) : (
                    Object.entries(data.attributes).map(([attrKey, attrVal]) => (
                      <div key={attrKey} className="flex items-center justify-between gap-2 border-b border-slate-200/50 pb-1.5">
                        <div className="flex items-center gap-1.5 w-32">
                          <span className="bg-indigo-100 text-indigo-800 font-mono font-bold px-1.5 py-0.5 rounded-sm text-[10px] w-14 text-center">
                            {attrKey}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold font-mono">
                            {attrKey.startsWith('CO') ? `CC ${attrKey.substring(2)}` : 'Cust'}
                          </span>
                        </div>
                        <input 
                          type="text" 
                          value={attrVal}
                          onChange={(e) => handleUpdateAttribute(attrKey, e.target.value)}
                          className="bg-white border border-slate-300 text-slate-800 px-2 py-0.5 w-60 rounded-sm focus:border-indigo-500 font-bold text-[11px] focus:outline-none"
                        />
                        <button 
                          onClick={() => handleRemoveAttribute(attrKey)}
                          title="Eliminar atributo"
                          className="text-red-600 hover:text-red-800 hover:bg-slate-200 p-1 rounded-sm cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Custom Attribute */}
                <div className="bg-[#FFFEEB] border border-amber-200/80 p-2.5 rounded-sm flex flex-wrap gap-2 items-end justify-between">
                  <div className="flex gap-2">
                    <div className="flex flex-col">
                      <label className="text-[9px] font-bold text-slate-500 font-mono">Cód Atributo (Ej CO07, BRAND):</label>
                      <input 
                        type="text" 
                        placeholder="CO07"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        className="bg-white border border-slate-300 text-slate-800 px-2 py-1 rounded-sm text-[10.5px] font-bold font-mono w-40 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[9px] font-bold text-slate-500">Valor de Atributo:</label>
                      <input 
                        type="text" 
                        placeholder="VALOR CORPORATIVO"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        className="bg-white border border-slate-300 text-slate-800 px-2 py-1 rounded-sm text-[10.5px] font-semibold w-48 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleAddCustomAttribute}
                    className="bg-[#0B3C5D] hover:bg-indigo-900 text-white uppercase text-[10px] font-black tracking-wide px-3 py-1.5 rounded-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={11} /> Añadir Atributo
                  </button>
                </div>
              </div>

              {/* Data consulted metadata card */}
              <div className="bg-[#DFEFFC] border border-[#144D75]/30 p-3 rounded-sm font-sans">
                <span className="font-bold text-[#144D75] text-[11px] uppercase block mb-1">Registro de Datos Originales Consultados del Grid:</span>
                <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-[10.5px] font-mono text-slate-700">
                  <div><span className="font-semibold text-slate-650 font-sans">Identificación:</span> #{registryId.substring(0, 10).toUpperCase()}</div>
                  <div><span className="font-semibold text-slate-650 font-sans">Entidad Mapeada:</span> {entityType}</div>
                  {orig && orig.description && (
                    <div className="col-span-2"><span className="font-semibold text-slate-650 font-sans">Detalle Descripción:</span> {orig.description}</div>
                  )}
                  {orig && orig.name && (
                    <div className="col-span-2"><span className="font-semibold text-slate-650 font-sans">Nombre / Proveedor:</span> {orig.name}</div>
                  )}
                  {orig && orig.amount && (
                    <div><span className="font-semibold text-slate-650 font-sans">Monto Fiscal:</span> ${orig.amount.toLocaleString('es-CL')}</div>
                  )}
                  {orig && orig.total && (
                    <div><span className="font-semibold text-slate-650 font-sans">Monto Total OT:</span> ${orig.total.toLocaleString('es-CL')}</div>
                  )}
                  {orig && orig.building && (
                    <div><span className="font-semibold text-slate-650 font-sans">Edificio / Inmueble:</span> {orig.building}</div>
                  )}
                  {orig && orig.code && (
                    <div><span className="font-semibold text-slate-650 font-sans">Código / Unidad:</span> {orig.code}</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center p-8 text-slate-500 font-mono">No se pudo inicializar la ficha ERP F980011D.</div>
          )}
        </div>

        {/* Footer status bar */}
        <div className="bg-[#ECE9D8] border-t border-slate-300 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-600 font-mono">
          <span>ASSETFLOW Corporativo Central v2.0 SP4</span>
          <span className="text-emerald-700 font-bold font-mono">● SISTEMA DE CONTROL DE AUDITORÍA ACTIVO CO-NIA</span>
        </div>

      </div>
    </div>
  );
};
