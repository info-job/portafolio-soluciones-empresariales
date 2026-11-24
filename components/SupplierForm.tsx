import React, { useState, useRef } from 'react';
import {
  X, Building2, AlertCircle, ShieldCheck, CheckSquare, FileText, Printer,
  ArrowLeft, Save, CheckCircle2, MapPin, Users, Landmark, Sliders, Plus,
  Trash2, Upload, Eye, KeyRound, Layers, Sparkles, Lock, CreditCard
} from 'lucide-react';
import {
  Supplier,
  SUPPLIER_CATEGORIES,
  BANK_LIST,
  ACCOUNT_TYPES,
  PAYMENT_TERMS_CHILE,
  RiskLevel,
  TaxDocumentType,
  AddressBookSearchType,
  AddressByDateRecord,
  SupplierContactRecord,
  BankTransitMasterRecord
} from '../types';
import {
  maskRUT,
  validateRUTDetailed,
  maskPhoneCLP,
  validatePhoneCLP,
  cleanEmail,
  validateEmail,
  checkDuplicateRUT,
  allowOnlyRUTKey,
  allowOnlyDigitsKey
} from '../lib/inputMasks';
import { printHtmlElement } from '../lib/printDocument';
import { uploadFile, openDocumentSecurely } from '@/lib/storage';
import {
  CHILE_BANK_SBIF_CODES,
  BUSINESS_UNITS_MCU,
  SEARCH_TYPES_AT1,
  GL_CLASS_CODES_APC,
  EXPENSE_ACCOUNTS_CATALOG,
  CHILE_REGIONS,
  getNextAvailableAN8,
  hydrateSupplierRelationalTables
} from '../lib/supplierMasterDatabase';

interface SupplierFormProps {
  onClose: () => void;
  onSave?: (data: Omit<Supplier, 'id' | 'timestamp' | 'userCreator' | 'status' | 'folio'>) => void;
  onSubmit?: (supplier: Supplier) => void;
  onUpdate?: (supplier: Supplier) => void;
  initialSupplier?: Supplier | null;
  currentUser?: string;
  companyLogo?: string | null;
  nextFolio?: string;
  existingSuppliers?: Supplier[];
}

type ActiveTab = 'F0101' | 'F0116' | 'F0111' | 'F0401' | 'F0030' | 'DI01';

export const SupplierForm: React.FC<SupplierFormProps> = ({
  onClose,
  onSave,
  onSubmit,
  onUpdate,
  initialSupplier = null,
  currentUser = 'SISTEMA',
  companyLogo = null,
  nextFolio = 'PROV-0001',
  existingSuppliers = []
}) => {
  const isEditing = !!initialSupplier;
  const hydratedInitial = initialSupplier
    ? hydrateSupplierRelationalTables(initialSupplier, 0, existingSuppliers)
    : null;

  const assignedAN8 = hydratedInitial
    ? hydratedInitial.f0101.addressNumber
    : getNextAvailableAN8(existingSuppliers);

  const todayIso = new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<ActiveTab>('F0101');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const bankCertInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBankIdx, setUploadingBankIdx] = useState<number | null>(null);

  // ==========================================
  // ESTADO CENTRAL Y TABLA F0101 (LIBRO DE DIRECCIONES)
  // ==========================================
  const [formData, setFormData] = useState({
    addressNumber: assignedAN8,
    taxId: initialSupplier?.taxId || '',
    name: initialSupplier?.name || '',
    alphaName: hydratedInitial?.f0101.alphaName || initialSupplier?.alphaName || '',
    searchType: (hydratedInitial?.f0101.searchType || 'V') as AddressBookSearchType,
    businessUnit: hydratedInitial?.f0101.businessUnit || '100-INMOB',
    industryClassification: hydratedInitial?.f0101.industryClassification || '',
    payablesFlag: (hydratedInitial?.f0101.payablesFlag || 'Y') as 'Y' | 'N' | 'H',
    receivablesFlag: (hydratedInitial?.f0101.receivablesFlag || 'N') as 'Y' | 'N',
    employeeFlag: (hydratedInitial?.f0101.employeeFlag || 'N') as 'Y' | 'N',
    catCode01: hydratedInitial?.f0101.catCode01 || 'RM',
    catCode02: hydratedInitial?.f0101.catCode02 || initialSupplier?.category || '',
    catCode03: hydratedInitial?.f0101.catCode03 || 'PYME',
    catCode04: hydratedInitial?.f0101.catCode04 || 'ESTANDAR',
    catCode05: hydratedInitial?.f0101.catCode05 || 'BAJO',
    category: initialSupplier?.category || '',
    taxDocumentType: (initialSupplier?.taxDocumentType || 'FACTURA') as TaxDocumentType,
    requestDate: initialSupplier?.requestDate || todayIso,
    contactName: initialSupplier?.contactName || '',
    email: initialSupplier?.email || '',
    phone: initialSupplier?.phone || '',
    bankName: initialSupplier?.bankName || '',
    accountType: initialSupplier?.accountType || '',
    accountNumber: initialSupplier?.accountNumber || '',
    folderUrl: initialSupplier?.folderUrl || '',
    isAssigned: initialSupplier?.isAssigned || false,
    assignedToEntity: initialSupplier?.assignedToEntity || '',
    dueDiligenceDate: initialSupplier?.dueDiligenceDate || todayIso,
    dueDiligenceRisk: (initialSupplier?.dueDiligenceRisk || 'RIESGO BAJO') as RiskLevel | '',
    complianceMaster: initialSupplier?.complianceMaster || {
      conflictThirdParty: true,
      conflictExecutive: true,
      beneficiariesUAF: true,
      dueDiligenceCert: true,
      paymentVoucher: true,
      invoice: true,
      receptionCertificate: true,
      photoSet: true
    }
  });

  // ==========================================
  // TABLA F0116 (DIRECCIONES POR FECHA EFECTIVA)
  // ==========================================
  const [f0116Addresses, setF0116Addresses] = useState<AddressByDateRecord[]>(
    hydratedInitial?.f0116List || [
      {
        id: `f0116-${Date.now()}-1`,
        supplierId: initialSupplier?.id || 'pending',
        addressNumber: assignedAN8,
        effectiveDate: todayIso,
        addressType: 'CASA_MATRIZ',
        addressLine1: initialSupplier?.address || '',
        addressLine2: '',
        commune: initialSupplier?.commune || 'SANTIAGO',
        city: initialSupplier?.city || 'SANTIAGO',
        region: initialSupplier?.region || 'RM',
        postalCode: '7550000',
        country: 'CL',
        isPrimary: true
      }
    ]
  );

  // ==========================================
  // TABLA F0111 / F0115 / F01151 (CONTACTOS WHO'S WHO)
  // ==========================================
  const [f0111Contacts, setF0111Contacts] = useState<SupplierContactRecord[]>(
    hydratedInitial?.f0111List || [
      {
        id: `f0111-${Date.now()}-0`,
        supplierId: initialSupplier?.id || 'pending',
        addressNumber: assignedAN8,
        lineId: 0,
        contactType: 'REP_LEGAL',
        fullName: initialSupplier?.contactName || '',
        contactTaxId: '',
        jobTitle: 'REPRESENTANTE LEGAL / GERENTE COMERCIAL',
        phonePrimary: initialSupplier?.phone || '',
        phoneSecondary: '',
        electronicAddress: initialSupplier?.email || '',
        canSignContracts: true,
        isPrimary: true
      }
    ]
  );

  // ==========================================
  // TABLA F0401 (MAESTRO DE COMPRAS Y CUENTAS POR PAGAR)
  // ==========================================
  const [f0401Data, setF0401Data] = useState({
    glClassCode: (hydratedInitial?.f0401.glClassCode || 'PCNAC') as 'PCNAC' | 'PCHON' | 'PCFAC' | 'PCGAR',
    defaultExpenseAccount: hydratedInitial?.f0401.defaultExpenseAccount || '5101-01',
    paymentTermsCode: hydratedInitial?.f0401.paymentTermsCode || PAYMENT_TERMS_CHILE[3],
    paymentInstrument: (hydratedInitial?.f0401.paymentInstrument || 'T') as 'T' | 'V' | 'C' | 'P',
    taxExplanationCode: (hydratedInitial?.f0401.taxExplanationCode || 'IVA') as 'IVA' | 'EXE' | 'BH' | 'CON',
    withholdingTaxPct: hydratedInitial?.f0401.withholdingTaxPct ?? 0,
    currencyCode: (hydratedInitial?.f0401.currencyCode || 'CLP') as 'CLP' | 'UF' | 'USD',
    minOrderAmount: hydratedInitial?.f0401.minOrderAmount ?? 50000,
    maxOrderAmount: hydratedInitial?.f0401.maxOrderAmount ?? 25000000,
    holdPaymentCode: (hydratedInitial?.f0401.holdPaymentCode || '00') as '00' | '01' | '02' | '03',
    threeWayMatchRequired: hydratedInitial?.f0401.threeWayMatchRequired ?? true,
    voucherPerInvoice: hydratedInitial?.f0401.voucherPerInvoice ?? true,
    factoringAllowed: hydratedInitial?.f0401.factoringAllowed ?? false,
    defaultFactoringEntity: hydratedInitial?.f0401.defaultFactoringEntity || '',
    defaultFactoringTaxId: hydratedInitial?.f0401.defaultFactoringTaxId || ''
  });

  // ==========================================
  // TABLA F0030 (CUENTAS BANCARIAS Y TRÁNSITO TEF)
  // ==========================================
  const [f0030Banks, setF0030Banks] = useState<BankTransitMasterRecord[]>(
    hydratedInitial?.f0030List || [
      {
        id: `f0030-${Date.now()}-1`,
        supplierId: initialSupplier?.id || 'pending',
        addressNumber: assignedAN8,
        recordType: 'V',
        bankCode: CHILE_BANK_SBIF_CODES[initialSupplier?.bankName || 'BANCO DE CHILE'] || '001',
        bankName: initialSupplier?.bankName || 'BANCO DE CHILE',
        accountType: initialSupplier?.accountType || 'CUENTA CORRIENTE',
        accountNumber: initialSupplier?.accountNumber || '',
        holderRut: initialSupplier?.taxId || '',
        holderName: initialSupplier?.name || '',
        remittanceEmail: initialSupplier?.email || '',
        prenoteStatus: 'A',
        isDefault: true
      }
    ]
  );

  // Sincronización reactiva entre contacto primario F0111 / banco primario F0030 y campos resumen
  const primaryContact = f0111Contacts.find((c) => c.isPrimary) || f0111Contacts[0];
  const primaryAddress = f0116Addresses.find((a) => a.isPrimary) || f0116Addresses[0];
  const primaryBank = f0030Banks.find((b) => b.isDefault) || f0030Banks[0];

  const effectiveContactName = formData.contactName || primaryContact?.fullName || '';
  const effectiveEmail = formData.email || primaryContact?.electronicAddress || '';
  const effectivePhone = formData.phone || primaryContact?.phonePrimary || '';
  const effectiveBankName = formData.bankName || primaryBank?.bankName || '';
  const effectiveAccountType = formData.accountType || primaryBank?.accountType || '';
  const effectiveAccountNumber = formData.accountNumber || primaryBank?.accountNumber || '';

  const rutValidation = validateRUTDetailed(formData.taxId);
  const otherSuppliers = isEditing
    ? existingSuppliers.filter((s) => s.id !== initialSupplier?.id)
    : existingSuppliers;
  const rutDuplicateCheck = checkDuplicateRUT(formData.taxId, otherSuppliers);
  const isRUTValid = formData.taxId ? rutValidation.isValid && !rutDuplicateCheck.isDuplicate : false;
  const phoneValidation = validatePhoneCLP(effectivePhone);
  const emailValidation = validateEmail(effectiveEmail);

  const isComplianceComplete =
    formData.complianceMaster.conflictThirdParty &&
    formData.complianceMaster.conflictExecutive &&
    formData.complianceMaster.beneficiariesUAF &&
    formData.complianceMaster.dueDiligenceCert &&
    formData.complianceMaster.paymentVoucher &&
    formData.complianceMaster.invoice &&
    formData.complianceMaster.receptionCertificate &&
    formData.complianceMaster.photoSet;

  const isFormIncomplete =
    !formData.taxId ||
    !isRUTValid ||
    rutDuplicateCheck.isDuplicate ||
    !formData.name ||
    !effectiveAccountNumber ||
    !effectiveBankName ||
    !effectiveAccountType ||
    !formData.category ||
    !effectiveContactName ||
    !effectiveEmail ||
    !emailValidation.isValid ||
    !effectivePhone ||
    !phoneValidation.isValid ||
    !formData.dueDiligenceRisk ||
    !isComplianceComplete;

  const toggleCompliance = (field: keyof typeof formData.complianceMaster) => {
    setFormData((prev) => ({
      ...prev,
      complianceMaster: { ...prev.complianceMaster, [field]: !prev.complianceMaster[field] }
    }));
  };

  const calculateConfidence = () => {
    const fields = [
      formData.taxId,
      formData.name,
      formData.category,
      effectiveContactName,
      effectiveEmail,
      effectivePhone,
      effectiveBankName,
      effectiveAccountType,
      effectiveAccountNumber,
      formData.dueDiligenceDate,
      formData.dueDiligenceRisk,
      primaryAddress?.addressLine1
    ];
    const filledFields = fields.filter((f) => !!f).length;
    const complianceFields = Object.values(formData.complianceMaster).filter((v) => v).length;
    const totalPossible = fields.length + 8;
    const totalFilled = filledFields + complianceFields;
    return Math.round((totalFilled / totalPossible) * 100);
  };

  // Cargar certificado bancario en F0030
  const handleBankCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingBankIdx === null) return;
    try {
      const path = `supplier_banks/${assignedAN8}_${Date.now()}_${file.name}`;
      const dataUrl = await uploadFile(file, path);
      setF0030Banks((prev) =>
        prev.map((b, idx) =>
          idx === uploadingBankIdx
            ? { ...b, bankCertUrl: dataUrl, bankCertName: file.name, prenoteStatus: 'A' }
            : b
        )
      );
    } catch (err) {
      console.error('Error cargando certificado bancario:', err);
    } finally {
      setUploadingBankIdx(null);
      if (bankCertInputRef.current) bankCertInputRef.current.value = '';
    }
  };

  // Autocompletar Demo Válido para pruebas rápidas sin errores de digitación
  const handleFillValidDemo = () => {
    // Generar un RUT chileno matemáticamente válido que no exista en existingSuppliers
    const baseNum = Math.floor(76100000 + Math.random() * 800000);
    let m = 0;
    let s = 1;
    let t = baseNum;
    for (; t; t = Math.floor(t / 10)) {
      s = (s + (t % 10) * (9 - (m++ % 6))) % 11;
    }
    const dv = s ? String(s - 1) : 'K';
    const validRut = maskRUT(`${baseNum}${dv}`);

    const demoName = `INGENIERÍA Y MANTENCIÓN TÉCNICA AUSTRAL SPA`;
    const demoAlpha = `INGENIERIA AUSTRAL SPA`;
    const demoEmail = `operaciones@ingenieriaaustral.cl`;
    const demoPhone = `+56984512390`;
    const demoContact = `RODRIGO VALENZUELA SOLAR`;
    const demoAcct = `00184920155`;

    setFormData((prev) => ({
      ...prev,
      taxId: validRut,
      name: demoName,
      alphaName: demoAlpha,
      searchType: 'VC',
      businessUnit: '200-MANT',
      industryClassification: 'OBRAS MENORES EN CONSTRUCCIÓN Y MANTENCIÓN DE EDIFICIOS',
      category: 'MANTENCIÓN TÉCNICA',
      catCode01: 'RM',
      catCode02: 'MANTENCIÓN TÉCNICA',
      catCode03: 'PYME',
      catCode04: 'ESTANDAR',
      catCode05: 'BAJO',
      taxDocumentType: 'FACTURA',
      contactName: demoContact,
      email: demoEmail,
      phone: demoPhone,
      bankName: 'BANCO DE CHILE',
      accountType: 'CUENTA CORRIENTE',
      accountNumber: demoAcct,
      dueDiligenceDate: todayIso,
      dueDiligenceRisk: 'RIESGO BAJO',
      complianceMaster: {
        conflictThirdParty: true,
        conflictExecutive: true,
        beneficiariesUAF: true,
        dueDiligenceCert: true,
        paymentVoucher: true,
        invoice: true,
        receptionCertificate: true,
        photoSet: true
      }
    }));

    setF0116Addresses([
      {
        id: `f0116-${Date.now()}-1`,
        supplierId: 'pending',
        addressNumber: assignedAN8,
        effectiveDate: todayIso,
        addressType: 'CASA_MATRIZ',
        addressLine1: 'AV. PROVIDENCIA 2350 OFICINA 904',
        addressLine2: 'EDIFICIO CORPORATIVO ORIENTE',
        commune: 'PROVIDENCIA',
        city: 'SANTIAGO',
        region: 'RM',
        postalCode: '7500000',
        country: 'CL',
        isPrimary: true
      }
    ]);

    setF0111Contacts([
      {
        id: `f0111-${Date.now()}-0`,
        supplierId: 'pending',
        addressNumber: assignedAN8,
        lineId: 0,
        contactType: 'REP_LEGAL',
        fullName: demoContact,
        contactTaxId: validRut,
        jobTitle: 'GERENTE DE OPERACIONES & REPRESENTANTE LEGAL',
        phonePrimary: demoPhone,
        phoneSecondary: '+56224519000',
        electronicAddress: demoEmail,
        canSignContracts: true,
        isPrimary: true
      }
    ]);

    setF0030Banks([
      {
        id: `f0030-${Date.now()}-1`,
        supplierId: 'pending',
        addressNumber: assignedAN8,
        recordType: 'V',
        bankCode: '001',
        bankName: 'BANCO DE CHILE',
        accountType: 'CUENTA CORRIENTE',
        accountNumber: demoAcct,
        holderRut: validRut,
        holderName: demoName,
        remittanceEmail: demoEmail,
        prenoteStatus: 'A',
        isDefault: true
      }
    ]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormIncomplete) return;

    const nowIso = new Date().toISOString();
    const supplierId = initialSupplier?.id || crypto.randomUUID();

    const f0101Record = {
      id: supplierId,
      addressNumber: formData.addressNumber,
      taxId: formData.taxId,
      alphaName: (formData.alphaName || formData.name).slice(0, 40).toUpperCase(),
      mailingName: formData.name.toUpperCase(),
      searchType: formData.searchType,
      industryClassification: formData.industryClassification || formData.category,
      businessUnit: formData.businessUnit,
      payablesFlag: formData.payablesFlag,
      receivablesFlag: formData.receivablesFlag,
      employeeFlag: formData.employeeFlag,
      catCode01: primaryAddress?.region || formData.catCode01 || 'RM',
      catCode02: formData.category,
      catCode03: formData.catCode03,
      catCode04: formData.catCode04,
      catCode05: formData.dueDiligenceRisk === 'RIESGO ALTO' ? 'ALTO' : formData.dueDiligenceRisk === 'RIESGO MEDIO' ? 'MEDIO' : 'BAJO',
      userId: currentUser || 'SISTEMA',
      programId: 'P01012',
      workStationId: 'WRK-ASSETFLOW-01',
      updatedDate: nowIso.split('T')[0],
      updatedTime: nowIso.split('T')[1]?.slice(0, 8) || '12:00:00'
    };

    const normalizedAddresses: AddressByDateRecord[] = f0116Addresses.map((a, idx) => ({
      ...a,
      id: a.id || `f0116-${supplierId}-${idx + 1}`,
      supplierId,
      addressNumber: formData.addressNumber,
      addressLine1: a.addressLine1 || 'DIRECCIÓN COMERCIAL REGISTRADA',
      commune: a.commune || 'SANTIAGO',
      city: a.city || 'SANTIAGO',
      region: a.region || 'RM',
      country: a.country || 'CL'
    }));

    const normalizedContacts: SupplierContactRecord[] = f0111Contacts.map((c, idx) => ({
      ...c,
      id: c.id || `f0111-${supplierId}-${idx}`,
      supplierId,
      addressNumber: formData.addressNumber,
      lineId: idx,
      fullName: idx === 0 ? effectiveContactName : c.fullName,
      phonePrimary: idx === 0 ? effectivePhone : c.phonePrimary,
      electronicAddress: idx === 0 ? effectiveEmail : c.electronicAddress
    }));

    const f0401Record = {
      id: supplierId,
      addressNumber: formData.addressNumber,
      ...f0401Data,
      factoringAllowed: formData.isAssigned || f0401Data.factoringAllowed,
      defaultFactoringEntity: formData.assignedToEntity || f0401Data.defaultFactoringEntity,
      updatedAt: Date.now()
    };

    const normalizedBanks: BankTransitMasterRecord[] = f0030Banks.map((b, idx) => ({
      ...b,
      id: b.id || `f0030-${supplierId}-${idx + 1}`,
      supplierId,
      addressNumber: formData.addressNumber,
      bankName: idx === 0 ? effectiveBankName : b.bankName,
      bankCode: CHILE_BANK_SBIF_CODES[idx === 0 ? effectiveBankName : b.bankName] || b.bankCode || '001',
      accountType: idx === 0 ? effectiveAccountType : b.accountType,
      accountNumber: idx === 0 ? effectiveAccountNumber : b.accountNumber,
      holderRut: b.holderRut || formData.taxId,
      holderName: b.holderName || formData.name,
      remittanceEmail: b.remittanceEmail || effectiveEmail
    }));

    const completePayload = {
      ...formData,
      addressNumber: formData.addressNumber,
      contactName: effectiveContactName,
      email: effectiveEmail,
      phone: effectivePhone,
      bankName: effectiveBankName,
      accountType: effectiveAccountType,
      accountNumber: effectiveAccountNumber,
      address: primaryAddress?.addressLine1 || '',
      commune: primaryAddress?.commune || 'SANTIAGO',
      city: primaryAddress?.city || 'SANTIAGO',
      region: primaryAddress?.region || 'RM',
      confidenceScore: calculateConfidence(),
      f0101AddressBook: f0101Record,
      f0116Addresses: normalizedAddresses,
      f0111Contacts: normalizedContacts,
      f0401Purchasing: f0401Record,
      f0030BankAccounts: normalizedBanks
    };

    if (isEditing && initialSupplier && onUpdate) {
      onUpdate({
        ...initialSupplier,
        ...completePayload,
        dueDiligenceRisk: (formData.dueDiligenceRisk || 'RIESGO BAJO') as RiskLevel
      });
      onClose();
    } else {
      if (onSave) {
        onSave(completePayload as any);
      }
      if (onSubmit) {
        onSubmit({
          id: supplierId,
          timestamp: Date.now(),
          userCreator: currentUser || 'SISTEMA',
          status: 'PENDING_APPROVAL',
          folio: nextFolio || `PROV-${String((existingSuppliers?.length || 0) + 1).padStart(4, '0')}`,
          ...(completePayload as any)
        });
      }
    }
  };

  if (isPreviewOpen) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-100 flex flex-col no-print">
        <div className="h-20 bg-white border-b border-slate-300 px-10 flex items-center justify-between shadow-xs">
          <button
            onClick={() => setIsPreviewOpen(false)}
            className="flex items-center gap-3 px-6 py-3 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
          >
            <ArrowLeft size={18} /> Volver a Edición
          </button>
          <div className="flex items-center gap-4">
            <p className="text-emerald-800 font-black text-[10px] uppercase tracking-widest italic">
              Ficha Oficial DI-01 + Anexo Relacional (F0101 / F0401 / F0030) • AN8 #{formData.addressNumber}
            </p>
            <button
              onClick={() => printHtmlElement('printable-report', `Ficha_Proveedor_AN8_${formData.addressNumber}_${formData.taxId || 'Registro'}`)}
              className="bg-[#006D3D] text-white px-10 py-4 rounded-xl font-black text-sm uppercase flex items-center gap-4 hover:bg-emerald-800 shadow-xs border border-emerald-900 active:scale-95 transition-all cursor-pointer"
            >
              <Printer size={22} /> Generar PDF / Imprimir
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-200/80 flex justify-center custom-audit-scroll">
          <div
            id="printable-report"
            className="bg-white w-[216mm] min-h-[279mm] shadow-2xl p-[1.2cm] flex flex-col text-black font-sans relative border border-slate-300"
          >
            <div className="flex justify-between items-start mb-6 pb-6">
              <div className="w-56 h-28 border-[4px] border-[#006D3D] rounded-xl flex items-center justify-center bg-white overflow-hidden shrink-0">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    style={{ display: 'block', maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                    alt="Logo Institucional"
                  />
                ) : (
                  <div className="bg-[#006D3D] text-white p-4 font-black">ASSETFLOW</div>
                )}
              </div>

              <div className="flex-1 px-6 text-left space-y-1">
                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none text-black">
                  FORMULARIO DI-01 · ALTA MAESTRO
                </h1>
                <p className="text-[11px] font-black text-[#006D3D] uppercase tracking-[0.15em] border-b-[4px] border-[#006D3D] pb-1">
                  LIBRO DE DIRECCIONES (F0101) &amp; MAESTRO DE PROVEEDORES (F0401 / F0030)
                </p>
                <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest pt-1 italic">
                  DEPTO. INMOBILIARIO · CONTROL INTERNO Y CUMPLIMIENTO NORMATIVO
                </p>
              </div>

              <div className="text-right space-y-1.5 pt-1">
                <div className="space-y-1 text-center">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">
                    N° LIBRO DIRECCIONES (AN8) / FOLIO
                  </span>
                  <div className="w-44 h-11 border-[3px] border-[#006D3D] bg-white rounded-xl flex items-center justify-center font-mono text-xs font-black text-slate-900">
                    AN8 #{formData.addressNumber} · {initialSupplier?.folio || nextFolio}
                  </div>
                </div>
                <p className="text-[8.5px] font-black text-black uppercase pt-0.5 font-mono tracking-tighter">
                  EMISIÓN: {formData.requestDate || ''} · TIPO: {formData.searchType}
                </p>
              </div>
            </div>

            <div className="space-y-5 flex-1">
              <section>
                <h2 className="bg-[#006D3D] text-white px-5 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] mb-3">
                  I. IDENTIFICACIÓN EN LIBRO DE DIRECCIONES (TABLAS F0101 / F0116 / F0111)
                </h2>
                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <div className="col-span-2 space-y-1">
                    <span className="text-[9px] font-black text-black uppercase tracking-widest block">
                      1.1 RAZÓN SOCIAL LEGAL (MLNM) / NOMBRE ALFABÉTICO (ALPH)
                    </span>
                    <div className="w-full min-h-[40px] border-[2.5px] border-[#006D3D] rounded-xl px-3 py-2 font-black text-[10px] uppercase text-black bg-white">
                      {formData.name || ''} {formData.alphaName ? `(${formData.alphaName})` : ''}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-black uppercase tracking-widest block">
                      1.2 RUT / IDENTIFICADOR FISCAL (TAX)
                    </span>
                    <div className="w-full min-h-[40px] border-[2.5px] border-[#006D3D] rounded-xl px-3 py-2 font-black text-xs font-mono text-black bg-white">
                      {formData.taxId || ''}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-black uppercase tracking-widest block">
                      1.3 RUBRO / ESPECIALIDAD (AC02)
                    </span>
                    <div className="w-full min-h-[40px] border-[2.5px] border-[#006D3D] rounded-xl px-3 py-2 font-black text-[9.5px] uppercase text-black bg-white">
                      {formData.category || ''}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-black uppercase tracking-widest block">
                      1.4 UNIDAD DE NEGOCIO (MCU) &amp; TIPO (AT1)
                    </span>
                    <div className="w-full min-h-[40px] border-[2.5px] border-[#006D3D] rounded-xl px-3 py-2 font-black text-[9.5px] uppercase text-black bg-white font-mono">
                      {formData.businessUnit} · TIPO {formData.searchType}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-black uppercase tracking-widest block">
                      1.5 DOMICILIO VIGENTE (F0116 - EFTB {primaryAddress?.effectiveDate})
                    </span>
                    <div className="w-full min-h-[40px] border-[2.5px] border-[#006D3D] rounded-xl px-3 py-2 font-black text-[9px] uppercase text-black bg-white">
                      {primaryAddress?.addressLine1 || 'S/I'}, {primaryAddress?.commune || 'SANTIAGO'} ({primaryAddress?.region || 'RM'})
                    </div>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <span className="text-[9px] font-black text-black uppercase tracking-widest block">
                      1.6 REPRESENTANTE LEGAL / CONTACTO PRINCIPAL (F0111 / F01151)
                    </span>
                    <div className="w-full min-h-[38px] border-[2.5px] border-[#006D3D] rounded-xl px-3 py-2 font-black text-[9.5px] uppercase text-black bg-white">
                      {effectiveContactName} · TEL: {effectivePhone} · EMAIL: {effectiveEmail}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="bg-[#006D3D] text-white px-5 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] mb-3">
                  II. PARÁMETROS CONTABLES Y BANCARIOS (TABLAS F0401 &amp; F0030)
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-black uppercase tracking-widest block">
                      2.1 CLASE CONTABLE (APC) &amp; CUENTA GASTO
                    </span>
                    <div className="w-full min-h-[40px] border-[2.5px] border-[#006D3D] rounded-xl px-3 py-2 font-black text-[9.5px] uppercase text-black bg-white font-mono">
                      AAI: {f0401Data.glClassCode} · CTA: {f0401Data.defaultExpenseAccount}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-black uppercase tracking-widest block">
                      2.2 CONDICIÓN PAGO (TRAP) &amp; IMPUESTO (EXR1)
                    </span>
                    <div className="w-full min-h-[40px] border-[2.5px] border-[#006D3D] rounded-xl px-3 py-2 font-black text-[9px] uppercase text-black bg-white">
                      {f0401Data.paymentTermsCode} · {f0401Data.taxExplanationCode} ({f0401Data.currencyCode})
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-black uppercase tracking-widest block">
                      2.3 BANCO SBIF (TNST) / CUENTA TEF (CBNK)
                    </span>
                    <div className="w-full min-h-[40px] border-[2.5px] border-[#006D3D] rounded-xl px-3 py-2 font-black text-[9.5px] uppercase text-black bg-white font-mono">
                      [{primaryBank?.bankCode || '001'}] {effectiveBankName} · {effectiveAccountType} #{effectiveAccountNumber}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="bg-[#006D3D] text-white px-5 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] mb-3">
                  III. PROTOCOLO DE DEBIDA DILIGENCIA E INTEGRIDAD (8 HITOS DE AUDITORÍA)
                </h2>
                <div className="p-4 border-[3px] border-[#006D3D] rounded-2xl space-y-4 bg-white font-bold">
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: 'COMPROBANTE DE EGRESO', val: formData.complianceMaster.paymentVoucher },
                      { label: 'FACTURA / BOLETA', val: formData.complianceMaster.invoice },
                      { label: 'RECEPCIÓN CONFORME / INFORME', val: formData.complianceMaster.receptionCertificate },
                      { label: 'SET FOTOGRÁFICO DEL TRABAJO', val: formData.complianceMaster.photoSet },
                      { label: 'DECLARACIÓN AUSENCIA CONFLICTO INTERÉS (TERCERO)', val: formData.complianceMaster.conflictThirdParty },
                      { label: 'DECLARACIÓN AUSENCIA CONFLICTO INTERÉS (EJECUTIVO)', val: formData.complianceMaster.conflictExecutive },
                      { label: 'DECLARACIÓN BENEFICIARIOS FINALES (LEY 19.913 UAF)', val: formData.complianceMaster.beneficiariesUAF },
                      { label: 'CERTIFICACIÓN DUE DILIGENCE (COMPLIANCE)', val: formData.complianceMaster.dueDiligenceCert }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 border border-slate-200 bg-slate-50/40 rounded-xl">
                        <div
                          className={`w-6 h-6 border-[2.5px] rounded flex items-center justify-center shrink-0 ${
                            item.val ? 'bg-[#006D3D] border-[#006D3D] text-white' : 'bg-white border-[#006D3D]'
                          }`}
                        >
                          {item.val && <CheckSquare size={14} />}
                        </div>
                        <span className="text-[8.5px] font-black text-black uppercase tracking-tighter leading-tight">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-[2.5px] border-[#006D3D] p-3.5 rounded-xl bg-emerald-50/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-[#006D3D] uppercase tracking-widest block">
                        CLASIFICACIÓN DE RIESGO UAF / COMPLIANCE: {formData.dueDiligenceRisk}
                      </span>
                      <span className="text-[8.5px] font-bold text-slate-600 uppercase">
                        FECHA DE AUDITORÍA: {formData.dueDiligenceDate} · COTEJO 3 VÍAS: {f0401Data.threeWayMatchRequired ? 'OBLIGATORIO' : 'ESTÁNDAR'}
                      </span>
                    </div>
                    <div className="px-4 py-1.5 border-2 border-[#006D3D] rounded-lg font-mono text-xs font-black text-[#006D3D]">
                      ÍNDICE INTEGRIDAD: {calculateConfidence()}%
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-8 pt-6 border-t-[3px] border-[#006D3D] grid grid-cols-2 gap-12">
              <div className="text-center space-y-2">
                <div className="h-14 border-b-2 border-black w-3/4 mx-auto"></div>
                <p className="text-[9px] font-black uppercase tracking-widest text-black">{currentUser}</p>
                <p className="text-[8px] font-bold text-slate-600 uppercase">SOLICITANTE / OPERADOR MAESTRO F0101</p>
              </div>
              <div className="text-center space-y-2">
                <div className="h-14 border-b-2 border-black w-3/4 mx-auto"></div>
                <p className="text-[9px] font-black uppercase tracking-widest text-black">JEFATURA CONTROL INTERNO</p>
                <p className="text-[8px] font-bold text-slate-600 uppercase">APROBACIÓN ALTA DEFINITIVA F0401</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* HEADER DE WORKSTATION MAESTRO DE PROVEEDORES */}
        <div className="bg-slate-950 text-white px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-black uppercase tracking-tight text-white">
                  {isEditing ? 'Mantención Maestro de Proveedores' : 'Creación de Proveedor · Arquitectura 5 Tablas'}
                </h2>
                <span className="font-mono text-[10px] font-black text-emerald-400 bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-800">
                  AN8 #{formData.addressNumber} · {initialSupplier?.folio || nextFolio}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Sincronización Relacional Simultánea: F0101 (Libro Direcciones) · F0116 (Domicilios) · F0111 (Contactos) · F0401 (Compras/CxP) · F0030 (Bancos TEF)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isEditing && (
              <button
                type="button"
                onClick={handleFillValidDemo}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                title="Autocompletar ficha con un proveedor chileno válido para prueba rápida"
              >
                <Sparkles size={14} /> Autocompletar Demo Válido
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <Printer size={14} className="text-emerald-400" /> Vista Previa DI-01
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* BARRA DE NAVEGACIÓN DE LAS 5 TABLAS + DI-01 */}
        <div className="bg-slate-900 px-6 py-2 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
          {[
            { id: 'F0101', code: '1. F0101', label: 'Libro de Direcciones (AN8)', icon: <KeyRound size={13} /> },
            { id: 'F0116', code: '2. F0116', label: `Direcciones por Vigencia (${f0116Addresses.length})`, icon: <MapPin size={13} /> },
            { id: 'F0111', code: '3. F0111', label: `Contactos & Emails (${f0111Contacts.length})`, icon: <Users size={13} /> },
            { id: 'F0401', code: '4. F0401', label: 'Maestro Compras y CxP', icon: <Sliders size={13} /> },
            { id: 'F0030', code: '5. F0030', label: `Cuentas Bancarias TEF (${f0030Banks.length})`, icon: <Landmark size={13} /> },
            { id: 'DI01', code: '6. DI-01', label: 'Compliance UAF & Checklist', icon: <ShieldCheck size={13} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span className="font-mono">{tab.code}</span>
              <span className="hidden sm:inline">· {tab.label}</span>
            </button>
          ))}
        </div>

        {/* CUERPO DEL FORMULARIO MULTI-TABLA */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
          <input
            type="file"
            ref={bankCertInputRef}
            onChange={handleBankCertUpload}
            accept=".pdf,image/*"
            className="hidden"
          />

          {/* ================================================================= */}
          {/* PESTAÑA 1: TABLA F0101 — MAESTRO DE LIBRO DE DIRECCIONES          */}
          {/* ================================================================= */}
          {activeTab === 'F0101' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Tabla F0101 · Maestro de Libro de Direcciones (Identidad Fiscal y Clasificación)
                    </h3>
                    <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                      Define la clave primaria relacional <span className="font-mono font-bold text-slate-800">AN8 ({formData.addressNumber})</span> compartida por Compras, Contabilidad, Órdenes de Trabajo y Tesorería.
                    </p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-500">
                    <span>PROGRAMA: P01012</span> · <span>ESTADO INICIAL: {isEditing ? initialSupplier?.status : 'PENDING_APPROVAL'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* AN8 */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                      N° Libro Direcciones (AN8)
                    </label>
                    <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl font-mono text-xs font-black text-slate-900 flex items-center justify-between">
                      <span>{formData.addressNumber}</span>
                      <Lock size={13} className="text-slate-400" />
                    </div>
                  </div>

                  {/* RUT / TAX ID */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                      RUT / Identificador Tributario (TAX) *
                    </label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onKeyDown={allowOnlyRUTKey}
                      onChange={(e) => {
                        const formatted = maskRUT(e.target.value);
                        setFormData((prev) => ({ ...prev, taxId: formatted }));
                        setF0030Banks((prev) =>
                          prev.map((b, i) => (i === 0 && !b.holderRut ? { ...b, holderRut: formatted } : b))
                        );
                      }}
                      placeholder="Ej: 76.123.456-7"
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl font-mono text-xs font-black outline-none transition-all ${
                        !formData.taxId
                          ? 'border-slate-300 focus:border-emerald-600'
                          : isRUTValid
                          ? 'border-emerald-500 bg-emerald-50/20 text-emerald-950'
                          : 'border-rose-500 bg-rose-50/30 text-rose-900'
                      }`}
                    />
                    {formData.taxId && !rutValidation.isValid && (
                      <p className="text-[9.5px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle size={11} /> {rutValidation.error || 'Dígito verificador Módulo 11 inválido'}
                      </p>
                    )}
                    {rutDuplicateCheck.isDuplicate && (
                      <p className="text-[9.5px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle size={11} /> RUT ya existe en F0101 ({rutDuplicateCheck.matchedName})
                      </p>
                    )}
                    {isRUTValid && (
                      <p className="text-[9.5px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Módulo 11 verificado y único en F0101
                      </p>
                    )}
                  </div>

                  {/* TIPO DE BÚSQUEDA AT1 */}
                  <div className="md:col-span-5 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                      Tipo de Búsqueda en Maestro (AT1) *
                    </label>
                    <select
                      value={formData.searchType}
                      onChange={(e) => {
                        const st = e.target.value as AddressBookSearchType;
                        setFormData((prev) => ({
                          ...prev,
                          searchType: st,
                          taxDocumentType: st === 'VH' ? 'BOLETA_HONORARIOS' : 'FACTURA'
                        }));
                        if (st === 'VH') {
                          setF0401Data((prev) => ({
                            ...prev,
                            glClassCode: 'PCHON',
                            taxExplanationCode: 'BH',
                            withholdingTaxPct: 13.75
                          }));
                        } else if (st === 'VF') {
                          setF0401Data((prev) => ({
                            ...prev,
                            glClassCode: 'PCFAC',
                            factoringAllowed: true
                          }));
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                    >
                      {SEARCH_TYPES_AT1.map((st) => (
                        <option key={st.code} value={st.code}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* RAZÓN SOCIAL LEGAL (MLNM) */}
                  <div className="md:col-span-7 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                      Razón Social Legal Completa (MLNM) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setFormData((prev) => ({
                          ...prev,
                          name: val,
                          alphaName: prev.alphaName || val.slice(0, 40)
                        }));
                        setF0030Banks((prev) =>
                          prev.map((b, i) => (i === 0 ? { ...b, holderName: val } : b))
                        );
                      }}
                      placeholder="Ej: CONSTRUCTORA Y SERVICIOS INTEGRALES DEL PACÍFICO SPA"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* NOMBRE ALFABÉTICO / FANTASÍA (ALPH) */}
                  <div className="md:col-span-5 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                      Nombre Alfabético / Índice Rápido (ALPH)
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={formData.alphaName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, alphaName: e.target.value.toUpperCase() }))}
                      placeholder="Ej: CONSTRUCTORA DEL PACIFICO"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* RUBRO PRINCIPAL / CATEGORÍA */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                      Rubro / Categoría Operativa (AC02) *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          category: e.target.value,
                          catCode02: e.target.value
                        }))
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="">Seleccione Categoría...</option>
                      {SUPPLIER_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* GIRO SII (SIC) */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                      Giro Comercial SII / Actividad Económica (SIC)
                    </label>
                    <input
                      type="text"
                      value={formData.industryClassification}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, industryClassification: e.target.value.toUpperCase() }))
                      }
                      placeholder="Ej: OBRAS DE INGENIERÍA Y MANTENCIÓN"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* UNIDAD DE NEGOCIO (MCU) */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                      Unidad de Negocio / Centro Costo (MCU)
                    </label>
                    <select
                      value={formData.businessUnit}
                      onChange={(e) => setFormData((prev) => ({ ...prev, businessUnit: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                    >
                      {BUSINESS_UNITS_MCU.map((bu) => (
                        <option key={bu.code} value={bu.code}>
                          {bu.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* CÓDIGOS DE CATEGORÍA ANALÍTICA (CAT CODES AC01..AC05) E INDICADORES */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">
                      Cat Code 03 · Segmento Empresa
                    </label>
                    <select
                      value={formData.catCode03}
                      onChange={(e) => setFormData((prev) => ({ ...prev, catCode03: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="GRAN_EMPRESA">GRAN EMPRESA (&gt; 100.000 UF)</option>
                      <option value="PYME">EMPRESA PYME (2.400 - 100.000 UF)</option>
                      <option value="MICRO">MICROEMPRESA (&lt; 2.400 UF)</option>
                      <option value="PROFESIONAL">PERSONA NATURAL / HONORARIOS</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">
                      Cat Code 04 · Criticidad Operativa
                    </label>
                    <select
                      value={formData.catCode04}
                      onChange={(e) => setFormData((prev) => ({ ...prev, catCode04: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="CRITICO">CRÍTICO (Continuidad Operativa / Emergencias)</option>
                      <option value="ESTANDAR">ESTÁNDAR (Servicios Recurrentes)</option>
                      <option value="EVENTUAL">EVENTUAL (Compras Puntuales)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">
                      Indicador Cuentas por Pagar (ATP)
                    </label>
                    <select
                      value={formData.payablesFlag}
                      onChange={(e) => setFormData((prev) => ({ ...prev, payablesFlag: e.target.value as 'Y' | 'N' | 'H' }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="Y">Y · Habilitado Emisión Vouchers CxP</option>
                      <option value="H">H · En Retención Preventiva Compliance</option>
                      <option value="N">N · Inactivo para Pagos</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">
                      Vinculación Funcionario / Relacionado (ATE)
                    </label>
                    <select
                      value={formData.employeeFlag}
                      onChange={(e) => setFormData((prev) => ({ ...prev, employeeFlag: e.target.value as 'Y' | 'N' }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="N">N · Tercero Independiente Sin Vínculo</option>
                      <option value="Y">Y · Parte Relacionada (Exige Auditoría Especial)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PESTAÑA 2: TABLA F0116 — DIRECCIONES POR FECHA EFECTIVA (EFTB)    */}
          {/* ================================================================= */}
          {activeTab === 'F0116' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Tabla F0116 · Direcciones Físicas y Tributarias por Fecha Efectiva (EFTB)
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                    Permite mantener historial de cambios de domicilio legal, sucursales regionales y bodegas asociadas a <span className="font-mono font-bold">AN8 #{formData.addressNumber}</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setF0116Addresses((prev) => [
                      ...prev,
                      {
                        id: `f0116-${Date.now()}-${prev.length + 1}`,
                        supplierId: initialSupplier?.id || 'pending',
                        addressNumber: formData.addressNumber,
                        effectiveDate: todayIso,
                        addressType: 'SUCURSAL_OPERATIVA',
                        addressLine1: '',
                        addressLine2: '',
                        commune: 'SANTIAGO',
                        city: 'SANTIAGO',
                        region: 'RM',
                        postalCode: '',
                        country: 'CL',
                        isPrimary: false
                      }
                    ])
                  }
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Plus size={14} /> Agregar Domicilio (F0116)
                </button>
              </div>

              <div className="space-y-4">
                {f0116Addresses.map((addr, idx) => (
                  <div
                    key={addr.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      addr.isPrimary ? 'bg-emerald-50/20 border-emerald-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-black text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          F0116 #{idx + 1} · AN8 {formData.addressNumber}
                        </span>
                        {addr.isPrimary && (
                          <span className="text-[9.5px] font-black text-emerald-700 uppercase tracking-wider">
                            ★ Domicilio Fiscal Principal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!addr.isPrimary && (
                          <button
                            type="button"
                            onClick={() =>
                              setF0116Addresses((prev) =>
                                prev.map((a, i) => ({ ...a, isPrimary: i === idx }))
                              )
                            }
                            className="text-[9.5px] font-bold text-indigo-600 hover:underline cursor-pointer"
                          >
                            Marcar como Principal
                          </button>
                        )}
                        {f0116Addresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setF0116Addresses((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">Tipo Domicilio</label>
                        <select
                          value={addr.addressType}
                          onChange={(e) =>
                            setF0116Addresses((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, addressType: e.target.value as any } : a))
                            )
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        >
                          <option value="CASA_MATRIZ">CASA MATRIZ</option>
                          <option value="DOMICILIO_TRIBUTARIO">DOMICILIO TRIBUTARIO SII</option>
                          <option value="SUCURSAL_OPERATIVA">SUCURSAL OPERATIVA</option>
                          <option value="BODEGA_DESPACHO">BODEGA / TALLER</option>
                        </select>
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          Fecha Efectiva Vigencia (EFTB)
                        </label>
                        <input
                          type="date"
                          value={addr.effectiveDate}
                          onChange={(e) =>
                            setF0116Addresses((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, effectiveDate: e.target.value } : a))
                            )
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          Dirección Línea 1 · Calle y Número (ADD1) *
                        </label>
                        <input
                          type="text"
                          value={addr.addressLine1}
                          onChange={(e) =>
                            setF0116Addresses((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, addressLine1: e.target.value.toUpperCase() } : a))
                            )
                          }
                          placeholder="Ej: AV. APOQUINDO 4501"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          Línea 2 · Oficina / Edificio / Bodega (ADD2)
                        </label>
                        <input
                          type="text"
                          value={addr.addressLine2 || ''}
                          onChange={(e) =>
                            setF0116Addresses((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, addressLine2: e.target.value.toUpperCase() } : a))
                            )
                          }
                          placeholder="Ej: OFICINA 1402 PISO 14"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">Comuna (CTY1)</label>
                        <input
                          type="text"
                          value={addr.commune}
                          onChange={(e) =>
                            setF0116Addresses((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, commune: e.target.value.toUpperCase() } : a))
                            )
                          }
                          placeholder="Ej: LAS CONDES"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">Región (ADDS)</label>
                        <select
                          value={addr.region}
                          onChange={(e) =>
                            setF0116Addresses((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, region: e.target.value } : a))
                            )
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        >
                          {CHILE_REGIONS.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.code} · {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">País (CTR)</label>
                        <input
                          type="text"
                          value={addr.country}
                          onChange={(e) =>
                            setF0116Addresses((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, country: e.target.value.toUpperCase() } : a))
                            )
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PESTAÑA 3: TABLA F0111 / F0115 / F01151 — CONTACTOS (WHO'S WHO)   */}
          {/* ================================================================= */}
          {activeTab === 'F0111' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Tablas F0111 / F0115 / F01151 · Maestro de Contactos, Teléfonos y Correos Electrónicos
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                    El Contacto Principal (<span className="font-mono font-bold">IDLN #0</span>) se sincroniza automáticamente con las Órdenes de Trabajo y notificaciones de pago.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setF0111Contacts((prev) => [
                      ...prev,
                      {
                        id: `f0111-${Date.now()}-${prev.length}`,
                        supplierId: initialSupplier?.id || 'pending',
                        addressNumber: formData.addressNumber,
                        lineId: prev.length,
                        contactType: 'TESORERIA',
                        fullName: '',
                        contactTaxId: '',
                        jobTitle: 'EJECUTIVO DE COBRANZAS Y FACTURACIÓN',
                        phonePrimary: '+569',
                        phoneSecondary: '',
                        electronicAddress: '',
                        canSignContracts: false,
                        isPrimary: false
                      }
                    ])
                  }
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Plus size={14} /> Agregar Contacto (F0111)
                </button>
              </div>

              <div className="space-y-4">
                {f0111Contacts.map((contact, idx) => (
                  <div
                    key={contact.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      contact.isPrimary ? 'bg-emerald-50/20 border-emerald-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[10px] font-black text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          IDLN #{idx} · {contact.contactType}
                        </span>
                        {contact.isPrimary && (
                          <span className="text-[9.5px] font-black text-emerald-700 uppercase tracking-wider">
                            ★ Contacto Principal de Notificaciones y OT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!contact.isPrimary && (
                          <button
                            type="button"
                            onClick={() =>
                              setF0111Contacts((prev) =>
                                prev.map((c, i) => ({ ...c, isPrimary: i === idx }))
                              )
                            }
                            className="text-[9.5px] font-bold text-indigo-600 hover:underline cursor-pointer"
                          >
                            Definir como Principal
                          </button>
                        )}
                        {f0111Contacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setF0111Contacts((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">Rol del Contacto (TYC)</label>
                        <select
                          value={contact.contactType}
                          onChange={(e) =>
                            setF0111Contacts((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, contactType: e.target.value as any } : c))
                            )
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        >
                          <option value="REP_LEGAL">REPRESENTANTE LEGAL</option>
                          <option value="COMERCIAL">EJECUTIVO COMERCIAL / COTIZACIONES</option>
                          <option value="TESORERIA">TESORERÍA / FACTURACIÓN Y PAGOS</option>
                          <option value="OPERACIONES">JEFE DE TERRENO / EMERGENCIAS 24/7</option>
                        </select>
                      </div>

                      <div className="md:col-span-5 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          Nombre Completo del Contacto (MLNM) *
                        </label>
                        <input
                          type="text"
                          value={idx === 0 ? effectiveContactName : contact.fullName}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            if (idx === 0) setFormData((prev) => ({ ...prev, contactName: val }));
                            setF0111Contacts((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, fullName: val } : c))
                            );
                          }}
                          placeholder="Ej: ALEJANDRO SOTOMAYOR RIVAS"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          RUT Representante / Contacto
                        </label>
                        <input
                          type="text"
                          value={contact.contactTaxId || ''}
                          onKeyDown={allowOnlyRUTKey}
                          onChange={(e) => {
                            const formatted = maskRUT(e.target.value);
                            setF0111Contacts((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, contactTaxId: formatted } : c))
                            );
                          }}
                          placeholder="Ej: 13.456.789-K"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          Teléfono Móvil Directo (F0115 - PH1) *
                        </label>
                        <input
                          type="text"
                          value={idx === 0 ? effectivePhone : contact.phonePrimary}
                          onChange={(e) => {
                            const masked = maskPhoneCLP(e.target.value);
                            if (idx === 0) setFormData((prev) => ({ ...prev, phone: masked }));
                            setF0111Contacts((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, phonePrimary: masked } : c))
                            );
                          }}
                          placeholder="+56912345678"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-5 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          Correo Electrónico Oficial (F01151 - EMAL) *
                        </label>
                        <input
                          type="email"
                          value={idx === 0 ? effectiveEmail : contact.electronicAddress}
                          onChange={(e) => {
                            const cleaned = cleanEmail(e.target.value);
                            if (idx === 0) setFormData((prev) => ({ ...prev, email: cleaned }));
                            setF0111Contacts((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, electronicAddress: cleaned } : c))
                            );
                          }}
                          placeholder="contacto@empresa.cl"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-3 flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={contact.canSignContracts}
                            onChange={(e) =>
                              setF0111Contacts((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, canSignContracts: e.target.checked } : c))
                              )
                            }
                            className="w-4 h-4 accent-emerald-600 rounded"
                          />
                          <span className="text-[10px] font-black text-slate-700 uppercase">
                            Poder de Firma Legal
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PESTAÑA 4: TABLA F0401 — MAESTRO DE COMPRAS Y CUENTAS POR PAGAR   */}
          {/* ================================================================= */}
          {activeTab === 'F0401' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Tabla F0401 · Maestro de Proveedores, Impuestos e Instrucciones de Cuentas por Pagar
                </h3>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                  Controla las Instrucciones de Contabilización Automática (AAI), retenciones tributarias, límites de aprobación de Órdenes de Trabajo y reglas de Cotejo de 3 Vías.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* CLASE CONTABLE APC (AAI) */}
                <div className="md:col-span-6 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                    Código Clase Contable / AAI Cuentas por Pagar (APC) *
                  </label>
                  <select
                    value={f0401Data.glClassCode}
                    onChange={(e) =>
                      setF0401Data((prev) => ({ ...prev, glClassCode: e.target.value as any }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    {GL_CLASS_CODES_APC.map((gl) => (
                      <option key={gl.code} value={gl.code}>
                        {gl.label} ({gl.account})
                      </option>
                    ))}
                  </select>
                </div>

                {/* CUENTA CONTABLE DE GASTO POR DEFECTO */}
                <div className="md:col-span-6 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                    Cuenta Contable de Imputación por Defecto (Plan de Cuentas)
                  </label>
                  <select
                    value={f0401Data.defaultExpenseAccount}
                    onChange={(e) =>
                      setF0401Data((prev) => ({ ...prev, defaultExpenseAccount: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    {EXPENSE_ACCOUNTS_CATALOG.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* CONDICIÓN DE PAGO TRAP */}
                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                    Condición de Pago Estándar (TRAP)
                  </label>
                  <select
                    value={f0401Data.paymentTermsCode}
                    onChange={(e) =>
                      setF0401Data((prev) => ({ ...prev, paymentTermsCode: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    {PAYMENT_TERMS_CHILE.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </div>

                {/* INSTRUMENTO DE PAGO PYIN */}
                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                    Instrumento de Pago (PYIN)
                  </label>
                  <select
                    value={f0401Data.paymentInstrument}
                    onChange={(e) =>
                      setF0401Data((prev) => ({ ...prev, paymentInstrument: e.target.value as any }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="T">T · Transferencia Electrónica Bancaria (TEF)</option>
                    <option value="P">P · Nómina Masiva Proveedores (PAC)</option>
                    <option value="V">V · Vale Vista Bancario Custodiado</option>
                    <option value="C">C · Cheque Corporativo Nominativo</option>
                  </select>
                </div>

                {/* RÉGIMEN DE IMPUESTO EXR1 */}
                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                    Código Explicación Impuesto SII (EXR1)
                  </label>
                  <select
                    value={f0401Data.taxExplanationCode}
                    onChange={(e) => {
                      const code = e.target.value as 'IVA' | 'EXE' | 'BH' | 'CON';
                      setF0401Data((prev) => ({
                        ...prev,
                        taxExplanationCode: code,
                        withholdingTaxPct: code === 'BH' ? 13.75 : 0
                      }));
                      setFormData((prev) => ({
                        ...prev,
                        taxDocumentType: code === 'BH' ? 'BOLETA_HONORARIOS' : 'FACTURA'
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="IVA">IVA · Factura Electrónica Afecta (19% IVA)</option>
                    <option value="EXE">EXE · Factura No Afecta o Exenta SII (0%)</option>
                    <option value="BH">BH · Boleta de Honorarios Electrónica (Ret. 13.75%)</option>
                    <option value="CON">CON · Contrato Especial Construcción / Obras</option>
                  </select>
                </div>

                {/* MONEDA BASE CRRP */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                    Moneda de Operación (CRRP)
                  </label>
                  <select
                    value={f0401Data.currencyCode}
                    onChange={(e) =>
                      setF0401Data((prev) => ({ ...prev, currencyCode: e.target.value as any }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900"
                  >
                    <option value="CLP">CLP · Peso Chileno</option>
                    <option value="UF">UF · Unidad de Fomento</option>
                    <option value="USD">USD · Dólar EE.UU.</option>
                  </select>
                </div>

                {/* MONTO MÍNIMO OT */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                    Monto Mínimo OT (MINO CLP)
                  </label>
                  <input
                    type="number"
                    value={f0401Data.minOrderAmount}
                    onChange={(e) =>
                      setF0401Data((prev) => ({ ...prev, minOrderAmount: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                {/* MONTO MÁXIMO OT SIN DOBLE FIRMA */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                    Tope Máximo OT Estándar (MAXO)
                  </label>
                  <input
                    type="number"
                    value={f0401Data.maxOrderAmount}
                    onChange={(e) =>
                      setF0401Data((prev) => ({ ...prev, maxOrderAmount: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                {/* CÓDIGO BLOQUEO DE PAGO HDPY */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                    Estado Liberación Pago (HDPY)
                  </label>
                  <select
                    value={f0401Data.holdPaymentCode}
                    onChange={(e) =>
                      setF0401Data((prev) => ({ ...prev, holdPaymentCode: e.target.value as any }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="00">00 · Liberado para Pago Normal</option>
                    <option value="01">01 · Retenido por Revisión Compliance</option>
                    <option value="02">02 · Retenido por Garantía / Recepción OT</option>
                    <option value="03">03 · Retenido por Notificación Factoring</option>
                  </select>
                </div>
              </div>

              {/* REGLAS DE CONTROL INTERNO Y CESIÓN DE FACTURAS (FACTORING) */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f0401Data.threeWayMatchRequired}
                      onChange={(e) =>
                        setF0401Data((prev) => ({ ...prev, threeWayMatchRequired: e.target.checked }))
                      }
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span className="text-xs font-black text-slate-900 uppercase">
                      Exigir Cotejo Estricto de 3 Vías (3-Way Match: OT + Recepción + Factura)
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-500 pl-6">
                    Impide liberar pagos en Tesorería si la factura no cuenta con Orden de Trabajo aprobada y Acta de Recepción Conforme firmada.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAssigned}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => ({ ...prev, isAssigned: checked }));
                        setF0401Data((prev) => ({
                          ...prev,
                          factoringAllowed: checked,
                          glClassCode: checked ? 'PCFAC' : 'PCNAC'
                        }));
                      }}
                      className="w-4 h-4 accent-rose-600 rounded"
                    />
                    <span className="text-xs font-black text-slate-900 uppercase">
                      Opera con Cesión de Créditos / Factoring Autorizado
                    </span>
                  </label>
                  {formData.isAssigned && (
                    <input
                      type="text"
                      value={formData.assignedToEntity}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setFormData((prev) => ({ ...prev, assignedToEntity: val }));
                        setF0401Data((prev) => ({ ...prev, defaultFactoringEntity: val }));
                      }}
                      placeholder="Nombre Entidad de Factoring (Ej: TANNER FACTORING S.A.)"
                      className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-bold uppercase text-rose-900"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PESTAÑA 5: TABLA F0030 — MAESTRO DE CUENTAS BANCARIAS Y PRE-NOTA  */}
          {/* ================================================================= */}
          {activeTab === 'F0030' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Tabla F0030 · Maestro de Cuentas Bancarias de Terceros y Pre-Nota TEF
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                    Registra las coordenadas bancarias SBIF/CMF y el Certificado de Titularidad Bancaria para transferencias electrónicas seguras.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setF0030Banks((prev) => [
                      ...prev,
                      {
                        id: `f0030-${Date.now()}-${prev.length + 1}`,
                        supplierId: initialSupplier?.id || 'pending',
                        addressNumber: formData.addressNumber,
                        recordType: 'S',
                        bankCode: '012',
                        bankName: 'BANCO ESTADO',
                        accountType: 'CUENTA CORRIENTE',
                        accountNumber: '',
                        holderRut: formData.taxId,
                        holderName: formData.name,
                        remittanceEmail: effectiveEmail,
                        prenoteStatus: 'P',
                        isDefault: false
                      }
                    ])
                  }
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Plus size={14} /> Agregar Cuenta Bancaria (F0030)
                </button>
              </div>

              <div className="space-y-4">
                {f0030Banks.map((bank, idx) => (
                  <div
                    key={bank.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      bank.isDefault ? 'bg-emerald-50/20 border-emerald-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[10px] font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          F0030 #{idx + 1} · SBIF [{bank.bankCode}]
                        </span>
                        {bank.isDefault && (
                          <span className="text-[9.5px] font-black text-emerald-700 uppercase tracking-wider">
                            ★ Cuenta Principal de Pago TEF
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setUploadingBankIdx(idx);
                            bankCertInputRef.current?.click();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-[9.5px] font-black uppercase cursor-pointer"
                        >
                          <Upload size={12} className="text-emerald-600" />
                          {bank.bankCertName ? 'Reemplazar Certificado Bancario' : 'Adjuntar Certificado Titularidad'}
                        </button>
                        {bank.bankCertUrl && (
                          <button
                            type="button"
                            onClick={() => openDocumentSecurely(bank.bankCertUrl!, bank.bankCertName || 'Certificado_Bancario.pdf')}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-[9.5px] font-black uppercase cursor-pointer"
                          >
                            <Eye size={12} /> Ver Certificado
                          </button>
                        )}
                        {f0030Banks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setF0030Banks((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          Institución Bancaria (TNST) *
                        </label>
                        <select
                          value={idx === 0 ? effectiveBankName : bank.bankName}
                          onChange={(e) => {
                            const bName = e.target.value;
                            const bCode = CHILE_BANK_SBIF_CODES[bName] || '001';
                            if (idx === 0) setFormData((prev) => ({ ...prev, bankName: bName }));
                            setF0030Banks((prev) =>
                              prev.map((b, i) => (i === idx ? { ...b, bankName: bName, bankCode: bCode } : b))
                            );
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        >
                          <option value="">Seleccione Banco...</option>
                          {BANK_LIST.map((b) => (
                            <option key={b} value={b}>
                              [{CHILE_BANK_SBIF_CODES[b] || '999'}] {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          Tipo de Cuenta Bancaria *
                        </label>
                        <select
                          value={idx === 0 ? effectiveAccountType : bank.accountType}
                          onChange={(e) => {
                            const aType = e.target.value;
                            if (idx === 0) setFormData((prev) => ({ ...prev, accountType: aType }));
                            setF0030Banks((prev) =>
                              prev.map((b, i) => (i === idx ? { ...b, accountType: aType } : b))
                            );
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        >
                          <option value="">Seleccione Tipo...</option>
                          {ACCOUNT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          Número de Cuenta (CBNK) *
                        </label>
                        <input
                          type="text"
                          value={idx === 0 ? effectiveAccountNumber : bank.accountNumber}
                          onKeyDown={allowOnlyDigitsKey}
                          onChange={(e) => {
                            const num = e.target.value.replace(/[^0-9\-]/g, '');
                            if (idx === 0) setFormData((prev) => ({ ...prev, accountNumber: num }));
                            setF0030Banks((prev) =>
                              prev.map((b, i) => (i === idx ? { ...b, accountNumber: num } : b))
                            );
                          }}
                          placeholder="Ej: 00184920155"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          RUT Titular Cuenta
                        </label>
                        <input
                          type="text"
                          value={bank.holderRut || formData.taxId}
                          onChange={(e) =>
                            setF0030Banks((prev) =>
                              prev.map((b, i) => (i === idx ? { ...b, holderRut: maskRUT(e.target.value) } : b))
                            )
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-5 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          Nombre Titular Cuenta Receptora
                        </label>
                        <input
                          type="text"
                          value={bank.holderName || formData.name}
                          onChange={(e) =>
                            setF0030Banks((prev) =>
                              prev.map((b, i) => (i === idx ? { ...b, holderName: e.target.value.toUpperCase() } : b))
                            )
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[9.5px] font-black text-slate-600 uppercase">
                          Estado Pre-Nota Bancaria (PREN)
                        </label>
                        <select
                          value={bank.prenoteStatus}
                          onChange={(e) =>
                            setF0030Banks((prev) =>
                              prev.map((b, i) => (i === idx ? { ...b, prenoteStatus: e.target.value as any } : b))
                            )
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        >
                          <option value="A">A · Cuenta Verificada y Activa para TEF</option>
                          <option value="P">P · Pre-Nota en Validación de Titularidad</option>
                          <option value="B">B · Cuenta Bloqueada Preventivamente</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PESTAÑA 6: FORMULARIO DI-01 · DEBIDA DILIGENCIA Y COMPLIANCE UAF  */}
          {/* ================================================================= */}
          {activeTab === 'DI01' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Protocolo DI-01 · Evaluación de Riesgo UAF y Checklist de Integridad Documental
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                    Requisito obligatorio de Control Interno para habilitar el proveedor en el Maestro Activo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      complianceMaster: {
                        conflictThirdParty: true,
                        conflictExecutive: true,
                        beneficiariesUAF: true,
                        dueDiligenceCert: true,
                        paymentVoucher: true,
                        invoice: true,
                        receptionCertificate: true,
                        photoSet: true
                      }
                    }))
                  }
                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Marcar 8 Hitos Verificados
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                    Nivel de Riesgo Compliance / UAF *
                  </label>
                  <select
                    value={formData.dueDiligenceRisk}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dueDiligenceRisk: e.target.value as RiskLevel }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="">Seleccione Nivel de Riesgo...</option>
                    <option value="RIESGO BAJO">RIESGO BAJO · Aprobación Estándar</option>
                    <option value="RIESGO MEDIO">RIESGO MEDIO · Monitoreo Semestral</option>
                    <option value="RIESGO ALTO">RIESGO ALTO · Debida Diligencia Reforzada</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                    Fecha de Auditoría Due Diligence *
                  </label>
                  <input
                    type="date"
                    value={formData.dueDiligenceDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dueDiligenceDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                    URL Carpeta Digital / Expediente Cloud
                  </label>
                  <input
                    type="text"
                    value={formData.folderUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, folderUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {[
                  { key: 'conflictThirdParty', label: '1. Declaración Jurada Ausencia Conflicto de Interés (Proveedor)' },
                  { key: 'conflictExecutive', label: '2. Declaración Ausencia Conflicto de Interés (Ejecutivo Solicitante)' },
                  { key: 'beneficiariesUAF', label: '3. Declaración de Beneficiarios Finales UAF (Ley N° 19.913)' },
                  { key: 'dueDiligenceCert', label: '4. Certificado de Debida Diligencia y Screening Judicial/SII' },
                  { key: 'invoice', label: '5. Verificación Habilitación Emisión DTE / Factura SII' },
                  { key: 'receptionCertificate', label: '6. Adherencia a Protocolo de Acta de Recepción Conforme' },
                  { key: 'photoSet', label: '7. Obligación de Respaldo Fotográfico Georreferenciado en OT' },
                  { key: 'paymentVoucher', label: '8. Validación de Cuenta Bancaria y Comprobante de Egreso' }
                ].map((item) => {
                  const checked = formData.complianceMaster[item.key as keyof typeof formData.complianceMaster];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleCompliance(item.key as keyof typeof formData.complianceMaster)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        checked
                          ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                          checked ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300'
                        }`}
                      >
                        {checked && <CheckSquare size={13} />}
                      </div>
                      <span className="text-[10.5px] font-black uppercase tracking-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* BARRA RESUMEN DE VALIDACIÓN EN TIEMPO REAL */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono">
              <span>
                AN8: <strong className="text-emerald-400">#{formData.addressNumber}</strong>
              </span>
              <span>·</span>
              <span>
                RUT: <strong className={isRUTValid ? 'text-emerald-400' : 'text-amber-400'}>{formData.taxId || 'PENDIENTE'}</strong>
              </span>
              <span>·</span>
              <span>
                AAI CxP: <strong className="text-sky-300">{f0401Data.glClassCode}</strong>
              </span>
              <span>·</span>
              <span>
                BANCO TEF: <strong className="text-emerald-300">{effectiveBankName || 'PENDIENTE'}</strong>
              </span>
              <span>·</span>
              <span>
                INTEGRIDAD: <strong className="text-white">{calculateConfidence()}%</strong>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isFormIncomplete}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isFormIncomplete
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                }`}
              >
                <Save size={15} />
                {isEditing ? 'Guardar Cambios en 5 Tablas' : 'Grabar Proveedor en 5 Tablas (F0101 - F0030)'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierForm;
