/**
 * Input Masks, Formatters and Real-Time Anti-Monkey Validation Engine
 * Diseñado específicamente para garantizar integridad total de datos (RUT, Dinero CLP, Teléfonos, Folios, Emails, Fechas)
 * y prevenir duplicidades e inconsistencias en tiempo real.
 */

import type React from 'react';
import { validateRUT as baseValidateRUT, formatRUT as baseFormatRUT } from './chileanUtils';

/**
 * 1. MÁSCARA Y VALIDACIÓN DE RUT CHILENO
 */
export const cleanRUTString = (val: string): string => {
  if (!val) return '';
  return val.replace(/[^0-9kK]/g, '').toUpperCase();
};

export const maskRUT = (val: string): string => {
  const clean = cleanRUTString(val);
  if (!clean) return '';
  if (clean.length > 9) {
    // Truncar al máximo legal chileno (8 dígitos + DV)
    return baseFormatRUT(clean.slice(0, 9));
  }
  return baseFormatRUT(clean);
};

export interface RUTValidationResult {
  isValid: boolean;
  clean: string;
  formatted: string;
  error: string | null;
}

export const validateRUTDetailed = (val: string): RUTValidationResult => {
  const clean = cleanRUTString(val);
  if (!clean) {
    return { isValid: false, clean: '', formatted: '', error: 'El RUT es obligatorio.' };
  }
  if (clean.length < 8) {
    return { isValid: false, clean, formatted: val, error: 'RUT incompleto (mínimo 7 dígitos más dígito verificador).' };
  }
  if (clean.length > 9) {
    return { isValid: false, clean, formatted: val, error: 'RUT excede el largo legal permitido.' };
  }

  const isValid = baseValidateRUT(clean);
  if (!isValid) {
    return {
      isValid: false,
      clean,
      formatted: baseFormatRUT(clean),
      error: 'Dígito verificador incorrecto (Algoritmo Módulo 11 inválido).'
    };
  }

  return {
    isValid: true,
    clean,
    formatted: baseFormatRUT(clean),
    error: null
  };
};

/**
 * 2. MÁSCARA Y FORMATEO DE MONTO EN PESOS CHILENOS (CLP)
 */
export const cleanNumericString = (val: string | number): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  if (!val) return 0;
  const digitsOnly = val.toString().replace(/[^0-9]/g, '');
  const parsed = parseInt(digitsOnly, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export const maskMoneyCLP = (val: string | number): { rawNumber: number; formatted: string } => {
  const rawNumber = cleanNumericString(val);
  const formatted = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(rawNumber);

  return { rawNumber, formatted };
};

export const formatMoneyCompact = (amount: number): string => {
  if (amount >= 1000000) {
    return `$ ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$ ${(amount / 1000).toFixed(0)}k`;
  }
  return `$ ${amount}`;
};

/**
 * 3. MÁSCARA Y VALIDACIÓN DE TELÉFONO CHILENO (+56 9 XXXX XXXX)
 */
export const maskPhoneCLP = (val: string): string => {
  if (!val) return '';
  // Extraer sólo números
  const digits = val.replace(/\D/g, '');
  
  // Remover prefijo 56 si el usuario lo tipeó
  let coreDigits = digits;
  if (digits.startsWith('56')) {
    coreDigits = digits.slice(2);
  }

  if (coreDigits.length === 0) return '';
  
  // Si comienza con 9 (móvil estándar)
  if (coreDigits.length <= 1) {
    return `+56 ${coreDigits}`;
  }
  if (coreDigits.length <= 5) {
    return `+56 9 ${coreDigits.slice(1)}`;
  }
  return `+56 9 ${coreDigits.slice(1, 5)} ${coreDigits.slice(5, 9)}`;
};

export const validatePhoneCLP = (val: string): { isValid: boolean; error: string | null } => {
  if (!val) return { isValid: false, error: 'Teléfono es requerido.' };
  const digits = val.replace(/\D/g, '');
  // Aceptable: 9 dígitos nacionales o 11 dígitos con código país (569XXXXXXXX)
  if (digits.length === 9 || (digits.length === 11 && digits.startsWith('56'))) {
    return { isValid: true, error: null };
  }
  return { isValid: false, error: 'Ingrese un número móvil válido de 9 dígitos (+56 9 XXXX XXXX).' };
};

/**
 * 4. VALIDACIÓN DE EMAIL
 */
export const cleanEmail = (val: string): string => {
  if (!val) return '';
  return val.trim().toLowerCase();
};

export const validateEmail = (val: string): { isValid: boolean; error: string | null } => {
  if (!val) return { isValid: false, error: 'Correo electrónico es requerido.' };
  const clean = cleanEmail(val);
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (regex.test(clean)) {
    return { isValid: true, error: null };
  }
  return { isValid: false, error: 'Formato de correo inválido (ej: usuario@dominio.cl).' };
};

/**
 * 5. MÁSCARA Y VALIDACIÓN DE FOLIOS / FACTURAS / CÓDIGOS
 */
export const maskFolioOrInvoice = (val: string): string => {
  if (!val) return '';
  // Remover caracteres raros o peligrosos, conservar mayúsculas, números, guiones y barras
  return val.toUpperCase().replace(/[^A-Z0-9\-_./# ]/g, '').trimStart();
};

export const validateFolioOrInvoice = (val: string): { isValid: boolean; error: string | null } => {
  if (!val || val.trim().length === 0) {
    return { isValid: false, error: 'Identificador / Nº de Documento es requerido.' };
  }
  if (val.trim().length < 2) {
    return { isValid: false, error: 'Debe contener al menos 2 caracteres.' };
  }
  return { isValid: true, error: null };
};

/**
 * 5.1 VALIDACIÓN DE URL DE PORTALES Y ENLACES EXTERNOS
 */
export const validateURL = (val: string): { isValid: boolean; error: string | null } => {
  if (!val || !val.trim()) {
    return { isValid: false, error: 'La URL es requerida.' };
  }
  const clean = val.trim();
  try {
    const parsed = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Debe ser un enlace web válido (http/https).' };
    }
    return { isValid: true, error: null };
  } catch {
    return { isValid: false, error: 'Formato de enlace web o URL inválido.' };
  }
};

/**
 * 5.2 BLOQUEADORES DE TECLADO EN TIEMPO REAL (ANTI-SIMIO GUARDS)
 */
export const allowOnlyDigitsKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
  // Allow navigation, delete, backspace, tab, enter
  if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
    return;
  }
  if (e.ctrlKey || e.metaKey) return;
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

export const allowOnlyRUTKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
  if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
    return;
  }
  if (e.ctrlKey || e.metaKey) return;
  // Allow digits, dots, dash, and k/K
  if (!/^[0-9kK.\-]$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * 6. VALIDACIÓN DE RANGO DE FECHAS
 */
export const validateDateRange = (startDate: string, endDate: string): { isValid: boolean; error: string | null } => {
  if (!startDate) return { isValid: false, error: 'Fecha de inicio es obligatoria.' };
  if (!endDate) return { isValid: false, error: 'Fecha de término es obligatoria.' };

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  if (isNaN(start) || isNaN(end)) {
    return { isValid: false, error: 'Fecha con formato inválido.' };
  }

  if (end < start) {
    return { isValid: false, error: 'La fecha de término no puede ser anterior a la fecha de inicio.' };
  }

  return { isValid: true, error: null };
};

/**
 * 7. DETECTOR DE DUPLICIDADES EN TIEMPO REAL
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedName?: string;
  matchedFolio?: string;
  warningMessage?: string;
}

/**
 * Verifica si un RUT ya está registrado en una colección
 */
export const checkDuplicateRUT = <T extends { taxId?: string; id?: string; name?: string; tenantName?: string }>(
  rut: string,
  existingList: T[],
  currentId?: string
): DuplicateCheckResult => {
  const clean = cleanRUTString(rut);
  if (!clean || clean.length < 8) return { isDuplicate: false };

  const match = existingList.find(item => {
    if (currentId && item.id === currentId) return false;
    const itemClean = cleanRUTString(item.taxId || '');
    return itemClean === clean;
  });

  if (match) {
    const name = match.name || match.tenantName || 'Registro Existente';
    return {
      isDuplicate: true,
      matchedName: name,
      warningMessage: `⚠️ DUPLICIDAD DETECTADA: El RUT ${baseFormatRUT(clean)} ya se encuentra registrado para "${name}".`
    };
  }

  return { isDuplicate: false };
};

/**
 * Verifica si una factura / folio ya fue asignado en otra OT
 */
export const checkDuplicateInvoice = <T extends { associatedInvoice?: string; id?: string; folio?: string; supplierName?: string }>(
  invoiceNum: string,
  existingWorkOrders: T[],
  currentId?: string
): DuplicateCheckResult => {
  const clean = invoiceNum ? invoiceNum.trim().toUpperCase() : '';
  if (!clean || clean.length < 3) return { isDuplicate: false };

  const match = existingWorkOrders.find(wo => {
    if (currentId && wo.id === currentId) return false;
    const inv = (wo.associatedInvoice || '').trim().toUpperCase();
    return inv === clean;
  });

  if (match) {
    return {
      isDuplicate: true,
      matchedFolio: match.folio,
      matchedName: match.supplierName,
      warningMessage: `⚠️ DUPLICIDAD: La factura "${clean}" ya fue registrada en la OT Folio ${match.folio || 'N/A'} (${match.supplierName || 'Proveedor'}).`
    };
  }

  return { isDuplicate: false };
};

/**
 * Verifica si un código de propiedad ya existe
 */
export const checkDuplicatePropertyCode = <T extends { code?: string; id?: string; building?: string; floor?: string }>(
  code: string,
  existingProperties: T[],
  currentId?: string
): DuplicateCheckResult => {
  const clean = code ? code.trim().toUpperCase() : '';
  if (!clean) return { isDuplicate: false };

  const match = existingProperties.find(p => {
    if (currentId && p.id === currentId) return false;
    return (p.code || '').trim().toUpperCase() === clean;
  });

  if (match) {
    return {
      isDuplicate: true,
      matchedName: `${match.building || 'Inmueble'} Piso ${match.floor || 'S/N'}`,
      warningMessage: `⚠️ CÓDIGO EXISTENTE: El código "${clean}" ya pertenece a ${match.building || 'la unidad'}.`
    };
  }

  return { isDuplicate: false };
};

/**
 * Verifica si un folio o número de documento ya existe en una lista
 */
export const checkDuplicateFolio = <T extends { folio?: string; documentNumber?: string; id?: string; name?: string }>(
  folio: string,
  existingList: T[],
  currentId?: string
): DuplicateCheckResult => {
  const clean = folio ? folio.trim().toUpperCase() : '';
  if (!clean || clean.length < 2) return { isDuplicate: false };

  const match = existingList.find(item => {
    if (currentId && item.id === currentId) return false;
    const itemFolio = (item.folio || item.documentNumber || '').trim().toUpperCase();
    return itemFolio === clean;
  });

  if (match) {
    return {
      isDuplicate: true,
      matchedFolio: match.folio || match.documentNumber,
      matchedName: match.name,
      warningMessage: `⚠️ FOLIO EXISTENTE: El folio "${clean}" ya se encuentra registrado.`
    };
  }

  return { isDuplicate: false };
};

/**
 * Verifica si una oferta laboral ya existe en la lista para evitar duplicados
 */
export const checkDuplicateJobOffer = <T extends { id?: string; title?: string; company?: string; portalUrl?: string }>(
  title: string,
  company: string,
  portalUrl: string,
  existingList: T[],
  currentId?: string
): DuplicateCheckResult => {
  const cleanTitle = (title || '').trim().toLowerCase();
  const cleanCompany = (company || '').trim().toLowerCase();
  const cleanUrl = (portalUrl || '').trim().toLowerCase();

  if (!cleanTitle && !cleanUrl) return { isDuplicate: false };

  const match = existingList.find(offer => {
    if (currentId && offer.id === currentId) return false;
    const sameUrl = cleanUrl && offer.portalUrl && offer.portalUrl.trim().toLowerCase() === cleanUrl;
    const sameTitleAndCompany = cleanTitle && cleanCompany &&
      (offer.title || '').trim().toLowerCase() === cleanTitle &&
      (offer.company || '').trim().toLowerCase() === cleanCompany;
    return sameUrl || sameTitleAndCompany;
  });

  if (match) {
    return {
      isDuplicate: true,
      matchedName: `${match.title} en ${match.company}`,
      warningMessage: `⚠️ OFERTA DUPLICADA: Ya existe una vacante registrada para "${match.title}" en "${match.company}".`
    };
  }

  return { isDuplicate: false };
};

