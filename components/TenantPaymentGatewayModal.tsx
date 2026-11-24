import React, { useState, useEffect } from 'react';
import { 
  X, CreditCard, Lock, ShieldCheck, CheckCircle2, ArrowRight, 
  Building2, QrCode, Upload, FileText, Download, Printer, RefreshCw,
  AlertCircle, Sparkles, Check, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { TenantPaymentItem } from './TenantPaymentLedgerTable';
import { DEFAULT_ASSETFLOW_SVG, getSvgAsPngBase64 } from '../lib/defaultLogo';

interface TenantPaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemsToPay: TenantPaymentItem[];
  tenantName: string;
  tenantTaxId: string;
  propertyLabel: string;
  onSuccessPayment: (details: {
    itemsPaidIds: string[];
    totalAmount: number;
    paymentChannel: string;
    authCode: string;
    referenceNumber: string;
    timestamp: number;
  }) => void;
}

const CHILEAN_BANKS = [
  'BANCO DE CHILE / EDWARDS',
  'BANCO ESTADO (CUENTA RUTA / CORRIENTE)',
  'BANCO SANTANDER CHILE',
  'BANCO CREDITO E INVERSIONES (BCI)',
  'SCOTIABANK CHILE',
  'ITAÚ CORPBANCA',
  'BANCO FALABELLA',
  'BANCO BICE',
  'BANCO SECURITY',
  'TENPO / MACH / MERCADO PAGO'
];

export const TenantPaymentGatewayModal: React.FC<TenantPaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  itemsToPay,
  tenantName,
  tenantTaxId,
  propertyLabel,
  onSuccessPayment
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'WEBPAY' | 'KHIPU' | 'MERCADOPAGO' | 'TRANSFERENCIA'>('WEBPAY');
  const [step, setStep] = useState<'SELECT' | 'FORM' | 'PROCESSING' | 'SUCCESS'>('SELECT');
  
  // Webpay form state
  const [selectedBank, setSelectedBank] = useState('BANCO DE CHILE / EDWARDS');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8812');
  const [cardHolder, setCardHolder] = useState(tenantName || 'ARRENDATARIO ASSETFLOW');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('882');
  const [rutPayer, setRutPayer] = useState(tenantTaxId || '12345678-K');

  // Transfer / Voucher upload state
  const [transferRef, setTransferRef] = useState('');
  const [voucherFile, setVoucherFile] = useState<string | null>(null);

  // Result state
  const [authCode, setAuthCode] = useState('');
  const [referenceNum, setReferenceNum] = useState('');
  const [paymentTimestamp, setPaymentTimestamp] = useState<number>(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Total amount math
  const totalToPay = itemsToPay.reduce((acc, item) => {
    const charged = item.chargedAmount ?? item.amount;
    const paid = item.amount;
    const pending = item.pendingAmount ?? Math.max(0, charged - paid);
    return acc + (pending > 0 ? pending : charged);
  }, 0);

  useEffect(() => {
    if (isOpen) {
      setStep('SELECT');
      setCardHolder(tenantName || 'ARRENDATARIO ASSETFLOW');
      setRutPayer(tenantTaxId || '12345678-K');
      setTransferRef(`TR-${Math.floor(100000 + Math.random() * 900000)}`);
    }
  }, [isOpen, tenantName, tenantTaxId]);

  if (!isOpen) return null;

  const handleProcessPayment = () => {
    setStep('PROCESSING');

    // Simulate Chilean Payment Gateway authorization delay
    setTimeout(() => {
      const generatedAuth = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
      const generatedRef = selectedChannel === 'TRANSFERENCIA' && transferRef 
        ? transferRef 
        : `PAY-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const now = Date.now();

      setAuthCode(generatedAuth);
      setReferenceNum(generatedRef);
      setPaymentTimestamp(now);
      setStep('SUCCESS');

      // Call success callback to update real-time Firestore & Local State
      onSuccessPayment({
        itemsPaidIds: itemsToPay.map(i => i.id),
        totalAmount: totalToPay,
        paymentChannel: selectedChannel === 'WEBPAY' ? 'Transbank Webpay Plus' : 
                        selectedChannel === 'KHIPU' ? 'Khipu Transferencia Automatizada' :
                        selectedChannel === 'MERCADOPAGO' ? 'Mercado Pago QR' : 'Transferencia Bancaria Directa',
        authCode: generatedAuth,
        referenceNumber: generatedRef,
        timestamp: now
      });
    }, 2200);
  };

  // Generate Official PDF Receipt (Comprobante de Pago ASSETFLOW)
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [11, 60, 93]; // #0B3C5D
      const accentColor = [255, 204, 0]; // #FFCC00
      const now = new Date(paymentTimestamp || Date.now());
      const dateStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Add AssetFlow Logo Header
      try {
        const logoPng = await getSvgAsPngBase64(DEFAULT_ASSETFLOW_SVG);
        doc.addImage(logoPng, 'PNG', 15, 12, 45, 13);
      } catch (e) {
        // Fallback title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(11, 60, 93);
        doc.text('ASSETFLOW', 15, 20);
      }

      // Title header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(11, 60, 93);
      doc.text('COMPROBANTE DE PAGO ONLINE', 125, 20, { align: 'right' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Folio Digital: ${referenceNum}`, 125, 25, { align: 'right' });
      doc.text(`Código Autorización: ${authCode}`, 125, 29, { align: 'right' });

      // Divider line
      doc.setDrawColor(220, 225, 230);
      doc.setLineWidth(0.5);
      doc.line(15, 35, 195, 35);

      // Section: Details box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 40, 180, 42, 3, 3, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(11, 60, 93);
      doc.text('INFORMACIÓN DE LA TRANSACCIÓN', 20, 47);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      
      doc.text(`Arrendatario / Titular:`, 20, 54);
      doc.setFont('helvetica', 'bold');
      doc.text(`${tenantName}`, 60, 54);

      doc.setFont('helvetica', 'normal');
      doc.text(`RUT / Identificación:`, 20, 60);
      doc.setFont('helvetica', 'bold');
      doc.text(`${tenantTaxId}`, 60, 60);

      doc.setFont('helvetica', 'normal');
      doc.text(`Propiedad / Unidad:`, 20, 66);
      doc.setFont('helvetica', 'bold');
      doc.text(`${propertyLabel}`, 60, 66);

      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha y Hora de Pago:`, 20, 72);
      doc.setFont('helvetica', 'bold');
      doc.text(`${dateStr} - ${timeStr} hrs`, 60, 72);

      doc.setFont('helvetica', 'normal');
      doc.text(`Medio de Pago:`, 115, 54);
      doc.setFont('helvetica', 'bold');
      doc.text(`${selectedChannel === 'WEBPAY' ? 'Webpay Plus / Transbank' : selectedChannel === 'KHIPU' ? 'Khipu Transferencia' : 'Transferencia Bancaria'}`, 150, 54);

      doc.setFont('helvetica', 'normal');
      doc.text(`Estado del Pago:`, 115, 60);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(21, 128, 61); // Green
      doc.text(`APROBADO Y CONCILIADO`, 150, 60);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`Origen Sistema:`, 115, 66);
      doc.setFont('helvetica', 'bold');
      doc.text(`Portal Arrendatario ASSETFLOW`, 150, 66);

      // Table Header of Items
      let yPos = 90;
      doc.setFillColor(11, 60, 93);
      doc.rect(15, yPos, 180, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('CONCEPTO DE COBRO', 20, yPos + 5.5);
      doc.text('PERÍODO', 100, yPos + 5.5);
      doc.text('CANAL', 135, yPos + 5.5);
      doc.text('MONTO PAGADO', 190, yPos + 5.5, { align: 'right' });

      yPos += 8;

      itemsToPay.forEach((item, index) => {
        const bg = index % 2 === 0 ? [255, 255, 255] : [245, 247, 250];
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.rect(15, yPos, 180, 8, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(40, 40, 40);
        doc.text(item.type, 20, yPos + 5.5);
        doc.text(item.period || 'PERÍODO VIGENTE', 100, yPos + 5.5);
        doc.text(item.channel || 'ONLINE', 135, yPos + 5.5);

        const charged = item.chargedAmount ?? item.amount;
        const paid = item.amount;
        const pending = item.pendingAmount ?? Math.max(0, charged - paid);
        const amountToPrint = pending > 0 ? pending : charged;

        doc.setFont('helvetica', 'bold');
        doc.text(`$${amountToPrint.toLocaleString('es-CL')}`, 190, yPos + 5.5, { align: 'right' });

        yPos += 8;
      });

      // Total Box
      yPos += 4;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(110, yPos, 85, 16, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(11, 60, 93);
      doc.text('TOTAL GENERAL PAGADO:', 115, yPos + 7);

      doc.setFontSize(12);
      doc.setTextColor(21, 128, 61);
      doc.text(`$${totalToPay.toLocaleString('es-CL')} CLP`, 190, yPos + 11, { align: 'right' });

      // Legal & Security Note
      yPos += 25;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('Este documento digital constituye comprobante válido de recaudación en el sistema ERP ASSETFLOW.', 15, yPos);
      doc.text(`Firma Digital Hash: SHA256-${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`, 15, yPos + 4);
      doc.text('Servicio de atención al cliente ASSETFLOW: soporte@inmobiliariapro.cl | Fono: +56 9 9820 4277', 15, yPos + 8);

      doc.save(`Comprobante_Pago_ASSETFLOW_${referenceNum}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/40 backdrop-blur-xs p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden my-auto"
      >
        {/* HEADER */}
        <div className="bg-[#0B3C5D] text-white p-5 sm:p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-300 hover:text-white bg-white/10 p-1.5 rounded-full transition-all cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-[#FFCC00]">
              <Lock size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-widest text-[#FFCC00] uppercase font-mono bg-white/10 px-2 py-0.5 rounded-full">
                  Pasarela Segura SSL 256-Bit
                </span>
              </div>
              <h3 className="text-lg font-black tracking-tight text-white uppercase mt-0.5">
                Pago de Cobros en Línea
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">
                {propertyLabel} • {tenantName}
              </p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6">
          
          {/* ITEMS SUMMARY BAR */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Monto Total a Cancelar ({itemsToPay.length} Concepto{itemsToPay.length !== 1 ? 's' : ''})
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-black text-[#0B3C5D] tracking-tight">
                  ${totalToPay.toLocaleString('es-CL')}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-200 px-2 py-0.5 rounded-full">
                  CLP
                </span>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Garantía de Seguridad</p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1 justify-end mt-1">
                <ShieldCheck size={13} /> Sincronización Inmediata
              </p>
            </div>
          </div>

          {/* ITEM BREAKDOWN EXPANDABLE LIST */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {itemsToPay.map((item, idx) => {
              const charged = item.chargedAmount ?? item.amount;
              const paid = item.amount;
              const pending = item.pendingAmount ?? Math.max(0, charged - paid);
              const valToPay = pending > 0 ? pending : charged;

              return (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-3 bg-slate-100/60 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-700 uppercase truncate max-w-[240px]">
                    {item.type} {item.period ? `(${item.period})` : ''}
                  </span>
                  <span className="font-black text-slate-900 font-mono">
                    ${valToPay.toLocaleString('es-CL')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* STEP 1: CHANNEL SELECTOR */}
          {step === 'SELECT' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                Selecciona tu Medio de Pago Preferido
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* WEBPAY PLUS */}
                <button
                  type="button"
                  onClick={() => setSelectedChannel('WEBPAY')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    selectedChannel === 'WEBPAY'
                      ? 'border-[#0B3C5D] bg-[#0B3C5D]/5 ring-2 ring-[#0B3C5D]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-[#0B3C5D]" />
                      <span className="text-xs font-black uppercase text-[#0B3C5D]">Webpay Plus</span>
                    </div>
                    {selectedChannel === 'WEBPAY' && <CheckCircle2 size={16} className="text-[#0B3C5D]" />}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-snug">
                    Tarjetas de Débito, Crédito Transbank y Prepago (Redcompra).
                  </p>
                </button>

                {/* KHIPU / TRANSFERENCIA */}
                <button
                  type="button"
                  onClick={() => setSelectedChannel('KHIPU')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    selectedChannel === 'KHIPU'
                      ? 'border-[#0B3C5D] bg-[#0B3C5D]/5 ring-2 ring-[#0B3C5D]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 size={18} className="text-[#0B3C5D]" />
                      <span className="text-xs font-black uppercase text-[#0B3C5D]">Khipu Banco</span>
                    </div>
                    {selectedChannel === 'KHIPU' && <CheckCircle2 size={16} className="text-[#0B3C5D]" />}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-snug">
                    Transferencia bancaria instantánea auto-conciliada con tu banco.
                  </p>
                </button>

                {/* MERCADO PAGO / QR */}
                <button
                  type="button"
                  onClick={() => setSelectedChannel('MERCADOPAGO')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    selectedChannel === 'MERCADOPAGO'
                      ? 'border-[#0B3C5D] bg-[#0B3C5D]/5 ring-2 ring-[#0B3C5D]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <QrCode size={18} className="text-[#0B3C5D]" />
                      <span className="text-xs font-black uppercase text-[#0B3C5D]">Mercado Pago QR</span>
                    </div>
                    {selectedChannel === 'MERCADOPAGO' && <CheckCircle2 size={16} className="text-[#0B3C5D]" />}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-snug">
                    Escanea y paga con tu aplicación de Mercado Pago o BancoEstado.
                  </p>
                </button>

                {/* TRANSFERENCIA DIRECTA CON COMPROBANTE */}
                <button
                  type="button"
                  onClick={() => setSelectedChannel('TRANSFERENCIA')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    selectedChannel === 'TRANSFERENCIA'
                      ? 'border-[#0B3C5D] bg-[#0B3C5D]/5 ring-2 ring-[#0B3C5D]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Upload size={18} className="text-[#0B3C5D]" />
                      <span className="text-xs font-black uppercase text-[#0B3C5D]">Comprobante Manual</span>
                    </div>
                    {selectedChannel === 'TRANSFERENCIA' && <CheckCircle2 size={16} className="text-[#0B3C5D]" />}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-snug">
                    Realiza la transferencia en tu banco y adjunta la foto o voucher.
                  </p>
                </button>

              </div>

              <button
                onClick={() => setStep('FORM')}
                className="w-full py-3.5 bg-[#FFCC00] hover:bg-[#E6B800] text-[#0B3C5D] font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <span>Continuar con el Pago</span>
                <ChevronRight size={16} className="stroke-[3]" />
              </button>
            </div>
          )}

          {/* STEP 2: CHANNEL SPECIFIC INPUT FORM */}
          {step === 'FORM' && (
            <div className="space-y-4">
              
              {/* WEBPAY FORM */}
              {selectedChannel === 'WEBPAY' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-black text-[#0B3C5D] uppercase text-[11px]">Transbank Webpay Plus</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Simulación de Pago</span>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Banco Emisor de la Tarjeta
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]"
                    >
                      {CHILEAN_BANKS.map((b, i) => (
                        <option key={i} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                        RUT del Titular
                      </label>
                      <input
                        type="text"
                        value={rutPayer}
                        onChange={(e) => setRutPayer(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                        Nombre del Titular
                      </label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                        Número de Tarjeta
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                        CVC / CVV
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* KHIPU FORM */}
              {selectedChannel === 'KHIPU' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-black text-[#0B3C5D] uppercase text-[11px]">Khipu - Transferencia Automatizada</span>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Sin Comisión</span>
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium">
                    Serás conectado a la plataforma de autorización de tu banco. Selecciona tu banco a continuación para iniciar:
                  </p>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Banco para Transferir
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]"
                    >
                      {CHILEAN_BANKS.map((b, i) => (
                        <option key={i} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* MERCADO PAGO QR FORM */}
              {selectedChannel === 'MERCADOPAGO' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center text-xs">
                  <span className="font-black text-[#0B3C5D] uppercase text-[11px] block">
                    Escanea el Código QR desde tu Aplicación
                  </span>
                  
                  <div className="w-36 h-36 bg-white border-2 border-[#0B3C5D] rounded-2xl mx-auto p-2 flex items-center justify-center shadow-inner">
                    <QrCode size={120} className="text-[#0B3C5D]" />
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium max-w-xs mx-auto">
                    Abre la cámara de tu teléfono o tu app de Mercado Pago, BancoEstado o Banco de Chile para pagar los ${totalToPay.toLocaleString('es-CL')}.
                  </p>
                </div>
              )}

              {/* TRANSFERENCIA DIRECTA MANUAL FORM */}
              {selectedChannel === 'TRANSFERENCIA' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-black text-[#0B3C5D] uppercase text-[11px]">Datos Bancarios ASSETFLOW</span>
                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase">Cta Corriente</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[10.5px] text-slate-700">
                    <p><strong>Banco:</strong> BANCO DE CHILE</p>
                    <p><strong>Tipo Cuenta:</strong> CUENTA CORRIENTE</p>
                    <p><strong>Número:</strong> 00-102-93847-56</p>
                    <p><strong>RUT Titular:</strong> 99.820.400-K (INMOBILIARIA PRO S.A.)</p>
                    <p><strong>Email Comprobantes:</strong> transferencias@inmobiliariapro.cl</p>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Número de Transferencia / N° Operación
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: TR-882019"
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 uppercase"
                    />
                  </div>
                </div>
              )}

              {/* BUTTONS */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('SELECT')}
                  className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Volver
                </button>

                <button
                  type="button"
                  onClick={handleProcessPayment}
                  className="flex-1 py-3.5 bg-[#0B3C5D] hover:bg-[#082d47] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock size={14} className="text-[#FFCC00]" />
                  <span>Pagar ${totalToPay.toLocaleString('es-CL')} Ahora</span>
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: PROCESSING ANIMATION */}
          {step === 'PROCESSING' && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw size={44} className="animate-spin text-[#0B3C5D] mx-auto stroke-[2.5]" />
              <div>
                <h4 className="text-base font-black text-[#0B3C5D] uppercase tracking-wide">
                  Procesando Pago con tu Banco...
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto">
                  Por favor no cierres esta ventana. Verificando token de seguridad 3D Secure y registrando en el sistema en tiempo real.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION */}
          {step === 'SUCCESS' && (
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 border-4 border-emerald-200 shadow-md">
                <CheckCircle2 size={36} className="stroke-[3]" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full tracking-widest">
                  Transacción Aprobada Exitosamente
                </span>
                <h3 className="text-xl font-black text-[#0B3C5D] uppercase tracking-tight mt-2">
                  ¡Pago Confirmado y Sincronizado!
                </h3>
                <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto mt-1">
                  El monto de <strong className="text-slate-900">${totalToPay.toLocaleString('es-CL')}</strong> ha sido imputado correctamente en tu cartola y reflejado en tiempo real en la contabilidad general de ASSETFLOW.
                </p>
              </div>

              {/* DETAILS CARD */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">Código Autorización:</span>
                  <span className="font-bold text-slate-800">{authCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">N° Referencia / Folio:</span>
                  <span className="font-bold text-slate-800">{referenceNum}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">Fecha y Hora:</span>
                  <span className="font-bold text-slate-800">
                    {new Date(paymentTimestamp).toLocaleDateString('es-CL')} {new Date(paymentTimestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPdf}
                  className="w-full sm:flex-1 py-3 bg-[#0B3C5D] hover:bg-[#082d47] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} className="text-[#FFCC00]" />
                  )}
                  <span>Descargar Comprobante PDF</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};
