import React, { useState, useMemo } from 'react';
import { 
  Receipt, CreditCard, Plus, Search, FileText, CheckCircle2, Download, Building, User, Calendar, 
  DollarSign, Filter, Sparkles, ShieldCheck, ArrowUpRight, HardDrive, RefreshCw, X, FileCheck, HelpCircle, Eye, Printer
} from 'lucide-react';
import { LeaseContract, LeasePayment, Property, OfficialDocument, WorkOrder, ModuleType } from '../types';
import { downloadRentPaymentReceiptPDF } from '../lib/pdfGenerator';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { storage } from '../lib/storageEngine';
import { useNotification } from './NotificationProvider';
import { JDEGridContextMenu } from './JDEGridContextMenu';

interface PaymentRegistrationModuleProps {
  leaseContracts: LeaseContract[];
  properties: Property[];
  workOrders?: WorkOrder[];
  officialDocs?: OfficialDocument[];
  currentUser: string;
  companyLogo?: string;
  onSaveLeaseContract: (contract: LeaseContract) => Promise<void>;
  setOfficialDocs?: React.Dispatch<React.SetStateAction<OfficialDocument[]>>;
  setActiveModule?: (module: ModuleType) => void;
}

export const PaymentRegistrationModule: React.FC<PaymentRegistrationModuleProps> = ({
  leaseContracts,
  properties,
  workOrders = [],
  officialDocs = [],
  currentUser,
  companyLogo,
  onSaveLeaseContract,
  setOfficialDocs,
  setActiveModule
}) => {
  const { notify } = useNotification();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'RENT' | 'OT' | 'GARANTIA'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewModalData, setPreviewModalData] = useState<{
    dataUrl: string;
    docNumber: string;
    title: string;
  } | null>(null);

  // AssetFlow Enterprise Grid Context Menu State (P03B20)
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    payment: LeasePayment;
    contract: LeaseContract;
    property?: Property;
  } | null>(null);

  const handleRowContextMenu = (e: React.MouseEvent, payment: LeasePayment, contract: LeaseContract, property?: Property) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const clickX = e?.clientX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const clickY = e?.clientY ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 300);

    setGridContextMenu({
      x: Math.max(10, Math.min(clickX, typeof window !== 'undefined' ? window.innerWidth - 240 : 800)),
      y: Math.max(10, Math.min(clickY, typeof window !== 'undefined' ? window.innerHeight - 380 : 500)),
      payment,
      contract,
      property
    });
  };

  // Generate and preview a sample receipt
  const handlePreviewSampleReceipt = () => {
    const sampleContract: LeaseContract = {
      id: 'LC-ARR-2026-88',
      tenantName: 'Juan Carlos Pérez Soto',
      tenantTaxId: '15.432.890-1',
      propertyId: 'PROP-PROV-502',
      propertyLabel: 'Av. Providencia 1230, Depto 502, Providencia',
      monthlyAmount: 680000,
      currency: 'CLP',
      startDate: '2026-01-01',
      endDate: '2027-01-01',
      status: 'VIGENTE',
      userCreator: currentUser || 'SISTEMA CAJA',
      timestamp: Date.now()
    };

    const samplePayment: LeasePayment = {
      id: 'pay-sample-882199',
      date: new Date().toISOString().split('T')[0],
      amountPaid: 680000,
      period: new Date().toISOString().slice(0, 7),
      paymentMethod: 'TRANSFERENCIA',
      referenceNumber: 'TR-882190412',
      registeredBy: currentUser || 'TESORERÍA ASSETFLOW',
      timestamp: Date.now()
    };

    const sampleProperty: Property = {
      id: 'PROP-PROV-502',
      code: 'PROV-502',
      building: 'Edificio Torre Providencia',
      address: 'Av. Providencia 1230, Depto 502',
      floor: '5',
      commune: 'Providencia',
      type: 'DEPARTAMENTO',
      rentalAmount: 680000,
      status: 'ARRENDADA',
      propertyRole: '1234-502'
    };

    const { dataUrl, docNumber } = downloadRentPaymentReceiptPDF({
      contract: sampleContract,
      payment: samplePayment,
      property: sampleProperty,
      currentUser: currentUser || 'SISTEMA CAJA'
    });

    setPreviewModalData({
      dataUrl,
      docNumber,
      title: 'Ejemplo de Comprobante de Pago de Arriendo'
    });
  };

  // Preview receipt for an existing payment
  const handlePreviewPaymentReceipt = (contract: LeaseContract, payment: LeasePayment, property?: Property) => {
    const { dataUrl, docNumber } = downloadRentPaymentReceiptPDF({
      contract,
      payment,
      property,
      currentUser: currentUser || 'SISTEMA CAJA'
    });

    setPreviewModalData({
      dataUrl,
      docNumber,
      title: `Comprobante de Pago - ${contract.tenantName} (${payment.period})`
    });
  };

  // Form State
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [paymentPeriod, setPaymentPeriod] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('TRANSFERENCIA');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Selected contract object for form preview
  const selectedContract = useMemo(() => {
    return leaseContracts.find(c => c.id === selectedContractId) || null;
  }, [leaseContracts, selectedContractId]);

  // Handle contract change in modal
  const handleContractChange = (id: string) => {
    setSelectedContractId(id);
    const found = leaseContracts.find(c => c.id === id);
    if (found) {
      setAmountPaid(String(found.monthlyAmount || ''));
    }
  };

  // Calculate all rent payment receipts across contracts
  const allRentPayments = useMemo(() => {
    const list: Array<{
      payment: LeasePayment;
      contract: LeaseContract;
      property?: Property;
    }> = [];

    leaseContracts.forEach(contract => {
      const prop = properties.find(p => p.id === contract.propertyId);
      (contract.payments || []).forEach(payment => {
        list.push({ payment, contract, property: prop });
      });
    });

    // Sort descending by payment date
    return list.sort((a, b) => new Date(b.payment.date).getTime() - new Date(a.payment.date).getTime());
  }, [leaseContracts, properties]);

  // Filtered list
  const filteredPayments = useMemo(() => {
    return allRentPayments.filter(({ payment, contract, property }) => {
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        contract.tenantName.toLowerCase().includes(term) ||
        (contract.tenantTaxId && contract.tenantTaxId.toLowerCase().includes(term)) ||
        contract.propertyLabel.toLowerCase().includes(term) ||
        payment.period.toLowerCase().includes(term) ||
        payment.id.toLowerCase().includes(term) ||
        (payment.referenceNumber && payment.referenceNumber.toLowerCase().includes(term)) ||
        payment.paymentMethod.toLowerCase().includes(term);

      if (activeTab === 'RENT') return matchSearch;
      return matchSearch;
    });
  }, [allRentPayments, searchTerm, activeTab]);

  // Global KPIs
  const totalRecaudadoMes = useMemo(() => {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    return allRentPayments
      .filter(p => p.payment.period === currentPeriod || p.payment.date.startsWith(currentPeriod))
      .reduce((sum, p) => sum + (p.payment.amountPaid || 0), 0);
  }, [allRentPayments]);

  const totalComprobantesVault = useMemo(() => {
    return officialDocs.filter(d => d.subject?.includes('Comprobante') || d.docNumber?.startsWith('REC-')).length;
  }, [officialDocs]);

  // Save new payment handler
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) {
      notify('Debe seleccionar un contrato de arriendo válido.', 'error');
      return;
    }

    const numericAmount = parseFloat(amountPaid.replace(/[^0-9]/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      notify('Ingrese un monto de pago válido mayor a $0 CLP.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const newPayment: LeasePayment = {
        id: `pay-${Date.now()}`,
        date: paymentDate,
        amountPaid: numericAmount,
        period: paymentPeriod,
        paymentMethod: paymentMethod as any,
        referenceNumber: referenceNumber.trim() || undefined,
        registeredBy: currentUser || 'SISTEMA CAJA',
        timestamp: Date.now()
      };

      const updatedPayments = [newPayment, ...(selectedContract.payments || [])];
      const updatedContract: LeaseContract = {
        ...selectedContract,
        payments: updatedPayments
      };

      // 1. Save to Lease Contracts store
      await onSaveLeaseContract(updatedContract);

      // 2. Generate PDF Receipt
      const prop = properties.find(p => p.id === selectedContract.propertyId);
      const { dataUrl, docNumber } = downloadRentPaymentReceiptPDF({
        contract: updatedContract,
        payment: newPayment,
        property: prop,
        currentUser: currentUser || 'SISTEMA CAJA'
      });

      // 3. Deposit in Digital Vault (officialDocs)
      if (dataUrl) {
        const docId = `doc-receipt-${newPayment.id}`;
        const officialDocPayload: OfficialDocument = {
          id: docId,
          type: 'SALIENTE',
          docNumber: docNumber,
          date: newPayment.date,
          arrivalDate: newPayment.date,
          systemLoadDate: new Date().toISOString().split('T')[0],
          subject: `Comprobante de Pago de Arriendo - ${selectedContract.tenantName} (${newPayment.period})`,
          synthesis: `Comprobante de pago de arriendo por la suma de $${numericAmount.toLocaleString('es-CL')} CLP correspondiente al periodo ${newPayment.period}. Emitido y archivado en Bóveda Digital con sello de verificación.`,
          status: 'DESPACHADO',
          statusUpdatedAt: Date.now(),
          timestamp: Date.now(),
          sender: 'ASSETFLOW TESORERÍA & CAJA',
          recipient: `Arrendatario: ${selectedContract.tenantName} (${selectedContract.tenantTaxId || 'S/RUT'})`,
          attachments: [dataUrl],
          documentUrl: dataUrl,
          documentName: `Comprobante_Pago_Arriendo_${selectedContract.tenantName.replace(/\s+/g, '_')}_${newPayment.period.replace(/\s+/g, '_')}.pdf`,
          userCreator: currentUser || 'SISTEMA CAJA',
          hashSignature: `${newPayment.id}-MUTC-VERIFIED-AUTH`
        };

        const docRef = doc(db, 'official_docs', docId);
        await setDoc(docRef, officialDocPayload);

        if (setOfficialDocs) {
          setOfficialDocs(prev => {
            const updated = [officialDocPayload, ...prev];
            storage.save('officialDocs', updated);
            return updated;
          });
        } else {
          const existing = await storage.load('officialDocs', []);
          storage.save('officialDocs', [officialDocPayload, ...existing]);
        }
      }

      notify(`¡Pago registrado con éxito! Comprobante N° ${docNumber} emitido y depositado en Bóveda Digital.`, 'success');

      // Reset form and close modal
      setIsModalOpen(false);
      setSelectedContractId('');
      setAmountPaid('');
      setReferenceNumber('');
      setPaymentNotes('');
    } catch (err) {
      console.error('Error al registrar pago:', err);
      notify('Ocurrió un error al procesar el pago. Intente nuevamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-100 font-sans text-slate-800 overflow-auto">
      {/* HEADER BAR */}
      <div className="bg-[#0B3C5D] text-white px-4 md:px-6 py-4 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 border-b-2 border-amber-400 overflow-x-auto min-w-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600/30 rounded-xl border border-emerald-400/40 text-emerald-300 shadow-inner">
            <Receipt size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-900 text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono tracking-wider">
                CÓDIGO P03B20 / R03B201
              </span>
              <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={12} /> TESORERÍA & CAJA CENTRAL
              </span>
            </div>
            <h1 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              Módulo de Registro de Pagos & Comprobantes Digitales
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <button
            onClick={handlePreviewSampleReceipt}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-95 border border-amber-200"
            title="Ver un ejemplo en vivo del comprobante PDF de pago emitido por el sistema"
          >
            <Eye size={15} /> Ver Ejemplo de Comprobante
          </button>

          {setActiveModule && (
            <button
              onClick={() => setActiveModule('BOVEDA_DIGITAL')}
              className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-600 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <HardDrive size={14} className="text-amber-400" /> Bóveda Digital
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 border border-emerald-400"
          >
            <Plus size={16} /> Registrar Nuevo Pago de Arriendo
          </button>
        </div>
      </div>

      {/* KPI METRICS BAR */}
      <div className="p-6 pb-2 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recaudación Mes Actual</p>
            <p className="text-xl font-black text-slate-900 font-mono">
              ${totalRecaudadoMes.toLocaleString('es-CL')} <span className="text-xs text-slate-500 font-sans font-normal">CLP</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
            <FileCheck size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Abonos Verificados</p>
            <p className="text-xl font-black text-slate-900 font-mono">
              {allRentPayments.length} <span className="text-xs text-slate-500 font-sans font-normal">registros</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
            <HardDrive size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recibos en Bóveda Digital</p>
            <p className="text-xl font-black text-slate-900 font-mono">
              {totalComprobantesVault} <span className="text-xs text-slate-500 font-sans font-normal">documentos PDF</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600 border border-teal-100">
            <Building size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contratos Vigentes</p>
            <p className="text-xl font-black text-slate-900 font-mono">
              {leaseContracts.filter(c => c.status === 'VIGENTE').length} <span className="text-xs text-slate-500 font-sans font-normal">activos</span>
            </p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm w-full md:w-96">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por arrendatario, RUT, propiedad, periodo o ref..."
            className="w-full text-xs bg-transparent border-none outline-none text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
              activeTab === 'ALL'
                ? 'bg-[#0B3C5D] text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Todos los Pagos ({allRentPayments.length})
          </button>
          {setActiveModule && (
            <button
              onClick={() => setActiveModule('CONTRATOS_ARRIENDO')}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm ml-auto"
            >
              Ir a Contratos <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* MAIN DATA LEDGER TABLE */}
      <div className="flex-1 px-4 md:px-6 pb-6 overflow-auto min-h-[450px]">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Receipt size={16} className="text-emerald-600" /> Historial de Comprobantes y Abonos Verificados
            </h2>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
              Mostrando {filteredPayments.length} registros
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            {filteredPayments.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                <Receipt size={44} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No se encontraron pagos registrados.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md">Presione "Registrar Nuevo Pago de Arriendo" para ingresar un abono o haga clic en el botón a continuación para ver un ejemplo de comprobante de pago emitido por el sistema.</p>
                
                <button
                  onClick={handlePreviewSampleReceipt}
                  className="mt-4 px-5 py-2.5 bg-[#0B3C5D] hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-md active:scale-95 transition-all"
                >
                  <Eye size={16} className="text-amber-400" /> Ver Ejemplo de Comprobante de Pago (PDF)
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0B3C5D] text-[10px] font-black uppercase text-white border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-2 w-10 text-center select-none" title="Selector de Fila AssetFlow Enterprise (F4 / Menú Contextual)">#</th>
                    <th className="py-3 px-4">Fecha & Folio</th>
                    <th className="py-3 px-4">Arrendatario & RUT</th>
                    <th className="py-3 px-4">Propiedad Arrendada</th>
                    <th className="py-3 px-4">Periodo</th>
                    <th className="py-3 px-4">Monto Abonado</th>
                    <th className="py-3 px-4">Medio & Ref. Bancaria</th>
                    <th className="py-3 px-4 text-right">Acciones Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPayments.map(({ payment, contract, property }) => {
                    const isSelected = gridContextMenu?.payment.id === payment.id;
                    return (
                    <tr 
                      key={payment.id} 
                      onContextMenu={(e) => handleRowContextMenu(e, payment, contract, property)}
                      className={`transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-cyan-100/90 text-cyan-950 font-bold border-l-4 border-l-[#00E5FF]' 
                          : 'hover:bg-slate-50/80'
                      }`}
                      title="Clic derecho o clic en [#] para abrir Menú Contextual AssetFlow Enterprise"
                    >
                      <td className="py-3.5 px-2 text-center bg-slate-50 select-none">
                        <button
                          type="button"
                          onClick={(e) => handleRowContextMenu(e, payment, contract, property)}
                          className="w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-black text-[#0B3C5D] hover:bg-[#0B3C5D] hover:text-white border border-slate-300 hover:border-[#0B3C5D] shadow-2xs transition-all mx-auto"
                          title="Abrir Menú Contextual AssetFlow Enterprise"
                        >
                          #
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{payment.date}</div>
                        <div className="text-[9px] font-mono text-emerald-700 font-bold uppercase">
                          REC-ARR-{payment.id.toUpperCase().slice(-8)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900">{contract.tenantName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{contract.tenantTaxId || 'RUT S/N'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-700 truncate max-w-xs">{contract.propertyLabel}</div>
                        <div className="text-[10px] text-slate-400">{property?.commune || 'Inmueble Registrado'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                          {payment.period}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-black font-mono text-emerald-700 text-sm">
                          ${payment.amountPaid.toLocaleString('es-CL')} <span className="text-[9px] text-slate-400 font-normal">CLP</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-700 uppercase text-[10px]">{payment.paymentMethod}</div>
                        <div className="text-[9px] font-mono text-slate-400">
                          {payment.referenceNumber ? `Ref: #${payment.referenceNumber}` : 'Transferencia Directa'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handlePreviewPaymentReceipt(contract, payment, property)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 inline-flex items-center gap-1"
                            title="Previsualizar Comprobante PDF en Pantalla"
                          >
                            <Eye size={12} className="text-amber-300" /> Ver PDF
                          </button>
                          <button
                            onClick={() => downloadRentPaymentReceiptPDF({
                              contract,
                              payment,
                              property,
                              currentUser: currentUser || 'SISTEMA CAJA'
                            })}
                            className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 inline-flex items-center gap-1"
                            title="Descargar Comprobante PDF"
                          >
                            <Download size={12} /> Descargar
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-[#0B3C5D] text-white px-6 py-4 flex justify-between items-center border-b-2 border-amber-400">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600/30 rounded-lg text-emerald-300">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-white">
                    Registrar Pago de Arriendo & Emitir Comprobante
                  </h3>
                  <p className="text-[10px] text-slate-300">Respaldo automático e inmutable en Bóveda Digital</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRegisterPayment} className="p-6 space-y-4">
              {/* Select Contract */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  1. Seleccionar Contrato de Arriendo / Arrendatario: *
                </label>
                <select
                  required
                  value={selectedContractId}
                  onChange={e => handleContractChange(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                >
                  <option value="">-- Seleccionar Inquilino o Inmueble --</option>
                  {leaseContracts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.tenantName} ({c.tenantTaxId || 'S/RUT'}) - {c.propertyLabel} [Canon: ${c.monthlyAmount.toLocaleString('es-CL')}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Contract Summary Box */}
              {selectedContract && (
                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Arrendatario: {selectedContract.tenantName}</span>
                    <span className="font-mono text-emerald-700">${selectedContract.monthlyAmount.toLocaleString('es-CL')} CLP/mes</span>
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    Propiedad: {selectedContract.propertyLabel} | Vigencia: {selectedContract.startDate} al {selectedContract.endDate}
                  </div>
                </div>
              )}

              {/* Grid Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    2. Periodo Abonado (YYYY-MM): *
                  </label>
                  <input
                    type="month"
                    required
                    value={paymentPeriod}
                    onChange={e => setPaymentPeriod(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    3. Monto del Pago ($ CLP): *
                  </label>
                  <input
                    type="text"
                    required
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    placeholder="Ej: 650000"
                    className="w-full text-xs font-black p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 font-mono text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    4. Medio de Pago: *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                  >
                    <option value="TRANSFERENCIA">TRANSFERENCIA BANCARIA</option>
                    <option value="WEBPAY">WEBPAY / DEBITO AUTOMATICO</option>
                    <option value="CHEQUE">CHEQUE DE BANCO</option>
                    <option value="VALE_VISTA">VALE VISTA BANCARIO</option>
                    <option value="EFECTIVO">EFECTIVO EN CAJA</option>
                    <option value="CAJA_VECINA">CAJA VECINA / REDELCOM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    5. Fecha del Abono: *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  6. N° de Transacción / Referencia Bancaria:
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  placeholder="Ej: 9988221144"
                  className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>Procesando Comprobante...</>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-amber-300 animate-pulse" /> Registrar & Emitir Recibo PDF
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF LIVE PREVIEW MODAL */}
      {previewModalData && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#0B3C5D] text-white px-6 py-4 flex justify-between items-center border-b-2 border-amber-400 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600/30 rounded-xl text-emerald-300 border border-emerald-400/30">
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                    {previewModalData.title}
                  </h3>
                  <p className="text-[10px] font-mono text-emerald-300 font-bold">
                    FOLIO: {previewModalData.docNumber} | Generado en tiempo real por el motor de comprobantes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewModalData.dataUrl}
                  download={`Comprobante_Pago_${previewModalData.docNumber}.pdf`}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Download size={14} /> Descargar PDF
                </a>
                <button
                  onClick={() => setPreviewModalData(null)}
                  className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                  title="Cerrar Vista Previa"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body with Embed / iframe */}
            <div className="flex-1 bg-slate-200 p-2 overflow-hidden flex flex-col">
              <iframe
                src={previewModalData.dataUrl}
                title="Vista Previa del Comprobante de Pago"
                className="w-full h-full rounded-2xl border border-slate-300 shadow-inner bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* AssetFlow Enterprise Floating Grid Context Menu (P03B20) */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P03B20"
          programTitle={`Registro de Pagos y Comprobantes [W03B20A] • Folio REC-ARR-${gridContextMenu.payment.id.toUpperCase().slice(-8)}`}
          collectionName="lease_payments"
          recordKey={`REC-ARR-${gridContextMenu.payment.id.toUpperCase().slice(-8)} [${gridContextMenu.contract.tenantName}]`}
          recordData={gridContextMenu.payment}
          currentStatus="EMITIDO"
          statusOptions={[
            { label: 'EMITIDO (Comprobante Vigente)', value: 'EMITIDO', color: 'bg-emerald-600' },
            { label: 'CONCILIADO (Bancos OK)', value: 'CONCILIADO', color: 'bg-blue-600' },
            { label: 'ANULADO (Reversa Pago)', value: 'ANULADO', color: 'bg-rose-600' }
          ]}
          onClose={() => setGridContextMenu(null)}
          onViewDetails={() => {
            handlePreviewPaymentReceipt(gridContextMenu.contract, gridContextMenu.payment, gridContextMenu.property);
            setGridContextMenu(null);
          }}
          onPrint={() => {
            downloadRentPaymentReceiptPDF({
              contract: gridContextMenu.contract,
              payment: gridContextMenu.payment,
              property: gridContextMenu.property,
              currentUser: currentUser || 'SISTEMA CAJA'
            });
            setGridContextMenu(null);
          }}
          rowExits={[
            {
              label: 'Visualizar Comprobante Oficial PDF',
              shortcut: 'Enter',
              onClick: () => {
                handlePreviewPaymentReceipt(gridContextMenu.contract, gridContextMenu.payment, gridContextMenu.property);
                setGridContextMenu(null);
              }
            },
            {
              label: 'Descargar Recibo de Arriendo a Disco',
              shortcut: 'Ctrl+P',
              onClick: () => {
                downloadRentPaymentReceiptPDF({
                  contract: gridContextMenu.contract,
                  payment: gridContextMenu.payment,
                  property: gridContextMenu.property,
                  currentUser: currentUser || 'SISTEMA CAJA'
                });
                setGridContextMenu(null);
              }
            },
            {
              label: 'Ver Expediente de Contrato de Arriendo',
              shortcut: 'Alt+C',
              onClick: () => {
                if (setActiveModule) {
                  setActiveModule('CONTRATOS_ARRIENDO');
                }
                setGridContextMenu(null);
              }
            }
          ]}
        />
      )}
    </div>
  );
};

export default PaymentRegistrationModule;
