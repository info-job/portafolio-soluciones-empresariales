import React, { useState, useEffect, useId } from 'react';
import { 
  CheckCircle2, AlertCircle, AlertTriangle, Hash, 
  DollarSign, Mail, Phone, Calendar, ShieldCheck 
} from 'lucide-react';
import { 
  maskRUT, validateRUTDetailed, maskMoneyCLP, 
  maskPhoneCLP, validatePhoneCLP, cleanEmail, 
  validateEmail, maskFolioOrInvoice, validateFolioOrInvoice,
  validateURL, allowOnlyDigitsKey, allowOnlyRUTKey
} from '../../lib/inputMasks';

export type ValidatedInputType = 
  | 'rut' 
  | 'money' 
  | 'phone' 
  | 'email' 
  | 'folio' 
  | 'url'
  | 'text' 
  | 'date'
  | 'number';

export interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  label: string;
  type?: ValidatedInputType;
  value: string | number;
  onChange: (value: string, rawNumber?: number) => void;
  duplicateWarning?: string | null;
  helperText?: string;
  required?: boolean;
  minAmount?: number;
  maxAmount?: number;
  uppercase?: boolean;
  containerClassName?: string;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  duplicateWarning,
  helperText,
  required = false,
  minAmount,
  maxAmount,
  uppercase = false,
  className = '',
  containerClassName = '',
  placeholder,
  disabled,
  onKeyDown,
  ...restProps
}) => {
  const inputId = useId();
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate on value or type change
  useEffect(() => {
    const strVal = value !== undefined && value !== null ? String(value) : '';
    
    if (required && touched && !strVal.trim()) {
      setError('Este campo es obligatorio.');
      return;
    }

    if (!strVal.trim()) {
      setError(null);
      return;
    }

    switch (type) {
      case 'rut': {
        const res = validateRUTDetailed(strVal);
        setError(res.error);
        break;
      }
      case 'email': {
        const res = validateEmail(strVal);
        setError(res.error);
        break;
      }
      case 'phone': {
        const res = validatePhoneCLP(strVal);
        setError(res.error);
        break;
      }
      case 'folio': {
        const res = validateFolioOrInvoice(strVal);
        setError(res.error);
        break;
      }
      case 'url': {
        const res = validateURL(strVal);
        setError(res.error);
        break;
      }
      case 'money': {
        const num = typeof value === 'number' ? value : parseInt(strVal.replace(/\D/g, '') || '0', 10);
        if (minAmount !== undefined && num < minAmount) {
          setError(`El monto mínimo permitido es $ ${minAmount.toLocaleString('es-CL')}`);
        } else if (maxAmount !== undefined && num > maxAmount) {
          setError(`El monto excede el tope máximo de $ ${maxAmount.toLocaleString('es-CL')}`);
        } else {
          setError(null);
        }
        break;
      }
      default:
        setError(null);
    }
  }, [value, type, required, touched, minAmount, maxAmount]);

  // Handle formatted input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTouched(true);

    switch (type) {
      case 'rut': {
        const masked = maskRUT(raw);
        onChange(masked);
        break;
      }
      case 'money': {
        const { rawNumber, formatted } = maskMoneyCLP(raw);
        onChange(formatted, rawNumber);
        break;
      }
      case 'phone': {
        const masked = maskPhoneCLP(raw);
        onChange(masked);
        break;
      }
      case 'email': {
        const cleaned = cleanEmail(raw);
        onChange(cleaned);
        break;
      }
      case 'folio': {
        const masked = maskFolioOrInvoice(raw);
        onChange(masked);
        break;
      }
      default: {
        onChange(uppercase ? raw.toUpperCase() : raw);
      }
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (type === 'money' || type === 'number') {
      allowOnlyDigitsKey(e);
    } else if (type === 'rut') {
      allowOnlyRUTKey(e);
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'rut':
        return <ShieldCheck size={14} className="text-slate-400" />;
      case 'money':
        return <DollarSign size={14} className="text-emerald-600" />;
      case 'phone':
        return <Phone size={14} className="text-sky-600" />;
      case 'email':
        return <Mail size={14} className="text-indigo-600" />;
      case 'folio':
        return <Hash size={14} className="text-amber-600" />;
      case 'date':
        return <Calendar size={14} className="text-slate-400" />;
      default:
        return null;
    }
  };

  const strVal = value !== undefined && value !== null ? String(value) : '';
  const hasValue = strVal.trim().length > 0;
  const isValid = hasValue && !error && !duplicateWarning;

  let borderColor = 'border-slate-200 focus:border-[#006D3D]';
  if (duplicateWarning) {
    borderColor = 'border-amber-400 bg-amber-50/30 focus:border-amber-500';
  } else if (touched && error) {
    borderColor = 'border-rose-400 bg-rose-50/20 focus:border-rose-500';
  } else if (isValid) {
    borderColor = 'border-emerald-400 focus:border-emerald-600';
  }

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      <div className="flex items-center justify-between px-1">
        <label htmlFor={inputId} className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
          {getIcon()}
          <span>{label}</span>
          {required && <span className="text-rose-500 text-[11px]">*</span>}
        </label>

        {/* Live validation badge */}
        {duplicateWarning ? (
          <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse border border-amber-300">
            <AlertTriangle size={11} className="text-amber-600" /> Duplicado
          </span>
        ) : touched && error ? (
          <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200">
            <AlertCircle size={11} className="text-rose-600" /> Inválido
          </span>
        ) : isValid ? (
          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
            <CheckCircle2 size={11} className="text-emerald-600" /> Válido
          </span>
        ) : null}
      </div>

      <div className="relative">
        <input
          id={inputId}
          type={type === 'date' ? 'date' : 'text'}
          value={value}
          onChange={handleChange}
          onKeyDown={handleCustomKeyDown}
          onBlur={() => setTouched(true)}
          disabled={disabled}
          placeholder={
            placeholder || 
            (type === 'rut' ? '12.345.678-K' : 
             type === 'money' ? '$ 0' : 
             type === 'phone' ? '+56 9 1234 5678' : 
             type === 'email' ? 'nombre@empresa.cl' : 
             type === 'folio' ? 'DOC-001' : '')
          }
          className={`w-full bg-slate-50 border-2 rounded-2xl px-4 py-3 text-xs font-bold outline-none transition-all ${
            type === 'rut' || type === 'money' || type === 'folio' ? 'font-mono' : ''
          } ${borderColor} ${className}`}
          {...restProps}
        />
      </div>

      {/* Warning or Error feedback message */}
      {duplicateWarning ? (
        <p className="text-[9.5px] font-bold text-amber-700 flex items-center gap-1 mt-1 px-1 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
          <AlertTriangle size={13} className="shrink-0 text-amber-600" />
          <span>{duplicateWarning}</span>
        </p>
      ) : touched && error ? (
        <p className="text-[9.5px] font-bold text-rose-600 flex items-center gap-1 mt-0.5 px-1">
          <AlertCircle size={12} className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[9px] text-slate-400 font-medium px-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

export default ValidatedInput;
