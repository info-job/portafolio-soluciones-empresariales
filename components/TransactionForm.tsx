
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, INCOME_CATEGORIES, EXPENSE_CATEGORIES, Supplier, InsuranceCompany, Property, Contract, ComplianceChecklist, INSURANCE_COMPANIES } from '../types';
import { CHART_OF_ACCOUNTS } from '../lib/accountingData';
import { X, ShieldCheck, MapPin, DollarSign, ArrowUpCircle, ArrowDownCircle, CheckSquare, Square, Info, FileSignature, AlertCircle, AlertTriangle, CalendarClock, Book, FileUp, Loader2, CheckCircle2 } from 'lucide-react';
import { uploadFile, openDocumentSecurely } from '@/lib/storage';
import { useNotification } from './NotificationProvider';
import { maskRUT, validateRUTDetailed, maskMoneyCLP, maskFolioOrInvoice, checkDuplicateRUT, allowOnlyRUTKey, allowOnlyDigitsKey } from '../lib/inputMasks';

interface TransactionFormProps {
  onClose: () => void;
  onSave: (data: Omit<Transaction, 'id' | 'timestamp' | 'user'>) => void;
  initialData?: Transaction;
  defaultType: TransactionType;
  activeSuppliers: Supplier[];
  properties: Property[];
  contracts: Contract[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, onSave, initialData, defaultType, activeSuppliers, properties, contracts }) => {
  const currentType = initialData?.type || defaultType;
  const isIncome = currentType === 'INCOME';
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const [formData, setFormData] = useState({
    description: initialData?.description || '',
    amount: initialData?.amount || 0,
    category: initialData?.category || categories[0],
    type: currentType,
    documentType: initialData?.documentType || (isIncome ? 'DEPÓSITO' : 'FACTURA'),
    documentNumber: initialData?.documentNumber || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    invoiceDate: initialData?.invoiceDate || new Date().toISOString().split('T')[0],
    supplierId: initialData?.supplierId || '',
    supplierName: initialData?.supplierName || '',
    supplierTaxId: initialData?.supplierTaxId || '',
    propertyId: initialData?.propertyId || '',
    accountCode: initialData?.accountCode || '',
    subCategory: initialData?.subCategory || 'GENERAL',
    insuranceCompany: initialData?.insuranceCompany || 'VIDA' as InsuranceCompany,
    compliance: initialData?.compliance || {
      conflictThirdParty: false,
      conflictExecutive: false,
      beneficiariesUAF: false,
      dueDiligenceCert: false,
      paymentVoucher: false,
      invoice: false,
      receptionCertificate: false,
      photoSet: false,
      isExempt: false
    } as ComplianceChecklist,
    documentUrl: initialData?.documentUrl || '',
    documentName: initialData?.documentName || ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTermProperty, setSearchTermProperty] = useState('');
  const { notify, dismiss } = useNotification();

  // SELECCIÓN DE PROVEEDOR ACTUAL
  const selectedSupplier = useMemo(() => 
    activeSuppliers.find(s => s.id === formData.supplierId), 
    [formData.supplierId, activeSuppliers]
  );

  // Lógica de detección de contrato vigente Y debida diligencia activa
  const complianceStatus = useMemo(() => {
    if (!formData.supplierId || !selectedSupplier) return { hasContract: false, isDueDiligenceValid: false };
    
    const hasContract = contracts.some(c => c.supplierId === formData.supplierId && c.status === 'VIGENTE');
    
    // Validar Debida Diligencia (máx 1 año, o 6 meses si es RIESGO ALTO según CMP-PP-01)
    const issueDate = new Date(selectedSupplier.dueDiligenceDate);
    const now = new Date();
    const diffTime = now.getTime() - issueDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const isHighRisk = selectedSupplier.dueDiligenceRisk === 'RIESGO ALTO';
    const limitDays = isHighRisk ? 180 : 365;
    const isDueDiligenceValid = diffDays <= limitDays;

    return { hasContract, isDueDiligenceValid };
  }, [formData.supplierId, selectedSupplier, contracts]);

  // Actualizar exención si cambia el proveedor
  React.useEffect(() => {
    // Solo está exento si tiene contrato vigente Y la debida diligencia maestro no ha caducado
    const isExempt = complianceStatus.hasContract && complianceStatus.isDueDiligenceValid;
    
    const hasDoc = (type: string) => {
      return selectedSupplier?.complianceRequirements?.some(r => 
        r.type === type && 
        r.status === 'VALID' && 
        (!r.expiryDate || new Date(r.expiryDate) >= new Date())
      );
    };
    
    setFormData(prev => ({
      ...prev,
      compliance: { 
        ...prev.compliance, 
        isExempt,
        // Si está exento, marcamos como presentes por defecto (vienen del maestro)
        // Si no está exento, revisamos si ya existen en el registro del proveedor
        conflictThirdParty: isExempt || hasDoc('CONFLICT_INTEREST_THIRD') || prev.compliance.conflictThirdParty,
        conflictExecutive: isExempt || hasDoc('CONFLICT_INTEREST_EXEC') || prev.compliance.conflictExecutive,
        beneficiariesUAF: isExempt || hasDoc('UBO_DECLARATION') || prev.compliance.beneficiariesUAF,
        dueDiligenceCert: isExempt || hasDoc('DUE_DILIGENCE') || prev.compliance.dueDiligenceCert,
        paymentVoucher: isExempt || hasDoc('PAYMENT_VOUCHER') || prev.compliance.paymentVoucher,
        invoice: isExempt || hasDoc('INVOICE') || prev.compliance.invoice,
        receptionCertificate: isExempt || hasDoc('WORK_REPORT') || prev.compliance.receptionCertificate,
        photoSet: isExempt || hasDoc('PHOTO_SET') || prev.compliance.photoSet
      }
    }));
  }, [complianceStatus, selectedSupplier]);

  const isComplianceComplete = useMemo(() => {
    if (isIncome || formData.category !== 'PAGO A PROVEEDOR') return true;
    if (formData.compliance.isExempt) return true;
    return (
      formData.compliance.conflictThirdParty &&
      formData.compliance.conflictExecutive &&
      formData.compliance.beneficiariesUAF &&
      formData.compliance.dueDiligenceCert &&
      formData.compliance.paymentVoucher &&
      formData.compliance.invoice &&
      formData.compliance.receptionCertificate &&
      formData.compliance.photoSet
    );
  }, [formData, isIncome]);

  const isFormIncomplete = !formData.description || !formData.amount || !formData.documentNumber || !formData.propertyId || !formData.accountCode || !isComplianceComplete || isUploading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormIncomplete) return;

    const loadingId = notify(`Guardando transacción...`, 'loading', 0);
    setIsUploading(true);
    let finalDocumentUrl = fileBase64 || formData.documentUrl;
    let finalDocumentName = formData.documentName;

    if (selectedFile) {
      try {
        const path = `transactions/${crypto.randomUUID()}_${selectedFile.name}`;
        finalDocumentUrl = await uploadFile(selectedFile, path);
        finalDocumentName = selectedFile.name;
      } catch (error) {
        console.error("Error uploading transaction document:", error);
        notify("Error al subir el documento de respaldo", 'error');
        if (fileBase64) {
          finalDocumentUrl = fileBase64;
        }
      }
    }

    onSave({
      ...formData,
      documentUrl: finalDocumentUrl,
      documentName: finalDocumentName
    });
    dismiss(loadingId);
    notify("Transacción guardada con éxito", 'success');
    setIsUploading(false);
  };

  const selectedProperty = properties.find(p => p.id === formData.propertyId);

  const filteredProperties = useMemo(() => {
    const term = searchTermProperty.toUpperCase().trim();
    if (!term) return [];
    return properties.filter(p => 
      p.address.includes(term) || 
      p.code.includes(term) || 
      p.building.includes(term) || 
      p.floor.includes(term)
    ).slice(0, 10);
  }, [properties, searchTermProperty]);

  const toggleCompliance = (field: keyof ComplianceChecklist) => {
    if (formData.compliance.isExempt) return; // No permitir cambiar si está exento
    setFormData(prev => ({
      ...prev,
      compliance: { ...prev.compliance, [field]: !prev.compliance[field] }
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-4">
      <div className={`bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden border-[10px] border-slate-100 scale-in-center`}>
        
        <div className={`px-10 py-8 flex justify-between items-center text-white ${isIncome ? 'bg-green-700' : 'bg-rose-700'}`}>
          <div className="flex items-center gap-4">
            {isIncome ? <ArrowUpCircle size={32} /> : <ArrowDownCircle size={32} />}
            <h2 className="text-xl font-black uppercase tracking-tighter">{isIncome ? 'Ingreso' : 'Egreso'} - {formData.category}</h2>
          </div>
          <button onClick={onClose} className="hover:bg-black/20 p-2 rounded-full transition-all"><X size={24}/></button>
        </div>

        <form className="p-10 space-y-6 max-h-[80vh] overflow-y-auto custom-audit-scroll" onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor / Tercero</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-slate-500" 
                  value={formData.supplierId} 
                  onChange={e => {
                    const sId = e.target.value;
                    const s = activeSuppliers.find(x => x.id === sId);
                    setFormData(p => ({ 
                      ...p, 
                      supplierId: sId,
                      supplierName: s ? s.name : '',
                      supplierTaxId: s ? s.taxId : ''
                    }));
                  }}
                >
                   <option value="">Seleccione...</option>
                   <option value="NEW">-- NUEVO PROVEEDOR --</option>
                   {activeSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Compañía</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase" value={formData.insuranceCompany} onChange={e => setFormData(p => ({ ...p, insuranceCompany: e.target.value as InsuranceCompany }))}>
                   {INSURANCE_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Subcategoría / Edificio</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-slate-500" 
                  value={formData.subCategory} 
                  onChange={e => setFormData(p => ({ ...p, subCategory: e.target.value }))}
                >
                   <option value="GENERAL">GENERAL</option>
                   <option value="EDIFICIO CENTENARIO">EDIFICIO CENTENARIO</option>
                   <option value="OFICINA INMOBILIARIA">OFICINA INMOBILIARIA</option>
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase" value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                   {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
          </div>

           {formData.supplierId === 'NEW' && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
               <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nombre / Razón Social</label>
                  <input 
                    required 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black uppercase" 
                    value={formData.supplierName} 
                    onChange={e => setFormData(p => ({ ...p, supplierName: e.target.value.toUpperCase() }))}
                    placeholder="NOMBRE DEL PROVEEDOR"
                  />
               </div>
               <div className="space-y-1">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">RUT Proveedor</label>
                    {formData.supplierTaxId && checkDuplicateRUT(formData.supplierTaxId, activeSuppliers).isDuplicate ? (
                      <span className="text-[8px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300 animate-pulse">
                        <AlertTriangle size={10} className="text-amber-600" /> Duplicado
                      </span>
                    ) : formData.supplierTaxId && !validateRUTDetailed(formData.supplierTaxId).isValid ? (
                      <span className="text-[8px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                        {validateRUTDetailed(formData.supplierTaxId).error || 'Inválido'}
                      </span>
                    ) : formData.supplierTaxId && validateRUTDetailed(formData.supplierTaxId).isValid ? (
                      <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Válido
                      </span>
                    ) : null}
                  </div>
                  <input 
                    required 
                    className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-xs font-mono font-black uppercase outline-none transition-all ${
                      formData.supplierTaxId && checkDuplicateRUT(formData.supplierTaxId, activeSuppliers).isDuplicate
                        ? 'border-amber-400 bg-amber-50/40 text-amber-950'
                        : formData.supplierTaxId && !validateRUTDetailed(formData.supplierTaxId).isValid
                        ? 'border-rose-400 bg-rose-50/20 text-rose-900'
                        : formData.supplierTaxId && validateRUTDetailed(formData.supplierTaxId).isValid
                        ? 'border-emerald-400 bg-emerald-50/10'
                        : 'border-slate-200'
                    }`} 
                    value={formData.supplierTaxId} 
                    onKeyDown={allowOnlyRUTKey}
                    onChange={e => {
                      const masked = maskRUT(e.target.value);
                      setFormData(p => ({ ...p, supplierTaxId: masked }));
                    }}
                    placeholder="12.345.678-K"
                  />
                  {formData.supplierTaxId && checkDuplicateRUT(formData.supplierTaxId, activeSuppliers).warningMessage && (
                    <p className="text-[9.5px] font-bold text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200 flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} className="shrink-0 text-amber-600" />
                      <span>{checkDuplicateRUT(formData.supplierTaxId, activeSuppliers).warningMessage}</span>
                    </p>
                  )}
               </div>
            </div>
          )}

          {/* CHECKLIST DE CUMPLIMIENTO - REFORZADO CON DEBIDA DILIGENCIA */}
          {!isIncome && formData.category === 'PAGO A PROVEEDOR' && (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-[32px] p-6 space-y-4">
               <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                     <ShieldCheck size={18} className="text-indigo-600" /> Checklist Compliance Legal
                  </h3>
                  {formData.compliance.isExempt ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-black uppercase border border-emerald-200 shadow-sm animate-pulse">
                       <FileSignature size={12}/> Exento (Maestro Validado)
                    </div>
                  ) : formData.supplierId && !complianceStatus.isDueDiligenceValid ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[8px] font-black uppercase border border-rose-200">
                       <CalendarClock size={12}/> Due Diligence Caducada
                    </div>
                  ) : null}
               </div>

               {formData.compliance.isExempt ? (
                 <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-start gap-3">
                    <Info size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase leading-tight italic">
                         Detección Automática: Proveedor con contrato vigente y Due Diligence al día ({selectedSupplier?.dueDiligenceDate}). 
                      </p>
                      <p className="text-[8px] font-black text-indigo-400 uppercase mt-1">Los documentos de respaldo ya constan en el expediente maestro.</p>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-3">
                    {formData.supplierId && !complianceStatus.isDueDiligenceValid && (
                       <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-center gap-3">
                          <AlertCircle size={16} className="text-rose-600"/>
                          <p className="text-[8px] font-black text-rose-800 uppercase">Debida diligencia caducada en el maestro. Se exige checklist manual para este pago.</p>
                       </div>
                    )}
                    <div className="grid grid-cols-1 gap-2">
                        {[
                          { id: 'paymentVoucher', label: 'Comprobante de Egreso' },
                          { id: 'invoice', label: 'Factura / Boleta' },
                          { id: 'receptionCertificate', label: 'Recepción Conforme / Informe' },
                          { id: 'conflictThirdParty', label: 'Declaración de Conflicto de Interés de Terceros' },
                          { id: 'conflictExecutive', label: 'Declaración de Ausencia de Conflicto de Interés del Ejecutivo' },
                          { id: 'beneficiariesUAF', label: 'Declaración de Beneficiarios Finales (UAF)' },
                          { id: 'dueDiligenceCert', label: 'Certificación Due Diligence (Compliance)' },
                          { id: 'photoSet', label: 'Set Fotográfico del Trabajo' }
                        ].map(item => (
                          <button 
                            key={item.id}
                            type="button"
                            onClick={() => toggleCompliance(item.id as keyof ComplianceChecklist)}
                            className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${formData.compliance[item.id as keyof ComplianceChecklist] ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                          >
                             <span className="text-[10px] font-black uppercase">{item.label}</span>
                             {formData.compliance[item.id as keyof ComplianceChecklist] ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        ))}
                    </div>
                 </div>
               )}
            </div>
          )}

          <div className="space-y-1">
             <div className="flex justify-between items-center px-1">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Propiedad Asociada</label>
               <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Pool Activo</span>
             </div>
             <div className="relative">
                <input 
                  type="text" 
                  placeholder="BUSCAR UNIDAD..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-slate-500"
                  value={selectedProperty ? `${selectedProperty.building} - ${selectedProperty.address}` : searchTermProperty}
                  onChange={e => { setSearchTermProperty(e.target.value.toUpperCase()); setFormData(p => ({...p, propertyId: ''})); }}
                />
                <MapPin size={16} className="absolute left-3 top-3.5 text-slate-300" />
             </div>
             {searchTermProperty && !formData.propertyId && (
                <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-32 overflow-auto z-50 relative">
                   {filteredProperties.map(p => (
                      <button key={p.id} type="button" onClick={() => { setFormData(p_ => ({ ...p_, propertyId: p.id })); setSearchTermProperty(''); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b text-[10px] font-black uppercase">{p.building} - {p.address}</button>
                   ))}
                </div>
             )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">N° Documento / Folio</label>
                <input 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-black uppercase outline-none focus:border-indigo-500" 
                  value={formData.documentNumber} 
                  onChange={e => setFormData(p => ({ ...p, documentNumber: maskFolioOrInvoice(e.target.value) }))}
                  placeholder="DOC-001"
                />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">F. Emisión</label>
                <input required type="date" className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black cursor-pointer transition-colors" value={formData.invoiceDate} onChange={e => setFormData(p => ({ ...p, invoiceDate: e.target.value }))} onClick={(e) => { try { e.currentTarget.showPicker(); } catch (error) {} }} />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Glosa / Concepto del Pago</label>
             <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black uppercase" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value.toUpperCase() }))} placeholder="EJ: REPARACIÓN ASCENSOR PISO 5..."/>
          </div>

          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Cuenta Contable</label>
             <div className="relative">
                <Book className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-slate-500 appearance-none"
                  value={formData.accountCode}
                  onChange={e => setFormData(p => ({ ...p, accountCode: e.target.value }))}
                >
                  <option value="">SELECCIONE CUENTA...</option>
                  {CHART_OF_ACCOUNTS.filter(acc => acc.level >= 3).map(acc => (
                    <option key={acc.id} value={acc.code}>{acc.code} - {acc.name}</option>
                  ))}
                </select>
             </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[32px] text-white flex justify-between items-center shadow-2xl">
             <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between pr-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto Total Liquidado</label>
                  {formData.amount > 0 && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      $ {formData.amount.toLocaleString('es-CL')} CLP
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                   <DollarSign size={24} className="text-slate-500" />
                   <input 
                     required 
                     type="text" 
                     className="bg-transparent text-3xl font-black font-mono outline-none w-full text-emerald-400 placeholder-slate-600" 
                     onKeyDown={allowOnlyDigitsKey} 
                     value={formData.amount ? formData.amount.toLocaleString('es-CL') : ''} 
                     onChange={e => {
                       const { rawNumber } = maskMoneyCLP(e.target.value);
                       setFormData(p => ({ ...p, amount: rawNumber }));
                     }} 
                     placeholder="0"
                   />
                </div>
             </div>
             {isComplianceComplete && (
                <div className="bg-emerald-500/20 p-4 rounded-3xl border border-emerald-500/30">
                   <ShieldCheck size={40} className="text-emerald-400" />
                </div>
             )}
          </div>

          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Soporte Digital (Copia del Documento)</label>
             <div className="relative group">
                <input 
                  type="file" 
                  className="hidden" 
                  id="transaction-file" 
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFileBase64(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    } else {
                      setFileBase64(null);
                    }
                  }}
                  accept=".pdf,image/*"
                />
                <label 
                  htmlFor="transaction-file"
                  className={`flex items-center justify-between w-full bg-slate-50 border-2 border-dashed rounded-2xl px-6 py-4 cursor-pointer transition-all ${selectedFile ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-slate-400'}`}
                >
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${selectedFile ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                         <FileUp size={18} />
                      </div>
                      <div>
                         <div className="text-xs font-black uppercase tracking-wider">
                            {selectedFile ? selectedFile.name : (formData.documentName || 'SUBIR COPIA DIGITAL')}
                         </div>
                         <div className="text-[9px] font-bold text-slate-400 uppercase">
                            {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'PDF O IMAGEN (MÁX 10MB)'}
                         </div>
                      </div>
                   </div>
                   {selectedFile && (
                      <div className="text-indigo-600 font-black text-[10px] uppercase">Cambiar</div>
                   )}
                </label>
             </div>
          </div>

          <button 
            type="submit" 
            disabled={isFormIncomplete} 
            className={`w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.4em] shadow-xl border-b-8 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-3 ${isFormIncomplete ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed' : 'bg-slate-900 text-white border-black'}`}
          >
             {isUploading && <Loader2 size={18} className="animate-spin" />}
             {isUploading ? 'PROCESANDO Y SUBIENDO...' : 'Grabar y Procesar Pago'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
