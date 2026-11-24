import React, { useState } from 'react';
import { ShieldCheck, Lock, ChevronRight, X, AlertCircle } from 'lucide-react';
import { LeaseContract } from '../types';
import { motion } from 'motion/react';
import { maskRUT } from '../lib/inputMasks';

interface TenantVerificationFormProps {
  contract: LeaseContract;
  onSuccess: (name: string, email: string, phone?: string) => void;
  onCancel: () => void;
}

const TenantVerificationForm: React.FC<TenantVerificationFormProps> = ({
  contract,
  onSuccess,
  onCancel
}) => {
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Strip non-alphanumeric chars for loose matching
  const cleanString = (str: string) => {
    return (str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!userInput.trim()) {
      setError('Por favor, ingrese un dato para verificar su identidad.');
      return;
    }

    setIsValidating(true);

    setTimeout(() => {
      const cleanUser = cleanString(userInput);
      const cleanTaxId = cleanString(contract.tenantTaxId);
      const cleanDocNumber = cleanString(contract.tenantDocNumber || '');

      // Check if user input matches RUT (loose match) or exact Serie
      const matchesTaxId = cleanTaxId.includes(cleanUser) || cleanUser.includes(cleanTaxId);
      const matchesDocNumber = cleanDocNumber && (cleanDocNumber === cleanUser);

      if (matchesTaxId || matchesDocNumber) {
        onSuccess(
          contract.tenantName,
          contract.tenantEmail || `${cleanString(contract.tenantName)}@demo-tenant.cl`,
          contract.tenantPhone
        );
      } else {
        setError('Verificación fallida. El RUT o Nº de Serie ingresado no coincide con el contrato registrado.');
      }
      setIsValidating(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800 text-center space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contrato Detectado</p>
        <p className="text-sm font-black text-emerald-400 uppercase tracking-wide truncate">{contract.tenantName}</p>
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Unidad: {contract.propertyLabel}</p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
            Validación de Seguridad:
          </label>
          <div className="relative">
            <input
              type="text"
              value={userInput}
              onChange={(e) => {
                const val = e.target.value;
                // If it starts with digits or looks like a RUT, apply maskRUT
                const isRutLike = /^[0-9.]/.test(val);
                const masked = isRutLike ? maskRUT(val) : val.toUpperCase();
                setUserInput(masked);
                if (error) setError('');
              }}
              placeholder="Ingrese RUT (ej: 12.345.678-9) o Nº Serie"
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-white placeholder-slate-600 rounded-xl px-4 py-3.5 text-xs font-mono font-medium focus:outline-none transition-all pr-10"
              disabled={isValidating}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-600">
              <Lock size={14} />
            </div>
          </div>
          <p className="text-[8px] text-slate-500 leading-normal">
            Ingrese el RUT completo del titular o el Número de Serie de la Cédula asociado para verificar su identidad.
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/30 border border-rose-900/50 p-3.5 rounded-xl text-rose-300 text-[10px] flex gap-2 items-start leading-normal">
            <AlertCircle size={14} className="shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
            disabled={isValidating}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-emerald-900/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
            disabled={isValidating}
          >
            {isValidating ? 'Validando...' : (
              <>
                Ingresar <ChevronRight size={12} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TenantVerificationForm;
