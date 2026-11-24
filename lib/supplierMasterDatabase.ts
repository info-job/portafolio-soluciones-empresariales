import {
  Supplier,
  AddressBookMasterRecord,
  AddressByDateRecord,
  SupplierContactRecord,
  SupplierMasterF0401Record,
  BankTransitMasterRecord,
  AddressBookSearchType
} from '../types';
import { storage } from './storageEngine';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { prepareRecordForFirestore, isFirestoreQuotaExceeded, isQuotaError, markFirestoreQuotaExceeded } from './storage';

export const CHILE_BANK_SBIF_CODES: Record<string, string> = {
  'BANCO DE CHILE': '001',
  'BANCO ESTADO': '012',
  'SANTANDER': '037',
  'BCI': '016',
  'SCOTIABANK': '014',
  'ITAU': '039',
  'OTRO / INTERNACIONAL': '999'
};

export const BUSINESS_UNITS_MCU = [
  { code: '100-INMOB', label: '100-INMOB · División Activos Inmobiliarios y Renta' },
  { code: '200-MANT', label: '200-MANT · Ingeniería, Mantención y Obras Civiles' },
  { code: '300-ADMIN', label: '300-ADMIN · Administración Central y Finanzas' },
  { code: '400-SEGUROS', label: '400-SEGUROS · Pólizas, Siniestros y Tasaciones' }
];

export const SEARCH_TYPES_AT1: { code: AddressBookSearchType; label: string; description: string }[] = [
  { code: 'V', label: 'V · Proveedor Nacional', description: 'Persona jurídica o comercial nacional afecta/exenta de IVA' },
  { code: 'VC', label: 'VC · Contratista de Obras', description: 'Especialista técnico de mantención, construcción o remodelación' },
  { code: 'VH', label: 'VH · Honorarios / Profesional', description: 'Prestador de servicios independiente con retención SII' },
  { code: 'VF', label: 'VF · Entidad de Factoring', description: 'Cesionario financiero autorizado para cobro de facturas cedidas' },
  { code: 'VE', label: 'VE · Proveedor Extranjero', description: 'Proveedor internacional de software, licencias o equipamiento' }
];

export const GL_CLASS_CODES_APC: { code: 'PCNAC' | 'PCHON' | 'PCFAC' | 'PCGAR'; label: string; account: string }[] = [
  { code: 'PCNAC', label: 'PCNAC · Cuentas por Pagar Proveedores Nacionales', account: '2101-01-001' },
  { code: 'PCHON', label: 'PCHON · Honorarios por Pagar y Retención Impuesto', account: '2101-02-005' },
  { code: 'PCFAC', label: 'PCFAC · Obligaciones por Facturas Cedidas (Factoring)', account: '2101-03-010' },
  { code: 'PCGAR', label: 'PCGAR · Retenciones por Garantía de Buena Ejecución', account: '2105-01-002' }
];

export const EXPENSE_ACCOUNTS_CATALOG = [
  { code: '5101-01', label: '5101-01 · Mantención y Reparación de Propiedades' },
  { code: '5101-02', label: '5101-02 · Servicios de Plomería, Gasfitería y Redes' },
  { code: '5101-03', label: '5101-03 · Reparación de Techumbres e Impermeabilización' },
  { code: '5101-04', label: '5101-04 · Pintura, Alfombras y Terminaciones' },
  { code: '5102-01', label: '5102-01 · Consumos Básicos y Gastos Comunes' },
  { code: '5103-01', label: '5103-01 · Honorarios Legales, Tasaciones y Consultorías' },
  { code: '5104-01', label: '5104-01 · Insumos, Equipos y Servicios Generales' },
  { code: '1205-01', label: '1205-01 · Mejoras Capitalizables CAPEX en Inmuebles' }
];

export const CHILE_REGIONS = [
  { code: 'RM', name: 'Región Metropolitana de Santiago' },
  { code: 'V', name: 'Región de Valparaíso' },
  { code: 'VIII', name: 'Región del Biobío' },
  { code: 'I', name: 'Región de Tarapacá' },
  { code: 'II', name: 'Región de Antofagasta' },
  { code: 'IV', name: 'Región de Coquimbo' },
  { code: 'VI', name: 'Región de O’Higgins' },
  { code: 'VII', name: 'Región del Maule' },
  { code: 'IX', name: 'Región de La Araucanía' },
  { code: 'X', name: 'Región de Los Lagos' },
  { code: 'XIV', name: 'Región de Los Ríos' },
  { code: 'XV', name: 'Región de Arica y Parinacota' },
  { code: 'III', name: 'Región de Atacama' },
  { code: 'XVI', name: 'Región de Ñuble' },
  { code: 'XI', name: 'Región de Aysén' },
  { code: 'XII', name: 'Región de Magallanes' }
];

/**
 * Calcula un Número Único de Libro de Direcciones (AN8) determinista o secuencial (rango 800101+)
 */
export function resolveAddressNumberAN8(supplier: Supplier, indexHint: number = 0, allSuppliers: Supplier[] = []): number {
  if (supplier.addressNumber && supplier.addressNumber >= 800000) {
    return supplier.addressNumber;
  }
  if (supplier.f0101AddressBook?.addressNumber && supplier.f0101AddressBook.addressNumber >= 800000) {
    return supplier.f0101AddressBook.addressNumber;
  }
  const folioDigits = parseInt(String(supplier.folio || '').replace(/[^0-9]/g, ''), 10);
  if (!isNaN(folioDigits) && folioDigits > 0) {
    return 800000 + folioDigits;
  }
  const maxExisting = allSuppliers.reduce((max, s) => {
    const an8 = s.addressNumber || s.f0101AddressBook?.addressNumber || 0;
    return an8 > max ? an8 : max;
  }, 800100);
  return maxExisting + indexHint + 1;
}

/**
 * Genera el próximo AN8 disponible en la tabla maestra F0101
 */
export function getNextAvailableAN8(suppliers: Supplier[]): number {
  const maxAN8 = suppliers.reduce((max, s, idx) => {
    const an8 = resolveAddressNumberAN8(s, idx, suppliers);
    return an8 > max ? an8 : max;
  }, 800100);
  return maxAN8 + 1;
}

/**
 * Hidrata de forma completa las 5 tablas relacionales (F0101, F0116, F0111, F0401, F0030)
 * para cualquier proveedor existente o recién creado.
 */
export function hydrateSupplierRelationalTables(supplier: Supplier, indexHint: number = 0, allSuppliers: Supplier[] = []): {
  enrichedSupplier: Supplier;
  f0101: AddressBookMasterRecord;
  f0116List: AddressByDateRecord[];
  f0111List: SupplierContactRecord[];
  f0401: SupplierMasterF0401Record;
  f0030List: BankTransitMasterRecord[];
} {
  const an8 = resolveAddressNumberAN8(supplier, indexHint, allSuppliers);
  const nowIso = new Date(supplier.timestamp || Date.now()).toISOString();
  const datePart = supplier.requestDate || nowIso.split('T')[0];
  const timePart = nowIso.split('T')[1]?.slice(0, 8) || '09:00:00';

  const inferredSearchType: AddressBookSearchType =
    supplier.searchType ||
    (supplier.isAssigned ? 'VF' : supplier.taxDocumentType === 'BOLETA_HONORARIOS' ? 'VH' : supplier.category?.includes('CONSTRUCCIÓN') || supplier.category?.includes('MANTENCIÓN') ? 'VC' : 'V');

  const f0101: AddressBookMasterRecord = supplier.f0101AddressBook || {
    id: supplier.id,
    addressNumber: an8,
    taxId: supplier.taxId,
    alphaName: (supplier.alphaName || supplier.name || '').slice(0, 40).toUpperCase(),
    mailingName: (supplier.name || '').toUpperCase(),
    searchType: inferredSearchType,
    industryClassification: supplier.industryClassification || supplier.category || 'SERVICIOS GENERALES',
    businessUnit: supplier.businessUnit || (supplier.category?.includes('MANTENCIÓN') || supplier.category?.includes('CONSTRUCCIÓN') ? '200-MANT' : '100-INMOB'),
    payablesFlag: supplier.status === 'ACTIVE' ? 'Y' : supplier.status === 'REJECTED' || supplier.status === 'BLOCKED' ? 'N' : 'H',
    receivablesFlag: 'N',
    employeeFlag: 'N',
    catCode01: supplier.region || 'RM',
    catCode02: supplier.category || 'GENERAL',
    catCode03: supplier.taxDocumentType === 'BOLETA_HONORARIOS' ? 'PROFESIONAL' : 'PYME',
    catCode04: supplier.dueDiligenceRisk === 'RIESGO ALTO' ? 'CRITICO' : 'ESTANDAR',
    catCode05: supplier.dueDiligenceRisk === 'RIESGO BAJO' ? 'BAJO' : supplier.dueDiligenceRisk === 'RIESGO ALTO' ? 'ALTO' : 'MEDIO',
    userId: supplier.userCreator || 'SISTEMA',
    programId: 'P01012',
    workStationId: 'WRK-ASSETFLOW-01',
    updatedDate: datePart,
    updatedTime: timePart
  };

  const f0116List: AddressByDateRecord[] =
    supplier.f0116Addresses && supplier.f0116Addresses.length > 0
      ? supplier.f0116Addresses
      : [
          {
            id: `f0116-${supplier.id}-1`,
            supplierId: supplier.id,
            addressNumber: an8,
            effectiveDate: datePart,
            addressType: 'CASA_MATRIZ',
            addressLine1: supplier.address || 'AV. APOQUINDO 4501 OF. 1202',
            addressLine2: 'CASA MATRIZ COMERCIAL',
            commune: supplier.commune || 'SANTIAGO',
            city: supplier.city || 'SANTIAGO',
            region: supplier.region || 'RM',
            postalCode: '7550000',
            country: 'CL',
            isPrimary: true
          }
        ];

  const f0111List: SupplierContactRecord[] =
    supplier.f0111Contacts && supplier.f0111Contacts.length > 0
      ? supplier.f0111Contacts
      : [
          {
            id: `f0111-${supplier.id}-0`,
            supplierId: supplier.id,
            addressNumber: an8,
            lineId: 0,
            contactType: 'REP_LEGAL',
            fullName: supplier.contactName || 'REPRESENTANTE LEGAL',
            contactTaxId: supplier.taxId,
            jobTitle: 'REPRESENTANTE LEGAL / EJECUTIVO TITULAR',
            phonePrimary: supplier.phone || '+56900000000',
            electronicAddress: supplier.email || 'contacto@proveedor.cl',
            canSignContracts: true,
            isPrimary: true
          }
        ];

  const defaultExpenseAcc =
    supplier.category === 'MANTENCIÓN TÉCNICA' || supplier.category === 'CONSTRUCCIÓN Y OBRAS'
      ? '5101-01'
      : supplier.category === 'SERVICIOS BÁSICOS'
      ? '5102-01'
      : supplier.category === 'CONSULTORÍAS' || supplier.category === 'SERVICIO DE TASACIONES'
      ? '5103-01'
      : '5104-01';

  const f0401: SupplierMasterF0401Record = supplier.f0401Purchasing || {
    id: supplier.id,
    addressNumber: an8,
    glClassCode: supplier.isAssigned ? 'PCFAC' : supplier.taxDocumentType === 'BOLETA_HONORARIOS' ? 'PCHON' : 'PCNAC',
    defaultExpenseAccount: defaultExpenseAcc,
    paymentTermsCode: '30 DÍAS FECHA FACTURA',
    paymentInstrument: 'T',
    taxExplanationCode: supplier.taxDocumentType === 'BOLETA_HONORARIOS' ? 'BH' : 'IVA',
    withholdingTaxPct: supplier.taxDocumentType === 'BOLETA_HONORARIOS' ? 13.75 : 0,
    currencyCode: 'CLP',
    minOrderAmount: 50000,
    maxOrderAmount: 25000000,
    holdPaymentCode: supplier.status === 'ACTIVE' ? '00' : '01',
    threeWayMatchRequired: true,
    voucherPerInvoice: true,
    factoringAllowed: !!supplier.isAssigned,
    defaultFactoringEntity: supplier.assignedToEntity || '',
    updatedAt: supplier.timestamp || Date.now()
  };

  const f0030List: BankTransitMasterRecord[] =
    supplier.f0030BankAccounts && supplier.f0030BankAccounts.length > 0
      ? supplier.f0030BankAccounts
      : [
          {
            id: `f0030-${supplier.id}-1`,
            supplierId: supplier.id,
            addressNumber: an8,
            recordType: supplier.isAssigned ? 'F' : 'V',
            bankCode: CHILE_BANK_SBIF_CODES[supplier.bankName] || '001',
            bankName: supplier.bankName || 'BANCO DE CHILE',
            accountType: supplier.accountType || 'CUENTA CORRIENTE',
            accountNumber: supplier.accountNumber || '00-000-00000-00',
            holderRut: supplier.taxId,
            holderName: supplier.isAssigned && supplier.assignedToEntity ? supplier.assignedToEntity : supplier.name,
            remittanceEmail: supplier.email || 'pagos@proveedor.cl',
            prenoteStatus: supplier.status === 'ACTIVE' ? 'A' : 'P',
            isDefault: true
          }
        ];

  const primaryAddr = f0116List.find((a) => a.isPrimary) || f0116List[0];

  const enrichedSupplier: Supplier = {
    ...supplier,
    addressNumber: an8,
    alphaName: f0101.alphaName,
    searchType: f0101.searchType,
    businessUnit: f0101.businessUnit,
    industryClassification: f0101.industryClassification,
    address: primaryAddr?.addressLine1 || supplier.address,
    commune: primaryAddr?.commune || supplier.commune,
    city: primaryAddr?.city || supplier.city,
    region: primaryAddr?.region || supplier.region,
    f0101AddressBook: f0101,
    f0116Addresses: f0116List,
    f0111Contacts: f0111List,
    f0401Purchasing: f0401,
    f0030BankAccounts: f0030List
  };

  return {
    enrichedSupplier,
    f0101,
    f0116List,
    f0111List,
    f0401,
    f0030List
  };
}

/**
 * Sincroniza todas las tablas relacionales de todos los proveedores en IndexedDB local
 * y guarda individualmente el proveedor modificado en Firestore cuando hay cuota disponible.
 */
export async function syncSupplierRelationalTablesToDatabase(
  allSuppliers: Supplier[],
  targetSupplier?: Supplier
): Promise<void> {
  const f0101All: AddressBookMasterRecord[] = [];
  const f0116All: AddressByDateRecord[] = [];
  const f0111All: SupplierContactRecord[] = [];
  const f0401All: SupplierMasterF0401Record[] = [];
  const f0030All: BankTransitMasterRecord[] = [];

  allSuppliers.forEach((s, idx) => {
    const hydrated = hydrateSupplierRelationalTables(s, idx, allSuppliers);
    f0101All.push(hydrated.f0101);
    f0116All.push(...hydrated.f0116List);
    f0111All.push(...hydrated.f0111List);
    f0401All.push(hydrated.f0401);
    f0030All.push(...hydrated.f0030List);
  });

  // 1. Guardar las 5 tablas normalizadas en Bóveda Local IndexedDB
  await storage.saveMultiple([
    { storeName: 'addressBookF0101', data: f0101All },
    { storeName: 'supplierAddressesF0116', data: f0116All },
    { storeName: 'supplierContactsF0111', data: f0111All },
    { storeName: 'supplierMasterF0401', data: f0401All },
    { storeName: 'supplierBanksF0030', data: f0030All }
  ]);

  // 2. Si se indicó un proveedor objetivo y hay cuota en Firestore, sincronizar sus registros en las 5 colecciones
  if (targetSupplier && !isFirestoreQuotaExceeded()) {
    try {
      const hydrated = hydrateSupplierRelationalTables(targetSupplier, 0, allSuppliers);

      const safeF0101 = await prepareRecordForFirestore('f0101_address_book', hydrated.f0101.id, hydrated.f0101);
      await setDoc(doc(db, 'f0101_address_book', hydrated.f0101.id), safeF0101, { merge: true });

      const safeF0401 = await prepareRecordForFirestore('f0401_supplier_master', hydrated.f0401.id, hydrated.f0401);
      await setDoc(doc(db, 'f0401_supplier_master', hydrated.f0401.id), safeF0401, { merge: true });

      for (const addr of hydrated.f0116List) {
        const safeAddr = await prepareRecordForFirestore('f0116_addresses', addr.id, addr);
        await setDoc(doc(db, 'f0116_addresses', addr.id), safeAddr, { merge: true });
      }

      for (const contact of hydrated.f0111List) {
        const safeContact = await prepareRecordForFirestore('f0111_contacts', contact.id, contact);
        await setDoc(doc(db, 'f0111_contacts', contact.id), safeContact, { merge: true });
      }

      for (const bank of hydrated.f0030List) {
        const safeBank = await prepareRecordForFirestore('f0030_bank_accounts', bank.id, bank);
        await setDoc(doc(db, 'f0030_bank_accounts', bank.id), safeBank, { merge: true });
      }
    } catch (err) {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded();
      }
    }
  }
}
