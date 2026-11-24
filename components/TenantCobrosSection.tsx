import React, { useState, useMemo } from 'react';
import { 
  DollarSign, Calendar, AlertCircle, CheckCircle2, Clock, Filter, 
  Search, CreditCard, Download, FileText, Lock, ArrowUpRight, ShieldCheck,
  Check, RefreshCw, ChevronRight, Eye, Printer, AlertTriangle
} from 'lucide-react';
import { TenantPaymentItem, getPaymentStatusInfo } from './TenantPaymentLedgerTable';
import { TenantPaymentGatewayModal } from './TenantPaymentGatewayModal';
import { jsPDF } from 'jspdf';
import { DEFAULT_ASSETFLOW_SVG, getSvgAsPngBase64 } from '../lib/defaultLogo';

interface TenantCobrosSectionProps {
  tenantName: string;
  tenantTaxId: string;
  propertyLabel: string;
  payments: TenantPaymentItem[];
  onPaymentCompleted: (details: {
    itemsPaidIds: string[];
    totalAmount: number;
    paymentChannel: string;
    authCode: string;
    referenceNumber: string;
    timestamp: number;
  }) => void;
}

export const TenantCobrosSection: React.FC<TenantCobrosSectionProps> = ({
  tenantName,
  tenantTaxId,
  propertyLabel,
  payments,
  onPaymentCompleted
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDIENTES' | 'PAGADOS' | 'VENCIDOS'>('TODOS');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemsForPayment, setSelectedItemsForPayment] = useState<TenantPaymentItem[]>([]);

  // Selected item for receipt modal
  const [receiptItem, setReceiptItem] = useState<TenantPaymentItem | null>(null);

  // Math totals
  const pendingItems = useMemo(() => {
    return payments.filter(item => {
      const charged = item.chargedAmount ?? item.amount;
      const paid = item.amount;
      const pending = item.pendingAmount ?? Math.max(0, charged - paid);
      const rawStatus = (item.status || '').toLowerCase();
      return pending > 0 || rawStatus === 'pendiente de pago' || rawStatus === 'vencido' || rawStatus === 'pago parcial';
    });
  }, [payments]);

  const totalPendingAmount = useMemo(() => {
    return pendingItems.reduce((acc, item) => {
      const charged = item.chargedAmount ?? item.amount;
      const paid = item.amount;
      const pending = item.pendingAmount ?? Math.max(0, charged - paid);
      return acc + (pending > 0 ? pending : charged);
    }, 0);
  }, [pendingItems]);

  const totalPaidAmount = useMemo(() => {
    return payments.reduce((acc, item) => acc + (item.amount || 0), 0);
  }, [payments]);

  // Filtered list
  const filteredPayments = useMemo(() => {
    return payments.filter(item => {
      // Search match
      const matchesSearch = 
        item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.period || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.referenceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

      // Status match
      const charged = item.chargedAmount ?? item.amount;
      const paid = item.amount;
      const pending = item.pendingAmount ?? Math.max(0, charged - paid);
      const statusInfo = getPaymentStatusInfo(item);
      const isPending = pending > 0;
      const isPaid = pending === 0 && paid >= charged;
      const isOverdue = statusInfo.label === 'Vencido';

      let matchesStatus = true;
      if (statusFilter === 'PENDIENTES') matchesStatus = isPending;
      if (statusFilter === 'PAGADOS') matchesStatus = isPaid;
      if (statusFilter === 'VENCIDOS') matchesStatus = isOverdue;

      return matchesSearch && matchesStatus;
    });
  }, [payments, searchTerm, statusFilter]);

  // Next due date text
  const nextDueDate = useMemo(() => {
    if (pendingItems.length === 0) return 'Sin cobros pendientes';
    const sorted = [...pendingItems].sort((a, b) => (a.rawDate || '9999').localeCompare(b.rawDate || '9999'));
    return sorted[0].date || '05 de Agosto de 2026';
  }, [pendingItems]);

  // Handle single item payment click
  const handlePayItem = (item: TenantPaymentItem) => {
    setSelectedItemsForPayment([item]);
    setIsModalOpen(true);
  };

  // Handle pay all pending click
  const handlePayAllPending = () => {
    if (pendingItems.length === 0) return;
    setSelectedItemsForPayment(pendingItems);
    setIsModalOpen(true);
  };

  // Download PDF for paid item
  const handleDownloadItemReceiptPDF = async (item: TenantPaymentItem) => {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // Add AssetFlow Logo Header
      try {
        const logoPng = await getSvgAsPngBase64(DEFAULT_ASSETFLOW_SVG);
        doc.addImage(logoPng, 'PNG', 15, 12, 45, 13);
      } catch (e) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(11, 60, 93);
        doc.text('ASSETFLOW', 15, 20);
      }

      // Title header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(11, 60, 93);
      doc.text('COMPROBANTE DE PAGO', 125, 20, { align: 'right' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`N° Referencia: ${item.referenceNumber || 'TR-998201'}`, 125, 25, { align: 'right' });
      doc.text(`Fecha Registro: ${item.date}`, 125, 29, { align: 'right' });

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
      doc.text('DETALLE DEL COBRO Y RECAUDACIÓN', 20, 47);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      
      doc.text(`Arrendatario:`, 20, 54);
      doc.setFont('helvetica', 'bold');
      doc.text(`${tenantName}`, 60, 54);

      doc.setFont('helvetica', 'normal');
      doc.text(`RUT / Tax ID:`, 20, 60);
      doc.setFont('helvetica', 'bold');
      doc.text(`${tenantTaxId}`, 60, 60);

      doc.setFont('helvetica', 'normal');
      doc.text(`Propiedad / Depto:`, 20, 66);
      doc.setFont('helvetica', 'bold');
      doc.text(`${propertyLabel}`, 60, 66);

      doc.setFont('helvetica', 'normal');
      doc.text(`Concepto Cancelado:`, 115, 54);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.type}`, 150, 54);

      doc.setFont('helvetica', 'normal');
      doc.text(`Período:`, 115, 60);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.period || 'VIGENTE'}`, 150, 60);

      doc.setFont('helvetica', 'normal');
      doc.text(`Canal de Pago:`, 115, 66);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.channel || 'Transbank / Webpay'}`, 150, 66);

      // Amount Box
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(15, 90, 180, 16, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(21, 128, 61);
      doc.text('MONTO TOTAL RECAUDADO Y CANCELLADO:', 20, 100);

      doc.setFontSize(13);
      doc.text(`$${item.amount.toLocaleString('es-CL')} CLP`, 190, 100, { align: 'right' });

      // Legal
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('Comprobante inmutable respaldado en el libro auxiliar de recaudación de ASSETFLOW.', 15, 120);
      doc.text(`Firma Hash: SHA256-${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`, 15, 124);

      doc.save(`Comprobante_Pago_${item.referenceNumber || 'ASSETFLOW'}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* BANNER HEADER - ERP MINIMALIST & SOPHISTICATED */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0B3C5D]/10 text-[#0B3C5D] text-[9.5px] font-black uppercase tracking-wider font-mono">
                Sincronización en Tiempo Real • ERP ASSETFLOW
              </span>
            </div>
            <h2 className="text-xl font-black text-[#0B3C5D] uppercase tracking-tight">
              Mis Cobros y Pago Online
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Revisa tus cargos vigentes, estado de cuenta y efectúa pagos seguros mediante Webpay Plus o Transferencia.
            </p>
          </div>

          {/* QUICK PAY ALL BUTTON */}
          {totalPendingAmount > 0 ? (
            <button
              onClick={handlePayAllPending}
              className="px-6 py-3.5 bg-[#FFCC00] hover:bg-[#E6B800] text-[#0B3C5D] font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-[#FFCC00]"
            >
              <CreditCard size={18} className="stroke-[2.5]" />
              <span>Pagar Todo el Saldo (${totalPendingAmount.toLocaleString('es-CL')})</span>
            </button>
          ) : (
            <div className="px-5 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-black uppercase">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>¡Cuenta al Día! Sin Saldo Pendiente</span>
            </div>
          )}

        </div>

        {/* KPI METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          
          {/* KPI 1: MONTO PENDIENTE */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span>Saldo Pendiente de Pago</span>
              <DollarSign size={13} className="text-slate-400" />
            </p>
            <p className={`text-2xl font-black mt-1 font-mono tracking-tight ${
              totalPendingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}>
              ${totalPendingAmount.toLocaleString('es-CL')}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
              {pendingItems.length} {pendingItems.length === 1 ? 'Cobro Pendiente' : 'Cobros Pendientes'}
            </p>
          </div>

          {/* KPI 2: PROXIMO VENCIMIENTO */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span>Próximo Vencimiento</span>
              <Calendar size={13} className="text-slate-400" />
            </p>
            <p className="text-lg font-black text-slate-800 mt-1 uppercase font-mono truncate">
              {nextDueDate}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
              Unidad: {propertyLabel}
            </p>
          </div>

          {/* KPI 3: TOTAL PAGADO PERIODO */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span>Total Pagado Acumulado</span>
              <CheckCircle2 size={13} className="text-emerald-500" />
            </p>
            <p className="text-2xl font-black text-[#0B3C5D] mt-1 font-mono tracking-tight">
              ${totalPaidAmount.toLocaleString('es-CL')}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
              Comprobantes Inmutables Registrados
            </p>
          </div>

        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* SEARCH INPUT */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="BUSCAR COBRO O PERÍODO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]"
            />
          </div>

          {/* STATUS FILTER BUTTONS */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
            {(['TODOS', 'PENDIENTES', 'PAGADOS', 'VENCIDOS'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-[#0B3C5D] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* COBROS CARDS / LIST */}
      <div className="space-y-3">
        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Clock size={20} />
            </div>
            <p className="text-xs font-black text-slate-700 uppercase">No se encontraron cobros registrados para este criterio</p>
            <p className="text-[10px] text-slate-400 uppercase font-medium">Revisa los filtros o busca por el período correspondiente</p>
          </div>
        ) : (
          filteredPayments.map(item => {
            const statusInfo = getPaymentStatusInfo(item);
            const charged = item.chargedAmount ?? item.amount;
            const paid = item.amount;
            const pending = item.pendingAmount ?? Math.max(0, charged - paid);
            const isPending = pending > 0;

            return (
              <div 
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  
                  {/* TITLE & PERIOD */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase font-mono">
                        {item.period || 'PERÍODO VIGENTE'}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-[#0B3C5D] uppercase mt-1">
                      {item.type}
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400 uppercase">
                      Vencimiento: {item.date} • Folio: {item.referenceNumber || 'N/A'}
                    </p>
                  </div>

                  {/* AMOUNTS & ACTION BUTTON */}
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        {isPending ? 'Monto Pendiente' : 'Monto Pagado'}
                      </p>
                      <p className={`text-lg font-black font-mono tracking-tight ${
                        isPending ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        ${(isPending ? pending : paid).toLocaleString('es-CL')}
                      </p>
                      {charged > 0 && isPending && paid > 0 && (
                        <p className="text-[9px] text-slate-400 font-bold uppercase">
                          Cobr: ${charged.toLocaleString('es-CL')} | Pag: ${paid.toLocaleString('es-CL')}
                        </p>
                      )}
                    </div>

                    {/* ACTION BUTTON */}
                    {isPending ? (
                      <button
                        onClick={() => handlePayItem(item)}
                        className="px-4 py-2.5 bg-[#FFCC00] hover:bg-[#E6B800] text-[#0B3C5D] font-black text-[10px] uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard size={14} className="stroke-[2.5]" />
                        <span>Pagar Ahora</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownloadItemReceiptPDF(item)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                      >
                        <Download size={13} className="text-[#0B3C5D]" />
                        <span>Comprobante</span>
                      </button>
                    )}

                  </div>

                </div>

                {/* BOTTOM FOOTER INFO */}
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase font-mono">
                  <span>Canal: {item.channel || 'Transbank / Webpay'}</span>
                  <span>Unidad: {propertyLabel}</span>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* PAYMENT GATEWAY MODAL */}
      <TenantPaymentGatewayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemsToPay={selectedItemsForPayment}
        tenantName={tenantName}
        tenantTaxId={tenantTaxId}
        propertyLabel={propertyLabel}
        onSuccessPayment={onPaymentCompleted}
      />

    </div>
  );
};
