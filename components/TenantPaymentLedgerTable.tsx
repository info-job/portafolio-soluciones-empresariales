import React, { useState, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight, ArrowUpDown, FileText, X, CheckCircle, Printer, Eye, Building2, CreditCard, Calendar, Filter, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { DEFAULT_ASSETFLOW_SVG, getSvgAsPngBase64 } from '../lib/defaultLogo';
import { exportPaymentsToExcel } from '../lib/excelExport';

export interface TenantPaymentItem {
  id: string;
  property: string; // e.g. "1822" or "1822 - Depto 402"
  detalleUrl?: string;
  type: 'Arriendo' | 'Gasto Comun' | 'Energía Eléctrica' | 'Agua Caliente' | string;
  chargedAmount?: number; // Monto Cobrado
  amount: number;        // Monto Pagado
  pendingAmount?: number; // Por Pagar (Diferencia = chargedAmount - amount)
  status?: 'Pagado' | 'Pendiente de pago' | 'Pago Parcial' | 'Vencido' | 'Abono a Favor' | string;
  date: string; // e.g. "25 junio 2026"
  rawDate?: string; // ISO date format for sorting
  channel: 'Transferencia' | 'PAC' | 'Servipag' | 'Transbank' | 'Caja' | string;
  tenantName?: string;
  tenantTaxId?: string;
  referenceNumber?: string;
  period?: string;
  registeredBy?: string;
}

interface TenantPaymentLedgerTableProps {
  payments?: TenantPaymentItem[];
  tenantName?: string;
  tenantTaxId?: string;
  propertyLabel?: string;
  contractStartDate?: string;
  nextRenewalDate?: string;
  contractId?: string;
  isCompanyUser?: boolean;
  onDownload12Months?: () => void;
  title?: string;
  showJDEStyleHeader?: boolean;
}

// Helper to determine status label and visual style from charged and paid amounts
export const getPaymentStatusInfo = (item: TenantPaymentItem) => {
  const charged = item.chargedAmount ?? item.amount;
  const paid = item.amount;
  const diff = charged - paid;
  const rawStatus = (item.status || '').toLowerCase();

  if (rawStatus === 'vencido' || rawStatus === 'atrasado') {
    return {
      label: 'Vencido',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
    };
  }

  if (diff < 0 && paid > charged) {
    return {
      label: 'Abono a Favor',
      badgeClass: 'bg-blue-100 text-blue-800 border border-blue-300 font-bold'
    };
  }

  if (diff === 0 || (charged > 0 && paid >= charged)) {
    return {
      label: 'Pagado',
      badgeClass: 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]/40 font-semibold'
    };
  }

  if (paid > 0 && diff > 0) {
    return {
      label: 'Pago Parcial',
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
    };
  }

  if (paid === 0 && diff > 0) {
    if (rawStatus.includes('vencid') || rawStatus.includes('atrasad')) {
      return {
        label: 'Vencido',
        badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
      };
    }
    return {
      label: 'Pendiente de pago',
      badgeClass: 'bg-orange-100 text-orange-900 border border-orange-300 font-semibold'
    };
  }

  return {
    label: item.status || 'Pendiente de pago',
    badgeClass: 'bg-slate-100 text-slate-800 border border-slate-300'
  };
};

// Sample fallback payment items with varied charged/paid amounts
const DEFAULT_PAYMENT_SAMPLE: TenantPaymentItem[] = [
  { id: 'pay-001', property: '1822', type: 'Energía Eléctrica', chargedAmount: 47645, amount: 47645, status: 'Pagado', date: '25 junio 2026', rawDate: '2026-06-25', channel: 'Transferencia', referenceNumber: 'TR-998201', period: 'JUNIO 2026' },
  { id: 'pay-002', property: '1822', type: 'Agua Caliente', chargedAmount: 14300, amount: 14300, status: 'Pagado', date: '25 junio 2026', rawDate: '2026-06-25', channel: 'Transferencia', referenceNumber: 'TR-998202', period: 'JUNIO 2026' },
  { id: 'pay-003', property: '1822', type: 'Gasto Comun', chargedAmount: 69865, amount: 69865, status: 'Pagado', date: '25 junio 2026', rawDate: '2026-06-25', channel: 'PAC', referenceNumber: 'PAC-998203', period: 'JUNIO 2026' },
  { id: 'pay-004', property: '1822', type: 'Arriendo', chargedAmount: 385821, amount: 385821, status: 'Pagado', date: '25 junio 2026', rawDate: '2026-06-25', channel: 'PAC', referenceNumber: 'PAC-998204', period: 'JUNIO 2026' },
  { id: 'pay-005', property: '1822', type: 'Energía Eléctrica', chargedAmount: 35000, amount: 20000, status: 'Pago Parcial', date: '10 julio 2026', rawDate: '2026-07-10', channel: 'Transferencia', referenceNumber: 'TR-981044', period: 'JULIO 2026' },
  { id: 'pay-006', property: '1822', type: 'Arriendo', chargedAmount: 420000, amount: 0, status: 'Pendiente de pago', date: '05 agosto 2026', rawDate: '2026-08-05', channel: 'PAC', referenceNumber: 'PEND-001', period: 'AGOSTO 2026' },
  { id: 'pay-007', property: '1822', type: 'Gasto Comun', chargedAmount: 72000, amount: 0, status: 'Vencido', date: '01 julio 2026', rawDate: '2026-07-01', channel: 'Transferencia', referenceNumber: 'VENC-002', period: 'JUNIO 2026' },
  { id: 'pay-008', property: '1822', type: 'Agua Caliente', chargedAmount: 15000, amount: 18000, status: 'Abono a Favor', date: '19 junio 2026', rawDate: '2026-06-19', channel: 'Transferencia', referenceNumber: 'TR-981045', period: 'MAYO 2026' },
  { id: 'pay-009', property: '1822', type: 'Gasto Comun', chargedAmount: 69865, amount: 69865, status: 'Pagado', date: '19 junio 2026', rawDate: '2026-06-19', channel: 'PAC', referenceNumber: 'PAC-981046', period: 'MAYO 2026' },
  { id: 'pay-010', property: '1822', type: 'Arriendo', chargedAmount: 493851, amount: 493851, status: 'Pagado', date: '19 junio 2026', rawDate: '2026-06-19', channel: 'PAC', referenceNumber: 'PAC-981047', period: 'MAYO 2026' },
  { id: 'pay-011', property: '1822', type: 'Gasto Comun', chargedAmount: 69865, amount: 69865, status: 'Pagado', date: '20 mayo 2026', rawDate: '2026-05-20', channel: 'Servipag', referenceNumber: 'SP-965102', period: 'ABRIL 2026' },
  { id: 'pay-012', property: '1822', type: 'Arriendo', chargedAmount: 501567, amount: 501567, status: 'Pagado', date: '20 mayo 2026', rawDate: '2026-05-20', channel: 'Servipag', referenceNumber: 'SP-965103', period: 'ABRIL 2026' },
];

export const TenantPaymentLedgerTable: React.FC<TenantPaymentLedgerTableProps> = ({
  payments,
  tenantName = 'Arrendatario Registrado',
  tenantTaxId = '99999999-K',
  propertyLabel = 'Propiedad 1822',
  contractStartDate = '01 de Mayo de 2024',
  nextRenewalDate = '01 de Mayo de 2027',
  contractId = 'CTR-2024-1822',
  isCompanyUser = false,
  onDownload12Months,
  title = 'Pagos realizados',
  showJDEStyleHeader = true
}) => {
  // Use provided payments or fallback sample
  const dataList = useMemo<TenantPaymentItem[]>(() => {
    if (payments && payments.length > 0) return payments;
    return DEFAULT_PAYMENT_SAMPLE;
  }, [payments]);

  // State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [sortField, setSortField] = useState<keyof TenantPaymentItem | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<TenantPaymentItem | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Filtered & Sorted List
  const processedList = useMemo(() => {
    let result = [...dataList];

    if (filterType !== 'ALL') {
      result = result.filter(item => item.type.toLowerCase().includes(filterType.toLowerCase()));
    }

    if (sortField) {
      result.sort((a, b) => {
        let valA = a[sortField] ?? '';
        let valB = b[sortField] ?? '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortAsc ? -1 : 1;
        if (strA > strB) return sortAsc ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [dataList, filterType, sortField, sortAsc]);

  // Calculate totals
  const totalChargedSum = useMemo(() => {
    return processedList.reduce((sum, item) => sum + (item.chargedAmount ?? item.amount ?? 0), 0);
  }, [processedList]);

  const totalPaidSum = useMemo(() => {
    return processedList.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  }, [processedList]);

  const totalPendingSum = useMemo(() => {
    return Math.max(0, totalChargedSum - totalPaidSum);
  }, [totalChargedSum, totalPaidSum]);

  // Pagination Math
  const totalItems = processedList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const currentPageItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedList.slice(start, start + itemsPerPage);
  }, [processedList, currentPage, itemsPerPage]);

  const handleSort = (field: keyof TenantPaymentItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Download Excel (.xlsx) Report
  const handleDownloadExcel = async () => {
    const now = new Date();
    const emissionStr = `${now.toLocaleDateString('es-CL')} ${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs`;
    const compliance = totalPendingSum === 0 
      ? 'AL DÍA CON SUS OBLIGACIONES CONTRACTUALES'
      : `CON SALDO PENDIENTE DE REGULARIZACIÓN ($${totalPendingSum.toLocaleString('es-CL')})`;

    const metadata = {
      tenantName,
      tenantTaxId,
      propertyLabel,
      contractStartDate,
      nextRenewalDate,
      complianceStatus: compliance,
      emissionDate: emissionStr,
      contractId
    };

    const isTenant = !isCompanyUser;
    const fileName = isTenant 
      ? `Cartola_Pagos_Arrendatario_${tenantTaxId.replace(/[^a-zA-Z0-9]/g, '')}_12Meses`
      : `Registro_Pagos_Empresa_JDE_${now.toISOString().slice(0, 10)}`;

    await exportPaymentsToExcel(processedList, fileName, isTenant, metadata);
  };

  // Download Report PDF
  const handleDownloadPDF = async () => {
    if (onDownload12Months) {
      onDownload12Months();
      return;
    }

    try {
      const doc = new jsPDF();
      const logoBase64 = await getSvgAsPngBase64(DEFAULT_ASSETFLOW_SVG);
      const now = new Date();
      const emissionStr = `${now.toLocaleDateString('es-CL')} ${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs`;

      // Header Banner
      doc.setFillColor(0, 45, 98); // ERP Navy #002D62
      doc.rect(0, 0, 210, 28, 'F');

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 12, 4, 38, 18);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('CARTOLA HISTÓRICA DE PAGOS & ESTADO DE CUMPLIMIENTO', 54, 13);
      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      doc.text('ASSETFLOW S.A. - DEPARTAMENTO DE GESTIÓN INMOBILIARIA & CONTROL FINANCIERO', 54, 19);

      // Metadata Header Box
      doc.setFillColor(245, 247, 250);
      doc.rect(10, 32, 190, 20, 'F');
      doc.setDrawColor(200, 210, 225);
      doc.rect(10, 32, 190, 20, 'S');

      doc.setTextColor(40, 40, 40);
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'bold');
      doc.text(`ARRENDATARIO: ${tenantName.toUpperCase()} | RUT: ${tenantTaxId}`, 13, 38);
      doc.setFont('Helvetica', 'normal');
      doc.text(`PROPIEDAD: ${propertyLabel.toUpperCase()} | ID CONTRATO: ${contractId}`, 13, 43);
      doc.text(`INICIO CONTRATO: ${contractStartDate} | PRÓXIMA RENOVACIÓN: ${nextRenewalDate}`, 13, 48);

      const complianceText = totalPendingSum === 0 
        ? 'ESTADO: AL DÍA CON SUS OBLIGACIONES CONTRACTUALES'
        : `ESTADO: SALDO PENDIENTE DE REGULARIZACIÓN ($ ${totalPendingSum.toLocaleString('es-CL')})`;

      doc.setFont('Helvetica', 'bold');
      if (totalPendingSum === 0) {
        doc.setTextColor(21, 128, 61); // Green
      } else {
        doc.setTextColor(190, 18, 60); // Red
      }
      doc.text(complianceText, 115, 38);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7.5);
      doc.text(`FECHA/HORA EMISIÓN: ${emissionStr}`, 115, 48);

      doc.setDrawColor(0, 200, 83);
      doc.setLineWidth(0.8);
      doc.line(10, 54, 200, 54);

      // Table Header
      let y = 58;
      doc.setFillColor(0, 45, 98);
      doc.rect(10, y, 190, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'bold');
      doc.text('PROP.', 12, y + 5);
      doc.text('CONCEPTO', 30, y + 5);
      doc.text('M. COBRADO', 65, y + 5);
      doc.text('M. PAGADO', 95, y + 5);
      doc.text('POR PAGAR', 125, y + 5);
      doc.text('ESTADO', 152, y + 5);
      doc.text('FECHA', 178, y + 5);

      y += 7;

      let calcCharged = 0;
      let calcPaid = 0;
      let calcPending = 0;

      processedList.forEach((item, index) => {
        const charged = item.chargedAmount ?? item.amount;
        const paid = item.amount;
        const pending = Math.max(0, charged - paid);

        calcCharged += charged;
        calcPaid += paid;
        calcPending += pending;

        const statusInfo = getPaymentStatusInfo(item);

        doc.setFillColor(index % 2 === 0 ? 250 : 242, index % 2 === 0 ? 250 : 245, index % 2 === 0 ? 250 : 248);
        doc.rect(10, y, 190, 6.5, 'F');
        doc.setTextColor(40, 40, 40);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);

        doc.text(String(item.property), 12, y + 4.5);
        doc.text(String(item.type), 30, y + 4.5);
        doc.text(`$ ${charged.toLocaleString('es-CL')}`, 65, y + 4.5);
        doc.text(`$ ${paid.toLocaleString('es-CL')}`, 95, y + 4.5);
        
        doc.setFont('Helvetica', 'bold');
        if (pending > 0) {
          doc.setTextColor(190, 18, 60); // Red
        } else {
          doc.setTextColor(21, 128, 61); // Green
        }
        doc.text(`$ ${pending.toLocaleString('es-CL')}`, 125, y + 4.5);

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        doc.text(statusInfo.label, 152, y + 4.5);
        doc.text(item.date, 178, y + 4.5);

        y += 6.5;

        if (y > 270 && index < processedList.length - 1) {
          doc.addPage();
          y = 20;
          doc.setFillColor(0, 45, 98);
          doc.rect(10, y, 190, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.setFont('Helvetica', 'bold');
          doc.text('PROP.', 12, y + 5);
          doc.text('CONCEPTO', 30, y + 5);
          doc.text('M. COBRADO', 65, y + 5);
          doc.text('M. PAGADO', 95, y + 5);
          doc.text('POR PAGAR', 125, y + 5);
          doc.text('ESTADO', 152, y + 5);
          doc.text('FECHA', 178, y + 5);
          y += 7;
        }
      });

      // Total Box
      doc.setFillColor(230, 240, 250);
      doc.rect(10, y, 190, 8, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 45, 98);
      doc.text(`TOTALES: COBRADO: $ ${calcCharged.toLocaleString('es-CL')} | PAGADO: $ ${calcPaid.toLocaleString('es-CL')} | SALDO PENDIENTE: $ ${calcPending.toLocaleString('es-CL')}`, 14, y + 5.5);

      // Save PDF
      doc.save(`Cartola_Pagos_${tenantTaxId.replace(/[^a-zA-Z0-9]/g, '')}_12Meses.pdf`);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
    }
  };

  const currentEmissionDate = useMemo(() => {
    const d = new Date();
    return `${d.toLocaleDateString('es-CL')} ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs`;
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 font-sans space-y-4">
      
      {/* TENANT PORTAL CONTRACT & COMPLIANCE HEADER CARD */}
      {!isCompanyUser && (
        <div className="bg-slate-50 text-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border-2 border-slate-300 mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 shadow-xs">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase font-mono text-emerald-900">
                  Ficha de Cumplimiento Contractual & Estado de Cuenta
                </h3>
                <p className="text-[11px] text-slate-600 font-mono font-semibold">
                  Emisión Portal Arrendatario • <span className="text-indigo-800 font-bold">{currentEmissionDate}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalPendingSum === 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border-2 border-emerald-300 shadow-xs uppercase tracking-wider">
                  <CheckCircle size={14} className="text-emerald-700" /> Al día con sus obligaciones
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border-2 border-rose-300 shadow-xs uppercase tracking-wider">
                  Saldo Pendiente: ${totalPendingSum.toLocaleString('es-CL')}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Arrendatario Titular</span>
              <span className="font-black text-slate-900 text-xs truncate block">{tenantName}</span>
              <span className="text-[11px] font-mono font-bold text-slate-600 block">RUT: {tenantTaxId}</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Inmueble / Unidad</span>
              <span className="font-black text-slate-900 text-xs truncate block">{propertyLabel}</span>
              <span className="text-[11px] font-mono font-bold text-slate-600 block">ID: {contractId}</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Fecha Inicio Contrato</span>
              <span className="font-black text-emerald-800 text-xs block">{contractStartDate}</span>
              <span className="text-[11px] font-bold text-emerald-700 block">Vigencia Activa</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Próxima Renovación</span>
              <span className="font-black text-amber-800 text-xs block">{nextRenewalDate}</span>
              <span className="text-[11px] font-bold text-amber-700 block">Revisión Anual</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION TITLE AND TOP ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{title}</span>
            {showJDEStyleHeader && (
              <span className="text-[10px] font-mono font-black bg-[#002D62] text-white px-2.5 py-1 rounded-md tracking-widest uppercase border border-blue-900">
                F03B11 / ERP
              </span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#107C41] hover:bg-[#0B5C30] text-white rounded-lg text-xs font-black shadow-xs transition-all cursor-pointer border border-emerald-800"
            title="Descargar tabla en formato Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} />
            <span>Descargar Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#002D62] hover:bg-[#001D42] text-white rounded-lg text-xs font-black shadow-xs transition-all cursor-pointer border border-blue-950"
            title="Descargar cartola en formato PDF"
          >
            <Download size={15} />
            <span>Descargar Cartola PDF</span>
          </button>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="overflow-x-auto border-2 border-slate-300 rounded-xl shadow-xs bg-white">
        <table className="w-full text-left text-xs border-collapse">
          {/* HEADER ROW */}
          <thead>
            <tr className="bg-[#002D62] text-white text-[11px] font-black uppercase tracking-wider border-b-2 border-emerald-500">
              
              {/* Propiedad */}
              <th 
                onClick={() => handleSort('property')}
                className="py-3.5 px-3 cursor-pointer hover:bg-[#001D42] transition-colors select-none font-black uppercase whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5 text-white">
                  <span>Propiedad</span>
                  <ArrowUpDown size={13} className="text-emerald-400" />
                </div>
              </th>

              {/* Detalle */}
              <th className="py-3.5 px-3 font-black uppercase whitespace-nowrap text-white">
                <div className="flex items-center gap-1.5">
                  <span>Detalle</span>
                </div>
              </th>

              {/* Tipo */}
              <th 
                onClick={() => handleSort('type')}
                className="py-3.5 px-3 cursor-pointer hover:bg-[#001D42] transition-colors select-none font-black uppercase whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5 text-white">
                  <span>Tipo</span>
                  <ArrowUpDown size={13} className="text-emerald-400" />
                </div>
              </th>

              {/* Monto Cobrado */}
              <th 
                onClick={() => handleSort('chargedAmount')}
                className="py-3.5 px-3 cursor-pointer hover:bg-[#001D42] transition-colors select-none font-black uppercase text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1.5 text-white">
                  <span>Monto Cobrado</span>
                  <ArrowUpDown size={13} className="text-emerald-400" />
                </div>
              </th>

              {/* Monto Pagado */}
              <th 
                onClick={() => handleSort('amount')}
                className="py-3.5 px-3 cursor-pointer hover:bg-[#001D42] transition-colors select-none font-black uppercase text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1.5 text-white">
                  <span>Monto Pagado</span>
                  <ArrowUpDown size={13} className="text-emerald-400" />
                </div>
              </th>

              {/* Por Pagar (Diferencia) */}
              <th 
                className="py-3.5 px-3 cursor-pointer hover:bg-[#001D42] transition-colors select-none font-black uppercase text-right whitespace-nowrap text-amber-300"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Por Pagar</span>
                </div>
              </th>

              {/* Estado */}
              <th 
                onClick={() => handleSort('status')}
                className="py-3.5 px-3 cursor-pointer hover:bg-[#001D42] transition-colors select-none font-black uppercase whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5 text-white">
                  <span>Estado</span>
                  <ArrowUpDown size={13} className="text-emerald-400" />
                </div>
              </th>

              {/* Fecha */}
              <th 
                onClick={() => handleSort('date')}
                className="py-3.5 px-3 cursor-pointer hover:bg-[#001D42] transition-colors select-none font-black uppercase whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5 text-white">
                  <span>Fecha</span>
                  <ArrowUpDown size={13} className="text-emerald-400" />
                </div>
              </th>

              {/* Canal */}
              <th 
                onClick={() => handleSort('channel')}
                className="py-3.5 px-3 cursor-pointer hover:bg-[#001D42] transition-colors select-none font-black uppercase whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5 text-white">
                  <span>Canal</span>
                  <ArrowUpDown size={13} className="text-emerald-400" />
                </div>
              </th>

            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
            {currentPageItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                  No hay pagos registrados para este criterio de búsqueda.
                </td>
              </tr>
            ) : (
              currentPageItems.map((item) => {
                const charged = item.chargedAmount ?? item.amount;
                const paid = item.amount;
                const pending = charged - paid; // Difference
                const statusInfo = getPaymentStatusInfo(item);

                return (
                  <tr 
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Propiedad */}
                    <td className="py-3 px-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {item.property}
                    </td>

                    {/* Detalle Link */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="text-[#2563EB] hover:text-[#1D4ED8] underline font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Ver detalle</span>
                      </button>
                    </td>

                    {/* Tipo */}
                    <td className="py-3 px-3 font-normal text-slate-800 whitespace-nowrap">
                      {item.type}
                    </td>

                    {/* Monto Cobrado */}
                    <td className="py-3 px-3 text-right font-medium text-slate-900 font-mono whitespace-nowrap">
                      $ {charged.toLocaleString('es-CL')}
                    </td>

                    {/* Monto Pagado */}
                    <td className="py-3 px-3 text-right font-semibold text-emerald-800 font-mono whitespace-nowrap">
                      $ {paid.toLocaleString('es-CL')}
                    </td>

                    {/* Por Pagar (Diferencia = Cobrado - Pagado) */}
                    <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                      {pending > 0 ? (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          $ {pending.toLocaleString('es-CL')}
                        </span>
                      ) : pending < 0 ? (
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200" title="Abono a favor">
                          -$ {Math.abs(pending).toLocaleString('es-CL')}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-normal">
                          $ 0
                        </span>
                      )}
                    </td>

                    {/* Estado Pill Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      {item.date}
                    </td>

                    {/* Canal */}
                    <td className="py-3 px-3 text-slate-800 font-medium whitespace-nowrap">
                      {item.channel}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION FOOTER MATCHING SCREENSHOT */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600">
        {/* Left Count */}
        <div className="font-semibold text-slate-600">
          {currentPage} de {totalPages} ({totalItems} registros)
        </div>

        {/* Right Page Navigation */}
        <div className="flex items-center gap-1">
          {/* Prev Page */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page Buttons */}
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`min-w-[32px] h-[32px] px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                currentPage === pageNum
                  ? 'bg-[#E8F2FF] text-[#2563EB] border border-[#93C5FD] font-bold shadow-2xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              {pageNum}
            </button>
          ))}

          {/* Next Page */}
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Siguiente página"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* MODAL DETALLE DE PAGO (VER DETALLE) */}
      {selectedItem && (() => {
        const modalCharged = selectedItem.chargedAmount ?? selectedItem.amount;
        const modalPaid = selectedItem.amount;
        const modalPending = modalCharged - modalPaid;
        const modalStatus = getPaymentStatusInfo(selectedItem);

        return (
          <div className="fixed inset-0 z-50 bg-slate-800/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
              
              {/* Modal Header */}
              <div className="bg-[#002D62] text-white p-4 flex items-center justify-between border-b-2 border-[#00C853]">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-[#00C853]" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider font-mono">
                      Detalle de Cobro y Pago
                    </h3>
                    <p className="text-[10px] text-slate-300 font-mono">
                      Folio ERP: {selectedItem.referenceNumber || selectedItem.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-white/70 hover:text-white cursor-pointer p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 text-xs font-sans text-slate-800">
                
                {/* Receipt Status Badge Box */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-slate-700 uppercase text-xs">Estado de Cuenta:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${modalStatus.badgeClass}`}>
                      {modalStatus.label}
                    </span>
                  </div>
                  <span className="bg-[#002D62] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                    F03B11 / ERP
                  </span>
                </div>

                {/* Data Grid */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2.5 font-sans">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Propiedad / Unidad:</span>
                    <span className="font-bold text-slate-900 font-mono text-xs">{selectedItem.property}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Concepto / Tipo:</span>
                    <span className="font-bold text-[#002D62] text-xs">{selectedItem.type}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Monto Cobrado (Facturado):</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      $ {modalCharged.toLocaleString('es-CL')} CLP
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Monto Pagado (Abonado):</span>
                    <span className="font-mono font-bold text-emerald-700 text-xs">
                      $ {modalPaid.toLocaleString('es-CL')} CLP
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-700 font-black uppercase text-[11px]">Por Pagar (Saldo):</span>
                    <span className={`font-mono font-black text-sm ${modalPending > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      $ {modalPending.toLocaleString('es-CL')} CLP
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Fecha Registro / Pago:</span>
                    <span className="font-semibold text-slate-800">{selectedItem.date}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Canal de Recaudación:</span>
                    <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">{selectedItem.channel}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">N° Comprobante / Referencia:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedItem.referenceNumber || 'TR-998201'}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Periodo Imputable:</span>
                    <span className="font-mono text-slate-800 font-bold">{selectedItem.period || 'JUNIO 2026'}</span>
                  </div>
                </div>

                {/* Legal Note */}
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Este registro consolida la cartera corriente y el histórico de cobros y abonos en la plataforma de gestión de AssetFlow S.A. e integración AssetFlow Enterprise.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default TenantPaymentLedgerTable;
